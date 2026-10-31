import type { ClassId } from '../data/classes';
import { absorbAccount, freshAccount, reconcileAccounts } from '../engine/account';
import { deserialize, SAVE_KEY, serialize } from '../engine/save';
import { SKILL_IDS, type AccountState, type GameState } from '../engine/types';
import { characterLevel } from '../engine/character';
import { levelOf } from '../engine/xp';
import { reportError } from './errors';

export interface CharacterSummary {
  id: string;
  name: string;
  classId: ClassId;
  act1Cleared?: boolean;
  /** this character has nothing left to hand over to the account */
  settled?: boolean;
  combatLevel: number;
  totalLevel: number;
  createdAt: number;
  lastPlayed: number;
}

/** Where characters live. Async so a cloud implementation can share the interface. */
export interface SaveStore {
  list(): Promise<CharacterSummary[]>;
  load(id: string): Promise<GameState | null>;
  save(s: GameState): Promise<void>;
  remove(id: string): Promise<void>;
  /** The shared account, or null if none has been saved yet. */
  loadAccount(): Promise<AccountState | null>;
  saveAccount(a: AccountState): Promise<void>;
  removeAccount(): Promise<void>;
}

export function summarize(s: GameState): CharacterSummary {
  return {
    id: s.character.id,
    name: s.character.name,
    classId: s.character.classId,
    act1Cleared: s.bossesDefeated.includes('sanctum'),
    settled: !s.unmerged,
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

  /** One key per realm, so a challenge mode's account will sit beside this one. */
  get accountKey() {
    return `coe-${this.accountId}-account-standard`;
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

  /** Writes synchronously before resolving, so it is safe to call from beforeunload. */
  save(s: GameState): Promise<void> {
    this.writeSync(s);
    return Promise.resolve();
  }

  async remove(id: string): Promise<void> {
    this.storage.removeItem(this.charKey(id));
    this.writeIndex(this.readIndex().filter((c) => c.id !== id));
  }

  async loadAccount(): Promise<AccountState | null> {
    const raw = this.storage.getItem(this.accountKey);
    return raw ? (JSON.parse(raw) as AccountState) : null;
  }

  /** Synchronous like save(), so an item never leaves the stash without reaching the bag. */
  saveAccount(a: AccountState): Promise<void> {
    this.storage.setItem(this.accountKey, JSON.stringify(a));
    return Promise.resolve();
  }

  async removeAccount(): Promise<void> {
    this.storage.removeItem(this.accountKey);
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
  private account: string | null = null;

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

  async loadAccount(): Promise<AccountState | null> {
    return this.account ? (JSON.parse(this.account) as AccountState) : null;
  }

  async saveAccount(a: AccountState): Promise<void> {
    this.account = JSON.stringify(a);
  }

  async removeAccount(): Promise<void> {
    this.account = null;
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

/** The handful of table operations the cloud store needs (Supabase in the app, in-memory in tests). */
export interface CharacterTable {
  list(): Promise<{ id: string; summary: CharacterSummary }[]>;
  get(id: string): Promise<{ save: unknown } | null>;
  upsert(row: CharacterRow): Promise<void>;
  remove(id: string): Promise<void>;
}

export type SyncStatus = 'synced' | 'saving' | 'offline';

/**
 * Characters saved to the cloud, with a local copy in browser storage so a slow or failed
 * request never loses progress. Whichever copy is newer wins when loading.
 */
export class CloudSaveStore implements SaveStore {
  status: SyncStatus = 'synced';
  onStatus?: (s: SyncStatus) => void;
  private inFlight = new Map<string, Promise<void>>();
  private queued = new Map<string, () => CharacterRow>();

  constructor(
    private table: CharacterTable,
    private cache: LocalSaveStore,
    private userId: string,
  ) {}

  private get accountRow() {
    return `${ACCOUNT_ROW_PREFIX}standard:${this.userId}`;
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
    let remote: GameState | null = null;
    try {
      const row = await this.table.get(id);
      remote = row ? deserialize(JSON.stringify(row.save)) : null;
      this.setStatus('synced');
    } catch {
      this.setStatus('offline');
    }
    if (remote && (!local || remote.lastSaved >= local.lastSaved)) {
      await this.cache.save(remote);
      return remote;
    }
    // the local copy is newer (or the only one): push it up
    if (local) void this.save(local);
    return local;
  }

  /** Writes the local copy immediately, then uploads; overlapping saves collapse into one. */
  save(s: GameState): Promise<void> {
    void this.cache.save(s);
    return this.upload(s.character.id, () => ({
      id: s.character.id,
      name: s.character.name,
      class_id: s.character.classId,
      summary: summarize(s),
      save: JSON.parse(serialize(s)),
      updated_at: new Date(s.lastSaved).toISOString(),
    }));
  }

  private upload(id: string, row: () => CharacterRow): Promise<void> {
    if (this.inFlight.has(id)) {
      this.queued.set(id, row);
      return this.inFlight.get(id)!;
    }
    const run = async (make: () => CharacterRow): Promise<void> => {
      this.setStatus('saving');
      try {
        await this.table.upsert(make());
        this.setStatus('synced');
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

  async remove(id: string): Promise<void> {
    await this.cache.remove(id);
    await this.table.remove(id);
  }

  /** Same rule as a character, except that the newer copy also takes every unlock from the older one. */
  async loadAccount(): Promise<AccountState | null> {
    const local = await this.cache.loadAccount();
    let remote: AccountState | null = null;
    try {
      const row = await this.table.get(this.accountRow);
      remote = row ? (row.save as AccountState) : null;
      this.setStatus('synced');
    } catch {
      this.setStatus('offline');
    }
    if (remote && (!local || remote.rev >= local.rev)) {
      const merged = local ? reconcileAccounts(remote, local) : remote;
      await this.cache.saveAccount(merged);
      return merged;
    }
    if (!local) return null;
    const merged = remote ? reconcileAccounts(local, remote) : local;
    void this.saveAccount(merged);
    return merged;
  }

  saveAccount(a: AccountState): Promise<void> {
    void this.cache.saveAccount(a);
    const id = this.accountRow;
    return this.upload(id, () => ({
      id,
      name: 'Account',
      class_id: ACCOUNT_CLASS,
      summary: { id, name: 'Account', classId: 'warrior', combatLevel: 0, totalLevel: 0, createdAt: 0, lastPlayed: 0 },
      save: JSON.parse(JSON.stringify(a)),
      updated_at: new Date().toISOString(),
    }));
  }

  async removeAccount(): Promise<void> {
    await this.cache.removeAccount();
    await this.table.remove(this.accountRow);
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
  // the old account's stash and unlocks come along; its id stops a retry counting them twice
  const incoming = await from.loadAccount();
  if (incoming) {
    const target = (await to.loadAccount()) ?? freshAccount();
    if (!target.absorbed.includes(incoming.id)) {
      absorbAccount(target, incoming);
      target.absorbed.push(incoming.id);
      target.rev += 1;
      await to.saveAccount(target);
    }
    await from.removeAccount();
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
