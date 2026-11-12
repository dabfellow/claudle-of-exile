import { describe, expect, it } from 'vitest';
import { EXILE_START, FORBIDDEN, PASSIVE_BY_ID, PASSIVE_NODES, RIM_RADIUS } from '../src/data/passiveTree';
import { SKILL_TREE_NODES } from '../src/data/skillTree';
import { actionDef } from '../src/data/skills';
import { zoneDef } from '../src/data/zones';
import { combatStep, makeMonster, mitigate, startCombat, useFlask } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem } from '../src/engine/gems';
import { allocate, allocateReason, changeMastery, PASSIVE_POINTS_PER_LEVEL, passiveNodeCost, passiveRoute, refund, refundReason, settlePassivePoints, startNode, TRAVEL_POINTS_PER_LEVEL } from '../src/engine/passives';
import { seeded } from '../src/engine/rng';
import { allocateSkillNode, MAX_SKILL_TREE_POINTS, skillTreePoints } from '../src/engine/skillTree';
import { actionIntervalMs, startSkillAction } from '../src/engine/skills';
import { newGame, SAVE_VERSION, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { deserialize, serialize } from '../src/engine/save';
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

/** Shortest allocatable path from a class start to `target` (never through other starts or masteries). */
function route(start: string, target: string): string[] {
  const prev: Record<string, string> = { [start]: '' };
  const q = [start];
  while (q.length) {
    const cur = q.shift()!;
    if (cur === target) break;
    for (const l of PASSIVE_BY_ID[cur].links) {
      const k = PASSIVE_BY_ID[l].kind;
      if (l in prev || k === 'start' || (k === 'mastery' && l !== target)) continue;
      prev[l] = cur;
      q.push(l);
    }
  }
  const out: string[] = [];
  for (let id = target; id !== start; id = prev[id]) out.unshift(id);
  return out;
}

describe('character tree shape', () => {
  it('spreads major damage themes across the tree instead of stacking them in one class wedge', () => {
    const families: Record<string, string[]> = {
      cold: ['coldPct', 'chilledDamagePct', 'chillOnHit', 'moreCold', 'glacialBulwark'],
      fire: ['firePct', 'ignitePct', 'physAsFire', 'moreFire'],
      lightning: ['lightPct', 'lightCrit', 'physAsLight', 'shockedDamagePct'],
      chaos: ['chaosPct', 'chaosDotPct', 'witherDot', 'moreChaos'],
      bleed: ['bleedPct', 'bleedOnHit', 'bleedVuln', 'rupture'],
      poison: ['poisonPct', 'poisonOnHit', 'poisonWeaken', 'morePoison', 'poisonSpread'],
      projectile: ['projectilePct', 'moreProjectile', 'extraChains'],
    };

    for (const [family, keys] of Object.entries(families)) {
      const clusters = new Map<string, string>();
      for (const node of PASSIVE_NODES) {
        if (node.cluster && keys.some((key) => Number((node.stats as Record<string, number | undefined>)[key] ?? 0) !== 0)) {
          clusters.set(node.cluster, node.region);
        }
      }
      const regionCounts = [...clusters.values()].reduce<Record<string, number>>((counts, region) => {
        counts[region] = (counts[region] ?? 0) + 1;
        return counts;
      }, {});
      expect(Object.keys(regionCounts).length, `${family} region spread`).toBeGreaterThanOrEqual(4);
      expect(Math.max(...Object.values(regionCounts)) / clusters.size, `${family} concentration`).toBeLessThanOrEqual(0.6);
    }
  });

  it('matches the agreed layout', () => {
    const count = (k: string) => PASSIVE_NODES.filter((n) => n.kind === k).length;
    expect(count('start')).toBe(7); // six classes and the Exile's centre
    expect(count('keystone')).toBe(30);
    expect(count('notable')).toBe(582);
    expect(count('mastery')).toBe(96); // only the big three-notable clusters carry one
    expect(count('small')).toBe(828);
    // clusters chain straight into each other: the only travel nodes are round the centre
    expect(count('travel')).toBe(18);
    expect(count('highway')).toBe(0);
    expect(count('doomed')).toBe(6);
    expect(count('gateway')).toBe(6);
    expect(PASSIVE_NODES).toHaveLength(1573);

    // every class reaches all of its own notables, none more than 50 nodes out
    const starts = ['class_str', 'class_strdex', 'class_dex', 'class_dexint', 'class_int', 'class_strint'];
    for (const st of starts) {
      const reg = PASSIVE_BY_ID[st].region;
      const sectorNotables = PASSIVE_NODES.filter((n) => n.kind === 'notable' && n.region === reg);
      const maxD = Math.max(...sectorNotables.map((n) => route(st, n.id).length));
      expect(maxD).toBeLessThanOrEqual(50);
    }
    for (const n of PASSIVE_NODES.filter((x) => x.kind === 'mastery')) {
      expect(n.options).toHaveLength(3);
      expect(n.links).toHaveLength(1);
      expect(PASSIVE_BY_ID[n.links[0]].kind).toBe('notable');
    }
    // nothing sits on top of anything else
    let closest = Infinity;
    for (const a of PASSIVE_NODES) for (const b of PASSIVE_NODES) if (a !== b) closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y));
    expect(closest).toBeGreaterThan(30);
  });

  it('keeps class mechanics out of the character tree and offers build-neutral rim choices', () => {
    expect(PASSIVE_NODES.some((n) => 'mechanic' in n)).toBe(false);
    for (const id of ['heavy_arms_n1', 'weapon_dance_n1', 'deadeye_n1', 'fatal_design_n1', 'high_sorcery_n1', 'consecrated_path_n1']) {
      expect(Math.hypot(PASSIVE_BY_ID[id].x, PASSIVE_BY_ID[id].y)).toBeGreaterThan(RIM_RADIUS - 150);
    }
    const ranger = newGame(1, { name: 'r', classId: 'ranger' });
    take(ranger, route('class_dex', 'heavy_arms_n1'));
    expect(ranger.passives).toContain('heavy_arms_n1');
    // the Warrior's deep wheel holds Unbroken, a rule-changer any class can walk to
    expect(deriveStats(ranger, []).raw.armourVsDot).toBeGreaterThan(0);
  });

  it('plans a route to a far node that can be bought in order, extending from an earlier plan', () => {
    const s = newGame(1);
    s.skills.combat = charXpForLevel(80);
    const first = passiveRoute(s, 'iron_skin_n')!;
    expect(first.at(-1)).toBe('iron_skin_n');
    expect(first.length).toBe(route('class_str', 'iron_skin_n').length);
    // a second click extends from the planned nodes rather than starting over
    const target = PASSIVE_BY_ID.iron_skin_n.links.find((l) => !first.includes(l) && PASSIVE_BY_ID[l].kind === 'small');
    if (target) expect(passiveRoute(s, target, first)).toEqual([target]);
    // never walks through a keystone, mastery or Doomed Gate on the way
    for (const id of first.slice(0, -1)) expect(['keystone', 'mastery', 'doomed']).not.toContain(PASSIVE_BY_ID[id].kind);
    take(s, first);
    expect(s.passives).toContain('iron_skin_n');
    expect(passiveRoute(s, 'iron_skin_n')).toBeNull();
  });

  it('refunds the old graph when compact clusters remove or repurpose nodes', () => {
    const s = newGame(1);
    s.passives = ['iron_skin_s1', 'iron_skin_s2', 'iron_skin_s3', 'iron_skin_n', 'iron_skin_m'];
    s.masteries = { iron_skin_m: 1 };
    const raw = JSON.parse(serialize(s));
    raw.version = 35;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.passives).toEqual([]);
    expect(loaded.masteries).toEqual({});
  });

  it('keeps an allocation that still connects and refunds one whose roads moved', () => {
    const s = newGame(1);
    take(s, route('class_str', 'iron_skin_n'));
    const kept = [...s.passives];
    const raw = JSON.parse(serialize(s));
    expect(deserialize(JSON.stringify(raw)).passives).toEqual(kept);
    // an old road id the layout no longer has: the whole allocation is refunded, points recounted from level
    raw.passives = ['t_old_road_1', ...kept];
    raw.passiveProfiles = [{ id: 'profile_1', name: 'P1', passives: raw.passives, masteries: {} }];
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.passives).toEqual([]);
    expect(loaded.passiveProfiles[0].passives).toEqual([]);
    expect(loaded.travelPoints).toBe(160);
    expect(loaded.passivePoints).toBe(80);
  });

  it('neighbouring classes link cluster to cluster across their border, well away from the centre', () => {
    // Warrior walks out to the Duelist's inner edge cluster over the border, without touching the crossing ring
    const path = route('class_str', 'duelist_A1_n1');
    expect(path.some((id) => id.startsWith('crossing'))).toBe(false);
    // somewhere a Warrior cluster node links straight into a Duelist cluster node
    const full = ['class_str', ...path];
    expect(full.some((id, i) => i > 0 && PASSIVE_BY_ID[id].region === 'duelist' && PASSIVE_BY_ID[full[i - 1]].region === 'str' && !!PASSIVE_BY_ID[id].cluster)).toBe(true);
  });

  it('neighbouring classes can path into each other and everyone reaches the centre quickly', () => {
    const w = newGame(1, { name: 'w', classId: 'warrior' });
    take(w, route('class_str', 'duelists_edge_n'));
    const r = newGame(1, { name: 'r', classId: 'ranger' });
    take(r, route('class_dex', 'duelists_edge_n'));
    expect(w.passives).toContain('duelists_edge_n');
    expect(r.passives).toContain('duelists_edge_n');
    expect(route('class_int', 'crossing_n0').length).toBeLessThanOrEqual(8);
  });

  it('gives every class its own broad starting buffs and puts Mana first for the Mage', () => {
    expect([
      PASSIVE_BY_ID.warpath_n1.name,
      PASSIVE_BY_ID.footwork_n1.name,
      PASSIVE_BY_ID.fletching_n1.name,
      PASSIVE_BY_ID.killing_intent_n1.name,
      PASSIVE_BY_ID.arcana_n1.name,
      PASSIVE_BY_ID.devotion_n1.name,
    ]).toEqual(['Hardy Constitution', 'Conditioning', 'Survivalist', 'Dark Vitality', 'Deep Thoughts', 'Devout Constitution']);

    const mageDistances = new Map<string, number>([['class_int', 0]]);
    const queue = ['class_int'];
    while (queue.length) {
      const id = queue.shift()!;
      for (const next of PASSIVE_BY_ID[id].links) {
        if (mageDistances.has(next) || PASSIVE_BY_ID[next].kind === 'start') continue;
        mageDistances.set(next, mageDistances.get(id)! + 1);
        queue.push(next);
      }
    }
    const nearest = (stat: 'manaRegenPct' | 'lifeRegenPct') => Math.min(
      ...PASSIVE_NODES.filter((n) => (n.stats[stat] ?? 0) > 0).map((n) => mageDistances.get(n.id) ?? Infinity),
    );
    expect(PASSIVE_BY_ID.arcana_n1.stats.manaRegenPct).toBeGreaterThan(0);
    expect(PASSIVE_BY_ID.arcana_m.options?.some((o) => (o.stats.manaRegenPct ?? 0) > 0)).toBe(true);
    expect(PASSIVE_BY_ID.arcana_m.options?.some((o) => (o.stats.lifeRegenPct ?? 0) > 0)).toBe(false);
    expect(nearest('manaRegenPct')).toBeLessThan(nearest('lifeRegenPct'));
  });

  it("lets an Exile start in the centre and walk through other classes' starts; everyone else stays blocked", () => {
    const ex = newGame(1, { name: 'ex', classId: 'exile', startNode: EXILE_START });
    expect(ex.character.startNode).toBe(EXILE_START);
    expect(PASSIVE_BY_ID[EXILE_START]).toMatchObject({ x: 0, y: 0, kind: 'start' });
    take(ex, ['crossing_str', 't_class_str_crossing_str_1', 'class_str', 'str_hub']);
    expect(ex.passives).toContain('str_hub');
    expect(allocateReason(ex, EXILE_START)).toBe('Invalid node');
    // an Exile on a class's spot can also walk through a neighbour's start
    const exr = newGame(1, { name: 'exr', classId: 'exile', startNode: 'class_dex' });
    take(exr, ['t_class_dex_crossing_dex_1', 'crossing_dex', EXILE_START, 'crossing_str', 't_class_str_crossing_str_1', 'class_str', 'str_hub']);
    // other classes can't take any start, the Exile's included
    const w = newGame(1, { name: 'w', classId: 'warrior' });
    take(w, ['t_class_str_crossing_str_1', 'crossing_str']);
    expect(allocateReason(w, EXILE_START)).toBe('Invalid node');
    take(w, ['crossing_n0', 'crossing_duelist', 't_class_strdex_crossing_duelist_1']);
    expect(allocateReason(w, 'class_strdex')).toBe('Invalid node');
  });
});

describe('masteries', () => {
  it('need the notable and a choice, apply the chosen bonus, and cost regret to change', () => {
    const s = newGame(1);
    s.skills.combat = charXpForLevel(80);
    // the Warrior's armour wheel (only three-notable clusters carry a mastery)
    expect(allocateReason(s, 'brute_force_m')).toMatch(/connect/);
    take(s, route('class_str', 'brute_force_n3'));
    expect(allocate(s, ctx(), 'brute_force_m')).toMatch(/Choose/);
    const before = deriveStats(s, []).raw.armourPct;
    expect(allocate(s, ctx(), 'brute_force_m', 0)).toBeNull();
    expect(deriveStats(s, []).raw.armourPct).toBe(before + 15);
    expect(changeMastery(s, ctx(), 'brute_force_m', 2)).toMatch(/Regret/);
    s.account.bank.regret = 2;
    expect(changeMastery(s, ctx(), 'brute_force_m', 2)).toBeNull();
    expect(deriveStats(s, []).raw.slamReduction).toBe(10);
    // the notable can't be refunded while its mastery depends on it
    expect(refundReason(s, 'brute_force_n3')).toMatch(/disconnect/);
    // smaller clusters have no mastery
    expect(PASSIVE_BY_ID.iron_skin_m).toBeUndefined();
  });
});

describe('character tree point economy', () => {
  it('credits separate level pools, caps mastery awards, and prices each node tier', () => {
    const s = newGame(1);
    expect([TRAVEL_POINTS_PER_LEVEL, PASSIVE_POINTS_PER_LEVEL]).toEqual([2, 1]);
    expect([s.travelPoints, s.passivePoints, s.masteryPoints]).toEqual([2, 1, 0]);
    s.skills.combat = charXpForLevel(100);
    settlePassivePoints(s);
    expect([s.travelPoints, s.passivePoints, s.masteryPoints]).toEqual([200, 100, 20]);
    expect(passiveNodeCost(PASSIVE_BY_ID.str_hub)).toEqual({ pool: 'travelPoints', cost: 1 });
    // small nodes are the paths between clusters, bought with travel points
    expect(passiveNodeCost(PASSIVE_BY_ID.iron_skin_s1)).toEqual({ pool: 'travelPoints', cost: 1 });
    expect(passiveNodeCost(PASSIVE_BY_ID.iron_skin_n)).toEqual({ pool: 'passivePoints', cost: 3 });
    expect(passiveNodeCost(PASSIVE_BY_ID.brute_force_m)).toEqual({ pool: 'masteryPoints', cost: 1 });
    expect(passiveNodeCost(PASSIVE_BY_ID.forbidden_overclock)).toEqual({ pool: 'passivePoints', cost: 15 });
  });

  it('spends and refunds the exact pool cost and credits Act quest bosses once', () => {
    const s = newGame(1);
    expect(allocate(s, ctx(), 'str_hub')).toBeNull();
    expect(s.travelPoints).toBe(1);
    s.account.bank.regret = 1;
    expect(refund(s, ctx(), 'str_hub')).toBeNull();
    expect(s.travelPoints).toBe(2);
    s.bossesDefeated.push('sanctum');
    settlePassivePoints(s);
    expect(s.passivePoints).toBe(2);
    settlePassivePoints(s);
    expect(s.passivePoints).toBe(2);
  });

  it('recalculates existing characters to the new split without removing allocations', () => {
    const raw = JSON.parse(serialize(newGame(1)));
    raw.version = 39;
    raw.skills.combat = charXpForLevel(10);
    raw.travelPoints = 30;
    raw.passivePoints = 20;
    raw.passivePointLevel = 10;
    raw.passives = ['str_hub'];
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.passives).toEqual(['str_hub']);
    expect([loaded.travelPoints, loaded.passivePoints]).toEqual([19, 10]);
  });
});

describe('forbidden keystones', () => {
  it('sit out past the rim clusters, each hanging straight off a cluster, and can be reached', () => {
    for (const f of FORBIDDEN) {
      const n = PASSIVE_BY_ID[f.id];
      const r = Math.hypot(n.x, n.y);
      expect(r).toBeGreaterThan(RIM_RADIUS + 500);
      expect(r).toBeLessThan(RIM_RADIUS + 1300);
      // no long spokes: one link, straight onto a cluster's small node
      expect(n.links).toHaveLength(1);
      expect(PASSIVE_BY_ID[n.links[0]].kind).toBe('small');
    }
    const s = newGame(1, { name: 'r', classId: 'ranger' });
    take(s, route('class_dex', 'forbidden_overclock'));
    expect(s.passives).toContain('forbidden_overclock');
  });

  it('sit evenly round the rim, 30 degrees apart', () => {
    const angles = FORBIDDEN.map((f) => (Math.atan2(PASSIVE_BY_ID[f.id].y, PASSIVE_BY_ID[f.id].x) * 180) / Math.PI).sort((a, b) => a - b);
    angles.forEach((a, i) => expect(Math.abs(((angles[(i + 1) % 12] - a + 360) % 360) - 30)).toBeLessThan(1));
  });

  it('only one can be taken through the tree, and a save holding two is refunded', () => {
    const s = newGame(1, { name: 'r', classId: 'ranger' });
    s.skills.combat = charXpForLevel(100);
    const walk = (ids: string[]) => { for (const id of ids) if (!s.passives.includes(id)) expect(allocate(s, ctx(), id)).toBeNull(); };
    walk(route('class_dex', 'forbidden_overclock'));
    // the nearest other Forbidden keystone
    const second = FORBIDDEN.map((f) => f.id).filter((id) => id !== 'forbidden_overclock').sort((a, b) => route('class_dex', a).length - route('class_dex', b).length)[0];
    walk(route('class_dex', second).slice(0, -1));
    expect(allocateReason(s, second)).toMatch(/Only one Forbidden/);
    // a save from before the rule with two of them: the allocation is refunded in full on load
    const raw = JSON.parse(serialize(s));
    raw.passives = [...raw.passives, second];
    expect(deserialize(JSON.stringify(raw)).passives).toEqual([]);
  });
});

describe('doomed gates', () => {
  it('imposes the harsher permanent penalties', () => {
    const blood = newGame(1);
    const fullLife = deriveStats(blood).maxLife;
    blood.passives.push('doomed_blood_toll');
    expect(deriveStats(blood).maxLife).toBe(Math.round(fullLife * 0.6));

    const brittle = newGame(1);
    const normalPhysicalHit = mitigate(deriveStats(brittle), 100, 'phys');
    brittle.passives.push('doomed_brittle_bones');
    expect(mitigate(deriveStats(brittle), 100, 'phys') / normalPhysicalHit).toBeCloseTo(1.35, 1);

    const glass = newGame(1);
    const defenceBuff = [{ id: 'test', source: 'skill' as const, remainingMs: 1000, durationMs: 1000, stats: { armour: 100, energyShield: 100 } }];
    expect(deriveStats(glass, defenceBuff).armour).toBeGreaterThan(0);
    expect(deriveStats(glass, defenceBuff).maxEs).toBeGreaterThan(0);
    glass.passives.push('doomed_glass_veil');
    expect(deriveStats(glass, defenceBuff)).toMatchObject({ armour: 0, maxEs: 0 });

    const withered = newGame(1);
    const c = ctx();
    startCombat(withered, c, 'mudflats');
    withered.passives.push('doomed_withered_veins');
    expect(useFlask(withered, c, 0)).toMatch(/disabled/);

    const shattered = newGame(1);
    const normalReduction = deriveStats(shattered).raw.manaCostReduction;
    shattered.passives.push('doomed_shattered_mind');
    expect(deriveStats(shattered).raw.manaCostReduction).toBe(normalReduction - 150);

    const covenant = newGame(1);
    const normal = deriveStats(covenant).raw;
    covenant.passives.push('doomed_broken_covenant');
    const doomed = deriveStats(covenant).raw;
    expect(doomed.allRes).toBe(normal.allRes - 50);
    expect(doomed.chaosRes).toBe(normal.chaosRes - 50);
  });

  it('makes all twelve reward wheels substantially stronger', () => {
    const rewardNotables = PASSIVE_NODES.filter((n) => n.kind === 'notable' && /_DG[12]$/.test(n.cluster ?? ''));
    const moreNotables = rewardNotables.filter((n) => Object.keys(n.stats).some((key) => /^more[A-Z]/.test(key) || /More$/.test(key)));
    expect(rewardNotables).toHaveLength(36);
    expect(moreNotables).toHaveLength(12);
    expect(Math.min(...moreNotables.flatMap((n) => Object.entries(n.stats).filter(([key]) => /^more[A-Z]/.test(key) || /More$/.test(key)).map(([, value]) => value!)))).toBeGreaterThanOrEqual(35);
    expect(PASSIVE_NODES.find((n) => n.name === 'Bloodsworn')?.stats).toMatchObject({ life: 100, lifePct: 25 });
    expect(PASSIVE_NODES.find((n) => n.name === 'Killing Mark')?.stats.moreMark).toBe(55);
    expect(PASSIVE_NODES.find((n) => n.name === 'Perfect Faith')?.stats.maxElemRes).toBe(5);
  });
});

describe('keystones', () => {
  const arena = (s: GameState) => {
    s.skillBar = s.skillBar.map(() => null);
    s.skillBar[0] = createSkillGem(s, 'heavy_strike');
    s.skillBar[0].rules = [{ when: 'always' }];
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
    take(s, route('class_str', 'str_ks1'));
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
  it('earns a capped point per 10 total skill levels and gates deep nodes by level', () => {
    const s = newGame(1);
    expect(skillTreePoints(s)).toBe(1);
    s.skills.mining = xpForLevel(50);
    // 50 mining + 1 in each of the other ten skills = 60
    expect(skillTreePoints(s)).toBe(6);
    for (const id of ['core_0', 'mining_s0', 'mining_s1', 'mining_s2', 'mining_n1']) expect(allocateSkillNode(s, ctx(), id)).toBeNull();
    expect(allocateSkillNode(s, ctx(), 'mining_ks')).toBeNull();
    for (const skill of ['mining', 'woodcutting', 'harvesting', 'thieving', 'archaeology', 'smithing', 'alchemy', 'gemcutting', 'runecarving', 'cooking', 'cartography'] as const) {
      s.skills[skill] = xpForLevel(99);
    }
    expect(skillTreePoints(s)).toBe(MAX_SKILL_TREE_POINTS);
    expect(SKILL_TREE_NODES.length).toBeGreaterThanOrEqual(30);
  });

  it('has one branch for every implemented life skill and none for Fishing', () => {
    const branches = new Set(SKILL_TREE_NODES.filter((n) => n.branch !== 'core').map((n) => n.branch));
    for (const skill of ['mining', 'woodcutting', 'harvesting', 'thieving', 'archaeology', 'smithing', 'alchemy', 'gemcutting', 'runecarving', 'cooking', 'cartography']) {
      expect(branches.has(skill as never), skill).toBe(true);
      expect(SKILL_TREE_NODES.filter((n) => n.branch === skill)).toHaveLength(6);
    }
    expect(branches.has('fishing')).toBe(false);
  });

  it('refunds the old skilling tree when the specialisation cap arrives', () => {
    const raw = JSON.parse(serialize(newGame(1)));
    raw.version = 36;
    raw.skillPassives = ['core_0', 'fishing_s0', 'mining_s0'];
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.skillPassives).toEqual([]);
  });

  it('resets old character passives and all 3 loadouts on legacy save', () => {
    const raw = JSON.parse(serialize(newGame(1, { name: 'Magey', classId: 'mage' })));
    raw.version = 38;
    delete raw.characterTreeOverhaul;
    raw.passives = ['c_old_impossible_1', 'c_old_impossible_2'];
    raw.masteries = { c_old_mastery: 1 };
    raw.passiveProfiles = [
      { id: 'profile_1', name: 'P1', passives: ['c_old_impossible_1'], masteries: {} },
      { id: 'profile_2', name: 'P2', passives: ['c_old_impossible_2'], masteries: {} },
      { id: 'profile_3', name: 'P3', passives: ['c_old_impossible_1'], masteries: {} },
    ];
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.passives).toEqual([]);
    expect(loaded.masteries).toEqual({});
    expect(loaded.passiveProfiles[0].passives).toEqual([]);
    expect(loaded.passiveProfiles[1].passives).toEqual([]);
    expect(loaded.passiveProfiles[2].passives).toEqual([]);
    expect(loaded.travelPoints).toBeGreaterThan(0);
    expect(loaded.passivePoints).toBeGreaterThan(0);

    // Can allocate adjacent node from mage start
    const mageStart = PASSIVE_BY_ID[startNode(loaded)];
    expect(mageStart).toBeDefined();
    const adjacent = mageStart.links[0];
    expect(adjacent).toBeDefined();
    const err = allocate(loaded, ctx(), adjacent);
    expect(err).toBeNull();
    expect(loaded.passives).toContain(adjacent);
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
    expect(s.account.bank.copper_ore ?? 0).toBeGreaterThanOrEqual(actions * 2);
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
    expect(s.account.bank.sunpetal ?? 0).toBeGreaterThan(0);
  });
});
