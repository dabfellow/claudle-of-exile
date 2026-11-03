/**
 * Drop tables. Monsters drop most gear and all of the rare currency; deeper areas shift
 * the odds toward rarer orbs and better rarities. Every number here is a balance knob —
 * check changes with `npm run sim` (docs/design/BALANCE.md).
 */

import type { ItemSlotType } from '../engine/types';

export interface RarityWeights {
  normal: number;
  magic: number;
  rare: number;
}

export interface DropTable {
  /** chance per normal kill to drop one currency item */
  currencyChance: number;
  /** relative weights of each orb in this area */
  currency: Record<string, number>;
  itemChance: number;
  rarity: RarityWeights;
  flaskChance: number;
  uniqueChance: number;
}

export interface BossTable {
  /** extra random currency rolls from the area's table */
  currencyRolls: number;
  /** always dropped on the first kill of this boss; afterwards with `repeatChance` */
  guaranteed: { id: string; qty: number }[];
  repeatChance: number;
  items: [number, number];
  rarity: RarityWeights;
  flaskChance: number;
  uniqueChance: number;
}

const BASIC = { transmute: 45, augment: 30, alteration: 25, scour: 6, regret: 6, regal: 4 };

/** Drop tables by area tier (zones.ts: Act 1 runs 1, 1, 2, 2, 3, 3, 4, 5 — the act boss's sanctum is tier 5). */
export const DROP_TABLES: Record<number, DropTable> = {
  1: {
    currencyChance: 0.09,
    currency: { ...BASIC, regal: 0 },
    itemChance: 0.15,
    rarity: { normal: 74, magic: 25.75, rare: 0.25 },
    flaskChance: 0.01,
    uniqueChance: 0.0005,
  },
  2: {
    currencyChance: 0.09,
    currency: { ...BASIC, regal: 0.3, alchemy: 0.3, chaos: 2.5 },
    itemChance: 0.15,
    rarity: { normal: 72, magic: 27.5, rare: 0.5 },
    flaskChance: 0.01,
    uniqueChance: 0.0006,
  },
  3: {
    currencyChance: 0.05,
    currency: { ...BASIC, regal: 7, alchemy: 6, chaos: 4, annul: 0.8, exalted: 0.15, divine: 0.3, expansion: 0.3 },
    itemChance: 0.16,
    rarity: { normal: 62, magic: 30, rare: 8 },
    flaskChance: 0.011,
    uniqueChance: 0.0007,
  },
  4: {
    currencyChance: 0.05,
    currency: { ...BASIC, regal: 7, alchemy: 7, chaos: 5, annul: 1, exalted: 0.25, divine: 0.5, expansion: 0.5 },
    itemChance: 0.16,
    rarity: { normal: 58, magic: 32, rare: 10 },
    flaskChance: 0.012,
    uniqueChance: 0.0008,
  },
  5: {
    currencyChance: 0.055,
    currency: { ...BASIC, regal: 8, alchemy: 8, chaos: 6, annul: 1.5, exalted: 0.35, divine: 0.7, expansion: 0.7 },
    itemChance: 0.17,
    rarity: { normal: 55, magic: 33, rare: 12 },
    flaskChance: 0.012,
    uniqueChance: 0.001,
  },
  // Act 2 (zones.ts: 5, 5, 6, 6, 6, 7, 7, 7)
  6: {
    currencyChance: 0.055,
    currency: { ...BASIC, regal: 9, alchemy: 9, chaos: 7, annul: 1.8, exalted: 0.4, divine: 0.8, expansion: 0.8 },
    itemChance: 0.17,
    rarity: { normal: 52, magic: 34, rare: 14 },
    flaskChance: 0.013,
    uniqueChance: 0.0011,
  },
  7: {
    currencyChance: 0.06,
    currency: { ...BASIC, regal: 10, alchemy: 10, chaos: 8, annul: 2, exalted: 0.45, divine: 0.9, expansion: 0.9 },
    itemChance: 0.18,
    rarity: { normal: 50, magic: 34, rare: 16 },
    flaskChance: 0.013,
    uniqueChance: 0.0012,
  },
  // Act 3 (zones.ts: 7, 8, 8, 8, 8, 9, 9, 9, 9, 9)
  8: {
    currencyChance: 0.06,
    currency: { ...BASIC, regal: 11, alchemy: 11, chaos: 9, annul: 2.2, exalted: 0.5, divine: 1, expansion: 1 },
    itemChance: 0.18,
    rarity: { normal: 48, magic: 35, rare: 17 },
    flaskChance: 0.014,
    uniqueChance: 0.0013,
  },
  9: {
    currencyChance: 0.065,
    currency: { ...BASIC, regal: 12, alchemy: 12, chaos: 10, annul: 2.5, exalted: 0.55, divine: 1.1, expansion: 1.1, instill: 2.5 },
    itemChance: 0.19,
    rarity: { normal: 46, magic: 35, rare: 19 },
    flaskChance: 0.014,
    uniqueChance: 0.0014,
  },
  // Act 4 (zones.ts: 9, 10 ×5, 11 ×6): fewer, bigger monsters, each worth a little more
  10: {
    currencyChance: 0.07,
    currency: { ...BASIC, regal: 13, alchemy: 13, chaos: 11, annul: 2.8, exalted: 0.6, divine: 1.2, expansion: 1.2, instill: 2.8 },
    itemChance: 0.2,
    rarity: { normal: 44, magic: 35, rare: 21 },
    flaskChance: 0.015,
    uniqueChance: 0.0016,
  },
  11: {
    currencyChance: 0.075,
    currency: { ...BASIC, regal: 14, alchemy: 14, chaos: 12, annul: 3.1, exalted: 0.65, divine: 1.3, expansion: 1.3, instill: 3.1 },
    itemChance: 0.21,
    rarity: { normal: 42, magic: 35, rare: 23 },
    flaskChance: 0.015,
    uniqueChance: 0.0018,
  },
  // Act 5 (zones.ts: 12 × 4, 13 × 4, 14 × 6). Tiers 10 and 11 are Act 4's
  12: {
    currencyChance: 0.075,
    currency: { ...BASIC, regal: 15, alchemy: 15, chaos: 13, annul: 3.4, exalted: 0.7, divine: 1.4, expansion: 1.4, instill: 3.4 },
    itemChance: 0.205,
    rarity: { normal: 40, magic: 36, rare: 24 },
    flaskChance: 0.015,
    uniqueChance: 0.0017,
  },
  13: {
    currencyChance: 0.08,
    currency: { ...BASIC, regal: 16, alchemy: 16, chaos: 14, annul: 3.7, exalted: 0.75, divine: 1.5, expansion: 1.5, instill: 3.7 },
    itemChance: 0.21,
    rarity: { normal: 38, magic: 36, rare: 26 },
    flaskChance: 0.015,
    uniqueChance: 0.0018,
  },
  14: {
    currencyChance: 0.085,
    currency: { ...BASIC, regal: 17, alchemy: 17, chaos: 15, annul: 4, exalted: 0.8, divine: 1.6, expansion: 1.6, instill: 4 },
    itemChance: 0.215,
    rarity: { normal: 36, magic: 36, rare: 28 },
    flaskChance: 0.016,
    uniqueChance: 0.0019,
  },
  // Act 6 (zones.ts: 15 × 6, 16 × 6, 17 × 6)
  15: {
    currencyChance: 0.09,
    currency: { ...BASIC, regal: 18, alchemy: 18, chaos: 16, annul: 4.3, exalted: 0.85, divine: 1.7, expansion: 1.7, instill: 4.3 },
    itemChance: 0.22,
    rarity: { normal: 34, magic: 36, rare: 30 },
    flaskChance: 0.016,
    uniqueChance: 0.002,
  },
  16: {
    currencyChance: 0.095,
    currency: { ...BASIC, regal: 19, alchemy: 19, chaos: 17, annul: 4.6, exalted: 0.9, divine: 1.8, expansion: 1.8, instill: 4.6 },
    itemChance: 0.225,
    rarity: { normal: 32, magic: 36, rare: 32 },
    flaskChance: 0.016,
    uniqueChance: 0.0021,
  },
  17: {
    currencyChance: 0.1,
    currency: { ...BASIC, regal: 20, alchemy: 20, chaos: 18, annul: 5, exalted: 1, divine: 2, expansion: 2, instill: 5 },
    itemChance: 0.23,
    rarity: { normal: 30, magic: 36, rare: 34 },
    flaskChance: 0.017,
    uniqueChance: 0.0022,
  },
};

/**
 * A new character's first kills, on top of the normal rolls, so the first area always hands out something to wear and
 * something to craft it with before its boss. Keyed by lifetime kill number.
 */
export const STARTER_DROPS: Record<number, { slot: ItemSlotType } | { currency: string; qty: number }> = {
  1: { slot: 'gloves' },
  2: { currency: 'transmute', qty: 1 },
  3: { slot: 'boots' },
  4: { currency: 'alteration', qty: 1 },
  5: { slot: 'body' },
  6: { currency: 'transmute', qty: 1 },
  7: { slot: 'weapon' },
  8: { currency: 'alteration', qty: 1 },
  9: { slot: 'helmet' },
};

/** Boss rewards by area tier: deeper bosses guarantee better currency. */
export const BOSS_TABLES: Record<number, BossTable> = {
  1: { currencyRolls: 2, guaranteed: [{ id: 'transmute', qty: 2 }], repeatChance: 0.1, items: [1, 2], rarity: { normal: 0, magic: 92, rare: 8 }, flaskChance: 0.25, uniqueChance: 0.06 },
  2: { currencyRolls: 2, guaranteed: [{ id: 'alchemy', qty: 1 }], repeatChance: 0.1, items: [1, 2], rarity: { normal: 0, magic: 88, rare: 12 }, flaskChance: 0.25, uniqueChance: 0.07 },
  3: { currencyRolls: 3, guaranteed: [{ id: 'chaos', qty: 1 }], repeatChance: 0.1, items: [2, 2], rarity: { normal: 0, magic: 60, rare: 40 }, flaskChance: 0.25, uniqueChance: 0.08 },
  4: { currencyRolls: 3, guaranteed: [{ id: 'chaos', qty: 2 }], repeatChance: 0.06, items: [2, 3], rarity: { normal: 0, magic: 55, rare: 45 }, flaskChance: 0.3, uniqueChance: 0.09 },
  5: { currencyRolls: 3, guaranteed: [{ id: 'exalted', qty: 1 }], repeatChance: 0.015, items: [2, 3], rarity: { normal: 0, magic: 50, rare: 50 }, flaskChance: 0.3, uniqueChance: 0.1 },
  6: { currencyRolls: 3, guaranteed: [{ id: 'chaos', qty: 3 }], repeatChance: 0.04, items: [2, 3], rarity: { normal: 0, magic: 45, rare: 55 }, flaskChance: 0.3, uniqueChance: 0.11 },
  7: { currencyRolls: 4, guaranteed: [{ id: 'exalted', qty: 1 }, { id: 'divine', qty: 1 }], repeatChance: 0.015, items: [3, 3], rarity: { normal: 0, magic: 40, rare: 60 }, flaskChance: 0.3, uniqueChance: 0.12 },
  8: { currencyRolls: 4, guaranteed: [{ id: 'chaos', qty: 4 }], repeatChance: 0.04, items: [3, 3], rarity: { normal: 0, magic: 38, rare: 62 }, flaskChance: 0.3, uniqueChance: 0.13 },
  9: { currencyRolls: 4, guaranteed: [{ id: 'exalted', qty: 1 }, { id: 'divine', qty: 2 }], repeatChance: 0.015, items: [3, 4], rarity: { normal: 0, magic: 35, rare: 65 }, flaskChance: 0.3, uniqueChance: 0.14 },
  10: { currencyRolls: 4, guaranteed: [{ id: 'chaos', qty: 5 }], repeatChance: 0.04, items: [3, 4], rarity: { normal: 0, magic: 32, rare: 68 }, flaskChance: 0.3, uniqueChance: 0.15 },
  11: { currencyRolls: 5, guaranteed: [{ id: 'exalted', qty: 1 }, { id: 'divine', qty: 2 }], repeatChance: 0.015, items: [4, 4], rarity: { normal: 0, magic: 30, rare: 70 }, flaskChance: 0.3, uniqueChance: 0.16 },
  12: { currencyRolls: 5, guaranteed: [{ id: 'exalted', qty: 2 }], repeatChance: 0.02, items: [3, 4], rarity: { normal: 0, magic: 30, rare: 70 }, flaskChance: 0.3, uniqueChance: 0.17 },
  13: { currencyRolls: 5, guaranteed: [{ id: 'exalted', qty: 2 }, { id: 'divine', qty: 2 }], repeatChance: 0.02, items: [3, 4], rarity: { normal: 0, magic: 28, rare: 72 }, flaskChance: 0.3, uniqueChance: 0.18 },
  14: { currencyRolls: 5, guaranteed: [{ id: 'exalted', qty: 2 }, { id: 'divine', qty: 3 }], repeatChance: 0.02, items: [4, 4], rarity: { normal: 0, magic: 25, rare: 75 }, flaskChance: 0.3, uniqueChance: 0.19 },
  15: { currencyRolls: 5, guaranteed: [{ id: 'exalted', qty: 3 }, { id: 'divine', qty: 2 }], repeatChance: 0.025, items: [4, 4], rarity: { normal: 0, magic: 24, rare: 76 }, flaskChance: 0.3, uniqueChance: 0.2 },
  16: { currencyRolls: 6, guaranteed: [{ id: 'exalted', qty: 3 }, { id: 'divine', qty: 3 }], repeatChance: 0.025, items: [4, 5], rarity: { normal: 0, magic: 22, rare: 78 }, flaskChance: 0.3, uniqueChance: 0.21 },
  17: { currencyRolls: 6, guaranteed: [{ id: 'exalted', qty: 3 }, { id: 'divine', qty: 4 }], repeatChance: 0.025, items: [5, 5], rarity: { normal: 0, magic: 20, rare: 80 }, flaskChance: 0.3, uniqueChance: 0.22 },
};

export function dropTable(tier: number): DropTable {
  return DROP_TABLES[tier] ?? DROP_TABLES[7];
}

export function bossTable(tier: number): BossTable {
  return BOSS_TABLES[tier] ?? BOSS_TABLES[7];
}

/** Instilling Orbs drop from Act 4 on. Act 4's first area shares tier 9 with Act 3, so the act decides, not the tier. */
export const INSTILL_FIRST_ACT = 4;

/** The orbs an area's monsters and bosses roll from. */
export function areaCurrency(zone: { tier: number; act: number }): Record<string, number> {
  const cur = dropTable(zone.tier).currency;
  return zone.act >= INSTILL_FIRST_ACT ? cur : Object.fromEntries(Object.entries(cur).filter(([id]) => id !== 'instill'));
}

/** A little gathering material from bosses: one kind from the band the boss's level has reached. */
export const BOSS_GATHER_DROP = {
  chance: 0.5,
  qty: [1, 3] as [number, number],
  bands: [
    { level: 40, mats: ['mithril_ore', 'yew_log', 'voidbloom', 'rough_gem'] },
    { level: 30, mats: ['mithril_ore', 'yew_log', 'emberroot', 'rough_gem'] },
    { level: 15, mats: ['iron_ore', 'oak_log', 'frostleaf'] },
    { level: 1, mats: ['copper_ore', 'ash_log', 'sunpetal'] },
  ],
};

export function bossGatherMats(level: number): string[] {
  return (BOSS_GATHER_DROP.bands.find((b) => level >= b.level) ?? BOSS_GATHER_DROP.bands[3]).mats;
}

/** Orbs that never come from skilling — only from monsters (Gemcutting 45 cuts Orbs of Expansion, so they're not listed). */
export const COMBAT_ONLY_CURRENCY = ['regal', 'chaos', 'annul', 'exalted', 'divine', 'instill'];
