import { STASH_PAGE_SIZE, STASH_START_PAGES, stationDef } from '../data/hideout';
import type { AccountState, AccountTransfer, AutomationUnlocks, GameState, Item } from './types';

/**
 * What every character on an account shares: the hideout, automation unlocks, the gear stash and the Exile unlock.
 * Stored apart from the characters, and attached to a running game as `s.account`.
 * See docs/design/TOWN.md.
 */

/**
 * Item uids from this point up belong to the account. A character numbers its own items from 1, so two characters'
 * uids overlap; an item gets an account uid the first time it enters the stash, and keeps it from then on.
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
    nextUid: ACCOUNT_UID_BASE + Math.floor(Math.random() * 4096) * ACCOUNT_UID_SPREAD,
    exileUnlocked: false,
    absorbed: [],
  };
}

/** Give an item an account uid if it doesn't have one yet. Call this on everything entering the stash. */
export function claimItem(a: AccountState, item: Item): Item {
  if (item.uid < ACCOUNT_UID_BASE) item.uid = a.nextUid++;
  return item;
}

function pagesBought(hideout: Record<string, number>, pages: number): number {
  return Math.max(0, pages - STASH_START_PAGES - ((hideout.stash ?? 1) - 1));
}

/**
 * A level added in the middle of the War Table moves the ones above it, and accounts carry no version, so a stored
 * level can be out of step with what it taught. Unlocks are one-way and don't move: the table stands at least at the
 * highest level whose unlocks you hold, with everything below it taught. Safe to run on any copy, any number of times.
 */
export function alignWarTable(a: AccountState): void {
  const levels = stationDef('war_table').levels;
  const u = a.automation;
  const held = levels.map((l) => !!l.grants && (l.grants.rules ?? []).every((r) => u.rules.includes(r)) && u.ruleSlots >= (l.grants.ruleSlots ?? 0));
  const top = held.lastIndexOf(true) + 1;
  if (top > (a.hideout.war_table ?? 1)) a.hideout.war_table = top;
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
  alignWarTable(a);
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
}

/**
 * Fold in what a character still carries from before the account layer (or from a demo or an import). Each source
 * counts once, so a merge cut short can simply run again. Returns true if the account changed.
 */
export function settleCharacter(s: GameState, a: AccountState): boolean {
  const from = s.unmerged;
  if (!from) return false;
  delete s.unmerged;
  if (a.absorbed.includes(s.character.id) || from.id === a.id) return false;
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

/** A character bundled with the account, for an export or for a demo moving to a real account. */
export function bundleCharacter(s: GameState): Omit<GameState, 'account'> {
  const { account, ...rest } = s;
  return { ...rest, unmerged: account };
}
