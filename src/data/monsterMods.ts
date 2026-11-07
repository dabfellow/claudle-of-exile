import type { DamageType } from '../engine/types';

export type MonsterModId =
  | 'stalwart' | 'deadly' | 'frenzied' | 'resistant' | 'regenerating' | 'accurate'
  | 'vampiric' | 'sentinel' | 'flame_touched' | 'frost_touched' | 'storm_touched' | 'void_touched';

export interface MonsterModDef {
  id: MonsterModId;
  name: string;
  desc: string;
  minLevel?: number;
  /** Two mods from the same group cannot appear on one rare. */
  group: 'life' | 'offence' | 'speed' | 'defence' | 'sustain' | 'accuracy' | 'element';
  life?: number;
  damage?: number;
  attackSpeed?: number;
  moveSpeed?: number;
  allRes?: number;
  regenPct?: number;
  evasionPen?: number;
  leechPct?: number;
  areaTaken?: number;
  damageType?: DamageType;
}

/** Short, legible PoE-style threats rather than extra boss mechanics. */
export const MONSTER_MODS: MonsterModDef[] = [
  { id: 'stalwart', name: 'Stalwart', desc: '70% more Life', group: 'life', life: 1.7 },
  { id: 'deadly', name: 'Deadly', desc: '35% more Damage', group: 'offence', damage: 1.35 },
  { id: 'frenzied', name: 'Frenzied', desc: '30% faster attacks and movement', group: 'speed', attackSpeed: 1.3, moveSpeed: 0.7 },
  { id: 'resistant', name: 'Resistant', desc: '+35% to all Resistances', group: 'defence', allRes: 35 },
  { id: 'regenerating', name: 'Regenerating', desc: 'Regenerates 1% of Life per second', minLevel: 8, group: 'sustain', regenPct: 1 },
  { id: 'accurate', name: 'Accurate', desc: 'Penetrates 40% of Evasion', minLevel: 8, group: 'accuracy', evasionPen: 40 },
  { id: 'vampiric', name: 'Vampiric', desc: 'Leeches 25% of Damage as Life', minLevel: 16, group: 'sustain', leechPct: 25 },
  { id: 'sentinel', name: 'Sentinel', desc: 'Takes 50% less area, chain and piercing damage', minLevel: 16, group: 'defence', areaTaken: 0.5 },
  { id: 'flame_touched', name: 'Flame-touched', desc: 'Deals Fire Damage and 25% more Damage', minLevel: 8, group: 'element', damage: 1.25, damageType: 'fire' },
  { id: 'frost_touched', name: 'Frost-touched', desc: 'Deals Cold Damage and 25% more Damage', minLevel: 8, group: 'element', damage: 1.25, damageType: 'cold' },
  { id: 'storm_touched', name: 'Storm-touched', desc: 'Deals Lightning Damage and 25% more Damage', minLevel: 8, group: 'element', damage: 1.25, damageType: 'light' },
  { id: 'void_touched', name: 'Void-touched', desc: 'Deals Chaos Damage and 20% more Damage', minLevel: 25, group: 'element', damage: 1.2, damageType: 'chaos' },
];

const BY_ID = new Map(MONSTER_MODS.map((m) => [m.id, m]));

export function monsterMod(id: MonsterModId): MonsterModDef {
  return BY_ID.get(id)!;
}
