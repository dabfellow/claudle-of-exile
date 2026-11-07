import { BASES, obtainable, type BaseDef } from '../data/bases';
import { classDef } from '../data/classes';
import { FOSSILS } from '../data/craftMats';
import { activeGemDef } from '../data/gems';
import {
  ATLAS_NODES,
  ATLAS_DOOMED_CLEAR_POINTS,
  ATLAS_HARD_BOSS_CLEAR_POINTS,
  ATLAS_POINT_CAP,
  ATLAS_UBER_BOSS_CLEAR_POINTS,
  atlasNode,
  DOOMED_MODS,
  DOOMED_TIERS,
  doomedId,
  doomedTier,
  doomedZoneId,
  HARD_BOSSES,
  HARD_BOSS_KEYS,
  hasMap,
  MAP_DEVICE_SEXTANT_SLOTS,
  MAP_DROPS,
  MAP_TIERS,
  mapId,
  mapTier,
  mapTierUniques,
  mapZoneId,
  NORMAL_MAP_MODS,
  normalMapModDef,
  parseDoomedTier,
  parseMapTier,
  SEXTANT_BASE_CHARGES,
  SEXTANT_MODS,
  SEXTANTS,
  sextantMod,
  TIER_MOD_RULES,
  UBER_BOSSES,
  UBER_KEYS,
  UNIQUE_MAPS,
  uniqueMapDef,
  type AtlasNode,
  type DoomedModId,
  type HardBossDef,
  type HardBossId,
  type MapTierMod,
  type NormalMapModDef,
  type SextantMod,
  type SextantTier,
  type UberBossDef,
} from '../data/maps';
import { actOpen, EXTRA_ZONES, ZONES, zoneDef, type BossMechanic, type ZoneDef } from '../data/zones';
import { freshAtlas } from './account';
import { bossLeftToRules, suggestedRule } from './automation';
import { addBank } from './bank';
import { enterZone } from './combat';
import type { Ctx } from './context';
import { FINAL_ACT, campaignComplete, stationLevel } from './hideout';
import { flaskDef } from '../data/flasks';
import { newFlask } from './flasks';
import { createItem, createUnique } from './items';
import { placeItem } from './loot';
import { flaskCapacity } from './mechanics';
import { chance, pick, pickWeighted, rInt } from './rng';
import { skillTreeStats } from './skillTree';
import { deriveStats } from './stats';
import type { AtlasState, EquipSlot, GameState, GroundKind, MapSettings, MapState, MonsterInstance, SextantSlot } from './types';
import { charXpForLevel } from './xp';

/**
 * The Maps preview: the Map Device page and map drops only appear with this on. Dev builds, tests and the sim have it;
 * in production game.ts turns it on for accounts in the `admins` table. A run already under way never checks it.
 */
export const MAPS_PREVIEW = { enabled: !!import.meta.env?.DEV };

/** Maps are open once the campaign is beaten, and to the preview before that. */
export function mapsOpen(s: GameState): boolean {
  return MAPS_PREVIEW.enabled || campaignComplete(s);
}

export function newMapState(stock: Record<string, number> = {}): MapState {
  return { stock, run: null, auto: null, tally: { runs: 0, clearMs: 0, mapsFound: 0, favoured: 0 } };
}

/**
 * Keep `s.maps.stock` and `s.account.maps` pointing at the same normalized map supply, and migrate any legacy
 * themed map keys (`map_barrows_t1`) into plain tier keys (`map_t1`).
 */
export function syncMapStock(s: GameState): Record<string, number> {
  if (!s.account.maps) s.account.maps = {};
  if (s.maps.stock !== s.account.maps) {
    // If a test or caller replaced `s.maps.stock` directly, adopt that object as the shared map supply.
    s.account.maps = s.maps.stock;
  }
  const stock = s.account.maps;
  for (const key of Object.keys(stock)) {
    const n = stock[key];
    if (typeof n !== 'number' || n < 0) {
      delete stock[key];
      continue;
    }
    if ( UNIQUE_MAPS.some((u) => u.id === key) ) {
      continue;
    }
    const dTier = parseDoomedTier(key);
    if (dTier) {
      const id = doomedId(dTier);
      if (id !== key) {
        stock[id] = (stock[id] ?? 0) + n;
        delete stock[key];
      }
      continue;
    }
    const tier = parseMapTier(key);
    if (tier) {
      const id = mapId(tier);
      if (id !== key) {
        stock[id] = (stock[id] ?? 0) + n;
        delete stock[key];
      }
    } else {
      delete stock[key];
    }
  }
  return stock;
}

export function mapsHeld(s: GameState, tier: number, _themeId?: string): number {
  const stock = syncMapStock(s);
  return stock[mapId(tier)] ?? 0;
}

export function addMaps(s: GameState, tier: number, nOrTheme: number | string, maybeN?: number): string {
  const n = typeof nOrTheme === 'number' ? nOrTheme : (maybeN ?? 0);
  const stock = syncMapStock(s);
  const id = mapId(tier);
  stock[id] = Math.max(0, (stock[id] ?? 0) + n);
  return id;
}

export function doomedHeld(s: GameState, tier: number): number {
  const stock = syncMapStock(s);
  return stock[doomedId(tier)] ?? 0;
}

export function addDoomedMaps(s: GameState, tier: number, n: number): string {
  const stock = syncMapStock(s);
  const id = doomedId(tier);
  stock[id] = Math.max(0, (stock[id] ?? 0) + n);
  return id;
}

export function uniqueMapHeld(s: GameState, id: string): number {
  const stock = syncMapStock(s);
  return stock[id] ?? 0;
}
export const uniqueMapsHeld = uniqueMapHeld;

export function addUniqueMaps(s: GameState, id: string, n: number): string {
  const stock = syncMapStock(s);
  stock[id] = Math.max(0, (stock[id] ?? 0) + n);
  return id;
}
export const addUniqueMap = addUniqueMaps;

export function totalMapsHeld(s: GameState): number {
  const stock = syncMapStock(s);
  let sum = 0;
  for (const t of MAP_TIERS) sum += stock[mapId(t.tier)] ?? 0;
  return sum;
}

/** Beating the Last King tops up the realm's map supply to at least 5 maps if fewer are held. */
export function topUpKingMaps(s: GameState, ctx: Ctx): number {
  const held = totalMapsHeld(s);
  if (held >= MAP_DROPS.kingTopUp) return 0;
  const added = MAP_DROPS.kingTopUp - held;
  addMaps(s, 1, added);
  ctx.emit({ t: 'info', text: `The Last King's Map Case grants ${added} Tier 1 Map${added === 1 ? '' : 's'}`, tone: 'good' });
  return added;
}

// ---------- Atlas Tree ----------

export function ensureAtlas(s: GameState): AtlasState {
  if (!s.account.atlas) s.account.atlas = freshAtlas();
  const a = s.account.atlas;
  a.doomedCleared ??= [];
  a.hardBossesCleared ??= [];
  a.uberBossesCleared ??= [];
  // Saves made before these realm records existed still receive credit for keyed bosses this character defeated.
  for (const boss of HARD_BOSSES) {
    if (s.bossesDefeated.includes(boss.zoneId) && !a.hardBossesCleared.includes(boss.id)) a.hardBossesCleared.push(boss.id);
  }
  for (const boss of UBER_BOSSES) {
    if (s.bossesDefeated.includes(boss.zoneId) && !a.uberBossesCleared.includes(boss.zoneId)) a.uberBossesCleared.push(boss.zoneId);
  }
  return a;
}

export function atlasPointsEarned(s: GameState): number {
  const a = ensureAtlas(s);
  const total = a.cleared.length
    + a.slotted.length
    + a.deathless.length
    + (a.doomedCleared?.length ?? 0) * ATLAS_DOOMED_CLEAR_POINTS
    + (a.hardBossesCleared?.length ?? 0) * ATLAS_HARD_BOSS_CLEAR_POINTS
    + (a.uberBossesCleared?.length ?? 0) * ATLAS_UBER_BOSS_CLEAR_POINTS;
  return Math.min(ATLAS_POINT_CAP, total);
}

/** Realm-first Hard and Uber Boss clears award the Atlas's post-map points. */
export function recordAtlasBossClear(s: GameState, ctx: Ctx, zoneId: string): number {
  const a = ensureAtlas(s);
  const hardBoss = HARD_BOSSES.find((boss) => boss.zoneId === zoneId);
  if (hardBoss && !a.hardBossesCleared!.includes(hardBoss.id)) {
    a.hardBossesCleared!.push(hardBoss.id);
    ctx.emit({ t: 'info', text: `Atlas: +${ATLAS_HARD_BOSS_CLEAR_POINTS} Atlas points earned (${hardBoss.name} first clear)`, tone: 'good' });
    return ATLAS_HARD_BOSS_CLEAR_POINTS;
  }
  const uberBoss = UBER_BOSSES.find((boss) => boss.zoneId === zoneId);
  if (uberBoss && !a.uberBossesCleared!.includes(uberBoss.zoneId)) {
    a.uberBossesCleared!.push(uberBoss.zoneId);
    ctx.emit({ t: 'info', text: `Atlas: +${ATLAS_UBER_BOSS_CLEAR_POINTS} Atlas points earned (${uberBoss.name} first clear)`, tone: 'good' });
    return ATLAS_UBER_BOSS_CLEAR_POINTS;
  }
  return 0;
}

/** Each Doomed tier grants two Atlas points on its first realm clear. */
function recordDoomedAtlasClear(s: GameState, ctx: Ctx, tier: number): number {
  const a = ensureAtlas(s);
  if (a.doomedCleared!.includes(tier)) return 0;
  a.doomedCleared!.push(tier);
  const name = doomedTier(tier).name;
  ctx.emit({ t: 'info', text: `Atlas: +${ATLAS_DOOMED_CLEAR_POINTS} Atlas points earned (${name} first clear)`, tone: 'good' });
  return ATLAS_DOOMED_CLEAR_POINTS;
}

export function atlasPointsLeft(s: GameState): number {
  const a = ensureAtlas(s);
  return Math.max(0, atlasPointsEarned(s) - a.nodes.length);
}

export function hasAtlasNode(s: GameState, id: string): boolean {
  return ensureAtlas(s).nodes.includes(id);
}

export function canAllocateAtlasNode(s: GameState, id: string): string | null {
  const a = ensureAtlas(s);
  if (a.nodes.includes(id)) return 'Already allocated';
  const node = ATLAS_NODES.find((n) => n.id === id);
  if (!node) return 'Unknown Atlas node';
  if (atlasPointsLeft(s) <= 0) return 'No Atlas points available';
  if (node.requires?.length && !node.requires.some((required) => a.nodes.includes(required))) {
    return `Requires ${node.requires.map((required) => atlasNode(required).name).join(' or ')}`;
  }
  if (node.minPoints && atlasPointsEarned(s) < node.minPoints) return `Requires ${node.minPoints} Atlas points earned`;
  return null;
}

export function allocateAtlasNode(s: GameState, id: string): string | null {
  const reason = canAllocateAtlasNode(s, id);
  if (reason) return reason;
  ensureAtlas(s).nodes.push(id);
  return null;
}

/** Free respec of the Atlas tree, or a single leaf node if one is passed. */
export function refundAtlas(s: GameState, id?: string): string | null {
  const a = ensureAtlas(s);
  if (!id) {
    a.nodes = [];
    return null;
  }
  if (!a.nodes.includes(id)) return 'Node is not allocated';
  const dependent = ATLAS_NODES.find((n) => {
    if (!a.nodes.includes(n.id) || !n.requires?.includes(id)) return false;
    return !n.requires.some((required) => required !== id && a.nodes.includes(required));
  });
  if (dependent) return `Required by ${dependent.name}`;
  a.nodes = a.nodes.filter((x) => x !== id);
  return null;
}

export interface AtlasBonuses {
  mapFindPct: number;
  tierUpBonus: number;
  bossExtraMapChance: number;
  currencyPct: number;
  rarityPct: number;
  bossExtraItems: number;
  bossCurrencyRolls: number;
  sextantCharges: number;
  sextantRewardEffectPct: number;
   extraPacks: number;
  monsterLifeMult: number;
  monsterDmgMult: number;
  monsterXpDropMult: number;
  unbrokenPath: boolean;
  doomedUnlocked: boolean;
}

export function atlasBonuses(s: GameState): AtlasBonuses {
  const has = (id: string) => hasAtlasNode(s, id);
  let mapFindPct = 0;
  let tierUpBonus = 0;
  let bossExtraMapChance = 0;
  let currencyPct = 0;
  let rarityPct = 0;
  let bossExtraItems = 0;
  let bossCurrencyRolls = 0;
  let sextantCharges = 0;
  let sextantRewardEffectPct = 0;
  let extraPacks = 0;
  let monsterLifeMult = 1;
  let monsterDmgMult = 1;
  let monsterXpDropMult = 1;

  for (const node of ATLAS_NODES) {
    if (!has(node.id) || !node.bonuses) continue;
    const b = node.bonuses;
    mapFindPct += b.mapFindPct ?? 0;
    tierUpBonus += b.tierUpBonus ?? 0;
    bossExtraMapChance += b.bossExtraMapChance ?? 0;
    currencyPct += b.currencyPct ?? 0;
    rarityPct += b.rarityPct ?? 0;
    bossExtraItems += b.bossExtraItems ?? 0;
    bossCurrencyRolls += b.bossCurrencyRolls ?? 0;
    sextantCharges += b.sextantCharges ?? 0;
    sextantRewardEffectPct += b.sextantRewardEffectPct ?? 0;
    extraPacks += b.extraPacks ?? 0;
    monsterLifeMult *= 1 + (b.monsterLifeMore ?? 0) / 100;
    monsterDmgMult *= 1 + (b.monsterDamageMore ?? 0) / 100;
    monsterXpDropMult *= 1 + (b.monsterXpDropMore ?? 0) / 100;
  }

  return {
    mapFindPct,
    tierUpBonus,
    bossExtraMapChance,
    currencyPct,
    rarityPct,
    bossExtraItems,
    bossCurrencyRolls,
    sextantCharges,
    sextantRewardEffectPct,
    extraPacks,
    monsterLifeMult,
    monsterDmgMult,
    monsterXpDropMult,
    unbrokenPath: has('peril_notable'),
    doomedUnlocked: has('atlas_doomed'),
  };
}

// ---------- Sextants ----------

export function ensureSextants(s: GameState): (SextantSlot | null)[] {
  if (!s.account.sextants) s.account.sextants = [null, null, null, null, null];
  while (s.account.sextants.length < 5) s.account.sextants.push(null);
  return s.account.sextants;
}

/** Number of unlocked Sextant slots on the Map Device (1–3 from Map Device upgrades, +1 from Atlas Surveying notable). */
export function sextantSlots(s: GameState): number {
  const lvl = stationLevel(s, 'map_device');
  const base = MAP_DEVICE_SEXTANT_SLOTS[Math.min(MAP_DEVICE_SEXTANT_SLOTS.length - 1, Math.max(0, lvl - 1))];
  return base + (hasAtlasNode(s, 'survey_notable') ? 1 : 0);
}

/** Apply a Sextant from the bank to a Map Device slot, rolling a modifier for 6+ map runs. */
export function applySextant(s: GameState, ctx: Ctx, slotIndex: number, sextantId: string): string | null {
  const slots = sextantSlots(s);
  if (slotIndex < 0 || slotIndex >= slots) return 'Sextant slot is locked';
  const def = SEXTANTS.find((x) => x.id === sextantId || x.tier === sextantId);
  if (!def) return 'Unknown Sextant';
  if ((s.account.bank[def.id] ?? 0) <= 0) return `No ${def.name} in stash`;
  const pool = SEXTANT_MODS.filter((m) => m.tier === def.tier);
  const mod = pick(ctx.rng, pool);
  const charges = SEXTANT_BASE_CHARGES + atlasBonuses(s).sextantCharges + (stationLevel(s, 'map_device') >= 6 ? 2 : 0);
  addBank(s, def.id, -1);
  const arr = ensureSextants(s);
  arr[slotIndex] = { modId: mod.id, tier: def.tier, charges };
  ctx.emit({ t: 'info', text: `${def.name}: rolled ${mod.name} (${charges} runs)`, tone: 'good' });
  return null;
}

/** Active Sextant modifiers for a given map tier from the currently loaded slots (without consuming charges). */
export function previewSextantMods(s: GameState, tier: number): SextantMod[] {
  const slots = sextantSlots(s);
  const arr = ensureSextants(s);
  const out: SextantMod[] = [];
  for (let i = 0; i < slots; i++) {
    const slot = arr[i];
    if (!slot || slot.charges <= 0) continue;
    const mod = SEXTANT_MODS.find((m) => m.id === slot.modId);
    if (mod && mod.minMapTier <= tier) out.push(mod);
  }
  return out;
}

/** Combined modifiers active on the current map run. */
export interface RunModifiers {
  tierMod: MapTierMod;
  doomedMods: Set<DoomedModId>;
  normalMods: NormalMapModDef[];
  sextantMods: SextantMod[];
  monsterLifeMult: number;
  monsterDmgMult: number;
  monsterXpDropMult: number;
  currencyPct: number;
  rarityPct: number;
  mapFindPct: number;
  bossExtraItems: number;
  bossCurrencyRolls: number;
  arenaGround?: GroundKind;
  bossEchoes?: [BossMechanic, BossMechanic];
  hunts: Set<'fossil' | 'unique' | 'key'>;
}

export function runModifiers(s: GameState): RunModifiers {
  const run = s.maps.run;
  const atlas = atlasBonuses(s);
  const tierMod: MapTierMod = run ? (run.doomedTier ? 'pinnacle' : mapTier(run.tier).mod) : 'none';
  const doomedMods = new Set<DoomedModId>(run?.doomedMods ?? []);
  const normalMods = (run?.normalMods ?? [])
    .map((id) => normalMapModDef(id))
    .filter((m): m is NormalMapModDef => !!m);
  const sextantMods = (run?.sextantMods ?? [])
    .map((id) => SEXTANT_MODS.find((m) => m.id === id))
    .filter((m): m is SextantMod => !!m);
  const rewardScale = 1 + atlas.sextantRewardEffectPct / 100;

  let monsterLifeMult = atlas.monsterLifeMult;
  let monsterDmgMult = atlas.monsterDmgMult;
  let monsterXpDropMult = atlas.monsterXpDropMult;
  if (run?.uniqueMapId === 'umap_cowards_trial') {
    monsterXpDropMult *= 2.5;
  }
  let currencyPct = atlas.currencyPct;
  let rarityPct = atlas.rarityPct;
  let mapFindPct = atlas.mapFindPct;
  let bossExtraItems = atlas.bossExtraItems;
  let bossCurrencyRolls = atlas.bossCurrencyRolls;
  let arenaGround: GroundKind | undefined;
  let bossEchoes: [BossMechanic, BossMechanic] | undefined;
  const hunts = new Set<'fossil' | 'unique' | 'key'>();

  for (const m of normalMods) {
    if (m.monsterLifeMult) monsterLifeMult *= m.monsterLifeMult;
    if (m.monsterDmgMult) monsterDmgMult *= m.monsterDmgMult;
    if (m.currencyPct) currencyPct += m.currencyPct;
    if (m.rarityPct) rarityPct += m.rarityPct;
    if (m.mapFindPct) mapFindPct += m.mapFindPct;
  }

  for (const m of sextantMods) {
    if (m.monsterLifeMult) monsterLifeMult *= m.monsterLifeMult;
    if (m.monsterDmgMult) monsterDmgMult *= m.monsterDmgMult;
    if (m.currencyPct) currencyPct += Math.round(m.currencyPct * rewardScale);
    if (m.rarityPct) rarityPct += Math.round(m.rarityPct * rewardScale);
    if (m.mapFindPct) mapFindPct += Math.round(m.mapFindPct * rewardScale);
    if (m.bossExtraItems) bossExtraItems += m.bossExtraItems;
    if (m.bossCurrencyRolls) bossCurrencyRolls += m.bossCurrencyRolls;
    if (m.arenaGround) arenaGround = m.arenaGround;
    if (m.bossEchoes) bossEchoes = m.bossEchoes;
    if (m.hunt) hunts.add(m.hunt);
  }

  return {
    tierMod,
    doomedMods,
    normalMods,
    sextantMods,
    monsterLifeMult,
    monsterDmgMult,
    monsterXpDropMult,
    currencyPct,
    rarityPct,
    mapFindPct,
    bossExtraItems,
    bossCurrencyRolls,
    arenaGround,
    bossEchoes,
    hunts,
  };
}

// ---------- Starting & stepping map runs ----------

function pickCampaignArea(s: GameState, ctx: Ctx, areaOrTheme?: string): ZoneDef {
  if (areaOrTheme && ZONES.some((z) => z.id === areaOrTheme)) return zoneDef(areaOrTheme);
  const hasGroundRule = s.account.automation.rules.includes('ground');
  // Prefer campaign areas whose boss mechanics the player's unlocked automation rules can answer.
  const compatible = ZONES.filter((z) => bossLeftToRules(s, z) && (hasGroundRule || !z.boss.mechanics?.includes('scorch')));
  return pick(ctx.rng, compatible.length ? compatible : ZONES);
}

function pickElitePacks(ctx: Ctx, totalPacks: number, count: number): number[] {
  const indices = Array.from({ length: totalPacks }, (_, i) => i + 1);
  const chosen: number[] = [];
  while (chosen.length < count && indices.length > 0) {
    const idx = rInt(ctx.rng, 0, indices.length - 1);
    chosen.push(indices.splice(idx, 1)[0]);
  }
  return chosen.sort((a, b) => a - b);
}

// ---------- Map Settings & Modifier Rolling ----------

export function ensureMapSettings(s: GameState): MapSettings {
  if (!s.account.mapSettings) {
    s.account.mapSettings = {
      blockedMods: [],
      autoRerollChaos: true,
      rollNormalMaps: false,
    };
  }
  return s.account.mapSettings;
}

export function toggleBlockedMod(s: GameState, modId: string): void {
  const cfg = ensureMapSettings(s);
  if (cfg.blockedMods.includes(modId)) {
    cfg.blockedMods = cfg.blockedMods.filter((id) => id !== modId);
  } else {
    cfg.blockedMods.push(modId);
  }
}

export function toggleAutoRerollChaos(s: GameState): void {
  const cfg = ensureMapSettings(s);
  cfg.autoRerollChaos = !cfg.autoRerollChaos;
}

export function toggleRollNormalMaps(s: GameState): void {
  const cfg = ensureMapSettings(s);
  cfg.rollNormalMaps = !cfg.rollNormalMaps;
}

export function rollDoomedModifiers(s: GameState, ctx: Ctx, dTierNum: number): { mods: DoomedModId[]; chaosSpent: number } {
  const dTier = doomedTier(dTierNum);
  const cfg = ensureMapSettings(s);
  const pool = [...DOOMED_MODS];
  const modCount = rInt(ctx.rng, dTier.modCount[0], dTier.modCount[1]);

  const rollOnce = (): DoomedModId[] => {
    const p = [...pool];
    const picked: DoomedModId[] = [];
    while (picked.length < modCount && p.length > 0) {
      const idx = rInt(ctx.rng, 0, p.length - 1);
      picked.push(p.splice(idx, 1)[0].id);
    }
    return picked;
  };

  let rolled = rollOnce();
  let chaosSpent = 0;

  if (cfg.autoRerollChaos && cfg.blockedMods.length > 0) {
    let attempts = 0;
    while (attempts < 5 && rolled.some((m) => cfg.blockedMods.includes(m))) {
      if ((s.account.bank.chaos ?? 0) <= 0) break;
      addBank(s, 'chaos', -1);
      chaosSpent += 1;
      attempts += 1;
      rolled = rollOnce();
    }
  }

  return { mods: rolled, chaosSpent };
}

export function rollNormalModifiers(s: GameState, ctx: Ctx): { mods: string[]; chaosSpent: number } {
  const cfg = ensureMapSettings(s);
  if (!cfg.rollNormalMaps) return { mods: [], chaosSpent: 0 };

  const pool = [...NORMAL_MAP_MODS];
  const modCount = rInt(ctx.rng, 2, 3);

  const rollOnce = (): string[] => {
    const p = [...pool];
    const picked: string[] = [];
    while (picked.length < modCount && p.length > 0) {
      const idx = rInt(ctx.rng, 0, p.length - 1);
      picked.push(p.splice(idx, 1)[0].id);
    }
    return picked;
  };

  let rolled = rollOnce();
  let chaosSpent = 0;

  if (cfg.autoRerollChaos && cfg.blockedMods.length > 0) {
    let attempts = 0;
    while (attempts < 5 && rolled.some((m) => cfg.blockedMods.includes(m))) {
      if ((s.account.bank.chaos ?? 0) <= 0) break;
      addBank(s, 'chaos', -1);
      chaosSpent += 1;
      attempts += 1;
      rolled = rollOnce();
    }
  }

  return { mods: rolled, chaosSpent };
}

/** Use up a map and step through. Each map starts you fresh: there's no town between auto-runs to recover in. */
function enterMap(s: GameState, ctx: Ctx, tier: number, areaOrTheme?: string): void {
  addMaps(s, tier, -1);
  const tDef = mapTier(tier);
  const area = pickCampaignArea(s, ctx, areaOrTheme);
  const atlas = atlasBonuses(s);

  // Consume 1 charge from each unlocked Sextant slot whose modifier applies to this tier.
  const slots = sextantSlots(s);
  const sextantArr = ensureSextants(s);
  const activeModIds: string[] = [];
  let filledSlots = 0;
  for (let i = 0; i < slots; i++) {
    const slot = sextantArr[i];
    if (!slot || slot.charges <= 0) continue;
    const mod = SEXTANT_MODS.find((m) => m.id === slot.modId);
    if (!mod || mod.minMapTier > tier) continue;
    filledSlots += 1;
    activeModIds.push(mod.id);
    slot.charges -= 1;
    if (slot.charges <= 0) sextantArr[i] = null;
  }
  const slottedFull = slots > 0 && filledSlots >= slots;

  const { mods: normalMods, chaosSpent } = rollNormalModifiers(s, ctx);
  if (chaosSpent > 0) {
    ctx.emit({ t: 'info', text: `Rerolled deadly map modifiers (spent ${chaosSpent} Chaos Orb${chaosSpent > 1 ? 's' : ''})`, tone: 'good' });
  }

  const extraPacksFromSextants = activeModIds.reduce((sum, id) => sum + (sextantMod(id).extraPacks ?? 0), 0);
  const extraPacksFromNormal = normalMods.reduce((sum, id) => sum + (normalMapModDef(id)?.extraPacks ?? 0), 0);
  const packs = tDef.packs + atlas.extraPacks + extraPacksFromSextants + extraPacksFromNormal;
  const hasElite = tDef.mod === 'elite' || tDef.mod === 'pinnacle';
  const elitePacks = hasElite ? pickElitePacks(ctx, packs, TIER_MOD_RULES.elitePacks) : undefined;
  const zoneId = mapZoneId(tier, area.id);

  s.maps.run = {
    zoneId,
    tier,
    areaId: area.id,
    theme: areaOrTheme && !ZONES.some((z) => z.id === areaOrTheme) ? areaOrTheme : area.id,
    normalMods,
    packsLeft: packs,
    packsTotal: packs,
    elitePacks,
    slottedFull,
    sextantMods: activeModIds,
    startedAt: s.clock,
    deaths: s.lifetime.deaths,
    bossDown: false,
  };
  enterZone(s, ctx, zoneId);
  const d = deriveStats(s);
  s.life = d.maxLife;
  s.mana = d.maxMana;
  s.es = d.maxEs;
  for (const f of s.flaskSlots) if (f) f.charges = flaskCapacity(s, f);
}

/** Run one map by hand. */
export function startMap(s: GameState, ctx: Ctx, tier: number, areaOrTheme?: string): string | null {
  if (s.maps.run) return 'Already in a map';
  if (mapsHeld(s, tier) <= 0) return 'No maps of that tier';
  enterMap(s, ctx, tier, areaOrTheme);
  return null;
}

/** Open a Doomed Map (I–V) with 2–4 rolled Doomed modifiers. */
export function startDoomedMap(s: GameState, ctx: Ctx, dTierNum: number): string | null {
  if (s.maps.run) return 'Already in a map';
  if (doomedHeld(s, dTierNum) <= 0) return 'No Doomed Maps of that tier';
  const dTier = doomedTier(dTierNum);
  addDoomedMaps(s, dTierNum, -1);

  const area = pickCampaignArea(s, ctx);
  const { mods: rolledMods, chaosSpent } = rollDoomedModifiers(s, ctx, dTierNum);
  if (chaosSpent > 0) {
    ctx.emit({ t: 'info', text: `Rerolled deadly Doomed modifiers (spent ${chaosSpent} Chaos Orb${chaosSpent > 1 ? 's' : ''})`, tone: 'good' });
  }

  const packs = dTier.packs;
  const elitePacks = pickElitePacks(ctx, packs, TIER_MOD_RULES.elitePacks);
  const zoneId = doomedZoneId(dTierNum, area.id);

  s.maps.run = {
    zoneId,
    tier: 10,
    areaId: area.id,
    theme: area.id,
    doomedTier: dTierNum,
    doomedMods: rolledMods,
    packsLeft: packs,
    packsTotal: packs,
    elitePacks,
    slottedFull: false,
    sextantMods: [],
    startedAt: s.clock,
    deaths: s.lifetime.deaths,
    bossDown: false,
  };
  enterZone(s, ctx, zoneId);
  const d = deriveStats(s);
  s.life = d.maxLife;
  s.mana = d.maxMana;
  s.es = d.maxEs;
  const drained = rolledMods.includes('drained_belts');
  for (const f of s.flaskSlots) {
    if (f) f.charges = drained ? 0 : flaskCapacity(s, f);
  }
  return null;
}

/** Open a Unique Map from the Map Case. */
export function startUniqueMap(s: GameState, ctx: Ctx, uniqueMapId: string): string | null {
  if (s.maps.run) return 'Already in a map';
  const uDef = uniqueMapDef(uniqueMapId);
  if (!uDef) return 'Unknown Unique Map';
  if (uniqueMapHeld(s, uniqueMapId) <= 0) return `No ${uDef.name} in Map Case`;
  addUniqueMaps(s, uniqueMapId, -1);

  const packs = uDef.packs;
  const elitePacks = pickElitePacks(ctx, packs, TIER_MOD_RULES.elitePacks);

  s.maps.run = {
    zoneId: uDef.id,
    tier: uDef.tier,
    areaId: uDef.id,
    theme: uDef.id,
    uniqueMapId: uDef.id,
    packsLeft: packs,
    packsTotal: packs,
    elitePacks,
    slottedFull: false,
    sextantMods: [],
    startedAt: s.clock,
    deaths: s.lifetime.deaths,
    bossDown: false,
  };
  enterZone(s, ctx, uDef.id);
  const d = deriveStats(s);
  s.life = d.maxLife;
  s.mana = d.maxMana;
  s.es = d.maxEs;
  for (const f of s.flaskSlots) {
    if (f) f.charges = flaskCapacity(s, f);
  }
  return null;
}

/** Keep using maps of this tier until they run out. Joins the run under way if there is one. */
export function startAutoRun(s: GameState, ctx: Ctx, tier: number, areaOrTheme?: string): string | null {
  const reason = s.maps.run ? null : startMap(s, ctx, tier, areaOrTheme);
  if (reason) return reason;
  s.maps.auto = { tier, ...(areaOrTheme && { theme: areaOrTheme }) };
  return null;
}

/** Keep running Doomed Maps of this tier until they run out. */
export function startDoomedAutoRun(s: GameState, ctx: Ctx, dTierNum: number): string | null {
  const reason = s.maps.run ? null : startDoomedMap(s, ctx, dTierNum);
  if (reason) return reason;
  s.maps.auto = { tier: dTierNum, doomed: true };
  return null;
}

/** Stop after the current run. */
export function stopAutoRun(s: GameState): void {
  s.maps.auto = null;
}

/** A pack walked in. False when the map has none left to send. */
export function mapPackLeft(s: GameState): boolean {
  return (s.maps.run?.packsLeft ?? 1) > 0;
}

/** Decrement packsLeft and return the 1-based pack number that just entered. */
export function onMapPack(s: GameState): number {
  const run = s.maps.run;
  if (!run) return 0;
  const packNum = run.packsTotal - run.packsLeft + 1;
  run.packsLeft -= 1;
  return packNum;
}

/** Running from a whole field isn't clearing it: losing the last monster sends a pack back. */
export function onMapFieldLost(s: GameState): void {
  const run = s.maps.run;
  if (run) run.packsLeft = Math.min(run.packsTotal, run.packsLeft + 1);
}

/** Record Atlas completion points for a finished map tier. */
function recordAtlasClear(s: GameState, ctx: Ctx, tier: number, slottedFull: boolean, deathless: boolean): void {
  const a = ensureAtlas(s);
  let gained = 0;
  if (!a.cleared.includes(tier)) {
    a.cleared.push(tier);
    gained += 1;
  }
  if (slottedFull && !a.slotted.includes(tier)) {
    a.slotted.push(tier);
    gained += 1;
  }
  if (deathless && !a.deathless.includes(tier)) {
    a.deathless.push(tier);
    gained += 1;
  }
  if (gained > 0) {
    ctx.emit({ t: 'info', text: `Atlas: +${gained} Atlas point${gained > 1 ? 's' : ''} earned (Tier ${tier})`, tone: 'good' });
  }
}

/** Runs once per game step: moves on from a finished run, or notices one that ended in a death or a retreat. */
export function mapStep(s: GameState, ctx: Ctx): void {
  const m = s.maps;
  const run = m.run;
  if (!run) return;
  if (s.combat?.zoneId !== run.zoneId) {
    const died = s.lifetime.deaths > run.deaths;
    const auto = !!m.auto;
    const refund = died && !run.doomedTier && atlasBonuses(s).unbrokenPath;
    if (refund) addMaps(s, run.tier, 1);
    m.run = null;
    m.auto = null;
    if (died || auto) {
      const lostText = refund ? 'Unbroken Path saved the map' : "it's used up";
      ctx.emit({ t: 'info', text: `${died ? 'You died in the map' : 'You left the map'}, and ${lostText}${auto ? '. Auto-run stopped' : ''}`, tone: 'warn' });
    }
    return;
  }
  if (!run.bossDown) return;
  m.tally.runs += 1;
  m.tally.clearMs += s.clock - run.startedAt;
  const label = run.uniqueMapId
    ? (uniqueMapDef(run.uniqueMapId)?.name ?? 'Unique Map')
    : run.doomedTier
      ? doomedTier(run.doomedTier).name
      : `Map Tier ${run.tier}`;
  const deathless = s.lifetime.deaths === run.deaths;
  if (!run.doomedTier) {
    recordAtlasClear(s, ctx, run.tier, !!run.slottedFull, deathless);
  } else {
    recordDoomedAtlasClear(s, ctx, run.doomedTier);
  }
  m.run = null;
  ctx.emit({ t: 'info', text: `${label} cleared`, tone: 'good' });
  if (!m.auto) {
    leaveMap(s);
  } else if (m.auto.doomed) {
    if (doomedHeld(s, m.auto.tier) > 0) {
      startDoomedMap(s, ctx, m.auto.tier);
    } else {
      m.auto = null;
      leaveMap(s);
      ctx.emit({ t: 'info', text: 'Auto-run finished: out of Doomed Maps', tone: 'warn' });
    }
  } else if (mapsHeld(s, m.auto.tier) > 0) {
    enterMap(s, ctx, m.auto.tier, m.auto.theme);
  } else {
    m.auto = null;
    leaveMap(s);
    ctx.emit({ t: 'info', text: 'Auto-run finished: out of maps', tone: 'warn' });
  }
}

/** Back to the hideout, with what the last map dropped still on the ground. */
function leaveMap(s: GameState): void {
  s.combat = null;
  s.action = null;
}

/** A map found in a run is that run's tier, or now and then the next one up. */
function droppedTier(s: GameState, ctx: Ctx, tier: number): number {
  const upChance = MAP_DROPS.tierUp + atlasBonuses(s).tierUpBonus;
  return MAP_TIERS.some((t) => t.tier === tier + 1) && chance(ctx.rng, upChance) ? tier + 1 : tier;
}

/** Roll which Sextant tier drops in a map of `tier`. */
function pickSextantDrop(ctx: Ctx, tier: number): string {
  const weights: { id: string; w: number }[] = [
    { id: 'sextant_apprentice', w: tier < 5 ? 100 : tier < 8 ? 55 : 25 },
    ...(tier >= 5 ? [{ id: 'sextant_journeyman', w: tier < 8 ? 45 : 50 }] : []),
    ...(tier >= 8 ? [{ id: 'sextant_master', w: 25 }] : []),
  ];
  return pickWeighted(ctx.rng, weights, (x) => x.w)!.id;
}

/** Maps, Sextants, Doomed Maps and Sextant hunting drops from monsters. */
export function rollMapDrops(s: GameState, ctx: Ctx, mon: MonsterInstance): void {
  const run = s.maps.run;
  const campaignEligible = (MAPS_PREVIEW.enabled || actOpen(FINAL_ACT)) && mon.level >= MAP_DROPS.campaignMinLevel;
  if (!run && !campaignEligible) return;

  const mods = run ? runModifiers(s) : null;
  const atlas = atlasBonuses(s);
  const firstCampaignBoss = !run && mon.isBoss && !!s.combat && !s.bossesDefeated.includes(s.combat.zoneId);
  const baseDropChance = run
    ? mon.isBoss
      ? MAP_DROPS.inMapBoss
      : MAP_DROPS.inMapKill
    : firstCampaignBoss
      ? MAP_DROPS.campaignFirstBoss
      : mon.isBoss
        ? MAP_DROPS.campaignBoss
        : MAP_DROPS.campaignKill;
  const mapFindMult = 1 + ((skillTreeStats(s).mapFind ?? 0) + (mods?.mapFindPct ?? 0)) / 100;

  if (chance(ctx.rng, baseDropChance * mapFindMult)) {
    const tier = run ? droppedTier(s, ctx, run.tier) : MAP_TIERS[0].tier;
    addMaps(s, tier, 1);
    if (run) s.maps.tally.mapsFound += 1;
    ctx.emit({ t: 'info', text: `Found a map: Map Tier ${tier}`, tone: 'good' });
  }

  if (!run || !mods) return;

  // Cartographer's Horizon notable: 25% chance for map bosses to drop an additional map
  if (mon.isBoss && atlas.bossExtraMapChance > 0 && chance(ctx.rng, atlas.bossExtraMapChance)) {
    const tier = droppedTier(s, ctx, run.tier);
    addMaps(s, tier, 1);
    s.maps.tally.mapsFound += 1;
    ctx.emit({ t: 'info', text: `Found an extra map: Map Tier ${tier}`, tone: 'good' });
  }

  // Sextant drops in maps
  const sextantChance = mon.isBoss ? MAP_DROPS.sextantBoss : MAP_DROPS.sextantKill;
  if (chance(ctx.rng, sextantChance)) {
    const sexId = pickSextantDrop(ctx, run.tier);
    addBank(s, sexId, 1);
    ctx.emit({ t: 'loot', currencyId: sexId, qty: 1 });
  }

  // Sextant hunting modifiers
  if (mods.hunts.has('fossil') && (mon.isBoss || chance(ctx.rng, 0.05))) {
    const qty = mon.isBoss ? rInt(ctx.rng, 1, 3) : 1;
    const id = pick(ctx.rng, FOSSILS).id;
    addBank(s, id, qty);
    ctx.emit({ t: 'loot', currencyId: id, qty });
    s.maps.tally.favoured += qty;
  }
  if (mods.hunts.has('unique') && mon.isBoss && chance(ctx.rng, 0.2)) {
    const pool = mapTierUniques(run.tier);
    const fallback = MAP_TIERS.flatMap((t) => mapTierUniques(t.tier));
    const uniqueId = pick(ctx.rng, pool.length ? pool : fallback);
    if (uniqueId) {
      placeItem(s, ctx, createUnique(s, uniqueId, mon.level, ctx.rng));
      s.maps.tally.favoured += 1;
    }
  }
  if (mods.hunts.has('key') && mon.isBoss && chance(ctx.rng, 0.25)) {
    const keyId = pick(ctx.rng, [...HARD_BOSS_KEYS]);
    addBank(s, keyId, 1);
    ctx.emit({ t: 'loot', currencyId: keyId, qty: 1 });
    s.maps.tally.favoured += 1;
  }

  // Doomed Horizon: T8–T10 map bosses can drop Doomed Maps
  if (!run.doomedTier && mon.isBoss && run.tier >= 8 && atlas.doomedUnlocked && chance(ctx.rng, MAP_DROPS.doomedBoss)) {
    const maxDoomed = run.tier === 8 ? 2 : run.tier === 9 ? 4 : 5;
    const dTier = rInt(ctx.rng, 1, maxDoomed);
    addDoomedMaps(s, dTier, 1);
    ctx.emit({ t: 'info', text: `Found a Doomed Map: ${doomedTier(dTier).name}`, tone: 'good' });
  }

  // Unique Map drops from map bosses
  if (!run.uniqueMapId && mon.isBoss && run.tier >= 5 && chance(ctx.rng, 0.08 * mapFindMult)) {
    const eligible = UNIQUE_MAPS.filter((u) => u.tier <= run.tier + 2);
    const chosen = pick(ctx.rng, eligible.length ? eligible : UNIQUE_MAPS);
    addUniqueMaps(s, chosen.id, 1);
    s.maps.tally.mapsFound += 1;
    ctx.emit({ t: 'info', text: `Found a Unique Map: ${chosen.name}`, tone: 'good' });
  }

  // Inside Doomed Maps: Fractured Orb drops and Uber Key drops on boss kill
  if (run.doomedTier) {
    const fracChance = mon.isBoss ? MAP_DROPS.fracturedBoss : MAP_DROPS.fracturedKill;
    if (chance(ctx.rng, fracChance)) {
      addBank(s, 'fractured_orb', 1);
      ctx.emit({ t: 'loot', currencyId: 'fractured_orb', qty: 1 });
      s.maps.tally.favoured += 1;
    }
    if (mon.isBoss) {
      const dDef = doomedTier(run.doomedTier);
      if (chance(ctx.rng, dDef.keyChance)) {
        const keyId = pick(ctx.rng, [...UBER_KEYS]);
        addBank(s, keyId, 1);
        ctx.emit({ t: 'loot', currencyId: keyId, qty: 1 });
        s.maps.tally.favoured += 1;
      }
    }
  }
}

/** A save holding a map that has since been renamed or removed drops out of it instead of crashing the load. */
export function settleMaps(s: GameState): void {
  syncMapStock(s);
  ensureSextants(s);
  ensureAtlas(s);
  const run = s.maps.run;
  if (!run) return;
  const validZone = EXTRA_ZONES.some((z) => z.id === run.zoneId);
  const validMap = run.uniqueMapId
    ? !!uniqueMapDef(run.uniqueMapId)
    : run.doomedTier
      ? DOOMED_TIERS.some((t) => t.tier === run.doomedTier)
      : hasMap(run.tier, run.theme);
  if (!validZone || !validMap) {
    s.maps.run = null;
    s.maps.auto = null;
    leaveMap(s);
  }
}

// ---------- dev tools, for the Map Device page ----------

export function grantMaps(s: GameState, n: number): void {
  for (const tier of MAP_TIERS) addMaps(s, tier.tier, n);
}

/** Lift a character past a tier's level, in rare gear of the kind it wears and with its skills levelled, so the loop can be tried without the climb. */
export function devKit(s: GameState, ctx: Ctx, level: number): void {
  s.skills.combat = Math.max(s.skills.combat, charXpForLevel(level));
  const kit = classDef(s.character.classId).kit;
  const armourLike = BASES.find((b) => b.id === (s.equipment.body?.baseId ?? kit.body));
  const same = (a?: number, b?: number) => !a === !b;
  const best = (fits: (b: BaseDef) => boolean) => BASES.filter((b) => b.reqLevel <= level && obtainable(b) && fits(b)).sort((a, b) => b.reqLevel - a.reqLevel)[0];
  const give = (slot: EquipSlot, base?: BaseDef) => {
    if (base) s.equipment[slot] = createItem(s, base.id, level, 'rare', ctx.rng);
  };
  const weapon = BASES.find((b) => b.id === (s.equipment.weapon?.baseId ?? kit.weapon));
  const bestWeapon = best((b) => b.slot === 'weapon' && b.family === weapon?.family && !b.twoHanded === !weapon?.twoHanded);
  give('weapon', bestWeapon);
  if (bestWeapon && !bestWeapon.twoHanded) {
    const offhandLike = BASES.find((b) => b.id === (s.equipment.offhand?.baseId ?? kit.offhand));
    give('offhand', best((b) => b.slot === 'offhand' && (!offhandLike || b.family === offhandLike.family)));
  }
  for (const slot of ['body', 'helmet', 'gloves', 'boots'] as const) {
    give(slot, best((b) => b.slot === slot && same(b.armour, armourLike?.armour) && same(b.evasion, armourLike?.evasion) && same(b.energyShield, armourLike?.energyShield)));
  }
  for (const slot of ['amulet', 'belt', 'ring1', 'ring2'] as const) give(slot, best((b) => b.slot === (slot.startsWith('ring') ? 'ring' : slot)));
  (['life_sacred', 'mana_sacred'] as const).forEach((id, slot) => {
    const prev = s.flaskSlots[slot];
    const f = newFlask(s, id);
    f.charges = flaskDef(id).maxCharges;
    if (prev?.instill) f.instill = prev.instill;
    s.flaskSlots[slot] = f;
  });
  (['granite', 'ruby'] as const).forEach((id, i) => {
    const slot = i + 2;
    const prev = s.flaskSlots[slot];
    const f = newFlask(s, id);
    f.charges = flaskDef(id).maxCharges;
    if (prev?.instill) f.instill = prev.instill;
    s.flaskSlots[slot] = f;
  });
  for (const gem of s.skillBar) {
    if (!gem) continue;
    gem.level = Math.max(gem.level, 20);
    if (gem.rules.every((r) => r.when === 'manual')) gem.rules = [suggestedRule(s, activeGemDef(gem.gemId))];
  }
  const d = deriveStats(s);
  s.life = d.maxLife;
  s.mana = d.maxMana;
  s.es = d.maxEs;
}

/** Turn wind-up rules on or off to try offline bosses both ways. */
export function devToggleWindups(s: GameState): void {
  const rules = s.account.automation.rules;
  s.account.automation.rules = rules.includes('windups') ? rules.filter((r) => r !== 'windups') : [...rules, 'windups'];
}

export function canStartHardBoss(s: GameState, bossId: HardBossId): string | null {
  const def = HARD_BOSSES.find((b) => b.id === bossId);
  if (!def) return 'Unknown boss';
  if ((s.account.bank[def.keyId] ?? 0) < 1) return `Requires 1 ${def.keyName}`;
  if (s.combat) return 'Already in combat';
  return null;
}

export function startHardBoss(s: GameState, ctx: Ctx, bossId: HardBossId): string | null {
  const reason = canStartHardBoss(s, bossId);
  if (reason) return reason;
  const def = HARD_BOSSES.find((b) => b.id === bossId)!;
  s.account.bank[def.keyId] -= 1;
  enterZone(s, ctx, def.zoneId);
  const d = deriveStats(s);
  s.life = d.maxLife;
  s.mana = d.maxMana;
  s.es = d.maxEs;
  for (const f of s.flaskSlots) {
    if (f) f.charges = flaskCapacity(s, f);
  }
  return null;
}

export function canStartUberBoss(s: GameState, tierOrId: 1 | 2 | 3 | UberBossDef['zoneId'] | string): string | null {
  const def = typeof tierOrId === 'number' ? UBER_BOSSES[tierOrId - 1] : UBER_BOSSES.find((b) => b.zoneId === tierOrId);
  if (!def) return 'Unknown Uber boss';
  if ((s.account.bank[def.keyId] ?? 0) < 1) return `Requires 1 ${def.keyName}`;
  if (s.combat) return 'Already in combat';
  return null;
}

export function startUberBoss(s: GameState, ctx: Ctx, tierOrId: 1 | 2 | 3 | UberBossDef['zoneId'] | string): string | null {
  const reason = canStartUberBoss(s, tierOrId);
  if (reason) return reason;
  const def = (typeof tierOrId === 'number' ? UBER_BOSSES[tierOrId - 1] : UBER_BOSSES.find((b) => b.zoneId === tierOrId))!;
  s.account.bank[def.keyId] -= 1;
  enterZone(s, ctx, def.zoneId);
  const d = deriveStats(s);
  s.life = d.maxLife;
  s.mana = d.maxMana;
  s.es = d.maxEs;
  for (const f of s.flaskSlots) {
    if (f) f.charges = flaskCapacity(s, f);
  }
  return null;
}

export function grantBossKeys(s: GameState, n = 2): void {
  for (const b of HARD_BOSSES) addBank(s, b.keyId, n);
  for (const b of UBER_BOSSES) addBank(s, b.keyId, n);
}

export { HARD_BOSSES, UBER_BOSSES };
export type { AtlasNode, HardBossDef, HardBossId, SextantTier, UberBossDef };
