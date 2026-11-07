import { describe, expect, it } from 'vitest';
import { actionsFor, SKILLS } from '../src/data/skills';
import { SKILL_TREE_NODES } from '../src/data/skillTree';
import { makeCtx } from '../src/engine/context';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { startSkillAction } from '../src/engine/skills';
import { skillTreePoints } from '../src/engine/skillTree';
import { newGame } from '../src/engine/state';
import { xpForLevel } from '../src/engine/xp';

describe('fishing (coming soon)', () => {
  it('lists spots that can never be started', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    s.skills.fishing = xpForLevel(99);
    expect(SKILLS.fishing.soon).toBe(true);
    expect(actionsFor('fishing').length).toBeGreaterThan(0);
    for (const a of actionsFor('fishing')) expect(startSkillAction(s, makeCtx(seeded(1)), a.id)).toBe('Coming soon');
    expect(s.action).toBeNull();
  });

  it('has no spendable tree branch, and its level adds no points', () => {
    expect(SKILL_TREE_NODES.filter((n) => n.branch === 'fishing')).toHaveLength(0);
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    const before = skillTreePoints(s);
    s.skills.fishing = xpForLevel(99);
    expect(skillTreePoints(s)).toBe(before);
  });

  it('old saves without the skill load at level 1', () => {
    const raw = JSON.parse(serialize(newGame(1, { name: 'T', classId: 'warrior' })));
    delete raw.skills.fishing;
    expect(deserialize(JSON.stringify(raw)).skills.fishing).toBe(0);
  });
});

describe('skilling rebalance', () => {
  it('smithing a weapon costs at least 15 ore and takes 10 s or more', () => {
    const a = actionsFor('smithing').find((x) => x.baseId && x.level === 1 && (x.inputs?.copper_ore ?? 0) >= 15);
    expect(a).toBeDefined();
    expect(a!.intervalMs).toBeGreaterThanOrEqual(10000);
  });

  it('Harvesting is shown as Foraging', () => {
    expect(SKILLS.harvesting.name).toBe('Foraging');
  });
});
