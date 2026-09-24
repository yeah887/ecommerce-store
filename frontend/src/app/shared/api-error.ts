import { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody } from '@store/shared';

/** The API's error body from a failed request, if the failure came with one. */
export function apiError(error: unknown): ApiErrorBody['error'] | undefined {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object' && 'error' in error.error) {
    return (error.error as ApiErrorBody).error;
  }
  return undefined;
}
