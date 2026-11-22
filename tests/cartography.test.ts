import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_BY_ID, ACHIEVEMENTS } from '../src/data/achievements';
import { CARTOGRAPHY_GATE, CHART_MATERIALS, CHART_TIERS, FOLIO_COST, FOLIO_SIZE, SEXTANT_RECIPES, UPGRADE_MAPS } from '../src/data/cartography';
import { MAP_DROPS, MAP_TIERS, mapId } from '../src/data/maps';
import { actionDef, actionsFor, SKILLS, UPCOMING_SKILLS } from '../src/data/skills';
import { SKILL_TREE_NODES } from '../src/data/skillTree';
import { actOpen } from '../src/data/zones';
import { cartographyOpen, upgradeCost } from '../src/engine/cartography';
import type { Ctx } from '../src/engine/context';
import { createItem } from '../src/engine/items';
import { addMaps, mapsHeld, rollMapDrops, startMap } from '../src/engine/maps';
import { hasMinigame, surveyDistance, surveyResult, SURVEY_COLS, SURVEY_ROWS, SURVEY_SOUNDINGS } from '../src/engine/minigame';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { skillTreePoints, skillTreeStats } from '../src/engine/skillTree';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, MonsterInstance } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';
import { veteran } from './helpers';

const ctx = (): Ctx => ({ rng: seeded(7), emit: () => {}, now: 0 });

function act6(level = 60): GameState {
  const s = veteran(newGame(1));
  s.unlockedZones.push(CARTOGRAPHY_GATE.zone);
  s.skills.cartography = xpForLevel(level);
  return s;
}

function give(s: GameState, inputs: Record<string, number>, times = 1): void {
  for (const [id, n] of Object.entries(inputs)) s.storage.bank[id] = (s.storage.bank[id] ?? 0) + n * times;
}

function run(s: GameState, id: string, times = 1): void {
  const a = actionDef(id);
  give(s, a.inputs!, times);
  expect(startSkillAction(s, ctx(), id)).toBeNull();
  const d = deriveStats(s);
  skillStep(s, ctx(), actionIntervalMs(s, a, d) * times, d);
}

const DRAW = 'chart_folio_t1';
const UPGRADE = 'chart_t2';
const T1 = mapId(1);
const T2 = mapId(2);

describe('the skill', () => {
  it('is a production skill with a mini-game, a tree branch and tree points', () => {
    expect(SKILLS.cartography.group).toBe('production');
    expect(hasMinigame('cartography')).toBe(true);
    expect(SKILL_TREE_NODES.filter((n) => n.branch === 'cartography')).toHaveLength(14);
    const s = newGame(1);
    const before = skillTreePoints(s);
    s.skills.cartography = xpForLevel(60);
    expect(skillTreePoints(s)).toBeGreaterThan(before);
  });

  it('manufactures independently of Act 6', () => {
    const s = veteran(newGame(1));
    s.skills.cartography = xpForLevel(60);
    expect(cartographyOpen(s)).toBe(true);
    for (const a of actionsFor('cartography').filter((a) => !a.batchMastery)) {
      expect(a.gate).toBeUndefined();
      expect(actionBlocker(s, a)).toBe(a.level > 60 ? `Requires Cartography level ${a.level}` : 'Missing materials');
    }
    s.unlockedZones.push(CARTOGRAPHY_GATE.zone);
    expect(cartographyOpen(s)).toBe(true);
  });

  it('leaves Coming soon while keeping existing achievement sources', () => {
    expect(UPCOMING_SKILLS.find((u) => u.name === 'Cartography')).toBeUndefined();
    expect(ACHIEVEMENT_BY_ID.maps_drawn_25.act).toBe(7);
    expect(ACHIEVEMENTS.some((a) => a.id === 'maps_drawn_25')).toBe(actOpen(6));
  });

  it('only spends what can be gathered, found or drawn', () => {
    const own = new Set(CHART_MATERIALS.map((m) => m.id));
    const made = new Set(actionsFor('cartography').flatMap((a) => Object.keys({ ...a.outputs, ...a.protectedOutputs })));
    for (const id of ['chart_survey_fragment', 'reliquary_fragment', 'atlas_survey_record']) made.add(id); // Covered by Phase 13 source-hook tests.
    for (const id of ['world_core_fragment', 'doom_key_fragment']) made.add(id); // Doomed boss hooks, covered by pinnacleProjects tests.
    for (const id of ['boss_scrap', 'vault_scrap', 'guardian_scrap', 'guardian_trophy', 'lost_chart']) made.add(id); // Map boss/rare/chest scrap drops.
    expect([...own].filter((id) => !made.has(id))).toEqual([]);
    const elsewhere = new Set(['alchemy', 'mining', 'woodcutting', 'harvesting', 'smelting', 'smithing'].flatMap((k) => actionsFor(k as 'mining').flatMap((a) => [...Object.keys(a.outputs ?? {}), ...(a.bonus ?? []).map((b) => b.id)])));
    elsewhere.add('arcane_dust');
    elsewhere.add('inscription_fragment');
    for (const m of ['copper', 'iron', 'mithril', 'star']) elsewhere.add(`${m}_bar_flawless`);
    for (const a of actionsFor('cartography')) {
      expect(Object.keys(a.inputs!).filter((id) => !own.has(id) && !elsewhere.has(id))).toEqual([]);
    }
  });

  it('has an upgrade recipe for tiers 2–10, T1 folio, and each Sextant tier', () => {
    const made = actionsFor('cartography').filter((a) => a.chart);
    for (const tier of CHART_TIERS.filter((t) => t.tier > 1)) {
      expect(MAP_TIERS.some((t) => t.tier === tier.tier)).toBe(true);
      expect(made.some((a) => a.chart!.tier === tier.tier && a.chart!.qty === 1 && a.chart!.upgrade)).toBe(true);
    }
    expect(made.some((a) => a.id === 'chart_folio_t1' && a.chart!.tier === 1 && a.chart!.qty === FOLIO_SIZE)).toBe(true);
    for (const sex of SEXTANT_RECIPES) {
      expect(actionsFor('cartography').some((a) => a.outputs?.[sex.id] === 1)).toBe(true);
    }
  });
});

describe('recipes', () => {
  it('draws a T1 folio into the same stock the Map Device runs from', () => {
    const s = act6();
    run(s, DRAW);
    expect(mapsHeld(s, 1)).toBe(FOLIO_SIZE);
    expect(s.storage.bank.vellum).toBe(0);
    expect(s.skills.cartography).toBeGreaterThan(xpForLevel(60));
    expect(s.lifetime.mapsDrawn).toBe(FOLIO_SIZE);
    expect(startMap(s, ctx(), 1)).toBeNull();
    expect(s.maps.stock[T1]).toBe(FOLIO_SIZE - 1);
    expect(s.maps.run?.tier).toBe(1);
  });

  it('turns logs and plants into vellum and ink for it, and crafts Sextants', () => {
    const s = act6(60);
    run(s, 'chart_vellum');
    run(s, 'chart_gall_ink');
    run(s, 'chart_sextant_apprentice');
    expect(s.storage.bank.vellum).toBe(1);
    expect(s.storage.bank.gall_ink).toBe(1);
    expect(s.storage.bank.sextant_apprentice).toBe(1);
  });

  it('upgrades three maps into one of the next tier, and needs all three', () => {
    const s = act6();
    const a = actionDef(UPGRADE);
    give(s, a.inputs!);
    addMaps(s, 1, UPGRADE_MAPS - 1);
    expect(actionBlocker(s, a)).toBe('Missing materials');
    addMaps(s, 1, 1);
    expect(actionBlocker(s, a)).toBeNull();
    s.storage.bank = {};
    run(s, UPGRADE);
    expect(s.maps.stock[T1]).toBe(0);
    expect(s.maps.stock[T2]).toBe(1);
  });

  it('stops when the lower maps run out, like any other input', () => {
    const s = act6();
    addMaps(s, 1, UPGRADE_MAPS);
    run(s, UPGRADE, 3);
    expect(s.maps.stock[T2]).toBe(1);
    expect(s.action).toBeNull();
  });

  it('a folio makes a stack for less per map', () => {
    const s = act6();
    const single = CHART_TIERS[0].inputs;
    const folio = actionDef('chart_folio_t1');
    for (const [id, n] of Object.entries(single)) expect(folio.inputs![id]).toBe(n * FOLIO_COST);
    run(s, folio.id);
    expect(mapsHeld(s, 1)).toBe(FOLIO_SIZE);
    expect(s.lifetime.mapsDrawn).toBe(FOLIO_SIZE);
  });

  it('keeps drawing through a night away', () => {
    const s = act6();
    const a = actionDef(DRAW);
    give(s, a.inputs!, 2);
    startSkillAction(s, ctx(), DRAW);
    const sum = simulateOffline(s, ctx(), actionIntervalMs(s, a, deriveStats(s)) * 4);
    expect(sum.mapsDrawn).toBe(FOLIO_SIZE * 2);
    expect(mapsHeld(s, 1)).toBe(FOLIO_SIZE * 2);
  });
});

describe('the tree', () => {
  it('Second Copy draws two Sextants for one', () => {
    const s = act6();
    const r = createItem(s, 'iron_ring', 30, 'normal', seeded(1));
    r.suffixes.push({ affixId: 'u_second_copy', tier: 0, values: [25] });
    s.equipment.ring1 = r;
    run(s, 'chart_sextant_apprentice', 200);
    expect(s.storage.bank.sextant_apprentice).toBeGreaterThan(200);
  });

  it("Surveyor's Eye finds more maps", () => {
    const kills = (extra = false) => {
      const s = veteran(newGame(1));
      if (extra) {
        const r = createItem(s, 'iron_ring', 30, 'normal', seeded(1));
        r.suffixes.push({ affixId: 'u_map_find', tier: 0, values: [50] });
        s.equipment.ring1 = r;
      }
      const c = ctx();
      const mon = { level: MAP_DROPS.campaignMinLevel, isBoss: false } as MonsterInstance;
      for (let i = 0; i < 20000; i++) rollMapDrops(s, c, mon);
      return mapsHeld(s, 1);
    };
    expect(kills(true)).toBeGreaterThan(kills(false));
  });

  it('exposes standard upgrade cost and Cartography scrap-drop tree stats', () => {
    const s = act6();
    const a = actionDef(UPGRADE);
    expect(upgradeCost(s, a)).toBe(UPGRADE_MAPS);
    s.skillPassives = ['cartography_t0', 'cartography_t1'];
    expect(skillTreeStats(s)['cartography.scrapDrops']).toBe(6);
  });
});

describe('maps still come from monsters', () => {
  it('a run can find the next tier, so no tier needs Cartography', () => {
    const s = veteran(newGame(1));
    s.maps.run = { zoneId: T1, tier: 1, theme: 'mudflats', packsLeft: 1, packsTotal: 6, startedAt: 0, deaths: 0, bossDown: false };
    const c = ctx();
    for (let i = 0; i < 2000; i++) rollMapDrops(s, c, { level: 28, isBoss: true } as MonsterInstance);
    const low = mapsHeld(s, 1);
    const high = mapsHeld(s, 2);
    expect(high).toBeGreaterThan(0);
    expect(high / (low + high)).toBeCloseTo(MAP_DROPS.tierUp, 1);
  });
});

describe('the mini-game', () => {
  it('sounds in steps across the grid', () => {
    expect(surveyDistance(0, 0)).toBe(0);
    expect(surveyDistance(0, SURVEY_COLS * SURVEY_ROWS - 1)).toBe(SURVEY_COLS + SURVEY_ROWS - 2);
    expect(surveyDistance(0, SURVEY_COLS)).toBe(1);
  });

  it('is clean inside the limit, weak on the last sounding, and a miss past it', () => {
    expect(surveyResult(false, 1)).toBeNull();
    expect(surveyResult(true, 3)).toBe('double');
    expect(surveyResult(true, 4)).toBe('hit');
    expect(surveyResult(true, SURVEY_SOUNDINGS)).toBe('weak');
    expect(surveyResult(false, SURVEY_SOUNDINGS)).toBe('miss');
  });
});

describe('saves', () => {
  it('needs no migration: older saves load at level 1, with nothing drawn', () => {
    const raw = JSON.parse(serialize(newGame(1)));
    delete raw.skills.cartography;
    delete raw.lifetime.mapsDrawn;
    const s = deserialize(JSON.stringify(raw));
    expect(s.skills.cartography).toBe(0);
    expect(s.lifetime.mapsDrawn).toBe(0);
  });
});
