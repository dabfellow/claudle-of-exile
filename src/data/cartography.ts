import type { MaterialDef } from './materials';
import { zonesInAct } from './zones';

/**
 * Cartography, Act 6's skill (docs/GAME.md): the second route to maps and Sextants. Drops give you whatever turns up;
 * Cartography draws Tier 1 plain maps, binds folios for a long offline grind, upgrades maps 3-into-1 up to Tier 10,
 * and crafts Apprentice, Journeyman and Master Sextants. Drawn maps go straight into the realm's shared map supply.
 */
export const CARTOGRAPHY_GATE = { zone: zonesInAct(6)[0]?.id ?? 'act6_not_built', label: 'Act 6' };

/** How many maps of the tier below one upgrade uses, and with Master Cartographer. */
export const UPGRADE_MAPS = 3;
export const MASTER_UPGRADE_MAPS = 2;

/** A folio: this many tier 1 maps at once, for FOLIO_COST times the materials. */
export const FOLIO_SIZE = 5;
export const FOLIO_COST = 4;
export const FOLIO_LEVEL = 32;

export interface ChartTier {
  tier: number;
  level: number;
  intervalMs: number;
  xp: number;
  inputs: Record<string, number>;
}

/** Tier 1 is drawn from vellum and ink; every tier above upgrades maps of the tier below. */
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

export const CHART_MATERIALS: MaterialDef[] = [
  { id: 'vellum', name: 'Vellum', kind: 'chart', color: '#d8c8a0', value: 12, desc: 'Scraped thin and pressed flat. Every map starts here.' },
  { id: 'gall_ink', name: 'Gall Ink', kind: 'chart', color: '#46506a', value: 15, desc: 'Black, and it bites into the page.' },
  { id: 'fine_vellum', name: 'Fine Vellum', kind: 'chart', color: '#f0e4c4', value: 45, desc: 'Takes a line fine enough for a higher tier of map.' },
  { id: 'sepia_ink', name: 'Sepia Ink', kind: 'chart', color: '#8a5a34', value: 60, desc: 'It stays dark long after the place it shows has gone.' },
  { id: 'sextant_apprentice', name: 'Apprentice Sextant', kind: 'chart', color: '#7fa8d8', value: 80, desc: 'Rolls a modifier on a Map Device slot for 6 map runs (Tier 1+).' },
  { id: 'sextant_journeyman', name: 'Journeyman Sextant', kind: 'chart', color: '#d8b058', value: 200, desc: 'Rolls a stronger modifier on a Map Device slot for 6 map runs (Tier 5+).' },
  { id: 'sextant_master', name: 'Master Sextant', kind: 'chart', color: '#c868e8', value: 500, desc: 'Rolls a high-tier modifier on a Map Device slot for 6 map runs (Tier 8+).' },
];
