import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@store/shared';

const STEPS = ['placed', 'shipped', 'delivered'] as const satisfies readonly OrderStatus[];

/** Where an order is in its lifecycle: placed → shipped → delivered, or a note that it was cancelled. */
@Component({
  selector: 'app-order-progress',
  imports: [MatIconModule],
  template: `
    @if (status() === 'cancelled') {
      <p class="flex items-center gap-3 rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
        <mat-icon class="icon-20 !text-zinc-500">block</mat-icon>
        This order was cancelled.
      </p>
    } @else {
      <ol class="flex items-center" aria-label="Order progress">
        @for (step of steps; track step; let i = $index, last = $last) {
          @let done = i <= reached();
          <li class="flex items-center gap-2" [class.flex-1]="!last" [attr.aria-current]="i === reached() ? 'step' : null">
            <span
              class="grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold"
              [class]="done ? 'bg-accent-600 text-white' : 'bg-zinc-100 text-zinc-500'"
            >
              @if (done) {
                <mat-icon class="icon-16">check</mat-icon>
              } @else {
                {{ i + 1 }}
              }
            </span>
            <span class="text-sm font-medium" [class]="done ? 'text-zinc-900' : 'text-zinc-500'">
              {{ labels[step] }}
            </span>
            @if (!last) {
              <span
                class="mx-3 h-0.5 flex-1 rounded-full"
                [class]="i < reached() ? 'bg-accent-600' : 'bg-zinc-200'"
                aria-hidden="true"
              ></span>
            }
          </li>
        }
      </ol>
    }
  `,
})
export class OrderProgress {
  readonly status = input.required<OrderStatus>();

  protected readonly steps = STEPS;
  protected readonly labels = ORDER_STATUS_LABELS;
  protected readonly reached = computed(() => STEPS.indexOf(this.status() as (typeof STEPS)[number]));
}
