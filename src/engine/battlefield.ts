import type { Rng } from './rng';
import type { DamageType, Ground, GroundKind, MonsterInstance, Movement } from './types';

/**
 * The battlefield: a 3-4-3 honeycomb in front of the player. Column 0 is the front rank (melee range),
 * column 2 the far edge where new waves walk in. Rows are in half-steps so the columns interlock like hexes.
 */
export interface Cell {
  col: number;
  row: number;
}

export const CELLS: Cell[] = [
  { col: 0, row: 1 }, { col: 0, row: 3 }, { col: 0, row: 5 },
  { col: 1, row: 0 }, { col: 1, row: 2 }, { col: 1, row: 4 }, { col: 1, row: 6 },
  { col: 2, row: 1 }, { col: 2, row: 3 }, { col: 2, row: 5 },
];
export const COLUMNS = 3;
export const MAX_ROW = 6;
/** where a monster stands when nothing placed it (tests, old saves): front and centre */
export const FRONT_CELL = 1;
/** bosses hold the middle of the field */
export const BOSS_CELL = 4;
/** how long a melee monster takes to cross one column */
export const MONSTER_STEP_MS = 1100;

/** How the player moves through an area: how fast new waves find you, and how crowded the field may get before they stop. */
export const MOVEMENT: Record<Movement, { name: string; spawnRate: number; maxField: number; desc: string }> = {
  flee: { name: 'Flee', spawnRate: 0, maxField: 0, desc: 'No new monsters arrive, and every few seconds you lose the one furthest behind. Bosses keep up.' },
  slow: { name: 'Creep', spawnRate: 0.5, maxField: 3, desc: 'New waves arrive at half speed, and stop while 3 monsters are on you.' },
  walk: { name: 'Walk', spawnRate: 1, maxField: 6, desc: "The normal pace. Waves keep coming while you fight, up to 6 monsters at once." },
  run: { name: 'Run', spawnRate: 1.5, maxField: 10, desc: 'New waves arrive 50% faster and fill the whole field. More kills, if you can take it.' },
};
/** fleeing loses the furthest monster this often */
export const FLEE_SHAKE_MS = 1500;
/** auto-flee kicks in below this fraction of life and walks on again above the second */
export const AUTO_FLEE_AT = 0.35;
export const AUTO_FLEE_RESUME = 0.9;
/** fraction of max life and mana recovered per second once fleeing has shaken off every monster */
export const FLEE_BREATHER_REGEN = 0.1;
export const MOVEMENT_ORDER: Movement[] = ['flee', 'slow', 'walk', 'run'];

export const cellCol = (i: number): number => CELLS[i]?.col ?? 0;

/** Cells sharing an edge: the same column one row away, or the next column half a row away. */
export function neighbors(i: number): number[] {
  const a = CELLS[i];
  return CELLS.flatMap((b, j) => {
    const dc = Math.abs(a.col - b.col);
    const dr = Math.abs(a.row - b.row);
    return j !== i && ((dc === 0 && dr === 2) || (dc === 1 && dr === 1)) ? [j] : [];
  });
}

/** Straight-line distance in cells (neighbours are 1 apart). */
export function cellDistance(a: number, b: number): number {
  const p = CELLS[a];
  const q = CELLS[b];
  return Math.hypot((p.col - q.col) * Math.sqrt(3), p.row - q.row) / 2;
}

/**
 * Where a hit lands, around the cell it's aimed at:
 * - target: just that cell
 * - splash: the cell and every cell touching it (slams, explosions)
 * - rank: the target's whole column (a cleave or shout along the line of enemies)
 * - line: the target's lane through every rank, front to back (piercing, walls)
 * - field: everything
 */
export type AreaShape = 'target' | 'splash' | 'rank' | 'line' | 'field';

export function areaCells(shape: AreaShape, center: number): number[] {
  const c = CELLS[center];
  const all = CELLS.map((_, i) => i);
  switch (shape) {
    case 'target':
      return [center];
    case 'splash':
      return [center, ...neighbors(center)];
    case 'rank':
      return all.filter((i) => CELLS[i].col === c.col);
    case 'line':
      return all.filter((i) => Math.abs(CELLS[i].row - c.row) <= 1);
    case 'field':
      return all;
  }
}

/** A chain: each hop goes to the nearest enemy not yet hit. */
export function chainFrom(first: MonsterInstance, others: MonsterInstance[], hops: number): MonsterInstance[] {
  const hit = [first];
  let left = others.filter((m) => m !== first);
  for (let i = 0; i < hops && left.length; i++) {
    const from = hit[hit.length - 1].cell;
    const next = left.reduce((best, m) => (cellDistance(from, m.cell) < cellDistance(from, best.cell) ? m : best));
    hit.push(next);
    left = left.filter((m) => m !== next);
  }
  return hit;
}

/** Ground hazards sit on a cell, or under the player when the cell is PLAYER_SPOT. */
export const PLAYER_SPOT = -1;
export const GROUND: Record<GroundKind, { name: string; type: DamageType; desc: string }> = {
  burning: { name: 'Burning ground', type: 'fire', desc: 'Deals fire damage over time.' },
  chilled: { name: 'Chilled ground', type: 'cold', desc: 'Deals cold damage over time and slows actions.' },
  shocked: { name: 'Shocked ground', type: 'light', desc: 'Deals lightning damage over time; hits taken there deal 20% more.' },
  caustic: { name: 'Caustic ground', type: 'phys', desc: 'Deals physical damage over time.' },
};
export const groundFor = (type: DamageType): GroundKind =>
  type === 'fire' ? 'burning' : type === 'cold' ? 'chilled' : type === 'light' ? 'shocked' : 'caustic';
/** standing on shocked ground: hits there deal this much more */
export const SHOCKED_GROUND_TAKEN = 1.2;
/** standing on chilled ground: actions take this much longer */
export const CHILLED_GROUND_SLOW = 0.75;
/** a hazard under the player burns out this much faster while running or fleeing out of it */
export const STEP_OUT_RATE = 2;

/** Lay ground on a cell: one patch per kind per cell, keeping the stronger burn and the longer timer. */
export function layGround(ground: Ground[], cell: number, kind: GroundKind, dps: number, durationMs: number): void {
  const same = ground.find((g) => g.cell === cell && g.kind === kind);
  if (!same) ground.push({ cell, kind, dps, remainingMs: durationMs, durationMs });
  else {
    same.dps = Math.max(same.dps, dps);
    if (durationMs > same.remainingMs) same.remainingMs = same.durationMs = durationMs;
  }
}

/** War Cry's shove: front-rank melee is pushed back a column and has to walk in again. */
export function knockBack(monsters: MonsterInstance[]): number {
  let moved = 0;
  for (const m of monsters) {
    if (m.life <= 0 || m.isBoss || cellCol(m.cell) !== 0) continue;
    const taken = occupied(monsters);
    const back = neighbors(m.cell).filter((j) => cellCol(j) === 1 && !taken.has(j));
    if (!back.length) continue;
    m.cell = back[0];
    m.stepMs = m.moveMs;
    moved++;
  }
  return moved;
}

/** Melee monsters have to reach the front rank to swing; spells and bosses reach from anywhere. */
export function inReach(m: MonsterInstance): boolean {
  return m.isBoss || m.attackKind === 'spell' || cellCol(m.cell) === 0;
}

function occupied(monsters: MonsterInstance[]): Set<number> {
  return new Set(monsters.filter((m) => m.life > 0 && !m.dead).map((m) => m.cell));
}

/** A free cell, searching from the far edge (a wave walking in) or the front (adds called to the fight). -1 when full. */
export function freeCell(monsters: MonsterInstance[], rng: Rng, from: 'back' | 'front'): number {
  const taken = occupied(monsters);
  const cols = from === 'back' ? [2, 1, 0] : [0, 1, 2];
  for (const col of cols) {
    const open = CELLS.map((_, i) => i).filter((i) => cellCol(i) === col && !taken.has(i));
    if (open.length) return open[Math.floor(rng.next() * open.length)];
  }
  return -1;
}

/** Melee monsters close in one column at a time, taking the nearest open cell ahead of them and stepping around hazards when they can. */
export function advanceMonsters(monsters: MonsterInstance[], dt: number, hazards: Set<number> = new Set()): void {
  const walkers = monsters
    .filter((m) => m.life > 0 && !m.isBoss && m.attackKind === 'attack' && cellCol(m.cell) > 0)
    .sort((a, b) => cellCol(a.cell) - cellCol(b.cell));
  for (const m of walkers) {
    if (m.stunMs > 0 || m.frozenMs > 0) continue;
    m.stepMs -= m.chillMs > 0 ? dt / 2 : dt;
    if (m.stepMs > 0) continue;
    const taken = occupied(monsters);
    const here = CELLS[m.cell];
    const ahead = neighbors(m.cell)
      .filter((j) => cellCol(j) === here.col - 1 && !taken.has(j))
      .sort((a, b) => Number(hazards.has(a)) - Number(hazards.has(b)) || Math.abs(CELLS[a].row - 3) - Math.abs(CELLS[b].row - 3));
    if (ahead.length) m.cell = ahead[0];
    m.stepMs = m.moveMs;
  }
}
