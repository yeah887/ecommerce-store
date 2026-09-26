import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
import { FilterPills, type FilterOption } from '../shared/filter-pills';
import { PricePipe } from '../shared/price.pipe';
import { StatusChip } from '../shared/status-chip';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-orders-page',
  imports: [
    DatePipe,
    RouterLink,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
    FilterPills,
    PricePipe,
    StatusChip,
  ],
  template: `
    <h1 class="page-title">Orders</h1>

    <app-filter-pills
      class="mt-6 block"
      label="Filter by status"
      [options]="statusOptions"
      [value]="activeStatus() ?? ''"
      (valueChange)="filter($event || null)"
    />

    <div class="mt-6 mb-4 h-1 overflow-hidden rounded-full">
      @if (orders.isLoading()) {
        <mat-progress-bar mode="indeterminate" />
      }
    </div>

    @if (orders.error()) {
      <p class="py-16 text-center text-zinc-500">Couldn't load orders.</p>
    } @else if (orders.hasValue()) {
      @let result = orders.value();
      @if (result.items.length === 0) {
        <p class="card py-16 text-center text-zinc-500">No orders{{ activeStatus() ? ' with this status' : ' yet' }}.</p>
      } @else {
        <div class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table mat-table class="!min-w-[720px]" [dataSource]="result.items">
              <ng-container matColumnDef="number">
                <th mat-header-cell *matHeaderCellDef>Order</th>
                <td mat-cell *matCellDef="let o">
                  <a class="rounded font-mono font-semibold text-zinc-900 hover:text-accent-700" [routerLink]="['/admin/orders', o.id]">
                    #{{ o.number }}
                  </a>
                </td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Placed</th>
                <td mat-cell *matCellDef="let o" class="!text-zinc-500">{{ o.createdAt | date: 'medium' }}</td>
              </ng-container>
              <ng-container matColumnDef="customer">
                <th mat-header-cell *matHeaderCellDef>Customer</th>
                <td mat-cell *matCellDef="let o">
                  @if (o.customer) {
                    <span class="block font-medium">{{ o.customer.name }}</span>
                    <span class="block text-xs text-zinc-500">{{ o.customer.email }}</span>
                  } @else {
                    <span class="text-zinc-500">Deleted account</span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="items">
                <th mat-header-cell *matHeaderCellDef class="!text-right">Items</th>
                <td mat-cell *matCellDef="let o" class="!text-right tabular-nums">{{ o.itemCount }}</td>
              </ng-container>
              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef class="!text-right">Total</th>
                <td mat-cell *matCellDef="let o" class="!text-right font-medium tabular-nums">{{ o.totalCents | price }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let o"><app-status-chip [status]="o.status" /></td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns" class="cursor-pointer hover:bg-zinc-50" (click)="open(row)"></tr>
            </table>
          </div>

          @if (result.totalPages > 1) {
            <mat-paginator
              class="border-t border-zinc-200"
              [length]="result.total"
              [pageIndex]="result.page - 1"
              [pageSize]="pageSize"
              [hidePageSize]="true"
              (page)="changePage($event)"
              aria-label="Order pages"
            />
          }
        </div>
      }
    }
  `,
})
export class AdminOrdersPage {
  private readonly router = inject(Router);

  // Bound from the URL query (?status=&page=).
  readonly status = input<string>();
  readonly page = input<string>();

  protected readonly statusOptions: FilterOption[] = [
    { value: '', label: 'All' },
    ...ORDER_STATUSES.map((status) => ({ value: status, label: ORDER_STATUS_LABELS[status] })),
  ];
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
