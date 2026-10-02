import { Injectable } from '@angular/core';

/** The parts of PayPal's JS SDK the checkout uses. */
export interface PayPalButtonsOptions {
  fundingSource?: string;
  style?: Record<string, string | number | boolean>;
  onClick?: (data: unknown, actions: { resolve(): Promise<void>; reject(): Promise<void> }) => Promise<void> | void;
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }, actions: { restart(): Promise<void> }) => Promise<void>;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
}

export interface PayPalButtons {
  isEligible(): boolean;
  render(container: HTMLElement): Promise<void>;
  close(): Promise<void>;
}

export interface PayPalNamespace {
  Buttons(options: PayPalButtonsOptions): PayPalButtons;
  FUNDING: { PAYPAL: string };
}

/** Loads PayPal's JS SDK once, on the first checkout that needs it. */
@Injectable({ providedIn: 'root' })
export class PayPalSdk {
  private loading?: Promise<PayPalNamespace>;

  load(clientId: string, currency: string): Promise<PayPalNamespace> {
    this.loading ??= new Promise<PayPalNamespace>((resolve, reject) => {
      const params = new URLSearchParams({ 'client-id': clientId, currency, intent: 'capture', components: 'buttons' });
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?${params}`;
      script.async = true;
      script.onload = () => {
        const paypal = (window as unknown as { paypal?: PayPalNamespace }).paypal;
        if (paypal) resolve(paypal);
        else reject(new Error('PayPal SDK loaded without window.paypal'));
      };
      script.onerror = () => reject(new Error('PayPal SDK failed to load'));
      document.head.appendChild(script);
    }).catch((err: unknown) => {
      // Let a later checkout try again, e.g. after the connection came back.
      this.loading = undefined;
      throw err;
    });
    return this.loading;
  }
}
