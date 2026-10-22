/**
 * Drop tables. Monsters drop most gear and all of the rare currency; deeper areas shift
 * the odds toward rarer orbs and better rarities. Every number here is a balance knob —
 * check changes with `npm run sim` (docs/BALANCE.md).
 */

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
    currencyChance: 0.045,
    currency: { ...BASIC },
    itemChance: 0.06,
    rarity: { normal: 70, magic: 26, rare: 4 },
    gemChance: 0.012,
    flaskChance: 0.01,
    uniqueChance: 0.0005,
  },
  2: {
    currencyChance: 0.045,
    currency: { ...BASIC, regal: 6, alchemy: 4, chaos: 2.5 },
    itemChance: 0.06,
    rarity: { normal: 66, magic: 28, rare: 6 },
    gemChance: 0.012,
    flaskChance: 0.01,
    uniqueChance: 0.0006,
  },
  3: {
    currencyChance: 0.05,
    currency: { ...BASIC, regal: 7, alchemy: 6, chaos: 4, annul: 0.8, exalted: 0.15, divine: 0.3, expansion: 0.3 },
    itemChance: 0.065,
    rarity: { normal: 62, magic: 30, rare: 8 },
    gemChance: 0.013,
    flaskChance: 0.011,
    uniqueChance: 0.0007,
  },
  4: {
    currencyChance: 0.05,
    currency: { ...BASIC, regal: 7, alchemy: 7, chaos: 5, annul: 1, exalted: 0.25, divine: 0.5, expansion: 0.5, instill: 1 },
    itemChance: 0.065,
    rarity: { normal: 58, magic: 32, rare: 10 },
    gemChance: 0.014,
    flaskChance: 0.012,
    uniqueChance: 0.0008,
  },
  5: {
    currencyChance: 0.055,
    currency: { ...BASIC, regal: 8, alchemy: 8, chaos: 6, annul: 1.5, exalted: 0.35, divine: 0.7, expansion: 0.7, instill: 1.5 },
    itemChance: 0.07,
    rarity: { normal: 55, magic: 33, rare: 12 },
    gemChance: 0.015,
    flaskChance: 0.012,
    uniqueChance: 0.001,
  },
};

/** Boss rewards by area tier: deeper bosses guarantee better currency. */
export const BOSS_TABLES: Record<number, BossTable> = {
  1: { currencyRolls: 2, guaranteed: [{ id: 'transmute', qty: 2 }], repeatChance: 0.1, items: [1, 2], rarity: { normal: 0, magic: 70, rare: 30 }, gemChance: 0.35, flaskChance: 0.25, uniqueChance: 0.06 },
  2: { currencyRolls: 2, guaranteed: [{ id: 'alchemy', qty: 1 }], repeatChance: 0.1, items: [1, 2], rarity: { normal: 0, magic: 65, rare: 35 }, gemChance: 0.35, flaskChance: 0.25, uniqueChance: 0.07 },
  3: { currencyRolls: 3, guaranteed: [{ id: 'chaos', qty: 1 }], repeatChance: 0.1, items: [2, 2], rarity: { normal: 0, magic: 60, rare: 40 }, gemChance: 0.4, flaskChance: 0.25, uniqueChance: 0.08 },
  4: { currencyRolls: 3, guaranteed: [{ id: 'chaos', qty: 2 }], repeatChance: 0.06, items: [2, 3], rarity: { normal: 0, magic: 55, rare: 45 }, gemChance: 0.4, flaskChance: 0.3, uniqueChance: 0.09 },
  5: { currencyRolls: 3, guaranteed: [{ id: 'exalted', qty: 1 }], repeatChance: 0.015, items: [2, 3], rarity: { normal: 0, magic: 50, rare: 50 }, gemChance: 0.45, flaskChance: 0.3, uniqueChance: 0.1 },
};

export function dropTable(tier: number): DropTable {
  return DROP_TABLES[tier] ?? DROP_TABLES[5];
}

export function bossTable(tier: number): BossTable {
  return BOSS_TABLES[tier] ?? BOSS_TABLES[5];
}

/** Orbs that never come from crafting — only from monsters. */
export const COMBAT_ONLY_CURRENCY = ['regal', 'chaos', 'annul', 'exalted', 'divine', 'expansion', 'instill'];
