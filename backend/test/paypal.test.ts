import { describe, expect, it } from 'vitest';
import { PaymentDeclinedError, PaymentNotApprovedError, amountToCents, centsToAmount } from '../src/payments.js';
import { PayPalError, PayPalPaymentProvider } from '../src/paypal.js';

interface Call {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
}

/** A stand-in for PayPal's API: answers requests by path and records them. */
function fakePayPalApi(routes: Record<string, (call: Call) => { status?: number; json: unknown }>) {
  const calls: Call[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    const raw = init.body as string | undefined;
    const call: Call = {
      method: init.method ?? 'GET',
      path,
      headers: init.headers as Record<string, string>,
      body: raw && raw.startsWith('{') ? JSON.parse(raw) : raw,
    };
    calls.push(call);
    const route = routes[`${call.method} ${path}`] ?? routes[`${call.method} *`];
    const answer = route ? route(call) : { status: 404, json: { name: 'RESOURCE_NOT_FOUND' } };
    return new Response(JSON.stringify(answer.json), { status: answer.status ?? 200 });
  }) as typeof globalThis.fetch;
  const provider = new PayPalPaymentProvider(
    { clientId: 'client-id', clientSecret: 'client-secret', environment: 'sandbox' },
    { baseUrl: 'https://paypal.test', fetch },
  );
  return { provider, calls };
}

const token = { 'POST /v1/oauth2/token': () => ({ json: { access_token: 'TOKEN', expires_in: 32400 } }) };

const capturedOrder = (status = 'COMPLETED', value = '99.98', currency = 'EUR') => ({
  id: 'ORDER-1',
  status: 'COMPLETED',
  purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-1', status, amount: { currency_code: currency, value } }] } }],
});

const issue = (name: string) => ({ status: 422, json: { name: 'UNPROCESSABLE_ENTITY', details: [{ issue: name }] } });

describe('PayPalPaymentProvider', () => {
  it('logs in with the client credentials once and reuses the token', async () => {
    const { provider, calls } = fakePayPalApi({
      ...token,
      'POST /v2/checkout/orders': () => ({ status: 201, json: { id: 'ORDER-1', status: 'CREATED' } }),
    });

    await provider.createPayment({ amountCents: 100, currency: 'EUR', reference: 'a', description: 'x' });
    await provider.createPayment({ amountCents: 100, currency: 'EUR', reference: 'b', description: 'x' });

    const logins = calls.filter((c) => c.path === '/v1/oauth2/token');
    expect(logins).toHaveLength(1);
    expect(logins[0].headers['Authorization']).toBe(`Basic ${Buffer.from('client-id:client-secret').toString('base64')}`);
    expect(logins[0].body).toBe('grant_type=client_credentials');
    expect(calls[1].headers['Authorization']).toBe('Bearer TOKEN');
  });

  it('creates an order for the exact amount, tied to our checkout, without asking for shipping', async () => {
    const { provider, calls } = fakePayPalApi({
      ...token,
      'POST /v2/checkout/orders': () => ({ status: 201, json: { id: 'ORDER-1', status: 'CREATED' } }),
    });

    const payment = await provider.createPayment({ amountCents: 1_234_505, currency: 'EUR', reference: 'checkout-1', description: 'Store order' });

    expect(payment).toEqual({ id: 'ORDER-1' });
    const create = calls.find((c) => c.path === '/v2/checkout/orders')!;
    expect(create.headers['PayPal-Request-Id']).toBe('create-checkout-1');
    expect(create.body).toEqual({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: 'checkout-1',
          custom_id: 'checkout-1',
          description: 'Store order',
          amount: { currency_code: 'EUR', value: '12345.05' },
        },
      ],
      payment_source: { paypal: { experience_context: { shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' } } },
    });
  });

  it('captures and reports what PayPal actually took', async () => {
    const { provider, calls } = fakePayPalApi({
      ...token,
      'POST /v2/checkout/orders/ORDER-1/capture': () => ({ status: 201, json: capturedOrder() }),
    });

    expect(await provider.capturePayment('ORDER-1')).toEqual({ reference: 'CAPTURE-1', amountCents: 9998, currency: 'EUR' });
    expect(calls[1].headers['PayPal-Request-Id']).toBe('capture-ORDER-1');
  });

  it('reports an earlier capture when PayPal says the order was already captured', async () => {
    const { provider } = fakePayPalApi({
      ...token,
      'POST /v2/checkout/orders/ORDER-1/capture': () => issue('ORDER_ALREADY_CAPTURED'),
      'GET /v2/checkout/orders/ORDER-1': () => ({ json: capturedOrder() }),
    });

    expect((await provider.capturePayment('ORDER-1')).reference).toBe('CAPTURE-1');
  });

  it.each([
    ['a declined funding source', () => issue('INSTRUMENT_DECLINED'), PaymentDeclinedError],
    ['a declined capture', () => ({ status: 201, json: capturedOrder('DECLINED') }), PaymentDeclinedError],
    ['an unapproved order', () => issue('ORDER_NOT_APPROVED'), PaymentNotApprovedError],
    ['a capture held for review', () => ({ status: 201, json: capturedOrder('PENDING') }), PayPalError],
    ['a server error', () => ({ status: 500, json: { name: 'INTERNAL_SERVER_ERROR' } }), PayPalError],
  ])('turns %s into the right error', async (_case, answer, error) => {
    const { provider } = fakePayPalApi({ ...token, 'POST /v2/checkout/orders/ORDER-1/capture': answer });

    await expect(provider.capturePayment('ORDER-1')).rejects.toBeInstanceOf(error);
  });

  it('refunds the full amount of a capture, at most once per key', async () => {
    const { provider, calls } = fakePayPalApi({
      ...token,
      'POST /v2/payments/captures/CAPTURE-1/refund': () => ({ status: 201, json: { id: 'REFUND-1', status: 'COMPLETED' } }),
    });

    const id = await provider.refund({ paymentReference: 'CAPTURE-1', amountCents: 4999, currency: 'EUR', idempotencyKey: 'refund-order-1' });

    expect(id).toBe('REFUND-1');
    const refund = calls.find((c) => c.path.endsWith('/refund'))!;
    expect(refund.headers['PayPal-Request-Id']).toBe('refund-order-1');
    expect(refund.body).toEqual({ amount: { currency_code: 'EUR', value: '49.99' } });
  });

  it('logs in again after PayPal rejects the token', async () => {
    let first = true;
    const { provider, calls } = fakePayPalApi({
      ...token,
      'POST /v2/checkout/orders': () => {
        if (first) {
          first = false;
          return { status: 401, json: { name: 'AUTHENTICATION_FAILURE' } };
        }
        return { status: 201, json: { id: 'ORDER-2', status: 'CREATED' } };
      },
    });
    const create = () => provider.createPayment({ amountCents: 100, currency: 'EUR', reference: 'r', description: 'x' });

    await expect(create()).rejects.toBeInstanceOf(PayPalError);
    await create();

    expect(calls.filter((c) => c.path === '/v1/oauth2/token')).toHaveLength(2);
  });

  it('gives the browser only the public client id', () => {
    const { provider } = fakePayPalApi({});
    expect(provider.clientConfig()).toEqual({ provider: 'paypal', clientId: 'client-id', environment: 'sandbox', currency: 'EUR' });
  });
});

describe('amounts', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [1299, '12.99'],
    [10_000_000, '100000.00'],
  ])('%i cents is "%s"', (cents, amount) => {
    expect(centsToAmount(cents)).toBe(amount);
    expect(amountToCents(amount)).toBe(cents);
  });

  it('reads shortened amounts and rejects anything else', () => {
    expect(amountToCents('12.3')).toBe(1230);
    expect(amountToCents('12')).toBe(1200);
    for (const bad of ['', '-1.00', '1.234', '1e3', '12,50', ' 1.00']) expect(amountToCents(bad), bad).toBeNull();
    expect(() => centsToAmount(12.5)).toThrow();
  });
});
