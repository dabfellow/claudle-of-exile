import { ROGUES, SPECIALTIES, newRoster, rogueLevelXp, talentPoints } from '../data/rogues';
import { HEIST_JOBS, type HeistJob } from '../data/heist';
import { canAfford, payCost } from './bank';
import type { Ctx } from './context';
import { chance, pick } from './rng';
import type { GameState } from './types';

export const rogueById = (id: string) => ROGUES.find((r) => r.id === id);
export function activeCrew(s: GameState): string[] {
  const crew = s.action?.kind === 'heist' ? s.action.crew ?? s.heist.crew : s.heist.crew;
  return crew.filter((id) => s.heist.roster?.[id] && !s.heist.roster[id].training);
}
export function crewBonus(s: GameState, skill: string): number {
  return activeCrew(s).reduce((sum, id) => {
    const r = rogueById(id)!;
    return sum + (r.primary === skill ? 0.1 : r.secondary.some((x) => x.toLowerCase() === skill.toLowerCase()) ? 0.05 : 0);
  }, 0);
}
export function vaultProfile(job: HeistJob) {
  const tier = HEIST_JOBS.findIndex((j) => j.id === job.id) + 1;
  return { tier, layout: (['Guard-Heavy', 'Trap-Heavy', 'Loot-Rich'] as const)[(tier - 1) % 3], threat: Math.round(job.alert * job.rooms) };
}
export function roomSpecialty(job: HeistJob, room: number): string {
  if (room === job.rooms) return 'Vault Access';
  const profile = vaultProfile(job);
  const pools = {
    'Guard-Heavy': ['Guard Distraction', 'Threat Reveal', 'Guard Takedown', 'Stealth Movement'],
    'Trap-Heavy': ['Trap Sabotage', 'System Override', 'Obstacle Evasion', 'Alarm Suppression'],
    'Loot-Rich': ['Market Manipulation', 'Loot Enhancement', 'Pathfinding', 'Vault Access'],
  };
  return pools[profile.layout][(room - 1) % 4];
}
export function matchesRoom(s: GameState, id: string, specialty: string): boolean {
  return rogueById(id)?.primary === specialty || !!s.heist.roster?.[id]?.mastered.includes(specialty);
}
export function roomSuccessBonus(s: GameState, job: HeistJob, room: number): number {
  const specialty = roomSpecialty(job, room);
  return Math.max(0, ...activeCrew(s).filter((id) => matchesRoom(s, id, specialty)).map((id) => {
    const r = s.heist.roster![id];
    return Math.min(10, r.level) * 0.02 + r.talents.filter((n) => n <= 4).length * 0.05;
  }));
}
export function roomRevealed(s: GameState): boolean {
  if (s.action?.kind !== 'heist') return false;
  return s.action.scouted === s.action.room || activeCrew(s).some((id) => id === 'lookout' && s.heist.roster![id].talents.includes(10));
}
export function scoutRoom(s: GameState): void {
  if (s.action?.kind === 'heist' && !roomRevealed(s)) {
    s.action.progress -= 3000 * (1 - crewBonus(s, 'Threat Reveal'));
    s.action.scouted = s.action.room;
  }
}
export function tacticReason(s: GameState, id: string, tactic: 'bypass' | 'greed', job: HeistJob): string | null {
  const a = s.action;
  if (a?.kind !== 'heist') return 'No heist running';
  if (a.jobId !== job.id) return 'Wrong heist';
  if (a.tactic) return 'Room choice already made';
  if (!roomRevealed(s)) return 'Scout this room first';
  if (!activeCrew(s).includes(id)) return 'Rogue is not on this crew';
  if (!matchesRoom(s, id, roomSpecialty(job, a.room))) return 'Requires a matching specialty';
  const signature = tactic === 'bypass' && s.heist.roster![id].talents.includes(10) && id !== 'lookout' && rogueById(id)!.primary === roomSpecialty(job, a.room);
  if (!signature && a.spent?.includes(id)) return 'Ability already spent this heist';
  return null;
}
export function chooseTactic(s: GameState, id: string, tactic: 'bypass' | 'greed', job: HeistJob): string | null {
  const reason = tacticReason(s, id, tactic, job);
  if (reason) return reason;
  const a = s.action;
  if (a?.kind !== 'heist') return 'No heist running';
  const signature = tactic === 'bypass' && s.heist.roster![id].talents.includes(10) && id !== 'lookout' && rogueById(id)!.primary === roomSpecialty(job, a.room);
  if (!signature) (a.spent ??= []).push(id);
  a.tactic = tactic;
  a.tacticRogue = id;
  return null;
}
export function trainReason(s: GameState, id: string, specialty: string): string | null {
  const r = s.heist.roster?.[id];
  if (!r || !SPECIALTIES.includes(specialty)) return 'Unknown rogue or specialty';
  if (s.action?.kind === 'heist') return 'Finish the current heist first';
  if (r.training) return 'Already training';
  if (matchesRoom(s, id, specialty)) return 'Specialty already mastered';
  if (!canAfford(s, { gold: 5000 })) return 'Requires 5,000 gold';
  return null;
}
export function trainRogue(s: GameState, id: string, specialty: string): string | null {
  const reason = trainReason(s, id, specialty);
  if (reason) return reason;
  payCost(s, { gold: 5000 });
  s.heist.roster![id].training = { specialty, remaining: 2 };
  s.heist.crew = s.heist.crew.filter((x) => x !== id);
  return null;
}
export function learnTalent(s: GameState, id: string, node: number): string | null {
  const r = s.heist.roster?.[id];
  if (s.action?.kind === 'heist') return 'Finish the current heist first';
  if (!r || !Number.isInteger(node) || node < 1 || node > 10) return 'Unknown talent';
  if (node !== r.talents.length + 1) return 'Learn the preceding talent first';
  if (talentPoints(r) <= 0) return 'Earn another talent point';
  r.talents.push(node);
  return null;
}
export function grantRogueXp(s: GameState): void {
  for (const id of activeCrew(s)) {
    const r = s.heist.roster![id];
    r.xp += 25;
    while (r.level < 100 && r.xp >= rogueLevelXp(r.level)) {
      r.xp -= rogueLevelXp(r.level);
      r.level++;
    }
    if (r.level === 100) r.xp = 0;
  }
}
export function finishTraining(s: GameState): void {
  for (const r of Object.values(s.heist.roster ?? {})) {
    if (r.training && --r.training.remaining <= 0) {
      r.mastered.push(r.training.specialty);
      delete r.training;
    }
  }
}
/** Roll for recruiting a locked rogue on Street Mark completion, with early pity guarantees. */
export function rollRogueRecruit(s: GameState, ctx: Ctx): string | null {
  const unlocked = (s.heist.unlockedRogues ??= []);
  const candidates = ROGUES.filter((r) => !unlocked.includes(r.id));
  if (!candidates.length) return null;
  const marks = s.professionProgress.counters['thieving.markers'] ?? 0;
  const guaranteed = (unlocked.length === 0 && marks >= 3)
    || (unlocked.length === 1 && marks >= 7)
    || (unlocked.length === 2 && marks >= 12);
  if (!guaranteed && !chance(ctx.rng, unlocked.length < 3 ? 0.08 : 0.04)) return null;
  const r = pick(ctx.rng, candidates);
  unlocked.push(r.id);
  const text = `Recruit found: ${r.name} (${r.class}) joined your contact list in Rogue Crew!`;
  s.heist.notice = text;
  ctx.emit({ t: 'info', text, tone: 'good' });
  return r.id;
}

/** Preserve old investments as Field Mastery and map retired classes to their successors. */
export function settleRoster(s: GameState): void {
  const migrated = !s.heist.roster;
  const aliases: Record<string, string> = { fence: 'grifter', cutpurse: 'pickpocket' };
  if (migrated) {
    s.heist.roster = newRoster();
    for (const [old, rank] of Object.entries(s.heist.rogues)) {
      const r = s.heist.roster[aliases[old] ?? old];
      if (r) r.level = Math.max(1, Math.min(10, rank * 2));
    }
    s.heist.crew = s.heist.crew.map((id) => aliases[id] ?? id);
  }
  const baseUnlocked = s.heist.unlockedRogues
    ?? (migrated
      ? [...s.heist.crew, ...Object.entries(s.heist.rogues ?? {}).filter(([, rank]) => rank > 0).map(([id]) => aliases[id] ?? id)]
      : s.heist.crew)
    ?? [];
  s.heist.unlockedRogues = [...new Set(baseUnlocked.filter((id) => !!rogueById(id)))];
  s.heist.crew = [...new Set(s.heist.crew)]
    .filter((id) => rogueById(id) && s.heist.unlockedRogues!.includes(id) && !s.heist.roster![id]?.training)
    .slice(0, 3);
}
