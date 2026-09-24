import { TestBed } from '@angular/core/testing';
import { CART_STORAGE_KEY, CartStore, type CartProduct } from './cart-store';

const keyboard: CartProduct = { id: 'k1', name: 'Keyboard', priceCents: 8999, imageUrl: 'k.jpg' };
const mug: CartProduct = { id: 'm1', name: 'Mug', priceCents: 1250, imageUrl: 'm.jpg' };

/** A fresh store, as after a page load, reading whatever is in localStorage. */
function loadStore(): CartStore {
  TestBed.resetTestingModule();
  return TestBed.inject(CartStore);
}

describe('CartStore', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty', () => {
    const cart = loadStore();

    expect(cart.lines()).toEqual([]);
    expect(cart.isEmpty()).toBe(true);
    expect(cart.count()).toBe(0);
    expect(cart.subtotalCents()).toBe(0);
  });

  it('adds products with a snapshot of name, price and image', () => {
    const cart = loadStore();

    cart.add(keyboard);
    cart.add(mug, 3);

    expect(cart.lines()).toEqual([
      { productId: 'k1', name: 'Keyboard', priceCents: 8999, imageUrl: 'k.jpg', quantity: 1 },
      { productId: 'm1', name: 'Mug', priceCents: 1250, imageUrl: 'm.jpg', quantity: 3 },
    ]);
    expect(cart.count()).toBe(4);
    expect(cart.subtotalCents()).toBe(8999 + 3 * 1250);
    expect(cart.isEmpty()).toBe(false);
  });

  it('merges repeat adds into one line and refreshes the snapshot', () => {
    const cart = loadStore();

    cart.add(mug, 2);
    cart.add({ ...mug, priceCents: 1400 }, 1);

    expect(cart.lines()).toHaveLength(1);
    expect(cart.lines()[0]).toMatchObject({ quantity: 3, priceCents: 1400 });
  });

  it('caps quantities at 99', () => {
    const cart = loadStore();

    cart.add(mug, 60);
    cart.add(mug, 60);
    expect(cart.lines()[0].quantity).toBe(99);

    cart.setQuantity('m1', 500);
    expect(cart.lines()[0].quantity).toBe(99);
  });

  it('ignores adds of zero, negative or invalid quantities', () => {
    const cart = loadStore();

    cart.add(mug, 0);
    cart.add(mug, -2);
    cart.add(mug, Number.NaN);

    expect(cart.isEmpty()).toBe(true);
  });

  it('sets quantities, rounding down fractions', () => {
    const cart = loadStore();
    cart.add(mug);

    cart.setQuantity('m1', 4.7);

    expect(cart.lines()[0].quantity).toBe(4);
    expect(cart.count()).toBe(4);
  });

  it('removes a line when its quantity is set to zero or less', () => {
    const cart = loadStore();
    cart.add(mug);
    cart.add(keyboard);

    cart.setQuantity('m1', 0);
    cart.setQuantity('k1', -1);

    expect(cart.isEmpty()).toBe(true);
  });

  it('removes lines and clears the cart', () => {
    const cart = loadStore();
    cart.add(mug);
    cart.add(keyboard);

    cart.remove('m1');
    expect(cart.lines().map((l) => l.productId)).toEqual(['k1']);

    cart.clear();
    expect(cart.isEmpty()).toBe(true);
  });

  it('survives a reload', () => {
    const before = loadStore();
    before.add(mug, 2);
    before.add(keyboard);

    const after = loadStore();

    expect(after.lines()).toEqual(before.lines());
    expect(after.subtotalCents()).toBe(2 * 1250 + 8999);
  });

  it('persists removals and clearing too', () => {
    const cart = loadStore();
    cart.add(mug);
    cart.clear();

    expect(loadStore().isEmpty()).toBe(true);
  });

  it.each([
    ['invalid JSON', '{not json'],
    ['a non-array', '{"productId":"m1"}'],
    ['null', 'null'],
  ])('starts empty when storage holds %s', (_label, stored) => {
    localStorage.setItem(CART_STORAGE_KEY, stored);

    expect(loadStore().lines()).toEqual([]);
  });

  it('keeps valid stored lines and drops malformed or duplicate ones', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: 'm1', name: 'Mug', priceCents: 1250, imageUrl: 'm.jpg', quantity: 2 },
        { productId: 'x1', name: 'No price', imageUrl: 'x.jpg', quantity: 1 },
        { productId: 'x2', name: 'Zero', priceCents: 100, imageUrl: 'x.jpg', quantity: 0 },
        { productId: 'm1', name: 'Mug again', priceCents: 1250, imageUrl: 'm.jpg', quantity: 5 },
        'garbage',
      ]),
    );

    expect(loadStore().lines()).toEqual([
      { productId: 'm1', name: 'Mug', priceCents: 1250, imageUrl: 'm.jpg', quantity: 2 },
    ]);
  });
});
