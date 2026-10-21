import type { ClassId } from '../data/classes';
import { deserialize, SAVE_KEY, serialize } from '../engine/save';
import { SKILL_IDS, type GameState } from '../engine/types';
import { characterLevel } from '../engine/character';
import { levelOf } from '../engine/xp';

export interface CharacterSummary {
  id: string;
  name: string;
  classId: ClassId;
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
    combatLevel: characterLevel(s),
    totalLevel: SKILL_IDS.filter((k) => k !== 'combat').reduce((a, k) => a + levelOf(k, s.skills[k]), 0),
    createdAt: s.character.createdAt,
    lastPlayed: s.lastSaved,
  };
}

/** Saves in browser storage: an index of summaries plus one key per character. */
export class LocalSaveStore implements SaveStore {
  constructor(
    private storage: Storage,
    private accountId: string,
  ) {
    this.importLegacy();
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
      console.error('Could not import legacy save', err);
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
