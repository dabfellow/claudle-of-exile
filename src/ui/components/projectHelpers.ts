import { materialDef } from '../../data/materials';
import type { SkillId } from '../../engine/types';
import { materialSources } from './materialSources';

export interface MaterialSourceTarget {
  skill: SkillId;
  label: string;
}

const VALID_SKILL_IDS = new Set<SkillId>([
  'mining',
  'woodcutting',
  'harvesting',
  'alchemy',
  'gemcutting',
  'cooking',
  'cartography',
  'thieving',
  'archaeology',
  'runecarving',
  'smithing',
  'smelting',
  'woodcrafting',
  'tailoring',
  'sawmilling',
  'astrology',
  'fishing',
  'combat',
]);

export function resolveMaterialSource(
  matId: string,
  projectSources?: { label: string; skill: SkillId }[]
): MaterialSourceTarget | undefined {
  const matName = materialDef(matId)?.name?.toLowerCase() ?? '';
  if (projectSources && matName) {
    const singularName = matName.replace(/s$/, '');
    const match = projectSources.find((src) => {
      const l = src.label.toLowerCase();
      return l.includes(matName) || (singularName.length >= 4 && l.includes(singularName));
    });
    if (match) {
      return { skill: match.skill, label: match.label };
    }
  }

  const globalSources = materialSources(matId);
  for (const src of globalSources) {
    if (VALID_SKILL_IDS.has(src.page as SkillId)) {
      return {
        skill: src.page as SkillId,
        label: `${src.label}${src.detail ? ` (${src.detail})` : ''}`,
      };
    }
  }

  return undefined;
}
