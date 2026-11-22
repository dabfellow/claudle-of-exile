import { affixDef } from '../data/affixes';
import { SKILLS } from '../data/skills';
import { SKILL_TREE_BY_ID, SKILL_TREE_START, SKILLING_RING, type SkillTreeStat, type TreeSkillId } from '../data/skillTree';
import type { Ctx } from './context';
import { connectedWithout, treeAllocateReason } from './passives';
import type { GameState } from './types';
import { levelOf } from './xp';

export const MAX_SKILL_TREE_POINTS = 118;

/** One point per 10 total levels across the 12 reworked skilling professions (max 118). */
export function skillTreePoints(s: GameState): number {
  const total = SKILLING_RING.reduce((a, k) => a + levelOf(k, s.skills[k]), 0);
  return Math.min(MAX_SKILL_TREE_POINTS, Math.floor(total / 10));
}

export function skillPointsLeft(s: GameState): number {
  return skillTreePoints(s) - s.skillPassives.length;
}

function hasForkNodeIn(s: GameState, skill: TreeSkillId): boolean {
  return s.skillPassives.some((id) => id.startsWith(`${skill}_f`));
}

export function skillNodeReason(s: GameState, id: string): string | null {
  const node = SKILL_TREE_BY_ID[id];
  if (!node) return 'Invalid node';
  if (node.req && levelOf(node.req.skill, s.skills[node.req.skill]) < node.req.level) {
    return `Requires ${SKILLS[node.req.skill].name} level ${node.req.level}`;
  }
  if (node.bridgeReq) {
    const [left, right] = node.bridgeReq;
    if (!hasForkNodeIn(s, left) || !hasForkNodeIn(s, right)) {
      return `Requires a fork node in both ${SKILLS[left].name} and ${SKILLS[right].name}`;
    }
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
  if ((s.storage.bank.regret ?? 0) < 1) return 'Requires an Orb of Regret';
  if (!connectedWithout(s.skillPassives, id, SKILL_TREE_START, SKILL_TREE_BY_ID)) return 'Would disconnect other nodes';
  return null;
}

export function refundSkillNode(s: GameState, ctx: Ctx, id: string): string | null {
  const reason = refundSkillNodeReason(s, id);
  if (reason) return reason;
  s.storage.bank.regret -= 1;
  s.skillPassives = s.skillPassives.filter((x) => x !== id);
  ctx.emit({ t: 'info', text: `Refunded ${SKILL_TREE_BY_ID[id].name}` });
  return null;
}

export type TreeStats = Partial<Record<SkillTreeStat, number>>;

const SKILL_TREE_STAT_SET = new Set<string>([
  'inputSave', 'offlineSpeed', 'patientCrafter', 'sharpFocus', 'curious', 'skillXp', 'skillSpeed',
  'miningSpeed', 'gemChance', 'fossilChance', 'motherlode', 'miningYield', 'miningRare', 'miningDouble',
  'woodcuttingSpeed', 'birdsNest', 'resinChance', 'resinIlvl', 'heartwood', 'woodcuttingYield', 'woodcuttingRare', 'woodcuttingDouble',
  'harvestingSpeed', 'distiller', 'rareBlooms', 'greenhouse', 'harvestingYield', 'harvestingRare', 'harvestingDouble',
  'thievingSpeed', 'markerChance', 'alertReduce', 'cleanGetaway', 'thievingYield', 'thievingRare', 'thievingDouble',
  'archaeologySpeed', 'artifactChance', 'wareDiscount', 'deepSurvey', 'archaeologyYield', 'archaeologyRare', 'archaeologyDouble',
  'smithingSpeed', 'smeltingSpeed', 'woodcraftingSpeed', 'steadyTemper', 'smithMagic', 'grandmaster', 'smithingQuality', 'smithingSave', 'smithingExtra',
  'alchemySpeed', 'bulkBrewer', 'qualityBrews', 'transmuter', 'alchemyQuality', 'alchemySave', 'alchemyExtra',
  'gemcuttingSpeed', 'gemcuttingXp', 'gemDustSave', 'masterCutter', 'gemcuttingQuality', 'gemcuttingSave', 'gemcuttingExtra',
  'cartographySpeed', 'secondCopy', 'mapFind', 'masterCartographer', 'cartographyQuality', 'cartographySave', 'cartographyExtra',
  'allSpeed', 'allYield', 'allRare', 'allDouble', 'allQuality', 'allSave', 'allExtra',
]);

/** Summed skilling-tree and equipped life-skill gear effects (missing keys mean 0). */
export function skillTreeStats(s: GameState): TreeStats {
  const out: TreeStats = {};
  for (const id of s.skillPassives ?? []) {
    const n = SKILL_TREE_BY_ID[id];
    if (!n) continue;
    for (const [k, v] of Object.entries(n.stats)) out[k as SkillTreeStat] = (out[k as SkillTreeStat] ?? 0) + (v ?? 0);
  }
  if (s.equipment) {
    for (const item of Object.values(s.equipment)) {
      if (!item) continue;
      for (const m of [...item.prefixes, ...item.suffixes]) {
        const def = affixDef(m.affixId);
        def.stats.forEach((st, i) => {
          if (SKILL_TREE_STAT_SET.has(st)) {
            const k = st as SkillTreeStat;
            out[k] = (out[k] ?? 0) + (m.values[i] ?? 0);
          }
        });
      }
    }
  }
  return out;
}
