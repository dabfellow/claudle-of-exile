import type { Rng } from './rng';
import type { DamageType, Ground, GroundKind, MonsterInstance, Movement } from './types';

/**
 * The battlefield (docs/BATTLEFIELD.md): a half-ring of pointy-top hexes around the player, who stands on the
 * bottom edge. Axial coordinates with the player at (0, 0); the field is every hex 1–4 steps away on the player's
 * row or above it. A hex's ring is its distance from the player: ring 1 is melee range, ring 4 the edge where
 * monsters walk in. Cells are numbered ring by ring, left to right, so cell 0 is the hex to the player's left.
 */
export interface Cell {
  q: number;
  r: number;
  ring: number;
  /** centre in hex units (a hex is √3 wide and 2 tall), the player at (0, 0) and up negative */
  x: number;
  y: number;
}

export const RINGS = 4;

const hexDistance = (q1: number, r1: number, q2: number, r2: number): number =>
  (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2;

function buildCells(): Cell[] {
  const out: Cell[] = [];
  for (let r = -RINGS; r <= 0; r++)
    for (let q = -RINGS; q <= RINGS; q++) {
      const ring = hexDistance(q, r, 0, 0);
      if (ring >= 1 && ring <= RINGS) out.push({ q, r, ring, x: Math.sqrt(3) * (q + r / 2), y: 1.5 * r });
    }
  // left to right: the angle from the player, from 180° (left) down to 0° (right)
  const angle = (c: Cell) => Math.atan2(0 - c.y, c.x); // 0 - y, not -y: -0 would put the left hex at -180°
  return out.sort((a, b) => a.ring - b.ring || angle(b) - angle(a));
}

export const CELLS: Cell[] = buildCells();
const INDEX = new Map(CELLS.map((c, i) => [`${c.q},${c.r}`, i]));
const cellAt = (q: number, r: number): number => INDEX.get(`${q},${r}`) ?? -1;

/** the edge: every hex here is a spawn gate */
export const EDGE_CELLS: number[] = CELLS.flatMap((c, i) => (c.ring === RINGS ? [i] : []));
/** where a monster stands when nothing placed it (tests, old saves): melee range, up and to the left */
export const FRONT_CELL = 1;
/** bosses walk in through the top-centre gate and hold the middle of ring 2 */
export const BOSS_ENTRY = cellAt(2, -4);
export const BOSS_CELL = cellAt(1, -2);
export const BOSS_RING = 2;
/** how many rings out a monster's spell reaches; casters stop walking once they're this close */
export const MONSTER_RANGE = 3;
/** how long a melee monster takes to walk one hex */
export const MONSTER_STEP_MS = 1100;

/** How the player moves through an area: how fast the gates send monsters, and how crowded the field may get before they stop. */
export const MOVEMENT: Record<Movement, { name: string; spawnRate: number; maxField: number; desc: string }> = {
  flee: { name: 'Flee', spawnRate: 0, maxField: 0, desc: 'No new monsters arrive, and every few seconds you lose the one furthest away. Bosses keep up.' },
  slow: { name: 'Creep', spawnRate: 0.5, maxField: 3, desc: 'Monsters arrive at half speed, and stop while 3 are on the field.' },
  walk: { name: 'Walk', spawnRate: 1, maxField: 6, desc: 'The normal pace. Monsters keep walking in while you fight, up to 6 at once.' },
  run: { name: 'Run', spawnRate: 1.5, maxField: 10, desc: 'Monsters arrive 50% faster and up to 10 crowd the field. More kills, if you can take it.' },
};
/** fleeing loses the furthest monster this often */
export const FLEE_SHAKE_MS = 1500;
/** auto-flee kicks in below this fraction of life and walks on again above the second */
export const AUTO_FLEE_AT = 0.35;
export const AUTO_FLEE_RESUME = 0.9;
/** fraction of max life and mana recovered per second once fleeing has shaken off every monster */
export const FLEE_BREATHER_REGEN = 0.1;
export const MOVEMENT_ORDER: Movement[] = ['flee', 'slow', 'walk', 'run'];

export const cellRing = (i: number): number => CELLS[i]?.ring ?? 1;

const DIRECTIONS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

/** The field cells sharing an edge with this one. */
export function neighbors(i: number): number[] {
  const c = CELLS[i];
  return DIRECTIONS.map(([dq, dr]) => cellAt(c.q + dq, c.r + dr)).filter((j) => j >= 0);
}

/** Steps between two cells (neighbours are 1 apart). */
export function cellDistance(a: number, b: number): number {
  const p = CELLS[a];
  const q = CELLS[b];
  return hexDistance(p.q, p.r, q.q, q.r);
}

/** Round a fractional axial position to the hex it falls in. */
function roundHex(q: number, r: number): [number, number] {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return [rq, rr];
}

/**
 * Where a hit lands, around the cell it's aimed at:
 * - target: just that cell
 * - splash: every cell within `radius` steps of it (slams, explosions)
 * - arc: the target's ring, the target and the cell either side (a sweep)
 * - beam: the straight line from the player through the target out to the edge (piercing)
 * - nova: every cell within `radius` rings of the player
 * - field: everything
 */
export type AreaShape = 'target' | 'splash' | 'arc' | 'beam' | 'nova' | 'field';

export function areaCells(shape: AreaShape, center: number, radius = shape === 'nova' ? 2 : 1): number[] {
  const all = CELLS.map((_, i) => i);
  const c = CELLS[center];
  switch (shape) {
    case 'target':
      return [center];
    case 'splash':
      return all.filter((i) => cellDistance(i, center) <= radius);
    case 'arc':
      return all.filter((i) => CELLS[i].ring === c.ring && cellDistance(i, center) <= 1);
    case 'beam': {
      // the target's direction, stretched to the edge, sampled once per ring (nudged so ties round the same way)
      const k = RINGS / c.ring;
      const out = new Set<number>();
      for (let step = 1; step <= RINGS; step++) {
        const t = step / RINGS;
        const [q, r] = roundHex(c.q * k * t + 1e-6, c.r * k * t + 2e-6);
        const j = cellAt(q, r);
        if (j >= 0) out.add(j);
      }
      return [...out];
    }
    case 'nova':
      return all.filter((i) => CELLS[i].ring <= radius);
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

function occupied(monsters: MonsterInstance[]): Set<number> {
  return new Set(monsters.filter((m) => m.life > 0 && !m.dead).map((m) => m.cell));
}

/** How far a cell sits from the straight line out from the player (pixel distance from the player), for "head straight in". */
const fromPlayer = (i: number): number => Math.hypot(CELLS[i].x, CELLS[i].y);

/** Free cells one ring closer to the player than this one, straightest first. */
function freeInward(i: number, taken: Set<number>): number[] {
  return neighbors(i)
    .filter((j) => cellRing(j) === cellRing(i) - 1 && !taken.has(j))
    .sort((a, b) => fromPlayer(a) - fromPlayer(b));
}

/** War Cry's shove: melee-range monsters are pushed one ring outward and have to walk in again. */
export function knockBack(monsters: MonsterInstance[]): number {
  let moved = 0;
  for (const m of monsters) {
    if (m.life <= 0 || m.isBoss || cellRing(m.cell) !== 1) continue;
    const taken = occupied(monsters);
    const c = CELLS[m.cell];
    // straight away from the player: nearest to the point twice as far out
    const back = neighbors(m.cell)
      .filter((j) => cellRing(j) === 2 && !taken.has(j))
      .sort((a, b) => Math.hypot(CELLS[a].x - 2 * c.x, CELLS[a].y - 2 * c.y) - Math.hypot(CELLS[b].x - 2 * c.x, CELLS[b].y - 2 * c.y));
    if (!back.length) continue;
    m.cell = back[0];
    m.stepMs = m.moveMs;
    moved++;
  }
  return moved;
}

/** Melee monsters have to reach ring 1 to swing; casters reach a few rings; bosses reach from anywhere. */
export function inReach(m: MonsterInstance): boolean {
  if (m.isBoss) return true;
  return cellRing(m.cell) <= (m.attackKind === 'spell' ? MONSTER_RANGE : 1);
}

/** Still on its way: melee to ring 1, casters to their range, bosses to the middle of the field. */
function walking(m: MonsterInstance): boolean {
  return m.isBoss ? cellRing(m.cell) > BOSS_RING : !inReach(m);
}

/** Free edge cells (gates), and free cells nearest a spot, for monsters arriving or being called in. */
export function freeEdge(monsters: MonsterInstance[]): number[] {
  const taken = occupied(monsters);
  return EDGE_CELLS.filter((i) => !taken.has(i));
}

export function freeNear(monsters: MonsterInstance[], cell: number, rng?: Rng): number[] {
  const taken = occupied(monsters);
  const jitter = CELLS.map(() => rng?.next() ?? 0);
  return CELLS.map((_, i) => i)
    .filter((i) => !taken.has(i))
    .sort((a, b) => cellDistance(a, cell) - cellDistance(b, cell) || jitter[a] - jitter[b]);
}

/**
 * Monsters walk toward the player one hex at a time, taking the straightest free hex a ring closer and stepping
 * around hazards when they can. With nothing free ahead, a melee monster slides sideways to a hex that has a way in
 * (around casters and the crowd), or waits: the swarm queues in ring 2.
 */
export function advanceMonsters(monsters: MonsterInstance[], dt: number, hazards: Set<number> = new Set()): void {
  const walkers = monsters.filter((m) => m.life > 0 && !m.dead && walking(m)).sort((a, b) => cellRing(a.cell) - cellRing(b.cell));
  for (const m of walkers) {
    if (m.stunMs > 0 || m.frozenMs > 0) continue;
    m.stepMs -= m.chillMs > 0 ? dt / 2 : dt;
    if (m.stepMs > 0) continue;
    m.stepMs = m.moveMs;
    const taken = occupied(monsters);
    const ahead = freeInward(m.cell, taken).sort((a, b) => Number(hazards.has(a)) - Number(hazards.has(b)));
    if (ahead.length) {
      m.cell = ahead[0];
      continue;
    }
    if (m.isBoss) continue;
    taken.delete(m.cell);
    const around = neighbors(m.cell).filter((j) => cellRing(j) === cellRing(m.cell) && !taken.has(j) && !hazards.has(j) && freeInward(j, taken).length);
    if (around.length) m.cell = around.sort((a, b) => fromPlayer(a) - fromPlayer(b))[0];
  }
}

/** A clear way in: from the monster, free hexes one ring closer each step, down to `range`. */
export function reachable(monsters: MonsterInstance[], m: MonsterInstance, range: number): boolean {
  const taken = occupied(monsters);
  taken.delete(m.cell);
  let at = m.cell;
  while (cellRing(at) > range) {
    const next = freeInward(at, taken)[0];
    if (next === undefined) return false;
    at = next;
  }
  return true;
}

/** Closing in: the player runs at a monster, so it ends up one ring closer. Returns false when the way is blocked. */
export function pullCloser(monsters: MonsterInstance[], m: MonsterInstance): boolean {
  const taken = occupied(monsters);
  const next = freeInward(m.cell, taken)[0];
  if (next === undefined) return false;
  m.cell = next;
  return true;
}
