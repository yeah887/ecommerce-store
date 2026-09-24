import { Router } from 'express';
import { isValidObjectId, type Connection, type Types } from 'mongoose';
import {
  CURRENCY,
  MAX_ORDER_LINES,
  MAX_QUANTITY,
  SHIPPING_FIELD_MAX_LENGTH,
  type Order,
  type OrderSummary,
  type ShippingAddress,
} from '@store/shared';
import { HttpError } from '../errors.js';
import { orderModel, toOrder, toOrderSummary } from '../models/order.js';
import { assertTransition } from '../order-status.js';
import { productModel, type ProductDoc } from '../models/product.js';
import { PaymentDeclinedError, type PaymentProvider } from '../payments.js';
import { requireAuth } from '../session.js';
import { FieldErrors } from '../validation.js';

interface RequestedLine {
  /** Position in the request, so errors can point at the right cart line. */
  index: number;
  productId: string;
  quantity: number;
}

export function ordersRouter(db: Connection, payments: PaymentProvider): Router {
  const router = Router();
  const orders = orderModel(db);
  const products = productModel(db);

  router.use(requireAuth);

  /** The current user's order, or 404 whether it doesn't exist or belongs to someone else. */
  async function findOwnOrder(id: string, ownerId: Types.ObjectId) {
    const order = isValidObjectId(id) ? await orders.findOne({ _id: id, owner: ownerId }) : null;
    if (!order) throw new HttpError(404, 'order_not_found', 'Order not found');
    return order;
  }

  router.get('/', async (req, res) => {
    const docs = await orders.find({ owner: req.user!._id }).sort({ createdAt: -1, _id: -1 });
    const body: OrderSummary[] = docs.map(toOrderSummary);
    res.json(body);
  });

  router.get('/:id', async (req, res) => {
    const body: Order = toOrder(await findOwnOrder(req.params.id, req.user!._id));
    res.json(body);
  });

  router.post('/:id/cancel', async (req, res) => {
    const order = await findOwnOrder(req.params.id, req.user!._id);
    assertTransition(order.status, 'cancelled');

    // Only succeeds if nobody changed the status since we read it (e.g. an admin shipping it).
    const updated = await orders.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { status: 'cancelled' },
      { new: true },
    );
    if (!updated) throw new HttpError(409, 'invalid_status_transition', 'The order changed; please reload it');

    const body: Order = toOrder(updated);
    res.json(body);
  });

  router.post('/', async (req, res) => {
    const body = req.body ?? {};
    const lineErrors = new FieldErrors();
    const lines = parseLines(body.lines, lineErrors);
    const shippingAddress = parseShippingAddress(body.shippingAddress);

    // Prices come from the database only; anything price-like in the request is ignored.
    const found = await products
      .find({ _id: { $in: lines.map((l) => l.productId) } })
      .lean<ProductDoc[]>();
    const byId = new Map(found.map((p) => [String(p._id), p]));

    for (const line of lines) {
      if (!byId.has(line.productId)) lineErrors.add(`lines.${line.index}`, 'This product is no longer available');
    }
    lineErrors.throwIfAny('invalid_lines', 'Some items in your cart are no longer available');

    const orderLines = lines.map((line) => {
      const product = byId.get(line.productId)!;
      return {
        productId: line.productId,
        name: product.name,
        unitPriceCents: product.priceCents,
        quantity: line.quantity,
      };
    });
    const totalCents = orderLines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);

    let paymentReference: string;
    try {
      ({ reference: paymentReference } = await payments.charge({
        amountCents: totalCents,
        currency: CURRENCY,
        customerEmail: req.user!.email,
      }));
    } catch (err) {
      if (err instanceof PaymentDeclinedError) {
        throw new HttpError(402, 'payment_declined', 'The payment was declined');
      }
      throw err;
    }

    const order = await orders.create({
      owner: req.user!._id,
      lines: orderLines,
      totalCents,
      shippingAddress,
      status: 'placed',
      paymentReference,
    });
    const response: Order = toOrder(order);
    res.status(201).json(response);
  });

  return router;
}

/** Well-formed lines are returned; problems with the others are added to `errors`. */
function parseLines(value: unknown, errors: FieldErrors): RequestedLine[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.add('lines', 'Your cart is empty');
    errors.throwIfAny('invalid_lines');
  }
  const raw = value as unknown[];
  if (raw.length > MAX_ORDER_LINES) {
    errors.add('lines', `An order can have at most ${MAX_ORDER_LINES} different products`);
    errors.throwIfAny('invalid_lines');
  }

  const seen = new Set<string>();
  const lines: RequestedLine[] = [];
  raw.forEach((item, i) => {
    const { productId, quantity } = (item ?? {}) as Partial<RequestedLine>;
    if (typeof productId !== 'string' || !isValidObjectId(productId)) {
      errors.add(`lines.${i}`, 'This product is no longer available');
    } else if (seen.has(productId)) {
      errors.add(`lines.${i}`, 'This product appears more than once');
    } else if (!Number.isInteger(quantity) || quantity! < 1 || quantity! > MAX_QUANTITY) {
      errors.add(`lines.${i}`, `Quantity must be a whole number from 1 to ${MAX_QUANTITY}`);
    } else {
      seen.add(productId);
      lines.push({ index: i, productId, quantity: quantity! });
    }
  });
  return lines;
}

function parseShippingAddress(value: unknown): ShippingAddress {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const errors = new FieldErrors();
  const address = {} as ShippingAddress;

  for (const field of Object.keys(SHIPPING_FIELD_MAX_LENGTH) as (keyof ShippingAddress)[]) {
    const text = typeof raw[field] === 'string' ? (raw[field] as string).trim() : '';
    if (!text) errors.add(`shippingAddress.${field}`, 'Required');
    else if (text.length > SHIPPING_FIELD_MAX_LENGTH[field]) errors.add(`shippingAddress.${field}`, 'Too long');
    address[field] = text;
  }
  errors.throwIfAny();
  return address;
}
