import type { Connection } from 'mongoose';
import type { AdminSeed } from '../config.js';
import { orderModel } from '../models/order.js';
import { productModel } from '../models/product.js';
import { userModel } from '../models/user.js';
import { hashPassword } from '../passwords.js';
import { SESSIONS_COLLECTION } from '../session.js';
import { SAMPLE_PRODUCTS } from './sample-products.js';

export interface PrepareOptions {
  /** Insert sample products into an empty catalog. */
  seed: boolean;
  /** Create this admin account unless a user with its email already exists. */
  admin?: AdminSeed;
  bcryptRounds?: number;
}

/**
 * Builds indexes (text search and unique emails need theirs before the first request) and seeds data.
 * Safe to run on every start: nothing that already exists is changed.
 */
export async function prepareDatabase(
  db: Connection,
  { seed, admin, bcryptRounds = 12 }: PrepareOptions,
): Promise<void> {
  const products = productModel(db);
  const users = userModel(db);
  await Promise.all([
    products.init(),
    users.init(),
    orderModel(db).init(),
    // MongoDB deletes sessions once their `expires` date has passed.
    db.collection(SESSIONS_COLLECTION).createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
  ]);

  // Products from before multiple images had a single `imageUrl`; it becomes their only image.
  await products.collection.updateMany({ images: { $exists: false }, imageUrl: { $type: 'string' } }, [
    { $set: { images: ['$imageUrl'] } },
    { $unset: 'imageUrl' },
  ]);

  if (seed && (await products.estimatedDocumentCount()) === 0) {
    await products.insertMany(SAMPLE_PRODUCTS);
  }

  if (admin) {
    const email = admin.email.trim().toLowerCase();
    if (!(await users.exists({ email }))) {
      await users.create({
        name: 'Admin',
        email,
        passwordHash: await hashPassword(admin.password, bcryptRounds),
        role: 'admin',
      });
      console.log(`Created admin account ${email}`);
    }
  }
}
