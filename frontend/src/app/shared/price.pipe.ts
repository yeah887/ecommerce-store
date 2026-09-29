import { formatCurrency } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { CURRENCY } from '@store/shared';
import { I18n } from '../i18n/i18n';

/** Formats an integer amount of cents in the store currency for the current language, e.g. 1299 → "€12.99" or "12,99 €". */
@Pipe({ name: 'price', pure: false })
export class PricePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(cents: number): string {
    return formatCurrency(cents / 100, this.i18n.locale(), '€', CURRENCY, '1.2-2');
  }
}
