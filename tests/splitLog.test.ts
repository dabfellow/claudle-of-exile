import { describe, expect, it } from 'vitest';
import { LOG_SAMPLES, balancePoint, columnProfile, logProfile, logWindow, massShare, splitResult } from '../src/engine/minigame';
import { seeded } from '../src/engine/rng';

describe('Woodcutting: split the log', () => {
  it('scores by how far off an even split the halves are: 3 double, 7 hit, 15 weak, past that a miss', () => {
    expect(splitResult(50)).toBe('double');
    expect(splitResult(47)).toBe('double');
    expect(splitResult(53)).toBe('double');
    expect(splitResult(46.99)).toBe('hit');
    expect(splitResult(53.01)).toBe('hit');
    expect(splitResult(43)).toBe('hit');
    expect(splitResult(57)).toBe('hit');
    expect(splitResult(42.99)).toBe('weak');
    expect(splitResult(57.01)).toBe('weak');
    expect(splitResult(35)).toBe('weak');
    expect(splitResult(65)).toBe('weak');
    expect(splitResult(34.99)).toBe('miss');
    expect(splitResult(65.01)).toBe('miss');
    expect(splitResult(0)).toBe('miss');
    expect(splitResult(100)).toBe('miss');
  });

  it('weighs a plain log by length, and a branch toward the side it is on', () => {
    const plain = Array.from({ length: LOG_SAMPLES }, () => 10);
    expect(massShare(plain, 0.5)).toBeCloseTo(50);
    expect(massShare(plain, 0)).toBe(0);
    expect(massShare(plain, 1)).toBeCloseTo(100);
    expect(massShare(plain, 0.25)).toBeCloseTo(25);
    // a big knob on the left makes the left half heavier at the same cut
    const knobbed = plain.map((m, i) => (i >= 6 && i < 14 ? m + 20 : m));
    expect(massShare(knobbed, 0.5)).toBeGreaterThan(60);
    expect(splitResult(massShare(knobbed, 0.5))).not.toBe('double');
    // so the even split moves toward the knob, and cutting there scores a double
    const mid = balancePoint(knobbed);
    expect(mid).toBeLessThan(0.45);
    expect(massShare(knobbed, mid)).toBeCloseTo(50, 1);
    expect(splitResult(massShare(knobbed, mid))).toBe('double');
    // the same knob on the right moves it the other way
    const right = [...knobbed].reverse();
    expect(balancePoint(right)).toBeCloseTo(1 - mid, 2);
  });

  it('draws trunk, limb and heart logs with the right number of knobs, and extra knobs for twisted grain', () => {
    const rand = seeded(11);
    const trunk = logProfile('trunk', rand.next);
    expect(trunk).toHaveLength(LOG_SAMPLES);
    expect(Math.max(...trunk) - Math.min(...trunk)).toBeLessThan(3); // only a slight taper
    const peaks = (p: number[]) => p.filter((m, i) => i > 0 && i < p.length - 1 && m > p[i - 1] && m > p[i + 1] && m > 12).length;
    expect(Math.max(...logProfile('limb', seeded(5).next))).toBeGreaterThan(14);
    expect(peaks(logProfile('limb', seeded(5).next))).toBe(1);
    expect(Math.max(...logProfile('heart', seeded(5).next, 0))).toBeGreaterThan(13);
    // more knobs never make a log lighter
    const sum = (p: number[]) => p.reduce((a, b) => a + b, 0);
    expect(sum(logProfile('limb', seeded(9).next, 1))).toBeGreaterThan(sum(logProfile('limb', seeded(9).next, 0)));
  });

  it('can always be split evenly somewhere on the log', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const kind of ['trunk', 'limb', 'heart'] as const) {
        const p = logProfile(kind, seeded(seed).next, seed % 2);
        expect(splitResult(massShare(p, balancePoint(p)))).toBe('double');
      }
    }
  });
});

describe('Woodcutting: weighing the log picture', () => {
  it('weighs each pixel column by how solid it is, and trims and mirrors what you see', () => {
    // a 4x2 picture: column 0 fully solid, column 1 half, columns 2 and 3 empty
    const px = (a: number) => [0, 0, 0, a];
    const rgba = [...px(255), ...px(255), ...px(0), ...px(0), ...px(255), ...px(0), ...px(0), ...px(0)];
    expect(columnProfile(rgba, 4, 2)).toEqual([2, 1, 0, 0]);
    const p = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(logWindow(p, false, 0, 0)).toEqual(p);
    expect(logWindow(p, true, 0, 0)).toEqual([...p].reverse());
    expect(logWindow(p, false, 0.2, 0.3)).toEqual([3, 4, 5, 6, 7]);
    expect(logWindow(p, true, 0.2, 0)).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);
  });
});
