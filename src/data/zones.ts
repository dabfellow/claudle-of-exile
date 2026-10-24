import type { DamageType } from '../engine/types';

/**
 * Boss mechanics. Every boss slams; later bosses stack more so a single guard skill isn't enough.
 * - slam: heavy telegraphed hit — guard, interrupt or drink (Evasion Rating can't dodge it)
 * - nova: telegraphed elemental blast — ignores blocks, so resistances and shields matter
 * - summon: calls adds every so often — area skills matter
 * - enrage: below 35% life it attacks faster and harder — burst and flasks matter
 * - ward: at 66% and 33% life it raises a barrier that heals it if not broken in time — burst matters
 */
export type BossMechanic = 'slam' | 'nova' | 'summon' | 'enrage' | 'ward';

/** One thing a monster does: its name, whether it's an attack or a spell, and its attack or cast time in ms. */
export interface MonsterSkill {
  name: string;
  kind: 'attack' | 'spell';
  ms: number;
  /** leaves hazardous ground of the monster's damage type under the player */
  ground?: boolean;
}

/** A monster's basic attack or spell takes this long unless it says otherwise. */
export const MONSTER_BASE_ATTACK_MS = 3000;

export interface MonsterDef {
  id: string;
  name: string;
  level: number;
  dmgType: DamageType;
  /** multipliers on the level-based stat curve */
  lifeMult?: number;
  dmgMult?: number;
  /** what it does whenever it isn't winding up something bigger */
  basic: MonsterSkill;
  /** ms to cross one battlefield column (melee only; default MONSTER_STEP_MS) */
  moveMs?: number;
  /** bosses only */
  mechanics?: BossMechanic[];
  /** bosses: the telegraphed casts; ms is the wind-up */
  slam?: MonsterSkill;
  nova?: MonsterSkill;
  /** element of the nova mechanic (defaults to the boss's damage type) */
  novaType?: DamageType;
}

export interface ZoneDef {
  id: string;
  name: string;
  act: number;
  /** drop-table tier (data/drops.ts) */
  tier: number;
  levelRange: [number, number];
  desc: string;
  color: string;
  monsters: MonsterDef[];
  boss: MonsterDef;
  /** the act's final boss: beating it completes the act */
  actBoss?: boolean;
  /** kills needed before the boss appears */
  bossEvery: number;
  /** monsters per wave (bosses come with BOSS_ADDS adds) */
  packSize: [number, number];
  /** ms between waves walking in at a walking pace, even while you're still fighting the last one */
  spawnEveryMs: number;
  uniques: string[];
}

export interface ActDef {
  n: number;
  name: string;
  open: boolean;
}

export const ACTS: ActDef[] = [
  { n: 1, name: 'The Drowned Coast', open: true },
  { n: 2, name: 'The Burning Steppe', open: false },
  { n: 3, name: 'The City of Saints', open: false },
  { n: 4, name: 'The Hollow Peaks', open: false },
  { n: 5, name: 'The Sunless Sea', open: false },
  { n: 6, name: 'The Shattered Throne', open: false },
];

const atk = (name: string, ms = MONSTER_BASE_ATTACK_MS): MonsterSkill => ({ name, kind: 'attack', ms });
const spell = (name: string, ms = MONSTER_BASE_ATTACK_MS, ground?: boolean): MonsterSkill => ({ name, kind: 'spell', ms, ground });
/** quick and slow walkers: how fast they close in on the battlefield */
const fast = (def: MonsterDef): MonsterDef => ({ ...def, moveMs: 600 });
const slow = (def: MonsterDef): MonsterDef => ({ ...def, moveMs: 1800 });

const m = (id: string, name: string, level: number, dmgType: DamageType, basic: MonsterSkill, lifeMult = 1, dmgMult = 1): MonsterDef => ({
  id, name, level, dmgType, basic, lifeMult, dmgMult,
});

interface BossCasts {
  slam: MonsterSkill;
  nova?: MonsterSkill;
  novaType?: DamageType;
}

const boss = (def: MonsterDef, mechanics: BossMechanic[], casts: BossCasts): MonsterDef => ({ ...def, mechanics, ...casts });

/** Areas in campaign order: each boss unlocks the next area. */
export const ZONES: ZoneDef[] = [
  // ---------------- Act 1: The Drowned Coast ----------------
  {
    id: 'mudflats', name: 'The Mud Flats', act: 1, tier: 1, levelRange: [1, 4], color: '#7a8c5a',
    desc: 'Brackish shallows where the drowned refuse to rest.',
    monsters: [
      // the tutorial zone: soft enough that a fresh character can idle the trash
      fast(m('rat', 'Drowned Rat', 1, 'phys', atk('Bite', 2600), 0.7, 0.55)),
      slow(m('crab', 'Mud Crab', 2, 'phys', atk('Pinch', 3500), 1.1, 0.6)),
      slow(m('zombie', 'Waterlogged Corpse', 3, 'phys', atk('Sodden Grasp', 3800), 1, 0.7)),
      m('wisp', 'Bog Wisp', 3, 'light', spell('Static Spark', 2900), 0.7, 0.6),
    ],
    boss: boss(m('gorger', 'Bloated Gorger', 5, 'phys', atk('Gnaw', 4200)), ['slam'], { slam: atk('Belly Flop', 4200) }),
    bossEvery: 15,
    packSize: [1, 3],
    spawnEveryMs: 18000,
    uniques: ['miners_lament', 'bloodthirst', 'windstep', 'tavern_brawler', 'castaways_kerchief', 'quickfingers'],
  },
  {
    id: 'brinecaves', name: 'The Brine Caves', act: 1, tier: 1, levelRange: [4, 7], color: '#4f8a8b',
    desc: 'Sea caves where the tide leaves behind things that should have stayed under.',
    monsters: [
      m('crawler', 'Cave Crawler', 4, 'phys', atk('Mandible Snap', 3200), 1, 0.8),
      fast(m('brinebat', 'Brine Bat', 5, 'phys', atk('Bite', 2100), 0.6, 0.6)),
      m('sailor', 'Drowned Sailor', 6, 'phys', atk('Cutlass Slash', 3500), 1.1, 0.9),
      m('siren', 'Salt Siren', 7, 'cold', spell('Frost Song', 3000), 0.8, 0.9),
    ],
    boss: boss(m('harrow', 'Captain Harrow', 8, 'phys', atk('Hook Slash', 4000)), ['slam', 'summon'], { slam: atk('Anchor Drop', 3800) }),
    bossEvery: 18,
    packSize: [1, 3],
    spawnEveryMs: 15000,
    uniques: ['windstep', 'bloodthirst', 'wellspring', 'slippers_of_the_tide', 'fishermans_knot', 'barnacle_band'],
  },
  {
    id: 'ashwood', name: 'Ashen Woods', act: 1, tier: 2, levelRange: [7, 10], color: '#9a6a4a',
    desc: 'A forest that burned once and never stopped smouldering.',
    monsters: [
      fast(m('cinderhound', 'Cinderhound', 7, 'fire', atk('Burning Bite', 2400), 0.9, 0.9)),
      slow(m('treant', 'Charred Treant', 8, 'phys', atk('Branch Slam', 4200), 1.5, 1.2)),
      fast(m('harpy', 'Ash Harpy', 9, 'phys', atk('Talon Rake', 2200), 0.8, 0.9)),
      m('emberkin', 'Emberkin Shaman', 10, 'fire', spell('Firebolt', 3200, true), 0.9, 1.15),
    ],
    boss: boss(m('pyre', 'Pyre-Mother Ulva', 11, 'fire', spell('Ember Lash', 3800)), ['slam', 'nova'], { slam: atk('Burning Bough', 3800), nova: spell('Pyre Burst', 4400) }),
    bossEvery: 20,
    packSize: [2, 4],
    spawnEveryMs: 14000,
    uniques: ['emberheart', 'alchemists_band', 'rebuttal', 'second_guess'],
  },
  {
    id: 'blackreed', name: 'Blackreed Marsh', act: 1, tier: 2, levelRange: [10, 13], color: '#5d6b3a',
    desc: 'Reeds taller than a man, and something moving through them.',
    monsters: [
      m('lurker', 'Bog Lurker', 10, 'phys', atk('Drag Under', 3700), 1.3, 1.05),
      m('stalker', 'Reed Stalker', 11, 'phys', atk('Reed Spear', 2400), 0.85, 0.95),
      m('toad', 'Plague Toad', 12, 'cold', atk('Chill Spit', 3400), 1, 1),
      m('fenwitch', 'Fen Witch', 13, 'light', spell('Marsh Lightning', 3200, true), 0.9, 1.15),
    ],
    boss: boss(m('sedge', 'Old Mother Sedge', 14, 'light', spell('Hex Bolt', 3800)), ['slam', 'summon', 'enrage'], { slam: atk('Root Crush', 3600) }),
    bossEvery: 20,
    packSize: [2, 4],
    spawnEveryMs: 13000,
    uniques: ['alchemists_band', 'miners_lament', 'stormhide', 'brimming_band', 'ember_of_faith', 'gulls_eye'],
  },
  {
    id: 'crypt', name: 'The Sunken Crypt', act: 1, tier: 3, levelRange: [13, 16], color: '#5a7a9a',
    desc: 'Flooded catacombs, cold as the hands that built them.',
    monsters: [
      m('ghoul', 'Crypt Ghoul', 13, 'phys', atk('Claw', 2700), 1, 1),
      m('frostwraith', 'Frost Wraith', 14, 'cold', spell('Frost Touch', 3000), 0.85, 1.1),
      m('skeleton', 'Skeletal Warden', 15, 'phys', atk('Halberd Sweep', 3700), 1.4, 1.1),
      m('lich', 'Drowned Lich', 16, 'cold', spell('Ice Spear', 3800, true), 1, 1.25),
    ],
    boss: boss(m('tidecaller', 'Tidecaller Morvane', 17, 'cold', spell('Tide Bolt', 3800)), ['slam', 'nova', 'ward'], { slam: atk('Crashing Wave', 3600), nova: spell('Frost Tide', 4200) }),
    bossEvery: 22,
    packSize: [2, 4],
    spawnEveryMs: 12000,
    uniques: ['iron_bulwark', 'windstep', 'needleworkers_wraps', 'sidestep', 'herbalists_sash'],
  },
  {
    id: 'shipgrave', name: 'The Ship Graveyard', act: 1, tier: 3, levelRange: [16, 19], color: '#7d6a55',
    desc: 'A bay choked with wrecks, and the crews who never left them.',
    monsters: [
      m('brute', 'Barnacle Brute', 16, 'phys', atk('Barnacle Fist', 4200), 1.5, 1.2),
      m('gunner', 'Drowned Gunner', 17, 'fire', atk('Fire Musket', 3400), 0.9, 1.15),
      m('gulls', 'Gull Swarm', 18, 'phys', atk('Peck Flurry', 1900), 0.7, 0.75),
      m('wreckshaman', 'Wreck Shaman', 19, 'light', spell('Storm Hex', 3200), 0.95, 1.15),
    ],
    boss: boss(m('vosk', 'Admiral Vosk', 20, 'phys', atk('Sabre Cut', 3800)), ['slam', 'nova', 'enrage'], { slam: atk('Keelhaul Strike', 3400), nova: spell('Cannon Barrage', 4000), novaType: 'fire' }),
    bossEvery: 24,
    packSize: [2, 5],
    spawnEveryMs: 11000,
    uniques: ['iron_bulwark', 'emberheart', 'thornquill', 'bellwether', 'lookouts_hood', 'robe_of_still_waters'],
  },
  {
    id: 'stormcliffs', name: 'The Storm Cliffs', act: 1, tier: 4, levelRange: [19, 22], color: '#6a7fa8',
    desc: 'Sheer black cliffs where the lightning never stops.',
    monsters: [
      m('ravager', 'Cliff Ravager', 19, 'phys', atk('Rend', 2700), 1, 1.05),
      m('galeborn', 'Galeborn', 20, 'light', spell('Gale Bolt', 2400), 0.8, 1),
      m('rockback', 'Rockback Crab', 21, 'phys', atk('Shell Crush', 4200), 1.6, 1.1),
      m('stormcaller', 'Storm Caller', 22, 'light', spell('Call Lightning', 3400, true), 1, 1.25),
    ],
    boss: boss(m('skarra', 'Skarra, Queen of Gales', 23, 'light', atk('Gale Talons', 3500)), ['slam', 'nova', 'summon', 'enrage'], { slam: atk('Thunder Dive', 3200), nova: spell('Storm Burst', 3800) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 10000,
    uniques: ['titans_girth', 'miners_lament', 'knuckledusters', 'windchaser'],
  },
  {
    id: 'sanctum', name: 'The Drowned Sanctum', act: 1, tier: 5, levelRange: [22, 24], color: '#3f6f8f',
    desc: 'The cathedral the sea swallowed whole. Its queen still holds court.',
    monsters: [
      m('zealot', 'Tidebound Zealot', 22, 'cold', atk('Frost Censer', 2900), 1, 1.05),
      m('eel', 'Abyssal Eel', 23, 'light', atk('Shock Bite', 2200), 0.8, 1),
      m('coralgolem', 'Coral Golem', 24, 'phys', atk('Coral Fist', 4200), 1.6, 1.2),
      m('priest', 'Sanctum Priest', 24, 'cold', spell('Ice Litany', 3500), 1, 1.25),
    ],
    boss: boss(m('ysolde', 'Ysolde, the Drowned Queen', 25, 'cold', atk('Drowned Sceptre', 3500), 1.5, 1.05), ['slam', 'nova', 'summon', 'enrage', 'ward'], { slam: atk('Abyssal Crush', 3200), nova: spell('Tempest of the Deep', 3800), novaType: 'light' }),
    actBoss: true,
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 10000,
    uniques: ['titans_girth', 'iron_bulwark', 'emberheart', 'ninth_psalm', 'mask_of_the_patient', 'penitents_plate', 'hollow_locket', 'twin_oaths'],
  },
];

export function zoneDef(id: string): ZoneDef {
  const z = ZONES.find((x) => x.id === id);
  if (!z) throw new Error(`Unknown zone ${id}`);
  return z;
}

/** The area the given area's boss unlocks, if there is one and its act is open. */
export function nextZone(id: string): ZoneDef | undefined {
  const next = ZONES[ZONES.findIndex((z) => z.id === id) + 1];
  return next && ACTS.find((a) => a.n === next.act)?.open ? next : undefined;
}

export function zonesInAct(act: number): ZoneDef[] {
  return ZONES.filter((z) => z.act === act);
}

export function monsterLife(level: number): number {
  return Math.round((15 + 6 * Math.pow(level, 1.4)) * MONSTER_LIFE_SCALE);
}

export function monsterDamage(level: number): number {
  return Math.round(1 + 1.0 * Math.pow(level, 1.15));
}

/** global pacing knob for monsters */
export const MONSTER_LIFE_SCALE = 0.85;

export const BOSS_LIFE_MULT = 5;
export const BOSS_ADDS = 2;
export const BOSS_DMG_MULT = 1.25;
export const BOSS_SLAM_MULT = 2.5;
export const BOSS_SLAM_EVERY_MS = 9000;
/** nova: telegraphed elemental blast that ignores blocks */
export const BOSS_NOVA_MULT = 1.8;
export const BOSS_NOVA_EVERY_MS = 13000;
/** wind-ups for a boss whose data doesn't name its own */
export const BOSS_SLAM_DEFAULT: MonsterSkill = { name: 'Heavy Blow', kind: 'attack', ms: 3600 };
export const BOSS_NOVA_DEFAULT: MonsterSkill = { name: 'Nova', kind: 'spell', ms: 4000 };
/** summon: tops the pack back up to this many adds */
export const BOSS_SUMMON_EVERY_MS = 16000;
export const BOSS_SUMMON_COUNT = 2;
/** enrage below this life fraction */
export const BOSS_ENRAGE_AT = 0.35;
export const BOSS_ENRAGE_SPEED = 1.5;
export const BOSS_ENRAGE_DMG = 1.3;
/** ward at these life fractions: absorbs damage, and heals the boss if not broken in time */
export const BOSS_WARD_AT = [0.66, 0.33];
export const BOSS_WARD_PCT = 0.12;
export const BOSS_WARD_MS = 8000;
export const BOSS_WARD_HEAL = 0.1;

/** What each mechanic is called on screen, and how to answer it. */
export const MECHANIC_INFO: Record<BossMechanic, { name: string; tip: string }> = {
  slam: { name: 'Heavy blow', tip: "Telegraphed big hit. Evasion Rating can't dodge it — guard, interrupt or drink." },
  nova: { name: 'Nova', tip: 'Telegraphed elemental blast. Blocks don’t stop it — resistances, shields, evades or an interrupt do.' },
  summon: { name: 'Summons', tip: 'Calls more adds during the fight. Area skills keep them down.' },
  enrage: { name: 'Enrage', tip: 'Below 35% life it attacks 50% faster for 30% more damage. Burst it down or drink.' },
  ward: { name: 'Ward', tip: 'At 66% and 33% life it raises a barrier. Break it within 8 s or the boss heals 10%.' },
};
