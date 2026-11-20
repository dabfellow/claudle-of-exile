import { describe, expect, it } from 'vitest';
import { affixDef } from '../src/data/affixes';
import { BASES } from '../src/data/bases';
import { isMaterial } from '../src/data/materials';
import { ZONES } from '../src/data/zones';
import { fillAccount } from '../src/engine/account';
import { makeCtx } from '../src/engine/context';
import { applyOrb, orbReason, ORBS } from '../src/engine/crafting';
import { addRandomMod, allMods, createItem, modCount, settleItemMarks } from '../src/engine/items';
import { rollLoot } from '../src/engine/loot';
import { mapsHeld } from '../src/engine/maps';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameEvent, GameState, Item, MonsterInstance } from '../src/engine/types';

/** Each test follows a drop through to its use: the halves used to pass on their own while the whole was broken. */

const ring = BASES.find((b) => b.slot === 'ring')!;
const game = () => newGame(1, { name: 'Tester', classId: 'warrior' });

function naturalFractured(s: GameState): Item {
  for (let seed = 1; seed < 500; seed++) {
    const item = createItem(s, ring.id, 84, 'rare', seeded(seed), undefined, 5);
    if (item.fractured) return item;
  }
  throw new Error('no natural fractured item rolled');
}

describe('Fractured Orbs', () => {
  it('an old stock of the unusable Doomed Map orb becomes the one the Bench spends', () => {
    const s = game();
    s.account.bank.fractured_orb = 5;
    s.account.bank.fractured = 1;
    fillAccount(s.account);
    expect(s.account.bank.fractured).toBe(6);
    expect(s.account.bank.fractured_orb).toBeUndefined();

    const item = createItem(s, ring.id, 84, 'rare', seeded(3));
    while (modCount(item) < 4) addRandomMod(item, seeded(9));
    s.inventory.push(item);
    expect(orbReason(s, 'fractured', item.uid)).toBeNull();
    expect(applyOrb(s, makeCtx(seeded(1)), 'fractured', item.uid)).toBeNull();
    expect(s.account.bank.fractured).toBe(5);
    expect(allMods(item).filter((m) => m.fractured)).toHaveLength(1);
  });
});

describe('natural fractured tier 5 drops', () => {
  it('lock the modifier, so Chaos Orbs keep it', () => {
    const s = game();
    const item = naturalFractured(s);
    const locked = allMods(item).filter((m) => m.fractured);
    expect(locked).toHaveLength(1);
    expect(locked[0].affixId).toBe(item.fractured);

    s.inventory.push(item);
    s.account.bank.chaos = 30;
    const ctx = makeCtx(seeded(7));
    for (let i = 0; i < 30; i++) {
      expect(applyOrb(s, ctx, 'chaos', item.uid)).toBeNull();
      expect(allMods(item).some((m) => m.fractured && m.affixId === item.fractured)).toBe(true);
    }
  });

  it('never appear from rerolling an item that dropped without one', () => {
    const s = game();
    let item: Item | undefined;
    for (let seed = 1; seed < 200 && !item; seed++) {
      const made = createItem(s, ring.id, 84, 'rare', seeded(seed), undefined, 5);
      if (!made.fractured) item = made;
    }
    s.inventory.push(item!);
    s.account.bank.chaos = 60;
    const ctx = makeCtx(seeded(11));
    for (let i = 0; i < 60; i++) applyOrb(s, ctx, 'chaos', item!.uid);
    expect(item!.fractured).toBeUndefined();
    expect(allMods(item!).some((m) => m.fractured)).toBe(false);
  });

  it('repairs items marked before the fix when the save loads', () => {
    const s = game();
    const kept = createItem(s, ring.id, 84, 'rare', seeded(21));
    kept.fractured = kept.prefixes[0]?.affixId ?? kept.suffixes[0].affixId; // marked, modifier still there, not locked
    const stale = createItem(s, ring.id, 84, 'rare', seeded(22));
    stale.fractured = 'an_affix_long_since_rerolled';
    s.inventory.push(kept, stale);

    const loaded = deserialize(serialize(s));
    const [a, b] = loaded.inventory.slice(-2);
    expect(allMods(a).find((m) => m.fractured)?.affixId).toBe(a.fractured);
    expect(b.fractured).toBeUndefined();
    // the stale one can take a real Fractured Orb again
    while (modCount(b) < 4) addRandomMod(b, seeded(5));
    expect(ORBS.fractured.canApply(b)).toBeNull();
  });
});

describe("Exile's Doom Sigil", () => {
  function elevated(s: GameState) {
    const item = createItem(s, ring.id, 100, 'rare', seeded(5));
    const mod = allMods(item)[0];
    const affix = affixDef(mod.affixId);
    mod.tier = affix.tiers.length - 1;
    mod.values = affix.tiers[mod.tier].ranges.map(([, hi]) => hi);
    for (const other of allMods(item).slice(1)) other.tier = 0;
    s.inventory.push(item);
    s.account.bank.exile_doom_sigil = 2;
    expect(applyOrb(s, makeCtx(seeded(11)), 'exile_doom_sigil', item.uid)).toBeNull();
    return { item, mod: allMods(item).find((m) => m.elevated)! };
  }

  it('keeps its raised values through Divine Orbs', () => {
    const s = game();
    const { item, mod } = elevated(s);
    const ranges = affixDef(mod.affixId).tiers[mod.tier].ranges;
    s.account.bank.divine = 20;
    const ctx = makeCtx(seeded(13));
    for (let i = 0; i < 20; i++) {
      expect(applyOrb(s, ctx, 'divine', item.uid)).toBeNull();
      mod.values.forEach((v, k) => {
        expect(v).toBeGreaterThanOrEqual(Math.round(ranges[k][0] * 1.3));
        expect(v).toBeLessThanOrEqual(Math.round(ranges[k][1] * 1.3));
      });
    }
    expect(item.elevated).toBe(mod.affixId);
  });

  it('can be used again once the elevated modifier is gone', () => {
    const s = game();
    const { item, mod } = elevated(s);
    item.prefixes = item.prefixes.filter((m) => m !== mod);
    item.suffixes = item.suffixes.filter((m) => m !== mod);
    settleItemMarks(item);
    expect(item.elevated).toBeUndefined();
    expect(ORBS.exile_doom_sigil.canApply(item)).not.toBe('Item already has an elevated Tier 0 modifier');
  });
});

describe("the Map Device's bonus map (level 6)", () => {
  it('lands in the map supply, and every loot line names a known material', () => {
    const s = game();
    s.account.campaignDone = true;
    s.account.hideout.map_device = 6;
    const zone = ZONES.find((z) => z.tier >= 18) ?? ZONES[ZONES.length - 1];
    s.maps.run = { tier: 5 } as GameState['maps']['run'];
    s.combat = { zoneId: zone.id, monsters: [] } as unknown as GameState['combat'];
    const d = deriveStats(s);
    const events: GameEvent[] = [];
    for (let seed = 1; seed <= 200; seed++) {
      rollLoot(s, makeCtx(seeded(seed), 0, events), { level: 75, isBoss: true, scale: 1, life: 0 } as unknown as MonsterInstance, zone, d);
    }
    expect(mapsHeld(s, 5)).toBeGreaterThan(0);
    expect(Object.keys(s.account.bank).filter((id) => id.startsWith('map_'))).toEqual([]);
    const unknown = events.filter((e) => e.t === 'loot' && e.currencyId && !isMaterial(e.currencyId));
    expect(unknown).toEqual([]);
  });

  it('maps stranded in the bank before the fix join the map supply on load', () => {
    const s = game();
    s.account.bank.map_t5 = 3;
    s.account.maps = { map_t5: 1 };
    fillAccount(s.account);
    expect(s.account.bank.map_t5).toBeUndefined();
    expect(s.account.maps.map_t5).toBe(4);
  });
});
