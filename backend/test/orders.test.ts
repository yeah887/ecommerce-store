import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Order } from '@store/shared';
import { productModel } from '../src/models/product.js';
import { PaymentDeclinedError, type PaymentProvider } from '../src/payments.js';
import { useTestApp, type TestContext } from './test-app.js';

const address = {
  name: 'Alice Example',
  street: 'Hauptstraße 1',
  postalCode: '10115',
  city: 'Berlin',
  country: 'Germany',
};

async function insertProducts(ctx: TestContext) {
  const [lamp, mug] = await productModel(ctx.db).insertMany([
    { name: 'Lamp', description: 'A lamp', priceCents: 4999, category: 'home', images: ['https://example.com/l.jpg'] },
    { name: 'Mug', description: 'A mug', priceCents: 1250, category: 'home', images: ['https://example.com/m.jpg'] },
  ]);
  return { lamp: String(lamp._id), mug: String(mug._id) };
}

async function loggedInAs(ctx: TestContext, email: string) {
  const client = request.agent(ctx.app);
  const res = await client.post('/api/auth/register').send({ name: 'Customer', email, password: 'customer-pw' });
  expect(res.status).toBe(201);
  return client;
}

describe('POST /api/orders', () => {
  const ctx = useTestApp();
  let ids: { lamp: string; mug: string };

  beforeAll(async () => {
    ids = await insertProducts(ctx);
  });

  it('places an order priced from the database, with snapshots of each line', async () => {
    const client = await loggedInAs(ctx, 'alice@example.com');

    const res = await client.post('/api/orders').send({
      lines: [
        { productId: ids.lamp, quantity: 2 },
        { productId: ids.mug, quantity: 1 },
      ],
      shippingAddress: address,
    });

    expect(res.status).toBe(201);
    const order = res.body as Order;
    expect(order).toMatchObject({
      status: 'placed',
      totalCents: 2 * 4999 + 1250,
      shippingAddress: address,
      lines: [
        { productId: ids.lamp, name: 'Lamp', unitPriceCents: 4999, quantity: 2 },
        { productId: ids.mug, name: 'Mug', unitPriceCents: 1250, quantity: 1 },
      ],
    });
    expect(order.id).toEqual(expect.any(String));
    expect(order.number).toBe(order.id.slice(-8).toUpperCase());
    expect(order.paymentReference).toMatch(/^mock_/);
  });

  it('ignores prices and totals sent by the client', async () => {
    const client = await loggedInAs(ctx, 'mallory@example.com');

    const res = await client.post('/api/orders').send({
      lines: [{ productId: ids.lamp, quantity: 1, priceCents: 1, unitPriceCents: 1, name: 'Free lamp' }],
      totalCents: 1,
      shippingAddress: address,
    });

    expect(res.status).toBe(201);
    expect(res.body.totalCents).toBe(4999);
    expect(res.body.lines[0]).toMatchObject({ name: 'Lamp', unitPriceCents: 4999 });
  });

  it('cannot be forced into another status', async () => {
    const client = await loggedInAs(ctx, 'eve@example.com');

    const res = await client
      .post('/api/orders')
      .send({ lines: [{ productId: ids.mug, quantity: 1 }], shippingAddress: address, status: 'delivered' });

    expect(res.body.status).toBe('placed');
  });

  it('keeps the price snapshot when the product changes later', async () => {
    const client = await loggedInAs(ctx, 'snap@example.com');
    const placed = await client
      .post('/api/orders')
      .send({ lines: [{ productId: ids.mug, quantity: 1 }], shippingAddress: address });

    await productModel(ctx.db).updateOne({ _id: ids.mug }, { name: 'Renamed Mug', priceCents: 9999 });
    const stored = await ctx.db.collection('orders').findOne({ paymentReference: placed.body.paymentReference });

    expect(stored?.lines[0]).toMatchObject({ name: 'Mug', unitPriceCents: 1250 });
    await productModel(ctx.db).updateOne({ _id: ids.mug }, { name: 'Mug', priceCents: 1250 });
  });

  it('names the lines whose products no longer exist', async () => {
    const client = await loggedInAs(ctx, 'bob@example.com');

    const res = await client.post('/api/orders').send({
      lines: [
        { productId: ids.mug, quantity: 1 },
        { productId: '64b7f0000000000000000000', quantity: 1 },
        { productId: 'not-an-id', quantity: 1 },
      ],
      shippingAddress: address,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_lines');
    expect(Object.keys(res.body.error.fields).sort()).toEqual(['lines.1', 'lines.2']);
  });

  it.each<[unknown, string]>([
    [0, 'zero'],
    [-1, 'negative'],
    [1.5, 'fractional'],
    [100, 'above the maximum'],
    ['2', 'a string'],
  ])('rejects quantity %s (%s)', async (quantity) => {
    const client = await loggedInAs(ctx, `q${String(quantity).replace(/\W/g, '')}@example.com`);

    const res = await client
      .post('/api/orders')
      .send({ lines: [{ productId: ids.mug, quantity }], shippingAddress: address });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_lines');
    expect(res.body.error.fields).toHaveProperty('lines.0');
  });

  it('rejects an empty cart and duplicate lines', async () => {
    const client = await loggedInAs(ctx, 'dup@example.com');

    const empty = await client.post('/api/orders').send({ lines: [], shippingAddress: address });
    expect(empty.status).toBe(400);
    expect(empty.body.error.fields).toHaveProperty('lines');

    const dup = await client.post('/api/orders').send({
      lines: [
        { productId: ids.mug, quantity: 1 },
        { productId: ids.mug, quantity: 2 },
      ],
      shippingAddress: address,
    });
    expect(dup.status).toBe(400);
    expect(dup.body.error.fields).toHaveProperty('lines.1');
  });

  it('requires a complete shipping address', async () => {
    const client = await loggedInAs(ctx, 'addr@example.com');

    const res = await client.post('/api/orders').send({
      lines: [{ productId: ids.mug, quantity: 1 }],
      shippingAddress: { ...address, street: '  ', city: undefined, postalCode: 'x'.repeat(21) },
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      'shippingAddress.city',
      'shippingAddress.postalCode',
      'shippingAddress.street',
    ]);
  });

  it('does not store anything for a rejected order', async () => {
    const before = await ctx.db.collection('orders').countDocuments();
    const client = await loggedInAs(ctx, 'nothing@example.com');

    await client.post('/api/orders').send({ lines: [{ productId: ids.mug, quantity: 0 }], shippingAddress: address });

    expect(await ctx.db.collection('orders').countDocuments()).toBe(before);
  });

  it('requires login', async () => {
    const res = await request(ctx.app)
      .post('/api/orders')
      .send({ lines: [{ productId: ids.mug, quantity: 1 }], shippingAddress: address });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/orders with a payment provider', () => {
  const charge = vi.fn<PaymentProvider['charge']>();
  const ctx = useTestApp({ payments: { charge } });
  let ids: { lamp: string; mug: string };

  beforeAll(async () => {
    ids = await insertProducts(ctx);
  });

  it('charges the server-calculated total in euros', async () => {
    charge.mockResolvedValueOnce({ reference: 'pay_123' });
    const client = await loggedInAs(ctx, 'payer@example.com');

    const res = await client
      .post('/api/orders')
      .send({ lines: [{ productId: ids.lamp, quantity: 3 }], shippingAddress: address });

    expect(res.status).toBe(201);
    expect(res.body.paymentReference).toBe('pay_123');
    expect(charge).toHaveBeenCalledWith({ amountCents: 3 * 4999, currency: 'EUR', customerEmail: 'payer@example.com' });
  });

  it('returns 402 and stores no order when the payment is declined', async () => {
    charge.mockRejectedValueOnce(new PaymentDeclinedError('card declined'));
    const client = await loggedInAs(ctx, 'declined@example.com');

    const res = await client
      .post('/api/orders')
      .send({ lines: [{ productId: ids.mug, quantity: 1 }], shippingAddress: address });

    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('payment_declined');
    expect(await ctx.db.collection('orders').countDocuments({ paymentReference: { $exists: true }, 'lines.name': 'Mug' })).toBe(0);
  });
});
