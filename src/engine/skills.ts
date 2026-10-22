import { flaskDef } from '../data/flasks';
import { ALCH_DOUBLE, ALCH_SPEED, FORGE_ILVL, FORGE_SPEED } from '../data/hideout';
import { HERB_TIERS, ORB_TIERS } from '../data/skillTree';
import { actionDef, type SkillAction } from '../data/skills';
import { ZONES } from '../data/zones';
import { addBank, canAfford, payCost } from './bank';
import type { Ctx } from './context';
import { newFlask, rerollMagic } from './flasks';
import { inventoryFull } from './hideout';
import { createItem } from './items';
import { chance, pick } from './rng';
import { skillTreeStats, type TreeStats } from './skillTree';
import type { Derived } from './stats';
import type { GameState, SkillId } from './types';
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
  if (a.skill === 'smithing') speed += FORGE_SPEED[(s.hideout.forge ?? 1) - 1];
  if (a.skill === 'alchemy') speed += ALCH_SPEED[(s.hideout.alchemy_table ?? 1) - 1];
  return (a.intervalMs / (1 + speed / 100)) * keystoneSlow(a.skill, t);
}

/** Smithed gear can't out-level the campaign: capped at the top level of your furthest unlocked area. */
export function smithIlvlCap(s: GameState): number {
  return Math.max(...ZONES.filter((z) => s.unlockedZones.includes(z.id)).map((z) => z.levelRange[1]));
}

export function smithIlvl(s: GameState): number {
  const bonus = FORGE_ILVL[(s.hideout.forge ?? 1) - 1] + (skillTreeStats(s).smithIlvl ?? 0);
  return Math.min(smithIlvlCap(s), skillLevel(s, 'smithing') + bonus);
}

export function actionBlocker(s: GameState, a: SkillAction): string | null {
  if (skillLevel(s, a.skill) < a.level) return `Requires ${a.skill} level ${a.level}`;
  if (a.inputs && !canAfford(s, a.inputs)) return 'Missing materials';
  if (a.baseId && inventoryFull(s)) return 'Inventory full';
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
  s.action = { kind: 'skill', actionId, progress: 0 };
  // Greenhouse remembers the last harvest so it can keep growing in the background
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

/** Inputs to pay, after Steady Hands and Dust Saver. */
function inputsToPay(a: SkillAction, t: TreeStats, ctx: Ctx): Record<string, number> {
  if (!a.inputs) return {};
  if (t.inputSave && chance(ctx.rng, t.inputSave / 100)) return {};
  const cost = { ...a.inputs };
  if (cost.arcane_dust && t.dustSaver && chance(ctx.rng, t.dustSaver / 100)) delete cost.arcane_dust;
  return cost;
}

function complete(s: GameState, ctx: Ctx, a: SkillAction, d: Derived): void {
  const t = skillTreeStats(s);
  payCost(s, inputsToPay(a, t, ctx));
  const outputs: Record<string, number> = {};
  const double = a.skill === 'alchemy' && chance(ctx.rng, ALCH_DOUBLE[(s.hideout.alchemy_table ?? 1) - 1]);
  const mult = double ? 2 : 1;

  for (const [id, n] of Object.entries(a.outputs ?? {})) {
    let qty = n * mult;
    if (a.skill === 'mining' && id.endsWith('_ore')) {
      if (t.motherlode) qty *= 2;
      if (t.doubleOre && chance(ctx.rng, t.doubleOre / 100)) qty *= 2;
    }
    if (a.skill === 'woodcutting' && t.doubleLogs && chance(ctx.rng, t.doubleLogs / 100)) qty *= 2;
    if (a.skill === 'harvesting' && t.doubleHerbs && chance(ctx.rng, t.doubleHerbs / 100)) qty *= 2;
    // Transmuter: crafted orbs sometimes come out one tier higher
    const tier = ORB_TIERS.indexOf(id);
    const outId = tier >= 0 && tier < ORB_TIERS.length - 1 && t.transmuter && chance(ctx.rng, t.transmuter / 100) ? ORB_TIERS[tier + 1] : id;
    give(s, outputs, outId, qty);
    if (a.skill === 'woodcutting' && t.heartwood) give(s, outputs, 'arcane_dust', qty);
    const herb = HERB_TIERS.indexOf(id);
    if (herb >= 0 && herb < HERB_TIERS.length - 1 && t.rareBlooms && chance(ctx.rng, t.rareBlooms / 100)) give(s, outputs, HERB_TIERS[herb + 1], 1);
  }
  for (const b of a.bonus ?? []) {
    const gemBoost = b.id === 'rough_gem' ? 1 + (t.gemChance ?? 0) / 100 : 1;
    if (chance(ctx.rng, b.chance * gemBoost)) give(s, outputs, b.id, b.qty);
  }
  if (a.skill === 'woodcutting' && t.birdsNest && chance(ctx.rng, t.birdsNest / 100)) give(s, outputs, pick(ctx.rng, HERB_TIERS.slice(0, 2)), 1);

  if (a.baseId) {
    const magic = t.grandmaster || (t.smithMagic && chance(ctx.rng, t.smithMagic / 100));
    const item = createItem(s, a.baseId, smithIlvl(s), magic ? 'magic' : 'normal', ctx.rng);
    s.inventory.push(item);
    ctx.emit({ t: 'loot', item });
  }
  if (a.flaskId) {
    for (let i = 0; i < mult; i++) {
      const f = newFlask(s, a.flaskId, skillLevel(s, 'alchemy'));
      if (t.qualityBrews && chance(ctx.rng, t.qualityBrews / 100)) {
        f.rarity = 'magic';
        rerollMagic(f, ctx.rng);
      }
      f.charges = flaskDef(a.flaskId).maxCharges;
      s.flaskStash.push(f);
    }
    outputs[a.flaskId] = mult;
  }
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

/** Greenhouse keystone: the last harvest keeps growing slowly while you do anything else. */
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
