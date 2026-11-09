import { describe, expect, it } from 'vitest';
import { HEIST_JOBS } from '../src/data/heist';
import { ACTIONS, actionDef } from '../src/data/skills';
import { ZONES } from '../src/data/zones';
import { makeCtx } from '../src/engine/context';
import { heistStep, roomMs } from '../src/engine/heist';
import { simulateOffline } from '../src/engine/offline';
import { seeded, type Rng } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction, stopAction } from '../src/engine/skills';
import {
  MASTERY_CAP,
  grantMasteryPractice,
  masteryLevel,
  masteryProgress,
  masteryThreshold,
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
  for (const material of Object.keys(a.inputs ?? {})) s.account.bank[material] = amount;
  const ctx = makeCtx(seeded(1));
  expect(startSkillAction(s, ctx, id)).toBeNull();
  return { s, ctx, a };
}

describe('non-combat action mastery', () => {
  it('has one track per eligible task, with only bulk recipes sharing', () => {
    const eligible = ACTIONS.filter((a) => a.skill !== 'fishing' && !a.soon);
    expect(eligible.every((a) => !!a.mastery)).toBe(true);
    expect(HEIST_JOBS.every((j) => !!j.mastery)).toBe(true);
    const ids = new Set([...eligible.map((a) => a.mastery!.id), ...HEIST_JOBS.map((j) => j.mastery!.id)]);
    const tasks = new Set([...eligible.map((a) => a.batchOf ?? a.id), ...HEIST_JOBS.map((j) => `heist.${j.id}`)]);
    expect(ids.size).toBe(tasks.size);
    expect(ACTIONS.filter((a) => a.skill === 'combat' || a.skill === 'fishing').every((a) => !a.mastery)).toBe(true);
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
    expect(s.account.bank.copper_ore ?? 0).toBe(0);
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
    expect(actionIntervalMs(trained, a, deriveStats(trained))).toBeCloseTo(base / 1.2);

    const left = start('mine_copper');
    const right = start('mine_copper');
    skillStep(left.s, left.ctx, base, deriveStats(left.s));
    skillStep(right.s, right.ctx, base, deriveStats(right.s));
    expect(left.s.account.bank).toEqual(right.s.account.bank);
  });

  it('only adds stochastic ordinary gathering yield and never duplicates rare rolls', () => {
    const { s, a } = start('mine_copper');
    s.skillingMastery[a.mastery!.id] = MASTERY_CAP;
    const ctx = makeCtx(zero);
    skillStep(s, ctx, actionIntervalMs(s, a, deriveStats(s)), deriveStats(s));
    expect(s.account.bank.copper_ore).toBe(2); // one base, one 8% stochastic extra
    expect(s.account.bank.rough_gem).toBe(1); // the rare roll is still exactly one
  });

  it('conserves only paid ordinary production inputs after existing rules', () => {
    const { s, a } = start('smelt_copper', 5);
    s.skillingMastery[a.mastery!.id] = MASTERY_CAP;
    const ctx = makeCtx(zero);
    skillStep(s, ctx, actionIntervalMs(s, a, deriveStats(s)), deriveStats(s));
    expect(s.account.bank.copper_ore).toBe(1); // stochastic save of one from the five paid
    expect(s.account.bank.copper_bar).toBe(1);

    const key = start('smith_marrow_key', 8);
    key.s.account.bank.dense_fossil = 2;
    key.s.account.bank.serrated_fossil = 2;
    key.s.skillingMastery[key.a.mastery!.id] = MASTERY_CAP;
    const keyCtx = makeCtx(zero);
    skillStep(key.s, keyCtx, actionIntervalMs(key.s, key.a, deriveStats(key.s)), deriveStats(key.s));
    expect(key.s.account.bank.mithril_bar).toBe(2);
    expect(key.s.account.bank.dense_fossil).toBe(0);
    expect(key.s.account.bank.serrated_fossil).toBe(0);
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

  it('earns equal practice for equal completed work live, offline and in the Greenhouse path', () => {
    const live = start('mine_copper');
    const away = start('mine_copper');
    tick(live.s, live.ctx, 60_000);
    const summary = simulateOffline(away.s, away.ctx, 60_000);
    const id = live.a.mastery!.id;
    expect(away.s.skillingMastery[id]).toBe(live.s.skillingMastery[id]);
    expect(summary.mastery[id]).toBe(away.s.skillingMastery[id]);

    const dormant = newGame(1);
    dormant.greenhouse = { actionId: 'herb_sun', progress: 0 };
    dormant.skillPassives = []; // no Greenhouse allocation means no background completions or practice
    tick(dormant, makeCtx(seeded(2)), 60_000);
    expect(dormant.skillingMastery).toEqual({});

    const greenhouse = newGame(1);
    greenhouse.greenhouse = { actionId: 'herb_sun', progress: 0 };
    greenhouse.skillPassives = ['harvesting_ks'];
    tick(greenhouse, makeCtx(seeded(2)), 60_000);
    expect(greenhouse.skillingMastery[actionDef('herb_sun').mastery!.id]).toBeGreaterThan(0);
  });

  it('never lets future conservation finance a start or mastery gate content', () => {
    const s = newGame(1);
    const a = actionDef('smelt_copper');
    s.skillingMastery[a.mastery!.id] = MASTERY_CAP;
    s.account.bank.copper_ore = 4;
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
    expect(loaded.skillingMastery[actionDef('mine_copper').mastery!.id]).toBe(MASTERY_CAP / 2);
    expect(loaded.skillingMastery[actionDef('mine_scorched').mastery!.id]).toBe(MASTERY_CAP / 2);
    expect(loaded.skillingMastery[actionDef('mine_iron').mastery!.id]).toBeUndefined();
    expect(loaded.skillingMastery[actionDef('orb_transmute').mastery!.id]).toBe(MASTERY_CAP / 4);
    expect(actionDef('orb_transmute_x10').mastery!.id).toBe(actionDef('orb_transmute').mastery!.id);
    expect(loaded.skillingMastery[HEIST_JOBS[0].mastery!.id]).toBe(MASTERY_CAP);
    expect(loaded.skillingMastery[HEIST_JOBS[1].mastery!.id]).toBe(MASTERY_CAP);
    expect(loaded.skillingMastery[HEIST_JOBS[3].mastery!.id]).toBeUndefined();
  });
});
