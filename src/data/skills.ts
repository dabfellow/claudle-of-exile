import type { SkillId } from '../engine/types';
import { BASES, type BaseDef } from './bases';

export interface SkillDef {
  id: SkillId;
  name: string;
  group: 'combat' | 'gathering' | 'production';
  color: string;
  verb: string;
  desc: string;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  combat: { id: 'combat', name: 'Character', group: 'combat', color: '#e0a640', verb: 'Fighting', desc: 'Your character level: raises Life and Mana and grants passive points.' },
  mining: { id: 'mining', name: 'Mining', group: 'gathering', color: '#c8743f', verb: 'Mining', desc: 'Dig ore and gems for Smithing.' },
  woodcutting: { id: 'woodcutting', name: 'Woodcutting', group: 'gathering', color: '#6fae4a', verb: 'Chopping', desc: 'Fell trees for hafts, frames and flask stoppers.' },
  harvesting: { id: 'harvesting', name: 'Harvesting', group: 'gathering', color: '#d9b84a', verb: 'Harvesting', desc: 'Gather herbs for Alchemy.' },
  smithing: { id: 'smithing', name: 'Smithing', group: 'production', color: '#b8b8c8', verb: 'Smithing', desc: 'Forge equipment bases. Higher level → higher item level.' },
  alchemy: { id: 'alchemy', name: 'Alchemy', group: 'production', color: '#9b6dde', verb: 'Brewing', desc: 'Brew flasks and transmute dust into orbs.' },
};

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
  color: string;
  /** campaign area that must be unlocked first */
  area?: string;
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

const GATHERING: SkillAction[] = [
  gather('mining', 'mine_copper', 'Copper Vein', 1, 3000, 7, 'copper_ore', '#c8743f', [{ id: 'rough_gem', chance: 0.02, qty: 1 }]),
  { ...gather('mining', 'mine_iron', 'Iron Vein', 15, 3500, 18, 'iron_ore', '#9aa3ad', [{ id: 'rough_gem', chance: 0.03, qty: 1 }]), area: 'ashwood' },
  { ...gather('mining', 'mine_gem', 'Glimmering Geode', 22, 5000, 30, 'rough_gem', '#d0569b'), area: 'crypt' },
  { ...gather('mining', 'mine_mithril', 'Mithril Vein', 30, 4000, 38, 'mithril_ore', '#6fc3d8', [{ id: 'rough_gem', chance: 0.05, qty: 1 }]), area: 'forge' },

  gather('woodcutting', 'cut_ash', 'Ash Tree', 1, 3000, 7, 'ash_log', '#b89a72'),
  { ...gather('woodcutting', 'cut_oak', 'Oak Tree', 15, 3500, 18, 'oak_log', '#8a6338'), area: 'ashwood' },
  { ...gather('woodcutting', 'cut_yew', 'Yew Tree', 30, 4000, 38, 'yew_log', '#6b3d2c'), area: 'forge' },

  gather('harvesting', 'herb_sun', 'Sunpetal Patch', 1, 3000, 7, 'sunpetal', '#f2c94c'),
  { ...gather('harvesting', 'herb_frost', 'Frostleaf Thicket', 12, 3500, 16, 'frostleaf', '#7fc8f8'), area: 'ashwood' },
  { ...gather('harvesting', 'herb_ember', 'Emberroot Bed', 25, 4000, 32, 'emberroot', '#e2603f'), area: 'crypt' },
  { ...gather('harvesting', 'herb_void', 'Voidbloom Grove', 40, 5000, 55, 'voidbloom', '#9b6dde'), area: 'spire' },
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
  const inputs: Record<string, number> = { [ore]: o + tier * 2 };
  if (l > 0) inputs[log] = l + tier;
  if (b.slot === 'amulet' || b.slot === 'ring') inputs.rough_gem = 1 + tier;
  return inputs;
}

const SMITHING: SkillAction[] = BASES.map((b) => ({
  id: `smith_${b.id}`,
  skill: 'smithing' as const,
  name: b.name,
  level: Math.max(1, b.reqLevel),
  intervalMs: 4000 + b.reqLevel * 40,
  xp: 12 + b.reqLevel * 3,
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
  { id: 'brew_life_grand', skill: 'alchemy', name: 'Grand Life Flask', level: 32, intervalMs: 6000, xp: 80, inputs: { emberroot: 10, yew_log: 3 }, flaskId: 'life_grand', color: '#d6453d', area: 'forge' },
  { id: 'brew_diamond', skill: 'alchemy', name: 'Diamond Flask', level: 36, intervalMs: 6000, xp: 90, inputs: { voidbloom: 6, rough_gem: 2 }, flaskId: 'diamond', color: '#bfe3ff', area: 'spire' },
  { id: 'orb_alchemy', skill: 'alchemy', name: 'Orb of Alchemy', level: 40, intervalMs: 6000, xp: 90, inputs: { arcane_dust: 25, voidbloom: 2 }, outputs: { alchemy: 1 }, color: '#f0c14b', area: 'forge' },
];

/** Global pacing knob for gathering/production xp (values above are authored at 1×). */
export const SKILL_XP_SCALE = 0.3;

export const ACTIONS: SkillAction[] = [...GATHERING, ...SMITHING, ...ALCHEMY].map((a) => ({
  ...a,
  xp: Math.round(a.xp * SKILL_XP_SCALE * 10) / 10,
}));

const BY_ID: Record<string, SkillAction> = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

export function actionDef(id: string): SkillAction {
  const a = BY_ID[id];
  if (!a) throw new Error(`Unknown action ${id}`);
  return a;
}

export function actionsFor(skill: SkillId): SkillAction[] {
  return ACTIONS.filter((a) => a.skill === skill).sort((a, b) => a.level - b.level);
}
