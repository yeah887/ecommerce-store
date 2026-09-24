import express, { type Express } from 'express';
import type { Connection } from 'mongoose';
import type { Config } from './config.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { authRouter } from './routes/auth.js';
import { categoriesRouter } from './routes/categories.js';
import { healthRouter } from './routes/health.js';
import { productsRouter } from './routes/products.js';
import { currentUser, sessionMiddleware } from './session.js';

export interface AppDeps {
  db: Connection;
  config: Config;
}

/**
 * Builds the Express app from its dependencies. Does not connect or listen,
 * so tests can build it against an in-memory database.
 */
export function createApp({ db, config }: AppDeps): Express {
  const app = express();

  app.disable('x-powered-by');
  // One proxy hop (nginx, or the Angular dev server) sits in front of the API.
  app.set('trust proxy', 1);
  app.use(express.json());

  app.use('/api/health', healthRouter(db));

  app.use('/api', sessionMiddleware(db, config), currentUser(db));
  app.use('/api/products', productsRouter(db));
  app.use('/api/categories', categoriesRouter());
  app.use('/api/auth', authRouter(db, config));

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
