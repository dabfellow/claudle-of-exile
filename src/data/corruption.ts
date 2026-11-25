import type { StatKey } from '../engine/types';

export const VALOR_ORB = 'valor';
export const CORRUPTED_ITEM = 'Corrupted gear cannot be modified';
export const VALOR_DROP_CHANCE = 0.02;
export const VALOR_SOURCE = `Final Map bosses (${VALOR_DROP_CHANCE * 100}% chance)`;

const bonus = (stat: StatKey, min: number, max: number, text: string) => ({ stat, min, max, text });

export const CORRUPTION_IMPLICITS = {
  gems: bonus('corruptionGemLevels', 1, 1, '+{0} to Level of Active Skill Gems'),
  life: bonus('lifePct', 10, 10, '{0}% increased Maximum Life'),
  attributes: bonus('corruptionAllAttrPct', 10, 10, '{0}% increased Attributes'),
  strength: bonus('corruptionStrPct', 15, 15, '{0}% increased Strength'),
  dexterity: bonus('corruptionDexPct', 15, 15, '{0}% increased Dexterity'),
  intelligence: bonus('corruptionIntPct', 15, 15, '{0}% increased Intelligence'),
  fireDamage: bonus('firePct', 20, 25, '{0}% increased Fire Damage'),
  coldDamage: bonus('coldPct', 20, 25, '{0}% increased Cold Damage'),
  lightningDamage: bonus('lightPct', 20, 25, '{0}% increased Lightning Damage'),
  fireResist: bonus('fireRes', 20, 25, '+{0}% to Fire Resistance'),
  coldResist: bonus('coldRes', 20, 25, '+{0}% to Cold Resistance'),
  lightningResist: bonus('lightRes', 20, 25, '+{0}% to Lightning Resistance'),
  allResist: bonus('allRes', 15, 15, '+{0}% to all Elemental Resistances'),
};

export type CorruptionImplicitId = keyof typeof CORRUPTION_IMPLICITS;
