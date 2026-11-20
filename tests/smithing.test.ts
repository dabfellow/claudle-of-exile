import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ACTIONS, actionDef, actionsFor } from '../src/data/skills';
import { BASES, baseDef, obtainable } from '../src/data/bases';
import { affixDef } from '../src/data/affixes';
import { PROFESSION_PROJECTS } from '../src/data/professionProjects';
import { SMITH_COMPONENTS } from '../src/data/smithing';
import { makeCtx } from '../src/engine/context';
import { newGame, tick } from '../src/engine/state';
import { actionBlocker, actionIntervalMs, skillStep, smithIlvl, startSkillAction } from '../src/engine/skills';
import { createPurposeItem, purposeGuarantees, smithingPreview } from '../src/engine/smithing';
import { addFixedMod, allMods, createItem, spawnWeight } from '../src/engine/items';
import { deriveStats } from '../src/engine/stats';
import { charXpForLevel, xpForLevel } from '../src/engine/xp';
import { deserialize, serialize } from '../src/engine/save';
import { simulateOffline } from '../src/engine/offline';
import { advanceProject, cancelProject, completeProject, resumeProject, startProject } from '../src/engine/professions';
import { equip, equipReason } from '../src/engine/equipment';
import { seeded } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';

const ctx = () => makeCtx({ next: () => 0.999999 });
const reload = (s: GameState) => { const account = structuredClone(s.account); s = deserialize(serialize(s)); s.account = account; return s; };
function smith(level = 90, forge = 3) {
  const s = newGame(1);
  s.skills.smithing = xpForLevel(level);
  s.skills.smelting = xpForLevel(level);
  s.skills.woodcrafting = xpForLevel(level);
  s.account.hideout.forge = forge;
  s.account.hideout.smelter = Math.min(3, forge);
  s.account.hideout.woodcrafting_bench = Math.min(3, forge);
  return s;
}
function finish(s: GameState, id: string, double = false) {
  const a = actionDef(id), c = ctx();
  expect(startSkillAction(s, c, id)).toBeNull();
  if (s.action?.kind === 'skill') s.action.double = double;
  skillStep(s, c, actionIntervalMs(s, a, deriveStats(s)) + 0.001, deriveStats(s));
  return c;
}

describe('Phase 04 Smithing', () => {
  it.each([
    ['purpose_physical_war_axe', 'felling_axe', 20, 15, 'physical'],
    ['purpose_physical_ash_longbow', 'hunting_bow', 20, 15, 'physical'],
    ['purpose_resource_coral_wand', 'bone_wand', 20, 15, 'resource'],
    ['purpose_physical_butcher_axe', 'war_axe', 50, 30, 'physical'],
  ] as const)('gathers, refines and equips a useful %s upgrade from empty supplies inside the timing budget', (id, oldBase, combat, supplier, purpose) => {
    const a = actionDef(id), s = smith(Math.max(a.level, supplier), a.level < 22 ? 2 : 3), c = ctx();
    s.character.classId = oldBase.includes('bow') ? 'ranger' : purpose === 'resource' ? 'mage' : 'warrior';
    s.skills.combat = charXpForLevel(combat); s.skills.mining = xpForLevel(supplier); s.skills.woodcutting = xpForLevel(supplier);
    // Existing legal attribute jewellery supports the chosen weapon; its old damage rolls are poor.
    const amulet = createItem(s, 'coral_amulet', combat, 'normal', c.rng); amulet.rarity = 'rare';
    for (const stat of ['strength', 'dexterity', 'intelligence']) addFixedMod(amulet, stat, combat < 30 ? 1 : 5, c.rng);
    s.equipment.amulet = amulet; s.equipment.weapon = createItem(s, oldBase, baseDef(oldBase).reqLevel, 'normal', c.rng);
    const before = deriveStats(s); let elapsed = 0;
    const doCycles = (action: string, n: number) => {
      const recipe = actionDef(action); expect(startSkillAction(s, c, action)).toBeNull();
      for (let i = 0; i < n; i++) {
        const duration = actionIntervalMs(s, recipe, deriveStats(s)); elapsed += duration;
        skillStep(s, c, duration + 0.00001, deriveStats(s));
      }
    };
    const metal = supplier < 30 ? 'iron' : 'mithril', wood = supplier < 30 ? 'oak' : 'yew';
    const barsNeeded = a.inputs![`${metal}_bar`] ?? 0;
    const planksNeeded = a.inputs![`${wood}_plank`] ?? 0;
    const oreNeeded = (a.inputs![`${metal}_ore`] ?? 0) + barsNeeded * 5;
    const logsNeeded = (a.inputs![`${wood}_log`] ?? 0) + planksNeeded * 5;
    doCycles(`mine_${metal}`, oreNeeded + 10);
    doCycles(`cut_${wood}`, logsNeeded + 5);
    if (barsNeeded > 0) doCycles(`smelt_${metal}`, barsNeeded);
    if (planksNeeded > 0) doCycles(`mill_${wood}`, planksNeeded);
    doCycles(id, 1);
    expect(equip(s, c, s.inventory.at(-1)!.uid)).toBeNull();
    const after = deriveStats(s);
    if (purpose === 'physical') expect(after.hit.phys[0] + after.hit.phys[1]).toBeGreaterThan(before.hit.phys[0] + before.hit.phys[1]);
    else { expect(after.maxMana).toBeGreaterThan(before.maxMana); expect(after.raw.spellPct).toBeGreaterThan(before.raw.spellPct); }
    expect(elapsed).toBeLessThan((combat < 30 ? 15 : 30) * 60_000);
    expect(s.action).toBeNull();
  });
  it('keeps every cheap base and expands only compatible obtainable purpose pairs', () => {
    for (const b of BASES.filter((b) => !b.projectOnly)) expect(actionDef(`smith_${b.id}`).baseId).toBe(b.id);
    const purposes = [...actionsFor('smithing'), ...actionsFor('woodcrafting')].filter((a) => a.purpose);
    expect(purposes.length).toBeGreaterThan(500);
    for (const a of purposes) {
      const b = baseDef(a.baseId!);
      expect(obtainable(b)).toBe(true);
      expect(a.purpose!.guarantees).toHaveLength(2);
      for (const id of a.purpose!.guarantees) expect(spawnWeight(affixDef(id), b)).toBeGreaterThan(0);
      expect(a.level).toBe(Math.max(1, b.reqLevel));
      expect(a.intervalMs).toBe(60_000 + b.reqLevel * 2000);
      expect(a.xp).toBeCloseTo(18 + b.reqLevel * 1.8);
      const cheap = actionDef(`smith_${b.id}`);
      for (const [id, n] of Object.entries(cheap.inputs!)) expect(a.inputs![id]).toBe(n * 2);
    }
    expect(purposes.some((a) => a.baseId === 'profession_hammer')).toBe(false);
    expect(purposes.some((a) => a.purpose!.id === 'protection' && baseDef(a.baseId!).tags.includes('int_armour') && !baseDef(a.baseId!).tags.includes('str_armour') && !baseDef(a.baseId!).tags.includes('dex_armour'))).toBe(false);
  });

  it('equips a protective replacement with actual increased life and armour', () => {
    const s = smith(16, 2), c = ctx(); s.skills.combat = charXpForLevel(20);
    const amulet = createItem(s, 'coral_amulet', 16, 'normal', c.rng); amulet.rarity = 'magic';
    addFixedMod(amulet, 'strength', 1, c.rng); s.equipment.amulet = amulet;
    s.equipment.helmet = createItem(s, 'blackened_sallet', 8, 'normal', c.rng);
    const before = deriveStats(s), a = actionDef('purpose_protection_soldier_helm');
    s.storage.bank = { ...a.inputs! }; finish(s, a.id);
    expect(equip(s, c, s.inventory.at(-1)!.uid)).toBeNull();
    expect(deriveStats(s).maxLife).toBeGreaterThan(before.maxLife);
    expect(deriveStats(s).armour).toBeGreaterThan(before.armour);
  });

  it('delivers all advertised pairs/minimums and exactly four legal mods across every base and RNG endpoint', () => {
    const s = smith();
    for (const a of [...actionsFor('smithing'), ...actionsFor('woodcrafting')].filter((a) => a.purpose)) for (const value of [0, 0.999999]) {
      const item = createPurposeItem(s, a, Math.max(a.level, 45), { next: () => value });
      const mods = allMods(item);
      expect(item.rarity).toBe('rare');
      expect(mods, a.id).toHaveLength(4);
      expect(item.prefixes.length).toBeLessThanOrEqual(3);
      expect(item.suffixes.length).toBeLessThanOrEqual(3);
      expect(new Set(mods.map((m) => affixDef(m.affixId).group)).size).toBe(4);
      for (const { affix, tier, ranges } of purposeGuarantees(a, item.ilvl)) {
        const mod = mods.find((m) => m.affixId === affix.id)!;
        expect(mod.tier).toBe(tier);
        expect(mod.values).toEqual(ranges.map(([lo, hi]) => value === 0 ? lo : hi));
      }
      expect(smithingPreview(a, item.ilvl).filter((l) => l.startsWith('Guaranteed minimum'))).toHaveLength(2);
      expect(mods.every((m) => !m.fractured && !affixDef(m.affixId).benchOnly && !affixDef(m.affixId).uniqueOnly)).toBe(true);
    }
  });

  it('follows skill/station strength without combat and preserves level/attribute equip restrictions', () => {
    const s = smith(90, 1);
    expect(smithIlvl(s, 6)).toBe(21);
    s.account.hideout.forge = 2; expect(smithIlvl(s, 6)).toBe(45);
    s.account.hideout.forge = 3; s.account.hideout.woodcrafting_bench = 3; expect(smithIlvl(s, 6)).toBe(90);
    s.storage.bank = { ...actionDef('purpose_physical_yew_recurve').inputs };
    finish(s, 'purpose_physical_yew_recurve');
    expect(s.inventory.at(-1)!.ilvl).toBe(90);
    expect(equipReason(s, s.inventory.at(-1)!)).toBe('Requires level 30');
    s.skills.combat = charXpForLevel(30);
    expect(equipReason(s, s.inventory.at(-1)!)).toMatch(/Dexterity/);
    expect(s.bossesDefeated).toEqual([]);
    expect(s.unlockedZones).toEqual(['mudflats']);
  });

  it('ignores catalysts, salvage and manual doubles, pays once, then stops after one kept result', () => {
    const s = smith(15, 2), a = actionDef('purpose_resource_coral_wand');
    s.storage.bank = { ...a.inputs!, oak_resin: 1, frigid_fossil: 1 };
    s.smithCatalyst = { ...s.smithCatalyst, resin: 'oak_resin', fossil: 'frigid_fossil', salvageAll: true, salvageFull: true, salvageMisses: true, until: true };
    finish(s, a.id, true);
    expect(s.inventory).toHaveLength(1);
    expect(s.inventory[0].ilvl).toBe(15);
    expect(s.storage.bank.oak_resin).toBe(1); expect(s.storage.bank.frigid_fossil).toBe(1);
    for (const id of Object.keys(a.inputs!)) expect(s.storage.bank[id]).toBe(0);
    expect(s.action).toBeNull();
    expect(s.lifetime.itemsSmithed).toBe(1);
  });

  it('stops before payment/UID allocation when storage fills or nominal inputs disappear during work', () => {
    const s = smith(), a = actionDef('purpose_physical_yew_recurve');
    s.storage.bank = { ...a.inputs! }; const paid = { ...s.storage.bank };
    expect(startSkillAction(s, ctx(), a.id)).toBeNull();
    s.inventory = Array.from({ length: 100 }, () => createItem(s, 'driftwood_wand', 1, 'normal', ctx().rng));
    s.smithCatalyst.salvageAll = true; s.smithCatalyst.salvageFull = true;
    const uid = s.nextUid;
    skillStep(s, ctx(), 200_000, deriveStats(s));
    expect(s.storage.bank).toEqual(paid); expect(s.nextUid).toBe(uid); expect(s.action).toBeNull();
    s.inventory.pop(); expect(startSkillAction(s, ctx(), a.id)).toBeNull();
    s.storage.bank.mithril_bar = 1;
    skillStep(s, ctx(), 200_000, deriveStats(s));
    expect(s.inventory).toHaveLength(99); expect(s.storage.bank.mithril_ore).toBe(paid.mithril_ore); expect(s.action).toBeNull();
  });

  it.each(SMITH_COMPONENTS.filter((a) => a.protectedOutputs))('pays full protected costs for $id despite conservation/doubles and safely stops on exhaustion', (raw) => {
    let s = smith(), a = actionDef(raw.id);
    s.storage.bank = { ...a.inputs! }; s.skillPassives.push('core_steady'); s.skillingMastery[`task.${a.id}`] = 432000;
    s.inventory = Array.from({ length: 100 }, () => createItem(s, 'driftwood_wand', 1, 'normal', ctx().rng));
    expect(startSkillAction(s, ctx(), a.id)).toBeNull(); s = reload(s);
    if (s.action?.kind === 'skill') s.action.double = true;
    skillStep(s, makeCtx({ next: () => 0 }), actionIntervalMs(s, a, deriveStats(s)) + 0.001, deriveStats(s));
    for (const id of Object.keys(a.inputs!)) expect(s.storage.bank[id]).toBe(0);
    const output = Object.keys(a.protectedOutputs!)[0]; expect(s.storage.bank[output]).toBe(1);
    skillStep(s, ctx(), 200_000, deriveStats(s)); expect(s.action).toBeNull();
    expect(s.inventory).toHaveLength(100); expect(a.mastery?.profile).toBe('project');
    const locked = smith(a.level, raw.forge! - 1); locked.storage.bank = { ...a.inputs! };
    expect(actionBlocker(locked, a)).toMatch(/Forge|Smelter|Woodcrafting Bench/);
  });

  it('offers all four advanced smelts at Forge 1 with exact ladder XP/costs', () => {
    for (const [i, metal] of ['adamant', 'star', 'void', 'world'].entries()) {
      const s = smith(45 + i * 15, 1), a = actionDef(`smelt_${metal}`);
      s.storage.bank = { [`${metal}_ore`]: 5 }; finish(s, a.id);
      expect(s.storage.bank[`${metal}_bar`]).toBe(1); expect(s.storage.bank[`${metal}_ore`]).toBe(0);
      expect(a.xp).toBeCloseTo([8, 12, 16, 20][i]);
    }
  });

  it('matches live/offline gear, costs, XP and a one-item return summary after reload', () => {
    const live = smith(30), a = actionDef('purpose_physical_yew_recurve'); live.storage.bank = { ...a.inputs! };
    startSkillAction(live, ctx(), a.id); const away = reload(live);
    const c = makeCtx(seeded(42)); for (let i = 0; i < 2400; i++) tick(live, c, 50);
    const summary = simulateOffline(away, makeCtx(seeded(42)), 120_000);
    expect(away.inventory).toEqual(live.inventory); expect(away.storage.bank).toEqual(live.storage.bank);
    expect(away.skills).toEqual(live.skills); expect(away.professionProgress).toEqual(live.professionProgress);
    expect(summary.items).toBe(1); expect(away.action).toBeNull(); expect(summary.xp[a.skill]).toBeCloseTo(a.xp);
  });

  it('completes the actual early hammer with cancel/refund, full-bag ready/reload and duplicate protection', () => {
    let s = smith(15, 2); const p = PROFESSION_PROJECTS.find((p) => p.id === 'tool_wayfarer_hammer')!;
    s.professionProgress.work.smithing = 20; s.storage.bank = { ...p.inputs };
    expect(startProject(s, ctx(), p.id)).toBeNull(); expect(cancelProject(s)).toBeNull(); expect(s.storage.bank).toEqual(p.inputs);
    expect(startProject(s, ctx(), p.id)).toBeNull();
    s.inventory = Array.from({ length: 100 }, () => createItem(s, 'driftwood_wand', 1, 'normal', ctx().rng));
    advanceProject(s, ctx(), 600_000); expect(s.professionProgress.activeProject?.status).toBe('ready');
    s = reload(s); s.inventory.pop(); expect(resumeProject(s)).toBeNull();
    const runId = s.professionProgress.activeProject!.runId;
    expect(completeProject(s, ctx(), runId)).toBeNull(); expect(completeProject(s, ctx(), runId)).toBe('Project already settled');
    const tool = s.inventory.at(-1)!; expect(tool.name).toBe("Wayfarer's Hammer");
    expect(tool.suffixes).toEqual([{ affixId: 'profession_speed_smithing', tier: 0, values: [8] }]);
    const interval = actionIntervalMs(s, actionDef('smith_rusted_sword'), deriveStats(s));
    expect(equip(s, ctx(), tool.uid)).toBeNull();
    expect(actionIntervalMs(s, actionDef('smith_rusted_sword'), deriveStats(s))).toBeCloseTo(interval / 1.08);
    expect(s.skills.combat).toBe(0); expect(s.professionProgress.projects[p.id].completed).toBe(1);
    for (const id of Object.keys(p.inputs)) expect(s.storage.bank[id]).toBe(0);
  });

  it('preserves a busy old full-bag save with mastery and existing material balances across two loads', () => {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/profession-v46.json', import.meta.url), 'utf8'));
    let s = deserialize(JSON.stringify(fixture.ordinary));
    s.account = fixture.account;
    const previous = { action: structuredClone(s.action), mastery: structuredClone(s.skillingMastery), bank: structuredClone(s.storage.bank), inventory: structuredClone(s.inventory) };
    s = reload(reload(s));
    expect(s.action).toEqual(previous.action); expect(s.skillingMastery).toEqual(previous.mastery);
    expect(s.storage.bank).toEqual(previous.bank); expect(s.inventory).toEqual(previous.inventory);
    expect(ACTIONS.some((a) => a.id.includes('woundmaker'))).toBe(false);
    expect(PROFESSION_PROJECTS.some((p) => p.id === 'woundmaker')).toBe(true); // Finished exclusive project added in Phase14, never a cheap base action.
  });
});
