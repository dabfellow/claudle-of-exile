import type { SkillId } from '../engine/types';
import type { MaterialDef } from './materials';

/**
 * Astrology: chart your own constellation (docs/ASTROLOGY_CONSTELLATIONS.md).
 * Research a sky region to unlock its stars, watch a star to rank it up, then place stars on the one charted
 * constellation. Linked stars feed each other, and the whole chart is a small global buff.
 */

export const STARDUST = 'stardust';
export const GILDED_STARDUST = 'gilded_stardust';

export const ASTROLOGY_MATERIALS: MaterialDef[] = [
  { id: STARDUST, name: 'Stardust', kind: 'dust', color: '#a9b8ff', value: 0, desc: 'Gathered by researching the sky. Spent on ranking stars up and on recharting your constellation.' },
  { id: GILDED_STARDUST, name: 'Gilded Stardust', kind: 'dust', color: '#f2d27a', value: 0, desc: 'A rare glint found while researching the sky. Each star rank past 10 needs one.' },
];

// ---------- tuning ----------

/** Research points at which a region's four stars unlock. */
export const STAR_UNLOCK_POINTS = [25, 100, 250, 500];
/** A deep-sky region's wonder needs this many research points. */
export const DEEP_RESEARCH_POINTS = 1000;
/** Ranks run to 10, or to 15 with Gilded Stardust. */
export const MAX_RANK = 10;
export const MAX_GILDED_RANK = 15;
/** Stardust to start the next rank. */
export const RANK_UP_STARDUST = 50;
/** Stardust per slot changed when recharting. */
export const RECHART_COST = 200;
/** One watch completion takes this long and gives one star XP. */
export const WATCH_INTERVAL_MS = 6000;
export const WATCH_STAR_XP = 1;
/** A watch completion has this chance of a fallen star. */
export const FALLEN_CHANCE = 1 / 4000;
/** Fallen stars roll at this share of their listed value, from low to high. */
export const FALLEN_ROLL: [number, number] = [0.8, 1.2];
/** Each active line between matching stars gives both stars this much extra effect. */
export const LINE_BONUS = 0.25;
export const GILDED_CHANCE = 0.015;

/** Star XP needed to reach `rank` from the rank before it. */
export const rankXp = (rank: number): number => 20 * rank * rank;

// ---------- stars ----------

export type StarFamily = 'skill' | 'combat' | 'wealth' | 'skilling' | 'conditional';

/**
 * What a star does. `yield:<skill>` and `speed:<skill>` name a skill; the rest are the keys read by engine/astrology.ts.
 * `purity`, `mutation` and `collectible` are stored and shown, and are read by Smelting, Foraging and the collectible
 * system once those are rebuilt.
 */
export type EffectKey =
  | `yield:${SkillId}` | `speed:${SkillId}`
  | 'life' | 'allRes' | 'damage' | 'attackCast' | 'defences' | 'moveSpeed'
  | 'gold' | 'rarity' | 'currency' | 'maps'
  | 'xp' | 'offline' | 'collectible'
  | 'purity' | 'mutation' | 'wardRes';

export interface StarDef {
  id: string;
  name: string;
  region: string;
  /** undefined for the deep-sky wonders, which are not part of any family */
  family?: StarFamily;
  effect?: EffectKey;
  /** effect at rank 1, in percent */
  value: number;
  /** what the star does, at rank 1 */
  desc: string;
  /** a conditional star works only when linked to this */
  needs?: { skills?: SkillId[]; family?: StarFamily; count: number };
  /** deep-sky wonder */
  wonder?: 'nova' | 'binary' | 'black';
}

const GATHER_YIELD: SkillId[] = ['mining', 'woodcutting', 'harvesting', 'thieving', 'archaeology', 'astrology'];
const SKILL_LABEL: Partial<Record<SkillId, string>> = {
  mining: 'Mining', woodcutting: 'Woodcutting', harvesting: 'Foraging', thieving: 'Thieving', archaeology: 'Archaeology', astrology: 'Astrology',
  smelting: 'Smelting', smithing: 'Forging', woodcrafting: 'Woodcrafting', tailoring: 'Tailoring', sawmilling: 'Sawmilling', alchemy: 'Alchemy', gemcutting: 'Gemcutting', cartography: 'Cartography',
};
export const skillLabel = (k: SkillId): string => SKILL_LABEL[k] ?? k;

const skillStar = (id: string, name: string, region: string, skill: SkillId): StarDef => {
  const yields = GATHER_YIELD.includes(skill);
  return {
    id, name, region, family: 'skill', effect: yields ? `yield:${skill}` : `speed:${skill}`, value: 0.5,
    desc: `+0.5% ${skillLabel(skill)} ${yields ? 'yield' : 'speed'}`,
  };
};

export const STARS: StarDef[] = [
  // The Lantern and the Oak
  skillStar('seam_lantern', 'Seam Lantern', 'lantern', 'mining'),
  skillStar('hollow_bough', 'Hollow Bough', 'lantern', 'woodcutting'),
  { id: 'lamplight', name: 'Lamplight', region: 'lantern', family: 'combat', effect: 'life', value: 0.5, desc: '+0.5% maximum life' },
  { id: 'scholars_spark', name: "Scholar's Spark", region: 'lantern', family: 'skilling', effect: 'xp', value: 0.5, desc: '+0.5% skill XP' },
  // The Sower and the Cutpurse
  skillStar('sowers_seed', "Sower's Seed", 'sower', 'harvesting'),
  skillStar('cutpurse_wink', "Cutpurse's Wink", 'sower', 'thieving'),
  { id: 'ward_of_weather', name: 'Ward of Weather', region: 'sower', family: 'combat', effect: 'allRes', value: 0.4, desc: '+0.4% all resistances' },
  { id: 'coin_glint', name: 'Coin Glint', region: 'sower', family: 'wealth', effect: 'gold', value: 0.5, desc: '+0.5% gold found' },
  // The Buried King and the Ember Moon
  skillStar('crown_shard', 'Crown Shard', 'buried_king', 'archaeology'),
  skillStar('ember_ring', 'Ember Ring', 'buried_king', 'smelting'),
  { id: 'war_star', name: 'War Star', region: 'buried_king', family: 'combat', effect: 'damage', value: 0.4, desc: '+0.4% damage' },
  { id: 'treasure_star', name: 'Treasure Star', region: 'buried_king', family: 'wealth', effect: 'rarity', value: 0.4, desc: '+0.4% item rarity' },
  // The Anvil and the Loom
  skillStar('anvil_spark', 'Anvil Spark', 'anvil', 'smithing'),
  skillStar('warp_thread', 'Warp Thread', 'anvil', 'woodcrafting'),
  { id: 'swift_needle', name: 'Swift Needle', region: 'anvil', family: 'combat', effect: 'attackCast', value: 0.3, desc: '+0.3% attack and cast speed' },
  {
    id: 'forgefire', name: 'Forgefire', region: 'anvil', family: 'conditional', effect: 'purity', value: 1, desc: '+1% Smelting purity odds. Works only if linked to a Smelting or Forging star',
    needs: { skills: ['smelting', 'smithing'], count: 1 },
  },
  // The Alembic and the Prism
  skillStar('dripping_neck', 'Dripping Neck', 'alembic', 'alchemy'),
  skillStar('seven_facets', 'Seven Facets', 'alembic', 'gemcutting'),
  { id: 'bulwark_star', name: 'Bulwark Star', region: 'alembic', family: 'combat', effect: 'defences', value: 0.5, desc: '+0.5% armour and evasion' },
  {
    id: 'greenroot', name: 'Greenroot', region: 'alembic', family: 'conditional', effect: 'mutation', value: 1, desc: '+1% Foraging mutation chance. Works only if linked to a Foraging star',
    needs: { skills: ['harvesting'], count: 1 },
  },
  // The Scribe and the Hearth
  skillStar('mapmakers_hand', "Mapmaker's Hand", 'scribe', 'cartography'),
  { id: 'wayfarer', name: 'Wayfarer', region: 'scribe', family: 'combat', effect: 'moveSpeed', value: 0.2, desc: '+0.2% movement speed' },
  { id: 'orb_glint', name: 'Orb Glint', region: 'scribe', family: 'wealth', effect: 'currency', value: 0.3, desc: '+0.3% currency drops' },
  { id: 'long_night', name: 'Long Night', region: 'scribe', family: 'skilling', effect: 'offline', value: 1, desc: '+1% offline skilling speed' },
  // The Wanderer and the Unclosed Eye
  skillStar('watchers_eye', "Watcher's Eye", 'wanderer', 'astrology'),
  { id: 'charted_road', name: 'Charted Road', region: 'wanderer', family: 'wealth', effect: 'maps', value: 0.3, desc: '+0.3% map drops' },
  { id: 'curio_star', name: 'Curio Star', region: 'wanderer', family: 'skilling', effect: 'collectible', value: 2, desc: '+2% collectible chance' },
  {
    id: 'wardlight', name: 'Wardlight', region: 'wanderer', family: 'conditional', effect: 'wardRes', value: 1, desc: '+1% all resistances. Works only if linked to two Combat stars',
    needs: { family: 'combat', count: 2 },
  },
  // Deep-sky wonders
  { id: 'nova', name: 'Nova', region: 'deep_nova', value: 0.5, desc: 'Every star linked to it gets +50% effect', wonder: 'nova' },
  { id: 'binary', name: 'Binary Pair', region: 'deep_binary', value: 1, desc: 'Fills two adjacent slots, counts as one star of each neighbour\'s family for lines, and gives +1% skill XP per rank', wonder: 'binary' },
  { id: 'black', name: 'Black Star', region: 'deep_black', value: 0.5, desc: 'Every other star -10%, but each active line gives +50% instead of +25%', wonder: 'black' },
];

const STAR_BY_ID = new Map(STARS.map((x) => [x.id, x]));
export const starDef = (id: string): StarDef | undefined => STAR_BY_ID.get(id);
export const isWonder = (id: string): boolean => !!STAR_BY_ID.get(id)?.wonder;
/** Wonders rank like other stars; their strength grows this much per rank past 1. */
export const WONDER_RANK_STEP = 0.05;
/** Nova's linked-star bonus and Black Star's line bonus */
export const NOVA_BONUS = 0.5;
export const BLACK_LINE_BONUS = 0.5;
export const BLACK_PENALTY = 0.1;
/** the second slot a Binary Pair fills is stored under this id */
export const BINARY_PARTNER = 'binary#2';

// ---------- sky regions ----------

export interface SkyRegion {
  id: string;
  name: string;
  /** Astrology level to research it */
  level: number;
  intervalMs: number;
  xp: number;
  /** Stardust per research */
  dust: number;
  gilded: number;
  color: string;
  lore: string;
  /** stars in unlock order */
  stars: string[];
  /** deep-sky region: holds one wonder, needs DEEP_RESEARCH_POINTS */
  deep?: boolean;
  /** the two old constellation studies this region replaced (for save migration) */
  old?: [string, string];
}

const dustFor = (level: number) => 1 + Math.floor(level / 20);

/** Each region takes the interval, XP, Stardust and Gilded chance of the harder of the two old studies it replaced. */
export const REGIONS: SkyRegion[] = [
  { id: 'lantern', name: 'The Lantern and the Oak', level: 1, intervalMs: 3500, xp: 11, dust: dustFor(8), gilded: GILDED_CHANCE, color: '#f2c94c', lore: 'Miners swear it burns brighter over a rich seam, beside a trunk of three stars split by lightning.', stars: ['seam_lantern', 'hollow_bough', 'lamplight', 'scholars_spark'], old: ['lantern', 'hollow_oak'] },
  { id: 'sower', name: 'The Sower and the Cutpurse', level: 15, intervalMs: 4000, xp: 23, dust: dustFor(22), gilded: GILDED_CHANCE, color: '#d9b84a', lore: 'One scatters seed she never stays to see grow. The other is faint, quick, and gone when you look straight at it.', stars: ['sowers_seed', 'cutpurse_wink', 'ward_of_weather', 'coin_glint'], old: ['sower', 'cutpurse'] },
  { id: 'buried_king', name: 'The Buried King and the Ember Moon', level: 30, intervalMs: 4000, xp: 35, dust: dustFor(34), gilded: GILDED_CHANCE, color: '#d07a3a', lore: 'A crown sunk halfway below the horizon, and a red ring that smelters bless before the first pour.', stars: ['crown_shard', 'ember_ring', 'war_star', 'treasure_star'], old: ['buried_king', 'ember_moon'] },
  { id: 'anvil', name: 'The Anvil and the Loom', level: 45, intervalMs: 4500, xp: 47, dust: dustFor(45), gilded: GILDED_CHANCE, color: '#b8b8c8', lore: 'Four stars square as a forge-block, and threads run north to south, warp and weft of light.', stars: ['anvil_spark', 'warp_thread', 'swift_needle', 'forgefire'], old: ['anvil', 'loom'] },
  { id: 'alembic', name: 'The Alembic and the Prism', level: 60, intervalMs: 5000, xp: 63, dust: dustFor(60), gilded: GILDED_CHANCE, color: '#9b6dde', lore: 'A bulb of stars with a long, dripping neck, which seen through cut glass splits into seven.', stars: ['dripping_neck', 'seven_facets', 'bulwark_star', 'greenroot'], old: ['alembic', 'prism'] },
  { id: 'scribe', name: 'The Scribe and the Hearth', level: 75, intervalMs: 5500, xp: 80, dust: dustFor(75), gilded: GILDED_CHANCE, color: '#6fa8ff', lore: 'A hand of stars forever mid-stroke, over a low warm glow that hangs above every kitchen.', stars: ['mapmakers_hand', 'wayfarer', 'orb_glint', 'long_night'], old: ['scribe', 'hearth'] },
  { id: 'wanderer', name: 'The Wanderer and the Unclosed Eye', level: 90, intervalMs: 6000, xp: 100, dust: dustFor(90), gilded: GILDED_CHANCE, color: '#e8e4ff', lore: 'Every map of Wraeclast is drawn facing it. The last thing the Seal-Readers ever charted looks back.', stars: ['watchers_eye', 'charted_road', 'curio_star', 'wardlight'], old: ['wanderer', 'unclosed_eye'] },
  { id: 'deep_nova', name: 'The Nova Veil', level: 80, intervalMs: 6500, xp: 110, dust: dustFor(80), gilded: GILDED_CHANCE, color: '#ffd9a0', lore: 'A shroud of burnt-out light, and at its heart one star that has not finished exploding.', stars: ['nova'], deep: true },
  { id: 'deep_binary', name: 'The Binary Deep', level: 88, intervalMs: 7000, xp: 125, dust: dustFor(88), gilded: GILDED_CHANCE, color: '#9fe0ff', lore: 'Two stars so close they have forgotten they were ever apart.', stars: ['binary'], deep: true },
  { id: 'deep_black', name: 'The Black Reach', level: 95, intervalMs: 7500, xp: 140, dust: dustFor(95), gilded: GILDED_CHANCE, color: '#7a6aa8', lore: 'A star you only find by the light it takes away.', stars: ['black'], deep: true },
];

const REGION_BY_ID = new Map(REGIONS.map((r) => [r.id, r]));
export const regionDef = (id: string): SkyRegion | undefined => REGION_BY_ID.get(id);
export const regionOfStar = (starId: string): SkyRegion | undefined => REGION_BY_ID.get(STAR_BY_ID.get(starId)?.region ?? '');
export const researchNeeded = (r: SkyRegion, starIndex: number): number => (r.deep ? DEEP_RESEARCH_POINTS : STAR_UNLOCK_POINTS[starIndex]);

// ---------- fallen stars ----------

export interface FallenKind {
  id: string;
  name: string;
  /** listed value, in percent; the rolled value is 80–120% of it */
  value: number;
  desc: (v: number) => string;
}

export const FALLEN_TABLE: FallenKind[] = [
  { id: 'gathering', name: 'Fallen Harvest', value: 1, desc: (v) => `+${v}% to every gathering skill's yield` },
  { id: 'production', name: 'Fallen Forge', value: 1, desc: (v) => `+${v}% to every production skill's speed` },
  { id: 'warrior', name: 'Fallen Champion', value: 1, desc: (v) => `+${v}% to all damage and life` },
  { id: 'fortune', name: 'Fallen Fortune', value: 2, desc: (v) => `+${v}% to item rarity and gold` },
  { id: 'scholar', name: 'Fallen Scholar', value: 3, desc: (v) => `+${v}% to skill XP` },
];
export const fallenKind = (id: string): FallenKind | undefined => FALLEN_TABLE.find((f) => f.id === id);

// ---------- the chart ----------

/** Slots: 3 at level 1, +1 at each of these, then the Great Chart. */
export const SLOT_LEVELS = [20, 35, 50, 65, 80];
export const GREAT_CHART_LEVELS: [number, number][] = [[95, 14], [85, 12]];

export interface ChartLayout {
  /** slot positions on a 100×60 sky */
  points: [number, number][];
  /** pairs of slot indexes that can be linked; a line is active when both slots are filled */
  lines: [number, number][];
}

const SMALL_POINTS: [number, number][] = [[50, 8], [28, 22], [72, 22], [14, 44], [86, 44], [50, 54], [50, 32], [90, 10]];
const SMALL_LINES: [number, number][] = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [3, 5], [4, 5], [1, 6], [2, 6], [6, 5], [2, 7]];

const GREAT_POINTS: [number, number][] = [[10, 30], [22, 14], [38, 22], [56, 10], [72, 20], [90, 12], [88, 36], [72, 46], [56, 38], [40, 50], [24, 44], [50, 30], [34, 5], [62, 56]];
const GREAT_LINES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 0],
  [11, 2], [11, 4], [11, 8], [11, 10], [1, 12], [2, 12], [7, 13], [8, 13],
];

/** The fixed layout for a chart of `count` slots. The small charts grow the same shape one star at a time. */
export function chartLayout(count: number): ChartLayout {
  const src = count > 8 ? { points: GREAT_POINTS, lines: GREAT_LINES } : { points: SMALL_POINTS, lines: SMALL_LINES };
  return { points: src.points.slice(0, count), lines: src.lines.filter(([a, b]) => a < count && b < count) };
}

/** How many slots the constellation has at an Astrology level. */
export function chartSlotCount(level: number): number {
  for (const [lvl, n] of GREAT_CHART_LEVELS) if (level >= lvl) return n;
  return 3 + SLOT_LEVELS.filter((l) => level >= l).length;
}
