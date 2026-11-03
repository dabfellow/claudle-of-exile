import { BAG_SIZE, GROUND_CAP, OFFLINE_HAUL_CAP, STASH_PAGE_GROWTH, STASH_PAGE_PRICE, STASH_PAGE_SIZE, STASH_START_PAGES } from '../data/hideout';
import { claimOwned, seeUnique } from './account';
import { addBank, canAfford, payCost } from './bank';
import type { Ctx } from './context';
import { isCraftLocked } from './crafting';
import { salvageValue } from './items';
import type { GameState, Item } from './types';

// Gear lives in four places: the ground, the bag (`inventory`), the account's stash pages and equipment. See docs/design/TOWN.md.

export function bagFull(s: GameState): boolean {
  return s.inventory.length >= BAG_SIZE;
}

/** A drop lands on the ground, or in the offline haul while you're away; the oldest falls off past the cap. */
export function dropItem(s: GameState, ctx: Ctx, item: Item): void {
  const pile = ctx.offline ? s.offlineHaul : s.ground;
  pile.push(item);
  const cap = ctx.offline ? OFFLINE_HAUL_CAP : GROUND_CAP;
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
  return Math.max(0, STASH_PAGE_SIZE - (s.account.stash[page]?.length ?? STASH_PAGE_SIZE));
}

/** Put a unique in the Uniques tab, which always has room. */
export function shelveUnique(s: GameState, item: Item): void {
  s.account.uniqueStash.push(claimOwned(s, item));
  seeUnique(s.account, item);
}

/** Move bag items into a stash page (the given one first, then any page with room); uniques go to the Uniques tab. Returns how many moved. */
export function stashItems(s: GameState, ctx: Ctx, uids: number[], page = 0): number {
  const want = new Set(uids);
  const order = [page, ...s.account.stash.map((_, i) => i).filter((i) => i !== page)];
  let n = 0;
  s.inventory = s.inventory.filter((i) => {
    if (!want.has(i.uid) || isCraftLocked(s, i.uid)) return true;
    if (i.rarity === 'unique') {
      shelveUnique(s, i);
      n++;
      return false;
    }
    const target = order.find((p) => stashPageRoom(s, p) > 0);
    if (target === undefined) return true;
    s.account.stash[target].push(claimOwned(s, i));
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
  s.account.stash = s.account.stash.map((page) => page.filter(keep));
  s.account.overflow = s.account.overflow.filter(keep);
  s.account.uniqueStash = s.account.uniqueStash.filter(keep);
  if (n < want.size) ctx.emit({ t: 'info', text: 'Inventory full', tone: 'warn' });
  return n;
}

/** Everything in the stash: gear pages, the overflow and the Uniques tab. */
export function stashedItems(s: GameState): Item[] {
  return [...s.account.stash.flat(), ...s.account.overflow, ...s.account.uniqueStash];
}

/** Move overflow into stash pages with room. Returns how many moved. */
export function settleOverflow(s: GameState): number {
  const a = s.account;
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

/** Gold for the next stash page. Pages the Stash station gave you don't count toward the price. */
export function stashPagePrice(s: GameState): number {
  const free = (s.account.hideout.stash ?? 1) - 1;
  const bought = Math.max(0, s.account.stash.length - STASH_START_PAGES - free);
  return Math.round(STASH_PAGE_PRICE * STASH_PAGE_GROWTH ** bought);
}

export function buyStashPage(s: GameState, ctx: Ctx): string | null {
  const price = stashPagePrice(s);
  if (!canAfford(s, { gold: price })) return 'Not enough gold';
  payCost(s, { gold: price });
  s.account.stash.push([]);
  ctx.emit({ t: 'info', text: `Stash page ${s.account.stash.length} bought`, tone: 'good' });
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
  s.account.stash = s.account.stash.map((page) => page.filter(keep));
  s.account.overflow = s.account.overflow.filter(keep);
  s.account.uniqueStash = s.account.uniqueStash.filter(keep);
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
