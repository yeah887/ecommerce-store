import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { OrderSummary } from '@store/shared';
import { PricePipe } from '../shared/price.pipe';
import { StatusChip } from '../shared/status-chip';

@Component({
  selector: 'app-orders-page',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, PricePipe, StatusChip],
  template: `
    <h1 class="page-title">My orders</h1>
    <div class="mt-6 mb-4 h-1 overflow-hidden rounded-full">
      @if (orders.isLoading()) {
        <mat-progress-bar mode="indeterminate" />
      }
    </div>

    @if (orders.error()) {
      <p class="py-16 text-center text-zinc-500">Couldn't load your orders. Please try again.</p>
    } @else if (orders.hasValue()) {
      @if (orders.value().length === 0) {
        <section class="card flex flex-col items-center px-6 py-16 text-center">
          <span class="grid size-16 place-items-center rounded-full bg-zinc-100 text-zinc-400">
            <mat-icon class="icon-32">receipt_long</mat-icon>
          </span>
          <p class="mt-4 text-zinc-600">You haven't placed any orders yet.</p>
          <a matButton="filled" routerLink="/" class="mt-6">Start shopping</a>
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
                    {{ order.createdAt | date: 'mediumDate' }} · {{ order.itemCount }}
                    {{ order.itemCount === 1 ? 'item' : 'items' }}
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
