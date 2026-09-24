export const ORDER_STATUSES = ['placed', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface ShippingAddress {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export const SHIPPING_FIELD_MAX_LENGTH: Record<keyof ShippingAddress, number> = {
  name: 100,
  street: 200,
  postalCode: 20,
  city: 100,
  country: 100,
};

/** An order line with the product's name and price as they were when the order was placed. */
export interface OrderLine {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

export interface Order {
  id: string;
  /** Short human-friendly reference, derived from the id. */
  number: string;
  lines: OrderLine[];
  totalCents: number;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  paymentReference: string;
  createdAt: string;
  updatedAt: string;
}

/** Body of `POST /api/orders`. Prices are never sent: the server looks them up. */
export interface CreateOrderRequest {
  lines: { productId: string; quantity: number }[];
  shippingAddress: ShippingAddress;
}

export const MAX_ORDER_LINES = 100;

/** The short reference shown to customers, e.g. "5F3A9C21". */
export function orderNumber(orderId: string): string {
  return orderId.slice(-8).toUpperCase();
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'Placed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** A row in an order list: everything but the lines' details and the address. */
export interface OrderSummary {
  id: string;
  number: string;
  itemCount: number;
  totalCents: number;
  status: OrderStatus;
  createdAt: string;
}
