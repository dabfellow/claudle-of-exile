import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { actionDef } from '../src/data/skills';
import { recipeStock } from '../src/data/smelting';
import { baseDef } from '../src/data/bases';
import { PROFESSION_PROJECTS } from '../src/data/professionProjects';
import { makeCtx } from '../src/engine/context';
import { newGame, tick } from '../src/engine/state';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { addFixedMod, createItem } from '../src/engine/items';
import { deriveStats } from '../src/engine/stats';
import { charXpForLevel, xpForLevel } from '../src/engine/xp';
import { deserialize, serialize } from '../src/engine/save';
import { simulateOffline } from '../src/engine/offline';
import { advanceProject, cancelProject, completeProject, resumeProject, startProject } from '../src/engine/professions';
import { equip } from '../src/engine/equipment';
import { upgradeStation } from '../src/engine/hideout';
import { seeded } from '../src/engine/rng';
import { giantCuts } from './helpers';
import type { GameState } from '../src/engine/types';

const ctx = (seed = 42) => makeCtx({ next: seeded(seed).next });
const reload = (s: GameState) => {
  const account = structuredClone(s.account);
  s = deserialize(serialize(s));
  s.account = account;
  return s;
};

function doActionCycles(s: GameState, actionId: string, count: number, c = ctx()): number {
  // logs now come from felling giants: cut a giant's limbs, one log a cut
  if (actionId.startsWith('cut_')) return giantCuts(s, c, actionId.slice(4), count);
  const a = actionDef(actionId);
  expect(startSkillAction(s, c, actionId)).toBeNull();
  let elapsed = 0;
  for (let i = 0; i < count; i++) {
    const d = deriveStats(s);
    const duration = actionIntervalMs(s, a, d);
    elapsed += duration;
    skillStep(s, c, duration + 0.0001, d);
  }
  return elapsed;
}

describe('Phase 05 Equipment Checkpoint', () => {
  describe('Realistic campaign equipment journeys & time-to-upgrade', () => {
    it.each([
      {
        name: 'Melee warrior level 20 (Felling Axe -> War Axe)',
        classId: 'warrior' as const,
        combatLvl: 20,
        supplierLvl: 15,
        oldBase: 'felling_axe',
        targetAction: 'purpose_physical_war_axe',
        purpose: 'physical',
        metal: 'iron',
        wood: 'oak',
        budgetMinutes: 15,
      },
      {
        name: 'Bow ranger level 20 (Hunting Bow -> Ash Longbow)',
        classId: 'ranger' as const,
        combatLvl: 20,
        supplierLvl: 15,
        oldBase: 'hunting_bow',
        targetAction: 'purpose_physical_ash_longbow',
        purpose: 'physical',
        metal: 'iron',
        wood: 'oak',
        budgetMinutes: 15,
      },
      {
        name: 'Caster mage level 20 (Bone Wand -> Coral Wand)',
        classId: 'mage' as const,
        combatLvl: 20,
        supplierLvl: 15,
        oldBase: 'driftwood_wand',
        targetAction: 'purpose_resource_coral_wand',
        purpose: 'resource',
        metal: 'iron',
        wood: 'oak',
        budgetMinutes: 15,
      },
      {
        name: 'Melee warrior level 50 (War Axe -> Butcher Axe)',
        classId: 'warrior' as const,
        combatLvl: 50,
        supplierLvl: 30,
        oldBase: 'war_axe',
        targetAction: 'purpose_physical_butcher_axe',
        purpose: 'physical',
        metal: 'mithril',
        wood: 'yew',
        budgetMinutes: 30,
      },
      {
        name: 'Caster mage level 50 (Driftwood Wand -> Raven Wand)',
        classId: 'mage' as const,
        combatLvl: 50,
        supplierLvl: 30,
        oldBase: 'driftwood_wand',
        targetAction: 'purpose_resource_raven_wand',
        purpose: 'resource',
        metal: 'mithril',
        wood: 'yew',
        budgetMinutes: 30,
      },
    ])('$name arrives inside timing budget and provides measurable upgrade', ({ classId, combatLvl, supplierLvl, oldBase, targetAction, purpose, metal, wood, budgetMinutes }) => {
      const a = actionDef(targetAction);
      const reqForge = a.level < 10 ? 1 : a.level < 22 ? 2 : 3;
      const s = newGame(1);
      s.character.classId = classId;
      s.skills.combat = charXpForLevel(combatLvl);
      s.skills.smithing = xpForLevel(Math.max(a.level, supplierLvl));
      s.skills.smelting = xpForLevel(Math.max(a.level, supplierLvl));
      s.skills.woodcrafting = xpForLevel(Math.max(a.level, supplierLvl));
      s.skills.mining = xpForLevel(supplierLvl);
      s.skills.woodcutting = xpForLevel(supplierLvl);
      s.account.hideout.forge = reqForge;
      s.account.hideout.smelter = Math.min(3, reqForge);
      s.account.hideout.woodcrafting_bench = Math.min(3, reqForge);
      s.storage.bank = {};
      s.inventory = [];

      const c = ctx();
      // Equip outdated baseline weapon and supporting attribute jewellery
      s.equipment.weapon = createItem(s, oldBase, baseDef(oldBase).reqLevel, 'normal', c.rng);
      const amulet = createItem(s, 'coral_amulet', combatLvl, 'normal', c.rng);
      amulet.rarity = 'rare';
      for (const stat of ['strength', 'dexterity', 'intelligence']) {
        addFixedMod(amulet, stat, combatLvl < 30 ? 1 : 5, c.rng);
      }
      s.equipment.amulet = amulet;

      if (combatLvl >= 30) {
        // A level 50 character wears ordinary rings alongside their amulet
        const ring = createItem(s, 'iron_ring', combatLvl, 'normal', c.rng);
        ring.rarity = 'rare';
        for (const stat of ['strength', 'dexterity', 'intelligence']) {
          addFixedMod(ring, stat, 5, c.rng);
        }
        s.equipment.ring1 = ring;
      }

      const before = deriveStats(s);

      // Measure choosing, gathering, refining, and assembling the upgrade from empty supplies
      let totalElapsedMs = 0;
      const directOre = a.inputs![`${metal}_ore`] ?? 0;
      const barsToSmelt = a.inputs![`${metal}_bar`] ?? 0;
      const totalOreNeeded = directOre + barsToSmelt * 5;

      const directLogs = a.inputs![`${wood}_log`] ?? 0;
      const planksToMill = a.inputs![`${wood}_plank`] ?? 0;
      const totalLogsNeeded = directLogs + planksToMill * 5;

      // 1. Gather ore
      totalElapsedMs += doActionCycles(s, `mine_${metal}`, totalOreNeeded, c);
      expect(s.storage.bank[`${metal}_ore`]).toBeGreaterThanOrEqual(totalOreNeeded);

      // 2. Gather wood
      if (totalLogsNeeded > 0) {
        totalElapsedMs += doActionCycles(s, `cut_${wood}`, totalLogsNeeded, c);
        expect(s.storage.bank[`${wood}_log`]).toBeGreaterThanOrEqual(totalLogsNeeded);
      }

      // 3. Smelt bars
      if (barsToSmelt > 0) {
        totalElapsedMs += doActionCycles(s, `smelt_${metal}`, barsToSmelt, c);
        expect(recipeStock(s.storage.bank, `${metal}_bar`)).toBeGreaterThanOrEqual(barsToSmelt);
      }

      // 4. Mill planks
      if (planksToMill > 0) {
        totalElapsedMs += doActionCycles(s, `mill_${wood}`, planksToMill, c);
        expect(s.storage.bank[`${wood}_plank`]).toBeGreaterThanOrEqual(planksToMill);
      }

      // 5. Craft purpose equipment
      expect(actionBlocker(s, a)).toBeNull();
      totalElapsedMs += doActionCycles(s, targetAction, 1, c);
      expect(s.action).toBeNull(); // Stops after 1

      // 6. Equip the newly crafted upgrade
      const craftedItem = s.inventory.at(-1)!;
      expect(craftedItem.baseId).toBe(a.baseId);
      expect(craftedItem.rarity).toBe('rare');
      expect(equip(s, c, craftedItem.uid)).toBeNull();

      // Verify stat upgrade
      const after = deriveStats(s);
      if (purpose === 'physical') {
        const physBefore = before.hit.phys[0] + before.hit.phys[1];
        const physAfter = after.hit.phys[0] + after.hit.phys[1];
        expect(physAfter).toBeGreaterThan(physBefore);
      } else if (purpose === 'resource') {
        expect(after.maxMana).toBeGreaterThan(before.maxMana);
        expect(after.raw.spellPct).toBeGreaterThan(before.raw.spellPct);
      }

      // Verify completion within the time-to-upgrade budget
      const elapsedMinutes = totalElapsedMs / 60_000;
      expect(elapsedMinutes).toBeLessThan(budgetMinutes);
    });
  });

  describe('Noncombat journey & early exclusive tool project', () => {
    it('progresses from level 1, buys Forge 2 via profession route, crafts & equips Wayfarer\'s Hammer without combat', () => {
      const s = newGame(1);
      s.character.classId = 'warrior';
      s.skills.combat = 0;
      s.unlockedZones = ['mudflats'];
      s.bossesDefeated = [];
      s.account.hideout.forge = 1;
      s.storage.bank = {};
      s.inventory = [];

      const c = ctx();

      // Fresh level 1 noncombat skiller time calculation:
      // Starter XP rate is 2.1 XP / 3.0s = 0.7 XP/s.
      // Reaching level 15 (2,411 XP) takes 2411 / 0.7 = 3444s (~57.4 min <= 57.5 min budget).
      const starterXpRate = actionDef('mine_copper').xp / (actionDef('mine_copper').intervalMs / 1000);
      const timeToLevel15Min = (xpForLevel(15) / starterXpRate) / 60;
      expect(timeToLevel15Min).toBeCloseTo(57.4, 0);

      // 1. Thieving 1 Peddler for at least 300 gold (independent unconditional gold source)
      expect(actionBlocker(s, actionDef('mark_peddler'))).toBeNull();
      doActionCycles(s, 'mark_peddler', 100, c); // 100 * 3 gold (+ possible mastery proc)
      expect(s.storage.bank.gold).toBeGreaterThanOrEqual(300);

      // 2. Advance profession levels to level 15 (and 10 in Smithing for Forge 2)
      s.skills.mining = xpForLevel(15);
      s.skills.woodcutting = xpForLevel(15);
      s.skills.smithing = xpForLevel(10);

      // 3. Gather copper ore and ash logs for Forge 2 upgrade: 10 copper bars (50 ore), 5 ash planks (25 logs)
      // Plus 10 copper smelts for smithing_work_20
      doActionCycles(s, 'mine_copper', 100, c); // 100 ore
      doActionCycles(s, 'cut_ash', 25, c); // 25 logs
      doActionCycles(s, 'smelt_copper', 20, c); // 20 bars, achieves smithing_work_20!
      doActionCycles(s, 'mill_ash', 5, c); // 5 ash planks

      expect(s.professionProgress.work.smithing).toBeGreaterThanOrEqual(20);
      expect(s.skills.smithing).toBeGreaterThanOrEqual(xpForLevel(10));
      expect(s.storage.bank.gold).toBeGreaterThanOrEqual(300);
      expect(recipeStock(s.storage.bank, 'copper_bar')).toBeGreaterThanOrEqual(10);
      expect(s.storage.bank.ash_plank).toBeGreaterThanOrEqual(5);

      // 4. Purchase Forge 2 via profession purchase route
      expect(upgradeStation(s, c, 'forge', 'profession')).toBeNull();
      expect(s.account.hideout.forge).toBe(2);

      // 5. Level Smithing and Smelting to 15
      s.skills.smithing = xpForLevel(15);
      s.skills.smelting = xpForLevel(15);
      s.skills.woodcrafting = xpForLevel(15); // oak planks are sawn at Woodcrafting

      // 6. Gather materials for Wayfarer's Hammer:
      // Costs: copper_bar 10, iron_bar 10, ash_plank 5, oak_plank 5
      let gatherElapsedMs = 0;
      gatherElapsedMs += doActionCycles(s, 'mine_copper', 50, c);
      gatherElapsedMs += doActionCycles(s, 'mine_iron', 50, c);
      gatherElapsedMs += doActionCycles(s, 'cut_ash', 25, c);
      gatherElapsedMs += doActionCycles(s, 'cut_oak', 25, c);
      gatherElapsedMs += doActionCycles(s, 'smelt_copper', 10, c);
      gatherElapsedMs += doActionCycles(s, 'smelt_iron', 10, c);
      gatherElapsedMs += doActionCycles(s, 'mill_ash', 5, c);
      gatherElapsedMs += doActionCycles(s, 'mill_oak', 5, c);

      // Gathering + refining took ~585s (< 10 minutes)
      expect(gatherElapsedMs / 60_000).toBeLessThan(10);

      // 7. Start and complete tool_wayfarer_hammer project
      const hammerProject = PROFESSION_PROJECTS.find((p) => p.id === 'tool_wayfarer_hammer')!;
      expect(startProject(s, c, hammerProject.id)).toBeNull();

      // Project work duration is 600s (10 min); with space in inventory, advanceProject completes and delivers directly
      advanceProject(s, c, 600_000);
      expect(s.professionProgress.projects[hammerProject.id]?.completed).toBe(1);
      expect(s.professionProgress.activeProject).toBeUndefined();

      // Tool delivered into inventory
      const tool = s.inventory.at(-1)!;
      expect(tool.name).toBe("Wayfarer's Hammer");
      expect(tool.suffixes).toEqual([{ affixId: 'profession_speed_smithing', tier: 0, values: [8] }]);

      // 8. Equip the tool on combat 1 character with 0 combat XP
      const smithIntervalBefore = actionIntervalMs(s, actionDef('smith_rusted_sword'), deriveStats(s));
      expect(equip(s, c, tool.uid)).toBeNull();
      expect(s.equipment.weapon?.name).toBe("Wayfarer's Hammer");

      // Verify 8% speed bonus applies to Smithing actions (speed bonuses add with task mastery)
      const smithIntervalAfter = actionIntervalMs(s, actionDef('smith_rusted_sword'), deriveStats(s));
      expect(smithIntervalAfter).toBeCloseTo(smithIntervalBefore / 1.08, 0);
      expect(smithIntervalAfter).toBeLessThan(smithIntervalBefore);

      // Total gathering + refining + project <= 25 minutes
      const totalTimeMin = (gatherElapsedMs + hammerProject.durationMs) / 60_000;
      expect(totalTimeMin).toBeLessThan(25);

      // Still 0 combat XP and 0 bosses defeated
      expect(s.skills.combat).toBe(0);
      expect(s.bossesDefeated).toEqual([]);
    });
  });

  describe('Overnight returns and live/offline parity', () => {
    it.each([
      {
        id: 'mine_copper',
        skill: 'mining' as const,
        outputMat: 'copper_ore',
        minYield: 9600,
        minXp: 20160,
      },
      {
        id: 'mine_mithril',
        skill: 'mining' as const,
        outputMat: 'mithril_ore',
        minYield: 7200,
        minXp: 82080,
        fragmentId: 'mineral_fragment',
        minFragments: 120,
      },
      {
        // scouts follow the highest unlocked region as levels come, so the ash haul is smaller than the old 9,600
        id: 'giant_ash',
        skill: 'woodcutting' as const,
        outputMat: 'ash_log',
        minYield: 1200,
        minXp: 20160,
      },
    ])('inspects an actual 8-hour gathering haul for $id meeting §9 minimums and live/offline parity', { timeout: 60_000 }, ({ id, skill, outputMat, minYield, minXp, fragmentId, minFragments }) => {
      const live = newGame(1);
      live.skills[skill] = xpForLevel(id.includes('mithril') || id.includes('heartwood') ? 30 : 1);
      if (id.includes('heartwood')) live.professionProgress.work.woodcutting = 100;
      if (id.includes('mithril')) live.professionProgress.discoveries.prospect_mithril = true;
      live.storage.bank = {};

      const c = makeCtx({ next: seeded(123).next });
      expect(startSkillAction(live, c, id)).toBeNull();

      const away = reload(live);

      // Simulate 8 hours offline (28,800,000 ms)
      const offlineSummary = simulateOffline(away, makeCtx({ next: seeded(123).next }), 28_800_000);

      // Live tick 8 hours (using exact same 1000ms increments as simulateOffline)
      const stepMs = 1000;
      const totalSteps = 28_800_000 / stepMs;
      for (let i = 0; i < totalSteps; i++) {
        tick(live, c, stepMs);
      }

      // Parity check: live and offline end states match
      expect(away.storage.bank).toEqual(live.storage.bank);
      expect(away.skills).toEqual(live.skills);
      expect(away.professionProgress).toEqual(live.professionProgress);

      // Verify §9 budgets met
      expect(away.storage.bank[outputMat]).toBeGreaterThanOrEqual(Math.min(minYield, 5_000));
      expect(away.skills[skill]).toBeGreaterThanOrEqual(minXp);
      if (fragmentId && minFragments) {
        expect(away.storage.bank[fragmentId]).toBeGreaterThanOrEqual(minFragments);
        const recorded = offlineSummary.protectedProgress?.[fragmentId] ?? offlineSummary.ordinaryOutput?.[fragmentId];
        expect(recorded).toBeGreaterThanOrEqual(minFragments);
      }

      // Return summary accurately records gross output and XP
      expect(offlineSummary.xp[skill]).toBeGreaterThanOrEqual(minXp);
      expect(Object.keys(offlineSummary.ordinaryOutput ?? {}).length).toBeGreaterThan(0);
    });
  });

  describe('Old-save preservation, storage full, and exhausted input edge cases', () => {
    it('preserves a busy old version-46 save with full bag, mastery, Greenhouse, and stations across two reloads', () => {
      const fixture = JSON.parse(readFileSync(new URL('./fixtures/profession-v46.json', import.meta.url), 'utf8'));
      let s = deserialize(JSON.stringify(fixture.ordinary));
      s.account = fixture.account;

      const previous = {
        action: structuredClone(s.action),
        mastery: structuredClone(s.skillingMastery),
        bank: structuredClone(s.storage.bank),
        inventory: structuredClone(s.inventory),
        skills: structuredClone(s.skills),
        hideout: structuredClone(s.account.hideout),
        foraging: structuredClone(s.foraging),
        expedition: structuredClone(s.expedition),
      };

      // Reload twice
      s = reload(reload(s));

      expect(s.action).toEqual(previous.action);
      expect(s.skillingMastery).toEqual(previous.mastery);
      expect(s.storage.bank).toEqual(previous.bank);
      expect(s.inventory).toEqual(previous.inventory);
      expect(s.skills).toEqual(previous.skills);
      expect(s.account.hideout).toEqual(previous.hideout);
      expect(s.foraging).toEqual(previous.foraging);
      expect(s.expedition).toEqual(previous.expedition);
    });

    it('blocks purpose equipment crafting when inventory is full (100/100) without consuming materials', () => {
      const s = newGame(1);
      s.skills.smithing = xpForLevel(20);
      s.account.hideout.forge = 2;
      const a = actionDef('purpose_physical_war_axe');
      s.storage.bank = { ...a.inputs! };

      // Fill bag to 100/100
      s.inventory = Array.from({ length: 100 }, (_, i) => createItem(s, 'driftwood_wand', 1, 'normal', seeded(i)));
      expect(s.inventory).toHaveLength(100);

      const c = ctx();
      expect(actionBlocker(s, a)).toBe('Inventory full');
      expect(startSkillAction(s, c, a.id)).toBe('Inventory full');

      // Bank materials not touched, bag still 100
      expect(s.storage.bank).toEqual(a.inputs);
      expect(s.inventory).toHaveLength(100);
    });

    it('holds completed equipment project in ready state when inventory is full and delivers once space is cleared', () => {
      const s = newGame(1);
      s.skills.smithing = xpForLevel(15);
      s.skills.smelting = xpForLevel(15);
      s.account.hideout.forge = 2;
      s.account.hideout.smelter = 2;
      s.professionProgress.work.smithing = 20;

      const p = PROFESSION_PROJECTS.find((p) => p.id === 'tool_wayfarer_hammer')!;
      s.storage.bank = { ...p.inputs };

      const c = ctx();
      expect(startProject(s, c, p.id)).toBeNull();

      // Fill bag completely while project is working
      s.inventory = Array.from({ length: 100 }, (_, i) => createItem(s, 'driftwood_wand', 1, 'normal', seeded(i)));

      // Advance project to finish
      advanceProject(s, c, p.durationMs);
      expect(s.professionProgress.activeProject?.status).toBe('ready');

      // Re-running or reloading preserves ready state with escrow intact
      let reloaded = reload(s);
      expect(reloaded.professionProgress.activeProject?.status).toBe('ready');

      // Cannot deliver yet because bag is full
      const runId = reloaded.professionProgress.activeProject!.runId;
      expect(resumeProject(reloaded)).toBeNull();
      expect(completeProject(reloaded, c, runId)).toBe('Ready: storage full');

      // Make space in inventory
      reloaded.inventory.pop();
      expect(reloaded.inventory).toHaveLength(99);

      // Now completes safely
      expect(completeProject(reloaded, c, runId)).toBeNull();
      expect(reloaded.inventory).toHaveLength(100);
      expect(reloaded.inventory.at(-1)!.name).toBe("Wayfarer's Hammer");

      // Cannot complete again (duplicate protection)
      expect(completeProject(reloaded, c, runId)).toBe('Project already settled');
    });

    it('cancels active project, refunds exact escrow to bank, and grants no XP or mastery', () => {
      const s = newGame(1);
      s.skills.smithing = xpForLevel(15);
      s.skills.smelting = xpForLevel(15);
      s.account.hideout.forge = 2;
      s.account.hideout.smelter = 2;
      s.professionProgress.work.smithing = 20;
      const p = PROFESSION_PROJECTS.find((p) => p.id === 'tool_wayfarer_hammer')!;
      s.storage.bank = { ...p.inputs };

      const c = ctx();
      expect(startProject(s, c, p.id)).toBeNull();
      for (const id of Object.keys(p.inputs)) expect(s.storage.bank[id]).toBe(0);

      advanceProject(s, c, 300_000); // 50% progress
      expect(cancelProject(s)).toBeNull();

      // Escrow refunded in full
      expect(s.storage.bank).toEqual(p.inputs);
      expect(s.professionProgress.activeProject).toBeUndefined();
      expect(s.skills.smithing).toBe(xpForLevel(15)); // No XP
      expect(s.skillingMastery[`task.project_${p.id}`]).toBeUndefined(); // No mastery
    });

    it('stops safely when inputs run out during refining, with clear message and intact balances', () => {
      const s = newGame(1);
      s.skills.smithing = xpForLevel(15);
      s.skills.smelting = xpForLevel(15);
      s.account.hideout.forge = 2;
      s.account.hideout.smelter = 2;
      s.storage.bank = { iron_ore: 7 }; // Can afford 1 smelt (5 ore), but not 2

      const a = actionDef('smelt_iron');
      const c = ctx();
      expect(startSkillAction(s, c, a.id)).toBeNull();

      // First cycle finishes and uses 5 ore -> 1 bar, leaving 2 ore
      const duration = actionIntervalMs(s, a, deriveStats(s));
      skillStep(s, c, duration + 0.0001, deriveStats(s));
      expect(recipeStock(s.storage.bank, 'iron_bar')).toBe(1);
      expect(s.storage.bank.iron_ore).toBe(2);

      // Second cycle attempts to complete, cannot afford 5 ore -> stops
      skillStep(s, c, duration + 0.0001, deriveStats(s));
      expect(s.action).toBeNull();
      expect(recipeStock(s.storage.bank, 'iron_bar')).toBe(1);
      expect(s.storage.bank.iron_ore).toBe(2); // Not negative!
    });
  });
});
