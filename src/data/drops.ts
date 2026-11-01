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
  gemChance: number;
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
  gemChance: number;
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
    gemChance: 0.012,
    flaskChance: 0.01,
    uniqueChance: 0.0005,
  },
  2: {
    currencyChance: 0.09,
    currency: { ...BASIC, regal: 0.3, alchemy: 0.3, chaos: 2.5 },
    itemChance: 0.15,
    rarity: { normal: 72, magic: 27.5, rare: 0.5 },
    gemChance: 0.012,
    flaskChance: 0.01,
    uniqueChance: 0.0006,
  },
  3: {
    currencyChance: 0.05,
    currency: { ...BASIC, regal: 7, alchemy: 6, chaos: 4, annul: 0.8, exalted: 0.15, divine: 0.3, expansion: 0.3 },
    itemChance: 0.16,
    rarity: { normal: 62, magic: 30, rare: 8 },
    gemChance: 0.013,
    flaskChance: 0.011,
    uniqueChance: 0.0007,
  },
  4: {
    currencyChance: 0.05,
    currency: { ...BASIC, regal: 7, alchemy: 7, chaos: 5, annul: 1, exalted: 0.25, divine: 0.5, expansion: 0.5, instill: 1 },
    itemChance: 0.16,
    rarity: { normal: 58, magic: 32, rare: 10 },
    gemChance: 0.014,
    flaskChance: 0.012,
    uniqueChance: 0.0008,
  },
  5: {
    currencyChance: 0.055,
    currency: { ...BASIC, regal: 8, alchemy: 8, chaos: 6, annul: 1.5, exalted: 0.35, divine: 0.7, expansion: 0.7, instill: 1.5 },
    itemChance: 0.17,
    rarity: { normal: 55, magic: 33, rare: 12 },
    gemChance: 0.015,
    flaskChance: 0.012,
    uniqueChance: 0.001,
  },
  // Act 2 (zones.ts: 5, 5, 6, 6, 6, 7, 7, 7)
  6: {
    currencyChance: 0.055,
    currency: { ...BASIC, regal: 9, alchemy: 9, chaos: 7, annul: 1.8, exalted: 0.4, divine: 0.8, expansion: 0.8, instill: 1.8 },
    itemChance: 0.17,
    rarity: { normal: 52, magic: 34, rare: 14 },
    gemChance: 0.016,
    flaskChance: 0.013,
    uniqueChance: 0.0011,
  },
  7: {
    currencyChance: 0.06,
    currency: { ...BASIC, regal: 10, alchemy: 10, chaos: 8, annul: 2, exalted: 0.45, divine: 0.9, expansion: 0.9, instill: 2 },
    itemChance: 0.18,
    rarity: { normal: 50, magic: 34, rare: 16 },
    gemChance: 0.017,
    flaskChance: 0.013,
    uniqueChance: 0.0012,
  },
  // Act 3 (zones.ts: 7, 8, 8, 8, 8, 9, 9, 9, 9, 9)
  8: {
    currencyChance: 0.06,
    currency: { ...BASIC, regal: 11, alchemy: 11, chaos: 9, annul: 2.2, exalted: 0.5, divine: 1, expansion: 1, instill: 2.2 },
    itemChance: 0.18,
    rarity: { normal: 48, magic: 35, rare: 17 },
    gemChance: 0.018,
    flaskChance: 0.014,
    uniqueChance: 0.0013,
  },
  9: {
    currencyChance: 0.065,
    currency: { ...BASIC, regal: 12, alchemy: 12, chaos: 10, annul: 2.5, exalted: 0.55, divine: 1.1, expansion: 1.1, instill: 2.5 },
    itemChance: 0.19,
    rarity: { normal: 46, magic: 35, rare: 19 },
    gemChance: 0.019,
    flaskChance: 0.014,
    uniqueChance: 0.0014,
  },
};

/**
 * A new character's first kills, on top of the normal rolls, so the first area always hands out something to wear and
 * something to craft it with before its boss. Keyed by lifetime kill number.
 */
export const STARTER_DROPS: Record<number, { slot: ItemSlotType } | { currency: string; qty: number }> = {
  2: { slot: 'gloves' },
  3: { currency: 'transmute', qty: 1 },
  5: { slot: 'boots' },
  6: { currency: 'alteration', qty: 1 },
  8: { slot: 'body' },
  9: { currency: 'transmute', qty: 1 },
  11: { slot: 'weapon' },
  12: { currency: 'alteration', qty: 1 },
  14: { slot: 'helmet' },
};

/** Boss rewards by area tier: deeper bosses guarantee better currency. */
export const BOSS_TABLES: Record<number, BossTable> = {
  1: { currencyRolls: 2, guaranteed: [{ id: 'transmute', qty: 2 }], repeatChance: 0.1, items: [1, 2], rarity: { normal: 0, magic: 92, rare: 8 }, gemChance: 0.35, flaskChance: 0.25, uniqueChance: 0.06 },
  2: { currencyRolls: 2, guaranteed: [{ id: 'alchemy', qty: 1 }], repeatChance: 0.1, items: [1, 2], rarity: { normal: 0, magic: 88, rare: 12 }, gemChance: 0.35, flaskChance: 0.25, uniqueChance: 0.07 },
  3: { currencyRolls: 3, guaranteed: [{ id: 'chaos', qty: 1 }], repeatChance: 0.1, items: [2, 2], rarity: { normal: 0, magic: 60, rare: 40 }, gemChance: 0.4, flaskChance: 0.25, uniqueChance: 0.08 },
  4: { currencyRolls: 3, guaranteed: [{ id: 'chaos', qty: 2 }], repeatChance: 0.06, items: [2, 3], rarity: { normal: 0, magic: 55, rare: 45 }, gemChance: 0.4, flaskChance: 0.3, uniqueChance: 0.09 },
  5: { currencyRolls: 3, guaranteed: [{ id: 'exalted', qty: 1 }], repeatChance: 0.015, items: [2, 3], rarity: { normal: 0, magic: 50, rare: 50 }, gemChance: 0.45, flaskChance: 0.3, uniqueChance: 0.1 },
  6: { currencyRolls: 3, guaranteed: [{ id: 'chaos', qty: 3 }], repeatChance: 0.04, items: [2, 3], rarity: { normal: 0, magic: 45, rare: 55 }, gemChance: 0.45, flaskChance: 0.3, uniqueChance: 0.11 },
  7: { currencyRolls: 4, guaranteed: [{ id: 'exalted', qty: 1 }, { id: 'divine', qty: 1 }], repeatChance: 0.015, items: [3, 3], rarity: { normal: 0, magic: 40, rare: 60 }, gemChance: 0.5, flaskChance: 0.3, uniqueChance: 0.12 },
  8: { currencyRolls: 4, guaranteed: [{ id: 'chaos', qty: 4 }], repeatChance: 0.04, items: [3, 3], rarity: { normal: 0, magic: 38, rare: 62 }, gemChance: 0.5, flaskChance: 0.3, uniqueChance: 0.13 },
  9: { currencyRolls: 4, guaranteed: [{ id: 'exalted', qty: 1 }, { id: 'divine', qty: 2 }], repeatChance: 0.015, items: [3, 4], rarity: { normal: 0, magic: 35, rare: 65 }, gemChance: 0.55, flaskChance: 0.3, uniqueChance: 0.14 },
};

export function dropTable(tier: number): DropTable {
  return DROP_TABLES[tier] ?? DROP_TABLES[7];
}

export function bossTable(tier: number): BossTable {
  return BOSS_TABLES[tier] ?? BOSS_TABLES[7];
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
