import type { StatKey } from '../engine/types';

export type PassiveKind = 'start' | 'small' | 'notable' | 'keystone';

export interface PassiveNode {
  id: string;
  name: string;
  kind: PassiveKind;
  region: 'start' | 'str' | 'dex' | 'int' | 'bridge';
  x: number;
  y: number;
  stats: Partial<Record<StatKey, number>>;
  links: string[];
  desc?: string;
}

type StatMap = Partial<Record<StatKey, number>>;

interface RegionSpec {
  key: 'str' | 'dex' | 'int';
  angle: number;
  smallName: string[];
  small: StatMap[];
  notables: { name: string; stats: StatMap }[];
  keystone: { name: string; stats: StatMap; desc: string };
}

const REGIONS: RegionSpec[] = [
  {
    key: 'str',
    angle: -90,
    smallName: ['Vitality', 'Hardened Hide', 'Might', 'Recovery'],
    small: [{ life: 10 }, { armourPct: 8 }, { physPct: 8 }, { lifeRegen: 1 }],
    notables: [
      { name: 'Iron Skin', stats: { armourPct: 25, armour: 40 } },
      { name: 'Brutal Force', stats: { physPct: 25, critMulti: 10 } },
      { name: 'Bloodline', stats: { lifePct: 8, lifeRegen: 3 } },
    ],
    keystone: {
      name: 'Unbreakable',
      stats: { armourMore: 60, attackSpeedMore: -15 },
      desc: '60% more Armour. 15% less Attack Speed.',
    },
  },
  {
    key: 'dex',
    angle: 30,
    smallName: ['Swiftness', 'Evasion', 'Keen Eye', 'Lethality'],
    small: [{ attackSpeedPct: 3 }, { evasionPct: 8 }, { critChancePct: 10 }, { critMulti: 6 }],
    notables: [
      { name: 'Fleetfoot', stats: { evasionPct: 25, attackSpeedPct: 4 } },
      { name: 'Precision', stats: { critChancePct: 30, critMulti: 12 } },
      { name: 'Flurry', stats: { attackSpeedPct: 9 } },
    ],
    keystone: {
      name: 'Glass Edge',
      stats: { critMulti: 80, lifeMore: -25 },
      desc: '+80% Critical Strike Multiplier. 25% less maximum Life.',
    },
  },
  {
    key: 'int',
    angle: 150,
    smallName: ['Elemental Focus', 'Distillation', 'Warding', 'Craftsmanship'],
    small: [{ elemPct: 8 }, { flaskEffect: 4 }, { allRes: 4 }, { skillSpeed: 3, skillXp: 2 }],
    notables: [
      { name: 'Elementalist', stats: { elemPct: 25, allRes: 6 } },
      { name: 'Master Distiller', stats: { flaskEffect: 15, flaskCharges: 20 } },
      { name: 'Artisan', stats: { skillSpeed: 8, skillXp: 8 } },
    ],
    keystone: {
      name: "Alchemist's Covenant",
      stats: { flaskEffect: 50, flaskCharges: 50, lifeMore: -10 },
      desc: '50% increased Flask Effect and Charges gained. 10% less maximum Life.',
    },
  },
];

const BRIDGES: { between: ['str' | 'dex' | 'int', 'str' | 'dex' | 'int']; angle: number; name: string; stats: StatMap }[] = [
  { between: ['str', 'dex'], angle: -30, name: 'Duelist', stats: { life: 8, attackSpeedPct: 2 } },
  { between: ['dex', 'int'], angle: 90, name: 'Spellblade', stats: { evasionPct: 6, elemPct: 6 } },
  { between: ['int', 'str'], angle: 210, name: 'Templar', stats: { lifeRegen: 1, allRes: 3 } },
];

const START_NAME = { str: 'Warrior', dex: 'Ranger', int: 'Mage' };

function polar(r: number, deg: number): { x: number; y: number } {
  const a = (deg * Math.PI) / 180;
  return { x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) };
}

function build(): PassiveNode[] {
  const nodes: Record<string, PassiveNode> = {};
  const link = (a: string, b: string) => {
    if (!nodes[a].links.includes(b)) nodes[a].links.push(b);
    if (!nodes[b].links.includes(a)) nodes[b].links.push(a);
  };


  for (const reg of REGIONS) {
    let smallIdx = 0;
    const small = (id: string, r: number, off: number): PassiveNode => {
      const i = smallIdx++ % reg.small.length;
      return {
        id,
        name: reg.smallName[i],
        kind: 'small',
        region: reg.key,
        ...polar(r, reg.angle + off),
        stats: reg.small[i],
        links: [],
      };
    };
    const notable = (id: string, r: number, off: number, n: number): PassiveNode => ({
      id,
      name: reg.notables[n].name,
      kind: 'notable',
      region: reg.key,
      ...polar(r, reg.angle + off),
      stats: reg.notables[n].stats,
      links: [],
    });

    const r1 = [-22, 0, 22].map((o, i) => small(`${reg.key}_1_${i}`, 110, o));
    const r2 = [-44, -22, 0, 22, 44].map((o, i) => small(`${reg.key}_2_${i}`, 215, o));
    const r3 = [-40, -20, 0, 20, 40].map((o, i) =>
      i === 0 ? notable(`${reg.key}_3_${i}`, 325, o, 0) : i === 4 ? notable(`${reg.key}_3_${i}`, 325, o, 1) : small(`${reg.key}_3_${i}`, 325, o),
    );
    const r4 = [-14, 0, 14].map((o, i) => (i === 1 ? notable(`${reg.key}_4_${i}`, 425, o, 2) : small(`${reg.key}_4_${i}`, 425, o)));
    const ks: PassiveNode = {
      id: `${reg.key}_ks`,
      name: reg.keystone.name,
      kind: 'keystone',
      region: reg.key,
      ...polar(540, reg.angle),
      stats: reg.keystone.stats,
      links: [],
      desc: reg.keystone.desc,
    };
    for (const n of [...r1, ...r2, ...r3, ...r4, ks]) nodes[n.id] = n;

    // each class starts from its own node; only its own region's inner ring is adjacent
    const startId = `class_${reg.key}`;
    nodes[startId] = { id: startId, name: START_NAME[reg.key], kind: 'start', region: reg.key, ...polar(48, reg.angle), stats: {}, links: [] };
    r1.forEach((n) => link(startId, n.id));
    link(r1[0].id, r1[1].id);
    link(r1[1].id, r1[2].id);
    const parent2 = [0, 0, 1, 2, 2];
    r2.forEach((n, i) => link(n.id, r1[parent2[i]].id));
    for (let i = 0; i < 4; i++) link(r2[i].id, r2[i + 1].id);
    r3.forEach((n, i) => link(n.id, r2[i].id));
    link(r3[1].id, r3[2].id);
    link(r3[2].id, r3[3].id);
    link(r3[1].id, r4[0].id);
    link(r3[2].id, r4[1].id);
    link(r3[3].id, r4[2].id);
    link(r4[0].id, r4[1].id);
    link(r4[1].id, r4[2].id);
    link(r4[1].id, ks.id);
  }

  for (const b of BRIDGES) {
    const id = `bridge_${b.between[0]}_${b.between[1]}`;
    nodes[id] = { id, name: b.name, kind: 'notable', region: 'bridge', ...polar(265, b.angle), stats: b.stats, links: [] };
    link(id, `${b.between[0]}_2_4`);
    link(id, `${b.between[1]}_2_0`);
  }

  return Object.values(nodes);
}

export const PASSIVE_NODES: PassiveNode[] = build();
export const PASSIVE_BY_ID: Record<string, PassiveNode> = Object.fromEntries(PASSIVE_NODES.map((n) => [n.id, n]));
