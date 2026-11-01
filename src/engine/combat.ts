import { CASTER_WEAPON_MORE, CASTER_WEAPONS, DEFAULT_ATTACK, SKILL_BAR_SLOTS, type ActiveGemDef, type SkillAim, type TacticRule, type TargetStatus } from '../data/gems';
import { groundAtRisk, groundOnDeath } from './storage';
import {
  actOpen,
  BOSS_ADDS,
  BOSS_DMG_MULT,
  BOSS_LIFE_MULT,
  BOSS_SLAM_DEFAULT,
  BOSS_SLAM_EVERY_MS,
  BOSS_SLAM_MULT,
  BOSS_ENRAGE_AT,
  BOSS_ENRAGE_DMG,
  BOSS_ENRAGE_SPEED,
  BOSS_MARTYR_AT,
  BOSS_MARTYR_COUNT,
  BOSS_NOVA_DEFAULT,
  BOSS_NOVA_EVERY_MS,
  BOSS_NOVA_MULT,
  BOSS_SCORCH_DPS,
  BOSS_SCORCH_EVERY_MS,
  BOSS_SCORCH_MS,
  BOSS_SUMMON_COUNT,
  BOSS_SUMMON_EVERY_MS,
  BOSS_WARD_AT,
  BOSS_WARD_HEAL,
  BOSS_WARD_MS,
  BOSS_WARD_PCT,
  MARTYR,
  monsterDamage,
  monsterLife,
  zoneDef,
  type BossMechanic,
  type MonsterDef,
} from '../data/zones';
import {
  advanceMonsters,
  AUTO_FLEE_AT,
  AUTO_FLEE_RESUME,
  FLEE_BREATHER_REGEN,
  BOSS_CELL,
  BOSS_ENTRY,
  cellDistance,
  cellRing,
  EDGE_CELLS,
  FLEE_SHAKE_MS,
  FRONT_CELL,
  freeEdge,
  freeNear,
  inReach,
  pullCloser,
  reachable,
  RINGS,
  MONSTER_STEP_MS,
  MOVEMENT,
  areaCells,
  chainFrom,
  CHILLED_GROUND_SLOW,
  GROUND,
  groundUnderPlayer,
  groundFor,
  knockBack,
  layGround,
  neighbors,
  PLAYER_SPOT,
  SHOCKED_GROUND_TAKEN,
  STEP_OUT_RATE,
  stepOutOfGround,
  type AreaShape,
} from './battlefield';
import { ascendancyOf, hasAscNode, newAscendancyRuntime, onBossFirstKill } from './ascendancy';
import { applyDeathPenalty, characterLevel, xpLevelMultiplier } from './character';
import { bossLeftToRules, castOrder, ruleLockReason, rulesPass, skillAim } from './automation';
import type { Ctx } from './context';
import { flaskStats } from './flasks';
import { gemUseReason, grantGemXp, LIFE_RESERVE_PCT, MIN_COOLDOWN_MS, skillNumbers, SPELL_ADDED_EFFECTIVENESS, spellBaseAt, weaponPctAt, type SkillNumbers } from './gems';
import { newUid } from './items';
import { rollLoot } from './loot';
import { mapPackLeft, onMapFieldLost, onMapPack, rollMapDrops } from './maps';
import { chance, pick, rInt } from './rng';
import { grantXp } from './skills';
import {
  ANVIL_THORNS_PCT,
  ANVIL_THORNS_PER_RAGE,
  BACKDRAFT_COST,
  BLOOM_MORE,
  BURNOUT_SPELLS,
  coupMulti,
  DRAUGHT_MORE,
  ECSTASY_SPEED,
  ensureMechanicFields,
  FEEDBACK_MANA,
  fervorThreshold,
  flaskCapacity,
  FLASK_BURST_PER_LEVEL,
  gainMeter,
  HAWK_DAMAGE,
  hawkInterval,
  HEAD_START_MOMENTUM,
  HOLD_THE_LINE_RAGE,
  HUNGER_MS,
  longshotMore,
  manaFraction,
  manaPowerMore,
  mechanicOf,
  MEGA_CRIT_MULTI,
  meterFull,
  meterMax,
  MORTIFY_MORE,
  NO_MERCY_HOLD_MS,
  NOVA_STORE,
  OVERCLOCK_HEAT_MS,
  OVERHEAT_MS,
  PHALANX_MULT,
  PLAGUE_MALICE_PER_S,
  RAGE_DECAY_PER_S,
  rageMore,
  RAMPAGE_KILL_MS,
  RAMPAGE_MS,
  rampaging,
  RESERVE_MORE,
  RIPOSTE_COOLDOWN_MS,
  SCOURGE_DAMAGE,
  SELF_HARM_FERVOR,
  SELF_HARM_PCT,
  SHARP_AXE_MORE,
  STAND_FAST_ARMOUR,
  STOOP_MULT,
  streakCap,
  STREAK_MORE,
  THE_BLOCK_AT,
  TONIC_MANA,
  VESPERS_SHIELD,
} from './mechanics';
import { armourReduction, deriveStats, ES_RECHARGE_DELAY_MS, evadeChance, hitChance, type Derived } from './stats';
import { openReachedZones, reachedAct } from './progress';
import type { CombatRuntime, DamageType, Dot, FlaskInstance, GameState, Ground, GroundKind, InstillCondition, MonsterInstance, Movement, TargetPriority, Targeting } from './types';

export const SPAWN_DELAY_MS = 900;
/** closing in on a monster out of reach takes this long, shortened by movement speed */
export const CLOSE_IN_MS = 500;
/** with nothing in reach and no way in, the player waits this long before looking again */
const IDLE_MS = 250;
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
    asc: newAscendancyRuntime(),
    ground: [],
    groundAcc: 0,
    groundTimer: 0,
    dealt: [0],
    dealtMs: 0,
  };
}

export function startCombat(s: GameState, ctx: Ctx, zoneId: string): string | null {
  if (!s.unlockedZones.includes(zoneId)) return 'Zone is locked';
  // a save carried over from a preview build can hold areas of an act that isn't out yet
  if (!actOpen(zoneDef(zoneId).act)) return "This act isn't open yet";
  enterZone(s, ctx, zoneId);
  return null;
}

/** Start a fresh fight in an area, whatever got you there. */
export function enterZone(s: GameState, ctx: Ctx, zoneId: string): void {
  keepMalice(s);
  s.action = { kind: 'combat', zoneId };
  s.combat = newRuntime(zoneId);
  s.combat.mech = s.ascendancy.carry;
  s.ascendancy.carry = 0;
  // gates start part-way through their timers, so they don't all open together
  s.combat.gates = EDGE_CELLS.map(() => gateTimer(ctx, zoneId) * ctx.rng.next());
  ctx.emit({ t: 'info', text: `Entered ${zoneDef(zoneId).name}` });
  ctx.emit({ t: 'combatStart', zoneId });
}

/** Next: the Malice you walk away with waits for the next fight. */
function keepMalice(s: GameState): void {
  if (s.combat && hasAscNode(s, 'headsman_next')) s.ascendancy.carry = s.combat.mech;
}

export function retreat(s: GameState): void {
  keepMalice(s);
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

/** Global kill-xp knob; areas scale it further with `xpScale` (docs/design/BALANCE.md). */
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
    timers: boss
      ? { slam: BOSS_SLAM_EVERY_MS * 0.6, nova: BOSS_NOVA_EVERY_MS * 0.8, summon: BOSS_SUMMON_EVERY_MS * 0.7, scorch: BOSS_SCORCH_EVERY_MS * 0.5 }
      : {},
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
    chained: mechanics.includes('martyrs') || undefined,
  };
}

export function bossIsNext(s: GameState, zoneId: string): boolean {
  if (s.maps.run?.zoneId === zoneId) return !mapPackLeft(s);
  return (s.zoneKills[zoneId] ?? 0) >= zoneDef(zoneId).bossEvery;
}

/** Living monsters, nearest first. */
export function aliveMonsters(c: CombatRuntime): MonsterInstance[] {
  return c.monsters.filter((m) => m.life > 0).sort((a, b) => cellRing(a.cell) - cellRing(b.cell) || a.uid - b.uid);
}

/** A ready boss waits to be challenged, so an area can be farmed for as long as you like. A map's boss always comes. */
export function bossCalled(s: GameState, zoneId: string): boolean {
  return bossIsNext(s, zoneId) && (s.maps.run?.zoneId === zoneId || s.settings.autoBoss || !!s.combat?.challenged);
}

/** Send for the boss: it comes once the field is clear. */
export function challengeBoss(s: GameState): void {
  if (s.combat && bossIsNext(s, s.combat.zoneId)) s.combat.challenged = true;
}

/** Until your rules can handle it a boss has to be fought in person: offline, it stays in hiding and you keep farming trash. */
function bossCanSpawn(s: GameState, ctx: Ctx, zoneId: string): boolean {
  return bossCalled(s, zoneId) && (!ctx.offline || bossLeftToRules(s, zoneDef(zoneId)));
}

/** Leaving mid boss fight when your rules can't handle it: the boss and its adds go back into hiding, ready for your return. */
export function clearBossFight(s: GameState): void {
  const c = s.combat;
  if (!c || !c.monsters.some((m) => m.isBoss) || bossLeftToRules(s, zoneDef(c.zoneId))) return;
  c.monsters = [];
  c.using = null;
}

/** Each gate's next timer: the zone's pace spread over every gate, so monsters arrive about as often as one wave timer sent them. */
function gateTimer(ctx: Ctx, zoneId: string): number {
  return zoneDef(zoneId).spawnEveryMs * EDGE_CELLS.length * (0.6 + 0.8 * ctx.rng.next());
}

/** A pack walks in through a gate: the first monster at the gate, the rest at the free gates nearest it. */
function spawnPack(s: GameState, ctx: Ctx, gate: number): void {
  const c = s.combat!;
  const zone = zoneDef(c.zoneId);
  if (!mapPackLeft(s)) return;
  if (bossIsNext(s, zone.id)) ctx.emit({ t: 'bossWaiting', name: zone.boss.name });
  const [lo, hi] = zone.packSize;
  const n = rInt(ctx.rng, lo, hi);
  const scale = n > 1 ? PACK_LIFE_SCALE : 1;
  const room = MOVEMENT[currentMovement(s)].maxField - aliveMonsters(c).length;
  const others = freeEdge(c.monsters)
    .filter((i) => i !== gate)
    .sort((a, b) => cellDistance(a, gate) - cellDistance(b, gate));
  const cells = [gate, ...others].slice(0, Math.min(n, room));
  if (cells.length) onMapPack(s);
  for (const cell of cells) {
    const m = makeMonster(pick(ctx.rng, zone.monsters), false, newUid(s), scale);
    m.cell = cell;
    c.monsters.push(m);
  }
  if (cells.length) ctx.emit({ t: 'spawn', name: cells.length > 1 ? `${cells.length} monsters` : c.monsters[c.monsters.length - 1].name, boss: false });
}

/** The boss walks in through the top gate with its adds at its side. */
function spawnBoss(s: GameState, ctx: Ctx): void {
  const c = s.combat!;
  const zone = zoneDef(c.zoneId);
  const boss = makeMonster(zone.boss, true, newUid(s));
  c.challenged = false;
  boss.cell = BOSS_ENTRY;
  c.monsters.push(boss);
  const near = freeNear(c.monsters, BOSS_ENTRY, ctx.rng);
  for (let i = 0; i < BOSS_ADDS && i < near.length; i++) {
    const m = makeMonster(pick(ctx.rng, zone.monsters), false, newUid(s), PACK_LIFE_SCALE);
    m.cell = near[i];
    c.monsters.push(m);
  }
  ctx.emit({ t: 'spawn', name: boss.name, boss: true });
  triggerInstilled(s, ctx, 'bossCast');
}

/**
 * Every edge hex is a gate with its own timer, sped up by how fast the player is moving -- even mid-fight, so a slow
 * kill means more monsters walking in. A gate that's due waits while it's blocked or the field is as full as the pace
 * allows. An empty field fills after a short search unless the player is fleeing. The boss waits for the field to
 * clear, and nothing else arrives while it's alive.
 */
function advanceSpawns(s: GameState, ctx: Ctx, dt: number): void {
  const c = s.combat!;
  const zone = zoneDef(c.zoneId);
  if (c.monsters.some((m) => m.isBoss && m.life > 0)) return;
  const alive = aliveMonsters(c).length;
  const boss = bossCanSpawn(s, ctx, zone.id);
  if (boss && alive) return;
  // a map sends a set number of packs: past those, offline without wind-up rules, the boss stays in hiding and the run waits
  if (!boss && s.maps.run && !mapPackLeft(s)) {
    if (!alive) ctx.emit({ t: 'bossWaiting', name: zone.boss.name });
    return;
  }
  const pace = MOVEMENT[currentMovement(s)];
  if (!alive && c.spawnMs <= 0) c.spawnMs = SPAWN_DELAY_MS;
  if (c.spawnMs > 0) {
    c.spawnMs = Math.max(0, c.spawnMs - dt * pace.spawnRate);
    if (c.spawnMs > 0 || alive) return;
    // the search is over: the first monsters walk in straight away
    if (boss) spawnBoss(s, ctx);
    else spawnPack(s, ctx, pick(ctx.rng, freeEdge(c.monsters)));
    return;
  }
  c.gates ??= EDGE_CELLS.map(() => gateTimer(ctx, zone.id) * ctx.rng.next());
  const gates = c.gates;
  EDGE_CELLS.forEach((cell, k) => {
    gates[k] = Math.max(0, gates[k] - dt * pace.spawnRate);
    if (gates[k] > 0 || aliveMonsters(c).length >= pace.maxField) return;
    if (c.monsters.some((m) => m.cell === cell && m.life > 0)) return;
    gates[k] = gateTimer(ctx, zone.id);
    spawnPack(s, ctx, cell);
  });
}

/** Ms until the next monster walks in, for the movement bar (null while nothing can arrive). */
export function nextArrivalMs(s: GameState): number | null {
  const c = s.combat;
  if (!c) return null;
  const pace = MOVEMENT[currentMovement(s)];
  if (!pace.spawnRate || aliveMonsters(c).length >= pace.maxField) return null;
  if (c.spawnMs > 0 || !c.gates) return c.spawnMs / pace.spawnRate;
  return Math.min(...c.gates) / pace.spawnRate;
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
  const far = aliveMonsters(c).filter((m) => !m.isBoss && !m.martyr).at(-1);
  if (!far) return;
  c.monsters = c.monsters.filter((m) => m !== far);
  ctx.emit({ t: 'info', text: `Left ${far.name} behind` });
  if (!c.monsters.length) onMapFieldLost(s);
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

/** Multiplier on what a flask recovers or grants: its own mods, flask effect and life/mana flask recovery. */
function flaskPotency(d: Derived, f: FlaskInstance): number {
  const st = flaskStats(f);
  const kind = st.def.kind;
  const recovery = 1 + (kind === 'life' ? d.raw.lifeFlaskRecovery : kind === 'mana' ? d.raw.manaFlaskRecovery : 0) / 100;
  return (1 + d.flaskEffect / 100) * st.effectMult * recovery;
}

/** Life or mana one drink recovers for this character, or 0 for a utility flask. */
export function flaskRecoveryAmount(d: Derived, f: FlaskInstance): number {
  const heal = flaskStats(f).def.heal;
  return heal ? Math.round(heal * flaskPotency(d, f)) : 0;
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
  const effect = flaskPotency(d, f);
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
  if (ascendancyOf(s) === 'alchemist') alchemistDrink(s, ctx, d, st.effectMult);
  return null;
}

/** Alchemist: every drink bursts on your target, for fire damage that grows with level and Flask Effect. */
function alchemistDrink(s: GameState, ctx: Ctx, d: Derived, effectMult: number): void {
  const c = s.combat!;
  if (hasAscNode(s, 'alchemist_tonic')) s.mana = Math.min(d.maxMana, s.mana + d.maxMana * TONIC_MANA);
  const target = focusTarget(s);
  if (!target) return;
  const burst = FLASK_BURST_PER_LEVEL * d.combatLevel * (1 + d.flaskEffect / 100) * effectMult * d.typeMult.fire * (1 + manaPowerMore(s, d, manaFraction(s, d)) / 100);
  const near = hasAscNode(s, 'alchemist_volatile_mix') ? new Set(neighbors(target.cell)) : new Set<number>();
  for (const m of aliveMonsters(c)) {
    if (m !== target && !near.has(m.cell)) continue;
    const amount = Math.max(1, Math.round(burst * (1 - m.res.fire / 100)));
    damageMonster(s, m, amount);
    ctx.emit({ t: 'hit', target: 'monster', amount, dmgType: 'fire', monsterUid: m.uid });
  }
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
    f.charges = Math.min(flaskCapacity(s, f), f.charges + amount * (1 + d.flaskCharges / 100) * st.gainMult);
  }
}

// ---------- targeting ----------

const DEFAULT_TARGETING: Targeting = { priority: 'none', order: 'closest' };

function inPriority(p: TargetPriority, m: MonsterInstance): boolean {
  if (p === 'boss') return m.isBoss;
  if (p === 'ranged') return m.attackKind === 'spell';
  if (p === 'ailing') return hasAilment(m);
  return false;
}

/** Whether a rule's aim picks this monster out. */
function inAim(aim: SkillAim | undefined, m: MonsterInstance): boolean {
  return aim === 'martyrs' && !!m.martyr;
}

/**
 * Every living monster in the order skills want them: a clicked monster first, then what the skill's rule aims at, then
 * the priority group, then the order; nearest breaks ties. Martyrs are nobody's target unless clicked or aimed at, and a
 * chained boss comes last, so the adds in the way of a martyr get cleared.
 */
export function targetOrder(s: GameState, aim?: SkillAim): MonsterInstance[] {
  const c = s.combat;
  if (!c) return [];
  const t = s.settings.targeting ?? DEFAULT_TARGETING;
  const group = (m: MonsterInstance) => (m.uid === c.lockedUid ? 0 : m.chained ? 4 : inAim(aim, m) ? 1 : inPriority(t.priority, m) ? 2 : 3);
  const key = (m: MonsterInstance) =>
    t.order === 'farthest' ? -cellRing(m.cell) : t.order === 'lowest' ? m.life : t.order === 'highest' ? -m.life : cellRing(m.cell);
  return aliveMonsters(c)
    .filter((m) => !m.martyr || m.uid === c.lockedUid || inAim(aim, m))
    .sort((a, b) => group(a) - group(b) || key(a) - key(b) || cellRing(a.cell) - cellRing(b.cell) || a.uid - b.uid);
}

/** The monster the fight is about: the one your last skill went for, else the first in targeting order. */
export function focusTarget(s: GameState): MonsterInstance | undefined {
  const c = s.combat;
  if (!c) return undefined;
  return c.monsters.find((m) => m.uid === c.targetUid && m.life > 0) ?? targetOrder(s)[0];
}

/** Click a monster to focus it until it dies; click it again to let the targeting setting choose. */
export function lockTarget(s: GameState, uid: number): void {
  if (!s.combat) return;
  s.combat.lockedUid = s.combat.lockedUid === uid ? undefined : uid;
}

/** How many rings out a skill reaches: its own range, else melee attacks 1 (bows and a wand's basic attack shoot) and the rest the whole field. */
export function skillRange(d: Derived, def: ActiveGemDef): number {
  if (def.range) return def.range;
  if (!def.tags.includes('attack') || def.tags.includes('projectile') || d.ranged) return RINGS;
  if (def.id === DEFAULT_ATTACK.id && d.weaponFamily === 'wand') return RINGS;
  return 1;
}

/**
 * Who a skill goes for: the first monster in targeting order that's in range or that you can close in on (a clear
 * way in). Area skills aim at whoever in range puts the most monsters under the hit, within the same priority.
 * Null when nothing can be reached.
 */
export function skillTarget(s: GameState, d: Derived, nums: SkillNumbers, aim?: SkillAim): { mon: MonsterInstance; closeIn: boolean } | null {
  const c = s.combat!;
  const range = skillRange(d, nums.def);
  const order = targetOrder(s, aim);
  // the chains hold a martyr in reach of any skill: adds and a summoning boss could otherwise wall melee off from it
  const fits = (m: MonsterInstance) => cellRing(m.cell) <= range || !!m.martyr;
  const first = order.find((m) => fits(m) || (range < RINGS && reachable(c.monsters, m, range)));
  if (!first) return null;
  if (!fits(first)) return { mon: first, closeIn: true };
  const shape = skillArea(nums);
  if (first.uid === c.lockedUid || inAim(aim, first) || (shape !== 'splash' && shape !== 'arc')) return { mon: first, closeIn: false };
  const t = s.settings.targeting ?? DEFAULT_TARGETING;
  const same = order.filter((m) => fits(m) && inPriority(t.priority, m) === inPriority(t.priority, first));
  const under = (m: MonsterInstance) => {
    const cells = new Set(areaCells(shape, m.cell, nums.def.effect.radius));
    return order.filter((o) => cells.has(o.cell)).length;
  };
  let best = first;
  let most = under(first);
  for (const m of same) {
    const n = under(m);
    if (n > most) [best, most] = [m, n];
  }
  return { mon: best, closeIn: false };
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
  targetStatus: Set<TargetStatus>;
  /** the ground under the player */
  ground: Set<GroundKind>;
}

/** Every status a monster has right now, as skill rules see it. */
export function monsterStatuses(m: MonsterInstance | undefined): Set<TargetStatus> {
  const out = new Set<TargetStatus>();
  if (!m) return out;
  if (m.dots.some((x) => x.kind === 'bleed')) out.add('bleeding');
  if (m.dots.some((x) => x.kind === 'poison')) out.add('poisoned');
  if (m.dots.some((x) => x.kind === 'ignite' || x.kind === 'burn')) out.add('ignited');
  if (m.stunMs > 0) out.add('stunned');
  if (m.frozenMs > 0) out.add('frozen');
  if (m.chillMs > 0) out.add('chilled');
  if ((m.shockMs ?? 0) > 0) out.add('shocked');
  if (m.vulnMs > 0) out.add('armourBroken');
  if (m.curse) out.add('cursed');
  return out;
}

export function ruleContext(s: GameState, d: Derived): RuleContext {
  const alive = s.combat ? aliveMonsters(s.combat).filter((m) => !m.martyr) : [];
  const target = focusTarget(s);
  return {
    lifePct: (s.life / d.maxLife) * 100,
    manaPct: d.maxMana ? (s.mana / d.maxMana) * 100 : 0,
    enemies: alive.length,
    targetLifePct: target ? (target.life / target.maxLife) * 100 : 0,
    casting: alive.some((m) => m.casting >= 0),
    boss: alive.some((m) => m.isBoss),
    meterFull: meterFull(s, d),
    targetStatus: monsterStatuses(target),
    ground: groundUnderPlayer(s.combat?.ground ?? []),
  };
}

/** Guards whose absorb shield ends with their buff. */
const SHIELD_SKILLS = ['frost_ward', 'blood_ward'];

/** Whether a skill's own effect is currently up (buff, guard, or its ailment on the target). */
export function skillIsActive(c: CombatRuntime, gemId: string): boolean {
  if (c.buffs.some((b) => b.source === 'skill' && b.id === gemId)) return true;
  if ((gemId === 'iron_guard' || gemId === 'parry') && c.blocks > 0) return true;
  if (gemId === 'smoke_step' && c.evadeMs > 0) return true;
  if (SHIELD_SKILLS.includes(gemId) && c.shield > 0) return true;
  const target = c.monsters.find((m) => m.uid === c.targetUid && m.life > 0) ?? aliveMonsters(c)[0];
  return !!target?.dots.some((x) => x.gemId === gemId) || target?.curse?.gemId === gemId;
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
    case 'onGround':
      return !!rule.ground && rc.ground.has(rule.ground);
    case 'lifeBelow':
      return rc.lifePct < v;
    case 'lifeAbove':
      return rc.lifePct > v;
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
    case 'targetHas':
      return !!rule.status && rc.targetStatus.has(rule.status);
    case 'targetLacks':
      return !rule.status || !rc.targetStatus.has(rule.status);
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

/** What a skill costs right now, after anything your ascendancy waives. */
function skillCost(s: GameState, d: Derived, nums: SkillNumbers): number {
  const spell = nums.def.tags.includes('spell');
  if (spell && s.combat!.asc.burnout > 0) return 0;
  if (s.life < d.maxLife / 2 && hasAscNode(s, 'flagellant_ecstasy')) return 0;
  return nums.manaCost * (spell && s.mana < d.maxMana / 2 && hasAscNode(s, 'wildcaster_backdraft') ? BACKDRAFT_COST : 1);
}

/**
 * Whether a skill's Life cost can be met: a rule keeps LIFE_RESERVE_PCT back, so nothing left running bleeds you
 * out, while your own press can go down to your last point of Life. Neither can ever kill you.
 */
export function canSpendLife(s: GameState, d: Derived, cost: number, manual: boolean): boolean {
  if (!cost || d.raw.overclock) return true;
  return s.life - cost >= (manual ? 1 : (d.maxLife * LIFE_RESERVE_PCT) / 100);
}

/** Blood Pact pays skill costs with life instead of mana. */
function canPay(s: GameState, d: Derived, nums: SkillNumbers, manual: boolean): boolean {
  if (!canSpendLife(s, d, nums.lifeCost, manual)) return false;
  if (d.raw.overclock) return true;
  const cost = skillCost(s, d, nums);
  return d.raw.bloodPact ? s.life - nums.lifeCost > cost : s.mana >= cost;
}

function ready(s: GameState, d: Derived, slot: number, nums: SkillNumbers, manual = false): boolean {
  return s.combat!.cooldowns[slot] <= 0 && canPay(s, d, nums, manual);
}

export interface SkillChoice {
  slot: number;
  nums: SkillNumbers;
  manual: boolean;
  /** who it goes for; none for a guard or buff, or when there's nothing to do */
  target?: MonsterInstance;
  /** the target is out of reach: run at it instead of using the skill */
  closeIn?: boolean;
  /** where the skill's rules send it */
  aim?: SkillAim;
}

/** Damage skills need someone in reach; guards, buffs and sustain skills (Consecrate's heal) go off regardless. */
function needsTarget(def: ActiveGemDef): boolean {
  return !!(def.effect.weaponPct || def.effect.base) && def.role !== 'guard' && def.role !== 'buff' && def.role !== 'sustain';
}

/**
 * Pick what to do next: a queued manual cast; else the first skill in cast order (see castOrder) whose rules all
 * pass and that you can pay for; else a free default attack.
 * A damage skill only counts with a target in range. When none has one, the first that could reach a monster
 * by closing in comes back with `closeIn`; with nothing reachable at all, slot -1 and no target means wait.
 */
export function chooseSkill(s: GameState, d: Derived): SkillChoice {
  const c = s.combat!;
  const later: { approach?: SkillChoice } = {};
  const consider = (slot: number, nums: SkillNumbers, manual: boolean): SkillChoice | null => {
    const gem = s.skillBar[slot];
    const aim = gem ? skillAim(s, gem) : undefined;
    const found = skillTarget(s, d, nums, aim);
    if (!needsTarget(nums.def)) return { slot, nums, manual, target: found && !found.closeIn ? found.mon : undefined, aim };
    if (!found) return null;
    const choice = { slot, nums, manual, target: found.mon, closeIn: found.closeIn, aim };
    if (!found.closeIn) return choice;
    later.approach ??= choice;
    return null;
  };
  if (c.queued !== null) {
    const slot = c.queued;
    const gem = s.skillBar[slot];
    const nums = skillNumbers(d, gem);
    c.queued = null;
    if (gem && ready(s, d, slot, nums, true) && !gemUseReason(d.combatLevel, d.attributes, gem, d.weaponFamily)) {
      const got = consider(slot, nums, true);
      if (got) return got;
      // out of reach: keep it queued while you close in
      if (later.approach) c.queued = slot;
    }
  }
  const rc = ruleContext(s, d);
  for (const i of castOrder(s)) {
    const gem = s.skillBar[i]!;
    if (gemUseReason(d.combatLevel, d.attributes, gem, d.weaponFamily)) continue;
    const nums = skillNumbers(d, gem);
    if (!ready(s, d, i, nums) || !rulesPass(s, gem.rules, (r) => ruleAllows(r, rc, skillIsActive(c, gem.gemId)))) continue;
    const got = consider(i, nums, false);
    if (got) return got;
  }
  const basic = skillNumbers(d, null);
  return consider(-1, basic, false) ?? later.approach ?? { slot: -1, nums: basic, manual: false };
}

/** Run at a monster out of reach: it ends up a ring closer. Movement speed makes it quicker. */
function closeIn(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance): void {
  const c = s.combat!;
  pullCloser(c.monsters, mon);
  c.using = null;
  c.closingUid = c.targetUid = mon.uid;
  const time = CLOSE_IN_MS / (1 + d.raw.moveSpeedPct / 100);
  c.actionTotal = time;
  c.actionMs = Math.max(c.actionMs + time, time * 0.5);
  ctx.emit({ t: 'closeIn', monsterUid: mon.uid });
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
  const sureCrit = c.asc.sureCrit;
  c.asc.sureCrit = false;
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
    byType[type] += (rInt(ctx.rng, lo, hi) + (nums.lifeCost * (def.effect.lifeToDamage ?? 0)) / 100) * d.typeMult[type];
    for (const t of ['fire', 'cold', 'light'] as const) {
      const [alo, ahi] = d.hit[t];
      if (ahi > 0) byType[t] += rInt(ctx.rng, alo, ahi) * SPELL_ADDED_EFFECTIVENESS;
      // "Adds X to Y Damage to Spells" counts in full
      const [slo, shi] = d.spellHit[t];
      if (shi > 0) byType[t] += rInt(ctx.rng, slo, shi);
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
  if (mods.specials.has('gnaw') && mon.dots.some((x) => x.kind === 'bleed')) more *= 1.3;
  if (mods.lowLifeMore && s.life < d.maxLife * 0.5) more *= 1 + mods.lowLifeMore / 100;
  // (Parting Shot's own hit doesn't spend the bonus Feigned Retreat just gave)
  if (isAttack && c.counterweightMore && def.id !== 'parting_shot') {
    more *= 1 + c.counterweightMore / 100;
    c.counterweightMore = 0;
  }
  if (def.id === 'feint' && mods.specials.has('misdirection') && c.misdirect) {
    more *= 2;
    c.misdirect = false;
  }
  if (isAttack) more *= (1 + rageMore(s, d) / 100) * (1 + longshotMore(s, d, cellRing(mon.cell)) / 100);
  if (def.tags.includes('spell')) more *= 1 + manaPowerMore(s, d, c.manaFrac) / 100;
  if (s.life < d.maxLife / 2 && hasAscNode(s, 'flagellant_mortify')) more *= 1 + MORTIFY_MORE / 100;
  if (hasAscNode(s, 'alchemist_philosophers_draught')) more *= 1 + (DRAUGHT_MORE * c.buffs.filter((b) => b.source === 'flask').length) / 100;
  if (def.tags.includes('spell') && d.weaponFamily && CASTER_WEAPONS.includes(d.weaponFamily)) more *= 1 + CASTER_WEAPON_MORE / 100;
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
  const crit = sureCrit || chance(ctx.rng, critChance / 100);
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

/** A chained boss takes nothing; a martyr takes nothing but a blow aimed at it, so ailments, ground and novas pass it by. */
function shielded(mon: MonsterInstance): boolean {
  return !!mon.chained || !!mon.martyr;
}

/** How many seconds of damage the DPS meter looks back over. */
export const DPS_WINDOW_S = 10;

/** Damage per second actually dealt lately: hits, skills, ailments, ground and the rest, with the walking between packs. */
export function liveDps(c: CombatRuntime): number {
  const total = c.dealt.reduce((a, n) => a + n, 0);
  return total / Math.max(1, c.dealt.length - 1 + c.dealtMs / 1000);
}

function tickDpsMeter(c: CombatRuntime, dt: number): void {
  c.dealtMs += dt;
  while (c.dealtMs >= 1000) {
    c.dealtMs -= 1000;
    c.dealt.push(0);
    if (c.dealt.length > DPS_WINDOW_S) c.dealt.shift();
  }
}

/** Take life from a monster, through its ward first. */
function damageMonster(s: GameState, mon: MonsterInstance, amount: number, direct = false): void {
  if (mon.chained || (mon.martyr && !direct)) return;
  const dealt = s.combat?.dealt;
  if (dealt) dealt[dealt.length - 1] += amount;
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
  const bleedMore = a.kind === 'bleed' ? (1 + mods.moreBleed / 100) * (mon.isBoss ? 1 + r.bleedBossMore / 100 : 1) : 1;
  const duration = a.durationMs * nums.durationMult * (1 + (r.ailmentDuration + kindDur) / 100) + flatDur;
  return {
    kind: a.kind,
    dps: ((dealt * a.pctPerSec) / 100) * (1 + (kindPct + r.ailmentPct) / 100) * bleedMore,
    remainingMs: duration,
    durationMs: duration,
    dealt: 0,
    gemId: def.id,
    burst: mods.specials.has('hemorrhage') ? 0.5 : undefined,
    spreads: mods.specials.has('virulence') || mods.specials.has('bloodtrail') || undefined,
    pyre: (a.kind === 'ignite' && mods.specials.has('pyre')) || undefined,
  };
}

/** The most of your life Transfusion gives back in one go. */
const TRANSFUSION_CAP = 0.25;
/** Tithe: this share of the Life spent flows back over its time. */
const TITHE_SHARE = 1 / 3;
const TITHE_MS = 4000;
/** Barbed Ward: the broken shield hits back for this many times the Life spent on it. */
const BARBED_WARD_RETURN = 2;

/** A dot's damage per second on this monster: Stigmata deepens bleeds. */
function bleedDps(mon: MonsterInstance, dot: Dot): number {
  return dot.dps * (dot.kind === 'bleed' ? 1 + (mon.curse?.bleedTaken ?? 0) / 100 : 1);
}

/** Coup de Grace with Needleworker's Wraps: also poisons and ignites. */
const COUP_POISON = { kind: 'poison', pctPerSec: 30, durationMs: 4000 } as const;
const COUP_IGNITE = { kind: 'ignite', pctPerSec: 40, durationMs: 3000 } as const;
/** "Hits have X% chance to Poison / Ignite" from gear */
const GEAR_POISON = { kind: 'poison', pctPerSec: 20, durationMs: 4000 } as const;
const GEAR_IGNITE = { kind: 'ignite', pctPerSec: 25, durationMs: 3000 } as const;

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
  if (mon.chained) {
    ctx.emit({ t: 'hit', target: 'monster', amount: 0, dmgType: 'phys', blocked: true, monsterUid: mon.uid });
    return 0;
  }
  let dealt = 0;
  let physPart = 0;
  for (const t of DAMAGE_TYPES) {
    let amt = byType[t] * factor;
    if (t !== 'phys') amt *= 1 - (mon.res[t] - (mon.curse?.resPen ?? 0)) / 100;
    else amt *= 1 + (mon.curse?.physTaken ?? 0) / 100;
    if (t === 'light' && (mon.shockMs ?? 0) > 0) amt *= 1.1;
    dealt += amt;
    if (t === 'phys') physPart = amt;
  }
  // the physical share of the hit, for physical vs elemental leech
  const physShare = dealt > 0 ? physPart / dealt : 0;
  const r = d.raw;
  if (mon.vulnMs > 0) dealt *= 1.15;
  if (mods.specials.has('shatterpoint') && mon.chillMs > 0) dealt *= 1.15;
  if (mods.specials.has('shatter') && mon.stunMs > 0) dealt *= 1.3;
  if (mon.stunMs > 0) dealt *= 1 + r.stunnedVuln / 100;
  if (mon.dots.some((x) => x.kind === 'bleed')) dealt *= 1 + r.bleedVuln / 100;
  if (new Set(mon.dots.map((x) => x.kind)).size >= 2) dealt *= 1 + r.multiAilmentVuln / 100;
  if (coup && mon.life < mon.maxLife / 2 && hasAscNode(s, 'headsman_sharp_axe')) dealt *= 1 + SHARP_AXE_MORE / 100;
  dealt = Math.max(1, Math.round(dealt));
  damageMonster(s, mon, dealt, true);
  if (coup) afterCoup(s, ctx, d, mon);
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
  if (mechanicOf(s) === 'rage' && ascendancyOf(s) !== 'anvil') gainMeter(s, d, 1);
  if (mechanicOf(s) === 'momentum' && def.tags.includes('attack') && (!c.asc.hawking || hasAscNode(s, 'falconer_bond'))) gainMeter(s, d, 1);
  if (cellRing(mon.cell) > 1 && hasAscNode(s, 'longshot_pin')) mon.stepMs = Math.min(mon.moveMs * 2, mon.stepMs + mon.moveMs / 2);

  // leech
  const lifeLeech = d.leechPct + mods.lifeLeech + (e.leechLife ?? 0) + r.physLeech * physShare + r.elemLeech * (1 - physShare);
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
  if (mods.specials.has('shatter') || mods.specials.has('flay')) mon.vulnMs = 4000;
  if (mods.specials.has('rundown')) mon.stunMs = Math.max(mon.stunMs, mon.isBoss ? 400 : 1000);

  if (e.consumeBleed) consumeBleed(s, ctx, d, nums, mon);

  // ailments
  if (coup && r.coupAilment) {
    applyDot(mon, makeAilment(d, nums, mon, dealt, COUP_POISON));
    applyDot(mon, makeAilment(d, nums, mon, dealt, COUP_IGNITE));
  }
  if (e.ailment) {
    const a = e.ailment;
    const dot = makeAilment(d, nums, mon, dealt, a);
    applyDot(mon, dot);
    if ((a.kind === 'ignite' && mods.specials.has('inferno')) || (a.kind === 'bleed' && mods.specials.has('arterial'))) {
      const near = new Set(neighbors(mon.cell));
      for (const other of aliveMonsters(c)) if (other !== mon && near.has(other.cell)) applyDot(other, { ...dot });
    }
    // Ember of Faith: Infernal Blow's ignites spread to the nearest enemies
    if (a.kind === 'ignite' && def.id === 'infernal_blow' && r.infernalSpread > 0) {
      for (const other of chainFrom(mon, aliveMonsters(c), r.infernalSpread).slice(1)) applyDot(other, { ...dot });
    }
  } else if ((c.riposting && r.riposteBleed) || (c.asc.hawking && hasAscNode(s, 'falconer_talons')) || mods.specials.has('serrated') || mon.curse?.weeping || (r.bleedOnHit && def.tags.includes('attack') && chance(ctx.rng, r.bleedOnHit / 100))) {
    // axes, Serrated Edge and Weeping Wounds: a hit can open a wound (20% of the hit per second for 4s)
    const duration = 4000 * (1 + (r.ailmentDuration + r.bleedDuration) / 100) + r.bleedDurationFlat;
    applyDot(mon, {
      kind: 'bleed',
      dps: ((dealt * 20) / 100) * (1 + (r.bleedPct + r.ailmentPct) / 100) * (1 + mods.moreBleed / 100) * (mon.isBoss ? 1 + r.bleedBossMore / 100 : 1),
      remainingMs: duration,
      durationMs: duration,
      dealt: 0,
      gemId: def.id,
    });
  }
  // gear: a chance for any hit to poison, and for any hit with fire damage to ignite
  if (r.poisonOnHit && chance(ctx.rng, r.poisonOnHit / 100)) applyDot(mon, makeAilment(d, nums, mon, dealt, GEAR_POISON));
  if (r.igniteOnHit && byType.fire > 0 && chance(ctx.rng, r.igniteOnHit / 100)) applyDot(mon, makeAilment(d, nums, mon, dealt, GEAR_IGNITE));
  return dealt;
}

/** Transfusion: the rest of the target's bleed lands now, and part of it comes back to you. */
function consumeBleed(s: GameState, ctx: Ctx, d: Derived, nums: SkillNumbers, mon: MonsterInstance): void {
  const bleed = mon.dots.find((x) => x.kind === 'bleed');
  if (!bleed || shielded(mon)) return;
  mon.dots = mon.dots.filter((x) => x !== bleed);
  const left = (bleedDps(mon, bleed) * bleed.remainingMs) / 1000;
  damageMonster(s, mon, left);
  ctx.emit({ t: 'hit', target: 'monster', amount: Math.round(left), dmgType: 'phys', dot: true, monsterUid: mon.uid });
  const back = Math.min((left * nums.def.effect.consumeBleed!) / 100, d.maxLife * TRANSFUSION_CAP);
  s.life = Math.min(d.maxLife, s.life + back);
  if (nums.mods.specials.has('communion')) s.mana = Math.min(d.maxMana, s.mana + back);
}

function performSkill(s: GameState, ctx: Ctx, d: Derived, slot: number, nums: SkillNumbers, manual: boolean, aimed?: MonsterInstance, aimRule?: SkillAim): void {
  const c = s.combat!;
  const { def, mods, level } = nums;
  const e = def.effect;
  const r = d.raw;
  c.using = def.id;
  c.closingUid = undefined;
  c.manaFrac = manaFraction(s, d);
  const cost = skillCost(s, d, nums);
  // Burnout: a free spell always hits at the full bonus
  if (def.tags.includes('spell') && c.asc.burnout > 0) {
    c.asc.burnout -= 1;
    c.manaFrac = 0;
  }
  // Overclock: no costs, and cooldowns at the minimum
  if (!r.overclock) {
    if (r.bloodPact) s.life -= cost;
    else s.mana -= cost;
    if (nums.lifeCost) {
      s.life = Math.max(1, s.life - nums.lifeCost);
      if (mods.specials.has('tithe')) c.heals.push({ resource: 'life', perMs: (nums.lifeCost * TITHE_SHARE) / TITHE_MS, remainingMs: TITHE_MS });
    }
  }
  if (def.tags.includes('spell') && c.asc.burnoutRearmed && s.mana < nums.manaCost && hasAscNode(s, 'wildcaster_burnout')) {
    c.asc.burnout = BURNOUT_SPELLS;
    c.asc.burnoutRearmed = false;
    ctx.emit({ t: 'info', text: 'Burnout: your next spells are free', tone: 'good' });
  }
  if (slot >= 0) c.cooldowns[slot] = Math.max(MIN_COOLDOWN_MS, nums.cooldownMs);
  if (slot >= 0 && ascendancyOf(s) === 'flagellant') selfHarm(s, ctx, d);
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
    // one shield at a time: a new one takes over from the old, whose timer would otherwise end it
    c.buffs = c.buffs.filter((b) => !(b.source === 'skill' && SHIELD_SKILLS.includes(b.id)));
    c.shield = (d.maxLife * e.shieldPct * (1 + 0.03 * (level - 1)) * (1 + r.shieldEffect / 100)) / 100;
    c.shieldMax = c.shield;
    c.glacial = mods.specials.has('glacial');
    c.barbedWard = mods.specials.has('barbedward') ? nums.lifeCost * BARBED_WARD_RETURN : undefined;
  }
  if (def.role === 'guard') {
    c.ground = stepOutOfGround(c.ground);
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
      stats: { ...e.buff.stats, ...(mods.specials.has('galerider') && { cooldownRecovery: 25 }), ...(mods.specials.has('overflow') && { manaCostReduction: 25 }), ...(mods.specials.has('bloodoath') && { lifeLeech: 3 }) },
      outpace: e.buff.outpace,
      moreDamage: e.buff.moreDamage ? e.buff.moreDamage + (level - 1) : undefined,
      regenPct: (e.buff.regenPct ?? 0) + (mods.specials.has('rally') ? 2 : 0) || undefined,
      esRegenPct: mods.specials.has('holyground') ? 1 : undefined,
      extendMaxMs: mods.specials.has('bloodfrenzy') ? 12000 : undefined,
    });
  }
  if (e.knockback && knockBack(c.monsters)) ctx.emit({ t: 'area', gemId: def.id, cells: areaCells('nova', 0, 1) });
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

  if (e.stepOut) stepOut(s, ctx, mods.specials.has('surefoot'));
  if (e.charge && aimed && !aimed.isBoss) while (cellRing(aimed.cell) > 1 && pullCloser(c.monsters, aimed));
  if (mods.specials.has('hitfade')) c.evadeMs = Math.max(c.evadeMs, 1500);
  if (mods.specials.has('feignedretreat')) c.counterweightMore = Math.max(c.counterweightMore ?? 0, 40);
  if (e.curse) curseEnemies(s, ctx, nums, aimed);

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
  let ground = mods.specials.has('inferno') ? { kind: 'burning' as const, pctPerSec: 25, durationMs: 3000, area: 'splash' as const } : e.ground;
  if (ground && mods.specials.has('embertrail')) ground = { ...ground, pctPerSec: ground.pctPerSec * 2 };
  let grounded = false;
  let target = aimed;
  // Rampage: melee hits sweep the rings next to you. Last Arrow: the shot runs the whole line
  const melee = def.tags.includes('attack') && skillRange(d, def) === 1;
  const reach = melee && rampaging(s) ? (hasAscNode(s, 'ravager_trample') ? 2 : 1) : 0;
  const lastArrow = !!aimed && def.tags.includes('attack') && meterFull(s, d) && hasAscNode(s, 'longshot_last_arrow');
  if (lastArrow) {
    c.mech = 0;
    c.asc.sureCrit = true;
    ctx.emit({ t: 'info', text: 'Last Arrow!', tone: 'good' });
  }

  for (let pass = 0; pass < passes; pass++) {
    const passMult = pass === 0 ? 1 : (mods.repeatDamage / 100) * (1 + r.repeatMore / 100);
    for (let h = 0; h < hitsPerPass; h++) {
      // the target died mid-skill: the next one in reach takes the rest
      if (!target || target.life <= 0) {
        const aim = skillTarget(s, d, nums, aimRule);
        if (!aim || aim.closeIn) return;
        target = aim.mon;
      }
      c.targetUid = target.uid;
      // a blast only reaches martyrs when it's aimed at one
      const struck = target;
      const alive = aliveMonsters(c).filter((m) => !m.martyr || struck.martyr);
      let targets: MonsterInstance[];
      let chained = false;
      if (shape !== 'target') {
        const cells = new Set(areaCells(shape, target.cell, e.radius));
        targets = [target, ...alive.filter((m) => m !== target && cells.has(m.cell))];
        if (pass === 0 && h === 0) ctx.emit({ t: 'area', gemId: def.id, cells: [...cells] });
      } else {
        const chains = (e.targets === 'chain' ? (e.chains ?? 0) + r.extraChains : 0) + mods.chains;
        targets = chainFrom(target, alive, chains);
        chained = targets.length > 1;
        if (chained && pass === 0 && h === 0) ctx.emit({ t: 'area', gemId: def.id, cells: targets.map((m) => m.cell) });
      }
      if (reach) targets = [...targets, ...alive.filter((m) => !targets.includes(m) && cellRing(m.cell) <= reach)];
      if (lastArrow) {
        const line = new Set(areaCells('beam', target.cell));
        targets = [...targets, ...alive.filter((m) => !targets.includes(m) && line.has(m.cell) && cellRing(m.cell) <= cellRing(target!.cell))];
      }
      streak = target.uid === lastTarget ? streak + 1 : 0;
      lastTarget = target.uid;
      const tender = mods.specials.has('tenderise') ? 1 + 0.1 * streak : 1;
      const stunned = target.stunMs > 0;
      const chilled = target.chillMs > 0;
      const roll = rollHit(s, ctx, d, nums, target, c.asc.sureCrit || (volley && h === hitsPerPass - 1));
      if (!roll) {
        ctx.emit({ t: 'hit', target: 'monster', amount: 0, dmgType: 'phys', evaded: true, monsterUid: target.uid });
        continue;
      }
      const aim = target;
      targets.forEach((m, i) => {
        const chainMult = chained ? 1 + ((mods.specials.has('overload') ? 20 : 0) + r.chainMore) / 100 * i : 1;
        const dealt = hitMonster(s, ctx, d, nums, m, roll.byType, roll.crit, passMult * chainMult * tender, roll.mega, roll.coup);
        if (ground && !grounded && m === aim) {
          grounded = true;
          const dps = (dealt * ground.pctPerSec) / 100;
          for (const cell of areaCells(ground.area ?? 'target', aim.cell)) layGround(c.ground, cell, ground.kind, dps, ground.durationMs * nums.durationMult);
        }
      });
      // Verdict arcs off stunned targets, Splinter shatters off chilled ones
      const arc = mods.specials.has('verdict') && stunned ? 0.5 : mods.specials.has('splinter') && chilled ? 0.4 : 0;
      if (arc) {
        const others = chainFrom(target, aliveMonsters(c).filter((m) => !targets.includes(m) && !m.martyr), 2).slice(1);
        if (others.length && pass === 0) ctx.emit({ t: 'area', gemId: def.id, cells: others.map((m) => m.cell) });
        for (const m of others) hitMonster(s, ctx, d, nums, m, roll.byType, roll.crit, passMult * arc);
      }
    }
  }
}

/** Curses are this much weaker on bosses, and grow this many % with each gem level. */
export const CURSE_BOSS_EFFECT = 0.5;
export const CURSE_PCT_PER_LEVEL = 2;

/** Lay a skill's curse where it lands. An enemy carries one curse, so a new one replaces the old. */
function curseEnemies(s: GameState, ctx: Ctx, nums: SkillNumbers, aimed?: MonsterInstance): void {
  const c = s.combat!;
  const { def, mods, level } = nums;
  const curse = def.effect.curse!;
  const target = aimed ?? aliveMonsters(c)[0];
  if (!target) return;
  const cells = new Set(areaCells(mods.specials.has('widehex') ? 'field' : skillArea(nums), target.cell, def.effect.radius));
  ctx.emit({ t: 'area', gemId: def.id, cells: [...cells] });
  const durationMs = curse.durationMs * nums.durationMult;
  const effect = (1 + (CURSE_PCT_PER_LEVEL / 100) * (level - 1)) * (1 + mods.curseEffect / 100);
  for (const m of aliveMonsters(c)) {
    if (!cells.has(m.cell)) continue;
    const f = effect * (m.isBoss ? CURSE_BOSS_EFFECT : 1);
    m.curse = {
      gemId: def.id,
      remainingMs: durationMs,
      durationMs,
      physTaken: (curse.physTaken ?? 0) * f,
      resPen: (curse.resPen ?? 0) * f,
      dealLess: (curse.dealLess ?? 0) * f,
      slow: (curse.slow ?? 0) * f,
      spreads: mods.specials.has('contagion') || undefined,
      withers: mods.specials.has('witherwill') || undefined,
      bleedTaken: curse.bleedTaken ? curse.bleedTaken * f : undefined,
      weeping: mods.specials.has('weeping') || undefined,
    };
    if (mods.specials.has('crackedhide')) m.vulnMs = Math.max(m.vulnMs, durationMs);
    if (mods.specials.has('snare')) m.stunMs = Math.max(m.stunMs, m.isBoss ? 400 : 1000);
  }
}

/** Where a skill's hit lands on the battlefield: Pierce turns any projectile into a beam to the edge; 'all' means the whole field. */
export function skillArea(nums: SkillNumbers): AreaShape {
  const e = nums.def.effect;
  if (nums.mods.specials.has('pierce')) return 'beam';
  return e.area ?? (e.targets === 'all' ? 'field' : 'target');
}

// ---------- kills & death ----------

/** The last martyr's death breaks the chains. Martyrs give no xp or loot: they're only the way to the boss. */
function onMartyrDeath(c: CombatRuntime, ctx: Ctx, mon: MonsterInstance): void {
  if (c.monsters.some((m) => m.martyr && m !== mon && m.life > 0)) return;
  const boss = c.monsters.find((m) => m.isBoss && m.chained);
  if (!boss) return;
  boss.chained = undefined;
  ctx.emit({ t: 'bossPhase', name: boss.name, text: 'loses its martyrs: strike now!' });
}

function onMonsterDeath(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance): void {
  const c = s.combat!;
  const zone = zoneDef(c.zoneId);
  if (mon.martyr) return onMartyrDeath(c, ctx, mon);
  ctx.emit({ t: 'kill', name: mon.name, boss: mon.isBoss });
  c.hungerMs = HUNGER_MS;
  ascendancyKill(s, d, mon);
  s.lifetime.kills += 1;
  const xp = monsterXp(mon) * xpLevelMultiplier(characterLevel(s), mon.level) * (zoneDef(s.combat!.zoneId).xpScale ?? 1);
  grantXp(s, ctx, 'combat', xp * (1 + d.charXp / 100));
  grantGemXp(s, ctx, xp, d.attributes);
  gainCharges(s, mon.isBoss ? 8 : 1, d);
  rollLoot(s, ctx, mon, zone, d);
  rollMapDrops(s, ctx, mon);

  // Virulence: poisons jump to another enemy
  const spreading = mon.dots.filter((x) => x.kind === 'poison' && x.spreads && x.remainingMs > 0);
  const next = aliveMonsters(c)[0];
  if (spreading.length && next) for (const p of spreading) next.dots.push({ ...p, dealt: 0 });
  // Blood Trail: so does the bleed
  const bleed = mon.dots.find((x) => x.kind === 'bleed' && x.spreads && x.remainingMs > 0);
  if (bleed && next) applyDot(next, { ...bleed, dealt: 0 });
  const ignite = mon.dots.find((x) => x.kind === 'ignite' && x.remainingMs > 0);
  if (d.raw.igniteSpread && ignite && next) applyDot(next, { ...ignite, dealt: 0 });
  // Pyre: a burning corpse bursts over the pack
  if (ignite?.pyre) {
    for (const m of aliveMonsters(c).filter((x) => !shielded(x))) {
      const amount = Math.max(1, Math.round(mon.maxLife * 0.1 * (1 - m.res.fire / 100)));
      damageMonster(s, m, amount);
      ctx.emit({ t: 'hit', target: 'monster', amount, dmgType: 'fire', monsterUid: m.uid });
    }
  }
  // Contagion: the curse moves on with the time it had left; Wither Will: it pays you back
  if (mon.curse?.spreads && next && !next.curse) next.curse = { ...mon.curse };
  if (mon.curse?.withers) s.life = Math.min(d.maxLife, s.life + d.maxLife * 0.04);
  // Blood Frenzy: kills keep Berserk going
  const frenzy = c.buffs.find((b) => b.extendMaxMs && b.durationMs < b.extendMaxMs);
  if (frenzy) {
    const add = Math.min(1000, frenzy.extendMaxMs! - frenzy.durationMs);
    frenzy.durationMs += add;
    frenzy.remainingMs += add;
  }

  if (mon.isBoss) {
    c.monsters = c.monsters.filter((m) => !m.martyr);
    s.lifetime.bossKills += 1;
    if (s.maps.run) s.maps.run.bossDown = true;
    s.zoneKills[zone.id] = 0;
    // Nothing But Will: Ysolde with no unique equipped
    if (zone.id === 'sanctum' && s.character.classId === 'exile' && !Object.values(s.equipment).some((it) => it?.rarity === 'unique')) {
      s.lifetime.exileBareKills = (s.lifetime.exileBareKills ?? 0) + 1;
    }
    if (!s.bossesDefeated.includes(zone.id)) {
      s.bossesDefeated.push(zone.id);
      if (zone.actBoss) ctx.emit({ t: 'actComplete', act: zone.act });
      onBossFirstKill(s, ctx, zone.id, zone.act);
    }
    const act = reachedAct(s);
    for (const next of openReachedZones(s)) ctx.emit({ t: 'zoneUnlocked', zoneId: next.id });
    // a new act's batch goes on sale straight away
    if (reachedAct(s) > act) {
      s.vendor.refreshAt = 0;
      ctx.emit({ t: 'info', text: `New gems from Act ${reachedAct(s)} have reached the Town's Gem shop.`, tone: 'good' });
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
  const lost = groundOnDeath(s);
  if (!ctx.offline && lost) ctx.emit({ t: 'info', text: `${lost} unclaimed ${lost === 1 ? 'item' : 'items'} lost on the ground`, tone: 'warn' });
  else if (!ctx.offline && groundAtRisk(s)) ctx.emit({ t: 'info', text: 'Pick up your loot: die again and it is lost', tone: 'warn' });
  retreat(s);
}

// ---------- incoming damage ----------

function counterAttack(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance): void {
  const nums = skillNumbers(d, null);
  const roll = rollHit(s, ctx, d, nums, mon);
  if (roll) hitMonster(s, ctx, d, nums, mon, roll.byType, roll.crit, 2, roll.mega, roll.coup);
}

/** Duelist: blocking or evading a hit answers with a weapon strike. A Matador only answers evades, a Vanguard only blocks. */
function riposte(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance, how: 'block' | 'evade', phalanx = false): void {
  const c = s.combat!;
  const r = d.raw;
  const asc = ascendancyOf(s);
  if (mechanicOf(s) !== 'riposte' || mon.life <= 0 || (c.riposteMs > 0 && !r.perfectForm && !phalanx)) return;
  if ((asc === 'matador' && how === 'block') || (asc === 'vanguard' && how === 'evade')) return;
  c.riposteMs = RIPOSTE_COOLDOWN_MS / (1 + r.riposteCooldown / 100);
  const nums = skillNumbers(d, null);
  const truth = c.asc.streak >= 10 && hasAscNode(s, 'matador_moment_of_truth');
  if (truth) c.ambush = true;
  const factor = (1 + r.ripostePct / 100) * (r.perfectForm ? 0.5 : 1) * (phalanx ? PHALANX_MULT : 1) * (1 + (STREAK_MORE * c.asc.streak) / 100);
  c.riposting = true;
  const roll = rollHit(s, ctx, d, nums, mon);
  if (roll) {
    hitMonster(s, ctx, d, nums, mon, roll.byType, roll.crit, factor, roll.mega, roll.coup);
    if (asc === 'vanguard') {
      const reach = hasAscNode(s, 'vanguard_press_forward') ? 2 : 1;
      for (const m of aliveMonsters(c)) if (m !== mon && cellRing(m.cell) <= reach) hitMonster(s, ctx, d, nums, m, roll.byType, roll.crit, factor, roll.mega, roll.coup);
    }
    if (asc === 'matador') c.asc.streak = truth ? 0 : Math.min(streakCap(s), c.asc.streak + 1);
  }
  c.riposting = false;
  if (r.riposteHeal) s.life = Math.min(d.maxLife, s.life + (d.maxLife * r.riposteHeal) / 100);
}

/** Templar: incoming damage (before mitigation) fills Fervor; full Fervor releases a holy nova. A Lightkeeper stores it instead. */
function martyrFill(s: GameState, ctx: Ctx, d: Derived, raw: number, novaShare = 1): void {
  const c = s.combat!;
  if (mechanicOf(s) !== 'martyr') return;
  c.mechDamage += raw * novaShare;
  c.mech = Math.min(100, c.mech + (raw / fervorThreshold(d)) * 100);
  if (c.mech < 100) return;
  if (ascendancyOf(s) !== 'lightkeeper') {
    const filled = c.mechDamage;
    c.mech = 0;
    c.mechDamage = 0;
    holyNova(s, ctx, d, filled, 1);
  } else if (c.asc.novas < NOVA_STORE) {
    c.asc.novas += 1;
    c.asc.novaDamage += c.mechDamage;
    c.mech = 0;
    c.mechDamage = 0;
  }
}

/** One or more novas at once: damage to every enemy from what filled them, a heal for each. */
function holyNova(s: GameState, ctx: Ctx, d: Derived, filled: number, count: number): void {
  const c = s.combat!;
  const r = d.raw;
  const dmg = filled * 0.5 * (1 + r.novaPct / 100) * (hasAscNode(s, 'lightkeeper_reserve') ? 1 + RESERVE_MORE * (count - 1) : 1);
  if (!r.saintsSacrifice) s.life = Math.min(d.maxLife, s.life + count * d.maxLife * 0.2 * (1 + r.novaHeal / 100));
  if (r.novaEs) s.es = Math.min(d.maxEs, s.es + (count * d.maxEs * r.novaEs) / 100);
  ctx.emit({ t: 'info', text: count > 1 ? `Fervor releases ${count} holy novas!` : 'Fervor releases a holy nova!', tone: 'good' });
  const beacon = hasAscNode(s, 'lightkeeper_beacon');
  const dawn = count >= NOVA_STORE && hasAscNode(s, 'lightkeeper_dawn');
  for (const m of aliveMonsters(c).filter((x) => !shielded(x))) {
    const amount = Math.max(1, Math.round(dmg * (1 - m.res.light / 100)));
    damageMonster(s, m, amount);
    ctx.emit({ t: 'hit', target: 'monster', amount, dmgType: 'light', monsterUid: m.uid });
    if (beacon) m.vulnMs = Math.max(m.vulnMs, 4000);
    if (dawn) m.stunMs = Math.max(m.stunMs, m.isBoss ? 400 : 1000);
  }
  if (dawn) c.asc.dawn = true;
  if (hasAscNode(s, 'lightkeeper_vespers')) {
    c.shield = Math.max(c.shield, d.maxLife * VESPERS_SHIELD * (1 + r.shieldEffect / 100));
    c.shieldMax = Math.max(c.shieldMax, c.shield);
  }
}

/** Lightkeeper: let the stored novas go, with a click or when the release setting says so. */
export function releaseNovas(s: GameState, ctx: Ctx): void {
  const c = s.combat;
  if (!c || c.asc.novas <= 0) return;
  const count = c.asc.novas;
  const filled = c.asc.novaDamage;
  c.asc.novas = 0;
  c.asc.novaDamage = 0;
  holyNova(s, ctx, deriveStats(s), filled, count);
}

/** The Lightkeeper's standing order, if its rule is earned; a setting still locked falls back to releasing at full. */
function novasDue(s: GameState, d: Derived): boolean {
  const c = s.combat!;
  const full = c.asc.novas >= NOVA_STORE;
  const alive = aliveMonsters(c);
  switch (s.ascendancy.release) {
    case 'manual':
      return false;
    case 'windup':
      if (ruleLockReason(s, 'enemyCasting')) return full;
      return alive.some((m) => m.casting >= 0) || (full && !alive.some((m) => m.isBoss));
    case 'lifeLow':
      if (ruleLockReason(s, 'lifeBelow')) return full;
      return s.life < d.maxLife / 2;
    case 'full':
      return full;
  }
}

/** Flagellant: every skill draws Life, which fills Fervor faster than a hit does. This can kill you. */
function selfHarm(s: GameState, ctx: Ctx, d: Derived): void {
  const cost = (d.maxLife * SELF_HARM_PCT) / 100;
  s.life -= cost;
  martyrFill(s, ctx, d, cost * SELF_HARM_FERVOR, hasAscNode(s, 'flagellant_scourge') ? SCOURGE_DAMAGE : 1);
}

/** Anvil: whoever hits you breaks on your Armour, harder the more Rage you hold. */
function anvilAnswer(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance): void {
  const c = s.combat!;
  const ring1 = aliveMonsters(c).filter((m) => cellRing(m.cell) === 1).length;
  gainMeter(s, d, 1 + (hasAscNode(s, 'anvil_hold_the_line') ? HOLD_THE_LINE_RAGE * ring1 : 0));
  if (mon.life <= 0) return;
  const amount = Math.max(1, Math.round(d.armour * (ANVIL_THORNS_PCT / 100) * (1 + ANVIL_THORNS_PER_RAGE * c.mech)));
  damageMonster(s, mon, amount);
  ctx.emit({ t: 'hit', target: 'monster', amount, dmgType: 'phys', monsterUid: mon.uid });
  if (meterFull(s, d) && hasAscNode(s, 'anvil_unmoved')) mon.stunMs = Math.max(mon.stunMs, mon.isBoss ? 400 : 1000);
}

/** Everything that happens when a Coup de Grâce lands on an enemy. */
function afterCoup(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance): void {
  const c = s.combat!;
  const asc = ascendancyOf(s);
  if (asc === 'headsman') {
    if (!mon.isBoss && mon.life < mon.maxLife * THE_BLOCK_AT && hasAscNode(s, 'headsman_the_block')) mon.life = 0;
    if (mon.life <= 0) c.mech = Math.max(c.mech, meterMax('malice', d.raw) / 2);
    else if (hasAscNode(s, 'headsman_marked')) mon.vulnMs = Math.max(mon.vulnMs, 6000);
  }
  if (asc !== 'plaguewright' || !mon.dots.length) return;
  // a burst deals everything its ailments had left, all at once
  const kinds = new Set(mon.dots.map((x) => x.kind)).size;
  const left = mon.dots.reduce((a, x) => a + (x.dps * x.remainingMs) / 1000, 0);
  const burst = Math.round(left * (hasAscNode(s, 'plaguewright_bloom') ? 1 + (BLOOM_MORE * kinds) / 100 : 1));
  damageMonster(s, mon, burst);
  ctx.emit({ t: 'hit', target: 'monster', amount: burst, crit: true, dmgType: 'phys', monsterUid: mon.uid });
  if (hasAscNode(s, 'plaguewright_pandemic')) {
    const ring = cellRing(mon.cell);
    for (const m of aliveMonsters(c)) if (m !== mon && Math.abs(cellRing(m.cell) - ring) <= 1) for (const x of mon.dots) applyDot(m, { ...x, dealt: 0 });
  }
  mon.dots = [];
}

/** What a kill does for your ascendancy. */
function ascendancyKill(s: GameState, d: Derived, mon: MonsterInstance): void {
  const c = s.combat!;
  if (rampaging(s)) {
    if (hasAscNode(s, 'ravager_bloodlust')) {
      c.asc.rampageMs += RAMPAGE_KILL_MS;
      c.asc.rampageTotal += RAMPAGE_KILL_MS;
    }
    if (hasAscNode(s, 'ravager_no_mercy')) c.asc.holdMs = NO_MERCY_HOLD_MS;
  }
  if (hasAscNode(s, 'wildcaster_feedback')) s.mana = Math.min(d.maxMana, s.mana + d.maxMana * FEEDBACK_MANA);
  if (hasAscNode(s, 'plaguewright_contagion')) {
    const nearest = aliveMonsters(c).find((m) => m !== mon);
    if (nearest) for (const x of mon.dots) if (x.remainingMs > 0) applyDot(nearest, { ...x, dealt: 0 });
  }
}

/** Falconer: the hawk flies over the front line, so it goes for anything on the field, by its own targeting. */
export function hawkTarget(s: GameState): MonsterInstance | undefined {
  const { priority, order } = s.ascendancy.hawk;
  const hooded = hasAscNode(s, 'falconer_hooded');
  const group = (m: MonsterInstance) => (hooded && m.attackKind === 'spell' ? 0 : inPriority(priority, m) ? 1 : 2);
  const key = (m: MonsterInstance) => (order === 'farthest' ? -cellRing(m.cell) : order === 'lowest' ? m.life : order === 'highest' ? -m.life : cellRing(m.cell));
  return aliveMonsters(s.combat!).sort((a, b) => group(a) - group(b) || key(a) - key(b) || a.uid - b.uid)[0];
}

function hawkStep(s: GameState, ctx: Ctx, d: Derived, dt: number): void {
  const c = s.combat!;
  c.asc.hawkMs -= dt;
  if (c.asc.hawkMs > 0) return;
  const mon = hawkTarget(s);
  if (!mon) return;
  c.asc.hawkMs = hawkInterval(s, d);
  const stoop = meterFull(s, d) && hasAscNode(s, 'falconer_stoop');
  const nums = skillNumbers(d, null);
  c.asc.hawking = true;
  const roll = rollHit(s, ctx, d, nums, mon, stoop);
  if (roll) hitMonster(s, ctx, d, nums, mon, roll.byType, roll.crit, HAWK_DAMAGE * (stoop ? STOOP_MULT : 1), roll.mega, roll.coup);
  c.asc.hawking = false;
  if (!stoop) return;
  c.mech = 0;
  mon.stunMs = Math.max(mon.stunMs, mon.isBoss ? 400 : 1000);
}

/** Rampages, Head Start, Burnout's rearming, Ecstasy and stored novas. */
function ascendancyStep(s: GameState, ctx: Ctx, d: Derived, dt: number, fighting: boolean): void {
  const c = s.combat!;
  const a = c.asc;
  const asc = ascendancyOf(s);
  if (!asc) return;
  if (fighting && !a.fighting && hasAscNode(s, 'longshot_head_start')) c.mech = Math.max(c.mech, Math.min(HEAD_START_MOMENTUM, meterMax('momentum', d.raw)));
  a.fighting = fighting;
  if (s.mana >= d.maxMana / 2) a.burnoutRearmed = true;
  if (asc === 'lightkeeper' && fighting && a.novas > 0 && novasDue(s, d)) releaseNovas(s, ctx);
  if (hasAscNode(s, 'flagellant_ecstasy')) {
    c.buffs = c.buffs.filter((b) => b.id !== 'ecstasy');
    if (s.life < d.maxLife / 2) c.buffs.push({ id: 'ecstasy', source: 'skill', remainingMs: 200, durationMs: 200, stats: { attackSpeedPct: ECSTASY_SPEED, castSpeedPct: ECSTASY_SPEED } });
  }
  if (asc !== 'ravager') return;
  const max = meterMax('rage', d.raw);
  if (a.rampageMs <= 0 && fighting && c.mech >= max) {
    a.rampageMs = a.rampageTotal = RAMPAGE_MS;
    ctx.emit({ t: 'info', text: 'Rampage!', tone: 'good' });
  }
  if (a.rampageMs <= 0) return;
  // the meter follows the clock, so hits landed during a Rampage don't hold it up
  if (a.holdMs > 0) a.holdMs -= dt;
  else a.rampageMs -= dt;
  c.mech = a.rampageMs > 0 ? (max * a.rampageMs) / a.rampageTotal : 0;
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
  if (mon.curse) raw *= 1 - mon.curse.dealLess / 100;
  if (mon.dots.some((x) => x.kind === 'poison')) raw *= 1 - r.poisonWeaken / 100;
  if (kind === 'slam') raw *= 1 - r.slamReduction / 100;
  if (underPlayer(c, 'shocked')) raw *= SHOCKED_GROUND_TAKEN;
  // Dawn: the light takes the next wind-up in your place
  if (isCast && c.asc.dawn) {
    c.asc.dawn = false;
    ctx.emit({ t: 'hit', target: 'player', amount: 0, dmgType: type, blocked: true, monsterUid: mon.uid });
    return;
  }
  if (c.evadeMs > 0) {
    ctx.emit({ t: 'hit', target: 'player', amount: 0, dmgType: type, evaded: true, monsterUid: mon.uid });
    onEvade(s, d);
    riposte(s, ctx, d, mon, 'evade');
    return;
  }
  if (c.blocks > 0 && kind !== 'nova') {
    c.blocks -= 1;
    if (c.counterweight) c.counterweightMore = Math.min(30, (c.counterweightMore ?? 0) + 15);
    if (c.retaliate) counterAttack(s, ctx, d, mon);
    onBlock(s, ctx, d, mon, raw, type, isCast);
    return;
  }
  // staves: a flat chance to block, capped at 75%
  if (r.blockChance > 0 && kind !== 'nova' && chance(ctx.rng, Math.min(75, r.blockChance) / 100)) {
    onBlock(s, ctx, d, mon, raw, type, isCast);
    return;
  }
  // spell block: any monster spell, telegraphed novas included
  if (r.spellBlock > 0 && (kind === 'nova' || (kind === 'hit' && mon.attackKind === 'spell')) && chance(ctx.rng, Math.min(75, r.spellBlock) / 100)) {
    onBlock(s, ctx, d, mon, raw, type, isCast);
    return;
  }
  // heavy wind-ups can't be evaded by Evasion Rating (unless Wind Dancer) — guard, interrupt or drink
  if ((!isCast || r.windDancer) && chance(ctx.rng, evadeChance(d.evasion, mon.level))) {
    ctx.emit({ t: 'hit', target: 'player', amount: 0, dmgType: type, evaded: true, monsterUid: mon.uid });
    onEvade(s, d);
    riposte(s, ctx, d, mon, 'evade');
    return;
  }
  // the hit lands
  const mech = mechanicOf(s);
  const asc = ascendancyOf(s);
  if (asc === 'matador') c.asc.streak = hasAscNode(s, 'matador_close_call') ? Math.floor(c.asc.streak / 2) : 0;
  if (asc === 'anvil') anvilAnswer(s, ctx, d, mon);
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
    if (c.shield <= 0 && c.barbedWard) {
      damageMonster(s, mon, c.barbedWard);
      ctx.emit({ t: 'hit', target: 'monster', amount: Math.round(c.barbedWard), dmgType: 'phys', monsterUid: mon.uid });
      c.barbedWard = undefined;
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
  if (isCast && s.life > 0 && hasAscNode(s, 'anvil_shatter')) c.mech = meterMax('rage', d.raw);
}

/** Any block, however it came about. */
function onBlock(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance, raw: number, type: DamageType, isCast: boolean): void {
  const c = s.combat!;
  const r = d.raw;
  ctx.emit({ t: 'hit', target: 'player', amount: 0, dmgType: type, blocked: true, monsterUid: mon.uid });
  if (r.blockHeal) s.life = Math.min(d.maxLife, s.life + (d.maxLife * r.blockHeal) / 100);
  if (hasAscNode(s, 'anvil_temper')) anvilAnswer(s, ctx, d, mon);
  if (hasAscNode(s, 'vanguard_stand_fast')) {
    c.buffs = c.buffs.filter((b) => b.id !== 'stand_fast');
    c.buffs.push({ id: 'stand_fast', source: 'skill', remainingMs: 3000, durationMs: 3000, stats: { armourPct: STAND_FAST_ARMOUR } });
  }
  martyrFill(s, ctx, d, raw);
  riposte(s, ctx, d, mon, 'block', isCast && mon.isBoss && hasAscNode(s, 'vanguard_phalanx'));
}

// ---------- ground ----------

/** monster ground: damage per second as a fraction of the monster's hit, and how long it lasts */
export const MONSTER_GROUND_DPS = 0.08;
export const MONSTER_GROUND_MS = 3000;
export const BOSS_NOVA_GROUND_DPS = 0.12;
export const BOSS_NOVA_GROUND_MS = 4000;

/** Surefoot: how long hazards under you do nothing after a movement skill. */
export const SUREFOOT_MS = 3000;

const groundProof = (c: CombatRuntime) => (c.groundProofMs ?? 0) > 0;

function underPlayer(c: CombatRuntime, kind: Ground['kind']): boolean {
  return !groundProof(c) && c.ground.some((g) => g.cell === PLAYER_SPOT && g.kind === kind);
}

/** A movement skill leaves whatever is under you behind: the player stays put on the field, so the hazard goes instead. */
function stepOut(s: GameState, ctx: Ctx, surefoot: boolean): void {
  const c = s.combat!;
  const left = c.ground.filter((g) => g.cell !== PLAYER_SPOT);
  if (left.length < c.ground.length) ctx.emit({ t: 'info', text: 'You step out of the hazard.', tone: 'good' });
  c.ground = left;
  if (surefoot) c.groundProofMs = SUREFOOT_MS;
}

/**
 * Hazards burn whatever stands on them. The player's ground hurts monsters on its cells (through their
 * resistances; chilled ground chills, shocked ground breaks armour). Monster ground sits under the player,
 * hurting through resistances and energy shield; running or fleeing steps out of it faster.
 */
function tickGround(s: GameState, ctx: Ctx, d: Derived, dt: number): void {
  const c = s.combat!;
  if (!c.ground.length) return;
  const outPace = currentMovement(s) === 'run' || currentMovement(s) === 'flee' || c.buffs.some((b) => b.outpace) ? STEP_OUT_RATE : 1;
  for (const g of c.ground) {
    const t = Math.min(dt, g.remainingMs);
    const type = GROUND[g.kind].type;
    if (g.cell === PLAYER_SPOT) {
      let dmg = groundProof(c) ? 0 : (g.dps * t) / 1000;
      if (type !== 'phys') dmg *= (1 - d.res[type] / 100) * (1 - d.raw.elemTakenReduction / 100);
      const toEs = Math.min(s.es, dmg);
      s.es -= toEs;
      s.life -= dmg - toEs;
      c.groundAcc += dmg;
      g.remainingMs -= dt * outPace;
      continue;
    }
    for (const m of aliveMonsters(c)) {
      if (m.cell !== g.cell || shielded(m)) continue;
      const dmg = ((g.dps * t) / 1000) * (type === 'phys' ? 1 : 1 - m.res[type] / 100);
      damageMonster(s, m, dmg);
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

function tickDots(s: GameState, ctx: Ctx, d: Derived, dt: number): void {
  const c = s.combat!;
  const plague = ascendancyOf(s) === 'plaguewright';
  for (const m of aliveMonsters(c)) {
    if (plague) gainMeter(s, d, (m.dots.length * PLAGUE_MALICE_PER_S * dt) / 1000);
    for (const dot of m.dots) {
      const t = Math.min(dt, dot.remainingMs);
      const dmg = shielded(m) ? 0 : (bleedDps(m, dot) * t) / 1000;
      damageMonster(s, m, dmg);
      m.dotAcc += dmg;
      dot.dealt += dmg;
      dot.remainingMs -= dt;
      if (dot.remainingMs <= 0 && dot.burst && dot.dealt > 0) {
        const burst = dot.dealt * dot.burst;
        damageMonster(s, m, burst);
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
  if (mon.martyr) return;
  mon.vulnMs = Math.max(0, mon.vulnMs - dt);
  mon.chillMs = Math.max(0, mon.chillMs - dt);
  if (mon.shockMs) mon.shockMs = Math.max(0, mon.shockMs - dt);
  if (mon.curse) {
    mon.curse.remainingMs -= dt;
    if (mon.curse.remainingMs <= 0) mon.curse = undefined;
  }
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
  const speed = (mon.enraged ? BOSS_ENRAGE_SPEED : 1) * (d.raw.overclock ? 1.6 : 1) * (1 - (mon.curse?.slow ?? 0) / 100);
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

/** Fresh martyrs on the free hexes nearest the boss's place in the field, and the chains go back on. */
function chainMartyrs(s: GameState, ctx: Ctx, boss: MonsterInstance): void {
  const c = s.combat!;
  const cells = freeNear(c.monsters, BOSS_CELL, ctx.rng).filter((i) => cellRing(i) >= 2).slice(0, BOSS_MARTYR_COUNT);
  for (const cell of cells) {
    const m = makeMonster({ ...MARTYR, level: boss.level }, false, newUid(s));
    m.martyr = true;
    m.damage = 0;
    m.cell = cell;
    c.monsters.push(m);
  }
  boss.chained = cells.length > 0 || undefined;
  if (cells.length) ctx.emit({ t: 'bossPhase', name: boss.name, text: 'chains its martyrs: strike them down!' });
}

/** Life-threshold boss mechanics (enrage, ward, martyrs) and timed adds. These run even while the boss is stunned. */
function bossPhases(s: GameState, ctx: Ctx, mon: MonsterInstance, dt: number): void {
  const has = (k: BossMechanic) => mon.mechanics.includes(k);
  const lifeFrac = mon.life / mon.maxLife;
  if (has('enrage') && !mon.enraged && lifeFrac <= BOSS_ENRAGE_AT) {
    mon.enraged = true;
    ctx.emit({ t: 'bossPhase', name: mon.name, text: 'flies into a rage!' });
  }
  if (has('martyrs') && (mon.martyrWaves ?? 0) < BOSS_MARTYR_AT.length && lifeFrac <= BOSS_MARTYR_AT[mon.martyrWaves ?? 0]) {
    mon.martyrWaves = (mon.martyrWaves ?? 0) + 1;
    chainMartyrs(s, ctx, mon);
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
      const adds = aliveMonsters(c).filter((x) => !x.isBoss && !x.martyr).length;
      const zone = zoneDef(c.zoneId);
      const fresh: MonsterInstance[] = [];
      for (let i = adds; i < BOSS_SUMMON_COUNT; i++) fresh.push(makeMonster(pick(ctx.rng, zone.monsters), false, newUid(s), PACK_LIFE_SCALE));
      // new adds appear at the boss's side, in front of it where there's room, to shield it
      const behind = (i: number) => Number(cellRing(i) > cellRing(mon.cell));
      const near = freeNear(c.monsters, mon.cell, ctx.rng).sort((a, b) => behind(a) - behind(b));
      const placed = fresh.slice(0, near.length);
      placed.forEach((m, i) => {
        m.cell = near[i];
        c.monsters.push(m);
      });
      if (placed.length) ctx.emit({ t: 'bossPhase', name: mon.name, text: `calls for aid (+${placed.length})` });
    }
  }
  if (has('scorch')) {
    mon.timers.scorch = (mon.timers.scorch ?? BOSS_SCORCH_EVERY_MS) - dt;
    if (mon.timers.scorch <= 0) {
      mon.timers.scorch = BOSS_SCORCH_EVERY_MS;
      const kind = groundFor(mon.novaType);
      layGround(s.combat!.ground, PLAYER_SPOT, kind, mon.damage * BOSS_SCORCH_DPS, BOSS_SCORCH_MS);
      ctx.emit({ t: 'bossPhase', name: mon.name, text: `scorches the earth: ${GROUND[kind].name.toLowerCase()} under you!` });
    }
  }
}

/** Wind-ups: slam and nova. Returns true while the boss is busy casting. */
function bossCasts(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance, dt: number): boolean {
  if (mon.casting >= 0) {
    mon.casting -= dt * (1 - (mon.curse?.slow ?? 0) / 100);
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
  tickDpsMeter(c, dt);

  // timers, buffs and recovery
  for (const b of c.buffs) b.remainingMs -= dt;
  const expired = c.buffs.filter((b) => b.remainingMs <= 0);
  c.buffs = c.buffs.filter((b) => b.remainingMs > 0);
  if (expired.some((b) => b.source === 'skill' && SHIELD_SKILLS.includes(b.id))) {
    c.shield = 0;
    c.glacial = false;
    c.barbedWard = undefined;
  }
  for (let i = 0; i < c.cooldowns.length; i++) c.cooldowns[i] = Math.max(0, c.cooldowns[i] - dt);
  c.evadeMs = Math.max(0, c.evadeMs - dt);
  if (c.groundProofMs) c.groundProofMs = Math.max(0, c.groundProofMs - dt);
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
  // there's no natural regen in a fight, so a flight that has shaken off every monster is a breather
  if (c.fleeing && !c.monsters.length) {
    s.life = Math.min(d.maxLife, s.life + (d.maxLife * FLEE_BREATHER_REGEN * dt) / 1000);
    s.mana = Math.min(d.maxMana, s.mana + (d.maxMana * FLEE_BREATHER_REGEN * dt) / 1000);
  }
  c.esDelayMs = Math.max(0, c.esDelayMs - dt);
  if (c.esDelayMs <= 0) s.es = Math.min(d.maxEs, s.es + (d.esRecharge * dt) / 1000);

  // instilled flasks
  if (s.life < d.maxLife * 0.5) triggerInstilled(s, ctx, 'lowLife');
  for (let i = 0; i < s.flaskSlots.length; i++) {
    const f = s.flaskSlots[i];
    if (f?.instill === 'fullCharges' && f.charges >= flaskCapacity(s, f) && !flaskActive(s, f.flaskId)) {
      useFlask(s, ctx, i, true);
    }
  }

  autoFlee(s, ctx, d);
  advanceSpawns(s, ctx, dt);
  shakeOff(s, ctx, dt);
  if (!c.monsters.length) return expired.length > 0;

  // damage over time
  tickDots(s, ctx, d, dt);
  tickGround(s, ctx, d, dt);
  reapDead(s, ctx, d);
  // burning ground can finish you off even as the last monster falls
  if (checkDeath(s, ctx, d) || !c.monsters.length) return true;

  // the player's turn (an overheated Overclock sits it out)
  if (c.overheatMs > 0) c.overheatMs -= dt;
  else c.actionMs -= underPlayer(c, 'chilled') ? dt * CHILLED_GROUND_SLOW : dt;
  if (c.actionMs <= 0) {
    // instant skills don't use up the turn: fire them and choose again. Each goes on cooldown,
    // so this ends on a skill that takes time (at worst the Default Attack); the cap is a safety net
    for (let n = 0; n < 8; n++) {
      const choice = chooseSkill(s, d);
      if (choice.closeIn) {
        closeIn(s, ctx, d, choice.target!);
        break;
      }
      if (choice.slot < 0 && !choice.target) {
        // nothing in reach and no way in: wait for the field to change
        c.using = null;
        c.closingUid = undefined;
        c.actionTotal = IDLE_MS;
        c.actionMs = Math.max(c.actionMs + IDLE_MS, IDLE_MS * 0.5);
        break;
      }
      performSkill(s, ctx, d, choice.slot, choice.nums, choice.manual, choice.target, choice.aim);
      reapDead(s, ctx, d);
      if (!s.combat || !c.monsters.length) return true;
      if (choice.nums.actionMs <= 0) continue;
      const time = choice.nums.actionMs / (1 + 0.06 * c.flurryStacks);
      c.actionTotal = time;
      c.actionMs = Math.max(c.actionMs + time, time * 0.5);
      break;
    }
  }

  if (ascendancyOf(s) === 'falconer') {
    hawkStep(s, ctx, d, dt);
    reapDead(s, ctx, d);
    if (!c.monsters.length) return true;
  }

  // the monsters' turn
  advanceMonsters(c.monsters, dt, new Set(c.ground.filter((g) => g.cell >= 0).map((g) => g.cell)));
  for (const m of aliveMonsters(c)) {
    monsterTurn(s, ctx, d, m, dt);
    if (s.life <= 0) break;
  }
  reapDead(s, ctx, d);
  checkDeath(s, ctx, d);
  return true;
}

/** Die if life ran out (Eternal Hunger: not while it's fed). Returns true when the fight is over. */
function checkDeath(s: GameState, ctx: Ctx, d: Derived): boolean {
  const c = s.combat;
  if (!c) return true;
  if (s.life > 0) return false;
  if (d.raw.eternalHunger && c.hungerMs > 0) {
    s.life = 1;
    return false;
  }
  die(s, ctx, d);
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
  ascendancyStep(s, ctx, d, dt, fighting);
  if (mech === 'rage' && !fighting && !r.endlessFury && !rampaging(s)) c.mech = Math.max(0, c.mech - (RAGE_DECAY_PER_S * (1 - Math.min(100, r.rageDecay) / 100) * dt) / 1000);
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

/** Put a spare flask in the first empty belt slot. Returns why it couldn't, or null. */
export function wearFlask(s: GameState, uid: number): string | null {
  const slot = s.flaskSlots.findIndex((f) => !f);
  if (slot < 0) return 'Your belt is full: swap a flask on the Equipment page';
  equipFlask(s, uid, slot);
  return null;
}

export function unequipFlask(s: GameState, slot: number): void {
  const f = s.flaskSlots[slot];
  if (!f) return;
  s.flaskStash.push(f);
  s.flaskSlots[slot] = null;
}
