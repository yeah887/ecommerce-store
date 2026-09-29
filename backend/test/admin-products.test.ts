import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Product } from '@store/shared';
import { productModel } from '../src/models/product.js';
import { TEST_ADMIN, useTestApp } from './test-app.js';

const lamp = {
  name: 'Desk Lamp',
  description: 'A warm desk lamp',
  priceCents: 3450,
  category: 'home',
  images: ['https://example.com/lamp.jpg'],
};

describe('admin product management', () => {
  const ctx = useTestApp({ admin: TEST_ADMIN });
  let admin: request.Agent;
  let customer: request.Agent;
  let existingId: string;

  beforeAll(async () => {
    admin = request.agent(ctx.app);
    expect((await admin.post('/api/auth/login').send(TEST_ADMIN)).status).toBe(200);
    customer = request.agent(ctx.app);
    await customer.post('/api/auth/register').send({ name: 'C', email: 'c@example.com', password: 'customer-pw' });
    const [p] = await productModel(ctx.db).insertMany([{ ...lamp, name: 'Existing' }]);
    existingId = String(p._id);
  });

  describe('access', () => {
    const endpoints = () =>
      [
        ['post', '/api/admin/products'],
        ['put', `/api/admin/products/${existingId}`],
        ['delete', `/api/admin/products/${existingId}`],
        ['get', '/api/admin/anything-else'],
      ] as const;

    it('rejects anonymous users with 401 on every admin endpoint', async () => {
      for (const [method, path] of endpoints()) {
        const res = await request(ctx.app)[method](path).send(lamp);
        expect(res.status, `${method} ${path}`).toBe(401);
      }
    });

    it('rejects customers with 403 on every admin endpoint', async () => {
      for (const [method, path] of endpoints()) {
        const res = await customer[method](path).send(lamp);
        expect(res.status, `${method} ${path}`).toBe(403);
        expect(res.body.error.code).toBe('forbidden');
      }
      // Nothing changed.
      expect((await request(ctx.app).get(`/api/products/${existingId}`)).body.name).toBe('Existing');
    });
  });

  it('creates a product that then appears in the catalog', async () => {
    const res = await admin.post('/api/admin/products').send({ ...lamp, name: '  Desk Lamp  ' });

    expect(res.status).toBe(201);
    const created = res.body as Product;
    expect(created).toMatchObject({ ...lamp, id: expect.any(String) });

    const listed = await request(ctx.app).get('/api/products').query({ q: 'lamp' });
    expect(listed.body.items.map((p: Product) => p.id)).toContain(created.id);
  });

  it('keeps up to 15 images in order, with the first as the cover', async () => {
    const images = Array.from({ length: 15 }, (_, i) => `https://example.com/${i}.jpg`);

    const res = await admin.post('/api/admin/products').send({ ...lamp, name: 'Gallery', images });

    expect(res.status).toBe(201);
    expect(res.body.images).toEqual(images);
    expect(res.body.imageUrl).toBe(images[0]);
    expect((await request(ctx.app).get(`/api/products/${res.body.id}`)).body.images).toEqual(images);
  });

  it('updates a product', async () => {
    const res = await admin
      .put(`/api/admin/products/${existingId}`)
      .send({ ...lamp, name: 'Renamed', priceCents: 999, category: 'books' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: existingId, name: 'Renamed', priceCents: 999, category: 'books' });
    expect((await request(ctx.app).get(`/api/products/${existingId}`)).body.name).toBe('Renamed');
  });

  it('ignores fields that are not part of a product', async () => {
    const res = await admin.post('/api/admin/products').send({ ...lamp, name: 'Extra', createdAt: '1999-01-01', _id: 'x' });

    expect(res.status).toBe(201);
    expect(res.body.createdAt).not.toContain('1999');
  });

  it('deletes a product', async () => {
    const created = (await admin.post('/api/admin/products').send({ ...lamp, name: 'Doomed' })).body as Product;

    const res = await admin.delete(`/api/admin/products/${created.id}`);

    expect(res.status).toBe(204);
    expect((await request(ctx.app).get(`/api/products/${created.id}`)).status).toBe(404);
  });

  it.each([
    ['put', 'unknown'],
    ['put', 'malformed'],
    ['delete', 'unknown'],
    ['delete', 'malformed'],
  ] as const)('%s returns 404 for a %s id', async (method, kind) => {
    const id = kind === 'unknown' ? '64b7f0000000000000000000' : 'nope';

    const res = await admin[method](`/api/admin/products/${id}`).send(lamp);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('product_not_found');
  });

  it.each([
    [{ name: '' }, 'name'],
    [{ name: 'x'.repeat(121) }, 'name'],
    [{ description: '   ' }, 'description'],
    [{ priceCents: 0 }, 'priceCents'],
    [{ priceCents: 12.5 }, 'priceCents'],
    [{ priceCents: '1000' }, 'priceCents'],
    [{ priceCents: 10_000_001 }, 'priceCents'],
    [{ category: 'weapons' }, 'category'],
    [{ images: ['not a url'] }, 'images'],
    [{ images: ['javascript:alert(1)'] }, 'images'],
    [{ images: ['/api/images/not-an-id'] }, 'images'],
    [{ images: [] }, 'images'],
    [{ images: 'https://example.com/a.jpg' }, 'images'],
    [{ images: ['https://example.com/a.jpg', 42] }, 'images'],
    [{ images: ['https://example.com/a.jpg', 'https://example.com/a.jpg'] }, 'images'],
    [{ images: Array.from({ length: 16 }, (_, i) => `https://example.com/${i}.jpg`) }, 'images'],
  ])('rejects invalid input %o', async (change, field) => {
    const create = await admin.post('/api/admin/products').send({ ...lamp, ...change });
    const update = await admin.put(`/api/admin/products/${existingId}`).send({ ...lamp, ...change });

    for (const res of [create, update]) {
      expect(res.status).toBe(400);
      expect(res.body.error.fields).toHaveProperty(field);
    }
  });

  it('keeps past orders intact when a product is edited or deleted', async () => {
    const product = (await admin.post('/api/admin/products').send({ ...lamp, name: 'Ordered Lamp' })).body as Product;
    const order = (
      await customer.post('/api/orders').send({
        lines: [{ productId: product.id, quantity: 2 }],
        shippingAddress: { name: 'C', street: 'S', postalCode: '1', city: 'C', country: 'D' },
      })
    ).body;

    await admin.put(`/api/admin/products/${product.id}`).send({ ...lamp, name: 'Changed', priceCents: 1 });
    await admin.delete(`/api/admin/products/${product.id}`);

    const after = await customer.get(`/api/orders/${order.id}`);
    expect(after.status).toBe(200);
    expect(after.body.lines[0]).toMatchObject({ name: 'Ordered Lamp', unitPriceCents: 3450, quantity: 2 });
    expect(after.body.totalCents).toBe(6900);
  });
});
