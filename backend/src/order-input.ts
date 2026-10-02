import { isValidObjectId } from 'mongoose';
import {
  MAX_ORDER_LINES,
  MAX_QUANTITY,
  SHIPPING_FIELD_MAX_LENGTH,
  type ShippingAddress,
} from '@store/shared';
import { FieldErrors } from './validation.js';

export interface RequestedLine {
  /** Position in the request, so errors can point at the right cart line. */
  index: number;
  productId: string;
  quantity: number;
}

/** Well-formed lines are returned; problems with the others are added to `errors`. */
export function parseLines(value: unknown, errors: FieldErrors): RequestedLine[] {
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

export function parseShippingAddress(value: unknown): ShippingAddress {
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
