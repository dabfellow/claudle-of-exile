import { BOSS_CRAFT_MAT, CONTRABAND_DROP, ESSENCES, FOSSILS, SEAL, WAX } from '../data/craftMats';
import { WHETSTONE, WHETSTONE_DROP } from '../data/expedition';
import { areaCurrency, BOSS_GATHER_DROP, bossGatherMats, bossTable, dropTable, STARTER_DROPS, type RarityWeights } from '../data/drops';
import { AUTO_SALVAGE_WAR_TABLE_LEVEL, MAP_ILVL } from '../data/hideout';
import { RUNE_DROP, RUNES } from '../data/runes';
import { rollFlask, stashFlask } from './flasks';
import type { ZoneDef } from '../data/zones';
import { seeUnique } from './account';
import { addBank } from './bank';
import type { Ctx } from './context';
import { benchBuilt } from './crafting';
import { stationLevel } from './hideout';
import { dropItem } from './storage';
import { createItem, createUnique, droppableBases, salvageValue } from './items';
import { chance, pick, pickWeighted, rInt } from './rng';
import type { Derived } from './stats';
import type { GameState, Item, MonsterInstance, Rarity } from './types';

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
  if (item.rarity === 'unique') {
    s.lifetime.uniquesFound += 1;
    seeUnique(s.account, item);
  }
  const autoLevel = item.rarity === 'unique' ? Infinity : AUTO_SALVAGE_WAR_TABLE_LEVEL[item.rarity];
  if (item.rarity !== 'unique' && s.settings.autoSalvage[item.rarity] && benchBuilt(s) && stationLevel(s, 'war_table') >= autoLevel) {
    addBank(s, 'arcane_dust', salvageValue(item));
    s.lifetime.salvaged += 1;
    ctx.emit({ t: 'loot', item, salvaged: true });
    return;
  }
  dropItem(s, ctx, item);
  s.lifetime.itemsLooted += 1;
  ctx.emit({ t: 'loot', item });
}

/** Everything a monster drops; an event can roll it more than once. */
export function rollLoot(s: GameState, ctx: Ctx, mon: MonsterInstance, zone: ZoneDef, d: Derived): void {
  for (let i = 0; i < (ctx.event?.loot ?? 1); i++) rollDrops(s, ctx, mon, zone, d);
}

function rollDrops(s: GameState, ctx: Ctx, mon: MonsterInstance, zone: ZoneDef, d: Derived): void {
  const { rng } = ctx;
  const table = dropTable(zone.tier);
  const orbs = areaCurrency(zone);
  const ilvl = mon.level + (zone.ilvlBonus ?? 0) + MAP_ILVL[stationLevel(s, 'map_device') - 1];
  const giveCurrency = (id: string, qty = 1) => {
    addBank(s, id, qty);
    ctx.emit({ t: 'loot', currencyId: id, qty });
  };

  const gold = Math.round(rInt(rng, 1, Math.max(1, Math.round(mon.level / 3))) * (mon.isBoss ? 15 : 1) * mon.scale);
  addBank(s, 'gold', gold);
  if (zone.act >= CONTRABAND_DROP.firstAct && chance(rng, mon.isBoss ? CONTRABAND_DROP.bossChance : CONTRABAND_DROP.killChance)) giveCurrency(pick(rng, [SEAL, WAX]));

  if (zone.act >= WHETSTONE_DROP.firstAct && chance(rng, mon.isBoss ? WHETSTONE_DROP.bossChance : WHETSTONE_DROP.killChance)) giveCurrency(WHETSTONE);

  if (zone.act >= RUNE_DROP.firstAct && chance(rng, mon.isBoss ? RUNE_DROP.bossChance : RUNE_DROP.killChance)) giveCurrency(pick(rng, RUNES.filter((r) => r.grade.grade <= RUNE_DROP.maxGrade)).id);

  if (mon.isBoss) {
    const boss = bossTable(zone.tier);
    const firstKill = !s.bossesDefeated.includes(zone.id);
    if ((!s.maps.run && firstKill) || chance(rng, 0.25)) giveCurrency('boss_trophy');
    if (firstKill || chance(rng, boss.repeatChance)) for (const g of boss.guaranteed) giveCurrency(g.id, g.qty);
    for (let i = 0; i < boss.currencyRolls; i++) giveCurrency(rollCurrency(rng, orbs));
    const count = rInt(rng, boss.items[0], boss.items[1]);
    for (let i = 0; i < count; i++) {
      const base = pick(rng, droppableBases(ilvl));
      placeItem(s, ctx, createItem(s, base.id, ilvl, rollRarity(rng, d.itemRarity, boss.rarity), rng));
    }
    if (chance(rng, boss.flaskChance)) dropFlask(s, ctx, ilvl);
    if (zone.uniques.length && chance(rng, boss.uniqueChance * (1 + d.itemRarity / 100))) placeItem(s, ctx, createUnique(s, pick(rng, zone.uniques), ilvl));
    if (chance(rng, BOSS_CRAFT_MAT.chance)) {
      // Greater Essences only from the later Act 1 areas
      const essences = ESSENCES.filter((e) => e.tier === 0 || zone.levelRange[0] >= 12);
      giveCurrency(pick(rng, [...FOSSILS, ...essences]).id, rInt(rng, ...BOSS_CRAFT_MAT.qty));
    }
    if (chance(rng, BOSS_GATHER_DROP.chance)) giveCurrency(pick(rng, bossGatherMats(mon.level)), rInt(rng, ...BOSS_GATHER_DROP.qty));
    return;
  }

  const starter = STARTER_DROPS[s.lifetime.kills];
  if (starter && 'slot' in starter) {
    const base = pick(rng, droppableBases(ilvl).filter((b) => b.slot === starter.slot));
    placeItem(s, ctx, createItem(s, base.id, ilvl, 'normal', rng));
  } else if (starter) giveCurrency(starter.currency, starter.qty);

  if (chance(rng, table.currencyChance * mon.scale * (1 + d.itemRarity / 300))) giveCurrency(rollCurrency(rng, orbs));
  if (chance(rng, table.itemChance * mon.scale)) {
    const base = pick(rng, droppableBases(ilvl));
    placeItem(s, ctx, createItem(s, base.id, ilvl, rollRarity(rng, d.itemRarity, table.rarity), rng));
  }
  if (chance(rng, table.flaskChance * mon.scale)) dropFlask(s, ctx, ilvl);
  if (zone.uniques.length && chance(rng, table.uniqueChance * (1 + d.itemRarity / 100))) placeItem(s, ctx, createUnique(s, pick(rng, zone.uniques), ilvl));
}

function dropFlask(s: GameState, ctx: Ctx, ilvl: number): void {
  const flask = rollFlask(s, ilvl, ctx.rng);
  stashFlask(s, flask);
  ctx.emit({ t: 'loot', flask });
}
