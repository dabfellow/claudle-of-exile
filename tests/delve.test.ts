import { describe, expect, it } from 'vitest';
import { actionDef } from '../src/data/skills';
import { makeCtx } from '../src/engine/context';
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
    s.delve.layers[2] = { traits: ['unstable'], secure: 0 };
    expect(startDelve(s, noRoll(), 'push')).toBeNull();
    const cavernRoll = [0, 0, 0, 0.99];
    completeDelve(s, makeCtx({ next: () => cavernRoll.shift() ?? 0.99 }));
    expect(s.storage.bank.rough_gem_giant).toBe(1);
  });

  it('turns rubble into supports, protects an active push on a correct brace, and drops back to work at the depth cap', () => {
    const s = newGame(11);
    const ctx = noRoll();
    expect(startDelve(s, ctx, 'push')).toBe('Needs 1 support');
    expect(startDelve(s, ctx, 'work', 1)).toBeNull();
    for (let cycle = 0; cycle < 5; cycle++) completeDelve(s);
    expect(s.storage.bank.mine_support).toBe(1);
    expect(s.storage.bank.rubble).toBe(0);
    s.storage.bank.mine_support = 3;
    s.delve.layers[2] = { traits: [], secure: 0 };
    s.delve.layers[3] = { traits: [], secure: 0 };
    expect(startDelve(s, ctx, 'push')).toBeNull();
    s.delve.warning = { hazard: 'gas', action: 'delve_push', startsAt: s.clock, layer: 2, timerMs: 3000 };
    expect(braceDelve(s, ctx, 'gas')).toBe('double');
    completeDelve(s, makeCtx({ next: () => 0.99 }));
    expect(s.delve.deepest).toBe(2);
    expect(s.storage.bank.mine_support).toBe(2);
    completeDelve(s, ctx);
    expect(s.delve.deepest).toBe(3);
    expect(s.action).toMatchObject({ actionId: 'delve_work', delveLayer: 3 });
    expect(startDelve(s, ctx, 'work', 1)).toBeNull();
  });

  it.each([
    ['cave-in', 0], ['flood', 0.6], ['gas', 0.9],
  ] as const)('applies %s when uncovered and ignores it within station coverage', (hazard, choose) => {
    for (const covered of [true, false]) {
      const s = newGame(11);
      s.skills.mining = xpForLevel(60);
      s.storage.bank = { mine_support: 5, rubble: 200, copper_ore: 100 };
      s.delve.layers[2] = { traits: [], secure: 0 };
      if (covered) {
        expect(buildDelveInstallation(s, hazard, 1)).toBeNull();
        expect(installationCovers(s.delve, hazard, 51)).toBe(true);
        expect(installationCovers(s.delve, hazard, 52)).toBe(false);
      }
      const rolls = [0, choose];
      const ctx = makeCtx({ next: () => rolls.shift() ?? 0.99 });
      expect(startDelve(s, ctx, 'push')).toBeNull();
      completeDelve(s, ctx);
      expect(s.delve.deepest).toBe(2);
      expect(s.storage.bank.mine_support).toBe(!covered && hazard === 'cave-in' ? 2 : 4);
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

  it('spends one support on a wrong response and secures a worked layer after 200 timely fixes', () => {
    const s = newGame(11);
    const ctx = noRoll();
    s.storage.bank.mine_support = 1;
    expect(startDelve(s, ctx, 'work')).toBeNull();
    s.delve.layers[1].secure = 199;
    const warning = { hazard: 'cave-in' as const, action: 'delve_work', startsAt: 0, layer: 1, timerMs: 3000 };
    s.delve.warning = { ...warning };
    expect(braceDelve(s, ctx, 'flood')).toBe('miss');
    expect(s.storage.bank.mine_support).toBe(0);
    s.delve.warning = { ...warning };
    s.clock = 2000;
    expect(braceDelve(s, ctx, 'cave-in')).toBe('hit');
    expect(s.delve.layers[1].secure).toBe(200);
    expect(delveHazardChance(s.delve, 1, 'work')).toBe(0);
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
    s.delve.layers[134] = { traits: [], secure: 0 };
    s.delve.layers[135] = { traits: ['unstable'], secure: 0 };
    expect(startDelve(s, noRoll(), 'push')).toBeNull();
    const cavern = [0, 0, 0, 0.99, 0];
    completeDelve(s, makeCtx({ next: () => cavern.shift() ?? 0.99 }));
    expect(s.storage.bank.heartstone).toBe(1);

    s.delve.deepest = 299;
    s.delve.layers[299] = { traits: [], secure: 0 };
    s.delve.layers[300] = { traits: ['motherlode'], secure: 0 };
    s.delve.layers[301] = { traits: [], secure: 0 };
    completeDelve(s);
    expect(s.delve.landmarkPending).toBe(true);
    expect(s.delve.log).toContain('Discovered the Worldroot Chamber.');
    expect(s.delve.stats.motherlodes).toBe(1);
    completeDelve(s);
    expect(s.delve.deepest).toBe(301);
  });

  it('replays offline breakthrough events without gaining Focus or losing reached layers', () => {
    const s = newGame(11);
    s.storage.bank.mine_support = 3;
    s.delve.layers[2] = { traits: [], secure: 0 };
    s.delve.layers[3] = { traits: [], secure: 0 };
    expect(startDelve(s, noRoll(), 'push')).toBeNull();
    if (s.action?.kind === 'skill') { s.action.focus = 1; s.action.double = true; }
    simulateOffline(s, noRoll(), 100000);
    expect(s.delve.replay).toEqual([
      { layer: 2, text: 'Broke through to layer 2.', fromDepth: 1, revealedDepth: 2 },
      { layer: 3, text: 'Broke through to layer 3.', fromDepth: 2, revealedDepth: 3 },
    ]);
    const loaded = deserialize(serialize(s));
    expect(loaded.delve.deepest).toBe(3);
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
    expect(raw.delve).toMatchObject({ deepest: 180, autoBrace: true, pickTier: 0 });
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
