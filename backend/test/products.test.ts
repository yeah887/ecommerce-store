import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { MAX_PAGE_SIZE, type Page, type Product } from '@store/shared';
import { productModel } from '../src/models/product.js';
import { useTestApp } from './test-app.js';

const fixture = (name: string, category: string, description = `${name} description`) => ({
  name,
  description,
  priceCents: 1000,
  category,
  imageUrl: `https://example.com/${encodeURIComponent(name)}.jpg`,
});

describe('GET /api/products', () => {
  const ctx = useTestApp();

  beforeAll(async () => {
    await productModel(ctx.db).insertMany([
      fixture('Alpha Headphones', 'electronics', 'Wireless headphones with great sound'),
      fixture('Beta Speaker', 'electronics', 'A loud wireless speaker'),
      fixture('Gamma Novel', 'books', 'A thrilling story about wireless radio'),
      fixture('Delta Cookbook', 'books', 'Recipes for every day'),
      fixture('Epsilon Shirt', 'clothing', 'Cotton shirt'),
    ]);
  });

  const list = async (query: Record<string, string | number> = {}) => {
    const res = await request(ctx.app).get('/api/products').query(query);
    return { status: res.status, body: res.body as Page<Product> };
  };
  const names = (page: Page<Product>) => page.items.map((p) => p.name);

  it('lists all products alphabetically with page info', async () => {
    const { status, body } = await list();

    expect(status).toBe(200);
    expect(names(body)).toEqual([
      'Alpha Headphones',
      'Beta Speaker',
      'Delta Cookbook',
      'Epsilon Shirt',
      'Gamma Novel',
    ]);
    expect(body).toMatchObject({ total: 5, page: 1, pageSize: 12, totalPages: 1 });
  });

  it('returns products in the public shape', async () => {
    const { body } = await list({ q: 'cookbook' });

    expect(body.items[0]).toEqual({
      id: expect.any(String),
      name: 'Delta Cookbook',
      description: 'Recipes for every day',
      priceCents: 1000,
      category: 'books',
      imageUrl: 'https://example.com/Delta%20Cookbook.jpg',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('filters by category', async () => {
    const { body } = await list({ category: 'books' });

    expect(names(body)).toEqual(['Delta Cookbook', 'Gamma Novel']);
    expect(body.total).toBe(2);
  });

  it('searches words in name and description, name matches first', async () => {
    const { body } = await list({ q: 'headphones' });
    expect(names(body)).toEqual(['Alpha Headphones']);

    const wireless = await list({ q: 'wireless' });
    expect(names(wireless.body)).toHaveLength(3);
  });

  it('combines search and category', async () => {
    const { body } = await list({ q: 'wireless', category: 'books' });

    expect(names(body)).toEqual(['Gamma Novel']);
  });

  it('returns an empty page when nothing matches', async () => {
    const { status, body } = await list({ q: 'submarine' });

    expect(status).toBe(200);
    expect(body).toMatchObject({ items: [], total: 0, totalPages: 0 });
  });

  it('paginates', async () => {
    const first = await list({ pageSize: 2, page: 1 });
    const third = await list({ pageSize: 2, page: 3 });

    expect(names(first.body)).toEqual(['Alpha Headphones', 'Beta Speaker']);
    expect(names(third.body)).toEqual(['Gamma Novel']);
    expect(third.body).toMatchObject({ total: 5, page: 3, pageSize: 2, totalPages: 3 });
  });

  it('returns no items for pages past the end', async () => {
    const { status, body } = await list({ pageSize: 2, page: 9 });

    expect(status).toBe(200);
    expect(body).toMatchObject({ items: [], total: 5, page: 9, totalPages: 3 });
  });

  it('caps the page size', async () => {
    const { body } = await list({ pageSize: 1000 });

    expect(body.pageSize).toBe(MAX_PAGE_SIZE);
  });

  it.each([
    [{ page: 0 }, 'page'],
    [{ page: 'two' }, 'page'],
    [{ pageSize: -1 }, 'pageSize'],
    [{ category: 'weapons' }, 'category'],
    [{ q: 'x'.repeat(101) }, 'q'],
  ])('rejects invalid query %o', async (query, field) => {
    const res = await request(ctx.app).get('/api/products').query(query);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
    expect(res.body.error.fields).toHaveProperty(field);
  });

  it('rejects repeated parameters', async () => {
    const res = await request(ctx.app).get('/api/products?category=books&category=home');

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('category');
  });
});

describe('GET /api/categories', () => {
  const ctx = useTestApp();

  it('returns the fixed category list with labels', async () => {
    const res = await request(ctx.app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body).toContainEqual({ id: 'books', label: 'Books' });
    expect(res.body).toHaveLength(5);
  });
});
