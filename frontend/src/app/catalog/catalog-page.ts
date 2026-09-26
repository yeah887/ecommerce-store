import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DEFAULT_PAGE_SIZE,
  isCategory,
  type Page,
  type Product,
} from '@store/shared';
import { AddToCart } from '../cart/add-to-cart';
import { FilterPills, type FilterOption } from '../shared/filter-pills';
import { ProductCard } from './product-card';

/** Product grid with search, category filter and pagination, all kept in the URL query. */
@Component({
  selector: 'app-catalog-page',
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    FilterPills,
    ProductCard,
  ],
  templateUrl: './catalog-page.html',
})
export class CatalogPage {
  private readonly router = inject(Router);
  protected readonly addToCart = inject(AddToCart);

  // Bound from the URL query params (?q=&category=&page=).
  readonly q = input<string>();
  readonly category = input<string>();
  readonly page = input<string>();

  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly categoryOptions: FilterOption[] = [
    { value: '', label: 'All' },
    ...CATEGORIES.map((category) => ({ value: category, label: CATEGORY_LABELS[category] })),
  ];
  protected readonly pageSize = DEFAULT_PAGE_SIZE;

  protected readonly searchText = linkedSignal(() => this.q() ?? '');
  protected readonly activeCategory = computed(() => {
    const category = this.category();
    return isCategory(category) ? category : undefined;
  });
  protected readonly pageNumber = computed(() => {
    const page = Number(this.page());
    return Number.isInteger(page) && page >= 1 ? page : 1;
  });

  protected readonly products = httpResource<Page<Product>>(() => {
    const params: Record<string, string | number> = {
      page: this.pageNumber(),
      pageSize: this.pageSize,
    };
    const q = this.q()?.trim();
    const category = this.activeCategory();
    if (q) params['q'] = q;
    if (category) params['category'] = category;
    return { url: '/api/products', params };
  });

  protected readonly emptyMessage = computed(() => {
    const q = this.q()?.trim();
    const category = this.activeCategory();
    let message = 'No products found';
    if (q) message += ` for “${q}”`;
    if (category) message += ` in ${this.categoryLabels[category]}`;
    return `${message}.`;
  });

  protected search(): void {
    this.updateQuery({ q: this.searchText().trim() || null, page: null });
  }

  protected clearSearch(): void {
    this.searchText.set('');
    this.updateQuery({ q: null, page: null });
  }

  protected showAll(): void {
    this.searchText.set('');
    this.updateQuery({ q: null, category: null, page: null });
  }

  protected selectCategory(category: string | undefined): void {
    this.updateQuery({ category: category ?? null, page: null });
  }

  protected changePage(event: PageEvent): void {
    this.updateQuery({ page: event.pageIndex === 0 ? null : event.pageIndex + 1 });
    window.scrollTo({ top: 0 });
  }

  protected updateQuery(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
  }
}
