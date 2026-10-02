import { httpResource } from '@angular/common/http';
import { Injectable, computed } from '@angular/core';
import type { PaymentClientConfig } from '@store/shared';

/** How this store takes payments, as the API reports it: simulated, PayPal sandbox, or live PayPal. */
@Injectable({ providedIn: 'root' })
export class PaymentMode {
  readonly config = httpResource<PaymentClientConfig>(() => '/api/checkout/config');

  /** 'mock' until the config has loaded, so nothing claims real payments before the API confirms them. */
  readonly mode = computed<'mock' | 'sandbox' | 'live'>(() => {
    const config = this.config.hasValue() ? this.config.value() : undefined;
    return config?.provider === 'paypal' ? config.environment : 'mock';
  });
  readonly usesPayPal = computed(() => this.mode() !== 'mock');
  /** Real money moves only in live mode. */
  readonly isLive = computed(() => this.mode() === 'live');
}
