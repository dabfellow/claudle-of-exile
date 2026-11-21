import { describe, expect, it } from 'vitest';
import { FISHING_FLASK, FISHING_WATERS } from '../src/data/fishing';
import { freshAccount, mergeAccounts, reconcileAccounts } from '../src/engine/account';
import { combatStep, enterZone, useFlask } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { mealStats } from '../src/engine/cooking';
import {
  castFishing, claimFishingFlask, cookFishingFeast, dockFishing, eatFishingFeast, fishingOpen, fishingTell, freshFishingPort,
  orderFishingBait, pushFishing, sailFishing, settleFishingUnlock, stepFishing, stowFishingCatch, upgradeFishingBuilding, visitFishingPort,
} from '../src/engine/fishing';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';

function unlocked() {
  const s = newGame(1);
  s.account.fishingUnlocked = true;
  visitFishingPort(s, 1);
  return { s, port: s.account.fishing! };
}

function land(s: ReturnType<typeof newGame>, start: number) {
  const voyage = s.account.fishing!.voyage!;
  for (let elapsed = 0; voyage.fight && elapsed < 90_000; elapsed += 50) {
    const fight = voyage.fight;
    const { move, tell } = fishingTell(voyage, fight);
    const steer = move === 'left' ? 1 : move === 'right' ? -1 : 0;
    stepFishing(s, start + elapsed, { steer, reel: fight.tension < (move === 'dive' && tell > 470 ? 27 : 60) });
  }
  expect(voyage.fight).toBeUndefined();
  expect(voyage.haul).toHaveLength(1);
}

describe('Saltmere fishing', () => {
  it('keeps the live gate closed and shares an earned gate only in the allowed realm', () => {
    const s = newGame(1);
    s.achievements.push('test_achievement');
    settleFishingUnlock(s, ['test_achievement']);
    expect(fishingOpen(s)).toBe(false);
    expect(sailFishing(s, 0, 0, 'balanced', 'day')).toBe('Fishing is coming soon.');
    expect(s.account.fishing).toBeUndefined();
    settleFishingUnlock(s, [], 'test_achievement');
    expect(fishingOpen(s)).toBe(false);
    settleFishingUnlock(s, ['test_achievement'], 'test_achievement');
    const shared = newGame(2, { name: 'Second', classId: 'ranger' }, s.account);
    expect(fishingOpen(shared)).toBe(true);
    expect(fishingOpen(newGame(3))).toBe(false);
    const classic = newGame(4, { name: 'Classic', classId: 'ranger', challenge: { classic: true } }, s.account);
    expect(fishingOpen(classic)).toBe(false);
  });

  it.each(FISHING_WATERS.map((water, i) => ({ index: i, water })))('lands and banks the legend in $water.name', ({ index, water }) => {
    const { s, port } = unlocked();
    port.buildings.boatyard = 5;
    port.buildings.tackle = 2;
    port.bait.lure = port.bait.chum = 5;
    expect(sailFishing(s, 0, index, index < 1 ? 'balanced' : 'heavy', 'dusk')).toBeNull();
    expect(pushFishing(s, 1)).toBeNull();
    expect(pushFishing(s, 2)).toBeNull();
    expect(castFishing(s, 3, water.legend.bait)).toBeNull();
    land(s, 4);
    expect(port.log[`${index}:legend`]).toBeUndefined();
    expect(dockFishing(s, 90_000)).toBeNull();
    expect(port.log[`${index}:legend`]?.count).toBe(1);
    expect(dockFishing(s, 91_000)).not.toBeNull();
    expect(port.marks).toBe(water.legend.value);
  });

  it.each([0, 2])('settles a wreck according to the locker rules in water %i', (index) => {
    const { s, port } = unlocked();
    port.buildings.boatyard = 3;
    sailFishing(s, 0, index, 'balanced', 'day');
    castFishing(s, 1, 'worm');
    land(s, 2);
    const voyage = port.voyage!;
    const protectedCatch = stowFishingCatch(s, 10, 0);
    expect(protectedCatch === null).toBe(index === 0);
    castFishing(s, 11, 'worm');
    voyage.hull = 1;
    voyage.fight!.tension = 99.99;
    stepFishing(s, 12, { reel: true, steer: 0 });
    expect(port.voyage).toBeUndefined();
    expect(port.log[`${index}:fish`]?.count ?? 0).toBe(index === 0 ? 1 : 0);
  });

  it('resumes a saved fight and settles workshop jobs without fishing offline', () => {
    const { s, port } = unlocked();
    port.marks = 20;
    expect(upgradeFishingBuilding(s, 0, 'nursery')).toBeNull();
    visitFishingPort(s, 20_000);
    expect(orderFishingBait(s, 20_000)).toBeNull();
    sailFishing(s, 21_000, 0, 'balanced', 'day');
    castFishing(s, 21_000, 'worm');
    stepFishing(s, 21_050, { reel: true, steer: 0 });
    s.account = JSON.parse(JSON.stringify(s.account));
    visitFishingPort(s, 90_000);
    visitFishingPort(s, 90_001);
    expect(s.account.fishing!.bait.worm).toBe(21);
    expect(s.account.fishing!.voyage!.fight!.elapsed).toBe(50);
    expect(s.account.fishing!.log).toEqual({});
    land(s, 90_050);
  });

  it('does not reunite a settled voyage with a stale haul on a realm merge', () => {
    const { s } = unlocked();
    sailFishing(s, 1, 0, 'balanced', 'day');
    castFishing(s, 2, 'worm');
    land(s, 3);
    const old = structuredClone(s.account);
    dockFishing(s, 50_000);
    mergeAccounts(s.account, old, old);
    expect(s.account.fishing?.voyage).toBeUndefined();
    expect(s.account.fishing?.log['0:fish'].count).toBe(1);
    const reconciled = reconcileAccounts(freshAccount(), s.account);
    expect(reconciled.fishingUnlocked).toBe(true);
    expect(reconciled.fishing?.log['0:fish'].count).toBe(1);
  });

  it('grants realm-bound combat rewards and refills Bottomless Tide in combat', () => {
    const { s, port } = unlocked();
    const ctx = makeCtx(seeded(3));
    port.log['2:legend'] = { count: 1, record: 10 };
    port.log['4:legend'] = { count: 1, record: 10 };
    port.buildings.smokehouse = 1;
    port.marks = 15;
    port.smokehouseStock = 1;
    expect(cookFishingFeast(s, 1)).toBeNull();
    expect(eatFishingFeast(s, 2)).toBeNull();
    expect(mealStats(s).lifePct).toBe(50);
    expect(claimFishingFlask(s, ctx.rng)).toBeNull();
    expect(claimFishingFlask(s, ctx.rng)).not.toBeNull();
    expect(s.flaskSlots[2]?.flaskId).toBe(FISHING_FLASK);
    enterZone(s, ctx, 'mudflats');
    expect(useFlask(s, ctx, 2)).toBeNull();
    const remaining = s.flaskSlots[2]!.charges;
    combatStep(s, ctx, 100, deriveStats(s));
    expect(s.flaskSlots[2]!.charges).toBeGreaterThan(remaining);
    s.account = freshAccount();
    s.account.fishing = freshFishingPort();
    expect(mealStats(s)).toEqual({});
    expect(useFlask(s, ctx, 2)).toMatch(/Saltmere/);
  });
});
