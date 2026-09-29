import { formatDate } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';
import type { Category, OrderStatus } from '@store/shared';
import type { TranslationKey } from './en';
import { I18n, type PluralKey } from './i18n';

/** `{{ 'cart.title' | t }}` or `{{ 'cart.each' | t: { price } }}`. Impure so it follows language changes. */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(key: TranslationKey, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}

/** `{{ 'cart.subtotal' | tn: count }}` picks the plural form for `count`. */
@Pipe({ name: 'tn', pure: false })
export class TranslatePluralPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(key: PluralKey, count: number, params?: Record<string, string | number>): string {
    return this.i18n.tn(key, count, params);
  }
}

/** Dates in the current language: `{{ order.createdAt | localDate: 'medium' }}`. */
@Pipe({ name: 'localDate', pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(value: string | Date, format = 'mediumDate'): string {
    return formatDate(value, format, this.i18n.locale());
  }
}

/** `{{ product.category | category }}`: the category's name in the current language. */
@Pipe({ name: 'category', pure: false })
export class CategoryPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(category: Category): string {
    return this.i18n.t(`category.${category}`);
  }
}

/** `{{ order.status | orderStatus }}`: the status's name in the current language. */
@Pipe({ name: 'orderStatus', pure: false })
export class OrderStatusPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(status: OrderStatus): string {
    return this.i18n.t(`status.${status}`);
  }
}
