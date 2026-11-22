import { describe, expect, it } from 'vitest';
import { actionDef } from '../src/data/skills';
import { barPurityBonus, masterAlloyFor, recipeStock, resolveBarCost } from '../src/data/smelting';
import { makeCtx } from '../src/engine/context';
import { bellowsResult } from '../src/engine/minigame';
import { simulateOffline } from '../src/engine/offline';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { masteryThreshold } from '../src/engine/skillingMastery';
import {
  bellowsBandWidth, finishSmelt, furnacePartUpgrade, improveFurnacePart, initialSmelting, purityOdds,
  purityScore, smeltingCost, smeltingInterval,
} from '../src/engine/smelting';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { xpForLevel } from '../src/engine/xp';

const ctx = (value = 0.5) => makeCtx({ next: () => value });

describe('furnace bar grades', () => {
  it('uses the documented purity distributions across the full score range', () => {
    expect(purityOdds(0)).toEqual({ crude: 40, refined: 60, pure: 0, flawless: 0 });
    expect(purityOdds(8)).toEqual({ crude: 5, refined: 71 - 64 / 12, pure: 24, flawless: 64 / 12 });
    expect(purityOdds(14)).toEqual({ crude: 5, refined: 40, pure: 40, flawless: 15 });
    for (let p = 0; p <= 14; p++) {
      expect(Object.values(purityOdds(p)).reduce((sum, chance) => sum + chance, 0)).toBeCloseTo(100);
    }
  });

  it('spends flexible bars by preference and preserves grades also required explicitly', () => {
    const bank = { copper_bar_crude: 2, copper_bar: 1, copper_bar_pure: 4, copper_bar_flawless: 2 };
    const cost = { copper_bar: 4, copper_bar_flawless: 2 };
    expect(recipeStock(bank, 'copper_bar')).toBe(9);
    expect(resolveBarCost(bank, cost)).toEqual({ copper_bar_crude: 2, copper_bar: 1, copper_bar_pure: 1, copper_bar_flawless: 2 });
    expect(resolveBarCost(bank, cost, 'pure')).toEqual({ copper_bar_pure: 4, copper_bar_flawless: 2 });
    expect(resolveBarCost(bank, { copper_bar_flawless: 3 })).toBeNull();
    expect(resolveBarCost(bank, { copper_bar: 8, copper_bar_flawless: 2 })).toBeNull();
    expect(barPurityBonus({ copper_bar_crude: 1, copper_bar: 1, iron_bar_pure: 1, iron_bar_flawless: 1, ash_plank: 6 })).toBe(0.5);
  });

  it('charges one fuel and flux every five paid bars and keeps unused charges when swapping back', () => {
    const s = newGame(1);
    const a = actionDef('smelt_copper');
    s.storage.bank = { charcoal: 2, crushed_stone: 2, coke: 1 };
    s.smelting.fuel = 'charcoal';
    s.smelting.flux = 'crushed_stone';
    const c = ctx();
    for (let i = 0; i < 3; i++) finishSmelt(s, c, a, 1, false);
    expect(s.smelting.charges).toEqual({ charcoal: 2, crushed_stone: 2 });
    s.smelting.fuel = 'coke';
    expect(purityScore(s)).toBe(3);
    finishSmelt(s, c, a, 1, false);
    s.smelting.fuel = 'charcoal';
    finishSmelt(s, c, a, 1, true);
    expect(s.storage.bank).toMatchObject({ charcoal: 1, crushed_stone: 1, coke: 0 });
    expect(s.smelting.charges).toEqual({ charcoal: 1, crushed_stone: 0, coke: 4 });
    expect(recipeStock(s.storage.bank, 'copper_bar')).toBe(6);
  });

  it('keeps the purity and grade of an active bonus copy', () => {
    const s = newGame(1);
    s.skills.smelting = xpForLevel(80);
    s.smelting.parts.flue = 4;
    const a = actionDef('smelt_iron');
    expect(finishSmelt(s, ctx(0), a, 1, true)).toEqual({ iron_bar_crude: 2, living_metal: 1 });
    const offline = { ...ctx(0.999), offline: true };
    expect(finishSmelt(s, offline, a, 1, true)).toEqual({ iron_bar_flawless: 1 });
    expect(s.smelting.stats).toEqual({ flawless: 1, living: 1 });
  });
});

describe('furnace upgrades and recipes', () => {
  it('checks level and uses available bar grades to upgrade a part', () => {
    const s = newGame(1);
    s.storage.bank.iron_bar_pure = 50;
    expect(furnacePartUpgrade(s, 'firebrick')?.blocker).toBe('Requires Smelting level 15');
    s.skills.smelting = xpForLevel(15);
    expect(improveFurnacePart(s, 'firebrick')).toBeNull();
    expect(s.storage.bank.iron_bar_pure).toBe(0);
    expect(s.smelting.parts.firebrick).toBe(1);
    const a = actionDef('smelt_iron');
    expect(smeltingInterval(s, a)).toBeCloseTo(0.92);
    s.smelting.parts.crucible = 2;
    s.smelting.parts.flue = 1;
    expect(smeltingInterval(s, a)).toBeCloseTo(0.92 * 1.5 ** 2);
    expect(smeltingCost(s, a, a.inputs!)).toEqual({ iron_ore: 15 });
    expect(purityScore(s)).toBe(1);
    expect(bellowsBandWidth('copper', 0)).toBeCloseTo(0.25);
    expect(bellowsBandWidth('world', 1)).toBeCloseTo(0.12 * 1.10);
  });

  it('accepts mixed logs and any Mining fossil and previews the exact charge', () => {
    const s = newGame(1);
    s.storage.bank.ash_log = 2;
    s.storage.bank.oak_log = 3;
    s.storage.bank.frigid_fossil = 1;
    const logs = actionDef('furnace_charcoal_logs');
    const bone = actionDef('furnace_bone_ash');
    expect(smeltingCost(s, logs, logs.inputs!)).toEqual({ ash_log: 2, oak_log: 3 });
    expect(smeltingCost(s, bone, bone.inputs!)).toEqual({ frigid_fossil: 1 });
  });

  it('requires two top parts and exact Flawless bars and makes a tagged living alloy', () => {
    const s = newGame(1);
    const a = actionDef('alloy_master_living_moonsilver');
    s.skills.smelting = xpForLevel(85);
    s.storage.bank = { mithril_bar_pure: 100, star_bar_flawless: 5, living_metal: 1 };
    expect(actionBlocker(s, a)).toBe('Needs two Tier 4 furnace parts');
    s.smelting.parts.firebrick = 4;
    s.smelting.parts.flue = 4;
    expect(actionBlocker(s, a)).toBe('Missing materials');
    s.storage.bank.mithril_bar_flawless = 5;
    const c = ctx();
    expect(startSkillAction(s, c, a.id)).toBeNull();
    const derived = deriveStats(s);
    skillStep(s, c, actionIntervalMs(s, a, derived) + 0.01, derived);
    expect(s.storage.bank).toMatchObject({ living_moonsilver: 1, mithril_bar_pure: 100, living_metal: 0 });
    expect(masterAlloyFor('living_moonsilver')).toEqual({ id: 'moonsilver', living: true });
  });

  it('produces graded bars offline from mastery batches using the same amount of fuel and ore', () => {
    const s = newGame(1);
    const a = actionDef('smelt_copper_x5');
    s.skills.smelting = xpForLevel(30);
    s.skillingMastery['task.smelt_copper'] = masteryThreshold(15);
    s.smelting.fuel = 'charcoal';
    s.smelting.parts.crucible = 1;
    s.storage.bank = { charcoal: 2, copper_ore: a.inputs!.copper_ore + 5 };
    const c = ctx(0.5);
    expect(startSkillAction(s, c, a.id)).toBeNull();
    const elapsed = Math.ceil(actionIntervalMs(s, a, deriveStats(s))) + 1;
    const sum = simulateOffline(s, c, elapsed);
    expect(s.storage.bank).toMatchObject({ copper_ore: 0, copper_bar: 6, charcoal: 0 });
    expect(s.smelting.charges.charcoal).toBe(4);
    expect(sum.ordinaryOutput?.copper_bar).toBe(6);
    expect(sum.smeltingOutputs?.copper_bar).toBe(6);
  });

  it('migrates a pre-furnace character with Refined stacks, proficiency and running work intact', () => {
    const raw = JSON.parse(serialize(newGame(1)));
    raw.version = 55;
    delete raw.smelting;
    raw.storage.bank.copper_bar = 341;
    raw.storage.bank.stone_alloy = 9;
    raw.skillingMastery['task.smelt_copper'] = 225;
    raw.action = { kind: 'skill', actionId: 'smelt_copper', progress: 700 };
    const s = deserialize(JSON.stringify(raw));
    expect(s.smelting).toEqual(initialSmelting());
    expect(s.storage.bank).toMatchObject({ copper_bar: 341, stone_alloy: 9 });
    expect(s.skillingMastery['task.smelt_copper']).toBe(225);
    expect(s.action).toMatchObject({ actionId: 'smelt_copper', progress: 700 });
  });
});

describe('bellows timing', () => {
  it('distinguishes double, hit, weak and miss at the exact boundaries', () => {
    expect(bellowsResult(0.5, 0.5)).toBe('double');
    expect(bellowsResult(0.49, 0.6)).toBe('hit');
    expect(bellowsResult(0, 0.5999)).toBe('weak');
    expect(bellowsResult(0, 0.3)).toBe('weak');
    expect(bellowsResult(0, 0.2999)).toBe('miss');
  });
});
