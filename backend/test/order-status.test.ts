import { describe, expect, it } from 'vitest';
import { ORDER_STATUSES, type OrderStatus } from '@store/shared';
import { allowedNextStatuses, assertTransition, canTransition } from '../src/order-status.js';

const allowed: [OrderStatus, OrderStatus][] = [
  ['placed', 'shipped'],
  ['placed', 'cancelled'],
  ['shipped', 'delivered'],
];

describe('order status rules', () => {
  it.each(allowed)('allows %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  const disallowed = ORDER_STATUSES.flatMap((from) =>
    ORDER_STATUSES.filter((to) => !allowed.some(([f, t]) => f === from && t === to)).map(
      (to) => [from, to] as [OrderStatus, OrderStatus],
    ),
  );

  it.each(disallowed)('rejects %s → %s with 409', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(expect.objectContaining({ status: 409, code: 'invalid_status_transition' }));
  });

  it('treats delivered and cancelled as final', () => {
    expect(allowedNextStatuses('delivered')).toEqual([]);
    expect(allowedNextStatuses('cancelled')).toEqual([]);
  });
});
