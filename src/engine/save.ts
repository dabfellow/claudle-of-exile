import { classDef } from '../data/classes';
import { bundleCharacter, fillAccount, freshAccount } from './account';
import { newAscendancyRuntime, newAscendancyState } from './ascendancy';
import { TRIALS } from '../data/ascendancies';
import { SKILL_BAR_SLOTS } from '../data/gems';
import { PASSIVE_BY_ID } from '../data/passiveTree';
import { BAG_SIZE, STASH_PAGE_SIZE, STASH_START_PAGES } from '../data/hideout';
import { ACTIONS, hasAction } from '../data/skills';
import { HEIST_JOBS } from '../data/heist';
import { legacyMasteryForAction, legacyMasteryForHeist } from '../data/skillingMastery';
import { FLASK_SLOTS } from '../data/flasks';
import { UNIQUE_MAPS } from '../data/maps';
import { ZONES } from '../data/zones';
import { settleGems } from './gems';
import { newExpeditionState, settleExpedition } from './expedition';
import { newHeistState, settleHeist } from './heist';
import { settleMaps } from './maps';
import { connectedWithout, settlePassivePoints, settleTreeLayout } from './passives';
import { openReachedZones } from './progress';
import { giveStarterGems, newGame, SAVE_VERSION } from './state';
import type { AccountPool, AccountTransfer, FlaskInstance, GameState, Item } from './types';
import { charXpFromOldCurve } from './xp';
import { MASTERY_CAP, settleSkillingMastery } from './skillingMastery';
import { migrateLegacyLootFilters, settleLootFilters } from './lootFilter';
import { migrateSettingsProfiles, settleTreeProfiles } from './treeProfiles';

// kept from the game's old name: changing it would orphan every existing save
export const SAVE_KEY = 'claudle-of-exile-save';

type Migration = (raw: Record<string, unknown>) => void;

/** Saves before version 21 kept the stash on the character. */
type OldSave = GameState & { stash: Item[][] };
/** Saves before version 27 kept currency, materials, spare gems and flasks on the character. */
type PoolSave = GameState & AccountPool;

/** MIGRATIONS[n] upgrades a save from version n to n + 1. */
function resetAscendancyPoints(raw: Record<string, unknown>): void {
  const asc = raw.ascendancy as { trials: number; points: number; nodes: string[] } | undefined;
  if (!asc) return;
  asc.points = TRIALS.filter((t) => t.n <= asc.trials).reduce((a, t) => a + t.points, 0);
  if (asc.nodes.length > asc.points) asc.nodes = [];
}

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
    const s = raw as unknown as PoolSave;
    s.skillBar ??= Array(SKILL_BAR_SLOTS).fill(null);
    s.gems ??= [];
    s.supportGems ??= [];
    if (!s.skillBar.some(Boolean)) giveStarterGems(s);
    if (s.action?.kind === 'combat') s.action = null;
    s.combat = null;
  },
  4: (raw) => {
    // flasks became items with rarity, modifiers and an enchantment slot
    const s = raw as unknown as PoolSave;
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
    const s = raw as unknown as OldSave;
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
  // the Trader's Stall became the Town's three shops; Stash upgrades give pages; the Bench must be built
  16: (raw) => {
    raw.vendor = { stock: [], refreshAt: 0 }; // restocks on the next tick, shop by shop
    const hideout = (raw.hideout ?? {}) as Record<string, number>;
    const stash = raw.stash as unknown[][] | undefined;
    if (stash) for (let i = 1; i < (hideout.stash ?? 1); i++) stash.push([]);
    // the old level 1 bench already salvaged: count it as built so nobody loses that
    if ((hideout.bench ?? 1) < 2) hideout.bench = 2;
    raw.hideout = hideout;
  },
  // the affix pool pass (docs/GAME.md): Item Rarity became a prefix, so move it on existing items
  17: (raw) => {
    const s = raw as unknown as OldSave;
    const fix = (item: Item | undefined) => {
      if (!item || item.uniqueId) return;
      const moved = item.suffixes.filter((m) => m.affixId === 'item_rarity');
      if (!moved.length) return;
      item.suffixes = item.suffixes.filter((m) => m.affixId !== 'item_rarity');
      item.prefixes.push(...moved);
    };
    for (const list of [s.inventory, s.ground, s.offlineHaul, ...(s.stash ?? [])]) list?.forEach(fix);
    Object.values(s.equipment ?? {}).forEach(fix);
    s.vendor?.stock?.forEach((o) => fix(o.item));
  },
  18: (raw) => {
    // the battlefield became a half-ring of hexes (docs/GAME.md): old cells mean nothing now, so the fight restarts
    const s = raw as unknown as GameState;
    if (!s.combat) return;
    s.combat.monsters = [];
    s.combat.ground = [];
    s.combat.gates = undefined;
  },
  19: (raw) => {
    // a skill's one rule became a list of rule slots, with a priority; rules that are now locked stay set and wait for their unlock
    const s = raw as unknown as PoolSave;
    for (const gem of [...(s.skillBar ?? []), ...(s.gems ?? [])] as unknown as (Record<string, unknown> | null)[]) {
      if (!gem) continue;
      gem.rules ??= [gem.rule ?? { when: 'manual' }];
      gem.priority ??= 'normal';
      delete gem.rule;
    }
  },
  20: (raw) => {
    // the hideout, unlocks and stash moved up to the account: they wait here until the character is settled onto it.
    // Anyone who earned the Exile under the old rule (Act 1) keeps it.
    const s = raw as unknown as OldSave & { hideout?: Record<string, number>; automation?: AccountTransfer['automation'] };
    s.unmerged = {
      hideout: s.hideout,
      automation: s.automation,
      stash: s.stash,
      exileUnlocked: s.character?.classId === 'exile' || !!s.bossesDefeated?.includes('sanctum'),
    };
    delete raw.hideout;
    delete raw.automation;
    delete raw.stash;
  },
  21: (raw) => {
    // Thieving and Heist arrived: everyone starts at level 1 with no crew, and Act 2 characters find the marks already open
    (raw.skills as Record<string, number>).thieving ??= 0;
    raw.heist ??= newHeistState();
  },
  22: (raw) => {
    // Rune-carving arrived: everyone starts at level 1, and gear with no `rune` field simply has an empty slot
    (raw.skills as Record<string, number>).runecarving ??= 0;
    // ascendancies arrived: nobody has passed a trial yet
    const s = raw as unknown as GameState;
    s.ascendancy ??= newAscendancyState();
    if (s.combat) s.combat.asc ??= newAscendancyRuntime();
  },
  23: (raw) => {
    // the DPS meter arrived: a fight in progress starts it from nothing
    const s = raw as unknown as GameState;
    if (s.combat) {
      s.combat.dealt ??= [0];
      s.combat.dealtMs ??= 0;
    }
  },
  24: (raw) => {
    // the character curve changed: everyone keeps their level and progress
    const skills = raw.skills as Record<string, number> | undefined;
    if (skills?.combat) skills.combat = charXpFromOldCurve(skills.combat);
  },
  25: (raw) => {
    // Archaeology and Expedition arrived: everyone starts at level 1 with nothing dug, and the sites wait for Act 4
    (raw.skills as Record<string, number>).archaeology ??= 0;
    raw.expedition ??= newExpeditionState();
  },
  26: (raw) => {
    // every Stash tab moved up to the account: they wait here until the character is settled onto it
    const s = raw as unknown as PoolSave;
    s.unpooled = { bank: s.bank, gems: s.gems, supportGems: s.supportGems, flaskStash: s.flaskStash };
    delete raw.bank;
    delete raw.gems;
    delete raw.supportGems;
    delete raw.flaskStash;
  },
  27: (raw) => {
    // the tutorial gained three Crafting Bench steps after Equip (index 8): later steps move down three
    const tut = raw.tutorial as { step: number; done?: boolean } | undefined;
    if (tut && !tut.done && tut.step >= 9) tut.step += 3;
  },
  // bosses stopped giving ascendancy points: only passed trials count, and a tree that no longer fits is handed back
  28: resetAscendancyPoints,
  29: (raw) => {
    // Wellspring replaced Wildcaster: the character moves over, and its nodes come back as points to spend
    const s = raw as unknown as { ascendancy?: { id: string | null; nodes: string[] }; combat?: { asc?: unknown } };
    if (s.ascendancy?.id === 'wildcaster') {
      s.ascendancy.id = 'wellspring';
      s.ascendancy.nodes = [];
    }
    if (s.combat) s.combat.asc = newAscendancyRuntime();
  },
  30: (raw) => {
    // the Mage's choice changed: every Mage who picked gets to pick again, with their points to spend
    const s = raw as unknown as Pick<GameState, 'ascendancy' | 'character' | 'combat'>;
    if (s.character.classId !== 'mage' || !s.ascendancy?.id) return;
    s.ascendancy.id = null;
    s.ascendancy.nodes = [];
    s.ascendancy.carry = 0;
    if (s.combat) {
      s.combat.mech = 0;
      s.combat.asc = newAscendancyRuntime();
    }
  },
  // trials cut to 3 points each, so the tree can't be filled
  31: resetAscendancyPoints,
  32: (raw) => {
    // the skill reform moved early leech to later acts: characters from before it are owed The Old Covenant
    raw.keepsakeDue = true;
  },
  33: (raw) => {
    // class mechanics moved from the character tree into ascendancies, and the old rim became build-neutral.
    // Refund the character tree so nobody silently receives unrelated replacements for their old nodes.
    raw.passives = [];
    raw.masteries = {};
  },
  34: (raw) => {
    // Notable paths now cost 2, capstone paths cost 3, and the fourth trial completes the 9-point budget.
    // Return every ascendancy point so existing characters can make a clean choice in the new layout.
    const asc = raw.ascendancy as { trials: number; points: number; nodes: string[] } | undefined;
    if (!asc) return;
    asc.nodes = [];
    resetAscendancyPoints(raw);
  },
  35: (raw) => {
    // Character-tree roads and cluster interiors became shorter. Refund the old graph rather than leave stale nodes.
    raw.passives = [];
    raw.masteries = {};
  },
  36: (raw) => {
    // The skilling tree became a capped specialisation and Fishing's dead branch became Gemcutting.
    // Refund every skilling point so nobody keeps removed nodes or an over-budget allocation.
    raw.skillPassives = [];
  },
  37: (raw) => {
    // Non-combat action mastery starts fresh: old skill XP cannot identify which authored band was practised.
    raw.skillingMastery = {};
  },
  38: (raw) => {
    // 5x Passive tree overhaul: reset all character passives and masteries across all loadout profiles so players start fresh.
    raw.passives = [];
    raw.masteries = {};
    raw.passivePointLevel = null;
    raw.passiveQuestPoints = null;
    raw.characterTreeOverhaul = 2;
    if (Array.isArray(raw.passiveProfiles)) {
      for (const p of raw.passiveProfiles as Record<string, unknown>[]) {
        p.passives = [];
        p.masteries = {};
      }
    }
  },
  39: (raw) => {
    // The compact cluster graph needs fewer pathing points and more points for the Notables beside those paths.
    // Recount both pools from level and current spending on load; allocations themselves remain untouched.
    raw.passivePointLevel = null;
    raw.passiveQuestPoints = null;
  },
  40: (raw) => {
    // Passive rewards fell from three per level to one. Recount unspent pools without removing allocations.
    raw.passivePointLevel = null;
    raw.passiveQuestPoints = null;
  },
  41: (raw) => {
    // Bands used to benefit every task in the band. Preserve that benefit by giving every replacement task
    // the same completion percentage: the old ten-hour cap therefore becomes 120 hours on each task.
    const old = raw.skillingMastery && typeof raw.skillingMastery === 'object' && !Array.isArray(raw.skillingMastery)
      ? raw.skillingMastery as Record<string, unknown>
      : {};
    const converted: Record<string, unknown> = { ...old };
    const carry = (oldId: string | undefined, newId: string | undefined) => {
      if (!oldId || !newId) return;
      const practice = old[oldId];
      if (typeof practice !== 'number' || !Number.isFinite(practice) || practice <= 0) return;
      converted[newId] = Math.max(typeof converted[newId] === 'number' ? converted[newId] as number : 0, Math.min(MASTERY_CAP, practice * (MASTERY_CAP / 36_000)));
    };
    for (const action of ACTIONS) carry(legacyMasteryForAction(action)?.id, action.mastery?.id);
    for (const job of HEIST_JOBS) carry(legacyMasteryForHeist(job).id, job.mastery?.id);
    raw.skillingMastery = converted;
  },
  42: backfillAchievementCounters,
  43: (raw) => {
    // Profile-style loot filters became one layered filter. Carry the active profile's ordered intent forward.
    const settings = raw.settings as GameState['settings'] | undefined;
    if (settings && !settings.lootFilter) {
      settings.lootFilter = migrateLegacyLootFilters(settings);
      settings.activeLootFilterId = null;
    }
  },
  44: (raw) => {
    // Hideout milestone tiers: protect existing Atlas users and ensure rune_board is initialized
    const acct = raw.account as Record<string, unknown> | undefined;
    if (acct) {
      const hideout = (acct.hideout ??= {}) as Record<string, number>;
      hideout.rune_board ??= 1;
      const atlas = acct.atlas as { nodes?: string[]; cleared?: number[] } | undefined;
      if (((atlas?.nodes?.length ?? 0) > 0 || (atlas?.cleared?.length ?? 0) > 0 || acct.campaignDone) && (hideout.map_device ?? 1) < 2) {
        hideout.map_device = 2;
      }
    }
  },
};

/**
 * 100+ achievements arrived, with new counters. A Doomed or Unique Map boss this character has beaten is already in
 * its `bossesDefeated`, so those clears count from the start; rare kills were never counted, so they start at 0.
 * Achievements the character now meets are granted, with rewards, when it next loads (engine/achievements.ts).
 */
export function backfillAchievementCounters(raw: Record<string, unknown>): void {
  const lifetime = (raw.lifetime ??= {}) as Record<string, unknown>;
  const beaten = Array.isArray(raw.bossesDefeated) ? (raw.bossesDefeated as string[]) : [];
  const doomedTiers = beaten.map((id) => /^map_doomed_(?:.+_)?t(\d+)$/.exec(id)).filter(Boolean).map((m) => Number(m![1]));
  lifetime.doomedBest = Math.max(Number(lifetime.doomedBest) || 0, ...doomedTiers);
  const uniqueMaps = new Set([...(Array.isArray(lifetime.uniqueMaps) ? (lifetime.uniqueMaps as string[]) : []), ...beaten.filter((id) => UNIQUE_MAPS.some((m) => m.id === id))]);
  lifetime.uniqueMaps = [...uniqueMaps];
  lifetime.rareKills = Number(lifetime.rareKills) || 0;
}

/** Top-level object fields whose defaults get merged under saved values. */
const MERGE_KEYS = new Set(['skills', 'settings', 'lifetime', 'vendor', 'tutorial', 'masteries', 'smithCatalyst']);

/** One character, without the account: that's saved on its own. */
export function serialize(s: GameState): string {
  return JSON.stringify({ ...s, account: undefined });
}

/** A character with the account folded in, to carry it to another account. */
export function serializeBundle(s: GameState): string {
  return JSON.stringify(bundleCharacter(s));
}

/**
 * Thrown when a save was written by a newer version of the game than this page is running.
 * Loading it would skip changes this page doesn't know about and then stamp it with an older version
 * when saved, so the page refuses and asks for a refresh instead.
 */
export class NewerSaveError extends Error {
  constructor(public readonly saveVersion: number) {
    super(`This save is from a newer version of the game (${saveVersion}, this page is ${SAVE_VERSION}). Refresh the page to update.`);
    this.name = 'NewerSaveError';
  }
}

/** Loads a character with an empty account: the caller attaches the real one. */
export function deserialize(json: string): GameState {
  const raw = JSON.parse(json) as Record<string, unknown>;
  raw.account ??= freshAccount();
  let v = typeof raw.version === 'number' ? raw.version : 0;
  if (v > SAVE_VERSION) throw new NewerSaveError(v);
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
  fillAccount(s.account);
  if (s.flaskSlots) {
    if (s.flaskSlots.length > FLASK_SLOTS) {
      const extra = s.flaskSlots.slice(FLASK_SLOTS);
      s.flaskSlots = s.flaskSlots.slice(0, FLASK_SLOTS);
      for (const f of extra) if (f) s.account.flaskStash.push(f);
    }
    while (s.flaskSlots.length < FLASK_SLOTS) s.flaskSlots.push(null);
  }
  unlockReachedZones(s);
  settleGems(s);
  settleMaps(s);
  settleHeist(s);
  settleExpedition(s);
  settleSkillingMastery(s);
  migrateSettingsProfiles(s);
  settleTreeLayout(s);
  settlePassivePoints(s);
  settleLootFilters(s);
  settleTreeProfiles(s);
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
  const bytes = new TextEncoder().encode(serializeBundle(s));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export function importSave(text: string): GameState {
  const bin = atob(text.trim());
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return deserialize(new TextDecoder().decode(bytes));
}
