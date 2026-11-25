import { addBank } from './bank';
import type { Ctx } from './context';
import { benchBuilt } from './crafting';
import { salvageValue } from './items';
import { addStashItem, bagFull, stashPageRoom } from './storage';
import type { GameState, Item } from './types';

export function hasCraftOutputRoom(s: GameState, rarity?: Item['rarity']): boolean {
  return !bagFull(s) || rarity === 'unique' || s.storage.stash.some((_, page) => stashPageRoom(s, page) > 0);
}

export function storeCraftOutput(s: GameState, item: Item): boolean {
  if ((s.settings.craftFillFirst === 'stash' || bagFull(s)) && addStashItem(s, item)) return true;
  if (bagFull(s)) return false;
  s.inventory.push(item);
  return true;
}

export function autoSalvagesCraftOutput(s: GameState): boolean {
  return !!s.settings.autoSalvageCraftedGear && benchBuilt(s);
}

export function salvageCraftOutput(s: GameState, ctx: Ctx, item: Item): void {
  addBank(s, 'arcane_dust', salvageValue(item));
  s.lifetime.salvaged += 1;
  ctx.emit({ t: 'loot', item, salvaged: true });
}
