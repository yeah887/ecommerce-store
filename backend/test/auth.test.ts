import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { TEST_ADMIN, useTestApp } from './test-app.js';

const alice = { name: 'Alice Example', email: 'alice@example.com', password: 'correct horse' };

describe('auth', () => {
  const ctx = useTestApp({ admin: TEST_ADMIN });

  /** A cookie-keeping client, like one browser. */
  const browser = () => request.agent(ctx.app);

  describe('register', () => {
    it('creates a customer, logs them in and never returns the password hash', async () => {
      const client = browser();

      const res = await client.post('/api/auth/register').send(alice);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        name: 'Alice Example',
        email: 'alice@example.com',
        role: 'customer',
      });

      const me = await client.get('/api/auth/me');
      expect(me.status).toBe(200);
      expect(me.body).toEqual(res.body);
      expect(JSON.stringify(me.body)).not.toContain('password');
    });

    it('normalizes the email and name', async () => {
      const res = await browser()
        .post('/api/auth/register')
        .send({ name: '  Bob  ', email: '  Bob@Example.COM ', password: 'bob-password' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Bob', email: 'bob@example.com' });
    });

    it('rejects an email that is already registered, regardless of case', async () => {
      const res = await browser()
        .post('/api/auth/register')
        .send({ ...alice, email: 'ALICE@example.com' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({ code: 'email_taken', fields: { email: expect.any(String) } });
    });

    it.each([
      [{ ...alice, email: 'new1@example.com', name: '' }, 'name'],
      [{ ...alice, email: 'new2@example.com', name: 'x'.repeat(101) }, 'name'],
      [{ ...alice, email: 'not-an-email' }, 'email'],
      [{ ...alice, email: undefined }, 'email'],
      [{ ...alice, email: 'new3@example.com', password: 'short' }, 'password'],
      [{ ...alice, email: 'new4@example.com', password: 'x'.repeat(73) }, 'password'],
      [{ ...alice, email: 'new5@example.com', password: 12345678 }, 'password'],
    ])('rejects invalid input %#', async (body, field) => {
      const res = await browser().post('/api/auth/register').send(body);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('validation_failed');
      expect(res.body.error.fields).toHaveProperty(field);
    });

    it('cannot be used to create an admin', async () => {
      const res = await browser()
        .post('/api/auth/register')
        .send({ name: 'Mallory', email: 'mallory@example.com', password: 'mallory-pw', role: 'admin' });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('customer');
    });
  });

  describe('login', () => {
    it('logs in with the right password, ignoring email case', async () => {
      const client = browser();

      const res = await client.post('/api/auth/login').send({ email: 'Alice@Example.com', password: alice.password });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ email: 'alice@example.com', role: 'customer' });
      expect((await client.get('/api/auth/me')).status).toBe(200);
    });

    it('sets an httpOnly, SameSite=Lax session cookie', async () => {
      const res = await browser().post('/api/auth/login').send({ email: alice.email, password: alice.password });

      const cookie = String(res.headers['set-cookie']);
      expect(cookie).toMatch(/^sid=/);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
    });

    it('gives the same generic 401 for a wrong password and an unknown email', async () => {
      const wrongPassword = await browser().post('/api/auth/login').send({ email: alice.email, password: 'nope-nope' });
      const unknownEmail = await browser()
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'nope-nope' });

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body).toEqual({
        error: { code: 'invalid_credentials', message: 'Invalid email or password' },
      });
      expect(unknownEmail.body).toEqual(wrongPassword.body);
    });

    it('rejects missing fields with 400', async () => {
      const res = await browser().post('/api/auth/login').send({ email: alice.email });

      expect(res.status).toBe(400);
      expect(res.body.error.fields).toHaveProperty('password');
    });

    it('replaces the session ID on login', async () => {
      const client = browser();
      await client.post('/api/auth/login').send({ email: alice.email, password: alice.password });
      const first = (await client.post('/api/auth/logout')).headers;
      void first;

      const a = await client.post('/api/auth/login').send({ email: alice.email, password: alice.password });
      const b = await client.post('/api/auth/login').send({ email: alice.email, password: alice.password });

      const sid = (res: request.Response) => String(res.headers['set-cookie']).split(';')[0];
      expect(sid(a)).not.toBe(sid(b));
    });
  });

  describe('me and logout', () => {
    it('returns 401 when not logged in', async () => {
      const res = await browser().get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('not_authenticated');
    });

    it('logs out and ends the session on the server', async () => {
      const client = browser();
      const login = await client.post('/api/auth/login').send({ email: alice.email, password: alice.password });
      const stolenCookie = String(login.headers['set-cookie']).split(';')[0];

      const logout = await client.post('/api/auth/logout');
      expect(logout.status).toBe(204);
      expect((await client.get('/api/auth/me')).status).toBe(401);

      // The old session cookie is useless even if someone kept a copy.
      const replay = await request(ctx.app).get('/api/auth/me').set('Cookie', stolenCookie);
      expect(replay.status).toBe(401);
    });

    it('logs out sessions of users who no longer exist', async () => {
      const client = browser();
      await client.post('/api/auth/register').send({ name: 'Temp', email: 'temp@example.com', password: 'temp-password' });
      await ctx.db.collection('users').deleteOne({ email: 'temp@example.com' });

      expect((await client.get('/api/auth/me')).status).toBe(401);
    });
  });

  describe('admin account', () => {
    it('is seeded from the configured credentials', async () => {
      const client = browser();

      const res = await client.post('/api/auth/login').send(TEST_ADMIN);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ email: TEST_ADMIN.email, role: 'admin' });
    });
  });
});
