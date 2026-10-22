import type { StatKey } from '../engine/types';

/**
 * The character tree (docs/TREES.md): three attribute regions with six clusters and two
 * keystones each, plus three hybrid zones between them. Every cluster is 3 small nodes →
 * a notable, with a mastery (pick 1 of 3) beside the notable.
 */
export type PassiveKind = 'start' | 'small' | 'travel' | 'notable' | 'mastery' | 'keystone';
export type TreeRegion = 'str' | 'dex' | 'int' | 'duelist' | 'shadow' | 'templar';

type StatMap = Partial<Record<StatKey, number>>;

export interface MasteryOption {
  label: string;
  stats: StatMap;
}

export interface PassiveNode {
  id: string;
  name: string;
  kind: PassiveKind;
  region: TreeRegion;
  /** cluster id for smalls, notables and masteries */
  cluster?: string;
  x: number;
  y: number;
  stats: StatMap;
  links: string[];
  desc?: string;
  /** mastery choices */
  options?: MasteryOption[];
}

interface ClusterSpec {
  id: string;
  smallName: string;
  small: StatMap;
  notable: { name: string; stats: StatMap };
  mastery: MasteryOption[];
}

interface KeystoneSpec {
  name: string;
  stats: StatMap;
  desc: string;
}

const m = (label: string, stats: StatMap): MasteryOption => ({ label, stats });

interface RegionSpec {
  key: 'str' | 'dex' | 'int';
  angle: number;
  startName: string;
  travel: StatMap;
  inner: [ClusterSpec, ClusterSpec, ClusterSpec];
  outer: [ClusterSpec, ClusterSpec, ClusterSpec];
  keystones: [KeystoneSpec, KeystoneSpec];
}

const REGIONS: RegionSpec[] = [
  {
    key: 'str',
    angle: -90,
    startName: 'Warrior',
    travel: { str: 10 },
    inner: [
      {
        id: 'iron_skin', smallName: 'Toughened Hide', small: { armourPct: 12 },
        notable: { name: 'Iron Skin', stats: { armourPct: 30, armour: 40 } },
        mastery: [m('+15% increased Armour', { armourPct: 15 }), m('Armour also applies to 10% of elemental damage', { armourVsElem: 10 }), m('10% less damage taken from boss wind-ups', { slamReduction: 10 })],
      },
      {
        id: 'heart_of_stone', smallName: 'Vitality', small: { life: 8 },
        notable: { name: 'Bloodline', stats: { lifePct: 8, lifeRegen: 1.5 } },
        mastery: [m('5% increased maximum Life', { lifePct: 5 }), m('Regenerate 0.5% of Life per second', { lifeRegenPct: 0.5 }), m('20% increased Life Flask recovery', { lifeFlaskRecovery: 20 })],
      },
      {
        id: 'brute_force', smallName: 'Might', small: { physPct: 8 },
        notable: { name: 'Brute Force', stats: { physPct: 25, stunChance: 10 } },
        mastery: [m('10% increased Physical Damage', { physPct: 10 }), m('15% longer Stuns', { stunDuration: 15 }), m('10% more damage against Stunned enemies', { stunnedVuln: 10 })],
      },
    ],
    outer: [
      {
        id: 'bulwark', smallName: 'Bulwark', small: { armourPct: 6, life: 4 },
        notable: { name: 'Unyielding', stats: { extraBlocks: 1 } },
        mastery: [m('Guard skills also grant 20% increased Armour for 3s', { guardArmourPct: 20 }), m('15% faster Guard skill Cooldowns', { guardCooldown: 15 }), m('Blocking a hit restores 3% of Life', { blockHeal: 3 })],
      },
      {
        id: 'warlord', smallName: 'Command', small: { skillDuration: 6 },
        notable: { name: 'Warlord', stats: { skillDuration: 30, cooldownRecovery: 10 } },
        mastery: [m('5% more damage while a buff skill is active', { buffMore: 5 }), m('War Cry restores 5% of Life', { warCryHeal: 5 }), m('Buff skills last 2s longer', { buffDurationFlat: 2000 })],
      },
      {
        id: 'butcher', smallName: 'Laceration', small: { bleedPct: 10 },
        notable: { name: 'Butcher', stats: { bleedPct: 30, bleedDuration: 20 } },
        mastery: [m('Bleeds deal 15% more damage to bosses', { bleedBossMore: 15 }), m('Bleeding enemies take 5% more damage', { bleedVuln: 5 }), m('Bleeds last 1s longer', { bleedDurationFlat: 1000 })],
      },
    ],
    keystones: [
      { name: 'Unbreakable', stats: { armourMore: 60, attackSpeedMore: -15 }, desc: '60% more Armour. 15% less Attack Speed.' },
      { name: 'Blood Pact', stats: { bloodPact: 1 }, desc: 'Skills cost Life instead of Mana. You have no Mana.' },
    ],
  },
  {
    key: 'dex',
    angle: 30,
    startName: 'Ranger',
    travel: { dex: 10 },
    inner: [
      {
        id: 'fleetfoot', smallName: 'Evasion', small: { evasionPct: 12 },
        notable: { name: 'Fleetfoot', stats: { evasionPct: 30, attackSpeedPct: 5 } },
        mastery: [m('15% increased Evasion Rating', { evasionPct: 15 }), m('Evading a hit restores 2% of Life', { evadeHeal: 2 }), m('5% increased Attack Speed for 4s after you evade', { evadeSpeed: 5 })],
      },
      {
        id: 'precision', smallName: 'Keen Eye', small: { critChancePct: 10, accuracy: 20 },
        notable: { name: 'Precision', stats: { critChancePct: 30, accuracy: 60 } },
        mastery: [m('10% increased Critical Strike Chance', { critChancePct: 10 }), m('+50 to Accuracy Rating', { accuracy: 50 }), m('Crits against full-Life enemies deal 30% more damage', { critFullLife: 30 })],
      },
      {
        id: 'executioner', smallName: 'Lethality', small: { critMulti: 8 },
        notable: { name: 'Executioner', stats: { critMulti: 25 } },
        mastery: [m('+10% to Critical Strike Multiplier', { critMulti: 10 }), m('20% more damage against enemies below 30% Life', { lowLifeDamage: 20 }), m('Critical strikes leech 1% of damage as Life', { critLeech: 1 })],
      },
    ],
    outer: [
      {
        id: 'blade_dancer', smallName: 'Swiftness', small: { attackSpeedPct: 3 },
        notable: { name: 'Blade Dancer', stats: { attackSpeedPct: 8 } },
        mastery: [m('3% increased Attack Speed', { attackSpeedPct: 3 }), m('5% increased Attack Speed with Twin Strike and Lacerate', { dexSkillSpeed: 5 }), m('Repeats (Multistrike, Spell Echo) deal 10% more damage', { repeatMore: 10 })],
      },
      {
        id: 'toxicologist', smallName: 'Venom', small: { poisonPct: 10 },
        notable: { name: 'Toxicologist', stats: { poisonPct: 30, poisonDuration: 20 } },
        mastery: [m('10% increased Poison Damage', { poisonPct: 10 }), m('Poisons last 1s longer', { poisonDurationFlat: 1000 }), m('Poisoned enemies deal 5% less damage', { poisonWeaken: 5 })],
      },
      {
        id: 'phantom', smallName: 'Quickness', small: { cooldownRecovery: 4 },
        notable: { name: 'Phantom', stats: { guardDuration: 30, cooldownRecovery: 10 } },
        mastery: [m('Smoke Step lasts 0.5s longer', { smokeExtra: 500 }), m('8% faster Cooldowns', { cooldownRecovery: 8 }), m('After using a guard skill, your next hit deals 20% more damage', { afterGuardDamage: 20 })],
      },
    ],
    keystones: [
      { name: 'Glass Edge', stats: { critMulti: 80, lifeMore: -25 }, desc: '+80% Critical Strike Multiplier. 25% less maximum Life.' },
      { name: 'Wind Dancer', stats: { windDancer: 1, armourMore: -40 }, desc: 'Evasion can dodge boss wind-ups. 40% less Armour.' },
    ],
  },
  {
    key: 'int',
    angle: 150,
    startName: 'Mage',
    travel: { int: 10 },
    inner: [
      {
        id: 'pyromancer', smallName: 'Kindling', small: { firePct: 10 },
        notable: { name: 'Pyromancer', stats: { firePct: 25, ignitePct: 20 } },
        mastery: [m('10% increased Fire Damage', { firePct: 10 }), m('Ignites spread to another enemy when the target dies', { igniteSpread: 1 }), m('15% longer Ignites', { igniteDuration: 15 })],
      },
      {
        id: 'frostweaver', smallName: 'Rime', small: { coldPct: 10 },
        notable: { name: 'Frostweaver', stats: { coldPct: 25, shieldEffect: 20 } },
        mastery: [m('10% increased Cold Damage', { coldPct: 10 }), m('15% stronger absorb Shields', { shieldEffect: 15 }), m('Cold hits slow enemy attacks by 10% for 3s', { chillOnHit: 10 })],
      },
      {
        id: 'stormcaller', smallName: 'Static', small: { lightPct: 10 },
        notable: { name: 'Stormcaller', stats: { lightPct: 25, extraChains: 1 } },
        mastery: [m('10% increased Lightning Damage', { lightPct: 10 }), m('Chains deal 10% more damage per chain', { chainMore: 10 }), m('10% increased Crit Chance with Lightning skills', { lightCrit: 10 })],
      },
    ],
    outer: [
      {
        id: 'arcane_flow', smallName: 'Arcane Flow', small: { mana: 12, manaRegenPct: 10 },
        notable: { name: 'Arcane Flow', stats: { manaRegenPct: 40, manaCostReduction: 10 } },
        mastery: [m('15% increased Mana Regeneration', { manaRegenPct: 15 }), m('8% reduced Mana Costs', { manaCostReduction: 8 }), m('25% increased Mana Flask recovery', { manaFlaskRecovery: 25 })],
      },
      {
        id: 'spellweaver', smallName: 'Incantation', small: { castSpeedPct: 3 },
        notable: { name: 'Spellweaver', stats: { castSpeedPct: 8, spellCritPct: 20 } },
        mastery: [m('4% increased Cast Speed', { castSpeedPct: 4 }), m('Repeats (Multistrike, Spell Echo) deal 10% more damage', { repeatMore: 10 }), m('+15% to Critical Strike Multiplier with Spells', { spellCritMulti: 15 })],
      },
      {
        id: 'distiller', smallName: 'Distillation', small: { flaskEffect: 5 },
        notable: { name: 'Master Distiller', stats: { flaskEffect: 15, flaskCharges: 20 } },
        mastery: [m('10% increased Flask Effect', { flaskEffect: 10 }), m('15% increased Flask Charges gained', { flaskCharges: 15 }), m('Utility Flasks last 20% longer', { utilityFlaskDuration: 20 })],
      },
    ],
    keystones: [
      { name: "Alchemist's Covenant", stats: { flaskEffect: 50, flaskCharges: 50, lifeMore: -10 }, desc: '50% increased Flask Effect and Charges gained. 10% less maximum Life.' },
      { name: 'Mind over Flesh', stats: { mindOverFlesh: 30 }, desc: '30% of damage is taken from Mana before Life.' },
    ],
  },
];

interface HybridSpec {
  key: 'duelist' | 'shadow' | 'templar';
  angle: number;
  name: string;
  /** the regions on either side; the zone connects to their nearest inner clusters */
  between: ['str' | 'dex' | 'int', 'str' | 'dex' | 'int'];
  travel: StatMap;
  clusters: [ClusterSpec, ClusterSpec];
  keystone: KeystoneSpec;
}

const HYBRIDS: HybridSpec[] = [
  {
    key: 'duelist', angle: -30, name: 'Duelist', between: ['str', 'dex'], travel: { str: 5, dex: 5 },
    clusters: [
      {
        id: 'duelists_edge', smallName: "Duelist's Edge", small: { str: 5, dex: 5 },
        notable: { name: 'Swordmaster', stats: { physPct: 20, attackSpeedPct: 5 } },
        mastery: [m('+5 to Strength and Dexterity', { str: 5, dex: 5 }), m('10% increased Physical Damage with melee skills', { meleePct: 10 }), m('+100 to Accuracy Rating', { accuracy: 100 })],
      },
      {
        id: 'bloodletting', smallName: 'Bloodletting', small: { lifeLeech: 0.3 },
        notable: { name: 'Bloodthirst', stats: { lifeLeech: 1, lifePct: 10 } },
        mastery: [m('+0.5% Life Leech', { lifeLeech: 0.5 }), m('+0.3% Life Leech and Regenerate 2 Life per second', { lifeLeech: 0.3, lifeRegen: 2 }), m('Overkill damage heals you for 5% of it', { overkillHeal: 5 })],
      },
    ],
    keystone: { name: 'Steady Hand', stats: { steadyHand: 1 }, desc: "Your hits always land. You can't deal critical strikes." },
  },
  {
    key: 'shadow', angle: 90, name: 'Shadow', between: ['dex', 'int'], travel: { dex: 5, int: 5 },
    clusters: [
      {
        id: 'saboteur', smallName: 'Saboteur', small: { dex: 5, int: 5 },
        notable: { name: 'Saboteur', stats: { poisonPct: 20, ignitePct: 20 } },
        mastery: [m('10% increased damage with ailments', { ailmentPct: 10 }), m('Ailments last 15% longer', { ailmentDuration: 15 }), m('10% more damage against enemies with 2+ ailments', { multiAilmentVuln: 10 })],
      },
      {
        id: 'spellblade', smallName: 'Spellblade', small: { elemPct: 6 },
        notable: { name: 'Spellblade', stats: { elemPct: 20, attackSpeedPct: 4 } },
        mastery: [m('10% increased Elemental Damage', { elemPct: 10 }), m('Gain 5% of Physical damage as extra Lightning', { physAsLight: 5 }), m('+8% to all Elemental Resistances', { allRes: 8 })],
      },
    ],
    keystone: { name: 'Arcane Recursion', stats: { arcaneRecursion: 1 }, desc: 'Cooldowns recover 40% faster. Skills cost 50% more Mana.' },
  },
  {
    key: 'templar', angle: 210, name: 'Templar', between: ['int', 'str'], travel: { int: 5, str: 5 },
    clusters: [
      {
        id: 'zealot', smallName: 'Zeal', small: { int: 5, str: 5 },
        notable: { name: 'Zealot', stats: { lifeRegen: 3, elemPct: 15 } },
        mastery: [m('+5 to Strength and Intelligence', { str: 5, int: 5 }), m('Regenerate 1 Mana per second', { manaRegenFlat: 1 }), m('10% increased Elemental Damage while above 80% Life', { highLifeElem: 10 })],
      },
      {
        id: 'warding', smallName: 'Warding', small: { allRes: 4 },
        notable: { name: 'Elemental Warding', stats: { allRes: 12, life: 20 } },
        mastery: [m('+5% to all Elemental Resistances', { allRes: 5 }), m('5% reduced elemental damage taken', { elemTakenReduction: 5 }), m('Regenerate 2 Life per second', { lifeRegen: 2 })],
      },
    ],
    keystone: { name: 'Bastion', stats: { bastion: 1 }, desc: 'Your Evasion Rating is converted to Armour.' },
  },
];

function polar(r: number, deg: number): { x: number; y: number } {
  const a = (deg * Math.PI) / 180;
  return { x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) };
}

function build(): PassiveNode[] {
  const nodes: Record<string, PassiveNode> = {};
  const add = (n: Omit<PassiveNode, 'links'>) => (nodes[n.id] = { ...n, links: [] });
  const link = (a: string, b: string) => {
    if (!nodes[a].links.includes(b)) nodes[a].links.push(b);
    if (!nodes[b].links.includes(a)) nodes[b].links.push(a);
  };

  /** 3 smalls → notable, with the mastery off to the side. Returns [first small, notable]. */
  const cluster = (region: TreeRegion, c: ClusterSpec, angle: number, r0: number, side: number): [string, string] => {
    const ids = [1, 2, 3].map((i) => `${c.id}_s${i}`);
    ids.forEach((id, i) => add({ id, name: c.smallName, kind: 'small', region, cluster: c.id, ...polar(r0 + i * 45, angle), stats: c.small }));
    const notable = `${c.id}_n`;
    add({ id: notable, name: c.notable.name, kind: 'notable', region, cluster: c.id, ...polar(r0 + 135, angle), stats: c.notable.stats });
    const mastery = `${c.id}_m`;
    add({ id: mastery, name: `${c.notable.name} Mastery`, kind: 'mastery', region, cluster: c.id, ...polar(r0 + 120, angle + side), stats: {}, options: c.mastery });
    link(ids[0], ids[1]);
    link(ids[1], ids[2]);
    link(ids[2], notable);
    link(notable, mastery);
    return [ids[0], notable];
  };

  const INNER = [-34, 0, 34];
  const OUTER = [-38, 0, 38];
  const entrances: Record<string, string[]> = {};

  for (const reg of REGIONS) {
    const start = `class_${reg.key}`;
    add({ id: start, name: reg.startName, kind: 'start', region: reg.key, ...polar(55, reg.angle), stats: {} });
    const hub = `${reg.key}_hub`;
    add({ id: hub, name: 'Attribute', kind: 'travel', region: reg.key, ...polar(115, reg.angle), stats: reg.travel });
    link(start, hub);
    entrances[reg.key] = [];
    reg.inner.forEach((c, i) => {
      const [first, notable] = cluster(reg.key, c, reg.angle + INNER[i], 170, i === 0 ? -11 : 11);
      link(hub, first);
      entrances[reg.key].push(first);
      // a travel node leads out to the matching outer cluster
      const road = `${reg.key}_road${i}`;
      add({ id: road, name: 'Attribute', kind: 'travel', region: reg.key, ...polar(355, reg.angle + OUTER[i]), stats: reg.travel });
      link(notable, road);
      const [outerFirst] = cluster(reg.key, reg.outer[i], reg.angle + OUTER[i], 400, i === 0 ? -10 : 10);
      link(road, outerFirst);
    });
    reg.keystones.forEach((k, i) => {
      const id = `${reg.key}_ks${i}`;
      add({ id, name: k.name, kind: 'keystone', region: reg.key, ...polar(640, reg.angle + (i === 0 ? -19 : 19)), stats: k.stats, desc: k.desc });
      link(id, `${reg.outer[i].id}_n`);
      link(id, `${reg.outer[i + 1].id}_n`);
    });
  }

  for (const h of HYBRIDS) {
    const gate = `${h.key}_gate`;
    add({ id: gate, name: `${h.name} Gate`, kind: 'travel', region: h.key, ...polar(255, h.angle), stats: h.travel });
    // link to the facing inner clusters of both neighbouring regions
    link(gate, entrances[h.between[0]][2]);
    link(gate, entrances[h.between[1]][0]);
    const [c1First, c1Notable] = cluster(h.key, h.clusters[0], h.angle, 320, 9);
    link(gate, c1First);
    const road = `${h.key}_road`;
    add({ id: road, name: 'Attribute', kind: 'travel', region: h.key, ...polar(500, h.angle), stats: h.travel });
    link(c1Notable, road);
    const [c2First, c2Notable] = cluster(h.key, h.clusters[1], h.angle, 545, -8);
    link(road, c2First);
    const ks = `${h.key}_ks`;
    add({ id: ks, name: h.keystone.name, kind: 'keystone', region: h.key, ...polar(725, h.angle), stats: h.keystone.stats, desc: h.keystone.desc });
    link(c2Notable, ks);
  }

  return Object.values(nodes);
}

export const PASSIVE_NODES: PassiveNode[] = build();
export const PASSIVE_BY_ID: Record<string, PassiveNode> = Object.fromEntries(PASSIVE_NODES.map((n) => [n.id, n]));

export const REGION_NAMES: Record<TreeRegion, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  int: 'Intelligence',
  duelist: 'Duelist',
  shadow: 'Shadow',
  templar: 'Templar',
};
