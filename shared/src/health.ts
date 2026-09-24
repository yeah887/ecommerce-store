export type DatabaseStatus = 'connected' | 'disconnected';

/** Response of `GET /api/health`. Status is `ok` only when the database answers. */
export interface HealthResponse {
  status: 'ok' | 'degraded';
  database: DatabaseStatus;
}
