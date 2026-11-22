import { describe, expect, it } from 'vitest';
import { SITES, siteOfAction } from '../src/data/expedition';
import { HEIST_JOBS } from '../src/data/heist';
import { ACTIONS, actionDef } from '../src/data/skills';
import { isDelveAction } from '../src/engine/delve';
import { ZONES } from '../src/data/zones';
import { makeCtx } from '../src/engine/context';
import { alarmChance, heistStep, roomMs } from '../src/engine/heist';
import { focusMult, maxFocusSpeed } from '../src/engine/minigame';
import { simulateOffline } from '../src/engine/offline';
import { seeded, type Rng } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction, stopAction } from '../src/engine/skills';
import {
  globalMasteryBonuses,
  grantMasteryPractice,
  MASTERY_CAP,
  masteryLevel,
  masteryProgress,
  masteryThreshold,
  totalMasteryLevels,
  unlockedMilestones,
} from '../src/engine/skillingMastery';
import { newGame, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';

const zero: Rng = { next: () => 0 };

function start(id: string, amount = 1_000_000) {
  const s = newGame(1);
  const a = actionDef(id);
  s.skills[a.skill] = 1e12;
  s.unlockedZones = ZONES.map((z) => z.id);
  s.account.hideout.forge = 7;
  s.account.hideout.alchemy_table = 5;
  for (const material of Object.keys(a.inputs ?? {})) s.storage.bank[material] = amount;
  const ctx = makeCtx(seeded(1));
  expect(startSkillAction(s, ctx, id)).toBeNull();
  return { s, ctx, a };
}

describe('non-combat action mastery', () => {
  it('has one track per eligible task, with only bulk recipes sharing', () => {
    const eligible = ACTIONS.filter((a) => a.skill !== 'fishing' && !a.soon && !siteOfAction(a.id) && !isDelveAction(a.id));
    expect(eligible.every((a) => !!a.mastery)).toBe(true);
    expect(HEIST_JOBS.every((j) => !!j.mastery)).toBe(true);
    const ids = new Set([...eligible.map((a) => a.mastery!.id), ...HEIST_JOBS.map((j) => j.mastery!.id)]);
    const tasks = new Set([...eligible.map((a) => a.batchOf ?? a.id), ...HEIST_JOBS.map((j) => `heist.${j.id}`)]);
    expect(ids.size).toBe(tasks.size);
    expect(ACTIONS.filter((a) => a.skill === 'combat' || a.skill === 'fishing' || !!siteOfAction(a.id) || isDelveAction(a.id)).every((a) => !a.mastery)).toBe(true);
    expect(SITES.every((site) => !actionDef(site.id).mastery)).toBe(true);
  });

  it('uses the authored curve, caps safely, and preserves unknown ids', () => {
    const s = newGame(1);
    const id = actionDef('mine_copper').mastery!.id;
    expect(masteryLevel(s, id)).toBe(1);
    s.skillingMastery[id] = masteryThreshold(50);
    expect(masteryLevel(s, id)).toBe(50);
    expect(masteryProgress(s, id)).toBeCloseTo(49 / 99);
    expect(grantMasteryPractice(s, actionDef('mine_copper').mastery, 1e9)).toBeGreaterThan(0);
    expect(s.skillingMastery[id]).toBe(MASTERY_CAP);
    s.skillingMastery['future.renamed_band'] = 123;
    const back = deserialize(serialize(s));
    expect(back.skillingMastery['future.renamed_band']).toBe(123);
  });

  it('credits nominal completed work once, including failed gathering yields, but not cancellation', () => {
    const { s, a } = start('mine_scorched');
    const ctx = makeCtx({ next: () => 0.99 }); // misses the ordinary output and all bonuses
    skillStep(s, ctx, actionIntervalMs(s, a, deriveStats(s)), deriveStats(s));
    expect(s.storage.bank.copper_ore ?? 0).toBe(0);
    expect(s.skillingMastery[a.mastery!.id]).toBe(a.intervalMs / 1000);
    stopAction(s);
    expect(s.skillingMastery[a.mastery!.id]).toBe(a.intervalMs / 1000);
  });

  it('adds mastery speed to the existing increased-speed category without changing zero-mastery results', () => {
    const a = actionDef('mine_copper');
    const plain = newGame(1);
    const trained = newGame(1);
    trained.skillingMastery[a.mastery!.id] = MASTERY_CAP;
    const base = actionIntervalMs(plain, a, deriveStats(plain));
    expect(actionIntervalMs(trained, a, deriveStats(trained))).toBeCloseTo(base / 1.12);

    const left = start('mine_copper');
    const right = start('mine_copper');
    skillStep(left.s, left.ctx, base, deriveStats(left.s));
    skillStep(right.s, right.ctx, base, deriveStats(right.s));
    expect(left.s.storage.bank).toEqual(right.s.storage.bank);
  });

  it('only adds stochastic ordinary gathering yield and never duplicates rare rolls', () => {
    // Before milestone unlocks (level 20)
    const sub = start('mine_copper');
    sub.s.skillingMastery[sub.a.mastery!.id] = masteryThreshold(20);
    const subCtx = makeCtx(zero);
    skillStep(sub.s, subCtx, actionIntervalMs(sub.s, sub.a, deriveStats(sub.s)), deriveStats(sub.s));
    expect(sub.s.storage.bank.copper_ore).toBe(2); // one base, one stochastic extra
    const subRough = Object.entries(sub.s.storage.bank).filter(([k]) => k === 'rough_gem' || k.startsWith('rough_gem_')).reduce((a, [, n]) => a + n, 0);
    expect(subRough).toBe(1); // rare roll is exactly one

    // At MASTERY_CAP (level 100), unlocked Vein Strike and Dense Seam milestone procs activate
    const { s, a } = start('mine_copper');
    s.skillingMastery[a.mastery!.id] = MASTERY_CAP;
    const ctx = makeCtx(zero);
    skillStep(s, ctx, actionIntervalMs(s, a, deriveStats(s)), deriveStats(s));
    expect(s.storage.bank.copper_ore).toBe(4); // base + stochastic + Vein Strike proc + Dense Seam proc
    const fullRough = Object.entries(s.storage.bank).filter(([k]) => k === 'rough_gem' || k.startsWith('rough_gem_')).reduce((a, [, n]) => a + n, 0);
    expect(fullRough).toBe(1); // the rare roll is still exactly one
  });

  it('conserves only paid ordinary production inputs after existing rules', () => {
    const { s, a } = start('smelt_copper', 5);
    s.skillingMastery[a.mastery!.id] = MASTERY_CAP;
    const ctx = makeCtx(zero);
    skillStep(s, ctx, actionIntervalMs(s, a, deriveStats(s)), deriveStats(s));
    expect(s.storage.bank.copper_ore).toBe(1); // stochastic save of one from the five paid
    expect(s.storage.bank.copper_bar_crude).toBe(2); // Lv 50 Pure Slag copies the bar's rolled grade

    const key = start('smith_marrow_key', 8);
    key.s.storage.bank.dense_fossil = 2;
    key.s.storage.bank.serrated_fossil = 2;
    key.s.skillingMastery[key.a.mastery!.id] = MASTERY_CAP;
    const keyCtx = makeCtx(zero);
    skillStep(key.s, keyCtx, actionIntervalMs(key.s, key.a, deriveStats(key.s)), deriveStats(key.s));
    expect(key.s.storage.bank.mithril_bar).toBe(1); // 12% conservation of 8 bars saves 1 bar
    expect(key.s.storage.bank.dense_fossil).toBe(0);
    expect(key.s.storage.bank.serrated_fossil).toBe(0);
  });

  it('shares bulk recipe tracks but keeps every other action and recipe separate', () => {
    expect(actionDef('orb_transmute').mastery!.id).toBe(actionDef('orb_transmute_x10').mastery!.id);
    expect(actionDef('carve_rune_ember_1').mastery!.id).not.toBe(actionDef('carve_rune_ember_4').mastery!.id);
    const weapons = ACTIONS.filter((a) => a.baseId && a.level < 10);
    expect(new Set(weapons.map((a) => a.mastery!.id)).size).toBe(weapons.length);
    expect(new Set(HEIST_JOBS.map((j) => j.mastery!.id)).size).toBe(HEIST_JOBS.length);
  });

  it('awards each resolved Heist room once, including an alarm outcome', () => {
    const s = newGame(1);
    const job = HEIST_JOBS[0];
    s.action = { kind: 'heist', jobId: job.id, room: 1, lastRoom: job.rooms, progress: 0, take: {} };
    const ctx = makeCtx(zero);
    heistStep(s, ctx, roomMs(s, job, deriveStats(s)), deriveStats(s));
    expect(s.skillingMastery[job.mastery!.id]).toBe(job.roomMs / 1000);
    expect(s.heist.tally.alarms).toBe(1);
  });

  it('earns equal practice for equal completed work live and offline', () => {
    const live = start('mine_copper');
    const away = start('mine_copper');
    tick(live.s, live.ctx, 60_000);
    const summary = simulateOffline(away.s, away.ctx, 60_000);
    const id = live.a.mastery!.id;
    expect(away.s.skillingMastery[id]).toBe(live.s.skillingMastery[id]);
    expect(summary.mastery[id]).toBe(away.s.skillingMastery[id]);
  });

  it('never lets future conservation finance a start or mastery gate content', () => {
    const s = newGame(1);
    const a = actionDef('smelt_copper');
    s.skillingMastery[a.mastery!.id] = MASTERY_CAP;
    s.storage.bank.copper_ore = 4;
    expect(actionBlocker(s, a)).toBe('Missing materials');
  });

  it('repairs malformed saved counters without inferring historical practice', () => {
    const raw = JSON.parse(serialize(newGame(1)));
    raw.skillingMastery = { good: 40, negative: -5, infinite: Infinity, huge: 1e9 };
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.skillingMastery).toEqual({ good: 40, negative: 0, infinite: 0, huge: MASTERY_CAP });

    delete raw.skillingMastery;
    raw.version = 37;
    expect(deserialize(JSON.stringify(raw)).skillingMastery).toEqual({});
  });

  it('migrates each old band percentage onto every task it previously benefited', () => {
    const raw = JSON.parse(serialize(newGame(1)));
    raw.version = 41;
    raw.skillingMastery = {
      'mining.copper': 18_000,
      'alchemy.orbs': 9_000,
      'heist.street': 36_000,
    };
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.skillingMastery[actionDef('delve_copper').mastery!.id]).toBe(MASTERY_CAP / 2);
    expect(loaded.skillingMastery[actionDef('delve_iron').mastery!.id]).toBeUndefined();
    expect(loaded.skillingMastery[actionDef('orb_transmute').mastery!.id]).toBe(MASTERY_CAP / 4);
    expect(actionDef('orb_transmute_x10').mastery!.id).toBe(actionDef('orb_transmute').mastery!.id);
    expect(loaded.skillingMastery[HEIST_JOBS[0].mastery!.id]).toBe(MASTERY_CAP);
    expect(loaded.skillingMastery[HEIST_JOBS[1].mastery!.id]).toBe(MASTERY_CAP);
    expect(loaded.skillingMastery[HEIST_JOBS[3].mastery!.id]).toBeUndefined();
  });

  it('unlocks 25, 50, 75, 100 milestone perks with sub-category personalities', () => {
    const s = newGame(1);
    const ore = actionDef('mine_copper').mastery!;
    const cosmic = actionDef('mine_crystal_star').mastery!;
    const lifeFlask = actionDef('brew_life_small').mastery!;
    const utilFlask = actionDef('brew_granite').mastery!;

    // Milestone counts
    expect(ore.milestones.length).toBe(4);
    expect(ore.milestones.map((m) => m.level)).toEqual([25, 50, 75, 100]);

    // Sub-category personalities
    expect(lifeFlask.milestones[0].kind).toBe('flask_charges');
    expect(utilFlask.milestones[0].kind).toBe('flask_duration');
    expect(cosmic.milestones[0].name).toBe('Astral Strike');
    expect(ore.milestones[0].name).toBe('Vein Strike');

    // Threshold unlocking
    expect(unlockedMilestones(s, ore).length).toBe(0);
    s.skillingMastery[ore.id] = masteryThreshold(25);
    expect(unlockedMilestones(s, ore).length).toBe(1);
    expect(unlockedMilestones(s, ore)[0].name).toBe('Vein Strike');

    s.skillingMastery[ore.id] = masteryThreshold(50);
    expect(unlockedMilestones(s, ore).length).toBe(2);

    s.skillingMastery[ore.id] = masteryThreshold(75);
    expect(unlockedMilestones(s, ore).length).toBe(3);
    expect(unlockedMilestones(s, ore)[2].scope).toBe('global');

    s.skillingMastery[ore.id] = MASTERY_CAP;
    expect(unlockedMilestones(s, ore).length).toBe(4);
  });

  it('aggregates global profession perks from 75/100 milestones across that skill', () => {
    const s = newGame(1);
    const copper = actionDef('mine_copper').mastery!;
    const iron = actionDef('mine_iron').mastery!;

    expect(globalMasteryBonuses(s, 'mining').speed).toBe(0);

    // Lv 75 on copper gives +2% global mining speed
    s.skillingMastery[copper.id] = masteryThreshold(75);
    expect(globalMasteryBonuses(s, 'mining').speed).toBe(2);

    // Lv 75 on iron adds another +2% global mining speed (total 4%)
    s.skillingMastery[iron.id] = masteryThreshold(75);
    expect(globalMasteryBonuses(s, 'mining').speed).toBe(4);

    // Unrelated skill is unaffected
    expect(globalMasteryBonuses(s, 'woodcutting').speed).toBe(0);
  });

  it('applies recipe personality bonuses to flasks, heist alarms, and meal durations', () => {
    const s = newGame(1);
    const life = actionDef('brew_life_small');
    const job = HEIST_JOBS[0];

    // Heist Lv 50 alarm mitigation
    const baseAlarm = alarmChance(s, job, 1);
    s.skillingMastery[job.mastery!.id] = masteryThreshold(50);
    const mitigatedAlarm = alarmChance(s, job, 1);
    expect(mitigatedAlarm).toBeCloseTo(baseAlarm * 0.85);

    // Alchemy Life flask extra charges
    s.skillingMastery[life.mastery!.id] = masteryThreshold(25);
    const { s: brewState, ctx, a } = start('brew_life_small', 100);
    brewState.skillingMastery[life.mastery!.id] = masteryThreshold(25);
    skillStep(brewState, ctx, actionIntervalMs(brewState, a, deriveStats(brewState)), deriveStats(brewState));
    const crafted = brewState.storage.flaskStash.find((f) => f.flaskId === 'life_small');
    expect(crafted).toBeDefined();
    expect(crafted!.extraCharges).toBe(1);
  });

  it('records thematic mastery milestone procs in offline summaries', () => {
    const away = start('mine_copper');
    away.s.skillingMastery[away.a.mastery!.id] = MASTERY_CAP;
    const summary = simulateOffline(away.s, away.ctx, 60_000);
    expect(summary.masteryProcs).toBeDefined();
    expect(Object.keys(summary.masteryProcs!).length).toBeGreaterThan(0);
  });

  it('increases skilling minigame max focus speed by 0.01% per mastery level in that skill', () => {
    const s = newGame(1);
    const copper = actionDef('mine_copper').mastery!;
    const iron = actionDef('mine_iron').mastery!;
    const ash = actionDef('giant_ash').mastery!;

    // Initial state: no practice -> max focus speed is baseline 45% (0.45)
    expect(totalMasteryLevels(s, 'mining')).toBe(0);
    expect(maxFocusSpeed(s, 'mining')).toBeCloseTo(0.45);

    // Practice > 0 at level 1 adds 1 level (+0.01% -> +0.0001)
    s.skillingMastery[copper.id] = 10;
    expect(totalMasteryLevels(s, 'mining')).toBe(1);
    expect(maxFocusSpeed(s, 'mining')).toBeCloseTo(0.45 + 0.0001);

    // Copper at Level 50 adds 50 levels (+0.50% -> +0.005)
    s.skillingMastery[copper.id] = masteryThreshold(50);
    expect(totalMasteryLevels(s, 'mining')).toBe(50);
    expect(maxFocusSpeed(s, 'mining')).toBeCloseTo(0.45 + 0.005);

    // Copper at Level 100 adds 100 levels (+1.00% -> +0.01)
    s.skillingMastery[copper.id] = MASTERY_CAP;
    expect(totalMasteryLevels(s, 'mining')).toBe(100);
    expect(maxFocusSpeed(s, 'mining')).toBeCloseTo(0.46);

    // Adding Iron at Level 75 adds 75 levels (total 175 levels -> +1.75%)
    s.skillingMastery[iron.id] = masteryThreshold(75);
    expect(totalMasteryLevels(s, 'mining')).toBe(175);
    expect(maxFocusSpeed(s, 'mining')).toBeCloseTo(0.45 + 0.0175);

    // Unrelated skill (woodcutting) masteries don't affect mining minigame
    s.skillingMastery[ash.id] = MASTERY_CAP;
    expect(totalMasteryLevels(s, 'mining')).toBe(175);
    expect(maxFocusSpeed(s, 'mining')).toBeCloseTo(0.45 + 0.0175);
    expect(totalMasteryLevels(s, 'woodcutting')).toBe(100);
    expect(maxFocusSpeed(s, 'woodcutting')).toBeCloseTo(0.46);

    // focusMult reflects the increased max speed when focus is full
    s.action = { kind: 'skill', actionId: 'mine_copper', progress: 0, focus: 1 };
    expect(focusMult(s)).toBeCloseTo(1 + 0.45 + 0.0175);
  });
});
