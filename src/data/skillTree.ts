import type { SkillId } from '../engine/types';

export type TreeSkillId =
  | 'mining'
  | 'smelting'
  | 'smithing'
  | 'woodcrafting'
  | 'woodcutting'
  | 'harvesting'
  | 'alchemy'
  | 'astrology'
  | 'archaeology'
  | 'cartography'
  | 'thieving'
  | 'gemcutting';

/** Ring order of partner skills (docs/SKILLING_TREE_REVAMP.md). Mining sits at the top (-90 deg). */
export const SKILLING_RING: readonly TreeSkillId[] = [
  'mining',
  'smelting',
  'smithing',
  'woodcrafting',
  'woodcutting',
  'harvesting',
  'alchemy',
  'astrology',
  'archaeology',
  'cartography',
  'thieving',
  'gemcutting',
];

/**
 * Core, per-skill (`<skill>.<effect>`), bridge (`bridge.<id>`), and retained legacy keys
 * so equipped skilling gear and existing callers remain type-safe.
 */
export type SkillTreeStat =
  | 'offlineSpeed'
  | 'sharpFocus'
  | 'curious'
  | 'skillXp'
  | 'inputSave'
  | 'patientCrafter'
  // Legacy keys kept for gear/compatibility
  | 'skillSpeed'
  | 'miningSpeed' | 'gemChance' | 'fossilChance' | 'motherlode'
  | 'woodcuttingSpeed' | 'birdsNest' | 'resinChance' | 'resinIlvl' | 'heartwood'
  | 'harvestingSpeed' | 'distiller' | 'rareBlooms' | 'greenhouse'
  | 'smithingSpeed' | 'smeltingSpeed' | 'woodcraftingSpeed' | 'steadyTemper' | 'smithMagic' | 'grandmaster'
  | 'alchemySpeed' | 'bulkBrewer' | 'qualityBrews' | 'transmuter'
  | 'thievingSpeed' | 'markerChance' | 'alertReduce' | 'cleanGetaway'
  | 'archaeologySpeed' | 'artifactChance' | 'wareDiscount' | 'deepSurvey'
  | 'gemcuttingSpeed' | 'gemcuttingXp' | 'gemDustSave' | 'masterCutter'
  | 'runecarvingSpeed' | 'secondStroke' | 'deepCuts' | 'livingScript'
  | 'cookingSpeed' | 'secondHelping' | 'slowSimmer' | 'headChef'
  | 'cartographySpeed' | 'secondCopy' | 'mapFind' | 'masterCartographer'
  // New per-skill keys
  | 'mining.rubble' | 'mining.hazardRarer' | 'mining.pushCheaper' | 'mining.intoTheDark' | 'mining.richMore' | 'mining.fossilMore' | 'mining.motherlodeHunter'
  | 'smelting.fuelSave' | 'smelting.purityOdds' | 'smelting.hotCoals' | 'smelting.flawlessOrNothing' | 'smelting.bigCrucible' | 'smelting.alloyCheaper' | 'smelting.masterFounder'
  | 'smithing.barSave' | 'smithing.keenEdges' | 'smithing.balancedHeads' | 'smithing.signatureStyle' | 'smithing.thickPlate' | 'smithing.soundRims' | 'smithing.bulwark'
  | 'woodcrafting.dialPower' | 'woodcrafting.strongDraw' | 'woodcrafting.fletchersEye' | 'woodcrafting.hairTrigger' | 'woodcrafting.steadyBalance' | 'woodcrafting.spellGrain' | 'woodcrafting.livingStaff'
  | 'woodcutting.limbYield' | 'woodcutting.cleanCuts' | 'woodcutting.timberFast' | 'woodcutting.topple' | 'woodcutting.farSight' | 'woodcutting.oldGrowth' | 'woodcutting.legendSeeker'
  | 'harvesting.variantChance' | 'harvesting.keenEye' | 'harvesting.rareSightings' | 'harvesting.wildHeart' | 'harvesting.steadyLines' | 'harvesting.hybridVigour' | 'harvesting.unstableGenes'
  | 'alchemy.herbSave' | 'alchemy.strongPour' | 'alchemy.deepInfusion' | 'alchemy.overcharged' | 'alchemy.fullBelt' | 'alchemy.lastingDraught' | 'alchemy.bottomless'
  | 'astrology.researchGain' | 'astrology.tightLines' | 'astrology.extraPoint' | 'astrology.grandDesign' | 'astrology.patientWatch' | 'astrology.wideField' | 'astrology.fallingSky'
  | 'archaeology.inscriptionChance' | 'archaeology.contextClues' | 'archaeology.motherTongue' | 'archaeology.polyglot' | 'archaeology.lightTouch' | 'archaeology.deepTrench' | 'archaeology.bulkDig'
  | 'cartography.scrapDrops' | 'cartography.bossRumours' | 'cartography.guardianLore' | 'cartography.trophyHunter' | 'cartography.treasureRumours' | 'cartography.lockbreaker' | 'cartography.strongroom'
  | 'thieving.prepChance' | 'thieving.thoroughCasing' | 'thieving.insideKnowledge' | 'thieving.perfectPlan' | 'thieving.quickLift' | 'thieving.deepPockets' | 'thieving.opportunist'
  | 'gemcutting.dustSave' | 'gemcutting.extraFacet' | 'gemcutting.clearLines' | 'gemcutting.overcut' | 'gemcutting.biggerStones' | 'gemcutting.starGazer' | 'gemcutting.cabochon'
  // 12 Bridge keystones
  | 'bridge.ore_to_ingot'
  | 'bridge.hot_from_furnace'
  | 'bridge.fitted_hafts'
  | 'bridge.chosen_timber'
  | 'bridge.forest_floor'
  | 'bridge.living_infusions'
  | 'bridge.starlit_draughts'
  | 'bridge.ancient_skies'
  | 'bridge.lost_routes'
  | 'bridge.inside_job'
  | 'bridge.fences_eye'
  | 'bridge.crystal_sense';

export type SkillTreeStats = Partial<Record<SkillTreeStat, number>>;

export interface SkillTreeNode {
  id: string;
  name: string;
  kind: 'core' | 'small' | 'notable' | 'keystone';
  branch: 'core' | 'bridge' | Exclude<SkillId, 'combat'>;
  x: number;
  y: number;
  stats: SkillTreeStats;
  desc: string;
  req?: { skill: Exclude<SkillId, 'combat'>; level: number };
  /** Bridge keystones require at least one fork node allocated in both neighbouring skills. */
  bridgeReq?: readonly [TreeSkillId, TreeSkillId];
  links: string[];
}

interface ForkSpec {
  id: string;
  smallName: string;
  smallStat: SkillTreeStat;
  smallVal: number;
  smallDesc: string;
  n0: { name: string; stats: SkillTreeStats; desc: string };
  n1: { name: string; stats: SkillTreeStats; desc: string };
  ks: { name: string; stats: SkillTreeStats; desc: string };
}

interface BranchSpec {
  skill: TreeSkillId;
  trunk: { name: string; stats: SkillTreeStats; desc: string };
  forks: [ForkSpec, ForkSpec];
}

const BRANCH_SPECS: BranchSpec[] = [
  {
    skill: 'mining',
    trunk: { name: 'Rubble Sifter', stats: { 'mining.rubble': 5 }, desc: '+5% rubble from the Delve' },
    forks: [
      {
        id: 'deep_diver', smallName: 'Steady Pick', smallStat: 'mining.hazardRarer', smallVal: 3.75, smallDesc: '3.75% rarer hazards in deep layers',
        n0: { name: 'Sure Footing', stats: { 'mining.hazardRarer': 15 }, desc: 'Hazards are 15% rarer in your deepest layers' },
        n1: { name: 'Long Rope', stats: { 'mining.pushCheaper': 15 }, desc: 'Pushing deeper costs 15% fewer supports' },
        ks: { name: 'Into the Dark', stats: { 'mining.intoTheDark': 1 }, desc: 'Each push goes two layers; hazards come twice as often' },
      },
      {
        id: 'prospector', smallName: 'Ore Sense', smallStat: 'mining.richMore', smallVal: 3.75, smallDesc: '3.75% more common Rich traits',
        n0: { name: 'Nose for Ore', stats: { 'mining.richMore': 15 }, desc: 'Rich layer traits are 15% more common' },
        n1: { name: 'Fossil Eye', stats: { 'mining.fossilMore': 15 }, desc: 'Fossil beds are 15% more common' },
        ks: { name: 'Motherlode Hunter', stats: { 'mining.motherlodeHunter': 1 }, desc: 'Motherlode layers are three times as common; other layers yield 25% less' },
      },
    ],
  },
  {
    skill: 'smelting',
    trunk: { name: 'Thrifty Damper', stats: { 'smelting.fuelSave': 3 }, desc: '3% lower fuel and flux use' },
    forks: [
      {
        id: 'refiner', smallName: 'Pure Draught', smallStat: 'smelting.purityOdds', smallVal: 3.75, smallDesc: '3.75% better bar purity odds',
        n0: { name: 'Clean Flux', stats: { 'smelting.purityOdds': 15 }, desc: '15% better purity odds in the furnace' },
        n1: { name: 'Hot Coals', stats: { 'smelting.hotCoals': 15 }, desc: 'Charcoal from splinters burns 15% hotter' },
        ks: { name: 'Flawless or Nothing', stats: { 'smelting.flawlessOrNothing': 1 }, desc: 'No Crude or Refined bars, more Pure and Flawless; 25% fewer bars' },
      },
      {
        id: 'founder', smallName: 'Deep Ladle', smallStat: 'smelting.bigCrucible', smallVal: 3.75, smallDesc: '3.75% bigger smelting batches',
        n0: { name: 'Big Crucible', stats: { 'smelting.bigCrucible': 15 }, desc: '15% larger furnace batches' },
        n1: { name: 'Alloy Lore', stats: { 'smelting.alloyCheaper': 15 }, desc: 'Master alloys are 15% cheaper' },
        ks: { name: 'Master Founder', stats: { 'smelting.masterFounder': 1 }, desc: 'Master alloys need one fewer Flawless metal; they take twice as long' },
      },
    ],
  },
  {
    skill: 'smithing',
    trunk: { name: 'Bar Economy', stats: { 'smithing.barSave': 3 }, desc: '3% lower staged-forge bar cost' },
    forks: [
      {
        id: 'weaponsmith', smallName: 'Sharp Fuller', smallStat: 'smithing.keenEdges', smallVal: 3.75, smallDesc: '3.75% stronger edge stage choices',
        n0: { name: 'Keen Edges', stats: { 'smithing.keenEdges': 15 }, desc: 'Edge choices are 15% stronger' },
        n1: { name: 'Balanced Heads', stats: { 'smithing.balancedHeads': 15 }, desc: 'Shape choices are 15% stronger' },
        ks: { name: 'Signature Style', stats: { 'smithing.signatureStyle': 1 }, desc: 'One chosen pattern gains a bonus stage; other patterns forge 25% slower' },
      },
      {
        id: 'armourer', smallName: 'Riveted Plate', smallStat: 'smithing.thickPlate', smallVal: 3.75, smallDesc: '3.75% stronger temper choices on armour',
        n0: { name: 'Thick Plate', stats: { 'smithing.thickPlate': 15 }, desc: 'Temper choices are 15% stronger on armour' },
        n1: { name: 'Sound Rims', stats: { 'smithing.soundRims': 15 }, desc: 'Rim choices are 15% stronger' },
        ks: { name: 'Bulwark', stats: { 'smithing.bulwark': 1 }, desc: 'Armour gains an extra defence roll; weapons forge 25% slower' },
      },
    ],
  },
  {
    skill: 'woodcrafting',
    trunk: { name: 'Fine Grain', stats: { 'woodcrafting.dialPower': 3 }, desc: '+3% dial implicit strength' },
    forks: [
      {
        id: 'bowyer', smallName: 'Taut Stave', smallStat: 'woodcrafting.strongDraw', smallVal: 3.75, smallDesc: '3.75% stronger bow dials',
        n0: { name: 'Strong Draw', stats: { 'woodcrafting.strongDraw': 15 }, desc: 'Bow dials go 15% further' },
        n1: { name: "Fletcher's Eye", stats: { 'woodcrafting.fletchersEye': 15 }, desc: '15% better bow rolls' },
        ks: { name: 'Hair Trigger', stats: { 'woodcrafting.hairTrigger': 1 }, desc: 'Bow dials go much further; staves and wands cannot go past neutral' },
      },
      {
        id: 'staffwright', smallName: 'Runed Grain', smallStat: 'woodcrafting.steadyBalance', smallVal: 3.75, smallDesc: '3.75% stronger staff dials',
        n0: { name: 'Steady Balance', stats: { 'woodcrafting.steadyBalance': 15 }, desc: 'Staff dials go 15% further' },
        n1: { name: 'Spell Grain', stats: { 'woodcrafting.spellGrain': 15 }, desc: '15% better caster rolls' },
        ks: { name: 'Living Staff', stats: { 'woodcrafting.livingStaff': 1 }, desc: 'Living woods settle twice as fast; bow dials are 25% narrower' },
      },
    ],
  },
  {
    skill: 'woodcutting',
    trunk: { name: 'Clean Limbing', stats: { 'woodcutting.limbYield': 3 }, desc: '+3% crown and limb yield' },
    forks: [
      {
        id: 'feller', smallName: 'True Notch', smallStat: 'woodcutting.cleanCuts', smallVal: 3.75, smallDesc: '3.75% fewer splinters',
        n0: { name: 'Clean Cuts', stats: { 'woodcutting.cleanCuts': 15 }, desc: '15% fewer splinters on felled giants' },
        n1: { name: 'Timber!', stats: { 'woodcutting.timberFast': 15 }, desc: 'Trunks cut 15% faster' },
        ks: { name: 'Topple', stats: { 'woodcutting.topple': 1 }, desc: 'The giant falls when the trunk is half cut; the heart gives 25% less' },
      },
      {
        id: 'scout', smallName: 'Canopy Watch', smallStat: 'woodcutting.oldGrowth', smallVal: 3.75, smallDesc: '3.75% more common legendary giants',
        n0: { name: 'Far Sight', stats: { 'woodcutting.farSight': 1 }, desc: 'Special giants turn up 15% more often' },
        n1: { name: 'Old Growth', stats: { 'woodcutting.oldGrowth': 15 }, desc: 'Legendary giants are 15% more common' },
        ks: { name: 'Legend Seeker', stats: { 'woodcutting.legendSeeker': 1 }, desc: 'Legends are twice as common; other special giants half as common' },
      },
    ],
  },
  {
    skill: 'harvesting',
    trunk: { name: 'Wild Eye', stats: { 'harvesting.variantChance': 3 }, desc: '+3% wild variant seed chance' },
    forks: [
      {
        id: 'wildcrafter', smallName: 'Field Sketch', smallStat: 'harvesting.keenEye', smallVal: 3.75, smallDesc: '3.75% more wild variants',
        n0: { name: 'Keen Eye', stats: { 'harvesting.keenEye': 15 }, desc: '15% more wild plant variants' },
        n1: { name: 'Rare Sightings', stats: { 'harvesting.rareSightings': 15 }, desc: '15% rarer wild mutations' },
        ks: { name: 'Wild Heart', stats: { 'harvesting.wildHeart': 1 }, desc: 'Wild finds more often carry three mutations; Greenhouse grows 25% slower' },
      },
      {
        id: 'breeder', smallName: 'Grafting Knife', smallStat: 'harvesting.steadyLines', smallVal: 3.75, smallDesc: '3.75% faster strain stabilisation',
        n0: { name: 'Steady Lines', stats: { 'harvesting.steadyLines': 15 }, desc: 'Strains stabilise 15% faster' },
        n1: { name: 'Hybrid Vigour', stats: { 'harvesting.hybridVigour': 15 }, desc: 'Hidden hybrids are 15% more likely' },
        ks: { name: 'Unstable Genes', stats: { 'harvesting.unstableGenes': 1 }, desc: 'Offspring mutation chance doubled; parent traits 25% less likely to pass on' },
      },
    ],
  },
  {
    skill: 'alchemy',
    trunk: { name: 'Careful Measure', stats: { 'alchemy.herbSave': 3 }, desc: '3% lower infusion herb cost' },
    forks: [
      {
        id: 'infuser', smallName: 'Rich Tincture', smallStat: 'alchemy.strongPour', smallVal: 3.75, smallDesc: '3.75% stronger infusions',
        n0: { name: 'Strong Pour', stats: { 'alchemy.strongPour': 15 }, desc: 'Infusions are 15% stronger' },
        n1: { name: 'Deep Infusion', stats: { 'alchemy.deepInfusion': 15 }, desc: 'Infusions rank up 15% faster' },
        ks: { name: 'Overcharged', stats: { 'alchemy.overcharged': 1 }, desc: 'Infusions are 50% stronger; flasks hold one fewer charge' },
      },
      {
        id: 'brewer', smallName: 'Spare Stopper', smallStat: 'alchemy.fullBelt', smallVal: 3.75, smallDesc: '3.75% faster flask refill',
        n0: { name: 'Full Belt', stats: { 'alchemy.fullBelt': 15 }, desc: 'Flasks refill 15% faster' },
        n1: { name: 'Lasting Draught', stats: { 'alchemy.lastingDraught': 15 }, desc: 'Flask effects last 15% longer' },
        ks: { name: 'Bottomless', stats: { 'alchemy.bottomless': 1 }, desc: 'Flasks slowly refill during fights; infusions are 25% weaker' },
      },
    ],
  },
  {
    skill: 'astrology',
    trunk: { name: 'Clear Lens', stats: { 'astrology.researchGain': 3 }, desc: '+3% star research points' },
    forks: [
      {
        id: 'charter', smallName: 'Fine Compass', smallStat: 'astrology.tightLines', smallVal: 3.75, smallDesc: '3.75% stronger constellation links',
        n0: { name: 'Tight Lines', stats: { 'astrology.tightLines': 15 }, desc: 'Constellation links are 15% stronger' },
        n1: { name: 'Extra Point', stats: { 'astrology.extraPoint': 1 }, desc: '+1 constellation star slot' },
        ks: { name: 'Grand Design', stats: { 'astrology.grandDesign': 1 }, desc: 'Links count double; one fewer constellation slot' },
      },
      {
        id: 'stargazer', smallName: 'Long Exposure', smallStat: 'astrology.patientWatch', smallVal: 3.75, smallDesc: '3.75% faster star ranking',
        n0: { name: 'Patient Watch', stats: { 'astrology.patientWatch': 15 }, desc: 'Stars rank up 15% faster' },
        n1: { name: 'Wide Field', stats: { 'astrology.wideField': 15 }, desc: 'Sky research is 15% faster' },
        ks: { name: 'Falling Sky', stats: { 'astrology.fallingSky': 1 }, desc: 'Fallen stars are three times as common; watching ranks 25% slower' },
      },
    ],
  },
  {
    skill: 'archaeology',
    trunk: { name: 'Soft Brush', stats: { 'archaeology.inscriptionChance': 3 }, desc: '+3% inscription chance' },
    forks: [
      {
        id: 'linguist', smallName: 'Rubbing Paper', smallStat: 'archaeology.contextClues', smallVal: 3.75, smallDesc: '3.75% more hints per inscription',
        n0: { name: 'Context Clues', stats: { 'archaeology.contextClues': 15 }, desc: '15% more hints per inscription' },
        n1: { name: 'Mother Tongue', stats: { 'archaeology.motherTongue': 15 }, desc: 'Glyphs auto-reveal 15% sooner' },
        ks: { name: 'Polyglot', stats: { 'archaeology.polyglot': 1 }, desc: 'A glyph cracked in one culture gives hints in all; chapters need one more inscription' },
      },
      {
        id: 'excavator', smallName: 'Fine Trowel', smallStat: 'archaeology.lightTouch', smallVal: 3.75, smallDesc: '3.75% fewer fragile cracks',
        n0: { name: 'Light Touch', stats: { 'archaeology.lightTouch': 15 }, desc: '15% fewer fragile cracks' },
        n1: { name: 'Deep Trench', stats: { 'archaeology.deepTrench': 15 }, desc: '15% more excavation finds' },
        ks: { name: 'Bulk Dig', stats: { 'archaeology.bulkDig': 1 }, desc: 'Digs bring two inscriptions; each has half the hints' },
      },
    ],
  },
  {
    skill: 'cartography',
    trunk: { name: 'Scrap Ledger', stats: { 'cartography.scrapDrops': 3 }, desc: '+3% map scrap drops' },
    forks: [
      {
        id: 'boss_hunter', smallName: 'Bounty Mark', smallStat: 'cartography.bossRumours', smallVal: 3.75, smallDesc: '3.75% more Boss scraps',
        n0: { name: 'Boss Rumours', stats: { 'cartography.bossRumours': 15 }, desc: 'Boss map scraps are 15% more common' },
        n1: { name: 'Guardian Lore', stats: { 'cartography.guardianLore': 15 }, desc: 'Guardian maps are 15% cheaper' },
        ks: { name: 'Trophy Hunter', stats: { 'cartography.trophyHunter': 1 }, desc: 'Boss maps twice as common from scraps; Vault maps cannot be made' },
      },
      {
        id: 'vault_cracker', smallName: 'Vault Rumour', smallStat: 'cartography.treasureRumours', smallVal: 3.75, smallDesc: '3.75% more Vault scraps',
        n0: { name: 'Treasure Rumours', stats: { 'cartography.treasureRumours': 15 }, desc: 'Vault scraps are 15% more common' },
        n1: { name: 'Lockbreaker', stats: { 'cartography.lockbreaker': 15 }, desc: 'Vault maps are 15% cheaper' },
        ks: { name: 'Strongroom', stats: { 'cartography.strongroom': 1 }, desc: 'Vault maps hold double loot; their monsters are much tougher' },
      },
    ],
  },
  {
    skill: 'thieving',
    trunk: { name: 'Casing Note', stats: { 'thieving.prepChance': 3 }, desc: '+3% Heist prep chance' },
    forks: [
      {
        id: 'planner', smallName: 'Patrol Timing', smallStat: 'thieving.thoroughCasing', smallVal: 3.75, smallDesc: '3.75% stronger prep items',
        n0: { name: 'Thorough Casing', stats: { 'thieving.thoroughCasing': 15 }, desc: 'Prep items are 15% stronger' },
        n1: { name: 'Inside Knowledge', stats: { 'thieving.insideKnowledge': 1 }, desc: 'One prep item per Heist job is free' },
        ks: { name: 'Perfect Plan', stats: { 'thieving.perfectPlan': 1 }, desc: 'Fully prepped jobs never raise an alarm; jobs need a full board to start' },
      },
      {
        id: 'cutpurse', smallName: 'Light Fingers', smallStat: 'thieving.quickLift', smallVal: 3.75, smallDesc: '3.75% faster street marks',
        n0: { name: 'Quick Lift', stats: { 'thieving.quickLift': 15 }, desc: 'Street marks are 15% faster' },
        n1: { name: 'Deep Pockets', stats: { 'thieving.deepPockets': 15 }, desc: 'Street marks pay 15% more gold' },
        ks: { name: 'Opportunist', stats: { 'thieving.opportunist': 1 }, desc: 'Any mark can give prep for any job; prep is 25% weaker' },
      },
    ],
  },
  {
    skill: 'gemcutting',
    trunk: { name: 'Dust Tray', stats: { 'gemcutting.dustSave': 3 }, desc: '3% lower Arcane Dust cost' },
    forks: [
      {
        id: 'brilliant_cutter', smallName: 'Sharp Wheel', smallStat: 'gemcutting.clearLines', smallVal: 3.75, smallDesc: '3.75% stronger gem facets',
        n0: { name: 'Extra Facet', stats: { 'gemcutting.extraFacet': 1 }, desc: '+1 facet slot on small rough' },
        n1: { name: 'Clear Lines', stats: { 'gemcutting.clearLines': 15 }, desc: 'Gem facets are 15% stronger' },
        ks: { name: 'Overcut', stats: { 'gemcutting.overcut': 1 }, desc: 'Gems take two extra facets; recutting gives nothing back' },
      },
      {
        id: 'lapidary', smallName: 'Carat Eye', smallStat: 'gemcutting.biggerStones', smallVal: 3.75, smallDesc: '3.75% larger rough gems',
        n0: { name: 'Bigger Stones', stats: { 'gemcutting.biggerStones': 15 }, desc: 'Rough gems roll 15% larger' },
        n1: { name: 'Star Gazer', stats: { 'gemcutting.starGazer': 15 }, desc: 'Star Stones are 15% more common' },
        ks: { name: 'Cabochon', stats: { 'gemcutting.cabochon': 1 }, desc: 'Every gem gets a free family facet; one fewer facet slot' },
      },
    ],
  },
];

const BRIDGES: { id: string; stat: SkillTreeStat; name: string; desc: string }[] = [
  { id: 'ore_to_ingot', stat: 'bridge.ore_to_ingot', name: 'Ore to Ingot', desc: 'Some mined ore comes out as Refined bars; Mining is 25% slower' },
  { id: 'hot_from_furnace', stat: 'bridge.hot_from_furnace', name: 'Hot from the Furnace', desc: 'Pure and Flawless bars push Forging rolls further; Forging uses 25% more bars' },
  { id: 'fitted_hafts', stat: 'bridge.fitted_hafts', name: 'Fitted Hafts', desc: 'Hafted weapons gain one tuning dial; Woodcrafting is 25% slower' },
  { id: 'chosen_timber', stat: 'bridge.chosen_timber', name: 'Chosen Timber', desc: 'Special giants are more common in the woods your saved tunings use; giants yield 25% less' },
  { id: 'forest_floor', stat: 'bridge.forest_floor', name: 'Forest Floor', desc: 'Felled giants drop a seed variant; Greenhouse grows 25% slower' },
  { id: 'living_infusions', stat: 'bridge.living_infusions', name: 'Living Infusions', desc: 'Mutated herbs give much stronger infusions; unmutated herbs cannot infuse' },
  { id: 'starlit_draughts', stat: 'bridge.starlit_draughts', name: 'Starlit Draughts', desc: "Your constellation's strongest star also boosts flask effects; recharting costs double" },
  { id: 'ancient_skies', stat: 'bridge.ancient_skies', name: 'Ancient Skies', desc: 'Sky inscriptions give star research progress; digs are 25% slower' },
  { id: 'lost_routes', stat: 'bridge.lost_routes', name: 'Lost Routes', desc: 'Finished story chapters can reveal a Lost Chart; Archaeology is 25% slower' },
  { id: 'inside_job', stat: 'bridge.inside_job', name: 'Inside Job', desc: 'Vault maps can drop Heist prep; marks pay 25% less gold' },
  { id: 'fences_eye', stat: 'bridge.fences_eye', name: "Fence's Eye", desc: 'Heists drop larger rough gems; Heists pay 25% less gold' },
  { id: 'crystal_sense', stat: 'bridge.crystal_sense', name: 'Crystal Sense', desc: 'Crystal-bearing Delve layers twice as common; other traits 25% rarer' },
];

const CORE_NODES: { id: string; name: string; stats: SkillTreeStats; desc: string }[] = [
  { id: 'core_overtime', name: 'Overtime', stats: { offlineSpeed: 10 }, desc: 'Skilling while offline is 10% faster' },
  { id: 'core_sharp_focus', name: 'Sharp Focus', stats: { sharpFocus: 15 }, desc: 'Double zones in every minigame are 15% wider' },
  { id: 'core_curious', name: 'Curious', stats: { curious: 100 }, desc: 'Hidden collectibles are twice as likely to be found' },
  { id: 'core_studious', name: 'Studious', stats: { skillXp: 3 }, desc: '3% increased skill XP' },
  { id: 'core_steady_hands', name: 'Steady Hands', stats: { inputSave: 5 }, desc: '5% chance for production not to consume its inputs' },
  { id: 'core_patient_crafter', name: 'Patient Crafter', stats: { patientCrafter: 10 }, desc: 'Auto-crafting has a 10% chance each step not to use the orb' },
];

function polar(r: number, deg: number): { x: number; y: number } {
  const a = (deg * Math.PI) / 180;
  return { x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) };
}

export const SKILL_TREE_START = 'skill_core';

function build(): SkillTreeNode[] {
  const nodes: Record<string, SkillTreeNode> = {};
  const add = (n: Omit<SkillTreeNode, 'links'>) => (nodes[n.id] = { ...n, links: [] });
  const link = (a: string, b: string) => {
    if (!nodes[a].links.includes(b)) nodes[a].links.push(b);
    if (!nodes[b].links.includes(a)) nodes[b].links.push(a);
  };

  add({ id: SKILL_TREE_START, name: 'Craftsman', kind: 'core', branch: 'core', x: 0, y: 0, stats: {}, desc: 'Every skilling path starts here' });

  // 6 Core nodes in a small ring
  CORE_NODES.forEach((c, i) => {
    add({ id: c.id, name: c.name, kind: 'small', branch: 'core', ...polar(85, -90 + i * 60), stats: c.stats, desc: c.desc });
    link(SKILL_TREE_START, c.id);
  });
  CORE_NODES.forEach((c, i) => link(c.id, CORE_NODES[(i + 1) % CORE_NODES.length].id));

  const nearestCore = (angle: number) => {
    const target = polar(85, angle);
    return CORE_NODES.reduce((best, c) => {
      const dn = (nodes[c.id].x - target.x) ** 2 + (nodes[c.id].y - target.y) ** 2;
      const db = (nodes[best.id].x - target.x) ** 2 + (nodes[best.id].y - target.y) ** 2;
      return dn < db ? c : best;
    }, CORE_NODES[0]).id;
  };

  // 12 Branches in ring order: 2 trunk smalls + 2 forks (3 smalls + 2 notables + 1 keystone each) = 14 nodes/branch
  BRANCH_SPECS.forEach((b, idx) => {
    const angle = -90 + idx * 30;
    const t0 = `${b.skill}_t0`;
    const t1 = `${b.skill}_t1`;
    add({ id: t0, name: b.trunk.name, kind: 'small', branch: b.skill, ...polar(155, angle), stats: b.trunk.stats, desc: b.trunk.desc });
    add({ id: t1, name: b.trunk.name, kind: 'small', branch: b.skill, ...polar(205, angle), stats: b.trunk.stats, desc: b.trunk.desc });
    link(nearestCore(angle), t0);
    link(t0, t1);

    b.forks.forEach((fork, fIdx) => {
      const fAngle = angle + (fIdx === 0 ? -8 : 8);
      const smallIds = [0, 1, 2].map((sIdx) => {
        const id = `${b.skill}_f${fIdx}_s${sIdx}`;
        add({
          id,
          name: fork.smallName,
          kind: 'small',
          branch: b.skill,
          ...polar(255 + sIdx * 45, fAngle),
          stats: { [fork.smallStat]: fork.smallVal },
          desc: fork.smallDesc,
          req: { skill: b.skill, level: 30 },
        });
        return id;
      });
      link(t1, smallIds[0]);
      link(smallIds[0], smallIds[1]);
      link(smallIds[1], smallIds[2]);

      const n0 = `${b.skill}_f${fIdx}_n0`;
      const n1 = `${b.skill}_f${fIdx}_n1`;
      const ks = `${b.skill}_f${fIdx}_ks`;
      add({ id: n0, ...fork.n0, kind: 'notable', branch: b.skill, ...polar(395, fAngle), req: { skill: b.skill, level: 30 } });
      add({ id: n1, ...fork.n1, kind: 'notable', branch: b.skill, ...polar(445, fAngle), req: { skill: b.skill, level: 30 } });
      add({ id: ks, ...fork.ks, kind: 'keystone', branch: b.skill, ...polar(500, fAngle), req: { skill: b.skill, level: 50 } });
      link(smallIds[2], n0);
      link(n0, n1);
      link(n1, ks);
    });
  });

  // 12 Bridge keystones between neighbouring branches
  BRIDGES.forEach((br, idx) => {
    const left = SKILLING_RING[idx];
    const right = SKILLING_RING[(idx + 1) % SKILLING_RING.length];
    const angle = -90 + idx * 30 + 15;
    const id = `bridge_${br.id}`;
    add({
      id,
      name: br.name,
      kind: 'keystone',
      branch: 'bridge',
      ...polar(395, angle),
      stats: { [br.stat]: 1 },
      desc: br.desc,
      bridgeReq: [left, right],
    });
    link(id, `${left}_f1_n0`);
    link(id, `${right}_f0_n0`);
  });

  return Object.values(nodes);
}

export const SKILL_TREE_NODES: SkillTreeNode[] = build();
export const SKILL_TREE_BY_ID: Record<string, SkillTreeNode> = Object.fromEntries(SKILL_TREE_NODES.map((n) => [n.id, n]));

export const HERB_TIERS = ['sunpetal', 'frostleaf', 'emberroot', 'voidbloom'];
export const ORB_TIERS = ['transmute', 'augment', 'alteration', 'scour', 'regret', 'alchemy'];
