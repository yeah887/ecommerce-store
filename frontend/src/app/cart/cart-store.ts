import { Injectable, computed, signal } from '@angular/core';
import { MAX_QUANTITY, type Product } from '@store/shared';

/**
 * One line in the cart. Name, price and image are a snapshot for display only;
 * the server recalculates prices from the database at checkout.
 */
export interface CartLine {
  productId: string;
  name: string;
  priceCents: number;
  imageUrl: string;
  quantity: number;
}

export type CartProduct = Pick<Product, 'id' | 'name' | 'priceCents' | 'imageUrl'>;

export const CART_STORAGE_KEY = 'store.cart.v1';

/** The shopping cart, kept in signals and persisted to localStorage. */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly state = signal<CartLine[]>(readStoredLines());

  readonly lines = this.state.asReadonly();
  readonly count = computed(() => this.state().reduce((sum, line) => sum + line.quantity, 0));
  readonly subtotalCents = computed(() =>
    this.state().reduce((sum, line) => sum + line.priceCents * line.quantity, 0),
  );
  readonly isEmpty = computed(() => this.state().length === 0);

  constructor() {
    // Keep several open tabs in step.
    globalThis.addEventListener?.('storage', (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) this.state.set(readStoredLines());
    });
  }

  /** Adds units of a product, merging into its existing line and refreshing the snapshot. */
  add(product: CartProduct, quantity = 1): void {
    const units = normalizeQuantity(quantity);
    if (units === 0) return;

    const lines = this.state();
    const existing = lines.find((line) => line.productId === product.id);
    const line: CartLine = {
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      imageUrl: product.imageUrl,
      quantity: Math.min(MAX_QUANTITY, (existing?.quantity ?? 0) + units),
    };
    this.commit(
      existing ? lines.map((l) => (l.productId === product.id ? line : l)) : [...lines, line],
    );
  }

  /** Sets a line's quantity, capped at MAX_QUANTITY. Zero or less removes the line. */
  setQuantity(productId: string, quantity: number): void {
    const units = normalizeQuantity(quantity);
    if (units === 0) {
      this.remove(productId);
      return;
    }
    this.commit(
      this.state().map((line) =>
        line.productId === productId ? { ...line, quantity: Math.min(MAX_QUANTITY, units) } : line,
      ),
    );
  }

  remove(productId: string): void {
    this.commit(this.state().filter((line) => line.productId !== productId));
  }

  clear(): void {
    this.commit([]);
  }

  private commit(lines: CartLine[]): void {
    this.state.set(lines);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage full or unavailable (e.g. private mode): the cart still works for this page.
    }
  }
}

function normalizeQuantity(quantity: number): number {
  return Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
}

/** Reads the stored cart, dropping anything malformed rather than failing. */
function readStoredLines(): CartLine[] {
  let raw: unknown;
  try {
    raw = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  const lines: CartLine[] = [];
  for (const item of raw) {
    if (isCartLine(item) && !lines.some((l) => l.productId === item.productId)) {
      lines.push({ ...item, quantity: Math.min(MAX_QUANTITY, Math.floor(item.quantity)) });
    }
  }
  return lines;
}

function isCartLine(value: unknown): value is CartLine {
  const v = value as Partial<CartLine> | null;
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof v.productId === 'string' &&
    typeof v.name === 'string' &&
    typeof v.imageUrl === 'string' &&
    Number.isInteger(v.priceCents) &&
    typeof v.quantity === 'number' &&
    v.quantity >= 1
  );
}
