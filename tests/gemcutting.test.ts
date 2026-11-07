import { describe, expect, it } from 'vitest';
import { activeGemDef, supportGemDef } from '../src/data/gems';
import { SKILL_TREE_NODES } from '../src/data/skillTree';
import { actionDef, actionsFor } from '../src/data/skills';
import { makeCtx } from '../src/engine/context';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';
import { veteran } from './helpers';

function cut(s: GameState, actionId: string, times: number, seed = 1) {
  const ctx = makeCtx(seeded(seed));
  expect(startSkillAction(s, ctx, actionId)).toBeNull();
  const d = deriveStats(s);
  skillStep(s, ctx, actionIntervalMs(s, actionDef(actionId), d) * times + 1, d);
}

function gemcutter(level = 1): GameState {
  // level 30: cut gems are limited to ones your character level allows
  const s = veteran(newGame(1, { name: 'T', classId: 'warrior' }));
  s.skills.gemcutting = xpForLevel(level);
  s.unlockedZones = ['mudflats', 'brinecaves', 'ashwood', 'blackreed', 'crypt', 'shipgrave', 'stormcliffs'];
  Object.assign(s.account.bank, { rough_gem: 100, arcane_dust: 1000, frostleaf: 100, emberroot: 100, voidbloom: 100 });
  return s;
}

describe('gemcutting', () => {
  it('cuts skill gems from the whole pool into the gem bag', () => {
    const s = gemcutter();
    cut(s, 'cut_skill', 30);
    expect(s.account.gems).toHaveLength(30);
    expect(new Set(s.account.gems.map((g) => activeGemDef(g.gemId).attr)).size).toBe(3);
    // Practice earned during the batch can conserve an eligible ordinary input.
    expect(s.account.bank.rough_gem).toBe(11);
    expect(s.skills.gemcutting).toBeGreaterThan(xpForLevel(1));
  });

  it('is slow and costly: at least 20 s and 3 Rough Gems a skill gem', () => {
    const a = actionDef('cut_skill');
    expect(a.intervalMs).toBeGreaterThanOrEqual(20000);
    expect(a.inputs!.rough_gem).toBeGreaterThanOrEqual(3);
  });

  it('support recipe gives general supports of any attribute', () => {
    const s = gemcutter(10);
    cut(s, 'cut_support', 20);
    expect(s.account.supportGems).toHaveLength(20);
    for (const g of s.account.supportGems) expect(supportGemDef(g.supportId).signatureFor).toBeUndefined();
    expect(new Set(s.account.supportGems.map((g) => supportGemDef(g.supportId).attr)).size).toBeGreaterThan(1);
  });

  it('signature supports favour skills you own', () => {
    const s = gemcutter(25);
    const owned = s.skillBar.filter(Boolean).map((g) => g!.gemId);
    cut(s, 'cut_signature', 8);
    expect(s.account.supportGems).toHaveLength(8);
    for (const g of s.account.supportGems) expect(owned).toContain(supportGemDef(g.supportId).signatureFor);
  });

  it('stops when rough gems run out', () => {
    const s = gemcutter();
    s.account.bank.rough_gem = 7;
    cut(s, 'cut_skill', 5);
    expect(s.account.gems).toHaveLength(2);
    expect(s.action).toBeNull();
  });

  it('is level- and area-gated, and every recipe is reachable', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    expect(startSkillAction(s, makeCtx(seeded(1)), 'cut_support')).not.toBeNull();
    expect(actionsFor('gemcutting').length).toBeGreaterThanOrEqual(4);
  });

  it('has a branch that trades speed for XP and material efficiency', () => {
    expect(SKILL_TREE_NODES.filter((n) => n.branch === 'gemcutting')).toHaveLength(6);
    const plain = gemcutter(50);
    const specialist = gemcutter(50);
    specialist.skillPassives = ['gemcutting_n0', 'gemcutting_n1', 'gemcutting_ks'];
    const action = actionDef('cut_skill');
    expect(actionIntervalMs(specialist, action, deriveStats(specialist))).toBeCloseTo(actionIntervalMs(plain, action, deriveStats(plain)) * 1.2);
    cut(plain, action.id, 1);
    cut(specialist, action.id, 1);
    expect(specialist.account.bank.rough_gem).toBe(plain.account.bank.rough_gem + 1);
    expect(specialist.account.bank.arcane_dust).toBe(plain.account.bank.arcane_dust + 6);
    expect(specialist.skills.gemcutting).toBeGreaterThan(plain.skills.gemcutting);
  });

  it('a save mid-cut on a removed recipe loads with the action stopped', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    const raw = JSON.parse(serialize(s));
    raw.action = { kind: 'skill', actionId: 'cut_skill_str', progress: 0 };
    expect(deserialize(JSON.stringify(raw)).action).toBeNull();
  });

  it('old saves without the skill load at level 1', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    const raw = JSON.parse(serialize(s));
    delete raw.skills.gemcutting;
    expect(deserialize(JSON.stringify(raw)).skills.gemcutting).toBe(0);
  });
});
