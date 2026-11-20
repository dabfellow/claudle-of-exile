import { perkTotals } from '../data/achievements';
import { classDef } from '../data/classes';
import { PASSIVE_BY_ID, PASSIVE_NODES, type MasteryOption, type PassiveNode } from '../data/passiveTree';
import { characterLevel } from './character';
import type { Ctx } from './context';
import { MAX_FORBIDDEN_ALLOWANCE, forbiddenAllowance } from './pinnacles';
import type { GameState } from './types';

export type PassivePointPool = 'passivePoints' | 'masteryPoints';

/** Two Passive Points per character level; every ordinary node costs one. */
export const PASSIVE_POINTS_PER_LEVEL = 2;

const GATEWAY_STAT_PAIRS: Record<string, string> = {
  gatewaySolar: 'gatewayLunar', gatewayLunar: 'gatewaySolar',
  gatewayAstral: 'gatewayVoid', gatewayVoid: 'gatewayAstral',
  gatewayPrimal: 'gatewayDivine', gatewayDivine: 'gatewayPrimal',
};

function gatewayStat(node: PassiveNode): string | undefined {
  return Object.keys(node.stats).find((key) => key.startsWith('gateway') && (node.stats as Record<string, number | undefined>)[key]);
}

export function isCosmicGateway(node: PassiveNode): boolean {
  return node.kind === 'gateway' || !!node.gatewayPair || !!gatewayStat(node);
}

/** Resolve explicit gateway metadata first, then the six named conduit pairs used by the tree. */
export function pairedGateway(id: string): string | undefined {
  const node = PASSIVE_BY_ID[id];
  if (!node || !isCosmicGateway(node)) return undefined;
  if (node.gatewayPair && PASSIVE_BY_ID[node.gatewayPair]) return node.gatewayPair;
  const stat = gatewayStat(node);
  if (stat) {
    const same = PASSIVE_NODES.find((n) => n.id !== id && gatewayStat(n) === stat);
    if (same) return same.id;
    const pairedStat = GATEWAY_STAT_PAIRS[stat];
    const paired = pairedStat && PASSIVE_NODES.find((n) => gatewayStat(n) === pairedStat);
    if (paired) return paired.id;
  }
  return undefined;
}

/** The twelve Forbidden keystones on the rim: the tree allows one at a time, two while The Second Heresy is worn. */
export function isForbidden(node: PassiveNode): boolean {
  return node.kind === 'keystone' && node.region === 'forbidden';
}

export function isDoomed(node: PassiveNode): boolean {
  return node.kind === 'doomed' || node.id.startsWith('doomed_') || Object.keys(node.stats).some((key) => key.startsWith('doomed'));
}

export function passiveNodeCost(node: PassiveNode): { pool: PassivePointPool; cost: number } {
  if (isCosmicGateway(node)) return { pool: 'passivePoints', cost: 4 };
  if (node.kind === 'mastery') return { pool: 'masteryPoints', cost: 1 };
  if (isDoomed(node)) return { pool: 'passivePoints', cost: 5 };
  if (node.kind === 'keystone' && node.region === 'forbidden') return { pool: 'passivePoints', cost: 15 };
  // Every ordinary node (roads, small, large, notable, keystone) costs one Passive Point.
  return { pool: 'passivePoints', cost: 1 };
}

export function spentPoints(s: Pick<GameState, 'passives'>): Record<PassivePointPool, number> {
  const spent = { passivePoints: 0, masteryPoints: 0 };
  for (const id of s.passives) {
    const node = PASSIVE_BY_ID[id];
    if (!node) continue;
    const price = passiveNodeCost(node);
    spent[price.pool] += price.cost;
  }
  return spent;
}

/** Keep the six earned boss awards stable when story chapters are split or rearranged. */
export const CAMPAIGN_PASSIVE_MILESTONES = ['sanctum', 'burningthrone', 'highaltar', 'giantsthrone', 'maelstrom', 'shatteredthrone'] as const;

/** Passive points from the established campaign milestones, plus those achievements grant. */
function actQuestPoints(s: Pick<GameState, 'bossesDefeated' | 'achievements'>): number {
  return CAMPAIGN_PASSIVE_MILESTONES.filter((id) => s.bossesDefeated.includes(id)).length + perkTotals(s.achievements ?? []).passivePoints;
}

/** Credit level and Act-boss awards. Missing checkpoints identify a pre-economy save. */
export function settlePassivePoints(s: GameState): void {
  if ((s as any).characterTreeOverhaul !== 2) {
    s.passives = [];
    s.masteries = {};
    s.passivePointLevel = null;
    s.passiveQuestPoints = null;
    if (s.passiveProfiles) {
      for (const p of s.passiveProfiles) {
        p.passives = [];
        p.masteries = {};
      }
    }
    (s as any).characterTreeOverhaul = 2;
  }
  const level = characterLevel(s);
  const quests = actQuestPoints(s);
  if (s.passivePointLevel === null || s.passiveQuestPoints === null || !Number.isFinite(s.passivePointLevel) || !Number.isFinite(s.passiveQuestPoints)) {
    const spent = spentPoints(s);
    s.passivePoints = Math.max(0, level * PASSIVE_POINTS_PER_LEVEL + quests - spent.passivePoints);
    s.masteryPoints = Math.max(0, Math.min(20, Math.floor(level / 5)) - spent.masteryPoints);
    s.passivePointLevel = level;
    s.passiveQuestPoints = quests;
    return;
  }
  const gained = Math.max(0, level - s.passivePointLevel);
  if (gained) {
    s.passivePoints += gained * PASSIVE_POINTS_PER_LEVEL;
    const before = Math.min(20, Math.floor(s.passivePointLevel / 5));
    const after = Math.min(20, Math.floor(level / 5));
    s.masteryPoints += Math.max(0, after - before);
    s.passivePointLevel = level;
  }
  if (quests > s.passiveQuestPoints) {
    s.passivePoints += quests - s.passiveQuestPoints;
    s.passiveQuestPoints = quests;
  }
}

/** Total unspent character-tree currency, retained for the existing navigation badge. */
export function totalPoints(s: GameState): number {
  settlePassivePoints(s);
  const spent = spentPoints(s);
  return s.passivePoints + s.masteryPoints + spent.passivePoints + spent.masteryPoints;
}

export function pointsLeft(s: GameState): number {
  settlePassivePoints(s);
  return s.passivePoints + s.masteryPoints;
}

export function startNode(s: GameState): string {
  return s.character.startNode ?? classDef(s.character.classId).startNode;
}

type Links = Record<string, { links: string[] }>;

function isReachable(byId: Links, allocated: Set<string>, id: string, start: string): boolean {
  return byId[id].links.some((l) => l === start || allocated.has(l));
}

function activatedGatewayEnds(allocated: Set<string>): Set<string> {
  const ends = new Set<string>();
  for (const id of allocated) {
    const pair = pairedGateway(id);
    if (pair) ends.add(pair);
  }
  return ends;
}

function isPassiveReachable(allocated: Set<string>, id: string, start: string): boolean {
  if (isReachable(PASSIVE_BY_ID, allocated, id, start)) return true;
  const ends = activatedGatewayEnds(allocated);
  return ends.has(id) || PASSIVE_BY_ID[id].links.some((link) => ends.has(link));
}

/** True if every allocated node (minus `without`) is still connected to the start. */
export function connectedWithout(allocated: string[], without: string, start: string, byId: Links = PASSIVE_BY_ID): boolean {
  const remaining = new Set(allocated.filter((x) => x !== without));
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const cur = queue.pop()!;
    for (const l of byId[cur].links) {
      if (remaining.has(l) && !seen.has(l)) {
        seen.add(l);
        queue.push(l);
      }
    }
  }
  return seen.size === remaining.size;
}

/** Connectivity for the character tree, where an allocated gateway opens its paired endpoint. */
function passiveConnectedWithout(allocated: string[], without: string, start: string): boolean {
  const remaining = new Set(allocated.filter((id) => id !== without));
  const reached = new Set<string>();
  const queue = [start];
  const visited = new Set(queue);
  while (queue.length) {
    const cur = queue.pop()!;
    for (const link of PASSIVE_BY_ID[cur]?.links ?? []) {
      if (remaining.has(link) && !visited.has(link)) {
        visited.add(link);
        reached.add(link);
        queue.push(link);
      }
    }
    if (remaining.has(cur) && isCosmicGateway(PASSIVE_BY_ID[cur])) {
      const pair = pairedGateway(cur);
      if (pair && !visited.has(pair)) {
        visited.add(pair);
        queue.push(pair);
      }
    }
  }
  return [...remaining].every((id) => reached.has(id));
}

/**
 * The character tree's roads can move between releases. On load, an allocation that names a node the tree
 * no longer has, or no longer joins up to its start, is refunded in full; one that still hangs together is kept.
 * The active tree's points are recounted from level by settlePassivePoints; saved profiles are simply emptied.
 */
export function settleTreeLayout(s: GameState): void {
  if (!s.character) return;
  const start = startNode(s);
  const broken = (ids: string[]) =>
    ids.some((id) => !PASSIVE_BY_ID[id]) ||
    !passiveConnectedWithout(ids, '', start) ||
    // more Forbidden keystones than any loadout can hold; the worn-item allowance is settled separately once gear is known
    ids.filter((id) => isForbidden(PASSIVE_BY_ID[id])).length > MAX_FORBIDDEN_ALLOWANCE;
  if (s.passives?.length && broken(s.passives)) {
    s.passives = [];
    s.masteries = {};
    s.passivePointLevel = null;
    s.passiveQuestPoints = null;
  }
  for (const p of s.passiveProfiles ?? []) {
    if (p.passives.length && broken(p.passives)) {
      p.passives = [];
      p.masteries = {};
    }
  }
}

export function forbiddenTaken(ids: string[]): number {
  return ids.filter((id) => PASSIVE_BY_ID[id] && isForbidden(PASSIVE_BY_ID[id])).length;
}

/** The allocated nodes that still join up to the start, walking allocated links and opened gateway ends. */
function connectedAllocation(allocated: string[], start: string): Set<string> {
  const remaining = new Set(allocated);
  const reached = new Set<string>();
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.pop()!;
    for (const link of PASSIVE_BY_ID[cur]?.links ?? []) {
      if (remaining.has(link) && !visited.has(link)) {
        visited.add(link);
        reached.add(link);
        queue.push(link);
      }
    }
    if (remaining.has(cur) && PASSIVE_BY_ID[cur] && isCosmicGateway(PASSIVE_BY_ID[cur])) {
      const pair = pairedGateway(cur);
      if (pair && !visited.has(pair)) {
        visited.add(pair);
        if (remaining.has(pair)) reached.add(pair);
        queue.push(pair);
      }
    }
  }
  return reached;
}

/**
 * The Second Heresy's allowance (docs/SKILLING_OVERHAUL_SPEC.md §6): after gear, load or profile changes, keep the
 * earliest allocated Forbidden keystones up to what the worn gear allows. Each excess keystone is removed and its
 * actual point cost refunded; anything only it held up is then refunded too, and unrelated valid nodes stay.
 * Returns the names of the refunded nodes.
 */
export function settleForbiddenAllowance(s: GameState, ctx?: Ctx): string[] {
  if (!s.character || !s.passives?.length) return [];
  const allowance = forbiddenAllowance(s);
  const forbidden = s.passives.filter((id) => PASSIVE_BY_ID[id] && isForbidden(PASSIVE_BY_ID[id]));
  if (forbidden.length <= allowance) return [];
  settlePassivePoints(s);
  const removed = new Set(forbidden.slice(allowance));
  let kept = s.passives.filter((id) => !removed.has(id));
  const linked = connectedAllocation(kept, startNode(s));
  for (const id of kept) if (!linked.has(id)) removed.add(id);
  kept = kept.filter((id) => !removed.has(id));
  // a mastery whose cluster lost its only Notable goes too
  for (const id of kept) {
    const node = PASSIVE_BY_ID[id];
    if (node?.kind === 'mastery' && !kept.some((other) => PASSIVE_BY_ID[other]?.cluster === node.cluster && PASSIVE_BY_ID[other]?.kind === 'notable')) removed.add(id);
  }
  const names: string[] = [];
  for (const id of s.passives) {
    if (!removed.has(id)) continue;
    const node = PASSIVE_BY_ID[id];
    if (node) {
      const price = passiveNodeCost(node);
      s[price.pool] += price.cost;
      names.push(node.name);
    }
    delete s.masteries[id];
  }
  s.passives = s.passives.filter((id) => !removed.has(id));
  ctx?.emit({ t: 'info', text: `Forbidden keystone allowance is ${allowance}: refunded ${names.join(', ')}`, tone: 'warn' });
  return names;
}

/** Generic "can I take this node" check shared by both trees. */
export function treeAllocateReason(byId: Links, allocated: string[], start: string, id: string, points: number): string | null {
  if (!byId[id] || id === start) return 'Invalid node';
  if (allocated.includes(id)) return 'Already allocated';
  if (points <= 0) return 'No points left';
  if (!isReachable(byId, new Set(allocated), id, start)) return 'Must connect to an allocated node';
  return null;
}

export function allocateReason(s: GameState, id: string): string | null {
  const node = PASSIVE_BY_ID[id];
  if (!node) return 'Invalid node';
  // other classes' starts seal off their areas, except to an Exile, who can walk through them
  if (node.kind === 'start' && (s.character.classId !== 'exile' || id === startNode(s))) return 'Invalid node';
  if (s.passives.includes(id)) return 'Already allocated';
  if (isForbidden(node) && forbiddenTaken(s.passives) >= forbiddenAllowance(s)) {
    return forbiddenAllowance(s) > 1 ? 'Only two Forbidden keystones can be taken, even with The Second Heresy' : 'Only one Forbidden keystone can be taken';
  }
  if (!isPassiveReachable(new Set(s.passives), id, startNode(s))) return 'Must connect to an allocated node or activated Cosmic Gateway';
  settlePassivePoints(s);
  const { pool, cost } = passiveNodeCost(node);
  if (s[pool] < cost) {
    const label = pool === 'masteryPoints' ? 'mastery' : 'passive';
    return `Requires ${cost} ${label} point${cost === 1 ? '' : 's'}`;
  }
  if (node.kind === 'mastery' && !s.passives.some((other) => PASSIVE_BY_ID[other]?.cluster === node.cluster && PASSIVE_BY_ID[other]?.kind === 'notable')) {
    return 'Requires an allocated Notable in this cluster';
  }
  return null;
}

/**
 * The shortest chain of nodes to buy, in order, that joins `target` to what is already owned (`s.passives`
 * plus `planned`, nodes the player has lined up but not yet bought). Each node in the result connects to the
 * ones before it, so they can be allocated one by one. A gateway on the way opens its paired end for free.
 * Masteries, keystones, Doomed Gates and other classes' starts are never walked through, only ended on, so a
 * route never takes a permanent debuff or a build-defining keystone the player didn't click.
 * Returns null when there is no way there.
 */
export function passiveRoute(s: GameState, target: string, planned: string[] = []): string[] | null {
  const goal = PASSIVE_BY_ID[target];
  if (!goal) return null;
  const start = startNode(s);
  const owned = new Set([...s.passives, ...planned]);
  if (target === start || owned.has(target)) return null;
  const exile = s.character.classId === 'exile';
  const passable = (id: string) => {
    const n = PASSIVE_BY_ID[id];
    if (!n || owned.has(id) || id === start) return false;
    if (n.kind === 'start') return exile;
    return n.kind !== 'mastery' && n.kind !== 'keystone' && !isDoomed(n);
  };
  const enterable = (id: string) => id === target || passable(id);

  // 0-1 search: buying a node costs one step, stepping through a gateway to its paired end costs nothing
  const parent = new Map<string, string | null>();
  const free = new Set<string>();
  const queue: string[] = [];
  const reach = (id: string) => {
    if (parent.has(id)) return;
    parent.set(id, null);
    free.add(id);
    queue.unshift(id);
  };
  reach(start);
  for (const id of owned) {
    reach(id);
    const pair = pairedGateway(id);
    if (pair) reach(pair);
  }
  if (free.has(target)) return [target];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === target) break;
    if (!free.has(cur)) {
      const pair = pairedGateway(cur);
      if (pair && !parent.has(pair)) {
        parent.set(pair, cur);
        free.add(pair);
        queue.unshift(pair);
      }
    }
    if (!free.has(cur) && !passable(cur)) continue;
    for (const link of PASSIVE_BY_ID[cur]?.links ?? []) {
      if (parent.has(link) || !enterable(link)) continue;
      parent.set(link, cur);
      queue.push(link);
    }
  }
  if (!parent.has(target)) return null;
  const route: string[] = [];
  for (let id: string | null = target; id !== null; id = parent.get(id) ?? null) {
    if (id === target || !free.has(id)) route.unshift(id);
  }
  return route;
}

/** What a list of nodes costs from each point pool. */
export function routeCost(ids: string[]): Record<PassivePointPool, number> {
  const cost = { passivePoints: 0, masteryPoints: 0 };
  for (const id of ids) {
    const node = PASSIVE_BY_ID[id];
    if (node) cost[passiveNodeCost(node).pool] += passiveNodeCost(node).cost;
  }
  return cost;
}

function masteryOptionKey(option: MasteryOption): string {
  return option.label.trim().toLocaleLowerCase();
}

function masteryChoiceUsed(s: GameState, id: string, choice: number): boolean {
  const option = PASSIVE_BY_ID[id]?.options?.[choice];
  if (!option) return false;
  const key = masteryOptionKey(option);
  return s.passives.some((other) => {
    if (other === id || PASSIVE_BY_ID[other]?.kind !== 'mastery') return false;
    const chosen = PASSIVE_BY_ID[other].options?.[s.masteries[other]];
    return !!chosen && masteryOptionKey(chosen) === key;
  });
}

/** Allocate a node. Masteries need the chosen option (0–2). */
export function allocate(s: GameState, ctx: Ctx, id: string, choice?: number): string | null {
  const reason = allocateReason(s, id);
  if (reason) return reason;
  const node = PASSIVE_BY_ID[id];
  if (node.kind === 'mastery') {
    if (choice === undefined || !node.options?.[choice]) return 'Choose a mastery bonus';
    if (masteryChoiceUsed(s, id, choice)) return 'That mastery option is already allocated elsewhere';
    s.masteries[id] = choice;
  }
  const price = passiveNodeCost(node);
  s[price.pool] -= price.cost;
  s.passives.push(id);
  ctx.emit({ t: 'allocate', nodeId: id });
  return null;
}

export function refundReason(s: GameState, id: string): string | null {
  if (!s.passives.includes(id)) return 'Not allocated';
  if ((s.storage.bank.regret ?? 0) < 1) return 'Requires an Orb of Regret';
  if (!passiveConnectedWithout(s.passives, id, startNode(s))) return 'Would disconnect other nodes';
  const remaining = s.passives.filter((other) => other !== id);
  if (remaining.some((other) => {
    const mastery = PASSIVE_BY_ID[other];
    return mastery?.kind === 'mastery' && !remaining.some((candidate) => PASSIVE_BY_ID[candidate]?.cluster === mastery.cluster && PASSIVE_BY_ID[candidate]?.kind === 'notable');
  })) return 'Would leave a mastery without an allocated Notable';
  return null;
}

export function refund(s: GameState, ctx: Ctx, id: string): string | null {
  const reason = refundReason(s, id);
  if (reason) return reason;
  s.storage.bank.regret -= 1;
  s.passives = s.passives.filter((x) => x !== id);
  const price = passiveNodeCost(PASSIVE_BY_ID[id]);
  s[price.pool] += price.cost;
  delete s.masteries[id];
  ctx.emit({ t: 'info', text: `Refunded ${PASSIVE_BY_ID[id].name}` });
  return null;
}

/** Swap an allocated mastery to a different bonus for one Orb of Regret. */
export function changeMastery(s: GameState, ctx: Ctx, id: string, choice: number): string | null {
  const node = PASSIVE_BY_ID[id];
  if (node?.kind !== 'mastery' || !s.passives.includes(id)) return 'Mastery not allocated';
  if (!node.options?.[choice]) return 'Invalid choice';
  if (s.masteries[id] === choice) return 'Already chosen';
  if (masteryChoiceUsed(s, id, choice)) return 'That mastery option is already allocated elsewhere';
  if ((s.storage.bank.regret ?? 0) < 1) return 'Requires an Orb of Regret';
  s.storage.bank.regret -= 1;
  s.masteries[id] = choice;
  ctx.emit({ t: 'info', text: `${node.name}: ${node.options[choice].label}` });
  return null;
}
export {
  TREE_PROFILE_IDS,
  type TreeProfileId,
  isProfileUnlocked,
  settleTreeProfiles,
  switchPassiveProfile,
  savePassiveProfile,
  switchAtlasProfile,
  saveAtlasProfile,
  switchSkillingProfile,
  saveSkillingProfile,
  switchLifeSkillsProfile,
  saveLifeSkillsProfile,
} from './treeProfiles';
