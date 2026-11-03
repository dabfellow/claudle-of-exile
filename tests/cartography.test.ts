import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_BY_ID, ACHIEVEMENTS } from '../src/data/achievements';
import { CARTOGRAPHY_GATE, CHART_MATERIALS, CHART_TIERS, FOLIO_COST, FOLIO_SIZE, MASTER_UPGRADE_MAPS, UPGRADE_MAPS } from '../src/data/cartography';
import { MAP_DROPS, MAP_THEMES, MAP_TIERS, mapZoneId } from '../src/data/maps';
import { actionDef, actionsFor, SKILLS, UPCOMING_SKILLS } from '../src/data/skills';
import { SKILL_TREE_NODES } from '../src/data/skillTree';
import { actOpen } from '../src/data/zones';
import { cartographyOpen } from '../src/engine/cartography';
import type { Ctx } from '../src/engine/context';
import { addMaps, mapsHeld, rollMapDrops, startMap } from '../src/engine/maps';
import { hasMinigame, surveyDistance, surveyResult, SURVEY_COLS, SURVEY_ROWS, SURVEY_SOUNDINGS } from '../src/engine/minigame';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { skillTreePoints } from '../src/engine/skillTree';
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
  for (const [id, n] of Object.entries(inputs)) s.account.bank[id] = (s.account.bank[id] ?? 0) + n * times;
}

function run(s: GameState, id: string, times = 1): void {
  const a = actionDef(id);
  give(s, a.inputs!, times);
  expect(startSkillAction(s, ctx(), id)).toBeNull();
  const d = deriveStats(s);
  skillStep(s, ctx(), actionIntervalMs(s, a, d) * times, d);
}

const DRAW = 'chart_barrows_t1';
const UPGRADE = 'chart_barrows_t2';
const T1 = mapZoneId(1, 'barrows');
const T2 = mapZoneId(2, 'barrows');

describe('the skill', () => {
  it('is a production skill with a mini-game, a tree branch and tree points', () => {
    expect(SKILLS.cartography.group).toBe('production');
    expect(hasMinigame('cartography')).toBe(true);
    expect(SKILL_TREE_NODES.filter((n) => n.branch === 'cartography')).toHaveLength(6);
    const s = newGame(1);
    const before = skillTreePoints(s);
    s.skills.cartography = xpForLevel(60);
    expect(skillTreePoints(s)).toBeGreaterThan(before);
  });

  it('is shut until Act 6, however high the skill', () => {
    const s = veteran(newGame(1));
    s.skills.cartography = xpForLevel(60);
    expect(cartographyOpen(s)).toBe(false);
    for (const a of actionsFor('cartography')) {
      expect(a.gate).toBe(CARTOGRAPHY_GATE);
      expect(actionBlocker(s, a)).toBe('Reach Act 6 to unlock');
    }
    s.unlockedZones.push(CARTOGRAPHY_GATE.zone);
    expect(cartographyOpen(s)).toBe(true);
  });

  it('stays on the Coming soon page until the gate opens, and its achievements wait for the act', () => {
    expect(UPCOMING_SKILLS.find((u) => u.name === 'Cartography')?.gate).toBe(CARTOGRAPHY_GATE);
    expect(ACHIEVEMENT_BY_ID.maps_drawn_25.act).toBe(6);
    expect(ACHIEVEMENTS.some((a) => a.id === 'maps_drawn_25')).toBe(actOpen(6));
  });

  it('only spends what can be gathered, found or drawn', () => {
    const own = new Set(CHART_MATERIALS.map((m) => m.id));
    const made = new Set(actionsFor('cartography').flatMap((a) => Object.keys(a.outputs ?? {})));
    expect([...own].filter((id) => !made.has(id))).toEqual([]);
    const elsewhere = new Set(['alchemy', 'mining', 'woodcutting', 'harvesting'].flatMap((k) => actionsFor(k as 'mining').flatMap((a) => [...Object.keys(a.outputs ?? {}), ...(a.bonus ?? []).map((b) => b.id)])));
    elsewhere.add('arcane_dust');
    for (const a of actionsFor('cartography')) {
      expect(Object.keys(a.inputs!).filter((id) => !own.has(id) && !elsewhere.has(id))).toEqual([]);
    }
  });

  // Cartography draws the first tiers only until its rework (docs/design/MAPS.md); the rest come from map runs
  it('has a recipe for every theme of each tier it draws, and every tier it draws is a real map', () => {
    const made = actionsFor('cartography').filter((a) => a.chart);
    for (const tier of CHART_TIERS) {
      expect(MAP_TIERS.some((t) => t.tier === tier.tier)).toBe(true);
      for (const theme of MAP_THEMES) {
        expect(made.some((a) => a.chart!.tier === tier.tier && a.chart!.theme === theme.id)).toBe(true);
      }
    }
  });
});

describe('recipes', () => {
  it('draws a map into the same stock the Map Device runs from', () => {
    const s = act6();
    run(s, DRAW);
    expect(mapsHeld(s, 1, 'barrows')).toBe(1);
    expect(s.account.bank.vellum).toBe(0);
    expect(s.skills.cartography).toBeGreaterThan(xpForLevel(60));
    expect(s.lifetime.mapsDrawn).toBe(1);
    expect(startMap(s, ctx(), 1, 'barrows')).toBeNull();
    expect(s.maps.stock[T1]).toBe(0);
    expect(s.maps.run?.zoneId).toBe(T1);
  });

  it('turns logs and plants into vellum and ink for it', () => {
    const s = act6();
    run(s, 'chart_vellum');
    run(s, 'chart_gall_ink');
    expect(s.account.bank.vellum).toBe(1);
    expect(s.account.bank.gall_ink).toBe(1);
  });

  it('upgrades three maps into one of the next tier, and needs all three', () => {
    const s = act6();
    const a = actionDef(UPGRADE);
    give(s, a.inputs!);
    addMaps(s, 1, 'barrows', UPGRADE_MAPS - 1);
    expect(actionBlocker(s, a)).toBe('Missing materials');
    addMaps(s, 1, 'barrows', 1);
    expect(actionBlocker(s, a)).toBeNull();
    s.account.bank = {};
    run(s, UPGRADE);
    expect(s.maps.stock[T1]).toBe(0);
    expect(s.maps.stock[T2]).toBe(1);
  });

  it('stops when the lower maps run out, like any other input', () => {
    const s = act6();
    addMaps(s, 1, 'barrows', UPGRADE_MAPS);
    run(s, UPGRADE, 3);
    expect(s.maps.stock[T2]).toBe(1);
    expect(s.action).toBeNull();
  });

  it('a folio makes a stack for less per map', () => {
    const s = act6();
    const single = actionDef(DRAW).inputs!;
    const folio = actionDef('chart_folio_barrows');
    for (const [id, n] of Object.entries(single)) expect(folio.inputs![id]).toBe(n * FOLIO_COST);
    run(s, folio.id);
    expect(mapsHeld(s, 1, 'barrows')).toBe(FOLIO_SIZE);
    expect(s.lifetime.mapsDrawn).toBe(FOLIO_SIZE);
  });

  it('keeps drawing through a night away', () => {
    const s = act6();
    const a = actionDef(DRAW);
    give(s, a.inputs!, 10);
    startSkillAction(s, ctx(), DRAW);
    const sum = simulateOffline(s, ctx(), actionIntervalMs(s, a, deriveStats(s)) * 20);
    expect(sum.mapsDrawn).toBe(10);
    expect(mapsHeld(s, 1, 'barrows')).toBe(10);
  });
});

describe('the tree', () => {
  it('Second Copy draws two for one', () => {
    const s = act6();
    s.skillPassives.push('cartography_n0');
    run(s, DRAW, 200);
    expect(mapsHeld(s, 1, 'barrows')).toBeGreaterThan(200);
  });

  it("Surveyor's Eye finds more maps", () => {
    const kills = (node?: string) => {
      const s = veteran(newGame(1));
      if (node) s.skillPassives.push(node);
      const c = ctx();
      const mon = { level: MAP_DROPS.campaignMinLevel, isBoss: false } as MonsterInstance;
      for (let i = 0; i < 20000; i++) rollMapDrops(s, c, mon);
      return mapsHeld(s, 1, 'barrows') + mapsHeld(s, 1, 'stormvault');
    };
    expect(kills('cartography_n1')).toBeGreaterThan(kills());
  });

  it('Master Cartographer upgrades for two maps, and slows the skill', () => {
    const s = act6();
    const a = actionDef(UPGRADE);
    const slow = actionIntervalMs(s, a, deriveStats(s));
    s.skillPassives.push('cartography_ks');
    expect(actionIntervalMs(s, a, deriveStats(s))).toBeCloseTo(slow * 1.25);
    addMaps(s, 1, 'barrows', MASTER_UPGRADE_MAPS);
    run(s, UPGRADE);
    expect(s.maps.stock[T1]).toBe(0);
    expect(s.maps.stock[T2]).toBe(1);
  });
});

describe('maps still come from monsters', () => {
  it('a run can find the next tier, so no tier needs Cartography', () => {
    const s = veteran(newGame(1));
    s.maps.run = { zoneId: T1, tier: 1, theme: 'barrows', packsLeft: 1, packsTotal: 6, startedAt: 0, deaths: 0, bossDown: false };
    const c = ctx();
    for (let i = 0; i < 2000; i++) rollMapDrops(s, c, { level: 28, isBoss: true } as MonsterInstance);
    const low = mapsHeld(s, 1, 'barrows') + mapsHeld(s, 1, 'stormvault');
    const high = mapsHeld(s, 2, 'barrows') + mapsHeld(s, 2, 'stormvault');
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
    expect(surveyResult(true, 3)).toBe('hit');
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
