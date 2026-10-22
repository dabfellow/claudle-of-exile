import { characterLevel } from '../engine/character';
import type { GameState } from '../engine/types';
import { levelOf } from '../engine/xp';
import { PASSIVE_BY_ID } from './passiveTree';
import { ZONES } from './zones';

export type AchievementCategory = 'combat' | 'crafting' | 'flasks' | 'skilling' | 'character';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  category: AchievementCategory;
  target: number;
  progress: (s: GameState) => number;
  /** currency/material rewards; bench recipe unlocks are listed on the recipes themselves */
  reward?: Record<string, number>;
}

const SKILLING = ['mining', 'woodcutting', 'harvesting', 'smithing', 'alchemy'] as const;
const totalSkillLevel = (s: GameState) => SKILLING.reduce((a, k) => a + levelOf(k, s.skills[k]), 0);
const L = (s: GameState) => s.lifetime;

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---------- combat ----------
  { id: 'slayer_100', name: 'Cull the Drowned', desc: 'Slay 100 monsters', category: 'combat', target: 100, progress: (s) => L(s).kills, reward: { gold: 100 } },
  { id: 'slayer_1000', name: 'Thousand Cuts', desc: 'Slay 1,000 monsters', category: 'combat', target: 1000, progress: (s) => L(s).kills },
  { id: 'slayer_10000', name: 'Exterminator', desc: 'Slay 10,000 monsters', category: 'combat', target: 10000, progress: (s) => L(s).kills, reward: { chaos: 2 } },
  { id: 'boss_1', name: 'Giant Slayer', desc: 'Defeat a boss', category: 'combat', target: 1, progress: (s) => L(s).bossKills, reward: { regal: 1 } },
  { id: 'boss_10', name: 'Boss Hunter', desc: 'Defeat 10 bosses', category: 'combat', target: 10, progress: (s) => L(s).bossKills },
  {
    id: 'act_1', name: 'The Tide Turns', desc: 'Defeat Ysolde, the Drowned Queen, and complete Act 1', category: 'combat',
    target: 1, progress: (s) => (s.bossesDefeated.includes('sanctum') ? 1 : 0), reward: { divine: 1, regal: 2 },
  },
  {
    id: 'conqueror', name: 'Conqueror of the Coast', desc: "Defeat every area's boss", category: 'combat',
    target: ZONES.length, progress: (s) => s.bossesDefeated.length, reward: { exalted: 1 },
  },
  {
    id: 'deathless', name: 'Untouchable', desc: 'Reach level 10 without dying', category: 'combat',
    target: 10, progress: (s) => (L(s).deaths === 0 ? Math.min(10, characterLevel(s)) : 0), reward: { regret: 2 },
  },

  // ---------- crafting ----------
  { id: 'crafter_25', name: 'Apprentice Crafter', desc: 'Use 25 orbs on items', category: 'crafting', target: 25, progress: (s) => L(s).orbsUsed },
  { id: 'crafter_250', name: 'Master Crafter', desc: 'Use 250 orbs on items', category: 'crafting', target: 250, progress: (s) => L(s).orbsUsed },
  { id: 'bench_10', name: 'Bench Regular', desc: 'Make 10 bench crafts', category: 'crafting', target: 10, progress: (s) => L(s).benchCrafts },
  { id: 'salvager_50', name: 'Scrapper', desc: 'Salvage 50 items', category: 'crafting', target: 50, progress: (s) => L(s).salvaged },
  { id: 'rare_find', name: 'Something Shiny', desc: 'Find a rare item', category: 'crafting', target: 1, progress: (s) => L(s).raresFound, reward: { alchemy: 1 } },
  { id: 'unique_find', name: 'Legendary', desc: 'Find a unique item', category: 'crafting', target: 1, progress: (s) => L(s).uniquesFound },
  { id: 'unique_5', name: 'Collector', desc: 'Find 5 unique items', category: 'crafting', target: 5, progress: (s) => L(s).uniquesFound, reward: { divine: 1 } },

  // ---------- flasks ----------
  { id: 'flask_100', name: 'Bottoms Up', desc: 'Drink 100 flasks', category: 'flasks', target: 100, progress: (s) => L(s).flasksDrunk },
  { id: 'flask_1000', name: 'Iron Stomach', desc: 'Drink 1,000 flasks', category: 'flasks', target: 1000, progress: (s) => L(s).flasksDrunk, reward: { instill: 1 } },
  { id: 'brewer_25', name: 'Home Brew', desc: 'Brew 25 flasks', category: 'flasks', target: 25, progress: (s) => L(s).flasksBrewed, reward: { augment: 5 } },

  // ---------- skilling ----------
  { id: 'total_50', name: 'Jack of All Trades', desc: 'Reach a total skill level of 50', category: 'skilling', target: 50, progress: totalSkillLevel },
  { id: 'total_150', name: 'Artisan', desc: 'Reach a total skill level of 150', category: 'skilling', target: 150, progress: totalSkillLevel, reward: { expansion: 1 } },
  { id: 'smith_100', name: 'Anvil Rhythm', desc: 'Smith 100 items', category: 'skilling', target: 100, progress: (s) => L(s).itemsSmithed },
  { id: 'gatherer_1000', name: 'Stockpile', desc: 'Gather 1,000 resources', category: 'skilling', target: 1000, progress: (s) => L(s).gathered, reward: { gold: 300 } },

  // ---------- character ----------
  { id: 'level_10', name: 'Seasoned', desc: 'Reach character level 10', category: 'character', target: 10, progress: (s) => characterLevel(s), reward: { regret: 3 } },
  { id: 'level_25', name: 'Veteran', desc: 'Reach character level 25', category: 'character', target: 25, progress: (s) => characterLevel(s) },
  {
    id: 'keystone', name: 'Defining Choice', desc: 'Allocate a keystone', category: 'character', target: 1,
    progress: (s) => s.passives.filter((id) => PASSIVE_BY_ID[id]?.kind === 'keystone').length, reward: { regret: 1 },
  },
  {
    id: 'mastery_5', name: 'Specialist', desc: 'Allocate 5 masteries', category: 'character', target: 5,
    progress: (s) => Object.keys(s.masteries).length, reward: { regret: 2 },
  },
  { id: 'full_bar', name: 'Arsenal', desc: 'Fill all 6 skill bar slots', category: 'character', target: 6, progress: (s) => s.skillBar.filter(Boolean).length, reward: { expansion: 1 } },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export const CATEGORY_NAMES: Record<AchievementCategory, string> = {
  combat: 'Combat',
  crafting: 'Crafting & loot',
  flasks: 'Flasks',
  skilling: 'Skilling',
  character: 'Character',
};
