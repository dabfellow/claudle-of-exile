import { BAG_SIZE } from '../data/hideout';
import type { Ctx } from './context';
import { isCraftLocked, salvage } from './crafting';
import { equip, equipReason, unequip } from './equipment';
import { bagFull, pickUp, stashItems, stashPageRoom, takeFromStash } from './storage';
import type { EquipSlot, GameState, Item } from './types';

/**
 * The click menu on any item (Equip · To bag · To stash · Salvage), wherever the item is:
 * on the ground, in the offline haul, the bag, a stash page, or worn.
 */
export type ItemPlace =
  | { at: 'ground' | 'offlineHaul' | 'bag'; item: Item }
  | { at: 'stash'; page: number; item: Item }
  | { at: 'equipped'; slot: EquipSlot; item: Item };

export function locateItem(s: GameState, uid: number): ItemPlace | null {
  for (const at of ['ground', 'offlineHaul'] as const) {
    const item = s[at].find((i) => i.uid === uid);
    if (item) return { at, item };
  }
  const bag = s.inventory.find((i) => i.uid === uid);
  if (bag) return { at: 'bag', item: bag };
  for (let page = 0; page < s.stash.length; page++) {
    const item = s.stash[page].find((i) => i.uid === uid);
    if (item) return { at: 'stash', page, item };
  }
  for (const [slot, item] of Object.entries(s.equipment) as [EquipSlot, Item | undefined][]) {
    if (item?.uid === uid) return { at: 'equipped', slot, item };
  }
  return null;
}

/** Take an item out of wherever it is (not worn gear). */
function lift(s: GameState, p: ItemPlace): void {
  const uid = p.item.uid;
  if (p.at === 'ground' || p.at === 'offlineHaul') s[p.at] = s[p.at].filter((i) => i.uid !== uid);
  else if (p.at === 'bag') s.inventory = s.inventory.filter((i) => i.uid !== uid);
  else if (p.at === 'stash') s.stash[p.page] = s.stash[p.page].filter((i) => i.uid !== uid);
}

function firstStashPageWithRoom(s: GameState): number {
  return s.stash.findIndex((_, i) => stashPageRoom(s, i) > 0);
}

export function equipFromReason(s: GameState, uid: number): string | null {
  const p = locateItem(s, uid);
  if (!p) return 'Item not found';
  if (p.at === 'equipped') return 'Already worn';
  if (isCraftLocked(s, uid)) return 'Being crafted';
  return equipReason(s, p.item);
}

/** Equip from anywhere. Whatever it replaces goes to the bag, or back where the new item came from if the bag is full. */
export function equipFrom(s: GameState, ctx: Ctx, uid: number, slot?: EquipSlot): string | null {
  const reason = equipFromReason(s, uid);
  if (reason) return reason;
  const p = locateItem(s, uid)!;
  if (p.at === 'equipped') return 'Already worn';
  if (p.at !== 'bag') {
    lift(s, p);
    s.inventory.push(p.item);
  }
  const err = equip(s, ctx, uid, slot);
  if (err) {
    if (p.at !== 'bag') {
      s.inventory = s.inventory.filter((i) => i.uid !== uid);
      if (p.at === 'stash') s.stash[p.page].push(p.item);
      else s[p.at].push(p.item);
    }
    return err;
  }
  // equip() puts what it replaced at the end of the bag; past the bag's size, that goes where the new item came from
  while (p.at !== 'bag' && s.inventory.length > BAG_SIZE) {
    const back = s.inventory.pop()!;
    if (p.at === 'stash') s.stash[p.page].push(back);
    else s[p.at].push(back);
  }
  return null;
}

export function toBagReason(s: GameState, uid: number): string | null {
  const p = locateItem(s, uid);
  if (!p) return 'Item not found';
  if (p.at === 'bag') return 'Already in your bag';
  return bagFull(s) ? 'Your bag is full' : null;
}

export function moveToBag(s: GameState, ctx: Ctx, uid: number): string | null {
  const reason = toBagReason(s, uid);
  if (reason) return reason;
  const p = locateItem(s, uid)!;
  if (p.at === 'ground' || p.at === 'offlineHaul') pickUp(s, ctx, p.at, [uid]);
  else if (p.at === 'stash') takeFromStash(s, ctx, [uid]);
  else if (p.at === 'equipped') return unequip(s, p.slot);
  return null;
}

export function toStashReason(s: GameState, uid: number): string | null {
  const p = locateItem(s, uid);
  if (!p) return 'Item not found';
  if (p.at === 'stash') return 'Already in the stash';
  if (isCraftLocked(s, uid)) return 'Being crafted';
  return firstStashPageWithRoom(s) < 0 ? 'Your stash is full' : null;
}

export function moveToStash(s: GameState, ctx: Ctx, uid: number, page = 0): string | null {
  const reason = toStashReason(s, uid);
  if (reason) return reason;
  const p = locateItem(s, uid)!;
  if (p.at === 'bag') {
    stashItems(s, ctx, [uid], page);
    return null;
  }
  const target = stashPageRoom(s, page) > 0 ? page : firstStashPageWithRoom(s);
  if (p.at === 'equipped') delete s.equipment[p.slot];
  else lift(s, p);
  s.stash[target].push(p.item);
  return null;
}

export function salvageReason(s: GameState, uid: number): string | null {
  const p = locateItem(s, uid);
  if (!p) return 'Item not found';
  if (p.at === 'equipped') return 'Take it off first';
  if (isCraftLocked(s, uid)) return 'Being crafted';
  return null;
}

export function salvageAny(s: GameState, ctx: Ctx, uid: number): string | null {
  const reason = salvageReason(s, uid);
  if (reason) return reason;
  const p = locateItem(s, uid)!;
  if (p.at === 'ground' || p.at === 'offlineHaul') {
    // straight off the floor: same dust as from the bag
    lift(s, p);
    s.inventory.push(p.item);
  }
  salvage(s, ctx, [uid]);
  return null;
}

