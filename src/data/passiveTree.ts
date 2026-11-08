import type { StatKey } from '../engine/types';

/**
 * The 5x expanded character passive skill tree:
 * Six class sectors radiating outward around a shared PoE-style central concourse.
 * Concentric distance rings, fanned and interlinked clusters, 3 paired Cosmic Gateways,
 * 6 Doomed Gates with permanent debuffs unlocking god-tier clusters,
 * 12 Celestial Forbidden Keystones on the outer rim, and PoE-style archetype Masteries.
 */

export type PassiveKind = 'start' | 'small' | 'large' | 'travel' | 'highway' | 'notable' | 'doomed' | 'mastery' | 'gateway' | 'keystone';
export type ClassRegion = 'str' | 'duelist' | 'dex' | 'shadow' | 'int' | 'templar';
export type TreeRegion = ClassRegion | 'center' | 'forbidden';
export type Mechanic = 'rage' | 'riposte' | 'momentum' | 'malice' | 'manaPower' | 'martyr';

type StatMap = Partial<Record<StatKey, number>>;

export interface MasteryOption {
  label: string;
  stats: StatMap;
}

export interface PassiveNode {
  id: string;
  name: string;
  kind: PassiveKind;
  region: TreeRegion;
  cluster?: string;
  x: number;
  y: number;
  stats: StatMap;
  links: string[];
  desc?: string;
  options?: MasteryOption[];
  gatewayPair?: string;
}

const m = (label: string, stats: StatMap): MasteryOption => ({ label, stats });

// ---------- Masteries: shared by theme, like PoE ----------

export const MASTERIES: Record<string, MasteryOption[]> = {
  armour: [
    m('15% increased Armour', { armourPct: 15 }),
    m('Armour also applies to 10% of elemental damage', { armourVsElem: 10 }),
    m('10% less damage taken from boss wind-ups', { slamReduction: 10 }),
  ],
  life: [
    m('8% increased maximum Life', { lifePct: 8 }),
    m('Regenerate 1.5% of Life per second', { lifeRegenPct: 1.5 }),
    m('30% increased Life Flask recovery', { lifeFlaskRecovery: 30 }),
  ],
  phys: [
    m('15% increased Physical Damage', { physPct: 15 }),
    m('25% longer Stuns', { stunDuration: 25 }),
    m('15% more damage against Stunned enemies', { stunnedVuln: 15 }),
  ],
  guard: [
    m('Guard skills also grant 30% increased Armour for 3s', { guardArmourPct: 30 }),
    m('25% faster Guard skill Cooldowns', { guardCooldown: 25 }),
    m('Blocking a hit restores 4% of Life', { blockHeal: 4 }),
  ],
  buff: [
    m('10% more damage while a buff skill is active', { buffMore: 10 }),
    m('War Cry restores 8% of Life', { warCryHeal: 8 }),
    m('Buff skills last 3s longer', { buffDurationFlat: 3000 }),
  ],
  bleed: [
    m('Bleeds deal 25% more damage to bosses', { bleedBossMore: 25 }),
    m('Bleeding enemies take 10% more damage', { bleedVuln: 10 }),
    m('Bleeds last 2s longer', { bleedDurationFlat: 2000 }),
  ],
  evasion: [
    m('20% increased Evasion Rating', { evasionPct: 20 }),
    m('Evading a hit restores 3% of Life', { evadeHeal: 3 }),
    m('10% increased Attack Speed for 4s after you evade', { evadeSpeed: 10 }),
  ],
  crit: [
    m('15% increased Critical Strike Chance', { critChancePct: 15 }),
    m('+80 to Accuracy Rating', { accuracy: 80 }),
    m('Crits against full-Life enemies deal 40% more damage', { critFullLife: 40 }),
  ],
  critMulti: [
    m('+20% to Critical Strike Multiplier', { critMulti: 20 }),
    m('25% more damage against enemies below 30% Life', { lowLifeDamage: 25 }),
    m('Critical strikes leech 1.5% of damage as Life', { critLeech: 1.5 }),
  ],
  speed: [
    m('5% increased Attack Speed', { attackSpeedPct: 5 }),
    m('8% increased Attack Speed with Twin Strike and Lacerate', { dexSkillSpeed: 8 }),
    m('Repeats (Multistrike, Spell Echo) deal 15% more damage', { repeatMore: 15 }),
  ],
  poison: [
    m('15% increased Poison Damage', { poisonPct: 15 }),
    m('Poisons last 2s longer', { poisonDurationFlat: 2000 }),
    m('Poisoned enemies deal 8% less damage', { poisonWeaken: 8 }),
  ],
  cooldown: [
    m('Smoke Step lasts 1s longer', { smokeExtra: 1000 }),
    m('15% faster Cooldowns', { cooldownRecovery: 15 }),
    m('After using a guard skill, your next hit deals 30% more damage', { afterGuardDamage: 30 }),
  ],
  fire: [
    m('15% increased Fire Damage', { firePct: 15 }),
    m('Ignites spread to adjacent enemies when the target dies', { igniteSpread: 1 }),
    m('25% longer Ignites', { igniteDuration: 25 }),
  ],
  cold: [
    m('15% increased Cold Damage', { coldPct: 15 }),
    m('25% stronger absorb Shields', { shieldEffect: 25 }),
    m('Cold hits slow enemy attacks by 15% for 3s', { chillOnHit: 15 }),
  ],
  light: [
    m('15% increased Lightning Damage', { lightPct: 15 }),
    m('Chains deal 15% more damage per chain', { chainMore: 15 }),
    m('15% increased Crit Chance with Lightning skills', { lightCrit: 15 }),
  ],
  mana: [
    m('25% increased Mana Regeneration', { manaRegenPct: 25 }),
    m('12% reduced Mana Costs', { manaCostReduction: 12 }),
    m('35% increased Mana Flask recovery', { manaFlaskRecovery: 35 }),
  ],
  cast: [
    m('6% increased Cast Speed', { castSpeedPct: 6 }),
    m('Repeats (Multistrike, Spell Echo) deal 15% more damage', { repeatMore: 15 }),
    m('+20% to Critical Strike Multiplier with Spells', { spellCritMulti: 20 }),
  ],
  flask: [
    m('15% increased Flask Effect', { flaskEffect: 15 }),
    m('25% increased Flask Charges gained', { flaskCharges: 25 }),
    m('Utility Flasks last 30% longer', { utilityFlaskDuration: 30 }),
  ],
  strdex: [
    m('+8 to Strength and Dexterity', { str: 8, dex: 8 }),
    m('15% increased Physical Damage with melee skills', { meleePct: 15 }),
    m('+120 to Accuracy Rating', { accuracy: 120 }),
  ],
  leech: [
    m('+0.8% Life Leech', { lifeLeech: 0.8 }),
    m('+0.5% Life Leech and Regenerate 3 Life per second', { lifeLeech: 0.5, lifeRegen: 3 }),
    m('Overkill damage heals you for 10% of it', { overkillHeal: 10 }),
  ],
  ailment: [
    m('15% increased damage with ailments', { ailmentPct: 15 }),
    m('Ailments last 25% longer', { ailmentDuration: 25 }),
    m('15% more damage against enemies with 2+ ailments', { multiAilmentVuln: 15 }),
  ],
  elemental: [
    m('15% increased Elemental Damage', { elemPct: 15 }),
    m('Gain 8% of Physical damage as extra Lightning', { physAsLight: 8 }),
    m('+10% to all Elemental Resistances', { allRes: 10 }),
  ],
  strint: [
    m('+8 to Strength and Intelligence', { str: 8, int: 8 }),
    m('Regenerate 2 Mana per second', { manaRegenFlat: 2 }),
    m('15% increased Elemental Damage while above 80% Life', { highLifeElem: 15 }),
  ],
  resist: [
    m('+8% to all Elemental Resistances', { allRes: 8 }),
    m('8% reduced elemental damage taken', { elemTakenReduction: 8 }),
    m('Regenerate 4 Life per second', { lifeRegen: 4 }),
  ],
  melee: [
    m('15% increased Physical Damage with melee skills', { meleePct: 15 }),
    m('+35 to maximum Life', { life: 35 }),
    m('+15% chance to Stun on hit', { stunChance: 15 }),
  ],
  block: [
    m('+5% chance to Block hits', { blockChance: 5 }),
    m('Blocking a hit restores 5% of Life', { blockHeal: 5 }),
    m('+100 to Armour', { armour: 100 }),
  ],
  projectile: [
    m('15% increased Projectile Damage', { projectilePct: 15 }),
    m('+90 to Accuracy Rating', { accuracy: 90 }),
    m('+15% to Critical Strike Multiplier with Projectiles', { critMulti: 15 }),
  ],
  accuracy: [
    m('+120 to Accuracy Rating', { accuracy: 120 }),
    m('15% increased Critical Strike Chance', { critChancePct: 15 }),
    m('+15 to Dexterity', { dex: 15 }),
  ],
  es: [
    m('20% increased Energy Shield', { energyShieldPct: 20 }),
    m('35% faster Energy Shield Recharge', { esRechargePct: 35 }),
    m('+35 to maximum Energy Shield', { energyShield: 35 }),
  ],
  spell: [
    m('15% increased Spell Damage', { spellPct: 15 }),
    m('6% increased Cast Speed', { castSpeedPct: 6 }),
    m('+20% to Critical Strike Multiplier with Spells', { spellCritMulti: 20 }),
  ],
  rarity: [
    m('15% increased Item Rarity', { itemRarity: 15 }),
    m('25% increased Flask Charges gained', { flaskCharges: 25 }),
    m('+8 to all Attributes', { allAttr: 8 }),
  ],
  rage: [
    m('+8 to maximum Rage', { rageMax: 8 }),
    m('Rage decays 50% slower', { rageDecay: 50 }),
    m('15% increased Physical Damage', { physPct: 15 }),
  ],
  riposte: [
    m('Ripostes deal 30% increased damage', { ripostePct: 30 }),
    m('Riposte recovers 30% faster', { riposteCooldown: 30 }),
    m('+3% chance to Block hits', { blockChance: 3 }),
  ],
  momentum: [
    m('+3 to maximum Momentum', { momentumMax: 3 }),
    m('Taking a hit removes 1 less Momentum', { momentumRetain: 1 }),
    m('6% increased Attack Speed', { attackSpeedPct: 6 }),
  ],
  malice: [
    m('Malice meter is 2 smaller', { maliceMax: -2 }),
    m('35% increased Coup de Grâce damage', { coupPct: 35 }),
    m('15% increased Critical Strike Chance', { critChancePct: 15 }),
  ],
  manaPower: [
    m('+8% to the Mana is Power bonus', { manaPower: 8 }),
    m('Recent Mana spending counts 8% more toward Mana is Power', { manaPowerFull: 8 }),
    m('+40 to maximum Mana', { mana: 40 }),
  ],
  martyr: [
    m('Fervor fills 15% faster', { fervorPct: 15 }),
    m('The holy nova deals 35% increased damage', { novaPct: 35 }),
    m('+8% to all Elemental Resistances', { allRes: 8 }),
  ],
  crafting: [
    m('+2% Elemental Damage per socketed Rune in equipped gear', { runicConductor: 1 }),
    m('Chest armor base defense value increased by 50%', { heavyArmorer: 1 }),
    m('Ring and Amulet implicit modifiers are 40% stronger', { jeweledHorizon: 1 }),
  ],
  defiance: [
    m('While on Low Life (<35%), take 25% less damage from all hits', { defianceLowLife: 1 }),
    m('20% of damage taken is recouped as Life over 4 seconds', { recoupPct: 20 }),
    m('50% of Elemental damage taken as Chaos damage', { divineFlesh: 1 }),
  ],
};

type MasteryTheme = keyof typeof MASTERIES;
type Shape = 'line' | 'fork' | 'wheel';
type Port = 'entry' | 'out' | 'left' | 'right';

export interface ClusterSpec {
  id: string;
  small: [string, StatMap];
  notables: [string, StatMap][];
  mastery: MasteryTheme;
}

export interface KeystoneSpec {
  name: string;
  stats: StatMap;
  desc: string;
}

export const RIM_RADIUS = 3800;
export const EXILE_START = 'class_exile';

export const CROSSING: [string, StatMap][] = [
  ["Castaway's Grit", { life: 20, allRes: 4 }],
  ['Salt and Steel', { physPct: 12, accuracy: 30 }],
  ['Tidecaller', { elemPct: 12, evasionPct: 6 }],
  ['Scavenger', { itemRarity: 10, flaskCharges: 10 }],
  ['Driftwood Wisdom', { mana: 20, manaRegenPct: 10 }],
  ['Jack of All Trades', { allAttr: 8 }],
];

// ---------- 12 Celestial Forbidden Keystones ----------

export const FORBIDDEN: (KeystoneSpec & { id: string; angle: number })[] = [
  { id: 'forbidden_overclock', angle: 0, name: 'Overclock', stats: { overclock: 1 }, desc: 'Your skills cost nothing and their cooldowns drop to the 0.1s minimum. Every 8 seconds of fighting you overheat and cannot act for 2 seconds.' },
  { id: 'forbidden_knifes_edge', angle: 30, name: "Knife's Edge", stats: { knifesEdge: 1 }, desc: 'Your hits cannot be evaded and are always Mega Crits (400% damage, ignores critical multiplier). Your maximum Life is 1.' },
  { id: 'forbidden_eternal_hunger', angle: 60, name: 'Eternal Hunger', stats: { eternalHunger: 1 }, desc: 'You cannot die while your Hunger is fed. Every kill feeds it for 5 seconds. If it starves while enemies are near, you die.' },
  { id: 'forbidden_chaos_inoculation', angle: 90, name: 'Chaos Inoculation', stats: { chaosInoculation: 1 }, desc: 'Immune to Chaos Damage. Maximum Life is 1. +100% More Maximum Energy Shield. Monster kills instantly recover 10% of Energy Shield.' },
  { id: 'forbidden_abyssal_pact', angle: 120, name: 'Abyssal Pact', stats: { abyssalPact: 1 }, desc: 'All Elemental Damage is converted to Chaos Damage. Chaos damage bypasses monster shields and applies Wither. You take 10% of damage dealt as self-inflicted Chaos bleed over 3s.' },
  { id: 'forbidden_blood_gods_frenzy', angle: 150, name: "Blood God's Frenzy", stats: { bloodGodsFrenzy: 1 }, desc: 'Deal up to +200% More Damage the lower your Life is. Below 20% Life, gain +100% Attack/Cast Speed and instant Life Leech. Cannot drink Life Flasks; lose 5% Life/s in combat.' },
  { id: 'forbidden_iron_reflexes', angle: 180, name: 'Iron Reflexes', stats: { ironReflexes: 1 }, desc: 'All Evasion Rating is converted to Armour at 1.5x. Enemies that hit you suffer 50% reflected Physical Damage. Immune to Critical Strikes. You cannot Evade.' },
  { id: 'forbidden_glancing_blows', angle: 210, name: 'Glancing Blows', stats: { glancingBlows: 1 }, desc: 'Chance to Block Attacks and Spells is doubled. Maximum Block Chance is raised to 90%. Blocked hits deal 65% damage to you.' },
  { id: 'forbidden_soul_tether', angle: 240, name: 'Soul Tether', stats: { soulTether: 1 }, desc: '50% of all damage you take from any source is instantly inflicted directly onto the current monster as True Damage. Monsters gain +50% Attack and Cast Speed against you.' },
  { id: 'forbidden_anarchists_gambit', angle: 270, name: "Anarchist's Gambit", stats: { anarchistsGambit: 1 }, desc: '30% chance on hit to trigger Elemental Cataclysm (500% area burst of random element + Freeze, Shock, and Ignite). Skills cost 100% more Mana; enemy crits stun you for 1s.' },
  { id: 'forbidden_deaths_door', angle: 300, name: "Death's Door", stats: { deathsDoor: 1 }, desc: 'Instant Cull on any enemy below 30% Life! Bosses and rare foes drop +50% loot and double Gold. Enemies above 70% Life take 35% less damage and deal 20% more damage.' },
  { id: 'forbidden_echoes_of_the_void', angle: 330, name: 'Echoes of the Void', stats: { echoesOfTheVoid: 1 }, desc: 'Every attack and spell repeats a second time instantly at 80% effectiveness. You have 0 Armour and 0 Energy Shield.' },
];

// ---------- 3 Paired Cosmic Gateways (PoE Style) ----------

export const GATEWAYS = [
  { id: 'gateway_solar', pairId: 'gateway_lunar', name: 'Cosmic Gateway: Solar', angle: -90, r: 3300, stat: 'gatewaySolar' as StatKey },
  { id: 'gateway_lunar', pairId: 'gateway_solar', name: 'Cosmic Gateway: Lunar', angle: 90, r: 3300, stat: 'gatewayLunar' as StatKey },
  { id: 'gateway_astral', pairId: 'gateway_void', name: 'Cosmic Gateway: Astral', angle: -30, r: 3300, stat: 'gatewayAstral' as StatKey },
  { id: 'gateway_void', pairId: 'gateway_astral', name: 'Cosmic Gateway: Void', angle: 150, r: 3300, stat: 'gatewayVoid' as StatKey },
  { id: 'gateway_primal', pairId: 'gateway_divine', name: 'Cosmic Gateway: Primal', angle: 30, r: 3300, stat: 'gatewayPrimal' as StatKey },
  { id: 'gateway_divine', pairId: 'gateway_primal', name: 'Cosmic Gateway: Divine', angle: 210, r: 3300, stat: 'gatewayDivine' as StatKey },
];

// ---------- 6 Doomed Gates (5 Passive Points) ----------

export const DOOMED: (KeystoneSpec & { id: string; sec: ClassRegion; angle: number; r: number; debuff: string })[] = [
  { id: 'doomed_blood_toll', sec: 'str', angle: -90, r: 4780, name: 'Gate of the Blood Toll', stats: { doomedBloodToll: 1 }, debuff: '-25% Maximum Life', desc: '-25% Maximum Life. Unlocks the Colossus Juggernaut Wheel.' },
  { id: 'doomed_brittle_bones', sec: 'duelist', angle: -30, r: 4780, name: 'Gate of Brittle Bones', stats: { doomedBrittleBones: 1 }, debuff: 'Take 20% increased Physical Damage', desc: 'Take 20% increased Physical Damage. Unlocks the Master of Blades Wheel.' },
  { id: 'doomed_glass_veil', sec: 'dex', angle: 30, r: 4780, name: 'Gate of Glass Veil', stats: { doomedGlassVeil: 1 }, debuff: 'Armour is set to 0', desc: 'Armour is set to 0. Unlocks the Phantom Mirage Wheel.' },
  { id: 'doomed_withered_veins', sec: 'shadow', angle: 90, r: 4780, name: 'Gate of Withered Veins', stats: { doomedWitheredVeins: 1 }, debuff: 'Flasks recover 0 Life or Mana', desc: 'Flasks recover 0 Life or Mana. Unlocks the Toxic Apotheosis Wheel.' },
  { id: 'doomed_shattered_mind', sec: 'int', angle: 150, r: 4780, name: 'Gate of the Shattered Mind', stats: { doomedShatteredMind: 1 }, debuff: 'Skills cost 100% more Mana', desc: 'Skills cost 100% more Mana. Unlocks the Absolute Zero Wheel.' },
  { id: 'doomed_broken_covenant', sec: 'templar', angle: 210, r: 4780, name: 'Gate of Broken Covenant', stats: { doomedBrokenCovenant: 1 }, debuff: '-30% All Elemental Resistances', desc: '-30% All Elemental Resistances. Unlocks the Divine Bastion Wheel.' },
];

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (r: number, deg: number) => ({ x: Math.round(r * Math.cos(rad(deg))), y: Math.round(r * Math.sin(rad(deg))) });

// Expanded Slots with well-spaced radial rings
type SlotId =
  | 'I' | 'A' | 'B' | 'A1' | 'B1' | 'I1'
  | 'C' | 'D' | 'E' | 'C1' | 'D1' | 'E1'
  | 'F' | 'G' | 'H' | 'F1' | 'G1' | 'H1'
  | 'J' | 'K' | 'L' | 'M' | 'J1' | 'K1' | 'L1' | 'M1'
  | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6'
  | 'P1' | 'P2' | 'P3' | 'P4'
  | 'S1' | 'S2' | 'S3' | 'S4'
  | 'DG1' | 'DG2';

const SLOTS: Record<SlotId, { shape: Shape; r: number; a: number }> = {
  // Band 1: Inner (r=950..1250)
  A: { shape: 'line', r: 950, a: -18 },
  B: { shape: 'line', r: 950, a: 18 },
  I: { shape: 'wheel', r: 1000, a: 0 },
  A1: { shape: 'fork', r: 1250, a: -16 },
  B1: { shape: 'fork', r: 1250, a: 16 },
  I1: { shape: 'fork', r: 1280, a: 0 },

  // Band 2: Mid-Inner (r=1550..1850)
  C: { shape: 'wheel', r: 1550, a: -18 },
  D: { shape: 'fork', r: 1560, a: 0 },
  E: { shape: 'wheel', r: 1550, a: 18 },
  C1: { shape: 'fork', r: 1850, a: -22 },
  D1: { shape: 'wheel', r: 1860, a: 0 },
  E1: { shape: 'fork', r: 1850, a: 22 },

  // Band 3: Mid (r=2150..2460)
  F: { shape: 'fork', r: 2150, a: -20 },
  G: { shape: 'fork', r: 2160, a: 0 },
  H: { shape: 'fork', r: 2150, a: 20 },
  F1: { shape: 'fork', r: 2460, a: -17 },
  G1: { shape: 'wheel', r: 2460, a: 0 },
  H1: { shape: 'fork', r: 2460, a: 17 },

  // Band 4: Mid-Outer (r=2750..3100)
  J: { shape: 'line', r: 2750, a: -10 },
  K: { shape: 'line', r: 2750, a: 10 },
  L: { shape: 'wheel', r: 2800, a: -22 },
  M: { shape: 'wheel', r: 2800, a: 22 },
  J1: { shape: 'fork', r: 3100, a: -10 },
  K1: { shape: 'fork', r: 3100, a: 10 },
  L1: { shape: 'fork', r: 3150, a: -24 },
  M1: { shape: 'fork', r: 3150, a: 24 },

  // Band 5: Rim (r=3450..3850)
  R1: { shape: 'wheel', r: 3820, a: -9 },
  R2: { shape: 'fork', r: 3820, a: 9 },
  R3: { shape: 'fork', r: 3500, a: -18 },
  R4: { shape: 'fork', r: 3500, a: 18 },
  R5: { shape: 'wheel', r: 3820, a: -18 },
  R6: { shape: 'wheel', r: 3820, a: 18 },

  // Band 5.5: Specialized Archetype Wheels (r=4100)
  P1: { shape: 'wheel', r: 4100, a: -24 },
  P2: { shape: 'fork', r: 4100, a: -8 },
  P3: { shape: 'fork', r: 4100, a: 8 },
  P4: { shape: 'wheel', r: 4100, a: 24 },

  // Band 6: Outer God-Tier (r=4450..4580)
  S1: { shape: 'wheel', r: 4450, a: -18 },
  S2: { shape: 'wheel', r: 4450, a: 18 },
  S3: { shape: 'fork', r: 4560, a: -8 },
  S4: { shape: 'fork', r: 4560, a: 8 },

  // Band 7: Doomed Gated Clusters (r=5020)
  DG1: { shape: 'wheel', r: 5020, a: -6.5 },
  DG2: { shape: 'wheel', r: 5020, a: 6.5 },
};

const TRAVEL_SPACING = 225;

type End = `${SlotId}.${Port}` | 'hub' | 'ks0' | 'ks1' | 'ksm' | 'doomed';

const BRIDGES: [End, End][] = [
  ['B.out', 'A.out'],
];

interface SectorSpec {
  key: ClassRegion;
  angle: number;
  startName: string;
  start: string;
  travel: StatMap;
  clusters: Record<SlotId, ClusterSpec>;
  keystones: { ks0: KeystoneSpec; ks1: KeystoneSpec; ksm: KeystoneSpec };
  keystoneIds?: Partial<Record<'ks0' | 'ks1' | 'ksm', string>>;
}

const c = (id: string, mastery: MasteryTheme, small: [string, StatMap], ...notables: [string, StatMap][]): ClusterSpec => ({ id, mastery, small, notables });

const makeSectorClusters = (secKey: string, travel: StatMap): Record<SlotId, ClusterSpec> => ({
  I: c(`${secKey}_I`, 'melee', ['Combat Stance', { ...travel, life: 6 }], ['Battle Focus', { lifePct: 6, physPct: 15 }], ['Cleaving Force', { meleePct: 15, stunChance: 5 }], ['Second Wind', { lifeFlaskRecovery: 20, life: 15 }]),
  A: c(`${secKey}_A`, 'armour', ['Hardened Guard', { armourPct: 12 }], ['Iron Wall', { armourPct: 30, armour: 40 }]),
  B: c(`${secKey}_B`, 'life', ['Vital Essence', { life: 8 }], ['Bloodline', { lifePct: 8, lifeRegen: 1.5 }]),
  A1: c(`${secKey}_A1`, 'defiance', ['Vigilance', { allRes: 4 }], ['Defiant Roar', { defianceLowLife: 1, armourPct: 20 }], ['Last Stand', { lifePct: 8, armour: 60 }]),
  B1: c(`${secKey}_B1`, 'leech', ['Vampiric Thirst', { lifeLeech: 0.3 }], ['Siphon Life', { lifeLeech: 0.8, life: 25 }], ['Vital Flow', { lifeLeech: 0.5, lifeRegen: 2 }]),
  I1: c(`${secKey}_I1`, 'speed', ['Swift Momentum', { attackSpeedPct: 3 }], ['Lightning Reflexes', { attackSpeedPct: 8, moveSpeedPct: 4 }], ['Celerity', { castSpeedPct: 6, attackSpeedPct: 6 }]),

  C: c(`${secKey}_C`, 'phys', ['Might', { physPct: 8 }], ['Brute Force', { physPct: 25, stunChance: 10 }], ['Crushing Blows', { stunDuration: 30, stunnedVuln: 10 }], ['Heavy Hands', { physMin: 2, physMax: 4 }]),
  D: c(`${secKey}_D`, 'buff', ['Command', { skillDuration: 6 }], ['Warlord', { skillDuration: 30, cooldownRecovery: 10 }], ['Battle Cry', { buffMore: 5, warCryHeal: 5 }]),
  E: c(`${secKey}_E`, 'guard', ['Bulwark', { armourPct: 6, life: 4 }], ['Unyielding', { extraBlocks: 1 }], ['Shield Wall', { blockChance: 4, armour: 60 }], ['Stalwart', { guardDuration: 20, blockHeal: 2 }]),
  C1: c(`${secKey}_C1`, 'crafting', ['Runic Insight', { allAttr: 4 }], ['Runic Conductor', { runicConductor: 1, allRes: 6 }], ['Master Artisan', { masterArtisan: 1, life: 25 }]),
  D1: c(`${secKey}_D1`, 'elemental', ['Prismatic Spark', { elemPct: 8 }], ['Conflux', { elemPct: 20, allRes: 5 }], ['Overcharge', { physAsLight: 8, elemPct: 15 }], ['Elemental Aegis', { elemTakenReduction: 5, allRes: 5 }]),
  E1: c(`${secKey}_E1`, 'block', ['Shield Arm', { blockChance: 2 }], ['Gladiator Wall', { blockChance: 5, blockHeal: 3 }], ['Shield Master', { blockChance: 4, armour: 80 }]),

  F: c(`${secKey}_F`, 'bleed', ['Laceration', { bleedPct: 10 }], ['Butcher', { bleedPct: 30, bleedDuration: 20 }], ['Rend', { bleedOnHit: 15, bleedVuln: 5 }]),
  G: c(`${secKey}_G`, 'armour', ['Ironclad', { armour: 20, life: 4 }], ['Ironclad', { armourPct: 25, slamReduction: 6 }], ['Grit', { lifePct: 6, allRes: 4 }]),
  H: c(`${secKey}_H`, 'life', ['Juggernaut', { life: 6, lifeRegen: 0.5 }], ['Juggernaut', { lifePct: 10, slamReduction: 8 }], ['Unstoppable', { lifeRegenPct: 0.4, stunChance: 5 }]),
  F1: c(`${secKey}_F1`, 'poison', ['Venomous Touch', { poisonPct: 10 }], ['Toxic Vector', { poisonPct: 25, poisonDuration: 20 }], ['Festering Wound', { poisonWeaken: 8, ailmentPct: 12 }]),
  G1: c(`${secKey}_G1`, 'flask', ['Alchemical Draught', { flaskEffect: 6 }], ['Alchemical Catalyst', { alchemicalCatalyst: 1, flaskEffect: 15 }], ['Master Brewer', { flaskCharges: 25, utilityFlaskDuration: 20 }], ['Overflowing Vial', { lifeFlaskRecovery: 25, manaFlaskRecovery: 25 }]),
  H1: c(`${secKey}_H1`, 'cold', ['Frostbite', { coldPct: 10 }], ['Cryo-Shatter', { cryoShatter: 1, coldPct: 25 }], ['Glacial Bulwark', { glacialBulwark: 1, shieldEffect: 20 }]),

  J: c(`${secKey}_J`, 'melee', ["Titan's Grip", { meleePct: 8 }], ["Titan's Grip", { meleePct: 25, physMax: 3 }]),
  K: c(`${secKey}_K`, 'resist', ['Endurance', { allRes: 3 }], ['Iron Will', { allRes: 10, armourVsElem: 5 }]),
  L: c(`${secKey}_L`, 'phys', ['Brawn', { str: 6 }], ['Colossus', { str: 20, lifePct: 5 }], ['Might of the Mountain', { armourPct: 20, physPct: 10 }], ['Earthshaker', { stunChance: 10, meleePct: 15 }]),
  M: c(`${secKey}_M`, 'leech', ['Thirst', { lifeLeech: 0.2 }], ['Bloodsoaked', { lifeLeech: 0.8, life: 20 }], ['Gorge', { overkillHeal: 5, lifePct: 4 }], ['Crimson Tide', { bleedPct: 20, lifeLeech: 0.3 }]),
  J1: c(`${secKey}_J1`, 'crit', ['Precision Strike', { critChancePct: 8 }], ['Fatal Impact', { critChancePct: 25, critMulti: 15 }], ['Hawk Eye', { accuracy: 100, critChancePct: 15 }]),
  K1: c(`${secKey}_K1`, 'critMulti', ['Lethal Focus', { critMulti: 8 }], ['Merciless Edge', { critMulti: 25, lowLifeDamage: 15 }], ['Execution', { lowLifeDamage: 25, critMulti: 15 }]),
  L1: c(`${secKey}_L1`, 'fire', ['Kindled Spark', { firePct: 10 }], ['Conflagration', { firePct: 25, igniteSpread: 1 }], ['Searing Heat', { ignitePct: 30, firePct: 15 }]),
  M1: c(`${secKey}_M1`, 'light', ['Static Charge', { lightPct: 10 }], ['Supercharge', { lightPct: 25, chainMore: 10 }], ['Arcing Storm', { extraChains: 1, lightCrit: 15 }]),

  R1: c(`${secKey}_R1`, 'phys', ['Heavy Blows', { physPct: 12, stunChance: 3 }], ['Bonebreaker', { physPct: 30, stunChance: 12 }], ['Crushing Weight', { stunnedVuln: 15, stunDuration: 30 }], ['Measured Force', { physMin: 3, physMax: 6 }]),
  R2: c(`${secKey}_R2`, 'guard', ['Braced', { armourPct: 10, life: 6 }], ['Holdfast', { blockChance: 5, armourPct: 18 }], ['Lasting Guard', { guardDuration: 25, guardCooldown: 10 }]),
  R3: c(`${secKey}_R3`, 'es', ['Arcane Veil', { energyShieldPct: 8 }], ['Soul Barrier', { energyShieldPct: 25, esRechargePct: 25 }], ['Aegis Ward', { aegisWard: 1, energyShield: 35 }]),
  R4: c(`${secKey}_R4`, 'spell', ['Sorcerous Might', { spellPct: 10 }], ['Spellwright', { spellPct: 30, castSpeedPct: 6 }], ['Arcane Precision', { spellCritMulti: 25, spellPct: 15 }]),
  R5: c(`${secKey}_R5`, 'projectile', ['Deadeye Mark', { projectilePct: 10 }], ['Piercing Volley', { projectilePct: 30, extraChains: 1 }], ['Sniper Nest', { projectilePct: 25, critMulti: 18 }], ['Eagle Sight', { accuracy: 120, critChancePct: 20 }]),
  R6: c(`${secKey}_R6`, 'accuracy', ['Flawless Aim', { accuracy: 40 }], ['True Strike', { accuracy: 120, critChancePct: 20 }], ['Deadly Range', { critMulti: 20, accuracy: 80 }], ['Targeting Array', { dexSkillSpeed: 8, projectilePct: 20 }]),

  P1: c(`${secKey}_P1`, 'cold', ['Glacial Shard', { coldPct: 12 }], ['Permafrost', { coldPct: 30, chillOnHit: 20 }], ['Hypothermic Surge', { critChancePct: 25, critMulti: 20 }], ['Absolute Bulwark', { shieldEffect: 30, energyShield: 40 }]),
  P2: c(`${secKey}_P2`, 'bleed', ['Crimson Strike', { bleedPct: 12 }], ['Crimson Dance', { bleedPct: 35, bleedBossMore: 25 }], ['Exsanguinate', { bleedDuration: 30, physPct: 15 }]),
  P3: c(`${secKey}_P3`, 'fire', ['Molten Surge', { firePct: 12 }], ['Cauterize', { firePct: 35, ignitePct: 40 }], ['Thermal Shock', { elemPct: 20, igniteDuration: 30 }]),
  P4: c(`${secKey}_P4`, 'light', ['Conductive Current', { lightPct: 12 }], ['Arcing Nova', { lightPct: 35, extraChains: 1 }], ['Voltsurge', { lightCrit: 25, chainMore: 15 }], ['Storm Shield', { extraBlocks: 1, energyShield: 35 }]),

  S1: c(`${secKey}_S1`, 'defiance', ['Unyielding Will', { lifePct: 8 }], ['Ghost Dance', { ghostDance: 1, evasionPct: 30 }], ['Divine Flesh', { divineFlesh: 1, allRes: 8 }], ['Recouping Life', { recoupPct: 25, lifeRegenPct: 1 }]),
  S2: c(`${secKey}_S2`, 'crafting', ['Artisan Masterwork', { allAttr: 6 }], ['Heavy Armorer', { heavyArmorer: 1, armourPct: 25 }], ['Jeweled Horizon', { jeweledHorizon: 1, allRes: 8 }], ['Perfection', { masterArtisan: 1, allAttr: 10 }]),
  S3: c(`${secKey}_S3`, 'melee', ['Titanic Force', { meleePct: 12 }], ['Cataclysmic Strike', { meleePct: 35, stunChance: 15 }], ['Overwhelming Power', { physMin: 5, physMax: 12 }]),
  S4: c(`${secKey}_S4`, 'spell', ['Arcane Ascension', { spellPct: 12 }], ['Archmage', { spellPct: 35, manaPct: 15 }], ['Spell Cataclysm', { spellCritMulti: 30, castSpeedPct: 8 }]),

  DG1: c(`${secKey}_DG1`, 'melee', ['God-Tier Power', { physPct: 20, lifePct: 10 }], ['Apotheosis of Strength', { physPct: 50, meleePct: 40 }], ['Earth Shatterer', { stunChance: 25, stunnedVuln: 25 }], ['Immovable Object', { armourPct: 50, slamReduction: 20 }]),
  DG2: c(`${secKey}_DG2`, 'spell', ['God-Tier Sorcery', { elemPct: 20, manaPct: 10 }], ['Apotheosis of Elements', { elemPct: 50, spellPct: 40 }], ['Absolute Domination', { extraChains: 2, repeatMore: 25 }], ['Unshakable Ward', { energyShieldPct: 50, shieldEffect: 40 }]),
});

function build(): PassiveNode[] {
  const nodes: Record<string, PassiveNode> = {};
  const add = (n: Omit<PassiveNode, 'links' | 'stats'> & { stats?: StatMap }) => (nodes[n.id] = { stats: {}, ...n, links: [] });
  const link = (a: string, b: string) => {
    if (!nodes[a] || !nodes[b]) return;
    if (!nodes[a].links.includes(b)) nodes[a].links.push(b);
    if (!nodes[b].links.includes(a)) nodes[b].links.push(a);
  };

  const path = (a: string, b: string, region: TreeRegion, stats: StatMap, kind: 'travel' | 'highway' = 'travel', spacing = TRAVEL_SPACING) => {
    const A = nodes[a];
    const B = nodes[b];
    if (!A || !B) return;
    const dist = Math.hypot(B.x - A.x, B.y - A.y);
    const steps = Math.max(1, Math.ceil(dist / spacing));
    let prev = a;
    for (let i = 1; i < steps; i++) {
      const f = i / steps;
      let nx = Math.round(A.x + (B.x - A.x) * f);
      let ny = Math.round(A.y + (B.y - A.y) * f);

      // Check distance to existing nodes to prevent overlapping
      const close = Object.values(nodes).find((other) => Math.hypot(other.x - nx, other.y - ny) < 36);
      if (close) {
        if (close.kind === 'travel' || close.kind === 'highway') {
          link(prev, close.id);
          prev = close.id;
          continue;
        } else {
          // Nudge perpendicular to path vector
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const len = Math.hypot(dx, dy) || 1;
          nx += Math.round((-dy / len) * 44);
          ny += Math.round((dx / len) * 44);
        }
      }

      const id = `t_${a}_${b}_${i}`;
      if (nodes[id]) {
        link(prev, id);
        prev = id;
        continue;
      }
      add({
        id,
        name: kind === 'highway' ? 'Arterial Highway' : 'Attribute',
        kind,
        region,
        x: nx,
        y: ny,
        stats,
      });
      link(prev, id);
      prev = id;
    }
    link(prev, b);
  };

  const cluster = (region: TreeRegion, spec: ClusterSpec, shape: Shape, r: number, angle: number, side: number): Record<Port, string> => {
    const { x: cx, y: cy } = polar(r, angle);
    const u = { x: Math.cos(rad(angle)), y: Math.sin(rad(angle)) };
    const v = { x: -u.y, y: u.x };
    const at = (du: number, dv: number) => ({ x: Math.round(cx + u.x * du + v.x * dv), y: Math.round(cy + u.y * du + v.y * dv) });
    const base = { region, cluster: spec.id };
    let si = 0;
    let ni = 0;
    const node = (kind: 'small' | 'notable', p: { x: number; y: number }) => {
      if (kind === 'small') {
        const id = `${spec.id}_s${++si}`;
        add({ ...base, id, name: spec.small[0], kind, ...p, stats: spec.small[1] });
        return id;
      }
      const notable = spec.notables[ni++] ?? spec.notables[0];
      const id = shape === 'line' ? `${spec.id}_n` : `${spec.id}_n${ni}`;
      add({ ...base, id, name: notable[0], kind, ...p, stats: notable[1] });
      return id;
    };
    const chain = (ids: string[]) => ids.slice(1).forEach((id, i) => link(ids[i], id));
    const mastery = (p: { x: number; y: number }, notable: string) => {
      const id = `${spec.id}_m`;
      add({
        ...base,
        id,
        name: `${spec.notables[0]?.[0] ?? spec.id} Mastery`,
        kind: 'mastery',
        ...p,
        options: MASTERIES[spec.mastery] ?? MASTERIES.life,
      });
      link(notable, id);
    };

    if (shape === 'line') {
      const ids = [-60, 0].map((du) => node('small', at(du, 0)));
      const n = node('notable', at(65, 0));
      chain([...ids, n]);
      mastery(at(45, 50 * side), n);
      return { entry: ids[0], out: n, left: n, right: n };
    }
    if (shape === 'fork') {
      const entry = node('small', at(-65, 0));
      const arm = (s: number) => {
        const a = [node('small', at(0, 45 * s))];
        const n = node('notable', at(65, 70 * s));
        chain([entry, ...a, n]);
        return n;
      };
      const left = arm(-1);
      const right = arm(1);
      mastery(at(45, 0), left);
      return { entry, out: right, left, right };
    }

    const ring = Array.from({ length: 7 }, (_, i) => {
      const a = rad(180 + i * (360 / 7));
      return node(i === 2 || i === 4 || i === 5 ? 'notable' : 'small', at(Math.cos(a) * 85, Math.sin(a) * 85));
    });
    chain([...ring, ring[0]]);
    mastery(at(0, 0), ring[2]);
    return { entry: ring[0], left: ring[1], out: ring[3], right: ring[6] };
  };

  // 1. Center & Exile start
  add({ id: EXILE_START, name: 'Exile', kind: 'start', region: 'center', x: 0, y: 0 });

  const SECTOR_DEFS: SectorSpec[] = [
    {
      key: 'str', angle: -90, startName: 'Warrior', start: 'class_str', travel: { str: 4 },
      clusters: makeSectorClusters('str', { str: 10 }),
      keystones: {
        ks0: { name: 'Unbreakable', stats: { armourMore: 60, attackSpeedMore: -15 }, desc: '60% more Armour. 15% less Attack Speed.' },
        ks1: { name: 'Blood Pact', stats: { bloodPact: 1 }, desc: 'Skills cost Life instead of Mana. You have no Mana.' },
        ksm: { name: 'Colossal Frame', stats: { lifePct: 25, attackSpeedMore: -10 }, desc: '25% increased maximum Life. 10% less Attack Speed.' },
      },
    },
    {
      key: 'duelist', angle: -30, startName: 'Duelist', start: 'class_strdex', travel: { str: 2, dex: 2 },
      clusters: makeSectorClusters('duelist', { str: 5, dex: 5 }),
      keystones: {
        ks0: { name: 'Steady Hand', stats: { steadyHand: 1 }, desc: "Your hits always land. You can't deal critical strikes." },
        ks1: { name: 'Blade Waltz', stats: { attackSpeedMore: 15, armourMore: -30 }, desc: '15% more Attack Speed. 30% less Armour.' },
        ksm: { name: 'Dancing Steel', stats: { attackSpeedMore: 20, armourMore: -40 }, desc: '20% more Attack Speed. 40% less Armour.' },
      },
      keystoneIds: { ks0: 'duelist_ks' },
    },
    {
      key: 'dex', angle: 30, startName: 'Ranger', start: 'class_dex', travel: { dex: 4 },
      clusters: makeSectorClusters('dex', { dex: 10 }),
      keystones: {
        ks0: { name: 'Glass Edge', stats: { critMulti: 80, lifeMore: -25 }, desc: '+80% Critical Strike Multiplier. 25% less maximum Life.' },
        ks1: { name: 'Wind Dancer', stats: { windDancer: 1, armourMore: -40 }, desc: 'Evasion can dodge boss wind-ups. 40% less Armour.' },
        ksm: { name: 'One Clean Shot', stats: { projectilePct: 60, lifePct: -15 }, desc: '60% increased Projectile Damage. 15% less maximum Life.' },
      },
    },
    {
      key: 'shadow', angle: 90, startName: 'Shadow', start: 'class_dexint', travel: { dex: 2, int: 2 },
      clusters: makeSectorClusters('shadow', { dex: 5, int: 5 }),
      keystones: {
        ks0: { name: 'Arcane Recursion', stats: { arcaneRecursion: 1 }, desc: 'Cooldowns recover 40% faster. Skills cost 50% more Mana.' },
        ks1: { name: 'Venomous Soul', stats: { ailmentPct: 60, lifeMore: -15 }, desc: '60% increased damage with ailments. 15% less maximum Life.' },
        ksm: { name: 'Venomous Soul', stats: { ailmentPct: 60, lifePct: -15 }, desc: '60% increased damage with ailments. 15% less maximum Life.' },
      },
      keystoneIds: { ks0: 'shadow_ks' },
    },
    {
      key: 'int', angle: 150, startName: 'Mage', start: 'class_int', travel: { int: 4 },
      clusters: makeSectorClusters('int', { int: 10 }),
      keystones: {
        ks0: { name: "Alchemist's Covenant", stats: { flaskEffect: 50, flaskCharges: 50, lifeMore: -10 }, desc: '50% increased Flask Effect and Charges gained. 10% less maximum Life.' },
        ks1: { name: 'Mind over Flesh', stats: { mindOverFlesh: 30 }, desc: '30% of damage is taken from Mana before Life.' },
        ksm: { name: 'Arcane Body', stats: { spellPct: 50, lifePct: -20 }, desc: '50% increased Spell Damage. 20% less maximum Life.' },
      },
    },
    {
      key: 'templar', angle: 210, startName: 'Templar', start: 'class_strint', travel: { int: 2, str: 2 },
      clusters: makeSectorClusters('templar', { int: 5, str: 5 }),
      keystones: {
        ks0: { name: 'Bastion', stats: { bastion: 1 }, desc: 'Your Evasion Rating is converted to Armour.' },
        ks1: { name: 'Sacred Oath', stats: { allRes: 15, attackSpeedMore: -10 }, desc: '+15% to all Elemental Resistances. 10% less Attack Speed.' },
        ksm: { name: 'Unshaken Faith', stats: { allRes: 20, attackSpeedMore: -10 }, desc: '+20% to all Elemental Resistances. 10% less Attack Speed.' },
      },
      keystoneIds: { ks0: 'templar_ks' },
    },
  ];

  // Map legacy cluster IDs so existing tests and profiles resolve cleanly
  SECTOR_DEFS[0].clusters.I.id = 'warpath';
  SECTOR_DEFS[0].clusters.R1.id = 'heavy_arms';
  SECTOR_DEFS[0].clusters.A.id = 'iron_skin';
  SECTOR_DEFS[0].clusters.B.id = 'heart_of_stone';
  SECTOR_DEFS[0].clusters.C.id = 'brute_force';
  SECTOR_DEFS[0].clusters.D.id = 'warlord';
  SECTOR_DEFS[0].clusters.E.id = 'bulwark';
  SECTOR_DEFS[0].clusters.F.id = 'butcher';
  SECTOR_DEFS[0].clusters.G.id = 'ironclad';
  SECTOR_DEFS[0].clusters.R2.id = 'fortress';
  SECTOR_DEFS[0].clusters.H.id = 'juggernaut';
  SECTOR_DEFS[0].clusters.J.id = 'titan';
  SECTOR_DEFS[0].clusters.K.id = 'endurance';
  SECTOR_DEFS[0].clusters.L.id = 'colossus';
  SECTOR_DEFS[0].clusters.M.id = 'bloodsoaked';

  SECTOR_DEFS[1].clusters.I.id = 'footwork';
  SECTOR_DEFS[1].clusters.R1.id = 'weapon_dance';
  SECTOR_DEFS[1].clusters.A.id = 'duelists_edge';
  SECTOR_DEFS[1].clusters.B.id = 'bloodletting';
  SECTOR_DEFS[1].clusters.C.id = 'gladiator';
  SECTOR_DEFS[1].clusters.D.id = 'swordplay';
  SECTOR_DEFS[1].clusters.E.id = 'cutthroat';
  SECTOR_DEFS[1].clusters.F.id = 'brawler';
  SECTOR_DEFS[1].clusters.G.id = 'tempo';
  SECTOR_DEFS[1].clusters.R2.id = 'red_guard';
  SECTOR_DEFS[1].clusters.H.id = 'showman';
  SECTOR_DEFS[1].clusters.J.id = 'steel_nerves';
  SECTOR_DEFS[1].clusters.K.id = 'agility';
  SECTOR_DEFS[1].clusters.L.id = 'warmonger';
  SECTOR_DEFS[1].clusters.M.id = 'guarded_stance';

  SECTOR_DEFS[2].clusters.I.id = 'fletching';
  SECTOR_DEFS[2].clusters.R1.id = 'deadeye';
  SECTOR_DEFS[2].clusters.A.id = 'fleetfoot';
  SECTOR_DEFS[2].clusters.B.id = 'precision';
  SECTOR_DEFS[2].clusters.C.id = 'executioner';
  SECTOR_DEFS[2].clusters.D.id = 'blade_dancer';
  SECTOR_DEFS[2].clusters.E.id = 'toxicologist';
  SECTOR_DEFS[2].clusters.F.id = 'phantom';
  SECTOR_DEFS[2].clusters.G.id = 'fleet';
  SECTOR_DEFS[2].clusters.R2.id = 'windrunner';
  SECTOR_DEFS[2].clusters.H.id = 'marksman';
  SECTOR_DEFS[2].clusters.J.id = 'hunter';
  SECTOR_DEFS[2].clusters.K.id = 'wanderer';
  SECTOR_DEFS[2].clusters.L.id = 'acrobat';
  SECTOR_DEFS[2].clusters.M.id = 'trickster';

  SECTOR_DEFS[3].clusters.I.id = 'killing_intent';
  SECTOR_DEFS[3].clusters.R1.id = 'fatal_design';
  SECTOR_DEFS[3].clusters.A.id = 'saboteur';
  SECTOR_DEFS[3].clusters.B.id = 'spellblade';
  SECTOR_DEFS[3].clusters.C.id = 'assassin';
  SECTOR_DEFS[3].clusters.D.id = 'plaguebearer';
  SECTOR_DEFS[3].clusters.E.id = 'hexblade';
  SECTOR_DEFS[3].clusters.F.id = 'trickery';
  SECTOR_DEFS[3].clusters.G.id = 'venom';
  SECTOR_DEFS[3].clusters.R2.id = 'slow_poison';
  SECTOR_DEFS[3].clusters.H.id = 'infuser';
  SECTOR_DEFS[3].clusters.J.id = 'nightstalker';
  SECTOR_DEFS[3].clusters.K.id = 'ignition';
  SECTOR_DEFS[3].clusters.L.id = 'cutpurse';
  SECTOR_DEFS[3].clusters.M.id = 'hexer';

  SECTOR_DEFS[4].clusters.I.id = 'arcana';
  SECTOR_DEFS[4].clusters.R1.id = 'high_sorcery';
  SECTOR_DEFS[4].clusters.A.id = 'pyromancer';
  SECTOR_DEFS[4].clusters.B.id = 'frostweaver';
  SECTOR_DEFS[4].clusters.C.id = 'stormcaller';
  SECTOR_DEFS[4].clusters.D.id = 'arcane_flow';
  SECTOR_DEFS[4].clusters.E.id = 'spellweaver';
  SECTOR_DEFS[4].clusters.F.id = 'distiller';
  SECTOR_DEFS[4].clusters.G.id = 'aegis';
  SECTOR_DEFS[4].clusters.R2.id = 'arcane_battery';
  SECTOR_DEFS[4].clusters.H.id = 'eldritch';
  SECTOR_DEFS[4].clusters.J.id = 'elementalist';
  SECTOR_DEFS[4].clusters.K.id = 'sage';
  SECTOR_DEFS[4].clusters.L.id = 'conjurer';
  SECTOR_DEFS[4].clusters.M.id = 'pyre';

  SECTOR_DEFS[5].clusters.I.id = 'devotion';
  SECTOR_DEFS[5].clusters.R1.id = 'consecrated_path';
  SECTOR_DEFS[5].clusters.A.id = 'zealot';
  SECTOR_DEFS[5].clusters.B.id = 'warding';
  SECTOR_DEFS[5].clusters.C.id = 'inquisitor';
  SECTOR_DEFS[5].clusters.D.id = 'guardian';
  SECTOR_DEFS[5].clusters.E.id = 'hierophant';
  SECTOR_DEFS[5].clusters.F.id = 'crusader';
  SECTOR_DEFS[5].clusters.G.id = 'faith';
  SECTOR_DEFS[5].clusters.R2.id = 'sanctuary';
  SECTOR_DEFS[5].clusters.H.id = 'purity';
  SECTOR_DEFS[5].clusters.J.id = 'consecrated';
  SECTOR_DEFS[5].clusters.K.id = 'oathkeeper';
  SECTOR_DEFS[5].clusters.L.id = 'benediction';
  SECTOR_DEFS[5].clusters.M.id = 'stormfaith';

  // Ring 1: Central Crossing Ring (r=260)
  const ringIds = SECTOR_DEFS.map((sec, i) => {
    const id = `crossing_${sec.key}`;
    add({ id, name: "Exile's Crossing", kind: 'travel', region: 'center', ...polar(260, sec.angle), stats: { allAttr: 2 } });
    const nid = `crossing_n${i}`;
    add({ id: nid, name: CROSSING[i][0], kind: 'notable', region: 'center', ...polar(260, sec.angle + 30), stats: CROSSING[i][1] });
    return [id, nid];
  });
  ringIds.forEach(([id, nid], i) => {
    link(id, nid);
    link(nid, ringIds[(i + 1) % ringIds.length][0]);
    link(EXILE_START, id);
  });

  const ports: Record<string, Record<string, string>> = {};
  for (const sec of SECTOR_DEFS) {
    add({ id: sec.start, name: sec.startName, kind: 'start', region: sec.key, ...polar(450, sec.angle) });
    const hub = `${sec.key}_hub`;
    add({ id: hub, name: 'Attribute', kind: 'travel', region: sec.key, ...polar(580, sec.angle), stats: sec.travel });
    link(sec.start, hub);
    path(sec.start, `crossing_${sec.key}`, sec.key, sec.travel, 'travel', 150);

    const p: Record<string, string> = { hub };
    for (const [slot, def] of Object.entries(SLOTS) as [SlotId, (typeof SLOTS)[SlotId]][]) {
      const clSpec = sec.clusters[slot];
      if (!clSpec) continue;
      const got = cluster(sec.key, clSpec, def.shape, def.r, sec.angle + def.a, -Math.sign(def.a) || 1);
      for (const [port, id] of Object.entries(got)) p[`${slot}.${port}`] = id;
    }

    // Keystones (flanking the central corridor at r=3440, and apex at r=4520)
    const KS_AT = { ks0: [3440, -7], ks1: [3440, 7], ksm: [4520, 0] } as const;
    for (const k of ['ks0', 'ks1', 'ksm'] as const) {
      const ks = sec.keystones[k];
      const id = sec.keystoneIds?.[k] ?? `${sec.key}_${k}`;
      add({
        id, name: ks.name, kind: 'keystone', region: sec.key, ...polar(KS_AT[k][0], sec.angle + KS_AT[k][1]),
        stats: ks.stats, desc: ks.desc,
      });
      p[k] = id;
    }

    // Doomed Gate per sector
    const doomedSpec = DOOMED.find((d) => d.sec === sec.key)!;
    add({
      id: doomedSpec.id,
      name: doomedSpec.name,
      kind: 'doomed',
      region: sec.key,
      ...polar(doomedSpec.r, doomedSpec.angle),
      stats: doomedSpec.stats,
      desc: doomedSpec.desc,
    });
    p.doomed = doomedSpec.id;

    // --- TWIN RADIAL ARTERIAL HIGHWAYS ---
    // In Bands 1-3 (r=760..2310), avenues run at a = ±8°..12° between the a=0° center clusters and ±16°..22° wing clusters.
    // In Bands 4-6 (r=2535..4600), avenues run at a = ±14°..15° between the ±8°..10° inner clusters and ±18°..24° outer clusters.
    const HW_STOPS: [number, number][] = [
      [765, 5],     // 0: approach from hub
      [950, 8],     // 1: Band 1a (A, B, I)
      [1260, 8],    // 2: Band 1b (A1, B1, I1)
      [1550, 8],    // 3: Band 2a (C, D, E)
      [1850, 9],    // 4: Band 2b (C1, D1, E1)
      [2140, 10],   // 5: Band 3a (F, G, H)
      [2310, 12],   // 6: Ring 2 Mid Concourse intersection (F1, G1, H1)
      [2535, 13.5], // 7: Mid-Outer approach
      [2760, 15],   // 8: Band 4a (J, K, L, M)
      [3120, 15],   // 9: Band 4b (J1, K1, L1, M1)
      [3300, 14],   // 10: Cosmic Gateway & ks0/ks1 junction
      [3500, 14],   // 11: Band 5a (R3, R4)
      [3820, 14],   // 12: Band 5b (R1, R2, R5, R6)
      [4100, 15],   // 13: Band 5.5 (P1..P4)
      [4300, 14],   // 14: Ring 3 Outer Rim intersection (S1, S2)
      [4600, 14],   // 15: Band 6b (S3, S4)
      [4900, 14],   // 16: Doomed Gate junction
      [5200, 10],   // 17: Outer Forbidden approach
    ];
    const hwL: string[] = [];
    const hwR: string[] = [];
    HW_STOPS.forEach(([r, da], idx) => {
      const idL = `${sec.key}_hw_L_${idx + 1}`;
      const idR = `${sec.key}_hw_R_${idx + 1}`;
      add({ id: idL, name: 'Arterial Highway', kind: 'highway', region: sec.key, ...polar(r, sec.angle - da), stats: sec.travel });
      add({ id: idR, name: 'Arterial Highway', kind: 'highway', region: sec.key, ...polar(r, sec.angle + da), stats: sec.travel });
      hwL.push(idL);
      hwR.push(idR);
      if (idx === 0) {
        link(hub, idL);
        link(hub, idR);
      } else {
        link(hwL[idx - 1], idL);
        link(hwR[idx - 1], idR);
      }
    });

    // Mid Concourse center node (r=2310, a=0°) & Outer Rim center node (r=4300, a=0°)
    const midCenter = `orbit_mid_${sec.key}_c`;
    add({ id: midCenter, name: 'Mid Concourse Highway', kind: 'highway', region: sec.key, ...polar(2310, sec.angle), stats: sec.travel });
    const outerCenter = `orbit_outer_${sec.key}_c`;
    add({ id: outerCenter, name: 'Outer Rim Highway', kind: 'highway', region: sec.key, ...polar(4300, sec.angle), stats: sec.travel });

    const connect = (from: string, to: string) => path(from, to, sec.key, sec.travel, 'travel', 260);

    // Band 1 connections (r=950..1280)
    connect(hub, p['I.entry']);
    connect(hwL[1], p['A.entry']);
    connect(hwR[1], p['B.entry']);
    connect(hwL[1], p['I.entry']);
    connect(hwR[1], p['I.entry']);
    connect(hwL[2], p['A1.entry']);
    connect(hwR[2], p['B1.entry']);
    connect(hwL[2], p['I1.entry']);
    connect(hwR[2], p['I1.entry']);
    link(p['A.out'], p['A1.entry']);
    link(p['B.out'], p['B1.entry']);
    link(p['I.out'], p['I1.entry']);

    // Band 2 connections (r=1550..1860)
    connect(hwL[3], p['C.entry']);
    connect(hwR[3], p['E.entry']);
    connect(hwL[3], p['D.entry']);
    connect(hwR[3], p['D.entry']);
    connect(hwL[4], p['C1.entry']);
    connect(hwR[4], p['E1.entry']);
    connect(hwL[4], p['D1.entry']);
    connect(hwR[4], p['D1.entry']);
    link(p['I1.out'], p['D.entry']);
    link(p['C.out'], p['C1.entry']);
    link(p['D.out'], p['D1.entry']);
    link(p['E.out'], p['E1.entry']);

    // Band 3 connections (r=2150..2460) & Ring 2 (r=2310)
    connect(hwL[5], p['F.entry']);
    connect(hwR[5], p['H.entry']);
    connect(hwL[5], p['G.entry']);
    connect(hwR[5], p['G.entry']);
    connect(hwL[6], p['F1.entry']);
    connect(hwR[6], p['H1.entry']);
    link(midCenter, p['G1.entry']);
    link(p['D1.out'], p['G.entry']);
    link(p['F.out'], p['F1.entry']);
    link(p['G.out'], midCenter);
    link(p['H.out'], p['H1.entry']);

    // Band 4 connections (r=2750..3150)
    connect(hwL[8], p['J.entry']);
    connect(hwL[8], p['L.entry']);
    connect(hwR[8], p['K.entry']);
    connect(hwR[8], p['M.entry']);
    connect(hwL[9], p['J1.entry']);
    connect(hwL[9], p['L1.entry']);
    connect(hwR[9], p['K1.entry']);
    connect(hwR[9], p['M1.entry']);
    link(p['J.out'], p['J1.entry']);
    link(p['K.out'], p['K1.entry']);
    link(p['L.out'], p['L1.entry']);
    link(p['M.out'], p['M1.entry']);

    // Band 5 connections (r=3300..3820) & Keystones ks0/ks1
    connect(hwL[10], p.ks0);
    connect(hwR[10], p.ks1);
    connect(hwL[11], p['R3.entry']);
    connect(hwR[11], p['R4.entry']);
    connect(hwL[12], p['R1.entry']);
    connect(hwL[12], p['R5.entry']);
    connect(hwR[12], p['R2.entry']);
    connect(hwR[12], p['R6.entry']);
    link(p['R3.out'], p['R5.entry']);
    link(p['R4.out'], p['R6.entry']);

    // Band 5.5 & Band 6 connections (r=4100..4900), Ring 3 (r=4300), ksm & Doomed
    connect(hwL[13], p['P1.entry']);
    connect(hwL[13], p['P2.entry']);
    connect(hwR[13], p['P3.entry']);
    connect(hwR[13], p['P4.entry']);
    connect(hwL[14], p['S1.entry']);
    connect(hwR[14], p['S2.entry']);
    connect(hwL[15], p['S3.entry']);
    connect(hwR[15], p['S4.entry']);
    connect(outerCenter, p.ksm);
    connect(hwL[16], p.doomed);
    connect(hwR[16], p.doomed);
    connect(p.doomed, p['DG1.entry']);
    connect(p.doomed, p['DG2.entry']);

    ports[sec.key] = p;
  }

  // --- 3 MAIN CONCENTRIC CROSS-SECTOR RINGS ---
  // Ring 1: Central Crossing Ring (r=260) - built above
  // Ring 2: Mid Concourse Orbital Ring (r=2310)
  // Ring 3: Outermost Rim Highway Ring (r=4300)
  SECTOR_DEFS.forEach((sec, i) => {
    const next = SECTOR_DEFS[(i + 1) % SECTOR_DEFS.length];

    // Ring 2: Mid Concourse Orbital Ring (r=2310)
    const midL = `${sec.key}_hw_L_7`;
    const midC = `orbit_mid_${sec.key}_c`;
    const midR = `${sec.key}_hw_R_7`;
    const nextMidL = `${next.key}_hw_L_7`;
    const midInL = `orbit_mid_${sec.key}_inL`;
    const midInR = `orbit_mid_${sec.key}_inR`;
    add({ id: midInL, name: 'Mid Concourse Highway', kind: 'highway', region: sec.key, ...polar(2310, sec.angle - 6), stats: sec.travel });
    add({ id: midInR, name: 'Mid Concourse Highway', kind: 'highway', region: sec.key, ...polar(2310, sec.angle + 6), stats: sec.travel });
    link(midL, midInL);
    link(midInL, midC);
    link(midC, midInR);
    link(midInR, midR);

    const idMid1 = `orbit_mid_${sec.key}_1`;
    const idMid2 = `orbit_mid_${sec.key}_2`;
    const idMid3 = `orbit_mid_${sec.key}_3`;
    add({ id: idMid1, name: 'Mid Concourse Highway', kind: 'highway', region: sec.key, ...polar(2310, sec.angle + 21), stats: sec.travel });
    add({ id: idMid2, name: 'Mid Concourse Highway', kind: 'highway', region: 'center', ...polar(2310, sec.angle + 30), stats: { allAttr: 2 } });
    add({ id: idMid3, name: 'Mid Concourse Highway', kind: 'highway', region: next.key, ...polar(2310, sec.angle + 39), stats: next.travel });
    link(midR, idMid1);
    link(idMid1, idMid2);
    link(idMid2, idMid3);
    link(idMid3, nextMidL);

    // Ring 3: Outermost Rim Ring (r=4300)
    const outL = `${sec.key}_hw_L_15`;
    const outC = `orbit_outer_${sec.key}_c`;
    const outR = `${sec.key}_hw_R_15`;
    const nextOutL = `${next.key}_hw_L_15`;
    const outInL1 = `orbit_outer_${sec.key}_inL1`;
    const outInL2 = `orbit_outer_${sec.key}_inL2`;
    const outInR1 = `orbit_outer_${sec.key}_inR1`;
    const outInR2 = `orbit_outer_${sec.key}_inR2`;
    add({ id: outInL1, name: 'Outer Rim Highway', kind: 'highway', region: sec.key, ...polar(4300, sec.angle - 9.3), stats: sec.travel });
    add({ id: outInL2, name: 'Outer Rim Highway', kind: 'highway', region: sec.key, ...polar(4300, sec.angle - 4.7), stats: sec.travel });
    add({ id: outInR1, name: 'Outer Rim Highway', kind: 'highway', region: sec.key, ...polar(4300, sec.angle + 4.7), stats: sec.travel });
    add({ id: outInR2, name: 'Outer Rim Highway', kind: 'highway', region: sec.key, ...polar(4300, sec.angle + 9.3), stats: sec.travel });
    link(outL, outInL1);
    link(outInL1, outInL2);
    link(outInL2, outC);
    link(outC, outInR1);
    link(outInR1, outInR2);
    link(outInR2, outR);

    const idOut1 = `orbit_outer_${sec.key}_1`;
    const idOut2 = `orbit_outer_${sec.key}_2`;
    const idOut3 = `orbit_outer_${sec.key}_3`;
    const idOut4 = `orbit_outer_${sec.key}_4`;
    const idOut5 = `orbit_outer_${sec.key}_5`;
    add({ id: idOut1, name: 'Outer Rim Highway', kind: 'highway', region: sec.key, ...polar(4300, sec.angle + 19.3), stats: sec.travel });
    add({ id: idOut2, name: 'Outer Rim Highway', kind: 'highway', region: sec.key, ...polar(4300, sec.angle + 24.7), stats: sec.travel });
    add({ id: idOut3, name: 'Outer Rim Highway', kind: 'highway', region: 'center', ...polar(4300, sec.angle + 30), stats: { allAttr: 2 } });
    add({ id: idOut4, name: 'Outer Rim Highway', kind: 'highway', region: next.key, ...polar(4300, sec.angle + 35.3), stats: next.travel });
    add({ id: idOut5, name: 'Outer Rim Highway', kind: 'highway', region: next.key, ...polar(4300, sec.angle + 40.7), stats: next.travel });
    link(outR, idOut1);
    link(idOut1, idOut2);
    link(idOut2, idOut3);
    link(idOut3, idOut4);
    link(idOut4, idOut5);
    link(idOut5, nextOutL);

    // Inner cross-sector bridge (Band 1)
    for (const [a, b] of BRIDGES) {
      if (ports[sec.key]?.[a] && ports[next.key]?.[b]) {
        path(ports[sec.key][a], ports[next.key][b], sec.key, sec.travel, 'highway', 260);
      }
    }
  });

  // Cosmic Gateways (r=3300, a=0° in each sector, linked between Left and Right Arterial Highways)
  for (const gw of GATEWAYS) {
    add({
      id: gw.id,
      name: gw.name,
      kind: 'gateway',
      region: 'center',
      ...polar(gw.r, gw.angle),
      stats: { [gw.stat]: 1 },
      gatewayPair: gw.pairId,
      desc: `Cosmic Gateway linked to ${gw.pairId}. Spend 3 travel points to activate conduit.`,
    });
    const sec = SECTOR_DEFS.find((s) => s.angle === gw.angle);
    if (sec) {
      path(`${sec.key}_hw_L_11`, gw.id, sec.key, sec.travel, 'travel', 280);
      path(`${sec.key}_hw_R_11`, gw.id, sec.key, sec.travel, 'travel', 280);
    }
  }

  // 12 Forbidden Keystones (r=5400, linked radially to Outer Rim Ring)
  for (const f of FORBIDDEN) {
    add({
      id: f.id,
      name: f.name,
      kind: 'keystone',
      region: 'forbidden',
      ...polar(5400, f.angle),
      stats: f.stats,
      desc: f.desc,
    });
    const normAngle = ((f.angle % 360) + 360) % 360;
    const matchSec = SECTOR_DEFS.find((s) => ((s.angle % 360) + 360) % 360 === normAngle);
    if (matchSec) {
      // Sector-center Forbidden Keystone: approach from the outer arterial highway tips
      path(`${matchSec.key}_hw_L_18`, f.id, 'forbidden', { allAttr: 2 }, 'travel', 360);
      path(`${matchSec.key}_hw_R_18`, f.id, 'forbidden', { allAttr: 2 }, 'travel', 360);
    } else {
      // Sector-boundary Forbidden Keystone: straight radial road from the Outer Rim Ring midpoint
      const near = polar(4300, f.angle);
      const from = Object.values(nodes)
        .filter((n) => n.kind === 'highway' || n.kind === 'travel')
        .reduce((a, b) => (Math.hypot(a.x - near.x, a.y - near.y) <= Math.hypot(b.x - near.x, b.y - near.y) ? a : b));
      path(from.id, f.id, 'forbidden', { allAttr: 2 }, 'travel', 380);
    }
  }

  return Object.values(nodes);
}

export const PASSIVE_NODES: PassiveNode[] = build();
export const PASSIVE_BY_ID: Record<string, PassiveNode> = Object.fromEntries(PASSIVE_NODES.map((n) => [n.id, n]));

export const CLASS_SECTORS: { key: ClassRegion; angle: number; start: string; name: string }[] = [
  { key: 'str', angle: -90, start: 'class_str', name: 'Warrior' },
  { key: 'duelist', angle: -30, start: 'class_strdex', name: 'Duelist' },
  { key: 'dex', angle: 30, start: 'class_dex', name: 'Ranger' },
  { key: 'shadow', angle: 90, start: 'class_dexint', name: 'Shadow' },
  { key: 'int', angle: 150, start: 'class_int', name: 'Mage' },
  { key: 'templar', angle: 210, start: 'class_strint', name: 'Templar' },
];

export const REGION_NAMES: Record<TreeRegion, string> = {
  str: 'Warrior',
  duelist: 'Duelist',
  dex: 'Ranger',
  shadow: 'Shadow',
  int: 'Mage',
  templar: 'Templar',
  center: "Exile's Crossing",
  forbidden: 'Forbidden',
};

export const MECHANIC_INFO: Record<Mechanic, { name: string; cls: string }> = {
  rage: { name: 'Rage', cls: 'Warrior' },
  riposte: { name: 'Riposte', cls: 'Duelist' },
  momentum: { name: 'Momentum', cls: 'Ranger' },
  malice: { name: 'Malice', cls: 'Shadow' },
  manaPower: { name: 'Mana is Power', cls: 'Mage' },
  martyr: { name: 'Martyr', cls: 'Templar' },
};
