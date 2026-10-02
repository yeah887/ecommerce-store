import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AdminOrder, AdminOrderSummary, Order, OrderStatus, Page } from '@store/shared';
import { productModel } from '../src/models/product.js';
import { TEST_ADMIN, useTestApp } from './test-app.js';
import { checkout } from './checkout-helper.js';

const address = { name: 'A', street: 'S 1', postalCode: '1', city: 'C', country: 'D' };

describe('admin order management', () => {
  const ctx = useTestApp({ admin: TEST_ADMIN });
  let admin: request.Agent;
  let alice: request.Agent;
  let bob: request.Agent;
  let productId: string;

  beforeAll(async () => {
    const [p] = await productModel(ctx.db).insertMany([
      { name: 'Mug', description: 'A mug', priceCents: 1250, category: 'home', images: ['https://example.com/m.jpg'] },
    ]);
    productId = String(p._id);
    admin = request.agent(ctx.app);
    await admin.post('/api/auth/login').send(TEST_ADMIN);
    alice = request.agent(ctx.app);
    await alice.post('/api/auth/register').send({ name: 'Alice', email: 'alice@example.com', password: 'customer-pw' });
    bob = request.agent(ctx.app);
    await bob.post('/api/auth/register').send({ name: 'Bob', email: 'bob@example.com', password: 'customer-pw' });
  });

  async function placeOrder(client: request.Agent, quantity = 1): Promise<Order> {
    const res = await checkout(client, { lines: [{ productId, quantity }], shippingAddress: address });
    expect(res.status).toBe(201);
    return res.body;
  }

  const setStatus = (order: Order, status: OrderStatus) =>
    admin.patch(`/api/admin/orders/${order.id}/status`).send({ status });

  describe('access', () => {
    it('rejects anonymous users with 401 and customers with 403 on every admin order endpoint', async () => {
      const order = await placeOrder(alice);
      const calls = [
        (c: request.SuperTest<request.Test> | request.Agent) => c.get('/api/admin/orders'),
        (c: request.SuperTest<request.Test> | request.Agent) => c.get(`/api/admin/orders/${order.id}`),
        (c: request.SuperTest<request.Test> | request.Agent) =>
          c.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'shipped' }),
      ];
      for (const call of calls) {
        expect((await call(request(ctx.app) as never)).status).toBe(401);
        expect((await call(alice)).status).toBe(403);
      }
      expect((await alice.get(`/api/orders/${order.id}`)).body.status).toBe('placed');
    });
  });

  it("lists every customer's orders, newest first, with the customer", async () => {
    const fromAlice = await placeOrder(alice, 2);
    const fromBob = await placeOrder(bob, 3);

    const res = await admin.get('/api/admin/orders');

    expect(res.status).toBe(200);
    const page = res.body as Page<AdminOrderSummary>;
    expect(page.items.slice(0, 2).map((o) => o.id)).toEqual([fromBob.id, fromAlice.id]);
    expect(page.items[0]).toMatchObject({
      number: fromBob.number,
      itemCount: 3,
      totalCents: 3750,
      status: 'placed',
      customer: { name: 'Bob', email: 'bob@example.com' },
    });
    expect(page.total).toBeGreaterThanOrEqual(2);
  });

  it('filters by status and paginates', async () => {
    const shipped = await placeOrder(alice);
    await setStatus(shipped, 'shipped');

    const res = await admin.get('/api/admin/orders').query({ status: 'shipped' });
    expect(res.body.items.every((o: AdminOrderSummary) => o.status === 'shipped')).toBe(true);
    expect(res.body.items.map((o: AdminOrderSummary) => o.id)).toContain(shipped.id);

    const firstPage = await admin.get('/api/admin/orders').query({ pageSize: 1 });
    expect(firstPage.body).toMatchObject({ pageSize: 1, page: 1 });
    expect(firstPage.body.items).toHaveLength(1);
    expect(firstPage.body.totalPages).toBe(firstPage.body.total);
  });

  it('rejects an unknown status filter', async () => {
    const res = await admin.get('/api/admin/orders').query({ status: 'lost' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('status');
  });

  it('shows any order in full with its customer', async () => {
    const order = await placeOrder(bob, 2);

    const res = await admin.get(`/api/admin/orders/${order.id}`);

    expect(res.status).toBe(200);
    expect(res.body as AdminOrder).toEqual({
      ...order,
      customer: { id: expect.any(String), name: 'Bob', email: 'bob@example.com' },
    });
  });

  it.each(['64b7f0000000000000000000', 'nope'])('returns 404 for order %s', async (id) => {
    expect((await admin.get(`/api/admin/orders/${id}`)).status).toBe(404);
    expect((await admin.patch(`/api/admin/orders/${id}/status`).send({ status: 'shipped' })).status).toBe(404);
  });

  it('moves an order through its lifecycle, visible to the customer', async () => {
    const order = await placeOrder(alice);

    const shipped = await setStatus(order, 'shipped');
    expect(shipped.status).toBe(200);
    expect(shipped.body).toMatchObject({ status: 'shipped', customer: { name: 'Alice' } });
    expect((await alice.get(`/api/orders/${order.id}`)).body.status).toBe('shipped');

    const delivered = await setStatus(order, 'delivered');
    expect(delivered.body.status).toBe('delivered');
    expect((await alice.get(`/api/orders/${order.id}`)).body.status).toBe('delivered');
  });

  it('cancels an order that has not shipped', async () => {
    const order = await placeOrder(alice);

    const res = await setStatus(order, 'cancelled');

    expect(res.status).toBe(200);
    expect((await alice.get(`/api/orders/${order.id}`)).body.status).toBe('cancelled');
  });

  it.each<[OrderStatus[], OrderStatus]>([
    [[], 'delivered'],
    [[], 'placed'],
    [['shipped'], 'placed'],
    [['shipped'], 'cancelled'],
    [['shipped', 'delivered'], 'shipped'],
    [['shipped', 'delivered'], 'placed'],
    [['cancelled'], 'shipped'],
    [['cancelled'], 'placed'],
  ])('after %j, rejects a change to %s with 409', async (history, next) => {
    const order = await placeOrder(bob);
    for (const status of history) expect((await setStatus(order, status)).status).toBe(200);
    const before = (await bob.get(`/api/orders/${order.id}`)).body.status;

    const res = await setStatus(order, next);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('invalid_status_transition');
    expect((await bob.get(`/api/orders/${order.id}`)).body.status).toBe(before);
  });

  it.each([{ status: 'lost' }, {}, { status: 42 }])('rejects an unknown status %j with 400', async (body) => {
    const order = await placeOrder(alice);

    const res = await admin.patch(`/api/admin/orders/${order.id}/status`).send(body);

    expect(res.status).toBe(400);
  });

  it('shows orders of deleted accounts without a customer', async () => {
    const carol = request.agent(ctx.app);
    await carol.post('/api/auth/register').send({ name: 'Carol', email: 'carol@example.com', password: 'customer-pw' });
    const order = await placeOrder(carol);
    await ctx.db.collection('users').deleteOne({ email: 'carol@example.com' });

    const res = await admin.get(`/api/admin/orders/${order.id}`);

    expect(res.status).toBe(200);
    expect(res.body.customer).toBeNull();
  });
});
