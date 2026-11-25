import { describe, expect, it } from 'vitest';
import {
  angleResult,
  bellowsResult,
  braceResult,
  heatAtRest,
  heatPump,
  heatStep,
  newHeat,
  BRUSH_COLS,
  BRUSH_CRACKS_MAX,
  BRUSH_CRACKS_MIN,
  BRUSH_FIND_MAX,
  BRUSH_FIND_MIN,
  BRUSH_ROWS,
  brushChips,
  brushDone,
  brushPatch,
  brushResult,
  fertiliseResult,
  fertiliseWindowMs,
  focusHoldSeconds,
  focusRemainingSeconds,
  focusStep,
  gemTurnMs,
  LIFT_CLICKS_DOUBLE,
  LIFT_CLICKS_HIT,
  liftResult,
  liftSpamResult,
  liftWindowMs,
  minigameSwing,
  overflowOf,
  pourResult,
  sightingResult,
} from '../src/engine/minigame';
import { startSkillAction } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { seeded } from '../src/engine/rng';

describe('Cartography take a sighting', () => {
  it('scores using the larger of the two axis errors', () => {
    expect(sightingResult(0.01, -0.02)).toBe('double');
    expect(sightingResult(0.06, -0.06)).toBe('double');
    expect(sightingResult(0.061, 0.01)).toBe('hit');
    expect(sightingResult(0.14, 0.10)).toBe('hit');
    expect(sightingResult(0.01, 0.141)).toBe('weak');
    expect(sightingResult(0.24, 0.24)).toBe('weak');
    expect(sightingResult(0.241, 0)).toBe('miss');
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

describe('Furnace keep the heat', () => {
  const low = 0.45;
  const high = 0.69;
  const never = () => 1;

  it('cools to rest with no pumping', () => {
    const h = newHeat();
    heatPump(h);
    for (let i = 0; i < 2000 && !heatAtRest(h); i++) heatStep(h, 16, low, high, never);
    expect(heatAtRest(h)).toBe(true);
  });

  it('fills the melt meter in the gold centre for a double', () => {
    const h = { ...newHeat(), heat: 0.57, kick: 0 };
    let result = null;
    for (let i = 0; i < 400 && !result; i++) {
      h.heat = 0.57; // hold the needle in the centre
      result = heatStep(h, 16, low, high, never);
    }
    expect(result).toBe('double');
    expect(h.melt).toBe(0);
  });

  it('a held band edge fills to a hit, and the fire catches', () => {
    const h = newHeat();
    let result = null;
    for (let i = 0; i < 400 && !result; i++) {
      h.heat = 0.47;
      result = heatStep(h, 16, low, high, never);
    }
    expect(result).toBe('hit');
    expect(h.fire).toBeGreaterThan(0.3);
  });

  it('pumping at the cold rhythm once the fire roars scorches the melt', () => {
    const h = { ...newHeat(), heat: 0.57, fire: 1, melt: 0.6, gold: 0.6 };
    let result = null;
    for (let i = 0; i < 1000 && !result; i++) {
      if (i % 20 === 0) heatPump(h); // ~3 pumps a second
      result = heatStep(h, 16, low, high, never);
    }
    expect(result).toBe('miss');
    expect(h.melt).toBeLessThan(0.3); // drained while too hot, then halved
    expect(h.fire).toBeLessThan(1);
  });

  it('a roaring fire flares after a warning', () => {
    const h = { ...newHeat(), heat: 0.57, fire: 1 };
    heatStep(h, 16, low, high, () => 0);
    expect(h.flare).toBeGreaterThan(0);
    for (let i = 0; i < 60 && h.flare > 0; i++) heatStep(h, 16, low, high, never);
    expect(h.flare).toBe(0);
    expect(h.kick).toBeGreaterThan(0.3);
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

describe('liftSpamResult', () => {
  it('exposes hit and double click thresholds', () => {
    expect(LIFT_CLICKS_HIT).toBe(4);
    expect(LIFT_CLICKS_DOUBLE).toBe(8);
  });

  it('misses immediately when caught regardless of click count', () => {
    expect(liftSpamResult(0, true)).toBe('miss');
    expect(liftSpamResult(4, true)).toBe('miss');
    expect(liftSpamResult(12, true)).toBe('miss');
  });

  it('returns null under 2 clicks, weak for 2-3, hit for 4-7, and double for 8+', () => {
    expect(liftSpamResult(0, false)).toBeNull();
    expect(liftSpamResult(1, false)).toBeNull();
    expect(liftSpamResult(2, false)).toBe('weak');
    expect(liftSpamResult(3, false)).toBe('weak');
    expect(liftSpamResult(4, false)).toBe('hit');
    expect(liftSpamResult(7, false)).toBe('hit');
    expect(liftSpamResult(8, false)).toBe('double');
    expect(liftSpamResult(12, false)).toBe('double');
  });
});

describe('Archaeology brushing patch', () => {
  it('uses a compact 4x3 grid with 3-4 find squares and 2-3 cracks', () => {
    expect(BRUSH_COLS).toBe(4);
    expect(BRUSH_ROWS).toBe(3);
    expect(BRUSH_FIND_MIN).toBe(3);
    expect(BRUSH_FIND_MAX).toBe(4);
    expect(BRUSH_CRACKS_MIN).toBe(2);
    expect(BRUSH_CRACKS_MAX).toBe(3);

    const rng = seeded(17);
    for (let i = 0; i < 200; i++) {
      const p = brushPatch(rng);
      expect(p.find.length).toBeGreaterThanOrEqual(3);
      expect(p.find.length).toBeLessThanOrEqual(4);
      expect(p.cracks.length).toBeGreaterThanOrEqual(2);
      expect(p.cracks.length).toBeLessThanOrEqual(3);
      for (const t of [...p.find, ...p.cracks]) {
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThan(BRUSH_COLS * BRUSH_ROWS);
      }
      expect(p.cracks.some((t) => p.find.includes(t))).toBe(false);
    }
  });

  it('scores chips and completion accurately on the 4x3 patch', () => {
    expect(brushResult(0)).toBe('double');
    expect(brushResult(1)).toBe('hit');
    expect(brushResult(2)).toBe('weak');
    expect(brushResult(3)).toBe('miss');
    const p = { find: [1, 2, 5], cracks: [0, 6] };
    expect(brushDone(p, new Set([1, 2]))).toBe(false);
    expect(brushDone(p, new Set([1, 2, 5]))).toBe(true);
    expect(brushChips(p, new Set([1, 2, 5]))).toBe(0);
    expect(brushChips(p, new Set([1, 2, 5, 0]))).toBe(1);
    expect(brushPatch(seeded(3), 9).cracks).toHaveLength(1);
  });
});

describe('Thieving extended Focus duration', () => {
  it('holds Focus overflow past 25 seconds for Thieving while keeping Mining at 5s/10s', () => {
    const ctx = { rng: seeded(1), now: 0, emit: () => {} };
    const thief = newGame(1, { name: 'T', classId: 'shadow' });
    startSkillAction(thief, ctx, 'mark_peddler');
    for (let i = 0; i < 8; i++) minigameSwing(thief, 'hit');
    expect(focusHoldSeconds(thief, 'thieving')).toBeCloseTo(1.0 / 0.035, 1);
    expect(focusRemainingSeconds(thief, 'thieving')).toBeCloseTo(2.0 / 0.035, 1);

    focusStep(thief, ctx, 20_000);
    expect(overflowOf(thief)).toBeGreaterThan(0);
    expect(focusRemainingSeconds(thief, 'thieving')).toBeGreaterThan(35);

    const miner = newGame(1, { name: 'M', classId: 'warrior' });
    startSkillAction(miner, ctx, 'mine_copper');
    for (let i = 0; i < 8; i++) minigameSwing(miner, 'hit');
    expect(focusHoldSeconds(miner, 'mining')).toBeCloseTo(5, 1);
    expect(focusRemainingSeconds(miner, 'mining')).toBeCloseTo(15, 1);
  });
});
