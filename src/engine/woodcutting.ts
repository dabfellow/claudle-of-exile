import {
  BASE_HP, CROWN_LOG_CHANCE, CROWN_RESIN_CHANCE, FALL_XP_MULT, GIANT_PARTS, HEART_FRAGMENT_CHANCE, LEGEND_CHANCE, LEGEND_FALL_XP_MULT,
  LEGEND_HEART_MAX, LEGEND_HEART_MIN, LEGEND_MIN_LEVEL, LEGENDS, LODGE, lodgeDef, MAX_QUIRKS, QUIRK_CHANCE, QUIRKS, SIZE_MULT, SIZE_WEIGHTS,
  TRUNK_BONUS_LOG_CHANCE, TROPHY_WALL_PLANKS, WOODS, WORLD_TREE_GROWTH_MS, WORLD_TREE_HEARTWOOD, WORLD_TREE_SEED_CHANCE, legendDef, woodDef,
  type LodgeTier,
} from '../data/woodcutting';
import type { SkillAction } from '../data/skills';
import { canAfford, addBank, hasItem, payCost } from './bank';
import type { Ctx } from './context';
import { minigameSwing, type SwingResult } from './minigame';
import { rollCollectible } from './collectibles';
import { chance, pick, pickWeighted, rInt, type Rng } from './rng';
import { stochasticRound } from './skillingMastery';
import type { FellingCard, Giant, GiantPart, GiantPref, GiantSize, GiantState, GameState, LodgeId } from './types';
import { levelOf } from './xp';

/** How many felling cards are kept for the return screen. */
export const MAX_CARDS = 30;

export const woodcuttingLevel = (s: GameState): number => levelOf('woodcutting', s.skills.woodcutting);

export function newGiantState(): GiantState {
  return {
    current: null,
    options: [],
    order: { pref: 'resin', partOrder: 'full', region: 'auto', alwaysLegend: true, auto: true },
    lodge: { scoutTower: 0, dryingShed: 0, sawmill: 0, trophyWall: 0 },
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

/** The region scouts are sent to: the chosen one if it is open, otherwise the highest unlocked. */
export function scoutRegion(s: GameState): string {
  const lvl = woodcuttingLevel(s);
  const chosen = WOODS.find((w) => w.id === s.giant.order.region);
  return chosen && chosen.level <= lvl ? chosen.id : highestRegion(lvl);
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

export function rollQuirks(rng: Rng): string[] {
  const out: string[] = [];
  for (let i = 0; i < MAX_QUIRKS; i++) {
    if (!chance(rng, QUIRK_CHANCE)) continue;
    const q = pick(rng, QUIRKS.filter((x) => !out.includes(x.id)));
    out.push(q.id);
  }
  return out;
}

export const legendChanceMult = (s: GameState): number => (s.giant.lodge.scoutTower >= 2 ? 1.5 : 1);

/** One scouted giant from a region. From level 80, deep regions can turn up a named legend. */
export function rollOption(s: GameState, rng: Rng, region: string): Giant {
  const legends = LEGENDS.filter((l) => l.region === region);
  if (woodcuttingLevel(s) >= LEGEND_MIN_LEVEL && legends.length && chance(rng, LEGEND_CHANCE * legendChanceMult(s))) {
    return makeGiant(s, region, 'legend', [], { legendId: pick(rng, legends).id });
  }
  const size = pickWeighted(rng, SIZE_WEIGHTS, (x) => x.weight)!.size;
  return makeGiant(s, region, size, rollQuirks(rng));
}

export const scoutCount = (s: GameState): number => 2 + (s.giant.lodge.scoutTower >= 1 ? 1 : 0);

export function scoutOptions(s: GameState, ctx: Ctx): Giant[] {
  const region = scoutRegion(s);
  const options = Array.from({ length: scoutCount(s) }, () => rollOption(s, ctx.rng, region));
  if (worldTreeReady(s, ctx.now)) options.push(makeWorldTree(s));
  return options;
}

/** A new character, or a migrated one, starts on a fresh Medium giant in their highest region. */
export function initGiant(s: GameState, rng: Rng): void {
  s.giant.current = makeGiant(s, highestRegion(woodcuttingLevel(s)), 'medium', rollQuirks(rng));
  s.giant.options = [];
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

// ---- the standing order

export function partOrderList(s: GameState): GiantPart[] {
  return s.giant.order.partOrder === 'rush' ? ['trunk', 'heart'] : ['crown', 'limbs', 'trunk', 'heart'];
}

export function partWorkable(g: Giant, p: GiantPart): boolean {
  return g.parts[p].hp > 0 && (p !== 'heart' || g.fallen);
}

/** The part to work next: the one asked for if it can be, otherwise the first workable in the part order. */
export function nextPart(s: GameState, g: Giant, prefer?: GiantPart): GiantPart | null {
  if (prefer && partWorkable(g, prefer)) return prefer;
  return partOrderList(s).find((p) => partWorkable(g, p)) ?? null;
}

const SIZE_RANK: Record<GiantSize, number> = { small: 0, medium: 1, large: 2, legend: 3, worldtree: 4 };

function orderScore(g: Giant, pref: GiantPref): number {
  switch (pref) {
    case 'resin': return (hasQuirk(g, 'resin') ? 100 : 0) + (hasQuirk(g, 'lightning') ? -50 : 0) + SIZE_RANK[g.size] * 10;
    case 'heart': return (hasQuirk(g, 'burled') ? 100 : 0) + SIZE_RANK[g.size] * 10;
    case 'fast': return -totalMaxHp(g);
    default: return totalMaxHp(g);
  }
}

/** The index of the giant the standing order would take, or -1 with nothing on offer. */
export function chooseByOrder(options: Giant[], order: GiantState['order']): number {
  if (!options.length) return -1;
  if (order.alwaysLegend) {
    const legend = options.findIndex(isLegend);
    if (legend >= 0) return legend;
  }
  let best = 0;
  options.forEach((g, i) => { if (orderScore(g, order.pref) > orderScore(options[best], order.pref)) best = i; });
  return best;
}

export function setGiantOrder(s: GameState, patch: Partial<GiantState['order']>): void {
  s.giant.order = { ...s.giant.order, ...patch };
}

/** Make a scouted giant the current one. The running action follows it into its region. */
export function pickGiant(s: GameState, index: number): string | null {
  const st = s.giant;
  const g = st.options[index];
  if (!g) return 'That giant is gone';
  if (st.current) return 'Finish the giant you are on first';
  if (woodcuttingLevel(s) < woodDef(g.region).level) return `Requires Woodcutting level ${woodDef(g.region).level}`;
  st.current = g;
  st.options = [];
  const a = s.action;
  if (a?.kind === 'skill' && isGiantActionId(a.actionId)) {
    a.actionId = `giant_${g.region}`;
    a.part = nextPart(s, g) ?? undefined;
  }
  return null;
}

/** Take the giant the standing order would pick; used on demand and whenever one falls while idle. */
export function autoPick(s: GameState): string | null {
  const i = chooseByOrder(s.giant.options, s.giant.order);
  return i < 0 ? 'No giants on offer' : pickGiant(s, i);
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
      if (chance(ctx.rng, Math.min(1, CROWN_RESIN_CHANCE * (hasQuirk(g, 'resin') ? 3 : 1) * (1 + resinBoost / 100)))) give(`${g.region}_resin`, 1);
      if (chance(ctx.rng, CROWN_LOG_CHANCE)) give(log, 1);
      break;
    case 'limbs':
      give(log, hasQuirk(g, 'twisted') ? 1.5 : 1);
      break;
    case 'trunk':
      give(log, (1 + (chance(ctx.rng, TRUNK_BONUS_LOG_CHANCE) ? 1 : 0)) * (hasQuirk(g, 'lightning') ? 1.25 : 1));
      break;
    case 'heart':
      give(log, 1);
      if (chance(ctx.rng, Math.min(1, HEART_FRAGMENT_CHANCE * (hasQuirk(g, 'burled') ? 2 : 1)))) give('heartwood_fragment', 1);
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

/** A giant is done: record it, make a card if you were away, scout the next and let the standing order take one. */
function completeGiant(s: GameState, ctx: Ctx, g: Giant, drops: Record<string, number>, movedOn: boolean): void {
  const st = s.giant;
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
  st.current = null;
  st.options = scoutOptions(s, ctx);
  if (ctx.offline || st.order.auto) {
    autoPick(s);
  } else {
    s.action = null;
    ctx.emit({ t: 'info', text: 'The giant is down. Pick the next one in the Scouting tab.', tone: 'good' });
  }
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

/** Offer a grown World Tree among the scouted giants. */
export function offerWorldTree(s: GameState, ctx: Ctx): string | null {
  if (!worldTreeReady(s, ctx.now)) return 'It is still growing';
  if (s.giant.options.some((g) => g.worldTree) || s.giant.current?.worldTree) return 'It is already on offer';
  s.giant.options.push(makeWorldTree(s));
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
  // ash, oak and yew planks stay open: early hideout upgrades need them. Ironwood and deeper, and heartwood, need the Sawmill
  const needsMill = a.id === 'mill_heartwood' || woodDef(w.wood).level >= 45;
  return needsMill && s.giant.lodge.sawmill < 1 ? 'Build the Sawmill in your lodge' : null;
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
