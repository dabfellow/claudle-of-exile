import { BAG_SIZE, GROUND_CAP, OFFLINE_HAUL_CAP, STASH_DISCOUNT, STASH_PAGE_GROWTH, STASH_PAGE_PRICE, STASH_PAGE_SIZE, STASH_START_PAGES } from '../data/hideout';
import { addBank, canAfford, payCost } from './bank';
import type { Ctx } from './context';
import { isCraftLocked } from './crafting';
import { salvageValue } from './items';
import type { GameState, Item } from './types';

// Gear lives in four places: the ground, the bag (`inventory`), stash pages and equipment. See docs/STASH.md.

export function bagFull(s: GameState): boolean {
  return s.inventory.length >= BAG_SIZE;
}

export function bagRoom(s: GameState): number {
  return Math.max(0, BAG_SIZE - s.inventory.length);
}

/** A drop lands on the ground, or in the offline haul while you're away; the oldest falls off past the cap. */
export function dropItem(s: GameState, ctx: Ctx, item: Item): void {
  const pile = ctx.offline ? s.offlineHaul : s.ground;
  pile.push(item);
  const cap = ctx.offline ? OFFLINE_HAUL_CAP : GROUND_CAP;
  if (pile.length > cap) pile.splice(0, pile.length - cap);
}

export function clearGround(s: GameState): void {
  s.ground = [];
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
  return Math.max(0, STASH_PAGE_SIZE - (s.stash[page]?.length ?? STASH_PAGE_SIZE));
}

/** Move bag items into a stash page (the given one first, then any page with room). Returns how many moved. */
export function stashItems(s: GameState, ctx: Ctx, uids: number[], page = 0): number {
  const want = new Set(uids);
  const order = [page, ...s.stash.map((_, i) => i).filter((i) => i !== page)];
  let n = 0;
  s.inventory = s.inventory.filter((i) => {
    if (!want.has(i.uid) || isCraftLocked(s, i.uid)) return true;
    const target = order.find((p) => stashPageRoom(s, p) > 0);
    if (target === undefined) return true;
    s.stash[target].push(i);
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
  s.stash = s.stash.map((page) =>
    page.filter((i) => {
      if (!want.has(i.uid) || bagFull(s)) return true;
      s.inventory.push(i);
      n++;
      return false;
    }),
  );
  if (n < want.size) ctx.emit({ t: 'info', text: 'Inventory full', tone: 'warn' });
  return n;
}

export function stashedItems(s: GameState): Item[] {
  return s.stash.flat();
}

/** Gold for the next stash page, after the Stash station's discount. */
export function stashPagePrice(s: GameState): number {
  const bought = Math.max(0, s.stash.length - STASH_START_PAGES);
  const discount = STASH_DISCOUNT[(s.hideout.stash ?? 1) - 1] ?? 0;
  return Math.round((STASH_PAGE_PRICE * STASH_PAGE_GROWTH ** bought * (100 - discount)) / 100);
}

export function buyStashPage(s: GameState, ctx: Ctx): string | null {
  const price = stashPagePrice(s);
  if (!canAfford(s, { gold: price })) return 'Not enough gold';
  payCost(s, { gold: price });
  s.stash.push([]);
  ctx.emit({ t: 'info', text: `Stash page ${s.stash.length} bought`, tone: 'good' });
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
  s.stash = s.stash.map((page) => page.filter(keep));
  return out;
}

/** Salvage everything left in a pile into Arcane Dust. */
export function salvagePile(s: GameState, ctx: Ctx, pile: Pile): number {
  const dust = s[pile].reduce((a, i) => a + salvageValue(i), 0);
  const n = s[pile].length;
  if (!n) return 0;
  s[pile] = [];
  addBank(s, 'arcane_dust', dust);
  s.lifetime.salvaged += n;
  ctx.emit({ t: 'info', text: `Salvaged ${n} item(s) for ${dust} Arcane Dust`, tone: 'good' });
  return dust;
}
