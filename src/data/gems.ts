import { RINGS, type AreaShape } from '../engine/battlefield';
import type { WeaponFamily } from './bases';
import type { DamageType, GroundKind, StatKey } from '../engine/types';

export type GemAttr = 'str' | 'dex' | 'int';
/**
 * What a skill does, which decides the supports that fit it. `hit`: it deals damage when used (damage
 * supports need this, so they never fit a shield or a mana refill). `cast`: a spell with a cast time,
 * the only kind Faster Casts speeds up. `duration`: something it does lasts, so Lingering stretches it.
 * `bleed`: it opens a bleed of its own. `blood`: it spends Life when used. `heavy`: it winds up first and lands at the
 * end, can't miss, and is never lost to a dead target (combat.ts `startWindup`). `shield`: it raises an absorb shield.
 * `minion`: it calls minions, whose hits are the skill's damage. `storm`: it leaves a storm on the field, whose strikes
 * are the skill's damage.
 */
export type GemTag = 'attack' | 'spell' | 'melee' | 'projectile' | 'area' | 'chain' | 'duration' | 'guard' | 'buff' | 'curse' | 'movement' | 'dot' | 'sustain' | 'hit' | 'cast' | 'bleed' | 'blood' | 'heavy' | 'shield' | 'minion' | 'storm';
export type SkillRole = 'main' | 'burst' | 'area' | 'guard' | 'buff' | 'curse' | 'sustain' | 'summon';

/** What a skill does when it fires. Numbers are at gem level 1. */
export interface SkillEffect {
  /** attacks: % of weapon damage per hit */
  weaponPct?: number;
  /** spells: base damage range */
  base?: [number, number];
  /** spells: element of the base damage */
  type?: DamageType;
  /** hits per use (Twin Strike) */
  hits?: number;
  /** 'single' hits the target, 'all' the whole pack, 'chain' the target plus N others (each hop to the nearest) */
  targets?: 'single' | 'all' | 'chain';
  chains?: number;
  /** where on the battlefield the hit lands around the target (engine/battlefield.ts); overrides targets */
  area?: AreaShape;
  /** size of a splash (steps around the target) or nova (rings around you) */
  radius?: number;
  /** leaves hazardous ground on cells it hits: damage per second as % of the hit on the target */
  ground?: { kind: GroundKind; pctPerSec: number; durationMs: number; area?: AreaShape };
  /** shoves melee range back a ring */
  knockback?: boolean;
  /** base crit chance for spells */
  crit?: number;
  stunChance?: number;
  /** how long its stuns hold a normal enemy, default 1s; bosses always 0.4s */
  stunMs?: number;
  /** what each stun adds to a boss's Stagger, default STAGGER_PER_STUN (combat.ts) */
  stagger?: number;
  /** % more damage against stunned enemies */
  moreVsStunned?: number;
  ailment?: { kind: 'bleed' | 'poison'; pctPerSec: number; durationMs: number };
  /** % chance its fire burns, cold chills and lightning shocks (engine: `applyElementAilments`) */
  ailmentChance?: number;
  /** guard: block this many hits */
  blocks?: number;
  /** guard: evade everything for this long */
  evadeMs?: number;
  /** spends this % of maximum life on use, past energy shield: supports' cost multipliers raise it, and rules stop short of LIFE_RESERVE_PCT */
  lifePct?: number;
  /** spells: adds this % of the life spent to the hit, as the skill's element */
  lifeToDamage?: number;
  /** cashes in the target's bleed: its remaining damage lands at once, and this % of that comes back as life, up to 25% of maximum life */
  consumeBleed?: number;
  /** guard: absorb shield as % of max life */
  shieldPct?: number;
  /** guard: the shield also counts maximum energy shield */
  shieldEs?: boolean;
  /** adds this % of your current shield to the hit: physical damage on an attack, the skill's element on a spell */
  shieldToDamage?: number;
  /** heavy: adds this % of the damage you took during the wind-up to the blow, shields included, as physical damage */
  storedToDamage?: number;
  /** every other spell on the bar that's ready fires with it, for free and at no time, at this % of its damage */
  decree?: number;
  /** guard/buff: timed stats and more-damage; regenPct is % of max life per second (negative drains, never below 1 life); outpace burns out hazards under you like running does */
  buff?: { durationMs: number; stats?: Partial<Record<StatKey, number>>; moreDamage?: number; regenPct?: number; outpace?: boolean };
  /** movement: leaves any hazard under you behind */
  stepOut?: boolean;
  /** movement: drags the target up to melee range, as you ride it down (bosses stand their ground) */
  charge?: boolean;
  /** drags everything it hits this many rings toward you (bosses stand their ground) */
  drag?: number;
  /** calls minions, who deal the skill's hit themselves instead of the skill dealing it */
  minion?: {
    name: string;
    /** the monster art it wears */
    art: string;
    /** how many the gem keeps up */
    count: number;
    /** its life, as % of your maximum life at gem level 1 */
    lifePct: number;
    /** time between its hits */
    attackMs: number;
    /** steps it can hit across */
    reach: number;
    /** monsters in reach swing at it before anything else */
    taunts?: boolean;
    /** takes this % of each hit that lands on you, before your shield and energy shield */
    shares?: number;
    /** gone after this long; without it, a minion stays until it falls or you leave the area */
    durationMs?: number;
  };
  /** leaves a storm on the field, which deals the skill's hit to everything in its area every `everyMs` */
  storm?: {
    everyMs: number;
    durationMs: number;
    /** how many the gem keeps up: a new one past this blows out the oldest */
    max: number;
    /** walks a step toward the nearest enemy with each strike */
    drift?: boolean;
    /** draws what's in it a step toward the centre with each strike */
    pull?: boolean;
    /** stays around you rather than on the target, over the rings in `radius` */
    anchored?: boolean;
    /** also strikes each time you use an attack */
    onAttack?: boolean;
    /** blows out when your shield goes */
    whileShield?: boolean;
  };
  /** curses enemies where it lands (see `area`): an enemy carries one curse at a time, and bosses take half its effect */
  curse?: {
    durationMs: number;
    /** % increased physical damage taken */
    physTaken?: number;
    /** points off every elemental resistance */
    resPen?: number;
    /** % less damage dealt by its hits */
    dealLess?: number;
    /** % slower attacks, wind-ups and walking */
    slow?: number;
    /** % increased damage taken from bleeding */
    bleedTaken?: number;
    /** % longer stuns and % more Stagger */
    stunTaken?: number;
    /** keeps count of all damage the enemy takes, and this % of it lands again when the curse ends */
    warrant?: number;
  };
  /** attacks: this % of physical damage is converted to another type (and scales with that type's increases) */
  convert?: { type: DamageType; pct: number };
  /** % more damage against enemies with an ailment (bleed, poison, ignite, chill or freeze) */
  moreVsAiling?: number;
  /** chills enemies hit for this long, slowing their attacks */
  chillMs?: number;
  /** restores this % of maximum mana on use */
  restoreManaPct?: number;
  /** War Cry: cancels a boss wind-up */
  interrupts?: boolean;
  /** Arcane Siphon: % of damage returned as life / mana */
  leechLife?: number;
  leechMana?: number;
}

export interface ActiveGemDef {
  id: string;
  name: string;
  attr: GemAttr;
  role: SkillRole;
  tags: GemTag[];
  manaCost: number;
  /** 0 for single-target attacks, which PoE-style are limited only by their mana cost; guards, buffs, spells and area skills keep one */
  cooldownMs: number;
  /**
   * Base time to use the skill, ms. Attacks: attack time, sped up by weapon and attack speed.
   * Spells and utility: cast time, sped up by cast speed. 0 = instant: most spells are instant
   * and limited by their cooldown; only big wind-up spells (Fireball, Glacial Lance) have a cast time.
   */
  timeMs: number;
  effect: SkillEffect;
  /** how many rings out it reaches: default melee attacks 1, everything else the whole field */
  range?: number;
  /** the main-hand weapons it can be used with; any weapon when left out */
  weapons?: WeaponFamily[];
  desc: string;
  color: string;
  /** the suggested automation rule, offered in the rule editor (gems themselves start Manual only) */
  defaultRule: TacticRule;
}

/** Weapon families by what they're good for (docs/design/BATTLEFIELD.md §7). */
const SLAM_WEAPONS: WeaponFamily[] = ['mace', 'axe', 'sceptre', 'staff'];
const STRIKE_WEAPONS: WeaponFamily[] = ['sword', 'axe', 'dagger', 'mace', 'sceptre'];
const HEAVY_WEAPONS: WeaponFamily[] = ['sword', 'axe', 'mace', 'sceptre', 'staff'];
const BOW: WeaponFamily[] = ['bow'];
const CHARGE_WEAPONS: WeaponFamily[] = ['sword', 'axe', 'dagger', 'mace', 'sceptre', 'staff'];
/** spells can only be cast with a wand, staff or sceptre in the main hand (curses work with anything) */
export const CASTER_WEAPONS: WeaponFamily[] = ['wand', 'staff', 'sceptre'];

/** The main-hand weapons a skill can be used with: its own list, or any caster weapon for a spell other than a curse; undefined = any weapon. */
export function gemWeapons(def: Pick<ActiveGemDef, 'weapons' | 'tags'>): WeaponFamily[] | undefined {
  return def.weapons ?? (def.tags.includes('spell') && !def.tags.includes('curse') ? CASTER_WEAPONS : undefined);
}

export type RuleCondition =
  | 'always'
  | 'manual'
  | 'enemyCasting'
  | 'enemyChannels'
  | 'onGround'
  | 'frostbite'
  | 'lifeBelow'
  | 'lifeAbove'
  | 'manaAbove'
  | 'manaBelow'
  | 'enemiesAtLeast'
  | 'targetLifeAbove'
  | 'notActive'
  | 'bossOnly'
  | 'meterFull'
  | 'targetHas'
  | 'targetLacks';

/** What a rule can check on the current target. */
export type TargetStatus = 'bleeding' | 'poisoned' | 'ignited' | 'stunned' | 'frozen' | 'chilled' | 'shocked' | 'armourBroken' | 'cursed';

export const TARGET_STATUSES: { id: TargetStatus; label: string }[] = [
  { id: 'bleeding', label: 'Bleed' },
  { id: 'poisoned', label: 'Poison' },
  { id: 'ignited', label: 'Ignite' },
  { id: 'stunned', label: 'Stun' },
  { id: 'frozen', label: 'Freeze' },
  { id: 'chilled', label: 'Chill' },
  { id: 'shocked', label: 'Shock' },
  { id: 'armourBroken', label: 'Broken armour' },
  { id: 'cursed', label: 'Curse' },
];

export interface TacticRule {
  when: RuleCondition;
  value?: number;
  /** for targetHas / targetLacks */
  status?: TargetStatus;
  /** for onGround */
  ground?: GroundKind;
  /** where this rule sends the skill, ahead of the bar's targeting; the first rule that sets one decides */
  aim?: SkillAim;
}

/** What a rule can aim a skill at. Later moments (a weak point, a choir add) each add their own. */
export type SkillAim = 'martyrs';

export const SKILL_AIMS: { id: SkillAim; label: string }[] = [{ id: 'martyrs', label: 'Chained martyrs' }];

/** Reactive rules come in groups, each unlocked at the War Table. Rules outside a group are simple and free. */
export type RuleUnlock = 'vitals' | 'status' | 'ground' | 'windups' | 'aim';

export const RULE_UNLOCK_NAMES: Record<RuleUnlock, string> = {
  vitals: 'Vitals rules',
  status: 'Status rules',
  ground: 'Ground rules',
  windups: 'Wind-up rules',
  aim: 'Aim rules',
};

export const RULE_LABELS: Record<RuleCondition, { label: string; unit?: string; defaultValue?: number; max?: number; status?: boolean; ground?: boolean; unlock?: RuleUnlock; act?: number }> = {
  always: { label: 'Whenever ready' },
  manual: { label: 'Manual only' },
  enemyCasting: { label: 'When an enemy winds up', unlock: 'windups' },
  enemyChannels: { label: 'When an enemy channels', unlock: 'windups' },
  onGround: { label: 'While standing on', ground: true, unlock: 'ground' },
  frostbite: { label: 'When Frostbite reaches', unit: ' stacks', defaultValue: 5, max: 9, unlock: 'vitals', act: 4 },
  lifeBelow: { label: 'When life below', unit: '%', defaultValue: 50, unlock: 'vitals' },
  lifeAbove: { label: 'When life above', unit: '%', defaultValue: 60, unlock: 'vitals' },
  manaAbove: { label: 'When mana above', unit: '%', defaultValue: 40 },
  manaBelow: { label: 'When mana below', unit: '%', defaultValue: 30, unlock: 'vitals' },
  enemiesAtLeast: { label: 'When enemies at least', unit: '', defaultValue: 3 },
  targetLifeAbove: { label: 'When target life above', unit: '%', defaultValue: 50 },
  notActive: { label: 'When its effect is not active' },
  bossOnly: { label: 'Only against bosses' },
  meterFull: { label: 'When your class meter is full (Rage, Malice…)' },
  targetHas: { label: 'While target is affected by', status: true, unlock: 'status' },
  targetLacks: { label: "While target isn't affected by", status: true, unlock: 'status' },
};

/** A skill's place in the cast order: high goes before normal, normal before low. */
export type SkillPriority = 'high' | 'normal' | 'low';

export const SKILL_PRIORITIES: { id: SkillPriority; label: string }[] = [
  { id: 'high', label: 'High' },
  { id: 'normal', label: 'Normal' },
  { id: 'low', label: 'Low' },
];

const A = (d: ActiveGemDef) => d;

export const ACTIVE_GEMS: ActiveGemDef[] = [
  // ---------- Strength ----------
  A({
    id: 'heavy_strike', name: 'Heavy Strike', attr: 'str', role: 'main', tags: ['attack', 'melee', 'hit'],
    manaCost: 4, cooldownMs: 0, timeMs: 3900, color: '#d0574a',
    effect: { weaponPct: 185, targets: 'single', stunChance: 0.25 }, weapons: HEAVY_WEAPONS,
    desc: 'A slow, crushing blow. 25% chance to stun.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'ground_slam', name: 'Ground Slam', attr: 'str', role: 'area', tags: ['attack', 'melee', 'area', 'hit'],
    manaCost: 8, cooldownMs: 5000, timeMs: 3600, color: '#b0643a',
    effect: { weaponPct: 95, area: 'arc', stunChance: 0.1 }, weapons: SLAM_WEAPONS,
    desc: 'Slam the ground, hitting the target and the enemies either side of it.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'iron_guard', name: 'Iron Guard', attr: 'str', role: 'guard', tags: ['guard', 'duration'],
    manaCost: 10, cooldownMs: 7000, timeMs: 900, color: '#9b8e7e',
    effect: { blocks: 1, buff: { durationMs: 3000, stats: { armourPct: 60 } } },
    desc: 'Block the next hit completely and gain 60% increased Armour for 3s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'war_cry', name: 'War Cry', attr: 'str', role: 'buff', tags: ['buff', 'duration'],
    manaCost: 14, cooldownMs: 12000, timeMs: 1200, color: '#e0a640',
    effect: { interrupts: true, knockback: true, buff: { durationMs: 6000, moreDamage: 20 } },
    desc: 'Interrupts enemy wind-ups and channels, shoves enemies in melee range back a ring, and grants 20% more damage for 6s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'pummel', name: 'Pummel', attr: 'str', role: 'main', tags: ['attack', 'melee', 'hit'],
    manaCost: 5, cooldownMs: 0, timeMs: 3300, color: '#c46a4a',
    effect: { weaponPct: 55, hits: 3, targets: 'single' }, weapons: SLAM_WEAPONS,
    desc: 'Three quick blows to the same target.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'berserk', name: 'Berserk', attr: 'str', role: 'buff', tags: ['buff', 'duration'],
    manaCost: 10, cooldownMs: 12000, timeMs: 600, color: '#e0503a',
    effect: { buff: { durationMs: 6000, stats: { attackSpeedPct: 30 }, regenPct: -1 } },
    desc: '30% increased Attack Speed for 6s, but lose 1% of your life per second.',
    defaultRule: { when: 'bossOnly' },
  }),
  A({
    id: 'parry', name: 'Parry', attr: 'str', role: 'guard', tags: ['guard'],
    manaCost: 6, cooldownMs: 6000, timeMs: 600, color: '#b8a68a',
    effect: { blocks: 2 },
    desc: 'Turn aside the next two hits.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'judgement_hammer', name: 'Judgement Hammer', attr: 'str', role: 'main', tags: ['attack', 'melee', 'hit'],
    manaCost: 9, cooldownMs: 0, timeMs: 4200, color: '#e8d25a',
    effect: { ailmentChance: 25, weaponPct: 250, targets: 'single', stunChance: 0.25, convert: { type: 'light', pct: 50 } }, weapons: SLAM_WEAPONS,
    desc: 'A slow, thunderous blow. 50% of physical damage is converted to lightning; 25% chance to stun.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'infernal_blow', name: 'Infernal Blow', attr: 'str', role: 'main', tags: ['attack', 'melee', 'dot', 'duration', 'hit'],
    manaCost: 6, cooldownMs: 0, timeMs: 3600, color: '#ff6a3a',
    effect: { weaponPct: 120, targets: 'single', convert: { type: 'fire', pct: 50 }, ailmentChance: 100 }, weapons: SLAM_WEAPONS,
    desc: 'A strike that turns half its damage to fire and always burns.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'cavalry_charge', name: 'Cavalry Charge', attr: 'str', role: 'area', tags: ['attack', 'melee', 'area', 'movement', 'hit'],
    manaCost: 10, cooldownMs: 7000, timeMs: 1800, color: '#c9803a',
    effect: { weaponPct: 135, area: 'beam', stunChance: 0.15, stepOut: true, charge: true }, range: RINGS, weapons: CHARGE_WEAPONS,
    desc: 'Ride out of any ground hazard and through the whole line to your target, anywhere on the field, dragging it into melee range. 15% chance to stun.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'vulnerability', name: 'Vulnerability', attr: 'str', role: 'curse', tags: ['spell', 'curse', 'area', 'duration'],
    manaCost: 10, cooldownMs: 10000, timeMs: 0, color: '#a8503a',
    effect: { area: 'splash', radius: 1, curse: { durationMs: 8000, physTaken: 30 } },
    desc: 'Curse the target and enemies next to it for 8s: they take 30% increased physical damage.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'flagellate', name: 'Flagellate', attr: 'str', role: 'main', tags: ['attack', 'melee', 'blood', 'hit'],
    manaCost: 0, cooldownMs: 0, timeMs: 3300, color: '#b03a3a',
    effect: { weaponPct: 230, targets: 'single', lifePct: 3 }, weapons: STRIKE_WEAPONS,
    desc: 'A savage blow that tears at you as well. Spends 3% of your Life instead of mana.',
    defaultRule: { when: 'lifeAbove', value: 60 },
  }),
  A({
    id: 'scourge', name: 'Scourge', attr: 'str', role: 'area', tags: ['attack', 'melee', 'area', 'dot', 'duration', 'bleed', 'blood', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 3300, color: '#a8342f',
    effect: { weaponPct: 110, area: 'arc', lifePct: 4, ailment: { kind: 'bleed', pctPerSec: 40, durationMs: 4000 } }, weapons: STRIKE_WEAPONS,
    desc: 'A barbed lash across the target and the enemies either side of it, leaving them bleeding. Spends 4% of your Life instead of mana.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'blood_rite', name: 'Blood Rite', attr: 'str', role: 'buff', tags: ['buff', 'duration', 'blood'],
    manaCost: 0, cooldownMs: 16000, timeMs: 600, color: '#c23030',
    effect: { lifePct: 15, buff: { durationMs: 8000, moreDamage: 25 } },
    desc: 'Offer up 15% of your Life for 25% more damage for 8s.',
    defaultRule: { when: 'lifeAbove', value: 70 },
  }),
  A({
    id: 'blood_ward', name: 'Blood Ward', attr: 'str', role: 'guard', tags: ['guard', 'duration', 'blood', 'shield'],
    manaCost: 0, cooldownMs: 10000, timeMs: 600, color: '#8e2f3f',
    effect: { lifePct: 10, shieldPct: 40, buff: { durationMs: 5000 } },
    desc: 'Spend 10% of your Life on a shield absorbing damage equal to 40% of your life for 5s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'titans_blow', name: "Titan's Blow", attr: 'str', role: 'main', tags: ['attack', 'melee', 'hit', 'heavy'],
    manaCost: 14, cooldownMs: 0, timeMs: 5400, color: '#c8743a',
    effect: { weaponPct: 430, targets: 'single', stunChance: 1, stunMs: 2000, stagger: 25 }, weapons: HEAVY_WEAPONS,
    desc: 'Heave your weapon up and bring it down. The blow lands at the end of its wind-up, always stuns (2s) and adds 25 Stagger to bosses.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'avalanche', name: 'Avalanche', attr: 'str', role: 'area', tags: ['attack', 'melee', 'area', 'hit', 'heavy'],
    manaCost: 16, cooldownMs: 5000, timeMs: 4800, color: '#a8c8d8',
    effect: { ailmentChance: 25, weaponPct: 210, area: 'splash', radius: 2, stunChance: 0.5, stunMs: 1500, stagger: 15, convert: { type: 'cold', pct: 50 } }, range: 2, weapons: SLAM_WEAPONS,
    desc: 'Bring the mountain down on everything within 2 steps of a target up to 2 rings away. 50% of physical damage is converted to cold; 50% chance to stun for 1.5s.',
    defaultRule: { when: 'enemiesAtLeast', value: 2 },
  }),
  A({
    id: 'bulwark', name: 'Bulwark', attr: 'str', role: 'guard', tags: ['guard', 'duration', 'shield'],
    manaCost: 16, cooldownMs: 12000, timeMs: 900, color: '#a89878',
    effect: { shieldPct: 45, buff: { durationMs: 6000, stats: { armourPct: 40 } } },
    desc: 'Set yourself behind stone: a shield absorbing damage equal to 45% of your life, and 40% increased Armour, for 6s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'shield_crush', name: 'Shield Crush', attr: 'str', role: 'main', tags: ['attack', 'melee', 'hit'],
    manaCost: 9, cooldownMs: 0, timeMs: 3900, color: '#b89a5a',
    effect: { weaponPct: 190, targets: 'single', stunChance: 0.3, shieldToDamage: 50 }, weapons: STRIKE_WEAPONS,
    desc: 'Drive your whole guard into the target. Adds 50% of your current shield to the hit as physical damage, without spending it; 30% chance to stun.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'mountain_stance', name: 'Mountain Stance', attr: 'str', role: 'buff', tags: ['buff', 'duration'],
    manaCost: 14, cooldownMs: 16000, timeMs: 600, color: '#8a7a68',
    effect: { buff: { durationMs: 8000, stats: { attackSpeedPct: -15, castSpeedPct: -15, armourPct: 40 }, moreDamage: 30 } },
    desc: 'For 8s: 30% more damage and 40% increased Armour, but 15% reduced Attack and Cast Speed.',
    defaultRule: { when: 'notActive' },
  }),

  // ---------- Dexterity ----------
  A({
    id: 'twin_strike', name: 'Twin Strike', attr: 'dex', role: 'main', tags: ['attack', 'melee', 'hit'],
    manaCost: 4, cooldownMs: 0, timeMs: 2700, color: '#5fbf6a',
    effect: { weaponPct: 62, hits: 2, targets: 'single' }, weapons: STRIKE_WEAPONS,
    desc: 'Strike twice in quick succession.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'poison_dart', name: 'Poison Dart', attr: 'dex', role: 'main', tags: ['attack', 'projectile', 'dot', 'duration', 'hit'],
    manaCost: 6, cooldownMs: 0, timeMs: 2400, color: '#7bc04a',
    effect: { weaponPct: 55, targets: 'single', convert: { type: 'chaos', pct: 50 }, ailment: { kind: 'poison', pctPerSec: 30, durationMs: 4000 } }, range: 3,
    desc: 'A thrown dart (3 rings, any weapon) that poisons. Poison stacks.',
    defaultRule: { when: 'targetLifeAbove', value: 40 },
  }),
  A({
    id: 'smoke_step', name: 'Smoke Step', attr: 'dex', role: 'guard', tags: ['guard', 'duration'],
    manaCost: 10, cooldownMs: 8000, timeMs: 750, color: '#8a8f9a',
    effect: { evadeMs: 2000 },
    desc: 'Vanish in smoke: evade every hit for 2s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'lacerate', name: 'Lacerate', attr: 'dex', role: 'burst', tags: ['attack', 'melee', 'dot', 'duration', 'bleed', 'hit'],
    manaCost: 10, cooldownMs: 0, timeMs: 3300, color: '#c0392b',
    effect: { weaponPct: 130, targets: 'single', ailment: { kind: 'bleed', pctPerSec: 60, durationMs: 4000 } }, range: 2, weapons: ['sword', 'axe'],
    desc: 'A reaching sweep (2 rings) and a deep cut that bleeds heavily.',
    defaultRule: { when: 'targetLifeAbove', value: 50 },
  }),
  A({
    id: 'barrage', name: 'Barrage', attr: 'dex', role: 'main', tags: ['attack', 'projectile', 'hit'],
    manaCost: 5, cooldownMs: 0, timeMs: 2700, color: '#8fd26a',
    effect: { weaponPct: 40, hits: 4, targets: 'single' }, weapons: BOW,
    desc: 'Loose a rapid volley of four arrows at one target.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'rain_of_arrows', name: 'Rain of Arrows', attr: 'dex', role: 'area', tags: ['attack', 'projectile', 'area', 'hit'],
    manaCost: 8, cooldownMs: 5000, timeMs: 3300, color: '#6aa84f',
    effect: { weaponPct: 70, area: 'splash', radius: 2 }, weapons: BOW,
    desc: 'Arrows rain on the target and everything within 2 steps of it.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'feint', name: 'Feint', attr: 'dex', role: 'main', tags: ['attack', 'melee', 'duration', 'hit'],
    manaCost: 5, cooldownMs: 0, timeMs: 2400, color: '#9fc7a0',
    effect: { weaponPct: 110, targets: 'single', buff: { durationMs: 3000, stats: { evasionPct: 40 } } }, weapons: STRIKE_WEAPONS,
    desc: 'A false strike that leaves you hard to hit: 40% increased Evasion Rating for 3s.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'backstab', name: 'Backstab', attr: 'dex', role: 'burst', tags: ['attack', 'melee', 'hit'],
    manaCost: 10, cooldownMs: 0, timeMs: 3000, color: '#5a8a5a',
    effect: { weaponPct: 240, targets: 'single', moreVsAiling: 50 }, weapons: ['dagger', 'sword'],
    desc: 'A brutal strike, deadliest on a weakened foe: 50% more damage against enemies with an ailment.',
    defaultRule: { when: 'targetLifeAbove', value: 30 },
  }),
  A({
    id: 'ice_shot', name: 'Ice Shot', attr: 'dex', role: 'main', tags: ['attack', 'projectile', 'duration', 'hit'],
    manaCost: 5, cooldownMs: 0, timeMs: 2700, color: '#8fd8e8',
    effect: { weaponPct: 115, targets: 'single', convert: { type: 'cold', pct: 50 }, chillMs: 3000 }, weapons: BOW,
    desc: 'A frozen arrow that chills the target. 50% of physical damage is converted to cold.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'raiding_leap', name: 'Raiding Leap', attr: 'dex', role: 'main', tags: ['attack', 'melee', 'movement', 'hit'],
    manaCost: 8, cooldownMs: 6000, timeMs: 1500, color: '#a8d05a',
    effect: { weaponPct: 170, targets: 'single', stepOut: true, charge: true }, range: RINGS, weapons: STRIKE_WEAPONS,
    desc: 'Leap out of any ground hazard onto your target, anywhere on the field, dragging it into melee range.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'parting_shot', name: 'Parting Shot', attr: 'dex', role: 'burst', tags: ['attack', 'projectile', 'movement', 'hit'],
    manaCost: 8, cooldownMs: 6000, timeMs: 1500, color: '#c8e08a',
    effect: { weaponPct: 130, targets: 'single', stepOut: true, knockback: true }, weapons: BOW,
    desc: 'Wheel out of any ground hazard and loose an arrow as you go, shoving enemies in melee range back a ring.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'tailwind', name: 'Tailwind', attr: 'dex', role: 'buff', tags: ['buff', 'duration'],
    manaCost: 12, cooldownMs: 16000, timeMs: 600, color: '#b8e0c0',
    effect: { buff: { durationMs: 8000, stats: { attackSpeedPct: 15, evasionPct: 30, moveSpeedPct: 50 }, outpace: true } },
    desc: 'For 8s: 15% increased Attack Speed, 30% increased Evasion Rating and 50% increased Movement Speed, and ground hazards under you burn out twice as fast.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'hobble', name: 'Hobble', attr: 'dex', role: 'curse', tags: ['spell', 'curse', 'area', 'duration'],
    manaCost: 10, cooldownMs: 10000, timeMs: 0, color: '#7a9a5a',
    effect: { area: 'splash', radius: 1, curse: { durationMs: 8000, slow: 25 } },
    desc: 'Curse the target and enemies next to it for 8s: their attacks, wind-ups and walking are 25% slower.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'gash', name: 'Gash', attr: 'dex', role: 'main', tags: ['attack', 'melee', 'dot', 'duration', 'bleed', 'hit'],
    manaCost: 5, cooldownMs: 0, timeMs: 2400, color: '#d04a4a',
    effect: { weaponPct: 100, targets: 'single', ailment: { kind: 'bleed', pctPerSec: 40, durationMs: 4000 } }, weapons: STRIKE_WEAPONS,
    desc: 'A quick cut that leaves the target bleeding.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'barbed_arrow', name: 'Barbed Arrow', attr: 'dex', role: 'main', tags: ['attack', 'projectile', 'dot', 'duration', 'bleed', 'hit'],
    manaCost: 5, cooldownMs: 0, timeMs: 2700, color: '#c8605a',
    effect: { weaponPct: 105, targets: 'single', ailment: { kind: 'bleed', pctPerSec: 40, durationMs: 4000 } }, weapons: BOW,
    desc: 'A hooked arrow that leaves the target bleeding.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'stigmata', name: 'Stigmata', attr: 'dex', role: 'curse', tags: ['spell', 'curse', 'area', 'duration'],
    manaCost: 10, cooldownMs: 10000, timeMs: 0, color: '#b0485a',
    effect: { area: 'splash', radius: 1, curse: { durationMs: 8000, bleedTaken: 40 } },
    desc: 'Curse the target and enemies next to it for 8s: they take 40% increased damage from bleeding.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'siege_shot', name: 'Siege Shot', attr: 'dex', role: 'main', tags: ['attack', 'projectile', 'hit', 'heavy'],
    manaCost: 12, cooldownMs: 0, timeMs: 4800, color: '#a8b060',
    effect: { weaponPct: 460, targets: 'single', stunChance: 0.5, stagger: 15 }, weapons: BOW,
    desc: 'Crank the bow to breaking point. The bolt looses at the end of its wind-up; 50% chance to stun.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'blackjack', name: 'Blackjack', attr: 'dex', role: 'main', tags: ['attack', 'melee', 'hit'],
    manaCost: 6, cooldownMs: 0, timeMs: 2400, color: '#6a8a70',
    effect: { weaponPct: 110, targets: 'single', stunChance: 0.2, moreVsStunned: 60 }, weapons: ['dagger', 'sword', 'mace'],
    desc: 'A short, ugly blow to the head. 20% chance to stun, and 60% more damage against stunned enemies.',
    defaultRule: { when: 'always' },
  }),

  // ---------- Intelligence ----------
  A({
    id: 'spark', name: 'Spark', attr: 'int', role: 'main', tags: ['spell', 'projectile', 'chain', 'hit'],
    manaCost: 5, cooldownMs: 2000, timeMs: 0, color: '#6fc8ff',
    effect: { ailmentChance: 25, base: [4, 16], type: 'light', targets: 'chain', chains: 2, crit: 6 },
    desc: 'Crackling bolts that chain to the 2 nearest enemies.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'fireball', name: 'Fireball', attr: 'int', role: 'burst', tags: ['spell', 'projectile', 'dot', 'duration', 'hit', 'cast'],
    manaCost: 12, cooldownMs: 4000, timeMs: 3600, color: '#ff7a45',
    effect: { base: [12, 20], type: 'fire', targets: 'single', crit: 6, ailmentChance: 100 },
    desc: 'A heavy fire bolt that always burns.',
    defaultRule: { when: 'manaAbove', value: 30 },
  }),
  A({
    id: 'frost_ward', name: 'Frost Ward', attr: 'int', role: 'guard', tags: ['spell', 'guard', 'duration', 'shield'],
    manaCost: 12, cooldownMs: 10000, timeMs: 0, color: '#bfe3ff',
    effect: { shieldPct: 30, buff: { durationMs: 5000 } },
    desc: 'An ice shield absorbing damage equal to 30% of your life for 5s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'arcane_siphon', name: 'Arcane Siphon', attr: 'int', role: 'sustain', tags: ['spell', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 0, color: '#9b6dde',
    effect: { ailmentChance: 25, base: [30, 46], type: 'cold', targets: 'single', crit: 5, leechLife: 15 },
    desc: 'Drain the target: 15% of the damage returns as life. Costs no mana.',
    defaultRule: { when: 'lifeBelow', value: 60 },
  }),
  A({
    id: 'glacial_lance', name: 'Glacial Lance', attr: 'int', role: 'burst', tags: ['spell', 'projectile', 'duration', 'hit', 'cast'],
    manaCost: 22, cooldownMs: 5000, timeMs: 3600, color: '#9fd8ff',
    effect: { base: [72, 104], type: 'cold', targets: 'single', crit: 7, chillMs: 3000 },
    desc: 'A spear of ice that chills. Slow and expensive, devastating.',
    defaultRule: { when: 'manaAbove', value: 80 },
  }),
  A({
    id: 'meditate', name: 'Meditate', attr: 'int', role: 'sustain', tags: ['spell', 'sustain'],
    manaCost: 0, cooldownMs: 15000, timeMs: 0, color: '#7f9fe0',
    effect: { restoreManaPct: 30 },
    desc: 'Still the mind; refill the well. Restores 30% of your mana.',
    defaultRule: { when: 'manaBelow', value: 30 },
  }),
  A({
    id: 'shock_nova', name: 'Shock Nova', attr: 'int', role: 'area', tags: ['spell', 'area', 'hit'],
    manaCost: 9, cooldownMs: 4000, timeMs: 0, color: '#a0c8ff',
    effect: { ailmentChance: 25, base: [5, 11], type: 'light', area: 'nova', radius: 2, crit: 5 }, range: 2,
    desc: 'A burst of lightning that strikes every enemy within 2 rings of you.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'consecrate', name: 'Consecrate', attr: 'int', role: 'sustain', tags: ['spell', 'area', 'duration', 'hit'],
    manaCost: 10, cooldownMs: 6000, timeMs: 0, color: '#f0c070',
    effect: { ailmentChance: 25, base: [5, 9], type: 'fire', area: 'nova', radius: 2, buff: { durationMs: 4000, regenPct: 2 } }, range: 2,
    desc: 'Hallow the ground: burn every enemy within 2 rings of you, and regenerate 2% of your life per second for 4s.',
    defaultRule: { when: 'lifeBelow', value: 70 },
  }),
  A({
    id: 'frost_needle', name: 'Frost Needle', attr: 'int', role: 'main', tags: ['spell', 'projectile', 'hit'],
    manaCost: 5, cooldownMs: 2000, timeMs: 0, color: '#c0e8ff',
    effect: { ailmentChance: 25, base: [3, 7], type: 'cold', hits: 3, targets: 'single', crit: 6 },
    desc: 'Three needles of ice in quick succession.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'ember_dash', name: 'Ember Dash', attr: 'int', role: 'area', tags: ['spell', 'area', 'movement', 'duration', 'hit'],
    manaCost: 11, cooldownMs: 7000, timeMs: 0, color: '#ff9a5a',
    effect: { ailmentChance: 25, base: [16, 26], type: 'fire', area: 'beam', crit: 5, stepOut: true, ground: { kind: 'burning', pctPerSec: 30, durationMs: 3000, area: 'beam' } },
    desc: 'Dash out of any ground hazard in a streak of flame, burning the whole line to your target and leaving it on fire for 3s.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'arcane_surge', name: 'Arcane Surge', attr: 'int', role: 'buff', tags: ['spell', 'buff', 'duration'],
    manaCost: 12, cooldownMs: 16000, timeMs: 0, color: '#b08bff',
    effect: { buff: { durationMs: 8000, stats: { spellPct: 30, castSpeedPct: 15 } } },
    desc: 'For 8s: 30% increased Spell Damage and 15% increased Cast Speed.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'elemental_weakness', name: 'Elemental Weakness', attr: 'int', role: 'curse', tags: ['spell', 'curse', 'area', 'duration'],
    manaCost: 10, cooldownMs: 10000, timeMs: 0, color: '#c08a4a',
    effect: { area: 'splash', radius: 1, curse: { durationMs: 8000, resPen: 30 } },
    desc: 'Curse the target and enemies next to it for 8s: they have 30 less of every elemental resistance.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'enfeeble', name: 'Enfeeble', attr: 'int', role: 'curse', tags: ['spell', 'curse', 'area', 'duration'],
    manaCost: 10, cooldownMs: 10000, timeMs: 0, color: '#8a7a9a',
    effect: { area: 'splash', radius: 1, curse: { durationMs: 8000, dealLess: 25 } },
    desc: 'Curse the target and enemies next to it for 8s: their hits deal 25% less damage.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'blood_lance', name: 'Blood Lance', attr: 'int', role: 'burst', tags: ['spell', 'projectile', 'dot', 'duration', 'bleed', 'blood', 'hit', 'cast'],
    manaCost: 0, cooldownMs: 4000, timeMs: 3000, color: '#a02840',
    effect: { base: [34, 50], type: 'phys', targets: 'single', crit: 6, lifePct: 6, ailment: { kind: 'bleed', pctPerSec: 40, durationMs: 4000 } },
    desc: 'A spear of your own blood that leaves the target bleeding. Spends 6% of your Life instead of mana.',
    defaultRule: { when: 'lifeAbove', value: 60 },
  }),
  A({
    id: 'burnt_offering', name: 'Burnt Offering', attr: 'int', role: 'area', tags: ['spell', 'area', 'blood', 'hit'],
    manaCost: 0, cooldownMs: 6000, timeMs: 0, color: '#e0603a',
    effect: { ailmentChance: 25, base: [14, 22], type: 'fire', area: 'nova', radius: 2, crit: 5, lifePct: 10, lifeToDamage: 100 }, range: 2,
    desc: 'Burn 10% of your Life to scorch every enemy within 2 rings of you. All the Life spent is added to the damage.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'transfusion', name: 'Transfusion', attr: 'int', role: 'sustain', tags: ['spell', 'sustain', 'hit'],
    manaCost: 8, cooldownMs: 8000, timeMs: 0, color: '#d05a70',
    effect: { base: [8, 14], type: 'phys', targets: 'single', crit: 5, consumeBleed: 30 },
    desc: "Drain the target's bleed: all the damage it had left lands at once, and 30% of that returns to you as Life (at most 25% of your Life).",
    defaultRule: { when: 'targetHas', status: 'bleeding' },
  }),
  A({
    id: 'meteor', name: 'Meteor', attr: 'int', role: 'burst', tags: ['spell', 'area', 'hit', 'cast', 'heavy'],
    manaCost: 26, cooldownMs: 6000, timeMs: 5400, color: '#ff8a4a',
    effect: { ailmentChance: 25, base: [80, 120], type: 'fire', area: 'splash', radius: 1, crit: 6, stunChance: 0.6, stunMs: 1500, stagger: 20 },
    desc: 'Call a burning rock down on the target and the enemies next to it. It lands at the end of the cast; 60% chance to stun for 1.5s.',
    defaultRule: { when: 'manaAbove', value: 40 },
  }),
  A({
    id: 'sacred_aegis', name: 'Sacred Aegis', attr: 'int', role: 'guard', tags: ['spell', 'guard', 'duration', 'shield'],
    manaCost: 16, cooldownMs: 10000, timeMs: 0, color: '#f0e0a0',
    effect: { shieldPct: 30, shieldEs: true, buff: { durationMs: 6000 } },
    desc: 'A shield of light absorbing damage equal to 30% of your life and energy shield together, for 6s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'burden', name: 'Burden', attr: 'int', role: 'curse', tags: ['spell', 'curse', 'area', 'duration'],
    manaCost: 10, cooldownMs: 10000, timeMs: 0, color: '#7a7088',
    effect: { area: 'splash', radius: 1, curse: { durationMs: 8000, slow: 15, stunTaken: 40 } },
    desc: 'Curse the target and enemies next to it for 8s: they move and attack 15% slower, stuns on them last 40% longer, and bosses take 40% more Stagger.',
    defaultRule: { when: 'notActive' },
  }),

  // ---------- Act 5, Tides and summons (docs/design/MINIONS.md) ----------
  A({
    id: 'drowned_thralls', name: 'Drowned Thralls', attr: 'str', role: 'summon', tags: ['attack', 'melee', 'minion', 'hit'],
    manaCost: 18, cooldownMs: 4000, timeMs: 1800, color: '#5a8a7a',
    effect: { weaponPct: 50, minion: { name: 'Drowned Thrall', art: 'ghoul', count: 3, lifePct: 30, attackMs: 2000, reach: 1 } },
    desc: 'Call up to 3 thralls from the deep. They walk out to meet the enemy, hit with your weapon, and hold whatever they reach. They stay between packs.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'barnacle_brute', name: 'Barnacle Brute', attr: 'str', role: 'summon', tags: ['attack', 'melee', 'minion', 'hit'],
    manaCost: 24, cooldownMs: 8000, timeMs: 2400, color: '#6a7a6a',
    effect: { weaponPct: 70, stunChance: 0.15, minion: { name: 'Barnacle Brute', art: 'coralgolem', count: 1, lifePct: 120, attackMs: 3000, reach: 1, taunts: true } },
    desc: 'Call a hulk crusted with barnacles. Monsters in reach of it swing at it instead of you, and its blows have a 15% chance to stun.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'riptide', name: 'Riptide', attr: 'str', role: 'area', tags: ['attack', 'melee', 'area', 'hit'],
    manaCost: 10, cooldownMs: 5000, timeMs: 3300, color: '#3f8fa8',
    effect: { weaponPct: 125, area: 'arc', drag: 1 }, range: 2, weapons: SLAM_WEAPONS,
    desc: 'A sweep that reaches 2 rings, hitting the target and the enemies either side of it and dragging them a ring toward you.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'drowned_bell', name: 'Drowned Bell', attr: 'str', role: 'buff', tags: ['buff', 'duration'],
    manaCost: 14, cooldownMs: 16000, timeMs: 600, color: '#8a9a7a',
    effect: { buff: { durationMs: 8000, stats: { minionPct: 40, minionSpeedPct: 20 } } },
    desc: 'For 8s: your minions deal 40% increased damage and hit 20% faster.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'boarding_party', name: 'Boarding Party', attr: 'dex', role: 'summon', tags: ['attack', 'projectile', 'minion', 'hit'],
    manaCost: 18, cooldownMs: 4000, timeMs: 1500, color: '#7aa86a',
    effect: { weaponPct: 55, minion: { name: 'Boarder', art: 'gunner', count: 2, lifePct: 15, attackMs: 2000, reach: 4 } }, range: 4,
    desc: 'Call 2 boarders who keep close to you and shoot across the field with the strength of your weapon. They stay between packs.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'harpoon', name: 'Harpoon', attr: 'dex', role: 'main', tags: ['attack', 'projectile', 'hit'],
    manaCost: 7, cooldownMs: 0, timeMs: 3000, color: '#5a9a9a',
    effect: { weaponPct: 150, targets: 'single', drag: 1 }, range: 3,
    desc: 'A thrown harpoon (3 rings, any weapon) that drags the target a ring toward you.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'squall', name: 'Squall', attr: 'dex', role: 'area', tags: ['attack', 'area', 'duration', 'storm', 'hit'],
    manaCost: 12, cooldownMs: 6000, timeMs: 1500, color: '#9ac8c0',
    effect: { weaponPct: 30, area: 'splash', radius: 1, storm: { everyMs: 800, durationMs: 8000, max: 1, drift: true } }, range: 4,
    desc: 'A knot of wind and salt that hits everything inside it with your weapon every 0.8s for 8s, and wanders after the nearest enemy.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'tidecallers', name: 'Tidecallers', attr: 'int', role: 'summon', tags: ['spell', 'minion', 'hit', 'cast'],
    manaCost: 18, cooldownMs: 4000, timeMs: 1500, color: '#5a9ac8',
    effect: { base: [16, 26], type: 'cold', crit: 5, chillMs: 2000, minion: { name: 'Tidecaller', art: 'tidecaller', count: 2, lifePct: 20, attackMs: 2400, reach: 3 } }, range: 3,
    desc: 'Call 2 drowned priests who stay close to you and cast cold bolts that chill, across 3 rings. They stay between packs.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'thunderhead', name: 'Thunderhead', attr: 'int', role: 'area', tags: ['spell', 'area', 'duration', 'storm', 'hit'],
    manaCost: 14, cooldownMs: 6000, timeMs: 0, color: '#c8c86a',
    effect: { ailmentChance: 25, base: [18, 30], type: 'light', crit: 6, area: 'splash', radius: 1, storm: { everyMs: 1500, durationMs: 10000, max: 1 } },
    desc: 'A black cloud settles on the target for 10s. Lightning strikes everything under it every 1.5s, and whatever walks in after.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'whirlpool', name: 'Whirlpool', attr: 'int', role: 'area', tags: ['spell', 'area', 'duration', 'storm', 'hit'],
    manaCost: 14, cooldownMs: 8000, timeMs: 0, color: '#4f7ac8',
    effect: { base: [10, 16], type: 'cold', crit: 5, area: 'splash', radius: 2, chillMs: 1500, storm: { everyMs: 1200, durationMs: 8000, max: 1, pull: true } },
    desc: 'A churning pool within 2 steps of the target for 8s. Every 1.2s it chills what\'s in it and draws them toward the centre.',
    defaultRule: { when: 'enemiesAtLeast', value: 2 },
  }),
  A({
    id: 'leviathan', name: 'Call the Leviathan', attr: 'int', role: 'summon', tags: ['spell', 'minion', 'area', 'duration', 'hit', 'cast'],
    manaCost: 40, cooldownMs: 30000, timeMs: 2400, color: '#3a5a9a',
    effect: { ailmentChance: 25, base: [70, 110], type: 'cold', crit: 5, area: 'splash', radius: 1, minion: { name: 'Leviathan', art: 'wyrmling', count: 1, lifePct: 150, attackMs: 2800, reach: 2, durationMs: 14000 } }, range: 2,
    desc: 'The deep answers: for 14s a Leviathan fights at your side, crushing the target and everything next to it.',
    defaultRule: { when: 'bossOnly' },
  }),

  // ---------- Act 6, The last empire (docs/design/ACT6_SKILLS.md) ----------
  A({
    id: 'worldbreaker', name: 'Worldbreaker', attr: 'str', role: 'area', tags: ['attack', 'melee', 'area', 'hit', 'heavy'],
    manaCost: 26, cooldownMs: 6000, timeMs: 6000, color: '#c84a2a',
    effect: { weaponPct: 420, area: 'nova', radius: 2, stunChance: 1, stunMs: 2000, stagger: 30, storedToDamage: 300 }, range: 2, weapons: SLAM_WEAPONS,
    desc: 'Raise the weapon that broke the empire and stand there. It falls on everything within 2 rings at the end of the wind-up, always stuns (2s), and adds 3 times the damage you took while it was raised, shields included.',
    defaultRule: { when: 'enemiesAtLeast', value: 2 },
  }),
  A({
    id: 'last_legion', name: 'The Last Legion', attr: 'str', role: 'summon', tags: ['attack', 'melee', 'minion', 'hit'],
    manaCost: 34, cooldownMs: 8000, timeMs: 2400, color: '#c8a84a',
    effect: { weaponPct: 80, minion: { name: 'Legionary', art: 'gildedknight', count: 4, lifePct: 35, attackMs: 2200, reach: 1, shares: 30 } },
    desc: 'Call 4 legionaries who never heard the empire fell. They hit with your weapon, and one of them takes 30% of every hit that lands on you. They stay between packs.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'death_warrant', name: 'Death Warrant', attr: 'dex', role: 'curse', tags: ['spell', 'curse', 'area', 'duration'],
    manaCost: 18, cooldownMs: 12000, timeMs: 0, color: '#5a3a6a',
    effect: { area: 'target', curse: { durationMs: 6000, warrant: 50 } },
    desc: 'Curse the target for 6s, counting all the damage it takes from anything. When the curse ends, 50% of that lands at once. If it dies first, the debt falls on the nearest enemy.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'gale_of_knives', name: 'Gale of Knives', attr: 'dex', role: 'area', tags: ['attack', 'area', 'duration', 'storm', 'hit'],
    manaCost: 22, cooldownMs: 6000, timeMs: 1500, color: '#9ad8a0',
    effect: { weaponPct: 75, area: 'nova', radius: 2, storm: { everyMs: 1600, durationMs: 10000, max: 1, anchored: true, onAttack: true } }, range: 2,
    desc: 'A storm of blades turns around you for 10s, cutting everything within 2 rings with your weapon every 1.6s, and again every time you use an attack.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'royal_decree', name: 'Royal Decree', attr: 'int', role: 'burst', tags: ['spell', 'hit', 'cast'],
    manaCost: 42, cooldownMs: 24000, timeMs: 1800, color: '#e8c84a',
    effect: { ailmentChance: 25, base: [90, 130], type: 'light', targets: 'single', crit: 6, decree: 60 },
    desc: 'Speak with the last king\'s voice. Every other damage spell on your bar that is ready fires at once, for free and with no cast time, at 60% of its damage, and starts its cooldown.',
    defaultRule: { when: 'manaAbove', value: 50 },
  }),
  A({
    id: 'eye_of_the_storm', name: 'Eye of the Storm', attr: 'int', role: 'guard', tags: ['spell', 'guard', 'area', 'duration', 'shield', 'storm', 'hit'],
    manaCost: 28, cooldownMs: 14000, timeMs: 0, color: '#8ac8e8',
    effect: { ailmentChance: 25, base: [30, 46], type: 'light', area: 'nova', radius: 2, crit: 6, shieldPct: 35, shieldEs: true, shieldToDamage: 10, buff: { durationMs: 8000 }, storm: { everyMs: 1200, durationMs: 8000, max: 1, anchored: true, whileShield: true } }, range: 2,
    desc: 'A shield absorbing damage equal to 35% of your life and energy shield for 8s, with a storm around it that strikes everything within 2 rings every 1.2s. Each strike adds 10% of the shield still standing, and the storm ends with the shield.',
    defaultRule: { when: 'enemyCasting' },
  }),

  // ---------- Skill reform: drains (docs/design/SKILL_REFORM.md) ----------
  A({
    id: 'leeching_blow', name: 'Leeching Blow', attr: 'str', role: 'sustain', tags: ['attack', 'melee', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 2700, color: '#b85050',
    effect: { weaponPct: 80, targets: 'single', leechLife: 2, stunChance: 0.1 },
    desc: 'A blow that draws a little back: 2% of the damage returns as life. Costs no mana.',
    defaultRule: { when: 'lifeBelow', value: 60 },
  }),
  A({
    id: 'brine_leech', name: 'Brine Leech', attr: 'dex', role: 'sustain', tags: ['attack', 'projectile', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 2400, color: '#5a9a8a',
    effect: { weaponPct: 70, targets: 'single', leechLife: 2 }, range: 3,
    desc: 'A thrown leech (3 rings, any weapon): 2% of the damage returns as life. Costs no mana.',
    defaultRule: { when: 'lifeBelow', value: 60 },
  }),
  A({
    id: 'mind_sip', name: 'Mind Sip', attr: 'int', role: 'sustain', tags: ['spell', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 0, color: '#7a8ae0',
    effect: { ailmentChance: 25, base: [6, 10], type: 'cold', targets: 'single', crit: 5, leechMana: 2 },
    desc: 'Sip at the target: 2% of the damage returns as mana. Costs no mana.',
    defaultRule: { when: 'manaBelow', value: 30 },
  }),
  A({
    id: 'raiders_due', name: "Raider's Due", attr: 'str', role: 'sustain', tags: ['attack', 'melee', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 2700, color: '#c06040',
    effect: { weaponPct: 100, targets: 'single', leechLife: 3 },
    desc: 'Take what you are owed: 3% of the damage returns as life. Costs no mana.',
    defaultRule: { when: 'lifeBelow', value: 60 },
  }),
  A({
    id: 'horsefly_shot', name: 'Horsefly Shot', attr: 'dex', role: 'sustain', tags: ['attack', 'projectile', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 2400, color: '#8aa85a',
    effect: { weaponPct: 90, targets: 'single', leechMana: 3 }, range: 3,
    desc: 'A stinging shot (3 rings, any weapon): 3% of the damage returns as mana. Costs no mana.',
    defaultRule: { when: 'manaBelow', value: 30 },
  }),
  A({
    id: 'cinder_draw', name: 'Cinder Draw', attr: 'int', role: 'sustain', tags: ['spell', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 0, color: '#e08a5a',
    effect: { ailmentChance: 25, base: [12, 20], type: 'fire', targets: 'single', crit: 5, leechMana: 3 },
    desc: 'Pull the heat out of the target: 3% of the damage returns as mana. Costs no mana.',
    defaultRule: { when: 'manaBelow', value: 30 },
  }),
  A({
    id: 'sanguine_blow', name: 'Sanguine Blow', attr: 'str', role: 'sustain', tags: ['attack', 'melee', 'sustain', 'dot', 'duration', 'bleed', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 3000, color: '#a83a4a',
    effect: { weaponPct: 120, targets: 'single', leechLife: 6, ailment: { kind: 'bleed', pctPerSec: 30, durationMs: 3000 } },
    desc: 'A blow that opens the target: it bleeds, and 6% of the damage returns as life. Costs no mana.',
    defaultRule: { when: 'lifeBelow', value: 60 },
  }),
  A({
    id: 'bloodied_knife', name: 'Bloodied Knife', attr: 'dex', role: 'sustain', tags: ['attack', 'projectile', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 2400, color: '#b05a5a',
    effect: { weaponPct: 110, targets: 'single', leechLife: 6 }, range: 3,
    desc: 'A thrown knife (3 rings, any weapon): 6% of the damage returns as life. Costs no mana.',
    defaultRule: { when: 'lifeBelow', value: 60 },
  }),
  A({
    id: 'marrow_crush', name: 'Marrow Crush', attr: 'str', role: 'sustain', tags: ['attack', 'melee', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 3300, color: '#b89a7a',
    effect: { weaponPct: 150, targets: 'single', leechLife: 10, stunChance: 0.2 },
    desc: 'Crack the bone for what is inside: 10% of the damage returns as life; 20% chance to stun. Costs no mana.',
    defaultRule: { when: 'lifeBelow', value: 60 },
  }),
  A({
    id: 'frost_lamprey', name: 'Frost Lamprey', attr: 'dex', role: 'sustain', tags: ['attack', 'projectile', 'sustain', 'duration', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 2400, color: '#8ac8d8',
    effect: { weaponPct: 130, targets: 'single', convert: { type: 'cold', pct: 50 }, chillMs: 2000, leechMana: 10 }, range: 3,
    desc: 'A cold thing that bites and holds (3 rings, any weapon). It chills, half its physical damage turns to cold, and 10% of the damage returns as mana. Costs no mana.',
    defaultRule: { when: 'manaBelow', value: 30 },
  }),
  A({
    id: 'stone_drink', name: 'Stone Drink', attr: 'int', role: 'sustain', tags: ['spell', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 0, color: '#9a9aa8',
    effect: { base: [26, 40], type: 'phys', targets: 'single', crit: 5, leechMana: 10 },
    desc: 'Draw the old patience out of the target: 10% of the damage returns as mana. Costs no mana.',
    defaultRule: { when: 'manaBelow', value: 30 },
  }),
  A({
    id: 'undertow_grip', name: 'Undertow Grip', attr: 'str', role: 'sustain', tags: ['attack', 'melee', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 3000, color: '#3f8a9a',
    effect: { weaponPct: 170, targets: 'single', leechLife: 14, drag: 1 }, range: 2,
    desc: 'Reach 2 rings and haul the target a ring closer: 14% of the damage returns as life. Costs no mana.',
    defaultRule: { when: 'lifeBelow', value: 60 },
  }),
  A({
    id: 'lamprey_hook', name: 'Lamprey Hook', attr: 'dex', role: 'sustain', tags: ['attack', 'projectile', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 2400, color: '#5a9aa0',
    effect: { weaponPct: 150, targets: 'single', leechLife: 14 }, range: 3,
    desc: 'A barbed hook on a line (3 rings, any weapon): 14% of the damage returns as life. Costs no mana.',
    defaultRule: { when: 'lifeBelow', value: 60 },
  }),
  A({
    id: 'spoils_of_war', name: 'Spoils of War', attr: 'str', role: 'sustain', tags: ['attack', 'melee', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 3000, color: '#c8a050',
    effect: { weaponPct: 200, targets: 'single', leechLife: 24 },
    desc: 'To the victor: 24% of the damage returns as life. Costs no mana.',
    defaultRule: { when: 'lifeBelow', value: 60 },
  }),
  A({
    id: 'tax_collector', name: 'Tax Collector', attr: 'dex', role: 'sustain', tags: ['attack', 'projectile', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 2400, color: '#a8a860',
    effect: { weaponPct: 180, targets: 'single', leechMana: 24 }, range: 3,
    desc: 'The empire still collects (3 rings, any weapon): 24% of the damage returns as mana. Costs no mana.',
    defaultRule: { when: 'manaBelow', value: 30 },
  }),
  A({
    id: 'imperial_tribute', name: 'Imperial Tribute', attr: 'int', role: 'sustain', tags: ['spell', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 0, color: '#e0c860',
    effect: { ailmentChance: 25, base: [50, 76], type: 'light', targets: 'single', crit: 5, leechMana: 24 },
    desc: 'Demand what the crown is owed: 24% of the damage returns as mana. Costs no mana.',
    defaultRule: { when: 'manaBelow', value: 30 },
  }),

  // ---------- Skill reform: guards ----------
  A({
    id: 'saddle_drop', name: 'Saddle Drop', attr: 'dex', role: 'guard', tags: ['guard', 'duration', 'movement'],
    manaCost: 12, cooldownMs: 8000, timeMs: 750, color: '#a8b87a',
    effect: { evadeMs: 1500, stepOut: true },
    desc: 'Drop low out of any ground hazard and evade every hit for 1.5s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'ash_veil', name: 'Ash Veil', attr: 'int', role: 'guard', tags: ['spell', 'guard', 'duration', 'shield'],
    manaCost: 13, cooldownMs: 10000, timeMs: 0, color: '#a89a90',
    effect: { shieldPct: 32, buff: { durationMs: 5000 } },
    desc: 'A veil of hot ash absorbing damage equal to 32% of your life for 5s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'penitents_veil', name: "Penitent's Veil", attr: 'dex', role: 'guard', tags: ['guard', 'duration'],
    manaCost: 14, cooldownMs: 9000, timeMs: 750, color: '#b0a8a0',
    effect: { evadeMs: 2000, buff: { durationMs: 4000, regenPct: 1 } },
    desc: 'Evade every hit for 2s, and regenerate 1% of your life per second for 4s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'martyrs_ward', name: "Martyr's Ward", attr: 'int', role: 'guard', tags: ['spell', 'guard', 'duration', 'blood', 'shield'],
    manaCost: 0, cooldownMs: 10000, timeMs: 0, color: '#b05a6a',
    effect: { lifePct: 8, shieldPct: 40, buff: { durationMs: 5000 } },
    desc: 'Spend 8% of your Life on a shield absorbing damage equal to 40% of your life for 5s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'snowblind', name: 'Snowblind', attr: 'dex', role: 'guard', tags: ['guard', 'duration'],
    manaCost: 16, cooldownMs: 10000, timeMs: 750, color: '#d8e8f0',
    effect: { evadeMs: 2500 },
    desc: 'Vanish into the white: evade every hit for 2.5s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'barnacle_shell', name: 'Barnacle Shell', attr: 'str', role: 'guard', tags: ['guard', 'duration', 'shield'],
    manaCost: 20, cooldownMs: 12000, timeMs: 900, color: '#7a8a7a',
    effect: { shieldPct: 50, buff: { durationMs: 6000, stats: { armourPct: 40 } } },
    desc: 'Crust over: a shield absorbing damage equal to 50% of your life, and 40% increased Armour, for 6s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'spray_screen', name: 'Spray Screen', attr: 'dex', role: 'guard', tags: ['guard', 'duration', 'movement'],
    manaCost: 18, cooldownMs: 9000, timeMs: 750, color: '#a8d8d8',
    effect: { evadeMs: 2500, stepOut: true },
    desc: 'Break away behind a wall of spray, out of any ground hazard, and evade every hit for 2.5s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'tide_barrier', name: 'Tide Barrier', attr: 'int', role: 'guard', tags: ['spell', 'guard', 'duration', 'shield'],
    manaCost: 22, cooldownMs: 10000, timeMs: 0, color: '#5a8ac8',
    effect: { shieldPct: 35, shieldEs: true, buff: { durationMs: 6000 } },
    desc: 'A standing wave absorbing damage equal to 35% of your life and energy shield together, for 6s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'shieldwall', name: 'Shieldwall', attr: 'str', role: 'guard', tags: ['guard', 'duration'],
    manaCost: 24, cooldownMs: 9000, timeMs: 900, color: '#c8b070',
    effect: { blocks: 3, buff: { durationMs: 5000, stats: { armourPct: 50 } } },
    desc: 'Lock shields: block the next 3 hits completely, and gain 50% increased Armour for 5s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'shadow_court', name: 'Shadow Court', attr: 'dex', role: 'guard', tags: ['guard', 'duration'],
    manaCost: 24, cooldownMs: 12000, timeMs: 750, color: '#6a6a80',
    effect: { evadeMs: 3000, buff: { durationMs: 6000, stats: { evasionPct: 40 } } },
    desc: 'Step among the dead courtiers: evade every hit for 3s, and gain 40% increased Evasion Rating for 6s.',
    defaultRule: { when: 'enemyCasting' },
  }),

  // ---------- Skill reform: area and single target ----------
  A({
    id: 'horse_archers_arc', name: "Horse Archer's Arc", attr: 'dex', role: 'area', tags: ['attack', 'projectile', 'area', 'hit'],
    manaCost: 8, cooldownMs: 5000, timeMs: 2700, color: '#a8c070',
    effect: { weaponPct: 85, area: 'arc' }, range: 3,
    desc: 'A sweeping shot (3 rings, any weapon) that hits the target and the enemies either side of it.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'flensing_fan', name: 'Flensing Fan', attr: 'dex', role: 'area', tags: ['attack', 'melee', 'area', 'dot', 'duration', 'bleed', 'hit'],
    manaCost: 10, cooldownMs: 5000, timeMs: 3000, color: '#c06a60',
    effect: { weaponPct: 105, area: 'arc', ailment: { kind: 'bleed', pctPerSec: 40, durationMs: 4000 } }, range: 2,
    desc: 'A fan of cuts reaching 2 rings, across the target and the enemies either side of it, leaving them bleeding.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'rockslide_volley', name: 'Rockslide Volley', attr: 'dex', role: 'area', tags: ['attack', 'projectile', 'area', 'hit'],
    manaCost: 12, cooldownMs: 5000, timeMs: 3300, color: '#a09a80',
    effect: { weaponPct: 130, area: 'splash', radius: 2, stunChance: 0.2 }, range: 3,
    desc: 'Bring the slope down (3 rings, any weapon) on the target and everything within 2 steps of it. 20% chance to stun.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'drowning_bolt', name: 'Drowning Bolt', attr: 'int', role: 'burst', tags: ['spell', 'projectile', 'duration', 'hit', 'cast'],
    manaCost: 20, cooldownMs: 4000, timeMs: 3000, color: '#4f8ac0',
    effect: { base: [70, 100], type: 'cold', targets: 'single', crit: 6, chillMs: 2000 },
    desc: 'A slow bolt of black water that chills.',
    defaultRule: { when: 'manaAbove', value: 40 },
  }),
  A({
    id: 'executioners_stroke', name: "Executioner's Stroke", attr: 'str', role: 'main', tags: ['attack', 'melee', 'hit'],
    manaCost: 16, cooldownMs: 0, timeMs: 4200, color: '#c04a3a',
    effect: { weaponPct: 420, targets: 'single', stunChance: 0.3 }, weapons: HEAVY_WEAPONS,
    desc: 'One clean, heavy stroke. 30% chance to stun.',
    defaultRule: { when: 'always' },
  }),
];

// ---------- supports ----------

export interface SupportMods {
  moreDamage?: number;
  morePhys?: number;
  moreElem?: number;
  noElemental?: boolean;
  /** % of the hit added as extra damage of a type */
  extra?: { type: DamageType; pct: number };
  attackSpeed?: number;
  castSpeed?: number;
  manaMult?: number;
  critChance?: number;
  critMulti?: number;
  lifeLeech?: number;
  manaLeech?: number;
  /** repeat the skill this many extra times at reduced damage */
  repeats?: number;
  repeatDamage?: number;
  chains?: number;
  /** % more minion life, and more minions the gem keeps up */
  minionLife?: number;
  minionCount?: number;
  /** more storms the gem keeps up, and % faster strikes */
  stormCount?: number;
  stormSpeed?: number;
  durationPct?: number;
  /** % shorter cooldown */
  cooldownPct?: number;
  /** % more effect of a curse */
  curseEffect?: number;
  /** % more damage while you're below half life */
  lowLifeMore?: number;
  /** % more damage from the bleeds it causes */
  moreBleed?: number;
  /** chance to stun on hit, % */
  stunChance?: number;
  /** % more Stagger */
  stagger?: number;
  /** % longer wind-up on a heavy skill */
  windupPct?: number;
  /** % more shield */
  shieldMore?: number;
  /** signature behaviour, handled by the combat engine */
  special?: string;
}

export interface SupportGemDef {
  id: string;
  name: string;
  attr: GemAttr;
  /** fits a skill if it has any of these tags (or it's the signature skill) */
  fits: GemTag[];
  /** ...and all of these (Spell Echo: a spell that hits) */
  needs?: GemTag[];
  /** ...and none of these (Blood Price: a skill that already costs Life has nothing to convert) */
  not?: GemTag[];
  /** signature supports only fit this one skill */
  signatureFor?: string;
  mods: SupportMods;
  desc: string;
}

const S = (d: SupportGemDef) => d;

/**
 * Character level each gem needs, PoE-style, so stronger skills and supports come later.
 * A signature support needs its skill's level + 6. Anything missing here is level 1.
 */
const GEM_LEVELS: Record<string, number> = {
  // skills
  war_cry: 4, ice_shot: 4, frost_needle: 4,
  pummel: 6, feint: 6, leeching_blow: 6, brine_leech: 6, mind_sip: 6,
  ground_slam: 8, rain_of_arrows: 8, shock_nova: 8,
  barrage: 10, infernal_blow: 10,
  berserk: 12, consecrate: 12, meditate: 12,
  parry: 14, fireball: 14,
  judgement_hammer: 16, backstab: 16,
  raiders_due: 18, horsefly_shot: 18, cinder_draw: 18, saddle_drop: 18, ash_veil: 18, horse_archers_arc: 18,
  cavalry_charge: 20, raiding_leap: 20, parting_shot: 20, ember_dash: 20,
  tailwind: 22, arcane_surge: 22,
  vulnerability: 24, hobble: 24,
  elemental_weakness: 26, enfeeble: 26,
  flagellate: 32, gash: 32, barbed_arrow: 32,
  scourge: 34, blood_rite: 34, blood_lance: 34,
  lacerate: 35,
  blood_ward: 36, stigmata: 36, burnt_offering: 36,
  sanguine_blow: 36, bloodied_knife: 36, penitents_veil: 36, martyrs_ward: 36, flensing_fan: 36,
  transfusion: 38,
  titans_blow: 40, bulwark: 40, sacred_aegis: 40, glacial_lance: 40,
  avalanche: 42, meteor: 42,
  blackjack: 44, marrow_crush: 44, frost_lamprey: 44, stone_drink: 44, snowblind: 44, rockslide_volley: 44,
  mountain_stance: 46, burden: 46,
  drowned_thralls: 50, boarding_party: 50, tidecallers: 50, harpoon: 50, riptide: 50, arcane_siphon: 50, shield_crush: 50,
  squall: 52, thunderhead: 52, whirlpool: 52, undertow_grip: 52, lamprey_hook: 52, barnacle_shell: 52, spray_screen: 52, tide_barrier: 52, drowning_bolt: 52,
  barnacle_brute: 54, drowned_bell: 54,
  leviathan: 56,
  worldbreaker: 58, gale_of_knives: 58, eye_of_the_storm: 58, siege_shot: 58,
  last_legion: 60, death_warrant: 60, spoils_of_war: 60, tax_collector: 60, imperial_tribute: 60, shieldwall: 60, shadow_court: 60, executioners_stroke: 60,
  royal_decree: 62,
  // supports
  faster_attacks: 4, faster_casts: 4, efficiency: 4,
  brutality: 8, elemental_focus: 8, life_leech: 8, mana_leech: 8, pierce: 8,
  critical_strikes: 12, chain: 12, lingering: 12,
  multistrike: 18, spell_echo: 18,
  surefoot: 22,
  fresh_horses: 24, trample: 24,
  wide_hex: 26,
  deep_hex: 28,
  serrated_edge: 32, blood_price: 32,
  deep_wounds: 34, tithe: 34,
  desperate_faith: 36, pilgrims_measure: 36, beggars_cup: 36, alms_of_the_mind: 36,
  crushing_weight: 40, ponderous: 40,
  shockwave: 42, reinforced: 42,
  follow_through: 44, frozen_will: 44, thaw: 44, stone_pulse: 44,
  savage_crew: 50, gale_force: 52, hardened_crew: 52, salt_thirst: 52, ebb: 52, undertow_of_thought: 52, full_muster: 54, stormfront: 54,
  goaded: 58, funeral_rites: 58, crowned_storm: 58,
  eternal_ward: 60, reprisal: 60, tribute_of_iron: 60, blood_tax: 60, imperial_vintage: 60,
  succession: 62, imperial_reach: 62,
};

/**
 * The act each gem arrives with (GDD §4): it can't drop, be cut or be sold until the character reaches that
 * act, and a gem already owned always stays usable. Character level still applies on top. Anything missing
 * here is Act 1, and a signature support arrives with its skill.
 */
const GEM_ACTS: Record<string, number> = {
  // Act 2, Riders and raiders
  judgement_hammer: 2, backstab: 2, parry: 2, fireball: 2,
  cavalry_charge: 2, raiding_leap: 2, parting_shot: 2, ember_dash: 2,
  tailwind: 2, arcane_surge: 2,
  vulnerability: 2, hobble: 2, elemental_weakness: 2, enfeeble: 2,
  raiders_due: 2, horsefly_shot: 2, cinder_draw: 2, saddle_drop: 2, ash_veil: 2, horse_archers_arc: 2,
  surefoot: 2, fresh_horses: 2, trample: 2, wide_hex: 2, deep_hex: 2,
  // Act 3, Zealots and blood
  lacerate: 3,
  flagellate: 3, scourge: 3, blood_rite: 3, blood_ward: 3,
  gash: 3, barbed_arrow: 3, stigmata: 3,
  blood_lance: 3, burnt_offering: 3, transfusion: 3,
  sanguine_blow: 3, bloodied_knife: 3, penitents_veil: 3, martyrs_ward: 3, flensing_fan: 3,
  serrated_edge: 3, blood_price: 3, deep_wounds: 3, tithe: 3, desperate_faith: 3,
  pilgrims_measure: 3, beggars_cup: 3, alms_of_the_mind: 3,
  // Act 4, Giants and weight
  titans_blow: 4, avalanche: 4, bulwark: 4, mountain_stance: 4, glacial_lance: 4,
  blackjack: 4,
  meteor: 4, sacred_aegis: 4, burden: 4,
  marrow_crush: 4, frost_lamprey: 4, stone_drink: 4, snowblind: 4, rockslide_volley: 4,
  crushing_weight: 4, ponderous: 4, shockwave: 4, reinforced: 4, follow_through: 4,
  frozen_will: 4, thaw: 4, stone_pulse: 4,
  // Act 5, Tides and summons
  drowned_thralls: 5, barnacle_brute: 5, riptide: 5, drowned_bell: 5, shield_crush: 5,
  boarding_party: 5, harpoon: 5, squall: 5,
  tidecallers: 5, thunderhead: 5, whirlpool: 5, leviathan: 5, arcane_siphon: 5,
  undertow_grip: 5, lamprey_hook: 5, barnacle_shell: 5, spray_screen: 5, tide_barrier: 5, drowning_bolt: 5,
  savage_crew: 5, hardened_crew: 5, full_muster: 5, gale_force: 5, stormfront: 5,
  salt_thirst: 5, ebb: 5, undertow_of_thought: 5,
  // Act 6, The last empire
  worldbreaker: 6, last_legion: 6, death_warrant: 6, gale_of_knives: 6, royal_decree: 6, eye_of_the_storm: 6, siege_shot: 6,
  spoils_of_war: 6, tax_collector: 6, imperial_tribute: 6, shieldwall: 6, shadow_court: 6, executioners_stroke: 6,
  goaded: 6, funeral_rites: 6, crowned_storm: 6, eternal_ward: 6, reprisal: 6, succession: 6, imperial_reach: 6,
  tribute_of_iron: 6, blood_tax: 6, imperial_vintage: 6,
};

/** The act a skill or support gem arrives with. */
export function gemAct(id: string): number {
  const sig = SUPPORT_GEMS.find((g) => g.id === id)?.signatureFor;
  return GEM_ACTS[sig ?? id] ?? 1;
}

/**
 * The strongest skills ask this many times the usual attribute at every gem level
 * (engine/gems.ts `gemAttrReq`), so they need a build that commits to them.
 */
const GEM_ATTR_MULTS: Record<string, number> = {
  lacerate: 1.3,
  backstab: 1.3,
  worldbreaker: 1.3,
  last_legion: 1.3,
  death_warrant: 1.3,
  gale_of_knives: 1.3,
  royal_decree: 1.3,
  eye_of_the_storm: 1.3,
};

export function gemAttrMult(id: string): number {
  return GEM_ATTR_MULTS[id] ?? 1;
}

/** Character level a skill or support gem needs at gem level 1 (and to drop, be cut or be sold to you). */
export function gemReqLevel(id: string): number {
  if (GEM_LEVELS[id]) return GEM_LEVELS[id];
  const sig = SUPPORT_GEMS.find((g) => g.id === id)?.signatureFor;
  return sig ? gemReqLevel(sig) + 6 : 1;
}

export const SUPPORT_GEMS: SupportGemDef[] = [
  // signature
  S({ id: 'shattering_blow', name: 'Shattering Blow', attr: 'str', fits: [], signatureFor: 'heavy_strike', mods: { special: 'shatter' }, desc: 'Stunned enemies take 30% more damage; hits break armour (+15% damage taken for 4s).' }),
  S({ id: 'aftershock', name: 'Aftershock', attr: 'str', fits: [], signatureFor: 'ground_slam', mods: { special: 'aftershock' }, desc: '35% chance to slam a second time.' }),
  S({ id: 'retaliation', name: 'Retaliation', attr: 'str', fits: [], signatureFor: 'iron_guard', mods: { special: 'retaliate' }, desc: 'Blocked hits trigger a counter-attack for 200% weapon damage.' }),
  S({ id: 'rallying_roar', name: 'Rallying Roar', attr: 'str', fits: [], signatureFor: 'war_cry', mods: { special: 'rally', durationPct: 50 }, desc: '50% longer buff; regenerate 2% of life per second while it lasts; interrupts also stun.' }),
  S({ id: 'flurry', name: 'Flurry', attr: 'dex', fits: [], signatureFor: 'twin_strike', mods: { special: 'flurry' }, desc: 'Adds a third strike. Each consecutive use grants 6% more attack speed (max 30%).' }),
  S({ id: 'virulence', name: 'Virulence', attr: 'dex', fits: [], signatureFor: 'poison_dart', mods: { special: 'virulence' }, desc: 'When a poisoned enemy dies, its poisons spread to another enemy.' }),
  S({ id: 'ambush', name: 'Ambush', attr: 'dex', fits: [], signatureFor: 'smoke_step', mods: { special: 'ambush' }, desc: 'Your next attack after Smoke Step is a Mega Crit (400% damage, ignores critical multiplier).' }),
  S({ id: 'hemorrhage', name: 'Hemorrhage', attr: 'dex', fits: [], signatureFor: 'lacerate', mods: { special: 'hemorrhage' }, desc: 'When the bleed expires it bursts for 50% of the damage it dealt.' }),
  S({ id: 'overload', name: 'Overload', attr: 'int', fits: [], signatureFor: 'spark', mods: { special: 'overload', chains: 1 }, desc: 'Chains 1 more time; each chain deals 20% more damage.' }),
  S({ id: 'inferno', name: 'Inferno', attr: 'int', fits: [], signatureFor: 'fireball', mods: { special: 'inferno' }, desc: 'Ignites spread to enemies next to the target, and the blast leaves burning ground around it for 3s.' }),
  S({ id: 'glacial_shell', name: 'Glacial Shell', attr: 'int', fits: [], signatureFor: 'frost_ward', mods: { special: 'glacial' }, desc: 'When the shield breaks, the attacker is frozen for 2s.' }),
  S({ id: 'soul_tap', name: 'Soul Tap', attr: 'int', fits: [], signatureFor: 'arcane_siphon', mods: { special: 'soultap' }, desc: 'Life drained beyond your maximum becomes a shield.' }),
  S({ id: 'tenderise', name: 'Tenderise', attr: 'str', fits: [], signatureFor: 'pummel', mods: { special: 'tenderise' }, desc: 'Each blow on the same target deals 10% more damage than the last.' }),
  S({ id: 'blood_frenzy', name: 'Blood Frenzy', attr: 'str', fits: [], signatureFor: 'berserk', mods: { special: 'bloodfrenzy' }, desc: 'Kills during Berserk extend it by 1s (up to 12s).' }),
  S({ id: 'counterweight', name: 'Counterweight', attr: 'str', fits: [], signatureFor: 'parry', mods: { special: 'counterweight' }, desc: 'Each hit Parry blocks grants 15% more damage on your next attack (up to 30%).' }),
  S({ id: 'verdict', name: 'Verdict', attr: 'str', fits: [], signatureFor: 'judgement_hammer', mods: { special: 'verdict' }, desc: 'Hits on stunned enemies arc to 2 other enemies for 50% damage.' }),
  S({ id: 'pyre', name: 'Pyre', attr: 'str', fits: [], signatureFor: 'infernal_blow', mods: { special: 'pyre' }, desc: 'When an enemy it ignited dies, it explodes for 10% of its maximum life as fire damage to the pack.' }),
  S({ id: 'volley_fire', name: 'Volley Fire', attr: 'dex', fits: [], signatureFor: 'barrage', mods: { special: 'volley' }, desc: 'Adds a 5th arrow; the last arrow of each volley always hits.' }),
  S({ id: 'hailstorm', name: 'Hailstorm', attr: 'dex', fits: [], signatureFor: 'rain_of_arrows', mods: { special: 'hailstorm' }, desc: '30% chance to rain a second volley.' }),
  S({ id: 'misdirection', name: 'Misdirection', attr: 'dex', fits: [], signatureFor: 'feint', mods: { special: 'misdirection' }, desc: 'After you evade a hit, your next Feint deals 100% more damage.' }),
  S({ id: 'twist_the_knife', name: 'Twist the Knife', attr: 'dex', fits: [], signatureFor: 'backstab', mods: { special: 'twist' }, desc: 'Backstab refreshes the duration of every ailment on the target.' }),
  S({ id: 'splinter', name: 'Splinter', attr: 'dex', fits: [], signatureFor: 'ice_shot', mods: { special: 'splinter' }, desc: 'Hitting a chilled enemy shatters shards into 2 others for 40% damage.' }),
  S({ id: 'permafrost', name: 'Permafrost', attr: 'int', fits: [], signatureFor: 'glacial_lance', mods: { special: 'permafrost' }, desc: 'If the target is already chilled, it is frozen for 1.5s (0.6s for bosses).' }),
  S({ id: 'clarity', name: 'Clarity', attr: 'int', fits: [], signatureFor: 'meditate', mods: { special: 'clarity' }, desc: 'For 4s after Meditate, skills cost 30% less mana.' }),
  S({ id: 'static_field', name: 'Static Field', attr: 'int', fits: [], signatureFor: 'shock_nova', mods: { special: 'staticfield' }, desc: 'Its lightning always shocks.' }),
  S({ id: 'holy_ground', name: 'Holy Ground', attr: 'int', fits: [], signatureFor: 'consecrate', mods: { special: 'holyground' }, desc: 'The regeneration also restores 1% of maximum Energy Shield per second.' }),
  S({ id: 'shatterpoint', name: 'Shatterpoint', attr: 'int', fits: [], signatureFor: 'frost_needle', mods: { special: 'shatterpoint' }, desc: 'Critical strikes chill; hits against chilled enemies deal 15% more damage.' }),
  S({ id: 'run_down', name: 'Run Down', attr: 'str', fits: [], signatureFor: 'cavalry_charge', mods: { special: 'rundown' }, desc: 'Every enemy in the line is stunned for 1s (0.4s for bosses).' }),
  S({ id: 'cracked_hide', name: 'Cracked Hide', attr: 'str', fits: [], signatureFor: 'vulnerability', mods: { special: 'crackedhide' }, desc: 'The curse also breaks armour for as long as it lasts (+15% damage taken).' }),
  S({ id: 'hit_and_fade', name: 'Hit and Fade', attr: 'dex', fits: [], signatureFor: 'raiding_leap', mods: { special: 'hitfade' }, desc: 'Evade every hit for 1.5s after you land.' }),
  S({ id: 'feigned_retreat', name: 'Feigned Retreat', attr: 'dex', fits: [], signatureFor: 'parting_shot', mods: { special: 'feignedretreat' }, desc: 'Your next attack after Parting Shot deals 40% more damage.' }),
  S({ id: 'gale_rider', name: 'Gale Rider', attr: 'dex', fits: [], signatureFor: 'tailwind', mods: { special: 'galerider' }, desc: 'While Tailwind lasts, skills recover from cooldowns 25% faster.' }),
  S({ id: 'snare', name: 'Snare', attr: 'dex', fits: [], signatureFor: 'hobble', mods: { special: 'snare' }, desc: 'Cursed enemies are stopped dead for 1s (0.4s for bosses).' }),
  S({ id: 'ember_trail', name: 'Ember Trail', attr: 'int', fits: [], signatureFor: 'ember_dash', mods: { special: 'embertrail' }, desc: 'The burning trail deals twice the damage.' }),
  S({ id: 'overflow', name: 'Overflow', attr: 'int', fits: [], signatureFor: 'arcane_surge', mods: { special: 'overflow' }, desc: 'While Arcane Surge lasts, skills cost 25% less mana.' }),
  S({ id: 'contagion', name: 'Contagion', attr: 'int', fits: [], signatureFor: 'elemental_weakness', mods: { special: 'contagion' }, desc: 'When a cursed enemy dies, the curse jumps to another enemy with the time it had left.' }),
  S({ id: 'absolution', name: 'Absolution', attr: 'str', fits: [], signatureFor: 'flagellate', mods: { lifeLeech: 6 }, desc: '6% of damage leeched as life.' }),
  S({ id: 'flay', name: 'Flay', attr: 'str', fits: [], signatureFor: 'scourge', mods: { special: 'flay' }, desc: 'Hits break armour (+15% damage taken for 4s).' }),
  S({ id: 'blood_oath', name: 'Blood Oath', attr: 'str', fits: [], signatureFor: 'blood_rite', mods: { special: 'bloodoath' }, desc: 'While Blood Rite lasts, 3% of damage is leeched as life.' }),
  S({ id: 'barbed_ward', name: 'Barbed Ward', attr: 'str', fits: [], signatureFor: 'blood_ward', mods: { special: 'barbedward' }, desc: 'When the shield breaks, the attacker takes twice the Life you spent on it.' }),
  S({ id: 'gnawing_wound', name: 'Gnawing Wound', attr: 'dex', fits: [], signatureFor: 'gash', mods: { special: 'gnaw' }, desc: '30% more damage against bleeding enemies.' }),
  S({ id: 'blood_trail', name: 'Blood Trail', attr: 'dex', fits: [], signatureFor: 'barbed_arrow', mods: { special: 'bloodtrail' }, desc: 'When a bleeding enemy dies, its bleed jumps to another enemy.' }),
  S({ id: 'weeping_wounds', name: 'Weeping Wounds', attr: 'dex', fits: [], signatureFor: 'stigmata', mods: { special: 'weeping' }, desc: 'Your hits on cursed enemies cause Bleeding, unless the skill causes an ailment of its own.' }),
  S({ id: 'arterial_spray', name: 'Arterial Spray', attr: 'int', fits: [], signatureFor: 'blood_lance', mods: { special: 'arterial' }, desc: 'Bleeds spread to enemies next to the target.' }),
  S({ id: 'ashes_to_ashes', name: 'Ashes to Ashes', attr: 'int', fits: [], signatureFor: 'burnt_offering', mods: { manaMult: 1.5 }, desc: 'Burns 50% more Life, and all of it goes into the blast.' }),
  S({ id: 'pale_communion', name: 'Pale Communion', attr: 'int', fits: [], signatureFor: 'transfusion', mods: { special: 'communion' }, desc: 'Returns the same amount of Mana as well.' }),
  S({ id: 'press_gang', name: 'Press Gang', attr: 'str', fits: [], signatureFor: 'drowned_thralls', mods: { special: 'pressgang' }, desc: 'Each kill by a thrall restores 15% of every thrall\'s life.' }),
  S({ id: 'crusted_hide', name: 'Crusted Hide', attr: 'str', fits: [], signatureFor: 'barnacle_brute', mods: { special: 'crustedhide' }, desc: 'The Brute takes 40% less damage.' }),
  S({ id: 'drag_under', name: 'Drag Under', attr: 'str', fits: [], signatureFor: 'riptide', mods: { special: 'dragunder' }, desc: 'Everything it drags is stunned for 1s.' }),
  S({ id: 'deep_toll', name: 'Deep Toll', attr: 'str', fits: [], signatureFor: 'drowned_bell', mods: { special: 'deeptoll' }, desc: 'The bell also restores 30% of every minion\'s life.' }),
  S({ id: 'broadside', name: 'Broadside', attr: 'dex', fits: [], signatureFor: 'boarding_party', mods: { chains: 2 }, desc: 'Their shots chain to 2 more enemies.' }),
  S({ id: 'reel_in', name: 'Reel In', attr: 'dex', fits: [], signatureFor: 'harpoon', mods: { special: 'reelin' }, desc: 'Drags the target all the way into melee range.' }),
  S({ id: 'flensing_wind', name: 'Flensing Wind', attr: 'dex', fits: [], signatureFor: 'squall', mods: { special: 'flay' }, desc: 'Hits break armour (+15% damage taken for 4s).' }),
  S({ id: 'deep_chill', name: 'Deep Chill', attr: 'int', fits: [], signatureFor: 'tidecallers', mods: { special: 'shatterpoint' }, desc: 'Critical strikes chill; hits against chilled enemies deal 15% more damage.' }),
  S({ id: 'charged_air', name: 'Charged Air', attr: 'int', fits: [], signatureFor: 'thunderhead', mods: { special: 'staticfield' }, desc: 'Its lightning always shocks.' }),
  S({ id: 'black_ice', name: 'Black Ice', attr: 'int', fits: [], signatureFor: 'whirlpool', mods: { special: 'permafrost' }, desc: 'If what it hits is already chilled, it is frozen for 1.5s (0.6s for bosses).' }),
  S({ id: 'abyssal_hunger', name: 'Abyssal Hunger', attr: 'int', fits: [], signatureFor: 'leviathan', mods: { special: 'abyssal' }, desc: 'Each kill by the Leviathan keeps it here 2s longer.' }),
  S({ id: 'wither_will', name: 'Wither Will', attr: 'int', fits: [], signatureFor: 'enfeeble', mods: { special: 'witherwill' }, desc: 'Killing a cursed enemy restores 4% of your life.' }),
  S({ id: 'sundering', name: 'Sundering', attr: 'str', fits: [], signatureFor: 'titans_blow', mods: { special: 'sunder' }, desc: 'Hits break armour (+15% damage taken for 4s) and add 50% more Stagger.' }),
  S({ id: 'buried_alive', name: 'Buried Alive', attr: 'str', fits: [], signatureFor: 'avalanche', mods: { special: 'buried' }, desc: 'Its stuns last twice as long.' }),
  S({ id: 'recoil', name: 'Recoil', attr: 'str', fits: [], signatureFor: 'bulwark', mods: { special: 'recoil' }, desc: 'When the shield breaks, enemies in melee range are stunned for 2s (0.4s for bosses, with 25 Stagger).' }),
  S({ id: 'battering_ram', name: 'Battering Ram', attr: 'str', fits: [], signatureFor: 'shield_crush', mods: { special: 'ram' }, desc: 'Spends your whole shield on the hit, which gains all of it.' }),
  S({ id: 'immovable', name: 'Immovable', attr: 'str', fits: [], signatureFor: 'mountain_stance', mods: { special: 'immovable' }, desc: 'While Mountain Stance lasts, your stuns last 50% longer.' }),
  S({ id: 'long_draw', name: 'Long Draw', attr: 'dex', fits: [], signatureFor: 'siege_shot', mods: { special: 'longdraw' }, desc: 'After a kill, your next wind-up is 90% shorter, not 50%.' }),
  S({ id: 'cheap_shot', name: 'Cheap Shot', attr: 'dex', fits: [], signatureFor: 'blackjack', mods: { special: 'cheapshot' }, desc: 'Hits on stunned enemies are always critical.' }),
  S({ id: 'cataclysm', name: 'Cataclysm', attr: 'int', fits: [], signatureFor: 'meteor', mods: { special: 'cataclysm' }, desc: 'The impact leaves burning ground around the target for 4s.' }),
  S({ id: 'radiance', name: 'Radiance', attr: 'int', fits: [], signatureFor: 'sacred_aegis', mods: { special: 'radiance' }, desc: 'When the shield breaks, it strikes every enemy for half of what it held.' }),
  S({ id: 'dead_weight', name: 'Dead Weight', attr: 'int', fits: [], signatureFor: 'burden', mods: { special: 'deadweight' }, desc: 'Cursed enemies take 25% more damage while stunned.' }),
  S({ id: 'unmoved', name: 'Unmoved', attr: 'str', fits: [], signatureFor: 'worldbreaker', mods: { special: 'unmoved' }, desc: 'You take 25% less damage from hits during the wind-up. The blow still counts all of it.' }),
  S({ id: 'dying_oath', name: 'Dying Oath', attr: 'str', fits: [], signatureFor: 'last_legion', mods: { special: 'dyingoath' }, desc: 'A legionary who falls leaves you a shield worth half its life, up to half of yours.' }),
  S({ id: 'collective_guilt', name: 'Collective Guilt', attr: 'dex', fits: [], signatureFor: 'death_warrant', mods: { special: 'collective' }, desc: 'When the debt lands, enemies next to the target pay half of it.' }),
  S({ id: 'reaping_wind', name: 'Reaping Wind', attr: 'dex', fits: [], signatureFor: 'gale_of_knives', mods: { special: 'reaping' }, desc: 'Each enemy it kills keeps it here 1s longer.' }),
  S({ id: 'absolute_power', name: 'Absolute Power', attr: 'int', fits: [], signatureFor: 'royal_decree', mods: { special: 'absolute' }, desc: 'Also fires spells that are still on cooldown.' }),
  S({ id: 'eyewall', name: 'Eyewall', attr: 'int', fits: [], signatureFor: 'eye_of_the_storm', mods: { special: 'eyewall' }, desc: 'Each enemy a strike hits gives back 2% of the shield.' }),

  // general
  S({ id: 'added_fire', name: 'Added Fire', attr: 'str', fits: ['hit'], mods: { extra: { type: 'fire', pct: 25 }, manaMult: 1.2 }, desc: 'Gain 25% of the hit as extra fire damage.' }),
  S({ id: 'added_cold', name: 'Added Cold', attr: 'dex', fits: ['hit'], mods: { extra: { type: 'cold', pct: 25 }, manaMult: 1.2 }, desc: 'Gain 25% of the hit as extra cold damage.' }),
  S({ id: 'added_lightning', name: 'Added Lightning', attr: 'int', fits: ['hit'], mods: { extra: { type: 'light', pct: 25 }, manaMult: 1.2 }, desc: 'Gain 25% of the hit as extra lightning damage.' }),
  S({ id: 'brutality', name: 'Brutality', attr: 'str', fits: ['attack'], mods: { morePhys: 40, noElemental: true, manaMult: 1.3 }, desc: '40% more physical damage; deals no elemental damage.' }),
  S({ id: 'elemental_focus', name: 'Elemental Focus', attr: 'int', fits: ['hit'], mods: { moreElem: 35, manaMult: 1.3 }, desc: '35% more elemental damage.' }),
  S({ id: 'faster_attacks', name: 'Faster Attacks', attr: 'dex', fits: ['attack'], mods: { attackSpeed: 25, manaMult: 1.15 }, desc: '25% more attack speed.' }),
  S({ id: 'faster_casts', name: 'Faster Casts', attr: 'int', fits: ['cast'], mods: { castSpeed: 25, manaMult: 1.15 }, desc: '25% more cast speed. Only fits spells with a cast time.' }),
  S({ id: 'efficiency', name: 'Efficiency', attr: 'int', fits: ['attack', 'spell', 'guard', 'buff'], mods: { manaMult: 0.6 }, desc: '40% less mana and Life cost.' }),
  S({ id: 'critical_strikes', name: 'Critical Strikes', attr: 'dex', fits: ['hit'], mods: { critChance: 100, critMulti: 30, manaMult: 1.2 }, desc: '100% increased critical strike chance and +30% critical multiplier.' }),
  S({ id: 'life_leech', name: 'Life Leech', attr: 'str', fits: ['hit'], mods: { lifeLeech: 3, manaMult: 1.8 }, desc: '3% of damage leeched as life.' }),
  S({ id: 'mana_leech', name: 'Mana Leech', attr: 'int', fits: ['hit'], mods: { manaLeech: 3, manaMult: 1.8 }, desc: '3% of damage leeched as mana.' }),
  S({ id: 'pilgrims_measure', name: "Pilgrim's Measure", attr: 'str', fits: ['hit'], mods: { manaLeech: 4, manaMult: 1.8 }, desc: '4% of damage leeched as mana.' }),
  S({ id: 'beggars_cup', name: "Beggar's Cup", attr: 'dex', fits: ['hit'], mods: { manaLeech: 4, manaMult: 1.8 }, desc: '4% of damage leeched as mana.' }),
  S({ id: 'alms_of_the_mind', name: 'Alms of the Mind', attr: 'int', fits: ['hit'], mods: { manaLeech: 4, manaMult: 1.8 }, desc: '4% of damage leeched as mana.' }),
  S({ id: 'frozen_will', name: 'Frozen Will', attr: 'str', fits: ['hit'], mods: { manaLeech: 5, manaMult: 1.8 }, desc: '5% of damage leeched as mana.' }),
  S({ id: 'thaw', name: 'Thaw', attr: 'dex', fits: ['hit'], mods: { lifeLeech: 5, manaMult: 1.8 }, desc: '5% of damage leeched as life.' }),
  S({ id: 'stone_pulse', name: 'Stone Pulse', attr: 'int', fits: ['hit'], mods: { lifeLeech: 5, manaMult: 1.8 }, desc: '5% of damage leeched as life.' }),
  S({ id: 'salt_thirst', name: 'Salt Thirst', attr: 'str', fits: ['hit'], mods: { manaLeech: 6, manaMult: 1.8 }, desc: '6% of damage leeched as mana.' }),
  S({ id: 'ebb', name: 'Ebb', attr: 'dex', fits: ['hit'], mods: { manaLeech: 6, manaMult: 1.8 }, desc: '6% of damage leeched as mana.' }),
  S({ id: 'undertow_of_thought', name: 'Undertow of Thought', attr: 'int', fits: ['hit'], mods: { manaLeech: 6, manaMult: 1.8 }, desc: '6% of damage leeched as mana.' }),
  S({ id: 'tribute_of_iron', name: 'Tribute of Iron', attr: 'str', fits: ['hit'], mods: { manaLeech: 8, manaMult: 1.8 }, desc: '8% of damage leeched as mana.' }),
  S({ id: 'blood_tax', name: 'Blood Tax', attr: 'dex', fits: ['hit'], mods: { lifeLeech: 8, manaMult: 1.8 }, desc: '8% of damage leeched as life.' }),
  S({ id: 'imperial_vintage', name: 'Imperial Vintage', attr: 'int', fits: ['hit'], mods: { lifeLeech: 8, manaMult: 1.8 }, desc: '8% of damage leeched as life.' }),
  S({ id: 'multistrike', name: 'Multistrike', attr: 'str', fits: ['melee'], mods: { repeats: 1, repeatDamage: 75, manaMult: 1.4 }, desc: "Repeats the attack's hits once more at 75% damage. Only the damage repeats: buffs and other effects happen once." }),
  S({ id: 'spell_echo', name: 'Spell Echo', attr: 'int', fits: ['spell'], needs: ['hit'], mods: { repeats: 1, repeatDamage: 75, manaMult: 1.4 }, desc: "Repeats the spell's hits once more at 75% damage. Only the damage repeats: shields, buffs and other effects happen once." }),
  S({ id: 'pierce', name: 'Pierce', attr: 'dex', fits: ['projectile'], mods: { special: 'pierce', moreDamage: -15, manaMult: 1.25 }, desc: "Projectiles pass through, hitting every enemy in the target's lane front to back; 15% less damage." }),
  S({ id: 'chain', name: 'Chain', attr: 'dex', fits: ['projectile', 'chain'], mods: { chains: 1, moreDamage: -10, manaMult: 1.3 }, desc: 'Hits chain to 1 more enemy; 10% less damage.' }),
  S({ id: 'lingering', name: 'Lingering', attr: 'int', fits: ['duration'], mods: { durationPct: 50, manaMult: 1.2 }, desc: 'Effects and ailments last 50% longer.' }),
  S({ id: 'surefoot', name: 'Surefoot', attr: 'dex', fits: ['movement'], mods: { special: 'surefoot', manaMult: 1.1 }, desc: 'For 3s after you move, ground hazards under you do nothing.' }),
  S({ id: 'fresh_horses', name: 'Fresh Horses', attr: 'dex', fits: ['movement'], mods: { cooldownPct: 25, manaMult: 1.2 }, desc: '25% shorter cooldown.' }),
  S({ id: 'trample', name: 'Trample', attr: 'str', fits: ['movement'], mods: { moreDamage: 30, manaMult: 1.3 }, desc: '30% more damage.' }),
  S({ id: 'wide_hex', name: 'Wide Hex', attr: 'int', fits: ['curse'], mods: { special: 'widehex', manaMult: 1.4 }, desc: 'The curse lands on every enemy on the field.' }),
  S({ id: 'deep_hex', name: 'Deep Hex', attr: 'int', fits: ['curse'], mods: { curseEffect: 30, manaMult: 1.3 }, desc: '30% more curse effect.' }),
  S({ id: 'serrated_edge', name: 'Serrated Edge', attr: 'dex', fits: ['attack'], mods: { special: 'serrated', moreDamage: -10, manaMult: 1.2 }, desc: 'Hits cause Bleeding (20% of the hit per second for 4s), unless the skill causes an ailment of its own; 10% less damage.' }),
  S({ id: 'blood_price', name: 'Blood Price', attr: 'str', fits: ['hit'], not: ['blood'], mods: { special: 'bloodprice', moreDamage: 15 }, desc: 'Pays its mana cost with twice as much Life instead; 15% more damage.' }),
  S({ id: 'deep_wounds', name: 'Deep Wounds', attr: 'dex', fits: ['bleed'], mods: { moreBleed: 40, manaMult: 1.2 }, desc: '40% more damage from the bleeds it causes.' }),
  S({ id: 'tithe', name: 'Tithe', attr: 'int', fits: ['blood'], mods: { special: 'tithe', manaMult: 1.1 }, desc: 'A third of the Life it spends flows back over 4s.' }),
  S({ id: 'desperate_faith', name: 'Desperate Faith', attr: 'str', fits: ['hit'], mods: { lowLifeMore: 40, manaMult: 1.2 }, desc: "40% more damage while you're below half Life." }),
  S({ id: 'crushing_weight', name: 'Crushing Weight', attr: 'str', fits: ['hit'], mods: { stunChance: 25, stagger: 50, manaMult: 1.2 }, desc: '+25% chance to stun on hit, and 50% more Stagger against bosses.' }),
  S({ id: 'ponderous', name: 'Ponderous', attr: 'str', fits: ['heavy'], mods: { moreDamage: 40, windupPct: 25, manaMult: 1.2 }, desc: '40% more damage, and a 25% longer wind-up.' }),
  S({ id: 'shockwave', name: 'Shockwave', attr: 'str', fits: ['heavy'], mods: { special: 'shockwave', manaMult: 1.3 }, desc: 'The blow shakes the 2 nearest other enemies for 30% damage.' }),
  S({ id: 'reinforced', name: 'Reinforced', attr: 'int', fits: ['shield'], mods: { shieldMore: 30, manaMult: 1.2 }, desc: '30% more shield.' }),
  S({ id: 'follow_through', name: 'Follow Through', attr: 'str', fits: ['heavy'], mods: { special: 'followthrough', manaMult: 1.2 }, desc: 'The damage a killing blow had to spare carries on into the nearest enemy.' }),
  S({ id: 'savage_crew', name: 'Savage Crew', attr: 'str', fits: ['minion'], mods: { moreDamage: 30, manaMult: 1.3 }, desc: '30% more minion damage.' }),
  S({ id: 'hardened_crew', name: 'Hardened Crew', attr: 'str', fits: ['minion'], mods: { minionLife: 50, manaMult: 1.2 }, desc: '50% more minion life.' }),
  S({ id: 'full_muster', name: 'Full Muster', attr: 'dex', fits: ['minion'], mods: { minionCount: 1, moreDamage: -15, manaMult: 1.4 }, desc: 'Keeps 1 more minion up; 15% less minion damage.' }),
  S({ id: 'gale_force', name: 'Gale Force', attr: 'int', fits: ['storm'], mods: { stormSpeed: 30, manaMult: 1.3 }, desc: 'The storm strikes 30% faster.' }),
  S({ id: 'stormfront', name: 'Stormfront', attr: 'int', fits: ['storm'], not: ['shield'], mods: { stormCount: 1, manaMult: 1.4 }, desc: 'Keeps 1 more storm up at once.' }),
  S({ id: 'reprisal', name: 'Reprisal', attr: 'str', fits: ['hit'], not: ['heavy', 'minion', 'storm'], mods: { special: 'reprisal', manaMult: 1.3 }, desc: 'Fires by itself when a hit lands on you, instead of by rule, and takes none of your time. It can do so once a second at most.' }),
  S({ id: 'succession', name: 'Succession', attr: 'dex', fits: ['hit'], not: ['heavy', 'minion', 'storm'], mods: { special: 'succession', manaMult: 1.3 }, desc: 'Fires by itself when you kill an enemy, instead of by rule, and takes none of your time. It can do so once a second at most.' }),
  S({ id: 'imperial_reach', name: 'Imperial Reach', attr: 'int', fits: ['hit'], not: ['minion', 'storm'], mods: { special: 'reach', moreDamage: -55, manaMult: 2 }, desc: 'Hits every enemy on the field, whatever its shape; 55% less damage.' }),
  S({ id: 'goaded', name: 'Goaded', attr: 'str', fits: ['heavy'], mods: { special: 'goaded', manaMult: 1.2 }, desc: 'Each hit that lands on you cuts 15% off the wind-up.' }),
  S({ id: 'eternal_ward', name: 'Eternal Ward', attr: 'int', fits: ['shield'], mods: { special: 'eternal', shieldMore: -20, manaMult: 1.3 }, desc: 'The shield has no time limit: it stays until it breaks, even between packs; 20% less shield.' }),
  S({ id: 'funeral_rites', name: 'Funeral Rites', attr: 'str', fits: ['minion'], mods: { special: 'funeral', manaMult: 1.3 }, desc: 'A minion that falls strikes everything next to it for 3 times its hit.' }),
  S({ id: 'crowned_storm', name: 'Crowned Storm', attr: 'int', fits: ['storm'], mods: { special: 'crowned', manaMult: 1.2 }, desc: 'The storm stays around you, over at least 2 rings, instead of on the target.' }),
];

export function activeGemDef(id: string): ActiveGemDef {
  const g = ACTIVE_GEMS.find((x) => x.id === id);
  if (!g) throw new Error(`Unknown skill gem ${id}`);
  return g;
}

export function supportGemDef(id: string): SupportGemDef {
  const g = SUPPORT_GEMS.find((x) => x.id === id);
  if (!g) throw new Error(`Unknown support gem ${id}`);
  return g;
}

export const SKILL_BAR_SLOTS = 6;
export const MAX_GEM_LEVEL = 20;
export const MAX_SUPPORT_SLOTS = 5;

/** Every character's default attack takes this long before weapon and attack speed. */
export const BASE_ATTACK_MS = 3000;

/** The attack you fall back to when no skill is ready. */
export const DEFAULT_ATTACK: ActiveGemDef = {
  id: 'default_attack', name: 'Default Attack', attr: 'str', role: 'main', tags: ['attack', 'hit'],
  manaCost: 0, cooldownMs: 0, timeMs: BASE_ATTACK_MS, color: '#9a968c',
  effect: { weaponPct: 100, targets: 'single' },
  desc: 'A plain weapon swing. Free.',
  defaultRule: { when: 'always' },
};
