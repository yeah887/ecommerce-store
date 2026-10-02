import { CURRENCY } from '@store/shared';
import { HttpError } from './errors.js';
import type { OrderDocument, OrderModel } from './models/order.js';
import { assertTransition } from './order-status.js';
import type { PaymentProvider } from './payments.js';

/**
 * Cancels an order, refunding it first if it was really paid.
 *
 * The status change is claimed first (compare-and-set), so nobody can ship the order while the refund
 * runs. If the refund fails, the old status is put back: an order is never shown as cancelled while the
 * customer still hasn't got their money back.
 */
export async function cancelOrder(
  orders: OrderModel,
  order: OrderDocument,
  payments: PaymentProvider,
): Promise<OrderDocument> {
  assertTransition(order.status, 'cancelled');
  const previous = order.status;

  const claimed = await orders.findOneAndUpdate(
    { _id: order._id, status: previous },
    { status: 'cancelled' },
    { new: true },
  );
  if (!claimed) throw new HttpError(409, 'invalid_status_transition', 'The order changed; please reload it');

  const provider = claimed.paymentProvider ?? 'mock';
  if (provider === 'mock' || claimed.refundReference) return claimed;

  try {
    if (provider !== payments.name) {
      throw new Error(`The order was paid with ${provider}, but the store now uses ${payments.name}`);
    }
    const refundReference = await payments.refund({
      paymentReference: claimed.paymentReference,
      amountCents: claimed.totalCents,
      currency: CURRENCY,
      // One refund per order, however often cancelling is retried.
      idempotencyKey: `refund-${String(claimed._id)}`,
    });
    const refunded = await orders.findByIdAndUpdate(claimed._id, { refundReference }, { new: true });
    return refunded ?? claimed;
  } catch (err) {
    await orders.updateOne({ _id: claimed._id, status: 'cancelled' }, { status: previous });
    console.error(`Refund failed for order ${String(claimed._id)}; it stays ${previous}:`, err);
    throw new HttpError(502, 'refund_failed', "The refund didn't go through, so the order was not cancelled");
  }
}
