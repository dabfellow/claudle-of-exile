import { describe, expect, it } from 'vitest';
import { BAG_SIZE, bagSize } from '../src/data/hideout';
import { makeCtx } from '../src/engine/context';
import { createItem } from '../src/engine/items';
import { placeItem } from '../src/engine/loot';
import { inventoryFilterAction, runFilterOnInventory } from '../src/engine/lootRouting';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { bagCap, bagFull, pickUp } from '../src/engine/storage';
import { hasCraftOutputRoom, storeCraftOutput } from '../src/engine/craftOutput';
import type { GameState, Item } from '../src/engine/types';

const ctx = (offline = false) => ({ ...makeCtx(seeded(5)), offline });
const sword = (s: GameState, rarity: Item['rarity'] = 'normal'): Item => createItem(s, 'rusted_sword', 1, rarity, seeded(s.nextUid));
const fill = (s: GameState) => {
  while (!bagFull(s)) s.inventory.push(sword(s));
};

describe('inventory size', () => {
  it('holds 100, plus 20 per Stash level past the first', () => {
    expect(bagSize(1)).toBe(BAG_SIZE);
    expect(BAG_SIZE).toBe(100);
    expect(bagSize(2)).toBe(120);
    expect(bagSize(9)).toBe(260);
    const s = newGame(1);
    s.account.hideout.stash = 4;
    expect(bagCap(s)).toBe(160);
  });
});

describe('where loot goes', () => {
  it('keeps a drop on the ground until it is picked up', () => {
    const s = newGame(1);
    const item = sword(s);
    placeItem(s, ctx(), item);
    expect(s.inventory).toHaveLength(0);
    expect(s.ground).toEqual([item]);
    expect(pickUp(s, ctx(), 'ground', [item.uid])).toBe(1);
    expect(s.inventory).toHaveLength(1);
    expect(s.ground).toHaveLength(0);
  });

  it('time-away drops wait in the haul', () => {
    const s = newGame(1);
    placeItem(s, ctx(true), sword(s));
    expect(s.inventory).toHaveLength(0);
    expect(s.offlineHaul).toHaveLength(1);
  });

  it('leaves loot on the ground when pickup cannot fit', () => {
    const s = newGame(1);
    fill(s);
    placeItem(s, ctx(), sword(s));
    expect(s.ground).toHaveLength(1);
    expect(pickUp(s, ctx(), 'ground', [s.ground[0].uid])).toBe(0);
    expect(s.ground).toHaveLength(1);
    placeItem(s, ctx(true), sword(s));
    expect(s.offlineHaul).toHaveLength(1);
    expect(s.inventory).toHaveLength(bagCap(s));
  });

  it('runs Send to stash rules on picked-up items', () => {
    const s = newGame(1);
    s.settings.lootFilter!.rules = [{ id: 'rares', name: 'Rares to stash', enabled: true, rarities: ['rare'], action: 'send_to_stash' }];
    placeItem(s, ctx(), sword(s, 'rare'));
    placeItem(s, ctx(), sword(s, 'normal'));
    expect(s.storage.stash.flat()).toHaveLength(0);
    expect(pickUp(s, ctx(), 'ground', s.ground.map((item) => item.uid))).toBe(2);
    expect(runFilterOnInventory(s, ctx()).stashed).toBe(1);
    expect(s.storage.stash.flat().map((i) => i.rarity)).toEqual(['rare']);
    expect(s.inventory.map((i) => i.rarity)).toEqual(['normal']);
  });

  it('Run filter leaves a picked-up item in inventory when the stash is full', () => {
    const s = newGame(1);
    s.settings.lootFilter!.rules = [{ id: 'all', name: 'All to stash', enabled: true, action: 'send_to_stash' }];
    for (const page of s.storage.stash) while (page.length < 80) page.push(sword(s));
    placeItem(s, ctx(), sword(s));
    pickUp(s, ctx(), 'ground', [s.ground[0].uid]);
    expect(runFilterOnInventory(s, ctx()).stashed).toBe(0);
    expect(s.inventory).toHaveLength(1);
  });

  it('auto-salvage stays behind its upgrades: before them the drop is kept', () => {
    const s = newGame(1);
    s.settings.lootFilter!.rules = [{ id: 'n', name: 'Salvage normals', enabled: true, rarities: ['normal'], action: 'auto_salvage' }];
    placeItem(s, ctx(), sword(s));
    expect(s.ground).toHaveLength(1);
    s.account.hideout.bench = 2;
    s.account.hideout.quartermaster = 4;
    placeItem(s, ctx(), sword(s));
    expect(s.ground).toHaveLength(1);
    expect(s.storage.bank.arcane_dust).toBeGreaterThan(0);
  });
});

describe('where crafted gear goes', () => {
  it('fills the inventory by default, then uses the stash', () => {
    const s = newGame(1);
    expect(storeCraftOutput(s, sword(s))).toBe(true);
    expect(s.inventory).toHaveLength(1);
    fill(s);
    const item = sword(s);
    expect(storeCraftOutput(s, item)).toBe(true);
    expect(s.storage.stash[0][0].uid).toBe(item.uid);
  });

  it('fills the stash first when selected, then falls back to inventory', () => {
    const s = newGame(1);
    s.settings.craftFillFirst = 'stash';
    expect(storeCraftOutput(s, sword(s))).toBe(true);
    expect(s.inventory).toHaveLength(0);
    for (const page of s.storage.stash) while (page.length < 80) page.push(sword(s));
    expect(storeCraftOutput(s, sword(s))).toBe(true);
    expect(s.inventory).toHaveLength(1);
    fill(s);
    expect(hasCraftOutputRoom(s)).toBe(false);
    expect(storeCraftOutput(s, sword(s))).toBe(false);
  });
});

describe('Run filter on the inventory', () => {
  it('stashes and salvages what the rules say, and leaves the rest', () => {
    const s = newGame(1);
    s.account.hideout.bench = 2;
    s.account.hideout.quartermaster = 4;
    s.settings.lootFilter!.rules = [
      { id: 'r', name: 'Rares to stash', enabled: true, rarities: ['rare'], action: 'send_to_stash' },
      { id: 'n', name: 'Salvage normals', enabled: true, rarities: ['normal'], action: 'auto_salvage' },
    ];
    const rare = sword(s, 'rare');
    const normal = sword(s, 'normal');
    const magic = sword(s, 'magic');
    s.inventory.push(rare, normal, magic);
    expect(inventoryFilterAction(s, rare)).toBe('stash');
    expect(inventoryFilterAction(s, normal)).toBe('salvage');
    expect(inventoryFilterAction(s, magic)).toBeNull();
    expect(runFilterOnInventory(s, ctx())).toEqual({ stashed: 1, salvaged: 1 });
    expect(s.inventory).toEqual([magic]);
    expect(s.storage.stash.flat()).toHaveLength(1);
  });

  it('never salvages uniques or runed gear', () => {
    const s = newGame(1);
    s.account.hideout.bench = 2;
    s.account.hideout.quartermaster = 7;
    s.settings.lootFilter!.rules = [{ id: 'all', name: 'Salvage all', enabled: true, action: 'auto_salvage' }];
    const runed = sword(s, 'rare');
    runed.rune = 'rune_ember';
    s.inventory.push(runed);
    expect(inventoryFilterAction(s, runed)).toBeNull();
  });
});
