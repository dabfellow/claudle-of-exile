import { SKILL_BAR_SLOTS, type TacticRule } from '../data/gems';
import {
  BOSS_ADDS,
  BOSS_DMG_MULT,
  BOSS_LIFE_MULT,
  BOSS_SLAM_CAST_MS,
  BOSS_SLAM_EVERY_MS,
  BOSS_SLAM_MULT,
  monsterDamage,
  monsterLife,
  MONSTER_SPEED_SCALE,
  ZONES,
  zoneDef,
  type MonsterDef,
} from '../data/zones';
import { applyDeathPenalty, characterLevel, xpLevelMultiplier } from './character';
import type { Ctx } from './context';
import { flaskStats } from './flasks';
import { grantGemXp, skillNumbers, spellBaseAt, weaponPctAt, type SkillNumbers } from './gems';
import { newUid } from './items';
import { rollLoot } from './loot';
import { chance, pick, rInt } from './rng';
import { grantXp } from './skills';
import { armourReduction, deriveStats, evadeChance, hitChance, type Derived } from './stats';
import type { CombatRuntime, DamageType, Dot, GameState, InstillCondition, MonsterInstance } from './types';

export const SPAWN_DELAY_MS = 900;
export const DEATH_LIFE_FRACTION = 0.25;
/** each monster in a pack of 2+ is weaker; xp and loot scale with it */
export const PACK_LIFE_SCALE = 0.6;
export const PACK_DMG_SCALE = 0.65;

const DAMAGE_TYPES: DamageType[] = ['phys', 'fire', 'cold', 'light'];

// ---------- entering & leaving ----------

function newRuntime(zoneId: string): CombatRuntime {
  return {
    zoneId,
    monsters: [],
    spawnMs: SPAWN_DELAY_MS,
    actionMs: 0,
    actionTotal: 1,
    using: null,
    cooldowns: Array(SKILL_BAR_SLOTS).fill(0),
    queued: null,
    buffs: [],
    heals: [],
    shield: 0,
    shieldMax: 0,
    blocks: 0,
    evadeMs: 0,
    glacial: false,
    retaliate: false,
    ambush: false,
    flurryStacks: 0,
  };
}

export function startCombat(s: GameState, ctx: Ctx, zoneId: string): string | null {
  if (!s.unlockedZones.includes(zoneId)) return 'Zone is locked';
  s.action = { kind: 'combat', zoneId };
  s.combat = newRuntime(zoneId);
  ctx.emit({ t: 'info', text: `Entered ${zoneDef(zoneId).name}` });
  ctx.emit({ t: 'combatStart', zoneId });
  return null;
}

export function retreat(s: GameState): void {
  s.combat = null;
  s.action = null;
}

// ---------- monsters ----------

/** Base character xp for a kill, before the level-difference multiplier. */
export function monsterXp(mon: MonsterInstance): number {
  return Math.round((5 + mon.level * 3) * (mon.isBoss ? 10 : 1) * mon.scale);
}

const RESIST_BY_TYPE: Record<DamageType, Partial<MonsterInstance['res']>> = {
  phys: {},
  fire: { fire: 30 },
  cold: { cold: 30 },
  light: { light: 30 },
};

export function makeMonster(def: MonsterDef, boss: boolean, uid = 0, scale = 1): MonsterInstance {
  const life = Math.round(monsterLife(def.level) * (def.lifeMult ?? 1) * (boss ? BOSS_LIFE_MULT : 1) * scale);
  const dmgScale = scale < 1 ? PACK_DMG_SCALE : 1;
  return {
    uid,
    defId: def.id,
    name: def.name,
    level: def.level,
    maxLife: life,
    life,
    damage: Math.round(monsterDamage(def.level) * (def.dmgMult ?? 1) * (boss ? BOSS_DMG_MULT : 1) * dmgScale),
    dmgType: def.dmgType,
    attackMs: Math.round(def.attackMs * MONSTER_SPEED_SCALE),
    attackTimer: 0,
    isBoss: boss,
    slamTimer: boss ? BOSS_SLAM_EVERY_MS * 0.6 : 0,
    casting: -1,
    res: { fire: 0, cold: 0, light: 0, ...RESIST_BY_TYPE[def.dmgType] },
    dots: [],
    stunMs: 0,
    frozenMs: 0,
    vulnMs: 0,
    scale,
    dotAcc: 0,
    dotTimer: 0,
    dead: false,
  };
}

export function bossIsNext(s: GameState, zoneId: string): boolean {
  return (s.zoneKills[zoneId] ?? 0) >= zoneDef(zoneId).bossEvery;
}

export function aliveMonsters(c: CombatRuntime): MonsterInstance[] {
  return c.monsters.filter((m) => m.life > 0);
}

function spawnPack(s: GameState, ctx: Ctx): void {
  const c = s.combat!;
  const zone = zoneDef(c.zoneId);
  const boss = bossIsNext(s, zone.id);
  const pack: MonsterInstance[] = [];
  if (boss) {
    for (let i = 0; i < BOSS_ADDS; i++) pack.push(makeMonster(pick(ctx.rng, zone.monsters), false, newUid(s), PACK_LIFE_SCALE));
    pack.push(makeMonster(zone.boss, true, newUid(s)));
  } else {
    const [lo, hi] = zone.packSize;
    const n = rInt(ctx.rng, lo, hi);
    const scale = n > 1 ? PACK_LIFE_SCALE : 1;
    for (let i = 0; i < n; i++) pack.push(makeMonster(pick(ctx.rng, zone.monsters), false, newUid(s), scale));
  }
  c.monsters = pack;
  const lead = pack[pack.length - 1];
  ctx.emit({ t: 'spawn', name: boss ? lead.name : pack.length > 1 ? `${pack.length} monsters` : lead.name, boss });
  if (boss) triggerInstilled(s, ctx, 'bossCast');
}

/** Damage a monster hit does to the player after mitigation. */
export function mitigate(d: Derived, raw: number, type: DamageType): number {
  if (type === 'phys') return Math.max(1, Math.round(raw * (1 - armourReduction(d.armour, raw))));
  const res = d.res[type];
  return Math.max(1, Math.round(raw * (1 - res / 100)));
}

// ---------- flasks ----------

export function flaskActive(s: GameState, flaskId: string): boolean {
  return !!s.combat?.buffs.some((b) => b.source === 'flask' && b.id === flaskId);
}

export function useFlask(s: GameState, ctx: Ctx, slot: number, auto = false): string | null {
  const f = s.flaskSlots[slot];
  if (!f) return 'Empty slot';
  if (!s.combat) return 'Only usable in combat';
  const st = flaskStats(f);
  if (f.charges < st.chargesPerUse) return 'Not enough charges';
  const d = deriveStats(s);
  f.charges -= st.chargesPerUse;
  const effect = (1 + d.flaskEffect / 100) * st.effectMult;
  const c = s.combat;
  c.buffs = c.buffs.filter((b) => !(b.source === 'flask' && b.id === f.flaskId));
  c.buffs.push({ id: f.flaskId, source: 'flask', remainingMs: st.durationMs, durationMs: st.durationMs, mult: st.effectMult });
  if (st.def.heal) {
    const resource = st.def.kind === 'mana' ? 'mana' : 'life';
    c.heals.push({ resource, perMs: (st.def.heal * effect) / st.durationMs, remainingMs: st.durationMs });
  }
  ctx.emit({ t: 'flask', slot, flaskId: f.flaskId, auto });
  return null;
}

function triggerInstilled(s: GameState, ctx: Ctx, cond: InstillCondition): void {
  s.flaskSlots.forEach((f, i) => {
    if (!f || f.instill !== cond) return;
    if (flaskActive(s, f.flaskId)) return;
    useFlask(s, ctx, i, true);
  });
}

function gainCharges(s: GameState, amount: number, d: Derived): void {
  for (const f of s.flaskSlots) {
    if (!f) continue;
    const st = flaskStats(f);
    f.charges = Math.min(st.maxCharges, f.charges + amount * (1 + d.flaskCharges / 100) * st.gainMult);
  }
}

// ---------- tactics ----------

export interface RuleContext {
  lifePct: number;
  manaPct: number;
  enemies: number;
  targetLifePct: number;
  casting: boolean;
  boss: boolean;
}

export function ruleContext(s: GameState, d: Derived): RuleContext {
  const alive = s.combat ? aliveMonsters(s.combat) : [];
  const target = alive[0];
  return {
    lifePct: (s.life / d.maxLife) * 100,
    manaPct: d.maxMana ? (s.mana / d.maxMana) * 100 : 0,
    enemies: alive.length,
    targetLifePct: target ? (target.life / target.maxLife) * 100 : 0,
    casting: alive.some((m) => m.casting >= 0),
    boss: alive.some((m) => m.isBoss),
  };
}

/** Whether a skill's own effect is currently up (buff, guard, or its ailment on the target). */
export function skillIsActive(c: CombatRuntime, gemId: string): boolean {
  if (c.buffs.some((b) => b.source === 'skill' && b.id === gemId)) return true;
  if (gemId === 'iron_guard' && c.blocks > 0) return true;
  if (gemId === 'smoke_step' && c.evadeMs > 0) return true;
  if (gemId === 'frost_ward' && c.shield > 0) return true;
  const target = aliveMonsters(c)[0];
  return !!target?.dots.some((x) => x.gemId === gemId);
}

export function ruleAllows(rule: TacticRule, rc: RuleContext, active: boolean): boolean {
  const v = rule.value ?? 0;
  switch (rule.when) {
    case 'always':
      return true;
    case 'manual':
      return false;
    case 'enemyCasting':
      return rc.casting;
    case 'lifeBelow':
      return rc.lifePct < v;
    case 'manaAbove':
      return rc.manaPct > v;
    case 'enemiesAtLeast':
      return rc.enemies >= v;
    case 'targetLifeAbove':
      return rc.targetLifePct > v;
    case 'notActive':
      return !active;
    case 'bossOnly':
      return rc.boss;
  }
}

/** Cast a skill-bar slot at the next opportunity, ignoring its rule. */
export function queueSkill(s: GameState, slot: number): string | null {
  if (!s.combat) return 'Not in combat';
  const gem = s.skillBar[slot];
  if (!gem) return 'Empty slot';
  if (s.combat.cooldowns[slot] > 0) return 'On cooldown';
  s.combat.queued = slot;
  return null;
}

function ready(s: GameState, slot: number, nums: SkillNumbers): boolean {
  return s.combat!.cooldowns[slot] <= 0 && s.mana >= nums.manaCost;
}

/** Pick what to do next: a queued manual cast, else the first slot whose rule passes, else a default attack. */
export function chooseSkill(s: GameState, d: Derived): { slot: number; nums: SkillNumbers; manual: boolean } {
  const c = s.combat!;
  if (c.queued !== null) {
    const slot = c.queued;
    const gem = s.skillBar[slot];
    const nums = skillNumbers(d, gem);
    c.queued = null;
    if (gem && ready(s, slot, nums)) return { slot, nums, manual: true };
  }
  const rc = ruleContext(s, d);
  for (let i = 0; i < s.skillBar.length; i++) {
    const gem = s.skillBar[i];
    if (!gem) continue;
    const nums = skillNumbers(d, gem);
    if (!ready(s, i, nums)) continue;
    if (ruleAllows(gem.rule, rc, skillIsActive(c, gem.gemId))) return { slot: i, nums, manual: false };
  }
  return { slot: -1, nums: skillNumbers(d, null), manual: false };
}

// ---------- damage ----------

type ByType = Record<DamageType, number>;

function moreDamageFromBuffs(c: CombatRuntime): number {
  return c.buffs.reduce((a, b) => a + (b.moreDamage ?? 0), 0);
}

/** Roll one hit of a skill. Returns null for a missed attack. */
function rollHit(s: GameState, ctx: Ctx, d: Derived, nums: SkillNumbers, mon: MonsterInstance): { byType: ByType; crit: boolean } | null {
  const c = s.combat!;
  const { def, mods, level } = nums;
  const isAttack = def.tags.includes('attack');
  if (isAttack && !c.ambush && !chance(ctx.rng, hitChance(d.accuracy, mon.level))) return null;

  const byType: ByType = { phys: 0, fire: 0, cold: 0, light: 0 };
  if (isAttack) {
    const pct = weaponPctAt(def, level) / 100;
    for (const t of DAMAGE_TYPES) {
      const [lo, hi] = d.hit[t];
      if (hi > 0) byType[t] += rInt(ctx.rng, lo, hi) * pct;
    }
  } else {
    const [lo, hi] = spellBaseAt(def, level);
    const type = def.effect.type ?? 'fire';
    byType[type] += rInt(ctx.rng, lo, hi) * (type === 'phys' ? d.physMult : d.elemMult);
  }

  if (mods.noElemental) byType.fire = byType.cold = byType.light = 0;
  const total = DAMAGE_TYPES.reduce((a, t) => a + byType[t], 0);
  for (const x of mods.extras) byType[x.type] += (total * x.pct) / 100;
  byType.phys *= 1 + mods.morePhys / 100;
  for (const t of ['fire', 'cold', 'light'] as const) byType[t] *= 1 + mods.moreElem / 100;
  const more = (1 + mods.moreDamage / 100) * (1 + moreDamageFromBuffs(c) / 100);
  for (const t of DAMAGE_TYPES) byType[t] *= more;

  let critChance = isAttack
    ? d.critChance * (1 + mods.critChance / 100)
    : (def.effect.crit ?? 5) * (1 + (d.raw.critChancePct + mods.critChance) / 100);
  critChance = Math.min(95, critChance);
  let crit = chance(ctx.rng, critChance / 100);
  if (isAttack && c.ambush) {
    crit = true;
    c.ambush = false;
  }
  if (crit) {
    const multi = (d.critMulti + mods.critMulti) / 100;
    for (const t of DAMAGE_TYPES) byType[t] *= multi;
  }
  return { byType, crit };
}

function mainType(byType: ByType): DamageType {
  return DAMAGE_TYPES.reduce((best, t) => (byType[t] > byType[best] ? t : best), 'phys' as DamageType);
}

function applyDot(mon: MonsterInstance, dot: Dot): void {
  if (dot.kind === 'poison') {
    mon.dots.push(dot);
    return;
  }
  // bleed / ignite: only the strongest of each kind applies
  const existing = mon.dots.find((x) => x.kind === dot.kind);
  if (!existing) mon.dots.push(dot);
  else if (dot.dps >= existing.dps) Object.assign(existing, dot);
}

/** Apply a rolled hit to one monster, with its resistances and the skill's on-hit effects. */
function hitMonster(s: GameState, ctx: Ctx, d: Derived, nums: SkillNumbers, mon: MonsterInstance, byType: ByType, crit: boolean, factor: number): number {
  const c = s.combat!;
  const { def, mods } = nums;
  const e = def.effect;
  let dealt = 0;
  for (const t of DAMAGE_TYPES) {
    let amt = byType[t] * factor;
    if (t !== 'phys') amt *= 1 - mon.res[t] / 100;
    dealt += amt;
  }
  if (mon.vulnMs > 0) dealt *= 1.15;
  if (mods.specials.has('shatter') && mon.stunMs > 0) dealt *= 1.3;
  dealt = Math.max(1, Math.round(dealt));
  mon.life -= dealt;
  ctx.emit({ t: 'hit', target: 'monster', amount: dealt, crit, dmgType: mainType(byType), monsterUid: mon.uid });

  // leech
  const lifeLeech = d.leechPct + mods.lifeLeech + (e.leechLife ?? 0);
  if (lifeLeech > 0) {
    const gain = (dealt * lifeLeech) / 100;
    const overflow = s.life + gain - d.maxLife;
    s.life = Math.min(d.maxLife, s.life + gain);
    if (overflow > 0 && mods.specials.has('soultap')) {
      c.shield = Math.min(d.maxLife * 0.5, c.shield + overflow);
      c.shieldMax = Math.max(c.shieldMax, c.shield);
    }
  }
  const manaLeech = mods.manaLeech + (e.leechMana ?? 0);
  if (manaLeech > 0) s.mana = Math.min(d.maxMana, s.mana + (dealt * manaLeech) / 100);

  // stun / armour break
  if (e.stunChance && chance(ctx.rng, e.stunChance)) mon.stunMs = Math.max(mon.stunMs, mon.isBoss ? 400 : 1000);
  if (mods.specials.has('shatter')) mon.vulnMs = 4000;

  // ailments
  if (e.ailment) {
    const a = e.ailment;
    const dot: Dot = {
      kind: a.kind,
      dps: (dealt * a.pctPerSec) / 100,
      remainingMs: a.durationMs * nums.durationMult,
      dealt: 0,
      gemId: def.id,
      burst: mods.specials.has('hemorrhage') ? 0.5 : undefined,
      spreads: mods.specials.has('virulence') || undefined,
    };
    applyDot(mon, dot);
    if (a.kind === 'ignite' && mods.specials.has('inferno')) {
      for (const other of aliveMonsters(c)) if (other !== mon) applyDot(other, { ...dot });
    }
  }
  return dealt;
}

function performSkill(s: GameState, ctx: Ctx, d: Derived, slot: number, nums: SkillNumbers, manual: boolean): void {
  const c = s.combat!;
  const { def, mods, level } = nums;
  const e = def.effect;
  c.using = def.id;
  s.mana -= nums.manaCost;
  if (slot >= 0 && def.cooldownMs) c.cooldowns[slot] = def.cooldownMs;
  if (slot >= 0) ctx.emit({ t: 'skill', slot, gemId: def.id, manual });

  // utility effects
  if (e.blocks) {
    c.blocks = Math.max(c.blocks, e.blocks);
    c.retaliate = mods.specials.has('retaliate');
  }
  if (e.evadeMs) {
    c.evadeMs = e.evadeMs * nums.durationMult;
    if (mods.specials.has('ambush')) c.ambush = true;
  }
  if (e.shieldPct) {
    c.shield = (d.maxLife * e.shieldPct * (1 + 0.03 * (level - 1))) / 100;
    c.shieldMax = c.shield;
    c.glacial = mods.specials.has('glacial');
  }
  if (e.buff) {
    const dur = e.buff.durationMs * nums.durationMult;
    c.buffs = c.buffs.filter((b) => !(b.source === 'skill' && b.id === def.id));
    c.buffs.push({
      id: def.id,
      source: 'skill',
      remainingMs: dur,
      durationMs: dur,
      stats: e.buff.stats,
      moreDamage: e.buff.moreDamage ? e.buff.moreDamage + (level - 1) : undefined,
      regenPct: mods.specials.has('rally') ? 2 : undefined,
    });
  }
  if (e.interrupts) {
    for (const m of aliveMonsters(c)) {
      if (m.casting < 0) continue;
      m.casting = -1;
      m.slamTimer = BOSS_SLAM_EVERY_MS;
      if (mods.specials.has('rally')) m.stunMs = Math.max(m.stunMs, 1000);
      ctx.emit({ t: 'interrupt', name: m.name });
    }
  }

  // Flurry ramps attack speed on consecutive Twin Strikes
  if (def.id === 'twin_strike' && mods.specials.has('flurry')) c.flurryStacks = Math.min(5, c.flurryStacks + 1);
  else c.flurryStacks = 0;

  if (!e.weaponPct && !e.base) return;

  let passes = 1 + mods.repeats;
  if (mods.specials.has('aftershock') && chance(ctx.rng, 0.35)) passes += 1;
  const hitsPerPass = (e.hits ?? 1) + (def.id === 'twin_strike' && mods.specials.has('flurry') ? 1 : 0);

  for (let pass = 0; pass < passes; pass++) {
    const passMult = pass === 0 ? 1 : mods.repeatDamage / 100;
    for (let h = 0; h < hitsPerPass; h++) {
      const alive = aliveMonsters(c);
      if (!alive.length) return;
      const target = alive[0];
      let targets: MonsterInstance[];
      if (e.targets === 'all') targets = alive;
      else {
        const chains = (e.targets === 'chain' ? (e.chains ?? 0) : 0) + mods.chains;
        targets = alive.slice(0, 1 + chains);
      }
      const roll = rollHit(s, ctx, d, nums, target);
      if (!roll) {
        ctx.emit({ t: 'hit', target: 'monster', amount: 0, dmgType: 'phys', evaded: true, monsterUid: target.uid });
        continue;
      }
      targets.forEach((m, i) => {
        const chainMult = mods.specials.has('overload') ? 1 + 0.2 * i : 1;
        hitMonster(s, ctx, d, nums, m, roll.byType, roll.crit, passMult * chainMult);
      });
    }
  }
}

// ---------- kills & death ----------

function onMonsterDeath(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance): void {
  const c = s.combat!;
  const zone = zoneDef(c.zoneId);
  ctx.emit({ t: 'kill', name: mon.name, boss: mon.isBoss });
  s.lifetime.kills += 1;
  const xp = monsterXp(mon) * xpLevelMultiplier(characterLevel(s), mon.level);
  grantXp(s, ctx, 'combat', xp);
  grantGemXp(s, ctx, xp);
  gainCharges(s, mon.isBoss ? 8 : 1, d);
  rollLoot(s, ctx, mon, zone, d);

  // Virulence: poisons jump to another enemy
  const spreading = mon.dots.filter((x) => x.kind === 'poison' && x.spreads && x.remainingMs > 0);
  const next = aliveMonsters(c)[0];
  if (spreading.length && next) for (const p of spreading) next.dots.push({ ...p, dealt: 0 });

  if (mon.isBoss) {
    s.lifetime.bossKills += 1;
    s.zoneKills[zone.id] = 0;
    const nextZone = ZONES.find((z) => z.tier === zone.tier + 1);
    if (nextZone && !s.unlockedZones.includes(nextZone.id)) {
      s.unlockedZones.push(nextZone.id);
      ctx.emit({ t: 'zoneUnlocked', zoneId: nextZone.id });
    }
  } else {
    s.zoneKills[zone.id] = (s.zoneKills[zone.id] ?? 0) + 1;
  }
}

/** Resolve deaths after damage; when the whole pack is down, start the respawn timer. */
function reapDead(s: GameState, ctx: Ctx, d: Derived): void {
  const c = s.combat;
  if (!c) return;
  for (const m of c.monsters) {
    if (m.life <= 0 && !m.dead) {
      m.dead = true;
      onMonsterDeath(s, ctx, d, m);
    }
  }
  if (c.monsters.length && c.monsters.every((m) => m.dead)) {
    c.monsters = [];
    c.spawnMs = SPAWN_DELAY_MS;
    c.using = null;
  }
}

function die(s: GameState, ctx: Ctx, d: Derived): void {
  s.lifetime.deaths += 1;
  // losing to a boss sends it back into hiding so the zone can be farmed again
  if (s.combat && aliveMonsters(s.combat).some((m) => m.isBoss)) s.zoneKills[s.combat.zoneId] = 0;
  const xpLost = applyDeathPenalty(s);
  ctx.emit({ t: 'death', xpLost });
  s.life = Math.max(1, Math.round(d.maxLife * DEATH_LIFE_FRACTION));
  retreat(s);
}

// ---------- incoming damage ----------

function counterAttack(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance): void {
  const nums = skillNumbers(d, null);
  const roll = rollHit(s, ctx, d, nums, mon);
  if (roll) hitMonster(s, ctx, d, nums, mon, roll.byType, roll.crit, 2);
}

function takeHit(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance, raw: number, type: DamageType, isSlam: boolean): void {
  const c = s.combat!;
  if (c.evadeMs > 0) {
    ctx.emit({ t: 'hit', target: 'player', amount: 0, dmgType: type, evaded: true, monsterUid: mon.uid });
    return;
  }
  if (c.blocks > 0) {
    c.blocks -= 1;
    ctx.emit({ t: 'hit', target: 'player', amount: 0, dmgType: type, blocked: true, monsterUid: mon.uid });
    if (c.retaliate) counterAttack(s, ctx, d, mon);
    return;
  }
  // heavy wind-ups can't be evaded by Evasion Rating — answer them with a guard, an interrupt or a flask
  if (!isSlam && chance(ctx.rng, evadeChance(d.evasion, mon.level))) {
    ctx.emit({ t: 'hit', target: 'player', amount: 0, dmgType: type, evaded: true, monsterUid: mon.uid });
    return;
  }
  let dmg = mitigate(d, raw, type);
  let absorbed = 0;
  if (c.shield > 0) {
    absorbed = Math.min(c.shield, dmg);
    c.shield -= absorbed;
    dmg -= absorbed;
    if (c.shield <= 0 && c.glacial) {
      mon.frozenMs = 2000;
      c.glacial = false;
    }
  }
  s.life -= dmg;
  ctx.emit({ t: 'hit', target: 'player', amount: dmg, dmgType: type, absorbed: absorbed || undefined, monsterUid: mon.uid });
}

// ---------- the step ----------

function tickDots(s: GameState, ctx: Ctx, dt: number): void {
  const c = s.combat!;
  for (const m of aliveMonsters(c)) {
    for (const dot of m.dots) {
      const t = Math.min(dt, dot.remainingMs);
      const dmg = (dot.dps * t) / 1000;
      m.life -= dmg;
      m.dotAcc += dmg;
      dot.dealt += dmg;
      dot.remainingMs -= dt;
      if (dot.remainingMs <= 0 && dot.burst) {
        const burst = dot.dealt * dot.burst;
        m.life -= burst;
        ctx.emit({ t: 'hit', target: 'monster', amount: Math.round(burst), crit: true, dmgType: 'phys', monsterUid: m.uid });
      }
    }
    m.dots = m.dots.filter((x) => x.remainingMs > 0);
    // report damage over time in readable once-a-second chunks
    m.dotTimer += dt;
    if (m.dotTimer >= 1000) {
      if (m.dotAcc >= 1) ctx.emit({ t: 'hit', target: 'monster', amount: Math.round(m.dotAcc), dmgType: 'phys', dot: true, monsterUid: m.uid });
      m.dotAcc = 0;
      m.dotTimer = 0;
    }
  }
}

function monsterTurn(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance, dt: number): void {
  mon.vulnMs = Math.max(0, mon.vulnMs - dt);
  if (mon.frozenMs > 0) {
    mon.frozenMs -= dt;
    return;
  }
  if (mon.stunMs > 0) {
    mon.stunMs -= dt;
    return;
  }
  if (mon.isBoss) {
    if (mon.casting >= 0) {
      mon.casting -= dt;
      if (mon.casting <= 0) {
        mon.casting = -1;
        mon.slamTimer = BOSS_SLAM_EVERY_MS;
        takeHit(s, ctx, d, mon, mon.damage * BOSS_SLAM_MULT, mon.dmgType, true);
      }
      return;
    }
    mon.slamTimer -= dt;
    if (mon.slamTimer <= 0) {
      mon.casting = BOSS_SLAM_CAST_MS;
      ctx.emit({ t: 'bossCast', name: mon.name });
      triggerInstilled(s, ctx, 'bossCast');
      return;
    }
  }
  mon.attackTimer += dt;
  if (mon.attackTimer >= mon.attackMs) {
    mon.attackTimer -= mon.attackMs;
    takeHit(s, ctx, d, mon, mon.damage * (0.85 + ctx.rng.next() * 0.3), mon.dmgType, false);
  }
}

/** Advance combat by dt ms. Returns true when active buffs may have changed (stats need recomputing). */
export function combatStep(s: GameState, ctx: Ctx, dt: number, d: Derived): boolean {
  const c = s.combat;
  if (!c) return false;

  // timers, buffs and recovery
  for (const b of c.buffs) b.remainingMs -= dt;
  const expired = c.buffs.filter((b) => b.remainingMs <= 0);
  c.buffs = c.buffs.filter((b) => b.remainingMs > 0);
  if (expired.some((b) => b.source === 'skill' && b.id === 'frost_ward')) {
    c.shield = 0;
    c.glacial = false;
  }
  for (let i = 0; i < c.cooldowns.length; i++) c.cooldowns[i] = Math.max(0, c.cooldowns[i] - dt);
  c.evadeMs = Math.max(0, c.evadeMs - dt);

  for (const h of c.heals) {
    const t = Math.min(dt, h.remainingMs);
    if (h.resource === 'mana') s.mana += h.perMs * t;
    else s.life += h.perMs * t;
    h.remainingMs -= dt;
  }
  c.heals = c.heals.filter((h) => h.remainingMs > 0);
  const regenPct = c.buffs.reduce((a, b) => a + (b.regenPct ?? 0), 0);
  s.life = Math.min(d.maxLife, s.life + ((d.lifeRegen + (d.maxLife * regenPct) / 100) * dt) / 1000);
  s.mana = Math.min(d.maxMana, s.mana + (d.manaRegen * dt) / 1000);

  // instilled flasks
  if (s.life < d.maxLife * 0.5) triggerInstilled(s, ctx, 'lowLife');
  for (let i = 0; i < s.flaskSlots.length; i++) {
    const f = s.flaskSlots[i];
    if (f?.instill === 'fullCharges' && f.charges >= flaskStats(f).maxCharges && !flaskActive(s, f.flaskId)) {
      useFlask(s, ctx, i, true);
    }
  }

  if (!c.monsters.length) {
    c.spawnMs -= dt;
    if (c.spawnMs <= 0) spawnPack(s, ctx);
    return expired.length > 0;
  }

  // damage over time
  tickDots(s, ctx, dt);
  reapDead(s, ctx, d);
  if (!s.combat || !c.monsters.length) return true;

  // the player's turn
  c.actionMs -= dt;
  if (c.actionMs <= 0) {
    const choice = chooseSkill(s, d);
    performSkill(s, ctx, d, choice.slot, choice.nums, choice.manual);
    const time = choice.nums.actionMs / (1 + 0.06 * c.flurryStacks);
    c.actionTotal = time;
    c.actionMs = Math.max(c.actionMs + time, time * 0.5);
    reapDead(s, ctx, d);
    if (!s.combat || !c.monsters.length) return true;
  }

  // the monsters' turn
  for (const m of aliveMonsters(c)) {
    monsterTurn(s, ctx, d, m, dt);
    if (s.life <= 0) break;
  }
  reapDead(s, ctx, d);
  if (s.life <= 0 && s.combat) die(s, ctx, d);
  return true;
}

// ---------- flask management ----------

export function equipFlask(s: GameState, uid: number, slot: number): void {
  const idx = s.flaskStash.findIndex((f) => f.uid === uid);
  if (idx < 0) return;
  const [f] = s.flaskStash.splice(idx, 1);
  const prev = s.flaskSlots[slot];
  if (prev) s.flaskStash.push(prev);
  s.flaskSlots[slot] = f;
}

export function unequipFlask(s: GameState, slot: number): void {
  const f = s.flaskSlots[slot];
  if (!f) return;
  s.flaskStash.push(f);
  s.flaskSlots[slot] = null;
}
