import { httpResource } from '@angular/common/http';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { OrderSummary } from '@store/shared';
import { PricePipe } from '../shared/price.pipe';
import { StatusChip } from '../shared/status-chip';
import { LocalDatePipe, TranslatePipe, TranslatePluralPipe } from '../i18n/translate.pipe';

@Component({
  selector: 'app-orders-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, PricePipe, StatusChip, LocalDatePipe, TranslatePipe, TranslatePluralPipe],
  template: `
    <h1 class="page-title">{{ 'orders.title' | t }}</h1>
    <div class="mt-6 mb-4 h-1 overflow-hidden rounded-full">
      @if (orders.isLoading()) {
        <mat-progress-bar mode="indeterminate" />
      }
    </div>

    @if (orders.error()) {
      <p class="py-16 text-center text-zinc-500">{{ 'orders.loadError' | t }}</p>
    } @else if (orders.hasValue()) {
      @if (orders.value().length === 0) {
        <section class="card flex flex-col items-center px-6 py-16 text-center">
          <span class="grid size-16 place-items-center rounded-full bg-zinc-100 text-zinc-400">
            <mat-icon class="icon-32">receipt_long</mat-icon>
          </span>
          <p class="mt-4 text-zinc-600">{{ 'orders.none' | t }}</p>
          <a matButton="filled" routerLink="/" class="mt-6">{{ 'orders.startShopping' | t }}</a>
        </section>
      } @else {
        <ul class="card divide-y divide-zinc-200 overflow-hidden">
          @for (order of orders.value(); track order.id) {
            <li>
              <a class="flex items-center gap-4 px-4 py-4 hover:bg-zinc-50 sm:px-6" [routerLink]="['/orders', order.id]">
                <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-500 max-sm:hidden">
                  <mat-icon class="icon-20">receipt_long</mat-icon>
                </span>
                <div class="min-w-0 flex-1">
                  <p class="font-mono text-sm font-semibold text-zinc-900">#{{ order.number }}</p>
                  <p class="mt-0.5 text-sm text-zinc-500">
                    {{ order.createdAt | localDate }} · {{ 'orders.items' | tn: order.itemCount }}
                    <span class="sm:hidden">· {{ order.totalCents | price }}</span>
                  </p>
                </div>
                <app-status-chip [status]="order.status" />
                <span class="w-24 text-right font-semibold text-zinc-900 tabular-nums max-sm:hidden">
                  {{ order.totalCents | price }}
                </span>
                <mat-icon class="!text-zinc-400 max-sm:hidden" aria-hidden="true">chevron_right</mat-icon>
              </a>
            </li>
          }
        </ul>
      }
    }
  `,
})
export class OrdersPage {
  protected readonly orders = httpResource<OrderSummary[]>(() => '/api/orders');
}
