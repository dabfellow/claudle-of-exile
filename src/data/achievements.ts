import { characterLevel } from '../engine/character';
import type { GameState, SkillId, StatKey } from '../engine/types';
import { levelOf } from '../engine/xp';
import { HARD_BOSSES, UBER_BOSSES, UNIQUE_MAPS } from './maps';
import { PASSIVE_BY_ID } from './passiveTree';
import { actOpen, zonesInAct } from './zones';

export type AchievementCategory = 'campaign' | 'combat' | 'bosses' | 'maps' | 'crafting' | 'skilling' | 'character' | 'challenge';

/**
 * Lasting rewards that change play (docs/MILESTONES.md, Round 2 design pass). Each character earns its own
 * achievements, so these follow the character, except Atlas points and stash tabs: the Atlas and the stash belong to
 * the realm, so those are added once, the first time any character in the realm earns that achievement.
 */
export interface AchievementPerks {
  /** extra character-tree Passive points */
  passivePoints?: number;
  /** extra hours of offline progress for this character */
  offlineHours?: number;
  /** permanent small bonuses for this character */
  stats?: Partial<Record<StatKey, number>>;
  /** realm: extra Atlas points, on top of the usual cap */
  atlasPoints?: number;
  /** realm: free stash tabs */
  stashTabs?: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  category: AchievementCategory;
  target: number;
  progress: (s: GameState) => number;
  /** currency/material rewards */
  reward?: Record<string, number>;
  /** a unique item handed over on completion; these never drop and can't be traded */
  unique?: string;
  perks?: AchievementPerks;
  /** belongs to this act: hidden until the act is open */
  act?: number;
}

const SKILLING = ['mining', 'woodcutting', 'harvesting', 'thieving', 'archaeology', 'smithing', 'alchemy', 'gemcutting', 'runecarving', 'cooking', 'cartography'] as const;
const totalSkillLevel = (s: GameState) => SKILLING.reduce((a, k) => a + levelOf(k, s.skills[k]), 0);
const skillLevel = (k: SkillId) => (s: GameState) => levelOf(k, s.skills[k]);
const topSkillLevel = (s: GameState) => Math.max(...SKILLING.map((k) => levelOf(k, s.skills[k])));
const L = (s: GameState) => s.lifetime;
const beat = (s: GameState, zoneId: string) => (s.bossesDefeated.includes(zoneId) ? 1 : 0);
const bossesBeatenIn = (s: GameState, act: number) => zonesInAct(act).filter((z) => s.bossesDefeated.includes(z.id)).length;
const hardcore = (s: GameState) => !!s.character.challenge?.hardcore;
const ssf = (s: GameState) => !!s.character.challenge?.ssf;
const classic = (s: GameState) => !!s.character.challenge?.classic;
const nodeCount = (s: GameState, test: (id: string) => boolean) => s.passives.filter(test).length;
const uniquesWorn = (s: GameState) => Object.values(s.equipment).filter((i) => i?.rarity === 'unique').length;
const topGemLevel = (s: GameState) => Math.max(0, ...s.skillBar.map((g) => g?.level ?? 0));
/** the act's last boss is down */
const ACT_BOSS = ['sanctum', 'burningthrone', 'highaltar', 'giantsthrone', 'maelstrom', 'shatteredthrone'];
const actDone = (s: GameState, act: number) => beat(s, ACT_BOSS[act - 1]);

const SKILL_FIFTY: [SkillId, string, number?][] = [
  ['mining', 'Deep Vein'],
  ['woodcutting', 'Heartwood'],
  ['harvesting', 'Green Thumb'],
  ['thieving', 'Light Fingers'],
  ['archaeology', 'Dust and Bones'],
  ['smithing', 'Tempered'],
  ['alchemy', 'Steady Hand'],
  ['gemcutting', 'Flawless Facet'],
  ['runecarving', 'Runewright', 3],
  ['cooking', 'Head Cook', 5],
  ['cartography', 'Mapmaker', 6],
];
/** Achievement titles for the Hard and Uber bosses, by achievement id. */
const BOSS_TITLES: Record<string, string> = {
  hard_ossuar: 'Mountain Breaker',
  hard_mother_vael: 'The Choir Ends',
  hard_undertow: 'Against the Current',
  hard_twin_regents: 'Sun and Moon Set',
  hard_crownless: 'No Crown, No King',
  uber_first_exile: 'Before Us All',
  uber_architect_ruin: 'Unbuilt',
  uber_void_sovereign: 'Into the Void',
};
const SKILL_NAME: Record<string, string> = {
  mining: 'Mining', woodcutting: 'Woodcutting', harvesting: 'Foraging', thieving: 'Thieving', archaeology: 'Archaeology',
  smithing: 'Smithing', alchemy: 'Alchemy', gemcutting: 'Gemcutting', runecarving: 'Rune-carving', cooking: 'Cooking', cartography: 'Cartography',
};

const ALL: AchievementDef[] = [
  // ---------- campaign ----------
  {
    id: 'act_1', name: 'The Tide Turns', desc: 'Defeat Ysolde, the Drowned Queen, and complete Act 1', category: 'campaign',
    target: 1, progress: (s) => actDone(s, 1), reward: { divine: 1, regal: 2 },
  },
  {
    id: 'conqueror', name: 'Conqueror of the Coast', desc: "Defeat every Act 1 area's boss", category: 'campaign',
    target: zonesInAct(1).length, progress: (s) => bossesBeatenIn(s, 1), reward: { exalted: 1 },
  },
  {
    id: 'act_2', name: 'Sunset', desc: 'Defeat Azhar, the Fallen Sun, and complete Act 2', category: 'campaign', act: 2,
    target: 1, progress: (s) => actDone(s, 2), reward: { divine: 2, exalted: 1 },
  },
  {
    id: 'conqueror_2', name: 'Lord of the Steppe', desc: "Defeat every Act 2 area's boss", category: 'campaign', act: 2,
    target: zonesInAct(2).length, progress: (s) => bossesBeatenIn(s, 2), reward: { exalted: 1 }, perks: { passivePoints: 1 },
  },
  {
    id: 'act_3', name: 'The Bells Fall Silent', desc: 'Defeat Hierarch Solenne and complete Act 3', category: 'campaign', act: 3,
    target: 1, progress: (s) => actDone(s, 3), reward: { divine: 2, exalted: 2 },
  },
  {
    id: 'conqueror_3', name: 'Heretic of the City', desc: "Defeat every Act 3 area's boss", category: 'campaign', act: 3,
    target: zonesInAct(3).length, progress: (s) => bossesBeatenIn(s, 3), reward: { exalted: 1 },
  },
  {
    id: 'trial_1', name: 'Pilgrim', desc: 'Pass your first Ascendancy Trial', category: 'campaign', act: 3,
    target: 1, progress: (s) => s.ascendancy.trials, reward: { regal: 2, regret: 2 },
  },
  {
    id: 'act_4', name: 'The Mountain Falls', desc: 'Defeat the Hollow King and complete Act 4', category: 'campaign', act: 4,
    target: 1, progress: (s) => actDone(s, 4), reward: { divine: 2, exalted: 2 },
  },
  {
    id: 'conqueror_4', name: 'Giantsbane', desc: "Defeat every Act 4 area's boss", category: 'campaign', act: 4,
    target: zonesInAct(4).length, progress: (s) => bossesBeatenIn(s, 4), reward: { exalted: 1 }, perks: { passivePoints: 1 },
  },
  {
    id: 'act_5', name: 'Slack Water', desc: 'Defeat Thalass, the Caller Below, and complete Act 5', category: 'campaign', act: 5,
    target: 1, progress: (s) => actDone(s, 5), reward: { divine: 3, exalted: 3 },
  },
  {
    id: 'conqueror_5', name: 'Master of the Sunless Sea', desc: "Defeat every Act 5 area's boss", category: 'campaign', act: 5,
    target: zonesInAct(5).length, progress: (s) => bossesBeatenIn(s, 5), reward: { exalted: 2 },
  },
  {
    id: 'act_6', name: 'The King Is Dead', desc: 'Defeat Oswin Aurelane, the Last King, and complete Act 6', category: 'campaign', act: 6,
    target: 1, progress: (s) => actDone(s, 6), reward: { divine: 4, exalted: 4 },
  },
  {
    id: 'conqueror_6', name: 'Long Live No One', desc: "Defeat every Act 6 area's boss", category: 'campaign', act: 6,
    target: zonesInAct(6).length, progress: (s) => bossesBeatenIn(s, 6), reward: { exalted: 3 }, perks: { passivePoints: 1 },
  },
  {
    id: 'trial_3', name: 'Three Gates Passed', desc: 'Pass three Ascendancy Trials', category: 'campaign', act: 6,
    target: 3, progress: (s) => s.ascendancy.trials, reward: { divine: 1, regret: 3 },
  },
  {
    id: 'trial_4', name: 'Ascended', desc: 'Pass all four Ascendancy Trials', category: 'campaign', act: 6,
    target: 4, progress: (s) => s.ascendancy.trials, reward: { divine: 2 }, perks: { passivePoints: 1 },
  },
  {
    id: 'act_6_deathless', name: 'Unbroken', desc: 'Complete all six acts without ever dying', category: 'campaign', act: 6,
    target: 1, progress: (s) => (L(s).act6Deathless || (L(s).deaths === 0 && s.bossesDefeated.includes('shatteredthrone')) ? 1 : 0),
    unique: 'unbroken_temper', perks: { passivePoints: 1 },
  },

  // ---------- combat ----------
  { id: 'slayer_100', name: 'Cull the Drowned', desc: 'Slay 100 monsters', category: 'combat', target: 100, progress: (s) => L(s).kills, reward: { gold: 100 } },
  { id: 'slayer_1000', name: 'Thousand Cuts', desc: 'Slay 1,000 monsters', category: 'combat', target: 1000, progress: (s) => L(s).kills, reward: { alchemy: 2 } },
  { id: 'slayer_10000', name: 'Exterminator', desc: 'Slay 10,000 monsters', category: 'combat', target: 10000, progress: (s) => L(s).kills, reward: { chaos: 2 }, perks: { stats: { itemRarity: 2 } } },
  { id: 'slayer_50000', name: 'Tide of Blood', desc: 'Slay 50,000 monsters', category: 'combat', target: 50000, progress: (s) => L(s).kills, reward: { exalted: 1 }, perks: { stats: { goldFind: 5 } } },
  { id: 'slayer_250000', name: 'The Reckoning', desc: 'Slay 250,000 monsters', category: 'combat', target: 250000, progress: (s) => L(s).kills, reward: { divine: 2 }, perks: { stats: { itemRarity: 3 } } },
  { id: 'rare_kills_100', name: 'Big Game', desc: 'Slay 100 rare monsters', category: 'combat', target: 100, progress: (s) => L(s).rareKills ?? 0, reward: { chaos: 2 } },
  { id: 'rare_kills_1000', name: 'Trophy Wall', desc: 'Slay 1,000 rare monsters', category: 'combat', target: 1000, progress: (s) => L(s).rareKills ?? 0, reward: { exalted: 1 }, perks: { stats: { itemRarity: 2 } } },
  { id: 'rare_kills_5000', name: 'Apex', desc: 'Slay 5,000 rare monsters', category: 'combat', target: 5000, progress: (s) => L(s).rareKills ?? 0, reward: { divine: 1 }, perks: { stats: { charXp: 3 } } },
  {
    id: 'deathless', name: 'Untouchable', desc: 'Reach level 10 without dying', category: 'combat',
    target: 10, progress: (s) => (L(s).deaths === 0 ? Math.min(10, characterLevel(s)) : 0), reward: { regret: 2 },
  },
  {
    id: 'deathless_40', name: 'Charmed Life', desc: 'Reach level 40 without dying', category: 'combat',
    target: 40, progress: (s) => (L(s).deaths === 0 ? Math.min(40, characterLevel(s)) : 0), reward: { divine: 1 }, perks: { stats: { lifePct: 3 } },
  },
  { id: 'deaths_10', name: 'Hard Lessons', desc: 'Die 10 times. Every one taught you something', category: 'combat', target: 10, progress: (s) => L(s).deaths, reward: { regret: 2 } },
  { id: 'flask_100', name: 'Bottoms Up', desc: 'Drink 100 flasks', category: 'combat', target: 100, progress: (s) => L(s).flasksDrunk },
  { id: 'flask_1000', name: 'Iron Stomach', desc: 'Drink 1,000 flasks', category: 'combat', target: 1000, progress: (s) => L(s).flasksDrunk, reward: { instill: 1 } },
  { id: 'flask_10000', name: 'Bottomless', desc: 'Drink 10,000 flasks', category: 'combat', target: 10000, progress: (s) => L(s).flasksDrunk, reward: { instill: 3 }, perks: { stats: { flaskCharges: 5 } } },
  { id: 'looter_1000', name: 'Magpie', desc: 'Pick up 1,000 items', category: 'combat', target: 1000, progress: (s) => L(s).itemsLooted, reward: { augment: 10 } },
  { id: 'looter_10000', name: 'Hoarder', desc: 'Pick up 10,000 items', category: 'combat', target: 10000, progress: (s) => L(s).itemsLooted, perks: { stashTabs: 1 } },

  // ---------- bosses ----------
  { id: 'boss_1', name: 'Giant Slayer', desc: 'Defeat a boss', category: 'bosses', target: 1, progress: (s) => L(s).bossKills, reward: { regal: 1 } },
  { id: 'boss_10', name: 'Boss Hunter', desc: 'Defeat 10 bosses', category: 'bosses', target: 10, progress: (s) => L(s).bossKills, reward: { regal: 2 } },
  { id: 'boss_100', name: 'Headhunter', desc: 'Defeat 100 bosses', category: 'bosses', target: 100, progress: (s) => L(s).bossKills, reward: { exalted: 1 } },
  { id: 'boss_500', name: 'Kingslayer', desc: 'Defeat 500 bosses', category: 'bosses', target: 500, progress: (s) => L(s).bossKills, reward: { divine: 2 }, perks: { stats: { itemRarity: 2 } } },
  ...HARD_BOSSES.map((b): AchievementDef => ({
    id: `hard_${b.id}`, name: BOSS_TITLES[`hard_${b.id}`] ?? b.name, desc: `Defeat the Hard Boss ${b.name}`, category: 'bosses', act: 6,
    target: 1, progress: (s) => beat(s, b.zoneId), reward: { divine: 1, exalted: 1 },
  })),
  {
    id: 'hard_all', name: 'Trophy Taker', desc: 'Defeat all five Hard Bosses', category: 'bosses', act: 6,
    target: HARD_BOSSES.length, progress: (s) => HARD_BOSSES.filter((b) => s.bossesDefeated.includes(b.zoneId)).length,
    unique: 'trophy_takers_stride', perks: { atlasPoints: 1 },
  },
  ...UBER_BOSSES.map((b): AchievementDef => ({
    id: b.zoneId, name: BOSS_TITLES[b.zoneId] ?? b.name, desc: `Defeat the Uber Boss ${b.name}`, category: 'bosses', act: 6,
    target: 1, progress: (s) => beat(s, b.zoneId), reward: { divine: 3 },
  })),
  {
    id: 'uber_all', name: 'Nothing Left to Fear', desc: 'Defeat all three Uber Bosses', category: 'bosses', act: 6,
    target: UBER_BOSSES.length, progress: (s) => UBER_BOSSES.filter((b) => s.bossesDefeated.includes(b.zoneId)).length,
    unique: 'crown_of_the_unmade', perks: { passivePoints: 1 },
  },

  // ---------- maps ----------
  { id: 'map_1', name: 'Through the Portal', desc: 'Clear a Map', category: 'maps', act: 6, target: 1, progress: (s) => s.maps.tally.runs, reward: { chaos: 2 } },
  { id: 'maps_25', name: 'Regular', desc: 'Clear 25 Maps', category: 'maps', act: 6, target: 25, progress: (s) => s.maps.tally.runs, reward: { chaos: 5 } },
  { id: 'maps_100', name: 'Atlas Runner', desc: 'Clear 100 Maps', category: 'maps', act: 6, target: 100, progress: (s) => s.maps.tally.runs, reward: { exalted: 1 }, perks: { stats: { itemRarity: 2 } } },
  { id: 'maps_500', name: 'Wanderer of Worlds', desc: 'Clear 500 Maps', category: 'maps', act: 6, target: 500, progress: (s) => s.maps.tally.runs, reward: { divine: 2 }, perks: { offlineHours: 1 } },
  { id: 'maps_1000', name: 'Endless Road', desc: 'Clear 1,000 Maps', category: 'maps', act: 6, target: 1000, progress: (s) => s.maps.tally.runs, reward: { divine: 3 }, perks: { atlasPoints: 1 } },
  { id: 'map_tier_5', name: 'Halfway Out', desc: 'Clear a Tier 5 Map', category: 'maps', act: 6, target: 5, progress: (s) => s.maps.highestTier ?? 0, reward: { exalted: 1 } },
  { id: 'map_tier_8', name: 'Red Skies', desc: 'Clear a Tier 8 Map', category: 'maps', act: 6, target: 8, progress: (s) => s.maps.highestTier ?? 0, reward: { divine: 1 } },
  { id: 'map_tier_10', name: 'Edge of the Atlas', desc: 'Clear a Tier 10 Map', category: 'maps', act: 6, target: 10, progress: (s) => s.maps.highestTier ?? 0, reward: { divine: 2 }, perks: { atlasPoints: 1 } },
  { id: 'doomed_1', name: 'Marked', desc: 'Clear Doomed Map I', category: 'maps', act: 6, target: 1, progress: (s) => L(s).doomedBest ?? 0, reward: { divine: 1 } },
  { id: 'doomed_3', name: 'Deeper Doom', desc: 'Clear Doomed Map III', category: 'maps', act: 6, target: 3, progress: (s) => L(s).doomedBest ?? 0, reward: { divine: 2 } },
  { id: 'doomed_5', name: 'Doom Eater', desc: 'Clear Doomed Map V', category: 'maps', act: 6, target: 5, progress: (s) => L(s).doomedBest ?? 0, reward: { divine: 3 }, perks: { atlasPoints: 1 } },
  { id: 'unique_map_1', name: 'Off the Charts', desc: 'Clear a Unique Map', category: 'maps', act: 6, target: 1, progress: (s) => (L(s).uniqueMaps ?? []).length, reward: { exalted: 1 } },
  {
    id: 'unique_maps_all', name: 'Collector of Places', desc: `Clear all ${UNIQUE_MAPS.length} Unique Maps`, category: 'maps', act: 6,
    target: UNIQUE_MAPS.length, progress: (s) => (L(s).uniqueMaps ?? []).filter((id) => UNIQUE_MAPS.some((m) => m.id === id)).length,
    reward: { divine: 2 }, perks: { stats: { itemRarity: 3 } },
  },

  // ---------- crafting & loot ----------
  { id: 'crafter_25', name: 'Apprentice Crafter', desc: 'Use 25 orbs on items', category: 'crafting', target: 25, progress: (s) => L(s).orbsUsed, reward: { transmute: 5 } },
  { id: 'crafter_250', name: 'Master Crafter', desc: 'Use 250 orbs on items', category: 'crafting', target: 250, progress: (s) => L(s).orbsUsed, reward: { alchemy: 3 } },
  { id: 'crafter_2500', name: 'Orb Alchemist', desc: 'Use 2,500 orbs on items', category: 'crafting', target: 2500, progress: (s) => L(s).orbsUsed, reward: { divine: 1, exalted: 1 } },
  { id: 'bench_10', name: 'Bench Regular', desc: 'Make 10 bench crafts', category: 'crafting', target: 10, progress: (s) => L(s).benchCrafts, reward: { regal: 1 } },
  { id: 'bench_100', name: 'Bench Master', desc: 'Make 100 bench crafts', category: 'crafting', target: 100, progress: (s) => L(s).benchCrafts, reward: { exalted: 1 } },
  { id: 'salvager_50', name: 'Scrapper', desc: 'Salvage 50 items', category: 'crafting', target: 50, progress: (s) => L(s).salvaged, reward: { augment: 5 } },
  { id: 'salvager_1000', name: 'Scrapyard', desc: 'Salvage 1,000 items', category: 'crafting', target: 1000, progress: (s) => L(s).salvaged, reward: { chaos: 3 } },
  { id: 'rare_find', name: 'Something Shiny', desc: 'Find a rare item', category: 'crafting', target: 1, progress: (s) => L(s).raresFound, reward: { alchemy: 1 } },
  { id: 'rare_find_1000', name: 'Glitter Everywhere', desc: 'Find 1,000 rare items', category: 'crafting', target: 1000, progress: (s) => L(s).raresFound, reward: { exalted: 1 }, perks: { stats: { itemRarity: 2 } } },
  { id: 'unique_find', name: 'Legendary', desc: 'Find a unique item', category: 'crafting', target: 1, progress: (s) => L(s).uniquesFound, reward: { chaos: 1 } },
  { id: 'unique_5', name: 'Collector', desc: 'Find 5 unique items', category: 'crafting', target: 5, progress: (s) => L(s).uniquesFound, reward: { divine: 1 } },
  { id: 'unique_25', name: 'Curator', desc: 'Find 25 unique items', category: 'crafting', target: 25, progress: (s) => L(s).uniquesFound, reward: { divine: 1 }, perks: { stashTabs: 1 } },
  { id: 'unique_100', name: 'Museum Piece', desc: 'Find 100 unique items', category: 'crafting', target: 100, progress: (s) => L(s).uniquesFound, reward: { divine: 3 }, perks: { stats: { itemRarity: 3 } } },
  { id: 'uniques_worn_3', name: 'One of a Kind, Three Times', desc: 'Wear 3 unique items at once', category: 'crafting', target: 3, progress: uniquesWorn, reward: { chaos: 3 } },

  // ---------- life skills ----------
  { id: 'total_50', name: 'Jack of All Trades', desc: 'Reach a total life skill level of 50', category: 'skilling', target: 50, progress: totalSkillLevel, reward: { gold: 500 } },
  { id: 'total_150', name: 'Artisan', desc: 'Reach a total life skill level of 150', category: 'skilling', target: 150, progress: totalSkillLevel, reward: { expansion: 1 } },
  { id: 'total_300', name: 'Guildmaster', desc: 'Reach a total life skill level of 300', category: 'skilling', target: 300, progress: totalSkillLevel, reward: { exalted: 1 }, perks: { stashTabs: 1 } },
  { id: 'total_500', name: 'Polymath', desc: 'Reach a total life skill level of 500', category: 'skilling', target: 500, progress: totalSkillLevel, reward: { divine: 2 }, perks: { offlineHours: 1, stats: { skillSpeed: 3 } } },
  { id: 'total_800', name: 'Master of Every Craft', desc: 'Reach a total life skill level of 800', category: 'skilling', target: 800, progress: totalSkillLevel, unique: 'journeymans_satchel' },
  { id: 'skill_99', name: 'Ninety-Nine', desc: 'Reach level 99 in any life skill', category: 'skilling', target: 99, progress: topSkillLevel, reward: { divine: 2 }, perks: { stats: { skillXp: 5 } } },
  ...SKILL_FIFTY.map(([k, name, act]): AchievementDef => ({
    id: `skill_50_${k}`, name, desc: `Reach ${SKILL_NAME[k]} level 50`, category: 'skilling', act,
    target: 50, progress: skillLevel(k), reward: { chaos: 3 }, perks: { stats: { skillXp: 1 } },
  })),
  { id: 'gatherer_1000', name: 'Stockpile', desc: 'Gather 1,000 resources', category: 'skilling', target: 1000, progress: (s) => L(s).gathered, reward: { gold: 300 } },
  { id: 'gatherer_25000', name: 'Warehouse', desc: 'Gather 25,000 resources', category: 'skilling', target: 25000, progress: (s) => L(s).gathered, reward: { exalted: 1 }, perks: { stats: { skillSpeed: 2 } } },
  { id: 'smith_100', name: 'Anvil Rhythm', desc: 'Smith 100 items', category: 'skilling', target: 100, progress: (s) => L(s).itemsSmithed, reward: { gold: 500 } },
  { id: 'smith_1000', name: 'Thousand Hammers', desc: 'Smith 1,000 items', category: 'skilling', target: 1000, progress: (s) => L(s).itemsSmithed, reward: { exalted: 1 } },
  { id: 'brewer_25', name: 'Home Brew', desc: 'Brew 25 flasks', category: 'skilling', target: 25, progress: (s) => L(s).flasksBrewed, reward: { augment: 5 } },
  { id: 'brewer_250', name: 'Master Brewer', desc: 'Brew 250 flasks', category: 'skilling', target: 250, progress: (s) => L(s).flasksBrewed, reward: { instill: 2 }, perks: { stats: { flaskEffect: 3 } } },
  { id: 'heist_10', name: 'Inside Job', desc: 'Finish 10 Heist jobs', category: 'skilling', target: 10, progress: (s) => s.heist.tally.jobs, reward: { chaos: 2 } },
  { id: 'heist_100', name: 'Master Thief', desc: 'Finish 100 Heist jobs', category: 'skilling', target: 100, progress: (s) => s.heist.tally.jobs, reward: { divine: 1 }, perks: { stats: { goldFind: 5 } } },
  { id: 'expedition_25', name: 'Field Notes', desc: 'Make 25 Expedition finds', category: 'skilling', act: 4, target: 25, progress: (s) => s.expedition.tally.finds, reward: { chaos: 2 } },
  { id: 'expedition_250', name: 'Lost History', desc: 'Make 250 Expedition finds', category: 'skilling', act: 4, target: 250, progress: (s) => s.expedition.tally.finds, reward: { divine: 1 } },
  { id: 'meals_50', name: 'Well Fed', desc: 'Eat 50 meals', category: 'skilling', act: 5, target: 50, progress: (s) => L(s).mealsEaten, reward: { chaos: 2 } },
  { id: 'meals_500', name: 'Second Breakfast', desc: 'Eat 500 meals', category: 'skilling', act: 5, target: 500, progress: (s) => L(s).mealsEaten, reward: { exalted: 1 }, perks: { offlineHours: 1 } },
  { id: 'maps_drawn_25', name: 'Surveyor', desc: 'Draw 25 maps', category: 'skilling', act: 6, target: 25, progress: (s) => L(s).mapsDrawn, reward: { chaos: 2 } },
  { id: 'maps_drawn_250', name: 'Mapped to the Edge', desc: 'Draw 250 maps', category: 'skilling', act: 6, target: 250, progress: (s) => L(s).mapsDrawn, reward: { exalted: 1 } },

  // ---------- character ----------
  { id: 'level_10', name: 'Seasoned', desc: 'Reach character level 10', category: 'character', target: 10, progress: (s) => characterLevel(s), reward: { regret: 3 } },
  { id: 'level_25', name: 'Veteran', desc: 'Reach character level 25', category: 'character', target: 25, progress: (s) => characterLevel(s), reward: { regal: 2 } },
  { id: 'level_50', name: 'Hardened', desc: 'Reach character level 50', category: 'character', target: 50, progress: (s) => characterLevel(s), reward: { exalted: 1 }, perks: { offlineHours: 1 } },
  { id: 'level_70', name: 'Champion', desc: 'Reach character level 70', category: 'character', target: 70, progress: (s) => characterLevel(s), reward: { divine: 1 }, perks: { stats: { charXp: 3 } } },
  { id: 'level_90', name: 'Paragon', desc: 'Reach character level 90', category: 'character', target: 90, progress: (s) => characterLevel(s), reward: { divine: 3 }, perks: { passivePoints: 1 } },
  { id: 'level_100', name: 'The Summit', desc: 'Reach character level 100', category: 'character', target: 100, progress: (s) => characterLevel(s), reward: { divine: 5 }, perks: { stats: { allRes: 3 } } },
  {
    id: 'keystone', name: 'Defining Choice', desc: 'Allocate a keystone', category: 'character', target: 1,
    progress: (s) => nodeCount(s, (id) => PASSIVE_BY_ID[id]?.kind === 'keystone'), reward: { regret: 1 },
  },
  {
    id: 'forbidden', name: 'Forbidden Knowledge', desc: 'Allocate a Forbidden keystone', category: 'character', target: 1,
    progress: (s) => nodeCount(s, (id) => PASSIVE_BY_ID[id]?.kind === 'keystone' && PASSIVE_BY_ID[id]?.region === 'forbidden'), reward: { divine: 1 },
  },
  {
    id: 'doomed_gate', name: 'Through the Doomed Gate', desc: 'Allocate a Doomed passive', category: 'character', target: 1,
    progress: (s) => nodeCount(s, (id) => PASSIVE_BY_ID[id]?.kind === 'doomed' || id.startsWith('doomed_')), reward: { divine: 1 },
  },
  {
    id: 'mastery_5', name: 'Specialist', desc: 'Allocate 5 masteries', category: 'character', target: 5,
    progress: (s) => Object.keys(s.masteries).length, reward: { regret: 2 },
  },
  {
    id: 'mastery_15', name: 'Grand Specialist', desc: 'Allocate 15 masteries', category: 'character', target: 15,
    progress: (s) => Object.keys(s.masteries).length, reward: { regret: 5 },
  },
  { id: 'full_bar', name: 'Arsenal', desc: 'Fill all 6 skill bar slots', category: 'character', target: 6, progress: (s) => s.skillBar.filter(Boolean).length, reward: { expansion: 1 } },
  { id: 'gem_20', name: 'Perfected', desc: 'Raise a skill gem on your bar to level 20', category: 'character', target: 20, progress: topGemLevel, reward: { divine: 1 } },

  // ---------- challenge modes ----------
  {
    id: 'exile_act_1', name: 'Nothing to Lose', desc: 'Complete Act 1 as an Exile', category: 'challenge',
    target: 1, progress: (s) => (s.character.classId === 'exile' ? actDone(s, 1) : 0), reward: { regal: 2 },
  },
  {
    id: 'exile_bare', name: 'Nothing But Will', desc: 'Defeat Ysolde as an Exile with no unique equipped', category: 'challenge',
    target: 1, progress: (s) => L(s).exileBareKills ?? 0, reward: { exalted: 1 },
  },
  {
    id: 'exile_act_6', name: 'Nobody From Nowhere', desc: 'Complete all six acts as an Exile', category: 'challenge', act: 6,
    target: 1, progress: (s) => (s.character.classId === 'exile' ? actDone(s, 6) : 0), reward: { divine: 3 },
  },
  {
    id: 'hc_act_1', name: 'One Life', desc: 'Complete Act 1 on a Hardcore character', category: 'challenge',
    target: 1, progress: (s) => (hardcore(s) ? actDone(s, 1) : 0), reward: { exalted: 1 },
  },
  {
    id: 'hc_act_3', name: 'Still Breathing', desc: 'Complete Act 3 on a Hardcore character', category: 'challenge', act: 3,
    target: 1, progress: (s) => (hardcore(s) ? actDone(s, 3) : 0), reward: { divine: 1 }, perks: { stats: { allRes: 3 } },
  },
  {
    id: 'hc_act_6', name: 'Ironvow', desc: 'Complete all six acts on a Hardcore character', category: 'challenge', act: 6,
    target: 1, progress: (s) => (hardcore(s) ? actDone(s, 6) : 0), unique: 'ironvow',
  },
  {
    id: 'hc_map_tier_10', name: 'No Second Chances', desc: 'Clear a Tier 10 Map on a Hardcore character', category: 'challenge', act: 6,
    target: 10, progress: (s) => (hardcore(s) ? s.maps.highestTier ?? 0 : 0), reward: { divine: 3 }, perks: { stats: { lifePct: 3 } },
  },
  {
    id: 'ssf_act_3', name: 'On My Own', desc: 'Complete Act 3 on a Solo Self-Found character', category: 'challenge', act: 3,
    target: 1, progress: (s) => (ssf(s) ? actDone(s, 3) : 0), reward: { divine: 1 },
  },
  {
    id: 'ssf_act_6', name: 'Self-Made', desc: 'Complete all six acts on a Solo Self-Found character', category: 'challenge', act: 6,
    target: 1, progress: (s) => (ssf(s) ? actDone(s, 6) : 0), unique: 'self_made',
  },
  {
    id: 'classic_act_3', name: 'Sword and Nothing Else', desc: 'Complete Act 3 on a Classic character', category: 'challenge', act: 3,
    target: 1, progress: (s) => (classic(s) ? actDone(s, 3) : 0), reward: { divine: 1 },
  },
  {
    id: 'classic_act_6', name: 'The Old Way', desc: 'Complete all six acts on a Classic character', category: 'challenge', act: 6,
    target: 1, progress: (s) => (classic(s) ? actDone(s, 6) : 0), unique: 'old_way_grips',
  },
  {
    id: 'hcssf_act_6', name: 'Alone, Unbroken', desc: 'Complete all six acts on a Hardcore Solo Self-Found character', category: 'challenge', act: 6,
    target: 1, progress: (s) => (hardcore(s) && ssf(s) ? actDone(s, 6) : 0), reward: { divine: 3 }, perks: { passivePoints: 1, offlineHours: 1 },
  },
];

/** Achievements in play: those of acts that are not out yet stay hidden. */
export const ACHIEVEMENTS: AchievementDef[] = ALL.filter((a) => !a.act || actOpen(a.act));

/** Every achievement, open or not, so one earned in a preview build still has a name. */
export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ALL.map((a) => [a.id, a]));

export const CATEGORY_NAMES: Record<AchievementCategory, string> = {
  campaign: 'Campaign',
  combat: 'Combat',
  bosses: 'Bosses',
  maps: 'Maps',
  crafting: 'Crafting & loot',
  skilling: 'Life skills',
  character: 'Character',
  challenge: 'Challenge modes',
};

export interface PerkTotals {
  passivePoints: number;
  offlineHours: number;
  atlasPoints: number;
  stashTabs: number;
  stats: Partial<Record<StatKey, number>>;
}

/** What a set of earned achievements adds up to. */
export function perkTotals(ids: Iterable<string>): PerkTotals {
  const out: PerkTotals = { passivePoints: 0, offlineHours: 0, atlasPoints: 0, stashTabs: 0, stats: {} };
  for (const id of new Set(ids)) {
    const p = ACHIEVEMENT_BY_ID[id]?.perks;
    if (!p) continue;
    out.passivePoints += p.passivePoints ?? 0;
    out.offlineHours += p.offlineHours ?? 0;
    out.atlasPoints += p.atlasPoints ?? 0;
    out.stashTabs += p.stashTabs ?? 0;
    for (const [k, v] of Object.entries(p.stats ?? {})) out.stats[k as StatKey] = (out.stats[k as StatKey] ?? 0) + (v ?? 0);
  }
  return out;
}

/** Whether an achievement's reward belongs to the realm (shared stash or Atlas), so it's added once per realm. */
export const hasRealmPerk = (a: AchievementDef): boolean => !!(a.perks?.atlasPoints || a.perks?.stashTabs);
