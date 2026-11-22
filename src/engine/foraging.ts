import {
  ALL_MUTATIONS,
  BASE_SPECIES,
  BASE_SPECIES_INDEX,
  HYBRID_SPECIES,
  PLOT_UNLOCK_LEVELS,
  SHARED_MUTATIONS,
  foragingSource,
  hybridForParents,
  mutationDef,
  seedId,
  speciesDef,
  type MutationTier,
  type PlantMutation,
} from '../data/foraging';
import type { SkillAction } from '../data/skills';
import { addBank } from './bank';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import { rollCollectible } from './collectibles';
import type { Ctx } from './context';
import { recordDiscovery } from './professions';
import { chance, pick, type Rng } from './rng';
import type { GameState } from './types';
import { levelOf } from './xp';

export interface GreenhousePlot {
  parents: [string] | [string, string];
  plantedAt: number;
  readyAt: number;
}

export interface StrainRecord {
  generation: number;
  stable: boolean;
  firstSeen: number;
}

export interface ForagingState {
  seeds: Record<string, number>;
  strainHerbs: Record<string, number>;
  strains: Record<string, StrainRecord>;
  plots: (GreenhousePlot | null)[];
  packets: string[];
}

export const freshForaging = (): ForagingState => ({
  seeds: {},
  strainHerbs: {},
  strains: {},
  plots: [],
  packets: [],
});

const TIER_RANK: Record<MutationTier, number> = { common: 1, rare: 2, giga: 3 };

export function parseStrain(key: string): { species: string; mutations: string[] } {
  const [species, ...mutations] = key.split('|');
  return { species, mutations: mutations.filter(Boolean) };
}

export function makeStrainKey(species: string, mutations: readonly string[]): string {
  const unique = [...new Set(mutations.filter((m) => mutationDef(m)))].sort();
  return unique.length ? `${species}|${unique.join('|')}` : species;
}

export function strainLabel(key: string): string {
  const { species, mutations } = parseStrain(key);
  const spName = speciesDef(species)?.name ?? species;
  if (!mutations.length) return spName;
  const names = mutations.map((m) => mutationDef(m)?.name ?? m).join(' ');
  return `${names} ${spName}`;
}

export function strainHighestTier(key: string): MutationTier | null {
  const { mutations } = parseStrain(key);
  let best: MutationTier | null = null;
  for (const m of mutations) {
    const tier = mutationDef(m)?.tier;
    if (tier && (!best || TIER_RANK[tier] > TIER_RANK[best])) best = tier;
  }
  return best;
}

export function herbariumCount(s: GameState): number {
  return Object.keys(s.foraging.strains).length;
}

export function stableStrainCount(s: GameState): number {
  return Object.values(s.foraging.strains).filter((r) => r.stable).length;
}

export function greenhousePlotCount(s: GameState): number {
  const lvl = levelOf('harvesting', s.skills.harvesting);
  if (lvl < PLOT_UNLOCK_LEVELS[0]) return 0;
  let plots = 2;
  for (let i = 1; i < PLOT_UNLOCK_LEVELS.length; i++) {
    if (lvl >= PLOT_UNLOCK_LEVELS[i]) plots++;
  }
  const hCount = herbariumCount(s);
  if (hCount >= 10) plots++;
  if (hCount >= 100) plots++;
  return Math.min(10, plots);
}

export function greenhouseGrowSpeedMult(s: GameState, parents: readonly string[]): number {
  let pct = 0;
  const hCount = herbariumCount(s);
  if (hCount >= 50) pct += 10;
  if (hCount >= 200) pct += 10;
  const stCount = stableStrainCount(s);
  if (stCount >= 3) pct += 10;
  if (stCount >= 15) pct += 10;
  if (parents.some((p) => parseStrain(p).mutations.includes('quickroot'))) pct += 20;
  return 1 + pct / 100;
}

export function inheritanceBonusPct(s: GameState, parents: readonly string[]): number {
  let bonus = 0;
  if (herbariumCount(s) >= 25) bonus += 5;
  if (stableStrainCount(s) >= 10) bonus += 10;
  for (const p of parents) {
    if (parseStrain(p).mutations.includes('hardy')) bonus += 10;
  }
  return bonus;
}

export function discoveredHybridHints(s: GameState): { hybridId: string; hybridName: string; parents: [string, string]; discovered: boolean }[] {
  const discoveredSpecies = new Set(Object.keys(s.foraging.strains).map((k) => parseStrain(k).species));
  const hintBudget = Math.floor(herbariumCount(s) / 25);
  let hintsUsed = 0;
  const out: { hybridId: string; hybridName: string; parents: [string, string]; discovered: boolean }[] = [];
  for (const h of HYBRID_SPECIES) {
    const found = discoveredSpecies.has(h.id);
    if (found) {
      out.push({ hybridId: h.id, hybridName: h.name, parents: [h.parents![0], h.parents![1]], discovered: true });
    } else if (hintsUsed < hintBudget) {
      hintsUsed++;
      out.push({ hybridId: h.id, hybridName: h.name, parents: [h.parents![0], h.parents![1]], discovered: false });
    }
  }
  return out;
}

function drawWeightedMutation(rng: Rng, pool: PlantMutation[], speciesIndex: number): PlantMutation | null {
  if (!pool.length) return null;
  const depthMult = 1 + 0.25 * Math.max(0, speciesIndex);
  const weights = pool.map((m) => (m.tier === 'common' ? m.weight : m.weight * depthMult));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  let roll = rng.next() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function rollWildVariant(rng: Rng, speciesId: string): string {
  const spIdx = BASE_SPECIES_INDEX.get(speciesId) ?? 0;
  const countRoll = rng.next();
  const count = countRoll < 0.90 ? 1 : countRoll < 0.99 ? 2 : 3;
  const pool = [...SHARED_MUTATIONS];
  const picked: string[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const m = drawWeightedMutation(rng, pool, spIdx);
    if (!m) break;
    picked.push(m.id);
    const idx = pool.findIndex((x) => x.id === m.id);
    if (idx >= 0) pool.splice(idx, 1);
  }
  return makeStrainKey(speciesId, picked);
}

export function keepRarestMutations(mutations: readonly string[], cap = 3): string[] {
  const unique = [...new Set(mutations.filter((m) => mutationDef(m)))];
  if (unique.length <= cap) return unique.sort();
  return unique
    .sort((a, b) => {
      const ta = TIER_RANK[mutationDef(a)!.tier];
      const tb = TIER_RANK[mutationDef(b)!.tier];
      if (tb !== ta) return tb - ta;
      return a.localeCompare(b);
    })
    .slice(0, cap)
    .sort();
}

export function grantSeed(s: GameState, key: string, qty = 1, now = Date.now(), addPacket = true): void {
  if (qty <= 0) return;
  s.foraging.seeds[key] = (s.foraging.seeds[key] ?? 0) + qty;
  if (!s.foraging.strains[key]) {
    s.foraging.strains[key] = { generation: 0, stable: false, firstSeen: now };
  }
  if (addPacket) {
    for (let i = 0; i < qty; i++) s.foraging.packets.push(key);
  }
}

export function openSeedPacket(s: GameState): string | null {
  return s.foraging.packets.shift() ?? null;
}

export function openAllSeedPackets(s: GameState): string[] {
  const all = [...s.foraging.packets];
  s.foraging.packets = [];
  return all;
}

/** Once per completed wild foraging cycle, independent of ordinary yield/manual doubles. */
export function foragingDone(s: GameState, ctx: Ctx, a: SkillAction, _foreground: boolean): void {
  const source = foragingSource(a);
  if (!source) return;
  rollCollectible(s, ctx, 'harvesting', source.plant);
  const c = s.professionProgress.counters;
  const key = `foraging.seed.${source.plant}`;
  c[key] = (c[key] ?? 0) + 1;

  // Plain seed: 1% chance, first guaranteed at 100 completions
  const firstPending = !s.professionProgress.discoveries[seedId(source.plant)];
  if (chance(ctx.rng, 0.01) || (firstPending && c[key] >= 100)) {
    if (firstPending) recordDiscovery(s, ctx, seedId(source.plant));
    grantSeed(s, source.plant, 1, ctx.now);
  }

  // Variant seed: 2% chance
  if (chance(ctx.rng, 0.02)) {
    const variant = rollWildVariant(ctx.rng, source.plant);
    grantSeed(s, variant, 1, ctx.now);
  }
}

export function ensurePlotCapacity(s: GameState): void {
  const cap = greenhousePlotCount(s);
  while (s.foraging.plots.length < cap) s.foraging.plots.push(null);
}

export function plotDurationMs(s: GameState, parents: [string] | [string, string]): number {
  const speed = greenhouseGrowSpeedMult(s, parents);
  if (parents.length === 1) {
    const sp = speciesDef(parseStrain(parents[0]).species);
    return Math.round((sp?.growMs ?? 30 * 60_000) / speed);
  }
  const sp1 = speciesDef(parseStrain(parents[0]).species);
  const sp2 = speciesDef(parseStrain(parents[1]).species);
  const base = Math.max(sp1?.growMs ?? 30 * 60_000, sp2?.growMs ?? 30 * 60_000);
  return Math.round((1.5 * base) / speed);
}

export function plantPlot(s: GameState, plotIndex: number, parents: [string] | [string, string], now = Date.now()): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  if (s.fallen) return 'This character has fallen';
  const cap = greenhousePlotCount(s);
  if (cap === 0) return 'Greenhouse unlocks at Foraging level 5';
  if (plotIndex < 0 || plotIndex >= cap) return 'Plot is locked';
  ensurePlotCapacity(s);
  if (s.foraging.plots[plotIndex]) return 'Plot is already occupied';

  // Count seed requirements (stable strains do not consume seeds)
  const needed: Record<string, number> = {};
  for (const key of parents) {
    if (!speciesDef(parseStrain(key).species)) return 'Unknown plant strain';
    if (!s.foraging.strains[key]?.stable) {
      needed[key] = (needed[key] ?? 0) + 1;
    }
  }
  for (const [key, count] of Object.entries(needed)) {
    if ((s.foraging.seeds[key] ?? 0) < count) return `Need ${count} ${strainLabel(key)} seed${count > 1 ? 's' : ''}`;
  }
  for (const [key, count] of Object.entries(needed)) {
    s.foraging.seeds[key] -= count;
    if (s.foraging.seeds[key] <= 0) delete s.foraging.seeds[key];
  }

  const dur = plotDurationMs(s, parents);
  s.foraging.plots[plotIndex] = { parents, plantedAt: now, readyAt: now + dur };
  return null;
}

function bumpEssenceGrade(id: string): string {
  const m = id.match(/^(essence_[a-z]+_)(\d+)$/);
  if (!m) return id;
  const grade = Math.min(3, Number(m[2]) + 1);
  return `${m[1]}${grade}`;
}

export function crossOffspring(s: GameState, rng: Rng, p1: string, p2: string): string {
  const a = parseStrain(p1);
  const b = parseStrain(p2);
  const lvl = levelOf('harvesting', s.skills.harvesting);

  // Species resolution
  let species: string;
  const hyb = lvl >= 80 ? hybridForParents(a.species, b.species) : undefined;
  if (a.species === b.species) {
    species = a.species;
  } else if (hyb) {
    species = hyb.id;
  } else {
    species = rng.next() < 0.5 ? a.species : b.species;
  }

  // Mutation inheritance
  const selfStable = p1 === p2 && !!s.foraging.strains[p1]?.stable;
  const inherited: string[] = [];
  if (selfStable) {
    inherited.push(...a.mutations);
  } else {
    const parentMuts = [...new Set([...a.mutations, ...b.mutations])];
    const chancePct = Math.min(95, 50 + inheritanceBonusPct(s, [p1, p2]));
    for (const m of parentMuts) {
      if (chance(rng, chancePct / 100)) inherited.push(m);
    }
  }
  let finalMuts = keepRarestMutations(inherited, 3);

  // New mutation roll(s)
  const stCount = stableStrainCount(s);
  const newMutChance = 0.10 + (stCount >= 1 ? 0.05 : 0);
  const rolls = stCount >= 25 ? 2 : 1;
  const spDef = speciesDef(species);
  const spIdx = BASE_SPECIES_INDEX.get(species) ?? BASE_SPECIES.length;
  const pool = ALL_MUTATIONS.filter((m) => (!m.hybridOnly || m.hybridOnly === spDef?.id) && !finalMuts.includes(m.id));
  for (let r = 0; r < rolls; r++) {
    if (pool.length && chance(rng, newMutChance)) {
      const m = drawWeightedMutation(rng, pool, spIdx);
      if (m) {
        finalMuts = keepRarestMutations([...finalMuts, m.id], 3);
        const idx = pool.findIndex((x) => x.id === m.id);
        if (idx >= 0) pool.splice(idx, 1);
      }
    }
  }

  return makeStrainKey(species, finalMuts);
}

export interface HarvestResult {
  mode: 'grow' | 'cross';
  herbs?: { strain: string; qty: number };
  seeds: string[];
  essences: string[];
  stabilised?: string;
  replanted?: boolean;
}

export function harvestPlot(s: GameState, ctx: Ctx, plotIndex: number, now = Date.now()): HarvestResult | string {
  ensurePlotCapacity(s);
  const plot = s.foraging.plots[plotIndex];
  if (!plot) return 'Plot is empty';
  if (now < plot.readyAt) return 'Plot is still growing';

  if (plot.parents.length === 1) {
    const key = plot.parents[0];
    const { species, mutations } = parseStrain(key);
    const sp = speciesDef(species);
    const extraHerbs = (mutations.includes('bountiful') ? 1 : 0) + (mutations.includes('overflowing') ? 3 : 0);
    const herbQty = 10 + extraHerbs;
    if (!mutations.length && sp && !sp.hybrid) {
      addBank(s, sp.herb, herbQty);
    } else {
      s.foraging.strainHerbs[key] = (s.foraging.strainHerbs[key] ?? 0) + herbQty;
    }

    const seedQty = 1 + (mutations.includes('twin_headed') ? 1 : 0);
    grantSeed(s, key, seedQty, now, false);

    // Essence bonus from Fragrant / Lucent
    const essences: string[] = [];
    if (sp?.essences.length) {
      const hasFragrant = mutations.includes('fragrant');
      const hasLucent = mutations.includes('lucent');
      const essChance = 0.02 * (1 + (hasFragrant ? 0.25 : 0) + (hasLucent ? 0.50 : 0));
      if (chance(ctx.rng, essChance)) {
        const rawEss = pick(ctx.rng, sp.essences);
        const essId = hasLucent ? bumpEssenceGrade(rawEss) : rawEss;
        addBank(s, essId, 1);
        essences.push(essId);
      }
    }

    // Everbloom auto-replants at no seed cost
    let replanted = false;
    if (mutations.includes('everbloom')) {
      const dur = plotDurationMs(s, [key]);
      s.foraging.plots[plotIndex] = { parents: [key], plantedAt: now, readyAt: now + dur };
      replanted = true;
    } else {
      s.foraging.plots[plotIndex] = null;
    }

    return { mode: 'grow', herbs: { strain: key, qty: herbQty }, seeds: Array(seedQty).fill(key), essences, replanted };
  }

  // Cross two parents
  const [p1, p2] = plot.parents;
  const offspringCount = 3 + (stableStrainCount(s) >= 6 ? 1 : 0);
  const seeds: string[] = [];
  let stabilised: string | undefined;

  for (let i = 0; i < offspringCount; i++) {
    const child = crossOffspring(s, ctx.rng, p1, p2);
    grantSeed(s, child, 1, now, true);
    seeds.push(child);

    // Stabilisation check on self-cross
    if (p1 === p2 && child === p1) {
      const rec = s.foraging.strains[p1] ?? (s.foraging.strains[p1] = { generation: 0, stable: false, firstSeen: now });
      if (!rec.stable) {
        rec.generation += 1;
        const need = parseStrain(p1).mutations.includes('deep_rooted') ? 3 : 5;
        if (rec.generation >= need) {
          rec.stable = true;
          stabilised = p1;
        }
      }
    }
  }

  s.foraging.plots[plotIndex] = null;
  return { mode: 'cross', seeds, essences: [], stabilised };
}

/** Legacy action ID -> new base species ID for save migration. */
const LEGACY_FORAGE_SPECIES: Record<string, string> = {
  herb_sun: 'sunpetal',
  herb_emberbloom: 'sunpetal',
  herb_abundant_sunpetal: 'sunpetal',
  herb_concentrated_sunpetal: 'sunpetal',
  herb_frost: 'frostleaf',
  herb_windreed: 'frostleaf',
  herb_abundant_frostleaf: 'frostleaf',
  herb_concentrated_frostleaf: 'frostleaf',
  herb_ember: 'emberroot',
  herb_ledge: 'emberroot',
  herb_abundant_emberroot: 'emberroot',
  herb_concentrated_emberroot: 'emberroot',
  herb_void: 'voidbloom',
  herb_abundant_voidbloom: 'voidbloom',
  herb_concentrated_voidbloom: 'voidbloom',
  herb_moon: 'moon_bloom',
  herb_star: 'star_bloom',
};

export function migrateForagingToBreeding(raw: Record<string, unknown>): void {
  const f: ForagingState = (raw.foraging as ForagingState | undefined) ?? freshForaging();
  raw.foraging = f;

  // Convert old mastery tracks to forage_<species>, keeping highest XP
  const mastery = raw.skillingMastery as Record<string, number> | undefined;
  if (mastery) {
    for (const [oldId, sp] of Object.entries(LEGACY_FORAGE_SPECIES)) {
      if (mastery[oldId] !== undefined) {
        const nextId = `forage_${sp}`;
        mastery[nextId] = Math.max(mastery[nextId] ?? 0, mastery[oldId]);
        delete mastery[oldId];
      }
    }
  }

  // Each discovered seed_<plant> becomes 5 plain seeds
  const progress = raw.professionProgress as { discoveries?: Record<string, boolean> } | undefined;
  if (progress?.discoveries) {
    for (const sp of BASE_SPECIES) {
      if (progress.discoveries[seedId(sp.id)]) {
        f.seeds[sp.id] = (f.seeds[sp.id] ?? 0) + 5;
        f.strains[sp.id] ??= { generation: 0, stable: false, firstSeen: 0 };
      }
    }
  }

  // Convert remembered old greenhouse crop to plot 0, ready immediately
  const oldGh = raw.greenhouse as { actionId?: string } | null | undefined;
  if (oldGh?.actionId) {
    const sp = LEGACY_FORAGE_SPECIES[oldGh.actionId];
    if (sp) {
      f.plots[0] = { parents: [sp], plantedAt: 0, readyAt: 0 };
      f.strains[sp] ??= { generation: 0, stable: false, firstSeen: 0 };
    }
  }
  delete raw.greenhouse;

  // Remap running legacy foraging action
  const act = raw.action as { kind?: string; actionId?: string } | null | undefined;
  if (act?.kind === 'skill' && act.actionId && LEGACY_FORAGE_SPECIES[act.actionId]) {
    act.actionId = `forage_${LEGACY_FORAGE_SPECIES[act.actionId]}`;
  }
}

export function settleForaging(s: GameState): void {
  s.foraging ??= freshForaging();
  ensurePlotCapacity(s);
}

export function foragingAccessHint(_s: GameState, _a: SkillAction): string | null {
  return null;
}

export function foragingPreview(_s: GameState, _a: SkillAction): string[] {
  return [];
}
