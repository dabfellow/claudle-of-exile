import type { StationId } from '../data/hideout';
import type { AscendancyId } from '../data/ascendancies';
import type { ClassId } from '../data/classes';
import type { CultureId } from '../data/expedition';
import type { RuleUnlock, SkillPriority, TacticRule } from '../data/gems';
import type { BossMechanic, MonsterSkill } from '../data/zones';

export type SkillId = 'combat' | 'mining' | 'woodcutting' | 'harvesting' | 'thieving' | 'archaeology' | 'smithing' | 'alchemy' | 'gemcutting' | 'runecarving' | 'cooking' | 'cartography' | 'fishing';
export const SKILL_IDS: SkillId[] = ['combat', 'mining', 'woodcutting', 'harvesting', 'thieving', 'archaeology', 'smithing', 'alchemy', 'gemcutting', 'runecarving', 'cooking', 'cartography', 'fishing'];

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
  'life', 'lifePct', 'lifeMore', 'lifeRegen', 'lifeRegenPct', 'lifeLeech', 'manaLeech', 'physMin', 'physMax', 'physPct',
  'fireMin', 'fireMax', 'coldMin', 'coldMax', 'lightMin', 'lightMax', 'chaosMin', 'chaosMax', 'chaosPct', 'chillChance', 'shockChance', 'elemPct', 'attackSpeedPct', 'moveSpeedPct',
  'attackSpeedMore', 'critChancePct', 'critMulti', 'armour', 'armourPct', 'armourMore', 'evasion',
  'evasionPct', 'fireRes', 'coldRes', 'lightRes', 'allRes', 'chaosRes', 'itemRarity', 'skillSpeed', 'skillXp',
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
  // local mods (docs/GAME.md): change only the item they're on
  'localPhysPct', 'localArmourPct', 'localEvasionPct', 'localEsPct',
  'physLeech', 'elemLeech', 'charXp', 'manaAsEs', 'spellBlock', 'poisonOnHit', 'burnChance',
  // flat damage added to spells at full effectiveness
  'spellFireMin', 'spellFireMax', 'spellColdMin', 'spellColdMax', 'spellLightMin', 'spellLightMax',
  // class mechanic knobs (docs/GAME.md): only the class with that mechanic uses them
  'rageMax', 'rageEffect', 'rageDecay', 'rageRegen', 'rageOnHitTaken', 'endlessFury',
  'ripostePct', 'riposteCooldown', 'riposteHeal', 'riposteCrit', 'riposteBleed', 'perfectForm',
  'momentumMax', 'momentumEffect', 'momentumRetain', 'momentumEvasion', 'perpetualMotion',
  'maliceMax', 'coupPct', 'maliceCritKeep', 'coupAilment', 'maliceOnHitTaken', 'thousandCuts', 'maliceOnHit',
  'manaPower', 'manaPowerFull', 'manaPowerEs', 'allOrNothing',
  'fervorPct', 'novaPct', 'novaHeal', 'novaEs', 'saintsSacrifice',
  // skill modifiers on uniques (docs/GAME.md ★): tweak one named skill
  'pummelHits', 'barrageArrows', 'parryBlocks', 'hammerConvert', 'meditateEs', 'infernalSpread',
  // forbidden keystones
  'overclock', 'knifesEdge', 'eternalHunger', 'chaosInoculation', 'abyssalPact', 'bloodGodsFrenzy',
  'ironReflexes', 'glancingBlows', 'soulTether', 'anarchistsGambit', 'deathsDoor', 'echoesOfTheVoid',
  // doomed node debuffs
  'doomedBloodToll', 'doomedBrittleBones', 'doomedGlassVeil', 'doomedWitheredVeins', 'doomedShatteredMind', 'doomedBrokenCovenant',
  // passive tree puzzle stats & gear synergies
  'cryoShatter', 'glacialBulwark', 'hypothermicCrit', 'permafrostConvert', 'aegisWard', 'ghostDance',
  'divineFlesh', 'recoupPct', 'defianceLowLife', 'runicConductor', 'masterArtisan', 'heavyArmorer',
  'jeweledHorizon', 'alchemicalCatalyst',
  'chaosInoculation', 'abyssalPact', 'bloodGodsFrenzy', 'ironReflexes', 'glancingBlows', 'soulTether', 'anarchistsGambit', 'deathsDoor', 'echoesOfTheVoid',
  // doomed node debuffs
  'doomedBloodToll', 'doomedBrittleBones', 'doomedGlassVeil', 'doomedWitheredVeins', 'doomedShatteredMind', 'doomedBrokenCovenant',
  // puzzle & playstyle archetype stats
  'cryoShatter', 'glacialBulwark', 'hypothermicCrit', 'permafrostConvert', 'aegisWard', 'ghostDance', 'divineFlesh', 'recoupPct',
  'defianceLowLife', 'runicConductor', 'masterArtisan', 'heavyArmorer', 'jeweledHorizon', 'alchemicalCatalyst',
  // cosmic gateways
  'gatewaySolar', 'gatewayLunar', 'gatewayAstral', 'gatewayVoid', 'gatewayPrimal', 'gatewayDivine',
  // minions (docs/GAME.md)
  'minionPct', 'minionLifePct', 'minionSpeedPct',
  // passive tree archetypes (docs/PASSIVE_NOTABLES.md): conditional damage
  'bossDamagePct', 'cursedDamagePct', 'markedDamagePct', 'chilledDamagePct', 'shockedDamagePct', 'areaPct',
  'elemAttackPct', 'chaosDotPct', 'twoHandPct', 'oneHandPct', 'shieldDamagePct', 'dualWieldSpeed',
  'warcryActivePct', 'totemActivePct', 'exertedPct', 'physAsFire',
  // ...archetype scaling
  'curseEffect', 'curseDuration', 'minionMax', 'minionTaken', 'totemPct', 'totemLifePct', 'totemSpeedPct',
  'totemDuration', 'totemMax', 'markPct', 'markDuration', 'warcryEffect', 'warcryCooldown', 'exertionRate',
  'exertedRefund', 'stormPct', 'stormDuration', 'stormSpeedPct', 'doomPct', 'doomRate', 'poisonSpread',
  // ...defence
  'bossTakenReduction', 'highLifeReduction', 'totemActiveReduction', 'stormActiveReduction', 'maxElemRes',
  // ...the few "more" multipliers (Doomed wheels)
  'moreMelee', 'moreProjectile', 'morePoison', 'moreMinion', 'moreCold', 'moreStorm', 'moreTotem', 'moreMark',
  'moreWarcry', 'moreShield',
  // ...the 18 rule-changing notables
  'armourVsDot', 'warcryLinger', 'bleedStacks', 'steelTempest', 'ricochet', 'markPersist', 'extraCurse',
  'minionRevive', 'stormExtra', 'doomHalf', 'totemTaunt', 'resOvercap', 'rupture', 'accuracyCrit',
  'venomVolley', 'witherDot', 'esSteady', 'holyRetort',
  // unique mechanics & gold scaling
  'clingingHull', 'critGoldScale', 'goldFind', 'slothPyre', 'physCanShock', 'noElemDamage',
  'unblinkingFlare', 'cannotEvade', 'flaskReel', 'unwrittenNotable', 'blueprintRuin',
  'voidTouch', 'tectonicRupture', 'mirrorTwin', 'exileEcho', 'voidGaze', 'briarThorns',
  'novaShock', 'coupCull', 'corposantSurge', 'slackTideRefund', 'leviathanMend', 'kingsStride',
  // ascendancy BIS unique mechanics
  'ravagerFrenzy', 'anvilRetaliate', 'longshotSnipe', 'falconerTwin', 'wellspringCascade',
  'alchemistVolatile', 'matadorGrace', 'vanguardPhalanx', 'flagellantMartyr', 'lightkeeperPrism',
  'headsmanGuillotine', 'plaguewrightFester',
  // unique flask stats
  'karuiBlood', 'laviangaZeroMana', 'lionsRoarMoreMelee', 'bottledFaithCrit', 'dyingSunProj',
  // life skill stats on gear
  'inputSave', 'offlineSpeed', 'patientCrafter',
  'miningSpeed', 'gemChance', 'fossilChance', 'motherlode',
  'woodcuttingSpeed', 'birdsNest', 'resinChance', 'resinIlvl', 'heartwood',
  'harvestingSpeed', 'distiller', 'rareBlooms', 'greenhouse',
  'smithingSpeed', 'steadyTemper', 'smithMagic', 'grandmaster',
  'alchemySpeed', 'bulkBrewer', 'qualityBrews', 'transmuter',
  'thievingSpeed', 'markerChance', 'alertReduce', 'cleanGetaway',
  'archaeologySpeed', 'artifactChance', 'wareDiscount', 'deepSurvey',
  'gemcuttingSpeed', 'gemcuttingXp', 'gemDustSave', 'masterCutter',
  'runecarvingSpeed', 'secondStroke', 'deepCuts', 'livingScript',
  'cookingSpeed', 'secondHelping', 'slowSimmer', 'headChef',
  'cartographySpeed', 'secondCopy', 'mapFind', 'masterCartographer',
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export type Stats = Record<StatKey, number>;

export type DamageType = 'phys' | 'fire' | 'cold' | 'light' | 'chaos';

export interface RolledMod {
  affixId: string;
  /** index into the affix's tier list (0 = lowest tier) */
  tier: number;
  values: number[];
  crafted?: boolean;
  fractured?: boolean;
  elevated?: boolean;
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
  impression?: Pick<Item, 'rarity' | 'name' | 'prefixes' | 'suffixes' | 'honed' | 'fractured' | 'elevated' | 'doomImplicit' | 'voidSlot'>;
  /** the one rune slot (docs/GAME.md): a rune id, apart from the modifiers, so no orb touches it */
  rune?: string;
  /** Ancient Whetstone: the affix id it last raised. Only counts while that modifier is on the item */
  honed?: string;
  /** Fractured Orb: the affix id permanently locked onto the item */
  fractured?: string;
  /** Exile's Doom Sigil: the affix id elevated to Tier 0 Doom tier */
  elevated?: string;
  /** Architect's Doom Sigil: the Doom Implicit modifier on the item */
  doomImplicit?: string;
  /** Void Sigil: whether the 7th modifier slot has been unlocked */
  voidSlot?: boolean;
  /** Tiered loot (1–5): higher tiers feature better mod rolls, higher affix tiers, and natural fractured mods / rare bases at T5 */
  itemTier?: 1 | 2 | 3 | 4 | 5;
}

export type InstillCondition = 'lowLife' | 'lowMana' | 'fullCharges' | 'bossCast' | 'savageHit' | 'elemHit' | 'chaosHit' | 'frostbite' | 'enemyRanged' | 'packStart';

export interface FlaskMod {
  affixId: string;
  value: number;
}

export interface FlaskInstance {
  uid: number;
  flaskId: string;
  charges: number;
  /** flasks are normal, magic (1 prefix + 1 suffix), or unique */
  rarity: 'normal' | 'magic' | 'unique';
  ilvl: number;
  prefixes: FlaskMod[];
  suffixes: FlaskMod[];
  /** enchantment from an Instilling Orb: use automatically on this condition */
  instill: InstillCondition | null;
}

export interface Dot {
  /** Player ailment damage already emitted to the combat log. */
  reported?: number;
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
  /** Archetype damage is for basic attacks; telegraphed boss damage keeps its old budget. */
  basicDamageMult?: number;
  archetype?: import('../data/monsterProfiles').MonsterArchetype;
  armour?: number;
  evasion?: number;
  es?: number;
  maxEs?: number;
  esDelayMs?: number;
  /** Recharge is a stat, not free extra pool: bosses keep their authored ward/recovery mechanics. */
  esRechargePct?: number;
  blockChance?: number;
  spellBlockChance?: number;
  critChance?: number;
  critMulti?: number;
  dotShare?: number;
  attackAilment?: 'poison' | 'bleed' | 'burn';
  /** Original stats used for calibration and subsequent pool scaling. */
  budget?: { life: number; damage: number; attackMs: number; damageType: DamageType };
  dmgType: DamageType;
  /** basic attack or spell: what it's called, which it is, and its attack or cast time */
  attackName: string;
  attackKind: MonsterSkill['kind'];
  attackMs: number;
  attackTimer: number;
  isBoss: boolean;
  /** PoE-style monster rarity and its visible modifiers. Bosses are unique. */
  rarity: 'normal' | 'magic' | 'rare' | 'unique';
  mods: import('../data/monsterMods').MonsterModId[];
  xpMult: number;
  lootMult: number;
  regenPct: number;
  evasionPen: number;
  leechPct: number;
  /** Multiplier for area, chain and piercing hits. */
  areaTaken: number;
  /** boss mechanics and their timers (ms until the next use) */
  mechanics: BossMechanic[];
  timers: Partial<Record<BossMechanic, number>>;
  novaType: DamageType;
  slamType?: DamageType;
  /** Echoes: its pairs of old mechanics, and which pair it's on */
  echoes?: [BossMechanic, BossMechanic][];
  echoPhase?: number;
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
  res: { fire: number; cold: number; light: number; chaos: number };
  /** burn, chill and shock built up against its ailment threshold (combat.ts `ailmentThreshold`) */
  build?: { burn: number; chill: number; shock: number };
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
  /** shocked: takes more damage while > 0, by how much shock has built up */
  shockMs?: number;
  /** the one curse it carries */
  curse?: Curse;
  /** Rend: stacks of increased physical damage taken, from hits that rend; all fall off together */
  rend?: { gemId: string; stacks: number; pctPerStack: number; remainingMs: number };
  /** a boss with living martyrs: nothing can hurt it */
  chained?: boolean;
  /** how many times this boss has chained martyrs */
  martyrWaves?: number;
  /** a Chained Martyr: it stands still, never attacks and only takes hits aimed at it */
  martyr?: boolean;
  /** pack members are scaled down; xp and loot scale with them */
  scale: number;
  /** a Hulking monster: big, slow, hits hard, worth more xp, and shrugs off area and chain hits (see makeHulking) */
  hulking?: boolean;
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
  /** Doom meter (0–20): fills with hits from doom skills, detonates at 20 as chaos burst */
  doom?: number;
  /** ms accumulated since last hit, for doom decay (1 per second without a hit) */
  doomDecayMs?: number;
  /** Mark applied by a Mark skill: stacks on every hit, bursts when full */
  mark?: {
    kind: string;
    stacks: number;
    maxStacks: number;
    remainingMs: number;
    burst: { damage: [number, number]; type: DamageType; radius?: number; extraEffect?: string };
    /** the special effects of the supports on the gem that laid it, read when it bursts */
    specials?: string[];
  };
  /** Corrosion, Corruptor, Nihil: chaos resistance taken away, for this long */
  chaosShred?: number;
  chaosShredMs?: number;
  /** Withering Touch: each stack is 5% increased chaos damage taken (up to 10), while the timer runs */
  wither?: number;
  witherMs?: number;
  witherAcc?: number;
  /** Primal Force: deals 20% less damage while this runs */
  weakenMs?: number;
  /** Map tier identity: Elite pack monster */
  elite?: boolean;
  /** Map tier identity: Permanent enrage (30% speed, 40% damage) */
  permEnrage?: boolean;
  /** Map tier identity: Twin boss lieutenant or main boss sharing a Life pool */
  twinOf?: number;
  isTwin?: boolean;
  /** Doomed Maps: Revenant monster revives once at 30% Life */
  revenant?: boolean;
  /** Doomed Maps: Warded threshold (6s damage immunity at 60% Life) */
  doomedWardUsed?: boolean;
  immuneMs?: number;
  /** Hard Boss: Cracked Fault weak point object (0 damage, shatters to break Ossuar/Crownless plating) */
  weakPoint?: boolean;
  weakPointExpireMs?: number;
  /** Hard Boss: Ossuar plated carapace state */
  plated?: boolean;
  platingBreakMs?: number;
  platingStacks?: number;
  /** Hard Boss: Mother Vael Choir Singer role */
  choir?: 'mending' | 'wall' | 'haste';
  /** Hard Boss: Twin Regents guard and bonded partner uid */
  guardedMs?: number;
  regentPartner?: number;
  /** Hard Boss: The Undertow damage taken during a Deep Call channel */
  channelDmgTaken?: number;
  /** Hard Boss: The Crownless current phase (1, 2, 3) */
  crownlessPhase?: 1 | 2 | 3;
  /** Uber Boss: The First Exile adapted stance */
  mirrorStance?: 'melee' | 'projectile' | 'spell';
  /** Uber Boss: The Architect of Ruin current ruin phase (1..6) */
  ruinPhase?: number;
  /** Uber Boss: The Void Sovereign carapace state */
  voidShielded?: boolean;
  voidBuildup?: number;
  voidVulnMs?: number;
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

export type GroundKind = 'burning' | 'chilled' | 'frozen' | 'shocked' | 'caustic' | 'stormwater' | 'unholy';

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
  /** Grave Pact: it already rose again this pack */
  risen?: boolean;
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
  /** Resounding Cry: this warcry's more damage also empowers your totems */
  resounding?: boolean;
  /** a Warcry's buff (Warlord's Call keeps these up until the pack falls) */
  warcry?: boolean;
  /** Void Voice: hits have this % chance to poison while it lasts */
  poisonChance?: number;
  /** Carnage: kills explode onto the nearest enemy while it lasts */
  carnage?: boolean;
  /** Tailwind: hazards under you burn out as if you were running */
  outpace?: boolean;
  /** flask buffs: the flask's own effect multiplier */
  mult?: number;
  /** a buff that stacks with each use (Battle Rhythm): how many it has, its stats already multiplied in */
  stacks?: number;
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
  /** Blood of the Karui: restores full Life when the heal finishes */
  karuiEndFull?: boolean;
}

export interface CombatRuntime {
  zoneId: string;
  /** Architect's Compass / First Exile's Covenant: spell and skill cast counters */
  spellCount?: number;
  skillCount?: number;
  /** Monster-inflicted ailments, independent from ground and the act-specific Frostbite mechanic. */
  playerDots?: Dot[];
  playerChillMs?: number;
  playerShockMs?: number;
  playerBuild?: { burn: number; chill: number; shock: number };
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
  /** Steel Tempest: attacks used this fight */
  attackCount?: number;
  /** Holy Retort: damage blocked since your last attack, added to it as fire */
  retort?: number;
  /** Grave Pact: minions waiting to rise again (once per pack), with ms left */
  rising?: { minion: Minion; ms: number }[];
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
  /** stunned by enemy crit under Anarchist's Gambit: no actions until this runs out */
  playerStunMs?: number;
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
  /** Mana is Power: recent-spending fraction when the current skill started. */
  manaFrac: number;
  /** Mana is Power: mana paid during the rolling four-second window. */
  manaSpent?: { amount: number; remainingMs: number }[];
  /** Momentum: landed hits can only strip stacks once during this grace window. */
  momentumHitGraceMs?: number;
  /** Range posture movement pulse. */
  postureMs?: number;
  /** Overclock: time spent running hot, and time left locked up */
  heatMs: number;
  overheatMs: number;
  /** Eternal Hunger: time left before you starve */
  hungerMs: number;
  /** what the character's ascendancy keeps track of in a fight */
  asc: AscendancyRuntime;
  /** Exertion charge counter (0–5): builds with player hits, spent by Exertion-tagged skills */
  exertion?: number;
  /** the skill being used right now fired Exerted (its hits read this) */
  exerting?: boolean;
  /** Hair Trigger: time before a crit can refill Exertion again */
  hairTriggerMs?: number;
  /** Rally the Fallen: recent kills (one fades every two seconds), and the time toward the next fading */
  corpses?: number;
  corpseFadeMs?: number;
  /** Active totems placed by totem skills. `specials` are its gem's supports; `tauntMs` is Totem Vanguard's taunt left. */
  totems?: { gemId: string; life: number; maxLife: number; remainingMs: number; nextAttackMs: number; specials?: string[]; tauntMs?: number; replacement?: boolean }[];
  /** Hard Boss: The Undertow cold tide stacks slowing player actions */
  tideStacks?: number;
  /** Hard/Uber Boss: elapsed fight time in ms for the 5-minute escalating enrage */
  fightElapsedMs?: number;
  /** Uber Boss: player's most recent skill style for The First Exile's stance adaptation */
  lastPlayerStyle?: 'melee' | 'projectile' | 'spell';
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
  /** Wellspring: a Surge is paid for and waiting for its spell to land */
  surging: boolean;
  /** Lightkeeper: novas stored, the damage that filled them, and Dawn waiting to absorb a wind-up */
  novas: number;
  novaDamage: number;
  dawn: boolean;
  /** whether monsters were on the field last step: an empty field starting to fill is a new fight */
  fighting: boolean;
}

/** When a Lightkeeper's stored novas go off on their own. */
export type NovaRelease = 'full' | 'windup' | 'lifeLow' | 'manual';

/** A character's ascendancy (docs/GAME.md). */
export interface AscendancyState {
  id: AscendancyId | null;
  /** allocated nodes; the gate comes free with the choice and isn't listed */
  nodes: string[];
  /** trials passed: the first opens the choice; all four grant points with no node-specific locks */
  trials: number;
  /** points earned */
  points: number;
  /** Next: Malice kept for the next fight */
  carry: number;
  /** Falconer: what the hawk goes for, set apart from the player's own targeting */
  hawk: Targeting;
  release: NovaRelease;
}

/** What a Craft until… activity spends each step: an orb (optionally with a Fossil or Forger's Seal) or an Essence. */
export type CraftMethod = { orb: string; fossil?: string | null; sealed?: string | null } | { essence: string };

/** When a Craft until… activity stops. `minTier` is an affix tier index (higher is better). */
export type StopRule = { kind: 'has'; affixId: string; minTier?: number } | { kind: 'twoOf'; affixIds: string[] };

export type Action =
  /** `double`: a mini-game hit in its double zone, so the next finish pays out twice */
  | { kind: 'skill'; actionId: string; progress: number; focus?: number; double?: boolean }
  | { kind: 'combat'; zoneId: string }
  | { kind: 'craft'; uid: number; method: CraftMethod; rule: StopRule; progress: number; steps: number }
  | { kind: 'heist'; jobId: string; room: number; lastRoom: number; progress: number; take: Record<string, number>; focus?: number; double?: boolean }
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
export type Posture = 'brawler' | 'kiter' | 'cautious';

/** Which monster skills go for: a priority group first, then an order inside it (nearest breaks ties). */
export type TargetPriority = 'none' | 'boss' | 'ranged' | 'ailing';
export type TargetOrder = 'closest' | 'farthest' | 'lowest' | 'highest';
export interface Targeting {
  priority: TargetPriority;
  order: TargetOrder;
}

export interface Settings {
  autoSalvage: Record<Rarity, boolean>;
  /** Class loot filter: automatically salvage non-unique gear that does not fit your class attribute/defences */
  filterOffClassLoot?: boolean;
  /** Active custom loot filter id, or null if using standard settings */
  activeLootFilterId?: string | null;
  /** User-created and preset custom loot filters that can be swapped between */
  customLootFilters?: import('./lootFilter').CustomLootFilter[];
  /** Level-scaled preset, category overrides and ordered custom loot rules. */
  lootFilter?: import('./lootFilter').LayeredLootFilter;
  reducedMotion: boolean;
  movement: Movement;
  /** Automatic combat spacing; legacy movement remains the low-level pace used by old saves and tests. */
  posture?: Posture;
  /** flee on low life, then resume the chosen pace once healed */
  autoFlee: boolean;
  /** a ready boss comes on its own instead of waiting to be challenged */
  autoBoss: boolean;
  /** travel to the next area once this area's boss is down */
  autoNextZone?: boolean;
  targeting: Targeting;
  activePassiveProfileId?: number;
  passiveProfiles?: PassiveProfile[];
  /** currencies shown in the top bar, pinned from the Stash (at most 5); none when missing */
  pinnedCurrencies?: string[];
}

export interface PassiveProfile {
  id: number;
  name: string;
  passives: string[];
  masteries: Record<string, number>;
  linkedGearId: number | null;
  linkedSkillId: number | null;
  linkedAtlas: string | null;
  crossLinkGear: boolean;
  crossLinkSkills: boolean;
  crossLinkAtlas: boolean;
}

export interface Lifetime {
  /** Recorded from this update onward; historical death locations were not saved. */
  deathZones?: Record<string, number>;
  kills: number;
  bossKills: number;
  deaths: number;
  itemsLooted: number;
  orbsUsed: number;
  salvaged: number;
  flasksDrunk: number;
  flasksBrewed: number;
  mealsEaten: number;
  mapsDrawn: number;
  itemsSmithed: number;
  gathered: number;
  benchCrafts: number;
  raresFound: number;
  uniquesFound: number;
  /** Exile achievement: Ysolde kills with no unique equipped */
  exileBareKills?: number;
  /** Unbroken achievement: 1 once the Last King falls to a character that has never died */
  act6Deathless?: number;
  /** rare (non-boss) monsters slain */
  rareKills?: number;
  /** highest Doomed Map tier this character has cleared */
  doomedBest?: number;
  /** Unique Map ids this character has cleared */
  uniqueMaps?: string[];
}

export interface CharacterInfo {
  id: string;
  name: string;
  classId: ClassId;
  /** Exile only: the passive tree start node picked at creation */
  startNode?: string;
  /** chosen at creation and fixed from then on; left out for a normal character */
  challenge?: ChallengeFlags;
  createdAt: number;
}

/** Challenge mode toggles, in any mix: see engine/challenge.ts. */
export interface ChallengeFlags {
  /** one death ends the character */
  hardcore?: boolean;
  /** Solo Self-Found: no Player Market, and a stash of its own */
  ssf?: boolean;
  /** no gathering or crafting skills */
  classic?: boolean;
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
 * Which set of hideout, stash and unlocks a character belongs to. Each mix of Hardcore and Classic is a realm with its
 * own AccountState, so it starts fresh, and every Solo Self-Found character is a realm of one. See realmFor.
 */
export type Realm = string;

/** What every character in a realm shares. Saved on its own, never inside a character. See engine/account.ts. */
export interface AccountState {
  id: string;
  realm: Realm;
  /** goes up with every save, so the newest copy can be told from an older one */
  rev: number;
  hideout: Record<string, number>;
  automation: AutomationUnlocks;
  /** from before the War Table sold auto flee and auto challenge: keeps both without the upgrades */
  autosKept?: boolean;
  /** stash pages of gear, STASH_PAGE_SIZE each */
  stash: Item[][];
  /** items that didn't fit when stashes were merged: they can only be taken out */
  overflow: Item[];
  /** the Uniques tab: every stashed unique, with no limit on room */
  uniqueStash: Item[];
  /** every unique id anyone on the account has found, for the Uniques tab's collection */
  uniquesSeen: string[];
  /** gold, currency and materials */
  bank: Record<string, number>;
  /** skill gems not on any character's bar */
  gems: SkillGemInstance[];
  /** loose support gems */
  supportGems: SupportGemInstance[];
  /** spare flasks */
  flaskStash: FlaskInstance[];
  /** the next account uid: see ACCOUNT_UID_BASE */
  nextUid: number;
  exileUnlocked: boolean;
  /** some character on the account has beaten the last act, so the Map Device stays awake for all of them */
  campaignDone?: boolean;
  /** realm-shared map supply (`map_t1`..`map_t10`, `doomed_t1`..`doomed_t5`) */
  maps?: Record<string, number>;
  /** realm-shared Sextant slots on the Map Device */
  sextants?: (SextantSlot | null)[];
  /** realm-shared Atlas progression and allocated nodes */
  atlas?: AtlasState;
  /** characters and accounts already folded in, so none counts twice */
  absorbed: string[];
  /** what's been taken for a market step the server hasn't confirmed yet: see engine/market.ts */
  marketHolds?: MarketHold[];
  /** Stash tab affinities: routes deposited items to the first tab configured for that kind */
  stashAffinities?: Record<number, StashAffinity>;
  /** realm-shared map safety and auto-rolling preferences */
  mapSettings?: MapSettings;
  /**
   * Achievements whose realm reward (Atlas points, stash tabs) has been added. A character earns its own achievements,
   * but these rewards are shared, so each is added once, the first time any character in the realm earns it.
   */
  achievementRewards?: string[];
}

export interface MapSettings {
  /** modifier ids that the player considers deadly and wishes to reroll */
  blockedMods: string[];
  /** whether to automatically spend a Chaos Orb to reroll maps with blocked mods during auto-run or entry */
  autoRerollChaos: boolean;
  /** whether to roll normal maps with random danger & reward affixes */
  rollNormalMaps?: boolean;
}

export type StashAffinity = 'currency' | 'maps' | 'gems' | 'flasks' | 'gear' | 'contraband';

export interface SextantSlot {
  modId: string;
  tier: 'apprentice' | 'journeyman' | 'master';
  charges: number;
}

export interface AtlasState {
  /** tiers (1..10) cleared at least once (+1 pt each) */
  cleared: number[];
  /** tiers (1..10) cleared with all unlocked Sextant slots filled (+1 pt each) */
  slotted: number[];
  /** tiers (1..10) cleared without dying (+1 pt each) */
  deathless: number[];
  /** Doomed Map tiers (1..5) cleared at least once across the realm (+2 pts each) */
  doomedCleared?: number[];
  /** Hard Boss ids cleared at least once across the realm (+3 pts each) */
  hardBossesCleared?: string[];
  /** Uber Boss zone ids cleared at least once across the realm (+5 pts each) */
  uberBossesCleared?: string[];
  /** allocated Atlas node ids */
  nodes: string[];
}

/** An item being listed, or a price being paid, on its way to the Player Market. */
export interface MarketHold {
  /** names the step on the server, so a lost reply can be checked */
  op: string;
  item?: Item;
  currency?: string;
  amount?: number;
}

/** Account data arriving from elsewhere: a pre-account save, a demo, an import. */
export type AccountTransfer = Partial<Pick<AccountState, 'id' | 'hideout' | 'automation' | 'stash' | 'overflow' | 'uniqueStash' | 'uniquesSeen' | 'exileUnlocked' | 'campaignDone' | 'maps' | 'sextants' | 'atlas' | 'mapSettings' | 'achievementRewards'>> & Partial<AccountPool>;

/** The Stash tabs that hold more than gear. */
export type AccountPool = Pick<AccountState, 'bank' | 'gems' | 'supportGems' | 'flaskStash'>;

/** A map being run. Its map is already used up. */
export interface MapRun {
  zoneId: string;
  tier: number;
  /** borrowed campaign area id for visuals and monster roster */
  areaId?: string;
  /** legacy theme field, kept for backward compatibility */
  theme: string;
  /** Doomed Map tier (1..5) and rolled Doomed modifiers when running a Doomed Map */
  doomedTier?: number;
  doomedMods?: import('../data/maps').DoomedModId[];
  /** Unique Map id when running a Unique Map */
  uniqueMapId?: string;
  /** Rolled normal map modifiers */
  normalMods?: string[];
  packsLeft: number;
  packsTotal: number;
  /** pack numbers (1-indexed by packs spawned) that are Elite packs in this run */
  elitePacks?: number[];
  /** whether all unlocked Sextant slots were filled when the run opened */
  slottedFull?: boolean;
  /** active Sextant modifier ids snapshot for this run */
  sextantMods?: string[];
  /** timer for boss arena dangerous ground in T7–8 */
  groundMs?: number;
  /** game clock when it started */
  startedAt: number;
  /** lifetime deaths when it started: a rise means the run ended in one */
  deaths: number;
  bossDown: boolean;
}

export interface MapState {
  /** maps held, synced with the realm's `s.account.maps` */
  stock: Record<string, number>;
  run: MapRun | null;
  /** what auto-run keeps opening */
  auto: { tier: number; doomed?: boolean; theme?: string } | null;
  /** running totals, to judge a loop by; runs and clearMs count finished maps */
  tally: { runs: number; clearMs: number; mapsFound: number; favoured: number };
  /** highest normal map tier cleared */
  highestTier?: number;
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

export interface TreeProfile {
  id: string; // 'profile_1' | 'profile_2' | 'profile_3'
  name: string;
  passives: string[];
  masteries: Record<string, number>;
  linkedEquipment?: number; // 0, 1, 2 (index of equipment loadout)
  linkedAtlas?: string;     // atlas profile id
  linkedSkilling?: string;  // skilling profile id
}

export interface GameState {
  version: number;
  /** the shared account block; a running game holds the live one, and saves leave it out */
  account: AccountState;
  /** account data this character still has to hand over (see settleCharacter) */
  unmerged?: AccountTransfer;
  /** currency, materials, gems and flasks this character still has to hand over (see settleCharacter) */
  unpooled?: Partial<AccountPool>;
  /** from before the skill reform: The Old Covenant waits to be handed over */
  keepsakeDue?: boolean;
  character: CharacterInfo;
  /** a Hardcore character has died here: nothing runs again, and the game deletes it */
  fallen?: { zoneId: string | null; offline: boolean };
  tutorial: TutorialState;
  nextUid: number;
  skills: Record<SkillId, number>;
  /** Character-owned nominal work practiced in explicitly authored non-combat bands. */
  skillingMastery: Record<string, number>;
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
  loadouts: Loadouts;
  action: Action;
  life: number;
  mana: number;
  /** energy shield: soaks damage before life and recharges once you stop being hit */
  es: number;
  combat: CombatRuntime | null;
  zoneKills: Record<string, number>;
  unlockedZones: string[];
  /** Unspent character-tree currency for roads and Cosmic Gateways. */
  travelPoints: number;
  /** Unspent character-tree currency for combat passives and keystones. */
  passivePoints: number;
  /** Unspent character-tree currency for mastery choices. */
  masteryPoints: number;
  /** Last character level whose tree-point awards were credited. */
  passivePointLevel: number | null;
  /** Act quest-boss point awards already credited. */
  passiveQuestPoints: number | null;
  /** Version tracking for the 5x passive tree overhaul reset */
  characterTreeOverhaul?: number;
  passives: string[];
  /** chosen bonus (0–2) for each allocated mastery */
  masteries: Record<string, number>;
  ascendancy: AscendancyState;
  /** allocated skilling-tree nodes */
  skillPassives: string[];
  /** Passive tree loadout profiles (1–3) */
  passiveProfiles: TreeProfile[];
  activePassiveProfile: string;
  /** Atlas tree loadout profiles (1–3) */
  atlasProfiles: TreeProfile[];
  activeAtlasProfile: string;
  /** Life skills tree loadout profiles (1–3) */
  skillingProfiles: TreeProfile[];
  activeSkillingProfile: string;
  /** campaign act progression */
  campaign?: { act: number };
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
  | { t: 'loot'; item?: Item; currencyId?: string; qty?: number; salvaged?: boolean; gemId?: string; supportId?: string; flask?: FlaskInstance; filterSound?: boolean }
  | { t: 'levelup'; skill: SkillId; level: number }
  | { t: 'xp'; skill: SkillId; amount: number }
  | { t: 'produce'; skill: SkillId; outputs: Record<string, number>; baseId?: string }
  | { t: 'salvage'; count: number }
  | { t: 'stationUpgraded'; id: StationId; level: number }
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
