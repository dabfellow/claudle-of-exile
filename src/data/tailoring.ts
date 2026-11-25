import type { MaterialDef } from './materials';
import type { SkillAction } from './skills';

/**
 * Tailoring's own stock (owner's call, 2026-11-24): fibre turns up while Foraging, raw hides are bought with gold at
 * the Tailoring page's hide stall, and Tailoring weaves the cloth and tans the leather its armour is sewn from.
 * Three tiers, matching the ash/oak/yew gear tiers.
 */
export interface TailorTier { level: number; fibre: string; cloth: string; hide: string; leather: string; log: string; hidePrice: number; color: string; area?: string }

export const TAILOR_TIERS: TailorTier[] = [
  { level: 1, fibre: 'flax', cloth: 'linen_cloth', hide: 'rough_hide', leather: 'rough_leather', log: 'ash_log', hidePrice: 15, color: '#d8c8a0' },
  { level: 15, fibre: 'cotton', cloth: 'cotton_cloth', hide: 'thick_pelt', leather: 'thick_leather', log: 'oak_log', hidePrice: 40, color: '#e8ecf2', area: 'ashwood' },
  { level: 30, fibre: 'wild_silk', cloth: 'silk_cloth', hide: 'scaled_hide', leather: 'scaled_leather', log: 'yew_log', hidePrice: 100, color: '#c88ad8', area: 'shipgrave' },
];

/** Fibre found while Foraging: which patch turns up which fibre. Emberroot and every later patch give wild silk. */
export const FIBRE_CHANCE = 0.25;
export function fibreForPatch(level: number): string {
  return level < 12 ? 'flax' : level < 25 ? 'cotton' : 'wild_silk';
}

export const TAILORING_MATERIALS: MaterialDef[] = [
  { id: 'flax', name: 'Flax', kind: 'component', color: '#d6b46a', value: 2, desc: 'Found while foraging Sunpetal patches. Tailoring weaves it into Linen.' },
  { id: 'cotton', name: 'Cotton', kind: 'component', color: '#eef0f4', value: 5, desc: 'Found while foraging Frostleaf patches. Tailoring weaves it into Cotton Cloth.' },
  { id: 'wild_silk', name: 'Wild Silk', kind: 'component', color: '#e8cf86', value: 12, desc: 'Found while foraging Emberroot and every deeper patch. Tailoring weaves it into Silk.' },
  { id: 'linen_cloth', name: 'Linen', kind: 'component', color: '#d8c8a0', value: 12, desc: 'Woven from Flax. Cloth for early robes, hoods and slippers.' },
  { id: 'cotton_cloth', name: 'Cotton Cloth', kind: 'component', color: '#e8ecf2', value: 30, desc: 'Woven from Cotton. Cloth for mid-level robes.' },
  { id: 'silk_cloth', name: 'Silk', kind: 'component', color: '#c88ad8', value: 70, desc: 'Woven from Wild Silk. Cloth for the finest robes.' },
  { id: 'rough_hide', name: 'Rough Hide', kind: 'component', color: '#a0643a', value: 8, desc: 'Bought at the Tailoring hide stall. Tanned into Rough Leather.' },
  { id: 'thick_pelt', name: 'Thick Pelt', kind: 'component', color: '#c0562c', value: 20, desc: 'Bought at the Tailoring hide stall. Tanned into Thick Leather.' },
  { id: 'scaled_hide', name: 'Scaled Hide', kind: 'component', color: '#6c6458', value: 50, desc: 'Bought at the Tailoring hide stall. Tanned into Scaled Leather.' },
  { id: 'rough_leather', name: 'Rough Leather', kind: 'component', color: '#b0703c', value: 14, desc: 'Tanned from Rough Hide with ash bark. Leather for early jerkins, caps and boots.' },
  { id: 'thick_leather', name: 'Thick Leather', kind: 'component', color: '#744222', value: 34, desc: 'Tanned from Thick Pelt with oak bark. Leather for mid-level armour.' },
  { id: 'scaled_leather', name: 'Scaled Leather', kind: 'component', color: '#762222', value: 80, desc: 'Tanned from Scaled Hide with yew bark. Leather for the finest armour.' },
];

/** Raw XP; the action registry applies its 0.3 scale once. Ids stay stable for mastery. */
export const TAILORING_ACTIONS: SkillAction[] = TAILOR_TIERS.flatMap((t, tier): SkillAction[] => [
  {
    id: `weave_${t.cloth}`, skill: 'tailoring', name: `Weave ${t.cloth === 'linen_cloth' ? 'Linen' : t.cloth === 'silk_cloth' ? 'Silk' : 'Cotton Cloth'}`,
    level: t.level, intervalMs: 4000 + tier * 500, xp: [10, 24, 48][tier], inputs: { [t.fibre]: 4 }, outputs: { [t.cloth]: 1 }, color: t.color, area: t.area,
  },
  {
    id: `tan_${t.leather}`, skill: 'tailoring', name: `Tan ${['Rough', 'Thick', 'Scaled'][tier]} Leather`,
    level: t.level, intervalMs: 5000 + tier * 500, xp: [12, 28, 54][tier], inputs: { [t.hide]: 1, [t.log]: 2 }, outputs: { [t.leather]: 1 }, color: '#a0643a', area: t.area,
  },
]);

/** What a piece of cloth or leather armour is sewn from: robes take cloth, leather takes leather, hybrids both. */
export function tailorInputs(tags: readonly string[], size: number, tier: number): Record<string, number> {
  const t = TAILOR_TIERS[tier];
  const total = size + tier;
  const cloth = tags.includes('int_armour'), leather = tags.includes('dex_armour');
  if (cloth && leather) return { [t.leather]: Math.ceil(total / 2), [t.cloth]: Math.max(1, Math.floor(total / 2)) };
  return { [cloth ? t.cloth : t.leather]: total };
}
