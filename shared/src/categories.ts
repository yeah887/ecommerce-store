/** The fixed product categories. Categories are not admin-managed in v1. */
export const CATEGORIES = ['electronics', 'books', 'clothing', 'home', 'sports'] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  electronics: 'Electronics',
  books: 'Books',
  clothing: 'Clothing',
  home: 'Home & Kitchen',
  sports: 'Sports & Outdoors',
};

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

/** An entry in `GET /api/categories`. */
export interface CategoryInfo {
  id: Category;
  label: string;
}
