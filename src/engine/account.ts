import { STASH_PAGE_SIZE, STASH_START_PAGES, stationDef } from '../data/hideout';
import { trimFlaskStash } from './flasks';
import type { AccountPool, AccountState, AccountTransfer, AutomationUnlocks, EquipSlot, GameState, Item, SkillGemInstance } from './types';

/**
 * What every character in a realm shares: the hideout, automation unlocks, every Stash tab and the Exile unlock.
 * Stored apart from the characters, and attached to a running game as `s.account`.
 * See docs/design/TOWN.md.
 */

/**
 * Item uids from this point up belong to the account. A character numbers its own items from 1, so two characters'
 * uids overlap; an item gets an account uid the first time it enters the stash, and keeps it from then on. Gems and
 * flasks move between the shared tabs and a character without a claim, so they're made with account uids.
 */
export const ACCOUNT_UID_BASE = 2 ** 40;
/** accounts start apart, so a guest's items keep their uids when they move onto a signed-in account */
const ACCOUNT_UID_SPREAD = 2 ** 28;

export function freshAutomation(): AutomationUnlocks {
  return { rules: [], ruleSlots: 1, offlineHours: 8 };
}

export function freshAccount(): AccountState {
  return {
    id: `a${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`,
    realm: 'standard',
    rev: 0,
    hideout: { map_device: 1, stash: 1, forge: 1, alchemy_table: 1, bench: 1, vendor: 1, war_table: 1, watchtower: 1 },
    automation: freshAutomation(),
    stash: Array.from({ length: STASH_START_PAGES }, () => []),
    overflow: [],
    bank: {},
    gems: [],
    supportGems: [],
    flaskStash: [],
    nextUid: ACCOUNT_UID_BASE + Math.floor(Math.random() * 4096) * ACCOUNT_UID_SPREAD,
    exileUnlocked: false,
    absorbed: [],
  };
}

/** An account saved before the shared tabs arrived. Accounts carry no version, so this is safe on any copy. */
export function fillAccount(a: AccountState): AccountState {
  a.bank ??= {};
  a.gems ??= [];
  a.supportGems ??= [];
  a.flaskStash ??= [];
  return a;
}

/** Give an item an account uid if it doesn't have one yet. Call this on everything entering the stash. */
export function claimItem(a: AccountState, item: Item): Item {
  if (item.uid < ACCOUNT_UID_BASE) item.uid = a.nextUid++;
  return item;
}

/** The same for a character's own item: any gear set holding it follows it to the new uid. */
export function claimOwned(s: GameState, item: Item): Item {
  const old = item.uid;
  claimItem(s.account, item);
  for (const set of s.loadouts.gear) {
    for (const [slot, uid] of Object.entries(set.items)) if (uid === old) set.items[slot as EquipSlot] = item.uid;
  }
  return item;
}

function pagesBought(hideout: Record<string, number>, pages: number): number {
  return Math.max(0, pages - STASH_START_PAGES - ((hideout.stash ?? 1) - 1));
}

/**
 * A level added in the middle of the War Table moves the ones above it, and accounts carry no version, so a stored
 * level can be out of step with what it taught. Unlocks are one-way and don't move: the table stands at least at the
 * highest level whose unlocks you hold, with everything up to it taught. Safe to run on any copy, any number of times.
 */
export function alignWarTable(a: AccountState): void {
  const levels = stationDef('war_table').levels;
  const u = a.automation;
  const held = levels.map((l) => !!l.grants && (l.grants.rules ?? []).every((r) => u.rules.includes(r)) && u.ruleSlots >= (l.grants.ruleSlots ?? 0));
  const top = Math.max(held.lastIndexOf(true) + 1, a.hideout.war_table ?? 1);
  a.hideout.war_table = top;
  for (const l of levels.slice(0, top)) {
    u.rules = [...new Set([...u.rules, ...(l.grants?.rules ?? [])])];
    u.ruleSlots = Math.max(u.ruleSlots, l.grants?.ruleSlots ?? 0);
  }
}

/** The highest of each station and unlock. */
function mergeUnlocks(a: AccountState, from: AccountTransfer): void {
  for (const [id, lvl] of Object.entries(from.hideout ?? {})) a.hideout[id] = Math.max(a.hideout[id] ?? 1, lvl);
  const u = from.automation;
  if (u) {
    a.automation = {
      rules: [...new Set([...a.automation.rules, ...u.rules])],
      ruleSlots: Math.max(a.automation.ruleSlots, u.ruleSlots),
      offlineHours: Math.max(a.automation.offlineHours, u.offlineHours),
    };
  }
  a.exileUnlocked ||= !!from.exileUnlocked;
  if (from.campaignDone) a.campaignDone = true;
  alignWarTable(a);
}

function addPool(a: AccountState, from: Partial<AccountPool>): void {
  for (const [id, n] of Object.entries(from.bank ?? {})) a.bank[id] = (a.bank[id] ?? 0) + n;
  a.gems.push(...(from.gems ?? []));
  a.supportGems.push(...(from.supportGems ?? []));
  a.flaskStash.push(...(from.flaskStash ?? []));
  trimFlaskStash(a);
}

/** Fold another stash and set of unlocks into this account. Items that don't fit wait in the overflow. */
export function absorbAccount(a: AccountState, from: AccountTransfer): void {
  const pages = from.stash ?? [];
  // every page anyone paid for is kept; free pages come from the Stash station, so its highest level counts once
  const bought = pagesBought(a.hideout, a.stash.length) + pagesBought(from.hideout ?? {}, pages.length);
  mergeUnlocks(a, from);
  const total = STASH_START_PAGES + (a.hideout.stash - 1) + bought;
  while (a.stash.length < total) a.stash.push([]);
  // each page lands on the same page where it can, so a single character's stash looks exactly as it did
  pages.forEach((page, i) => {
    for (const item of page) {
      const target = a.stash[i]?.length < STASH_PAGE_SIZE ? a.stash[i] : a.stash.find((p) => p.length < STASH_PAGE_SIZE);
      (target ?? a.overflow).push(claimItem(a, item));
    }
  });
  a.overflow.push(...(from.overflow ?? []).map((item) => claimItem(a, item)));
  addPool(a, from);
}

/** Move a character's old currency, materials, gems and flasks into the shared tabs, and its gems and flasks onto account uids. */
function settlePool(s: GameState, a: AccountState): boolean {
  const from = s.unpooled;
  if (!from) return false;
  delete s.unpooled;
  const moved = new Map<number, number>();
  const claim = (x: { uid: number }) => {
    if (x.uid >= ACCOUNT_UID_BASE) return;
    moved.set(x.uid, a.nextUid);
    x.uid = a.nextUid++;
  };
  const claimGem = (g: SkillGemInstance) => {
    claim(g);
    g.supports.forEach((x) => x && claim(x));
  };
  s.skillBar.forEach((g) => g && claimGem(g));
  s.flaskSlots.forEach((f) => f && claim(f));
  from.gems?.forEach(claimGem);
  from.supportGems?.forEach(claim);
  from.flaskStash?.forEach(claim);
  for (const slot of s.loadouts.skills.flatMap((set) => set.slots)) {
    if (!slot) continue;
    slot.gem = moved.get(slot.gem) ?? slot.gem;
    slot.supports = slot.supports.map((uid) => (uid === null ? null : (moved.get(uid) ?? uid)));
  }
  const key = `pool:${s.character.id}`;
  if (a.absorbed.includes(key)) return false;
  addPool(a, from);
  a.absorbed.push(key);
  return true;
}

/**
 * Fold in what a character still carries from before the account layer (or from a demo or an import). Each source
 * counts once, so a merge cut short can simply run again. Returns true if the account changed.
 */
export function settleCharacter(s: GameState, a: AccountState): boolean {
  const pooled = settlePool(s, a);
  const from = s.unmerged;
  if (!from) return pooled;
  delete s.unmerged;
  if (a.absorbed.includes(s.character.id) || from.id === a.id) return pooled;
  // an auto-craft running on a stashed item follows it to its new uid
  const job = s.action?.kind === 'craft' ? s.action : null;
  const target = job && [...(from.stash ?? []).flat(), ...(from.overflow ?? [])].find((i) => i.uid === job.uid);
  absorbAccount(a, from);
  if (job && target) job.uid = target.uid;
  a.absorbed.push(s.character.id);
  return true;
}

/** Two copies of the account (two devices): the newer stash stands, and no unlock is ever lost. */
export function reconcileAccounts(newer: AccountState, older: AccountState): AccountState {
  mergeUnlocks(newer, older);
  newer.absorbed = [...new Set([...newer.absorbed, ...older.absorbed])];
  newer.nextUid = Math.max(newer.nextUid, older.nextUid);
  return newer;
}

/** One list three ways: their copy, less what I took out, plus what I put in. Anything both copies hold keeps my version. */
function mergeList<T extends { uid: number }>(a: AccountState, mine: T[], base: T[], theirs: T[]): T[] {
  const had = new Set(base.map((x) => x.uid));
  const mineByUid = new Map(mine.map((x) => [x.uid, x]));
  const out = theirs.filter((x) => !had.has(x.uid) || mineByUid.has(x.uid)).map((x) => (had.has(x.uid) ? (mineByUid.get(x.uid) ?? x) : x));
  const held = new Set(out.map((x) => x.uid));
  for (const x of mine) {
    if (had.has(x.uid)) continue;
    // two tabs can hand out the same uid between saves
    if (held.has(x.uid)) x.uid = a.nextUid++;
    out.push(x);
  }
  return out;
}

/**
 * Another tab or device saved the account. Keep what changed here since `base`, the copy both of us last agreed on, on
 * top of their copy, so two characters playing at once both keep what they earn. Changes `mine` in place.
 */
export function mergeAccounts(mine: AccountState, base: AccountState, theirs: AccountState): void {
  mergeUnlocks(mine, theirs);
  mine.absorbed = [...new Set([...mine.absorbed, ...theirs.absorbed])];
  mine.nextUid = Math.max(mine.nextUid, theirs.nextUid);
  const bank: Record<string, number> = { ...theirs.bank };
  for (const id of new Set([...Object.keys(mine.bank), ...Object.keys(base.bank)])) {
    bank[id] = Math.max(0, (theirs.bank[id] ?? 0) + (mine.bank[id] ?? 0) - (base.bank[id] ?? 0));
  }
  mine.bank = bank;
  // a hold this copy released stays released; one only the other tab has made stays
  const released = new Set((base.marketHolds ?? []).map((h) => h.op));
  const myHolds = new Set((mine.marketHolds ?? []).map((h) => h.op));
  const theirHolds = (theirs.marketHolds ?? []).filter((h) => !myHolds.has(h.op) && !released.has(h.op));
  if (theirHolds.length) mine.marketHolds = [...(mine.marketHolds ?? []), ...theirHolds];
  mine.gems = mergeList(mine, mine.gems, base.gems, theirs.gems);
  mine.supportGems = mergeList(mine, mine.supportGems, base.supportGems, theirs.supportGems);
  mine.flaskStash = mergeList(mine, mine.flaskStash, base.flaskStash, theirs.flaskStash);
  mine.overflow = mergeList(mine, mine.overflow, base.overflow, theirs.overflow);
  const pages = Math.max(mine.stash.length, theirs.stash.length);
  mine.stash = Array.from({ length: pages }, (_, i) => mergeList(mine, mine.stash[i] ?? [], base.stash[i] ?? [], theirs.stash[i] ?? []));
}

/** A character bundled with the account, for an export or for a demo moving to a real account. */
export function bundleCharacter(s: GameState): Omit<GameState, 'account'> {
  const { account, ...rest } = s;
  return { ...rest, unmerged: account };
}
