import { describe, expect, it } from 'vitest';
import { FORGE_CHAPTERS, forgeBeatMs, forgeImplicits, hasKingsbronze, WEAPON_ALLOY_SIGNATURES } from '../src/data/forging';
import { actionDef } from '../src/data/skills';
import { makeCtx } from '../src/engine/context';
import {
  applyBarPurity, chooseForgeSong, createStagedForgeItem, forgeActionForPlan, forgeChaptersCompleted, forgeModWeight, forgePatternSlots,
  forgePlanBlocker, forgePreset, forgePurpose, forgeSingingChance, forgingSpeed, saveForgePattern, startStagedForge, type ForgePlan,
} from '../src/engine/forging';
import { addFixedMod, allMods, createItem } from '../src/engine/items';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { masteryThreshold } from '../src/engine/skillingMastery';
import { newGame } from '../src/engine/state';
import { deriveStats, itemStats } from '../src/engine/stats';
import { xpToReach } from '../src/engine/xp';

const weapon: ForgePlan = { baseId: 'war_axe', choices: { shape: 'heavy', temper: 'deep', form: 'serrated' } };
const setup = (level = 90) => {
  const s = newGame(1);
  s.skills.smithing = xpToReach('smithing', level);
  s.account.hideout.forge = 3;
  return s;
};

function supply(s: ReturnType<typeof setup>, plan: ForgePlan, batches = 1) {
  const action = forgeActionForPlan(plan)!;
  for (const [id, units] of Object.entries(action.inputs ?? {})) s.storage.bank[id] = units * batches;
  return action;
}

describe('staged forging', () => {
  it('trains swords, axes and wands independently across bases and recipe styles', () => {
    const s = setup();
    const ctx = makeCtx(seeded(14));
    for (const [id, family, advanced] of [
      ['smith_rusted_sword', 'sword', 'staged_forge_wyrmlord_sword'],
      ['smith_rusty_hatchet', 'axe', 'staged_forge_wyrmlord_greataxe'],
      ['smith_driftwood_wand', 'wand', 'staged_forge_seraph_wand'],
    ]) {
      const recipe = actionDef(id);
      expect(recipe.mastery!.id).toBe(`weapon.${family}`);
      expect(actionDef(advanced).mastery!.id).toBe(recipe.mastery!.id);
      s.storage.bank = { ...recipe.inputs };
      expect(startSkillAction(s, ctx, id)).toBeNull();
      const d = deriveStats(s);
      skillStep(s, ctx, actionIntervalMs(s, recipe, d) + 1, d);
      expect(s.skillingMastery[recipe.mastery!.id]).toBeCloseTo(recipe.intervalMs / 1000);
    }
    expect(Object.keys(s.skillingMastery).sort()).toEqual(['weapon.axe', 'weapon.sword', 'weapon.wand']);
  });

  it('rolls one extra effect from the chosen alloy only at family mastery 75', () => {
    const s = setup();
    const ctx = makeCtx(seeded(42));
    const wand: ForgePlan = { baseId: 'seraph_wand', alloy: 'moonsilver', choices: { shape: 'light', signature: 'amplified' } };
    const options = { ilvl: 85, itemTier: 1, purity: 0, focusMultiple: 1 } as const;
    expect(forgePlanBlocker(s, { ...wand, choices: { shape: 'light' }, alloy: undefined })).toMatch(/master alloy/);
    expect(forgePlanBlocker(s, wand)).toBeNull();
    s.skillingMastery['weapon.wand'] = masteryThreshold(74);
    const before = createStagedForgeItem(s, ctx, forgeActionForPlan(wand)!, wand, options);
    expect(before.weaponMasterySignature).toBeUndefined();
    expect(before.forgeSignatures).toEqual([{ id: 'moonsilver', multiplier: 1.5 }]);
    s.skillingMastery['weapon.wand'] = masteryThreshold(75);
    for (const alloy of ['moonsilver', 'dragonsteel'] as const) {
      const plan = { ...wand, alloy };
      const item = createStagedForgeItem(s, ctx, forgeActionForPlan(plan)!, plan, options);
      expect(item.weaponMasterySignature?.alloy).toBe(alloy);
      const effect = WEAPON_ALLOY_SIGNATURES[alloy][item.weaponMasterySignature!.effect];
      expect(forgeImplicits(item)).toContainEqual(expect.objectContaining({ stat: effect.stat, value: effect.value }));
    }
  });

  it('combines existing recipe practice without double-counting purpose practice carried to staged forging', () => {
    const s = setup();
    expect(saveForgePattern(s, 'Existing axe', weapon)).toBeNull();
    const raw = JSON.parse(serialize(s));
    raw.version = 67;
    raw.skillingMastery = {
      'task.smith_rusted_sword': 600,
      'task.smith_wyrmlord_sword': 900,
      'task.smith_driftwood_wand': 450,
      'task.smith_seraph_wand': 550,
      'task.purpose_physical_felling_axe': 125,
      'task.staged_forge_felling_axe': 200,
      'task.smith_iron_ring': 75,
    };
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.skillingMastery).toEqual({ 'weapon.sword': 1500, 'weapon.wand': 1000, 'weapon.axe': 200, 'task.smith_iron_ring': 75 });
    expect(loaded.forging.patterns).toEqual(s.forging.patterns);
    expect(deserialize(serialize(loaded)).skillingMastery).toEqual(loaded.skillingMastery);
  });

  it('multiplies the right groups across stages, preserves guarantees and rolls a Rare', () => {
    const s = setup();
    const ctx = makeCtx(seeded(192));
    const a = supply(s, weapon);
    expect(forgeModWeight(weapon, 'added_phys')).toBe(6);
    expect(forgeModWeight(weapon, 'bleed_chance')).toBe(2);
    expect(forgeModWeight(weapon, 'crit_chance')).toBe(1);
    expect(forgeModWeight({ ...weapon, choices: { shape: 'balanced' } }, 'accuracy')).toBe(2);
    expect(forgeModWeight({ ...weapon, choices: { shape: 'balanced' } }, 'crit_chance')).toBe(1.3);
    expect(forgePurpose(weapon)?.guarantees).toEqual(['added_phys', 'inc_phys']);
    const before = s.inventory.length;
    expect(startStagedForge(s, ctx, weapon)).toBeNull();
    const d = deriveStats(s);
    skillStep(s, ctx, actionIntervalMs(s, a, d) + 1, d);
    expect(s.action).toBeNull();
    expect(s.inventory).toHaveLength(before + 1);
    const item = s.inventory.at(-1)!;
    expect(item.rarity).toBe('rare');
    expect(allMods(item).map(({ affixId }) => affixId)).toEqual(expect.arrayContaining(['added_phys', 'inc_phys']));
  });

  it('checks level gates and keeps an early purpose preset available', () => {
    const s = setup(18);
    expect(forgePlanBlocker(s, { ...weapon, choices: { shape: 'balanced' } })).toMatch(/level 20/);
    expect(forgePlanBlocker(s, { ...weapon, choices: { shape: 'heavy', finish: 'etched' } })).toMatch(/level 50/);
    const old = actionDef('purpose_physical_felling_axe');
    const preset = forgePreset(old);
    const apprentice = setup(old.level);
    expect(forgePlanBlocker(apprentice, preset)).toBeNull();
    expect(forgePlanBlocker(apprentice, { ...preset, choices: { ...preset.choices, finish: 'gilded' } })).toMatch(/valid purpose/);
    expect(forgeActionForPlan({ ...weapon, choices: { ...weapon.choices, temper: 'quick' } })!.intervalMs)
      .toBeCloseTo(forgeActionForPlan(weapon)!.intervalMs * 0.7);
  });

  it('repeats the saved pattern offline and keeps a rack of every new piece', () => {
    const s = setup();
    const ctx = makeCtx(seeded(713), 600_000);
    const a = supply(s, weapon, 3);
    const before = s.inventory.length;
    expect(saveForgePattern(s, 'Practice axe', weapon)).toBeNull();
    expect(startStagedForge(s, ctx, weapon, s.forging.patterns[0].id)).toBeNull();
    simulateOffline(s, ctx, actionIntervalMs(s, a, deriveStats(s)) * 3 + 1_000);
    expect(s.inventory).toHaveLength(before + 3);
    expect(s.forging.rack).toEqual(s.inventory.slice(before).map(({ uid }) => uid));
    expect(s.forging.book.axe).toHaveLength(1);
  });

  it('awards only earned chapter perks, and unlocks a slot every 25 levels', () => {
    const s = setup(1);
    expect(forgePatternSlots(s)).toBe(3);
    s.skills.smithing = xpToReach('smithing', 75);
    expect(forgePatternSlots(s)).toBe(6);
    for (const [id] of FORGE_CHAPTERS.slice(0, 5)) s.forging.book[id] = Array.from({ length: 10 }, (_, i) => String(i));
    expect(forgeChaptersCompleted(s)).toBe(5);
    expect(forgePatternSlots(s)).toBe(8);
    expect(forgingSpeed(s)).toBe(10);
    expect(forgeSingingChance(s)).toBeCloseTo(1.25 / 500);
  });

  it('requires the class level and alloy, then applies both Living signatures to equipped gear', () => {
    const s = setup(79);
    const ctx = makeCtx(seeded(98));
    const plan: ForgePlan = { ...weapon, alloy: 'living_moonsilver', choices: { ...weapon.choices, signature: 'amplified' } };
    expect(forgePlanBlocker(s, plan)).toMatch(/level 80/);
    s.skills.smithing = xpToReach('smithing', 95);
    expect(startStagedForge(s, ctx, plan)).toBe('Missing materials');
    const a = supply(s, plan);
    const item = createStagedForgeItem(s, ctx, a, plan, { ilvl: 89, itemTier: 1, purity: 0, focusMultiple: 1 });
    expect(item.forgeSignatures).toHaveLength(2);
    expect(item.forgeSignatures?.[0]).toEqual({ id: 'moonsilver', multiplier: 1.5 });
    expect(item.forgeSignatures?.[1].id).not.toBe('moonsilver');
    expect(forgeImplicits(item)).toContainEqual(expect.objectContaining({ stat: 'energyShieldPct', value: 12 }));
    expect(itemStats(item).energyShieldPct).toBeGreaterThanOrEqual(12);
    expect(hasKingsbronze({ forgeSignatures: [{ id: 'kingsbronze', multiplier: 1 }] })).toBe(true);
    const ancestral = { ...plan, choices: { ...plan.choices, signature: 'ancestral' } };
    expect(createStagedForgeItem(s, ctx, a, ancestral, { ilvl: 90, itemTier: 1, purity: 0, focusMultiple: 1 }).ilvl).toBe(92);
  });

  it('adds one modifier each for Gilded and Twin-forged within the usual slot limits', () => {
    const s = setup();
    const ctx = makeCtx(seeded(40));
    const options = { ilvl: 90, itemTier: 1, purity: 0, focusMultiple: 1 } as const;
    const gilded: ForgePlan = { ...weapon, choices: { ...weapon.choices, finish: 'gilded' } };
    const twin: ForgePlan = { ...gilded, alloy: 'dragonsteel', choices: { ...gilded.choices, signature: 'twin' } };
    const a = forgeActionForPlan(gilded)!;
    expect(allMods(createStagedForgeItem(s, ctx, a, gilded, options))).toHaveLength(5);
    const full = createStagedForgeItem(s, ctx, a, twin, options);
    expect(full.prefixes).toHaveLength(3);
    expect(full.suffixes).toHaveLength(3);
  });

  it('queues a singing result during offline work and grants the selected song once', () => {
    const s = setup();
    const ctx = makeCtx({ next: () => 0 }, 120_000);
    const a = supply(s, weapon);
    expect(startStagedForge(s, ctx, weapon)).toBeNull();
    simulateOffline(s, ctx, actionIntervalMs(s, a, deriveStats(s)) + 1_000);
    const item = s.inventory.at(-1)!;
    expect(item.forgeSinging).toBe(true);
    expect(s.forging.pendingSinging).toEqual([item.uid]);
    expect(s.forging.rack).toContain(item.uid);
    expect(chooseForgeSong(s, ctx, item.uid, 'quality')).toBeNull();
    expect(item.quality).toBe(30);
    expect(item.forgeSinging).toBeUndefined();
    expect(chooseForgeSong(s, ctx, item.uid, 'quality')).toMatch(/not carried/);
  });

  it('uses the bar metal for hammer timing and grants purity to actual item rolls', () => {
    const a = forgeActionForPlan(weapon)!;
    expect(forgeBeatMs({ ...a, inputs: { copper_bar: 1 } })).toBe(900);
    expect(forgeBeatMs({ ...a, inputs: { world_bar: 1 } })).toBe(550);
    const s = setup();
    const rng = { next: () => 0 };
    const item = createItem(s, weapon.baseId, 90, 'normal', rng);
    addFixedMod(item, 'added_phys', 2, rng);
    applyBarPurity(item, 2, rng);
    expect(item.quality).toBe(10);
    expect(item.prefixes[0].tier).toBe(3);
    applyBarPurity(item, -1, rng);
    expect(item.prefixes[0].tier).toBe(2);
  });

  it('moves a legacy action and its practice into the staged recipe without losing time', () => {
    const s = setup(25);
    const legacy = actionDef('purpose_physical_war_axe');
    const a = forgeActionForPlan(weapon)!;
    const old = JSON.parse(serialize(s));
    old.version = 57;
    delete old.forging;
    old.action = { kind: 'skill', actionId: legacy.id, progress: 2_000 };
    old.skillingMastery = { [legacy.mastery!.id]: 100 };
    const loaded = deserialize(JSON.stringify(old));
    expect(loaded.action).toEqual(expect.objectContaining({ actionId: a.id, progress: 2_000 }));
    expect(loaded.forging.patterns.some((pattern) => pattern.legacyPurpose === legacy.id)).toBe(true);
    expect(loaded.skillingMastery[a.mastery!.id]).toBe(100);
  });
});
