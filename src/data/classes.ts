import type { EquipSlot, StatKey } from '../engine/types';

export type ClassId = 'warrior' | 'ranger' | 'mage';

export interface ClassDef {
  id: ClassId;
  name: string;
  attribute: 'Strength' | 'Dexterity' | 'Intelligence';
  region: 'str' | 'dex' | 'int';
  /** passive tree node the class starts from */
  startNode: string;
  color: string;
  icon: string;
  tagline: string;
  desc: string;
  kit: Partial<Record<EquipSlot, string>>;
  bonus: Partial<Record<StatKey, number>>;
  bonusText: string[];
}

export const CLASSES: ClassDef[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    attribute: 'Strength',
    region: 'str',
    startNode: 'class_str',
    color: '#d0574a',
    icon: 'combat',
    tagline: 'Outlast everything.',
    desc: 'A brawler who wears heavy plate and wins by simply refusing to fall. The most forgiving start for idle play.',
    kit: { weapon: 'rusted_sword', body: 'plate_vest', helmet: 'iron_hat' },
    bonus: { life: 20, armourPct: 10 },
    bonusText: ['+20 to maximum Life', '10% increased Armour'],
  },
  {
    id: 'ranger',
    name: 'Ranger',
    attribute: 'Dexterity',
    region: 'dex',
    startNode: 'class_dex',
    color: '#5fbf6a',
    icon: 'target',
    tagline: 'Strike first, never get hit.',
    desc: 'Quick blades and quicker feet. Evades blows and stacks attack speed and critical strikes.',
    kit: { weapon: 'whittled_dagger', body: 'shabby_jerkin', boots: 'leather_boots' },
    bonus: { attackSpeedPct: 6, evasionPct: 10 },
    bonusText: ['6% increased Attack Speed', '10% increased Evasion Rating'],
  },
  {
    id: 'mage',
    name: 'Mage',
    attribute: 'Intelligence',
    region: 'int',
    startNode: 'class_int',
    color: '#5f8de0',
    icon: 'bolt',
    tagline: 'Bend the elements and the brew.',
    desc: 'Channels lightning through a wand and gets the most out of flasks. Fragile early, explosive later.',
    kit: { weapon: 'driftwood_wand', body: 'shabby_jerkin', amulet: 'coral_amulet' },
    bonus: { elemPct: 15, flaskEffect: 10 },
    bonusText: ['15% increased Elemental Damage', '10% increased Flask Effect'],
  },
];

export function classDef(id: ClassId): ClassDef {
  return CLASSES.find((c) => c.id === id) ?? CLASSES[0];
}
