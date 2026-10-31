import { BOSS_CRAFT_MAT, ESSENCES, FOSSILS } from '../data/craftMats';
import { bossTable, dropTable, type RarityWeights } from '../data/drops';
import { ACTIVE_GEMS, gemReqLevel, SUPPORT_GEMS } from '../data/gems';
import { MAP_ILVL } from '../data/hideout';
import { rollFlask, stashFlask } from './flasks';
import { createSkillGem, createSupportGem } from './gems';
import type { ZoneDef } from '../data/zones';
import { addBank } from './bank';
import type { Ctx } from './context';
import { benchBuilt } from './crafting';
import { stationLevel } from './hideout';
import { dropItem } from './storage';
import { createItem, createUnique, droppableBases, salvageValue } from './items';
import { chance, pick, pickWeighted, rInt } from './rng';
import type { Derived } from './stats';
import type { GameState, Item, MonsterInstance, Rarity } from './types';

/** 40% skill gem, 60% support gem. */
/**
 * Gems are rare drops (the Town's Gem shop is the main source): these scale the drop tables' gem chances.
 * A gem only drops if its level requirement is within the monster's level.
 */
export const GEM_DROP_SCALE = 0.05;
export const BOSS_GEM_DROP_SCALE = 0.25;

export function dropGem(s: GameState, ctx: Ctx, maxLevel: number): void {
  if (chance(ctx.rng, 0.4)) {
    const def = pick(ctx.rng, ACTIVE_GEMS.filter((g) => gemReqLevel(g.id) <= maxLevel));
    s.gems.push(createSkillGem(s, def.id));
    ctx.emit({ t: 'loot', gemId: def.id });
  } else {
    const def = pick(ctx.rng, SUPPORT_GEMS.filter((g) => gemReqLevel(g.id) <= maxLevel));
    s.supportGems.push(createSupportGem(s, def.id));
    ctx.emit({ t: 'loot', supportId: def.id });
  }
}

export function rollRarity(rng: Ctx['rng'], itemRarity: number, weights: RarityWeights): Rarity {
  const r = 1 + itemRarity / 100;
  const w: Record<'normal' | 'magic' | 'rare', number> = { normal: weights.normal, magic: weights.magic * r, rare: weights.rare * r };
  return pickWeighted(rng, ['normal', 'magic', 'rare'] as const, (x) => w[x])!;
}

/** Pick an orb from a weighted table. */
function rollCurrency(rng: Ctx['rng'], table: Record<string, number>): string {
  const ids = Object.keys(table);
  return pickWeighted(rng, ids, (id) => table[id])!;
}

export function placeItem(s: GameState, ctx: Ctx, item: Item): void {
  if (item.rarity === 'rare') s.lifetime.raresFound += 1;
  if (item.rarity === 'unique') s.lifetime.uniquesFound += 1;
  if (item.rarity !== 'unique' && s.settings.autoSalvage[item.rarity] && benchBuilt(s)) {
    addBank(s, 'arcane_dust', salvageValue(item));
    s.lifetime.salvaged += 1;
    ctx.emit({ t: 'loot', item, salvaged: true });
    return;
  }
  dropItem(s, ctx, item);
  s.lifetime.itemsLooted += 1;
  ctx.emit({ t: 'loot', item });
}

export function rollLoot(s: GameState, ctx: Ctx, mon: MonsterInstance, zone: ZoneDef, d: Derived): void {
  const { rng } = ctx;
  const table = dropTable(zone.tier);
  const ilvl = mon.level + MAP_ILVL[stationLevel(s, 'map_device') - 1];
  const giveCurrency = (id: string, qty = 1) => {
    addBank(s, id, qty);
    ctx.emit({ t: 'loot', currencyId: id, qty });
  };

  const gold = Math.round(rInt(rng, 1, Math.max(1, Math.round(mon.level / 3))) * (mon.isBoss ? 15 : 1) * mon.scale);
  addBank(s, 'gold', gold);

  if (mon.isBoss) {
    const boss = bossTable(zone.tier);
    const firstKill = !s.bossesDefeated.includes(zone.id);
    if (firstKill || chance(rng, boss.repeatChance)) for (const g of boss.guaranteed) giveCurrency(g.id, g.qty);
    for (let i = 0; i < boss.currencyRolls; i++) giveCurrency(rollCurrency(rng, table.currency));
    const count = rInt(rng, boss.items[0], boss.items[1]);
    for (let i = 0; i < count; i++) {
      const base = pick(rng, droppableBases(ilvl));
      placeItem(s, ctx, createItem(s, base.id, ilvl, rollRarity(rng, d.itemRarity, boss.rarity), rng));
    }
    if (chance(rng, boss.flaskChance)) dropFlask(s, ctx, ilvl);
    if (chance(rng, boss.gemChance * BOSS_GEM_DROP_SCALE)) dropGem(s, ctx, mon.level);
    if (zone.uniques.length && chance(rng, boss.uniqueChance * (1 + d.itemRarity / 100))) placeItem(s, ctx, createUnique(s, pick(rng, zone.uniques), ilvl));
    if (chance(rng, BOSS_CRAFT_MAT.chance)) {
      // Greater Essences only from the later Act 1 areas
      const essences = ESSENCES.filter((e) => e.tier === 0 || zone.levelRange[0] >= 12);
      giveCurrency(pick(rng, [...FOSSILS, ...essences]).id, rInt(rng, ...BOSS_CRAFT_MAT.qty));
    }
    return;
  }

  if (chance(rng, table.currencyChance * mon.scale * (1 + d.itemRarity / 300))) giveCurrency(rollCurrency(rng, table.currency));
  if (chance(rng, table.itemChance * mon.scale)) {
    const base = pick(rng, droppableBases(ilvl));
    placeItem(s, ctx, createItem(s, base.id, ilvl, rollRarity(rng, d.itemRarity, table.rarity), rng));
  }
  if (chance(rng, table.flaskChance * mon.scale)) dropFlask(s, ctx, ilvl);
  if (chance(rng, table.gemChance * mon.scale * GEM_DROP_SCALE)) dropGem(s, ctx, mon.level);
  if (zone.uniques.length && chance(rng, table.uniqueChance * (1 + d.itemRarity / 100))) placeItem(s, ctx, createUnique(s, pick(rng, zone.uniques), ilvl));
}

function dropFlask(s: GameState, ctx: Ctx, ilvl: number): void {
  const flask = rollFlask(s, ilvl, ctx.rng);
  stashFlask(s, flask);
  ctx.emit({ t: 'loot', flask });
}
