import { Injectable, effect, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { I18n } from './i18n';

/**
 * Material paginator labels in the current language. Provided by each page with a paginator
 * (`providers: [translatedPaginator]`), so the paginator stays out of the initial bundle.
 */
@Injectable()
export class TranslatedPaginatorIntl extends MatPaginatorIntl {
  private readonly i18n = inject(I18n);

  constructor() {
    super();
    effect(() => {
      this.itemsPerPageLabel = this.i18n.t('paginator.itemsPerPage');
      this.nextPageLabel = this.i18n.t('paginator.next');
      this.previousPageLabel = this.i18n.t('paginator.previous');
      this.firstPageLabel = this.i18n.t('paginator.first');
      this.lastPageLabel = this.i18n.t('paginator.last');
      this.changes.next();
    });
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) return this.i18n.t('paginator.rangeEmpty', { total: length });
    const start = page * pageSize + 1;
    const end = Math.min(start + pageSize - 1, length);
    return this.i18n.t('paginator.range', { start, end, total: length });
  };
}

export const translatedPaginator = { provide: MatPaginatorIntl, useClass: TranslatedPaginatorIntl };
