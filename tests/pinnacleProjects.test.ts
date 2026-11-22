import { describe, expect, it } from 'vitest';
import { baseDef, uniqueDef } from '../src/data/bases';
import { FORBIDDEN, PASSIVE_BY_ID } from '../src/data/passiveTree';
import { professionProject } from '../src/data/professionProjects';
import { actionDef } from '../src/data/skills';
import { worldDropUniques } from '../src/data/uniqueDrops';
import { zoneDef } from '../src/data/zones';
import { PLAYER_SPOT } from '../src/engine/battlefield';
import { combatStep, makeMonster, startCombat } from '../src/engine/combat';
import { makeCtx, type Ctx } from '../src/engine/context';
import { applyOrb, impressionReason, orbReason } from '../src/engine/crafting';
import { equip, unequip } from '../src/engine/equipment';
import { createSkillGem } from '../src/engine/gems';
import { allMods, createUnique } from '../src/engine/items';
import { addMaps, addDoomedMaps, doomedHeld, mapStep, startDoomedMap, startMap, ORB_DROUGHT, DOOMED_DROUGHT } from '../src/engine/maps';
import { simulateOffline } from '../src/engine/offline';
import { allocate, allocateReason, spentPoints } from '../src/engine/passives';
import { forbiddenAllowance, sumOfAllMultiplier, sumOfAllRoll } from '../src/engine/pinnacles';
import { advanceProject, startProject } from '../src/engine/professions';
import { deserialize, serialize } from '../src/engine/save';
import { startSkillAction } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { switchPassiveProfile } from '../src/engine/treeProfiles';
import type { GameState, SkillId } from '../src/engine/types';
import { charXpForLevel, xpForLevel } from '../src/engine/xp';

const PINNACLES = ['the_second_heresy', 'worldheart', 'the_sum_of_all_things'] as const;
const fixed = (v: number) => makeCtx({ next: () => v });

function crafter(id: string): GameState {
  const s = newGame(3, { name: 'Pinnacle crafter', classId: 'templar' });
  const p = professionProject(id)!;
  s.skills.combat = charXpForLevel(90);
  s.skills[p.skill] = xpForLevel(99);
  s.professionProgress.work[p.skill] = 100;
  s.account.hideout.forge = 3;
  s.account.hideout.rune_board = 1;
  s.storage.bank = { ...p.inputs };
  return s;
}

describe('Phase 17 pinnacle projects', () => {
  it.each(PINNACLES)('%s: the full recipe grants a fixed ilvl 90 unique with exactly one explicit effect', (id) => {
    const s = crafter(id), c = fixed(.5), p = professionProject(id)!;
    expect(startProject(s, c, id)).toBeNull();
    // inputs are paid in full up front
    for (const input of Object.keys(p.inputs)) expect(s.storage.bank[input]).toBe(0);
    advanceProject(s, c, p.durationMs);
    const item = s.inventory.find((i) => i.uniqueId === id)!;
    expect(item).toBeTruthy();
    expect(item.ilvl).toBe(90);
    expect(allMods(item)).toHaveLength(1);
    expect(baseDef(item.baseId).implicits ?? []).toEqual([]);
    expect(baseDef(item.baseId).reqLevel).toBe(80);
    expect(uniqueDef(id).mods).toHaveLength(1);
    // no ordinary world-drop route
    expect(worldDropUniques(90).some((u) => u.id === id)).toBe(false);
    // equips into its ordinary jewellery slot
    expect(equip(s, c, item.uid)).toBeNull();
    const slot = { the_second_heresy: 'ring1', worldheart: 'belt', the_sum_of_all_things: 'amulet' }[id];
    expect((s.equipment as Record<string, { uid: number } | undefined>)[slot]?.uid).toBe(item.uid);
  });

  it('completes offline exactly like live work, and needs no combat level to manufacture', () => {
    const s = crafter('worldheart'), c = makeCtx({ next: () => .5 });
    s.skills.combat = 0;
    expect(startProject(s, c, 'worldheart')).toBeNull();
    simulateOffline(s, c, 3_700_000);
    expect(s.inventory.filter((i) => i.uniqueId === 'worldheart')).toHaveLength(1);
    expect(s.professionProgress.projects.worldheart.completed).toBe(1);
  });

  it('each recipe spans three real endgame activities, and the amulet draws on all twelve professions', () => {
    const skills = (id: string) => new Set(professionProject(id)!.sources.map((x) => x.skill));
    const professions: SkillId[] = ['mining', 'woodcutting', 'smelting', 'smithing', 'woodcrafting', 'harvesting', 'alchemy', 'astrology', 'gemcutting', 'thieving', 'archaeology', 'cartography'];
    for (const skill of professions) expect(skills('the_sum_of_all_things').has(skill)).toBe(true);
    const sum = professionProject('the_sum_of_all_things')!.inputs;
    // every named Hard Boss trophy and Uber sigil, one each, not generic trophies
    for (const id of ['marrow_shard', 'choir_glass', 'black_pearl', 'throne_ash', 'crownless_sigil', 'exile_doom_sigil', 'architect_doom_sigil', 'void_sigil']) expect(sum[id]).toBe(1);
    // Heresy = Hard Boss + Heist + Expedition; Worldheart = Doomed + Unique Map + Uber
    expect(professionProject('the_second_heresy')!.inputs).toMatchObject({ crownless_sigil: 1, stolen_oath_seal: 1, restored_taboo_tablet: 1 });
    expect(professionProject('worldheart')!.inputs).toMatchObject({ world_core_fragment: 3, reliquary_fragment: 1, architect_doom_sigil: 1 });
    // every component has a real producer in game data
    for (const id of ['restore_taboo_tablet', 'restore_convergence_relic', 'polish_exceptional', 'inscribe_convergence', 'frame_convergence', 'distill_star', 'chart_endgame_atlas', 'forge_uber_key_2', 'smelt_world']) {
      expect(actionDef(id), id).toBeTruthy();
    }
  });
});

describe('Phase 17 currency rules', () => {
  it('rolls Sum uniformly from 1 to 200 at craft, endpoints included', () => {
    const s = newGame(1);
    expect(sumOfAllRoll({ equipment: { amulet: createUnique(s, 'the_sum_of_all_things', 90, { next: () => 0 }) } })).toBe(1);
    expect(sumOfAllRoll({ equipment: { amulet: createUnique(s, 'the_sum_of_all_things', 90, { next: () => .99999 }) } })).toBe(200);
  });

  it('a low roll is still a finished craft and the inputs are spent', () => {
    const s = crafter('the_sum_of_all_things'), c = fixed(0);
    expect(startProject(s, c, 'the_sum_of_all_things')).toBeNull();
    advanceProject(s, c, professionProject('the_sum_of_all_things')!.durationMs);
    const item = s.inventory.find((i) => i.uniqueId === 'the_sum_of_all_things')!;
    expect(allMods(item)[0].values).toEqual([1]);
    expect(Object.values(s.storage.bank).every((n) => !n)).toBe(true);
  });

  it('Sum takes one ordinary Divine per reroll, uniform over the range, and the same number may return', () => {
    const s = newGame(1);
    const sum = createUnique(s, 'the_sum_of_all_things', 90, { next: () => .5 });
    s.inventory.push(sum);
    s.storage.bank.divine = 3;
    const roll = () => allMods(sum)[0].values[0];
    const before = roll();
    expect(applyOrb(s, fixed(.5), 'divine', sum.uid)).toBeNull();
    expect(roll()).toBe(before);
    expect(applyOrb(s, fixed(0), 'divine', sum.uid)).toBeNull();
    expect(roll()).toBe(1);
    expect(applyOrb(s, fixed(.99999), 'divine', sum.uid)).toBeNull();
    expect(roll()).toBe(200);
    expect(s.storage.bank.divine).toBe(0);
    // no Divine left: nothing else can pay for it, and no recipe is required
    expect(orbReason(s, 'divine', sum.uid)).toBe('You have none');
  });

  it('a Seal on Sum is refused before anything is charged', () => {
    const s = newGame(1);
    const sum = createUnique(s, 'the_sum_of_all_things', 90, { next: () => .5 });
    s.inventory.push(sum);
    s.storage.bank.divine = 1;
    s.storage.bank.forgers_seal = 1;
    const value = allMods(sum)[0].values[0];
    expect(applyOrb(s, fixed(0), 'divine', sum.uid, null, 'u_sum_of_all')).toBe('The Seal leaves nothing to reroll');
    expect([s.storage.bank.divine, s.storage.bank.forgers_seal, allMods(sum)[0].values[0]]).toEqual([1, 1, value]);
  });

  it.each(['the_second_heresy', 'worldheart', 'woundmaker', 'borrowed_tomorrow'])('%s is fixed: a Divine is refused and not charged', (id) => {
    const s = newGame(1);
    const item = createUnique(s, id, 90, { next: () => .5 });
    s.inventory.push(item);
    s.storage.bank.divine = 1;
    expect(applyOrb(s, fixed(.1), 'divine', item.uid)).toBe('All modifiers on this unique are fixed');
    expect(s.storage.bank.divine).toBe(1);
  });

  it.each(PINNACLES)("%s refuses Locksmith's Wax impressions", (id) => {
    const s = newGame(1);
    const item = createUnique(s, id, 90, { next: () => .5 });
    s.inventory.push(item);
    s.storage.bank.locksmiths_wax = 1;
    expect(impressionReason(s, item.uid)).toBe('Cannot take an impression of a unique');
  });
});

/** Shortest allocatable path from a class start to a node (never through other starts or masteries). */
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

describe('Phase 17 The Second Heresy', () => {
  const byDistance = FORBIDDEN.map((f) => f.id).sort((a, b) => route('class_dex', a).length - route('class_dex', b).length);
  function heretic() {
    const s = newGame(1, { name: 'Heretic', classId: 'ranger' });
    s.skills.combat = charXpForLevel(100);
    (s as unknown as { campaign: { act: number } }).campaign = { act: 6 };
    const c = fixed(.5);
    const walk = (ids: string[]) => { for (const id of ids) if (!s.passives.includes(id)) expect(allocate(s, c, id), id).toBeNull(); };
    return { s, c, walk };
  }
  const total = (s: GameState) => {
    const spent = spentPoints(s);
    return s.passivePoints + s.masteryPoints + spent.passivePoints + spent.masteryPoints;
  };

  it('allows exactly one extra Forbidden keystone, even with two copies, and keeps node prices', () => {
    const { s, c, walk } = heretic();
    walk(route('class_dex', byDistance[0]));
    walk(route('class_dex', byDistance[1]).slice(0, -1));
    expect(allocateReason(s, byDistance[1])).toMatch(/Only one Forbidden/);
    s.equipment.ring1 = createUnique(s, 'the_second_heresy', 90, c.rng);
    s.equipment.ring2 = createUnique(s, 'the_second_heresy', 90, c.rng);
    expect(forbiddenAllowance(s)).toBe(2);
    const points = s.passivePoints;
    walk([byDistance[1]]);
    expect(s.passivePoints).toBe(points - 15);
    walk(route('class_dex', byDistance[2]).slice(0, -1));
    expect(allocateReason(s, byDistance[2])).toMatch(/Only two Forbidden/);
  });

  it('removing it refunds the later keystone at its real cost and keeps every other node', () => {
    const { s, c, walk } = heretic();
    s.equipment.ring1 = createUnique(s, 'the_second_heresy', 90, c.rng);
    s.equipment.ring2 = createUnique(s, 'the_second_heresy', 90, c.rng);
    walk(route('class_dex', byDistance[0]));
    walk(route('class_dex', byDistance[1]));
    const before = total(s), points = s.passivePoints;
    // one copy off: the other still allows two
    expect(unequip(s, 'ring1')).toBeNull();
    expect(s.passives).toContain(byDistance[1]);
    expect(unequip(s, 'ring2')).toBeNull();
    expect(s.passives).toContain(byDistance[0]);
    expect(s.passives).not.toContain(byDistance[1]);
    expect(s.passives).toEqual(expect.arrayContaining(route('class_dex', byDistance[1]).slice(0, -1)));
    expect(s.passivePoints).toBe(points + 15);
    expect(total(s)).toBe(before);
  });

  it('settles on load, and a profile never keeps the allowance after the ring is gone', () => {
    const { s, c, walk } = heretic();
    s.equipment.ring1 = createUnique(s, 'the_second_heresy', 90, c.rng);
    walk(route('class_dex', byDistance[0]));
    walk(route('class_dex', byDistance[1]));
    // worn: a reload keeps both
    expect(deserialize(serialize(s)).passives).toEqual(s.passives);
    // traded away while saved: the reload keeps the earlier one only
    const raw = JSON.parse(serialize(s));
    delete raw.equipment.ring1;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.passives).toContain(byDistance[0]);
    expect(loaded.passives).not.toContain(byDistance[1]);
    expect(loaded.passivePoints).toBe(s.passivePoints + 15);
    // profile route: allocate on profile 1, park on profile 2, lose the ring, come back
    const before = total(s);
    expect(switchPassiveProfile(s, c, 'profile_2')).toBeNull();
    delete s.equipment.ring1;
    expect(switchPassiveProfile(s, c, 'profile_1')).toBeNull();
    expect(s.passives).toContain(byDistance[0]);
    expect(s.passives).not.toContain(byDistance[1]);
    expect(total(s)).toBe(before);
  });
});

function arena(gemId: string, opts: { sum?: number; stats?: Record<string, number> } = {}) {
  const s = newGame(1, { name: 'Pinnacle arena', classId: 'templar' });
  const c = fixed(.5);
  s.skills.combat = charXpForLevel(90);
  s.unlockedZones = ['mudflats'];
  s.skillBar.fill(null);
  const g = createSkillGem(s, gemId);
  g.rules = [{ when: 'always' }];
  s.skillBar[0] = g;
  if (opts.sum !== undefined) {
    const amulet = createUnique(s, 'the_sum_of_all_things', 90, c.rng);
    allMods(amulet)[0].values = [opts.sum];
    s.equipment.amulet = amulet;
  }
  s.settings.autoFlee = false;
  startCombat(s, c, 'mudflats');
  s.combat!.buffs.push({ id: 'arena', source: 'skill', durationMs: 1e9, remainingMs: 1e9, stats: { str: 300, dex: 300, int: 300, accuracy: 10000, manaRegenPct: 2000, ...opts.stats } });
  s.combat!.monsters = [0, 1].map((i) => {
    const m = makeMonster(zoneDef('mudflats').monsters[0], false, i + 10);
    m.life = m.maxLife = 1e9; m.armour = m.evasion = m.es = m.maxEs = 0;
    m.blockChance = m.spellBlockChance = 0; m.attackMs = 1e12; m.cell = i;
    m.res = { fire: 0, cold: 0, light: 0, chaos: 0 };
    return m;
  });
  s.combat!.spawnMs = 1e12;
  s.mana = deriveStats(s).maxMana;
  return { s, c };
}
function damageOver(gemId: string, ms: number, opts: { sum?: number; stats?: Record<string, number> } = {}) {
  const { s, c } = arena(gemId, opts);
  for (let t = 0; t < ms; t += 50) combatStep(s, c, 50, deriveStats(s));
  const mons = s.combat!.monsters;
  return { dealt: mons.reduce((a, m) => a + (m.maxLife - m.life), 0), dots: mons.some((m) => m.dots.length > 0), s };
}

describe('Phase 17 The Sum of All Things', () => {
  it('multiplies by 1 + roll/100 and uses the endpoints', () => {
    const s = newGame(1);
    for (const [roll, mult] of [[1, 1.01], [200, 3]] as const) {
      const amulet = createUnique(s, 'the_sum_of_all_things', 90, fixed(.5).rng);
      allMods(amulet)[0].values = [roll];
      expect(sumOfAllMultiplier({ equipment: { amulet } })).toBeCloseTo(mult, 10);
      expect(deriveStats({ ...s, equipment: { ...s.equipment, amulet } }).raw.sumOfAllMore).toBe(roll);
    }
    expect(sumOfAllMultiplier(s)).toBe(1);
  });

  it.each([
    ['hits with bleeds', 'heavy_strike', { bleedOnHit: 100 }],
    ['minions', 'drowned_thralls', {}],
    ['totems', 'flame_totem', {}],
  ] as const)('applies exactly once to %s, ailments included', (_label, gemId, stats) => {
    const plain = damageOver(gemId, 10_000, { stats });
    const doubled = damageOver(gemId, 10_000, { sum: 100, stats });
    const max = damageOver(gemId, 10_000, { sum: 200, stats });
    expect(plain.dealt).toBeGreaterThan(0);
    if (gemId === 'heavy_strike') expect(plain.dots).toBe(true);
    expect(doubled.dealt / plain.dealt).toBeCloseTo(2, 6);
    expect(max.dealt / plain.dealt).toBeCloseTo(3, 6);
  });

  it('does not change damage taken', () => {
    const plain = arena('heavy_strike'), summed = arena('heavy_strike', { sum: 200 });
    for (const { s } of [plain, summed]) {
      s.skillBar.fill(null);
      s.combat!.monsters[0].attackMs = 1000;
    }
    const takenOver = ({ s, c }: ReturnType<typeof arena>) => {
      const life = s.life;
      for (let t = 0; t < 3000; t += 50) combatStep(s, c, 50, deriveStats(s));
      return life - s.life;
    };
    expect(takenOver(summed)).toBe(takenOver(plain));
  });
});

describe('Phase 17 Worldheart', () => {
  function defender(worldheart: boolean) {
    const r = arena('heavy_strike');
    r.s.skillBar.fill(null);
    if (worldheart) r.s.equipment.belt = createUnique(r.s, 'worldheart', 90, r.c.rng);
    const m = r.s.combat!.monsters[0];
    m.attackMs = 1000; m.attackAilment = undefined; m.dotShare = 0; m.damage = 400;
    r.s.life = deriveStats(r.s).maxLife;
    r.s.es = 0;
    return r;
  }
  const firstPlayerHit = (c: ReturnType<typeof fixed>) => {
    for (const e of c.events) if (e.t === 'hit' && e.target === 'player' && e.amount > 0) return e.amount;
    return 0;
  };

  it('takes 30% less from hits, applied once', () => {
    const plain = defender(false), heart = defender(true);
    for (const { s, c } of [plain, heart]) for (let t = 0; t < 2500; t += 50) combatStep(s, c, 50, deriveStats(s));
    const a = firstPlayerHit(plain.c), b = firstPlayerHit(heart.c);
    expect(a).toBeGreaterThan(10);
    expect(Math.abs(b - Math.round(a * 0.7))).toBeLessThanOrEqual(1);
  });

  it('takes 30% less from damage over time on the ground', () => {
    // life lost to the burning ground, net of the same fight's regeneration without it
    const lifeAfter = (worldheart: boolean, burning: boolean) => {
      const { s, c } = defender(worldheart);
      s.combat!.monsters.forEach((m) => (m.attackMs = 1e12));
      if (burning) s.combat!.ground.push({ cell: PLAYER_SPOT, kind: 'burning', dps: 300, remainingMs: 2000, durationMs: 2000 });
      for (let t = 0; t < 1000; t += 50) combatStep(s, c, 50, deriveStats(s));
      return s.life;
    };
    const results = [false, true].map((worldheart) => lifeAfter(worldheart, false) - lifeAfter(worldheart, true));
    expect(results[0]).toBeGreaterThan(0);
    expect(results[1] / results[0]).toBeCloseTo(0.7, 2);
  });
});

describe('Phase 17 endgame supply hooks', () => {
  const ctx = (): Ctx => ({ now: 0, rng: { next: () => .999 }, emit: () => {} });
  function mapper() {
    const s = newGame(1);
    s.account.campaignDone = true;
    s.skills.cartography = xpForLevel(90);
    // Map Device 8 opens Doomed Map drops, the same access the Doomed Horizon notable gives
    s.account.hideout.map_device = 8;
    return s;
  }
  const winDoomed = (s: GameState) => {
    addDoomedMaps(s, 1, 1);
    expect(startDoomedMap(s, ctx(), 1)).toBeNull();
    s.maps.run!.bossDown = true;
    mapStep(s, ctx());
  };

  it('each Doomed victory gives one World Core and one Doom Key Fragment, once, and ten forge a chosen Uber Key', () => {
    const s = mapper();
    for (let i = 0; i < 10; i++) winDoomed(s);
    mapStep(s, ctx());
    expect(s.storage.bank.world_core_fragment).toBe(10);
    expect(s.storage.bank.doom_key_fragment).toBe(10);
    const before = s.storage.bank.uber_key_2 ?? 0;
    expect(startSkillAction(s, ctx(), 'forge_uber_key_2')).toBeNull();
    simulateOffline(s, ctx(), 120_000);
    expect(s.storage.bank.uber_key_2).toBe(before + 1);
    expect(s.storage.bank.doom_key_fragment).toBe(0);
  });

  it('guarantees a Fractured Orb after ten Doomed victories without one, and a real drop resets the count', () => {
    const s = mapper();
    for (let i = 0; i < 9; i++) winDoomed(s);
    const before = s.storage.bank.fractured ?? 0;
    winDoomed(s);
    expect(s.storage.bank.fractured).toBe(before + 1);
    expect(s.professionProgress.counters[ORB_DROUGHT]).toBe(0);
    // an orb that drops in a run: that run does not count toward the next ten
    s.professionProgress.counters[ORB_DROUGHT] = -1;
    winDoomed(s);
    expect(s.professionProgress.counters[ORB_DROUGHT]).toBe(0);
  });

  it('guarantees a Doomed Map I after ten T8–T10 boss wins without one, only with Doomed access', () => {
    const locked = newGame(1);
    locked.account.campaignDone = true;
    for (let i = 0; i < 10; i++) { addMaps(locked, 8, 1); startMap(locked, ctx(), 8); locked.maps.run!.bossDown = true; mapStep(locked, ctx()); }
    expect(doomedHeld(locked, 1)).toBe(0);
    const s = mapper();
    for (let i = 0; i < 10; i++) {
      addMaps(s, 9, 1); expect(startMap(s, ctx(), 9)).toBeNull(); s.maps.run!.bossDown = true; mapStep(s, ctx());
      expect(doomedHeld(s, 1)).toBe(i === 9 ? 1 : 0);
    }
    expect(s.professionProgress.counters[DOOMED_DROUGHT]).toBe(0);
  });
});
