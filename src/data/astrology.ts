import type { SkillId, StatKey } from '../engine/types';
import type { MaterialDef } from './materials';

/**
 * Astrology: study constellations for Stardust, then light their stars for permanent bonuses.
 * Each lit star gives its constellation's profession a little speed and the character a small combat stat.
 */

export const STARDUST = 'stardust';
export const GILDED_STARDUST = 'gilded_stardust';

export const ASTROLOGY_MATERIALS: MaterialDef[] = [
  { id: STARDUST, name: 'Stardust', kind: 'dust', color: '#a9b8ff', value: 0, desc: 'Gathered by studying constellations. Spent on the Star Chart to light stars.' },
  { id: GILDED_STARDUST, name: 'Gilded Stardust', kind: 'dust', color: '#f2d27a', value: 0, desc: 'A rare glint found while studying constellations. The fourth and fifth star of every constellation need it.' },
];

export const STARS_PER_CONSTELLATION = 5;
/** Each lit star: this much faster in the constellation's profession. */
export const STAR_SKILL_SPEED = 2;

export interface Constellation {
  id: string;
  name: string;
  /** Astrology level to study it and light its stars */
  level: number;
  intervalMs: number;
  xp: number;
  /** Stardust per study */
  dust: number;
  /** chance per study of a Gilded Stardust */
  gilded: number;
  color: string;
  /** profession that gets faster per lit star; undefined for the capstone, which speeds every profession */
  skill?: SkillId;
  /** combat stat each lit star adds */
  stat: StatKey;
  perStar: number;
  lore: string;
  /** star positions on a 100×60 sky, in lighting order */
  stars: [number, number][];
}

const c = (
  id: string, name: string, level: number, intervalMs: number, xp: number, color: string,
  skill: SkillId | undefined, stat: StatKey, perStar: number, lore: string, stars: [number, number][],
): Constellation => ({ id, name, level, intervalMs, xp, dust: 1 + Math.floor(level / 20), gilded: 0.015, color, skill, stat, perStar, lore, stars });

export const CONSTELLATIONS: Constellation[] = [
  c('lantern', 'The Lantern', 1, 3000, 7, '#f2c94c', 'mining', 'life', 5, 'Miners swear it burns brighter over a rich seam.', [[20, 40], [35, 20], [50, 15], [65, 20], [80, 40]]),
  c('hollow_oak', 'The Hollow Oak', 8, 3500, 11, '#6fae4a', 'woodcutting', 'armourPct', 2, 'A trunk of three stars, split by lightning long ago.', [[50, 50], [50, 35], [35, 20], [65, 20], [50, 8]]),
  c('sower', 'The Sower', 15, 3500, 17, '#d9b84a', 'harvesting', 'manaRegenPct', 3, 'Scattering seed she never stays to see grow.', [[15, 45], [35, 35], [50, 25], [70, 30], [88, 15]]),
  c('cutpurse', 'The Cutpurse', 22, 4000, 23, '#c9a35a', 'thieving', 'evasionPct', 2, 'Faint, quick, and gone when you look straight at it.', [[25, 15], [40, 30], [55, 25], [70, 40], [60, 52]]),
  c('buried_king', 'The Buried King', 30, 4000, 31, '#b0784a', 'archaeology', 'itemRarity', 2, 'A crown of stars, sunk halfway below the horizon.', [[20, 45], [35, 30], [50, 40], [65, 30], [80, 45]]),
  c('ember_moon', 'The Ember Moon', 34, 4000, 35, '#d07a3a', 'smelting', 'chaosRes', 2, 'A red ring that smelters bless before the first pour.', [[50, 10], [70, 25], [65, 48], [35, 48], [30, 25]]),
  c('anvil', 'The Anvil', 38, 4500, 40, '#b8b8c8', 'smithing', 'fireRes', 2, 'Four stars square as a forge-block, one struck loose.', [[25, 25], [75, 25], [70, 45], [30, 45], [50, 10]]),
  c('loom', 'The Loom', 45, 4500, 47, '#9c7a4c', 'woodcrafting', 'coldRes', 2, 'Its threads run north to south, warp and weft of light.', [[20, 15], [20, 50], [50, 32], [80, 15], [80, 50]]),
  c('alembic', 'The Alembic', 52, 5000, 55, '#9b6dde', 'alchemy', 'flaskEffect', 2, 'A bulb of stars and a long, dripping neck.', [[30, 45], [45, 35], [60, 40], [70, 25], [85, 12]]),
  c('prism', 'The Prism', 60, 5000, 63, '#4fc1a6', 'gemcutting', 'lightRes', 2, 'Seen through cut glass it splits into seven.', [[50, 8], [30, 40], [70, 40], [50, 52], [50, 28]]),
  c('scribe', 'The Scribe', 68, 5500, 72, '#6fa8ff', 'runecarving', 'energyShieldPct', 2, 'A hand of stars, forever mid-stroke.', [[15, 30], [32, 20], [50, 32], [68, 22], [85, 34]]),
  c('hearth', 'The Hearth', 75, 5500, 80, '#e08a4a', 'cooking', 'lifePct', 1, 'Low and warm in the winter sky, over every kitchen.', [[30, 50], [70, 50], [65, 30], [50, 15], [35, 30]]),
  c('wanderer', 'The Wanderer', 82, 6000, 90, '#8a7ad8', 'cartography', 'critChancePct', 3, 'Every map of Wraeclast is drawn facing it.', [[10, 50], [30, 38], [48, 42], [66, 26], [90, 10]]),
  c('unclosed_eye', 'The Unclosed Eye', 90, 6000, 100, '#e8e4ff', undefined, 'allRes', 1, 'The last thing the Seal-Readers ever charted. It looks back.', [[20, 30], [50, 12], [80, 30], [50, 48], [50, 30]]),
];

export const constellationDef = (id: string): Constellation | undefined => CONSTELLATIONS.find((x) => x.id === id);

/** What lighting star `n` (1-based) of a constellation costs. */
export function starCost(cst: Constellation, n: number): Record<string, number> {
  const cost: Record<string, number> = { [STARDUST]: (10 + cst.level) * n * n * 2 };
  if (n === 4) cost[GILDED_STARDUST] = 1;
  if (n === 5) cost[GILDED_STARDUST] = 3;
  return cost;
}
