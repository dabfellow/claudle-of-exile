import { describe, expect, it } from 'vitest';
import { DOOMED_TIERS, MAP_DROPS, MAP_TIERS, mapId, mapZoneId } from '../src/data/maps';
import { zoneDef } from '../src/data/zones';
import { onMapBossKill, passTrial } from '../src/engine/ascendancy';
import { bossIsNext, damageMonster, makeMonster } from '../src/engine/combat';
import { makeCtx, type Ctx } from '../src/engine/context';
import type { ClassId } from '../src/data/classes';
import {
  addDoomedMaps,
  addMaps,
  allocateAtlasNode,
  applySextant,
  atlasPointsEarned,
  atlasPointsLeft,
  devKit,
  doomedHeld,
  grantMaps,
  mapsHeld,
  mapStep,
  onMapFieldLost,
  refundAtlas,
  rollMapDrops,
  sextantSlots,
  startAutoRun,
  startDoomedMap,
  startMap,
  topUpKingMaps,
  totalMapsHeld,
} from '../src/engine/maps';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame, tick } from '../src/engine/state';
import type { GameState } from '../src/engine/types';

const ctx = (seed = 1): Ctx => ({ rng: seeded(seed), now: 0, emit: () => {} });

describe('maps', () => {
  it('uses up a plain map per run, needs one to start, and migrates legacy themed map stock', () => {
    const s = newGame(1);
    expect(startMap(s, ctx(), 1)).toBeTruthy();
    s.maps.stock = { map_barrows_t1: 1, map_stormvault_t1: 1 };
    expect(mapsHeld(s, 1)).toBe(2);
    expect(s.account.maps?.[mapId(1)]).toBe(2);
    expect(startMap(s, ctx(), 1, 'mudflats')).toBeNull();
    expect(mapsHeld(s, 1)).toBe(1);
    expect(s.combat?.zoneId).toBe(mapZoneId(1, 'mudflats'));
  });

  it('shares map supply across characters on the same realm account', () => {
    const first = newGame(1, { name: 'A', classId: 'warrior' });
    addMaps(first, 3, 4);
    const second = newGame(2, { name: 'B', classId: 'mage' }, first.account);
    expect(mapsHeld(second, 3)).toBe(4);
    expect(startMap(second, ctx(), 3)).toBeNull();
    expect(mapsHeld(first, 3)).toBe(3);
  });

  it('tops up the realm map supply to 5 when the Last King is beaten with fewer held', () => {
    const s = newGame(1);
    addMaps(s, 1, 2);
    expect(totalMapsHeld(s)).toBe(2);
    expect(topUpKingMaps(s, ctx())).toBe(3);
    expect(totalMapsHeld(s)).toBe(MAP_DROPS.kingTopUp);
    expect(topUpKingMaps(s, ctx())).toBe(0);
  });

  it('gives a 50% Tier 1 map drop chance on the first kill of a level 60+ campaign boss', () => {
    let firstBossMaps = 0;
    let repeatBossMaps = 0;
    const boss = makeMonster({ ...zoneDef('kingsmint').boss, level: 60 }, true);
    for (let i = 1; i <= 300; i++) {
      const s1 = newGame(i);
      s1.combat = { zoneId: 'kingsmint' } as GameState['combat'];
      rollMapDrops(s1, ctx(i), boss);
      firstBossMaps += mapsHeld(s1, 1);

      const s2 = newGame(i);
      s2.combat = { zoneId: 'kingsmint' } as GameState['combat'];
      s2.bossesDefeated.push('kingsmint');
      rollMapDrops(s2, ctx(i), boss);
      repeatBossMaps += mapsHeld(s2, 1);
    }
    expect(firstBossMaps).toBeGreaterThan(repeatBossMaps * 2);
  });

  it('brings the boss after the packs, and auto-run opens maps until none are left', () => {
    const s = newGame(1);
    const c = ctx();
    addMaps(s, 1, 2);
    startAutoRun(s, c, 1);
    s.maps.run!.packsLeft = 0;
    expect(bossIsNext(s, s.maps.run!.zoneId)).toBe(true);
    s.maps.run!.bossDown = true;
    mapStep(s, c);
    expect(s.maps.tally.runs).toBe(1);
    expect(mapsHeld(s, 1)).toBe(0);
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
    startAutoRun(s, c, 1);
    s.combat = null;
    mapStep(s, c);
    expect(s.maps.run).toBeNull();
    expect(s.maps.auto).toBeNull();
  });

  it('survives a save, and drops a run of a removed map', () => {
    const s = newGame(1);
    grantMaps(s, 1);
    startMap(s, ctx(), 1, 'mudflats');
    expect(deserialize(serialize(s)).maps.run?.areaId).toBe('mudflats');
    s.maps.run!.theme = 'gone';
    const back = deserialize(serialize(s));
    expect(back.maps.run).toBeNull();
    expect(back.combat).toBeNull();
  });

  it('makes the first Tier 5 boss the fourth and final ascendancy trial', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    const c = ctx();
    passTrial(s, c, 1);
    passTrial(s, c, 2);
    passTrial(s, c, 3);
    expect(s.ascendancy.points).toBe(7);
    onMapBossKill(s, c, 4);
    expect(s.ascendancy.points).toBe(7);
    onMapBossKill(s, c, 5);
    expect(s.ascendancy).toMatchObject({ trials: 4, points: 9 });
    onMapBossKill(s, c, 5);
    expect(s.ascendancy.points).toBe(9);
  });

  it('applies permanent tier-group danger identities (Elite packs, Twin boss shared Life, Enraged)', () => {
    const s = newGame(1);
    const c = ctx();
    addMaps(s, 3, 1);
    startMap(s, c, 3, 'mudflats');
    expect(s.maps.run?.elitePacks).toHaveLength(2);

    // Tier 5: Twin boss spawns a lieutenant sharing its Life pool
    const s5 = newGame(2);
    addMaps(s5, 5, 1);
    startMap(s5, c, 5, 'mudflats');
    s5.maps.run!.packsLeft = 0;
    s5.combat!.spawnMs = 50;
    tick(s5, c, 100);
    const boss = s5.combat!.monsters.find((m) => m.isBoss)!;
    const lt = s5.combat!.monsters.find((m) => m.isTwin)!;
    expect(boss).toBeDefined();
    expect(lt).toBeDefined();
    expect(lt.life).toBe(boss.life);
    damageMonster(s5, boss, 500, true);
    expect(lt.life).toBe(boss.life);

    // Tier 9: all monsters start permanently enraged
    const s9 = newGame(3);
    addMaps(s9, 9, 1);
    startMap(s9, c, 9, 'mudflats');
    s9.combat!.spawnMs = 50;
    tick(s9, c, 100);
    expect(s9.combat!.monsters.length).toBeGreaterThan(0);
    expect(s9.combat!.monsters.every((m) => m.enraged && m.permEnrage)).toBe(true);
  });

  it('rolls Sextants onto Map Device slots, consumes 1 charge per run, and awards Atlas points', () => {
    const s = newGame(1);
    const c = ctx();
    expect(sextantSlots(s)).toBe(1);
    s.account.bank.sextant_apprentice = 2;
    expect(applySextant(s, c, 0, 'sextant_apprentice')).toBeNull();
    expect(s.account.sextants?.[0]?.charges).toBe(6);

    addMaps(s, 1, 1);
    startMap(s, c, 1, 'mudflats');
    expect(s.maps.run?.slottedFull).toBe(true);
    expect(s.account.sextants?.[0]?.charges).toBe(5);

    // Finish the map deathless with all unlocked Sextant slots filled -> +3 Atlas points
    s.maps.run!.bossDown = true;
    mapStep(s, c);
    expect(atlasPointsEarned(s)).toBe(3);
    expect(atlasPointsLeft(s)).toBe(3);
    expect(allocateAtlasNode(s, 'sustain_1')).toBeNull();
    expect(atlasPointsLeft(s)).toBe(2);
    expect(refundAtlas(s)).toBeNull();
    expect(atlasPointsLeft(s)).toBe(3);
  });

  it('Unbroken Path refunds a map when you die in it', () => {
    const s = newGame(1);
    const c = ctx();
    s.account.atlas = { cleared: [1, 2, 3, 4], slotted: [], deathless: [], nodes: ['peril_1', 'peril_2', 'peril_3', 'peril_notable'] };
    addMaps(s, 2, 1);
    startMap(s, c, 2, 'mudflats');
    expect(mapsHeld(s, 2)).toBe(0);
    // Simulate dying in the map
    s.lifetime.deaths += 1;
    s.combat = null;
    mapStep(s, c);
    expect(mapsHeld(s, 2)).toBe(1);
  });

  it('opens Doomed Maps with rolled modifiers and drops Uber Keys on boss kills', () => {
    const s = newGame(1);
    const c = ctx();
    addDoomedMaps(s, 5, 1);
    expect(doomedHeld(s, 5)).toBe(1);
    expect(startDoomedMap(s, c, 5)).toBeNull();
    expect(doomedHeld(s, 5)).toBe(0);
    expect(s.maps.run?.doomedTier).toBe(5);
    expect(s.maps.run?.doomedMods).toHaveLength(DOOMED_TIERS[4].modCount[0]);

    let keys = 0;
    const boss = makeMonster({ ...zoneDef('shatteredthrone').boss, level: 95 }, true);
    for (let i = 1; i <= 100; i++) {
      rollMapDrops(s, ctx(i), boss);
    }
    keys = (s.account.bank.uber_key_1 ?? 0) + (s.account.bank.uber_key_2 ?? 0) + (s.account.bank.uber_key_3 ?? 0);
    expect(keys).toBeGreaterThan(10);
    expect(s.account.bank.fractured_orb ?? 0).toBeGreaterThan(5);
  });
});

describe('maps offline', { timeout: 60_000 }, () => {
  const kitted = (classId: ClassId = 'warrior', seed = 1) => {
    const s = newGame(seed, { name: 'T', classId });
    s.tutorial.done = true;
    // the Map Device's dev kit margin: no passives spent, so it sits well above the tier
    devKit(s, makeCtx(seeded(seed)), MAP_TIERS[0].level + 14);
    // Offline map runners still need Instilling Orbs now that recovery flasks are manual by default.
    s.flaskSlots[0]!.instill = 'lowLife';
    s.flaskSlots[1]!.instill = 'lowMana';
    return s;
  };

  it('has baseline wind-up rules and never parks at a map boss', () => {
    const s = kitted();
    const c = makeCtx(seeded(2));
    grantMaps(s, 3);
    startAutoRun(s, c, 1);
    const sum = simulateOffline(s, c, 3_600_000);
    expect(s.lifetime.deaths + s.lifetime.bossKills).toBeGreaterThan(0);
    expect(sum.bossWaiting).toBeNull();
    expect(s.maps.tally.runs).toBeGreaterThan(0);
  });

  it('with wind-up rules, runs maps until they are gone', () => {
    const s = kitted();
    s.account.automation.rules.push('windups');
    const c = makeCtx(seeded(3));
    s.maps.stock = { [mapId(1)]: 3 };
    startAutoRun(s, c, 1);
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
    startAutoRun(s, c, 1);
    const sum = simulateOffline(s, c, 3_600_000);
    expect(sum.died).toBe(true);
    expect(s.combat).toBeNull();
    expect(s.maps.run).toBeNull();
    expect(s.maps.auto).toBeNull();
    expect(mapsHeld(s, 1)).toBe(2);
  });

  it('is playable: a kitted character clears most maps', { timeout: 120_000 }, () => {
    let wins = 0;
    for (const classId of ['warrior', 'mage', 'ranger'] as ClassId[]) {
      for (let seed = 1; seed <= 4; seed++) {
        const s = kitted(classId, seed);
        s.account.automation.rules.push('windups');
        const c = makeCtx(seeded(seed + 10));
        s.maps.stock = { [mapId(1)]: 1 };
        startMap(s, c, 1);
        simulateOffline(s, c, 3_600_000);
        wins += s.maps.tally.runs;
      }
    }
    expect(wins).toBeGreaterThanOrEqual(7);
  });

  it('a whole field shaken off by fleeing sends a pack back', () => {
    const s = kitted();
    grantMaps(s, 1);
    startMap(s, ctx(), 1);
    s.maps.run!.packsLeft = 2;
    onMapFieldLost(s);
    expect(s.maps.run!.packsLeft).toBe(3);
  });
});
