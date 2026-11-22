import { describe, expect, it } from 'vitest';
import { HEIST_JOBS, heistJob, PREP_CAP, prepBoard, prepId, rogueRankCost, type PrepKind } from '../src/data/heist';
import { actionsFor } from '../src/data/skills';
import type { Ctx } from '../src/engine/context';
import { alarmChance, canStartJob, heistStep, prepChance, prepHeld, prepMark, rollPrep, roomMs, setPlannedJob, startHeist, stopHeistRepeat } from '../src/engine/heist';
import { retireMarkers } from '../src/engine/save';
import { seeded, type Rng } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame, SAVE_VERSION, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';

const fixed = (v: number): Ctx => ({ rng: { next: () => v } as Rng, now: 0, emit: () => {} });
const ctx = (seed = 1): Ctx => ({ rng: seeded(seed), now: 0, emit: () => {} });

function thief(level: number): GameState {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  delete s.heist.roster;
  s.heist.crew = [];
  s.skills.thieving = xpForLevel(level);
  for (const j of HEIST_JOBS) s.professionProgress.discoveries[`heist_clean_${j.id}`] = true;
  return s;
}

const hold = (s: GameState, jobId: string, ...kinds: PrepKind[]) => {
  for (const k of kinds) s.heist.prep[prepId(jobId, k)] = 1;
};

function clearRoom(s: GameState, c: Ctx): void {
  if (s.action?.kind !== 'heist') throw new Error('no job under way');
  s.action.progress = 1e9;
  heistStep(s, c, 1, deriveStats(s));
}

describe('prep drops', () => {
  it('a finished mark rolls 5% per prep item it supplies, and never goes past 3', () => {
    const s = thief(1);
    const peddler = actionsFor('thieving').find((a) => a.id === 'mark_peddler')!;
    expect(prepChance(s, 'mark_peddler')).toBeCloseTo(0.05);
    rollPrep(s, fixed(0.99), peddler);
    expect(s.heist.prep).toEqual({});
    for (let i = 0; i < 10; i++) rollPrep(s, fixed(0), peddler);
    expect(s.heist.prep[prepId('cinder_toll', 'key')]).toBe(PREP_CAP);
    expect(s.heist.prep[prepId('cinder_toll', 'plan')]).toBe(PREP_CAP);
    // the Peddler supplies nothing for Salt Tithe, and a level 1 thief doesn't meet its level anyway
    expect(s.heist.prep[prepId('salt_tithe', 'key')]).toBeUndefined();
  });

  it("doubles for Fence's Runner and Khanate Quartermaster, and rises with Ilke", () => {
    const s = thief(30);
    expect(prepChance(s, 'mark_runner')).toBeCloseTo(0.1);
    expect(prepChance(s, 'mark_quartermaster')).toBeCloseTo(0.1);
    s.heist.rogues.cutpurse = 2;
    s.heist.crew = ['cutpurse'];
    expect(prepChance(s, 'mark_peddler')).toBeCloseTo(0.05 * 1.2);
  });

  it('only rolls for jobs whose level you meet', () => {
    const s = thief(1);
    const runner = actionsFor('thieving').find((a) => a.id === 'mark_runner')!;
    rollPrep(s, fixed(0), runner);
    expect(s.heist.prep).toEqual({});
    s.skills.thieving = xpForLevel(8);
    rollPrep(s, fixed(0), runner);
    expect(s.heist.prep[prepId('salt_tithe', 'uniform')]).toBe(1);
    expect(s.heist.prep[prepId('forgers_den', 'ledger')]).toBeUndefined();
  });

  it('marks no longer drop Markers', () => {
    for (const a of actionsFor('thieving')) expect(a.bonus?.some((b) => b.id === 'rogues_marker') ?? false).toBe(false);
    for (const j of HEIST_JOBS) for (const d of [...j.drops, ...j.vault]) expect(d.id).not.toBe('rogues_marker');
  });

  it('works offline too', () => {
    const s = thief(1);
    const c: Ctx = { ...fixed(0), offline: true };
    const peddler = actionsFor('thieving').find((a) => a.id === 'mark_peddler')!;
    rollPrep(s, c, peddler);
    expect(s.heist.prep[prepId('cinder_toll', 'key')]).toBe(1);
  });
});

describe('starting a job', () => {
  it('needs the minimum number of different board items', () => {
    const s = thief(1);
    expect(canStartJob(s, 'cinder_toll')).toBe('Needs 2 of these');
    hold(s, 'cinder_toll', 'key');
    s.heist.prep[prepId('cinder_toll', 'key')] = 3;
    expect(canStartJob(s, 'cinder_toll')).toBe('Needs 2 of these');
    hold(s, 'cinder_toll', 'plan');
    expect(canStartJob(s, 'cinder_toll')).toBeNull();
    expect(prepBoard('pyre_vault').min).toBe(3);
  });

  it('uses every board item held, one each', () => {
    const s = thief(1);
    hold(s, 'cinder_toll', 'key', 'patrol', 'plan');
    s.heist.prep[prepId('cinder_toll', 'key')] = 2;
    expect(startHeist(s, fixed(0.99), 'cinder_toll')).toBeNull();
    stopHeistRepeat(s);
    expect(s.action?.kind === 'heist' && s.action.prep).toEqual(['key', 'patrol', 'plan']);
    expect(prepHeld(s, 'cinder_toll')).toEqual({ key: 1, patrol: 0, plan: 0 });
  });

  it('never reads a Marker cost', () => {
    const s = thief(1);
    s.storage.bank.rogues_marker = 1000;
    expect(canStartJob(s, 'cinder_toll')).toBe('Needs 2 of these');
    expect(startHeist(s, ctx(), 'cinder_toll')).toBeNull();
    expect(s.action?.kind).toBe('skill');
    expect(s.storage.bank.rogues_marker).toBe(1000);
  });

  it('rank costs are gold only now', () => {
    expect(Object.keys(rogueRankCost(3))).toEqual(['gold']);
  });
});

describe('prep effects in a run', () => {
  it('Key: the vault takes no time and cannot raise an alarm', () => {
    const s = thief(1);
    hold(s, 'cinder_toll', 'key', 'plan');
    startHeist(s, fixed(0.0001), 'cinder_toll');
    stopHeistRepeat(s);
    const job = heistJob('cinder_toll');
    expect(alarmChance(s, job, 3)).toBe(0);
    expect(alarmChance(s, job, 2)).toBeGreaterThan(0);
    if (s.action?.kind !== 'heist') throw new Error('no job');
    s.action.room = 3;
    s.action.progress = 0;
    heistStep(s, fixed(0.0001), 1, deriveStats(s));
    expect(s.action).toBeNull();
    expect(s.heist.tally).toEqual({ jobs: 1, alarms: 0 });
  });

  it('Ledger: adds a hidden room before the vault', () => {
    const s = thief(8);
    hold(s, 'salt_tithe', 'ledger', 'key');
    startHeist(s, fixed(0.99), 'salt_tithe');
    stopHeistRepeat(s);
    const job = heistJob('salt_tithe');
    if (s.action?.kind !== 'heist') throw new Error('no job');
    expect(s.action.lastRoom).toBe(job.rooms + 1);
    for (let i = 0; i < job.rooms; i++) clearRoom(s, fixed(0.99));
    expect(s.action?.kind).toBe('heist');
    clearRoom(s, fixed(0.99));
    expect(s.action).toBeNull();
    expect(s.heist.tally).toEqual({ jobs: 1, alarms: 0 });
  });

  it('Ledger: the hidden room rolls the vault table at 50%', () => {
    const s = thief(8);
    hold(s, 'salt_tithe', 'ledger', 'uniform');
    startHeist(s, fixed(0.45), 'salt_tithe');
    stopHeistRepeat(s);
    const job = heistJob('salt_tithe');
    const before = s.storage.bank.gold ?? 0;
    // vault table is 180 gold at chance 1: 0.5 × 1 passes a 0.45 roll in the hidden room, and the vault always pays
    for (let i = 0; i < job.rooms + 1; i++) clearRoom(s, fixed(0.45));
    const base = job.gold * (1 + 2 + 3 + 3 + 4);
    expect((s.storage.bank.gold ?? 0) - before).toBeGreaterThanOrEqual(base + 180 * 2);
  });

  it('Patrol schedule: alarm chance -40% in every room', () => {
    const s = thief(1);
    const job = heistJob('cinder_toll');
    const plain = alarmChance(s, job, 2);
    hold(s, 'cinder_toll', 'patrol', 'plan');
    startHeist(s, fixed(0.99), 'cinder_toll');
    stopHeistRepeat(s);
    expect(alarmChance(s, job, 2)).toBeCloseTo(plain * 0.6);
    expect(alarmChance(s, job, 1)).toBeCloseTo(alarmChance(thief(1), job, 1) * 0.6);
  });

  it('Uniform: room time -30%', () => {
    const s = thief(8);
    const job = heistJob('salt_tithe');
    const plain = roomMs(s, job, deriveStats(s));
    hold(s, 'salt_tithe', 'uniform', 'key');
    startHeist(s, fixed(0.99), 'salt_tithe');
    stopHeistRepeat(s);
    expect(roomMs(s, job, deriveStats(s))).toBeCloseTo(plain * 0.7);
  });

  it('Floor plan: take +25%', () => {
    const s = thief(1);
    hold(s, 'cinder_toll', 'plan', 'patrol');
    startHeist(s, fixed(0.99), 'cinder_toll');
    stopHeistRepeat(s);
    clearRoom(s, fixed(0.99));
    if (s.action?.kind !== 'heist') throw new Error('no job');
    expect(s.action.take.gold).toBe(Math.round(15 * 1.25));
  });
});

describe('planned job and auto-run', () => {
  it('works the cheapest mark that supplies a missing board item, then starts when the minimum is held', () => {
    const s = thief(20);
    expect(startHeist(s, ctx(), 'forgers_den')).toBeNull();
    expect(s.heist.planned).toBe('forgers_den');
    expect(s.action?.kind === 'skill' && s.action.actionId).toBe('mark_hauler');
    hold(s, 'forgers_den', 'plan');
    tick(s, ctx(), 100);
    expect(s.action?.kind === 'skill' && s.action.actionId).toBe('mark_runner');
    hold(s, 'forgers_den', 'ledger');
    tick(s, ctx(), 100);
    expect(s.action?.kind).toBe('heist');
    expect(s.heist.prep[prepId('forgers_den', 'plan')]).toBe(0);
  });

  it('picks the next missing mark between runs', () => {
    const s = thief(20);
    hold(s, 'forgers_den', 'plan', 'ledger');
    expect(prepMark(s, 'forgers_den')?.id).toBe('mark_outrider');
    s.heist.exits.forgers_den = 1;
    startHeist(s, fixed(0.99), 'forgers_den');
    expect(s.action?.kind).toBe('heist');
    // the run used the items; auto now goes looking for them again
    while (s.action?.kind === 'heist') clearRoom(s, fixed(0.99));
    expect(s.action?.kind).toBe('skill');
    expect(s.action?.kind === 'skill' && s.action.actionId).toBe('mark_hauler');
  });

  it('can be cleared', () => {
    const s = thief(1);
    startHeist(s, ctx(), 'cinder_toll');
    expect(setPlannedJob(s, null)).toBeNull();
    expect(s.heist.planned).toBeNull();
    expect(s.heist.auto).toBeNull();
  });
});

describe('Marker conversion', () => {
  const raw = (markers: number, level: number, discoveries: Record<string, true> = {}) => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    s.skills.thieving = xpForLevel(level);
    s.storage.bank.rogues_marker = markers;
    s.professionProgress.discoveries = discoveries;
    const r = JSON.parse(serialize(s)) as Record<string, unknown>;
    delete (r.heist as Record<string, unknown>).prep;
    delete (r.heist as Record<string, unknown>).planned;
    (r.heist as Record<string, unknown>).auto = 'cinder_toll';
    return r;
  };

  it('gives 1 prep per 10 Markers on the top job, and 15 gold for each one left over', () => {
    const r = raw(47, 1);
    const goldBefore = (r.storage as { bank: Record<string, number> }).bank.gold ?? 0;
    retireMarkers(r);
    const heist = r.heist as { prep: Record<string, number>; planned: string; notice: string };
    // Cinder Toll is the only job open: key, patrol, plan in turn
    expect(heist.prep).toEqual({ prep_cinder_toll_key: 2, prep_cinder_toll_patrol: 1, prep_cinder_toll_plan: 1 });
    const bank = (r.storage as { bank: Record<string, number> }).bank;
    expect(bank.rogues_marker).toBeUndefined();
    expect(bank.gold).toBe(goldBefore + 7 * 15);
    expect(heist.planned).toBe('cinder_toll');
    expect(heist.notice).toBe("Rogue's Markers are retired. Your 47 Markers became 4 prep and 105 gold.");
  });

  it('caps at 3 of each and turns the rest into gold', () => {
    const r = raw(500, 1);
    const goldBefore = (r.storage as { bank: Record<string, number> }).bank.gold ?? 0;
    retireMarkers(r);
    const heist = r.heist as { prep: Record<string, number> };
    expect(Object.values(heist.prep)).toEqual([3, 3, 3]);
    expect((r.storage as { bank: Record<string, number> }).bank.gold).toBe(goldBefore + (500 - 90) * 15);
  });

  it('runs through a full load and leaves the save at the current version', () => {
    const r = raw(100, 8, { heist_clean_cinder_toll: true as const });
    r.version = 51;
    const s = deserialize(JSON.stringify(r));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.storage.bank.rogues_marker ?? 0).toBe(0);
    // Salt Tithe is the top job: ledger, uniform, key
    expect(s.heist.prep).toEqual({ prep_salt_tithe_ledger: 3, prep_salt_tithe_uniform: 3, prep_salt_tithe_key: 3 });
    expect(s.heist.planned).toBe('cinder_toll');
  });

  it('is skipped for a save that already has prep', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    s.storage.bank.rogues_marker = 50;
    const back = deserialize(serialize(s));
    expect(back.heist.prep).toEqual({});
    expect(back.storage.bank.rogues_marker).toBe(50);
  });
});
