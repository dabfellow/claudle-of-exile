import { classDef } from '../data/classes';
import type { Mechanic } from '../data/passiveTree';
import { ascendancyOf, hasAscNode, newAscendancyRuntime } from './ascendancy';
import { flaskStats } from './flasks';
import type { Derived } from './stats';
import type { CombatRuntime, FlaskInstance, GameState, StatKey, Stats } from './types';

/**
 * Class mechanics (docs/design/CLASSES.md). The meter lives in `combat.mech`:
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

// ascendancy numbers (docs/design/ASCENDANCIES.md)
export const RAMPAGE_MS = 6000;
export const RAMPAGE_KILL_MS = 1000;
export const NO_MERCY_HOLD_MS = 2000;
export const RED_HAZE_SPEED = 30;
/** Anvil: attackers take this % of your Armour, and this much more per Rage */
export const ANVIL_THORNS_PCT = 4;
export const ANVIL_THORNS_PER_RAGE = 0.05;
/** Hold the Line: extra Rage per enemy in ring 1 for each hit taken */
export const HOLD_THE_LINE_RAGE = 0.25;
export const LONGSHOT_MORE_PER_STACK = 3;
export const HEAD_START_MOMENTUM = 4;
/** The hawk attacks this often at no Momentum, this much faster per Momentum, for this share of a weapon hit. */
export const HAWK_MS = 1600;
export const HAWK_SPEED_PER_STACK = 0.06;
export const HAWK_DAMAGE = 0.5;
export const STOOP_MULT = 4;
export const RAGGED_EDGE_BONUS = 15;
export const RAGGED_EDGE_BELOW = 0.25;
export const FEEDBACK_MANA = 0.02;
export const BACKDRAFT_COST = 0.7;
export const BURNOUT_SPELLS = 3;
/** Alchemist: one flask charge counts as this much mana */
export const CHARGE_MANA = 3;
/** A flask burst deals this much fire damage per character level, before Flask Effect. */
export const FLASK_BURST_PER_LEVEL = 12;
export const DEEP_CELLAR_CHARGES = 1.5;
export const TONIC_MANA = 0.1;
export const DRAUGHT_MORE = 6;
export const STREAK_CAP = 10;
export const VERONICA_CAP = 15;
export const STREAK_MORE = 15;
export const CROWDS_ROAR_SPEED = 2;
export const STAND_FAST_ARMOUR = 30;
export const PHALANX_MULT = 3;
/** Flagellant: a skill costs this % of max Life, and that Life fills Fervor this many times over */
export const SELF_HARM_PCT = 3;
export const SELF_HARM_FERVOR = 3;
export const SCOURGE_DAMAGE = 1.5;
export const MORTIFY_MORE = 25;
export const ECSTASY_SPEED = 15;
export const NOVA_STORE = 3;
export const RESERVE_MORE = 0.2;
export const VESPERS_SHIELD = 0.15;
export const SHARP_AXE_MORE = 50;
export const THE_BLOCK_AT = 0.3;
/** Malice per second from each ailment ticking on an enemy */
export const PLAGUE_MALICE_PER_S = 0.5;
export const BLOOM_MORE = 25;

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
  c.asc ??= newAscendancyRuntime();
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

/** Rampaging counts as a full meter for rules, so Berserk can line up with it while Rage drains. */
export function meterFull(s: GameState, d: Derived): boolean {
  const max = meterMax(mechanicOf(s), d.raw);
  return max > 0 && ((s.combat?.mech ?? 0) >= max || rampaging(s));
}

export function rampaging(s: GameState): boolean {
  return (s.combat?.asc?.rampageMs ?? 0) > 0;
}

/** Matador: how long the streak can get */
export function streakCap(s: GameState): number {
  return hasAscNode(s, 'matador_veronica') ? VERONICA_CAP : STREAK_CAP;
}

/** Falconer: ms between the hawk's attacks at the current Momentum */
export function hawkInterval(s: GameState, d: Derived): number {
  return HAWK_MS / (1 + HAWK_SPEED_PER_STACK * (s.combat?.mech ?? 0) * (1 + d.raw.momentumEffect / 100));
}

/** Longshot: % more attack damage against an enemy on this ring */
export function longshotMore(s: GameState, d: Derived, ring: number): number {
  if (ascendancyOf(s) !== 'longshot') return 0;
  return (s.combat?.mech ?? 0) * LONGSHOT_MORE_PER_STACK * (1 + d.raw.momentumEffect / 100) * (ring >= 3 ? 2 : 1);
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
  const streak = s.combat?.asc?.streak ?? 0;
  if (streak && hasAscNode(s, 'matador_crowds_roar')) return { attackSpeedPct: CROWDS_ROAR_SPEED * streak };
  if (!stacks) return {};
  switch (mechanicOf(s)) {
    case 'rage':
      return {
        armourPct: 2 * stacks * (1 + st.rageEffect / 100),
        lifeRegenPct: st.rageRegen * stacks,
        attackSpeedPct: rampaging(s) && hasAscNode(s, 'ravager_red_haze') ? RED_HAZE_SPEED : 0,
      };
    case 'momentum':
      return { attackSpeedPct: ascendancyOf(s) === 'longshot' ? 0 : 3 * stacks * (1 + st.momentumEffect / 100), evasionPct: st.momentumEvasion * stacks };
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
  let cur = s.mana + (r.manaPowerEs ? s.es : 0);
  let max = d.maxMana + (r.manaPowerEs ? d.maxEs : 0);
  if (ascendancyOf(s) === 'alchemist') {
    for (const f of s.flaskSlots) {
      if (!f) continue;
      cur += f.charges * CHARGE_MANA;
      max += flaskCapacity(s, f) * CHARGE_MANA;
    }
  }
  if (max <= 0) return 0;
  return Math.min(1, cur / max / (1 - Math.min(50, r.manaPowerFull) / 100));
}

/** Mana is Power: % more spell damage at a given fullness */
export function manaPowerMore(s: GameState, d: Derived, frac: number): number {
  if (mechanicOf(s) !== 'manaPower') return 0;
  // Wildcaster: the emptier the tank, the bigger the bonus
  const wild = ascendancyOf(s) === 'wildcaster';
  const f = wild ? 1 - frac : frac;
  if (d.raw.allOrNothing) return f >= 0.8 ? 60 : 0;
  return (30 + d.raw.manaPower) * f + (frac < RAGGED_EDGE_BELOW && hasAscNode(s, 'wildcaster_ragged_edge') ? RAGGED_EDGE_BONUS : 0);
}

/** How many charges a flask holds for this character. */
export function flaskCapacity(s: GameState, f: FlaskInstance): number {
  const max = flaskStats(f).maxCharges;
  return hasAscNode(s, 'alchemist_deep_cellar') ? Math.round(max * DEEP_CELLAR_CHARGES) : max;
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
      if (rampaging(s)) return `Rampage ${(c!.asc.rampageMs / 1000).toFixed(1)}s · ${rageMore(s, d).toFixed(0)}% more attack damage`;
      return `Rage ${stacks}/${max} · ${rageMore(s, d).toFixed(0)}% more attack damage`;
    case 'momentum':
      if (ascendancyOf(s) === 'longshot') return `Momentum ${stacks}/${max} · ${longshotMore(s, d, 1).toFixed(0)}% more attack damage, double at range`;
      if (ascendancyOf(s) === 'falconer') return `Momentum ${stacks}/${max} · hawk every ${(hawkInterval(s, d) / 1000).toFixed(1)}s`;
      return `Momentum ${stacks}/${max} · ${(3 * stacks * (1 + d.raw.momentumEffect / 100)).toFixed(0)}% attack speed`;
    case 'malice':
      return stacks >= max ? 'Malice full · next hit is a Coup de Grâce' : `Malice ${stacks}/${max}`;
    case 'martyr':
      return ascendancyOf(s) === 'lightkeeper' ? `Fervor ${stacks}% · ${c?.asc.novas ?? 0}/${NOVA_STORE} novas stored` : `Fervor ${stacks}%`;
    case 'manaPower':
      return `Mana is Power · ${manaPowerMore(s, d, manaFraction(s, d)).toFixed(0)}% more spell damage`;
    case 'riposte':
      return `${c && c.riposteMs > 0 && !d.raw.perfectForm ? 'Riposte recovering' : 'Riposte ready'}${ascendancyOf(s) === 'matador' ? ` · streak ${c?.asc.streak ?? 0}/${streakCap(s)}` : ''}`;
    case null:
      return '';
  }
}
