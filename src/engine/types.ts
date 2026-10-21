import type { ClassId } from '../data/classes';

export type SkillId = 'combat' | 'mining' | 'woodcutting' | 'harvesting' | 'smithing' | 'alchemy';
export const SKILL_IDS: SkillId[] = ['combat', 'mining', 'woodcutting', 'harvesting', 'smithing', 'alchemy'];

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
  | 'jewellery';

export type StatKey =
  | 'life'
  | 'lifePct'
  | 'lifeMore'
  | 'lifeRegen'
  | 'lifeRegenPct'
  | 'lifeLeech'
  | 'physMin'
  | 'physMax'
  | 'physPct'
  | 'fireMin'
  | 'fireMax'
  | 'coldMin'
  | 'coldMax'
  | 'lightMin'
  | 'lightMax'
  | 'elemPct'
  | 'attackSpeedPct'
  | 'attackSpeedMore'
  | 'critChancePct'
  | 'critMulti'
  | 'armour'
  | 'armourPct'
  | 'armourMore'
  | 'evasion'
  | 'evasionPct'
  | 'fireRes'
  | 'coldRes'
  | 'lightRes'
  | 'allRes'
  | 'itemRarity'
  | 'skillSpeed'
  | 'skillXp'
  | 'flaskEffect'
  | 'flaskCharges'
  | 'str'
  | 'dex'
  | 'int'
  | 'allAttr'
  | 'accuracy'
  | 'mana'
  | 'manaPct'
  | 'manaRegenPct';

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

export interface FlaskInstance {
  uid: number;
  flaskId: string;
  charges: number;
  instill: InstillCondition | null;
}

export interface MonsterInstance {
  defId: string;
  name: string;
  level: number;
  maxLife: number;
  life: number;
  damage: number;
  dmgType: DamageType;
  attackMs: number;
  attackTimer: number;
  isBoss: boolean;
  /** boss slam: ms until next cast starts */
  slamTimer: number;
  /** remaining cast time in ms, or -1 when not casting */
  casting: number;
}

export interface Buff {
  flaskId: string;
  remainingMs: number;
}

export interface HealOverTime {
  resource: 'life' | 'mana';
  perMs: number;
  remainingMs: number;
}

export interface CombatRuntime {
  zoneId: string;
  monster: MonsterInstance | null;
  spawnMs: number;
  attackTimer: number;
  buffs: Buff[];
  heals: HealOverTime[];
}

export type Action =
  | { kind: 'skill'; actionId: string; progress: number }
  | { kind: 'combat'; zoneId: string }
  | null;

export interface VendorOffer {
  id: number;
  kind: 'item' | 'flask' | 'currency';
  item?: Item;
  flaskId?: string;
  currencyId?: string;
  qty?: number;
  price: number;
}

export interface Settings {
  autoSalvage: Record<Rarity, boolean>;
  reducedMotion: boolean;
}

export interface Lifetime {
  kills: number;
  bossKills: number;
  deaths: number;
  itemsLooted: number;
  orbsUsed: number;
}

export interface CharacterInfo {
  id: string;
  name: string;
  classId: ClassId;
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
  flaskStash: FlaskInstance[];
  action: Action;
  life: number;
  mana: number;
  combat: CombatRuntime | null;
  zoneKills: Record<string, number>;
  unlockedZones: string[];
  passives: string[];
  hideout: Record<string, number>;
  vendor: { stock: VendorOffer[]; refreshAt: number };
  settings: Settings;
  lifetime: Lifetime;
  /** total game time simulated, ms */
  clock: number;
  lastSaved: number;
}

export type GameEvent =
  | { t: 'hit'; target: 'player' | 'monster'; amount: number; crit?: boolean; dmgType: DamageType; evaded?: boolean }
  | { t: 'kill'; name: string; boss: boolean }
  | { t: 'spawn'; name: string; boss: boolean }
  | { t: 'death'; xpLost: number }
  | { t: 'loot'; item?: Item; currencyId?: string; qty?: number; salvaged?: boolean }
  | { t: 'levelup'; skill: SkillId; level: number }
  | { t: 'xp'; skill: SkillId; amount: number }
  | { t: 'produce'; skill: SkillId; outputs: Record<string, number> }
  | { t: 'craft'; text: string; uid: number; orbId?: string }
  | { t: 'equip'; uid: number }
  | { t: 'allocate'; nodeId: string }
  | { t: 'combatStart'; zoneId: string }
  | { t: 'tutorialStep'; step: number; done: boolean }
  | { t: 'flask'; slot: number; flaskId: string; auto: boolean }
  | { t: 'bossCast'; name: string }
  | { t: 'zoneUnlocked'; zoneId: string }
  | { t: 'info'; text: string; tone?: 'warn' | 'good' };
