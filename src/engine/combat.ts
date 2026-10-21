import { flaskDef } from '../data/flasks';
import {
  BOSS_DMG_MULT,
  BOSS_LIFE_MULT,
  BOSS_SLAM_CAST_MS,
  BOSS_SLAM_EVERY_MS,
  BOSS_SLAM_MULT,
  monsterDamage,
  monsterLife,
  ZONES,
  zoneDef,
  type MonsterDef,
} from '../data/zones';
import type { Ctx } from './context';
import { rollLoot } from './loot';
import { chance, pick, rInt } from './rng';
import { grantXp } from './skills';
import { armourReduction, deriveStats, evadeChance, PLAYER_HIT_CHANCE, type Derived } from './stats';
import type { DamageType, GameState, InstillCondition, MonsterInstance } from './types';

export const SPAWN_DELAY_MS = 900;
export const DEATH_LIFE_FRACTION = 0.25;

export function startCombat(s: GameState, ctx: Ctx, zoneId: string): string | null {
  if (!s.unlockedZones.includes(zoneId)) return 'Zone is locked';
  s.action = { kind: 'combat', zoneId };
  s.combat = { zoneId, monster: null, spawnMs: SPAWN_DELAY_MS, attackTimer: 0, buffs: [], heals: [] };
  ctx.emit({ t: 'info', text: `Entered ${zoneDef(zoneId).name}` });
  ctx.emit({ t: 'combatStart', zoneId });
  return null;
}

export function retreat(s: GameState): void {
  s.combat = null;
  s.action = null;
}

export function makeMonster(def: MonsterDef, boss: boolean): MonsterInstance {
  const life = Math.round(monsterLife(def.level) * (def.lifeMult ?? 1) * (boss ? BOSS_LIFE_MULT : 1));
  return {
    defId: def.id,
    name: def.name,
    level: def.level,
    maxLife: life,
    life,
    damage: Math.round(monsterDamage(def.level) * (def.dmgMult ?? 1) * (boss ? BOSS_DMG_MULT : 1)),
    dmgType: def.dmgType,
    attackMs: def.attackMs,
    attackTimer: 0,
    isBoss: boss,
    slamTimer: boss ? BOSS_SLAM_EVERY_MS * 0.6 : 0,
    casting: -1,
  };
}

export function bossIsNext(s: GameState, zoneId: string): boolean {
  return (s.zoneKills[zoneId] ?? 0) >= zoneDef(zoneId).bossEvery;
}

function spawn(s: GameState, ctx: Ctx): void {
  const c = s.combat!;
  const zone = zoneDef(c.zoneId);
  const boss = bossIsNext(s, zone.id);
  c.monster = makeMonster(boss ? zone.boss : pick(ctx.rng, zone.monsters), boss);
  c.attackTimer = 0;
  ctx.emit({ t: 'spawn', name: c.monster.name, boss });
  if (boss) triggerInstilled(s, ctx, 'bossCast');
}

/** Damage a monster hit does to the player after evasion and mitigation. 0 means evaded. */
export function mitigate(d: Derived, raw: number, type: DamageType): number {
  if (type === 'phys') return Math.max(1, Math.round(raw * (1 - armourReduction(d.armour, raw))));
  const res = d.res[type];
  return Math.max(1, Math.round(raw * (1 - res / 100)));
}

// ---------- flasks ----------

export function flaskActive(s: GameState, flaskId: string): boolean {
  return !!s.combat?.buffs.some((b) => b.flaskId === flaskId);
}

export function useFlask(s: GameState, ctx: Ctx, slot: number, auto = false): string | null {
  const f = s.flaskSlots[slot];
  if (!f) return 'Empty slot';
  if (!s.combat) return 'Only usable in combat';
  const def = flaskDef(f.flaskId);
  if (f.charges < def.chargesPerUse) return 'Not enough charges';
  const d = deriveStats(s);
  f.charges -= def.chargesPerUse;
  const effect = 1 + d.flaskEffect / 100;
  const c = s.combat;
  c.buffs = c.buffs.filter((b) => b.flaskId !== f.flaskId);
  c.buffs.push({ flaskId: f.flaskId, remainingMs: def.durationMs });
  if (def.heal) c.heals.push({ perMs: (def.heal * effect) / def.durationMs, remainingMs: def.durationMs });
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
    const max = flaskDef(f.flaskId).maxCharges;
    f.charges = Math.min(max, f.charges + amount * (1 + d.flaskCharges / 100));
  }
}

// ---------- the fight ----------

function onKill(s: GameState, ctx: Ctx, d: Derived): void {
  const c = s.combat!;
  const mon = c.monster!;
  const zone = zoneDef(c.zoneId);
  ctx.emit({ t: 'kill', name: mon.name, boss: mon.isBoss });
  s.lifetime.kills += 1;
  grantXp(s, ctx, 'combat', mon.level * 4 * (mon.isBoss ? 8 : 1) + 2);
  gainCharges(s, mon.isBoss ? 8 : 1, d);
  rollLoot(s, ctx, mon, zone, d);

  if (mon.isBoss) {
    s.lifetime.bossKills += 1;
    s.zoneKills[zone.id] = 0;
    const next = ZONES.find((z) => z.tier === zone.tier + 1);
    if (next && !s.unlockedZones.includes(next.id)) {
      s.unlockedZones.push(next.id);
      ctx.emit({ t: 'zoneUnlocked', zoneId: next.id });
    }
  } else {
    s.zoneKills[zone.id] = (s.zoneKills[zone.id] ?? 0) + 1;
  }
  c.monster = null;
  c.spawnMs = SPAWN_DELAY_MS;
}

function playerAttack(s: GameState, ctx: Ctx, d: Derived): void {
  const mon = s.combat!.monster!;
  if (!chance(ctx.rng, PLAYER_HIT_CHANCE)) {
    ctx.emit({ t: 'hit', target: 'monster', amount: 0, dmgType: 'phys', evaded: true });
    return;
  }
  const crit = chance(ctx.rng, d.critChance / 100);
  let total = 0;
  let main: DamageType = 'phys';
  let mainAmt = -1;
  for (const [type, [lo, hi]] of Object.entries(d.hit) as [DamageType, [number, number]][]) {
    if (hi <= 0) continue;
    const amt = rInt(ctx.rng, lo, hi);
    total += amt;
    if (amt > mainAmt) {
      mainAmt = amt;
      main = type;
    }
  }
  if (crit) total = Math.round((total * d.critMulti) / 100);
  total = Math.max(1, total);
  mon.life -= total;
  if (d.leechPct > 0) s.life = Math.min(d.maxLife, s.life + (total * d.leechPct) / 100);
  ctx.emit({ t: 'hit', target: 'monster', amount: total, crit, dmgType: main });
}

function monsterHits(s: GameState, ctx: Ctx, d: Derived, raw: number, type: DamageType): void {
  const mon = s.combat!.monster!;
  if (chance(ctx.rng, evadeChance(d.evasion, mon.level))) {
    ctx.emit({ t: 'hit', target: 'player', amount: 0, dmgType: type, evaded: true });
    return;
  }
  const dmg = mitigate(d, raw, type);
  s.life -= dmg;
  ctx.emit({ t: 'hit', target: 'player', amount: dmg, dmgType: type });
}

function die(s: GameState, ctx: Ctx, d: Derived): void {
  s.lifetime.deaths += 1;
  // losing to a boss sends it back into hiding so the zone can be farmed again
  if (s.combat?.monster?.isBoss) s.zoneKills[s.combat.zoneId] = 0;
  ctx.emit({ t: 'death' });
  s.life = Math.max(1, Math.round(d.maxLife * DEATH_LIFE_FRACTION));
  retreat(s);
}

/** Advance combat by dt ms. Returns true when active buffs changed (stats need recomputing). */
export function combatStep(s: GameState, ctx: Ctx, dt: number, d: Derived): boolean {
  const c = s.combat;
  if (!c) return false;
  let buffsChanged = false;

  // buffs and recovery
  const before = c.buffs.length;
  for (const b of c.buffs) b.remainingMs -= dt;
  c.buffs = c.buffs.filter((b) => b.remainingMs > 0);
  if (c.buffs.length !== before) buffsChanged = true;
  for (const h of c.heals) {
    const t = Math.min(dt, h.remainingMs);
    s.life += h.perMs * t;
    h.remainingMs -= dt;
  }
  c.heals = c.heals.filter((h) => h.remainingMs > 0);
  s.life = Math.min(d.maxLife, s.life + (d.lifeRegen * dt) / 1000);

  // instilled flasks
  if (s.life < d.maxLife * 0.5) triggerInstilled(s, ctx, 'lowLife');
  for (let i = 0; i < s.flaskSlots.length; i++) {
    const f = s.flaskSlots[i];
    if (f?.instill === 'fullCharges' && f.charges >= flaskDef(f.flaskId).maxCharges && !flaskActive(s, f.flaskId)) {
      useFlask(s, ctx, i, true);
    }
  }
  if (c.buffs.length !== before) buffsChanged = true;

  if (!c.monster) {
    c.spawnMs -= dt;
    if (c.spawnMs <= 0) spawn(s, ctx);
    return buffsChanged;
  }

  // player attacks
  const interval = 1000 / d.attacksPerSec;
  c.attackTimer += dt;
  while (c.monster && c.attackTimer >= interval) {
    c.attackTimer -= interval;
    playerAttack(s, ctx, d);
    if (c.monster.life <= 0) {
      onKill(s, ctx, d);
      return buffsChanged;
    }
  }

  // monster attacks
  const mon = c.monster;
  if (mon.isBoss) {
    if (mon.casting >= 0) {
      mon.casting -= dt;
      if (mon.casting <= 0) {
        mon.casting = -1;
        mon.slamTimer = BOSS_SLAM_EVERY_MS;
        monsterHits(s, ctx, d, mon.damage * BOSS_SLAM_MULT, mon.dmgType);
      }
    } else {
      mon.slamTimer -= dt;
      if (mon.slamTimer <= 0) {
        mon.casting = BOSS_SLAM_CAST_MS;
        ctx.emit({ t: 'bossCast', name: mon.name });
        triggerInstilled(s, ctx, 'bossCast');
      }
    }
  }
  if (mon.casting < 0) {
    mon.attackTimer += dt;
    if (mon.attackTimer >= mon.attackMs) {
      mon.attackTimer -= mon.attackMs;
      const raw = mon.damage * (0.85 + ctx.rng.next() * 0.3);
      monsterHits(s, ctx, d, raw, mon.dmgType);
    }
  }

  if (s.life <= 0) die(s, ctx, d);
  return buffsChanged;
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

export function instillFlask(s: GameState, ctx: Ctx, slot: number, cond: InstillCondition | null): string | null {
  const f = s.flaskSlots[slot];
  if (!f) return 'Empty slot';
  if (cond === null) {
    f.instill = null;
    return null;
  }
  if ((s.bank.instill ?? 0) < 1) return 'You need an Instilling Orb';
  s.bank.instill -= 1;
  f.instill = cond;
  ctx.emit({ t: 'info', text: `${flaskDef(f.flaskId).name} instilled`, tone: 'good' });
  return null;
}
