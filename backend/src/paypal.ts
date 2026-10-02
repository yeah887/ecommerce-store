import { CURRENCY, type PaymentClientConfig } from '@store/shared';
import {
  PaymentDeclinedError,
  PaymentNotApprovedError,
  amountToCents,
  centsToAmount,
  type CapturedPayment,
  type PaymentProvider,
  type PaymentRequest,
  type RefundRequest,
} from './payments.js';

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  /** Sandbox moves no real money; live does. */
  environment: 'sandbox' | 'live';
}

const API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
} as const;

/** Refresh the access token this long before PayPal says it expires. */
const TOKEN_MARGIN_MS = 60_000;

/** An unexpected answer from PayPal (not a decline): logged, and shown to the buyer as a failed payment. */
export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issue?: string,
  ) {
    super(message);
  }
}

interface PayPalCapture {
  id: string;
  status: string;
  amount?: { currency_code: string; value: string };
}

interface PayPalOrder {
  id: string;
  status: string;
  purchase_units?: { payments?: { captures?: PayPalCapture[] } }[];
}

/**
 * Payments through PayPal's REST API (Orders v2 and Payments v2).
 * The buyer approves each payment in PayPal's window, opened by the JS SDK buttons in the browser.
 */
export class PayPalPaymentProvider implements PaymentProvider {
  readonly name = 'paypal';
  private readonly baseUrl: string;
  private readonly fetch: typeof fetch;
  private token?: { value: string; expiresAt: number };

  constructor(
    private readonly config: PayPalConfig,
    options: { baseUrl?: string; fetch?: typeof fetch } = {},
  ) {
    this.baseUrl = options.baseUrl ?? API_BASE[config.environment];
    this.fetch = options.fetch ?? fetch;
  }

  async createPayment({ amountCents, currency, reference, description }: PaymentRequest): Promise<{ id: string }> {
    const order = await this.call<PayPalOrder>('POST', '/v2/checkout/orders', {
      requestId: `create-${reference}`,
      body: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: reference,
            custom_id: reference,
            description,
            amount: { currency_code: currency, value: centsToAmount(amountCents) },
          },
        ],
        payment_source: {
          paypal: {
            // The store collects the shipping address itself, so PayPal doesn't ask for one.
            experience_context: { shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
          },
        },
      },
    });
    return { id: order.id };
  }

  async capturePayment(id: string): Promise<CapturedPayment> {
    try {
      const order = await this.call<PayPalOrder>('POST', `/v2/checkout/orders/${encodeURIComponent(id)}/capture`, {
        requestId: `capture-${id}`,
        body: {},
      });
      return this.completedCapture(order);
    } catch (err) {
      if (!(err instanceof PayPalError)) throw err;
      if (err.issue === 'ORDER_ALREADY_CAPTURED') {
        // An earlier attempt went through (e.g. its response was lost): report that capture.
        return this.completedCapture(await this.call<PayPalOrder>('GET', `/v2/checkout/orders/${encodeURIComponent(id)}`));
      }
      if (err.issue === 'INSTRUMENT_DECLINED' || err.issue === 'TRANSACTION_REFUSED') {
        throw new PaymentDeclinedError(err.message);
      }
      if (err.issue === 'ORDER_NOT_APPROVED' || err.issue === 'PAYER_ACTION_REQUIRED') {
        throw new PaymentNotApprovedError(err.message);
      }
      throw err;
    }
  }

  async refund({ paymentReference, amountCents, currency, idempotencyKey }: RefundRequest): Promise<string> {
    const refund = await this.call<{ id: string; status: string }>(
      'POST',
      `/v2/payments/captures/${encodeURIComponent(paymentReference)}/refund`,
      {
        requestId: idempotencyKey,
        body: { amount: { currency_code: currency, value: centsToAmount(amountCents) } },
      },
    );
    // PENDING refunds complete later on PayPal's side; the request itself was accepted.
    if (refund.status !== 'COMPLETED' && refund.status !== 'PENDING') {
      throw new PayPalError(`Refund ${refund.id} has status ${refund.status}`, 200);
    }
    return refund.id;
  }

  clientConfig(): PaymentClientConfig {
    return {
      provider: 'paypal',
      clientId: this.config.clientId,
      environment: this.config.environment,
      currency: CURRENCY,
    };
  }

  /** The order's single capture, which must have completed; its amount is checked by the caller. */
  private completedCapture(order: PayPalOrder): CapturedPayment {
    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture) throw new PayPalError(`Order ${order.id} (${order.status}) has no capture`, 200);
    if (capture.status === 'DECLINED' || capture.status === 'FAILED') {
      throw new PaymentDeclinedError(`Capture ${capture.id} was ${capture.status}`);
    }
    if (capture.status !== 'COMPLETED') {
      // PENDING means PayPal is holding the money for review; the store only ships paid orders.
      throw new PayPalError(`Capture ${capture.id} has status ${capture.status}`, 200);
    }
    const amountCents = capture.amount ? amountToCents(capture.amount.value) : null;
    if (amountCents === null || !capture.amount) {
      throw new PayPalError(`Capture ${capture.id} has no readable amount`, 200);
    }
    return { reference: capture.id, amountCents, currency: capture.amount.currency_code };
  }

  private async call<T>(
    method: 'GET' | 'POST',
    path: string,
    { body, requestId }: { body?: unknown; requestId?: string } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.accessToken()}`,
      'Content-Type': 'application/json',
    };
    // PayPal answers a repeated request with the same id with the first result instead of acting twice.
    if (requestId) headers['PayPal-Request-Id'] = requestId;

    const res = await this.fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const issue = (data['details'] as { issue?: string }[] | undefined)?.[0]?.issue;
      if (res.status === 401) this.token = undefined;
      throw new PayPalError(
        `PayPal ${method} ${path} failed: ${res.status} ${String(data['name'] ?? '')} ${issue ?? ''}`.trim(),
        res.status,
        issue,
      );
    }
    return data as T;
  }

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt) return this.token.value;

    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    const res = await this.fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new PayPalError(`PayPal authentication failed: ${res.status}`, res.status);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 - TOKEN_MARGIN_MS };
    return this.token.value;
  }
}
