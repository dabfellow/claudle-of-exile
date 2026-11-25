import { affixDef } from '../data/affixes';
import { baseDef } from '../data/bases';
import { CORRUPTED_ITEM, CORRUPTION_IMPLICITS, VALOR_ORB, type CorruptionImplicitId } from '../data/corruption';
import { hasItem, payCost } from './bank';
import type { Ctx } from './context';
import { findItem, isCraftLocked } from './crafting';
import { allMods, droppableBases, itemName, settleItemMarks } from './items';
import { pick, rInt, type Rng } from './rng';
import { addStashItem } from './storage';
import type { GameState, Item, RolledMod } from './types';

type Range = [number, number];

export function corruptionReason(s: GameState, uid: number): string | null {
  const item = findItem(s, uid);
  if (!item) return 'Choose a piece of gear';
  if (item.corrupted) return CORRUPTED_ITEM;
  if (Object.values(s.equipment).includes(item)) return 'Unequip this item before corrupting it';
  if (isCraftLocked(s, uid)) return 'Stop auto-crafting this item first';
  return hasItem(s, VALOR_ORB, 1) ? null : 'Requires a Valor Orb';
}

function rollRanges(ranges: Range[], rng: Rng): number[] {
  return ranges.map(([low, high]) => rInt(rng, low, high));
}

function numericMod(mod: RolledMod): boolean {
  const def = affixDef(mod.affixId);
  // Some unique values encode a passive choice or a binary effect instead of a magnitude.
  return def.stats.length > 0 && /\{\d\}/.test(def.text) && mod.values.some((value) => value > 0);
}

function improveMod(mod: RolledMod, rng: Rng): void {
  const tiers = affixDef(mod.affixId).tiers;
  const next = mod.tier >= 0 && !mod.elevated ? tiers[mod.tier + 1] : undefined;
  if (next) {
    mod.tier++;
    mod.values = rollRanges(next.ranges, rng).map((roll, index) => Math.max(roll, mod.values[index] ?? roll));
    return;
  }

  const peak = mod.tier >= 0 ? tiers.at(-1)?.ranges : undefined;
  mod.corruptionRange = mod.values.map((value, index) => {
    const maximum = peak?.[index]?.[1] ?? value;
    return [Math.max(value, Math.round(maximum * 3)), Math.max(value, Math.round(maximum * 5))];
  });
  const roll = rng.next();
  mod.values = mod.corruptionRange.map(([low, high]) => low + Math.floor(roll * (high - low + 1)));
  delete mod.elevated;
}

function canLower(mod: RolledMod): boolean {
  return mod.elevated === true || mod.tier > 0 || (mod.tier < 0 && numericMod(mod));
}

function lowerMod(mod: RolledMod, rng: Rng): void {
  if (mod.tier < 0) {
    mod.values = mod.values.map((value) => value > 0 ? Math.floor(value * 0.75) : value);
    return;
  }
  if (!mod.elevated) mod.tier--;
  delete mod.elevated;
  const ranges = affixDef(mod.affixId).tiers[mod.tier]?.ranges;
  if (ranges) mod.values = rollRanges(ranges, rng).map((roll, index) => Math.min(roll, mod.values[index] ?? roll));
}

function replaceGear(s: GameState, item: Item, replacement?: Item): void {
  const lists = [s.inventory, ...s.storage.stash, s.storage.overflow, s.storage.uniqueStash];
  const list = lists.find((entries) => entries.includes(item))!;
  const index = list.indexOf(item);
  const uid = item.uid;
  if (replacement && list !== s.storage.uniqueStash) list.splice(index, 1, replacement);
  else {
    list.splice(index, 1);
    if (replacement && !addStashItem(s, replacement)) s.storage.overflow.push(replacement);
  }
  for (const set of s.loadouts.gear) {
    for (const slot of Object.keys(set.items) as (keyof typeof set.items)[]) {
      if (set.items[slot] === uid) delete set.items[slot];
    }
  }
  s.forging.pendingSinging = s.forging.pendingSinging.filter((key) => key !== uid);
  s.forging.rack = s.forging.rack.filter((key) => key !== uid);
  s.woodcrafting.rack = s.woodcrafting.rack.filter((key) => key !== uid);
}

function goodCorruption(item: Item, rng: Rng): string {
  const candidates = allMods(item).filter(numericMod);
  if (candidates.length && rng.next() < 0.5) {
    improveMod(pick(rng, candidates), rng);
    return 'Raised a modifier tier';
  }
  const id = pick(rng, Object.keys(CORRUPTION_IMPLICITS) as CorruptionImplicitId[]);
  const { min, max } = CORRUPTION_IMPLICITS[id];
  item.corruptionImplicit = { id, value: rInt(rng, min, max) };
  return 'Added a corruption implicit';
}

function badCorruption(s: GameState, item: Item, rng: Rng): string {
  const mods = allMods(item);
  const lowerable = mods.filter(canLower);
  const outcomes = [
    { id: 'destroy', available: true },
    { id: 'lower', available: lowerable.length > 0 },
    { id: 'remove', available: mods.length > 0 },
    { id: 'transform', available: true },
    { id: 'strip', available: !!baseDef(item.baseId).implicits?.length },
  ];
  switch (pick(rng, outcomes.filter(({ available }) => available)).id) {
    case 'destroy':
      replaceGear(s, item);
      return 'Destroyed the item';
    case 'lower':
      for (const mod of lowerable) lowerMod(mod, rng);
      return 'Lowered modifier tiers';
    case 'remove': {
      const removed = pick(rng, mods);
      item.prefixes = item.prefixes.filter((mod) => mod !== removed);
      item.suffixes = item.suffixes.filter((mod) => mod !== removed);
      return 'Removed a modifier';
    }
    case 'transform': {
      const base = pick(rng, droppableBases(item.ilvl).filter(({ id }) => id !== item.baseId));
      const replacement: Item = { uid: item.uid, baseId: base.id, ilvl: item.ilvl, rarity: 'normal', name: null, prefixes: [], suffixes: [], corrupted: true };
      replaceGear(s, item, replacement);
      return `Transformed into ${base.name}`;
    }
    default:
      item.lostBaseImplicits = true;
      return 'Removed the base implicits';
  }
}

export function corruptGear(s: GameState, ctx: Ctx, uid: number): string | null {
  const reason = corruptionReason(s, uid);
  if (reason) return reason;
  const item = findItem(s, uid)!;
  const name = itemName(item);
  payCost(s, { [VALOR_ORB]: 1 });
  item.corrupted = true;
  const roll = ctx.rng.next();
  const result = roll < 1 / 3 ? goodCorruption(item, ctx.rng) : roll < 2 / 3 ? badCorruption(s, item, ctx.rng) : 'No stat change';
  settleItemMarks(item);
  s.lifetime.orbsUsed++;
  ctx.emit({ t: 'craft', text: `${name} corrupted: ${result}.`, uid, orbId: VALOR_ORB });
  ctx.emit({ t: 'info', text: `${name} corrupted: ${result}.`, tone: roll < 1 / 3 ? 'good' : roll < 2 / 3 ? 'warn' : undefined });
  return null;
}
