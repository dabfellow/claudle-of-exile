import {
  INFUSION_BREW_HERBS,
  INFUSIONS,
  MAX_INFUSION_RANK,
  infusionDef,
} from '../data/alchemy';
import { flaskDef } from '../data/flasks';
import { ALCH_DOUBLE } from '../data/hideout';
import { materialDef } from '../data/materials';
import type { SkillAction } from '../data/skills';
import { describeStat } from '../data/statText';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import type { Ctx } from './context';
import { parseStrain } from './foraging';
import { skillTreeStats } from './skillTree';
import { stationLevelFor } from './skills';
import type { FlaskInfusion, FlaskInstance, GameState, StatKey } from './types';
import { levelOf } from './xp';

export interface AlchemyQueueItem {
  infusion: string;
  source: string;
}

export interface ReadyVial {
  id: string;
  infusion: string;
  strength: number;
  strain: string;
}

export interface InfusionRank {
  rank: number;
  brews: number;
}

export interface AlchemyState {
  queue: AlchemyQueueItem[];
  vials: ReadyVial[];
  ranks: Record<string, InfusionRank>;
  unlockedRare: string[];
  awayVials: ReadyVial[];
  awayRankUps: { infusion: string; rank: number }[];
}

export const freshAlchemy = (): AlchemyState => ({
  queue: [],
  vials: [],
  ranks: {},
  unlockedRare: [],
  awayVials: [],
  awayRankUps: [],
});

export const GRAND_FLAWLESS_BARS = 10;

export function infusionRank(s: GameState, id: string): InfusionRank {
  return s.alchemy.ranks[id] ?? { rank: 1, brews: 0 };
}

/** Reaching rank r needs 3 * r brews after rank r - 1. */
export function brewsForNextRank(currentRank: number): number {
  if (currentRank >= MAX_INFUSION_RANK) return 0;
  return 3 * (currentRank + 1);
}

export function strainPotency(source: string): number {
  const { mutations } = parseStrain(source);
  let potency = 0;
  if (mutations.includes('vivid')) potency += 0.10;
  if (mutations.includes('radiant')) potency += 0.30;
  if (mutations.includes('celestial')) potency += 0.75;
  return potency;
}

export function infusionStrength(rank: number, source: string): number {
  const rankMult = 1 + 0.1 * Math.max(0, rank - 1);
  return +(rankMult * (1 + strainPotency(source))).toFixed(4);
}

export function infusionUnlocked(s: GameState, id: string): boolean {
  const def = infusionDef(id);
  if (!def) return false;
  if (def.rareMutation) return s.alchemy.unlockedRare.includes(id);
  return levelOf('alchemy', s.skills.alchemy) >= def.level;
}

export function sourceFitsInfusion(infusionId: string, source: string): boolean {
  const def = infusionDef(infusionId);
  if (!def) return false;
  const { species, mutations } = parseStrain(source);
  if (mutations.includes('prismatic')) return true;
  if (def.rareMutation) return mutations.includes(def.rareMutation);
  return species === def.herb;
}

export function herbStockForSource(s: GameState, source: string): number {
  const { species, mutations } = parseStrain(source);
  return mutations.length ? (s.foraging.strainHerbs[source] ?? 0) : (s.storage.bank[species] ?? 0);
}

export function consumeHerbSource(s: GameState, source: string, qty: number): boolean {
  if (herbStockForSource(s, source) < qty) return false;
  const { species, mutations } = parseStrain(source);
  if (mutations.length) {
    s.foraging.strainHerbs[source] -= qty;
    if (s.foraging.strainHerbs[source] <= 0) delete s.foraging.strainHerbs[source];
  } else {
    s.storage.bank[species] -= qty;
    if (s.storage.bank[species] <= 0) delete s.storage.bank[species];
  }
  return true;
}

/** Find a flawless bar stack with at least `qty` bars for Grand flask crafting. */
export function flawlessBarStack(s: GameState, qty = GRAND_FLAWLESS_BARS): string | undefined {
  return Object.entries(s.storage.bank).find(([id, n]) => id.endsWith('_bar_flawless') && n >= qty)?.[0];
}

export function infusionQueueBlocker(s: GameState): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const next = s.alchemy.queue[0];
  if (!next) return 'Add an infusion to the brew queue first';
  const def = infusionDef(next.infusion);
  if (!def) return 'Unknown infusion';
  if (!infusionUnlocked(s, next.infusion)) return def.rareMutation ? 'Unlock this infusion by brewing with its Legendary mutation' : `Requires Alchemy level ${def.level}`;
  if (!sourceFitsInfusion(next.infusion, next.source)) return 'Selected herb source does not match this infusion';
  if (herbStockForSource(s, next.source) < INFUSION_BREW_HERBS) return `Needs ${INFUSION_BREW_HERBS} herbs`;
  return null;
}

function validateInfusionChoice(s: GameState, infusionId: string, source: string): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const def = infusionDef(infusionId);
  if (!def) return 'Unknown infusion';
  if (!infusionUnlocked(s, infusionId)) return def.rareMutation ? 'Not yet unlocked' : `Requires Alchemy level ${def.level}`;
  if (!sourceFitsInfusion(infusionId, source)) return 'Selected herb source does not match this infusion';
  return null;
}

export function queueInfusion(s: GameState, infusionId: string, source: string): string | null {
  const err = validateInfusionChoice(s, infusionId, source);
  if (err) return err;
  s.alchemy.queue.push({ infusion: infusionId, source });
  return null;
}

/** Validate infusion + herb stock and place it at index 0 so starting `brew_infusion` brews it immediately. */
export function prependInfusion(s: GameState, infusionId: string, source: string): string | null {
  const err = validateInfusionChoice(s, infusionId, source);
  if (err) return err;
  if (herbStockForSource(s, source) < INFUSION_BREW_HERBS) return `Needs ${INFUSION_BREW_HERBS} herbs`;
  s.alchemy.queue.unshift({ infusion: infusionId, source });
  return null;
}

export function removeQueuedInfusion(s: GameState, index: number): void {
  if (index >= 0 && index < s.alchemy.queue.length) s.alchemy.queue.splice(index, 1);
}

/** Complete the head of the alchemy infusion queue. */
export function finishQueuedInfusion(s: GameState, ctx: Ctx): ReadyVial | null {
  const next = s.alchemy.queue[0];
  if (!next) return null;
  if (!consumeHerbSource(s, next.source, INFUSION_BREW_HERBS)) {
    s.action = null;
    return null;
  }
  s.alchemy.queue.shift();

  // Check Legendary mutation unlock
  const { mutations } = parseStrain(next.source);
  for (const inf of INFUSIONS) {
    if (inf.rareMutation && mutations.includes(inf.rareMutation) && !s.alchemy.unlockedRare.includes(inf.id)) {
      s.alchemy.unlockedRare.push(inf.id);
    }
  }

  // Advance rank
  const rec = s.alchemy.ranks[next.infusion] ?? (s.alchemy.ranks[next.infusion] = { rank: 1, brews: 0 });
  const strength = infusionStrength(rec.rank, next.source);
  rec.brews += 1;
  const need = brewsForNextRank(rec.rank);
  if (need > 0 && rec.brews >= need) {
    rec.brews -= need;
    rec.rank += 1;
    if (ctx.offline) s.alchemy.awayRankUps.push({ infusion: next.infusion, rank: rec.rank });
  }

  const vial: ReadyVial = {
    id: `vial_${s.clock}_${s.alchemy.vials.length}_${Math.floor(ctx.rng.next() * 1e6)}`,
    infusion: next.infusion,
    strength,
    strain: next.source,
  };
  s.alchemy.vials.push(vial);
  if (ctx.offline) s.alchemy.awayVials.push(vial);
  if (!s.alchemy.queue.length || infusionQueueBlocker(s)) s.action = null;
  return vial;
}

export function flaskInfusionSlots(f: FlaskInstance): number {
  return f.grand ? 3 : 2;
}

/** Why this infusion can't go in this flask, or null when it fits. */
export function infusionFitBlocker(infusionId: string, flask: FlaskInstance): string | null {
  const def = infusionDef(infusionId);
  if (!def) return 'Unknown infusion';
  if (def.grandOnly && !flask.grand) return 'Needs a Grand flask';
  const fDef = flaskDef(flask.flaskId);
  if (def.flaskKinds && !def.flaskKinds.includes(fDef.kind)) return `${def.name} only fits Life or Mana flasks`;
  return null;
}

/** The first empty infusion slot on a flask, or -1 when every slot is taken. */
export function firstOpenInfusionSlot(flask: FlaskInstance): number {
  const used = flask.infusions?.length ?? 0;
  return used < flaskInfusionSlots(flask) ? used : -1;
}

export function pourVial(s: GameState, beltSlot: number, infusionSlot: number, vialIndex: number): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const flask = s.flaskSlots[beltSlot];
  if (!flask) return 'Empty belt slot';
  const vial = s.alchemy.vials[vialIndex];
  if (!vial) return 'Vial not found';
  const maxSlots = flaskInfusionSlots(flask);
  if (infusionSlot < 0 || infusionSlot >= maxSlots) return `This flask only holds ${maxSlots} infusions`;
  const fit = infusionFitBlocker(vial.infusion, flask);
  if (fit) return fit;

  flask.infusions ??= [];
  const next: FlaskInfusion = { id: vial.infusion, strength: vial.strength, strain: vial.strain };
  if (infusionSlot < flask.infusions.length) flask.infusions[infusionSlot] = next;
  else flask.infusions.push(next);

  s.alchemy.vials.splice(vialIndex, 1);
  s.alchemy.awayVials = s.alchemy.awayVials.filter((v) => v.id !== vial.id);
  return null;
}

export function flaskHasInfusion(f: FlaskInstance | null | undefined, id: string): FlaskInfusion | undefined {
  return f?.infusions?.find((inf) => inf.id === id);
}

/** Stat bonuses granted while this flask's buff is active, including Prism sharing from other equipped flasks. */
export function flaskInfusionBuffStats(s: GameState, f: FlaskInstance, scale = 1, includePrism = true): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = {};
  const add = (k: StatKey, v: number) => {
    out[k] = (out[k] ?? 0) + Math.round(v * scale * 10) / 10;
  };
  for (const inf of f.infusions ?? []) {
    const str = inf.strength;
    const astroBonus = parseStrain(inf.strain).mutations.includes('starlit')
      ? 1 + levelOf('astrology', s.skills.astrology) * 0.005
      : 1;
    const eff = str * astroBonus;
    switch (inf.id) {
      case 'frostguard':
        add('coldRes', 10 * eff);
        break;
      case 'onslaught':
        add('attackSpeedPct', 8 * eff);
        add('castSpeedPct', 8 * eff);
        add('moveSpeedPct', 8 * eff);
        break;
      case 'phasing':
        add('evasionPct', 10 * eff);
        break;
      case 'clarity':
        add('manaRegenPct', 20 * eff);
        break;
      case 'barbed':
        add('forgeThorns', 10 * eff);
        break;
      case 'starlit':
        add('physPct', 6 * eff);
        add('elemPct', 6 * eff);
        break;
      case 'starfall':
        add('physPct', 10 * eff);
        add('elemPct', 10 * eff);
        add('allRes', 10 * eff);
        break;
      case 'prism':
        if (includePrism) {
          for (const other of s.flaskSlots) {
            if (!other || other.uid === f.uid) continue;
            const sub = flaskInfusionBuffStats(s, other, 0.25 * eff, false);
            for (const [k, v] of Object.entries(sub)) add(k as StatKey, v ?? 0);
          }
        }
        break;
    }
    if (parseStrain(inf.strain).mutations.includes('barbed')) add('forgeThorns', 8 * eff);
  }
  return out;
}

export function flaskInfusionDurationPct(f: FlaskInstance): number {
  let pct = 0;
  for (const inf of f.infusions ?? []) {
    if (inf.id === 'lingering') pct += 20 * inf.strength;
    if (parseStrain(inf.strain).mutations.includes('umbral')) pct += 50;
  }
  return pct;
}

export function migrateAlchemyInfusions(raw: Record<string, unknown>): void {
  raw.alchemy ??= freshAlchemy();
  const slots = raw.flaskSlots as (FlaskInstance | null)[] | undefined;
  if (slots) for (const f of slots) if (f) f.infusions ??= [];
  const storage = raw.storage as { flaskStash?: FlaskInstance[] } | undefined;
  if (storage?.flaskStash) for (const f of storage.flaskStash) f.infusions ??= [];
}

export function settleAlchemy(s: GameState): void {
  s.alchemy ??= freshAlchemy();
  for (const f of s.flaskSlots) if (f) f.infusions ??= [];
  for (const f of s.storage.flaskStash) f.infusions ??= [];
}

export function alchemyPreview(s: GameState, a: SkillAction): string[] {
  if (a.skill !== 'alchemy') return [];
  const lines: string[] = [];

  if (a.flaskId) {
    const f = flaskDef(a.flaskId);
    const uses = Math.floor(f.maxCharges / f.chargesPerUse);
    const durSec = +(f.durationMs / 1000).toFixed(1);

    if (a.grandFlask) {
      lines.push(`Grand flask: holds 3 infusion slots (including Grand-only infusions) and requires ${GRAND_FLAWLESS_BARS} Flawless bars of any metal.`);
    }
    if (f.kind === 'life') {
      const perSec = Math.round((f.heal ?? 0) / durSec);
      lines.push(`Life recovery: restores ${f.heal} Life over ${durSec}s (${perSec} Life/s).`);
      lines.push(`Capacity: ${f.maxCharges} charges total; uses ${f.chargesPerUse} charges per drink (${uses} use${uses === 1 ? '' : 's'} from full). Refills on monster kills.`);
    } else if (f.kind === 'mana') {
      const perSec = Math.round((f.heal ?? 0) / durSec);
      lines.push(`Mana recovery: restores ${f.heal} Mana over ${durSec}s (${perSec} Mana/s).`);
      lines.push(`Capacity: ${f.maxCharges} charges total; uses ${f.chargesPerUse} charges per drink (${uses} use${uses === 1 ? '' : 's'} from full). Refills on monster kills.`);
    } else {
      const buffs = Object.entries(f.buff ?? {}).map(([k, v]) => describeStat(k as StatKey, v)).join(', ');
      lines.push(`Utility effect: ${buffs} for ${durSec}s.`);
      lines.push(`Capacity: ${f.maxCharges} charges total; uses ${f.chargesPerUse} charges per drink (${uses} use${uses === 1 ? '' : 's'} from full).`);
    }

    const t = skillTreeStats(s);
    if (t.qualityBrews) {
      lines.push(`Quality Brews: ${t.qualityBrews}% chance for the crafted flask to roll Magic with random affixes.`);
    }
    return lines;
  }

  if (a.protectedOutputs) {
    const outKey = Object.keys(a.protectedOutputs)[0];
    const def = materialDef(outKey);
    lines.push(`Special reagent: ${def.name}. ${def.desc ?? ''}`);
    return lines;
  }

  const outId = a.outputs ? Object.keys(a.outputs)[0] : '';
  if (outId) {
    try {
      const m = materialDef(outId);
      if (m.desc) lines.push(`Intended use: ${m.desc}`);
    } catch {
      // ignore
    }
  }

  const t = skillTreeStats(s);
  const alchLvl = s.account.hideout.alchemy_table ?? 1;
  if (a.batchMastery) {
    lines.push(`Mastery ${a.batchMastery} batch: ${a.batch}× output at full ${a.batch}× input cost. Shares the single craft's mastery rate per second.`);
  } else if (a.batch) {
    const mult = t.bulkBrewer ? 7.5 : 8.5;
    const discount = t.bulkBrewer ? '25%' : '15%';
    lines.push(`Batch recipe: produces 10 orbs at ${mult}× input cost (${discount} material discount).`);
  }
  const doubleChance = Math.round((ALCH_DOUBLE[alchLvl - 1] ?? 0) * 100);
  if (doubleChance > 0) {
    lines.push(`Alchemy Table level ${alchLvl}: ${doubleChance}% chance of double output.`);
  }
  return lines;
}

export function alchemyAccessHint(s: GameState, a: SkillAction): string | null {
  if (a.skill !== 'alchemy') return null;
  if (s.professionProgress.legacyAccess[a.id]) return null;
  const st = stationLevelFor(a);
  if (st && (s.account.hideout[st.station] ?? 1) < st.level) {
    return `Needs ${st.station === 'forge' ? 'Forge' : 'Alchemy Table'} level ${st.level}`;
  }
  return null;
}
