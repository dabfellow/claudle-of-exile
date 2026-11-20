import {
  ANCIENT_DATA, BURIED_COMPONENTS, CAVE_IN_LOSS, CAVE_IN_PER_HAZARD, CLUE_HOURS, CLUES_PER_PASSPORT, COMMIT_MAX, COMMIT_PER_HOUR, CULTURES, cultureDef, digChance,
  EXPEDITION_GATE, findDigs, hasWare, LAYERS, nextSite, previousSite, SEALED_RELIC, SEALED_RELIC_HOURS, SITES, siteOf, STRATUM_YIELD, TRAIL, TRAIL_DATA_BONUS,
  trailIndex, wareDef, WARES, type CultureId, type LayerDef, type SiteDef, type WareDef,
} from '../data/expedition';
import type { SkillAction } from '../data/skills';
import { materialDef } from '../data/materials';
import { affixDef } from '../data/affixes';
import { RELIC_FORMS, RELIC_ILVL, RELIC_SLOTS, relicForm, relicLineCost, type RelicForm } from '../data/relics';
import { addBank, hasItem } from './bank';
import type { Ctx } from './context';
import { chance, pick } from './rng';
import { skillTreeStats } from './skillTree';
import type { ExpeditionState, GameState, Item } from './types';
import { relicFragment } from '../data/archaeology';
import { awardProtectedProgress, recordDiscovery } from './professions';
import { canAfford, payCost } from './bank';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import { eligibleAffixes, newUid } from './items';
import { bagFull } from './storage';

export function newExpeditionState(): ExpeditionState {
  return { dug: {}, shelves: {}, orders: {}, tally: { finds: 0, traded: 0 }, layer: {}, clues: {}, clueMs: {}, passports: {}, commit: { key: '', ms: 0 }, forge: null, caveIns: 0, relicsRestored: 0, trailSchema: 1 };
}

export function expeditionOpen(_s: GameState): boolean {
  return true;
}

const HOUR = 3_600_000;
const FRAGMENT_EVERY = 60;

function roundChance(ctx: Ctx, x: number): number {
  return Math.floor(x) + (chance(ctx.rng, x - Math.floor(x)) ? 1 : 0);
}

// ---------- the trail ----------

/** The first site is open to everyone; every other one needs its Passport. */
export function hasPassport(s: GameState, id: string): boolean {
  return trailIndex(id) <= 0 || !!s.expedition.passports?.[id];
}

/** Clue Fragments found at this site, and how far towards the next one, 0–1. */
export function clueProgress(s: GameState, site: SiteDef): { clues: number; progress: number; next?: SiteDef; done: boolean } {
  const next = nextSite(site.id);
  const done = !next || hasPassport(s, next.id);
  const clues = done && next ? CLUES_PER_PASSPORT : (s.expedition.clues?.[site.id] ?? 0);
  return { clues, progress: done ? 1 : (s.expedition.clueMs?.[site.id] ?? 0) / (CLUE_HOURS * HOUR), next, done };
}

export function passportReason(id: string): string {
  const prev = previousSite(id);
  return prev ? `Needs an Expedition Passport: find ${CLUES_PER_PASSPORT} Clue Fragments at ${prev.name}` : '';
}

// ---------- the layers ----------

/** Finds reached at this site, which is also the stratum you're on (0 is the top). */
export function siteStratum(s: GameState, site: SiteDef): number {
  const dug = s.expedition.dug[site.id] ?? 0;
  return findDigs(site).filter((n) => n <= dug).length;
}

/** The deepest layer you've broken into here: Bedrock stays the frontier once a site is worked out. */
export function reachedLayer(s: GameState, site: SiteDef): number {
  return Math.min(siteStratum(s, site), LAYERS.length - 1);
}

/** The layer you dig here: your pick if you've reached it, otherwise the deepest one open. */
export function chosenLayer(s: GameState, site: SiteDef): number {
  const reached = reachedLayer(s, site);
  const pickd = s.expedition.layer?.[site.id];
  return pickd === undefined ? reached : Math.min(Math.max(0, pickd), reached);
}

export function layerAt(s: GameState, site: SiteDef): LayerDef {
  return LAYERS[chosenLayer(s, site)];
}

export function setLayer(s: GameState, siteId: string, layer: number): string | null {
  const site = siteOf(siteId);
  if (!site) return 'Unknown site';
  if (layer < 0 || layer >= LAYERS.length) return 'Unknown layer';
  if (layer > reachedLayer(s, site)) return `Dig through ${LAYERS[layer - 1].name} first`;
  (s.expedition.layer ??= {})[siteId] = layer;
  return null;
}

/** How much longer a dig takes on the chosen layer; 1 for anything that isn't a dig. */
export function digSpeedMult(s: GameState, actionId: string): number {
  const site = siteOf(actionId);
  return site ? layerAt(s, site).speed : 1;
}

/** One standing for every find on a people's sites. The Reliquary belongs to all of them, so to none. */
export function standing(s: GameState, culture: CultureId): number {
  return SITES.filter((x) => x.culture === culture && !x.relic).reduce((a, x) => a + siteStratum(s, x), 0);
}

/** How far through the current stratum a site is, 0–1, and the digs left in it (0 at the bottom). */
export function stratumProgress(s: GameState, site: SiteDef): { progress: number; digsLeft: number } {
  const steps = findDigs(site);
  const stratum = siteStratum(s, site);
  if (stratum >= steps.length) return { progress: 1, digsLeft: 0 };
  const dug = s.expedition.dug[site.id] ?? 0;
  const from = steps[stratum - 1] ?? 0;
  const perDig = LAYERS[reachedLayer(s, site)].speed * (skillTreeStats(s).deepSurvey ? 2 : 1);
  return { progress: (dug - from) / (steps[stratum] - from), digsLeft: Math.ceil((steps[stratum] - dug) / perDig - 1e-9) };
}

/** Artifacts one dig is worth on average, here and now. */
export function artifactsPerDig(s: GameState, site: SiteDef, layer: LayerDef = layerAt(s, site)): number {
  return digChance(site) * layer.artifacts * (1 + siteStratum(s, site) * STRATUM_YIELD) * (1 + (skillTreeStats(s).artifactChance ?? 0) / 100);
}

/** Ancient Data multiplier from time spent on this layer without a break. */
export function commitMult(s: GameState, site: SiteDef, layer = chosenLayer(s, site)): number {
  const c = s.expedition.commit;
  const ms = c && c.key === `${site.id}:${layer}` ? c.ms : 0;
  return Math.min(COMMIT_MAX, 1 + (ms / HOUR) * COMMIT_PER_HOUR);
}

/** Ancient Data one dig is worth on average, Commitment included. */
export function dataPerDig(s: GameState, site: SiteDef, layer = chosenLayer(s, site)): number {
  const L = LAYERS[layer];
  return (L.dataPerHour * (1 + trailIndex(site.id) * TRAIL_DATA_BONUS) * commitMult(s, site, layer) * site.intervalMs * L.speed) / HOUR;
}

export function caveInChance(site: SiteDef, layer: LayerDef): number {
  return site.hazard * CAVE_IN_PER_HAZARD * layer.hazard;
}

function siteCulture(ctx: Ctx, site: SiteDef): CultureId {
  return site.relic ? pick(ctx.rng, CULTURES).id : site.culture;
}

/** A dig finished: `complete` has rolled the base Artifact, so this adds the layer, depth and tree, then the trail. */
export function digDone(s: GameState, ctx: Ctx, a: SkillAction, outputs: Record<string, number>): void {
  const site = siteOf(a.id);
  if (!site) return;
  const e = s.expedition;
  const give = (id: string, n: number) => {
    if (n <= 0) return;
    addBank(s, id, n);
    outputs[id] = (outputs[id] ?? 0) + n;
  };
  const layerIdx = chosenLayer(s, site);
  const L = LAYERS[layerIdx];
  const baseMs = site.intervalMs * L.speed;
  const deep = skillTreeStats(s).deepSurvey ? 2 : 1;
  const key = `${site.id}:${layerIdx}`;
  if (!e.commit || e.commit.key !== key) e.commit = { key, ms: 0 };

  if (chance(ctx.rng, caveInChance(site, L))) {
    e.commit.ms *= 1 - CAVE_IN_LOSS;
    e.caveIns = (e.caveIns ?? 0) + 1;
    ctx.emit({ t: 'info', text: `${site.name}: the ${L.name.toLowerCase()} trench caved in. Commitment shaken`, tone: 'warn' });
  } else {
    // Artifacts: the Reliquary pays every people's; elsewhere `complete` already rolled the site's base chance
    const per = artifactsPerDig(s, site, L);
    if (site.relic) give(cultureDef(siteCulture(ctx, site)).artifact, roundChance(ctx, per));
    else give(cultureDef(site.culture).artifact, roundChance(ctx, per - digChance(site)));
    give(ANCIENT_DATA, roundChance(ctx, dataPerDig(s, site, layerIdx)));
    if (L.componentsPerHour && chance(ctx.rng, (L.componentsPerHour * baseMs) / HOUR)) give(pick(ctx.rng, BURIED_COMPONENTS[siteCulture(ctx, site)]), 1);
    if (site.relic && layerIdx === LAYERS.length - 1 && chance(ctx.rng, baseMs / (SEALED_RELIC_HOURS * HOUR))) {
      give(SEALED_RELIC, 1);
      ctx.emit({ t: 'info', text: `${site.name}: a Sealed Relic, deep in the bedrock. Take it to the Relic Forge`, tone: 'good' });
    }
    e.commit.ms += baseMs;
  }

  // Relic Fragments, weighted towards Bedrock
  const fragKey = `archaeology.fragments.${site.culture}`;
  const before = s.professionProgress.counters[fragKey] ?? 0;
  const after = before + L.fragments;
  s.professionProgress.counters[fragKey] = after;
  const frags = Math.floor(after / FRAGMENT_EVERY) - Math.floor(before / FRAGMENT_EVERY);
  if (frags > 0) awardProtectedProgress(s, ctx, relicFragment(site.culture), frags);

  // Clue Fragments, towards the next site's Passport
  const next = nextSite(site.id);
  if (next && !hasPassport(s, next.id)) {
    const clues = (e.clues ??= {});
    const clueMs = (e.clueMs ??= {});
    clueMs[site.id] = (clueMs[site.id] ?? 0) + baseMs * deep;
    while (clueMs[site.id] >= CLUE_HOURS * HOUR && (clues[site.id] ?? 0) < CLUES_PER_PASSPORT) {
      clueMs[site.id] -= CLUE_HOURS * HOUR;
      clues[site.id] = (clues[site.id] ?? 0) + 1;
      ctx.emit({ t: 'info', text: `${site.name}: Clue Fragment ${clues[site.id]} of ${CLUES_PER_PASSPORT}`, tone: 'good' });
    }
    if ((clues[site.id] ?? 0) >= CLUES_PER_PASSPORT) {
      (e.passports ??= {})[next.id] = true;
      clueMs[site.id] = 0;
      ctx.emit({ t: 'info', text: `Expedition Passport stamped: ${next.name} (Archaeology ${next.level})`, tone: 'good' });
    }
  }

  // Depth: only the deepest layer reached goes further down, and every layer weighs its own time
  if (layerIdx !== reachedLayer(s, site)) return;
  const stratum = siteStratum(s, site);
  e.dug[site.id] = Math.round(((e.dug[site.id] ?? 0) + L.speed * deep) * 100) / 100;
  if (siteStratum(s, site) === stratum) return;
  e.tally.finds += 1;
  recordDiscovery(s, ctx, `expedition.${site.id}.${stratum}`);
  if (e.layer && e.layer[site.id] === stratum) delete e.layer[site.id];
  const merchant = site.relic ? 'Every merchant' : cultureDef(site.culture).merchant;
  ctx.emit({ t: 'info', text: `${site.name}: you unearthed ${site.finds[stratum]}. ${merchant} will want to see this`, tone: 'good' });
  if (site.relic && stratum === 0) {
    give(SEALED_RELIC, 1);
    ctx.emit({ t: 'info', text: `${site.name}: behind the door, a Sealed Relic. Take it to the Relic Forge`, tone: 'good' });
  }
}

/** Voluntary full-price exchange; it never awards standing or profession bonuses. */
export function exchangeFragments(s: GameState, ctx: Ctx, culture: CultureId): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  if (s.fallen) return 'This character has fallen';
  const c = cultureDef(culture);
  if (!c) return 'Unknown culture';
  const cost = { [relicFragment(culture)]: 5 };
  if (!canAfford(s, cost)) return 'Needs 5 matching relic fragments';
  payCost(s, cost);
  addBank(s, c.artifact, 25);
  ctx.emit({ t: 'produce', skill: 'archaeology', outputs: { [c.artifact]: 25 } });
  return null;
}

// ---------- the Relic Forge ----------

export interface RelicLine {
  affixId: string;
  tier: number;
}

/** Tiers a relic can be programmed with for this modifier, worst first. */
export function relicTiers(affixId: string): number[] {
  return affixDef(affixId).tiers.map((t, i) => ({ t, i })).filter(({ t }) => t.ilvl <= RELIC_ILVL).map(({ i }) => i);
}

export function relicLinePrice(line: RelicLine): number {
  const tiers = relicTiers(line.affixId);
  return relicLineCost(tiers.length - 1 - tiers.indexOf(line.tier));
}

export function relicCost(lines: RelicLine[]): number {
  return lines.reduce((a, l) => a + relicLinePrice(l), 0);
}

function blankRelic(form: RelicForm, uid = 0): Item {
  return { uid, baseId: form.baseId, ilvl: RELIC_ILVL, rarity: 'rare', name: form.name, prefixes: [], suffixes: [], itemTier: 1, relic: form.id };
}

/** Modifiers that can still go on a relic with these lines on it. */
export function relicChoices(formId: string, lines: RelicLine[], kind: 'prefix' | 'suffix') {
  const form = relicForm(formId);
  if (!form) return [];
  const item = blankRelic(form);
  for (const l of lines) (affixDef(l.affixId).kind === 'prefix' ? item.prefixes : item.suffixes).push({ affixId: l.affixId, tier: l.tier, values: [] });
  return eligibleAffixes(item, kind).filter((a) => relicTiers(a.id).length > 0);
}

export function unsealRelic(s: GameState, ctx: Ctx, formId: string): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  if (s.fallen) return 'This character has fallen';
  if (!relicForm(formId)) return 'Unknown relic';
  if (s.expedition.forge) return 'A relic is already on the forge';
  if (!hasItem(s, SEALED_RELIC, 1)) return 'Needs a Sealed Relic';
  payCost(s, { [SEALED_RELIC]: 1 });
  s.expedition.forge = { formId };
  ctx.emit({ t: 'info', text: `The seal breaks: ${relicForm(formId)!.name}. Program it with Ancient Data`, tone: 'good' });
  return null;
}

/** Why these lines can't be restored onto the relic on the forge, or null. */
export function relicReason(s: GameState, lines: RelicLine[]): string | null {
  const job = s.expedition.forge;
  if (!job) return 'Nothing on the forge';
  if (!lines.length) return 'Program at least one modifier';
  const placed: RelicLine[] = [];
  for (const kind of ['prefix', 'suffix'] as const) {
    const mine = lines.filter((l) => affixDef(l.affixId)?.kind === kind);
    if (mine.length > RELIC_SLOTS) return `At most ${RELIC_SLOTS} ${kind}es`;
  }
  for (const l of lines) {
    const def = affixDef(l.affixId);
    if (!def) return 'Unknown modifier';
    if (!relicChoices(job.formId, placed, def.kind).some((a) => a.id === l.affixId)) return `${def.label} can't go on this relic`;
    if (!relicTiers(l.affixId).includes(l.tier)) return 'That tier is out of reach';
    placed.push(l);
  }
  if (!hasItem(s, ANCIENT_DATA, relicCost(lines))) return 'Not enough Ancient Data';
  if (bagFull(s)) return 'Inventory full';
  return null;
}

/** Programs and restores the relic on the forge: every line at the top of its tier. */
export function restoreRelic(s: GameState, ctx: Ctx, lines: RelicLine[]): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const reason = relicReason(s, lines);
  if (reason) return reason;
  const form = relicForm(s.expedition.forge!.formId)!;
  payCost(s, { [ANCIENT_DATA]: relicCost(lines) });
  const item = blankRelic(form, newUid(s));
  for (const l of lines) {
    const def = affixDef(l.affixId);
    (def.kind === 'prefix' ? item.prefixes : item.suffixes).push({ affixId: l.affixId, tier: l.tier, values: def.tiers[l.tier].ranges.map(([, hi]) => hi) });
  }
  s.inventory.push(item);
  s.expedition.forge = null;
  s.expedition.relicsRestored = (s.expedition.relicsRestored ?? 0) + 1;
  ctx.emit({ t: 'loot', item });
  ctx.emit({ t: 'info', text: `Restored: ${form.name}`, tone: 'good' });
  return null;
}

export { RELIC_FORMS };

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
  s.storage.bank[cultureDef(w.culture).artifact] -= warePrice(s, w);
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
  for (const site of SITES) {
    const dug = e.dug[site.id] ?? 0;
    if (dug > 0 || (s.action?.kind === 'skill' && s.action.actionId === site.id)) s.professionProgress.legacyAccess[site.id] = true;
    findDigs(site).forEach((n, i) => { if (dug >= n) s.professionProgress.discoveries[`expedition.${site.id}.${i}`] = true; });
  }
  e.layer ??= {};
  e.clues ??= {};
  e.clueMs ??= {};
  e.passports ??= {};
  e.commit ??= { key: '', ms: 0 };
  e.forge ??= null;
  if (e.forge && !relicForm(e.forge.formId)) {
    addBank(s, SEALED_RELIC, 1);
    e.forge = null;
  }
  // Before the trail, a site opened at its predecessor's first find: anyone who could dig a site keeps its Passport
  if ((e.trailSchema ?? 0) < 1) {
    const discovered = (siteId: string) => !!s.professionProgress.discoveries[`expedition.${siteId}.0`] || (e.dug[siteId] ?? 0) >= findDigs(siteOf(siteId)!)[0];
    for (const id of TRAIL) {
      const old = LEGACY_UNLOCK[id];
      if ((e.dug[id] ?? 0) > 0 || s.professionProgress.legacyAccess[id] || (old && discovered(old))) e.passports[id] = true;
    }
    e.trailSchema = 1;
  }
}

/** Which first find used to open each site, before the trail. */
const LEGACY_UNLOCK: Record<string, string> = {
  dig_cutting: 'dig_cairn', dig_colossus: 'dig_cairn', dig_barrow: 'dig_cutting', dig_adit: 'dig_cutting', dig_heart: 'dig_barrow',
};
