import { classDef } from '../data/classes';
import { PASSIVE_BY_ID, PASSIVE_NODES, type MasteryOption, type PassiveNode } from '../data/passiveTree';
import { ZONES } from '../data/zones';
import { characterLevel } from './character';
import type { Ctx } from './context';
import type { GameState } from './types';

export type PassivePointPool = 'travelPoints' | 'passivePoints' | 'masteryPoints';

const GATEWAY_STAT_PAIRS: Record<string, string> = {
  gatewaySolar: 'gatewayLunar', gatewayLunar: 'gatewaySolar',
  gatewayAstral: 'gatewayVoid', gatewayVoid: 'gatewayAstral',
  gatewayPrimal: 'gatewayDivine', gatewayDivine: 'gatewayPrimal',
};

function gatewayStat(node: PassiveNode): string | undefined {
  return Object.keys(node.stats).find((key) => key.startsWith('gateway') && (node.stats as Record<string, number | undefined>)[key]);
}

export function isCosmicGateway(node: PassiveNode): boolean {
  return node.kind === 'gateway' || !!node.gatewayPair || !!gatewayStat(node) || /(?:cosmic[_ -]?)?gateway/i.test(`${node.id} ${node.name}`);
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

export function isDoomed(node: PassiveNode): boolean {
  return node.kind === 'doomed' || node.id.startsWith('doomed_') || Object.keys(node.stats).some((key) => key.startsWith('doomed'));
}

export function passiveNodeCost(node: PassiveNode): { pool: PassivePointPool; cost: number } {
  if (isCosmicGateway(node)) return { pool: 'travelPoints', cost: 4 };
  if (node.kind === 'travel' || node.kind === 'highway') return { pool: 'travelPoints', cost: 1 };
  if (node.kind === 'mastery') return { pool: 'masteryPoints', cost: 1 };
  if (isDoomed(node)) return { pool: 'passivePoints', cost: 5 };
  if (node.kind === 'keystone' && node.region === 'forbidden') return { pool: 'passivePoints', cost: 15 };
  if (node.kind === 'small') return { pool: 'passivePoints', cost: 1 };
  if (node.kind === 'large') return { pool: 'passivePoints', cost: 2 };
  if (node.kind === 'notable') return { pool: 'passivePoints', cost: 3 };
  // Ordinary keystones are not the separately priced Forbidden keystone tier.
  return { pool: 'passivePoints', cost: 1 };
}

function spentPoints(s: Pick<GameState, 'passives'>): Record<PassivePointPool, number> {
  const spent = { travelPoints: 0, passivePoints: 0, masteryPoints: 0 };
  for (const id of s.passives) {
    const node = PASSIVE_BY_ID[id];
    if (!node) continue;
    const price = passiveNodeCost(node);
    spent[price.pool] += price.cost;
  }
  return spent;
}

function actQuestPoints(s: Pick<GameState, 'bossesDefeated'>): number {
  return ZONES.filter((zone) => zone.actBoss && s.bossesDefeated.includes(zone.id)).length;
}

/** Credit level and Act-boss awards. Missing checkpoints identify a pre-economy save. */
export function settlePassivePoints(s: GameState): void {
  const level = characterLevel(s);
  const quests = actQuestPoints(s);
  if (!Number.isFinite(s.passivePointLevel) || !Number.isFinite(s.passiveQuestPoints)) {
    const spent = spentPoints(s);
    s.travelPoints = Math.max(0, level * 3 - spent.travelPoints);
    s.passivePoints = Math.max(0, level * 2 + quests - spent.passivePoints);
    s.masteryPoints = Math.max(0, Math.min(20, Math.floor(level / 5)) - spent.masteryPoints);
    s.passivePointLevel = level;
    s.passiveQuestPoints = quests;
    return;
  }
  const gained = Math.max(0, level - s.passivePointLevel);
  if (gained) {
    s.travelPoints += gained * 3;
    s.passivePoints += gained * 2;
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
  return s.travelPoints + s.passivePoints + s.masteryPoints + spent.travelPoints + spent.passivePoints + spent.masteryPoints;
}

export function pointsLeft(s: GameState): number {
  settlePassivePoints(s);
  return s.travelPoints + s.passivePoints + s.masteryPoints;
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
  if (!isPassiveReachable(new Set(s.passives), id, startNode(s))) return 'Must connect to an allocated node or activated Cosmic Gateway';
  settlePassivePoints(s);
  const { pool, cost } = passiveNodeCost(node);
  if (s[pool] < cost) {
    const label = pool === 'travelPoints' ? 'travel' : pool === 'masteryPoints' ? 'mastery' : 'passive';
    return `Requires ${cost} ${label} point${cost === 1 ? '' : 's'}`;
  }
  if (node.kind === 'mastery' && !s.passives.some((other) => PASSIVE_BY_ID[other]?.cluster === node.cluster && PASSIVE_BY_ID[other]?.kind === 'notable')) {
    return 'Requires an allocated Notable in this cluster';
  }
  return null;
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
  if ((s.account.bank.regret ?? 0) < 1) return 'Requires an Orb of Regret';
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
  s.account.bank.regret -= 1;
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
  if ((s.account.bank.regret ?? 0) < 1) return 'Requires an Orb of Regret';
  s.account.bank.regret -= 1;
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
