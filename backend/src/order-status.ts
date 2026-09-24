import type { OrderStatus } from '@store/shared';
import { HttpError } from './errors.js';

/** The order lifecycle: which status may follow which. `delivered` and `cancelled` are final. */
const NEXT_STATUSES: Record<OrderStatus, readonly OrderStatus[]> = {
  placed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function allowedNextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return NEXT_STATUSES[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUSES[from].includes(to);
}

/** Throws 409 unless `from → to` is part of the lifecycle. */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new HttpError(409, 'invalid_status_transition', `An order that is ${from} cannot become ${to}`);
  }
}
