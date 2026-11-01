import type { SkillId } from '../engine/types';
import { BASES, type BaseDef } from './bases';
import { CULTURES, digChance, EXPEDITION_GATE, SITES } from './expedition';
import { MARKER, SEAL, SHARD_CHANCE, SHARD_FOR, SHARD_ORB, SHARDS_PER_ORB, WAX } from './craftMats';
import { RUNE_FAMILIES, RUNE_GATE, RUNES } from './runes';

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
  mining: { id: 'mining', name: 'Mining', group: 'gathering', color: '#c8743f', verb: 'Mining', desc: 'Dig ore and gems for Smithing.' },
  woodcutting: { id: 'woodcutting', name: 'Woodcutting', group: 'gathering', color: '#6fae4a', verb: 'Chopping', desc: 'Fell trees for hafts, frames and flask stoppers.' },
  // id kept as `harvesting` so saves, tree nodes and the Greenhouse don't need migrating
  harvesting: { id: 'harvesting', name: 'Foraging', group: 'gathering', color: '#d9b84a', verb: 'Foraging', desc: 'Pick herbs off the ground for Alchemy.' },
  thieving: { id: 'thieving', name: 'Thieving', group: 'gathering', color: '#c9a35a', verb: 'Thieving', desc: "Lift purses for gold and Rogue's Markers, then spend them on Heists against the Khanate." },
  archaeology: { id: 'archaeology', name: 'Archaeology', group: 'gathering', color: '#b0784a', verb: 'Digging', desc: 'Dig sites in the Hollow Peaks for Artifacts, then trade them with the merchants of the Expedition for currency.' },
  smithing: { id: 'smithing', name: 'Smithing', group: 'production', color: '#b8b8c8', verb: 'Smithing', desc: 'Forge equipment bases. Higher level → higher item level.' },
  alchemy: { id: 'alchemy', name: 'Alchemy', group: 'production', color: '#9b6dde', verb: 'Brewing', desc: 'Brew flasks and transmute dust into orbs.' },
  gemcutting: { id: 'gemcutting', name: 'Gemcutting', group: 'production', color: '#4fc1a6', verb: 'Cutting', desc: 'Cut rough gems into skill and support gems.' },
  runecarving: { id: 'runecarving', name: 'Rune-carving', group: 'production', color: '#6fa8ff', verb: 'Carving', desc: 'Carve old materials into runes, then inscribe them in the rune slot on your gear.' },
  fishing: { id: 'fishing', name: 'Fishing', group: 'gathering', color: '#4fa3d9', verb: 'Fishing', desc: 'Cast a line into the waters of Wraeclast.', soon: true },
};

/** Planned skills shown on the Coming soon page; none exist in the engine yet. */
export const UPCOMING_SKILLS: { name: string; theme: string; icon: string; color: string; desc: string }[] = [
  { name: 'Cartography', theme: 'Maps', icon: 'map', color: '#8a7ad8', desc: 'Draw and upgrade maps for the Map Device.' },
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
  /** alchemy: produces a flask */
  flaskId?: string;
  /** gemcutting: produces a random gem of this kind */
  gem?: { kind: 'skill' | 'support' | 'signature' };
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
  /** listed but can never be started (every Fishing spot) */
  soon?: boolean;
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
  { ...gather('mining', 'mine_mithril', 'Mithril Vein', 30, 4000, 38, 'mithril_ore', '#6fc3d8', [{ id: 'rough_gem', chance: 0.05, qty: 1 }]), area: 'shipgrave' },

  gather('woodcutting', 'cut_ash', 'Ash Tree', 1, 3000, 7, 'ash_log', '#b89a72', [{ id: 'ash_resin', chance: 0.03, qty: 1 }]),
  { ...gather('woodcutting', 'cut_ley', 'Ley-touched Ash', 8, 3500, 10, 'ash_log', '#b9a7ff', [{ id: 'arcane_dust', chance: 1, qty: 1 }, { id: 'ash_resin', chance: 0.04, qty: 1 }]), outputChance: ALT_YIELD },
  { ...gather('woodcutting', 'cut_oak', 'Oak Tree', 15, 3500, 18, 'oak_log', '#8a6338', [{ id: 'oak_resin', chance: 0.03, qty: 1 }]), area: 'ashwood' },
  { ...gather('woodcutting', 'cut_weeping', 'Weeping Oak', 18, 4000, 21, 'oak_log', '#b07a2c', [{ id: 'oak_resin', chance: 0.1, qty: 1 }]), outputChance: ALT_YIELD, area: 'ashwood' },
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
  { ...gather('harvesting', 'herb_void', 'Voidbloom Grove', 40, 5000, 55, 'voidbloom', '#9b6dde'), area: 'stormcliffs' },
].map((a) => ({ ...a, bonus: [...(a.bonus ?? []), { id: SHARD_FOR[a.skill]!, chance: SHARD_CHANCE, qty: 1 }] }));

const mark = (id: string, name: string, level: number, intervalMs: number, xp: number, gold: number, marker: number, area: string, color: string, extra: SkillAction['bonus'] = []): SkillAction => ({
  id, skill: 'thieving', name, level, intervalMs, xp, outputs: { gold }, bonus: [{ id: MARKER, chance: marker, qty: 1 }, ...extra], color, area,
});

/** Marks: no inputs, like a gathering node, and each Act 2 area adds some. A fence's mark trades its purse for Markers. */
const THIEVING: SkillAction[] = [
  mark('mark_peddler', 'Road Peddler', 1, 3000, 7, 3, 0.12, 'cinderroad', '#a0603a'),
  mark('mark_hauler', 'Salt Hauler', 6, 3500, 11, 6, 0.14, 'saltflats', '#b8b09a'),
  { ...mark('mark_runner', "Fence's Runner", 9, 3500, 12, 6, 0.3, 'saltflats', '#c9a35a'), outputChance: ALT_YIELD },
  mark('mark_outrider', 'Khanate Outrider', 13, 3500, 16, 10, 0.16, 'blackgrass', '#7a7a4a'),
  mark('mark_factor', 'Caravan Factor', 19, 4000, 22, 18, 0.18, 'caravan', '#b08a5a', [{ id: SEAL, chance: 0.002, qty: 1 }]),
  { ...mark('mark_quartermaster', 'Khanate Quartermaster', 23, 4000, 24, 18, 0.4, 'caravan', '#d0a860'), outputChance: ALT_YIELD },
  mark('mark_warden', 'Barrow Warden', 28, 4000, 28, 30, 0.2, 'kurgans', '#6f7a8a', [{ id: WAX, chance: 0.002, qty: 1 }]),
  mark('mark_collector', 'Tax Collector', 35, 4500, 34, 48, 0.22, 'plateau', '#6a78a0'),
  mark('mark_acolyte', 'Pyre Acolyte', 42, 5000, 41, 75, 0.25, 'pyretemple', '#c0502a', [{ id: SEAL, chance: 0.003, qty: 1 }, { id: WAX, chance: 0.002, qty: 1 }]),
  mark('mark_steward', "Khan's Steward", 52, 5000, 46, 110, 0.28, 'burningthrone', '#e0702a', [{ id: SEAL, chance: 0.004, qty: 1 }, { id: WAX, chance: 0.003, qty: 1 }]),
];

/** Digs: no inputs and nothing to go wrong. Most of a dig is dirt, so `outputChance` is how often it turns up an Artifact. */
const ARCHAEOLOGY: SkillAction[] = SITES.map((x) => ({
  id: x.id,
  skill: 'archaeology' as const,
  name: x.name,
  level: x.level,
  intervalMs: x.intervalMs,
  xp: x.xp,
  outputs: { [CULTURES.find((c) => c.id === x.culture)!.artifact]: 1 },
  outputChance: digChance(x),
  color: x.color,
  gate: EXPEDITION_GATE,
}));

/** Fishing is coming soon. It has always been coming soon. */
const FISHING: SkillAction[] = [
  { ...gather('fishing', 'fish_mudflat', 'Mudflat Shallows', 1, 3000, 7, 'mudskipper', '#8a7b5a', [{ id: 'soggy_boot', chance: 0.05, qty: 1 }]), soon: true },
  { ...gather('fishing', 'fish_brine', 'Brinecave Pool', 10, 3500, 14, 'blind_brinefish', '#5f8f9e', [{ id: 'soggy_boot', chance: 0.05, qty: 1 }]), soon: true },
  { ...gather('fishing', 'fish_reed', 'Blackreed Creek', 20, 4000, 22, 'reed_eel', '#3f6a4a', [{ id: 'message_bottle', chance: 0.02, qty: 1 }]), soon: true },
  { ...gather('fishing', 'fish_wreck', 'Shipgrave Wreck', 30, 4000, 34, 'drowned_grouper', '#3d5f8a', [{ id: 'message_bottle', chance: 0.03, qty: 1 }]), soon: true },
  { ...gather('fishing', 'fish_storm', 'Stormcliff Surf', 40, 5000, 50, 'thunder_marlin', '#f2d14c', [{ id: 'tasalio_scale', chance: 0.001, qty: 1 }]), soon: true },
];

function smithInputs(b: BaseDef): Record<string, number> {
  const tier = b.reqLevel < 10 ? 0 : b.reqLevel < 22 ? 1 : 2;
  const ore = ['copper_ore', 'iron_ore', 'mithril_ore'][tier];
  const log = ['ash_log', 'oak_log', 'yew_log'][tier];
  const size: Record<string, [number, number]> = {
    weapon: [5, 2],
    offhand: [5, 3],
    helmet: [4, 1],
    body: [7, 2],
    gloves: [3, 1],
    boots: [3, 1],
    belt: [3, 2],
    amulet: [2, 0],
    ring: [2, 0],
  };
  const [o, l] = size[b.slot];
  const inputs: Record<string, number> = { [ore]: (o + tier * 2) * SMITH_COST_MULT };
  if (l > 0) inputs[log] = (l + tier) * SMITH_COST_MULT;
  if (b.slot === 'amulet' || b.slot === 'ring') inputs.rough_gem = 1 + tier;
  return inputs;
}

/**
 * Smithing is a slow, costly way to get a base: a weapon is ~45 s of mining and chopping plus
 * a 10 s forge, so drops stay the main source and smithing is for targeting a specific base.
 */
const SMITH_COST_MULT = 3;

const SMITHING: SkillAction[] = BASES.map((b) => ({
  id: `smith_${b.id}`,
  skill: 'smithing' as const,
  name: b.name,
  level: Math.max(1, b.reqLevel),
  intervalMs: 10000 + b.reqLevel * 100,
  xp: 24 + b.reqLevel * 6,
  inputs: smithInputs(b),
  baseId: b.id,
  color: '#b8b8c8',
}));

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
  { id: 'brew_life_grand', skill: 'alchemy', name: 'Grand Life Flask', level: 32, intervalMs: 6000, xp: 80, inputs: { emberroot: 10, yew_log: 3 }, flaskId: 'life_grand', color: '#d6453d', area: 'shipgrave' },
  { id: 'brew_diamond', skill: 'alchemy', name: 'Diamond Flask', level: 36, intervalMs: 6000, xp: 90, inputs: { voidbloom: 6, rough_gem: 2 }, flaskId: 'diamond', color: '#bfe3ff', area: 'stormcliffs' },
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
  { id: 'cut_support', skill: 'gemcutting', name: 'Support Gem', level: 10, intervalMs: 25000, xp: 90, inputs: { rough_gem: 4, arcane_dust: 40, frostleaf: 4 }, gem: { kind: 'support' }, color: '#5fbf6a', area: 'ashwood' },
  { id: 'cut_signature', skill: 'gemcutting', name: 'Signature Support Gem', level: 25, intervalMs: 30000, xp: 160, inputs: { rough_gem: 6, arcane_dust: 60, emberroot: 5 }, gem: { kind: 'signature' }, color: '#e0a640', area: 'crypt' },
  { id: 'cut_expansion', skill: 'gemcutting', name: 'Orb of Expansion', level: 45, intervalMs: 30000, xp: 250, inputs: { rough_gem: 8, arcane_dust: 40, voidbloom: 4 }, outputs: { expansion: 1 }, color: '#c08bff', area: 'stormcliffs' },
];

/** One recipe per rune. Later families in a grade open two levels apart, so there's always a next one to reach. */
const RUNECARVING: SkillAction[] = RUNES.map((r) => {
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
    color: r.family.color,
    gate: RUNE_GATE,
  };
});

/** Global pacing knob for gathering/production xp (values above are authored at 1×). */
export const SKILL_XP_SCALE = 0.3;

export const ACTIONS: SkillAction[] = [...GATHERING, ...THIEVING, ...ARCHAEOLOGY, ...FISHING, ...SMITHING, ...ALCHEMY, ...FUSING, ...BATCHES, ...GEMCUTTING, ...RUNECARVING].map((a) => ({
  ...a,
  xp: Math.round(a.xp * SKILL_XP_SCALE * 10) / 10,
}));

const BY_ID: Record<string, SkillAction> = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

export function actionDef(id: string): SkillAction {
  const a = BY_ID[id];
  if (!a) throw new Error(`Unknown action ${id}`);
  return a;
}

export function hasAction(id: string): boolean {
  return id in BY_ID;
}

export function actionsFor(skill: SkillId): SkillAction[] {
  return ACTIONS.filter((a) => a.skill === skill).sort((a, b) => a.level - b.level);
}
