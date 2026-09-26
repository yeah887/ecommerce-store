import { Component, input } from '@angular/core';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@store/shared';

const STYLES: Record<OrderStatus, string> = {
  placed: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  shipped: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  cancelled: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
};

@Component({
  selector: 'app-status-chip',
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset"
      [class]="styles[status()]"
    >
      <span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
      {{ labels[status()] }}
    </span>
  `,
})
export class StatusChip {
  readonly status = input.required<OrderStatus>();
  protected readonly labels = ORDER_STATUS_LABELS;
  protected readonly styles = STYLES;
}
