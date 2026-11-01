import { cultureDef, digChance, EXPEDITION_GATE, findDigs, hasWare, SITES, siteOf, STRATUM_YIELD, wareDef, WARES, type CultureId, type SiteDef, type WareDef } from '../data/expedition';
import type { SkillAction } from '../data/skills';
import { materialDef } from '../data/materials';
import { addBank, hasItem } from './bank';
import type { Ctx } from './context';
import { chance } from './rng';
import { skillTreeStats } from './skillTree';
import type { ExpeditionState, GameState } from './types';

export function newExpeditionState(): ExpeditionState {
  return { dug: {}, shelves: {}, orders: {}, tally: { finds: 0, traded: 0 } };
}

export function expeditionOpen(s: GameState): boolean {
  return s.unlockedZones.includes(EXPEDITION_GATE.zone);
}

// ---------- the digs ----------

/** Finds reached at this site, which is also the stratum you're on (0 is the top). */
export function siteStratum(s: GameState, site: SiteDef): number {
  const dug = s.expedition.dug[site.id] ?? 0;
  return findDigs(site).filter((n) => n <= dug).length;
}

/** One standing for every find on a people's sites. */
export function standing(s: GameState, culture: CultureId): number {
  return SITES.filter((x) => x.culture === culture).reduce((a, x) => a + siteStratum(s, x), 0);
}

/** How far through the current stratum a site is, 0–1, and the digs left in it (0 at the bottom). */
export function stratumProgress(s: GameState, site: SiteDef): { progress: number; digsLeft: number } {
  const steps = findDigs(site);
  const stratum = siteStratum(s, site);
  if (stratum >= steps.length) return { progress: 1, digsLeft: 0 };
  const dug = s.expedition.dug[site.id] ?? 0;
  const from = steps[stratum - 1] ?? 0;
  return { progress: (dug - from) / (steps[stratum] - from), digsLeft: steps[stratum] - dug };
}

/** Artifacts one dig is worth on average, here and now. */
export function artifactsPerDig(s: GameState, site: SiteDef): number {
  return digChance(site) * (1 + siteStratum(s, site) * STRATUM_YIELD) * (1 + (skillTreeStats(s).artifactChance ?? 0) / 100);
}

/** A dig finished: `complete` has rolled the top stratum's yield, so this adds what depth and the tree add, then goes down. */
export function digDone(s: GameState, ctx: Ctx, a: SkillAction, outputs: Record<string, number>): void {
  const site = siteOf(a.id);
  if (!site) return;
  const id = cultureDef(site.culture).artifact;
  const extra = artifactsPerDig(s, site) - digChance(site);
  const got = Math.floor(extra) + (chance(ctx.rng, extra - Math.floor(extra)) ? 1 : 0);
  if (got) {
    addBank(s, id, got);
    outputs[id] = (outputs[id] ?? 0) + got;
  }
  const before = siteStratum(s, site);
  s.expedition.dug[site.id] = (s.expedition.dug[site.id] ?? 0) + (skillTreeStats(s).deepSurvey ? 2 : 1);
  if (siteStratum(s, site) === before) return;
  s.expedition.tally.finds += 1;
  ctx.emit({ t: 'info', text: `${site.name}: you unearthed ${site.finds[before]}. ${cultureDef(site.culture).merchant} will want to see this`, tone: 'good' });
}

// ---------- the merchants ----------

/** Purchases gone from a shelf right now: it fills back up by the clock, even while you're away. */
function soldNow(s: GameState, w: WareDef): number {
  const shelf = s.expedition.shelves[w.id];
  return shelf ? Math.max(0, shelf.sold - (s.clock - shelf.at) / w.restockMs) : 0;
}

export function wareLeft(s: GameState, w: WareDef): number {
  return Math.floor(w.shelf - soldNow(s, w));
}

/** The dearer the shelf is picked over, up to twice the price for the last one. */
export function warePrice(s: GameState, w: WareDef): number {
  const haggle = 1 - (skillTreeStats(s).wareDiscount ?? 0) / 100;
  return Math.ceil(w.cost * (1 + soldNow(s, w) / w.shelf) * haggle);
}

export function wareReason(s: GameState, id: string): string | null {
  const w = wareDef(id);
  const culture = cultureDef(w.culture);
  if (!expeditionOpen(s)) return `Reach ${EXPEDITION_GATE.label} to trade`;
  if (standing(s, w.culture) < w.standing) return `Needs standing ${w.standing}`;
  if (wareLeft(s, w) < 1) return 'Sold out';
  if (!hasItem(s, culture.artifact, warePrice(s, w))) return `Not enough ${culture.artifactName}`;
  return null;
}

function take(s: GameState, ctx: Ctx, w: WareDef): void {
  s.account.bank[cultureDef(w.culture).artifact] -= warePrice(s, w);
  s.expedition.shelves[w.id] = { sold: soldNow(s, w) + 1, at: s.clock };
  s.expedition.tally.traded += 1;
  addBank(s, w.item, w.qty);
  ctx.emit({ t: 'loot', currencyId: w.item, qty: w.qty });
}

export function buyWare(s: GameState, ctx: Ctx, id: string): string | null {
  const reason = wareReason(s, id);
  if (reason) return reason;
  const w = wareDef(id);
  take(s, ctx, w);
  ctx.emit({ t: 'info', text: `Bought ${materialDef(w.item).name}${w.qty > 1 ? ` ×${w.qty}` : ''} from ${cultureDef(w.culture).merchant}`, tone: 'good' });
  return null;
}

/** A merchant keeps one standing order: that ware, bought whenever the Artifacts and the shelf allow. Same again clears it. */
export function setOrder(s: GameState, id: string): string | null {
  const w = wareDef(id);
  if (standing(s, w.culture) < w.standing) return `Needs standing ${w.standing}`;
  const { orders } = s.expedition;
  if (orders[w.culture] === id) delete orders[w.culture];
  else orders[w.culture] = id;
  return null;
}

/** Standing orders run all the time, whatever you're doing, so a night's Artifacts are already spent when you wake. */
export function fillOrders(s: GameState, ctx: Ctx): void {
  for (const id of Object.values(s.expedition.orders)) {
    while (!wareReason(s, id)) take(s, ctx, wareDef(id));
  }
}

/** The wares a people sells, ready for the panel: open ones, and the next one to work towards. */
export function shelvesFor(s: GameState, culture: CultureId): { open: WareDef[]; next?: WareDef } {
  const all = WARES.filter((w) => w.culture === culture);
  const have = standing(s, culture);
  return { open: all.filter((w) => w.standing <= have), next: all.find((w) => w.standing > have) };
}

/** An order for a ware that has since been removed is dropped instead of crashing the load. */
export function settleExpedition(s: GameState): void {
  const e = s.expedition;
  for (const [culture, id] of Object.entries(e.orders)) if (!hasWare(id)) delete e.orders[culture as CultureId];
  for (const id of Object.keys(e.shelves)) if (!hasWare(id)) delete e.shelves[id];
}
