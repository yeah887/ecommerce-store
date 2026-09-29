import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { Product } from '@store/shared';
import { AddToCart } from '../cart/add-to-cart';
import { I18n } from '../i18n/i18n';
import { NotFound } from '../not-found/not-found';
import { QuantityPicker } from '../shared/quantity-picker';
import { PricePipe } from '../shared/price.pipe';
import { ProductGallery } from './product-gallery';
import { CategoryPipe, TranslatePipe } from '../i18n/translate.pipe';

@Component({
  selector: 'app-product-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    NotFound,
    PricePipe,
    ProductGallery,
    QuantityPicker,
    CategoryPipe,
    TranslatePipe,
  ],
  templateUrl: './product-page.html',
})
export class ProductPage {
  /** Bound from the `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly product = httpResource<Product>(() => `/api/products/${encodeURIComponent(this.id())}`);
  protected readonly notFound = computed(() => {
    const error = this.product.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });

  protected readonly addToCart = inject(AddToCart);
  private readonly i18n = inject(I18n);
  protected readonly quantity = signal(1);

  constructor() {
    const title = inject(Title);
    effect(() => {
      if (this.product.hasValue()) title.setTitle(`${this.product.value().name} · Store`);
      else if (this.notFound()) title.setTitle(`${this.i18n.t('product.notFoundTitle')} · Store`);
    });
    // A new product starts again at quantity 1.
    effect(() => {
      this.id();
      this.quantity.set(1);
    });
  }
}
