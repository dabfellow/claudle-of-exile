import { describe, expect, it } from 'vitest';
import { actionDef } from '../src/data/skills';
import { makeCtx } from '../src/engine/context';
import { focusOf } from '../src/engine/minigame';
import {
  braceDelve, buildDelveInstallation, delveActionSpec, delveDepthCap, delveGasPaused, delveHazardChance,
  delvePickBlocker, delvePickCost, delvePushCost, delvePushTime, delveStep, installationCovers, migrateDelve,
  rollDelveRough, rollDelveTraits, startDelve, upgradeDelvePick,
} from '../src/engine/delve';
import { simulateOffline } from '../src/engine/offline';
import { startProject } from '../src/engine/professions';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionIntervalMs } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';

const noRoll = () => makeCtx({ next: () => 0.99 });

function completeDelve(s: GameState, ctx = noRoll()) {
  if (s.action?.kind !== 'skill') throw new Error('A Delve action must be running');
  const stats = deriveStats(s);
  const interval = actionIntervalMs(s, actionDef(s.action.actionId), stats);
  s.clock += interval;
  delveStep(s, ctx, interval, stats);
}

describe('Mining Delve', () => {
  it('caps depth by skill until level 99 and applies the pick perks to push costs and times', () => {
    expect(delveDepthCap(1)).toBe(3);
    expect(delveDepthCap(62)).toBe(186);
    expect(delveDepthCap(98)).toBe(294);
    expect(delveDepthCap(99)).toBe(Infinity);
    expect(delvePushCost(49, 0)).toBe(1);
    expect(delvePushCost(50, 0)).toBe(2);
    expect(delvePushCost(50, 4)).toBe(1);
    expect(delvePushCost(300, 4)).toBe(6);
    expect(delvePushTime(100, 0)).toBe(80000);
    expect(delvePushTime(100, 7)).toBe(60000);
  });

  it('limits the traits to two, with Motherlodes only at deeper eligible layers', () => {
    expect(rollDelveTraits({ next: () => 0 }, 150)).toEqual(['rich', 'crystal']);
    const justMotherlode = (next: number) => {
      const rolls = [0.99, 0.99, 0.99, 0.99, 0.99, 0];
      return rollDelveTraits({ next: () => rolls.shift()! }, next);
    };
    expect(justMotherlode(19)).toEqual([]);
    expect(justMotherlode(20)).toEqual(['motherlode']);
  });

  it('awards larger rough from crystal seams and Motherlodes, with giant rough reserved for caverns', () => {
    expect(rollDelveRough({ next: () => 0.29 }, [])).toBe('rough_gem_small');
    expect(rollDelveRough({ next: () => 0.30 }, [])).toBe('rough_gem');
    expect(rollDelveRough({ next: () => 0.80 }, [])).toBe('rough_gem_large');
    expect(rollDelveRough({ next: () => 0.98 }, [])).toBe('rough_gem_huge');
    expect(rollDelveRough({ next: () => 0.3 }, ['crystal'])).toBe('rough_gem_large');
    expect(rollDelveRough({ next: () => 0.3 }, ['motherlode'])).toBe('rough_gem_huge');
    expect(rollDelveRough({ next: () => 0.99 }, ['motherlode'])).toBe('rough_gem_huge');
    expect(rollDelveRough({ next: () => 0.99 }, ['unstable'], true)).toBe('rough_gem_giant');
    const s = newGame(11);
    s.delve.layers[1].traits = ['crystal'];
    expect(startDelve(s, noRoll(), 'work')).toBeNull();
    const crystalRoll = [0, 0.4];
    completeDelve(s, makeCtx({ next: () => crystalRoll.shift() ?? 0.99 }));
    expect(s.storage.bank.rough_gem_large).toBe(1);

    s.storage.bank.mine_support = 3;
    s.delve.layers[2] = { traits: ['unstable'], mastery: 1 };
    expect(startDelve(s, noRoll(), 'push')).toBeNull();
    const cavernRoll = [0, 0, 0, 0.99];
    completeDelve(s, makeCtx({ next: () => cavernRoll.shift() ?? 0.99 }));
    expect(s.storage.bank.rough_gem_giant).toBe(1);
  });

  it('spends rubble on each breakthrough, protects a braced push and stops at the depth cap', () => {
    const s = newGame(11);
    const ctx = noRoll();
    expect(startDelve(s, ctx, 'push')).toBe('Needs 5 rubble');
    expect(startDelve(s, ctx, 'work', 1)).toBeNull();
    for (let cycle = 0; cycle < 5; cycle++) completeDelve(s);
    expect(s.storage.bank.mine_support).toBeUndefined();
    expect(s.storage.bank.rubble).toBe(15);
    expect(s.delve.layers[1].mastery).toBe(6);
    s.delve.layers[2] = { traits: [], mastery: 1 };
    s.delve.layers[3] = { traits: [], mastery: 1 };
    expect(startDelve(s, ctx, 'push')).toBeNull();
    expect(s.storage.bank.rubble).toBe(15);
    s.delve.warning = { hazard: 'gas', action: 'delve_push', startsAt: s.clock, layer: 2, timerMs: 3000 };
    expect(braceDelve(s, ctx, 'gas')).toBe('double');
    completeDelve(s, makeCtx({ next: () => 0.99 }));
    expect(s.delve.deepest).toBe(2);
    expect(s.storage.bank.rubble).toBe(10);
    completeDelve(s, ctx);
    expect(s.delve.deepest).toBe(3);
    expect(Object.values(s.delve.layers).map((layer) => layer.mastery)).toEqual([6, 1, 1]);
    expect(s.storage.bank.rubble).toBe(5);
    expect(s.action).toMatchObject({ actionId: 'delve_work', delveLayer: 3 });
    expect(startDelve(s, ctx, 'work', 1)).toBeNull();
  });

  it('uses existing supports first and covers the rest at the pick’s rubble rate', () => {
    const s = newGame(11);
    s.skills.mining = xpForLevel(20);
    s.delve.deepest = 49;
    s.delve.pickTier = 1;
    s.delve.layers[49] = { traits: [], mastery: 1 };
    s.storage.bank = { mine_support: 1, rubble: 3 };
    expect(startDelve(s, noRoll(), 'push')).toBe('Needs 4 rubble');
    expect(s.storage.bank).toEqual({ mine_support: 1, rubble: 3 });
    s.storage.bank.rubble = 5;
    expect(startDelve(s, noRoll(), 'push')).toBeNull();
    completeDelve(s);
    expect(s.delve.deepest).toBe(50);
    expect(s.storage.bank.mine_support).toBe(0);
    expect(s.storage.bank.rubble).toBe(1);
    expect(s.action).toMatchObject({ actionId: 'delve_work', delveLayer: 50 });
  });

  it('holds successful braces across work warnings, then lets Focus drain', () => {
    const s = newGame(11);
    const ctx = noRoll();
    expect(startDelve(s, ctx, 'work')).toBeNull();
    const stats = deriveStats(s);
    const advance = (ms: number) => {
      s.clock += ms;
      delveStep(s, ctx, ms, stats);
    };
    for (let hit = 1; hit <= 4; hit++) {
      s.delve.warning = { action: 'delve_work', hazard: 'gas', layer: 1, startsAt: s.clock - 1500, timerMs: 3000 };
      expect(braceDelve(s, ctx, 'gas')).toBe('hit');
      advance(60_000);
      expect(focusOf(s)).toBe(hit / 4);
    }
    advance(6_000);
    expect(focusOf(s)).toBeCloseTo(0.9);
    expect(startDelve(s, ctx, 'work')).toBeNull();
    expect(s.delve.focusHoldUntil).toBeUndefined();
    expect(focusOf(s)).toBe(0);
  });

  it.each([
    ['cave-in', 0, 100], ['flood', 0.6, 50], ['gas', 0.9, 75],
  ] as const)('applies %s when uncovered and unlocks protection at the required Layer Mastery', (hazard, choose, mastery) => {
    for (const covered of [true, false]) {
      const s = newGame(11);
      s.storage.bank = { mine_support: 1, rubble: 215, copper_ore: 100 };
      s.delve.layers[2] = { traits: [], mastery: 1 };
      if (covered) {
        s.delve.layers[1].mastery = mastery - 1;
        expect(buildDelveInstallation(s, hazard, 1)).toBe(`Requires Layer Mastery ${mastery} at this depth`);
        expect(s.storage.bank.rubble).toBe(215);
        expect(startDelve(s, noRoll(), 'work', 1)).toBeNull();
        completeDelve(s);
        expect(s.delve.layers[1].mastery).toBe(mastery);
        expect(buildDelveInstallation(s, hazard, 2)).toBe(`Requires Layer Mastery ${mastery} at this depth`);
        expect(buildDelveInstallation(s, hazard, 1)).toBeNull();
        expect(installationCovers(s.delve, hazard, 51)).toBe(true);
        expect(installationCovers(s.delve, hazard, 52)).toBe(false);
      }
      const rolls = [0, choose];
      const ctx = makeCtx({ next: () => rolls.shift() ?? 0.99 });
      expect(startDelve(s, ctx, 'push')).toBeNull();
      completeDelve(s, ctx);
      expect(s.delve.deepest).toBe(2);
      expect(s.storage.bank.mine_support).toBe(0);
      expect(s.storage.bank.rubble).toBe(covered ? 19 : hazard === 'cave-in' ? 205 : 215);
      expect((s.delve.layers[2].floodedUntil ?? 0) > s.clock).toBe(!covered && hazard === 'flood');
      expect(delveGasPaused(s)).toBe(!covered && hazard === 'gas');
      if (!covered && hazard === 'gas') {
        expect(s.delve.gasLayer).toBe(1);
        expect(delveActionSpec(s, actionDef('delve_push')).intervalMs).toBe(3000);
        s.clock = s.delve.gasUntil!;
        expect(delveActionSpec(s, actionDef('delve_push')).intervalMs).toBeCloseTo(delvePushTime(3, 0));
      }
      if (!covered && hazard === 'flood') {
        expect(delveActionSpec(s, actionDef('delve_push')).intervalMs).toBeCloseTo(delvePushTime(3, 0) * 2);
      }
    }
  });

  it('lets a previously built station keep its coverage and upgrade before reaching the mastery threshold', () => {
    const s = newGame(11);
    s.storage.bank = { rubble: 400, copper_ore: 200 };
    s.delve.installations.push({ type: 'pump', layer: 1, tier: 1 });
    expect(installationCovers(s.delve, 'flood', 51)).toBe(true);
    expect(buildDelveInstallation(s, 'flood', 1)).toBeNull();
    expect(installationCovers(s.delve, 'flood', 76)).toBe(true);
  });

  it('spends one support on a wrong response and leaves mastery unchanged when bracing', () => {
    const s = newGame(11);
    const ctx = noRoll();
    s.storage.bank.mine_support = 1;
    s.storage.bank.rubble = 6;
    expect(startDelve(s, ctx, 'work')).toBeNull();
    const warning = { hazard: 'cave-in' as const, action: 'delve_work', startsAt: 0, layer: 1, timerMs: 3000 };
    s.delve.warning = { ...warning };
    expect(braceDelve(s, ctx, 'flood')).toBe('miss');
    expect(s.storage.bank.mine_support).toBe(0);
    expect(s.storage.bank.rubble).toBe(6);
    s.delve.warning = { ...warning };
    expect(braceDelve(s, ctx, 'flood')).toBe('miss');
    expect(s.storage.bank.rubble).toBe(1);
    s.delve.warning = { ...warning };
    s.clock = 2000;
    expect(braceDelve(s, ctx, 'cave-in')).toBe('hit');
    expect(s.delve.layers[1].mastery).toBe(1);
    expect(delveHazardChance(s.delve, 1, 'work')).toBeGreaterThan(0);
  });

  it('raises only the worked layer while offline and caps mastery with bonus ore and no new hazards', () => {
    const s = newGame(11);
    s.delve.deepest = 2;
    s.delve.layers[2] = { traits: [], mastery: 98 };
    expect(startDelve(s, noRoll(), 'work', 2)).toBeNull();
    simulateOffline(s, noRoll(), 6000);
    expect(s.delve.layers[1].mastery).toBe(1);
    expect(s.delve.layers[2].mastery).toBe(100);
    expect(delveHazardChance(s.delve, 2, 'work')).toBe(0);
    const oreBefore = s.storage.bank.copper_ore;
    completeDelve(s, makeCtx({ next: () => 0.05 }));
    expect(s.storage.bank.copper_ore).toBe(oreBefore + 2);
    expect(s.delve.layers[2].mastery).toBe(100);
    expect(s.delve.log.filter((line) => line === 'Layer 2 reached Mastery 100.')).toHaveLength(1);
  });

  it('carries security over from current live saves and applies the new mastery requirements', () => {
    const raw = JSON.parse(serialize(newGame(11)));
    raw.version = 68;
    raw.delve.deepest = 5;
    raw.delve.layers = Object.fromEntries([0, 29, 60, 199, 200].map((secure, index) => [index + 1, { traits: [], secure }]));
    const loaded = deserialize(JSON.stringify(raw));
    expect(Object.values(loaded.delve.layers).map((layer) => layer.mastery)).toEqual([1, 29, 60, 99, 100]);
    expect(buildDelveInstallation(loaded, 'flood', 2)).toBe('Requires Layer Mastery 50 at this depth');
    expect(buildDelveInstallation(loaded, 'flood', 3)).toBe('Missing materials');
    expect(buildDelveInstallation(loaded, 'cave-in', 4)).toBe('Requires Layer Mastery 100 at this depth');
    expect(buildDelveInstallation(loaded, 'cave-in', 5)).toBe('Missing materials');
    expect(deserialize(serialize(loaded)).delve.layers).toEqual(loaded.delve.layers);
  });

  it.each([
    [1, 0.20, 1],
    [1, 0.50, 2],
    [1, 0.90, 3],
    [24, 0.20, 1],
    [25, 0.20, 2],
    [25, 0.50, 3],
    [25, 0.90, 4],
    [50, 0.90, 4],
    [75, 0.90, 4],
    [100, 0.90, 4],
  ])('at mastery %i with rolls of %f, pays %i rubble', (mastery, roll, rubble) => {
    const s = newGame(11);
    s.delve.layers[1].mastery = mastery;
    const ctx = makeCtx({ next: () => roll });
    expect(startDelve(s, ctx, 'work', 1)).toBeNull();
    completeDelve(s, ctx);
    expect(s.storage.bank.rubble).toBe(rubble);
  });

  it('requires depth and its band metal bars (any grade) to forge the next pick tier', () => {
    expect(delvePickCost(0)).toEqual({ iron_bar: 50 });
    expect(delvePickCost(6)).toEqual({ world_bar: 50, heartstone: 5 });

    const s = newGame(11);
    expect(delvePickBlocker(s)).toBe('Reach layer 45');
    s.delve.deepest = 45;
    expect(delvePickBlocker(s)).toBe('Missing materials');
    s.storage.bank.iron_ore = 50;
    expect(delvePickBlocker(s)).toBe('Missing materials');
    s.storage.bank.iron_bar = 50;
    expect(upgradeDelvePick(s)).toBeNull();
    expect(s.delve.pickTier).toBe(1);
    expect(s.storage.bank.iron_bar).toBe(0);
    expect(delvePickBlocker(s)).toBe('Reach layer 90');

    // Crude, Pure, and Flawless bars also satisfy pick upgrade costs.
    s.delve.deepest = 90;
    s.storage.bank.mithril_bar_crude = 20;
    s.storage.bank.mithril_bar_pure = 15;
    s.storage.bank.mithril_bar_flawless = 15;
    expect(delvePickBlocker(s)).toBeNull();
    expect(upgradeDelvePick(s)).toBeNull();
    expect(s.delve.pickTier).toBe(2);
    expect(s.storage.bank.mithril_bar_crude).toBe(0);
    expect(s.storage.bank.mithril_bar_pure).toBe(0);
    expect(s.storage.bank.mithril_bar_flawless).toBe(0);
    expect(delvePickBlocker(s)).toBe('Reach layer 135');
  });

  it('finds Heartstone in a deep cavern and continues through the Worldroot landmark', () => {
    const s = newGame(11);
    s.skills.mining = xpForLevel(99);
    s.storage.bank.mine_support = 20;
    s.delve.deepest = 134;
    s.delve.layers[134] = { traits: [], mastery: 1 };
    s.delve.layers[135] = { traits: ['unstable'], mastery: 1 };
    expect(startDelve(s, noRoll(), 'push')).toBeNull();
    const cavern = [0, 0, 0, 0.99, 0];
    completeDelve(s, makeCtx({ next: () => cavern.shift() ?? 0.99 }));
    expect(s.storage.bank.heartstone).toBe(1);

    s.delve.deepest = 299;
    s.delve.layers[299] = { traits: [], mastery: 1 };
    s.delve.layers[300] = { traits: ['motherlode'], mastery: 1 };
    s.delve.layers[301] = { traits: [], mastery: 1 };
    completeDelve(s);
    expect(s.delve.landmarkPending).toBe(true);
    expect(s.delve.log).toContain('Discovered the Worldroot Chamber.');
    expect(s.delve.stats.motherlodes).toBe(1);
    completeDelve(s);
    expect(s.delve.deepest).toBe(301);
  });

  it('replays offline breakthrough events without gaining Focus or losing reached layers', () => {
    const s = newGame(11);
    s.storage.bank.rubble = 15;
    s.delve.layers[2] = { traits: [], mastery: 1 };
    s.delve.layers[3] = { traits: [], mastery: 1 };
    expect(startDelve(s, noRoll(), 'push')).toBeNull();
    if (s.action?.kind === 'skill') { s.action.focus = 1; s.action.double = true; }
    simulateOffline(s, noRoll(), 100000);
    expect(s.delve.replay).toEqual([
      { layer: 2, text: 'Broke through to layer 2.', fromDepth: 1, revealedDepth: 2 },
      { layer: 3, text: 'Broke through to layer 3.', fromDepth: 2, revealedDepth: 3 },
    ]);
    const loaded = deserialize(serialize(s));
    expect(loaded.delve.deepest).toBe(3);
    expect(loaded.storage.bank.rubble).toBeGreaterThanOrEqual(5);
    expect(loaded.storage.bank.mine_support).toBeUndefined();
    expect(loaded.action).toMatchObject({ actionId: 'delve_work', delveLayer: 3 });
    expect(loaded.delve.replay).toEqual(s.delve.replay);
  });

  it('migrates level-62 Mining to the Star band with the best old mastery track and an active layer', () => {
    const old = {
      character: { id: 'miner' }, skills: { mining: xpForLevel(62) },
      skillingMastery: { 'task.mine_star': 100, 'task.mine_crystal_star': 250, 'task.mine_frigid': 20 },
      action: { kind: 'skill', actionId: 'mine_fossil_star' },
    };
    const raw: Record<string, unknown> = structuredClone(old);
    migrateDelve(raw);
    expect(raw.delve).toMatchObject({ deepest: 180, pickTier: 0 });
    expect(raw.skillingMastery).toEqual({ 'task.delve_star': 250, 'task.delve_copper': 20 });
    expect(raw.action).toMatchObject({ actionId: 'delve_work', delveLayer: 180 });
    const same: Record<string, unknown> = structuredClone(old);
    migrateDelve(same);
    expect(same).toEqual(raw);
  });

  it('counts completed Delve work toward the existing Prospector’s Pick project', () => {
    const s = newGame(11);
    s.skills.mining = xpForLevel(30);
    s.storage.bank = { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 };
    expect(startDelve(s, noRoll(), 'work')).toBeNull();
    for (let i = 0; i < 100; i++) completeDelve(s);
    expect(s.professionProgress.work.mining).toBe(100);
    expect(startProject(s, makeCtx(seeded(11)), 'tool_mining')).toBeNull();
  });
});
