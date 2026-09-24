import { Router } from 'express';
import { isValidObjectId, type Connection, type QueryFilter, type SortOrder } from 'mongoose';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  isCategory,
  type Page,
  type Product,
} from '@store/shared';
import { HttpError } from '../errors.js';
import { productModel, toProduct, type ProductDoc } from '../models/product.js';
import { FieldErrors, queryPositiveInt, queryString } from '../validation.js';

const MAX_QUERY_LENGTH = 100;

export function productsRouter(db: Connection): Router {
  const router = Router();
  const products = productModel(db);

  router.get('/', async (req, res) => {
    const errors = new FieldErrors();
    const q = queryString(req.query.q, 'q', errors)?.trim();
    const category = queryString(req.query.category, 'category', errors);
    const page = queryPositiveInt(req.query.page, 'page', 1, errors);
    const pageSize = Math.min(
      queryPositiveInt(req.query.pageSize, 'pageSize', DEFAULT_PAGE_SIZE, errors),
      MAX_PAGE_SIZE,
    );
    if (q && q.length > MAX_QUERY_LENGTH) {
      errors.add('q', `q must be at most ${MAX_QUERY_LENGTH} characters`);
    }
    if (category && !isCategory(category)) {
      errors.add('category', 'Unknown category');
    }
    errors.throwIfAny();

    const filter: QueryFilter<ProductDoc> = {};
    if (q) filter.$text = { $search: q };
    if (isCategory(category)) filter.category = category;

    // Text matches sort by relevance; everything else alphabetically. _id keeps pages stable.
    const sort: Record<string, SortOrder | { $meta: 'textScore' }> = q
      ? { score: { $meta: 'textScore' }, name: 1, _id: 1 }
      : { name: 1, _id: 1 };

    const [docs, total] = await Promise.all([
      products
        .find(filter, q ? { score: { $meta: 'textScore' } } : {})
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<ProductDoc[]>(),
      products.countDocuments(filter),
    ]);

    const body: Page<Product> = {
      items: docs.map(toProduct),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
    res.json(body);
  });

  router.get('/:id', async (req, res) => {
    // Malformed IDs can't match anything, so they are simply not found.
    const doc = isValidObjectId(req.params.id)
      ? await products.findById(req.params.id).lean<ProductDoc>()
      : null;
    if (!doc) {
      throw new HttpError(404, 'product_not_found', 'Product not found');
    }
    const body: Product = toProduct(doc);
    res.json(body);
  });

  return router;
}
