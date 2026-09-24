import type { Connection } from 'mongoose';
import { productModel } from '../models/product.js';
import { SAMPLE_PRODUCTS } from './sample-products.js';

export interface PrepareOptions {
  /** Insert sample data into empty collections. */
  seed: boolean;
}

/**
 * Builds indexes (text search needs its index before the first query) and seeds sample data.
 * Safe to run on every start: seeding only touches empty collections.
 */
export async function prepareDatabase(db: Connection, { seed }: PrepareOptions): Promise<void> {
  const products = productModel(db);
  await products.init();

  if (seed && (await products.estimatedDocumentCount()) === 0) {
    await products.insertMany(SAMPLE_PRODUCTS);
  }
}
