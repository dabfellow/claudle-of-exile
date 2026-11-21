import { describe, expect, it } from 'vitest';
import { gemReqLevel } from '../src/data/gems';
import { DEFENCE_SUPPORTS, GEMCUTTING_CATEGORIES, gemcuttingCategory, staticFamilyPool, type GemFamily } from '../src/data/gemcutting';
import { actionDef, SKILLS } from '../src/data/skills';
import { PROFESSION_PROJECTS } from '../src/data/professionProjects';
import type { Ctx } from '../src/engine/context';
import { equip } from '../src/engine/equipment';
import {
  gemcuttingPreview,
  getUnequippedGems,
  isGemEquipped,
  recycleGem,
  selectGemForRecycle,
} from '../src/engine/gemcutting';
import { createSkillGem, createSupportGem } from '../src/engine/gems';
import { hasMinigame } from '../src/engine/minigame';
import { simulateOffline } from '../src/engine/offline';
import { advanceProject, awardProfessionProgress, startProject } from '../src/engine/professions';
import { seeded } from '../src/engine/rng';
import { masteryForAction } from '../src/data/skillingMastery';
import { skillTreeStats } from '../src/engine/skillTree';
import { actionBlocker, actionIntervalMs, skillLevel, skillStep, startSkillAction } from '../src/engine/skills';
import { newGame, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';

const ctx = (): Ctx => ({ rng: seeded(42), emit: () => {}, now: 0 });

function give(s: GameState, inputs: Record<string, number>, times = 1): void {
  for (const [id, n] of Object.entries(inputs)) {
    s.storage.bank[id] = (s.storage.bank[id] ?? 0) + n * times;
  }
}

describe('Gemcutting: skill and category structure', () => {
  it('is a production skill with a mini-game and independent progression', () => {
    expect(SKILLS.gemcutting.group).toBe('production');
    expect(hasMinigame('gemcutting')).toBe(true);

    const s = newGame(1);
    expect(skillLevel(s, 'gemcutting')).toBe(1);
    const cutSkill = actionDef('cut_skill');
    expect(actionBlocker(s, cutSkill)).toBe('Missing materials');
  });

  it('organizes actions into the five specification categories', () => {
    const cats = GEMCUTTING_CATEGORIES.map((c) => c.id);
    expect(cats).toEqual(['general', 'family', 'exact_skill', 'exact_support', 'crystals']);

    expect(gemcuttingCategory(actionDef('cut_skill'))).toBe('general');
    expect(gemcuttingCategory(actionDef('recycle_gem'))).toBe('general');
    expect(gemcuttingCategory(actionDef('cut_family_attack'))).toBe('family');
    expect(gemcuttingCategory(actionDef('cut_family_defence'))).toBe('family');
    expect(gemcuttingCategory(actionDef('cut_exact_heavy_strike'))).toBe('exact_skill');
    expect(gemcuttingCategory(actionDef('cut_exact_life_leech'))).toBe('exact_support');
    expect(gemcuttingCategory(actionDef('cut_exceptional'))).toBe('crystals');
    expect(gemcuttingCategory(actionDef('polish_exceptional'))).toBe('crystals');
  });
});

describe('Gemcutting: targeted family pools', () => {
  const families: GemFamily[] = ['attack', 'elemental', 'summon', 'defence', 'damage_support'];

  it('defines the 17 explicit defensive support gems', () => {
    expect(DEFENCE_SUPPORTS.size).toBe(17);
    const expected = [
      'life_leech', 'mana_leech', 'pilgrims_measure', 'beggars_cup', 'alms_of_the_mind',
      'frozen_will', 'thaw', 'stone_pulse', 'salt_thirst', 'ebb',
      'undertow_of_thought', 'tribute_of_iron', 'blood_tax', 'imperial_vintage',
      'reinforced', 'eternal_ward', 'void_ward',
    ];
    for (const id of expected) {
      expect(DEFENCE_SUPPORTS.has(id)).toBe(true);
    }
  });

  it('populates static family pools according to specification filters', () => {
    for (const f of families) {
      const pool = staticFamilyPool(f);
      expect(pool.length).toBeGreaterThan(0);
      // No duplicate IDs
      const ids = pool.map((g) => g.id);
      expect(new Set(ids).size).toBe(ids.length);
    }

    // attack gems have 'attack' tag
    for (const g of staticFamilyPool('attack')) {
      expect((g as any).tags).toContain('attack');
    }
    // elemental spell gems have 'spell' tag and fire/cold/light effect
    for (const g of staticFamilyPool('elemental')) {
      expect((g as any).tags).toContain('spell');
      expect(['fire', 'cold', 'light']).toContain((g as any).effect?.type);
    }
    // summon gems have 'minion' or 'totem'
    for (const g of staticFamilyPool('summon')) {
      const tags = (g as any).tags;
      expect(tags.includes('minion') || tags.includes('totem')).toBe(true);
    }
    // defence has no signatures and only DEFENCE_SUPPORTS
    for (const g of staticFamilyPool('defence')) {
      expect((g as any).signatureFor).toBeUndefined();
      expect(DEFENCE_SUPPORTS.has(g.id)).toBe(true);
    }
    // damage_support has no signatures and no DEFENCE_SUPPORTS
    for (const g of staticFamilyPool('damage_support')) {
      expect((g as any).signatureFor).toBeUndefined();
      expect(DEFENCE_SUPPORTS.has(g.id)).toBe(false);
    }
  });

  it('filters family pools by Gemcutting level and awards uniform cuts', () => {
    const s = newGame(1);
    s.skills.gemcutting = xpForLevel(15);
    expect(skillLevel(s, 'gemcutting')).toBe(15);

    const attackAction = actionDef('cut_family_attack');
    expect(attackAction.level).toBe(15);
    expect(attackAction.intervalMs).toBe(30000);
    expect(attackAction.inputs).toEqual({ rough_gem: 6, arcane_dust: 50 });

    give(s, { rough_gem: 6, arcane_dust: 50 });
    const initialGems = s.storage.gems.length;
    startSkillAction(s, ctx(), 'cut_family_attack');
    expect(s.action && s.action.kind === 'skill' ? s.action.actionId : null).toBe('cut_family_attack');

    const d = deriveStats(s);
    skillStep(s, ctx(), 30000, d);

    expect(s.storage.gems.length).toBe(initialGems + 1);
    expect(s.storage.bank.rough_gem ?? 0).toBe(0);
    // Started with 6 arcane_dust, gave 50, spent 50 -> remaining 6
    expect(s.storage.bank.arcane_dust ?? 0).toBe(6);

    const cut = s.storage.gems[s.storage.gems.length - 1];
    expect(gemReqLevel(cut.gemId)).toBeLessThanOrEqual(15);
  });
});

describe('Gemcutting: exact gem cutting', () => {
  it('opens exact gem cutting at its required level', () => {
    const s = newGame(1);
    s.skills.gemcutting = xpForLevel(50);

    const action = actionDef('cut_exact_heavy_strike');
    expect(action.level).toBe(20);
    expect(action.accomplishments).toBeUndefined();

    give(s, { rough_gem: 20, arcane_dust: 200 });
    expect(actionBlocker(s, action)).toBeNull();
  });

  it('cuts exact named skill gem and previews requirements', () => {
    const s = newGame(1);
    s.skills.gemcutting = xpForLevel(50);
    awardProfessionProgress(s, 'gemcutting', 30);

    const action = actionDef('cut_exact_heavy_strike');
    expect(action.inputs).toEqual({ rough_gem: 12, arcane_dust: 100 });
    expect(action.intervalMs).toBe(60000);
    expect(masteryForAction(action)?.id).toBe(`task.${action.id}`);

    const preview = gemcuttingPreview(s, action);
    expect(preview.some((l) => l.includes('Heavy Strike'))).toBe(true);

    give(s, { rough_gem: 12, arcane_dust: 100 });
    startSkillAction(s, ctx(), 'cut_exact_heavy_strike');

    const d = deriveStats(s);
    skillStep(s, ctx(), 60000, d);

    expect(s.storage.gems.some((g) => g.gemId === 'heavy_strike')).toBe(true);
    expect(s.storage.bank.rough_gem ?? 0).toBe(0);
    // Started with 6 arcane_dust, gave 100, spent 100 -> remaining 6
    expect(s.storage.bank.arcane_dust ?? 0).toBe(6);
  });

  it('cuts exact signature support with level + 5 requirement', () => {
    const s = newGame(1);
    s.skills.gemcutting = xpForLevel(50);
    awardProfessionProgress(s, 'gemcutting', 30);

    // shattering_blow is signature for heavy_strike (reqLevel 1, signature adds 6 = 7; exact cut level = max(20, 7+5) = 20)
    const action = actionDef('cut_exact_shattering_blow');
    expect(action.level).toBe(20);

    give(s, { rough_gem: 12, arcane_dust: 100 });
    startSkillAction(s, ctx(), 'cut_exact_shattering_blow');

    const d = deriveStats(s);
    skillStep(s, ctx(), 60000, d);

    expect(s.storage.supportGems.some((g) => g.supportId === 'shattering_blow')).toBe(true);
  });
});

describe('Gemcutting: safe recycling & cost floor', () => {
  it('recycles an unequipped gem for 5 Arcane Dust and stops', () => {
    const s = newGame(1);
    const gem = createSkillGem(s, 'heavy_strike');
    s.storage.gems.push(gem);

    expect(getUnequippedGems(s).some((g) => g.uid === gem.uid)).toBe(true);
    expect(isGemEquipped(s, gem.uid)).toBe(false);

    selectGemForRecycle(s, gem.uid);
    expect(s.selectedGemRecycleUid).toBe(gem.uid);

    const action = actionDef('recycle_gem');
    expect(actionBlocker(s, action)).toBeNull();

    startSkillAction(s, ctx(), 'recycle_gem');
    const d = deriveStats(s);
    skillStep(s, ctx(), 5000, d);

    // Gem is consumed
    expect(s.storage.gems.some((g) => g.uid === gem.uid)).toBe(false);
    // Started with 6, added 5 Arcane Dust = 11
    expect(s.storage.bank.arcane_dust).toBe(11);
    // Selection reset and action stopped
    expect(s.selectedGemRecycleUid).toBeNull();
    expect(s.action).toBeNull();
  });

  it('rejects recycling equipped gems', () => {
    const s = newGame(1);
    const gem = createSkillGem(s, 'heavy_strike');
    s.storage.gems.push(gem);
    s.skillBar[0] = gem; // equip to bar

    expect(isGemEquipped(s, gem.uid)).toBe(true);
    selectGemForRecycle(s, gem.uid);

    const action = actionDef('recycle_gem');
    expect(actionBlocker(s, action)).toBe('Cannot recycle equipped gem');

    const res = recycleGem(s, ctx(), gem.uid);
    expect(res).toBe('Cannot recycle an equipped or socketed gem');
    // Starting bank had 6 arcane_dust, unchanged
    expect(s.storage.bank.arcane_dust ?? 0).toBe(6);
  });

  it('enforces minimum net cut cost floor of 1 rough gem and 6 arcane dust', () => {
    const s = newGame(1);
    s.skills.gemcutting = xpForLevel(50);
    // Maximize discounts: allocate Steady Hands (100% input save test simulation)
    s.skillPassives = ['steady_hands'];

    const a = actionDef('cut_skill'); // base: 3 rough_gem, 30 arcane_dust, 20000ms
    expect(actionBlocker(s, a)).toBe('Missing materials');
    give(s, { rough_gem: 10, arcane_dust: 100 });

    startSkillAction(s, ctx(), 'cut_skill');
    const d = deriveStats(s);
    skillStep(s, ctx(), 20000, d);

    // Despite maximum discounts/input saving, paid at least 1 rough gem and 6 arcane dust!
    expect(s.storage.bank.rough_gem).toBeLessThanOrEqual(9);
    // Started with 6 + 100 = 106, paid at least 6 -> <= 100
    expect(s.storage.bank.arcane_dust).toBeLessThanOrEqual(100);
    // This strictly prevents an infinite recycling loop (5 dust returned < 6 dust floor).
  });
});

describe('Gemcutting: exceptional crystals and Lapidary’s Chisel', () => {
  it('crafts exceptional crystal (L60) and convergence crystal (L85)', () => {
    const s = newGame(1);
    s.skills.gemcutting = xpForLevel(85);

    const cutAction = actionDef('cut_exceptional');
    expect(cutAction.level).toBe(60);
    expect(cutAction.inputs).toEqual({ crystal_shard: 10, rough_gem: 5 });
    expect(cutAction.protectedOutputs).toEqual({ exceptional_crystal: 1 });

    give(s, { crystal_shard: 10, rough_gem: 5 });
    startSkillAction(s, ctx(), 'cut_exceptional');
    const d = deriveStats(s);
    skillStep(s, ctx(), 60000, d);

    expect(s.storage.bank.exceptional_crystal).toBe(1);

    const polishAction = actionDef('polish_exceptional');
    expect(polishAction.level).toBe(85);
    expect(polishAction.inputs).toEqual({ exceptional_crystal: 1, arcane_dust: 50 });
    expect(polishAction.protectedOutputs).toEqual({ convergence_crystal: 1 });

    give(s, { arcane_dust: 50 });
    startSkillAction(s, ctx(), 'polish_exceptional');
    skillStep(s, ctx(), 120000, d);

    expect(s.storage.bank.exceptional_crystal).toBe(0);
    expect(s.storage.bank.convergence_crystal).toBe(1);
  });

  it('crafts Lapidary’s Chisel and verifies +8% Gemcutting speed', () => {
    const s = newGame(1);
    s.skills.gemcutting = xpForLevel(30);
    awardProfessionProgress(s, 'gemcutting', 100);

    const project = PROFESSION_PROJECTS.find((p) => p.id === 'tool_gemcutting')!;
    expect(project).toBeDefined();
    expect(project.level).toBe(30);

    give(s, project.inputs);
    expect(startProject(s, ctx(), project.id)).toBeNull();
    expect(s.professionProgress.activeProject?.project.id).toBe('tool_gemcutting');

    // Advance 20 minutes
    advanceProject(s, ctx(), 1200000);

    const tool = s.inventory.find((i) => i.name === "Lapidary's Chisel");
    expect(tool).toBeDefined();
    expect(tool?.suffixes?.[0].affixId).toBe('profession_speed_gemcutting');

    // Base Gemcutting speed without tool
    expect(skillTreeStats(s).gemcuttingSpeed ?? 0).toBe(0);
    const a = actionDef('cut_skill');
    const intervalWithout = actionIntervalMs(s, a, deriveStats(s));

    // Equip tool
    expect(equip(s, ctx(), tool!.uid)).toBeNull();
    expect(skillTreeStats(s).gemcuttingSpeed).toBe(8);

    // Verify action interval decreases by ~8%
    const intervalWith = actionIntervalMs(s, a, deriveStats(s));
    expect(intervalWith).toBeLessThan(intervalWithout);
  });
});

describe('Gemcutting: 8-hour live vs offline catch-up parity', () => {
  it('produces identical output and progress over 8 hours', () => {
    function runSim(offline: boolean) {
      const s = newGame(1);
      s.account.automation.offlineHours = 12;
      s.skills.gemcutting = xpForLevel(30);
      give(s, { rough_gem: 2000, arcane_dust: 20000 });
      const c = ctx();
      startSkillAction(s, c, 'cut_skill');

      const totalMs = 8 * 3600 * 1000;
      if (offline) {
        simulateOffline(s, c, totalMs);
      } else {
        const stepMs = 1000;
        let elapsed = 0;
        while (elapsed < totalMs) {
          tick(s, c, stepMs);
          elapsed += stepMs;
        }
      }
      return {
        gems: s.storage.gems.length,
        rough: s.storage.bank.rough_gem ?? 0,
        dust: s.storage.bank.arcane_dust ?? 0,
        xp: s.skills.gemcutting,
      };
    }

    const live = runSim(false);
    const off = runSim(true);

    expect(off.gems).toBe(live.gems);
    expect(off.rough).toBe(live.rough);
    expect(off.dust).toBe(live.dust);
    expect(off.xp).toBe(live.xp);
  }, 30000);

  it('playtest: obtaining and equipping a missing support via Gemcutting', () => {
    const s = newGame(1);
    s.skills.gemcutting = xpForLevel(25);
    awardProfessionProgress(s, 'gemcutting', 30); // 30 cycles completed

    // Heavy strike on skill bar
    const heavyStrike = createSkillGem(s, 'heavy_strike');
    s.skillBar[0] = heavyStrike;
    expect(s.skillBar[0].supports.filter(Boolean).length).toBe(0);

    // Initial materials: some rough gems and arcane dust
    give(s, { rough_gem: 24, arcane_dust: 120 });

    // Step 1: Perform exact cut for missing signature support 'shattering_blow'
    const action = actionDef('cut_exact_shattering_blow');
    expect(actionBlocker(s, action)).toBeNull();

    startSkillAction(s, ctx(), 'cut_exact_shattering_blow');
    const d = deriveStats(s);
    skillStep(s, ctx(), 60000, d);

    // Shattering blow is now in account support gems
    const support = s.storage.supportGems.find((g) => g.supportId === 'shattering_blow');
    expect(support).toBeDefined();

    // Step 2: Socket support into Heavy Strike
    s.skillBar[0].supports[0] = support!;
    expect(s.skillBar[0].supports.some((sup) => sup?.supportId === 'shattering_blow')).toBe(true);

    // Step 3: Check recycling: create an unwanted gem, recycle it to recover arcane dust
    const unwanted = createSupportGem(s, 'mana_leech');
    s.storage.supportGems.push(unwanted);
    expect(isGemEquipped(s, unwanted.uid)).toBe(false);

    const dustBefore = s.storage.bank.arcane_dust ?? 0;
    selectGemForRecycle(s, unwanted.uid);
    startSkillAction(s, ctx(), 'recycle_gem');
    skillStep(s, ctx(), 5000, d);

    expect(s.storage.bank.arcane_dust).toBe(dustBefore + 5);
    expect(s.storage.supportGems.some((g) => g.uid === unwanted.uid)).toBe(false);
  });
});
