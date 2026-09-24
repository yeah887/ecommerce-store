import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { CATEGORY_LABELS, type Product } from '@store/shared';
import { PricePipe } from '../shared/price.pipe';

@Component({
  selector: 'app-product-card',
  imports: [MatCardModule, PricePipe],
  template: `
    <mat-card appearance="outlined" class="card">
      <img mat-card-image [src]="product().imageUrl" [alt]="product().name" loading="lazy" />
      <mat-card-content>
        <p class="category">{{ categoryLabels[product().category] }}</p>
        <h3 class="name">{{ product().name }}</h3>
        <p class="price">{{ product().priceCents | price }}</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      border-radius: 12px;
      transition: box-shadow 150ms;
    }
    .card {
      height: 100%;
      overflow: hidden;
    }
    img {
      aspect-ratio: 3 / 2;
      object-fit: cover;
      background: var(--mat-sys-surface-container);
    }
    .category {
      margin: 12px 0 4px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-medium);
    }
    .name {
      margin: 0 0 8px;
      font: var(--mat-sys-title-medium);
    }
    .price {
      margin: 0;
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-primary);
    }
  `,
})
export class ProductCard {
  readonly product = input.required<Product>();
  protected readonly categoryLabels = CATEGORY_LABELS;
}
