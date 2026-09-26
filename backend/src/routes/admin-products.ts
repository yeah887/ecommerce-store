import { Router } from 'express';
import { isValidObjectId, type Connection } from 'mongoose';
import {
  PRODUCT_LIMITS,
  isCategory,
  isProductImageUrl,
  uploadedImageId,
  type Product,
  type ProductInput,
} from '@store/shared';
import { HttpError } from '../errors.js';
import type { ImageStore } from '../images.js';
import { productModel, toProduct, type ProductDoc } from '../models/product.js';
import { FieldErrors } from '../validation.js';

/** Product management. Mounted behind `requireAdmin`. */
export function adminProductsRouter(db: Connection, images: ImageStore): Router {
  const router = Router();
  const products = productModel(db);

  /** Uploaded images must exist, so a product never points at a missing one. */
  async function checkImage(input: ProductInput): Promise<void> {
    const id = uploadedImageId(input.imageUrl);
    if (id && !(await images.exists(id))) {
      throw new HttpError(400, 'validation_failed', 'Some fields are invalid', { imageUrl: 'Image not found; upload it again' });
    }
  }

  /** Deletes an uploaded image once no product uses it any more. */
  async function releaseImage(imageUrl: string): Promise<void> {
    const id = uploadedImageId(imageUrl);
    if (id && !(await products.exists({ imageUrl }))) await images.delete(id);
  }

  router.post('/', async (req, res) => {
    const input = parseProductInput(req.body);
    await checkImage(input);
    const created = await products.create(input);
    const body: Product = toProduct(created.toObject() as ProductDoc);
    res.status(201).json(body);
  });

  router.put('/:id', async (req, res) => {
    const input = parseProductInput(req.body);
    await checkImage(input);
    const before = isValidObjectId(req.params.id) ? await products.findById(req.params.id).lean<ProductDoc>() : null;
    const updated = before
      ? await products.findByIdAndUpdate(req.params.id, input, { new: true, runValidators: true }).lean<ProductDoc>()
      : null;
    if (!before || !updated) throw notFound();
    if (before.imageUrl !== updated.imageUrl) await releaseImage(before.imageUrl);
    const body: Product = toProduct(updated);
    res.json(body);
  });

  router.delete('/:id', async (req, res) => {
    // Past orders keep their own name and price snapshots, so deleting is safe for order history.
    const deleted = isValidObjectId(req.params.id) ? await products.findByIdAndDelete(req.params.id) : null;
    if (!deleted) throw notFound();
    await releaseImage(deleted.imageUrl);
    res.status(204).end();
  });

  return router;
}

function notFound(): HttpError {
  return new HttpError(404, 'product_not_found', 'Product not found');
}

function parseProductInput(value: unknown): ProductInput {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const errors = new FieldErrors();
  const text = (field: string) => (typeof raw[field] === 'string' ? (raw[field] as string).trim() : '');

  const name = text('name');
  if (!name) errors.add('name', 'Name is required');
  else if (name.length > PRODUCT_LIMITS.nameMaxLength) errors.add('name', 'Name is too long');

  const description = text('description');
  if (!description) errors.add('description', 'Description is required');
  else if (description.length > PRODUCT_LIMITS.descriptionMaxLength) errors.add('description', 'Description is too long');

  const priceCents = raw.priceCents;
  if (!Number.isInteger(priceCents) || (priceCents as number) < 1 || (priceCents as number) > PRODUCT_LIMITS.maxPriceCents) {
    errors.add('priceCents', 'Price must be between €0.01 and €100,000.00');
  }

  const category = raw.category;
  if (!isCategory(category)) errors.add('category', 'Choose a category');

  const imageUrl = text('imageUrl');
  if (!imageUrl) errors.add('imageUrl', 'Image URL is required');
  else if (imageUrl.length > PRODUCT_LIMITS.imageUrlMaxLength || !isProductImageUrl(imageUrl)) {
    errors.add('imageUrl', 'Enter a valid http(s) URL or upload an image');
  }

  errors.throwIfAny();
  return { name, description, priceCents: priceCents as number, category: category as ProductInput['category'], imageUrl };
}
