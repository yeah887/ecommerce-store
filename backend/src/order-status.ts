import { NEXT_ORDER_STATUSES, type OrderStatus } from '@store/shared';
import { HttpError } from './errors.js';

// The lifecycle table itself lives in the shared package, so the admin UI offers only allowed changes.

export function allowedNextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return NEXT_ORDER_STATUSES[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_ORDER_STATUSES[from].includes(to);
}

/** Throws 409 unless `from → to` is part of the lifecycle. */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new HttpError(409, 'invalid_status_transition', `An order that is ${from} cannot become ${to}`);
  }
}
