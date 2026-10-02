/** How payments are taken: simulated, or through PayPal. */
export type PaymentProviderName = 'mock' | 'paypal';

/** What the browser needs to show the payment step: `GET /api/checkout/config`. */
export type PaymentClientConfig =
  | { provider: 'mock' }
  | {
      provider: 'paypal';
      /** PayPal's public client id for the JS SDK; the secret stays on the server. */
      clientId: string;
      /** Sandbox moves no real money. */
      environment: 'sandbox' | 'live';
      currency: string;
    };

/** Response of `POST /api/checkout`: the stored attempt and the provider's id for the payment to approve. */
export interface CheckoutStarted {
  checkoutId: string;
  providerOrderId: string;
}
