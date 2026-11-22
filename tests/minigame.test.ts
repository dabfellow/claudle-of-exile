import { describe, expect, it } from 'vitest';
import { angleResult, bellowsResult, braceResult, fertiliseResult, fertiliseWindowMs, gemTurnMs, liftResult, liftWindowMs, pourResult, sightingResult } from '../src/engine/minigame';

describe('Cartography take a sighting', () => {
  it('scores using the larger of the two axis errors', () => {
    expect(sightingResult(0.01, -0.02)).toBe('double');
    expect(sightingResult(0.021, 0.01)).toBe('hit');
    expect(sightingResult(0.06, 0.05)).toBe('hit');
    expect(sightingResult(0.01, 0.061)).toBe('weak');
    expect(sightingResult(0.12, 0.12)).toBe('weak');
    expect(sightingResult(0.121, 0)).toBe('miss');
    expect(sightingResult(Number.NaN, 0)).toBe('miss');
  });
});

describe('Alchemy pour to the line', () => {
  it('scores double, hit, weak, miss and spills accurately', () => {
    expect(pourResult(0, false)).toBe('double');
    expect(pourResult(0.02, false)).toBe('double');
    expect(pourResult(-0.02, false)).toBe('double');
    expect(pourResult(0.021, false)).toBe('hit');
    expect(pourResult(0.06, false)).toBe('hit');
    expect(pourResult(0.061, false)).toBe('weak');
    expect(pourResult(0.12, false)).toBe('weak');
    expect(pourResult(0.121, false)).toBe('miss');
    expect(pourResult(0, true)).toBe('miss');
  });
});

describe('Foraging whack-a-mole fertilising', () => {
  it('scores double, hit, weak and miss and tightens window for deeper species', () => {
    expect(fertiliseWindowMs(0)).toBe(1600);
    expect(fertiliseWindowMs(4)).toBe(1200);
    expect(fertiliseWindowMs(8)).toBe(900);
    expect(fertiliseResult(300, 1000, false)).toBe('double');
    expect(fertiliseResult(301, 1000, false)).toBe('hit');
    expect(fertiliseResult(1000, 1000, false)).toBe('hit');
    expect(fertiliseResult(1001, 1000, false)).toBe('weak');
    expect(fertiliseResult(1300, 1000, false)).toBe('weak');
    expect(fertiliseResult(1301, 1000, false)).toBe('miss');
    expect(fertiliseResult(100, 1000, true)).toBe('miss');
    expect(fertiliseResult(null, 1000, false)).toBe('miss');
  });
});

describe('Gemcutting dop-stick angle', () => {
  it('scores double, hit, weak and miss across wrap-around angles', () => {
    expect(angleResult(0)).toBe('double');
    expect(angleResult(3)).toBe('double');
    expect(angleResult(357)).toBe('double');
    expect(angleResult(3.1)).toBe('hit');
    expect(angleResult(9)).toBe('hit');
    expect(angleResult(351)).toBe('hit');
    expect(angleResult(9.1)).toBe('weak');
    expect(angleResult(18)).toBe('weak');
    expect(angleResult(342)).toBe('weak');
    expect(angleResult(18.1)).toBe('miss');
    expect(angleResult(180)).toBe('miss');
    expect(angleResult(Number.NaN)).toBe('miss');
  });

  it('turns faster from level 1 to level 99', () => {
    expect(gemTurnMs(1)).toBe(2400);
    expect(gemTurnMs(50)).toBe(2000);
    expect(gemTurnMs(99)).toBe(1600);
  });
});

describe('Delve bracing', () => {
  it('scores the double, warning and late windows, and rejects a wrong fix', () => {
    expect(braceResult(true, 1_000, 3_000)).toBe('double');
    expect(braceResult(true, 1_001, 3_000)).toBe('hit');
    expect(braceResult(true, 3_000, 3_000)).toBe('hit');
    expect(braceResult(true, 3_001, 3_000)).toBe('weak');
    expect(braceResult(true, 4_000, 3_000)).toBe('weak');
    expect(braceResult(true, 4_001, 3_000)).toBe('miss');
    expect(braceResult(false, 100, 3_000)).toBe('miss');
  });
});

describe('Furnace bellows', () => {
  it('scores by time spent in the gold and outer bands', () => {
    expect(bellowsResult(0.5, 0.5)).toBe('double');
    expect(bellowsResult(0.49, 0.6)).toBe('hit');
    expect(bellowsResult(0.3, 0.59)).toBe('weak');
    expect(bellowsResult(0, 0.3)).toBe('weak');
    expect(bellowsResult(0, 0.29)).toBe('miss');
  });
});

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
