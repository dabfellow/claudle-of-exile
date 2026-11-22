import { describe, expect, it } from 'vitest';
import { actionDef } from '../src/data/skills';
import { makeCtx } from '../src/engine/context';
import { createItem } from '../src/engine/items';
import { curveResult } from '../src/engine/minigame';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame, tick } from '../src/engine/state';
import { itemStats } from '../src/engine/stats';
import {
  buildWoodJig, finishWoodcraft, recipeDials, retuneLivingWood, saveWoodTuning, startWoodcraft, woodBias,
  woodCraftDials, woodDialIndices, woodDialRange, woodGrowthStep, woodRackItems, woodTuningSlots,
} from '../src/engine/woodcrafting';
import { xpForLevel } from '../src/engine/xp';

const shortBow = actionDef('smith_short_bow');
const longBow = actionDef('smith_ash_longbow');

function crafter() {
  const s = newGame(1);
  s.skills.woodcrafting = xpForLevel(82);
  s.account.hideout.woodcrafting_bench = 3;
  Object.assign(s.storage.bank, { ash_plank: 40, copper_bar: 40, oak_plank: 100, ironwood_plank: 200, spirit_plank: 300, legend_heartwood: 3 });
  return s;
}

describe('Woodcrafting workbench', () => {
  it('gates and caps dials by material tier, Living wood, level and each jig', () => {
    const s = crafter();
    s.skills.woodcrafting = 0;
    expect(woodDialRange(s, 'bow', 0)).toBe(2);
    expect(woodDialIndices(shortBow, false)).toEqual([0]);
    expect(woodDialIndices(longBow, false)).toEqual([0, 1]);
    expect(woodDialIndices(longBow, true)).toEqual([0, 1, 2]);
    expect(buildWoodJig(s, 'bow')).toMatch(/level 20/);
    s.skills.woodcrafting = xpForLevel(82);
    for (let i = 0; i < 3; i++) expect(buildWoodJig(s, 'bow')).toBeNull();
    expect(woodTuningSlots(s, 'bow')).toBe(3);
    expect(recipeDials(s, longBow, [9, -9, 9], true)).toEqual([5, -6, 5]);
    expect(woodDialRange(s, 'staff', 0)).toBe(3);
  });

  it('trades equal stats and weights only the chosen modifier groups', () => {
    const item = createItem(crafter(), 'short_bow', 1, 'normal', seeded(1));
    item.dials = [-2];
    expect(itemStats(item)).toMatchObject({ localPhysPct: 8, attackSpeedPct: -8 });
    expect(woodBias('short_bow', [-2], { inc_phys: 3 })).toMatchObject({ inc_phys: 6, added_phys: 2 });
    expect(woodBias('short_bow', [2])).toEqual({ attack_speed: 2 });
  });

  it('uses saved tuning offline and puts completed pieces on the return rack', () => {
    const s = crafter();
    const ctx = makeCtx(seeded(8), 60_000);
    expect(saveWoodTuning(s, 'bow', 'Fast draw', [2])).toBeNull();
    expect(startWoodcraft(s, ctx, shortBow, { dials: [-2] })).toBeNull();
    simulateOffline(s, ctx, 60_000);
    const pieces = woodRackItems(s);
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.every((item) => item.dials?.[0] === 2)).toBe(true);
  });

  it('uses an unsaved draft just once and leaves future repeats neutral', () => {
    const s = crafter();
    const ctx = makeCtx(seeded(8));
    expect(startWoodcraft(s, ctx, shortBow, { dials: [-2] })).toBeNull();
    expect(woodCraftDials(s, ctx, shortBow)).toEqual([-2, 0, 0]);
    expect(woodCraftDials(s, ctx, shortBow)).toEqual([0, 0, 0]);
  });

  it('retains guaranteed purpose modifiers with a tuned Living piece and charges its timber', () => {
    const s = crafter();
    const ctx = makeCtx(seeded(40));
    const purpose = actionDef('purpose_physical_short_bow');
    expect(startWoodcraft(s, ctx, purpose, { dials: [-2, 0, 2], living: 'legend_heartwood' })).toBeNull();
    tick(s, ctx, 80_000);
    const item = s.inventory.find((i) => i.baseId === 'short_bow')!;
    expect(item.living).toEqual({ growth: 0, ms: 0 });
    expect(item.prefixes.map((p) => p.affixId)).toEqual(expect.arrayContaining(purpose.purpose!.guarantees));
    expect(s.storage.bank.legend_heartwood).toBe(2);
    s.equipment.weapon = item;
    expect(woodGrowthStep(s, 7_200_000)).toBe(true);
    expect(item.living!.growth).toBe(2);
    expect(itemStats(item).localPhysPct).toBeGreaterThan(8);
    expect(retuneLivingWood(s, item.uid, [2, 0, 2])).toBeNull();
    expect(item.living!.growth).toBe(1);
  });

  it('perfect balance removes the cost of one tuned dial only', () => {
    const s = crafter();
    const item = { uid: 7, baseId: 'ash_longbow', ilvl: 16, rarity: 'normal' as const, name: null, prefixes: [], suffixes: [] };
    finishWoodcraft(s, makeCtx({ next: () => 0 }), item, [-2, -1, 0], false);
    expect(item).toMatchObject({ balanced: 0 });
    expect(itemStats(item)).toMatchObject({ localPhysPct: 8, critChancePct: 4, woodAccuracyPct: -4 });
    expect(itemStats(item).attackSpeedPct).toBeUndefined();
  });

  it('starts an older save neutral without losing the recipe or its progress', () => {
    const raw = JSON.parse(serialize(crafter()));
    raw.version = 58;
    raw.action = { kind: 'skill', actionId: shortBow.id, progress: 1250 };
    delete raw.woodcrafting;
    const s = deserialize(JSON.stringify(raw));
    expect(s.woodcrafting.tunings).toEqual([]);
    expect(s.action).toEqual(raw.action);
    expect(s.skills.woodcrafting).toBe(raw.skills.woodcrafting);
  });

  it.each([[0.03, true, 'double'], [0.031, true, 'hit'], [0.09, true, 'hit'], [0.091, true, 'weak'],
    [0.15, true, 'weak'], [0.151, true, 'miss'], [0, false, 'miss']] as const)('scores %s with finish %s', (distance, complete, expected) => {
    expect(curveResult(distance, complete)).toBe(expected);
  });
});
