import express, { type Express } from 'express';
import type { Connection } from 'mongoose';
import type { Config } from './config.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { ImageStore } from './images.js';
import { adminOrdersRouter } from './routes/admin-orders.js';
import { adminProductsRouter } from './routes/admin-products.js';
import { authRouter } from './routes/auth.js';
import { categoriesRouter } from './routes/categories.js';
import { healthRouter } from './routes/health.js';
import { adminImagesRouter, imagesRouter } from './routes/images.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';
import { MockPaymentProvider, type PaymentProvider } from './payments.js';
import { currentUser, requireAdmin, sessionMiddleware } from './session.js';

export interface AppDeps {
  db: Connection;
  config: Config;
  payments?: PaymentProvider;
}

/**
 * Builds the Express app from its dependencies. Does not connect or listen,
 * so tests can build it against an in-memory database.
 */
export function createApp({ db, config, payments = new MockPaymentProvider() }: AppDeps): Express {
  const app = express();
  const images = new ImageStore(db);

  app.disable('x-powered-by');
  // One proxy hop (nginx, or the Angular dev server) sits in front of the API.
  app.set('trust proxy', 1);
  app.use(express.json());

  app.use('/api/health', healthRouter(db));
  // Images are public and don't need a session lookup.
  app.use('/api/images', imagesRouter(images));

  app.use('/api', sessionMiddleware(db, config), currentUser(db));
  app.use('/api/products', productsRouter(db));
  app.use('/api/categories', categoriesRouter());
  app.use('/api/auth', authRouter(db, config));
  app.use('/api/orders', ordersRouter(db, payments));

  // Everything under /api/admin, including unknown paths, is admins-only.
  app.use('/api/admin', requireAdmin);
  app.use('/api/admin/products', adminProductsRouter(db, images));
  app.use('/api/admin/images', adminImagesRouter(images));
  app.use('/api/admin/orders', adminOrdersRouter(db));

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
