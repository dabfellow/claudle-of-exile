import { affixDef } from '../data/affixes';
import { classDef } from '../data/classes';
import { baseDef } from '../data/bases';
import { flaskDef } from '../data/flasks';
import { MAP_RARITY } from '../data/hideout';
import { PASSIVE_BY_ID } from '../data/passiveTree';
import type { Buff, DamageType, GameState, Item, StatKey, Stats } from './types';
import { levelForXp } from './xp';

const STAT_KEYS: StatKey[] = [
  'life', 'lifePct', 'lifeMore', 'lifeRegen', 'lifeRegenPct', 'lifeLeech',
  'physMin', 'physMax', 'physPct', 'fireMin', 'fireMax', 'coldMin', 'coldMax', 'lightMin', 'lightMax', 'elemPct',
  'attackSpeedPct', 'attackSpeedMore', 'critChancePct', 'critMulti',
  'armour', 'armourPct', 'armourMore', 'evasion', 'evasionPct',
  'fireRes', 'coldRes', 'lightRes', 'allRes',
  'itemRarity', 'skillSpeed', 'skillXp', 'flaskEffect', 'flaskCharges',
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

export interface Derived {
  raw: Stats;
  combatLevel: number;
  maxLife: number;
  lifeRegen: number;
  armour: number;
  evasion: number;
  hit: Record<DamageType, [number, number]>;
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
export const BASE_REGEN_PCT = 2;

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
  addStats(st, classDef(s.character.classId).bonus);
  st.itemRarity += MAP_RARITY[(s.hideout.map_device ?? 1) - 1] ?? 0;

  const flaskMult = 1 + st.flaskEffect / 100;
  for (const b of buffs) {
    const def = flaskDef(b.flaskId);
    if (def.buff) addStats(st, def.buff, flaskMult);
  }
  return st;
}

export function deriveStats(s: GameState, buffs?: Buff[]): Derived {
  const raw = rawStats(s, buffs);
  const combatLevel = levelForXp(s.skills.combat);
  const weapon = s.equipment.weapon ? baseDef(s.equipment.weapon.baseId) : null;

  const maxLife = Math.max(
    1,
    Math.round((60 + 12 * (combatLevel - 1) + raw.life) * (1 + raw.lifePct / 100) * (1 + raw.lifeMore / 100)),
  );
  const armour = Math.round(raw.armour * (1 + raw.armourPct / 100) * (1 + raw.armourMore / 100));
  const evasion = Math.round(raw.evasion * (1 + raw.evasionPct / 100));

  const wPhys = weapon?.phys ?? [2, 5];
  const physMult = 1 + raw.physPct / 100;
  const elemMult = 1 + raw.elemPct / 100;
  const hit: Record<DamageType, [number, number]> = {
    phys: [Math.round((wPhys[0] + raw.physMin) * physMult), Math.round((wPhys[1] + raw.physMax) * physMult)],
    fire: [Math.round(raw.fireMin * elemMult), Math.round(raw.fireMax * elemMult)],
    cold: [Math.round(raw.coldMin * elemMult), Math.round(raw.coldMax * elemMult)],
    light: [Math.round(raw.lightMin * elemMult), Math.round(raw.lightMax * elemMult)],
  };
  const attacksPerSec = (weapon?.aps ?? 1.2) * (1 + raw.attackSpeedPct / 100) * (1 + raw.attackSpeedMore / 100);
  const critChance = Math.min(95, (weapon?.crit ?? 5) * (1 + raw.critChancePct / 100));
  const critMulti = 150 + raw.critMulti;
  const cap = (v: number) => Math.min(RES_CAP, v + raw.allRes);
  const avgHit = Object.values(hit).reduce((a, [lo, hi]) => a + (lo + hi) / 2, 0);
  const critFactor = 1 + (critChance / 100) * (critMulti / 100 - 1);

  return {
    raw,
    combatLevel,
    maxLife,
    lifeRegen: raw.lifeRegen + (maxLife * (BASE_REGEN_PCT + raw.lifeRegenPct)) / 100,
    armour,
    evasion,
    hit,
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
    dps: avgHit * attacksPerSec * critFactor * 0.95,
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

export const PLAYER_HIT_CHANCE = 0.95;
