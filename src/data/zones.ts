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

export interface MonsterDef {
  id: string;
  name: string;
  level: number;
  dmgType: DamageType;
  /** multipliers on the level-based stat curve */
  lifeMult?: number;
  dmgMult?: number;
  attackMs: number;
  /** bosses only */
  mechanics?: BossMechanic[];
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
  /** monsters per pack (bosses come with BOSS_ADDS adds) */
  packSize: [number, number];
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

const m = (id: string, name: string, level: number, dmgType: DamageType, attackMs: number, lifeMult = 1, dmgMult = 1): MonsterDef => ({
  id, name, level, dmgType, attackMs, lifeMult, dmgMult,
});

const boss = (def: MonsterDef, mechanics: BossMechanic[], novaType?: DamageType): MonsterDef => ({ ...def, mechanics, novaType });

/** Areas in campaign order: each boss unlocks the next area. */
export const ZONES: ZoneDef[] = [
  // ---------------- Act 1: The Drowned Coast ----------------
  {
    id: 'mudflats', name: 'The Mud Flats', act: 1, tier: 1, levelRange: [1, 4], color: '#7a8c5a',
    desc: 'Brackish shallows where the drowned refuse to rest.',
    monsters: [
      // the tutorial zone: soft enough that a fresh character can idle the trash
      m('rat', 'Drowned Rat', 1, 'phys', 1600, 0.7, 0.55),
      m('crab', 'Mud Crab', 2, 'phys', 2200, 1.1, 0.6),
      m('zombie', 'Waterlogged Corpse', 3, 'phys', 2400, 1, 0.7),
      m('wisp', 'Bog Wisp', 3, 'light', 1800, 0.7, 0.6),
    ],
    boss: boss(m('gorger', 'Bloated Gorger', 5, 'phys', 2600), ['slam']),
    bossEvery: 15,
    packSize: [1, 3],
    uniques: ['miners_lament', 'bloodthirst', 'windstep'],
  },
  {
    id: 'brinecaves', name: 'The Brine Caves', act: 1, tier: 1, levelRange: [4, 7], color: '#4f8a8b',
    desc: 'Sea caves where the tide leaves behind things that should have stayed under.',
    monsters: [
      m('crawler', 'Cave Crawler', 4, 'phys', 2000, 1, 0.8),
      m('brinebat', 'Brine Bat', 5, 'phys', 1300, 0.6, 0.6),
      m('sailor', 'Drowned Sailor', 6, 'phys', 2200, 1.1, 0.9),
      m('siren', 'Salt Siren', 7, 'cold', 1900, 0.8, 0.9),
    ],
    boss: boss(m('harrow', 'Captain Harrow', 8, 'phys', 2500), ['slam', 'summon']),
    bossEvery: 18,
    packSize: [1, 3],
    uniques: ['windstep', 'bloodthirst'],
  },
  {
    id: 'ashwood', name: 'Ashen Woods', act: 1, tier: 2, levelRange: [7, 10], color: '#9a6a4a',
    desc: 'A forest that burned once and never stopped smouldering.',
    monsters: [
      m('cinderhound', 'Cinderhound', 7, 'fire', 1500, 0.9, 0.9),
      m('treant', 'Charred Treant', 8, 'phys', 2600, 1.5, 1.2),
      m('harpy', 'Ash Harpy', 9, 'phys', 1400, 0.8, 0.9),
      m('emberkin', 'Emberkin Shaman', 10, 'fire', 2000, 0.9, 1.15),
    ],
    boss: boss(m('pyre', 'Pyre-Mother Ulva', 11, 'fire', 2400), ['slam', 'nova']),
    bossEvery: 20,
    packSize: [2, 4],
    uniques: ['emberheart', 'alchemists_band'],
  },
  {
    id: 'blackreed', name: 'Blackreed Marsh', act: 1, tier: 2, levelRange: [10, 13], color: '#5d6b3a',
    desc: 'Reeds taller than a man, and something moving through them.',
    monsters: [
      m('lurker', 'Bog Lurker', 10, 'phys', 2300, 1.3, 1.05),
      m('stalker', 'Reed Stalker', 11, 'phys', 1500, 0.85, 0.95),
      m('toad', 'Plague Toad', 12, 'cold', 2100, 1, 1),
      m('fenwitch', 'Fen Witch', 13, 'light', 2000, 0.9, 1.15),
    ],
    boss: boss(m('sedge', 'Old Mother Sedge', 14, 'light', 2400), ['slam', 'summon', 'enrage']),
    bossEvery: 20,
    packSize: [2, 4],
    uniques: ['alchemists_band', 'miners_lament'],
  },
  {
    id: 'crypt', name: 'The Sunken Crypt', act: 1, tier: 3, levelRange: [13, 16], color: '#5a7a9a',
    desc: 'Flooded catacombs, cold as the hands that built them.',
    monsters: [
      m('ghoul', 'Crypt Ghoul', 13, 'phys', 1700, 1, 1),
      m('frostwraith', 'Frost Wraith', 14, 'cold', 1900, 0.85, 1.1),
      m('skeleton', 'Skeletal Warden', 15, 'phys', 2300, 1.4, 1.1),
      m('lich', 'Drowned Lich', 16, 'cold', 2400, 1, 1.25),
    ],
    boss: boss(m('tidecaller', 'Tidecaller Morvane', 17, 'cold', 2400), ['slam', 'nova', 'ward']),
    bossEvery: 22,
    packSize: [2, 4],
    uniques: ['iron_bulwark', 'windstep'],
  },
  {
    id: 'shipgrave', name: 'The Ship Graveyard', act: 1, tier: 3, levelRange: [16, 19], color: '#7d6a55',
    desc: 'A bay choked with wrecks, and the crews who never left them.',
    monsters: [
      m('brute', 'Barnacle Brute', 16, 'phys', 2600, 1.5, 1.2),
      m('gunner', 'Drowned Gunner', 17, 'fire', 2100, 0.9, 1.15),
      m('gulls', 'Gull Swarm', 18, 'phys', 1200, 0.7, 0.75),
      m('wreckshaman', 'Wreck Shaman', 19, 'light', 2000, 0.95, 1.15),
    ],
    boss: boss(m('vosk', 'Admiral Vosk', 20, 'phys', 2400), ['slam', 'nova', 'enrage'], 'fire'),
    bossEvery: 24,
    packSize: [2, 5],
    uniques: ['iron_bulwark', 'emberheart'],
  },
  {
    id: 'stormcliffs', name: 'The Storm Cliffs', act: 1, tier: 4, levelRange: [19, 22], color: '#6a7fa8',
    desc: 'Sheer black cliffs where the lightning never stops.',
    monsters: [
      m('ravager', 'Cliff Ravager', 19, 'phys', 1700, 1, 1.05),
      m('galeborn', 'Galeborn', 20, 'light', 1500, 0.8, 1),
      m('rockback', 'Rockback Crab', 21, 'phys', 2600, 1.6, 1.1),
      m('stormcaller', 'Storm Caller', 22, 'light', 2100, 1, 1.25),
    ],
    boss: boss(m('skarra', 'Skarra, Queen of Gales', 23, 'light', 2200), ['slam', 'nova', 'summon', 'enrage']),
    bossEvery: 25,
    packSize: [3, 5],
    uniques: ['titans_girth', 'miners_lament'],
  },
  {
    id: 'sanctum', name: 'The Drowned Sanctum', act: 1, tier: 5, levelRange: [22, 24], color: '#3f6f8f',
    desc: 'The cathedral the sea swallowed whole. Its queen still holds court.',
    monsters: [
      m('zealot', 'Tidebound Zealot', 22, 'cold', 1800, 1, 1.05),
      m('eel', 'Abyssal Eel', 23, 'light', 1400, 0.8, 1),
      m('coralgolem', 'Coral Golem', 24, 'phys', 2600, 1.6, 1.2),
      m('priest', 'Sanctum Priest', 24, 'cold', 2200, 1, 1.25),
    ],
    boss: boss(m('ysolde', 'Ysolde, the Drowned Queen', 25, 'cold', 2200, 1.5, 1.05), ['slam', 'nova', 'summon', 'enrage', 'ward'], 'light'),
    actBoss: true,
    bossEvery: 25,
    packSize: [3, 5],
    uniques: ['titans_girth', 'iron_bulwark', 'emberheart'],
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

/** global pacing knobs for monsters */
export const MONSTER_LIFE_SCALE = 1.8;
export const MONSTER_SPEED_SCALE = 1.6;

export const BOSS_LIFE_MULT = 5;
export const BOSS_ADDS = 2;
export const BOSS_DMG_MULT = 1.25;
export const BOSS_SLAM_MULT = 2.5;
export const BOSS_SLAM_EVERY_MS = 9000;
export const BOSS_SLAM_CAST_MS = 2200;
/** nova: telegraphed elemental blast that ignores blocks */
export const BOSS_NOVA_MULT = 1.8;
export const BOSS_NOVA_EVERY_MS = 13000;
export const BOSS_NOVA_CAST_MS = 2600;
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
