import type { InstillCondition, StatKey } from '../engine/types';

export interface FlaskDef {
  id: string;
  name: string;
  kind: 'life' | 'mana' | 'utility';
  color: string;
  maxCharges: number;
  chargesPerUse: number;
  durationMs: number;
  /** life/mana flasks: total recovered over the duration */
  heal?: number;
  /** utility flasks: stats granted while active */
  buff?: Partial<Record<StatKey, number>>;
  desc: string;
  price: number;
  /** lowest monster level that can drop this flask (Infinity: it never drops and can only be brewed) */
  dropLevel: number;
  /** true for unique flasks */
  unique?: boolean;
  flavour?: string;
}

export const FLASKS: FlaskDef[] = [
  {
    id: 'life_small', name: 'Small Life Flask', kind: 'life', color: '#d6453d',
    maxCharges: 21, chargesPerUse: 7, durationMs: 1500, heal: 70, desc: 'Recovers 70 Life over 1.5s', price: 30, dropLevel: 1,
  },
  {
    id: 'life_medium', name: 'Medium Life Flask', kind: 'life', color: '#d6453d',
    maxCharges: 28, chargesPerUse: 7, durationMs: 1500, heal: 200, desc: 'Recovers 200 Life over 1.5s', price: 150, dropLevel: 12,
  },
  {
    id: 'life_grand', name: 'Grand Life Flask', kind: 'life', color: '#d6453d',
    maxCharges: 30, chargesPerUse: 10, durationMs: 1200, heal: 520, desc: 'Recovers 520 Life over 1.2s', price: 600, dropLevel: 28,
  },
  {
    id: 'life_sacred', name: 'Sacred Life Flask', kind: 'life', color: '#e0584f',
    maxCharges: 30, chargesPerUse: 10, durationMs: 1200, heal: 900, desc: 'Recovers 900 Life over 1.2s', price: 1500, dropLevel: Infinity,
  },
  {
    id: 'mana_small', name: 'Small Mana Flask', kind: 'mana', color: '#3d6fd6',
    maxCharges: 24, chargesPerUse: 6, durationMs: 3000, heal: 50, desc: 'Recovers 50 Mana over 3s', price: 30, dropLevel: 1,
  },
  {
    id: 'mana_medium', name: 'Medium Mana Flask', kind: 'mana', color: '#3d6fd6',
    maxCharges: 30, chargesPerUse: 6, durationMs: 3000, heal: 140, desc: 'Recovers 140 Mana over 3s', price: 150, dropLevel: 12,
  },
  {
    id: 'mana_sacred', name: 'Sacred Mana Flask', kind: 'mana', color: '#4f82e8',
    maxCharges: 36, chargesPerUse: 6, durationMs: 3000, heal: 400, desc: 'Recovers 400 Mana over 3s', price: 1000, dropLevel: Infinity,
  },
  {
    id: 'granite', name: 'Granite Flask', kind: 'utility', color: '#9b8e7e',
    maxCharges: 30, chargesPerUse: 15, durationMs: 4500, buff: { armour: 400, armourPct: 40 },
    desc: '+400 Armour and 40% increased Armour for 4.5s', price: 200, dropLevel: 8,
  },
  {
    id: 'quicksilver', name: 'Quicksilver Flask', kind: 'utility', color: '#c9d3dc',
    maxCharges: 40, chargesPerUse: 20, durationMs: 5000, buff: { attackSpeedPct: 30, moveSpeedPct: 40 },
    desc: '30% increased Attack Speed and 40% increased Movement Speed for 5s', price: 260, dropLevel: 14,
  },
  {
    id: 'diamond', name: 'Diamond Flask', kind: 'utility', color: '#bfe3ff',
    maxCharges: 40, chargesPerUse: 20, durationMs: 4500, buff: { critChancePct: 150 },
    desc: '150% increased Critical Strike Chance for 4.5s', price: 320, dropLevel: 22,
  },
  {
    id: 'ruby', name: 'Ruby Flask', kind: 'utility', color: '#ff6a5a',
    maxCharges: 40, chargesPerUse: 20, durationMs: 4500, buff: { allRes: 35 },
    desc: '+35% to all Elemental Resistances for 4.5s', price: 220, dropLevel: 10,
  },
  {
    id: 'amethyst', name: 'Amethyst Flask', kind: 'utility', color: '#a36bdc',
    maxCharges: 40, chargesPerUse: 20, durationMs: 4500, buff: { chaosRes: 35 },
    desc: '+35% to Chaos Resistance for 4.5s', price: 260, dropLevel: 18,
  },
  {
    id: 'sulphur', name: 'Sulphur Flask', kind: 'utility', color: '#d8c94a',
    maxCharges: 40, chargesPerUse: 20, durationMs: 4500, buff: { physPct: 40, elemPct: 40 },
    desc: '40% increased Physical and Elemental Damage for 4.5s', price: 1200, dropLevel: Infinity,
  },
  // ---------- Unique Flasks ----------
  {
    id: 'u_flask_karui', name: 'Blood of the Karui', kind: 'life', color: '#c84b31', unique: true,
    flavour: 'Save your strength for the final blow.',
    maxCharges: 30, chargesPerUse: 15, durationMs: 2500, heal: 1200, buff: { karuiBlood: 1 },
    desc: 'Recovers 1200 Life over 2.5s; recovers Full Life when the effect ends', price: 4000, dropLevel: Infinity,
  },
  {
    id: 'u_flask_lavianga', name: "Lavianga's Spirit", kind: 'mana', color: '#3b82f6', unique: true,
    flavour: 'A clear mind needs no measure.',
    maxCharges: 36, chargesPerUse: 12, durationMs: 4000, heal: 600, buff: { laviangaZeroMana: 1, castSpeedPct: 30 },
    desc: 'Recovers 600 Mana over 4s; Skills cost no Mana and +30% Cast Speed during effect', price: 4000, dropLevel: Infinity,
  },
  {
    id: 'u_flask_lions_roar', name: "Lion's Roar", kind: 'utility', color: '#d97706', unique: true,
    flavour: 'When the king of the steppe speaks, the grass lies flat.',
    maxCharges: 40, chargesPerUse: 20, durationMs: 5000, buff: { armour: 600, armourPct: 50, lionsRoarMoreMelee: 25 },
    desc: '+600 Armour, 50% increased Armour and 25% more Melee Physical Damage for 5s', price: 4500, dropLevel: Infinity,
  },
  {
    id: 'u_flask_bottled_faith', name: 'Bottled Faith', kind: 'utility', color: '#f59e0b', unique: true,
    flavour: 'A drop of the High Altar, stoppered in crystal.',
    maxCharges: 40, chargesPerUse: 20, durationMs: 5500, buff: { critChancePct: 150, elemPct: 40, bottledFaithCrit: 15 },
    desc: '150% increased Crit Chance, 40% Elemental Damage and enemies take 15% increased Damage for 5.5s', price: 5000, dropLevel: Infinity,
  },
  {
    id: 'u_flask_dying_sun', name: 'Dying Sun', kind: 'utility', color: '#ef4444', unique: true,
    flavour: 'Even as it cools, it burns brighter than any hearth.',
    maxCharges: 40, chargesPerUse: 20, durationMs: 4500, buff: { fireRes: 50, allRes: 20, projectilePct: 35, dyingSunProj: 2 },
    desc: '+20% All Res, +35% Projectile Damage and Skills fire 2 additional Projectiles for 4.5s', price: 5000, dropLevel: Infinity,
  },
];

export const UNIQUE_FLASKS: FlaskDef[] = FLASKS.filter((f) => f.unique);

export function flaskDef(id: string): FlaskDef {
  const f = FLASKS.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown flask ${id}`);
  return f;
}

// ---------- flask modifiers ----------

export type FlaskStat = 'recovery' | 'capacity' | 'saving' | 'duration' | 'gain';

export interface FlaskAffixDef {
  id: string;
  kind: 'prefix' | 'suffix';
  /** magic flask name fragment */
  label: string;
  text: string;
  stat: FlaskStat;
  /** which flasks it can roll on */
  for: ('life' | 'mana' | 'utility')[];
  tiers: { ilvl: number; range: [number, number] }[];
}

export const FLASK_AFFIXES: FlaskAffixDef[] = [
  {
    id: 'f_recovery', kind: 'prefix', label: 'Concentrated', text: '{0}% increased Amount Recovered', stat: 'recovery', for: ['life', 'mana'],
    tiers: [{ ilvl: 1, range: [15, 25] }, { ilvl: 15, range: [26, 40] }, { ilvl: 30, range: [41, 60] }],
  },
  {
    id: 'f_effect', kind: 'prefix', label: 'Potent', text: '{0}% increased Effect', stat: 'recovery', for: ['utility'],
    tiers: [{ ilvl: 1, range: [10, 15] }, { ilvl: 15, range: [16, 22] }, { ilvl: 30, range: [23, 30] }],
  },
  {
    id: 'f_capacity', kind: 'prefix', label: 'Capacious', text: '{0}% increased Maximum Charges', stat: 'capacity', for: ['life', 'mana', 'utility'],
    tiers: [{ ilvl: 1, range: [20, 30] }, { ilvl: 15, range: [31, 45] }, { ilvl: 30, range: [46, 60] }],
  },
  {
    id: 'f_saving', kind: 'prefix', label: 'Sparing', text: '{0}% reduced Charges used', stat: 'saving', for: ['life', 'mana', 'utility'],
    tiers: [{ ilvl: 1, range: [10, 15] }, { ilvl: 15, range: [16, 22] }, { ilvl: 30, range: [23, 30] }],
  },
  {
    id: 'f_duration', kind: 'suffix', label: 'of Lingering', text: '{0}% increased Duration', stat: 'duration', for: ['utility'],
    tiers: [{ ilvl: 1, range: [15, 25] }, { ilvl: 15, range: [26, 35] }, { ilvl: 30, range: [36, 50] }],
  },
  {
    id: 'f_speed', kind: 'suffix', label: 'of the Rush', text: '{0}% faster Recovery', stat: 'duration', for: ['life', 'mana'],
    tiers: [{ ilvl: 1, range: [-20, -15] }, { ilvl: 15, range: [-30, -21] }, { ilvl: 30, range: [-45, -31] }],
  },
  {
    id: 'f_gain', kind: 'suffix', label: 'of the Hoarder', text: '{0}% increased Charges gained', stat: 'gain', for: ['life', 'mana', 'utility'],
    tiers: [{ ilvl: 1, range: [15, 25] }, { ilvl: 15, range: [26, 40] }, { ilvl: 30, range: [41, 60] }],
  },
];

export function flaskAffixDef(id: string): FlaskAffixDef {
  const a = FLASK_AFFIXES.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown flask affix ${id}`);
  return a;
}

export const INSTILL_CONDITIONS: { id: InstillCondition; label: string; desc: string; act?: number }[] = [
  { id: 'lowLife', label: 'Low Life', desc: 'Used automatically when Life drops below 50%' },
  { id: 'lowMana', label: 'Low Mana', desc: 'Used automatically when Mana drops below 30%' },
  { id: 'fullCharges', label: 'Full Charges', desc: 'Used automatically whenever the flask is full' },
  { id: 'bossCast', label: 'Boss Wind-up', desc: 'Used automatically when a boss begins a heavy attack' },
  { id: 'savageHit', label: 'Savage Hit', desc: 'Used automatically when one hit takes 20% or more of your maximum Life' },
  { id: 'elemHit', label: 'Elemental Hit', desc: 'Used automatically when you take a fire, cold or lightning hit' },
  { id: 'chaosHit', label: 'Chaos Hit', desc: 'Used automatically when you take a chaos hit' },
  { id: 'frostbite', label: 'Frostbite', desc: 'Used automatically at 6 Frostbite stacks, which it clears', act: 4 },
  { id: 'enemyRanged', label: 'Distant Enemy', desc: 'Used automatically when an enemy is outside melee range (great with Fisherman’s Knot)' },
  { id: 'packStart', label: 'New Pack', desc: 'Used automatically when a new monster wave arrives' },
];

export const FLASK_SLOTS = 4;
export const FLASK_SLOT_TYPES: readonly ('life' | 'mana' | 'utility')[] = ['life', 'mana', 'utility', 'utility'] as const;
