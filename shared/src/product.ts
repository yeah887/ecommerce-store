import type { Category } from './categories.js';

/** The store's single currency. All prices are integer cents in this currency. */
export const CURRENCY = 'EUR';

export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: Category;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

/** Body of `POST /api/admin/products` and `PUT /api/admin/products/:id`. */
export interface ProductInput {
  name: string;
  description: string;
  priceCents: number;
  category: Category;
  imageUrl: string;
}

export const PRODUCT_LIMITS = {
  nameMaxLength: 120,
  descriptionMaxLength: 2000,
  imageUrlMaxLength: 500,
  /** €100,000.00 */
  maxPriceCents: 10_000_000,
} as const;
