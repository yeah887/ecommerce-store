import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { useTestApp } from './test-app.js';

describe('GET /api/health', () => {
  const ctx = useTestApp();

  it('reports ok when the database is reachable', async () => {
    const res = await request(ctx.app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'connected' });
  });

  it('reports degraded with 503 when the database is down', async () => {
    await ctx.db.close();

    const res = await request(ctx.app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'degraded', database: 'disconnected' });
  });
});

describe('unknown API routes', () => {
  const ctx = useTestApp();

  it('return 404 in the standard error shape', async () => {
    const res = await request(ctx.app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'not_found', message: 'No route for GET /api/nope' },
    });
  });

  it('return 400 for malformed JSON bodies', async () => {
    const res = await request(ctx.app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{bad json');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_json');
  });
});
