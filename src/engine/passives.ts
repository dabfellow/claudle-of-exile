import { classDef } from '../data/classes';
import { PASSIVE_BY_ID } from '../data/passiveTree';
import type { Ctx } from './context';
import type { GameState } from './types';
import { levelForXp } from './xp';

/** Two points at level 1, one more per Combat level. */
export function totalPoints(s: GameState): number {
  return levelForXp(s.skills.combat) + 1;
}

export function pointsLeft(s: GameState): number {
  return totalPoints(s) - s.passives.length;
}

export function startNode(s: GameState): string {
  return classDef(s.character.classId).startNode;
}

function isReachable(allocated: Set<string>, id: string, start: string): boolean {
  return PASSIVE_BY_ID[id].links.some((l) => l === start || allocated.has(l));
}

export function allocateReason(s: GameState, id: string): string | null {
  const node = PASSIVE_BY_ID[id];
  if (!node || node.kind === 'start') return 'Invalid node';
  if (s.passives.includes(id)) return 'Already allocated';
  if (pointsLeft(s) <= 0) return 'No passive points left';
  if (!isReachable(new Set(s.passives), id, startNode(s))) return 'Must connect to an allocated node';
  return null;
}

export function allocate(s: GameState, ctx: Ctx, id: string): string | null {
  const reason = allocateReason(s, id);
  if (reason) return reason;
  s.passives.push(id);
  ctx.emit({ t: 'allocate', nodeId: id });
  return null;
}

/** True if every allocated node (minus `without`) is still connected to the start. */
export function connectedWithout(allocated: string[], without: string, start: string): boolean {
  const remaining = new Set(allocated.filter((x) => x !== without));
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const cur = queue.pop()!;
    for (const l of PASSIVE_BY_ID[cur].links) {
      if (remaining.has(l) && !seen.has(l)) {
        seen.add(l);
        queue.push(l);
      }
    }
  }
  return seen.size === remaining.size;
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
  ctx.emit({ t: 'info', text: `Refunded ${PASSIVE_BY_ID[id].name}` });
  return null;
}
