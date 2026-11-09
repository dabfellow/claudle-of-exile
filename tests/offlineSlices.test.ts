import { describe, expect, it } from 'vitest';
import { startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { MAX_PINNED_CURRENCIES, pinnedCurrencies, toggleCurrencyPin } from '../src/engine/currencyPins';
import { mergeOffline, simulateOffline, startOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { charXpForLevel } from '../src/engine/xp';

const fighter = () => {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  s.tutorial.done = true;
  s.skills.combat = charXpForLevel(20);
  return s;
};

describe('offline catch-up in slices', { timeout: 20_000 }, () => {
  it('ends exactly where one unbroken run does, however finely it is sliced', () => {
    const a = fighter();
    const ca = makeCtx(seeded(3), 1_800_000_000_000);
    startCombat(a, ca, 'mudflats');
    const whole = simulateOffline(a, ca, 20 * 60_000);

    const b = fighter();
    const cb = makeCtx(seeded(3), 1_800_000_000_000);
    startCombat(b, cb, 'mudflats');
    const run = startOffline(b, cb, 20 * 60_000);
    let slices = 0;
    let last = 0;
    while (!run.step(0)) {
      slices++;
      expect(run.progress).toBeGreaterThanOrEqual(last);
      last = run.progress;
    }
    expect(slices).toBeGreaterThan(10);
    expect(run.done).toBe(true);
    expect(run.progress).toBe(1);
    expect(run.summary).toEqual(whole);
    // two new characters differ only in their ids (character, item uids) and when they were made
    const strip = (o: unknown): unknown =>
      Array.isArray(o)
        ? o.map(strip)
        : o && typeof o === 'object'
          ? Object.fromEntries(Object.entries(o).filter(([k]) => !/^(id|uid|nextUid|createdAt|lastSaved)$/.test(k)).map(([k, v]) => [k, strip(v)]))
          : o;
    expect(strip(JSON.parse(serialize(b)))).toEqual(strip(JSON.parse(serialize(a))));
  });

  it('folds a second short absence into the summary still on screen', () => {
    const a = fighter();
    const c = makeCtx(seeded(4));
    startCombat(a, c, 'mudflats');
    const first = simulateOffline(a, c, 10 * 60_000);
    const second = simulateOffline(a, c, 2 * 60_000);
    const both = mergeOffline(first, second);
    expect(both.ms).toBe(first.ms + second.ms);
    expect(both.kills).toBe(first.kills + second.kills);
    expect(both.xp.combat).toBeCloseTo((first.xp.combat ?? 0) + (second.xp.combat ?? 0));
  });
});

describe('pinned currencies', () => {
  it('starts empty, pins up to the limit and unpins', () => {
    const s = newGame(1);
    expect(pinnedCurrencies(s)).toEqual([]);
    const ids = ['gold', 'chaos', 'exalted', 'divine', 'regal', 'alchemy'];
    for (const id of ids.slice(0, MAX_PINNED_CURRENCIES)) expect(toggleCurrencyPin(s, id)).toBeNull();
    expect(toggleCurrencyPin(s, ids[MAX_PINNED_CURRENCIES])).toMatch(/unpin one/);
    expect(pinnedCurrencies(s)).toEqual(ids.slice(0, MAX_PINNED_CURRENCIES));
    expect(toggleCurrencyPin(s, 'chaos')).toBeNull();
    expect(pinnedCurrencies(s)).not.toContain('chaos');
  });
});
