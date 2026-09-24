import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { Page, Product } from '@store/shared';
import { prepareDatabase } from '../src/db/prepare.js';
import { productModel } from '../src/models/product.js';
import { TEST_ADMIN, useTestApp } from './test-app.js';

describe('seeding', () => {
  const ctx = useTestApp({ seed: true, admin: TEST_ADMIN });
  const prepareAgain = (admin = TEST_ADMIN) =>
    prepareDatabase(ctx.db, { seed: true, admin, bcryptRounds: ctx.config.bcryptRounds });

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

  it('does not duplicate products or the admin when run again', async () => {
    await prepareAgain();

    expect(await productCount()).toBe(20);
    expect(await ctx.db.collection('users').countDocuments({ email: TEST_ADMIN.email })).toBe(1);
  });

  it('does not overwrite an existing admin password', async () => {
    await prepareAgain({ email: TEST_ADMIN.email, password: 'a-different-password' });

    const res = await request(ctx.app).post('/api/auth/login').send(TEST_ADMIN);
    expect(res.status).toBe(200);
  });

  it('leaves a catalog alone once it has products', async () => {
    await productModel(ctx.db).deleteMany({ category: { $ne: 'books' } });
    const remaining = await productCount();

    await prepareAgain();

    expect(await productCount()).toBe(remaining);
  });
});
