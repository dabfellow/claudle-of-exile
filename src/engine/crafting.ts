import { affixDef } from '../data/affixes';
import { stashedItems, takeOwned } from './storage';
import { baseDef, uniqueDef } from '../data/bases';
import { essenceDef, fossilDef, modBias, SEAL, WAX } from '../data/craftMats';
import { WHETSTONE } from '../data/expedition';
import { BENCH_BUILT_LEVEL, BENCH_CRAFTS, type BenchCraft } from '../data/hideout';
import type { Ctx } from './context';
import { addFixedMod, addRandomMod, allMods, itemName, maxAffixes, modCount, openKinds, rareName, rerollMods, rollUnwrittenNotableIndex, salvageValue, spawnWeight, type ModBias } from './items';
import { pick, rInt, type Rng } from './rng';
import { canAfford, hasItem, payCraftCost } from './bank';
import type { GameState, Item, RolledMod } from './types';

export interface OrbDef {
  canApply(item: Item): string | null;
  /** `bias` comes from a Fossil; only orbs that roll new modifiers use it (FOSSIL_ORBS). `keep` comes from a Forger's Seal (SEAL_ORBS) */
  apply(item: Item, rng: Rng, bias?: ModBias, keep?: RolledMod): void;
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
    apply: (i, rng, bias, keep) => rerollMods(i, rng, bias, keep),
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
    apply: (i, rng, bias, keep) => rerollMods(i, rng, bias, keep),
  },
  exalted: {
    canApply: (i) => notUnique(i) ?? (i.rarity !== 'rare' ? 'Item must be Rare' : !openKinds(i).length ? 'No room for another modifier' : null),
    apply: (i, rng, bias) => {
      addRandomMod(i, rng, bias);
    },
  },
  annul: {
    canApply: (i) => {
      const u = notUnique(i);
      if (u) return u;
      if (modCount(i) === 0) return 'Item has no modifiers';
      const prefixLock = i.suffixes.some((m) => m.affixId === 'meta_prefixes_cannot_be_changed');
      const suffixLock = i.prefixes.some((m) => m.affixId === 'meta_suffixes_cannot_be_changed');
      const available = allMods(i).filter((m) => {
        if (m.fractured) return false;
        if (prefixLock && affixDef(m.affixId).kind === 'prefix') return false;
        if (suffixLock && affixDef(m.affixId).kind === 'suffix') return false;
        return true;
      });
      if (allMods(i).every((m) => m.fractured)) return 'Cannot annul: only fractured modifiers remain';
      if (!available.length) return 'Cannot annul: all eligible modifiers are protected';
      return null;
    },
    apply: (i, rng, _bias, keep) => {
      const prefixLock = i.suffixes.some((m) => m.affixId === 'meta_prefixes_cannot_be_changed');
      const suffixLock = i.prefixes.some((m) => m.affixId === 'meta_suffixes_cannot_be_changed');
      const mods = allMods(i).filter((m) => {
        if (m === keep || m.fractured) return false;
        if (prefixLock && affixDef(m.affixId).kind === 'prefix') return false;
        if (suffixLock && affixDef(m.affixId).kind === 'suffix') return false;
        return true;
      });
      if (!mods.length) return;
      const target = mods[rInt(rng, 0, mods.length - 1)];
      i.prefixes = i.prefixes.filter((m) => m !== target);
      i.suffixes = i.suffixes.filter((m) => m !== target);
    },
  },
  scour: {
    canApply: (i) => {
      const u = notUnique(i);
      if (u) return u;
      if (i.rarity === 'normal') return 'Item is already Normal';
      const prefixLock = i.suffixes.some((m) => m.affixId === 'meta_prefixes_cannot_be_changed');
      const suffixLock = i.prefixes.some((m) => m.affixId === 'meta_suffixes_cannot_be_changed');
      if (prefixLock && suffixLock) return 'Cannot scour: prefixes and suffixes cannot be changed';
      if (allMods(i).some((m) => m.fractured) && modCount(i) <= 1) return 'Cannot scour: only the fractured modifier remains';
      if (prefixLock && i.suffixes.length === 0) return 'Cannot scour: prefixes cannot be changed and no suffixes remain';
      if (suffixLock && i.prefixes.length === 0) return 'Cannot scour: suffixes cannot be changed and no prefixes remain';
      return null;
    },
    apply: (i) => {
      const prefixLock = i.suffixes.some((m) => m.affixId === 'meta_prefixes_cannot_be_changed');
      const suffixLock = i.prefixes.some((m) => m.affixId === 'meta_suffixes_cannot_be_changed');
      const frac = allMods(i).find((m) => m.fractured);

      if (prefixLock) {
        // Prefixes are kept! Suffixes are removed (including the lock itself)
        i.suffixes = frac && affixDef(frac.affixId).kind === 'suffix' ? [frac] : [];
        if (i.prefixes.length + i.suffixes.length <= 2) {
          i.rarity = 'magic';
          i.name = null;
        }
        i.elevated = allMods(i).find((m) => m.elevated)?.affixId;
        return;
      }

      if (suffixLock) {
        // Suffixes are kept! Prefixes are removed (including the lock itself)
        i.prefixes = frac && affixDef(frac.affixId).kind === 'prefix' ? [frac] : [];
        if (i.prefixes.length + i.suffixes.length <= 2) {
          i.rarity = 'magic';
          i.name = null;
        }
        i.elevated = allMods(i).find((m) => m.elevated)?.affixId;
        return;
      }

      if (frac) {
        i.prefixes = i.prefixes.filter((m) => m === frac);
        i.suffixes = i.suffixes.filter((m) => m === frac);
        i.rarity = 'magic';
        i.name = null;
      } else {
        i.rarity = 'normal';
        i.name = null;
        i.prefixes = [];
        i.suffixes = [];
      }
      i.elevated = allMods(i).find((m) => m.elevated)?.affixId;
    },
  },
  divine: {
    canApply: (i) => {
      if (modCount(i) === 0) return 'Item has no modifiers';
      if (i.rarity === 'unique' && i.uniqueId) {
        const u = uniqueDef(i.uniqueId);
        const hasRollable = u.mods.some((m) => m.ranges?.some(([lo, hi]) => lo !== hi));
        if (!hasRollable) return 'All modifiers on this unique are fixed';
        return null;
      }
      return null;
    },
    apply: (i, rng, _bias, keep) => {
      if (i.rarity === 'unique' && i.uniqueId) {
        const u = uniqueDef(i.uniqueId);
        for (const m of allMods(i)) {
          if (m === keep) continue;
          const uMod = u.mods.find((um) => um.affixId === m.affixId);
          if (uMod?.ranges?.length) {
            m.values = uMod.ranges.map(([lo, hi]) => rInt(rng, lo, hi));
          }
        }
        return;
      }
      const prefixLock = i.suffixes.some((m) => m.affixId === 'meta_prefixes_cannot_be_changed');
      const suffixLock = i.prefixes.some((m) => m.affixId === 'meta_suffixes_cannot_be_changed');
      for (const m of allMods(i)) {
        if (m === keep) continue;
        const kind = affixDef(m.affixId).kind;
        if (prefixLock && kind === 'prefix') continue;
        if (suffixLock && kind === 'suffix') continue;
        const a = affixDef(m.affixId);
        if (a.tiers[m.tier]?.ranges?.length) {
          m.values = a.tiers[m.tier].ranges.map(([lo, hi]) => rInt(rng, lo, hi));
        }
      }
    },
  },
  fractured: {
    canApply: (i) => {
      const u = notUnique(i);
      if (u) return u;
      if (i.rarity !== 'rare') return 'Item must be Rare';
      if (i.fractured || allMods(i).some((m) => m.fractured)) return 'Item already has a fractured modifier';
      const naturalMods = allMods(i).filter((m) => !m.crafted);
      if (naturalMods.length < 4) return 'Item must have at least 4 natural modifiers';
      return null;
    },
    apply: (i, rng) => {
      const mods = allMods(i).filter((m) => !m.crafted);
      const target = mods[rInt(rng, 0, mods.length - 1)];
      target.fractured = true;
      i.fractured = target.affixId;
    },
  },
  exile_doom_sigil: {
    canApply: (i) => {
      const u = notUnique(i);
      if (u) return u;
      if (i.rarity !== 'rare') return 'Item must be Rare';
      if (i.elevated || allMods(i).some((m) => m.elevated)) return 'Item already has an elevated Tier 0 modifier';
      const t1Mods = allMods(i).filter((m) => {
        if (m.crafted) return false;
        const a = affixDef(m.affixId);
        return m.tier === a.tiers.length - 1;
      });
      if (!t1Mods.length) return 'Item has no Tier 1 natural modifiers to elevate';
      return null;
    },
    apply: (i, rng) => {
      const t1Mods = allMods(i).filter((m) => {
        if (m.crafted) return false;
        const a = affixDef(m.affixId);
        return m.tier === a.tiers.length - 1;
      });
      const target = t1Mods[rInt(rng, 0, t1Mods.length - 1)];
      target.elevated = true;
      i.elevated = target.affixId;
      target.values = target.values.map((v) => Math.max(1, Math.round(v * 1.3)));
    },
  },
  architect_doom_sigil: {
    canApply: (i) => {
      const u = notUnique(i);
      if (u) return u;
      if (i.rarity !== 'rare') return 'Item must be Rare';
      if (i.doomImplicit) return 'Item already has a Doom Implicit';
      return null;
    },
    apply: (i, rng) => {
      const DOOM_IMPLICITS = ['doom_all_res', 'doom_damage', 'doom_max_life', 'doom_crit'];
      i.doomImplicit = pick(rng, DOOM_IMPLICITS);
    },
  },
  void_sigil: {
    canApply: (i) => {
      const u = notUnique(i);
      if (u) return u;
      if (i.rarity !== 'rare') return 'Item must be Rare';
      if (i.voidSlot) return 'Item already has a Void Slot unlocked';
      if (modCount(i) < 6) return 'Item must have 6 modifiers to unlock the 7th Void Slot';
      return null;
    },
    apply: (i) => {
      i.voidSlot = true;
    },
  },
};

export const FIELD_TINKER_ILVL = 45;
export const TINKER_DUST_COST: Record<string, number> = { transmute: 3, augment: 4, alteration: 5 };

/** Early gear can consume salvage dust instead of hoardable basic orbs. */
export function tinkerDustCost(s: GameState, orbId: string, item: Item): number | null {
  if (hasItem(s, orbId, 1) || item.ilvl > FIELD_TINKER_ILVL || !TINKER_DUST_COST[orbId] || !benchBuilt(s)) return null;
  return TINKER_DUST_COST[orbId];
}

/** Orbs that roll new modifiers, and so can be paired with a Fossil. */
export const FOSSIL_ORBS = new Set(['transmute', 'augment', 'alteration', 'regal', 'alchemy', 'chaos', 'exalted']);

/** Orbs that would change or remove a modifier, and so can be paired with a Forger's Seal. */
export const SEAL_ORBS = new Set(['alteration', 'chaos', 'annul', 'divine']);

/** The item a Craft until… activity is working on can't be salvaged, sold or equipped. */
export function isCraftLocked(s: GameState, uid: number): boolean {
  return s.action?.kind === 'craft' && s.action.uid === uid;
}

export function findItem(s: GameState, uid: number): Item | undefined {
  return s.inventory.find((i) => i.uid === uid) ?? Object.values(s.equipment).find((i) => i?.uid === uid) ?? stashedItems(s).find((i) => i.uid === uid);
}

export function orbReason(s: GameState, orbId: string, uid: number, fossilId?: string | null, sealed?: string | null): string | null {
  const item = findItem(s, uid);
  if (!item) return 'Select an item';
  const dust = tinkerDustCost(s, orbId, item);
  if (!hasItem(s, orbId, 1) && dust === null) {
    if (item.ilvl <= FIELD_TINKER_ILVL && TINKER_DUST_COST[orbId] && !benchBuilt(s)) return 'Build the Crafting Bench to tinker with Arcane Dust';
    return 'You have none';
  }
  if (dust !== null && !hasItem(s, 'arcane_dust', dust)) return `Needs ${dust} Arcane Dust`;
  if (fossilId) {
    if (!fossilDef(fossilId)) return 'Unknown fossil';
    if (!FOSSIL_ORBS.has(orbId)) return "Fossils don't work with this orb";
    if (!hasItem(s, fossilId, 1)) return 'Out of that fossil';
  }
  if (sealed) {
    if (!SEAL_ORBS.has(orbId)) return "A Seal doesn't work with this orb";
    if (!hasItem(s, SEAL, 1)) return "Out of Forger's Seals";
    if (!allMods(item).some((m) => m.affixId === sealed)) return 'That modifier is not on this item';
    if (orbId === 'annul' && modCount(item) < 2) return 'The Seal leaves nothing to remove';
  }
  return ORBS[orbId].canApply(item);
}

export function applyOrb(s: GameState, ctx: Ctx, orbId: string, uid: number, fossilId?: string | null, sealed?: string | null): string | null {
  const reason = orbReason(s, orbId, uid, fossilId, sealed);
  if (reason) return reason;
  const item = findItem(s, uid)!;
  const dust = tinkerDustCost(s, orbId, item);
  ORBS[orbId].apply(item, ctx.rng, fossilId ? modBias(fossilId) : undefined, sealed ? allMods(item).find((m) => m.affixId === sealed) : undefined);
  if (orbId === 'divine' && item.rarity === 'unique') {
    for (const m of allMods(item)) {
      if (m.affixId === 'u_unwritten_notable' && m.affixId !== sealed) {
        m.values = [rollUnwrittenNotableIndex(s.character?.classId, ctx.rng)];
      }
    }
  }
  payCraftCost(s, ctx, { ...(dust === null ? { [orbId]: 1 } : { arcane_dust: dust }), ...(fossilId ? { [fossilId]: 1 } : {}), ...(sealed ? { [SEAL]: 1 } : {}) });
  s.lifetime.orbsUsed += 1;
  ctx.emit({ t: 'craft', text: `${dust === null ? orbId : `${dust} dust`} → ${itemName(item)}`, uid, orbId });
  return null;
}

export function impressionReason(s: GameState, uid: number): string | null {
  const item = findItem(s, uid);
  if (!item) return 'Select an item';
  if (!hasItem(s, WAX, 1)) return "You have no Locksmith's Wax";
  if (item.rarity === 'unique') return 'Cannot take an impression of a unique';
  if (isCraftLocked(s, uid)) return 'Item is being auto-crafted';
  return null;
}

/** Locksmith's Wax: remember the item as it stands. A new impression replaces the old one. */
export function takeImpression(s: GameState, ctx: Ctx, uid: number): string | null {
  const reason = impressionReason(s, uid);
  if (reason) return reason;
  const item = findItem(s, uid)!;
  const { rarity, name, prefixes, suffixes, honed, fractured, elevated, doomImplicit, voidSlot } = item;
  item.impression = structuredClone({ rarity, name, prefixes, suffixes, honed, fractured, elevated, doomImplicit, voidSlot });
  payCraftCost(s, ctx, { [WAX]: 1 });
  ctx.emit({ t: 'craft', text: `Impression of ${itemName(item)}`, uid });
  return null;
}

export function restoreReason(s: GameState, uid: number): string | null {
  const item = findItem(s, uid);
  if (!item) return 'Select an item';
  if (!item.impression) return 'No impression taken';
  if (isCraftLocked(s, uid)) return 'Item is being auto-crafted';
  return null;
}

/** Put the item back as it was. An impression is good for one restore. */
export function restoreImpression(s: GameState, ctx: Ctx, uid: number): string | null {
  const reason = restoreReason(s, uid);
  if (reason) return reason;
  const item = findItem(s, uid)!;
  Object.assign(item, item.impression);
  delete item.impression;
  ctx.emit({ t: 'craft', text: `Restored ${itemName(item)}`, uid });
  return null;
}

export function whetstoneReason(s: GameState, uid: number, affixId: string): string | null {
  const item = findItem(s, uid);
  if (!item) return 'Select an item';
  if (!hasItem(s, WHETSTONE, 1)) return 'You have no Ancient Whetstone';
  if (item.rarity === 'unique') return 'Cannot modify unique items';
  if (isCraftLocked(s, uid)) return 'Item is being auto-crafted';
  const mod = allMods(item).find((m) => m.affixId === affixId);
  if (!mod) return 'That modifier is not on this item';
  if (mod.fractured) return 'Cannot hone a fractured modifier';
  if (item.honed && allMods(item).some((m) => m.affixId === item.honed)) return 'This item already has a honed modifier';
  if (mod.crafted) return 'Bench crafts cannot be raised';
  const next = affixDef(affixId).tiers[mod.tier + 1];
  if (!next) return 'Already the top tier';
  if (next.ilvl > item.ilvl) return `Requires item level ${next.ilvl}`;
  return null;
}

/** Ancient Whetstone: the only craft that makes a mod better without rolling for it. The new tier's values still roll. */
export function applyWhetstone(s: GameState, ctx: Ctx, uid: number, affixId: string): string | null {
  const reason = whetstoneReason(s, uid, affixId);
  if (reason) return reason;
  const item = findItem(s, uid)!;
  const mod = allMods(item).find((m) => m.affixId === affixId)!;
  mod.tier += 1;
  item.honed = affixId;
  mod.values = affixDef(affixId).tiers[mod.tier].ranges.map(([lo, hi]) => rInt(ctx.rng, lo, hi));
  payCraftCost(s, ctx, { [WHETSTONE]: 1 });
  s.lifetime.orbsUsed += 1;
  ctx.emit({ t: 'craft', text: `Ancient Whetstone → ${itemName(item)}`, uid });
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
  const frac = allMods(item).find((m) => m.fractured);
  if (frac && affixDef(frac.affixId).group === affix.group) return 'Item already has this modifier group (fractured)';
  if (frac && (affix.kind === 'prefix' ? item.prefixes : item.suffixes).some((m) => m.fractured)) return `No room for another ${affix.kind}`;
  return null;
}

/** Makes the item Magic with the essence's modifier guaranteed; the other slot rolls as usual. Preserves fractured mods. */
export function applyEssence(s: GameState, ctx: Ctx, essenceId: string, uid: number): string | null {
  const reason = essenceReason(s, essenceId, uid);
  if (reason) return reason;
  const ess = essenceDef(essenceId)!;
  const item = findItem(s, uid)!;
  const frac = allMods(item).find((m) => m.fractured);
  item.rarity = 'magic';
  item.name = null;
  item.prefixes = [];
  item.suffixes = [];
  if (frac) (affixDef(frac.affixId).kind === 'prefix' ? item.prefixes : item.suffixes).push(frac);
  addFixedMod(item, ess.affixId, ess.tier, ctx.rng);
  if (!frac && ctx.rng.next() < 0.5) addRandomMod(item, ctx.rng);
  payCraftCost(s, ctx, { [essenceId]: 1 });
  s.lifetime.orbsUsed += 1;
  ctx.emit({ t: 'craft', text: `${ess.name} → ${itemName(item)}`, uid });
  return null;
}

export function benchCraftCost(s: GameState, craft: BenchCraft): Record<string, number> {
  const benchLvl = s.account.hideout.bench ?? 1;
  if (benchLvl < 8) return craft.cost;
  const out: Record<string, number> = {};
  for (const [id, rawN] of Object.entries(craft.cost)) {
    const n = Number(rawN);
    if (id === 'gold' || id === 'arcane_dust') {
      out[id] = Math.max(1, Math.round(n * 0.75));
    } else {
      out[id] = n;
    }
  }
  return out;
}

export function benchCraftReason(s: GameState, craftId: string, uid: number): string | null {
  const craft = BENCH_CRAFTS.find((c) => c.id === craftId)!;
  const item = findItem(s, uid);
  if (!item) return 'Select an item';
  if ((s.account.hideout.bench ?? 1) < craft.benchLevel) return `Requires Crafting Bench level ${craft.benchLevel}`;
  if (item.rarity === 'unique') return 'Cannot modify unique items';
  if (item.rarity === 'normal') return 'Item must be Magic or Rare';

  // Multicraft allows up to 3 crafted modifiers; Bench level 9 allows 2
  const hasMulticraft = allMods(item).some((m) => m.affixId === 'meta_multicraft');
  const maxCrafted = hasMulticraft || craft.affixId === 'meta_multicraft' ? 3 : (s.account.hideout.bench ?? 1) >= 9 ? 2 : 1;
  const craftedCount = allMods(item).filter((m) => m.crafted).length;
  if (craftedCount >= maxCrafted) {
    return hasMulticraft ? 'Item already has 3 crafted modifiers' : maxCrafted > 1 ? `Item already has ${maxCrafted} crafted modifiers` : 'Item already has a crafted modifier';
  }

  const affix = affixDef(craft.affixId);
  if (!affix.benchOnly && spawnWeight(affix, baseDef(item.baseId)) === 0) return 'Cannot be crafted on this item type';
  const list = affix.kind === 'prefix' ? item.prefixes : item.suffixes;
  if (list.length >= maxAffixes(item.rarity)) return `No room for another ${affix.kind}`;
  if (allMods(item).some((m) => affixDef(m.affixId).group === affix.group)) return 'Item already has this modifier type';
  if (!canAfford(s, benchCraftCost(s, craft))) return 'Not enough materials';
  return null;
}

export function benchCraft(s: GameState, ctx: Ctx, craftId: string, uid: number): string | null {
  const reason = benchCraftReason(s, craftId, uid);
  if (reason) return reason;
  const craft = BENCH_CRAFTS.find((c) => c.id === craftId)!;
  const item = findItem(s, uid)!;
  const affix = affixDef(craft.affixId);
  payCraftCost(s, ctx, benchCraftCost(s, craft));
  const ranges = affix.tiers[craft.tier]?.ranges;
  const values = ranges?.length ? ranges.map(([lo, hi]) => rInt(ctx.rng, lo, hi)) : [];
  (affix.kind === 'prefix' ? item.prefixes : item.suffixes).push({ affixId: affix.id, tier: craft.tier, values, crafted: true });
  s.lifetime.benchCrafts += 1;
  ctx.emit({ t: 'craft', text: `Bench craft on ${itemName(item)}`, uid });
  return null;
}

export function removeCraftedReason(s: GameState, uid: number): string | null {
  const item = findItem(s, uid);
  if (!item) return 'Select an item';
  if (isCraftLocked(s, uid)) return 'Item is being auto-crafted';
  if (!allMods(item).some((m) => m.crafted)) return 'Item has no crafted modifiers';
  if ((s.account.hideout.bench ?? 1) < 10 && !hasItem(s, 'scour', 1)) return 'Requires 1 Orb of Scouring';
  return null;
}

/** Removes all bench-crafted modifiers from an item (free at Bench Level 10, or for 1 Orb of Scouring). */
export function removeCrafted(s: GameState, ctx: Ctx, uid: number): string | null {
  const reason = removeCraftedReason(s, uid);
  if (reason) return reason;
  const item = findItem(s, uid)!;
  item.prefixes = item.prefixes.filter((m) => !m.crafted);
  item.suffixes = item.suffixes.filter((m) => !m.crafted);
  if ((s.account.hideout.bench ?? 1) < 10) {
    payCraftCost(s, ctx, { scour: 1 });
    s.lifetime.orbsUsed += 1;
  }
  ctx.emit({ t: 'craft', text: `Removed crafted modifiers from ${itemName(item)}`, uid });
  return null;
}

/** Orbs work anywhere; salvaging and bench crafts need the Crafting Bench built (its first upgrade). */
export function benchBuilt(s: GameState): boolean {
  return (s.account.hideout.bench ?? 1) >= BENCH_BUILT_LEVEL;
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
    s.account.bank.arcane_dust = (s.account.bank.arcane_dust ?? 0) + dust;
    s.lifetime.salvaged += n;
    ctx.emit({ t: 'info', text: `Salvaged ${n} item(s) for ${dust} Arcane Dust`, tone: 'good' });
    ctx.emit({ t: 'salvage', count: n });
  }
  return dust;
}
