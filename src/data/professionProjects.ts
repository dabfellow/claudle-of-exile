import type { Item, SkillId } from '../engine/types';

export type ProjectReward =
  | { category: 'chart'; id: string }
  | { category: 'progress'; materials: Record<string, number> }
  | { category: 'equipment'; baseId: string; ilvl: number; rarity: Item['rarity']; name?: string; uniqueId?: string; fixedSuffixes?: Item['suffixes'] }
  | { category: 'flask'; flaskId: string; ilvl: number; rarity: 'unique'; name?: string; uniqueId?: string };

export interface ProfessionRequirement {
  skill: SkillId;
  level: number;
  masteryRequirement?: { id: string; level: number; name: string };
  accomplishments?: string[];
  station?: { id: 'forge' | 'smelter' | 'woodcrafting_bench' | 'alchemy_table' | 'rune_board'; level: number };
}

export interface ProfessionProject extends ProfessionRequirement {
  category?: 'masteryBatch';
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
}, {
  id: 'tool_mining', version: 1, name: "Prospector's Pick", skill: 'mining', level: 30,
  accomplishments: ['mining_work_100'], durationMs: 1_200_000, xp: 360, repeatable: true,
  inputs: { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 },
  reward: { category: 'equipment', baseId: 'profession_hammer', ilvl: 1, rarity: 'magic', name: "Prospector's Pick", fixedSuffixes: [{ affixId: 'profession_speed_mining', tier: 0, values: [8] }] },
  sources: [{ label: 'Mine Copper/Mithril and gather Rough Gems', skill: 'mining' }, { label: 'Smelt Copper/Mithril Bars', skill: 'smithing' }, { label: 'Cut Oak Planks', skill: 'woodcutting' }],
  use: 'One fixed magic tool: 8% increased Mining speed in the existing weapon slot. No combat bonus; one normal rune slot. Level 1 to equip. Other professions can supply the raw bars/planks. No automatic refining or task switching.',
}, {
  id: 'tool_woodcutting', version: 1, name: 'Heartwood Hatchet', skill: 'woodcutting', level: 30,
  accomplishments: ['woodcutting_work_100'], durationMs: 1_200_000, xp: 360, repeatable: true,
  inputs: { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 },
  reward: { category: 'equipment', baseId: 'profession_hammer', ilvl: 1, rarity: 'magic', name: 'Heartwood Hatchet', fixedSuffixes: [{ affixId: 'profession_speed_woodcutting', tier: 0, values: [8] }] },
  sources: [{ label: 'Mine Copper/Mithril and Rough Gems', skill: 'mining' }, { label: 'Smelt Copper/Mithril Bars', skill: 'smithing' }, { label: 'Cut and refine Oak Planks', skill: 'woodcutting' }],
  use: 'One fixed magic main-hand tool: 8% increased Woodcutting speed only. No combat bonus; level 1 to equip; one normal rune slot. Raw materials may come from other professions. No automatic task switching.',
}, {
  id: 'tool_harvesting', version: 1, name: "Seedkeeper's Sickle", skill: 'harvesting', level: 30,
  accomplishments: ['harvesting_work_100'], durationMs: 1_200_000, xp: 360, repeatable: true,
  inputs: { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 },
  reward: { category: 'equipment', baseId: 'profession_hammer', ilvl: 1, rarity: 'magic', name: "Seedkeeper's Sickle", fixedSuffixes: [{ affixId: 'profession_speed_harvesting', tier: 0, values: [8] }] },
  sources: [{ label: 'Mine Copper/Mithril and Rough Gems', skill: 'mining' }, { label: 'Smelt Copper/Mithril Bars', skill: 'smithing' }, { label: 'Cut and refine Oak Planks', skill: 'woodcutting' }],
  use: 'One fixed magic main-hand tool: 8% increased Foraging speed only. Level 1 to equip; one normal rune slot. Other professions may supply inputs. No automatic task switching.',
}, {
  id: 'tool_alchemy', version: 1, name: "Distiller's Stirrer", skill: 'alchemy', level: 30,
  accomplishments: ['alchemy_work_100'], durationMs: 1_200_000, xp: 360, repeatable: true,
  inputs: { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 },
  reward: { category: 'equipment', baseId: 'profession_hammer', ilvl: 1, rarity: 'magic', name: "Distiller's Stirrer", fixedSuffixes: [{ affixId: 'profession_speed_alchemy', tier: 0, values: [8] }] },
  sources: [{ label: 'Mine Copper/Mithril and Rough Gems', skill: 'mining' }, { label: 'Smelt Copper/Mithril Bars', skill: 'smithing' }, { label: 'Cut and refine Oak Planks', skill: 'woodcutting' }],
  use: 'One fixed magic main-hand tool: 8% increased Alchemy speed only. Level 1 to equip; one normal rune slot. Other professions may supply inputs. No automatic task switching.',
}, {
  id: 'tool_wayfarer_hammer', version: 1, name: "Wayfarer's Hammer", skill: 'smithing', level: 15,
  accomplishments: ['smithing_work_20'], station: { id: 'forge', level: 2 }, durationMs: 600_000, xp: 180, repeatable: true,
  inputs: { copper_bar: 10, iron_bar: 10, ash_plank: 5, oak_plank: 5 },
  reward: { category: 'equipment', baseId: 'profession_hammer', ilvl: 1, rarity: 'magic', name: "Wayfarer's Hammer", fixedSuffixes: [{ affixId: 'profession_speed_smithing', tier: 0, values: [8] }] },
  sources: [{ label: 'Mine Copper and Iron, then select smelting', skill: 'mining' }, { label: 'Cut Ash and Oak, then select plank refinement', skill: 'woodcutting' }],
  use: 'One fixed magic main-hand tool: 8% increased Smithing speed only. Level 1 to equip; one normal rune slot. Full listed costs, one tool, no conservation or doubled claims. No automatic task switching.',
}, {
  id: 'tool_smelter_tongs', version: 1, name: "Smelter's Tongs", skill: 'smelting', level: 15,
  accomplishments: ['smelting_work_20'], station: { id: 'smelter', level: 2 }, durationMs: 600_000, xp: 180, repeatable: true,
  inputs: { copper_bar: 15, iron_bar: 5, ash_log: 10 },
  reward: { category: 'equipment', baseId: 'profession_hammer', ilvl: 1, rarity: 'magic', name: "Smelter's Tongs", fixedSuffixes: [{ affixId: 'profession_speed_smelting', tier: 0, values: [8] }] },
  sources: [{ label: 'Mine Copper and Iron', skill: 'mining' }, { label: 'Smelt bars', skill: 'smelting' }],
  use: 'One fixed magic main-hand tool: 8% increased Smelting speed only. Level 1 to equip; one normal rune slot.',
}, {
  id: 'tool_carver_drawknife', version: 1, name: "Carver's Drawknife", skill: 'woodcrafting', level: 15,
  accomplishments: ['woodcrafting_work_20'], station: { id: 'woodcrafting_bench', level: 2 }, durationMs: 600_000, xp: 180, repeatable: true,
  inputs: { ash_plank: 10, oak_plank: 10, copper_bar: 5 },
  reward: { category: 'equipment', baseId: 'profession_hammer', ilvl: 1, rarity: 'magic', name: "Carver's Drawknife", fixedSuffixes: [{ affixId: 'profession_speed_woodcrafting', tier: 0, values: [8] }] },
  sources: [{ label: 'Cut Ash and Oak, then select plank refinement', skill: 'woodcutting' }, { label: 'Smelt Copper Bars', skill: 'smelting' }],
  use: 'One fixed magic main-hand tool: 8% increased Woodcrafting speed only. Level 1 to equip; one normal rune slot.',
}, {
  id: 'tool_master_artisan', version: 1, name: "Master Artisan's Omni-Hammer", skill: 'smithing', level: 60,
  accomplishments: ['smithing_work_60'], station: { id: 'forge', level: 3 }, durationMs: 1_800_000, xp: 600, repeatable: true,
  inputs: { tempered_alloy: 5, wound_alloy: 2, heartwood_frame: 2, exceptional_crystal: 1 },
  reward: { category: 'equipment', baseId: 'profession_hammer', ilvl: 1, rarity: 'magic', name: "Master Artisan's Omni-Hammer", fixedSuffixes: [{ affixId: 'profession_speed_artisan', tier: 0, values: [12] }] },
  sources: [{ label: 'Cast alloys in Smelting', skill: 'smelting' }, { label: 'Carve frames in Woodcrafting', skill: 'woodcrafting' }],
  use: 'High-tier hybrid tool: +12% Production speed across all crafting disciplines (Forging, Smelting, and Woodcrafting). Level 1 to equip; one normal rune slot.',
}, {
  id: 'tool_cooking', version: 1, name: 'Hearth Spoon', skill: 'cooking', level: 30,
  accomplishments: ['cooking_work_100'], durationMs: 1_200_000, xp: 360, repeatable: true,
  inputs: { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 },
  reward: { category: 'equipment', baseId: 'profession_hammer', ilvl: 1, rarity: 'magic', name: 'Hearth Spoon', fixedSuffixes: [{ affixId: 'profession_speed_cooking', tier: 0, values: [8] }] },
  sources: [{ label: 'Mine Copper/Mithril and Rough Gems', skill: 'mining' }, { label: 'Smelt Copper/Mithril Bars', skill: 'smithing' }, { label: 'Cut and refine Oak Planks', skill: 'woodcutting' }],
  use: 'One fixed magic main-hand tool: 8% increased Cooking speed only. Level 1 to equip; one normal rune slot. Other professions may supply inputs. No automatic task switching.',
}, {
  id: 'tool_gemcutting', version: 1, name: "Lapidary's Chisel", skill: 'gemcutting', level: 30,
  accomplishments: ['gemcutting_work_100'], durationMs: 1_200_000, xp: 360, repeatable: true,
  inputs: { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 },
  reward: { category: 'equipment', baseId: 'profession_hammer', ilvl: 1, rarity: 'magic', name: "Lapidary's Chisel", fixedSuffixes: [{ affixId: 'profession_speed_gemcutting', tier: 0, values: [8] }] },
  sources: [{ label: 'Mine Copper/Mithril and Rough Gems', skill: 'mining' }, { label: 'Smelt Copper/Mithril Bars', skill: 'smithing' }, { label: 'Cut and refine Oak Planks', skill: 'woodcutting' }],
  use: 'One fixed magic main-hand tool: 8% increased Gemcutting speed only. Level 1 to equip; one normal rune slot. Other professions may supply inputs. No automatic task switching.',
}, {
  id: 'project_feast_artisans', version: 1, name: "Grand Artisan's Feast", skill: 'cooking', level: 60,
  durationMs: 1_800_000, xp: 600, repeatable: true,
  inputs: { star_bloom: 2, moon_bloom: 2, meal_artisan: 10 },
  reward: { category: 'progress', materials: { feast_artisans: 5 } },
  sources: [{ label: 'Grow or forage Moon and Star Blooms', skill: 'harvesting' }, { label: "Cook Artisan's Lunches", skill: 'cooking' }],
  use: 'Five Grand Artisan’s Feasts: each grants 8% production speed for 60 min of relevant active work. Fixed 5-count award; protected consumables.',
}, {
  id: 'project_feast_wayfarers', version: 1, name: "Wayfarer's Feast", skill: 'cooking', level: 60,
  durationMs: 1_800_000, xp: 600, repeatable: true,
  inputs: { star_bloom: 2, moon_bloom: 2, meal_porridge: 10 },
  reward: { category: 'progress', materials: { feast_wayfarers: 5 } },
  sources: [{ label: 'Grow or forage Moon and Star Blooms', skill: 'harvesting' }, { label: 'Cook Sunpetal Porridge', skill: 'cooking' }],
  use: 'Five Wayfarer’s Feasts: each grants 12% maximum Life and 8% all elemental resistances for 60 min of combat. Fixed 5-count award; protected consumables.',
}];

PROFESSION_PROJECTS.push({ id: 'chart_reliquary', version: 1, name: "Chart Artisans' Reliquary", skill: 'cartography', level: 50,
  accomplishments: ['cartography_work_100'], repeatable: true, durationMs: 1_800_000, xp: 600,
  inputs: { chart_survey_fragment: 20, fine_vellum: 10, sepia_ink: 5, sextant_journeyman: 1 },
  reward: { category: 'chart', id: 'umap_artisans_reliquary' },
  sources: [{ label: 'Survey progress from ordinary Cartography; craft vellum, inks and a Journeyman Sextant', skill: 'cartography' }],
  use: 'One exclusive chart in the shared Map Case. Map Device campaign access is still required. Twenty packs and a T7 guardian; victory gives a Reliquary Fragment, 10 Rough Gems and 100 Arcane Dust. Failure uses the chart; no existing Unique Map trophy rewards.' });

PROFESSION_PROJECTS.push({
  id: 'signature_wayfarer', version: 1, name: "Wayfarer's Inscription", skill: 'runecarving', level: 55,
  accomplishments: ['rune_stone_grade_3_practice'], durationMs: 1_800_000, xp: 360, repeatable: true,
  inputs: { inscription_fragment: 10, rune_stone_3: 1, heartwood_fragment: 5 },
  reward: { category: 'progress', materials: { rune_signature_wayfarer: 1 } },
  sources: [
    { label: 'Carve Deep Stone Runes & earn Inscription Fragments', skill: 'runecarving' },
    { label: 'Ancient Heartwood Survey for Heartwood Fragments', skill: 'woodcutting' },
  ],
  use: 'One signature stone rune: Weapon +6% gathering speed; Armour +4% all elemental resistances; Jewellery +6% maximum Mana. Requires item level 45. Normal stone resonance scales numeric values.',
});

PROFESSION_PROJECTS.push({
  id: 'signature_channel', version: 1, name: "Channeler's Inscription", skill: 'runecarving', level: 65,
  accomplishments: ['rune_storm_grade_3_practice'], durationMs: 1_800_000, xp: 480, repeatable: true,
  inputs: { inscription_fragment: 10, rune_storm_3: 1, exceptional_crystal: 1 },
  reward: { category: 'progress', materials: { rune_signature_channel: 1 } },
  sources: [
    { label: 'Carve Deep Storm Runes & earn Inscription Fragments', skill: 'runecarving' },
    { label: 'Cut Exceptional Crystals from Mining Crystal Shards', skill: 'gemcutting' },
  ],
  use: 'One signature storm rune: Weapon +8% cast speed; Armour +8% energy shield; Jewellery +10% mana regeneration. Requires item level 45. Normal storm resonance scales numeric values; Hollow Circuit converts mana regen.',
});

PROFESSION_PROJECTS.push(...([
  ['woundmaker', 'Woundmaker', 'overhaul_great_axe', 60, 1200, { wound_alloy: 3, tempered_alloy: 5, yew_plank: 10 }, 'Up to 8 Bleeds; 60% less hit damage; cannot critically strike. The unique adds no bleed chance beyond the normal axe implicit.'],
  ['winters_pyre', "Winter's Pyre", 'seraph_staff', 65, 1500, { heartwood_frame: 2, exceptional_crystal: 2, frigid_fossil: 5 }, 'Cold can ignite using normal ignite chance; double ignite damage. No chill/freeze or fire/lightning damage, except the cold-sourced burn.'],
  ['the_homecoming', 'The Homecoming', 'manticore_greatbow', 65, 1500, { heartwood_frame: 2, return_inscription: 2, tempered_alloy: 5 }, 'Exactly one arrow per attack, overriding extra arrows and repeats. It returns after 500ms along the saved target path; dead or absent targets are skipped.'],
] as [string, string, string, number, number, Record<string, number>, string][]).map(([id, name, baseId, level, xp, inputs, use]): ProfessionProject => ({
  id, name, version: 1, skill: 'smithing', level, xp, inputs, use: `${use} Fixed unique, item level 80, combat level 60 and normal base attributes to equip. One normal rune slot. Full costs; no manual double or input conservation.`,
  station: { id: 'forge', level: 3 }, accomplishments: ['smithing_work_100'], repeatable: true, durationMs: 7_200_000,
  reward: { category: 'equipment', baseId, ilvl: 80, rarity: 'unique', name, uniqueId: id },
  sources: [{ label: 'Smithing alloys and frames from Mining and Woodcutting', skill: 'smithing' },
    ...(id === 'winters_pyre' ? [{ label: 'Exceptional Crystals from Mining shards', skill: 'gemcutting' as const }] : []),
    ...(id === 'the_homecoming' ? [{ label: 'Return Inscriptions from grade 2+ rune fragments and Keen grade 3', skill: 'runecarving' as const }] : [])],
})));

PROFESSION_PROJECTS.push({
  id: 'borrowed_tomorrow',
  version: 1,
  name: 'Claim Borrowed Tomorrow',
  skill: 'thieving',
  level: 65,
  durationMs: 60_000,
  xp: 120,
  inputs: { treasury_fragment: 120 },
  reward: {
    category: 'equipment',
    baseId: 'overhaul_treasury_amulet',
    ilvl: 80,
    rarity: 'unique',
    name: 'Borrowed Tomorrow',
    uniqueId: 'borrowed_tomorrow',
  },
  repeatable: true,
  sources: [{ label: 'Occult Treasury rooms for Treasury Fragments', skill: 'thieving' }],
  use: 'One Borrowed Tomorrow amulet: all eligible wearer life leech is instant; no life regeneration or flask life recovery. Item level 80, combat level 60 to equip. One normal rune slot. Fixed cost; no manual double or input conservation.',
});

PROFESSION_PROJECTS.push({
  id: 'assemble_oath',
  version: 1,
  name: 'Assemble Stolen Oath',
  skill: 'thieving',
  level: 75,
  durationMs: 60_000,
  xp: 150,
  inputs: { oath_fragment: 5 },
  reward: { category: 'progress', materials: { stolen_oath_seal: 1 } },
  repeatable: true,
  sources: [{ label: 'Occult Treasury clean vaults & 12-room progress', skill: 'thieving' }],
  use: 'One Stolen Oath Seal. Protected component for The Second Heresy pinnacle project. Fixed cost; no manual double or input conservation.',
});

/**
 * The three pinnacle chase projects (docs/SKILLING_OVERHAUL_SPEC.md §§6–8): each spans at least three endgame
 * activities, grants a fixed item level 90 unique with exactly one explicit effect, and is repeatable with fresh inputs.
 */
const PINNACLE_NOTE = 'Item level 90, combat level 80 to equip. One normal rune slot. Full protected costs; no manual double or input conservation.';
PROFESSION_PROJECTS.push({
  id: 'the_second_heresy', version: 1, name: 'The Second Heresy', skill: 'runecarving', level: 85,
  station: { id: 'rune_board', level: 1 }, accomplishments: ['runecarving_work_100'], repeatable: true,
  durationMs: 3_600_000, xp: 2400,
  inputs: { crownless_sigil: 1, stolen_oath_seal: 1, restored_taboo_tablet: 1, inscription_fragment: 5 },
  reward: { category: 'equipment', baseId: 'overhaul_plain_ring', ilvl: 90, rarity: 'unique', name: 'The Second Heresy', uniqueId: 'the_second_heresy' },
  sources: [
    { label: 'Hard Boss: defeat the Crownless King for a Crownless Sigil', skill: 'combat' },
    { label: 'Heist: Occult Treasury Oath Fragments assemble a Stolen Oath Seal', skill: 'thieving' },
    { label: 'Expedition: restore a Taboo Tablet after the first Adit discovery', skill: 'archaeology' },
    { label: 'Inscription Fragments from grade 2+ rune carving', skill: 'runecarving' },
  ],
  use: `One ring: allows one additional Forbidden keystone. Two copies still allow only two. Removing it refunds the newest excess keystone. Fixed effect; no Divine reroll. ${PINNACLE_NOTE}`,
}, {
  id: 'worldheart', version: 1, name: 'Worldheart', skill: 'smithing', level: 90,
  station: { id: 'forge', level: 3 }, accomplishments: ['smithing_work_100'], repeatable: true,
  durationMs: 3_600_000, xp: 2400,
  inputs: { world_core_fragment: 3, reliquary_fragment: 1, architect_doom_sigil: 1, world_bar: 5 },
  reward: { category: 'equipment', baseId: 'overhaul_plain_belt', ilvl: 90, rarity: 'unique', name: 'Worldheart', uniqueId: 'worldheart' },
  sources: [
    { label: 'Doomed Maps: one World Core Fragment per final boss victory', skill: 'combat' },
    { label: 'Unique Maps: one Reliquary Fragment per final boss victory', skill: 'cartography' },
    { label: "Uber: defeat the Architect of Ruin (Doom Key Fragments forge the key) for an Architect's Doom Sigil", skill: 'combat' },
    { label: 'World Bars smelted from World Ore', skill: 'smithing' },
  ],
  use: `One belt: 30% less Damage taken from hits and damage over time, applied once. Fixed effect; no Divine reroll. ${PINNACLE_NOTE}`,
}, {
  id: 'the_sum_of_all_things', version: 1, name: 'The Sum of All Things', skill: 'runecarving', level: 90,
  station: { id: 'rune_board', level: 1 }, accomplishments: ['runecarving_work_100'], repeatable: true,
  durationMs: 7_200_000, xp: 3000,
  inputs: {
    completed_atlas_chart: 1, reliquary_fragment: 1, fractured_orb: 1,
    marrow_shard: 1, choir_glass: 1, black_pearl: 1, throne_ash: 1, crownless_sigil: 1,
    exile_doom_sigil: 1, architect_doom_sigil: 1, void_sigil: 1,
    stolen_oath_seal: 1, convergence_relic: 1, convergence_frame: 1, star_distillate: 1,
    binding_stock: 1, convergence_crystal: 1, convergence_inscription: 1,
  },
  reward: { category: 'equipment', baseId: 'overhaul_plain_amulet', ilvl: 90, rarity: 'unique', name: 'The Sum of All Things', uniqueId: 'the_sum_of_all_things' },
  sources: [
    { label: 'Mining ore, fragments and crystal shards (frame and crystal)', skill: 'mining' },
    { label: 'Ancient Heartwood (Convergence Frame)', skill: 'woodcutting' },
    { label: 'Convergence Frame from Wound and Stone Alloy', skill: 'smithing' },
    { label: 'Moon and Star Blooms, grown or foraged', skill: 'harvesting' },
    { label: 'Star Distillate', skill: 'alchemy' },
    { label: 'Binding Stock', skill: 'cooking' },
    { label: 'Convergence Crystal polished from an Exceptional Crystal', skill: 'gemcutting' },
    { label: 'Convergence Inscription and the final assembly', skill: 'runecarving' },
    { label: 'Stolen Oath Seal from the Occult Treasury', skill: 'thieving' },
    { label: 'Convergence Relic restored after the first Heart discovery', skill: 'archaeology' },
    { label: 'Completed Atlas Chart (ten T10 Map wins) and a Reliquary Fragment (Unique Map)', skill: 'cartography' },
    { label: 'Doomed Maps (Fractured Orb, guaranteed every ten victories), all five Hard Bosses and all three Ubers', skill: 'combat' },
  ],
  use: `One amulet: (1–200)% more Damage, a whole number rolled evenly. It multiplies your hits, ailments, minions and totems once. A low roll is still a finished craft. An ordinary Divine Orb rerolls it (the same number can come up again); no second full recipe needed. ${PINNACLE_NOTE}`,
});

PROFESSION_PROJECTS.push({
  id: 'the_buried_grudge',
  version: 1,
  name: 'Restore The Buried Grudge',
  skill: 'archaeology',
  level: 65,
  accomplishments: ['expedition.dig_colossus.0'],
  durationMs: 7_200_000,
  xp: 1500,
  inputs: { giant_relic_fragment: 40, giant_tally: 100, stone_alloy: 2 },
  reward: {
    category: 'equipment',
    baseId: 'sunforged_bulwark',
    ilvl: 80,
    rarity: 'unique',
    name: 'The Buried Grudge',
    uniqueId: 'the_buried_grudge',
  },
  repeatable: true,
  sources: [
    { label: 'Dig The Cairn & The Colossus for Giant Relic Fragments and Giant Tallies', skill: 'archaeology' },
    { label: 'Smelt Stone Alloy from Adamant, Iron and Stone Fragments', skill: 'smithing' },
  ],
  use: 'Blocked hits take 50% of post-mitigation damage. Store prevented damage up to 300% max Life to unleash in a physical shockwave on your next slam. Fixed unique, item level 80, combat level 60 to equip. One normal rune slot.',
});

PROFESSION_PROJECTS.push({
  id: 'witchglass',
  version: 1,
  name: 'Witchglass',
  skill: 'alchemy',
  level: 65,
  station: { id: 'alchemy_table', level: 3 },
  durationMs: 3_600_000,
  xp: 1200,
  inputs: { moon_distillate: 5, star_distillate: 2, prepared_glass: 5 },
  reward: {
    category: 'flask',
    flaskId: 'u_flask_witchglass',
    ilvl: 80,
    rarity: 'unique',
    name: 'Witchglass',
    uniqueId: 'witchglass',
  },
  repeatable: true,
  sources: [
    { label: 'Distill Moon and Star Blooms at Alchemy Table 3', skill: 'alchemy' },
    { label: 'Refine Prepared Glass from Rough Gems and Sunpetals at Alchemy Table 3', skill: 'alchemy' },
  ],
  use: 'One Witchglass utility flask: 100% of elemental damage converted to chaos while active; cannot inflict elemental ailments. 5s duration, 20 of 40 charges per use. Unique flask; can be instilled.',
});

PROFESSION_PROJECTS.push({
  id: 'the_still_heart',
  version: 1,
  name: 'The Still Heart',
  skill: 'alchemy',
  level: 60,
  station: { id: 'alchemy_table', level: 3 },
  durationMs: 3_600_000,
  xp: 1200,
  inputs: { moon_distillate: 6, ember_reduction: 10, prepared_glass: 3 },
  reward: {
    category: 'flask',
    flaskId: 'u_flask_still_heart',
    ilvl: 80,
    rarity: 'unique',
    name: 'The Still Heart',
    uniqueId: 'the_still_heart',
  },
  repeatable: true,
  sources: [
    { label: 'Distill Moon Blooms at Alchemy Table 3', skill: 'alchemy' },
    { label: 'Cook Emberroot Reduction from Emberroots and Vitality Essences', skill: 'cooking' },
    { label: 'Refine Prepared Glass at Alchemy Table 3', skill: 'alchemy' },
  ],
  use: 'One The Still Heart life flask: recovers 1800 Life over 6s, continuing at full life. Cannot leech or regenerate life during effect. Replaces active recovery on reuse. 20 of 40 charges per use. Borrowed Tomorrow blocks its life recovery entirely.',
});

PROFESSION_PROJECTS.push({
  id: 'debt_of_stone',
  version: 1,
  name: 'Debt of Stone',
  skill: 'smithing',
  level: 70,
  station: { id: 'forge', level: 3 },
  accomplishments: ['smithing_work_100'],
  durationMs: 7_200_000,
  xp: 1800,
  inputs: { stone_alloy: 4, adamant_bar: 20, heartwood_frame: 1 },
  reward: {
    category: 'equipment',
    baseId: 'sunforged_plate',
    ilvl: 80,
    rarity: 'unique',
    name: 'Debt of Stone',
    uniqueId: 'debt_of_stone',
  },
  repeatable: true,
  sources: [
    { label: 'Smelt Stone Alloy from Adamant, Iron and Stone Fragments', skill: 'smithing' },
    { label: 'Smelt Adamant Bars from Adamant Ore', skill: 'smithing' },
    { label: 'Assemble Heartwood Frames from Ancient Heartwood and Yew Planks', skill: 'smithing' },
  ],
  use: '50% of incoming hit damage deferred evenly over 4s; cannot gain Energy Shield. Fixed unique, item level 80, combat level 60 to equip. One normal rune slot.',
});

PROFESSION_PROJECTS.push({
  id: 'hands_forgotten_choir',
  version: 1,
  name: 'Hands of the Forgotten Choir',
  skill: 'runecarving',
  level: 70,
  station: { id: 'rune_board', level: 1 },
  accomplishments: ['runecarving_work_100'],
  durationMs: 7_200_000,
  xp: 1800,
  inputs: { choir_inscription: 2, exceptional_crystal: 1 },
  baseIds: ['hierophant_gloves', 'seraph_gloves'],
  baseNonUnique: true,
  reward: {
    category: 'equipment',
    baseId: 'seraph_gloves',
    ilvl: 80,
    rarity: 'unique',
    name: 'Hands of the Forgotten Choir',
    uniqueId: 'hands_forgotten_choir',
  },
  repeatable: true,
  sources: [
    { label: 'Prepare Choir Inscriptions from Inscription Fragments and Blood Grade 3', skill: 'runecarving' },
    { label: 'Cut Exceptional Crystals from Mining Crystal Shards and Rough Gems', skill: 'gemcutting' },
    { label: 'Crafted Hierophant’s Gloves or Seraph Gloves', skill: 'smithing' },
  ],
  use: 'Totem skills place two at once; +2 maximum active totems; you cannot deal damage yourself. Inscribes crafted Hierophant’s Gloves or Seraph Gloves, completely consuming the base into a new unique.',
});

PROFESSION_PROJECTS.push({
  id: 'hollow_circuit',
  version: 1,
  name: 'Hollow Circuit',
  skill: 'runecarving',
  level: 70,
  station: { id: 'rune_board', level: 1 },
  accomplishments: ['runecarving_work_100'],
  durationMs: 7_200_000,
  xp: 1800,
  inputs: { circuit_inscription: 2, exceptional_crystal: 2 },
  baseId: 'diamond_ring',
  baseMinIlvl: 45,
  baseNonUnique: true,
  reward: {
    category: 'equipment',
    baseId: 'diamond_ring',
    ilvl: 80,
    rarity: 'unique',
    name: 'Hollow Circuit',
    uniqueId: 'hollow_circuit',
  },
  repeatable: true,
  sources: [
    { label: 'Prepare Circuit Inscriptions from Inscription Fragments and Storm Grade 3', skill: 'runecarving' },
    { label: 'Cut Exceptional Crystals from Mining Crystal Shards and Rough Gems', skill: 'gemcutting' },
    { label: 'Crafted Diamond Ring of item level 45+', skill: 'smithing' },
  ],
  use: '100% of would-be Mana regeneration recovers Energy Shield instead; no Mana regeneration or natural Energy Shield recharge. Inscribes a crafted Diamond Ring of item level 45+, completely consuming the base into a new unique.',
});

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
  archaeology: {
    title: 'Relic Restorations',
    singular: 'restoration',
    startLabel: 'Restore relic',
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
