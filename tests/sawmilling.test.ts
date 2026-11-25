import { describe, expect, it } from 'vitest';
import { baseDef } from '../src/data/bases';
import { actionDef, actionsFor } from '../src/data/skills';
import { makeCtx } from '../src/engine/context';
import { splitWoodcrafting } from '../src/engine/save';
import { buyHides } from '../src/engine/tailoring';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { xpForLevel } from '../src/engine/xp';

describe('Woodcrafting split: Tailoring and Sawmilling', () => {
  it('moves cloth and leather armour to Tailoring and keeps bows, wands, staves and shields at Woodcrafting', () => {
    expect(actionDef('smith_simple_robe').skill).toBe('tailoring');
    expect(actionDef('smith_shabby_jerkin').skill).toBe('tailoring');
    expect(actionDef('smith_short_bow').skill).toBe('woodcrafting');
    expect(actionDef('smith_driftwood_wand').skill).toBe('woodcrafting');
    expect(actionDef('smith_buckler').skill).toBe('woodcrafting');
    expect(actionDef('smith_spirit_shield').skill).toBe('woodcrafting');
    expect(actionsFor('woodcrafting').some((a) => a.woodcutting?.mode === 'sawmill')).toBe(false);
  });

  it('makes every bow, wand and staff recipe need one sawn part of its wood tier', () => {
    const part = { bow: 'bow_stave', wand: 'wand_blank', staff: 'staff_shaft' } as Record<string, string>;
    const weapons = actionsFor('woodcrafting').filter((a) => a.baseId && baseDef(a.baseId).slot === 'weapon');
    expect(weapons.length).toBeGreaterThan(10);
    for (const a of weapons) {
      const parts = Object.keys(a.inputs ?? {}).filter((id) => /_(bow_stave|wand_blank|staff_shaft)$/.test(id));
      expect(parts, a.id).toHaveLength(1);
      expect(parts[0].endsWith(part[baseDef(a.baseId!).family!]), a.id).toBe(true);
    }
    expect(actionDef('smith_short_bow').inputs).toEqual({ ash_bow_stave: 1, copper_bar: 1 });
  });

  it('saws a bow stave from logs, then the stave goes into a bow', () => {
    const s = newGame(1);
    s.storage.bank.ash_log = 6;
    s.storage.bank.copper_bar = 1;
    const c = makeCtx({ next: () => 0.999999 });
    const mill = actionDef('mill_ash_bow_stave');
    expect(mill.skill).toBe('sawmilling');
    expect(startSkillAction(s, c, mill.id)).toBeNull();
    skillStep(s, c, actionIntervalMs(s, mill, deriveStats(s)) + 0.001, deriveStats(s));
    expect(s.storage.bank.ash_bow_stave).toBe(1);
    expect(s.storage.bank.ash_log).toBe(0);
    expect(s.skills.sawmilling).toBeGreaterThan(0);
    expect(actionBlocker(s, actionDef('smith_short_bow'))).toBeNull();
  });

  it('sews cloth armour from cloth and leather armour from leather, never planks or bars', () => {
    expect(actionDef('smith_simple_robe').inputs).toEqual({ linen_cloth: 4 });
    expect(actionDef('smith_shabby_jerkin').inputs).toEqual({ rough_leather: 4 });
    for (const a of actionsFor('tailoring').filter((r) => r.baseId)) {
      expect(Object.keys(a.inputs ?? {}).every((id) => /_(cloth|leather)$/.test(id)), a.id).toBe(true);
    }
  });

  it('finds fibre while Foraging and sells hides at the stall', () => {
    expect(actionDef('forage_sunpetal').bonus).toContainEqual({ id: 'flax', chance: 0.25, qty: 1 });
    expect(actionDef('forage_frostleaf').bonus).toContainEqual({ id: 'cotton', chance: 0.25, qty: 1 });
    expect(actionDef('forage_voidbloom').bonus).toContainEqual({ id: 'wild_silk', chance: 0.25, qty: 1 });
    const s = newGame(1);
    const c = makeCtx({ next: () => 0.5 });
    s.storage.bank.gold = 200;
    expect(buyHides(s, c, 'thick_pelt', 1)).toMatch(/Tailoring level 15/);
    expect(buyHides(s, c, 'rough_hide', 10)).toBeNull();
    expect(s.storage.bank).toMatchObject({ gold: 50, rough_hide: 10 });
    expect(buyHides(s, c, 'rough_hide', 10)).toBe('Not enough gold');
  });

  it('starts Tailoring and Sawmilling at the old Woodcrafting XP', () => {
    const raw = { skills: { woodcrafting: xpForLevel(40), smithing: xpForLevel(10) } } as Record<string, unknown>;
    splitWoodcrafting(raw);
    expect(raw.skills).toMatchObject({ woodcrafting: xpForLevel(40), tailoring: xpForLevel(40), sawmilling: xpForLevel(40) });
  });
});
