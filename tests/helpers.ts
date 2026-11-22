import { BASES, baseDef } from '../src/data/bases';
import { activeGemDef, gemWeapons } from '../src/data/gems';
import { createItem } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import type { GameState, GiantPart, MonsterInstance } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';
import { actionDef } from '../src/data/skills';
import type { Ctx } from '../src/engine/context';
import { actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { deriveStats } from '../src/engine/stats';
import { makeGiant, setGiantPart } from '../src/engine/woodcutting';

/**
 * Woodcutting gathers by felling a giant now: put a huge giant of `wood` in front of the character and cut its limbs,
 * which give exactly one log a cut. Returns the time the cuts took, in ms.
 */
export function giantCuts(s: GameState, c: Ctx, wood: string, cuts: number, part: GiantPart = 'limbs'): number {
  s.giant.current = makeGiant(s, wood, 'legend', []);
  const id = `giant_${wood}`;
  if (startSkillAction(s, c, id)) throw new Error(`cannot cut ${id}`);
  setGiantPart(s, part);
  const a = actionDef(id);
  let elapsed = 0;
  for (let i = 0; i < cuts; i++) {
    const d = deriveStats(s);
    const duration = actionIntervalMs(s, a, d);
    elapsed += duration;
    skillStep(s, c, duration + 0.0001, d);
  }
  return elapsed;
}

/**
 * A character far enough along to use any gem (they have level requirements) and with the Crafting Bench
 * built (salvaging needs it). Most engine tests want this rather than a fresh level 1.
 */
export function veteran(s: GameState, level = 40): GameState {
  s.skills.combat = charXpForLevel(level);
  s.account.hideout.bench = Math.max(2, s.account.hideout.bench ?? 1);
  // auto flee is the War Table's first upgrade
  s.account.hideout.war_table = Math.max(2, s.account.hideout.war_table ?? 1);
  return s;
}

/** Skill-isolation dummy: authored encounters use their real profiles in integration tests. */
export function trainingDummy(mon: MonsterInstance): MonsterInstance {
  mon.armour = 0;
  mon.evasion = undefined;
  mon.es = mon.maxEs = 0;
  mon.blockChance = mon.spellBlockChance = 0;
  mon.archetype = undefined;
  mon.basicDamageMult = 1;
  mon.critChance = mon.dotShare = 0;
  mon.attackAilment = undefined;
  return mon;
}

/** Put a weapon the skill can be used with in the main hand (the lowest of its first family), unless the current one already fits. */
export function armFor(s: GameState, gemId: string, ...alsoIds: string[]): GameState {
  const lists = [gemId, ...alsoIds].map((id) => gemWeapons(activeGemDef(id))).filter((l): l is NonNullable<typeof l> => !!l);
  const need = lists.length ? lists[0].filter((f) => lists.every((l) => l.includes(f))) : undefined;
  const have = s.equipment.weapon ? baseDef(s.equipment.weapon.baseId).family : undefined;
  if (!need || !need.length || (have && need.includes(have))) return s;
  const base = BASES.filter((b) => b.family === need[0]).sort((a, b) => a.reqLevel - b.reqLevel)[0];
  s.equipment.weapon = createItem(s, base.id, 1, 'normal', seeded(1));
  if (base.twoHanded) s.equipment.offhand = undefined;
  return s;
}
