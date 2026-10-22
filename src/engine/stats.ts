import { affixDef } from '../data/affixes';
import { classDef } from '../data/classes';
import { baseDef } from '../data/bases';
import { flaskDef } from '../data/flasks';
import { MAP_RARITY } from '../data/hideout';
import { PASSIVE_BY_ID } from '../data/passiveTree';
import type { Buff, DamageType, GameState, Item, StatKey, Stats } from './types';
import { characterLevel } from './character';

const STAT_KEYS: StatKey[] = [
  'life', 'lifePct', 'lifeMore', 'lifeRegen', 'lifeRegenPct', 'lifeLeech',
  'physMin', 'physMax', 'physPct', 'fireMin', 'fireMax', 'coldMin', 'coldMax', 'lightMin', 'lightMax', 'elemPct',
  'attackSpeedPct', 'attackSpeedMore', 'critChancePct', 'critMulti',
  'armour', 'armourPct', 'armourMore', 'evasion', 'evasionPct',
  'fireRes', 'coldRes', 'lightRes', 'allRes',
  'itemRarity', 'skillSpeed', 'skillXp', 'flaskEffect', 'flaskCharges',
  'str', 'dex', 'int', 'allAttr', 'accuracy', 'mana', 'manaPct', 'manaRegenPct', 'castSpeedPct',
];

export function emptyStats(): Stats {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Stats;
}

export function addStats(into: Stats, from: Partial<Record<StatKey, number>>, mult = 1): void {
  for (const [k, v] of Object.entries(from)) into[k as StatKey] += (v ?? 0) * mult;
}

/** Stat contributions of one item's implicits and mods (not base defences). */
export function itemStats(item: Item): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = {};
  const add = (k: StatKey, v: number) => (out[k] = (out[k] ?? 0) + v);
  const base = baseDef(item.baseId);
  for (const imp of base.implicits ?? []) add(imp.stat, imp.value);
  for (const m of [...item.prefixes, ...item.suffixes]) {
    const a = affixDef(m.affixId);
    a.stats.forEach((k, i) => add(k, m.values[i] ?? 0));
  }
  return out;
}

export function passiveStats(ids: string[]): Stats {
  const st = emptyStats();
  for (const id of ids) {
    const n = PASSIVE_BY_ID[id];
    if (n) addStats(st, n.stats);
  }
  return st;
}

export interface Attributes {
  str: number;
  dex: number;
  int: number;
}

export interface Derived {
  raw: Stats;
  combatLevel: number;
  attributes: Attributes;
  accuracy: number;
  maxLife: number;
  lifeRegen: number;
  maxMana: number;
  manaRegen: number;
  armour: number;
  evasion: number;
  hit: Record<DamageType, [number, number]>;
  /** increased-damage multipliers, for spells and skills that don't use weapon hits */
  physMult: number;
  elemMult: number;
  attacksPerSec: number;
  critChance: number;
  critMulti: number;
  res: { fire: number; cold: number; light: number };
  leechPct: number;
  itemRarity: number;
  skillSpeed: number;
  skillXp: number;
  flaskEffect: number;
  flaskCharges: number;
  avgHit: number;
  dps: number;
}

export const RES_CAP = 75;
/** everyone regenerates this % of max life per second */
export const BASE_REGEN_PCT = 0.5;
/** % of max mana regenerated per second before modifiers */
export const BASE_MANA_REGEN_PCT = 4;
/** global pacing knob: scales every player attack rate */
export const PLAYER_SPEED_SCALE = 0.65;

/** What each attribute point grants (shown in tooltips too). */
export const ATTRIBUTE_EFFECTS = {
  str: { lifePer: 0.5, physPctPer: 0.2 },
  dex: { accuracyPer: 2, evasionPctPer: 0.2 },
  int: { manaPer: 0.5, elemPctPer: 0.2 },
};

/** Raw stat totals from gear, passives, hideout and active flask buffs. */
export function rawStats(s: GameState, buffs: Buff[] = s.combat?.buffs ?? []): Stats {
  const st = emptyStats();
  for (const item of Object.values(s.equipment)) {
    if (!item) continue;
    const base = baseDef(item.baseId);
    if (base.slot !== 'weapon') {
      st.armour += base.armour ?? 0;
      st.evasion += base.evasion ?? 0;
    }
    addStats(st, itemStats(item));
  }
  addStats(st, passiveStats(s.passives));
  const cls = classDef(s.character.classId);
  addStats(st, cls.baseAttributes);
  addStats(st, cls.bonus);
  st.itemRarity += MAP_RARITY[(s.hideout.map_device ?? 1) - 1] ?? 0;

  const flaskMult = 1 + st.flaskEffect / 100;
  for (const b of buffs) {
    if (b.source === 'flask') {
      const def = flaskDef(b.id);
      if (def.buff) addStats(st, def.buff, flaskMult * (b.mult ?? 1));
    } else if (b.stats) addStats(st, b.stats);
  }
  return st;
}

export function deriveStats(s: GameState, buffs?: Buff[]): Derived {
  const raw = rawStats(s, buffs);
  const combatLevel = characterLevel(s);
  const weapon = s.equipment.weapon ? baseDef(s.equipment.weapon.baseId) : null;

  const attributes: Attributes = {
    str: Math.round(raw.str + raw.allAttr),
    dex: Math.round(raw.dex + raw.allAttr),
    int: Math.round(raw.int + raw.allAttr),
  };
  const A = ATTRIBUTE_EFFECTS;

  const maxLife = Math.max(
    1,
    Math.round(
      (60 + 12 * (combatLevel - 1) + raw.life + attributes.str * A.str.lifePer) * (1 + raw.lifePct / 100) * (1 + raw.lifeMore / 100),
    ),
  );
  const maxMana = Math.max(
    0,
    Math.round((30 + 6 * (combatLevel - 1) + raw.mana + attributes.int * A.int.manaPer) * (1 + raw.manaPct / 100)),
  );
  const armour = Math.round(raw.armour * (1 + raw.armourPct / 100) * (1 + raw.armourMore / 100));
  const evasion = Math.round(raw.evasion * (1 + (raw.evasionPct + attributes.dex * A.dex.evasionPctPer) / 100));
  const accuracy = Math.round(2 * combatLevel + raw.accuracy + attributes.dex * A.dex.accuracyPer);

  const wPhys = weapon?.phys ?? [2, 5];
  const physMult = 1 + (raw.physPct + attributes.str * A.str.physPctPer) / 100;
  const elemMult = 1 + (raw.elemPct + attributes.int * A.int.elemPctPer) / 100;
  const hit: Record<DamageType, [number, number]> = {
    phys: [Math.round((wPhys[0] + raw.physMin) * physMult), Math.round((wPhys[1] + raw.physMax) * physMult)],
    fire: [Math.round(raw.fireMin * elemMult), Math.round(raw.fireMax * elemMult)],
    cold: [Math.round(raw.coldMin * elemMult), Math.round(raw.coldMax * elemMult)],
    light: [Math.round(raw.lightMin * elemMult), Math.round(raw.lightMax * elemMult)],
  };
  const attacksPerSec =
    (weapon?.aps ?? 1.2) * (1 + raw.attackSpeedPct / 100) * (1 + raw.attackSpeedMore / 100) * PLAYER_SPEED_SCALE;
  const critChance = Math.min(95, (weapon?.crit ?? 5) * (1 + raw.critChancePct / 100));
  const critMulti = 150 + raw.critMulti;
  const cap = (v: number) => Math.min(RES_CAP, v + raw.allRes);
  const avgHit = Object.values(hit).reduce((a, [lo, hi]) => a + (lo + hi) / 2, 0);
  const critFactor = 1 + (critChance / 100) * (critMulti / 100 - 1);

  return {
    raw,
    combatLevel,
    attributes,
    accuracy,
    maxLife,
    lifeRegen: raw.lifeRegen + (maxLife * (BASE_REGEN_PCT + raw.lifeRegenPct)) / 100,
    maxMana,
    manaRegen: ((maxMana * BASE_MANA_REGEN_PCT) / 100) * (1 + raw.manaRegenPct / 100),
    armour,
    evasion,
    hit,
    physMult,
    elemMult,
    attacksPerSec,
    critChance,
    critMulti,
    res: { fire: cap(raw.fireRes), cold: cap(raw.coldRes), light: cap(raw.lightRes) },
    leechPct: raw.lifeLeech,
    itemRarity: raw.itemRarity,
    skillSpeed: raw.skillSpeed,
    skillXp: raw.skillXp,
    flaskEffect: raw.flaskEffect,
    flaskCharges: raw.flaskCharges,
    avgHit,
    dps: avgHit * attacksPerSec * critFactor * hitChance(accuracy, combatLevel),
  };
}

/** Fraction of a physical hit prevented by armour (PoE formula, capped at 90%). */
export function armourReduction(armour: number, damage: number): number {
  if (armour <= 0 || damage <= 0) return 0;
  return Math.min(0.9, armour / (armour + 5 * damage));
}

export function evadeChance(evasion: number, monsterLevel: number): number {
  if (evasion <= 0) return 0;
  const accuracy = 40 + monsterLevel * 18;
  return Math.min(0.75, evasion / (evasion + accuracy * 2.5));
}

export function monsterEvasion(level: number): number {
  return 30 + level * 12;
}

/** PoE-style chance to hit a monster of the given level, clamped to 60–95%. */
export function hitChance(accuracy: number, monsterLevel: number): number {
  const eva = monsterEvasion(monsterLevel);
  const raw = (1.25 * accuracy) / (accuracy + Math.pow(eva * 0.2, 0.9));
  return Math.min(0.95, Math.max(0.6, raw));
}
