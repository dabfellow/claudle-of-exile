import type { SkillId } from '../engine/types';
import { GEMCUTTING_EXPANSION_ACTIONS, type GemFamily } from './gemcutting';
import { WEAPON_COMPONENT_ACTIONS } from './weaponProjects';
import { ARCHAEOLOGY_RECIPES } from './archaeology';
import { MINING_ACTIONS, type MiningDeposit } from './mining';
import { WOODCUTTING_ACTIONS, type WoodcuttingSource } from './woodcutting';
import { AGILITY_ACTIONS, AGILITY_SPOT_LEVEL } from './agility';
import { FORAGING_ACTIONS, foragingSource, type ForagingSource } from './foraging';
import { ALCHEMY_EXPANSION_ACTIONS } from './alchemy';
import { purposeRecipes, SMITH_COMPONENTS, type SmithPurpose } from './smithing';
import { BASES, type BaseDef } from './bases';
import { CARTOGRAPHY_GATE, CHART_TIERS, FOLIO_COST, FOLIO_LEVEL, FOLIO_SIZE, SEXTANT_RECIPES } from './cartography';
import { COOKING_GATE } from './cooking';
import { CULTURES, digChance, EXPEDITION_GATE, SITES, TRAIL } from './expedition';
import { MAP_TIERS } from './maps';
import { MARKER, SEAL, SHARD_CHANCE, SHARD_FOR, SHARD_ORB, SHARDS_PER_ORB, WAX } from './craftMats';
import { RUNE_FAMILIES, RUNES } from './runes';
import { masteryForAction, type MasterySpec } from './skillingMastery';
import { masteryBatches } from './masteryBatches';
import { CONSTELLATIONS, GILDED_STARDUST, STARDUST } from './astrology';

export interface SkillDef {
  id: SkillId;
  name: string;
  group: 'combat' | 'gathering' | 'production';
  color: string;
  verb: string;
  desc: string;
  /** shown but not trainable yet (Fishing: always coming soon) */
  soon?: boolean;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  combat: { id: 'combat', name: 'Character', group: 'combat', color: '#e0a640', verb: 'Fighting', desc: 'Your character level: raises Life and Mana and grants passive points.' },
  mining: { id: 'mining', name: 'Mining', group: 'gathering', color: '#c8743f', verb: 'Mining', desc: 'Prospect deeper metals. Choose ordinary ore, rich metal, crystal or fossil deposits; save dependable fragments for future projects.' },
  woodcutting: { id: 'woodcutting', name: 'Woodcutting', group: 'gathering', color: '#6fae4a', verb: 'Chopping', desc: 'Choose timber, guaranteed resin or ancient heartwood. Refine materials for Smithing, construction and future equipment frames.' },
  // id kept as `harvesting` so saves, tree nodes and the Greenhouse don't need migrating
  harvesting: { id: 'harvesting', name: 'Foraging', group: 'gathering', color: '#d9b84a', verb: 'Foraging', desc: 'Pick herbs off the ground for Alchemy.' },
  thieving: { id: 'thieving', name: 'Thieving', group: 'gathering', color: '#c9a35a', verb: 'Thieving', desc: "Lift purses for gold and Rogue's Markers, then spend them on Heists against the Khanate." },
  agility: { id: 'agility', name: 'Agility', group: 'gathering', color: '#5fc4b0', verb: 'Running', desc: 'Run courses across Veyrath. Levels open shortcuts: faster Heist rooms, quicker footwork in fights and hidden gathering spots.' },
  archaeology: { id: 'archaeology', name: 'Archaeology', group: 'gathering', color: '#b0784a', verb: 'Digging', desc: 'Dig sites in the Hollow Peaks for Artifacts, then trade them with the merchants of the Expedition for currency.' },
  smelting: { id: 'smelting', name: 'Smelting', group: 'production', color: '#d07a3a', verb: 'Smelting', desc: 'Smelt mined ores into pure metal bars and blend defensive alloys in the crucible.' },
  smithing: { id: 'smithing', name: 'Forging', group: 'production', color: '#b8b8c8', verb: 'Forging', desc: 'Hammer refined metal bars into martial weapons, shields, plate armour, and jewellery.' },
  woodcrafting: { id: 'woodcrafting', name: 'Woodcrafting', group: 'production', color: '#9c7a4c', verb: 'Woodcrafting', desc: 'Carve harvested logs and refined timber into staves, wands, bows, cloth robes, and leather gear.' },
  alchemy: { id: 'alchemy', name: 'Alchemy', group: 'production', color: '#9b6dde', verb: 'Brewing', desc: 'Brew flasks and transmute dust into orbs.' },
  gemcutting: { id: 'gemcutting', name: 'Gemcutting', group: 'production', color: '#4fc1a6', verb: 'Cutting', desc: 'Cut rough gems into skill and support gems.' },
  runecarving: { id: 'runecarving', name: 'Rune-carving', group: 'production', color: '#6fa8ff', verb: 'Carving', desc: 'Carve old materials into runes, then inscribe them in the rune slot on your gear.' },
  cooking: { id: 'cooking', name: 'Cooking', group: 'production', color: '#e08a4a', verb: 'Cooking', desc: 'Cook gathered plants into meals, and into the strongest flask ingredients for Alchemy.' },
  cartography: { id: 'cartography', name: 'Cartography', group: 'production', color: '#8a7ad8', verb: 'Drawing', desc: 'Draw maps and upgrade them to higher tiers, ready for the Map Device.' },
  astrology: { id: 'astrology', name: 'Astrology', group: 'gathering', color: '#a9b8ff', verb: 'Stargazing', desc: 'Study the constellations for Stardust, then light their stars on the Star Chart for lasting bonuses to your professions and your character.' },
  fishing: { id: 'fishing', name: 'Fishing', group: 'gathering', color: '#4fa3d9', verb: 'Fishing', desc: 'Cast a line into the waters of Wraeclast.', soon: true },
};

/** Planned skills shown on the Coming soon page. One with a `gate` is built, and leaves the page once that area opens. */
export const UPCOMING_SKILLS: { name: string; theme: string; icon: string; color: string; desc: string; gate?: { zone: string } }[] = [
  { name: 'Fletching', theme: 'Quivers', icon: 'woodcutting', color: '#7fae6a', desc: 'Turn logs into shafts and shafts into quivers.' },
];

export interface SkillAction {
  id: string;
  skill: SkillId;
  name: string;
  level: number;
  intervalMs: number;
  xp: number;
  inputs?: Record<string, number>;
  outputs?: Record<string, number>;
  bonus?: { id: string; chance: number; qty: number }[];
  /** smithing: produces an item base */
  baseId?: string;
  /** One selected rare with two advertised guarantees; independent of catalysts/salvage. */
  purpose?: SmithPurpose;
  forge?: number;
  alchemyTable?: number;
  /** alchemy: produces a flask */
  flaskId?: string;
  /** gemcutting: produces a random gem of this kind or a targeted family/exact cut */
  gem?: { kind: 'skill' | 'support' | 'signature' | 'family' | 'exact'; family?: GemFamily; exactId?: string };
  color: string;
  /** campaign area that must be unlocked first */
  area?: string;
  /** the same, for an area named only by id, so a recipe can wait for an act's data: `label` says where to go */
  gate?: { zone: string; label: string };
  /** chance each action gives its `outputs` at all (alternate nodes trade base material for secondaries) */
  outputChance?: number;
  /** batch recipe: makes this many at once; `batchOf` is the single recipe it scales */
  batch?: number;
  batchOf?: string;
  /** Mastery reward batch; old discounted Alchemy ×10 recipes are independent. */
  batchMastery?: number;
  /** cartography: makes `qty` maps, into the shared map supply. An upgrade also uses up maps of the tier below */
  chart?: { tier: number; qty: number; upgrade?: boolean };
  /** listed but can never be started (every Fishing spot) */
  soon?: boolean;
  /** Stable per-task non-combat practice track and its explicitly allowed bonuses. */
  mastery?: MasterySpec;
  /** Per nominal foreground completion, excluded from every ordinary yield/manual loop. */
  protectedOutputs?: Record<string, number>;
  discovery?: string;
  foraging?: ForagingSource;
  /** Character accomplishments; old eligible actions may retain a legacy access flag. */
  accomplishments?: string[];
  mining?: MiningDeposit;
  woodcutting?: WoodcuttingSource;
  /** Hidden gathering spot: also needs this Agility level (data/agility.ts) */
  agility?: number;
}

const gather = (
  skill: SkillId,
  id: string,
  name: string,
  level: number,
  intervalMs: number,
  xp: number,
  output: string,
  color: string,
  bonus?: SkillAction['bonus'],
): SkillAction => ({ id, skill, name, level, intervalMs, xp, outputs: { [output]: 1 }, bonus, color });

const ALT_YIELD = 0.5;

const GATHERING: SkillAction[] = [
  gather('mining', 'mine_copper', 'Copper Vein', 1, 3000, 7, 'copper_ore', '#c8743f', [{ id: 'rough_gem', chance: 0.02, qty: 1 }]),
  { ...gather('mining', 'mine_scorched', 'Scorched Seam', 5, 3500, 9, 'copper_ore', '#e2603f', [{ id: 'scorched_fossil', chance: 0.08, qty: 1 }]), outputChance: ALT_YIELD },
  { ...gather('mining', 'mine_frigid', 'Frigid Seam', 9, 3500, 11, 'copper_ore', '#7fc8f8', [{ id: 'frigid_fossil', chance: 0.08, qty: 1 }]), outputChance: ALT_YIELD },
  { ...gather('mining', 'mine_iron', 'Iron Vein', 15, 3500, 18, 'iron_ore', '#9aa3ad', [{ id: 'rough_gem', chance: 0.03, qty: 1 }, { id: 'dense_fossil', chance: 0.03, qty: 1 }]), area: 'ashwood' },
  { ...gather('mining', 'mine_storm', 'Storm-struck Vein', 17, 4000, 20, 'iron_ore', '#f2d14c', [{ id: 'metallic_fossil', chance: 0.08, qty: 1 }]), outputChance: ALT_YIELD, area: 'ashwood' },
  { ...gather('mining', 'mine_jagged', 'Jagged Vein', 19, 4000, 22, 'iron_ore', '#c9c9d3', [{ id: 'serrated_fossil', chance: 0.08, qty: 1 }]), outputChance: ALT_YIELD, area: 'ashwood' },
  { ...gather('mining', 'mine_gem', 'Glimmering Geode', 22, 5000, 30, 'rough_gem', '#d0569b'), area: 'crypt' },
  { ...gather('mining', 'mine_mithril', 'Mithril Vein', 30, 4000, 38, 'mithril_ore', '#6fc3d8', [{ id: 'rough_gem', chance: 0.05, qty: 1 }, { id: 'mineral_fragment', chance: 0.025, qty: 1 }]), area: 'shipgrave' },
  { ...gather('mining', 'mine_cliffside', 'Cliffside Vein', 15, 3500, 20, 'iron_ore', '#b0b8c4', [{ id: 'rough_gem', chance: 0.06, qty: 1 }, { id: 'dense_fossil', chance: 0.05, qty: 1 }]), agility: AGILITY_SPOT_LEVEL.mine_cliffside },
  { ...gather('mining', 'mine_grotto', 'Falls Grotto', 30, 4000, 40, 'mithril_ore', '#5fd8e0', [{ id: 'rough_gem', chance: 0.08, qty: 1 }, { id: 'mineral_fragment', chance: 0.04, qty: 1 }]), agility: AGILITY_SPOT_LEVEL.mine_grotto },

  gather('woodcutting', 'cut_ash', 'Ash Tree', 1, 3000, 7, 'ash_log', '#b89a72', [{ id: 'ash_resin', chance: 0.03, qty: 1 }]),
  { ...gather('woodcutting', 'cut_ley', 'Ley-touched Ash', 8, 3500, 10, 'ash_log', '#b9a7ff', [{ id: 'arcane_dust', chance: 1, qty: 1 }, { id: 'ash_resin', chance: 0.04, qty: 1 }]), outputChance: ALT_YIELD },
  { ...gather('woodcutting', 'cut_oak', 'Oak Tree', 15, 3500, 18, 'oak_log', '#8a6338', [{ id: 'oak_resin', chance: 0.03, qty: 1 }]), area: 'ashwood' },
  { ...gather('woodcutting', 'cut_weeping', 'Weeping Oak', 18, 4000, 21, 'oak_log', '#b07a2c', [{ id: 'oak_resin', chance: 0.1, qty: 1 }]), outputChance: ALT_YIELD, area: 'ashwood' },
  { ...gather('woodcutting', 'cut_crag_oak', 'Crag Oak', 15, 3500, 20, 'oak_log', '#9a7040', [{ id: 'oak_resin', chance: 0.08, qty: 1 }]), agility: AGILITY_SPOT_LEVEL.cut_crag_oak },
  { ...gather('woodcutting', 'cut_yew', 'Yew Tree', 30, 4000, 38, 'yew_log', '#6b3d2c'), area: 'shipgrave' },

  gather('harvesting', 'herb_sun', 'Sunpetal Patch', 1, 3000, 7, 'sunpetal', '#f2c94c', [{ id: 'essence_vitality_1', chance: 0.06, qty: 1 }]),
  {
    ...gather('harvesting', 'herb_emberbloom', 'Emberbloom Bed', 6, 3500, 9, 'sunpetal', '#ff8a4a', [
      { id: 'essence_embers_1', chance: 0.06, qty: 1 },
      { id: 'essence_storm_1', chance: 0.06, qty: 1 },
    ]),
    outputChance: ALT_YIELD,
  },
  {
    ...gather('harvesting', 'herb_frost', 'Frostleaf Thicket', 12, 3500, 16, 'frostleaf', '#7fc8f8', [
      { id: 'essence_frost_2', chance: 0.05, qty: 1 },
      { id: 'essence_vitality_2', chance: 0.02, qty: 1 },
    ]),
    area: 'ashwood',
  },
  {
    ...gather('harvesting', 'herb_windreed', 'Windreed Marsh', 16, 4000, 19, 'frostleaf', '#a8d8b0', [
      { id: 'essence_embers_2', chance: 0.05, qty: 1 },
      { id: 'essence_storm_2', chance: 0.05, qty: 1 },
      { id: 'essence_haste_2', chance: 0.02, qty: 1 },
    ]),
    outputChance: ALT_YIELD,
    area: 'ashwood',
  },
  { ...gather('harvesting', 'herb_ember', 'Emberroot Bed', 25, 4000, 32, 'emberroot', '#e2603f'), area: 'crypt' },
  {
    ...gather('harvesting', 'herb_ledge', 'Ledge Garden', 25, 4000, 34, 'emberroot', '#e88a5a', [
      { id: 'essence_embers_2', chance: 0.05, qty: 1 },
      { id: 'essence_haste_2', chance: 0.04, qty: 1 },
    ]),
    agility: AGILITY_SPOT_LEVEL.herb_ledge,
  },
  { ...gather('harvesting', 'herb_void', 'Voidbloom Grove', 40, 5000, 55, 'voidbloom', '#9b6dde'), area: 'stormcliffs' },
].map((a) => ({ ...a, bonus: [...(a.bonus ?? []), { id: SHARD_FOR[a.skill]!, chance: SHARD_CHANCE, qty: 1 }] }));

/** Turn gathered logs into compact construction materials instead of asking station upgrades for thousands of logs. */
const MILLING: SkillAction[] = [
  { id: 'mill_ash', skill: 'woodcutting', name: 'Cut Ash Planks', level: 1, intervalMs: 3000, xp: 8, inputs: { ash_log: 5 }, outputs: { ash_plank: 1 }, color: '#b89a72' },
  { id: 'mill_oak', skill: 'woodcutting', name: 'Cut Oak Planks', level: 15, intervalMs: 3500, xp: 20, inputs: { oak_log: 5 }, outputs: { oak_plank: 1 }, color: '#8a6338', area: 'ashwood' },
  { id: 'mill_yew', skill: 'woodcutting', name: 'Cut Yew Planks', level: 30, intervalMs: 4000, xp: 42, inputs: { yew_log: 5 }, outputs: { yew_plank: 1 }, color: '#6b3d2c', area: 'shipgrave' },
];

const mark = (id: string, name: string, level: number, intervalMs: number, xp: number, gold: number, marker: number, color: string, extra: SkillAction['bonus'] = []): SkillAction => ({
  id, skill: 'thieving', name, level, intervalMs, xp, outputs: { gold }, bonus: [{ id: MARKER, chance: marker, qty: 1 }, ...extra], color,
});

/** Marks: no inputs, level-only gathering. A fence's mark trades its purse for Markers. */
const THIEVING: SkillAction[] = [
  mark('mark_peddler', 'Road Peddler', 1, 3000, 7, 3, 0.12, '#a0603a'),
  mark('mark_hauler', 'Salt Hauler', 6, 3500, 11, 6, 0.14, '#b8b09a'),
  { ...mark('mark_runner', "Fence's Runner", 9, 3500, 12, 6, 0.3, '#c9a35a'), outputChance: ALT_YIELD },
  mark('mark_outrider', 'Khanate Outrider', 13, 3500, 16, 10, 0.16, '#7a7a4a'),
  mark('mark_factor', 'Caravan Factor', 19, 4000, 22, 18, 0.18, '#b08a5a', [{ id: SEAL, chance: 0.002, qty: 1 }]),
  { ...mark('mark_quartermaster', 'Khanate Quartermaster', 23, 4000, 24, 18, 0.4, '#d0a860'), outputChance: ALT_YIELD },
  mark('mark_warden', 'Barrow Warden', 28, 4000, 28, 30, 0.2, '#6f7a8a', [{ id: WAX, chance: 0.002, qty: 1 }]),
  mark('mark_collector', 'Tax Collector', 35, 4500, 34, 48, 0.22, '#6a78a0'),
  mark('mark_acolyte', 'Pyre Acolyte', 42, 5000, 41, 75, 0.25, '#c0502a', [{ id: SEAL, chance: 0.003, qty: 1 }, { id: WAX, chance: 0.002, qty: 1 }]),
  mark('mark_steward', "Khan's Steward", 52, 5000, 46, 110, 0.28, '#e0702a', [{ id: SEAL, chance: 0.004, qty: 1 }, { id: WAX, chance: 0.003, qty: 1 }]),
];

/** Digs: no inputs. Most of a dig is dirt, so `outputChance` is how often it turns up an Artifact; the Reliquary's come from every people, in digDone. */
const ARCHAEOLOGY: SkillAction[] = SITES.map((x) => ({
  accomplishments: TRAIL.indexOf(x.id) > 0 ? [`passport.${x.id}`] : [],
  id: x.id,
  skill: 'archaeology' as const,
  name: x.name,
  level: x.level,
  intervalMs: x.intervalMs,
  xp: x.xp,
  outputs: x.relic ? {} : { [CULTURES.find((c) => c.id === x.culture)!.artifact]: 1 },
  outputChance: x.relic ? 0 : digChance(x),
  color: x.color,
  gate: EXPEDITION_GATE,
}));

/** Stargazing: no inputs, level-only. Stardust is spent on the Star Chart (engine/astrology.ts). */
const ASTROLOGY: SkillAction[] = CONSTELLATIONS.map((x) => ({
  id: `study_${x.id}`,
  skill: 'astrology' as const,
  name: `Study ${x.name}`,
  level: x.level,
  intervalMs: x.intervalMs,
  xp: x.xp,
  outputs: { [STARDUST]: x.dust },
  bonus: [{ id: GILDED_STARDUST, chance: x.gilded, qty: 1 }],
  color: x.color,
}));

/** Fishing is coming soon. It has always been coming soon. */
const FISHING: SkillAction[] = [
  { ...gather('fishing', 'fish_mudflat', 'Mudflat Shallows', 1, 3000, 7, 'mudskipper', '#8a7b5a', [{ id: 'soggy_boot', chance: 0.05, qty: 1 }]), soon: true },
  { ...gather('fishing', 'fish_brine', 'Brinecave Pool', 10, 3500, 14, 'blind_brinefish', '#5f8f9e', [{ id: 'soggy_boot', chance: 0.05, qty: 1 }]), soon: true },
  { ...gather('fishing', 'fish_reed', 'Blackreed Creek', 20, 4000, 22, 'reed_eel', '#3f6a4a', [{ id: 'message_bottle', chance: 0.02, qty: 1 }]), soon: true },
  { ...gather('fishing', 'fish_wreck', 'Shipgrave Wreck', 30, 4000, 34, 'drowned_grouper', '#3d5f8a', [{ id: 'message_bottle', chance: 0.03, qty: 1 }]), soon: true },
  { ...gather('fishing', 'fish_storm', 'Stormcliff Surf', 40, 5000, 50, 'thunder_marlin', '#f2d14c', [{ id: 'tasalio_scale', chance: 0.001, qty: 1 }]), soon: true },
];

export function isWoodcraftBase(b: BaseDef): boolean {
  if (b.slot === 'weapon' && (b.family === 'bow' || b.family === 'wand' || b.family === 'staff')) return true;
  if (b.slot === 'offhand' && !b.tags.includes('str_armour')) return true;
  if (b.tags.includes('armour') && !b.tags.includes('str_armour') && (b.tags.includes('dex_armour') || b.tags.includes('int_armour'))) return true;
  return false;
}

export function equipmentSkill(b: BaseDef): 'smithing' | 'woodcrafting' {
  return isWoodcraftBase(b) ? 'woodcrafting' : 'smithing';
}

function smithInputs(b: BaseDef): Record<string, number> {
  const tier = b.reqLevel < 10 ? 0 : b.reqLevel < 22 ? 1 : 2;
  const bar = ['copper_bar', 'iron_bar', 'mithril_bar'][tier];
  const plank = ['ash_plank', 'oak_plank', 'yew_plank'][tier];
  const wood = isWoodcraftBase(b);
  const size: Record<string, [number, number]> = {
    weapon: [3, 1],
    offhand: [3, 2],
    helmet: [2, 1],
    body: [4, 1],
    gloves: [2, 1],
    boots: [2, 1],
    belt: [2, 1],
    amulet: [1, 0],
    ring: [1, 0],
  };
  const [pri, sec] = size[b.slot];
  const inputs: Record<string, number> = {};
  if (wood) {
    const woodPri = b.slot === 'weapon' ? 1 : pri;
    inputs[plank] = woodPri + tier;
    if (sec > 0) inputs[bar] = sec;
  } else {
    inputs[bar] = pri + tier;
    if (sec > 0) inputs[plank] = sec;
  }
  if (b.slot === 'amulet' || b.slot === 'ring') inputs.rough_gem = 1 + tier;
  return inputs;
}

const EQUIPMENT_ACTIONS: SkillAction[] = BASES.filter((b) => !b.projectOnly).map((b) => ({
  id: `smith_${b.id}`,
  skill: equipmentSkill(b),
  name: b.name,
  level: Math.max(1, b.reqLevel),
  intervalMs: 10000 + b.reqLevel * 100,
  xp: 24 + b.reqLevel * 6,
  inputs: smithInputs(b),
  baseId: b.id,
  color: isWoodcraftBase(b) ? '#9c7a4c' : '#b8b8c8',
}));

/** Construction bars give gathered ore a deliberate refining step before it becomes a station upgrade. */
const SMELTING: SkillAction[] = [
  { id: 'smelt_copper', skill: 'smelting', name: 'Smelt Copper Bars', level: 1, intervalMs: 3000, xp: 8, inputs: { copper_ore: 5 }, outputs: { copper_bar: 1 }, color: '#c8743f' },
  { id: 'smelt_iron', skill: 'smelting', name: 'Smelt Iron Bars', level: 15, intervalMs: 3500, xp: 20, inputs: { iron_ore: 5 }, outputs: { iron_bar: 1 }, color: '#9aa3ad', area: 'ashwood' },
  { id: 'smelt_mithril', skill: 'smelting', name: 'Smelt Mithril Bars', level: 30, intervalMs: 4000, xp: 42, inputs: { mithril_ore: 5 }, outputs: { mithril_bar: 1 }, color: '#6fc3d8', area: 'shipgrave' },
];

const ALCHEMY: SkillAction[] = [
  { id: 'brew_life_small', skill: 'alchemy', name: 'Small Life Flask', level: 1, intervalMs: 4000, xp: 12, inputs: { sunpetal: 5, ash_log: 2 }, flaskId: 'life_small', color: '#d6453d' },
  { id: 'brew_mana_small', skill: 'alchemy', name: 'Small Mana Flask', level: 4, intervalMs: 4000, xp: 14, inputs: { sunpetal: 4, ash_log: 3 }, flaskId: 'mana_small', color: '#3d6fd6' },
  { id: 'orb_transmute', skill: 'alchemy', name: 'Orb of Transmutation', level: 1, intervalMs: 3500, xp: 10, inputs: { arcane_dust: 3, sunpetal: 2 }, outputs: { transmute: 1 }, color: '#7fb2ff' },
  { id: 'orb_augment', skill: 'alchemy', name: 'Orb of Augmentation', level: 6, intervalMs: 3500, xp: 14, inputs: { arcane_dust: 4, sunpetal: 3 }, outputs: { augment: 1 }, color: '#5f8de0' },
  { id: 'orb_alteration', skill: 'alchemy', name: 'Orb of Alteration', level: 10, intervalMs: 3500, xp: 18, inputs: { arcane_dust: 5, frostleaf: 2 }, outputs: { alteration: 1 }, color: '#9fd2ff' },
  { id: 'brew_life_medium', skill: 'alchemy', name: 'Medium Life Flask', level: 15, intervalMs: 5000, xp: 35, inputs: { frostleaf: 8, oak_log: 3 }, flaskId: 'life_medium', color: '#d6453d', area: 'ashwood' },
  { id: 'orb_scour', skill: 'alchemy', name: 'Orb of Scouring', level: 18, intervalMs: 4500, xp: 30, inputs: { arcane_dust: 10, frostleaf: 3 }, outputs: { scour: 1 }, color: '#d9d9d9', area: 'ashwood' },
  { id: 'brew_granite', skill: 'alchemy', name: 'Granite Flask', level: 20, intervalMs: 5000, xp: 45, inputs: { frostleaf: 6, iron_ore: 6 }, flaskId: 'granite', color: '#9b8e7e', area: 'ashwood' },
  { id: 'brew_ruby', skill: 'alchemy', name: 'Ruby Flask', level: 23, intervalMs: 5000, xp: 50, inputs: { emberroot: 6, rough_gem: 1 }, flaskId: 'ruby', color: '#ff6a5a', area: 'crypt' },
  { id: 'brew_quicksilver', skill: 'alchemy', name: 'Quicksilver Flask', level: 26, intervalMs: 5000, xp: 55, inputs: { emberroot: 8, sunpetal: 6 }, flaskId: 'quicksilver', color: '#c9d3dc', area: 'crypt' },
  { id: 'orb_regret', skill: 'alchemy', name: 'Orb of Regret', level: 28, intervalMs: 5000, xp: 50, inputs: { arcane_dust: 14, emberroot: 3 }, outputs: { regret: 1 }, color: '#8fbf7a', area: 'crypt' },
  { id: 'brew_amethyst', skill: 'alchemy', name: 'Amethyst Flask', level: 30, intervalMs: 5500, xp: 65, inputs: { voidbloom: 5, rough_gem: 1 }, flaskId: 'amethyst', color: '#a36bdc', area: 'shipgrave' },
  { id: 'brew_life_grand', skill: 'alchemy', name: 'Grand Life Flask', level: 32, intervalMs: 6000, xp: 80, inputs: { emberroot: 10, yew_log: 3 }, flaskId: 'life_grand', color: '#d6453d', area: 'shipgrave' },
  { id: 'brew_diamond', skill: 'alchemy', name: 'Diamond Flask', level: 36, intervalMs: 6000, xp: 90, inputs: { voidbloom: 6, rough_gem: 2 }, flaskId: 'diamond', color: '#bfe3ff', area: 'stormcliffs' },
  { id: 'brew_mana_sacred', skill: 'alchemy', name: 'Sacred Mana Flask', level: 42, intervalMs: 6000, xp: 110, inputs: { frost_extract: 3, yew_log: 2 }, flaskId: 'mana_sacred', color: '#4f82e8', gate: COOKING_GATE },
  { id: 'brew_life_sacred', skill: 'alchemy', name: 'Sacred Life Flask', level: 46, intervalMs: 7000, xp: 140, inputs: { ember_reduction: 3, yew_log: 3 }, flaskId: 'life_sacred', color: '#e0584f', gate: COOKING_GATE },
  { id: 'brew_sulphur', skill: 'alchemy', name: 'Sulphur Flask', level: 50, intervalMs: 7000, xp: 170, inputs: { void_distillate: 3, rough_gem: 3 }, flaskId: 'sulphur', color: '#d8c94a', gate: COOKING_GATE },
  { id: 'orb_alchemy', skill: 'alchemy', name: 'Orb of Alchemy', level: 40, intervalMs: 6000, xp: 90, inputs: { arcane_dust: 25, voidbloom: 2 }, outputs: { alchemy: 1 }, color: '#f0c14b', area: 'shipgrave' },
];

const FUSING: SkillAction[] = Object.entries(SHARD_ORB).map(([shard, orb]) => ({
  id: `fuse_${shard}`,
  skill: 'alchemy' as const,
  name: `Fuse ${orb === 'augment' ? 'Augmentation' : orb === 'transmute' ? 'Transmutation' : 'Alteration'} Shards`,
  level: 1,
  intervalMs: 1000,
  xp: 2,
  inputs: { [shard]: SHARDS_PER_ORB },
  outputs: { [orb]: 1 },
  color: '#9fb8e0',
}));

/** ×10 orb recipes: 15% cheaper per orb, for long idle sessions. */
export const BATCH_SIZE = 10;
export const BATCH_INPUT_MULT = 8.5;

const BATCHES: SkillAction[] = ALCHEMY.filter((a) => a.outputs && !a.flaskId).map((a) => ({
  ...a,
  id: `${a.id}_x${BATCH_SIZE}`,
  name: `${a.name} ×${BATCH_SIZE}`,
  intervalMs: a.intervalMs * BATCH_SIZE,
  xp: a.xp * BATCH_SIZE,
  inputs: Object.fromEntries(Object.entries(a.inputs!).map(([id, n]) => [id, Math.ceil(n * BATCH_INPUT_MULT)])),
  outputs: Object.fromEntries(Object.entries(a.outputs!).map(([id, n]) => [id, n * BATCH_SIZE])),
  batch: BATCH_SIZE,
  batchOf: a.id,
}));

/** Cut gems are a slow, costly pick from the whole pool: drops and the trader stay the main source. */
const GEMCUTTING: SkillAction[] = [
  { id: 'cut_skill', skill: 'gemcutting', name: 'Skill Gem', level: 1, intervalMs: 20000, xp: 50, inputs: { rough_gem: 3, arcane_dust: 30 }, gem: { kind: 'skill' }, color: '#6fa8ff' },
  { id: 'cut_support', skill: 'gemcutting', name: 'Support Gem', level: 10, intervalMs: 25000, xp: 90, inputs: { rough_gem: 4, arcane_dust: 40, frostleaf: 4 }, gem: { kind: 'support' }, color: '#5fbf6a' },
  { id: 'cut_signature', skill: 'gemcutting', name: 'Signature Support Gem', level: 25, intervalMs: 30000, xp: 160, inputs: { rough_gem: 6, arcane_dust: 60, emberroot: 5 }, gem: { kind: 'signature' }, color: '#e0a640' },
  { id: 'cut_expansion', skill: 'gemcutting', name: 'Orb of Expansion', level: 45, intervalMs: 30000, xp: 250, inputs: { rough_gem: 8, arcane_dust: 40, voidbloom: 4 }, outputs: { expansion: 1 }, color: '#c08bff' },
  ...GEMCUTTING_EXPANSION_ACTIONS,
];

/** One recipe per rune. Later families in a grade open two levels apart, so there's always a next one to reach. */
const RUNECARVING: SkillAction[] = [
  ...RUNES.map((r) => {
    const flavour = r.grade.grade <= 2 ? r.family.flavour.low : r.family.flavour.high;
    return {
      id: `carve_${r.id}`,
      skill: 'runecarving' as const,
      name: r.name,
      level: r.grade.level + RUNE_FAMILIES.indexOf(r.family) * 2,
      intervalMs: r.grade.intervalMs,
      xp: r.grade.xp,
      inputs: { ...r.grade.inputs, [flavour]: r.grade.flavour },
      outputs: { [r.id]: 1 },
      accomplishments: r.grade.grade >= 2 ? [`rune_${r.family.id}_grade_${r.grade.grade - 1}_practice`] : undefined,
      color: r.family.color,
    };
  }),
  {
    id: 'prepare_return_inscription',
    skill: 'runecarving',
    name: 'Prepare Return Inscription',
    level: 65,
    intervalMs: 60000,
    xp: 120,
    inputs: { inscription_fragment: 10, rune_keen_3: 1 },
    protectedOutputs: { return_inscription: 1 },
    color: '#6fa8ff',
  },
  {
    id: 'prepare_choir_inscription',
    skill: 'runecarving',
    name: 'Prepare Choir Inscription',
    level: 70,
    intervalMs: 60000,
    xp: 150,
    inputs: { inscription_fragment: 10, rune_blood_3: 1 },
    protectedOutputs: { choir_inscription: 1 },
    color: '#d6453d',
  },
  {
    id: 'prepare_circuit_inscription',
    skill: 'runecarving',
    name: 'Prepare Circuit Inscription',
    level: 70,
    intervalMs: 60000,
    xp: 150,
    inputs: { inscription_fragment: 10, rune_storm_3: 1 },
    protectedOutputs: { circuit_inscription: 1 },
    color: '#f2d14c',
  },
  {
    id: 'inscribe_convergence',
    skill: 'runecarving',
    name: 'Inscribe Convergence',
    level: 90,
    intervalMs: 120000,
    xp: 300,
    inputs: { inscription_fragment: 5, rune_stone_4: 1 },
    protectedOutputs: { convergence_inscription: 1 },
    color: '#9b8e7e',
  },
];

const cook = (id: string, name: string, level: number, intervalMs: number, xp: number, inputs: Record<string, number>, color: string): SkillAction => ({
  id: `cook_${id}`, skill: 'cooking', name, level, intervalMs, xp, inputs, outputs: { [id]: 1 }, color,
});

const cookProtected = (id: string, name: string, level: number, intervalMs: number, xp: number, inputs: Record<string, number>, color: string): SkillAction => ({
  id: `cook_${id}`, skill: 'cooking', name, level, intervalMs, xp, inputs, protectedOutputs: { [id]: 1 }, color,
});

/** Plants in, a meal or a flask ingredient out. Never fish: the fish have not been told. */
const COOKING: SkillAction[] = [
  cook('meal_porridge', 'Sunpetal Porridge', 1, 4000, 12, { sunpetal: 3 }, '#f2c94c'),
  cook('meal_broth', 'Frostleaf Broth', 6, 4000, 18, { frostleaf: 2, sunpetal: 2 }, '#7fc8f8'),
  cook('meal_hash', "Forager's Hash", 10, 4500, 26, { frostleaf: 3, sunpetal: 3 }, '#a8b860'),
  cook('meal_gatherer', "Gatherer's Ration", 10, 5000, 30, { sunpetal: 4, frostleaf: 2 }, '#68b04d'),
  cook('frost_extract', 'Frostleaf Extract', 15, 5000, 34, { frostleaf: 12, essence_frost_2: 1 }, '#7fc8f8'),
  cook('meal_chilli', 'Emberroot Chilli', 20, 5000, 42, { emberroot: 3, frostleaf: 2 }, '#e2603f'),
  cook('meal_artisan', "Artisan's Lunch", 20, 6000, 50, { frostleaf: 3, emberroot: 3 }, '#c28546'),
  cook('meal_chowder', 'Stormwatch Chowder', 26, 5500, 55, { emberroot: 4, frostleaf: 2 }, '#d8c070'),
  cook('ember_reduction', 'Emberroot Reduction', 30, 6000, 70, { emberroot: 14, essence_vitality_2: 1 }, '#e2603f'),
  cook('meal_roast', 'Slow Root Roast', 35, 6000, 80, { emberroot: 5, yew_log: 1 }, '#b0603a'),
  cook('meal_curry', 'Voidbloom Curry', 40, 7000, 100, { voidbloom: 3, emberroot: 2 }, '#9b6dde'),
  cook('void_distillate', 'Voidbloom Distillate', 45, 8000, 125, { voidbloom: 12, essence_haste_2: 1 }, '#9b6dde'),
  cook('meal_table', "Captain's Table", 50, 10000, 170, { voidbloom: 5, emberroot: 3, sunpetal: 3, yew_log: 1 }, '#e0a640'),
  cookProtected('meal_moon_signature', 'Moonfall Consommé', 50, 60000, 300, { moon_bloom: 1, frostleaf: 10 }, '#82aaff'),
  cookProtected('binding_stock', 'Binding Stock', 55, 30000, 250, { moon_bloom: 1, emberroot: 10, sunpetal: 10 }, '#c29d62'),
  cookProtected('meal_star_signature', 'Starlight Banquet', 65, 60000, 400, { star_bloom: 1, voidbloom: 10 }, '#ffd700'),
];

const sheet = (id: string, name: string, level: number, intervalMs: number, xp: number, inputs: Record<string, number>, color: string): SkillAction => ({
  id: `chart_${id}`, skill: 'cartography', name, level, intervalMs, xp, inputs, outputs: { [id]: 1 }, color, gate: CARTOGRAPHY_GATE,
});

function scaleInputs(inputs: Record<string, number>, mult = 1): Record<string, number> {
  return Object.fromEntries(Object.entries(inputs).map(([id, n]) => [id, n * mult]));
}

/** One plain map recipe per tier: drawn at tier 1, upgraded from the tier below after that. */
const CHARTS: SkillAction[] = CHART_TIERS.map((c): SkillAction => ({
  id: `chart_t${c.tier}`,
  skill: 'cartography',
  name: `${c.tier === 1 ? 'Draw' : 'Upgrade'}: Map Tier ${c.tier}`,
  level: c.level,
  intervalMs: c.intervalMs,
  xp: c.xp,
  inputs: scaleInputs(c.inputs),
  chart: { tier: c.tier, qty: 1, upgrade: c.tier > 1 },
  color: '#8a7ad8',
  gate: CARTOGRAPHY_GATE,
}));

/** The long-night recipe: a stack of Tier 1 maps, cheaper per map. */
const FOLIOS: SkillAction[] = [
  {
    id: 'chart_folio_t1',
    skill: 'cartography',
    name: 'Folio: Map Tier 1',
    level: FOLIO_LEVEL,
    intervalMs: CHART_TIERS[0].intervalMs * FOLIO_SIZE,
    xp: CHART_TIERS[0].xp * FOLIO_SIZE,
    inputs: scaleInputs(CHART_TIERS[0].inputs, FOLIO_COST),
    chart: { tier: MAP_TIERS[0].tier, qty: FOLIO_SIZE },
    color: '#a89ae8',
    gate: CARTOGRAPHY_GATE,
  },
];

const SEXTANT_CHARTS: SkillAction[] = SEXTANT_RECIPES.map((r) =>
  sheet(r.id, r.name, r.level, r.intervalMs, r.xp, r.inputs, r.color),
);

/** Logs into vellum, plants into ink, and both into plain maps and Sextants. */
const CARTOGRAPHY: SkillAction[] = [
  { id: 'chart_endgame_atlas', name: 'Complete Atlas Chart', skill: 'cartography', level: 85, intervalMs: 120_000, xp: 1000,
    inputs: { fine_vellum: 10, sepia_ink: 5, sextant_master: 1, atlas_survey_record: 1 }, protectedOutputs: { completed_atlas_chart: 1 }, color: '#a89ae8' },
  // dependable Uber access: ten Doom Key Fragments (one per Doomed victory) forge the chosen existing key
  ...([['uber_key_1', 'The Mirror', '#d0569b'], ['uber_key_2', 'The Ruin', '#e85a4f'], ['uber_key_3', 'The Void', '#9b6dde']] as const).map(([key, name, color]): SkillAction => ({
    id: `forge_${key}`, name: `Forge Uber Key: ${name}`, skill: 'cartography', level: 85, intervalMs: 60_000, xp: 500,
    inputs: { doom_key_fragment: 10 }, protectedOutputs: { [key]: 1 }, color,
  })),
  sheet('vellum', 'Vellum', 1, 3500, 10, { ash_log: 4 }, '#d8c8a0'),
  sheet('gall_ink', 'Gall Ink', 4, 4000, 14, { sunpetal: 3, iron_ore: 1 }, '#46506a'),
  sheet('fine_vellum', 'Fine Vellum', 15, 5000, 40, { oak_log: 5, vellum: 2 }, '#f0e4c4'),
  sheet('sepia_ink', 'Sepia Ink', 20, 5500, 55, { emberroot: 3, gall_ink: 1, arcane_dust: 4 }, '#8a5a34'),
  ...SEXTANT_CHARTS,
  ...CHARTS,
  ...FOLIOS,
];

/** Hard-boss arena keys: deterministic life-skill path alongside map Sextant hunting. */
export const BOSS_KEY_CRAFTS: SkillAction[] = [
  { id: 'smith_marrow_key', skill: 'smithing', name: 'Marrow Key', level: 60, intervalMs: 25000, xp: 350, inputs: { mithril_bar: 8, dense_fossil: 2, serrated_fossil: 2 }, outputs: { marrow_key: 1 }, color: '#b8a890', gate: CARTOGRAPHY_GATE },
  { id: 'cut_bell_key', skill: 'gemcutting', name: 'Bell Key', level: 60, intervalMs: 25000, xp: 350, inputs: { rough_gem: 6, arcane_dust: 80, metallic_fossil: 2 }, outputs: { bell_key: 1 }, color: '#f2d14c', gate: CARTOGRAPHY_GATE },
  { id: 'brew_abyssal_key', skill: 'alchemy', name: 'Abyssal Key', level: 60, intervalMs: 25000, xp: 350, inputs: { void_distillate: 2, frigid_fossil: 2, arcane_dust: 60 }, outputs: { abyssal_key: 1 }, color: '#5f8f9e', gate: CARTOGRAPHY_GATE },
  { id: 'carve_regent_key', skill: 'runecarving', name: 'Joined Regent Key', level: 60, intervalMs: 25000, xp: 350, inputs: { scorched_fossil: 2, frigid_fossil: 2, arcane_dust: 80 }, outputs: { regent_key: 1 }, color: '#e2603f', gate: CARTOGRAPHY_GATE },
  { id: 'smith_crownless_key', skill: 'smithing', name: 'Crownless Key (Keys)', level: 70, intervalMs: 30000, xp: 500, inputs: { marrow_key: 1, bell_key: 1, abyssal_key: 1, regent_key: 1 }, outputs: { crownless_key: 1 }, color: '#d8c070', gate: CARTOGRAPHY_GATE },
  { id: 'smith_crownless_key_shards', skill: 'smithing', name: 'Crownless Key (Trophies)', level: 70, intervalMs: 30000, xp: 500, inputs: { marrow_shard: 2, choir_glass: 2, black_pearl: 2, throne_ash: 2 }, outputs: { crownless_key: 1 }, color: '#d8c070', gate: CARTOGRAPHY_GATE },
];

/** Global pacing knob for gathering/production xp (values above are authored at 1×). */
export const SKILL_XP_SCALE = 0.3;

const AUTHORED_ACTIONS: SkillAction[] = [...GATHERING, ...MINING_ACTIONS, ...WOODCUTTING_ACTIONS, ...FORAGING_ACTIONS, ...MILLING, ...THIEVING, ...AGILITY_ACTIONS, ...ARCHAEOLOGY, ...ARCHAEOLOGY_RECIPES, ...ASTROLOGY, ...FISHING, ...SMELTING, ...SMITH_COMPONENTS, ...EQUIPMENT_ACTIONS, ...purposeRecipes(EQUIPMENT_ACTIONS), ...ALCHEMY, ...ALCHEMY_EXPANSION_ACTIONS, ...FUSING, ...BATCHES, ...GEMCUTTING, ...RUNECARVING, ...COOKING, ...CARTOGRAPHY, ...BOSS_KEY_CRAFTS];
/** Historical access evidence used only by save migration. */
const ALL_AUTHORED_ACTIONS = [...AUTHORED_ACTIONS, ...WEAPON_COMPONENT_ACTIONS.filter((extra) => !AUTHORED_ACTIONS.some((a) => a.id === extra.id))];
export const LEGACY_ACTION_PLACES = Object.fromEntries(ALL_AUTHORED_ACTIONS.map((a) => [a.id, { area: a.area, gate: a.gate }]));
export const ACTIONS: SkillAction[] = ALL_AUTHORED_ACTIONS.map(({ area: _area, gate: _gate, ...a }) => ({
  ...a,
  mining: a.mining ?? (['mine_copper', 'mine_iron', 'mine_mithril'].includes(a.id) ? { metal: a.id.slice(5), mode: 'ordinary' as const } : undefined),
  woodcutting: a.woodcutting ?? (['cut_ash', 'cut_oak', 'cut_yew'].includes(a.id) ? { wood: a.id.slice(4), mode: 'ordinary' as const } : undefined),
  foraging: a.foraging ?? foragingSource(a),
  xp: Math.round(a.xp * SKILL_XP_SCALE * 10) / 10,
})).map((a) => ({ ...a, mastery: masteryForAction(a) })).flatMap((a) => [a, ...masteryBatches(a)]);

const BY_ID: Record<string, SkillAction> = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

function normalizeChartActionId(id: string): string {
  const m = /^chart_(?:barrows|stormvault)_t(\d+)$/.exec(id);
  if (m) return `chart_t${m[1]}`;
  if (/^chart_folio_(?:barrows|stormvault)$/.test(id)) return 'chart_folio_t1';
  return id;
}

export function actionDef(id: string): SkillAction {
  const a = BY_ID[normalizeChartActionId(id)];
  if (!a) throw new Error(`Unknown action ${id}`);
  return a;
}

export function hasAction(id: string): boolean {
  return normalizeChartActionId(id) in BY_ID;
}

export function actionsFor(skill: SkillId): SkillAction[] {
  return ACTIONS.filter((a) => a.skill === skill).sort((a, b) => a.level - b.level);
}
