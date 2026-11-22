import { describe, expect, it } from 'vitest';
import { AGILITY_SHORTCUTS, AGILITY_SPOT_LEVEL, agilityCut } from '../src/data/agility';
import { HEIST_JOBS } from '../src/data/heist';
import { actionDef, actionsFor, SKILLS } from '../src/data/skills';
import { makeCtx } from '../src/engine/context';
import { roomMs } from '../src/engine/heist';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { xpForLevel } from '../src/engine/xp';

const ctx = () => makeCtx({ next: () => 0.5 });

describe('Agility', () => {
  it('is a trainable gathering profession whose courses give only xp', () => {
    expect(SKILLS.agility.soon).toBeUndefined();
    const courses = actionsFor('agility');
    expect(courses.length).toBeGreaterThanOrEqual(8);
    const s = newGame(1);
    const c = ctx();
    const a = courses[0];
    expect(startSkillAction(s, c, a.id)).toBeNull();
    const bankBefore = JSON.stringify(s.storage.bank);
    skillStep(s, c, actionIntervalMs(s, a, deriveStats(s)) + 1, deriveStats(s));
    expect(s.skills.agility).toBeGreaterThan(0);
    expect(JSON.stringify(s.storage.bank)).toBe(bankBefore);
  });

  it('locks each course behind its Agility level only', () => {
    const s = newGame(1);
    for (const a of actionsFor('agility')) {
      s.skills.agility = xpForLevel(a.level) - 1;
      if (a.level > 1) expect(actionBlocker(s, a)).toMatch(/Agility level/);
      s.skills.agility = xpForLevel(a.level);
      expect(actionBlocker(s, a)).toBeNull();
    }
  });

  it('hidden gathering spots need both their own skill and an Agility level', () => {
    expect(Object.keys(AGILITY_SPOT_LEVEL).length).toBe(3); // Crag Oak went with the Felling giants rebuild
    for (const [id, agility] of Object.entries(AGILITY_SPOT_LEVEL)) {
      const a = actionDef(id);
      expect(a.agility).toBe(agility);
      const s = newGame(1);
      s.skills[a.skill] = xpForLevel(a.level);
      expect(actionBlocker(s, a)).toBe(`Requires Agility level ${agility}`);
      s.skills.agility = xpForLevel(agility);
      expect(actionBlocker(s, a)).toBeNull();
      s.skills[a.skill] = 0;
      if (a.level > 1) expect(actionBlocker(s, a)).not.toBeNull();
    }
  });

  it('Heist rooms speed up at the shortcut levels, using only the best step', () => {
    expect(agilityCut('heist', 1)).toBe(0);
    expect(agilityCut('heist', 12)).toBe(0.05);
    expect(agilityCut('heist', 99)).toBe(0.2);
    const s = newGame(1);
    const job = HEIST_JOBS[0];
    const d = deriveStats(s);
    const base = roomMs(s, job, d);
    s.skills.agility = xpForLevel(75);
    expect(roomMs(s, job, d)).toBeCloseTo(base * 0.8, 5);
  });

  it('fights close the distance sooner at the shortcut levels', () => {
    expect(agilityCut('closeIn', 4)).toBe(0);
    expect(agilityCut('closeIn', 5)).toBe(0.1);
    expect(agilityCut('closeIn', 85)).toBe(0.5);
    const closeIns = AGILITY_SHORTCUTS.filter((x) => x.kind === 'closeIn').map((x) => x.cut!);
    expect([...closeIns].sort((a, b) => a - b)).toEqual(closeIns);
  });

  it('old saves without Agility load at level 1 and keep their progress after a round trip', () => {
    const s = newGame(1);
    const raw = JSON.parse(serialize(s));
    delete raw.skills.agility;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.skills.agility).toBe(0);
    loaded.skills.agility = 1234;
    expect(deserialize(serialize(loaded)).skills.agility).toBe(1234);
  });
});
