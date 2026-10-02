import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '@store/shared';
import { checkoutModel } from '../src/models/checkout.js';
import { orderModel } from '../src/models/order.js';
import { productModel } from '../src/models/product.js';
import {
  PaymentDeclinedError,
  PaymentNotApprovedError,
  type CapturedPayment,
  type PaymentProvider,
} from '../src/payments.js';
import { TEST_ADMIN, useTestApp, type TestContext } from './test-app.js';

const address = { name: 'Alice', street: 'Hauptstraße 1', postalCode: '10115', city: 'Berlin', country: 'Germany' };

/** A provider that behaves like PayPal: create, then capture what the buyer approved. */
function fakePayPal() {
  const provider = {
    name: 'paypal' as const,
    createPayment: vi.fn(async ({ reference }: { reference: string }) => ({ id: `PAYPAL-${reference}` })),
    capturePayment: vi.fn<(id: string) => Promise<CapturedPayment>>(),
    refund: vi.fn(async () => 'REFUND-1'),
    clientConfig: () => ({ provider: 'paypal' as const, clientId: 'public-client-id', environment: 'sandbox' as const, currency: 'EUR' }),
  };
  return provider satisfies PaymentProvider;
}

describe('checkout with PayPal', () => {
  const paypal = fakePayPal();
  const ctx: TestContext = useTestApp({ admin: TEST_ADMIN, payments: paypal });
  let lamp: string;
  let alice: request.Agent;
  let admin: request.Agent;

  beforeAll(async () => {
    const [p] = await productModel(ctx.db).insertMany([
      { name: 'Lamp', description: 'A lamp', priceCents: 4999, category: 'home', images: ['https://example.com/l.jpg'] },
    ]);
    lamp = String(p._id);
    alice = request.agent(ctx.app);
    await alice.post('/api/auth/register').send({ name: 'Alice', email: 'alice@example.com', password: 'customer-pw' });
    admin = request.agent(ctx.app);
    await admin.post('/api/auth/login').send(TEST_ADMIN);
  });

  beforeEach(() => {
    paypal.createPayment.mockClear();
    paypal.capturePayment.mockReset();
    paypal.refund.mockReset().mockResolvedValue('REFUND-1');
  });

  /** Starts a checkout for `quantity` lamps and captures it as PayPal would for that amount. */
  async function start(quantity = 2) {
    const res = await alice.post('/api/checkout').send({ lines: [{ productId: lamp, quantity }], shippingAddress: address });
    expect(res.status).toBe(201);
    return res.body as { checkoutId: string; providerOrderId: string };
  }
  const complete = (checkoutId: string, client = alice) => client.post(`/api/checkout/${checkoutId}/complete`).send();
  const capturedAs = (amountCents: number, currency = 'EUR') =>
    paypal.capturePayment.mockResolvedValue({ reference: 'CAPTURE-1', amountCents, currency });

  it('tells the browser to use PayPal, with the public client id only', async () => {
    const res = await request(ctx.app).get('/api/checkout/config');

    expect(res.body).toEqual({ provider: 'paypal', clientId: 'public-client-id', environment: 'sandbox', currency: 'EUR' });
    expect(JSON.stringify(res.body)).not.toMatch(/secret/i);
  });

  it('creates the payment for the database total, and places the order once it is captured', async () => {
    const { checkoutId, providerOrderId } = await start(2);
    expect(paypal.createPayment).toHaveBeenCalledWith({
      amountCents: 2 * 4999,
      currency: 'EUR',
      reference: checkoutId,
      description: 'Store order',
    });
    expect(providerOrderId).toBe(`PAYPAL-${checkoutId}`);
    expect(await orderModel(ctx.db).countDocuments({ _id: checkoutId })).toBe(0);

    capturedAs(2 * 4999);
    const res = await complete(checkoutId);

    expect(res.status).toBe(201);
    expect(paypal.capturePayment).toHaveBeenCalledWith(providerOrderId);
    expect(res.body).toMatchObject({
      status: 'placed',
      totalCents: 2 * 4999,
      paymentProvider: 'paypal',
      paymentReference: 'CAPTURE-1',
    });
  });

  it("reports PayPal being unreachable when starting, and keeps no half-made checkout", async () => {
    paypal.createPayment.mockRejectedValueOnce(new Error('PayPal authentication failed: 401'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const before = await checkoutModel(ctx.db).countDocuments();

    const res = await alice.post('/api/checkout').send({ lines: [{ productId: lamp, quantity: 1 }], shippingAddress: address });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('payment_failed');
    expect(await checkoutModel(ctx.db).countDocuments()).toBe(before);
    log.mockRestore();
  });

  it('returns the same order when completing again, without capturing twice', async () => {
    const { checkoutId } = await start();
    capturedAs(2 * 4999);

    const first = await complete(checkoutId);
    const second = await complete(checkoutId);

    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(paypal.capturePayment).toHaveBeenCalledTimes(1);
  });

  it("doesn't let another customer complete someone's checkout", async () => {
    const { checkoutId } = await start();
    const bob = request.agent(ctx.app);
    await bob.post('/api/auth/register').send({ name: 'Bob', email: 'bob@example.com', password: 'customer-pw' });

    const res = await complete(checkoutId, bob);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('checkout_not_found');
    expect(paypal.capturePayment).not.toHaveBeenCalled();
  });

  it('reports a declined payment, stores no order, and lets the buyer try again', async () => {
    const { checkoutId } = await start();
    paypal.capturePayment.mockRejectedValueOnce(new PaymentDeclinedError('INSTRUMENT_DECLINED'));

    const declined = await complete(checkoutId);
    expect(declined.status).toBe(402);
    expect(declined.body.error.code).toBe('payment_declined');
    expect(await orderModel(ctx.db).countDocuments({ _id: checkoutId })).toBe(0);

    capturedAs(2 * 4999);
    expect((await complete(checkoutId)).status).toBe(201);
  });

  it('refuses to complete a payment that was not approved yet', async () => {
    const { checkoutId } = await start();
    paypal.capturePayment.mockRejectedValueOnce(new PaymentNotApprovedError('ORDER_NOT_APPROVED'));

    const res = await complete(checkoutId);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('payment_not_approved');
  });

  it.each([
    ['a different amount', 100, 'EUR'],
    ['a different currency', 2 * 4999, 'USD'],
  ])('places no order when PayPal reports %s', async (_case, amountCents, currency) => {
    const { checkoutId } = await start();
    capturedAs(amountCents, currency);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await complete(checkoutId);

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('payment_failed');
    expect(await orderModel(ctx.db).countDocuments({ _id: checkoutId })).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Needs manual review'));
    log.mockRestore();
  });

  it('keeps a captured payment and stores its order on the next attempt if storing failed', async () => {
    const { checkoutId } = await start();
    // As if the server crashed right after the capture: the money is in, the order isn't.
    await checkoutModel(ctx.db).updateOne(
      { _id: checkoutId },
      { $set: { state: 'captured', paymentReference: 'CAPTURE-EARLIER' }, $unset: { expiresAt: 1 } },
    );

    const res = await complete(checkoutId);

    expect(res.status).toBe(201);
    expect(res.body.paymentReference).toBe('CAPTURE-EARLIER');
    expect(paypal.capturePayment).not.toHaveBeenCalled();
  });

  it('keeps unpaid checkouts only for a while, but never a paid one', async () => {
    const { checkoutId } = await start();
    const open = await checkoutModel(ctx.db).findById(checkoutId);
    expect(open?.expiresAt).toBeInstanceOf(Date);

    capturedAs(2 * 4999);
    await complete(checkoutId);

    expect((await checkoutModel(ctx.db).findById(checkoutId))?.expiresAt).toBeUndefined();
  });

  describe('cancelling', () => {
    async function paidOrder(): Promise<Order> {
      const { checkoutId } = await start(1);
      capturedAs(4999);
      return (await complete(checkoutId)).body as Order;
    }

    it('refunds the full amount when the customer cancels', async () => {
      const order = await paidOrder();

      const res = await alice.post(`/api/orders/${order.id}/cancel`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'cancelled', refundReference: 'REFUND-1' });
      expect(paypal.refund).toHaveBeenCalledWith({
        paymentReference: 'CAPTURE-1',
        amountCents: 4999,
        currency: 'EUR',
        idempotencyKey: `refund-${order.id}`,
      });
    });

    it('refunds when an admin cancels', async () => {
      const order = await paidOrder();

      const res = await admin.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'cancelled' });

      expect(res.status).toBe(200);
      expect(res.body.refundReference).toBe('REFUND-1');
      expect(paypal.refund).toHaveBeenCalledTimes(1);
    });

    it('leaves the order placed when the refund fails', async () => {
      const order = await paidOrder();
      paypal.refund.mockRejectedValueOnce(new Error('PayPal is down'));
      const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const res = await alice.post(`/api/orders/${order.id}/cancel`);

      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('refund_failed');
      expect((await alice.get(`/api/orders/${order.id}`)).body.status).toBe('placed');
      log.mockRestore();
    });

    it("doesn't refund simulated payments", async () => {
      const [simulated] = await orderModel(ctx.db).insertMany([
        {
          owner: (await alice.get('/api/auth/me')).body.id,
          lines: [{ productId: lamp, name: 'Lamp', unitPriceCents: 4999, quantity: 1 }],
          totalCents: 4999,
          shippingAddress: address,
          status: 'placed',
          paymentReference: 'mock_123',
        },
      ]);

      const res = await alice.post(`/api/orders/${String(simulated._id)}/cancel`);

      expect(res.status).toBe(200);
      expect(res.body.paymentProvider).toBe('mock');
      expect(paypal.refund).not.toHaveBeenCalled();
    });
  });
});

describe('cancelling a PayPal order after switching back to simulated payments', () => {
  const ctx: TestContext = useTestApp();

  it("won't cancel, because nothing could refund it", async () => {
    const alice = request.agent(ctx.app);
    const me = (await alice.post('/api/auth/register').send({ name: 'A', email: 'a@example.com', password: 'customer-pw' })).body;
    const [order] = await orderModel(ctx.db).insertMany([
      {
        owner: me.id,
        lines: [{ productId: '64b7f0000000000000000000', name: 'Lamp', unitPriceCents: 4999, quantity: 1 }],
        totalCents: 4999,
        shippingAddress: address,
        status: 'placed',
        paymentProvider: 'paypal',
        paymentReference: 'CAPTURE-OLD',
      },
    ]);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await alice.post(`/api/orders/${String(order._id)}/cancel`);

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('refund_failed');
    log.mockRestore();
  });
});
