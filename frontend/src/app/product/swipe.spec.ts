import { describe, expect, it } from 'vitest';
import { swipeDirection } from './swipe';

const touch = (clientX: number, clientY = 0) => ({ changedTouches: [{ clientX, clientY }] }) as unknown as TouchEvent;

describe('swipeDirection', () => {
  it('goes to the next image when the finger moves left', () => {
    expect(swipeDirection(touch(300), touch(200))).toBe(1);
  });

  it('goes to the previous image when the finger moves right', () => {
    expect(swipeDirection(touch(100), touch(200))).toBe(-1);
  });

  it('ignores short moves, mostly vertical moves and a missing start', () => {
    expect(swipeDirection(touch(100), touch(130))).toBe(0);
    expect(swipeDirection(touch(100, 0), touch(170, 200))).toBe(0);
    expect(swipeDirection(undefined, touch(200))).toBe(0);
  });
});
