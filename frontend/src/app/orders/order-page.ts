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
import type { Order } from '@store/shared';
import { NotFound } from '../not-found/not-found';
import { apiError } from '../shared/api-error';
import { Confirm } from '../shared/confirm-dialog';
import { PricePipe } from '../shared/price.pipe';
import { StatusChip } from '../shared/status-chip';

@Component({
  selector: 'app-order-page',
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
  templateUrl: './order-page.html',
  styleUrl: './order-page.scss',
})
export class OrderPage {
  private readonly http = inject(HttpClient);
  private readonly confirm = inject(Confirm);
  private readonly snackBar = inject(MatSnackBar);

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
      title: 'Cancel this order?',
      message: `Order #${order.number} will be cancelled. This can't be undone.`,
      confirmLabel: 'Cancel order',
      cancelLabel: 'Keep order',
    });
    if (!confirmed) return;

    this.cancelling.set(true);
    try {
      const updated = await firstValueFrom(this.http.post<Order>(`/api/orders/${order.id}/cancel`, {}));
      this.order.set(updated);
      this.snackBar.open(`Order #${order.number} was cancelled`, undefined, { duration: 4000 });
    } catch (err) {
      this.snackBar.open(apiError(err)?.message ?? "Couldn't cancel the order", undefined, { duration: 5000 });
      this.order.reload();
    } finally {
      this.cancelling.set(false);
    }
  }
}
