import { COOKING_MATERIALS } from './cooking';
import { CRAFT_MATERIALS } from './craftMats';
import { EXPEDITION_MATERIALS } from './expedition';
import { RUNE_MATERIALS } from './runes';

export type MaterialKind = 'ore' | 'log' | 'herb' | 'gem' | 'dust' | 'fossil' | 'essence' | 'resin' | 'shard' | 'contraband' | 'rune' | 'artifact' | 'ingredient' | 'food' | 'currency' | 'gold' | 'fish';

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
  { id: 'gold', name: 'Gold', kind: 'gold', color: '#e8c25a', value: 1 },

  { id: 'copper_ore', name: 'Copper Ore', kind: 'ore', color: '#c8743f', value: 2 },
  { id: 'iron_ore', name: 'Iron Ore', kind: 'ore', color: '#9aa3ad', value: 5 },
  { id: 'mithril_ore', name: 'Mithril Ore', kind: 'ore', color: '#6fc3d8', value: 12 },
  { id: 'rough_gem', name: 'Rough Gem', kind: 'gem', color: '#d0569b', value: 25 },

  { id: 'ash_log', name: 'Ash Log', kind: 'log', color: '#b89a72', value: 2 },
  { id: 'oak_log', name: 'Oak Log', kind: 'log', color: '#8a6338', value: 5 },
  { id: 'yew_log', name: 'Yew Log', kind: 'log', color: '#6b3d2c', value: 12 },

  { id: 'sunpetal', name: 'Sunpetal', kind: 'herb', color: '#f2c94c', value: 2 },
  { id: 'frostleaf', name: 'Frostleaf', kind: 'herb', color: '#7fc8f8', value: 5 },
  { id: 'emberroot', name: 'Emberroot', kind: 'herb', color: '#e2603f', value: 10 },
  { id: 'voidbloom', name: 'Voidbloom', kind: 'herb', color: '#9b6dde', value: 20 },

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
  cur('regret', 'Orb of Regret', 'Regret', '#8fbf7a', 'Refunds one allocated passive skill point.', 4, 1, 10),
  cur('expansion', 'Orb of Expansion', 'Expand', '#c08bff', 'Adds a support socket to a skill gem.', 0.4, 2, 250),
  cur('instill', 'Instilling Orb', 'Instill', '#ff9f5a', 'Makes a flask use itself automatically on a condition.', 1, 4, 200),
];

const ALL = [...MATERIALS, ...CURRENCIES];
const BY_ID: Record<string, MaterialDef> = Object.fromEntries(ALL.map((m) => [m.id, m]));

export function materialDef(id: string): MaterialDef {
  const d = BY_ID[id];
  if (!d) throw new Error(`Unknown material ${id}`);
  return d;
}

export function isCurrency(id: string): boolean {
  return BY_ID[id]?.kind === 'currency';
}

export function currencyDef(id: string): CurrencyDef {
  return CURRENCIES.find((c) => c.id === id)!;
}
