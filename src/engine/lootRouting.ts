import { AUTO_SALVAGE_QUARTERMASTER_LEVEL } from '../data/hideout';
import type { Ctx } from './context';
import { benchBuilt, isCraftLocked, salvage } from './crafting';
import { stationLevel } from './hideout';
import { itemMatchesClass } from './items';
import { inGearSet } from './loadouts';
import { evaluateLootFilter, shouldSalvageByFilter, type LootFilterResult } from './lootFilter';
import { stashItems, stashPageFor } from './storage';
import type { GameState, Item } from './types';

/** Whether the filter and auto-salvage settings would salvage this item. Uniques never are. */
export function autoSalvages(s: GameState, item: Item, filter: LootFilterResult = evaluateLootFilter(s, item)): boolean {
  if (item.rarity === 'unique') return false;
  const unlocked = benchBuilt(s) && stationLevel(s, 'quartermaster') >= AUTO_SALVAGE_QUARTERMASTER_LEVEL[item.rarity];
  if (s.settings.autoSalvage[item.rarity] && unlocked) return true;
  if (s.settings.filterOffClassLoot && !itemMatchesClass(s.character.classId, item)) return true;
  const activeLegacy = s.settings.customLootFilters?.find((f) => f.id === s.settings.activeLootFilterId);
  if (activeLegacy && shouldSalvageByFilter(activeLegacy, item, s.character.classId)) return true;
  return filter.autoSalvage && (!!filter.salvageWithoutUnlock || unlocked);
}

export type InventoryFilterAction = 'stash' | 'salvage';

/**
 * What "Run filter" would do with an inventory item, or null to leave it. Items being crafted, in a gear
 * set or carrying a rune stay put, as with bulk salvage.
 */
export function inventoryFilterAction(s: GameState, item: Item): InventoryFilterAction | null {
  if (isCraftLocked(s, item.uid)) return null;
  const filter = evaluateLootFilter(s, item);
  if (filter.sendToStash && (item.rarity === 'unique' || stashPageFor(s, item) >= 0)) return 'stash';
  if (item.rune || inGearSet(s, item.uid)) return null;
  return autoSalvages(s, item, filter) ? 'salvage' : null;
}

/** Apply the loot filter's Send to stash and auto-salvage rules to everything in the inventory. */
export function runFilterOnInventory(s: GameState, ctx: Ctx): { stashed: number; salvaged: number } {
  const toStash: number[] = [];
  const toSalvage: number[] = [];
  for (const item of s.inventory) {
    const action = inventoryFilterAction(s, item);
    if (action === 'stash') toStash.push(item.uid);
    else if (action === 'salvage') toSalvage.push(item.uid);
  }
  const stashed = toStash.length ? stashItems(s, ctx, toStash) : 0;
  const salvaged = toSalvage.length ? salvage(s, ctx, toSalvage) : 0;
  if (stashed) ctx.emit({ t: 'info', text: `Sent ${stashed} item${stashed === 1 ? '' : 's'} to your stash`, tone: 'good' });
  if (!stashed && !salvaged) ctx.emit({ t: 'info', text: 'Your loot filter has nothing to do here', tone: 'warn' });
  return { stashed, salvaged };
}
