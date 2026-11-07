import { describe, expect, it } from 'vitest';
import { makeCtx } from '../src/engine/context';
import { combatStep, retreat, startCombat, useFlask, wearFlask } from '../src/engine/combat';
import { deriveStats } from '../src/engine/stats';
import { applyFlaskOrb, enchantFlask, FLASK_STASH_CAP, flaskName, flaskStats, newFlask, rollFlask, stashFlask } from '../src/engine/flasks';
import { rerollCost, rerollVendor } from '../src/engine/hideout';
import { seeded } from '../src/engine/rng';
import { deserialize } from '../src/engine/save';
import { newGame, SAVE_VERSION } from '../src/engine/state';

const ctx = (seed = 1) => makeCtx(seeded(seed));

describe('flask items', () => {
  it('keeps at most 10 spares of a kind, selling the least valuable', () => {
    const s = newGame(1);
    s.account.bank.gold = 0;
    for (let i = 0; i < FLASK_STASH_CAP; i++) stashFlask(s, newFlask(s, 'life_small', 1));
    const magic = newFlask(s, 'life_small', 1);
    magic.rarity = 'magic';
    stashFlask(s, magic);
    stashFlask(s, newFlask(s, 'mana_small', 1));
    expect(s.account.flaskStash.filter((f) => f.flaskId === 'life_small')).toHaveLength(FLASK_STASH_CAP);
    expect(s.account.flaskStash).toContain(magic);
    expect(s.account.flaskStash.filter((f) => f.flaskId === 'mana_small')).toHaveLength(1);
    expect(s.account.bank.gold).toBeGreaterThan(0);
  });

  it('paid trader restocks double in price until the free one', () => {
    const s = newGame(1);
    const c = ctx();
    s.account.bank.gold = 100_000;
    const base = rerollCost(s);
    const at = s.vendor.refreshAt;
    expect(rerollVendor(s, c)).toBeNull();
    expect(rerollVendor(s, c)).toBeNull();
    expect(rerollCost(s)).toBe(base * 4);
    expect(s.vendor.refreshAt).toBe(at);
  });

  it('a spare flask goes into the first empty belt slot, and says so when the belt is full', () => {
    const s = newGame(1);
    s.flaskSlots = [newFlask(s, 'life_small', 1), newFlask(s, 'mana_small', 1), null, newFlask(s, 'granite', 30)];
    const f = newFlask(s, 'granite', 30);
    s.account.flaskStash.push(f);
    expect(wearFlask(s, f.uid)).toBeNull();
    expect(s.flaskSlots[2]).toBe(f);
    expect(s.account.flaskStash).not.toContain(f);
    const g = newFlask(s, 'granite', 30);
    s.account.flaskStash.push(g);
    expect(wearFlask(s, g.uid)).toMatch(/Utility/);
    expect(s.account.flaskStash).toContain(g);
  });

  it('magic flask modifiers change charges and recovery', () => {
    const s = newGame(1);
    const f = newFlask(s, 'life_small', 30);
    f.rarity = 'magic';
    f.prefixes = [{ affixId: 'f_capacity', value: 50 }];
    f.suffixes = [{ affixId: 'f_gain', value: 40 }];
    const st = flaskStats(f);
    expect(st.maxCharges).toBe(Math.round(21 * 1.5));
    expect(st.gainMult).toBeCloseTo(1.4);
    expect(flaskName(f)).toBe('Capacious Small Life Flask of the Hoarder');
  });

  it('orbs craft flasks: transmute, augment, alteration, scour', () => {
    const s = newGame(1);
    const c = ctx();
    s.account.bank = { transmute: 2, augment: 5, alteration: 5, scour: 1 };
    const f = newFlask(s, 'granite', 30);
    s.account.flaskStash.push(f);
    expect(applyFlaskOrb(s, c, 'augment', f.uid)).toMatch(/Magic/);
    expect(applyFlaskOrb(s, c, 'transmute', f.uid)).toBeNull();
    expect(f.rarity).toBe('magic');
    expect(f.prefixes.length + f.suffixes.length).toBeGreaterThan(0);
    while (f.prefixes.length + f.suffixes.length < 2) applyFlaskOrb(s, c, 'augment', f.uid);
    expect(applyFlaskOrb(s, c, 'augment', f.uid)).toMatch(/room/);
    expect(applyFlaskOrb(s, c, 'alteration', f.uid)).toBeNull();
    expect(applyFlaskOrb(s, c, 'scour', f.uid)).toBeNull();
    expect(f.rarity).toBe('normal');
    expect(f.prefixes).toHaveLength(0);
  });

  it('utility flask mods only roll fitting affixes', () => {
    const s = newGame(1);
    for (let i = 0; i < 200; i++) {
      const f = rollFlask(s, 40, seeded(i));
      const kind = flaskStats(f).def.kind;
      for (const m of [...f.prefixes, ...f.suffixes]) {
        if (kind === 'utility') expect(['f_recovery', 'f_speed']).not.toContain(m.affixId);
        else expect(['f_effect', 'f_duration']).not.toContain(m.affixId);
      }
    }
  });

  it('instilling is an enchantment on the flask itself', () => {
    const s = newGame(1);
    const c = ctx();
    const f = s.flaskSlots[0]!;
    expect(enchantFlask(s, c, f.uid, 'lowLife')).toMatch(/Instilling Orb/);
    s.account.bank.instill = 1;
    expect(enchantFlask(s, c, f.uid, 'lowLife')).toBeNull();
    expect(f.instill).toBe('lowLife');
    expect(s.account.bank.instill).toBe(0);
  });

  it('recovery flasks do not drink themselves without an enchantment', () => {
    const s = newGame(1);
    const c = ctx();
    startCombat(s, c, 'mudflats');
    const cb = s.combat!;
    cb.monsters = [];
    cb.spawnMs = 1e12;
    const life = s.flaskSlots[0]!;
    const mana = s.flaskSlots[1]!;
    expect(life.flaskId).toBe('life_small');
    expect(mana.flaskId).toBe('mana_small');
    life.charges = 21;
    mana.charges = 24;
    expect(life.instill).toBeNull();
    expect(mana.instill).toBeNull();
    const d = deriveStats(s);
    s.mana = d.maxMana;
    combatStep(s, c, 50, d);
    expect(life.charges).toBe(21);
    expect(mana.charges).toBe(24);
    s.life = d.maxLife * 0.3;
    s.mana = 0;
    combatStep(s, c, 50, d);
    expect(life.charges).toBe(21);
    expect(mana.charges).toBe(24);
  });

  it('retreating to the hideout refills every flask', () => {
    const s = newGame(1);
    const c = ctx();
    startCombat(s, c, 'mudflats');
    s.flaskSlots[0]!.charges = 0;
    s.flaskSlots[1]!.charges = 3;
    retreat(s);
    expect(s.combat).toBeNull();
    expect(s.flaskSlots[0]!.charges).toBe(21);
    expect(s.flaskSlots[1]!.charges).toBe(24);
  });

  it('Amethyst Flask grants Chaos Resistance while active', () => {
    const s = newGame(1);
    const c = ctx();
    const f = newFlask(s, 'amethyst', 20);
    f.charges = 40;
    s.flaskSlots[2] = f;
    startCombat(s, c, 'mudflats');
    expect(deriveStats(s).res.chaos).toBe(0);
    expect(useFlask(s, c, 2)).toBeNull();
    expect(deriveStats(s).res.chaos).toBe(35);
  });

  it('reduced charges used is applied when drinking', () => {
    const s = newGame(1);
    const c = ctx();
    const f = s.flaskSlots[0]!;
    f.rarity = 'magic';
    f.prefixes = [{ affixId: 'f_saving', value: 30 }];
    f.charges = 21;
    startCombat(s, c, 'mudflats');
    expect(useFlask(s, c, 0)).toBeNull();
    expect(f.charges).toBe(21 - Math.round(7 * 0.7));
  });

  it('old flasks migrate to normal flask items', () => {
    const old = newGame(1) as unknown as Record<string, unknown>;
    const slots = old.flaskSlots as Record<string, unknown>[];
    for (const f of slots) if (f) (delete f.rarity, delete f.prefixes, delete f.suffixes, delete f.ilvl);
    old.version = 4;
    const s = deserialize(JSON.stringify(old));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.flaskSlots[0]?.rarity).toBe('normal');
    expect(s.flaskSlots[0]?.prefixes).toEqual([]);
  });
});
