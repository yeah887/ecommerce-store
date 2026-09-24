import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { orderNumber, type Order } from '@store/shared';
import { PricePipe } from '../shared/price.pipe';

@Component({
  selector: 'app-confirmation-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, PricePipe],
  template: `
    <section class="confirmation">
      <mat-icon class="icon">check_circle</mat-icon>
      <h1>Thank you for your order!</h1>
      <p class="number">Order number <strong>{{ number() }}</strong></p>

      @if (order(); as o) {
        <p>
          We've received your order of {{ o.lines.length }}
          {{ o.lines.length === 1 ? 'product' : 'products' }} for
          <strong>{{ o.totalCents | price }}</strong>. It will be shipped to {{ o.shippingAddress.name }},
          {{ o.shippingAddress.city }}.
        </p>
      }

      <div class="actions">
        <a matButton="outlined" [routerLink]="['/orders', id()]">View order</a>
        <a matButton="filled" routerLink="/">Continue shopping</a>
      </div>
    </section>
  `,
  styles: `
    .confirmation {
      max-width: 560px;
      margin: 32px auto;
      text-align: center;
      font: var(--mat-sys-body-large);
    }
    .icon {
      width: 72px;
      height: 72px;
      font-size: 72px;
      color: #2e7d32;
    }
    h1 {
      font: var(--mat-sys-headline-medium);
    }
    .actions {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    .number strong {
      font-family: monospace;
      font-size: 1.2em;
    }
  `,
})
export class ConfirmationPage {
  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly number = computed(() => orderNumber(this.id()));
  /** Passed in navigation state right after checkout; absent after a reload. */
  protected readonly order = computed(() => {
    const order = (history.state as { order?: Order } | null)?.order;
    return order?.id === this.id() ? order : undefined;
  });
}
