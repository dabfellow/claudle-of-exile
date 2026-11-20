import { CREW_SLOT_LEVELS, ALARM_KEEPS, GEAR, GETAWAY_COST_MULT, hasHeistJob, HEIST_JOBS, heistJob, MAX_ALARM, MAX_ROGUE_RANK, rogueDef, rogueRankCost, STEALTH_FLOOR, STEALTH_PER_LEVEL, type HeistDrop, type HeistJob, type RogueSkill } from '../data/heist';
import { MARKER } from '../data/craftMats';
import { agilityCut } from '../data/agility';
import { actionsFor, type SkillAction } from '../data/skills';
import type { BaseDef } from '../data/bases';
import { seeUnique } from './account';
import { addBank, canAfford, payCost } from './bank';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import type { Ctx } from './context';
import { createItem, createUnique, droppableBases } from './items';
import { placeItem } from './loot';
import { focusMult, focusStep, takeDouble } from './minigame';
import { awardProtectedProgress, recordDiscovery } from './professions';
import { chance, pick } from './rng';
import { actionBlocker, grantXp, skillLevel } from './skills';
import { skillTreeStats } from './skillTree';
import type { Derived } from './stats';
import { bagFull } from './storage';
import type { GameState, HeistState } from './types';
import { grantMasteryPractice, hasMilestone, masterySpeed } from './skillingMastery';
import { newRoster } from '../data/rogues';
import { activeCrew, crewBonus, finishTraining, grantRogueXp, rogueById, roomSuccessBonus, settleRoster } from './rogues';

export type HeistGearCategory = 'all' | 'weapon' | 'armour' | 'jewellery';

export function baseCategory(b: BaseDef): 'weapon' | 'armour' | 'jewellery' {
  if (b.slot === 'weapon') return 'weapon';
  if (b.slot === 'ring' || b.slot === 'amulet' || b.slot === 'belt') return 'jewellery';
  return 'armour';
}

export function newHeistState(): HeistState {
  return { rogues: {}, roster: newRoster(), crew: ['infiltrator', 'locksmith', 'lookout'], exits: {}, auto: null, tally: { jobs: 0, alarms: 0 } };
}

// ---------- the crew ----------

export function crewSlots(s: GameState): number {
  if (s.heist.roster) return 3;
  const level = skillLevel(s, 'thieving');
  return CREW_SLOT_LEVELS.filter((l) => l <= level).length;
}

/** A rogue only helps while on the crew. */
function crewRank(s: GameState, id: RogueSkill): number {
  return s.heist.crew.includes(id) ? (s.heist.rogues[id] ?? 0) : 0;
}

function crewEffect(s: GameState, id: RogueSkill): number {
  return crewRank(s, id) * rogueDef(id).perRank;
}

/** % more chance to lift a Marker, from the Cutpurse and the skilling tree. */
export function markerBoost(s: GameState): number {
  if (s.heist.roster) return crewBonus(s, 'Market Manipulation') * 100 + (skillTreeStats(s).markerChance ?? 0);
  return crewEffect(s, 'cutpurse') * 100 + (skillTreeStats(s).markerChance ?? 0);
}

export function rogueReason(s: GameState, id: string): string | null {
  const def = rogueDef(id);
  const rank = s.heist.rogues[id] ?? 0;
  if (rank >= MAX_ROGUE_RANK) return 'Top rank';
  if (skillLevel(s, 'thieving') < def.level) return `Requires Thieving level ${def.level}`;
  if (!canAfford(s, rogueRankCost(rank + 1))) return 'Not enough Markers or gold';
  return null;
}

/** Hire a rogue or raise their rank. A new hire walks straight into any open place on the crew. */
export function rankUpRogue(s: GameState, ctx: Ctx, id: string): string | null {
  const reason = rogueReason(s, id);
  if (reason) return reason;
  const rank = s.heist.rogues[id] ?? 0;
  payCost(s, rogueRankCost(rank + 1));
  s.heist.rogues[id] = rank + 1;
  if (!rank && s.heist.crew.length < crewSlots(s)) s.heist.crew.push(id);
  ctx.emit({ t: 'info', text: `${rogueDef(id).name} ${rank ? `reached rank ${rank + 1}` : 'joined up'}`, tone: 'good' });
  return null;
}

/** Put a hired rogue on the crew, or take them off. With the crew full, the longest-serving rogue steps aside. */
export function toggleCrew(s: GameState, id: string): string | null {
  const h = s.heist;
  if (h.roster) {
    if (s.action?.kind === 'heist') return 'Finish the current heist first';
    if (!rogueById(id) || !h.roster[id]) return 'Unknown rogue';
    if (h.roster[id].training) return 'Unavailable during mentor training';
    h.crew = h.crew.includes(id) ? h.crew.filter((x) => x !== id) : [...h.crew, id].slice(-3);
    return null;
  }
  if (h.crew.includes(id)) {
    h.crew = h.crew.filter((x) => x !== id);
    return null;
  }
  if (!h.rogues[id]) return 'Hire them first';
  h.crew = [...h.crew, id].slice(-crewSlots(s));
  return null;
}

// ---------- the numbers on a job ----------

export function jobCost(s: GameState, job: HeistJob): number {
  return skillTreeStats(s).cleanGetaway ? Math.ceil(job.cost * GETAWAY_COST_MULT) : job.cost;
}

/** What stealth and the crew leave of a job's alarm chance. */
function alertMult(s: GameState, job: HeistJob): number {
  const margin = Math.max(0, skillLevel(s, 'thieving') - job.level);
  const stealth = Math.max(STEALTH_FLOOR, 1 - margin * STEALTH_PER_LEVEL);
  const crew = s.heist.roster ? Math.max(0.2, 1 - crewBonus(s, 'Alarm Suppression') - crewBonus(s, 'Alarm Gain Red.') - crewBonus(s, 'Stealth Movement') - crewBonus(s, 'Ambush Detection')) : 1 - crewEffect(s, 'lookout');
  return stealth * crew * (1 - (skillTreeStats(s).alertReduce ?? 0) / 100);
}

/** Chance of an alarm in this room (1-based). */
export function alarmChance(s: GameState, job: HeistJob, room: number): number {
  const reduction = hasMilestone(s, job.mastery, 50) ? 0.85 : 1;
  const a = s.action;
  const current = a?.kind === 'heist' && a.jobId === job.id && a.room === room;
  if (current && a.tactic === 'bypass') return 0;
  const mastery = s.heist.roster ? roomSuccessBonus(s, job, room) : 0;
  return Math.min(MAX_ALARM, Math.max(0, (job.alert / 100) * room * alertMult(s, job) * reduction - mastery) + (current && a.tactic === 'greed' ? 0.15 : 0));
}

/** Chance of walking out clean after this many rooms. */
export function cleanChance(s: GameState, job: HeistJob, rooms: number): number {
  let p = 1;
  for (let r = 1; r <= rooms; r++) p *= 1 - alarmChance(s, job, r);
  return p;
}

export function roomMs(s: GameState, job: HeistJob, d: Derived): number {
  const t = skillTreeStats(s);
  const speed = s.heist.roster ? Math.min(0.6, crewBonus(s, 'Move Speed') + crewBonus(s, 'Pathfinding') + crewBonus(s, 'Trap Bypass') + crewBonus(s, 'Obstacle Evasion')) : crewEffect(s, 'locksmith');
  return (job.roomMs * (1 - speed) * (1 - agilityCut('heist', skillLevel(s, 'agility')))) / (1 + (d.skillSpeed + (d.gatheringSpeed ?? 0) + (t.skillSpeed ?? 0) + (t.thievingSpeed ?? 0) + masterySpeed(s, job.mastery)) / 100);
}

/** Share of the take you keep when an alarm goes off. */
export function alarmKeeps(s: GameState): number {
  return skillTreeStats(s).cleanGetaway ? 1 : Math.min(1, ALARM_KEEPS + crewEffect(s, 'fence'));
}

/** The room a job walks out after: the vault unless you've said otherwise. */
export function jobExit(s: GameState, job: HeistJob): number {
  return Math.min(job.rooms, s.heist.exits[job.id] ?? job.rooms);
}

export function setJobExit(s: GameState, jobId: string, room: number): void {
  const job = heistJob(jobId);
  s.heist.exits[job.id] = Math.max(1, Math.min(job.rooms, Math.round(room)));
}

export function jobBlocker(s: GameState, job: HeistJob): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  if (skillLevel(s, 'thieving') < job.level) return `Requires Thieving level ${job.level}`;
  if (job.requires && !s.professionProgress.discoveries[job.requires] && !s.professionProgress.legacyAccess[`heist.${job.id}`]) {
    const prev = HEIST_JOBS.find((j) => job.requires === `heist_clean_${j.id}`);
    const name = prev ? prev.name : 'prior heist';
    return `Complete a clean exit from ${name} to unlock`;
  }
  return null;
}

/** Markers a mark lifts per second, purse or no purse. */
function markerRate(a: SkillAction): number {
  return (a.bonus?.find((b) => b.id === MARKER)?.chance ?? 0) / a.intervalMs;
}

/** The mark that fills the Markers soonest. */
export function bestMark(s: GameState): SkillAction | undefined {
  return actionsFor('thieving')
    .filter((a) => !actionBlocker(s, a))
    .sort((a, b) => markerRate(b) - markerRate(a))[0];
}

// ---------- running a job ----------

function beginJob(s: GameState, job: HeistJob, focus?: number): void {
  payCost(s, { [MARKER]: jobCost(s, job) });
  s.action = { kind: 'heist', jobId: job.id, room: 1, lastRoom: jobExit(s, job), progress: 0, take: {}, focus, ...(s.heist.roster ? { crew: [...s.heist.crew], spent: [] } : {}) };
}

function goCasing(s: GameState, focus?: number): boolean {
  const mark = bestMark(s);
  if (mark) s.action = { kind: 'skill', actionId: mark.id, progress: 0, focus };
  return !!mark;
}

/** Start a job on repeat. Short of Markers, you case it first: lifting purses until you can pay. */
export function startHeist(s: GameState, ctx: Ctx, jobId: string): string | null {
  const job = heistJob(jobId);
  const blocker = jobBlocker(s, job);
  if (blocker) {
    ctx.emit({ t: 'info', text: blocker, tone: 'warn' });
    return blocker;
  }
  if (s.heist.roster && activeCrew(s).length !== 3) return 'Select three available rogues first';
  s.combat = null;
  s.heist.auto = job.id;
  if ((s.storage.bank[MARKER] ?? 0) >= jobCost(s, job)) beginJob(s, job);
  else if (!goCasing(s)) return 'No mark to case the job on';
  return null;
}

/** Finish the job under way, then stop. */
export function stopHeistRepeat(s: GameState): void {
  s.heist.auto = null;
}

function addTake(take: Record<string, number>, id: string, n: number): void {
  take[id] = (take[id] ?? 0) + n;
}

function rollDrops(ctx: Ctx, take: Record<string, number>, drops: HeistDrop[], mult: number): void {
  for (const d of drops) if (chance(ctx.rng, Math.min(1, d.chance * mult))) addTake(take, d.id, d.qty);
}

export function heistGearTargetPool(s: GameState, job: HeistJob): { bases: BaseDef[]; ilvl: number; category: HeistGearCategory } {
  const thievingLvl = skillLevel(s, 'thieving');
  const ilvl = Math.min(job.ilvl, thievingLvl + 10);
  const category = (s.heist.targets?.[job.id] ?? 'all') as HeistGearCategory;
  const allBases = droppableBases(ilvl);
  const filtered = category === 'all' ? allBases : allBases.filter((b) => baseCategory(b) === category);
  return { bases: filtered.length > 0 ? filtered : allBases, ilvl, category };
}

export function setJobGearTarget(s: GameState, jobId: string, target: HeistGearCategory): void {
  if (!s.heist.targets) s.heist.targets = {};
  s.heist.targets[jobId] = target;
}

/** Stolen gear is a rare of the job's level, capped by min(job.ilvl, Thieving level + 10). */
function stealGear(s: GameState, ctx: Ctx, job: HeistJob): void {
  const { bases, ilvl } = heistGearTargetPool(s, job);
  const base = pick(ctx.rng, bases);
  placeItem(s, ctx, createItem(s, base.id, ilvl, 'rare', ctx.rng));
}

/** Bank the take. On an alarm each thing is kept at the share `keep`, so a lone Seal is a coin flip and not a loss. */
function payOut(s: GameState, ctx: Ctx, job: HeistJob, take: Record<string, number>, keep: number): void {
  for (const [id, n] of Object.entries(take)) {
    const whole = Math.floor(n * keep);
    const got = whole + (chance(ctx.rng, n * keep - whole) ? 1 : 0);
    if (id === GEAR) {
      for (let i = 0; i < got; i++) stealGear(s, ctx, job);
    } else if (got > 0) {
      addBank(s, id, got);
      ctx.emit({ t: 'loot', currencyId: id, qty: got });
    }
  }
}

function endJob(s: GameState, ctx: Ctx, job: HeistJob, take: Record<string, number>, alarm: boolean): void {
  s.heist.tally.jobs += 1;
  const completedRoom = s.action?.kind === 'heist' ? s.action.room : 0;
  if (alarm) {
    s.heist.tally.alarms += 1;
  } else {
    recordDiscovery(s, ctx, `heist_clean_${job.id}`);
    if (job.id === 'occult_treasury' && completedRoom >= job.rooms) {
      awardProtectedProgress(s, ctx, 'treasury_fragment', 4);
      awardProtectedProgress(s, ctx, 'oath_fragment', 1);
      if (chance(ctx.rng, 0.005)) {
        const item = createUnique(s, 'borrowed_tomorrow', 80, ctx.rng);
        s.lifetime.uniquesFound += 1;
        seeUnique(s.account, item);
        if (!bagFull(s)) {
          s.inventory.push(item);
        } else {
          s.storage.overflow.push(item);
        }
        ctx.emit({ t: 'loot', item });
        ctx.emit({ t: 'info', text: 'Occult Treasury jackpot! Borrowed Tomorrow recovered.', tone: 'good' });
      }
    }
  }
  payOut(s, ctx, job, take, alarm ? alarmKeeps(s) : 1);
  finishTraining(s);
  // an alarm is a bad night, not a stop: the tone stays plain so it never reads as work halted
  ctx.emit({ t: 'info', text: alarm ? `${job.name}: the alarm went up. You got out with part of the take` : `${job.name}: clean getaway`, ...(alarm ? {} : { tone: 'good' as const }) });
  const focus = s.action?.kind === 'heist' ? s.action.focus : undefined;
  s.action = null;
  const next = s.heist.auto;
  if (!next) return;
  if ((s.storage.bank[MARKER] ?? 0) >= jobCost(s, job)) beginJob(s, job, focus);
  else if (!goCasing(s, focus)) s.heist.auto = null;
}

/** One room down: XP either way, and either the alarm or the room's loot. */
function finishRoom(s: GameState, ctx: Ctx, job: HeistJob, d: Derived): void {
  const a = s.action;
  if (a?.kind !== 'heist') return;
  const t = skillTreeStats(s);
  grantXp(s, ctx, 'thieving', job.xp * (1 + (d.skillXp + (t.skillXp ?? 0)) / 100));
  grantMasteryPractice(s, job.mastery, job.roomMs / 1000);
  grantRogueXp(s);
  if (job.id === 'occult_treasury') {
    awardProtectedProgress(s, ctx, 'treasury_fragment', 1);
    s.professionProgress.counters['thieving.treasury_rooms'] = (s.professionProgress.counters['thieving.treasury_rooms'] ?? 0) + 1;
    if ((s.professionProgress.counters['thieving.treasury_rooms'] % 12) === 0) {
      awardProtectedProgress(s, ctx, 'oath_fragment', 1);
    }
  }
  if (chance(ctx.rng, alarmChance(s, job, a.room))) {
    endJob(s, ctx, job, a.take, true);
    return;
  }
  // a mini-game double: this room's loot comes twice (gold doubled, every drop rolled twice)
  const times = takeDouble(s, ctx) ? 2 : 1;
  for (let i = 0; i < times; i++) {
    if (a.tactic !== 'bypass') {
      const quantity = 1 + crewBonus(s, 'Loot Quantity') + crewBonus(s, 'Loot Enhancement') + crewBonus(s, 'Market Manipulation');
      const quality = 1 + crewBonus(s, 'Loot Quality') + crewBonus(s, 'Vault Access');
      const critical = chance(ctx.rng, crewBonus(s, 'Crit Hit Boost')) ? 2 : 1;
      const pockets = a.tacticRogue ? (s.heist.roster?.[a.tacticRogue]?.talents.filter((n) => n >= 5 && n <= 9).length ?? 0) * 0.1 : 0;
      const greed = a.tactic === 'greed' ? 1.5 + pockets : 1;
      addTake(a.take, 'gold', Math.round(job.gold * a.room * quantity * critical * greed));
      rollDrops(ctx, a.take, job.drops, a.room * quality * (a.tactic === 'greed' ? 1.5 : 1));
    }
    if (a.room === job.rooms) rollDrops(ctx, a.take, job.vault, 1 + crewBonus(s, 'Vault Access') + crewBonus(s, 'Loot Quality'));
  }
  if (a.room >= a.lastRoom) endJob(s, ctx, job, a.take, false);
  else {
    a.room += 1;
    delete a.tactic;
    delete a.tacticRogue;
    delete a.scouted;
  }
}

export function heistStep(s: GameState, ctx: Ctx, dt: number, d: Derived): void {
  if (s.action?.kind !== 'heist') return;
  const job = heistJob(s.action.jobId);
  const interval = roomMs(s, job, d);
  if (s.action.tactic === 'bypass') s.action.progress = interval;
  // Overtime: the same offline speed as any other skilling
  const offlineBoost = ctx.offline ? 1 + (skillTreeStats(s).offlineSpeed ?? 0) / 100 : 1;
  focusStep(s, ctx, dt);
  s.action.progress += dt * offlineBoost * focusMult(s) * (ctx.event?.gatheringSpeed ?? 1);
  if (s.action.progress < interval) return;
  s.action.progress -= interval;
  finishRoom(s, ctx, job, d);
}

/** The repeat: casing ends once the Markers are in, and anything other than Thieving ends the repeat. */
export function heistAutoStep(s: GameState): void {
  const id = s.heist.auto;
  if (!id || s.action?.kind === 'heist') return;
  const casing = s.action?.kind === 'skill' && s.action.actionId.startsWith('mark_');
  if (!casing) {
    s.heist.auto = null;
    return;
  }
  const job = heistJob(id);
  if (s.heist.roster && s.heist.crew.length !== 3) {
    s.heist.auto = null;
    return;
  }
  if ((s.storage.bank[MARKER] ?? 0) >= jobCost(s, job)) beginJob(s, job, s.action?.kind === 'skill' ? s.action.focus : undefined);
}

/** A save on a job or rogue that has since been removed stops instead of crashing the load. */
export function settleHeist(s: GameState): void {
  const h = s.heist;
  const stale = s.action?.kind === 'heist' && !hasHeistJob(s.action.jobId);
  if (stale) s.action = null;
  if (h.auto && !hasHeistJob(h.auto)) h.auto = null;
  settleRoster(s);
  if (s.action?.kind === 'heist' && !s.action.crew) s.action.crew = [...h.crew];
}
