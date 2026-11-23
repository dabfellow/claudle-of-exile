import { SHARD_CHANCE, SHARD_FOR } from '../data/craftMats';
import {
  DELVE_BANDS, DELVE_FOCUS_HOLD_MS, DELVE_HAZARDS, DELVE_INSTALLATIONS, DELVE_PICKS,
  DELVE_ROUGH_SIZES, DELVE_RUBBLE_PER_WORK, DELVE_SECURITY, DELVE_TRAITS, WORLDROOT_DEPTH,
  delveBand, type DelveHazard, type DelveInstallationType, type DelveMode, type DelveTrait,
} from '../data/delve';
import { MINING_FOSSILS } from '../data/mining';
import { actionDef, SKILL_XP_SCALE, type SkillAction } from '../data/skills';
import { astrologyOffline, astrologyXp, astrologyYield } from './astrology';
import { addBank, canAfford, hasItem, payCost, payResolvedCost, resolveRecipeCost } from './bank';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import { rollCollectible } from './collectibles';
import type { Ctx } from './context';
import { braceResult, focusMult, focusStep, minigameSwing, takeDouble, type SwingResult } from './minigame';
import { awardProfessionProgress } from './professions';
import { chance, pickWeighted, rInt, seeded, type Rng } from './rng';
import { STAR_ROUGH, starStoneChance } from './roughGems';
import { skillTreeStats } from './skillTree';
import { actionIntervalMs, grantXp } from './skills';
import { grantMasteryPractice, masteryYield, stochasticRound, unlockedMilestones } from './skillingMastery';
import type { Derived } from './stats';
import type { GameState } from './types';
import { levelOf } from './xp';

interface DelveLayer {
  traits: DelveTrait[];
  secure: number;
  floodedUntil?: number;
}

export interface DelveInstallation {
  type: DelveInstallationType;
  layer: number;
  tier: number;
}

export interface DelveEvent {
  layer: number;
  text: string;
  fromDepth: number;
  revealedDepth: number;
}

interface DelveWarning {
  hazard: DelveHazard;
  startsAt: number;
  timerMs: number;
  action: string;
  layer: number;
}

export interface DelveState {
  seed: number;
  deepest: number;
  pickTier: number;
  layers: Record<number, DelveLayer>;
  installations: DelveInstallation[];
  gasUntil?: number;
  gasLayer?: number;
  log: string[];
  replay: DelveEvent[];
  stats: { caverns: number; motherlodes: number };
  landmarkPending?: boolean;
  warning?: DelveWarning;
  nextWarning?: number;
  bracedPush?: number;
  focusHoldUntil?: number;
  lastBrace?: { result: SwingResult; at: number };
}

const LOG_LIMIT = 200;
const FLOOD_MS = 30 * 60 * 1000;
const GAS_MS = 10 * 60 * 1000;
const BRACE_GRACE_MS = 1000;

export function newDelveState(seed = 0): DelveState {
  return {
    seed: seed >>> 0, deepest: 1, pickTier: 0, layers: { 1: { traits: [], secure: 0 } }, installations: [],
    log: [], replay: [], stats: { caverns: 0, motherlodes: 0 },
  };
}

export function isDelveAction(id: string): boolean {
  return id === 'delve_work' || id === 'delve_push';
}

export function delveDepthCap(level: number): number {
  return level >= 99 ? Infinity : level * 3;
}

export function rollDelveTraits(rng: Rng, layer: number): DelveTrait[] {
  const rolled = DELVE_TRAITS.filter((trait) => layer >= trait.from && chance(rng, trait.chance));
  return rolled.sort((a, b) => b.chance - a.chance).slice(0, 2).map((trait) => trait.id);
}

/** Layer traits are fixed before Adamant previews them and stay fixed through reloads. */
export function delveTraitsAt(delve: DelveState, layer: number): DelveTrait[] {
  return delve.layers[layer]?.traits ?? rollDelveTraits(seeded(delve.seed ^ Math.imul(layer, 0x9e3779b9)), layer);
}

/** Crystal seams add a carat, Motherlodes add two, and only caverns can reach five carats. */
export function rollDelveRough(rng: Rng, traits: DelveTrait[], cavern = false, starChance = 0): (typeof DELVE_ROUGH_SIZES)[number]['id'] | typeof STAR_ROUGH {
  const roll = rng.next();
  if (starChance > 0 && roll >= 1 - starChance) return STAR_ROUGH;
  const share = roll / (1 - starChance);
  const size = share < 0.30 ? 1 : share < 0.80 ? 2 : share < 0.98 ? 3 : 4;
  const extra = traits.includes('motherlode') ? 2 : traits.includes('crystal') || cavern ? 1 : 0;
  return DELVE_ROUGH_SIZES[Math.min(cavern ? 5 : 4, size + extra) - 1].id;
}

export function delvePushCost(layer: number, pickTier: number): number {
  return Math.max(1, 1 + Math.floor(layer / 50) - (pickTier >= 4 ? 1 : 0));
}

export function delvePushTime(layer: number, pickTier: number): number {
  return 40000 * (1 + layer / 100) * (pickTier >= 7 ? 0.75 : 1);
}

export function installationReach(tier: number): number {
  return 50 + (tier - 1) * 25;
}

export function installationCovers(delve: DelveState, hazard: DelveHazard, layer: number): boolean {
  return delve.installations.some((i) => i.type === DELVE_INSTALLATIONS[hazard].id && i.layer <= layer &&
    i.layer + installationReach(i.tier) >= layer);
}

export function delveInstallationCost(delve: DelveState, hazard: DelveHazard, layer: number): Record<string, number> {
  const built = delve.installations.find((i) => i.layer === layer && i.type === DELVE_INSTALLATIONS[hazard].id);
  const mult = 2 ** (built?.tier ?? 0);
  return { rubble: 200 * mult, [delveBand(layer).ore]: 100 * mult };
}

export function delveInstallationBlocker(s: GameState, hazard: DelveHazard, layer: number): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const target = s.delve.layers[layer];
  if (!target) return 'Reach this layer first';
  const def = DELVE_INSTALLATIONS[hazard];
  const existing = s.delve.installations.find((i) => i.type === def.id && i.layer === layer);
  if (!existing && target.secure < def.security) return `Requires ${def.security} security at this depth`;
  if (existing && existing.tier >= 4) return 'Fully upgraded';
  return canAfford(s, delveInstallationCost(s.delve, hazard, layer)) ? null : 'Missing materials';
}

export function buildDelveInstallation(s: GameState, hazard: DelveHazard, layer: number): string | null {
  const blocker = delveInstallationBlocker(s, hazard, layer);
  if (blocker) return blocker;
  const type = DELVE_INSTALLATIONS[hazard].id;
  payCost(s, delveInstallationCost(s.delve, hazard, layer));
  const installed = s.delve.installations.find((i) => i.type === type && i.layer === layer);
  if (installed) installed.tier++;
  else s.delve.installations.push({ type, layer, tier: 1 });
  return null;
}

export function delvePickCost(pickTier: number): Record<string, number> {
  const next = DELVE_PICKS[pickTier + 1];
  if (!next) return {};
  return { [delveBand(next.layer).ore.replace(/_ore$/, '_bar')]: 50, ...(next.layer === WORLDROOT_DEPTH ? { heartstone: 5 } : {}) };
}

export function delvePickBlocker(s: GameState): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const next = DELVE_PICKS[s.delve.pickTier + 1];
  if (!next) return 'Fully upgraded';
  if (s.delve.deepest < next.layer) return `Reach layer ${next.layer}`;
  return resolveRecipeCost(s, delvePickCost(s.delve.pickTier)) ? null : 'Missing materials';
}

export function upgradeDelvePick(s: GameState): string | null {
  const blocker = delvePickBlocker(s);
  if (blocker) return blocker;
  const resolved = resolveRecipeCost(s, delvePickCost(s.delve.pickTier));
  if (!resolved) return 'Missing materials';
  payResolvedCost(s, resolved);
  s.delve.pickTier++;
  return null;
}

function rubblePerSupport(delve: DelveState): number {
  return delve.pickTier >= 1 ? 4 : 5;
}

function supportPayment(s: GameState, count: number) {
  const mine_support = Math.min(count, s.storage.bank.mine_support ?? 0);
  return { mine_support, rubble: (count - mine_support) * rubblePerSupport(s.delve) };
}

export function delvePushPayment(s: GameState, layer: number) {
  return supportPayment(s, delvePushCost(layer, s.delve.pickTier));
}

function spendAvailableSupports(s: GameState, count: number) {
  const available = (s.storage.bank.mine_support ?? 0) + Math.floor((s.storage.bank.rubble ?? 0) / rubblePerSupport(s.delve));
  const cost = supportPayment(s, Math.min(count, available));
  payCost(s, cost);
  return cost;
}

export function delveHazardChance(delve: DelveState, layer: number, mode: DelveMode): number {
  if ((delve.layers[layer]?.secure ?? 0) >= DELVE_SECURITY) return 0;
  const deeper = Math.max(0, Math.floor((layer - WORLDROOT_DEPTH) / 50)) * 0.05;
  const base = mode === 'push' ? Math.min(0.6, 0.25 + layer * 0.001) : 0.02;
  return Math.min(1, base + deeper) * (delve.pickTier >= 5 ? 0.8 : 1);
}

function chooseHazard(rng: Rng, traits: DelveTrait[]): DelveHazard {
  if (traits.includes('flooded')) return 'flood';
  return pickWeighted(rng, DELVE_HAZARDS, (hazard) => hazard === 'cave-in' ? (traits.includes('unstable') ? 100 : 50) : 25)!;
}

export function delvePushBlocker(s: GameState): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const layer = s.delve.deepest + 1;
  const level = levelOf('mining', s.skills.mining);
  if (layer > delveDepthCap(level)) return `Requires Mining level ${Math.min(99, Math.ceil(layer / 3))}`;
  const { rubble } = delvePushPayment(s, layer);
  return hasItem(s, 'rubble', rubble) ? null : `Needs ${rubble} rubble`;
}

function clearWarning(delve: DelveState): void {
  delete delve.warning;
  delete delve.nextWarning;
  delete delve.bracedPush;
}

export function startDelve(s: GameState, ctx: Ctx, mode: DelveMode, layer = s.delve.deepest): string | null {
  let blocker = isClassic(s) ? CLASSIC_BLOCK : null;
  if (!blocker) blocker = mode === 'push' ? delvePushBlocker(s) : s.delve.layers[layer] ? null : 'Reach this layer first';
  if (blocker) {
    ctx.emit({ t: 'info', text: blocker, tone: 'warn' });
    return blocker;
  }
  s.combat = null;
  s.heist.auto = null;
  clearWarning(s.delve);
  delete s.delve.focusHoldUntil;
  s.action = { kind: 'skill', actionId: mode === 'push' ? 'delve_push' : 'delve_work', delveLayer: mode === 'push' ? undefined : layer, progress: 0 };
  return null;
}

export function delveGasPaused(s: GameState): boolean {
  return (s.delve.gasUntil ?? 0) > s.clock;
}

function delveTarget(s: GameState, actionId: string, selected?: number): { layer: number; mode: DelveMode } {
  if (delveGasPaused(s)) return { layer: s.delve.gasLayer ?? Math.max(1, s.delve.deepest - 2), mode: 'work' };
  return actionId === 'delve_push' ? { layer: s.delve.deepest + 1, mode: 'push' } :
    { layer: selected ?? s.delve.deepest, mode: 'work' };
}

export function delveActionSpec(s: GameState, base: SkillAction): SkillAction {
  if (!isDelveAction(base.id)) return base;
  const { layer, mode } = delveTarget(s, base.id, s.action?.kind === 'skill' ? s.action.delveLayer : undefined);
  const band = delveBand(layer);
  const traits = delveTraitsAt(s.delve, layer);
  const cover = installationCovers(s.delve, 'flood', layer);
  const wetFace = mode === 'push' && (s.delve.layers[s.delve.deepest]?.floodedUntil ?? 0) > s.clock &&
    !installationCovers(s.delve, 'flood', s.delve.deepest);
  const flooded = (!cover && (s.delve.layers[layer]?.floodedUntil ?? 0) > s.clock) || wetFace;
  const slow = flooded ? 2 : mode === 'work' && traits.includes('flooded') && !cover ? 1.25 : 1;
  const workTime = layer >= WORLDROOT_DEPTH ? 9000 : band.ms;
  const rawXp = layer >= WORLDROOT_DEPTH ? 130 : band.xp;
  return {
    ...base,
    intervalMs: slow * (mode === 'push' ? delvePushTime(layer, s.delve.pickTier) : workTime),
    xp: rawXp * SKILL_XP_SCALE * (mode === 'push' ? 3 : 1),
    mastery: actionDef(band.masteryAction).mastery,
  };
}

function logDelve(s: GameState, ctx: Ctx, layer: number, text: string, fromDepth = s.delve.deepest): void {
  const delve = s.delve;
  delve.log.push(text);
  if (delve.log.length > LOG_LIMIT) delve.log.shift();
  if (ctx.offline) {
    delve.replay.push({ layer, text, fromDepth, revealedDepth: delve.deepest });
    if (delve.replay.length > LOG_LIMIT) delve.replay.shift();
  }
}

function give(s: GameState, out: Record<string, number>, id: string, n = 1): void {
  const added = addBank(s, id, n);
  if (added > 0) out[id] = (out[id] ?? 0) + added;
}

function applyHazard(s: GameState, ctx: Ctx, layer: number, hazard: DelveHazard): void {
  if (installationCovers(s.delve, hazard, layer)) return;
  if (hazard === 'cave-in') {
    const { mine_support, rubble } = spendAvailableSupports(s, 2 + Math.floor(layer / 50));
    const losses = [
      mine_support && `${mine_support} ${mine_support === 1 ? 'support' : 'supports'}`,
      rubble && `${rubble} rubble`,
    ].filter(Boolean).join(' and ');
    logDelve(s, ctx, layer, `Cave-in at layer ${layer}.${losses ? ` Lost ${losses}.` : ''}`);
  } else if (hazard === 'flood') {
    s.delve.layers[layer].floodedUntil = s.clock + FLOOD_MS;
    logDelve(s, ctx, layer, `Flood at layer ${layer}. Water will slow work for 30 minutes.`);
  } else if (!delveGasPaused(s)) {
    s.delve.gasUntil = s.clock + GAS_MS;
    s.delve.gasLayer = Math.max(1, layer - 2);
    logDelve(s, ctx, layer, `Gas at layer ${layer}. Fell back to layer ${s.delve.gasLayer} for 10 minutes.`);
  }
}

function workLayer(s: GameState, ctx: Ctx, a: SkillAction, layer: number, out: Record<string, number>, copies: number): void {
  const band = delveBand(layer);
  const traits = delveTraitsAt(s.delve, layer);
  const tree = skillTreeStats(s);
  const secured = s.delve.layers[layer].secure >= DELVE_SECURITY;
  const motherlode = traits.includes('motherlode');
  const fossil = traits.includes('fossil');
  if (!fossil || chance(ctx.rng, 0.5)) {
    let ore = copies * (motherlode ? 3 : traits.includes('rich') ? 2 : 1) * (tree.motherlode ? 2 : 1);
    ore += stochasticRound(ctx.rng, ore * (astrologyYield(s, 'mining') / 100 + (secured ? 0.1 : 0)));
    ore += stochasticRound(ctx.rng, masteryYield(s, a.mastery));
    give(s, out, band.ore, ore);
    s.lifetime.gathered += ore;
  }
  give(s, out, 'rubble', DELVE_RUBBLE_PER_WORK * copies);
  const fragment = motherlode ? 0.10 : 0.025;
  if (layer >= 90 && chance(ctx.rng, fragment)) give(s, out, 'mineral_fragment', copies);
  if (layer >= 135 && chance(ctx.rng, fragment)) give(s, out, 'stone_fragment', copies);
  const crystal = traits.includes('crystal');
  const roughChance = (crystal ? 0.25 : 0) + (motherlode ? 0.10 : 0);
  if (roughChance && chance(ctx.rng, roughChance * (1 + (tree.gemChance ?? 0) / 100))) give(s, out, rollDelveRough(ctx.rng, traits, false, starStoneChance(s)), copies);
  if (crystal && chance(ctx.rng, 0.04)) give(s, out, 'crystal_shard', copies);
  if (fossil) for (const id of MINING_FOSSILS) {
    if (chance(ctx.rng, 0.0167 * (1 + (tree.fossilChance ?? 0) / 100))) give(s, out, id, copies);
  }
  if (chance(ctx.rng, SHARD_CHANCE)) give(s, out, SHARD_FOR.mining!, copies);
  for (const perk of unlockedMilestones(s, a.mastery)) {
    const id = perk.kind === 'vein_strike' ? band.ore : perk.kind === 'rare_find' ? perk.outputId : undefined;
    if (id && chance(ctx.rng, perk.value)) {
      give(s, out, id);
      ctx.emit({ t: 'masteryProc', proc: perk.name, text: `✦ ${perk.name}! Extra mineral find`, taskName: a.mastery!.name });
    }
  }
}

function openCavern(s: GameState, ctx: Ctx, layer: number, out: Record<string, number>, copies: number): void {
  const band = delveBand(layer);
  const ore = rInt(ctx.rng, 3, 8) * copies;
  const rough = rInt(ctx.rng, 1, 3);
  const traits = delveTraitsAt(s.delve, layer);
  give(s, out, band.ore, ore);
  for (let find = 0; find < rough; find++) give(s, out, rollDelveRough(ctx.rng, traits, true, starStoneChance(s)), copies);
  s.lifetime.gathered += ore;
  const heartstoneChance = Math.min(1, 0.10 + Math.max(0, Math.floor((layer - WORLDROOT_DEPTH) / 50)) * 0.05);
  const heartstone = layer >= 135 && chance(ctx.rng, heartstoneChance);
  if (heartstone) give(s, out, 'heartstone', copies);
  const lantern = rollCollectible(s, ctx, 'mining', 'delve');
  s.delve.stats.caverns++;
  logDelve(s, ctx, layer, `Cavern at layer ${layer}. ${ore} ${band.name} ore, ${rough * copies} rough gems${heartstone ? `, ${copies} Heartstone` : ''}${lantern ? ', a lost miner’s lantern' : ''}.`);
}

function breakthrough(s: GameState, ctx: Ctx, layer: number, traits: DelveTrait[], out: Record<string, number>, copies: number): void {
  const delve = s.delve;
  payCost(s, delvePushPayment(s, layer));
  delve.deepest = layer;
  delve.layers[layer] = { traits, secure: 0 };
  if (traits.includes('motherlode')) delve.stats.motherlodes++;
  const names = DELVE_TRAITS.filter((t) => traits.includes(t.id)).map((t) => t.name);
  logDelve(s, ctx, layer, `Broke through to layer ${layer}${names.length ? ` (${names.join(', ')})` : ''}.`, layer - 1);
  if (layer === WORLDROOT_DEPTH) {
    delve.landmarkPending = true;
    logDelve(s, ctx, layer, 'Discovered the Worldroot Chamber.');
  }
  if (traits.includes('unstable') && chance(ctx.rng, delve.pickTier >= 6 ? 0.10 : 0.05)) openCavern(s, ctx, layer, out, copies);
}

function scheduleWarning(s: GameState, ctx: Ctx, actionId: string, layer: number, mode: DelveMode): void {
  const delve = s.delve;
  if (ctx.offline || delveHazardChance(delve, layer, mode) === 0 || (mode === 'push' && delve.bracedPush === layer)) {
    delete delve.warning;
    delete delve.nextWarning;
    return;
  }
  const current = delve.warning;
  if (current && current.action === actionId && current.layer === layer) {
    if (s.clock - current.startsAt <= current.timerMs + BRACE_GRACE_MS) return;
    delete delve.warning;
    // Ignoring a warning leaves the hazard roll intact without cutting earned Focus short.
    delve.lastBrace = { result: 'miss', at: s.clock };
  } else if (current) delete delve.warning;
  // Warning timing must not change the sequence of rewards or hazards for a player who leaves the mine idle.
  const rng = seeded(delve.seed ^ Math.floor(s.clock));
  if (delve.nextWarning == null) {
    delve.nextWarning = s.clock + (mode === 'push' ? rInt(rng, 8000, 15000) : rInt(rng, 30000, 60000));
  } else if (s.clock >= delve.nextWarning) {
    const hazard = chooseHazard(rng, delveTraitsAt(delve, layer));
    delve.warning = { hazard, startsAt: s.clock, timerMs: delve.pickTier >= 2 ? 4000 : 3000, action: actionId, layer };
    delete delve.nextWarning;
  }
}

export function braceDelve(s: GameState, ctx: Ctx, hazard: DelveHazard): SwingResult | null {
  const action = s.action;
  const warning = s.delve.warning;
  if (ctx.offline || !warning || action?.kind !== 'skill' || action.actionId !== warning.action) return null;
  const { layer, mode } = delveTarget(s, action.actionId, action.delveLayer);
  if (layer !== warning.layer) return null;
  const correct = hazard === warning.hazard;
  const result = braceResult(correct, s.clock - warning.startsAt, warning.timerMs);
  delete s.delve.warning;
  minigameSwing(s, result);
  s.delve.lastBrace = { result, at: s.clock };
  if (!correct) spendAvailableSupports(s, 1);
  if (result === 'hit' || result === 'double') {
    s.delve.focusHoldUntil = s.clock + DELVE_FOCUS_HOLD_MS;
    if (mode === 'push') s.delve.bracedPush = layer;
    else {
      const worked = s.delve.layers[layer];
      worked.secure = Math.min(DELVE_SECURITY, worked.secure + 1);
      if (worked.secure === DELVE_SECURITY) logDelve(s, ctx, layer, `Layer ${layer} is now Secured.`);
    }
  }
  return result;
}

export function delveStep(s: GameState, ctx: Ctx, dt: number, d: Derived): void {
  let action = s.action;
  if (action?.kind !== 'skill' || !isDelveAction(action.actionId)) return;
  if (isClassic(s)) {
    ctx.emit({ t: 'info', text: CLASSIC_BLOCK, tone: 'warn' });
    s.action = null;
    return;
  }
  if (ctx.offline) {
    clearWarning(s.delve);
    delete s.delve.focusHoldUntil;
  }
  const tree = skillTreeStats(s);
  const overtime = ctx.offline ? 1 + ((tree.offlineSpeed ?? 0) + astrologyOffline(s)) / 100 : 1;
  const decayMs = Math.min(dt, Math.max(0, s.clock - (s.delve.focusHoldUntil ?? 0)));
  focusStep(s, ctx, decayMs);
  action.progress += dt * overtime * focusMult(s) * (ctx.event?.gatheringSpeed ?? 1);
  while (action?.kind === 'skill' && isDelveAction(action.actionId)) {
    const { layer, mode } = delveTarget(s, action.actionId, action.delveLayer);
    if (mode === 'push') {
      const blocker = delvePushBlocker(s);
      if (blocker) {
        ctx.emit({ t: 'info', text: `Push paused. ${blocker}. Working layer ${s.delve.deepest}.`, tone: 'warn' });
        startDelve(s, ctx, 'work');
        return;
      }
    } else if (!s.delve.layers[layer]) {
      startDelve(s, ctx, 'work');
      return;
    }
    const a = delveActionSpec(s, actionDef(action.actionId));
    const interval = actionIntervalMs(s, actionDef(action.actionId), d);
    scheduleWarning(s, ctx, action.actionId, layer, mode);
    if (action.progress < interval) return;
    action.progress -= interval;
    const copies = takeDouble(s, ctx) ? 2 : 1;
    const out: Record<string, number> = {};
    const traits = delveTraitsAt(s.delve, layer);
    const blockedHazard = mode === 'push' && s.delve.bracedPush === layer;
    if (mode === 'push') {
      breakthrough(s, ctx, layer, traits, out, copies);
      clearWarning(s.delve);
    } else workLayer(s, ctx, a, layer, out, copies);
    if (!blockedHazard && chance(ctx.rng, delveHazardChance(s.delve, layer, mode))) {
      applyHazard(s, ctx, layer, chooseHazard(ctx.rng, traits));
    }
    ctx.emit({ t: 'produce', skill: 'mining', outputs: out });
    grantXp(s, ctx, 'mining', a.xp * (1 + (d.skillXp + (tree.skillXp ?? 0) + astrologyXp(s)) / 100));
    grantMasteryPractice(s, a.mastery, a.intervalMs / 1000);
    awardProfessionProgress(s, 'mining', 1);
    action = s.action;
  }
}

const LEGACY_LAYERS: Record<string, string> = {
  mine_scorched: 'copper', mine_frigid: 'copper', mine_storm: 'iron', mine_jagged: 'iron',
  mine_gem: 'iron', mine_cliffside: 'iron', mine_grotto: 'mithril',
  ...Object.fromEntries(DELVE_BANDS.flatMap((band) => ['', 'rich_', 'crystal_', 'fossil_'].map((mode) => [`mine_${mode}${band.id}`, band.id]))),
};

function legacyDelveState(raw: Record<string, unknown>): DelveState {
  const character = raw.character as { id?: string; name?: string; createdAt?: number } | undefined;
  const identity = character?.id ?? `${character?.name ?? ''}:${character?.createdAt ?? 0}`;
  const seed = Array.from(identity).reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261);
  const delve = newDelveState(seed);
  const level = levelOf('mining', (raw.skills as Record<string, number> | undefined)?.mining ?? 0);
  delve.deepest = [...DELVE_BANDS].reverse().find((band) => band.level <= level)!.firstLayer;
  for (let layer = 2; layer <= delve.deepest; layer++) {
    const traits = delveTraitsAt(delve, layer);
    delve.layers[layer] = { traits, secure: 0 };
    if (traits.includes('motherlode')) delve.stats.motherlodes++;
  }
  return delve;
}

export function migrateDelve(raw: Record<string, unknown>): void {
  const delve = (raw.delve ??= legacyDelveState(raw)) as DelveState;
  const mastery = raw.skillingMastery as Record<string, number> | undefined;
  if (mastery) for (const [action, metal] of Object.entries(LEGACY_LAYERS)) {
    const xp = mastery[`task.${action}`];
    if (Number.isFinite(xp) && xp > 0) {
      const key = `task.delve_${metal}`;
      mastery[key] = Math.max(mastery[key] ?? 0, xp);
      delete mastery[`task.${action}`];
    }
  }
  const action = raw.action as { kind?: string; actionId?: string; progress?: number } | undefined;
  const metal = action?.actionId && LEGACY_LAYERS[action.actionId];
  if (action?.kind === 'skill' && metal) {
    const layer = DELVE_BANDS.find((band) => band.id === metal)!.firstLayer;
    const progress = Number.isFinite(action.progress) ? Math.max(0, action.progress!) : 0;
    raw.action = { kind: 'skill', actionId: 'delve_work', delveLayer: Math.min(layer, delve.deepest), progress };
  }
}
