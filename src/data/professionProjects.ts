import type { Item, SkillId } from '../engine/types';

export type ProjectReward =
  | { category: 'chart'; id: string }
  | { category: 'progress'; materials: Record<string, number> }
  | { category: 'equipment'; baseId: string; ilvl: number; rarity: Item['rarity']; name?: string; uniqueId?: string; fixedSuffixes?: Item['suffixes']; perks?: MasterworkPerk[] }
  | { category: 'flask'; flaskId: string; ilvl: number; rarity: 'unique'; name?: string; uniqueId?: string };

/**
 * What a masterwork comes out with on top of its six Tier 1 modifiers, using the endgame crafting marks the item
 * already understands: a Void Slot (a seventh Tier 1 modifier), a Doom Implicit, or one modifier raised to Doom Tier.
 */
export type MasterworkPerk = 'voidSlot' | 'doomImplicit' | 'doomTier';

export interface ProfessionRequirement {
  skill: SkillId;
  level: number;
  /** Every one of these skills must be at least this level too (masterworks span several skills). */
  skillLevels?: Partial<Record<SkillId, number>>;
  masteryRequirement?: { id: string; level: number; name: string };
  accomplishments?: string[];
  station?: { id: 'forge' | 'smelter' | 'woodcrafting_bench' | 'alchemy_table' | 'rune_board'; level: number };
}

export interface ProfessionProject extends ProfessionRequirement {
  category?: 'masteryBatch' | 'masterwork';
  /** masterworks: how far up the atelier it sits */
  rank?: MasterworkRank;
  id: string;
  version: number;
  name: string;
  inputs: Record<string, number>;
  durationMs: number;
  xp: number;
  workCycles?: number;
  reward: ProjectReward;
  discovery?: string;
  repeatable?: boolean;
  /** An inscription may escrow one inventory item. It is unavailable to every other item operation. */
  baseId?: string;
  baseIds?: string[];
  baseMinIlvl?: number;
  baseNonUnique?: boolean;
  sources: { label: string; skill: SkillId }[];
  use: string;
}

/** Foundation proof using only existing smelting materials/rates; expansion recipes belong to later phases. */
export const PROFESSION_PROJECTS: ProfessionProject[] = [{
  id: 'copper_supply', version: 1, name: 'Copper Supply', skill: 'smithing', level: 1,
  category: 'masteryBatch', masteryRequirement: { id: 'task.smelt_copper', level: 15, name: 'Smelt Copper Bars' },
  station: { id: 'forge', level: 1 }, inputs: { copper_ore: 25 }, durationMs: 15_000, xp: 12, workCycles: 5,
  reward: { category: 'progress', materials: { copper_bar: 5 } }, repeatable: true,
  discovery: 'smithing_copper_supply',
  sources: [{ label: 'Copper Vein supplies Copper Ore', skill: 'mining' }],
  use: 'Five Copper Bars for equipment and Forge upgrades. Same base cost, time and XP as five smelts; no yield or conservation bonuses.',
}];

export type MasterworkRank = 'adept' | 'master' | 'grandmaster';

export const MASTERWORK_RANKS: Record<MasterworkRank, { name: string; blurb: string }> = {
  adept: { name: 'Adept', blurb: 'Six Tier 1 modifiers.' },
  master: { name: 'Master', blurb: 'Six Tier 1 modifiers and an endgame mark.' },
  grandmaster: { name: 'Grandmaster', blurb: 'Seven Tier 1 modifiers through a Void Slot, and an endgame mark.' },
};

/** The Masterworks atelier opens once this many life skills reach this level. */
export const MASTERY_UNLOCK = { skills: 5, level: 25 };

const HOUR = 3_600_000;

interface MasterworkSpec {
  id: string;
  name: string;
  rank: MasterworkRank;
  /** the craft that assembles it: gets the XP */
  skill: SkillId;
  skillLevels: Partial<Record<SkillId, number>>;
  inputs: Record<string, number>;
  baseId: string;
  perks?: MasterworkPerk[];
  hours: number;
  xp: number;
  sources: { label: string; skill: SkillId }[];
  lore: string;
}

/**
 * The ten masterworks (docs/MASTERWORKS.md). Each needs at least three level 60+ gathering finds from different
 * gathering skills, at least one production good, and a rare drop, and gives a rare item on a masterwork base:
 * every modifier on it is Tier 1, now and after every reroll.
 */
const MASTERWORK_SPECS: MasterworkSpec[] = [
  {
    id: 'mw_starforged_blade', name: 'Starforged Blade', rank: 'adept', skill: 'smithing', baseId: 'mw_starforged_blade',
    skillLevels: { mining: 60, woodcutting: 60, harvesting: 60, smithing: 60 },
    inputs: { star_ore: 600, ancient_log: 500, star_bloom: 120, star_bar: 60, boss_trophy: 10 },
    hours: 2, xp: 2500,
    sources: [
      { label: 'Star Ore from Star seams', skill: 'mining' },
      { label: 'Ancient Logs from the Ancient woods', skill: 'woodcutting' },
      { label: 'Star Blooms, wild or grown', skill: 'harvesting' },
      { label: 'Star Bars smelted from Star Ore', skill: 'smelting' },
      { label: 'Boss Trophy drops from act and map bosses', skill: 'combat' },
    ],
    lore: 'Quenched in starlight and wrapped in ancient wood. It holds an edge the way the sky holds stars.',
  },
  {
    id: 'mw_glimmerweave_raiment', name: 'Glimmerweave Raiment', rank: 'adept', skill: 'tailoring', baseId: 'mw_glimmerweave_raiment',
    skillLevels: { harvesting: 68, astrology: 60, thieving: 65, tailoring: 60 },
    inputs: { glimmermoss: 150, gilded_stardust: 25, treasury_fragment: 150, moon_distillate: 12, prepared_glass: 10, guardian_trophy: 2 },
    hours: 2, xp: 2500,
    sources: [
      { label: 'Glimmermoss, wild or grown', skill: 'harvesting' },
      { label: 'Gilded Stardust while researching the sky', skill: 'astrology' },
      { label: 'Treasury Fragments from The Occult Treasury', skill: 'thieving' },
      { label: 'Moon Distillate and Prepared Glass at the Alchemy Table', skill: 'alchemy' },
      { label: 'Guardian Trophy drops from Guardian map bosses', skill: 'combat' },
    ],
    lore: 'Moss that remembers moonlight, stitched with thread pulled from a stolen star.',
  },
  {
    id: 'mw_ancientwood_longbow', name: 'Ancientwood Longbow', rank: 'adept', skill: 'woodcrafting', baseId: 'mw_ancientwood_longbow',
    skillLevels: { woodcutting: 65, harvesting: 60, mining: 60, sawmilling: 60, woodcrafting: 60 },
    inputs: { ancient_log: 600, ancient_resin: 40, star_bloom: 100, star_ore: 300, ancient_plank: 80, heartwood_frame: 3, divine: 2 },
    hours: 2, xp: 2500,
    sources: [
      { label: 'Ancient Logs and Ancient Resin from the Ancient woods', skill: 'woodcutting' },
      { label: 'Star Blooms, wild or grown', skill: 'harvesting' },
      { label: 'Star Ore from Star seams', skill: 'mining' },
      { label: 'Ancient Planks milled at the Sawmill', skill: 'sawmilling' },
      { label: 'Heartwood Frames assembled at the Forge', skill: 'smithing' },
      { label: 'Divine Orb drops, rare from monsters and heists', skill: 'combat' },
    ],
    lore: 'Strung with resin-soaked star-bloom fibre. It does not creak when drawn; it sighs.',
  },
  {
    id: 'mw_rimebound_crown', name: 'Rimebound Crown', rank: 'master', skill: 'gemcutting', baseId: 'mw_rimebound_crown',
    skillLevels: { astrology: 70, archaeology: 70, mining: 75, gemcutting: 70 },
    inputs: { gilded_stardust: 40, rime_relic_fragment: 60, rime_idol: 150, void_ore: 800, exceptional_crystal: 4, choir_glass: 1 },
    perks: ['doomTier'], hours: 4, xp: 5000,
    sources: [
      { label: 'Gilded Stardust while researching the sky', skill: 'astrology' },
      { label: 'The Rimebound Relic Fragment and Rime Idol finds from Rime digs', skill: 'archaeology' },
      { label: 'Void Ore from Void seams', skill: 'mining' },
      { label: 'Exceptional Crystals cut at the wheel', skill: 'gemcutting' },
      { label: 'Choir Glass from Mother Vael, the Last Choir', skill: 'combat' },
    ],
    lore: 'Dug from the Hollow Heart still frozen to its last king. The ice never melted; it just learned to fit.',
  },
  {
    id: 'mw_colossus_bulwark', name: 'Bulwark of the Colossus', rank: 'master', skill: 'smithing', baseId: 'mw_colossus_bulwark',
    skillLevels: { mining: 75, woodcutting: 75, archaeology: 80, smithing: 75 },
    inputs: { void_ore: 900, spirit_log: 700, sealed_relic: 1, giant_relic_fragment: 60, stone_alloy: 6, marrow_shard: 1 },
    perks: ['doomImplicit'], hours: 4, xp: 5000,
    sources: [
      { label: 'Void Ore from Void seams', skill: 'mining' },
      { label: 'Spirit Logs from the Spirit woods', skill: 'woodcutting' },
      { label: 'A Sealed Relic from The Sealed Reliquary, and The Giants Relic Fragment finds from Giant digs', skill: 'archaeology' },
      { label: 'Stone Alloy cast in the furnace', skill: 'smelting' },
      { label: 'Marrow Shard from Ossuar, the Hollow Mountain', skill: 'combat' },
    ],
    lore: 'A palm-plate pried off the Fallen Colossus and backed with spirit-wood. Something still pushes back.',
  },
  {
    id: 'mw_wraithstep_boots', name: 'Wraithstep Boots', rank: 'master', skill: 'tailoring', baseId: 'mw_wraithstep_boots',
    skillLevels: { harvesting: 84, thieving: 75, woodcutting: 75, tailoring: 75 },
    inputs: { wraithlily: 150, oath_fragment: 12, spirit_resin: 50, moon_distillate: 15, star_distillate: 3, black_pearl: 1 },
    perks: ['doomTier'], hours: 4, xp: 5000,
    sources: [
      { label: 'Wraithlilies, wild or grown', skill: 'harvesting' },
      { label: 'Oath Fragments from The Occult Treasury vaults', skill: 'thieving' },
      { label: 'Spirit Resin from the Spirit woods', skill: 'woodcutting' },
      { label: 'Moon and Star Distillate at the Alchemy Table', skill: 'alchemy' },
      { label: 'Black Pearl from The Undertow', skill: 'combat' },
    ],
    lore: 'Soled with pressed wraithlily. Whoever wears them leaves footprints a heartbeat after they have gone.',
  },
  {
    id: 'mw_twin_forge_gauntlets', name: 'Twin Forge Gauntlets', rank: 'master', skill: 'smelting', baseId: 'mw_twin_forge_gauntlets',
    skillLevels: { mining: 75, woodcutting: 70, harvesting: 68, smelting: 80 },
    inputs: { heartstone: 8, legend_heartwood: 2, glimmermoss: 150, kingsbronze: 2, wound_alloy: 4, throne_ash: 1 },
    perks: ['doomImplicit'], hours: 4, xp: 5000,
    sources: [
      { label: 'Heartstone from deep Delve caverns', skill: 'mining' },
      { label: 'Legend Heartwood from legendary giants', skill: 'woodcutting' },
      { label: 'Glimmermoss, wild or grown', skill: 'harvesting' },
      { label: 'Kingsbronze and Wound Alloy cast in the furnace', skill: 'smelting' },
      { label: 'Throne Ash from The Twin Regents', skill: 'combat' },
    ],
    lore: 'One hand cast in kingsbronze, one in wound alloy, both cooled in legend heartwood ash.',
  },
  {
    id: 'mw_converging_ring', name: 'Ring of Converging Stars', rank: 'grandmaster', skill: 'gemcutting', baseId: 'mw_converging_ring',
    skillLevels: { astrology: 85, mining: 90, harvesting: 84, gemcutting: 85 },
    inputs: { gilded_stardust: 80, world_ore: 1200, wraithlily: 200, convergence_crystal: 1, void_sigil: 1 },
    perks: ['voidSlot', 'doomImplicit'], hours: 8, xp: 10000,
    sources: [
      { label: 'Gilded Stardust while researching the sky', skill: 'astrology' },
      { label: 'World Ore from World seams', skill: 'mining' },
      { label: 'Wraithlilies, wild or grown', skill: 'harvesting' },
      { label: 'A Convergence Crystal polished at the wheel', skill: 'gemcutting' },
      { label: 'A Void Sigil from The Void Sovereign', skill: 'combat' },
    ],
    lore: 'Seven stars set in world-ore, each one a little closer to the others than the night allows.',
  },
  {
    id: 'mw_world_tree_amulet', name: 'Heart of the World Tree', rank: 'grandmaster', skill: 'woodcrafting', baseId: 'mw_world_tree_amulet',
    skillLevels: { woodcutting: 90, archaeology: 85, harvesting: 84, thieving: 75, sawmilling: 90, woodcrafting: 85 },
    inputs: { worldwood_log: 1200, legend_heartwood: 4, convergence_relic: 1, wraithlily: 150, oath_fragment: 20, worldwood_plank: 60, star_distillate: 6, exile_doom_sigil: 1 },
    perks: ['voidSlot', 'doomTier'], hours: 8, xp: 10000,
    sources: [
      { label: 'Worldwood Logs from the Worldwood grove, Legend Heartwood from legendary giants', skill: 'woodcutting' },
      { label: 'A Convergence Relic restored after the first Heart discovery', skill: 'archaeology' },
      { label: 'Wraithlilies, wild or grown', skill: 'harvesting' },
      { label: 'Oath Fragments from The Occult Treasury vaults', skill: 'thieving' },
      { label: 'Worldwood Planks milled at the Sawmill', skill: 'sawmilling' },
      { label: 'Star Distillate at the Alchemy Table', skill: 'alchemy' },
      { label: "An Exile's Doom Sigil from The First Exile", skill: 'combat' },
    ],
    lore: 'A knot of worldwood that still beats. Lay your ear against it and you can hear every forest at once.',
  },
  {
    id: 'mw_wanderers_staff', name: "The Wanderer's Staff", rank: 'grandmaster', skill: 'smelting', baseId: 'mw_wanderers_staff',
    skillLevels: { astrology: 90, archaeology: 75, mining: 75, cartography: 85, smelting: 85 },
    inputs: { gilded_stardust: 100, restored_taboo_tablet: 1, void_ore: 1000, moonsilver: 2, convergence_inscription: 1, crownless_sigil: 1, architect_doom_sigil: 1 },
    perks: ['voidSlot', 'doomImplicit'], hours: 8, xp: 10000,
    sources: [
      { label: 'Gilded Stardust while watching the Wanderer', skill: 'astrology' },
      { label: 'A Restored Taboo Tablet from the Imperial Adit', skill: 'archaeology' },
      { label: 'Void Ore from Void seams', skill: 'mining' },
      { label: 'Moonsilver cast in the furnace', skill: 'smelting' },
      { label: 'A Convergence Inscription prepared at the chart table', skill: 'cartography' },
      { label: "A Crownless Sigil from The Crownless, and an Architect's Doom Sigil from The Architect of Ruin", skill: 'combat' },
    ],
    lore: 'Every map of Wraeclast is drawn facing the Wanderer. This staff points the other way.',
  },
];

PROFESSION_PROJECTS.push(...MASTERWORK_SPECS.map((m): ProfessionProject => ({
  id: m.id, version: 1, name: m.name, category: 'masterwork', rank: m.rank,
  skill: m.skill, level: m.skillLevels[m.skill] ?? 1, skillLevels: m.skillLevels,
  inputs: m.inputs, durationMs: m.hours * HOUR, xp: m.xp, repeatable: true,
  reward: { category: 'equipment', baseId: m.baseId, ilvl: 86, rarity: 'rare', name: m.name, perks: m.perks },
  sources: m.sources, use: m.lore,
})));

export const MASTERWORKS = PROFESSION_PROJECTS.filter((p) => p.category === 'masterwork');

export const professionProject = (id: string) => PROFESSION_PROJECTS.find((p) => p.id === id);

export interface ProfessionTheme {
  title: string;
  singular: string;
  startLabel: string;
}

export const PROFESSION_THEMES: Record<SkillId, ProfessionTheme> = {
  smithing: {
    title: 'Forge Masterworks',
    singular: 'masterwork',
    startLabel: 'Begin masterwork',
  },
  smelting: {
    title: 'Foundry Castings',
    singular: 'casting',
    startLabel: 'Begin casting',
  },
  woodcrafting: {
    title: 'Woodcraft Carvings',
    singular: 'carving',
    startLabel: 'Begin carving',
  },
  tailoring: {
    title: 'Tailored Commissions',
    singular: 'commission',
    startLabel: 'Begin commission',
  },
  sawmilling: {
    title: 'Mill Orders',
    singular: 'order',
    startLabel: 'Begin order',
  },
  mining: {
    title: 'Mining Prospects',
    singular: 'prospect',
    startLabel: 'Begin prospect',
  },
  woodcutting: {
    title: 'Timberworks',
    singular: 'timberwork',
    startLabel: 'Begin timberwork',
  },
  harvesting: {
    title: 'Cultivations',
    singular: 'cultivation',
    startLabel: 'Begin cultivation',
  },
  alchemy: {
    title: 'Great Works',
    singular: 'great work',
    startLabel: 'Begin Great Work',
  },
  cooking: {
    title: 'Feasts & Banquets',
    singular: 'feast',
    startLabel: 'Prepare feast',
  },
  gemcutting: {
    title: 'Lapidary Works',
    singular: 'lapidary work',
    startLabel: 'Begin lapidary work',
  },
  cartography: {
    title: 'Survey Expeditions',
    singular: 'survey expedition',
    startLabel: 'Chart expedition',
  },
  runecarving: {
    title: 'Runic Inscriptions',
    singular: 'inscription',
    startLabel: 'Begin inscription',
  },
  thieving: {
    title: 'Underworld Schemes',
    singular: 'scheme',
    startLabel: 'Execute scheme',
  },
  agility: {
    title: 'Grand Courses',
    singular: 'course',
    startLabel: 'Begin course',
  },
  archaeology: {
    title: 'Relic Restorations',
    singular: 'restoration',
    startLabel: 'Restore relic',
  },
  astrology: {
    title: 'Star Readings',
    singular: 'reading',
    startLabel: 'Begin reading',
  },
  fishing: {
    title: 'Deep Expeditions',
    singular: 'expedition',
    startLabel: 'Begin expedition',
  },
  combat: {
    title: 'Campaigns',
    singular: 'campaign',
    startLabel: 'Begin campaign',
  },
};

export function professionTheme(skill: SkillId): ProfessionTheme {
  return (
    PROFESSION_THEMES[skill] ?? {
      title: 'Special Undertakings',
      singular: 'undertaking',
      startLabel: 'Begin undertaking',
    }
  );
}
