import { AFFIXES, affixDef, type AffixDef } from '../data/affixes';
import { UNWRITTEN_NOTABLES, unwrittenNotableByIndex } from '../data/ascendancies';
import { BASES, baseDef, obtainable, uniqueDef, type BaseDef, type UniqueModDef } from '../data/bases';
import { mathRng, pick, pickWeighted, rInt, type Rng } from './rng';
import type { GameState, Item, Rarity, RolledMod } from './types';

export function newUid(s: GameState): number {
  return s.nextUid++;
}

/** For what can sit in the shared Stash tabs (gems, flasks), where characters' own uids would overlap. */
export function accountUid(s: GameState): number {
  return s.account.nextUid++;
}

export function maxAffixes(rarity: Rarity): number {
  return rarity === 'magic' ? 1 : rarity === 'rare' ? 3 : 0;
}

export function modCount(item: Item): number {
  return item.prefixes.length + item.suffixes.length;
}

/** Spawn-weight multipliers by affix group, e.g. from a Fossil (0 blocks a group). */
export type ModBias = Record<string, number>;

export function spawnWeight(affix: AffixDef, base: BaseDef, bias?: ModBias): number {
  if (affix.uniqueOnly) return 0;
  let w = 0;
  for (const t of base.tags) w = Math.max(w, affix.weights[t] ?? 0);
  return w * (bias?.[affix.group] ?? 1);
}

function rollValues(affix: AffixDef, tier: number, rng: Rng, itemTier?: number): number[] {
  const minPercent = itemTier && itemTier > 1 ? [0, 0, 0.35, 0.55, 0.75, 0.9][itemTier] ?? 0 : 0;
  return affix.tiers[tier].ranges.map(([lo, hi]) => {
    if (hi > lo && minPercent > 0) {
      const effLo = Math.round(lo + (hi - lo) * minPercent);
      return rInt(rng, Math.min(effLo, hi), hi);
    }
    return rInt(rng, lo, hi);
  });
}

export function isAttackAffix(a: AffixDef): boolean {
  if (a.weights.attack_weapon !== undefined && a.weights.attack_weapon > 0 && (!a.weights.caster_weapon || a.weights.caster_weapon === 0)) return true;
  const attackGroups = new Set(['added_phys', 'inc_phys', 'inc_phys_global', 'added_fire', 'added_cold', 'added_light', 'attack_speed', 'accuracy', 'life_leech', 'bleed_chance']);
  return attackGroups.has(a.group) || a.stats.some((s) => s.includes('phys') || s.includes('attack') || s === 'accuracy');
}

export function isCasterAffix(a: AffixDef): boolean {
  if (a.weights.caster_weapon !== undefined && a.weights.caster_weapon > 0 && (!a.weights.attack_weapon || a.weights.attack_weapon === 0)) return true;
  const casterGroups = new Set(['inc_spell', 'inc_fire_spell', 'inc_cold_spell', 'inc_light_spell', 'added_spell_phys', 'added_spell_fire', 'added_spell_cold', 'added_spell_light', 'cast_speed', 'spell_crit', 'spell_crit_multi', 'mana_regen']);
  return casterGroups.has(a.group) || a.stats.some((s) => s.includes('spell') || s.includes('cast'));
}

/** Affixes that could still roll on this item for the given kind. */
export function eligibleAffixes(item: Item, kind: 'prefix' | 'suffix', bias?: ModBias): AffixDef[] {
  const base = baseDef(item.baseId);
  const used = new Set([...item.prefixes, ...item.suffixes].map((m) => affixDef(m.affixId).group));
  const cannotRollAttack = allMods(item).some((m) => m.affixId === 'meta_cannot_roll_attack');
  const cannotRollCaster = allMods(item).some((m) => m.affixId === 'meta_cannot_roll_caster');
  return AFFIXES.filter(
    (a) =>
      !a.benchOnly &&
      a.kind === kind &&
      !used.has(a.group) &&
      (!cannotRollAttack || !isAttackAffix(a)) &&
      (!cannotRollCaster || !isCasterAffix(a)) &&
      spawnWeight(a, base, bias) > 0 &&
      a.tiers.length > 0 &&
      a.tiers[0].ilvl <= item.ilvl,
  );
}

export function openKinds(item: Item, bias?: ModBias): ('prefix' | 'suffix')[] {
  const max = maxAffixes(item.rarity);
  const maxP = item.voidSlot ? 4 : max;
  const maxS = item.voidSlot ? 4 : max;
  const maxTotal = item.voidSlot ? 7 : max * 2;
  if (modCount(item) >= maxTotal) return [];
  const kinds: ('prefix' | 'suffix')[] = [];
  if (item.prefixes.length < maxP && eligibleAffixes(item, 'prefix', bias).length) kinds.push('prefix');
  if (item.suffixes.length < maxS && eligibleAffixes(item, 'suffix', bias).length) kinds.push('suffix');
  return kinds;
}

/** How many of an affix's highest unlocked tiers can roll. */
const TIER_WINDOW = 5;

/** Adds one random modifier. Returns false if there's no room. */
export function addRandomMod(item: Item, rng: Rng, bias?: ModBias): boolean {
  const kinds = openKinds(item, bias);
  if (!kinds.length) return false;
  const kind = pick(rng, kinds);
  const base = baseDef(item.baseId);
  const affix = pickWeighted(rng, eligibleAffixes(item, kind, bias), (a) => spawnWeight(a, base, bias));
  if (!affix) return false;
  // only the top TIER_WINDOW tiers the item level allows can roll, so high-level items stop rolling starter tiers
  const tiers = affix.tiers.map((t, i) => ({ t, i })).filter((x) => x.t.ilvl <= item.ilvl).slice(-TIER_WINDOW);
  // higher tiers are rarer: each step up is ~70% as likely as the one below; higher itemTier biases toward top tiers
  const expMult = item.itemTier && item.itemTier > 1 ? 0.7 + 0.06 * (item.itemTier - 1) : 0.7;
  const chosen = pickWeighted(rng, tiers, (x) => Math.pow(expMult, x.i))!;
  const mod: RolledMod = { affixId: affix.id, tier: chosen.i, values: rollValues(affix, chosen.i, rng, item.itemTier) };
  (kind === 'prefix' ? item.prefixes : item.suffixes).push(mod);
  return true;
}

/** Adds a specific modifier at a fixed tier (Essences). */
export function addFixedMod(item: Item, affixId: string, tier: number, rng: Rng): void {
  const affix = affixDef(affixId);
  (affix.kind === 'prefix' ? item.prefixes : item.suffixes).push({ affixId, tier, values: rollValues(affix, tier, rng) });
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

/** Replace all mods on an item for its current rarity. `keep` stays and counts as one of the new rolls (a Forger's Seal). Fractured mods and meta-locks always stay. */
export function rerollMods(item: Item, rng: Rng, bias?: ModBias, keep?: RolledMod): void {
  const prefixLock = item.suffixes.some((m) => m.affixId === 'meta_prefixes_cannot_be_changed');
  const suffixLock = item.prefixes.some((m) => m.affixId === 'meta_suffixes_cannot_be_changed');
  const frac = allMods(item).find((m) => m.fractured);

  const prevPrefixes = item.prefixes;
  const prevSuffixes = item.suffixes;

  item.prefixes = [];
  item.suffixes = [];

  if (prefixLock) {
    item.prefixes = [...prevPrefixes];
  } else if (frac && affixDef(frac.affixId).kind === 'prefix') {
    item.prefixes.push(frac);
  }

  if (suffixLock) {
    item.suffixes = [...prevSuffixes];
  } else if (frac && affixDef(frac.affixId).kind === 'suffix') {
    item.suffixes.push(frac);
  }

  if (keep && !allMods(item).includes(keep)) {
    (affixDef(keep.affixId).kind === 'prefix' ? item.prefixes : item.suffixes).push(keep);
  }

  const keptCount = item.prefixes.length + item.suffixes.length;

  if (item.rarity === 'magic') {
    if (!prefixLock && item.prefixes.length === 0 && openKinds(item, bias).includes('prefix')) {
      addRandomMod(item, rng, bias);
    }
    if (!suffixLock && item.suffixes.length === 0 && openKinds(item, bias).includes('suffix') && (keptCount === 0 || rng.next() < 0.5)) {
      addRandomMod(item, rng, bias);
    }
  } else if (item.rarity === 'rare') {
    const targetTotal = Math.max(keptCount, rareModCount(rng));
    let attempts = 0;
    while (modCount(item) < targetTotal && attempts < 20) {
      attempts++;
      const kinds = openKinds(item, bias).filter((k) => (k === 'prefix' ? !prefixLock : !suffixLock));
      if (!kinds.length) break;
      const kind = pick(rng, kinds);
      const base = baseDef(item.baseId);
      const affix = pickWeighted(rng, eligibleAffixes(item, kind, bias), (a) => spawnWeight(a, base, bias));
      if (!affix) break;
      const tiers = affix.tiers.map((t, i) => ({ t, i })).filter((x) => x.t.ilvl <= item.ilvl).slice(-TIER_WINDOW);
      const expMult = item.itemTier && item.itemTier > 1 ? 0.7 + 0.06 * (item.itemTier - 1) : 0.7;
      const chosen = pickWeighted(rng, tiers, (x) => Math.pow(expMult, x.i))!;
      const mod: RolledMod = { affixId: affix.id, tier: chosen.i, values: rollValues(affix, chosen.i, rng, item.itemTier) };
      (kind === 'prefix' ? item.prefixes : item.suffixes).push(mod);
    }
    if (item.itemTier === 5 && item.rarity === 'rare' && rng.next() < 0.35) {
      const all = [...item.prefixes, ...item.suffixes];
      if (all.length > 0 && !item.fractured) {
        const picked = pick(rng, all);
        item.fractured = picked.affixId;
      }
    }
    item.name = rareName(item, rng);
  }
}

export function createItem(s: GameState, baseId: string, ilvl: number, rarity: Rarity, rng: Rng, bias?: ModBias, itemTier?: 1 | 2 | 3 | 4 | 5): Item {
  // random uniques are created via createUnique; a bare 'unique' request rolls a rare instead
  const r: Rarity = rarity === 'unique' ? 'rare' : rarity;
  const item: Item = { uid: newUid(s), baseId, ilvl, rarity: r, name: null, prefixes: [], suffixes: [], itemTier: itemTier ?? 1 };
  rerollMods(item, rng, bias);
  return item;
}

export function rollUnwrittenNotableIndex(classId: string | undefined, rng: Rng): number {
  const pool = UNWRITTEN_NOTABLES.filter((e) => e.classId !== classId);
  const chosen = pick(rng, pool.length ? pool : UNWRITTEN_NOTABLES);
  return chosen.index;
}

export function createUnique(s: GameState, uniqueId: string, ilvl: number, rng: Rng = mathRng): Item {
  const u = uniqueDef(uniqueId);
  const rollMod = (m: UniqueModDef): RolledMod => {
    let values: number[];
    if (m.affixId === 'u_unwritten_notable') {
      values = [rollUnwrittenNotableIndex(s.character?.classId, rng)];
    } else if (m.ranges && m.ranges.length) {
      values = m.ranges.map(([lo, hi]) => rInt(rng, lo, hi));
    } else {
      values = m.values ? [...m.values] : [];
    }
    return { affixId: m.affixId, tier: -1, values };
  };
  return {
    uid: newUid(s),
    baseId: u.baseId,
    ilvl,
    rarity: 'unique',
    name: u.name,
    uniqueId,
    prefixes: u.mods.filter((m) => affixDef(m.affixId).kind === 'prefix').map(rollMod),
    suffixes: u.mods.filter((m) => affixDef(m.affixId).kind === 'suffix').map(rollMod),
  };
}

export function describeMod(mod: RolledMod): string {
  if (mod.affixId === 'u_unwritten_notable') {
    const entry = unwrittenNotableByIndex(mod.values[0] ?? 1);
    return `The Unwritten Path: Allocates ${entry.node.name} (${entry.ascendancyName}) — ${entry.node.desc ?? ''}`.trim();
  }
  const a = affixDef(mod.affixId);
  // uniques can carry negative values: "+-3 to X" → "-3 to X", "-50% increased" → "50% reduced"
  return a.text
    .replace(/\{(\d)\}/g, (_, i) => String(mod.values[Number(i)]))
    .replace(/\+-/g, '-')
    .replace(/-(\d+)% increased/g, '$1% reduced')
    .replace(/-(\d+)% more/g, '$1% less');
}

export function describeUniqueModDef(m: UniqueModDef): string {
  if (m.affixId === 'u_unwritten_notable') {
    return 'The Unwritten Path: Allocates 1 random Ascendancy Notable from outside your class';
  }
  const a = affixDef(m.affixId);
  if (m.ranges && m.ranges.length) {
    let t = a.text;
    const firstRange = m.ranges[0];
    if (firstRange && firstRange[0] < 0 && firstRange[1] < 0) {
      const minM = Math.min(Math.abs(firstRange[0]), Math.abs(firstRange[1]));
      const maxM = Math.max(Math.abs(firstRange[0]), Math.abs(firstRange[1]));
      const span = minM === maxM ? `${minM}` : `(${minM}–${maxM})`;
      if (t.includes('% increased')) return t.replace('% increased', '% reduced').replace(/\{0\}/g, span);
      if (t.includes('% more')) return t.replace('% more', '% less').replace(/\{0\}/g, span);
      if (t.includes('+{0}')) return t.replace('+{0}', `-${span}`);
      return t.replace(/\{0\}/g, `-${span}`);
    }
    return t.replace(/\{(\d)\}/g, (_, i) => {
      const r = m.ranges![Number(i)];
      if (!r) return '#';
      const [lo, hi] = r;
      return lo === hi ? `${lo}` : `(${lo}–${hi})`;
    });
  }
  return describeMod({ affixId: m.affixId, tier: -1, values: m.values ?? [] });
}

/** Modifier text with its tier's value ranges, e.g. "+(11–20) to maximum Life". */
export function affixRangeText(affixId: string, tier: number): string {
  const a = affixDef(affixId);
  const ranges = a.tiers[tier]?.ranges;
  if (!ranges || !ranges.length) return a.text;
  return a.text.replace(/\{(\d)\}/g, (_, i) => {
    const r = ranges[Number(i)];
    if (!r) return '#';
    const [lo, hi] = r;
    return lo === hi ? `${lo}` : `(${lo}–${hi})`;
  });
}

/** PoE-style tier label: T1 is the best tier, T0 is Doom Tier (elevated). */
export function tierLabel(mod: RolledMod): string {
  if (mod.elevated) return 'T0';
  if (mod.tier < 0) return '';
  const a = affixDef(mod.affixId);
  if (a.benchOnly) return '';
  return `T${a.tiers.length - mod.tier}`;
}

export function tierRangeText(mod: RolledMod): string {
  if (mod.elevated) return 'Doom Tier (T0)';
  if (mod.tier < 0) return '';
  const a = affixDef(mod.affixId);
  const ranges = a.tiers[mod.tier]?.ranges;
  if (!ranges || !ranges.length) return '';
  return ranges.map(([lo, hi]) => `${lo}–${hi}`).join(' / ');
}

/** Bases that can drop at a given item level. */
export function droppableBases(ilvl: number): BaseDef[] {
  return BASES.filter((b) => b.reqLevel <= ilvl && obtainable(b));
}

export function allMods(item: Item): RolledMod[] {
  return [...item.prefixes, ...item.suffixes];
}

export function salvageValue(item: Item): number {
  const r = { normal: 1, magic: 3, rare: 7, unique: 15 }[item.rarity];
  return r + Math.floor(item.ilvl / 10);
}

export function sellValue(item: Item): number {
  const r = { normal: 3, magic: 9, rare: 24, unique: 90 }[item.rarity];
  return Math.round(r * (1 + item.ilvl / 8));
}

/** Check if an item matches a class's weapons, attributes, or defence types. */
export function itemMatchesClass(classId: string, item: Item): boolean {
  if (classId === 'exile') return true;
  const base = baseDef(item.baseId);
  if (base.slot === 'ring' || base.slot === 'amulet' || base.slot === 'belt') return true;

  const tags = new Set(base.tags);
  const fam = base.family;

  switch (classId) {
    case 'warrior':
      if (fam && !['sword', 'axe', 'mace'].includes(fam)) return false;
      if (tags.has('dex_armour') || tags.has('int_armour') || tags.has('dex_int_armour')) return false;
      return true;
    case 'ranger':
      if (fam && !['bow', 'sword', 'dagger'].includes(fam)) return false;
      if (tags.has('str_armour') || tags.has('int_armour') || tags.has('str_int_armour')) return false;
      return true;
    case 'mage':
      if (fam && !['wand', 'sceptre', 'staff'].includes(fam)) return false;
      if (tags.has('str_armour') || tags.has('dex_armour') || tags.has('str_dex_armour')) return false;
      return true;
    case 'duelist':
      if (fam && !['sword', 'axe', 'mace', 'bow'].includes(fam)) return false;
      if (tags.has('int_armour')) return false;
      return true;
    case 'templar':
      if (fam && !['mace', 'sceptre', 'staff', 'sword'].includes(fam)) return false;
      if (tags.has('dex_armour')) return false;
      return true;
    case 'shadow':
      if (fam && !['dagger', 'sword', 'bow', 'wand'].includes(fam)) return false;
      if (tags.has('str_armour')) return false;
      return true;
    default:
      return true;
  }
}
