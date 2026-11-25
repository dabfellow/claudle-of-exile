import {
  BINARY_PARTNER, BLACK_LINE_BONUS, BLACK_PENALTY, chartLayout, chartSlotCount, FALLEN_CHANCE, FALLEN_ROLL, FALLEN_TABLE, fallenKind, GILDED_STARDUST, LINE_BONUS,
  MAX_GILDED_RANK, MAX_RANK, NOVA_BONUS, rankXp, RANK_UP_STARDUST, RECHART_COST, regionDef, REGIONS, researchNeeded, STARDUST, starDef, STARS, WATCH_STAR_XP,
  WONDER_RANK_STEP, type StarDef, type StarFamily,
} from '../data/astrology';
import type { SkillAction } from '../data/skills';
import { canAfford, payCost } from './bank';
import { rollCollectible } from './collectibles';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import type { Ctx } from './context';
import { chance, pick } from './rng';
import type { AstrologyState, GameState, SkillId, StatKey } from './types';
import { levelOf } from './xp';

export function newAstrologyState(): AstrologyState {
  return { regions: {}, stars: {}, fallen: [], chart: { slots: [null, null, null] }, log: [] };
}

const LOG_LIMIT = 200;
/** The save loader fills a missing or half-filled astrology block from this shape, so every field is safe to read. */
function astro(s: GameState): AstrologyState {
  const a = (s.astrology ??= newAstrologyState());
  a.regions ??= {};
  a.stars ??= {};
  a.fallen ??= [];
  a.chart ??= { slots: [] };
  a.chart.slots ??= [];
  a.log ??= [];
  return a;
}

function note(s: GameState, ctx: Ctx, text: string, tone?: 'good'): void {
  const a = astro(s);
  a.log.push(text);
  if (a.log.length > LOG_LIMIT) a.log.splice(0, a.log.length - LOG_LIMIT);
  ctx.emit({ t: 'info', text, tone });
}

export const astrologyLevel = (s: GameState): number => levelOf('astrology', s.skills.astrology ?? 0);

// ---------- research and stars ----------

export function researchPoints(s: GameState, regionId: string): number {
  return astro(s).regions[regionId]?.research ?? 0;
}

/** Stars a region's research has unlocked so far. */
export function unlockedInRegion(s: GameState, regionId: string): number {
  const r = regionDef(regionId);
  if (!r) return 0;
  return r.stars.filter((id) => !!astro(s).stars[id]).length;
}

export const isUnlocked = (s: GameState, starId: string): boolean => !!astro(s).stars[starId];
export const starRank = (s: GameState, starId: string): number => astro(s).stars[starId]?.rank ?? 0;
export const starXp = (s: GameState, starId: string): number => astro(s).stars[starId]?.xp ?? 0;

/** Rank cap: 10 normally, 15 for those with Gilded Stardust to spend. The ranks past 10 each cost one. */
export const rankCap = MAX_GILDED_RANK;

export function rankUpCost(rank: number): Record<string, number> {
  const cost: Record<string, number> = { [STARDUST]: RANK_UP_STARDUST };
  if (rank + 1 > MAX_RANK) cost[GILDED_STARDUST] = 1;
  return cost;
}

/** Star XP the next rank needs, or null at the top. */
export function xpToNextRank(s: GameState, starId: string): number | null {
  const st = astro(s).stars[starId];
  return !st || st.rank >= MAX_GILDED_RANK ? null : rankXp(st.rank + 1);
}

/** Why a star can't rank up right now once its XP is full, or null if it can (or isn't full). */
export function rankUpBlocker(s: GameState, starId: string): string | null {
  const st = astro(s).stars[starId];
  if (!st) return 'Research its sky region to unlock this star';
  if (st.rank >= MAX_GILDED_RANK) return 'Already at the highest rank';
  if (st.xp < rankXp(st.rank + 1)) return null;
  const cost = rankUpCost(st.rank);
  if (!canAfford(s, cost)) return st.rank + 1 > MAX_RANK ? `Needs ${RANK_UP_STARDUST} Stardust and 1 Gilded Stardust to rank up` : `Needs ${RANK_UP_STARDUST} Stardust to rank up`;
  return null;
}

function tryRankUp(s: GameState, ctx: Ctx, starId: string): void {
  const st = astro(s).stars[starId];
  if (!st || st.rank >= MAX_GILDED_RANK || st.xp < rankXp(st.rank + 1)) return;
  const cost = rankUpCost(st.rank);
  if (!canAfford(s, cost)) return;
  payCost(s, cost);
  st.xp -= rankXp(st.rank + 1);
  st.rank += 1;
  note(s, ctx, `${starDef(starId)!.name} ranked up to ${st.rank}`, 'good');
}

/** A star-watching or region-research action's own extra rules (a star must be unlocked, and able to take more XP). */
export function astrologyBlocker(s: GameState, a: SkillAction): string | null {
  if (a.skill !== 'astrology' || !a.id.startsWith('watch_')) return null;
  const id = a.id.slice('watch_'.length);
  const st = astro(s).stars[id];
  if (!st) return 'Research its sky region to unlock this star';
  if (st.rank >= MAX_GILDED_RANK) return 'Already at the highest rank';
  if (st.xp >= rankXp(st.rank + 1)) return rankUpBlocker(s, id);
  return null;
}

/** What a finished Astrology action does beyond the usual XP and drops. Runs offline too. */
export function astrologyDone(s: GameState, ctx: Ctx, a: SkillAction, times = 1): void {
  if (a.skill !== 'astrology') return;
  const st = astro(s);
  if (a.id.startsWith('research_')) {
    const r = regionDef(a.id.slice('research_'.length));
    if (!r) return;
    const row = (st.regions[r.id] ??= { research: 0 });
    row.research += times;
    for (let i = 0; i < times; i++) rollCollectible(s, ctx, 'astrology', r.id);
    r.stars.forEach((starId, i) => {
      if (st.stars[starId] || row.research < researchNeeded(r, i)) return;
      st.stars[starId] = { rank: 1, xp: 0 };
      note(s, ctx, `${r.deep ? 'Found' : 'Unlocked'} ${starDef(starId)!.name} in ${r.name}`, 'good');
    });
    return;
  }
  if (!a.id.startsWith('watch_')) return;
  const starId = a.id.slice('watch_'.length);
  const row = st.stars[starId];
  if (!row) return;
  const need = rankXp(row.rank + 1);
  if (row.rank < MAX_GILDED_RANK && row.xp < need) row.xp = Math.min(need, row.xp + WATCH_STAR_XP * times);
  tryRankUp(s, ctx, starId);
  if (chance(ctx.rng, FALLEN_CHANCE)) rollFallen(s, ctx);
}

/** A fallen star: a one-of-a-kind star with a slightly rolled effect. */
export function rollFallen(s: GameState, ctx: Ctx): void {
  const kind = pick(ctx.rng, FALLEN_TABLE);
  const roll = FALLEN_ROLL[0] + ctx.rng.next() * (FALLEN_ROLL[1] - FALLEN_ROLL[0]);
  const value = Math.round(kind.value * roll * 100) / 100;
  const st = astro(s);
  st.fallen.push({ uid: `fallen_${st.fallen.length + 1}`, effect: kind.id, value });
  note(s, ctx, `A star fell: ${kind.name}, ${kind.desc(value)}`, 'good');
}

// ---------- the constellation ----------

export interface Cell {
  slot: number;
  /** a Binary Pair fills two slots: 'partner' is the second */
  kind: 'star' | 'fallen' | 'partner';
  id: string;
  star?: StarDef;
  fallen?: AstrologyState['fallen'][number];
  rank: number;
}

export function chartSize(s: GameState): number {
  return chartSlotCount(astrologyLevel(s));
}

/** The chart's slots, padded to however many the level gives. */
export function chartSlots(s: GameState): (string | null)[] {
  const slots = astro(s).chart.slots;
  const n = chartSize(s);
  return Array.from({ length: Math.max(n, slots.length) }, (_, i) => slots[i] ?? null).slice(0, n);
}

function cellOf(s: GameState, slot: number, id: string | null): Cell | null {
  if (!id) return null;
  const a = astro(s);
  if (id === BINARY_PARTNER) return a.stars.binary ? { slot, kind: 'partner', id: 'binary', star: starDef('binary'), rank: a.stars.binary.rank } : null;
  const fallen = a.fallen.find((f) => f.uid === id);
  if (fallen) return { slot, kind: 'fallen', id, fallen, rank: 1 };
  const row = a.stars[id];
  const star = starDef(id);
  return row && star ? { slot, kind: 'star', id, star, rank: row.rank } : null;
}

const wonderStrength = (rank: number) => 1 + WONDER_RANK_STEP * (rank - 1);

export interface ChartEntry {
  slot: number;
  id: string;
  name: string;
  family: StarFamily | 'fallen' | 'wonder';
  /** extra effect from lines and a Nova, less a Black Star's penalty: 1 is unchanged */
  multiplier: number;
  /** a conditional star whose condition isn't met does nothing */
  working: boolean;
  /** the effect lines this star adds, after the multiplier */
  effects: { key: string; value: number }[];
}

export interface ChartReport {
  /** Bonus per matching connection, before other star effects. */
  lineBonus: number;
  size: number;
  entries: (ChartEntry | null)[];
  lines: { a: number; b: number; active: boolean; matching: boolean }[];
  totals: Record<string, number>;
}

const familyOf = (c: Cell): StarFamily | 'fallen' | 'wonder' => (c.kind === 'fallen' ? 'fallen' : c.star?.family ?? 'wonder');

/** Do two linked stars strengthen each other? A fallen star matches any family, a Binary Pair matches whatever it touches. */
function matches(a: Cell, b: Cell): boolean {
  if (a.id === 'binary' && b.id === 'binary') return false;
  if (a.kind === 'fallen' || b.kind === 'fallen') return true;
  const realA = !a.star?.wonder;
  const realB = !b.star?.wonder;
  if (a.id === 'binary') return realB;
  if (b.id === 'binary') return realA;
  return realA && realB && familyOf(a) === familyOf(b);
}

function fallenEffects(f: AstrologyState['fallen'][number]): { key: string; value: number }[] {
  switch (f.effect) {
    case 'gathering': return [{ key: 'yieldAll', value: f.value }];
    case 'production': return [{ key: 'speedAll', value: f.value }];
    case 'warrior': return [{ key: 'damage', value: f.value }, { key: 'life', value: f.value }];
    case 'fortune': return [{ key: 'rarity', value: f.value }, { key: 'gold', value: f.value }];
    case 'scholar': return [{ key: 'xp', value: f.value }];
    default: return [];
  }
}

/** The whole constellation worked out: each star's multiplier, which lines are active, and the total buff. */
export function chartReport(s: GameState, slotsOverride?: (string | null)[]): ChartReport {
  const slots = slotsOverride ?? chartSlots(s);
  const size = slots.length;
  const layout = chartLayout(size);
  const cells = slots.map((id, i) => cellOf(s, i, id));
  const black = cells.find((c) => c?.star?.wonder === 'black') ?? null;
  const lineBonus = black ? BLACK_LINE_BONUS * wonderStrength(black.rank) : LINE_BONUS;

  const lines = layout.lines.map(([a, b]) => {
    const ca = cells[a];
    const cb = cells[b];
    const active = !!ca && !!cb && !(ca.id === 'binary' && cb.id === 'binary');
    return { a, b, active, matching: active && matches(ca!, cb!) };
  });

  // a Binary Pair is one entity over two cells: its lines all count for the first
  const entityOf = (slot: number) => {
    const c = cells[slot];
    if (c?.kind === 'partner') return cells.findIndex((x) => x?.kind === 'star' && x.id === 'binary');
    return slot;
  };
  const touching = (slot: number) => lines.filter((l) => l.active && (entityOf(l.a) === slot || entityOf(l.b) === slot) && entityOf(l.a) !== entityOf(l.b));
  const neighbours = (slot: number): Cell[] =>
    touching(slot).map((l) => (entityOf(l.a) === slot ? cells[l.b]! : cells[l.a]!));

  const entries: (ChartEntry | null)[] = cells.map(() => null);
  const totals: Record<string, number> = {};
  cells.forEach((c, i) => {
    if (!c || c.kind === 'partner') return;
    const mine = touching(i);
    const lineCount = mine.filter((l) => l.matching).length;
    const nova = neighbours(i).filter((n) => n.star?.wonder === 'nova').reduce((acc, n) => acc + NOVA_BONUS * wonderStrength(n.rank), 0);
    const isBlack = c.star?.wonder === 'black';
    const multiplier = (1 + lineCount * lineBonus + nova) * (black && !isBlack ? 1 - BLACK_PENALTY : 1);

    let working = true;
    const need = c.star?.needs;
    if (need) {
      const near = neighbours(i);
      if (need.skills) working = near.some((n) => n.star?.effect && need.skills!.some((sk) => n.star!.effect === `yield:${sk}` || n.star!.effect === `speed:${sk}`));
      else if (need.family) working = near.filter((n) => n.kind === 'star' && n.star?.family === need.family).length >= need.count;
    }

    const base: { key: string; value: number }[] = [];
    if (c.kind === 'fallen') base.push(...fallenEffects(c.fallen!));
    else if (c.star?.wonder === 'binary') base.push({ key: 'xp', value: c.star.value * c.rank });
    else if (c.star?.effect) base.push({ key: c.star.effect, value: c.star.value * c.rank });
    const effects = working ? base.map((e) => ({ key: e.key, value: e.value * multiplier })) : [];
    for (const e of effects) totals[e.key] = (totals[e.key] ?? 0) + e.value;
    entries[i] = { slot: i, id: c.id, name: c.kind === 'fallen' ? fallenKind(c.fallen!.effect)?.name ?? 'Fallen star' : c.star!.name, family: familyOf(c), multiplier, working, effects };
  });
  return { size, entries, lines, totals, lineBonus };
}

const cache = new WeakMap<object, { key: string; totals: Record<string, number> }>();

/** Total buff of the charted constellation, by effect key. Cached until the chart, ranks, fallen stars or level change. */
export function chartTotals(s: GameState): Record<string, number> {
  const a = astro(s);
  const slots = chartSlots(s);
  const ranks = slots.map((id) => (id ? a.stars[id === BINARY_PARTNER ? 'binary' : id]?.rank ?? 0 : 0));
  const key = `${slots.join(',')}|${ranks.join(',')}|${a.fallen.map((f) => `${f.uid}:${f.effect}:${f.value}`).join(',')}`;
  const hit = cache.get(a);
  if (hit && hit.key === key) return hit.totals;
  const totals = chartReport(s).totals;
  cache.set(a, { key, totals });
  return totals;
}

const total = (s: GameState, ...keys: string[]) => keys.reduce((acc, k) => acc + (chartTotals(s)[k] ?? 0), 0);

const GATHERING_YIELD = new Set<SkillId>(['mining', 'woodcutting', 'harvesting', 'thieving', 'archaeology', 'astrology']);
const PRODUCTION_SPEED = new Set<SkillId>(['smelting', 'smithing', 'woodcrafting', 'tailoring', 'sawmilling', 'alchemy', 'gemcutting', 'cartography']);

/** Extra yield for a gathering skill, in percent. */
export function astrologyYield(s: GameState, skill: SkillId): number {
  return GATHERING_YIELD.has(skill) ? total(s, `yield:${skill}`, 'yieldAll') : 0;
}

/** Extra speed for a production skill, in percent. */
export function astrologySpeed(s: GameState, skill: SkillId): number {
  return PRODUCTION_SPEED.has(skill) ? total(s, `speed:${skill}`, 'speedAll') : 0;
}

/** Extra skill XP, in percent. */
export const astrologyXp = (s: GameState): number => total(s, 'xp');
/** Extra offline skilling speed, in percent. */
export const astrologyOffline = (s: GameState): number => total(s, 'offline');
/** Extra currency drops, in percent. */
export const astrologyCurrency = (s: GameState): number => total(s, 'currency');
/** Extra map drops, in percent. */
export const astrologyMapDrops = (s: GameState): number => total(s, 'maps');
/** Extra collectible chance, in percent. Read by the collectible system when it lands. */
export const astrologyCollectible = (s: GameState): number => total(s, 'collectible');
/** Extra Smelting purity odds and Foraging mutation chance, in percent. Read by those skills when they are rebuilt. */
export const astrologyPurity = (s: GameState): number => total(s, 'purity');
export const astrologyMutation = (s: GameState): number => total(s, 'mutation');

/** Combat and loot stats from the charted constellation. */
export function astrologyStats(s: GameState): Partial<Record<StatKey, number>> {
  const t = chartTotals(s);
  const out: Partial<Record<StatKey, number>> = {};
  const add = (k: StatKey, v: number | undefined) => { if (v) out[k] = (out[k] ?? 0) + v; };
  add('lifePct', t.life);
  add('allRes', (t.allRes ?? 0) + (t.wardRes ?? 0));
  add('physPct', t.damage);
  add('elemPct', t.damage);
  add('chaosPct', t.damage);
  add('attackSpeedPct', t.attackCast);
  add('castSpeedPct', t.attackCast);
  add('armourPct', t.defences);
  add('evasionPct', t.defences);
  add('moveSpeedPct', t.moveSpeed);
  add('goldFind', t.gold);
  add('itemRarity', t.rarity);
  return out;
}

// ---------- charting ----------

/** Slots next to `slot` on the chart's layout. */
export function adjacentSlots(size: number, slot: number): number[] {
  return chartLayout(size).lines.flatMap(([a, b]) => (a === slot ? [b] : b === slot ? [a] : []));
}

/** Stardust to recharge `from` into `to`: filling an empty slot is free. */
export function rechartCost(from: (string | null)[], to: (string | null)[]): number {
  return from.reduce((n, old, i) => n + (old !== null && old !== (to[i] ?? null) ? RECHART_COST : 0), 0);
}

/** Take a star or fallen star off the chart wherever it sits, and clear both halves of a Binary Pair. */
function without(slots: (string | null)[], ids: string[]): (string | null)[] {
  const out = [...slots];
  for (let i = 0; i < out.length; i++) {
    const v = out[i];
    if (v === null) continue;
    if (ids.includes(v) || (v === BINARY_PARTNER && ids.includes('binary'))) out[i] = null;
  }
  return out;
}

/** The chart after putting `id` in `slot` (and a Binary Pair's second half in `partner`), or why it can't be done. */
export function planPlace(s: GameState, slot: number, id: string, partner?: number): { slots: (string | null)[]; cost: number } | string {
  const slots = chartSlots(s);
  if (slot < 0 || slot >= slots.length) return 'That slot isn\'t open yet';
  const a = astro(s);
  if (!a.fallen.some((f) => f.uid === id) && !a.stars[id]) return 'You haven\'t unlocked that star';
  const targets = [slot];
  if (id === 'binary') {
    if (partner === undefined || partner === slot || partner < 0 || partner >= slots.length) return 'A Binary Pair needs a second, adjacent slot';
    if (!adjacentSlots(slots.length, slot).includes(partner)) return 'The second half must sit next to the first';
    targets.push(partner);
  }
  // the star leaves wherever it was, and whatever it replaces goes (knocking out half a Binary Pair takes the other half)
  const leaving = [id, ...targets.map((t) => slots[t]).filter((x): x is string => !!x).map((x) => (x === BINARY_PARTNER ? 'binary' : x))];
  const next = without(slots, leaving);
  next[slot] = id;
  if (id === 'binary') next[partner!] = BINARY_PARTNER;
  return { slots: next, cost: rechartCost(slots, next) };
}

export function placeStar(s: GameState, ctx: Ctx, slot: number, id: string, partner?: number): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const plan = planPlace(s, slot, id, partner);
  if (typeof plan === 'string') return plan;
  const cost: Record<string, number> = plan.cost ? { [STARDUST]: plan.cost } : {};
  if (plan.cost && !canAfford(s, cost)) return `Needs ${plan.cost} Stardust to recharge`;
  if (plan.cost) payCost(s, cost);
  astro(s).chart.slots = plan.slots;
  astro(s).chartNotice = false;
  ctx.emit({ t: 'info', text: plan.cost ? `Recharted the constellation for ${plan.cost} Stardust` : 'Charted a star' });
  return null;
}

export function planClear(s: GameState, slot: number): { slots: (string | null)[]; cost: number } | string {
  const slots = chartSlots(s);
  if (slot < 0 || slot >= slots.length || !slots[slot]) return 'Nothing there';
  const v = slots[slot]!;
  const next = without(slots, v === BINARY_PARTNER ? ['binary'] : [v]);
  return { slots: next, cost: rechartCost(slots, next) };
}

export function clearSlot(s: GameState, ctx: Ctx, slot: number): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const plan = planClear(s, slot);
  if (typeof plan === 'string') return plan;
  const cost = { [STARDUST]: plan.cost };
  if (!canAfford(s, cost)) return `Needs ${plan.cost} Stardust to recharge`;
  payCost(s, cost);
  astro(s).chart.slots = plan.slots;
  ctx.emit({ t: 'info', text: `Cleared a slot for ${plan.cost} Stardust` });
  return null;
}

/** Where a star sits on the chart now, or -1. */
export function slotOfStar(s: GameState, id: string): number {
  return chartSlots(s).indexOf(id);
}

// ---------- coming back ----------

export interface AstrologySnapshot {
  research: Record<string, number>;
  ranks: Record<string, number>;
  unlocked: string[];
  fallen: number;
}

export function astrologySnapshot(s: GameState): AstrologySnapshot {
  const a = astro(s);
  return {
    research: Object.fromEntries(Object.entries(a.regions).map(([id, r]) => [id, r.research])),
    ranks: Object.fromEntries(Object.entries(a.stars).map(([id, r]) => [id, r.rank])),
    unlocked: Object.keys(a.stars),
    fallen: a.fallen.length,
  };
}

export interface ObservationLine {
  text: string;
  bold?: boolean;
}

/** The observation log for time away: what research, ranks and fallen stars happened since `before`. `found` is the Stardust and Gilded Stardust made. */
export function observationLines(s: GameState, before: AstrologySnapshot, found: Record<string, number> = {}): ObservationLine[] {
  const a = astro(s);
  const lines: ObservationLine[] = [];
  for (const r of REGIONS) {
    const gained = (a.regions[r.id]?.research ?? 0) - (before.research[r.id] ?? 0);
    if (gained <= 0) continue;
    const fresh = r.stars.filter((id) => a.stars[id] && !before.unlocked.includes(id)).map((id) => starDef(id)!.name);
    lines.push({ text: `${r.name}: ${gained} research points${fresh.length ? `, unlocked ${fresh.join(', ')}` : ''}` });
  }
  for (const star of STARS) {
    const was = before.ranks[star.id] ?? 0;
    const now = a.stars[star.id]?.rank ?? 0;
    if (was > 0 && now > was) lines.push({ text: `${star.name} ranked up to ${now}` });
  }
  if (found[STARDUST]) lines.push({ text: `Stardust found: ${found[STARDUST]}` });
  if (found[GILDED_STARDUST]) lines.push({ text: `Gilded Stardust found: ${found[GILDED_STARDUST]}` });
  for (const f of a.fallen.slice(before.fallen)) {
    const k = fallenKind(f.effect);
    lines.push({ text: `A star fell: ${k?.name ?? 'a fallen star'}${k ? `, ${k.desc(f.value)}` : ''}`, bold: true });
  }
  return lines;
}
