import { AFFIXES, affixDef, type AffixDef } from '../data/affixes';
import { BASES, baseDef, uniqueDef, type BaseDef } from '../data/bases';
import { pick, pickWeighted, rInt, type Rng } from './rng';
import type { GameState, Item, Rarity, RolledMod } from './types';

export function newUid(s: GameState): number {
  return s.nextUid++;
}

export function maxAffixes(rarity: Rarity): number {
  return rarity === 'magic' ? 1 : rarity === 'rare' ? 3 : 0;
}

export function modCount(item: Item): number {
  return item.prefixes.length + item.suffixes.length;
}

export function spawnWeight(affix: AffixDef, base: BaseDef): number {
  if (affix.uniqueOnly) return 0;
  let w = 0;
  for (const t of base.tags) w = Math.max(w, affix.weights[t] ?? 0);
  return w;
}

function rollValues(affix: AffixDef, tier: number, rng: Rng): number[] {
  return affix.tiers[tier].ranges.map(([lo, hi]) => rInt(rng, lo, hi));
}

/** Affixes that could still roll on this item for the given kind. */
export function eligibleAffixes(item: Item, kind: 'prefix' | 'suffix'): AffixDef[] {
  const base = baseDef(item.baseId);
  const used = new Set([...item.prefixes, ...item.suffixes].map((m) => affixDef(m.affixId).group));
  return AFFIXES.filter(
    (a) => a.kind === kind && !used.has(a.group) && spawnWeight(a, base) > 0 && a.tiers.length > 0 && a.tiers[0].ilvl <= item.ilvl,
  );
}

export function openKinds(item: Item): ('prefix' | 'suffix')[] {
  const max = maxAffixes(item.rarity);
  const kinds: ('prefix' | 'suffix')[] = [];
  if (item.prefixes.length < max && eligibleAffixes(item, 'prefix').length) kinds.push('prefix');
  if (item.suffixes.length < max && eligibleAffixes(item, 'suffix').length) kinds.push('suffix');
  return kinds;
}

/** Adds one random modifier. Returns false if there's no room. */
export function addRandomMod(item: Item, rng: Rng): boolean {
  const kinds = openKinds(item);
  if (!kinds.length) return false;
  const kind = pick(rng, kinds);
  const base = baseDef(item.baseId);
  const affix = pickWeighted(rng, eligibleAffixes(item, kind), (a) => spawnWeight(a, base));
  if (!affix) return false;
  const tiers = affix.tiers.map((t, i) => ({ t, i })).filter((x) => x.t.ilvl <= item.ilvl);
  // higher tiers are rarer: each step up is ~70% as likely as the one below
  const chosen = pickWeighted(rng, tiers, (x) => Math.pow(0.7, x.i))!;
  const mod: RolledMod = { affixId: affix.id, tier: chosen.i, values: rollValues(affix, chosen.i, rng) };
  (kind === 'prefix' ? item.prefixes : item.suffixes).push(mod);
  return true;
}

function rareModCount(rng: Rng): number {
  return pickWeighted(rng, [4, 5, 6], (n) => (n === 4 ? 8 : n === 5 ? 3 : 1))!;
}

const RARE_A = ['Doom', 'Grim', 'Storm', 'Blood', 'Dusk', 'Rune', 'Wrath', 'Gloom', 'Hate', 'Kraken', 'Morbid', 'Pandemonium', 'Rapture', 'Sol', 'Vengeance', 'Ash', 'Bramble', 'Corpse', 'Dread', 'Empyrean', 'Havoc', 'Mind', 'Oblivion', 'Skull', 'Viper'];
const RARE_B: Record<string, string[]> = {
  weapon: ['Bite', 'Edge', 'Song', 'Fang', 'Razor', 'Sever', 'Hunger', 'Gutter'],
  offhand: ['Ward', 'Bulwark', 'Wall', 'Guard', 'Aegis', 'Tower'],
  helmet: ['Crown', 'Brow', 'Visage', 'Halo', 'Dome', 'Peak'],
  body: ['Shell', 'Coat', 'Carapace', 'Hide', 'Mantle', 'Wrap'],
  gloves: ['Grip', 'Clutch', 'Fist', 'Hold', 'Talon', 'Claw'],
  boots: ['Stride', 'March', 'Trail', 'Spur', 'Track', 'Road'],
  belt: ['Coil', 'Lash', 'Girdle', 'Cord', 'Strap', 'Bind'],
  amulet: ['Charm', 'Locket', 'Heart', 'Medallion', 'Talisman', 'Beads'],
  ring: ['Loop', 'Band', 'Circle', 'Knot', 'Spiral', 'Turn'],
};

export function rareName(item: Item, rng: Rng): string {
  const slot = baseDef(item.baseId).slot;
  return `${pick(rng, RARE_A)} ${pick(rng, RARE_B[slot])}`;
}

/** Full display name for an item. */
export function itemName(item: Item): string {
  const base = baseDef(item.baseId);
  if (item.rarity === 'unique' && item.uniqueId) return uniqueDef(item.uniqueId).name;
  if (item.rarity === 'rare') return item.name ?? base.name;
  if (item.rarity === 'magic') {
    const pre = item.prefixes[0] ? affixDef(item.prefixes[0].affixId).label + ' ' : '';
    const suf = item.suffixes[0] ? ' ' + affixDef(item.suffixes[0].affixId).label : '';
    return `${pre}${base.name}${suf}`;
  }
  return base.name;
}

/** Replace all mods on an item for its current rarity. */
export function rerollMods(item: Item, rng: Rng): void {
  item.prefixes = [];
  item.suffixes = [];
  if (item.rarity === 'magic') {
    addRandomMod(item, rng);
    if (rng.next() < 0.5) addRandomMod(item, rng);
  } else if (item.rarity === 'rare') {
    const n = rareModCount(rng);
    for (let i = 0; i < n; i++) addRandomMod(item, rng);
    item.name = rareName(item, rng);
  }
}

export function createItem(s: GameState, baseId: string, ilvl: number, rarity: Rarity, rng: Rng): Item {
  // random uniques are created via createUnique; a bare 'unique' request rolls a rare instead
  const r: Rarity = rarity === 'unique' ? 'rare' : rarity;
  const item: Item = { uid: newUid(s), baseId, ilvl, rarity: r, name: null, prefixes: [], suffixes: [] };
  rerollMods(item, rng);
  return item;
}

export function createUnique(s: GameState, uniqueId: string, ilvl: number): Item {
  const u = uniqueDef(uniqueId);
  return {
    uid: newUid(s),
    baseId: u.baseId,
    ilvl,
    rarity: 'unique',
    name: u.name,
    uniqueId,
    prefixes: u.mods.filter((m) => affixDef(m.affixId).kind === 'prefix').map((m) => ({ affixId: m.affixId, tier: -1, values: [...m.values] })),
    suffixes: u.mods.filter((m) => affixDef(m.affixId).kind === 'suffix').map((m) => ({ affixId: m.affixId, tier: -1, values: [...m.values] })),
  };
}

export function describeMod(mod: RolledMod): string {
  const a = affixDef(mod.affixId);
  return a.text.replace(/\{(\d)\}/g, (_, i) => String(mod.values[Number(i)]));
}

/** Modifier text with its tier's value ranges, e.g. "+(11–20) to maximum Life". */
export function affixRangeText(affixId: string, tier: number): string {
  const a = affixDef(affixId);
  const ranges = a.tiers[tier].ranges;
  return a.text.replace(/\{(\d)\}/g, (_, i) => {
    const [lo, hi] = ranges[Number(i)];
    return lo === hi ? `${lo}` : `(${lo}–${hi})`;
  });
}

/** PoE-style tier label: T1 is the best tier. */
export function tierLabel(mod: RolledMod): string {
  if (mod.tier < 0) return '';
  const a = affixDef(mod.affixId);
  return `T${a.tiers.length - mod.tier}`;
}

export function tierRangeText(mod: RolledMod): string {
  if (mod.tier < 0) return '';
  const a = affixDef(mod.affixId);
  return a.tiers[mod.tier].ranges.map(([lo, hi]) => `${lo}–${hi}`).join(' / ');
}

/** Bases that can drop at a given item level. */
export function droppableBases(ilvl: number): BaseDef[] {
  return BASES.filter((b) => b.reqLevel <= ilvl);
}

export function allMods(item: Item): RolledMod[] {
  return [...item.prefixes, ...item.suffixes];
}

export function salvageValue(item: Item): number {
  const r = { normal: 1, magic: 3, rare: 7, unique: 15 }[item.rarity];
  return r + Math.floor(item.ilvl / 10);
}

export function sellValue(item: Item): number {
  const r = { normal: 2, magic: 6, rare: 16, unique: 60 }[item.rarity];
  return Math.round(r * (1 + item.ilvl / 8));
}
