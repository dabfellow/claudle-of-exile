import {
  BASE_HP, CROWN_LOG_CHANCE, CROWN_RESIN_CHANCE, FALL_XP_MULT, FAMILIARITY_CAP, FAMILIARITY_STEP, GIANT_PARTS, HEART_FRAGMENT_CHANCE, LEGEND_CHANCE, LEGEND_FALL_XP_MULT,
  LEGEND_HEART_MAX, LEGEND_HEART_MIN, LEGEND_MIN_LEVEL, LEGENDS, LODGE, lodgeDef, MAX_QUIRKS, QUIRK_CHANCE, QUIRKS, SIZE_MULT, SIZE_WEIGHTS,
  TRUNK_BONUS_LOG_CHANCE, TROPHY_WALL_PLANKS, WOODS, WORLD_TREE_GROWTH_MS, WORLD_TREE_HEARTWOOD, WORLD_TREE_SEED_CHANCE, legendDef, woodDef,
  HEART_CHISEL_MULT, LOG_RACK_CHANCE, SAP_BUCKET_RESIN, WHETSTONE_SPEED, type LodgeTier,
} from '../data/woodcutting';
import type { SkillAction } from '../data/skills';
import { canAfford, addBank, hasItem, payCost } from './bank';
import type { Ctx } from './context';
import { minigameSwing, type SwingResult } from './minigame';
import { rollCollectible } from './collectibles';
import { chance, pick, pickWeighted, rInt, type Rng } from './rng';
import { masteryLevel, stochasticRound } from './skillingMastery';
import type { FellingCard, Giant, GiantPart, GiantSize, GiantState, GameState, LodgeId } from './types';
import { levelOf } from './xp';

/** How many felling cards are kept for the return screen. */
export const MAX_CARDS = 30;

export const woodcuttingLevel = (s: GameState): number => levelOf('woodcutting', s.skills.woodcutting);

export function newGiantState(): GiantState {
  return {
    current: null,
    waiting: {},
    felled: {},
    order: { region: 'auto' },
    lodge: { scoutTower: 0, dryingShed: 0, whetstone: 0, sapBuckets: 0, logRack: 0, heartChisel: 0, sawmill: 0, trophyWall: 0 },
    legends: [],
    legendLog: {},
    pendingCards: [],
    seq: 1,
  };
}

export function isGiantAction(a: SkillAction): boolean {
  return a.woodcutting?.mode === 'giant';
}

// ---- regions

export function highestRegion(level: number): string {
  return [...WOODS].reverse().find((w) => w.level <= level)?.id ?? WOODS[0].id;
}

export function unlockedRegions(level: number) {
  return WOODS.filter((w) => w.level <= level);
}

/** The region you are cutting in: the chosen one if it is open, otherwise the highest unlocked. */
export function targetRegion(s: GameState): string {
  const lvl = woodcuttingLevel(s);
  const chosen = WOODS.find((w) => w.id === s.giant.order.region);
  return chosen && chosen.level <= lvl ? chosen.id : highestRegion(lvl);
}

/** Giants felled in a region so far. */
export const felledIn = (s: GameState, region: string): number => s.giant.felled?.[region] ?? 0;

/** How much more common a region's special giants are from familiarity: 1 (new) up to 2. */
export function familiarityMult(s: GameState, region: string): number {
  return 1 + Math.min(FAMILIARITY_CAP, felledIn(s, region)) * FAMILIARITY_STEP;
}

/** The mastery track for cutting in a woods. */
export const woodsMasteryId = (region: string): string => `task.giant_${region}`;

/** Mastery 100 in a woods: its special giants are 25% more common. */
export const WOODS_MASTERY_SPECIAL = 1.25;
/** Mastery 50 in a woods: crown resin chance +25% there. */
export const WOODS_MASTERY_RESIN = 25;

/** Everything that makes special (quirked) giants more common in a region. */
export function quirkChanceMult(s: GameState, region: string): number {
  return familiarityMult(s, region)
    * (s.giant.lodge.scoutTower >= 1 ? 1.5 : 1)
    * (masteryLevel(s, woodsMasteryId(region)) >= 100 ? WOODS_MASTERY_SPECIAL : 1);
}

// ---- small lodge bonuses

export const lodgeTier = (s: GameState, id: LodgeId): number => s.giant.lodge[id] ?? 0;
/** Whetstone: % faster cuts on any giant. */
export const whetstoneSpeed = (s: GameState): number => lodgeTier(s, 'whetstone') * WHETSTONE_SPEED;
/** Crown resin chance bonus, in %: Sap Buckets, plus mastery 50 in that woods. */
export function resinBonusPct(s: GameState, region: string): number {
  return lodgeTier(s, 'sapBuckets') * SAP_BUCKET_RESIN + (masteryLevel(s, woodsMasteryId(region)) >= 50 ? WOODS_MASTERY_RESIN : 0);
}
/** Log Rack: chance a trunk cut gives one extra log. */
export const logRackChance = (s: GameState): number => lodgeTier(s, 'logRack') * LOG_RACK_CHANCE;
/** Heart Chisel: multiplier on the heartwood fragment chance. */
export const heartChiselMult = (s: GameState): number => 1 + lodgeTier(s, 'heartChisel') * HEART_CHISEL_MULT;

/** The chance per roll that a giant gets a quirk in this region, after familiarity and the Lookout Tower. */
export function quirkChance(s: GameState, region: string): number {
  return Math.min(0.9, QUIRK_CHANCE * quirkChanceMult(s, region));
}

/** The chance the next giant in a region is a legend; 0 where legends never stand or below the level. */
export function legendChance(s: GameState, region: string): number {
  if (woodcuttingLevel(s) < LEGEND_MIN_LEVEL || !LEGENDS.some((l) => l.region === region)) return 0;
  return LEGEND_CHANCE * legendChanceMult(s) * familiarityMult(s, region);
}

// ---- giants

const hasQuirk = (g: Pick<Giant, 'quirks'>, id: string): boolean => g.quirks.includes(id);

export interface MakeGiantOpts { legendId?: string; worldTree?: boolean }

/** A giant of a size and quirks, with its parts' HP worked out. */
export function makeGiant(s: GameState, region: string, size: GiantSize, quirks: string[], opts: MakeGiantOpts = {}): Giant {
  const mult = SIZE_MULT[size];
  const parts = {} as Giant['parts'];
  for (const p of GIANT_PARTS) {
    let hp = BASE_HP[p] * mult;
    if (hasQuirk({ quirks }, 'hollow')) hp *= p === 'trunk' ? 0.7 : p === 'heart' ? 0.5 : 1;
    if (hasQuirk({ quirks }, 'burled') && p === 'heart') hp *= 2;
    if (hasQuirk({ quirks }, 'towering')) hp *= 1.5;
    hp = p === 'crown' && hasQuirk({ quirks }, 'lightning') ? 0 : Math.max(1, Math.round(hp));
    parts[p] = { hp, max: hp };
  }
  return {
    id: `g${s.giant.seq++}`, region, size, quirks: [...quirks], ...opts, parts, fallen: false,
    yields: { crown: {}, limbs: {}, trunk: {}, heart: {} }, splinters: 0,
  };
}

export function rollQuirks(rng: Rng, quirkOdds = QUIRK_CHANCE): string[] {
  const out: string[] = [];
  for (let i = 0; i < MAX_QUIRKS; i++) {
    if (!chance(rng, quirkOdds)) continue;
    const q = pick(rng, QUIRKS.filter((x) => !out.includes(x.id)));
    out.push(q.id);
  }
  return out;
}

export const legendChanceMult = (s: GameState): number => (s.giant.lodge.scoutTower >= 2 ? 1.5 : 1);

/** The next giant in a region. From level 80, deep regions can turn up a named legend. */
export function rollGiant(s: GameState, rng: Rng, region: string): Giant {
  const legends = LEGENDS.filter((l) => l.region === region);
  if (chance(rng, legendChance(s, region))) {
    return makeGiant(s, region, 'legend', [], { legendId: pick(rng, legends).id });
  }
  const size = pickWeighted(rng, SIZE_WEIGHTS, (x) => x.weight)!.size;
  return makeGiant(s, region, size, rollQuirks(rng, quirkChance(s, region)));
}

/** A new character, or a migrated one, starts on a fresh Medium giant in their highest region. */
export function initGiant(s: GameState, rng: Rng): void {
  s.giant.current = makeGiant(s, highestRegion(woodcuttingLevel(s)), 'medium', rollQuirks(rng));
}

/** Older saves of this build: fill the fields added since, and make sure a giant is standing. */
export function settleGiant(s: GameState, rng: Rng): void {
  const st = s.giant;
  if (!st) return;
  st.waiting ??= {};
  st.felled ??= {};
  st.lodge = { ...newGiantState().lodge, ...st.lodge };
  st.order = { region: typeof st.order?.region === 'string' ? st.order.region : 'auto' };
  delete (st as unknown as { options?: unknown }).options;
  if (!st.current) st.current = takeGiant(s, rng, targetRegion(s));
}

/** The giant to work in a region: the one you left part-cut there, or a fresh one. */
function takeGiant(s: GameState, rng: Rng, region: string): Giant {
  const waiting = s.giant.waiting[region];
  if (waiting) {
    delete s.giant.waiting[region];
    return waiting;
  }
  return rollGiant(s, rng, region);
}

/** Point the running felling action at the current giant. */
function followGiant(s: GameState): void {
  const g = s.giant.current;
  const a = s.action;
  if (!g || a?.kind !== 'skill' || !isGiantActionId(a.actionId)) return;
  a.actionId = `giant_${g.region}`;
  a.part = nextPart(s, g) ?? undefined;
}

/** Leave the current giant standing (to come back to) and set another in its place. */
function swapGiant(s: GameState, next: Giant): void {
  const cur = s.giant.current;
  if (cur && cur.id !== next.id && !cur.worldTree) s.giant.waiting[cur.region] = cur;
  s.giant.current = next;
  followGiant(s);
}

/**
 * Cut in another region. The giant you were on waits there, part-cut, until you come back; the region's own waiting
 * giant (or a fresh one) takes its place, and a running felling action follows.
 */
export function chooseRegion(s: GameState, ctx: Ctx, region: string): string | null {
  const w = WOODS.find((x) => x.id === region);
  if (!w) return 'No such woods';
  if (woodcuttingLevel(s) < w.level) return `Requires Woodcutting level ${w.level}`;
  s.giant.order.region = region;
  const cur = s.giant.current;
  if (cur?.region === region && !cur.worldTree) return null;
  if (cur?.worldTree) return null; // finish your World Tree first; the next giant comes from the new region
  swapGiant(s, takeGiant(s, ctx.rng, region));
  return null;
}

export function giantName(g: Pick<Giant, 'region' | 'quirks' | 'legendId' | 'worldTree'>): string {
  if (g.worldTree) return 'Your World Tree';
  if (g.legendId) return legendDef(g.legendId)?.name ?? 'A legend';
  const adj = g.quirks.map((q) => QUIRKS.find((x) => x.id === q)?.adjective).filter(Boolean).join(' ');
  return `${adj ? `${adj} ` : ''}${woodDef(g.region).name}`;
}

export const isLegend = (g: Pick<Giant, 'legendId' | 'worldTree'>): boolean => !!g.legendId || !!g.worldTree;

export function totalHp(g: Giant): number {
  return GIANT_PARTS.reduce((a, p) => a + g.parts[p].hp, 0);
}
export function totalMaxHp(g: Giant): number {
  return GIANT_PARTS.reduce((a, p) => a + g.parts[p].max, 0);
}

/** Roughly how long the giant takes from now with nothing but plain cuts, in ms. */
export function fellingTime(g: Giant): number {
  return totalHp(g) * woodDef(g.region).ms;
}

// ---- which part next

/**
 * When a part runs out, work moves on crown, limbs, trunk, heart. To rush the heart, tap the Trunk: it is worked until
 * it falls, and anything left on the crown and limbs becomes splinters.
 */
export function partOrderList(_s: GameState): GiantPart[] {
  return ['crown', 'limbs', 'trunk', 'heart'];
}

export function partWorkable(g: Giant, p: GiantPart): boolean {
  return g.parts[p].hp > 0 && (p !== 'heart' || g.fallen);
}

/** The part to work next: the one asked for if it can be, otherwise the first workable in the part order. */
export function nextPart(s: GameState, g: Giant, prefer?: GiantPart): GiantPart | null {
  if (prefer && partWorkable(g, prefer)) return prefer;
  return partOrderList(s).find((p) => partWorkable(g, p)) ?? null;
}

export function isGiantActionId(id: string): boolean {
  return id.startsWith('giant_');
}

/** Work a part of the current giant. */
export function setGiantPart(s: GameState, part: GiantPart): string | null {
  const g = s.giant.current;
  if (!g) return 'No giant to fell';
  if (part === 'heart' && !g.fallen) return 'The heart is only reachable after the fall';
  if (g.parts[part].hp <= 0) return `The ${part} is done`;
  const a = s.action;
  if (a?.kind === 'skill' && isGiantActionId(a.actionId)) a.part = part;
  return null;
}

/** After the fall, leave whatever heart is left and take the next giant. */
export function moveOn(s: GameState, ctx: Ctx): string | null {
  const g = s.giant.current;
  if (!g) return 'No giant to fell';
  if (!g.fallen) return 'Bring it down first';
  const drops: Record<string, number> = {};
  completeGiant(s, ctx, g, drops, true);
  for (const [id, n] of Object.entries(drops)) addBank(s, id, n);
  return null;
}

// ---- cutting

export interface GiantCutResult {
  /** what this cut made, gross, to be put in the bank */
  drops: Record<string, number>;
  /** multiplies the action's XP: 1 for a plain cut, more on a fall and on Towering */
  xpUnits: number;
  /** the giant came down on this cut, or was finished */
  fell: boolean;
  /** the log id of the giant's wood */
  log: string;
}

const noCut = (): GiantCutResult => ({ drops: {}, xpUnits: 1, fell: false, log: '' });

/**
 * One completed cut on the current giant. `focusDouble` is a split-the-log double: everything this cut makes comes twice.
 * Takes 1 HP off the worked part, rolls its yield, and drives the fall, the heart and the next giant.
 */
export function giantCut(s: GameState, ctx: Ctx, focusDouble = false, resinBoost = 0): GiantCutResult {
  const st = s.giant;
  const g = st.current;
  if (!g) return noCut();
  const act = s.action?.kind === 'skill' ? s.action : null;
  const part = nextPart(s, g, act?.part);
  const log = `${g.region}_log`;
  if (!part) {
    completeGiant(s, ctx, g, {}, false);
    return { ...noCut(), log };
  }
  if (act) act.part = part;
  const res: GiantCutResult = { drops: {}, xpUnits: 1, fell: false, log };
  const twice = focusDouble ? 2 : 1;
  const towering = hasQuirk(g, 'towering') ? 1.5 : 1;
  const give = (id: string, base: number) => {
    const qty = stochasticRound(ctx.rng, base * towering * twice);
    if (qty <= 0) return;
    res.drops[id] = (res.drops[id] ?? 0) + qty;
    g.yields[part][id] = (g.yields[part][id] ?? 0) + qty;
  };
  switch (part) {
    case 'crown':
      if (chance(ctx.rng, Math.min(1, CROWN_RESIN_CHANCE * (hasQuirk(g, 'resin') ? 3 : 1) * (1 + (resinBoost + resinBonusPct(s, g.region)) / 100)))) give(`${g.region}_resin`, 1);
      if (chance(ctx.rng, CROWN_LOG_CHANCE)) give(log, 1);
      break;
    case 'limbs':
      give(log, hasQuirk(g, 'twisted') ? 1.5 : 1);
      break;
    case 'trunk':
      give(log, (1 + (chance(ctx.rng, TRUNK_BONUS_LOG_CHANCE) ? 1 : 0)) * (hasQuirk(g, 'lightning') ? 1.25 : 1));
      if (logRackChance(s) > 0 && chance(ctx.rng, logRackChance(s))) give(log, 1);
      break;
    case 'heart':
      give(log, 1);
      if (chance(ctx.rng, Math.min(1, HEART_FRAGMENT_CHANCE * (hasQuirk(g, 'burled') ? 2 : 1) * heartChiselMult(s)))) give('heartwood_fragment', 1);
      break;
  }
  if (hasQuirk(g, 'towering')) res.xpUnits *= 1.5;
  g.parts[part].hp -= 1;
  rollCollectible(s, ctx, 'woodcutting', g.region);

  if (part === 'trunk' && g.parts.trunk.hp <= 0 && !g.fallen) {
    g.fallen = true;
    res.fell = true;
    let splinters = 0;
    for (const p of ['crown', 'limbs'] as const) {
      splinters += g.parts[p].hp;
      g.parts[p].hp = 0;
    }
    if (splinters > 0) {
      g.splinters += splinters;
      res.drops.splinters = (res.drops.splinters ?? 0) + splinters;
    }
    res.xpUnits += isLegend(g) ? LEGEND_FALL_XP_MULT : FALL_XP_MULT;
    ctx.emit({ t: 'info', text: `${giantName(g)} comes down${splinters > 0 ? `: ${splinters} splinters` : ''}`, tone: 'good' });
  }
  if (part === 'heart' && g.parts.heart.hp <= 0 && isLegend(g)) {
    const qty = g.worldTree ? WORLD_TREE_HEARTWOOD : rInt(ctx.rng, LEGEND_HEART_MIN, LEGEND_HEART_MAX);
    res.drops.legend_heartwood = (res.drops.legend_heartwood ?? 0) + qty;
    g.yields.heart.legend_heartwood = (g.yields.heart.legend_heartwood ?? 0) + qty;
    if (g.worldTree) {
      res.drops.world_tree_heart = 1;
      g.yields.heart.world_tree_heart = 1;
    }
  }
  if (act && g.parts[part].hp <= 0) act.part = nextPart(s, g) ?? undefined;
  if (!nextPart(s, g)) completeGiant(s, ctx, g, res.drops, false);
  return res;
}

/** A giant is done: record it, make a card if you were away, and set up the next giant in your chosen woods. */
function completeGiant(s: GameState, ctx: Ctx, g: Giant, drops: Record<string, number>, movedOn: boolean): void {
  const st = s.giant;
  if (!g.worldTree) st.felled[g.region] = (st.felled[g.region] ?? 0) + 1;
  if (g.legendId && !g.worldTree) {
    if (!st.legends.includes(g.legendId)) st.legends.push(g.legendId);
    const total: Record<string, number> = {};
    for (const p of GIANT_PARTS) for (const [id, n] of Object.entries(g.yields[p])) total[id] = (total[id] ?? 0) + n;
    if (g.splinters) total.splinters = g.splinters;
    st.legendLog[g.legendId] = { at: ctx.now, yields: total };
    ctx.emit({ t: 'info', text: `Legend felled: ${giantName(g)}!`, tone: 'good' });
  }
  if (isLegend(g) && chance(ctx.rng, WORLD_TREE_SEED_CHANCE)) {
    drops.world_tree_seed = (drops.world_tree_seed ?? 0) + 1;
    ctx.emit({ t: 'info', text: 'It dropped a World Tree Seed! Plant it at your lodge.', tone: 'good' });
  }
  if (g.worldTree) st.worldTree = undefined;
  const card: FellingCard = {
    id: g.id, region: g.region, size: g.size, quirks: g.quirks, legendId: g.legendId, worldTree: g.worldTree,
    yields: g.yields, splinters: g.splinters, movedOn: movedOn || undefined, at: ctx.now,
  };
  if (ctx.offline) st.pendingCards = [...st.pendingCards, card].slice(-MAX_CARDS);
  else if (!isLegend(g)) ctx.emit({ t: 'info', text: `${giantName(g)} is down`, tone: 'good' });
  st.current = takeGiant(s, ctx.rng, targetRegion(s));
  followGiant(s);
  if (!ctx.offline && isLegend(st.current)) ctx.emit({ t: 'info', text: `A legend stands in the ${woodDef(st.current.region).region}: ${giantName(st.current)}!`, tone: 'good' });
}

export function dismissCards(s: GameState): void {
  s.giant.pendingCards = [];
}

// ---- the lodge

export const lodgeTierOf = (s: GameState, id: LodgeId): number => s.giant.lodge[id] ?? 0;

/** The next tier to build for a building with its costs worked out, or null when it is fully built. */
export function nextLodgeTier(s: GameState, id: LodgeId): (LodgeTier & { tier: number }) | null {
  const def = lodgeDef(id);
  const tier = lodgeTierOf(s, id);
  const t = def.tiers[tier];
  if (!t) return null;
  if (id === 'trophyWall') {
    const first = s.giant.legends[0];
    const region = first ? legendDef(first)?.region : undefined;
    return { ...t, tier: tier + 1, cost: region ? { [`${region}_plank`]: TROPHY_WALL_PLANKS } : {} };
  }
  return { ...t, tier: tier + 1 };
}

export function lodgeBlocker(s: GameState, id: LodgeId): string | null {
  const next = nextLodgeTier(s, id);
  if (!next) return 'Fully built';
  if (id === 'trophyWall' && !s.giant.legends.length) return 'Fell a legend first';
  if (woodcuttingLevel(s) < next.level) return `Requires Woodcutting level ${next.level}`;
  if (!canAfford(s, next.cost)) return 'Missing materials';
  return null;
}

export function buildLodge(s: GameState, ctx: Ctx, id: LodgeId): string | null {
  const blocker = lodgeBlocker(s, id);
  if (blocker) return blocker;
  const next = nextLodgeTier(s, id)!;
  payCost(s, next.cost);
  s.giant.lodge[id] = next.tier;
  ctx.emit({ t: 'info', text: `${lodgeDef(id).name}${lodgeDef(id).tiers.length > 1 ? ` tier ${next.tier}` : ''} built`, tone: 'good' });
  return null;
}

export const LODGE_IDS: LodgeId[] = LODGE.map((l) => l.id);

// ---- the World Tree

export function worldTreeGrowth(s: GameState, now: number): number {
  const w = s.giant.worldTree;
  return w ? Math.min(1, Math.max(0, (now - w.plantedAt) / WORLD_TREE_GROWTH_MS)) : 0;
}

export function worldTreeReady(s: GameState, now: number): boolean {
  return !!s.giant.worldTree && worldTreeGrowth(s, now) >= 1;
}

export function plantBlocker(s: GameState): string | null {
  if (s.giant.worldTree) return 'A World Tree is already growing';
  if (s.giant.lodge.trophyWall < 1) return 'Build the Trophy Wall first';
  if (!hasItem(s, 'world_tree_seed', 1)) return 'You need a World Tree Seed';
  return null;
}

export function plantWorldTree(s: GameState, ctx: Ctx): string | null {
  const blocker = plantBlocker(s);
  if (blocker) return blocker;
  payCost(s, { world_tree_seed: 1 });
  s.giant.worldTree = { plantedAt: ctx.now };
  ctx.emit({ t: 'info', text: 'World Tree Seed planted. It needs 120 days.', tone: 'good' });
  return null;
}

export function makeWorldTree(s: GameState): Giant {
  return makeGiant(s, 'worldwood', 'worldtree', [], { worldTree: true });
}

/** Start on your grown World Tree. The giant you were on waits in its woods until you come back. */
export function fellWorldTree(s: GameState, ctx: Ctx): string | null {
  if (!worldTreeReady(s, ctx.now)) return 'It is still growing';
  if (s.giant.current?.worldTree) return 'You are already felling it';
  swapGiant(s, makeWorldTree(s));
  return null;
}

// ---- the Sawmill, access and the split

export function woodcuttingAccessHint(s: GameState, a: SkillAction): string | null {
  const w = a.woodcutting;
  if (!w) return null;
  if (w.mode === 'giant') {
    const g = s.giant.current;
    if (!g) return 'Pick a giant to fell';
    return g.region === w.wood ? null : 'That giant stands in another region';
  }
  return null; // sawmill recipes are Woodcrafting's now, gated only by Woodcrafting level
}

export function woodcuttingPreview(_s: { professionProgress: { counters: Record<string, number> } }, _a: SkillAction): string[] {
  return [];
}

/**
 * One split of the minigame. Feeds Focus like any other game, and the Drying Shed adds a log on a double
 * (tier 1) and on a hit, 25% of the time (tier 2). Never offline: it is only called from the screen.
 */
export function splitSwing(s: GameState, ctx: Ctx, result: SwingResult): void {
  minigameSwing(s, result);
  const g = s.giant.current;
  const tier = s.giant.lodge.dryingShed;
  if (!g || s.action?.kind !== 'skill' || !isGiantActionId(s.action.actionId) || tier < 1) return;
  if (result === 'double' || (result === 'hit' && tier >= 2 && chance(ctx.rng, 0.25))) addBank(s, `${g.region}_log`, 1);
}
