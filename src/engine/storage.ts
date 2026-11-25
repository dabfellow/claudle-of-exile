import { bagSize, groundCap, offlineHaulCap, STASH_PAGE_GROWTH, STASH_PAGE_PRICE, STASH_PAGE_SIZE } from '../data/hideout';
import { claimOwned, freeStashPages, seeUnique } from './account';
import { addBank, canAfford, payCost } from './bank';
import type { Ctx } from './context';
import { isCraftLocked } from './crafting';
import { salvageValue } from './items';
import type { GameState, Item, StashAffinity } from './types';

// Character gear lives on the ground, in the bag (`inventory`), in the personal Stash or in equipment. See docs/GAME.md.

/** How many items the inventory holds: grows with the Stash station. */
export function bagCap(s: GameState): number {
  return bagSize(s.account.hideout.stash ?? 1);
}

export function bagFull(s: GameState): boolean {
  return s.inventory.length >= bagCap(s);
}

/** A drop lands on the ground, or in the offline haul while you're away; the oldest falls off past the cap. */
export function dropItem(s: GameState, ctx: Ctx, item: Item): void {
  const pile = ctx.offline ? s.offlineHaul : s.ground;
  pile.push(item);
  const stashLvl = s.account.hideout.stash ?? 1;
  const cap = ctx.offline ? offlineHaulCap(stashLvl) : groundCap(stashLvl);
  if (pile.length > cap) pile.splice(0, pile.length - cap);
}

/** A death marks everything on the ground; a second one loses whatever marked is still there. Returns how many were lost. */
export function groundOnDeath(s: GameState): number {
  const marked = new Set(s.groundMarked);
  const before = s.ground.length;
  s.ground = s.ground.filter((i) => !marked.has(i.uid));
  s.groundMarked = s.ground.map((i) => i.uid);
  return before - s.ground.length;
}

/** How many items on the ground the next death would lose. */
export function groundAtRisk(s: GameState): number {
  const marked = new Set(s.groundMarked);
  return s.ground.filter((i) => marked.has(i.uid)).length;
}

export type Pile = 'ground' | 'offlineHaul';

/** Move items from a pile into the bag, as many as fit. Returns how many were picked up. */
export function pickUp(s: GameState, ctx: Ctx, pile: Pile, uids: number[]): number {
  const want = new Set(uids);
  let n = 0;
  s[pile] = s[pile].filter((i) => {
    if (!want.has(i.uid) || bagFull(s)) return true;
    s.inventory.push(i);
    n++;
    return false;
  });
  if (n < want.size) ctx.emit({ t: 'info', text: 'Inventory full', tone: 'warn' });
  return n;
}

export function stashPageRoom(s: GameState, page: number): number {
  return Math.max(0, STASH_PAGE_SIZE - (s.storage.stash[page]?.length ?? STASH_PAGE_SIZE));
}

/** Put a unique in the Uniques tab, which always has room. */
export function shelveUnique(s: GameState, item: Item): void {
  s.storage.uniqueStash.push(claimOwned(s, item));
  seeUnique(s.account, item);
}

/** Item affinity for stash routing. */
export function itemAffinity(item: Item): StashAffinity {
  if (item.baseId?.startsWith('map_') || item.baseId?.startsWith('doomed_')) return 'maps';
  return 'gear';
}

export function stashPageFor(s: GameState, item: Item, preferred = 0): number {
  const affinity = itemAffinity(item);
  const matching = Object.entries(s.storage.stashAffinities ?? {}).find(([page, value]) => value === affinity && stashPageRoom(s, Number(page)) > 0);
  if (matching) return Number(matching[0]);
  if (stashPageRoom(s, preferred) > 0) return preferred;
  return s.storage.stash.findIndex((_, page) => stashPageRoom(s, page) > 0);
}

export function addStashItem(s: GameState, item: Item, preferred = 0): boolean {
  if (item.rarity === 'unique') {
    shelveUnique(s, item);
    return true;
  }
  const page = stashPageFor(s, item, preferred);
  if (page < 0) return false;
  s.storage.stash[page].push(claimOwned(s, item));
  return true;
}

export function setStashAffinity(s: GameState, page: number, affinity: StashAffinity | null): void {
  s.storage.stashAffinities ??= {};
  if (!affinity) {
    delete s.storage.stashAffinities[page];
  } else {
    s.storage.stashAffinities[page] = affinity;
  }
}

/** Move bag items into a stash page (affinity page first, then the given one, then any with room); uniques go to the Uniques tab. Returns how many moved. */
export function stashItems(s: GameState, ctx: Ctx, uids: number[], page = 0): number {
  const want = new Set(uids);
  let n = 0;
  s.inventory = s.inventory.filter((i) => {
    if (!want.has(i.uid) || isCraftLocked(s, i.uid)) return true;
    if (!addStashItem(s, i, page)) return true;
    n++;
    return false;
  });
  if (n < want.size) ctx.emit({ t: 'info', text: 'Stash full', tone: 'warn' });
  return n;
}

/** Move stash items back into the bag, as many as fit. */
export function takeFromStash(s: GameState, ctx: Ctx, uids: number[]): number {
  const want = new Set(uids);
  let n = 0;
  const keep = (i: Item) => {
    if (!want.has(i.uid) || bagFull(s)) return true;
    s.inventory.push(i);
    n++;
    return false;
  };
  s.storage.stash = s.storage.stash.map((page) => page.filter(keep));
  s.storage.overflow = s.storage.overflow.filter(keep);
  s.storage.uniqueStash = s.storage.uniqueStash.filter(keep);
  if (n < want.size) ctx.emit({ t: 'info', text: 'Inventory full', tone: 'warn' });
  return n;
}

/** Everything in the stash: gear pages, the overflow and the Uniques tab. */
export function stashedItems(s: GameState): Item[] {
  return [...s.storage.stash.flat(), ...s.storage.overflow, ...s.storage.uniqueStash];
}

/** Move overflow into stash pages with room. Returns how many moved. */
export function settleOverflow(s: GameState): number {
  const a = s.storage;
  const before = a.overflow.length;
  a.overflow = a.overflow.filter((i) => {
    if (i.rarity === 'unique') {
      a.uniqueStash.push(i);
      return false;
    }
    const page = a.stash.find((p) => p.length < STASH_PAGE_SIZE);
    page?.push(i);
    return !page;
  });
  return before - a.overflow.length;
}

/** Gold for the next stash page. Pages the Stash station or achievements gave you don't count toward the price. Stash station levels reduce price by 10% each. */
export function stashPagePrice(s: GameState): number {
  const bought = Math.max(0, s.storage.stash.length - freeStashPages(s.account));
  const basePrice = Math.round(STASH_PAGE_PRICE * STASH_PAGE_GROWTH ** bought);
  const stashLvl = s.account.hideout.stash ?? 1;
  const discount = Math.min(0.8, (stashLvl - 1) * 0.1);
  return Math.max(10, Math.round(basePrice * (1 - discount)));
}

export function buyStashPage(s: GameState, ctx: Ctx): string | null {
  const price = stashPagePrice(s);
  if (!canAfford(s, { gold: price })) return 'Not enough gold';
  payCost(s, { gold: price });
  s.storage.stash.push([]);
  ctx.emit({ t: 'info', text: `Stash page ${s.storage.stash.length} bought`, tone: 'good' });
  return null;
}

/** Take items you own out of the bag and the stash (for selling or salvaging). Returns what was removed. */
export function takeOwned(s: GameState, uids: number[]): Item[] {
  const want = new Set(uids);
  const out: Item[] = [];
  const keep = (i: Item) => {
    if (!want.has(i.uid) || isCraftLocked(s, i.uid)) return true;
    out.push(i);
    return false;
  };
  s.inventory = s.inventory.filter(keep);
  s.storage.stash = s.storage.stash.map((page) => page.filter(keep));
  s.storage.overflow = s.storage.overflow.filter(keep);
  s.storage.uniqueStash = s.storage.uniqueStash.filter(keep);
  return out;
}

/** Salvage a pile into Arcane Dust: the given items, or everything left in it. */
export function salvagePile(s: GameState, ctx: Ctx, pile: Pile, uids?: number[]): number {
  const want = uids && new Set(uids);
  const gone = want ? s[pile].filter((i) => want.has(i.uid)) : s[pile];
  const dust = gone.reduce((a, i) => a + salvageValue(i), 0);
  const n = gone.length;
  if (!n) return 0;
  s[pile] = want ? s[pile].filter((i) => !want.has(i.uid)) : [];
  addBank(s, 'arcane_dust', dust);
  s.lifetime.salvaged += n;
  ctx.emit({ t: 'info', text: `Salvaged ${n} item(s) for ${dust} Arcane Dust`, tone: 'good' });
  ctx.emit({ t: 'salvage', count: n });
  return dust;
}
