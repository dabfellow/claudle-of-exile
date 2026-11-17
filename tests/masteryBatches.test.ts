import { describe, expect, it } from 'vitest';
import { ACTIONS, actionDef } from '../src/data/skills';
import { MASTERY_BATCH_TIERS, supportsMasteryBatch } from '../src/data/masteryBatches';
import { makeCtx } from '../src/engine/context';
import { newGame, tick } from '../src/engine/state';
import { seeded } from '../src/engine/rng';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { deriveStats } from '../src/engine/stats';
import { masteryConservation, masteryThreshold } from '../src/engine/skillingMastery';
import { simulateOffline } from '../src/engine/offline';
import { alchemyPreview } from '../src/engine/alchemy';
import { deserialize, serialize } from '../src/engine/save';

function prepared(id: string, level: number) {
  const s = newGame(1);
  const a = actionDef(id);
  s.skills[a.skill] = 1e12;
  s.account.hideout.forge = 3;
  s.skillingMastery[a.mastery!.id] = masteryThreshold(level);
  for (const [mat, n] of Object.entries(a.inputs ?? {})) s.account.bank[mat] = n * 100;
  return s;
}

describe('production mastery batches', () => {
  it('covers ordinary production in every crafting profession without batching protected progress, keys, maps or gear', () => {
    for (const skill of ['smelting', 'woodcutting', 'alchemy', 'cooking', 'runecarving', 'gemcutting', 'cartography']) {
      expect(ACTIONS.some((a) => a.skill === skill && a.batchMastery)).toBe(true);
    }
    for (const a of ACTIONS.filter((a) => a.batchMastery)) {
      const single = actionDef(a.batchOf!);
      expect(supportsMasteryBatch(single)).toBe(true);
      expect(a.mastery).toBe(single.mastery);
      const tier = MASTERY_BATCH_TIERS.find((t) => t.mastery === a.batchMastery)!;
      expect(a.intervalMs).toBe(single.intervalMs * tier.time);
      for (const [id, n] of Object.entries(single.inputs!)) expect(a.inputs![id]).toBe(n * tier.size);
      for (const [id, n] of Object.entries(single.outputs ?? {})) expect(a.outputs![id]).toBe(n * tier.size);
    }
    for (const id of ['smith_marrow_key', 'cut_exceptional', 'chart_t1', 'smith_iron_ring']) {
      const a = ACTIONS.find((a) => a.id === id);
      if (a) expect(supportsMasteryBatch(a)).toBe(false);
    }
  });

  it.each(MASTERY_BATCH_TIERS)('gates $size× by matching mastery $mastery and credits time rather than output as practice', (tier) => {
    const id = `smelt_copper_x${tier.size}`;
    const s = prepared(id, tier.mastery);
    const a = actionDef(id);
    s.skillingMastery[a.mastery!.id] = masteryThreshold(tier.mastery) - 1;
    s.skillingMastery['task.smelt_iron'] = masteryThreshold(100);
    expect(actionBlocker(s, a)).toMatch(new RegExp(`mastery ${tier.mastery}`));
    s.skillingMastery[a.mastery!.id] = masteryThreshold(tier.mastery);
    const before = s.skillingMastery[a.mastery!.id];
    const ctx = makeCtx({ next: () => 0.999999 });
    expect(startSkillAction(s, ctx, id)).toBeNull();
    const d = deriveStats(s);
    expect(actionIntervalMs(s, a, d)).toBeCloseTo(actionIntervalMs(s, actionDef('smelt_copper'), d) * tier.time);
    skillStep(s, ctx, actionIntervalMs(s, a, d), d);
    expect(s.account.bank.copper_bar).toBe(tier.size);
    expect(s.account.bank.copper_ore).toBe(a.inputs!.copper_ore * 99 + Math.floor(a.inputs!.copper_ore * masteryConservation(s, a.mastery)));
    expect(s.skillingMastery[a.mastery!.id] - before).toBeCloseTo(a.intervalMs / 1000);
    expect(s.professionProgress.work.smithing).toBe(tier.size);
  });

  it.each(['cut_skill_x5', 'brew_life_small_x5'])('delivers the entire generated-item batch for %s', (id) => {
    const s = prepared(id, 15);
    const ctx = makeCtx({ next: () => 0.999999 });
    expect(startSkillAction(s, ctx, id)).toBeNull();
    const d = deriveStats(s);
    skillStep(s, ctx, actionIntervalMs(s, actionDef(id), d), d);
    expect(id.startsWith('cut') ? s.account.gems.length : s.account.flaskStash.length).toBe(5);
  });

  it('keeps saved batch work and ordinary output identical live and offline', () => {
    const live = prepared('smelt_copper_x50', 90);
    expect(startSkillAction(live, makeCtx(seeded(3)), 'smelt_copper_x50')).toBeNull();
    const away = structuredClone(live);
    const elapsed = 180_000;
    const ctx = makeCtx(seeded(3));
    for (let n = 0; n < elapsed; n += 1000) tick(live, ctx, 1000);
    simulateOffline(away, makeCtx(seeded(3)), elapsed);
    expect(away.account.bank).toEqual(live.account.bank);
    expect(away.skillingMastery).toEqual(live.skillingMastery);
  });

  it('keeps legacy Alchemy discounts distinct from full-cost mastery batches', () => {
    const s = prepared('orb_transmute_x5', 15);
    expect(alchemyPreview(s, actionDef('orb_transmute_x5')).join(' ')).toContain('full 5× input cost');
    expect(alchemyPreview(s, actionDef('orb_transmute_x10')).join(' ')).toContain('15% material discount');
  });

  it('retains per-gem minimum costs when Steady Hands conserves batch ingredients', () => {
    const s = prepared('cut_skill_x50', 90);
    s.skillPassives = ['core_steady'];
    const a = actionDef('cut_skill_x50');
    const before = s.account.bank.rough_gem;
    const ctx = makeCtx({ next: () => 0 });
    expect(startSkillAction(s, ctx, a.id)).toBeNull();
    const d = deriveStats(s);
    skillStep(s, ctx, actionIntervalMs(s, a, d), d);
    expect(before - s.account.bank.rough_gem).toBe(50);
    expect(s.account.gems.length).toBe(50);
  });

  it('reloads an active batch without a new mastery track or lost progress', () => {
    const s = prepared('smelt_copper_x5', 15);
    expect(startSkillAction(s, makeCtx(seeded(1)), 'smelt_copper_x5')).toBeNull();
    if (s.action?.kind === 'skill') s.action.progress = 1000;
    const loaded = deserialize(serialize(s));
    expect(loaded.action).toEqual(s.action);
    expect(loaded.skillingMastery).toEqual(s.skillingMastery);
  });

  it('positions mastery batches immediately following their single craft in the action list', () => {
    for (const a of ACTIONS.filter((x) => x.batchMastery)) {
      const all = ACTIONS.filter((x) => x.skill === a.skill);
      const singleIdx = all.findIndex((x) => x.id === a.batchOf);
      const batchIdx = all.findIndex((x) => x.id === a.id);
      expect(singleIdx).toBeGreaterThanOrEqual(0);
      expect(batchIdx).toBeGreaterThan(singleIdx);
    }
  });
});
