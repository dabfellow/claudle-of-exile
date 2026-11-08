import type { ClassId } from '../data/classes';
import { absorbAccount, fillAccount, freshAccount, reconcileAccounts } from '../engine/account';
import { realmOf, STANDARD_REALM } from '../engine/challenge';
import { deserialize, SAVE_KEY, serialize } from '../engine/save';
import { SKILL_IDS, type AccountState, type ChallengeFlags, type GameState, type Realm } from '../engine/types';
import { characterLevel } from '../engine/character';
import { levelOf } from '../engine/xp';
import { reportError } from './errors';

export interface CharacterSummary {
  id: string;
  name: string;
  classId: ClassId;
  challenge?: ChallengeFlags;
  /** which account it shares: left out on summaries from before challenge modes, which are all standard */
  realm?: Realm;
  act1Cleared?: boolean;
  mapsStarted?: boolean;
  /** this character has nothing left to hand over to the account */
  handedOver?: boolean;
  combatLevel: number;
  totalLevel: number;
  createdAt: number;
  lastPlayed: number;
  /** the game session that wrote this cloud row (cloud rows only), so a save whose reply was lost can recognise its own write */
  savedBy?: string;
}

/** The cloud version a browser's local copy grew from: the server's stamp for that row, and that version's save time. */
export interface SyncBase {
  stamp: string;
  savedAt: number;
}

/** Where characters live. Async so a cloud implementation can share the interface. */
export interface SaveStore {
  list(): Promise<CharacterSummary[]>;
  load(id: string): Promise<GameState | null>;
  save(s: GameState): Promise<void>;
  remove(id: string): Promise<void>;
  /** A realm's shared account, or null if none has been saved yet. */
  loadAccount(realm?: Realm): Promise<AccountState | null>;
  saveAccount(a: AccountState): Promise<void>;
  /** The account as this browser last wrote it, from any tab. Synchronous, so a save can merge it first. */
  peekAccount(realm?: Realm): AccountState | null;
  /** The account as another device left it, where there can be one. */
  pullAccount(realm?: Realm): Promise<AccountState | null>;
  removeAccount(realm?: Realm): Promise<void>;
}

export function summarize(s: GameState): CharacterSummary {
  return {
    id: s.character.id,
    name: s.character.name,
    classId: s.character.classId,
    challenge: s.character.challenge,
    realm: realmOf(s.character),
    act1Cleared: s.bossesDefeated.includes('sanctum'),
    mapsStarted: !!s.maps.run || s.maps.tally.runs > 0,
    handedOver: !s.unmerged && !s.unpooled,
    combatLevel: characterLevel(s),
    totalLevel: SKILL_IDS.filter((k) => k !== 'combat' && k !== 'fishing').reduce((a, k) => a + levelOf(k, s.skills[k]), 0),
    createdAt: s.character.createdAt,
    lastPlayed: s.lastSaved,
  };
}

/** Saves in browser storage: an index of summaries plus one key per character. */
export class LocalSaveStore implements SaveStore {
  constructor(
    private storage: Storage,
    private accountId: string,
    /** adopt the pre-characters single save (only the guest store should) */
    importLegacy = true,
  ) {
    if (importLegacy) this.importLegacy();
  }

  private get indexKey() {
    return `coe-${this.accountId}-characters`;
  }

  private charKey(id: string) {
    return `coe-${this.accountId}-char-${id}`;
  }

  /** One key per realm, so each challenge mode's account sits beside the standard one. */
  private accountKey(realm: Realm) {
    return `coe-${this.accountId}-account-${realm}`;
  }

  private readIndex(): CharacterSummary[] {
    try {
      return JSON.parse(this.storage.getItem(this.indexKey) ?? '[]') as CharacterSummary[];
    } catch {
      return [];
    }
  }

  private writeIndex(list: CharacterSummary[]) {
    this.storage.setItem(this.indexKey, JSON.stringify(list));
  }

  /** The pre-characters single save becomes this account's first character. */
  private importLegacy() {
    const legacy = this.storage.getItem(SAVE_KEY);
    if (!legacy) return;
    try {
      const s = deserialize(legacy);
      this.writeSync(s);
      this.storage.removeItem(SAVE_KEY);
    } catch (err) {
      reportError(err, { where: 'importLegacy' });
    }
  }

  private writeSync(s: GameState) {
    this.storage.setItem(this.charKey(s.character.id), serialize(s));
    const list = this.readIndex().filter((c) => c.id !== s.character.id);
    list.push(summarize(s));
    this.writeIndex(list);
  }

  async list(): Promise<CharacterSummary[]> {
    return this.readIndex().sort((a, b) => b.lastPlayed - a.lastPlayed);
  }

  async load(id: string): Promise<GameState | null> {
    const raw = this.storage.getItem(this.charKey(id));
    return raw ? deserialize(raw) : null;
  }

  /**
   * Writes synchronously before resolving, so it is safe to call from beforeunload.
   * A full or blocked browser storage rejects the promise rather than throwing, so callers' `.catch` sees it.
   */
  save(s: GameState): Promise<void> {
    try {
      this.writeSync(s);
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async remove(id: string): Promise<void> {
    this.storage.removeItem(this.charKey(id));
    this.storage.removeItem(this.syncKey(id));
    this.writeIndex(this.readIndex().filter((c) => c.id !== id));
  }

  private syncKey(id: string) {
    return `coe-${this.accountId}-sync-${id}`;
  }

  /** Which cloud version this browser's copy of a character grew from (cloud accounts only). */
  syncBase(id: string): SyncBase | null {
    try {
      return JSON.parse(this.storage.getItem(this.syncKey(id)) ?? 'null') as SyncBase | null;
    } catch {
      return null;
    }
  }

  setSyncBase(id: string, base: SyncBase): void {
    this.storage.setItem(this.syncKey(id), JSON.stringify(base));
  }

  /** Keeps a copy that lost to another device's save, so it can still be recovered by hand. One per character. */
  keepConflict(s: GameState): void {
    this.storage.setItem(`coe-${this.accountId}-conflict-${s.character.id}`, serialize(s));
  }

  conflictCopy(id: string): string | null {
    return this.storage.getItem(`coe-${this.accountId}-conflict-${id}`);
  }

  async loadAccount(realm: Realm = STANDARD_REALM): Promise<AccountState | null> {
    return this.peekAccount(realm);
  }

  peekAccount(realm: Realm = STANDARD_REALM): AccountState | null {
    const raw = this.storage.getItem(this.accountKey(realm));
    return raw ? fillAccount(JSON.parse(raw) as AccountState) : null;
  }

  async pullAccount(): Promise<AccountState | null> {
    return null;
  }

  /** Synchronous like save(), so an item never leaves the stash without reaching the bag. Rejects, like save(), if storage is full. */
  saveAccount(a: AccountState): Promise<void> {
    try {
      this.storage.setItem(this.accountKey(a.realm), JSON.stringify(a));
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async removeAccount(realm: Realm = STANDARD_REALM): Promise<void> {
    this.storage.removeItem(this.accountKey(realm));
  }
}

/** Whether this browser holds guest progress, including the pre-characters single save. */
export async function hasGuestProgress(storage: Storage, guestId: string | undefined): Promise<boolean> {
  if (storage.getItem(SAVE_KEY)) return true;
  return !!guestId && (await new LocalSaveStore(storage, guestId, false).list()).length > 0;
}

/** A demo's characters: held in memory only, so they end with the tab. */
export class MemorySaveStore implements SaveStore {
  private chars = new Map<string, { summary: CharacterSummary; raw: string }>();
  private accounts = new Map<Realm, string>();

  async list(): Promise<CharacterSummary[]> {
    return [...this.chars.values()].map((c) => c.summary).sort((a, b) => b.lastPlayed - a.lastPlayed);
  }

  async load(id: string): Promise<GameState | null> {
    const c = this.chars.get(id);
    return c ? deserialize(c.raw) : null;
  }

  async save(s: GameState): Promise<void> {
    this.chars.set(s.character.id, { summary: summarize(s), raw: serialize(s) });
  }

  async remove(id: string): Promise<void> {
    this.chars.delete(id);
  }

  async loadAccount(realm: Realm = STANDARD_REALM): Promise<AccountState | null> {
    return this.peekAccount(realm);
  }

  peekAccount(realm: Realm = STANDARD_REALM): AccountState | null {
    const raw = this.accounts.get(realm);
    return raw ? fillAccount(JSON.parse(raw) as AccountState) : null;
  }

  async pullAccount(): Promise<AccountState | null> {
    return null;
  }

  async saveAccount(a: AccountState): Promise<void> {
    this.accounts.set(a.realm, JSON.stringify(a));
  }

  async removeAccount(realm: Realm = STANDARD_REALM): Promise<void> {
    this.accounts.delete(realm);
  }
}

// ---------- cloud ----------

/** One row of the Supabase `characters` table. */
export interface CharacterRow {
  id: string;
  name: string;
  class_id: string;
  summary: CharacterSummary;
  save: unknown;
  updated_at?: string;
}

/**
 * The account shares the `characters` table as one reserved row per player, so it works with no database change.
 * Ids are unique across all players, hence the user id.
 */
export const ACCOUNT_ROW_PREFIX = 'account:';
const ACCOUNT_CLASS = 'account';

/**
 * The handful of table operations the cloud store needs (Supabase in the app, in-memory in tests).
 * `stamp` is the row's `updated_at` as the server stored it: it changes on every write, so it identifies a version.
 */
export interface CharacterTable {
  list(): Promise<{ id: string; summary: CharacterSummary }[]>;
  get(id: string): Promise<{ save: unknown; summary?: CharacterSummary; updated_at?: string } | null>;
  /** The row's current version and summary, without the (large) save, or null if there is no row. */
  head(id: string): Promise<{ stamp: string; summary: CharacterSummary } | null>;
  /** Writes the row whatever is there (a brand-new character, or the account row). Returns the stored version. */
  upsert(row: CharacterRow): Promise<string>;
  /** Writes over the row only if it is still at version `stamp`. Returns the new version, or null if it has moved on or is gone. */
  replace(row: CharacterRow, stamp: string): Promise<string | null>;
  remove(id: string): Promise<void>;
}

export type SyncStatus = 'synced' | 'saving' | 'offline';

function sessionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/**
 * Characters saved to the cloud, with a local copy in browser storage so a slow or failed
 * request never loses progress.
 *
 * A character upload only replaces the cloud copy it grew from. If another device (or a stale tab) has saved
 * since, the upload is refused rather than putting older progress over newer, whatever the clocks say.
 * Loading takes the local copy only when it grew from the current cloud version.
 */
export class CloudSaveStore implements SaveStore {
  status: SyncStatus = 'synced';
  onStatus?: (s: SyncStatus) => void;
  /** Another device saved this character after this session last synced it: this session stops uploading it. */
  onConflict?: (id: string) => void;
  private inFlight = new Map<string, Promise<void>>();
  private queued = new Map<string, () => CharacterRow>();
  /** this session's view of each character's cloud version; the browser's stored copy is the fallback */
  private bases = new Map<string, SyncBase>();
  private conflicted = new Set<string>();
  private readonly session = sessionId();
  private localFailReported = false;

  constructor(
    private table: CharacterTable,
    private cache: LocalSaveStore,
    private userId: string,
  ) {}

  /** The browser's own copy couldn't be written (storage full or blocked): say so once, and keep saving to the cloud. */
  private localFailed = (err: unknown) => {
    if (this.localFailReported) return;
    this.localFailReported = true;
    reportError(err, { where: 'saveLocal' });
  };

  private base(id: string): SyncBase | null {
    return this.bases.get(id) ?? this.cache.syncBase(id);
  }

  private setBase(id: string, base: SyncBase) {
    this.bases.set(id, base);
    try {
      this.cache.setSyncBase(id, base);
    } catch (err) {
      // storage full: this session still remembers it
      this.localFailed(err);
    }
  }

  /** A row this session wrote itself (its reply may have been lost), no newer than what it is about to write. */
  private ownRow(head: { summary: CharacterSummary } | null, row: CharacterRow) {
    return !!head && head.summary?.savedBy === this.session && head.summary.lastPlayed <= row.summary.lastPlayed;
  }

  private conflict(id: string) {
    if (this.conflicted.has(id)) return;
    this.conflicted.add(id);
    this.queued.delete(id);
    reportError(new Error('Cloud save refused: another device saved this character first'), { where: 'saveConflict', id });
    this.onConflict?.(id);
  }

  private accountRow(realm: Realm) {
    return `${ACCOUNT_ROW_PREFIX}${realm}:${this.userId}`;
  }

  private setStatus(s: SyncStatus) {
    if (this.status === s) return;
    this.status = s;
    this.onStatus?.(s);
  }

  async list(): Promise<CharacterSummary[]> {
    const local = await this.cache.list();
    let remote: CharacterSummary[] = [];
    try {
      remote = (await this.table.list()).filter((r) => !r.id.startsWith(ACCOUNT_ROW_PREFIX)).map((r) => r.summary);
      this.setStatus('synced');
    } catch {
      this.setStatus('offline');
    }
    const byId = new Map<string, CharacterSummary>();
    for (const c of [...remote, ...local]) {
      const prev = byId.get(c.id);
      if (!prev || c.lastPlayed > prev.lastPlayed) byId.set(c.id, c);
    }
    return [...byId.values()].sort((a, b) => b.lastPlayed - a.lastPlayed);
  }

  async load(id: string): Promise<GameState | null> {
    const local = await this.cache.load(id);
    let row: Awaited<ReturnType<CharacterTable['get']>> = null;
    try {
      row = await this.table.get(id);
      this.setStatus('synced');
    } catch {
      // offline: play the local copy; the next save checks the cloud before writing over it
      this.setStatus('offline');
      return local;
    }
    this.conflicted.delete(id);
    const remote = row ? deserialize(JSON.stringify(row.save)) : null;
    if (!row || !remote) {
      if (local) void this.save(local);
      return local;
    }
    const stamp = row.updated_at;
    const base = this.base(id);
    let useLocal: boolean;
    if (!local) useLocal = false;
    else if (!stamp || !base) useLocal = local.lastSaved > remote.lastSaved; // no version on record yet (saves from before this check)
    else if (base.stamp === stamp) useLocal = local.lastSaved > base.savedAt; // nobody else has saved since this browser last synced
    else useLocal = false; // another device saved since: its copy wins, whatever the clocks say
    if (stamp) this.setBase(id, { stamp, savedAt: remote.lastSaved });
    if (useLocal) {
      void this.save(local!);
      return local;
    }
    if (local && base && stamp && base.stamp !== stamp && local.lastSaved > base.savedAt) {
      // both devices played on from the same save: keep the losing copy rather than silently drop it
      try {
        this.cache.keepConflict(local);
      } catch (err) {
        this.localFailed(err);
      }
      reportError(new Error('Cloud save conflict: kept the cloud copy'), { where: 'loadConflict', id, localSaved: local.lastSaved, cloudSaved: remote.lastSaved });
    }
    await this.cache.save(remote).catch(this.localFailed);
    return remote;
  }

  /** Writes the local copy immediately, then uploads; overlapping saves collapse into one. A failed local write still uploads. */
  save(s: GameState): Promise<void> {
    this.cache.save(s).catch(this.localFailed);
    return this.upload(
      s.character.id,
      () => ({
        id: s.character.id,
        name: s.character.name,
        class_id: s.character.classId,
        summary: { ...summarize(s), savedBy: this.session },
        save: JSON.parse(serialize(s)),
        updated_at: new Date(s.lastSaved).toISOString(),
      }),
      (row) => this.writeCharacter(row),
    );
  }

  /** Replaces the cloud copy only if it is still the version this session last saw. Returns false if refused. */
  private async writeCharacter(row: CharacterRow): Promise<boolean> {
    const id = row.id;
    if (this.conflicted.has(id)) return false;
    let base = this.base(id);
    if (!base) {
      const head = await this.table.head(id);
      if (!head) {
        this.setBase(id, { stamp: await this.table.upsert(row), savedAt: row.summary.lastPlayed });
        return true;
      }
      // a cloud copy this session never loaded: don't write over it blind
      if (!this.ownRow(head, row)) {
        this.conflict(id);
        return false;
      }
      base = { stamp: head.stamp, savedAt: head.summary.lastPlayed };
    }
    let stamp = await this.table.replace(row, base.stamp);
    if (stamp === null) {
      // maybe our own last write landed but its reply was lost
      const head = await this.table.head(id);
      if (head && head.stamp !== base.stamp && this.ownRow(head, row)) stamp = await this.table.replace(row, head.stamp);
      else if (head && head.stamp === base.stamp) {
        // the row is still at our version, so the version match itself failed: don't stop saving over it
        reportError(new Error('Cloud save version match failed'), { where: 'saveStamp', id, stamp: base.stamp });
        stamp = await this.table.upsert(row);
      }
    }
    if (stamp === null) {
      this.conflict(id);
      return false;
    }
    this.setBase(id, { stamp, savedAt: row.summary.lastPlayed });
    return true;
  }

  private upload(id: string, row: () => CharacterRow, write: (row: CharacterRow) => Promise<boolean | string>): Promise<void> {
    if (this.inFlight.has(id)) {
      this.queued.set(id, row);
      return this.inFlight.get(id)!;
    }
    const run = async (make: () => CharacterRow): Promise<void> => {
      this.setStatus('saving');
      try {
        // a refused write leaves the progress in this browser only, which is what 'offline' tells the player
        this.setStatus((await write(make())) === false ? 'offline' : 'synced');
      } catch {
        this.setStatus('offline');
      }
      const next = this.queued.get(id);
      this.queued.delete(id);
      if (next) await run(next);
    };
    const p = run(row).finally(() => this.inFlight.delete(id));
    this.inFlight.set(id, p);
    return p;
  }

  /** The cloud first: if that fails the local copy stays, so a dead Hardcore character can't come back from an older cloud save. */
  async remove(id: string): Promise<void> {
    await this.table.remove(id);
    await this.cache.remove(id);
    this.bases.delete(id);
    this.conflicted.delete(id);
  }

  /** Same rule as a character, except that the newer copy also takes every unlock from the older one. */
  async loadAccount(realm: Realm = STANDARD_REALM): Promise<AccountState | null> {
    const local = await this.cache.loadAccount(realm);
    let remote: AccountState | null = null;
    try {
      const row = await this.table.get(this.accountRow(realm));
      remote = row ? fillAccount(row.save as AccountState) : null;
      this.setStatus('synced');
    } catch {
      this.setStatus('offline');
    }
    if (remote && (!local || remote.rev >= local.rev)) {
      const merged = local ? reconcileAccounts(remote, local) : remote;
      await this.cache.saveAccount(merged).catch(this.localFailed);
      return merged;
    }
    if (!local) return null;
    const merged = remote ? reconcileAccounts(local, remote) : local;
    void this.saveAccount(merged);
    return merged;
  }

  peekAccount(realm: Realm = STANDARD_REALM): AccountState | null {
    return this.cache.peekAccount(realm);
  }

  async pullAccount(realm: Realm = STANDARD_REALM): Promise<AccountState | null> {
    try {
      const row = await this.table.get(this.accountRow(realm));
      return row ? fillAccount(row.save as AccountState) : null;
    } catch {
      return null;
    }
  }

  /** The account merges by `rev` and unlocks rather than versions (see loadAccount), so it keeps a plain write. */
  saveAccount(a: AccountState): Promise<void> {
    this.cache.saveAccount(a).catch(this.localFailed);
    const id = this.accountRow(a.realm);
    return this.upload(
      id,
      () => ({
        id,
        name: 'Account',
        class_id: ACCOUNT_CLASS,
        summary: { id, name: 'Account', classId: 'warrior', combatLevel: 0, totalLevel: 0, createdAt: 0, lastPlayed: 0 },
        save: JSON.parse(JSON.stringify(a)),
        updated_at: new Date().toISOString(),
      }),
      (row) => this.table.upsert(row),
    );
  }

  async removeAccount(realm: Realm = STANDARD_REALM): Promise<void> {
    await this.cache.removeAccount(realm);
    await this.table.remove(this.accountRow(realm));
  }
}

/** Written only when a demo player signs up, so the character survives a redirect or an email link. */
export const DEMO_PENDING_KEY = 'coe-demo-pending';

/** Save a stashed demo character to an account. Returns its id. */
export async function adoptDemo(raw: string, to: SaveStore): Promise<string> {
  const s = deserialize(raw);
  const demo = new MemorySaveStore();
  await demo.save(s);
  await moveCharacters(demo, to, (await to.list()).map((c) => c.name));
  return s.character.id;
}

/** Move every character from one store to another (guest → account). Returns how many moved. */
export async function moveCharacters(from: SaveStore, to: SaveStore, takenNames: string[]): Promise<number> {
  // each old account's stash and unlocks come along; its id stops a retry counting them twice
  for (const realm of new Set([STANDARD_REALM, ...(await from.list()).map((c) => c.realm ?? STANDARD_REALM)])) {
    const incoming = await from.loadAccount(realm);
    if (!incoming) continue;
    const target = (await to.loadAccount(realm)) ?? freshAccount(realm);
    if (!target.absorbed.includes(incoming.id)) {
      absorbAccount(target, incoming);
      target.absorbed.push(incoming.id);
      target.rev += 1;
      await to.saveAccount(target);
    }
    await from.removeAccount(realm);
  }
  const taken = new Set(takenNames.map((n) => n.toLowerCase()));
  let moved = 0;
  for (const c of await from.list()) {
    const s = await from.load(c.id);
    if (!s) continue;
    // keep names unique on the account
    let name = s.character.name;
    for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${s.character.name.slice(0, 13)} ${i}`;
    s.character.name = name;
    taken.add(name.toLowerCase());
    await to.save(s);
    await from.remove(c.id);
    moved++;
  }
  return moved;
}
