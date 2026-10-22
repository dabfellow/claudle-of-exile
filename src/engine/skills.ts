import { flaskDef } from '../data/flasks';
import { ALCH_DOUBLE, ALCH_SPEED, FORGE_ILVL, FORGE_SPEED } from '../data/hideout';
import { actionDef, type SkillAction } from '../data/skills';
import { ZONES } from '../data/zones';
import { addBank, canAfford, payCost } from './bank';
import type { Ctx } from './context';
import { inventoryFull } from './hideout';
import { newFlask } from './flasks';
import { createItem } from './items';
import { chance } from './rng';
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

export function actionIntervalMs(s: GameState, a: SkillAction, d: Derived): number {
  let speed = d.skillSpeed;
  if (a.skill === 'smithing') speed += FORGE_SPEED[(s.hideout.forge ?? 1) - 1];
  if (a.skill === 'alchemy') speed += ALCH_SPEED[(s.hideout.alchemy_table ?? 1) - 1];
  return a.intervalMs / (1 + speed / 100);
}

/** Smithed gear can't out-level the campaign: capped at the top level of your furthest unlocked area. */
export function smithIlvlCap(s: GameState): number {
  return Math.max(...ZONES.filter((z) => s.unlockedZones.includes(z.id)).map((z) => z.levelRange[1]));
}

export function smithIlvl(s: GameState): number {
  return Math.min(smithIlvlCap(s), skillLevel(s, 'smithing') + FORGE_ILVL[(s.hideout.forge ?? 1) - 1]);
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
  return null;
}

export function stopAction(s: GameState): void {
  s.action = null;
  s.combat = null;
}

function complete(s: GameState, ctx: Ctx, a: SkillAction, d: Derived): void {
  if (a.inputs) payCost(s, a.inputs);
  const outputs: Record<string, number> = {};
  const double = a.skill === 'alchemy' && chance(ctx.rng, ALCH_DOUBLE[(s.hideout.alchemy_table ?? 1) - 1]);
  const mult = double ? 2 : 1;
  for (const [id, n] of Object.entries(a.outputs ?? {})) {
    addBank(s, id, n * mult);
    outputs[id] = (outputs[id] ?? 0) + n * mult;
  }
  for (const b of a.bonus ?? []) {
    if (chance(ctx.rng, b.chance)) {
      addBank(s, b.id, b.qty);
      outputs[b.id] = (outputs[b.id] ?? 0) + b.qty;
    }
  }
  if (a.baseId) {
    const item = createItem(s, a.baseId, smithIlvl(s), 'normal', ctx.rng);
    s.inventory.push(item);
    ctx.emit({ t: 'loot', item });
  }
  if (a.flaskId) {
    for (let i = 0; i < mult; i++) {
      const f = newFlask(s, a.flaskId, skillLevel(s, 'alchemy'));
      f.charges = flaskDef(a.flaskId).maxCharges;
      s.flaskStash.push(f);
    }
    outputs[a.flaskId] = mult;
  }
  ctx.emit({ t: 'produce', skill: a.skill, outputs });
  grantXp(s, ctx, a.skill, a.xp * (1 + d.skillXp / 100));
}

export function skillStep(s: GameState, ctx: Ctx, dt: number, d: Derived): void {
  if (s.action?.kind !== 'skill') return;
  const a = actionDef(s.action.actionId);
  const interval = actionIntervalMs(s, a, d);
  s.action.progress += dt;
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
