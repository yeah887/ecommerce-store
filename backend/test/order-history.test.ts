import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Order, OrderSummary } from '@store/shared';
import { productModel } from '../src/models/product.js';
import { useTestApp } from './test-app.js';
import { checkout } from './checkout-helper.js';

const address = { name: 'A', street: 'S 1', postalCode: '1', city: 'C', country: 'D' };

describe('order history and cancelling', () => {
  const ctx = useTestApp();
  let productId: string;

  beforeAll(async () => {
    const [p] = await productModel(ctx.db).insertMany([
      { name: 'Mug', description: 'A mug', priceCents: 1250, category: 'home', images: ['https://example.com/m.jpg'] },
    ]);
    productId = String(p._id);
  });

  async function customer(email: string) {
    const client = request.agent(ctx.app);
    await client.post('/api/auth/register').send({ name: email, email, password: 'customer-pw' });
    return client;
  }

  async function placeOrder(client: request.Agent, quantity = 1): Promise<Order> {
    const res = await checkout(client, { lines: [{ productId, quantity }], shippingAddress: address });
    expect(res.status).toBe(201);
    return res.body;
  }

  it('lists only my own orders, newest first', async () => {
    const alice = await customer('alice@example.com');
    const bob = await customer('bob@example.com');
    const first = await placeOrder(alice, 1);
    await placeOrder(bob, 5);
    const second = await placeOrder(alice, 3);

    const res = await alice.get('/api/orders');

    expect(res.status).toBe(200);
    const list = res.body as OrderSummary[];
    expect(list.map((o) => o.id)).toEqual([second.id, first.id]);
    expect(list[0]).toEqual({
      id: second.id,
      number: second.number,
      itemCount: 3,
      totalCents: 3 * 1250,
      status: 'placed',
      createdAt: second.createdAt,
    });
  });

  it('shows my own order in full', async () => {
    const carol = await customer('carol@example.com');
    const order = await placeOrder(carol, 2);

    const res = await carol.get(`/api/orders/${order.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(order);
  });

  it("returns 404 for someone else's order, as for one that doesn't exist", async () => {
    const dave = await customer('dave@example.com');
    const eve = await customer('eve@example.com');
    const davesOrder = await placeOrder(dave);

    const peek = await eve.get(`/api/orders/${davesOrder.id}`);
    const cancel = await eve.post(`/api/orders/${davesOrder.id}/cancel`);
    const unknown = await eve.get('/api/orders/64b7f0000000000000000000');
    const malformed = await eve.get('/api/orders/nope');

    for (const res of [peek, cancel, unknown, malformed]) {
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('order_not_found');
    }
    expect((await dave.get(`/api/orders/${davesOrder.id}`)).body.status).toBe('placed');
  });

  it('cancels my order while it is placed', async () => {
    const frank = await customer('frank@example.com');
    const order = await placeOrder(frank);

    const res = await frank.post(`/api/orders/${order.id}/cancel`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
    expect((await frank.get(`/api/orders/${order.id}`)).body.status).toBe('cancelled');
  });

  it.each(['shipped', 'delivered', 'cancelled'])('refuses to cancel an order that is %s', async (status) => {
    const client = await customer(`${status}@example.com`);
    const order = await placeOrder(client);
    await ctx.db.collection('orders').updateOne({ paymentReference: order.paymentReference }, { $set: { status } });

    const res = await client.post(`/api/orders/${order.id}/cancel`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('invalid_status_transition');
    expect((await client.get(`/api/orders/${order.id}`)).body.status).toBe(status);
  });

  it('requires login', async () => {
    expect((await request(ctx.app).get('/api/orders')).status).toBe(401);
    expect((await request(ctx.app).get('/api/orders/64b7f0000000000000000000')).status).toBe(401);
    expect((await request(ctx.app).post('/api/orders/64b7f0000000000000000000/cancel')).status).toBe(401);
  });

});
