import { affixDef } from '../data/affixes';
import { baseDef } from '../data/bases';
import { BENCH_CRAFTS } from '../data/hideout';
import type { Ctx } from './context';
import { addRandomMod, allMods, itemName, maxAffixes, modCount, openKinds, rareName, rerollMods, salvageValue, spawnWeight } from './items';
import { rInt, type Rng } from './rng';
import { canAfford, hasItem, payCost } from './bank';
import type { GameState, Item } from './types';

export interface OrbDef {
  canApply(item: Item): string | null;
  apply(item: Item, rng: Rng): void;
}

const notUnique = (item: Item) => (item.rarity === 'unique' ? 'Cannot modify unique items' : null);

export const ORBS: Record<string, OrbDef> = {
  transmute: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'normal' ? 'Item must be Normal' : null),
    apply: (i, rng) => {
      i.rarity = 'magic';
      rerollMods(i, rng);
    },
  },
  augment: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'magic' ? 'Item must be Magic' : !openKinds(i).length ? 'No room for another modifier' : null),
    apply: (i, rng) => {
      addRandomMod(i, rng);
    },
  },
  alteration: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'magic' ? 'Item must be Magic' : null),
    apply: (i, rng) => rerollMods(i, rng),
  },
  regal: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'magic' ? 'Item must be Magic' : null),
    apply: (i, rng) => {
      i.rarity = 'rare';
      i.name = rareName(i, rng);
      addRandomMod(i, rng);
    },
  },
  alchemy: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'normal' ? 'Item must be Normal' : null),
    apply: (i, rng) => {
      i.rarity = 'rare';
      rerollMods(i, rng);
    },
  },
  chaos: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'rare' ? 'Item must be Rare' : null),
    apply: (i, rng) => rerollMods(i, rng),
  },
  exalted: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'rare' ? 'Item must be Rare' : !openKinds(i).length ? 'No room for another modifier' : null),
    apply: (i, rng) => {
      addRandomMod(i, rng);
    },
  },
  annul: {
    canApply: (i) => notUnique(i) ?? (modCount(i) === 0 ? 'Item has no modifiers' : null),
    apply: (i, rng) => {
      const mods = allMods(i);
      const target = mods[rInt(rng, 0, mods.length - 1)];
      i.prefixes = i.prefixes.filter((m) => m !== target);
      i.suffixes = i.suffixes.filter((m) => m !== target);
    },
  },
  scour: {
    canApply: (i) => notUnique(i) ?? (i.rarity === 'normal' ? 'Item is already Normal' : null),
    apply: (i) => {
      i.rarity = 'normal';
      i.name = null;
      i.prefixes = [];
      i.suffixes = [];
    },
  },
  divine: {
    canApply: (i) => notUnique(i) ?? (modCount(i) === 0 ? 'Item has no modifiers' : null),
    apply: (i, rng) => {
      for (const m of allMods(i)) {
        const a = affixDef(m.affixId);
        m.values = a.tiers[m.tier].ranges.map(([lo, hi]) => rInt(rng, lo, hi));
      }
    },
  },
};

export function findItem(s: GameState, uid: number): Item | undefined {
  return s.inventory.find((i) => i.uid === uid) ?? Object.values(s.equipment).find((i) => i?.uid === uid);
}

export function orbReason(s: GameState, orbId: string, uid: number): string | null {
  const item = findItem(s, uid);
  if (!item) return 'Select an item';
  if (!hasItem(s, orbId, 1)) return 'You have none';
  return ORBS[orbId].canApply(item);
}

export function applyOrb(s: GameState, ctx: Ctx, orbId: string, uid: number): string | null {
  const reason = orbReason(s, orbId, uid);
  if (reason) return reason;
  const item = findItem(s, uid)!;
  ORBS[orbId].apply(item, ctx.rng);
  s.bank[orbId] -= 1;
  s.lifetime.orbsUsed += 1;
  ctx.emit({ t: 'craft', text: `${orbId} → ${itemName(item)}`, uid, orbId });
  return null;
}

export function benchCraftReason(s: GameState, craftId: string, uid: number): string | null {
  const craft = BENCH_CRAFTS.find((c) => c.id === craftId)!;
  const item = findItem(s, uid);
  if (!item) return 'Select an item';
  if ((s.hideout.bench ?? 1) < craft.benchLevel) return `Requires Crafting Bench level ${craft.benchLevel}`;
  if (item.rarity === 'unique') return 'Cannot modify unique items';
  if (item.rarity === 'normal') return 'Item must be Magic or Rare';
  if (allMods(item).some((m) => m.crafted)) return 'Item already has a crafted modifier';
  const affix = affixDef(craft.affixId);
  if (spawnWeight(affix, baseDef(item.baseId)) === 0) return 'Cannot be crafted on this item type';
  const list = affix.kind === 'prefix' ? item.prefixes : item.suffixes;
  if (list.length >= maxAffixes(item.rarity)) return `No room for another ${affix.kind}`;
  if (allMods(item).some((m) => affixDef(m.affixId).group === affix.group)) return 'Item already has this modifier type';
  if (!canAfford(s, craft.cost)) return 'Not enough materials';
  return null;
}

export function benchCraft(s: GameState, ctx: Ctx, craftId: string, uid: number): string | null {
  const reason = benchCraftReason(s, craftId, uid);
  if (reason) return reason;
  const craft = BENCH_CRAFTS.find((c) => c.id === craftId)!;
  const item = findItem(s, uid)!;
  const affix = affixDef(craft.affixId);
  payCost(s, craft.cost);
  const values = affix.tiers[craft.tier].ranges.map(([lo, hi]) => rInt(ctx.rng, lo, hi));
  (affix.kind === 'prefix' ? item.prefixes : item.suffixes).push({ affixId: affix.id, tier: craft.tier, values, crafted: true });
  ctx.emit({ t: 'craft', text: `Bench craft on ${itemName(item)}`, uid });
  return null;
}

export function salvage(s: GameState, ctx: Ctx, uids: number[]): number {
  let dust = 0;
  const set = new Set(uids);
  s.inventory = s.inventory.filter((i) => {
    if (!set.has(i.uid)) return true;
    dust += salvageValue(i);
    return false;
  });
  if (dust > 0) {
    s.bank.arcane_dust = (s.bank.arcane_dust ?? 0) + dust;
    ctx.emit({ t: 'info', text: `Salvaged ${uids.length} item(s) for ${dust} Arcane Dust`, tone: 'good' });
  }
  return dust;
}
