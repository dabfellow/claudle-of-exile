import { baseDef } from '../data/bases';
import { weaponDps } from './compare';
import { equipReason } from './equipment';
import { itemDefences } from './stats';
import type { GameState, Item, Rarity } from './types';

export type SortKey = 'recent' | 'rarity' | 'slot' | 'ilvl' | 'equip' | 'dps' | 'defence';

/** The Stash screen offers every sort; other screens stick to the first three. */
export const STASH_SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'rarity', label: 'Rarity' },
  { key: 'slot', label: 'Slot' },
  { key: 'ilvl', label: 'Item level' },
  { key: 'equip', label: 'Can equip' },
  { key: 'dps', label: 'Weapon DPS' },
  { key: 'defence', label: 'Defence' },
];

const RARITY_ORDER: Record<Rarity, number> = { unique: 0, rare: 1, magic: 2, normal: 3 };

/** Armour, evasion and energy shield added up, as listed on the item. Only armour pieces and shields have any. */
export function itemDefence(item: Item): number {
  if (!baseDef(item.baseId).tags.includes('armour')) return 0;
  const def = itemDefences(item);
  return def.armour + def.evasion + def.energyShield;
}

/** Highest first, ties by item level. Equal items stay newest first. */
function byValue(items: Item[], value: (item: Item) => number): Item[] {
  const worth = new Map(items.map((i) => [i.uid, value(i)]));
  return [...items].reverse().sort((a, b) => worth.get(b.uid)! - worth.get(a.uid)! || b.ilvl - a.ilvl);
}

export function sortItems(items: Item[], key: SortKey, s: GameState): Item[] {
  const list = [...items];
  if (key === 'recent') return list.reverse();
  if (key === 'rarity') return list.sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || b.ilvl - a.ilvl);
  if (key === 'slot') return list.sort((a, b) => baseDef(a.baseId).slot.localeCompare(baseDef(b.baseId).slot));
  if (key === 'ilvl') return byValue(list, (i) => i.ilvl);
  if (key === 'equip') return byValue(list, (i) => (equipReason(s, i) === null ? 1 : 0));
  return byValue(list, key === 'dps' ? weaponDps : itemDefence);
}

/** The number a sort goes by, for the tile to show. Null when the tile already shows it, or the item has none. */
export function sortFigure(item: Item, key: SortKey): string | null {
  if (key === 'dps') {
    const dps = weaponDps(item);
    return dps ? `${dps.toFixed(1)} DPS` : null;
  }
  if (key === 'defence') {
    const def = itemDefence(item);
    return def ? `${def} def` : null;
  }
  return null;
}
