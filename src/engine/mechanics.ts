import { classDef } from '../data/classes';
import type { Mechanic } from '../data/passiveTree';
import type { Derived } from './stats';
import type { CombatRuntime, GameState, StatKey, Stats } from './types';

/**
 * Class mechanics (docs/CLASSES.md). The meter lives in `combat.mech`:
 * Rage / Momentum / Malice count stacks, Martyr counts Fervor in percent.
 * Riposte and Mana is Power have no meter.
 */

export const RIPOSTE_COOLDOWN_MS = 500;
export const RAGE_DECAY_PER_S = 2;
/** Eternal Hunger: how long a kill keeps you alive */
export const HUNGER_MS = 5000;
/** Overclock: run hot this long, then lock up for OVERHEAT_MS */
export const OVERCLOCK_HEAT_MS = 8000;
export const OVERHEAT_MS = 2000;

/** Which mechanic each knob belongs to: on any other class the stat does nothing (tooltips grey it out). */
export const STAT_MECHANIC: Partial<Record<StatKey, Mechanic>> = {
  rageMax: 'rage', rageEffect: 'rage', rageDecay: 'rage', rageRegen: 'rage', rageOnHitTaken: 'rage', endlessFury: 'rage',
  ripostePct: 'riposte', riposteCooldown: 'riposte', riposteHeal: 'riposte', riposteCrit: 'riposte', riposteBleed: 'riposte', perfectForm: 'riposte',
  momentumMax: 'momentum', momentumEffect: 'momentum', momentumRetain: 'momentum', momentumEvasion: 'momentum', perpetualMotion: 'momentum',
  maliceMax: 'malice', coupPct: 'malice', maliceCritKeep: 'malice', coupAilment: 'malice', maliceOnHitTaken: 'malice', thousandCuts: 'malice',
  manaPower: 'manaPower', manaPowerFull: 'manaPower', manaPowerEs: 'manaPower', allOrNothing: 'manaPower',
  fervorPct: 'martyr', novaPct: 'martyr', novaHeal: 'martyr', novaEs: 'martyr', saintsSacrifice: 'martyr',
};

export function mechanicOf(s: GameState): Mechanic | null {
  return classDef(s.character.classId).mechanic;
}

/** fill old fights in progress with the fields mechanics added */
export function ensureMechanicFields(c: CombatRuntime): void {
  c.mech ??= 0;
  c.mechDamage ??= 0;
  c.riposteMs ??= 0;
  c.riposting ??= false;
  c.manaFrac ??= 1;
  c.heatMs ??= 0;
  c.overheatMs ??= 0;
  c.hungerMs ??= HUNGER_MS;
}

/** the meter's cap, or 0 for mechanics without one */
export function meterMax(mech: Mechanic | null, r: Partial<Stats>): number {
  const v = (k: StatKey) => r[k] ?? 0;
  switch (mech) {
    case 'rage':
      return Math.max(1, Math.floor((20 + v('rageMax')) * (v('endlessFury') ? 0.5 : 1)));
    case 'momentum':
      return Math.max(1, 10 + v('momentumMax'));
    case 'malice':
      return Math.max(3, 15 + v('maliceMax'));
    case 'martyr':
      return 100;
    default:
      return 0;
  }
}

export function meterFull(s: GameState, d: Derived): boolean {
  const max = meterMax(mechanicOf(s), d.raw);
  return max > 0 && (s.combat?.mech ?? 0) >= max;
}

/** add to the meter, clamped to its cap */
export function gainMeter(s: GameState, d: Derived, amount: number): void {
  const c = s.combat;
  if (!c) return;
  c.mech = Math.max(0, Math.min(meterMax(mechanicOf(s), d.raw), c.mech + amount));
}

/** Stats the meter grants while it has stacks (Rage armour and regen, Momentum speed and evasion). */
export function mechanicStats(s: GameState, st: Stats): Partial<Record<StatKey, number>> {
  const stacks = s.combat?.mech ?? 0;
  if (!stacks) return {};
  switch (mechanicOf(s)) {
    case 'rage':
      return { armourPct: 2 * stacks * (1 + st.rageEffect / 100), lifeRegenPct: st.rageRegen * stacks };
    case 'momentum':
      return { attackSpeedPct: 3 * stacks * (1 + st.momentumEffect / 100), evasionPct: st.momentumEvasion * stacks };
    default:
      return {};
  }
}

/** Rage: % more attack damage */
export function rageMore(s: GameState, d: Derived): number {
  if (mechanicOf(s) !== 'rage') return 0;
  return (s.combat?.mech ?? 0) * (1 + d.raw.rageEffect / 100);
}

/** How full mana counts as for Mana is Power, 0–1 (checked before a cast pays its cost). */
export function manaFraction(s: GameState, d: Derived): number {
  const r = d.raw;
  const cur = s.mana + (r.manaPowerEs ? s.es : 0);
  const max = d.maxMana + (r.manaPowerEs ? d.maxEs : 0);
  if (max <= 0) return 0;
  return Math.min(1, cur / max / (1 - Math.min(50, r.manaPowerFull) / 100));
}

/** Mana is Power: % more spell damage at a given fullness */
export function manaPowerMore(s: GameState, d: Derived, frac: number): number {
  if (mechanicOf(s) !== 'manaPower') return 0;
  if (d.raw.allOrNothing) return frac >= 0.8 ? 60 : 0;
  return (30 + d.raw.manaPower) * frac;
}

/** Martyr: how much incoming damage (before mitigation) fills Fervor */
export function fervorThreshold(d: Derived): number {
  const r = d.raw;
  return ((0.6 * (d.maxLife + d.maxEs)) / (1 + r.fervorPct / 100)) * (r.saintsSacrifice ? 0.5 : 1);
}

/** Malice: the Coup de Grâce multiplier (a Mega Crit) */
export function coupMulti(d: Derived): number {
  return (d.raw.thousandCuts ? 2 : 4) * (1 + d.raw.coupPct / 100);
}

/** Mega Crits deal a flat 400%, ignoring critical strike multiplier. */
export const MEGA_CRIT_MULTI = 4;

/** One line for the combat page: the meter's name and what it currently gives. */
export function meterLabel(s: GameState, d: Derived): string {
  const c = s.combat;
  const stacks = Math.floor(c?.mech ?? 0);
  const max = meterMax(mechanicOf(s), d.raw);
  switch (mechanicOf(s)) {
    case 'rage':
      return `Rage ${stacks}/${max} · ${rageMore(s, d).toFixed(0)}% more attack damage`;
    case 'momentum':
      return `Momentum ${stacks}/${max} · ${(3 * stacks * (1 + d.raw.momentumEffect / 100)).toFixed(0)}% attack speed`;
    case 'malice':
      return stacks >= max ? 'Malice full · next hit is a Coup de Grâce' : `Malice ${stacks}/${max}`;
    case 'martyr':
      return `Fervor ${stacks}%`;
    case 'manaPower':
      return `Mana is Power · ${manaPowerMore(s, d, manaFraction(s, d)).toFixed(0)}% more spell damage`;
    case 'riposte':
      return c && c.riposteMs > 0 && !d.raw.perfectForm ? 'Riposte recovering' : 'Riposte ready';
    case null:
      return '';
  }
}
