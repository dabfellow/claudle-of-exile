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
export type GemTag = 'attack' | 'spell' | 'melee' | 'projectile' | 'area' | 'chain' | 'duration' | 'guard' | 'buff' | 'curse' | 'movement' | 'dot' | 'sustain' | 'hit' | 'bleed' | 'blood' | 'heavy' | 'shield' | 'minion' | 'storm' | 'mark' | 'warcry' | 'totem' | 'doom' | 'exertion';
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
  /** spells: the share of flat added damage each hit gets, for a spell that hits several times (default all of it) */
  addedShare?: number;
  /** 'single' hits the target, 'all' the whole pack, 'chain' the target plus N others (each hop to the nearest) */
  targets?: 'single' | 'all' | 'chain';
  chains?: number;
  /** gem levels at which the chain reaches one more enemy (`gemChains`) */
  chainsAt?: number[];
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
  buff?: { durationMs: number; stats?: Partial<Record<StatKey, number>>; moreDamage?: number; regenPct?: number; outpace?: boolean; maxStacks?: number };
  /** each hit stacks % increased physical damage taken on the target, up to maxStacks; a new stack refreshes them all */
  rend?: { pctPerStack: number; maxStacks: number; durationMs: number };
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
  /** Mark skill: applies a Mark of this kind to the target; burst fires when stacks reach maxStacks */
  markKind?: string;
  /** Parameters for the Mark's burst when stacks fill */
  markBurst?: { damage: [number, number]; type: DamageType; radius?: number; extraEffect?: string };
  /** Maximum stacks before this mark bursts (default 5) */
  markMaxStacks?: number;
  /** This skill adds Doom to its targets (each hit increments doom by doomPerHit) */
  addsDoom?: boolean;
  /** Override for how many Doom each hit adds (default 1 for doom skills) */
  doomPerHit?: number;
  /** This is an Exertion-tagged skill: when Exertion >= 5, fires powered version */
  exertion?: boolean;
  /** The powered (Exerted) version: overrides from the base effect when exerted */
  exertedEffect?: { moreDamage?: number; extraTargets?: 'all' | 'nearest'; extraPct?: number };
  /** How much Exertion this skill's hits add (default 1) */
  exertionPerHit?: number;
  /** Totem skill: places a totem rather than attacking directly */
  totem?: boolean;
  /** Totem's attack interval in ms */
  totemAttackMs?: number;
  /** How long the totem lasts in ms (default 20000) */
  totemDurationMs?: number;
  /** Warcry skill: scales its effect with enemies in combat */
  warcry?: boolean;
  /** Per-enemy bonus for warcry scaling, capped at maxEnemies */
  warcryScaling?: { perEnemy?: Partial<Record<StatKey, number>>; moreDamagePerEnemy?: number; maxEnemies: number };
  /** Base chance to poison on hit for chaos skills (0–1) */
  poisonChance?: number;
}

export interface ActiveGemDef {
  id: string;
  name: string;
  attr: GemAttr;
  role: SkillRole;
  tags: GemTag[];
  manaCost: number;
  /**
   * 0 for main skills and plain area attacks, which PoE-style are limited only by their cast time and mana cost;
   * guards, buffs, curses, movement, summons, storms, drains, heavy slams and other spells keep one
   */
  cooldownMs: number;
  /**
   * Base time to use the skill, ms. Attacks: attack time, sped up by weapon and attack speed.
   * Spells and utility: cast time, sped up by cast speed. Every skill takes time, like PoE: a skill
   * with no time would fire on top of the turn for free.
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

/** Weapon families by what they're good for (docs/GAME.md). */
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
  | 'exertionFull'
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
export type SkillAim = 'martyrs' | 'weakPoint' | 'choir';

export const SKILL_AIMS: { id: SkillAim; label: string }[] = [
  { id: 'martyrs', label: 'Chained martyrs' },
  { id: 'weakPoint', label: 'Weak points' },
  { id: 'choir', label: 'Choir adds' },
];

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
  exertionFull: { label: 'When Exertion is full' },
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
    manaCost: 4, cooldownMs: 0, timeMs: 3300, color: '#d0574a',
    effect: { weaponPct: 392, targets: 'single', stunChance: 0.25 }, weapons: HEAVY_WEAPONS,
    desc: 'A slow, crushing blow. 25% chance to stun.',
    defaultRule: { when: 'always' },
  }),
  // fast sword and axe cuts that build Rage and stack something up for the big blow
  A({
    id: 'quick_slash', name: 'Quick Slash', attr: 'str', role: 'main', tags: ['attack', 'melee', 'duration', 'hit'],
    manaCost: 3, cooldownMs: 0, timeMs: 1500, color: '#d88a5a',
    effect: { weaponPct: 84, targets: 'single', buff: { durationMs: 6000, moreDamage: 5, maxStacks: 5 } }, weapons: ['sword', 'axe'],
    desc: 'A quick cut that sets your rhythm: 5% more damage for 6s (more with gem level), stacking up to 5 times. Each use refreshes every stack; at 5 it waits until they are about to run out.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'rending_cut', name: 'Rending Cut', attr: 'str', role: 'main', tags: ['attack', 'melee', 'duration', 'hit'],
    manaCost: 3, cooldownMs: 0, timeMs: 1500, color: '#b8584a',
    effect: { weaponPct: 84, targets: 'single', rend:{ pctPerStack: 6, maxStacks: 5, durationMs: 6000 } }, weapons: ['sword', 'axe'],
    desc: 'A quick cut that opens the target up: it takes 6% increased physical damage for 6s, stacking up to 5 times. Each use refreshes every stack; at 5 it waits until they are about to run out.',
    defaultRule: { when: 'bossOnly' },
  }),
  A({
    id: 'ground_slam', name: 'Ground Slam', attr: 'str', role: 'area', tags: ['attack', 'melee', 'area', 'hit'],
    manaCost: 8, cooldownMs: 0, timeMs: 3600, color: '#b0643a',
    effect: { weaponPct: 133, area: 'arc', stunChance: 0.1 }, weapons: [...SLAM_WEAPONS, 'sword'],
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
    effect: { weaponPct: 147, hits: 3, targets: 'single' }, weapons: SLAM_WEAPONS,
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
    effect: { ailmentChance: 25, weaponPct: 644, targets: 'single', stunChance: 0.25, convert: { type: 'light', pct: 50 } }, weapons: SLAM_WEAPONS,
    desc: 'A slow, thunderous blow. 50% of physical damage is converted to lightning; 25% chance to stun.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'infernal_blow', name: 'Infernal Blow', attr: 'str', role: 'main', tags: ['attack', 'melee', 'dot', 'duration', 'hit'],
    manaCost: 6, cooldownMs: 0, timeMs: 3600, color: '#ff6a3a',
    effect: { weaponPct: 448, targets: 'single', convert: { type: 'fire', pct: 50 }, ailmentChance: 100 }, weapons: SLAM_WEAPONS,
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
    manaCost: 10, cooldownMs: 10000, timeMs: 600, color: '#a8503a',
    effect: { area: 'splash', radius: 1, curse: { durationMs: 8000, physTaken: 30 } },
    desc: 'Curse the target and enemies next to it for 8s: they take 30% increased physical damage.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'flagellate', name: 'Flagellate', attr: 'str', role: 'main', tags: ['attack', 'melee', 'blood', 'hit'],
    manaCost: 0, cooldownMs: 0, timeMs: 3300, color: '#b03a3a',
    effect: { weaponPct: 588, targets: 'single', lifePct: 3 }, weapons: STRIKE_WEAPONS,
    desc: 'A savage blow that tears at you as well. Spends 3% of your Life instead of mana.',
    defaultRule: { when: 'lifeAbove', value: 60 },
  }),
  A({
    id: 'scourge', name: 'Scourge', attr: 'str', role: 'area', tags: ['attack', 'melee', 'area', 'dot', 'duration', 'bleed', 'blood', 'hit'],
    manaCost: 0, cooldownMs: 0, timeMs: 3300, color: '#a8342f',
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
    effect: { weaponPct: 1064, targets: 'single', stunChance: 1, stunMs: 2000, stagger: 25 }, weapons: HEAVY_WEAPONS,
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
    effect: { weaponPct: 840, targets: 'single', stunChance: 0.3, shieldToDamage: 50 }, weapons: STRIKE_WEAPONS,
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
    effect: { weaponPct: 87, hits: 2, targets: 'single' }, weapons: STRIKE_WEAPONS,
    desc: 'Strike twice in quick succession.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'poison_dart', name: 'Poison Dart', attr: 'dex', role: 'main', tags: ['attack', 'projectile', 'dot', 'duration', 'hit'],
    manaCost: 6, cooldownMs: 0, timeMs: 2400, color: '#7bc04a',
    effect: { weaponPct: 77, targets: 'single', convert: { type: 'chaos', pct: 50 }, ailment: { kind: 'poison', pctPerSec: 30, durationMs: 4000 } }, range: 3, weapons: ['sword', 'axe', 'mace', 'dagger', 'bow'],
    desc: 'A thrown dart (3 rings) that poisons. Poison stacks. Any weapon but a wand, staff or sceptre.',
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
    effect: { weaponPct: 45, hits: 4, targets: 'single' }, weapons: BOW,
    desc: 'Loose a rapid volley of four arrows at one target.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'rain_of_arrows', name: 'Rain of Arrows', attr: 'dex', role: 'area', tags: ['attack', 'projectile', 'area', 'hit'],
    manaCost: 8, cooldownMs: 0, timeMs: 3300, color: '#6aa84f',
    effect: { weaponPct: 78, area: 'splash', radius: 2 }, weapons: BOW,
    desc: 'Arrows rain on the target and everything within 2 steps of it.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'rain_of_daggers', name: 'Rain of Daggers', attr: 'dex', role: 'area', tags: ['attack', 'projectile', 'area', 'dot', 'duration', 'hit'],
    manaCost: 8, cooldownMs: 0, timeMs: 3300, color: '#5f9a6a',
    effect: { weaponPct: 70, area: 'splash', radius: 2, convert: { type: 'chaos', pct: 50 }, ailment: { kind: 'poison', pctPerSec: 20, durationMs: 4000 } }, range: 3, weapons: ['dagger'],
    desc: 'Poisoned knives thrown (3 rings) to rain on the target and everything within 2 steps of it. Poison stacks.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'feint', name: 'Feint', attr: 'dex', role: 'main', tags: ['attack', 'melee', 'duration', 'hit'],
    manaCost: 5, cooldownMs: 0, timeMs: 2400, color: '#9fc7a0',
    effect: { weaponPct: 154, targets: 'single', buff: { durationMs: 3000, stats: { evasionPct: 40 } } }, weapons: STRIKE_WEAPONS,
    desc: 'A false strike that leaves you hard to hit: 40% increased Evasion Rating for 3s.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'backstab', name: 'Backstab', attr: 'dex', role: 'burst', tags: ['attack', 'melee', 'hit'],
    manaCost: 10, cooldownMs: 0, timeMs: 3000, color: '#5a8a5a',
    effect: { weaponPct: 165, targets: 'single', moreVsAiling: 50 }, weapons: ['dagger', 'sword'],
    desc: 'A brutal strike, deadliest on a weakened foe: 50% more damage against enemies with an ailment.',
    defaultRule: { when: 'targetLifeAbove', value: 30 },
  }),
  A({
    id: 'ice_shot', name: 'Ice Shot', attr: 'dex', role: 'main', tags: ['attack', 'projectile', 'duration', 'hit'],
    manaCost: 5, cooldownMs: 0, timeMs: 2700, color: '#8fd8e8',
    effect: { weaponPct: 129, targets: 'single', convert: { type: 'cold', pct: 50 }, chillMs: 3000 }, weapons: BOW,
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
    manaCost: 10, cooldownMs: 10000, timeMs: 600, color: '#7a9a5a',
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
    manaCost: 10, cooldownMs: 10000, timeMs: 600, color: '#b0485a',
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
    manaCost: 5, cooldownMs: 0, timeMs: 2400, color: '#6fc8ff',
    effect: { ailmentChance: 25, base: [2, 7], type: 'light', targets: 'chain', chains: 2, chainsAt: [7, 13, 19], crit: 6 },
    desc: 'Crackling bolts that chain to the 2 nearest enemies, 3 from gem level 7, 4 from 13 and 5 from 19. Each hop deals 15% less than the last.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'fireball', name: 'Fireball', attr: 'int', role: 'burst', tags: ['spell', 'projectile', 'dot', 'duration', 'hit'],
    manaCost: 12, cooldownMs: 4000, timeMs: 3600, color: '#ff7a45',
    effect: { base: [7, 12], type: 'fire', targets: 'single', crit: 6, ailmentChance: 100 },
    desc: 'A heavy fire bolt that always burns.',
    defaultRule: { when: 'manaAbove', value: 30 },
  }),
  A({
    id: 'frost_ward', name: 'Frost Ward', attr: 'int', role: 'guard', tags: ['spell', 'guard', 'duration', 'shield'],
    manaCost: 12, cooldownMs: 10000, timeMs: 750, color: '#bfe3ff',
    effect: { shieldPct: 30, buff: { durationMs: 5000 } },
    desc: 'An ice shield absorbing damage equal to 30% of your life for 5s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'arcane_siphon', name: 'Arcane Siphon', attr: 'int', role: 'sustain', tags: ['spell', 'sustain', 'hit'],
    manaCost: 0, cooldownMs: 5000, timeMs: 2400, color: '#9b6dde',
    effect: { ailmentChance: 25, base: [30, 46], type: 'cold', targets: 'single', crit: 5, leechLife: 15 },
    desc: 'Drain the target: 15% of the damage returns as life. Costs no mana.',
    defaultRule: { when: 'lifeBelow', value: 60 },
  }),
  A({
    id: 'glacial_lance', name: 'Glacial Lance', attr: 'int', role: 'burst', tags: ['spell', 'projectile', 'duration', 'hit'],
    manaCost: 22, cooldownMs: 5000, timeMs: 3600, color: '#9fd8ff',
    effect: { base: [43, 62], type: 'cold', targets: 'single', crit: 7, chillMs: 3000 },
    desc: 'A spear of ice that chills. Slow and expensive, devastating.',
    defaultRule: { when: 'manaAbove', value: 80 },
  }),
  A({
    id: 'meditate', name: 'Meditate', attr: 'int', role: 'sustain', tags: ['spell', 'sustain'],
    manaCost: 0, cooldownMs: 15000, timeMs: 600, color: '#7f9fe0',
    effect: { restoreManaPct: 30 },
    desc: 'Still the mind; refill the well. Restores 30% of your mana.',
    defaultRule: { when: 'manaBelow', value: 30 },
  }),
  A({
    id: 'shock_nova', name: 'Shock Nova', attr: 'int', role: 'area', tags: ['spell', 'area', 'hit'],
    manaCost: 9, cooldownMs: 4000, timeMs: 3000, color: '#a0c8ff',
    effect: { ailmentChance: 25, base: [4, 9], type: 'light', area: 'nova', radius: 2, crit: 5 }, range: 2,
    desc: 'A burst of lightning that strikes every enemy within 2 rings of you.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'consecrate', name: 'Consecrate', attr: 'int', role: 'sustain', tags: ['spell', 'area', 'duration', 'hit'],
    manaCost: 10, cooldownMs: 6000, timeMs: 2400, color: '#f0c070',
    effect: { ailmentChance: 25, base: [5, 9], type: 'fire', area: 'nova', radius: 2, buff: { durationMs: 4000, regenPct: 2 } }, range: 2,
    desc: 'Hallow the ground: burn every enemy within 2 rings of you, and regenerate 2% of your life per second for 4s.',
    defaultRule: { when: 'lifeBelow', value: 70 },
  }),
  A({
    id: 'frost_needle', name: 'Frost Needle', attr: 'int', role: 'main', tags: ['spell', 'projectile', 'hit'],
    manaCost: 5, cooldownMs: 0, timeMs: 2700, color: '#c0e8ff',
    effect: { ailmentChance: 25, base: [3, 6], type: 'cold', hits: 3, addedShare: 1 / 3, targets: 'single', crit: 6 },
    desc: 'Three needles of ice in quick succession. Each takes a third of your added spell damage.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'ember_dash', name: 'Ember Dash', attr: 'int', role: 'area', tags: ['spell', 'area', 'movement', 'duration', 'hit'],
    manaCost: 11, cooldownMs: 7000, timeMs: 1500, color: '#ff9a5a',
    effect: { ailmentChance: 25, base: [10, 16], type: 'fire', area: 'beam', crit: 5, stepOut: true, ground: { kind: 'burning', pctPerSec: 30, durationMs: 3000, area: 'beam' } },
    desc: 'Dash out of any ground hazard in a streak of flame, burning the whole line to your target and leaving it on fire for 3s.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'arcane_surge', name: 'Arcane Surge', attr: 'int', role: 'buff', tags: ['spell', 'buff', 'duration'],
    manaCost: 12, cooldownMs: 16000, timeMs: 600, color: '#b08bff',
    effect: { buff: { durationMs: 8000, stats: { spellPct: 30, castSpeedPct: 15 } } },
    desc: 'For 8s: 30% increased Spell Damage and 15% increased Cast Speed.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'elemental_weakness', name: 'Elemental Weakness', attr: 'int', role: 'curse', tags: ['spell', 'curse', 'area', 'duration'],
    manaCost: 10, cooldownMs: 10000, timeMs: 600, color: '#c08a4a',
    effect: { area: 'splash', radius: 1, curse: { durationMs: 8000, resPen: 30 } },
    desc: 'Curse the target and enemies next to it for 8s: they have 30 less of every elemental resistance.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'enfeeble', name: 'Enfeeble', attr: 'int', role: 'curse', tags: ['spell', 'curse', 'area', 'duration'],
    manaCost: 10, cooldownMs: 10000, timeMs: 600, color: '#8a7a9a',
    effect: { area: 'splash', radius: 1, curse: { durationMs: 8000, dealLess: 25 } },
    desc: 'Curse the target and enemies next to it for 8s: their hits deal 25% less damage.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'blood_lance', name: 'Blood Lance', attr: 'int', role: 'burst', tags: ['spell', 'projectile', 'dot', 'duration', 'bleed', 'blood', 'hit'],
    manaCost: 0, cooldownMs: 4000, timeMs: 3000, color: '#a02840',
    effect: { base: [20, 30], type: 'phys', targets: 'single', crit: 6, lifePct: 6, ailment: { kind: 'bleed', pctPerSec: 40, durationMs: 4000 } },
    desc: 'A spear of your own blood that leaves the target bleeding. Spends 6% of your Life instead of mana.',
    defaultRule: { when: 'lifeAbove', value: 60 },
  }),
  A({
    id: 'burnt_offering', name: 'Burnt Offering', attr: 'int', role: 'area', tags: ['spell', 'area', 'blood', 'hit'],
    manaCost: 0, cooldownMs: 6000, timeMs: 3000, color: '#e0603a',
    effect: { ailmentChance: 25, base: [8, 13], type: 'fire', area: 'nova', radius: 2, crit: 5, lifePct: 10, lifeToDamage: 100 }, range: 2,
    desc: 'Burn 10% of your Life to scorch every enemy within 2 rings of you. All the Life spent is added to the damage.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'transfusion', name: 'Transfusion', attr: 'int', role: 'sustain', tags: ['spell', 'sustain', 'hit'],
    manaCost: 8, cooldownMs: 8000, timeMs: 1500, color: '#d05a70',
    effect: { base: [8, 14], type: 'phys', targets: 'single', crit: 5, consumeBleed: 30 },
    desc: "Drain the target's bleed: all the damage it had left lands at once, and 30% of that returns to you as Life (at most 25% of your Life).",
    defaultRule: { when: 'targetHas', status: 'bleeding' },
  }),
  A({
    id: 'meteor', name: 'Meteor', attr: 'int', role: 'burst', tags: ['spell', 'area', 'hit', 'heavy'],
    manaCost: 26, cooldownMs: 6000, timeMs: 5400, color: '#ff8a4a',
    effect: { ailmentChance: 25, base: [48, 72], type: 'fire', area: 'splash', radius: 1, crit: 6, stunChance: 0.6, stunMs: 1500, stagger: 20 },
    desc: 'Call a burning rock down on the target and the enemies next to it. It lands at the end of the cast; 60% chance to stun for 1.5s.',
    defaultRule: { when: 'manaAbove', value: 40 },
  }),
  A({
    id: 'sacred_aegis', name: 'Sacred Aegis', attr: 'int', role: 'guard', tags: ['spell', 'guard', 'duration', 'shield'],
    manaCost: 16, cooldownMs: 10000, timeMs: 750, color: '#f0e0a0',
    effect: { shieldPct: 30, shieldEs: true, buff: { durationMs: 6000 } },
    desc: 'A shield of light absorbing damage equal to 30% of your life and energy shield together, for 6s.',
    defaultRule: { when: 'enemyCasting' },
  }),
  A({
    id: 'burden', name: 'Burden', attr: 'int', role: 'curse', tags: ['spell', 'curse', 'area', 'duration'],
    manaCost: 10, cooldownMs: 10000, timeMs: 600, color: '#7a7088',
    effect: { area: 'splash', radius: 1, curse: { durationMs: 8000, slow: 15, stunTaken: 40 } },
    desc: 'Curse the target and enemies next to it for 8s: they move and attack 15% slower, stuns on them last 40% longer, and bosses take 40% more Stagger.',
    defaultRule: { when: 'notActive' },
  }),

  // ---------- Act 5, Tides and summons (docs/GAME.md) ----------
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
    manaCost: 10, cooldownMs: 0, timeMs: 3300, color: '#3f8fa8',
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
    id: 'tidecallers', name: 'Tidecallers', attr: 'int', role: 'summon', tags: ['spell', 'minion', 'hit'],
    manaCost: 18, cooldownMs: 4000, timeMs: 1500, color: '#5a9ac8',
    effect: { base: [10, 16], type: 'cold', crit: 5, chillMs: 2000, minion: { name: 'Tidecaller', art: 'tidecaller', count: 2, lifePct: 20, attackMs: 2400, reach: 3 } }, range: 3,
    desc: 'Call 2 drowned priests who stay close to you and cast cold bolts that chill, across 3 rings. They stay between packs.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'thunderhead', name: 'Thunderhead', attr: 'int', role: 'area', tags: ['spell', 'area', 'duration', 'storm', 'hit'],
    manaCost: 14, cooldownMs: 6000, timeMs: 3300, color: '#c8c86a',
    effect: { ailmentChance: 25, base: [11, 18], type: 'light', crit: 6, area: 'splash', radius: 1, storm: { everyMs: 1500, durationMs: 10000, max: 1 } },
    desc: 'A black cloud settles on the target for 10s. Lightning strikes everything under it every 1.5s, and whatever walks in after.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'whirlpool', name: 'Whirlpool', attr: 'int', role: 'area', tags: ['spell', 'area', 'duration', 'storm', 'hit'],
    manaCost: 14, cooldownMs: 8000, timeMs: 3300, color: '#4f7ac8',
    effect: { base: [6, 10], type: 'cold', crit: 5, area: 'splash', radius: 2, chillMs: 1500, storm: { everyMs: 1200, durationMs: 8000, max: 1, pull: true } },
    desc: 'A churning pool within 2 steps of the target for 8s. Every 1.2s it chills what\'s in it and draws them toward the centre.',
    defaultRule: { when: 'enemiesAtLeast', value: 2 },
  }),
  A({
    id: 'leviathan', name: 'Call the Leviathan', attr: 'int', role: 'summon', tags: ['spell', 'minion', 'area', 'duration', 'hit'],
    manaCost: 40, cooldownMs: 30000, timeMs: 2400, color: '#3a5a9a',
    effect: { ailmentChance: 25, base: [42, 66], type: 'cold', crit: 5, area: 'splash', radius: 1, minion: { name: 'Leviathan', art: 'wyrmling', count: 1, lifePct: 150, attackMs: 2800, reach: 2, durationMs: 14000 } }, range: 2,
    desc: 'The deep answers: for 14s a Leviathan fights at your side, crushing the target and everything next to it.',
    defaultRule: { when: 'bossOnly' },
  }),

  // ---------- Act 6, The last empire (docs/GAME.md) ----------
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
    manaCost: 18, cooldownMs: 12000, timeMs: 600, color: '#5a3a6a',
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
    id: 'royal_decree', name: 'Royal Decree', attr: 'int', role: 'burst', tags: ['spell', 'hit'],
    manaCost: 42, cooldownMs: 24000, timeMs: 1800, color: '#e8c84a',
    effect: { ailmentChance: 25, base: [54, 78], type: 'light', targets: 'single', crit: 6, decree: 60 },
    desc: 'Speak with the last king\'s voice. Every other damage spell on your bar that is ready fires at once, for free and with no cast time, at 60% of its damage, and starts its cooldown.',
    defaultRule: { when: 'manaAbove', value: 50 },
  }),
  A({
    id: 'eye_of_the_storm', name: 'Eye of the Storm', attr: 'int', role: 'guard', tags: ['spell', 'guard', 'area', 'duration', 'shield', 'storm', 'hit'],
    manaCost: 28, cooldownMs: 14000, timeMs: 900, color: '#8ac8e8',
    effect: { ailmentChance: 25, base: [30, 46], type: 'light', area: 'nova', radius: 2, crit: 6, shieldPct: 35, shieldEs: true, shieldToDamage: 10, buff: { durationMs: 8000 }, storm: { everyMs: 1200, durationMs: 8000, max: 1, anchored: true, whileShield: true } }, range: 2,
    desc: 'A shield absorbing damage equal to 35% of your life and energy shield for 8s, with a storm around it that strikes everything within 2 rings every 1.2s. Each strike adds 10% of the shield still standing, and the storm ends with the shield.',
    defaultRule: { when: 'enemyCasting' },
  }),

  // ---------- Skill reform: drains (docs/GAME.md) ----------
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
    manaCost: 0, cooldownMs: 5000, timeMs: 2400, color: '#7a8ae0',
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
    manaCost: 0, cooldownMs: 5000, timeMs: 2400, color: '#e08a5a',
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
    manaCost: 0, cooldownMs: 5000, timeMs: 2400, color: '#9a9aa8',
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
    manaCost: 0, cooldownMs: 5000, timeMs: 2400, color: '#e0c860',
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
    manaCost: 13, cooldownMs: 10000, timeMs: 750, color: '#a89a90',
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
    manaCost: 0, cooldownMs: 10000, timeMs: 750, color: '#b05a6a',
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
    manaCost: 22, cooldownMs: 10000, timeMs: 750, color: '#5a8ac8',
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
    manaCost: 8, cooldownMs: 0, timeMs: 2700, color: '#a8c070',
    effect: { weaponPct: 85, area: 'arc' }, range: 3, weapons: BOW,
    desc: 'A sweeping bow shot (3 rings) that hits the target and the enemies either side of it.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'flensing_fan', name: 'Flensing Fan', attr: 'dex', role: 'area', tags: ['attack', 'melee', 'area', 'dot', 'duration', 'bleed', 'hit'],
    manaCost: 10, cooldownMs: 0, timeMs: 3000, color: '#c06a60',
    effect: { weaponPct: 105, area: 'arc', ailment: { kind: 'bleed', pctPerSec: 40, durationMs: 4000 } }, range: 2,
    desc: 'A fan of cuts reaching 2 rings, across the target and the enemies either side of it, leaving them bleeding.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'rockslide_volley', name: 'Rockslide Volley', attr: 'dex', role: 'area', tags: ['attack', 'projectile', 'area', 'hit'],
    manaCost: 12, cooldownMs: 0, timeMs: 3300, color: '#a09a80',
    effect: { weaponPct: 130, area: 'splash', radius: 2, stunChance: 0.2 }, range: 3,
    desc: 'Bring the slope down (3 rings, any weapon) on the target and everything within 2 steps of it. 20% chance to stun.',
    defaultRule: { when: 'enemiesAtLeast', value: 3 },
  }),
  A({
    id: 'drowning_bolt', name: 'Drowning Bolt', attr: 'int', role: 'burst', tags: ['spell', 'projectile', 'duration', 'hit'],
    manaCost: 20, cooldownMs: 4000, timeMs: 3000, color: '#4f8ac0',
    effect: { base: [42, 60], type: 'cold', targets: 'single', crit: 6, chillMs: 2000 },
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

  // ---------- Maps skills: Group 1 — Marks ----------
  A({
    id: 'brand_of_ruin', name: 'Brand of Ruin', attr: 'int', role: 'main', tags: ['spell', 'hit', 'mark', 'duration'],
    manaCost: 15, cooldownMs: 0, timeMs: 3000, color: '#7a3a9a',
    effect: { base: [80, 120], type: 'chaos', targets: 'single', markKind: 'brand_of_ruin', markBurst: { damage: [80, 120], type: 'chaos', extraEffect: 'poison' }, poisonChance: 0.15 },
    desc: 'Apply Brand of Ruin to the target: a chaos mark that bursts for 80–120 chaos and poisons when it reaches 5 stacks.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'scorched_brand', name: 'Scorched Brand', attr: 'int', role: 'burst', tags: ['spell', 'hit', 'mark', 'duration'],
    manaCost: 18, cooldownMs: 4000, timeMs: 3000, color: '#d04a2a',
    effect: { base: [100, 150], type: 'fire', targets: 'single', markKind: 'scorched_brand', markBurst: { damage: [100, 150], type: 'fire', radius: 1 } },
    desc: 'Apply Scorched Brand: when it reaches 5 stacks it bursts for 100–150 fire in a small radius.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'sunder_mark', name: 'Sunder Mark', attr: 'str', role: 'main', tags: ['attack', 'melee', 'hit', 'mark', 'duration'],
    manaCost: 16, cooldownMs: 0, timeMs: 3600, color: '#c08a4a',
    effect: { weaponPct: 160, targets: 'single', markKind: 'sunder_mark', markBurst: { damage: [0, 0], type: 'phys', radius: 1, extraEffect: 'armourBreak' } }, weapons: STRIKE_WEAPONS,
    desc: 'Strike for 160% weapon damage and apply Sunder Mark. At 5 stacks it bursts for 200% to all neighbours and breaks their armour.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'void_brand', name: 'Void Brand', attr: 'int', role: 'area', tags: ['spell', 'hit', 'mark', 'area', 'duration'],
    manaCost: 24, cooldownMs: 5000, timeMs: 2400, color: '#6a2a8a',
    effect: { base: [60, 90], type: 'chaos', area: 'splash', radius: 2, markKind: 'void_brand', markBurst: { damage: [60, 90], type: 'chaos', radius: 2 }, poisonChance: 0.10 },
    desc: 'Apply Void Brand to enemies in an area. At 5 stacks it bursts for 60–90 chaos to all enemies.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'fracture_mark', name: 'Fracture', attr: 'dex', role: 'main', tags: ['attack', 'melee', 'hit', 'mark', 'duration'],
    manaCost: 8, cooldownMs: 0, timeMs: 2400, color: '#5a9a5a',
    effect: { weaponPct: 100, targets: 'single', markKind: 'fracture_mark', markBurst: { damage: [0, 0], type: 'phys', radius: 1, extraEffect: 'stun' } }, weapons: STRIKE_WEAPONS,
    desc: 'Strike for 100% weapon damage and apply Fracture Mark. At 5 stacks it bursts for 80% to all in a small radius and stuns them.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'marked_for_death', name: 'Marked for Death', attr: 'dex', role: 'curse', tags: ['spell', 'curse', 'mark', 'duration'],
    manaCost: 12, cooldownMs: 10000, timeMs: 1500, color: '#7a4a4a',
    effect: { area: 'splash', radius: 1, markKind: 'marked_for_death', markBurst: { damage: [0, 0], type: 'phys' }, markMaxStacks: 4, curse: { durationMs: 8000, physTaken: 25 } },
    desc: 'Curse enemies to take 25% more damage from all sources. Marks on cursed enemies burst at 4 stacks instead of 5.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'shadow_mark', name: 'Shadow Mark', attr: 'dex', role: 'main', tags: ['attack', 'melee', 'hit', 'mark', 'duration'],
    manaCost: 10, cooldownMs: 0, timeMs: 2700, color: '#6a4a8a',
    effect: { weaponPct: 90, targets: 'single', convert: { type: 'chaos', pct: 50 }, markKind: 'shadow_mark', markBurst: { damage: [40, 60], type: 'chaos', extraEffect: 'poison' }, poisonChance: 0.15 },
    desc: 'Strike for 90% weapon damage (50% converted to chaos) and apply Shadow Mark. At 5 stacks it bursts for 40–60 chaos and poisons.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'martyrdom_brand', name: 'Martyrdom Brand', attr: 'str', role: 'guard', tags: ['guard', 'buff', 'mark', 'shield', 'duration'],
    manaCost: 15, cooldownMs: 10000, timeMs: 1500, color: '#9a7a4a',
    effect: { shieldPct: 35, buff: { durationMs: 5000 }, markKind: 'martyrdom_brand', markBurst: { damage: [0, 0], type: 'phys' } },
    desc: 'Raise a shield worth 35% of your life for 5s. Every hit you receive adds 1 stack to your attacker\'s mark; at 5 stacks the shield retaliates for 300% the damage absorbed.',
    defaultRule: { when: 'enemyCasting' },
  }),

  // ---------- Maps skills: Group 2 — Warcries ----------
  A({
    id: 'battle_cry', name: 'Battle Cry', attr: 'str', role: 'buff', tags: ['buff', 'warcry', 'duration'],
    manaCost: 0, cooldownMs: 6000, timeMs: 1500, color: '#d04a2a',
    effect: { warcry: true, buff: { durationMs: 4000, moreDamage: 25 }, warcryScaling: { moreDamagePerEnemy: 25, maxEnemies: 5 } },
    desc: '4s buff: 25% more damage per nearby enemy (max 5 = +125%).',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'rallying_cry', name: 'Rallying Cry', attr: 'str', role: 'sustain', tags: ['buff', 'warcry'],
    manaCost: 0, cooldownMs: 8000, timeMs: 1500, color: '#c0784a',
    effect: { warcry: true, warcryScaling: { perEnemy: { lifeRegenPct: 5 }, maxEnemies: 5 } },
    desc: 'Recover 5% life per nearby enemy (up to 5 = 25% life instantly).',
    defaultRule: { when: 'lifeBelow', value: 70 },
  }),
  A({
    id: 'hunters_call', name: "Hunter's Call", attr: 'dex', role: 'buff', tags: ['buff', 'warcry', 'duration'],
    manaCost: 0, cooldownMs: 5000, timeMs: 1500, color: '#6aba5a',
    effect: { warcry: true, buff: { durationMs: 4000, stats: { attackSpeedPct: 8 } }, warcryScaling: { perEnemy: { attackSpeedPct: 8 }, maxEnemies: 5 } },
    desc: '4s buff: 8% attack speed per nearby enemy (max 5 = +40%).',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'intimidate', name: 'Intimidate', attr: 'str', role: 'curse', tags: ['spell', 'curse', 'warcry', 'area', 'duration'],
    manaCost: 0, cooldownMs: 8000, timeMs: 1500, color: '#b03a3a',
    effect: { warcry: true, area: 'splash', radius: 10, curse: { durationMs: 6000, dealLess: 10 } },
    desc: 'For 6s all enemies take 15% more damage and have 10% less attack speed.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'ancestral_call', name: 'Ancestral Call', attr: 'str', role: 'summon', tags: ['attack', 'buff', 'warcry', 'minion', 'duration', 'hit'],
    manaCost: 0, cooldownMs: 10000, timeMs: 1500, color: '#c8a86a',
    // the Ancestors strike with 50% of your weapon (the summon itself has no reach of its own to close)
    effect: { weaponPct: 50, warcry: true, warcryScaling: { perEnemy: {}, maxEnemies: 6 }, minion: { name: 'Ancestor', art: 'warrior', count: 3, lifePct: 10, attackMs: 2000, reach: 1, durationMs: 8000 } }, range: RINGS,
    desc: 'Summon 1 Ancestor spirit per 2 nearby enemies (max 3) for 8s. Each deals 50% weapon damage.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'dark_howl', name: 'Dark Howl', attr: 'int', role: 'buff', tags: ['buff', 'warcry', 'duration'],
    manaCost: 0, cooldownMs: 8000, timeMs: 1500, color: '#7a3a9a',
    effect: { warcry: true, buff: { durationMs: 6000, moreDamage: 15 }, warcryScaling: { moreDamagePerEnemy: 15, maxEnemies: 5 }, poisonChance: 0.15 },
    desc: 'For 6s: spells have a chance per nearby enemy (up to 75%) to deal their damage as chaos (bypasses ES). Can poison.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'death_rattle', name: 'Death Rattle', attr: 'dex', role: 'area', tags: ['buff', 'warcry', 'duration'],
    manaCost: 0, cooldownMs: 6000, timeMs: 1500, color: '#7a9a3a',
    effect: { warcry: true, buff: { durationMs: 4000, moreDamage: 20 }, warcryScaling: { moreDamagePerEnemy: 20, maxEnemies: 5 } },
    desc: 'For 4s: your next kill causes the corpse to explode for 20% of its max life as physical to all, scaling with enemies nearby.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'primal_roar', name: 'Primal Roar', attr: 'str', role: 'area', tags: ['attack', 'area', 'warcry', 'hit'],
    manaCost: 0, cooldownMs: 10000, timeMs: 1500, color: '#c06a3a',
    effect: { warcry: true, weaponPct: 100, area: 'splash', radius: 3, stunChance: 0.5, warcryScaling: { perEnemy: {}, maxEnemies: 5 } },
    desc: 'Deal 100% weapon damage to all enemies and stun them for 0.5s per enemy nearby (max 2.5s).',
    defaultRule: { when: 'enemiesAtLeast', value: 2 },
  }),

  // ---------- Maps skills: Group 3 — Totems ----------
  A({
    id: 'flame_totem', name: 'Flame Totem', attr: 'int', role: 'summon',     tags: ['spell', 'hit', 'totem', 'duration'],
    manaCost: 8, cooldownMs: 12000, timeMs: 1200, color: '#d05a2a',
    effect: { totem: true, base: [4, 7], type: 'fire', totemAttackMs: 1500, totemDurationMs: 20000 },
    desc: 'Place a Flame Totem for 20s. It fires 4–7 fire damage every 1.5s at the nearest enemy.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'ice_totem', name: 'Ice Totem', attr: 'int', role: 'summon',     tags: ['spell', 'hit', 'totem', 'duration'],
    manaCost: 15, cooldownMs: 12000, timeMs: 1500, color: '#5a9aba',
    effect: { totem: true, base: [10, 16], type: 'cold', totemAttackMs: 1500, totemDurationMs: 20000 },
    desc: 'Place an Ice Totem for 20s. It fires 10–16 cold damage every 1.5s, chilling enemies.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'storm_totem', name: 'Storm Totem', attr: 'int', role: 'summon', tags: ['spell', 'hit', 'totem', 'chain', 'duration'],
    manaCost: 15, cooldownMs: 12000, timeMs: 1500, color: '#6a7aba',
    effect: { totem: true, base: [6, 24], type: 'light', totemAttackMs: 1000, totemDurationMs: 20000 },
    desc: 'Place a Storm Totem for 20s. It calls 6–24 lightning to a random enemy every 1s.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'war_totem', name: 'War Totem', attr: 'str', role: 'summon', tags: ['attack', 'hit', 'totem', 'duration'],
    manaCost: 12, cooldownMs: 12000, timeMs: 1500, color: '#c04a2a',
    effect: { totem: true, weaponPct: 80, totemAttackMs: 2500, totemDurationMs: 20000 },
    desc: 'Place a War Totem for 20s. It attacks for 80% physical every 2.5s.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'shadow_totem', name: 'Shadow Totem', attr: 'dex', role: 'summon', tags: ['attack', 'hit', 'totem', 'dot', 'duration'],
    manaCost: 15, cooldownMs: 12000, timeMs: 1500, color: '#6a9a5a',
    effect: { totem: true, base: [8, 14], type: 'phys', totemAttackMs: 1800, totemDurationMs: 20000, ailment: { kind: 'poison', pctPerSec: 20, durationMs: 4000 } },
    desc: 'Place a Shadow Totem for 20s. It attacks for 70% every 1.8s, alternating between two enemies, poisoning each hit.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'siege_totem', name: 'Siege Totem', attr: 'str', role: 'summon', tags: ['attack', 'hit', 'totem', 'duration'],
    manaCost: 16, cooldownMs: 15000, timeMs: 1500, color: '#9a7a4a',
    effect: { totem: true, base: [16, 24], type: 'phys', totemAttackMs: 4000, totemDurationMs: 25000, stunChance: 0.5 },
    desc: 'Place a Siege Totem for 25s. It fires 16–24 physical damage every 4s with 50% stun chance in a line through the target.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'chaos_totem', name: 'Chaos Totem', attr: 'int', role: 'summon', tags: ['spell', 'hit', 'totem', 'duration'],
    manaCost: 18, cooldownMs: 12000, timeMs: 1500, color: '#7a2a9a',
    effect: { totem: true, base: [10, 18], type: 'chaos', totemAttackMs: 1500, totemDurationMs: 20000, poisonChance: 0.2 },
    desc: 'Place a Chaos Totem for 20s. It fires 10–18 chaos every 1.5s with 20% poison chance. Chaos bypasses ES.',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'void_totem', name: 'Void Totem', attr: 'int', role: 'summon', tags: ['spell', 'hit', 'totem', 'duration'],
    manaCost: 22, cooldownMs: 12000, timeMs: 1500, color: '#5a1a7a',
    effect: { totem: true, base: [15, 25], type: 'chaos', totemAttackMs: 2000, totemDurationMs: 20000, poisonChance: 0.3 },
    desc: 'Place a Void Totem for 20s. It fires 15–25 chaos every 2s with 30% poison chance. Each attack has a 20% chance to drain 5% life from the target as chaos.',
    defaultRule: { when: 'notActive' },
  }),

  // ---------- Maps skills: Group 4 — Doom ----------
  A({
    id: 'doom_bolt', name: 'Doom Bolt', attr: 'int', role: 'main', tags: ['spell', 'hit', 'doom'],
    manaCost: 15, cooldownMs: 0, timeMs: 3000, color: '#8a3a9a',
    effect: { base: [20, 35], type: 'chaos', targets: 'single', addsDoom: true, doomPerHit: 2, poisonChance: 0.10 },
    desc: '20–35 chaos damage, adds 2 Doom (double rate). Doom builds to 20 for a chaos burst.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'void_blast', name: 'Void Blast', attr: 'int', role: 'area', tags: ['spell', 'hit', 'area', 'doom'],
    manaCost: 28, cooldownMs: 5000, timeMs: 2400, color: '#7a2a9a',
    effect: { base: [50, 80], type: 'chaos', area: 'splash', radius: 2, addsDoom: true, doomPerHit: 3, poisonChance: 0.10 },
    desc: '50–80 chaos to all enemies, adds 3 Doom to all.',
    defaultRule: { when: 'enemiesAtLeast', value: 2 },
  }),
  A({
    id: 'doom_strike', name: 'Doom Strike', attr: 'str', role: 'main', tags: ['attack', 'melee', 'hit', 'doom'],
    manaCost: 10, cooldownMs: 0, timeMs: 3600, color: '#8a3a5a',
    effect: { weaponPct: 150, targets: 'single', convert: { type: 'chaos', pct: 50 }, addsDoom: true, doomPerHit: 2 }, weapons: HEAVY_WEAPONS,
    desc: '150% weapon damage, 50% converted to chaos; adds 2 Doom.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'entropy', name: 'Entropy', attr: 'int', role: 'main', tags: ['spell', 'hit', 'doom'],
    manaCost: 12, cooldownMs: 0, timeMs: 2400, color: '#6a3a7a',
    effect: { base: [15, 25], type: 'chaos', targets: 'single', addsDoom: true, doomPerHit: 1, poisonChance: 0.10 },
    desc: '15–25 chaos damage; adds 1 Doom. Fast spam skill.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'doomsday', name: 'Doomsday', attr: 'int', role: 'burst', tags: ['spell', 'hit', 'doom'],
    manaCost: 40, cooldownMs: 10000, timeMs: 3000, color: '#5a1a7a',
    effect: { base: [80, 130], type: 'chaos', targets: 'single', addsDoom: true, doomPerHit: 5, poisonChance: 0.15 },
    desc: 'Instantly triggers a Doom burst on the current target regardless of meter. The burst is 50% more powerful per 5 Doom the target had.',
    defaultRule: { when: 'bossOnly' },
  }),
  A({
    id: 'cursed_arrow', name: 'Cursed Arrow', attr: 'dex', role: 'main', tags: ['attack', 'projectile', 'hit', 'doom'],
    manaCost: 8, cooldownMs: 0, timeMs: 2700, color: '#6a9a3a',
    effect: { weaponPct: 90, targets: 'single', convert: { type: 'chaos', pct: 40 }, addsDoom: true, doomPerHit: 2, ailment: { kind: 'poison', pctPerSec: 15, durationMs: 4000 } }, range: RINGS, weapons: BOW,
    desc: '90% bow attack, 40% converted to chaos; adds 2 Doom; 20% poison chance.',
    defaultRule: { when: 'always' },
  }),
  A({
    id: 'shadow_pact', name: 'Shadow Pact', attr: 'dex', role: 'buff', tags: ['buff', 'doom', 'duration'],
    manaCost: 15, cooldownMs: 10000, timeMs: 1500, color: '#7a5a9a',
    effect: { buff: { durationMs: 6000, moreDamage: 20 } },
    desc: 'For 6s: gain 2% more damage for each point of Doom on current target (max 40%).',
    defaultRule: { when: 'notActive' },
  }),
  A({
    id: 'void_pact', name: 'Void Pact', attr: 'int', role: 'sustain', tags: ['spell', 'sustain', 'doom', 'hit'],
    manaCost: 0, cooldownMs: 12000, timeMs: 1500, color: '#5a2a7a',
    effect: { base: [1, 1], type: 'chaos', targets: 'single', restoreManaPct: 5 },
    desc: 'Consume all Doom on the current target; heal 2% life per point consumed. If target had max Doom, also recover 20% mana.',
    defaultRule: { when: 'lifeBelow', value: 70 },
  }),

  // ---------- Maps skills: Group 5 — Exertion ----------
  A({
    id: 'gut_punch', name: 'Gut Punch', attr: 'str', role: 'main', tags: ['attack', 'melee', 'hit', 'exertion'],
    manaCost: 8, cooldownMs: 0, timeMs: 2700, color: '#d04a3a',
    effect: { weaponPct: 110, targets: 'single', exertion: true, exertionPerHit: 2, exertedEffect: { moreDamage: 80, extraTargets: 'nearest', extraPct: 50 } }, weapons: STRIKE_WEAPONS,
    desc: '110% weapon damage; adds 2 Exertion. Exerted: 200% weapon + hits nearest other enemy for 50%.',
    defaultRule: { when: 'exertionFull' },
  }),
  A({
    id: 'quickdraw', name: 'Quickdraw', attr: 'dex', role: 'burst', tags: ['attack', 'projectile', 'hit', 'exertion'],
    manaCost: 12, cooldownMs: 0, timeMs: 2400, color: '#6aba4a',
    effect: { weaponPct: 200, targets: 'single', crit: 10, exertion: true, exertedEffect: { moreDamage: 75 } }, range: RINGS, weapons: BOW,
    desc: '200% bow attack. Exerted: 350%, guaranteed crit.',
    defaultRule: { when: 'exertionFull' },
  }),
  A({
    id: 'charged_strike', name: 'Charged Strike', attr: 'str', role: 'main', tags: ['attack', 'melee', 'hit', 'exertion'],
    manaCost: 10, cooldownMs: 0, timeMs: 3300, color: '#c07a3a',
    effect: { weaponPct: 130, targets: 'single', stunChance: 0.25, exertion: true, exertedEffect: { moreDamage: 30, extraTargets: 'all' } }, weapons: HEAVY_WEAPONS,
    desc: '130% physical, 25% stun. Exerted: also stuns all nearby enemies for 1s, 10 Stagger.',
    defaultRule: { when: 'exertionFull' },
  }),
  A({
    id: 'void_surge', name: 'Void Surge', attr: 'int', role: 'main', tags: ['spell', 'hit', 'exertion'],
    manaCost: 18, cooldownMs: 0, timeMs: 3000, color: '#8a2a9a',
    effect: { base: [20, 30], type: 'chaos', targets: 'single', exertion: true, exertedEffect: { moreDamage: 150 }, poisonChance: 0.10 },
    desc: '20–30 chaos, single; bypasses ES. Exerted: 150% more chaos damage + poisons.',
    defaultRule: { when: 'exertionFull' },
  }),
  A({
    id: 'rend', name: 'Rend', attr: 'dex', role: 'main', tags: ['attack', 'melee', 'hit', 'dot', 'bleed', 'exertion'],
    manaCost: 8, cooldownMs: 0, timeMs: 2400, color: '#c0392b',
    effect: { weaponPct: 90, targets: 'single', exertion: true, exertionPerHit: 1, exertedEffect: { moreDamage: 50 }, ailment: { kind: 'bleed', pctPerSec: 40, durationMs: 4000 } }, weapons: ['sword', 'axe', 'dagger'],
    desc: '90% weapon, bleeds; adds 1 Exertion. Exerted: bleed lasts 3× longer and spreads to all enemies.',
    defaultRule: { when: 'exertionFull' },
  }),
  A({
    id: 'void_wave', name: 'Void Wave', attr: 'int', role: 'area', tags: ['spell', 'hit', 'area', 'exertion'],
    manaCost: 16, cooldownMs: 3000, timeMs: 3000, color: '#6a2a8a',
    effect: { base: [20, 30], type: 'chaos', area: 'splash', radius: 2, exertion: true, exertedEffect: { moreDamage: 100, extraTargets: 'all' }, poisonChance: 0.10 },
    desc: '20–30 chaos, all enemies. Exerted: fires twice in immediate succession.',
    defaultRule: { when: 'exertionFull' },
  }),
  A({
    id: 'soul_rip', name: 'Soul Rip', attr: 'int', role: 'burst', tags: ['spell', 'hit', 'exertion'],
    manaCost: 22, cooldownMs: 5000, timeMs: 2400, color: '#7a1a9a',
    effect: { base: [30, 45], type: 'chaos', targets: 'single', exertion: true, exertedEffect: { moreDamage: 50, extraTargets: 'all' }, poisonChance: 0.10 },
    desc: '30–45 chaos, single; bypasses ES. Exerted: fires at 3 targets for the same damage.',
    defaultRule: { when: 'exertionFull' },
  }),
  A({
    id: 'deathblow', name: 'Deathblow', attr: 'str', role: 'main', tags: ['attack', 'melee', 'hit', 'heavy', 'exertion'],
    manaCost: 15, cooldownMs: 0, timeMs: 4800, color: '#c03a2a',
    effect: { weaponPct: 220, targets: 'single', exertion: true, exertedEffect: { moreDamage: 80 } }, weapons: HEAVY_WEAPONS,
    desc: '220% physical. Exerted: 400% weapon + always crits.',
    defaultRule: { when: 'exertionFull' },
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
  // every class starts with a single target and an area skill, so those (Ice Shot, Frost Needle, Ground Slam, Rain
  // of Arrows, Rain of Daggers) need level 1
  quick_slash: 2, rending_cut: 3, war_cry: 4,
  pummel: 6, feint: 6, flame_totem: 6, leeching_blow: 6, brine_leech: 6, mind_sip: 6,
  shock_nova: 8,
  barrage: 10, infernal_blow: 10,
  berserk: 12, consecrate: 12, meditate: 12,
  parry: 14, fireball: 14,
  judgement_hammer: 16, backstab: 16,
  raiders_due: 18, horsefly_shot: 18, cinder_draw: 18, saddle_drop: 18, ash_veil: 18, horse_archers_arc: 18,
  cavalry_charge: 20, raiding_leap: 20, parting_shot: 20, ember_dash: 20,
  tailwind: 22, arcane_surge: 22,
  vulnerability: 24, hobble: 24,
  elemental_weakness: 26, enfeeble: 26,
  flagellate: 32, gash: 32, barbed_arrow: 32, war_totem: 32,
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
  worldbreaker: 58, gale_of_knives: 58, eye_of_the_storm: 58, siege_shot: 58, siege_totem: 58,
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
  // Maps gems: level 66–78 (char level)
  brand_of_ruin: 66, sunder_mark: 66, fracture_mark: 66, doom_bolt: 66, entropy: 66, gut_punch: 66,
  battle_cry: 66, hunters_call: 66,
  scorched_brand: 68, marked_for_death: 68, doom_strike: 68, cursed_arrow: 68, quickdraw: 68, rend: 68,
  rallying_cry: 68, ice_totem: 68,
  void_brand: 70, shadow_mark: 70, intimidate: 70, dark_howl: 70, storm_totem: 70, shadow_totem: 70,
  charged_strike: 70, void_surge: 70, void_blast: 70,
  ancestral_call: 72, void_wave: 72, deathblow: 72, shadow_pact: 72,
  martyrdom_brand: 74, chaos_totem: 74, soul_rip: 74, void_pact: 74,
  death_rattle: 74, primal_roar: 74,
  doomsday: 76, void_totem: 76,
  // support gems (level = skill's level + 6 handled by gemReqLevel; explicit for non-signatures)
  rapid_marks: 66, powerful_voice: 66, doom_accelerant: 66, hasty_exertion: 66,
  chaos_infusion: 66, chaos_mastery: 66,
  volatile_marks: 68, persistent_mark: 68, war_drummer: 68, rally_the_fallen: 68,
  twin_totems: 68, ancestral_bond: 68, totem_vanguard: 68, doom_echo: 68, void_ward: 68,
  cascading_force: 68, vile_efficiency: 68, opportunism: 68,
  spreading_brand: 70, cursed_brand: 72, lingering_shout: 70, resounding_cry: 72, totem_fortify: 70,
  cascading_totems: 74, mass_doom: 70, endless_dread: 74, void_hunger: 72,
  overexertion: 70, exerted_momentum: 72, violent_release: 74,
  chain_reaction: 70, blind_fury: 70, void_touch: 72, elemental_confluence: 70,
  cruel_intent: 70, slaughter: 72, war_scarred: 72, siege_breaker: 74, momentum_surge: 70, deep_reserves: 74,
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
  lacerate: 3, war_totem: 3,
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
  worldbreaker: 6, last_legion: 6, death_warrant: 6, gale_of_knives: 6, royal_decree: 6, eye_of_the_storm: 6, siege_shot: 6, siege_totem: 6,
  spoils_of_war: 6, tax_collector: 6, imperial_tribute: 6, shieldwall: 6, shadow_court: 6, executioners_stroke: 6,
  goaded: 6, funeral_rites: 6, crowned_storm: 6, eternal_ward: 6, reprisal: 6, succession: 6, imperial_reach: 6,
  tribute_of_iron: 6, blood_tax: 6, imperial_vintage: 6,
  // Maps — all 40 skills + signatures + 40 group/general supports
  brand_of_ruin: 7, scorched_brand: 7, sunder_mark: 7, void_brand: 7, fracture_mark: 7, marked_for_death: 7, shadow_mark: 7, martyrdom_brand: 7,
  battle_cry: 7, rallying_cry: 7, hunters_call: 7, intimidate: 7, ancestral_call: 7, dark_howl: 7, death_rattle: 7, primal_roar: 7,
  ice_totem: 7, storm_totem: 7, shadow_totem: 7, chaos_totem: 7, void_totem: 7,
  doom_bolt: 7, void_blast: 7, doom_strike: 7, entropy: 7, doomsday: 7, cursed_arrow: 7, shadow_pact: 7, void_pact: 7,
  gut_punch: 7, quickdraw: 7, charged_strike: 7, void_surge: 7, rend: 7, void_wave: 7, soul_rip: 7, deathblow: 7,
  // signatures (all act 7)
  corrosion: 7, flash_point: 7, exposed: 7, nihil: 7, shatter_burst: 7, execute_mark: 7, venom_brand: 7, payback: 7,
  war_drum: 7, second_wind: 7, pack_rush: 7, dread_shout: 7, forebears: 7, void_voice: 7, carnage: 7, primal_force: 7,
  blizzard_totem: 7, tempest_totem: 7, venom_totem: 7, corruptor: 7, soul_siphon: 7,
  accelerant: 7, cascade: 7, cursed_blow: 7, doom_haste: 7, last_rites: 7, marked_arrow: 7, dark_communion: 7, dark_leech: 7,
  follow_blow: 7, hair_trigger: 7, overcharge: 7, dark_surge: 7, deep_hemorrhage: 7, chain_doom: 7, dark_drain: 7, executioner: 7,
  // group supports
  rapid_marks: 7, volatile_marks: 7, spreading_brand: 7, persistent_mark: 7, cursed_brand: 7,
  powerful_voice: 7, war_drummer: 7, lingering_shout: 7, rally_the_fallen: 7, resounding_cry: 7,
  twin_totems: 7, totem_fortify: 7, ancestral_bond: 7, totem_vanguard: 7, cascading_totems: 7,
  doom_accelerant: 7, mass_doom: 7, doom_echo: 7, endless_dread: 7, void_hunger: 7,
  hasty_exertion: 7, overexertion: 7, cascading_force: 7, exerted_momentum: 7, violent_release: 7,
  // general supports
  chaos_infusion: 7, opportunism: 7, chain_reaction: 7, blind_fury: 7, void_touch: 7,
  chaos_mastery: 7, vile_efficiency: 7, elemental_confluence: 7, cruel_intent: 7, slaughter: 7,
  war_scarred: 7, siege_breaker: 7, void_ward: 7, momentum_surge: 7, deep_reserves: 7,
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
  lacerate: 1.15,
  backstab: 1.15,
  worldbreaker: 1.15,
  last_legion: 1.15,
  death_warrant: 1.15,
  gale_of_knives: 1.15,
  royal_decree: 1.15,
  eye_of_the_storm: 1.15,
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
  S({ id: 'faster_casts', name: 'Faster Casts', attr: 'int', fits: ['spell'], needs: ['hit'], mods: { castSpeed: 25, manaMult: 1.15 }, desc: '25% more cast speed. Fits spells that deal damage.' }),
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
  S({ id: 'chain', name: 'Chain', attr: 'dex', fits: ['projectile', 'chain'], mods: { chains: 1, moreDamage: -10, manaMult: 1.3 }, desc: 'Hits chain to 1 more enemy; 10% less damage. Each hop deals 15% less than the last.' }),
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

  // ---------- Maps signatures ----------
  // Mark signatures
  S({ id: 'corrosion', name: 'Corrosion', attr: 'int', fits: [], signatureFor: 'brand_of_ruin', mods: { special: 'corrosion' }, desc: "The burst strips 20% chaos resistance for 4s." }),
  S({ id: 'flash_point', name: 'Flash Point', attr: 'int', fits: [], signatureFor: 'scorched_brand', mods: { special: 'flashpoint' }, desc: 'The burst ignites for 5s.' }),
  S({ id: 'exposed', name: 'Exposed', attr: 'str', fits: [], signatureFor: 'sunder_mark', mods: { special: 'flay' }, desc: 'The burst breaks armour (+15% damage taken for 4s).' }),
  S({ id: 'nihil', name: 'Nihil', attr: 'int', fits: [], signatureFor: 'void_brand', mods: { special: 'nihil' }, desc: 'Targets hit by the burst have −15% chaos res for 6s.' }),
  S({ id: 'shatter_burst', name: 'Shatter Burst', attr: 'dex', fits: [], signatureFor: 'fracture_mark', mods: { special: 'shatter_burst' }, desc: 'The burst reaches two rings and stuns all hit for 2s (bosses 1s).' }),
  S({ id: 'execute_mark', name: 'Execute', attr: 'dex', fits: [], signatureFor: 'marked_for_death', mods: { special: 'execute_mark' }, desc: 'Marked+cursed enemies burst at 3 stacks. The burst kills non-bosses at 20% Life or less; others lose 10% of their missing Life.' }),
  S({ id: 'venom_brand', name: 'Venom Brand', attr: 'dex', fits: [], signatureFor: 'shadow_mark', mods: { durationPct: 50 }, desc: 'The burst poison lasts 4s longer.' }),
  S({ id: 'payback', name: 'Payback', attr: 'str', fits: [], signatureFor: 'martyrdom_brand', mods: { special: 'payback' }, desc: 'When the brand bursts, it deals half of your shield as physical damage to the whole pack.' }),
  // Warcry signatures
  S({ id: 'war_drum', name: 'War Drum', attr: 'str', fits: [], signatureFor: 'battle_cry', mods: { special: 'war_drum' }, desc: 'Also grants 8 Rage per enemy within two rings.' }),
  S({ id: 'second_wind', name: 'Second Wind', attr: 'str', fits: [], signatureFor: 'rallying_cry', mods: { special: 'second_wind' }, desc: 'Also recovers 10% mana per enemy.' }),
  S({ id: 'pack_rush', name: 'Pack Rush', attr: 'dex', fits: [], signatureFor: 'hunters_call', mods: { special: 'pack_rush' }, desc: 'Also grants 20% increased evasion.' }),
  S({ id: 'dread_shout', name: 'Dread Shout', attr: 'str', fits: [], signatureFor: 'intimidate', mods: { curseEffect: 20 }, desc: 'Effect scales: +3% more damage per enemy in combat.' }),
  S({ id: 'forebears', name: 'Forebears', attr: 'str', fits: [], signatureFor: 'ancestral_call', mods: { special: 'forebears', extra: { type: 'fire', pct: 20 } }, desc: 'Ancestors also deal 20% of their damage as fire.' }),
  S({ id: 'void_voice', name: 'Void Voice', attr: 'int', fits: [], signatureFor: 'dark_howl', mods: { special: 'void_voice' }, desc: 'While it lasts, your hits have a 20% chance to poison.' }),
  S({ id: 'carnage', name: 'Carnage', attr: 'dex', fits: [], signatureFor: 'death_rattle', mods: { special: 'carnage' }, desc: 'While it lasts, each enemy you kill bursts onto the nearest enemy for 10% of its Life.' }),
  S({ id: 'primal_force', name: 'Primal Force', attr: 'str', fits: [], signatureFor: 'primal_roar', mods: { special: 'primal_force' }, desc: 'The stun also applies −20% damage for its duration.' }),
  // Totem signatures
  S({ id: 'pyre_totem', name: 'Pyre Totem', attr: 'int', fits: [], signatureFor: 'flame_totem', mods: { special: 'pyre_totem' }, desc: 'Its hits leave burning ground for 3s, dealing 25% of the hit per second.' }),
  S({ id: 'blizzard_totem', name: 'Blizzard Totem', attr: 'int', fits: [], signatureFor: 'ice_totem', mods: { special: 'blizzard_totem' }, desc: 'When it ends, explodes for four times its hit as cold damage to every enemy, chilling them.' }),
  S({ id: 'tempest_totem', name: 'Tempest Totem', attr: 'int', fits: [], signatureFor: 'storm_totem', mods: { chains: 1, moreDamage: -15, manaMult: 1.1 }, desc: 'Chain hits a second enemy for 50%.' }),
  S({ id: 'battle_totem', name: 'Battle Totem', attr: 'str', fits: [], signatureFor: 'war_totem', mods: { special: 'battle_totem' }, desc: 'Each kill by this totem grants you 1 Rage.' }),
  S({ id: 'venom_totem', name: 'Venom Totem', attr: 'dex', fits: [], signatureFor: 'shadow_totem', mods: { special: 'venom_totem' }, desc: 'Poison stacks twice as fast (applies 2 poison on each hit).' }),
  S({ id: 'long_siege', name: 'Long Siege', attr: 'str', fits: [], signatureFor: 'siege_totem', mods: { special: 'long_siege' }, desc: 'Line extends one more ring, hits one additional enemy.' }),
  S({ id: 'corruptor', name: 'Corruptor', attr: 'int', fits: [], signatureFor: 'chaos_totem', mods: { special: 'corruptor' }, desc: 'The totem applies −15% chaos resistance to enemies it hits for 4s.' }),
  S({ id: 'soul_siphon', name: 'Soul Siphon', attr: 'int', fits: [], signatureFor: 'void_totem', mods: { special: 'soul_siphon' }, desc: 'Its hits have a 40% chance to restore 2% of your Life and Mana.' }),
  // Doom signatures
  S({ id: 'accelerant', name: 'Accelerant', attr: 'int', fits: [], signatureFor: 'doom_bolt', mods: { moreDamage: 20 }, desc: 'Target with 10+ Doom takes 20% more from this skill.' }),
  S({ id: 'cascade', name: 'Cascade', attr: 'int', fits: [], signatureFor: 'void_blast', mods: { special: 'cascade' }, desc: 'When its hit bursts an enemy\'s Doom, every enemy next to it gains 2 Doom.' }),
  S({ id: 'cursed_blow', name: 'Cursed Blow', attr: 'str', fits: [], signatureFor: 'doom_strike', mods: { special: 'cursed_blow' }, desc: 'Physical portion also adds 1 Doom.' }),
  S({ id: 'doom_haste', name: 'Doom Haste', attr: 'int', fits: [], signatureFor: 'entropy', mods: { special: 'doom_haste' }, desc: 'Doom decays 50% slower while this is on the bar.' }),
  S({ id: 'last_rites', name: 'Last Rites', attr: 'int', fits: [], signatureFor: 'doomsday', mods: { moreDamage: 150 }, desc: 'Enemies above 15 Doom receive 150% more from the burst.' }),
  S({ id: 'marked_arrow', name: 'Marked Arrow', attr: 'dex', fits: [], signatureFor: 'cursed_arrow', mods: { special: 'marked_arrow' }, desc: 'At 10+ Doom, the hit poisons for double duration.' }),
  S({ id: 'dark_communion', name: 'Dark Communion', attr: 'dex', fits: [], signatureFor: 'shadow_pact', mods: { special: 'dark_communion' }, desc: 'Also gain 1% chaos resistance per Doom on the most Doomed enemy, for the duration.' }),
  S({ id: 'dark_leech', name: 'Dark Leech', attr: 'int', fits: [], signatureFor: 'void_pact', mods: { special: 'dark_leech' }, desc: "Void Pact consumes the target's Doom, restoring 1% of your Energy Shield per Doom." }),
  // Exertion signatures
  S({ id: 'follow_blow', name: 'Follow Through', attr: 'str', fits: [], signatureFor: 'gut_punch', mods: { special: 'follow_blow' }, desc: 'The exerted hit also stuns the second target for 1s.' }),
  S({ id: 'hair_trigger', name: 'Hair Trigger', attr: 'dex', fits: [], signatureFor: 'quickdraw', mods: { special: 'hair_trigger' }, desc: 'Any crit fills Exertion, so the next Exertion skill fires Exerted (at most once per second).' }),
  S({ id: 'overcharge', name: 'Overcharge', attr: 'str', fits: [], signatureFor: 'charged_strike', mods: { special: 'overcharge' }, desc: 'The exerted version carries 2 stacks over (resets to 2, not 0).' }),
  S({ id: 'dark_surge', name: 'Dark Surge', attr: 'int', fits: [], signatureFor: 'void_surge', mods: { special: 'dark_surge' }, desc: 'Exerted Void Surge also fires at the nearest second enemy for 50%.' }),
  S({ id: 'deep_hemorrhage', name: 'Hemorrhage', attr: 'dex', fits: [], signatureFor: 'rend', mods: { special: 'hemorrhage_exert' }, desc: 'Exerted Rend also applies a fresh bleed to all nearby.' }),
  S({ id: 'chain_doom', name: 'Chain Doom', attr: 'int', fits: [], signatureFor: 'void_wave', mods: { special: 'chain_doom' }, desc: 'Exerted hits add 2 Doom to all enemies hit.' }),
  S({ id: 'dark_drain', name: 'Soul Drain', attr: 'int', fits: [], signatureFor: 'soul_rip', mods: { special: 'dark_drain' }, desc: 'Exerted Soul Rip heals 8% life.' }),
  S({ id: 'executioner', name: 'Executioner', attr: 'str', fits: [], signatureFor: 'deathblow', mods: { special: 'executioner' }, desc: 'Kills with exerted Deathblow instantly grant 5 Exertion.' }),

  // ---------- Maps group supports ----------
  // Mark supports (5)
  S({ id: 'rapid_marks', name: 'Rapid Marks', attr: 'int', fits: ['mark'], mods: { cooldownPct: 30, manaMult: 1.2 }, desc: 'Marks burst at 4 stacks instead of 5; apply rate is 30% faster.' }),
  S({ id: 'volatile_marks', name: 'Volatile Marks', attr: 'int', fits: ['mark'], mods: { moreDamage: 60, manaMult: 1.3 }, desc: 'Mark bursts deal 60% more damage.' }),
  S({ id: 'spreading_brand', name: 'Spreading Brand', attr: 'int', fits: ['mark'], mods: { special: 'spreading_brand', manaMult: 1.25 }, desc: 'When a Mark bursts, the nearest unmarked enemy inherits 2 stacks of the same Mark.' }),
  S({ id: 'persistent_mark', name: 'Persistent Mark', attr: 'int', fits: ['mark'], mods: { durationPct: 50, manaMult: 1.2 }, desc: 'Mark duration is 4s longer; stacks do not decay until the mark fully expires.' }),
  S({ id: 'cursed_brand', name: 'Cursed Brand', attr: 'int', fits: ['mark'], mods: { moreDamage: 10, manaMult: 1.3 }, desc: 'Marked targets take 10% more damage from all sources.' }),
  // Warcry supports (5)
  S({ id: 'powerful_voice', name: 'Powerful Voice', attr: 'str', fits: ['warcry'], mods: { special: 'powerful_voice', manaMult: 1.0 }, desc: 'Warcry effects count twice as many enemies (effectively doubled for scaling).' }),
  S({ id: 'war_drummer', name: 'War Drummer', attr: 'str', fits: ['warcry'], mods: { cooldownPct: 30, manaMult: 1.0 }, desc: 'Warcry cooldowns reduced by 30%.' }),
  S({ id: 'lingering_shout', name: 'Lingering Shout', attr: 'str', fits: ['warcry'], mods: { durationPct: 50, manaMult: 1.0 }, desc: 'Warcry empowerment buffs last 3s longer.' }),
  S({ id: 'rally_the_fallen', name: 'Rally the Fallen', attr: 'str', fits: ['warcry', 'sustain'], mods: { special: 'rally_fallen', manaMult: 1.0 }, desc: 'Healing warcries also restore 1% Life per recent kill (up to 10%).' }),
  S({ id: 'resounding_cry', name: 'Resounding Cry', attr: 'str', fits: ['warcry'], mods: { special: 'resounding_cry', manaMult: 1.0 }, desc: 'Warcry empowerment also applies to Totems if one is active.' }),
  // Totem supports (5)
  S({ id: 'twin_totems', name: 'Twin Totems', attr: 'int', fits: ['totem'], mods: { minionCount: 1, moreDamage: -25, manaMult: 1.3 }, desc: 'You can have 2 totems active simultaneously; each deals 25% less damage.' }),
  S({ id: 'totem_fortify', name: 'Totem Fortify', attr: 'str', fits: ['totem'], mods: { minionLife: 100, durationPct: 50, manaMult: 1.25 }, desc: 'Totem has 100% more life and lasts 10s longer.' }),
  S({ id: 'ancestral_bond', name: 'Ancestral Bond', attr: 'str', fits: ['totem'], mods: { moreDamage: 20, manaMult: 1.2 }, desc: 'While a totem is active you deal 20% more damage.' }),
  S({ id: 'totem_vanguard', name: 'Totem Vanguard', attr: 'str', fits: ['totem'], mods: { special: 'totem_vanguard', manaMult: 1.2 }, desc: 'For the first 4s of its life, the totem takes enemy hits in your place.' }),
  S({ id: 'cascading_totems', name: 'Cascading Totems', attr: 'int', fits: ['totem'], mods: { special: 'cascading_totems', manaMult: 1.3 }, desc: 'When a totem ends or is destroyed, a replacement rises once for free, with half its life and duration.' }),
  // Doom supports (5)
  S({ id: 'doom_accelerant', name: 'Doom Accelerant', attr: 'int', fits: ['doom'], mods: { special: 'doom_accelerant', manaMult: 1.2 }, desc: 'Hits add 2 Doom instead of 1; Doom decays 50% slower.' }),
  S({ id: 'mass_doom', name: 'Mass Doom', attr: 'int', fits: ['doom'], mods: { special: 'mass_doom', manaMult: 1.3 }, desc: 'Hits add 1 Doom to all enemies in combat.' }),
  S({ id: 'doom_echo', name: 'Doom Echo', attr: 'int', fits: ['doom'], mods: { special: 'doom_echo', manaMult: 1.25 }, desc: 'When a Doom burst triggers, it deals 30% of its damage to all other enemies.' }),
  S({ id: 'endless_dread', name: 'Endless Dread', attr: 'int', fits: ['doom'], mods: { special: 'endless_dread', moreDamage: 50, manaMult: 1.4 }, desc: 'Doom maximum raised to 30; burst is 50% more powerful per extra point above 20.' }),
  S({ id: 'void_hunger', name: 'Void Hunger', attr: 'int', fits: ['doom'], mods: { special: 'void_hunger', manaMult: 1.3 }, desc: 'Doom bursts have a 30% chance not to clear the meter.' }),
  // Exertion supports (5)
  S({ id: 'hasty_exertion', name: 'Hasty Exertion', attr: 'str', fits: ['exertion'], mods: { special: 'hasty_exertion', manaMult: 1.2 }, desc: 'Hits add 2 Exertion instead of 1; Exertion decays 50% slower.' }),
  S({ id: 'overexertion', name: 'Overexertion', attr: 'str', fits: ['exertion'], mods: { moreDamage: 50, manaMult: 1.3 }, desc: 'Exerted version deals 50% more; Exertion resets to 2 (not 0) so you stay semi-ready.' }),
  S({ id: 'cascading_force', name: 'Cascading Force', attr: 'dex', fits: ['exertion'], mods: { special: 'cascading_force', manaMult: 1.2 }, desc: 'Exerted kills give 2 Exertion instantly.' }),
  S({ id: 'exerted_momentum', name: 'Exerted Momentum', attr: 'str', fits: ['exertion'], mods: { special: 'exerted_momentum', manaMult: 1.2 }, desc: 'Exerted uses grant 3 Momentum and 2 Rage.' }),
  S({ id: 'violent_release', name: 'Violent Release', attr: 'str', fits: ['exertion'], mods: { special: 'violent_release', manaMult: 1.3 }, desc: 'Exerted uses also deal 50% of their damage to all other enemies.' }),

  // ---------- Maps general supports (15) ----------
  // Rule-bending (5)
  S({ id: 'chaos_infusion', name: 'Chaos Infusion', attr: 'int', fits: ['hit'], mods: { special: 'chaos_infusion', manaMult: 1.3 }, desc: '40% of this skill\'s damage is dealt as chaos (bypasses ES); 60% remains as the original type.' }),
  S({ id: 'opportunism', name: 'Opportunism', attr: 'dex', fits: ['hit'], not: ['heavy', 'totem'], mods: { special: 'reprisal', manaMult: 1.3 }, desc: 'Fires when YOU are hit instead of on its rule; 2s internal cooldown.' }),
  S({ id: 'chain_reaction', name: 'Chain Reaction', attr: 'dex', fits: ['hit'], not: ['heavy', 'totem'], mods: { special: 'succession', manaMult: 1.3 }, desc: 'On kill, fires once more immediately for free.' }),
  S({ id: 'blind_fury', name: 'Blind Fury', attr: 'str', fits: ['attack', 'spell'], mods: { special: 'blind_fury', manaMult: 1.0 }, desc: 'Skill fires 50% faster but only while you are below 50% life.' }),
  S({ id: 'void_touch', name: 'Void Touch', attr: 'int', fits: ['spell'], mods: { special: 'void_touch', manaMult: 1.3 }, desc: 'While mana is above 80%, converts the spell to chaos damage (bypasses ES, 15% poison chance).' }),
  // Amplifiers (10)
  S({ id: 'chaos_mastery', name: 'Chaos Mastery', attr: 'int', fits: ['hit'], mods: { moreDamage: 40, manaMult: 1.3 }, desc: '40% more chaos damage.' }),
  S({ id: 'vile_efficiency', name: 'Vile Efficiency', attr: 'int', fits: ['hit'], mods: { manaMult: 0.8 }, desc: 'Chaos skills cost 20% less mana; 15% chance to poison on hit.' }),
  S({ id: 'elemental_confluence', name: 'Elemental Confluence', attr: 'int', fits: ['spell', 'attack'], mods: { moreElem: 15, manaMult: 1.3 }, desc: 'If the hit deals fire, cold, and lightning, each is 15% stronger.' }),
  S({ id: 'cruel_intent', name: 'Cruel Intent', attr: 'str', fits: ['hit'], mods: { special: 'gnaw', manaMult: 1.3 }, desc: '35% more damage against enemies below 30% life.' }),
  S({ id: 'slaughter', name: 'Slaughter', attr: 'dex', fits: ['hit'], mods: { special: 'slaughter', manaMult: 1.2 }, desc: 'Kills grant 2% more damage for 3s, stacking to 10 times.' }),
  S({ id: 'war_scarred', name: 'War-Scarred', attr: 'str', fits: ['attack', 'spell'], mods: { moreDamage: 30, manaMult: 1.3 }, desc: '30% more damage while your life is above 85%.' }),
  S({ id: 'siege_breaker', name: 'Siege Breaker', attr: 'str', fits: ['hit'], mods: { moreDamage: 50, manaMult: 1.4 }, desc: '50% more damage against bosses, 20% less against non-bosses.' }),
  S({ id: 'void_ward', name: 'Void Ward', attr: 'int', fits: ['guard', 'shield'], mods: { shieldMore: 20, manaMult: 1.2 }, desc: '20% of chaos damage you take is absorbed by the shield before it reaches life.' }),
  S({ id: 'momentum_surge', name: 'Momentum Surge', attr: 'dex', fits: ['hit'], mods: { special: 'slaughter', manaMult: 1.2 }, desc: 'Kills grant 3% increased attack and cast speed for 4s, stacking up to 15 times.' }),
  S({ id: 'deep_reserves', name: 'Deep Reserves', attr: 'int', fits: ['attack', 'spell', 'guard', 'buff'], mods: { moreDamage: 40, manaMult: 1.3 }, desc: '40% more damage if you used this skill in the last 3s.' }),
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
