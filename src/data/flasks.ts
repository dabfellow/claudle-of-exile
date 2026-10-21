import type { InstillCondition, StatKey } from '../engine/types';

export interface FlaskDef {
  id: string;
  name: string;
  kind: 'life' | 'utility';
  color: string;
  maxCharges: number;
  chargesPerUse: number;
  durationMs: number;
  /** life flasks: total life recovered over the duration */
  heal?: number;
  /** utility flasks: stats granted while active */
  buff?: Partial<Record<StatKey, number>>;
  desc: string;
  price: number;
}

export const FLASKS: FlaskDef[] = [
  {
    id: 'life_small', name: 'Small Life Flask', kind: 'life', color: '#d6453d',
    maxCharges: 21, chargesPerUse: 7, durationMs: 1500, heal: 70, desc: 'Recovers 70 Life over 1.5s', price: 30,
  },
  {
    id: 'life_medium', name: 'Medium Life Flask', kind: 'life', color: '#d6453d',
    maxCharges: 28, chargesPerUse: 7, durationMs: 1500, heal: 200, desc: 'Recovers 200 Life over 1.5s', price: 150,
  },
  {
    id: 'life_grand', name: 'Grand Life Flask', kind: 'life', color: '#d6453d',
    maxCharges: 30, chargesPerUse: 10, durationMs: 1200, heal: 520, desc: 'Recovers 520 Life over 1.2s', price: 600,
  },
  {
    id: 'granite', name: 'Granite Flask', kind: 'utility', color: '#9b8e7e',
    maxCharges: 30, chargesPerUse: 15, durationMs: 4500, buff: { armour: 400, armourPct: 40 },
    desc: '+400 Armour and 40% increased Armour for 4.5s', price: 200,
  },
  {
    id: 'quicksilver', name: 'Quicksilver Flask', kind: 'utility', color: '#c9d3dc',
    maxCharges: 40, chargesPerUse: 20, durationMs: 5000, buff: { attackSpeedPct: 30 },
    desc: '30% increased Attack Speed for 5s', price: 260,
  },
  {
    id: 'diamond', name: 'Diamond Flask', kind: 'utility', color: '#bfe3ff',
    maxCharges: 40, chargesPerUse: 20, durationMs: 4500, buff: { critChancePct: 150 },
    desc: '150% increased Critical Strike Chance for 4.5s', price: 320,
  },
  {
    id: 'ruby', name: 'Ruby Flask', kind: 'utility', color: '#ff6a5a',
    maxCharges: 40, chargesPerUse: 20, durationMs: 4500, buff: { allRes: 35 },
    desc: '+35% to all Elemental Resistances for 4.5s', price: 220,
  },
];

export function flaskDef(id: string): FlaskDef {
  const f = FLASKS.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown flask ${id}`);
  return f;
}

export const INSTILL_CONDITIONS: { id: InstillCondition; label: string; desc: string }[] = [
  { id: 'lowLife', label: 'Low Life', desc: 'Used when Life drops below 50%' },
  { id: 'fullCharges', label: 'Full Charges', desc: 'Used whenever the flask is full' },
  { id: 'bossCast', label: 'Boss Wind-up', desc: 'Used when a boss begins a heavy attack' },
];

export const FLASK_SLOTS = 5;
