import { describe, expect, it } from 'vitest';
import { MARKER } from '../src/data/craftMats';
import { HEIST_JOBS } from '../src/data/heist';
import { actionDef, actionsFor } from '../src/data/skills';
import { makeCtx, type Ctx } from '../src/engine/context';
import { heistStep, startHeist } from '../src/engine/heist';
import { CHARGE_ZONE_WIDTH, chargeResult, doubleReady, doubleZoneStart, DOUBLE_SHARE, inDoubleZone, minigameSwing, strikeResult, surveyResult, SURVEY_DOUBLE } from '../src/engine/minigame';
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
  const before = s.account.bank[oreId] ?? 0;
  const d = deriveStats(s);
  skillStep(s, c, actionIntervalMs(s, actionDef(ORE.id), d) + 1, d);
  return { s, ore: (s.account.bank[oreId] ?? 0) - before };
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

  it('double what the next finish makes, then are used up', () => {
    const plain = mineOnce(false);
    const doubled = mineOnce(true);
    expect(plain.ore).toBeGreaterThan(0);
    expect(doubled.ore).toBe(plain.ore * 2);
    expect(doubleReady(doubled.s)).toBe(false);
  });

  it('do not stack: several doubles before a finish still pay twice', () => {
    const c = ctx();
    const s = miner();
    expect(startSkillAction(s, c, ORE.id)).toBeNull();
    for (let i = 0; i < 4; i++) minigameSwing(s, 'double');
    const d = deriveStats(s);
    skillStep(s, c, actionIntervalMs(s, actionDef(ORE.id), d) * 2 + 1, d);
    expect(s.account.bank[oreId]).toBe(mineOnce(false).ore * 3);
  });

  it('never pay out offline', () => {
    const plain = mineOnce(false);
    const away = mineOnce(true, { ...ctx(), offline: true });
    expect(away.ore).toBe(plain.ore);
  });

  it('double a Heist room take', () => {
    const job = HEIST_JOBS[0];
    const room = (double: boolean) => {
      const s = newGame(1, { name: 'T', classId: 'warrior' });
      s.unlockedZones.push('cinderroad', 'saltflats', 'blackgrass', 'caravan', 'kurgans', 'plateau', 'pyretemple', 'burningthrone');
      s.skills.thieving = xpForLevel(job.level);
      s.account.bank[MARKER] = 100;
      // never sounds the alarm
      const c: Ctx = { rng: { next: () => 0.999 } as Rng, now: 0, emit: () => {} };
      expect(startHeist(s, c, job.id)).toBeNull();
      if (double) minigameSwing(s, 'double');
      if (s.action?.kind !== 'heist') throw new Error('no job');
      s.action.progress = 1e9;
      heistStep(s, c, 1, deriveStats(s));
      return s.action?.kind === 'heist' ? s.action.take.gold : s.account.bank.gold;
    };
    expect(room(true)).toBe(room(false) * 2);
  });

  it('a waiting double survives a save and load, and old saves load without one', () => {
    const s = miner();
    expect(startSkillAction(s, ctx(), ORE.id)).toBeNull();
    minigameSwing(s, 'double');
    expect(doubleReady(deserialize(serialize(s)))).toBe(true);
    const old = miner();
    expect(startSkillAction(old, ctx(), ORE.id)).toBeNull();
    if (old.action?.kind === 'skill') delete old.action.double;
    expect(doubleReady(deserialize(serialize(old)))).toBe(false);
  });
});
