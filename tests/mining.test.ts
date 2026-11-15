import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MINING_FOSSILS, MINING_METALS } from '../src/data/mining';
import { actionDef, actionsFor } from '../src/data/skills';
import { materialDef } from '../src/data/materials';
import { makeCtx } from '../src/engine/context';
import { newGame, tick } from '../src/engine/state';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { deriveStats } from '../src/engine/stats';
import { xpForLevel } from '../src/engine/xp';
import { deserialize, serialize } from '../src/engine/save';
import { simulateOffline } from '../src/engine/offline';
import { advanceProject, startProject } from '../src/engine/professions';
import { equip, slotsFor } from '../src/engine/equipment';
import { miningPreview } from '../src/engine/mining';
import { seeded } from '../src/engine/rng';
import { itemName, eligibleAffixes } from '../src/engine/items';
import { baseDef, obtainable } from '../src/data/bases';
import { orbReason, essenceReason, benchCraftReason } from '../src/engine/crafting';
import type { GameState } from '../src/engine/types';

const zeroLuck = () => makeCtx({ next: () => 0.999999 });
function cycles(s: GameState, id: string, n: number, double = false) {
  const c = zeroLuck();
  expect(startSkillAction(s, c, id)).toBeNull();
  const a = actionDef(id);
  const d = deriveStats(s);
  if (s.action?.kind === 'skill') s.action.double = double;
  // One completion per call preserves the actual changing mastery speed.
  for (let i = 0; i < n; i++) skillStep(s, c, actionIntervalMs(s, a, d) - (s.action?.kind === 'skill' ? s.action.progress : 0) + 0.00001, d);
  return c;
}
const reload = (s: GameState) => { const a = structuredClone(s.account); s = deserialize(serialize(s)); s.account = a; return s; };

describe('Phase 02 Mining', () => {
  it('reaches every deposit without combat, trade, a station or mastery unlock', () => {
    const s = newGame(1);
    for (let i = 0; i < MINING_METALS.length; i++) {
      const m = MINING_METALS[i];
      s.skills.mining = xpForLevel(m.level);
      if (i >= 3) expect(actionBlocker(s, actionDef(`mine_${m.id}`))).toMatch(/Prospect/);
      if (i) {
        const previous = MINING_METALS[i - 1];
        cycles(s, `mine_${previous.id}`, 99);
        expect(s.professionProgress.discoveries[`prospect_${m.id}`]).toBeUndefined();
        cycles(s, `mine_${previous.id}`, 1, true);
        expect(s.professionProgress.discoveries[`prospect_${m.id}`]).toBe(true);
      }
      for (const a of actionsFor('mining').filter((a) => a.mining?.metal === m.id)) expect(actionBlocker(s, a)).toBeNull();
    }
    expect(s.skills.combat).toBe(0);
    expect(s.bossesDefeated).toEqual([]);
  });

  it('keeps old Iron/Mithril level-only, even on an old full-bag save loaded twice', () => {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/profession-v46.json', import.meta.url), 'utf8'));
    let s = deserialize(JSON.stringify(fixture.ordinary));
    s.account = structuredClone(fixture.account);
    const before = { xp: s.skills.mining, mastery: structuredClone(s.skillingMastery), inventory: structuredClone(s.inventory), progress: structuredClone(s.action) };
    s = reload(reload(s));
    expect(s.skills.mining).toBe(before.xp);
    expect(s.skillingMastery).toEqual(before.mastery);
    expect(s.inventory).toEqual(before.inventory);
    expect(s.action).toEqual(before.progress);
    s.skills.mining = xpForLevel(30);
    s.unlockedZones = ['mudflats'];
    expect(actionBlocker(s, actionDef('mine_iron'))).toBeNull();
    expect(actionBlocker(s, actionDef('mine_mithril'))).toBeNull();
    cycles(s, 'mine_mithril', 60);
    expect(s.account.bank.mineral_fragment).toBe(1);
  });

  it('rotates all five fossils within 60 zero-luck cycles, preserving partial progress across tiers/reload', () => {
    let s = newGame(1);
    s.skills.mining = xpForLevel(30);
    s.professionProgress.discoveries.prospect_iron = true;
    s.professionProgress.discoveries.prospect_mithril = true;
    cycles(s, 'mine_fossil_iron', 11);
    expect(miningPreview(s, actionDef('mine_fossil_iron')).join(' ')).toContain('Scorched Fossil in 1');
    s = reload(s);
    cycles(s, 'mine_fossil_mithril', 49);
    for (const f of MINING_FOSSILS) expect(s.account.bank[f]).toBe(1);
    expect(s.account.bank.iron_ore).toBe(5);
    expect(s.account.bank.mithril_ore).toBe(24);
    expect(s.account.bank.rough_gem ?? 0).toBe(0);
  });

  it('shares fragment counters across eligible deposits but rich mining grants no fragment progress', () => {
    let s = newGame(1);
    s.skills.mining = xpForLevel(60);
    s.professionProgress.discoveries.prospect_adamant = true;
    s.professionProgress.discoveries.prospect_star = true;
    cycles(s, 'mine_mithril', 59);
    cycles(s, 'mine_rich_star', 100);
    expect(s.account.bank.star_ore).toBe(200);
    expect(s.account.bank.mineral_fragment ?? 0).toBe(0);
    expect(s.professionProgress.counters['mining.stone_fragment']).toBeUndefined();
    cycles(s, 'mine_crystal_adamant', 29);
    s = reload(s);
    cycles(s, 'mine_crystal_star', 31, true);
    expect(s.account.bank.mineral_fragment).toBe(1);
    expect(s.account.bank.stone_fragment).toBe(1);
    expect(s.account.bank.crystal_shard).toBe(2);
    expect(s.account.bank.rough_gem).toBe(61);
    expect(s.professionProgress.counters['mining.stone_fragment']).toBe(60);
    expect(s.professionProgress.work.mining).toBe(219);
  });

  it('rare extras accelerate protected progress without replacing the deterministic threshold', () => {
    const s = newGame(1);
    s.skills.mining = xpForLevel(30);
    cycles(s, 'mine_mithril', 59);
    const c = makeCtx({ next: () => 0 });
    if (s.action?.kind === 'skill') s.action.double = true;
    skillStep(s, c, actionIntervalMs(s, actionDef('mine_mithril'), deriveStats(s)) + 1, deriveStats(s));
    expect(s.account.bank.mineral_fragment).toBe(2); // one bound + one accelerator, never four
    expect(s.professionProgress.counters['mining.mineral_fragment']).toBe(60);
  });

  it.each([
    ['mine_copper', 1, { copper_ore: 9600 }, {}],
    ['mine_mithril', 30, { mithril_ore: 7200 }, { mineral_fragment: 120 }],
    ['mine_crystal_star', 60, { rough_gem: 2400, star_ore: 1200 }, { crystal_shard: 80, mineral_fragment: 40, stone_fragment: 40 }],
  ] as const)('honors the eight-hour minimum and live/offline parity for %s', (id, level, ordinary, protectedOutput) => {
    const setup = () => {
      const s = newGame(1);
      s.skills.mining = xpForLevel(level);
      s.professionProgress.discoveries.prospect_star = true;
      expect(startSkillAction(s, zeroLuck(), id)).toBeNull();
      return s;
    };
    const online = setup(), offline = setup();
    const c = zeroLuck();
    for (let i = 0; i < 28800; i++) tick(online, c, 1000);
    const summary = simulateOffline(offline, zeroLuck(), 28_800_000);
    expect(offline.account.bank).toEqual(online.account.bank);
    expect(offline.professionProgress).toEqual(online.professionProgress);
    expect(offline.skills).toEqual(online.skills);
    for (const [mat, n] of Object.entries({ ...ordinary, ...protectedOutput })) expect(offline.account.bank[mat]).toBeGreaterThanOrEqual(n!);
    expect(summary.protectedProgress ?? {}).toEqual(Object.fromEntries(Object.keys(protectedOutput).map((id) => [id, offline.account.bank[id]])));
    expect(summary.stoppedReason).toBeNull();
  }, 30_000);

  it('shows known material uses and finishes the Mining tool safely without later recipes', () => {
    const s = newGame(1);
    s.skills.mining = xpForLevel(30);
    s.professionProgress.work.mining = 100;
    s.account.bank = { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 };
    const c = makeCtx(seeded(5));
    expect(startProject(s, c, 'tool_mining')).toBeNull();
    advanceProject(s, c, 1_200_000);
    const pick = s.inventory.find((i) => i.baseId === 'profession_hammer')!;
    expect(pick.name).toBe("Prospector's Pick");
    expect(itemName(pick)).toBe("Prospector's Pick");
    expect(obtainable(baseDef(pick.baseId))).toBe(false);
    expect(eligibleAffixes(pick, 'suffix').some((a) => a.id === 'profession_speed_mining')).toBe(false);
    expect(orbReason(s, 'alteration', pick.uid)).toMatch(/fixed/);
    expect(essenceReason(s, 'essence_haste_2', pick.uid)).toMatch(/fixed/);
    expect(benchCraftReason(s, 'life_1', pick.uid)).toMatch(/fixed/);
    expect(pick.prefixes).toEqual([]);
    expect(pick.suffixes).toEqual([{ affixId: 'profession_speed_mining', tier: 0, values: [8] }]);
    expect(slotsFor(pick)).toEqual(['weapon']);
    const before = actionIntervalMs(s, actionDef('mine_mithril'), deriveStats(s));
    expect(equip(s, c, pick.uid)).toBeNull();
    expect(actionIntervalMs(s, actionDef('mine_mithril'), deriveStats(s))).toBeCloseTo(before / 1.08);
    expect(deriveStats(s).skillSpeed).toBe(0);
    expect(materialDef('crystal_shard').desc).toMatch(/Exceptional Crystal/);
    for (const id of ['mineral_fragment', 'stone_fragment']) expect(materialDef(id).desc).toMatch(/future/);
    expect(materialDef('world_ore').desc).toMatch(/Smelt 5/);
    expect(actionsFor('smithing').some((a) => a.id === 'smelt_adamant')).toBe(true); // Phase 04 supplies refinement.
  });
});
