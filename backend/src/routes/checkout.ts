import { Router } from 'express';
import { isValidObjectId, type Connection } from 'mongoose';
import { CURRENCY, type CheckoutStarted, type Order, type PaymentClientConfig } from '@store/shared';
import { HttpError } from '../errors.js';
import { CHECKOUT_TTL_MS, checkoutModel, type CheckoutDocument } from '../models/checkout.js';
import { orderModel, toOrder } from '../models/order.js';
import { productModel, type ProductDoc } from '../models/product.js';
import { parseLines, parseShippingAddress } from '../order-input.js';
import { PaymentDeclinedError, PaymentNotApprovedError, type PaymentProvider } from '../payments.js';
import { requireAuth } from '../session.js';
import { FieldErrors } from '../validation.js';

/**
 * Paying for a cart, in two steps because the buyer approves the payment with the provider in between:
 *
 * 1. `POST /api/checkout` prices the cart from the database, stores the attempt and creates the payment.
 * 2. `POST /api/checkout/:id/complete` takes the approved payment, checks it is exactly the stored total,
 *    and only then creates the order. Completing again returns the same order, so nothing is paid twice.
 */
export function checkoutRouter(db: Connection, payments: PaymentProvider): Router {
  const router = Router();
  const checkouts = checkoutModel(db);
  const orders = orderModel(db);
  const products = productModel(db);

  router.get('/config', (_req, res) => {
    const body: PaymentClientConfig = payments.clientConfig();
    res.json(body);
  });

  router.use(requireAuth);

  router.post('/', async (req, res) => {
    const body = req.body ?? {};
    const lineErrors = new FieldErrors();
    const lines = parseLines(body.lines, lineErrors);
    const shippingAddress = parseShippingAddress(body.shippingAddress);

    // Prices come from the database only; anything price-like in the request is ignored.
    const found = await products.find({ _id: { $in: lines.map((l) => l.productId) } }).lean<ProductDoc[]>();
    const byId = new Map(found.map((p) => [String(p._id), p]));
    for (const line of lines) {
      if (!byId.has(line.productId)) lineErrors.add(`lines.${line.index}`, 'This product is no longer available');
    }
    lineErrors.throwIfAny('invalid_lines', 'Some items in your cart are no longer available');

    const orderLines = lines.map((line) => {
      const product = byId.get(line.productId)!;
      return { productId: line.productId, name: product.name, unitPriceCents: product.priceCents, quantity: line.quantity };
    });
    const totalCents = orderLines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);

    const checkout = await checkouts.create({
      owner: req.user!._id,
      lines: orderLines,
      totalCents,
      currency: CURRENCY,
      shippingAddress,
      provider: payments.name,
      expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
    });
    let payment;
    try {
      payment = await payments.createPayment({
        amountCents: totalCents,
        currency: CURRENCY,
        reference: checkout.id as string,
        description: 'Store order',
      });
    } catch (err) {
      await checkouts.deleteOne({ _id: checkout._id });
      console.error('Creating a payment failed:', err);
      throw new HttpError(502, 'payment_failed', "The payment couldn't be started");
    }
    await checkouts.updateOne({ _id: checkout._id }, { providerOrderId: payment.id });

    const response: CheckoutStarted = { checkoutId: checkout.id as string, providerOrderId: payment.id };
    res.status(201).json(response);
  });

  router.post('/:id/complete', async (req, res) => {
    const checkout = isValidObjectId(req.params.id)
      ? await checkouts.findOne({ _id: req.params.id, owner: req.user!._id })
      : null;
    if (!checkout?.providerOrderId) {
      throw new HttpError(404, 'checkout_not_found', 'This checkout has expired; please start again');
    }

    if (checkout.state === 'completed') return res.json(toOrder(await findOrder(checkout)));
    if (checkout.state === 'open') await capture(checkout);
    else if (checkout.state === 'capturing') {
      throw new HttpError(409, 'checkout_in_progress', 'The payment is still being processed');
    }

    // `captured`: the money is in; store the order, or retry storing it after an earlier failure.
    const order = await createOrder(checkout);
    const body: Order = toOrder(order);
    res.status(201).json(body);
  });

  /** Takes the payment and checks it; leaves the checkout `captured`, or `open` again if the buyer can retry. */
  async function capture(checkout: CheckoutDocument): Promise<void> {
    // Only one request may capture a checkout; a concurrent one gets 409 above on its retry.
    const claimed = await checkouts.updateOne({ _id: checkout._id, state: 'open' }, { state: 'capturing' });
    if (claimed.modifiedCount === 0) {
      throw new HttpError(409, 'checkout_in_progress', 'The payment is still being processed');
    }

    let captured;
    try {
      captured = await payments.capturePayment(checkout.providerOrderId!);
    } catch (err) {
      await checkouts.updateOne({ _id: checkout._id }, { state: 'open' });
      if (err instanceof PaymentDeclinedError) {
        throw new HttpError(402, 'payment_declined', 'The payment was declined');
      }
      if (err instanceof PaymentNotApprovedError) {
        throw new HttpError(409, 'payment_not_approved', 'The payment has not been approved yet');
      }
      console.error(`Capturing payment for checkout ${checkout.id as string} failed:`, err);
      throw new HttpError(502, 'payment_failed', "The payment couldn't be completed");
    }

    // The provider was asked for exactly this amount; anything else means something is badly wrong.
    if (captured.amountCents !== checkout.totalCents || captured.currency !== checkout.currency) {
      console.error(
        `Checkout ${checkout.id as string}: captured ${captured.amountCents} ${captured.currency}, ` +
          `expected ${checkout.totalCents} ${checkout.currency} (payment ${captured.reference}). Needs manual review.`,
      );
      throw new HttpError(502, 'payment_failed', "The payment couldn't be completed");
    }

    checkout.paymentReference = captured.reference;
    await checkouts.updateOne(
      { _id: checkout._id },
      { $set: { state: 'captured', paymentReference: captured.reference }, $unset: { expiresAt: 1 } },
    );
  }

  async function createOrder(checkout: CheckoutDocument) {
    // The order's id is the checkout's, so storing it twice after a crash can't create a second order.
    const paymentReference = checkout.paymentReference;
    if (!paymentReference) throw new Error(`Checkout ${checkout.id as string} is captured without a payment reference`);

    let order = await orders.findById(checkout._id);
    if (!order) {
      try {
        order = await orders.create({
          _id: checkout._id,
          owner: checkout.owner,
          lines: checkout.lines,
          totalCents: checkout.totalCents,
          shippingAddress: checkout.shippingAddress,
          status: 'placed',
          paymentProvider: checkout.provider,
          paymentReference,
        });
      } catch (err) {
        // A concurrent request stored it first (duplicate _id): use that one.
        order = (err as { code?: number }).code === 11000 ? await orders.findById(checkout._id) : null;
        if (!order) throw err;
      }
    }
    await checkouts.updateOne({ _id: checkout._id }, { state: 'completed', orderId: order._id });
    return order;
  }

  async function findOrder(checkout: CheckoutDocument) {
    const order = await orders.findById(checkout.orderId);
    if (!order) throw new HttpError(404, 'order_not_found', 'Order not found');
    return order;
  }

  return router;
}
