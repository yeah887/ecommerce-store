import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiErrorBody } from '@store/shared';

/** Throw from a route handler to send a specific status with the standard error body. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'not_found', `No route for ${req.method} ${req.baseUrl}${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let body: ApiErrorBody = { error: { code: 'internal_error', message: 'Something went wrong' } };

  if (err instanceof HttpError) {
    status = err.status;
    body = { error: { code: err.code, message: err.message, fields: err.fields } };
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    body = { error: { code: 'invalid_json', message: 'Request body is not valid JSON' } };
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    body = { error: { code: 'payload_too_large', message: 'Request body is too large' } };
  } else {
    console.error(err);
  }

  res.status(status).json(body);
};
