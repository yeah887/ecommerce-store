import express, { type Express } from 'express';
import type { Connection } from 'mongoose';
import { errorHandler, notFoundHandler } from './errors.js';
import { categoriesRouter } from './routes/categories.js';
import { healthRouter } from './routes/health.js';
import { productsRouter } from './routes/products.js';

export interface AppDeps {
  db: Connection;
}

/**
 * Builds the Express app from its dependencies. Does not connect or listen,
 * so tests can build it against an in-memory database.
 */
export function createApp({ db }: AppDeps): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/api/health', healthRouter(db));
  app.use('/api/products', productsRouter(db));
  app.use('/api/categories', categoriesRouter());

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
