import type { HttpInterceptorFn } from '@angular/common/http';

/** Sends the session cookie with every API request. */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.url.startsWith('/api/') ? req.clone({ withCredentials: true }) : req);
