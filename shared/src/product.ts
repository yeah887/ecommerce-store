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
