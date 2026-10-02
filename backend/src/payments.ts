import { randomUUID } from 'node:crypto';
import type { PaymentClientConfig, PaymentProviderName } from '@store/shared';

export interface PaymentRequest {
  amountCents: number;
  currency: string;
  /** Our id for the attempt (the checkout id), so the payment can be matched to it. */
  reference: string;
  /** Shown to the buyer by the provider, e.g. "Store order". */
  description: string;
}

/** A payment the provider has taken. The amount is what was really captured, to check against ours. */
export interface CapturedPayment {
  reference: string;
  amountCents: number;
  currency: string;
}

export interface RefundRequest {
  /** The captured payment's reference. */
  paymentReference: string;
  amountCents: number;
  currency: string;
  /** Makes retries safe: the provider refunds at most once per key. */
  idempotencyKey: string;
}

/** Thrown when the buyer's payment was refused; they may try again, e.g. with another funding source. */
export class PaymentDeclinedError extends Error {}

/** Thrown when capture is attempted before the buyer approved the payment. */
export class PaymentNotApprovedError extends Error {}

/**
 * Checkout depends only on this. Payments take two steps because the buyer approves them with the
 * provider in between: `createPayment` when checkout starts, `capturePayment` once they approved.
 */
export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createPayment(request: PaymentRequest): Promise<{ id: string }>;
  /** Takes an approved payment. Safe to call again for the same id: it returns the same capture. */
  capturePayment(id: string): Promise<CapturedPayment>;
  /** Refunds a captured payment in full; returns the provider's refund id. */
  refund(request: RefundRequest): Promise<string>;
  /** What the browser needs for the payment step. */
  clientConfig(): PaymentClientConfig;
}

/** Approves every payment immediately. No money moves: for development, tests and demos. */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  private readonly payments = new Map<string, CapturedPayment>();

  async createPayment({ amountCents, currency }: PaymentRequest): Promise<{ id: string }> {
    const id = `mock_${randomUUID()}`;
    this.payments.set(id, { reference: id, amountCents, currency });
    return { id };
  }

  async capturePayment(id: string): Promise<CapturedPayment> {
    const payment = this.payments.get(id);
    if (!payment) throw new PaymentNotApprovedError(`Unknown mock payment ${id}`);
    return payment;
  }

  async refund(): Promise<string> {
    return `mock_refund_${randomUUID()}`;
  }

  clientConfig(): PaymentClientConfig {
    return { provider: 'mock' };
  }
}

/** 1234 → "12.34": the decimal string payment APIs expect, without floating-point rounding. */
export function centsToAmount(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`Invalid amount in cents: ${cents}`);
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/** "12.34" (or "12.3", "12") → 1234; null when the string isn't a plain amount. */
export function amountToCents(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}
