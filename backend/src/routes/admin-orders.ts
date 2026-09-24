import { Router } from 'express';
import { isValidObjectId, type Connection } from 'mongoose';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  isOrderStatus,
  type AdminOrder,
  type AdminOrderSummary,
  type OrderCustomer,
  type Page,
} from '@store/shared';
import { HttpError } from '../errors.js';
import { orderModel, toOrder, toOrderSummary, type OrderDocument } from '../models/order.js';
import { assertTransition } from '../order-status.js';
import { FieldErrors, queryPositiveInt, queryString } from '../validation.js';

interface PopulatedOwner {
  _id: unknown;
  name: string;
  email: string;
}

/** Order management for all customers. Mounted behind `requireAdmin`. */
export function adminOrdersRouter(db: Connection): Router {
  const router = Router();
  const orders = orderModel(db);

  router.get('/', async (req, res) => {
    const errors = new FieldErrors();
    const status = queryString(req.query.status, 'status', errors);
    const page = queryPositiveInt(req.query.page, 'page', 1, errors);
    const pageSize = Math.min(queryPositiveInt(req.query.pageSize, 'pageSize', DEFAULT_PAGE_SIZE, errors), MAX_PAGE_SIZE);
    if (status && !isOrderStatus(status)) errors.add('status', 'Unknown status');
    errors.throwIfAny();

    const filter = isOrderStatus(status) ? { status } : {};
    const [docs, total] = await Promise.all([
      orders
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate<{ owner: PopulatedOwner | null }>('owner', 'name email'),
      orders.countDocuments(filter),
    ]);

    const body: Page<AdminOrderSummary> = {
      items: docs.map((doc) => ({
        ...toOrderSummary(doc as unknown as OrderDocument),
        customer: toCustomer(doc.owner),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
    res.json(body);
  });

  async function findOrder(id: string) {
    const order = isValidObjectId(id)
      ? await orders.findById(id).populate<{ owner: PopulatedOwner | null }>('owner', 'name email')
      : null;
    if (!order) throw new HttpError(404, 'order_not_found', 'Order not found');
    return order;
  }

  function toAdminOrder(order: Awaited<ReturnType<typeof findOrder>>): AdminOrder {
    return { ...toOrder(order as unknown as OrderDocument), customer: toCustomer(order.owner) };
  }

  router.get('/:id', async (req, res) => {
    const body: AdminOrder = toAdminOrder(await findOrder(req.params.id));
    res.json(body);
  });

  router.patch('/:id/status', async (req, res) => {
    const next: unknown = req.body?.status;
    if (!isOrderStatus(next)) {
      throw new HttpError(400, 'validation_failed', 'Unknown status', { status: 'Unknown status' });
    }
    const order = await findOrder(req.params.id);
    assertTransition(order.status, next);

    // Compare-and-set: fails if the status changed since we read it (e.g. the customer cancelled).
    const result = await orders.updateOne({ _id: order._id, status: order.status }, { status: next });
    if (result.modifiedCount === 0) {
      throw new HttpError(409, 'invalid_status_transition', 'The order changed; please reload it');
    }

    const body: AdminOrder = toAdminOrder(await findOrder(req.params.id));
    res.json(body);
  });

  return router;
}

function toCustomer(owner: PopulatedOwner | null): OrderCustomer | null {
  return owner ? { id: String(owner._id), name: owner.name, email: owner.email } : null;
}
