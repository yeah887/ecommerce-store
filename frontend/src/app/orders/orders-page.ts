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
    <h1 class="title">My orders</h1>
    <div class="progress">
      @if (orders.isLoading()) {
        <mat-progress-bar mode="indeterminate" />
      }
    </div>

    @if (orders.error()) {
      <p class="message">Couldn't load your orders. Please try again.</p>
    } @else if (orders.hasValue()) {
      @if (orders.value().length === 0) {
        <section class="message">
          <p>You haven't placed any orders yet.</p>
          <a matButton="filled" routerLink="/">Start shopping</a>
        </section>
      } @else {
        <ul class="list">
          @for (order of orders.value(); track order.id) {
            <li>
              <a class="row" [routerLink]="['/orders', order.id]">
                <span class="number">#{{ order.number }}</span>
                <span class="date">{{ order.createdAt | date: 'mediumDate' }}</span>
                <span class="items">{{ order.itemCount }} {{ order.itemCount === 1 ? 'item' : 'items' }}</span>
                <span class="total">{{ order.totalCents | price }}</span>
                <app-status-chip [status]="order.status" />
                <mat-icon class="chevron">chevron_right</mat-icon>
              </a>
            </li>
          }
        </ul>
      }
    }
  `,
  styles: `
    .title {
      font: var(--mat-sys-headline-medium);
      margin: 0 0 16px;
    }
    .progress {
      height: 4px;
      margin-bottom: 8px;
    }
    .message {
      padding: 48px 0;
      text-align: center;
      font: var(--mat-sys-body-large);
    }
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      overflow: hidden;
    }
    li + li {
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .row {
      display: grid;
      grid-template-columns: 7em 1fr 6em 6em 7em 24px;
      gap: 16px;
      align-items: center;
      padding: 16px;
      color: inherit;
      text-decoration: none;
      &:hover {
        background: var(--mat-sys-surface-container-low);
      }
      @media (max-width: 640px) {
        grid-template-columns: 1fr auto;
        .date,
        .items,
        .chevron {
          display: none;
        }
      }
    }
    .number {
      font-family: monospace;
      font-weight: 600;
    }
    .date,
    .items {
      color: var(--mat-sys-on-surface-variant);
    }
    .total {
      text-align: right;
      font-weight: 500;
    }
    .chevron {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class OrdersPage {
  protected readonly orders = httpResource<OrderSummary[]>(() => '/api/orders');
}
