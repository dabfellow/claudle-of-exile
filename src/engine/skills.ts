import { affixDef } from '../data/affixes';
import { essenceDef, fossilDef, MARKER, modBias, resinDef } from '../data/craftMats';
import { flaskDef } from '../data/flasks';
import { ACTIVE_GEMS, gemReqLevel, SUPPORT_GEMS } from '../data/gems';
import { ALCH_DOUBLE, FORGE_ILVL } from '../data/hideout';
import { baseDef } from '../data/bases';
import { HERB_TIERS, ORB_TIERS } from '../data/skillTree';
import { actionDef, SKILLS, type SkillAction } from '../data/skills';
import { actOpen, ZONES, zoneDef } from '../data/zones';
import { addBank, canAfford, hasItem, payCost } from './bank';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import type { Ctx } from './context';
import { benchBuilt } from './crafting';
import { newFlask, rerollMagic, stashFlask } from './flasks';
import { createSkillGem, createSupportGem } from './gems';
import { digDone } from './expedition';
import { markerBoost } from './heist';
import { chartDone, hasChartMaps } from './cartography';
import { focusMult, focusStep, takeDouble } from './minigame';
import { bagFull, dropItem } from './storage';
import { allMods, createItem, eligibleAffixes, salvageValue } from './items';
import { gemArrived } from './progress';
import { chance, pick, rInt } from './rng';
import { skillTreeStats, type TreeStats } from './skillTree';
import type { Derived } from './stats';
import type { GameState, Item, RolledMod, SkillId, SmithCatalyst } from './types';
import { characterLevel } from './character';
import { levelOf } from './xp';
import { grantMasteryPractice, masteryConservation, masterySpeed, masteryYield, stochasticRound } from './skillingMastery';
import { settlePassivePoints } from './passives';

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

export function actionIntervalMs(s: GameState, a: SkillAction, d: Derived): number {
  const t = skillTreeStats(s);
  let speed = d.skillSpeed + (t.skillSpeed ?? 0) + (t[`${a.skill}Speed` as keyof TreeStats] ?? 0) + masterySpeed(s, a.mastery);
  return (a.intervalMs / (1 + speed / 100)) * keystoneSlow(a.skill, t);
}

/** Smithed gear can't out-level the campaign: capped at the top level of your furthest unlocked area (or 84 at Forge L5+). */
export function smithIlvlCap(s: GameState): number {
  const baseCap = Math.max(...ZONES.filter((z) => s.unlockedZones.includes(z.id) && actOpen(z.act)).map((z) => z.levelRange[1]));
  return (s.account.hideout.forge ?? 1) >= 5 ? Math.max(84, baseCap) : baseCap;
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

/** The Forge or Alchemy Table level a production recipe needs; gathering only needs the skill level. */
export function stationLevelFor(a: SkillAction): { station: 'forge' | 'alchemy_table'; level: number } | null {
  if (a.baseId) {
    const req = baseDef(a.baseId).reqLevel;
    return { station: 'forge', level: req < 10 ? 1 : req < 22 ? 2 : 3 };
  }
  if (a.skill === 'alchemy') return { station: 'alchemy_table', level: a.level < 10 ? 1 : a.level < 20 ? 2 : 3 };
  return null;
}

/** Where you still have to get to before this action opens, or null if you're there. */
export function actionPlaceNeeded(s: GameState, a: SkillAction): string | null {
  if (a.area && !s.unlockedZones.includes(a.area)) return zoneDef(a.area).name;
  if (a.gate && !s.unlockedZones.includes(a.gate.zone)) return a.gate.label;
  return null;
}

/** Do new bases go straight to Arcane Dust right now? Needs the bench, like any other salvage. */
function salvagesBases(s: GameState): boolean {
  const cat = s.smithCatalyst;
  return benchBuilt(s) && (cat.salvageAll || (cat.salvageFull && bagFull(s)));
}

export function actionBlocker(s: GameState, a: SkillAction): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  if (a.soon) return 'Coming soon';
  const place = actionPlaceNeeded(s, a);
  if (place) return `Reach ${place} to unlock`;
  if (skillLevel(s, a.skill) < a.level) return `Requires ${SKILLS[a.skill].name} level ${a.level}`;
  const st = stationLevelFor(a);
  if (st && (s.account.hideout[st.station] ?? 1) < st.level) return `Needs ${st.station === 'forge' ? 'Forge' : 'Alchemy Table'} level ${st.level}`;
  if ((a.inputs && !canAfford(s, a.inputs)) || !hasChartMaps(s, a)) return 'Missing materials';
  if (a.baseId && bagFull(s) && !salvagesBases(s)) return 'Inventory full';
  return null;
}

export function startSkillAction(s: GameState, ctx: Ctx, actionId: string): string | null {
  const a = actionDef(actionId);
  const blocker = actionBlocker(s, a);
  if (blocker) {
    ctx.emit({ t: 'info', text: blocker, tone: 'warn' });
    return blocker;
  }
  s.combat = null;
  s.heist.auto = null;
  s.action = { kind: 'skill', actionId, progress: 0 };
  // Greenhouse remembers the last Foraging spot so it can keep growing in the background
  if (a.skill === 'harvesting') s.greenhouse = { actionId, progress: 0 };
  return null;
}

export function stopAction(s: GameState): void {
  s.action = null;
  s.combat = null;
}

function give(s: GameState, outputs: Record<string, number>, id: string, n: number): void {
  addBank(s, id, n);
  outputs[id] = (outputs[id] ?? 0) + n;
}

/** Bulk Brewer: batch recipes cost this many times the single recipe instead of BATCH_INPUT_MULT. */
export const BULK_BREWER_MULT = 7.5;

/** Inputs to pay, after Steady Hands and Bulk Brewer. */
function inputsToPay(s: GameState, a: SkillAction, t: TreeStats, ctx: Ctx): Record<string, number> {
  if (!a.inputs) return {};
  if (t.inputSave && chance(ctx.rng, t.inputSave / 100)) return {};
  let cost: Record<string, number>;
  if (a.batchOf && t.bulkBrewer) {
    const single = actionDef(a.batchOf).inputs!;
    cost = Object.fromEntries(Object.entries(single).map(([id, n]) => [id, Math.ceil(n * BULK_BREWER_MULT)]));
  } else cost = { ...a.inputs };
  if (a.skill === 'gemcutting') {
    if (cost.arcane_dust && t.gemDustSave) cost.arcane_dust = Math.ceil(cost.arcane_dust * (1 - t.gemDustSave / 100));
    if (cost.rough_gem && t.masterCutter) cost.rough_gem = Math.max(0, cost.rough_gem - 1);
  }
  const rate = masteryConservation(s, a.mastery);
  for (const id of a.mastery?.ordinaryInputs ?? []) {
    const paid = cost[id] ?? 0;
    if (paid <= 0) continue;
    cost[id] = Math.max(0, paid - Math.min(paid, stochasticRound(ctx.rng, paid * rate)));
  }
  return cost;
}

/** A catalyst you selected ran out: clear it and keep smithing without it. */
function catalystRanOut(s: GameState, ctx: Ctx, slot: 'fossil' | 'resin'): void {
  const id = s.smithCatalyst[slot]!;
  s.smithCatalyst = { ...s.smithCatalyst, [slot]: null };
  ctx.emit({ t: 'info', text: `Out of ${slot === 'fossil' ? fossilDef(id)?.name : resinDef(id)?.name}: smithing without it` });
}

/** Smithing: the base, steered by the catalyst slot. Repeat-until stops the action on a hit. */
function smithBase(s: GameState, ctx: Ctx, a: SkillAction, t: TreeStats): void {
  if (s.smithCatalyst.resin && !hasItem(s, s.smithCatalyst.resin, 1)) catalystRanOut(s, ctx, 'resin');
  if (s.smithCatalyst.fossil && !hasItem(s, s.smithCatalyst.fossil, 1)) catalystRanOut(s, ctx, 'fossil');
  const cat = s.smithCatalyst;
  const resin = resinBonus(s);
  if (cat.resin) s.account.bank[cat.resin] -= 1;
  const magic = t.grandmaster || (t.smithMagic && chance(ctx.rng, t.smithMagic / 100));
  // the Fossil only matters (and is only used up) when the base comes out Magic
  const fossil = magic ? cat.fossil : null;
  const item = createItem(s, a.baseId!, smithIlvl(s, resin), magic ? 'magic' : 'normal', ctx.rng, fossil ? modBias(fossil) : undefined);
  const forgeLvl = s.account.hideout.forge ?? 1;
  if (forgeLvl >= 5 && chance(ctx.rng, 0.1)) {
    item.rarity = item.rarity === 'normal' ? 'magic' : item.rarity;
    const kind = pick(ctx.rng, ['prefix', 'suffix'] as const);
    const pool = eligibleAffixes(item, kind);
    if (pool.length) {
      const affix = pick(ctx.rng, pool);
      const topIdx = affix.tiers.length - 1;
      const mod: RolledMod = {
        affixId: affix.id,
        tier: topIdx,
        values: affix.tiers[topIdx].ranges.map(([lo, hi]) => rInt(ctx.rng, lo, hi)),
      };
      (kind === 'prefix' ? item.prefixes : item.suffixes).push(mod);
    }
  }
  if (fossil && !(t.steadyTemper && chance(ctx.rng, t.steadyTemper / 100))) s.account.bank[fossil] -= 1;
  s.lifetime.itemsSmithed += 1;

  const repeating = cat.until && !!cat.fossil;
  if (repeating && fossil && fossilHit(item, fossil)) {
    // salvage toggles let a full bag get this far: the keeper waits on the ground instead
    const full = bagFull(s);
    if (full) dropItem(s, ctx, item);
    else s.inventory.push(item);
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
  ctx.emit({ t: 'loot', item });
}

/** Did a Fossil-steered roll land one of the Fossil's favoured modifiers? */
export function fossilHit(item: Item, fossilId: string): boolean {
  const more = fossilDef(fossilId)!.more;
  return allMods(item).some((m) => more.includes(affixDef(m.affixId).group));
}

/** Gemcutting: a random gem of the recipe's kind. Signature supports favour skills you own. */
function cutGem(s: GameState, ctx: Ctx, a: SkillAction, outputs: Record<string, number>): void {
  const { kind } = a.gem!;
  const findable = (id: string) => gemReqLevel(id) <= characterLevel(s) && gemArrived(s, id);
  if (kind === 'skill') {
    const def = pick(ctx.rng, ACTIVE_GEMS.filter((g) => findable(g.id)));
    s.account.gems.push(createSkillGem(s, def.id));
    outputs[def.id] = (outputs[def.id] ?? 0) + 1;
    ctx.emit({ t: 'loot', gemId: def.id });
    return;
  }
  // only gems you're high enough level to use; signatures you can't use yet fall back to any you can
  let pool = SUPPORT_GEMS.filter((g) => (kind === 'signature' ? !!g.signatureFor : !g.signatureFor) && findable(g.id));
  if (!pool.length) pool = SUPPORT_GEMS.filter((g) => !g.signatureFor && findable(g.id));
  if (kind === 'signature') {
    const owned = new Set([...s.skillBar, ...s.account.gems].filter(Boolean).map((g) => g!.gemId));
    const mine = pool.filter((g) => owned.has(g.signatureFor!));
    if (mine.length) pool = mine;
  }
  const def = pick(ctx.rng, pool);
  s.account.supportGems.push(createSupportGem(s, def.id));
  outputs[def.id] = (outputs[def.id] ?? 0) + 1;
  ctx.emit({ t: 'loot', supportId: def.id });
}

/** `focusDouble`: a mini-game double-zone hit, so everything this finish makes comes twice. */
function complete(s: GameState, ctx: Ctx, a: SkillAction, d: Derived, focusDouble = false): void {
  const t = skillTreeStats(s);
  const cost = inputsToPay(s, a, t, ctx);
  payCost(s, cost);
  const outputs: Record<string, number> = {};
  const twoForOne = a.skill === 'runecarving' ? t.secondStroke : a.skill === 'cooking' ? t.secondHelping : a.skill === 'cartography' ? t.secondCopy : 0;
  const double = a.skill === 'alchemy' ? chance(ctx.rng, ALCH_DOUBLE[(s.account.hideout.alchemy_table ?? 1) - 1]) : !!twoForOne && chance(ctx.rng, twoForOne / 100);
  const focusMultiple = focusDouble ? 2 : 1;
  const mult = (double ? 2 : 1) * focusMultiple;

  // alternate nodes trade some of their base material for a better secondary
  const yields = a.outputChance === undefined || chance(ctx.rng, a.outputChance);
  for (const [id, n] of Object.entries(yields ? (a.outputs ?? {}) : {})) {
    let qty = n * mult;
    if (a.skill === 'mining' && id.endsWith('_ore') && t.motherlode) qty *= 2;
    if (id === a.mastery?.primaryOutput) qty += stochasticRound(ctx.rng, n * masteryYield(s, a.mastery));
    // Transmuter: crafted orbs sometimes come out one tier higher
    const tier = ORB_TIERS.indexOf(id);
    const outId = tier >= 0 && tier < ORB_TIERS.length - 1 && t.transmuter && chance(ctx.rng, t.transmuter / 100) ? ORB_TIERS[tier + 1] : id;
    give(s, outputs, outId, qty);
    if (a.skill === 'mining' || a.skill === 'woodcutting' || a.skill === 'harvesting') s.lifetime.gathered += qty;
    if (a.skill === 'woodcutting' && t.heartwood) give(s, outputs, 'arcane_dust', qty);
    const herb = HERB_TIERS.indexOf(id);
    if (herb >= 0 && herb < HERB_TIERS.length - 1 && t.rareBlooms && chance(ctx.rng, t.rareBlooms / 100)) give(s, outputs, HERB_TIERS[herb + 1], 1);
  }
  for (const b of a.bonus ?? []) {
    const boost = b.id === 'rough_gem' ? t.gemChance : fossilDef(b.id) ? t.fossilChance : resinDef(b.id) ? t.resinChance : b.id === MARKER ? markerBoost(s) : 0;
    if (!chance(ctx.rng, b.chance * (1 + (boost ?? 0) / 100))) continue;
    const upgrade = essenceDef(b.id)?.upgrade;
    give(s, outputs, upgrade && t.distiller && chance(ctx.rng, t.distiller / 100) ? upgrade : b.id, b.qty * focusMultiple);
  }
  if (a.skill === 'woodcutting' && t.birdsNest && chance(ctx.rng, t.birdsNest / 100)) give(s, outputs, pick(ctx.rng, HERB_TIERS.slice(0, 2)), 1);

  if (a.skill === 'archaeology') digDone(s, ctx, a, outputs);
  if (a.chart) chartDone(s, a, mult, Object.keys(cost).length > 0, outputs);

  // a doubled base is a second full base, catalysts and all; a Craft-until stop on the first ends it there
  if (a.baseId) for (let i = 0; i < focusMultiple && s.action?.kind === 'skill'; i++) smithBase(s, ctx, a, t);
  if (a.flaskId) {
    s.lifetime.flasksBrewed += mult;
    for (let i = 0; i < mult; i++) {
      const f = newFlask(s, a.flaskId, skillLevel(s, 'alchemy'));
      if (t.qualityBrews && chance(ctx.rng, t.qualityBrews / 100)) {
        f.rarity = 'magic';
        rerollMagic(f, ctx.rng);
      }
      f.charges = flaskDef(a.flaskId).maxCharges;
      stashFlask(s, f);
    }
    outputs[a.flaskId] = mult;
  }
  if (a.gem) for (let i = 0; i < focusMultiple; i++) cutGem(s, ctx, a, outputs);
  ctx.emit({ t: 'produce', skill: a.skill, outputs, baseId: a.baseId });
  const heartwoodXp = a.skill === 'woodcutting' && t.heartwood ? 0.8 : 1;
  const branchXp = a.skill === 'gemcutting' ? (t.gemcuttingXp ?? 0) : 0;
  grantXp(s, ctx, a.skill, a.xp * (1 + (d.skillXp + (t.skillXp ?? 0) + branchXp) / 100) * heartwoodXp);
  grantMasteryPractice(s, a.mastery, a.intervalMs / 1000);
}

export function skillStep(s: GameState, ctx: Ctx, dt: number, d: Derived): void {
  if (s.action?.kind !== 'skill') return;
  const a = actionDef(s.action.actionId);
  const interval = actionIntervalMs(s, a, d);
  // Overtime: skilling is faster while you're away
  const offlineBoost = ctx.offline ? 1 + (skillTreeStats(s).offlineSpeed ?? 0) / 100 : 1;
  focusStep(s, ctx, dt);
  s.action.progress += dt * offlineBoost * focusMult(s) * (ctx.event?.gatheringSpeed ?? 1);
  while (s.action && s.action.kind === 'skill' && s.action.progress >= interval) {
    const blocker = actionBlocker(s, a);
    if (blocker) {
      ctx.emit({ t: 'info', text: `${a.name}: ${blocker}. Stopped.`, tone: 'warn' });
      s.action = null;
      return;
    }
    s.action.progress -= interval;
    complete(s, ctx, a, d, takeDouble(s, ctx));
  }
}

/** Greenhouse keystone: the last Foraging spot keeps growing slowly while you do anything else. */
export function greenhouseStep(s: GameState, ctx: Ctx, dt: number, d: Derived): void {
  const g = s.greenhouse;
  const pct = skillTreeStats(s).greenhouse ?? 0;
  if (!g || !pct) return;
  if (s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'harvesting') return;
  const a = actionDef(g.actionId);
  if (skillLevel(s, 'harvesting') < a.level) return;
  const offlineBoost = ctx.offline ? 1 + (skillTreeStats(s).offlineSpeed ?? 0) / 100 : 1;
  g.progress += dt * (pct / 100) * offlineBoost * (ctx.event?.gatheringSpeed ?? 1);
  const interval = actionIntervalMs(s, a, d);
  while (g.progress >= interval) {
    g.progress -= interval;
    complete(s, ctx, a, d);
  }
}
