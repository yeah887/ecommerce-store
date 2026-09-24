import { formatCurrency } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { CURRENCY } from '@store/shared';

/** Formats an integer amount of cents in the store currency, e.g. 1299 → "€12.99". */
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(cents: number): string {
    return formatCurrency(cents / 100, this.locale, '€', CURRENCY, '1.2-2');
  }
}
