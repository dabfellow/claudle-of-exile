import { MARKER, SEAL, WAX } from './craftMats';
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
  /** campaign area that must be unlocked first */
  area: string;
  rooms: number;
  roomMs: number;
  /** Markers to set the job up */
  cost: number;
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
    id: 'cinder_toll', name: 'The Cinder Toll', level: 1, area: 'cinderroad', rooms: 3, roomMs: 30000, cost: 8, alert: 5, xp: 55, gold: 15, ilvl: 24,
    desc: 'A Khanate toll house on the road, its strongbox heavier than the guards are awake.',
    favours: 'Gold',
    drops: [{ id: MARKER, chance: 0.12, qty: 1 }],
    vault: [{ id: 'gold', chance: 1, qty: 150 }],
  }),
  job({
    id: 'salt_tithe', name: 'The Salt Tithe', level: 8, area: 'saltflats', rooms: 4, roomMs: 35000, cost: 16, alert: 6, xp: 110, gold: 30, ilvl: 25,
    desc: 'Every salt wagon pays the Khan a tenth. The tally house keeps it, and the names of who owes what.',
    favours: "Rogue's Markers",
    drops: [{ id: MARKER, chance: 0.4, qty: 1 }],
    vault: [{ id: MARKER, chance: 1, qty: 12 }],
  }),
  job({
    id: 'forgers_den', name: "The Forger's Den", level: 14, area: 'blackgrass', rooms: 4, roomMs: 40000, cost: 24, alert: 7, xp: 240, gold: 60, ilvl: 26,
    desc: 'A tent deep in the blackgrass where the Khanate paymasters have their writs and seals cut.',
    favours: "Forger's Seals",
    drops: [{ id: SEAL, chance: 0.02, qty: 1 }, { id: MARKER, chance: 0.1, qty: 1 }],
    vault: [{ id: SEAL, chance: 0.35, qty: 1 }],
  }),
  job({
    id: 'last_wagon', name: 'The Last Wagon', level: 20, area: 'caravan', rooms: 5, roomMs: 40000, cost: 30, alert: 7, xp: 310, gold: 80, ilvl: 29,
    desc: "One strongwagon at Caravan's End never burned. The raiders have been arguing over its lock ever since.",
    favours: 'Stolen rare gear',
    drops: [{ id: GEAR, chance: 0.02, qty: 1 }, { id: MARKER, chance: 0.1, qty: 1 }],
    vault: [{ id: GEAR, chance: 0.6, qty: 1 }],
  }),
  job({
    id: 'barrow_cache', name: 'The Barrow Cache', level: 28, area: 'kurgans', rooms: 5, roomMs: 45000, cost: 38, alert: 8, xp: 560, gold: 110, ilvl: 30,
    desc: 'Khanate grave-wardens seal their dead in with lamp wax, and hide their pay behind the dead.',
    favours: "Locksmith's Wax",
    drops: [{ id: WAX, chance: 0.02, qty: 1 }, { id: MARKER, chance: 0.1, qty: 1 }],
    vault: [{ id: WAX, chance: 0.5, qty: 1 }],
  }),
  job({
    id: 'remounts', name: "The Khan's Remounts", level: 36, area: 'plateau', rooms: 5, roomMs: 50000, cost: 46, alert: 8, xp: 740, gold: 150, ilvl: 31,
    desc: 'The storm riders stable their spare horses on the plateau, with the coin to pay for them.',
    favours: 'Regal Orbs',
    drops: [{ id: 'regal', chance: 0.02, qty: 1 }, { id: MARKER, chance: 0.1, qty: 1 }],
    vault: [{ id: 'regal', chance: 0.6, qty: 1 }, { id: GEAR, chance: 0.3, qty: 1 }],
  }),
  job({
    id: 'pyre_vault', name: 'The Pyre Vault', level: 45, area: 'pyretemple', rooms: 6, roomMs: 50000, cost: 56, alert: 8, xp: 860, gold: 200, ilvl: 32,
    desc: 'What the faithful give to the fire, the priests take out again by night and lock under the altar.',
    favours: "Seals and Wax",
    drops: [{ id: SEAL, chance: 0.01, qty: 1 }, { id: WAX, chance: 0.008, qty: 1 }, { id: MARKER, chance: 0.1, qty: 1 }],
    vault: [{ id: SEAL, chance: 0.35, qty: 1 }, { id: WAX, chance: 0.3, qty: 1 }],
  }),
  job({
    id: 'khans_tribute', name: "The Khan's Tribute", level: 55, area: 'burningthrone', rooms: 7, roomMs: 50000, cost: 70, alert: 8, xp: 1150, gold: 280, ilvl: 33,
    desc: 'Everything the Khanate ever took on its way west, heaped up under the Burning Throne.',
    favours: 'A bit of everything',
    drops: [{ id: SEAL, chance: 0.008, qty: 1 }, { id: WAX, chance: 0.006, qty: 1 }, { id: 'regal', chance: 0.008, qty: 1 }, { id: MARKER, chance: 0.12, qty: 1 }],
    vault: [{ id: SEAL, chance: 0.5, qty: 1 }, { id: WAX, chance: 0.4, qty: 1 }, { id: 'regal', chance: 0.5, qty: 1 }, { id: GEAR, chance: 0.6, qty: 1 }],
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
  { id: 'cutpurse', name: 'Ilke, Cutpurse', level: 20, perRank: 0.1, effect: "more Rogue's Markers lifted" },
];

export const MAX_ROGUE_RANK = 5;
/** Thieving levels at which the crew gains a place (the first is there from the start). */
export const CREW_SLOT_LEVELS = [1, 30, 60];

/** Taking a rogue to `rank`: Markers and gold both grow with its square, so a full crew is a long sink. */
export function rogueRankCost(rank: number): Record<string, number> {
  return { [MARKER]: 25 * rank * rank, gold: 1000 * rank * rank };
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
