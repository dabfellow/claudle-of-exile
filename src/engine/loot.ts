import { BOSS_CRAFT_MAT, CONTRABAND_DROP, ESSENCES, FOSSILS, SEAL, WAX } from '../data/craftMats';
import { WHETSTONE, WHETSTONE_DROP } from '../data/expedition';
import { areaCurrency, BOSS_GATHER_DROP, bossGatherMats, bossTable, dropTable, STARTER_DROPS, type RarityWeights } from '../data/drops';
import { AUTO_SALVAGE_QUARTERMASTER_LEVEL, MAP_ILVL } from '../data/hideout';
import { RUNE_DROP, RUNES } from '../data/runes';
import { CURRENCIES } from '../data/materials';
import { rollFlask, rollUniqueFlask, stashFlask } from './flasks';
import type { ZoneDef } from '../data/zones';
import { seeUnique } from './account';
import { addBank } from './bank';
import type { Ctx } from './context';
import { benchBuilt } from './crafting';
import { stationLevel } from './hideout';
import { dropItem } from './storage';
import { createItem, createUnique, droppableBases, salvageValue, itemMatchesClass } from './items';
import { evaluateLootFilter, shouldSalvageByFilter } from './lootFilter';
import { HARD_BOSSES, UBER_BOSSES, uniqueMapDef } from '../data/maps';
import { worldDropUniques } from '../data/uniqueDrops';
import { runModifiers } from './maps';
import { chance, pick, pickWeighted, rInt } from './rng';
import type { Derived } from './stats';
import type { GameState, Item, MonsterInstance, Rarity } from './types';

const CURRENCY_ORBS = new Set(CURRENCIES.map((c) => c.id));

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
  const autoLevel = item.rarity === 'unique' ? Infinity : AUTO_SALVAGE_QUARTERMASTER_LEVEL[item.rarity];
  const autoByRarity = item.rarity !== 'unique' && s.settings.autoSalvage[item.rarity] && benchBuilt(s) && stationLevel(s, 'quartermaster') >= autoLevel;
  const autoByClassFilter = item.rarity !== 'unique' && s.settings.filterOffClassLoot && !itemMatchesClass(s.character.classId, item);
  
  const filterResult = evaluateLootFilter(s, item);
  const activeLegacy = s.settings.customLootFilters?.find((filter) => filter.id === s.settings.activeLootFilterId);
  const legacySalvage = !!activeLegacy && shouldSalvageByFilter(activeLegacy, item, s.character.classId);
  const autoByCustomFilter = legacySalvage || (filterResult.autoSalvage && (filterResult.salvageWithoutUnlock || (benchBuilt(s) && stationLevel(s, 'quartermaster') >= autoLevel)));

  if (autoByRarity || autoByClassFilter || autoByCustomFilter) {
    addBank(s, 'arcane_dust', salvageValue(item));
    s.lifetime.salvaged += 1;
    ctx.emit({ t: 'loot', item, salvaged: true });
    return;
  }
  dropItem(s, ctx, item);
  s.lifetime.itemsLooted += 1;
  ctx.emit({ t: 'loot', item, filterSound: filterResult.sound && !ctx.offline });
}

export function rollItemTier(zone: ZoneDef, isBoss: boolean, isDoomed: boolean, rng: Ctx['rng']): 1 | 2 | 3 | 4 | 5 {
  if (isDoomed) return rng.next() < 0.4 ? 5 : 4;
  const tier = zone.tier;
  if (tier >= 18) {
    const mapTier = tier - 17;
    if (mapTier >= 10) {
      if (isBoss && rng.next() < 0.3) return 5;
      return rng.next() < 0.6 ? 4 : 3;
    }
    if (mapTier >= 7) {
      if (isBoss && rng.next() < 0.15) return 5;
      return rng.next() < 0.4 ? 4 : 3;
    }
    if (mapTier >= 4) return rng.next() < 0.45 ? 3 : 2;
    return rng.next() < 0.35 ? 2 : 1;
  }
  if (zone.act >= 6) return isBoss && rng.next() < 0.4 ? 2 : 1;
  if (zone.act >= 4) return isBoss && rng.next() < 0.2 ? 2 : 1;
  return 1;
}

/** Trophy Altar level 4 gives rare Map drops a 10% chance to use the strongest modifier-roll tier. */
export function mapRareItemTier(s: GameState, rarity: Rarity, itemTier: 1 | 2 | 3 | 4 | 5, rng: Ctx['rng']): 1 | 2 | 3 | 4 | 5 {
  return s.maps.run && stationLevel(s, 'trophy_altar') >= 4 && rarity === 'rare' && chance(rng, 0.1) ? 5 : itemTier;
}

/** Everything a monster drops; an event can roll it more than once. */
export function rollLoot(s: GameState, ctx: Ctx, mon: MonsterInstance, zone: ZoneDef, d: Derived): void {
  const rolls = ctx.event?.loot ?? 1;
  const count = Math.floor(rolls) + (rolls % 1 > 0 && ctx.rng.next() < rolls % 1 ? 1 : 0);
  for (let i = 0; i < count; i++) rollDrops(s, ctx, mon, zone, d);
}

function rollDrops(s: GameState, ctx: Ctx, mon: MonsterInstance, zone: ZoneDef, d: Derived): void {
  const { rng } = ctx;
  const table = dropTable(zone.tier);
  const orbs = areaCurrency(zone);
  const mapMods = s.maps.run ? runModifiers(s) : null;
  const itemRarity = d.itemRarity + (mapMods?.rarityPct ?? 0);
  const altarLevel = stationLevel(s, 'trophy_altar');
  const altarMapBoss = !!s.maps.run && mon.isBoss && altarLevel >= 4;
  const currencyMult = 1 + (mapMods?.currencyPct ?? 0) / 100;
  const ilvl = mon.level + (zone.ilvlBonus ?? 0) + MAP_ILVL[stationLevel(s, 'map_device') - 1];
  const giveCurrency = (id: string, qty = 1) => {
    if (CURRENCY_ORBS.has(id)) {
      const amount = qty * Math.max(ctx.event?.loot ?? 1, ctx.event?.currencyDrops ?? 1) / (ctx.event?.loot ?? 1) * (ctx.simulation?.currencyDrops ?? 1);
      qty = Math.floor(amount) + (amount % 1 > 0 && rng.next() < amount % 1 ? 1 : 0);
    }
    addBank(s, id, qty);
    ctx.emit({ t: 'loot', currencyId: id, qty });
  };

  const lootMult = mon.lootMult ?? 1;
  const goldScale = Math.max(0, 1 + d.raw.goldFind / 100) * (s.maps.run?.uniqueMapId === 'umap_vaults' ? 4 : 1);
  const gold = Math.round(rInt(rng, 1, Math.max(1, Math.round(mon.level / 3))) * (mon.isBoss ? 15 : 1) * mon.scale * lootMult * goldScale);
  addBank(s, 'gold', gold);
  if (zone.act >= CONTRABAND_DROP.firstAct && chance(rng, mon.isBoss ? CONTRABAND_DROP.bossChance : CONTRABAND_DROP.killChance)) giveCurrency(pick(rng, [SEAL, WAX]));

  if (zone.act >= WHETSTONE_DROP.firstAct && chance(rng, mon.isBoss ? WHETSTONE_DROP.bossChance : WHETSTONE_DROP.killChance)) giveCurrency(WHETSTONE);

  if (zone.act >= RUNE_DROP.firstAct && chance(rng, mon.isBoss ? RUNE_DROP.bossChance : RUNE_DROP.killChance)) giveCurrency(pick(rng, RUNES.filter((r) => r.grade.grade <= RUNE_DROP.maxGrade)).id);

  if (mon.isBoss) {
    const finalBoss = !s.combat?.monsters.some((m) => m.isBoss && m !== mon && m.life > 0);
    if (!finalBoss) return;

    const firstKill = !s.bossesDefeated.includes(zone.id);
    const hardBoss = HARD_BOSSES.find((b) => b.zoneId === zone.id);
    if (hardBoss) {
      giveCurrency(hardBoss.trophyId, 1);
      if (firstKill || chance(rng, 0.35)) {
        placeItem(s, ctx, createUnique(s, hardBoss.uniqueId, ilvl, rng));
      }
    }

    const uberBoss = UBER_BOSSES.find((b) => b.zoneId === zone.id);
    if (uberBoss) {
      giveCurrency(uberBoss.sigilId, 1);
      if (firstKill || chance(rng, 0.35)) {
        placeItem(s, ctx, createUnique(s, pick(rng, uberBoss.uniques), ilvl, rng));
      }
    }

    if (s.maps.run?.uniqueMapId) {
      const uMap = uniqueMapDef(s.maps.run.uniqueMapId);
      if (uMap) {
        if (uMap.id === 'umap_vaults') {
          for (let i = 0; i < 6; i++) giveCurrency(rollCurrency(rng, orbs));
        }
        if (uMap.id === 'umap_olmecs') {
          dropUniqueFlask(s, ctx, ilvl);
        }
        if (uMap.id === 'umap_maelstrom') {
          const sextantCount = rInt(rng, 2, 3);
          for (let i = 0; i < sextantCount; i++) {
            giveCurrency(pick(rng, ['sextant_journeyman', 'sextant_master']), 1);
          }
        }
        if (uMap.uniques.length) {
          placeItem(s, ctx, createUnique(s, pick(rng, uMap.uniques), ilvl, rng));
        }
      }
    }

    if (s.maps.run && (s.account.hideout.map_device ?? 1) >= 6 && chance(rng, 0.15)) {
      if (chance(rng, 0.5)) {
        giveCurrency(`map_t${s.maps.run.tier}`, 1);
      } else {
        giveCurrency(pick(rng, ['uber_key_1', 'uber_key_2', 'uber_key_3']), 1);
      }
    }

    const boss = bossTable(zone.tier);
    if ((!s.maps.run && firstKill) || chance(rng, 0.25)) giveCurrency('boss_trophy');
    if (firstKill || chance(rng, boss.repeatChance)) for (const g of boss.guaranteed) giveCurrency(g.id, g.qty);
    const currencyRolls = boss.currencyRolls + (mapMods?.bossCurrencyRolls ?? 0);
    for (let i = 0; i < currencyRolls; i++) giveCurrency(rollCurrency(rng, orbs));
    const itemTier = rollItemTier(zone, true, !!s.maps.run?.doomedTier, rng);
    // Trophy Altar 4 grants a 10% additional item drop from Map Bosses.
    const count = rInt(rng, boss.items[0], boss.items[1]) + (mapMods?.bossExtraItems ?? 0) + (altarMapBoss && chance(rng, 0.1) ? 1 : 0);
    for (let i = 0; i < count; i++) {
      let pool = droppableBases(ilvl);
      if (itemTier === 5 && rng.next() < 0.3) {
        const t5Bases = pool.filter((b) => ['simplex_amulet', 'annointed_belt', 'astral_plate'].includes(b.id));
        if (t5Bases.length) pool = t5Bases;
      }
      const base = pick(rng, pool);
      const rarity = rollRarity(rng, itemRarity, boss.rarity);
      const rolledTier = mapRareItemTier(s, rarity, itemTier, rng);
      placeItem(s, ctx, createItem(s, base.id, ilvl, rarity, rng, undefined, rolledTier));
    }
    if (chance(rng, boss.flaskChance)) dropFlask(s, ctx, ilvl);
    const bossUniques = worldDropUniques(ilvl);
    if (bossUniques.length && chance(rng, boss.uniqueChance * (1 + itemRarity / 100))) placeItem(s, ctx, createUnique(s, pick(rng, bossUniques).id, ilvl, rng));
    if (chance(rng, BOSS_CRAFT_MAT.chance)) {
      // Greater Essences only from the later Act 1 areas
      const essences = ESSENCES.filter((e) => e.tier === 0 || zone.levelRange[0] >= 12);
      giveCurrency(pick(rng, [...FOSSILS, ...essences]).id, rInt(rng, ...BOSS_CRAFT_MAT.qty));
    }
    if (chance(rng, BOSS_GATHER_DROP.chance)) giveCurrency(pick(rng, bossGatherMats(mon.level)), rInt(rng, ...BOSS_GATHER_DROP.qty));
    if (zone.act >= 3 && chance(rng, hardBoss || uberBoss ? 0.15 : 0.05)) {
      dropUniqueFlask(s, ctx, ilvl);
    }
    return;
  }

  const starter = STARTER_DROPS[s.lifetime.kills];
  if (starter && 'slot' in starter) {
    const base = pick(rng, droppableBases(ilvl).filter((b) => b.slot === starter.slot));
    placeItem(s, ctx, createItem(s, base.id, ilvl, 'normal', rng));
  } else if (starter) giveCurrency(starter.currency, starter.qty);

  if (chance(rng, table.currencyChance * mon.scale * lootMult * currencyMult * (1 + itemRarity / 300))) giveCurrency(rollCurrency(rng, orbs));
  if (chance(rng, table.itemChance * mon.scale * lootMult)) {
    const itemTier = rollItemTier(zone, false, !!s.maps.run?.doomedTier, rng);
    let pool = droppableBases(ilvl);
    if (itemTier === 5 && rng.next() < 0.2) {
      const t5Bases = pool.filter((b) => ['simplex_amulet', 'annointed_belt', 'astral_plate'].includes(b.id));
      if (t5Bases.length) pool = t5Bases;
    }
    const base = pick(rng, pool);
    const rarity = rollRarity(rng, itemRarity, table.rarity);
    const rolledTier = mapRareItemTier(s, rarity, itemTier, rng);
    placeItem(s, ctx, createItem(s, base.id, ilvl, rarity, rng, undefined, rolledTier));
  }
  if (chance(rng, table.flaskChance * mon.scale * lootMult)) dropFlask(s, ctx, ilvl);
  const worldUniques = worldDropUniques(ilvl);
  if (worldUniques.length && chance(rng, table.uniqueChance * lootMult * (1 + itemRarity / 100))) placeItem(s, ctx, createUnique(s, pick(rng, worldUniques).id, ilvl, rng));
}

function dropFlask(s: GameState, ctx: Ctx, ilvl: number): void {
  const flask = rollFlask(s, ilvl, ctx.rng);
  stashFlask(s, flask);
  ctx.emit({ t: 'loot', flask });
}

export function dropUniqueFlask(s: GameState, ctx: Ctx, ilvl: number, defId?: string): void {
  const flask = rollUniqueFlask(s, ilvl, ctx.rng, defId);
  stashFlask(s, flask);
  ctx.emit({ t: 'loot', flask });
}
