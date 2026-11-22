import { describe, expect, it } from 'vitest';
import { liftResult, liftWindowMs } from '../src/engine/minigame';

describe('liftResult', () => {
  // window 1000..2200 (1200 ms): middle third is 1400..1800
  const r = (t: number) => liftResult(t, 1000, 2200);
  it('misses before the window opens', () => {
    expect(r(0)).toBe('miss');
    expect(r(999)).toBe('miss');
  });
  it('hits at the edges of the window', () => {
    expect(r(1000)).toBe('hit');
    expect(r(1399)).toBe('hit');
    expect(r(1801)).toBe('hit');
    expect(r(2200)).toBe('hit');
  });
  it('doubles in the middle third', () => {
    expect(r(1400)).toBe('double');
    expect(r(1600)).toBe('double');
    expect(r(1800)).toBe('double');
  });
  it('is weak within 0.25 s after the window ends', () => {
    expect(r(2201)).toBe('weak');
    expect(r(2450)).toBe('weak');
  });
  it('misses after the grace', () => {
    expect(r(2451)).toBe('miss');
  });
  it('window shrinks with mark level to a floor', () => {
    expect(liftWindowMs(1)).toBe(1400);
    expect(liftWindowMs(10)).toBe(1350);
    expect(liftWindowMs(59)).toBe(1150);
    expect(liftWindowMs(500)).toBe(800);
  });
});
