import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { IMAGE_UPLOAD, type Product } from '@store/shared';
import { TEST_ADMIN, useTestApp } from './test-app.js';

// Smallest valid files: only the leading bytes matter for type detection.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
const GIF = Buffer.from('GIF89a\x01\x00\x01\x00', 'latin1');
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x1a, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

const lamp = { name: 'Desk Lamp', description: 'A warm desk lamp', priceCents: 3450, category: 'home' };

describe('image upload', () => {
  const ctx = useTestApp({ admin: TEST_ADMIN });
  let admin: request.Agent;
  let customer: request.Agent;

  beforeAll(async () => {
    admin = request.agent(ctx.app);
    expect((await admin.post('/api/auth/login').send(TEST_ADMIN)).status).toBe(200);
    customer = request.agent(ctx.app);
    await customer.post('/api/auth/register').send({ name: 'C', email: 'c@example.com', password: 'customer-pw' });
  });

  const upload = (agent: request.Agent | ReturnType<typeof request>, data: Buffer, type = 'image/png') =>
    agent.post('/api/admin/images').set('Content-Type', type).send(data);

  it('lets only admins upload', async () => {
    expect((await upload(request(ctx.app), PNG)).status).toBe(401);
    expect((await upload(customer, PNG)).status).toBe(403);
  });

  it.each([
    ['png', PNG, 'image/png'],
    ['jpeg', JPEG, 'image/jpeg'],
    ['gif', GIF, 'image/gif'],
    ['webp', WEBP, 'image/webp'],
  ])('stores a %s image and serves it back to anyone', async (_name, data, type) => {
    const res = await upload(admin, data, 'application/octet-stream');

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^\/api\/images\/[0-9a-f]{24}$/);

    const served = await request(ctx.app).get(res.body.url).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(served.status).toBe(200);
    // The type comes from the bytes, not from what the uploader claimed.
    expect(served.headers['content-type']).toBe(type);
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    expect(served.headers['cache-control']).toContain('immutable');
    expect(Buffer.compare(served.body as Buffer, data)).toBe(0);
  });

  it.each([
    ['SVG', SVG, 'image/svg+xml'],
    ['text claiming to be a PNG', Buffer.from('hello'), 'image/png'],
  ])('rejects %s with 415', async (_name, data, type) => {
    const res = await upload(admin, data, type);

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('unsupported_image_type');
  });

  it('rejects an empty body', async () => {
    const res = await admin.post('/api/admin/images').set('Content-Type', 'image/png');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('image_missing');
  });

  it('rejects files over the size limit with 413', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(IMAGE_UPLOAD.maxBytes)]);

    const res = await upload(admin, big);

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('payload_too_large');
  });

  it.each(['64b7f0000000000000000000', 'nope'])('returns 404 for unknown image %s', async (id) => {
    const res = await request(ctx.app).get(`/api/images/${id}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('image_not_found');
  });

  describe('as product images', () => {
    const uploadUrl = async (data = PNG) => (await upload(admin, data)).body.url as string;
    const status = async (url: string) => (await request(ctx.app).get(url)).status;

    it('accepts uploaded images and rejects a missing one', async () => {
      const [a, b] = [await uploadUrl(), await uploadUrl(JPEG)];

      const created = await admin.post('/api/admin/products').send({ ...lamp, images: [a, 'https://example.com/x.jpg', b] });
      expect(created.status).toBe(201);
      expect(created.body.images).toEqual([a, 'https://example.com/x.jpg', b]);

      const missing = await admin
        .post('/api/admin/products')
        .send({ ...lamp, images: [a, '/api/images/64b7f0000000000000000000'] });
      expect(missing.status).toBe(400);
      expect(missing.body.error.fields).toHaveProperty('images');
    });

    it.each(['/api/images/../health', '/api/images/zzz', '/etc/passwd'])('rejects the path %s', async (url) => {
      const res = await admin.post('/api/admin/products').send({ ...lamp, images: [url] });

      expect(res.status).toBe(400);
      expect(res.body.error.fields).toHaveProperty('images');
    });

    it('deletes only the uploaded images an update removes', async () => {
      const [kept, removed, added] = [await uploadUrl(), await uploadUrl(), await uploadUrl(JPEG)];
      const product = (await admin.post('/api/admin/products').send({ ...lamp, images: [kept, removed] })).body as Product;

      const res = await admin.put(`/api/admin/products/${product.id}`).send({ ...lamp, images: [added, kept] });

      expect(res.status).toBe(200);
      expect(res.body.images).toEqual([added, kept]);
      expect(res.body.imageUrl).toBe(added);
      expect(await status(removed)).toBe(404);
      expect(await status(kept)).toBe(200);
      expect(await status(added)).toBe(200);
    });

    it("deletes a product's uploaded images with it, unless another product still uses them", async () => {
      const [shared, own] = [await uploadUrl(), await uploadUrl()];
      const a = (await admin.post('/api/admin/products').send({ ...lamp, images: [shared, own] })).body as Product;
      const b = (await admin.post('/api/admin/products').send({ ...lamp, images: [shared] })).body as Product;

      await admin.delete(`/api/admin/products/${a.id}`);
      expect(await status(own)).toBe(404);
      expect(await status(shared)).toBe(200);

      await admin.delete(`/api/admin/products/${b.id}`);
      expect(await status(shared)).toBe(404);
    });
  });
});
