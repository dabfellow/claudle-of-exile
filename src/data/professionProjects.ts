import type { Item, SkillId } from '../engine/types';

export type ProjectReward =
  | { category: 'chart'; id: string }
  | { category: 'progress'; materials: Record<string, number> }
  | { category: 'equipment'; baseId: string; ilvl: number; rarity: Item['rarity']; name?: string; uniqueId?: string; fixedSuffixes?: Item['suffixes'] };

export interface ProfessionRequirement {
  skill: SkillId;
  level: number;
  accomplishments?: string[];
  station?: { id: 'forge' | 'alchemy_table' | 'rune_board'; level: number };
}

export interface ProfessionProject extends ProfessionRequirement {
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
  sources: { label: string; skill: SkillId }[];
  use: string;
}

/** Foundation proof using only existing smelting materials/rates; expansion recipes belong to later phases. */
export const PROFESSION_PROJECTS: ProfessionProject[] = [{
  id: 'copper_supply', version: 1, name: 'Copper Supply', skill: 'smithing', level: 1,
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

export const professionProject = (id: string) => PROFESSION_PROJECTS.find((p) => p.id === id);
