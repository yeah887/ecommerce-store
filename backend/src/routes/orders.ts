import { Router } from 'express';
import { isValidObjectId, type Connection } from 'mongoose';
import {
  CURRENCY,
  MAX_ORDER_LINES,
  MAX_QUANTITY,
  SHIPPING_FIELD_MAX_LENGTH,
  type Order,
  type ShippingAddress,
} from '@store/shared';
import { HttpError } from '../errors.js';
import { orderModel, toOrder } from '../models/order.js';
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
