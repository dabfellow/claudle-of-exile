import { describe, expect, it } from 'vitest';
import { COOKING_GATE, INGREDIENTS, MEAL_MS, MEALS } from '../src/data/cooking';
import { FLASKS, flaskDef } from '../src/data/flasks';
import { materialDef } from '../src/data/materials';
import { actionDef, actionsFor, SKILLS } from '../src/data/skills';
import { SKILL_TREE_NODES } from '../src/data/skillTree';
import { startCombat } from '../src/engine/combat';
import type { Ctx } from '../src/engine/context';
import { cookingOpen, eatMeal, mealLength, mealReason, mealStats, mealStep } from '../src/engine/cooking';
import { rollFlask } from '../src/engine/flasks';
import { hasMinigame } from '../src/engine/minigame';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { skillTreePoints } from '../src/engine/skillTree';
import { newGame, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';
import { veteran } from './helpers';

const ctx = (): Ctx => ({ rng: seeded(7), emit: () => {}, now: 0 });

function act5(): GameState {
  const s = veteran(newGame(1));
  s.unlockedZones.push(COOKING_GATE.zone);
  return s;
}

function give(s: GameState, inputs: Record<string, number>, times = 1): void {
  for (const [id, n] of Object.entries(inputs)) s.account.bank[id] = (s.account.bank[id] ?? 0) + n * times;
}

const PORRIDGE = 'meal_porridge';

describe('the skill', () => {
  it('is a production skill with a mini-game, a tree branch and tree points', () => {
    expect(SKILLS.cooking.group).toBe('production');
    expect(hasMinigame('cooking')).toBe(true);
    expect(SKILL_TREE_NODES.filter((n) => n.branch === 'cooking')).toHaveLength(6);
    const s = newGame(1);
    const before = skillTreePoints(s);
    s.skills.cooking = xpForLevel(60);
    expect(skillTreePoints(s)).toBeGreaterThan(before);
  });

  it('is shut until Blackharbor, however high the skill', () => {
    const s = veteran(newGame(1));
    s.skills.cooking = xpForLevel(60);
    expect(cookingOpen(s)).toBe(false);
    for (const a of actionsFor('cooking')) {
      expect(a.gate).toBe(COOKING_GATE);
      expect(actionBlocker(s, a)).toBe('Reach Act 5 to unlock');
    }
    expect(actionBlocker(s, actionDef('brew_life_sacred'))).toBe('Reach Act 5 to unlock');
    s.unlockedZones.push('blackharbor');
    expect(cookingOpen(s)).toBe(true);
  });

  it('cooks only what can be gathered, and never a fish', () => {
    const plants = new Set(['herb', 'log', 'essence']);
    for (const a of actionsFor('cooking')) {
      expect(Object.keys(a.inputs!).filter((id) => !plants.has(materialDef(id).kind))).toEqual([]);
    }
  });

  it('has a recipe for every meal and ingredient', () => {
    const made = new Set(actionsFor('cooking').flatMap((a) => Object.keys(a.outputs!)));
    expect([...MEALS, ...INGREDIENTS].filter((m) => !made.has(m.id))).toEqual([]);
  });
});

describe('recipes', () => {
  it('turns plants into a dish, with XP', () => {
    const s = act5();
    const a = actionDef(`cook_${PORRIDGE}`);
    give(s, a.inputs!);
    expect(startSkillAction(s, ctx(), a.id)).toBeNull();
    skillStep(s, ctx(), actionIntervalMs(s, a, deriveStats(s)), deriveStats(s));
    expect(s.account.bank[PORRIDGE]).toBe(1);
    expect(s.account.bank.sunpetal).toBe(0);
    expect(s.skills.cooking).toBeGreaterThan(0);
  });

  it('Second Helping cooks two for one', () => {
    const s = act5();
    s.skillPassives.push('cooking_n0');
    const a = actionDef(`cook_${PORRIDGE}`);
    give(s, a.inputs!, 200);
    startSkillAction(s, ctx(), a.id);
    const c = ctx();
    const d = deriveStats(s);
    skillStep(s, c, actionIntervalMs(s, a, d) * 200, d);
    expect(s.account.bank[PORRIDGE]).toBeGreaterThan(200);
  });

  it('Head Chef slows Cooking and strengthens meals', () => {
    const s = act5();
    const a = actionDef(`cook_${PORRIDGE}`);
    const d = deriveStats(s);
    const slow = actionIntervalMs(s, a, d);
    s.account.bank[PORRIDGE] = 1;
    eatMeal(s, ctx(), PORRIDGE);
    const plain = mealStats(s).lifePct!;
    s.skillPassives.push('cooking_ks');
    expect(actionIntervalMs(s, a, deriveStats(s))).toBeCloseTo(slow * 1.25);
    expect(mealStats(s).lifePct).toBeCloseTo(plain * 1.3);
  });

  it('feeds Alchemy flasks that only a brew can make', () => {
    const s = act5();
    s.skills.alchemy = xpForLevel(60);
    s.account.hideout.alchemy_table = 3;
    const made = ['mana_sacred', 'life_sacred', 'sulphur'];
    for (const flaskId of made) {
      const a = actionsFor('alchemy').find((x) => x.flaskId === flaskId)!;
      expect(Object.keys(a.inputs!).some((id) => materialDef(id).kind === 'ingredient')).toBe(true);
      expect(actionBlocker(s, a)).toBe('Missing materials');
      give(s, a.inputs!);
      expect(actionBlocker(s, a)).toBeNull();
      startSkillAction(s, ctx(), a.id);
      const d = deriveStats(s);
      skillStep(s, ctx(), actionIntervalMs(s, a, d), d);
      expect(s.account.flaskStash.some((f) => f.flaskId === flaskId)).toBe(true);
    }
    expect(flaskDef('life_sacred').heal).toBeGreaterThan(flaskDef('life_grand').heal!);
    const rng = seeded(3);
    for (let i = 0; i < 300; i++) expect(made).not.toContain(rollFlask(s, 100, rng).flaskId);
    expect(FLASKS.filter((f) => f.dropLevel === Infinity).map((f) => f.id).sort()).toEqual([...made].sort());
  });
});

describe('meals', () => {
  it('gives its stats from the moment you eat, in or out of a fight', () => {
    const s = act5();
    const before = deriveStats(s).maxLife;
    s.account.bank[PORRIDGE] = 1;
    expect(eatMeal(s, ctx(), PORRIDGE)).toBeNull();
    expect(s.account.bank[PORRIDGE]).toBe(0);
    expect(s.lifetime.mealsEaten).toBe(1);
    expect(deriveStats(s).maxLife).toBeGreaterThan(before);
  });

  it('only one meal at a time: a new dish replaces it, and the same dish is refused', () => {
    const s = act5();
    s.account.bank[PORRIDGE] = 2;
    s.account.bank.meal_broth = 1;
    eatMeal(s, ctx(), PORRIDGE);
    expect(mealReason(s, PORRIDGE)).toBe('You are already full of that');
    expect(eatMeal(s, ctx(), PORRIDGE)).not.toBeNull();
    expect(s.account.bank[PORRIDGE]).toBe(1);
    eatMeal(s, ctx(), 'meal_broth');
    expect(s.meal?.id).toBe('meal_broth');
    expect(mealStats(s).lifePct).toBeUndefined();
  });

  it('waits while you do anything but fight', () => {
    const s = act5();
    s.account.bank[PORRIDGE] = 1;
    eatMeal(s, ctx(), PORRIDGE);
    tick(s, ctx(), 60_000);
    expect(s.meal?.remainingMs).toBe(MEAL_MS);
    expect(simulateOffline(s, ctx(), 3_600_000).ms).toBeGreaterThan(0);
    expect(s.meal?.remainingMs).toBe(MEAL_MS);
  });

  it('runs down in a fight and wears off', () => {
    const s = act5();
    s.keepEating = false;
    s.account.bank[PORRIDGE] = 3;
    eatMeal(s, ctx(), PORRIDGE);
    startCombat(s, ctx(), 'mudflats');
    tick(s, ctx(), 1000);
    expect(s.meal!.remainingMs).toBe(MEAL_MS - 1000);
    mealStep(s, ctx(), MEAL_MS);
    expect(s.meal).toBeNull();
    expect(s.account.bank[PORRIDGE]).toBe(2);
  });

  it('Keep eating serves the next one, with no time lost, until the bank is empty', () => {
    const s = act5();
    s.account.bank[PORRIDGE] = 2;
    eatMeal(s, ctx(), PORRIDGE);
    mealStep(s, ctx(), MEAL_MS + 500);
    expect(s.meal).toEqual({ id: PORRIDGE, remainingMs: MEAL_MS - 500 });
    expect(s.account.bank[PORRIDGE]).toBe(0);
    expect(s.lifetime.mealsEaten).toBe(2);
    mealStep(s, ctx(), MEAL_MS);
    expect(s.meal).toBeNull();
  });

  it('a night of fighting is fed the same as a day online', () => {
    const s = act5();
    s.account.bank[PORRIDGE] = 4;
    eatMeal(s, ctx(), PORRIDGE);
    startCombat(s, ctx(), 'mudflats');
    const sum = simulateOffline(s, ctx(), 45 * 60 * 1000);
    expect(sum.died).toBe(false);
    expect(s.account.bank[PORRIDGE]).toBe(2);
    expect(sum.materials[PORRIDGE]).toBe(-1);
    expect(s.meal?.id).toBe(PORRIDGE);
  }, 20_000);

  it('Slow Simmer lengthens them', () => {
    const s = act5();
    s.skillPassives.push('cooking_n1');
    expect(mealLength(s)).toBe(MEAL_MS * 1.25);
  });
});

describe('saves', () => {
  it('needs no migration: older saves load unfed, at level 1', () => {
    const raw = JSON.parse(serialize(newGame(1)));
    delete raw.skills.cooking;
    delete raw.meal;
    delete raw.keepEating;
    delete raw.lifetime.mealsEaten;
    const s = deserialize(JSON.stringify(raw));
    expect(s.skills.cooking).toBe(0);
    expect(s.meal).toBeNull();
    expect(s.keepEating).toBe(true);
    expect(s.lifetime.mealsEaten).toBe(0);
  });

  it('keeps your meal', () => {
    const s = act5();
    s.account.bank[PORRIDGE] = 1;
    eatMeal(s, ctx(), PORRIDGE);
    expect(deserialize(serialize(s)).meal).toEqual(s.meal);
  });
});
