import { ACTIVE_GEMS, SUPPORT_GEMS, type ActiveGemDef, type SupportGemDef } from './gems';
import { DEFENCE_SUPPORTS, type GemFamily } from './gemcutting';

export const CUT_FACETS = {
  clarity: { name: 'Clarity', effect: '+1 effective gem level', family: 'shared', max: 1 },
  polish: { name: 'Polish', effect: '10% more gem XP gained', family: 'shared', max: 2 },
  economy: { name: 'Economy', effect: '8% lower mana cost', family: 'shared', max: 2 },
  edge: { name: 'Edge', effect: '8% more attack damage', family: 'attack', max: 2 },
  swift: { name: 'Swift', effect: '5% increased attack speed', family: 'attack', max: 2 },
  pierce: { name: 'Pierce', effect: '10% increased projectile speed', family: 'attack', max: 2 },
  brilliance: { name: 'Brilliance', effect: '8% more spell damage', family: 'elemental', max: 2 },
  conduit: { name: 'Conduit', effect: '4 percentage points of elemental resistance penetration', family: 'elemental', max: 2 },
  wide: { name: 'Wide', effect: '12% increased area', family: 'elemental', max: 2 },
  kinship: { name: 'Kinship', effect: '10% more minion life', family: 'summon', max: 2 },
  fury: { name: 'Fury', effect: '8% more minion damage', family: 'summon', max: 2 },
  pace: { name: 'Pace', effect: '5% increased minion speed', family: 'summon', max: 2 },
  bulwark: { name: 'Bulwark', effect: '8% increased defensive effect', family: 'defence', max: 2 },
  lasting: { name: 'Lasting', effect: '15% increased skill duration', family: 'defence', max: 2 },
  quickcast: { name: 'Quickcast', effect: '8% increased cast speed', family: 'defence', max: 2 },
  keen: { name: 'Keen', effect: '5% increased effect of damage modifiers on the support', family: 'damage_support', max: 2 },
  steady: { name: 'Steady', effect: '5% lower mana multiplier', family: 'damage_support', max: 2 },
  twin: { name: 'Twin', effect: '4% more supported skill damage', family: 'damage_support', max: 2 },
} as const satisfies Record<string, { name: string; effect: string; family: GemFamily | 'shared'; max: number }>;

export type CutFacet = keyof typeof CUT_FACETS;
export const CUT_FACET_IDS = Object.keys(CUT_FACETS) as CutFacet[];

export const NAMED_CUTS = {
  heart: { name: 'Heart Cut', level: 80, facet: 'heartfire', effect: '15% more damage, 10% higher mana cost' },
  crown: { name: 'Crown Cut', level: 88, facet: 'sovereign', effect: '25% increased support effect' },
  starburst: { name: 'Starburst', level: 95, facet: 'radiant', effect: '+2 effective gem levels' },
} as const;
export type NamedCut = keyof typeof NAMED_CUTS;
export const NAMED_CUT_IDS = Object.keys(NAMED_CUTS) as NamedCut[];

const activeById = new Map(ACTIVE_GEMS.map((gem) => [gem.id, gem]));
const supportById = new Map(SUPPORT_GEMS.map((gem) => [gem.id, gem]));

export function facetFamilies(gem: ActiveGemDef | SupportGemDef): GemFamily[] {
  if (!('role' in gem)) return [DEFENCE_SUPPORTS.has(gem.id) ? 'defence' : 'damage_support'];
  const out: GemFamily[] = [];
  if (gem.tags.includes('attack')) out.push('attack');
  if (gem.tags.includes('spell')) out.push('elemental');
  if (gem.tags.includes('minion') || gem.tags.includes('totem') || gem.role === 'summon') out.push('summon');
  if (gem.role === 'guard' || gem.role === 'buff' || gem.role === 'sustain' || gem.role === 'curse') out.push('defence');
  return out;
}

export function facetGem(id: string): ActiveGemDef | SupportGemDef | undefined {
  return activeById.get(id) ?? supportById.get(id);
}

export function facetLabel(id: string): { name: string; effect: string } | undefined {
  if (Object.hasOwn(CUT_FACETS, id)) return CUT_FACETS[id as CutFacet];
  const named = Object.values(NAMED_CUTS).find(({ facet }) => facet === id);
  if (named) return { name: named.facet === 'heartfire' ? 'Heartfire' : named.facet === 'sovereign' ? 'Sovereign' : 'Radiant', effect: named.effect };
}
