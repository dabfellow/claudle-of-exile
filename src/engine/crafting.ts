import { affixDef } from '../data/affixes';
import { stashedItems, takeOwned } from './storage';
import { baseDef } from '../data/bases';
import { ACHIEVEMENT_BY_ID } from '../data/achievements';
import { essenceDef, fossilDef, modBias } from '../data/craftMats';
import { BENCH_BUILT_LEVEL, BENCH_CRAFTS } from '../data/hideout';
import type { Ctx } from './context';
import { addFixedMod, addRandomMod, allMods, itemName, maxAffixes, modCount, openKinds, rareName, rerollMods, salvageValue, spawnWeight, type ModBias } from './items';
import { rInt, type Rng } from './rng';
import { canAfford, hasItem, payCost } from './bank';
import type { GameState, Item } from './types';

export interface OrbDef {
  canApply(item: Item): string | null;
  /** `bias` comes from a Fossil; only orbs that roll new modifiers use it (FOSSIL_ORBS) */
  apply(item: Item, rng: Rng, bias?: ModBias): void;
}

const notUnique = (item: Item) => (item.rarity === 'unique' ? 'Cannot modify unique items' : null);

export const ORBS: Record<string, OrbDef> = {
  transmute: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'normal' ? 'Item must be Normal' : null),
    apply: (i, rng, bias) => {
      i.rarity = 'magic';
      rerollMods(i, rng, bias);
    },
  },
  augment: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'magic' ? 'Item must be Magic' : !openKinds(i).length ? 'No room for another modifier' : null),
    apply: (i, rng, bias) => {
      addRandomMod(i, rng, bias);
    },
  },
  alteration: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'magic' ? 'Item must be Magic' : null),
    apply: (i, rng, bias) => rerollMods(i, rng, bias),
  },
  regal: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'magic' ? 'Item must be Magic' : null),
    apply: (i, rng, bias) => {
      i.rarity = 'rare';
      i.name = rareName(i, rng);
      addRandomMod(i, rng, bias);
    },
  },
  alchemy: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'normal' ? 'Item must be Normal' : null),
    apply: (i, rng, bias) => {
      i.rarity = 'rare';
      rerollMods(i, rng, bias);
    },
  },
  chaos: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'rare' ? 'Item must be Rare' : null),
    apply: (i, rng, bias) => rerollMods(i, rng, bias),
  },
  exalted: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'rare' ? 'Item must be Rare' : !openKinds(i).length ? 'No room for another modifier' : null),
    apply: (i, rng, bias) => {
      addRandomMod(i, rng, bias);
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

/** Orbs that roll new modifiers, and so can be paired with a Fossil. */
export const FOSSIL_ORBS = new Set(['transmute', 'augment', 'alteration', 'regal', 'alchemy', 'chaos', 'exalted']);

/** The item a Craft until… activity is working on can't be salvaged, sold or equipped. */
export function isCraftLocked(s: GameState, uid: number): boolean {
  return s.action?.kind === 'craft' && s.action.uid === uid;
}

export function findItem(s: GameState, uid: number): Item | undefined {
  return s.inventory.find((i) => i.uid === uid) ?? Object.values(s.equipment).find((i) => i?.uid === uid) ?? stashedItems(s).find((i) => i.uid === uid);
}

export function orbReason(s: GameState, orbId: string, uid: number, fossilId?: string | null): string | null {
  const item = findItem(s, uid);
  if (!item) return 'Select an item';
  if (!hasItem(s, orbId, 1)) return 'You have none';
  if (fossilId) {
    if (!fossilDef(fossilId)) return 'Unknown fossil';
    if (!FOSSIL_ORBS.has(orbId)) return "Fossils don't work with this orb";
    if (!hasItem(s, fossilId, 1)) return 'Out of that fossil';
  }
  return ORBS[orbId].canApply(item);
}

export function applyOrb(s: GameState, ctx: Ctx, orbId: string, uid: number, fossilId?: string | null): string | null {
  const reason = orbReason(s, orbId, uid, fossilId);
  if (reason) return reason;
  const item = findItem(s, uid)!;
  ORBS[orbId].apply(item, ctx.rng, fossilId ? modBias(fossilId) : undefined);
  s.bank[orbId] -= 1;
  if (fossilId) s.bank[fossilId] -= 1;
  s.lifetime.orbsUsed += 1;
  ctx.emit({ t: 'craft', text: `${orbId} → ${itemName(item)}`, uid, orbId });
  return null;
}

export function essenceReason(s: GameState, essenceId: string, uid: number): string | null {
  const ess = essenceDef(essenceId);
  const item = findItem(s, uid);
  if (!ess) return 'Unknown essence';
  if (!item) return 'Select an item';
  if (!hasItem(s, essenceId, 1)) return 'You have none';
  if (item.rarity === 'unique') return 'Cannot modify unique items';
  if (item.rarity !== 'normal' && item.rarity !== 'magic') return 'Item must be Normal or Magic';
  const affix = affixDef(ess.affixId);
  if (spawnWeight(affix, baseDef(item.baseId)) === 0) return 'Cannot roll on this item type';
  if (item.ilvl < affix.tiers[ess.tier].ilvl) return `Requires item level ${affix.tiers[ess.tier].ilvl}`;
  return null;
}

/** Makes the item Magic with the essence's modifier guaranteed; the other slot rolls as usual. */
export function applyEssence(s: GameState, ctx: Ctx, essenceId: string, uid: number): string | null {
  const reason = essenceReason(s, essenceId, uid);
  if (reason) return reason;
  const ess = essenceDef(essenceId)!;
  const item = findItem(s, uid)!;
  item.rarity = 'magic';
  item.name = null;
  item.prefixes = [];
  item.suffixes = [];
  addFixedMod(item, ess.affixId, ess.tier, ctx.rng);
  if (ctx.rng.next() < 0.5) addRandomMod(item, ctx.rng);
  s.bank[essenceId] -= 1;
  s.lifetime.orbsUsed += 1;
  ctx.emit({ t: 'craft', text: `${ess.name} → ${itemName(item)}`, uid });
  return null;
}

export function benchCraftReason(s: GameState, craftId: string, uid: number): string | null {
  const craft = BENCH_CRAFTS.find((c) => c.id === craftId)!;
  const item = findItem(s, uid);
  if (!item) return 'Select an item';
  if ((s.hideout.bench ?? 1) < craft.benchLevel) return `Requires Crafting Bench level ${craft.benchLevel}`;
  if (craft.achievement && !s.achievements.includes(craft.achievement)) return `Unlock with achievement: ${ACHIEVEMENT_BY_ID[craft.achievement].name}`;
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
  s.lifetime.benchCrafts += 1;
  ctx.emit({ t: 'craft', text: `Bench craft on ${itemName(item)}`, uid });
  return null;
}

/** Orbs work anywhere; salvaging and bench crafts need the Crafting Bench built (its first upgrade). */
export function benchBuilt(s: GameState): boolean {
  return (s.hideout.bench ?? 1) >= BENCH_BUILT_LEVEL;
}

export const BENCH_UNBUILT = 'Build the Crafting Bench in your Hideout to salvage';

export function salvage(s: GameState, ctx: Ctx, uids: number[]): number {
  if (!benchBuilt(s)) {
    ctx.emit({ t: 'info', text: BENCH_UNBUILT, tone: 'warn' });
    return 0;
  }
  const gone = takeOwned(s, uids);
  const dust = gone.reduce((a, i) => a + salvageValue(i), 0);
  const n = gone.length;
  if (dust > 0) {
    s.bank.arcane_dust = (s.bank.arcane_dust ?? 0) + dust;
    s.lifetime.salvaged += n;
    ctx.emit({ t: 'info', text: `Salvaged ${n} item(s) for ${dust} Arcane Dust`, tone: 'good' });
  }
  return dust;
}
