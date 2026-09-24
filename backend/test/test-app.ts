import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type Connection } from 'mongoose';
import type { Express } from 'express';
import { afterAll, beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import { prepareDatabase, type PrepareOptions } from '../src/db/prepare.js';

export interface TestContext {
  app: Express;
  db: Connection;
}

/**
 * Starts a fresh in-memory MongoDB for the calling test file, prepares it like the server does
 * (sample data only when `seed` is set), and builds the app against it.
 * Read the returned object's properties inside tests, not at module load.
 */
export function useTestApp({ seed = false }: Partial<PrepareOptions> = {}): TestContext {
  const ctx = {} as TestContext;
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    ctx.db = await mongoose.createConnection(mongo.getUri()).asPromise();
    await prepareDatabase(ctx.db, { seed });
    ctx.app = createApp({ db: ctx.db });
  });

  afterAll(async () => {
    await ctx.db?.close();
    await mongo?.stop();
  });

  return ctx;
}
