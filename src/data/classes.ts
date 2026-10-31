import type { EquipSlot, StatKey } from '../engine/types';
import type { ClassRegion, Mechanic } from './passiveTree';

export type ClassId = 'warrior' | 'ranger' | 'mage' | 'duelist' | 'templar' | 'shadow' | 'exile';

export interface ClassDef {
  id: ClassId;
  name: string;
  attribute: string;
  region: ClassRegion;
  /** the class's own combat mechanic (docs/design/CLASSES.md); the Exile has none */
  mechanic: Mechanic | null;
  /** challenge class: picks any start node, unlocked by an Act 1 clear */
  challenge?: boolean;
  /** one line for the class card and the combat meter */
  mechanicText: string;
  /** passive tree node the class starts from */
  startNode: string;
  color: string;
  icon: string;
  tagline: string;
  desc: string;
  kit: Partial<Record<EquipSlot, string>>;
  /** starting Strength / Dexterity / Intelligence */
  baseAttributes: { str: number; dex: number; int: number };
  bonus: Partial<Record<StatKey, number>>;
  bonusText: string[];
  /** skill gems on the bar at the start */
  starterGems: string[];
}

export const CLASSES: ClassDef[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    attribute: 'Strength',
    region: 'str',
    mechanic: 'rage',
    mechanicText: 'Rage: each hit you deal grants 1 Rage (max 20). Each Rage is 1% more attack damage and 2% increased Armour. Decays between packs.',
    startNode: 'class_str',
    color: '#d0574a',
    icon: 'combat',
    tagline: 'Outlast everything.',
    desc: 'A brawler who wears heavy plate and wins by simply refusing to fall. The most forgiving start for idle play.',
    kit: { weapon: 'rusted_sword', body: 'plate_vest', helmet: 'iron_hat' },
    baseAttributes: { str: 20, dex: 12, int: 10 },
    bonus: { life: 20, armourPct: 10 },
    bonusText: ['+20 to maximum Life', '10% increased Armour'],
    starterGems: ['heavy_strike', 'iron_guard'],
  },
  {
    id: 'ranger',
    name: 'Ranger',
    attribute: 'Dexterity',
    region: 'dex',
    mechanic: 'momentum',
    mechanicText: 'Momentum: each attack grants 1 Momentum (max 10), 3% increased Attack Speed each. Taking a hit halves it.',
    startNode: 'class_dex',
    color: '#5fbf6a',
    icon: 'target',
    tagline: 'Strike first, never get hit.',
    desc: 'Quick blades and quicker feet. Evades blows and stacks attack speed and critical strikes.',
    kit: { weapon: 'whittled_dagger', body: 'shabby_jerkin', boots: 'leather_boots' },
    baseAttributes: { str: 12, dex: 20, int: 10 },
    bonus: { attackSpeedPct: 6, evasionPct: 10 },
    bonusText: ['6% increased Attack Speed', '10% increased Evasion Rating'],
    starterGems: ['twin_strike', 'smoke_step'],
  },
  {
    id: 'mage',
    name: 'Mage',
    attribute: 'Intelligence',
    region: 'int',
    mechanic: 'manaPower',
    mechanicText: 'Mana is Power: spells deal up to 30% more damage the fuller your mana is.',
    startNode: 'class_int',
    color: '#5f8de0',
    icon: 'bolt',
    tagline: 'Bend the elements and the brew.',
    desc: 'Channels lightning through a wand and gets the most out of flasks. Fragile early, explosive later.',
    kit: { weapon: 'driftwood_wand', body: 'simple_robe', amulet: 'coral_amulet' },
    baseAttributes: { str: 10, dex: 12, int: 20 },
    bonus: { elemPct: 15, flaskEffect: 10 },
    bonusText: ['15% increased Elemental Damage', '10% increased Flask Effect'],
    starterGems: ['spark', 'frost_ward'],
  },
  {
    id: 'duelist',
    name: 'Duelist',
    attribute: 'Strength & Dexterity',
    region: 'duelist',
    mechanic: 'riposte',
    mechanicText: 'Riposte: when you block or evade a hit, counter-attack for 100% weapon damage (at most once per 0.5s).',
    startNode: 'class_strdex',
    color: '#d39a4a',
    icon: 'weapon',
    tagline: 'Answer every blow.',
    desc: 'A sword fighter who wears both plate and leather and turns every parried blow into a counter-attack.',
    kit: { weapon: 'rusted_sword', body: 'shabby_jerkin', helmet: 'iron_hat' },
    baseAttributes: { str: 17, dex: 17, int: 8 },
    bonus: { evasionPct: 10, blockChance: 5 },
    bonusText: ['10% increased Evasion Rating', '5% chance to Block hits'],
    starterGems: ['twin_strike', 'iron_guard'],
  },
  {
    id: 'templar',
    name: 'Templar',
    attribute: 'Strength & Intelligence',
    region: 'templar',
    mechanic: 'martyr',
    mechanicText: 'Martyr: hits you take fill Fervor. When full, a holy nova heals 20% of your Life and strikes every enemy with lightning.',
    startNode: 'class_strint',
    color: '#c98fd6',
    icon: 'heart',
    tagline: 'Every wound is a prayer.',
    desc: 'A holy warrior in plate who gets stronger the harder the fight. Bosses fill Fervor fastest.',
    kit: { weapon: 'oak_club', body: 'plate_vest', helmet: 'linen_hood' },
    baseAttributes: { str: 17, dex: 8, int: 17 },
    bonus: { elemPct: 15, allRes: 8 },
    bonusText: ['15% increased Elemental Damage', '+8% to all Elemental Resistances'],
    starterGems: ['heavy_strike', 'frost_ward'],
  },
  {
    id: 'shadow',
    name: 'Shadow',
    attribute: 'Dexterity & Intelligence',
    region: 'shadow',
    mechanic: 'malice',
    mechanicText: 'Malice: every non-critical hit adds 1 Malice (max 15). At full, your next hit is a Coup de Grâce: a Mega Crit. A normal crit empties the meter.',
    startNode: 'class_dexint',
    color: '#5fb8b0',
    icon: 'skull',
    tagline: 'Patience, then the knife.',
    desc: 'A poisoner who waits for the perfect moment. Build for low crit to land Coup de Grâce often, or high crit for steady damage.',
    kit: { weapon: 'whittled_dagger', body: 'shabby_jerkin', helmet: 'linen_hood' },
    baseAttributes: { str: 8, dex: 17, int: 17 },
    bonus: { ailmentPct: 20, evasionPct: 10 },
    bonusText: ['20% increased damage with ailments', '10% increased Evasion Rating'],
    starterGems: ['poison_dart', 'spark'],
  },
  {
    id: 'exile',
    name: 'Exile',
    attribute: 'None',
    region: 'str',
    mechanic: null,
    mechanicText: 'No class mechanic.',
    startNode: 'class_str',
    color: '#a39a8a',
    icon: 'name',
    tagline: 'Washed ashore with nothing.',
    desc: "A challenge class. No mechanic, no class bonus, no armour. Start from any class's spot on the tree with only a Rusted Sword and that class's starter gems.",
    kit: { weapon: 'rusted_sword' },
    baseAttributes: { str: 10, dex: 10, int: 10 },
    bonus: {},
    bonusText: [],
    starterGems: [],
    challenge: true,
  },
];

export function classDef(id: ClassId): ClassDef {
  return CLASSES.find((c) => c.id === id) ?? CLASSES[0];
}

/** The class whose tree start an Exile picked (or the class itself for everyone else). */
export function startClass(id: ClassId, startNode?: string): ClassDef {
  if (id !== 'exile') return classDef(id);
  return CLASSES.find((c) => !c.challenge && c.startNode === startNode) ?? CLASSES[0];
}
