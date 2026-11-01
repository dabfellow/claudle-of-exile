import type { SkillId } from '../engine/types';

/**
 * The skilling tree (docs/design/TREES.md §2): a shared core and one branch per gathering/production
 * skill. Points come from total skill level; deeper nodes need a level in that skill.
 */
export type SkillTreeStat =
  | 'skillSpeed'
  | 'skillXp'
  | 'inputSave'
  | 'offlineSpeed'
  | 'patientCrafter'
  | 'miningSpeed'
  | 'gemChance'
  | 'fossilChance'
  | 'motherlode'
  | 'woodcuttingSpeed'
  | 'birdsNest'
  | 'resinChance'
  | 'resinIlvl'
  | 'heartwood'
  | 'harvestingSpeed'
  | 'distiller'
  | 'rareBlooms'
  | 'greenhouse'
  | 'smithingSpeed'
  | 'steadyTemper'
  | 'smithMagic'
  | 'grandmaster'
  | 'alchemySpeed'
  | 'bulkBrewer'
  | 'qualityBrews'
  | 'transmuter'
  | 'thievingSpeed'
  | 'markerChance'
  | 'alertReduce'
  | 'cleanGetaway'
  | 'archaeologySpeed'
  | 'artifactChance'
  | 'wareDiscount'
  | 'deepSurvey'
  | 'runecarvingSpeed'
  | 'secondStroke'
  | 'deepCuts'
  | 'livingScript'
  | 'cookingSpeed'
  | 'secondHelping'
  | 'slowSimmer'
  | 'headChef'
  | 'fishingSpeed'
  | 'fishTreasure'
  | 'biggerFish'
  | 'theBigOne';

export type SkillTreeStats = Partial<Record<SkillTreeStat, number>>;

export interface SkillTreeNode {
  id: string;
  name: string;
  kind: 'core' | 'small' | 'notable' | 'keystone';
  branch: 'core' | Exclude<SkillId, 'combat'>;
  x: number;
  y: number;
  stats: SkillTreeStats;
  desc: string;
  req?: { skill: Exclude<SkillId, 'combat'>; level: number };
  links: string[];
}

interface BranchSpec {
  skill: Exclude<SkillId, 'combat'>;
  angle: number;
  small: { name: string; stats: SkillTreeStats; desc: string };
  notables: [
    { name: string; stats: SkillTreeStats; desc: string },
    { name: string; stats: SkillTreeStats; desc: string },
  ];
  keystone: { name: string; stats: SkillTreeStats; desc: string };
}

const BRANCHES: BranchSpec[] = [
  {
    skill: 'mining',
    angle: -90,
    small: { name: 'Prospector', stats: { miningSpeed: 5 }, desc: '5% faster Mining' },
    notables: [
      { name: 'Gem Finder', stats: { gemChance: 100 }, desc: 'Rough Gem chance from mining is doubled' },
      { name: 'Fossil Hunter', stats: { fossilChance: 50 }, desc: '50% increased chance to find Fossils' },
    ],
    keystone: { name: 'Motherlode', stats: { motherlode: 1 }, desc: 'Ore yields are doubled. Mining is 30% slower' },
  },
  {
    skill: 'woodcutting',
    angle: -30,
    small: { name: 'Lumberjack', stats: { woodcuttingSpeed: 5 }, desc: '5% faster Woodcutting' },
    notables: [
      { name: "Bird's Nest", stats: { birdsNest: 3 }, desc: '3% chance to find a herb while chopping' },
      { name: 'Sap Tapper', stats: { resinChance: 50, resinIlvl: 1 }, desc: '50% increased chance to find Resin. Resin gives +1 extra item level' },
    ],
    keystone: { name: 'Heartwood', stats: { heartwood: 1 }, desc: 'Logs also yield Arcane Dust. Woodcutting XP is 20% lower' },
  },
  {
    skill: 'harvesting',
    angle: 30,
    small: { name: 'Green Thumb', stats: { harvestingSpeed: 5 }, desc: '5% faster Foraging' },
    notables: [
      { name: 'Distiller', stats: { distiller: 10 }, desc: 'Lesser Essences you find have a 10% chance to be Greater' },
      { name: 'Rare Blooms', stats: { rareBlooms: 5 }, desc: '5% chance to also find a herb of the next tier' },
    ],
    keystone: { name: 'Greenhouse', stats: { greenhouse: 20 }, desc: 'Your last Foraging spot keeps growing at 20% speed while you do something else' },
  },
  {
    // Fishing is coming soon: these stats are summed like any other and read by nothing
    skill: 'fishing',
    angle: 90,
    small: { name: 'Patient Angler', stats: { fishingSpeed: 5 }, desc: '5% faster Fishing' },
    notables: [
      { name: 'Lucky Lure', stats: { fishTreasure: 25 }, desc: '25% increased chance to reel in treasure' },
      { name: 'Bigger Fish', stats: { biggerFish: 10 }, desc: 'Fish you catch are 10% bigger. Nobody will believe you' },
    ],
    keystone: { name: 'The One That Got Away', stats: { theBigOne: 1 }, desc: 'Every catch is a Thunder Marlin. Fishing is 1000% slower' },
  },
  {
    skill: 'smithing',
    angle: 150,
    small: { name: 'Hammerhand', stats: { smithingSpeed: 5 }, desc: '5% faster Smithing' },
    notables: [
      { name: 'Steady Temper', stats: { steadyTemper: 20 }, desc: '20% chance a smithing Fossil is not consumed' },
      { name: 'Masterwork', stats: { smithMagic: 10 }, desc: '10% chance a smithed base comes out Magic' },
    ],
    keystone: { name: 'Grandmaster Smith', stats: { grandmaster: 1 }, desc: 'Smithed bases are always Magic. Smithing is 25% slower' },
  },
  {
    skill: 'thieving',
    angle: 180,
    small: { name: 'Quick Hands', stats: { thievingSpeed: 5 }, desc: '5% faster Thieving and Heist rooms' },
    notables: [
      { name: 'Light Fingers', stats: { markerChance: 50 }, desc: "50% increased chance to lift a Rogue's Marker" },
      { name: 'Inside Man', stats: { alertReduce: 20 }, desc: '20% lower chance of an alarm in every Heist room' },
    ],
    keystone: { name: 'Clean Getaway', stats: { cleanGetaway: 1 }, desc: 'An alarm costs you none of the take. Heist jobs cost 50% more Markers' },
  },
  {
    skill: 'runecarving',
    angle: 120,
    small: { name: 'Steady Chisel', stats: { runecarvingSpeed: 5 }, desc: '5% faster Rune-carving' },
    notables: [
      { name: 'Second Stroke', stats: { secondStroke: 15 }, desc: '15% chance to carve two runes for one' },
      { name: 'Deep Cuts', stats: { deepCuts: 10 }, desc: 'Runes on your gear are 10% stronger' },
    ],
    keystone: { name: 'Living Script', stats: { livingScript: 1 }, desc: 'Resonance between your runes is doubled. Rune-carving is 25% slower' },
  },
  {
    skill: 'archaeology',
    angle: -60,
    small: { name: 'Trowelwork', stats: { archaeologySpeed: 5 }, desc: '5% faster Archaeology' },
    notables: [
      { name: 'Keen Eye', stats: { artifactChance: 25 }, desc: '25% more Artifacts from every dig' },
      { name: 'Silver Tongue', stats: { wareDiscount: 15 }, desc: "Merchants' prices are 15% lower" },
    ],
    keystone: { name: 'Deep Survey', stats: { deepSurvey: 1 }, desc: "Every dig counts twice towards a site's next find. Archaeology is 25% slower" },
  },
  {
    skill: 'cooking',
    angle: 60,
    small: { name: 'Line Cook', stats: { cookingSpeed: 5 }, desc: '5% faster Cooking' },
    notables: [
      { name: 'Second Helping', stats: { secondHelping: 15 }, desc: '15% chance to cook two for one' },
      { name: 'Slow Simmer', stats: { slowSimmer: 25 }, desc: 'Meals last 25% longer' },
    ],
    keystone: { name: 'Head Chef', stats: { headChef: 1 }, desc: 'Meals are 30% stronger. Cooking is 25% slower' },
  },
  {
    skill: 'alchemy',
    angle: 210,
    small: { name: 'Distillation', stats: { alchemySpeed: 5 }, desc: '5% faster Alchemy' },
    notables: [
      { name: 'Bulk Brewer', stats: { bulkBrewer: 1 }, desc: 'Batch recipes cost 25% less per orb instead of 15%' },
      { name: 'Quality Brews', stats: { qualityBrews: 25 }, desc: 'Brewed flasks have a 25% chance to be Magic' },
    ],
    keystone: { name: 'Transmuter', stats: { transmuter: 10 }, desc: 'Orbs you craft have a 10% chance to come out one tier higher. Alchemy is 20% slower' },
  },
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

  // core ring: alternating Industrious / Studious, with Overtime at the bottom
  const ring: string[] = [];
  for (let i = 0; i < 6; i++) {
    const id = `core_${i}`;
    const industrious = i % 2 === 0;
    const small =
      i === 3
        ? { name: 'Overtime', stats: { offlineSpeed: 10 }, desc: 'Skilling while offline is 10% faster' }
        : industrious
          ? { name: 'Industrious', stats: { skillSpeed: 3 }, desc: '3% faster gathering and production' }
          : { name: 'Studious', stats: { skillXp: 3 }, desc: '3% increased skill XP' };
    add({ id, ...small, kind: 'small', branch: 'core', ...polar(85, -90 + i * 60) });
    link(SKILL_TREE_START, id);
    ring.push(id);
  }
  ring.forEach((id, i) => link(id, ring[(i + 1) % ring.length]));

  const ringAt = (angle: number) =>
    ring.reduce((best, id) => {
      const n = nodes[id];
      const bn = nodes[best];
      const target = polar(85, angle);
      const dist = (p: { x: number; y: number }) => (p.x - target.x) ** 2 + (p.y - target.y) ** 2;
      return dist(n) < dist(bn) ? id : best;
    }, ring[0]);

  add({ id: 'core_steady', name: 'Steady Hands', kind: 'notable', branch: 'core', ...polar(150, 105), stats: { inputSave: 5 }, desc: '5% chance for production not to consume its inputs' });
  link('core_steady', ringAt(90));
  add({ id: 'core_overtime', name: 'Patient Crafter', kind: 'notable', branch: 'core', ...polar(150, 240), stats: { patientCrafter: 10 }, desc: 'Auto-crafting has a 10% chance each step not to use the orb' });
  link('core_overtime', ringAt(234));

  for (const b of BRANCHES) {
    const smalls = [0, 1, 2].map((i) => {
      const id = `${b.skill}_s${i}`;
      add({ id, name: b.small.name, kind: 'small', branch: b.skill, ...polar(175 + i * 50, b.angle), stats: b.small.stats, desc: b.small.desc });
      return id;
    });
    link(ringAt(b.angle), smalls[0]);
    link(smalls[0], smalls[1]);
    link(smalls[1], smalls[2]);
    const n1 = `${b.skill}_n0`;
    const n2 = `${b.skill}_n1`;
    add({ id: n1, ...b.notables[0], kind: 'notable', branch: b.skill, ...polar(330, b.angle - 9), req: { skill: b.skill, level: 15 } });
    add({ id: n2, ...b.notables[1], kind: 'notable', branch: b.skill, ...polar(330, b.angle + 9), req: { skill: b.skill, level: 30 } });
    link(smalls[2], n1);
    link(smalls[2], n2);
    const ks = `${b.skill}_ks`;
    add({ id: ks, ...b.keystone, kind: 'keystone', branch: b.skill, ...polar(420, b.angle), req: { skill: b.skill, level: 50 } });
    link(n1, ks);
    link(n2, ks);
  }
  return Object.values(nodes);
}

export const SKILL_TREE_NODES: SkillTreeNode[] = build();
export const SKILL_TREE_BY_ID: Record<string, SkillTreeNode> = Object.fromEntries(SKILL_TREE_NODES.map((n) => [n.id, n]));

/** Tiers used by Rare Blooms (next herb) and Transmuter (next orb). */
export const HERB_TIERS = ['sunpetal', 'frostleaf', 'emberroot', 'voidbloom'];
export const ORB_TIERS = ['transmute', 'augment', 'alteration', 'scour', 'regret', 'alchemy'];
