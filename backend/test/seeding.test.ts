import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { Page, Product } from '@store/shared';
import { prepareDatabase } from '../src/db/prepare.js';
import { productModel } from '../src/models/product.js';
import { useTestApp } from './test-app.js';

describe('seeding', () => {
  const ctx = useTestApp({ seed: true });

  const productCount = async () => {
    const res = await request(ctx.app).get('/api/products');
    return (res.body as Page<Product>).total;
  };

  it('seeds about 20 sample products spread over every category', async () => {
    expect(await productCount()).toBe(20);

    for (const category of ['electronics', 'books', 'clothing', 'home', 'sports']) {
      const res = await request(ctx.app).get('/api/products').query({ category });
      expect(res.body.total, category).toBeGreaterThan(0);
    }
  });

  it('does not duplicate products when run again', async () => {
    await prepareDatabase(ctx.db, { seed: true });

    expect(await productCount()).toBe(20);
  });

  it('leaves a catalog alone once it has products', async () => {
    await productModel(ctx.db).deleteMany({ category: { $ne: 'books' } });
    const remaining = await productCount();

    await prepareDatabase(ctx.db, { seed: true });

    expect(await productCount()).toBe(remaining);
  });
});
