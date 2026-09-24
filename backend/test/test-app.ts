import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Connection } from 'mongoose';
import type { Express } from 'express';
import { afterAll, beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import type { AdminSeed, Config } from '../src/config.js';
import { prepareDatabase } from '../src/db/prepare.js';
import type { PaymentProvider } from '../src/payments.js';

export interface TestContext {
  app: Express;
  db: Connection;
  config: Config;
}

export interface TestAppOptions {
  /** Seed the sample products. */
  seed?: boolean;
  admin?: AdminSeed;
  config?: Partial<Config>;
  /** Defaults to the app's own mock provider. */
  payments?: PaymentProvider;
}

export const TEST_ADMIN: AdminSeed = { email: 'admin@example.com', password: 'admin-password' };

/**
 * Starts a fresh in-memory MongoDB for the calling test file, prepares it like the server does,
 * and builds the app against it. Read the returned object's properties inside tests, not at module load.
 */
export function useTestApp({ seed = false, admin, config, payments }: TestAppOptions = {}): TestContext {
  const ctx = {} as TestContext;
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    ctx.config = {
      port: 0,
      mongoUrl: mongo.getUri(),
      production: false,
      sessionSecret: 'test-session-secret',
      cookieSecure: false,
      admin,
      // Cheap hashing keeps the tests fast; the algorithm is the same.
      bcryptRounds: 4,
      ...config,
    };
    ctx.db = await mongoose.createConnection(mongo.getUri()).asPromise();
    await prepareDatabase(ctx.db, { seed, admin, bcryptRounds: ctx.config.bcryptRounds });
    ctx.app = createApp({ db: ctx.db, config: ctx.config, payments });
  });

  afterAll(async () => {
    await ctx.db?.close();
    await mongo?.stop();
  });

  return ctx;
}
