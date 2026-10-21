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

/** drop-rate knobs (per kill) */
export const CURRENCY_DROP_CHANCE = 0.045;
export const ITEM_DROP_CHANCE = 0.06;
export const UNIQUE_CHANCE = 0.0005;
export const BOSS_UNIQUE_CHANCE = 0.06;

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

  const gold = rInt(rng, 1, Math.max(1, Math.round(mon.level / 3))) * (boss ? 15 : 1);
  addBank(s, 'gold', gold);

  // currency
  const pool = CURRENCIES.filter((c) => c.dropWeight > 0 && c.minTier <= zone.tier);
  const rolls = boss ? 2 : 1;
  for (let i = 0; i < rolls; i++) {
    if (!boss && !chance(rng, CURRENCY_DROP_CHANCE * (1 + d.itemRarity / 300))) continue;
    const c = pickWeighted(rng, pool, (x) => x.dropWeight * (1 + 0.3 * (zone.tier - x.minTier)))!;
    addBank(s, c.id, 1);
    ctx.emit({ t: 'loot', currencyId: c.id, qty: 1 });
  }

  // items
  const ilvl = mon.level + MAP_ILVL[stationLevel(s, 'map_device') - 1];
  const count = boss ? 1 + (chance(rng, 0.5) ? 1 : 0) : chance(rng, ITEM_DROP_CHANCE) ? 1 : 0;
  for (let i = 0; i < count; i++) {
    const base = pick(rng, droppableBases(ilvl));
    placeItem(s, ctx, createItem(s, base.id, ilvl, rollRarity(rng, d.itemRarity, boss), rng));
  }

  // uniques
  const uniqueChance = boss ? BOSS_UNIQUE_CHANCE : UNIQUE_CHANCE;
  if (zone.uniques.length && chance(rng, uniqueChance * (1 + d.itemRarity / 100))) {
    placeItem(s, ctx, createUnique(s, pick(rng, zone.uniques), ilvl));
  }
}
