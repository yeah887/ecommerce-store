import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import type { PaymentClientConfig } from '@store/shared';
import { App } from './app';

describe('App', () => {
  /** Renders a freshly set up app, answering its payment-mode request with `payments`. */
  async function render(payments: PaymentClientConfig) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('/api/checkout/config').flush(payments);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the store name in the header', async () => {
    const page = await render({ provider: 'mock' });
    expect(page.querySelector('header a[href="/"]')?.textContent).toContain('Store');
  });

  it('describes how payments work: simulated, PayPal sandbox, or nothing for live PayPal', async () => {
    const footer = async (payments: PaymentClientConfig) =>
      (await render(payments)).querySelector('footer p')?.textContent?.trim();
    const paypal = (environment: 'sandbox' | 'live'): PaymentClientConfig => ({
      provider: 'paypal',
      clientId: 'id',
      environment,
      currency: 'EUR',
    });

    expect(await footer({ provider: 'mock' })).toContain('payment is simulated');
    expect(await footer(paypal('sandbox'))).toContain('PayPal sandbox');
    expect(await footer(paypal('live'))).toBe('');
  });
});
