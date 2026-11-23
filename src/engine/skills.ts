import { affixDef } from '../data/affixes';
import { essenceDef, fossilDef, modBias, resinDef, SHARD_CHANCE, SHARD_FOR } from '../data/craftMats';
import { ACTIVE_GEMS, gemReqLevel, SUPPORT_GEMS } from '../data/gems';
import { ALCH_DOUBLE, FORGE_ILVL } from '../data/hideout';
import { baseDef } from '../data/bases';
import { HERB_TIERS, ORB_TIERS } from '../data/skillTree';
import { actionDef, SKILLS, type SkillAction } from '../data/skills';
import { barGradeOf, barPurityBonus, smeltMetal } from '../data/smelting';
import { addBank, canAfford, hasItem, payResolvedCost, resolveRecipeCost } from './bank';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import type { Ctx } from './context';
import { benchBuilt } from './crafting';
import { flaskStats, newFlask, rerollMagic, stashFlask } from './flasks';
import { createSkillGem, createSupportGem } from './gems';
import { digDone } from './expedition';
import { codexDigSpeed } from './deciphering';
import { rollPrep } from './heist';
import { rollRogueRecruit } from './rogues';
import { cartographyDone, chartDone, hasChartMaps, specialMapDone } from './cartography';
import { focusMult, focusStep, takeDouble } from './minigame';
import { bagFull, dropItem } from './storage';
import { allMods, createItem, eligibleAffixes, salvageValue, spawnWeight } from './items';
import { chance, pick, pickWeighted, rInt, type Rng } from './rng';
import { skillTreeStats, type TreeStats } from './skillTree';
import type { Derived } from './stats';
import type { GameState, Item, RolledMod, SkillId, SmithCatalyst } from './types';
import { awardProfessionProgress, awardProtectedProgress, professionAccessReason, recordDiscovery } from './professions';
import { levelOf } from './xp';
import { globalMasteryBonuses, grantMasteryPractice, masteryConservation, masteryLevel, masterySpeed, masteryYield, stochasticRound, unlockedMilestones } from './skillingMastery';
import { settlePassivePoints } from './passives';
import { miningAccessHint, miningDone } from './mining';
import { delveActionSpec, delveStep, isDelveAction, startDelve } from './delve';
import { finishSmelt, smeltingBlocker, smeltingCost, smeltingInterval } from './smelting';
import { applyBarPurity, completeStagedForge, forgeAction, forgeActionBlocker, forgingSpeed, isStagedForge } from './forging';
import { rollCollectible } from './collectibles';
import { thievingZoneForLevel } from '../data/collectibles';
import { finishWoodcraft, runningWoodPlan, woodBias, woodCraftDials } from './woodcrafting';
import { catalogueSpeed, cutBlocker, cutCost, finishFacetedGem, roughForCut, runningCut, type CutSetup } from './gemFacets';
import { roughDropBundle, type RoughGem } from './roughGems';
import { giantCut, whetstoneSpeed, woodcuttingAccessHint } from './woodcutting';
import { createPurposeItem } from './smithing';
import { foragingDone } from './foraging';
import { finishQueuedInfusion, flawlessBarStack, GRAND_FLAWLESS_BARS, infusionQueueBlocker } from './alchemy';
import { weaponComponentProgress } from './weaponProjects';
import { gemFamilyPool, gemcuttingAccessHint, isGemEquipped, recycleGemExecution } from './gemcutting';
import { runecarvingAccessHint, runecarvingDone } from './runes';
import { astrologyBlocker, astrologyDone, astrologyOffline, astrologySpeed, astrologyXp, astrologyYield } from './astrology';

export function skillLevel(s: GameState, skill: SkillId): number {
  return levelOf(skill, s.skills[skill]);
}

export function grantXp(s: GameState, ctx: Ctx, skill: SkillId, amount: number): void {
  amount *= Math.max(ctx.event?.xp ?? 1, skill === 'combat' ? ctx.event?.combatXp ?? 1 : ctx.event?.gatheringXp ?? 1);
  const before = levelOf(skill, s.skills[skill]);
  s.skills[skill] += amount;
  ctx.emit({ t: 'xp', skill, amount });
  const after = levelOf(skill, s.skills[skill]);
  if (after > before) {
    if (skill === 'combat') settlePassivePoints(s);
    ctx.emit({ t: 'levelup', skill, level: after });
  }
}

/** How much slower a skill's keystone makes it (Motherlode, Grandmaster Smith, Transmuter). */
function keystoneSlow(skill: SkillId, t: TreeStats): number {
  if (skill === 'mining' && t.motherlode) return 1.3;
  if (skill === 'smithing' && t.grandmaster) return 1.25;
  if (skill === 'alchemy' && t.transmuter) return 1.2;
  if (skill === 'runecarving' && t.livingScript) return 1.25;
  if (skill === 'archaeology' && t.deepSurvey) return 1.25;
  if (skill === 'cooking' && t.headChef) return 1.25;
  if (skill === 'cartography' && t.masterCartographer) return 1.25;
  if (skill === 'gemcutting' && t.masterCutter) return 1.2;
  return 1;
}

const GATHERING_SET = new Set<SkillId>(['mining', 'woodcutting', 'harvesting', 'thieving', 'agility', 'archaeology', 'astrology']);
const PRODUCTION_SET = new Set<SkillId>(['smelting', 'smithing', 'woodcrafting', 'alchemy', 'gemcutting', 'runecarving', 'cooking', 'cartography']);

export function actionIntervalMs(s: GameState, a: SkillAction, d: Derived): number {
  a = delveActionSpec(s, a);
  if (s.action?.kind === 'skill' && s.action.actionId === a.id) a = forgeAction(s, a.id) ?? a;
  const t = skillTreeStats(s);
  const mealGathering = GATHERING_SET.has(a.skill) ? (d.gatheringSpeed ?? 0) : 0;
  const mealProduction = PRODUCTION_SET.has(a.skill) ? (d.productionSpeed ?? 0) : 0;
  let speed = d.skillSpeed + mealGathering + mealProduction + (t.skillSpeed ?? 0) + (t[`${a.skill}Speed` as keyof TreeStats] ?? 0) + (a.skill === 'thieving' ? (t['thieving.quickLift'] ?? 0) : 0) + masterySpeed(s, a.mastery) + astrologySpeed(s, a.skill);
  if (a.skill === 'archaeology') speed += codexDigSpeed(s);
  if (a.skill === 'smithing') speed += forgingSpeed(s);
  if (a.skill === 'gemcutting') speed += catalogueSpeed(s);
  if (a.woodcutting?.mode === 'giant') speed += whetstoneSpeed(s);
  const interval = a.skill === 'smelting' ? a.intervalMs * smeltingInterval(s, a) : a.intervalMs;
  return (interval / (1 + speed / 100)) * keystoneSlow(a.skill, t);
}

/** Manufacturing strength follows the profession and necessary station, independently of combat. */
export function smithIlvlCap(s: GameState): number {
  const lvl = s.account.hideout.forge ?? 1;
  return lvl >= 3 ? 90 : lvl === 2 ? 45 : 21;
}

/** Item level of a smithed base; `resin` is the bonus from a Resin in the catalyst slot. */
export function smithIlvl(s: GameState, resin = 0): number {
  const bonus = FORGE_ILVL[(s.account.hideout.forge ?? 1) - 1] + resin;
  return Math.min(smithIlvlCap(s), skillLevel(s, 'smithing') + bonus);
}

/** Item levels the selected Resin would add (0 when none is selected or you're out). */
export function resinBonus(s: GameState): number {
  const id = s.smithCatalyst.resin;
  if (!id || !hasItem(s, id, 1)) return 0;
  return resinDef(id)!.ilvl + (skillTreeStats(s).resinIlvl ?? 0);
}

export function setSmithCatalyst(s: GameState, patch: Partial<SmithCatalyst>): void {
  s.smithCatalyst = { ...s.smithCatalyst, ...patch };
}

const STATION_LABELS: Record<string, string> = {
  forge: 'Forge',
  smelter: 'Smelter',
  woodcrafting_bench: 'Woodcrafting Bench',
  alchemy_table: 'Alchemy Table',
};

/** The station level a production recipe needs; gathering only needs the skill level. */
export function stationLevelFor(a: SkillAction): { station: 'forge' | 'smelter' | 'woodcrafting_bench' | 'alchemy_table'; level: number } | null {
  if (a.forge) return { station: a.skill === 'smelting' ? 'smelter' : a.skill === 'woodcrafting' ? 'woodcrafting_bench' : 'forge', level: a.forge };
  if (a.alchemyTable) return { station: 'alchemy_table', level: a.alchemyTable };
  if (a.baseId) {
    const req = baseDef(a.baseId).reqLevel;
    const station = a.skill === 'woodcrafting' ? 'woodcrafting_bench' : 'forge';
    return { station, level: req < 10 ? 1 : req < 22 ? 2 : 3 };
  }
  if (a.skill === 'alchemy') return { station: 'alchemy_table', level: a.level < 10 ? 1 : a.level < 20 ? 2 : 3 };
  return null;
}

/** Where you still have to get to before this action opens, or null if you're there. */
/** A hidden gathering spot waits for its Agility level. */
export function agilityBlocker(s: GameState, a: SkillAction): string | null {
  return a.agility && skillLevel(s, 'agility') < a.agility ? `Requires Agility level ${a.agility}` : null;
}

export function actionPlaceNeeded(_s: GameState, _a: SkillAction): string | null {
  return null;
}

/** Do new bases go straight to Arcane Dust right now? Needs the bench, like any other salvage. */
function salvagesBases(s: GameState): boolean {
  const cat = s.smithCatalyst;
  return benchBuilt(s) && (cat.salvageAll || (cat.salvageFull && bagFull(s)));
}

export function actionBlocker(s: GameState, a: SkillAction, cut: CutSetup | null | undefined = runningCut(s, a)): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  if (a.soon) return 'Coming soon';
  const place = actionPlaceNeeded(s, a);
  if (place) return `Reach ${place} to unlock`;
  if (skillLevel(s, a.skill) < a.level) return `Requires ${SKILLS[a.skill].name} level ${a.level}`;
  const agility = agilityBlocker(s, a);
  if (agility) return agility;
  const astrology = astrologyBlocker(s, a);
  if (astrology) return astrology;
  if (a.batchMastery && masteryLevel(s, `task.${a.batchOf}`) < a.batchMastery) {
    return `Requires ${actionDef(a.batchOf!).name} mastery ${a.batchMastery}`;
  }
  // giants and the Sawmill depend on the lodge and the giant, not on accomplishments
  const wood = woodcuttingAccessHint(s, a);
  if (wood) return wood;
  if (a.accomplishments && !s.professionProgress.legacyAccess[a.id]) {
    const mining = miningAccessHint(s, a);
    if (mining) return mining;
    const gem = gemcuttingAccessHint(s, a);
    if (gem) return gem;
    const rune = runecarvingAccessHint(s, a);
    if (rune) return rune;
    const access = professionAccessReason(s, { skill: a.skill, level: a.level, accomplishments: a.accomplishments });
    if (access) return access;
  }
  const st = stationLevelFor(a);
  if (st && (s.account.hideout[st.station] ?? 1) < st.level) return `Needs ${STATION_LABELS[st.station] ?? st.station} level ${st.level}`;
  const furnace = a.skill === 'smelting' ? smeltingBlocker(s, a) : null;
  if (furnace) return furnace;
  const staged = isStagedForge(a.id);
  if (staged) {
    const forge = forgeActionBlocker(s, a);
    if (forge) return forge;
  }
  if (a.id === 'brew_infusion') {
    const infBlocker = infusionQueueBlocker(s);
    if (infBlocker) return infBlocker;
  }
  if (a.grandFlask && !flawlessBarStack(s, GRAND_FLAWLESS_BARS)) {
    return `Needs ${GRAND_FLAWLESS_BARS} Flawless bars of any metal`;
  }
  const nominalCost = a.skill === 'smelting' ? smeltingCost(s, a, a.inputs ?? {}) : a.inputs;
  if (a.skill === 'gemcutting' && a.inputs) {
    const blocker = cutBlocker(s, a, cut);
    if (blocker) return blocker;
  } else if ((nominalCost && !canAfford(s, nominalCost)) || !hasChartMaps(s, a)) return 'Missing materials';
  if (staged && bagFull(s)) return 'Inventory full';
  if (a.baseId && bagFull(s) && (a.purpose || !salvagesBases(s))) return 'Inventory full';
  if (a.id === 'recycle_gem') {
    if (s.selectedGemRecycleUid == null) return 'Select a gem to recycle';
    const gem = [...s.storage.gems, ...s.storage.supportGems].find((g) => g.uid === s.selectedGemRecycleUid);
    if (!gem) return 'Gem not found';
    if (isGemEquipped(s, s.selectedGemRecycleUid)) return 'Cannot recycle equipped gem';
  }
  if (a.gem) {
    if (a.gem.kind === 'family' && a.gem.family) {
      if (!gemFamilyPool(s, a.gem.family).length) return 'No eligible gems';
    } else if (a.gem.kind === 'skill' || a.gem.kind === 'support' || a.gem.kind === 'signature') {
      if (!gemCutPool(s, a.gem.kind).length) return 'No eligible gems';
    }
  }
  return null;
}

export function startSkillAction(s: GameState, ctx: Ctx, actionId: string, cut?: CutSetup): string | null {
  if (isDelveAction(actionId)) return startDelve(s, ctx, actionId === 'delve_push' ? 'push' : 'work');
  const a = forgeAction(s, actionId) ?? actionDef(actionId);
  const blocker = actionBlocker(s, a, cut ?? null);
  if (blocker) {
    ctx.emit({ t: 'info', text: blocker, tone: 'warn' });
    return blocker;
  }
  s.combat = null;
  s.heist.auto = null;
  if (!isStagedForge(actionId)) {
    s.forging.running = null;
    s.forging.active = null;
  }
  s.action = { kind: 'skill', actionId, progress: 0, ...(a.skill === 'gemcutting' && cut && { cut: { ...cut, draft: cut.draft?.slice(0, 5) } }) };
  return null;
}

export function stopAction(s: GameState): void {
  s.action = null;
  s.combat = null;
}

function give(s: GameState, outputs: Record<string, number>, id: string, n: number): void {
  const added = addBank(s, id, n);
  if (added > 0) outputs[id] = (outputs[id] ?? 0) + added;
}

/** Bulk Brewer: batch recipes cost this many times the single recipe instead of BATCH_INPUT_MULT. */
export const BULK_BREWER_MULT = 7.5;

/** Inputs to pay, after Steady Hands and Bulk Brewer. */
function inputsToPay(s: GameState, a: SkillAction, t: TreeStats, ctx: Ctx): Record<string, number> {
  if (!a.inputs) return {};
  if (a.batchMastery && a.gem) {
    // Keep per-gem discounts and minimum costs identical to crafting the singles.
    const cost: Record<string, number> = {};
    for (let i = 0; i < a.batch!; i++) {
      for (const [id, n] of Object.entries(inputsToPay(s, actionDef(a.batchOf!), t, ctx))) cost[id] = (cost[id] ?? 0) + n;
    }
    return cost;
  }
  if (a.protectedOutputs || (a.skill === 'archaeology' && a.purpose)) return { ...a.inputs };
  if (a.gem) {
    if (t.inputSave && chance(ctx.rng, t.inputSave / 100)) {
      return {
        ...(a.inputs.rough_gem ? { rough_gem: 1 } : {}),
        ...(a.inputs.arcane_dust ? { arcane_dust: 6 } : {}),
      };
    }
  } else if (t.inputSave && chance(ctx.rng, t.inputSave / 100)) return {};
  let cost: Record<string, number>;
  if (a.batchOf && !a.batchMastery && t.bulkBrewer) {
    const single = actionDef(a.batchOf).inputs!;
    cost = Object.fromEntries(Object.entries(single).map(([id, n]) => [id, Math.ceil(n * BULK_BREWER_MULT)]));
  } else cost = { ...a.inputs };
  if (a.skill === 'gemcutting') {
    if (cost.arcane_dust && t.gemDustSave) cost.arcane_dust = Math.ceil(cost.arcane_dust * (1 - t.gemDustSave / 100));
    if (cost.rough_gem && t.masterCutter) cost.rough_gem = Math.max(0, cost.rough_gem - 1);
    if (a.gem) {
      if (cost.rough_gem !== undefined) cost.rough_gem = Math.max(1, cost.rough_gem);
      if (cost.arcane_dust !== undefined) cost.arcane_dust = Math.max(6, cost.arcane_dust);
    }
  }
  if (a.skill === 'runecarving' && (s.account.hideout.rune_board ?? 1) >= 2) {
    for (const id of Object.keys(cost)) {
      if ((fossilDef(id) || essenceDef(id)) && chance(ctx.rng, 0.10)) {
        delete cost[id];
      }
    }
  }
  const rate = masteryConservation(s, a.mastery);
  for (const id of a.mastery?.ordinaryInputs ?? []) {
    const paid = cost[id] ?? 0;
    if (paid <= 0) continue;
    cost[id] = Math.max(0, paid - Math.min(paid, stochasticRound(ctx.rng, paid * rate)));
  }
  if (a.gem) {
    const dustMilestone = unlockedMilestones(s, a.mastery).find((m) => m.kind === 'dust_retention');
    const dustFloor = dustMilestone ? 4 : 6;
    if (cost.rough_gem !== undefined) cost.rough_gem = Math.max(1, cost.rough_gem);
    if (cost.arcane_dust !== undefined) cost.arcane_dust = Math.max(dustFloor, cost.arcane_dust);
  }
  return cost;
}

/** A catalyst you selected ran out: clear it and keep smithing without it. */
function catalystRanOut(s: GameState, ctx: Ctx, slot: 'fossil' | 'resin'): void {
  const id = s.smithCatalyst[slot]!;
  s.smithCatalyst = { ...s.smithCatalyst, [slot]: null };
  ctx.emit({ t: 'info', text: `Out of ${slot === 'fossil' ? fossilDef(id)?.name : resinDef(id)?.name}: smithing without it` });
}

export function rollForgeItemTier(forgeLvl: number, rng: Rng): 1 | 2 | 3 | 4 | 5 {
  if (forgeLvl >= 8) {
    const r = rng.next();
    if (r < 0.05) return 5;
    if (r < 0.20) return 4;
    if (r < 0.45) return 3;
    if (r < 0.75) return 2;
    return 1;
  }
  if (forgeLvl >= 7) {
    const r = rng.next();
    if (r < 0.10) return 4;
    if (r < 0.30) return 3;
    if (r < 0.60) return 2;
    return 1;
  }
  if (forgeLvl >= 6) {
    const r = rng.next();
    if (r < 0.10) return 3;
    if (r < 0.35) return 2;
    return 1;
  }
  return 1;
}

/** Smithing: the base, steered by the catalyst slot. Repeat-until stops the action on a hit. */
function smithBase(s: GameState, ctx: Ctx, a: SkillAction, t: TreeStats, purity: number, dials: number[], living: boolean): void {
  if (s.smithCatalyst.resin && !hasItem(s, s.smithCatalyst.resin, 1)) catalystRanOut(s, ctx, 'resin');
  if (s.smithCatalyst.fossil && !hasItem(s, s.smithCatalyst.fossil, 1)) catalystRanOut(s, ctx, 'fossil');
  const cat = s.smithCatalyst;
  const resin = resinBonus(s);
  const catSave = unlockedMilestones(s, a.mastery).find((m) => m.kind === 'catalyst_save');
  const savedResin = catSave && chance(ctx.rng, catSave.value);
  if (savedResin) ctx.emit({ t: 'masteryProc', proc: catSave.name, text: `✦ ${catSave.name}! Conserved resin`, taskName: a.name });
  if (cat.resin && !savedResin) s.storage.bank[cat.resin] -= 1;
  const magic = t.grandmaster || (t.smithMagic && chance(ctx.rng, t.smithMagic / 100));
  // the Fossil only matters (and is only used up) when the base comes out Magic
  const fossil = magic ? cat.fossil : null;
  const savedFossil = catSave && chance(ctx.rng, catSave.value);
  if (savedFossil && fossil) ctx.emit({ t: 'masteryProc', proc: catSave.name, text: `✦ ${catSave.name}! Conserved fossil`, taskName: a.name });
  const forgeLvl = s.account.hideout.forge ?? 1;
  const itemTier = rollForgeItemTier(forgeLvl, ctx.rng);
  const bias = woodBias(a.baseId!, dials, fossil ? modBias(fossil) : undefined);
  const item = createItem(s, a.baseId!, smithIlvl(s, resin), magic ? 'magic' : 'normal', ctx.rng, bias, itemTier);
  const t1Chance = forgeLvl >= 8 ? 0.25 : forgeLvl >= 7 ? 0.15 : forgeLvl >= 5 ? 0.10 : 0;
  if (t1Chance > 0 && chance(ctx.rng, t1Chance)) {
    item.rarity = item.rarity === 'normal' ? 'magic' : item.rarity;
    const kind = pick(ctx.rng, ['prefix', 'suffix'] as const);
    const pool = eligibleAffixes(item, kind, dials.some(Boolean) ? bias : undefined);
    if (pool.length) {
      const affix = dials.some(Boolean) ? pickWeighted(ctx.rng, pool, (f) => spawnWeight(f, baseDef(a.baseId!), bias))! : pick(ctx.rng, pool);
      const topIdx = affix.tiers.length - 1;
      const mod: RolledMod = {
        affixId: affix.id,
        tier: topIdx,
        values: affix.tiers[topIdx].ranges.map(([lo, hi]) => rInt(ctx.rng, lo, hi)),
      };
      (kind === 'prefix' ? item.prefixes : item.suffixes).push(mod);
    }
  }
  if (fossil && !savedFossil && !(t.steadyTemper && chance(ctx.rng, t.steadyTemper / 100))) s.storage.bank[fossil] -= 1;
  applyBarPurity(item, purity, ctx.rng);
  if (a.skill === 'woodcrafting') finishWoodcraft(s, ctx, item, dials, living);
  s.lifetime.itemsSmithed += 1;

  const repeating = cat.until && !!cat.fossil;
  if (repeating && fossil && fossilHit(item, fossil)) {
    // salvage toggles let a full bag get this far: the keeper waits on the ground instead
    const full = bagFull(s);
    if (full) dropItem(s, ctx, item);
    else {
      s.inventory.push(item);
      recordWorkshopItem(s, ctx, a, item);
    }
    ctx.emit({ t: 'loot', item });
    ctx.emit({ t: 'info', text: `${a.name} rolled a ${fossilDef(fossil)!.name} modifier. Stopped.${full ? ' Your bag is full, so it dropped on the ground.' : ''}`, tone: 'good' });
    s.action = null;
    return;
  }
  if ((repeating && cat.salvageMisses) || salvagesBases(s)) {
    addBank(s, 'arcane_dust', salvageValue(item));
    s.lifetime.salvaged += 1;
    ctx.emit({ t: 'loot', item, salvaged: true });
    return;
  }
  s.inventory.push(item);
  recordWorkshopItem(s, ctx, a, item);
  ctx.emit({ t: 'loot', item });
}

function recordWorkshopItem(s: GameState, ctx: Ctx, a: SkillAction, item: Item): void {
  if (!ctx.offline) return;
  if (a.skill === 'smithing') s.forging.rack.push(item.uid);
  if (a.skill === 'woodcrafting') s.woodcrafting.rack.push(item.uid);
}

/** Did a Fossil-steered roll land one of the Fossil's favoured modifiers? */
export function fossilHit(item: Item, fossilId: string): boolean {
  const more = fossilDef(fossilId)!.more;
  return allMods(item).some((m) => more.includes(affixDef(m.affixId).group));
}

/** Gemcutting: a random gem of the recipe's kind. Signature supports favour skills you own. */
export function gemCutPool(s: GameState, kind: 'skill' | 'support' | 'signature') {
  const findable = (id: string) => gemReqLevel(id) <= Math.max(1, skillLevel(s, 'gemcutting'));
  if (kind === 'skill') return ACTIVE_GEMS.filter((g) => findable(g.id));
  let pool = SUPPORT_GEMS.filter((g) => (kind === 'signature' ? !!g.signatureFor : !g.signatureFor) && findable(g.id));
  if (kind === 'signature') {
    const owned = new Set([...s.skillBar, ...s.storage.gems].filter(Boolean).map((g) => g!.gemId));
    const mine = pool.filter((g) => owned.has(g.signatureFor!));
    if (mine.length) pool = mine;
  }
  return pool;
}

function cutGem(s: GameState, ctx: Ctx, a: SkillAction, outputs: Record<string, number>, rough: RoughGem,
  draft: CutSetup['draft'], named: CutSetup['named']): void {
  const { kind, family, exactId } = a.gem!;
  const pool = kind === 'family' && family ? gemFamilyPool(s, family) : kind !== 'exact' && kind !== 'family' ? gemCutPool(s, kind) : [];
  const id = kind === 'exact' ? exactId : pool.length ? pick(ctx.rng, pool).id : undefined;
  if (!id) return;
  outputs[id] = (outputs[id] ?? 0) + 1;
  if (ACTIVE_GEMS.some((g) => g.id === id)) {
    const gem = createSkillGem(s, id);
    finishFacetedGem(s, ctx, a, gem, rough, draft, named);
    s.storage.gems.push(gem);
    ctx.emit({ t: 'loot', gemId: id });
  } else {
    const gem = createSupportGem(s, id);
    finishFacetedGem(s, ctx, a, gem, rough, draft, named);
    s.storage.supportGems.push(gem);
    ctx.emit({ t: 'loot', supportId: id });
  }
}

/** A cut on the current giant (Woodcutting, docs/WOODCUTTING_GIANTS.md): the giant decides what it makes. */
function completeGiantCut(s: GameState, ctx: Ctx, a: SkillAction, d: Derived, t: TreeStats, focusDouble: boolean): void {
  const cut = giantCut(s, ctx, focusDouble, t.resinChance ?? 0);
  const outputs: Record<string, number> = {};
  for (const [id, n] of Object.entries(cut.drops)) {
    give(s, outputs, id, n);
    if (id.endsWith('_log')) {
      s.lifetime.gathered += n;
      if (t.heartwood) give(s, outputs, 'arcane_dust', n);
    }
  }
  if (chance(ctx.rng, SHARD_CHANCE)) give(s, outputs, SHARD_FOR.woodcutting!, focusDouble ? 2 : 1);
  if (t.birdsNest && chance(ctx.rng, t.birdsNest / 100)) give(s, outputs, pick(ctx.rng, HERB_TIERS.slice(0, 2)), 1);
  // mastery in these woods: a small chance of an extra log that grows with the level, and the milestone perks
  const yieldChance = masteryYield(s, a.mastery);
  if (cut.log && yieldChance > 0 && chance(ctx.rng, yieldChance)) give(s, outputs, cut.log, 1);
  for (const m of unlockedMilestones(s, a.mastery)) {
    if (m.kind === 'vein_strike' && cut.log && chance(ctx.rng, m.value)) {
      give(s, outputs, cut.log, 1);
      ctx.emit({ t: 'masteryProc', proc: m.name, text: `✦ ${m.name}! Instant extra log`, taskName: a.name });
    }
  }
  ctx.emit({ t: 'produce', skill: a.skill, outputs });
  const heartwoodXp = t.heartwood ? 0.8 : 1;
  grantXp(s, ctx, a.skill, a.xp * (1 + (d.skillXp + (t.skillXp ?? 0)) / 100) * heartwoodXp * cut.xpUnits);
  grantMasteryPractice(s, a.mastery, a.intervalMs / 1000);
  awardProfessionProgress(s, a.skill, 1);
}

/** `focusDouble`: a mini-game double-zone hit, so everything this finish makes comes twice. */
function complete(s: GameState, ctx: Ctx, a: SkillAction, d: Derived, focusDouble = false, foreground = true): void {
  const t = skillTreeStats(s);
  if (a.woodcutting?.mode === 'giant') return completeGiantCut(s, ctx, a, d, t, focusDouble);
  const discounted = inputsToPay(s, a, t, ctx);
  const cut = runningCut(s, a);
  const rough = a.skill === 'gemcutting' ? roughForCut(s, a, cut) : undefined;
  const livingWood = runningWoodPlan(s, a)?.living;
  if (livingWood) discounted[livingWood] = 1;
  const alloy = isStagedForge(a.id) ? s.forging.running?.alloy : undefined;
  if (alloy) discounted[alloy] = 1;
  const cost = a.skill === 'gemcutting' ? cutCost(s, a, discounted, cut, rough)
    : resolveRecipeCost(s, a.skill === 'smelting' ? smeltingCost(s, a, discounted) : discounted);
  if (!cost) return;
  payResolvedCost(s, cost);
  const dials = woodCraftDials(s, ctx, a);
  const outputs: Record<string, number> = {};
  if (a.id === 'recycle_gem') {
    recycleGemExecution(s, ctx, outputs);
    return;
  }
  const twoForOne = a.skill === 'runecarving' ? t.secondStroke : a.skill === 'cooking' ? t.secondHelping : a.skill === 'cartography' ? t.secondCopy : 0;
  const alchLvl = s.account.hideout.alchemy_table ?? 1;
  const double = a.skill === 'alchemy' ? chance(ctx.rng, ALCH_DOUBLE[alchLvl - 1]) : !!twoForOne && chance(ctx.rng, twoForOne / 100);
  const focusMultiple = focusDouble ? 2 : 1;
  const mult = (double ? 2 : 1) * focusMultiple;
  const miningOutput = foreground ? miningDone(s, ctx, a) : {};
  foragingDone(s, ctx, a, foreground);
  astrologyDone(s, ctx, a, focusMultiple);
  if (foreground) cartographyDone(s, ctx, a);
  if (foreground) weaponComponentProgress(s, ctx, a);
  if (foreground) runecarvingDone(s, ctx, a);

  if (a.skill === 'alchemy' && alchLvl >= 7 && chance(ctx.rng, 0.15)) {
    for (const [id, n] of Object.entries(cost)) {
      addBank(s, id, n);
    }
    ctx.emit({ t: 'info', text: 'Transmutative Mastery: refunded ingredients!', tone: 'good' });
  }

  // alternate nodes trade some of their base material for a better secondary
  const yields = a.outputChance === undefined || chance(ctx.rng, a.outputChance);
  const markGoldMult = a.skill === 'thieving' ? (1 + (t['thieving.deepPockets'] ?? 0) / 100) * (t['bridge.inside_job'] ? 0.75 : 1) : 1;
  for (const [id, n] of Object.entries(yields ? { ...a.outputs, ...miningOutput } : {})) {
    let qty = n * mult;
    qty += stochasticRound(ctx.rng, (qty * astrologyYield(s, a.skill)) / 100);
    if (a.skill === 'mining' && id.endsWith('_ore') && t.motherlode) qty *= 2;
    if (id === a.mastery?.primaryOutput) qty += stochasticRound(ctx.rng, n * masteryYield(s, a.mastery));
    if (a.skill === 'thieving' && id === 'gold' && markGoldMult !== 1) qty = Math.max(1, Math.round(qty * markGoldMult));
    // Transmuter / Alchemy table L8: crafted orbs sometimes come out one tier higher
    const tier = ORB_TIERS.indexOf(id);
    const alchElevate = a.skill === 'alchemy' && alchLvl >= 8 && chance(ctx.rng, 0.1);
    const outId = tier >= 0 && tier < ORB_TIERS.length - 1 && ((t.transmuter && chance(ctx.rng, t.transmuter / 100)) || alchElevate) ? ORB_TIERS[tier + 1] : id;
    const graded = a.skill === 'smelting' && smeltMetal(a.batchOf ?? a.id)
      ? finishSmelt(s, ctx, a, qty - n * (focusMultiple - 1), focusDouble)
      : null;
    if (graded) Object.assign(outputs, graded);
    else if (outId === 'rough_gem') {
      for (const [roughId, amount] of Object.entries(roughDropBundle(s, ctx, qty))) give(s, outputs, roughId, amount);
    } else give(s, outputs, outId, qty);
    if (a.skill === 'mining' || a.skill === 'woodcutting' || a.skill === 'harvesting') s.lifetime.gathered += qty;
    if (a.skill === 'woodcutting' && t.heartwood) give(s, outputs, 'arcane_dust', qty);
    const herb = HERB_TIERS.indexOf(id);
    if (herb >= 0 && herb < HERB_TIERS.length - 1 && t.rareBlooms && chance(ctx.rng, t.rareBlooms / 100)) give(s, outputs, HERB_TIERS[herb + 1], 1);
  }
  for (const b of a.bonus ?? []) {
    const boost = b.id === 'rough_gem' ? t.gemChance : fossilDef(b.id) ? t.fossilChance : resinDef(b.id) ? t.resinChance : 0;
    if (!chance(ctx.rng, b.chance * (1 + (boost ?? 0) / 100))) continue;
    const upgrade = essenceDef(b.id)?.upgrade;
    if (b.id === 'rough_gem') {
      for (const [roughId, amount] of Object.entries(roughDropBundle(s, ctx, b.qty * focusMultiple))) give(s, outputs, roughId, amount);
    } else give(s, outputs, upgrade && t.distiller && chance(ctx.rng, t.distiller / 100) ? upgrade : b.id, b.qty * focusMultiple);
  }
  if (a.skill === 'woodcutting' && t.birdsNest && chance(ctx.rng, t.birdsNest / 100)) give(s, outputs, pick(ctx.rng, HERB_TIERS.slice(0, 2)), 1);

  // Thematic Mastery Milestone Procs
  const milestones = unlockedMilestones(s, a.mastery);
  for (const m of milestones) {
    if (m.kind === 'vein_strike' && chance(ctx.rng, m.value)) {
      const primary = a.mastery?.primaryOutput;
      if (primary) {
        give(s, outputs, primary, 1);
        ctx.emit({ t: 'masteryProc', proc: m.name, text: `✦ ${m.name}! Instant extra strike`, taskName: a.name });
      }
    } else if (m.kind === 'rare_find' && m.outputId && chance(ctx.rng, m.value)) {
      if (m.outputId === 'rough_gem') {
        for (const [roughId, amount] of Object.entries(roughDropBundle(s, ctx, 1))) give(s, outputs, roughId, amount);
      } else give(s, outputs, m.outputId, 1);
      ctx.emit({ t: 'masteryProc', proc: m.name, text: `✦ ${m.name}! Rare discovery`, taskName: a.name });
    } else if (m.kind === 'sleight_of_hand' && chance(ctx.rng, m.value)) {
      const gold = outputs.gold ?? 0;
      if (gold > 0) {
        give(s, outputs, 'gold', gold);
        ctx.emit({ t: 'masteryProc', proc: m.name, text: `✦ ${m.name}! Pickpocket jackpot`, taskName: a.name });
      }
    } else if (m.kind === 'smuggled_stash' && chance(ctx.rng, m.value)) {
      rollPrep(s, ctx, a);
      ctx.emit({ t: 'masteryProc', proc: m.name, text: `✦ ${m.name}! Extra prep chance`, taskName: a.name });
    } else if (m.kind === 'feast_bounty' && chance(ctx.rng, m.value)) {
      const grade = a.skill === 'smelting' && Object.keys(outputs).find(barGradeOf);
      const extra = grade ? { [grade]: a.batch ?? 1 } : (a.outputs ?? {});
      for (const [outId, outCount] of Object.entries(extra)) {
        give(s, outputs, outId, outCount);
      }
      ctx.emit({ t: 'masteryProc', proc: m.name, text: `✦ ${m.name}! Double yield`, taskName: a.name });
    } else if (m.kind === 'glyph_echo' && chance(ctx.rng, m.value)) {
      if (m.id.includes('echo')) {
        awardProtectedProgress(s, ctx, 'inscription_fragment', 1);
        give(s, outputs, 'inscription_fragment', 1);
        ctx.emit({ t: 'masteryProc', proc: m.name, text: `✦ ${m.name}! Inscription fragment`, taskName: a.name });
      } else {
        for (const [outId, outCount] of Object.entries(a.outputs ?? {})) {
          give(s, outputs, outId, outCount);
        }
        ctx.emit({ t: 'masteryProc', proc: m.name, text: `✦ ${m.name}! Double rune carved`, taskName: a.name });
      }
    } else if (m.kind === 'flawless_facet' && chance(ctx.rng, m.value)) {
      for (const [outId, outCount] of Object.entries(a.outputs ?? {})) {
        give(s, outputs, outId, outCount);
      }
      ctx.emit({ t: 'masteryProc', proc: m.name, text: `✦ ${m.name}! Flawless facet cut`, taskName: a.name });
    }
  }

  if (a.skill === 'archaeology') digDone(s, ctx, a, outputs);
  if (a.chart) chartDone(s, a, mult, Object.keys(cost).length > 0, outputs);
  if (a.specialMap) specialMapDone(s, ctx, a, mult);
  if (a.skill === 'thieving') {
    s.professionProgress.counters['thieving.markers'] = (s.professionProgress.counters['thieving.markers'] ?? 0) + 1;
    rollPrep(s, ctx, a);
    rollRogueRecruit(s, ctx);
    rollCollectible(s, ctx, 'thieving', thievingZoneForLevel(a.level));
  }

  // a doubled base is a second full base, catalysts and all; a Craft-until stop on the first ends it there
  if (isStagedForge(a.id)) {
    if (s.smithCatalyst.resin && !hasItem(s, s.smithCatalyst.resin, 1)) catalystRanOut(s, ctx, 'resin');
    if (s.smithCatalyst.fossil && !hasItem(s, s.smithCatalyst.fossil, 1)) catalystRanOut(s, ctx, 'fossil');
    const { resin, fossil } = s.smithCatalyst;
    const ilvl = smithIlvl(s, resinBonus(s));
    const conservation = unlockedMilestones(s, a.mastery).find((m) => m.kind === 'catalyst_save');
    if (resin && !(conservation && chance(ctx.rng, conservation.value))) payResolvedCost(s, { [resin]: 1 });
    if (fossil && !(conservation && chance(ctx.rng, conservation.value)) && !(t.steadyTemper && chance(ctx.rng, t.steadyTemper / 100))) {
      payResolvedCost(s, { [fossil]: 1 });
    }
    completeStagedForge(s, ctx, a, {
      ilvl,
      itemTier: rollForgeItemTier(s.account.hideout.forge ?? 1, ctx.rng),
      fossilBias: fossil ? modBias(fossil) : undefined,
      purity: barPurityBonus(cost),
      focusMultiple,
    });
  } else if (a.purpose) {
    const item = createPurposeItem(s, a, a.skill === 'archaeology' ? Math.min(45, skillLevel(s, 'archaeology')) : smithIlvl(s), ctx.rng, woodBias(a.baseId!, dials));
    if (a.skill === 'smithing' || a.skill === 'woodcrafting') applyBarPurity(item, barPurityBonus(cost), ctx.rng);
    if (a.skill === 'woodcrafting') finishWoodcraft(s, ctx, item, dials, !!livingWood);
    s.inventory.push(item);
    recordWorkshopItem(s, ctx, a, item);
    s.lifetime.itemsSmithed += 1;
    ctx.emit({ t: 'loot', item });
    ctx.emit({ t: 'info', text: `${a.name}: guaranteed equipment complete. Stopped.`, tone: 'good' });
    s.action = null;
  } else if (a.baseId) for (let i = 0; i < focusMultiple && s.action?.kind === 'skill'; i++) {
    if (i > 0 && bagFull(s) && !salvagesBases(s)) {
      ctx.emit({ t: 'info', text: `${a.name}: extra equipment suppressed because inventory is full`, tone: 'warn' });
      break;
    }
    smithBase(s, ctx, a, t, barPurityBonus(cost), dials, !!livingWood);
  }
  if (a.flaskId) {
    const flaskCount = mult * (a.batchMastery ? a.batch! : 1);
    s.lifetime.flasksBrewed += flaskCount;
    const chargesMilestone = unlockedMilestones(s, a.mastery).find((m) => m.kind === 'flask_charges');
    const durMilestone = unlockedMilestones(s, a.mastery).find((m) => m.kind === 'flask_duration');
    const globalCharges = globalMasteryBonuses(s, 'alchemy').extra.flask_charges ?? 0;
    const extraCharges = (chargesMilestone ? chargesMilestone.value : 0) + globalCharges;
    const extraDuration = durMilestone ? durMilestone.value : 0;
    for (let i = 0; i < flaskCount; i++) {
      const f = newFlask(s, a.flaskId, skillLevel(s, 'alchemy'), !!a.grandFlask);
      if (t.qualityBrews && chance(ctx.rng, t.qualityBrews / 100)) {
        f.rarity = 'magic';
        rerollMagic(f, ctx.rng);
      }
      if (extraCharges > 0) f.extraCharges = extraCharges;
      if (extraDuration > 0) f.extraDurationPct = extraDuration;
      f.charges = flaskStats(f).maxCharges;
      stashFlask(s, f);
    }
    outputs[a.flaskId] = flaskCount;
  }
  if (a.gem && rough) {
    const draft = ctx.offline ? undefined : cut?.draft;
    if (cut) delete cut.draft;
    for (let i = 0; i < focusMultiple * (a.batchMastery ? a.batch! : 1); i++) cutGem(s, ctx, a, outputs, rough, draft, cut?.named);
  }
  ctx.emit({ t: 'produce', skill: a.skill, outputs, baseId: a.baseId });
  if (a.skill === 'smelting') rollCollectible(s, ctx, 'smelting', 'furnace');
  if (a.skill === 'smithing') rollCollectible(s, ctx, 'smithing', 'forge');
  if (a.skill === 'woodcrafting') rollCollectible(s, ctx, 'woodcrafting', 'workbench');
  if (a.skill === 'gemcutting') rollCollectible(s, ctx, 'gemcutting', 'wheel');
  if (a.skill === 'alchemy') rollCollectible(s, ctx, 'alchemy', 'bench');
  if (a.skill === 'cartography') rollCollectible(s, ctx, 'cartography', 'table');
  if (a.id === 'brew_infusion') finishQueuedInfusion(s, ctx);
  if (a.grandFlask) {
    const barId = flawlessBarStack(s, GRAND_FLAWLESS_BARS);
    if (!barId) { s.action = null; return; }
    payResolvedCost(s, { [barId]: GRAND_FLAWLESS_BARS });
  }
  const heartwoodXp = a.skill === 'woodcutting' && t.heartwood ? 0.8 : 1;
  const branchXp = a.skill === 'gemcutting' ? (t.gemcuttingXp ?? 0) : 0;
  grantXp(s, ctx, a.skill, a.xp * (1 + (d.skillXp + (t.skillXp ?? 0) + branchXp + astrologyXp(s)) / 100) * heartwoodXp);
  grantMasteryPractice(s, a.mastery, a.intervalMs / 1000);
  if (foreground) {
    awardProfessionProgress(s, a.skill, a.batch ?? (a.chart?.qty ?? 1));
    for (const [id, n] of Object.entries(a.protectedOutputs ?? {})) awardProtectedProgress(s, ctx, id, n);
    if (a.discovery) recordDiscovery(s, ctx, a.discovery);
  }
}

export function skillStep(s: GameState, ctx: Ctx, dt: number, d: Derived): void {
  if (s.action?.kind !== 'skill') return;
  if (isDelveAction(s.action.actionId)) return delveStep(s, ctx, dt, d);
  let a = forgeAction(s, s.action.actionId) ?? actionDef(s.action.actionId);
  let interval = actionIntervalMs(s, a, d);
  // Overtime: skilling is faster while you're away
  const offlineBoost = ctx.offline ? 1 + ((skillTreeStats(s).offlineSpeed ?? 0) + astrologyOffline(s)) / 100 : 1;
  focusStep(s, ctx, dt);
  s.action.progress += dt * offlineBoost * focusMult(s) * (ctx.event?.gatheringSpeed ?? 1);
  while (s.action && s.action.kind === 'skill' && s.action.progress >= interval) {
    const living = runningWoodPlan(s, a)?.living;
    const blocker = actionBlocker(s, a) ?? (living && !canAfford(s, { ...a.inputs, [living]: 1 }) ? 'Missing living wood' : null);
    if (blocker) {
      ctx.emit({ t: 'info', text: `${a.name}: ${blocker}. Stopped.`, tone: 'warn' });
      s.action = null;
      return;
    }
    s.action.progress -= interval;
    complete(s, ctx, a, d, takeDouble(s, ctx));
    // cracking a glyph can speed the next dig up, however the time was chunked
    if (a.skill === 'archaeology') interval = actionIntervalMs(s, a, d);
    // the next giant can stand in another region, with its own wood and pace
    if (s.action?.kind === 'skill' && s.action.actionId !== a.id) {
      a = forgeAction(s, s.action.actionId) ?? actionDef(s.action.actionId);
      interval = actionIntervalMs(s, a, d);
    }
  }
}
