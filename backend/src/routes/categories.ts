import { Router } from 'express';
import { CATEGORIES, CATEGORY_LABELS, type CategoryInfo } from '@store/shared';

export function categoriesRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const body: CategoryInfo[] = CATEGORIES.map((id) => ({ id, label: CATEGORY_LABELS[id] }));
    res.json(body);
  });

  return router;
}
