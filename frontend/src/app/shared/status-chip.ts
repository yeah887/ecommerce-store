import { Component, input } from '@angular/core';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@store/shared';

@Component({
  selector: 'app-status-chip',
  template: `<span class="chip" [class]="status()">{{ labels[status()] }}</span>`,
  styles: `
    .chip {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font: var(--mat-sys-label-medium);
      white-space: nowrap;
    }
    .placed {
      background: #e3f2fd;
      color: #0d47a1;
    }
    .shipped {
      background: #fff3e0;
      color: #8a4b00;
    }
    .delivered {
      background: #e8f5e9;
      color: #1b5e20;
    }
    .cancelled {
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class StatusChip {
  readonly status = input.required<OrderStatus>();
  protected readonly labels = ORDER_STATUS_LABELS;
}
