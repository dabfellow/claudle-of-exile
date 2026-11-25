import { describe, expect, it } from 'vitest';
import { HEIST_JOBS, prepBoard, prepId } from '../src/data/heist';
import { actionDef, actionsFor } from '../src/data/skills';
import { makeCtx, type Ctx } from '../src/engine/context';
import { heistStep, startHeist } from '../src/engine/heist';
import { CHARGE_ZONE_WIDTH, chargeResult, doubleReady, doubleZoneStart, DOUBLE_SHARE, focusOf, inDoubleZone, minigameSwing, strikeResult, surveyResult, SURVEY_DOUBLE } from '../src/engine/minigame';
import { seeded, type Rng } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';

const ctx = (seed = 1): Ctx => makeCtx(seeded(seed));

function miner(): GameState {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  s.unlockedZones = ['mudflats', 'brinecaves', 'ashwood'];
  return s;
}

const ORE = actionsFor('mining')[0];
const oreId = Object.keys(ORE.outputs ?? {})[0];

/** Start mining, maybe land a double, and finish exactly once. Returns the ore made. */
function mineOnce(double: boolean, c: Ctx = ctx()): { s: GameState; ore: number } {
  const s = miner();
  expect(startSkillAction(s, c, ORE.id)).toBeNull();
  if (double) minigameSwing(s, 'double');
  const before = s.storage.bank[oreId] ?? 0;
  const d = deriveStats(s);
  skillStep(s, c, actionIntervalMs(s, actionDef(ORE.id), d) + 1, d);
  return { s, ore: (s.storage.bank[oreId] ?? 0) - before };
}

describe('double zones', () => {
  it('sit in the middle third of each bright zone', () => {
    const zone = 0.7;
    const start = doubleZoneStart(zone, CHARGE_ZONE_WIDTH);
    expect(start).toBeCloseTo(zone + CHARGE_ZONE_WIDTH / 3);
    expect(inDoubleZone(zone + CHARGE_ZONE_WIDTH / 2, zone, CHARGE_ZONE_WIDTH)).toBe(true);
    expect(inDoubleZone(zone + 0.01, zone, CHARGE_ZONE_WIDTH)).toBe(false);
    expect(DOUBLE_SHARE).toBeLessThan(0.5);
  });

  it('score a charge, a strike and a survey', () => {
    expect(chargeResult(0.7 + CHARGE_ZONE_WIDTH / 2, 0.7)).toBe('double');
    expect(chargeResult(0.7 + 0.005, 0.7)).toBe('hit');
    expect(strikeResult(20)).toBe('double');
    expect(strikeResult(-90)).toBe('hit');
    expect(surveyResult(true, SURVEY_DOUBLE)).toBe('double');
    expect(surveyResult(true, SURVEY_DOUBLE + 1)).toBe('hit');
  });

  it('give twice a clean hit\'s Focus', () => {
    const hit = miner();
    const crit = miner();
    expect(startSkillAction(hit, ctx(), ORE.id)).toBeNull();
    expect(startSkillAction(crit, ctx(), ORE.id)).toBeNull();
    minigameSwing(hit, 'hit');
    minigameSwing(crit, 'double');
    expect(focusOf(crit)).toBeCloseTo(focusOf(hit) * 2);
  });

  it('no longer double what the next finish makes', () => {
    const plain = mineOnce(false);
    const crit = mineOnce(true);
    expect(plain.ore).toBeGreaterThan(0);
    expect(crit.ore).toBe(plain.ore);
    expect(doubleReady(crit.s)).toBe(false);
  });

  it('never double a Heist room take', () => {
    const job = HEIST_JOBS[0];
    const room = (double: boolean) => {
      const s = newGame(1, { name: 'T', classId: 'warrior' });
      s.unlockedZones.push('cinderroad', 'saltflats', 'blackgrass', 'caravan', 'kurgans', 'plateau', 'pyretemple', 'burningthrone');
      s.skills.thieving = xpForLevel(job.level);
      s.heist.unlockedRogues = ['infiltrator', 'locksmith', 'lookout'];
      s.heist.crew = ['infiltrator', 'locksmith', 'lookout'];
      for (const e of prepBoard(job.id).items.slice(0, 2)) s.heist.prep[prepId(job.id, e.kind)] = 1;
      // never sounds the alarm
      const c: Ctx = { rng: { next: () => 0.999 } as Rng, now: 0, emit: () => {} };
      expect(startHeist(s, c, job.id)).toBeNull();
      if (double) minigameSwing(s, 'double');
      if (s.action?.kind !== 'heist') throw new Error('no job');
      s.action.progress = 1e9;
      heistStep(s, c, 1, deriveStats(s));
      return s.action?.kind === 'heist' ? s.action.take.gold : s.storage.bank.gold;
    };
    expect(room(true)).toBe(room(false));
  });

  it('an old save\'s waiting double still loads, and saves without one load fine', () => {
    const s = miner();
    expect(startSkillAction(s, ctx(), ORE.id)).toBeNull();
    if (s.action?.kind === 'skill') s.action.double = true;
    expect(doubleReady(deserialize(serialize(s)))).toBe(true);
    const old = miner();
    expect(startSkillAction(old, ctx(), ORE.id)).toBeNull();
    if (old.action?.kind === 'skill') delete old.action.double;
    expect(doubleReady(deserialize(serialize(old)))).toBe(false);
  });
});
