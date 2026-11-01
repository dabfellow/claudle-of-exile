import { classDef } from '../data/classes';
import {
  ASCENDANCY_BOSS_ACTS,
  ASCENDANCY_BY_ID,
  ASCENDANCY_MAX_POINTS,
  ASCENDANCY_NODE_BY_ID,
  SWITCH_MATERIAL,
  SWITCH_MATERIAL_COST,
  TRIAL_SEAL,
  TRIALS,
  type AscendancyDef,
  type AscendancyId,
} from '../data/ascendancies';
import { ACT_PREVIEW, actOpen } from '../data/zones';
import type { Ctx } from './context';
import { connectedWithout, treeAllocateReason } from './passives';
import type { AscendancyRuntime, AscendancyState, GameState } from './types';

/**
 * Ascendancies (docs/design/ASCENDANCIES.md): the choice, the points and the node tree. What the rules do in a fight
 * lives with the mechanics they twist, in engine/mechanics.ts and engine/combat.ts.
 */

export function newAscendancyState(): AscendancyState {
  return { id: null, nodes: [], trials: 0, points: 0, carry: 0, hawk: { priority: 'none', order: 'closest' }, release: 'full' };
}

export function newAscendancyRuntime(): AscendancyRuntime {
  return { rampageMs: 0, rampageTotal: 0, holdMs: 0, hawkMs: 0, hawking: false, sureCrit: false, streak: 0, burnout: 0, burnoutRearmed: true, novas: 0, novaDamage: 0, dawn: false, fighting: false };
}

/** Everything waits for Act 3: dev builds, tests and the sim get it early, like preview acts. */
export function ascendancyOpen(): boolean {
  return actOpen(3) || ACT_PREVIEW.enabled;
}

/** The ascendancy in force, if any. */
export function ascendancyOf(s: GameState): AscendancyId | null {
  return ascendancyOpen() ? s.ascendancy.id : null;
}

/** Whether a node is taken. Rule checks in combat ask this with the node's id. */
export function hasAscNode(s: GameState, id: string): boolean {
  return ascendancyOpen() && s.ascendancy.nodes.includes(id);
}

/** Past the first trial, on a class that has ascendancies. The Exile never sees any of this. */
export function canAscend(s: GameState): boolean {
  return ascendancyOpen() && classDef(s.character.classId).mechanic !== null && s.ascendancy.trials >= 1;
}

export function choiceWaiting(s: GameState): boolean {
  return canAscend(s) && !s.ascendancy.id;
}

export function ascendancyPointsLeft(s: GameState): number {
  return s.ascendancy.points - s.ascendancy.nodes.length;
}

function addPoints(s: GameState, n: number): void {
  s.ascendancy.points = Math.min(ASCENDANCY_MAX_POINTS, s.ascendancy.points + n);
}

/** Pass a trial: it opens that trial's nodes and gives its points. */
export function passTrial(s: GameState, ctx: Ctx, n: 1 | 2 | 3): void {
  if (classDef(s.character.classId).mechanic === null || s.ascendancy.trials >= n) return;
  s.ascendancy.trials = n;
  addPoints(s, TRIALS.find((t) => t.n === n)?.points ?? 0);
  ctx.emit({ t: 'trialPassed', n });
}

/** The first kill of a boss: a trial's boss passes the trial, any other Act 3–6 boss gives a point once the choice is open. */
export function onBossFirstKill(s: GameState, ctx: Ctx, zoneId: string, act: number): void {
  const trial = TRIALS.find((t) => t.zoneId === zoneId);
  if (trial) passTrial(s, ctx, trial.n);
  else if (ASCENDANCY_BOSS_ACTS.includes(act) && s.ascendancy.trials >= 1) addPoints(s, 1);
}

export function chooseReason(s: GameState, id: AscendancyId): string | null {
  if (!canAscend(s)) return 'Pass the first trial';
  if (s.ascendancy.id) return 'You have already chosen';
  return ASCENDANCY_BY_ID[id]?.classId === s.character.classId ? null : 'Not for your class';
}

/** The first pick is free: the gate comes with it, so the character changes at once. */
export function chooseAscendancy(s: GameState, ctx: Ctx, id: AscendancyId): string | null {
  const reason = chooseReason(s, id);
  if (reason) return reason;
  s.ascendancy.id = id;
  ctx.emit({ t: 'info', text: `You ascend: ${ASCENDANCY_BY_ID[id].name}`, tone: 'good' });
  return null;
}

export function currentAscendancy(s: GameState): AscendancyDef | null {
  return s.ascendancy.id ? ASCENDANCY_BY_ID[s.ascendancy.id] : null;
}

/** Why a node can't be taken, or null. */
export function ascNodeReason(s: GameState, id: string): string | null {
  const a = currentAscendancy(s);
  const node = ASCENDANCY_NODE_BY_ID[id];
  if (!a || !a.nodes.includes(node) || node.kind === 'gate') return 'Invalid node';
  if (s.ascendancy.trials < node.trial) return TRIAL_SEAL[node.trial];
  return treeAllocateReason(ASCENDANCY_NODE_BY_ID, s.ascendancy.nodes, a.gate.id, id, ascendancyPointsLeft(s));
}

export function allocateAscNode(s: GameState, ctx: Ctx, id: string): string | null {
  const reason = ascNodeReason(s, id);
  if (reason) return reason;
  s.ascendancy.nodes.push(id);
  ctx.emit({ t: 'allocate', nodeId: id });
  return null;
}

export function refundAscReason(s: GameState, id: string): string | null {
  const a = currentAscendancy(s);
  if (!a || !s.ascendancy.nodes.includes(id)) return 'Not allocated';
  if ((s.account.bank.regret ?? 0) < 1) return 'Requires an Orb of Regret';
  return connectedWithout(s.ascendancy.nodes, id, a.gate.id, ASCENDANCY_NODE_BY_ID) ? null : 'Would disconnect other nodes';
}

export function refundAscNode(s: GameState, ctx: Ctx, id: string): string | null {
  const reason = refundAscReason(s, id);
  if (reason) return reason;
  s.account.bank.regret -= 1;
  s.ascendancy.nodes = s.ascendancy.nodes.filter((x) => x !== id);
  ctx.emit({ t: 'info', text: `Refunded ${ASCENDANCY_NODE_BY_ID[id].name}` });
  return null;
}

/** What a switch costs right now: the rare material, plus an Orb of Regret per node taken. */
export function switchCost(s: GameState): { material: number; regret: number } {
  return { material: SWITCH_MATERIAL_COST, regret: s.ascendancy.nodes.length };
}

export function switchReason(s: GameState, id: AscendancyId): string | null {
  const now = s.ascendancy.id;
  if (!canAscend(s) || !now) return 'Choose an ascendancy first';
  if (id === now) return 'Already your ascendancy';
  if (ASCENDANCY_BY_ID[id]?.classId !== s.character.classId) return 'Not for your class';
  const cost = switchCost(s);
  if ((s.account.bank[SWITCH_MATERIAL] ?? 0) < cost.material) return 'Requires a Divine Orb';
  return (s.account.bank.regret ?? 0) < cost.regret ? `Requires ${cost.regret} Orbs of Regret` : null;
}

/** Trade one ascendancy for the other. Every node comes back as a point to spend, and the gate swaps straight away. */
export function switchAscendancy(s: GameState, ctx: Ctx, id: AscendancyId): string | null {
  const reason = switchReason(s, id);
  if (reason) return reason;
  const cost = switchCost(s);
  s.account.bank[SWITCH_MATERIAL] -= cost.material;
  s.account.bank.regret = (s.account.bank.regret ?? 0) - cost.regret;
  s.ascendancy.id = id;
  s.ascendancy.nodes = [];
  s.ascendancy.carry = 0;
  if (s.combat) s.combat.asc = newAscendancyRuntime();
  ctx.emit({ t: 'info', text: `You turn to the ${ASCENDANCY_BY_ID[id].name}`, tone: 'good' });
  return null;
}
