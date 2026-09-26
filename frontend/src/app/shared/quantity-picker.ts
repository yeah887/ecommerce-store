import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MAX_QUANTITY } from '@store/shared';

/** A − / number / + control for quantities from 1 to MAX_QUANTITY. Typed values are clamped. */
@Component({
  selector: 'app-quantity-picker',
  imports: [MatIconModule],
  template: `
    <div
      class="inline-flex h-11 items-center rounded-xl border border-zinc-300 bg-white"
      role="group"
      [attr.aria-label]="label()"
    >
      <button
        type="button"
        class="grid h-full w-10 place-items-center rounded-l-xl text-zinc-600 hover:bg-zinc-50 disabled:text-zinc-300 disabled:hover:bg-transparent"
        aria-label="Decrease quantity"
        [disabled]="value() <= 1"
        (click)="emit(value() - 1)"
      >
        <mat-icon class="icon-18">remove</mat-icon>
      </button>
      <input
        type="number"
        min="1"
        class="w-10 bg-transparent text-center font-medium tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        [max]="max"
        [attr.aria-label]="label()"
        [value]="value()"
        (change)="onTyped($event)"
      />
      <button
        type="button"
        class="grid h-full w-10 place-items-center rounded-r-xl text-zinc-600 hover:bg-zinc-50 disabled:text-zinc-300 disabled:hover:bg-transparent"
        aria-label="Increase quantity"
        [disabled]="value() >= max"
        (click)="emit(value() + 1)"
      >
        <mat-icon class="icon-18">add</mat-icon>
      </button>
    </div>
  `,
})
export class QuantityPicker {
  readonly value = input.required<number>();
  readonly label = input('Quantity');
  readonly valueChange = output<number>();

  protected readonly max = MAX_QUANTITY;

  protected emit(value: number): void {
    const whole = Number.isFinite(value) ? Math.floor(value) : 1;
    this.valueChange.emit(Math.min(MAX_QUANTITY, Math.max(1, whole)));
  }

  protected onTyped(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.emit(input.valueAsNumber);
    // If the clamped value equals the current one, no change reaches the input, so reset it here.
    input.value = String(this.value());
  }
}
