import { describe, expect, it } from 'vitest';
import { INFUSION_BREW_MS } from '../src/data/alchemy';
import { actionDef } from '../src/data/skills';
import {
  brewsForNextRank,
  finishQueuedInfusion,
  flaskInfusionBuffStats,
  infusionStrength,
  pourVial,
  queueInfusion,
} from '../src/engine/alchemy';
import { startCombat, useFlask } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { flaskStats, newFlask } from '../src/engine/flasks';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, startSkillAction } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { xpToReach } from '../src/engine/xp';

describe('Alchemy: Your own flasks', () => {
  it('computes infusion strength from rank and strain mutations', () => {
    expect(infusionStrength(1, 'sunpetal')).toBeCloseTo(1.0, 4);
    expect(infusionStrength(10, 'sunpetal')).toBeCloseTo(1.9, 4);
    expect(infusionStrength(1, 'sunpetal|vivid')).toBeCloseTo(1.1, 4);
    expect(infusionStrength(1, 'sunpetal|radiant')).toBeCloseTo(1.3, 4);
    expect(infusionStrength(1, 'sunpetal|celestial')).toBeCloseTo(1.75, 4);
    expect(infusionStrength(5, 'sunpetal|vivid|radiant')).toBeCloseTo(1.4 * 1.4, 4);
    expect(brewsForNextRank(1)).toBe(6);
    expect(brewsForNextRank(9)).toBe(30);
    expect(brewsForNextRank(10)).toBe(0);
  });

  it('enforces 2-slot normal vs 3-slot grand limits, grand-only infusions, and pouring replacement', () => {
    const s = newGame(1);
    s.flaskSlots[0] = newFlask(s, 'life_small', 1, false);
    s.flaskSlots[1] = newFlask(s, 'life_sacred', 80, true);
    s.alchemy.vials = [
      { id: 'v1', infusion: 'cleansing', strength: 1, strain: 'sunpetal' },
      { id: 'v2', infusion: 'instant', strength: 1, strain: 'sunpetal' },
      { id: 'v3', infusion: 'last_breath', strength: 1, strain: 'wraithlily' },
      { id: 'v4', infusion: 'onslaught', strength: 1.3, strain: 'emberroot|radiant' },
    ];

    expect(pourVial(s, 0, 2, 0)).toMatch(/only holds 2/);
    expect(pourVial(s, 0, 0, 2)).toMatch(/Grand flask/);
    expect(pourVial(s, 0, 0, 0)).toBeNull();
    expect(s.flaskSlots[0]!.infusions![0].id).toBe('cleansing');
    // Pouring into slot 0 again replaces cleansing
    expect(pourVial(s, 0, 0, 2)).toBeNull();
    expect(s.flaskSlots[0]!.infusions![0].id).toBe('onslaught');

    // Grand flask accepts grand-only infusion in slot 2
    expect(pourVial(s, 1, 0, 1)).toBeNull(); // last_breath
    expect(s.flaskSlots[1]!.infusions![0].id).toBe('last_breath');
  });

  it('applies infusion effects in combat stats, duration, cleansing, instant recovery and prism sharing', () => {
    const s = newGame(2);
    const f0 = newFlask(s, 'life_grand', 40, true);
    f0.charges = 30;
    f0.infusions = [
      { id: 'cleansing', strength: 1, strain: 'sunpetal' },
      { id: 'instant', strength: 1, strain: 'sunpetal' },
      { id: 'lingering', strength: 1, strain: 'glimmermoss' },
    ];
    const f1 = newFlask(s, 'granite', 40, false);
    f1.charges = 30;
    f1.infusions = [
      { id: 'onslaught', strength: 1.5, strain: 'emberroot' },
      { id: 'prism', strength: 1, strain: 'sunpetal|prismatic' },
    ];
    s.flaskSlots[0] = f0;
    s.flaskSlots[1] = f1;

    // Lingering increases duration by 20%
    const plainDur = flaskStats(newFlask(s, 'life_grand', 40)).durationMs;
    expect(flaskStats(f0).durationMs).toBeGreaterThan(plainDur);

    // Stats include Onslaught
    const stats = flaskInfusionBuffStats(s, f1);
    expect(stats.attackSpeedPct).toBeCloseTo(12, 1);

    // Combat: cleansing clears bleed/poison, instant heals immediately
    const c = makeCtx(seeded(1));
    startCombat(s, c, 'mudflats');
    const d = deriveStats(s);
    s.life = Math.max(1, d.maxLife - 200);
    s.combat!.playerDots = [
      { kind: 'bleed', dps: 5, remainingMs: 4000, dealt: 0, gemId: 'monster' },
      { kind: 'poison', dps: 5, remainingMs: 4000, dealt: 0, gemId: 'monster' },
    ];
    expect(useFlask(s, c, 0)).toBeNull();
    expect(s.combat!.playerDots).toEqual([]);
    expect(s.life).toBeGreaterThan(d.maxLife - 200);
  });

  it('runs the infusion brew queue offline, advances ranks, and unlocks giga-rare infusions', () => {
    const s = newGame(3);
    s.skills.alchemy = xpToReach('alchemy', 30);
    s.foraging.strainHerbs['sunpetal|celestial'] = 40;
    expect(queueInfusion(s, 'cleansing', 'sunpetal|celestial')).toBeNull();
    expect(startSkillAction(s, makeCtx(seeded(1)), 'brew_infusion')).toBeNull();

    simulateOffline(s, makeCtx(seeded(2)), INFUSION_BREW_MS + 5_000);
    expect(s.alchemy.vials.length).toBe(1);
    expect(s.alchemy.awayVials.length).toBe(1);
    expect(s.alchemy.vials[0].strength).toBeCloseTo(1.75, 4);
    expect(s.alchemy.unlockedRare).toContain('starfall');

    // Rank progression: 6 brews reach rank 2
    s.storage.bank.sunpetal = 200;
    for (let i = 0; i < 5; i++) {
      queueInfusion(s, 'cleansing', 'sunpetal');
      finishQueuedInfusion(s, makeCtx(seeded(10 + i)));
    }
    expect(s.alchemy.ranks.cleansing.rank).toBe(2);
  });

  it('gates Grand flask recipes on Lv 80 and 10 Flawless bars, and brews Sacred/Sulphur from herbs', () => {
    const s = newGame(4);
    const sacred = actionDef('brew_life_sacred');
    expect(sacred.inputs?.emberroot).toBe(9);
    expect(sacred.inputs?.ember_reduction).toBeUndefined();
    const sulphur = actionDef('brew_sulphur');
    expect(sulphur.inputs?.voidbloom).toBe(9);

    const grand = actionDef('grand_life_sacred');
    s.skills.alchemy = xpToReach('alchemy', 80);
    s.account.hideout.alchemy_table = 3;
    s.storage.bank.emberroot = 50;
    s.storage.bank.yew_log = 20;
    expect(actionBlocker(s, grand)).toMatch(/Flawless bars/);
    s.storage.bank.copper_bar_flawless = 10;
    expect(actionBlocker(s, grand)).toBeNull();
  });

  it('migrates v61 saves to initialize alchemy state and empty flask infusions', () => {
    const s = newGame(5);
    const raw = JSON.parse(serialize(s));
    raw.version = 61;
    delete raw.alchemy;
    if (raw.flaskSlots[0]) delete raw.flaskSlots[0].infusions;

    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.alchemy).toEqual({ queue: [], vials: [], ranks: {}, unlockedRare: [], awayVials: [], awayRankUps: [] });
    if (loaded.flaskSlots[0]) expect(loaded.flaskSlots[0].infusions).toEqual([]);
  });
});
