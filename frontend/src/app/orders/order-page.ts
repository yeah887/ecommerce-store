import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import type { Order } from '@store/shared';
import { NotFound } from '../not-found/not-found';
import { I18n } from '../i18n/i18n';
import { Confirm } from '../shared/confirm-dialog';
import { PricePipe } from '../shared/price.pipe';
import { OrderProgress } from '../shared/order-progress';
import { StatusChip } from '../shared/status-chip';
import { LocalDatePipe, TranslatePipe } from '../i18n/translate.pipe';

@Component({
  selector: 'app-order-page',
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
    TranslatePipe,
  ],
  templateUrl: './order-page.html',
})
export class OrderPage {
  private readonly http = inject(HttpClient);
  private readonly confirm = inject(Confirm);
  private readonly snackBar = inject(MatSnackBar);
  private readonly i18n = inject(I18n);

  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly order = httpResource<Order>(() => `/api/orders/${encodeURIComponent(this.id())}`);
  protected readonly notFound = computed(() => {
    const error = this.order.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });
  protected readonly cancelling = signal(false);

  protected async cancel(order: Order): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: this.i18n.t('order.cancelTitle'),
      message: this.i18n.t('order.cancelMessage', { number: order.number }),
      confirmLabel: this.i18n.t('order.cancel'),
      cancelLabel: this.i18n.t('order.keep'),
    });
    if (!confirmed) return;

    this.cancelling.set(true);
    try {
      const updated = await firstValueFrom(this.http.post<Order>(`/api/orders/${order.id}/cancel`, {}));
      this.order.set(updated);
      this.snackBar.open(this.i18n.t('order.cancelled', { number: order.number }), undefined, { duration: 4000 });
    } catch (err) {
      this.snackBar.open(this.i18n.errorMessage(err, 'order.cancelFailed'), undefined, { duration: 5000 });
      this.order.reload();
    } finally {
      this.cancelling.set(false);
    }
  }
}
