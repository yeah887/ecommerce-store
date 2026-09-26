import { Component, input, output } from '@angular/core';

export interface FilterOption {
  /** '' stands for "no filter". */
  value: string;
  label: string;
}

/** A row of toggle buttons where exactly one option is active. */
@Component({
  selector: 'app-filter-pills',
  template: `
    <div class="flex flex-wrap gap-2" role="group" [attr.aria-label]="label()">
      @for (option of options(); track option.value) {
        @let active = option.value === value();
        <button
          type="button"
          class="rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
          [class]="
            active
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
          "
          [attr.aria-pressed]="active"
          (click)="valueChange.emit(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class FilterPills {
  readonly options = input.required<FilterOption[]>();
  readonly value = input.required<string>();
  readonly label = input.required<string>();
  readonly valueChange = output<string>();
}
