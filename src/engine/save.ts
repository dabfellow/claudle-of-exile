import { classDef } from '../data/classes';
import { SKILL_BAR_SLOTS } from '../data/gems';
import { PASSIVE_BY_ID } from '../data/passiveTree';
import { BAG_SIZE, STASH_PAGE_SIZE, STASH_START_PAGES } from '../data/hideout';
import { hasAction } from '../data/skills';
import { ZONES } from '../data/zones';
import { trimFlaskStash } from './flasks';
import { connectedWithout } from './passives';
import { openReachedZones } from './progress';
import { giveStarterGems, newGame, SAVE_VERSION } from './state';
import type { FlaskInstance, GameState } from './types';

// kept from the game's old name: changing it would orphan every existing save
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
  6: (raw) => {
    // achievements arrived; bosses already beaten are inferred from the areas they unlocked
    const s = raw as unknown as GameState;
    s.achievements ??= [];
    // (uses the five-area layout of the time; migration 7 maps it onto Act 1)
    const old = ['mudflats', 'ashwood', 'crypt', 'forge', 'spire'];
    s.bossesDefeated ??= old.filter((_, i) => s.unlockedZones.includes(old[i + 1]));
  },
  7: (raw) => {
    // Act 1 was rebuilt into eight areas and the Molten Forge / Celestial Spire left for later acts.
    // Progress carries over by the furthest old area reached; bosses gained mechanics, so leave any fight.
    const s = raw as unknown as GameState;
    const reachedOld = ['mudflats', 'ashwood', 'crypt', 'forge', 'spire'].reduce((n, id, i) => (s.unlockedZones?.includes(id) ? i : n), 0);
    const reached = [0, 2, 4, 5, 6][reachedOld];
    s.unlockedZones = ZONES.slice(0, reached + 1).map((z) => z.id);
    s.bossesDefeated = ZONES.slice(0, reached).map((z) => z.id);
    for (const id of ['forge', 'spire']) delete s.zoneKills?.[id];
    if (s.action?.kind === 'combat') s.action = null;
    s.combat = null;
  },
  8: (raw) => {
    // skills and monsters got their own attack and cast times; monsters in a fight in progress lack them
    const s = raw as unknown as GameState;
    if (s.action?.kind === 'combat') s.action = null;
    s.combat = null;
  },
  9: (raw) => {
    // energy shield arrived; a fight in progress has no recharge timer yet
    const s = raw as unknown as GameState;
    s.es ??= 0;
    if (s.combat) s.combat.esDelayMs ??= 0;
  },
  10: (raw) => {
    // the character tree grew to six class sectors with new node ids: refund every point
    raw.passives = [];
    raw.masteries = {};
  },
  11: (raw) => {
    // monsters took their places on a battlefield; ones in a fight in progress have no cell yet
    const s = raw as unknown as GameState;
    if (!s.combat) return;
    s.combat.fleeing ??= false;
    s.combat.shakeMs ??= 0;
    for (const m of s.combat.monsters) {
      m.cell ??= 1;
      m.stepMs ??= 0;
    }
  },
  12: (raw) => {
    // skills and monsters started using the battlefield: ground hazards, walking speeds
    const s = raw as unknown as GameState;
    if (!s.combat) return;
    s.combat.ground ??= [];
    s.combat.groundAcc ??= 0;
    s.combat.groundTimer ??= 0;
    for (const m of s.combat.monsters) {
      m.moveMs ??= 1100;
      m.attackGround ??= false;
    }
  },
  13: (raw) => {
    // gear split into ground, bag (60) and stash pages (3 × 80): overflow from the old big inventory moves to the stash
    const s = raw as unknown as GameState;
    const items = s.inventory ?? [];
    s.inventory = items.slice(0, BAG_SIZE);
    s.stash = Array.from({ length: STASH_START_PAGES }, () => []);
    let page = 0;
    for (const item of items.slice(BAG_SIZE)) {
      while (page < s.stash.length && s.stash[page].length >= STASH_PAGE_SIZE) page++;
      if (page < s.stash.length) s.stash[page].push(item);
      else s.inventory.push(item); // over capacity, but nothing is lost
    }
    s.ground = [];
    s.offlineHaul = [];
  },
  14: (raw) => {
    // class-mechanic clusters moved out to the tree's rim and generic clusters took their place:
    // keep the allocation if it still hangs together, otherwise refund every point
    const s = raw as unknown as GameState;
    const start = s.character?.startNode ?? classDef(s.character?.classId ?? 'warrior').startNode;
    const known = (s.passives ?? []).every((id) => PASSIVE_BY_ID[id]);
    if (!known || !connectedWithout(s.passives ?? [], '', start)) {
      s.passives = [];
      s.masteries = {};
    }
  },
  // the tutorial gained a Mana Flask step after the Life Flask one (index 3): later steps move down one
  15: (raw) => {
    const tut = raw.tutorial as { step: number; done?: boolean } | undefined;
    if (tut && !tut.done && tut.step >= 4) tut.step += 1;
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
  const s = raw as unknown as GameState;
  unlockReachedZones(s);
  trimFlaskStash(s);
  dropRemovedActions(s);
  return s;
}

/**
 * A boss beaten before the area after it existed (a new act opening) unlocks that area on load.
 * Not a versioned migration: acts open without the save format changing.
 */
export function unlockReachedZones(s: GameState): void {
  openReachedZones(s);
}

/** A skilling recipe that was removed or renamed (e.g. the per-attribute gem cuts) stops instead of crashing the load. */
export function dropRemovedActions(s: GameState): void {
  if (s.action?.kind === 'skill' && !hasAction(s.action.actionId)) s.action = null;
  if (s.greenhouse && !hasAction(s.greenhouse.actionId)) s.greenhouse = null;
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
