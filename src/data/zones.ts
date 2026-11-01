import type { DamageType } from '../engine/types';

/**
 * Boss mechanics. Every boss slams; later bosses stack more so a single guard skill isn't enough.
 * - slam: heavy telegraphed hit — guard, interrupt or drink (Evasion Rating can't dodge it)
 * - nova: telegraphed elemental blast — ignores blocks, so resistances and shields matter
 * - summon: calls adds every so often — area skills matter
 * - enrage: below 35% life it attacks faster and harder — burst and flasks matter
 * - ward: at 66% and 33% life it raises a barrier that heals it if not broken in time — burst matters
 * - scorch: every so often it sets the ground under you ablaze (frozen, charged) — resistances and pace matter
 * - martyrs: it can't be hurt while the martyrs chained to it live — aim at them, by hand or by rule
 * - frostbite: stacks build on you through the fight, slowing you until you freeze solid — cleanse them, by hand or by rule
 */
export type BossMechanic = 'slam' | 'nova' | 'summon' | 'enrage' | 'ward' | 'scorch' | 'martyrs' | 'frostbite';

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
  /** element of the nova and scorch mechanics (defaults to the boss's damage type) */
  novaType?: DamageType;
  /** its cold ground is Frozen ground, not Chilled */
  rime?: boolean;
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
  /** the id its art is filed under, when it borrows another area's */
  art?: string;
  /** kills needed before the boss appears */
  bossEvery: number;
  /** monsters per wave (bosses come with BOSS_ADDS adds) */
  packSize: [number, number];
  /** ms between waves walking in at a walking pace, even while you're still fighting the last one */
  spawnEveryMs: number;
  /** items here roll this many levels above the monster that dropped them */
  ilvlBonus?: number;
  uniques: string[];
  /**
   * What opens this area. `after`: areas whose boss opens the road here, any one of them will do
   * (defaults to the area before it in ZONES; [] for none). `bosses`: also needs this many of this act's
   * bosses beaten. So one boss can open five areas at once, and a later area can wait for any three of them.
   */
  requires?: { after?: string[]; bosses?: number };
}

export interface ActDef {
  n: number;
  name: string;
  /** live for everyone */
  open: boolean;
  /** built but not released: playable in dev builds, tests and the sim (see ACT_PREVIEW) */
  preview?: boolean;
  /** shown on the Campaign page once the act boss falls */
  outro?: string;
}

export const ACTS: ActDef[] = [
  {
    n: 1, name: 'The Drowned Coast', open: true,
    outro: 'The Drowned Queen has fallen. The road inland climbs onto the steppe, where the grass has been burning for a hundred years.',
  },
  {
    n: 2, name: 'The Burning Steppe', open: true,
    outro: 'The fallen sun goes dark at last. Far to the south, the bells of a city of saints are ringing.',
  },
  {
    n: 3, name: 'The City of Saints', open: true,
    outro: 'The Hierarch falls, and for the first time in a thousand years the bells of the city stop. Far to the north, the Hollow Peaks are waiting.',
  },
  {
    n: 4, name: 'The Hollow Peaks', open: false, preview: true,
    outro: 'The Hollow King falls, and the mountain shakes as he lands. Past the last peak the land drops away to the east, down to a sea that has not seen the sun.',
  },
  { n: 5, name: 'The Sunless Sea', open: false },
  { n: 6, name: 'The Shattered Throne', open: false },
];

/** Preview acts are playable when this is on: dev builds, tests and the sim, never production. */
export const ACT_PREVIEW = { enabled: !!import.meta.env?.DEV };

export function actOpen(n: number): boolean {
  const a = ACTS.find((x) => x.n === n);
  return !!a && (a.open || (!!a.preview && ACT_PREVIEW.enabled));
}

const atk = (name: string, ms = MONSTER_BASE_ATTACK_MS): MonsterSkill => ({ name, kind: 'attack', ms });
const spell = (name: string, ms = MONSTER_BASE_ATTACK_MS, ground?: boolean): MonsterSkill => ({ name, kind: 'spell', ms, ground });
/** quick and slow walkers: how fast they close in on the battlefield */
const fast = (def: MonsterDef): MonsterDef => ({ ...def, moveMs: 600 });
const slow = (def: MonsterDef): MonsterDef => ({ ...def, moveMs: 1800 });
/** the high peaks: its cold ground is Frozen ground, not Chilled */
const rime = (def: MonsterDef): MonsterDef => ({ ...def, rime: true });

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

  // ---------------- Act 2: The Burning Steppe (docs/design/ACT2.md) ----------------
  // Characters arrive around level 21 and leave around 25–27. Areas climb one level each, so the
  // drop tiers (5 → 7) and boss mechanics (3 → 6) carry the sense of going deeper.
  {
    id: 'cinderroad', name: 'The Cinder Road', act: 2, tier: 5, levelRange: [24, 26], color: '#a0603a',
    desc: 'The old trade road inland, its grass burned to stubble and still smoking.',
    monsters: [
      fast(m('ashjackal', 'Ash Jackal', 24, 'phys', atk('Snapping Bite', 2200), 0.75, 0.85)),
      m('outrider', 'Steppe Outrider', 25, 'phys', atk('Lance Charge', 3600), 1.2, 1.1),
      fast(m('vulture', 'Scorched Vulture', 25, 'fire', atk('Burning Talons', 2500), 0.8, 0.9)),
      m('firesprite', 'Grass-Fire Sprite', 26, 'fire', spell('Flicker', 2800, true), 0.7, 1.1),
    ],
    boss: boss(m('khorun', 'Khorun the Outrider', 26, 'phys', atk('Sabre Sweep', 3600)), ['slam', 'summon', 'scorch'], { slam: atk('Trampling Charge', 3600), novaType: 'fire' }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 10000,
    uniques: ['brawlers_buckle', 'titans_girth', 'sunmane_pelt'],
  },
  {
    id: 'saltflats', name: 'The Saltpan Flats', act: 2, tier: 5, levelRange: [25, 27], color: '#b8b09a',
    desc: 'A dead white sea of salt, shimmering with heat and things that are not there.',
    monsters: [
      slow(m('saltcrawler', 'Salt Crawler', 25, 'phys', atk('Crusted Pincer', 3800), 1.4, 1.1)),
      m('mirage', 'Mirage Stalker', 26, 'light', spell('Glare Bolt', 2600), 0.8, 1.05),
      fast(m('dustdevil', 'Dust Devil', 26, 'phys', atk('Scouring Wind', 2000), 0.7, 0.8)),
      m('saltwitch', 'Salt Witch', 27, 'cold', spell('Salt Frost', 3400, true), 1, 1.2),
    ],
    boss: boss(m('glass', 'Sister Glass, the Mirage', 27, 'light', spell('Refracted Ray', 3600)), ['slam', 'nova', 'ward'], { slam: atk('Shattering Mirror', 3400), nova: spell('Blinding Flare', 4000) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 10000,
    uniques: ['last_breath', 'mirage_veil', 'windchaser'],
  },
  {
    id: 'blackgrass', name: 'The Blackgrass Sea', act: 2, tier: 6, levelRange: [26, 28], color: '#5a5a3a',
    desc: 'Grass taller than a rider, black from root to tip, burning in slow red lines.',
    monsters: [
      fast(m('grasscat', 'Blackgrass Stalker', 26, 'phys', atk('Pounce', 2300), 0.85, 1)),
      fast(m('firebrand', 'Firebrand Hound', 27, 'fire', atk('Searing Bite', 2600), 0.9, 1)),
      slow(m('burnwalker', 'Burnt Walker', 27, 'fire', atk('Smouldering Fist', 4000), 1.5, 1.15)),
      m('grassseer', 'Grass Seer', 28, 'fire', spell('Wildfire', 3300, true), 0.95, 1.2),
    ],
    boss: boss(m('ashmane', 'Ashmane, the Sun Lion', 28, 'fire', atk('Burning Maul', 3400)), ['slam', 'enrage', 'scorch'], { slam: atk('Pride Leap', 3400) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 10000,
    uniques: ['sunmane_pelt', 'emberheart', 'knuckledusters'],
  },
  {
    id: 'caravan', name: "Caravan's End", act: 2, tier: 6, levelRange: [27, 29], color: '#b08a5a',
    desc: 'A walled caravanserai where the last caravan stopped and never left.',
    monsters: [
      m('raider', 'Khanate Raider', 27, 'phys', atk('Scimitar Slash', 2700), 1, 1),
      m('lancer', 'Khanate Lancer', 28, 'phys', atk('Couched Lance', 3400), 1.1, 1.1),
      slow(m('bonecamel', 'Bone Camel', 28, 'phys', atk('Stamping Hooves', 4200), 1.6, 1.15)),
      m('hexmerchant', 'Cursed Merchant', 29, 'cold', spell('Cold Coin', 3200), 0.95, 1.15),
    ],
    boss: boss(m('tamsin', 'Bey Tamsin, the Bandit Khan', 29, 'phys', atk('Twin Scimitars', 3200)), ['slam', 'summon', 'enrage', 'scorch'], { slam: atk("Khan's Judgement", 3400), novaType: 'fire' }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 10000,
    uniques: ['old_grudge', 'khans_tithe', 'twin_oaths'],
  },
  {
    id: 'kurgans', name: 'The Kurgan Fields', act: 2, tier: 6, levelRange: [28, 30], color: '#6f7a8a',
    desc: 'Grave mounds to the horizon, each one a chieftain buried with his horses.',
    monsters: [
      m('barrowwight', 'Barrow Wight', 28, 'cold', spell('Grave Chill', 3000), 0.85, 1.1),
      fast(m('horseskel', 'Skeletal Steed', 29, 'phys', atk('Trample', 2400), 0.9, 0.95)),
      slow(m('moundguard', 'Mound Guardian', 29, 'phys', atk('Bronze Axe', 3800), 1.5, 1.15)),
      m('moundpriest', 'Kurgan Priest', 30, 'cold', spell('Frost Dirge', 3600, true), 1, 1.25),
    ],
    boss: boss(m('horselord', 'The Horse-Lord in the Mound', 30, 'cold', atk('Grave Lance', 3600)), ['slam', 'nova', 'summon', 'ward'], { slam: atk('Rising from the Barrow', 3400), nova: spell('Winter of the Dead', 4000) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 10000,
    uniques: ['kurgan_crown', 'hollow_locket', 'iron_bulwark'],
  },
  {
    id: 'plateau', name: 'The Thunder Plateau', act: 2, tier: 7, levelRange: [29, 31], color: '#6a78a0',
    desc: 'A high bare tableland where the storms of the steppe come to break.',
    monsters: [
      fast(m('thunderhawk', 'Thunderhawk', 29, 'light', atk('Charged Dive', 2200), 0.75, 0.95)),
      slow(m('rhino', 'Ironhide Rhino', 30, 'phys', atk('Gore', 4200), 1.7, 1.2)),
      m('stormrider', 'Storm Rider', 30, 'light', atk('Crackling Lance', 3000), 1, 1.05),
      m('skyshaman', 'Sky Shaman', 31, 'light', spell('Chain Thunder', 3400, true), 1, 1.25),
    ],
    boss: boss(m('qara', 'Qara, Rider of the Storm', 31, 'light', atk('Thunder Glaive', 3400)), ['slam', 'nova', 'enrage', 'scorch'], { slam: atk('Lightning Charge', 3200), nova: spell('Skyfall', 3800) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9500,
    uniques: ['stormrider_greaves', 'stormhide', 'windchaser'],
  },
  {
    id: 'pyretemple', name: 'The Pyre Temple', act: 2, tier: 7, levelRange: [30, 32], color: '#c0502a',
    desc: 'A temple of red stone where the fire cult tends the flame that burns the steppe.',
    monsters: [
      m('ashmonk', 'Ash Monk', 30, 'fire', atk('Cinder Palm', 2600), 0.95, 1.05),
      fast(m('dervish', 'Flame Dervish', 31, 'fire', atk('Whirling Blades', 2000), 0.8, 0.85)),
      slow(m('pyregolem', 'Pyre Golem', 32, 'fire', atk('Molten Slam', 4200), 1.7, 1.25)),
      m('acolyte', 'Flamekeeper Acolyte', 32, 'fire', spell('Pillar of Flame', 3500, true), 1, 1.3),
    ],
    boss: boss(m('ozar', 'High Flamekeeper Ozar', 32, 'fire', spell('Sacred Fire', 3600)), ['slam', 'nova', 'summon', 'ward', 'scorch'], { slam: atk('Brand of the Flame', 3200), nova: spell('Temple Inferno', 3800) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9500,
    uniques: ['pyre_heart', 'ember_of_faith', 'ninth_psalm'],
  },
  {
    id: 'burningthrone', name: 'The Burning Throne', act: 2, tier: 7, levelRange: [31, 32], color: '#e0702a',
    desc: 'On the highest hill of the steppe the fallen sun still burns, and something sits inside it.',
    monsters: [
      m('sunguard', 'Sunscorched Guard', 31, 'fire', atk('Gilded Halberd', 3600), 1.3, 1.15),
      m('wyrmling', 'Cinder Wyrmling', 32, 'fire', atk('Ember Breath', 2600), 0.9, 1.05),
      m('ashseer', 'Ash Seer', 32, 'light', spell('Heat Lightning', 3200, true), 1, 1.2),
      m('sunpriest', 'Priest of the Fallen Sun', 32, 'fire', spell('Solar Lance', 3600), 1, 1.25),
    ],
    boss: boss(m('azhar', 'Azhar, the Fallen Sun', 33, 'phys', atk('Sunfire Talons', 3400), 1.5, 1.05), ['slam', 'nova', 'summon', 'enrage', 'ward', 'scorch'], { slam: atk('Solar Crash', 3200), nova: spell('Corona', 3800), novaType: 'fire' }),
    actBoss: true,
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9500,
    uniques: ['starforged_edge', 'pyre_heart', 'kurgan_crown', 'khans_tithe', 'mirage_veil', 'stormrider_greaves', 'old_grudge', 'last_breath'],
  },

  // ---------------- Act 3: The City of Saints (docs/design/ACT3.md) ----------------
  // A living city of human zealots: lightning is the check, on trash and in the bosses' novas and ground. Most bosses
  // chain martyrs. Items here roll three levels above the monster, so the act's last kills reach bases of about level 45.
  {
    id: 'pilgrimgate', name: 'The Pilgrim Gate', act: 3, tier: 7, levelRange: [33, 34], color: '#b9a77a', ilvlBonus: 3,
    desc: 'The great gate of the holy city, where pilgrims are searched and exiles are turned back.',
    monsters: [
      m('gatewarden', 'Gate Warden', 33, 'phys', atk('Halberd Thrust', 3400), 1.2, 1.1),
      fast(m('pilgrimzealot', 'Pilgrim Zealot', 33, 'phys', atk('Knotted Cord', 2300), 0.8, 0.9)),
      m('lampbearer', 'Lamp Bearer', 34, 'light', spell('Sanctified Spark', 2800), 0.8, 1.05),
      m('tollinquisitor', 'Toll Inquisitor', 34, 'light', spell('Writ of Lightning', 3300, true), 1, 1.2),
    ],
    boss: boss(m('ansel', 'Warden-Captain Ansel', 34, 'phys', atk('Gate Halberd', 3400)), ['slam', 'nova', 'summon'], { slam: atk('Portcullis Drop', 3400), nova: spell('Bell of Judgement', 3900), novaType: 'light' }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9500,
    uniques: ['pilgrims_road', 'old_grudge', 'stormhide'],
  },
  {
    id: 'almsquarter', name: 'The Alms Quarter', act: 3, tier: 8, levelRange: [33, 35], color: '#a89a8a', ilvlBonus: 3,
    desc: 'Crowded lanes of the poor, who give what little they have and watch for anyone who gives less.',
    monsters: [
      m('almscollector', 'Alms Collector', 33, 'phys', atk('Weighted Purse', 2600), 0.9, 1),
      fast(m('streetzealot', 'Street Zealot', 34, 'phys', atk('Cobble Stone', 2300), 0.8, 0.9)),
      m('lanternsister', 'Lantern Sister', 34, 'light', spell('Lantern Flash', 2900), 0.85, 1.1),
      m('hedgepreacher', 'Hedge Preacher', 35, 'light', spell('Sermon of Sparks', 3400, true), 1, 1.2),
    ],
    boss: boss(m('ilse', 'Mother Almoner Ilse', 35, 'light', spell('Charity of Heaven', 3600)), ['slam', 'nova', 'martyrs'], { slam: atk('Alms Bowl', 3400), nova: spell('Last Offering', 3900) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9500,
    uniques: ['chainbreaker', 'khans_tithe', 'hollow_locket'],
  },
  {
    id: 'scourgeyard', name: 'The Scourging Yard', act: 3, tier: 8, levelRange: [34, 36], color: '#8a5a50', ilvlBonus: 3,
    desc: 'A sanded yard behind the walls, where the faithful come every morning to bleed for their sins.',
    monsters: [
      fast(m('flagellant', 'Flagellant', 34, 'phys', atk('Barbed Scourge', 2200), 0.8, 0.95)),
      m('yardmaster', 'Yard Master', 35, 'phys', atk('Iron Rod', 3600), 1.25, 1.1),
      slow(m('penitentbrute', 'Penitent Bearer', 35, 'phys', atk('Stone of Sorrow', 4200), 1.6, 1.2)),
      m('lashpriest', 'Lash Priest', 36, 'light', spell('Crackling Lash', 3200, true), 0.95, 1.2),
    ],
    boss: boss(m('cato', 'Brother Cato, the Flayed', 36, 'phys', atk('Hooked Scourge', 3200)), ['slam', 'enrage', 'martyrs'], { slam: atk('Blood Offering', 3300) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9500,
    uniques: ['martyrs_shroud', 'last_breath', 'titans_girth'],
  },
  {
    id: 'reliquary', name: 'The Reliquary Vaults', act: 3, tier: 8, levelRange: [35, 37], color: '#7a7a9a', ilvlBonus: 3,
    desc: 'Cold vaults under the city, packed to the roof with the bones of the holy. Relic hunters dig here by torchlight.',
    monsters: [
      m('relichunter', 'Relic Hunter', 35, 'phys', atk('Grave Pick', 2800), 1, 1),
      fast(m('vaultthief', 'Vault Thief', 36, 'phys', atk('Stolen Dagger', 2100), 0.75, 0.85)),
      slow(m('vaultwarden', 'Vault Warden', 36, 'light', atk('Charged Mace', 3900), 1.5, 1.15)),
      m('bonecantor', 'Bone Cantor', 37, 'cold', spell('Chill of the Crypt', 3400, true), 1, 1.2),
    ],
    boss: boss(m('odile', 'Odile of the Long Dig', 37, 'light', atk('Sainted Pickaxe', 3300)), ['slam', 'summon', 'martyrs'], { slam: atk('Collapse the Vault', 3300) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9500,
    uniques: ['confession_hood', 'kurgan_crown', 'hollow_locket'],
  },
  {
    id: 'bellfoundry', name: 'The Bell Foundry', act: 3, tier: 8, levelRange: [36, 38], color: '#a07a4a', ilvlBonus: 3,
    desc: 'Where the city casts its bells in bronze and holy fire. Every bell here has rung for a death.',
    monsters: [
      m('bellcaster', 'Bellcaster', 36, 'fire', atk('Ladle of Bronze', 3000), 1, 1.05),
      fast(m('clapperboy', 'Clapper Boy', 37, 'light', atk('Ringing Hammer', 2200), 0.75, 0.9)),
      slow(m('bronzeguard', 'Bronze Guardsman', 37, 'phys', atk('Bell Mace', 4100), 1.6, 1.2)),
      m('tollmaster', 'Tollmaster', 38, 'light', spell('Peal of Thunder', 3300, true), 1, 1.25),
    ],
    boss: boss(m('harl', 'Bellfounder Harl', 38, 'light', atk('Great Clapper', 3300)), ['slam', 'nova', 'scorch'], { slam: atk('Bronze Bell Drop', 3200), nova: spell('Death Knell', 3800) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9500,
    uniques: ['saints_shard', 'pyre_heart', 'stormhide'],
  },
  {
    id: 'inquisition', name: 'The Hall of Inquisition', act: 3, tier: 9, levelRange: [36, 38], color: '#6a5a7a', ilvlBonus: 3,
    desc: 'Long quiet halls of ledgers and locked doors. Everyone here is guilty; it is only a matter of writing it down.',
    monsters: [
      m('inquisitor', 'Inquisitor', 36, 'light', spell('Lightning Verdict', 3000), 0.95, 1.15),
      m('hallguard', 'Hall Guard', 37, 'phys', atk('Ranseur', 3400), 1.2, 1.1),
      fast(m('informant', 'Informant', 37, 'phys', atk('Hidden Knife', 2100), 0.7, 0.85)),
      m('confessor', 'Confessor', 38, 'light', spell('Words of Thunder', 3400, true), 1, 1.25),
    ],
    boss: boss(m('maren', 'Grand Inquisitor Maren', 38, 'light', spell('Sentence of Heaven', 3400)), ['slam', 'nova', 'ward', 'martyrs'], { slam: atk('Gavel of Iron', 3300), nova: spell('Final Judgement', 3700) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9000,
    uniques: ['confession_hood', 'halo_of_wrath', 'ninth_psalm'],
  },
  {
    id: 'penitentstair', name: 'The Stair of Penitents', act: 3, tier: 9, levelRange: [37, 39], color: '#8a8a7a', ilvlBonus: 3,
    desc: 'Nine thousand steps up to the high city, climbed on the knees, with lightning walking the rails.',
    monsters: [
      fast(m('stairrunner', 'Stair Runner', 37, 'phys', atk('Spiked Staff', 2200), 0.8, 0.9)),
      slow(m('kneelingknight', 'Kneeling Knight', 38, 'light', atk('Thunder Mace', 3900), 1.6, 1.15)),
      m('railpriest', 'Rail Priest', 38, 'light', spell('Walking Lightning', 3000), 0.9, 1.15),
      m('sineater', 'Sin Eater', 39, 'cold', spell('Cold Absolution', 3400), 1, 1.2),
    ],
    boss: boss(m('unshriven', 'The Unshriven Knight', 39, 'light', atk('Oathsword', 3200)), ['slam', 'summon', 'enrage', 'martyrs'], { slam: atk('Crushing Vow', 3200) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9000,
    uniques: ['martyrs_shroud', 'chainbreaker', 'stormrider_greaves'],
  },
  {
    id: 'choirloft', name: 'The Choir Loft', act: 3, tier: 9, levelRange: [38, 40], color: '#9a9ac0', ilvlBonus: 3,
    desc: 'High galleries under the cathedral roof, where the singing never stops and the air tastes of storms.',
    monsters: [
      m('chorister', 'Chorister', 38, 'light', spell('High Note', 2600), 0.8, 1.05),
      fast(m('censerboy', 'Censer Boy', 39, 'fire', atk('Swung Censer', 2300), 0.75, 0.95)),
      m('loftguard', 'Loft Guard', 39, 'phys', atk('Partisan', 3400), 1.2, 1.1),
      m('precentor', 'Precentor', 40, 'light', spell('Storm Canticle', 3400, true), 1, 1.3),
    ],
    boss: boss(m('liselle', 'Cantor Liselle, Voice of Wrath', 40, 'light', spell('Sung Lightning', 3300)), ['slam', 'nova', 'ward', 'scorch', 'martyrs'], { slam: atk('Rood Staff', 3200), nova: spell('Choir of Storms', 3700) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9000,
    uniques: ['saints_shard', 'halo_of_wrath', 'mirage_veil'],
  },
  {
    id: 'saintswalk', name: "The Saints' Walk", act: 3, tier: 9, levelRange: [39, 41], color: '#c0b080', ilvlBonus: 3,
    desc: 'An avenue of gilded statues in the high city. The guards here have never once been told they were wrong.',
    monsters: [
      m('templeguard', 'Temple Guard', 39, 'phys', atk('Gilded Spear', 3300), 1.2, 1.15),
      m('crusader', 'Crusader', 40, 'light', atk('Smiting Blade', 2900), 1.05, 1.1),
      slow(m('gildedknight', 'Gilded Colossus', 40, 'phys', atk('Golden Fist', 4200), 1.7, 1.25)),
      m('lightbringer', 'Lightbringer', 41, 'light', spell('Holy Bolt', 3300, true), 1, 1.3),
    ],
    boss: boss(m('oren', 'Saint Oren the Living', 41, 'light', atk('Radiant Blade', 3100)), ['slam', 'nova', 'summon', 'enrage', 'martyrs'], { slam: atk('Hand of the Saint', 3100), nova: spell('Holy Wrath', 3600) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9000,
    uniques: ['pilgrims_road', 'halo_of_wrath', 'starforged_edge'],
  },
  {
    id: 'highaltar', name: 'The High Altar', act: 3, tier: 9, levelRange: [40, 41], color: '#e0d8a0', ilvlBonus: 3,
    desc: 'The heart of the cathedral, open to the sky. The storm over the altar has been praying back for a thousand years.',
    monsters: [
      m('altarguard', 'Altar Guard', 40, 'light', atk('Consecrated Glaive', 3400), 1.3, 1.15),
      m('ascendedzealot', 'Ascended Zealot', 41, 'light', atk('Winged Blade', 2600), 0.9, 1.05),
      m('hierophant', 'Hierophant', 41, 'light', spell('Skybreak', 3300, true), 1, 1.25),
      m('sacristan', 'Sacristan', 41, 'phys', atk('Altar Knife', 2800), 1, 1.15),
    ],
    boss: boss(m('solenne', 'Hierarch Solenne, Voice of Heaven', 42, 'light', atk('Crozier of Storms', 3200), 1.5, 1.05), ['slam', 'nova', 'summon', 'enrage', 'ward', 'scorch', 'martyrs'], { slam: atk('Pillar of Heaven', 3100), nova: spell('Wrath of God', 3600) }),
    actBoss: true,
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9000,
    uniques: ['halo_of_wrath', 'martyrs_shroud', 'pilgrims_road', 'saints_shard', 'confession_hood', 'chainbreaker', 'starforged_edge'],
  },

  // ---------- Act 4: The Hollow Peaks (docs/design/ACT4.md) ----------------
  // The giants' range: monsters are large and few, a change from the swarms. Cold is the check, on trash and in the
  // bosses' novas and ground. Most bosses bring Frostbite. Items roll seven levels above the monster, so the act's last
  // kills reach bases of about level 57, a third of the way from Act 3's 45 to the 80 that Act 6 ends on.
  {
    id: 'hollowpass', name: 'The Hollow Pass', act: 4, tier: 9, levelRange: [41, 42], color: '#8fa6b8', ilvlBonus: 7,
    desc: 'The only road into the peaks, cut by something that did not need tools.',
    monsters: [
      fast(m('snowwolf', 'Pass Wolf', 41, 'phys', atk('Hamstring', 2500), 1.1, 1.05)),
      slow(m('hillgiant', 'Hill Giant', 41, 'phys', atk('Boulder Club', 4300), 1.9, 1.4)),
      slow(m('passtroll', 'Pass Troll', 42, 'phys', atk('Gnarled Fist', 4000), 1.7, 1.3)),
      rime(m('rimecaller', 'Rimecaller', 42, 'cold', spell('Ice Lance', 3500, true), 1.1, 1.3)),
    ],
    boss: boss(rime(m('hrolf', 'Hrolf Toll-Taker', 42, 'phys', atk('Bridge Beam', 3500))), ['slam', 'nova', 'summon'], { slam: atk('Pass Collapse', 3400), nova: spell('Breath of the Pass', 3900), novaType: 'cold' }),
    bossEvery: 16,
    packSize: [1, 2],
    spawnEveryMs: 12000,
    uniques: ['rimewalkers', 'stormhide', 'iron_bulwark'],
  },
  {
    id: 'screefields', name: 'The Scree Fields', act: 4, tier: 10, levelRange: [41, 43], color: '#9a9a94', ilvlBonus: 7,
    desc: 'Miles of broken stone, thrown down from above by someone who wanted the valley empty.',
    monsters: [
      slow(m('screegolem', 'Scree Golem', 41, 'phys', atk('Rockslide', 4300), 2, 1.35)),
      fast(m('stonehawk', 'Scree Hawk', 42, 'phys', atk('Stooping Talons', 2300), 0.9, 1)),
      slow(m('boulderthrower', 'Boulder Thrower', 42, 'phys', atk('Hurled Stone', 3900), 1.7, 1.45)),
      rime(m('frostshrike', 'Frost Shrike', 43, 'cold', spell('Needle of Ice', 3100, true), 1, 1.2)),
    ],
    boss: boss(rime(m('asa', 'Asa Stone-Thrower', 43, 'phys', atk('Flung Boulder', 3400))), ['slam', 'nova', 'frostbite'], { slam: atk('Rain of Rock', 3400), nova: spell('Killing Frost', 3900), novaType: 'cold' }),
    bossEvery: 16,
    packSize: [1, 2],
    spawnEveryMs: 12000,
    uniques: ['frostgrip', 'hollow_locket', 'titans_girth'],
  },
  {
    id: 'howlingfells', name: 'The Howling Fells', act: 4, tier: 10, levelRange: [42, 44], color: '#7f93a8', ilvlBonus: 7,
    desc: 'High moors where the wind never drops, and the wolves have learned to hunt inside it.',
    monsters: [
      fast(m('direwolf', 'Dire Wolf', 42, 'cold', atk('Frozen Jaws', 2500), 1.15, 1.1)),
      slow(m('fellbear', 'Fell Bear', 43, 'phys', atk('Mauling Paw', 3900), 2, 1.4)),
      fast(m('windwraith', 'Wind Wraith', 43, 'cold', spell('Howling Cold', 2800), 0.9, 1.1)),
      rime(m('wolfshaman', 'Wolf Speaker', 44, 'cold', spell('Winter Call', 3500, true), 1.1, 1.3)),
    ],
    boss: boss(rime(m('fenrik', 'Fenrik, Father of Wolves', 44, 'cold', atk('Throat Tear', 3300))), ['slam', 'summon', 'frostbite'], { slam: atk('Pack Leap', 3300) }),
    bossEvery: 16,
    packSize: [1, 2],
    spawnEveryMs: 12000,
    uniques: ['wolfmother_pelt', 'sunmane_pelt', 'windchaser'],
  },
  {
    id: 'glasslake', name: 'The Glass Lake', act: 4, tier: 10, levelRange: [43, 45], color: '#a0c8d8', ilvlBonus: 7,
    desc: 'A lake frozen so clear you can see what is walking on the underside of the ice.',
    monsters: [
      m('icefisher', 'Ice Fisher', 43, 'cold', atk('Bone Harpoon', 3100), 1.15, 1.15),
      slow(m('frostshell', 'Rime Crab', 44, 'phys', atk('Shell Crush', 4200), 2.1, 1.3)),
      fast(m('skater', 'Lake Skater', 44, 'cold', atk('Razor Legs', 2400), 0.9, 1)),
      rime(m('undertow', 'Thing Under the Ice', 45, 'cold', spell('Cracking Cold', 3600, true), 1.2, 1.35)),
    ],
    boss: boss(rime(m('mirrawen', 'Mirrawen of the Ice', 45, 'cold', spell('Black Ice', 3500))), ['slam', 'nova', 'ward', 'frostbite'], { slam: atk('Breaking Floe', 3300), nova: spell('Frozen Depths', 3800) }),
    bossEvery: 16,
    packSize: [1, 2],
    spawnEveryMs: 12000,
    uniques: ['heart_of_winter', 'kurgan_crown', 'hollow_locket'],
  },
  {
    id: 'bonequarry', name: 'The Bone Quarry', act: 4, tier: 10, levelRange: [43, 45], color: '#c8bfa8', ilvlBonus: 7,
    desc: 'The giants bury their dead here, and cut the old ones up for building stone.',
    monsters: [
      slow(m('quarrygiant', 'Quarry Giant', 43, 'phys', atk('Stone Maul', 4200), 2, 1.45)),
      m('bonecutter', 'Bone Cutter', 44, 'phys', atk('Rib Saw', 3000), 1.2, 1.15),
      fast(m('marrowhound', 'Marrow Hound', 44, 'cold', atk('Gnawing Chill', 2400), 0.95, 1)),
      rime(m('gravethane', 'Grave Thane', 45, 'cold', spell('Cold of the Barrow', 3500, true), 1.15, 1.3)),
    ],
    boss: boss(rime(m('ulfhild', 'Ulfhild Bone-Mason', 45, 'phys', atk('Femur Hammer', 3300))), ['slam', 'enrage', 'frostbite'], { slam: atk('Cornerstone', 3300), novaType: 'cold' }),
    bossEvery: 16,
    packSize: [1, 2],
    spawnEveryMs: 11500,
    uniques: ['giants_knuckle', 'titans_girth', 'old_grudge'],
  },
  {
    id: 'icevault', name: 'The Blue Vault', act: 4, tier: 10, levelRange: [44, 46], color: '#6a9ac8', ilvlBonus: 7,
    desc: 'A cavern under the glacier, blue as a drowned eye, where the cold has been stored since before the first winter.',
    monsters: [
      slow(m('vaultyeti', 'Vault Yeti', 44, 'cold', atk('Avalanche Fist', 4000), 1.9, 1.4)),
      m('icespider', 'Crystal Spider', 45, 'cold', atk('Numbing Bite', 2700), 1.05, 1.05),
      m('frostmite', 'Frost Mite Queen', 45, 'phys', atk('Ice Mandibles', 3200), 1.3, 1.15),
      rime(m('hoarfrost', 'Hoarfrost Sage', 46, 'cold', spell('Bitter Hail', 3500, true), 1.15, 1.35)),
    ],
    boss: boss(rime(m('skaldi', 'Skaldi the Cold Hoard', 46, 'cold', spell('Hoarded Winter', 3400))), ['slam', 'nova', 'summon', 'frostbite'], { slam: atk('Vault Door', 3300), nova: spell('The First Cold', 3700) }),
    bossEvery: 16,
    packSize: [1, 2],
    spawnEveryMs: 11500,
    uniques: ['crown_of_the_hollow', 'pyre_heart', 'stormhide'],
  },
  {
    id: 'mammothroad', name: 'The Mammoth Road', act: 4, tier: 11, levelRange: [44, 46], color: '#a08a70', ilvlBonus: 7,
    desc: 'Tusked herds have walked this ledge for ten thousand years, and nothing has ever stopped one.',
    monsters: [
      slow(m('mammoth', 'Woolly Mammoth', 44, 'phys', atk('Tusk Sweep', 4300), 2.3, 1.45)),
      m('herdsman', 'Giant Herdsman', 45, 'phys', atk('Goad Spear', 3300), 1.5, 1.3),
      fast(m('snowlynx', 'Snow Lynx', 45, 'phys', atk('Silent Pounce', 2300), 0.9, 1.05)),
      rime(m('tuskseer', 'Tusk Seer', 46, 'cold', spell('Stampede of Ice', 3600, true), 1.15, 1.35)),
    ],
    boss: boss(rime(m('oldtusk', 'Old Tusk', 46, 'phys', atk('Gore', 3400), 1.2)), ['slam', 'enrage', 'scorch'], { slam: atk('Earthshaker', 3300), novaType: 'cold' }),
    bossEvery: 16,
    packSize: [1, 2],
    spawnEveryMs: 11500,
    uniques: ['rimewalkers', 'brawlers_buckle', 'windchaser'],
  },
  {
    id: 'hangingglacier', name: 'The Hanging Glacier', act: 4, tier: 11, levelRange: [45, 47], color: '#b8d8e8', ilvlBonus: 7,
    desc: 'A river of ice held on the cliff face by nothing but habit. It groans when you walk on it.',
    monsters: [
      slow(m('glacierogre', 'Glacier Ogre', 45, 'cold', atk('Ice-Bound Club', 4100), 1.9, 1.4)),
      fast(m('crevasse', 'Crevasse Stalker', 46, 'cold', atk('Sudden Drop', 2500), 1, 1.1)),
      m('ropecutter', 'Ropecutter', 46, 'phys', atk('Ice Axe', 3000), 1.2, 1.2),
      rime(m('avalanchepriest', 'Avalanche Priest', 47, 'cold', spell('Bringing Down the Snow', 3500, true), 1.2, 1.35)),
    ],
    boss: boss(rime(m('sigrun', 'Sigrun, Voice of the Glacier', 47, 'cold', spell('Groan of the Ice', 3300))), ['slam', 'nova', 'scorch', 'frostbite'], { slam: atk('Serac Fall', 3200), nova: spell('White Death', 3700) }),
    bossEvery: 16,
    packSize: [1, 2],
    spawnEveryMs: 11500,
    uniques: ['frostgrip', 'wolfmother_pelt', 'mirage_veil'],
  },
  {
    id: 'steading', name: 'The Stone Steading', act: 4, tier: 11, levelRange: [46, 48], color: '#8a8078', ilvlBonus: 7,
    desc: 'A giant farmstead, every door a cliff, every table a hill. You are about the size of what they keep in the walls.',
    monsters: [
      slow(m('steadgiant', 'Steading Giant', 46, 'phys', atk('Hearthstone', 4200), 2.1, 1.45)),
      slow(m('frostgiant', 'Frost Giant', 47, 'cold', atk('Frozen Greataxe', 4000), 2, 1.45)),
      fast(m('wardog', 'Giant War Dog', 47, 'phys', atk('Crushing Bite', 2500), 1.2, 1.15)),
      rime(m('hearthwitch', 'Hearth Witch', 48, 'cold', spell('Cold Hearth', 3500, true), 1.15, 1.4)),
    ],
    boss: boss(rime(m('borghild', 'Borghild of the Long Table', 48, 'cold', atk('Carving Knife', 3200))), ['slam', 'summon', 'enrage', 'frostbite'], { slam: atk('Table Flip', 3200) }),
    bossEvery: 16,
    packSize: [1, 2],
    spawnEveryMs: 11000,
    uniques: ['crown_of_the_hollow', 'old_grudge', 'khans_tithe'],
  },
  {
    id: 'longhall', name: 'The Long Hall', act: 4, tier: 11, levelRange: [47, 48], color: '#907050', ilvlBonus: 7,
    desc: 'Their feast hall, a day’s walk from end to end. The fires went out an age ago, and the feast never stopped.',
    monsters: [
      slow(m('hallgiant', 'Feasting Giant', 47, 'phys', atk('Bone Trencher', 4100), 2.1, 1.45)),
      m('jarl', 'Giant Jarl', 48, 'cold', atk('Oathsword of Ice', 3300), 1.6, 1.35),
      fast(m('skald', 'Giant Skald', 48, 'cold', spell('Saga of Frost', 2900), 1.1, 1.15)),
      rime(m('meadwitch', 'Mead Witch', 48, 'cold', spell('Cup of Winter', 3500, true), 1.2, 1.4)),
    ],
    boss: boss(rime(m('gunnvor', 'Thane Gunnvor', 48, 'cold', atk('Drinking Horn', 3200))), ['slam', 'nova', 'enrage', 'ward', 'frostbite'], { slam: atk('Boast of the Hall', 3200), nova: spell('Cold Toast', 3600) }),
    bossEvery: 16,
    packSize: [1, 2],
    spawnEveryMs: 11000,
    uniques: ['giants_knuckle', 'crown_of_the_hollow', 'starforged_edge'],
  },
  {
    id: 'kingsstair', name: "The King's Stair", act: 4, tier: 11, levelRange: [48, 49], color: '#a0b0c0', ilvlBonus: 7,
    desc: 'Each step is the height of a house. Nothing small has climbed it and come down.',
    monsters: [
      slow(m('stairguard', 'Stair Guard', 48, 'phys', atk('Pillar Maul', 4100), 2.2, 1.5)),
      slow(m('stormgiant', 'Peak Giant', 49, 'cold', atk('Summit Fist', 3900), 2.1, 1.5)),
      fast(m('stairwolf', 'Hound of the King', 49, 'cold', atk('Rime Fangs', 2500), 1.1, 1.15)),
      rime(m('kingsrime', 'Rime Herald', 49, 'cold', spell('Word of the King', 3400, true), 1.2, 1.4)),
    ],
    boss: boss(rime(m('hallvard', 'Hallvard Kingsguard', 49, 'cold', atk('Throne Pike', 3100))), ['slam', 'nova', 'summon', 'enrage', 'frostbite'], { slam: atk('The Last Step', 3100), nova: spell('Crown of Frost', 3600) }),
    bossEvery: 16,
    packSize: [1, 2],
    spawnEveryMs: 11000,
    uniques: ['giants_knuckle', 'rimewalkers', 'heart_of_winter'],
  },
  {
    id: 'giantsthrone', name: "The Giants' Throne", act: 4, tier: 11, levelRange: [48, 49], color: '#d8e8f0', ilvlBonus: 7,
    desc: 'The summit is a chair. The king who sits in it has been hollowed out by the cold, and he has not noticed yet.',
    monsters: [
      slow(m('thronegiant', 'Throne Giant', 48, 'cold', atk('King’s Justice', 4000), 2.2, 1.5)),
      m('hollowthane', 'Hollow Thane', 49, 'cold', atk('Hollow Blade', 3200), 1.5, 1.3),
      m('frozenhusk', 'Frozen Husk', 49, 'phys', atk('Stiff Blow', 3400), 1.4, 1.3),
      rime(m('wintervoice', 'Voice of Winter', 49, 'cold', spell('Winter’s Decree', 3400, true), 1.2, 1.4)),
    ],
    boss: boss(rime(m('hollowking', 'Ymir Vane, the Hollow King', 50, 'cold', atk('Sceptre of the Peak', 3200), 1.5, 1.05)), ['slam', 'nova', 'summon', 'enrage', 'ward', 'scorch', 'frostbite'], { slam: atk('The Mountain Falls', 3100), nova: spell('Endless Winter', 3600) }),
    actBoss: true,
    bossEvery: 16,
    packSize: [1, 2],
    spawnEveryMs: 11000,
    uniques: ['crown_of_the_hollow', 'giants_knuckle', 'wolfmother_pelt', 'rimewalkers', 'heart_of_winter', 'frostgrip', 'starforged_edge'],
  },
];

/** Areas off the campaign road (data/maps.ts): they can be fought in, but nothing that walks ZONES sees them. */
export const EXTRA_ZONES: ZoneDef[] = [];

export function zoneDef(id: string): ZoneDef {
  const z = ZONES.find((x) => x.id === id) ?? EXTRA_ZONES.find((x) => x.id === id);
  if (!z) throw new Error(`Unknown zone ${id}`);
  return z;
}

/** The areas whose boss opens the road to this one. */
export function roadsInto(z: ZoneDef): string[] {
  return z.requires?.after ?? [ZONES[ZONES.indexOf(z) - 1]?.id].filter((x): x is string => !!x);
}

/** How many of its act's bosses an area needs beaten first. */
export function bossesNeeded(z: ZoneDef): number {
  return z.requires?.bosses ?? 0;
}

/** The areas the given area's boss leads to (only those whose act is open), ignoring boss-count gates. */
export function nextZones(id: string): ZoneDef[] {
  return ZONES.filter((z) => roadsInto(z).includes(id) && actOpen(z.act));
}

/** The act boss's area for an act. */
export function actBossZone(act: number): ZoneDef | undefined {
  return ZONES.find((z) => z.act === act && z.actBoss);
}

export function zonesInAct(act: number): ZoneDef[] {
  return ZONES.filter((z) => z.act === act);
}

export function monsterLife(level: number): number {
  return Math.round((15 + 6 * Math.pow(level, 1.4)) * MONSTER_LIFE_SCALE);
}

export function monsterDamage(level: number): number {
  return Math.round((1 + 1.0 * Math.pow(level, 1.15)) * MONSTER_DMG_SCALE);
}

/**
 * Global pacing knobs for monsters. Raised 2026-10-26 (life 0.85 → 1.4, damage ×1.15) once the sim bot
 * played its gems well and cleared Act 1 in 2–5 h against the 6–10 h target.
 */
export const MONSTER_LIFE_SCALE = 1.4;
export const MONSTER_DMG_SCALE = 1.15;

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
/** scorch: ground under the player, as a fraction of the boss's hit per second, and how long it lasts */
export const BOSS_SCORCH_EVERY_MS = 11000;
export const BOSS_SCORCH_DPS = 0.2;
export const BOSS_SCORCH_MS = 6000;
/** martyrs: chained as the fight opens and again at these life fractions; the boss can't be hurt while any of them lives */
export const BOSS_MARTYR_AT = [1, 0.5];
export const BOSS_MARTYR_COUNT = 2;
/** frostbite: one stack this often, and each slows your actions; at the cap you freeze solid, take the shatter and lose your turns */
export const BOSS_FROSTBITE_EVERY_MS = 2500;
export const BOSS_FROSTBITE_SLOW_PCT = 4;
export const BOSS_FROSTBITE_MAX = 10;
export const BOSS_FROSTBITE_FREEZE_MS = 3000;
/** the shatter, as a multiple of the boss's hit: cold, and blocks don't stop it */
export const BOSS_FROSTBITE_SHATTER = 2;
/** a guard or movement skill shakes off this many stacks; a flask clears them all and breaks the ice */
export const BOSS_FROSTBITE_CLEANSE = 5;
/** an Instilled flask drinks itself at this many stacks */
export const BOSS_FROSTBITE_INSTILL_AT = 6;
/** A martyr fights at its boss's level on this fraction of a trash monster's life. It doesn't attack: it only has to die. */
export const MARTYR: MonsterDef = { id: 'martyr', name: 'Chained Martyr', level: 1, dmgType: 'phys', basic: { name: 'Prays', kind: 'attack', ms: MONSTER_BASE_ATTACK_MS }, lifeMult: 0.5 };

/** What each mechanic is called on screen, and how to answer it. */
export const MECHANIC_INFO: Record<BossMechanic, { name: string; tip: string }> = {
  slam: { name: 'Heavy blow', tip: "Telegraphed big hit. Evasion Rating can't dodge it — guard, interrupt or drink." },
  nova: { name: 'Nova', tip: 'Telegraphed elemental blast. Blocks don’t stop it — resistances, shields, evades or an interrupt do.' },
  summon: { name: 'Summons', tip: 'Calls more adds during the fight. Area skills keep them down.' },
  enrage: { name: 'Enrage', tip: 'Below 35% life it attacks 50% faster for 30% more damage. Burst it down or drink.' },
  ward: { name: 'Ward', tip: 'At 66% and 33% life it raises a barrier. Break it within 8 s or the boss heals 10%.' },
  martyrs: { name: 'Martyrs', tip: "It can't be hurt while the martyrs chained to it live, and it chains two more at half life. Only a blow aimed at a martyr lands: click one, or set a skill's rule to aim at martyrs (Aim rules, War Table)." },
  scorch: { name: 'Scorched earth', tip: 'Every 11 s it sets the ground under you ablaze (or frozen, or charged) for 6 s. Resist its element, Run to step out sooner, or put a guard on a Ground rule to step out at once.' },
  frostbite: { name: 'Frostbite', tip: "A stack builds on you every 2.5 s, twice as fast on Frozen ground, and each slows you by 4%. At 10 you freeze solid for 3 s and take a cold shatter. A guard or movement skill shakes off 5, and a flask clears them all. Set one to the Frostbite rule (Vitals rules, War Table), or Instill a flask, so it fires at a stack count." },
};
