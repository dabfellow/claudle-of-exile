import { attributeReq, baseDef } from '../data/bases';
import type { Ctx } from './context';
import { inventoryFull } from './hideout';
import { deriveStats } from './stats';
import type { EquipSlot, GameState, Item } from './types';
import { characterLevel } from './character';

export function slotsFor(item: Item): EquipSlot[] {
  const slot = baseDef(item.baseId).slot;
  return slot === 'ring' ? ['ring1', 'ring2'] : [slot];
}

const ATTR_NAME = { str: 'Strength', dex: 'Dexterity', int: 'Intelligence' };

export function equipReason(s: GameState, item: Item): string | null {
  const base = baseDef(item.baseId);
  if (characterLevel(s) < base.reqLevel) return `Requires level ${base.reqLevel}`;
  const have = deriveStats(s, []).attributes;
  for (const [attr, need] of Object.entries(attributeReq(base)) as [keyof typeof have, number][]) {
    if (have[attr] < need) return `Requires ${need} ${ATTR_NAME[attr]}`;
  }
  return null;
}

/** Equip an inventory item; the replaced item goes back to the inventory. */
export function equip(s: GameState, ctx: Ctx, uid: number, slot?: EquipSlot): string | null {
  const idx = s.inventory.findIndex((i) => i.uid === uid);
  if (idx < 0) return 'Item not in inventory';
  const item = s.inventory[idx];
  const reason = equipReason(s, item);
  if (reason) return reason;
  const options = slotsFor(item);
  const target = slot && options.includes(slot) ? slot : (options.find((o) => !s.equipment[o]) ?? options[0]);
  s.inventory.splice(idx, 1);
  const prev = s.equipment[target];
  if (prev) s.inventory.splice(idx, 0, prev);
  s.equipment[target] = item;
  ctx.emit({ t: 'equip', uid });
  return null;
}

export function unequip(s: GameState, slot: EquipSlot): string | null {
  const item = s.equipment[slot];
  if (!item) return null;
  if (inventoryFull(s)) return 'Inventory full';
  delete s.equipment[slot];
  s.inventory.push(item);
  return null;
}
