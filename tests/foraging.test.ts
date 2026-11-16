import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { HERBS, foragingSource } from '../src/data/foraging';
import { actionDef, actionsFor } from '../src/data/skills';
import { makeCtx } from '../src/engine/context';
import { newGame, tick } from '../src/engine/state';
import { actionBlocker, actionIntervalMs, greenhouseStep, skillStep, startSkillAction, stopAction } from '../src/engine/skills';
import { deriveStats } from '../src/engine/stats';
import { xpForLevel } from '../src/engine/xp';
import { deserialize, serialize } from '../src/engine/save';
import { simulateOffline } from '../src/engine/offline';
import { foragingDone, plantGreenhouse, greenhousePlantReason } from '../src/engine/foraging';
import { advanceProject, startProject } from '../src/engine/professions';
import { equip } from '../src/engine/equipment';
import { allocateSkillNode } from '../src/engine/skillTree';
import type { GameState } from '../src/engine/types';

const ctx = () => makeCtx({ next: () => 0.999999 });
const reload = (s: GameState) => { const account = structuredClone(s.account); s = deserialize(serialize(s)); s.account = account; return s; };
function cycles(s: GameState, id: string, n: number, double = false) {
  expect(startSkillAction(s, ctx(), id)).toBeNull();
  for (let i = 0; i < n; i++) {
    if (s.action?.kind === 'skill') s.action.double = double;
    skillStep(s, ctx(), actionIntervalMs(s, actionDef(id), deriveStats(s)) - (s.action?.kind === 'skill' ? s.action.progress : 0) + 0.000001, deriveStats(s));
  }
}
function advanced() {
  const s = newGame(1); s.skills.harvesting = xpForLevel(90); s.professionProgress.work.harvesting = 100;
  return s;
}
function greenhouse(s: GameState) {
  // Pay the normal tree prices using only independently earned profession levels.
  for (const skill of ['mining', 'woodcutting'] as const) s.skills[skill] = xpForLevel(30);
  for (const id of ['core_2', 'harvesting_s0', 'harvesting_s1', 'harvesting_s2', 'harvesting_n0', 'harvesting_ks']) expect(allocateSkillNode(s, ctx(), id)).toBeNull();
}

describe('Phase 06 Foraging and Greenhouse', () => {
  it('opens every patch and the existing keystone without combat, seeds or new stations', () => {
    const s = advanced();
    for (const a of actionsFor('harvesting')) expect(actionBlocker(s, a)).toBeNull();
    cycles(s, 'herb_sun', 100);
    greenhouse(s);
    expect(plantGreenhouse(s, 'herb_sun')).toBeNull();
    expect(s.skills.combat).toBe(0); expect(s.bossesDefeated).toEqual([]);
  });

  it.each(HERBS)('keeps $id ordinary rewards and guarantees concentrated essence rotation and combined seeds', (h) => {
    let s = advanced();
    cycles(s, h.action, 50);
    cycles(s, `herb_concentrated_${h.id}`, 49, true);
    expect(s.professionProgress.discoveries[`seed_${h.id}`]).toBeUndefined();
    s = reload(s);
    cycles(s, `herb_concentrated_${h.id}`, 1, true);
    expect(s.professionProgress.discoveries[`seed_${h.id}`]).toBe(true);
    expect(s.professionProgress.counters[`foraging.seed.${h.id}`]).toBe(100);
    for (const [i, id] of h.essences.entries()) expect(s.account.bank[id]).toBe(Math.floor((4 + h.essences.length - 1 - i) / h.essences.length));
    const before = structuredClone(s.professionProgress.counters), essence = h.essences.map((id) => s.account.bank[id]);
    cycles(s, `herb_abundant_${h.id}`, 100);
    expect(s.professionProgress.counters).toEqual(before);
    expect(h.essences.map((id) => s.account.bank[id])).toEqual(essence);
    expect(actionDef(`herb_abundant_${h.id}`).intervalMs).toBe(h.ms * 1.5);
    expect(actionDef(`herb_concentrated_${h.id}`).intervalMs).toBe(h.ms * 2);
  });

  it('preserves old essence rolls and adds deterministic weak storm/embers at Emberbloom', () => {
    const s = advanced(); cycles(s, 'herb_emberbloom', 24, true);
    expect(s.account.bank.essence_storm_1).toBe(1); expect(s.account.bank.essence_embers_1).toBe(1);
    expect(actionDef('herb_emberbloom').bonus?.filter((b) => b.id.startsWith('essence_'))).toHaveLength(2);
  });

  it('records an early and threshold discovery only once even when both triggers coincide', () => {
    const s = advanced(), c = makeCtx({ next: () => 0 });
    s.professionProgress.counters['foraging.seed.moon_bloom'] = 99;
    foragingDone(s, c, actionDef('herb_moon'), true);
    foragingDone(s, c, actionDef('herb_moon'), true);
    expect(c.events.filter((e) => e.t === 'profession' && e.category === 'discovery')).toHaveLength(1);
    expect(s.account.bank.moon_bloom).toBe(2); // optional extras only, no material for learning a seed
  });

  it.each(['moon', 'star'])('bounds %s blooms across reload, switching and doubles, with no abundant progress', (name) => {
    let s = advanced(); const plant = `${name}_bloom`;
    cycles(s, `herb_${name}`, 59, true);
    cycles(s, 'herb_abundant_voidbloom', 2);
    expect(s.account.bank[plant] ?? 0).toBe(0);
    s = reload(s); cycles(s, `herb_${name}`, 41, true);
    expect(s.account.bank[plant]).toBe(1);
    expect(s.professionProgress.discoveries[`seed_${plant}`]).toBe(true);
    expect(s.professionProgress.counters[`foraging.bloom.${plant}`]).toBe(100);
  });

  it('plants learned choices only, retains automatic memory, pauses and never doubles background rewards', () => {
    const s = advanced(); greenhouse(s);
    expect(plantGreenhouse(s, 'herb_star')).toMatch(/seed/);
    cycles(s, 'herb_moon', 100); stopAction(s);
    expect(plantGreenhouse(s, 'herb_moon')).toBeNull();
    s.greenhouse!.progress = 12;
    expect(plantGreenhouse(s, 'herb_moon')).toBeNull(); expect(s.greenhouse!.progress).toBe(12);
    const d = deriveStats(s), interval = actionIntervalMs(s, actionDef('herb_moon'), d);
    s.professionProgress.counters['foraging.bloom.moon_bloom'] = 59;
    greenhouseStep(s, ctx(), (interval - 12) * 5 + 0.00001, d);
    expect(s.account.bank.moon_bloom).toBe(2);
    const work = s.professionProgress.work.harvesting;
    expect(work).toBe(200); // initial 100 + foreground only
    cycles(s, 'herb_sun', 1);
    expect(s.greenhouse?.actionId).toBe('herb_sun');
    expect(plantGreenhouse(s, 'herb_moon')).toBeNull();
    const saved = structuredClone(s.greenhouse);
    greenhouseStep(s, ctx(), 600_000, deriveStats(s)); expect(s.greenhouse).toEqual(saved);
    stopAction(s); s.skillPassives = ['skill_core'];
    greenhouseStep(s, ctx(), 600_000, deriveStats(s)); expect(s.greenhouse).toEqual(saved);
    expect(greenhousePlantReason(s, actionDef('herb_sun'))).toMatch(/keystone/);
  });

  it.each([false, true])('matches eight-hour live/offline seeds, protected blooms and saved progress (background=%s)', (background) => {
    const setup = () => {
      const s = advanced();
      if (background) { greenhouse(s); s.professionProgress.discoveries.seed_moon_bloom = true; plantGreenhouse(s, 'herb_moon'); }
      else startSkillAction(s, ctx(), 'herb_moon');
      return s;
    };
    const online = setup(), offline = reload(setup()), c = ctx();
    for (let i = 0; i < 28800; i++) tick(online, c, 1000);
    const summary = simulateOffline(offline, ctx(), 28_800_000);
    expect(offline.account.bank).toEqual(online.account.bank);
    expect(offline.skills).toEqual(online.skills); expect(offline.professionProgress).toEqual(online.professionProgress);
    expect(offline.greenhouse).toEqual(online.greenhouse);
    expect(offline.account.bank.moon_bloom).toBeGreaterThanOrEqual(background ? 16 : 80);
    expect(summary.protectedProgress?.moon_bloom).toBe(offline.account.bank.moon_bloom);
    expect(summary.discoveries ?? []).toEqual(background ? [] : ['seed_moon_bloom']);
    const second = simulateOffline(offline, ctx(), 60_000); expect(second.discoveries ?? []).toEqual([]);
  }, 30_000);

  it('grants the preserved plant seed once on v46 and pre-phase v47 saves without backfilling other seeds', () => {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/profession-v46.json', import.meta.url), 'utf8'));
    let s = deserialize(JSON.stringify(fixture.ordinary)); s.account = structuredClone(fixture.account);
    const plant = structuredClone(s.greenhouse), skills = { ...s.skills }, mastery = { ...s.skillingMastery };
    s = reload(reload(s));
    expect(s.greenhouse).toEqual(plant); expect(s.skills).toEqual(skills); expect(s.skillingMastery).toEqual(mastery); expect(s.inventory).toHaveLength(60);
    expect(s.professionProgress.discoveries[`seed_${foragingSource(actionDef(plant!.actionId))!.plant}`]).toBe(true);
    expect(s.professionProgress.discoveries.seed_moon_bloom).toBeUndefined();
    s = advanced(); s.greenhouse = { actionId: 'herb_frost', progress: 1234 };
    delete s.professionProgress.counters['foraging.seedsMigrated']; s = reload(s);
    expect(s.professionProgress.discoveries.seed_frostleaf).toBe(true); expect(s.greenhouse?.progress).toBe(1234);
    s.greenhouse = { actionId: 'herb_void', progress: 50 }; s = reload(s);
    expect(s.professionProgress.discoveries.seed_voidbloom).toBeUndefined();
  });

  it('uses grown and foraged herbs interchangeably in existing brewing and delivers the fixed Sickle once', () => {
    const s = advanced(); greenhouse(s); cycles(s, 'herb_sun', 100); stopAction(s);
    const before = s.account.bank.sunpetal;
    greenhouseStep(s, ctx(), actionIntervalMs(s, actionDef('herb_sun'), deriveStats(s)) * 5 + 1, deriveStats(s));
    expect(s.account.bank.sunpetal).toBe(before + 1);
    const brew = actionsFor('alchemy').find((a) => a.level === 1 && a.flaskId)!;
    expect(brew.inputs?.sunpetal).toBeGreaterThan(0);
    Object.assign(s.account.bank, Object.fromEntries(Object.entries(brew.inputs!).filter(([id]) => id !== 'sunpetal')));
    cycles(s, brew.id, 1); expect(s.account.bank.sunpetal).toBe(before + 1 - brew.inputs!.sunpetal);
    Object.assign(s.account.bank, { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 });
    expect(startProject(s, ctx(), 'tool_harvesting')).toBeNull(); advanceProject(s, ctx(), 1_200_000);
    const tool = s.inventory.find((i) => i.name === "Seedkeeper's Sickle")!;
    expect(tool.suffixes).toEqual([{ affixId: 'profession_speed_harvesting', tier: 0, values: [8] }]);
    const interval = actionIntervalMs(s, actionDef('herb_star'), deriveStats(s));
    expect(equip(s, ctx(), tool.uid)).toBeNull(); expect(actionIntervalMs(s, actionDef('herb_star'), deriveStats(s))).toBeLessThan(interval);
    advanceProject(s, ctx(), 1_200_000); expect(s.professionProgress.projects.tool_harvesting.completed).toBe(1);
  });
});
