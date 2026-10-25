import type { ClassId } from '../data/classes';
import type { TacticRule } from '../data/gems';
import type { BossMechanic, MonsterSkill } from '../data/zones';

export type SkillId = 'combat' | 'mining' | 'woodcutting' | 'harvesting' | 'smithing' | 'alchemy' | 'gemcutting';
export const SKILL_IDS: SkillId[] = ['combat', 'mining', 'woodcutting', 'harvesting', 'smithing', 'alchemy', 'gemcutting'];

export type Rarity = 'normal' | 'magic' | 'rare' | 'unique';
export const RARITIES: Rarity[] = ['normal', 'magic', 'rare', 'unique'];

export type ItemSlotType =
  | 'weapon'
  | 'offhand'
  | 'helmet'
  | 'body'
  | 'gloves'
  | 'boots'
  | 'belt'
  | 'amulet'
  | 'ring';

export type EquipSlot = Exclude<ItemSlotType, 'ring'> | 'ring1' | 'ring2';
export const EQUIP_SLOTS: EquipSlot[] = [
  'weapon',
  'offhand',
  'helmet',
  'body',
  'gloves',
  'boots',
  'belt',
  'amulet',
  'ring1',
  'ring2',
];

export type Tag =
  | 'weapon'
  | 'shield'
  | 'helmet'
  | 'body'
  | 'gloves'
  | 'boots'
  | 'belt'
  | 'amulet'
  | 'ring'
  | 'armour'
  | 'str_armour'
  | 'dex_armour'
  | 'int_armour'
  | 'jewellery';

/** Every stat a character can have. Add new ones here; Stats and the stat engine pick them up. */
export const STAT_KEYS = [
  'life', 'lifePct', 'lifeMore', 'lifeRegen', 'lifeRegenPct', 'lifeLeech', 'physMin', 'physMax', 'physPct',
  'fireMin', 'fireMax', 'coldMin', 'coldMax', 'lightMin', 'lightMax', 'elemPct', 'attackSpeedPct',
  'attackSpeedMore', 'critChancePct', 'critMulti', 'armour', 'armourPct', 'armourMore', 'evasion',
  'evasionPct', 'fireRes', 'coldRes', 'lightRes', 'allRes', 'itemRarity', 'skillSpeed', 'skillXp',
  'flaskEffect', 'flaskCharges', 'str', 'dex', 'int', 'allAttr', 'accuracy', 'mana', 'manaPct',
  'manaRegenPct', 'castSpeedPct', 'firePct', 'coldPct', 'lightPct', 'bleedPct', 'poisonPct', 'ignitePct',
  'ailmentPct', 'ailmentDuration', 'bleedDuration', 'poisonDuration', 'igniteDuration', 'bleedDurationFlat',
  'poisonDurationFlat', 'skillDuration', 'guardDuration', 'cooldownRecovery', 'guardCooldown',
  'manaCostReduction', 'stunChance', 'stunDuration', 'stunnedVuln', 'shieldEffect', 'extraChains',
  'extraBlocks', 'spellCritPct', 'spellCritMulti', 'lightCrit', 'chainMore', 'repeatMore', 'meleePct',
  'spellPct', 'projectilePct', 'bleedOnHit', 'blockChance',
  'dexSkillSpeed', 'buffMore', 'buffDurationFlat', 'warCryHeal', 'smokeExtra', 'afterGuardDamage',
  'guardArmourPct', 'lowLifeDamage', 'critFullLife', 'critLeech', 'overkillHeal', 'highLifeElem',
  'physAsLight', 'bleedBossMore', 'bleedVuln', 'multiAilmentVuln', 'poisonWeaken', 'igniteSpread',
  'chillOnHit', 'slamReduction', 'armourVsElem', 'elemTakenReduction', 'blockHeal', 'evadeHeal',
  'evadeSpeed', 'manaRegenFlat', 'lifeFlaskRecovery', 'manaFlaskRecovery', 'utilityFlaskDuration',
  'bloodPact', 'windDancer', 'mindOverFlesh', 'steadyHand', 'arcaneRecursion', 'bastion', 'energyShield',
  'energyShieldPct', 'esRechargePct',
  // class mechanic knobs (docs/CLASSES.md): only the class with that mechanic uses them
  'rageMax', 'rageEffect', 'rageDecay', 'rageRegen', 'rageOnHitTaken', 'endlessFury',
  'ripostePct', 'riposteCooldown', 'riposteHeal', 'riposteCrit', 'riposteBleed', 'perfectForm',
  'momentumMax', 'momentumEffect', 'momentumRetain', 'momentumEvasion', 'perpetualMotion',
  'maliceMax', 'coupPct', 'maliceCritKeep', 'coupAilment', 'maliceOnHitTaken', 'thousandCuts',
  'manaPower', 'manaPowerFull', 'manaPowerEs', 'allOrNothing',
  'fervorPct', 'novaPct', 'novaHeal', 'novaEs', 'saintsSacrifice',
  // skill modifiers on uniques (docs/NEW_UNIQUES.md ★): tweak one named skill
  'pummelHits', 'barrageArrows', 'parryBlocks', 'hammerConvert', 'meditateEs', 'infernalSpread',
  // forbidden keystones
  'overclock', 'knifesEdge', 'eternalHunger',
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export type Stats = Record<StatKey, number>;

export type DamageType = 'phys' | 'fire' | 'cold' | 'light';

export interface RolledMod {
  affixId: string;
  /** index into the affix's tier list (0 = lowest tier) */
  tier: number;
  values: number[];
  crafted?: boolean;
}

export interface Item {
  uid: number;
  baseId: string;
  ilvl: number;
  rarity: Rarity;
  name: string | null;
  prefixes: RolledMod[];
  suffixes: RolledMod[];
  uniqueId?: string;
}

export type InstillCondition = 'lowLife' | 'fullCharges' | 'bossCast';

export interface FlaskMod {
  affixId: string;
  value: number;
}

export interface FlaskInstance {
  uid: number;
  flaskId: string;
  charges: number;
  /** flasks are normal or magic (1 prefix + 1 suffix) */
  rarity: 'normal' | 'magic';
  ilvl: number;
  prefixes: FlaskMod[];
  suffixes: FlaskMod[];
  /** enchantment from an Instilling Orb: use automatically on this condition */
  instill: InstillCondition | null;
}

export interface Dot {
  kind: 'bleed' | 'poison' | 'ignite' | 'burn';
  dps: number;
  remainingMs: number;
  /** damage dealt so far (Hemorrhage bursts for part of it) */
  dealt: number;
  burst?: number;
  /** which skill applied it */
  gemId: string;
  /** Virulence: spreads to another enemy on death */
  spreads?: boolean;
  /** full duration, for effects that refresh it (Twist the Knife) */
  durationMs?: number;
  /** Pyre: the enemy explodes when it dies while this ignite burns */
  pyre?: boolean;
}

export interface MonsterInstance {
  uid: number;
  defId: string;
  name: string;
  level: number;
  maxLife: number;
  life: number;
  damage: number;
  dmgType: DamageType;
  /** basic attack or spell: what it's called, which it is, and its attack or cast time */
  attackName: string;
  attackKind: MonsterSkill['kind'];
  attackMs: number;
  attackTimer: number;
  isBoss: boolean;
  /** boss mechanics and their timers (ms until the next use) */
  mechanics: BossMechanic[];
  timers: Partial<Record<BossMechanic, number>>;
  novaType: DamageType;
  /** remaining cast time in ms, or -1 when not casting */
  casting: number;
  /** what is being wound up, and its full cast time */
  castKind: 'slam' | 'nova' | null;
  castTotal: number;
  /** this boss's own wind-ups */
  casts: Record<'slam' | 'nova', MonsterSkill>;
  enraged: boolean;
  /** boss barrier: absorbs damage; heals the boss if still up when wardMs runs out */
  ward: number;
  wardMax: number;
  wardMs: number;
  wardsUsed: number;
  res: { fire: number; cold: number; light: number };
  dots: Dot[];
  stunMs: number;
  frozenMs: number;
  /** armour broken: takes more damage while > 0 */
  vulnMs: number;
  /** chilled: attacks slowed while > 0 */
  chillMs: number;
  /** Static Field: takes more lightning damage while > 0 */
  shockMs?: number;
  /** pack members are scaled down; xp and loot scale with them */
  scale: number;
  /** damage-over-time accumulated since the last report */
  dotAcc: number;
  dotTimer: number;
  /** kill already processed */
  dead: boolean;
  /** where it stands on the battlefield (engine/battlefield.ts), ms until its next step forward, and how long a step takes */
  cell: number;
  stepMs: number;
  moveMs: number;
  /** its basic spell leaves hazardous ground under the player */
  attackGround: boolean;
}

export type GroundKind = 'burning' | 'chilled' | 'shocked' | 'caustic';

/** A hazard on a battlefield cell (the player's, hurting monsters) or under the player (cell -1, a monster's). */
export interface Ground {
  cell: number;
  kind: GroundKind;
  dps: number;
  remainingMs: number;
  durationMs: number;
}

export interface Buff {
  /** flask id or skill gem id */
  id: string;
  source: 'flask' | 'skill';
  remainingMs: number;
  durationMs: number;
  stats?: Partial<Record<StatKey, number>>;
  moreDamage?: number;
  /** % of max life regenerated per second (negative drains, never below 1 life) */
  regenPct?: number;
  /** % of max energy shield restored per second */
  esRegenPct?: number;
  /** Blood Frenzy: kills extend the buff, up to this long */
  extendMaxMs?: number;
  /** flask buffs: the flask's own effect multiplier */
  mult?: number;
}

export interface SupportGemInstance {
  uid: number;
  supportId: string;
}

export interface SkillGemInstance {
  uid: number;
  gemId: string;
  level: number;
  xp: number;
  supports: (SupportGemInstance | null)[];
  /** extra support sockets from Orbs of Expansion */
  extraSlots: number;
  rule: TacticRule;
}

export interface HealOverTime {
  resource: 'life' | 'mana';
  perMs: number;
  remainingMs: number;
}

export interface CombatRuntime {
  zoneId: string;
  monsters: MonsterInstance[];
  spawnMs: number;
  /** time until the player's next action, and how long the current one takes */
  actionMs: number;
  actionTotal: number;
  /** gem id of the skill being used right now (for the UI) */
  using: string | null;
  cooldowns: number[];
  /** skill-bar slot the player asked to cast manually */
  queued: number | null;
  buffs: Buff[];
  heals: HealOverTime[];
  shield: number;
  shieldMax: number;
  /** ms until energy shield starts recharging (reset by every hit taken) */
  esDelayMs: number;
  blocks: number;
  evadeMs: number;
  /** signature support state */
  glacial: boolean;
  retaliate: boolean;
  ambush: boolean;
  flurryStacks: number;
  /** Phantom mastery: next hit after a guard is stronger */
  empowered: boolean;
  /** Counterweight: Parry with its signature is up, and % more damage stored for the next attack */
  counterweight?: boolean;
  counterweightMore?: number;
  /** Misdirection: a hit was evaded since the last Feint */
  misdirect?: boolean;
  /** auto-flee has taken over the player's pace, and ms until fleeing loses the next monster */
  fleeing: boolean;
  shakeMs: number;
  /** hazards on the field and under the player; ground damage to the player is reported once a second */
  ground: Ground[];
  groundAcc: number;
  groundTimer: number;
  /** class mechanic meter: Rage, Momentum or Malice stacks, or Fervor % (engine/mechanics.ts) */
  mech: number;
  /** Martyr: incoming damage that filled the current Fervor */
  mechDamage: number;
  /** Riposte cooldown, and whether the hit being rolled is a riposte */
  riposteMs: number;
  riposting: boolean;
  /** Mana is Power: how full mana was when the current skill started */
  manaFrac: number;
  /** Overclock: time spent running hot, and time left locked up */
  heatMs: number;
  overheatMs: number;
  /** Eternal Hunger: time left before you starve */
  hungerMs: number;
}

/** What a Craft until… activity spends each step: an orb (optionally with a Fossil) or an Essence. */
export type CraftMethod = { orb: string; fossil?: string | null } | { essence: string };

/** When a Craft until… activity stops. `minTier` is an affix tier index (higher is better). */
export type StopRule = { kind: 'has'; affixId: string; minTier?: number } | { kind: 'twoOf'; affixIds: string[] };

export type Action =
  | { kind: 'skill'; actionId: string; progress: number }
  | { kind: 'combat'; zoneId: string }
  | { kind: 'craft'; uid: number; method: CraftMethod; rule: StopRule; progress: number; steps: number }
  | null;

/** Smithing catalyst slot: a Fossil biases the roll of a Magic base, Resin raises item level. */
export interface SmithCatalyst {
  fossil: string | null;
  resin: string | null;
  /** keep smithing until a Magic base rolls one of the Fossil's modifiers */
  until: boolean;
  /** while repeating, salvage the bases that miss */
  salvageMisses: boolean;
}

export interface VendorOffer {
  id: number;
  kind: 'item' | 'flask' | 'currency' | 'gem' | 'support';
  item?: Item;
  flask?: FlaskInstance;
  gemId?: string;
  supportId?: string;
  currencyId?: string;
  qty?: number;
  price: number;
}

/** how fast the player pushes through an area: sets how often new waves arrive */
export type Movement = 'flee' | 'slow' | 'walk' | 'run';

export interface Settings {
  autoSalvage: Record<Rarity, boolean>;
  reducedMotion: boolean;
  movement: Movement;
  /** flee on low life, then resume the chosen pace once healed */
  autoFlee: boolean;
}

export interface Lifetime {
  kills: number;
  bossKills: number;
  deaths: number;
  itemsLooted: number;
  orbsUsed: number;
  salvaged: number;
  flasksDrunk: number;
  flasksBrewed: number;
  itemsSmithed: number;
  gathered: number;
  benchCrafts: number;
  raresFound: number;
  uniquesFound: number;
  /** Exile achievement: Ysolde kills with no unique equipped */
  exileBareKills?: number;
}

export interface CharacterInfo {
  id: string;
  name: string;
  classId: ClassId;
  /** Exile only: the passive tree start node picked at creation */
  startNode?: string;
  createdAt: number;
}

export interface TutorialState {
  /** index into TUTORIAL_STEPS */
  step: number;
  progress: number;
  done: boolean;
  skipped: boolean;
}

export interface GameState {
  version: number;
  character: CharacterInfo;
  tutorial: TutorialState;
  nextUid: number;
  skills: Record<SkillId, number>;
  bank: Record<string, number>;
  inventory: Item[];
  equipment: Partial<Record<EquipSlot, Item>>;
  flaskSlots: (FlaskInstance | null)[];
  skillBar: (SkillGemInstance | null)[];
  /** skill gems not on the bar */
  gems: SkillGemInstance[];
  /** loose support gems */
  supportGems: SupportGemInstance[];
  flaskStash: FlaskInstance[];
  action: Action;
  life: number;
  mana: number;
  /** energy shield: soaks damage before life and recharges once you stop being hit */
  es: number;
  combat: CombatRuntime | null;
  zoneKills: Record<string, number>;
  unlockedZones: string[];
  passives: string[];
  /** chosen bonus (0–2) for each allocated mastery */
  masteries: Record<string, number>;
  /** allocated skilling-tree nodes */
  skillPassives: string[];
  /** completed achievement ids */
  achievements: string[];
  /** areas whose boss has been killed at least once */
  bossesDefeated: string[];
  /** Greenhouse keystone: the harvesting action that keeps ticking in the background */
  greenhouse: { actionId: string; progress: number } | null;
  smithCatalyst: SmithCatalyst;
  hideout: Record<string, number>;
  vendor: { stock: VendorOffer[]; refreshAt: number };
  settings: Settings;
  lifetime: Lifetime;
  /** total game time simulated, ms */
  clock: number;
  lastSaved: number;
}

export type GameEvent =
  | {
      t: 'hit';
      target: 'player' | 'monster';
      amount: number;
      crit?: boolean;
      /** a Mega Crit: flat 400%, ignores crit multiplier */
      mega?: boolean;
      dmgType: DamageType;
      evaded?: boolean;
      blocked?: boolean;
      absorbed?: number;
      /** taken by energy shield instead of life */
      es?: number;
      monsterUid?: number;
      dot?: boolean;
    }
  | { t: 'skill'; slot: number; gemId: string; manual: boolean }
  | { t: 'interrupt'; name: string }
  | { t: 'area'; gemId: string; cells: number[] }
  | { t: 'gemLevel'; gemId: string; level: number }
  | { t: 'kill'; name: string; boss: boolean }
  | { t: 'spawn'; name: string; boss: boolean }
  | { t: 'death'; xpLost: number }
  | { t: 'loot'; item?: Item; currencyId?: string; qty?: number; salvaged?: boolean; gemId?: string; supportId?: string; flask?: FlaskInstance }
  | { t: 'levelup'; skill: SkillId; level: number }
  | { t: 'xp'; skill: SkillId; amount: number }
  | { t: 'produce'; skill: SkillId; outputs: Record<string, number> }
  | { t: 'craft'; text: string; uid: number; orbId?: string }
  | { t: 'craftDone'; text: string; uid: number }
  | { t: 'equip'; uid: number }
  | { t: 'allocate'; nodeId: string }
  | { t: 'combatStart'; zoneId: string }
  | { t: 'tutorialStep'; step: number; done: boolean }
  | { t: 'achievement'; id: string }
  | { t: 'flask'; slot: number; flaskId: string; auto: boolean }
  | { t: 'bossCast'; name: string; kind: 'slam' | 'nova'; skill: string }
  | { t: 'bossPhase'; name: string; text: string }
  | { t: 'actComplete'; act: number }
  | { t: 'bossWaiting'; name: string }
  | { t: 'zoneUnlocked'; zoneId: string }
  | { t: 'info'; text: string; tone?: 'warn' | 'good' };
