import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CATEGORY_LABELS, type Product } from '@store/shared';
import { PricePipe } from '../shared/price.pipe';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, MatIconModule, PricePipe],
  host: { class: 'block h-full' },
  template: `
    <div class="group flex h-full flex-col">
      <a class="flex flex-1 flex-col rounded-2xl" [routerLink]="['/products', product().id]">
        <div class="aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100">
          <img
            class="size-full object-cover transition duration-500 ease-out group-hover:scale-105"
            [src]="product().imageUrl"
            [alt]="product().name"
            loading="lazy"
          />
        </div>
        <p class="eyebrow mt-4">{{ categoryLabels[product().category] }}</p>
        <h3 class="mt-1 line-clamp-2 font-medium text-zinc-900 group-hover:text-accent-700">
          {{ product().name }}
        </h3>
      </a>
      <div class="mt-3 flex items-center justify-between gap-2">
        <span class="font-semibold text-zinc-900 tabular-nums">{{ product().priceCents | price }}</span>
        <button
          type="button"
          class="grid size-9 place-items-center rounded-full border border-zinc-200 text-zinc-700 transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
          [attr.aria-label]="'Add ' + product().name + ' to cart'"
          (click)="addToCart.emit()"
        >
          <mat-icon class="icon-18">add_shopping_cart</mat-icon>
        </button>
      </div>
    </div>
  `,
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly addToCart = output<void>();
  protected readonly categoryLabels = CATEGORY_LABELS;
}
