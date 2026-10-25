import { SKILL_BAR_SLOTS, type TacticRule } from '../data/gems';
import {
  BOSS_ADDS,
  BOSS_DMG_MULT,
  BOSS_LIFE_MULT,
  BOSS_SLAM_DEFAULT,
  BOSS_SLAM_EVERY_MS,
  BOSS_SLAM_MULT,
  BOSS_ENRAGE_AT,
  BOSS_ENRAGE_DMG,
  BOSS_ENRAGE_SPEED,
  BOSS_NOVA_DEFAULT,
  BOSS_NOVA_EVERY_MS,
  BOSS_NOVA_MULT,
  BOSS_SUMMON_COUNT,
  BOSS_SUMMON_EVERY_MS,
  BOSS_WARD_AT,
  BOSS_WARD_HEAL,
  BOSS_WARD_MS,
  BOSS_WARD_PCT,
  monsterDamage,
  monsterLife,
  nextZone,
  zoneDef,
  type BossMechanic,
  type MonsterDef,
} from '../data/zones';
import {
  advanceMonsters,
  AUTO_FLEE_AT,
  AUTO_FLEE_RESUME,
  BOSS_CELL,
  cellCol,
  FLEE_SHAKE_MS,
  FRONT_CELL,
  freeCell,
  inReach,
  MONSTER_STEP_MS,
  MOVEMENT,
  areaCells,
  chainFrom,
  CHILLED_GROUND_SLOW,
  GROUND,
  groundFor,
  knockBack,
  layGround,
  neighbors,
  PLAYER_SPOT,
  SHOCKED_GROUND_TAKEN,
  STEP_OUT_RATE,
  type AreaShape,
} from './battlefield';
import { applyDeathPenalty, characterLevel, xpLevelMultiplier } from './character';
import type { Ctx } from './context';
import { flaskStats } from './flasks';
import { grantGemXp, skillNumbers, SPELL_ADDED_EFFECTIVENESS, spellBaseAt, weaponPctAt, type SkillNumbers } from './gems';
import { newUid } from './items';
import { rollLoot } from './loot';
import { chance, pick, rInt } from './rng';
import { grantXp } from './skills';
import {
  coupMulti,
  ensureMechanicFields,
  fervorThreshold,
  gainMeter,
  HUNGER_MS,
  manaFraction,
  manaPowerMore,
  mechanicOf,
  MEGA_CRIT_MULTI,
  meterFull,
  OVERCLOCK_HEAT_MS,
  OVERHEAT_MS,
  RAGE_DECAY_PER_S,
  rageMore,
  RIPOSTE_COOLDOWN_MS,
} from './mechanics';
import { armourReduction, deriveStats, ES_RECHARGE_DELAY_MS, evadeChance, hitChance, type Derived } from './stats';
import type { CombatRuntime, DamageType, Dot, GameState, Ground, InstillCondition, MonsterInstance, Movement } from './types';

export const SPAWN_DELAY_MS = 900;
export const DEATH_LIFE_FRACTION = 0.25;
/** each monster in a pack of 2+ is weaker; xp and loot scale with it */
export const PACK_LIFE_SCALE = 0.6;
export const PACK_DMG_SCALE = 0.65;

const DAMAGE_TYPES: DamageType[] = ['phys', 'fire', 'cold', 'light'];
/** chilled monsters attack this much slower (plus any chillOnHit) */
export const CHILL_SLOW_PCT = 15;

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
    esDelayMs: 0,
    blocks: 0,
    evadeMs: 0,
    glacial: false,
    retaliate: false,
    ambush: false,
    flurryStacks: 0,
    empowered: false,
    fleeing: false,
    shakeMs: FLEE_SHAKE_MS,
    mech: 0,
    mechDamage: 0,
    riposteMs: 0,
    riposting: false,
    manaFrac: 1,
    heatMs: 0,
    overheatMs: 0,
    hungerMs: HUNGER_MS,
    ground: [],
    groundAcc: 0,
    groundTimer: 0,
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

/** Picking a pace by hand also takes back control from auto-flee. */
export function setMovement(s: GameState, movement: Movement): void {
  s.settings.movement = movement;
  if (s.combat) s.combat.fleeing = false;
}

/** The pace in effect: the player's choice, unless auto-flee has taken over. */
export function currentMovement(s: GameState): Movement {
  return s.combat?.fleeing ? 'flee' : (s.settings.movement ?? 'walk');
}

// ---------- monsters ----------

/** Global kill-xp knob: Act 1 is paced to take 6–10 hours (docs/BALANCE.md). */
export const KILL_XP_SCALE = 0.8;

/** Base character xp for a kill, before the level-difference multiplier. */
export function monsterXp(mon: MonsterInstance): number {
  return Math.round((5 + mon.level * 3) * (mon.isBoss ? 10 : 1) * mon.scale * KILL_XP_SCALE);
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
  const mechanics: BossMechanic[] = boss ? (def.mechanics ?? ['slam']) : [];
  return {
    uid,
    defId: def.id,
    name: def.name,
    level: def.level,
    maxLife: life,
    life,
    damage: Math.round(monsterDamage(def.level) * (def.dmgMult ?? 1) * (boss ? BOSS_DMG_MULT : 1) * dmgScale),
    dmgType: def.dmgType,
    attackName: def.basic.name,
    attackKind: def.basic.kind,
    attackMs: def.basic.ms,
    attackTimer: 0,
    isBoss: boss,
    mechanics,
    // offset the first casts so a boss doesn't open with everything at once
    timers: boss ? { slam: BOSS_SLAM_EVERY_MS * 0.6, nova: BOSS_NOVA_EVERY_MS * 0.8, summon: BOSS_SUMMON_EVERY_MS * 0.7 } : {},
    novaType: def.novaType ?? def.dmgType,
    casting: -1,
    castKind: null,
    castTotal: 1,
    casts: { slam: def.slam ?? BOSS_SLAM_DEFAULT, nova: def.nova ?? BOSS_NOVA_DEFAULT },
    enraged: false,
    ward: 0,
    wardMax: 0,
    wardMs: 0,
    wardsUsed: 0,
    res: { fire: 0, cold: 0, light: 0, ...RESIST_BY_TYPE[def.dmgType] },
    dots: [],
    stunMs: 0,
    frozenMs: 0,
    vulnMs: 0,
    chillMs: 0,
    scale,
    dotAcc: 0,
    dotTimer: 0,
    dead: false,
    cell: boss ? BOSS_CELL : FRONT_CELL,
    stepMs: def.moveMs ?? MONSTER_STEP_MS,
    moveMs: def.moveMs ?? MONSTER_STEP_MS,
    attackGround: !!def.basic.ground,
  };
}

export function bossIsNext(s: GameState, zoneId: string): boolean {
  return (s.zoneKills[zoneId] ?? 0) >= zoneDef(zoneId).bossEvery;
}

/** Living monsters, front rank first: the first one is the current target. */
export function aliveMonsters(c: CombatRuntime): MonsterInstance[] {
  return c.monsters.filter((m) => m.life > 0).sort((a, b) => cellCol(a.cell) - cellCol(b.cell));
}

/** A boss you've never beaten has to be fought in person: offline, it stays in hiding and you keep farming trash. */
function bossCanSpawn(s: GameState, ctx: Ctx, zoneId: string): boolean {
  return bossIsNext(s, zoneId) && !(ctx.offline && !s.bossesDefeated.includes(zoneId));
}

/** Put fresh monsters on the field, each in a free cell. Ones with no room stay away. */
function place(s: GameState, ctx: Ctx, fresh: MonsterInstance[], from: 'back' | 'front'): MonsterInstance[] {
  const c = s.combat!;
  const placed: MonsterInstance[] = [];
  for (const m of fresh) {
    const cell = m.isBoss ? BOSS_CELL : freeCell(c.monsters, ctx.rng, from);
    if (cell < 0) break;
    m.cell = cell;
    c.monsters.push(m);
    placed.push(m);
  }
  return placed;
}

/** A wave walks in from the far edge: a pack of trash, or the boss with its adds. */
function spawnWave(s: GameState, ctx: Ctx): void {
  const c = s.combat!;
  const zone = zoneDef(c.zoneId);
  const boss = bossCanSpawn(s, ctx, zone.id);
  if (bossIsNext(s, zone.id) && !boss) ctx.emit({ t: 'bossWaiting', name: zone.boss.name });
  const pack: MonsterInstance[] = [];
  if (boss) {
    pack.push(makeMonster(zone.boss, true, newUid(s)));
    for (let i = 0; i < BOSS_ADDS; i++) pack.push(makeMonster(pick(ctx.rng, zone.monsters), false, newUid(s), PACK_LIFE_SCALE));
  } else {
    const [lo, hi] = zone.packSize;
    const n = rInt(ctx.rng, lo, hi);
    const scale = n > 1 ? PACK_LIFE_SCALE : 1;
    const room = MOVEMENT[currentMovement(s)].maxField - aliveMonsters(c).length;
    for (let i = 0; i < Math.min(n, room); i++) pack.push(makeMonster(pick(ctx.rng, zone.monsters), false, newUid(s), scale));
  }
  // the boss's adds rush to the front rank to shield it; trash walks in from the far edge
  const placed = place(s, ctx, pack, boss ? 'front' : 'back');
  if (!placed.length) return;
  const lead = placed[0];
  ctx.emit({ t: 'spawn', name: boss ? lead.name : placed.length > 1 ? `${placed.length} monsters` : lead.name, boss });
  if (boss) triggerInstilled(s, ctx, 'bossCast');
}

/**
 * New waves arrive on the zone's timer, scaled by how fast the player is moving -- even mid-fight, so a slow
 * kill means fighting two packs at once. A wave that's due waits while the field is as full as the pace allows.
 * An empty field fills quickly unless the player is fleeing. The boss waits for the field to clear,
 * and no trash arrives while it's alive.
 */
function advanceSpawns(s: GameState, ctx: Ctx, dt: number): void {
  const c = s.combat!;
  const zone = zoneDef(c.zoneId);
  if (c.monsters.some((m) => m.isBoss && m.life > 0)) return;
  const alive = aliveMonsters(c).length;
  if (bossCanSpawn(s, ctx, zone.id) && alive) return;
  const pace = MOVEMENT[currentMovement(s)];
  if (!alive) c.spawnMs = Math.min(c.spawnMs, SPAWN_DELAY_MS);
  c.spawnMs = Math.max(0, c.spawnMs - dt * pace.spawnRate);
  if (c.spawnMs > 0 || alive >= pace.maxField) return;
  c.spawnMs = zone.spawnEveryMs;
  spawnWave(s, ctx);
}

/** Fleeing outpaces the field: every so often the monster furthest behind loses track of you. Bosses keep up. */
function shakeOff(s: GameState, ctx: Ctx, dt: number): void {
  const c = s.combat!;
  if (currentMovement(s) !== 'flee') {
    c.shakeMs = FLEE_SHAKE_MS;
    return;
  }
  c.shakeMs -= dt;
  if (c.shakeMs > 0) return;
  c.shakeMs = FLEE_SHAKE_MS;
  const far = aliveMonsters(c).filter((m) => !m.isBoss).at(-1);
  if (!far) return;
  c.monsters = c.monsters.filter((m) => m !== far);
  ctx.emit({ t: 'info', text: `Left ${far.name} behind` });
}

/** Auto-flee: on low life, back off until healed, then go back to the chosen pace. */
function autoFlee(s: GameState, ctx: Ctx, d: Derived): void {
  const c = s.combat!;
  if (!s.settings.autoFlee) c.fleeing = false;
  else if (!c.fleeing && s.life < d.maxLife * AUTO_FLEE_AT && c.monsters.length) {
    c.fleeing = true;
    ctx.emit({ t: 'info', text: 'Badly hurt: fleeing until you recover' });
  } else if (c.fleeing && s.life >= d.maxLife * AUTO_FLEE_RESUME) {
    c.fleeing = false;
    ctx.emit({ t: 'info', text: `Recovered: back to ${MOVEMENT[s.settings.movement ?? 'walk'].name.toLowerCase()}ing` });
  }
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
  const kind = st.def.kind;
  const recovery = 1 + (kind === 'life' ? d.raw.lifeFlaskRecovery : kind === 'mana' ? d.raw.manaFlaskRecovery : 0) / 100;
  const effect = (1 + d.flaskEffect / 100) * st.effectMult * recovery;
  const duration = st.durationMs * (kind === 'utility' ? 1 + d.raw.utilityFlaskDuration / 100 : 1);
  const c = s.combat;
  c.buffs = c.buffs.filter((b) => !(b.source === 'flask' && b.id === f.flaskId));
  c.buffs.push({ id: f.flaskId, source: 'flask', remainingMs: duration, durationMs: duration, mult: st.effectMult });
  if (st.def.heal) {
    const resource = kind === 'mana' ? 'mana' : 'life';
    c.heals.push({ resource, perMs: (st.def.heal * effect) / duration, remainingMs: duration });
  }
  s.lifetime.flasksDrunk += 1;
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
  meterFull: boolean;
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
    meterFull: meterFull(s, d),
  };
}

/** Whether a skill's own effect is currently up (buff, guard, or its ailment on the target). */
export function skillIsActive(c: CombatRuntime, gemId: string): boolean {
  if (c.buffs.some((b) => b.source === 'skill' && b.id === gemId)) return true;
  if ((gemId === 'iron_guard' || gemId === 'parry') && c.blocks > 0) return true;
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
    case 'manaBelow':
      return rc.manaPct < v;
    case 'enemiesAtLeast':
      return rc.enemies >= v;
    case 'targetLifeAbove':
      return rc.targetLifePct > v;
    case 'notActive':
      return !active;
    case 'bossOnly':
      return rc.boss;
    case 'meterFull':
      return rc.meterFull;
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

/** Blood Pact pays skill costs with life instead of mana. */
function canPay(s: GameState, d: Derived, cost: number): boolean {
  if (d.raw.overclock) return true;
  return d.raw.bloodPact ? s.life > cost : s.mana >= cost;
}

function ready(s: GameState, d: Derived, slot: number, nums: SkillNumbers): boolean {
  return s.combat!.cooldowns[slot] <= 0 && canPay(s, d, nums.manaCost);
}

/** Pick what to do next: a queued manual cast, else the first slot whose rule passes, else a default attack. */
export function chooseSkill(s: GameState, d: Derived): { slot: number; nums: SkillNumbers; manual: boolean } {
  const c = s.combat!;
  if (c.queued !== null) {
    const slot = c.queued;
    const gem = s.skillBar[slot];
    const nums = skillNumbers(d, gem);
    c.queued = null;
    if (gem && ready(s, d, slot, nums)) return { slot, nums, manual: true };
  }
  const rc = ruleContext(s, d);
  for (let i = 0; i < s.skillBar.length; i++) {
    const gem = s.skillBar[i];
    if (!gem) continue;
    const nums = skillNumbers(d, gem);
    if (!ready(s, d, i, nums)) continue;
    if (ruleAllows(gem.rule, rc, skillIsActive(c, gem.gemId))) return { slot: i, nums, manual: false };
  }
  return { slot: -1, nums: skillNumbers(d, null), manual: false };
}

// ---------- damage ----------

type ByType = Record<DamageType, number>;

function moreDamageFromBuffs(c: CombatRuntime): number {
  return c.buffs.reduce((a, b) => a + (b.moreDamage ?? 0), 0);
}

/** Bleeding, poisoned, ignited, chilled or frozen. */
function hasAilment(mon: MonsterInstance): boolean {
  return mon.dots.length > 0 || mon.chillMs > 0 || mon.frozenMs > 0;
}

/** Roll one hit of a skill. Returns null for a missed attack; `sure` hits can't miss. */
function rollHit(
  s: GameState,
  ctx: Ctx,
  d: Derived,
  nums: SkillNumbers,
  mon: MonsterInstance,
  sure = false,
): { byType: ByType; crit: boolean; mega: boolean; coup: boolean } | null {
  const c = s.combat!;
  const { def, mods, level } = nums;
  const r = d.raw;
  const isAttack = def.tags.includes('attack');
  if (isAttack && !sure && !c.ambush && !r.steadyHand && !r.knifesEdge && !chance(ctx.rng, hitChance(d.accuracy, mon.level))) return null;

  const byType: ByType = { phys: 0, fire: 0, cold: 0, light: 0 };
  if (isAttack) {
    const pct = weaponPctAt(def, level) / 100;
    for (const t of DAMAGE_TYPES) {
      const [lo, hi] = d.hit[t];
      if (hi > 0) byType[t] += rInt(ctx.rng, lo, hi) * pct;
    }
    // conversion: the moved damage scales with its new type's increases instead of physical ones
    const conv = def.effect.convert;
    if (conv) {
      const share = Math.min(100, conv.pct + (def.id === 'judgement_hammer' ? r.hammerConvert : 0)) / 100;
      const moved = byType.phys * share;
      byType.phys -= moved;
      byType[conv.type] += (moved / d.physMult) * d.typeMult[conv.type];
    }
  } else {
    const [lo, hi] = spellBaseAt(def, level);
    const type = def.effect.type ?? 'fire';
    byType[type] += rInt(ctx.rng, lo, hi) * d.typeMult[type];
    for (const t of ['fire', 'cold', 'light'] as const) {
      const [alo, ahi] = d.hit[t];
      if (ahi > 0) byType[t] += rInt(ctx.rng, alo, ahi) * SPELL_ADDED_EFFECTIVENESS;
    }
  }

  // a bow turns every attack into a ranged projectile
  const projectile = def.tags.includes('projectile') || (isAttack && d.ranged);
  if (def.tags.includes('melee') && !(isAttack && d.ranged)) byType.phys *= 1 + r.meleePct / 100;
  let inc = projectile ? r.projectilePct : 0;
  if (def.tags.includes('spell')) inc += r.spellPct;
  if (inc) for (const t of DAMAGE_TYPES) byType[t] *= 1 + inc / 100;
  if (mods.noElemental) byType.fire = byType.cold = byType.light = 0;
  const total = DAMAGE_TYPES.reduce((a, t) => a + byType[t], 0);
  for (const x of mods.extras) byType[x.type] += (total * x.pct) / 100;
  if (r.physAsLight) byType.light += (byType.phys * r.physAsLight) / 100;
  byType.phys *= 1 + mods.morePhys / 100;
  const highLife = s.life > d.maxLife * 0.8 ? r.highLifeElem : 0;
  for (const t of ['fire', 'cold', 'light'] as const) byType[t] *= (1 + mods.moreElem / 100) * (1 + highLife / 100);
  let more = (1 + mods.moreDamage / 100) * (1 + moreDamageFromBuffs(c) / 100);
  if (r.buffMore && c.buffs.some((b) => b.source === 'skill')) more *= 1 + r.buffMore / 100;
  if (c.empowered) {
    more *= 1 + r.afterGuardDamage / 100;
    c.empowered = false;
  }
  if (mon.life < mon.maxLife * 0.3) more *= 1 + r.lowLifeDamage / 100;
  if (def.effect.moreVsAiling && hasAilment(mon)) more *= 1 + def.effect.moreVsAiling / 100;
  if (isAttack && c.counterweightMore) {
    more *= 1 + c.counterweightMore / 100;
    c.counterweightMore = 0;
  }
  if (def.id === 'feint' && mods.specials.has('misdirection') && c.misdirect) {
    more *= 2;
    c.misdirect = false;
  }
  if (isAttack) more *= 1 + rageMore(s, d) / 100;
  if (def.tags.includes('spell')) more *= 1 + manaPowerMore(s, d, c.manaFrac) / 100;
  for (const t of DAMAGE_TYPES) byType[t] *= more;

  const spellType = def.effect.type;
  let critChance = isAttack
    ? d.critChance * (1 + mods.critChance / 100)
    : (def.effect.crit ?? 5) * (1 + (r.critChancePct + r.spellCritPct + (spellType === 'light' ? r.lightCrit : 0) + mods.critChance) / 100);
  if (c.riposting) critChance *= 1 + r.riposteCrit / 100;
  critChance = r.steadyHand ? 0 : Math.min(95, critChance);

  // Mega Crits: a flat 400% that ignores crit multiplier, only from Knife's Edge, Ambush and Coup de Grâce
  const malice = mechanicOf(s) === 'malice';
  let megaMulti = r.knifesEdge ? MEGA_CRIT_MULTI : 0;
  if (isAttack && c.ambush) {
    megaMulti = Math.max(megaMulti, MEGA_CRIT_MULTI);
    c.ambush = false;
  }
  const coup = malice && meterFull(s, d);
  if (coup) {
    megaMulti = Math.max(megaMulti, coupMulti(d));
    c.mech = 0;
    ctx.emit({ t: 'info', text: 'Coup de Grâce!', tone: 'good' });
  }
  if (megaMulti) {
    for (const t of DAMAGE_TYPES) byType[t] *= megaMulti;
    return { byType, crit: true, mega: true, coup };
  }
  const crit = chance(ctx.rng, critChance / 100);
  if (malice) {
    // a normal crit empties the meter (unless a passive says otherwise); every other hit fills it
    if (!crit || r.thousandCuts) gainMeter(s, d, 1);
    else c.mech = Math.min(c.mech, r.maliceCritKeep);
  }
  if (crit) {
    let multi = (d.critMulti + mods.critMulti + (isAttack ? 0 : r.spellCritMulti)) / 100;
    if (mon.life >= mon.maxLife) multi *= 1 + r.critFullLife / 100;
    for (const t of DAMAGE_TYPES) byType[t] *= multi;
  }
  return { byType, crit, mega: false, coup: false };
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

/** Take life from a monster, through its ward first. */
function damageMonster(mon: MonsterInstance, amount: number): void {
  if (mon.ward > 0) {
    const absorbed = Math.min(mon.ward, amount);
    mon.ward -= absorbed;
    amount -= absorbed;
  }
  mon.life -= amount;
}

/** A damage-over-time ailment from a hit, with the player's ailment modifiers. */
function makeAilment(d: Derived, nums: SkillNumbers, mon: MonsterInstance, dealt: number, a: { kind: 'bleed' | 'poison' | 'ignite'; pctPerSec: number; durationMs: number }): Dot {
  const r = d.raw;
  const { def, mods } = nums;
  const kindPct = a.kind === 'bleed' ? r.bleedPct : a.kind === 'poison' ? r.poisonPct : r.ignitePct;
  const kindDur = a.kind === 'bleed' ? r.bleedDuration : a.kind === 'poison' ? r.poisonDuration : r.igniteDuration;
  const flatDur = a.kind === 'bleed' ? r.bleedDurationFlat : a.kind === 'poison' ? r.poisonDurationFlat : 0;
  const bossBleed = a.kind === 'bleed' && mon.isBoss ? 1 + r.bleedBossMore / 100 : 1;
  const duration = a.durationMs * nums.durationMult * (1 + (r.ailmentDuration + kindDur) / 100) + flatDur;
  return {
    kind: a.kind,
    dps: ((dealt * a.pctPerSec) / 100) * (1 + (kindPct + r.ailmentPct) / 100) * bossBleed,
    remainingMs: duration,
    durationMs: duration,
    dealt: 0,
    gemId: def.id,
    burst: mods.specials.has('hemorrhage') ? 0.5 : undefined,
    spreads: mods.specials.has('virulence') || undefined,
    pyre: (a.kind === 'ignite' && mods.specials.has('pyre')) || undefined,
  };
}

/** Coup de Grace with Needleworker's Wraps: also poisons and ignites. */
const COUP_POISON = { kind: 'poison', pctPerSec: 30, durationMs: 4000 } as const;
const COUP_IGNITE = { kind: 'ignite', pctPerSec: 40, durationMs: 3000 } as const;

/** Apply a rolled hit to one monster, with its resistances and the skill's on-hit effects. */
function hitMonster(
  s: GameState,
  ctx: Ctx,
  d: Derived,
  nums: SkillNumbers,
  mon: MonsterInstance,
  byType: ByType,
  crit: boolean,
  factor: number,
  mega = false,
  coup = false,
): number {
  const c = s.combat!;
  const { def, mods } = nums;
  const e = def.effect;
  let dealt = 0;
  for (const t of DAMAGE_TYPES) {
    let amt = byType[t] * factor;
    if (t !== 'phys') amt *= 1 - mon.res[t] / 100;
    if (t === 'light' && (mon.shockMs ?? 0) > 0) amt *= 1.1;
    dealt += amt;
  }
  const r = d.raw;
  if (mon.vulnMs > 0) dealt *= 1.15;
  if (mods.specials.has('shatterpoint') && mon.chillMs > 0) dealt *= 1.15;
  if (mods.specials.has('shatter') && mon.stunMs > 0) dealt *= 1.3;
  if (mon.stunMs > 0) dealt *= 1 + r.stunnedVuln / 100;
  if (mon.dots.some((x) => x.kind === 'bleed')) dealt *= 1 + r.bleedVuln / 100;
  if (new Set(mon.dots.map((x) => x.kind)).size >= 2) dealt *= 1 + r.multiAilmentVuln / 100;
  dealt = Math.max(1, Math.round(dealt));
  damageMonster(mon, dealt);
  if (crit && r.critLeech) s.life = Math.min(d.maxLife, s.life + (dealt * r.critLeech) / 100);
  if (mon.life < 0 && r.overkillHeal) s.life = Math.min(d.maxLife, s.life + (-mon.life * r.overkillHeal) / 100);
  // Permafrost freezes what's already chilled, before this hit chills it again
  if (mods.specials.has('permafrost') && mon.chillMs > 0) mon.frozenMs = Math.max(mon.frozenMs, mon.isBoss ? 600 : 1500);
  if (byType.cold > 0 && r.chillOnHit) mon.chillMs = 3000;
  if (e.chillMs) mon.chillMs = Math.max(mon.chillMs, e.chillMs * nums.durationMult);
  if (crit && mods.specials.has('shatterpoint')) mon.chillMs = Math.max(mon.chillMs, 3000);
  if (mods.specials.has('staticfield')) mon.shockMs = 4000 * nums.durationMult;
  if (mods.specials.has('twist')) {
    for (const x of mon.dots) x.remainingMs = Math.max(x.remainingMs, x.durationMs ?? 0);
    if (mon.chillMs > 0) mon.chillMs = Math.max(mon.chillMs, 3000);
  }
  ctx.emit({ t: 'hit', target: 'monster', amount: dealt, crit, mega: mega || undefined, dmgType: mainType(byType), monsterUid: mon.uid });
  // Rage and Momentum count every hit dealt, so multi-hit and area skills fill them fastest
  if (mechanicOf(s) === 'rage') gainMeter(s, d, 1);
  if (mechanicOf(s) === 'momentum' && def.tags.includes('attack')) gainMeter(s, d, 1);

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
  const stunChance = (e.stunChance ?? 0) + r.stunChance / 100;
  if (stunChance > 0 && chance(ctx.rng, stunChance)) {
    mon.stunMs = Math.max(mon.stunMs, (mon.isBoss ? 400 : 1000) * (1 + r.stunDuration / 100));
  }
  if (mods.specials.has('shatter')) mon.vulnMs = 4000;

  // ailments
  if (coup && r.coupAilment) {
    applyDot(mon, makeAilment(d, nums, mon, dealt, COUP_POISON));
    applyDot(mon, makeAilment(d, nums, mon, dealt, COUP_IGNITE));
  }
  if (e.ailment) {
    const a = e.ailment;
    const dot = makeAilment(d, nums, mon, dealt, a);
    applyDot(mon, dot);
    if (a.kind === 'ignite' && mods.specials.has('inferno')) {
      const near = new Set(neighbors(mon.cell));
      for (const other of aliveMonsters(c)) if (other !== mon && near.has(other.cell)) applyDot(other, { ...dot });
    }
    // Ember of Faith: Infernal Blow's ignites spread to the nearest enemies
    if (a.kind === 'ignite' && def.id === 'infernal_blow' && r.infernalSpread > 0) {
      for (const other of chainFrom(mon, aliveMonsters(c), r.infernalSpread).slice(1)) applyDot(other, { ...dot });
    }
  } else if ((c.riposting && r.riposteBleed) || (r.bleedOnHit && def.tags.includes('attack') && chance(ctx.rng, r.bleedOnHit / 100))) {
    // axes: any attack can open a wound (20% of the hit per second for 4s)
    const duration = 4000 * (1 + (r.ailmentDuration + r.bleedDuration) / 100) + r.bleedDurationFlat;
    applyDot(mon, {
      kind: 'bleed',
      dps: ((dealt * 20) / 100) * (1 + (r.bleedPct + r.ailmentPct) / 100) * (mon.isBoss ? 1 + r.bleedBossMore / 100 : 1),
      remainingMs: duration,
      durationMs: duration,
      dealt: 0,
      gemId: def.id,
    });
  }
  return dealt;
}

function performSkill(s: GameState, ctx: Ctx, d: Derived, slot: number, nums: SkillNumbers, manual: boolean): void {
  const c = s.combat!;
  const { def, mods, level } = nums;
  const e = def.effect;
  const r = d.raw;
  c.using = def.id;
  c.manaFrac = manaFraction(s, d);
  // Overclock: no costs, no cooldowns
  if (!r.overclock) {
    if (r.bloodPact) s.life -= nums.manaCost;
    else s.mana -= nums.manaCost;
    if (slot >= 0 && nums.cooldownMs) c.cooldowns[slot] = nums.cooldownMs;
  }
  if (mechanicOf(s) === 'rage' && def.id === 'war_cry') gainMeter(s, d, 10);
  if (slot >= 0) ctx.emit({ t: 'skill', slot, gemId: def.id, manual });

  // utility effects
  if (e.blocks) {
    c.blocks = Math.max(c.blocks, e.blocks + r.extraBlocks + (def.id === 'parry' ? r.parryBlocks : 0));
    c.retaliate = mods.specials.has('retaliate');
    c.counterweight = mods.specials.has('counterweight');
  }
  if (e.restoreManaPct) s.mana = Math.min(d.maxMana, s.mana + (d.maxMana * e.restoreManaPct) / 100);
  if (def.id === 'meditate') {
    if (r.meditateEs) s.es = Math.min(d.maxEs, s.es + (d.maxEs * r.meditateEs) / 100);
    if (mods.specials.has('clarity')) {
      c.buffs = c.buffs.filter((b) => b.id !== 'clarity');
      c.buffs.push({ id: 'clarity', source: 'skill', remainingMs: 4000, durationMs: 4000, stats: { manaCostReduction: 30 } });
    }
  }
  if (e.evadeMs) {
    c.evadeMs = e.evadeMs * nums.durationMult + (def.id === 'smoke_step' ? r.smokeExtra : 0);
    if (mods.specials.has('ambush')) c.ambush = true;
  }
  if (e.shieldPct) {
    c.shield = (d.maxLife * e.shieldPct * (1 + 0.03 * (level - 1)) * (1 + r.shieldEffect / 100)) / 100;
    c.shieldMax = c.shield;
    c.glacial = mods.specials.has('glacial');
  }
  if (def.role === 'guard') {
    if (r.afterGuardDamage) c.empowered = true;
    if (r.guardArmourPct) {
      c.buffs = c.buffs.filter((b) => b.id !== 'guard_armour');
      c.buffs.push({ id: 'guard_armour', source: 'skill', remainingMs: 3000, durationMs: 3000, stats: { armourPct: r.guardArmourPct } });
    }
  }
  if (def.id === 'war_cry' && r.warCryHeal) s.life = Math.min(d.maxLife, s.life + (d.maxLife * r.warCryHeal) / 100);
  if (e.buff) {
    const dur = e.buff.durationMs * nums.durationMult + (def.role === 'buff' ? r.buffDurationFlat : 0);
    c.buffs = c.buffs.filter((b) => !(b.source === 'skill' && b.id === def.id));
    c.buffs.push({
      id: def.id,
      source: 'skill',
      remainingMs: dur,
      durationMs: dur,
      stats: e.buff.stats,
      moreDamage: e.buff.moreDamage ? e.buff.moreDamage + (level - 1) : undefined,
      regenPct: (e.buff.regenPct ?? 0) + (mods.specials.has('rally') ? 2 : 0) || undefined,
      esRegenPct: mods.specials.has('holyground') ? 1 : undefined,
      extendMaxMs: mods.specials.has('bloodfrenzy') ? 12000 : undefined,
    });
  }
  if (e.knockback && knockBack(c.monsters)) ctx.emit({ t: 'area', gemId: def.id, cells: areaCells('rank', 1) });
  if (e.interrupts) {
    for (const m of aliveMonsters(c)) {
      if (m.casting < 0) continue;
      if (m.castKind) m.timers[m.castKind] = m.castKind === 'nova' ? BOSS_NOVA_EVERY_MS : BOSS_SLAM_EVERY_MS;
      m.casting = -1;
      m.castKind = null;
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
  if (mods.specials.has('hailstorm') && chance(ctx.rng, 0.3)) passes += 1;
  const volley = mods.specials.has('volley');
  const hitsPerPass =
    (e.hits ?? 1) +
    (def.id === 'twin_strike' && mods.specials.has('flurry') ? 1 : 0) +
    (def.id === 'pummel' ? r.pummelHits : 0) +
    (def.id === 'barrage' ? r.barrageArrows + (volley ? 1 : 0) : 0);
  // Tenderise: each consecutive blow on the same target hits 10% harder
  let lastTarget = -1;
  let streak = 0;
  const shape = skillArea(nums);
  // Inferno's blast scorches the ground around the target
  const ground = mods.specials.has('inferno') ? { kind: 'burning' as const, pctPerSec: 25, durationMs: 3000, area: 'splash' as const } : e.ground;
  let grounded = false;

  for (let pass = 0; pass < passes; pass++) {
    const passMult = pass === 0 ? 1 : (mods.repeatDamage / 100) * (1 + r.repeatMore / 100);
    for (let h = 0; h < hitsPerPass; h++) {
      const alive = aliveMonsters(c);
      if (!alive.length) return;
      const target = alive[0];
      let targets: MonsterInstance[];
      let chained = false;
      if (shape !== 'target') {
        const cells = new Set(areaCells(shape, target.cell));
        targets = [target, ...alive.filter((m) => m !== target && cells.has(m.cell))];
        if (pass === 0 && h === 0) ctx.emit({ t: 'area', gemId: def.id, cells: [...cells] });
      } else {
        const chains = (e.targets === 'chain' ? (e.chains ?? 0) + r.extraChains : 0) + mods.chains;
        targets = chainFrom(target, alive, chains);
        chained = targets.length > 1;
        if (chained && pass === 0 && h === 0) ctx.emit({ t: 'area', gemId: def.id, cells: targets.map((m) => m.cell) });
      }
      streak = target.uid === lastTarget ? streak + 1 : 0;
      lastTarget = target.uid;
      const tender = mods.specials.has('tenderise') ? 1 + 0.1 * streak : 1;
      const stunned = target.stunMs > 0;
      const chilled = target.chillMs > 0;
      const roll = rollHit(s, ctx, d, nums, target, volley && h === hitsPerPass - 1);
      if (!roll) {
        ctx.emit({ t: 'hit', target: 'monster', amount: 0, dmgType: 'phys', evaded: true, monsterUid: target.uid });
        continue;
      }
      targets.forEach((m, i) => {
        const chainMult = chained ? 1 + ((mods.specials.has('overload') ? 20 : 0) + r.chainMore) / 100 * i : 1;
        const dealt = hitMonster(s, ctx, d, nums, m, roll.byType, roll.crit, passMult * chainMult * tender, roll.mega, roll.coup);
        if (ground && !grounded && m === target) {
          grounded = true;
          const dps = (dealt * ground.pctPerSec) / 100;
          for (const cell of areaCells(ground.area ?? 'target', target.cell)) layGround(c.ground, cell, ground.kind, dps, ground.durationMs * nums.durationMult);
        }
      });
      // Verdict arcs off stunned targets, Splinter shatters off chilled ones
      const arc = mods.specials.has('verdict') && stunned ? 0.5 : mods.specials.has('splinter') && chilled ? 0.4 : 0;
      if (arc) {
        const others = chainFrom(target, aliveMonsters(c).filter((m) => !targets.includes(m)), 2).slice(1);
        if (others.length && pass === 0) ctx.emit({ t: 'area', gemId: def.id, cells: others.map((m) => m.cell) });
        for (const m of others) hitMonster(s, ctx, d, nums, m, roll.byType, roll.crit, passMult * arc);
      }
    }
  }
}

/** Where a skill's hit lands on the battlefield: Pierce turns any projectile into a lane; 'all' means the whole field. */
export function skillArea(nums: SkillNumbers): AreaShape {
  const e = nums.def.effect;
  if (nums.mods.specials.has('pierce')) return 'line';
  return e.area ?? (e.targets === 'all' ? 'field' : 'target');
}

// ---------- kills & death ----------

function onMonsterDeath(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance): void {
  const c = s.combat!;
  const zone = zoneDef(c.zoneId);
  ctx.emit({ t: 'kill', name: mon.name, boss: mon.isBoss });
  c.hungerMs = HUNGER_MS;
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
  const ignite = mon.dots.find((x) => x.kind === 'ignite' && x.remainingMs > 0);
  if (d.raw.igniteSpread && ignite && next) applyDot(next, { ...ignite, dealt: 0 });
  // Pyre: a burning corpse bursts over the pack
  if (ignite?.pyre) {
    for (const m of aliveMonsters(c)) {
      const amount = Math.max(1, Math.round(mon.maxLife * 0.1 * (1 - m.res.fire / 100)));
      damageMonster(m, amount);
      ctx.emit({ t: 'hit', target: 'monster', amount, dmgType: 'fire', monsterUid: m.uid });
    }
  }
  // Blood Frenzy: kills keep Berserk going
  const frenzy = c.buffs.find((b) => b.extendMaxMs && b.durationMs < b.extendMaxMs);
  if (frenzy) {
    const add = Math.min(1000, frenzy.extendMaxMs! - frenzy.durationMs);
    frenzy.durationMs += add;
    frenzy.remainingMs += add;
  }

  if (mon.isBoss) {
    s.lifetime.bossKills += 1;
    s.zoneKills[zone.id] = 0;
    if (zone.actBoss && s.character.classId === 'exile' && !Object.values(s.equipment).some((it) => it?.rarity === 'unique')) {
      s.lifetime.exileBareKills = (s.lifetime.exileBareKills ?? 0) + 1;
    }
    if (!s.bossesDefeated.includes(zone.id)) {
      s.bossesDefeated.push(zone.id);
      if (zone.actBoss) ctx.emit({ t: 'actComplete', act: zone.act });
    }
    const next = nextZone(zone.id);
    if (next && !s.unlockedZones.includes(next.id)) {
      s.unlockedZones.push(next.id);
      ctx.emit({ t: 'zoneUnlocked', zoneId: next.id });
    }
  } else if (!c.monsters.some((m) => m.isBoss)) {
    // adds in a boss fight don't count toward the next boss
    s.zoneKills[zone.id] = (s.zoneKills[zone.id] ?? 0) + 1;
  }
}

/** Resolve deaths after damage and clear the bodies off the field, freeing their cells. */
function reapDead(s: GameState, ctx: Ctx, d: Derived): void {
  const c = s.combat;
  if (!c) return;
  for (const m of c.monsters) {
    if (m.life <= 0 && !m.dead) {
      m.dead = true;
      onMonsterDeath(s, ctx, d, m);
    }
  }
  if (!c.monsters.some((m) => m.dead)) return;
  c.monsters = c.monsters.filter((m) => !m.dead);
  if (!c.monsters.length) c.using = null;
}

function die(s: GameState, ctx: Ctx, d: Derived): void {
  s.lifetime.deaths += 1;
  // losing to a boss sends it back into hiding so the zone can be farmed again
  if (s.combat && aliveMonsters(s.combat).some((m) => m.isBoss)) s.zoneKills[s.combat.zoneId] = 0;
  const xpLost = applyDeathPenalty(s);
  ctx.emit({ t: 'death', xpLost });
  s.life = Math.max(1, Math.round(d.maxLife * DEATH_LIFE_FRACTION));
  s.es = 0;
  retreat(s);
}

// ---------- incoming damage ----------

function counterAttack(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance): void {
  const nums = skillNumbers(d, null);
  const roll = rollHit(s, ctx, d, nums, mon);
  if (roll) hitMonster(s, ctx, d, nums, mon, roll.byType, roll.crit, 2, roll.mega, roll.coup);
}

/** Duelist: blocking or evading a hit answers with a weapon strike. */
function riposte(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance): void {
  const c = s.combat!;
  const r = d.raw;
  if (mechanicOf(s) !== 'riposte' || mon.life <= 0 || (c.riposteMs > 0 && !r.perfectForm)) return;
  c.riposteMs = RIPOSTE_COOLDOWN_MS / (1 + r.riposteCooldown / 100);
  const nums = skillNumbers(d, null);
  c.riposting = true;
  const roll = rollHit(s, ctx, d, nums, mon);
  if (roll) hitMonster(s, ctx, d, nums, mon, roll.byType, roll.crit, (1 + r.ripostePct / 100) * (r.perfectForm ? 0.5 : 1), roll.mega, roll.coup);
  c.riposting = false;
  if (r.riposteHeal) s.life = Math.min(d.maxLife, s.life + (d.maxLife * r.riposteHeal) / 100);
}

/** Templar: incoming damage (before mitigation) fills Fervor; full Fervor releases a holy nova. */
function martyrFill(s: GameState, ctx: Ctx, d: Derived, raw: number): void {
  const c = s.combat!;
  if (mechanicOf(s) !== 'martyr') return;
  c.mechDamage += raw;
  c.mech = Math.min(100, c.mech + (raw / fervorThreshold(d)) * 100);
  if (c.mech < 100) return;
  const r = d.raw;
  const dmg = c.mechDamage * 0.5 * (1 + r.novaPct / 100);
  c.mech = 0;
  c.mechDamage = 0;
  if (!r.saintsSacrifice) s.life = Math.min(d.maxLife, s.life + d.maxLife * 0.2 * (1 + r.novaHeal / 100));
  if (r.novaEs) s.es = Math.min(d.maxEs, s.es + (d.maxEs * r.novaEs) / 100);
  ctx.emit({ t: 'info', text: 'Fervor releases a holy nova!', tone: 'good' });
  for (const m of aliveMonsters(c)) {
    const amount = Math.max(1, Math.round(dmg * (1 - m.res.light / 100)));
    damageMonster(m, amount);
    ctx.emit({ t: 'hit', target: 'monster', amount, dmgType: 'light', monsterUid: m.uid });
  }
}

function onEvade(s: GameState, d: Derived): void {
  const c = s.combat!;
  const r = d.raw;
  c.misdirect = true;
  if (r.evadeHeal) s.life = Math.min(d.maxLife, s.life + (d.maxLife * r.evadeHeal) / 100);
  if (r.evadeSpeed) {
    c.buffs = c.buffs.filter((b) => b.id !== 'evade_speed');
    c.buffs.push({ id: 'evade_speed', source: 'skill', remainingMs: 4000, durationMs: 4000, stats: { attackSpeedPct: r.evadeSpeed } });
  }
}

/** 'slam' and 'nova' are telegraphed boss casts: Evasion Rating can't dodge either, and blocks don't stop a nova. */
function takeHit(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance, raw: number, type: DamageType, kind: 'hit' | 'slam' | 'nova'): void {
  const c = s.combat!;
  const r = d.raw;
  const isCast = kind !== 'hit';
  if (mon.dots.some((x) => x.kind === 'poison')) raw *= 1 - r.poisonWeaken / 100;
  if (kind === 'slam') raw *= 1 - r.slamReduction / 100;
  if (underPlayer(c, 'shocked')) raw *= SHOCKED_GROUND_TAKEN;
  if (c.evadeMs > 0) {
    ctx.emit({ t: 'hit', target: 'player', amount: 0, dmgType: type, evaded: true, monsterUid: mon.uid });
    onEvade(s, d);
    riposte(s, ctx, d, mon);
    return;
  }
  if (c.blocks > 0 && kind !== 'nova') {
    c.blocks -= 1;
    if (c.counterweight) c.counterweightMore = Math.min(30, (c.counterweightMore ?? 0) + 15);
    ctx.emit({ t: 'hit', target: 'player', amount: 0, dmgType: type, blocked: true, monsterUid: mon.uid });
    if (r.blockHeal) s.life = Math.min(d.maxLife, s.life + (d.maxLife * r.blockHeal) / 100);
    if (c.retaliate) counterAttack(s, ctx, d, mon);
    martyrFill(s, ctx, d, raw);
    riposte(s, ctx, d, mon);
    return;
  }
  // staves: a flat chance to block, capped at 75%
  if (r.blockChance > 0 && kind !== 'nova' && chance(ctx.rng, Math.min(75, r.blockChance) / 100)) {
    ctx.emit({ t: 'hit', target: 'player', amount: 0, dmgType: type, blocked: true, monsterUid: mon.uid });
    if (r.blockHeal) s.life = Math.min(d.maxLife, s.life + (d.maxLife * r.blockHeal) / 100);
    martyrFill(s, ctx, d, raw);
    riposte(s, ctx, d, mon);
    return;
  }
  // heavy wind-ups can't be evaded by Evasion Rating (unless Wind Dancer) — guard, interrupt or drink
  if ((!isCast || r.windDancer) && chance(ctx.rng, evadeChance(d.evasion, mon.level))) {
    ctx.emit({ t: 'hit', target: 'player', amount: 0, dmgType: type, evaded: true, monsterUid: mon.uid });
    onEvade(s, d);
    riposte(s, ctx, d, mon);
    return;
  }
  // the hit lands
  const mech = mechanicOf(s);
  if (mech === 'momentum') {
    if (!r.perpetualMotion) c.mech -= Math.ceil(c.mech * 0.5 * (1 - Math.min(100, r.momentumRetain) / 100));
  } else if (mech === 'rage') gainMeter(s, d, r.rageOnHitTaken);
  else if (mech === 'malice') gainMeter(s, d, r.maliceOnHitTaken);
  martyrFill(s, ctx, d, raw);
  let dmg: number;
  if (type !== 'phys' && r.armourVsElem) {
    const p = r.armourVsElem / 100;
    dmg = Math.round(mitigate(d, raw * (1 - p), type) + mitigate(d, raw * p, 'phys'));
  } else dmg = mitigate(d, raw, type);
  if (type !== 'phys') dmg = Math.max(1, Math.round(dmg * (1 - r.elemTakenReduction / 100)));
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
  // energy shield soaks what's left after mitigation, and any hit that lands delays its recharge
  c.esDelayMs = ES_RECHARGE_DELAY_MS;
  let toEs = 0;
  if (s.es > 0 && dmg > 0) {
    toEs = Math.min(s.es, dmg);
    s.es -= toEs;
    dmg -= toEs;
  }
  if (r.mindOverFlesh && s.mana > 0) {
    const fromMana = Math.min(s.mana, (dmg * r.mindOverFlesh) / 100);
    s.mana -= fromMana;
    dmg = Math.round(dmg - fromMana);
  }
  s.life -= dmg;
  ctx.emit({ t: 'hit', target: 'player', amount: dmg, dmgType: type, absorbed: absorbed || undefined, es: Math.round(toEs) || undefined, monsterUid: mon.uid });
}

// ---------- ground ----------

/** monster ground: damage per second as a fraction of the monster's hit, and how long it lasts */
export const MONSTER_GROUND_DPS = 0.08;
export const MONSTER_GROUND_MS = 3000;
export const BOSS_NOVA_GROUND_DPS = 0.12;
export const BOSS_NOVA_GROUND_MS = 4000;

function underPlayer(c: CombatRuntime, kind: Ground['kind']): boolean {
  return c.ground.some((g) => g.cell === PLAYER_SPOT && g.kind === kind);
}

/**
 * Hazards burn whatever stands on them. The player's ground hurts monsters on its cells (through their
 * resistances; chilled ground chills, shocked ground breaks armour). Monster ground sits under the player,
 * hurting through resistances and energy shield; running or fleeing steps out of it faster.
 */
function tickGround(s: GameState, ctx: Ctx, d: Derived, dt: number): void {
  const c = s.combat!;
  if (!c.ground.length) return;
  const outPace = currentMovement(s) === 'run' || currentMovement(s) === 'flee' ? STEP_OUT_RATE : 1;
  for (const g of c.ground) {
    const t = Math.min(dt, g.remainingMs);
    const type = GROUND[g.kind].type;
    if (g.cell === PLAYER_SPOT) {
      let dmg = (g.dps * t) / 1000;
      if (type !== 'phys') dmg *= (1 - d.res[type] / 100) * (1 - d.raw.elemTakenReduction / 100);
      const toEs = Math.min(s.es, dmg);
      s.es -= toEs;
      s.life -= dmg - toEs;
      c.groundAcc += dmg;
      g.remainingMs -= dt * outPace;
      continue;
    }
    for (const m of aliveMonsters(c)) {
      if (m.cell !== g.cell) continue;
      const dmg = ((g.dps * t) / 1000) * (type === 'phys' ? 1 : 1 - m.res[type] / 100);
      damageMonster(m, dmg);
      m.dotAcc += dmg;
      if (g.kind === 'chilled') m.chillMs = Math.max(m.chillMs, 500);
      if (g.kind === 'shocked') m.vulnMs = Math.max(m.vulnMs, 500);
    }
    g.remainingMs -= dt;
  }
  c.ground = c.ground.filter((g) => g.remainingMs > 0);
  // report ground damage to the player in once-a-second chunks, like damage over time on monsters
  c.groundTimer += dt;
  if (c.groundTimer >= 1000) {
    const g = c.ground.find((x) => x.cell === PLAYER_SPOT);
    if (c.groundAcc >= 1) ctx.emit({ t: 'hit', target: 'player', amount: Math.round(c.groundAcc), dmgType: g ? GROUND[g.kind].type : 'fire', dot: true });
    c.groundAcc = 0;
    c.groundTimer = 0;
  }
}

// ---------- the step ----------

function tickDots(s: GameState, ctx: Ctx, dt: number): void {
  const c = s.combat!;
  for (const m of aliveMonsters(c)) {
    for (const dot of m.dots) {
      const t = Math.min(dt, dot.remainingMs);
      const dmg = (dot.dps * t) / 1000;
      damageMonster(m, dmg);
      m.dotAcc += dmg;
      dot.dealt += dmg;
      dot.remainingMs -= dt;
      if (dot.remainingMs <= 0 && dot.burst) {
        const burst = dot.dealt * dot.burst;
        damageMonster(m, burst);
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
  mon.chillMs = Math.max(0, mon.chillMs - dt);
  if (mon.shockMs) mon.shockMs = Math.max(0, mon.shockMs - dt);
  if (mon.isBoss) bossPhases(s, ctx, mon, dt);
  if (mon.frozenMs > 0) {
    mon.frozenMs -= dt;
    return;
  }
  if (mon.stunMs > 0) {
    mon.stunMs -= dt;
    return;
  }
  if (mon.isBoss && bossCasts(s, ctx, d, mon, dt)) return;
  const speed = (mon.enraged ? BOSS_ENRAGE_SPEED : 1) * (d.raw.overclock ? 1.6 : 1);
  const chill = Math.min(60, CHILL_SLOW_PCT + d.raw.chillOnHit) / 100;
  mon.attackTimer += (mon.chillMs > 0 ? dt * (1 - chill) : dt) * speed;
  if (mon.attackTimer >= mon.attackMs) {
    // a melee monster still walking up holds its swing until it reaches the front rank
    if (!inReach(mon)) {
      mon.attackTimer = mon.attackMs;
      return;
    }
    mon.attackTimer -= mon.attackMs;
    const enrage = mon.enraged ? BOSS_ENRAGE_DMG : 1;
    takeHit(s, ctx, d, mon, mon.damage * enrage * (0.85 + ctx.rng.next() * 0.3), mon.dmgType, 'hit');
    // some casters' spells splash hazardous ground at the player's feet
    if (mon.attackGround) layGround(s.combat!.ground, PLAYER_SPOT, groundFor(mon.dmgType), mon.damage * MONSTER_GROUND_DPS, MONSTER_GROUND_MS);
  }
}

/** Life-threshold boss mechanics (enrage, ward) and timed adds. These run even while the boss is stunned. */
function bossPhases(s: GameState, ctx: Ctx, mon: MonsterInstance, dt: number): void {
  const has = (k: BossMechanic) => mon.mechanics.includes(k);
  const lifeFrac = mon.life / mon.maxLife;
  if (has('enrage') && !mon.enraged && lifeFrac <= BOSS_ENRAGE_AT) {
    mon.enraged = true;
    ctx.emit({ t: 'bossPhase', name: mon.name, text: 'flies into a rage!' });
  }
  if (has('ward')) {
    if (mon.wardMax === 0 && mon.wardsUsed < BOSS_WARD_AT.length && lifeFrac <= BOSS_WARD_AT[mon.wardsUsed]) {
      mon.wardsUsed += 1;
      mon.ward = mon.wardMax = mon.maxLife * BOSS_WARD_PCT;
      mon.wardMs = BOSS_WARD_MS;
      ctx.emit({ t: 'bossPhase', name: mon.name, text: 'raises a ward — break it quickly!' });
    } else if (mon.wardMax > 0) {
      mon.wardMs -= dt;
      if (mon.ward <= 0) {
        mon.wardMax = 0;
        ctx.emit({ t: 'bossPhase', name: mon.name, text: 'loses its ward' });
      } else if (mon.wardMs <= 0) {
        mon.life = Math.min(mon.maxLife, mon.life + mon.maxLife * BOSS_WARD_HEAL);
        mon.ward = mon.wardMax = 0;
        ctx.emit({ t: 'bossPhase', name: mon.name, text: 'drinks in its ward and recovers!' });
      }
    }
  }
  if (has('summon')) {
    mon.timers.summon = (mon.timers.summon ?? BOSS_SUMMON_EVERY_MS) - dt;
    if (mon.timers.summon <= 0) {
      mon.timers.summon = BOSS_SUMMON_EVERY_MS;
      const c = s.combat!;
      const adds = aliveMonsters(c).filter((x) => !x.isBoss).length;
      const zone = zoneDef(c.zoneId);
      const fresh: MonsterInstance[] = [];
      for (let i = adds; i < BOSS_SUMMON_COUNT; i++) fresh.push(makeMonster(pick(ctx.rng, zone.monsters), false, newUid(s), PACK_LIFE_SCALE));
      // new adds take the front rank, so single-target skills have to chew through them
      const placed = place(s, ctx, fresh, 'front');
      if (placed.length) ctx.emit({ t: 'bossPhase', name: mon.name, text: `calls for aid (+${placed.length})` });
    }
  }
}

/** Wind-ups: slam and nova. Returns true while the boss is busy casting. */
function bossCasts(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance, dt: number): boolean {
  if (mon.casting >= 0) {
    mon.casting -= dt;
    if (mon.casting <= 0) {
      const kind = mon.castKind ?? 'slam';
      mon.casting = -1;
      mon.castKind = null;
      if (kind === 'nova') {
        mon.timers.nova = BOSS_NOVA_EVERY_MS;
        takeHit(s, ctx, d, mon, mon.damage * BOSS_NOVA_MULT, mon.novaType, 'nova');
        // the blast leaves the ground under the player burning, frozen or charged
        layGround(s.combat!.ground, PLAYER_SPOT, groundFor(mon.novaType), mon.damage * BOSS_NOVA_GROUND_DPS, BOSS_NOVA_GROUND_MS);
      } else {
        mon.timers.slam = BOSS_SLAM_EVERY_MS;
        takeHit(s, ctx, d, mon, mon.damage * BOSS_SLAM_MULT, mon.dmgType, 'slam');
      }
    }
    return true;
  }
  for (const kind of ['slam', 'nova'] as const) {
    if (!mon.mechanics.includes(kind)) continue;
    const left = (mon.timers[kind] ?? 0) - dt;
    mon.timers[kind] = left;
    if (left <= 0) {
      mon.castKind = kind;
      mon.casting = mon.castTotal = mon.casts[kind].ms;
      ctx.emit({ t: 'bossCast', name: mon.name, kind, skill: mon.casts[kind].name });
      triggerInstilled(s, ctx, 'bossCast');
      return true;
    }
  }
  return false;
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
  if (classMechanicsStep(s, ctx, d, dt)) return true;

  for (const h of c.heals) {
    const t = Math.min(dt, h.remainingMs);
    if (h.resource === 'mana') s.mana += h.perMs * t;
    else s.life += h.perMs * t;
    h.remainingMs -= dt;
  }
  c.heals = c.heals.filter((h) => h.remainingMs > 0);
  const regenPct = c.buffs.reduce((a, b) => a + (b.regenPct ?? 0), 0);
  const regenned = s.life + ((d.lifeRegen + (d.maxLife * regenPct) / 100) * dt) / 1000;
  // a draining buff (Berserk) never kills you by itself
  s.life = Math.min(d.maxLife, regenPct < 0 ? Math.max(Math.min(s.life, 1), regenned) : regenned);
  const esRegenPct = c.buffs.reduce((a, b) => a + (b.esRegenPct ?? 0), 0);
  if (esRegenPct) s.es = Math.min(d.maxEs, s.es + (d.maxEs * esRegenPct * dt) / 100000);
  s.mana = Math.min(d.maxMana, s.mana + (d.manaRegen * dt) / 1000);
  c.esDelayMs = Math.max(0, c.esDelayMs - dt);
  if (c.esDelayMs <= 0) s.es = Math.min(d.maxEs, s.es + (d.esRecharge * dt) / 1000);

  // instilled flasks
  if (s.life < d.maxLife * 0.5) triggerInstilled(s, ctx, 'lowLife');
  for (let i = 0; i < s.flaskSlots.length; i++) {
    const f = s.flaskSlots[i];
    if (f?.instill === 'fullCharges' && f.charges >= flaskStats(f).maxCharges && !flaskActive(s, f.flaskId)) {
      useFlask(s, ctx, i, true);
    }
  }

  autoFlee(s, ctx, d);
  advanceSpawns(s, ctx, dt);
  shakeOff(s, ctx, dt);
  if (!c.monsters.length) return expired.length > 0;

  // damage over time
  tickDots(s, ctx, dt);
  tickGround(s, ctx, d, dt);
  reapDead(s, ctx, d);
  if (!s.combat || !c.monsters.length) return true;

  // the player's turn (an overheated Overclock sits it out)
  if (c.overheatMs > 0) c.overheatMs -= dt;
  else c.actionMs -= underPlayer(c, 'chilled') ? dt * CHILLED_GROUND_SLOW : dt;
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
  advanceMonsters(c.monsters, dt, new Set(c.ground.filter((g) => g.cell >= 0).map((g) => g.cell)));
  for (const m of aliveMonsters(c)) {
    monsterTurn(s, ctx, d, m, dt);
    if (s.life <= 0) break;
  }
  reapDead(s, ctx, d);
  // Eternal Hunger: you can't die while it's fed
  if (s.life <= 0 && s.combat && d.raw.eternalHunger && c.hungerMs > 0) s.life = 1;
  if (s.life <= 0 && s.combat) die(s, ctx, d);
  return true;
}

/** Meter upkeep, Overclock heat and Eternal Hunger. Returns true if the player died. */
function classMechanicsStep(s: GameState, ctx: Ctx, d: Derived, dt: number): boolean {
  const c = s.combat!;
  ensureMechanicFields(c);
  const r = d.raw;
  const fighting = aliveMonsters(c).length > 0;
  c.riposteMs = Math.max(0, c.riposteMs - dt);
  const mech = mechanicOf(s);
  if (mech === 'rage' && !fighting && !r.endlessFury) c.mech = Math.max(0, c.mech - (RAGE_DECAY_PER_S * (1 - Math.min(100, r.rageDecay) / 100) * dt) / 1000);
  if (mech === 'momentum' && r.perpetualMotion) c.mech = Math.max(0, c.mech - dt / 1000);

  if (r.overclock && fighting && c.overheatMs <= 0) {
    c.heatMs += dt;
    if (c.heatMs >= OVERCLOCK_HEAT_MS) {
      c.heatMs = 0;
      c.overheatMs = OVERHEAT_MS;
      ctx.emit({ t: 'info', text: 'Overheated! You lock up for 2s.', tone: 'warn' });
    }
  }

  if (r.eternalHunger) {
    if (!fighting) c.hungerMs = HUNGER_MS;
    else {
      c.hungerMs -= dt;
      if (c.hungerMs <= 0) {
        ctx.emit({ t: 'info', text: 'Your Hunger starves, and takes you with it.', tone: 'warn' });
        s.life = 0;
        die(s, ctx, d);
        return true;
      }
    }
  }
  return false;
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
