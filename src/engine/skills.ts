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
import type { Ctx } from './context';
import { newFlask, rerollMagic, stashFlask } from './flasks';
import { createSkillGem, createSupportGem } from './gems';
import { markerBoost } from './heist';
import { bagFull } from './storage';
import { allMods, createItem, salvageValue } from './items';
import { chance, pick } from './rng';
import { skillTreeStats, type TreeStats } from './skillTree';
import type { Derived } from './stats';
import type { GameState, Item, SkillId, SmithCatalyst } from './types';
import { characterLevel } from './character';
import { levelOf } from './xp';

export function skillLevel(s: GameState, skill: SkillId): number {
  return levelOf(skill, s.skills[skill]);
}

export function grantXp(s: GameState, ctx: Ctx, skill: SkillId, amount: number): void {
  const before = levelOf(skill, s.skills[skill]);
  s.skills[skill] += amount;
  ctx.emit({ t: 'xp', skill, amount });
  const after = levelOf(skill, s.skills[skill]);
  if (after > before) ctx.emit({ t: 'levelup', skill, level: after });
}

/** How much slower a skill's keystone makes it (Motherlode, Grandmaster Smith, Transmuter). */
function keystoneSlow(skill: SkillId, t: TreeStats): number {
  if (skill === 'mining' && t.motherlode) return 1.3;
  if (skill === 'smithing' && t.grandmaster) return 1.25;
  if (skill === 'alchemy' && t.transmuter) return 1.2;
  return 1;
}

export function actionIntervalMs(s: GameState, a: SkillAction, d: Derived): number {
  const t = skillTreeStats(s);
  let speed = d.skillSpeed + (t.skillSpeed ?? 0) + (t[`${a.skill}Speed` as keyof TreeStats] ?? 0);
  return (a.intervalMs / (1 + speed / 100)) * keystoneSlow(a.skill, t);
}

/** Smithed gear can't out-level the campaign: capped at the top level of your furthest unlocked area. */
export function smithIlvlCap(s: GameState): number {
  return Math.max(...ZONES.filter((z) => s.unlockedZones.includes(z.id) && actOpen(z.act)).map((z) => z.levelRange[1]));
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

export function actionBlocker(s: GameState, a: SkillAction): string | null {
  if (a.soon) return 'Coming soon';
  if (a.area && !s.unlockedZones.includes(a.area)) return `Reach ${zoneDef(a.area).name} to unlock`;
  if (skillLevel(s, a.skill) < a.level) return `Requires ${SKILLS[a.skill].name} level ${a.level}`;
  const st = stationLevelFor(a);
  if (st && (s.account.hideout[st.station] ?? 1) < st.level) return `Needs ${st.station === 'forge' ? 'Forge' : 'Alchemy Table'} level ${st.level}`;
  if (a.inputs && !canAfford(s, a.inputs)) return 'Missing materials';
  if (a.baseId && bagFull(s)) return 'Inventory full';
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
function inputsToPay(a: SkillAction, t: TreeStats, ctx: Ctx): Record<string, number> {
  if (!a.inputs) return {};
  if (t.inputSave && chance(ctx.rng, t.inputSave / 100)) return {};
  if (a.batchOf && t.bulkBrewer) {
    const single = actionDef(a.batchOf).inputs!;
    return Object.fromEntries(Object.entries(single).map(([id, n]) => [id, Math.ceil(n * BULK_BREWER_MULT)]));
  }
  return { ...a.inputs };
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
  if (cat.resin) s.bank[cat.resin] -= 1;
  const magic = t.grandmaster || (t.smithMagic && chance(ctx.rng, t.smithMagic / 100));
  // the Fossil only matters (and is only used up) when the base comes out Magic
  const fossil = magic ? cat.fossil : null;
  const item = createItem(s, a.baseId!, smithIlvl(s, resin), magic ? 'magic' : 'normal', ctx.rng, fossil ? modBias(fossil) : undefined);
  if (fossil && !(t.steadyTemper && chance(ctx.rng, t.steadyTemper / 100))) s.bank[fossil] -= 1;
  s.lifetime.itemsSmithed += 1;

  const repeating = cat.until && !!cat.fossil;
  if (repeating && fossil && fossilHit(item, fossil)) {
    s.inventory.push(item);
    ctx.emit({ t: 'loot', item });
    ctx.emit({ t: 'info', text: `${a.name} rolled a ${fossilDef(fossil)!.name} modifier. Stopped.`, tone: 'good' });
    s.action = null;
    return;
  }
  if (repeating && cat.salvageMisses) {
    addBank(s, 'arcane_dust', salvageValue(item));
    s.lifetime.salvaged += 1;
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
  if (kind === 'skill') {
    const def = pick(ctx.rng, ACTIVE_GEMS.filter((g) => gemReqLevel(g.id) <= characterLevel(s)));
    s.gems.push(createSkillGem(s, def.id));
    outputs[def.id] = 1;
    ctx.emit({ t: 'loot', gemId: def.id });
    return;
  }
  // only gems you're high enough level to use; signatures you can't use yet fall back to any you can
  let pool = SUPPORT_GEMS.filter((g) => (kind === 'signature' ? !!g.signatureFor : !g.signatureFor) && gemReqLevel(g.id) <= characterLevel(s));
  if (!pool.length) pool = SUPPORT_GEMS.filter((g) => !g.signatureFor && gemReqLevel(g.id) <= characterLevel(s));
  if (kind === 'signature') {
    const owned = new Set([...s.skillBar, ...s.gems].filter(Boolean).map((g) => g!.gemId));
    const mine = pool.filter((g) => owned.has(g.signatureFor!));
    if (mine.length) pool = mine;
  }
  const def = pick(ctx.rng, pool);
  s.supportGems.push(createSupportGem(s, def.id));
  outputs[def.id] = 1;
  ctx.emit({ t: 'loot', supportId: def.id });
}

function complete(s: GameState, ctx: Ctx, a: SkillAction, d: Derived): void {
  const t = skillTreeStats(s);
  payCost(s, inputsToPay(a, t, ctx));
  const outputs: Record<string, number> = {};
  const double = a.skill === 'alchemy' && chance(ctx.rng, ALCH_DOUBLE[(s.account.hideout.alchemy_table ?? 1) - 1]);
  const mult = double ? 2 : 1;

  // alternate nodes trade some of their base material for a better secondary
  const yields = a.outputChance === undefined || chance(ctx.rng, a.outputChance);
  for (const [id, n] of Object.entries(yields ? (a.outputs ?? {}) : {})) {
    let qty = n * mult;
    if (a.skill === 'mining' && id.endsWith('_ore') && t.motherlode) qty *= 2;
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
    give(s, outputs, upgrade && t.distiller && chance(ctx.rng, t.distiller / 100) ? upgrade : b.id, b.qty);
  }
  if (a.skill === 'woodcutting' && t.birdsNest && chance(ctx.rng, t.birdsNest / 100)) give(s, outputs, pick(ctx.rng, HERB_TIERS.slice(0, 2)), 1);

  if (a.baseId) smithBase(s, ctx, a, t);
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
  if (a.gem) cutGem(s, ctx, a, outputs);
  ctx.emit({ t: 'produce', skill: a.skill, outputs });
  const heartwoodXp = a.skill === 'woodcutting' && t.heartwood ? 0.8 : 1;
  grantXp(s, ctx, a.skill, a.xp * (1 + (d.skillXp + (t.skillXp ?? 0)) / 100) * heartwoodXp);
}

export function skillStep(s: GameState, ctx: Ctx, dt: number, d: Derived): void {
  if (s.action?.kind !== 'skill') return;
  const a = actionDef(s.action.actionId);
  const interval = actionIntervalMs(s, a, d);
  // Overtime: skilling is faster while you're away
  const offlineBoost = ctx.offline ? 1 + (skillTreeStats(s).offlineSpeed ?? 0) / 100 : 1;
  s.action.progress += dt * offlineBoost;
  while (s.action && s.action.kind === 'skill' && s.action.progress >= interval) {
    const blocker = actionBlocker(s, a);
    if (blocker) {
      ctx.emit({ t: 'info', text: `${a.name}: ${blocker}. Stopped.`, tone: 'warn' });
      s.action = null;
      return;
    }
    s.action.progress -= interval;
    complete(s, ctx, a, d);
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
  g.progress += dt * (pct / 100);
  const interval = actionIntervalMs(s, a, d);
  while (g.progress >= interval) {
    g.progress -= interval;
    complete(s, ctx, a, d);
  }
}
