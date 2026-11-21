import {
  BOATS, FISHING_FLASK, FISHING_MEAL, FISHING_WATERS, LINES, REELS, RIGS,
  type FishingBait, type FishingBoat, type FishingLine, type FishingReel, type FishingRig,
} from '../data/fishing';
import { isClassic } from './challenge';
import { rollUniqueFlask, stashFlask } from './flasks';
import type { Rng } from './rng';
import type { AccountState, GameState } from './types';

// Wire the eventual hidden achievement here. No live achievement can open the port yet.
export const FISHING_ACHIEVEMENT: string | null = null;
const playtestCharacters = new WeakSet<GameState>();

export function enableFishingPlaytest(s: GameState): void {
  if (import.meta.env.DEV) playtestCharacters.add(s);
}

export type PortBuilding = 'boatyard' | 'tackle' | 'nursery' | 'smokehouse';
export type CatchKind = 'fish' | 'alternate' | 'legend';
type Tide = 'day' | 'dusk';

interface LandedFish {
  key: string;
  weight: number;
}

interface FishFight {
  kind: CatchKind;
  remaining: number;
  tension: number;
  slack: number;
  elapsed: number;
  saves: number;
}

interface Voyage {
  water: number;
  reach: number;
  hull: number;
  rig: FishingRig;
  boat: FishingBoat;
  line: FishingLine;
  reel: FishingReel;
  tide: Tide;
  casts: number;
  haul: LandedFish[];
  locker: LandedFish[];
  fight?: FishFight;
}

export interface FishingPort {
  revision: number;
  updatedAt: number;
  marks: number;
  bait: Record<FishingBait, number>;
  buildings: Record<PortBuilding, number>;
  workshop?: { building: PortBuilding; readyAt: number };
  nurseryAt?: number;
  servings: number;
  smokehouseStock: number;
  log: Record<string, { count: number; record: number }>;
  voyage?: Voyage;
  message: string;
}

export interface FishingInput {
  reel: boolean;
  steer: -1 | 0 | 1;
}

export const EMPTY_FISHING_INPUT: FishingInput = { reel: false, steer: 0 };
export const FISHING_STEP_MS = 50;
const LOCKER_CAPACITY = 2;
const REEL_IN_REACH = 2;
const MAX_CASTS = 3;
const BAIT_WAIT = 30_000;
const BUILD_WAIT = 20_000;

export function freshFishingPort(): FishingPort {
  return {
    revision: 0, updatedAt: 0, marks: 0, bait: { worm: 12, lure: 0, chum: 0 },
    buildings: { boatyard: 1, tackle: 0, nursery: 0, smokehouse: 0 }, servings: 0, smokehouseStock: 0, log: {},
    message: 'Your skiff is tied up at Saltmere. The Mudflat Shallows are within rowing distance.',
  };
}

export function fishingOpen(s: GameState): boolean {
  if (isClassic(s)) return false;
  return !!s.account.fishingUnlocked || (import.meta.env.DEV && playtestCharacters.has(s));
}

export function settleFishingUnlock(s: GameState, newlyEarned: readonly string[], achievement: string | null = FISHING_ACHIEVEMENT): void {
  // Imported characters can carry achievement history. Entry belongs to the realm where it was awarded.
  if (!isClassic(s) && achievement && newlyEarned.includes(achievement)) s.account.fishingUnlocked = true;
}

/** The whole port is one snapshot. An older copy can't add its haul to a settled voyage. */
export function mergeFishingPort(target: AccountState, source: AccountState): void {
  if (target.realm !== source.realm) return;
  target.fishingUnlocked ||= source.fishingUnlocked;
  const local = target.fishing;
  const remote = source.fishing;
  if (remote && (!local || remote.revision > local.revision ||
    (remote.revision === local.revision && remote.updatedAt > local.updatedAt))) {
    target.fishing = structuredClone(remote);
  }
}

function touch(port: FishingPort, now: number): void {
  port.revision++;
  port.updatedAt = Math.max(now, port.updatedAt);
}

function portFor(s: GameState): FishingPort | undefined {
  if (fishingOpen(s)) return s.account.fishing ??= freshFishingPort();
}

function settleJobs(port: FishingPort, now: number): void {
  if (port.workshop && now >= port.workshop.readyAt) {
    port.buildings[port.workshop.building]++;
    delete port.workshop;
    touch(port, now);
  }
  if (port.nurseryAt !== undefined && now >= port.nurseryAt) {
    port.bait.worm += 10;
    if (port.buildings.tackle) port.bait.lure += 5;
    if (port.buildings.tackle >= 2) port.bait.chum += 4;
    delete port.nurseryAt;
    touch(port, now);
  }
}

export function visitFishingPort(s: GameState, now: number): void {
  const port = portFor(s);
  if (port) settleJobs(port, now);
}

export function fishingTrophy(port: FishingPort, water: number): boolean {
  return !!port.log[`${water}:legend`];
}

export function hasFishingPrize(s: GameState, water: number): boolean {
  return fishingOpen(s) && !!s.account.fishing && fishingTrophy(s.account.fishing, water);
}

export function claimFishingFlask(s: GameState, rng: Rng): string | null {
  if (!hasFishingPrize(s, 4)) return 'This prize has not been earned in this realm.';
  if (s.fishingFlaskClaimed) return 'This character has already collected Bottomless Tide.';
  const replaced = s.flaskSlots[2];
  if (replaced) stashFlask(s, replaced);
  s.flaskSlots[2] = rollUniqueFlask(s, 100, rng, FISHING_FLASK);
  s.fishingFlaskClaimed = true;
  return null;
}

export function fishingRigAvailable(port: FishingPort, rig: FishingRig): boolean {
  if (rig === 'balanced') return true;
  if (rig === 'flexible') return port.buildings.tackle >= 1;
  if (rig === 'heavy') return port.buildings.tackle >= 2;
  return rig === 'tideglass' && fishingTrophy(port, 3);
}

export function fishingUpgradeCost(port: FishingPort, building: PortBuilding): number | null {
  const level = port.buildings[building];
  if (building === 'boatyard') return [null, 12, 24, 45, 75, null][level] ?? null;
  if (building === 'tackle') return [8, 30, null][level] ?? null;
  return level === 0 ? (building === 'nursery' ? 8 : 20) : null;
}

export function upgradeFishingBuilding(s: GameState, now: number, building: PortBuilding): string | null {
  const port = portFor(s);
  if (!port) return 'Fishing is coming soon.';
  settleJobs(port, now);
  const cost = fishingUpgradeCost(port, building);
  if (cost === null || port.workshop || port.voyage || port.marks < cost) return 'This workshop upgrade is unavailable.';
  port.marks -= cost;
  port.workshop = { building, readyAt: now + BUILD_WAIT };
  touch(port, now);
  return null;
}

export function orderFishingBait(s: GameState, now: number): string | null {
  const port = portFor(s);
  if (!port) return 'Fishing is coming soon.';
  settleJobs(port, now);
  if (!port.buildings.nursery || port.nurseryAt !== undefined) return 'The bait nursery is unavailable.';
  port.nurseryAt = now + BAIT_WAIT;
  touch(port, now);
  return null;
}

export function topUpSandworms(s: GameState, now: number): string | null {
  const port = portFor(s);
  if (!port || port.voyage) return 'Sandworms are available at the dock.';
  port.bait.worm = Math.max(6, port.bait.worm);
  touch(port, now);
  return null;
}

export function buyFishingBait(s: GameState, now: number, bait: Exclude<FishingBait, 'worm'>): string | null {
  const port = portFor(s);
  const cost = bait === 'lure' ? 2 : 4;
  if (!port || port.voyage || port.buildings.tackle < (bait === 'lure' ? 1 : 2) || port.marks < cost) return 'This bait is unavailable.';
  port.marks -= cost;
  port.bait[bait] += 4;
  touch(port, now);
  return null;
}

export function sailFishing(
  s: GameState, now: number, water: number, rig: FishingRig, tide: Tide,
  boat: FishingBoat = water >= 4 ? 'trawler' : water >= 2 ? 'cutter' : 'skiff',
  line: FishingLine = 'braided', reel: FishingReel = 'hand',
): string | null {
  const port = portFor(s);
  if (!port) return 'Fishing is coming soon.';
  settleJobs(port, now);
  if (port.voyage || !FISHING_WATERS[water] || water >= port.buildings.boatyard || !fishingRigAvailable(port, rig)) return 'That voyage is unavailable.';
  if (BOATS[boat].level > port.buildings.boatyard || LINES[line].level > port.buildings.tackle || REELS[reel].level > port.buildings.tackle) {
    return 'That boat or tackle is unavailable.';
  }
  const hull = BOATS[boat].hull + (fishingTrophy(port, 1) ? 2 : 0);
  port.voyage = { water, reach: 0, hull, rig, boat, line, reel, tide, casts: 0, haul: [], locker: [] };
  port.message = 'Drop a line here, or sail closer to the outer water.';
  touch(port, now);
  return null;
}

function bankFishingHaul(port: FishingPort, haul: LandedFish[]): void {
  for (const fish of haul) {
    const [water, kind] = fish.key.split(':');
    const stock = FISHING_WATERS[Number(water)][kind as CatchKind];
    const entry = port.log[fish.key] ??= { count: 0, record: 0 };
    entry.count++;
    entry.record = Math.max(entry.record, fish.weight);
    port.marks += stock.value;
    if (water === '2') port.smokehouseStock++;
  }
}

function protectOrWreck(port: FishingPort, voyage: Voyage): void {
  if (voyage.hull > 0) return;
  bankFishingHaul(port, voyage.locker);
  port.message = voyage.locker.length
    ? 'The skiff went down. Your crew recovered the boat, tackle and locker. The rest of the haul is gone.'
    : 'The skiff went down. Your crew recovered the boat and tackle. The haul is gone.';
  delete port.voyage;
}

export function pushFishing(s: GameState, now: number): string | null {
  const port = portFor(s);
  const voyage = port?.voyage;
  if (!port || !voyage || voyage.fight || voyage.reach >= REEL_IN_REACH) return 'You cannot sail farther right now.';
  voyage.reach++;
  voyage.casts = 0;
  voyage.hull -= FISHING_WATERS[voyage.water].deep && voyage.tide === 'dusk' ? 2 : 1;
  port.message = 'You reached the next fishing ground. The crossing battered the hull.';
  protectOrWreck(port, voyage);
  touch(port, now);
  return null;
}

export function stowFishingCatch(s: GameState, now: number, index: number): string | null {
  const port = portFor(s);
  const voyage = port?.voyage;
  if (!port || !voyage || voyage.fight || FISHING_WATERS[voyage.water].deep ||
    voyage.locker.length >= LOCKER_CAPACITY || !Number.isInteger(index) || !voyage.haul[index]) return 'There is no space for that catch.';
  voyage.locker.push(...voyage.haul.splice(index, 1));
  touch(port, now);
  return null;
}

export function dockFishing(s: GameState, now: number): string | null {
  const port = portFor(s);
  const voyage = port?.voyage;
  if (!port || !voyage || voyage.fight) return 'Finish the fight before docking.';
  const haul = [...voyage.haul, ...voyage.locker];
  const newTrophies = haul.filter((f) => f.key.endsWith(':legend') && !port.log[f.key]);
  bankFishingHaul(port, haul);
  delete port.voyage;
  port.message = newTrophies.length
    ? `A legend came home. ${FISHING_WATERS[voyage.water].legend.prize}`
    : `Back at Saltmere with ${haul.length} fish.`;
  touch(port, now);
  return null;
}

export function castFishing(s: GameState, now: number, bait: FishingBait): string | null {
  const port = portFor(s);
  const voyage = port?.voyage;
  if (!port || !voyage || voyage.fight || voyage.casts >= MAX_CASTS || !(port.bait[bait] > 0)) return 'You cannot cast that bait here.';
  const water = FISHING_WATERS[voyage.water];
  const eligibleLegend = voyage.reach === REEL_IN_REACH && bait === water.legend.bait &&
    (!water.deep || voyage.tide === 'dusk');
  const kind: CatchKind = eligibleLegend ? 'legend' : bait === 'worm' ? 'fish' : 'alternate';
  port.bait[bait]--;
  voyage.casts++;
  voyage.fight = {
    kind, elapsed: 0, remaining: kind === 'legend' ? 100 : 66, tension: 36, slack: 0,
    saves: voyage.rig === 'tideglass' ? 2 : fishingTrophy(port, 0) ? 1 : 0,
  };
  port.message = `${water[kind].name} took the line!`;
  touch(port, now);
  return null;
}

export function fishingTell(voyage: Voyage, fight: FishFight) {
  const water = FISHING_WATERS[voyage.water];
  const secondPhase = fight.kind === 'legend' && fight.remaining <= 50;
  const pattern = secondPhase ? water.legend.final : water[fight.kind].pattern;
  const interval = secondPhase ? 1250 : 1700;
  const turn = Math.floor(fight.elapsed / interval);
  return {
    move: pattern[turn % pattern.length],
    next: pattern[(turn + 1) % pattern.length],
    tell: fight.elapsed % interval,
    secondPhase,
  };
}

/** One fixed foreground step. Saved elapsed time never advances while the page is hidden. */
export function stepFishing(s: GameState, now: number, input: FishingInput): boolean {
  if (!fishingOpen(s)) return false;
  const port = s.account.fishing;
  const voyage = port?.voyage;
  const fight = voyage?.fight;
  if (!port || !voyage || !fight) return false;
  const water = FISHING_WATERS[voyage.water];
  const fish = water[fight.kind];
  const { move, tell, secondPhase } = fishingTell(voyage, fight);
  const strain = tell < 470 ? 'rest' : move;
  const side = strain === 'left' ? 1 : strain === 'right' ? -1 : 0;
  const counter = side !== 0 && input.steer === side;
  const rig = RIGS[voyage.rig];
  const line = LINES[voyage.line];
  const reel = REELS[voyage.reel];
  const speed = fish.strength * rig.tension * line.tension * (secondPhase ? 1.23 : 1);
  const pull = strain === 'dive' ? 2.9 : side ? (counter ? 0.67 : input.steer ? 3.25 : 2.35) : 0;
  fight.tension = Math.max(0, fight.tension + (input.reel ? (0.55 + pull) * speed : pull * speed * 0.28 - 1.35));
  fight.slack = fight.tension < 10 ? fight.slack + FISHING_STEP_MS : Math.max(0, fight.slack - FISHING_STEP_MS);
  if (input.reel && fight.tension >= 12 && fight.tension <= 85) {
    const gain = strain === 'dive' ? (voyage.rig === 'heavy' ? 0.35 : 0.17) : side && !counter ? 0.27 : 0.78;
    fight.remaining -= gain * rig.pull * line.pull * reel.speed;
  }
  fight.elapsed += FISHING_STEP_MS;
  if (fight.tension >= 100 && fight.saves) {
    fight.saves--;
    fight.tension = 54;
    port.message = 'Your reel caught the line before it snapped.';
  } else if (fight.tension >= 100 || fight.slack >= 1400) {
    port.message = fight.tension >= 100 ? 'The line snapped. The fish got away.' : 'The line went slack. The fish got away.';
    delete voyage.fight;
    voyage.hull--;
    protectOrWreck(port, voyage);
  } else if (fight.remaining <= 0) {
    const weight = Math.round((fish.value * 0.68 + voyage.reach * 0.75 + 6000 / Math.max(3000, fight.elapsed)) * 10) / 10;
    voyage.haul.push({ key: `${voyage.water}:${fight.kind}`, weight });
    port.message = `${fish.name} landed · ${weight} kg. Dock to record the catch.`;
    delete voyage.fight;
  }
  touch(port, now);
  return true;
}

export function cookFishingFeast(s: GameState, now: number): string | null {
  const port = portFor(s);
  if (!port || port.voyage || !port.buildings.smokehouse || !fishingTrophy(port, 2) || port.marks < 15 || !port.smokehouseStock) {
    return 'The feast needs a smokehouse, a fish from Blackreed Creek and 15 Dock Marks.';
  }
  port.marks -= 15;
  port.smokehouseStock--;
  port.servings++;
  touch(port, now);
  return null;
}

export function eatFishingFeast(s: GameState, now: number): string | null {
  const port = portFor(s);
  if (!port || port.voyage || !port.servings) return 'There is no Crownfire Feast ready.';
  if (s.meal?.id === FISHING_MEAL) return 'You already have a Crownfire Feast active.';
  port.servings--;
  s.meal = { id: FISHING_MEAL, remainingMs: 900_000 };
  touch(port, now);
  return null;
}
