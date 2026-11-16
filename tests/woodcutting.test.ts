import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { WOODS } from '../src/data/woodcutting';
import { actionDef, actionsFor } from '../src/data/skills';
import { RESINS } from '../src/data/craftMats';
import { materialDef } from '../src/data/materials';
import { makeCtx } from '../src/engine/context';
import { newGame, tick } from '../src/engine/state';
import { actionBlocker, actionIntervalMs, resinBonus, setSmithCatalyst, skillStep, smithIlvl, startSkillAction } from '../src/engine/skills';
import { deriveStats } from '../src/engine/stats';
import { xpForLevel } from '../src/engine/xp';
import { deserialize, serialize } from '../src/engine/save';
import { simulateOffline } from '../src/engine/offline';
import { advanceProject, startProject } from '../src/engine/professions';
import { equip } from '../src/engine/equipment';
import { woodcuttingPreview } from '../src/engine/woodcutting';
import type { GameState } from '../src/engine/types';

const zeroLuck = () => makeCtx({ next: () => 0.999999 });
function cycles(s: GameState, id: string, n: number, double = false) {
  const c = zeroLuck(), a = actionDef(id);
  expect(startSkillAction(s, c, id)).toBeNull();
  if (s.action?.kind === 'skill') s.action.double = double;
  for (let i = 0; i < n; i++) skillStep(s, c, actionIntervalMs(s, a, deriveStats(s)) - (s.action?.kind === 'skill' ? s.action.progress : 0) + 0.00001, deriveStats(s));
  return c;
}
const reload = (s: GameState) => { const account = structuredClone(s.account); s = deserialize(serialize(s)); s.account = account; return s; };

describe('Phase 03 Woodcutting', () => {
  it('reaches every timber and resin source without combat or another profession', () => {
    const s = newGame(1);
    for (let i = 0; i < WOODS.length; i++) {
      const w = WOODS[i];
      s.skills.woodcutting = xpForLevel(w.level);
      for (const a of actionsFor('woodcutting').filter((a) => a.woodcutting?.wood === w.id && a.id !== 'cut_heartwood')) expect(actionBlocker(s, a)).toBeNull();
    }
    expect(s.skills.combat).toBe(0);
    expect(s.skills.smithing).toBe(0);
    expect(s.bossesDefeated).toEqual([]);
  });

  it.each(WOODS)('guarantees $name resin every five cycles, logs every two and separately selected refinement', (w) => {
    let s = newGame(1);
    s.skills.woodcutting = xpForLevel(w.level);
    s.professionProgress.discoveries[`wood_${w.id}_survey`] = true;
    cycles(s, `cut_resin_${w.id}`, 4);
    expect(s.account.bank[`${w.id}_resin`] ?? 0).toBe(0);
    s = reload(s);
    cycles(s, `cut_resin_${w.id}`, 6);
    expect(s.account.bank[`${w.id}_resin`]).toBe(2);
    expect(s.account.bank[`${w.id}_log`]).toBe(5);
    expect(s.professionProgress.counters[`wood.survey.${w.id}`]).toBeUndefined();
    expect(s.account.bank.heartwood_fragment ?? 0).toBe(0);
    cycles(s, `mill_${w.id}`, 1);
    expect(s.account.bank[`${w.id}_plank`]).toBe(1);
    expect(s.account.bank[`${w.id}_log`]).toBe(0);
    skillStep(s, zeroLuck(), 30_000, deriveStats(s));
    expect(s.action).toBeNull();
  });

  it('bounds one heartwood by 600 survey cycles + one refinement with protected full costs', () => {
    let s = newGame(1);
    s.skills.woodcutting = xpForLevel(30);
    expect(actionBlocker(s, actionDef('cut_heartwood'))).toBeNull();
    cycles(s, 'cut_heartwood', 29);
    expect(woodcuttingPreview(s, actionDef('cut_heartwood')).join(' ')).toContain('next in 1');
    s = reload(s);
    cycles(s, 'cut_heartwood', 571, true);
    expect(s.account.bank.heartwood_fragment).toBe(20);
    expect(s.professionProgress.counters['wood.heartwood.survey']).toBe(600);
    expect(s.account.bank.ancient_heartwood ?? 0).toBe(0);
    // Even maximum ordinary conservation/manual output must not create free protected refinements.
    s.skillingMastery['task.mill_heartwood'] = 432000;
    s.skillPassives.push('core_steady');
    expect(actionDef('mill_heartwood').mastery?.profile).toBe('project');
    cycles(s, 'mill_heartwood', 1, true);
    expect(s.account.bank.ancient_heartwood).toBe(1);
    expect(s.account.bank.heartwood_fragment).toBe(0);
    skillStep(s, zeroLuck(), 30_000, deriveStats(s));
    expect(s.action).toBeNull();
    expect(actionBlocker(s, actionDef('mill_heartwood'))).toBe('Missing materials');
    s.account.bank.heartwood_fragment = 20;
    expect(startSkillAction(s, makeCtx({ next: () => 0 }), 'mill_heartwood')).toBeNull();
    skillStep(s, makeCtx({ next: () => 0 }), 25001, deriveStats(s));
    expect(s.account.bank.heartwood_fragment).toBe(0); // Steady Hands would conserve ordinary inputs with this RNG
    expect(s.account.bank.ancient_heartwood).toBe(2);
  });

  it('shares incidental progress across ancient timber/reload but keeps the faster survey counter separate', () => {
    let s = newGame(1);
    s.skills.woodcutting = xpForLevel(90);
    s.professionProgress.work.woodcutting = 100;
    for (const w of WOODS) s.professionProgress.discoveries[`wood_${w.id}_survey`] = true;
    cycles(s, 'cut_ancient', 59);
    cycles(s, 'cut_heartwood', 29);
    cycles(s, 'cut_resin_worldwood', 100);
    expect(s.account.bank.heartwood_fragment ?? 0).toBe(0);
    s = reload(s);
    cycles(s, 'cut_spirit', 1, true);
    expect(s.account.bank.heartwood_fragment).toBe(1);
    cycles(s, 'cut_heartwood', 1, true);
    expect(s.account.bank.heartwood_fragment).toBe(2);
    const c = makeCtx({ next: () => 0 });
    s.professionProgress.counters['wood.heartwood.survey'] = 59;
    skillStep(s, c, 8001, deriveStats(s));
    expect(s.account.bank.heartwood_fragment).toBe(4); // one threshold + one optional extra
  });

  it.each([
    ['cut_ash', 1, { ash_log: 9600 }, {}],
    ['cut_resin_oak', 15, { oak_log: 2742, oak_resin: 1097 }, {}],
    ['cut_heartwood', 30, { yew_log: 1800 }, { heartwood_fragment: 120 }],
    ['cut_ancient', 60, { ancient_log: 4800 }, { heartwood_fragment: 80 }],
  ] as const)('matches actual eight-hour live/offline output for %s', (id, level, ordinary, protectedOutput) => {
    const setup = () => {
      const s = newGame(1);
      s.skills.woodcutting = xpForLevel(level);
      s.professionProgress.work.woodcutting = 100;
      s.professionProgress.discoveries.wood_ancient_survey = true;
      expect(startSkillAction(s, zeroLuck(), id)).toBeNull();
      return s;
    };
    const online = setup(), offline = setup();
    const c = zeroLuck();
    for (let i = 0; i < 28800; i++) tick(online, c, 1000);
    const summary = simulateOffline(offline, zeroLuck(), 28_800_000);
    expect(offline.account.bank).toEqual(online.account.bank);
    expect(offline.skills).toEqual(online.skills);
    expect(offline.professionProgress).toEqual(online.professionProgress);
    for (const [mat, n] of Object.entries({ ...ordinary, ...protectedOutput })) expect(offline.account.bank[mat]).toBeGreaterThanOrEqual(n!);
    expect(summary.protectedProgress ?? {}).toEqual(Object.fromEntries(Object.keys(protectedOutput).map((id) => [id, offline.account.bank[id]])));
    expect(summary.stoppedReason).toBeNull();
  }, 30_000);

  it('preserves a busy old full-bag save and does not backfill new surveys or materials', () => {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/profession-v46.json', import.meta.url), 'utf8'));
    let s = deserialize(JSON.stringify(fixture.ordinary));
    s.account = structuredClone(fixture.account);
    const before = { inventory: structuredClone(s.inventory), mastery: structuredClone(s.skillingMastery), action: structuredClone(s.action), skills: { ...s.skills } };
    s = reload(reload(s));
    expect(s.inventory).toEqual(before.inventory);
    expect(s.skillingMastery).toEqual(before.mastery);
    expect(s.action).toEqual(before.action);
    expect(s.skills).toEqual(before.skills);
    s.skills.woodcutting = xpForLevel(90);
    s.unlockedZones = ['mudflats'];
    expect(actionBlocker(s, actionDef('cut_yew'))).toBeNull();
    expect(actionBlocker(s, actionDef('cut_ironwood'))).toBeNull();
    expect(s.account.bank.heartwood_fragment ?? 0).toBe(0);
    cycles(s, 'cut_heartwood', 30);
    expect(s.account.bank.heartwood_fragment).toBe(1);
  });

  it('refines identical protected live/offline output and spending, then stops on exhausted nominal inputs', () => {
    const setup = () => {
      const s = newGame(1);
      s.skills.woodcutting = xpForLevel(30);
      s.account.bank.heartwood_fragment = 40;
      s.skillPassives.push('core_steady');
      s.skillingMastery['task.mill_heartwood'] = 432000;
      expect(startSkillAction(s, zeroLuck(), 'mill_heartwood')).toBeNull();
      return s;
    };
    const online = setup(), offline = reload(setup());
    const c = makeCtx({ next: () => 0 });
    for (let i = 0; i < 90; i++) tick(online, c, 1000);
    const summary = simulateOffline(offline, makeCtx({ next: () => 0 }), 28_800_000);
    expect(offline.account.bank).toEqual(online.account.bank);
    expect(offline.skills).toEqual(online.skills);
    expect(offline.professionProgress).toEqual(online.professionProgress);
    expect(offline.account.bank.ancient_heartwood).toBe(2);
    expect(offline.account.bank.heartwood_fragment).toBe(0);
    expect(summary.protectedProgress).toEqual({ ancient_heartwood: 2 });
    expect(summary.materials.heartwood_fragment).toBe(-40);
    expect(summary.stoppedReason).toMatch(/Missing materials/);
    expect(offline.action).toBeNull();
  });

  it('uses every resin through actual capped Smithing and completes/equips the Woodcutting tool', () => {
    const s = newGame(1), c = zeroLuck();
    s.skills.woodcutting = xpForLevel(90);
    s.skills.smithing = xpForLevel(15);
    for (const w of WOODS) s.professionProgress.discoveries[`wood_${w.id}_survey`] = true;
    for (const r of RESINS) {
      const wood = r.id.replace('_resin', '');
      cycles(s, `cut_resin_${wood}`, 5);
      s.account.bank.copper_ore = 100;
      s.account.bank.ash_log = 100;
      setSmithCatalyst(s, { resin: r.id });
      expect(resinBonus(s)).toBe(r.ilvl);
      const ilvl = smithIlvl(s, resinBonus(s));
      cycles(s, 'smith_driftwood_wand', 1);
      expect(s.inventory.at(-1)?.ilvl).toBe(ilvl);
      expect(s.account.bank[r.id]).toBe(0);
    }
    s.skills.smithing = xpForLevel(90);
    expect(smithIlvl(s, 6)).toBe(21);
    s.account.bank = { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 };
    s.professionProgress.work.woodcutting = 100;
    expect(startProject(s, c, 'tool_woodcutting')).toBeNull();
    advanceProject(s, c, 1_200_000);
    const tool = s.inventory.at(-1)!;
    expect(tool.name).toBe('Heartwood Hatchet');
    expect(tool.suffixes).toEqual([{ affixId: 'profession_speed_woodcutting', tier: 0, values: [8] }]);
    const before = actionIntervalMs(s, actionDef('cut_yew'), deriveStats(s));
    expect(equip(s, c, tool.uid)).toBeNull();
    expect(actionIntervalMs(s, actionDef('cut_yew'), deriveStats(s))).toBeCloseTo(before / 1.08);
    expect(deriveStats(s).skillSpeed).toBe(0);
    expect(materialDef('ancient_heartwood').desc).toMatch(/Smithing makes Heartwood Frames/);
    expect(actionsFor('woodcutting').some((a) => a.baseId)).toBe(false);
    expect(actionsFor('smithing').some((a) => a.id === 'frame_heartwood')).toBe(true); // Phase 04 owns assembly.
  });
});
