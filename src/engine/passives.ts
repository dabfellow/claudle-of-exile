import { classDef } from '../data/classes';
import { PASSIVE_BY_ID } from '../data/passiveTree';
import { characterLevel } from './character';
import type { Ctx } from './context';
import type { GameState } from './types';

/** Two points at level 1, one more per character level. */
export function totalPoints(s: GameState): number {
  return characterLevel(s) + 1;
}

export function pointsLeft(s: GameState): number {
  return totalPoints(s) - s.passives.length;
}

export function startNode(s: GameState): string {
  return classDef(s.character.classId).startNode;
}

type Links = Record<string, { links: string[] }>;

function isReachable(byId: Links, allocated: Set<string>, id: string, start: string): boolean {
  return byId[id].links.some((l) => l === start || allocated.has(l));
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
  if (!node || node.kind === 'start') return 'Invalid node';
  return treeAllocateReason(PASSIVE_BY_ID, s.passives, startNode(s), id, pointsLeft(s));
}

/** Allocate a node. Masteries need the chosen option (0–2). */
export function allocate(s: GameState, ctx: Ctx, id: string, choice?: number): string | null {
  const reason = allocateReason(s, id);
  if (reason) return reason;
  const node = PASSIVE_BY_ID[id];
  if (node.kind === 'mastery') {
    if (choice === undefined || !node.options?.[choice]) return 'Choose a mastery bonus';
    s.masteries[id] = choice;
  }
  s.passives.push(id);
  ctx.emit({ t: 'allocate', nodeId: id });
  return null;
}

export function refundReason(s: GameState, id: string): string | null {
  if (!s.passives.includes(id)) return 'Not allocated';
  if ((s.bank.regret ?? 0) < 1) return 'Requires an Orb of Regret';
  if (!connectedWithout(s.passives, id, startNode(s))) return 'Would disconnect other nodes';
  return null;
}

export function refund(s: GameState, ctx: Ctx, id: string): string | null {
  const reason = refundReason(s, id);
  if (reason) return reason;
  s.bank.regret -= 1;
  s.passives = s.passives.filter((x) => x !== id);
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
  if ((s.bank.regret ?? 0) < 1) return 'Requires an Orb of Regret';
  s.bank.regret -= 1;
  s.masteries[id] = choice;
  ctx.emit({ t: 'info', text: `${node.name}: ${node.options[choice].label}` });
  return null;
}
