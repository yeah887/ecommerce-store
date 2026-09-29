import { Component, input } from '@angular/core';
import type { OrderStatus } from '@store/shared';
import { OrderStatusPipe } from '../i18n/translate.pipe';

const STYLES: Record<OrderStatus, string> = {
  placed: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  shipped: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  cancelled: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
};

@Component({
  selector: 'app-status-chip',
  imports: [OrderStatusPipe],
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset"
      [class]="styles[status()]"
    >
      <span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
      {{ status() | orderStatus }}
    </span>
  `,
})
export class StatusChip {
  readonly status = input.required<OrderStatus>();
  protected readonly styles = STYLES;
}
