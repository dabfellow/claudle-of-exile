import { AUTO_SALVAGE_QUARTERMASTER_LEVEL } from '../data/hideout';
import { claimOwned } from './account';
import type { Ctx } from './context';
import { benchBuilt, isCraftLocked, salvage } from './crafting';
import { stationLevel } from './hideout';
import { itemMatchesClass } from './items';
import { inGearSet } from './loadouts';
import { evaluateLootFilter, shouldSalvageByFilter, type LootFilterResult } from './lootFilter';
import { bagFull, dropItem, itemAffinity, shelveUnique, stashItems, stashPageRoom } from './storage';
import type { GameState, Item } from './types';

/*
 * Where loot goes (docs/MILESTONES.md, "Inventory, stash and crafting merge"): the player is the filter.
 * A drop is auto-salvaged (once that's unlocked), hidden, sent to the stash by a "Send to stash" rule,
 * or otherwise lands in the inventory. Only when the inventory is full does it spill onto the ground
 * (or the time-away pile), where deaths can take it.
 */

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

/** The stash page a new item would go to: an affinity page with room, else the first page with room. -1 when full. */
function stashPageFor(s: GameState, item: Item): number {
  const aff = itemAffinity(item);
  const affinityPage = Object.entries(s.account.stashAffinities ?? {}).find(([p, a]) => a === aff && stashPageRoom(s, Number(p)) > 0);
  if (affinityPage) return Number(affinityPage[0]);
  return s.account.stash.findIndex((_, p) => stashPageRoom(s, p) > 0);
}

/** Put a fresh drop straight into the stash. False when there's no room (uniques always fit). */
function stashDrop(s: GameState, item: Item): boolean {
  if (item.rarity === 'unique') {
    shelveUnique(s, item);
    return true;
  }
  const page = stashPageFor(s, item);
  if (page < 0) return false;
  s.account.stash[page].push(claimOwned(s, item));
  return true;
}

/**
 * A kept drop (not salvaged, not hidden): to the stash if a rule says so and there's room, else the
 * inventory, else the ground or time-away pile. Returns where it went.
 */
export function routeDrop(s: GameState, ctx: Ctx, item: Item, filter: LootFilterResult): 'stash' | 'inventory' | 'ground' {
  if (filter.sendToStash && stashDrop(s, item)) return 'stash';
  if (!bagFull(s)) {
    s.inventory.push(item);
    return 'inventory';
  }
  dropItem(s, ctx, item);
  return 'ground';
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
