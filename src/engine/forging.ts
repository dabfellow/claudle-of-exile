import { affixDef, type AffixDef } from '../data/affixes';
import { baseDef } from '../data/bases';
import {
  FORGE_CHAPTERS, FORGE_CHAPTER_SIZE, FORGE_OLD_LEVELS, STAGED_FORGE_PREFIX, forgeChapter, forgeStages, masterFormLevel,
  type ForgeChoice, type ForgeElement, type ForgeSignature, type ForgeStageId,
} from '../data/forging';
import { MASTER_ALLOYS, masterAlloyFor } from '../data/smelting';
import { actionsFor, hasAction, actionDef, equipmentSkill, type SkillAction } from '../data/skills';
import { weaponMasteryId, WEAPON_SIGNATURE_MASTERY } from '../data/skillingMastery';
import type { SmithPurpose } from '../data/smithing';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import type { Ctx } from './context';
import { isCraftLocked } from './crafting';
import { addRandomMod, allMods, createItem, eligibleAffixes, modCount, rareName, spawnWeight, type ModBias } from './items';
import { chance, pick, pickWeighted, rInt, type Rng } from './rng';
import { hasMilestone, MASTERY_CAP, masteryLevel } from './skillingMastery';
import { actionBlocker, startSkillAction } from './skills';
import { bagFull } from './storage';
import type { GameState, Item, RolledMod } from './types';
import { levelOf } from './xp';

export interface ForgePlan {
  baseId: string;
  choices: Partial<Record<ForgeStageId, string>>;
  element?: ForgeElement;
  /** The actual alloy item id, which distinguishes standard and Living alloys. */
  alloy?: string;
  /** A ready-made path for an existing guaranteed recipe. */
  legacyPurpose?: string;
}

export interface ForgePattern extends ForgePlan {
  id: string;
  name: string;
}

export interface ForgingState {
  patterns: ForgePattern[];
  active: string | null;
  running: ForgePlan | null;
  book: Partial<Record<(typeof FORGE_CHAPTERS)[number][0], string[]>>;
  pendingSinging: number[];
  rack: number[];
  /** Pieces forged with each stage option, keyed `stage:option`. */
  practice: Record<string, number>;
  /** Options kept from before practice unlocks, keyed `stage:option`. */
  unlocked: string[];
}

export type ForgeSong = 'tier' | 'mod' | 'quality';
export const FORGE_SONGS: Readonly<Record<ForgeSong, string>> = {
  tier: '+1 tier on every modifier', mod: 'One additional modifier', quality: '+30% quality',
};

export function freshForging(): ForgingState {
  return { patterns: [], active: null, running: null, book: {}, pendingSinging: [], rack: [], practice: {}, unlocked: [] };
}

function forgingLevel(s: Pick<GameState, 'skills'>): number {
  return levelOf('smithing', s.skills?.smithing ?? 0);
}

const choiceKey = (stage: ForgeStageId, id: string) => `${stage}:${id}`;

/** Pieces forged so far toward an option's unlock. */
export function forgeUnlockProgress(s: GameState, option: ForgeChoice): number {
  const unlock = option.unlock;
  if (!unlock) return 0;
  const practice = s.forging?.practice ?? {};
  if (unlock.ids) return unlock.ids.reduce((sum, id) => sum + (practice[choiceKey(unlock.stage, id)] ?? 0), 0);
  return practice[unlock.stage] ?? 0;
}

/** Why a stage option can't be used yet, or null when it can. */
export function forgeChoiceBlocker(s: GameState, stage: ForgeStageId, option: ForgeChoice): string | null {
  if (s.forging?.unlocked?.includes(choiceKey(stage, option.id))) return null;
  if (forgingLevel(s) < option.level) return `Requires Forging level ${option.level} for ${option.name}`;
  const unlock = option.unlock;
  if (unlock && forgeUnlockProgress(s, option) < unlock.count) return `${option.name} unlocks after ${unlock.count} pieces ${forgeUnlockText(option)}`;
  return null;
}

/** "with Deep or Quick", "with any Temper" — what counts toward an unlock. */
export function forgeUnlockText(option: ForgeChoice): string {
  const unlock = option.unlock;
  if (!unlock) return '';
  if (!unlock.ids) return `with any ${unlock.stage === 'form' ? 'Edge, Rim or Setting' : unlock.stage[0].toUpperCase() + unlock.stage.slice(1)}`;
  return `with ${unlock.ids.map((id) => id[0].toUpperCase() + id.slice(1)).join(' or ')}`;
}

/** Stage options open on this base, out of all of them (Signature aside). */
export function forgeUnlockShare(s: GameState, baseId: string): number {
  const options = forgeStages(baseDef(baseId)).flatMap((stage) => stage.choices.map((option) => forgeChoiceBlocker(s, stage.id, option)));
  return options.length ? options.filter((blocker) => !blocker).length / options.length : 0;
}

export interface ForgeRarityOdds { normal: number; magic: number; rare: number }

/**
 * Most pieces come out normal or magic. Rares grow with Forging level, the piece's mastery, and stage options unlocked.
 * Master forms are always rare.
 */
export function forgeRarityOdds(s: GameState, plan: ForgePlan): ForgeRarityOdds {
  if (plan.alloy) return { normal: 0, magic: 0, rare: 1 };
  const level = (forgingLevel(s) - 1) / 98;
  const track = forgeTemplate(plan.baseId)?.mastery;
  const mastery = track ? (masteryLevel(s, track.id) - 1) / 98 : 0;
  const unlocks = forgeUnlockShare(s, plan.baseId);
  const rare = Math.min(0.6, 0.02 + 0.22 * level + 0.15 * mastery + 0.15 * unlocks);
  const magic = Math.min(1 - rare, 0.35 + 0.2 * level + 0.1 * mastery + 0.1 * unlocks);
  return { normal: Math.max(0, 1 - rare - magic), magic, rare };
}

/** Count one finished piece toward the unlocks for every option it used. */
function practiseForgePath(s: GameState, plan: ForgePlan): void {
  const practice = s.forging.practice ??= {};
  for (const [stage, id] of Object.entries(plan.choices) as [ForgeStageId, string | undefined][]) {
    if (!id) continue;
    practice[stage] = (practice[stage] ?? 0) + 1;
    practice[choiceKey(stage, id)] = (practice[choiceKey(stage, id)] ?? 0) + 1;
  }
}

/** Keep every stage option a character's level had already opened when options moved to practice unlocks. */
export function grandfatherForgeUnlocks(s: GameState): void {
  s.forging ??= freshForging();
  const level = forgingLevel(s);
  const kept = new Set(s.forging.unlocked ?? []);
  for (const [key, old] of Object.entries(FORGE_OLD_LEVELS)) if (level >= old) kept.add(key);
  s.forging.unlocked = [...kept];
}

export function forgeChaptersCompleted(s: GameState): number {
  return FORGE_CHAPTERS.filter(([id]) => (s.forging?.book[id]?.length ?? 0) >= FORGE_CHAPTER_SIZE).length;
}

export function forgingSpeed(s: GameState): number {
  const chapters = forgeChaptersCompleted(s);
  return 5 * (Math.ceil(chapters / 5) + Math.floor((chapters + 1) / 5));
}

export function forgePatternSlots(s: GameState): number {
  const chapters = forgeChaptersCompleted(s);
  return 3 + Math.min(3, Math.floor(forgingLevel(s) / 25)) + Math.floor((chapters + 3) / 5) + Math.floor(chapters / 5);
}

export function forgeSingingChance(s: GameState): number {
  return (1 / 500) * 1.25 ** Math.floor((forgeChaptersCompleted(s) + 2) / 5);
}

export function stagedForgeId(baseId: string): string {
  return STAGED_FORGE_PREFIX + baseId;
}

export function isStagedForge(actionId: string): boolean {
  return actionId.startsWith(STAGED_FORGE_PREFIX);
}

let stagedRecipes: SkillAction[] | undefined;
let ordinaryRecipes: SkillAction[] | undefined;
export function forgeRecipes(master = false): SkillAction[] {
  stagedRecipes ??= actionsFor('smithing').filter((a) => isStagedForge(a.id));
  return master ? stagedRecipes : ordinaryRecipes ??= stagedRecipes.filter((a) => equipmentSkill(baseDef(a.baseId!)) === 'smithing');
}

let purposeRecipes: Map<string, SkillAction> | undefined;
function oldRecipes(): Map<string, SkillAction> {
  return purposeRecipes ??= new Map(actionsFor('smithing').filter((a) => a.baseId && a.purpose).map((a) => [a.id, a]));
}

/** These paths preserve existing purpose recipes, including the ones available below the new stage gates. */
export function forgePreset(a: SkillAction): ForgePlan {
  const base = baseDef(a.baseId!);
  const jewellery = base.tags.includes('jewellery');
  const sig = a.purpose!.id;
  const choices: ForgePlan['choices'] = {};
  let element: ForgeElement | undefined;
  if (sig === 'physical') Object.assign(choices, { shape: 'heavy', form: 'serrated' });
  else if (sig === 'protection') Object.assign(choices, { shape: 'plated', form: 'reinforced' });
  else if (sig === 'resource' && jewellery) Object.assign(choices, { shape: 'band', form: 'closed' });
  else if (sig.startsWith('resistance_')) {
    Object.assign(choices, { shape: jewellery ? 'twisted' : 'plated', temper: 'oil', form: jewellery ? 'closed' : 'reinforced' });
    element = sig.slice('resistance_'.length) as ForgeElement;
  } else Object.assign(choices, { shape: base.slot === 'weapon' ? 'light' : 'plated' });
  return { baseId: base.id, choices, element, legacyPurpose: a.id };
}

export function forgePresetsFor(baseId: string): SkillAction[] {
  return [...oldRecipes().values()].filter((a) => a.baseId === baseId);
}

function forgeTemplate(baseId: string): SkillAction | undefined {
  const id = stagedForgeId(baseId);
  return hasAction(id) ? actionDef(id) : undefined;
}

export function forgePlanBlocker(s: GameState, plan: ForgePlan): string | null {
  const template = forgeTemplate(plan.baseId);
  if (!template) return 'Select a forgeable blank';
  const level = forgingLevel(s);
  if (level < template.level) return `Requires Forging level ${template.level}`;
  if (plan.legacyPurpose) {
    const legacy = oldRecipes().get(plan.legacyPurpose);
    if (!legacy || legacy.baseId !== plan.baseId || plan.alloy || pathKey(forgePreset(legacy)) !== pathKey(plan)) return 'Select a valid purpose pattern';
    return stageBlocker(s, plan);
  }
  const base = baseDef(plan.baseId);
  if (!plan.alloy && equipmentSkill(base) === 'woodcrafting') return 'Choose a master alloy for this weapon';
  if (!plan.choices?.shape) return 'Choose a shape';
  const stages = stageBlocker(s, plan);
  if (stages) return stages;
  if (plan.element && (plan.choices.temper !== 'oil' || !['fire', 'cold', 'light'].includes(plan.element))) return 'Select a valid quenching element';
  if (plan.choices.temper === 'oil' && base.slot !== 'weapon' && !plan.element) return 'Choose a resistance for the oil quench';
  if (plan.alloy) {
    if (!masterAlloyFor(plan.alloy)) return 'Select a master alloy';
    const gate = masterFormLevel(base);
    if (level < gate) return `Requires Forging level ${gate} for this master form`;
    if (!plan.choices.signature) return 'Choose a signature';
  }
  return null;
}

/** Every chosen stage option must exist and be unlocked; presets need the options they use too. */
function stageBlocker(s: GameState, plan: ForgePlan): string | null {
  const stages = forgeStages(baseDef(plan.baseId), !!plan.alloy);
  for (const stageId of Object.keys(plan.choices ?? {})) {
    const stage = stages.find((candidate) => candidate.id === stageId);
    const choice = stage?.choices.find((candidate) => candidate.id === plan.choices[stage.id]);
    if (!stage || !choice) return 'Choose a valid stage option';
    const blocker = forgeChoiceBlocker(s, stage.id, choice);
    if (blocker) return blocker;
  }
  return null;
}

export function forgeActionForPlan(plan: ForgePlan): SkillAction | undefined {
  const template = forgeTemplate(plan.baseId);
  if (!template) return undefined;
  return {
    ...template,
    intervalMs: template.intervalMs * (plan.choices?.temper === 'quick' ? 0.7 : 1),
    inputs: { ...template.inputs, ...(plan.alloy ? { [plan.alloy]: 1 } : {}) },
  };
}

export function forgeAction(s: GameState, actionId: string): SkillAction | undefined {
  const plan = s.forging?.running;
  return plan && actionId === stagedForgeId(plan.baseId) ? forgeActionForPlan(plan) : undefined;
}

export function forgeActionBlocker(s: GameState, a: SkillAction): string | null {
  if (!isStagedForge(a.id)) return null;
  const plan = s.forging?.running;
  if (!plan || stagedForgeId(plan.baseId) !== a.id) return 'Choose a path at the Anvil';
  if (bagFull(s)) return 'Inventory full';
  return forgePlanBlocker(s, plan);
}

export function forgeStartBlocker(s: GameState, plan: ForgePlan): string | null {
  const invalid = forgePlanBlocker(s, plan);
  if (invalid) return invalid;
  const a = forgeActionForPlan(plan)!;
  // Preview the proposed path without changing the live action or its plan.
  return actionBlocker({ ...s, forging: { ...s.forging, running: plan } }, a);
}

function copyPlan(plan: ForgePlan): ForgePlan {
  return { baseId: plan.baseId, choices: { ...plan.choices }, element: plan.element, alloy: plan.alloy, legacyPurpose: plan.legacyPurpose };
}

export function startStagedForge(s: GameState, ctx: Ctx, plan: ForgePlan, patternId?: string): string | null {
  const pattern = patternId ? s.forging.patterns.find(({ id }) => id === patternId) : undefined;
  const selected = pattern ?? plan;
  const invalid = patternId && !pattern ? 'Pattern not found' : forgeStartBlocker(s, selected);
  if (invalid) return invalid;
  const previous = s.forging.running;
  s.forging.running = copyPlan(selected);
  const blocker = startSkillAction(s, ctx, stagedForgeId(selected.baseId));
  if (blocker) {
    s.forging.running = previous;
    return blocker;
  }
  s.forging.active = pattern?.id ?? null;
  return null;
}

export function saveForgePattern(s: GameState, name: string, plan: ForgePlan): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const invalid = forgePlanBlocker(s, plan);
  if (invalid) return invalid;
  if (s.forging.patterns.length >= forgePatternSlots(s)) return 'Pattern book slots are full';
  let serial = 1;
  while (s.forging.patterns.some(({ id }) => id === `saved-${serial}`)) serial++;
  const label = name.trim().slice(0, 60) || baseDef(plan.baseId).name;
  s.forging.patterns.push({ ...copyPlan(plan), id: `saved-${serial}`, name: label });
  return null;
}

export function deleteForgePattern(s: GameState, id: string): void {
  s.forging.patterns = s.forging.patterns.filter((pattern) => pattern.id !== id);
  if (s.forging.active === id) s.forging.active = null;
}

function pathKey(plan: ForgePlan): string {
  return (['shape', 'temper', 'form', 'finish', 'signature'] as const).map((id) => plan.choices?.[id] ?? '-').concat(plan.element ?? '-', plan.alloy ?? '-').join('/');
}

function recordForgePath(s: GameState, ctx: Ctx, plan: ForgePlan): void {
  const chapter = forgeChapter(baseDef(plan.baseId));
  if (!chapter) return;
  const paths = s.forging.book[chapter] ??= [];
  const key = pathKey(plan);
  if (paths.includes(key)) return;
  paths.push(key);
  if (paths.length === FORGE_CHAPTER_SIZE) ctx.emit({ t: 'info', tone: 'good', text: `Pattern book chapter complete: ${FORGE_CHAPTERS.find(([id]) => id === chapter)![1]}.` });
}

function selectedChoices(plan: ForgePlan): ForgeChoice[] {
  return forgeStages(baseDef(plan.baseId), !!plan.alloy).flatMap((stage) => {
    const choice = stage.choices.find(({ id }) => id === plan.choices[stage.id]);
    return choice ? [choice] : [];
  });
}

export function forgeModWeight(plan: ForgePlan, group: string): number {
  return choiceWeight(selectedChoices(plan), group);
}

function choiceWeight(choices: readonly ForgeChoice[], group: string): number {
  return choices.reduce((value, choice) => value * (choice.weights?.[group] ?? choice.otherWeight ?? 1), 1);
}

export function forgePurpose(plan: ForgePlan): SmithPurpose | undefined {
  if (plan.legacyPurpose) return oldRecipes().get(plan.legacyPurpose)?.purpose;
  const { shape, temper, form } = plan.choices;
  const id = temper === 'oil' && plan.element && (form === 'reinforced' || form === 'closed') ? `resistance_${plan.element}`
    : shape === 'heavy' && form === 'serrated' ? 'physical'
    : (shape === 'plated' || shape === 'light') && form === 'reinforced' ? 'protection'
    : shape === 'band' && form === 'closed' ? 'resource' : null;
  return id ? oldRecipes().get(`purpose_${id}_${plan.baseId}`)?.purpose : undefined;
}

function rollModValues(mod: RolledMod, affix: AffixDef, tier: number, rng: Rng, half = false, itemTier = 1): void {
  mod.tier = tier;
  const minimum = half ? 0.5 : [0, 0, 0.35, 0.55, 0.75, 0.9][itemTier] ?? 0;
  mod.values = affix.tiers[tier].ranges.map(([lo, hi]) => rInt(rng, Math.ceil(lo + minimum * (hi - lo)), hi));
}

/** Shared with quick recipes and Woodcrafting. Only the actual paid grades contribute to this bonus. */
export function applyBarPurity(item: Item, purity: number, rng: Rng, guaranteed: readonly string[] = []): void {
  if (purity === 0) return;
  if (purity > 0) item.quality = (item.quality ?? 0) + 5 * purity;
  for (const mod of allMods(item)) {
    if (mod.tier < 0 || !chance(rng, Math.abs(purity) / 10)) continue;
    const affix = affixDef(mod.affixId);
    const improve = purity > 0;
    const next = mod.tier + (improve ? 1 : -1);
    if (next < 0 || !affix.tiers[next] || (improve && affix.tiers[next].ilvl > item.ilvl) || (!improve && guaranteed.includes(mod.affixId))) continue;
    rollModValues(mod, affix, next, rng, guaranteed.includes(mod.affixId), item.itemTier);
  }
}

function forgeSignatures(plan: ForgePlan, rng: Rng): ForgeSignature[] {
  const alloy = plan.alloy ? masterAlloyFor(plan.alloy) : undefined;
  if (!alloy) return [];
  const multiplier = plan.choices.signature === 'amplified' ? 1.5 : 1;
  const signatures = [{ id: alloy.id, multiplier }];
  if (alloy.living) {
    const companion = pick(rng, MASTER_ALLOYS.filter(({ id }) => id !== alloy.id));
    signatures.push({ id: companion.id, multiplier });
  }
  return signatures;
}

function addForgeMod(item: Item, kind: 'prefix' | 'suffix', plan: ForgePlan, bias: ModBias | undefined, floor: number, rng: Rng): boolean {
  const target = kind === 'prefix' ? item.prefixes : item.suffixes;
  if (target.length >= (item.rarity === 'magic' ? 1 : 3)) return false;
  const base = baseDef(item.baseId);
  const pool = eligibleAffixes(item, kind, bias);
  if (kind === 'suffix') {
    const extra = plan.choices.form === 'spiked' ? 'forge_thorns' : plan.choices.form === 'open' ? 'forge_gold' : null;
    if (extra && !target.some((mod) => mod.affixId === extra)) {
      const a = affixDef(extra);
      if (a.tiers[0].ilvl <= item.ilvl && spawnWeight(a, base, bias) > 0) pool.push(a);
    }
  }
  const choices = selectedChoices(plan);
  const affix = pickWeighted(rng, pool, (a) => spawnWeight(a, base, bias) * choiceWeight(choices, a.group));
  if (!affix) return false;
  const tiers = affix.tiers.map((t, i) => ({ t, i })).filter(({ t }) => t.ilvl <= item.ilvl).slice(-5);
  const bottom = Math.min(tiers.length - 1, floor);
  const exponent = 0.7 + 0.06 * ((item.itemTier ?? 1) - 1);
  const selected = pickWeighted(rng, tiers.slice(bottom), ({ i }) => exponent ** i)!;
  const mod: RolledMod = { affixId: affix.id, tier: selected.i, values: [] };
  rollModValues(mod, affix, selected.i, rng, false, item.itemTier);
  target.push(mod);
  return true;
}

export interface ForgeCraftOptions {
  ilvl: number;
  itemTier: 1 | 2 | 3 | 4 | 5;
  fossilBias?: ModBias;
  purity: number;
  focusMultiple: number;
}

export function createStagedForgeItem(s: GameState, ctx: Ctx, a: SkillAction, plan: ForgePlan, options: ForgeCraftOptions): Item {
  const { rng } = ctx;
  const ilvl = options.ilvl + (plan.choices.signature === 'ancestral' ? 2 : 0);
  const mastered = hasMilestone(s, a.mastery, 100);
  const itemTier = mastered && options.itemTier === 1 ? 2 : options.itemTier;
  const item = createItem(s, plan.baseId, ilvl, 'normal', rng, undefined, itemTier);
  const guarantees = forgePurpose(plan)?.guarantees ?? [];
  const odds = forgeRarityOdds(s, plan);
  const roll = rng.next();
  item.rarity = roll < odds.rare ? 'rare' : roll < odds.rare + odds.magic ? 'magic' : 'normal';
  // A purpose preset always carries its two promised mods: at least magic, and rare when both are the same kind.
  if (guarantees.length && item.rarity === 'normal') item.rarity = 'magic';
  if (item.rarity === 'magic' && new Set(guarantees.map((id) => affixDef(id).kind)).size < guarantees.length) item.rarity = 'rare';
  if (plan.choices.finish === 'etched') item.quality = 10;
  if (plan.alloy) item.forgeSignatures = forgeSignatures(plan, rng);
  const masterEdge = hasMilestone(s, a.mastery, 50);
  for (const id of guarantees) {
    const affix = affixDef(id);
    // Purpose rolls keep the existing higher minimum at the recipe's guaranteed strength.
    const strength = Math.max(baseDef(item.baseId).reqLevel, ilvl - 10);
    const minimum = affix.tiers.reduce((best, tier, i) => tier.ilvl <= strength ? i : best, 0);
    const ceiling = affix.tiers.reduce((best, tier, i) => tier.ilvl <= ilvl ? i : best, 0);
    const tier = plan.choices.temper === 'deep' ? Math.min(ceiling, minimum + 1) : minimum;
    const mod: RolledMod = { affixId: id, tier, values: [] };
    if (masterEdge) mod.values = affix.tiers[tier].ranges.map(([, hi]) => hi);
    else rollModValues(mod, affix, tier, rng, true, itemTier);
    (affix.kind === 'prefix' ? item.prefixes : item.suffixes).push(mod);
  }
  const floor = Number(plan.choices.temper === 'deep') + Number(masterEdge);
  const extra = Number(plan.choices.finish === 'gilded') + Number(plan.choices.signature === 'twin');
  // Magic pieces roll one or two mods (Gilded makes it two); normal pieces none.
  const total = item.rarity === 'rare' ? 4 + extra : item.rarity === 'magic' ? Math.min(2, 1 + Number(rng.next() < 0.5) + extra) : 0;
  if (item.rarity === 'rare') for (const kind of ['prefix', 'suffix'] as const) addForgeMod(item, kind, plan, options.fossilBias, floor, rng);
  while (modCount(item) < total) {
    const first = item.prefixes.length <= item.suffixes.length ? 'prefix' : 'suffix';
    const added = addForgeMod(item, first, plan, options.fossilBias, floor, rng) ||
      addForgeMod(item, first === 'prefix' ? 'suffix' : 'prefix', plan, options.fossilBias, floor, rng);
    if (!added) break;
  }
  applyBarPurity(item, options.purity, rng, guarantees);
  item.name = item.rarity === 'rare' ? rareName(item, rng) : null;
  const alloy = plan.alloy && masterAlloyFor(plan.alloy);
  if (alloy && weaponMasteryId(a) && hasMilestone(s, a.mastery, WEAPON_SIGNATURE_MASTERY)) {
    item.weaponMasterySignature = { alloy: alloy.id, effect: rng.next() < 0.5 ? 0 : 1 };
  }
  return item;
}

export function completeStagedForge(s: GameState, ctx: Ctx, a: SkillAction, options: ForgeCraftOptions): void {
  const plan = s.forging.running;
  if (!plan) return;
  recordForgePath(s, ctx, plan);
  practiseForgePath(s, plan);
  for (let copy = 0; copy < options.focusMultiple && !bagFull(s); copy++) {
    const item = createStagedForgeItem(s, ctx, a, plan, options);
    if (chance(ctx.rng, forgeSingingChance(s))) {
      item.forgeSinging = true;
      s.forging.pendingSinging.push(item.uid);
      if (!ctx.offline) ctx.emit({ t: 'info', text: `${item.name} is singing. Choose its song at the Anvil.`, tone: 'good' });
    }
    s.inventory.push(item);
    s.lifetime.itemsSmithed++;
    if (ctx.offline) s.forging.rack.push(item.uid);
    ctx.emit({ t: 'loot', item });
  }
  if (!s.forging.active) {
    s.action = null;
    s.forging.running = null;
  }
}

/** Only the character holding the piece can change its song. */
export function forgeRackItems(s: GameState): Item[] {
  const seen = new Set(s.forging.rack);
  return [...s.inventory, ...Object.values(s.equipment).filter((item): item is Item => !!item)]
    .filter((item) => seen.has(item.uid) || item.forgeSinging);
}

export function chooseForgeSong(s: GameState, ctx: Ctx, uid: number, song: ForgeSong): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const item = forgeRackItems(s).find((item) => item.uid === uid && item.forgeSinging);
  if (!item) return 'That singing item is not carried or equipped';
  if (isCraftLocked(s, uid)) return 'Stop the active bench craft on this item first';
  if (song === 'mod') {
    if (!addRandomMod(item, ctx.rng)) return 'There is no room for another modifier';
  } else if (song === 'tier') {
    for (const mod of allMods(item)) {
      const affix = affixDef(mod.affixId);
      if (mod.tier < 0 || mod.tier + 1 >= affix.tiers.length) continue;
      rollModValues(mod, affix, mod.tier + 1, ctx.rng, false, item.itemTier);
    }
  } else if (song === 'quality') item.quality = (item.quality ?? 0) + 30;
  else return 'Choose a song';
  delete item.forgeSinging;
  s.forging.pendingSinging = s.forging.pendingSinging.filter((itemUid) => itemUid !== uid);
  return null;
}

export function dismissForgeRack(s: GameState): void {
  s.forging.rack = [];
}

/** Keep the strongest practice already earned on a purpose recipe and preserve in-flight work. */
export function migrateForging(s: GameState): void {
  s.forging ??= freshForging();
  s.skillingMastery ??= {};
  const used: SkillAction[] = [];
  for (const legacy of oldRecipes().values()) {
    const practice = s.skillingMastery[`task.${legacy.id}`] ?? 0;
    const staged = `task.${stagedForgeId(legacy.baseId!)}`;
    if (practice > 0 || (s.action?.kind === 'skill' && s.action.actionId === legacy.id)) {
      used.push(legacy);
      if (practice > 0) s.skillingMastery[staged] = Math.max(s.skillingMastery[staged] ?? 0, practice);
    }
    if (s.action?.kind === 'skill' && s.action.actionId === legacy.id) {
      s.forging.running = forgePreset(legacy);
      s.action.actionId = stagedForgeId(legacy.baseId!);
    }
  }
  const rank = (a: SkillAction) => s.skillingMastery[`task.${a.id}`] ?? 0;
  const limit = used.length > forgePatternSlots(s) ? 10 : used.length;
  for (const legacy of used.sort((a, b) => rank(b) - rank(a)).slice(0, limit)) {
    if (s.forging.patterns.some(({ id }) => id === legacy.id)) continue;
    s.forging.patterns.push({ ...forgePreset(legacy), id: legacy.id, name: legacy.name });
  }
}

/** Convert completed weapon recipe practice into family practice without recreating saved plans. */
export function migrateWeaponMastery(s: GameState): void {
  const mastery = s.skillingMastery;
  if (!mastery || typeof mastery !== 'object' || Array.isArray(mastery)) return;
  const byBase = new Map<string, { family: string; total: number; staged: number; purpose: number }>();
  for (const skill of ['smithing', 'woodcrafting'] as const) {
    for (const recipe of actionsFor(skill)) {
      const family = weaponMasteryId(recipe);
      if (!family || !recipe.baseId) continue;
      const oldId = `task.${recipe.id}`;
      const practice = mastery[oldId];
      delete mastery[oldId];
      if (!Number.isFinite(practice) || practice <= 0) continue;
      const entry = byBase.get(recipe.baseId) ?? { family, total: 0, staged: 0, purpose: 0 };
      entry.total += practice;
      if (isStagedForge(recipe.id)) entry.staged = practice;
      if (recipe.purpose && skill === 'smithing') entry.purpose = Math.max(entry.purpose, practice);
      byBase.set(recipe.baseId, entry);
    }
  }
  for (const entry of byBase.values()) {
    // The old staged-forge migration copied the best purpose track onto the staged recipe.
    const practice = entry.total - Math.min(entry.staged, entry.purpose);
    const existing = mastery[entry.family];
    mastery[entry.family] = Math.min(MASTERY_CAP, (Number.isFinite(existing) ? Math.max(0, existing) : 0) + practice);
  }
}

export function settleForging(s: GameState): void {
  s.forging = { ...freshForging(), ...s.forging };
  const action = s.action;
  const staged = action?.kind === 'skill' && isStagedForge(action.actionId);
  const plan = s.forging.running;
  if (!staged || !plan || !forgeAction(s, action.actionId) || forgePlanBlocker(s, plan)) {
    if (staged) s.action = null;
    s.forging.running = null;
    s.forging.active = null;
  }
  if (!s.forging.patterns.some(({ id }) => id === s.forging.active)) s.forging.active = null;
  const owned = [...s.inventory, ...Object.values(s.equipment), ...s.storage.stash.flat(), ...s.storage.overflow].filter((item): item is Item => !!item);
  const singing = new Set(owned.filter((item) => item.forgeSinging).map(({ uid }) => uid));
  s.forging.pendingSinging = [...singing];
  const ownedUids = new Set(owned.map(({ uid }) => uid));
  s.forging.rack = s.forging.rack.filter((uid) => ownedUids.has(uid));
}
