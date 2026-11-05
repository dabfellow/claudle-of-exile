import { describe, expect, it } from 'vitest';
import { zoneDef } from '../src/data/zones';
import {
  areaCells,
  CELLS,
  cellRing,
  chainFrom,
  EDGE_CELLS,
  FLEE_SHAKE_MS,
  inReach,
  MONSTER_RANGE,
  MOVEMENT,
  neighbors,
  PLAYER_SPOT,
  POSTURES,
  RINGS,
} from '../src/engine/battlefield';
import { aliveMonsters, combatStep, currentMovement, lockTarget, makeMonster, setMovement, setPosture, startCombat } from '../src/engine/combat';
import { createSkillGem, createSupportGem, gemUseReason } from '../src/engine/gems';
import { createItem } from '../src/engine/items';
import { makeCtx } from '../src/engine/context';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, Movement } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';
import { armFor } from './helpers';

const ctx = (seed = 1) => makeCtx(seeded(seed));
/** the field cell at axial (q, r); the player stands at (0, 0) */
const at = (q: number, r: number) => CELLS.findIndex((c) => c.q === q && c.r === r);
const rangedDef = () => zoneDef('mudflats').monsters.find((m) => m.basic.kind === 'spell')!;

/** A sturdy character that never attacks, so the field only changes through spawning and walking. */
function idler(movement: Movement = 'walk') {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  s.skills.combat = charXpForLevel(30);
  s.skillBar = s.skillBar.map(() => null);
  setMovement(s, movement);
  s.settings.autoFlee = false;
  const c = ctx();
  startCombat(s, c, 'mudflats');
  s.combat!.actionMs = 1e12;
  return { s, c };
}

function run(s: GameState, c: ReturnType<typeof ctx>, ms: number) {
  for (let t = 0; t < ms && s.combat; t += 50) {
    s.life = deriveStats(s).maxLife;
    combatStep(s, c, 50, deriveStats(s));
  }
}

describe('battlefield', () => {
  it('is a half-ring of 34 hexes in 4 rings around the player', () => {
    expect(CELLS).toHaveLength(34);
    expect([1, 2, 3, 4].map((r) => CELLS.filter((c) => c.ring === r).length)).toEqual([4, 7, 10, 13]);
    expect(EDGE_CELLS).toHaveLength(13);
    // numbered ring by ring, left to right: cell 0 is right beside the player on the left
    expect(CELLS[0]).toMatchObject({ q: -1, r: 0, ring: 1 });
    expect(CELLS[3]).toMatchObject({ q: 1, r: 0, ring: 1 });
    // nothing below the player's row
    expect(CELLS.every((c) => c.r <= 0)).toBe(true);
    // an inner hex touches six others, a corner by the player fewer
    expect(neighbors(at(0, -2))).toHaveLength(6);
    expect(neighbors(0).length).toBeLessThan(6);
  });

  it('keeps sending monsters while you fight, up to what the pace allows, one per hex', () => {
    const { s, c } = idler('walk');
    run(s, c, 2 * 60_000);
    const n = aliveMonsters(s.combat!).length;
    expect(n).toBeGreaterThan(zoneDef('mudflats').packSize[1]);
    expect(n).toBeLessThanOrEqual(MOVEMENT.walk.maxField);
    expect(new Set(s.combat!.monsters.map((m) => m.cell)).size).toBe(s.combat!.monsters.length);
  });

  it('monsters walk in through the edge hexes', () => {
    const { s, c } = idler('run');
    const seen = new Map<number, number>();
    for (let t = 0; t < 30_000; t += 50) {
      run(s, c, 50);
      for (const m of s.combat!.monsters) if (!seen.has(m.uid)) seen.set(m.uid, m.cell);
    }
    expect(seen.size).toBeGreaterThan(3);
    expect([...seen.values()].every((cell) => cellRing(cell) === RINGS)).toBe(true);
  });

  it('running fills the field faster than creeping', () => {
    const count = (mv: Movement) => {
      const { s, c } = idler(mv);
      run(s, c, 30_000);
      return aliveMonsters(s.combat!).length;
    };
    expect(count('run')).toBeGreaterThan(count('slow'));
  });

  it('fleeing stops new monsters and sheds the ones furthest away', () => {
    const { s, c } = idler('run');
    run(s, c, 40_000);
    const before = aliveMonsters(s.combat!).length;
    expect(before).toBeGreaterThan(2);
    setMovement(s, 'flee');
    run(s, c, FLEE_SHAKE_MS * 2 + 100);
    expect(aliveMonsters(s.combat!).length).toBe(before - 2);
    run(s, c, 60_000);
    expect(aliveMonsters(s.combat!)).toHaveLength(0);
  });

  it('postures turn range intent into the underlying movement pace', () => {
    const { s, c } = idler();
    const far = makeMonster(zoneDef('mudflats').monsters[0], false, 1);
    far.cell = EDGE_CELLS[0];
    s.combat!.monsters = [far];
    setPosture(s, 'brawler');
    expect(currentMovement(s)).toBe('run');
    far.cell = CELLS.findIndex((cell) => cell.ring === 1);
    expect(currentMovement(s)).toBe('walk');
    setPosture(s, 'kiter');
    combatStep(s, c, 50, deriveStats(s));
    expect(cellRing(far.cell)).toBe(2);
    setPosture(s, 'cautious');
    expect(currentMovement(s)).toBe('slow');
    expect(POSTURES.cautious.desc).toContain('flasks');
  });

  it('melee monsters walk to ring 1 before they can hit; casters stop at their range', () => {
    const { s, c } = idler('flee');
    const brute = makeMonster(zoneDef('mudflats').monsters[0], false, 1);
    brute.cell = at(-4, 0);
    const caster = makeMonster(rangedDef(), false, 2);
    caster.cell = at(4, -4);
    s.combat!.monsters = [brute, caster];
    s.combat!.shakeMs = 1e12;
    expect(inReach(brute)).toBe(false);
    for (let t = 0; t < 20_000 && cellRing(brute.cell) > 1; t += 50) {
      expect(c.events.some((e) => e.t === 'hit' && e.target === 'player' && e.monsterUid === 1)).toBe(false);
      combatStep(s, c, 50, deriveStats(s));
    }
    expect(cellRing(brute.cell)).toBe(1);
    expect(cellRing(caster.cell)).toBe(MONSTER_RANGE);
    expect(inReach(caster)).toBe(true);
    expect(aliveMonsters(s.combat!)[0]).toBe(brute);
  });

  it('auto-flee takes over on low life and hands back once healed', () => {
    const { s, c } = idler('walk');
    s.settings.autoFlee = true;
    run(s, c, 3000);
    s.life = 1;
    combatStep(s, c, 50, deriveStats(s));
    expect(s.combat!.fleeing).toBe(true);
    s.life = deriveStats(s).maxLife;
    combatStep(s, c, 50, deriveStats(s));
    expect(s.combat!.fleeing).toBe(false);
    expect(s.settings.movement).toBe('walk');
  });

  it('area shapes cover the right cells', () => {
    expect(areaCells('splash', at(0, -2))).toHaveLength(7);
    // 19 hexes within two steps, less the player's own hex, which isn't part of the field
    expect(areaCells('splash', at(0, -2), 2)).toHaveLength(18);
    // a sweep along ring 1: the target and the hex either side
    expect(areaCells('arc', 1).sort()).toEqual([0, 1, 2]);
    // a beam from the hex on the left goes straight out to the edge, one hex per ring
    expect(areaCells('beam', 0).sort()).toEqual([at(-1, 0), at(-2, 0), at(-3, 0), at(-4, 0)].sort());
    expect(areaCells('beam', at(1, -2)).map(cellRing).sort()).toEqual([1, 2, 3, 4]);
    expect(areaCells('nova', 0, 2)).toHaveLength(11);
    expect(areaCells('field', 0)).toHaveLength(CELLS.length);
  });

  it('a fight in progress survives a save round-trip with its cells and gates', () => {
    const { s, c } = idler('run');
    run(s, c, 20_000);
    const back = deserialize(serialize(s));
    expect(back.combat!.monsters.map((m) => m.cell)).toEqual(s.combat!.monsters.map((m) => m.cell));
    expect(back.combat!.gates).toEqual(s.combat!.gates);
    expect(back.settings.movement).toBe('run');
  });

  it('a save from the old 3-4-3 field restarts the fight', () => {
    const { s, c } = idler('run');
    run(s, c, 20_000);
    const raw = JSON.parse(serialize(s));
    raw.version = 18;
    const back = deserialize(JSON.stringify(raw));
    expect(back.combat!.monsters).toEqual([]);
    expect(back.settings.targeting).toEqual({ priority: 'none', order: 'closest' });
  });
});

/** A strong character with one skill, facing dummies placed on chosen cells. */
function skirmish(gemId: string, cells: number[], support?: string) {
  const s = newGame(1, { name: 'T', classId: gemId === 'spark' || gemId === 'fireball' ? 'mage' : 'warrior' });
  s.skills.combat = charXpForLevel(40);
  s.skillBar = s.skillBar.map(() => null);
  const gem = createSkillGem(s, gemId);
  gem.rules = [{ when: 'always' }];
  if (support) gem.supports[0] = createSupportGem(s, support);
  s.skillBar[0] = gem;
  armFor(s, gemId);
  s.settings.autoFlee = false;
  const c = ctx();
  startCombat(s, c, 'mudflats');
  s.combat!.spawnMs = 1e12;
  s.combat!.monsters = cells.map((cell, i) => {
    const m = makeMonster({ ...zoneDef('mudflats').monsters[0], level: 5 }, false, i + 1);
    m.life = m.maxLife = 1e6;
    m.attackMs = 1e9;
    m.moveMs = m.stepMs = 1e9;
    m.cell = cell;
    return m;
  });
  s.mana = deriveStats(s).maxMana;
  return { s, c, mons: s.combat!.monsters };
}

const hurt = (mons: { life: number; maxLife: number }[]) => mons.map((m) => m.life < m.maxLife);

function fireOnce(s: GameState, c: ReturnType<typeof ctx>) {
  for (let t = 0; t < 8000 && !c.events.some((e) => e.t === 'skill'); t += 50) combatStep(s, c, 50, deriveStats(s));
  combatStep(s, c, 1, deriveStats(s));
}

describe('skills on the battlefield', () => {
  it('Ground Slam sweeps the target and the hexes either side, not the ring behind', () => {
    const { s, c, mons } = skirmish('ground_slam', [1, 2, at(0, -2)]);
    fireOnce(s, c);
    expect(hurt(mons)).toEqual([true, true, false]);
    expect(c.events.some((e) => e.t === 'area')).toBe(true);
  });

  it('chains hop to the enemy nearest the last one hit', () => {
    const mk = (cell: number) => Object.assign(makeMonster(zoneDef('mudflats').monsters[0], false, cell + 1), { cell });
    const [first, ...others] = [0, 3, 1, at(4, -4)].map(mk);
    // from 0 the nearest is 1 (next to it); from 1 it's 3 across the top, not the far edge
    expect(chainFrom(first, [first, ...others], 2).map((m) => m.cell)).toEqual([0, 1, 3]);
  });

  it('Pierce sends a projectile down a beam to the edge', () => {
    const { s, c, mons } = skirmish('poison_dart', [at(-1, 0), at(-2, 0), at(-3, 0), at(-4, 0), 3], 'pierce');
    fireOnce(s, c);
    expect(hurt(mons)).toEqual([true, true, true, true, false]);
  });

  it("Inferno's blast leaves burning ground that hurts monsters standing in it", () => {
    const { s, c, mons } = skirmish('fireball', [0, at(4, 0)]);
    s.skillBar[0]!.supports[0] = createSupportGem(s, 'inferno');
    fireOnce(s, c);
    expect(s.combat!.ground.some((g) => g.kind === 'burning' && g.cell === 0)).toBe(true);
    expect(s.combat!.ground.some((g) => g.cell === at(4, 0))).toBe(false);
    mons[0].dots = [];
    const before = mons[0].life;
    s.combat!.actionMs = 1e12;
    for (let t = 0; t < 1000; t += 50) combatStep(s, c, 50, deriveStats(s));
    expect(mons[0].life).toBeLessThan(before);
  });

  it('War Cry shoves melee range back a ring', () => {
    const { s, c, mons } = skirmish('war_cry', [1]);
    fireOnce(s, c);
    expect(cellRing(mons[0].cell)).toBe(2);
  });

  it('caster spells leave ground under the player; running steps out of it faster', () => {
    const burn = (mv: Movement) => {
      const { s, c } = idler(mv);
      const shaman = makeMonster(zoneDef('ashwood').monsters.find((m) => m.id === 'emberkin')!, false, 1);
      shaman.cell = at(0, -3);
      shaman.attackTimer = shaman.attackMs - 10;
      s.combat!.monsters = [shaman];
      s.combat!.spawnMs = 1e12;
      s.combat!.shakeMs = 1e12;
      combatStep(s, c, 50, deriveStats(s));
      expect(s.combat!.ground.some((g) => g.cell === PLAYER_SPOT && g.kind === 'burning')).toBe(true);
      let t = 0;
      shaman.attackMs = 1e9;
      while (s.combat!.ground.length && t < 10_000) {
        combatStep(s, c, 50, deriveStats(s));
        t += 50;
      }
      return t;
    };
    expect(burn('run')).toBeLessThan(burn('walk'));
  });

  it('melee monsters step around hazardous ground when they can', () => {
    // (-1, -1) is in ring 2 and touches both 0 and 1 in ring 1: it takes whichever isn't burning
    for (const [burning, expected] of [[0, 1], [1, 0]]) {
      const { s, c } = idler('flee');
      const rat = makeMonster(zoneDef('mudflats').monsters[0], false, 1);
      rat.cell = at(-1, -1);
      rat.attackMs = 1e9;
      s.combat!.monsters = [rat];
      s.combat!.shakeMs = 1e12;
      s.combat!.ground = [{ cell: burning, kind: 'burning', dps: 1, remainingMs: 1e9, durationMs: 1e9 }];
      for (let t = 0; t < 3000 && cellRing(rat.cell) > 1; t += 50) combatStep(s, c, 50, deriveStats(s));
      expect(rat.cell).toBe(expected);
    }
  });

  it('ground under the player kills even when the last monster dies on the same tick', () => {
    const { s, c } = idler();
    const rat = makeMonster(zoneDef('mudflats').monsters[0], false, 1);
    rat.life = 0.001;
    rat.dots = [{ kind: 'bleed', dps: 100, remainingMs: 1000, durationMs: 1000, dealt: 0, gemId: 'x' }];
    s.combat!.monsters = [rat];
    s.combat!.ground = [{ cell: PLAYER_SPOT, kind: 'burning', dps: 1e6, remainingMs: 1000, durationMs: 1000 }];
    s.es = 0;
    const deaths = s.lifetime.deaths;
    combatStep(s, c, 50, deriveStats(s));
    expect(s.lifetime.deaths).toBe(deaths + 1);
    expect(s.combat).toBeNull();
  });
});

describe('range, closing in and targeting', () => {
  it('a melee skill closes in on a monster out of reach, then hits it', () => {
    const { s, c, mons } = skirmish('heavy_strike', [at(0, -3)]);
    fireOnce(s, c);
    expect(c.events.filter((e) => e.t === 'closeIn')).toHaveLength(2);
    expect(cellRing(mons[0].cell)).toBe(1);
    expect(hurt(mons)).toEqual([true]);
  });

  it("Lacerate reaches two rings, so it doesn't need to close in from ring 2", () => {
    const { s, c, mons } = skirmish('lacerate', [at(0, -2)]);
    fireOnce(s, c);
    expect(c.events.some((e) => e.t === 'closeIn')).toBe(false);
    expect(hurt(mons)).toEqual([true]);
  });

  it("can't close in through a wall of monsters; hits what's in reach instead", () => {
    // ring 1 is full, so the monster in ring 2 has no way in
    const { s, c, mons } = skirmish('heavy_strike', [0, 1, 2, 3, at(0, -2)]);
    s.settings.targeting = { priority: 'none', order: 'farthest' };
    fireOnce(s, c);
    expect(c.events.some((e) => e.t === 'closeIn')).toBe(false);
    expect(hurt(mons).slice(4)).toEqual([false]);
    expect(hurt(mons).slice(0, 4)).toContain(true);
  });

  it('targeting: lowest life first, and a clicked monster beats the setting', () => {
    const { s, c, mons } = skirmish('spark', [0, at(0, -3), at(3, -3)]);
    s.skillBar[0]!.rules = [{ when: 'always' }];
    mons[1].life = 10;
    mons[1].maxLife = 1e6;
    s.settings.targeting = { priority: 'none', order: 'lowest' };
    fireOnce(s, c);
    expect(c.events.find((e) => e.t === 'hit' && e.target === 'monster')).toMatchObject({ monsterUid: mons[1].uid });

    const b = skirmish('heavy_strike', [0, 3]);
    lockTarget(b.s, b.mons[1].uid);
    fireOnce(b.s, b.c);
    expect(hurt(b.mons)).toEqual([false, true]);
  });

  it('a skill needs the right weapon: no slams with a bow', () => {
    const { s, c, mons } = skirmish('heavy_strike', [0]);
    s.equipment.weapon = createItem(s, 'short_bow', 1, 'normal', seeded(1));
    const d = deriveStats(s);
    expect(gemUseReason(d.combatLevel, d.attributes, s.skillBar[0]!, d.weaponFamily)).toMatch(/^Needs a /);
    // placing it on the bar doesn't check the weapon
    expect(gemUseReason(d.combatLevel, d.attributes, s.skillBar[0]!)).toBeNull();
    for (let t = 0; t < 8000; t += 50) combatStep(s, c, 50, deriveStats(s));
    expect(c.events.some((e) => e.t === 'skill')).toBe(false);
    // the bow's default attack still shoots it
    expect(hurt(mons)).toEqual([true]);
  });
});
