import type { ClassId } from '../data/classes';
import { deserialize, SAVE_KEY, serialize } from '../engine/save';
import { SKILL_IDS, type GameState } from '../engine/types';
import { characterLevel } from '../engine/character';
import { levelOf } from '../engine/xp';
import { reportError } from './errors';

export interface CharacterSummary {
  id: string;
  name: string;
  classId: ClassId;
  /** unlocks the Exile for the whole account */
  act1Cleared?: boolean;
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
}

export function summarize(s: GameState): CharacterSummary {
  return {
    id: s.character.id,
    name: s.character.name,
    classId: s.character.classId,
    act1Cleared: s.bossesDefeated.includes('sanctum'),
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
  private queued = new Map<string, GameState>();

  constructor(
    private table: CharacterTable,
    private cache: LocalSaveStore,
  ) {}

  private setStatus(s: SyncStatus) {
    if (this.status === s) return;
    this.status = s;
    this.onStatus?.(s);
  }

  async list(): Promise<CharacterSummary[]> {
    const local = await this.cache.list();
    let remote: CharacterSummary[] = [];
    try {
      remote = (await this.table.list()).map((r) => r.summary);
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
    const id = s.character.id;
    if (this.inFlight.has(id)) {
      this.queued.set(id, s);
      return this.inFlight.get(id)!;
    }
    const run = async (state: GameState): Promise<void> => {
      this.setStatus('saving');
      try {
        await this.table.upsert({
          id,
          name: state.character.name,
          class_id: state.character.classId,
          summary: summarize(state),
          save: JSON.parse(serialize(state)),
          updated_at: new Date(state.lastSaved).toISOString(),
        });
        this.setStatus('synced');
      } catch {
        this.setStatus('offline');
      }
      const next = this.queued.get(id);
      this.queued.delete(id);
      if (next) await run(next);
    };
    const p = run(s).finally(() => this.inFlight.delete(id));
    this.inFlight.set(id, p);
    return p;
  }

  async remove(id: string): Promise<void> {
    await this.cache.remove(id);
    await this.table.remove(id);
  }
}

/** Move every character from one store to another (guest → account). Returns how many moved. */
export async function moveCharacters(from: SaveStore, to: SaveStore, takenNames: string[]): Promise<number> {
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
