import { describe, expect, it } from 'vitest';
import { CONSTELLATIONS, GILDED_STARDUST, STARDUST, starCost } from '../src/data/astrology';
import { actionDef, actionsFor } from '../src/data/skills';
import { astrologySpeed, lightStar, lightStarReason, starsLit } from '../src/engine/astrology';
import type { Ctx } from '../src/engine/context';
import { deserialize, serialize } from '../src/engine/save';
import { actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { skillTreePoints } from '../src/engine/skillTree';
import { deriveStats } from '../src/engine/stats';
import { newGame } from '../src/engine/state';
import { xpForLevel } from '../src/engine/xp';

const ctx = (): Ctx => ({ now: 0, rng: { next: () => 0.5 }, emit: () => {} });
const make = () => newGame(1, { name: 'Stargazer', classId: 'warrior' });

describe('astrology', () => {
  it('has one study per constellation, each with mastery', () => {
    expect(actionsFor('astrology')).toHaveLength(CONSTELLATIONS.length);
    for (const a of actionsFor('astrology')) expect(a.mastery).toBeDefined();
  });

  it('studying gives Stardust and Astrology XP from a fresh character', () => {
    const s = make();
    expect(startSkillAction(s, ctx(), 'study_lantern')).toBeNull();
    skillStep(s, ctx(), 30_000, deriveStats(s));
    expect(s.storage.bank[STARDUST]).toBeGreaterThanOrEqual(10);
    expect(s.skills.astrology).toBeGreaterThan(0);
  });

  it('lights stars for Stardust, speeding the linked profession and adding a combat stat', () => {
    const s = make();
    const lantern = CONSTELLATIONS.find((c) => c.id === 'lantern')!;
    const mine = actionDef('mine_copper');
    const slow = actionIntervalMs(s, mine, deriveStats(s));
    const lifeBefore = deriveStats(s).maxLife;
    expect(lightStarReason(s, lantern)).toBe('Not enough Stardust');
    s.storage.bank[STARDUST] = starCost(lantern, 1)[STARDUST];
    expect(lightStar(s, ctx(), 'lantern')).toBeNull();
    expect(s.storage.bank[STARDUST]).toBe(0);
    expect(starsLit(s, 'lantern')).toBe(1);
    expect(astrologySpeed(s, 'mining')).toBe(2);
    expect(astrologySpeed(s, 'woodcutting')).toBe(0);
    expect(actionIntervalMs(s, mine, deriveStats(s))).toBeLessThan(slow);
    expect(deriveStats(s).maxLife).toBeGreaterThan(lifeBefore);
  });

  it('needs Gilded Stardust for the last stars and the level for later constellations', () => {
    const s = make();
    s.storage.bank[STARDUST] = 1e6;
    for (let i = 0; i < 3; i++) expect(lightStar(s, ctx(), 'lantern')).toBeNull();
    expect(lightStar(s, ctx(), 'lantern')).toBe('Not enough Stardust');
    s.storage.bank[GILDED_STARDUST] = 4;
    expect(lightStar(s, ctx(), 'lantern')).toBeNull();
    expect(lightStar(s, ctx(), 'lantern')).toBeNull();
    expect(lightStar(s, ctx(), 'lantern')).toBe('Every star is lit');
    expect(lightStar(s, ctx(), 'wanderer')).toBe('Requires Astrology level 82');
    s.skills.astrology = xpForLevel(90);
    expect(lightStar(s, ctx(), 'unclosed_eye')).toBeNull();
    expect(astrologySpeed(s, 'cooking')).toBe(2);
  });

  it('keeps lit stars across a save and loads old saves with an empty chart', () => {
    const s = make();
    s.astrology.stars.lantern = 2;
    expect(deserialize(serialize(s)).astrology.stars.lantern).toBe(2);
    const raw = JSON.parse(serialize(make()));
    delete raw.astrology;
    delete raw.skills.astrology;
    const back = deserialize(JSON.stringify(raw));
    expect(back.astrology.stars).toEqual({});
    expect(back.skills.astrology).toBe(0);
  });

  it('does not change the Skilling tree point count', () => {
    const s = make();
    const before = skillTreePoints(s);
    s.skills.astrology = xpForLevel(99);
    expect(skillTreePoints(s)).toBe(before);
  });
});
