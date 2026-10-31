import {
  activeGemDef,
  DEFAULT_ATTACK,
  MAX_GEM_LEVEL,
  MAX_SUPPORT_SLOTS,
  SKILL_BAR_SLOTS,
  supportGemDef,
  type ActiveGemDef,
  gemAttrMult,
  gemReqLevel,
  type GemAttr,
  type SupportGemDef,
  type SkillPriority,
  type SupportMods,
  type SkillAim,
  type TacticRule,
} from '../data/gems';
import { WEAPON_FAMILIES, type WeaponFamily } from '../data/bases';
import { aimLockReason, ruleLockReason, ruleSlots } from './automation';
import { characterLevel } from './character';
import type { Ctx } from './context';
import { newUid } from './items';
import { deriveStats, type Attributes, type Derived } from './stats';
import type { GameState, SkillGemInstance, SupportGemInstance } from './types';

// ---------- levels ----------

/** Total gem xp needed to reach a gem level. */
export function gemXpForLevel(level: number): number {
  return Math.floor(60 * Math.pow(level - 1, 2.8));
}

/** Character level every gem needs at the maximum gem level, whatever it needs at level 1. */
export const GEM_MAX_LEVEL_REQ = 80;

/**
 * Character level a gem needs at a gem level: its own requirement at level 1 (`gemReqLevel`), rising
 * evenly to 80 at level 20. A level 1 gem's level 10 needs 38; Lacerate (35) needs 56 at level 10.
 */
export function gemLevelReq(gemId: string, level: number): number {
  const base = gemReqLevel(gemId);
  return Math.round(base + ((GEM_MAX_LEVEL_REQ - base) * (Math.max(1, level) - 1)) / (MAX_GEM_LEVEL - 1));
}

export const GEM_ATTR_NAME: Record<GemAttr, string> = { str: 'Strength', dex: 'Dexterity', int: 'Intelligence' };

/**
 * A skill gem needs its own attribute, more as it levels: 8 at gem level 1, 119 at 10, 245 at 20 (3 per
 * character level a level 1 gem needs there). That sits between a main attribute (~5 a level) and an off one
 * (~1–2.5 a level), so every class can use any gem at level 1, but an off-attribute skill stops levelling
 * unless the build invests in that attribute. `gemAttrMult` asks extra of the strongest gems.
 */
export const GEM_ATTR_PER_LEVEL = 3;

export function gemAttrReq(gemId: string, level: number): number {
  const charLevel = 1 + ((GEM_MAX_LEVEL_REQ - 1) * (Math.max(1, level) - 1)) / (MAX_GEM_LEVEL - 1);
  return Math.floor((8 + GEM_ATTR_PER_LEVEL * (charLevel - 1)) * gemAttrMult(gemId));
}

/** Why you can't use this skill gem right now (character level, then attribute), or null. */
/**
 * Why this gem can't be used right now, or null. Pass the main hand's weapon family to check the gem's
 * weapon too (leave it out to only check level and attributes, e.g. when placing it on the bar).
 */
export function gemUseReason(charLevel: number, attrs: Attributes, gem: SkillGemInstance, family?: WeaponFamily | null): string | null {
  const need = gemLevelReq(gem.gemId, gem.level);
  if (charLevel < need) return `Requires level ${need}`;
  return gemAttrReason(attrs, gem) ?? (family === undefined ? null : gemWeaponReason(gem.gemId, family));
}

/** Why the weapon in your main hand can't use this skill, or null. */
export function gemWeaponReason(gemId: string, family: WeaponFamily | null): string | null {
  const need = activeGemDef(gemId).weapons;
  if (!need || (family && need.includes(family))) return null;
  const names = need.map((f) => WEAPON_FAMILIES[f].name);
  return `Needs a ${names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0]}`;
}

/** Why you can't use this gem at its current level, or null. */
export function gemAttrReason(attrs: Attributes, gem: SkillGemInstance, level = gem.level): string | null {
  const attr = activeGemDef(gem.gemId).attr;
  const need = gemAttrReq(gem.gemId, level);
  return attrs[attr] < need ? `Requires ${need} ${GEM_ATTR_NAME[attr]}` : null;
}

/**
 * A save from before gem levels needed this much character level: gems above what the character can use
 * drop back (they keep their xp and level up again as the character catches up), extra supports leave
 * sockets that are gone, and supports that no longer fit go back to the bag.
 */
export function settleGems(s: GameState): void {
  const charLvl = characterLevel(s);
  for (const gem of [...s.skillBar, ...s.gems]) {
    if (!gem) continue;
    while (gem.level > 1 && gemLevelReq(gem.gemId, gem.level) > charLvl) gem.level -= 1;
    const act = activeGemDef(gem.gemId);
    const slots = supportSlots(gem);
    gem.supports = gem.supports.map((sup, i) => {
      if (!sup || (i < slots && supportFits(supportGemDef(sup.supportId), act))) return sup;
      s.supportGems.push(sup);
      return null;
    });
    gem.supports.length = Math.min(gem.supports.length, slots);
    syncSockets(gem);
  }
}

export function supportSlots(gem: SkillGemInstance): number {
  return Math.min(MAX_SUPPORT_SLOTS, Math.min(4, 1 + Math.floor(gem.level / 5)) + gem.extraSlots);
}

/** Gems on the skill bar share the character's xp. Levels stall until the character catches up. */
export function grantGemXp(s: GameState, ctx: Ctx, amount: number, attrs: Attributes = deriveStats(s, []).attributes): void {
  const charLvl = characterLevel(s);
  // a level waits for both the character level and the attribute it needs
  const canReach = (gem: SkillGemInstance, level: number) => charLvl >= gemLevelReq(gem.gemId, level) && !gemAttrReason(attrs, gem, level);
  for (const gem of s.skillBar) {
    if (!gem || gem.level >= MAX_GEM_LEVEL) continue;
    const next = gem.level + 1;
    const cap = gemXpForLevel(next);
    if (!canReach(gem, next)) {
      // banks up to the next level, but never takes away xp a gem already has (settleGems keeps it)
      gem.xp = Math.max(gem.xp, Math.min(cap, gem.xp + amount));
      continue;
    }
    gem.xp += amount;
    while (gem.level < MAX_GEM_LEVEL && gem.xp >= gemXpForLevel(gem.level + 1) && canReach(gem, gem.level + 1)) {
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

/** New gems are Manual only: nothing casts itself until you give it a rule (its suggested one is a click away). */
export function createSkillGem(s: GameState, gemId: string, level = 1): SkillGemInstance {
  return { uid: newUid(s), gemId, level, xp: gemXpForLevel(level), supports: [null], extraSlots: 0, rules: [{ when: 'manual' }], priority: 'normal' };
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

/** A support fits a skill with any of its `fits` tags and every one of its `needs` tags; a signature only its own skill. */
export function supportFits(support: SupportGemDef, active: ActiveGemDef): boolean {
  if (support.signatureFor) return support.signatureFor === active.id;
  return support.fits.some((t) => active.tags.includes(t)) && (support.needs ?? []).every((t) => active.tags.includes(t)) && !support.not?.some((t) => active.tags.includes(t));
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
  const reason = gemUseReason(characterLevel(s), deriveStats(s, []).attributes, s.gems[fromBag]);
  if (reason) return reason;
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
  const need = gemReqLevel(s.supportGems[idx].supportId);
  if (characterLevel(s) < need) return `Requires level ${need}`;
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

/** Set one of a skill's rules. Manual only stands alone, and a locked rule can't be picked. */
export function setRule(s: GameState, slot: number, index: number, rule: TacticRule): string | null {
  const gem = s.skillBar[slot];
  if (!gem) return 'Empty slot';
  if (index >= ruleSlots(s) || index > gem.rules.length) return 'No free rule slot';
  const locked = ruleLockReason(s, rule.when) ?? (rule.aim ? aimLockReason(s) : null);
  if (locked) return locked;
  gem.rules[index] = rule;
  if (rule.when === 'manual') gem.rules = [rule];
  return null;
}

/** Point a skill's rules at something, or back at the usual target. It sits on the first rule. */
export function setAim(s: GameState, slot: number, aim: SkillAim | undefined): string | null {
  const gem = s.skillBar[slot];
  if (!gem) return 'Empty slot';
  const locked = aim ? aimLockReason(s) : null;
  if (locked) return locked;
  gem.rules = gem.rules.map((r, i) => ({ ...r, aim: i === 0 ? aim : undefined }));
  return null;
}

export function removeRule(s: GameState, slot: number, index: number): void {
  const gem = s.skillBar[slot];
  if (gem && gem.rules.length > 1) gem.rules.splice(index, 1);
}

export function setPriority(s: GameState, slot: number, priority: SkillPriority): void {
  const gem = s.skillBar[slot];
  if (gem) gem.priority = priority;
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
  cooldownPct: number;
  curseEffect: number;
  lowLifeMore: number;
  moreBleed: number;
  specials: Set<string>;
}

export function combineMods(list: SupportMods[]): CombinedMods {
  const out: CombinedMods = {
    moreDamage: 0, morePhys: 0, moreElem: 0, noElemental: false, extras: [], attackSpeed: 0, castSpeed: 0,
    manaMult: 1, critChance: 0, critMulti: 0, lifeLeech: 0, manaLeech: 0, repeats: 0, repeatDamage: 100,
    chains: 0, durationPct: 0, cooldownPct: 0, curseEffect: 0, lowLifeMore: 0, moreBleed: 0, specials: new Set(),
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
    out.cooldownPct += m.cooldownPct ?? 0;
    out.curseEffect += m.curseEffect ?? 0;
    out.lowLifeMore += m.lowLifeMore ?? 0;
    out.moreBleed += m.moreBleed ?? 0;
    if (m.special) out.specials.add(m.special);
  }
  return out;
}

export interface SkillNumbers {
  def: ActiveGemDef;
  level: number;
  mods: CombinedMods;
  manaCost: number;
  /** life spent on each use, past energy shield */
  lifeCost: number;
  cooldownMs: number;
  actionMs: number;
  durationMult: number;
}

/** Everything the combat engine needs to know about one skill on the bar. */
export function skillNumbers(d: Derived, gem: SkillGemInstance | null): SkillNumbers {
  const def = gem ? activeGemDef(gem.gemId) : DEFAULT_ATTACK;
  const level = gem?.level ?? 1;
  const mods = combineMods(
    (gem?.supports ?? [])
      .filter((x) => x && gemReqLevel(x.supportId) <= d.combatLevel)
      .map((x) => supportGemDef(x!.supportId).mods),
  );
  const isAttack = def.tags.includes('attack');
  // each skill has its own base attack or cast time; attack speed or cast speed shortens it
  const dexSkill = def.id === 'twin_strike' || def.id === 'lacerate' ? d.raw.dexSkillSpeed : 0;
  const speed = isAttack ? d.attackSpeed * (1 + (mods.attackSpeed + dexSkill) / 100) : d.castSpeed * (1 + mods.castSpeed / 100);
  // instant skills take no time; Overclock cuts cooldowns to the minimum, so there they take half a second instead
  const actionMs = def.timeMs ? def.timeMs / speed : d.raw.overclock ? OVERCLOCK_INSTANT_MS : 0;
  // mana cost grows a little with gem level, like PoE
  const r = d.raw;
  const paidInMana = Math.round(
    def.manaCost * (1 + 0.04 * (level - 1)) * mods.manaMult * (1 - r.manaCostReduction / 100) * (r.arcaneRecursion ? 1.5 : 1),
  );
  // supports raise a Life cost as they raise a mana cost; Blood Price turns the mana cost into Life
  const bloodPrice = mods.specials.has('bloodprice');
  const lifeCost = Math.round((d.maxLife * (def.effect.lifePct ?? 0) * mods.manaMult) / 100) + (bloodPrice ? Math.max(0, paidInMana) * BLOOD_PRICE_LIFE_PER_MANA : 0);
  const isGuard = def.role === 'guard';
  const cooldownSpeed = 1 + (r.cooldownRecovery + (isGuard ? r.guardCooldown : 0) + (r.arcaneRecursion ? 40 : 0)) / 100;
  return {
    def,
    level,
    mods,
    manaCost: bloodPrice ? 0 : Math.max(0, paidInMana),
    lifeCost,
    // nothing — stats, keystones, resets — ever takes a cooldown below the minimum
    cooldownMs: r.overclock ? MIN_COOLDOWN_MS : Math.max(MIN_COOLDOWN_MS, (def.cooldownMs * (1 - mods.cooldownPct / 100)) / cooldownSpeed),
    actionMs,
    durationMult: (1 + mods.durationPct / 100) * (1 + (r.skillDuration + (isGuard ? r.guardDuration : 0)) / 100),
  };
}

/** Life Blood Price spends for each point of the mana cost it replaces. */
export const BLOOD_PRICE_LIFE_PER_MANA = 2;

/**
 * Rules won't spend Life that would leave you below this % of maximum Life, so a Life skill can be left running:
 * it's above AUTO_FLEE_AT, so paying never sets off a flight by itself. Your own press can go lower, down to 1 Life.
 */
export const LIFE_RESERVE_PCT = 40;

/** The shortest cooldown any skill can ever have, ms. Skills without a cooldown of their own get this too. */
export const MIN_COOLDOWN_MS = 100;

/** How long an instant skill takes under Overclock, whose cooldowns are only the minimum. */
export const OVERCLOCK_INSTANT_MS = 500;

/**
 * Attack gems gain this % of their own base weapon damage per level (×2.14 at level 20). It scales the
 * skill as a whole, so a 4-hit Barrage grows at the same rate as a 1-hit Heavy Strike; a flat bonus per
 * hit made multi-hit skills run away. High enough that an off-attribute attack stuck at a low level
 * (see gemAttrReq) falls well behind.
 */
export const ATTACK_PCT_PER_LEVEL = 6;

/** Scaling of a gem's own numbers with its level. */
export function weaponPctAt(def: ActiveGemDef, level: number): number {
  return (def.effect.weaponPct ?? 100) * (1 + (ATTACK_PCT_PER_LEVEL / 100) * (level - 1));
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
    if (e.convert) {
      const moved = phys * (Math.min(100, e.convert.pct + (def.id === 'judgement_hammer' ? d.raw.hammerConvert : 0)) / 100);
      phys -= moved;
      elem += (moved / d.physMult) * d.typeMult[e.convert.type];
    }
  } else {
    const [lo, hi] = spellBaseAt(def, level);
    elem = ((lo + hi) / 2 + (nums.lifeCost * (e.lifeToDamage ?? 0)) / 100) * d.typeMult[def.effect.type ?? 'fire'];
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
  const extraHits = (def.id === 'pummel' ? d.raw.pummelHits : 0) + (def.id === 'barrage' ? d.raw.barrageArrows + (mods.specials.has('volley') ? 1 : 0) : 0);
  const hits = ((e.hits ?? 1) + extraHits) * (1 + (mods.repeats * mods.repeatDamage) / 100);
  const ailment = e.ailment ? (e.ailment.pctPerSec / 100) * (e.ailment.durationMs / 1000) * nums.durationMult : 0;
  const perUse = hit * hits * (1 + ailment);
  const time = Math.max(nums.actionMs, nums.cooldownMs);
  return { perUse, perSecond: (perUse / time) * 1000, nums };
}
