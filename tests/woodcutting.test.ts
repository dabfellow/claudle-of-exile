import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BASE_HP, LEGENDS, LODGE, SIZE_MULT, WOODS, WORLD_TREE_GROWTH_MS,
} from '../src/data/woodcutting';
import { COLLECTIBLES, collectibleFor } from '../src/data/collectibles';
import { actionDef, actionsFor } from '../src/data/skills';
import { RESINS } from '../src/data/craftMats';
import { materialDef } from '../src/data/materials';
import { makeCtx, type Ctx } from '../src/engine/context';
import { newGame, tick, SAVE_VERSION } from '../src/engine/state';
import { actionBlocker, actionIntervalMs, resinBonus, setSmithCatalyst, skillStep, smithIlvl, startSkillAction } from '../src/engine/skills';
import { deriveStats } from '../src/engine/stats';
import { xpForLevel } from '../src/engine/xp';
import { deserialize, serialize } from '../src/engine/save';
import { simulateOffline } from '../src/engine/offline';
import { advanceProject, startProject } from '../src/engine/professions';
import { equip } from '../src/engine/equipment';
import { seeded } from '../src/engine/rng';
import { rollCollectible } from '../src/engine/collectibles';
import {
  autoPick, buildLodge, chooseByOrder, giantCut, lodgeBlocker, makeGiant, moveOn, nextPart, partWorkable, plantBlocker, plantWorldTree,
  rollOption, scoutCount, scoutOptions, setGiantPart, splitSwing, woodcuttingAccessHint, worldTreeGrowth, worldTreeReady, legendChanceMult,
  offerWorldTree,
} from '../src/engine/woodcutting';
import type { Giant, GameState } from '../src/engine/types';

const fixed = (v: number, now = 1_000_000) => makeCtx({ next: () => v }, now);
const reload = (s: GameState) => { const account = structuredClone(s.account); s = deserialize(serialize(s)); s.account = account; return s; };

/** A giant whose parts all have `hp` HP: quick to bring down. */
function tinyGiant(s: GameState, region = 'ash', hp = 1, quirks: string[] = []): Giant {
  const g = makeGiant(s, region, 'small', quirks);
  for (const p of ['crown', 'limbs', 'trunk', 'heart'] as const) g.parts[p] = { hp: g.parts[p].max === 0 ? 0 : hp, max: g.parts[p].max === 0 ? 0 : hp };
  return g;
}
const work = (s: GameState, part: 'crown' | 'limbs' | 'trunk' | 'heart', region = 'ash') => {
  s.action = { kind: 'skill', actionId: `giant_${region}`, progress: 0, part };
};

describe('Felling giants: regions and giants', () => {
  it('has seven regions, one cutting action each, and a fresh Medium giant for a new character', () => {
    expect(WOODS.map((w) => [w.id, w.level, w.ms, w.xp])).toEqual([
      ['ash', 1, 3000, 7], ['oak', 15, 3500, 18], ['yew', 30, 4000, 38], ['ironwood', 45, 5000, 60],
      ['ancient', 60, 6000, 80], ['spirit', 75, 7000, 100], ['worldwood', 90, 8000, 120],
    ]);
    for (const w of WOODS) expect(actionDef(`giant_${w.id}`)).toMatchObject({ skill: 'woodcutting', level: w.level, intervalMs: w.ms });
    expect(actionsFor('woodcutting').some((a) => a.id.startsWith('cut_'))).toBe(false);
    const s = newGame(1);
    expect(s.giant.current).toMatchObject({ region: 'ash', size: 'medium', fallen: false });
    expect(s.collectibles).toEqual([]);
  });

  it('opens each region at its level without combat or another profession', () => {
    const s = newGame(1);
    for (const w of WOODS) {
      s.skills.woodcutting = xpForLevel(w.level - 1);
      if (w.level > 1) expect(actionBlocker(s, actionDef(`giant_${w.id}`))).toMatch(/Requires Woodcutting level/);
      s.skills.woodcutting = xpForLevel(w.level);
      s.giant.current = makeGiant(s, w.id, 'small', []);
      expect(actionBlocker(s, actionDef(`giant_${w.id}`))).toBeNull();
    }
    expect(s.skills.combat).toBe(0);
    expect(s.skills.smithing).toBe(0);
  });

  it('multiplies HP by size and by quirk', () => {
    const s = newGame(1);
    const hp = (size: Giant['size'], quirks: string[] = []) => {
      const g = makeGiant(s, 'ash', size, quirks);
      return [g.parts.crown.max, g.parts.limbs.max, g.parts.trunk.max, g.parts.heart.max];
    };
    expect(hp('small')).toEqual([30, 60, 60, 15]);
    expect(hp('medium')).toEqual([80, 160, 160, 40]);
    expect(hp('large')).toEqual([200, 400, 400, 100]);
    expect(hp('legend')).toEqual([2000, 4000, 4000, 1000]);
    expect(hp('worldtree')).toEqual([4000, 8000, 8000, 2000]);
    expect(SIZE_MULT.legend * BASE_HP.crown).toBe(2000);
    expect(hp('medium', ['hollow'])).toEqual([80, 160, 112, 20]);
    expect(hp('medium', ['lightning'])).toEqual([0, 160, 160, 40]);
    expect(hp('medium', ['towering'])).toEqual([120, 240, 240, 60]);
    expect(hp('medium', ['burled'])).toEqual([80, 160, 160, 80]);
  });

  it('applies quirks to yields: resin-weeping crowns, twisted limbs, lightning-struck trunks, burled hearts', () => {
    const s = newGame(1);
    const crown = (quirks: string[], roll: number) => {
      const g = tinyGiant(s, 'ash', 50, quirks);
      s.giant.current = g;
      work(s, 'crown');
      return giantCut(s, fixed(roll)).drops;
    };
    // rolls of 0.5 miss a plain 30% resin chance but hit the weeping 90%
    expect(crown([], 0.5).ash_resin).toBeUndefined();
    expect(crown(['resin'], 0.5).ash_resin).toBe(1);

    const limbs = (quirks: string[]) => {
      s.giant.current = tinyGiant(s, 'ash', 50, quirks);
      work(s, 'limbs');
      return giantCut(s, fixed(0.1)).drops.ash_log;
    };
    expect(limbs([])).toBe(1);
    expect(limbs(['twisted'])).toBe(2); // 1.5 rounded up on a 0.1 roll
    expect(limbs(['twisted', 'towering'])).toBe(3); // 2.25 rounded up

    const trunk = (quirks: string[]) => {
      s.giant.current = tinyGiant(s, 'ash', 50, quirks);
      work(s, 'trunk');
      return giantCut(s, fixed(0.1)).drops.ash_log;
    };
    expect(trunk([])).toBe(2); // the 50% bonus log lands on a 0.1 roll
    expect(trunk(['lightning'])).toBe(3); // 2 x 1.25 rounded up

    const g = tinyGiant(s, 'ash', 50, ['burled']);
    g.fallen = true;
    s.giant.current = g;
    work(s, 'heart');
    expect(giantCut(s, fixed(0.4)).drops.heartwood_fragment).toBe(1); // 50% instead of 25%
    s.giant.current = tinyGiant(s, 'ash', 50);
    s.giant.current.fallen = true;
    work(s, 'heart');
    expect(giantCut(s, fixed(0.4)).drops.heartwood_fragment).toBeUndefined();
  });

  it('keeps the heart locked until the fall, then turns what is left on the crown and limbs into splinters', () => {
    const s = newGame(1);
    const g = makeGiant(s, 'ash', 'medium', []);
    s.giant.current = g;
    expect(partWorkable(g, 'heart')).toBe(false);
    work(s, 'trunk');
    expect(setGiantPart(s, 'heart')).toMatch(/after the fall/);
    expect(s.action?.kind === 'skill' && s.action.part).toBe('trunk');
    // five cuts on the crown, then straight to the trunk
    work(s, 'crown');
    for (let i = 0; i < 5; i++) giantCut(s, fixed(0.99));
    expect(g.parts.crown.hp).toBe(75);
    work(s, 'trunk');
    let fellOn = 0;
    for (let i = 1; i <= 160; i++) if (giantCut(s, fixed(0.99)).fell) fellOn = i;
    expect(fellOn).toBe(160);
    expect(g.fallen).toBe(true);
    expect(g.parts.crown.hp + g.parts.limbs.hp).toBe(0);
    expect(g.splinters).toBe(75 + 160);
    expect(partWorkable(g, 'heart')).toBe(true);
    expect(s.action?.kind === 'skill' && s.action.part).toBe('heart');
  });

  it('pays the fall XP: 10 times the cut XP, 100 times for a legend', () => {
    const s = newGame(1);
    s.giant.current = tinyGiant(s, 'ash', 1);
    work(s, 'trunk');
    expect(giantCut(s, fixed(0.99)).xpUnits).toBe(11);
    s.giant.current = tinyGiant(s, 'ash', 1);
    s.giant.current.legendId = 'grandmother_oak';
    work(s, 'trunk');
    expect(giantCut(s, fixed(0.99)).xpUnits).toBe(101);
    s.giant.current = tinyGiant(s, 'ash', 1, ['towering']);
    work(s, 'crown');
    expect(giantCut(s, fixed(0.99)).xpUnits).toBe(1.5);
  });

  it('works the part order: full by default, trunk then heart when rushing', () => {
    const s = newGame(1);
    const g = makeGiant(s, 'ash', 'small', []);
    expect(nextPart(s, g)).toBe('crown');
    g.parts.crown.hp = 0;
    expect(nextPart(s, g)).toBe('limbs');
    s.giant.order.partOrder = 'rush';
    g.parts.crown.hp = 5;
    expect(nextPart(s, g)).toBe('trunk');
    expect(nextPart(s, g, 'crown')).toBe('crown');
    g.parts.trunk.hp = 0;
    g.fallen = true;
    expect(nextPart(s, g)).toBe('heart');
  });
});

describe('Felling giants: scouting, legends and the standing order', () => {
  it('offers two giants, three with the Scout Tower, from the chosen region (default the highest unlocked)', () => {
    const s = newGame(1);
    s.skills.woodcutting = xpForLevel(50);
    expect(scoutOptions(s, fixed(0.5)).map((g) => g.region)).toEqual(['ironwood', 'ironwood']);
    s.giant.order.region = 'oak';
    expect(scoutOptions(s, fixed(0.5)).map((g) => g.region)).toEqual(['oak', 'oak']);
    s.giant.order.region = 'worldwood'; // not open yet: falls back to the highest unlocked
    expect(scoutOptions(s, fixed(0.5)).map((g) => g.region)).toEqual(['ironwood', 'ironwood']);
    s.giant.lodge.scoutTower = 1;
    expect(scoutCount(s)).toBe(3);
    expect(scoutOptions(s, fixed(0.5))).toHaveLength(3);
  });

  it('rolls sizes 40/40/20 and quirks at 15% each, up to two', () => {
    const s = newGame(1);
    const sizes = (roll: number) => rollOption(s, { next: () => roll }, 'ash').size;
    expect(sizes(0.1)).toBe('small');
    expect(sizes(0.5)).toBe('medium');
    expect(sizes(0.95)).toBe('large');
    expect(rollOption(s, { next: () => 0.99 }, 'ash').quirks).toEqual([]);
    expect(rollOption(s, { next: () => 0.001 }, 'ash').quirks).toHaveLength(2);
  });

  it('only turns up a legend from level 80, in the Ancient, Spirit or Worldwood regions', () => {
    const s = newGame(1);
    const always = () => ({ next: () => 0.001 });
    s.skills.woodcutting = xpForLevel(79);
    expect(rollOption(s, always(), 'ancient').legendId).toBeUndefined();
    s.skills.woodcutting = xpForLevel(80);
    expect(rollOption(s, always(), 'oak').legendId).toBeUndefined();
    expect(rollOption(s, always(), 'ironwood').legendId).toBeUndefined();
    for (const [region, ids] of [['ancient', ['grandmother_oak', 'stormcrowned_yew']], ['spirit', ['elder_spirit_willow']], ['worldwood', ['worldwood_sentinel']]] as const) {
      const g = rollOption(s, always(), region);
      expect(g.size).toBe('legend');
      expect(ids).toContain(g.legendId);
    }
    expect(LEGENDS).toHaveLength(4);
    // a normal roll is not a legend
    expect(rollOption(s, { next: () => 0.5 }, 'ancient').legendId).toBeUndefined();
    s.giant.lodge.scoutTower = 2;
    expect(legendChanceMult(s)).toBe(1.5);
  });

  it('picks by the standing order: resin, heart, fast, region, and legends first', () => {
    const s = newGame(1);
    const mk = (size: Giant['size'], quirks: string[] = []) => makeGiant(s, 'oak', size, quirks);
    const options = [mk('small', ['hollow']), mk('large'), mk('medium', ['resin']), mk('medium', ['burled'])];
    const order = s.giant.order;
    expect(chooseByOrder(options, { ...order, pref: 'resin' })).toBe(2);
    expect(chooseByOrder(options, { ...order, pref: 'heart' })).toBe(3);
    expect(chooseByOrder(options, { ...order, pref: 'fast' })).toBe(0);
    expect(chooseByOrder(options, { ...order, pref: 'region' })).toBe(1);
    expect(chooseByOrder([], order)).toBe(-1);
    const withLegend = [...options, makeGiant(s, 'ancient', 'legend', [], { legendId: 'grandmother_oak' })];
    expect(chooseByOrder(withLegend, { ...order, pref: 'fast', alwaysLegend: true })).toBe(4);
    expect(chooseByOrder(withLegend, { ...order, pref: 'fast', alwaysLegend: false })).toBe(0);
  });

  it('takes the next giant by the standing order when one falls, switching region and action', () => {
    const s = newGame(1);
    s.skills.woodcutting = xpForLevel(15); // about to unlock oak
    s.giant.current = tinyGiant(s, 'ash', 1);
    s.action = { kind: 'skill', actionId: 'giant_ash', progress: 0, part: 'crown' };
    const c = fixed(0.5);
    for (let i = 0; i < 4; i++) giantCut(s, c);
    expect(s.giant.current?.id).not.toBeUndefined();
    expect(s.giant.current?.region).toBe('oak');
    expect(s.giant.options).toEqual([]);
    expect(s.action?.kind === 'skill' && s.action.actionId).toBe('giant_oak');
  });

  it('stops for a pick when the standing order is off, and Auto-pick takes the preferred one', () => {
    const s = newGame(1);
    s.giant.order.auto = false;
    s.giant.current = tinyGiant(s, 'ash', 1);
    s.action = { kind: 'skill', actionId: 'giant_ash', progress: 0, part: 'crown' };
    for (let i = 0; i < 4; i++) giantCut(s, fixed(0.5));
    expect(s.giant.current).toBeNull();
    expect(s.giant.options).toHaveLength(2);
    expect(s.action).toBeNull();
    expect(autoPick(s)).toBeNull();
    expect(s.giant.current).not.toBeNull();
  });

  it('moves on after the fall without finishing the heart', () => {
    const s = newGame(1);
    expect(moveOn(s, fixed(0.5))).toMatch(/Bring it down/);
    const g = tinyGiant(s, 'ash', 1);
    g.parts.heart = { hp: 5, max: 5 };
    s.giant.current = g;
    work(s, 'trunk');
    giantCut(s, fixed(0.5));
    expect(g.fallen).toBe(true);
    expect(moveOn(s, fixed(0.5))).toBeNull();
    expect(s.giant.current?.id).not.toBe(g.id);
  });

  it('records a felled legend once, gives 3 to 5 legend heartwood, and a 1% chance of a World Tree seed', () => {
    const s = newGame(1);
    s.skills.woodcutting = xpForLevel(85);
    const run = (roll: number) => {
      const g = tinyGiant(s, 'ancient', 1);
      g.legendId = 'grandmother_oak';
      g.size = 'legend';
      s.giant.current = g;
      const drops: Record<string, number> = {};
      for (const p of ['crown', 'limbs', 'trunk', 'heart'] as const) {
        work(s, p, 'ancient');
        for (const [id, n] of Object.entries(giantCut(s, fixed(roll)).drops)) drops[id] = (drops[id] ?? 0) + n;
      }
      return drops;
    };
    const first = run(0.0);
    expect(first.legend_heartwood).toBe(3);
    expect(first.world_tree_seed).toBe(1);
    expect(s.giant.legends).toEqual(['grandmother_oak']);
    expect(s.giant.legendLog.grandmother_oak.yields.legend_heartwood).toBe(3);
    const second = run(0.99);
    expect(second.legend_heartwood).toBe(5);
    expect(second.world_tree_seed).toBeUndefined();
    expect(s.giant.legends).toEqual(['grandmother_oak']);
  });
});

describe('Felling giants: the lodge and the World Tree', () => {
  it('builds each building once its level and logs are there', () => {
    const s = newGame(1);
    expect(lodgeBlocker(s, 'scoutTower')).toMatch(/level 20/);
    s.skills.woodcutting = xpForLevel(20);
    expect(lodgeBlocker(s, 'scoutTower')).toBe('Missing materials');
    s.storage.bank.oak_log = 250;
    expect(buildLodge(s, fixed(0.5), 'scoutTower')).toBeNull();
    expect(s.storage.bank.oak_log).toBe(50);
    expect(s.giant.lodge.scoutTower).toBe(1);
    expect(scoutCount(s)).toBe(3);
    expect(lodgeBlocker(s, 'scoutTower')).toMatch(/level 70/);
    expect(LODGE.find((l) => l.id === 'sawmill')!.tiers[0].cost).toEqual({ ironwood_log: 400 });
    expect(lodgeBlocker(s, 'trophyWall')).toBe('Fell a legend first');
  });

  it('builds the Trophy Wall from 100 planks of the first legend wood', () => {
    const s = newGame(1);
    s.giant.legends = ['elder_spirit_willow'];
    expect(lodgeBlocker(s, 'trophyWall')).toBe('Missing materials');
    s.storage.bank.spirit_plank = 100;
    expect(buildLodge(s, fixed(0.5), 'trophyWall')).toBeNull();
    expect(s.storage.bank.spirit_plank).toBe(0);
  });

  it('adds a log on a double split with the Drying Shed, and on 25% of hits with tier 2', () => {
    const s = newGame(1);
    work(s, 'limbs');
    splitSwing(s, fixed(0.0), 'double');
    expect(s.storage.bank.ash_log ?? 0).toBe(0); // no shed yet
    s.giant.lodge.dryingShed = 1;
    splitSwing(s, fixed(0.0), 'double');
    expect(s.storage.bank.ash_log).toBe(1);
    splitSwing(s, fixed(0.0), 'hit');
    expect(s.storage.bank.ash_log).toBe(1); // tier 1: hits give nothing
    s.giant.lodge.dryingShed = 2;
    splitSwing(s, fixed(0.0), 'hit');
    expect(s.storage.bank.ash_log).toBe(2);
    splitSwing(s, fixed(0.9), 'hit');
    expect(s.storage.bank.ash_log).toBe(2);
  });

  it('needs the Sawmill for Ironwood and deeper planks and heartwood, but not for ash, oak or yew planks', () => {
    const s = newGame(1);
    s.skills.woodcutting = xpForLevel(60);
    s.storage.bank.ironwood_log = 5;
    s.storage.bank.heartwood_fragment = 20;
    expect(woodcuttingAccessHint(s, actionDef('mill_ironwood'))).toBe('Build the Sawmill in your lodge');
    expect(actionBlocker(s, actionDef('mill_heartwood'))).toBe('Build the Sawmill in your lodge');
    expect(woodcuttingAccessHint(s, actionDef('mill_ash'))).toBeNull();
    expect(woodcuttingAccessHint(s, actionDef('mill_yew'))).toBeNull();
    s.giant.lodge.sawmill = 1;
    expect(actionBlocker(s, actionDef('mill_ironwood'))).toBeNull();
    expect(actionBlocker(s, actionDef('mill_heartwood'))).toBeNull();
  });

  it('grows a planted World Tree seed over 120 real days, offline included', () => {
    const s = newGame(1);
    expect(plantBlocker(s)).toMatch(/Trophy Wall/);
    s.giant.lodge.trophyWall = 1;
    expect(plantBlocker(s)).toMatch(/Seed/);
    s.storage.bank.world_tree_seed = 1;
    const t0 = 5_000_000;
    expect(plantWorldTree(s, fixed(0.5, t0))).toBeNull();
    expect(s.storage.bank.world_tree_seed).toBe(0);
    expect(plantBlocker(s)).toMatch(/already growing/);
    expect(WORLD_TREE_GROWTH_MS).toBe(120 * 24 * 3600 * 1000);
    expect(worldTreeGrowth(s, t0)).toBe(0);
    expect(worldTreeGrowth(s, t0 + WORLD_TREE_GROWTH_MS / 2)).toBeCloseTo(0.5);
    expect(worldTreeReady(s, t0 + WORLD_TREE_GROWTH_MS - 1)).toBe(false);
    expect(worldTreeReady(s, t0 + WORLD_TREE_GROWTH_MS)).toBe(true);
    // it survives a save, and shows up among the scouted giants once grown
    const back = reload(s);
    expect(back.giant.worldTree).toEqual({ plantedAt: t0 });
    expect(scoutOptions(s, fixed(0.5, t0 + WORLD_TREE_GROWTH_MS)).some((g) => g.worldTree)).toBe(true);
    expect(offerWorldTree(s, fixed(0.5, t0 + 10))).toMatch(/growing/);
    expect(offerWorldTree(s, fixed(0.5, t0 + WORLD_TREE_GROWTH_MS))).toBeNull();
  });

  it('fells the World Tree for 400x HP, 10 legend heartwood and a World Tree heart, then lets you plant another', () => {
    const s = newGame(1);
    s.giant.worldTree = { plantedAt: 0 };
    const tree = makeGiant(s, 'worldwood', 'worldtree', [], { worldTree: true });
    expect(tree.parts.trunk.max).toBe(BASE_HP.trunk * 400);
    for (const p of ['crown', 'limbs', 'trunk', 'heart'] as const) tree.parts[p] = { hp: 1, max: 1 };
    s.giant.current = tree;
    const drops: Record<string, number> = {};
    for (const p of ['crown', 'limbs', 'trunk', 'heart'] as const) {
      work(s, p, 'worldwood');
      for (const [id, n] of Object.entries(giantCut(s, fixed(0.99)).drops)) drops[id] = (drops[id] ?? 0) + n;
    }
    expect(drops.legend_heartwood).toBe(10);
    expect(drops.world_tree_heart).toBe(1);
    expect(s.giant.worldTree).toBeUndefined();
    expect(s.giant.legends).toEqual([]); // a personal legend is not a named one
  });
});

describe('Felling giants: coming back and migration', () => {
  it('makes a felling card for each giant that came down while away', () => {
    const s = newGame(1);
    s.giant.current = tinyGiant(s, 'ash', 3);
    startSkillAction(s, fixed(0.5), 'giant_ash');
    const sum = simulateOffline(s, makeCtx(seeded(7)), 60 * 60_000);
    expect(s.giant.pendingCards.length).toBeGreaterThan(0);
    const card = s.giant.pendingCards[0];
    expect(card.splinters).toBeGreaterThanOrEqual(0);
    expect(Object.keys(card.yields).sort()).toEqual(['crown', 'heart', 'limbs', 'trunk']);
    expect(s.giant.current).not.toBeNull();
    expect(sum.xp.woodcutting).toBeGreaterThan(0);
    // cards survive a save and are cleared by Continue
    expect(reload(s).giant.pendingCards).toHaveLength(s.giant.pendingCards.length);
  });

  it('keeps no cards when played live', () => {
    const s = newGame(1);
    s.giant.current = tinyGiant(s, 'ash', 1);
    startSkillAction(s, fixed(0.5), 'giant_ash');
    for (let i = 0; i < 40; i++) tick(s, makeCtx(seeded(3)), 3100);
    expect(s.giant.pendingCards).toEqual([]);
  });

  it.each([
    ['giant_ash', 1],
    ['giant_oak', 15],
    ['giant_ancient', 60],
  ] as const)('matches actual eight-hour live/offline output for %s', (id, level) => {
    const setup = () => {
      const s = newGame(1);
      s.skills.woodcutting = xpForLevel(level);
      s.giant.current = makeGiant(s, id.slice(6), 'medium', []);
      expect(startSkillAction(s, makeCtx({ next: seeded(42).next }), id)).toBeNull();
      return s;
    };
    const online = setup(), offline = setup();
    const c = makeCtx({ next: seeded(42).next });
    for (let i = 0; i < 28800; i++) tick(online, c, 1000);
    const summary = simulateOffline(offline, makeCtx({ next: seeded(42).next }), 28_800_000);
    expect(offline.storage.bank).toEqual(online.storage.bank);
    expect(offline.skills).toEqual(online.skills);
    expect(offline.professionProgress).toEqual(online.professionProgress);
    expect(offline.giant.current?.id).toBe(online.giant.current?.id);
    expect(summary.stoppedReason).toBeNull();
  }, 60_000);

  it('moves a save from before the rebuild over without losses', () => {
    const base = newGame(1);
    base.skills.woodcutting = xpForLevel(50);
    base.skillingMastery = { 'task.cut_ash': 100, 'task.cut_resin_ash': 500, 'task.cut_ley': 50, 'task.cut_oak': 70, 'task.cut_heartwood': 900, 'task.mill_ash': 300, 'task.mine_copper': 40 };
    base.storage.bank = { ash_log: 12, oak_plank: 3, heartwood_fragment: 7, ancient_heartwood: 1, ash_resin: 4 };
    base.professionProgress.counters['wood.heartwood.survey'] = 17;
    base.action = { kind: 'skill', actionId: 'cut_oak', progress: 500 };
    const old = JSON.parse(serialize(base));
    old.version = 51;
    delete old.giant;
    delete old.collectibles;
    const s = deserialize(JSON.stringify(old));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.collectibles).toEqual([]);
    // one fresh Medium giant in the highest region, and the Sawmill free at level 45+
    expect(s.giant.current).toMatchObject({ region: 'ironwood', size: 'medium', fallen: false });
    expect(s.giant.lodge).toEqual({ scoutTower: 0, dryingShed: 0, sawmill: 1, trophyWall: 0 });
    expect(s.giant.order).toMatchObject({ partOrder: 'full', region: 'auto', alwaysLegend: true });
    // the highest of each wood's old tracks; plank and other tracks keep their ids
    expect(s.skillingMastery['task.giant_ash']).toBe(500);
    expect(s.skillingMastery['task.giant_oak']).toBe(70);
    expect(s.skillingMastery['task.giant_yew']).toBe(900);
    expect(s.skillingMastery['task.cut_ash']).toBeUndefined();
    expect(s.skillingMastery['task.mill_ash']).toBe(300);
    expect(s.skillingMastery['task.delve_copper']).toBe(40);
    // items, XP and the heartwood counter carry over; the running cut moves to the giant
    expect(s.storage.bank).toMatchObject({ ash_log: 12, oak_plank: 3, heartwood_fragment: 7, ancient_heartwood: 1, ash_resin: 4 });
    expect(s.skills.woodcutting).toBe(base.skills.woodcutting);
    expect(s.professionProgress.counters['wood.heartwood.survey']).toBe(17);
    expect(s.action).toMatchObject({ kind: 'skill', actionId: 'giant_ironwood' });
    // a lower level gets no free Sawmill
    old.skills.woodcutting = xpForLevel(44);
    const low = deserialize(JSON.stringify(old));
    expect(low.giant.lodge.sawmill).toBe(0);
    expect(low.giant.current?.region).toBe('yew');
  });

  it('loads an old busy save and keeps what it had', () => {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/profession-v46.json', import.meta.url), 'utf8'));
    let s = deserialize(JSON.stringify(fixture.ordinary));
    s.account = structuredClone(fixture.account);
    const before = { inventory: structuredClone(s.inventory), action: structuredClone(s.action), skills: { ...s.skills } };
    s = reload(reload(s));
    expect(s.inventory).toEqual(before.inventory);
    expect(s.action).toEqual(before.action);
    expect(s.skills).toEqual(before.skills);
    expect(s.giant.current?.region).toBe('ash');
    expect(s.collectibles).toEqual([]);
    expect(s.storage.bank.heartwood_fragment ?? 0).toBe(0);
  });
});

describe('Hidden collectibles', () => {
  it('has one row per forest region', () => {
    for (const w of WOODS) expect(collectibleFor('woodcutting', w.id)).toMatchObject({ skill: 'woodcutting', zone: w.id });
    expect(COLLECTIBLES.filter((c) => c.skill === 'woodcutting')).toHaveLength(WOODS.length);
    expect(new Set(COLLECTIBLES.map((c) => c.id)).size).toBe(COLLECTIBLES.length);
  });

  it('finds an unfound one at 1 in 2,000 and only once, announcing it', () => {
    const s = newGame(1);
    const events: string[] = [];
    const c: Ctx = { ...makeCtx({ next: () => 0.0004 }), emit: (e) => { if (e.t === 'collectible') events.push(e.id); } };
    expect(rollCollectible(s, { ...c, rng: { next: () => 0.9 } }, 'woodcutting', 'ash')).toBe(false);
    expect(rollCollectible(s, { ...c, rng: { next: () => 0.0006 } }, 'woodcutting', 'ash')).toBe(false); // 1 in 2,000 is 0.0005
    expect(rollCollectible(s, c, 'woodcutting', 'ash')).toBe(true);
    expect(s.collectibles).toEqual(['woodcutting.ash']);
    expect(rollCollectible(s, c, 'woodcutting', 'ash')).toBe(false);
    expect(rollCollectible(s, c, 'woodcutting', 'nowhere')).toBe(false);
    expect(events).toEqual(['woodcutting.ash']);
  });

  it('rolls on every giant cut, offline too, in the giant\'s region', () => {
    const s = newGame(1);
    s.giant.current = tinyGiant(s, 'ash', 50);
    work(s, 'limbs');
    giantCut(s, fixed(0.0001));
    expect(s.collectibles).toEqual(['woodcutting.ash']);
    const off = newGame(1);
    off.giant.current = tinyGiant(off, 'oak', 50);
    work(off, 'limbs', 'oak');
    giantCut(off, { ...fixed(0.0001), offline: true });
    expect(off.collectibles).toEqual(['woodcutting.oak']);
  });
});

describe('Sawmill and the old crafting links', () => {
  it('keeps refining heartwood bounded with protected full costs', () => {
    const s = newGame(1);
    s.skills.woodcutting = xpForLevel(30);
    s.giant.lodge.sawmill = 1;
    s.storage.bank.heartwood_fragment = 20;
    s.skillingMastery['task.mill_heartwood'] = 432000;
    s.skillPassives.push('core_steady');
    expect(actionDef('mill_heartwood').mastery?.profile).toBe('project');
    const c = fixed(0.999999);
    expect(startSkillAction(s, c, 'mill_heartwood')).toBeNull();
    if (s.action?.kind === 'skill') s.action.double = true;
    skillStep(s, c, actionIntervalMs(s, actionDef('mill_heartwood'), deriveStats(s)) + 0.00001, deriveStats(s));
    expect(s.storage.bank.ancient_heartwood).toBe(1);
    expect(s.storage.bank.heartwood_fragment).toBe(0);
    skillStep(s, c, 30_000, deriveStats(s));
    expect(s.action).toBeNull();
    expect(actionBlocker(s, actionDef('mill_heartwood'))).toBe('Missing materials');
  });

  it('refines identical protected live/offline output and spending, then stops on exhausted nominal inputs', () => {
    const setup = () => {
      const s = newGame(1);
      s.skills.woodcutting = xpForLevel(30);
      s.giant.lodge.sawmill = 1;
      s.storage.bank.heartwood_fragment = 40;
      s.skillPassives.push('core_steady');
      s.skillingMastery['task.mill_heartwood'] = 432000;
      expect(startSkillAction(s, makeCtx({ next: () => 0 }), 'mill_heartwood')).toBeNull();
      return s;
    };
    const online = setup(), offline = reload(setup());
    const c = makeCtx({ next: () => 0 });
    for (let i = 0; i < 90; i++) tick(online, c, 1000);
    const summary = simulateOffline(offline, makeCtx({ next: () => 0 }), 28_800_000);
    expect(offline.storage.bank).toEqual(online.storage.bank);
    expect(offline.skills).toEqual(online.skills);
    expect(offline.storage.bank.ancient_heartwood).toBe(2);
    expect(offline.storage.bank.heartwood_fragment).toBe(0);
    expect(summary.protectedProgress).toEqual({ ancient_heartwood: 2 });
    expect(summary.materials.heartwood_fragment).toBe(-40);
    expect(summary.stoppedReason).toMatch(/Missing materials/);
    expect(offline.action).toBeNull();
  });

  it('saws every plank from five logs', () => {
    const s = newGame(1);
    s.skills.woodcutting = xpForLevel(90);
    s.giant.lodge.sawmill = 1;
    for (const w of WOODS) {
      s.storage.bank[`${w.id}_log`] = 5;
      expect(actionDef(`mill_${w.id}`)).toMatchObject({ inputs: { [`${w.id}_log`]: 5 }, outputs: { [`${w.id}_plank`]: 1 } });
      expect(actionBlocker(s, actionDef(`mill_${w.id}`))).toBeNull();
    }
  });

  it('uses every resin through actual capped Smithing and completes/equips the Woodcutting tool', () => {
    const s = newGame(1), c = fixed(0.999999);
    s.skills.woodcutting = xpForLevel(90);
    s.skills.smithing = xpForLevel(15);
    s.skills.woodcrafting = xpForLevel(15);
    for (const r of RESINS) {
      s.storage.bank[r.id] = 1;
      s.storage.bank.copper_ore = 100;
      s.storage.bank.copper_bar = 100;
      s.storage.bank.ash_log = 100;
      s.storage.bank.ash_plank = 100;
      setSmithCatalyst(s, { resin: r.id });
      expect(resinBonus(s)).toBe(r.ilvl);
      const ilvl = smithIlvl(s, resinBonus(s));
      const a = actionDef('smith_driftwood_wand');
      expect(startSkillAction(s, c, a.id)).toBeNull();
      skillStep(s, c, actionIntervalMs(s, a, deriveStats(s)) + 0.00001, deriveStats(s));
      expect(s.inventory.at(-1)?.ilvl).toBe(ilvl);
      expect(s.storage.bank[r.id]).toBe(0);
    }
    s.skills.smithing = xpForLevel(90);
    expect(smithIlvl(s, 6)).toBe(21);
    s.storage.bank = { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 };
    s.professionProgress.work.woodcutting = 100;
    expect(startProject(s, c, 'tool_woodcutting')).toBeNull();
    advanceProject(s, c, 1_200_000);
    const tool = s.inventory.at(-1)!;
    expect(tool.name).toBe('Heartwood Hatchet');
    expect(tool.suffixes).toEqual([{ affixId: 'profession_speed_woodcutting', tier: 0, values: [8] }]);
    const before = actionIntervalMs(s, actionDef('giant_yew'), deriveStats(s));
    expect(equip(s, c, tool.uid)).toBeNull();
    expect(actionIntervalMs(s, actionDef('giant_yew'), deriveStats(s))).toBeCloseTo(before / 1.08);
    expect(deriveStats(s).skillSpeed).toBe(0);
    expect(materialDef('ancient_heartwood').desc).toMatch(/Smithing makes Heartwood Frames/);
    expect(actionsFor('woodcutting').some((a) => a.baseId)).toBe(false);
    expect(actionsFor('woodcrafting').some((a) => a.id === 'frame_heartwood')).toBe(true);
  });

  it('defines the new materials', () => {
    for (const id of ['splinters', 'legend_heartwood', 'world_tree_seed', 'world_tree_heart']) expect(materialDef(id).name).toBeTruthy();
  });
});
