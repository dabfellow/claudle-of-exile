import {
  ANCIENT_DATA, CULTURES, cultureDef, digChance, EXPEDITION_GATE, findDigs, hasWare, isChamberAction, ROSETTA_STONE, SEALED_RELIC, SEALED_RELIC_HOURS, SITES, siteOf, siteOfAction,
  STRATUM_YIELD, TRAIL, trailIndex, wareDef, WARES, type CultureId, type SiteDef, type WareDef,
} from '../data/expedition';
import { passportChapter, ROSETTA_CHANCE, ROSETTA_SITES, scriptDef } from '../data/deciphering';
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
import { digInscription, ensureArchaeology, newArchaeologyState, relicFormUnlocked, settleDeciphering, stockBonus } from './deciphering';

export function newExpeditionState(): ExpeditionState {
  return { dug: {}, shelves: {}, orders: {}, tally: { finds: 0, traded: 0 }, passports: {}, forge: null, relicsRestored: 0, trailSchema: 1 };
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

/** The first site is open to everyone; every other one needs its Passport, a chapter reward. */
export function hasPassport(s: GameState, id: string): boolean {
  return trailIndex(id) <= 0 || !!s.expedition.passports?.[id];
}

export function passportReason(id: string): string {
  const from = passportChapter(id);
  return from ? `Needs an Expedition Passport: translate ${scriptDef(from.script).name} chapter ${from.n}` : '';
}

// ---------- the sites ----------

/** Finds reached at this site, which is also how deep you've dug (0 is the top). */
export function siteStratum(s: GameState, site: SiteDef): number {
  const dug = s.expedition.dug[site.id] ?? 0;
  return findDigs(site).filter((n) => n <= dug).length;
}

/** One standing for every find on a people's sites, and one for their merchant's first chapter. The Reliquary belongs to all of them, so to none. */
export function standing(s: GameState, culture: CultureId): number {
  return SITES.filter((x) => x.culture === culture && !x.relic).reduce((a, x) => a + siteStratum(s, x), 0) + stockBonus(s, culture);
}

/** How far through the current stratum a site is, 0–1, and the digs left in it (0 at the bottom). */
export function stratumProgress(s: GameState, site: SiteDef): { progress: number; digsLeft: number } {
  const steps = findDigs(site);
  const stratum = siteStratum(s, site);
  if (stratum >= steps.length) return { progress: 1, digsLeft: 0 };
  const dug = s.expedition.dug[site.id] ?? 0;
  const from = steps[stratum - 1] ?? 0;
  const perDig = skillTreeStats(s).deepSurvey ? 2 : 1;
  return { progress: (dug - from) / (steps[stratum] - from), digsLeft: Math.ceil((steps[stratum] - dug) / perDig - 1e-9) };
}

/** Artifacts one dig is worth on average, here and now. */
export function artifactsPerDig(s: GameState, site: SiteDef): number {
  return digChance(site) * (1 + siteStratum(s, site) * STRATUM_YIELD) * (1 + (skillTreeStats(s).artifactChance ?? 0) / 100);
}

function siteCulture(ctx: Ctx, site: SiteDef): CultureId {
  return site.relic ? pick(ctx.rng, CULTURES).id : site.culture;
}

/** A dig finished: `complete` has rolled the base Artifact, so this adds depth and the tree, then inscriptions, relics and fragments. */
export function digDone(s: GameState, ctx: Ctx, a: SkillAction, outputs: Record<string, number>): void {
  const site = siteOfAction(a.id);
  if (!site) return;
  const e = s.expedition;
  const give = (id: string, n: number) => {
    if (n <= 0) return;
    addBank(s, id, n);
    outputs[id] = (outputs[id] ?? 0) + n;
  };
  const deep = skillTreeStats(s).deepSurvey ? 2 : 1;

  // Artifacts: the Reliquary pays every people's; elsewhere `complete` already rolled the site's base chance
  const per = artifactsPerDig(s, site);
  if (site.relic) give(cultureDef(siteCulture(ctx, site)).artifact, roundChance(ctx, per));
  else give(cultureDef(site.culture).artifact, roundChance(ctx, per - digChance(site)));
  if (site.relic && chance(ctx.rng, site.intervalMs / (SEALED_RELIC_HOURS * HOUR))) {
    give(SEALED_RELIC, 1);
    ctx.emit({ t: 'info', text: `${site.name}: a Sealed Relic. Take it to the Relic Forge`, tone: 'good' });
  }

  // Inscriptions for the Scholar's desk, and the very rare Rosetta Stone
  digInscription(s, ctx, site.id, isChamberAction(a.id));
  if (ROSETTA_SITES.includes(site.id) && chance(ctx.rng, ROSETTA_CHANCE)) {
    give(ROSETTA_STONE, 1);
    ctx.emit({ t: 'info', text: `${site.name}: a Rosetta Stone, the same text in several scripts`, tone: 'good' });
  }
  // TODO collectibles: one per dig site

  // Relic Fragments
  const fragKey = `archaeology.fragments.${site.culture}`;
  const before = s.professionProgress.counters[fragKey] ?? 0;
  s.professionProgress.counters[fragKey] = before + 1;
  const frags = Math.floor((before + 1) / FRAGMENT_EVERY) - Math.floor(before / FRAGMENT_EVERY);
  if (frags > 0) awardProtectedProgress(s, ctx, relicFragment(site.culture), frags);

  // Depth
  const stratum = siteStratum(s, site);
  e.dug[site.id] = Math.round(((e.dug[site.id] ?? 0) + deep) * 100) / 100;
  if (siteStratum(s, site) === stratum) return;
  e.tally.finds += 1;
  recordDiscovery(s, ctx, `expedition.${site.id}.${stratum}`);
  const merchant = site.relic ? 'Every merchant' : cultureDef(site.culture).merchant;
  ctx.emit({ t: 'info', text: `${site.name}: you unearthed ${site.finds[stratum]}. ${merchant} will want to see this`, tone: 'good' });
  if (site.relic && stratum === 0) {
    give(SEALED_RELIC, 1);
    ctx.emit({ t: 'info', text: `${site.name}: behind the door, a Sealed Relic. Take it to the Relic Forge`, tone: 'good' });
  }
}

/** Voluntary full-price exchange; it never awards standing or profession bonuses. */
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
  if (!relicFormUnlocked(s, formId)) return 'Translate more of the story to unlock this relic';
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
    if (dug > 0 || (s.action?.kind === 'skill' && siteOfAction(s.action.actionId)?.id === site.id)) s.professionProgress.legacyAccess[site.id] = true;
    findDigs(site).forEach((n, i) => { if (dug >= n) s.professionProgress.discoveries[`expedition.${site.id}.${i}`] = true; });
  }
  e.passports ??= {};
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
  // Deciphering: fill in the glyph tables, and let any evidence or finished glyphs settle
  s.archaeology ??= newArchaeologyState();
  ensureArchaeology(s.archaeology);
  settleDeciphering(s, null);
}

/** Which first find used to open each site, before the trail. */
const LEGACY_UNLOCK: Record<string, string> = {
  dig_cutting: 'dig_cairn', dig_colossus: 'dig_cairn', dig_barrow: 'dig_cutting', dig_adit: 'dig_cutting', dig_heart: 'dig_barrow',
};
