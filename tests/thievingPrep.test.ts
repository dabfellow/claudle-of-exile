import { describe, expect, it } from 'vitest';
import { COLLECTIBLES, thievingZoneForLevel } from '../src/data/collectibles';
import { HEIST_JOBS, heistJob, PREP_CAP, prepBoard, prepId, rogueRankCost, type PrepKind } from '../src/data/heist';
import { actionsFor } from '../src/data/skills';
import type { Ctx } from '../src/engine/context';
import { alarmChance, canStartJob, heistStep, jobBlocker, prepChance, prepHeld, prepMark, prepStrength, rollPrep, rollVaultMapPrep, roomMs, setPlannedJob, startHeist, stopHeistRepeat } from '../src/engine/heist';
import { actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
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

describe('Lv 60-90 progression, keepsakes & skill tree wiring', () => {
  it('supports Lv 60-90 marks, double prep on Shadow Broker, and Gilded Mint / Sovereign Vault gating', () => {
    const marks = actionsFor('thieving');
    expect(marks.map((m) => m.level)).toContain(60);
    expect(marks.map((m) => m.level)).toContain(68);
    expect(marks.map((m) => m.level)).toContain(75);
    expect(marks.map((m) => m.level)).toContain(82);
    expect(marks.map((m) => m.level)).toContain(90);

    const s = thief(90);
    expect(prepChance(s, 'mark_broker')).toBeCloseTo(0.1);
    delete s.professionProgress.discoveries['heist_clean_occult_treasury'];
    delete s.professionProgress.discoveries['heist_clean_gilded_mint'];
    expect(jobBlocker(s, heistJob('gilded_mint'))).toBe('Complete a clean exit from The Occult Treasury to unlock');
    s.professionProgress.discoveries['heist_clean_occult_treasury'] = true;
    expect(jobBlocker(s, heistJob('gilded_mint'))).toBeNull();
    expect(jobBlocker(s, heistJob('sovereign_vault'))).toBe('Complete a clean exit from The Gilded Mint to unlock');
    s.professionProgress.discoveries['heist_clean_gilded_mint'] = true;
    expect(jobBlocker(s, heistJob('sovereign_vault'))).toBeNull();

    // Prep board works and vault completion pays Sovereign Vault rewards
    hold(s, 'sovereign_vault', 'key', 'ledger', 'patrol');
    expect(startHeist(s, fixed(0.99), 'sovereign_vault')).toBeNull();
    stopHeistRepeat(s);
    while (s.action?.kind === 'heist') clearRoom(s, fixed(0.99));
    expect(s.professionProgress.discoveries['heist_clean_sovereign_vault']).toBe(true);
  });

  it('defines 4 Thieving keepsakes across level bands and rolls them on mark completion', () => {
    const keepsakes = COLLECTIBLES.filter((c) => c.skill === 'thieving');
    expect(keepsakes).toHaveLength(4);
    expect(thievingZoneForLevel(1)).toBe('street');
    expect(thievingZoneForLevel(24)).toBe('civic');
    expect(thievingZoneForLevel(52)).toBe('underworld');
    expect(thievingZoneForLevel(90)).toBe('highcourt');

    const s = thief(90);
    const archivist = actionsFor('thieving').find((a) => a.id === 'mark_archivist')!;
    startSkillAction(s, ctx(), archivist.id);
    if (s.action?.kind === 'skill') s.action.progress = archivist.intervalMs;
    skillStep(s, fixed(0), 1, deriveStats(s));
    expect(s.collectibles).toContain('thieving.highcourt');
  });

  it('wires all 7 Thieving tree passives plus Inside Job and Fences Eye bridges', () => {
    // 1. prepChance, thoroughCasing, insideKnowledge, perfectPlan
    const base = thief(65);
    const full = thief(65);
    full.skillPassives = ['thieving_t0', 'thieving_f0_n0', 'thieving_f0_n1', 'thieving_f0_ks'];
    expect(prepChance(full, 'mark_peddler')).toBeGreaterThan(prepChance(base, 'mark_peddler'));
    expect(prepStrength(full)).toBeCloseTo(1.15);

    const job = heistJob('pyre_vault');
    const items = prepBoard(job.id).items; // 5 items, min 3
    hold(full, job.id, items[0].kind, items[1].kind, items[2].kind, items[3].kind); // 4 held + 1 free = 5 (full board)
    expect(canStartJob(full, job.id)).toBeNull();
    startHeist(full, fixed(0.99), job.id);
    expect(full.action?.kind === 'heist' && full.action.prep).toHaveLength(5);
    expect(alarmChance(full, job, 1)).toBe(0);

    // Perfect Plan blocks under-prepped starts when missing >= 2 items
    const under = thief(65);
    under.skillPassives = ['thieving_f0_n1', 'thieving_f0_ks'];
    hold(under, job.id, items[0].kind, items[1].kind, items[2].kind); // 3 + 1 free = 4 < 5
    expect(canStartJob(under, job.id)).toContain('Perfect Plan');

    // 2. quickLift, deepPockets, opportunist
    const swift = thief(65);
    const peddler = actionsFor('thieving').find((a) => a.id === 'mark_peddler')!;
    const baseMs = actionIntervalMs(base, peddler, deriveStats(base));
    swift.skillPassives = ['thieving_f1_n0', 'thieving_f1_n1', 'thieving_f1_ks'];
    expect(actionIntervalMs(swift, peddler, deriveStats(swift))).toBeLessThan(baseMs);
    expect(prepStrength(swift)).toBeCloseTo(0.75);

    startSkillAction(swift, ctx(), peddler.id);
    if (swift.action?.kind === 'skill') swift.action.progress = peddler.intervalMs;
    skillStep(swift, fixed(0), 1, deriveStats(swift));
    expect(swift.storage.bank.gold).toBeGreaterThan(peddler.outputs!.gold);
    // Opportunist rolls prep from an unrelated job (mark_peddler does not supply pyre_vault)
    swift.heist.planned = 'pyre_vault';
    rollPrep(swift, fixed(0), peddler);
    expect(Object.keys(swift.heist.prep).some((k) => k.startsWith('prep_pyre_vault_'))).toBe(true);

    // 3. bridge_inside_job: 25% mark gold cut + Vault Atlas map prep drop
    const inside = thief(65);
    const goldBeforeInside = inside.storage.bank.gold ?? 0;
    inside.skillPassives = ['bridge_inside_job'];
    inside.heist.planned = 'pyre_vault';
    startSkillAction(inside, ctx(), peddler.id);
    if (inside.action?.kind === 'skill') inside.action.progress = peddler.intervalMs;
    skillStep(inside, fixed(0.999), 1, deriveStats(inside));
    expect((inside.storage.bank.gold ?? 0) - goldBeforeInside).toBe(Math.round(peddler.outputs!.gold * 0.75));
    rollVaultMapPrep(inside, fixed(0));
    expect(Object.keys(inside.heist.prep).some((k) => k.startsWith('prep_pyre_vault_'))).toBe(true);

    // 4. bridge_fences_eye: 25% room/vault gold cut + rough gem drop
    const plain = thief(65);
    const goldBeforePlain = plain.storage.bank.gold ?? 0;
    hold(plain, 'cinder_toll', 'key', 'patrol');
    startHeist(plain, fixed(0.99), 'cinder_toll');
    stopHeistRepeat(plain);
    while (plain.action?.kind === 'heist') clearRoom(plain, fixed(0.99));
    const plainGoldEarned = (plain.storage.bank.gold ?? 0) - goldBeforePlain;

    const fence = thief(65);
    const goldBeforeFence = fence.storage.bank.gold ?? 0;
    fence.skillPassives = ['bridge_fences_eye'];
    hold(fence, 'cinder_toll', 'key', 'patrol');
    startHeist(fence, fixed(0.99), 'cinder_toll');
    stopHeistRepeat(fence);
    while (fence.action?.kind === 'heist') clearRoom(fence, fixed(0.99));
    const fenceGoldEarned = (fence.storage.bank.gold ?? 0) - goldBeforeFence;
    expect(fenceGoldEarned).toBeLessThan(plainGoldEarned);
    const hasRoughGem = Object.keys(fence.storage.bank).some((k) => k.startsWith('rough_') && (fence.storage.bank[k] ?? 0) > 0);
    expect(hasRoughGem).toBe(true);
  });
});
