import { baseDef } from './bases';
import { siteOf } from './expedition';
import type { HeistJob } from './heist';
import type { SkillAction } from './skills';

export type MasteryProfile = 'gathering' | 'production' | 'heist';

export interface MasterySpec {
  /** Stable authored band id. Labels and action names may change without resetting practice. */
  id: string;
  name: string;
  profile: MasteryProfile;
  /** Gathering only: the one ordinary output eligible for the yield bonus. */
  primaryOutput?: string;
  /** Production only: ordinary ingredients eligible for conservation. */
  ordinaryInputs?: string[];
}

/** Inputs mastery may conserve. Valuable/chase materials are deliberately absent. */
const ORDINARY_INPUTS = new Set([
  'copper_ore', 'iron_ore', 'mithril_ore', 'ash_log', 'oak_log', 'yew_log',
  'sunpetal', 'frostleaf', 'emberroot', 'voidbloom', 'copper_bar', 'iron_bar', 'mithril_bar',
  'ash_plank', 'oak_plank', 'yew_plank', 'rough_gem', 'arcane_dust',
  'vellum', 'fine_vellum', 'gall_ink', 'sepia_ink',
]);

const spec = (id: string, name: string, profile: MasteryProfile, extra: Partial<MasterySpec> = {}): MasterySpec => ({ id, name, profile, ...extra });
const outputOf = (a: SkillAction) => Object.keys(a.outputs ?? {})[0];
const ordinaryInputs = (a: SkillAction) => Object.keys(a.inputs ?? {}).filter((id) => ORDINARY_INPUTS.has(id));
const production = (id: string, name: string, a: SkillAction) => spec(id, name, 'production', { ordinaryInputs: ordinaryInputs(a) });
const gathering = (id: string, name: string, primaryOutput: string) => spec(id, name, 'gathering', { primaryOutput });

const materialName = (id: string) => id.split('_').map((x) => x[0].toUpperCase() + x.slice(1)).join(' ');

/** Explicit, bounded mastery identity for every eligible timed action. */
export function masteryForAction(a: SkillAction): MasterySpec | undefined {
  if (a.skill === 'combat' || a.skill === 'fishing' || a.soon) return undefined;
  const out = outputOf(a);

  if (a.skill === 'mining') {
    const band = out === 'rough_gem' ? 'gem' : out.replace('_ore', '');
    return gathering(`mining.${band}`, `${materialName(band)} Mining`, out);
  }
  if (a.skill === 'woodcutting') {
    const material = (out || Object.keys(a.inputs ?? {})[0]).replace(/_(log|plank)$/, '');
    return a.inputs
      ? production(`wood.${material}`, `${materialName(material)} Woodworking`, a)
      : gathering(`wood.${material}`, `${materialName(material)} Woodcutting`, out);
  }
  if (a.skill === 'harvesting') {
    const herb = out === 'sunpetal' ? 'sunpetal' : out === 'frostleaf' ? 'frostleaf' : out === 'emberroot' ? 'emberroot' : 'voidbloom';
    return gathering(`foraging.${herb}`, `${materialName(herb)} Foraging`, out);
  }
  if (a.skill === 'thieving') {
    const band = a.level < 19 ? 'road' : a.level < 35 ? 'khanate' : 'court';
    const label = band === 'road' ? 'Road Marks' : band === 'khanate' ? 'Khanate Marks' : 'Court Marks';
    return gathering(`thieving.${band}`, label, 'gold');
  }
  if (a.skill === 'archaeology') {
    const culture = siteOf(a.id)?.culture;
    if (!culture) throw new Error(`Archaeology action ${a.id} has no culture mastery`);
    return gathering(`archaeology.${culture}`, `${materialName(culture)} Archaeology`, out);
  }
  if (a.skill === 'smithing') {
    if (a.id.startsWith('smelt_')) {
      const material = a.id.slice('smelt_'.length);
      return production(`smithing.smelt.${material}`, `${materialName(material)} Smelting`, a);
    }
    if (a.baseId) {
      const b = baseDef(a.baseId);
      const material = b.reqLevel < 10 ? 'copper' : b.reqLevel < 22 ? 'iron' : 'mithril';
      const family = b.slot === 'weapon' ? 'weapons' : b.slot === 'offhand' ? 'offhands' : b.slot === 'ring' || b.slot === 'amulet' ? 'jewellery' : 'armour';
      return production(`smithing.${material}.${family}`, `${materialName(material)} ${materialName(family)}`, a);
    }
    return production('keys.smithing', 'Key Smithing', a);
  }
  if (a.skill === 'alchemy') {
    if (a.id === 'brew_abyssal_key') return production('keys.alchemy', 'Key Alchemy', a);
    if (a.flaskId) {
      const kind = a.flaskId.startsWith('life_') ? 'life' : a.flaskId.startsWith('mana_') ? 'mana' : 'utility';
      return production(`alchemy.flask.${kind}`, `${materialName(kind)} Flasks`, a);
    }
    return production('alchemy.orbs', 'Orb Alchemy', a);
  }
  if (a.skill === 'gemcutting') {
    if (a.id === 'cut_bell_key') return production('keys.gemcutting', 'Key Gemcutting', a);
    const kind = a.gem?.kind ?? 'special';
    return production(`gemcutting.${kind}`, `${materialName(kind)} Gemcutting`, a);
  }
  if (a.skill === 'runecarving') {
    if (a.id === 'carve_regent_key') return production('keys.runecarving', 'Key Rune-carving', a);
    const family = /^carve_rune_([^_]+)_/.exec(a.id)?.[1];
    if (!family) throw new Error(`Rune action ${a.id} has no family mastery`);
    return production(`runes.${family}`, `${materialName(family)} Runes`, a);
  }
  if (a.skill === 'cooking') {
    const ingredient = !out.startsWith('meal_');
    const band = ingredient ? 'ingredients' : a.level <= 10 ? 'early_meals' : a.level <= 35 ? 'mid_meals' : 'late_meals';
    return production(`cooking.${band}`, ingredient ? 'Cooking Ingredients' : `${a.level <= 10 ? 'Simple' : a.level <= 35 ? 'Campaign' : 'Master'} Meals`, a);
  }
  if (a.skill === 'cartography') {
    if (a.id.includes('vellum')) return production('cartography.vellum', 'Vellum', a);
    if (a.id.includes('ink')) return production('cartography.ink', 'Cartographic Ink', a);
    if (a.id.includes('sextant_')) return production(`cartography.${out}`, a.name, a);
    if (a.chart) {
      const low = Math.floor((a.chart.tier - 1) / 2) * 2 + 1;
      return production(`cartography.maps.${low}_${low + 1}`, `Map Tiers ${low}–${low + 1}`, a);
    }
  }
  throw new Error(`Eligible action ${a.id} has no mastery band`);
}

/** Heist rooms use three authored difficulty bands, never one track per generated reward. */
export function masteryForHeist(job: HeistJob): MasterySpec {
  const band = job.level < 20 ? 'street' : job.level < 45 ? 'khanate' : 'royal';
  const name = band === 'street' ? 'Street Heists' : band === 'khanate' ? 'Khanate Heists' : 'Royal Heists';
  return spec(`heist.${band}`, name, 'heist');
}
