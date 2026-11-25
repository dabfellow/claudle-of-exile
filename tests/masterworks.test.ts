import { describe, expect, it } from 'vitest';
import { affixDef } from '../src/data/affixes';
import { baseDef, obtainable } from '../src/data/bases';
import { STASH_PAGE_SIZE } from '../src/data/hideout';
import { MASTERWORKS, MASTERY_UNLOCK, professionProject } from '../src/data/professionProjects';
import { SKILLS } from '../src/data/skills';
import { makeCtx } from '../src/engine/context';
import { applyOrb } from '../src/engine/crafting';
import { allMods, createItem } from '../src/engine/items';
import { simulateOffline } from '../src/engine/offline';
import {
  advanceProject, cancelProject, completeProject, isRetiredRun, masteryUnlocked, professionAccessReason, resumeProject, startProject,
} from '../src/engine/professions';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import type { GameState, Item, SkillId } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';

const ctx = (seed = 7) => makeCtx(seeded(seed));
const LIFE = (Object.keys(SKILLS) as SkillId[]).filter((id) => id !== 'combat' && !SKILLS[id].soon);

/** A character who has every life skill at `level` and the full inputs for `id` in the bank. */
function master(id: string, level = 95): GameState {
  const s = newGame(1);
  for (const skill of LIFE) s.skills[skill] = xpForLevel(level);
  s.storage.bank = { ...professionProject(id)!.inputs };
  return s;
}

function reload(s: GameState): GameState {
  const back = deserialize(serialize(s));
  back.account = structuredClone(s.account);
  return back;
}

const isTopTier = (m: Item['prefixes'][number]) => m.tier === affixDef(m.affixId).tiers.length - 1;

describe('Masterworks atelier', () => {
  it('has ten masterworks, each spanning three 60+ gathering skills, a production craft and a rare drop', () => {
    expect(MASTERWORKS).toHaveLength(10);
    // three weapons (sword, bow, staff) and one of every other slot but the belt
    expect(new Set(MASTERWORKS.map((p) => p.reward.category === 'equipment' && baseDef(p.reward.baseId).slot)).size).toBe(8);
    for (const p of MASTERWORKS) {
      const sourceSkills = new Set(p.sources.map((x) => x.skill));
      const gathering = [...sourceSkills].filter((k) => k !== 'combat' && SKILLS[k].group === 'gathering' && (p.skillLevels?.[k] ?? 0) >= 60);
      const production = [...sourceSkills].filter((k) => k !== 'combat' && SKILLS[k].group === 'production');
      expect(gathering.length, p.id).toBeGreaterThanOrEqual(3);
      expect(production.length, p.id).toBeGreaterThanOrEqual(1);
      expect(sourceSkills.has('combat'), `${p.id} needs a rare drop`).toBe(true);
      expect(p.repeatable).toBe(true);
      if (p.reward.category !== 'equipment') throw new Error(p.id);
      const base = baseDef(p.reward.baseId);
      expect(base.masterwork).toBe(true);
      expect(obtainable(base)).toBe(false);
    }
  });

  it('stays sealed until five life skills reach level 25; Character level and coming-soon skills do not count', () => {
    const s = newGame(1);
    s.skills.combat = xpForLevel(90);
    s.skills.fishing = xpForLevel(90);
    expect(masteryUnlocked(s)).toBe(false);
    expect(professionAccessReason(s, MASTERWORKS[0])).toBe(`Requires ${MASTERY_UNLOCK.skills} life skills at level ${MASTERY_UNLOCK.level} (0/5)`);
    const five: SkillId[] = ['mining', 'woodcutting', 'harvesting', 'smelting', 'smithing'];
    for (const skill of five.slice(0, 4)) s.skills[skill] = xpForLevel(25);
    expect(masteryUnlocked(s)).toBe(false);
    expect(professionAccessReason(s, MASTERWORKS[0])).toMatch(/\(4\/5\)/);
    s.skills.smithing = xpForLevel(25);
    expect(masteryUnlocked(s)).toBe(true);
    // open now, but each masterwork still asks for its own skills
    expect(professionAccessReason(s, MASTERWORKS[0])).toMatch(/level 60/);
  });

  it('asks for every listed skill, not just the craft that assembles it', () => {
    const s = master('mw_colossus_bulwark');
    s.skills.archaeology = xpForLevel(79);
    expect(professionAccessReason(s, professionProject('mw_colossus_bulwark')!)).toBe('Requires Archaeology level 80');
    s.skills.archaeology = xpForLevel(80);
    expect(professionAccessReason(s, professionProject('mw_colossus_bulwark')!)).toBeNull();
  });

  it.each(MASTERWORKS.map((p) => p.id))('%s: pays in full, then delivers a named rare whose every modifier is Tier 1', (id) => {
    const p = professionProject(id)!;
    if (p.reward.category !== 'equipment') throw new Error(id);
    const perks = p.reward.perks ?? [];
    const s = master(id), c = ctx();
    const xpBefore = s.skills[p.skill];
    expect(startProject(s, c, id)).toBeNull();
    for (const input of Object.keys(p.inputs)) expect(s.storage.bank[input]).toBe(0);
    const runId = s.professionProgress.activeProject!.runId;
    advanceProject(s, c, p.durationMs);
    const item = s.inventory.at(-1)!;
    expect(item.baseId).toBe(p.reward.baseId);
    expect(item.rarity).toBe('rare');
    expect(item.name).toBe(p.name);
    expect(item.ilvl).toBe(86);
    expect(allMods(item)).toHaveLength(perks.includes('voidSlot') ? 7 : 6);
    expect(allMods(item).every(isTopTier)).toBe(true);
    expect(!!item.voidSlot).toBe(perks.includes('voidSlot'));
    expect(!!item.doomImplicit).toBe(perks.includes('doomImplicit'));
    expect(allMods(item).filter((m) => m.elevated)).toHaveLength(perks.includes('doomTier') ? 1 : 0);
    expect(s.skills[p.skill] - xpBefore).toBeCloseTo(p.xp);
    expect(s.professionProgress.projects[id].completed).toBe(1);
    expect(completeProject(s, c, runId)).toBe('Project already settled');
  });

  it('stays a masterwork through orbs: a Chaos Orb rerolls six Tier 1 modifiers and keeps the name', () => {
    const s = newGame(1), c = ctx(3);
    const item = createItem(s, 'mw_starforged_blade', 86, 'rare', c.rng);
    item.name = 'Starforged Blade';
    s.inventory.push(item);
    s.storage.bank.chaos = 5;
    for (let i = 0; i < 5; i++) {
      const before = JSON.stringify(allMods(item));
      expect(applyOrb(s, ctx(10 + i), 'chaos', item.uid)).toBeNull();
      expect(JSON.stringify(allMods(item))).not.toBe(before);
      expect(allMods(item)).toHaveLength(6);
      expect(allMods(item).every(isTopTier)).toBe(true);
      expect(item.name).toBe('Starforged Blade');
    }
    // ordinary bases still roll their usual spread of tiers
    const plain = createItem(s, 'wyrmlord_sword', 86, 'rare', ctx(4).rng);
    const many = Array.from({ length: 30 }, (_, i) => createItem(s, 'wyrmlord_sword', 86, 'rare', ctx(50 + i).rng)).flatMap(allMods);
    expect(allMods(plain).length).toBeGreaterThan(0);
    expect(many.some((m) => !isTopTier(m))).toBe(true);
  });

  it('never drops, sells or appears as an ordinary bench recipe', () => {
    for (const p of MASTERWORKS) {
      if (p.reward.category !== 'equipment') continue;
      expect(obtainable(baseDef(p.reward.baseId))).toBe(false);
    }
  });

  it('cancelling returns the exact bar grade that was reserved', () => {
    const s = master('mw_starforged_blade');
    delete s.storage.bank.star_bar;
    s.storage.bank.star_bar_pure = 60;
    expect(startProject(s, ctx(), 'mw_starforged_blade')).toBeNull();
    expect(s.storage.bank.star_bar_pure).toBe(0);
    advanceProject(s, ctx(), 1_000_000);
    expect(cancelProject(s)).toBeNull();
    expect(s.storage.bank.star_bar_pure).toBe(60);
    expect(s.storage.bank.star_bar).toBeUndefined();
    expect(s.storage.bank.star_ore).toBe(600);
    expect(s.professionProgress.activeProject).toBeUndefined();
  });

  it('holds a finished masterwork while storage is full, through a reload, and delivers it once', () => {
    let s = master('mw_glimmerweave_raiment');
    const c = ctx();
    expect(startProject(s, c, 'mw_glimmerweave_raiment')).toBeNull();
    s.inventory = Array.from({ length: 100 }, (_, i) => createItem(s, 'driftwood_wand', 1, 'normal', seeded(i)));
    s.storage.stash = s.storage.stash.map(() => Array.from({ length: STASH_PAGE_SIZE }, (_, i) => createItem(s, 'driftwood_wand', 1, 'normal', seeded(i))));
    advanceProject(s, c, professionProject('mw_glimmerweave_raiment')!.durationMs);
    expect(s.professionProgress.activeProject?.status).toBe('ready');
    s = reload(s);
    const runId = s.professionProgress.activeProject!.runId;
    expect(completeProject(s, c, runId)).toBe('Ready: storage full');
    s.inventory.pop();
    expect(completeProject(s, c, runId)).toBeNull();
    expect(s.inventory.at(-1)!.baseId).toBe('mw_glimmerweave_raiment');
    expect(completeProject(s, c, runId)).toBe('Project already settled');
  });

  it('finishes offline just like live work', () => {
    const s = master('mw_rimebound_crown'), c = ctx();
    expect(startProject(s, c, 'mw_rimebound_crown')).toBeNull();
    simulateOffline(s, c, professionProject('mw_rimebound_crown')!.durationMs + 60_000);
    expect(s.inventory.filter((i) => i.baseId === 'mw_rimebound_crown')).toHaveLength(1);
    expect(s.professionProgress.activeProject).toBeUndefined();
  });

  it('an old project from a retired recipe cannot resume, but cancels for a full refund', () => {
    const s = master('mw_starforged_blade');
    expect(startProject(s, ctx(), 'mw_starforged_blade')).toBeNull();
    const run = s.professionProgress.activeProject!;
    // what a save holds for one of the old masterworks, e.g. a Prospector's Pick in progress
    run.project = { ...run.project, id: 'tool_mining', name: "Prospector's Pick" };
    run.escrow = { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 };
    s.storage.bank = {};
    expect(isRetiredRun(run)).toBe(true);
    expect(resumeProject(s)).toMatch(/compatible game version/);
    expect(cancelProject(s)).toBeNull();
    expect(s.storage.bank).toEqual({ copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 });
    expect(s.professionProgress.activeProject).toBeUndefined();
  });
});
