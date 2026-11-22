import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_BY_ID } from '../src/data/achievements';
import {
  BINARY_PARTNER, chartLayout, chartSlotCount, FALLEN_ROLL, GILDED_STARDUST, rankXp, REGIONS, STAR_UNLOCK_POINTS, STARDUST, STARS,
} from '../src/data/astrology';
import { actionDef, actionsFor } from '../src/data/skills';
import {
  astrologyBlocker, astrologyDone, astrologySpeed, astrologyStats, astrologyXp, astrologyYield, chartReport, chartSlots, clearSlot, placeStar, rankUpBlocker,
  rechartCost, rollFallen,
} from '../src/engine/astrology';
import type { Ctx } from '../src/engine/context';
import { FOCUS_DOUBLE_OFFSET, FOCUS_HIT_OFFSET, FOCUS_WEAK_OFFSET, focusResult } from '../src/engine/minigame';
import { deserialize, serialize } from '../src/engine/save';
import { skillStep, startSkillAction } from '../src/engine/skills';
import { skillTreePoints } from '../src/engine/skillTree';
import { newGame, SAVE_VERSION } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';

const ctx = (next = 0.5): Ctx => ({ now: 0, rng: { next: () => next }, emit: () => {} });
const make = () => newGame(1, { name: 'Stargazer', classId: 'warrior' });
const unlock = (s: GameState, ...ids: string[]) => { for (const id of ids) s.astrology.stars[id] = { rank: 1, xp: 0 }; };
const chart = (s: GameState, slots: (string | null)[]) => { s.astrology.chart.slots = slots; };

describe('sky regions and research', () => {
  it('has seven regions and three deep-sky regions with 28 stars and 3 wonders', () => {
    expect(REGIONS.filter((r) => !r.deep).map((r) => r.level)).toEqual([1, 15, 30, 45, 60, 75, 90]);
    expect(REGIONS.filter((r) => r.deep).map((r) => r.level)).toEqual([80, 88, 95]);
    expect(STARS.filter((x) => !x.wonder)).toHaveLength(28);
    expect(STARS.filter((x) => x.wonder)).toHaveLength(3);
    for (const r of REGIONS.filter((x) => !x.deep)) expect(r.stars).toHaveLength(4);
    expect(actionsFor('astrology').filter((a) => a.id.startsWith('research_'))).toHaveLength(10);
    for (const a of actionsFor('astrology')) expect(a.mastery).toBeDefined();
  });

  it('researching gives Stardust, Astrology XP and a research point', () => {
    const s = make();
    expect(startSkillAction(s, ctx(), 'research_lantern')).toBeNull();
    skillStep(s, ctx(), 4000, deriveStats(s));
    expect(s.storage.bank[STARDUST]).toBeGreaterThanOrEqual(1);
    expect(s.skills.astrology).toBeGreaterThan(0);
    expect(s.astrology.regions.lantern.research).toBe(1);
  });

  it('unlocks a region\'s stars at 25, 100, 250 and 500 points', () => {
    const s = make();
    const lantern = REGIONS[0];
    const a = actionDef('research_lantern');
    expect(STAR_UNLOCK_POINTS).toEqual([25, 100, 250, 500]);
    s.astrology.regions.lantern = { research: 24 };
    astrologyDone(s, ctx(), a);
    expect(Object.keys(s.astrology.stars)).toEqual([lantern.stars[0]]);
    expect(s.astrology.stars[lantern.stars[0]]).toEqual({ rank: 1, xp: 0 });
    s.astrology.regions.lantern.research = 99;
    astrologyDone(s, ctx(), a);
    expect(Object.keys(s.astrology.stars)).toHaveLength(2);
    s.astrology.regions.lantern.research = 499;
    astrologyDone(s, ctx(), a);
    expect(Object.keys(s.astrology.stars)).toHaveLength(4);
  });

  it('a deep-sky region needs 1,000 points and a high enough level', () => {
    const s = make();
    expect(startSkillAction(s, ctx(), 'research_deep_nova')).toBe('Requires Astrology level 80');
    s.skills.astrology = xpForLevel(80);
    s.astrology.regions.deep_nova = { research: 999 };
    astrologyDone(s, ctx(), actionDef('research_deep_nova'));
    expect(s.astrology.stars.nova).toEqual({ rank: 1, xp: 0 });
  });
});

describe('watching and ranks', () => {
  it('needs the star unlocked first', () => {
    const s = make();
    expect(astrologyBlocker(s, actionDef('watch_seam_lantern'))).toMatch(/unlock/);
    unlock(s, 'seam_lantern');
    expect(astrologyBlocker(s, actionDef('watch_seam_lantern'))).toBeNull();
  });

  it('rank r takes 20 x r squared star XP and 50 Stardust, and 10 ranks take about 13 hours', () => {
    expect(rankXp(2)).toBe(80);
    expect(rankXp(10)).toBe(2000);
    const toTen = Array.from({ length: 9 }, (_, i) => rankXp(i + 2)).reduce((a, b) => a + b, 0);
    expect(toTen * 6 / 3600).toBeGreaterThan(12);
    expect(toTen * 6 / 3600).toBeLessThan(14);

    const s = make();
    unlock(s, 'seam_lantern');
    s.astrology.stars.seam_lantern.xp = rankXp(2) - 1;
    astrologyDone(s, ctx(), actionDef('watch_seam_lantern'));
    // full, but no Stardust to start the rank
    expect(s.astrology.stars.seam_lantern).toEqual({ rank: 1, xp: rankXp(2) });
    expect(astrologyBlocker(s, actionDef('watch_seam_lantern'))).toMatch(/50 Stardust/);
    s.storage.bank[STARDUST] = 50;
    expect(rankUpBlocker(s, 'seam_lantern')).toBeNull();
    astrologyDone(s, ctx(), actionDef('watch_seam_lantern'));
    expect(s.astrology.stars.seam_lantern.rank).toBe(2);
    expect(s.storage.bank[STARDUST]).toBe(0);
  });

  it('ranks 11 to 15 also need Gilded Stardust, and 15 is the top', () => {
    const s = make();
    unlock(s, 'seam_lantern');
    s.astrology.stars.seam_lantern = { rank: 10, xp: rankXp(11) };
    s.storage.bank[STARDUST] = 500;
    expect(rankUpBlocker(s, 'seam_lantern')).toMatch(/Gilded/);
    s.storage.bank[GILDED_STARDUST] = 5;
    astrologyDone(s, ctx(), actionDef('watch_seam_lantern'));
    expect(s.astrology.stars.seam_lantern.rank).toBe(11);
    expect(s.storage.bank[GILDED_STARDUST]).toBe(4);
    s.astrology.stars.seam_lantern = { rank: 15, xp: 0 };
    expect(astrologyBlocker(s, actionDef('watch_seam_lantern'))).toMatch(/highest/);
  });
});

describe('the constellation', () => {
  it('has 3 slots at level 1, one more at 20, 35, 50, 65 and 80, then the Great Chart', () => {
    const counts = [1, 19, 20, 35, 50, 65, 80, 84, 85, 94, 95, 99].map(chartSlotCount);
    expect(counts).toEqual([3, 3, 4, 5, 6, 7, 8, 8, 12, 12, 14, 14]);
    for (const n of [3, 4, 5, 6, 7, 8, 12, 14]) expect(chartLayout(n).points).toHaveLength(n);
    const s = make();
    s.skills.astrology = xpForLevel(85);
    expect(chartSlots(s)).toHaveLength(12);
  });

  it('a line between stars of the same family gives both +25%', () => {
    const s = make();
    s.skills.astrology = xpForLevel(20);
    unlock(s, 'seam_lantern', 'hollow_bough', 'lamplight');
    chart(s, ['seam_lantern', 'hollow_bough', null, null]);
    expect(chartReport(s).totals['yield:mining']).toBeCloseTo(0.625);
    expect(chartReport(s).totals['yield:woodcutting']).toBeCloseTo(0.625);
    // slots 0 and 3 share no line
    chart(s, ['seam_lantern', null, null, 'hollow_bough']);
    expect(chartReport(s).totals['yield:mining']).toBeCloseTo(0.5);
    // a different family doesn't feed
    chart(s, ['seam_lantern', 'lamplight', null, null]);
    expect(chartReport(s).totals['yield:mining']).toBeCloseTo(0.5);
    expect(chartReport(s).totals.life).toBeCloseTo(0.5);
  });

  it('applies a star\'s effect times its rank', () => {
    const s = make();
    unlock(s, 'seam_lantern');
    s.astrology.stars.seam_lantern.rank = 4;
    chart(s, ['seam_lantern', null, null]);
    expect(astrologyYield(s, 'mining')).toBeCloseTo(2);
    expect(astrologyYield(s, 'woodcutting')).toBe(0);
  });

  it('conditional stars work only when linked to what they need', () => {
    const s = make();
    unlock(s, 'forgefire', 'ember_ring', 'wardlight', 'lamplight', 'ward_of_weather');
    chart(s, ['forgefire', null, null]);
    expect(chartReport(s).totals.purity).toBeUndefined();
    chart(s, ['forgefire', 'ember_ring', null]);
    expect(chartReport(s).totals.purity).toBe(1);
    chart(s, ['forgefire', null, 'ember_ring']);
    expect(chartReport(s).totals.purity).toBe(1);
    // Wardlight needs two Combat stars
    chart(s, ['wardlight', 'lamplight', null]);
    expect(chartReport(s).totals.wardRes).toBeUndefined();
    chart(s, ['wardlight', 'lamplight', 'ward_of_weather']);
    expect(chartReport(s).totals.wardRes).toBe(1);
    expect(chartReport(s).entries[0]!.working).toBe(true);
  });

  it('Nova gives every linked star +50%', () => {
    const s = make();
    unlock(s, 'nova', 'seam_lantern', 'lamplight');
    chart(s, ['nova', 'seam_lantern', 'lamplight']);
    const t = chartReport(s).totals;
    expect(t['yield:mining']).toBeCloseTo(0.75);
    expect(t.life).toBeCloseTo(0.75);
  });

  it('Black Star takes 10% off the others and makes each line +50%', () => {
    const s = make();
    unlock(s, 'black', 'seam_lantern', 'hollow_bough');
    chart(s, ['black', 'seam_lantern', 'hollow_bough']);
    // one matching line: (1 + 0.5) x 0.9
    expect(chartReport(s).totals['yield:mining']).toBeCloseTo(0.5 * 1.5 * 0.9);
  });

  it('Binary Pair fills two adjacent slots and matches each neighbour\'s family', () => {
    const s = make();
    unlock(s, 'binary', 'seam_lantern');
    s.skills.astrology = xpForLevel(20);
    expect(placeStar(s, ctx(), 0, 'binary', 3)).toMatch(/next to/);
    expect(placeStar(s, ctx(), 0, 'binary')).toMatch(/second/);
    expect(placeStar(s, ctx(), 0, 'binary', 1)).toBeNull();
    expect(chartSlots(s)).toEqual(['binary', BINARY_PARTNER, null, null]);
    expect(placeStar(s, ctx(), 2, 'seam_lantern')).toBeNull();
    const r = chartReport(s);
    // two active lines reach the Seam Lantern, one per half of the pair
    expect(r.totals['yield:mining']).toBeCloseTo(0.5 * 1.5);
    expect(r.totals.xp).toBeCloseTo(1 * 1.5);
    expect(astrologyXp(s)).toBeCloseTo(1.5);
  });

  it('recharting costs 200 Stardust per slot changed, and filling an empty slot is free', () => {
    const s = make();
    unlock(s, 'seam_lantern', 'lamplight');
    expect(rechartCost([null, null, null], ['a', null, null])).toBe(0);
    s.skills.astrology = xpForLevel(1);
    expect(rechartCost(['a', null, null], [null, 'a', null])).toBe(200);
    expect(rechartCost(['a', 'b', null], ['b', 'a', null])).toBe(400);
    expect(placeStar(s, ctx(), 0, 'seam_lantern')).toBeNull();
    expect(placeStar(s, ctx(), 1, 'lamplight')).toBeNull();
    expect(s.storage.bank[STARDUST] ?? 0).toBe(0);
    // moving costs a slot
    expect(placeStar(s, ctx(), 2, 'seam_lantern')).toMatch(/200 Stardust/);
    s.storage.bank[STARDUST] = 450;
    expect(placeStar(s, ctx(), 2, 'seam_lantern')).toBeNull();
    expect(chartSlots(s)).toEqual([null, 'lamplight', 'seam_lantern']);
    expect(s.storage.bank[STARDUST]).toBe(250);
    expect(clearSlot(s, ctx(), 1)).toBeNull();
    expect(s.storage.bank[STARDUST]).toBe(50);
    expect(clearSlot(s, ctx(), 2)).toMatch(/200 Stardust/);
    expect(placeStar(s, ctx(), 0, 'war_star')).toMatch(/haven't unlocked/);
  });

  it('turns the buff into yield, speed, XP and combat stats', () => {
    const s = make();
    unlock(s, 'ember_ring', 'lamplight');
    s.astrology.stars.lamplight.rank = 10;
    chart(s, ['ember_ring', 'lamplight', null]);
    expect(astrologySpeed(s, 'smelting')).toBeGreaterThan(0);
    expect(astrologySpeed(s, 'mining')).toBe(0);
    expect(astrologyStats(s).lifePct).toBeCloseTo(5);
    const before = deriveStats(make()).maxLife;
    expect(deriveStats(s).maxLife).toBeGreaterThan(before);
  });
});

describe('fallen stars', () => {
  it('a watch can drop one, rolled at 80 to 120% of its listed value', () => {
    const s = make();
    unlock(s, 'seam_lantern');
    // an rng of 0 always hits the 1 in 4,000
    astrologyDone(s, ctx(0), actionDef('watch_seam_lantern'));
    expect(s.astrology.fallen).toHaveLength(1);
    const f = s.astrology.fallen[0];
    expect(f.effect).toBe('gathering');
    expect(f.value).toBeCloseTo(1 * FALLEN_ROLL[0], 2);
    rollFallen(s, ctx(0.9999));
    expect(s.astrology.fallen[1].value).toBeLessThanOrEqual(1.2 * 3 + 0.001);
    astrologyDone(s, ctx(0.5), actionDef('watch_seam_lantern'));
    expect(s.astrology.fallen).toHaveLength(2);
  });

  it('matches any family for lines and counts toward the buff', () => {
    const s = make();
    unlock(s, 'seam_lantern', 'lamplight');
    s.astrology.fallen.push({ uid: 'fallen_1', effect: 'scholar', value: 3 });
    chart(s, ['seam_lantern', 'fallen_1', 'lamplight']);
    const r = chartReport(s);
    // the fallen star touches both, and each of them feeds it
    expect(r.totals['yield:mining']).toBeCloseTo(0.5 * 1.25);
    expect(r.totals.life).toBeCloseTo(0.5 * 1.25);
    expect(r.totals.xp).toBeCloseTo(3 * 1.5);
    chart(s, [null, null, null]);
    expect(placeStar(s, ctx(), 0, 'fallen_1')).toBeNull();
  });
});

describe('focus the telescope', () => {
  it('scores by how far the ring sits from the sharpest point', () => {
    expect(FOCUS_DOUBLE_OFFSET).toBe(0.03);
    expect(FOCUS_HIT_OFFSET).toBe(0.09);
    expect(FOCUS_WEAK_OFFSET).toBe(0.15);
    expect(focusResult(0)).toBe('double');
    expect(focusResult(0.03)).toBe('double');
    expect(focusResult(-0.03)).toBe('double');
    expect(focusResult(0.031)).toBe('hit');
    expect(focusResult(0.09)).toBe('hit');
    expect(focusResult(-0.091)).toBe('weak');
    expect(focusResult(0.15)).toBe('weak');
    expect(focusResult(0.151)).toBe('miss');
    expect(focusResult(-0.6)).toBe('miss');
  });
});

describe('counting Astrology as a full skill', () => {
  it('adds to the Skilling tree points and the total life skill level', () => {
    const s = make();
    const points = skillTreePoints(s);
    s.skills.astrology = xpForLevel(99);
    expect(skillTreePoints(s)).toBeGreaterThan(points);
    expect(ACHIEVEMENT_BY_ID.total_50.progress(s) - ACHIEVEMENT_BY_ID.total_50.progress(make())).toBe(98);
    expect(ACHIEVEMENT_BY_ID.skill_50_astrology.progress(s)).toBe(99);
    expect(ACHIEVEMENT_BY_ID.skill_99_astrology.progress(s)).toBe(99);
    expect(ACHIEVEMENT_BY_ID.skill_99.progress(s)).toBe(99);
  });
});

describe('saves', () => {
  it('keeps the chart, stars and fallen stars across a save', () => {
    const s = make();
    unlock(s, 'seam_lantern');
    s.astrology.fallen.push({ uid: 'fallen_1', effect: 'warrior', value: 1.1 });
    chart(s, ['seam_lantern', 'fallen_1', null]);
    const back = deserialize(serialize(s));
    expect(back.astrology.stars.seam_lantern.rank).toBe(1);
    expect(back.astrology.fallen).toHaveLength(1);
    expect(chartSlots(back)).toEqual(['seam_lantern', 'fallen_1', null]);
  });

  it('turns the old Star Chart into regions, ranked stars and an empty constellation', () => {
    const raw = JSON.parse(serialize(make()));
    raw.version = 51;
    raw.astrology = { stars: { lantern: 3, hollow_oak: 1, sower: 1, wanderer: 5, unclosed_eye: 5 } };
    raw.skillingMastery = { 'task.study_lantern': 100, 'task.study_hollow_oak': 250, 'task.study_sower': 40 };
    raw.action = { kind: 'skill', actionId: 'study_cutpurse', progress: 100 };
    raw.storage.bank = { ...raw.storage.bank, [STARDUST]: 321, [GILDED_STARDUST]: 7 };
    const s = deserialize(JSON.stringify(raw));
    expect(s.version).toBe(SAVE_VERSION);
    // lantern + oak lit 4 stars between them: 4 stars unlocked at rank 4
    expect(s.astrology.regions.lantern.research).toBe(500);
    expect(Object.keys(s.astrology.stars).filter((id) => REGIONS[0].stars.includes(id))).toHaveLength(4);
    expect(s.astrology.stars.seam_lantern.rank).toBe(4);
    // sower + cutpurse lit 1 star: first star, rank 1
    expect(s.astrology.regions.sower.research).toBe(25);
    expect(s.astrology.stars.sowers_seed).toEqual({ rank: 1, xp: 0 });
    expect(s.astrology.stars.cutpurse_wink).toBeUndefined();
    // wanderer + eye lit 10: all four stars, rank capped at 10
    expect(s.astrology.regions.wanderer.research).toBe(500);
    expect(s.astrology.stars.watchers_eye.rank).toBe(10);
    // empty chart and a one-time notice
    expect(chartSlots(s).every((x) => x === null)).toBe(true);
    expect(s.astrology.chartNotice).toBe(true);
    // balances, task mastery and the running study carry over
    expect(s.storage.bank[STARDUST]).toBe(321);
    expect(s.storage.bank[GILDED_STARDUST]).toBe(7);
    expect(s.skillingMastery['task.research_lantern']).toBe(250);
    expect(s.skillingMastery['task.research_sower']).toBe(40);
    expect(s.skillingMastery['task.study_lantern']).toBeUndefined();
    expect(s.action).toMatchObject({ kind: 'skill', actionId: 'research_sower' });
  });

  it('loads an old save with no astrology at all', () => {
    const raw = JSON.parse(serialize(make()));
    raw.version = 51;
    delete raw.astrology;
    delete raw.skills.astrology;
    const s = deserialize(JSON.stringify(raw));
    expect(s.astrology.stars).toEqual({});
    expect(s.astrology.chartNotice).toBe(false);
    expect(s.skills.astrology).toBe(0);
  });
});
