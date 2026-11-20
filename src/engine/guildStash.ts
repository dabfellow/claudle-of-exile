import { STASH_PAGE_SIZE } from '../data/hideout';
import { claimItem, claimOwned } from './account';
import { materialRoom } from './bank';
import { realmOf } from './challenge';
import { isCraftLocked } from './crafting';
import { FLASK_STASH_CAP } from './flasks';
import { locateItem } from './itemActions';
import { stashedItems, takeOwned } from './storage';
import type { GameState, Item } from './types';

export type GuildDirection = 'deposit' | 'withdraw';
export type GuildTransfer = { direction: GuildDirection } & (
  | { kind: 'bank' | 'maps'; id: string; quantity: number }
  | { kind: 'gear' | 'gems' | 'supportGems' | 'flaskStash'; uid: number }
);

export function guildGear(s: GameState): Item[] {
  return [...s.account.stash.flat(), ...s.account.overflow, ...s.account.uniqueStash];
}

/** Move one stack or item between the active character and its own realm's Guild Stash. */
export function transferGuild(s: GameState, transfer: GuildTransfer): string | null {
  if (s.account.realm !== realmOf(s.character)) return 'Guild Stash is unavailable in this realm';
  const deposit = transfer.direction === 'deposit';
  const from = deposit ? s.storage : s.account;
  const to = deposit ? s.account : s.storage;
  if ('id' in transfer) {
    const { id, quantity, kind } = transfer;
    const guildMaps = (s.account.maps ??= {});
    const source = kind === 'bank' ? from.bank : deposit ? s.maps.stock : guildMaps;
    const target = kind === 'bank' ? to.bank : deposit ? guildMaps : s.maps.stock;
    const available = source[id];
    if (!Object.hasOwn(source, id) || !Number.isSafeInteger(available) || !Number.isSafeInteger(quantity) || quantity < 1 || available < quantity) {
      return 'That quantity is unavailable';
    }
    if (!deposit && kind === 'bank' && quantity > materialRoom(s, id)) return 'There is too little room for that material';
    const total = (target[id] ?? 0) + quantity;
    if (!Number.isSafeInteger(total)) return 'That stack is too large';
    source[id] -= quantity;
    if (source[id] === 0) delete source[id];
    target[id] = total;
    return null;
  }

  const { kind, uid } = transfer;
  if (kind === 'gear') {
    const place = deposit ? locateItem(s, uid) : null;
    const gear = deposit ? place?.item : guildGear(s).find((item) => item.uid === uid);
    if (!gear || (deposit && (place?.at === 'equipped' || place?.at === 'ground' || place?.at === 'offlineHaul' || isCraftLocked(s, uid)))) {
      return 'That item is unavailable for transfer';
    }
    const page = to.stash.find((items) => items.length < STASH_PAGE_SIZE);
    if (gear.rarity !== 'unique' && !page) return deposit ? 'Guild Stash gear tabs are full' : 'Personal Stash gear tabs are full';
    if (deposit) takeOwned(s, [uid]);
    else {
      const keep = (item: Item) => item.uid !== uid;
      from.stash = from.stash.map((items) => items.filter(keep));
      from.overflow = from.overflow.filter(keep);
      from.uniqueStash = from.uniqueStash.filter(keep);
    }
    const held = deposit ? guildGear(s) : [...stashedItems(s), ...s.inventory, ...Object.values(s.equipment)];
    if (deposit) claimOwned(s, gear);
    else claimItem(s.account, gear);
    distinctUid(s, gear, idsOf(held));
    (gear.rarity === 'unique' ? to.uniqueStash : page!).push(gear);
    return null;
  }

  if (kind === 'flaskStash') {
    const flask = from.flaskStash.find((item) => item.uid === uid);
    if (!deposit && flask && flask.rarity !== 'unique' &&
      to.flaskStash.filter((item) => item.flaskId === flask.flaskId && item.rarity !== 'unique').length >= FLASK_STASH_CAP) {
      return 'Personal Stash already has the maximum of that flask';
    }
    const held = deposit ? to.flaskStash : [...to.flaskStash, ...s.flaskSlots];
    return moveByUid(from.flaskStash, to.flaskStash, uid, (item) => distinctUid(s, item, idsOf(held)));
  }

  const heldGems = deposit ? to.gems : [...to.gems, ...s.skillBar];
  const held = idsOf([...heldGems, ...to.supportGems, ...heldGems.flatMap((gem) => gem?.supports ?? [])]);
  if (kind === 'supportGems') return moveByUid(from.supportGems, to.supportGems, uid, (gem) => distinctUid(s, gem, held));
  return moveByUid(from.gems, to.gems, uid, (gem) => {
    distinctUid(s, gem, held);
    for (const support of gem.supports) if (support) distinctUid(s, support, held);
  });
}

function idsOf(items: ({ uid: number } | null | undefined)[]): Set<number> {
  return new Set(items.flatMap((item) => item ? [item.uid] : []));
}

function distinctUid(s: GameState, item: { uid: number }, held: Set<number>): void {
  // Two characters in different tabs can create items before either sees the other's account counter.
  while (held.has(item.uid)) item.uid = s.account.nextUid++;
  held.add(item.uid);
}

function moveByUid<T extends { uid: number }>(from: T[], to: T[], uid: number, prepare: (item: T) => void): string | null {
  const index = from.findIndex((item) => item.uid === uid);
  if (index < 0) return 'That item is no longer available';
  const [item] = from.splice(index, 1);
  prepare(item);
  to.push(item);
  return null;
}
