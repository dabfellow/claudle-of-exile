import {
  activeGemDef,
  gemWeapons,
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
import { accountUid } from './items';
import { deriveStats, hitChance, type Attributes, type Derived } from './stats';
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
 * A skill gem needs its own attribute, more as it levels: 8 at gem level 1, 77 at 10 and 155 at 20.
 * This leaves room for an off-attribute gem when the build invests in travel attributes or gear without
 * making its requirement consume the entire build. `gemAttrMult` lifts the strongest gems to 178 at level 20.
 */
export const GEM_ATTR_MAX_REQ = 155;

export function gemAttrReq(gemId: string, level: number): number {
  const progress = (Math.max(1, Math.min(MAX_GEM_LEVEL, level)) - 1) / (MAX_GEM_LEVEL - 1);
  return Math.floor((8 + (GEM_ATTR_MAX_REQ - 8) * progress) * gemAttrMult(gemId));
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
  const need = gemWeapons(activeGemDef(gemId));
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
  for (const gem of [...s.skillBar, ...(s.unpooled?.gems ?? [])]) {
    if (!gem) continue;
    while (gem.level > 1 && gemLevelReq(gem.gemId, gem.level) > charLvl) gem.level -= 1;
    const act = activeGemDef(gem.gemId);
    const slots = supportSlots(gem);
    gem.supports = gem.supports.map((sup, i) => {
      if (!sup || (i < slots && supportFits(supportGemDef(sup.supportId), act))) return sup;
      // this runs before the account is attached, so it waits to be handed over
      ((s.unpooled ??= {}).supportGems ??= []).push(sup);
      return null;
    });
    gem.supports.length = Math.min(gem.supports.length, slots);
    syncSockets(gem);
  }
}

/** Each chain hop deals this much less than the one before (15% of the full hit), down to a floor of 20% of it. */
export const CHAIN_FALLOFF = 0.15;
export const CHAIN_FLOOR = 0.2;

/** The share of a full hit the chain's `hop`th enemy takes (0 is the target itself). */
export function chainFalloff(hop: number): number {
  return Math.max(CHAIN_FLOOR, 1 - CHAIN_FALLOFF * hop);
}

/** How many more enemies a chaining skill reaches at this gem level (Spark: 2, then 3 at 7, 4 at 13, 5 at 19). */
export function gemChains(def: ActiveGemDef, level: number): number {
  return (def.effect.chains ?? 0) + (def.effect.chainsAt ?? []).filter((l) => level >= l).length;
}

export function supportSlots(gem: SkillGemInstance): number {
  return Math.min(MAX_SUPPORT_SLOTS, Math.min(4, 1 + Math.floor(gem.level / 5)) + gem.extraSlots);
}

/** Gems on the skill bar share the character's xp. Levels stall until the character catches up. */
export function grantGemXp(s: GameState, ctx: Ctx, amount: number, attrs: Attributes = deriveStats(s, []).attributes): void {
  amount *= Math.max(ctx.event?.xp ?? 1, ctx.event?.combatXp ?? 1);
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
  return { uid: accountUid(s), gemId, level, xp: gemXpForLevel(level), supports: [null], extraSlots: 0, rules: [{ when: 'manual' }], priority: 'normal' };
}

export function createSupportGem(s: GameState, supportId: string): SupportGemInstance {
  supportGemDef(supportId);
  return { uid: accountUid(s), supportId };
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
  return s.skillBar.find((g) => g?.uid === uid) ?? s.account.gems.find((g) => g.uid === uid);
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
  const fromBag = s.account.gems.findIndex((g) => g.uid === gemUid);
  if (fromBag < 0) return 'Gem not found';
  const reason = gemUseReason(characterLevel(s), deriveStats(s, []).attributes, s.account.gems[fromBag]);
  if (reason) return reason;
  const [gem] = s.account.gems.splice(fromBag, 1);
  const current = s.skillBar[slot];
  if (current) s.account.gems.push(current);
  s.skillBar[slot] = gem;
  return null;
}

export function removeFromBar(s: GameState, slot: number): void {
  const gem = s.skillBar[slot];
  if (!gem) return;
  s.skillBar[slot] = null;
  s.account.gems.push(gem);
}

/** Spare level 1 skill gems the stash can clear: none with Expansion sockets or in a saved skill set. */
export function clearableGems(s: GameState): SkillGemInstance[] {
  const saved = new Set(s.loadouts.skills.flatMap((set) => set.slots.map((x) => x?.gem)));
  return s.account.gems.filter((g) => g.level === 1 && !g.extraSlots && !saved.has(g.uid));
}

/** Throw away spare level 1 skill gems (the Gem shop sells them all). Their supports go back to the loose pile. */
export function clearLevelOneGems(s: GameState): number {
  const gone = clearableGems(s);
  for (const gem of gone) gem.supports.forEach((_, socket) => unsocketSupport(s, gem.uid, socket));
  s.account.gems = s.account.gems.filter((g) => !gone.includes(g));
  return gone.length;
}

export function socketSupport(s: GameState, gemUid: number, supportUid: number, socket: number): string | null {
  const gem = findSkillGem(s, gemUid);
  if (!gem) return 'Gem not found';
  syncSockets(gem);
  if (socket < 0 || socket >= supportSlots(gem)) return 'No such socket';
  const idx = s.account.supportGems.findIndex((x) => x.uid === supportUid);
  if (idx < 0) return 'Support not found';
  const reason = supportReason(gem, s.account.supportGems[idx].supportId);
  if (reason) return reason;
  const need = gemReqLevel(s.account.supportGems[idx].supportId);
  if (characterLevel(s) < need) return `Requires level ${need}`;
  const [sup] = s.account.supportGems.splice(idx, 1);
  const prev = gem.supports[socket];
  if (prev) s.account.supportGems.push(prev);
  gem.supports[socket] = sup;
  return null;
}

export function unsocketSupport(s: GameState, gemUid: number, socket: number): void {
  const gem = findSkillGem(s, gemUid);
  const sup = gem?.supports[socket];
  if (!gem || !sup) return;
  gem.supports[socket] = null;
  s.account.supportGems.push(sup);
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
  if ((s.account.bank.expansion ?? 0) < 1) return 'Requires an Orb of Expansion';
  if (gem.extraSlots >= 1 || supportSlots(gem) >= MAX_SUPPORT_SLOTS) return 'No more sockets can be added';
  s.account.bank.expansion -= 1;
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
  minionLife: number;
  minionCount: number;
  stormCount: number;
  stormSpeed: number;
  durationPct: number;
  cooldownPct: number;
  curseEffect: number;
  lowLifeMore: number;
  moreBleed: number;
  stunChance: number;
  stagger: number;
  windupPct: number;
  shieldMore: number;
  specials: Set<string>;
}

export function combineMods(list: SupportMods[]): CombinedMods {
  const out: CombinedMods = {
    moreDamage: 0, morePhys: 0, moreElem: 0, noElemental: false, extras: [], attackSpeed: 0, castSpeed: 0,
    manaMult: 1, critChance: 0, critMulti: 0, lifeLeech: 0, manaLeech: 0, repeats: 0, repeatDamage: 100,
    chains: 0, minionLife: 0, minionCount: 0, stormCount: 0, stormSpeed: 0, durationPct: 0, cooldownPct: 0, curseEffect: 0, lowLifeMore: 0, moreBleed: 0, stunChance: 0, stagger: 0, windupPct: 0, shieldMore: 0, specials: new Set(),
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
    out.minionLife += m.minionLife ?? 0;
    out.minionCount += m.minionCount ?? 0;
    out.stormCount += m.stormCount ?? 0;
    out.stormSpeed += m.stormSpeed ?? 0;
    out.durationPct += m.durationPct ?? 0;
    out.cooldownPct += m.cooldownPct ?? 0;
    out.curseEffect += m.curseEffect ?? 0;
    out.lowLifeMore += m.lowLifeMore ?? 0;
    out.moreBleed += m.moreBleed ?? 0;
    out.stunChance += m.stunChance ?? 0;
    out.stagger += m.stagger ?? 0;
    out.windupPct += m.windupPct ?? 0;
    out.shieldMore += m.shieldMore ?? 0;
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
  const actionMs = def.timeMs ? (def.timeMs / speed) * (1 + mods.windupPct / 100) : d.raw.overclock ? OVERCLOCK_INSTANT_MS : 0;
  // mana cost grows a little with gem level, like PoE
  const r = d.raw;
  // passive tree archetype stats (docs/PASSIVE_NOTABLES.md) join the supports' modifiers for skills with that tag
  const tags = def.tags;
  if (tags.includes('curse')) mods.curseEffect += r.curseEffect;
  if (tags.includes('storm')) {
    mods.stormCount += r.stormExtra ? 1 : 0;
    mods.stormSpeed += r.stormSpeedPct;
  }
  if (tags.includes('minion')) mods.minionCount += r.minionMax;
  if (tags.includes('shield')) mods.shieldMore += r.moreShield;
  const archetypeDuration = (tags.includes('curse') ? r.curseDuration : 0) + (tags.includes('storm') ? r.stormDuration : 0);
  const paidInMana = Math.round(
    def.manaCost * (1 + 0.04 * (level - 1)) * mods.manaMult * (1 - r.manaCostReduction / 100) * (r.arcaneRecursion ? 1.5 : 1),
  );
  // supports raise a Life cost as they raise a mana cost; Blood Price turns the mana cost into Life
  const bloodPrice = mods.specials.has('bloodprice');
  const lifeCost = Math.round((d.maxLife * (def.effect.lifePct ?? 0) * mods.manaMult) / 100) + (bloodPrice ? Math.max(0, paidInMana) * BLOOD_PRICE_LIFE_PER_MANA : 0);
  const isGuard = def.role === 'guard';
  const cooldownSpeed = 1 + (r.cooldownRecovery + (isGuard ? r.guardCooldown : 0) + (tags.includes('warcry') ? r.warcryCooldown : 0) + (r.arcaneRecursion ? 40 : 0)) / 100;
  return {
    def,
    level,
    mods,
    manaCost: bloodPrice ? 0 : Math.max(0, paidInMana),
    lifeCost,
    // nothing — stats, keystones, resets — ever takes a cooldown below the minimum
    cooldownMs: r.overclock ? MIN_COOLDOWN_MS : Math.max(MIN_COOLDOWN_MS, (def.cooldownMs * (1 - mods.cooldownPct / 100)) / cooldownSpeed),
    actionMs,
    durationMult: (1 + mods.durationPct / 100) * (1 + (r.skillDuration + (isGuard ? r.guardDuration : 0) + archetypeDuration) / 100),
  };
}

/** A minion's life grows this many % with each gem level, as a shield does. */
export const MINION_LIFE_PER_LEVEL = 3;

/** What a summon skill's minions are like right now: how many it keeps up, their life and the time between their hits. */
export function minionStats(d: Derived, nums: SkillNumbers): { count: number; life: number; attackMs: number } {
  const m = nums.def.effect.minion!;
  const { mods, level } = nums;
  const r = d.raw;
  return {
    count: m.count + mods.minionCount,
    life: Math.round(((d.maxLife * m.lifePct) / 100) * (1 + (MINION_LIFE_PER_LEVEL / 100) * (level - 1)) * (1 + r.minionLifePct / 100) * (1 + mods.minionLife / 100)),
    attackMs: m.attackMs / ((1 + r.minionSpeedPct / 100) * (1 + (mods.attackSpeed + mods.castSpeed) / 100)),
  };
}

/** How a storm from this skill strikes right now. */
export function stormStats(nums: SkillNumbers): { max: number; everyMs: number; durationMs: number } {
  const st = nums.def.effect.storm!;
  return { max: st.max + nums.mods.stormCount, everyMs: st.everyMs / (1 + nums.mods.stormSpeed / 100), durationMs: st.durationMs * nums.durationMult };
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

/**
 * A spell's base damage grows with each gem level by a step that starts at 12% (gem level 2) and shrinks evenly to
 * 8% (gem level 20): about 2.9x at level 20. Spells used to grow a flat 16% a level, which with late wands let them
 * outrun every attack.
 */
export function spellGrowth(level: number): number {
  const steps = Math.max(0, level - 1);
  return 1 + SPELL_STEP_FIRST * steps - ((SPELL_STEP_FIRST - SPELL_STEP_LAST) / (MAX_GEM_LEVEL - 2)) * ((steps * (steps - 1)) / 2);
}
const SPELL_STEP_FIRST = 0.12;
const SPELL_STEP_LAST = 0.08;

export function spellBaseAt(def: ActiveGemDef, level: number): [number, number] {
  const [lo, hi] = def.effect.base ?? [0, 0];
  const f = spellGrowth(level);
  return [Math.round(lo * f), Math.round(hi * f)];
}

/** A burn carries this % of the fire damage behind it, over this long. */
export const BURN_SHARE = 25;
export const BURN_MS = 4000;
/** An ignite carries this % of the burn built up to set it off, over this long. */
export const IGNITE_SHARE = 50;
export const IGNITE_MS = 6000;

type AilmentKind = 'bleed' | 'poison' | 'ignite' | 'burn';

/** An ailment's share of a hit per second and its time, with the player's ailment modifiers. */
export function ailmentNumbers(d: Derived, nums: SkillNumbers, a: { kind: AilmentKind; pctPerSec: number; durationMs: number }): { pctPerSec: number; durationMs: number } {
  const r = d.raw;
  // burns are ignites' smaller kin: the same stats scale both
  const kindPct = a.kind === 'bleed' ? r.bleedPct : a.kind === 'poison' ? r.poisonPct : r.ignitePct;
  const kindDur = a.kind === 'bleed' ? r.bleedDuration : a.kind === 'poison' ? r.poisonDuration : r.igniteDuration;
  const flatDur = a.kind === 'bleed' ? r.bleedDurationFlat : a.kind === 'poison' ? r.poisonDurationFlat : 0;
  const bleedMore = a.kind === 'bleed' ? 1 + nums.mods.moreBleed / 100 : 1;
  return {
    pctPerSec: a.pctPerSec * (1 + (kindPct + r.ailmentPct) / 100) * bleedMore,
    durationMs: a.durationMs * nums.durationMult * (1 + (r.ailmentDuration + kindDur) / 100) + flatDur,
  };
}

/**
 * Average per-use and per-second damage of a skill against an unresisted target of your level, for tooltips and
 * gear comparison. It follows rollHit's standing modifiers and leaves out ones that come and go in a fight.
 */
export function skillSummary(d: Derived, gem: SkillGemInstance | null): { perUse: number; perSecond: number; nums: SkillNumbers } {
  const nums = skillNumbers(d, gem);
  const { def, mods, level } = nums;
  const e = def.effect;
  if (!e.weaponPct && !e.base) return { perUse: 0, perSecond: 0, nums };
  const r = d.raw;
  const isAttack = def.tags.includes('attack');
  const isSpell = def.tags.includes('spell');
  let phys = 0;
  let elem = 0;
  let fire = 0;
  if (isAttack) {
    const pct = weaponPctAt(def, level) / 100;
    phys = ((d.hit.phys[0] + d.hit.phys[1]) / 2) * pct;
    elem = (['fire', 'cold', 'light', 'chaos'] as const).reduce((a, t) => a + ((d.hit[t][0] + d.hit[t][1]) / 2) * pct, 0);
    fire = ((d.hit.fire[0] + d.hit.fire[1]) / 2) * pct;
    if (e.convert) {
      const moved = phys * (Math.min(100, e.convert.pct + (def.id === 'judgement_hammer' ? r.hammerConvert : 0)) / 100);
      phys -= moved;
      elem += (moved / d.physMult) * d.typeMult[e.convert.type];
      if (e.convert.type === 'fire') fire += (moved / d.physMult) * d.typeMult.fire;
    }
  } else {
    const [lo, hi] = spellBaseAt(def, level);
    elem = ((lo + hi) / 2 + (nums.lifeCost * (e.lifeToDamage ?? 0)) / 100) * d.typeMult[e.type ?? 'fire'];
    for (const t of ['fire', 'cold', 'light'] as const) {
      elem += (((d.hit[t][0] + d.hit[t][1]) / 2) * SPELL_ADDED_EFFECTIVENESS + (d.spellHit[t][0] + d.spellHit[t][1]) / 2) * (e.addedShare ?? 1);
    }
    if (e.type === 'fire') fire = elem;
  }
  const fireShare = phys + elem > 0 ? fire / (phys + elem) : 0;
  const ranged = isAttack && d.ranged;
  if (def.tags.includes('melee') && !ranged) phys *= 1 + r.meleePct / 100;
  const inc = 1 + ((def.tags.includes('projectile') || ranged ? r.projectilePct : 0) + (isSpell ? r.spellPct : 0)) / 100;
  phys *= inc;
  elem *= inc;
  if (mods.noElemental) elem = 0;
  const extra = mods.extras.reduce((a, x) => a + x.pct, 0) / 100;
  elem += (phys + elem) * extra;
  elem += (phys * r.physAsLight) / 100;
  phys *= 1 + mods.morePhys / 100;
  elem *= 1 + mods.moreElem / 100;
  let hit = (phys + elem) * (1 + mods.moreDamage / 100);
  const critChance = isAttack
    ? d.critChance * (1 + mods.critChance / 100)
    : (e.crit ?? 5) * (1 + (r.critChancePct + r.spellCritPct + (e.type === 'light' ? r.lightCrit : 0) + mods.critChance) / 100);
  const critMulti = d.critMulti + mods.critMulti + (isAttack ? 0 : r.spellCritMulti);
  hit *= 1 + ((r.steadyHand ? 0 : Math.min(95, critChance)) / 100) * (critMulti / 100 - 1);
  if (isAttack && !r.steadyHand && !r.knifesEdge) hit *= hitChance(d.accuracy, d.combatLevel);
  const extraHits = (def.id === 'pummel' ? r.pummelHits : 0) + (def.id === 'barrage' ? r.barrageArrows + (mods.specials.has('volley') ? 1 : 0) : 0);
  const hits = ((e.hits ?? 1) + extraHits) * (1 + (mods.repeats * mods.repeatDamage) / 100);
  const ailment = e.ailment ? ailmentNumbers(d, nums, e.ailment) : null;
  // burns and the ignites they build to come to a steady share of the fire dealt, as often as they're applied
  const burn = ailmentNumbers(d, nums, { kind: 'burn', pctPerSec: 100, durationMs: 1000 });
  const burnChance = Math.min(100, (e.ailmentChance ?? 0) + r.burnChance) / 100;
  const burnShare = burnChance * fireShare * ((BURN_SHARE + IGNITE_SHARE) / 100) * (burn.pctPerSec / 100) * (burn.durationMs / 1000);
  // an ailment works from the whole hit, so what it adds is a share of the hit
  const ailmentShare = (ailment ? (ailment.pctPerSec / 100) * (ailment.durationMs / 1000) : 0) + burnShare;
  const perUse = hit * hits * (1 + ailmentShare);
  // what a minion or storm does keeps going after the cast: its damage per second is how often it strikes, not how often you press
  if (e.minion) {
    const m = minionStats(d, nums);
    return { perUse, perSecond: ((perUse * (1 + r.minionPct / 100) * m.count) / m.attackMs) * 1000, nums };
  }
  if (e.storm) {
    const st = stormStats(nums);
    return { perUse, perSecond: ((perUse * st.max) / st.everyMs) * 1000, nums };
  }
  const time = Math.max(nums.actionMs, nums.cooldownMs);
  // poisons stack; only the strongest bleed or ignite runs, so using the skill faster doesn't add more of them
  const dotPerSecond = !ailment || e.ailment!.kind === 'poison'
    ? (hit * hits * ailmentShare * 1000) / time
    : hit * (ailment.pctPerSec / 100) * Math.min(1, ailment.durationMs / time);
  return { perUse, perSecond: (hit * hits * 1000) / time + dotPerSecond, nums };
}
