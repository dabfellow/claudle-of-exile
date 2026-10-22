import { describe, expect, it } from 'vitest';
import { PASSIVE_BY_ID, PASSIVE_NODES } from '../src/data/passiveTree';
import { SKILL_TREE_NODES } from '../src/data/skillTree';
import { actionDef } from '../src/data/skills';
import { zoneDef } from '../src/data/zones';
import { combatStep, makeMonster, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem } from '../src/engine/gems';
import { allocate, allocateReason, changeMastery, refundReason } from '../src/engine/passives';
import { seeded } from '../src/engine/rng';
import { allocateSkillNode, skillNodeReason, skillTreePoints } from '../src/engine/skillTree';
import { actionIntervalMs, startSkillAction } from '../src/engine/skills';
import { newGame, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { charXpForLevel, xpForLevel } from '../src/engine/xp';

const ctx = (seed = 1) => makeCtx(seeded(seed));

/** Allocate a path of node ids in order (gives the character plenty of points). */
function take(s: GameState, ids: string[], choice = 0) {
  s.skills.combat = charXpForLevel(80);
  for (const id of ids) {
    const err = allocate(s, ctx(), id, PASSIVE_BY_ID[id].kind === 'mastery' ? choice : undefined);
    if (err) throw new Error(`${id}: ${err}`);
  }
}

const path = (cluster: string) => [`${cluster}_s1`, `${cluster}_s2`, `${cluster}_s3`, `${cluster}_n`];

describe('character tree shape', () => {
  it('matches the agreed layout', () => {
    const count = (k: string) => PASSIVE_NODES.filter((n) => n.kind === k).length;
    expect(count('keystone')).toBe(9);
    expect(count('notable')).toBe(24);
    expect(count('mastery')).toBe(24);
    expect(count('start')).toBe(3);
    expect(PASSIVE_NODES.length).toBeGreaterThanOrEqual(140);
    for (const n of PASSIVE_NODES.filter((x) => x.kind === 'mastery')) {
      expect(n.options).toHaveLength(3);
      expect(n.links).toHaveLength(1);
      expect(PASSIVE_BY_ID[n.links[0]].kind).toBe('notable');
    }
  });

  it('hybrid zones are reachable from either neighbouring region', () => {
    const w = newGame(1, { name: 'w', classId: 'warrior' });
    take(w, ['str_hub', ...path('brute_force'), 'duelist_gate']);
    const r = newGame(1, { name: 'r', classId: 'ranger' });
    take(r, ['dex_hub', ...path('fleetfoot'), 'duelist_gate']);
    expect(w.passives).toContain('duelist_gate');
    expect(r.passives).toContain('duelist_gate');
  });
});

describe('masteries', () => {
  it('need the notable and a choice, apply the chosen bonus, and cost regret to change', () => {
    const s = newGame(1);
    s.skills.combat = charXpForLevel(80);
    expect(allocateReason(s, 'iron_skin_m')).toMatch(/connect/);
    take(s, ['str_hub', ...path('iron_skin')]);
    expect(allocate(s, ctx(), 'iron_skin_m')).toMatch(/Choose/);
    const before = deriveStats(s, []).raw.armourPct;
    expect(allocate(s, ctx(), 'iron_skin_m', 0)).toBeNull();
    expect(deriveStats(s, []).raw.armourPct).toBe(before + 15);
    expect(changeMastery(s, ctx(), 'iron_skin_m', 2)).toMatch(/Regret/);
    s.bank.regret = 2;
    expect(changeMastery(s, ctx(), 'iron_skin_m', 2)).toBeNull();
    expect(deriveStats(s, []).raw.slamReduction).toBe(10);
    // the notable can't be refunded while its mastery depends on it
    expect(refundReason(s, 'iron_skin_n')).toMatch(/disconnect/);
  });
});

describe('keystones', () => {
  const arena = (s: GameState) => {
    s.skillBar = s.skillBar.map(() => null);
    s.skillBar[0] = createSkillGem(s, 'heavy_strike');
    const c = ctx();
    startCombat(s, c, 'mudflats');
    const dummy = makeMonster(zoneDef('mudflats').monsters[0], false, 1);
    dummy.life = dummy.maxLife = 1e6;
    dummy.attackMs = 1e9;
    s.combat!.monsters = [dummy];
    s.life = deriveStats(s).maxLife;
    return c;
  };

  it('Blood Pact removes mana and pays skills with life', () => {
    const s = newGame(1);
    take(s, ['str_hub', ...path('heart_of_stone'), 'str_road1', ...path('warlord'), 'str_ks1']);
    expect(deriveStats(s, []).maxMana).toBe(0);
    const c = arena(s);
    let paidWithLife = false;
    for (let t = 0; t < 4000 && !paidWithLife; t += 50) {
      const life = s.life;
      const seen = c.events.length;
      combatStep(s, c, 50, deriveStats(s));
      if (c.events.slice(seen).some((e) => e.t === 'skill')) paidWithLife = s.life < life;
    }
    expect(paidWithLife).toBe(true);
  });

  it('Bastion converts evasion to armour', () => {
    const s = newGame(1, { name: 't', classId: 'ranger' });
    const before = deriveStats(s, []);
    expect(before.evasion).toBeGreaterThan(0);
    s.passives.push('templar_ks'); // stat check only, not a reachable path
    const after = deriveStats(s, []);
    expect(after.evasion).toBe(0);
    expect(after.armour).toBe(before.armour + before.evasion);
  });

  it('Steady Hand: never misses, never crits', () => {
    const s = newGame(1);
    s.passives.push('duelist_ks');
    expect(deriveStats(s, []).critChance).toBe(0);
    const c = arena(s);
    for (let t = 0; t < 10_000; t += 50) combatStep(s, c, 50, deriveStats(s));
    const hits = c.events.filter((e) => e.t === 'hit' && e.target === 'monster');
    expect(hits.length).toBeGreaterThan(3);
    expect(hits.some((e) => e.t === 'hit' && (e.evaded || e.crit))).toBe(false);
  });

  it('Mind over Flesh takes damage from mana first', () => {
    const s = newGame(1, { name: 'm', classId: 'mage' });
    s.passives.push('int_ks1');
    const c = arena(s);
    s.skillBar = s.skillBar.map(() => null); // no spending, so mana only drops from damage
    const mon = s.combat!.monsters[0];
    mon.attackMs = 100;
    mon.damage = 20;
    s.mana = deriveStats(s).maxMana;
    const mana = s.mana;
    for (let t = 0; t < 200; t += 50) combatStep(s, c, 50, deriveStats(s));
    expect(s.mana).toBeLessThan(mana);
  });
});

describe('skilling tree', () => {
  it('earns a point per 5 total skill levels and gates deep nodes by level', () => {
    const s = newGame(1);
    expect(skillTreePoints(s)).toBe(1);
    s.skills.mining = xpForLevel(30);
    expect(skillTreePoints(s)).toBe(6);
    for (const id of ['core_0', 'mining_s0', 'mining_s1', 'mining_s2', 'mining_n1']) expect(allocateSkillNode(s, ctx(), id)).toBeNull();
    expect(skillNodeReason(s, 'mining_ks')).toMatch(/level 50/);
    expect(SKILL_TREE_NODES.length).toBeGreaterThanOrEqual(30);
  });

  it('Motherlode doubles ore and slows mining', () => {
    const s = newGame(1);
    s.skills.mining = xpForLevel(60);
    for (const id of ['core_0', 'mining_s0', 'mining_s1', 'mining_s2', 'mining_n0', 'mining_ks']) expect(allocateSkillNode(s, ctx(), id)).toBeNull();
    const a = actionDef('mine_copper');
    const d = deriveStats(s);
    // core_0 (+3%) and three Prospectors (+15%) are 18% faster; Motherlode is 30% slower
    expect(actionIntervalMs(s, a, d)).toBeCloseTo((a.intervalMs / 1.18) * 1.3, 0);
    const c = ctx();
    startSkillAction(s, c, 'mine_copper');
    tick(s, c, 60_000);
    const actions = Math.floor(60_000 / actionIntervalMs(s, a, d));
    expect(s.bank.copper_ore ?? 0).toBeGreaterThanOrEqual(actions * 2);
  });

  it('Greenhouse keeps the last harvest growing in the background', () => {
    const s = newGame(1);
    s.skills.harvesting = xpForLevel(60);
    for (const id of ['core_2', 'harvesting_s0', 'harvesting_s1', 'harvesting_s2', 'harvesting_n0', 'harvesting_ks']) {
      expect(allocateSkillNode(s, ctx(), id)).toBeNull();
    }
    const c = ctx();
    startSkillAction(s, c, 'herb_sun');
    startSkillAction(s, c, 'mine_copper');
    tick(s, c, 120_000);
    expect(s.bank.sunpetal ?? 0).toBeGreaterThan(0);
  });
});
