import { ESSENCES, FOSSILS } from '../../data/craftMats';
import { materialDef } from '../../data/materials';
import { ACTIONS, SKILLS } from '../../data/skills';
import type { Page } from '../Layout';

export interface Source {
  label: string;
  detail?: string;
  page: Page;
}

const FOSSIL_IDS = new Set(FOSSILS.map((f) => f.id));
const ESSENCE_IDS = new Set(ESSENCES.map((e) => e.id));

/** Where a material can be got, each with the page that gets it. */
export function materialSources(id: string): Source[] {
  const out: Source[] = [];
  for (const a of ACTIONS) {
    if (a.soon || a.batchOf) continue;
    const made = a.outputs?.[id];
    const bonus = a.bonus?.find((b) => b.id === id);
    if (!made && !bonus) continue;
    out.push({
      label: `${SKILLS[a.skill].name}: ${a.name}`,
      detail: `Lv ${a.level}${bonus && !made ? ` · ${Math.round(bonus.chance * 100)}% chance` : ''}`,
      page: a.skill,
    });
  }
  if (id === 'gold') out.push({ label: 'Monster drops', page: 'campaign' }, { label: 'Selling in Town', page: 'vendor' });
  if (id === 'arcane_dust') out.push({ label: 'Salvaging gear', detail: 'Stash or Equipment', page: 'stash' });
  if (FOSSIL_IDS.has(id) || ESSENCE_IDS.has(id)) out.push({ label: 'Area bosses', detail: 'about half of boss kills', page: 'campaign' });
  const kind = materialDef(id).kind;
  if (kind === 'currency') out.push({ label: 'Monster drops', page: 'campaign' }, { label: 'Magic shop in Town', page: 'vendor' });
  if (!out.length) out.push({ label: 'Monster drops', page: 'campaign' });
  return out;
}
