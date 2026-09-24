import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAX_QUANTITY } from '@store/shared';

/** A − / number / + control for quantities from 1 to MAX_QUANTITY. Typed values are clamped. */
@Component({
  selector: 'app-quantity-picker',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="picker" role="group" [attr.aria-label]="label()">
      <button
        matIconButton
        type="button"
        aria-label="Decrease quantity"
        [disabled]="value() <= 1"
        (click)="emit(value() - 1)"
      >
        <mat-icon>remove</mat-icon>
      </button>
      <input
        type="number"
        min="1"
        [max]="max"
        [attr.aria-label]="label()"
        [value]="value()"
        (change)="onTyped($event)"
      />
      <button
        matIconButton
        type="button"
        aria-label="Increase quantity"
        [disabled]="value() >= max"
        (click)="emit(value() + 1)"
      >
        <mat-icon>add</mat-icon>
      </button>
    </div>
  `,
  styles: `
    .picker {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 24px;
    }
    input {
      width: 3em;
      border: none;
      background: transparent;
      color: inherit;
      font: var(--mat-sys-title-medium);
      text-align: center;
      -moz-appearance: textfield;
      &::-webkit-inner-spin-button,
      &::-webkit-outer-spin-button {
        -webkit-appearance: none;
      }
    }
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
