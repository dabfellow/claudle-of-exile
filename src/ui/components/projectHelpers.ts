import { baseDef, uniqueDef } from '../../data/bases';
import { materialDef } from '../../data/materials';
import type { ProfessionProject } from '../../data/professionProjects';
import { describeUniqueModDef } from '../../engine/items';
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

export function resolveBaseSource(p: ProfessionProject): MaterialSourceTarget | undefined {
  if (!p.sources) return undefined;
  const baseNames = (p.baseIds ?? (p.baseId ? [p.baseId] : [])).map((id) =>
    baseDef(id)?.name?.toLowerCase() ?? ''
  );
  return p.sources.find((src) => {
    const l = src.label.toLowerCase();
    return baseNames.some((name) => name && (l.includes(name) || l.includes(name.replace(/s$/, ''))));
  });
}

export function cleanProjectDesc(p: ProfessionProject): string | null {
  let text = p.use;
  if (!text) return null;

  if (p.reward.category === 'equipment' || p.reward.category === 'flask') {
    const u = p.reward.uniqueId ? uniqueDef(p.reward.uniqueId) : null;
    if (u) {
      for (const m of u.mods) {
        const modDesc = describeUniqueModDef(m);
        text = text.replace(modDesc, '');
        const cleanMod = modDesc.replace(/[.,;:]+$/, '').trim();
        if (cleanMod.length > 5) {
          text = text.replace(cleanMod, '');
        }
      }
      text = text.replace(new RegExp(`^One\\s+${u.name}[^:]*:\\s*`, 'i'), '');
    }

    text = text.replace(/Fixed unique,?\s*item level \d+,?\s*/i, '');
    text = text.replace(/item level \d+,?\s*/i, '');
    text = text.replace(/Fixed cost;\s*no manual double or input conservation\.?/i, '');
    text = text.replace(/^[;.,\s]+/, '').replace(/[;\s]+$/, '').trim();
    if (text.length > 0) {
      text = text.charAt(0).toUpperCase() + text.slice(1);
      if (!/[.!?]$/.test(text)) text += '.';
    }
  }

  return text.length > 0 ? text : null;
}
