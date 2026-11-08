import { MONSTER_PROFILES, monsterArchetype } from '../data/monsterProfiles';
import { monsterLife, type MonsterDef } from '../data/zones';
import { armourReduction, ES_RECHARGE_DELAY_MS, ES_RECHARGE_PCT, hitChance, monsterEvasion } from './stats';
import type { DamageType, MonsterInstance } from './types';

/** Stable calibration, not the current player's build: half physical, equal remaining types, half attacks/spells. */
export const monsterReference = (level: number) => ({ hit: monsterLife(level) / 8, accuracy: 120 + level * 5 });

export function monsterMitigation(mon: MonsterInstance, amount: number, type: DamageType, penetration = 0, dot = false): number {
  if (type === 'phys') return dot ? amount : amount * (1 - armourReduction((mon.armour ?? 0) * (mon.vulnMs > 0 ? 0.5 : 1), amount));
  const shred = type === 'chaos' && (mon.chaosShredMs ?? 0) > 0 ? (mon.chaosShred ?? 0) : 0;
  return amount * (1 - Math.min(75, mon.res[type] - penetration - shred) / 100) * (type === 'chaos' ? witherTaken(mon) : 1);
}

/** Wither: 5% increased chaos damage taken per stack while it lasts. */
export function witherTaken(mon: MonsterInstance): number {
  return (mon.witherMs ?? 0) > 0 ? 1 + 0.05 * (mon.wither ?? 0) : 1;
}

/** Incoming reference damage per raw point, before the Life/ES split. */
export function monsterReferenceTaken(mon: MonsterInstance): number {
  const ref = monsterReference(mon.level);
  const attack = hitChance(ref.accuracy, mon.level, mon.evasion) * (1 - Math.min(75, mon.blockChance ?? 0) / 100);
  const spell = 1 - Math.min(75, mon.spellBlockChance ?? 0) / 100;
  const mitigation = 0.5 * (1 - armourReduction(mon.armour ?? 0, ref.hit))
    + (['fire', 'cold', 'light', 'chaos'] as const).reduce((sum, type) => sum + 0.125 * (1 - Math.min(75, mon.res[type]) / 100), 0);
  return mitigation * (attack + spell) / 2;
}

export function monsterReferenceEhp(mon: MonsterInstance): number {
  return (mon.maxLife + (mon.maxEs ?? 0)) / monsterReferenceTaken(mon);
}

/** Recheck after resistance modifiers too, preserving their original increase in effective pool. */
export function calibrateMonsterPool(mon: MonsterInstance): void {
  if (!mon.budget || !mon.archetype) return;
  const legacy = { ...mon, armour: 0, evasion: undefined, blockChance: 0, spellBlockChance: 0 };
  const pool = mon.budget.life * monsterReferenceTaken(mon) / monsterReferenceTaken(legacy);
  const shieldShare = MONSTER_PROFILES[mon.archetype].es;
  const lifeFraction = mon.life / mon.maxLife;
  const esFraction = mon.maxEs ? (mon.es ?? 0) / mon.maxEs : 1;
  mon.maxLife = pool * (1 - shieldShare);
  mon.life = mon.maxLife * lifeFraction;
  mon.maxEs = pool * shieldShare;
  mon.es = mon.maxEs * esFraction;
}

/** Expected unmitigated DPS, including crits and the damage reserved for ailments. */
export function monsterBasicDps(mon: MonsterInstance): number {
  const hit = mon.damage * (mon.basicDamageMult ?? 1);
  const crit = (mon.critChance ?? 0) / 100;
  return hit * (1 + crit * ((mon.critMulti ?? 1.5) - 1)) / (1 - (mon.dotShare ?? 0)) * 1000 / mon.attackMs;
}

/** Preserve raw pressure; Armour, resistance and recovery then create real build-dependent counters. */
export function calibrateMonsterDamage(mon: MonsterInstance): void {
  if (!mon.budget || mon.damage <= 0) return;
  mon.basicDamageMult = mon.budget.damage / mon.damage * mon.attackMs / mon.budget.attackMs
    * (1 - (mon.dotShare ?? 0)) / (1 + (mon.critChance ?? 0) / 100 * ((mon.critMulti ?? 1.5) - 1));
}

/** Redistribute the existing pool and basic DPS; boss wind-ups, loot, packs and levels retain their old budgets. */
export function applyMonsterProfile(mon: MonsterInstance, def: MonsterDef): void {
  if (mon.budget) return;
  mon.budget = { life: mon.maxLife, damage: mon.damage, attackMs: mon.attackMs, damageType: mon.dmgType };
  const oldTaken = monsterReferenceTaken(mon);
  const id = monsterArchetype(def);
  const p = MONSTER_PROFILES[id];
  mon.archetype = id;
  const ref = monsterReference(mon.level);
  mon.armour = 2 * ref.hit * p.armour / (1 - p.armour);
  mon.evasion = monsterEvasion(mon.level) * p.evasion;
  mon.blockChance = p.block;
  mon.spellBlockChance = p.spellBlock;
  const pool = mon.budget.life * monsterReferenceTaken(mon) / oldTaken;
  // Keep sub-point precision: integer rounding distorted low-level swarm budgets most.
  mon.maxLife = mon.life = pool * (1 - p.es);
  mon.maxEs = mon.es = pool * p.es;
  mon.esDelayMs = 0;
  // Persistent boss recovery is already authored through wards. Do not add another unbudgeted heal loop.
  mon.esRechargePct = mon.isBoss ? 0 : ES_RECHARGE_PCT / 6;
  mon.attackMs = Math.round(mon.budget.attackMs * p.interval);
  mon.critChance = p.crit;
  mon.critMulti = 1.5;
  mon.dotShare = p.dot;
  mon.attackAilment = p.ailment;
  // Fire casters spend part of their existing damage on pooled burns, rather than adding free damage.
  if (!mon.attackAilment && mon.dmgType === 'fire') {
    mon.attackAilment = 'burn';
    mon.dotShare = 0.15;
  }
  // Damage changes type after defensive calibration: pre-existing elemental resist identity is retained.
  mon.dmgType = p.element ?? mon.dmgType;
  calibrateMonsterDamage(mon);
}

/** Every pool scaler must include ES and basic hit damage, not only Life and boss damage. */
export function scaleMonsterPools(mon: MonsterInstance, life: number, damage = 1): void {
  mon.maxLife *= life;
  mon.life *= life;
  if (mon.maxEs !== undefined) mon.maxEs *= life;
  if (mon.es !== undefined) mon.es *= life;
  mon.damage *= damage;
  if (mon.budget) {
    mon.budget.life *= life;
    mon.budget.damage *= damage;
  }
  calibrateMonsterDamage(mon);
}

export function rechargeMonsterEs(mon: MonsterInstance, dt: number): void {
  const delay = mon.esDelayMs ?? 0;
  mon.esDelayMs = Math.max(0, delay - dt);
  const recharging = Math.max(0, dt - delay);
  if ((mon.maxEs ?? 0) > 0 && recharging > 0) mon.es = Math.min(mon.maxEs!, (mon.es ?? 0) + mon.maxEs! * (mon.esRechargePct ?? 0) / 100 * recharging / 1000);
}

/** Shared shield rule: non-chaos damage consumes ES first; any damage delays recharge. */
export function absorbMonsterEs(mon: MonsterInstance, amount: number, chaosShare: number): number {
  if (amount <= 0) return amount;
  mon.esDelayMs = ES_RECHARGE_DELAY_MS;
  const absorbed = Math.min(mon.es ?? 0, amount * (1 - chaosShare));
  mon.es = Math.max(0, (mon.es ?? 0) - absorbed);
  return amount - absorbed;
}
