import { describe, expect, it } from 'vitest';
import { BASES } from '../src/data/bases';
import { RESONANCE_PER_PIECE, RUNE_FAMILIES, RUNE_GATE, RUNE_READINGS, RUNES, runeDef } from '../src/data/runes';
import { materialDef } from '../src/data/materials';
import { actionDef, actionsFor, SKILLS, UPCOMING_SKILLS } from '../src/data/skills';
import { describeStat } from '../src/data/statText';
import { freshAccount } from '../src/engine/account';
import type { Ctx } from '../src/engine/context';
import { applyOrb, restoreImpression, takeImpression } from '../src/engine/crafting';
import { createItem, createUnique } from '../src/engine/items';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { inscribeRune, itemRune, readingOf, runeMult, runeReason, runesOpen, runeStats } from '../src/engine/runes';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, skillStep, startSkillAction } from '../src/engine/skills';
import { skillTreePoints } from '../src/engine/skillTree';
import { newGame, SAVE_VERSION } from '../src/engine/state';
import { deriveStats, rawStats } from '../src/engine/stats';
import { stashItems, takeFromStash } from '../src/engine/storage';
import type { EquipSlot, GameState, Item } from '../src/engine/types';
import { veteran } from './helpers';

const ctx = (): Ctx => ({ rng: seeded(7), emit: () => {}, now: 0 });

function base(slot: string, minLevel = 40) {
  return BASES.find((b) => b.slot === slot && !b.twoHanded && b.reqLevel >= minLevel) ?? BASES.filter((b) => b.slot === slot).at(-1)!;
}

function act3(): GameState {
  const s = veteran(newGame(1));
  s.unlockedZones.push(RUNE_GATE.zone);
  return s;
}

function gear(s: GameState, slot: string, rarity: Item['rarity'] = 'rare', ilvl = 50): Item {
  return createItem(s, base(slot).id, ilvl, rarity, seeded(3));
}

function wear(s: GameState, slot: EquipSlot, item: Item): Item {
  s.equipment[slot] = item;
  return item;
}

function give(s: GameState, id: string, n = 1): void {
  s.account.bank[id] = (s.account.bank[id] ?? 0) + n;
}

describe('the skill', () => {
  it('is a production skill that left the Coming soon page', () => {
    expect(SKILLS.runecarving.group).toBe('production');
    expect(UPCOMING_SKILLS.some((u) => u.name === 'Rune-carving')).toBe(false);
  });

  it('counts towards skilling tree points', () => {
    const s = newGame(1);
    const before = skillTreePoints(s);
    s.skills.runecarving = 1e7;
    expect(skillTreePoints(s)).toBeGreaterThan(before);
  });

  it('waits for the first area of Act 3, which needs no zone data to name', () => {
    const s = veteran(newGame(1));
    const a = actionsFor('runecarving')[0];
    expect(RUNE_GATE.zone).toBe('pilgrimgate');
    expect(runesOpen(s)).toBe(false);
    expect(actionBlocker(s, a)).toBe('Reach Act 3 to unlock');
    s.unlockedZones.push(RUNE_GATE.zone);
    expect(runesOpen(s)).toBe(true);
    expect(actionBlocker(s, a)).toBe('Missing materials');
  });

  it('has a recipe for every rune, made only of what the game can gather', () => {
    const recipes = actionsFor('runecarving');
    expect(recipes).toHaveLength(RUNES.length);
    for (const r of RUNES) expect(actionDef(`carve_${r.id}`).outputs).toEqual({ [r.id]: 1 });
    for (const a of recipes) {
      expect(a.inputs).toBeTruthy();
      for (const id of Object.keys(a.inputs!)) expect(['ore', 'log', 'herb', 'gem', 'fossil', 'essence', 'resin']).toContain(materialDef(id).kind);
    }
  });

  it('gives every reading a line of its own, none of them the raw stat key', () => {
    for (const f of RUNE_FAMILIES) {
      for (const x of RUNE_READINGS) expect(describeStat(f.reads[x.id].stat, 1)).not.toContain(f.reads[x.id].stat);
    }
  });

  it('carves a rune into the bank, online and offline', () => {
    const s = act3();
    const a = actionsFor('runecarving')[0];
    for (const [id, n] of Object.entries(a.inputs!)) give(s, id, n * 5);
    expect(startSkillAction(s, ctx(), a.id)).toBeNull();
    skillStep(s, ctx(), a.intervalMs + 1, deriveStats(s));
    expect(s.account.bank[Object.keys(a.outputs!)[0]]).toBe(1);
    expect(s.skills.runecarving).toBeGreaterThan(0);

    const rune = Object.keys(a.outputs!)[0];
    const before = s.account.bank[rune];
    simulateOffline(s, ctx(), a.intervalMs * 3.5);
    expect(s.account.bank[rune]).toBe(before + 3);
  });

  it('stops when the materials run out, offline too', () => {
    const s = act3();
    const a = actionsFor('runecarving')[0];
    for (const [id, n] of Object.entries(a.inputs!)) give(s, id, n);
    startSkillAction(s, ctx(), a.id);
    simulateOffline(s, ctx(), a.intervalMs * 10);
    expect(s.account.bank[Object.keys(a.outputs!)[0]]).toBe(1);
    expect(s.action).toBeNull();
  });

  it('Second Stroke carves two for one', () => {
    const s = act3();
    s.skillPassives.push('runecarving_n0');
    const a = actionsFor('runecarving')[0];
    const rune = Object.keys(a.outputs!)[0];
    for (const [id, n] of Object.entries(a.inputs!)) give(s, id, n * 200);
    startSkillAction(s, ctx(), a.id);
    skillStep(s, ctx(), a.intervalMs * 200 + 1, deriveStats(s));
    expect(s.account.bank[rune]).toBeGreaterThan(200);
  });
});

describe('the rune slot', () => {
  it('reads differently on a weapon, armour and jewellery', () => {
    const s = act3();
    expect(readingOf(gear(s, 'weapon'))).toBe('weapon');
    expect(readingOf(gear(s, 'body'))).toBe('armour');
    expect(readingOf(gear(s, 'offhand'))).toBe('armour');
    expect(readingOf(gear(s, 'ring'))).toBe('jewellery');
    expect(readingOf(gear(s, 'belt'))).toBe('jewellery');
  });

  it('adds its stat for the slot it sits in, once equipped and not before', () => {
    const s = act3();
    const body = gear(s, 'body', 'normal');
    give(s, 'rune_ember_3');
    s.inventory.push(body);
    expect(inscribeRune(s, ctx(), 'rune_ember_3', body.uid)).toBeNull();
    expect(s.account.bank.rune_ember_3).toBe(0);
    const before = rawStats(s).fireRes;
    s.inventory = [];
    wear(s, 'body', body);
    expect(rawStats(s).fireRes - before).toBe(12);
    expect(rawStats(s).firePct).toBe(0);
  });

  it("isn't lost as a local stat on armour", () => {
    const s = act3();
    const boots = wear(s, 'boots', gear(s, 'boots', 'normal'));
    const before = rawStats(s).life;
    boots.rune = 'rune_blood_2';
    expect(rawStats(s).life - before).toBe(14);
  });

  it('goes on uniques, which nothing else can change', () => {
    const s = act3();
    const u = createUnique(s, 'miners_lament', 50);
    s.inventory.push(u);
    give(s, 'rune_stone_1');
    expect(runeReason(s, 'rune_stone_1', u.uid)).toBeNull();
  });

  it('needs enough item level for its grade, and replacing one destroys the old rune', () => {
    const s = act3();
    const low = gear(s, 'gloves', 'normal', 30);
    s.inventory.push(low);
    give(s, 'rune_keen_3');
    expect(runeReason(s, 'rune_keen_3', low.uid)).toBe('Requires item level 32');
    give(s, 'rune_keen_1', 2);
    give(s, 'rune_rime_1');
    inscribeRune(s, ctx(), 'rune_keen_1', low.uid);
    expect(runeReason(s, 'rune_keen_1', low.uid)).toBe('Already inscribed');
    inscribeRune(s, ctx(), 'rune_rime_1', low.uid);
    expect(low.rune).toBe('rune_rime_1');
    expect(s.account.bank.rune_keen_1).toBe(1);
  });

  it('stays through every orb and the wax, and costs no affix room', () => {
    const s = act3();
    const item = gear(s, 'helmet');
    item.rune = 'rune_storm_2';
    s.inventory.push(item);
    for (const orb of ['chaos', 'annul', 'divine', 'exalted', 'scour', 'transmute', 'alteration']) {
      give(s, orb, 3);
      applyOrb(s, ctx(), orb, item.uid);
      expect(item.rune).toBe('rune_storm_2');
    }
    give(s, 'locksmiths_wax');
    takeImpression(s, ctx(), item.uid);
    item.rune = 'rune_storm_3';
    restoreImpression(s, ctx(), item.uid);
    expect(item.rune).toBe('rune_storm_3');
  });
});

describe('Resonance', () => {
  it('makes a family stronger for each other piece wearing it', () => {
    const s = act3();
    wear(s, 'helmet', gear(s, 'helmet', 'normal')).rune = 'rune_ember_1';
    expect(runeMult(s, 'ember')).toBe(1);
    wear(s, 'weapon', gear(s, 'weapon', 'normal')).rune = 'rune_ember_1';
    wear(s, 'ring1', gear(s, 'ring', 'normal')).rune = 'rune_ember_1';
    expect(runeMult(s, 'ember')).toBeCloseTo(1 + 2 * RESONANCE_PER_PIECE);
    wear(s, 'boots', gear(s, 'boots', 'normal')).rune = 'rune_rime_1';
    expect(runeMult(s, 'rime')).toBe(1);
    expect(runeStats(s).fireRes).toBeCloseTo(5 * 1.1);
    expect(runeStats(s).firePct).toBeCloseTo(8 * 1.1);
  });

  it('Deep Cuts and Living Script add to it', () => {
    const s = act3();
    wear(s, 'helmet', gear(s, 'helmet', 'normal')).rune = 'rune_ember_1';
    wear(s, 'boots', gear(s, 'boots', 'normal')).rune = 'rune_ember_1';
    s.skillPassives.push('runecarving_n1', 'runecarving_ks');
    expect(runeMult(s, 'ember')).toBeCloseTo((1 + 2 * RESONANCE_PER_PIECE) * 1.1);
  });
});

describe('saves and the shared stash', () => {
  it('keeps a rune through the stash, a save and a second character', () => {
    const s = act3();
    const item = gear(s, 'amulet');
    item.rune = 'rune_keen_4';
    s.inventory.push(item);
    expect(stashItems(s, ctx(), [item.uid])).toBe(1);
    const stored = s.account.stash[0][0];
    expect(stored.rune).toBe('rune_keen_4');

    const account = JSON.parse(JSON.stringify(s.account));
    const other = newGame(2);
    other.account = account;
    expect(takeFromStash(other, ctx(), [stored.uid])).toBe(1);
    expect(other.inventory[0].rune).toBe('rune_keen_4');
    expect(itemRune(other.inventory[0])).toBe(runeDef('rune_keen_4'));
  });

  it('migrates a version 22 save: the skill starts at zero and old gear loads with an empty slot', () => {
    const s = veteran(newGame(1));
    const worn = wear(s, 'helmet', gear(s, 'helmet'));
    s.inventory.push(gear(s, 'ring'));
    s.account = freshAccount();
    const raw = JSON.parse(serialize(s));
    raw.version = 22;
    delete raw.skills.runecarving;
    const loaded = deserialize(JSON.stringify(raw));
    loaded.account = s.account;
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.skills.runecarving).toBe(0);
    expect(loaded.equipment.helmet?.rune).toBeUndefined();
    expect(loaded.equipment.helmet?.uid).toBe(worn.uid);
    expect(() => deriveStats(loaded)).not.toThrow();
  });

  it('ignores a rune the game no longer knows', () => {
    const s = act3();
    wear(s, 'helmet', gear(s, 'helmet')).rune = 'rune_gone_9';
    expect(runeStats(s)).toEqual({});
    expect(() => deriveStats(s)).not.toThrow();
  });
});
