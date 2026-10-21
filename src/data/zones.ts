import type { DamageType } from '../engine/types';

export interface MonsterDef {
  id: string;
  name: string;
  level: number;
  dmgType: DamageType;
  /** multipliers on the level-based stat curve */
  lifeMult?: number;
  dmgMult?: number;
  attackMs: number;
}

export interface ZoneDef {
  id: string;
  name: string;
  tier: number;
  levelRange: [number, number];
  desc: string;
  color: string;
  monsters: MonsterDef[];
  boss: MonsterDef;
  /** kills needed before the boss appears */
  bossEvery: number;
  uniques: string[];
}

const m = (id: string, name: string, level: number, dmgType: DamageType, attackMs: number, lifeMult = 1, dmgMult = 1): MonsterDef => ({
  id, name, level, dmgType, attackMs, lifeMult, dmgMult,
});

export const ZONES: ZoneDef[] = [
  {
    id: 'mudflats', name: 'The Mud Flats', tier: 1, levelRange: [1, 6], color: '#7a8c5a',
    desc: 'Brackish shallows where the drowned refuse to rest.',
    monsters: [
      // the tutorial zone: soft enough that a fresh character can idle the trash
      m('rat', 'Drowned Rat', 1, 'phys', 1600, 0.7, 0.55),
      m('crab', 'Mud Crab', 2, 'phys', 2200, 1.1, 0.6),
      m('zombie', 'Waterlogged Corpse', 3, 'phys', 2400, 1, 0.7),
      m('wisp', 'Bog Wisp', 3, 'light', 1800, 0.7, 0.6),
    ],
    boss: m('gorger', 'Bloated Gorger', 5, 'phys', 2600, 1, 1),
    bossEvery: 15,
    uniques: ['miners_lament', 'bloodthirst', 'windstep'],
  },
  {
    id: 'ashwood', name: 'Ashen Woods', tier: 2, levelRange: [8, 14], color: '#9a6a4a',
    desc: 'A forest that burned once and never stopped smouldering.',
    monsters: [
      m('cinderhound', 'Cinderhound', 8, 'fire', 1500, 0.9, 0.9),
      m('treant', 'Charred Treant', 10, 'phys', 2600, 1.5, 1.2),
      m('harpy', 'Ash Harpy', 12, 'phys', 1400, 0.8, 0.9),
      m('emberkin', 'Emberkin Shaman', 13, 'fire', 2000, 0.9, 1.15),
    ],
    boss: m('pyre', 'Pyre-Mother Ulva', 15, 'fire', 2400, 1, 1),
    bossEvery: 20,
    uniques: ['emberheart', 'alchemists_band', 'bloodthirst'],
  },
  {
    id: 'crypt', name: 'The Sunken Crypt', tier: 3, levelRange: [16, 23], color: '#5a7a9a',
    desc: 'Flooded catacombs, cold as the hands that built them.',
    monsters: [
      m('ghoul', 'Crypt Ghoul', 16, 'phys', 1700, 1, 1),
      m('frostwraith', 'Frost Wraith', 18, 'cold', 1900, 0.85, 1.1),
      m('skeleton', 'Skeletal Warden', 20, 'phys', 2300, 1.4, 1.1),
      m('lich', 'Drowned Lich', 22, 'cold', 2400, 1, 1.25),
    ],
    boss: m('tidecaller', 'Tidecaller Morvane', 24, 'cold', 2400, 1, 1),
    bossEvery: 25,
    uniques: ['iron_bulwark', 'windstep', 'alchemists_band'],
  },
  {
    id: 'forge', name: 'The Molten Forge', tier: 4, levelRange: [25, 33], color: '#c0553a',
    desc: 'The dwarves fled. Their engines did not.',
    monsters: [
      m('golem', 'Slag Golem', 25, 'fire', 2600, 1.6, 1.2),
      m('automaton', 'Brass Automaton', 27, 'phys', 1600, 1, 1),
      m('salamander', 'Forge Salamander', 29, 'fire', 1500, 0.85, 1),
      m('overseer', 'Iron Overseer', 32, 'light', 2200, 1.2, 1.2),
    ],
    boss: m('anvilheart', 'Anvilheart, the Unquenched', 34, 'fire', 2400, 1, 1),
    bossEvery: 25,
    uniques: ['titans_girth', 'iron_bulwark', 'emberheart'],
  },
  {
    id: 'spire', name: 'The Celestial Spire', tier: 5, levelRange: [35, 44], color: '#8a7ad8',
    desc: 'A tower that reaches past the sky, into something else.',
    monsters: [
      m('seraph', 'Fallen Seraph', 35, 'light', 1600, 1, 1.05),
      m('voidling', 'Voidling Swarm', 37, 'cold', 1200, 0.7, 0.8),
      m('starguard', 'Starbound Sentinel', 40, 'phys', 2400, 1.5, 1.2),
      m('oracle', 'Blind Oracle', 42, 'light', 2000, 1, 1.3),
    ],
    boss: m('eclipse', 'The Eclipse Sovereign', 45, 'light', 2200, 1, 1),
    bossEvery: 30,
    uniques: ['starforged_edge', 'titans_girth', 'miners_lament'],
  },
];

export function zoneDef(id: string): ZoneDef {
  const z = ZONES.find((x) => x.id === id);
  if (!z) throw new Error(`Unknown zone ${id}`);
  return z;
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
export const BOSS_DMG_MULT = 1.25;
export const BOSS_SLAM_MULT = 2.5;
export const BOSS_SLAM_EVERY_MS = 9000;
export const BOSS_SLAM_CAST_MS = 2200;
