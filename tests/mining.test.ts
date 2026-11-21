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
    const c = makeCtx({ next: () => 0.01 });
    startSkillAction(s, c, 'mine_mithril');
    skillStep(s, c, 4001, deriveStats(s));
    expect(s.storage.bank.mineral_fragment).toBe(1);
  });

  it('offers all five fossils via drop chances on fossil deposits', () => {
    let s = newGame(1);
    s.skills.mining = xpForLevel(30);
    s.professionProgress.discoveries.prospect_iron = true;
    s.professionProgress.discoveries.prospect_mithril = true;

    const aIron = actionDef('mine_fossil_iron');
    expect(aIron.outputChance).toBe(0.5);
    expect(aIron.bonus?.map((b) => b.id)).toEqual(expect.arrayContaining(MINING_FOSSILS));

    const aMith = actionDef('mine_fossil_mithril');
    expect(aMith.outputChance).toBe(0.5);
    expect(aMith.bonus?.map((b) => b.id)).toEqual(expect.arrayContaining(MINING_FOSSILS));

    const c = makeCtx({ next: () => 0.01 });
    startSkillAction(s, c, aIron.id);
    skillStep(s, c, actionIntervalMs(s, aIron, deriveStats(s)) + 1, deriveStats(s));
    expect(s.storage.bank.iron_ore).toBe(1);
    expect(MINING_FOSSILS.some((f) => (s.storage.bank[f] ?? 0) > 0)).toBe(true);
  });

  it('drops project fragments on eligible deposits while rich mining grants none', () => {
    let s = newGame(1);
    s.skills.mining = xpForLevel(60);
    s.professionProgress.discoveries.prospect_adamant = true;
    s.professionProgress.discoveries.prospect_star = true;

    expect(actionDef('mine_rich_star').bonus).toBeUndefined();
    expect(actionDef('mine_crystal_star').bonus?.some((b) => b.id === 'mineral_fragment')).toBe(true);
    expect(actionDef('mine_crystal_star').bonus?.some((b) => b.id === 'stone_fragment')).toBe(true);
    expect(actionDef('mine_crystal_star').bonus?.some((b) => b.id === 'crystal_shard')).toBe(true);

    cycles(s, 'mine_rich_star', 10);
    expect(s.storage.bank.star_ore).toBe(20);
    expect(s.storage.bank.mineral_fragment ?? 0).toBe(0);
    expect(s.storage.bank.stone_fragment ?? 0).toBe(0);
  });

  it.each([
    ['mine_copper', 1],
    ['mine_mithril', 30],
    ['mine_crystal_star', 60],
  ] as const)('honors the eight-hour minimum and live/offline parity for %s', (id, level) => {
    const setup = () => {
      const s = newGame(1);
      s.skills.mining = xpForLevel(level);
      s.professionProgress.discoveries.prospect_star = true;
      expect(startSkillAction(s, makeCtx({ next: seeded(42).next }), id)).toBeNull();
      return s;
    };
    const online = setup(), offline = setup();
    const c = makeCtx({ next: seeded(42).next });
    for (let i = 0; i < 28800; i++) tick(online, c, 1000);
    const summary = simulateOffline(offline, makeCtx({ next: seeded(42).next }), 28_800_000);
    expect(offline.storage.bank).toEqual(online.storage.bank);
    expect(offline.professionProgress).toEqual(online.professionProgress);
    expect(offline.skills).toEqual(online.skills);
    expect(summary.stoppedReason).toBeNull();
  }, 30_000);

  it('shows known material uses and finishes the Mining tool safely without later recipes', () => {
    const s = newGame(1);
    s.skills.mining = xpForLevel(30);
    s.professionProgress.work.mining = 100;
    s.storage.bank = { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 };
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
    expect(actionsFor('smelting').some((a) => a.id === 'smelt_adamant')).toBe(true); // Phase 04 supplies refinement.
  });
});
