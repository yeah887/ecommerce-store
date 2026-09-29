import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import {
  NEXT_ORDER_STATUSES,
  type AdminOrder,
  type OrderStatus,
  type UpdateOrderStatusRequest,
} from '@store/shared';
import { NotFound } from '../not-found/not-found';
import type { TranslationKey } from '../i18n/en';
import { I18n } from '../i18n/i18n';
import { Confirm } from '../shared/confirm-dialog';
import { PricePipe } from '../shared/price.pipe';
import { OrderProgress } from '../shared/order-progress';
import { StatusChip } from '../shared/status-chip';
import { LocalDatePipe, OrderStatusPipe, TranslatePipe } from '../i18n/translate.pipe';

const ACTION_LABELS: Record<OrderStatus, TranslationKey> = {
  placed: 'admin.markPlaced',
  shipped: 'admin.markShipped',
  delivered: 'admin.markDelivered',
  cancelled: 'admin.markCancelled',
};

@Component({
  selector: 'app-admin-order-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    NotFound,
    PricePipe,
    OrderProgress,
    StatusChip,
    LocalDatePipe,
    OrderStatusPipe,
    TranslatePipe,
  ],
  templateUrl: './admin-order-page.html',
})
export class AdminOrderPage {
  private readonly http = inject(HttpClient);
  private readonly confirm = inject(Confirm);
  private readonly snackBar = inject(MatSnackBar);
  private readonly i18n = inject(I18n);

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
      title: `${this.i18n.t(ACTION_LABELS[status])}?`,
      message: this.i18n.t('admin.statusMessage', {
        number: order.number,
        from: this.i18n.t(`status.${order.status}`),
        to: this.i18n.t(`status.${status}`),
      }),
      confirmLabel: this.i18n.t(ACTION_LABELS[status]),
      cancelLabel: this.i18n.t('admin.back'),
    });
    if (!confirmed) return;

    this.updating.set(true);
    try {
      const body: UpdateOrderStatusRequest = { status };
      const updated = await firstValueFrom(this.http.patch<AdminOrder>(`/api/admin/orders/${order.id}/status`, body));
      this.order.set(updated);
      const statusName = this.i18n.t(`status.${status}`).toLowerCase();
      this.snackBar.open(this.i18n.t('admin.statusChanged', { number: order.number, status: statusName }), undefined, {
        duration: 4000,
      });
    } catch (err) {
      this.snackBar.open(this.i18n.errorMessage(err, 'admin.updateFailed'), undefined, { duration: 5000 });
      this.order.reload();
    } finally {
      this.updating.set(false);
    }
  }
}
