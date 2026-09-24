import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const base = { MONGO_URL: 'mongodb://localhost/test' };
const strongSecret = 'x'.repeat(32);

describe('loadConfig', () => {
  it('uses secure cookies by default in production', () => {
    const config = loadConfig({ ...base, NODE_ENV: 'production', SESSION_SECRET: strongSecret });

    expect(config.cookieSecure).toBe(true);
  });

  it('lets COOKIE_SECURE opt out, for a local stack served over plain HTTP', () => {
    const config = loadConfig({ ...base, NODE_ENV: 'production', SESSION_SECRET: strongSecret, COOKIE_SECURE: 'false' });

    expect(config.cookieSecure).toBe(false);
  });

  it.each([undefined, 'short', 'change-me-to-a-long-random-string'])(
    'refuses a missing, short or example session secret (%s) in production',
    (secret) => {
      expect(() => loadConfig({ ...base, NODE_ENV: 'production', SESSION_SECRET: secret })).toThrow(/SESSION_SECRET/);
    },
  );

  it('falls back to a development secret outside production', () => {
    const config = loadConfig({ ...base, NODE_ENV: 'development' });

    expect(config.sessionSecret).toBeTruthy();
    expect(config.cookieSecure).toBe(false);
  });

  it('reads the admin seed, requiring both email and password', () => {
    expect(loadConfig({ ...base, ADMIN_EMAIL: 'a@b.co', ADMIN_PASSWORD: 'long-enough' }).admin).toEqual({
      email: 'a@b.co',
      password: 'long-enough',
    });
    expect(loadConfig(base).admin).toBeUndefined();
    expect(() => loadConfig({ ...base, ADMIN_EMAIL: 'a@b.co' })).toThrow(/ADMIN_PASSWORD/);
    expect(() => loadConfig({ ...base, ADMIN_EMAIL: 'a@b.co', ADMIN_PASSWORD: 'short' })).toThrow(/8 characters/);
  });
});
