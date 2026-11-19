import { baseDef } from './bases';
import { siteOf } from './expedition';
import type { HeistJob } from './heist';
import type { SkillAction } from './skills';

export type MasteryProfile = 'gathering' | 'production' | 'heist' | 'project';

export type MilestoneLevel = 25 | 50 | 75 | 100;

export type MasteryPerkKind =
  | 'vein_strike'        // chance to instantly trigger extra completion & output
  | 'rare_find'          // chance to unearth themed rare find (geodes, amber, fossils, essences)
  | 'affix_floor'        // guaranteed minimum modifier tier floor on crafted equipment
  | 'catalyst_save'      // chance to conserve catalysts / secondary materials
  | 'flask_charges'      // +1 max flask charge capacity on crafted flasks
  | 'flask_duration'     // +% flask duration on crafted flasks
  | 'pure_brew'          // chance to craft free batch without consuming inputs
  | 'meal_duration'      // +% meal buff duration
  | 'feast_bounty'       // chance for double feast / meal portion / bar / plank
  | 'dust_retention'     // reduced dust cost floor or rough gem refund
  | 'flawless_facet'     // chance for extra gem yield / elevated facet
  | 'glyph_echo'         // chance to carve double rune or extra inscription fragment
  | 'rune_resonance'     // bonus rune resonance
  | 'survey_quality'     // guaranteed higher map quality/quantity floor
  | 'ink_conservation'   // chance to conserve ink
  | 'sleight_of_hand'    // chance for instant pickpocket & double gold
  | 'smuggled_stash'     // chance for extra markers / contraband
  | 'alarm_mitigation'   // -alert level on room clear
  | 'inside_knowledge'   // extra casing notes / marker bonus
  | 'action_speed'       // task action speed bonus
  | 'global_speed'       // global profession speed bonus
  | 'global_find'        // global rare finding bonus
  | 'global_conserve';   // global ingredient conservation bonus

export interface MasteryMilestone {
  level: MilestoneLevel;
  id: string;
  name: string;
  desc: string;
  scope: 'task' | 'global';
  kind: MasteryPerkKind;
  value: number;
  outputId?: string;
}

export interface MasterySpec {
  /** Stable task id. Bulk recipes use the id of their single-recipe counterpart. */
  id: string;
  name: string;
  skill: string;
  profile: MasteryProfile;
  /** Gathering only: the one ordinary output eligible for the yield bonus. */
  primaryOutput?: string;
  /** Production only: ordinary ingredients eligible for conservation. */
  ordinaryInputs?: string[];
  milestones: MasteryMilestone[];
}

/** Inputs mastery may conserve. Valuable/chase materials are deliberately absent. */
const ORDINARY_INPUTS = new Set([
  'copper_ore', 'iron_ore', 'mithril_ore', 'ash_log', 'oak_log', 'yew_log',
  'adamant_ore', 'star_ore', 'void_ore', 'world_ore',
  'ironwood_log', 'ancient_log', 'spirit_log', 'worldwood_log',
  'sunpetal', 'frostleaf', 'emberroot', 'voidbloom', 'copper_bar', 'iron_bar', 'mithril_bar',
  'ash_plank', 'oak_plank', 'yew_plank', 'rough_gem', 'arcane_dust',
  'vellum', 'fine_vellum', 'gall_ink', 'sepia_ink',
]);

function generateMilestones(skill: string, taskId: string, _taskName: string, _out: string, a?: SkillAction): MasteryMilestone[] {
  const mid = (lvl: number, slug: string) => `${taskId}_${lvl}_${slug}`;

  if (skill === 'mining') {
    if (taskId.includes('gem')) {
      return [
        { level: 25, id: mid(25, 'cleave'), name: 'Lapidary Cleave', desc: '10% chance to extract an extra rough gem', scope: 'task', kind: 'vein_strike', value: 0.10 },
        { level: 50, id: mid(50, 'geode'), name: 'Crystal Geode', desc: '8% chance to unearth an unrefined crystal geode', scope: 'task', kind: 'rare_find', value: 0.08, outputId: 'rough_gem' },
        { level: 75, id: mid(75, 'speed'), name: 'Gem Prospector', desc: '+2% global Mining speed across all ores', scope: 'global', kind: 'global_speed', value: 2 },
        { level: 100, id: mid(100, 'prism'), name: 'Prismatic Vein', desc: '+2% global gem & geode find chance', scope: 'global', kind: 'global_find', value: 0.02 },
      ];
    }
    if (['star', 'void', 'world'].some((k) => taskId.includes(k))) {
      return [
        { level: 25, id: mid(25, 'astral'), name: 'Astral Strike', desc: '6% chance to extract a second cosmic ore chunk', scope: 'task', kind: 'vein_strike', value: 0.06 },
        { level: 50, id: mid(50, 'resonance'), name: 'Cosmic Resonance', desc: '6% chance to unearth an extra star shard or void fragment', scope: 'task', kind: 'rare_find', value: 0.06, outputId: 'arcane_dust' },
        { level: 75, id: mid(75, 'speed'), name: 'Celestial Sight', desc: '+2% global Mining speed across all ores', scope: 'global', kind: 'global_speed', value: 2 },
        { level: 100, id: mid(100, 'core'), name: 'Core Alignment', desc: '+2% global rare mineral yield', scope: 'global', kind: 'global_find', value: 0.02 },
      ];
    }
    return [
      { level: 25, id: mid(25, 'strike'), name: 'Vein Strike', desc: '8% chance to trigger an instant extra swing & ore', scope: 'task', kind: 'vein_strike', value: 0.08 },
      { level: 50, id: mid(50, 'dense'), name: 'Dense Seam', desc: '12% Vein Strike chance plus geode discovery', scope: 'task', kind: 'vein_strike', value: 0.12 },
      { level: 75, id: mid(75, 'speed'), name: "Miner's Intuition", desc: '+2% global Mining speed across all ores', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'quarry'), name: 'Deep Quarry', desc: '+1.5% global geode and fossil find chance', scope: 'global', kind: 'global_find', value: 0.015 },
    ];
  }

  if (skill === 'woodcutting') {
    if (a?.protectedOutputs) {
      return [
        { level: 25, id: mid(25, 'focus'), name: 'Refined Focus', desc: '+2% refinement speed', scope: 'task', kind: 'action_speed', value: 2 },
        { level: 50, id: mid(50, 'purity'), name: 'Heartwood Purity', desc: '+3% refinement speed', scope: 'task', kind: 'action_speed', value: 3 },
        { level: 75, id: mid(75, 'speed'), name: 'Master Joinery', desc: '+2% global Woodworking speed', scope: 'global', kind: 'global_speed', value: 2 },
        { level: 100, id: mid(100, 'resonance'), name: 'Ancient Resonance', desc: '+3% global Woodworking speed', scope: 'global', kind: 'global_speed', value: 3 },
      ];
    }
    if (a?.inputs) {
      return [
        { level: 25, id: mid(25, 'planing'), name: 'Smooth Planing', desc: '+10% plank ingredient conservation', scope: 'task', kind: 'catalyst_save', value: 0.10 },
        { level: 50, id: mid(50, 'grain'), name: 'Seasoned Grain', desc: '10% chance to produce double planks with no extra log', scope: 'task', kind: 'feast_bounty', value: 0.10 },
        { level: 75, id: mid(75, 'speed'), name: 'Master Joinery', desc: '+2% global Woodworking speed', scope: 'global', kind: 'global_speed', value: 2 },
        { level: 100, id: mid(100, 'steward'), name: 'Forest Stewardship', desc: '+2% global woodcraft conservation', scope: 'global', kind: 'global_conserve', value: 0.02 },
      ];
    }
    return [
      { level: 25, id: mid(25, 'felling'), name: 'Heavy Felling', desc: '8% chance to instantly fell an extra log', scope: 'task', kind: 'vein_strike', value: 0.08 },
      { level: 50, id: mid(50, 'cleave'), name: 'Heartwood Cleave', desc: '12% Heavy Felling chance plus tree resin sap', scope: 'task', kind: 'vein_strike', value: 0.12 },
      { level: 75, id: mid(75, 'speed'), name: "Lumberjack's Rhythm", desc: '+2% global Woodcutting speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'canopy'), name: 'Ancient Canopies', desc: '+1.5% global resin & sap yield', scope: 'global', kind: 'global_find', value: 0.015 },
    ];
  }

  if (skill === 'harvesting') {
    return [
      { level: 25, id: mid(25, 'pluck'), name: 'Delicate Pluck', desc: '8% chance to harvest a second stem instantly', scope: 'task', kind: 'vein_strike', value: 0.08 },
      { level: 50, id: mid(50, 'petals'), name: 'Pristine Petals', desc: '12% double-harvest chance plus wild elemental essence', scope: 'task', kind: 'vein_strike', value: 0.12 },
      { level: 75, id: mid(75, 'speed'), name: "Botanist's Touch", desc: '+2% global Foraging speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'pollen'), name: 'Cross-Pollination', desc: '+2% global Greenhouse growth & bloom speed', scope: 'global', kind: 'global_find', value: 0.02 },
    ];
  }

  if (skill === 'thieving') {
    if (taskId.startsWith('task.heist.')) {
      return [
        { level: 25, id: mid(25, 'lock'), name: 'Fast Lockpick', desc: '+8% room clearance speed', scope: 'task', kind: 'vein_strike', value: 0.08 },
        { level: 50, id: mid(50, 'silent'), name: 'Silent Step', desc: '-15% alarm rate across this heist', scope: 'task', kind: 'alarm_mitigation', value: 15 },
        { level: 75, id: mid(75, 'speed'), name: 'Blueprint Insight', desc: '+2% global Heist speed across all jobs', scope: 'global', kind: 'global_speed', value: 2 },
        { level: 100, id: mid(100, 'infil'), name: 'Master Infiltrator', desc: '+5% bonus Rogue\'s Markers & Seals from all vaults', scope: 'global', kind: 'inside_knowledge', value: 5 },
      ];
    }
    return [
      { level: 25, id: mid(25, 'sleight'), name: 'Sleight of Hand', desc: '8% chance for instant pickpocket & double gold', scope: 'task', kind: 'sleight_of_hand', value: 0.08 },
      { level: 50, id: mid(50, 'stash'), name: 'Smuggled Stash', desc: '12% Sleight of Hand chance plus extra Rogue\'s Marker', scope: 'task', kind: 'smuggled_stash', value: 0.12 },
      { level: 75, id: mid(75, 'speed'), name: 'Shadow Step', desc: '+2% global Thieving speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'fence'), name: 'Fence Network', desc: '+5% global gold from all street marks', scope: 'global', kind: 'global_find', value: 0.05 },
    ];
  }

  if (skill === 'smelting') {
    return [
      { level: 25, id: mid(25, 'crucible'), name: 'Efficient Crucible', desc: '10% chance to smelt without consuming secondary flux', scope: 'task', kind: 'catalyst_save', value: 0.10 },
      { level: 50, id: mid(50, 'slag'), name: 'Pure Slag', desc: '10% chance to produce double metal bars', scope: 'task', kind: 'feast_bounty', value: 0.10 },
      { level: 75, id: mid(75, 'speed'), name: "Crucible Heat", desc: '+2% global Smelting speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'reclaim'), name: 'Slag Reclamation', desc: '+2% global ore conservation', scope: 'global', kind: 'global_conserve', value: 0.02 },
    ];
  }

  if (skill === 'woodcrafting') {
    return [
      { level: 25, id: mid(25, 'grain'), name: 'Timber Grain', desc: '15% chance to conserve resins/materials used', scope: 'task', kind: 'catalyst_save', value: 0.15 },
      { level: 50, id: mid(50, 'carve'), name: "Carver's Art", desc: 'Guarantees higher minimum affix tier floor', scope: 'task', kind: 'affix_floor', value: 1 },
      { level: 75, id: mid(75, 'speed'), name: 'Swift Shavings', desc: '+2% global Woodcrafting speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'woodmaster'), name: 'Master Woodcrafter', desc: '+10% base defence or damage rolls', scope: 'global', kind: 'affix_floor', value: 10 },
    ];
  }

  if (skill === 'smithing') {
    if (taskId.includes('smelt')) {
      return [
        { level: 25, id: mid(25, 'crucible'), name: 'Efficient Crucible', desc: '10% chance to smelt without consuming secondary flux', scope: 'task', kind: 'catalyst_save', value: 0.10 },
        { level: 50, id: mid(50, 'slag'), name: 'Pure Slag', desc: '10% chance to produce double metal bars', scope: 'task', kind: 'feast_bounty', value: 0.10 },
        { level: 75, id: mid(75, 'speed'), name: "Forge Master's Heat", desc: '+2% global Smelting speed', scope: 'global', kind: 'global_speed', value: 2 },
        { level: 100, id: mid(100, 'reclaim'), name: 'Slag Reclamation', desc: '+2% global ore conservation', scope: 'global', kind: 'global_conserve', value: 0.02 },
      ];
    }
    if (a?.baseId || a?.purpose) {
      return [
        { level: 25, id: mid(25, 'temper'), name: 'Tempered Strike', desc: '15% chance to conserve fossils/resins used', scope: 'task', kind: 'catalyst_save', value: 0.15 },
        { level: 50, id: mid(50, 'edge'), name: "Master's Edge", desc: 'Guarantees higher minimum affix tier floor', scope: 'task', kind: 'affix_floor', value: 1 },
        { level: 75, id: mid(75, 'speed'), name: 'Anvil Precision', desc: '+2% global Smithing speed', scope: 'global', kind: 'global_speed', value: 2 },
        { level: 100, id: mid(100, 'armorer'), name: 'Master Armorer', desc: '+10% base armour, evasion, ES or damage rolls', scope: 'global', kind: 'affix_floor', value: 10 },
      ];
    }
    return [
      { level: 25, id: mid(25, 'hammer'), name: 'Steady Hammer', desc: '10% ingredient conservation', scope: 'task', kind: 'catalyst_save', value: 0.10 },
      { level: 50, id: mid(50, 'temper'), name: 'True Temper', desc: '10% chance to finish craft instantly', scope: 'task', kind: 'vein_strike', value: 0.10 },
      { level: 75, id: mid(75, 'speed'), name: 'Anvil Precision', desc: '+2% global Smithing speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'master'), name: 'Master Smith', desc: '+2% global smithing conservation', scope: 'global', kind: 'global_conserve', value: 0.02 },
    ];
  }

  if (skill === 'alchemy') {
    if (a?.flaskId) {
      if (a.flaskId.startsWith('life_') || a.flaskId.startsWith('mana_')) {
        return [
          { level: 25, id: mid(25, 'res'), name: 'Expanded Reservoir', desc: '+1 maximum flask charge capacity', scope: 'task', kind: 'flask_charges', value: 1 },
          { level: 50, id: mid(50, 'inf'), name: 'Rapid Infusion', desc: '+15% flask life/mana recovery per charge', scope: 'task', kind: 'flask_duration', value: 15 },
          { level: 75, id: mid(75, 'speed'), name: "Distiller's Art", desc: '+2% global Alchemy speed', scope: 'global', kind: 'global_speed', value: 2 },
          { level: 100, id: mid(100, 'vial'), name: 'Overflowing Vial', desc: '+1 bonus charge on all crafted flasks', scope: 'global', kind: 'flask_charges', value: 1 },
        ];
      }
      return [
        { level: 25, id: mid(25, 'sol'), name: 'Concentrated Solution', desc: '+15% flask buff duration', scope: 'task', kind: 'flask_duration', value: 15 },
        { level: 50, id: mid(50, 'end'), name: 'Enduring Distillate', desc: '+25% flask buff duration', scope: 'task', kind: 'flask_duration', value: 25 },
        { level: 75, id: mid(75, 'speed'), name: "Distiller's Art", desc: '+2% global Alchemy speed', scope: 'global', kind: 'global_speed', value: 2 },
        { level: 100, id: mid(100, 'prolong'), name: 'Prolonged Alchemy', desc: '+10% global utility flask duration', scope: 'global', kind: 'flask_duration', value: 10 },
      ];
    }
    return [
      { level: 25, id: mid(25, 'thrift'), name: 'Reagent Thrift', desc: '10% chance to conserve secondary herbs', scope: 'task', kind: 'catalyst_save', value: 0.10 },
      { level: 50, id: mid(50, 'surge'), name: 'Transmutation Surge', desc: '6% chance to produce double batch output', scope: 'task', kind: 'feast_bounty', value: 0.06 },
      { level: 75, id: mid(75, 'speed'), name: "Distiller's Art", desc: '+2% global Alchemy speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'focus'), name: "Philosopher's Focus", desc: '+2% global Alchemy ingredient conservation', scope: 'global', kind: 'global_conserve', value: 0.02 },
    ];
  }

  if (skill === 'cooking') {
    return [
      { level: 25, id: mid(25, 'portion'), name: 'Generous Portion', desc: '+30% meal buff duration', scope: 'task', kind: 'meal_duration', value: 30 },
      { level: 50, id: mid(50, 'chef'), name: "Chef's Touch", desc: '+60% meal duration and 10% chance of double portions', scope: 'task', kind: 'feast_bounty', value: 0.10 },
      { level: 75, id: mid(75, 'speed'), name: 'Culinary Maestro', desc: '+2% global Cooking speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'sustain'), name: 'Sustained Nourishment', desc: '+10% global duration on all eaten meals', scope: 'global', kind: 'meal_duration', value: 10 },
    ];
  }

  if (skill === 'gemcutting') {
    return [
      { level: 25, id: mid(25, 'grip'), name: 'Lapidary Grip', desc: '10% chance to conserve rough gems', scope: 'task', kind: 'dust_retention', value: 0.10 },
      { level: 50, id: mid(50, 'facet'), name: 'Flawless Facet', desc: '6% chance for double cut gem output', scope: 'task', kind: 'flawless_facet', value: 0.06 },
      { level: 75, id: mid(75, 'speed'), name: "Gemcutter's Eye", desc: '+2% global Gemcutting speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'reserve'), name: 'Prismatic Reserve', desc: 'Reduces minimum dust cost floor by 25%', scope: 'global', kind: 'dust_retention', value: 25 },
    ];
  }

  if (skill === 'runecarving') {
    return [
      { level: 25, id: mid(25, 'etch'), name: 'Resonant Etch', desc: '10% chance to double the carved rune', scope: 'task', kind: 'glyph_echo', value: 0.10 },
      { level: 50, id: mid(50, 'echo'), name: 'Inscription Echo', desc: '15% chance to extract an extra Inscription Fragment', scope: 'task', kind: 'glyph_echo', value: 0.15 },
      { level: 75, id: mid(75, 'speed'), name: 'Runic Harmony', desc: '+2% global Runecarving speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'glyphs'), name: 'Prismatic Glyphs', desc: '+5% elemental rune resonance values', scope: 'global', kind: 'rune_resonance', value: 5 },
    ];
  }

  if (skill === 'cartography') {
    return [
      { level: 25, id: mid(25, 'survey'), name: 'Survey Precision', desc: '+10% higher pack size and quantity floor on maps', scope: 'task', kind: 'survey_quality', value: 10 },
      { level: 50, id: mid(50, 'ink'), name: "Cartographer's Ink", desc: '15% chance to craft without consuming ink/vellum', scope: 'task', kind: 'ink_conservation', value: 0.15 },
      { level: 75, id: mid(75, 'speed'), name: 'Atlas Clarity', desc: '+2% global Cartography speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'nav'), name: 'Master Navigator', desc: '+1 extra charge on applied Sextants', scope: 'global', kind: 'survey_quality', value: 1 },
    ];
  }

  if (skill === 'agility') {
    return [
      { level: 25, id: mid(25, 'stride'), name: 'Long Stride', desc: '+3% speed on this course', scope: 'task', kind: 'action_speed', value: 3 },
      { level: 50, id: mid(50, 'flow'), name: 'Course Flow', desc: '+5% speed on this course', scope: 'task', kind: 'action_speed', value: 5 },
      { level: 75, id: mid(75, 'speed'), name: 'Light Footed', desc: '+2% global Agility speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'master'), name: 'Rooftop Master', desc: '+3% global Agility speed', scope: 'global', kind: 'global_speed', value: 3 },
    ];
  }

  if (skill === 'archaeology') {
    return [
      { level: 25, id: mid(25, 'brush'), name: 'Careful Brush', desc: '8% chance for instant stratum dig', scope: 'task', kind: 'vein_strike', value: 0.08 },
      { level: 50, id: mid(50, 'relic'), name: 'Relic Unearthing', desc: '12% double dig, plus bonus relic scrap', scope: 'task', kind: 'vein_strike', value: 0.12 },
      { level: 75, id: mid(75, 'speed'), name: "Antiquarian's Eye", desc: '+2% global Archaeology speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'favor'), name: "Curator's Favor", desc: '+5% bonus faction standing on trade-ins', scope: 'global', kind: 'global_find', value: 0.05 },
    ];
  }

  if (skill === 'astrology') {
    return [
      { level: 25, id: mid(25, 'glint'), name: 'Falling Star', desc: '8% chance for an extra Stardust', scope: 'task', kind: 'vein_strike', value: 0.08 },
      { level: 50, id: mid(50, 'gilt'), name: 'Gilded Glint', desc: '1% chance for an extra Gilded Stardust', scope: 'task', kind: 'rare_find', value: 0.01, outputId: 'gilded_stardust' },
      { level: 75, id: mid(75, 'speed'), name: 'Steady Gaze', desc: '+2% global Astrology speed', scope: 'global', kind: 'global_speed', value: 2 },
      { level: 100, id: mid(100, 'night'), name: 'Long Night', desc: '+2% global Astrology speed', scope: 'global', kind: 'global_speed', value: 2 },
    ];
  }

  return [
    { level: 25, id: mid(25, 'prac'), name: 'Apprentice Practice', desc: '+5% action efficiency', scope: 'task', kind: 'vein_strike', value: 0.05 },
    { level: 50, id: mid(50, 'jour'), name: 'Journeyman Craft', desc: '+10% action efficiency', scope: 'task', kind: 'vein_strike', value: 0.10 },
    { level: 75, id: mid(75, 'speed'), name: 'Artisan Focus', desc: '+2% global speed', scope: 'global', kind: 'global_speed', value: 2 },
    { level: 100, id: mid(100, 'master'), name: 'Master Technique', desc: '+2% global efficiency', scope: 'global', kind: 'global_conserve', value: 0.02 },
  ];
}

const spec = (id: string, name: string, skill: string, profile: MasteryProfile, extra: Partial<MasterySpec> = {}, a?: SkillAction): MasterySpec => {
  const primaryOutput = extra.primaryOutput ?? '';
  const milestones = extra.milestones ?? generateMilestones(skill, id, name, primaryOutput, a);
  const s: MasterySpec = { id, name, skill, profile, milestones, ...extra };
  registerMasterySpec(s);
  return s;
};

const outputOf = (a: SkillAction) => Object.keys(a.outputs ?? {})[0] ?? (a.mining ? `${a.mining.metal}_ore` : a.woodcutting ? `${a.woodcutting.wood}_log` : '');
const ordinaryInputs = (a: SkillAction) => Object.keys(a.inputs ?? {}).filter((id) => ORDINARY_INPUTS.has(id));
const production = (id: string, name: string, skill: string, a: SkillAction) => spec(id, name, skill, 'production', { ordinaryInputs: ordinaryInputs(a) }, a);
const gathering = (id: string, name: string, skill: string, primaryOutput: string, a?: SkillAction) => spec(id, name, skill, 'gathering', { primaryOutput }, a);

const materialName = (id: string) => id.split('_').map((x) => x[0].toUpperCase() + x.slice(1)).join(' ');

/** Global registry to look up any spec by id in O(1) time. */
const MASTERY_REGISTRY = new Map<string, MasterySpec>();

export function registerMasterySpec(s: MasterySpec): void {
  MASTERY_REGISTRY.set(s.id, s);
}

export function findMasterySpecById(id: string): MasterySpec | undefined {
  return MASTERY_REGISTRY.get(id);
}

/** The shipped band identity, retained only so version 41 saves can migrate without losing progress. */
export function legacyMasteryForAction(a: SkillAction): MasterySpec | undefined {
  if (a.batchMastery) return undefined; // The shared single-craft track is migrated once.
  if (['cut_exceptional', 'prepare_return_inscription', 'prepare_choir_inscription', 'prepare_circuit_inscription', 'inscribe_convergence', 'polish_exceptional', 'recycle_gem'].includes(a.id)) return undefined;
  if (a.id.startsWith('cut_family_') || a.id.startsWith('cut_exact_')) return undefined;
  if (a.id === 'chart_endgame_atlas' || a.id.startsWith('forge_uber_key')) return undefined;
  // Astrology arrived after the band-based saves, so it has nothing to migrate.
  if (a.skill === 'combat' || a.skill === 'fishing' || a.skill === 'astrology' || a.soon) return undefined;
  const out = outputOf(a);

  if (a.skill === 'mining') {
    const band = out === 'rough_gem' ? 'gem' : out.replace('_ore', '');
    return gathering(`mining.${band}`, `${materialName(band)} Mining`, a.skill, out, a);
  }
  if (a.skill === 'woodcutting') {
    const material = (out || Object.keys(a.inputs ?? {})[0]).replace(/_(log|plank)$/, '');
    return a.inputs
      ? production(`wood.${material}`, `${materialName(material)} Woodworking`, a.skill, a)
      : gathering(`wood.${material}`, `${materialName(material)} Woodcutting`, a.skill, out, a);
  }
  if (a.skill === 'harvesting') {
    const herb = out === 'sunpetal' ? 'sunpetal' : out === 'frostleaf' ? 'frostleaf' : out === 'emberroot' ? 'emberroot' : 'voidbloom';
    return gathering(`foraging.${herb}`, `${materialName(herb)} Foraging`, a.skill, out, a);
  }
  if (a.skill === 'thieving') {
    const band = a.level < 19 ? 'road' : a.level < 35 ? 'khanate' : 'court';
    const label = band === 'road' ? 'Road Marks' : band === 'khanate' ? 'Khanate Marks' : 'Court Marks';
    return gathering(`thieving.${band}`, label, a.skill, 'gold', a);
  }
  if (a.skill === 'agility') return undefined; // Added after the band-based saves.
  if (a.skill === 'archaeology') {
    const culture = siteOf(a.id)?.culture;
    if (!culture) return undefined; // These recipes did not exist in the old band-based saves.
    return gathering(`archaeology.${culture}`, `${materialName(culture)} Archaeology`, a.skill, out, a);
  }
  if (a.skill === 'smelting') {
    if (a.id.startsWith('smelt_')) {
      const material = a.id.slice('smelt_'.length);
      return production(`smithing.smelt.${material}`, `${materialName(material)} Smelting`, a.skill, a);
    }
    return production(`smelting.${a.id}`, a.name, a.skill, a);
  }
  if (a.skill === 'woodcrafting') {
    if (a.baseId) {
      const b = baseDef(a.baseId);
      const material = b.reqLevel < 10 ? 'ash' : b.reqLevel < 22 ? 'oak' : 'yew';
      const family = b.slot === 'weapon' ? 'weapons' : b.slot === 'offhand' ? 'offhands' : 'garments';
      return production(`woodcrafting.${material}.${family}`, `${materialName(material)} ${materialName(family)}`, a.skill, a);
    }
    return production(`woodcrafting.${a.id}`, a.name, a.skill, a);
  }
  if (a.skill === 'smithing') {
    if (a.baseId) {
      const b = baseDef(a.baseId);
      const material = b.reqLevel < 10 ? 'copper' : b.reqLevel < 22 ? 'iron' : 'mithril';
      const family = b.slot === 'weapon' ? 'weapons' : b.slot === 'offhand' ? 'offhands' : b.slot === 'ring' || b.slot === 'amulet' ? 'jewellery' : 'armour';
      return production(`smithing.${material}.${family}`, `${materialName(material)} ${materialName(family)}`, a.skill, a);
    }
    return production('keys.smithing', 'Key Forging', a.skill, a);
  }
  if (a.skill === 'alchemy') {
    if (a.id === 'brew_abyssal_key') return production('keys.alchemy', 'Key Alchemy', a.skill, a);
    if (a.flaskId) {
      const kind = a.flaskId.startsWith('life_') ? 'life' : a.flaskId.startsWith('mana_') ? 'mana' : 'utility';
      return production(`alchemy.flask.${kind}`, `${materialName(kind)} Flasks`, a.skill, a);
    }
    return production('alchemy.orbs', 'Orb Alchemy', a.skill, a);
  }
  if (a.skill === 'gemcutting') {
    if (a.id === 'cut_bell_key') return production('keys.gemcutting', 'Key Gemcutting', a.skill, a);
    const kind = a.gem?.kind ?? 'special';
    return production(`gemcutting.${kind}`, `${materialName(kind)} Gemcutting`, a.skill, a);
  }
  if (a.skill === 'runecarving') {
    if (a.id === 'carve_regent_key') return production('keys.runecarving', 'Key Rune-carving', a.skill, a);
    const family = /^carve_rune_([^_]+)_/.exec(a.id)?.[1];
    if (!family) throw new Error(`Rune action ${a.id} has no family mastery`);
    return production(`runes.${family}`, `${materialName(family)} Runes`, a.skill, a);
  }
  if (a.skill === 'cooking') {
    const ingredient = !out.startsWith('meal_');
    const band = ingredient ? 'ingredients' : a.level <= 10 ? 'early_meals' : a.level <= 35 ? 'mid_meals' : 'late_meals';
    return production(`cooking.${band}`, ingredient ? 'Cooking Ingredients' : `${a.level <= 10 ? 'Simple' : a.level <= 35 ? 'Campaign' : 'Master'} Meals`, a.skill, a);
  }
  if (a.skill === 'cartography') {
    if (a.id.includes('vellum')) return production('cartography.vellum', 'Vellum', a.skill, a);
    if (a.id.includes('ink')) return production('cartography.ink', 'Cartographic Ink', a.skill, a);
    if (a.id.includes('sextant_')) return production(`cartography.${out}`, a.name, a.skill, a);
    if (a.chart) {
      const low = Math.floor((a.chart.tier - 1) / 2) * 2 + 1;
      return production(`cartography.maps.${low}_${low + 1}`, `Map Tiers ${low}–${low + 1}`, a.skill, a);
    }
  }
  throw new Error(`Eligible action ${a.id} has no legacy mastery band`);
}

/** The shipped Heist band identity, retained only for the version 41 save migration. */
export function legacyMasteryForHeist(job: HeistJob): MasterySpec {
  const band = job.level < 20 ? 'street' : job.level < 45 ? 'khanate' : 'royal';
  const name = band === 'street' ? 'Street Heists' : band === 'khanate' ? 'Khanate Heists' : 'Royal Heists';
  return spec(`heist.${band}`, name, 'thieving', 'heist');
}

/** One stable track per action or recipe. A bulk recipe shares its single recipe's track. */
export function masteryForAction(a: SkillAction): MasterySpec | undefined {
  if (a.skill === 'combat' || a.skill === 'fishing' || a.soon) return undefined;
  if (siteOf(a.id)) return undefined;
  const id = a.batchOf ?? a.id;
  const name = a.batchOf ? a.name.replace(/\s+×\d+$/u, '') : a.name;
  if (a.protectedOutputs) return spec(`task.${id}`, name, a.skill, 'project', {}, a);
  const out = outputOf(a);
  if (a.skill === 'mining' || a.skill === 'harvesting' || a.skill === 'thieving' || a.skill === 'agility' || a.skill === 'archaeology' || a.skill === 'astrology' || (a.skill === 'woodcutting' && !a.inputs)) {
    return gathering(`task.${id}`, name, a.skill, a.skill === 'thieving' ? 'gold' : out, a);
  }
  return production(`task.${id}`, name, a.skill, a);
}

/** Each authored Heist job is a task; its rooms all advance that job's track. */
export function masteryForHeist(job: HeistJob): MasterySpec {
  return spec(`task.heist.${job.id}`, job.name, 'thieving', 'heist');
}
