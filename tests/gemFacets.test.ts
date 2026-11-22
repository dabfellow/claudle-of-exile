import { describe, expect, it } from 'vitest';
import { actionDef } from '../src/data/skills';
import { supportGemDef } from '../src/data/gems';
import { facetedAreaCells } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { facetedSupportMods, gemXpMultiplier } from '../src/engine/facetEffects';
import {
  applyCutFacets, catalogueSpeed, cutBlocker, cutCost, cutPlanSlots, cutSlots, cutTray, recutGem, saveCutPlan,
} from '../src/engine/gemFacets';
import { createSkillGem, createSupportGem, grantGemXp, minionStats, skillNumbers, skillSummary } from '../src/engine/gems';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { rollRough, STAR_ROUGH, starStoneChance } from '../src/engine/roughGems';
import { deserialize, serialize } from '../src/engine/save';
import { actionIntervalMs, startSkillAction } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { xpToReach } from '../src/engine/xp';

const fixedRng = (v: number) => ({ next: () => v, int: () => 0 });
const ctx = (seed: number, offline = false) => ({ ...makeCtx(seeded(seed)), offline });

describe('Gemcutting: Facet by facet', () => {
  it('rolls rough sizes by share, shifts for Crystal/Motherlode/cavern, and rolls star stones', () => {
    expect(rollRough(fixedRng(0.10), 0, false, 0.001)).toBe('rough_gem_small');
    expect(rollRough(fixedRng(0.50), 0, false, 0.001)).toBe('rough_gem');
    expect(rollRough(fixedRng(0.85), 0, false, 0.001)).toBe('rough_gem_large');
    expect(rollRough(fixedRng(0.985), 0, false, 0.001)).toBe('rough_gem_huge');
    expect(rollRough(fixedRng(0.9995), 0, false, 0.001)).toBe(STAR_ROUGH);

    // Crystal (+1) and Motherlode (+2) shifts, capped at Huge outside caverns and Giant in caverns
    expect(rollRough(fixedRng(0.10), 1, false, 0)).toBe('rough_gem');
    expect(rollRough(fixedRng(0.10), 2, false, 0)).toBe('rough_gem_large');
    expect(rollRough(fixedRng(0.99), 1, false, 0)).toBe('rough_gem_huge');
    expect(rollRough(fixedRng(0.99), 1, true, 0)).toBe('rough_gem_giant');
  });

  it('gives facet slots equal to carats, star stones a wild slot, and enforces facet caps', () => {
    const s = newGame(1);
    expect(cutSlots(s, 'rough_gem_small')).toEqual({ normal: 1, wild: 0 });
    expect(cutSlots(s, 'rough_gem')).toEqual({ normal: 2, wild: 0 });
    expect(cutSlots(s, 'rough_gem_large')).toEqual({ normal: 3, wild: 0 });
    expect(cutSlots(s, 'rough_gem_huge')).toEqual({ normal: 4, wild: 0 });
    expect(cutSlots(s, 'rough_gem_giant')).toEqual({ normal: 5, wild: 0 });
    expect(cutSlots(s, STAR_ROUGH)).toEqual({ normal: 3, wild: 1 });

    // Clarity is once only; other facets cap at twice
    expect(applyCutFacets(s, 'heavy_strike', 'rough_gem_huge', ['clarity', 'clarity', 'edge', 'edge', 'edge'])).toEqual([
      'clarity', 'edge', 'edge',
    ]);
    // Non-family facet is rejected on ordinary rough, accepted into star stone's wild slot
    expect(applyCutFacets(s, 'heavy_strike', 'rough_gem_large', ['brilliance', 'edge'])).toEqual(['edge']);
    expect(applyCutFacets(s, 'heavy_strike', STAR_ROUGH, ['brilliance', 'edge', 'swift', 'clarity'])).toEqual([
      'brilliance', 'edge', 'swift', 'clarity',
    ]);
  });

  it('applies active, support, and named facet effects in skill numbers and stats', () => {
    const s = newGame(2);
    const d = deriveStats(s);

    // Spell + Shared + Elemental + Starburst/Heartfire
    const baseFire = createSkillGem(s, 'fireball', 5);
    const econFire = createSkillGem(s, 'fireball', 5);
    econFire.facets = ['economy'];
    expect(skillNumbers(d, econFire).manaCost).toBeLessThan(skillNumbers(d, baseFire).manaCost);

    const facetedFire = createSkillGem(s, 'fireball', 5);
    facetedFire.facets = ['clarity', 'brilliance', 'conduit', 'wide', 'radiant'];
    const nBase = skillNumbers(d, baseFire);
    const nCut = skillNumbers(d, facetedFire);
    expect(nCut.level).toBe(nBase.level + 3);
    expect(nCut.facets?.penetration).toBe(4);
    expect(nCut.facets?.area).toBe(12);
    expect(skillSummary(d, facetedFire).perUse).toBeGreaterThan(skillSummary(d, baseFire).perUse);
    expect(facetedAreaCells(nCut, 'nova', 10, 1).length).toBeGreaterThanOrEqual(facetedAreaCells(nBase, 'nova', 10, 1).length);

    // Polish increases gem XP gain
    const xpGem = createSkillGem(s, 'fireball', 1);
    xpGem.facets = ['polish', 'polish'];
    expect(gemXpMultiplier(xpGem)).toBeCloseTo(1.2, 5);
    s.skillBar[0] = xpGem;
    const beforeXp = xpGem.xp;
    grantGemXp(s, ctx(1), 10, d.attributes);
    expect(xpGem.xp - beforeXp).toBeCloseTo(12, 5);

    // Attack facets (Edge, Swift, Pierce)
    const baseAtk = createSkillGem(s, 'ice_shot', 3);
    const cutAtk = createSkillGem(s, 'ice_shot', 3);
    cutAtk.facets = ['edge', 'swift', 'pierce'];
    const aBase = skillNumbers(d, baseAtk);
    const aCut = skillNumbers(d, cutAtk);
    expect(aCut.mods.moreDamage).toBe(aBase.mods.moreDamage + 8);
    expect(aCut.actionMs).toBeLessThan(aBase.actionMs);

    // Summon facets (Kinship, Fury, Pace)
    const baseMin = createSkillGem(s, 'drowned_thralls', 3);
    const cutMin = createSkillGem(s, 'drowned_thralls', 3);
    cutMin.facets = ['kinship', 'fury', 'pace'];
    const mBase = minionStats(d, skillNumbers(d, baseMin));
    const mCut = minionStats(d, skillNumbers(d, cutMin));
    expect(mCut.life).toBeGreaterThan(mBase.life);
    expect(mCut.attackMs).toBeLessThan(mBase.attackMs);
    expect(skillNumbers(d, cutMin).facets?.minionDamage).toBe(8);

    // Defence facets (Bulwark, Lasting, Quickcast)
    const baseDef = createSkillGem(s, 'iron_guard', 3);
    const cutDef = createSkillGem(s, 'iron_guard', 3);
    cutDef.facets = ['bulwark', 'lasting', 'quickcast'];
    const dBase = skillNumbers(d, baseDef);
    const dCut = skillNumbers(d, cutDef);
    expect(dCut.facets?.defence).toBe(8);
    expect(dCut.durationMult).toBeGreaterThan(dBase.durationMult);
    expect(dCut.mods.castSpeed).toBe(dBase.mods.castSpeed + 8);

    // Support facets (Keen, Steady, Twin, Sovereign, Heartfire)
    const sup = createSupportGem(s, 'brutality');
    sup.facets = ['keen', 'steady', 'twin', 'sovereign', 'heartfire'];
    const rawMods = supportGemDef('brutality').mods;
    const scaled = facetedSupportMods(rawMods, sup);
    expect(scaled.moreDamage).toBeGreaterThan((rawMods.moreDamage ?? 0) + 18);
    expect(scaled.manaMult).toBeDefined();
  });

  it('recuts faceted gems to return one smaller rough and preserves the gem level', () => {
    const s = newGame(3);
    const gem = createSkillGem(s, 'ice_shot', 7);
    gem.facets = ['edge', 'swift'];
    gem.rough = 'rough_gem_large';
    s.storage.gems.push(gem);

    expect(recutGem(s, gem.uid)).toBeNull();
    expect(gem.facets).toEqual([]);
    expect(gem.level).toBe(7);
    expect(s.storage.bank.rough_gem).toBe(1);

    // Size 1 rough returns nothing
    gem.facets = ['edge'];
    gem.rough = 'rough_gem_small';
    expect(recutGem(s, gem.uid)).toBeNull();
    expect(gem.facets).toEqual([]);
    expect(s.storage.bank.rough_gem_small ?? 0).toBe(0);
  });

  it('gates named cuts by level, rough size (4+ carats, 12 count) and support-only Crown Cut', () => {
    const s = newGame(4);
    s.skills.gemcutting = xpToReach('gemcutting', 80);
    s.storage.bank.arcane_dust = 500;
    s.storage.bank.rough_gem_large = 20;
    s.storage.bank.rough_gem_huge = 20;

    const skillAct = actionDef('cut_skill');
    const supAct = actionDef('cut_support');
    for (const mat of Object.keys(supAct.inputs ?? {})) s.storage.bank[mat] = 500;
    s.storage.bank.rough_gem_large = 20;
    s.storage.bank.rough_gem_huge = 20;

    expect(cutBlocker(s, skillAct, { rough: 'rough_gem_large', named: 'heart' })).toMatch(/Huge or Giant/);
    expect(cutBlocker(s, skillAct, { rough: 'rough_gem_huge', named: 'heart' })).toBeNull();
    expect(cutBlocker(s, skillAct, { rough: 'rough_gem_huge', named: 'crown' })).toMatch(/level 88/);

    s.skills.gemcutting = xpToReach('gemcutting', 95);
    expect(cutBlocker(s, skillAct, { rough: 'rough_gem_huge', named: 'crown' })).toMatch(/support gem/);
    expect(cutBlocker(s, supAct, { rough: 'rough_gem_huge', named: 'crown' })).toBeNull();
    expect(cutBlocker(s, skillAct, { rough: 'rough_gem_huge', named: 'starburst' })).toBeNull();
  });

  it('applies saved cut plans offline, truncating to rough carats, and populates the gem tray', () => {
    const s = newGame(5);
    s.skills.gemcutting = xpToReach('gemcutting', 30);
    s.storage.bank.rough_gem_small = 20;
    s.storage.bank.arcane_dust = 200;

    const a = actionDef('cut_skill');
    expect(saveCutPlan(s, a, 'Quick Attack', ['clarity', 'economy', 'polish'])).toBeNull();
    expect(startSkillAction(s, ctx(5), a.id, { rough: 'rough_gem_small' })).toBeNull();

    simulateOffline(s, ctx(6, true), 60_000);
    const tray = cutTray(s);
    expect(tray.length).toBeGreaterThan(0);
    // Size-1 rough only allows 1 facet from the front of the 3-facet plan
    for (const g of tray) {
      expect(g.facets).toEqual(['clarity']);
    }
  });

  it('unlocks all five cut catalogue perks at 10, 25, 50, 100 and 200 entries', () => {
    const s = newGame(6);
    const a = actionDef('cut_skill');
    const baseInterval = actionIntervalMs(s, a, deriveStats(s));
    const fill = (n: number) => {
      s.gemcutting.catalogue = Array.from({ length: n }, (_, i) => `gem_${i}|`);
    };

    expect(cutPlanSlots(s)).toBe(3);
    expect(cutSlots(s, 'rough_gem_small').normal).toBe(1);
    expect(starStoneChance(s)).toBeCloseTo(0.001, 6);
    expect(catalogueSpeed(s)).toBe(0);

    fill(10);
    expect(cutPlanSlots(s)).toBe(4);

    fill(25);
    expect(cutSlots(s, 'rough_gem_small').normal).toBe(2);

    fill(50);
    s.storage.bank.rough_gem = 10;
    s.storage.bank.arcane_dust = 100;
    const cost = cutCost(s, a, { rough_gem: 1, arcane_dust: 10 }, null, 'rough_gem');
    expect(cost?.arcane_dust).toBe(9);

    fill(100);
    expect(starStoneChance(s)).toBeCloseTo(0.0015, 6);

    fill(200);
    expect(catalogueSpeed(s)).toBe(10);
    expect(actionIntervalMs(s, a, deriveStats(s))).toBeLessThan(baseInterval);
  });

  it('migrates pre-facet saves safely without losing rough_gem stacks or owned gems', () => {
    const s = newGame(7);
    s.storage.bank.rough_gem = 42;
    const gem = createSkillGem(s, 'fireball', 4);
    s.storage.gems.push(gem);
    const raw = JSON.parse(serialize(s));
    raw.version = 58;
    delete raw.gemcutting;
    delete raw.storage.gems[0].facets;

    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.storage.bank.rough_gem).toBe(42);
    expect(loaded.gemcutting).toEqual({ plans: [], active: {}, catalogue: [], tray: [] });
    expect(loaded.storage.gems[0].facets).toEqual([]);
  });
});
