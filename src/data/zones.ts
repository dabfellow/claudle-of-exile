import type { DamageType, GroundKind } from '../engine/types';

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
 * - channel: a long spell that grows until it lands, and snowballs the fight if it does — stun or interrupt it, by hand or by rule
 */
export type BossMechanic = 'slam' | 'nova' | 'summon' | 'enrage' | 'ward' | 'scorch' | 'martyrs' | 'frostbite' | 'channel';

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
  channel?: MonsterSkill;
  /** element of the nova and scorch mechanics (defaults to the boss's damage type) */
  novaType?: DamageType;
  /** element of the slam (defaults to the boss's damage type) */
  slamType?: DamageType;
  /** its cold ground is Frozen ground, not Chilled */
  rime?: boolean;
  /** the ground it lays, when that isn't what its element leaves behind */
  groundKind?: GroundKind;
  /**
   * Echoes: old mechanics brought back two at a time, also listed in `mechanics`. With more than one pair the boss
   * moves on to the next as its life falls, an even share each, and only the pair at hand is in force.
   */
  echoes?: [BossMechanic, BossMechanic][];
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
    n: 4, name: 'The Hollow Peaks', open: true,
    outro: 'The Hollow King falls, and the mountain shakes as he lands. Past the last peak the land drops away to the east, down to a sea that has not seen the sun.',
  },
  {
    n: 5, name: 'The Sunless Sea', open: true,
    outro: 'The Caller sinks, and for the first time in living memory the tide along the Drowned Coast goes out and stays out. To the north-east, the broken towers of the Shattered Throne stand clear of the storm.',
  },
  {
    n: 6, name: 'The Shattered Throne', open: true,
    outro: 'The Last King falls, and nothing mends. The sky stays broken, and the throne he reached from is not empty: something that never wore a crown turns slowly to look at you. Back in your hideout, the old Map Device has begun to hum.',
  },
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
/** its spell leaves storm-tossed water, not shocked ground */
const stormy = (def: MonsterDef): MonsterDef => ({ ...def, groundKind: 'stormwater' });
/** its spell leaves unholy ground, whatever its element */
const unholy = (def: MonsterDef): MonsterDef => ({ ...def, groundKind: 'unholy' });

const m = (id: string, name: string, level: number, dmgType: DamageType, basic: MonsterSkill, lifeMult = 1, dmgMult = 1): MonsterDef => ({
  id, name, level, dmgType, basic, lifeMult, dmgMult,
});

interface BossCasts {
  slam: MonsterSkill;
  nova?: MonsterSkill;
  channel?: MonsterSkill;
  novaType?: DamageType;
  slamType?: DamageType;
  rime?: boolean;
  groundKind?: GroundKind;
  echoes?: [BossMechanic, BossMechanic][];
}

const boss = (def: MonsterDef, mechanics: BossMechanic[], casts: BossCasts): MonsterDef => ({
  ...def,
  ...casts,
  mechanics: [...new Set([...mechanics, ...(casts.echoes?.flat() ?? [])])],
});

/**
 * Areas in campaign order, with each act's boss last. Acts 1 and 2 run straight, each boss opening the next area. From
 * Act 3 on the roads fork: `requires` sets them, and a side area is one no road leads on from (isSideArea).
 */
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
    requires: { after: ['pilgrimgate'] },
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
    requires: { after: ['pilgrimgate'] },
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
    requires: { after: ['almsquarter'] },
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
    requires: { after: ['almsquarter', 'scourgeyard'] },
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
    requires: { after: ['bellfoundry'] },
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
    requires: { after: ['bellfoundry'] },
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
    requires: { after: ['penitentstair'] },
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
    requires: { after: ['inquisition', 'penitentstair'] },
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
    requires: { after: ['saintswalk'], bosses: 7 },
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
    requires: { after: ['hollowpass'] },
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
    requires: { after: ['hollowpass'] },
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
    requires: { after: ['screefields'] },
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
    requires: { after: ['howlingfells'] },
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
    requires: { after: ['glasslake'] },
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
    requires: { after: ['bonequarry'] },
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
    requires: { after: ['glasslake'] },
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
    requires: { after: ['mammothroad'] },
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
    requires: { after: ['steading'] },
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
    requires: { after: ['hangingglacier', 'steading'] },
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
    requires: { after: ['kingsstair'], bosses: 8 },
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

  // ---------------- Act 5: The Sunless Sea (docs/design/ACT5.md) ----------------
  // Island to island across the drowned dark: fire and lightning together are the check, a boss hitting in one and blasting
  // in the other. Channels arrive at the second stage. Items roll ten levels above the monster, so the act's last kills reach
  // bases of about level 68. The first area hangs off Act 4's last; everything after it follows on as usual.
  {
    id: 'blackharbor', name: 'The Black Harbour', act: 5, tier: 12, levelRange: [49, 50], color: '#39424e', ilvlBonus: 10,
    requires: { after: ['giantsthrone'] }, // Act 4's last area: its boss opens the sea
    desc: 'The last port on the coast, where the lamps burn all day and every ship that sails comes back with the wrong crew.',
    monsters: [
      m('pressganger', 'Press-Ganger', 49, 'phys', atk('Belaying Pin', 2700), 1, 1),
      fast(m('dockrat', 'Tar Rat', 49, 'fire', atk('Burning Bite', 2100), 0.7, 0.85)),
      m('harbourwatch', 'Lamp Watchman', 50, 'light', spell('Signal Flare', 2900), 0.85, 1.1),
      m('saltcaulker', 'Pitch Caulker', 50, 'fire', spell('Hot Pitch', 3300, true), 1, 1.2),
    ],
    boss: boss(m('creel', 'Harbourmaster Creel', 50, 'fire', atk('Boarding Hook', 3300)), ['slam', 'nova', 'summon'], { slam: atk('Dropped Anchor', 3300), nova: spell('Harbour Lightning', 3800), novaType: 'light' }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9000,
    uniques: ['bosuns_oath', 'old_grudge', 'pyre_heart'],
  },
  {
    id: 'wreckline', name: 'The Wreck Line', act: 5, tier: 12, levelRange: [49, 51], color: '#6a4a3a', ilvlBonus: 10,
    desc: 'A reef of burning hulks across the harbour mouth, set alight by no one, still alight.',
    requires: { after: ['blackharbor'] },
    monsters: [
      slow(m('hullbreaker', 'Hull Crawler', 49, 'phys', atk('Keel Claw', 3900), 1.5, 1.15)),
      fast(m('flotsam', 'Burning Flotsam', 50, 'fire', atk('Cinder Splash', 2200), 0.75, 0.9)),
      m('wreckgunner', 'Taken Gunner', 50, 'fire', atk('Loaded Swivel', 3200), 1, 1.15),
      m('stormrigger', 'Storm Rigger', 51, 'light', spell('Crackling Line', 3200, true), 0.95, 1.2),
    ],
    boss: boss(m('gall', 'Bosun Gall', 51, 'fire', atk('Burning Rope', 3200)), ['slam', 'channel'], { slam: atk('Keelhauler', 3200), channel: spell('Call to Quarters', 6500) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9000,
    uniques: ['leviathan_hide', 'starforged_edge', 'stormhide'],
  },
  {
    id: 'cinderkey', name: 'Cinder Key', act: 5, tier: 12, levelRange: [50, 52], color: '#a0482a', ilvlBonus: 10,
    desc: 'The first island out: a black cone of rock weeping fire into the sea, and the steam never lifts.',
    requires: { after: ['blackharbor'] },
    monsters: [
      m('tarwalker', 'Tar Walker', 50, 'fire', atk('Sticky Grasp', 3000), 1.05, 1.05),
      fast(m('steamkin', 'Steam Kin', 51, 'fire', atk('Scalding Rush', 2100), 0.7, 0.9)),
      slow(m('obsidiancrab', 'Obsidian Crab', 51, 'phys', atk('Glass Pincer', 4100), 1.6, 1.2)),
      m('keyshaman', 'Vent Shaman', 52, 'fire', spell('Lava Spit', 3300, true), 1, 1.25),
    ],
    boss: boss(m('tarry', 'Mother Tarry', 52, 'fire', spell('Boiling Pitch', 3400)), ['slam', 'scorch', 'channel'], { slam: atk('Tar Wave', 3200), channel: spell('Heart of the Vent', 6400), novaType: 'light', groundKind: 'stormwater' }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9000,
    uniques: ['corposant', 'pyre_heart', 'emberheart'],
  },
  {
    id: 'squallbanks', name: 'The Squall Banks', act: 5, tier: 12, levelRange: [51, 53], color: '#4f6f8f', ilvlBonus: 10,
    desc: 'Shoals so shallow that the storm stands on them. Nothing keeps its feet here for long.',
    requires: { after: ['wreckline', 'cinderkey'] },
    monsters: [
      fast(m('stormgull', 'Storm Gull', 51, 'light', atk('Charged Dive', 2100), 0.7, 0.9)),
      m('shoalstalker', 'Shoal Stalker', 52, 'light', atk('Barbed Gaff', 2800), 1, 1.05),
      slow(m('sandback', 'Sandback', 52, 'phys', atk('Shell Rush', 4000), 1.6, 1.15)),
      stormy(m('squallwife', 'Squall Witch', 53, 'light', spell('Breaking Wave', 3300, true), 1, 1.25)),
    ],
    boss: boss(m('aune', 'Aune, the Stormwife', 53, 'light', spell('Wind-Lashed Bolt', 3300)), ['slam', 'nova', 'scorch', 'channel'], { slam: atk('Wave Hammer', 3200), nova: spell('Burning Rain', 3800), novaType: 'fire', channel: spell('Marriage of Storms', 6200) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9000,
    uniques: ['deckwalkers', 'stormrider_greaves', 'stormhide'],
  },
  {
    id: 'lampgulf', name: 'The Gulf of Lamps', act: 5, tier: 13, levelRange: [51, 53], color: '#2f5f6a', ilvlBonus: 10,
    desc: 'Black water with lights moving under it. The sailors who followed them are still down there, and they have lights now too.',
    requires: { after: ['squallbanks'] },
    monsters: [
      m('lampfish', 'Lure Swimmer', 51, 'light', spell('Glowing Bite', 2700), 0.85, 1.05),
      fast(m('deepeel', 'Deep Eel', 52, 'light', atk('Shock Coil', 2200), 0.75, 0.9)),
      m('lureman', 'Lure-Taken Sailor', 52, 'phys', atk('Lamp Hook', 3000), 1.1, 1.05),
      m('anglerpriest', 'Lamp Priest', 53, 'fire', spell('Drowned Flame', 3300, true), 1, 1.25),
    ],
    boss: boss(m('lanternmaw', 'The Lantern Maw', 53, 'fire', atk('Hooked Jaws', 3300)), ['nova', 'summon', 'channel'], { slam: atk('Snapping Jaws', 3200), nova: spell('Blinding Lure', 3800), novaType: 'light', channel: spell('The Long Light', 6200) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9000,
    uniques: ['corposant', 'saints_shard', 'halo_of_wrath'],
  },
  {
    id: 'drownedfleet', name: 'The Drowned Fleet', act: 5, tier: 13, levelRange: [52, 54], color: '#50606a', ilvlBonus: 10,
    desc: 'Every ship the coast ever lost, under full sail, a fathom below the surface and still in line.',
    requires: { after: ['squallbanks'] },
    monsters: [
      m('fleetmarine', 'Drowned Marine', 52, 'phys', atk('Rusted Boarding Axe', 2900), 1.1, 1.05),
      fast(m('powdermonkey', 'Powder Monkey', 53, 'fire', atk('Lit Fuse', 2200), 0.7, 0.95)),
      m('fleetgunner', 'Broadside Gunner', 53, 'fire', atk('Chain Shot', 3300), 1, 1.2),
      m('signalman', 'Dead Signalman', 54, 'light', spell('Storm Semaphore', 3200, true), 0.95, 1.25),
    ],
    boss: boss(m('hask', 'Commodore Hask', 54, 'light', atk('Dead Man\'s Cutlass', 3200)), ['slam', 'summon', 'enrage', 'channel'], { slam: atk('Full Broadside', 3100), novaType: 'fire', channel: spell('All Hands Below', 6000) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9000,
    uniques: ['harpoons_answer', 'old_grudge', 'martyrs_shroud'],
  },
  {
    id: 'brimstone', name: 'Brimstone Isle', act: 5, tier: 13, levelRange: [52, 54], color: '#b0702a', ilvlBonus: 10,
    desc: 'Yellow stone and bad air. A shore of fire where the taken crews come to be burned clean of their names.',
    requires: { after: ['drownedfleet'] },
    monsters: [
      m('sulphurman', 'Sulphur Digger', 52, 'fire', atk('Yellow Pick', 2800), 1, 1.05),
      fast(m('ashgull', 'Cinder Gull', 53, 'fire', atk('Burning Peck', 2000), 0.7, 0.85)),
      slow(m('brimstonehulk', 'Brimstone Hulk', 53, 'fire', atk('Molten Fist', 4100), 1.7, 1.25)),
      m('stokerpriest', 'Stoker of Names', 54, 'fire', spell('Pillar of Sulphur', 3300, true), 1, 1.3),
    ],
    boss: boss(m('brimstonekeeper', 'The Name-Burner', 54, 'fire', spell('Searing Ledger', 3300)), ['slam', 'nova', 'scorch'], { slam: atk('Branding Iron', 3100), nova: spell('Thunder of the Pit', 3700), novaType: 'light', groundKind: 'stormwater' }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9000,
    uniques: ['leviathan_hide', 'pyre_heart', 'kurgan_crown'],
  },
  {
    id: 'hollowreef', name: 'The Hollow Reef', act: 5, tier: 13, levelRange: [53, 55], color: '#8a5a6a', ilvlBonus: 10,
    desc: 'A reef grown over a city no map remembers. It breathes, slowly, and the tunnels change.',
    requires: { after: ['drownedfleet'] },
    monsters: [
      slow(m('coralbrute', 'Coral-Grown Brute', 53, 'phys', atk('Reef Fist', 4000), 1.6, 1.2)),
      fast(m('reefdart', 'Reef Dart', 54, 'light', atk('Stinging Rush', 2100), 0.7, 0.9)),
      m('polypmother', 'Polyp Mother', 54, 'cold', spell('Cold Spawn', 3200), 0.9, 1.15),
      m('reefspeaker', 'Reef Speaker', 55, 'light', spell('Coral Arc', 3300, true), 1, 1.25),
    ],
    boss: boss(m('reefmother', 'The Reef Mother', 55, 'light', spell('Living Coral', 3200)), ['slam', 'summon', 'ward', 'channel'], { slam: atk('Tunnel Collapse', 3100), novaType: 'fire', channel: spell('The Slow Breath', 5800) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 9000,
    uniques: ['tide_crown', 'confession_hood', 'kurgan_crown'],
  },
  {
    id: 'thunderhead', name: 'The Thunderhead', act: 5, tier: 14, levelRange: [54, 56], color: '#46506f', ilvlBonus: 10,
    desc: 'Open water under the great storm. Waterspouts walk the horizon, and the rain falls upward.',
    requires: { after: ['brimstone', 'hollowreef'] },
    monsters: [
      m('spoutrider', 'Spout Rider', 54, 'light', atk('Lightning Harpoon', 2800), 1, 1.1),
      fast(m('rainwraith', 'Rain Wraith', 55, 'light', spell('Falling Spark', 2300), 0.7, 0.95)),
      m('emberpetrel', 'Fire Petrel', 55, 'fire', atk('St Elmo\'s Talon', 2500), 0.85, 1.05),
      stormy(m('tempestkeeper', 'Tempest Keeper', 56, 'light', spell('Waterspout', 3300, true), 1, 1.3)),
    ],
    boss: boss(m('vane', 'Captain Vane, Eye of the Storm', 56, 'fire', atk('Burning Mainsail', 3100)), ['slam', 'nova', 'enrage', 'scorch', 'channel'], { slam: atk('Mast Fall', 3000), nova: spell('Eye of the Storm', 3600), novaType: 'light', groundKind: 'stormwater', channel: spell('Fire in the Rigging', 5600) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['deckwalkers', 'stormrider_greaves', 'pilgrims_road'],
  },
  {
    id: 'leviathanrib', name: "Leviathan's Rib", act: 5, tier: 14, levelRange: [54, 56], color: '#a09a8a', ilvlBonus: 10,
    desc: 'The island is a dead thing. Its ribs stand a mile out of the sea, and the crews who flense it have been at it for a thousand years.',
    requires: { after: ['thunderhead'] },
    monsters: [
      m('flenser', 'Flenser', 54, 'phys', atk('Blubber Spade', 2900), 1.05, 1.1),
      slow(m('ribcrawler', 'Rib Crawler', 55, 'phys', atk('Marrow Pincer', 4100), 1.7, 1.2)),
      fast(m('oilbat', 'Oil-Slick Bat', 55, 'fire', atk('Burning Wing', 2100), 0.7, 0.9)),
      m('tryworker', 'Tryworks Keeper', 56, 'fire', spell('Whale-Oil Fire', 3300, true), 1, 1.3),
    ],
    boss: boss(m('flensemaster', 'Master Flenser Oake', 56, 'fire', atk('Great Spade', 3100)), ['slam', 'summon', 'ward', 'channel'], { slam: atk('The Long Cut', 3000), novaType: 'light', channel: spell('Rendered Fire', 5600) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['harpoons_answer', 'chainbreaker', 'starforged_edge'],
  },
  {
    id: 'blackcurrent', name: 'The Black Current', act: 5, tier: 14, levelRange: [55, 57], color: '#26323f', ilvlBonus: 10,
    desc: 'A river in the sea, running against the wind. Ships that enter it stop answering the helm.',
    requires: { after: ['thunderhead'] },
    monsters: [
      m('currentshade', 'Current Shade', 55, 'cold', spell('Cold Undertone', 2900), 0.85, 1.1),
      fast(m('blackeel', 'Black Eel', 56, 'light', atk('Lightning Coil', 2100), 0.75, 0.95)),
      m('helmsman', 'Lost Helmsman', 56, 'phys', atk('Spoke of the Wheel', 3000), 1.1, 1.1),
      stormy(m('currentcaller', 'Current Caller', 57, 'light', spell('Pull of the Deep', 3300, true), 1, 1.3)),
    ],
    boss: boss(m('steersman', 'The Steersman', 57, 'light', atk('Iron Tiller', 3000)), ['slam', 'nova', 'enrage', 'channel'], { slam: atk('Hard Over', 2900), nova: spell('Burning Wake', 3500), novaType: 'fire', channel: spell('Course Laid In', 5400) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['tide_crown', 'bosuns_oath', 'halo_of_wrath'],
  },
  {
    id: 'voicetrench', name: 'The Trench of Voices', act: 5, tier: 14, levelRange: [55, 57], color: '#3a3a5a', ilvlBonus: 10,
    desc: 'The sea floor falls away here, and every name the water ever took comes up out of it, one at a time.',
    requires: { after: ['blackcurrent'] },
    monsters: [
      m('namelessone', 'The Nameless', 55, 'phys', atk('Grasping Reach', 2800), 1, 1.1),
      fast(m('whisperer', 'Whisperer', 56, 'light', spell('Word in the Dark', 2300), 0.7, 0.95)),
      m('trenchburner', 'Trench Burner', 56, 'fire', spell('Vent Flame', 3000, true), 0.95, 1.2),
      slow(m('trenchhorror', 'Trench Horror', 57, 'fire', atk('Crushing Depth', 4000), 1.7, 1.3)),
    ],
    boss: boss(m('choirdeep', 'The Choir Below', 57, 'fire', spell('Rising Hymn', 3100)), ['nova', 'summon', 'scorch', 'channel'], { slam: atk('Swell', 3000), nova: spell('Thousand Names', 3500), novaType: 'light', groundKind: 'stormwater', channel: spell('The Long Note', 5400) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['corposant', 'saints_shard', 'bosuns_oath'],
  },
  {
    id: 'lightless', name: 'The Lightless Deep', act: 5, tier: 14, levelRange: [56, 57], color: '#14181f', ilvlBonus: 10,
    desc: 'Below the storm and below the sea, where the only light is what the deep things burn.',
    requires: { after: ['blackcurrent'] },
    monsters: [
      m('deepthing', 'Deep Thing', 56, 'phys', atk('Too Many Hands', 2900), 1.15, 1.15),
      fast(m('blindhunter', 'Blind Hunter', 56, 'light', atk('Sensing Strike', 2000), 0.75, 0.95)),
      m('dimfire', 'Deepfire', 57, 'fire', spell('Lightless Flame', 3000, true), 0.9, 1.2),
      stormy(m('abyssherald', 'Herald of the Deep', 57, 'light', spell('Pressure Storm', 3300, true), 1, 1.3)),
    ],
    boss: boss(m('firstdrowned', 'The First Drowned', 57, 'light', atk('Weight of Water', 3000), 1.2), ['slam', 'nova', 'summon', 'enrage', 'channel'], { slam: atk('Sea-Floor Crush', 2900), nova: spell('Burning Deep', 3500), novaType: 'fire', channel: spell('The Drowning Word', 5200) }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['leviathan_hide', 'tide_crown', 'harpoons_answer'],
  },
  {
    id: 'maelstrom', name: "The Maelstrom's Eye", act: 5, tier: 14, levelRange: [56, 57], color: '#1e2a3f', ilvlBonus: 10,
    desc: 'The middle of the Sunless Sea, where the water turns forever around a hole in the world. What drowned the coast is calling from the bottom.',
    requires: { after: ['voicetrench', 'lightless'], bosses: 10 },
    monsters: [
      m('crewless', 'Crew of the Last Ship', 56, 'phys', atk('Hands on the Rope', 2800), 1.1, 1.15),
      fast(m('maelstromkin', 'Whirl Kin', 57, 'light', atk('Spinning Lash', 2000), 0.75, 1)),
      m('eyepriest', 'Priest of the Eye', 57, 'fire', spell('Burning Tide', 3200, true), 1, 1.3),
      stormy(m('eyestorm', 'Stormbound Herald', 57, 'light', spell('Maelstrom Bolt', 3200, true), 1, 1.3)),
    ],
    boss: boss(m('caller', 'Thalass, the Caller Below', 58, 'fire', atk('Hand of the Deep', 3000), 1.5, 1.05), ['slam', 'nova', 'summon', 'enrage', 'ward', 'scorch', 'martyrs', 'channel'], { slam: atk('The Sea Comes In', 2900), nova: spell('Sky-Drowning Storm', 3500), novaType: 'light', groundKind: 'stormwater', channel: spell('The Last Call', 5000) }),
    actBoss: true,
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['leviathan_hide', 'bosuns_oath', 'corposant', 'deckwalkers', 'tide_crown', 'harpoons_answer', 'starforged_edge'],
  },

  // ---------------- Act 6: The Shattered Throne (docs/design/ACT6.md) ----------------
  {
    id: 'exilesgate', name: "The Exiles' Gate", act: 6, tier: 15, levelRange: [57, 58], color: '#6a5a4a', ilvlBonus: 14,
    requires: { after: ['maelstrom'] }, // Act 5's last area: its boss clears the way home
    desc: 'The gate they drove you out of. It still stands, with nothing left on either side of it to keep apart.',
    monsters: [
      m('gatesentry', 'Gate Sentry', 57, 'cold', atk('Rimed Halberd', 2800), 1.05, 1.05),
      fast(m('banishedhound', 'Banished Hound', 57, 'fire', atk('Cinder Bite', 2100), 0.7, 0.9)),
      m('sealclerk', 'Clerk of Exile', 58, 'light', spell('Writ of Banishment', 3000), 0.9, 1.15),
      unholy(m('gatecantor', 'Gate Cantor', 58, 'cold', spell('Unmaking Psalm', 3300, true), 1, 1.25)),
    ],
    boss: boss(m('corvane', 'Warden Corvane', 58, 'cold', atk('Keys of the Gate', 3200)), ['slam', 'nova'], { slam: atk('The Gate Swings', 3200), slamType: 'light', nova: spell('Sentence of Fire', 3800), novaType: 'fire', groundKind: 'unholy', echoes: [['scorch', 'martyrs']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['oathbreaker', 'heart_of_winter', 'bosuns_oath'],
  },
  {
    id: 'kingsroad', name: "The King's Road", act: 6, tier: 15, levelRange: [57, 59], color: '#8a7a5a', ilvlBonus: 14,
    desc: 'Forty leagues of white stone, every milestone cut with the same name. The name has been scratched out, by hand, on all of them.',
    requires: { after: ['exilesgate'] },
    monsters: [
      m('milestonewalker', 'Milestone Walker', 57, 'fire', atk('Carved Fist', 3000), 1.1, 1.05),
      fast(m('roadcrow', 'Tax Crow', 58, 'light', atk('Shocking Peck', 2100), 0.7, 0.9)),
      slow(m('wagonghast', 'Wagon Ghast', 58, 'cold', atk('Frozen Axle', 4000), 1.6, 1.2)),
      m('roadreeve', 'Road Reeve', 59, 'phys', atk('Levy Staff', 2900), 1, 1.1),
    ],
    boss: boss(m('haldane', 'Reeve Haldane', 59, 'fire', atk('Tollman\'s Hook', 3200)), ['slam', 'nova', 'summon'], { slam: atk('Road Closed', 3100), slamType: 'cold', nova: spell('Levy of Storms', 3800), novaType: 'light', groundKind: 'stormwater', echoes: [['ward', 'scorch']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['kingsmarch', 'deckwalkers', 'rimewalkers'],
  },
  {
    id: 'tithefields', name: 'The Tithe Fields', act: 6, tier: 15, levelRange: [58, 60], color: '#9a8a3a', ilvlBonus: 14,
    desc: 'The grain came up black the year the king reached for it. The reapers were never told to stop.',
    requires: { after: ['kingsroad'] },
    monsters: [
      m('tithereaper', 'Tithe Reaper', 58, 'cold', atk('Frostbitten Scythe', 2800), 1, 1.1),
      fast(m('blackrook', 'Black Rook', 59, 'fire', atk('Ember Talon', 2000), 0.7, 0.9)),
      m('scarecrowlord', 'Bound Scarecrow', 59, 'light', spell('Crackling Straw', 3000), 0.95, 1.15),
      unholy(m('grainwitch', 'Black Grain Witch', 60, 'fire', spell('Blighted Harvest', 3300, true), 1, 1.25)),
    ],
    boss: boss(m('lastreaper', 'The Last Reaper', 60, 'cold', atk('Long Scythe', 3100)), ['slam', 'nova'], { slam: atk('The Harvest Comes In', 3100), slamType: 'fire', nova: spell('Lightning Fallow', 3800), novaType: 'light', rime: true, echoes: [['summon', 'frostbite']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['regents_mantle', 'crown_of_the_hollow', 'frostgrip'],
  },
  {
    id: 'fortobedience', name: 'Fort Obedience', act: 6, tier: 15, levelRange: [59, 61], color: '#5a5f66', ilvlBonus: 14,
    desc: 'The garrison held its post through the end of the world, because no order came to do anything else.',
    requires: { after: ['kingsroad'] },
    monsters: [
      m('garrisonman', 'Garrison Soldier', 59, 'phys', atk('Regulation Blade', 2800), 1.1, 1.1),
      m('wallarcher', 'Wall Archer', 60, 'light', atk('Charged Bolt', 3100), 0.85, 1.2),
      fast(m('fortmastiff', 'Fort Mastiff', 60, 'fire', atk('Burning Maw', 2100), 0.75, 0.95)),
      m('fortchaplain', 'Fort Chaplain', 61, 'cold', spell('Cold Benediction', 3300), 1, 1.25),
    ],
    boss: boss(m('brandt', 'Castellan Brandt', 61, 'light', atk('Order of the Day', 3100)), ['slam', 'nova'], { slam: atk('Hold the Wall', 3100), slamType: 'cold', nova: spell('Boiling Oil', 3700), novaType: 'fire', echoes: [['martyrs', 'ward']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['last_decree', 'old_grudge', 'harpoons_answer'],
  },
  {
    id: 'bannerfield', name: 'The Field of Banners', act: 6, tier: 15, levelRange: [59, 61], color: '#7a3a3a', ilvlBonus: 14,
    desc: 'The last army in the empire died here in perfect order. The banners still stand, and still turn to follow you.',
    requires: { after: ['tithefields', 'fortobedience'] },
    monsters: [
      m('bannerman', 'Fallen Banner-Bearer', 59, 'fire', atk('Burning Standard', 2900), 1.05, 1.1),
      slow(m('siegehusk', 'Siege Husk', 60, 'cold', atk('Frozen Ram', 4100), 1.7, 1.25)),
      fast(m('warhawk', 'Carrion Hawk', 60, 'light', atk('Stormclaw', 2000), 0.7, 0.95)),
      unholy(m('fieldsurgeon', 'Field Surgeon', 61, 'light', spell('Last Rites', 3200, true), 1, 1.25)),
    ],
    boss: boss(m('ivarra', 'Marshal Ivarra', 61, 'fire', atk('Marshal\'s Baton', 3100)), ['slam', 'nova'], { slam: atk('Advance!', 3000), slamType: 'light', nova: spell('Winter Campaign', 3700), novaType: 'cold', channel: spell('The Last Muster', 5800), echoes: [['channel', 'enrage']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['oathbreaker', 'leviathan_hide', 'giants_knuckle'],
  },
  {
    id: 'assizes', name: 'The Assizes', act: 6, tier: 15, levelRange: [60, 62], color: '#4a4a6a', ilvlBonus: 14,
    desc: 'The court that sentenced you. Your case was never closed, and the jury has been waiting.',
    requires: { after: ['bannerfield'] },
    monsters: [
      m('bailiff', 'Bailiff', 60, 'cold', atk('Iron Summons', 2800), 1.05, 1.1),
      m('oathwitness', 'Sworn Witness', 61, 'light', spell('Damning Word', 2900), 0.85, 1.2),
      fast(m('pettifogger', 'Pettifogger', 61, 'fire', spell('Burning Brief', 2300), 0.7, 1)),
      rime(m('juror', 'Hollow Juror', 62, 'cold', spell('Cold Verdict', 3300, true), 1, 1.25)),
    ],
    boss: boss(m('morrow', 'High Justice Morrow', 62, 'light', spell('Gavel of Heaven', 3100)), ['slam', 'nova', 'enrage'], { slam: atk('Guilty', 3000), slamType: 'fire', nova: spell('Cold Judgement', 3600), novaType: 'cold', rime: true, echoes: [['martyrs', 'frostbite']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['crownbreaker_mask', 'tide_crown', 'wolfmother_pelt'],
  },
  {
    id: 'lowercity', name: 'The Lower City', act: 6, tier: 16, levelRange: [60, 62], color: '#6a4a3f', ilvlBonus: 14,
    desc: 'The streets fell a hundred feet and kept their shape. People still queue outside the shops.',
    requires: { after: ['bannerfield'] },
    monsters: [
      m('queuer', 'The Patient Dead', 60, 'phys', atk('Grip of the Queue', 3000), 1.15, 1.1),
      fast(m('gutterrat', 'Gutter Rat', 61, 'fire', atk('Burning Bite', 2000), 0.7, 0.95)),
      m('lamplighter', 'Lamplighter', 61, 'fire', spell('Lit Wick', 3000, true), 0.95, 1.2),
      stormy(m('sewerpriest', 'Sewer Priest', 62, 'light', spell('Rising Damp', 3200, true), 1, 1.25)),
    ],
    boss: boss(m('sarn', 'Guildmaster Sarn', 62, 'cold', atk('Weighted Purse', 3000)), ['slam', 'nova', 'summon'], { slam: atk('Foreclosure', 3000), slamType: 'fire', nova: spell('Bad Debt', 3600), novaType: 'light', groundKind: 'stormwater', channel: spell('Calling In the Loan', 5600), echoes: [['scorch', 'channel']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['kingsmarch', 'corposant', 'pyre_heart'],
  },
  {
    id: 'dryaqueduct', name: 'The Dry Aqueducts', act: 6, tier: 16, levelRange: [60, 62], color: '#7a8a9a', ilvlBonus: 14,
    desc: 'They carried a river to the capital. The river stopped mid-air the day the sky broke, and is still up there, frozen and waiting.',
    requires: { after: ['lowercity'] },
    monsters: [
      m('sluicekeeper', 'Sluice Keeper', 60, 'cold', atk('Iron Wheel', 2900), 1.05, 1.1),
      fast(m('frostmoth', 'Pale Moth', 61, 'cold', spell('Rime Dust', 2200), 0.7, 0.95)),
      slow(m('archgolem', 'Arch Golem', 61, 'fire', atk('Fallen Keystone', 4100), 1.7, 1.25)),
      m('hangingdrop', 'Hanging Water', 62, 'light', spell('Static Rain', 3100), 0.95, 1.2),
    ],
    boss: boss(m('vossa', 'Engineer Vossa', 62, 'fire', atk('Plumb Bob', 3000)), ['slam', 'nova'], { slam: atk('Burst Main', 3000), slamType: 'light', nova: spell('The River Falls', 3600), novaType: 'cold', rime: true, channel: spell('Opening the Sluices', 5600), echoes: [['frostbite', 'channel']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8500,
    uniques: ['hand_of_the_regent', 'heart_of_winter', 'frostgrip'],
  },
  {
    id: 'kingsmint', name: "The King's Mint", act: 6, tier: 16, levelRange: [61, 63], color: '#b0903a', ilvlBonus: 14,
    desc: 'Every coin in the empire was struck here, and every coin has the same face. It has started to look back.',
    requires: { after: ['lowercity'] },
    monsters: [
      m('coinstriker', 'Coin Striker', 61, 'phys', atk('Die Hammer', 3000), 1.1, 1.15),
      fast(m('goldbeetle', 'Gilded Beetle', 62, 'fire', atk('Hot Mandible', 2000), 0.75, 0.95)),
      m('assayer', 'Assayer', 62, 'cold', spell('Cold Assay', 3000), 0.95, 1.2),
      unholy(m('coinghost', 'Debased Shade', 63, 'light', spell('Counterfeit Bolt', 3200, true), 1, 1.25)),
    ],
    boss: boss(m('mintmaster', 'The Mintmaster', 63, 'fire', atk('Master Die', 3000)), ['slam', 'nova'], { slam: atk('Struck', 2900), slamType: 'cold', nova: spell('Hoard of Lightning', 3600), novaType: 'light', groundKind: 'unholy', echoes: [['summon', 'martyrs']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8000,
    uniques: ['last_decree', 'crown_of_the_hollow', 'bosuns_oath'],
  },
  {
    id: 'hanginggardens', name: 'The Hanging Gardens', act: 6, tier: 16, levelRange: [61, 63], color: '#3f7a4a', ilvlBonus: 14,
    desc: 'Nobody has tended them since the fall, and they have never been better. The only green thing left in the empire, and it knows it.',
    requires: { after: ['dryaqueduct', 'kingsmint'] },
    monsters: [
      m('thorngroom', 'Thorn Groom', 61, 'cold', atk('Frost Shears', 2800), 1, 1.1),
      fast(m('gardenwasp', 'Garden Wasp', 62, 'light', atk('Charged Sting', 1900), 0.65, 0.95)),
      slow(m('oldhedge', 'The Old Hedge', 62, 'fire', atk('Burning Bramble', 4100), 1.7, 1.2)),
      m('bloomwife', 'Bloom Wife', 63, 'light', spell('Pollen Spark', 3100), 1, 1.2),
    ],
    boss: boss(m('queensgardener', "The Queen's Gardener", 63, 'light', atk('Grafting Knife', 3000)), ['slam', 'nova'], { slam: atk('Pruned', 2900), slamType: 'cold', nova: spell('Burning Blossom', 3600), novaType: 'fire', echoes: [['ward', 'summon']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8000,
    uniques: ['crownbreaker_mask', 'wolfmother_pelt', 'pilgrims_road'],
  },
  {
    id: 'burnedarchive', name: 'The Burned Archive', act: 6, tier: 16, levelRange: [62, 64], color: '#5a3a2a', ilvlBonus: 14,
    desc: 'The king had every record of what he meant to do put to the torch. The pages are still falling.',
    requires: { after: ['hanginggardens'] },
    monsters: [
      m('scriptorghast', 'Scriptor', 62, 'fire', spell('Burning Margin', 2900), 0.9, 1.15),
      fast(m('pagebat', 'Page Bat', 63, 'light', atk('Paper Cut', 2000), 0.7, 1)),
      m('indexer', 'Indexer', 63, 'cold', atk('Cold Reference', 2900), 1.05, 1.1),
      unholy(m('redactor', 'Redactor', 64, 'cold', spell('Blot', 3200, true), 1, 1.3)),
    ],
    boss: boss(m('lastarchivist', 'The Last Archivist', 64, 'cold', spell('Recited Fire', 3000)), ['slam', 'nova'], { slam: atk('The Heavy Volume', 2900), slamType: 'light', nova: spell('Burning Index', 3500), novaType: 'fire', groundKind: 'unholy', channel: spell('The Unread Page', 5400), echoes: [['martyrs', 'channel']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8000,
    uniques: ['last_decree', 'hand_of_the_regent', 'saints_shard'],
  },
  {
    id: 'longfracture', name: 'The Long Fracture', act: 6, tier: 16, levelRange: [62, 64], color: '#2f3f5f', ilvlBonus: 14,
    desc: 'A crack through the world, thirty miles long and cold as the far side of it. Things climb out, and the wind goes in.',
    requires: { after: ['hanginggardens'] },
    monsters: [
      m('riftclimber', 'Rift Climber', 62, 'cold', atk('Numb Hands', 2800), 1.05, 1.1),
      fast(m('edgeskater', 'Edge Skater', 63, 'fire', atk('Burning Edge', 2000), 0.7, 1)),
      m('voidlight', 'Light from Below', 63, 'light', spell('Wrong Lightning', 3000), 0.85, 1.25),
      rime(m('fracturepriest', 'Priest of the Crack', 64, 'cold', spell('Breath of the Fracture', 3200, true), 1, 1.3)),
    ],
    boss: boss(m('riftwarden', 'Warden of the Rift', 64, 'light', atk('Span Hammer', 3000)), ['slam', 'nova', 'enrage'], { slam: atk('The Ground Gives', 2900), slamType: 'fire', nova: spell('Breath of the Deep Cold', 3500), novaType: 'cold', rime: true, echoes: [['scorch', 'frostbite']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8000,
    uniques: ['oathbreaker', 'crown_of_the_hollow', 'rimewalkers'],
  },
  {
    id: 'driftingquarter', name: 'The Drifting Quarter', act: 6, tier: 17, levelRange: [63, 65], color: '#6f6a8f', ilvlBonus: 14,
    desc: 'The noble quarter tore free and never came down. Its houses turn slowly in the air, lit from inside, and the dinner is still being served.',
    requires: { after: ['longfracture'] },
    monsters: [
      m('footman', 'Silent Footman', 63, 'phys', atk('Silver Tray', 2900), 1.1, 1.15),
      fast(m('skywisp', 'Sky Wisp', 64, 'light', spell('Falling Star', 2200), 0.7, 1)),
      m('dowager', 'Burning Dowager', 64, 'fire', spell('Candle Hex', 3000, true), 0.95, 1.2),
      unholy(m('noherald', 'Herald of No House', 65, 'cold', spell('Unnamed Title', 3200, true), 1, 1.3)),
    ],
    boss: boss(m('vanterre', 'Duchess Vanterre', 65, 'fire', spell('Dinner Is Served', 3000)), ['slam', 'nova', 'summon'], { slam: atk('The House Falls', 2900), slamType: 'cold', nova: spell('A Storm Indoors', 3500), novaType: 'light', groundKind: 'unholy', echoes: [['enrage', 'scorch']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8000,
    uniques: ['kingsmarch', 'crownbreaker_mask', 'corposant'],
  },
  {
    id: 'kingsreach', name: "The King's Reach", act: 6, tier: 17, levelRange: [63, 65], color: '#3f3050', ilvlBonus: 14,
    desc: 'The tower he built to touch it. It leans now, and at the top the stairs go on into nothing, and something on the other side has hold of them.',
    requires: { after: ['longfracture'] },
    monsters: [
      m('towermason', 'Tower Mason', 63, 'fire', atk('Hot Trowel', 2900), 1.1, 1.15),
      slow(m('stairgargoyle', 'Stair Gargoyle', 64, 'cold', atk('Frozen Plunge', 4000), 1.7, 1.3)),
      fast(m('stairspark', 'Stair Spark', 64, 'light', atk('Running Current', 1900), 0.7, 1)),
      stormy(m('stargazer', 'Stargazer', 65, 'light', spell('The Sky Comes Close', 3200, true), 1, 1.3)),
    ],
    boss: boss(m('astrologer', 'Court Astrologer Ilse', 65, 'light', spell('Wrong Star', 2900)), ['slam', 'nova'], { slam: atk('Fallen Sphere', 2800), slamType: 'fire', nova: spell('The Cold Between', 3500), novaType: 'cold', rime: true, channel: spell('Reading the End', 5200), echoes: [['channel', 'frostbite']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8000,
    uniques: ['regents_mantle', 'frostgrip', 'halo_of_wrath'],
  },
  {
    id: 'sunderedhall', name: 'The Sundered Hall', act: 6, tier: 17, levelRange: [64, 65], color: '#50404a', ilvlBonus: 14,
    desc: 'The great hall split down the middle on the last night. The court carries on in both halves, each sure that the other is dead.',
    requires: { after: ['driftingquarter', 'kingsreach'] },
    monsters: [
      m('courtier', 'Courtier', 64, 'light', spell('Whispered Charge', 2800), 0.9, 1.2),
      m('splitguard', 'Sundered Guard', 64, 'cold', atk('Half a Halberd', 2900), 1.1, 1.15),
      fast(m('kingsfool', "The King's Fool", 65, 'fire', atk('Burning Bells', 2000), 0.75, 1.05)),
      unholy(m('royalconfessor', 'Confessor Royal', 65, 'fire', spell('Absolved of Nothing', 3200, true), 1, 1.3)),
    ],
    boss: boss(m('chamberlain', 'The Lord Chamberlain', 65, 'cold', atk('Staff of Office', 2900)), ['slam', 'nova', 'summon'], { slam: atk('You Are Dismissed', 2800), slamType: 'light', nova: spell('Audience with Fire', 3400), novaType: 'fire', groundKind: 'unholy', echoes: [['martyrs', 'scorch']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8000,
    uniques: ['oathbreaker', 'kingsmarch', 'hand_of_the_regent'],
  },
  {
    id: 'hallofcrowns', name: 'The Hall of Crowns', act: 6, tier: 17, levelRange: [64, 65], color: '#8a7a2a', ilvlBonus: 14,
    desc: 'Every king of the line lies here with his crown on. All of the crowns are turned to face the throne, and one of the biers is empty.',
    requires: { after: ['sunderedhall'] },
    monsters: [
      m('oldking', 'Interred King', 64, 'cold', atk('Sceptre of Ice', 2900), 1.15, 1.15),
      slow(m('tombguardian', 'Tomb Guardian', 64, 'fire', atk('Molten Mace', 4000), 1.7, 1.3)),
      fast(m('crownmite', 'Crown Mite', 65, 'light', atk('Arcing Bite', 1900), 0.7, 1)),
      rime(m('linekeeper', 'Keeper of the Line', 65, 'cold', spell('The Long Cold', 3100, true), 1, 1.3)),
    ],
    boss: boss(m('crownbearer', 'The Crownbearer', 65, 'fire', atk('Velvet Cushion', 2900)), ['slam', 'nova', 'enrage'], { slam: atk('Heavy Is the Head', 2800), slamType: 'light', nova: spell('Winter of the Line', 3400), novaType: 'cold', rime: true, echoes: [['frostbite', 'martyrs']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8000,
    uniques: ['crownbreaker_mask', 'last_decree', 'crown_of_the_hollow'],
  },
  {
    id: 'ninthstair', name: 'The Ninth Stair', act: 6, tier: 17, levelRange: [64, 65], color: '#3a2a3a', ilvlBonus: 14,
    desc: 'Nine flights to the throne room, and the king had one guard for each. Eight of them left when they saw what he had reached for.',
    requires: { after: ['sunderedhall'] },
    monsters: [
      m('stairknight', 'Knight of the Stair', 64, 'cold', atk('Oath Blade', 2800), 1.1, 1.2),
      m('kingshound', "King's Hound", 65, 'fire', atk('Throat of Coals', 2200), 0.8, 1.05),
      fast(m('lastpage', 'The Last Page', 65, 'light', spell('Message Undelivered', 2100), 0.7, 1.05)),
      unholy(m('kingsvoice', "The King's Voice", 65, 'light', spell('By Royal Command', 3100, true), 1, 1.3)),
    ],
    boss: boss(m('ninthguard', 'The Ninth Guard', 65, 'light', atk('Duty', 2800), 1.15), ['slam', 'nova', 'summon', 'enrage'], { slam: atk('None Shall Pass', 2800), slamType: 'cold', nova: spell('Burning Loyalty', 3400), novaType: 'fire', groundKind: 'unholy', channel: spell('The Last Oath', 5000), echoes: [['channel', 'scorch']] }),
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8000,
    uniques: ['regents_mantle', 'kingsmarch', 'starforged_edge'],
  },
  {
    id: 'shatteredthrone', name: 'The Shattered Throne', act: 6, tier: 17, levelRange: [64, 65], color: '#1f1a2a', ilvlBonus: 14,
    desc: 'The room where he reached. The roof is gone, the sky behind it is broken, and everything the empire ever was has come here to watch him do it again.',
    requires: { after: ['ninthstair'], bosses: 14 },
    monsters: [
      m('thronewatcher', 'Watcher of the Throne', 64, 'cold', atk('Unblinking Spear', 2800), 1.15, 1.2),
      fast(m('skysliver', 'Sky Sliver', 65, 'light', atk('Falling Edge', 1900), 0.75, 1.05)),
      m('ashofcourt', 'Ash of the Court', 65, 'fire', spell('Burning Fealty', 3000), 1, 1.25),
      unholy(m('unanointed', 'The Unanointed', 65, 'fire', spell('Empty Coronation', 3100, true), 1, 1.3)),
    ],
    boss: boss(m('aurelane', 'Oswin Aurelane, the Last King', 66, 'fire', atk('The Hand That Reached', 2900), 1.6, 1.05), ['slam', 'nova', 'summon', 'enrage', 'ward'], { slam: atk('Kneel', 2800), slamType: 'light', nova: spell('Winter of the Last Reign', 3400), novaType: 'cold', groundKind: 'unholy', channel: spell('He Reaches Again', 4800), echoes: [['scorch', 'martyrs'], ['frostbite', 'channel'], ['martyrs', 'channel']] }),
    actBoss: true,
    bossEvery: 25,
    packSize: [3, 5],
    spawnEveryMs: 8000,
    uniques: ['oathbreaker', 'kingsmarch', 'last_decree', 'crownbreaker_mask', 'hand_of_the_regent', 'regents_mantle', 'starforged_edge'],
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

/** A dead end off the roads: nothing past it needs it, except as one of the bosses an act boss counts. */
export function isSideArea(z: ZoneDef): boolean {
  return !z.actBoss && !ZONES.some((x) => roadsInto(x).includes(z.id));
}

/** The act boss's area for an act. */
export function actBossZone(act: number): ZoneDef | undefined {
  return ZONES.find((z) => z.act === act && z.actBoss);
}

export function zonesInAct(act: number): ZoneDef[] {
  return ZONES.filter((z) => z.act === act);
}

/** The mechanics in force in an Echoes phase: everything but the echoes of the other phases. */
export function echoMechanics(def: Pick<MonsterDef, 'mechanics' | 'echoes'>, phase: number): BossMechanic[] {
  const mechanics = def.mechanics ?? ['slam'];
  if (!def.echoes) return mechanics;
  const here = def.echoes[phase];
  const others = def.echoes.flat().filter((k) => !here.includes(k));
  return mechanics.filter((k) => !others.includes(k));
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
/**
 * channel: every so often the boss stops to call up a long spell. It pulses harder and harder as it grows, then lands
 * like a nova; a landed channel also leaves the boss stronger for the rest of the fight. A stun, freeze or interrupt
 * breaks it, and the boss staggers.
 */
export const BOSS_CHANNEL_EVERY_MS = 20000;
export const BOSS_CHANNEL_PULSE_MS = 1000;
/** a pulse at the start and at the end of the channel, as multiples of the boss's hit */
export const BOSS_CHANNEL_PULSE_MIN = 0.15;
export const BOSS_CHANNEL_PULSE_MAX = 0.75;
export const BOSS_CHANNEL_LAND_MULT = 3.5;
/** every channel that lands: this much more damage from the boss, for the rest of the fight */
export const BOSS_CHANNEL_SURGE = 0.2;
export const BOSS_CHANNEL_STAGGER_MS = 1500;
/** wind-ups for a boss whose data doesn't name its own */
export const BOSS_SLAM_DEFAULT: MonsterSkill = { name: 'Heavy Blow', kind: 'attack', ms: 3600 };
export const BOSS_NOVA_DEFAULT: MonsterSkill = { name: 'Nova', kind: 'spell', ms: 4000 };
export const BOSS_CHANNEL_DEFAULT: MonsterSkill = { name: 'Deep Call', kind: 'spell', ms: 6000 };
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

/** Where an Echoes pairing changes what answers a mechanic. */
export const ECHO_TIPS: { pair: [BossMechanic, BossMechanic]; tip: string }[] = [
  { pair: ['martyrs', 'channel'], tip: "A stun can't land on a chained boss, so only an interrupt, like War Cry, breaks a channel while its martyrs stand." },
  { pair: ['frostbite', 'channel'], tip: "Frozen solid, you can't press anything: clear Frostbite before a channel comes, or the two land together." },
  { pair: ['martyrs', 'frostbite'], tip: 'Frostbite keeps building while you cut down its martyrs, so its answer has to fire by itself.' },
];

/** What a boss's Echoes mean together: the tips for each pairing it brings at once. */
export function echoTips(def: Pick<MonsterDef, 'echoes'>): string[] {
  const pairs = def.echoes ?? [];
  return ECHO_TIPS.filter((t) => pairs.some((p) => t.pair.every((k) => p.includes(k)))).map((t) => t.tip);
}

/** What each mechanic is called on screen, and how to answer it. */
export const MECHANIC_INFO: Record<BossMechanic, { name: string; tip: string }> = {
  slam: { name: 'Heavy blow', tip: "Telegraphed big hit. Evasion Rating can't dodge it — guard, interrupt or drink." },
  nova: { name: 'Nova', tip: 'Telegraphed elemental blast. Blocks don’t stop it — resistances, shields, evades or an interrupt do.' },
  summon: { name: 'Summons', tip: 'Calls more adds during the fight. Area skills keep them down.' },
  enrage: { name: 'Enrage', tip: 'Below 35% life it attacks 50% faster for 30% more damage. Burst it down or drink.' },
  ward: { name: 'Ward', tip: 'At 66% and 33% life it raises a barrier. Break it within 8 s or the boss heals 10%.' },
  martyrs: { name: 'Martyrs', tip: "It can't be hurt while the martyrs chained to it live, and it chains two more at half life. Only a blow aimed at a martyr lands: click one, or set a skill's rule to aim at martyrs (Aim rules, War Table)." },
  channel: { name: 'Channels', tip: "It stops to call up a long spell that pulses harder as it grows, then lands past any block and leaves it stronger for the rest of the fight. A stun, freeze or interrupt breaks it and staggers the boss: press War Cry, or put a skill on the rule When an enemy channels (a wind-up rule won't fire)." },
  scorch: { name: 'Scorched earth', tip: 'Every 11 s it sets the ground under you ablaze (or frozen, charged or worse) for 6 s. Resist its element, Run to step out sooner, or put a guard on a Ground rule to step out at once.' },
  frostbite: { name: 'Frostbite', tip: "A stack builds on you every 2.5 s, twice as fast on Frozen ground, and each slows you by 4%. At 10 you freeze solid for 3 s and take a cold shatter. A guard or movement skill shakes off 5, and a flask clears them all. Set one to the Frostbite rule (Vitals rules, War Table), or Instill a flask, so it fires at a stack count." },
};
