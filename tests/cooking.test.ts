import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { COOKING_GATE, INGREDIENTS, MEAL_MS, MEALS, mealDef } from '../src/data/cooking';
import { PROFESSION_PROJECTS } from '../src/data/professionProjects';
import { FLASKS, flaskDef } from '../src/data/flasks';
import { materialDef } from '../src/data/materials';
import { actionDef, actionsFor, SKILLS } from '../src/data/skills';
import { SKILL_TREE_NODES } from '../src/data/skillTree';
import { startCombat } from '../src/engine/combat';
import type { Ctx } from '../src/engine/context';
import {
  COOKING_CATEGORIES,
  cookingCategory,
  cookingOpen,
  dishStats,
  eatMeal,
  formatDurationMs,
  isMealClockRunning,
  mealLength,
  mealReason,
  mealStats,
  mealStep,
  mealSupplySupportedMs,
} from '../src/engine/cooking';
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
import { advanceProject, startProject } from '../src/engine/professions';
import { equip } from '../src/engine/equipment';
import { heistJob } from '../src/data/heist';
import { roomMs } from '../src/engine/heist';
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

  it('manufactures independently of Blackharbor', () => {
    const s = veteran(newGame(1));
    s.skills.cooking = xpForLevel(65);
    expect(cookingOpen(s)).toBe(true);
    for (const a of actionsFor('cooking')) {
      expect(a.gate).toBeUndefined();
      expect(actionBlocker(s, a)).toBe('Missing materials');
    }
    expect(actionBlocker(s, actionDef('brew_life_sacred'))).toBe('Requires Alchemy level 46');
    s.unlockedZones.push('blackharbor');
    expect(cookingOpen(s)).toBe(true);
  });

  it('cooks only what can be gathered, and never a fish', () => {
    const plants = new Set(['herb', 'log', 'essence']);
    for (const a of actionsFor('cooking')) {
      expect(Object.keys(a.inputs!).filter((id) => !plants.has(materialDef(id).kind))).toEqual([]);
    }
  });

  it('has a recipe or project for every meal and ingredient', () => {
    const made = new Set([
      ...actionsFor('cooking').flatMap((a) => Object.keys(a.outputs ?? a.protectedOutputs ?? {})),
      ...PROFESSION_PROJECTS.filter((p) => p.skill === 'cooking').flatMap((p) => Object.keys('materials' in p.reward ? p.reward.materials : {})),
    ]);
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
    expect(FLASKS.filter((f) => f.dropLevel === Infinity && !f.unique).map((f) => f.id).sort()).toEqual([...made].sort());
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

describe('Phase 08 Cooking', () => {
  const reload = (s: GameState): GameState => {
    const account = structuredClone(s.account);
    const reloaded = deserialize(serialize(s));
    reloaded.account = account;
    return reloaded;
  };

  it('allows independent entry from Cooking level 1 without campaign combat', () => {
    const fresh = newGame(1);
    expect(cookingOpen(fresh)).toBe(true);
    expect(fresh.skills.cooking).toBe(0);

    const porridge = actionDef('cook_meal_porridge');
    expect(actionBlocker(fresh, porridge)).toBe('Missing materials');
    fresh.account.bank.sunpetal = 3;
    expect(actionBlocker(fresh, porridge)).toBeNull();

    expect(startSkillAction(fresh, ctx(), porridge.id)).toBeNull();
    const d = deriveStats(fresh);
    skillStep(fresh, ctx(), actionIntervalMs(fresh, porridge, d), d);

    expect(fresh.account.bank.meal_porridge).toBe(1);
    expect(fresh.account.bank.sunpetal).toBe(0);
    expect(fresh.skills.cooking).toBeGreaterThan(0);
  });

  it('verifies affordable purpose-grouped meals and updated recipe costs', () => {
    const expectedCosts: Record<string, Record<string, number>> = {
      cook_meal_porridge: { sunpetal: 3 },
      cook_meal_broth: { frostleaf: 2, sunpetal: 2 },
      cook_meal_hash: { frostleaf: 3, sunpetal: 3 },
      cook_meal_chilli: { emberroot: 3, frostleaf: 2 },
      cook_meal_chowder: { emberroot: 4, frostleaf: 2 },
      cook_meal_roast: { emberroot: 5, yew_log: 1 },
      cook_meal_curry: { voidbloom: 3, emberroot: 2 },
      cook_meal_table: { voidbloom: 5, emberroot: 3, sunpetal: 3, yew_log: 1 },
      cook_meal_gatherer: { sunpetal: 4, frostleaf: 2 },
      cook_meal_artisan: { frostleaf: 3, emberroot: 3 },
    };

    for (const [actionId, inputs] of Object.entries(expectedCosts)) {
      const a = actionDef(actionId);
      expect(a.inputs).toEqual(inputs);
    }

    expect(COOKING_CATEGORIES.map((c) => c.id)).toEqual(['survival', 'resources', 'damage', 'gathering', 'production', 'reagents']);
    expect(cookingCategory(actionDef('cook_meal_porridge'))).toBe('survival');
    expect(cookingCategory(actionDef('cook_meal_broth'))).toBe('resources');
    expect(cookingCategory(actionDef('cook_meal_chilli'))).toBe('damage');
    expect(cookingCategory(actionDef('cook_meal_gatherer'))).toBe('gathering');
    expect(cookingCategory(actionDef('cook_meal_artisan'))).toBe('production');
    expect(cookingCategory(actionDef('cook_frost_extract'))).toBe('reagents');
    expect(cookingCategory(actionDef('cook_binding_stock'))).toBe('reagents');
  });

  it('proves skilling meals speed up relevant gathering, heist and production while clock ticks only during relevant work', () => {
    const s = veteran(newGame(1));
    s.account.bank.meal_gatherer = 2;
    s.account.bank.meal_artisan = 2;

    // Test Gatherer's Ration (Mining, Woodcutting, Foraging, Thieving, Archaeology)
    expect(eatMeal(s, ctx(), 'meal_gatherer')).toBeNull();
    expect(s.meal?.id).toBe('meal_gatherer');
    expect(s.meal?.remainingMs).toBe(30 * 60 * 1000);

    const dGatherer = deriveStats(s);
    expect(dGatherer.gatheringSpeed).toBe(5);
    expect(dGatherer.productionSpeed).toBe(0);

    // Gathering action speeds up by 5%
    const mineCopper = actionDef('mine_copper');
    const baseMineInterval = actionIntervalMs(s, mineCopper, { ...dGatherer, gatheringSpeed: 0 } as any);
    const buffedMineInterval = actionIntervalMs(s, mineCopper, dGatherer);
    expect(buffedMineInterval).toBeLessThan(baseMineInterval);
    expect(+(baseMineInterval / buffedMineInterval).toFixed(2)).toBe(1.05);

    // Heist room timer speeds up by 5%
    const job = heistJob('cinder_toll');
    const baseRoom = roomMs(s, job, { ...dGatherer, gatheringSpeed: 0 } as any);
    const buffedRoom = roomMs(s, job, dGatherer);
    expect(buffedRoom).toBeLessThan(baseRoom);
    expect(+(baseRoom / buffedRoom).toFixed(2)).toBe(1.05);

    // Production action does NOT speed up from Gatherer's Ration
    const smithIron = actionDef('smelt_iron');
    expect(actionIntervalMs(s, smithIron, dGatherer)).toBe(actionIntervalMs(s, smithIron, { ...dGatherer, gatheringSpeed: 0 } as any));

    // Clock check: while gathering, meal clock ticks
    startSkillAction(s, ctx(), 'mine_copper');
    expect(isMealClockRunning(s)).toBe(true);
    tick(s, ctx(), 5000);
    expect(s.meal?.remainingMs).toBe(30 * 60 * 1000 - 5000);

    // Clock check: while idling in town or combat, gatherer meal clock DOES NOT tick
    startCombat(s, ctx(), 'mudflats');
    expect(isMealClockRunning(s)).toBe(false);
    const rem = s.meal!.remainingMs;
    tick(s, ctx(), 5000);
    expect(s.meal?.remainingMs).toBe(rem);

    // Switch to Artisan's Lunch: replaces remaining duration with fresh full duration
    s.combat = null;
    expect(eatMeal(s, ctx(), 'meal_artisan')).toBeNull();
    expect(s.meal?.id).toBe('meal_artisan');
    expect(s.meal?.remainingMs).toBe(30 * 60 * 1000);

    const dArtisan = deriveStats(s);
    expect(dArtisan.productionSpeed).toBe(5);
    expect(dArtisan.gatheringSpeed).toBe(0);

    // Smelt Iron speeds up by 5%
    const baseSmelt = actionIntervalMs(s, smithIron, { ...dArtisan, productionSpeed: 0 } as any);
    const buffedSmelt = actionIntervalMs(s, smithIron, dArtisan);
    expect(buffedSmelt).toBeLessThan(baseSmelt);
    expect(+(baseSmelt / buffedSmelt).toFixed(2)).toBe(1.05);

    // Gathering does NOT speed up from Artisan's Lunch
    const currentMineInterval = actionIntervalMs(s, mineCopper, { ...dArtisan, productionSpeed: 0 } as any);
    expect(actionIntervalMs(s, mineCopper, dArtisan)).toBe(currentMineInterval);

    // Clock check: while smithing, artisan meal clock ticks
    s.skills.smithing = xpForLevel(20);
    s.account.bank.iron_ore = 100;
    expect(startSkillAction(s, ctx(), 'smelt_iron')).toBeNull();
    expect(isMealClockRunning(s)).toBe(true);
    tick(s, ctx(), 5000);
    expect(s.meal?.remainingMs).toBe(30 * 60 * 1000 - 5000);

    // Clock check: while mining, artisan meal clock DOES NOT tick
    startSkillAction(s, ctx(), 'mine_copper');
    expect(isMealClockRunning(s)).toBe(false);
  });

  it('guarantees protected signature dishes and project stock with no duplicates or conservation', () => {
    const s = veteran(newGame(1));
    s.skills.cooking = xpForLevel(70);
    s.skillPassives.push('cooking_n0'); // Second Helping (+12% chance to cook second meal)
    s.skillPassives.push('alchemy_n0'); // inputSave

    // Moon Signature Dish
    const moon = actionDef('cook_meal_moon_signature');
    expect(moon.protectedOutputs).toEqual({ meal_moon_signature: 1 });
    s.account.bank = { moon_bloom: 1, frostleaf: 10 };
    expect(startSkillAction(s, ctx(), moon.id)).toBeNull();
    const d = deriveStats(s);
    skillStep(s, ctx(), actionIntervalMs(s, moon, d), d);
    expect(s.account.bank.meal_moon_signature).toBe(1);
    expect(s.account.bank.moon_bloom).toBe(0);
    expect(s.account.bank.frostleaf).toBe(0);

    // Star Signature Dish
    const star = actionDef('cook_meal_star_signature');
    expect(star.protectedOutputs).toEqual({ meal_star_signature: 1 });
    s.account.bank = { star_bloom: 1, voidbloom: 10 };
    expect(startSkillAction(s, ctx(), star.id)).toBeNull();
    skillStep(s, ctx(), actionIntervalMs(s, star, d), d);
    expect(s.account.bank.meal_star_signature).toBe(1);
    expect(s.account.bank.star_bloom).toBe(0);
    expect(s.account.bank.voidbloom).toBe(0);

    // Binding Stock: non-edible project material
    const stock = actionDef('cook_binding_stock');
    expect(stock.protectedOutputs).toEqual({ binding_stock: 1 });
    s.account.bank = { moon_bloom: 1, emberroot: 10, sunpetal: 10 };
    expect(startSkillAction(s, ctx(), stock.id)).toBeNull();
    skillStep(s, ctx(), actionIntervalMs(s, stock, d), d);
    expect(s.account.bank.binding_stock).toBe(1);
    expect(() => mealDef('binding_stock')).toThrow();
  });

  it('delivers 5-count feast projects and proves 60-min buffs', () => {
    const s = veteran(newGame(1));
    s.skills.cooking = xpForLevel(60);
    s.account.bank = { star_bloom: 4, moon_bloom: 4, meal_artisan: 10, meal_porridge: 10 };

    // Grand Artisan's Feast project
    expect(startProject(s, ctx(), 'project_feast_artisans')).toBeNull();
    advanceProject(s, ctx(), 1_800_000);
    expect(s.account.bank.feast_artisans).toBe(5);
    expect(s.professionProgress.projects.project_feast_artisans?.completed).toBe(1);

    // Wayfarer's Feast project
    expect(startProject(s, ctx(), 'project_feast_wayfarers')).toBeNull();
    advanceProject(s, ctx(), 1_800_000);
    expect(s.account.bank.feast_wayfarers).toBe(5);
    expect(s.professionProgress.projects.project_feast_wayfarers?.completed).toBe(1);

    // Eat Grand Artisan's Feast
    expect(eatMeal(s, ctx(), 'feast_artisans')).toBeNull();
    expect(s.meal?.id).toBe('feast_artisans');
    expect(s.meal?.remainingMs).toBe(60 * 60 * 1000);
    expect(dishStats(s, 'feast_artisans').productionSpeed).toBe(8);

    // Eat Wayfarer's Feast
    expect(eatMeal(s, ctx(), 'feast_wayfarers')).toBeNull();
    expect(s.meal?.id).toBe('feast_wayfarers');
    expect(s.meal?.remainingMs).toBe(60 * 60 * 1000);
    expect(dishStats(s, 'feast_wayfarers').lifePct).toBe(12);
    expect(dishStats(s, 'feast_wayfarers').allRes).toBe(8);
  });

  it('crafts and equips Hearth Spoon for +8% Cooking speed', () => {
    const s = veteran(newGame(1));
    s.skills.cooking = xpForLevel(30);
    s.professionProgress.work.cooking = 100;
    s.account.bank = { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 };

    expect(startProject(s, ctx(), 'tool_cooking')).toBeNull();
    advanceProject(s, ctx(), 1_200_000);

    const spoon = s.inventory.find((i) => i.name === 'Hearth Spoon')!;
    expect(spoon).toBeDefined();
    expect(spoon.suffixes).toEqual([{ affixId: 'profession_speed_cooking', tier: 0, values: [8] }]);

    const porridge = actionDef('cook_meal_porridge');
    const intervalBefore = actionIntervalMs(s, porridge, deriveStats(s));

    expect(equip(s, ctx(), spoon.uid)).toBeNull();
    const intervalAfter = actionIntervalMs(s, porridge, deriveStats(s));

    expect(intervalAfter).toBeLessThan(intervalBefore);
    expect(+(intervalBefore / intervalAfter).toFixed(2)).toBe(1.08);
  });

  it('proves supply-supported duration and safe re-eating stops on empty bank', () => {
    const s = veteran(newGame(1));
    s.account.bank.meal_porridge = 3;
    expect(mealSupplySupportedMs(s, 'meal_porridge')).toBe(3 * 30 * 60 * 1000);
    expect(formatDurationMs(mealSupplySupportedMs(s, 'meal_porridge'))).toBe('1h 30m');

    eatMeal(s, ctx(), 'meal_porridge');
    expect(s.account.bank.meal_porridge).toBe(2);
    expect(mealSupplySupportedMs(s, 'meal_porridge')).toBe(3 * 30 * 60 * 1000);

    // Keep eating is true: run down 3 full meals in combat
    s.keepEating = true;
    startCombat(s, ctx(), 'mudflats');
    // Meal 1 expires -> serves Meal 2
    mealStep(s, ctx(), 30 * 60 * 1000);
    expect(s.account.bank.meal_porridge).toBe(1);
    expect(s.meal?.id).toBe('meal_porridge');

    // Meal 2 expires -> serves Meal 3
    mealStep(s, ctx(), 30 * 60 * 1000);
    expect(s.account.bank.meal_porridge).toBe(0);
    expect(s.meal?.id).toBe('meal_porridge');

    // Meal 3 expires -> bank empty -> meal is null and stopped
    mealStep(s, ctx(), 30 * 60 * 1000);
    expect(s.meal).toBeNull();
    expect(s.account.bank.meal_porridge).toBe(0);
    // Further steps do nothing and do not start gathering/cooking
    mealStep(s, ctx(), 60_000);
    expect(s.meal).toBeNull();
  });

  it('matches 8-hour live vs offline catch-up parity for gathering with skilling meal', () => {
    const setup = () => {
      const s = veteran(newGame(1));
      s.skills.mining = xpForLevel(50);
      s.account.bank = { meal_gatherer: 20 };
      s.keepEating = true;
      expect(eatMeal(s, ctx(), 'meal_gatherer')).toBeNull();
      expect(startSkillAction(s, ctx(), 'mine_copper')).toBeNull();
      return s;
    };

    const online = setup();
    const offline = reload(setup());
    const c = ctx();

    for (let i = 0; i < 28800; i++) tick(online, c, 1000);
    const summary = simulateOffline(offline, ctx(), 28_800_000);

    expect(offline.account.bank.copper_ore).toBe(online.account.bank.copper_ore);
    expect(offline.skills.mining).toBe(online.skills.mining);
    expect(offline.account.bank.meal_gatherer).toBe(online.account.bank.meal_gatherer);
    expect(summary.ordinaryOutput?.copper_ore).toBeGreaterThan(0);
  }, 30_000);

  it('preserves pre-overhaul version-46 save fixture with full bag across reloads', () => {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/profession-v46.json', import.meta.url), 'utf8'));
    let s = deserialize(JSON.stringify(fixture.ordinary));
    s.account = structuredClone(fixture.account);

    const initialMeal = structuredClone(s.meal);
    const initialSkills = { ...s.skills };
    const initialBank = structuredClone(s.account.bank);

    s = reload(reload(s));

    expect(s.meal).toEqual(initialMeal);
    expect(s.skills).toEqual(initialSkills);
    expect(s.account.bank.sunpetal).toBe(initialBank.sunpetal);
    expect(s.inventory.length).toBe(60);
  });
});
