import { SEAL, WAX } from './craftMats';
import { SKILL_XP_SCALE } from './skills';
import { masteryForHeist, type MasterySpec } from './skillingMastery';

/**
 * Heist (docs/GAME.md): Thieving's Markers buy jobs against the Khanate. A job is a run of rooms, each a little
 * riskier and richer than the last, and you choose in advance how deep to go. The vault is in the last room.
 */

/** Stands for one piece of stolen rare gear in a drop list or a take. */
export const GEAR = 'gear';

export interface HeistDrop {
  id: string;
  chance: number;
  qty: number;
}

export interface HeistJob {
  id: string;
  name: string;
  desc: string;
  /** shown on the job board */
  favours: string;
  /** Thieving level needed */
  level: number;
  /** campaign area that must be unlocked first (legacy saves) */
  area?: string;
  /** prior clean exit milestone requirement */
  requires?: string;
  rooms: number;
  roomMs: number;
  /** % chance of an alarm in room n is this × n, before stealth */
  alert: number;
  xp: number;
  /** room n pays this × n gold */
  gold: number;
  /** rolled in every room, at chance × the room number */
  drops: HeistDrop[];
  /** rolled once, in the last room */
  vault: HeistDrop[];
  /** item level of stolen gear (still capped by campaign progress) */
  ilvl: number;
  mastery?: MasterySpec;
}

const job = (j: HeistJob): HeistJob => {
  const scaled = { ...j, xp: Math.round(j.xp * SKILL_XP_SCALE * 10) / 10 };
  return { ...scaled, mastery: masteryForHeist(scaled) };
};

export const HEIST_JOBS: HeistJob[] = [
  job({
    id: 'cinder_toll', name: 'The Cinder Toll', level: 1, area: 'cinderroad', rooms: 3, roomMs: 30000, alert: 5, xp: 55, gold: 15, ilvl: 24,
    desc: 'A Khanate toll house on the road, its strongbox heavier than the guards are awake.',
    favours: 'Gold',
    drops: [{ id: 'gold', chance: 0.12, qty: 15 }],
    vault: [{ id: 'gold', chance: 1, qty: 150 }],
  }),
  job({
    id: 'salt_tithe', name: 'The Salt Tithe', level: 8, area: 'saltflats', requires: 'heist_clean_cinder_toll', rooms: 4, roomMs: 35000, alert: 6, xp: 110, gold: 30, ilvl: 25,
    desc: 'Every salt wagon pays the Khan a tenth. The tally house keeps it, and the names of who owes what.',
    favours: "Rogue's Markers",
    drops: [{ id: 'gold', chance: 0.4, qty: 15 }],
    vault: [{ id: 'gold', chance: 1, qty: 180 }],
  }),
  job({
    id: 'forgers_den', name: "The Forger's Den", level: 14, area: 'blackgrass', requires: 'heist_clean_cinder_toll', rooms: 4, roomMs: 40000, alert: 7, xp: 240, gold: 60, ilvl: 26,
    desc: 'A tent deep in the blackgrass where the Khanate paymasters have their writs and seals cut.',
    favours: "Forger's Seals",
    drops: [{ id: SEAL, chance: 0.02, qty: 1 }, { id: 'gold', chance: 0.1, qty: 15 }],
    vault: [{ id: SEAL, chance: 0.35, qty: 1 }],
  }),
  job({
    id: 'last_wagon', name: 'The Last Wagon', level: 20, area: 'caravan', requires: 'heist_clean_salt_tithe', rooms: 5, roomMs: 40000, alert: 7, xp: 310, gold: 80, ilvl: 29,
    desc: "One strongwagon at Caravan's End never burned. The raiders have been arguing over its lock ever since.",
    favours: 'Stolen rare gear',
    drops: [{ id: GEAR, chance: 0.02, qty: 1 }, { id: 'gold', chance: 0.1, qty: 15 }],
    vault: [{ id: GEAR, chance: 0.6, qty: 1 }],
  }),
  job({
    id: 'barrow_cache', name: 'The Barrow Cache', level: 28, area: 'kurgans', requires: 'heist_clean_salt_tithe', rooms: 5, roomMs: 45000, alert: 8, xp: 560, gold: 110, ilvl: 30,
    desc: 'Khanate grave-wardens seal their dead in with lamp wax, and hide their pay behind the dead.',
    favours: "Locksmith's Wax",
    drops: [{ id: WAX, chance: 0.02, qty: 1 }, { id: 'gold', chance: 0.1, qty: 15 }],
    vault: [{ id: WAX, chance: 0.5, qty: 1 }],
  }),
  job({
    id: 'remounts', name: "The Khan's Remounts", level: 36, area: 'plateau', requires: 'heist_clean_last_wagon', rooms: 5, roomMs: 50000, alert: 8, xp: 740, gold: 150, ilvl: 31,
    desc: 'The storm riders stable their spare horses on the plateau, with the coin to pay for them.',
    favours: 'Regal Orbs',
    drops: [{ id: 'regal', chance: 0.02, qty: 1 }, { id: 'gold', chance: 0.1, qty: 15 }],
    vault: [{ id: 'regal', chance: 0.6, qty: 1 }, { id: GEAR, chance: 0.3, qty: 1 }],
  }),
  job({
    id: 'pyre_vault', name: 'The Pyre Vault', level: 45, area: 'pyretemple', requires: 'heist_clean_last_wagon', rooms: 6, roomMs: 50000, alert: 8, xp: 860, gold: 200, ilvl: 32,
    desc: 'What the faithful give to the fire, the priests take out again by night and lock under the altar.',
    favours: "Seals and Wax",
    drops: [{ id: SEAL, chance: 0.01, qty: 1 }, { id: WAX, chance: 0.008, qty: 1 }, { id: 'gold', chance: 0.1, qty: 15 }],
    vault: [{ id: SEAL, chance: 0.35, qty: 1 }, { id: WAX, chance: 0.3, qty: 1 }],
  }),
  job({
    id: 'khans_tribute', name: "The Khan's Tribute", level: 55, area: 'burningthrone', requires: 'heist_clean_pyre_vault', rooms: 7, roomMs: 50000, alert: 8, xp: 1150, gold: 280, ilvl: 33,
    desc: 'Everything the Khanate ever took on its way west, heaped up under the Burning Throne.',
    favours: 'A bit of everything',
    drops: [{ id: SEAL, chance: 0.008, qty: 1 }, { id: WAX, chance: 0.006, qty: 1 }, { id: 'regal', chance: 0.008, qty: 1 }, { id: 'gold', chance: 0.12, qty: 15 }],
    vault: [{ id: SEAL, chance: 0.5, qty: 1 }, { id: WAX, chance: 0.4, qty: 1 }, { id: 'regal', chance: 0.5, qty: 1 }, { id: GEAR, chance: 0.6, qty: 1 }],
  }),
  job({
    id: 'occult_treasury', name: 'The Occult Treasury', level: 65, area: 'burningthrone', requires: 'heist_clean_khans_tribute', rooms: 6, roomMs: 60000, alert: 8, xp: 250, gold: 250, ilvl: 75,
    desc: 'The Khanate’s innermost vault of occult relics and forbidden tribute.',
    favours: 'Arcane Dust & Occult Relics',
    drops: [{ id: 'gold', chance: 0.1, qty: 15 }, { id: 'arcane_dust', chance: 0.25, qty: 5 }],
    vault: [{ id: 'gold', chance: 1, qty: 2000 }, { id: 'arcane_dust', chance: 1, qty: 50 }],
  }),
];

/** Stealth: each Thieving level above a job takes this much off its alarm chance, down to the floor. */
export const STEALTH_PER_LEVEL = 0.015;
export const STEALTH_FLOOR = 0.35;
/** An alarm ends the job, and you get out with this share of the take. */
export const ALARM_KEEPS = 0.5;
export const MAX_ALARM = 0.9;
/** Clean Getaway's price. */
export const GETAWAY_COST_MULT = 1.5;

export type RogueSkill = 'lookout' | 'locksmith' | 'fence' | 'cutpurse';

export interface RogueDef {
  id: RogueSkill;
  name: string;
  /** Thieving level to hire them */
  level: number;
  /** what one rank does, as a share: see `effect` */
  perRank: number;
  effect: string;
}

export const ROGUES: RogueDef[] = [
  { id: 'lookout', name: 'Yusra, Lookout', level: 1, perRank: 0.07, effect: 'lower alarm chance' },
  { id: 'locksmith', name: 'Old Temur, Locksmith', level: 5, perRank: 0.06, effect: 'faster rooms' },
  { id: 'fence', name: 'Bayan, Fence', level: 10, perRank: 0.08, effect: 'more of the take kept on an alarm' },
  { id: 'cutpurse', name: 'Ilke, Cutpurse', level: 20, perRank: 0.1, effect: "more prep items found" },
];

export const MAX_ROGUE_RANK = 5;
/** Thieving levels at which the crew gains a place (the first is there from the start). */
export const CREW_SLOT_LEVELS = [1, 30, 60];

/** Taking a rogue to `rank`: the price grows with its square. It was Markers and gold; Markers are retired, so it is all gold (15 per old Marker). */
export function rogueRankCost(rank: number): Record<string, number> {
  return { gold: (1000 + 25 * 15) * rank * rank };
}

export function heistJob(id: string): HeistJob {
  const j = HEIST_JOBS.find((x) => x.id === id);
  if (!j) throw new Error(`Unknown heist job ${id}`);
  return j;
}

export function hasHeistJob(id: string): boolean {
  return HEIST_JOBS.some((j) => j.id === id);
}

export function rogueDef(id: string): RogueDef {
  const r = ROGUES.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown rogue ${id}`);
  return r;
}

// ---------- prep ----------

export type PrepKind = 'key' | 'ledger' | 'patrol' | 'uniform' | 'plan';

export interface PrepDef {
  kind: PrepKind;
  name: string;
  /** what it does when held at job start */
  effect: string;
}

export const PREP_KINDS: PrepDef[] = [
  { kind: 'key', name: 'Key', effect: 'The vault room takes no time and cannot raise an alarm' },
  { kind: 'ledger', name: 'Ledger', effect: 'Adds a hidden room before the vault, with a 50% roll on the vault table' },
  { kind: 'patrol', name: 'Patrol schedule', effect: 'Alarm chance -40% in every room' },
  { kind: 'uniform', name: 'Uniform', effect: 'Room time -30%' },
  { kind: 'plan', name: 'Floor plan', effect: 'Take +25%' },
];

export const PREP_CAP = 3;
export const PREP_DROP_CHANCE = 0.05;
/** Fence's Runner and Khanate Quartermaster trade their Marker chance for a doubled prep chance. */
export const PREP_DOUBLE_MARKS = ['mark_runner', 'mark_quartermaster'];
export const PATROL_MULT = 0.6;
export const UNIFORM_MULT = 0.7;
export const PLAN_MULT = 1.25;
export const LEDGER_VAULT_ROLL = 0.5;

export interface PrepEntry {
  kind: PrepKind;
  /** the mark action that supplies it */
  mark: string;
}

const P = (kind: PrepKind, mark: string): PrepEntry => ({ kind, mark });

/** Each job's prep board, and how many different items it needs held to start. */
export const PREP_BOARDS: Record<string, { min: number; items: PrepEntry[] }> = {
  cinder_toll: { min: 2, items: [P('key', 'mark_peddler'), P('patrol', 'mark_hauler'), P('plan', 'mark_peddler')] },
  salt_tithe: { min: 2, items: [P('ledger', 'mark_hauler'), P('uniform', 'mark_runner'), P('key', 'mark_outrider')] },
  forgers_den: { min: 2, items: [P('ledger', 'mark_runner'), P('patrol', 'mark_outrider'), P('key', 'mark_factor'), P('plan', 'mark_hauler')] },
  last_wagon: { min: 2, items: [P('patrol', 'mark_factor'), P('key', 'mark_quartermaster'), P('uniform', 'mark_outrider'), P('ledger', 'mark_factor')] },
  barrow_cache: { min: 2, items: [P('key', 'mark_warden'), P('plan', 'mark_quartermaster'), P('patrol', 'mark_warden'), P('ledger', 'mark_collector')] },
  remounts: { min: 2, items: [P('key', 'mark_quartermaster'), P('patrol', 'mark_collector'), P('uniform', 'mark_warden'), P('ledger', 'mark_collector')] },
  pyre_vault: { min: 3, items: [P('uniform', 'mark_acolyte'), P('key', 'mark_acolyte'), P('patrol', 'mark_collector'), P('ledger', 'mark_steward'), P('plan', 'mark_warden')] },
  khans_tribute: { min: 3, items: [P('key', 'mark_steward'), P('patrol', 'mark_acolyte'), P('ledger', 'mark_steward'), P('plan', 'mark_collector'), P('uniform', 'mark_acolyte')] },
  occult_treasury: { min: 3, items: [P('key', 'mark_steward'), P('patrol', 'mark_acolyte'), P('ledger', 'mark_steward'), P('uniform', 'mark_acolyte'), P('plan', 'mark_collector')] },
};

export function prepId(jobId: string, kind: PrepKind): string {
  return `prep_${jobId}_${kind}`;
}

export function prepDef(kind: PrepKind): PrepDef {
  return PREP_KINDS.find((k) => k.kind === kind)!;
}

/** The board for a job: the items it takes, and how many different ones start it. */
export function prepBoard(jobId: string): { min: number; items: PrepEntry[] } {
  return PREP_BOARDS[jobId] ?? { min: 0, items: [] };
}
