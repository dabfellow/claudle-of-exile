import { describe, expect, it } from 'vitest';
import { ROGUES } from '../src/data/rogues';
import { prepBoard, prepId } from '../src/data/heist';
import { actionsFor } from '../src/data/skills';
import type { Ctx } from '../src/engine/context';
import { canStartJob, newHeistState, startHeist, toggleCrew } from '../src/engine/heist';
import { rollRogueRecruit, settleRoster } from '../src/engine/rogues';
import { seeded, type Rng } from '../src/engine/rng';
import { migrateRogueRecruitment } from '../src/engine/save';
import { skillStep, startSkillAction } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameEvent } from '../src/engine/types';

const fixed = (v: number, events: GameEvent[] = []): Ctx => ({
  rng: { next: () => v } as Rng,
  now: 0,
  emit: (e) => events.push(e),
});

const ctx = (seed = 1, events: GameEvent[] = []): Ctx => ({
  rng: seeded(seed),
  now: 0,
  emit: (e) => events.push(e),
});

function giveMinPrep(s: ReturnType<typeof newGame>, jobId = 'cinder_toll'): void {
  const board = prepBoard(jobId);
  for (const e of board.items.slice(0, board.min)) {
    s.heist.prep[prepId(jobId, e.kind)] = 1;
  }
}

describe('Zero-start rogue recruitment', () => {
  it('starts fresh characters with 0 unlocked rogues and 0 crew, blocking heists', () => {
    const fresh = newHeistState();
    expect(fresh.crew).toEqual([]);
    expect(fresh.unlockedRogues).toEqual([]);

    const s = newGame(1, { name: 'Rookie', classId: 'shadow' });
    expect(s.heist.crew).toEqual([]);
    expect(s.heist.unlockedRogues).toEqual([]);
    giveMinPrep(s, 'cinder_toll');

    expect(canStartJob(s, 'cinder_toll')).toBe('Recruit 3 rogues from Street Marks first');
    expect(startHeist(s, ctx(), 'cinder_toll')).toBe('Recruit 3 rogues from Street Marks first');
  });

  it('blocks assigning unrecruited rogues and requires 3 assigned crew once 3 are unlocked', () => {
    const s = newGame(1, { name: 'Rookie', classId: 'shadow' });
    giveMinPrep(s, 'cinder_toll');

    expect(toggleCrew(s, 'infiltrator')).toBe('Recruit this rogue by working Street Marks first');
    expect(s.heist.crew).toEqual([]);

    s.heist.unlockedRogues = ['infiltrator', 'locksmith', 'lookout'];
    expect(canStartJob(s, 'cinder_toll')).toBe('Assign 3 rogues on the Rogue Crew tab first');
    expect(startHeist(s, ctx(), 'cinder_toll')).toBe('Assign 3 rogues on the Rogue Crew tab first');

    expect(toggleCrew(s, 'infiltrator')).toBeNull();
    expect(toggleCrew(s, 'locksmith')).toBeNull();
    expect(toggleCrew(s, 'lookout')).toBeNull();
    expect(s.heist.crew).toEqual(['infiltrator', 'locksmith', 'lookout']);
    expect(canStartJob(s, 'cinder_toll')).toBeNull();
    expect(startHeist(s, fixed(0.999), 'cinder_toll')).toBeNull();
  });

  it('guarantees first 3 recruits at 3, 7, and 12 Street Mark completions without auto-assigning crew', () => {
    const s = newGame(1, { name: 'Rookie', classId: 'shadow' });
    const peddler = actionsFor('thieving').find((a) => a.id === 'mark_peddler')!;
    const events: GameEvent[] = [];
    const unlucky = fixed(0.999, events);
    startSkillAction(s, unlucky, peddler.id);

    const milestones: number[] = [];
    for (let i = 1; i <= 12; i++) {
      if (s.action?.kind === 'skill') s.action.progress = peddler.intervalMs;
      const before = s.heist.unlockedRogues!.length;
      skillStep(s, unlucky, 1, deriveStats(s));
      const after = s.heist.unlockedRogues!.length;
      if (after > before) milestones.push(i);
    }

    expect(s.professionProgress.counters['thieving.markers']).toBe(12);
    expect(milestones).toEqual([3, 7, 12]);
    expect(s.heist.unlockedRogues).toHaveLength(3);
    expect(new Set(s.heist.unlockedRogues).size).toBe(3);
    expect(s.heist.crew).toEqual([]);
    expect(s.heist.notice).toMatch(/^Recruit found: /);
    expect(events.filter((e) => e.t === 'info' && e.text.startsWith('Recruit found:'))).toHaveLength(3);
  });

  it('uses 8% chance before 3 recruits and 4% afterward, stopping once all 12 are unlocked', () => {
    const s = newGame(1, { name: 'Rookie', classId: 'shadow' });
    // Roll 0.06 passes < 0.08 while < 3 unlocked
    const first = rollRogueRecruit(s, fixed(0.06));
    expect(first).toBeTruthy();
    expect(s.heist.unlockedRogues).toHaveLength(1);
    expect(s.heist.crew).toEqual([]);

    // Fill to 3 unlocked, then 0.06 should fail (>= 0.04) while 0.03 succeeds (< 0.04)
    s.heist.unlockedRogues = ROGUES.slice(0, 3).map((r) => r.id);
    expect(rollRogueRecruit(s, fixed(0.06))).toBeNull();
    expect(s.heist.unlockedRogues).toHaveLength(3);

    const fourth = rollRogueRecruit(s, fixed(0.03));
    expect(fourth).toBeTruthy();
    expect(s.heist.unlockedRogues).toHaveLength(4);

    // Unlock all 12 -> returns null even at rng 0
    s.heist.unlockedRogues = ROGUES.map((r) => r.id);
    expect(rollRogueRecruit(s, fixed(0))).toBeNull();
  });

  it('settleRoster does not auto-fill crew and filters crew against unlockedRogues & training', () => {
    const s = newGame(1, { name: 'Rookie', classId: 'shadow' });
    s.heist.unlockedRogues = ['infiltrator'];
    s.heist.crew = ['infiltrator', 'locksmith'];
    settleRoster(s);
    expect(s.heist.unlockedRogues).toEqual(['infiltrator']);
    expect(s.heist.crew).toEqual(['infiltrator']);

    // Training rogue is dropped from crew even if unlocked
    s.heist.roster!.infiltrator.training = { specialty: 'Vault Access', remaining: 2 };
    settleRoster(s);
    expect(s.heist.crew).toEqual([]);
  });

  it('migrates pre-v66 saves: unlocks all 12 for progressed saves, resets untouched Lv 1 saves to 0/0', () => {
    // Untouched Lv 1 save with old default 3 crew
    const untouched = newGame(1, { name: 'Fresh', classId: 'warrior' });
    untouched.heist.crew = ['infiltrator', 'locksmith', 'lookout'];
    delete untouched.heist.unlockedRogues;
    const rawFresh = JSON.parse(JSON.stringify(untouched)) as Record<string, unknown>;
    migrateRogueRecruitment(rawFresh);
    expect((rawFresh.heist as { crew: string[]; unlockedRogues: string[] }).crew).toEqual([]);
    expect((rawFresh.heist as { unlockedRogues: string[] }).unlockedRogues).toEqual([]);

    // Progressed save by jobs > 0
    const withJobs = JSON.parse(JSON.stringify(untouched)) as Record<string, unknown>;
    (withJobs.heist as { tally: { jobs: number } }).tally.jobs = 1;
    migrateRogueRecruitment(withJobs);
    expect((withJobs.heist as { unlockedRogues: string[] }).unlockedRogues).toEqual(ROGUES.map((r) => r.id));

    // Progressed save by leveled/trained/talented/mastered rogue with jobs === 0
    for (const patch of [
      { level: 2 },
      { xp: 10 },
      { talents: [1] },
      { mastered: ['Vault Access'] },
      { training: { specialty: 'Vault Access', remaining: 1 } },
    ]) {
      const s = JSON.parse(JSON.stringify(untouched)) as Record<string, unknown>;
      const roster = (s.heist as { roster: Record<string, Record<string, unknown>> }).roster;
      Object.assign(roster.infiltrator, patch);
      migrateRogueRecruitment(s);
      expect((s.heist as { unlockedRogues: string[] }).unlockedRogues).toEqual(ROGUES.map((r) => r.id));
    }
  });
});
