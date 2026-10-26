import type { StatKey } from '../engine/types';

/**
 * The character tree (docs/TREES.md): six class sectors around a shared centre, PoE-style.
 * Every sector uses the same slot layout (rotated): themed clusters in three bands and two keystones,
 * then a road out to the rim where the class-mechanic clusters and mechanic keystone sit.
 * Neighbouring sectors are cross-linked so any class can path anywhere.
 */
export type PassiveKind = 'start' | 'small' | 'travel' | 'notable' | 'mastery' | 'keystone';
export type ClassRegion = 'str' | 'duelist' | 'dex' | 'shadow' | 'int' | 'templar';
export type TreeRegion = ClassRegion | 'center' | 'forbidden';
/** class mechanics (docs/CLASSES.md); nodes tagged with one only do something for that class */
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
  /** cluster id for smalls, notables and masteries */
  cluster?: string;
  mechanic?: Mechanic;
  x: number;
  y: number;
  stats: StatMap;
  links: string[];
  desc?: string;
  /** mastery choices */
  options?: MasteryOption[];
}

const m = (label: string, stats: StatMap): MasteryOption => ({ label, stats });

// ---------- masteries: shared by theme, like PoE ----------

const MASTERIES = {
  armour: [m('15% increased Armour', { armourPct: 15 }), m('Armour also applies to 10% of elemental damage', { armourVsElem: 10 }), m('10% less damage taken from boss wind-ups', { slamReduction: 10 })],
  life: [m('5% increased maximum Life', { lifePct: 5 }), m('Regenerate 0.5% of Life per second', { lifeRegenPct: 0.5 }), m('20% increased Life Flask recovery', { lifeFlaskRecovery: 20 })],
  phys: [m('10% increased Physical Damage', { physPct: 10 }), m('15% longer Stuns', { stunDuration: 15 }), m('10% more damage against Stunned enemies', { stunnedVuln: 10 })],
  guard: [m('Guard skills also grant 20% increased Armour for 3s', { guardArmourPct: 20 }), m('15% faster Guard skill Cooldowns', { guardCooldown: 15 }), m('Blocking a hit restores 3% of Life', { blockHeal: 3 })],
  buff: [m('5% more damage while a buff skill is active', { buffMore: 5 }), m('War Cry restores 5% of Life', { warCryHeal: 5 }), m('Buff skills last 2s longer', { buffDurationFlat: 2000 })],
  bleed: [m('Bleeds deal 15% more damage to bosses', { bleedBossMore: 15 }), m('Bleeding enemies take 5% more damage', { bleedVuln: 5 }), m('Bleeds last 1s longer', { bleedDurationFlat: 1000 })],
  evasion: [m('15% increased Evasion Rating', { evasionPct: 15 }), m('Evading a hit restores 2% of Life', { evadeHeal: 2 }), m('5% increased Attack Speed for 4s after you evade', { evadeSpeed: 5 })],
  crit: [m('10% increased Critical Strike Chance', { critChancePct: 10 }), m('+50 to Accuracy Rating', { accuracy: 50 }), m('Crits against full-Life enemies deal 30% more damage', { critFullLife: 30 })],
  critMulti: [m('+10% to Critical Strike Multiplier', { critMulti: 10 }), m('20% more damage against enemies below 30% Life', { lowLifeDamage: 20 }), m('Critical strikes leech 1% of damage as Life', { critLeech: 1 })],
  speed: [m('3% increased Attack Speed', { attackSpeedPct: 3 }), m('5% increased Attack Speed with Twin Strike and Lacerate', { dexSkillSpeed: 5 }), m('Repeats (Multistrike, Spell Echo) deal 10% more damage', { repeatMore: 10 })],
  poison: [m('10% increased Poison Damage', { poisonPct: 10 }), m('Poisons last 1s longer', { poisonDurationFlat: 1000 }), m('Poisoned enemies deal 5% less damage', { poisonWeaken: 5 })],
  cooldown: [m('Smoke Step lasts 0.5s longer', { smokeExtra: 500 }), m('8% faster Cooldowns', { cooldownRecovery: 8 }), m('After using a guard skill, your next hit deals 20% more damage', { afterGuardDamage: 20 })],
  fire: [m('10% increased Fire Damage', { firePct: 10 }), m('Ignites spread to another enemy when the target dies', { igniteSpread: 1 }), m('15% longer Ignites', { igniteDuration: 15 })],
  cold: [m('10% increased Cold Damage', { coldPct: 10 }), m('15% stronger absorb Shields', { shieldEffect: 15 }), m('Cold hits slow enemy attacks by 10% for 3s', { chillOnHit: 10 })],
  light: [m('10% increased Lightning Damage', { lightPct: 10 }), m('Chains deal 10% more damage per chain', { chainMore: 10 }), m('10% increased Crit Chance with Lightning skills', { lightCrit: 10 })],
  mana: [m('15% increased Mana Regeneration', { manaRegenPct: 15 }), m('8% reduced Mana Costs', { manaCostReduction: 8 }), m('25% increased Mana Flask recovery', { manaFlaskRecovery: 25 })],
  cast: [m('4% increased Cast Speed', { castSpeedPct: 4 }), m('Repeats (Multistrike, Spell Echo) deal 10% more damage', { repeatMore: 10 }), m('+15% to Critical Strike Multiplier with Spells', { spellCritMulti: 15 })],
  flask: [m('10% increased Flask Effect', { flaskEffect: 10 }), m('15% increased Flask Charges gained', { flaskCharges: 15 }), m('Utility Flasks last 20% longer', { utilityFlaskDuration: 20 })],
  strdex: [m('+5 to Strength and Dexterity', { str: 5, dex: 5 }), m('10% increased Physical Damage with melee skills', { meleePct: 10 }), m('+100 to Accuracy Rating', { accuracy: 100 })],
  leech: [m('+0.5% Life Leech', { lifeLeech: 0.5 }), m('+0.3% Life Leech and Regenerate 2 Life per second', { lifeLeech: 0.3, lifeRegen: 2 }), m('Overkill damage heals you for 5% of it', { overkillHeal: 5 })],
  ailment: [m('10% increased damage with ailments', { ailmentPct: 10 }), m('Ailments last 15% longer', { ailmentDuration: 15 }), m('10% more damage against enemies with 2+ ailments', { multiAilmentVuln: 10 })],
  elemental: [m('10% increased Elemental Damage', { elemPct: 10 }), m('Gain 5% of Physical damage as extra Lightning', { physAsLight: 5 }), m('+8% to all Elemental Resistances', { allRes: 8 })],
  strint: [m('+5 to Strength and Intelligence', { str: 5, int: 5 }), m('Regenerate 1 Mana per second', { manaRegenFlat: 1 }), m('10% increased Elemental Damage while above 80% Life', { highLifeElem: 10 })],
  resist: [m('+5% to all Elemental Resistances', { allRes: 5 }), m('5% reduced elemental damage taken', { elemTakenReduction: 5 }), m('Regenerate 2 Life per second', { lifeRegen: 2 })],
  melee: [m('10% increased Physical Damage with melee skills', { meleePct: 10 }), m('+20 to maximum Life', { life: 20 }), m('+10% chance to Stun on hit', { stunChance: 10 })],
  block: [m('+3% chance to Block hits', { blockChance: 3 }), m('Blocking a hit restores 3% of Life', { blockHeal: 3 }), m('+60 to Armour', { armour: 60 })],
  projectile: [m('10% increased Projectile Damage', { projectilePct: 10 }), m('+60 to Accuracy Rating', { accuracy: 60 }), m('+10% to Critical Strike Multiplier', { critMulti: 10 })],
  accuracy: [m('+80 to Accuracy Rating', { accuracy: 80 }), m('10% increased Critical Strike Chance', { critChancePct: 10 }), m('+10 to Dexterity', { dex: 10 })],
  es: [m('15% increased Energy Shield', { energyShieldPct: 15 }), m('25% faster Energy Shield Recharge', { esRechargePct: 25 }), m('+20 to maximum Energy Shield', { energyShield: 20 })],
  spell: [m('10% increased Spell Damage', { spellPct: 10 }), m('4% increased Cast Speed', { castSpeedPct: 4 }), m('+15% to Critical Strike Multiplier with Spells', { spellCritMulti: 15 })],
  rarity: [m('10% increased Item Rarity', { itemRarity: 10 }), m('15% increased Flask Charges gained', { flaskCharges: 15 }), m('+5 to all Attributes', { allAttr: 5 })],
  rage: [m('+5 to maximum Rage', { rageMax: 5 }), m('Rage decays 50% slower', { rageDecay: 50 }), m('10% increased Physical Damage', { physPct: 10 })],
  riposte: [m('Ripostes deal 20% increased damage', { ripostePct: 20 }), m('Riposte recovers 20% faster', { riposteCooldown: 20 }), m('+2% chance to Block hits', { blockChance: 2 })],
  momentum: [m('+2 to maximum Momentum', { momentumMax: 2 }), m('Taking a hit removes 20% less Momentum', { momentumRetain: 20 }), m('4% increased Attack Speed', { attackSpeedPct: 4 })],
  malice: [m('Malice meter is 2 smaller', { maliceMax: -2 }), m('25% increased Coup de Grâce damage', { coupPct: 25 }), m('10% increased Critical Strike Chance', { critChancePct: 10 })],
  manaPower: [m('+5% to the Mana is Power bonus', { manaPower: 5 }), m('Mana above 95% counts as full for Mana is Power', { manaPowerFull: 5 }), m('+25 to maximum Mana', { mana: 25 })],
  martyr: [m('Fervor fills 10% faster', { fervorPct: 10 }), m('The holy nova deals 25% increased damage', { novaPct: 25 }), m('+5% to all Elemental Resistances', { allRes: 5 })],
} satisfies Record<string, MasteryOption[]>;
type MasteryTheme = keyof typeof MASTERIES;

// ---------- the slot layout every sector shares ----------

type Shape = 'line' | 'fork' | 'wheel';
/** a cluster's connection points: where paths come in and leave */
type Port = 'entry' | 'out' | 'left' | 'right';

interface ClusterSpec {
  id: string;
  small: [string, StatMap];
  notables: [string, StatMap][];
  mastery: MasteryTheme;
  mechanic?: Mechanic;
}

interface KeystoneSpec {
  name: string;
  stats: StatMap;
  desc: string;
}

type SlotId = 'I' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'J' | 'K' | 'L' | 'M' | 'R1' | 'R2';

/** the outer ring where every class keeps its mechanic clusters and mechanic keystone */
export const RIM_RADIUS = 2420;

/** polar position (radius, degrees off the sector's centre line; + is clockwise) and shape */
const SLOTS: Record<SlotId, { shape: Shape; r: number; a: number }> = {
  I: { shape: 'wheel', r: 700, a: 0 }, // next to the start
  A: { shape: 'line', r: 600, a: -19 },
  B: { shape: 'line', r: 600, a: 19 },
  C: { shape: 'wheel', r: 1000, a: -17 },
  D: { shape: 'fork', r: 1010, a: 0 },
  E: { shape: 'wheel', r: 1000, a: 17 },
  F: { shape: 'fork', r: 1330, a: -20 },
  G: { shape: 'fork', r: 1350, a: 0 }, // gateway to the rim
  H: { shape: 'fork', r: 1330, a: 20 },
  J: { shape: 'line', r: 1620, a: -10 },
  K: { shape: 'line', r: 1620, a: 10 },
  L: { shape: 'wheel', r: 1690, a: -22 },
  M: { shape: 'wheel', r: 1690, a: 22 },
  // the class mechanic, out on the rim past the keystones: only reachable through this sector
  R1: { shape: 'wheel', r: RIM_RADIUS, a: -9 },
  R2: { shape: 'fork', r: RIM_RADIUS, a: 9 },
};
const NOTABLES_PER_SHAPE: Record<Shape, number> = { line: 1, fork: 2, wheel: 3 };

type End = `${SlotId}.${Port}` | 'hub' | 'ks0' | 'ks1' | 'ksm';
/** paths inside a sector; each becomes a chain of travel nodes */
const PATHS: [End, End][] = [
  ['hub', 'I.entry'], ['hub', 'A.entry'], ['hub', 'B.entry'],
  ['A.out', 'C.entry'], ['I.out', 'D.entry'], ['B.out', 'E.entry'],
  ['C.right', 'D.entry'], ['E.left', 'D.entry'],
  ['C.out', 'F.entry'], ['D.left', 'G.entry'], ['E.out', 'H.entry'],
  ['F.left', 'L.entry'], ['F.right', 'J.entry'], ['H.left', 'K.entry'], ['H.right', 'M.entry'],
  ['G.left', 'R1.entry'], ['R1.right', 'R2.entry'], ['R1.out', 'ksm'], ['R2.left', 'ksm'], ['J.out', 'ks0'], ['L.right', 'ks0'], ['K.out', 'ks1'], ['M.left', 'ks1'],
];
/** paths from one sector to the next one clockwise */
const BRIDGES: [End, End][] = [['B.out', 'A.out'], ['E.right', 'C.left'], ['M.right', 'L.left']];

interface SectorSpec {
  key: ClassRegion;
  angle: number;
  startName: string;
  /** start node id (docs/CLASSES.md) */
  start: string;
  travel: StatMap;
  clusters: Record<SlotId, ClusterSpec>;
  keystones: { ks0: KeystoneSpec; ks1: KeystoneSpec; ksm: KeystoneSpec };
  /** optional fixed ids for keystones older saves and tests know */
  keystoneIds?: Partial<Record<'ks0' | 'ks1' | 'ksm', string>>;
}

const c = (id: string, mastery: MasteryTheme, small: [string, StatMap], ...notables: [string, StatMap][]): ClusterSpec => ({ id, mastery, small, notables });
/** rim clusters are a long walk from anywhere, so their numbers are half again as big */
const RIM_BONUS = 1.5;
const richer = (stats: StatMap): StatMap =>
  Object.fromEntries(
    Object.entries(stats).map(([k, v = 0]) => [k, Number.isInteger(v) ? Math.round(v * RIM_BONUS) : Math.round(v * RIM_BONUS * 100) / 100]),
  );
const mech = (mechanic: Mechanic, cl: ClusterSpec): ClusterSpec => ({
  ...cl,
  mechanic,
  small: [cl.small[0], richer(cl.small[1])],
  notables: cl.notables.map(([name, stats]) => [name, richer(stats)]),
});

const SECTORS: SectorSpec[] = [
  {
    key: 'str',
    angle: -90,
    startName: 'Warrior',
    start: 'class_str',
    travel: { str: 10 },
    clusters: {
      I: c('warpath', 'melee', ['Warpath', { meleePct: 5, life: 4 }],
        ['Battle-Hardened', { lifePct: 6, armourPct: 15 }],
        ['Cleaving Blows', { meleePct: 15, stunChance: 5 }],
        ['Second Wind', { lifeFlaskRecovery: 20, life: 15 }]),
      R1: mech('rage', c('rage', 'rage', ['Fury', { rageEffect: 5, physPct: 4 }],
        ['Seething', { rageMax: 5, physPct: 10 }],
        ['Blood Boil', { rageRegen: 0.1, life: 15 }],
        ['Unquenched', { rageDecay: 50, armourPct: 15 }])),
      A: c('iron_skin', 'armour', ['Toughened Hide', { armourPct: 12 }], ['Iron Skin', { armourPct: 30, armour: 40 }]),
      B: c('heart_of_stone', 'life', ['Vitality', { life: 8 }], ['Bloodline', { lifePct: 8, lifeRegen: 1.5 }]),
      C: c('brute_force', 'phys', ['Might', { physPct: 8 }],
        ['Brute Force', { physPct: 25, stunChance: 10 }],
        ['Crushing Blows', { stunDuration: 30, stunnedVuln: 10 }],
        ['Heavy Hands', { physMin: 2, physMax: 4 }]),
      D: c('warlord', 'buff', ['Command', { skillDuration: 6 }],
        ['Warlord', { skillDuration: 30, cooldownRecovery: 10 }],
        ['Battle Cry', { buffMore: 5, warCryHeal: 5 }]),
      E: c('bulwark', 'guard', ['Bulwark', { armourPct: 6, life: 4 }],
        ['Unyielding', { extraBlocks: 1 }],
        ['Shield Wall', { blockChance: 4, armour: 60 }],
        ['Stalwart', { guardDuration: 20, blockHeal: 2 }]),
      F: c('butcher', 'bleed', ['Laceration', { bleedPct: 10 }],
        ['Butcher', { bleedPct: 30, bleedDuration: 20 }],
        ['Rend', { bleedOnHit: 15, bleedVuln: 5 }]),
      G: c('ironclad', 'armour', ['Ironclad', { armour: 20, life: 4 }],
        ['Ironclad', { armourPct: 25, slamReduction: 6 }],
        ['Grit', { lifePct: 6, allRes: 4 }]),
      R2: mech('rage', c('wrath', 'rage', ['Wrath', { rageEffect: 6, life: 5 }],
        ['Bloodrage', { rageOnHitTaken: 1, lifePct: 6 }],
        ["Berserker's Toll", { rageMax: 10, rageEffect: 10 }])),
      H: c('juggernaut', 'life', ['Juggernaut', { life: 6, lifeRegen: 0.5 }],
        ['Juggernaut', { lifePct: 10, slamReduction: 8 }],
        ['Unstoppable', { lifeRegenPct: 0.4, stunChance: 5 }]),
      J: c('titan', 'melee', ["Titan's Grip", { meleePct: 8 }], ["Titan's Grip", { meleePct: 25, physMax: 3 }]),
      K: c('endurance', 'resist', ['Endurance', { allRes: 3 }], ['Iron Will', { allRes: 10, armourVsElem: 5 }]),
      L: c('colossus', 'phys', ['Brawn', { str: 6 }],
        ['Colossus', { str: 20, lifePct: 5 }],
        ['Might of the Mountain', { armourPct: 20, physPct: 10 }],
        ['Earthshaker', { stunChance: 10, meleePct: 15 }]),
      M: c('bloodsoaked', 'leech', ['Thirst', { lifeLeech: 0.2 }],
        ['Bloodsoaked', { lifeLeech: 0.8, life: 20 }],
        ['Gorge', { overkillHeal: 5, lifePct: 4 }],
        ['Crimson Tide', { bleedPct: 20, lifeLeech: 0.3 }]),
    },
    keystones: {
      ks0: { name: 'Unbreakable', stats: { armourMore: 60, attackSpeedMore: -15 }, desc: '60% more Armour. 15% less Attack Speed.' },
      ks1: { name: 'Blood Pact', stats: { bloodPact: 1 }, desc: 'Skills cost Life instead of Mana. You have no Mana.' },
      ksm: { name: 'Endless Fury', stats: { endlessFury: 1 }, desc: 'Rage no longer decays. Maximum Rage is halved.' },
    },
  },
  {
    key: 'duelist',
    angle: -30,
    startName: 'Duelist',
    start: 'class_strdex',
    travel: { str: 5, dex: 5 },
    clusters: {
      I: c('footwork', 'strdex', ['Footwork', { accuracy: 15, evasionPct: 4 }],
        ['Blade Dancer', { attackSpeedPct: 6, physPct: 10 }],
        ['Fencing Form', { accuracy: 60, critChancePct: 15 }],
        ['Steady Stance', { blockChance: 3, armourPct: 10 }]),
      R1: mech('riposte', c('riposte', 'riposte', ['Riposte', { ripostePct: 8, accuracy: 15 }],
        ['Counterpoint', { ripostePct: 30, blockChance: 2 }],
        ['Parry and Thrust', { riposteCooldown: 25, evasionPct: 10 }],
        ['Measured Reply', { riposteHeal: 2, armourPct: 10 }])),
      A: c('duelists_edge', 'strdex', ["Duelist's Edge", { str: 5, dex: 5 }], ['Swordmaster', { physPct: 20, attackSpeedPct: 5 }]),
      B: c('bloodletting', 'leech', ['Bloodletting', { lifeLeech: 0.3 }], ['Bloodthirst', { lifeLeech: 1, lifePct: 10 }]),
      C: c('gladiator', 'block', ['Shield Arm', { blockChance: 1 }],
        ['Gladiator', { blockChance: 5, blockHeal: 2 }],
        ['Arena Veteran', { armourPct: 15, evasionPct: 15 }],
        ['Crowd Pleaser', { overkillHeal: 3, attackSpeedPct: 4 }]),
      D: c('swordplay', 'speed', ['Swordplay', { attackSpeedPct: 2, accuracy: 15 }],
        ['Flurry', { attackSpeedPct: 8, repeatMore: 5 }],
        ['Precise Cuts', { accuracy: 80, critChancePct: 15 }]),
      E: c('cutthroat', 'bleed', ['Cutthroat', { physPct: 6 }],
        ['Lacerator', { bleedOnHit: 15, bleedPct: 20 }],
        ['Reaver', { physPct: 20, lowLifeDamage: 10 }],
        ['Exsanguinate', { bleedVuln: 5, bleedBossMore: 10 }]),
      F: c('brawler', 'armour', ['Scrapper', { armourPct: 6, evasionPct: 6 }],
        ['Scrapper', { armourPct: 20, evasionPct: 20 }],
        ['Dirty Fighting', { stunChance: 10, afterGuardDamage: 15 }]),
      G: c('tempo', 'speed', ['Tempo', { attackSpeedPct: 2 }],
        ['Flurry of Blows', { attackSpeedPct: 8, meleePct: 8 }],
        ['Killer Instinct', { critMulti: 15, lowLifeDamage: 10 }]),
      R2: mech('riposte', c('retort', 'riposte', ['Retort', { ripostePct: 10, life: 4 }],
        ["Fencer's Instinct", { riposteCrit: 30, critMulti: 10 }],
        ['Bloody Answer', { riposteBleed: 1, bleedPct: 15 }])),
      H: c('showman', 'crit', ['Showmanship', { critChancePct: 8 }],
        ['Flourish', { critChancePct: 25, critMulti: 10 }],
        ['Grand Finale', { critFullLife: 25, critMulti: 15 }]),
      J: c('steel_nerves', 'resist', ['Composure', { allRes: 3 }], ['Steel Nerves', { allRes: 10, life: 15 }]),
      K: c('agility', 'evasion', ['Agility', { dex: 8 }], ['Light on Feet', { evasionPct: 20, evadeSpeed: 5 }]),
      L: c('warmonger', 'melee', ['Warmonger', { meleePct: 6 }],
        ['Warmonger', { meleePct: 20, life: 20 }],
        ['Weapon Master', { physMin: 2, physMax: 5 }],
        ['Relentless', { attackSpeedPct: 6, lifeLeech: 0.3 }]),
      M: c('guarded_stance', 'guard', ['Guarded Stance', { guardDuration: 6 }],
        ['Guarded Stance', { guardDuration: 25, guardArmourPct: 10 }],
        ['Read the Blade', { guardCooldown: 15, evadeHeal: 2 }],
        ['Shield Bash', { blockChance: 3, stunChance: 8 }]),
    },
    keystones: {
      ks0: { name: 'Steady Hand', stats: { steadyHand: 1 }, desc: "Your hits always land. You can't deal critical strikes." },
      ks1: { name: 'Blade Waltz', stats: { attackSpeedMore: 15, armourMore: -30 }, desc: '15% more Attack Speed. 30% less Armour.' },
      ksm: { name: 'Perfect Form', stats: { perfectForm: 1 }, desc: 'Riposte has no cooldown. Ripostes deal 50% less damage.' },
    },
    keystoneIds: { ks0: 'duelist_ks' },
  },
  {
    key: 'dex',
    angle: 30,
    startName: 'Ranger',
    start: 'class_dex',
    travel: { dex: 10 },
    clusters: {
      I: c('fletching', 'projectile', ['Fletching', { projectilePct: 5 }],
        ['Deadeye', { projectilePct: 20, accuracy: 40 }],
        ['Quick Draw', { attackSpeedPct: 6, projectilePct: 6 }],
        ["Hunter's Mark", { critChancePct: 20, critMulti: 10 }]),
      R1: mech('momentum', c('momentum', 'momentum', ['Momentum', { momentumEffect: 5, attackSpeedPct: 1 }],
        ['Second Wind', { momentumMax: 3, evasionPct: 10 }],
        ['Sure-Footed', { momentumRetain: 25, accuracy: 30 }],
        ['Gathering Storm', { momentumEffect: 20, critChancePct: 10 }])),
      A: c('fleetfoot', 'evasion', ['Evasion', { evasionPct: 12 }], ['Fleetfoot', { evasionPct: 30, attackSpeedPct: 5 }]),
      B: c('precision', 'crit', ['Keen Eye', { critChancePct: 10, accuracy: 20 }], ['Precision', { critChancePct: 30, accuracy: 60 }]),
      C: c('executioner', 'critMulti', ['Lethality', { critMulti: 8 }],
        ['Executioner', { critMulti: 25 }],
        ['Killing Blow', { lowLifeDamage: 15, critMulti: 10 }],
        ['Mercy Stroke', { critLeech: 1, critChancePct: 15 }]),
      D: c('blade_dancer', 'speed', ['Swiftness', { attackSpeedPct: 3 }],
        ['Blade Dancer', { attackSpeedPct: 8 }],
        ['Twin Fangs', { dexSkillSpeed: 6, repeatMore: 6 }]),
      E: c('toxicologist', 'poison', ['Venom', { poisonPct: 10 }],
        ['Toxicologist', { poisonPct: 30, poisonDuration: 20 }],
        ['Virulence', { poisonDurationFlat: 1000, ailmentPct: 10 }],
        ['Paralytic', { poisonWeaken: 5, evasionPct: 10 }]),
      F: c('phantom', 'cooldown', ['Quickness', { cooldownRecovery: 4 }],
        ['Phantom', { guardDuration: 30, cooldownRecovery: 10 }],
        ['Vanishing Act', { smokeExtra: 500, afterGuardDamage: 15 }]),
      G: c('fleet', 'evasion', ['Fleet', { evasionPct: 8 }],
        ['Wind Runner', { evasionPct: 25, evadeSpeed: 4 }],
        ['Light Step', { evadeHeal: 2, dex: 10 }]),
      R2: mech('momentum', c('slipstream', 'momentum', ['Slipstream', { momentumEffect: 6, evasionPct: 4 }],
        ['Wind at Your Back', { momentumMax: 5, attackSpeedPct: 3 }],
        ['Untouchable', { momentumEvasion: 2, evasionPct: 10 }])),
      H: c('marksman', 'projectile', ['Marksman', { projectilePct: 8 }],
        ['Marksman', { projectilePct: 25, accuracy: 50 }],
        ['Far Shot', { projectilePct: 15, critChancePct: 15 }]),
      J: c('hunter', 'accuracy', ['Hunter', { accuracy: 25 }], ['Eagle Eye', { accuracy: 100, critMulti: 8 }]),
      K: c('wanderer', 'resist', ['Wanderer', { evasionPct: 5, allRes: 2 }], ['Weathered', { allRes: 10, evasionPct: 15 }]),
      L: c('acrobat', 'evasion', ['Acrobatics', { evasionPct: 8 }],
        ['Acrobatics', { evasion: 60, evasionPct: 25 }],
        ['Light Step', { evadeHeal: 2, evadeSpeed: 5 }],
        ['Blur', { attackSpeedPct: 5, evasionPct: 10 }]),
      M: c('trickster', 'accuracy', ['Nimble', { dex: 6 }],
        ['Nimble', { dex: 20, attackSpeedPct: 3 }],
        ["Hawk's Talon", { critChancePct: 20, accuracy: 40 }],
        ['Fleet Arrows', { projectilePct: 15, attackSpeedPct: 4 }]),
    },
    keystones: {
      ks0: { name: 'Glass Edge', stats: { critMulti: 80, lifeMore: -25 }, desc: '+80% Critical Strike Multiplier. 25% less maximum Life.' },
      ks1: { name: 'Wind Dancer', stats: { windDancer: 1, armourMore: -40 }, desc: 'Evasion can dodge boss wind-ups. 40% less Armour.' },
      ksm: { name: 'Perpetual Motion', stats: { perpetualMotion: 1 }, desc: "Taking a hit doesn't halve Momentum. Momentum decays by 1 per second instead." },
    },
  },
  {
    key: 'shadow',
    angle: 90,
    startName: 'Shadow',
    start: 'class_dexint',
    travel: { dex: 5, int: 5 },
    clusters: {
      I: c('killing_intent', 'crit', ['Killing Intent', { critChancePct: 6 }],
        ["Assassin's Mark", { critChancePct: 25, critFullLife: 15 }],
        ['Cruel Edge', { critMulti: 15 }],
        ['Opportunist', { lowLifeDamage: 15, accuracy: 40 }]),
      R1: mech('malice', c('malice', 'malice', ['Malice', { coupPct: 6, ailmentPct: 4 }],
        ['Patience', { maliceMax: -3, evasionPct: 10 }],
        ['Twist the Knife', { coupPct: 40, critMulti: 5 }],
        ['Spite', { maliceCritKeep: 5, critChancePct: 10 }])),
      A: c('saboteur', 'ailment', ['Saboteur', { dex: 5, int: 5 }], ['Saboteur', { poisonPct: 20, ignitePct: 20 }]),
      B: c('spellblade', 'elemental', ['Spellblade', { elemPct: 6 }], ['Spellblade', { elemPct: 20, attackSpeedPct: 4 }]),
      C: c('assassin', 'critMulti', ['Assassin', { critChancePct: 8 }],
        ['Assassinate', { critMulti: 20, lowLifeDamage: 10 }],
        ['Backstab', { critFullLife: 25, critChancePct: 15 }],
        ['Shadowstep', { evasionPct: 15, afterGuardDamage: 10 }]),
      D: c('plaguebearer', 'poison', ['Plague', { poisonPct: 8 }],
        ['Plaguebearer', { poisonPct: 25, multiAilmentVuln: 5 }],
        ['Festering', { poisonDurationFlat: 1000, poisonWeaken: 5 }]),
      E: c('hexblade', 'elemental', ['Hexblade', { elemPct: 6 }],
        ['Storm Blade', { physAsLight: 5, lightPct: 15 }],
        ['Frozen Edge', { coldPct: 20, chillOnHit: 8 }],
        ['Burning Edge', { firePct: 20, ignitePct: 15 }]),
      F: c('trickery', 'es', ['Trickery', { evasionPct: 5, energyShieldPct: 5 }],
        ['Shadow Veil', { evasionPct: 20, energyShieldPct: 20 }],
        ['Mirage', { esRechargePct: 25, evadeHeal: 1 }]),
      G: c('venom', 'poison', ['Venom', { poisonPct: 6 }],
        ['Toxic Strikes', { poisonPct: 25, poisonDurationFlat: 500 }],
        ['Debilitate', { poisonWeaken: 5, ailmentPct: 10 }]),
      R2: mech('malice', c('ill_intent', 'malice', ['Ill Intent', { coupPct: 8, poisonPct: 4 }],
        ['Opportunist', { coupAilment: 1, poisonPct: 10 }],
        ['Grudge', { maliceOnHitTaken: 1, evasionPct: 10 }])),
      H: c('infuser', 'ailment', ['Cruelty', { ailmentPct: 8 }],
        ['Cruel Methods', { ailmentPct: 25 }],
        ['Slow Death', { ailmentDuration: 20, multiAilmentVuln: 5 }]),
      J: c('nightstalker', 'crit', ['Nightstalker', { dex: 4, int: 4 }], ['Nightstalker', { critChancePct: 20, castSpeedPct: 4 }]),
      K: c('ignition', 'fire', ['Ignition', { ignitePct: 10 }], ['Immolate', { ignitePct: 30, igniteDuration: 15 }]),
      L: c('cutpurse', 'rarity', ['Cutpurse', { itemRarity: 4 }],
        ['Cutpurse', { itemRarity: 15, dex: 10 }],
        ['Fence', { itemRarity: 10, int: 10 }],
        ['Treasure Hunter', { itemRarity: 20 }]),
      M: c('hexer', 'spell', ['Hexcraft', { spellCritPct: 8 }],
        ['Hex Master', { spellCritPct: 25, spellCritMulti: 10 }],
        ['Dark Pact', { spellPct: 15, lifeLeech: 0.3 }],
        ['Malevolence', { castSpeedPct: 5, spellPct: 10 }]),
    },
    keystones: {
      ks0: { name: 'Arcane Recursion', stats: { arcaneRecursion: 1 }, desc: 'Cooldowns recover 40% faster. Skills cost 50% more Mana.' },
      ks1: { name: 'Venomous Soul', stats: { ailmentPct: 60, lifeMore: -15 }, desc: '60% increased damage with ailments. 15% less maximum Life.' },
      ksm: { name: 'Thousand Cuts', stats: { thousandCuts: 1 }, desc: 'Critical strikes also add Malice instead of emptying it. Coup de Grâce deals 200% damage instead of 400%.' },
    },
    keystoneIds: { ks0: 'shadow_ks' },
  },
  {
    key: 'int',
    angle: 150,
    startName: 'Mage',
    start: 'class_int',
    travel: { int: 10 },
    clusters: {
      I: c('arcana', 'spell', ['Arcana', { spellPct: 5 }],
        ['Spellweaver', { spellPct: 20, castSpeedPct: 4 }],
        ['Quickened Mind', { castSpeedPct: 8 }],
        ['Focused Will', { spellCritMulti: 15, mana: 15 }]),
      R1: mech('manaPower', c('mana_is_power', 'manaPower', ['Reservoir', { manaPower: 2, mana: 8 }],
        ['Wellspring', { manaPower: 5, manaPct: 15 }],
        ['Brimming', { manaPowerFull: 10, manaRegenPct: 10 }],
        ['Overflow', { manaPower: 3, manaRegenPct: 30 }])),
      A: c('pyromancer', 'fire', ['Kindling', { firePct: 10 }], ['Pyromancer', { firePct: 25, ignitePct: 20 }]),
      B: c('frostweaver', 'cold', ['Rime', { coldPct: 10 }], ['Frostweaver', { coldPct: 25, shieldEffect: 20 }]),
      C: c('stormcaller', 'light', ['Static', { lightPct: 10 }],
        ['Stormcaller', { lightPct: 25, extraChains: 1 }],
        ['Overcharge', { chainMore: 8, lightCrit: 15 }],
        ['Static Field', { lightPct: 15, castSpeedPct: 3 }]),
      D: c('arcane_flow', 'mana', ['Arcane Flow', { mana: 12, manaRegenPct: 10 }],
        ['Arcane Flow', { manaRegenPct: 40, manaCostReduction: 10 }],
        ['Clarity', { manaRegenFlat: 1.5, mana: 20 }]),
      E: c('spellweaver', 'cast', ['Incantation', { castSpeedPct: 3 }],
        ['Spellweaver', { castSpeedPct: 8, spellCritPct: 20 }],
        ['Echoes', { repeatMore: 10, spellPct: 10 }],
        ['Arcane Focus', { spellPct: 20, mana: 15 }]),
      F: c('distiller', 'flask', ['Distillation', { flaskEffect: 5 }],
        ['Master Distiller', { flaskEffect: 15, flaskCharges: 20 }],
        ['Potent Brews', { lifeFlaskRecovery: 20, manaFlaskRecovery: 20 }]),
      G: c('aegis', 'es', ['Aegis', { energyShieldPct: 6 }],
        ['Arcane Aegis', { energyShieldPct: 25, esRechargePct: 15 }],
        ['Warding Runes', { energyShield: 30, allRes: 4 }]),
      R2: mech('manaPower', c('deep_reserves', 'manaPower', ['Deep Reserves', { mana: 10, manaRegenPct: 6 }],
        ['Font of Power', { manaPower: 8, mana: 20 }],
        ['Soul Battery', { manaPowerEs: 1, energyShieldPct: 15 }])),
      H: c('eldritch', 'es', ['Eldritch Ward', { energyShieldPct: 8 }],
        ['Arcane Barrier', { energyShieldPct: 25, energyShield: 20 }],
        ['Quick Recovery', { esRechargePct: 30, energyShieldPct: 10 }]),
      J: c('elementalist', 'elemental', ['Elementalist', { elemPct: 8 }], ['Elementalist', { elemPct: 25, allRes: 5 }]),
      K: c('sage', 'mana', ['Sage', { int: 8 }], ['Sage', { int: 25, mana: 10 }]),
      L: c('conjurer', 'cold', ['Conjuration', { shieldEffect: 6 }],
        ['Ice Ward', { shieldEffect: 20, coldPct: 10 }],
        ['Arcane Shell', { mindOverFlesh: 10, mana: 15 }],
        ['Resilient Wards', { shieldEffect: 15, energyShield: 25 }]),
      M: c('pyre', 'fire', ['Pyre', { firePct: 6 }],
        ['Inferno', { firePct: 20, ignitePct: 15 }],
        ['Spreading Flames', { igniteSpread: 1, igniteDuration: 10 }],
        ['Cinders', { ignitePct: 25 }]),
    },
    keystones: {
      ks0: { name: "Alchemist's Covenant", stats: { flaskEffect: 50, flaskCharges: 50, lifeMore: -10 }, desc: '50% increased Flask Effect and Charges gained. 10% less maximum Life.' },
      ks1: { name: 'Mind over Flesh', stats: { mindOverFlesh: 30 }, desc: '30% of damage is taken from Mana before Life.' },
      ksm: { name: 'All or Nothing', stats: { allOrNothing: 1 }, desc: 'Mana is Power gives 60% more damage while above 80% Mana, and nothing below.' },
    },
  },
  {
    key: 'templar',
    angle: 210,
    startName: 'Templar',
    start: 'class_strint',
    travel: { int: 5, str: 5 },
    clusters: {
      I: c('devotion', 'elemental', ['Devotion', { elemPct: 5 }],
        ['Divine Fury', { elemPct: 20, firePct: 5 }],
        ['Sanctified', { allRes: 6, lifePct: 4 }],
        ['Zeal of Faith', { castSpeedPct: 4, elemPct: 8 }]),
      R1: mech('martyr', c('martyr', 'martyr', ['Penitence', { novaPct: 8, life: 4 }],
        ['Devotion', { fervorPct: 15, allRes: 5 }],
        ['Holy Light', { novaHeal: 10, lifeRegen: 1 }],
        ['Divine Wrath', { novaPct: 40, elemPct: 5 }])),
      A: c('zealot', 'strint', ['Zeal', { int: 5, str: 5 }], ['Zealot', { lifeRegen: 3, elemPct: 15 }]),
      B: c('warding', 'resist', ['Warding', { allRes: 4 }], ['Elemental Warding', { allRes: 12, life: 20 }]),
      C: c('inquisitor', 'elemental', ['Inquisition', { elemPct: 5, critChancePct: 5 }],
        ['Inquisition', { elemPct: 15, critChancePct: 15 }],
        ['Righteous Fire', { firePct: 20, lifeRegen: 1 }],
        ['Judgement', { lowLifeDamage: 15, critMulti: 10 }]),
      D: c('guardian', 'es', ['Sacred Plate', { armourPct: 6, energyShieldPct: 6 }],
        ['Sacred Bastion', { armourPct: 20, energyShieldPct: 20 }],
        ['Unwavering Faith', { slamReduction: 8, elemTakenReduction: 4 }]),
      E: c('hierophant', 'spell', ['Sermon', { spellPct: 6 }],
        ['Sermon', { spellPct: 20, manaRegenPct: 15 }],
        ['Litany', { castSpeedPct: 5, manaCostReduction: 6 }],
        ['Sacred Words', { mana: 25, elemPct: 10 }]),
      F: c('crusader', 'melee', ['Crusade', { meleePct: 5, elemPct: 4 }],
        ['Crusader', { physAsLight: 6, meleePct: 15 }],
        ['Hammer of Faith', { stunChance: 10, stunnedVuln: 8 }]),
      G: c('faith', 'resist', ['Faith', { allRes: 2, armourPct: 4 }],
        ['Bastion of Faith', { allRes: 8, elemTakenReduction: 4 }],
        ['Light of Grace', { lifeRegen: 3, lifePct: 5 }]),
      R2: mech('martyr', c('penance', 'martyr', ['Penance', { fervorPct: 5, armourPct: 4 }],
        ['Sanctified Wounds', { fervorPct: 15, armourPct: 15 }],
        ['Radiance', { novaEs: 20, energyShieldPct: 10 }])),
      H: c('purity', 'resist', ['Purity', { allRes: 3 }],
        ['Purity of Flesh', { allRes: 10, elemTakenReduction: 3 }],
        ['Cleansing Light', { lifeRegenPct: 0.3, allRes: 5 }]),
      J: c('consecrated', 'life', ['Consecration', { lifeRegen: 1 }], ['Consecrated Ground', { lifeRegen: 4, lifePct: 5 }]),
      K: c('oathkeeper', 'strint', ['Oath', { str: 4, int: 4 }], ['Oathkeeper', { life: 25, mana: 25 }]),
      L: c('benediction', 'buff', ['Blessing', { skillDuration: 5 }],
        ['Benediction', { buffMore: 5, skillDuration: 15 }],
        ['Blessed Ward', { shieldEffect: 20, guardDuration: 10 }],
        ['Prayer of Haste', { cooldownRecovery: 10, castSpeedPct: 3 }]),
      M: c('stormfaith', 'light', ['Stormfaith', { lightPct: 6 }],
        ['Storm of Judgement', { lightPct: 20, extraChains: 1 }],
        ['Thunderous Faith', { lightCrit: 15, lightPct: 10 }],
        ["Sky's Wrath", { chainMore: 6, elemPct: 10 }]),
    },
    keystones: {
      ks0: { name: 'Bastion', stats: { bastion: 1 }, desc: 'Your Evasion Rating is converted to Armour.' },
      ks1: { name: 'Sacred Oath', stats: { allRes: 15, attackSpeedMore: -10 }, desc: '+15% to all Elemental Resistances. 10% less Attack Speed.' },
      ksm: { name: "Saint's Sacrifice", stats: { saintsSacrifice: 1 }, desc: 'Fervor fills twice as fast. The holy nova no longer heals you.' },
    },
    keystoneIds: { ks0: 'templar_ks' },
  },
];

/** The shared centre every class can reach: a ring of all-attribute nodes and six notables. */
const CROSSING: [string, StatMap][] = [
  ["Castaway's Grit", { life: 20, allRes: 4 }],
  ['Salt and Steel', { physPct: 12, accuracy: 30 }],
  ['Tidecaller', { elemPct: 12, evasionPct: 6 }],
  ['Scavenger', { itemRarity: 10, flaskCharges: 10 }],
  ['Driftwood Wisdom', { mana: 20, manaRegenPct: 10 }],
  ['Jack of All Trades', { allAttr: 8 }],
];

/**
 * Forbidden keystones: absurdly strong, with a side effect to build around. Equally spaced on the
 * sector borders past the rim, each at the end of a long road off the outer bridge.
 */
const FORBIDDEN: (KeystoneSpec & { id: string; angle: number })[] = [
  {
    id: 'forbidden_overclock', angle: 0, name: 'Overclock',
    stats: { overclock: 1 },
    desc: 'Your skills have no cooldowns and cost nothing. Every 8 seconds of fighting you overheat and can’t act for 2 seconds.',
  },
  {
    id: 'forbidden_knifes_edge', angle: 120, name: "Knife's Edge",
    stats: { knifesEdge: 1 },
    desc: 'Your hits can’t be evaded and are always Mega Crits (400% damage, ignores critical multiplier). Your maximum Life is 1.',
  },
  {
    id: 'forbidden_eternal_hunger', angle: 240, name: 'Eternal Hunger',
    stats: { eternalHunger: 1 },
    desc: 'You can’t die while your Hunger is fed. Every kill feeds it for 5 seconds. If it starves while enemies are near, you die.',
  },
];

// ---------- building the graph ----------

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (r: number, deg: number) => ({ x: Math.round(r * Math.cos(rad(deg))), y: Math.round(r * Math.sin(rad(deg))) });

function build(): PassiveNode[] {
  const nodes: Record<string, PassiveNode> = {};
  const add = (n: Omit<PassiveNode, 'links' | 'stats'> & { stats?: StatMap }) => (nodes[n.id] = { stats: {}, ...n, links: [] });
  const link = (a: string, b: string) => {
    if (!nodes[a].links.includes(b)) nodes[a].links.push(b);
    if (!nodes[b].links.includes(a)) nodes[b].links.push(a);
  };
  /** link two nodes through travel nodes, one roughly every 80 units */
  const path = (a: string, b: string, region: TreeRegion, stats: StatMap) => {
    const A = nodes[a];
    const B = nodes[b];
    const steps = Math.max(1, Math.round(Math.hypot(B.x - A.x, B.y - A.y) / 80));
    let prev = a;
    for (let i = 1; i < steps; i++) {
      const id = `t_${a}_${b}_${i}`;
      const f = i / steps;
      add({ id, name: 'Attribute', kind: 'travel', region, x: Math.round(A.x + (B.x - A.x) * f), y: Math.round(A.y + (B.y - A.y) * f), stats });
      link(prev, id);
      prev = id;
    }
    link(prev, b);
  };

  /** lay out one cluster around (r, angle); returns its ports */
  const cluster = (region: TreeRegion, spec: ClusterSpec, shape: Shape, r: number, angle: number, side: number): Record<Port, string> => {
    if (spec.notables.length !== NOTABLES_PER_SHAPE[shape]) throw new Error(`${spec.id}: a ${shape} needs ${NOTABLES_PER_SHAPE[shape]} notables`);
    const { x: cx, y: cy } = polar(r, angle);
    const u = { x: Math.cos(rad(angle)), y: Math.sin(rad(angle)) }; // outward
    const v = { x: -u.y, y: u.x }; // clockwise
    const at = (du: number, dv: number) => ({ x: Math.round(cx + u.x * du + v.x * dv), y: Math.round(cy + u.y * du + v.y * dv) });
    const base = { region, cluster: spec.id, mechanic: spec.mechanic };
    let si = 0;
    let ni = 0;
    const one = shape === 'line';
    const node = (kind: 'small' | 'notable', p: { x: number; y: number }) => {
      if (kind === 'small') {
        const id = `${spec.id}_s${++si}`;
        add({ ...base, id, name: spec.small[0], kind, ...p, stats: spec.small[1] });
        return id;
      }
      const [name, stats] = spec.notables[ni++];
      const id = one ? `${spec.id}_n` : `${spec.id}_n${ni}`;
      add({ ...base, id, name, kind, ...p, stats });
      return id;
    };
    const chain = (ids: string[]) => ids.slice(1).forEach((id, i) => link(ids[i], id));
    const mastery = (p: { x: number; y: number }, notable: string) => {
      const id = `${spec.id}_m`;
      add({ ...base, id, name: `${spec.notables[0][0]} Mastery`, kind: 'mastery', ...p, options: MASTERIES[spec.mastery] });
      link(notable, id);
    };

    if (shape === 'line') {
      const ids = [-75, -25, 25].map((du) => node('small', at(du, 0)));
      const n = node('notable', at(75, 0));
      chain([...ids, n]);
      mastery(at(55, 48 * side), n);
      return { entry: ids[0], out: n, left: n, right: n };
    }
    if (shape === 'fork') {
      const entry = node('small', at(-75, 0));
      const arm = (side: number) => {
        const a = [node('small', at(-25, 45 * side)), node('small', at(25, 65 * side))];
        const n = node('notable', at(75, 70 * side));
        chain([entry, ...a, n]);
        return n;
      };
      const left = arm(-1);
      const right = arm(1);
      mastery(at(45, 0), left);
      return { entry, out: right, left, right };
    }
    // wheel: 8 around a centre mastery, slot 0 facing inward; notables at 3, 5 and 7
    const ring = Array.from({ length: 8 }, (_, i) => {
      const a = rad(180 + i * 45);
      return node(i === 3 || i === 5 || i === 7 ? 'notable' : 'small', at(Math.cos(a) * 85, Math.sin(a) * 85));
    });
    chain([...ring, ring[0]]);
    mastery(at(0, 0), ring[3]);
    return { entry: ring[0], left: ring[2], out: ring[4], right: ring[6] };
  };

  // the shared centre
  const ringIds = SECTORS.map((sec, i) => {
    const id = `crossing_${sec.key}`;
    add({ id, name: "Exile's Crossing", kind: 'travel', region: 'center', ...polar(210, sec.angle), stats: { allAttr: 3 } });
    const nid = `crossing_n${i}`;
    add({ id: nid, name: CROSSING[i][0], kind: 'notable', region: 'center', ...polar(210, sec.angle + 30), stats: CROSSING[i][1] });
    return [id, nid];
  });
  ringIds.forEach(([id, nid], i) => {
    link(id, nid);
    link(nid, ringIds[(i + 1) % ringIds.length][0]);
  });

  const ports: Record<string, Record<string, string>> = {};
  for (const sec of SECTORS) {
    add({ id: sec.start, name: sec.startName, kind: 'start', region: sec.key, ...polar(380, sec.angle) });
    const hub = `${sec.key}_hub`;
    add({ id: hub, name: 'Attribute', kind: 'travel', region: sec.key, ...polar(470, sec.angle), stats: sec.travel });
    link(sec.start, hub);
    path(sec.start, `crossing_${sec.key}`, sec.key, sec.travel);

    const p: Record<string, string> = { hub };
    for (const [slot, def] of Object.entries(SLOTS) as [SlotId, (typeof SLOTS)[SlotId]][]) {
      const got = cluster(sec.key, sec.clusters[slot], def.shape, def.r, sec.angle + def.a, -Math.sign(def.a) || 1);
      for (const [port, id] of Object.entries(got)) p[`${slot}.${port}`] = id;
    }
    const KS_AT = { ks0: [1930, -12], ks1: [1930, 12], ksm: [RIM_RADIUS + 210, 0] } as const;
    for (const k of ['ks0', 'ks1', 'ksm'] as const) {
      const ks = sec.keystones[k];
      const id = sec.keystoneIds?.[k] ?? `${sec.key}_${k}`;
      add({
        id, name: ks.name, kind: 'keystone', region: sec.key, ...polar(KS_AT[k][0], sec.angle + KS_AT[k][1]),
        stats: ks.stats, desc: ks.desc, mechanic: k === 'ksm' ? sec.clusters.R1.mechanic : undefined,
      });
      p[k] = id;
    }
    for (const [a, b] of PATHS) path(p[a], p[b], sec.key, sec.travel);
    ports[sec.key] = p;
  }
  SECTORS.forEach((sec, i) => {
    const next = SECTORS[(i + 1) % SECTORS.length];
    for (const [a, b] of BRIDGES) path(ports[sec.key][a], ports[next.key][b], sec.key, { ...sec.travel });
  });

  // forbidden keystones hang off the travel node of the outer bridge nearest their border
  for (const f of FORBIDDEN) {
    add({ id: f.id, name: f.name, kind: 'keystone', region: 'forbidden', ...polar(2160, f.angle), stats: f.stats, desc: f.desc });
    const near = polar(1650, f.angle);
    const from = Object.values(nodes)
      .filter((n) => n.kind === 'travel')
      .reduce((a, b) => (Math.hypot(a.x - near.x, a.y - near.y) <= Math.hypot(b.x - near.x, b.y - near.y) ? a : b));
    path(from.id, f.id, 'forbidden', { allAttr: 2 });
  }

  return Object.values(nodes);
}

export const PASSIVE_NODES: PassiveNode[] = build();
export const PASSIVE_BY_ID: Record<string, PassiveNode> = Object.fromEntries(PASSIVE_NODES.map((n) => [n.id, n]));

export const CLASS_SECTORS = SECTORS.map((s) => ({ key: s.key, angle: s.angle, start: s.start, name: s.startName }));

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
