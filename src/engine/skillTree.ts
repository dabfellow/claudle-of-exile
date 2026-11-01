import { SKILLS } from '../data/skills';
import { SKILL_TREE_BY_ID, SKILL_TREE_START, type SkillTreeStat } from '../data/skillTree';
import type { Ctx } from './context';
import { connectedWithout, treeAllocateReason } from './passives';
import type { GameState } from './types';
import { levelOf } from './xp';

// Fishing is left out: it is always level 1 and would only nudge the point count
const SKILLING = ['mining', 'woodcutting', 'harvesting', 'thieving', 'archaeology', 'smithing', 'alchemy', 'gemcutting', 'runecarving', 'cooking'] as const;

/** 1 point per 5 total gathering/production levels (everyone starts with 1). */
export function skillTreePoints(s: GameState): number {
  const total = SKILLING.reduce((a, k) => a + levelOf(k, s.skills[k]), 0);
  return Math.floor(total / 5);
}

export function skillPointsLeft(s: GameState): number {
  return skillTreePoints(s) - s.skillPassives.length;
}

export function skillNodeReason(s: GameState, id: string): string | null {
  const node = SKILL_TREE_BY_ID[id];
  if (!node) return 'Invalid node';
  if (node.req && levelOf(node.req.skill, s.skills[node.req.skill]) < node.req.level) {
    return `Requires ${SKILLS[node.req.skill].name} level ${node.req.level}`;
  }
  return treeAllocateReason(SKILL_TREE_BY_ID, s.skillPassives, SKILL_TREE_START, id, skillPointsLeft(s));
}

export function allocateSkillNode(s: GameState, ctx: Ctx, id: string): string | null {
  const reason = skillNodeReason(s, id);
  if (reason) return reason;
  s.skillPassives.push(id);
  ctx.emit({ t: 'info', text: `Learned ${SKILL_TREE_BY_ID[id].name}`, tone: 'good' });
  return null;
}

export function refundSkillNodeReason(s: GameState, id: string): string | null {
  if (!s.skillPassives.includes(id)) return 'Not allocated';
  if ((s.bank.regret ?? 0) < 1) return 'Requires an Orb of Regret';
  if (!connectedWithout(s.skillPassives, id, SKILL_TREE_START, SKILL_TREE_BY_ID)) return 'Would disconnect other nodes';
  return null;
}

export function refundSkillNode(s: GameState, ctx: Ctx, id: string): string | null {
  const reason = refundSkillNodeReason(s, id);
  if (reason) return reason;
  s.bank.regret -= 1;
  s.skillPassives = s.skillPassives.filter((x) => x !== id);
  ctx.emit({ t: 'info', text: `Refunded ${SKILL_TREE_BY_ID[id].name}` });
  return null;
}

export type TreeStats = Partial<Record<SkillTreeStat, number>>;

/** Summed skilling-tree effects (missing keys mean 0). */
export function skillTreeStats(s: GameState): TreeStats {
  const out: TreeStats = {};
  for (const id of s.skillPassives ?? []) {
    const n = SKILL_TREE_BY_ID[id];
    if (!n) continue;
    for (const [k, v] of Object.entries(n.stats)) out[k as SkillTreeStat] = (out[k as SkillTreeStat] ?? 0) + (v ?? 0);
  }
  return out;
}
