import { describe, expect, it } from 'vitest';
import { SEAL, WAX } from '../src/data/craftMats';
import { GEAR, HEIST_JOBS, heistJob, prepBoard, prepId } from '../src/data/heist';
import { actionsFor, SKILLS } from '../src/data/skills';
import { SKILL_TREE_NODES } from '../src/data/skillTree';
import { makeCtx, type Ctx } from '../src/engine/context';
import { applyOrb, impressionReason, orbReason, restoreImpression, restoreReason, takeImpression } from '../src/engine/crafting';
import { alarmChance, alarmKeeps, cleanChance, crewSlots, heistStep, jobBlocker, jobExit, prepMark, rankUpRogue, rogueReason, setJobExit, startHeist, stopHeistRepeat, toggleCrew } from '../src/engine/heist';
import { allMods, createItem, modCount } from '../src/engine/items';
import { focusOf, minigameSwing } from '../src/engine/minigame';
import { simulateOffline } from '../src/engine/offline';
import { settleProfessionProgress } from '../src/engine/professions';
import { seeded, type Rng } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { startSkillAction, stopAction } from '../src/engine/skills';
import { skillTreePoints } from '../src/engine/skillTree';
import { newGame, SAVE_VERSION, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, Item } from '../src/engine/types';
import { levelOf, xpForLevel } from '../src/engine/xp';

const ctx = (seed = 1): Ctx => ({ rng: seeded(seed), now: 0, emit: () => {} });
/** An rng that always rolls this, to force or rule out an alarm. */
const fixed = (v: number): Ctx => ({ rng: { next: () => v } as Rng, now: 0, emit: () => {} });

const ACT2 = ['cinderroad', 'saltflats', 'blackgrass', 'caravan', 'kurgans', 'plateau', 'pyretemple', 'burningthrone'];

function thief(level = 1, markers = 0): GameState {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  // Legacy saves exercise the original numeric crew until settleHeist migrates them.
  delete s.heist.roster;
  s.heist.crew = [];
  s.unlockedZones.push(...ACT2);
  s.skills.thieving = xpForLevel(level);
  // `markers` used to be the Markers needed to start; now any positive number means the minimum prep for every job
  if (markers > 0) for (const j of HEIST_JOBS) givePrep(s, j.id);
  settleProfessionProgress(s, true);
  return s;
}

/** The minimum prep to start a job, taking the board's items in order. */
function givePrep(s: GameState, jobId: string, count = prepBoard(jobId).min): void {
  for (const e of prepBoard(jobId).items.filter((x) => x.kind !== 'ledger').slice(0, count)) s.heist.prep[prepId(jobId, e.kind)] = 3;
}

/** Walk the job under way forward a whole room. */
function clearRoom(s: GameState, c: Ctx): void {
  if (s.action?.kind !== 'heist') throw new Error('no job under way');
  s.action.progress = 1e9;
  heistStep(s, c, 1, deriveStats(s));
}

describe('Focus on a job', () => {
  const job = HEIST_JOBS[0];
  const underWay = () => {
    const s = thief(job.level, 100);
    expect(startHeist(s, ctx(), job.id)).toBeNull();
    return s;
  };
  const progressAfter = (s: GameState, c: Ctx) => {
    if (s.action?.kind !== 'heist') throw new Error('no job under way');
    s.action.progress = 0;
    heistStep(s, c, 100, deriveStats(s));
    return s.action.progress;
  };

  it('speeds up rooms online, not offline, and leaves the alarm alone', () => {
    const s = underWay();
    const alarm = alarmChance(s, job, 1);
    for (let i = 0; i < 4; i++) minigameSwing(s, 'hit');
    expect(progressAfter(s, ctx())).toBeGreaterThan(100);
    expect(alarmChance(s, job, 1)).toBe(alarm);
    expect(progressAfter(s, { ...ctx(), offline: true })).toBe(100);
    expect(focusOf(s)).toBe(0);
  });

  it('uses life-skill speed events for Heist rooms', () => {
    const plain = underWay();
    const boosted = underWay();
    expect(progressAfter(boosted, { ...ctx(), event: { loot: 1, xp: 1, gatheringSpeed: 2 } })).toBe(progressAfter(plain, ctx()) * 2);
  });

  it('carries over when a repeat starts the next job', () => {
    const s = underWay();
    for (let i = 0; i < 4; i++) minigameSwing(s, 'hit');
    const safe = fixed(0.999);
    for (let i = 0; i < jobExit(s, job); i++) clearRoom(s, safe);
    expect(s.action?.kind).toBe('heist');
    expect(focusOf(s)).toBeGreaterThan(0);
  });
});

const rareItem = (s: GameState, seed = 1): Item => {
  const item = createItem(s, 'iron_ring', 30, 'rare', seeded(seed));
  s.inventory.push(item);
  return item;
};

describe('Thieving', () => {
  it('needs no inputs, and every mark and job sits in Act 2', () => {
    expect(SKILLS.thieving.soon).toBeUndefined();
    for (const a of actionsFor('thieving')) {
      expect(a.inputs).toBeUndefined();
      expect(a.area).toBeUndefined();
    }
    for (const j of HEIST_JOBS) expect(ACT2).toContain(j.area);
  });

  it('opens marks independently and milestones govern Heist progression', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    expect(startSkillAction(s, ctx(), 'mark_peddler')).toBeNull();
    expect(jobBlocker(s, heistJob('cinder_toll'))).toBeNull();
    s.skills.thieving = xpForLevel(8);
    expect(jobBlocker(s, heistJob('salt_tithe'))).toMatch(/The Cinder Toll/);
    s.professionProgress.discoveries['heist_clean_cinder_toll'] = true;
    expect(jobBlocker(s, heistJob('salt_tithe'))).toBeNull();
  });

  it('gives gold and Rogue\'s Markers offline at full speed', () => {
    const s = thief();
    startSkillAction(s, ctx(), 'mark_peddler');
    const sum = simulateOffline(s, ctx(), 60 * 60 * 1000);
    // 1,200 lifts at 3 s, 3 gold each; 5% for each of the Peddler's two prep items fills both to the cap of 3
    expect(sum.materials.gold).toBeGreaterThan(3000);
    expect(Object.values(s.heist.prep).reduce((a, b) => a + b, 0)).toBe(6);
    expect(sum.xp.thieving).toBeGreaterThan(0);
  });

  it('feeds the skilling tree: its level counts and it has a branch', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    const before = skillTreePoints(s);
    s.skills.thieving = xpForLevel(10);
    expect(skillTreePoints(s)).toBeGreaterThan(before);
    expect(SKILL_TREE_NODES.filter((n) => n.branch === 'thieving')).toHaveLength(14);
  });
});

describe('Heist', () => {
  it('walks to the exit you chose, and pays out only then', () => {
    const s = thief(1, 8);
    const c = fixed(0.99);
    setJobExit(s, 'cinder_toll', 2);
    expect(startHeist(s, c, 'cinder_toll')).toBeNull();
    stopHeistRepeat(s);
    expect(s.heist.prep[prepId('cinder_toll', 'key')]).toBe(2);
    const gold = s.storage.bank.gold;
    clearRoom(s, c);
    expect(s.action?.kind === 'heist' && s.action.room).toBe(2);
    expect(s.storage.bank.gold).toBe(gold);
    clearRoom(s, c);
    expect(s.action).toBeNull();
    expect(s.storage.bank.gold).toBe(gold + 15 + 30);
    expect(s.heist.tally).toEqual({ jobs: 1, alarms: 0 });
  });

  it('keeps the vault for the last room', () => {
    const s = thief(1, 8);
    const c = fixed(0.99);
    startHeist(s, c, 'cinder_toll');
    stopHeistRepeat(s);
    const gold = s.storage.bank.gold;
    for (let i = 0; i < 3; i++) clearRoom(s, c);
    // vault chance is 1, and a roll of 0.99 still lands it; the marker roll (0.12 × room) never does
    expect(s.storage.bank.gold).toBe(gold + 15 + 30 + 45 + 150);
  });

  it('gets riskier room by room, and stealth and the crew bring it down', () => {
    const job = heistJob('last_wagon');
    const s = thief(20);
    expect(alarmChance(s, job, 3)).toBeCloseTo(0.21);
    expect(alarmChance(s, job, 4)).toBeGreaterThan(alarmChance(s, job, 3));
    expect(cleanChance(s, job, 5)).toBeLessThan(cleanChance(s, job, 2));
    const higher = thief(40);
    expect(alarmChance(higher, job, 3)).toBeLessThan(alarmChance(s, job, 3));
    higher.heist.rogues.lookout = 3;
    higher.heist.crew = ['lookout'];
    expect(alarmChance(higher, job, 3)).toBeCloseTo(0.21 * 0.7 * 0.79);
  });

  it('loses part of the take to an alarm, but never the XP or the repeat', () => {
    const s = thief(1, 16);
    startHeist(s, fixed(0.99), 'cinder_toll');
    clearRoom(s, fixed(0.99));
    const gold = s.storage.bank.gold;
    const xp = s.skills.thieving;
    clearRoom(s, fixed(0.0001));
    expect(s.heist.tally).toEqual({ jobs: 1, alarms: 1 });
    expect(s.storage.bank.gold).toBe(gold + Math.round(15 * alarmKeeps(s)));
    expect(s.skills.thieving).toBeGreaterThan(xp);
    expect(s.action?.kind).toBe('heist');
  });

  it('cases the job when short of prep, then starts it on its own', () => {
    const s = thief(1, 0);
    const c = ctx();
    startHeist(s, c, 'cinder_toll');
    expect(s.action?.kind).toBe('skill');
    expect(s.heist.auto).toBe('cinder_toll');
    expect(s.heist.planned).toBe('cinder_toll');
    givePrep(s, 'cinder_toll');
    tick(s, c, 100);
    expect(s.action?.kind).toBe('heist');
  });

  it('starting anything else ends the repeat', () => {
    const s = thief(1, 80);
    startHeist(s, ctx(), 'cinder_toll');
    startSkillAction(s, ctx(), 'mark_peddler');
    expect(s.heist.auto).toBeNull();
    startHeist(s, ctx(), 'cinder_toll');
    stopAction(s);
    tick(s, ctx(), 100);
    expect(s.heist.auto).toBeNull();
    expect(s.action).toBeNull();
  });

  it('casing picks the cheapest mark that supplies something the job is missing', () => {
    const s = thief(20);
    expect(prepMark(s, 'forgers_den')?.id).toBe('mark_hauler');
    s.heist.prep[prepId('forgers_den', 'plan')] = 1;
    expect(prepMark(s, 'forgers_den')?.id).toBe('mark_runner');
    s.heist.prep[prepId('forgers_den', 'ledger')] = 1;
    expect(prepMark(s, 'forgers_den')?.id).toBe('mark_outrider');
  });

  it('runs for a whole night offline with no stops, and pays Seals on the job that favours them', () => {
    const s = thief(20, 0);
    setJobExit(s, 'forgers_den', 4);
    startHeist(s, ctx(), 'forgers_den');
    const sum = simulateOffline(s, ctx(), 8 * 60 * 60 * 1000);
    expect(sum.stoppedReason).toBeNull();
    expect(sum.heists).toBeGreaterThan(5);
    expect(sum.materials[SEAL]).toBeGreaterThan(0);
    expect(s.action).not.toBeNull();
    expect(s.heist.auto).toBe('forgers_den');
  }, 20_000);

  it('trains faster than lifting the best mark alone, offline', () => {
    const lift = thief(25);
    startSkillAction(lift, ctx(), 'mark_factor');
    const plain = simulateOffline(lift, ctx(), 8 * 60 * 60 * 1000);
    const job = thief(25);
    setJobExit(job, 'last_wagon', 3);
    startHeist(job, ctx(), 'last_wagon');
    const loop = simulateOffline(job, ctx(), 8 * 60 * 60 * 1000);
    expect(loop.xp.thieving!).toBeGreaterThan(plain.xp.thieving!);
  }, 20_000);

  it('steals gear at the job\'s level, no higher than the campaign allows', () => {
    const s = thief(20, 30);
    s.unlockedZones = ['mudflats', 'caravan'];
    const c = fixed(0.99);
    startHeist(s, c, 'last_wagon');
    stopHeistRepeat(s);
    if (s.action?.kind === 'heist') s.action.take[GEAR] = 1;
    s.action = s.action?.kind === 'heist' ? { ...s.action, room: 5, lastRoom: 5 } : null;
    clearRoom(s, c);
    expect(s.inventory).toHaveLength(1);
    expect(s.inventory.every((i) => i.rarity === 'rare' && i.ilvl === 29)).toBe(true);
  });

  it('remembers the exit per job', () => {
    const s = thief(20);
    const job = heistJob('last_wagon');
    expect(jobExit(s, job)).toBe(5);
    setJobExit(s, job.id, 9);
    expect(jobExit(s, job)).toBe(5);
    setJobExit(s, job.id, 2);
    expect(jobExit(s, job)).toBe(2);
  });
});

describe('the crew', () => {
  it('costs gold, and only helps on the crew', () => {
    const s = thief(10, 100);
    s.storage.bank.gold = 50000;
    expect(rogueReason(s, 'cutpurse')).toMatch(/level 20/);
    expect(rankUpRogue(s, ctx(), 'fence')).toBeNull();
    expect(s.heist.crew).toEqual(['fence']);
    expect(s.storage.bank.gold).toBe(50000 - 1375);
    expect(alarmKeeps(s)).toBeCloseTo(0.58);
    toggleCrew(s, 'fence');
    expect(alarmKeeps(s)).toBe(0.5);
  });

  it('holds one rogue, then more as Thieving rises', () => {
    const s = thief(10, 1000);
    s.storage.bank.gold = 1e6;
    rankUpRogue(s, ctx(), 'lookout');
    rankUpRogue(s, ctx(), 'locksmith');
    expect(crewSlots(s)).toBe(1);
    expect(s.heist.crew).toEqual(['lookout']);
    toggleCrew(s, 'locksmith');
    expect(s.heist.crew).toEqual(['locksmith']);
    s.skills.thieving = xpForLevel(30);
    expect(crewSlots(s)).toBe(2);
    toggleCrew(s, 'lookout');
    expect(s.heist.crew).toEqual(['locksmith', 'lookout']);
  });

  it('Clean Getaway keeps the whole take', () => {
    const s = thief(50);
    const ring = createItem(s, 'iron_ring', 30, 'normal', seeded(1));
    ring.suffixes.push({ affixId: 'u_thieving_double', tier: 0, values: [1] });
    s.equipment.ring1 = ring;
    expect(alarmKeeps(s)).toBe(1);
  });
});

describe('Contraband at the bench', () => {
  it("a Forger's Seal keeps the chosen modifier through a Chaos Orb", () => {
    const s = thief();
    s.storage.bank.chaos = 40;
    s.storage.bank[SEAL] = 40;
    const item = rareItem(s);
    const kept = allMods(item)[0];
    for (let i = 0; i < 40; i++) {
      expect(applyOrb(s, ctx(i), 'chaos', item.uid, null, kept.affixId)).toBeNull();
      expect(allMods(item).find((m) => m.affixId === kept.affixId)?.values).toEqual(kept.values);
      expect(modCount(item)).toBeGreaterThanOrEqual(3);
      expect(modCount(item)).toBeLessThanOrEqual(6);
    }
    expect(s.storage.bank[SEAL]).toBe(0);
  });

  it('keeps it through Annulment and Divine too, and is refused where it means nothing', () => {
    const s = thief();
    s.storage.bank.annul = 10;
    s.storage.bank.divine = 10;
    s.storage.bank.exalted = 1;
    s.storage.bank[SEAL] = 20;
    const item = rareItem(s);
    const kept = allMods(item)[0];
    const values = [...kept.values];
    expect(orbReason(s, 'exalted', item.uid, null, kept.affixId)).toMatch(/Seal/);
    applyOrb(s, ctx(), 'divine', item.uid, null, kept.affixId);
    expect(kept.values).toEqual(values);
    while (modCount(item) > 1) expect(applyOrb(s, ctx(modCount(item)), 'annul', item.uid, null, kept.affixId)).toBeNull();
    expect(allMods(item)[0]).toBe(kept);
    expect(orbReason(s, 'annul', item.uid, null, kept.affixId)).toMatch(/nothing to remove/);
  });

  it('needs a Seal to be spent, and works alongside a Fossil', () => {
    const s = thief();
    s.storage.bank.chaos = 2;
    const item = rareItem(s);
    const kept = allMods(item)[0].affixId;
    expect(orbReason(s, 'chaos', item.uid, null, kept)).toMatch(/Seals/);
    s.storage.bank[SEAL] = 1;
    s.storage.bank.scorched_fossil = 1;
    expect(applyOrb(s, ctx(), 'chaos', item.uid, 'scorched_fossil', kept)).toBeNull();
    expect(s.storage.bank[SEAL]).toBe(0);
    expect(s.storage.bank.scorched_fossil).toBe(0);
  });

  it("Locksmith's Wax puts an item back exactly, once", () => {
    const s = thief();
    s.storage.bank.chaos = 1;
    s.storage.bank[WAX] = 1;
    const item = rareItem(s);
    const before = structuredClone({ rarity: item.rarity, name: item.name, prefixes: item.prefixes, suffixes: item.suffixes });
    expect(restoreReason(s, item.uid)).toBeTruthy();
    expect(takeImpression(s, ctx(), item.uid)).toBeNull();
    expect(s.storage.bank[WAX]).toBe(0);
    applyOrb(s, ctx(), 'chaos', item.uid);
    expect(restoreImpression(s, ctx(), item.uid)).toBeNull();
    expect({ rarity: item.rarity, name: item.name, prefixes: item.prefixes, suffixes: item.suffixes }).toEqual(before);
    expect(item.impression).toBeUndefined();
    expect(restoreReason(s, item.uid)).toBeTruthy();
  });

  it('an impression travels with the item, through saves and into the stash', () => {
    const s = thief();
    s.storage.bank[WAX] = 1;
    const item = rareItem(s);
    takeImpression(s, ctx(), item.uid);
    const back = deserialize(serialize(s));
    expect(back.inventory.find((i) => i.uid === item.uid)?.impression).toBeTruthy();
    expect(impressionReason(s, item.uid)).toBeTruthy();
  });

  it('no skill makes a Seal or Wax in bulk: marks only ever find them by chance', () => {
    for (const a of actionsFor('thieving')) {
      expect(a.outputs?.[SEAL]).toBeUndefined();
      expect(a.outputs?.[WAX]).toBeUndefined();
      for (const b of a.bonus ?? []) if (b.id === SEAL || b.id === WAX) expect(b.chance).toBeLessThan(0.01);
    }
  });
});

describe('saves', () => {
  it('a version 21 save on Act 2 loads with the skill open and no job', () => {
    const fresh = thief(1);
    const raw = JSON.parse(serialize(fresh));
    raw.version = 21;
    delete raw.skills.thieving;
    delete raw.heist;
    const s = deserialize(JSON.stringify(raw));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.skills.thieving).toBe(0);
    expect(levelOf('thieving', s.skills.thieving)).toBe(1);
    expect(s.heist.roster?.infiltrator.level).toBe(1);
    expect(s.heist.unlockedRogues).toEqual([]);
    expect(s.heist.crew).toHaveLength(0);
    expect(startSkillAction(s, makeCtx(seeded(1)), 'mark_peddler')).toBeNull();
  });

  it('a job under way survives a save', () => {
    const s = thief(1, 8);
    startHeist(s, ctx(), 'cinder_toll');
    clearRoom(s, fixed(0.99));
    const back = deserialize(serialize(s));
    expect(back.action?.kind === 'heist' && back.action.room).toBe(2);
    expect(back.heist.auto).toBe('cinder_toll');
  });

  it('a job that was removed stops instead of crashing the load', () => {
    const s = thief(1, 8);
    startHeist(s, ctx(), 'cinder_toll');
    const raw = JSON.parse(serialize(s));
    raw.action.jobId = 'gone';
    raw.heist.auto = 'gone';
    const back = deserialize(JSON.stringify(raw));
    expect(back.action).toBeNull();
    expect(back.heist.auto).toBeNull();
  });
});
