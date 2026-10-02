export interface AdminSeed {
  email: string;
  password: string;
}

import type { PayPalConfig } from './paypal.js';

export interface Config {
  port: number;
  mongoUrl: string;
  production: boolean;
  sessionSecret: string;
  /** Only send the session cookie over HTTPS. Defaults to on in production. */
  cookieSecure: boolean;
  /** First admin account, created on startup if missing. */
  admin?: AdminSeed;
  bcryptRounds: number;
  /** Real payments through PayPal; without it, payments are simulated. */
  paypal?: PayPalConfig;
}

const DEV_SESSION_SECRET = 'dev-only-insecure-session-secret';
const EXAMPLE_SESSION_SECRET = 'change-me-to-a-long-random-string';

/** Reads configuration from environment variables, failing fast on anything required but missing. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';

  const mongoUrl = env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error('MONGO_URL is required');
  }

  let sessionSecret = env.SESSION_SECRET ?? '';
  if (production && (sessionSecret.length < 32 || sessionSecret === EXAMPLE_SESSION_SECRET)) {
    throw new Error(
      'SESSION_SECRET must be set to a random string of at least 32 characters in production (see .env.example)',
    );
  }
  if (!sessionSecret) {
    console.warn('SESSION_SECRET is not set; using an insecure development secret');
    sessionSecret = DEV_SESSION_SECRET;
  }

  return {
    port: Number(env.API_PORT ?? 3000),
    mongoUrl,
    production,
    sessionSecret,
    cookieSecure: parseBoolean(env.COOKIE_SECURE, 'COOKIE_SECURE') ?? production,
    admin: adminSeed(env),
    bcryptRounds: 12,
    paypal: paypalConfig(env),
  };
}

function paypalConfig(env: NodeJS.ProcessEnv): PayPalConfig | undefined {
  const clientId = env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId && !clientSecret) return undefined;
  if (!clientId || !clientSecret) {
    throw new Error('Set both PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET, or neither');
  }
  const environment = env.PAYPAL_ENVIRONMENT?.trim() || 'sandbox';
  if (environment !== 'sandbox' && environment !== 'live') {
    throw new Error('PAYPAL_ENVIRONMENT must be "sandbox" or "live"');
  }
  return { clientId, clientSecret, environment };
}

function adminSeed(env: NodeJS.ProcessEnv): AdminSeed | undefined {
  const email = env.ADMIN_EMAIL?.trim();
  const password = env.ADMIN_PASSWORD;
  if (!email && !password) return undefined;
  if (!email || !password) {
    throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD, or neither');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }
  return { email, password };
}

function parseBoolean(value: string | undefined, name: string): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be "true" or "false"`);
}
