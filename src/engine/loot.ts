import { MAP_ILVL } from '../data/hideout';
import { CURRENCIES } from '../data/materials';
import type { ZoneDef } from '../data/zones';
import { addBank } from './bank';
import type { Ctx } from './context';
import { inventoryCapacity, stationLevel } from './hideout';
import { createItem, createUnique, droppableBases, salvageValue } from './items';
import { chance, pick, pickWeighted, rInt } from './rng';
import type { Derived } from './stats';
import type { GameState, Item, MonsterInstance, Rarity } from './types';

export function rollRarity(rng: Ctx['rng'], itemRarity: number, boss: boolean): Rarity {
  const r = 1 + itemRarity / 100;
  const weights: Record<Rarity, number> = {
    normal: boss ? 0 : 68,
    magic: 26 * r,
    rare: 6 * r * (boss ? 3 : 1),
    unique: 0,
  };
  return pickWeighted(rng, ['normal', 'magic', 'rare'] as Rarity[], (x) => weights[x])!;
}

function placeItem(s: GameState, ctx: Ctx, item: Item): void {
  if (item.rarity !== 'unique' && s.settings.autoSalvage[item.rarity]) {
    addBank(s, 'arcane_dust', salvageValue(item));
    ctx.emit({ t: 'loot', item, salvaged: true });
    return;
  }
  if (s.inventory.length >= inventoryCapacity(s)) {
    ctx.emit({ t: 'info', text: 'Inventory full — loot left on the ground', tone: 'warn' });
    return;
  }
  s.inventory.push(item);
  s.lifetime.itemsLooted += 1;
  ctx.emit({ t: 'loot', item });
}

export function rollLoot(s: GameState, ctx: Ctx, mon: MonsterInstance, zone: ZoneDef, d: Derived): void {
  const { rng } = ctx;
  const boss = mon.isBoss;

  const gold = rInt(rng, mon.level, mon.level * 3) * (boss ? 12 : 1);
  addBank(s, 'gold', gold);

  // currency
  const pool = CURRENCIES.filter((c) => c.dropWeight > 0 && c.minTier <= zone.tier);
  const rolls = boss ? 3 : 1;
  for (let i = 0; i < rolls; i++) {
    if (!boss && !chance(rng, 0.2 * (1 + d.itemRarity / 300))) continue;
    const c = pickWeighted(rng, pool, (x) => x.dropWeight * (1 + 0.3 * (zone.tier - x.minTier)))!;
    addBank(s, c.id, 1);
    ctx.emit({ t: 'loot', currencyId: c.id, qty: 1 });
  }

  // items
  const ilvl = mon.level + MAP_ILVL[stationLevel(s, 'map_device') - 1];
  const count = boss ? 2 : chance(rng, 0.15) ? 1 : 0;
  for (let i = 0; i < count; i++) {
    const base = pick(rng, droppableBases(ilvl));
    placeItem(s, ctx, createItem(s, base.id, ilvl, rollRarity(rng, d.itemRarity, boss), rng));
  }

  // uniques
  const uniqueChance = boss ? 0.2 : 0.002;
  if (zone.uniques.length && chance(rng, uniqueChance * (1 + d.itemRarity / 100))) {
    placeItem(s, ctx, createUnique(s, pick(rng, zone.uniques), ilvl));
  }
}
