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
    <section class="card mx-auto max-w-xl px-6 py-12 text-center sm:px-10">
      <span class="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <mat-icon class="icon-36">check_circle</mat-icon>
      </span>
      <h1 class="page-title mt-6">Thank you for your order!</h1>
      <p class="mt-2 text-zinc-500">
        Order number <strong class="font-mono text-base font-semibold text-zinc-900">{{ number() }}</strong>
      </p>

      @if (order(); as o) {
        <p class="mt-6 leading-7 text-zinc-600">
          We've received your order of {{ o.lines.length }}
          {{ o.lines.length === 1 ? 'product' : 'products' }} for
          <strong class="text-zinc-900">{{ o.totalCents | price }}</strong>. It will be shipped to
          {{ o.shippingAddress.name }}, {{ o.shippingAddress.city }}.
        </p>
      }

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a matButton="outlined" [routerLink]="['/orders', id()]">View order</a>
        <a matButton="filled" routerLink="/">Continue shopping</a>
      </div>
    </section>
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
