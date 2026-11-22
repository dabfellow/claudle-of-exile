import { describe, expect, it } from 'vitest';
import {
  crossOffspring,
  discoveredHybridHints,
  grantSeed,
  greenhouseGrowSpeedMult,
  greenhousePlotCount,
  harvestPlot,
  inheritanceBonusPct,
  keepRarestMutations,
  makeStrainKey,
  parseStrain,
  plantPlot,
  rollWildVariant,
} from '../src/engine/foraging';
import { makeCtx } from '../src/engine/context';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { xpToReach } from '../src/engine/xp';

describe('Foraging: Wild variants and cross-breeding', () => {
  it('rolls 1/2/3 wild mutations with weighted rarity and deeper-patch boost', () => {
    let ones = 0, twos = 0, threes = 0;
    const rng = seeded(42);
    for (let i = 0; i < 1000; i++) {
      const k = rollWildVariant(rng, 'sunpetal');
      const n = parseStrain(k).mutations.length;
      if (n === 1) ones++;
      else if (n === 2) twos++;
      else if (n === 3) threes++;
    }
    expect(ones).toBeGreaterThan(800);
    expect(twos).toBeGreaterThan(40);
    expect(threes).toBeGreaterThan(0);
  });

  it('caps inherited mutations at 3 and keeps the rarest tiers', () => {
    const kept = keepRarestMutations(['bountiful', 'vivid', 'radiant', 'celestial', 'overflowing']);
    expect(kept).toHaveLength(3);
    expect(kept).toContain('celestial');
    expect(kept).toContain('overflowing');
    expect(kept).toContain('radiant');
  });

  it('gates hidden hybrids at Foraging level 80', () => {
    const s = newGame(1);
    s.skills.harvesting = xpToReach('harvesting', 79);
    const child79 = crossOffspring(s, seeded(1), 'moon_bloom', 'star_bloom');
    expect(['moon_bloom', 'star_bloom']).toContain(parseStrain(child79).species);

    s.skills.harvesting = xpToReach('harvesting', 80);
    const child80 = crossOffspring(s, seeded(1), 'moon_bloom', 'star_bloom');
    expect(parseStrain(child80).species).toBe('eclipse_bloom');
  });

  it('stabilises strains at 5 generations (3 with Deep-rooted) and stops consuming stable seeds', () => {
    const s = newGame(2);
    s.skills.harvesting = xpToReach('harvesting', 50);
    const deepKey = makeStrainKey('sunpetal', ['deep_rooted']);
    grantSeed(s, deepKey, 10, 0, false);

    // Deterministic RNG that always inherits (>=0.01 < 0.5) and never rolls a new mutation (0.99 >= 0.1)
    let calls = 0;
    const steadyRng = { next: () => (calls++ % 2 === 0 ? 0.1 : 0.99), int: () => 0 };

    expect(plantPlot(s, 0, [deepKey, deepKey], 0)).toBeNull();
    const res = harvestPlot(s, { ...makeCtx(steadyRng), now: 1e9 }, 0, 1e9);
    expect(typeof res).toBe('object');
    // 3 identical offspring from one cross reach generation 3 -> Stable because of Deep-rooted!
    expect(s.foraging.strains[deepKey].stable).toBe(true);

    // Planting a stable strain consumes 0 seeds
    const seedsBefore = s.foraging.seeds[deepKey] ?? 0;
    expect(plantPlot(s, 0, [deepKey], 1e9)).toBeNull();
    expect(s.foraging.seeds[deepKey] ?? 0).toBe(seedsBefore);
  });

  it('unlocks plots by level (5/20/35/50/65/80/95) and herbarium perks (10/100)', () => {
    const s = newGame(3);
    expect(greenhousePlotCount(s)).toBe(0);
    s.skills.harvesting = xpToReach('harvesting', 5);
    expect(greenhousePlotCount(s)).toBe(2);
    s.skills.harvesting = xpToReach('harvesting', 20);
    expect(greenhousePlotCount(s)).toBe(3);
    s.skills.harvesting = xpToReach('harvesting', 95);
    expect(greenhousePlotCount(s)).toBe(8);

    for (let i = 0; i < 10; i++) s.foraging.strains[`sunpetal|m${i}`] = { generation: 0, stable: false, firstSeen: 0 };
    expect(greenhousePlotCount(s)).toBe(9);
    for (let i = 10; i < 100; i++) s.foraging.strains[`sunpetal|m${i}`] = { generation: 0, stable: false, firstSeen: 0 };
    expect(greenhousePlotCount(s)).toBe(10);
  });

  it('grows plots in real time offline and auto-replants Everbloom', () => {
    const s = newGame(4);
    s.skills.harvesting = xpToReach('harvesting', 10);
    const key = makeStrainKey('sunpetal', ['bountiful', 'everbloom']);
    grantSeed(s, key, 1, 1000, false);

    expect(plantPlot(s, 0, [key], 1000)).toBeNull();
    const plot = s.foraging.plots[0]!;
    expect(harvestPlot(s, makeCtx(seeded(1)), 0, plot.readyAt - 1)).toBe('Plot is still growing');

    const res = harvestPlot(s, makeCtx(seeded(1)), 0, plot.readyAt);
    expect(typeof res).toBe('object');
    if (typeof res !== 'string') {
      expect(res.herbs?.qty).toBe(11); // 10 base + 1 Bountiful
      expect(res.replanted).toBe(true);
    }
    expect(s.foraging.strainHerbs[key]).toBe(11);
    expect(s.foraging.plots[0]?.parents).toEqual([key]);
  });

  it('applies herbarium perks at 25/50/200 entries and reveals hybrid hints every 25 entries', () => {
    const s = newGame(5);
    expect(inheritanceBonusPct(s, ['sunpetal'])).toBe(0);
    expect(greenhouseGrowSpeedMult(s, ['sunpetal'])).toBeCloseTo(1, 5);
    expect(discoveredHybridHints(s)).toHaveLength(0);

    for (let i = 0; i < 25; i++) s.foraging.strains[`s_${i}`] = { generation: 0, stable: false, firstSeen: 0 };
    expect(inheritanceBonusPct(s, ['sunpetal'])).toBe(5);
    expect(discoveredHybridHints(s)).toHaveLength(1);

    for (let i = 25; i < 50; i++) s.foraging.strains[`s_${i}`] = { generation: 0, stable: false, firstSeen: 0 };
    expect(greenhouseGrowSpeedMult(s, ['sunpetal'])).toBeCloseTo(1.1, 5);
    expect(discoveredHybridHints(s)).toHaveLength(2);

    for (let i = 50; i < 200; i++) s.foraging.strains[`s_${i}`] = { generation: 0, stable: false, firstSeen: 0 };
    expect(greenhouseGrowSpeedMult(s, ['sunpetal'])).toBeCloseTo(1.2, 5);
  });

  it('migrates legacy v60 saves: mastery, seed discoveries, remembered greenhouse crop, and running action', () => {
    const s = newGame(6);
    const raw = JSON.parse(serialize(s));
    raw.version = 60;
    delete raw.foraging;
    raw.skillingMastery.herb_sun = 120;
    raw.skillingMastery.herb_abundant_sunpetal = 500;
    raw.professionProgress.discoveries.seed_sunpetal = true;
    raw.greenhouse = { actionId: 'herb_frost', progress: 500 };
    raw.action = { kind: 'skill', actionId: 'herb_ember', progress: 0 };

    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.skillingMastery.forage_sunpetal).toBe(500);
    expect(loaded.skillingMastery.herb_sun).toBeUndefined();
    expect(loaded.foraging.seeds.sunpetal).toBe(5);
    expect(loaded.foraging.plots[0]).toEqual({ parents: ['frostleaf'], plantedAt: 0, readyAt: 0 });
    expect(loaded.action?.kind === 'skill' && loaded.action.actionId).toBe('forage_emberroot');
  });
});
