import { Router } from 'express';
import { isValidObjectId, type Connection, type Types } from 'mongoose';
import type { Order, OrderSummary } from '@store/shared';
import { HttpError } from '../errors.js';
import { orderModel, toOrder, toOrderSummary } from '../models/order.js';
import { cancelOrder } from '../order-cancellation.js';
import type { PaymentProvider } from '../payments.js';
import { requireAuth } from '../session.js';

export function ordersRouter(db: Connection, payments: PaymentProvider): Router {
  const router = Router();
  const orders = orderModel(db);

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
    const body: Order = toOrder(await cancelOrder(orders, order, payments));
    res.json(body);
  });

  return router;
}
