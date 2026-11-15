import { describe, expect, it } from 'vitest';
import { actionDef } from '../src/data/skills';
import { findDigs, siteOf } from '../src/data/expedition';
import { exchangeFragments, standing } from '../src/engine/expedition';
import { newGame } from '../src/engine/state';
import { actionBlocker, skillStep, startSkillAction } from '../src/engine/skills';
import { deriveStats } from '../src/engine/stats';
import { deserialize, serialize } from '../src/engine/save';
import { simulateOffline } from '../src/engine/offline';
import { xpForLevel } from '../src/engine/xp';
import type { Ctx } from '../src/engine/context';

const ctx = (): Ctx => ({ now: 0, rng: { next: () => .999 }, emit: () => {} });
const make = () => newGame(1, { name: 'Independent restorer', classId: 'warrior' });
const reload = (s: ReturnType<typeof make>) => { const back = deserialize(serialize(s)); back.account = structuredClone(s.account); return back; };
const work = (s: ReturnType<typeof make>, ms: number) => skillStep(s, ctx(), ms, deriveStats(s));

describe('Phase 12 restoration', () => {
  it('completes the ordinary route from a combat-1 character, with selected resistance and full cost', () => {
    const s = make();
    expect(startSkillAction(s, ctx(), 'dig_cairn')).toBeNull();
    work(s, 4 * 3600_000);
    expect(s.professionProgress.discoveries['expedition.dig_cairn.0']).toBe(true);
    expect(standing(s, 'giant')).toBe(1);
    expect(startSkillAction(s, ctx(), 'dig_cutting')).toBeNull();
    work(s, 300 * 3500);
    expect(s.account.bank.survey_relic_fragment).toBe(5);
    startSkillAction(s, ctx(), 'sift_giant'); work(s, 50 * 10_000);
    // Independently produce the only supporting profession input.
    startSkillAction(s, ctx(), 'mine_copper'); work(s, 25 * 3000);
    startSkillAction(s, ctx(), 'smelt_copper'); work(s, 30_000);
    const before = { ...s.account.bank };
    expect(startSkillAction(s, ctx(), 'restore_surveyors_guard_cold')).toBeNull();
    work(s, 600_000);
    const item = s.inventory.at(-1)!;
    expect(item.baseId).toBe('banded_shield');
    expect(item.rarity).toBe('rare');
    expect(item.prefixes.concat(item.suffixes)).toHaveLength(4);
    expect(item.suffixes.some((x) => x.affixId === 'cold_res')).toBe(true);
    expect(item.prefixes.some((x) => x.affixId === 'flat_life')).toBe(true);
    expect(s.account.bank.survey_relic_fragment).toBe(0);
    expect(s.account.bank.giant_tally).toBe(before.giant_tally - 50);
    expect(s.account.bank.copper_bar).toBe(before.copper_bar - 5);
    expect(s.action).toBeNull();
    expect(s.skills.combat).toBe(0);
  });

  it('keeps duplicate progress at bedrock, exchanges without standing, and cannot repeat free payment', () => {
    let s = make();
    s.expedition.dug.dig_cairn = findDigs(siteOf('dig_cairn')!)[2];
    startSkillAction(s, ctx(), 'dig_cairn'); work(s, 300 * 3000);
    expect(s.account.bank.giant_relic_fragment).toBe(5);
    const oldStanding = standing(s, 'giant');
    s = reload(s);
    const before = s.account.bank.giant_tally ?? 0;
    expect(exchangeFragments(s, ctx(), 'giant')).toBeNull();
    expect(s.account.bank.giant_tally).toBe(before + 25);
    expect(exchangeFragments(s, ctx(), 'giant')).toMatch(/Needs/);
    expect(standing(s, 'giant')).toBe(oldStanding);
    expect(s.professionProgress.discoveries['expedition.dig_cairn.2']).toBe(true);
  });

  it('matches offline discoveries and fragments and preserves a started legacy site', () => {
    const a = make();
    a.expedition.dug.dig_cairn = findDigs(siteOf('dig_cairn')!)[0] - 1;
    startSkillAction(a, ctx(), 'dig_cairn');
    const b = reload(a);
    work(a, 180_000);
    simulateOffline(b, ctx(), 180_000);
    expect(b.expedition.dug).toEqual(a.expedition.dug);
    expect(b.professionProgress.discoveries).toEqual(a.professionProgress.discoveries);
    expect(b.account.bank.giant_relic_fragment).toBe(a.account.bank.giant_relic_fragment);
    b.skills.archaeology = xpForLevel(85);
    b.expedition.dug.dig_heart = 1;
    const old = reload(b);
    expect(actionBlocker(old, actionDef('dig_heart'))).toBeNull();
    expect(actionBlocker(old, actionDef('restore_convergence_relic'))).toBeTruthy();
  });
});
