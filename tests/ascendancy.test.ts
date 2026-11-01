import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ASCENDANCIES, ASCENDANCY_BY_ID, ASCENDANCY_MAX_POINTS, ascendanciesOf, type AscendancyId } from '../src/data/ascendancies';
import type { ClassId } from '../src/data/classes';
import { CLASSES } from '../src/data/classes';
import { flaskDef } from '../src/data/flasks';
import { ACT_PREVIEW, ACTS, ZONES, zoneDef, type ZoneDef } from '../src/data/zones';
import {
  allocateAscNode,
  ascendancyOf,
  ascendancyPointsLeft,
  ascNodeReason,
  canAscend,
  chooseAscendancy,
  choiceWaiting,
  hasAscNode,
  onBossFirstKill,
  passTrial,
  refundAscNode,
  refundAscReason,
  switchAscendancy,
  switchCost,
  switchReason,
} from '../src/engine/ascendancy';
import { unlockEverything } from '../src/engine/automation';
import { areaCells, cellRing, CELLS } from '../src/engine/battlefield';
import { combatStep, enterZone, hawkTarget, makeMonster, releaseNovas, startCombat, useFlask } from '../src/engine/combat';
import { makeCtx, type Ctx } from '../src/engine/context';
import { flaskStats } from '../src/engine/flasks';
import { createSkillGem } from '../src/engine/gems';
import { longshotMore, manaFraction, manaPowerMore, meterLabel, meterMax, overflowMax } from '../src/engine/mechanics';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame, SAVE_VERSION } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameEvent, GameState, MonsterInstance } from '../src/engine/types';
import { armFor, veteran } from './helpers';

const FIRST_RING = CELLS.findIndex((c) => c.ring === 1);
const cellsOf = (ring: number) => CELLS.flatMap((c, i) => (c.ring === ring ? [i] : []));

/** A character of an ascendancy in a fight with one durable dummy that doesn't attack. `offline` runs it as time away would. */
function arena(id: AscendancyId, opts: { gem?: string; offline?: boolean; nodes?: string[]; dummyCell?: number } = {}) {
  const def = ASCENDANCY_BY_ID[id];
  const s = veteran(newGame(1, { name: 't', classId: def.classId }));
  const events: GameEvent[] = [];
  const ctx: Ctx = { ...makeCtx(seeded(7)), offline: !!opts.offline, emit: (e) => events.push(e) };
  passTrial(s, ctx, 1);
  chooseAscendancy(s, ctx, id);
  s.ascendancy.trials = 3;
  s.ascendancy.points = ASCENDANCY_MAX_POINTS;
  for (const n of opts.nodes ?? []) s.ascendancy.nodes.push(n);
  s.skillBar = s.skillBar.map(() => null);
  if (opts.gem) {
    s.skillBar[0] = createSkillGem(s, opts.gem);
    s.skillBar[0].rules = [{ when: 'always' }];
    armFor(s, opts.gem);
  }
  s.settings.autoFlee = false;
  startCombat(s, ctx, 'mudflats');
  const c = s.combat!;
  const dummy = addDummy(s, 1, opts.dummyCell);
  c.spawnMs = 1e12;
  s.life = deriveStats(s).maxLife;
  s.mana = deriveStats(s).maxMana;
  return { s, ctx, c, dummy, events };
}

function addDummy(s: GameState, uid: number, cell = FIRST_RING): MonsterInstance {
  const m = makeMonster(zoneDef('mudflats').monsters[0], false, uid);
  m.life = m.maxLife = 1e7;
  m.attackMs = 1e9;
  m.moveMs = m.stepMs = 1e9;
  m.res = { fire: 0, cold: 0, light: 0, chaos: 0 };
  m.cell = cell;
  s.combat!.monsters.push(m);
  return m;
}

function run(s: GameState, ctx: Ctx, ms: number, until?: () => boolean) {
  for (let t = 0; t < ms && s.combat && !until?.(); t += 50) combatStep(s, ctx, 50, deriveStats(s));
}

/** Set an attacker on the player: it swings every `ms` for `damage`. */
function attacker(m: MonsterInstance, ms = 400, damage = 5) {
  m.attackMs = ms;
  m.damage = damage;
}

const dealt = (events: GameEvent[], uid: number) => events.reduce((a, e) => a + (e.t === 'hit' && e.target === 'monster' && e.monsterUid === uid ? e.amount : 0), 0);
const hitsOn = (events: GameEvent[], uid: number) => events.filter((e) => e.t === 'hit' && e.target === 'monster' && e.monsterUid === uid && e.amount > 0).length;

describe('the data', () => {
  it('has two ascendancies for each main class and none for the Exile', () => {
    expect(ASCENDANCIES).toHaveLength(12);
    for (const c of CLASSES) expect(ascendanciesOf(c.id)).toHaveLength(c.mechanic ? 2 : 0);
  });

  it('every section is 12 nodes joined the same way, and every node reads', () => {
    for (const a of ASCENDANCIES) {
      expect(a.nodes).toHaveLength(12);
      expect(a.notables).toHaveLength(3);
      expect(a.gate.links).toHaveLength(3);
      for (const n of a.nodes) {
        expect(n.links.length).toBeGreaterThan(0);
        if (n.kind !== 'small') expect(n.desc, n.id).toBeTruthy();
        else expect(Object.keys(n.stats).length, n.id).toBeGreaterThan(0);
      }
      expect(a.notables.every((n) => n.trial === 2)).toBe(true);
      expect(a.capstone.trial).toBe(3);
    }
  });
});

describe('earning and spending', () => {
  it('stays closed until the first trial, and the trial gives its points and the choice', () => {
    const s = veteran(newGame(1, { name: 't', classId: 'warrior' }));
    const ctx = makeCtx(seeded(1));
    expect(canAscend(s)).toBe(false);
    expect(chooseAscendancy(s, ctx, 'ravager')).toBeTruthy();
    passTrial(s, ctx, 1);
    expect(choiceWaiting(s)).toBe(true);
    expect(s.ascendancy.points).toBe(4);
    passTrial(s, ctx, 1);
    expect(s.ascendancy.points).toBe(4);
    expect(chooseAscendancy(s, ctx, 'matador')).toBeTruthy();
    expect(chooseAscendancy(s, ctx, 'ravager')).toBeNull();
    expect(ascendancyOf(s)).toBe('ravager');
  });

  it('the Exile never gets any of it', () => {
    const s = veteran(newGame(1, { name: 't', classId: 'exile', startNode: 'class_str' }));
    const ctx = makeCtx(seeded(1));
    passTrial(s, ctx, 1);
    onBossFirstKill(s, ctx, 'pilgrimgate');
    expect(canAscend(s)).toBe(false);
    expect(s.ascendancy.points).toBe(0);
  });

  it('stays off for live players until Act 3 opens, even on a save carried from a preview', () => {
    const { s } = arena('ravager');
    const act3 = ACTS.find((a) => a.n === 3)!;
    act3.open = false;
    ACT_PREVIEW.enabled = false;
    try {
      expect(ascendancyOf(s)).toBeNull();
      expect(canAscend(s)).toBe(false);
    } finally {
      act3.open = true;
      ACT_PREVIEW.enabled = true;
    }
  });

  it('only trials give points, and the three fill the section', () => {
    const s = veteran(newGame(1, { name: 't', classId: 'mage' }));
    const ctx = makeCtx(seeded(1));
    onBossFirstKill(s, ctx, 'almsquarter');
    expect(s.ascendancy.points).toBe(0);
    onBossFirstKill(s, ctx, 'pilgrimgate');
    onBossFirstKill(s, ctx, 'almsquarter');
    onBossFirstKill(s, ctx, 'highaltar');
    expect(s.ascendancy.points).toBe(4);
    onBossFirstKill(s, ctx, 'giantsthrone');
    onBossFirstKill(s, ctx, 'exilesgate');
    expect(s.ascendancy.points).toBe(ASCENDANCY_MAX_POINTS);
    expect(ASCENDANCY_BY_ID.ravager.nodes.filter((n) => n.kind !== 'gate')).toHaveLength(ASCENDANCY_MAX_POINTS);
  });

  it('points already earned from bosses go, and a tree that no longer fits is handed back', () => {
    const load = (trials: number, points: number, nodes: string[]) => {
      const old = JSON.parse(serialize(newGame(1, { name: 't', classId: 'warrior' })));
      old.version = 28;
      Object.assign(old.ascendancy, { id: 'ravager', trials, points, nodes });
      return deserialize(JSON.stringify(old)).ascendancy;
    };
    const small = ['ravager_bloodlust_1', 'ravager_bloodlust_2', 'ravager_trample_1', 'ravager_trample_2'];
    expect(load(1, 11, small)).toMatchObject({ points: 4, nodes: small });
    expect(load(1, 11, [...small, 'ravager_red_haze_1'])).toMatchObject({ points: 4, nodes: [], id: 'ravager' });
    expect(load(2, 11, small).points).toBe(8);
    expect(load(0, 0, []).points).toBe(0);
  });

  it('notables and capstones stay sealed behind trials 2 and 3', () => {
    const { s, ctx } = arena('anvil');
    s.ascendancy.trials = 1;
    const def = ASCENDANCY_BY_ID.anvil;
    expect(allocateAscNode(s, ctx, 'anvil_shatter')).toMatch(/Act 4/);
    expect(allocateAscNode(s, ctx, def.capstone.id)).toMatch(/Act 6/);
    expect(allocateAscNode(s, ctx, 'anvil_shatter_2')).toMatch(/connect/);
    expect(allocateAscNode(s, ctx, 'anvil_shatter_1')).toBeNull();
    expect(allocateAscNode(s, ctx, 'anvil_shatter_2')).toBeNull();
    expect(ascNodeReason(s, 'anvil_shatter')).toMatch(/Act 4/);
    s.ascendancy.trials = 2;
    expect(allocateAscNode(s, ctx, 'anvil_shatter')).toBeNull();
    expect(hasAscNode(s, 'anvil_shatter')).toBe(true);
  });

  it('small nodes grant their stats, and points run out', () => {
    const { s, ctx } = arena('anvil');
    s.ascendancy.points = 1;
    const before = deriveStats(s).raw.armourPct;
    expect(allocateAscNode(s, ctx, 'anvil_hold_the_line_1')).toBeNull();
    expect(deriveStats(s).raw.armourPct).toBe(before + 10);
    expect(ascendancyPointsLeft(s)).toBe(0);
    expect(allocateAscNode(s, ctx, 'anvil_shatter_1')).toBe('No points left');
  });

  it('refunds cost an Orb of Regret and can\'t cut the tree', () => {
    const { s, ctx } = arena('anvil');
    allocateAscNode(s, ctx, 'anvil_temper_1');
    allocateAscNode(s, ctx, 'anvil_temper_2');
    s.account.bank.regret = 1;
    expect(refundAscReason(s, 'anvil_temper_1')).toMatch(/disconnect/);
    expect(refundAscNode(s, ctx, 'anvil_temper_2')).toBeNull();
    expect(s.account.bank.regret).toBe(0);
    expect(refundAscReason(s, 'anvil_temper_1')).toMatch(/Regret/);
  });

  it('switching costs a Divine Orb plus an Orb of Regret per node, and frees the points', () => {
    const { s, ctx } = arena('anvil');
    allocateAscNode(s, ctx, 'anvil_temper_1');
    allocateAscNode(s, ctx, 'anvil_temper_2');
    expect(switchCost(s)).toEqual({ material: 1, regret: 2 });
    expect(switchReason(s, 'anvil')).toBeTruthy();
    expect(switchReason(s, 'matador')).toBeTruthy();
    s.account.bank.divine = 0;
    s.account.bank.regret = 2;
    expect(switchAscendancy(s, ctx, 'ravager')).toMatch(/Divine/);
    s.account.bank.divine = 2;
    s.account.bank.regret = 1;
    expect(switchAscendancy(s, ctx, 'ravager')).toMatch(/Regret/);
    s.account.bank.regret = 3;
    expect(switchAscendancy(s, ctx, 'ravager')).toBeNull();
    expect(s.account.bank.divine).toBe(1);
    expect(s.account.bank.regret).toBe(1);
    expect(s.ascendancy.nodes).toEqual([]);
    expect(ascendancyOf(s)).toBe('ravager');
    expect(ascendancyPointsLeft(s)).toBe(ASCENDANCY_MAX_POINTS);
  });
});

describe('the first trial', () => {
  const fixture: ZoneDef = { ...zoneDef('mudflats'), id: 'pilgrimgate', act: 3, actBoss: false };
  const added = !ZONES.some((z) => z.id === 'pilgrimgate');
  beforeAll(() => {
    if (added) ZONES.push(fixture);
  });
  afterAll(() => {
    if (added) ZONES.splice(ZONES.indexOf(fixture), 1);
  });

  it('beating the boss of pilgrimgate passes it, once', () => {
    const s = veteran(newGame(1, { name: 't', classId: 'shadow' }));
    const events: GameEvent[] = [];
    const ctx: Ctx = { ...makeCtx(seeded(3)), emit: (e) => events.push(e) };
    s.unlockedZones.push('pilgrimgate');
    const fight = () => {
      enterZone(s, ctx, 'pilgrimgate'); // Act 3 isn't open on this branch
      const boss = makeMonster(zoneDef('pilgrimgate').boss, true, 99);
      boss.life = 1;
      s.combat!.monsters = [boss];
      s.combat!.spawnMs = 1e12;
      run(s, ctx, 5000, () => !s.combat?.monsters.length);
    };
    fight();
    expect(s.bossesDefeated).toContain('pilgrimgate');
    expect(s.ascendancy.trials).toBe(1);
    expect(s.ascendancy.points).toBe(4);
    expect(events.filter((e) => e.t === 'trialPassed')).toHaveLength(1);
    fight();
    expect(s.ascendancy.points).toBe(4);
  });
});

describe('saves', () => {
  it('old saves load with no ascendancy, and a chosen one survives a round trip', () => {
    const raw = JSON.parse(serialize(newGame(1))) as Record<string, unknown>;
    delete raw.ascendancy;
    raw.version = 22;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.ascendancy).toMatchObject({ id: null, nodes: [], trials: 0, points: 0 });
    const { s, ctx } = arena('falconer');
    allocateAscNode(s, ctx, 'falconer_bond_1');
    s.ascendancy.hawk.priority = 'ranged';
    const back = deserialize(serialize(s));
    expect(back.ascendancy).toEqual(s.ascendancy);
    expect(back.combat?.asc).toEqual(s.combat?.asc);
  });

  it('a fight saved before ascendancies carries on', () => {
    const { s, ctx } = arena('ravager');
    const raw = JSON.parse(serialize(s)) as Record<string, unknown>;
    delete (raw.combat as Record<string, unknown>).asc;
    delete raw.ascendancy;
    raw.version = 22;
    const loaded = deserialize(JSON.stringify(raw));
    expect(() => run(loaded, ctx, 200)).not.toThrow();
    expect(meterLabel(loaded, deriveStats(loaded))).toContain('Rage');
  });
});

// every gate has to work the same with nobody watching
describe.each([false, true])('gates (offline: %s)', (offline) => {
  it('Ravager: full Rage starts a 6s Rampage that sweeps ring 1 and drains to nothing', () => {
    const { s, ctx, c, dummy, events } = arena('ravager', { offline });
    const other = addDummy(s, 2, cellsOf(1)[3]);
    const far = addDummy(s, 3, cellsOf(3)[0]);
    c.mech = meterMax('rage', deriveStats(s).raw);
    run(s, ctx, 3000);
    expect(events.some((e) => e.t === 'info' && e.text === 'Rampage!')).toBe(true);
    expect(c.asc.rampageMs).toBeGreaterThan(0);
    expect(c.mech).toBeLessThan(15);
    expect(hitsOn(events, dummy.uid)).toBeGreaterThan(0);
    expect(hitsOn(events, other.uid)).toBeGreaterThan(0);
    expect(hitsOn(events, far.uid)).toBe(0);
    run(s, ctx, 3100);
    expect(c.asc.rampageMs).toBeLessThanOrEqual(0);
    expect(c.mech).toBeLessThan(5);
  });

  it('Anvil: Rage comes from hits taken, not dealt, and attackers break on your Armour', () => {
    const { s, ctx, c, dummy, events } = arena('anvil', { offline });
    run(s, ctx, 2000);
    expect(c.mech).toBe(0);
    attacker(dummy);
    c.buffs.push({ id: 'guard_armour', source: 'skill', remainingMs: 1e6, durationMs: 1e6, stats: { armour: 1000 } });
    events.length = 0;
    run(s, ctx, 2000);
    expect(c.mech).toBeGreaterThan(1);
    const landed = events.filter((e) => e.t === 'hit' && e.target === 'player' && !e.evaded).length;
    expect(landed).toBeGreaterThan(0);
    expect(dealt(events, dummy.uid)).toBeGreaterThan(landed * 40);
  });

  it('Longshot: Momentum gives damage, not speed, doubled on rings 3 and 4', () => {
    const firstHit = (ring: number) => {
      const a = arena('longshot', { offline, gem: 'barrage', dummyCell: cellsOf(ring)[0] });
      a.s.settings.targeting = { priority: 'none', order: 'closest' };
      a.c.mech = 10;
      run(a.s, a.ctx, 3000, () => dealt(a.events, 1) > 0);
      return { amount: dealt(a.events, 1), a };
    };
    const near = firstHit(2);
    const far = firstHit(4);
    const d = deriveStats(near.a.s);
    expect(longshotMore(near.a.s, d, 2)).toBe(30);
    expect(longshotMore(near.a.s, d, 4)).toBe(60);
    // the same seed rolls the same hit: only the ring differs
    expect(far.amount / near.amount).toBeCloseTo(1.6 / 1.3, 1);
    const speed = deriveStats(near.a.s).attackSpeed;
    near.a.c.mech = 0;
    expect(deriveStats(near.a.s).attackSpeed).toBe(speed);
  });

  it('Falconer: the hawk hits past the front line, faster with Momentum, on its own targeting', () => {
    const { s, ctx, c, dummy, events } = arena('falconer', { offline, dummyCell: cellsOf(1)[0] });
    const back = addDummy(s, 2, cellsOf(4)[0]);
    s.ascendancy.hawk = { priority: 'none', order: 'farthest' };
    expect(hawkTarget(s)).toBe(back);
    run(s, ctx, 3000);
    expect(hitsOn(events, back.uid)).toBeGreaterThan(0);
    // no Momentum from the hawk's own hits without Bond
    expect(c.mech).toBe(hitsOn(events, dummy.uid));
    const count = hitsOn(events, back.uid);
    expect(count).toBeGreaterThanOrEqual(1);
    c.mech = 10;
    events.length = 0;
    run(s, ctx, 3000);
    expect(hitsOn(events, back.uid)).toBeGreaterThan(count);
    expect(meterLabel(s, deriveStats(s))).toContain('hawk every');
  });

  it('Wellspring: a full tank keeps Mana is Power, and spare mana fills Overflow', () => {
    const { s, ctx, c } = arena('wellspring', { offline });
    const d = deriveStats(s);
    expect(d.manaRegen).toBeGreaterThanOrEqual(2);
    expect(manaPowerMore(s, d, 1)).toBe(30);
    expect(manaPowerMore(s, d, 0)).toBe(0);
    // below full nothing spills
    s.mana = d.maxMana - 1;
    combatStep(s, ctx, 50, deriveStats(s));
    expect(c.mech).toBe(0);
    s.mana = d.maxMana;
    run(s, ctx, 1000);
    expect(c.mech).toBeGreaterThan(0);
    expect(meterLabel(s, deriveStats(s))).toContain('Overflow');
    expect(manaFraction(s, d)).toBe(1);
  });

  it('Wellspring: a Surge is free and hits about twice as hard', () => {
    const { s, ctx, c, dummy, events } = arena('wellspring', { gem: 'spark', offline });
    const hit = () => {
      events.length = 0;
      run(s, ctx, 3000, () => dealt(events, dummy.uid) > 0);
      return dealt(events, dummy.uid);
    };
    let plain = 0;
    for (let i = 0; i < 20; i++) {
      s.mana = deriveStats(s).maxMana;
      c.mech = 0;
      plain += hit();
    }
    let surged = 0;
    for (let i = 0; i < 20; i++) {
      s.mana = deriveStats(s).maxMana;
      c.mech = overflowMax(deriveStats(s));
      expect(meterLabel(s, deriveStats(s))).toContain('Surges');
      surged += hit();
      expect(s.mana).toBe(deriveStats(s).maxMana);
    }
    expect(surged / plain).toBeGreaterThan(1.6);
    expect(surged / plain).toBeLessThan(2.5);
  });

  it('Wellspring: a Surge waits for a spell that deals damage', () => {
    const { s, ctx, c } = arena('wellspring', { gem: 'frost_ward', offline });
    const max = overflowMax(deriveStats(s));
    c.mech = max;
    run(s, ctx, 500, () => c.cooldowns[0] > 0);
    expect(c.cooldowns[0]).toBeGreaterThan(0);
    expect(c.mech).toBe(max);
  });

  it('Every Mage who had picked chooses again, with their points back', () => {
    const { s } = arena('wellspring', { offline });
    const raw = JSON.parse(serialize(s));
    raw.version = 29;
    raw.ascendancy.id = 'wildcaster';
    raw.ascendancy.nodes = ['wildcaster_ragged_edge_1', 'wildcaster_burnout'];
    const wildcaster = deserialize(JSON.stringify(raw));
    expect(wildcaster.ascendancy.id).toBeNull();
    expect(wildcaster.ascendancy.nodes).toEqual([]);
    expect(ascendancyPointsLeft(wildcaster)).toBe(ASCENDANCY_MAX_POINTS);
    expect(choiceWaiting(wildcaster)).toBe(true);

    raw.version = 30;
    raw.ascendancy.id = 'alchemist';
    raw.ascendancy.nodes = ['alchemist_tonic_1'];
    expect(deserialize(JSON.stringify(raw)).ascendancy.id).toBeNull();
  });

  it('A reset leaves other classes as they were', () => {
    const { s } = arena('ravager', { offline });
    s.ascendancy.nodes = ['ravager_red_haze_1'];
    const raw = JSON.parse(serialize(s));
    raw.version = 30;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.ascendancy.id).toBe('ravager');
    expect(loaded.ascendancy.nodes).toEqual(['ravager_red_haze_1']);
  });

  it('Alchemist: flask charges count as mana, and a drink bursts on your target', () => {
    const { s, ctx, dummy, events } = arena('alchemist', { offline });
    const d = deriveStats(s);
    s.mana = 0;
    expect(manaFraction(s, d)).toBeGreaterThan(0.1);
    for (const f of s.flaskSlots) if (f) f.charges = 0;
    expect(manaFraction(s, d)).toBe(0);
    const f = s.flaskSlots[0]!;
    f.charges = flaskStats(f).maxCharges;
    events.length = 0;
    expect(useFlask(s, ctx, 0)).toBeNull();
    expect(dealt(events, dummy.uid)).toBeGreaterThan(d.combatLevel * 10);
  });

  it('an instilled flask bursts by itself', () => {
    const { s, ctx, dummy, events } = arena('alchemist', { offline });
    const f = s.flaskSlots[0]!;
    f.instill = 'fullCharges';
    f.charges = flaskStats(f).maxCharges;
    run(s, ctx, 200);
    expect(dealt(events, dummy.uid)).toBeGreaterThan(100);
  });

  it('Matador: only evades Riposte, and the streak grows until a hit lands', () => {
    const { s, ctx, c, dummy, events } = arena('matador', { offline });
    attacker(dummy, 600);
    s.skillBar[0] = createSkillGem(s, 'iron_guard');
    s.skillBar[0].rules = [{ when: 'manual' }];
    c.blocks = 50;
    run(s, ctx, 3000);
    expect(c.asc.streak).toBe(0);
    expect(hitsOn(events, dummy.uid)).toBeLessThanOrEqual(10); // only default attacks
    c.blocks = 0;
    c.evadeMs = 1e6;
    run(s, ctx, 3000);
    expect(c.asc.streak).toBeGreaterThan(1);
    c.evadeMs = 0;
    c.buffs.push({ id: 'guard_armour', source: 'skill', remainingMs: 1e6, durationMs: 1e6, stats: { evasionPct: -1000 } });
    run(s, ctx, 3000, () => c.asc.streak === 0);
    expect(c.asc.streak).toBe(0);
  });

  it('Vanguard: only blocks Riposte, and each one hits all of ring 1', () => {
    const { s, ctx, c, dummy, events } = arena('vanguard', { offline });
    const side = addDummy(s, 2, cellsOf(1)[4]);
    attacker(dummy, 600);
    c.evadeMs = 1e6;
    run(s, ctx, 300);
    run(s, ctx, 2000);
    const ripostes = hitsOn(events, side.uid);
    expect(ripostes).toBe(0);
    c.evadeMs = 0;
    c.blocks = 50;
    run(s, ctx, 3000);
    expect(hitsOn(events, side.uid)).toBeGreaterThan(0);
  });

  it('Flagellant: skills cost Life, and that fills Fervor three times as fast', () => {
    const { s, ctx, c } = arena('flagellant', { offline, gem: 'heavy_strike' });
    s.life = deriveStats(s).maxLife;
    const start = s.life;
    let fervor = 0;
    run(s, ctx, 1500, () => {
      fervor = c.mech;
      return fervor > 0;
    });
    expect(s.life).toBeLessThan(start);
    expect(fervor).toBeCloseTo(((0.03 * deriveStats(s).maxLife * 3) / (0.6 * deriveStats(s).maxLife + 0.6 * deriveStats(s).maxEs)) * 100, 0);
    expect(s.combat).toBeTruthy();
  });

  it('a Flagellant with no way to heal can kill itself', () => {
    const { s, ctx } = arena('flagellant', { offline, gem: 'heavy_strike' });
    s.life = 1;
    run(s, ctx, 3000);
    expect(s.lifetime.deaths).toBe(1);
  });

  it('Lightkeeper: novas store up to 3, then all go together; a click or a setting can hold them', () => {
    const { s, ctx, c, dummy } = arena('lightkeeper', { offline });
    // blocked hits fill Fervor without hurting
    const fill = () => {
      const before = c.asc.novas;
      c.blocks = 50;
      dummy.attackMs = 50;
      dummy.damage = deriveStats(s).maxLife;
      run(s, ctx, 1000, () => c.asc.novas !== before);
      dummy.attackMs = 1e9;
      c.blocks = 0;
    };
    fill();
    expect(c.asc.novas).toBe(1);
    expect(c.asc.novaDamage).toBeGreaterThan(0);
    fill();
    expect(c.asc.novas).toBe(2);
    const damaged = dummy.life;
    releaseNovas(s, ctx);
    expect(c.asc.novas).toBe(0);
    expect(dummy.life).toBeLessThan(damaged);
    s.ascendancy.release = 'manual';
    fill();
    fill();
    fill();
    run(s, ctx, 200);
    expect(c.asc.novas).toBe(3);
    s.ascendancy.release = 'full';
    run(s, ctx, 200);
    expect(c.asc.novas).toBe(0);
  });

  it('Lightkeeper holds for a wind-up once that rule is earned', () => {
    const { s, ctx, c } = arena('lightkeeper', { offline });
    unlockEverything(s);
    s.ascendancy.release = 'windup';
    c.asc.novas = 3;
    c.asc.novaDamage = 300;
    const boss = makeMonster(zoneDef('mudflats').boss, true, 50);
    boss.life = boss.maxLife = 1e7;
    boss.mechanics = [];
    boss.cell = cellsOf(2)[1];
    c.monsters.push(boss);
    run(s, ctx, 300);
    expect(c.asc.novas).toBe(3);
    boss.casting = 2000;
    boss.castKind = 'slam';
    boss.mechanics = ['slam'];
    run(s, ctx, 100);
    expect(c.asc.novas).toBe(0);
  });

  it('Headsman: a killing Coup refunds half the meter, a wasted one doesn\'t', () => {
    const { s, ctx, c, dummy } = arena('headsman', { offline, gem: 'heavy_strike' });
    const max = meterMax('malice', deriveStats(s).raw);
    c.mech = max;
    run(s, ctx, 1500, () => c.mech < max);
    expect(c.mech).toBeLessThanOrEqual(1);
    dummy.life = 1;
    c.mech = max;
    run(s, ctx, 1500, () => c.mech < max);
    expect(c.mech).toBeGreaterThanOrEqual(max / 2);
  });

  it('Plaguewright: ailments fill Malice, and a Coup bursts them', () => {
    const { s, ctx, c, dummy, events } = arena('plaguewright', { offline });
    s.skillBar = s.skillBar.map(() => null);
    dummy.dots.push({ kind: 'poison', dps: 50, remainingMs: 200000, durationMs: 200000, dealt: 0, gemId: 'poison_dart' });
    s.equipment.weapon = undefined;
    c.actionMs = 1e9; // the player stands still: only the ailment can fill the meter
    run(s, ctx, 4000);
    expect(c.mech).toBeCloseTo(2, 0);
    c.actionMs = 0;
    c.mech = meterMax('malice', deriveStats(s).raw);
    events.length = 0;
    run(s, ctx, 1000, () => !dummy.dots.length);
    expect(dummy.dots).toHaveLength(0);
    expect(events.some((e) => e.t === 'hit' && e.target === 'monster' && e.crit && e.amount >= 5000)).toBe(true);
  });
});

describe('sealed notables and capstones', () => {
  it('Ravager: Bloodlust stretches a Rampage, Trample reaches ring 2, No Mercy holds the drain', () => {
    const { s, ctx, c, dummy, events } = arena('ravager', { nodes: ['ravager_trample', 'ravager_bloodlust', 'ravager_no_mercy', 'ravager_red_haze'] });
    const ring2 = addDummy(s, 2, cellsOf(2)[0]);
    const victim = addDummy(s, 3, cellsOf(1)[3]);
    const speed = deriveStats(s).attackSpeed;
    c.mech = meterMax('rage', deriveStats(s).raw);
    run(s, ctx, 1000);
    expect(deriveStats(s).attackSpeed).toBeGreaterThan(speed);
    expect(hitsOn(events, ring2.uid)).toBeGreaterThan(0);
    victim.life = 1;
    run(s, ctx, 3000, () => c.asc.holdMs > 0);
    expect(c.asc.rampageTotal).toBe(7000);
    expect(c.asc.holdMs).toBeGreaterThan(0);
    const held = c.asc.rampageMs;
    run(s, ctx, 1000);
    expect(c.asc.rampageMs).toBe(held);
    expect(dummy.life).toBeGreaterThan(0);
  });

  it('Anvil: Shatter fills Rage on a survived wind-up, Unmoved stuns at full', () => {
    const { s, ctx, c, dummy } = arena('anvil', { nodes: ['anvil_shatter', 'anvil_unmoved'] });
    const boss = makeMonster(zoneDef('mudflats').boss, true, 50);
    boss.life = boss.maxLife = 1e7;
    boss.damage = 1;
    boss.casting = 50;
    boss.castKind = 'slam';
    boss.cell = cellsOf(2)[0];
    c.monsters.push(boss);
    run(s, ctx, 150, () => c.mech > 0);
    expect(c.mech).toBe(meterMax('rage', deriveStats(s).raw));
    boss.mechanics = [];
    attacker(dummy, 100, 1);
    run(s, ctx, 800, () => dummy.stunMs > 0);
    expect(dummy.stunMs).toBeGreaterThan(0);
  });

  it('Longshot: Last Arrow spends full Momentum on a crit down the line', () => {
    const end = cellsOf(4)[3];
    const { s, ctx, c, dummy, events } = arena('longshot', { dummyCell: end, gem: 'barrage', nodes: ['longshot_last_arrow'] });
    const onLine = addDummy(s, 2, areaCells('beam', end).find((i) => cellRing(i) === 2)!);
    const offLine = addDummy(s, 3, cellsOf(2).find((i) => !areaCells('beam', end).includes(i))!);
    s.settings.targeting = { priority: 'none', order: 'farthest' };
    c.mech = meterMax('momentum', deriveStats(s).raw);
    run(s, ctx, 2000, () => c.mech < 5);
    expect(events.some((e) => e.t === 'info' && e.text === 'Last Arrow!')).toBe(true);
    expect(events.some((e) => e.t === 'hit' && e.target === 'monster' && e.monsterUid === dummy.uid && e.crit)).toBe(true);
    expect(hitsOn(events, onLine.uid)).toBeGreaterThan(0);
    expect(hitsOn(events, offLine.uid)).toBe(0);
  });

  it('Falconer: Bond feeds Momentum, Talons bleed, Hooded picks casters, Stoop dives', () => {
    const { s, ctx, c, dummy } = arena('falconer', { nodes: ['falconer_bond', 'falconer_talons', 'falconer_hooded', 'falconer_stoop'] });
    s.skillBar = s.skillBar.map(() => null);
    c.actionMs = 1e9;
    const caster = addDummy(s, 2, cellsOf(4)[1]);
    caster.attackKind = 'spell';
    expect(hawkTarget(s)).toBe(caster);
    run(s, ctx, 4000);
    expect(c.mech).toBeGreaterThan(0);
    expect(caster.dots.some((x) => x.kind === 'bleed')).toBe(true);
    c.mech = meterMax('momentum', deriveStats(s).raw);
    run(s, ctx, 3000, () => c.mech < 5);
    expect(c.mech).toBeLessThan(5);
    expect(dummy.life).toBe(dummy.maxLife);
  });

  it('Wellspring: Riptide echoes a single-target spell and Deluge makes a Surge a Mega Crit', () => {
    // Fireball winds up, so the Surge has to last from paying to landing
    const { s, ctx, c, events } = arena('wellspring', { gem: 'fireball', nodes: ['wellspring_riptide', 'wellspring_deluge'] });
    c.mech = overflowMax(deriveStats(s));
    const megas = () => events.flatMap((e) => (e.t === 'hit' && e.target === 'monster' && e.mega ? [e] : []));
    run(s, ctx, 6000, () => megas().length > 0);
    expect(c.asc.surging).toBe(false);
    expect(megas()).toHaveLength(2);
    expect(megas()[1].amount).toBeLessThan(megas()[0].amount * 1.2);
  });

  it('Wellspring: Wake lands the ailment and Springward restores Energy Shield', () => {
    const { s, ctx, c, dummy, events } = arena('wellspring', { gem: 'spark', nodes: ['wellspring_wake', 'wellspring_springward'] });
    c.mech = overflowMax(deriveStats(s));
    s.es = 0;
    run(s, ctx, 3000, () => dealt(events, dummy.uid) > 0);
    expect(dummy.shockMs).toBeGreaterThan(0);
    const d = deriveStats(s);
    expect(s.es).toBeGreaterThanOrEqual(Math.min(d.maxEs, d.maxMana * 0.1));
  });

  it('Alchemist: Deep Cellar, Tonic, Volatile Mix and Philosopher\'s Draught', () => {
    const { s, ctx, c, dummy, events } = arena('alchemist', { nodes: ['alchemist_deep_cellar', 'alchemist_tonic', 'alchemist_volatile_mix', 'alchemist_philosophers_draught'] });
    const next = addDummy(s, 2, cellsOf(1)[1]);
    const f = s.flaskSlots[0]!;
    f.charges = flaskDef(f.flaskId).maxCharges;
    s.mana = 0;
    useFlask(s, ctx, 0);
    expect(s.mana).toBeGreaterThan(0);
    expect(hitsOn(events, next.uid)).toBeGreaterThan(0);
    expect(c.buffs.filter((b) => b.source === 'flask')).toHaveLength(1);
    expect(dummy.life).toBeLessThan(dummy.maxLife);
  });

  it('Matador: Veronica raises the cap, Close Call halves, Moment of Truth is a Mega Crit', () => {
    const { s, ctx, c, dummy, events } = arena('matador', { nodes: ['matador_veronica', 'matador_close_call', 'matador_moment_of_truth', 'matador_crowds_roar'] });
    attacker(dummy, 100, 5);
    c.asc.streak = 8;
    c.evadeMs = 0;
    c.buffs.push({ id: 'guard_armour', source: 'skill', remainingMs: 1e6, durationMs: 1e6, stats: { evasionPct: -1000 } });
    run(s, ctx, 400, () => c.asc.streak !== 8);
    expect(c.asc.streak).toBe(4);
    c.buffs = [];
    c.asc.streak = 10;
    c.evadeMs = 1e6;
    run(s, ctx, 800, () => c.asc.streak !== 10);
    expect(events.some((e) => e.t === 'hit' && e.mega)).toBe(true);
    expect(c.asc.streak).toBe(0);
  });

  it('Vanguard: Phalanx answers a blocked wind-up for triple damage, Stand Fast grants Armour', () => {
    const { s, ctx, c, events } = arena('vanguard', { nodes: ['vanguard_phalanx', 'vanguard_stand_fast', 'vanguard_press_forward'] });
    const boss = makeMonster(zoneDef('mudflats').boss, true, 50);
    boss.life = boss.maxLife = 1e7;
    boss.casting = 50;
    boss.castKind = 'slam';
    boss.cell = cellsOf(2)[0];
    c.monsters.push(boss);
    c.blocks = 1;
    c.riposteMs = 400;
    run(s, ctx, 200, () => hitsOn(events, boss.uid) > 0);
    expect(hitsOn(events, boss.uid)).toBeGreaterThan(0);
    expect(c.buffs.some((b) => b.id === 'stand_fast')).toBe(true);
  });

  it('Flagellant: Mortify and Ecstasy pay off below half Life', () => {
    const { s, ctx, c } = arena('flagellant', { gem: 'spark', nodes: ['flagellant_mortify', 'flagellant_ecstasy', 'flagellant_scourge'] });
    const speed = deriveStats(s).castSpeed;
    s.life = deriveStats(s).maxLife * 0.45;
    const mana = s.mana;
    run(s, ctx, 500);
    expect(c.buffs.some((b) => b.id === 'ecstasy')).toBe(true);
    expect(deriveStats(s).castSpeed).toBeGreaterThan(speed);
    expect(s.mana).toBeGreaterThanOrEqual(mana);
  });

  it('Lightkeeper: Dawn stuns the field and absorbs the next wind-up', () => {
    const { s, ctx, c, dummy, events } = arena('lightkeeper', { nodes: ['lightkeeper_dawn', 'lightkeeper_vespers', 'lightkeeper_beacon', 'lightkeeper_reserve'] });
    c.asc.novas = 3;
    c.asc.novaDamage = 1000;
    releaseNovas(s, ctx);
    expect(dummy.stunMs).toBeGreaterThan(0);
    expect(dummy.vulnMs).toBeGreaterThan(0);
    expect(c.shield).toBeGreaterThan(0);
    expect(dealt(events, dummy.uid)).toBe(Math.round(1000 * 0.5 * 1.4));
    expect(c.asc.dawn).toBe(true);
    const boss = makeMonster(zoneDef('mudflats').boss, true, 50);
    boss.life = boss.maxLife = 1e7;
    boss.damage = 1e6;
    boss.casting = 50;
    boss.castKind = 'slam';
    boss.cell = cellsOf(2)[0];
    c.monsters.push(boss);
    run(s, ctx, 150, () => !c.asc.dawn);
    expect(c.asc.dawn).toBe(false);
    expect(s.life).toBeGreaterThan(0);
    expect(s.lifetime.deaths).toBe(0);
  });

  it('Headsman: The Block executes, Marked weakens, Next carries Malice', () => {
    const { s, ctx, c, dummy } = arena('headsman', { nodes: ['headsman_the_block', 'headsman_marked', 'headsman_next'] });
    const max = meterMax('malice', deriveStats(s).raw);
    c.mech = max;
    run(s, ctx, 1500, () => c.mech < max);
    expect(dummy.vulnMs).toBeGreaterThan(0);
    dummy.life = dummy.maxLife * 0.25;
    c.mech = max;
    run(s, ctx, 3000, () => dummy.life <= 0);
    expect(dummy.life).toBe(0);
    c.mech = 6;
    startCombat(s, ctx, 'mudflats');
    expect(s.combat!.mech).toBe(6);
  });

  it('Plaguewright: Bloom raises the burst, Pandemic copies it, Contagion passes it on', () => {
    const { s, ctx, c, dummy } = arena('plaguewright', { nodes: ['plaguewright_bloom', 'plaguewright_pandemic', 'plaguewright_contagion'] });
    const near = addDummy(s, 2, cellsOf(2)[0]);
    const dot = { kind: 'poison' as const, dps: 10, remainingMs: 5000, durationMs: 5000, dealt: 0, gemId: 'poison_dart' };
    dummy.dots.push({ ...dot });
    c.mech = meterMax('malice', deriveStats(s).raw);
    run(s, ctx, 1500, () => !dummy.dots.length);
    expect(dummy.dots).toHaveLength(0);
    expect(near.dots.length).toBeGreaterThan(0);
    near.life = 1;
    run(s, ctx, 3000, () => !c.monsters.includes(near));
    expect(dummy.dots.length).toBeGreaterThan(0);
  });
});

describe('offline', () => {
  it.each(ASCENDANCIES.map((a) => a.id))('%s fights through time away without trouble', (id) => {
    const def = ASCENDANCY_BY_ID[id];
    const s = veteran(newGame(5, { name: 't', classId: def.classId as ClassId }));
    const ctx = makeCtx(seeded(9));
    unlockEverything(s);
    passTrial(s, ctx, 1);
    chooseAscendancy(s, ctx, id);
    s.life = deriveStats(s).maxLife;
    startCombat(s, ctx, 'mudflats');
    const sum = simulateOffline(s, ctx, 5 * 60 * 1000);
    expect(sum.kills).toBeGreaterThan(0);
  });
});
