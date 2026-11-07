import { SKILL_BAR_SLOTS } from '../data/gems';
import { BAG_SIZE, GEAR_SWITCH_BENCH_LEVEL } from '../data/hideout';
import { actionDef } from '../data/skills';
import { characterLevel } from './character';
import type { Ctx } from './context';
import { gemUseReason, socketSupport, unsocketSupport } from './gems';
import { stationLevel } from './hideout';
import { equipFrom, equipFromReason, moveToStash } from './itemActions';
import { newUid } from './items';
import { deriveStats } from './stats';
import { unequip } from './equipment';
import type { EquipSlot, GameState, GearSet, SkillId, SkillSet, SkillSetSlot } from './types';

// Saved gear sets and skill bars, one list per character. See docs/GAME.md.

/** Weapons first: a two-hander or an off-hand can push the other out, so the main hand has to settle first. */
const GEAR_SLOTS: EquipSlot[] = ['weapon', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring1', 'ring2', 'ring3', 'ring4'];

export function newLoadouts(): GameState['loadouts'] {
  return { gear: [], skills: [], auto: {}, lastActivity: null };
}

function gearOf(s: GameState): GearSet['items'] {
  return Object.fromEntries(GEAR_SLOTS.flatMap((slot) => (s.equipment[slot] ? [[slot, s.equipment[slot]!.uid]] : [])));
}

function barOf(s: GameState): (SkillSetSlot | null)[] {
  return s.skillBar.map((g) => g && { gem: g.uid, supports: g.supports.map((x) => x?.uid ?? null), rules: g.rules.map((r) => ({ ...r })), priority: g.priority });
}

export function saveGearSet(s: GameState, name: string): void {
  s.loadouts.gear.push({ id: newUid(s), name, items: gearOf(s) });
}

export function saveSkillSet(s: GameState, name: string): void {
  s.loadouts.skills.push({ id: newUid(s), name, slots: barOf(s) });
}

export function updateGearSet(s: GameState, id: number): void {
  const set = s.loadouts.gear.find((x) => x.id === id);
  if (set) set.items = gearOf(s);
}

export function updateSkillSet(s: GameState, id: number): void {
  const set = s.loadouts.skills.find((x) => x.id === id);
  if (set) set.slots = barOf(s);
}

export function renameLoadout(s: GameState, kind: 'gear' | 'skills', id: number, name: string): void {
  const set = s.loadouts[kind].find((x) => x.id === id);
  if (set) set.name = name;
}

export function deleteGearSet(s: GameState, id: number): void {
  s.loadouts.gear = s.loadouts.gear.filter((x) => x.id !== id);
  for (const skill of Object.keys(s.loadouts.auto) as SkillId[]) if (s.loadouts.auto[skill] === id) delete s.loadouts.auto[skill];
}

export function deleteSkillSet(s: GameState, id: number): void {
  s.loadouts.skills = s.loadouts.skills.filter((x) => x.id !== id);
}

/** Bulk salvage walks past gear a set is counting on. */
export function inGearSet(s: GameState, uid: number): boolean {
  return s.loadouts.gear.some((set) => Object.values(set.items).includes(uid));
}

export function gearSetWorn(s: GameState, set: GearSet): boolean {
  return GEAR_SLOTS.every((slot) => s.equipment[slot]?.uid === set.items[slot]);
}

export function skillSetActive(s: GameState, set: SkillSet): boolean {
  return s.skillBar.every((g, i) => {
    const want = set.slots[i] ?? null;
    if (!g || !want) return !g && !want;
    return g.uid === want.gem && g.supports.every((x, n) => (x?.uid ?? null) === (want.supports[n] ?? null));
  });
}

/** Life, mana and shield stay at the same share of their maximums across a swap, so skilling gear doesn't start a fight half dead. */
function keepingVitals(s: GameState, swap: () => void): void {
  const before = deriveStats(s);
  const share = { life: s.life / before.maxLife, mana: before.maxMana ? s.mana / before.maxMana : 1, es: before.maxEs ? s.es / before.maxEs : 0 };
  swap();
  const after = deriveStats(s);
  s.life = Math.max(1, share.life * after.maxLife);
  s.mana = share.mana * after.maxMana;
  s.es = share.es * after.maxEs;
}

function swapGear(s: GameState, ctx: Ctx, set: GearSet): string | null {
  const wanted = new Set(Object.values(set.items));
  // a piece on the wrong finger or hand comes off first: nothing can be equipped while it's worn
  for (const slot of GEAR_SLOTS) {
    const item = s.equipment[slot];
    if (!item || !wanted.has(item.uid) || set.items[slot] === item.uid) continue;
    delete s.equipment[slot];
    s.inventory.push(item);
  }
  // one piece's attributes can be what lets the next one on, so keep going round until nothing more fits
  let pending = GEAR_SLOTS.filter((slot) => set.items[slot] && s.equipment[slot]?.uid !== set.items[slot]);
  for (let before = -1; pending.length && pending.length !== before; ) {
    before = pending.length;
    pending = pending.filter((slot) => equipFrom(s, ctx, set.items[slot]!, slot));
  }
  // the set is the whole doll: a slot it leaves empty comes off
  for (const slot of GEAR_SLOTS) {
    const item = s.equipment[slot];
    if (item && !set.items[slot] && unequip(s, slot)) moveToStash(s, ctx, item.uid);
  }
  while (s.inventory.length > BAG_SIZE) {
    if (moveToStash(s, ctx, s.inventory.at(-1)!.uid)) break;
  }
  if (!pending.length) return null;
  const why = equipFromReason(s, set.items[pending[0]]!) ?? 'Item not found';
  return `${set.name}: ${pending.length} piece${pending.length === 1 ? '' : 's'} left off (${why})`;
}

/** Wear a set, from the bag or the stash. Whatever comes off goes to the bag, or the stash once that's full. */
export function applyGearSet(s: GameState, ctx: Ctx, id: number): string | null {
  const set = s.loadouts.gear.find((x) => x.id === id);
  if (!set) return 'No such gear set';
  let result: string | null = null;
  keepingVitals(s, () => (result = swapGear(s, ctx, set)));
  return result;
}

/** A support back to the loose pile from a gem in the bag, so a set can claim it. */
function freeSupport(s: GameState, uid: number): void {
  for (const gem of s.account.gems) {
    const socket = gem.supports.findIndex((x) => x?.uid === uid);
    if (socket >= 0) unsocketSupport(s, gem.uid, socket);
  }
}

/** Put a saved bar back: its gems, their sockets, rules and priorities. What it can't place is left out and counted. */
export function applySkillSet(s: GameState, id: number): string | null {
  const set = s.loadouts.skills.find((x) => x.id === id);
  if (!set) return 'No such skill set';
  const cooldowns = new Map(s.skillBar.map((g, i) => [g?.uid, s.combat?.cooldowns[i] ?? 0]));
  const level = characterLevel(s);
  const attrs = deriveStats(s, []).attributes;
  let left = 0;
  s.account.gems.push(...s.skillBar.filter((g) => !!g));
  s.skillBar = Array(SKILL_BAR_SLOTS).fill(null);
  set.slots.forEach((want, slot) => {
    if (!want) return;
    const idx = s.account.gems.findIndex((g) => g.uid === want.gem);
    if (idx < 0 || gemUseReason(level, attrs, s.account.gems[idx])) {
      left++;
      return;
    }
    const [gem] = s.account.gems.splice(idx, 1);
    gem.rules = want.rules.map((r) => ({ ...r }));
    gem.priority = want.priority;
    s.skillBar[slot] = gem;
  });
  // every socket that holds the wrong support empties first, so supports can trade places between skills
  const placed = set.slots.flatMap((want, slot) => (want && s.skillBar[slot] ? [{ want, gem: s.skillBar[slot]! }] : []));
  for (const { want, gem } of placed) {
    gem.supports.forEach((x, socket) => {
      if (x && x.uid !== want.supports[socket]) unsocketSupport(s, gem.uid, socket);
    });
  }
  for (const { want, gem } of placed) {
    want.supports.forEach((uid, socket) => {
      if (uid === null || gem.supports[socket]?.uid === uid) return;
      freeSupport(s, uid);
      if (socketSupport(s, gem.uid, uid, socket)) left++;
    });
  }
  // a cooldown stays with its gem, so a swap can't reset one
  if (s.combat) {
    s.combat.cooldowns = s.skillBar.map((g) => (g && cooldowns.get(g.uid)) || 0);
    s.combat.queued = null;
  }
  return left ? `${set.name}: ${left} gem${left === 1 ? '' : 's'} left off` : null;
}

// ---------- auto-switching ----------

export function gearSwitchUnlocked(s: GameState): boolean {
  return stationLevel(s, 'bench') >= GEAR_SWITCH_BENCH_LEVEL;
}

/** Choose the gear set an activity switches to, or none. */
export function setAutoGear(s: GameState, skill: SkillId, id: number | null): string | null {
  if (!gearSwitchUnlocked(s)) return `Needs Crafting Bench level ${GEAR_SWITCH_BENCH_LEVEL}`;
  if (id === null) delete s.loadouts.auto[skill];
  else s.loadouts.auto[skill] = id;
  return null;
}

/** Which skill the character is working at. Auto-crafting isn't one: nothing you wear changes it. */
export function currentActivity(s: GameState): SkillId | null {
  const a = s.action;
  if (a?.kind === 'combat') return 'combat';
  if (a?.kind === 'skill') return actionDef(a.actionId).skill;
  if (a?.kind === 'heist') return 'thieving';
  return null;
}

/** Switches once, as an activity starts, so a set you change to by hand holds until you move on. */
export function autoSwitchGear(s: GameState, ctx: Ctx): void {
  const activity = currentActivity(s);
  if (activity === s.loadouts.lastActivity) return;
  s.loadouts.lastActivity = activity;
  const id = activity && s.loadouts.auto[activity];
  const set = id ? s.loadouts.gear.find((x) => x.id === id) : undefined;
  if (!set || !gearSwitchUnlocked(s) || gearSetWorn(s, set)) return;
  const failed = applyGearSet(s, ctx, set.id);
  ctx.emit({ t: 'info', text: failed ?? `Switched to ${set.name}` });
}
