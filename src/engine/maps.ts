import { BASES, obtainable, type BaseDef } from '../data/bases';
import { classDef } from '../data/classes';
import { FOSSILS } from '../data/craftMats';
import { activeGemDef } from '../data/gems';
import { hasMap, MAP_DROPS, MAP_THEMES, MAP_TIERS, mapTheme, mapTier, mapZoneId } from '../data/maps';
import { addBank } from './bank';
import { suggestedRule } from './automation';
import { campaignComplete } from './hideout';
import { enterZone } from './combat';
import type { Ctx } from './context';
import { createItem, createUnique } from './items';
import { placeItem } from './loot';
import { chance, pick, rInt } from './rng';
import { skillTreeStats } from './skillTree';
import { deriveStats } from './stats';
import type { EquipSlot, GameState, MapState, MonsterInstance } from './types';
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

export function newMapState(): MapState {
  return { stock: {}, run: null, auto: null, tally: { runs: 0, clearMs: 0, mapsFound: 0, favoured: 0 } };
}

export function mapsHeld(s: GameState, tier: number, themeId: string): number {
  return s.maps.stock[mapZoneId(tier, themeId)] ?? 0;
}

export function addMaps(s: GameState, tier: number, themeId: string, n: number): string {
  const id = mapZoneId(tier, themeId);
  s.maps.stock[id] = (s.maps.stock[id] ?? 0) + n;
  return id;
}

/** Use up a map and step through. Each map starts you fresh: there's no town between auto-runs to recover in. */
function enterMap(s: GameState, ctx: Ctx, tier: number, themeId: string): void {
  addMaps(s, tier, themeId, -1);
  const packs = mapTier(tier).packs;
  const zoneId = mapZoneId(tier, themeId);
  s.maps.run = { zoneId, tier, theme: themeId, packsLeft: packs, packsTotal: packs, startedAt: s.clock, deaths: s.lifetime.deaths, bossDown: false };
  enterZone(s, ctx, zoneId);
  const d = deriveStats(s);
  s.life = d.maxLife;
  s.mana = d.maxMana;
  s.es = d.maxEs;
}

/** Run one map by hand. */
export function startMap(s: GameState, ctx: Ctx, tier: number, themeId: string): string | null {
  if (s.maps.run) return 'Already in a map';
  if (mapsHeld(s, tier, themeId) <= 0) return 'No maps of that kind';
  enterMap(s, ctx, tier, themeId);
  return null;
}

/** Keep using maps of this tier and theme until they run out. Joins the run under way if there is one. */
export function startAutoRun(s: GameState, ctx: Ctx, tier: number, themeId: string): string | null {
  const reason = s.maps.run ? null : startMap(s, ctx, tier, themeId);
  if (reason) return reason;
  s.maps.auto = { tier, theme: themeId };
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

export function onMapPack(s: GameState): void {
  if (s.maps.run) s.maps.run.packsLeft -= 1;
}

/** Running from a whole field isn't clearing it: losing the last monster sends a pack back. */
export function onMapFieldLost(s: GameState): void {
  const run = s.maps.run;
  if (run) run.packsLeft = Math.min(run.packsTotal, run.packsLeft + 1);
}

/** Runs once per game step: moves on from a finished run, or notices one that ended in a death or a retreat. */
export function mapStep(s: GameState, ctx: Ctx): void {
  const m = s.maps;
  const run = m.run;
  if (!run) return;
  if (s.combat?.zoneId !== run.zoneId) {
    const died = s.lifetime.deaths > run.deaths;
    const auto = !!m.auto;
    m.run = null;
    m.auto = null;
    if (died || auto) ctx.emit({ t: 'info', text: `${died ? 'You died in the map' : 'You left the map'}, and it's used up${auto ? '. Auto-run stopped' : ''}`, tone: 'warn' });
    return;
  }
  if (!run.bossDown) return;
  m.tally.runs += 1;
  m.tally.clearMs += s.clock - run.startedAt;
  m.run = null;
  ctx.emit({ t: 'info', text: `${mapTheme(run.theme).name} cleared`, tone: 'good' });
  if (!m.auto) {
    leaveMap(s);
  } else if (mapsHeld(s, m.auto.tier, m.auto.theme) > 0) {
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
function droppedTier(ctx: Ctx, tier: number): number {
  return MAP_TIERS.some((t) => t.tier === tier + 1) && chance(ctx.rng, MAP_DROPS.tierUp) ? tier + 1 : tier;
}

/** Maps from any monster, and what a map's theme favours. */
export function rollMapDrops(s: GameState, ctx: Ctx, mon: MonsterInstance): void {
  const run = s.maps.run;
  if (!run && (!mapsOpen(s) || mon.level < MAP_DROPS.campaignMinLevel)) return;
  const dropChance = run ? (mon.isBoss ? MAP_DROPS.inMapBoss : MAP_DROPS.inMapKill) : mon.isBoss ? MAP_DROPS.campaignBoss : MAP_DROPS.campaignKill;
  if (chance(ctx.rng, dropChance * (1 + (skillTreeStats(s).mapFind ?? 0) / 100))) {
    const tier = run ? droppedTier(ctx, run.tier) : MAP_TIERS[0].tier;
    const theme = pick(ctx.rng, MAP_THEMES);
    addMaps(s, tier, theme.id, 1);
    if (run) s.maps.tally.mapsFound += 1;
    ctx.emit({ t: 'info', text: `Found a map: ${theme.name}`, tone: 'good' });
  }
  if (!run) return;
  const drop = mapTheme(run.theme).drop;
  if (drop.kind === 'fossil') {
    if (mon.isBoss || chance(ctx.rng, drop.killChance)) {
      const qty = mon.isBoss ? rInt(ctx.rng, ...drop.bossQty) : 1;
      const id = pick(ctx.rng, FOSSILS).id;
      addBank(s, id, qty);
      ctx.emit({ t: 'loot', currencyId: id, qty });
      s.maps.tally.favoured += qty;
    }
  } else if (chance(ctx.rng, mon.isBoss ? drop.bossChance : drop.killChance)) {
    placeItem(s, ctx, createUnique(s, drop.uniqueId, mon.level));
    s.maps.tally.favoured += 1;
  }
}

/** A save holding a map that has since been renamed or removed drops out of it instead of crashing the load. */
export function settleMaps(s: GameState): void {
  const run = s.maps.run;
  if (run && !hasMap(run.tier, run.theme)) {
    s.maps.run = null;
    s.maps.auto = null;
    leaveMap(s);
  }
}

// ---------- dev tools, for the Map Device page ----------

export function grantMaps(s: GameState, n: number): void {
  for (const tier of MAP_TIERS) for (const theme of MAP_THEMES) addMaps(s, tier.tier, theme.id, n);
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
  give('weapon', best((b) => b.slot === 'weapon' && b.family === weapon?.family && !b.twoHanded === !weapon?.twoHanded));
  for (const slot of ['body', 'helmet', 'gloves', 'boots'] as const) {
    give(slot, best((b) => b.slot === slot && same(b.armour, armourLike?.armour) && same(b.evasion, armourLike?.evasion) && same(b.energyShield, armourLike?.energyShield)));
  }
  for (const slot of ['amulet', 'belt', 'ring1', 'ring2'] as const) give(slot, best((b) => b.slot === (slot.startsWith('ring') ? 'ring' : slot)));
  for (const gem of s.skillBar) {
    if (!gem) continue;
    gem.level = Math.max(gem.level, 15);
    if (gem.rules.every((r) => r.when === 'manual')) gem.rules = [suggestedRule(s, activeGemDef(gem.gemId))];
  }
  const d = deriveStats(s);
  s.life = d.maxLife;
  s.mana = d.maxMana;
}

/** Turn wind-up rules on or off to try offline bosses both ways. */
export function devToggleWindups(s: GameState): void {
  const rules = s.account.automation.rules;
  s.account.automation.rules = rules.includes('windups') ? rules.filter((r) => r !== 'windups') : [...rules, 'windups'];
}
