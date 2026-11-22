import { ESSENCES, FOSSILS, SEAL, WAX } from '../../data/craftMats';
import { cultureDef, WARES, WHETSTONE } from '../../data/expedition';
import { HEIST_JOBS } from '../../data/heist';
import { materialDef } from '../../data/materials';
import { RUNE_DROP, runeDef } from '../../data/runes';
import { ACTIONS, SKILLS } from '../../data/skills';
import { barGradeOf, barId } from '../../data/smelting';
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
  const bar = barGradeOf(id);
  const smelted = bar ? barId(bar.metal, 'refined') : id;
  for (const a of ACTIONS) {
    if (a.soon || a.batchOf || a.id.startsWith('mine_')) continue;
    const made = a.outputs?.[smelted] || a.protectedOutputs?.[id];
    const bonus = a.bonus?.find((b) => b.id === id);
    if (!made && !bonus) continue;
    out.push({
      label: `${SKILLS[a.skill].name}: ${a.name}`,
      detail: `Lv ${a.level}${bonus && !made ? ` · ${Math.round(bonus.chance * 100)}% chance` : ''}`,
      page: a.skill,
    });
  }
  if (id === 'rubble' || id === 'mine_support') out.push({ label: 'Mining: work a layer', page: 'mining' });
  if (id === 'heartstone') out.push({ label: 'Mining: deep Delve caverns', page: 'mining' });
  if (id.startsWith('rough_gem') || id === 'crystal_shard') out.push({ label: 'Mining: Crystal-bearing layers and caverns', page: 'mining' });
  if (FOSSIL_IDS.has(id)) out.push({ label: 'Mining: Fossil beds', page: 'mining' });
  if (id === 'mineral_fragment') out.push({ label: 'Mining: Mithril layers and deeper', page: 'mining' });
  if (id === 'stone_fragment') out.push({ label: 'Mining: Adamant layers and deeper', page: 'mining' });
  if (id === 'living_metal') out.push({ label: 'Smelting: furnace at purity 8+', page: 'smelting' });
  if (id === 'stardust' || id === 'gilded_stardust') out.push({ label: 'Astrology: research sky regions', page: 'astrology' });
  if (id === 'inscription_fragment') out.push({ label: 'Maps: Tier 5+ Boss map bosses (25%)', page: 'maps' });
  for (const job of HEIST_JOBS) {
    if ([...job.drops, ...job.vault].some((d) => d.id === id)) out.push({ label: `Heist: ${job.name}`, detail: `Thieving ${job.level}`, page: 'thieving' });
  }
  for (const w of WARES) {
    if (w.item === id) out.push({ label: `Expedition: ${cultureDef(w.culture).merchant}`, detail: `standing ${w.standing}`, page: 'archaeology' });
  }
  if (id === WHETSTONE) out.push({ label: 'Monster drops', detail: 'rare, from Act 5 on', page: 'campaign' });
  if (id === SEAL || id === WAX) out.push({ label: 'Monster drops', detail: 'rare, from Act 2 on', page: 'campaign' });
  const rune = runeDef(id);
  if (rune && rune.grade.grade <= RUNE_DROP.maxGrade) out.push({ label: 'Monster drops', detail: 'rare, from Act 4 on', page: 'campaign' });
  if (id === 'gold') out.push({ label: 'Monster drops', page: 'campaign' }, { label: 'Selling in Town', page: 'vendor' });
  if (id === 'arcane_dust') out.push({ label: 'Salvaging gear', detail: 'Inventory', page: 'equipment' });
  if (['marrow_shard', 'choir_glass', 'black_pearl', 'throne_ash', 'crownless_sigil'].includes(id)) {
    out.push({ label: 'Hard Boss drops', detail: 'Map Device keyed fights', page: 'maps' });
  }
  if (['exile_doom_sigil', 'architect_doom_sigil', 'void_sigil', 'uber_key_1', 'uber_key_2', 'uber_key_3'].includes(id)) {
    out.push({ label: 'Uber Boss drops', detail: 'Map Device pinnacle fights', page: 'maps' });
  }
  if (FOSSIL_IDS.has(id) || ESSENCE_IDS.has(id)) out.push({ label: 'Zone bosses', detail: 'about half of boss kills', page: 'campaign' });
  const kind = materialDef(id).kind;
  if (kind === 'currency') out.push({ label: 'Monster drops', page: 'campaign' }, { label: 'Magic shop in Town', page: 'vendor' });
  if (!out.length) out.push({ label: 'Monster drops', page: 'campaign' });
  return out;
}
