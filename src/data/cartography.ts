import type { MaterialDef } from './materials';
import type { SkillAction } from './skills';
import { zonesInAct } from './zones';

/**
 * Cartography (docs/CARTOGRAPHY.md): special maps from scraps.
 * Plain maps drop from monsters; Cartography upgrades maps 3:1 / 2:1, crafts Sextants and folios,
 * and assembles Boss, Vault, Guardian, Pinnacle and Lost Chart special maps from scraps and trophies.
 */
export const CARTOGRAPHY_GATE = { zone: zonesInAct(6)[0]?.id ?? 'act6_not_built', label: 'Act 6' };

export const UPGRADE_MAPS = 3;
export const MASTER_UPGRADE_MAPS = 2;

export const FOLIO_SIZE = 5;
export const FOLIO_COST = 4;
export const FOLIO_LEVEL = 32;

export type SpecialMapKind = 'boss' | 'vault' | 'guardian' | 'pinnacle' | 'lost';

export interface LostPlaceDef {
  id: string;
  name: string;
  bossName: string;
}

export const LOST_PLACES: readonly LostPlaceDef[] = [
  { id: 'drowned_library', name: 'The Drowned Library', bossName: 'Archivist of the Deep' },
  { id: 'ember_throne', name: 'The Ember Throne Vault', bossName: 'Cinder Regent' },
  { id: 'glass_ossuary', name: 'The Glass Ossuary', bossName: 'Shattered Cantor' },
  { id: 'sunken_observatory', name: 'The Sunken Observatory', bossName: 'Blind Astronomer' },
  { id: 'salt_cathedral', name: 'The Salt Cathedral', bossName: 'Tidebound Prelate' },
];

export const ATLAS_SPECIAL_PERKS = [
  { entries: 5, label: 'Boss scrap drops +20%' },
  { entries: 15, label: 'Vault chest rolls +25%' },
  { entries: 25, label: 'Guardian scrap drops +20%' },
  { entries: 35, label: 'Lost chart chance ×1.5' },
] as const;

export interface ChartTier {
  tier: number;
  level: number;
  intervalMs: number;
  xp: number;
  inputs: Record<string, number>;
}

/** Upgrades from tier 2 to tier 10 (tier 1 is kept here for folio cost scaling only). */
export const CHART_TIERS: ChartTier[] = [
  { tier: 1, level: 10, intervalMs: 12000, xp: 60, inputs: { vellum: 4, gall_ink: 2 } },
  { tier: 2, level: 22, intervalMs: 15000, xp: 120, inputs: { fine_vellum: 3, gall_ink: 2 } },
  { tier: 3, level: 30, intervalMs: 18000, xp: 190, inputs: { fine_vellum: 5, sepia_ink: 2 } },
  { tier: 4, level: 38, intervalMs: 20000, xp: 260, inputs: { fine_vellum: 6, sepia_ink: 3 } },
  { tier: 5, level: 46, intervalMs: 22000, xp: 340, inputs: { fine_vellum: 8, sepia_ink: 4 } },
  { tier: 6, level: 54, intervalMs: 24000, xp: 430, inputs: { fine_vellum: 10, sepia_ink: 5 } },
  { tier: 7, level: 62, intervalMs: 26000, xp: 530, inputs: { fine_vellum: 12, sepia_ink: 6, arcane_dust: 8 } },
  { tier: 8, level: 70, intervalMs: 28000, xp: 640, inputs: { fine_vellum: 15, sepia_ink: 8, arcane_dust: 12 } },
  { tier: 9, level: 78, intervalMs: 30000, xp: 760, inputs: { fine_vellum: 18, sepia_ink: 10, arcane_dust: 16 } },
  { tier: 10, level: 85, intervalMs: 32000, xp: 900, inputs: { fine_vellum: 22, sepia_ink: 12, arcane_dust: 24 } },
];

export interface SextantRecipe {
  id: string;
  name: string;
  level: number;
  intervalMs: number;
  xp: number;
  inputs: Record<string, number>;
  color: string;
}

export const SEXTANT_RECIPES: SextantRecipe[] = [
  { id: 'sextant_apprentice', name: 'Apprentice Sextant', level: 18, intervalMs: 14000, xp: 90, inputs: { vellum: 3, gall_ink: 2, copper_ore: 4, rough_gem: 1 }, color: '#7fa8d8' },
  { id: 'sextant_journeyman', name: 'Journeyman Sextant', level: 42, intervalMs: 20000, xp: 260, inputs: { fine_vellum: 4, sepia_ink: 3, mithril_ore: 4, rough_gem: 2 }, color: '#d8b058' },
  { id: 'sextant_master', name: 'Master Sextant', level: 66, intervalMs: 28000, xp: 520, inputs: { fine_vellum: 8, sepia_ink: 6, voidbloom: 4, arcane_dust: 15, rough_gem: 3 }, color: '#c868e8' },
];

export const SPECIAL_MAP_ACTIONS: SkillAction[] = [
  ...Array.from({ length: 10 }, (_, idx): SkillAction => {
    const tier = idx + 1;
    return {
      id: `special_boss_t${tier}`,
      skill: 'cartography',
      name: `Boss Map (T${tier})`,
      level: 40,
      intervalMs: 60_000,
      xp: 300,
      inputs: { boss_scrap: 3, gall_ink: 2 },
      specialMap: { kind: 'boss', tier, needsPlainTier: tier },
      color: '#e07a5f',
    };
  }),
  ...Array.from({ length: 10 }, (_, idx): SkillAction => {
    const tier = idx + 1;
    return {
      id: `special_vault_t${tier}`,
      skill: 'cartography',
      name: `Vault Map (T${tier})`,
      level: 55,
      intervalMs: 60_000,
      xp: 400,
      inputs: { vault_scrap: 3, sepia_ink: 2 },
      specialMap: { kind: 'vault', tier, needsPlainTier: tier },
      color: '#f2cc8f',
    };
  }),
  {
    id: 'special_guardian_t10',
    skill: 'cartography',
    name: 'Guardian Map (T10)',
    level: 70,
    intervalMs: 120_000,
    xp: 750,
    inputs: { guardian_scrap: 5, sepia_ink: 5 },
    specialMap: { kind: 'guardian', tier: 10, needsPlainTier: 10 },
    color: '#c868e8',
  },
  {
    id: 'special_pinnacle_t10',
    skill: 'cartography',
    name: 'Pinnacle Map (T10)',
    level: 85,
    intervalMs: 300_000,
    xp: 1500,
    inputs: { guardian_trophy: 4 },
    specialMap: { kind: 'pinnacle', tier: 10, needsPlainTier: 10 },
    color: '#e85a4f',
  },
  {
    id: 'special_lost_chart',
    skill: 'cartography',
    name: 'Lost Chart',
    level: 75,
    intervalMs: 180_000,
    xp: 1000,
    inputs: { lost_chart: 1 },
    specialMap: { kind: 'lost', tier: 10 },
    color: '#64d8b4',
  },
];

export const CHART_MATERIALS: MaterialDef[] = [
  ...([
    ['boss_scrap', 'Boss Scrap', 'Torn map scrap dropped by map bosses (1–2) and rare monsters in maps (3%). Pieces together Boss maps.'],
    ['vault_scrap', 'Vault Scrap', 'Rumour scrap dropped by rare monsters in maps (2%) and Vault chests (1–3). Pieces together Vault maps.'],
    ['guardian_scrap', 'Guardian Scrap', 'Dropped by T8+ Boss map bosses (30%). Five assemble a Guardian map.'],
    ['guardian_trophy', 'Guardian Trophy', 'Dropped by Guardian map bosses. Four assemble a Pinnacle map.'],
    ['lost_chart', 'Lost Chart', 'A 1-in-500 find from Boss map bosses. Opens a one-off map to a unique lost place.'],
    ['chart_survey_fragment', 'Chart Survey Fragment', 'Earned from crafting special maps (1 per 30 completions plus 1% extra). Twenty make an Artisans’ Reliquary chart.'],
    ['reliquary_fragment', 'Reliquary Fragment', 'One per victorious Unique Map final boss or Pinnacle map. One goes into Worldheart and one into The Sum of All Things.'],
    ['atlas_survey_record', 'Atlas Survey Record', 'One per ten successful normal T10 Map final bosses, or from Pinnacle and Lost Chart maps.'],
    ['completed_atlas_chart', 'Completed Atlas Chart', 'Assembled from an Atlas Survey Record, Fine Vellum, Sepia Ink and a Master Sextant. One goes into The Sum of All Things.'],
    ['world_core_fragment', 'World Core Fragment', 'One per victorious Doomed Map final boss, any tier. Three go into Worldheart.'],
    ['doom_key_fragment', 'Doom Key Fragment', 'One per victorious Doomed Map final boss. Ten forge an Uber Key of your choice at Cartography 85.'],
  ] as const).map(([id, name, desc]): MaterialDef => ({ id, name, desc, kind: 'component', color: '#a89ae8', value: 0 })),
  { id: 'vellum', name: 'Vellum', kind: 'chart', color: '#d8c8a0', value: 12, desc: 'Scraped thin and pressed flat. Every map starts here.' },
  { id: 'gall_ink', name: 'Gall Ink', kind: 'chart', color: '#46506a', value: 15, desc: 'Black, and it bites into the page.' },
  { id: 'fine_vellum', name: 'Fine Vellum', kind: 'chart', color: '#f0e4c4', value: 45, desc: 'Takes a line fine enough for a higher tier of map.' },
  { id: 'sepia_ink', name: 'Sepia Ink', kind: 'chart', color: '#8a5a34', value: 60, desc: 'It stays dark long after the place it shows has gone.' },
  { id: 'sextant_apprentice', name: 'Apprentice Sextant', kind: 'chart', color: '#7fa8d8', value: 80, desc: 'Rolls a modifier on a Map Device slot for 6 map runs (Tier 1+).' },
  { id: 'sextant_journeyman', name: 'Journeyman Sextant', kind: 'chart', color: '#d8b058', value: 200, desc: 'Rolls a stronger modifier on a Map Device slot for 6 map runs (Tier 5+).' },
  { id: 'sextant_master', name: 'Master Sextant', kind: 'chart', color: '#c868e8', value: 500, desc: 'Rolls a high-tier modifier on a Map Device slot for 6 map runs (Tier 8+).' },
];
