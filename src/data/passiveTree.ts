import type { StatKey } from '../engine/types';
import { CLUSTER_LAYOUT, JUNCTIONS, LANDMARKS, ROADS, type LayoutSlot } from './passiveTreeLayout';
import { regionClusters } from './passiveNotables';

/**
 * The character passive skill tree: six classes around the Exile's central crossing, 3 paired Cosmic
 * Gateways, 6 Doomed Gates unlocking god-tier clusters, 12 Forbidden keystones on the rim, and
 * PoE-style archetype Masteries.
 *
 * This file holds what each node *is* (cluster contents, keystones, stats). Where everything sits and
 * which roads join it is fixed, hand-placed data in passiveTreeLayout.ts: two thoroughfares and a spine
 * per class, Borderland Roads along every class border with edge clusters bridging across, and the Mid
 * Concourse and Outer Rim ring roads. Cluster, notable and keystone ids don't depend on the layout; road
 * ids do, and an allocation whose roads moved is refunded on load (see settleTreeLayout).
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
  /** roads drawn as curves: linked node id -> the curve's two control points [x1, y1, x2, y2], leaving this node */
  curves?: Record<string, [number, number, number, number]>;
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
  // skill archetypes (docs/PASSIVE_NOTABLES.md)
  warcry: [
    m('15% increased Warcry Effect', { warcryEffect: 15 }),
    m('20% faster Warcry Cooldown Recovery', { warcryCooldown: 20 }),
    m('15% increased Damage while a Warcry is active', { warcryActivePct: 15 }),
  ],
  exertion: [
    m('20% increased Damage with Exerted skills', { exertedPct: 20 }),
    m('20% increased Exertion gained', { exertionRate: 20 }),
    m('Kills with Exerted skills grant 1 Exertion', { exertedRefund: 1 }),
  ],
  curse: [
    m('12% increased Effect of your Curses', { curseEffect: 12 }),
    m('30% increased Curse Duration', { curseDuration: 30 }),
    m('15% increased Damage against Cursed enemies', { cursedDamagePct: 15 }),
  ],
  minion: [
    m('20% increased Minion Damage', { minionPct: 20 }),
    m('25% increased Minion Life', { minionLifePct: 25 }),
    m('12% increased Minion Attack Speed', { minionSpeedPct: 12 }),
  ],
  totem: [
    m('20% increased Totem Damage', { totemPct: 20 }),
    m('30% increased Totem Life', { totemLifePct: 30 }),
    m('25% increased Totem Duration', { totemDuration: 25 }),
  ],
  mark: [
    m('25% increased Mark burst Damage', { markPct: 25 }),
    m('30% increased Mark Duration', { markDuration: 30 }),
    m('10% increased Damage against Marked enemies', { markedDamagePct: 10 }),
  ],
  storm: [
    m('20% increased Storm Damage', { stormPct: 20 }),
    m('25% increased Storm Duration', { stormDuration: 25 }),
    m('12% faster Storm strikes', { stormSpeedPct: 12 }),
  ],
  doom: [
    m('25% increased Doom burst Damage', { doomPct: 25 }),
    m('15% increased Doom built', { doomRate: 15 }),
    m('15% increased Chaos Damage', { chaosPct: 15 }),
  ],
  chaos: [
    m('15% increased Chaos Damage', { chaosPct: 15 }),
    m('20% increased Chaos Damage over Time', { chaosDotPct: 20 }),
    m('+15% to Chaos Resistance', { chaosRes: 15 }),
  ],
};

type MasteryTheme = keyof typeof MASTERIES;
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

/** Roughly where the deep rim clusters sit, now the tree is drawn in tight with no long roads. */
export const RIM_RADIUS = 2900;
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
  { id: 'gateway_solar', pairId: 'gateway_lunar', name: 'Cosmic Gateway: Solar', stat: 'gatewaySolar' as StatKey },
  { id: 'gateway_lunar', pairId: 'gateway_solar', name: 'Cosmic Gateway: Lunar', stat: 'gatewayLunar' as StatKey },
  { id: 'gateway_astral', pairId: 'gateway_void', name: 'Cosmic Gateway: Astral', stat: 'gatewayAstral' as StatKey },
  { id: 'gateway_void', pairId: 'gateway_astral', name: 'Cosmic Gateway: Void', stat: 'gatewayVoid' as StatKey },
  { id: 'gateway_primal', pairId: 'gateway_divine', name: 'Cosmic Gateway: Primal', stat: 'gatewayPrimal' as StatKey },
  { id: 'gateway_divine', pairId: 'gateway_primal', name: 'Cosmic Gateway: Divine', stat: 'gatewayDivine' as StatKey },
];

// ---------- 6 Doomed Gates (5 Passive Points) ----------

export const DOOMED: (KeystoneSpec & { id: string; sec: ClassRegion; debuff: string })[] = [
  { id: 'doomed_blood_toll', sec: 'str', name: 'Gate of the Blood Toll', stats: { doomedBloodToll: 1 }, debuff: '40% less Maximum Life', desc: '40% less Maximum Life. Unlocks two greatly empowered Warrior wheels.' },
  { id: 'doomed_brittle_bones', sec: 'duelist', name: 'Gate of Brittle Bones', stats: { doomedBrittleBones: 1 }, debuff: 'Take 35% more Physical Damage', desc: 'Take 35% more Physical Damage. Unlocks two greatly empowered Duelist wheels.' },
  { id: 'doomed_glass_veil', sec: 'dex', name: 'Gate of Glass Veil', stats: { doomedGlassVeil: 1 }, debuff: 'Armour and Energy Shield are set to 0', desc: 'Armour and Energy Shield are set to 0. Unlocks two greatly empowered Ranger wheels.' },
  { id: 'doomed_withered_veins', sec: 'shadow', name: 'Gate of Withered Veins', stats: { doomedWitheredVeins: 1 }, debuff: 'Flasks cannot be used', desc: 'Flasks cannot be used. Unlocks two greatly empowered Shadow wheels.' },
  { id: 'doomed_shattered_mind', sec: 'int', name: 'Gate of the Shattered Mind', stats: { doomedShatteredMind: 1 }, debuff: 'Skills cost 150% more Mana', desc: 'Skills cost 150% more Mana. Unlocks two greatly empowered Mage wheels.' },
  { id: 'doomed_broken_covenant', sec: 'templar', name: 'Gate of Broken Covenant', stats: { doomedBrokenCovenant: 1 }, debuff: '-50% to all Elemental and Chaos Resistances', desc: '-50% to all Elemental and Chaos Resistances. Unlocks two greatly empowered Templar wheels.' },
];

const rad = (deg: number) => (deg * Math.PI) / 180;

// Cluster slots per class; their spots on the canvas live in passiveTreeLayout.ts
type SlotId =
  | 'I' | 'A' | 'B' | 'A1' | 'B1' | 'I1'
  | 'C' | 'D' | 'E' | 'C1' | 'D1' | 'E1'
  | 'F' | 'G' | 'H' | 'F1' | 'G1' | 'H1'
  | 'J' | 'K' | 'L' | 'M' | 'J1' | 'K1' | 'L1' | 'M1'
  | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6'
  | 'P1' | 'P2' | 'P3' | 'P4'
  | 'S1' | 'S2' | 'S3' | 'S4'
  | 'DG1' | 'DG2';

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

// Cluster contents (notables, smalls, masteries) live in passiveNotables.ts
const sectorClusters = (key: ClassRegion, travel: StatMap) => regionClusters(key, travel) as Record<SlotId, ClusterSpec>;

const JUNCTION_NAME: [prefix: RegExp, name: string][] = [
  [/_av[lr]_/, 'Thoroughfare'],
  [/_spine$/, 'Spine Road'],
  [/^ring_mid_/, 'Mid Concourse'],
  [/^ring_outer_/, 'Outer Rim'],
  [/^seam_/, 'Borderland Road'],
];

// ---------- curved roads: each road is a cubic curve from its start, past two control points, to its end ----------

type Pt = [number, number];
const bezAt = (p: Pt[], t: number): Pt => {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [w[0] * p[0][0] + w[1] * p[1][0] + w[2] * p[2][0] + w[3] * p[3][0], w[0] * p[0][1] + w[1] * p[1][1] + w[2] * p[2][1] + w[3] * p[3][1]];
};
const bezSlope = (p: Pt[], t: number): Pt => {
  const u = 1 - t;
  const w = [3 * u * u, 6 * u * t, 3 * t * t];
  return [
    w[0] * (p[1][0] - p[0][0]) + w[1] * (p[2][0] - p[1][0]) + w[2] * (p[3][0] - p[2][0]),
    w[0] * (p[1][1] - p[0][1]) + w[1] * (p[2][1] - p[1][1]) + w[2] * (p[3][1] - p[2][1]),
  ];
};
/** Maps a fraction of the road's length to the curve's t, so travel nodes sit evenly along the bend. */
function evenlyAlong(p: Pt[]): (f: number) => number {
  const N = 64;
  const len = [0];
  let last = bezAt(p, 0);
  for (let i = 1; i <= N; i++) {
    const q = bezAt(p, i / N);
    len.push(len[i - 1] + Math.hypot(q[0] - last[0], q[1] - last[1]));
    last = q;
  }
  return (f) => {
    const want = f * len[N];
    let i = 1;
    while (i < N && len[i] < want) i++;
    const span = len[i] - len[i - 1] || 1;
    return (i - 1 + (want - len[i - 1]) / span) / N;
  };
}

function build(): PassiveNode[] {
  const nodes: Record<string, PassiveNode> = {};
  const add = (n: Omit<PassiveNode, 'links' | 'stats'> & { stats?: StatMap }) => {
    if (nodes[n.id]) throw new Error(`Duplicate passive node ${n.id}`);
    return (nodes[n.id] = { stats: {}, ...n, links: [] });
  };
  const link = (a: string, b: string) => {
    if (!nodes[a] || !nodes[b]) throw new Error(`Tree layout links a missing node: ${nodes[a] ? b : a}`);
    if (!nodes[a].links.includes(b)) nodes[a].links.push(b);
    if (!nodes[b].links.includes(a)) nodes[b].links.push(a);
  };

  /**
   * Places one cluster at its fixed spot. `facing` points from the entry (behind) to the far side (front);
   * "left" is the side a quarter-turn anticlockwise on screen. Node ids depend only on the shape's size
   * (3, 5 or 7 nodes), so swapping shapes of the same size keeps every save's allocated ids valid.
   */
  const cluster = (region: TreeRegion, spec: ClusterSpec, [cx, cy, facing, shape]: LayoutSlot, travel: StatMap = {}): Record<Port, string> => {
    const u = { x: Math.cos(rad(facing)), y: Math.sin(rad(facing)) };
    const v = { x: u.y, y: -u.x };
    const at = (du: number, dv: number) => ({ x: Math.round(cx + u.x * du + v.x * dv), y: Math.round(cy + u.y * du + v.y * dv) });
    const ring = (radius: number, deg: number) => at(Math.cos(rad(deg)) * radius, Math.sin(rad(deg)) * radius);
    const base = { region, cluster: spec.id };
    // the small nodes are the paths between clusters now, so they carry the attributes travel roads used to
    const smallStats: StatMap = { ...spec.small[1] };
    for (const [k, val] of Object.entries(travel) as [keyof StatMap, number][]) smallStats[k] = (smallStats[k] ?? 0) + val;
    let si = 0;
    let ni = 0;
    const node = (kind: 'small' | 'notable', p: { x: number; y: number }) => {
      if (kind === 'small') {
        const id = `${spec.id}_s${++si}`;
        add({ ...base, id, name: spec.small[0], kind, ...p, stats: smallStats });
        return id;
      }
      const notable = spec.notables[ni++] ?? spec.notables[0];
      const id = shape === 'line' || spec.notables.length === 1 ? `${spec.id}_n` : `${spec.id}_n${ni}`;
      add({ ...base, id, name: notable[0], kind, ...p, stats: notable[1] });
      return id;
    };
    const chain = (ids: string[]) => ids.slice(1).forEach((id, i) => link(ids[i], id));
    // only the big three-notable clusters carry a mastery
    const mastery = (p: { x: number; y: number }, notable: string) => {
      if (spec.notables.length < 3) return;
      const id = `${spec.id}_m`;
      add({ ...base, id, name: `${spec.notables[0]?.[0] ?? spec.id} Mastery`, kind: 'mastery', ...p, options: MASTERIES[spec.mastery] ?? MASTERIES.life });
      link(notable, id);
    };

    switch (shape) {
      case 'line': {
        // a triangle: the road runs along its base between two smalls, the notable sits on its tip
        const s1 = node('small', at(-62, 0));
        const s2 = node('small', at(62, 0));
        const n = node('notable', at(0, 66));
        chain([s1, s2, n, s1]);
        mastery(at(0, 122), n);
        return { entry: s1, out: s2, left: s2, right: s2 };
      }
      case 'fork': {
        // a Y: the entry splits into two arms, each ending in a notable
        const entry = node('small', at(-66, 0));
        const left = node('small', at(0, 48));
        const nl = node('notable', at(66, 72));
        const right = node('small', at(0, -48));
        const nr = node('notable', at(66, -72));
        chain([entry, left, nl]);
        chain([entry, right, nr]);
        mastery(at(50, 0), nl);
        return { entry, out: nr, left, right };
      }
      case 'trident': {
        // three prongs from the entry: an arm to one notable, a road straight through the middle, the other notable
        const entry = node('small', at(-70, 0));
        const arm = node('small', at(-5, 52));
        const nl = node('notable', at(62, 72));
        const mid = node('small', at(42, 0));
        const nr = node('notable', at(52, -66));
        chain([entry, arm, nl]);
        chain([entry, mid]);
        chain([entry, nr]);
        mastery(at(100, 40), nl);
        return { entry, out: mid, left: arm, right: mid };
      }
      case 'loop': {
        // a pentagon: notables on the back corners, smalls at the front where roads can leave
        const s1 = node('small', ring(82, 180));
        const nl = node('notable', ring(82, 108));
        const s2 = node('small', ring(82, 36));
        const s3 = node('small', ring(82, -36));
        const nr = node('notable', ring(82, -108));
        chain([s1, nl, s2, s3, nr, s1]);
        mastery(at(0, 0), nl);
        return { entry: s1, out: s3, left: s2, right: s3 };
      }
      case 'diamond': {
        // a diamond with a road straight through its middle and a notable on each side
        const s1 = node('small', at(-84, 0));
        const nl = node('notable', at(0, 64));
        const s2 = node('small', at(84, 0));
        const nr = node('notable', at(0, -64));
        const mid = node('small', at(0, 0));
        chain([s1, nl, s2, nr, s1]);
        chain([s1, mid, s2]);
        mastery(at(0, 122), nl);
        return { entry: s1, out: s2, left: s2, right: s2 };
      }
      case 'pokeball': {
        // a hexagon split by a chord through a central notable
        const s1 = node('small', ring(88, 180));
        const s2 = node('small', ring(88, 120));
        const n1 = node('notable', ring(88, 60));
        const s3 = node('small', ring(88, 0));
        const n2 = node('notable', ring(88, -60));
        const s4 = node('small', ring(88, -120));
        chain([s1, s2, n1, s3, n2, s4, s1]);
        const centre = node('notable', at(0, 0));
        link(s1, centre);
        link(centre, s3);
        mastery(at(0, 44), centre);
        return { entry: s1, left: s2, out: s3, right: s4 };
      }
      case 'wheel': {
        // a seven-node ring around its mastery
        const ids = Array.from({ length: 7 }, (_, i) => node(i === 2 || i === 4 || i === 5 ? 'notable' : 'small', ring(88, 180 + (i * 360) / 7)));
        chain([...ids, ids[0]]);
        mastery(at(0, 0), ids[2]);
        return { entry: ids[0], left: ids[1], out: ids[3], right: ids[6] };
      }
      case 'spiral': {
        // a nautilus curling in to the notable at its eye
        const s1 = node('small', at(-90, 20));
        const s2 = node('small', at(-50, -65));
        const n1 = node('notable', at(35, -75));
        const s3 = node('small', at(85, -15));
        const n2 = node('notable', at(55, 60));
        const s4 = node('small', at(-10, 65));
        const eye = node('notable', at(0, 0));
        chain([s1, s2, n1, s3, n2, s4, eye]);
        mastery(at(-42, 18), eye);
        return { entry: s1, left: s2, out: s3, right: s4 };
      }
      case 'branch': {
        // a straight road of four smalls with notables branching off either side
        const s1 = node('small', at(-108, 0));
        const s2 = node('small', at(-36, 0));
        const s3 = node('small', at(36, 0));
        const s4 = node('small', at(108, 0));
        const n1 = node('notable', at(-36, 64));
        const n2 = node('notable', at(36, -64));
        const n3 = node('notable', at(108, 64));
        chain([s1, s2, s3, s4]);
        link(s2, n1);
        link(s3, n2);
        link(s4, n3);
        mastery(at(36, -122), n2);
        return { entry: s1, out: s4, left: s4, right: s4 };
      }
    }
  };

  const SECTOR_DEFS: SectorSpec[] = [
    {
      key: 'str', angle: -90, startName: 'Warrior', start: 'class_str', travel: { str: 4 },
      clusters: sectorClusters('str', { str: 10 }),
      keystones: {
        ks0: { name: 'Unbreakable', stats: { armourMore: 60, attackSpeedMore: -15 }, desc: '60% more Armour. 15% less Attack Speed.' },
        ks1: { name: 'Blood Pact', stats: { bloodPact: 1 }, desc: 'Skills cost Life instead of Mana. You have no Mana.' },
        ksm: { name: 'Colossal Frame', stats: { lifePct: 25, attackSpeedMore: -10 }, desc: '25% increased maximum Life. 10% less Attack Speed.' },
      },
    },
    {
      key: 'duelist', angle: -30, startName: 'Duelist', start: 'class_strdex', travel: { str: 2, dex: 2 },
      clusters: sectorClusters('duelist', { str: 5, dex: 5 }),
      keystones: {
        ks0: { name: 'Steady Hand', stats: { steadyHand: 1 }, desc: "Your hits always land. You can't deal critical strikes." },
        ks1: { name: 'Blade Waltz', stats: { attackSpeedMore: 15, armourMore: -30 }, desc: '15% more Attack Speed. 30% less Armour.' },
        ksm: { name: 'Dancing Steel', stats: { attackSpeedMore: 20, armourMore: -40 }, desc: '20% more Attack Speed. 40% less Armour.' },
      },
      keystoneIds: { ks0: 'duelist_ks' },
    },
    {
      key: 'dex', angle: 30, startName: 'Ranger', start: 'class_dex', travel: { dex: 4 },
      clusters: sectorClusters('dex', { dex: 10 }),
      keystones: {
        ks0: { name: 'Glass Edge', stats: { critMulti: 80, lifeMore: -25 }, desc: '+80% Critical Strike Multiplier. 25% less maximum Life.' },
        ks1: { name: 'Wind Dancer', stats: { windDancer: 1, armourMore: -40 }, desc: 'Evasion can dodge boss wind-ups. 40% less Armour.' },
        ksm: { name: 'One Clean Shot', stats: { projectilePct: 60, lifePct: -15 }, desc: '60% increased Projectile Damage. 15% less maximum Life.' },
      },
    },
    {
      key: 'shadow', angle: 90, startName: 'Shadow', start: 'class_dexint', travel: { dex: 2, int: 2 },
      clusters: sectorClusters('shadow', { dex: 5, int: 5 }),
      keystones: {
        ks0: { name: 'Arcane Recursion', stats: { arcaneRecursion: 1 }, desc: 'Cooldowns recover 40% faster. Skills cost 50% more Mana.' },
        ks1: { name: 'Venomous Soul', stats: { ailmentPct: 60, lifeMore: -15 }, desc: '60% increased damage with ailments. 15% less maximum Life.' },
        ksm: { name: 'Venomous Soul', stats: { ailmentPct: 60, lifePct: -15 }, desc: '60% increased damage with ailments. 15% less maximum Life.' },
      },
      keystoneIds: { ks0: 'shadow_ks' },
    },
    {
      key: 'int', angle: 150, startName: 'Mage', start: 'class_int', travel: { int: 4 },
      clusters: sectorClusters('int', { int: 10 }),
      keystones: {
        ks0: { name: "Alchemist's Covenant", stats: { flaskEffect: 50, flaskCharges: 50, lifeMore: -10 }, desc: '50% increased Flask Effect and Charges gained. 10% less maximum Life.' },
        ks1: { name: 'Mind over Flesh', stats: { mindOverFlesh: 30 }, desc: '30% of damage is taken from Mana before Life.' },
        ksm: { name: 'Arcane Body', stats: { spellPct: 50, lifePct: -20 }, desc: '50% increased Spell Damage. 20% less maximum Life.' },
      },
    },
    {
      key: 'templar', angle: 210, startName: 'Templar', start: 'class_strint', travel: { int: 2, str: 2 },
      clusters: sectorClusters('templar', { int: 5, str: 5 }),
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

  const secByKey = Object.fromEntries(SECTOR_DEFS.map((s) => [s.key, s])) as Record<ClassRegion, SectorSpec>;
  // Road stats: a class's own attributes, half of each neighbour's on the borderland between two classes,
  // and a little of everything in the centre and on the Forbidden approaches.
  const statsFor = (key: string): StatMap => {
    if (key.startsWith('seam:')) {
      const out: StatMap = {};
      for (const k of key.slice(5).split('|') as ClassRegion[]) {
        for (const [stat, v] of Object.entries(secByKey[k].travel)) out[stat as StatKey] = (out[stat as StatKey] ?? 0) + (v ?? 0) / 2;
      }
      return out;
    }
    return secByKey[key as ClassRegion]?.travel ?? { allAttr: 2 };
  };
  const regionFor = (key: string): TreeRegion => (key.startsWith('seam:') ? 'center' : (key as TreeRegion));
  const at = (id: string) => {
    const p = LANDMARKS[id];
    if (!p) throw new Error(`Tree layout has no position for ${id}`);
    return { x: p[0], y: p[1] };
  };

  // The Exile's centre and the crossing ring around it
  add({ id: EXILE_START, name: 'Exile', kind: 'start', region: 'center', ...at(EXILE_START) });
  SECTOR_DEFS.forEach((sec, i) => {
    add({ id: `crossing_${sec.key}`, name: "Exile's Crossing", kind: 'travel', region: 'center', ...at(`crossing_${sec.key}`), stats: { allAttr: 2 } });
    add({ id: `crossing_n${i}`, name: CROSSING[i][0], kind: 'notable', region: 'center', ...at(`crossing_n${i}`), stats: CROSSING[i][1] });
  });

  // Each class: its start, hub, clusters, keystones and Doomed Gate
  const ports: Record<string, string> = {};
  for (const sec of SECTOR_DEFS) {
    add({ id: sec.start, name: sec.startName, kind: 'start', region: sec.key, ...at(sec.start) });
    add({ id: `${sec.key}_hub`, name: 'Attribute', kind: 'travel', region: sec.key, ...at(`${sec.key}_hub`), stats: sec.travel });
    for (const [slot, spec] of Object.entries(sec.clusters)) {
      const place = CLUSTER_LAYOUT[sec.key][slot];
      if (!place) throw new Error(`Tree layout has no spot for ${sec.key} ${slot}`);
      for (const [port, id] of Object.entries(cluster(sec.key, spec, place, sec.travel))) ports[`${sec.key}.${slot}.${port}`] = id;
    }
    for (const k of ['ks0', 'ks1', 'ksm'] as const) {
      const ks = sec.keystones[k];
      const id = sec.keystoneIds?.[k] ?? `${sec.key}_${k}`;
      add({ id, name: ks.name, kind: 'keystone', region: sec.key, ...at(id), stats: ks.stats, desc: ks.desc });
    }
    const doomed = DOOMED.find((d) => d.sec === sec.key)!;
    add({ id: doomed.id, name: doomed.name, kind: 'doomed', region: sec.key, ...at(doomed.id), stats: doomed.stats, desc: doomed.desc });
  }

  for (const gw of GATEWAYS) {
    add({
      id: gw.id, name: gw.name, kind: 'gateway', region: 'center', ...at(gw.id), stats: { [gw.stat]: 1 }, gatewayPair: gw.pairId,
      desc: `Cosmic Gateway linked to ${gw.pairId}. Spend 3 travel points to activate conduit.`,
    });
  }
  for (const f of FORBIDDEN) add({ id: f.id, name: f.name, kind: 'keystone', region: 'forbidden', ...at(f.id), stats: f.stats, desc: f.desc });

  // Road junctions, then the roads between them with evenly spaced travel nodes
  for (const [id, x, y, key] of JUNCTIONS) {
    const name = JUNCTION_NAME.find(([re]) => re.test(id))?.[1] ?? 'Thoroughfare';
    add({ id, name, kind: 'highway', region: regionFor(key), x, y, stats: statsFor(key) });
  }
  const safe = (end: string) => end.replace(/\./g, '_');
  // the drawn curve of one link: the piece of the road's curve between t0 and t1
  const curve = (p: Pt[], ta: string, tb: string, t0: number, t1: number) => {
    const h = (t1 - t0) / 3;
    const [a, da] = [bezAt(p, t0), bezSlope(p, t0)];
    const [b, db] = [bezAt(p, t1), bezSlope(p, t1)];
    const c1: Pt = [a[0] + da[0] * h, a[1] + da[1] * h];
    const c2: Pt = [b[0] - db[0] * h, b[1] - db[1] * h];
    const r = Math.round;
    (nodes[ta].curves ??= {})[tb] = [r(c1[0]), r(c1[1]), r(c2[0]), r(c2[1])];
    (nodes[tb].curves ??= {})[ta] = [r(c2[0]), r(c2[1]), r(c1[0]), r(c1[1])];
  };
  for (const [from, to, between, key, kind, ...ctrl] of ROADS) {
    const a = nodes[ports[from] ?? from];
    const b = nodes[ports[to] ?? to];
    if (!a || !b) throw new Error(`Tree road ${from} -> ${to} has a missing end`);
    // a straight road is a curve with its control points a third of the way along
    const p: Pt[] = [
      [a.x, a.y],
      ctrl.length ? [ctrl[0], ctrl[1]] : [a.x + (b.x - a.x) / 3, a.y + (b.y - a.y) / 3],
      ctrl.length ? [ctrl[2], ctrl[3]] : [a.x + ((b.x - a.x) * 2) / 3, a.y + ((b.y - a.y) * 2) / 3],
      [b.x, b.y],
    ];
    const at = evenlyAlong(p);
    let prev = a.id;
    let tPrev = 0;
    for (let i = 1; i <= between; i++) {
      const t = at(i / (between + 1));
      const [x, y] = bezAt(p, t);
      const id = `t_${safe(from)}_${safe(to)}_${i}`;
      add({
        id,
        name: key.startsWith('seam:') ? 'Borderland Road' : kind === 'h' ? 'Thoroughfare' : 'Attribute',
        kind: kind === 'h' ? 'highway' : 'travel',
        region: regionFor(key),
        x: Math.round(x),
        y: Math.round(y),
        stats: statsFor(key),
      });
      link(prev, id);
      if (ctrl.length) curve(p, prev, id, tPrev, t);
      prev = id;
      tPrev = t;
    }
    link(prev, b.id);
    if (ctrl.length) curve(p, prev, b.id, tPrev, 1);
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
