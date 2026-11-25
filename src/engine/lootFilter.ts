import { AFFIXES, affixDef } from '../data/affixes';
import { BASES, baseDef, type WeaponFamily } from '../data/bases';
import { characterLevel } from './character';
import { allMods, itemMatchesClass, salvageValue } from './items';
import type { GameState, Item, ItemSlotType, Rarity } from './types';

export type ArmourDefenceType = 'str' | 'dex' | 'int' | 'str_dex' | 'str_int' | 'dex_int';
export type LootStrictness = 'off' | 'soft' | 'strict' | 'very_strict' | 'uber';
export type LootOverrideId = 'life_rings' | 'normal_gear' | 'top_tier_mods';
export type LootOverride = 'preset' | 'show' | 'hide' | 'highlight';
export type LootRuleAction = 'show' | 'hide' | 'highlight' | 'sound' | 'auto_salvage' | 'send_to_stash';
export type ModMatchMode = 'any' | 'all' | 'count';
/** Special item states a rule can require (true) or forbid (false). */
export type LootItemFlag = 'fractured' | 'crafted' | 'elevated' | 'doomImplicit' | 'voidSlot';

/** "Must have these mods": the item carries any / all / at least `count` of `ids`, each at `tier` or better when set. */
export interface LootModGroup {
  ids: string[];
  mode: ModMatchMode;
  /** For mode 'count': how many of `ids` must be present. */
  count?: number;
  /** Display tier, 1 strongest: a listed mod only counts when it is this tier or better. */
  tier?: number;
}

/** An ordered rule. Every populated condition must match; the first matching rule wins. */
export interface LootFilterRule {
  id: string;
  name: string;
  enabled: boolean;
  slots?: ItemSlotType[];
  /** Specific base types (e.g. Iron Ring). */
  baseIds?: string[];
  rarities?: Rarity[];
  minIlvl?: number;
  maxIlvl?: number;
  /** The base's level requirement to equip. */
  minReqLevel?: number;
  maxReqLevel?: number;
  /** Old single "any of these modifiers" condition. Moved into `modGroups` on load and import; still honoured if present. */
  modIds?: string[];
  /** Every group must match. */
  modGroups?: LootModGroup[];
  /** Display tier: 1 is the strongest tier. Matches when any modifier is this tier or better. */
  maxModTier?: number;
  minPrefixes?: number;
  maxPrefixes?: number;
  minSuffixes?: number;
  maxSuffixes?: number;
  /** Prefixes plus suffixes. */
  minMods?: number;
  maxMods?: number;
  flags?: Partial<Record<LootItemFlag, boolean>>;
  /** Path of Idle gear has one rune socket; these count filled rune sockets. */
  minSockets?: number;
  maxSockets?: number;
  /** Arcane Dust salvage value. */
  minValue?: number;
  maxValue?: number;
  /** Loot tier (1–5) the item rolled at. */
  minItemTier?: 1 | 2 | 3 | 4 | 5;
  maxItemTier?: 1 | 2 | 3 | 4 | 5;
  weaponFamilies?: WeaponFamily[];
  armourDefences?: ArmourDefenceType[];
  /** Gear your current class can use well. */
  matchClass?: boolean;
  action: LootRuleAction;
  highlightColor?: string;
  /** Internal migration flag: old profile filters auto-salvaged before station unlocks existed. */
  legacyAutoSalvage?: boolean;
}

export interface LayeredLootFilter {
  preset: LootStrictness;
  overrides: Record<LootOverrideId, LootOverride>;
  rules: LootFilterRule[];
}

export interface LootFilterResult {
  visible: boolean;
  autoSalvage: boolean;
  highlightColor?: string;
  sound?: boolean;
  salvageWithoutUnlock?: boolean;
  /** A "Send to stash" rule matched. Run filter moves matching items from the inventory. */
  sendToStash?: boolean;
  source: 'preset' | 'override' | 'rule';
}

/** Old profile format, retained only so version-41 saves can be carried forward. */
export interface LegacyLootFilterRule {
  id: string;
  name?: string;
  slots?: ItemSlotType[];
  rarities?: Rarity[];
  minTier?: 1 | 2 | 3 | 4 | 5;
  minIlvl?: number;
  weaponFamilies?: WeaponFamily[];
  armourDefences?: ArmourDefenceType[];
  matchClass?: boolean;
}

export interface CustomLootFilter {
  id: string;
  name: string;
  mode: 'keep' | 'salvage';
  rules: LegacyLootFilterRule[];
}

export const ARMOUR_DEFENCE_LABELS: Record<ArmourDefenceType, string> = {
  str: 'Armour (STR)', dex: 'Evasion (DEX)', int: 'Energy Shield (INT)',
  str_dex: 'Armour / Evasion', str_int: 'Armour / ES', dex_int: 'Evasion / ES',
};

export const ALL_ITEM_SLOTS: ItemSlotType[] = ['weapon', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring'];
export const ALL_WEAPON_FAMILIES: WeaponFamily[] = ['sword', 'axe', 'mace', 'dagger', 'bow', 'sceptre', 'wand', 'staff'];
export const ALL_ARMOUR_DEFENCES: ArmourDefenceType[] = ['str', 'dex', 'int', 'str_dex', 'str_int', 'dex_int'];
export const LOOT_HIGHLIGHT_COLORS = ['#f2c94c', '#56ccf2', '#bb6bd9', '#6fcf97', '#eb5757'] as const;

export function defaultLayeredLootFilter(): LayeredLootFilter {
  return { preset: 'off', overrides: { life_rings: 'preset', normal_gear: 'preset', top_tier_mods: 'preset' }, rules: [] };
}

export function getArmourDefenceType(tags: string[]): ArmourDefenceType | null {
  const set = new Set(tags);
  if (set.has('str_dex_armour')) return 'str_dex';
  if (set.has('str_int_armour')) return 'str_int';
  if (set.has('dex_int_armour')) return 'dex_int';
  if (set.has('str_armour') || set.has('str_shield')) return 'str';
  if (set.has('dex_armour') || set.has('dex_shield')) return 'dex';
  if (set.has('int_armour') || set.has('int_shield')) return 'int';
  return null;
}

/** Convert the stored zero-based, low-to-high tier to the familiar T1, T2… display order. */
export function displayModTier(affixId: string, storedTier: number): number {
  const def = affixDef(affixId);
  if (storedTier < 0 || !def.tiers.length) return 99;
  return Math.max(1, def.tiers.length - storedTier);
}

export function hasTopTierMod(item: Item): boolean {
  return allMods(item).some((m) => displayModTier(m.affixId, m.tier) === 1);
}

function hasLifeMod(item: Item): boolean {
  return allMods(item).some((m) => affixDef(m.affixId).stats.some((stat) => stat === 'life' || stat === 'lifePct'));
}

const outside = (value: number, min?: number, max?: number) => (min != null && value < min) || (max != null && value > max);

export function itemHasFlag(item: Item, flag: LootItemFlag): boolean {
  const mods = allMods(item);
  switch (flag) {
    case 'fractured': return !!item.fractured || mods.some((m) => m.fractured);
    case 'crafted': return mods.some((m) => m.crafted);
    case 'elevated': return !!item.elevated || mods.some((m) => m.elevated);
    case 'doomImplicit': return !!item.doomImplicit;
    case 'voidSlot': return !!item.voidSlot;
  }
}

export function modGroupMatches(group: LootModGroup, item: Item): boolean {
  if (!group.ids.length) return true;
  const mods = allMods(item);
  const hits = group.ids.filter((id) => mods.some((m) => m.affixId === id && (group.tier == null || displayModTier(m.affixId, m.tier) <= group.tier))).length;
  if (group.mode === 'all') return hits === group.ids.length;
  if (group.mode === 'count') return hits >= Math.min(group.ids.length, Math.max(1, group.count ?? 1));
  return hits > 0;
}

export function ruleMatchesItem(rule: LootFilterRule, item: Item, classId?: string): boolean {
  if (!rule.enabled) return false;
  const base = baseDef(item.baseId);
  const mods = allMods(item);
  if (rule.slots?.length && !rule.slots.includes(base.slot)) return false;
  if (rule.baseIds?.length && !rule.baseIds.includes(item.baseId)) return false;
  if (rule.rarities?.length && !rule.rarities.includes(item.rarity)) return false;
  if (outside(item.ilvl, rule.minIlvl, rule.maxIlvl)) return false;
  if (outside(base.reqLevel, rule.minReqLevel, rule.maxReqLevel)) return false;
  if (rule.modIds?.length && !mods.some((m) => rule.modIds!.includes(m.affixId))) return false;
  if (rule.modGroups?.some((group) => !modGroupMatches(group, item))) return false;
  if (rule.maxModTier != null && !mods.some((m) => displayModTier(m.affixId, m.tier) <= rule.maxModTier!)) return false;
  if (outside(item.prefixes.length, rule.minPrefixes, rule.maxPrefixes)) return false;
  if (outside(item.suffixes.length, rule.minSuffixes, rule.maxSuffixes)) return false;
  if (outside(mods.length, rule.minMods, rule.maxMods)) return false;
  for (const [flag, want] of Object.entries(rule.flags ?? {}) as [LootItemFlag, boolean | undefined][]) {
    if (want != null && itemHasFlag(item, flag) !== want) return false;
  }
  if (outside(item.rune ? 1 : 0, rule.minSockets, rule.maxSockets)) return false;
  if (outside(salvageValue(item), rule.minValue, rule.maxValue)) return false;
  if (outside(item.itemTier ?? 1, rule.minItemTier, rule.maxItemTier)) return false;
  if (base.slot === 'weapon' && rule.weaponFamilies?.length && (!base.family || !rule.weaponFamilies.includes(base.family))) return false;
  if (rule.armourDefences?.length) {
    const defence = getArmourDefenceType(base.tags);
    if (defence && !rule.armourDefences.includes(defence)) return false;
  }
  if (rule.matchClass && classId && !itemMatchesClass(classId, item)) return false;
  return true;
}

/** A modifier as players read it: "+# to maximum Life". */
export function modDisplayName(affixId: string): string {
  const def = AFFIXES.find((a) => a.id === affixId);
  return def ? def.text.replace(/\{\d\}/g, '#') : affixId;
}

/** A compact modifier name for rule summaries: "maximum Life", "Fire Resistance", "#% increased Armour". */
export function modShortName(affixId: string): string {
  return modDisplayName(affixId).replace(/^\+#%? to /, '');
}

export const LOOT_FLAG_LABELS: Record<LootItemFlag, string> = {
  fractured: 'Fractured', crafted: 'Bench-crafted mod', elevated: 'Doom-tier mod', doomImplicit: 'Doom implicit', voidSlot: 'Void slot',
};
export const LOOT_ACTION_LABELS: Record<LootRuleAction, string> = {
  show: 'Show', hide: 'Hide', highlight: 'Highlight', sound: 'Show + sound', auto_salvage: 'Auto-salvage', send_to_stash: 'Send to stash',
};
export const slotLabel = (slot: ItemSlotType) => slot === 'body' ? 'body armour' : slot === 'offhand' ? 'offhand' : slot;
const cap = (text: string) => text[0].toUpperCase() + text.slice(1);
const orList = (items: string[], max = 3) => items.length > max ? `${items.slice(0, max).join('/')} +${items.length - max}` : items.join('/');

function rangeText(label: string, min?: number, max?: number, suffix = ''): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? `${label} ${min}${suffix}` : `${label} ${min}–${max}${suffix}`;
  return min != null ? `${label} ${min}+${suffix}` : `${label} ≤${max}${suffix}`;
}

function countText(noun: string, min?: number, max?: number): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? `exactly ${min} ${noun}` : `${min}–${max} ${noun}`;
  return min != null ? `${min}+ ${noun}` : `at most ${max} ${noun}`;
}

export function describeModGroup(group: LootModGroup): string {
  const names = group.ids.map(modShortName);
  const tier = group.tier ? ` (T${group.tier}+)` : '';
  if (names.length === 1) return `${names[0]}${tier}`;
  if (group.mode === 'all') return `${names.join(' AND ')}${tier}`;
  const n = group.mode === 'count' ? Math.min(names.length, Math.max(1, group.count ?? 1)) : 1;
  return `${n === 1 ? 'any' : n} of ${orList(names, 4)}${tier}`;
}

/** "Rare body armour, ilvl 75+, has maximum Life AND 2 of Fire/Cold/Lightning Resistance → Highlight". */
export function describeRule(rule: LootFilterRule): string {
  const r = upgradeRule(rule);
  const rarity = r.rarities?.length ? orList(r.rarities.map(cap)) : '';
  let what = 'items';
  if (r.baseIds?.length) what = orList(r.baseIds.map((id) => baseDef(id).name), 2);
  else if (r.weaponFamilies?.length && (!r.slots?.length || r.slots.every((sl) => sl === 'weapon'))) what = orList(r.weaponFamilies.map((f) => `${f}s`));
  else if (r.slots?.length) what = orList(r.slots.map(slotLabel));
  const head = `${rarity} ${what}`.trim();
  const parts = [cap(head)];
  const push = (text: string | null | false | 0 | undefined) => text && parts.push(text);
  if (r.baseIds?.length && r.slots?.length) push(orList(r.slots.map(slotLabel)));
  push(rangeText('ilvl', r.minIlvl, r.maxIlvl));
  push(rangeText('req. level', r.minReqLevel, r.maxReqLevel));
  push(rangeText('item tier', r.minItemTier, r.maxItemTier));
  push(r.armourDefences?.length && orList(r.armourDefences.map((d) => ARMOUR_DEFENCE_LABELS[d])));
  push(r.weaponFamilies?.length && what !== orList(r.weaponFamilies.map((f) => `${f}s`)) && `${orList(r.weaponFamilies)} weapons`);
  push(r.matchClass && 'fits your class');
  const groups = r.modGroups?.filter((g) => g.ids.length) ?? [];
  if (groups.length) parts.push(`has ${groups.map(describeModGroup).join(' AND ')}`);
  push(r.maxModTier != null && `any T${r.maxModTier}+ mod`);
  push(countText('prefixes', r.minPrefixes, r.maxPrefixes));
  push(countText('suffixes', r.minSuffixes, r.maxSuffixes));
  push(countText('mods', r.minMods, r.maxMods));
  for (const [flag, want] of Object.entries(r.flags ?? {}) as [LootItemFlag, boolean | undefined][]) {
    if (want != null) parts.push(`${want ? '' : 'not '}${LOOT_FLAG_LABELS[flag].toLowerCase()}`);
  }
  if (r.minSockets != null || r.maxSockets != null) push(r.minSockets === 1 ? 'rune socketed' : r.maxSockets === 0 ? 'no rune' : null);
  push(rangeText('dust value', r.minValue, r.maxValue));
  return `${parts.join(', ')} → ${LOOT_ACTION_LABELS[r.action]}`;
}

function presetResult(preset: LootStrictness, item: Item, level: number): LootFilterResult {
  const tier = item.itemTier ?? 1;
  const top = hasTopTierMod(item);
  let visible = true;
  let highlightColor: string | undefined;
  if (preset === 'soft' && level >= 12) {
    visible = !(item.rarity === 'normal' && item.ilvl < level - 5);
    if (item.rarity === 'rare') highlightColor = '#56ccf2';
  } else if (preset === 'strict' && level >= 8) {
    visible = item.rarity !== 'normal' && !(item.rarity === 'magic' && item.ilvl < level - 8);
    if (item.rarity === 'rare' && (tier >= 2 || top)) highlightColor = '#f2c94c';
  } else if (preset === 'very_strict') {
    visible = item.rarity === 'unique' || (item.rarity === 'rare' && (item.ilvl >= level - 10 || tier >= 2));
    if (visible && (tier >= 3 || top)) highlightColor = '#bb6bd9';
  } else if (preset === 'uber') {
    visible = item.rarity === 'unique' || (item.rarity === 'rare' && (tier >= 3 || top || item.ilvl >= level + 5));
    if (visible) highlightColor = item.rarity === 'unique' ? '#f2c94c' : '#eb5757';
  }
  return { visible, autoSalvage: false, highlightColor, source: 'preset' };
}

function resultForAction(rule: LootFilterRule): LootFilterResult {
  switch (rule.action) {
    case 'hide': return { visible: false, autoSalvage: false, source: 'rule' };
    case 'auto_salvage': return { visible: false, autoSalvage: true, salvageWithoutUnlock: rule.legacyAutoSalvage, source: 'rule' };
    case 'send_to_stash': return { visible: true, autoSalvage: false, sendToStash: true, source: 'rule' };
    case 'highlight': return { visible: true, autoSalvage: false, highlightColor: rule.highlightColor ?? LOOT_HIGHLIGHT_COLORS[0], source: 'rule' };
    case 'sound': return { visible: true, autoSalvage: false, sound: true, source: 'rule' };
    default: return { visible: true, autoSalvage: false, source: 'rule' };
  }
}

export function evaluateLootFilter(s: GameState, item: Item): LootFilterResult {
  const filter = s.settings.lootFilter ?? defaultLayeredLootFilter();
  let result = presetResult(filter.preset, item, characterLevel(s));
  const base = baseDef(item.baseId);
  if (filter.overrides.life_rings === 'show' && base.slot === 'ring' && hasLifeMod(item)) result = { visible: true, autoSalvage: false, source: 'override' };
  if (filter.overrides.normal_gear === 'hide' && item.rarity === 'normal') result = { visible: false, autoSalvage: false, source: 'override' };
  if (filter.overrides.top_tier_mods === 'highlight' && hasTopTierMod(item)) result = { visible: true, autoSalvage: false, highlightColor: '#f2c94c', source: 'override' };
  const rule = filter.rules.find((candidate) => ruleMatchesItem(candidate, item, s.character.classId));
  if (rule) result = resultForAction(rule);
  // Existing filters never destroyed uniques. Preserve that promise even for imported rules.
  if (item.rarity === 'unique' && (!result.visible || result.autoSalvage)) result = { visible: true, autoSalvage: false, highlightColor: result.highlightColor ?? '#f2c94c', sound: result.sound, source: result.source };
  return result;
}

function legacyMatches(rule: LegacyLootFilterRule, item: Item, classId: string): boolean {
  const base = baseDef(item.baseId);
  if (rule.slots?.length && !rule.slots.includes(base.slot)) return false;
  if (rule.rarities?.length && !rule.rarities.includes(item.rarity)) return false;
  if (rule.minTier && (item.itemTier ?? 1) < rule.minTier) return false;
  if (rule.minIlvl && item.ilvl < rule.minIlvl) return false;
  if (base.slot === 'weapon' && rule.weaponFamilies?.length && (!base.family || !rule.weaponFamilies.includes(base.family))) return false;
  if (rule.armourDefences?.length) {
    const defence = getArmourDefenceType(base.tags);
    if (defence && !rule.armourDefences.includes(defence)) return false;
  }
  return !rule.matchClass || itemMatchesClass(classId, item);
}

export function migrateLegacyLootFilters(settings: GameState['settings']): LayeredLootFilter {
  const next = defaultLayeredLootFilter();
  const active = settings.customLootFilters?.find((f) => f.id === settings.activeLootFilterId);
  if (!active) return next;
  next.rules = active.rules.map((old, index) => ({
    id: `legacy-${index}-${old.id}`.slice(0, 64), name: old.name || `Carried-over rule ${index + 1}`, enabled: true,
    slots: old.slots, rarities: old.rarities, minIlvl: old.minIlvl, minItemTier: old.minTier,
    weaponFamilies: old.weaponFamilies, armourDefences: old.armourDefences, matchClass: old.matchClass,
    action: active.mode === 'salvage' ? 'auto_salvage' : 'show', legacyAutoSalvage: active.mode === 'salvage' || undefined,
  }));
  // A legacy keep profile salvaged everything which missed all keep rules.
  if (active.mode === 'keep') next.rules.push({ id: 'legacy-fallback', name: 'Legacy filter fallback', enabled: true, action: 'auto_salvage', legacyAutoSalvage: true });
  return next;
}

export function settleLootFilters(s: GameState): void {
  if (!s.settings.lootFilter) {
    s.settings.lootFilter = migrateLegacyLootFilters(s.settings);
    s.settings.activeLootFilterId = null;
  }
  s.settings.lootFilter.preset = isStrictness(s.settings.lootFilter.preset) ? s.settings.lootFilter.preset : 'off';
  s.settings.lootFilter.overrides = { ...defaultLayeredLootFilter().overrides, ...(s.settings.lootFilter.overrides ?? {}) };
  s.settings.lootFilter.rules = Array.isArray(s.settings.lootFilter.rules) ? s.settings.lootFilter.rules.slice(0, 100).map(upgradeRule) : [];
  settleLootFilterProfiles(s);
}

/** A named, saved loot filter. Players keep several and switch between them in Settings. */
export interface LootFilterProfile {
  id: string;
  name: string;
  filter: LayeredLootFilter;
}

export const MAX_LOOT_FILTER_PROFILES = 12;
const cloneFilter = (filter: LayeredLootFilter): LayeredLootFilter => JSON.parse(JSON.stringify(filter));

/** Ready-made filters every character starts with, alongside their own. */
export function starterLootFilterProfiles(): LootFilterProfile[] {
  const make = (id: string, name: string, preset: LootStrictness, overrides: Partial<LayeredLootFilter['overrides']>): LootFilterProfile => {
    const filter = defaultLayeredLootFilter();
    filter.preset = preset;
    filter.overrides = { ...filter.overrides, ...overrides };
    return { id, name, filter };
  };
  return [
    make('starter-levelling', 'Levelling', 'soft', { life_rings: 'show' }),
    make('starter-mapping', 'Mapping', 'strict', { life_rings: 'show', top_tier_mods: 'highlight' }),
    make('starter-endgame', 'Endgame', 'very_strict', { normal_gear: 'hide', top_tier_mods: 'highlight' }),
  ];
}

function settleLootFilterProfiles(s: GameState): void {
  const settings = s.settings;
  let profiles = Array.isArray(settings.lootFilterProfiles)
    ? settings.lootFilterProfiles.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && p.filter).slice(0, MAX_LOOT_FILTER_PROFILES)
    : [];
  if (!profiles.length) {
    // First load with saved filters: what the player already had becomes "My filter", with the ready-made ones beside it.
    profiles = [{ id: 'my-filter', name: 'My filter', filter: cloneFilter(settings.lootFilter!) }, ...starterLootFilterProfiles()];
    settings.activeLootFilterProfileId = 'my-filter';
  }
  for (const p of profiles) {
    p.filter.preset = isStrictness(p.filter.preset) ? p.filter.preset : 'off';
    p.filter.overrides = { ...defaultLayeredLootFilter().overrides, ...(p.filter.overrides ?? {}) };
    p.filter.rules = Array.isArray(p.filter.rules) ? p.filter.rules.slice(0, 100).map(upgradeRule) : [];
  }
  settings.lootFilterProfiles = profiles;
  if (!profiles.some((p) => p.id === settings.activeLootFilterProfileId)) settings.activeLootFilterProfileId = profiles[0].id;
  // The live filter is the truth for the one in use (older saves get default profiles merged in on load).
  storeActiveProfile(s);
}

/** Keep the active profile's saved copy in step with the live filter. */
function storeActiveProfile(s: GameState): void {
  const active = s.settings.lootFilterProfiles?.find((p) => p.id === s.settings.activeLootFilterProfileId);
  if (active && s.settings.lootFilter) active.filter = cloneFilter(s.settings.lootFilter);
}

export function switchLootFilterProfile(s: GameState, id: string): void {
  const target = s.settings.lootFilterProfiles?.find((p) => p.id === id);
  if (!target || id === s.settings.activeLootFilterProfileId) return;
  storeActiveProfile(s);
  s.settings.lootFilter = cloneFilter(target.filter);
  s.settings.activeLootFilterProfileId = id;
}

/** A new profile starts as a copy of the filter in use, and becomes the active one. */
export function addLootFilterProfile(s: GameState, name: string): string | null {
  const profiles = s.settings.lootFilterProfiles ?? [];
  if (profiles.length >= MAX_LOOT_FILTER_PROFILES || !s.settings.lootFilter) return null;
  storeActiveProfile(s);
  const id = `filter-${Date.now().toString(36)}`;
  profiles.push({ id, name: name.trim().slice(0, 30) || `Filter ${profiles.length + 1}`, filter: cloneFilter(s.settings.lootFilter) });
  s.settings.lootFilterProfiles = profiles;
  s.settings.activeLootFilterProfileId = id;
  return id;
}

export function renameLootFilterProfile(s: GameState, id: string, name: string): void {
  const profile = s.settings.lootFilterProfiles?.find((p) => p.id === id);
  if (profile && name.trim()) profile.name = name.trim().slice(0, 30);
}

/** The last profile can't be deleted. Deleting the active one switches to the first remaining. */
export function deleteLootFilterProfile(s: GameState, id: string): void {
  const profiles = s.settings.lootFilterProfiles ?? [];
  if (profiles.length <= 1) return;
  const rest = profiles.filter((p) => p.id !== id);
  if (rest.length === profiles.length) return;
  s.settings.lootFilterProfiles = rest;
  if (s.settings.activeLootFilterProfileId === id) {
    s.settings.activeLootFilterProfileId = rest[0].id;
    s.settings.lootFilter = cloneFilter(rest[0].filter);
  }
}

/** Old rules kept "any of these modifiers" in `modIds`; it is now the first "must have" group. Matches stay identical. */
export function upgradeRule(rule: LootFilterRule): LootFilterRule {
  if (!rule.modIds) return rule;
  const { modIds, ...rest } = rule;
  return modIds.length ? { ...rest, modGroups: [{ ids: modIds, mode: 'any' }, ...(rest.modGroups ?? [])] } : rest;
}

const SHARE_PREFIX = 'POI-LF1:';
const SHARE_VERSION = 2;
export const MAX_MOD_GROUPS = 4;
const ACTIONS = new Set<LootRuleAction>(['show', 'hide', 'highlight', 'sound', 'auto_salvage', 'send_to_stash']);
const RARITIES = new Set<Rarity>(['normal', 'magic', 'rare', 'unique']);
const SLOTS = new Set(ALL_ITEM_SLOTS);
const MODS = new Set(AFFIXES.map((a) => a.id));
const BASE_IDS = new Set(BASES.map((b) => b.id));
const FAMILIES = new Set(ALL_WEAPON_FAMILIES);
const DEFENCES = new Set(ALL_ARMOUR_DEFENCES);
const MOD_MODES = new Set<ModMatchMode>(['any', 'all', 'count']);
const FLAGS = new Set<LootItemFlag>(['fractured', 'crafted', 'elevated', 'doomImplicit', 'voidSlot']);
const isStrictness = (value: unknown): value is LootStrictness => ['off', 'soft', 'strict', 'very_strict', 'uber'].includes(String(value));
const safeInt = (value: unknown, min: number, max: number): number | undefined => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : undefined;

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function decodeBase64(text: string): string {
  const binary = atob(text);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

/** Version 2 added base types, required level, modifier groups and counts, item flags, item tier, weapon family, defence and class.
 * Older game builds reject a v2 code instead of silently dropping conditions they can't read. */
export function exportLootFilterCode(filter: LayeredLootFilter): string {
  const rules = filter.rules.map((rule) => {
    const { legacyAutoSalvage: _internal, ...shared } = upgradeRule(rule);
    return shared;
  });
  return SHARE_PREFIX + encodeBase64(JSON.stringify({ v: SHARE_VERSION, rules }));
}

function cleanString(value: unknown, label: string, max = 80): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label} must be 1–${max} characters.`);
  return value.trim();
}

function cleanRule(value: unknown, index: number): LootFilterRule {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Rule ${index + 1} is not an object.`);
  const r = value as Record<string, unknown>;
  if (!ACTIONS.has(r.action as LootRuleAction)) throw new Error(`Rule ${index + 1} has an unknown action.`);
  const list = <T extends string>(raw: unknown, allowed: Set<T>, label: string, max: number): T[] | undefined => {
    if (raw === undefined) return undefined;
    if (!Array.isArray(raw) || raw.length > max || raw.some((x) => typeof x !== 'string' || !allowed.has(x as T))) throw new Error(`Rule ${index + 1} has invalid ${label}.`);
    return [...new Set(raw as T[])];
  };
  const numberField = (key: string, min: number, max: number) => {
    if (r[key] === undefined) return undefined;
    const n = safeInt(r[key], min, max);
    if (n === undefined) throw new Error(`Rule ${index + 1} has an invalid ${key}.`);
    return n;
  };
  const action = r.action as LootRuleAction;
  if (r.enabled !== undefined && typeof r.enabled !== 'boolean') throw new Error(`Rule ${index + 1} has an invalid enabled flag.`);
  if (r.matchClass !== undefined && typeof r.matchClass !== 'boolean') throw new Error(`Rule ${index + 1} has an invalid class condition.`);
  const color = r.highlightColor === undefined ? undefined : cleanString(r.highlightColor, `Rule ${index + 1} highlight colour`, 16);
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error(`Rule ${index + 1} has an invalid highlight colour.`);
  let modGroups: LootModGroup[] | undefined;
  if (r.modGroups !== undefined) {
    if (!Array.isArray(r.modGroups) || r.modGroups.length > MAX_MOD_GROUPS) throw new Error(`Rule ${index + 1} has invalid modifier groups.`);
    modGroups = r.modGroups.map((raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Rule ${index + 1} has an invalid modifier group.`);
      const g = raw as Record<string, unknown>;
      const ids = list(g.ids, MODS, 'modifiers', 30);
      if (!ids?.length || !MOD_MODES.has(g.mode as ModMatchMode)) throw new Error(`Rule ${index + 1} has an invalid modifier group.`);
      const count = g.count === undefined ? undefined : safeInt(g.count, 1, 30);
      const tier = g.tier === undefined ? undefined : safeInt(g.tier, 1, 9);
      if ((g.count !== undefined && count === undefined) || (g.tier !== undefined && tier === undefined)) throw new Error(`Rule ${index + 1} has an invalid modifier group.`);
      return { ids, mode: g.mode as ModMatchMode, ...(g.mode === 'count' ? { count: count ?? 1 } : {}), ...(tier !== undefined ? { tier } : {}) };
    });
  }
  let flags: LootFilterRule['flags'];
  if (r.flags !== undefined) {
    if (!r.flags || typeof r.flags !== 'object' || Array.isArray(r.flags)) throw new Error(`Rule ${index + 1} has invalid item flags.`);
    const entries = Object.entries(r.flags as Record<string, unknown>);
    if (entries.some(([key, v]) => !FLAGS.has(key as LootItemFlag) || typeof v !== 'boolean')) throw new Error(`Rule ${index + 1} has invalid item flags.`);
    flags = entries.length ? Object.fromEntries(entries) as LootFilterRule['flags'] : undefined;
  }
  return upgradeRule(stripUndefined({
    id: cleanString(r.id, `Rule ${index + 1} id`, 64), name: cleanString(r.name, `Rule ${index + 1} name`), enabled: r.enabled === undefined ? true : r.enabled === true,
    slots: list(r.slots, SLOTS, 'slots', ALL_ITEM_SLOTS.length), baseIds: list(r.baseIds, BASE_IDS, 'base types', 100), rarities: list(r.rarities, RARITIES, 'rarities', 4),
    modIds: list(r.modIds, MODS, 'modifiers', 30), modGroups,
    minIlvl: numberField('minIlvl', 1, 100), maxIlvl: numberField('maxIlvl', 1, 100), minReqLevel: numberField('minReqLevel', 1, 100), maxReqLevel: numberField('maxReqLevel', 1, 100),
    maxModTier: numberField('maxModTier', 1, 9),
    minPrefixes: numberField('minPrefixes', 0, 7), maxPrefixes: numberField('maxPrefixes', 0, 7), minSuffixes: numberField('minSuffixes', 0, 7), maxSuffixes: numberField('maxSuffixes', 0, 7),
    minMods: numberField('minMods', 0, 7), maxMods: numberField('maxMods', 0, 7), flags,
    minSockets: numberField('minSockets', 0, 1), maxSockets: numberField('maxSockets', 0, 1), minValue: numberField('minValue', 0, 999), maxValue: numberField('maxValue', 0, 999),
    minItemTier: numberField('minItemTier', 1, 5) as LootFilterRule['minItemTier'], maxItemTier: numberField('maxItemTier', 1, 5) as LootFilterRule['maxItemTier'],
    weaponFamilies: list(r.weaponFamilies, FAMILIES, 'weapon families', ALL_WEAPON_FAMILIES.length), armourDefences: list(r.armourDefences, DEFENCES, 'defence types', ALL_ARMOUR_DEFENCES.length),
    matchClass: r.matchClass === true ? true : undefined,
    action, highlightColor: action === 'highlight' ? color ?? LOOT_HIGHLIGHT_COLORS[0] : undefined,
  }));
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

const RANGES: [keyof LootFilterRule, keyof LootFilterRule, string][] = [
  ['minIlvl', 'maxIlvl', 'item-level'], ['minReqLevel', 'maxReqLevel', 'required-level'], ['minValue', 'maxValue', 'value'],
  ['minPrefixes', 'maxPrefixes', 'prefix'], ['minSuffixes', 'maxSuffixes', 'suffix'], ['minMods', 'maxMods', 'modifier-count'],
  ['minItemTier', 'maxItemTier', 'item-tier'], ['minSockets', 'maxSockets', 'socket'],
];

export function importLootFilterCode(code: string): { ok: true; rules: LootFilterRule[] } | { ok: false; error: string } {
  try {
    const text = code.trim();
    if (!text.startsWith(SHARE_PREFIX)) throw new Error('This is not a Path of Idle loot-filter code.');
    if (text.length > 50_000) throw new Error('This loot-filter code is too large.');
    const decoded = decodeBase64(text.slice(SHARE_PREFIX.length));
    if (decoded.length > 25_000) throw new Error('This loot-filter code expands past the safe size limit.');
    const parsed = JSON.parse(decoded) as { v?: unknown; rules?: unknown };
    if (!parsed || (parsed.v !== 1 && parsed.v !== SHARE_VERSION) || !Array.isArray(parsed.rules)) throw new Error('This loot-filter code has an unsupported format.');
    if (parsed.rules.length > 100) throw new Error('A shared filter can contain at most 100 rules.');
    const rules = parsed.rules.map(cleanRule);
    if (new Set(rules.map((rule) => rule.id)).size !== rules.length) throw new Error('Every shared rule must have a unique id.');
    for (const [index, rule] of rules.entries()) {
      for (const [min, max, label] of RANGES) {
        const lo = rule[min] as number | undefined;
        const hi = rule[max] as number | undefined;
        if (lo != null && hi != null && lo > hi) throw new Error(`Rule ${index + 1} has a ${label} minimum above its maximum.`);
      }
    }
    return { ok: true, rules };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return { ok: false, error: message && !/Invalid character|base64/i.test(message) ? message : 'This loot-filter code is damaged or could not be read.' };
  }
}

/** Kept for old saves and callers; profiles are migrated to the layered format on load. */
export function defaultLootFilters(): CustomLootFilter[] {
  return [
    { id: 'class_gear_only', name: 'Class Gear Only', mode: 'keep', rules: [
      { id: 'r1', name: 'Class Weapons & Defences', matchClass: true },
      { id: 'r2', name: 'Jewellery (All Classes)', slots: ['amulet', 'ring', 'belt'] },
    ] },
    { id: 'endgame_rares', name: 'Endgame Rares (T3+)', mode: 'keep', rules: [
      { id: 'r1', name: 'High Tier Rares', rarities: ['rare'], minTier: 3 },
      { id: 'r2', name: 'High Item Level Bases (75+)', minIlvl: 75 },
      { id: 'r3', name: 'Jewellery', slots: ['amulet', 'ring', 'belt'], rarities: ['rare'] },
    ] },
    { id: 'salvage_junk', name: 'Salvage Normal & Magic Weapons', mode: 'salvage', rules: [
      { id: 'r1', name: 'Normal & Magic Weapons', slots: ['weapon'], rarities: ['normal', 'magic'] },
    ] },
  ];
}
export function shouldSalvageByFilter(filter: CustomLootFilter, item: Item, classId: string): boolean {
  if (item.rarity === 'unique') return false;
  const matches = filter.rules.some((rule) => legacyMatches(rule, item, classId));
  return filter.mode === 'keep' ? !matches : matches;
}

export function saveLootFilter(s: GameState, filter: CustomLootFilter): void {
  s.settings.customLootFilters ??= defaultLootFilters();
  const index = s.settings.customLootFilters.findIndex((candidate) => candidate.id === filter.id);
  if (index >= 0) s.settings.customLootFilters[index] = filter;
  else s.settings.customLootFilters.push(filter);
}

export function deleteLootFilter(s: GameState, filterId: string): void {
  s.settings.customLootFilters = (s.settings.customLootFilters ?? []).filter((filter) => filter.id !== filterId);
  if (s.settings.activeLootFilterId === filterId) s.settings.activeLootFilterId = null;
}

export function setActiveLootFilter(s: GameState, filterId: string | null): void {
  s.settings.activeLootFilterId = filterId;
}
