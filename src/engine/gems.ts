import {
  activeGemDef,
  DEFAULT_ATTACK,
  MAX_GEM_LEVEL,
  MAX_SUPPORT_SLOTS,
  SKILL_BAR_SLOTS,
  supportGemDef,
  type ActiveGemDef,
  type SupportGemDef,
  type SupportMods,
  type TacticRule,
} from '../data/gems';
import { characterLevel } from './character';
import type { Ctx } from './context';
import { newUid } from './items';
import type { Derived } from './stats';
import type { GameState, SkillGemInstance, SupportGemInstance } from './types';

// ---------- levels ----------

/** Total gem xp needed to reach a gem level. */
export function gemXpForLevel(level: number): number {
  return Math.floor(60 * Math.pow(level - 1, 2.8));
}

/** Character level a gem needs before it can reach `level`. */
export function gemLevelReq(level: number): number {
  return 1 + (level - 1) * 3;
}

export function supportSlots(gem: SkillGemInstance): number {
  return Math.min(MAX_SUPPORT_SLOTS, Math.min(4, 1 + Math.floor(gem.level / 5)) + gem.extraSlots);
}

/** Gems on the skill bar share the character's xp. Levels stall until the character catches up. */
export function grantGemXp(s: GameState, ctx: Ctx, amount: number): void {
  const charLvl = characterLevel(s);
  for (const gem of s.skillBar) {
    if (!gem || gem.level >= MAX_GEM_LEVEL) continue;
    const next = gem.level + 1;
    const cap = gemXpForLevel(next);
    if (charLvl < gemLevelReq(next)) {
      gem.xp = Math.min(cap, gem.xp + amount);
      continue;
    }
    gem.xp += amount;
    while (gem.level < MAX_GEM_LEVEL && gem.xp >= gemXpForLevel(gem.level + 1) && charLvl >= gemLevelReq(gem.level + 1)) {
      gem.level += 1;
      ctx.emit({ t: 'gemLevel', gemId: gem.gemId, level: gem.level });
    }
  }
}

export function gemProgress(gem: SkillGemInstance): number {
  if (gem.level >= MAX_GEM_LEVEL) return 1;
  const lo = gemXpForLevel(gem.level);
  const hi = gemXpForLevel(gem.level + 1);
  return Math.min(1, (gem.xp - lo) / (hi - lo));
}

// ---------- creation & sockets ----------

export function createSkillGem(s: GameState, gemId: string, level = 1): SkillGemInstance {
  const def = activeGemDef(gemId);
  return { uid: newUid(s), gemId, level, xp: gemXpForLevel(level), supports: [null], extraSlots: 0, rule: { ...def.defaultRule } };
}

export function createSupportGem(s: GameState, supportId: string): SupportGemInstance {
  supportGemDef(supportId);
  return { uid: newUid(s), supportId };
}

/** Keep the supports array length in step with the number of sockets. */
export function syncSockets(gem: SkillGemInstance): void {
  const n = supportSlots(gem);
  while (gem.supports.length < n) gem.supports.push(null);
}

export function supportFits(support: SupportGemDef, active: ActiveGemDef): boolean {
  if (support.signatureFor) return support.signatureFor === active.id;
  return support.fits.some((t) => active.tags.includes(t));
}

export function supportReason(gem: SkillGemInstance, supportId: string): string | null {
  const sup = supportGemDef(supportId);
  const act = activeGemDef(gem.gemId);
  if (!supportFits(sup, act)) return sup.signatureFor ? `Only fits ${activeGemDef(sup.signatureFor).name}` : `Doesn't support ${act.name}`;
  if (gem.supports.some((x) => x?.supportId === supportId)) return 'Already socketed';
  return null;
}

/** Find a skill gem wherever it is (bar or bag). */
export function findSkillGem(s: GameState, uid: number): SkillGemInstance | undefined {
  return s.skillBar.find((g) => g?.uid === uid) ?? s.gems.find((g) => g.uid === uid);
}

export function placeOnBar(s: GameState, gemUid: number, slot: number): string | null {
  if (slot < 0 || slot >= SKILL_BAR_SLOTS) return 'Invalid slot';
  const fromBar = s.skillBar.findIndex((g) => g?.uid === gemUid);
  if (fromBar >= 0) {
    // moving within the bar swaps the two slots
    const other = s.skillBar[slot];
    s.skillBar[slot] = s.skillBar[fromBar];
    s.skillBar[fromBar] = other;
    return null;
  }
  const fromBag = s.gems.findIndex((g) => g.uid === gemUid);
  if (fromBag < 0) return 'Gem not found';
  const [gem] = s.gems.splice(fromBag, 1);
  const current = s.skillBar[slot];
  if (current) s.gems.push(current);
  s.skillBar[slot] = gem;
  return null;
}

export function removeFromBar(s: GameState, slot: number): void {
  const gem = s.skillBar[slot];
  if (!gem) return;
  s.skillBar[slot] = null;
  s.gems.push(gem);
}

export function socketSupport(s: GameState, gemUid: number, supportUid: number, socket: number): string | null {
  const gem = findSkillGem(s, gemUid);
  if (!gem) return 'Gem not found';
  syncSockets(gem);
  if (socket < 0 || socket >= supportSlots(gem)) return 'No such socket';
  const idx = s.supportGems.findIndex((x) => x.uid === supportUid);
  if (idx < 0) return 'Support not found';
  const reason = supportReason(gem, s.supportGems[idx].supportId);
  if (reason) return reason;
  const [sup] = s.supportGems.splice(idx, 1);
  const prev = gem.supports[socket];
  if (prev) s.supportGems.push(prev);
  gem.supports[socket] = sup;
  return null;
}

export function unsocketSupport(s: GameState, gemUid: number, socket: number): void {
  const gem = findSkillGem(s, gemUid);
  const sup = gem?.supports[socket];
  if (!gem || !sup) return;
  gem.supports[socket] = null;
  s.supportGems.push(sup);
}

export function setRule(s: GameState, slot: number, rule: TacticRule): void {
  const gem = s.skillBar[slot];
  if (gem) gem.rule = rule;
}

/** Orb of Expansion: +1 support socket, up to the maximum. */
export function expandSockets(s: GameState, ctx: Ctx, gemUid: number): string | null {
  const gem = findSkillGem(s, gemUid);
  if (!gem) return 'Gem not found';
  if ((s.bank.expansion ?? 0) < 1) return 'Requires an Orb of Expansion';
  if (gem.extraSlots >= 1 || supportSlots(gem) >= MAX_SUPPORT_SLOTS) return 'No more sockets can be added';
  s.bank.expansion -= 1;
  gem.extraSlots += 1;
  syncSockets(gem);
  ctx.emit({ t: 'info', text: `${activeGemDef(gem.gemId).name} gained a support socket`, tone: 'good' });
  return null;
}

// ---------- per-skill numbers ----------

/** All socketed supports' modifiers added together. */
export interface CombinedMods {
  moreDamage: number;
  morePhys: number;
  moreElem: number;
  noElemental: boolean;
  extras: NonNullable<SupportMods['extra']>[];
  attackSpeed: number;
  castSpeed: number;
  manaMult: number;
  critChance: number;
  critMulti: number;
  lifeLeech: number;
  manaLeech: number;
  repeats: number;
  repeatDamage: number;
  chains: number;
  durationPct: number;
  specials: Set<string>;
}

export function combineMods(list: SupportMods[]): CombinedMods {
  const out: CombinedMods = {
    moreDamage: 0, morePhys: 0, moreElem: 0, noElemental: false, extras: [], attackSpeed: 0, castSpeed: 0,
    manaMult: 1, critChance: 0, critMulti: 0, lifeLeech: 0, manaLeech: 0, repeats: 0, repeatDamage: 100,
    chains: 0, durationPct: 0, specials: new Set(),
  };
  for (const m of list) {
    out.moreDamage += m.moreDamage ?? 0;
    out.morePhys += m.morePhys ?? 0;
    out.moreElem += m.moreElem ?? 0;
    out.noElemental ||= !!m.noElemental;
    if (m.extra) out.extras.push(m.extra);
    out.attackSpeed += m.attackSpeed ?? 0;
    out.castSpeed += m.castSpeed ?? 0;
    out.manaMult *= m.manaMult ?? 1;
    out.critChance += m.critChance ?? 0;
    out.critMulti += m.critMulti ?? 0;
    out.lifeLeech += m.lifeLeech ?? 0;
    out.manaLeech += m.manaLeech ?? 0;
    out.repeats += m.repeats ?? 0;
    if (m.repeatDamage) out.repeatDamage = Math.min(out.repeatDamage, m.repeatDamage);
    out.chains += m.chains ?? 0;
    out.durationPct += m.durationPct ?? 0;
    if (m.special) out.specials.add(m.special);
  }
  return out;
}

export interface SkillNumbers {
  def: ActiveGemDef;
  level: number;
  mods: CombinedMods;
  manaCost: number;
  cooldownMs: number;
  actionMs: number;
  durationMult: number;
}

/** Everything the combat engine needs to know about one skill on the bar. */
export function skillNumbers(d: Derived, gem: SkillGemInstance | null): SkillNumbers {
  const def = gem ? activeGemDef(gem.gemId) : DEFAULT_ATTACK;
  const level = gem?.level ?? 1;
  const mods = combineMods((gem?.supports ?? []).filter(Boolean).map((x) => supportGemDef(x!.supportId).mods));
  const isAttack = def.tags.includes('attack');
  // each skill has its own base attack or cast time; attack speed or cast speed shortens it
  const dexSkill = def.id === 'twin_strike' || def.id === 'lacerate' ? d.raw.dexSkillSpeed : 0;
  const speed = isAttack ? d.attackSpeed * (1 + (mods.attackSpeed + dexSkill) / 100) : d.castSpeed * (1 + mods.castSpeed / 100);
  const actionMs = def.timeMs / speed;
  // mana cost grows a little with gem level, like PoE
  const r = d.raw;
  const manaCost = Math.round(
    def.manaCost * (1 + 0.04 * (level - 1)) * mods.manaMult * (1 - r.manaCostReduction / 100) * (r.arcaneRecursion ? 1.5 : 1),
  );
  const isGuard = def.role === 'guard';
  const cooldownSpeed = 1 + (r.cooldownRecovery + (isGuard ? r.guardCooldown : 0) + (r.arcaneRecursion ? 40 : 0)) / 100;
  return {
    def,
    level,
    mods,
    manaCost: Math.max(0, manaCost),
    cooldownMs: def.cooldownMs / cooldownSpeed,
    actionMs,
    durationMult: (1 + mods.durationPct / 100) * (1 + (r.skillDuration + (isGuard ? r.guardDuration : 0)) / 100),
  };
}

/** Scaling of a gem's own numbers with its level. */
export function weaponPctAt(def: ActiveGemDef, level: number): number {
  return (def.effect.weaponPct ?? 100) + 3 * (level - 1);
}

/** Spells also deal your flat added elemental damage (gear, wand implicits) at this effectiveness. */
export const SPELL_ADDED_EFFECTIVENESS = 0.7;

export function spellBaseAt(def: ActiveGemDef, level: number): [number, number] {
  const [lo, hi] = def.effect.base ?? [0, 0];
  const f = 1 + 0.16 * (level - 1);
  return [Math.round(lo * f), Math.round(hi * f)];
}

/** Rough per-use and per-second damage of a skill against an unresisted target, for tooltips. */
export function skillSummary(d: Derived, gem: SkillGemInstance | null): { perUse: number; perSecond: number; nums: SkillNumbers } {
  const nums = skillNumbers(d, gem);
  const { def, mods, level } = nums;
  const e = def.effect;
  if (!e.weaponPct && !e.base) return { perUse: 0, perSecond: 0, nums };
  let phys = 0;
  let elem = 0;
  if (def.tags.includes('attack')) {
    const pct = weaponPctAt(def, level) / 100;
    phys = ((d.hit.phys[0] + d.hit.phys[1]) / 2) * pct;
    elem = (['fire', 'cold', 'light'] as const).reduce((a, t) => a + ((d.hit[t][0] + d.hit[t][1]) / 2) * pct, 0);
  } else {
    const [lo, hi] = spellBaseAt(def, level);
    elem = ((lo + hi) / 2) * d.typeMult[def.effect.type ?? 'fire'];
    elem += (['fire', 'cold', 'light'] as const).reduce((a, t) => a + ((d.hit[t][0] + d.hit[t][1]) / 2) * SPELL_ADDED_EFFECTIVENESS, 0);
  }
  if (mods.noElemental) elem = 0;
  const extra = mods.extras.reduce((a, x) => a + x.pct, 0) / 100;
  elem += (phys + elem) * extra;
  phys *= 1 + mods.morePhys / 100;
  elem *= 1 + mods.moreElem / 100;
  let hit = (phys + elem) * (1 + mods.moreDamage / 100);
  const critChance = def.tags.includes('attack') ? d.critChance : (e.crit ?? 5) * (1 + (d.raw.critChancePct + mods.critChance) / 100);
  hit *= 1 + (Math.min(95, critChance) / 100) * ((d.critMulti + mods.critMulti) / 100 - 1);
  const hits = (e.hits ?? 1) * (1 + (mods.repeats * mods.repeatDamage) / 100);
  const ailment = e.ailment ? (e.ailment.pctPerSec / 100) * (e.ailment.durationMs / 1000) * nums.durationMult : 0;
  const perUse = hit * hits * (1 + ailment);
  const time = Math.max(nums.actionMs, nums.cooldownMs);
  return { perUse, perSecond: (perUse / time) * 1000, nums };
}
