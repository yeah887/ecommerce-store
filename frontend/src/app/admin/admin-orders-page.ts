import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  isOrderStatus,
  type AdminOrderSummary,
  type Page,
} from '@store/shared';
import { PricePipe } from '../shared/price.pipe';
import { StatusChip } from '../shared/status-chip';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-orders-page',
  imports: [
    DatePipe,
    RouterLink,
    MatChipsModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
    PricePipe,
    StatusChip,
  ],
  template: `
    <h1 class="title">Orders</h1>

    <mat-chip-listbox
      aria-label="Filter by status"
      [value]="activeStatus() ?? ''"
      (change)="filter($event.value || null)"
      hideSingleSelectionIndicator
    >
      <mat-chip-option value="">All</mat-chip-option>
      @for (status of statuses; track status) {
        <mat-chip-option [value]="status">{{ labels[status] }}</mat-chip-option>
      }
    </mat-chip-listbox>

    <div class="progress">
      @if (orders.isLoading()) {
        <mat-progress-bar mode="indeterminate" />
      }
    </div>

    @if (orders.error()) {
      <p class="message">Couldn't load orders.</p>
    } @else if (orders.hasValue()) {
      @let result = orders.value();
      @if (result.items.length === 0) {
        <p class="message">No orders{{ activeStatus() ? ' with this status' : ' yet' }}.</p>
      } @else {
        <div class="table-wrap">
          <table mat-table [dataSource]="result.items">
            <ng-container matColumnDef="number">
              <th mat-header-cell *matHeaderCellDef>Order</th>
              <td mat-cell *matCellDef="let o">
                <a class="number" [routerLink]="['/admin/orders', o.id]">#{{ o.number }}</a>
              </td>
            </ng-container>
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Placed</th>
              <td mat-cell *matCellDef="let o">{{ o.createdAt | date: 'medium' }}</td>
            </ng-container>
            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef>Customer</th>
              <td mat-cell *matCellDef="let o">
                @if (o.customer) {
                  <span class="customer">{{ o.customer.name }}</span>
                  <span class="email">{{ o.customer.email }}</span>
                } @else {
                  <span class="email">Deleted account</span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="items">
              <th mat-header-cell *matHeaderCellDef class="num">Items</th>
              <td mat-cell *matCellDef="let o" class="num">{{ o.itemCount }}</td>
            </ng-container>
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef class="num">Total</th>
              <td mat-cell *matCellDef="let o" class="num">{{ o.totalCents | price }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let o"><app-status-chip [status]="o.status" /></td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns" class="row" (click)="open(row)"></tr>
          </table>
        </div>

        @if (result.totalPages > 1) {
          <mat-paginator
            [length]="result.total"
            [pageIndex]="result.page - 1"
            [pageSize]="pageSize"
            [hidePageSize]="true"
            (page)="changePage($event)"
            aria-label="Order pages"
          />
        }
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
      margin: 16px 0 8px;
    }
    .table-wrap {
      overflow-x: auto;
    }
    .row {
      cursor: pointer;
      &:hover {
        background: var(--mat-sys-surface-container-low);
      }
    }
    .number {
      font-family: monospace;
      font-weight: 600;
      color: inherit;
    }
    .customer {
      display: block;
    }
    .email {
      display: block;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .num {
      text-align: right;
    }
    .message {
      padding: 48px 0;
      text-align: center;
    }
  `,
})
export class AdminOrdersPage {
  private readonly router = inject(Router);

  // Bound from the URL query (?status=&page=).
  readonly status = input<string>();
  readonly page = input<string>();

  protected readonly statuses = ORDER_STATUSES;
  protected readonly labels = ORDER_STATUS_LABELS;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly columns = ['number', 'date', 'customer', 'items', 'total', 'status'];

  protected readonly activeStatus = computed(() => {
    const status = this.status();
    return isOrderStatus(status) ? status : undefined;
  });
  private readonly pageNumber = computed(() => {
    const page = Number(this.page());
    return Number.isInteger(page) && page >= 1 ? page : 1;
  });

  protected readonly orders = httpResource<Page<AdminOrderSummary>>(() => {
    const params: Record<string, string | number> = { page: this.pageNumber(), pageSize: this.pageSize };
    const status = this.activeStatus();
    if (status) params['status'] = status;
    return { url: '/api/admin/orders', params };
  });

  protected filter(status: string | null): void {
    void this.router.navigate([], { queryParams: { status, page: null }, queryParamsHandling: 'merge' });
  }

  protected changePage(event: PageEvent): void {
    void this.router.navigate([], {
      queryParams: { page: event.pageIndex === 0 ? null : event.pageIndex + 1 },
      queryParamsHandling: 'merge',
    });
  }

  protected open(order: AdminOrderSummary): void {
    void this.router.navigate(['/admin/orders', order.id]);
  }
}
