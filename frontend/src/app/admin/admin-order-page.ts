import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import {
  NEXT_ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type AdminOrder,
  type OrderStatus,
  type UpdateOrderStatusRequest,
} from '@store/shared';
import { NotFound } from '../not-found/not-found';
import { apiError } from '../shared/api-error';
import { Confirm } from '../shared/confirm-dialog';
import { PricePipe } from '../shared/price.pipe';
import { StatusChip } from '../shared/status-chip';

const ACTION_LABELS: Record<OrderStatus, string> = {
  placed: 'Mark as placed',
  shipped: 'Mark as shipped',
  delivered: 'Mark as delivered',
  cancelled: 'Cancel order',
};

@Component({
  selector: 'app-admin-order-page',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatProgressBarModule,
    NotFound,
    PricePipe,
    StatusChip,
  ],
  templateUrl: './admin-order-page.html',
  styleUrl: '../orders/order-page.scss',
})
export class AdminOrderPage {
  private readonly http = inject(HttpClient);
  private readonly confirm = inject(Confirm);
  private readonly snackBar = inject(MatSnackBar);

  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly order = httpResource<AdminOrder>(() => `/api/admin/orders/${encodeURIComponent(this.id())}`);
  protected readonly notFound = computed(() => {
    const error = this.order.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });
  /** Only the changes the lifecycle allows from the current status. */
  protected readonly actions = computed(() =>
    this.order.hasValue()
      ? NEXT_ORDER_STATUSES[this.order.value().status].map((status) => ({ status, label: ACTION_LABELS[status] }))
      : [],
  );
  protected readonly updating = signal(false);

  protected async setStatus(order: AdminOrder, status: OrderStatus): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: `${ACTION_LABELS[status]}?`,
      message: `Order #${order.number} will change from ${ORDER_STATUS_LABELS[order.status]} to ${ORDER_STATUS_LABELS[status]}. This can't be undone.`,
      confirmLabel: ACTION_LABELS[status],
      cancelLabel: 'Back',
    });
    if (!confirmed) return;

    this.updating.set(true);
    try {
      const body: UpdateOrderStatusRequest = { status };
      const updated = await firstValueFrom(this.http.patch<AdminOrder>(`/api/admin/orders/${order.id}/status`, body));
      this.order.set(updated);
      this.snackBar.open(`Order #${order.number} is now ${ORDER_STATUS_LABELS[status].toLowerCase()}`, undefined, {
        duration: 4000,
      });
    } catch (err) {
      this.snackBar.open(apiError(err)?.message ?? "Couldn't update the order", undefined, { duration: 5000 });
      this.order.reload();
    } finally {
      this.updating.set(false);
    }
  }
}
