import type { AreaShape } from '../engine/battlefield';
import type { DamageType, GroundKind, StatKey } from '../engine/types';

export type GemAttr = 'str' | 'dex' | 'int';
export type GemTag = 'attack' | 'spell' | 'melee' | 'projectile' | 'area' | 'chain' | 'duration' | 'guard' | 'buff' | 'dot' | 'sustain';
export type SkillRole = 'main' | 'burst' | 'area' | 'guard' | 'buff' | 'curse' | 'sustain';

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
  /** leaves hazardous ground on cells it hits: damage per second as % of the hit on the target */
  ground?: { kind: GroundKind; pctPerSec: number; durationMs: number; area?: AreaShape };
  /** shoves the front rank back a column */
  knockback?: boolean;
  /** base crit chance for spells */
  crit?: number;
  stunChance?: number;
  ailment?: { kind: 'bleed' | 'poison' | 'ignite'; pctPerSec: number; durationMs: number };
  /** guard: block this many hits */
  blocks?: number;
  /** guard: evade everything for this long */
  evadeMs?: number;
  /** guard: absorb shield as % of max life */
  shieldPct?: number;
  /** guard/buff: timed stats and more-damage; regenPct is % of max life per second (negative drains, never below 1 life) */
  buff?: { durationMs: number; stats?: Partial<Record<StatKey, number>>; moreDamage?: number; regenPct?: number };
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
  desc: string;
  color: string;
  /** the suggested automation rule, offered in the rule editor (gems themselves start Manual only) */
  defaultRule: TacticRule;
}

export type RuleCondition =
  | 'always'
  | 'manual'
  | 'enemyCasting'
  | 'lifeBelow'
  | 'manaAbove'
  | 'manaBelow'
  | 'enemiesAtLeast'
  | 'targetLifeAbove'
  | 'notActive'
  | 'bossOnly'
  | 'meterFull';

export interface TacticRule {
  when: RuleCondition;
  value?: number;
}

export const RULE_LABELS: Record<RuleCondition, { label: string; unit?: string; defaultValue?: number }> = {
  always: { label: 'Whenever ready' },
  manual: { label: 'Manual only' },
  enemyCasting: { label: 'When an enemy winds up' },
  lifeBelow: { label: 'When life below', unit: '%', defaultValue: 50 },
  manaAbove: { label: 'When mana above', unit: '%', defaultValue: 40 },
  manaBelow: { label: 'When mana below', unit: '%', defaultValue: 30 },
  enemiesAtLeast: { label: 'When enemies at least', unit: '', defaultValue: 3 },
  targetLifeAbove: { label: 'When target life above', unit: '%', defaultValue: 50 },
  notActive: { label: 'When its effect is not active' },
  bossOnly: { label: 'Only against bosses' },
  meterFull: { label: 'When your class meter is full (Rage, Malice…)' },
};

const A = (d: ActiveGemDef) => d;

export const ACTIVE_GEMS: ActiveGemDef[] = [
  // ---------- Strength ----------
  A({
    id: 'heavy_strike', name: 'Heavy Strike', attr: 'str', role: 'main', tags: ['attack', 'melee'],
    manaCost: 4, cooldownMs: 0, timeMs: 3900, color: '#d0574a',
    effect: { weaponPct: 185, targets: 'single', stunChance: 0.25 },
    desc: 'A slow, crushing blow. 25% chance to stun.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'ground_slam', name: 'Ground Slam', attr: 'str', role: 'area', tags: ['attack', 'melee', 'area'],
    manaCost: 8, cooldownMs: 5000, timeMs: 3600, color: '#b0643a',
    effect: { weaponPct: 95, area: 'splash', stunChance: 0.1 },
    desc: 'Slam the ground, hitting the target and every enemy around it.',
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
    desc: 'Interrupts enemy wind-ups, shoves the front rank back a step, and grants 20% more damage for 6s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'pummel', name: 'Pummel', attr: 'str', role: 'main', tags: ['attack', 'melee'],
    manaCost: 5, cooldownMs: 0, timeMs: 3300, color: '#c46a4a',
    effect: { weaponPct: 50, hits: 3, targets: 'single' },
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
    id: 'parry', name: 'Parry', attr: 'str', role: 'guard', tags: ['guard', 'duration'],
    manaCost: 6, cooldownMs: 6000, timeMs: 600, color: '#b8a68a',
    effect: { blocks: 2 },
    desc: 'Turn aside the next two hits.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'judgement_hammer', name: 'Judgement Hammer', attr: 'str', role: 'main', tags: ['attack', 'melee'],
    manaCost: 6, cooldownMs: 0, timeMs: 3900, color: '#e8d25a',
    effect: { weaponPct: 150, targets: 'single', stunChance: 0.2, convert: { type: 'light', pct: 40 } },
    desc: 'A crushing blow that crackles with storm. 40% of physical damage is converted to lightning; 20% chance to stun.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'infernal_blow', name: 'Infernal Blow', attr: 'str', role: 'main', tags: ['attack', 'melee', 'dot', 'duration'],
    manaCost: 6, cooldownMs: 0, timeMs: 3600, color: '#ff6a3a',
    effect: { weaponPct: 120, targets: 'single', ailment: { kind: 'ignite', pctPerSec: 25, durationMs: 3000 } },
    desc: 'A burning strike that sets the target alight.',
    defaultRule: { when: 'always' },
  }),

  // ---------- Dexterity ----------
  A({
    id: 'twin_strike', name: 'Twin Strike', attr: 'dex', role: 'main', tags: ['attack', 'melee'],
    manaCost: 4, cooldownMs: 0, timeMs: 2700, color: '#5fbf6a',
    effect: { weaponPct: 62, hits: 2, targets: 'single' },
    desc: 'Strike twice in quick succession.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'poison_dart', name: 'Poison Dart', attr: 'dex', role: 'curse', tags: ['attack', 'projectile', 'dot', 'duration'],
    manaCost: 6, cooldownMs: 0, timeMs: 2400, color: '#7bc04a',
    effect: { weaponPct: 55, targets: 'single', ailment: { kind: 'poison', pctPerSec: 30, durationMs: 4000 } },
    desc: 'A dart that poisons. Poison stacks.',
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
    id: 'lacerate', name: 'Lacerate', attr: 'dex', role: 'burst', tags: ['attack', 'melee', 'dot', 'duration'],
    manaCost: 10, cooldownMs: 0, timeMs: 3300, color: '#c0392b',
    effect: { weaponPct: 130, targets: 'single', ailment: { kind: 'bleed', pctPerSec: 60, durationMs: 4000 } },
    desc: 'A deep cut that bleeds heavily.',
    defaultRule: { when: 'targetLifeAbove', value: 50 },
  }),
  A({
    id: 'barrage', name: 'Barrage', attr: 'dex', role: 'main', tags: ['attack', 'projectile'],
    manaCost: 5, cooldownMs: 0, timeMs: 2700, color: '#8fd26a',
    effect: { weaponPct: 30, hits: 4, targets: 'single' },
    desc: 'Loose a rapid volley of four arrows at one target.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'rain_of_arrows', name: 'Rain of Arrows', attr: 'dex', role: 'area', tags: ['attack', 'projectile', 'area'],
    manaCost: 8, cooldownMs: 5000, timeMs: 3300, color: '#6aa84f',
    effect: { weaponPct: 70, targets: 'all' },
    desc: 'Arrows fall across the whole pack.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'feint', name: 'Feint', attr: 'dex', role: 'main', tags: ['attack', 'melee', 'duration'],
    manaCost: 5, cooldownMs: 0, timeMs: 2400, color: '#9fc7a0',
    effect: { weaponPct: 90, targets: 'single', buff: { durationMs: 3000, stats: { evasionPct: 40 } } },
    desc: 'A false strike that leaves you hard to hit: 40% increased Evasion Rating for 3s.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'backstab', name: 'Backstab', attr: 'dex', role: 'burst', tags: ['attack', 'melee'],
    manaCost: 10, cooldownMs: 0, timeMs: 3000, color: '#5a8a5a',
    effect: { weaponPct: 240, targets: 'single', moreVsAiling: 50 },
    desc: 'A brutal strike, deadliest on a weakened foe: 50% more damage against enemies with an ailment.',
    defaultRule: { when: 'targetLifeAbove', value: 30 },
  }),
  A({
    id: 'ice_shot', name: 'Ice Shot', attr: 'dex', role: 'main', tags: ['attack', 'projectile'],
    manaCost: 5, cooldownMs: 0, timeMs: 2700, color: '#8fd8e8',
    effect: { weaponPct: 100, targets: 'single', convert: { type: 'cold', pct: 50 }, chillMs: 3000 },
    desc: 'A frozen arrow that chills the target. 50% of physical damage is converted to cold.',
    defaultRule: { when: 'always' },
  }),

  // ---------- Intelligence ----------
  A({
    id: 'spark', name: 'Spark', attr: 'int', role: 'main', tags: ['spell', 'projectile', 'chain'],
    manaCost: 5, cooldownMs: 2000, timeMs: 0, color: '#6fc8ff',
    effect: { base: [4, 16], type: 'light', targets: 'chain', chains: 2, crit: 6 },
    desc: 'Crackling bolts that chain to the 2 nearest enemies.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'fireball', name: 'Fireball', attr: 'int', role: 'burst', tags: ['spell', 'projectile', 'dot', 'duration'],
    manaCost: 12, cooldownMs: 4000, timeMs: 3600, color: '#ff7a45',
    effect: { base: [12, 20], type: 'fire', targets: 'single', crit: 6, ailment: { kind: 'ignite', pctPerSec: 40, durationMs: 3000 } },
    desc: 'A heavy fire bolt that ignites.',
    defaultRule: { when: 'manaAbove', value: 30 },
  }),
  A({
    id: 'frost_ward', name: 'Frost Ward', attr: 'int', role: 'guard', tags: ['spell', 'guard', 'duration'],
    manaCost: 12, cooldownMs: 10000, timeMs: 0, color: '#bfe3ff',
    effect: { shieldPct: 30, buff: { durationMs: 5000 } },
    desc: 'An ice shield absorbing damage equal to 30% of your life for 5s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'arcane_siphon', name: 'Arcane Siphon', attr: 'int', role: 'sustain', tags: ['spell', 'sustain'],
    manaCost: 0, cooldownMs: 5000, timeMs: 0, color: '#9b6dde',
    effect: { base: [6, 10], type: 'cold', targets: 'single', crit: 5, leechLife: 25, leechMana: 40 },
    desc: 'Drain the target, returning life and mana. Costs no mana.',
    defaultRule: { when: 'lifeBelow', value: 60 },
  }),
  A({
    id: 'glacial_lance', name: 'Glacial Lance', attr: 'int', role: 'burst', tags: ['spell', 'projectile'],
    manaCost: 22, cooldownMs: 3000, timeMs: 3600, color: '#9fd8ff',
    effect: { base: [24, 38], type: 'cold', targets: 'single', crit: 6, chillMs: 3000 },
    desc: 'A spear of ice that chills. Expensive, devastating.',
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
    id: 'shock_nova', name: 'Shock Nova', attr: 'int', role: 'area', tags: ['spell', 'area'],
    manaCost: 9, cooldownMs: 4000, timeMs: 0, color: '#a0c8ff',
    effect: { base: [5, 11], type: 'light', targets: 'all', crit: 5 },
    desc: 'A burst of lightning that strikes every enemy.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'consecrate', name: 'Consecrate', attr: 'int', role: 'sustain', tags: ['spell', 'area', 'duration'],
    manaCost: 10, cooldownMs: 6000, timeMs: 0, color: '#f0c070',
    effect: { base: [5, 9], type: 'fire', targets: 'all', buff: { durationMs: 4000, regenPct: 2 } },
    desc: 'Hallow the ground: burn the pack, and regenerate 2% of your life per second for 4s.',
    defaultRule: { when: 'lifeBelow', value: 70 },
  }),
  A({
    id: 'frost_needle', name: 'Frost Needle', attr: 'int', role: 'main', tags: ['spell', 'projectile'],
    manaCost: 5, cooldownMs: 2000, timeMs: 0, color: '#c0e8ff',
    effect: { base: [2, 5], type: 'cold', hits: 3, targets: 'single', crit: 4 },
    desc: 'Three needles of ice in quick succession.',
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
  durationPct?: number;
  /** signature behaviour, handled by the combat engine */
  special?: string;
}

export interface SupportGemDef {
  id: string;
  name: string;
  attr: GemAttr;
  /** fits a skill if it has any of these tags (or it's the signature skill) */
  fits: GemTag[];
  /** signature supports only fit this one skill */
  signatureFor?: string;
  mods: SupportMods;
  desc: string;
}

const S = (d: SupportGemDef) => d;

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
  S({ id: 'static_field', name: 'Static Field', attr: 'int', fits: [], signatureFor: 'shock_nova', mods: { special: 'staticfield' }, desc: 'Enemies hit take 10% increased lightning damage for 4s.' }),
  S({ id: 'holy_ground', name: 'Holy Ground', attr: 'int', fits: [], signatureFor: 'consecrate', mods: { special: 'holyground' }, desc: 'The regeneration also restores 1% of maximum Energy Shield per second.' }),
  S({ id: 'shatterpoint', name: 'Shatterpoint', attr: 'int', fits: [], signatureFor: 'frost_needle', mods: { special: 'shatterpoint' }, desc: 'Critical strikes chill; hits against chilled enemies deal 15% more damage.' }),

  // general
  S({ id: 'added_fire', name: 'Added Fire', attr: 'str', fits: ['attack', 'spell'], mods: { extra: { type: 'fire', pct: 25 }, manaMult: 1.2 }, desc: 'Gain 25% of the hit as extra fire damage.' }),
  S({ id: 'added_cold', name: 'Added Cold', attr: 'dex', fits: ['attack', 'spell'], mods: { extra: { type: 'cold', pct: 25 }, manaMult: 1.2 }, desc: 'Gain 25% of the hit as extra cold damage.' }),
  S({ id: 'added_lightning', name: 'Added Lightning', attr: 'int', fits: ['attack', 'spell'], mods: { extra: { type: 'light', pct: 25 }, manaMult: 1.2 }, desc: 'Gain 25% of the hit as extra lightning damage.' }),
  S({ id: 'brutality', name: 'Brutality', attr: 'str', fits: ['attack'], mods: { morePhys: 40, noElemental: true, manaMult: 1.3 }, desc: '40% more physical damage; deals no elemental damage.' }),
  S({ id: 'elemental_focus', name: 'Elemental Focus', attr: 'int', fits: ['attack', 'spell'], mods: { moreElem: 35, manaMult: 1.3 }, desc: '35% more elemental damage.' }),
  S({ id: 'faster_attacks', name: 'Faster Attacks', attr: 'dex', fits: ['attack'], mods: { attackSpeed: 25, manaMult: 1.15 }, desc: '25% more attack speed.' }),
  S({ id: 'faster_casts', name: 'Faster Casts', attr: 'int', fits: ['spell'], mods: { castSpeed: 25, manaMult: 1.15 }, desc: '25% more cast speed.' }),
  S({ id: 'efficiency', name: 'Efficiency', attr: 'int', fits: ['attack', 'spell', 'guard', 'buff'], mods: { manaMult: 0.6 }, desc: '40% less mana cost.' }),
  S({ id: 'critical_strikes', name: 'Critical Strikes', attr: 'dex', fits: ['attack', 'spell'], mods: { critChance: 100, critMulti: 30, manaMult: 1.2 }, desc: '100% increased critical strike chance and +30% critical multiplier.' }),
  S({ id: 'life_leech', name: 'Life Leech', attr: 'str', fits: ['attack', 'spell'], mods: { lifeLeech: 3, manaMult: 1.1 }, desc: '3% of damage leeched as life.' }),
  S({ id: 'mana_leech', name: 'Mana Leech', attr: 'int', fits: ['attack', 'spell'], mods: { manaLeech: 3, manaMult: 1.1 }, desc: '3% of damage leeched as mana.' }),
  S({ id: 'multistrike', name: 'Multistrike', attr: 'str', fits: ['melee'], mods: { repeats: 1, repeatDamage: 75, manaMult: 1.4 }, desc: 'Melee attacks repeat once more at 75% damage.' }),
  S({ id: 'spell_echo', name: 'Spell Echo', attr: 'int', fits: ['spell'], mods: { repeats: 1, repeatDamage: 75, manaMult: 1.4 }, desc: 'Spells repeat once more at 75% damage.' }),
  S({ id: 'pierce', name: 'Pierce', attr: 'dex', fits: ['projectile'], mods: { special: 'pierce', moreDamage: -15, manaMult: 1.25 }, desc: "Projectiles pass through, hitting every enemy in the target's lane front to back; 15% less damage." }),
  S({ id: 'chain', name: 'Chain', attr: 'dex', fits: ['projectile', 'chain'], mods: { chains: 1, moreDamage: -10, manaMult: 1.3 }, desc: 'Hits chain to 1 more enemy; 10% less damage.' }),
  S({ id: 'lingering', name: 'Lingering', attr: 'int', fits: ['duration'], mods: { durationPct: 50, manaMult: 1.2 }, desc: 'Effects and ailments last 50% longer.' }),
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
  id: 'default_attack', name: 'Default Attack', attr: 'str', role: 'main', tags: ['attack'],
  manaCost: 0, cooldownMs: 0, timeMs: BASE_ATTACK_MS, color: '#9a968c',
  effect: { weaponPct: 100, targets: 'single' },
  desc: 'A plain weapon swing. Free.',
  defaultRule: { when: 'always' },
};
