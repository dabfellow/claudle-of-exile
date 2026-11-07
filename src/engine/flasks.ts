import { FLASKS, flaskAffixDef, FLASK_AFFIXES, flaskDef, UNIQUE_FLASKS, type FlaskAffixDef, type FlaskDef, type FlaskStat } from '../data/flasks';
import { currencyDef } from '../data/materials';
import type { Ctx } from './context';
import { accountUid } from './items';
import { chance, pick, pickWeighted, rInt, type Rng } from './rng';
import type { AccountState, FlaskInstance, FlaskMod, GameState, InstillCondition } from './types';

// ---------- creation ----------

export function newFlask(s: GameState, flaskId: string, ilvl = 1): FlaskInstance {
  const def = flaskDef(flaskId);
  return { uid: accountUid(s), flaskId, charges: 0, rarity: def.unique ? 'unique' : 'normal', ilvl, prefixes: [], suffixes: [], instill: null };
}

export function rollUniqueFlask(s: GameState, ilvl: number, rng: Rng, flaskId?: string): FlaskInstance {
  const def = flaskId ? flaskDef(flaskId) : pick(rng, UNIQUE_FLASKS);
  const f = newFlask(s, def.id, ilvl);
  f.rarity = 'unique';
  f.charges = flaskStats(f).maxCharges;
  return f;
}

function eligible(f: FlaskInstance, kind: 'prefix' | 'suffix'): FlaskAffixDef[] {
  const def = flaskDef(f.flaskId);
  const taken = new Set([...f.prefixes, ...f.suffixes].map((m) => m.affixId));
  return FLASK_AFFIXES.filter((a) => a.kind === kind && a.for.includes(def.kind) && !taken.has(a.id));
}

function rollAffix(a: FlaskAffixDef, ilvl: number, rng: Rng): FlaskMod {
  const tiers = a.tiers.filter((t) => t.ilvl <= ilvl);
  const t = tiers[tiers.length - 1] ?? a.tiers[0];
  return { affixId: a.id, value: rInt(rng, t.range[0], t.range[1]) };
}

function addMod(f: FlaskInstance, rng: Rng): boolean {
  const kinds = (['prefix', 'suffix'] as const).filter((k) => (k === 'prefix' ? f.prefixes : f.suffixes).length < 1 && eligible(f, k).length);
  if (!kinds.length) return false;
  const kind = pick(rng, kinds);
  const mod = rollAffix(pick(rng, eligible(f, kind)), f.ilvl, rng);
  (kind === 'prefix' ? f.prefixes : f.suffixes).push(mod);
  return true;
}

/** Make a flask magic with fresh modifiers. */
export function rerollMagic(f: FlaskInstance, rng: Rng): void {
  f.prefixes = [];
  f.suffixes = [];
  addMod(f, rng);
  if (chance(rng, 0.5)) addMod(f, rng);
}

/** A flask as it drops: a random base the monster level allows, sometimes magic. */
export function rollFlask(s: GameState, ilvl: number, rng: Rng): FlaskInstance {
  const def = pickWeighted(rng, FLASKS.filter((x) => x.dropLevel <= ilvl), (x) => (x.kind === 'utility' ? 1 : 2))!;
  const f = newFlask(s, def.id, ilvl);
  if (chance(rng, 0.35)) {
    f.rarity = 'magic';
    rerollMagic(f, rng);
  }
  f.charges = flaskStats(f).maxCharges;
  return f;
}

// ---------- numbers ----------

export interface FlaskStats {
  def: FlaskDef;
  maxCharges: number;
  chargesPerUse: number;
  durationMs: number;
  /** multiplier on life/mana recovered or utility effect */
  effectMult: number;
  gainMult: number;
}

function total(f: FlaskInstance, stat: FlaskStat): number {
  return [...f.prefixes, ...f.suffixes].filter((m) => flaskAffixDef(m.affixId).stat === stat).reduce((a, m) => a + m.value, 0);
}

export function flaskStats(f: FlaskInstance): FlaskStats {
  const def = flaskDef(f.flaskId);
  return {
    def,
    maxCharges: Math.round(def.maxCharges * (1 + total(f, 'capacity') / 100)),
    chargesPerUse: Math.max(1, Math.round(def.chargesPerUse * (1 - total(f, 'saving') / 100))),
    durationMs: Math.round(def.durationMs * (1 + total(f, 'duration') / 100)),
    effectMult: 1 + total(f, 'recovery') / 100,
    gainMult: 1 + total(f, 'gain') / 100,
  };
}

export function flaskName(f: FlaskInstance): string {
  const def = flaskDef(f.flaskId);
  if (f.rarity === 'normal' || f.rarity === 'unique') return def.name;
  const pre = f.prefixes[0] ? flaskAffixDef(f.prefixes[0].affixId).label + ' ' : '';
  const suf = f.suffixes[0] ? ' ' + flaskAffixDef(f.suffixes[0].affixId).label : '';
  return `${pre}${def.name}${suf}`;
}

export function describeFlaskMod(m: FlaskMod): string {
  const a = flaskAffixDef(m.affixId);
  // "faster recovery" mods are stored as negative duration
  return a.text.replace('{0}', String(Math.abs(m.value)));
}

/** What the flask does, with its modifiers applied. */
export function flaskEffectText(f: FlaskInstance): string {
  const st = flaskStats(f);
  const def = st.def;
  if (def.unique) return def.desc;
  const secs = (st.durationMs / 1000).toFixed(1);
  if (def.heal) return `Recovers ${Math.round(def.heal * st.effectMult)} ${def.kind === 'mana' ? 'Mana' : 'Life'} over ${secs}s`;
  return `${def.desc.replace(/ for [\d.]+s$/, '')} for ${secs}s${st.effectMult > 1 ? ` (${Math.round((st.effectMult - 1) * 100)}% stronger)` : ''}`;
}

// ---------- crafting ----------

export const FLASK_ORBS = ['transmute', 'augment', 'alteration', 'scour'] as const;
export type FlaskOrb = (typeof FLASK_ORBS)[number];

export function findFlask(s: GameState, uid: number): FlaskInstance | undefined {
  return s.flaskSlots.find((f) => f?.uid === uid) ?? s.account.flaskStash.find((f) => f.uid === uid);
}

export function flaskOrbReason(s: GameState, orb: FlaskOrb, f: FlaskInstance): string | null {
  if (f.rarity === 'unique') return 'Cannot modify unique flasks';
  if ((s.account.bank[orb] ?? 0) < 1) return `You have no ${currencyDef(orb).name}`;
  const room = f.prefixes.length < 1 || f.suffixes.length < 1;
  switch (orb) {
    case 'transmute':
      return f.rarity === 'normal' ? null : 'Flask must be Normal';
    case 'augment':
      return f.rarity !== 'magic' ? 'Flask must be Magic' : room ? null : 'No room for another modifier';
    case 'alteration':
      return f.rarity === 'magic' ? null : 'Flask must be Magic';
    case 'scour':
      return f.rarity === 'magic' ? null : 'Flask is already Normal';
  }
}

export function applyFlaskOrb(s: GameState, ctx: Ctx, orb: FlaskOrb, uid: number): string | null {
  const f = findFlask(s, uid);
  if (!f) return 'Flask not found';
  const reason = flaskOrbReason(s, orb, f);
  if (reason) return reason;
  s.account.bank[orb] -= 1;
  if (orb === 'transmute') {
    f.rarity = 'magic';
    rerollMagic(f, ctx.rng);
  } else if (orb === 'augment') addMod(f, ctx.rng);
  else if (orb === 'alteration') rerollMagic(f, ctx.rng);
  else {
    f.rarity = 'normal';
    f.prefixes = [];
    f.suffixes = [];
  }
  f.charges = Math.min(f.charges, flaskStats(f).maxCharges);
  ctx.emit({ t: 'craft', text: `${orb} → ${flaskName(f)}`, uid: f.uid, orbId: orb });
  return null;
}

/** Instilling Orb: enchant a flask to use itself automatically. Replaces any previous enchantment. */
export function enchantFlask(s: GameState, ctx: Ctx, uid: number, cond: InstillCondition): string | null {
  const f = findFlask(s, uid);
  if (!f) return 'Flask not found';
  if ((s.account.bank.instill ?? 0) < 1) return 'You need an Instilling Orb';
  if (f.instill === cond) return 'Already has that enchantment';
  s.account.bank.instill -= 1;
  f.instill = cond;
  ctx.emit({ t: 'info', text: `${flaskName(f)} enchanted`, tone: 'good' });
  return null;
}

/** Sell value of a flask at the trader. */
export function flaskValue(f: FlaskInstance): number {
  const base = flaskDef(f.flaskId).price / 4;
  return Math.round(base * (f.rarity === 'magic' ? 1.8 : 1) + (f.instill ? 60 : 0));
}

/** Spare flasks kept per kind; the least valuable past this is sold. */
export const FLASK_STASH_CAP = 10;

/** Sell the least valuable spares of any kind over the cap. Returns the gold. */
export function trimFlaskStash(a: AccountState): number {
  const byKind = new Map<string, FlaskInstance[]>();
  for (const f of a.flaskStash) {
    if (f.rarity === 'unique') continue;
    byKind.set(f.flaskId, [...(byKind.get(f.flaskId) ?? []), f]);
  }
  const sold = new Set<number>();
  for (const list of byKind.values()) {
    if (list.length <= FLASK_STASH_CAP) continue;
    for (const f of [...list].sort((x, y) => flaskValue(x) - flaskValue(y)).slice(0, list.length - FLASK_STASH_CAP)) sold.add(f.uid);
  }
  if (!sold.size) return 0;
  let gold = 0;
  a.flaskStash = a.flaskStash.filter((f) => {
    if (!sold.has(f.uid)) return true;
    gold += flaskValue(f);
    return false;
  });
  a.bank.gold = (a.bank.gold ?? 0) + gold;
  return gold;
}

/** Add a spare flask, selling the worst of its kind if that puts it over the cap. */
export function stashFlask(s: GameState, f: FlaskInstance): void {
  s.account.flaskStash.push(f);
  trimFlaskStash(s.account);
}

export function sellFlasks(s: GameState, ctx: Ctx, uids: number[]): number {
  const set = new Set(uids);
  let gold = 0;
  s.account.flaskStash = s.account.flaskStash.filter((f) => {
    if (!set.has(f.uid)) return true;
    gold += flaskValue(f);
    return false;
  });
  if (gold) {
    s.account.bank.gold = (s.account.bank.gold ?? 0) + gold;
    ctx.emit({ t: 'info', text: `Sold ${uids.length} flask(s) for ${gold} gold`, tone: 'good' });
  }
  return gold;
}

