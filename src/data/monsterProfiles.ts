import type { MonsterDef } from './zones';
import type { DamageType } from '../engine/types';

export type MonsterArchetype = 'brute' | 'ice_golem' | 'armoured' | 'duelist' | 'swarm' | 'venom' | 'spectral' | 'caster' | 'beast';

export interface MonsterProfile {
  name: string;
  /** Fraction prevented against the reference physical hit, using player Armour math. */
  armour: number;
  evasion: number;
  es: number;
  block: number;
  spellBlock: number;
  interval: number;
  crit: number;
  /** Share of the old sustained damage budget moved from the hit to an ailment. */
  dot: number;
  ailment?: 'poison' | 'bleed' | 'burn';
  element?: DamageType;
}

export const MONSTER_PROFILES: Record<MonsterArchetype, MonsterProfile> = {
  brute: { name: 'Heavy brute', armour: 0.18, evasion: 0.45, es: 0, block: 0, spellBlock: 0, interval: 1.35, crit: 0, dot: 0 },
  ice_golem: { name: 'Glacial juggernaut', armour: 0.35, evasion: 0.35, es: 0.12, block: 0, spellBlock: 0, interval: 1.5, crit: 0, dot: 0, element: 'cold' },
  armoured: { name: 'Armoured guardian', armour: 0.3, evasion: 0.7, es: 0, block: 15, spellBlock: 5, interval: 1.15, crit: 0, dot: 0 },
  duelist: { name: 'Evasive fighter', armour: 0.05, evasion: 2.2, es: 0, block: 10, spellBlock: 0, interval: 0.75, crit: 8, dot: 0.12, ailment: 'bleed' },
  swarm: { name: 'Frail swarmer', armour: 0, evasion: 0.5, es: 0, block: 0, spellBlock: 0, interval: 0.5, crit: 0, dot: 0 },
  venom: { name: 'Venom swarmer', armour: 0, evasion: 0.4, es: 0, block: 0, spellBlock: 0, interval: 0.45, crit: 0, dot: 0.25, ailment: 'poison', element: 'chaos' },
  spectral: { name: 'Shielded spirit', armour: 0, evasion: 1.3, es: 0.6, block: 0, spellBlock: 10, interval: 0.9, crit: 5, dot: 0 },
  caster: { name: 'Arcane caster', armour: 0.04, evasion: 0.7, es: 0.35, block: 0, spellBlock: 10, interval: 1.05, crit: 5, dot: 0 },
  beast: { name: 'Raking beast', armour: 0.08, evasion: 1.5, es: 0, block: 0, spellBlock: 0, interval: 0.8, crit: 5, dot: 0.12, ailment: 'bleed' },
};

/** Stable identities follow the creature, including copies borrowed by Maps and boss summons. */
export function monsterArchetype(def: MonsterDef): MonsterArchetype {
  if (def.archetype) return def.archetype;
  const words = `${def.id} ${def.name} ${def.basic.name}`.toLowerCase();
  if (/spider|scorpion|venom|serpent|viper|adder|maggot|centipede/.test(words)) return 'venom';
  if (/golem|colossus/.test(words) && /ice|frost|rime|glacial|crystal/.test(words)) return 'ice_golem';
  if (/golem|giant|colossus|treant|ogre|troll|maul|boulder/.test(words)) return 'brute';
  if (/wisp|wraith|spirit|spectre|ghost|phantom|shade/.test(words)) return 'spectral';
  if (/knight|guard|warden|sentinel|soldier|legion|crab|shell|golem/.test(words)) return 'armoured';
  if (/rat|bat|mite|swarm|scarab|beetle|moth|fly|insect/.test(words)) return 'swarm';
  if (def.basic.kind === 'spell') return 'caster';
  if (/wolf|hound|bear|boar|hawk|harpy|lion|beast|talon|claw|fang/.test(words)) return 'beast';
  return 'duelist';
}
