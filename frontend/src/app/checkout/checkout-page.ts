import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';
import {
  SHIPPING_FIELD_MAX_LENGTH,
  type CheckoutStarted,
  type CreateOrderRequest,
  type Order,
  type ShippingAddress,
} from '@store/shared';
import { AuthService } from '../auth/auth.service';
import { CartStore, type CartLine } from '../cart/cart-store';
import type { TranslationKey } from '../i18n/en';
import { I18n } from '../i18n/i18n';
import { PaymentMode } from '../payments/payment-mode';
import { PayPalSdk, type PayPalButtons, type PayPalButtonsOptions, type PayPalNamespace } from '../payments/paypal-sdk';
import { apiError } from '../shared/api-error';
import { PricePipe } from '../shared/price.pipe';
import { TranslatePipe } from '../i18n/translate.pipe';

type AddressField = keyof ShippingAddress;

/** A cart line the server refused, with its reason. */
interface RejectedLine {
  line: CartLine;
  reason: string;
}

@Component({
  selector: 'app-checkout-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    PricePipe,
    TranslatePipe,
  ],
  templateUrl: './checkout-page.html',
})
export class CheckoutPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  protected readonly cart = inject(CartStore);
  private readonly i18n = inject(I18n);
  private readonly paymentMode = inject(PaymentMode);
  private readonly paypalSdk = inject(PayPalSdk);

  /** 'mock': our own button; 'sandbox' / 'live': PayPal's buttons. */
  protected readonly mode = this.paymentMode.mode;
  protected readonly paypalUnavailable = signal(false);
  private readonly paypalContainer = viewChild<ElementRef<HTMLElement>>('paypalButtons');

  private readonly max = SHIPPING_FIELD_MAX_LENGTH;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [inject(AuthService).user()?.name ?? '', [Validators.required, Validators.maxLength(this.max.name)]],
    street: ['', [Validators.required, Validators.maxLength(this.max.street)]],
    postalCode: ['', [Validators.required, Validators.maxLength(this.max.postalCode)]],
    city: ['', [Validators.required, Validators.maxLength(this.max.city)]],
    country: ['', [Validators.required, Validators.maxLength(this.max.country)]],
  });
  protected readonly addressFields: { key: AddressField; label: TranslationKey; autocomplete: string }[] = [
    { key: 'name', label: 'address.name', autocomplete: 'shipping name' },
    { key: 'street', label: 'address.street', autocomplete: 'shipping street-address' },
    { key: 'postalCode', label: 'address.postalCode', autocomplete: 'shipping postal-code' },
    { key: 'city', label: 'address.city', autocomplete: 'shipping address-level2' },
    { key: 'country', label: 'address.country', autocomplete: 'shipping country-name' },
  ];

  protected readonly placing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly rejected = signal<RejectedLine[]>([]);
  /** Rejected lines still in the cart; the list empties as the customer removes them. */
  protected readonly stillRejected = computed(() =>
    this.rejected().filter((r) => this.cart.lines().some((l) => l.productId === r.line.productId)),
  );

  /** Hide the error once every item it complained about has been removed from the cart. */
  protected readonly visibleError = computed(() =>
    this.rejected().length > 0 && this.stillRejected().length === 0 ? null : this.error(),
  );

  constructor() {
    // Show PayPal's buttons once PayPal is known to be on and their container is on the page.
    effect((onCleanup) => {
      const config = this.paymentMode.config.hasValue() ? this.paymentMode.config.value() : undefined;
      const container = this.paypalContainer()?.nativeElement;
      if (config?.provider !== 'paypal' || !container) return;

      let buttons: PayPalButtons | undefined;
      let cancelled = false;
      this.paypalSdk
        .load(config.clientId, config.currency)
        .then(async (paypal) => {
          if (cancelled) return;
          buttons = paypal.Buttons(this.paypalOptions(paypal));
          await buttons.render(container);
        })
        .catch(() => this.paypalUnavailable.set(true));
      onCleanup(() => {
        cancelled = true;
        void buttons?.close();
      });
    });
  }

  /** Simulated payment: start the checkout and complete it straight away. */
  protected async placeOrder(): Promise<void> {
    // With PayPal, paying goes through its buttons; submitting the form (Enter) only checks the address.
    if (this.form.invalid || this.mode() !== 'mock') {
      this.form.markAllAsTouched();
      return;
    }
    const lines = this.cart.lines();
    this.placing.set(true);
    try {
      const started = await this.startCheckout(lines);
      await this.completeCheckout(started.checkoutId);
    } catch (err) {
      this.showError(err, lines);
    } finally {
      this.placing.set(false);
    }
  }

  /** PayPal: the buyer approves in PayPal's window between starting and completing the checkout. */
  private paypalOptions(paypal: PayPalNamespace): PayPalButtonsOptions {
    let started: CheckoutStarted | undefined;
    let lines: CartLine[] = [];
    return {
      fundingSource: paypal.FUNDING.PAYPAL,
      style: { layout: 'vertical', shape: 'rect', label: 'pay', height: 48 },
      onClick: (_data, actions) => {
        if (this.form.invalid) {
          this.form.markAllAsTouched();
          return actions.reject();
        }
        return actions.resolve();
      },
      createOrder: async () => {
        lines = this.cart.lines();
        try {
          started = await this.startCheckout(lines);
          return started.providerOrderId;
        } catch (err) {
          this.showError(err, lines);
          throw err;
        }
      },
      onApprove: async (_data, actions) => {
        this.placing.set(true);
        try {
          await this.completeCheckout(started!.checkoutId);
        } catch (err) {
          // PayPal's advice for a declined funding source: reopen its window so the buyer can pick another.
          if (apiError(err)?.code === 'payment_declined') return actions.restart();
          this.showError(err, lines);
        } finally {
          this.placing.set(false);
        }
      },
      onCancel: () => this.error.set(this.i18n.t('checkout.paymentCancelled')),
      onError: () => {
        if (!this.error()) this.error.set(this.i18n.t('checkout.failed'));
      },
    };
  }

  private async startCheckout(lines: CartLine[]): Promise<CheckoutStarted> {
    this.error.set(null);
    this.rejected.set([]);
    const request: CreateOrderRequest = {
      lines: lines.map(({ productId, quantity }) => ({ productId, quantity })),
      shippingAddress: this.form.getRawValue(),
    };
    return firstValueFrom(this.http.post<CheckoutStarted>('/api/checkout', request));
  }

  private async completeCheckout(checkoutId: string): Promise<void> {
    const order = await firstValueFrom(this.http.post<Order>(`/api/checkout/${checkoutId}/complete`, {}));
    this.cart.clear();
    await this.router.navigate(['/checkout/confirmation', order.id], { state: { order } });
  }

  private showError(err: unknown, sentLines: CartLine[]): void {
    const body = apiError(err);
    const fields = body?.fields ?? {};

    if (body?.code === 'invalid_lines') {
      const rejected: RejectedLine[] = [];
      for (const key of Object.keys(fields)) {
        const line = sentLines[Number(key.split('.')[1])];
        // The cart already prevents duplicates and invalid quantities, so a refused line has gone from the store.
        if (line) rejected.push({ line, reason: this.i18n.t('checkout.lineUnavailable') });
      }
      this.rejected.set(rejected);
    }
    for (const [key, message] of Object.entries(fields)) {
      if (key.startsWith('shippingAddress.')) {
        const control = this.form.controls[key.split('.')[1] as AddressField];
        control?.setErrors({ server: message });
        control?.markAsTouched();
      }
    }
    this.error.set(this.i18n.errorMessage(err, 'checkout.failed'));
  }
}
