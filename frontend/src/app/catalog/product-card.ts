import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CATEGORY_LABELS, type Product } from '@store/shared';
import { PricePipe } from '../shared/price.pipe';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, PricePipe],
  template: `
    <mat-card appearance="outlined" class="card">
      <a class="link" [routerLink]="['/products', product().id]">
        <img [src]="product().imageUrl" [alt]="product().name" loading="lazy" />
        <mat-card-content>
          <p class="category">{{ categoryLabels[product().category] }}</p>
          <h3 class="name">{{ product().name }}</h3>
        </mat-card-content>
      </a>
      <mat-card-actions class="actions">
        <span class="price">{{ product().priceCents | price }}</span>
        <button
          matIconButton
          type="button"
          [attr.aria-label]="'Add ' + product().name + ' to cart'"
          (click)="addToCart.emit()"
        >
          <mat-icon>add_shopping_cart</mat-icon>
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .card {
      height: 100%;
      overflow: hidden;
      transition: box-shadow 150ms;
      &:hover,
      &:focus-within {
        box-shadow: var(--mat-sys-level2);
      }
    }
    .link {
      flex: 1;
      color: inherit;
      text-decoration: none;
    }
    img {
      /* Material only sizes card images that are direct children of the card. */
      display: block;
      width: 100%;
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
      margin: 0;
      font: var(--mat-sys-title-medium);
    }
    .actions {
      justify-content: space-between;
      padding: 0 8px 8px 16px;
    }
    .price {
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-primary);
    }
  `,
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly addToCart = output<void>();
  protected readonly categoryLabels = CATEGORY_LABELS;
}
