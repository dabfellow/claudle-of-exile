import { perkTotals } from '../data/achievements';
import { MAP_DEVICE_ATLAS_LEVEL, STASH_FREE_PAGES, STASH_PAGE_SIZE, STASH_START_PAGES, stationDef } from '../data/hideout';
import { doomedId, mapId, parseDoomedTier, parseMapTier } from '../data/maps';
import { STANDARD_REALM } from './challenge';
import { trimFlaskStash } from './flasks';
import { createUnique } from './items';
import type { AccountPool, AccountState, AccountTransfer, AtlasState, AutomationUnlocks, EquipSlot, GameState, Item, Realm, SkillGemInstance } from './types';

/**
 * What every character in a realm shares: the hideout, automation unlocks, every Stash tab and the Exile unlock.
 * Stored apart from the characters, and attached to a running game as `s.account`.
 * See docs/GAME.md.
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
  return { rules: ['vitals', 'windups', 'ground'], ruleSlots: 2, offlineHours: 8 };
}

export function freshAtlas(): AtlasState {
  return { cleared: [], slotted: [], deathless: [], doomedCleared: [], hardBossesCleared: [], uberBossesCleared: [], nodes: [] };
}

/** Normalize any themed (`map_barrows_t1`) or plain map keys into plain `map_t1`..`map_t10` and `doomed_t1`..`doomed_t5`. */
export function normalizeMapStock(stock: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!stock) return out;
  for (const [k, raw] of Object.entries(stock)) {
    const n = Math.max(0, Math.floor(raw || 0));
    if (!n) continue;
    const dTier = parseDoomedTier(k);
    if (dTier) {
      const id = doomedId(dTier);
      out[id] = (out[id] ?? 0) + n;
      continue;
    }
    const tier = parseMapTier(k);
    if (tier) {
      const id = mapId(tier);
      out[id] = (out[id] ?? 0) + n;
    }
  }
  return out;
}

export function freshAccount(realm: Realm = STANDARD_REALM): AccountState {
  return {
    id: `a${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`,
    realm,
    rev: 0,
    hideout: { map_device: 1, stash: 1, forge: 1, alchemy_table: 1, bench: 1, vendor: 1, war_table: 1, war_table_tiers: 1, quartermaster: 1, watchtower: 1, trophy_altar: 1, rune_board: 1 },
    automation: freshAutomation(),
    stash: Array.from({ length: STASH_START_PAGES }, () => []),
    overflow: [],
    uniqueStash: [],
    uniquesSeen: [],
    bank: {},
    maps: {},
    sextants: [null, null, null, null],
    atlas: freshAtlas(),
    mapSettings: { blockedMods: [], autoRerollChaos: true, rollNormalMaps: false },
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
  // Loot handling moved out of the War Table. Preserve every salvage tier already paid for.
  const oldWarTable = a.hideout?.war_table ?? 1;
  if (a.hideout) {
    if (a.hideout.quartermaster === undefined) {
      a.hideout.quartermaster = Math.max(1, Math.min(4, oldWarTable - 3));
      a.hideout.war_table = Math.min(4, oldWarTable);
    }
    // The War Table gained tiers for auto flee, auto challenge and auto next zone. Whoever played before that keeps the first two.
    if (a.hideout.war_table_tiers === undefined) {
      a.hideout.war_table_tiers = 1;
      a.autosKept = true;
    }
    a.hideout.rune_board ??= 1;
    if (((a.atlas?.nodes?.length ?? 0) > 0 || (a.atlas?.cleared?.length ?? 0) > 0 || a.campaignDone) && (a.hideout.map_device ?? 1) < MAP_DEVICE_ATLAS_LEVEL) {
      a.hideout.map_device = MAP_DEVICE_ATLAS_LEVEL;
    }
  }
  const baseline = freshAutomation();
  a.automation ??= baseline;
  a.automation.rules = [...new Set([...baseline.rules, ...a.automation.rules])];
  a.automation.ruleSlots = Math.max(baseline.ruleSlots, a.automation.ruleSlots);
  a.automation.offlineHours = Math.max(baseline.offlineHours, a.automation.offlineHours);
  a.bank ??= {};
  a.maps = normalizeMapStock(a.maps);
  a.sextants ??= [null, null, null, null];
  while (a.sextants.length < 4) a.sextants.push(null);
  a.atlas ??= freshAtlas();
  a.atlas.cleared = [...new Set(a.atlas.cleared ?? [])];
  a.atlas.slotted = [...new Set(a.atlas.slotted ?? [])];
  a.atlas.deathless = [...new Set(a.atlas.deathless ?? [])];
  a.atlas.doomedCleared = [...new Set(a.atlas.doomedCleared ?? [])];
  a.atlas.hardBossesCleared = [...new Set(a.atlas.hardBossesCleared ?? [])];
  a.atlas.uberBossesCleared = [...new Set(a.atlas.uberBossesCleared ?? [])];
  a.atlas.nodes = [...new Set(a.atlas.nodes ?? [])];
  a.mapSettings ??= { blockedMods: [], autoRerollChaos: true, rollNormalMaps: false };
  a.gems ??= [];
  a.supportGems ??= [];
  a.flaskStash ??= [];
  a.achievementRewards = [...new Set(a.achievementRewards ?? [])];
  fileUniques(a);
  ensureStashPages(a);
  return a;
}

/** Free stash tabs the realm has from achievements. */
export function achievementTabs(a: Pick<AccountState, 'achievementRewards'>): number {
  return perkTotals(a.achievementRewards ?? []).stashTabs;
}

/** Stash pages that came free: the starting ones, per Stash station level, and achievement tabs. */
export function freeStashPages(a: Pick<AccountState, 'hideout' | 'achievementRewards'>): number {
  const lvl = Math.min(STASH_FREE_PAGES.length, Math.max(1, a.hideout?.stash ?? 1));
  return STASH_FREE_PAGES[lvl - 1] + achievementTabs(a);
}

/** Every free page is there, so an achievement tab merged in from another copy isn't lost. */
export function ensureStashPages(a: AccountState): void {
  while (a.stash.length < freeStashPages(a)) a.stash.push([]);
}

/**
 * Copies saved by a version from before the Uniques tab (an old tab, or a device not yet updated). They never saw the
 * tab, so it isn't theirs to empty: a merge keeps the tab from the other copy.
 */
const beforeUniqueTab = new WeakSet<AccountState>();

/** The Uniques tab an old copy stands for: what it filed off its own pages, plus the tab it never knew about. */
function tabOf(a: AccountState, other: AccountState): Item[] {
  if (!beforeUniqueTab.has(a)) return a.uniqueStash;
  const held = new Set(a.uniqueStash.map((i) => i.uid));
  return [...a.uniqueStash, ...other.uniqueStash.filter((i) => !held.has(i.uid))];
}

/**
 * Uniques live in the Uniques tab: any still on a gear page or in the overflow (from before the tab, or merged in)
 * move there, and every unique held counts as seen. Safe on any copy, any number of times.
 */
export function fileUniques(a: AccountState): void {
  if (!a.uniqueStash) {
    beforeUniqueTab.add(a);
    a.uniqueStash = [];
  }
  a.uniquesSeen ??= [];
  const isUnique = (i: Item) => i.rarity === 'unique';
  for (const list of [...a.stash, a.overflow]) a.uniqueStash.push(...list.filter(isUnique));
  a.stash = a.stash.map((page) => page.filter((i) => !isUnique(i)));
  a.overflow = a.overflow.filter((i) => !isUnique(i));
  for (const i of a.uniqueStash) seeUnique(a, i);
}

/** Mark a unique as found, for the Uniques tab's collection. */
export function seeUnique(a: AccountState, item: Item): void {
  a.uniquesSeen ??= [];
  if (item.uniqueId && !a.uniquesSeen.includes(item.uniqueId)) a.uniquesSeen.push(item.uniqueId);
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

function pagesBought(hideout: Record<string, number>, pages: number, rewards: string[] = []): number {
  return Math.max(0, pages - freeStashPages({ hideout, achievementRewards: rewards }));
}

/**
 * A level added in the middle of the War Table moves the ones above it, and accounts carry no version, so a stored
 * level can be out of step with what it taught. Unlocks are one-way and don't move: the table stands at least at the
 * highest level whose unlocks you hold, with everything up to it taught. Safe to run on any copy, any number of times.
 */
export function alignWarTable(a: AccountState): void {
  const levels = stationDef('war_table').levels;
  const u = a.automation;
  const baseline = freshAutomation();
  u.rules = [...new Set([...baseline.rules, ...u.rules])];
  u.ruleSlots = Math.max(baseline.ruleSlots, u.ruleSlots);
  u.offlineHours = Math.max(baseline.offlineHours, u.offlineHours);
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
  a.autosKept ||= !!(from as { autosKept?: boolean }).autosKept;
  a.achievementRewards = [...new Set([...(a.achievementRewards ?? []), ...(from.achievementRewards ?? [])])];
  if (from.campaignDone) a.campaignDone = true;
  if (from.atlas) {
    a.atlas ??= freshAtlas();
    a.atlas.cleared = [...new Set([...a.atlas.cleared, ...(from.atlas.cleared ?? [])])];
    a.atlas.slotted = [...new Set([...a.atlas.slotted, ...(from.atlas.slotted ?? [])])];
    a.atlas.deathless = [...new Set([...a.atlas.deathless, ...(from.atlas.deathless ?? [])])];
    a.atlas.doomedCleared = [...new Set([...(a.atlas.doomedCleared ?? []), ...(from.atlas.doomedCleared ?? [])])];
    a.atlas.hardBossesCleared = [...new Set([...(a.atlas.hardBossesCleared ?? []), ...(from.atlas.hardBossesCleared ?? [])])];
    a.atlas.uberBossesCleared = [...new Set([...(a.atlas.uberBossesCleared ?? []), ...(from.atlas.uberBossesCleared ?? [])])];
    if (!a.atlas.nodes.length && from.atlas.nodes?.length) a.atlas.nodes = [...new Set(from.atlas.nodes)];
  }
  alignWarTable(a);
}

function addPool(a: AccountState, from: Partial<AccountPool> & { maps?: Record<string, number> }): void {
  for (const [id, n] of Object.entries(from.bank ?? {})) a.bank[id] = (a.bank[id] ?? 0) + n;
  a.maps ??= {};
  for (const [id, n] of Object.entries(normalizeMapStock(from.maps))) a.maps[id] = (a.maps[id] ?? 0) + n;
  a.gems.push(...(from.gems ?? []));
  a.supportGems.push(...(from.supportGems ?? []));
  a.flaskStash.push(...(from.flaskStash ?? []));
  trimFlaskStash(a);
}

/** Fold another stash and set of unlocks into this account. Items that don't fit wait in the overflow. */
export function absorbAccount(a: AccountState, from: AccountTransfer): void {
  const pages = from.stash ?? [];
  // every page anyone paid for is kept; free pages come from the Stash station, so its highest level counts once
  const bought = pagesBought(a.hideout, a.stash.length, a.achievementRewards) + pagesBought(from.hideout ?? {}, pages.length, from.achievementRewards);
  mergeUnlocks(a, from);
  const total = freeStashPages(a) + bought;
  while (a.stash.length < total) a.stash.push([]);
  // each page lands on the same page where it can, so a single character's stash looks exactly as it did
  pages.forEach((page, i) => {
    for (const item of page) {
      const target = a.stash[i]?.length < STASH_PAGE_SIZE ? a.stash[i] : a.stash.find((p) => p.length < STASH_PAGE_SIZE);
      (target ?? a.overflow).push(claimItem(a, item));
    }
  });
  a.overflow.push(...(from.overflow ?? []).map((item) => claimItem(a, item)));
  a.uniqueStash.push(...(from.uniqueStash ?? []).map((item) => claimItem(a, item)));
  a.uniquesSeen = [...new Set([...a.uniquesSeen, ...(from.uniquesSeen ?? [])])];
  fileUniques(a);
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

/** Fold a character's local map stock (including old themed maps) into the realm's shared map supply once. */
export function settleCharacterMaps(s: GameState, a: AccountState): boolean {
  a.maps ??= {};
  const key = `maps:${s.character.id}`;
  let changed = false;
  if (s.maps?.stock && s.maps.stock !== a.maps && !a.absorbed.includes(key)) {
    const folded = normalizeMapStock(s.maps.stock);
    if (Object.keys(folded).length > 0) {
      for (const [id, n] of Object.entries(folded)) a.maps[id] = (a.maps[id] ?? 0) + n;
      a.absorbed.push(key);
      changed = true;
    }
  }
  if (s.maps) s.maps.stock = a.maps;
  return changed;
}

/**
 * Fold in what a character still carries from before the account layer (or from a demo or an import). Each source
 * counts once, so a merge cut short can simply run again. Returns true if the account changed.
 */
export function settleCharacter(s: GameState, a: AccountState): boolean {
  const pooled = settlePool(s, a);
  const mapped = settleCharacterMaps(s, a);
  const from = s.unmerged;
  if (!from) return pooled || mapped;
  delete s.unmerged;
  if (a.absorbed.includes(s.character.id) || from.id === a.id) return pooled || mapped;
  // an auto-craft running on a stashed item follows it to its new uid
  const job = s.action?.kind === 'craft' ? s.action : null;
  const target = job && [...(from.stash ?? []).flat(), ...(from.overflow ?? []), ...(from.uniqueStash ?? [])].find((i) => i.uid === job.uid);
  absorbAccount(a, from);
  if (job && target) job.uid = target.uid;
  a.absorbed.push(s.character.id);
  return true;
}

/** Hand a character from before the skill reform its keepsake, once. Returns whether it did. */
export function giveKeepsake(s: GameState): boolean {
  if (!s.keepsakeDue) return false;
  delete s.keepsakeDue;
  s.inventory.push(createUnique(s, 'old_covenant', 1)); // can go over the bag's size, but nothing is lost
  return true;
}

/** Two copies of the account (two devices): the newer stash stands, and no unlock is ever lost. */
export function reconcileAccounts(newer: AccountState, older: AccountState): AccountState {
  mergeUnlocks(newer, older);
  newer.absorbed = [...new Set([...newer.absorbed, ...older.absorbed])];
  fileUniques(newer);
  fileUniques(older);
  newer.uniqueStash = tabOf(newer, older);
  newer.uniquesSeen = [...new Set([...newer.uniquesSeen, ...older.uniquesSeen])];
  newer.nextUid = Math.max(newer.nextUid, older.nextUid);
  ensureStashPages(newer);
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
  // all three copies file their uniques the same way first, so a unique isn't read as taken off a page and added twice
  for (const a of [mine, base, theirs]) fileUniques(a);
  mergeUnlocks(mine, theirs);
  mine.absorbed = [...new Set([...mine.absorbed, ...theirs.absorbed])];
  mine.uniquesSeen = [...new Set([...mine.uniquesSeen, ...theirs.uniquesSeen])];
  mine.nextUid = Math.max(mine.nextUid, theirs.nextUid);
  const bank: Record<string, number> = { ...theirs.bank };
  for (const id of new Set([...Object.keys(mine.bank), ...Object.keys(base.bank)])) {
    bank[id] = Math.max(0, (theirs.bank[id] ?? 0) + (mine.bank[id] ?? 0) - (base.bank[id] ?? 0));
  }
  mine.bank = bank;
  const mineMaps = normalizeMapStock(mine.maps);
  const baseMaps = normalizeMapStock(base.maps);
  const theirMaps = normalizeMapStock(theirs.maps);
  const maps: Record<string, number> = { ...theirMaps };
  for (const id of new Set([...Object.keys(mineMaps), ...Object.keys(baseMaps)])) {
    maps[id] = Math.max(0, (theirMaps[id] ?? 0) + (mineMaps[id] ?? 0) - (baseMaps[id] ?? 0));
  }
  mine.maps = maps;
  // a hold this copy released stays released; one only the other tab has made stays
  const released = new Set((base.marketHolds ?? []).map((h) => h.op));
  const myHolds = new Set((mine.marketHolds ?? []).map((h) => h.op));
  const theirHolds = (theirs.marketHolds ?? []).filter((h) => !myHolds.has(h.op) && !released.has(h.op));
  if (theirHolds.length) mine.marketHolds = [...(mine.marketHolds ?? []), ...theirHolds];
  mine.gems = mergeList(mine, mine.gems, base.gems, theirs.gems);
  mine.supportGems = mergeList(mine, mine.supportGems, base.supportGems, theirs.supportGems);
  mine.flaskStash = mergeList(mine, mine.flaskStash, base.flaskStash, theirs.flaskStash);
  mine.overflow = mergeList(mine, mine.overflow, base.overflow, theirs.overflow);
  mine.uniqueStash = mergeList(mine, mine.uniqueStash, base.uniqueStash, tabOf(theirs, base));
  const pages = Math.max(mine.stash.length, theirs.stash.length);
  mine.stash = Array.from({ length: pages }, (_, i) => mergeList(mine, mine.stash[i] ?? [], base.stash[i] ?? [], theirs.stash[i] ?? []));
  ensureStashPages(mine);
}

/** A character bundled with the account, for an export or for a demo moving to a real account. */
export function bundleCharacter(s: GameState): Omit<GameState, 'account'> {
  const { account, ...rest } = s;
  return { ...rest, unmerged: account };
}
