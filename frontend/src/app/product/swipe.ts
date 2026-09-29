const MIN_SWIPE_PX = 50;

/** -1 for a swipe towards the previous item (finger moving right), 1 for the next, 0 for no clear swipe. */
export function swipeDirection(start: TouchEvent | undefined, end: TouchEvent): -1 | 0 | 1 {
  const from = start?.changedTouches[0];
  const to = end.changedTouches[0];
  if (!from || !to) return 0;
  const dx = to.clientX - from.clientX;
  const dy = to.clientY - from.clientY;
  if (Math.abs(dx) < MIN_SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return 0;
  return dx > 0 ? -1 : 1;
}
