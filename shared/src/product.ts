import type { Category } from './categories.js';

/** The store's single currency. All prices are integer cents in this currency. */
export const CURRENCY = 'EUR';

export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: Category;
  /** The cover image, the same as `images[0]`. */
  imageUrl: string;
  /** 1 to PRODUCT_LIMITS.maxImages images, cover first. */
  images: string[];
  createdAt: string;
  updatedAt: string;
}

/** Body of `POST /api/admin/products` and `PUT /api/admin/products/:id`. */
export interface ProductInput {
  name: string;
  description: string;
  priceCents: number;
  category: Category;
  /** Cover first. Each is an http(s) URL or an uploaded image's `/api/images/:id`. */
  images: string[];
}

export const PRODUCT_LIMITS = {
  nameMaxLength: 120,
  descriptionMaxLength: 2000,
  imageUrlMaxLength: 500,
  maxImages: 15,
  /** €100,000.00 */
  maxPriceCents: 10_000_000,
} as const;
