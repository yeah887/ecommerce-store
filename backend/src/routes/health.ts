import { Router } from 'express';
import type { Connection } from 'mongoose';
import type { HealthResponse } from '@store/shared';

export function healthRouter(db: Connection): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const connected = await isDatabaseReachable(db);
    const body: HealthResponse = {
      status: connected ? 'ok' : 'degraded',
      database: connected ? 'connected' : 'disconnected',
    };
    res.status(connected ? 200 : 503).json(body);
  });

  return router;
}

async function isDatabaseReachable(db: Connection): Promise<boolean> {
  if (db.readyState !== 1 || !db.db) return false;
  try {
    await db.db.admin().ping();
    return true;
  } catch {
    return false;
  }
}
