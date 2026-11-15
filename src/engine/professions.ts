import { ACTIONS, LEGACY_ACTION_PLACES } from '../data/skills';
import { SITES, findDigs } from '../data/expedition';
import { HEIST_JOBS } from '../data/heist';
import { RUNE_FAMILIES, RUNE_GRADES, runeDef } from '../data/runes';
import { professionProject, type ProfessionProject, type ProfessionRequirement } from '../data/professionProjects';
import { addBank, canAfford, payCost } from './bank';
import { CLASSIC_BLOCK, isClassic, realmOf } from './challenge';
import type { Ctx } from './context';
import { createItem, createUnique } from './items';
import { bagFull } from './storage';
import { grantMasteryPractice, masterySpeed } from './skillingMastery';
import { grantXp } from './skills';
import { isCraftLocked } from './crafting';
import { levelOf } from './xp';
import { addUniqueMaps } from './maps';
import { dishStats } from './cooking';
import { seeUnique } from './account';
import { newFlask, flaskStats, stashFlask } from './flasks';
import type { AccountState, GameEvent, GameState, Item, SkillId } from './types';

export interface ProjectRun {
  runId: number;
  realm: string;
  owner: string;
  project: ProfessionProject;
  elapsedMs: number;
  escrow: Record<string, number>;
  item?: Item;
  remaining: number;
  status: 'working' | 'ready' | 'return';
  stopReason?: string;
}

export interface ProfessionProgress {
  schema: 1;
  work: Partial<Record<SkillId, number>>;
  discoveries: Record<string, true>;
  counters: Record<string, number>;
  projects: Record<string, { completed: number }>;
  legacyAccess: Record<string, true>;
  nextRun: number;
  /** Monotonic committed/cancelled run watermark; notification summaries never authorize claims. */
  settledRun: number;
  /** Old character rows load before their separately saved realm bank/stash is attached. */
  legacyRealmEvidence?: boolean;
  activeProject?: ProjectRun;
}

export const newProfessionProgress = (): ProfessionProgress => ({
  schema: 1, work: {}, discoveries: {}, counters: { 'foraging.seedsMigrated': 1 }, projects: {}, legacyAccess: {}, nextRun: 1, settledRun: 0,
});

export function settleProfessionProgress(s: GameState, legacy = false): void {
  const fresh = newProfessionProgress();
  s.professionProgress = { ...fresh, ...s.professionProgress };
  const p = s.professionProgress;
  if (!legacy) return;
  // Preserve evidence as access, never invent completed cycles, XP or fragment rewards.
  for (const a of ACTIONS) {
    // New Woodcutting surveys did not exist in legacy saves; do not invent their access evidence.
    if ((a.skill === 'woodcutting' || a.skill === 'harvesting') && a.accomplishments?.length) continue;
    const place = LEGACY_ACTION_PLACES[a.id];
    if (levelOf(a.skill, s.skills[a.skill]) >= a.level && (!place.area || s.unlockedZones.includes(place.area)) && (!place.gate || s.unlockedZones.includes(place.gate.zone))) p.legacyAccess[a.id] = true;
  }
  for (const skill of ['smithing', 'alchemy'] as const) {
    const lvl = levelOf(skill, s.skills[skill]);
    for (const [n, req] of [[20, skill === 'smithing' ? 10 : 8], [60, skill === 'smithing' ? 22 : 18]]) {
      if (lvl >= req) p.legacyAccess[`${skill}_work_${n}`] = true;
    }
  }
  for (const j of HEIST_JOBS) if (j.area && s.unlockedZones.includes(j.area)) p.legacyAccess[`heist.${j.id}`] = true;
  for (const site of SITES) {
    const dug = s.expedition.dug[site.id] ?? 0;
    if (dug > 0) p.legacyAccess[site.id] = true;
    findDigs(site).forEach((n, i) => { if (dug >= n) p.discoveries[`expedition.${site.id}.${i}`] = true; });
  }
  if (s.greenhouse) {
    const plant = ACTIONS.find((a) => a.id === s.greenhouse!.actionId);
    const herb = Object.keys(plant?.outputs ?? {})[0];
    if (herb) p.discoveries[`seed_${herb}`] = true;
  }
  p.legacyRealmEvidence = true;
  carryRuneAccess(s, s.account);
}

function carryRuneAccess(s: GameState, account: AccountState): void {
  const ownedRunes = [...Object.entries(account.bank).filter(([, n]) => n > 0).map(([id]) => runeDef(id)?.grade.grade ?? 0),
    ...[...s.inventory, ...Object.values(s.equipment), ...account.stash.flat()].map((i) => i?.rune ? runeDef(i.rune)?.grade.grade ?? 0 : 0)];
  const highestGrade = Math.max(0, ...ownedRunes);
  for (const grade of RUNE_GRADES) if (grade.grade <= highestGrade || levelOf('runecarving', s.skills.runecarving) >= grade.level) s.professionProgress.legacyAccess[`runecarving_grade_${grade.grade}`] = true;
}

/** Finish migration once the real realm is available. Never replay awards or infer work totals. */
export function settleProfessionRealmEvidence(s: GameState, account: AccountState): void {
  if (!s.professionProgress.legacyRealmEvidence) return;
  carryRuneAccess(s, account);
  delete s.professionProgress.legacyRealmEvidence;
}

export function hasAccomplishment(s: GameState, id: string): boolean {
  const p = s.professionProgress;
  if (p.discoveries[id] || p.legacyAccess[id]) return true;
  const find = /^expedition\.(dig_\w+)\.(\d+)$/.exec(id);
  if (find) {
    const site = SITES.find((x) => x.id === find[1]);
    return !!site && (s.expedition.dug[site.id] ?? 0) >= (findDigs(site)[Number(find[2])] ?? Infinity);
  }
  const match = /^(\w+)_work_(\d+)$/.exec(id);
  if (match) return (p.work[match[1] as SkillId] ?? 0) >= Number(match[2]);
  const runeMatch = /^rune_(\w+)_grade_(\d+)_practice$/.exec(id);
  if (runeMatch) {
    const [, family, gradeStr] = runeMatch;
    const grade = Number(gradeStr);
    if (p.legacyAccess[id] || p.legacyAccess[`runecarving_grade_${grade + 1}`]) return true;
    return (p.counters[`rune.${family}.${grade}`] ?? 0) >= 10;
  }
  return false;
}

export function professionAccessReason(s: GameState, req: ProfessionRequirement): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  if (s.fallen) return 'This character has fallen';
  if (levelOf(req.skill, s.skills[req.skill]) < req.level) return `Requires ${req.skill} level ${req.level}`;
  const missing = req.accomplishments?.find((id) => !hasAccomplishment(s, id));
  if (missing) {
    const site = SITES.find((x) => missing === `expedition.${x.id}.0`);
    if (site) return `Requires the first discovery at ${site.name}`;
    const runeMatch = /^rune_(\w+)_grade_(\d+)_practice$/.exec(missing);
    if (runeMatch) {
      const [, family, gradeStr] = runeMatch;
      const grade = Number(gradeStr);
      const gName = RUNE_GRADES.find((g) => g.grade === grade)?.name ?? `Grade ${grade}`;
      const fName = RUNE_FAMILIES.find((f) => f.id === family)?.name ?? family;
      const done = s.professionProgress.counters[`rune.${family}.${grade}`] ?? 0;
      return `Requires 10 ${gName} ${fName} rune carves (${done}/10)`;
    }
    return `Requires ${missing.replaceAll('_', ' ')}`;
  }
  if (req.station && (s.account.hideout[req.station.id] ?? 1) < req.station.level) return `Requires ${req.station.id.replaceAll('_', ' ')} level ${req.station.level}`;
  return null;
}

export function awardProfessionProgress(s: GameState, skill: SkillId, cycles = 1): void {
  s.professionProgress.work[skill] = (s.professionProgress.work[skill] ?? 0) + cycles;
}

export function recordDiscovery(s: GameState, ctx: Ctx, id: string): boolean {
  if (s.professionProgress.discoveries[id]) return false;
  s.professionProgress.discoveries[id] = true;
  ctx.emit({ t: 'profession', category: 'discovery', id, amount: 1 });
  return true;
}

/** Player-facing names for saved discovery/project identifiers in return summaries. */
export function professionProgressLabel(id: string): string {
  const find = /^expedition\.(dig_\w+)\.(\d+)$/.exec(id);
  const site = find ? SITES.find((x) => x.id === find[1]) : undefined;
  if (site && site.finds[Number(find![2])]) return `${site.name}: ${site.finds[Number(find![2])]}`;
  if (id.startsWith('heist_clean_')) {
    const jobId = id.replace('heist_clean_', '');
    const job = HEIST_JOBS.find((j) => j.id === jobId);
    if (job) return `${job.name} (Clean Exit)`;
  }
  return professionProject(id)?.name ?? id.replaceAll('_', ' ');
}

/** Deterministic progress is called once per nominal cycle, outside ordinary/manual reward loops. */
export function awardProtectedProgress(s: GameState, ctx: Ctx, id: string, amount: number): void {
  addBank(s, id, amount);
  ctx.emit({ t: 'profession', category: 'progress', id, amount });
}

export function isEligibleProjectBase(def: ProfessionProject, item: Item, s: GameState): boolean {
  if (isCraftLocked(s, item.uid)) return false;
  if (def.baseNonUnique && item.rarity === 'unique') return false;
  if (def.baseId && item.baseId !== def.baseId) return false;
  if (def.baseIds && !def.baseIds.includes(item.baseId)) return false;
  if (def.baseMinIlvl && item.ilvl < def.baseMinIlvl) return false;
  return true;
}

export function projectPreview(s: GameState, id: string, uid?: number) {
  const def = professionProject(id);
  if (!def) return { project: undefined, reason: 'Unknown project', notes: [] };
  const needsBase = !!(def.baseId || def.baseIds);
  const eligibleItem = needsBase
    ? (uid != null ? s.inventory.find((i) => i.uid === uid && isEligibleProjectBase(def, i, s)) : s.inventory.find((i) => isEligibleProjectBase(def, i, s)))
    : undefined;
  const reason = professionAccessReason(s, def)
    ?? (s.professionProgress.activeProject ? 'Finish or cancel the current project first' : null)
    ?? (!def.repeatable && s.professionProgress.projects[id]?.completed ? 'Already completed' : null)
    ?? (!canAfford(s, def.inputs) ? 'Missing materials' : null)
    ?? (needsBase && !eligibleItem ? 'Choose an unlocked required base from your inventory' : null);
  const notes: string[] = [];
  if (needsBase) {
    notes.push('Consumes base completely: removes affixes, impression, and rune; creates unique with a new UID.');
  }
  return { project: def, reason, notes };
}

export function startProject(s: GameState, ctx: Ctx, id: string, repeats = 1, uid?: number): string | null {
  const preview = projectPreview(s, id, uid);
  if (preview.reason) return preview.reason;
  const def = preview.project!;
  if (!Number.isSafeInteger(repeats) || repeats < 1 || repeats > 100 || (!def.repeatable && repeats !== 1)) return 'Choose 1–100 repeats for a repeatable project';
  if (s.account.realm !== realmOf(s.character)) return 'Project belongs to a different realm';
  const needsBase = !!(def.baseId || def.baseIds);
  const item = needsBase
    ? (uid != null ? s.inventory.find((i) => i.uid === uid && isEligibleProjectBase(def, i, s)) : s.inventory.find((i) => isEligibleProjectBase(def, i, s)))
    : undefined;
  if (needsBase && !item) return 'Choose an unlocked required base from your inventory';
  const project = structuredClone(def);
  const escrow = { ...def.inputs };
  payCost(s, escrow);
  if (item) s.inventory.splice(s.inventory.indexOf(item), 1);
  const p = s.professionProgress;
  p.activeProject = { runId: p.nextRun++, realm: s.account.realm, owner: s.character.id, project, elapsedMs: 0, escrow, item, remaining: repeats, status: 'working' };
  s.action = { kind: 'project', runId: p.activeProject.runId };
  s.combat = null;
  s.heist.auto = null;
  ctx.emit({ t: 'profession', category: 'spending', id, amount: 1, materials: escrow });
  return null;
}

function runReason(s: GameState, run: ProjectRun): string | null {
  if (run.realm !== s.account.realm || run.realm !== realmOf(s.character) || run.owner !== s.character.id) return 'Project belongs to a different character or realm';
  if (s.professionProgress.schema !== 1 || !professionProject(run.project.id) || run.project.version > professionProject(run.project.id)!.version) return 'Project recipe needs a compatible game version';
  if (isClassic(s)) return CLASSIC_BLOCK;
  return null;
}

export function resumeProject(s: GameState): string | null {
  const run = s.professionProgress.activeProject;
  if (!run) return 'No project to resume';
  const reason = runReason(s, run);
  if (reason) return reason;
  if (run.status === 'return') return 'Collect the cancelled base first';
  s.action = { kind: 'project', runId: run.runId };
  s.combat = null;
  s.heist.auto = null;
  return null;
}

export function cancelProject(s: GameState): string | null {
  const p = s.professionProgress;
  const run = p.activeProject;
  if (!run) return 'No project';
  const reason = runReason(s, run);
  if (reason) return reason;
  if (s.action?.kind === 'project') s.action = null;
  if (run.status !== 'return') {
    for (const [id, n] of Object.entries(run.escrow)) addBank(s, id, n);
    run.escrow = {};
    run.status = 'return';
    p.settledRun = Math.max(p.settledRun, run.runId);
  }
  if (run.item) {
    if (bagFull(s)) return 'Cancelled: make inventory space to collect the original base';
    s.inventory.push(run.item);
  }
  delete p.activeProject;
  return null;
}

export function completeProject(s: GameState, ctx: Ctx, runId: number): string | null {
  const p = s.professionProgress;
  const run = p.activeProject;
  if (!run || run.runId !== runId || runId <= p.settledRun || run.status === 'return') return 'Project already settled';
  const reason = runReason(s, run);
  if (reason) return reason;
  if (run.elapsedMs < run.project.durationMs) return 'Project still in progress';
  const def = run.project;
  if (def.reward.category === 'equipment' && bagFull(s)) return 'Ready: storage full';
  const events: GameEvent[] = [];
  const commitCtx: Ctx = { ...ctx, emit: (e) => events.push(e) };
  // All blockers have passed. UID allocation, rewards, XP and watermark commit synchronously.
  if (def.reward.category === 'equipment') {
    const r = def.reward;
    const item = r.uniqueId ? createUnique(s, r.uniqueId, r.ilvl, ctx.rng) : createItem(s, r.baseId, r.ilvl, r.rarity, ctx.rng);
    if (r.uniqueId && run.item && def.baseIds?.includes(run.item.baseId)) {
      item.baseId = run.item.baseId;
    }
    if (r.fixedSuffixes) {
      item.prefixes = [];
      item.suffixes = structuredClone(r.fixedSuffixes);
    }
    if (r.name) item.name = r.name;
    s.inventory.push(item);
    seeUnique(s.account, item);
    events.push({ t: 'loot', item });
  } else if (def.reward.category === 'flask') {
    const r = def.reward;
    const f = newFlask(s, r.flaskId, r.ilvl);
    f.rarity = 'unique';
    f.charges = flaskStats(f).maxCharges;
    stashFlask(s, f);
    s.account.uniquesSeen ??= [];
    if (r.uniqueId && !s.account.uniquesSeen.includes(r.uniqueId)) s.account.uniquesSeen.push(r.uniqueId);
    events.push({ t: 'loot', flask: f } as unknown as GameEvent);
  } else if (def.reward.category === 'chart') {
    addUniqueMaps(s, def.reward.id, 1);
    events.push({ t: 'loot', currencyId: def.reward.id, qty: 1 });
  } else {
    for (const [id, n] of Object.entries(def.reward.materials)) addBank(s, id, n);
  }
  p.settledRun = runId;
  p.projects[def.id] = { completed: (p.projects[def.id]?.completed ?? 0) + 1 };
  delete p.activeProject;
  if (s.action?.kind === 'project' && s.action.runId === runId) s.action = null;
  grantMasteryPractice(s, { id: `task.project_${def.id}`, name: def.name, profile: 'project' }, def.durationMs / 1000);
  awardProfessionProgress(s, def.skill, def.workCycles ?? 1);
  // Emit only after the run is irrevocably settled, including against synchronous listeners.
  grantXp(s, commitCtx, def.skill, def.xp);
  if (def.reward.category === 'progress') for (const [id, n] of Object.entries(def.reward.materials)) events.push({ t: 'profession', category: 'progress', id, amount: n });
  if (def.discovery) recordDiscovery(s, commitCtx, def.discovery);
  events.push({ t: 'profession', category: 'project', id: def.id, amount: 1 });
  for (const e of events) ctx.emit(e);
  if (run.remaining > 1) {
    const stopped = startProject(s, ctx, def.id, run.remaining - 1);
    if (stopped) ctx.emit({ t: 'info', text: `${def.name}: ${stopped}. Stopped.`, tone: 'warn' });
  }
  return null;
}

export function advanceProject(s: GameState, ctx: Ctx, dt: number): void {
  const run = s.professionProgress.activeProject;
  if (!run || s.action?.kind !== 'project' || s.action.runId !== run.runId) return;
  const reason = runReason(s, run);
  if (!reason) {
    let mealBonus = 0;
    if (s.meal) {
      const stats = dishStats(s, s.meal.id);
      const isGathering = (['mining', 'woodcutting', 'harvesting', 'thieving', 'archaeology'] as SkillId[]).includes(run.project.skill);
      const isProduction = (['smithing', 'alchemy', 'gemcutting', 'runecarving', 'cooking', 'cartography'] as SkillId[]).includes(run.project.skill);
      if (isGathering && stats.gatheringSpeed) mealBonus = stats.gatheringSpeed / 100;
      if (isProduction && stats.productionSpeed) mealBonus = stats.productionSpeed / 100;
    }
    const speed = 1 + mealBonus + masterySpeed(s, { id: `task.project_${run.project.id}`, name: run.project.name, profile: 'project' }) / 100;
    const before = run.elapsedMs;
    run.elapsedMs = Math.min(run.project.durationMs, run.elapsedMs + dt * speed);
    if (run.elapsedMs > before) ctx.emit({ t: 'profession', category: 'work', id: run.project.id, amount: run.elapsedMs - before });
    if (run.elapsedMs < run.project.durationMs) return;
    run.status = 'ready';
  }
  const stopped = reason ?? completeProject(s, ctx, run.runId);
  if (stopped && stopped !== run.stopReason) ctx.emit({ t: 'info', text: `${run.project.name}: ${stopped}`, tone: 'warn' });
  run.stopReason = stopped ?? undefined;
}
