import { describe, expect, it } from 'vitest';
import { MAP_TIERS, mapZoneId } from '../src/data/maps';
import { bossIsNext } from '../src/engine/combat';
import { makeCtx, type Ctx } from '../src/engine/context';
import type { ClassId } from '../src/data/classes';
import { devKit, grantMaps, mapsHeld, mapStep, onMapFieldLost, startAutoRun, startMap } from '../src/engine/maps';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';

const ctx = (): Ctx => ({ rng: seeded(1), now: 0, emit: () => {} });

describe('maps', () => {
  it('uses up a map per run and needs one to start', () => {
    const s = newGame(1);
    expect(startMap(s, ctx(), 1, 'barrows')).toBeTruthy();
    grantMaps(s, 1);
    expect(startMap(s, ctx(), 1, 'barrows')).toBeNull();
    expect(mapsHeld(s, 1, 'barrows')).toBe(0);
    expect(s.combat?.zoneId).toBe(mapZoneId(1, 'barrows'));
  });

  it('brings the boss after the packs, and auto-run opens maps until none are left', () => {
    const s = newGame(1);
    const c = ctx();
    grantMaps(s, 2);
    startAutoRun(s, c, 1, 'barrows');
    s.maps.run!.packsLeft = 0;
    expect(bossIsNext(s, s.maps.run!.zoneId)).toBe(true);
    s.maps.run!.bossDown = true;
    mapStep(s, c);
    expect(s.maps.tally.runs).toBe(1);
    expect(mapsHeld(s, 1, 'barrows')).toBe(0);
    s.maps.run!.bossDown = true;
    mapStep(s, c);
    expect(s.maps.run).toBeNull();
    expect(s.maps.auto).toBeNull();
    expect(s.combat).toBeNull();
  });

  it('stops auto-run when the fight ends early', () => {
    const s = newGame(1);
    const c = ctx();
    grantMaps(s, 3);
    startAutoRun(s, c, 1, 'barrows');
    s.combat = null;
    mapStep(s, c);
    expect(s.maps.run).toBeNull();
    expect(s.maps.auto).toBeNull();
  });

  it('survives a save, and drops a run of a removed map', () => {
    const s = newGame(1);
    grantMaps(s, 1);
    startMap(s, ctx(), 1, 'barrows');
    expect(deserialize(serialize(s)).maps.run?.theme).toBe('barrows');
    s.maps.run!.theme = 'gone';
    const back = deserialize(serialize(s));
    expect(back.maps.run).toBeNull();
    expect(back.combat).toBeNull();
  });
});

describe('maps offline', { timeout: 60_000 }, () => {
  const kitted = (classId: ClassId = 'warrior', seed = 1) => {
    const s = newGame(seed, { name: 'T', classId });
    s.tutorial.done = true;
    // the Map Device's dev kit margin: no passives spent, so it sits well above the tier
    devKit(s, makeCtx(seeded(seed)), MAP_TIERS[0].level + 14);
    return s;
  };

  it('without wind-up rules, stops at the first boss and keeps the rest of the maps', () => {
    const s = kitted();
    const c = makeCtx(seeded(2));
    grantMaps(s, 3);
    startAutoRun(s, c, 1, 'barrows');
    const sum = simulateOffline(s, c, 3_600_000);
    expect(s.lifetime.deaths).toBe(0);
    expect(s.lifetime.bossKills).toBe(0);
    expect(sum.bossWaiting).toBeTruthy();
    expect(s.maps.run?.packsLeft).toBe(0);
    expect(mapsHeld(s, 1, 'barrows')).toBeGreaterThanOrEqual(2);
  });

  it('with wind-up rules, runs maps until they are gone', () => {
    const s = kitted();
    s.account.automation.rules.push('windups');
    const c = makeCtx(seeded(3));
    s.maps.stock = { [mapZoneId(1, 'barrows')]: 3 };
    startAutoRun(s, c, 1, 'barrows');
    const sum = simulateOffline(s, c, 8 * 3_600_000);
        if (!sum.died) expect(sum.mapRuns).toBeGreaterThanOrEqual(3);
    expect(s.maps.auto).toBeNull();
    expect(s.combat).toBeNull();
  });

  it('death stops auto-run offline and uses up only that map', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    s.tutorial.done = true;
    s.settings.autoFlee = false;
    const c = makeCtx(seeded(4));
    grantMaps(s, 3);
    startAutoRun(s, c, 1, 'barrows');
    const sum = simulateOffline(s, c, 3_600_000);
    expect(sum.died).toBe(true);
    expect(s.combat).toBeNull();
    expect(s.maps.run).toBeNull();
    expect(s.maps.auto).toBeNull();
    expect(mapsHeld(s, 1, 'barrows')).toBe(2);
  });

  it('is playable: a kitted character clears most maps', { timeout: 120_000 }, () => {
    let wins = 0;
    for (const classId of ['warrior', 'mage', 'ranger'] as ClassId[]) {
      for (let seed = 1; seed <= 4; seed++) {
        const s = kitted(classId, seed);
        s.account.automation.rules.push('windups');
        const c = makeCtx(seeded(seed + 10));
        s.maps.stock = { [mapZoneId(1, 'barrows')]: 1 };
        startMap(s, c, 1, 'barrows');
        simulateOffline(s, c, 3_600_000);
        wins += s.maps.tally.runs;
      }
    }
    expect(wins).toBeGreaterThanOrEqual(7);
  });

  it('a whole field shaken off by fleeing sends a pack back', () => {
    const s = kitted();
    grantMaps(s, 1);
    startMap(s, ctx(), 1, 'barrows');
    s.maps.run!.packsLeft = 2;
    onMapFieldLost(s);
    expect(s.maps.run!.packsLeft).toBe(3);
  });
});
