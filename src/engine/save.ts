import { SKILL_BAR_SLOTS } from '../data/gems';
import { giveStarterGems, newGame, SAVE_VERSION } from './state';
import type { FlaskInstance, GameState } from './types';

export const SAVE_KEY = 'claudle-of-exile-save';

type Migration = (raw: Record<string, unknown>) => void;

/** MIGRATIONS[n] upgrades a save from version n to n + 1. */
const MIGRATIONS: Record<number, Migration> = {
  0: (raw) => {
    // pre-release saves had no lifetime stats
    raw.lifetime ??= { kills: 0, bossKills: 0, deaths: 0, itemsLooted: 0, orbsUsed: 0 };
  },
  1: (raw) => {
    // characters and classes arrived: old saves become a Warrior who already knows the ropes
    raw.character ??= { id: 'legacy', name: 'Exile', classId: 'warrior', createdAt: Date.now() };
    raw.tutorial ??= { step: 0, progress: 0, done: true, skipped: true };
    // the single tree start was split into class starts, so old allocations may be disconnected
    raw.passives = [];
  },
  2: (raw) => {
    // mana and attributes arrived
    raw.mana ??= 30;
  },
  3: (raw) => {
    // skill gems arrived; the combat runtime changed shape, so leave any fight in progress
    const s = raw as unknown as GameState;
    s.skillBar ??= Array(SKILL_BAR_SLOTS).fill(null);
    s.gems ??= [];
    s.supportGems ??= [];
    if (!s.skillBar.some(Boolean)) giveStarterGems(s);
    if (s.action?.kind === 'combat') s.action = null;
    s.combat = null;
  },
  4: (raw) => {
    // flasks became items with rarity, modifiers and an enchantment slot
    const s = raw as unknown as GameState;
    const upgrade = (f: FlaskInstance | null) => {
      if (!f) return;
      f.rarity ??= 'normal';
      f.ilvl ??= 1;
      f.prefixes ??= [];
      f.suffixes ??= [];
      f.instill ??= null;
    };
    s.flaskSlots?.forEach(upgrade);
    s.flaskStash?.forEach(upgrade);
  },
  5: (raw) => {
    // the character tree was rebuilt (new node ids, masteries) and a skilling tree added:
    // every passive point is refunded so it can be spent on the new tree
    raw.passives = [];
    raw.masteries = {};
    raw.skillPassives ??= [];
    raw.greenhouse ??= null;
  },
};

/** Top-level object fields whose defaults get merged under saved values. */
const MERGE_KEYS = new Set(['skills', 'hideout', 'settings', 'lifetime', 'vendor', 'tutorial', 'masteries']);

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

export function deserialize(json: string): GameState {
  const raw = JSON.parse(json) as Record<string, unknown>;
  let v = typeof raw.version === 'number' ? raw.version : 0;
  while (v < SAVE_VERSION) {
    MIGRATIONS[v]?.(raw);
    v++;
  }
  raw.version = SAVE_VERSION;
  // fill any fields added since the save was written
  const fresh = newGame(1) as unknown as Record<string, unknown>;
  for (const [k, val] of Object.entries(fresh)) {
    if (raw[k] === undefined) raw[k] = val;
    else if (MERGE_KEYS.has(k)) raw[k] = { ...(val as object), ...(raw[k] as object) };
  }
  return raw as unknown as GameState;
}

export function exportSave(s: GameState): string {
  const bytes = new TextEncoder().encode(serialize(s));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export function importSave(text: string): GameState {
  const bin = atob(text.trim());
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return deserialize(new TextDecoder().decode(bytes));
}
