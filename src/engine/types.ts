import type { AscendancyId } from '../data/ascendancies';
import type { ClassId } from '../data/classes';
import type { CultureId } from '../data/expedition';
import type { RuleUnlock, SkillPriority, TacticRule } from '../data/gems';
import type { BossMechanic, MonsterSkill } from '../data/zones';

export type SkillId = 'combat' | 'mining' | 'woodcutting' | 'harvesting' | 'thieving' | 'archaeology' | 'smithing' | 'alchemy' | 'gemcutting' | 'runecarving' | 'cooking' | 'fishing';
export const SKILL_IDS: SkillId[] = ['combat', 'mining', 'woodcutting', 'harvesting', 'thieving', 'archaeology', 'smithing', 'alchemy', 'gemcutting', 'runecarving', 'cooking', 'fishing'];

export type Rarity = 'normal' | 'magic' | 'rare' | 'unique';

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

/** Four ring fingers; a one-handed weapon can go in the off-hand to dual wield. */
export type EquipSlot = Exclude<ItemSlotType, 'ring'> | 'ring1' | 'ring2' | 'ring3' | 'ring4';

export type Tag =
  | 'weapon'
  /** weapon sub-tags: which mod pool a weapon rolls from (daggers and sceptres have both) */
  | 'attack_weapon'
  | 'caster_weapon'
  /** a weapon's attributes, for attribute mods */
  | 'str_weapon'
  | 'dex_weapon'
  | 'int_weapon'
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
  /** hybrid armour pieces also carry their pair tag, for hybrid defence mods */
  | 'str_dex_armour'
  | 'str_int_armour'
  | 'dex_int_armour'
  | 'jewellery';

/** Every stat a character can have. Add new ones here; Stats and the stat engine pick them up. */
export const STAT_KEYS = [
  'life', 'lifePct', 'lifeMore', 'lifeRegen', 'lifeRegenPct', 'lifeLeech', 'physMin', 'physMax', 'physPct',
  'fireMin', 'fireMax', 'coldMin', 'coldMax', 'lightMin', 'lightMax', 'elemPct', 'attackSpeedPct', 'moveSpeedPct',
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
  // local mods (docs/design/GEAR.md): change only the item they're on
  'localPhysPct', 'localArmourPct', 'localEvasionPct', 'localEsPct',
  'physLeech', 'elemLeech', 'charXp', 'manaAsEs', 'spellBlock', 'poisonOnHit', 'igniteOnHit',
  // flat damage added to spells at full effectiveness
  'spellFireMin', 'spellFireMax', 'spellColdMin', 'spellColdMax', 'spellLightMin', 'spellLightMax',
  // class mechanic knobs (docs/design/CLASSES.md): only the class with that mechanic uses them
  'rageMax', 'rageEffect', 'rageDecay', 'rageRegen', 'rageOnHitTaken', 'endlessFury',
  'ripostePct', 'riposteCooldown', 'riposteHeal', 'riposteCrit', 'riposteBleed', 'perfectForm',
  'momentumMax', 'momentumEffect', 'momentumRetain', 'momentumEvasion', 'perpetualMotion',
  'maliceMax', 'coupPct', 'maliceCritKeep', 'coupAilment', 'maliceOnHitTaken', 'thousandCuts',
  'manaPower', 'manaPowerFull', 'manaPowerEs', 'allOrNothing',
  'fervorPct', 'novaPct', 'novaHeal', 'novaEs', 'saintsSacrifice',
  // skill modifiers on uniques (docs/design/SKILLS_AND_UNIQUES.md ★): tweak one named skill
  'pummelHits', 'barrageArrows', 'parryBlocks', 'hammerConvert', 'meditateEs', 'infernalSpread',
  // forbidden keystones
  'overclock', 'knifesEdge', 'eternalHunger',
  // minions (docs/design/MINIONS.md)
  'minionPct', 'minionLifePct', 'minionSpeedPct',
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
  /** Locksmith's Wax: how the item looked when the impression was taken, ready to restore */
  impression?: Pick<Item, 'rarity' | 'name' | 'prefixes' | 'suffixes' | 'honed'>;
  /** the one rune slot (docs/design/RUNES.md): a rune id, apart from the modifiers, so no orb touches it */
  rune?: string;
  /** Ancient Whetstone: the affix id it last raised. Only counts while that modifier is on the item */
  honed?: string;
}

export type InstillCondition = 'lowLife' | 'fullCharges' | 'bossCast' | 'frostbite';

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
  castKind: 'slam' | 'nova' | 'channel' | null;
  castTotal: number;
  /** this boss's own wind-ups */
  casts: Record<'slam' | 'nova' | 'channel', MonsterSkill>;
  enraged: boolean;
  /** boss barrier: absorbs damage; heals the boss if still up when wardMs runs out */
  ward: number;
  wardMax: number;
  wardMs: number;
  wardsUsed: number;
  res: { fire: number; cold: number; light: number };
  dots: Dot[];
  stunMs: number;
  /** a boss's Stagger, filled by your stuns, and how many times it has been staggered (each needs more; combat.ts `staggerMax`) */
  stagger?: number;
  staggers?: number;
  frozenMs: number;
  /** armour broken: takes more damage while > 0 */
  vulnMs: number;
  /** chilled: attacks slowed while > 0 */
  chillMs: number;
  /** Static Field: takes more lightning damage while > 0 */
  shockMs?: number;
  /** the one curse it carries */
  curse?: Curse;
  /** a boss with living martyrs: nothing can hurt it */
  chained?: boolean;
  /** how many times this boss has chained martyrs */
  martyrWaves?: number;
  /** a Chained Martyr: it stands still, never attacks and only takes hits aimed at it */
  martyr?: boolean;
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
  /** the high peaks: its cold ground is Frozen, not Chilled */
  rime?: boolean;
  /** the ground it lays, when that isn't what its element leaves behind */
  groundKind?: GroundKind;
  /** channels of this boss that have landed: each leaves it stronger */
  surges?: number;
  /** ms into the channel, and how many of its pulses have gone off */
  channelMs?: number;
  pulses?: number;
}

/** A curse on a monster, with its numbers already scaled for gem level, supports and bosses. */
export interface Curse {
  gemId: string;
  remainingMs: number;
  durationMs: number;
  physTaken: number;
  resPen: number;
  dealLess: number;
  slow: number;
  /** Contagion: jumps to another enemy when this one dies */
  spreads?: boolean;
  /** Wither Will: killing this enemy heals you */
  withers?: boolean;
  /** Stigmata: % increased damage taken from bleeding */
  bleedTaken?: number;
  /** Weeping Wounds: your hits on this enemy cause Bleeding */
  weeping?: boolean;
  /** Burden: % longer stuns and % more Stagger */
  stunTaken?: number;
  /** Dead Weight: takes more damage while stunned */
  crushing?: boolean;
  /** Death Warrant: the share of what the enemy takes that lands again, what it has taken so far, and whether its neighbours pay too */
  warrant?: number;
  owed?: number;
  collective?: boolean;
}

export type GroundKind = 'burning' | 'chilled' | 'frozen' | 'shocked' | 'caustic' | 'stormwater';

/** A hazard on a battlefield cell (the player's, hurting monsters) or under the player (cell -1, a monster's). */
export interface Ground {
  cell: number;
  kind: GroundKind;
  dps: number;
  remainingMs: number;
  durationMs: number;
}

/** One of the player's minions on the field. Everything it does comes from the skill gem that called it, read live from the bar. */
export interface Minion {
  uid: number;
  gemId: string;
  name: string;
  /** the monster art it wears */
  art: string;
  cell: number;
  life: number;
  maxLife: number;
  /** how many of these the gem keeps up, for "its effect is not active" */
  max: number;
  /** steps it can hit across */
  reach: number;
  /** % less damage taken */
  tough?: number;
  /** takes this % of each hit that lands on the player */
  shares?: number;
  taunts?: boolean;
  /** ms until its next hit, and until its next step */
  attackMs: number;
  stepMs: number;
  /** only temporary minions have these */
  remainingMs?: number;
  durationMs?: number;
}

/** A storm on the field: it hits whatever stands in its cells every so often, until it blows out. */
export interface Storm {
  uid: number;
  gemId: string;
  center: number;
  cells: number[];
  /** how many of these the gem keeps up, for "its effect is not active" */
  max: number;
  /** ms until its next strike */
  pulseMs: number;
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
  /** Tailwind: hazards under you burn out as if you were running */
  outpace?: boolean;
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
  /** when it fires on its own: every rule has to pass, so a second rule narrows the first */
  rules: TacticRule[];
  priority: SkillPriority;
}

export interface HealOverTime {
  resource: 'life' | 'mana';
  perMs: number;
  remainingMs: number;
}

export interface CombatRuntime {
  zoneId: string;
  monsters: MonsterInstance[];
  /** the player has sent for the boss; it comes once the field is clear */
  challenged?: boolean;
  /** farming this area's beaten boss: it alone comes back, and bossRespawnMs is the wait until it does */
  bossFarm?: boolean;
  bossRespawnMs?: number;
  /** ms before the gates open: the pause while you search for monsters (tests hold it high to stop spawns) */
  spawnMs: number;
  /** ms until each edge gate (battlefield EDGE_CELLS) sends its next monster */
  gates?: number[];
  /** the monster the player clicked to focus, the one the last skill went for, and the one being closed in on */
  lockedUid?: number;
  targetUid?: number;
  closingUid?: number;
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
  /** Barbed Ward: what the shield hits back for when it breaks */
  barbedWard?: number;
  /** Recoil: the shield stuns what's in melee range when it breaks */
  recoil?: boolean;
  /** Radiance: what the shield strikes every enemy for when it breaks */
  radiance?: number;
  /** a heavy skill coming down: paid for, it lands when actionMs runs out, and waits there for something to hit */
  windup?: {
    gemUid: number;
    targetUid?: number;
    manual: boolean;
    manaFrac: number;
    /** Worldbreaker: damage taken since it started */
    stored?: number;
    /** Goaded: hits shorten it */
    goaded?: boolean;
    /** Unmoved: hits do less */
    braced?: boolean;
  };
  /** what the blow coming down adds, from `windup.stored` */
  storedDamage?: number;
  /** Royal Decree: the share of their damage the spells it calls deal, only while it's calling them */
  decreeMult?: number;
  /** Eternal Ward: the shield outlives its timer */
  holdShield?: boolean;
  /** a heavy kill swings on: the next wind-up takes this share of its time */
  windupCarry?: number;
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
  /** Surefoot: hazards under the player do nothing while > 0 */
  groundProofMs?: number;
  /** Frostbite stacks on the player */
  frostbite?: number;
  /** frozen solid: no actions until this runs out */
  frozenMs?: number;
  groundAcc: number;
  groundTimer: number;
  /** the player's minions and storms; both stay on the field between packs, and neither survives leaving the area */
  minions?: Minion[];
  storms?: Storm[];
  /** the DPS meter: damage dealt in the last finished window and the current one */
  dealt: number[];
  /** how far through the current window the meter is */
  dealtMs: number;
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
  /** what the character's ascendancy keeps track of in a fight */
  asc: AscendancyRuntime;
}

/** Ascendancy state that lasts as long as a fight (engine/combat.ts). Unused fields stay at zero. */
export interface AscendancyRuntime {
  /** Ravager: time left on a Rampage, its full length so far, and how long No Mercy holds the drain */
  rampageMs: number;
  rampageTotal: number;
  holdMs: number;
  /** Falconer: ms to the hawk's next attack, and whether the hit being rolled is the hawk's */
  hawkMs: number;
  hawking: boolean;
  /** Last Arrow: the next hit can't miss and is a crit */
  sureCrit: boolean;
  /** Matador: Ripostes in a row */
  streak: number;
  /** Burnout: free spells left, and whether mana has climbed back enough to set it off again */
  burnout: number;
  burnoutRearmed: boolean;
  /** Lightkeeper: novas stored, the damage that filled them, and Dawn waiting to absorb a wind-up */
  novas: number;
  novaDamage: number;
  dawn: boolean;
  /** whether monsters were on the field last step: an empty field starting to fill is a new fight */
  fighting: boolean;
}

/** When a Lightkeeper's stored novas go off on their own. */
export type NovaRelease = 'full' | 'windup' | 'lifeLow' | 'manual';

/** A character's ascendancy (docs/design/ASCENDANCIES.md). */
export interface AscendancyState {
  id: AscendancyId | null;
  /** allocated nodes; the gate comes free with the choice and isn't listed */
  nodes: string[];
  /** trials passed: 1 opens the choice, 2 the notables, 3 the capstone */
  trials: number;
  /** points earned */
  points: number;
  /** Next: Malice kept for the next fight */
  carry: number;
  /** Falconer: what the hawk goes for, set apart from the player's own targeting */
  hawk: Targeting;
  release: NovaRelease;
}

/** What a Craft until… activity spends each step: an orb (optionally with a Fossil) or an Essence. */
export type CraftMethod = { orb: string; fossil?: string | null } | { essence: string };

/** When a Craft until… activity stops. `minTier` is an affix tier index (higher is better). */
export type StopRule = { kind: 'has'; affixId: string; minTier?: number } | { kind: 'twoOf'; affixIds: string[] };

export type Action =
  | { kind: 'skill'; actionId: string; progress: number; focus?: number }
  | { kind: 'combat'; zoneId: string }
  | { kind: 'craft'; uid: number; method: CraftMethod; rule: StopRule; progress: number; steps: number }
  | { kind: 'heist'; jobId: string; room: number; lastRoom: number; progress: number; take: Record<string, number>; focus?: number }
  | null;

/** Smithing catalyst slot: a Fossil biases the roll of a Magic base, Resin raises item level. */
export interface SmithCatalyst {
  fossil: string | null;
  resin: string | null;
  /** keep smithing until a Magic base rolls one of the Fossil's modifiers */
  until: boolean;
  /** while repeating, salvage the bases that miss */
  salvageMisses: boolean;
  /** with the bench built: salvage new bases instead of stopping when the bag is full */
  salvageFull: boolean;
  /** with the bench built: salvage every new base, for levelling Smithing */
  salvageAll: boolean;
}

/** The three Town shops. */
export type ShopId = 'magic' | 'armour' | 'gems';

export interface VendorOffer {
  id: number;
  shop: ShopId;
  kind: 'item' | 'flask' | 'currency' | 'gem' | 'support';
  item?: Item;
  flask?: FlaskInstance;
  gemId?: string;
  supportId?: string;
  currencyId?: string;
  qty?: number;
  price: number;
}

/** how fast the player pushes through an area: sets how often new monsters arrive */
export type Movement = 'flee' | 'slow' | 'walk' | 'run';

/** Which monster skills go for: a priority group first, then an order inside it (nearest breaks ties). */
export type TargetPriority = 'none' | 'boss' | 'ranged' | 'ailing';
export type TargetOrder = 'closest' | 'farthest' | 'lowest' | 'highest';
export interface Targeting {
  priority: TargetPriority;
  order: TargetOrder;
}

export interface Settings {
  autoSalvage: Record<Rarity, boolean>;
  reducedMotion: boolean;
  movement: Movement;
  /** flee on low life, then resume the chosen pace once healed */
  autoFlee: boolean;
  /** a ready boss comes on its own instead of waiting to be challenged */
  autoBoss: boolean;
  targeting: Targeting;
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
  mealsEaten: number;
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

/** What the account has earned for automation. One-way: nothing ever takes these back. */
export interface AutomationUnlocks {
  rules: RuleUnlock[];
  ruleSlots: number;
  offlineHours: number;
}

/**
 * Which set of hideout, stash and unlocks a character belongs to. Challenge modes (Hardcore, Classic) will each be a
 * realm of their own, with their own AccountState, so they start fresh.
 */
export type Realm = 'standard';

/** What every character in a realm shares. Saved on its own, never inside a character. See engine/account.ts. */
export interface AccountState {
  id: string;
  realm: Realm;
  /** goes up with every save, so the newest copy can be told from an older one */
  rev: number;
  hideout: Record<string, number>;
  automation: AutomationUnlocks;
  /** stash pages of gear, STASH_PAGE_SIZE each */
  stash: Item[][];
  /** items that didn't fit when stashes were merged: they can only be taken out */
  overflow: Item[];
  /** the next account uid: see ACCOUNT_UID_BASE */
  nextUid: number;
  exileUnlocked: boolean;
  /** characters and accounts already folded in, so none counts twice */
  absorbed: string[];
}

/** Account data arriving from elsewhere: a pre-account save, a demo, an import. */
export type AccountTransfer = Partial<Pick<AccountState, 'id' | 'hideout' | 'automation' | 'stash' | 'overflow' | 'exileUnlocked'>>;

/** A map being run. Its map is already used up. */
export interface MapRun {
  zoneId: string;
  tier: number;
  theme: string;
  packsLeft: number;
  packsTotal: number;
  /** game clock when it started */
  startedAt: number;
  /** lifetime deaths when it started: a rise means the run ended in one */
  deaths: number;
  bossDown: boolean;
}

export interface MapState {
  /** maps held, by map zone id */
  stock: Record<string, number>;
  run: MapRun | null;
  /** what auto-run keeps opening */
  auto: { tier: number; theme: string } | null;
  /** running totals, to judge a loop by; runs and clearMs count finished maps */
  tally: { runs: number; clearMs: number; mapsFound: number; favoured: number };
}

/** Archaeology's Expedition (engine/expedition.ts). A dig is a plain skill action: this is what outlasts it. */
export interface ExpeditionState {
  /** digs done at each site: its stratum and finds are worked out from this */
  dug: Record<string, number>;
  /** purchases gone from a shelf as of the clock time `at`; a ware with no entry has a full shelf */
  shelves: Record<string, { sold: number; at: number }>;
  /** one standing order per people, as a ware id */
  orders: Partial<Record<CultureId, string>>;
  tally: { finds: number; traded: number };
}

/** Thieving's Heist board (engine/heist.ts). The job under way lives on `action`, so anything else you start ends it. */
export interface HeistState {
  /** rank of every rogue hired */
  rogues: Record<string, number>;
  /** rogues on the crew, up to crewSlots() */
  crew: string[];
  /** the room each job walks out after, where it isn't the vault */
  exits: Record<string, number>;
  /** the job that repeats, casing for Markers between runs */
  auto: string | null;
  /** running totals: jobs finished, and how many of those ended in an alarm */
  tally: { jobs: number; alarms: number };
}

/** A saved doll: what each slot holds, by item uid. A slot left out comes off when the set goes on. */
export interface GearSet {
  id: number;
  name: string;
  items: Partial<Record<EquipSlot, number>>;
}

/** One saved bar slot. Sockets, rules and priority are part of it, so one skill can be set up for bosses and again for packs. */
export interface SkillSetSlot {
  gem: number;
  supports: (number | null)[];
  rules: TacticRule[];
  priority: SkillPriority;
}

export interface SkillSet {
  id: number;
  name: string;
  slots: (SkillSetSlot | null)[];
}

/** Saved gear sets and skill bars (engine/loadouts.ts). */
export interface Loadouts {
  gear: GearSet[];
  skills: SkillSet[];
  /** the gear set each activity switches to */
  auto: Partial<Record<SkillId, number>>;
  /** the activity last seen, so a switch only happens when it changes */
  lastActivity: SkillId | null;
}

export interface GameState {
  version: number;
  /** the shared account block; a running game holds the live one, and saves leave it out */
  account: AccountState;
  /** account data this character still has to hand over (see settleCharacter) */
  unmerged?: AccountTransfer;
  character: CharacterInfo;
  tutorial: TutorialState;
  nextUid: number;
  skills: Record<SkillId, number>;
  bank: Record<string, number>;
  /** the bag you carry (BAG_SIZE) */
  inventory: Item[];
  /** fresh drops waiting to be picked up, oldest first; kept when you leave an area */
  ground: Item[];
  /** uids on the ground when you last died: dying again loses these */
  groundMarked?: number[];
  /** drops while you were away, oldest first; kept until emptied */
  offlineHaul: Item[];
  equipment: Partial<Record<EquipSlot, Item>>;
  flaskSlots: (FlaskInstance | null)[];
  /** the Maps preview (engine/maps.ts) */
  maps: MapState;
  heist: HeistState;
  expedition: ExpeditionState;
  skillBar: (SkillGemInstance | null)[];
  /** skill gems not on the bar */
  gems: SkillGemInstance[];
  /** loose support gems */
  supportGems: SupportGemInstance[];
  flaskStash: FlaskInstance[];
  loadouts: Loadouts;
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
  ascendancy: AscendancyState;
  /** allocated skilling-tree nodes */
  skillPassives: string[];
  /** completed achievement ids */
  achievements: string[];
  /** areas whose boss has been killed at least once */
  bossesDefeated: string[];
  /** Greenhouse keystone: the Foraging action that keeps ticking in the background */
  greenhouse: { actionId: string; progress: number } | null;
  /** what you've eaten: its clock only runs while you fight */
  meal: { id: string; remainingMs: number } | null;
  /** when a meal runs out, eat another of the same from the bank */
  keepEating: boolean;
  smithCatalyst: SmithCatalyst;
  /** `rerolls`: paid restocks since the last free one (raises the price) */
  vendor: { stock: VendorOffer[]; refreshAt: number; rerolls?: number };
  settings: Settings;
  lifetime: Lifetime;
  /** total game time simulated, ms */
  clock: number;
  lastSaved: number;
}

export type GameEvent =
  | {
      t: 'hit';
      target: 'player' | 'monster' | 'minion';
      amount: number;
      crit?: boolean;
      /** a Mega Crit: flat 400%, ignores crit multiplier */
      mega?: boolean;
      /** dealt by a Duelist's Riposte */
      riposte?: boolean;
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
  | { t: 'closeIn'; monsterUid: number }
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
  | { t: 'bossCast'; name: string; kind: 'slam' | 'nova' | 'channel'; skill: string }
  | { t: 'bossPhase'; name: string; text: string }
  | { t: 'actComplete'; act: number }
  | { t: 'trialPassed'; n: number }
  | { t: 'bossWaiting'; name: string }
  | { t: 'zoneUnlocked'; zoneId: string }
  | { t: 'info'; text: string; tone?: 'warn' | 'good' };
