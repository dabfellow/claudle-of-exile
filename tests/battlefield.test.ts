import { describe, expect, it } from 'vitest';
import { zoneDef } from '../src/data/zones';
import { areaCells, CELLS, chainFrom, cellCol, FLEE_SHAKE_MS, inReach, MOVEMENT, neighbors, PLAYER_SPOT } from '../src/engine/battlefield';
import { aliveMonsters, combatStep, makeMonster, setMovement, startCombat } from '../src/engine/combat';
import { createSkillGem, createSupportGem } from '../src/engine/gems';
import { makeCtx } from '../src/engine/context';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, Movement } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';

const ctx = (seed = 1) => makeCtx(seeded(seed));

/** A sturdy character that never attacks, so the field only changes through spawning and walking. */
function idler(movement: Movement = 'walk') {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  s.skills.combat = charXpForLevel(30);
  s.skillBar = s.skillBar.map(() => null);
  s.settings.movement = movement;
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
  it('is a 3-4-3 honeycomb with hex neighbours', () => {
    expect([0, 1, 2].map((col) => CELLS.filter((x) => x.col === col).length)).toEqual([3, 4, 3]);
    // the middle of the field touches six cells, a corner only three
    expect(neighbors(4)).toHaveLength(6);
    expect(neighbors(3)).toHaveLength(3);
  });

  it('keeps sending waves while you fight, up to what the pace allows', () => {
    const { s, c } = idler('walk');
    run(s, c, 2 * 60_000);
    const n = aliveMonsters(s.combat!).length;
    expect(n).toBeGreaterThan(zoneDef('mudflats').packSize[1]);
    expect(n).toBeLessThanOrEqual(MOVEMENT.walk.maxField);
    expect(new Set(s.combat!.monsters.map((m) => m.cell)).size).toBe(s.combat!.monsters.length);
  });

  it('running fills the field faster than creeping', () => {
    const count = (mv: Movement) => {
      const { s, c } = idler(mv);
      run(s, c, 30_000);
      return aliveMonsters(s.combat!).length;
    };
    expect(count('run')).toBeGreaterThan(count('slow'));
  });

  it('fleeing stops new waves and sheds the monsters furthest behind', () => {
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

  it('melee monsters walk to the front rank before they can hit, and become the target first', () => {
    const { s, c } = idler('flee');
    const zone = zoneDef('mudflats');
    const brute = makeMonster(zone.monsters[0], false, 1);
    brute.cell = 8;
    const caster = makeMonster(zone.monsters.find((m) => m.basic.kind === 'spell')!, false, 2);
    caster.cell = 3;
    s.combat!.monsters = [brute, caster];
    s.combat!.shakeMs = 1e12;
    expect(inReach(brute)).toBe(false);
    expect(inReach(caster)).toBe(true);
    expect(aliveMonsters(s.combat!)[0]).toBe(caster);
    for (let t = 0; t < 10_000 && cellCol(brute.cell) > 0; t += 50) {
      expect(c.events.some((e) => e.t === 'hit' && e.target === 'player' && e.monsterUid === 1)).toBe(false);
      combatStep(s, c, 50, deriveStats(s));
    }
    expect(cellCol(brute.cell)).toBe(0);
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
    expect(areaCells('splash', 4)).toHaveLength(7);
    expect(areaCells('rank', 1).map(cellCol)).toEqual([0, 0, 0]);
    // a lane through the middle: one cell per outer rank, two in the middle
    expect(areaCells('line', 1).map(cellCol).sort()).toEqual([0, 1, 1, 2]);
    expect(areaCells('field', 0)).toHaveLength(CELLS.length);
  });
  it('a fight in progress survives a save round-trip with its cells', () => {
    const { s, c } = idler('run');
    run(s, c, 20_000);
    const back = deserialize(serialize(s));
    expect(back.combat!.monsters.map((m) => m.cell)).toEqual(s.combat!.monsters.map((m) => m.cell));
    expect(back.settings.movement).toBe('run');
  });
});

/** A strong character with one skill, facing dummies placed on chosen cells. */
function skirmish(gemId: string, cells: number[], support?: string) {
  const s = newGame(1, { name: 'T', classId: gemId === 'spark' || gemId === 'fireball' ? 'mage' : 'warrior' });
  s.skills.combat = charXpForLevel(30);
  s.skillBar = s.skillBar.map(() => null);
  const gem = createSkillGem(s, gemId);
  gem.rule = { when: 'always' };
  if (support) gem.supports[0] = createSupportGem(s, support);
  s.skillBar[0] = gem;
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
  it('Ground Slam hits around the target, not the far edge', () => {
    // target front-centre (1); 4 touches it; 8 is across the field
    const { s, c, mons } = skirmish('ground_slam', [1, 4, 8]);
    fireOnce(s, c);
    expect(hurt(mons)).toEqual([true, true, false]);
    expect(c.events.some((e) => e.t === 'area')).toBe(true);
  });

  it('chains hop to the enemy nearest the last one hit', () => {
    const at = (cell: number) => Object.assign(makeMonster(zoneDef('mudflats').monsters[0], false, cell + 1), { cell });
    const [first, ...others] = [1, 9, 2, 3].map(at);
    // from 1 the nearest is 2 (same rank); from 2 it's 9 across the field, not 3 up top
    expect(chainFrom(first, [first, ...others], 2).map((m) => m.cell)).toEqual([1, 2, 9]);
  });

  it('Pierce sends a projectile down the whole lane', () => {
    const { s, c, mons } = skirmish('poison_dart', [1, 4, 8, 6], 'pierce');
    fireOnce(s, c);
    expect(hurt(mons)).toEqual([true, true, true, false]);
  });

  it("Inferno's blast leaves burning ground that hurts monsters standing in it", () => {
    const { s, c, mons } = skirmish('fireball', [1, 7], 'inferno');
    fireOnce(s, c);
    expect(s.combat!.ground.some((g) => g.kind === 'burning' && g.cell === 1)).toBe(true);
    expect(s.combat!.ground.some((g) => g.cell === 7)).toBe(false);
    mons[0].dots = [];
    const before = mons[0].life;
    s.combat!.actionMs = 1e12;
    for (let t = 0; t < 1000; t += 50) combatStep(s, c, 50, deriveStats(s));
    expect(mons[0].life).toBeLessThan(before);
  });

  it('War Cry shoves the front rank back a step', () => {
    const { s, c, mons } = skirmish('war_cry', [1]);
    fireOnce(s, c);
    expect(cellCol(mons[0].cell)).toBe(1);
  });

  it('caster spells leave ground under the player; running steps out of it faster', () => {
    const burn = (mv: Movement) => {
      const { s, c } = idler(mv);
      const shaman = makeMonster(zoneDef('ashwood').monsters.find((m) => m.id === 'emberkin')!, false, 1);
      shaman.cell = 8;
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
    const { s, c } = idler('flee');
    const rat = makeMonster(zoneDef('mudflats').monsters[0], false, 1);
    rat.cell = 4; // middle rank, touching front cells 0 and 1
    rat.attackMs = 1e9;
    s.combat!.monsters = [rat];
    s.combat!.shakeMs = 1e12;
    s.combat!.ground = [{ cell: 1, kind: 'burning', dps: 1, remainingMs: 1e9, durationMs: 1e9 }];
    for (let t = 0; t < 3000 && cellCol(rat.cell) > 0; t += 50) combatStep(s, c, 50, deriveStats(s));
    expect(rat.cell).toBe(0);
  });
});
