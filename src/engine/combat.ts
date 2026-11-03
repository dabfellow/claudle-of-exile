import { ACTIVE_GEMS, activeGemDef, DEFAULT_ATTACK, SKILL_BAR_SLOTS, type ActiveGemDef, type SkillAim, type TacticRule, type TargetStatus } from '../data/gems';
import { isHardcore } from './challenge';
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
  BOSS_CHANNEL_DEFAULT,
  BOSS_CHANNEL_EVERY_MS,
  BOSS_CHANNEL_LAND_MULT,
  BOSS_CHANNEL_PULSE_MAX,
  BOSS_CHANNEL_PULSE_MIN,
  BOSS_CHANNEL_PULSE_MS,
  BOSS_CHANNEL_STAGGER_MS,
  BOSS_CHANNEL_SURGE,
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
  BOSS_FROSTBITE_CLEANSE,
  BOSS_FROSTBITE_EVERY_MS,
  BOSS_FROSTBITE_FREEZE_MS,
  BOSS_FROSTBITE_INSTILL_AT,
  BOSS_FROSTBITE_MAX,
  BOSS_FROSTBITE_SHATTER,
  BOSS_FROSTBITE_SLOW_PCT,
  zoneDef,
  type BossMechanic,
  type MonsterDef,
  echoMechanics,
  MECHANIC_INFO,
} from '../data/zones';
import {
  advanceMinions,
  advanceMonsters,
  AUTO_FLEE_AT,
  AUTO_FLEE_RESUME,
  FLEE_BREATHER_REGEN,
  BOSS_CELL,
  BOSS_ENTRY,
  cellDistance,
  cellRing,
  driftCell,
  drawIn,
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
  FROZEN_GROUND_SLOW,
  STORMWATER_COOLDOWN,
  UNHOLY_RECOVERY,
  GROUND,
  groundUnderPlayer,
  monsterGround,
  knockBack,
  layGround,
  MINION_CAP,
  minionCells,
  minionInWay,
  minionTarget,
  neighbors,
  PLAYER_SPOT,
  SHOCKED_GROUND_TAKEN,
  STEP_OUT_RATE,
  stepOutOfGround,
  type AreaShape,
} from './battlefield';
import { ascendancyOf, hasAscNode, newAscendancyRuntime, onBossFirstKill } from './ascendancy';
import { applyDeathPenalty, areaXpMultiplier, characterLevel } from './character';
import { bossLeftToRules, castOrder, ruleLockReason, rulesPass, skillAim } from './automation';
import type { Ctx } from './context';
import { flaskStats } from './flasks';
import { ailmentNumbers, BURN_MS, BURN_SHARE, chainFalloff, gemChains, gemUseReason, IGNITE_MS, IGNITE_SHARE, grantGemXp, LIFE_RESERVE_PCT, MIN_COOLDOWN_MS, minionStats, skillNumbers, stormStats, SPELL_ADDED_EFFECTIVENESS, spellBaseAt, weaponPctAt, type SkillNumbers } from './gems';
import { newUid } from './items';
import { rollLoot } from './loot';
import { mapPackLeft, onMapFieldLost, onMapPack, rollMapDrops } from './maps';
import { chance, pick, rInt } from './rng';
import { grantXp } from './skills';
import {
  ANVIL_THORNS_PCT,
  ANVIL_THORNS_PER_RAGE,
  BLOOM_MORE,
  coupMulti,
  DRAUGHT_MORE,
  ECSTASY_SPEED,
  ensureMechanicFields,
  gainMana,
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
  RIPTIDE_ECHO,
  RIPOSTE_COOLDOWN_MS,
  RIPOSTE_LANDED_MULT,
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
  SPRINGWARD_ES,
  SURGE_MORE,
  surgeReady,
} from './mechanics';
import { armourReduction, deriveStats, ES_RECHARGE_DELAY_MS, evadeChance, hitChance, type Derived } from './stats';
import { gemsArrivingAt } from './hideout';
import { openReachedZones } from './progress';
import type { CombatRuntime, DamageType, Dot, FlaskInstance, GameState, Ground, GroundKind, InstillCondition, Minion, MonsterInstance, Movement, Storm, TargetPriority, Targeting } from './types';

export const SPAWN_DELAY_MS = 900;
/** closing in on a monster out of reach takes this long, shortened by movement speed */
export const CLOSE_IN_MS = 500;
/** with nothing in reach and no way in, the player waits this long before looking again */
const IDLE_MS = 250;
export const DEATH_LIFE_FRACTION = 0.25;
/** each monster in a pack of 2+ is weaker; xp and loot scale with it */
export const PACK_LIFE_SCALE = 0.6;
export const PACK_DMG_SCALE = 0.65;

const DAMAGE_TYPES: DamageType[] = ['phys', 'fire', 'cold', 'light', 'chaos'];
/** a farmed boss comes back this long after it dies */
export const BOSS_RESPAWN_MS = 5000;
/** chilled monsters attack this much slower (plus any chillOnHit) */
export const CHILL_SLOW_PCT = 15;
/** a kill with a heavy skill swings on: the next wind-up takes this share of its time, or LONG_DRAW_CARRY with Long Draw */
export const WINDUP_CARRY = 0.5;
export const LONG_DRAW_CARRY = 0.1;
/** Rage a heavy hit is worth, so one huge hit every few seconds isn't punished for being one hit */
export const HEAVY_RAGE = 4;
/** a boss's Stagger: stuns fill it, and when it's full the boss reels for longer and loses any wind-up. Each time takes STAGGER_GROWTH times as much */
export const STAGGER_FULL = 100;
export const STAGGER_GROWTH = 1.5;
export const STAGGER_PER_STUN = 10;
export const BOSS_STAGGER_MS = 1500;
export const BOSS_STAGGER_CAP_MS = 3000;
/** Recoil's stun, and the Stagger it adds */
const RECOIL_STUN_MS = 2000;
const RECOIL_STAGGER = 25;
/** Reprisal and Succession: the fewest ms between two firings, on top of the skill's own cooldown */
export const TRIGGER_COOLDOWN_MS = 1000;
/** Goaded: the share of a wind-up each hit taken cuts off */
const GOADED_CUT = 0.15;
/** Unmoved: % less damage from hits during a wind-up */
const UNMOVED_LESS = 25;
/** Dying Oath: the share of a fallen legionary's life that becomes shield, and the most shield it can leave, as a share of your life */
const DYING_OATH_SHARE = 0.5;
const DYING_OATH_CAP = 0.5;
/** Collective Guilt: the share of the debt enemies next to the target pay */
const COLLECTIVE_SHARE = 0.5;
/** Reaping Wind: how much longer each kill keeps the storm */
const REAPING_MS = 1000;
/** Eyewall: the share of the shield each enemy struck gives back */
const EYEWALL_SHARE = 0.02;
/** Funeral Rites: the fallen minion's last strike, as a multiple of its hit */
const FUNERAL_MULT = 3;
/** Crowned Storm: the fewest rings a storm around you covers */
const CROWNED_RINGS = 2;

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

/** Global kill-xp knob (docs/design/BALANCE.md). */
export const KILL_XP_SCALE = 0.8;

/** Base character xp for a kill, before the area level multiplier. */
export function monsterXp(mon: MonsterInstance): number {
  return Math.round((5 + mon.level * 3) * (mon.isBoss ? 10 : 1) * (mon.hulking ? HULKING.xp : 1) * mon.scale * KILL_XP_SCALE);
}

/**
 * Hulking monsters, from Act 3 on: now and then one of a pack is a big, slow brute that hits hard and is worth a lot
 * of xp, and area and chain hits mostly glance off it. It rewards a heavy single-target blow over a screen-clearing
 * spell, so skills that only clear can't race through the later acts.
 */
export const HULKING = { fromAct: 3, chance: 0.2, life: 5, damage: 2, xp: 5, slow: 2, areaTaken: 0.4 };

function makeHulking(m: MonsterInstance): void {
  m.hulking = true;
  m.maxLife = m.life = Math.round(m.maxLife * HULKING.life);
  m.damage = Math.round(m.damage * HULKING.damage);
  m.moveMs *= HULKING.slow;
  m.stepMs *= HULKING.slow;
}

/** A monster resists the type it deals by this %. */
export const MONSTER_OWN_RES = 30;
const RESIST_BY_TYPE: Record<DamageType, Partial<MonsterInstance['res']>> = {
  phys: {},
  fire: { fire: MONSTER_OWN_RES },
  cold: { cold: MONSTER_OWN_RES },
  light: { light: MONSTER_OWN_RES },
  chaos: { chaos: MONSTER_OWN_RES },
};

export function makeMonster(def: MonsterDef, boss: boolean, uid = 0, scale = 1): MonsterInstance {
  const life = Math.round(monsterLife(def.level) * (def.lifeMult ?? 1) * (boss ? BOSS_LIFE_MULT : 1) * scale);
  const dmgScale = scale < 1 ? PACK_DMG_SCALE : 1;
  const mechanics: BossMechanic[] = boss ? echoMechanics(def, 0) : [];
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
      ? { slam: BOSS_SLAM_EVERY_MS * 0.6, nova: BOSS_NOVA_EVERY_MS * 0.8, summon: BOSS_SUMMON_EVERY_MS * 0.7, scorch: BOSS_SCORCH_EVERY_MS * 0.5, frostbite: BOSS_FROSTBITE_EVERY_MS, channel: BOSS_CHANNEL_EVERY_MS * 0.7 }
      : {},
    novaType: def.novaType ?? def.dmgType,
    slamType: def.slamType,
    echoes: boss ? def.echoes : undefined,
    casting: -1,
    castKind: null,
    castTotal: 1,
    casts: { slam: def.slam ?? BOSS_SLAM_DEFAULT, nova: def.nova ?? BOSS_NOVA_DEFAULT, channel: def.channel ?? BOSS_CHANNEL_DEFAULT },
    enraged: false,
    ward: 0,
    wardMax: 0,
    wardMs: 0,
    wardsUsed: 0,
    res: { fire: 0, cold: 0, light: 0, chaos: 0, ...RESIST_BY_TYPE[def.dmgType] },
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
    rime: def.rime,
    groundKind: def.groundKind,
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

/** A boss you've beaten can be farmed in its own area. Maps have their own boss rules. */
export function canBossFarm(s: GameState, zoneId: string): boolean {
  return s.bossesDefeated.includes(zoneId) && !s.maps.run;
}

/** Start or stop farming the boss of the area you're in. */
export function toggleBossFarm(s: GameState): void {
  const c = s.combat;
  if (!c) return;
  if (c.bossFarm) c.bossFarm = false;
  else if (canBossFarm(s, c.zoneId)) {
    c.bossFarm = true;
    c.bossRespawnMs = BOSS_RESPAWN_MS;
  }
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
  if (c.bossFarm || bossIsNext(s, zone.id)) ctx.emit({ t: 'bossWaiting', name: zone.boss.name });
  const [lo, hi] = zone.packSize;
  const n = rInt(ctx.rng, lo, hi);
  const scale = n > 1 ? PACK_LIFE_SCALE : 1;
  const room = MOVEMENT[currentMovement(s)].maxField - aliveMonsters(c).length;
  const others = freeEdge(c.monsters)
    .filter((i) => i !== gate)
    .sort((a, b) => cellDistance(a, gate) - cellDistance(b, gate));
  const cells = [gate, ...others].slice(0, Math.min(n, room));
  if (cells.length) onMapPack(s);
  const hulk = zone.act >= HULKING.fromAct && ctx.rng.next() < HULKING.chance ? 0 : -1;
  cells.forEach((cell, i) => {
    const m = makeMonster(pick(ctx.rng, zone.monsters), false, newUid(s), scale);
    if (i === hulk) makeHulking(m);
    m.cell = cell;
    c.monsters.push(m);
  });
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
  const near = freeNear(bodies(c), BOSS_ENTRY, ctx.rng);
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
 * clear, and nothing else arrives while it's alive. A farmed boss is all that comes: fleeing holds its timer, and
 * offline without wind-up rules it stays in hiding like any other boss.
 */
function advanceSpawns(s: GameState, ctx: Ctx, dt: number): void {
  const c = s.combat!;
  const zone = zoneDef(c.zoneId);
  // a boss on 0 life still counts until it's reaped, or a farmed one would come back in the same tick
  if (c.monsters.some((m) => m.isBoss && !m.dead)) return;
  const alive = aliveMonsters(c).length;
  if (c.bossFarm && (!ctx.offline || bossLeftToRules(s, zone))) {
    if (!MOVEMENT[currentMovement(s)].spawnRate) return;
    c.bossRespawnMs = Math.max(0, (c.bossRespawnMs ?? 0) - dt);
    if (!c.bossRespawnMs && !alive) spawnBoss(s, ctx);
    return;
  }
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
  c.frostbite = 0;
  c.frozenMs = 0;
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

/** a Low Mana flask drinks itself below this share of maximum Mana */
const INSTILL_LOW_MANA = 0.3;
/** a hit is savage when it takes at least this share of maximum Life */
const SAVAGE_HIT = 0.2;

/** Hit-enchanted flasks answer the hit that just landed on you. */
function triggerOnHit(s: GameState, ctx: Ctx, d: Derived, taken: number, type: DamageType): void {
  if (taken >= d.maxLife * SAVAGE_HIT) triggerInstilled(s, ctx, 'savageHit');
  if (type === 'fire' || type === 'cold' || type === 'light') triggerInstilled(s, ctx, 'elemHit');
  if (type === 'chaos') triggerInstilled(s, ctx, 'chaosHit');
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
 * Every living monster in the order skills want them: a clicked monster first, then what the skill aims at, then the
 * priority group, then the order; nearest breaks ties. Martyrs are nobody's target unless clicked or aimed at (areas and
 * chains aim at them by themselves), and a chained boss comes last, so the adds in the way of a martyr get cleared.
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

/** A hit with an area or a chain: it goes for martyrs by itself, with no click or rule. */
function spreads(d: Derived, nums: SkillNumbers): boolean {
  const e = nums.def.effect;
  return needsTarget(nums.def) && (skillArea(nums) !== 'target' || (e.targets === 'chain' ? gemChains(nums.def, nums.level) + d.raw.extraChains : 0) + nums.mods.chains > 0);
}

/**
 * Who a skill goes for: the first monster in targeting order that's in range or that you can close in on (a clear
 * way in). Area skills aim at whoever in range puts the most monsters under the hit, within the same priority.
 * Null when nothing can be reached.
 */
export function skillTarget(s: GameState, d: Derived, nums: SkillNumbers, ruleAim?: SkillAim): { mon: MonsterInstance; closeIn: boolean } | null {
  const c = s.combat!;
  const range = skillRange(d, nums.def);
  const aim = ruleAim ?? (spreads(d, nums) ? 'martyrs' : undefined);
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
  /** a slam or nova winding up */
  casting: boolean;
  /** a channel under way, which a rule can tell from a wind-up */
  channeling: boolean;
  boss: boolean;
  meterFull: boolean;
  targetStatus: Set<TargetStatus>;
  /** the ground under the player */
  ground: Set<GroundKind>;
  /** Frostbite stacks on the player */
  frostbite: number;
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
    casting: alive.some((m) => m.casting >= 0 && !channeling(m)),
    channeling: alive.some(channeling),
    boss: alive.some((m) => m.isBoss),
    meterFull: meterFull(s, d),
    targetStatus: monsterStatuses(target),
    ground: groundUnderPlayer(s.combat?.ground ?? []),
    frostbite: s.combat?.frostbite ?? 0,
  };
}

/** Guards whose absorb shield ends with their buff. */
const SHIELD_SKILLS = ACTIVE_GEMS.filter((g) => g.effect.shieldPct).map((g) => g.id);

/** Whether a skill's own effect is currently up (buff, guard, or its ailment on the target). */
export function skillIsActive(c: CombatRuntime, gemId: string): boolean {
  // a stacking buff or Rend only counts once it's at its most, so "while not active" keeps building it up
  const max = activeGemDef(gemId).effect.buff?.maxStacks;
  if (c.buffs.some((b) => b.source === 'skill' && b.id === gemId && (!max || (b.stacks ?? 0) >= max))) return true;
  const rend = activeGemDef(gemId).effect.rend;
  if (rend) {
    const target = c.monsters.find((m) => m.uid === c.targetUid && m.life > 0) ?? aliveMonsters(c)[0];
    return !!target?.rend && target.rend.stacks >= rend.maxStacks;
  }
  // minions and storms count once the gem has all it can keep up, or the field has no room for more
  const called = army(c).filter((x) => x.gemId === gemId);
  if ((called.length && called.length >= called[0].max) || (army(c).length >= MINION_CAP && activeGemDef(gemId).effect.minion)) return true;
  const storms = (c.storms ?? []).filter((x) => x.gemId === gemId);
  if (storms.length && storms.length >= storms[0].max) return true;
  const own = activeGemDef(gemId).effect;
  if (own.blocks && c.blocks > 0) return true;
  if (own.evadeMs && c.evadeMs > 0) return true;
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
    case 'enemyChannels':
      return rc.channeling;
    case 'onGround':
      return !!rule.ground && rc.ground.has(rule.ground);
    case 'frostbite':
      return rc.frostbite > 0 && rc.frostbite >= v;
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
  if (surgeWaiting(s, d, nums)) return 0;
  if (s.life < d.maxLife / 2 && hasAscNode(s, 'flagellant_ecstasy')) return 0;
  return nums.manaCost;
}

/** Wellspring: a full Overflow goes to the next spell that deals damage, not to a ward or a summon. */
function surgeWaiting(s: GameState, d: Derived, nums: SkillNumbers): boolean {
  const e = nums.def.effect;
  return nums.def.tags.includes('spell') && !!e.base && !e.minion && !e.storm && surgeReady(s, d);
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

/** Damage skills need someone in reach; guards, buffs and sustain skills (Consecrate's heal) go off regardless, but a drain has nothing to give without a hit. */
function needsTarget(def: ActiveGemDef): boolean {
  const drains = def.effect.leechLife || def.effect.leechMana;
  return !!(def.effect.weaponPct || def.effect.base) && def.role !== 'guard' && def.role !== 'buff' && (def.role !== 'sustain' || !!drains) && def.role !== 'summon';
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
    if (triggered(nums) || !ready(s, d, i, nums) || stackedUp(c, gem.gemId) || !rulesPass(s, gem.rules, (r) => ruleAllows(r, rc, skillIsActive(c, gem.gemId)))) continue;
    const got = consider(i, nums, false);
    if (got) return got;
  }
  const basic = skillNumbers(d, null);
  return consider(-1, basic, false) ?? later.approach ?? { slot: -1, nums: basic, manual: false };
}

/** A stacking skill whose stacks are full won't top them up again until they're within this long of running out. */
export const RESTACK_MS = 2000;

/**
 * A stacking skill (Quick Slash, Rending Cut) at its most, with time to spare: its rules don't get a say, it waits
 * its turn, so the big blow behind it goes instead. A press of your own still uses it.
 */
function stackedUp(c: CombatRuntime, gemId: string): boolean {
  const e = activeGemDef(gemId).effect;
  if (e.buff?.maxStacks) {
    const b = c.buffs.find((x) => x.source === 'skill' && x.id === gemId);
    return !!b && (b.stacks ?? 0) >= e.buff.maxStacks && b.remainingMs > RESTACK_MS;
  }
  if (e.rend) {
    const target = c.monsters.find((m) => m.uid === c.targetUid && m.life > 0) ?? aliveMonsters(c)[0];
    return !!target?.rend && target.rend.stacks >= e.rend.maxStacks && target.rend.remainingMs > RESTACK_MS;
  }
  return false;
}

/** Reprisal and Succession take a skill out of the turn order: it fires on what they say, whatever its rules are. */
function triggered(nums: SkillNumbers): boolean {
  return nums.mods.specials.has('reprisal') || nums.mods.specials.has('succession');
}

/**
 * Fire a skill from inside something else, in no time and without disturbing what you're in the middle of. It needs
 * something in reach: nothing closes in. Returns whether it went off.
 */
function fireSkill(s: GameState, ctx: Ctx, d: Derived, slot: number, nums: SkillNumbers, paid: boolean): boolean {
  const c = s.combat!;
  const aim = skillAim(s, s.skillBar[slot]!);
  const found = skillTarget(s, d, nums, aim);
  if (needsTarget(nums.def) && (!found || found.closeIn)) return false;
  const { using, closingUid, targetUid } = c;
  performSkill(s, ctx, d, slot, nums, false, found && !found.closeIn ? found.mon : undefined, aim, paid);
  c.using = using;
  c.closingUid = closingUid;
  c.targetUid = targetUid;
  return true;
}

/** Reprisal and Succession: every skill waiting on this moment goes off, as far as it's ready and can be paid for. */
function fireTriggered(s: GameState, ctx: Ctx, d: Derived, special: 'reprisal' | 'succession'): void {
  const c = s.combat!;
  s.skillBar.forEach((gem, slot) => {
    if (!gem || gemUseReason(d.combatLevel, d.attributes, gem, d.weaponFamily)) return;
    const nums = skillNumbers(d, gem);
    if (!nums.mods.specials.has(special) || !ready(s, d, slot, nums)) return;
    if (fireSkill(s, ctx, d, slot, nums, false)) c.cooldowns[slot] = Math.max(c.cooldowns[slot], TRIGGER_COOLDOWN_MS);
  });
}

/** Royal Decree: the other spells on the bar go off with it, free and at once, heavy ones included. */
function callSpells(s: GameState, ctx: Ctx, d: Derived, nums: SkillNumbers): void {
  const c = s.combat!;
  const absolute = nums.mods.specials.has('absolute');
  c.decreeMult = nums.def.effect.decree! / 100;
  s.skillBar.forEach((gem, slot) => {
    if (!gem || gemUseReason(d.combatLevel, d.attributes, gem, d.weaponFamily)) return;
    const called = skillNumbers(d, gem);
    const { def } = called;
    if (def.effect.decree || !def.tags.includes('spell') || !def.tags.includes('hit') || (c.cooldowns[slot] > 0 && !absolute)) return;
    if (!fireSkill(s, ctx, d, slot, called, true)) return;
    c.cooldowns[slot] = Math.max(MIN_COOLDOWN_MS, called.cooldownMs);
    ctx.emit({ t: 'skill', slot, gemId: def.id, manual: false });
  });
  c.decreeMult = undefined;
}

/** Run at a monster out of reach: it ends up a ring closer. Movement speed makes it quicker. */
function closeIn(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance): void {
  const c = s.combat!;
  pullCloser(c.monsters, mon, army(c));
  c.using = null;
  c.closingUid = c.targetUid = mon.uid;
  const time = CLOSE_IN_MS / (1 + d.raw.moveSpeedPct / 100);
  c.actionTotal = time;
  c.actionMs = Math.max(c.actionMs + time, time * 0.5);
  ctx.emit({ t: 'closeIn', monsterUid: mon.uid });
}

/**
 * Heavy skills take their time before the hit, not after it. What they cost is paid now, and landBlow brings the
 * blow down when the time is up.
 */
function startWindup(s: GameState, ctx: Ctx, d: Derived, choice: SkillChoice): void {
  const c = s.combat!;
  const { slot, nums, manual, target } = choice;
  paySkill(s, ctx, d, slot, nums, manual);
  c.using = nums.def.id;
  c.closingUid = undefined;
  c.targetUid = target?.uid;
  c.windup = { gemUid: s.skillBar[slot]!.uid, targetUid: target?.uid, manual, manaFrac: c.manaFrac, goaded: nums.mods.specials.has('goaded') || undefined, braced: nums.mods.specials.has('unmoved') || undefined };
  const time = nums.actionMs * (c.windupCarry ?? 1);
  c.windupCarry = undefined;
  c.actionTotal = time;
  c.actionMs = Math.max(c.actionMs + time, time * 0.5);
}

/**
 * Bring a wound-up blow down on its target, or on the next in reach if that one's gone. With nothing in reach it's held,
 * closing in if there's a way, until there is. Returns false while it's held. It's only lost if the gem leaves the bar.
 */
function landBlow(s: GameState, ctx: Ctx, d: Derived): boolean {
  const c = s.combat!;
  const w = c.windup!;
  const slot = s.skillBar.findIndex((g) => g?.uid === w.gemUid);
  if (slot < 0) {
    c.windup = undefined;
    return true;
  }
  const gem = s.skillBar[slot]!;
  const nums = skillNumbers(d, gem);
  const aim = skillAim(s, gem);
  const held = c.monsters.find((m) => m.uid === w.targetUid && m.life > 0 && cellRing(m.cell) <= skillRange(d, nums.def));
  const found = held ? { mon: held, closeIn: false } : skillTarget(s, d, nums, aim);
  if (!found) {
    c.actionTotal = IDLE_MS;
    c.actionMs = Math.max(c.actionMs + IDLE_MS, IDLE_MS * 0.5);
    return false;
  }
  if (found.closeIn) {
    closeIn(s, ctx, d, found.mon);
    return false;
  }
  c.windup = undefined;
  c.manaFrac = w.manaFrac;
  c.storedDamage = w.stored;
  performSkill(s, ctx, d, slot, nums, w.manual, found.mon, aim, true);
  c.storedDamage = undefined;
  if (found.mon.life <= 0) c.windupCarry = nums.mods.specials.has('longdraw') ? LONG_DRAW_CARRY : WINDUP_CARRY;
  reapDead(s, ctx, d);
  return true;
}

/**
 * A long wind-up mustn't leave you open: a guard whose rule calls for it, or that you press, goes up at once, and the
 * blow waits that much longer.
 */
function guardBreaksIn(s: GameState, ctx: Ctx, d: Derived): void {
  const c = s.combat!;
  let rc: RuleContext | undefined;
  for (const i of castOrder(s)) {
    const gem = s.skillBar[i]!;
    if (activeGemDef(gem.gemId).role !== 'guard' || gemUseReason(d.combatLevel, d.attributes, gem, d.weaponFamily)) continue;
    const nums = skillNumbers(d, gem);
    const manual = c.queued === i;
    if (!ready(s, d, i, nums, manual)) continue;
    rc ??= ruleContext(s, d);
    if (!manual && !rulesPass(s, gem.rules, (r) => ruleAllows(r, rc!, skillIsActive(c, gem.gemId)))) continue;
    if (manual) c.queued = null;
    const using = c.using;
    performSkill(s, ctx, d, i, nums, manual);
    c.using = using;
    c.actionMs += nums.actionMs;
    c.actionTotal += nums.actionMs;
    return;
  }
}

// ---------- damage ----------

type ByType = Record<DamageType, number>;

function moreDamageFromBuffs(c: CombatRuntime): number {
  return c.buffs.reduce((a, b) => a + (b.moreDamage ?? 0), 0);
}

/** Bleeding, poisoned, burning, ignited, chilled, frozen or shocked. */
function hasAilment(mon: MonsterInstance): boolean {
  return mon.dots.length > 0 || mon.chillMs > 0 || mon.frozenMs > 0 || (mon.shockMs ?? 0) > 0;
}

/** Roll one hit of a skill. Returns null for a missed attack; `sure` hits can't miss. */
function rollHit(
  s: GameState,
  ctx: Ctx,
  d: Derived,
  nums: SkillNumbers,
  mon: MonsterInstance,
  sure = false,
  surge = false,
): { byType: ByType; crit: boolean; mega: boolean; coup: boolean } | null {
  const c = s.combat!;
  const { def, mods, level } = nums;
  const r = d.raw;
  const isAttack = def.tags.includes('attack');
  const sureCrit = c.asc.sureCrit;
  c.asc.sureCrit = false;
  if (isAttack && !sure && !c.ambush && !r.steadyHand && !r.knifesEdge && !chance(ctx.rng, hitChance(d.accuracy, mon.level))) return null;

  const byType: ByType = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0 };
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
    if (def.effect.shieldToDamage) {
      // Battering Ram spends the shield for all of it
      const ram = mods.specials.has('ram');
      byType.phys += ram ? c.shield : (c.shield * def.effect.shieldToDamage) / 100;
      if (ram) c.shield = 0;
    }
    if (def.effect.storedToDamage) byType.phys += ((c.storedDamage ?? 0) * def.effect.storedToDamage) / 100;
  } else {
    const [lo, hi] = spellBaseAt(def, level);
    const type = def.effect.type ?? 'fire';
    const fromShield = (c.shield * (def.effect.shieldToDamage ?? 0)) / 100;
    byType[type] += (rInt(ctx.rng, lo, hi) + (nums.lifeCost * (def.effect.lifeToDamage ?? 0)) / 100 + fromShield) * d.typeMult[type];
    // a spell that hits several times takes only its share of flat added damage on each hit (Frost Needle: a third)
    const share = def.effect.addedShare ?? 1;
    for (const t of ['fire', 'cold', 'light'] as const) {
      const [alo, ahi] = d.hit[t];
      if (ahi > 0) byType[t] += rInt(ctx.rng, alo, ahi) * SPELL_ADDED_EFFECTIVENESS * share;
      // "Adds X to Y Damage to Spells" counts in full
      const [slo, shi] = d.spellHit[t];
      if (shi > 0) byType[t] += rInt(ctx.rng, slo, shi) * share;
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
  if (c.decreeMult) more *= c.decreeMult;
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
  if (surge) more *= 1 + SURGE_MORE / 100;
  if (s.life < d.maxLife / 2 && hasAscNode(s, 'flagellant_mortify')) more *= 1 + MORTIFY_MORE / 100;
  if (hasAscNode(s, 'alchemist_philosophers_draught')) more *= 1 + (DRAUGHT_MORE * c.buffs.filter((b) => b.source === 'flask').length) / 100;
  for (const t of DAMAGE_TYPES) byType[t] *= more;

  const spellType = def.effect.type;
  let critChance = isAttack
    ? d.critChance * (1 + mods.critChance / 100)
    : (def.effect.crit ?? 5) * (1 + (r.critChancePct + r.spellCritPct + (spellType === 'light' ? r.lightCrit : 0) + mods.critChance) / 100);
  if (c.riposting) critChance *= 1 + r.riposteCrit / 100;
  critChance = r.steadyHand ? 0 : Math.min(95, critChance);

  // Mega Crits: a flat 400% that ignores crit multiplier, only from Knife's Edge, Ambush and Coup de Grâce
  const malice = mechanicOf(s) === 'malice';
  let megaMulti = r.knifesEdge || (surge && hasAscNode(s, 'wellspring_deluge')) ? MEGA_CRIT_MULTI : 0;
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
  // burns pool: what's left of the old one runs on in the new one
  const burning = dot.kind === 'burn' && mon.dots.find((x) => x.kind === 'burn');
  if (burning) {
    const left = (burning.dps * burning.remainingMs) / 1000 + (dot.dps * dot.remainingMs) / 1000;
    Object.assign(burning, dot, { dps: (left * 1000) / dot.remainingMs });
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

/** The DPS meter shows the average over one window, and holds it until the next window ends. */
export const DPS_WINDOW_MS = 2000;

/** Damage per second actually dealt in the last finished window: hits, skills, ailments, ground and the rest. */
export function liveDps(c: CombatRuntime): number {
  return ((c.dealt.at(-2) ?? 0) * 1000) / DPS_WINDOW_MS;
}

function tickDpsMeter(c: CombatRuntime, dt: number): void {
  c.dealtMs += dt;
  while (c.dealtMs >= DPS_WINDOW_MS) {
    c.dealtMs -= DPS_WINDOW_MS;
    c.dealt.push(0);
  }
  if (c.dealt.length > 2) c.dealt.splice(0, c.dealt.length - 2);
}

/** Take life from a monster, through its ward first. */
function damageMonster(s: GameState, mon: MonsterInstance, amount: number, direct = false): void {
  if (mon.chained || (mon.martyr && !direct)) return;
  const dealt = s.combat?.dealt;
  if (dealt) dealt[dealt.length - 1] += amount;
  if (mon.curse?.warrant) mon.curse.owed = (mon.curse.owed ?? 0) + amount;
  if (mon.ward > 0) {
    const absorbed = Math.min(mon.ward, amount);
    mon.ward -= absorbed;
    amount -= absorbed;
  }
  mon.life -= amount;
}

/** A damage-over-time ailment from a hit, with the player's ailment modifiers. */
function makeAilment(d: Derived, nums: SkillNumbers, mon: MonsterInstance, dealt: number, a: { kind: Dot['kind']; pctPerSec: number; durationMs: number }): Dot {
  const r = d.raw;
  const { def, mods } = nums;
  const { pctPerSec, durationMs: duration } = ailmentNumbers(d, nums, a);
  return {
    kind: a.kind,
    dps: ((dealt * pctPerSec) / 100) * (a.kind === 'bleed' && mon.isBoss ? 1 + r.bleedBossMore / 100 : 1),
    remainingMs: duration,
    durationMs: duration,
    dealt: 0,
    gemId: def.id,
    burst: mods.specials.has('hemorrhage') ? 0.5 : undefined,
    spreads: mods.specials.has('virulence') || mods.specials.has('bloodtrail') || undefined,
    pyre: ((a.kind === 'ignite' || a.kind === 'burn') && mods.specials.has('pyre')) || undefined,
  };
}

/** The most of your life Transfusion gives back in one go. */
const TRANSFUSION_CAP = 0.25;
/** Tithe: this share of the Life spent flows back over its time. */
const TITHE_SHARE = 1 / 3;
const TITHE_MS = 4000;
/** Barbed Ward: the broken shield hits back for this many times the Life spent on it. */
const BARBED_WARD_RETURN = 2;
/** Radiance: the broken shield strikes for this share of what it held. */
const RADIANCE_SHARE = 0.5;
/** Dead Weight: damage to stunned enemies under the curse. */
const DEAD_WEIGHT_MORE = 1.25;

/** A dot's damage per second on this monster: Stigmata deepens bleeds. */
function bleedDps(mon: MonsterInstance, dot: Dot): number {
  return dot.dps * (dot.kind === 'bleed' ? 1 + (mon.curse?.bleedTaken ?? 0) / 100 : 1);
}

/** Coup de Grace with Needleworker's Wraps: also poisons and ignites. */
const COUP_POISON = { kind: 'poison', pctPerSec: 30, durationMs: 4000 } as const;
const COUP_IGNITE = { kind: 'ignite', pctPerSec: 40, durationMs: 3000 } as const;
/** "Hits have X% chance to Poison" from gear */
export const GEAR_POISON = { kind: 'poison', pctPerSec: 20, durationMs: 4000 } as const;

/** Burn, chill and shock fill up against this % of a target's life, so big enemies take much longer. */
export const AILMENT_THRESHOLD_PCT = 40;
/** Buildup fades by this % of the threshold each second. */
export const AILMENT_DECAY_PCT = 10;
export const CHILL_MS = 3000;
export const SHOCK_MS = 4000;
export const FREEZE_MS = 1500;
export const BOSS_FREEZE_MS = 600;
/** How much more damage a shocked target takes: from a touch of buildup to a full threshold. */
export const SHOCK_MIN_PCT = 5;
export const SHOCK_MAX_PCT = 40;

export function ailmentThreshold(mon: MonsterInstance): number {
  return (mon.maxLife * AILMENT_THRESHOLD_PCT) / 100;
}

export function shockPct(mon: MonsterInstance): number {
  if (!mon.shockMs) return 0;
  return SHOCK_MIN_PCT + (SHOCK_MAX_PCT - SHOCK_MIN_PCT) * Math.min(1, (mon.build?.shock ?? 0) / ailmentThreshold(mon));
}

/** Fire burns, cold chills, lightning shocks: each rolls on its own, and what lands builds toward the next stage. */
function applyElementAilments(c: CombatRuntime, ctx: Ctx, d: Derived, nums: SkillNumbers, mon: MonsterInstance, dealtBy: ByType, chillBonus: boolean, sure: boolean): void {
  const { def, mods } = nums;
  const e = def.effect;
  const r = d.raw;
  const skill = e.ailmentChance ?? 0;
  const lands = (amount: number, pct: number) => amount > 0 && (sure || (pct > 0 && chance(ctx.rng, pct / 100)));
  const build = (mon.build ??= { burn: 0, chill: 0, shock: 0 });
  const full = ailmentThreshold(mon);
  if (lands(dealtBy.fire, skill + r.burnChance)) {
    const burn = makeAilment(d, nums, mon, dealtBy.fire, { kind: 'burn', pctPerSec: BURN_SHARE / (BURN_MS / 1000), durationMs: BURN_MS });
    const spread = (dot: Dot) => {
      applyDot(mon, dot);
      if (mods.specials.has('inferno')) {
        const near = new Set(neighbors(mon.cell));
        for (const other of aliveMonsters(c)) if (other !== mon && near.has(other.cell)) applyDot(other, { ...dot });
      }
      // Ember of Faith: Infernal Blow's fires spread to the nearest enemies
      if (def.id === 'infernal_blow' && r.infernalSpread > 0) {
        for (const other of chainFrom(mon, aliveMonsters(c), r.infernalSpread).slice(1)) applyDot(other, { ...dot });
      }
    };
    spread(burn);
    build.burn += dealtBy.fire;
    if (build.burn >= full) {
      spread(makeAilment(d, nums, mon, build.burn, { kind: 'ignite', pctPerSec: IGNITE_SHARE / (IGNITE_MS / 1000), durationMs: IGNITE_MS }));
      build.burn = 0;
    }
  }
  if (lands(dealtBy.cold, e.chillMs || chillBonus ? 100 : skill + r.chillChance)) {
    mon.chillMs = Math.max(mon.chillMs, (e.chillMs ?? CHILL_MS) * nums.durationMult);
    build.chill += dealtBy.cold;
    if (build.chill >= full) {
      mon.frozenMs = Math.max(mon.frozenMs, mon.isBoss ? BOSS_FREEZE_MS : FREEZE_MS);
      build.chill = 0;
    }
  }
  if (lands(dealtBy.light, mods.specials.has('staticfield') ? 100 : skill + r.shockChance)) {
    mon.shockMs = SHOCK_MS * nums.durationMult;
    build.shock = Math.min(full, build.shock + dealtBy.light);
  }
}

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
  wake = false,
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
  const dealtBy: ByType = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0 };
  // a Hulking monster shrugs off hits that spread: areas, chains, piercing
  const glance = mon.hulking && spreads(d, nums) ? HULKING.areaTaken : 1;
  for (const t of DAMAGE_TYPES) {
    let amt = byType[t] * factor * glance;
    if (t !== 'phys') amt *= 1 - (mon.res[t] - (mon.curse?.resPen ?? 0)) / 100;
    else amt *= 1 + ((mon.curse?.physTaken ?? 0) + (mon.rend ? mon.rend.stacks * mon.rend.pctPerStack : 0)) / 100;
    dealtBy[t] = amt;
    dealt += amt;
    if (t === 'phys') physPart = amt;
  }
  // the physical share of the hit, for physical vs elemental leech
  const physShare = dealt > 0 ? physPart / dealt : 0;
  const beforeMore = dealt;
  const r = d.raw;
  if (mon.vulnMs > 0) dealt *= 1.15;
  dealt *= 1 + shockPct(mon) / 100;
  if (mods.specials.has('shatterpoint') && mon.chillMs > 0) dealt *= 1.15;
  if (mods.specials.has('shatter') && mon.stunMs > 0) dealt *= 1.3;
  if (mon.stunMs > 0) dealt *= (1 + r.stunnedVuln / 100) * (1 + (e.moreVsStunned ?? 0) / 100) * (mon.curse?.crushing ? DEAD_WEIGHT_MORE : 1);
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
  if (crit && mods.specials.has('shatterpoint')) mon.chillMs = Math.max(mon.chillMs, 3000);
  if (mods.specials.has('twist')) {
    for (const x of mon.dots) x.remainingMs = Math.max(x.remainingMs, x.durationMs ?? 0);
    if (mon.chillMs > 0) mon.chillMs = Math.max(mon.chillMs, 3000);
  }
  ctx.emit({ t: 'hit', target: 'monster', amount: dealt, crit, mega: mega || undefined, riposte: c.riposting || undefined, dmgType: mainType(byType), monsterUid: mon.uid });
  // Rage and Momentum count every hit dealt, so multi-hit and area skills fill them fastest
  if (mechanicOf(s) === 'rage' && ascendancyOf(s) !== 'anvil') gainMeter(s, d, def.tags.includes('heavy') ? HEAVY_RAGE : 1);
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
  const manaLeech = r.manaLeech + mods.manaLeech + (e.leechMana ?? 0);
  if (manaLeech > 0) gainMana(s, d, (dealt * manaLeech) / 100);

  // stun / armour break
  const stunChance = (e.stunChance ?? 0) + (mods.stunChance + r.stunChance) / 100;
  if (stunChance > 0 && chance(ctx.rng, stunChance)) {
    const longer = (r.stunDuration + (mon.curse?.stunTaken ?? 0)) / 100;
    mon.stunMs = Math.max(mon.stunMs, (mon.isBoss ? 400 : (e.stunMs ?? 1000)) * (1 + longer) * (mods.specials.has('buried') ? 2 : 1));
    // a repeat of the hit counts for what it deals, so Multistrike adds no more than its share
    if (mon.isBoss) addStagger(ctx, d, mon, (e.stagger ?? STAGGER_PER_STUN) * (1 + mods.stagger / 100) * (mods.specials.has('sunder') ? 1.5 : 1) * Math.min(1, factor));
  }
  if (mods.specials.has('shatter') || mods.specials.has('flay') || mods.specials.has('sunder')) mon.vulnMs = 4000;
  if (mods.specials.has('rundown')) mon.stunMs = Math.max(mon.stunMs, mon.isBoss ? 400 : 1000);
  // Rend: one more stack per use (a repeat adds none), and every stack's duration starts over
  if (e.rend && !mega && factor >= 1) {
    const stacks = Math.min(e.rend.maxStacks, (mon.rend?.stacks ?? 0) + 1);
    mon.rend = { gemId: def.id, stacks, pctPerStack: e.rend.pctPerStack, remainingMs: e.rend.durationMs * nums.durationMult };
  }

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
    if (a.kind === 'bleed' && mods.specials.has('arterial')) {
      const near = new Set(neighbors(mon.cell));
      for (const other of aliveMonsters(c)) if (other !== mon && near.has(other.cell)) applyDot(other, { ...dot });
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
  // gear: a chance for any hit to poison. Wake: a Surge's chaos always does
  if ((wake && dealtBy.chaos > 0) || (r.poisonOnHit && chance(ctx.rng, r.poisonOnHit / 100))) applyDot(mon, makeAilment(d, nums, mon, dealt, GEAR_POISON));
  const scale = beforeMore > 0 ? dealt / beforeMore : 0;
  applyElementAilments(c, ctx, d, nums, mon, { phys: 0, fire: dealtBy.fire * scale, cold: dealtBy.cold * scale, light: dealtBy.light * scale, chaos: 0 }, !!r.chillOnHit, wake);
  return dealt;
}

/** Stagger a boss needs to fill, more each time. */
export function staggerMax(mon: MonsterInstance): number {
  return STAGGER_FULL * STAGGER_GROWTH ** (mon.staggers ?? 0);
}

/** Cut a wind-up off, and it starts its wait over. */
function interruptCast(ctx: Ctx, mon: MonsterInstance): void {
  if (mon.casting < 0) return;
  if (channeling(mon)) return breakChannel(ctx, mon);
  if (mon.castKind) mon.timers[mon.castKind] = mon.castKind === 'nova' ? BOSS_NOVA_EVERY_MS : BOSS_SLAM_EVERY_MS;
  mon.casting = -1;
  mon.castKind = null;
  ctx.emit({ t: 'interrupt', name: mon.name });
}

/** Fill a boss's Stagger. When it's full the boss reels: a long stun, and any wind-up is lost. */
function addStagger(ctx: Ctx, d: Derived, mon: MonsterInstance, amount: number): void {
  mon.stagger = (mon.stagger ?? 0) + amount * (1 + (mon.curse?.stunTaken ?? 0) / 100);
  if (mon.stagger < staggerMax(mon)) return;
  mon.stagger = 0;
  mon.staggers = (mon.staggers ?? 0) + 1;
  mon.stunMs = Math.max(mon.stunMs, Math.min(BOSS_STAGGER_CAP_MS, BOSS_STAGGER_MS * (1 + d.raw.stunDuration / 100)));
  interruptCast(ctx, mon);
  ctx.emit({ t: 'bossPhase', name: mon.name, text: 'staggers under the weight!' });
}

/** Follow Through: what a killing blow had to spare lands on the nearest enemy. */
function carryOverkill(s: GameState, ctx: Ctx, mon: MonsterInstance): void {
  const next = chainFrom(mon, aliveMonsters(s.combat!).filter((m) => !shielded(m)), 1)[1];
  if (!next) return;
  damageMonster(s, next, -mon.life);
  ctx.emit({ t: 'hit', target: 'monster', amount: Math.round(-mon.life), dmgType: 'phys', monsterUid: next.uid });
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
  if (nums.mods.specials.has('communion')) gainMana(s, d, back);
}

/** Everything using a skill costs: mana or Life, the cooldown and what your class and ascendancy do on a use. */
function paySkill(s: GameState, ctx: Ctx, d: Derived, slot: number, nums: SkillNumbers, manual: boolean): void {
  const c = s.combat!;
  const { def, mods } = nums;
  const r = d.raw;
  c.manaFrac = manaFraction(s, d);
  const cost = skillCost(s, d, nums);
  if (surgeWaiting(s, d, nums)) startSurge(s, ctx, d);
  // Overclock: no costs, and cooldowns at the minimum
  if (!r.overclock) {
    if (r.bloodPact) s.life -= cost;
    else s.mana -= cost;
    if (nums.lifeCost) {
      s.life = Math.max(1, s.life - nums.lifeCost);
      if (mods.specials.has('tithe')) c.heals.push({ resource: 'life', perMs: (nums.lifeCost * TITHE_SHARE) / TITHE_MS, remainingMs: TITHE_MS });
    }
  }
  if (slot >= 0) c.cooldowns[slot] = Math.max(MIN_COOLDOWN_MS, nums.cooldownMs);
  if (slot >= 0 && ascendancyOf(s) === 'flagellant') selfHarm(s, ctx, d);
  if (mechanicOf(s) === 'rage' && def.id === 'war_cry') gainMeter(s, d, 10);
  if (slot >= 0) ctx.emit({ t: 'skill', slot, gemId: def.id, manual });
}

/** Wellspring: Overflow is spent, and the spell paying for it Surges when it lands. */
function startSurge(s: GameState, ctx: Ctx, d: Derived): void {
  const c = s.combat!;
  c.mech = 0;
  c.asc.surging = true;
  if (hasAscNode(s, 'wellspring_springward')) s.es = Math.min(d.maxEs, s.es + d.maxMana * SPRINGWARD_ES);
  ctx.emit({ t: 'info', text: 'Surge!', tone: 'good' });
}

/** A heavy skill paid when it started winding up, so `paid` skips that when it lands. */
function performSkill(s: GameState, ctx: Ctx, d: Derived, slot: number, nums: SkillNumbers, manual: boolean, aimed?: MonsterInstance, aimRule?: SkillAim, paid = false): void {
  const c = s.combat!;
  const { def, mods, level } = nums;
  const e = def.effect;
  const r = d.raw;
  c.using = def.id;
  c.closingUid = undefined;
  if (!paid) paySkill(s, ctx, d, slot, nums, manual);

  // utility effects
  if (e.blocks) {
    c.blocks = Math.max(c.blocks, e.blocks + r.extraBlocks + (def.id === 'parry' ? r.parryBlocks : 0));
    c.retaliate = mods.specials.has('retaliate');
    c.counterweight = mods.specials.has('counterweight');
  }
  if (e.restoreManaPct) gainMana(s, d, (d.maxMana * e.restoreManaPct) / 100);
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
    c.shield = ((d.maxLife + (e.shieldEs ? d.maxEs : 0)) * e.shieldPct * (1 + 0.03 * (level - 1)) * (1 + r.shieldEffect / 100) * (1 + mods.shieldMore / 100)) / 100;
    c.shieldMax = c.shield;
    c.glacial = mods.specials.has('glacial');
    c.barbedWard = mods.specials.has('barbedward') ? nums.lifeCost * BARBED_WARD_RETURN : undefined;
    c.recoil = mods.specials.has('recoil') || undefined;
    c.radiance = mods.specials.has('radiance') ? c.shield * RADIANCE_SHARE : undefined;
    c.holdShield = mods.specials.has('eternal') || undefined;
  }
  if (def.role === 'guard') {
    c.ground = stepOutOfGround(c.ground);
    thaw(c);
    if (r.afterGuardDamage) c.empowered = true;
    if (r.guardArmourPct) {
      c.buffs = c.buffs.filter((b) => b.id !== 'guard_armour');
      c.buffs.push({ id: 'guard_armour', source: 'skill', remainingMs: 3000, durationMs: 3000, stats: { armourPct: r.guardArmourPct } });
    }
  }
  if (def.id === 'war_cry' && r.warCryHeal) s.life = Math.min(d.maxLife, s.life + (d.maxLife * r.warCryHeal) / 100);
  if (e.buff) {
    const dur = e.buff.durationMs * nums.durationMult + (def.role === 'buff' ? r.buffDurationFlat : 0);
    // a stacking buff gains a stack with each use, up to its most, and every stack's duration starts over
    const prev = c.buffs.find((b) => b.source === 'skill' && b.id === def.id);
    const stacks = e.buff.maxStacks ? Math.min(e.buff.maxStacks, (prev?.stacks ?? 0) + 1) : undefined;
    const own = Object.fromEntries(Object.entries(e.buff.stats ?? {}).map(([k, v]) => [k, v * (stacks ?? 1)]));
    c.buffs = c.buffs.filter((b) => !(b.source === 'skill' && b.id === def.id));
    c.buffs.push({
      id: def.id,
      source: 'skill',
      remainingMs: dur,
      durationMs: dur,
      stacks,
      stats: { ...own, ...(mods.specials.has('galerider') && { cooldownRecovery: 25 }), ...(mods.specials.has('overflow') && { manaCostReduction: 25 }), ...(mods.specials.has('bloodoath') && { lifeLeech: 3 }), ...(mods.specials.has('immovable') && { stunDuration: 50 }) },
      outpace: e.buff.outpace,
      moreDamage: e.buff.moreDamage ? (e.buff.moreDamage + (level - 1)) * (stacks ?? 1) : undefined,
      regenPct: (e.buff.regenPct ?? 0) + (mods.specials.has('rally') ? 2 : 0) || undefined,
      esRegenPct: mods.specials.has('holyground') ? 1 : undefined,
      extendMaxMs: mods.specials.has('bloodfrenzy') ? 12000 : undefined,
    });
  }
  if (e.knockback && knockBack(c.monsters, army(c))) ctx.emit({ t: 'area', gemId: def.id, cells: areaCells('nova', 0, 1) });
  if (e.interrupts) {
    for (const m of aliveMonsters(c)) {
      if (m.casting < 0) continue;
      interruptCast(ctx, m);
      if (mods.specials.has('rally')) m.stunMs = Math.max(m.stunMs, 1000);
    }
  }

  if (e.stepOut) stepOut(s, ctx, mods.specials.has('surefoot'));
  if (e.charge && aimed && !aimed.isBoss) while (cellRing(aimed.cell) > 1 && pullCloser(c.monsters, aimed, army(c)));
  if (mods.specials.has('hitfade')) c.evadeMs = Math.max(c.evadeMs, 1500);
  if (mods.specials.has('feignedretreat')) c.counterweightMore = Math.max(c.counterweightMore ?? 0, 40);
  if (e.curse) curseEnemies(s, ctx, nums, aimed);

  // Flurry ramps attack speed on consecutive Twin Strikes
  if (def.id === 'twin_strike' && mods.specials.has('flurry')) c.flurryStacks = Math.min(5, c.flurryStacks + 1);
  else c.flurryStacks = 0;

  if (mods.specials.has('deeptoll')) for (const x of army(c)) x.life = Math.min(x.maxLife, x.life + x.maxLife * DEEP_TOLL_HEAL);
  if (e.minion) return callMinions(s, ctx, d, nums, aimed);
  if (e.storm) return raiseStorm(s, ctx, nums, aimed);
  if (!e.weaponPct && !e.base) return;
  if (e.decree) callSpells(s, ctx, d, nums);
  if (def.tags.includes('attack')) stormsAnswer(s, ctx, d);

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
  let ground = mods.specials.has('inferno')
    ? { kind: 'burning' as const, pctPerSec: 25, durationMs: 3000, area: 'splash' as const }
    : mods.specials.has('cataclysm')
      ? { kind: 'burning' as const, pctPerSec: 25, durationMs: 4000, area: 'splash' as const }
      : e.ground;
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

  // a Surge covers the whole cast. Riptide: an area grows, a chain reaches further, anything else fires again
  const surge = c.asc.surging && def.tags.includes('spell');
  if (surge) c.asc.surging = false;
  const riptide = surge && hasAscNode(s, 'wellspring_riptide');
  const wake = surge && hasAscNode(s, 'wellspring_wake');
  const chains = (e.targets === 'chain' ? gemChains(def, nums.level) + r.extraChains : 0) + mods.chains;
  const widens = riptide && (shape === 'splash' || shape === 'nova');
  const reaches = riptide && shape === 'target' && chains > 0;
  const echo = riptide && !widens && !reaches;
  if (echo) passes += 1;
  const radius = widens ? (e.radius ?? (shape === 'nova' ? 2 : 1)) + 1 : e.radius;

  for (let pass = 0; pass < passes; pass++) {
    const passMult = echo && pass === passes - 1 ? RIPTIDE_ECHO : pass === 0 ? 1 : (mods.repeatDamage / 100) * (1 + r.repeatMore / 100);
    for (let h = 0; h < hitsPerPass; h++) {
      // the target died mid-skill: the next one in reach takes the rest
      if (!target || target.life <= 0) {
        const aim = skillTarget(s, d, nums, aimRule);
        if (!aim || aim.closeIn) return;
        target = aim.mon;
      }
      c.targetUid = target.uid;
      // areas and chains catch martyrs wherever they land; anything else has to be aimed at one
      const struck = target;
      const alive = aliveMonsters(c).filter((m) => !m.martyr || struck.martyr || spreads(d, nums));
      let targets: MonsterInstance[];
      let chained = false;
      if (shape !== 'target') {
        const cells = new Set(areaCells(shape, target.cell, radius));
        targets = [target, ...alive.filter((m) => m !== target && cells.has(m.cell))];
        if (pass === 0 && h === 0) ctx.emit({ t: 'area', gemId: def.id, cells: [...cells] });
      } else {
        targets = chainFrom(target, alive, chains + (reaches ? 1 : 0));
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
      if (mods.specials.has('cheapshot') && stunned) c.asc.sureCrit = true;
      // a blow you waited for doesn't miss
      const roll = rollHit(s, ctx, d, nums, target, c.asc.sureCrit || def.tags.includes('heavy') || (volley && h === hitsPerPass - 1), surge);
      if (!roll) {
        ctx.emit({ t: 'hit', target: 'monster', amount: 0, dmgType: 'phys', evaded: true, monsterUid: target.uid });
        continue;
      }
      const aim = target;
      targets.forEach((m, i) => {
        // each hop deals 15% less than the one before, never under 20% (chainFalloff); "more damage per chain" adds back
        const chainMult = chained ? chainFalloff(i) * (1 + (((mods.specials.has('overload') ? 20 : 0) + r.chainMore) / 100) * i) : 1;
        const dealt = hitMonster(s, ctx, d, nums, m, roll.byType, roll.crit, passMult * chainMult * tender, roll.mega, roll.coup, wake);
        if (e.drag && pass === 0) dragIn(c, m, nums);
        if (ground && !grounded && m === aim) {
          grounded = true;
          const dps = (dealt * ground.pctPerSec) / 100;
          for (const cell of areaCells(ground.area ?? 'target', aim.cell)) layGround(c.ground, cell, ground.kind, dps, ground.durationMs * nums.durationMult);
        }
        if (m === aim && m.life < 0 && mods.specials.has('followthrough')) carryOverkill(s, ctx, m);
      });
      // Verdict arcs off stunned targets, Splinter shatters off chilled ones, Shockwave off anything
      const arc = mods.specials.has('verdict') && stunned ? 0.5 : mods.specials.has('splinter') && chilled ? 0.4 : mods.specials.has('shockwave') ? 0.3 : 0;
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
    collectDebt(s, ctx, m, m);
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
      stunTaken: curse.stunTaken ? curse.stunTaken * f : undefined,
      crushing: mods.specials.has('deadweight') || undefined,
      warrant: curse.warrant ? curse.warrant * f : undefined,
      collective: mods.specials.has('collective') || undefined,
    };
    if (mods.specials.has('crackedhide')) m.vulnMs = Math.max(m.vulnMs, durationMs);
    if (mods.specials.has('snare')) m.stunMs = Math.max(m.stunMs, m.isBoss ? 400 : 1000);
  }
}

/**
 * Death Warrant comes due: what `mon` owes lands on `payer`, itself unless it died first. The curse is spent either
 * way, so what this deals can't add to the debt.
 */
function collectDebt(s: GameState, ctx: Ctx, mon: MonsterInstance, payer: MonsterInstance | undefined): void {
  const curse = mon.curse;
  if (!curse?.warrant) return;
  mon.curse = undefined;
  const debt = ((curse.owed ?? 0) * curse.warrant) / 100;
  if (debt < 1 || !payer) return;
  const pay = (m: MonsterInstance, amount: number) => {
    damageMonster(s, m, amount);
    ctx.emit({ t: 'hit', target: 'monster', amount: Math.round(amount), crit: true, dmgType: 'phys', monsterUid: m.uid });
  };
  pay(payer, debt);
  if (!curse.collective) return;
  const near = new Set(neighbors(payer.cell));
  for (const m of aliveMonsters(s.combat!)) if (near.has(m.cell) && m !== payer && !shielded(m)) pay(m, debt * COLLECTIVE_SHARE);
}

/** Where a skill's hit lands on the battlefield: Imperial Reach takes in the whole field, Pierce turns any projectile into a beam to the edge; 'all' means the whole field. */
export function skillArea(nums: SkillNumbers): AreaShape {
  const e = nums.def.effect;
  if (nums.mods.specials.has('reach')) return 'field';
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
  ascendancyKill(s, mon);
  s.lifetime.kills += 1;
  const xp = monsterXp(mon) * areaXpMultiplier(characterLevel(s), zone.levelRange);
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
  const ignite = mon.dots.find((x) => (x.kind === 'ignite' || x.kind === 'burn') && x.remainingMs > 0);
  if (d.raw.igniteSpread && ignite && next) applyDot(next, { ...ignite, dealt: 0 });
  // Pyre: a burning corpse bursts over the pack
  if (ignite?.pyre) {
    for (const m of aliveMonsters(c).filter((x) => !shielded(x))) {
      const amount = Math.max(1, Math.round(mon.maxLife * 0.1 * (1 - m.res.fire / 100)));
      damageMonster(s, m, amount);
      ctx.emit({ t: 'hit', target: 'monster', amount, dmgType: 'fire', monsterUid: m.uid });
    }
  }
  // Death Warrant: a debt outlives the debtor
  collectDebt(s, ctx, mon, chainFrom(mon, aliveMonsters(c).filter((m) => !shielded(m)), 1)[1]);
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
    c.bossRespawnMs = BOSS_RESPAWN_MS;
    // Nothing But Will: Ysolde with no unique equipped
    if (zone.id === 'sanctum' && s.character.classId === 'exile' && !Object.values(s.equipment).some((it) => it?.rarity === 'unique')) {
      s.lifetime.exileBareKills = (s.lifetime.exileBareKills ?? 0) + 1;
    }
    if (!s.bossesDefeated.includes(zone.id)) {
      s.bossesDefeated.push(zone.id);
      if (zone.actBoss) ctx.emit({ t: 'actComplete', act: zone.act });
      onBossFirstKill(s, ctx, zone.id);
    }
    // each area opened can put a few more gems on the Gem shop's shelf
    let gems = 0;
    for (const next of openReachedZones(s)) {
      ctx.emit({ t: 'zoneUnlocked', zoneId: next.id });
      gems += gemsArrivingAt(s, next.id);
    }
    if (gems) ctx.emit({ t: 'info', text: `${gems} new gem${gems === 1 ? '' : 's'} in the Town's Gem shop.`, tone: 'good' });
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
  fireTriggered(s, ctx, d, 'succession');
  if (!c.monsters.length && !c.windup) c.using = null;
}

function die(s: GameState, ctx: Ctx, d: Derived): void {
  s.lifetime.deaths += 1;
  if (isHardcore(s)) {
    s.fallen = { zoneId: s.combat?.zoneId ?? null, offline: !!ctx.offline };
    s.greenhouse = null;
    ctx.emit({ t: 'death', xpLost: 0 });
    retreat(s);
    return;
  }
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

/** Duelist: every hit is answered with a weapon strike, at half damage if it landed. A Matador only answers evades, a Vanguard only blocks. */
function riposte(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance, how: 'block' | 'evade' | 'landed', phalanx = false): void {
  const c = s.combat!;
  const r = d.raw;
  const asc = ascendancyOf(s);
  if (mechanicOf(s) !== 'riposte' || mon.life <= 0 || (c.riposteMs > 0 && !r.perfectForm && !phalanx)) return;
  if ((asc === 'matador' && how !== 'evade') || (asc === 'vanguard' && how !== 'block')) return;
  c.riposteMs = RIPOSTE_COOLDOWN_MS / (1 + r.riposteCooldown / 100);
  const nums = skillNumbers(d, null);
  const truth = c.asc.streak >= 10 && hasAscNode(s, 'matador_moment_of_truth');
  if (truth) c.ambush = true;
  const factor = (1 + r.ripostePct / 100) * (r.perfectForm ? 0.5 : 1) * (phalanx ? PHALANX_MULT : 1) * (how === 'landed' ? RIPOSTE_LANDED_MULT : 1) * (1 + (STREAK_MORE * c.asc.streak) / 100);
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
  const dmg = filled * 0.55 * (1 + r.novaPct / 100) * (hasAscNode(s, 'lightkeeper_reserve') ? 1 + RESERVE_MORE * (count - 1) : 1);
  if (!r.saintsSacrifice) s.life = Math.min(d.maxLife, s.life + count * d.maxLife * 0.22 * (1 + r.novaHeal / 100));
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
    if (!mon.isBoss && mon.life < mon.maxLife * THE_BLOCK_AT && hasAscNode(s, 'headsman_the_block')) {
      c.dealt[c.dealt.length - 1] += Math.max(0, mon.life);
      mon.life = 0;
    }
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
function ascendancyKill(s: GameState, mon: MonsterInstance): void {
  const c = s.combat!;
  if (rampaging(s)) {
    if (hasAscNode(s, 'ravager_bloodlust')) {
      c.asc.rampageMs += RAMPAGE_KILL_MS;
      c.asc.rampageTotal += RAMPAGE_KILL_MS;
    }
    if (hasAscNode(s, 'ravager_no_mercy')) c.asc.holdMs = NO_MERCY_HOLD_MS;
  }
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

/** Rampages, Head Start, Ecstasy and stored novas. */
function ascendancyStep(s: GameState, ctx: Ctx, d: Derived, dt: number, fighting: boolean): void {
  const c = s.combat!;
  const a = c.asc;
  const asc = ascendancyOf(s);
  if (!asc) return;
  if (fighting && !a.fighting && hasAscNode(s, 'longshot_head_start')) c.mech = Math.max(c.mech, Math.min(HEAD_START_MOMENTUM, meterMax('momentum', d.raw)));
  a.fighting = fighting;
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
  if (c.windup?.goaded) c.actionMs -= c.actionTotal * GOADED_CUT;
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
  if (c.windup) {
    c.windup.stored = (c.windup.stored ?? 0) + dmg;
    if (c.windup.braced) dmg = Math.max(1, Math.round(dmg * (1 - UNMOVED_LESS / 100)));
  }
  const taken = dmg;
  const legionary = army(c).find((x) => x.shares && x.life > 0);
  if (legionary) {
    const part = Math.round((dmg * legionary.shares!) / 100);
    legionary.life -= part * (1 - (legionary.tough ?? 0) / 100);
    dmg -= part;
    if (part > 0) ctx.emit({ t: 'hit', target: 'minion', amount: part, dmgType: type, monsterUid: legionary.uid });
  }
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
    if (c.shield <= 0 && c.recoil) {
      c.recoil = undefined;
      for (const m of aliveMonsters(c)) {
        if (cellRing(m.cell) > 1) continue;
        m.stunMs = Math.max(m.stunMs, m.isBoss ? 400 : RECOIL_STUN_MS);
        if (m.isBoss) addStagger(ctx, d, m, RECOIL_STAGGER);
      }
    }
    if (c.shield <= 0 && c.radiance) {
      for (const m of aliveMonsters(c)) {
        if (shielded(m)) continue;
        damageMonster(s, m, c.radiance);
        ctx.emit({ t: 'hit', target: 'monster', amount: Math.round(c.radiance), dmgType: 'light', monsterUid: m.uid });
      }
      c.radiance = undefined;
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
  if (s.life > 0) riposte(s, ctx, d, mon, 'landed');
  if (s.life > 0) fireTriggered(s, ctx, d, 'reprisal');
  if (s.life > 0) triggerOnHit(s, ctx, d, taken, type);
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

/** The element a patch of ground deals: unholy ground finds whichever you resist least. */
function groundElement(d: Derived, kind: Ground['kind']): DamageType {
  if (kind !== 'unholy') return GROUND[kind].type;
  return (['fire', 'cold', 'light'] as const).reduce((worst, t) => (d.res[t] < d.res[worst] ? t : worst));
}

function underPlayer(c: CombatRuntime, kind: Ground['kind']): boolean {
  return !groundProof(c) && c.ground.some((g) => g.cell === PLAYER_SPOT && g.kind === kind);
}

/** How fast your actions run: cold ground and Frostbite both drag on them. */
function actionPace(c: CombatRuntime): number {
  const ground = underPlayer(c, 'frozen') ? FROZEN_GROUND_SLOW : underPlayer(c, 'chilled') ? CHILLED_GROUND_SLOW : 1;
  return ground * (1 - ((c.frostbite ?? 0) * BOSS_FROSTBITE_SLOW_PCT) / 100);
}

/** A movement skill leaves whatever is under you behind: the player stays put on the field, so the hazard goes instead. */
function stepOut(s: GameState, ctx: Ctx, surefoot: boolean): void {
  const c = s.combat!;
  const left = c.ground.filter((g) => g.cell !== PLAYER_SPOT);
  if (left.length < c.ground.length) ctx.emit({ t: 'info', text: 'You step out of the hazard.', tone: 'good' });
  c.ground = left;
  thaw(c);
  if (surefoot) c.groundProofMs = SUREFOOT_MS;
}

/** A guard or a movement skill shakes off some Frostbite. */
function thaw(c: CombatRuntime): void {
  c.frostbite = Math.max(0, (c.frostbite ?? 0) - BOSS_FROSTBITE_CLEANSE);
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
    const type = groundElement(d, g.kind);
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
    if (c.groundAcc >= 1) ctx.emit({ t: 'hit', target: 'player', amount: Math.round(c.groundAcc), dmgType: g ? groundElement(d, g.kind) : 'fire', dot: true });
    c.groundAcc = 0;
    c.groundTimer = 0;
  }
}

// ---------- minions and storms (docs/design/MINIONS.md) ----------

/** Fraction of its life a minion recovers each second once the field is clear. */
export const MINION_REST_REGEN = 0.1;
/** Press Gang and Deep Toll: fraction of life they restore. */
const PRESS_GANG_HEAL = 0.15;
const DEEP_TOLL_HEAL = 0.3;
/** Abyssal Hunger: how much longer each kill keeps the Leviathan. */
const ABYSSAL_MS = 2000;
/** Crusted Hide: % less damage the Brute takes. */
const CRUSTED_HIDE = 40;

/** The player's minions. Saves from before minions have no list. */
export function army(c: CombatRuntime): Minion[] {
  return (c.minions ??= []);
}

/** Everything that takes up a hex. */
function bodies(c: CombatRuntime) {
  return [...c.monsters, ...army(c)];
}

/** Drag a monster toward you, past your own minions. */
function dragIn(c: CombatRuntime, m: MonsterInstance, nums: SkillNumbers): void {
  if (m.isBoss || m.martyr || m.life <= 0) return;
  const rings = nums.mods.specials.has('reelin') ? RINGS : nums.def.effect.drag!;
  for (let i = 0; i < rings && cellRing(m.cell) > 1 && pullCloser(c.monsters, m, army(c)); i++);
  if (nums.mods.specials.has('dragunder')) m.stunMs = Math.max(m.stunMs, 1000);
}

/** The gem on the bar a minion or storm answers to: take it off the bar and they go. */
function callerNumbers(s: GameState, d: Derived, gemId: string): SkillNumbers | null {
  const gem = s.skillBar.find((g) => g?.gemId === gemId);
  return gem ? skillNumbers(d, gem) : null;
}

/** Call up the minions the gem is short of, as far as the field has room. The ones still standing stay as they are. */
function callMinions(s: GameState, ctx: Ctx, d: Derived, nums: SkillNumbers, aimed?: MonsterInstance): void {
  const c = s.combat!;
  const { def, mods } = nums;
  const m = def.effect.minion!;
  const st = minionStats(d, nums);
  const mine = army(c).filter((x) => x.gemId === def.id);
  // a temporary minion's clock starts again when it's called back
  for (const x of mine) if (m.durationMs) x.remainingMs = x.durationMs = m.durationMs * nums.durationMult;
  const room = Math.min(st.count - mine.length, MINION_CAP - army(c).length);
  const cells = minionCells(bodies(c), aimed?.cell ?? BOSS_CELL, m.reach > 1, ctx.rng).slice(0, Math.max(0, room));
  for (const cell of cells) {
    army(c).push({
      uid: newUid(s),
      gemId: def.id,
      name: m.name,
      art: m.art,
      cell,
      life: st.life,
      maxLife: st.life,
      max: st.count,
      reach: m.reach,
      tough: mods.specials.has('crustedhide') ? CRUSTED_HIDE : undefined,
      shares: m.shares,
      taunts: m.taunts,
      attackMs: st.attackMs,
      stepMs: 0,
      remainingMs: m.durationMs && m.durationMs * nums.durationMult,
      durationMs: m.durationMs && m.durationMs * nums.durationMult,
    });
  }
  if (cells.length) ctx.emit({ t: 'area', gemId: def.id, cells });
}

/** Roll a hit for a minion or a storm: the damage is yours, but it doesn't use up anything saved for your own next attack. */
function proxyRoll(s: GameState, ctx: Ctx, d: Derived, nums: SkillNumbers, mon: MonsterInstance, sure: boolean) {
  const c = s.combat!;
  const held = { ambush: c.ambush, empowered: c.empowered, counterweightMore: c.counterweightMore, sureCrit: c.asc.sureCrit };
  c.ambush = c.empowered = c.asc.sureCrit = false;
  c.counterweightMore = 0;
  c.manaFrac = manaFraction(s, d);
  const roll = rollHit(s, ctx, d, nums, mon, sure);
  c.ambush = held.ambush;
  c.empowered = held.empowered;
  c.counterweightMore = held.counterweightMore;
  c.asc.sureCrit = held.sureCrit;
  return roll;
}

/** One strike of a minion or storm on everything it reaches: supports that repeat a skill's hits repeat this. */
function proxyStrike(s: GameState, ctx: Ctx, d: Derived, nums: SkillNumbers, targets: MonsterInstance[], factor: number, sure: boolean): void {
  const { mods } = nums;
  for (let pass = 0; pass <= mods.repeats; pass++) {
    const passMult = pass === 0 ? 1 : (mods.repeatDamage / 100) * (1 + d.raw.repeatMore / 100);
    const roll = proxyRoll(s, ctx, d, nums, targets[0], sure);
    if (!roll) {
      ctx.emit({ t: 'hit', target: 'monster', amount: 0, dmgType: 'phys', evaded: true, monsterUid: targets[0].uid });
      continue;
    }
    for (const m of targets) if (m.life > 0) hitMonster(s, ctx, d, nums, m, roll.byType, roll.crit, factor * passMult, roll.mega, roll.coup);
  }
}

/** A minion's turn: it hits what's in reach, with the area or chains its gem gives it. */
function minionStrike(s: GameState, ctx: Ctx, d: Derived, nums: SkillNumbers, x: Minion, target: MonsterInstance): void {
  const c = s.combat!;
  const shape = skillArea(nums);
  const alive = aliveMonsters(c).filter((m) => !m.martyr);
  let targets = [target];
  if (shape !== 'target') {
    const cells = new Set(areaCells(shape, target.cell, nums.def.effect.radius));
    targets = [target, ...alive.filter((m) => m !== target && cells.has(m.cell))];
    ctx.emit({ t: 'area', gemId: nums.def.id, cells: [...cells] });
  } else if (nums.mods.chains) targets = chainFrom(target, alive, nums.mods.chains);
  const before = targets.filter((m) => m.life > 0).length;
  proxyStrike(s, ctx, d, nums, targets, 1 + d.raw.minionPct / 100, false);
  const kills = before - targets.filter((m) => m.life > 0).length;
  if (!kills) return;
  if (nums.mods.specials.has('pressgang')) for (const y of army(c)) if (y.gemId === x.gemId) y.life = Math.min(y.maxLife, y.life + y.maxLife * PRESS_GANG_HEAL * kills);
  if (nums.mods.specials.has('abyssal') && x.remainingMs !== undefined) {
    x.remainingMs += ABYSSAL_MS * kills;
    x.durationMs = Math.max(x.durationMs ?? 0, x.remainingMs);
  }
}

/** A hit on a minion, through your armour and resistances: it shares your defences, but can't evade or block. */
function hurtMinion(ctx: Ctx, d: Derived, mon: MonsterInstance, x: Minion, raw: number, type: DamageType): void {
  if (mon.curse) raw *= 1 - mon.curse.dealLess / 100;
  const amount = Math.max(1, Math.round(mitigate(d, raw, type) * (1 - (x.tough ?? 0) / 100)));
  x.life -= amount;
  ctx.emit({ t: 'hit', target: 'minion', amount, dmgType: type, monsterUid: x.uid });
}

/**
 * Minions walk and fight by themselves, and rest once the field is clear. The fallen go, and so does anyone whose gem
 * left the bar or whose time is up.
 */
function minionStep(s: GameState, ctx: Ctx, d: Derived, dt: number): void {
  const c = s.combat!;
  if (!c.minions?.length) return;
  advanceMinions(c.minions, c.monsters, dt, c.lockedUid);
  for (const x of c.minions) {
    if (x.remainingMs !== undefined) x.remainingMs -= dt;
    if (!c.monsters.length) x.life = Math.min(x.maxLife, x.life + (x.maxLife * MINION_REST_REGEN * dt) / 1000);
    x.attackMs -= dt;
    if (x.attackMs > 0 || x.life <= 0) continue;
    const target = minionTarget(x, c.monsters, c.lockedUid);
    const nums = callerNumbers(s, d, x.gemId);
    if (!nums) {
      x.life = 0;
      continue;
    }
    if (!target || cellDistance(x.cell, target.cell) > x.reach) {
      x.attackMs = 0;
      continue;
    }
    x.attackMs = minionStats(d, nums).attackMs;
    minionStrike(s, ctx, d, nums, x, target);
  }
  for (const x of c.minions) if (x.life <= 0) minionFalls(s, ctx, d, x);
  c.minions = c.minions.filter((x) => x.life > 0 && (x.remainingMs === undefined || x.remainingMs > 0));
}

/** What a fallen minion leaves behind. One whose gem left the bar just goes. */
function minionFalls(s: GameState, ctx: Ctx, d: Derived, x: Minion): void {
  const c = s.combat!;
  const nums = callerNumbers(s, d, x.gemId);
  if (!nums) return;
  if (nums.mods.specials.has('dyingoath')) {
    c.shield = Math.min(Math.max(c.shield, d.maxLife * DYING_OATH_CAP), c.shield + x.maxLife * DYING_OATH_SHARE);
    c.shieldMax = Math.max(c.shieldMax, c.shield);
  }
  if (!nums.mods.specials.has('funeral')) return;
  const cells = new Set(areaCells('splash', x.cell, 1));
  const targets = aliveMonsters(c).filter((m) => cells.has(m.cell) && !m.martyr);
  ctx.emit({ t: 'area', gemId: x.gemId, cells: [...cells] });
  if (targets.length) proxyStrike(s, ctx, d, nums, targets, FUNERAL_MULT, true);
}

/** Whether a storm stays around you, not where it landed. */
function stormAround(nums: SkillNumbers): boolean {
  return !!nums.def.effect.storm!.anchored || nums.mods.specials.has('crowned');
}

/** The cells a storm covers with its centre on `center`. */
function stormCells(nums: SkillNumbers, center: number): number[] {
  const radius = nums.def.effect.radius;
  if (!stormAround(nums)) return areaCells(skillArea(nums), center, radius);
  return areaCells('nova', center, nums.mods.specials.has('crowned') ? Math.max(radius ?? 0, CROWNED_RINGS) : radius);
}

/** Lay a storm where the skill lands: past what the gem keeps up, the oldest blows out. */
function raiseStorm(s: GameState, ctx: Ctx, nums: SkillNumbers, aimed?: MonsterInstance): void {
  const c = s.combat!;
  const { def } = nums;
  if (!aimed && !stormAround(nums)) return;
  const center = aimed?.cell ?? FRONT_CELL;
  const st = stormStats(nums);
  const storms = (c.storms ??= []);
  const mine = storms.filter((x) => x.gemId === def.id);
  if (mine.length >= st.max) c.storms = storms.filter((x) => !mine.slice(0, mine.length - st.max + 1).includes(x));
  const cells = stormCells(nums, center);
  c.storms!.push({ uid: newUid(s), gemId: def.id, center, cells, max: st.max, pulseMs: 0, remainingMs: st.durationMs, durationMs: st.durationMs });
  ctx.emit({ t: 'area', gemId: def.id, cells });
}

/** One strike: everything standing in the storm is hit, whenever it walked in, and it can't miss. */
function stormStrike(s: GameState, ctx: Ctx, d: Derived, nums: SkillNumbers, st: Storm): void {
  const c = s.combat!;
  const e = nums.def.effect;
  const inside = new Set(st.cells);
  const targets = aliveMonsters(c).filter((m) => inside.has(m.cell) && !m.martyr);
  if (targets.length) proxyStrike(s, ctx, d, nums, targets, 1, true);
  if (nums.mods.specials.has('eyewall') && c.shield > 0) c.shield = Math.min(c.shieldMax, c.shield + c.shieldMax * EYEWALL_SHARE * targets.length);
  if (nums.mods.specials.has('reaping')) st.remainingMs += REAPING_MS * targets.filter((m) => m.life <= 0).length;
  if (e.storm!.pull) drawIn(c.monsters, army(c), st.cells, st.center);
  if (e.storm!.drift && !stormAround(nums)) {
    st.center = driftCell(st.center, c.monsters);
    st.cells = stormCells(nums, st.center);
  }
}

/** Gale of Knives: storms that answer your attacks strike now. */
function stormsAnswer(s: GameState, ctx: Ctx, d: Derived): void {
  for (const st of s.combat!.storms ?? []) {
    const nums = callerNumbers(s, d, st.gemId);
    if (nums?.def.effect.storm!.onAttack) stormStrike(s, ctx, d, nums, st);
  }
}

/** Storms run their course whether or not anything is on the field, and go if their gem leaves the bar. */
function stormStep(s: GameState, ctx: Ctx, d: Derived, dt: number): void {
  const c = s.combat!;
  if (!c.storms?.length) return;
  for (const st of c.storms) {
    st.remainingMs -= dt;
    st.pulseMs -= dt;
    const nums = callerNumbers(s, d, st.gemId);
    if (!nums || (nums.def.effect.storm!.whileShield && c.shield <= 0)) st.remainingMs = 0;
    else if (st.pulseMs <= 0) {
      st.pulseMs += stormStats(nums).everyMs;
      stormStrike(s, ctx, d, nums, st);
    }
  }
  c.storms = c.storms.filter((st) => st.remainingMs > 0);
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
  if (mon.build) {
    const fade = (ailmentThreshold(mon) * AILMENT_DECAY_PCT * dt) / 100000;
    mon.build.burn = Math.max(0, mon.build.burn - fade);
    mon.build.chill = Math.max(0, mon.build.chill - fade);
    if (!mon.shockMs) mon.build.shock = Math.max(0, mon.build.shock - fade);
  }
  if (mon.rend) {
    mon.rend.remainingMs -= dt;
    if (mon.rend.remainingMs <= 0) mon.rend = undefined;
  }
  if (mon.curse) {
    mon.curse.remainingMs -= dt;
    if (mon.curse.remainingMs <= 0) {
      collectDebt(s, ctx, mon, mon);
      mon.curse = undefined;
    }
  }
  if (mon.isBoss) bossPhases(s, ctx, d, mon, dt);
  // any stun or freeze, whatever it came from, breaks a channel
  if (channeling(mon) && (mon.stunMs > 0 || mon.frozenMs > 0)) breakChannel(ctx, mon);
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
    const minion = minionInWay(mon, army(s.combat!));
    // a melee monster still walking up holds its swing until it reaches the front rank, or meets a minion
    if (!minion && !inReach(mon)) {
      mon.attackTimer = mon.attackMs;
      return;
    }
    mon.attackTimer -= mon.attackMs;
    const enrage = mon.enraged ? BOSS_ENRAGE_DMG : 1;
    if (minion) return hurtMinion(ctx, d, mon, minion, bossDamage(mon) * enrage * (0.85 + ctx.rng.next() * 0.3), mon.dmgType);
    takeHit(s, ctx, d, mon, bossDamage(mon) * enrage * (0.85 + ctx.rng.next() * 0.3), mon.dmgType, 'hit');
    // some casters' spells splash hazardous ground at the player's feet
    if (mon.attackGround) layGround(s.combat!.ground, PLAYER_SPOT, monsterGround(mon, mon.dmgType), mon.damage * MONSTER_GROUND_DPS, MONSTER_GROUND_MS);
  }
}

/** Fresh martyrs on the free hexes nearest the boss's place in the field, and the chains go back on. */
function chainMartyrs(s: GameState, ctx: Ctx, boss: MonsterInstance): void {
  const c = s.combat!;
  const cells = freeNear(bodies(c), BOSS_CELL, ctx.rng).filter((i) => cellRing(i) >= 2).slice(0, BOSS_MARTYR_COUNT);
  for (const cell of cells) {
    const m = makeMonster({ ...MARTYR, level: boss.level }, false, newUid(s));
    m.martyr = true;
    m.damage = 0;
    m.cell = cell;
    c.monsters.push(m);
  }
  boss.chained = cells.length > 0 || undefined;
  if (cells.length) ctx.emit({ t: 'bossPhase', name: boss.name, text: "chains its martyrs: it can't be hurt until they die!" });
}

/** Echoes: a boss with several pairs moves on to the next as its life falls, and only ever forward. */
function echoStep(ctx: Ctx, mon: MonsterInstance, lifeFrac: number): void {
  if (!mon.echoes) return;
  const phase = Math.min(mon.echoes.length - 1, Math.floor((1 - lifeFrac) * mon.echoes.length));
  if (phase <= (mon.echoPhase ?? 0)) return;
  mon.echoPhase = phase;
  mon.mechanics = echoMechanics({ mechanics: [...new Set([...mon.mechanics, ...mon.echoes.flat()])], echoes: mon.echoes }, phase);
  const [a, b] = mon.echoes[phase];
  ctx.emit({ t: 'bossPhase', name: mon.name, text: `brings back ${MECHANIC_INFO[a].name.toLowerCase()} and ${MECHANIC_INFO[b].name.toLowerCase()}!` });
}

/** Life-threshold boss mechanics (enrage, ward, martyrs) and timed adds. These run even while the boss is stunned. */
function bossPhases(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance, dt: number): void {
  const has = (k: BossMechanic) => mon.mechanics.includes(k);
  const lifeFrac = mon.life / mon.maxLife;
  echoStep(ctx, mon, lifeFrac);
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
      const near = freeNear(bodies(c), mon.cell, ctx.rng).sort((a, b) => behind(a) - behind(b));
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
      const kind = monsterGround(mon, mon.novaType);
      layGround(s.combat!.ground, PLAYER_SPOT, kind, bossDamage(mon) * BOSS_SCORCH_DPS, BOSS_SCORCH_MS);
      ctx.emit({ t: 'bossPhase', name: mon.name, text: `scorches the earth: ${GROUND[kind].name.toLowerCase()} under you!` });
    }
  }
  if (has('frostbite')) frostbiteStep(s, ctx, d, mon, dt);
}

/** Frostbite builds through the fight, faster on Frozen ground, until you freeze solid. It stops for the freeze and starts again from nothing. */
function frostbiteStep(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance, dt: number): void {
  const c = s.combat!;
  if ((c.frozenMs ?? 0) > 0) return;
  mon.timers.frostbite = (mon.timers.frostbite ?? BOSS_FROSTBITE_EVERY_MS) - dt * (underPlayer(c, 'frozen') ? 2 : 1);
  if (mon.timers.frostbite > 0) return;
  mon.timers.frostbite += BOSS_FROSTBITE_EVERY_MS;
  c.frostbite = (c.frostbite ?? 0) + 1;
  if (c.frostbite < BOSS_FROSTBITE_MAX) return;
  c.frostbite = 0;
  c.frozenMs = BOSS_FROSTBITE_FREEZE_MS;
  ctx.emit({ t: 'bossPhase', name: mon.name, text: 'freezes you solid!' });
  takeHit(s, ctx, d, mon, mon.damage * BOSS_FROSTBITE_SHATTER, 'cold', 'nova');
}

/** A boss's hit, with every channel that has landed behind it. */
function bossDamage(mon: MonsterInstance): number {
  return mon.damage * (1 + BOSS_CHANNEL_SURGE * (mon.surges ?? 0));
}

function channeling(m: MonsterInstance): boolean {
  return m.casting >= 0 && m.castKind === 'channel';
}

/** A channel broken in time: it fizzles and the boss staggers. */
function breakChannel(ctx: Ctx, mon: MonsterInstance): void {
  mon.casting = -1;
  mon.castKind = null;
  mon.timers.channel = BOSS_CHANNEL_EVERY_MS;
  mon.stunMs = Math.max(mon.stunMs, BOSS_CHANNEL_STAGGER_MS);
  ctx.emit({ t: 'interrupt', name: mon.name });
  ctx.emit({ t: 'bossPhase', name: mon.name, text: `loses ${mon.casts.channel.name} and staggers!` });
}

/** How hard a channel's pulse hits at this point in it (0–1), as a multiple of the boss's hit. */
export function channelPulse(progress: number): number {
  return BOSS_CHANNEL_PULSE_MIN + (BOSS_CHANNEL_PULSE_MAX - BOSS_CHANNEL_PULSE_MIN) * progress;
}

/** The pulses that have come due. A channel lands in the boss's own element, so a boss whose nova is the other one tests both. */
function channelPulses(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance, step: number): void {
  mon.channelMs = (mon.channelMs ?? 0) + step;
  while ((mon.pulses ?? 0) < Math.floor(mon.channelMs / BOSS_CHANNEL_PULSE_MS) && s.life > 0) {
    mon.pulses = (mon.pulses ?? 0) + 1;
    takeHit(s, ctx, d, mon, bossDamage(mon) * channelPulse(Math.min(1, (mon.pulses * BOSS_CHANNEL_PULSE_MS) / mon.castTotal)), mon.dmgType, 'nova');
  }
}

/** Wind-ups: slam, nova and channel. Returns true while the boss is busy casting. */
function bossCasts(s: GameState, ctx: Ctx, d: Derived, mon: MonsterInstance, dt: number): boolean {
  if (mon.casting >= 0) {
    const step = dt * (1 - (mon.curse?.slow ?? 0) / 100);
    mon.casting -= step;
    if (channeling(mon) && mon.casting > 0) channelPulses(s, ctx, d, mon, step);
    if (mon.casting <= 0) {
      const kind = mon.castKind ?? 'slam';
      mon.casting = -1;
      mon.castKind = null;
      if (kind === 'channel') {
        mon.timers.channel = BOSS_CHANNEL_EVERY_MS;
        takeHit(s, ctx, d, mon, bossDamage(mon) * BOSS_CHANNEL_LAND_MULT, mon.dmgType, 'nova');
        mon.surges = (mon.surges ?? 0) + 1;
        ctx.emit({ t: 'bossPhase', name: mon.name, text: `lands ${mon.casts.channel.name} and grows stronger!` });
      } else if (kind === 'nova') {
        mon.timers.nova = BOSS_NOVA_EVERY_MS;
        takeHit(s, ctx, d, mon, bossDamage(mon) * BOSS_NOVA_MULT, mon.novaType, 'nova');
        // a nova catches everything on the field, so a boss fight wears minions down
        for (const x of army(s.combat!)) hurtMinion(ctx, d, mon, x, bossDamage(mon) * BOSS_NOVA_MULT, mon.novaType);
        // the blast leaves the ground under the player burning, frozen or charged
        layGround(s.combat!.ground, PLAYER_SPOT, monsterGround(mon, mon.novaType), bossDamage(mon) * BOSS_NOVA_GROUND_DPS, BOSS_NOVA_GROUND_MS);
      } else {
        mon.timers.slam = BOSS_SLAM_EVERY_MS;
        takeHit(s, ctx, d, mon, bossDamage(mon) * BOSS_SLAM_MULT, mon.slamType ?? mon.dmgType, 'slam');
      }
    }
    return true;
  }
  for (const kind of ['channel', 'slam', 'nova'] as const) {
    if (!mon.mechanics.includes(kind)) continue;
    const left = (mon.timers[kind] ?? 0) - dt;
    mon.timers[kind] = left;
    if (left <= 0) {
      mon.castKind = kind;
      mon.casting = mon.castTotal = mon.casts[kind].ms;
      mon.channelMs = mon.pulses = 0;
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
  if (!c.holdShield && expired.some((b) => b.source === 'skill' && SHIELD_SKILLS.includes(b.id))) {
    c.shield = 0;
    c.glacial = false;
    c.barbedWard = undefined;
    c.recoil = undefined;
    c.radiance = undefined;
  }
  const cooled = underPlayer(c, 'stormwater') ? dt * STORMWATER_COOLDOWN : dt;
  for (let i = 0; i < c.cooldowns.length; i++) c.cooldowns[i] = Math.max(0, c.cooldowns[i] - cooled);
  c.evadeMs = Math.max(0, c.evadeMs - dt);
  if (c.groundProofMs) c.groundProofMs = Math.max(0, c.groundProofMs - dt);
  if (c.frozenMs) c.frozenMs = Math.max(0, c.frozenMs - dt);
  if (c.frostbite && !c.monsters.some((m) => m.life > 0 && m.mechanics.includes('frostbite'))) c.frostbite = 0;
  if (classMechanicsStep(s, ctx, d, dt)) return true;

  const recovery = underPlayer(c, 'unholy') ? UNHOLY_RECOVERY : 1;
  for (const h of c.heals) {
    const t = Math.min(dt, h.remainingMs);
    if (h.resource === 'mana') gainMana(s, d, h.perMs * t);
    else s.life += h.perMs * t * recovery;
    h.remainingMs -= dt;
  }
  c.heals = c.heals.filter((h) => h.remainingMs > 0);
  const regenPct = c.buffs.reduce((a, b) => a + (b.regenPct ?? 0), 0);
  const regen = d.lifeRegen + (d.maxLife * regenPct) / 100;
  const regenned = s.life + ((regen > 0 ? regen * recovery : regen) * dt) / 1000;
  // a draining buff (Berserk) never kills you by itself
  s.life = Math.min(d.maxLife, regenPct < 0 ? Math.max(Math.min(s.life, 1), regenned) : regenned);
  const esRegenPct = c.buffs.reduce((a, b) => a + (b.esRegenPct ?? 0), 0);
  if (esRegenPct) s.es = Math.min(d.maxEs, s.es + (d.maxEs * esRegenPct * dt) / 100000);
  gainMana(s, d, (d.manaRegen * dt) / 1000);
  // there's no natural regen in a fight, so a flight that has shaken off every monster is a breather
  if (c.fleeing && !c.monsters.length) {
    s.life = Math.min(d.maxLife, s.life + (d.maxLife * FLEE_BREATHER_REGEN * dt) / 1000);
    gainMana(s, d, (d.maxMana * FLEE_BREATHER_REGEN * dt) / 1000);
  }
  c.esDelayMs = Math.max(0, c.esDelayMs - dt);
  if (c.esDelayMs <= 0) s.es = Math.min(d.maxEs, s.es + (d.esRecharge * dt) / 1000);

  // instilled flasks
  if (s.life < d.maxLife * 0.5) triggerInstilled(s, ctx, 'lowLife');
  if (d.maxMana > 0 && s.mana < d.maxMana * INSTILL_LOW_MANA) triggerInstilled(s, ctx, 'lowMana');
  if ((c.frostbite ?? 0) >= BOSS_FROSTBITE_INSTILL_AT) triggerInstilled(s, ctx, 'frostbite');
  for (let i = 0; i < s.flaskSlots.length; i++) {
    const f = s.flaskSlots[i];
    if (f?.instill === 'fullCharges' && f.charges >= flaskCapacity(s, f) && !flaskActive(s, f.flaskId)) {
      useFlask(s, ctx, i, true);
    }
  }

  autoFlee(s, ctx, d);
  advanceSpawns(s, ctx, dt);
  shakeOff(s, ctx, dt);
  stormStep(s, ctx, d, dt);
  // a wind-up goes on across the gap between packs, so the blow is ready for the next one
  if (!c.monsters.length) {
    if (c.windup) c.actionMs = Math.max(0, c.actionMs - dt);
    minionStep(s, ctx, d, dt);
    return expired.length > 0;
  }

  // damage over time
  tickDots(s, ctx, d, dt);
  tickGround(s, ctx, d, dt);
  reapDead(s, ctx, d);
  // burning ground can finish you off even as the last monster falls
  if (checkDeath(s, ctx, d) || !c.monsters.length) return true;

  // the player's turn (an overheated Overclock sits it out, and so does anyone frozen solid)
  const frozen = (c.frozenMs ?? 0) > 0;
  if (c.overheatMs > 0) c.overheatMs -= dt;
  else if (!frozen) c.actionMs -= dt * actionPace(c);
  if (c.windup && c.actionMs > 0) guardBreaksIn(s, ctx, d);
  if (c.actionMs <= 0 && !frozen) {
    const landed = !c.windup || landBlow(s, ctx, d);
    if (!s.combat || !c.monsters.length) return true;
    // instant skills don't use up the turn: fire them and choose again. Each goes on cooldown,
    // so this ends on a skill that takes time (at worst the Default Attack); the cap is a safety net
    for (let n = 0; landed && n < 8; n++) {
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
      if (choice.nums.def.tags.includes('heavy')) {
        startWindup(s, ctx, d, choice);
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

  minionStep(s, ctx, d, dt);
  reapDead(s, ctx, d);
  if (!c.monsters.length) return true;

  // the monsters' turn
  advanceMonsters(c.monsters, dt, new Set(c.ground.filter((g) => g.cell >= 0).map((g) => g.cell)), army(c));
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
  const idx = s.account.flaskStash.findIndex((f) => f.uid === uid);
  if (idx < 0) return;
  const [f] = s.account.flaskStash.splice(idx, 1);
  const prev = s.flaskSlots[slot];
  if (prev) s.account.flaskStash.push(prev);
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
  s.account.flaskStash.push(f);
  s.flaskSlots[slot] = null;
}
