import { CHART_MATERIALS } from './cartography';
import { ASTROLOGY_MATERIALS } from './astrology';
import { COOKING_MATERIALS } from './cooking';
import { CRAFT_MATERIALS } from './craftMats';
import { EXPEDITION_MATERIALS } from './expedition';
import { RUNE_MATERIALS } from './runes';
import { MINING_METALS } from './mining';
import { WOODS } from './woodcutting';
import { FURNACE_MATERIALS } from './smelting';
import { DELVE_ROUGH_SIZES } from './delve';

export type MaterialKind = 'ore' | 'log' | 'component' | 'trophy' | 'herb' | 'gem' | 'dust' | 'fossil' | 'essence' | 'resin' | 'shard' | 'contraband' | 'rune' | 'artifact' | 'ingredient' | 'food' | 'chart' | 'currency' | 'gold' | 'fish';

export interface MaterialDef {
  id: string;
  name: string;
  kind: MaterialKind;
  /** CSS colour used for the material's swatch/orb icon */
  color: string;
  desc?: string;
  /** gold value when sold to the vendor */
  value: number;
}

export const MATERIALS: MaterialDef[] = [
  { id: 'exceptional_crystal', name: 'Exceptional Crystal', kind: 'component', color: '#d0569b', value: 0, desc: 'Gemcutting 60: cut 10 Mining Crystal Shards and 5 Rough Gems into one protected crystal. Used by Winter’s Pyre and later projects.' },
  { id: 'convergence_crystal', name: 'Convergence Crystal', kind: 'component', color: '#4fc1a6', value: 0, desc: 'Gemcutting 85: polish an Exceptional Crystal with Arcane Dust into a flawless convergence crystal. Component for the Sum of All Things pinnacle project.' },
  { id: 'inscription_fragment', name: 'Inscription Fragment', kind: 'component', color: '#6fa8ff', value: 0, desc: 'One every 20 ordinary grade 2+ rune completions plus 1% extra, counted once despite manual bonus copies. Ten and a Keen grade 3 rune make a Return Inscription.' },
  { id: 'return_inscription', name: 'Return Inscription', kind: 'component', color: '#6fa8ff', value: 0, desc: 'Rune-carving 65: 10 Inscription Fragments + 1 Keen grade 3 rune. Two are used in The Homecoming project.' },
  { id: 'choir_inscription', name: 'Choir Inscription', kind: 'component', color: '#d6453d', value: 0, desc: 'Rune-carving 70: 10 Inscription Fragments + 1 Blood grade 3 rune. Two are used in the Hands of the Forgotten Choir project.' },
  { id: 'circuit_inscription', name: 'Circuit Inscription', kind: 'component', color: '#f2d14c', value: 0, desc: 'Rune-carving 70: 10 Inscription Fragments + 1 Storm grade 3 rune. Two are used in the Hollow Circuit project.' },
  { id: 'convergence_inscription', name: 'Convergence Inscription', kind: 'component', color: '#9b8e7e', value: 0, desc: 'Rune-carving 90: 5 Inscription Fragments + 1 Stone grade 4 rune. Protected component for the Sum of All Things pinnacle project.' },
  { id: 'treasury_fragment', name: 'Treasury Fragment', kind: 'component', color: '#c9a35a', value: 0, desc: 'Awarded for completing rooms in The Occult Treasury. 120 fragments claim Borrowed Tomorrow at Thieving 65.' },
  { id: 'oath_fragment', name: 'Oath Fragment', kind: 'component', color: '#e8c25a', value: 0, desc: 'Awarded from clean Occult Treasury vaults and every 12 completed rooms. Five assemble a Stolen Oath Seal at Thieving 75.' },
  { id: 'stolen_oath_seal', name: 'Stolen Oath Seal', kind: 'component', color: '#f7e08a', value: 0, desc: 'Thieving 75: assembled from 5 Oath Fragments. Protected component for The Second Heresy pinnacle project.' },
  { id: 'gold', name: 'Gold', kind: 'gold', color: '#e8c25a', value: 1 },

  { id: 'copper_ore', name: 'Copper Ore', kind: 'ore', color: '#c8743f', value: 2 },
  { id: 'iron_ore', name: 'Iron Ore', kind: 'ore', color: '#9aa3ad', value: 5 },
  { id: 'mithril_ore', name: 'Mithril Ore', kind: 'ore', color: '#6fc3d8', value: 12 },
  { id: 'rough_gem', name: 'Rough Gem', kind: 'gem', color: '#d0569b', value: 25 },
  { id: 'rough_gem_star', name: 'Star Stone', kind: 'gem', color: '#f1ce83', value: 25, desc: 'Three carats and one wild facet. Used at the Gemcutting wheel.' },
  ...DELVE_ROUGH_SIZES.filter(({ id }) => id !== 'rough_gem').map(({ id, name, carats }): MaterialDef => ({
    id, name, kind: 'gem', color: '#d0569b', value: 25, desc: `${carats} carat${carats === 1 ? '' : 's'}. Can be used in recipes that call for rough gems.`,
  })),
  { id: 'rubble', name: 'Rubble', kind: 'ore', color: '#927b69', value: 0, desc: 'Gathered in the Delve. Used for mine supports, installations and furnace supplies.' },
  { id: 'mine_support', name: 'Mine Support', kind: 'component', color: '#a88a62', value: 0, desc: 'Made from rubble to brace the shaft as you push deeper into the Delve.' },
  { id: 'heartstone', name: 'Heartstone', kind: 'ore', color: '#e97575', value: 0, desc: 'Rarely found in deep Delve caverns. Used in Wound Alloy and Stone Alloy.' },
  ...FURNACE_MATERIALS,
  ...MINING_METALS.slice(3).map((m): MaterialDef => ({ id: `${m.id}_ore`, name: `${m.name} Ore`, kind: 'ore', color: m.color, value: 0, desc: `Smelt 5 into one ${m.name} Bar in Smithing at level ${m.level}; select refining separately.` })),
  ...MINING_METALS.slice(3).map((m): MaterialDef => ({ id: `${m.id}_bar`, name: `${m.name} Bar`, kind: 'component', color: m.color, value: 0, desc: `${m.name} Ore refined in Smithing. Adamant feeds Stone Alloy; other advanced bars are stock for later projects. Finished uniques remain unavailable.` })),
  ...([
    ['tempered_alloy', 'Tempered Alloy', 'Two Iron Bars and one Copper Bar; used by Woundmaker and The Homecoming projects.'],
    ['wound_alloy', 'Wound Alloy', 'Five Mithril Bars, two Copper Bars and ten Mineral Fragments; makes Convergence Frames and Woundmaker.'],
    ['stone_alloy', 'Stone Alloy', 'Five Adamant Bars, two Iron Bars and ten Stone Fragments; used by The Buried Grudge, Debt of Stone, and Convergence Frames.'],
    ['heartwood_frame', 'Heartwood Frame', 'One Ancient Heartwood and five Yew Planks; used by Winter’s Pyre, The Homecoming, and Debt of Stone.'],
    ['convergence_frame', 'Convergence Frame', 'One Wound Alloy, one Stone Alloy and one Ancient Heartwood; stock for the later Sum of All Things.'],
    ['prepared_glass', 'Prepared Glass', 'Three Rough Gems and ten Sunpetal refined at Alchemy Table 3. Used by Witchglass and The Still Heart flask projects.'],
    ['moon_distillate', 'Moon Distillate', 'Two Moon Blooms and ten Frostleaf refined at Alchemy Table 3. Used by Witchglass and The Still Heart projects.'],
    ['star_distillate', 'Star Distillate', 'Two Star Blooms and ten Voidbloom refined at Alchemy Table 3. Used by the Witchglass project.'],
  ] as const).map(([id, name, desc]): MaterialDef => ({ id, name, kind: 'component', color: '#d6b67b', value: 0, desc: `${desc} Protected full-cost refinement; unfinished unique recipes remain unavailable.` })),
  { id: 'crystal_shard', name: 'Crystal Shard', kind: 'component', color: '#d0569b', value: 0, desc: 'Found from Crystal deposits. Gemcutting 60 cuts ten shards and five Rough Gems into one Exceptional Crystal for Winter’s Pyre.' },
  { id: 'mineral_fragment', name: 'Mineral Fragment', kind: 'component', color: '#6fc3d8', value: 0, desc: 'Found from Mithril+ deposits. Saved for future Wound Alloy and project frames.' },
  { id: 'stone_fragment', name: 'Stone Fragment', kind: 'component', color: '#8ca8c0', value: 0, desc: 'Found from Adamant+ deposits. Saved for future Stone Alloy and project frames.' },

  { id: 'copper_bar', name: 'Copper Bar', kind: 'component', color: '#c8743f', value: 10, desc: 'Smelted from Copper Ore for hideout construction.' },
  { id: 'iron_bar', name: 'Iron Bar', kind: 'component', color: '#9aa3ad', value: 25, desc: 'Smelted from Iron Ore for hideout construction.' },
  { id: 'mithril_bar', name: 'Mithril Bar', kind: 'component', color: '#6fc3d8', value: 60, desc: 'Smelted from Mithril Ore for advanced hideout construction.' },

  { id: 'ash_log', name: 'Ash Log', kind: 'log', color: '#b89a72', value: 2 },
  { id: 'oak_log', name: 'Oak Log', kind: 'log', color: '#8a6338', value: 5 },
  { id: 'yew_log', name: 'Yew Log', kind: 'log', color: '#6b3d2c', value: 12 },
  ...WOODS.slice(3).flatMap((w): MaterialDef[] => [
    { id: `${w.id}_log`, name: `${w.name} Log`, kind: 'log', color: w.color, value: 0, desc: 'Refine five into one matching plank. Stock for future Smithing bow, staff and defensive components; component recipes not available yet.' },
    { id: `${w.id}_plank`, name: `${w.name} Plank`, kind: 'component', color: w.color, value: 0, desc: 'Refined timber for future Smithing bow, staff and defensive components; component recipes not available yet.' },
  ]),
  { id: 'heartwood_fragment', name: 'Heartwood Fragment', kind: 'component', color: '#c49b60', value: 0, desc: 'Found from Ancient Heartwood Surveys and ancient timber. Refine 20 into Ancient Heartwood; future signature runes also use fragments.' },
  { id: 'ancient_heartwood', name: 'Ancient Heartwood', kind: 'component', color: '#c49b60', value: 0, desc: 'Refined from 20 Heartwood Fragments. Smithing makes Heartwood Frames at level 45/Forge 3, or Convergence Frames at level 85/Forge 3. Finished unique recipes remain unavailable.' },

  { id: 'splinters', name: 'Splinters', kind: 'component', color: '#a88a62', value: 0, desc: 'What is left on a giant when it falls before its crown and limbs are cut. Burns well: Smelting uses them as charcoal fuel.' },
  { id: 'legend_heartwood', name: 'Legend Heartwood', kind: 'component', color: '#f2d28a', value: 0, desc: 'The heart of a named legendary giant. Stock for Woodcrafting living woods.' },
  { id: 'world_tree_seed', name: 'World Tree Seed', kind: 'component', color: '#6ed5a9', value: 0, desc: 'A very rare seed from a legendary giant. Plant it at the lodge (needs the Trophy Wall): it grows for 120 days into your own World Tree.' },
  { id: 'world_tree_heart', name: 'World Tree Heart', kind: 'component', color: '#9ff0c8', value: 0, desc: 'The heart of your own World Tree. Kept for future uniques.' },
  { id: 'ash_plank', name: 'Ash Plank', kind: 'component', color: '#b89a72', value: 10, desc: 'Cut from Ash Logs for hideout construction.' },
  { id: 'oak_plank', name: 'Oak Plank', kind: 'component', color: '#8a6338', value: 25, desc: 'Cut from Oak Logs for hideout construction.' },
  { id: 'yew_plank', name: 'Yew Plank', kind: 'component', color: '#6b3d2c', value: 60, desc: 'Cut from Yew Logs for advanced hideout construction.' },
  { id: 'boss_trophy', name: 'Boss Trophy', kind: 'trophy', color: '#d7b56d', value: 100, desc: 'Proof of a boss victory. Advanced hideout upgrades demand a few.' },

  { id: 'sunpetal', name: 'Sunpetal', kind: 'herb', color: '#f2c94c', value: 2 },
  { id: 'frostleaf', name: 'Frostleaf', kind: 'herb', color: '#7fc8f8', value: 5 },
  { id: 'emberroot', name: 'Emberroot', kind: 'herb', color: '#e2603f', value: 10 },
  { id: 'voidbloom', name: 'Voidbloom', kind: 'herb', color: '#9b6dde', value: 20 },
  { id: 'moon_bloom', name: 'Moon Bloom', kind: 'herb', color: '#b3d7fa', value: 0, desc: 'Gathered from Moon Bloom Patches or grown in the Greenhouse. Stock for later distillates, signature meals and binding stock.' },
  { id: 'star_bloom', name: 'Star Bloom', kind: 'herb', color: '#d4a9ff', value: 0, desc: 'Gathered from Star Bloom Patches or grown in the Greenhouse. Stock for later distillates, signature meals and feasts.' },

  // Fishing is coming soon: nothing can catch these yet
  { id: 'mudskipper', name: 'Mudskipper', kind: 'fish', color: '#8a7b5a', value: 2 },
  { id: 'blind_brinefish', name: 'Blind Brinefish', kind: 'fish', color: '#5f8f9e', value: 5 },
  { id: 'reed_eel', name: 'Reed Eel', kind: 'fish', color: '#3f6a4a', value: 9 },
  { id: 'drowned_grouper', name: 'Drowned Grouper', kind: 'fish', color: '#3d5f8a', value: 14 },
  { id: 'thunder_marlin', name: 'Thunder Marlin', kind: 'fish', color: '#f2d14c', value: 25 },
  { id: 'soggy_boot', name: 'Soggy Boot', kind: 'fish', color: '#6b5a44', value: 0, desc: 'Still better than your current boots.' },
  { id: 'message_bottle', name: 'Message in a Bottle', kind: 'fish', color: '#9fd2c8', value: 10, desc: '"Fishing soon." The note is very old.' },
  { id: 'tasalio_scale', name: "Tasalio's Scale", kind: 'fish', color: '#4fc1e8', value: 500, desc: 'The god of water is watching. He is not impressed.' },

  { id: 'arcane_dust', name: 'Arcane Dust', kind: 'dust', color: '#b9a7ff', value: 3, desc: 'Salvaged from items. Used in Alchemy.' },

  ...CRAFT_MATERIALS,
  ...RUNE_MATERIALS,
  ...EXPEDITION_MATERIALS,
  ...COOKING_MATERIALS,
  ...CHART_MATERIALS,
  ...ASTROLOGY_MATERIALS,
];

export interface CurrencyDef extends MaterialDef {
  short: string;
  desc: string;
  /** relative drop weight from monsters (0 = never drops) */
  dropWeight: number;
  /** first zone tier (1-based) where it can drop */
  minTier: number;
}

const cur = (
  id: string,
  name: string,
  short: string,
  color: string,
  desc: string,
  dropWeight: number,
  minTier: number,
  value: number,
): CurrencyDef => ({ id, name, short, color, desc, dropWeight, minTier, value, kind: 'currency' });

export const CURRENCIES: CurrencyDef[] = [
  cur('transmute', 'Orb of Transmutation', 'Trans', '#7fb2ff', 'Upgrades a normal item to a magic item.', 40, 1, 2),
  cur('augment', 'Orb of Augmentation', 'Aug', '#5f8de0', 'Adds a random modifier to a magic item with room.', 28, 1, 3),
  cur('alteration', 'Orb of Alteration', 'Alt', '#9fd2ff', 'Rerolls the modifiers of a magic item.', 30, 1, 3),
  cur('regal', 'Regal Orb', 'Regal', '#e6d17a', 'Upgrades a magic item to rare, adding a modifier.', 7, 1, 15),
  cur('alchemy', 'Orb of Alchemy', 'Alch', '#f0c14b', 'Upgrades a normal item to a rare item.', 6, 2, 20),
  cur('scour', 'Orb of Scouring', 'Scour', '#d9d9d9', 'Removes all modifiers, making the item normal.', 7, 1, 10),
  cur('chaos', 'Chaos Orb', 'Chaos', '#c9a227', 'Rerolls the modifiers of a rare item.', 4, 2, 40),
  cur('annul', 'Orb of Annulment', 'Annul', '#f2f2f2', 'Removes a random modifier from an item.', 1.2, 3, 120),
  cur('exalted', 'Exalted Orb', 'Exalt', '#f7e08a', 'Adds a random modifier to a rare item with room.', 0.5, 3, 300),
  cur('divine', 'Divine Orb', 'Divine', '#ffe9b0', 'Rerolls the values of all modifiers on an item.', 0.6, 3, 250),
  cur('fractured', 'Fractured Orb', 'Fracture', '#d4af37', 'Permanently locks a random modifier on a rare item with at least 4 modifiers.', 0, 8, 600),
  cur('regret', 'Orb of Regret', 'Regret', '#8fbf7a', 'Refunds one allocated passive skill point.', 4, 1, 10),
  cur('expansion', 'Orb of Expansion', 'Expand', '#c08bff', 'Adds a support socket to a skill gem.', 0.4, 2, 250),
  cur('instill', 'Instilling Orb', 'Instill', '#ff9f5a', 'Makes a flask use itself automatically on a condition.', 1, 2, 200),
];

const ALL = [...MATERIALS, ...CURRENCIES];
const BY_ID: Record<string, MaterialDef> = Object.fromEntries(ALL.map((m) => [m.id, m]));

export function materialDef(id: string): MaterialDef {
  const d = BY_ID[id];
  if (!d) throw new Error(`Unknown material ${id}`);
  return d;
}

/** Whether an id names a material at all (a save or an older build can hold one that's gone). */
export function isMaterial(id: string): boolean {
  return !!BY_ID[id];
}

export function isCurrency(id: string): boolean {
  return BY_ID[id]?.kind === 'currency';
}

export function currencyDef(id: string): CurrencyDef {
  return CURRENCIES.find((c) => c.id === id)!;
}
