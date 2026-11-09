import { AFFIXES, affixDef } from '../data/affixes';
import { baseDef, type WeaponFamily } from '../data/bases';
import { characterLevel } from './character';
import { allMods, itemMatchesClass, salvageValue } from './items';
import type { GameState, Item, ItemSlotType, Rarity } from './types';

export type ArmourDefenceType = 'str' | 'dex' | 'int' | 'str_dex' | 'str_int' | 'dex_int';
export type LootStrictness = 'off' | 'soft' | 'strict' | 'very_strict' | 'uber';
export type LootOverrideId = 'life_rings' | 'normal_gear' | 'top_tier_mods';
export type LootOverride = 'preset' | 'show' | 'hide' | 'highlight';
export type LootRuleAction = 'show' | 'hide' | 'highlight' | 'sound' | 'auto_salvage';

/** An ordered rule. Every populated condition must match; the first matching rule wins. */
export interface LootFilterRule {
  id: string;
  name: string;
  enabled: boolean;
  slots?: ItemSlotType[];
  rarities?: Rarity[];
  minIlvl?: number;
  maxIlvl?: number;
  /** Match an item carrying any of these modifier ids. */
  modIds?: string[];
  /** Display tier: 1 is the strongest tier. Matches when any modifier is this tier or better. */
  maxModTier?: number;
  /** Path of Idle gear has one rune socket; these count filled rune sockets. */
  minSockets?: number;
  maxSockets?: number;
  /** Arcane Dust salvage value. */
  minValue?: number;
  maxValue?: number;
  /** Legacy-profile conditions kept so old saves retain exactly the same matches. */
  minItemTier?: 1 | 2 | 3 | 4 | 5;
  weaponFamilies?: WeaponFamily[];
  armourDefences?: ArmourDefenceType[];
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

export function ruleMatchesItem(rule: LootFilterRule, item: Item, classId?: string): boolean {
  if (!rule.enabled) return false;
  const base = baseDef(item.baseId);
  const mods = allMods(item);
  if (rule.slots?.length && !rule.slots.includes(base.slot)) return false;
  if (rule.rarities?.length && !rule.rarities.includes(item.rarity)) return false;
  if (rule.minIlvl != null && item.ilvl < rule.minIlvl) return false;
  if (rule.maxIlvl != null && item.ilvl > rule.maxIlvl) return false;
  if (rule.modIds?.length && !mods.some((m) => rule.modIds!.includes(m.affixId))) return false;
  if (rule.maxModTier != null && !mods.some((m) => displayModTier(m.affixId, m.tier) <= rule.maxModTier!)) return false;
  const sockets = item.rune ? 1 : 0;
  if (rule.minSockets != null && sockets < rule.minSockets) return false;
  if (rule.maxSockets != null && sockets > rule.maxSockets) return false;
  const value = salvageValue(item);
  if (rule.minValue != null && value < rule.minValue) return false;
  if (rule.maxValue != null && value > rule.maxValue) return false;
  if (rule.minItemTier != null && (item.itemTier ?? 1) < rule.minItemTier) return false;
  if (base.slot === 'weapon' && rule.weaponFamilies?.length && (!base.family || !rule.weaponFamilies.includes(base.family))) return false;
  if (rule.armourDefences?.length) {
    const defence = getArmourDefenceType(base.tags);
    if (defence && !rule.armourDefences.includes(defence)) return false;
  }
  if (rule.matchClass && classId && !itemMatchesClass(classId, item)) return false;
  return true;
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
  s.settings.lootFilter.rules = Array.isArray(s.settings.lootFilter.rules) ? s.settings.lootFilter.rules.slice(0, 100) : [];
}

const SHARE_PREFIX = 'POI-LF1:';
const ACTIONS = new Set<LootRuleAction>(['show', 'hide', 'highlight', 'sound', 'auto_salvage']);
const RARITIES = new Set<Rarity>(['normal', 'magic', 'rare', 'unique']);
const SLOTS = new Set(ALL_ITEM_SLOTS);
const MODS = new Set(AFFIXES.map((a) => a.id));
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

export function exportLootFilterCode(filter: LayeredLootFilter): string {
  return SHARE_PREFIX + encodeBase64(JSON.stringify({ v: 1, rules: filter.rules }));
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
  const color = r.highlightColor === undefined ? undefined : cleanString(r.highlightColor, `Rule ${index + 1} highlight colour`, 16);
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error(`Rule ${index + 1} has an invalid highlight colour.`);
  return {
    id: cleanString(r.id, `Rule ${index + 1} id`, 64), name: cleanString(r.name, `Rule ${index + 1} name`), enabled: r.enabled === undefined ? true : r.enabled === true,
    slots: list(r.slots, SLOTS, 'slots', ALL_ITEM_SLOTS.length), rarities: list(r.rarities, RARITIES, 'rarities', 4), modIds: list(r.modIds, MODS, 'modifiers', 20),
    minIlvl: numberField('minIlvl', 1, 100), maxIlvl: numberField('maxIlvl', 1, 100), maxModTier: numberField('maxModTier', 1, 9),
    minSockets: numberField('minSockets', 0, 1), maxSockets: numberField('maxSockets', 0, 1), minValue: numberField('minValue', 0, 999), maxValue: numberField('maxValue', 0, 999),
    action, highlightColor: action === 'highlight' ? color ?? LOOT_HIGHLIGHT_COLORS[0] : undefined,
  };
}

export function importLootFilterCode(code: string): { ok: true; rules: LootFilterRule[] } | { ok: false; error: string } {
  try {
    const text = code.trim();
    if (!text.startsWith(SHARE_PREFIX)) throw new Error('This is not a Path of Idle loot-filter code.');
    if (text.length > 50_000) throw new Error('This loot-filter code is too large.');
    const decoded = decodeBase64(text.slice(SHARE_PREFIX.length));
    if (decoded.length > 25_000) throw new Error('This loot-filter code expands past the safe size limit.');
    const parsed = JSON.parse(decoded) as { v?: unknown; rules?: unknown };
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.rules)) throw new Error('This loot-filter code has an unsupported format.');
    if (parsed.rules.length > 100) throw new Error('A shared filter can contain at most 100 rules.');
    const rules = parsed.rules.map(cleanRule);
    if (new Set(rules.map((rule) => rule.id)).size !== rules.length) throw new Error('Every shared rule must have a unique id.');
    for (const [index, rule] of rules.entries()) {
      if (rule.minIlvl != null && rule.maxIlvl != null && rule.minIlvl > rule.maxIlvl) throw new Error(`Rule ${index + 1} has an item-level minimum above its maximum.`);
      if (rule.minValue != null && rule.maxValue != null && rule.minValue > rule.maxValue) throw new Error(`Rule ${index + 1} has a value minimum above its maximum.`);
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
