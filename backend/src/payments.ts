import { randomUUID } from 'node:crypto';

export interface ChargeRequest {
  amountCents: number;
  currency: string;
  /** Who is paying, for the provider's records. */
  customerEmail: string;
}

export interface Charge {
  reference: string;
}

/** Thrown by a provider when the payment was refused (as opposed to failing unexpectedly). */
export class PaymentDeclinedError extends Error {}

/** Checkout depends only on this, so a real provider (e.g. Stripe) can replace the mock. */
export interface PaymentProvider {
  charge(request: ChargeRequest): Promise<Charge>;
}

/** Approves every payment. No money moves. */
export class MockPaymentProvider implements PaymentProvider {
  async charge(): Promise<Charge> {
    return { reference: `mock_${randomUUID()}` };
  }
}
