import { CLASSES, type ClassId } from '../data/classes';
import { activeEvents, eventBoost } from '../data/events';
import { BOSS_TABLES, DROP_TABLES } from '../data/drops';
import { CURRENCIES } from '../data/materials';
import { PASSIVE_BY_ID } from '../data/passiveTree';
import { ZONES, zoneDef } from '../data/zones';
import { applySetup } from '../dev/presets';
import { bestSkillDps, craftGear, hands, manageFlasks, manageSkills, nextUpgrade, reachable, shop, spendPassives, upgradeGear } from '../dev/simPlayer';
import { characterLevel } from '../engine/character';
import { freshAccount } from '../engine/account';
import { challengeBoss, startCombat } from '../engine/combat';
import { makeCtx, type Ctx } from '../engine/context';
import { equip, slotsFor } from '../engine/equipment';
import { upgradeStation } from '../engine/hideout';
import { allocate, settlePassivePoints } from '../engine/passives';
import { seeded } from '../engine/rng';
import { newGame, tick } from '../engine/state';
import { deriveStats } from '../engine/stats';
import type { EquipSlot, GameEvent, GameState, Item, Rarity, SkillGemInstance } from '../engine/types';

export interface Rates { xp: number; magic: number; rare: number; unique: number; currency: number }
export const LIVE_RATES: Rates = { xp: 1, magic: 1, rare: 1, unique: 1, currency: 1 };
export interface SimConfig {
  source?: SimulatorLiveSource;
  classId: ClassId; level: number; zone: string; hours: number; seed: number;
  rates: Rates; gear: Partial<Record<EquipSlot, Item>>; passives: string[]; masteries: Record<string, number>;
  skillBar: (SkillGemInstance | null)[] | null;
  upgradeGear: boolean; autoTree: boolean; autoSkills: boolean; autoFlask: boolean; autoFlee: boolean; autoBoss: boolean; autoNext: boolean;
}
export const defaultConfig = (): SimConfig => ({
  classId: 'warrior', level: 1, zone: ZONES[0].id, hours: 1, seed: 1, rates: { ...LIVE_RATES }, gear: {}, passives: [], masteries: {}, skillBar: null,
  upgradeGear: true, autoTree: true, autoSkills: true, autoFlask: true, autoFlee: true, autoBoss: true, autoNext: true,
});

export function validateConfig(c: SimConfig): void {
  if (!c || !CLASSES.some(x => x.id === c.classId) || !ZONES.some(x => x.id === c.zone)) throw new Error('Choose a valid class and area.');
  if (!Number.isInteger(c.level) || c.level < 1 || c.level > 100) throw new Error('Starting level must be 1–100.');
  if (!Number.isFinite(c.hours) || c.hours <= 0 || c.hours > 720) throw new Error('Run duration must be above 0 and at most 720 hours.');
  if (!Number.isSafeInteger(c.seed) || c.seed < 1) throw new Error('Seed must be a positive whole number.');
  for (const key of Object.keys(LIVE_RATES) as (keyof Rates)[]) if (!Number.isFinite(c.rates?.[key]) || c.rates[key] < 0 || c.rates[key] > 100) throw new Error('Rate multipliers must be 0–100.');
  if (!Array.isArray(c.passives) || c.passives.some(id => !PASSIVE_BY_ID[id])) throw new Error('This loadout contains missing tree nodes.');
}

/** The same equipment and allocation gates as a player, with scenario-only starting level/area. */
export function prepareCharacter(c: SimConfig): GameState {
  validateConfig(c);
  const account = freshAccount();
  account.id = `sim-account-${c.seed}`;
  account.nextUid = 1_000_000_000_000;
  const s = newGame(c.seed, { name: 'Balance Lab', classId: c.classId, id: `sim-${c.classId}-${c.seed}` }, account);
  s.character.createdAt = 0;
  s.lastSaved = 0;
  const ctx = makeCtx(seeded(c.seed));
  applySetup(s, ctx, { level: c.level, zone: c.zone });
  s.action = null; s.combat = null;
  settlePassivePoints(s);
  for (const id of c.passives) {
    const reason = allocate(s, ctx, id, c.masteries[id] ?? 0);
    if (reason) throw new Error(`${PASSIVE_BY_ID[id].name}: ${reason}`);
  }
  // Clear supplied slots first, then equip as a group so replacement requirements are evaluated consistently.
  for (const slot of Object.keys(c.gear) as EquipSlot[]) delete s.equipment[slot];
  for (const [slot, supplied] of Object.entries(c.gear) as [EquipSlot, Item][]) {
    const item = structuredClone(supplied); item.uid = s.nextUid++;
    if (!slotsFor(item).includes(slot)) throw new Error(`That item cannot go in ${slot}.`);
    s.inventory.push(item);
    const reason = equip(s, ctx, item.uid, slot);
    if (reason) throw new Error(`${slot}: ${reason}`);
  }
  if (c.skillBar) {
    s.account.gems.push(...s.skillBar.filter((g): g is SkillGemInstance => !!g));
    s.skillBar = structuredClone(c.skillBar).map(g => g ? { ...g, uid: s.account.nextUid++, supports: g.supports.map(sup => sup ? { ...sup, uid: s.account.nextUid++ } : null) } : null);
  }
  const d = deriveStats(s);
  s.life = d.maxLife; s.mana = d.maxMana; s.es = d.maxEs;
  s.settings.autoFlee = c.autoFlee; s.settings.autoBoss = c.autoBoss; s.settings.autoNextZone = false;
  return s;
}

// Each run owns a worker. These objects are the actual game drop tables in that worker only.
export function applyRates(rates: Rates): void {
  for (const table of [...Object.values(DROP_TABLES), ...Object.values(BOSS_TABLES)]) {
    table.rarity.magic *= rates.magic; table.rarity.rare *= rates.rare;
    table.uniqueChance = Math.min(1, table.uniqueChance * rates.unique);
    if (!Object.values(table.rarity).some(x => x > 0)) throw new Error('At least one ordinary rarity needs a non-zero weight.');
  }
}

export interface Sample { ms: number; level: number; xp: number; kills: number; deaths: number; zone: string }
export interface SimReport {
  config: SimConfig; version: string; started: string; elapsedMs: number; simulatedMs: number;
  kills: number; deaths: number; flasks: number; flees: number; xp: number;
  drops: Record<Rarity, number>; currency: Record<string, number>; bosses: { zone: string; ms: number; level: number }[];
  samples: Sample[]; state: GameState; notes: string[];
}

export function createSimulation(config: SimConfig, version: string) {
  const s = prepareCharacter(config);
  const initialXp = s.skills.combat;
  const report: SimReport = { config: structuredClone(config), version, started: new Date().toISOString(), elapsedMs: 0, simulatedMs: 0, kills: 0, deaths: 0, flasks: 0, flees: 0, xp: 0, drops: { normal: 0, magic: 0, rare: 0, unique: 0 }, currency: {}, bosses: [], samples: [], state: s,
    notes: [config.source ? `Live game ${config.source.gameVersion}, release ${config.source.releaseId}, verified ${config.source.checkedAt}. Live event schedules apply during simulated time.` : 'Development preview; not verified against the live game.', 'Blue/rare controls multiply relative rarity weights. Unique control affects ordinary world drops; exclusive rewards keep their game rules.', 'Bot manually challenges, travels and drinks flasks; purchased automation retains its real unlock gates.', 'After three deaths in an area, farm an easier area for 20 minutes. Automatic progression follows campaign areas.'] };
  let now = 0, retreatUntil = 0, streak = 0, wasFleeing = false;
  let heldZone = config.zone;
  const currencyIds = new Set(CURRENCIES.map(x => x.id));
  const ctx: Ctx = { rng: seeded(config.seed * 31 + config.classId.length), now: 0,
    event: { xp: config.rates.xp, loot: 1, combatXp: config.rates.xp },
    simulation: { currencyDrops: config.rates.currency },
    emit(e: GameEvent) {
      if (e.t === 'kill') {
        report.kills++;
        if (e.boss) { streak = 0; const zone = s.combat?.zoneId ?? heldZone; if (!report.bosses.some(b => b.zone === zone)) report.bosses.push({ zone, ms: now, level: characterLevel(s) }); }
      }
      if (e.t === 'death') { report.deaths++; streak++; if (streak >= 3) { retreatUntil = now + 1_200_000; streak = 0; } }
      if (e.t === 'flask') report.flasks++;
      if (e.t === 'loot') { if (e.item) report.drops[e.item.rarity]++; if (e.currencyId && currencyIds.has(e.currencyId)) report.currency[e.currencyId] = (report.currency[e.currencyId] ?? 0) + (e.qty ?? 1); }
    },
  };
  function chores() {
    if (config.upgradeGear) { upgradeGear(s, ctx); shop(s, ctx); craftGear(s, ctx); }
    for (let next = nextUpgrade(s); next && !upgradeStation(s, ctx, next.id); next = nextUpgrade(s)) { /* pay real costs */ }
    if (config.autoTree) spendPassives(s, ctx);
    if (config.autoSkills) manageSkills(s);
    manageFlasks(s);
  }
  function step() {
    ctx.now = (config.source ? Date.parse(config.source.checkedAt) : 0) + now;
    const boost = config.source ? eventBoost(activeEvents(config.source.eventRows, ctx.now)) : null;
    ctx.eventRows = config.source?.eventRows;
    ctx.event = { ...boost, xp: (boost?.xp ?? 1) * config.rates.xp, combatXp: (boost?.combatXp ?? boost?.xp ?? 1) * config.rates.xp, loot: boost?.loot ?? 1 };
    if (now % 60_000 === 0) chores();
    const open = reachable(s).filter(z => z.act > 0 && z.act <= 6);
    const top = open.at(-1);
    const target = config.autoNext && top ? (now < retreatUntil && open.length > 1 ? open[open.length - 2] : top).id : config.zone;
    if (s.action?.kind !== 'combat' || (!s.combat?.monsters.length && s.combat?.zoneId !== target)) {
      const error = startCombat(s, ctx, target);
      if (error) throw new Error(error);
      heldZone = target;
    }
    if (s.combat) {
      // Manual competent-player input is available from day one; engine automation remains gated.
      if (config.autoBoss && (s.zoneKills[s.combat.zoneId] ?? 0) >= zoneDef(s.combat.zoneId).bossEvery) challengeBoss(s);
      if (config.autoFlask) hands(s, ctx, deriveStats(s));
      if (config.autoFlee && s.life < deriveStats(s).maxLife * 0.2) s.settings.movement = 'flee';
      else s.settings.movement = 'run';
      const fleeing = s.settings.movement === 'flee' || s.combat.fleeing;
      if (fleeing && !wasFleeing) report.flees++;
      wasFleeing = fleeing;
    }
    tick(s, ctx, 1000); now += 1000;
    report.simulatedMs = now; report.xp = s.skills.combat - initialXp;
    if (now % 60_000 === 0 || now >= config.hours * 3_600_000) report.samples.push({ ms: now, level: characterLevel(s), xp: report.xp, kills: report.kills, deaths: report.deaths, zone: s.combat?.zoneId ?? heldZone });
  }
  return { report, step, stats: () => bestSkillDps(s, deriveStats(s)) };
}
