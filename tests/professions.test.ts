import { afterEach, describe, expect, it } from 'vitest';
import { BAG_SIZE } from '../src/data/hideout';
import { flaskDef } from '../src/data/flasks';
import { PROFESSION_PROJECTS, type ProfessionProject } from '../src/data/professionProjects';
import { ACTIONS, actionDef, actionsFor } from '../src/data/skills';
import { newGame, tick } from '../src/engine/state';
import { makeCtx } from '../src/engine/context';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { settleCharacter } from '../src/engine/account';
import { mergeOffline, simulateOffline } from '../src/engine/offline';
import { actionBlocker, actionIntervalMs, gemCutPool, skillStep, smithIlvl, startSkillAction, stopAction } from '../src/engine/skills';
import { advanceProject, cancelProject, completeProject, hasAccomplishment, recordDiscovery, resumeProject, startProject } from '../src/engine/professions';
import { professionStationRoute, stationLockReason, upgradeStation } from '../src/engine/hideout';
import { deriveStats } from '../src/engine/stats';
import { xpForLevel } from '../src/engine/xp';
import { masteryThreshold } from '../src/engine/skillingMastery';
import { createItem } from '../src/engine/items';
import { orbReason } from '../src/engine/crafting';
import { equip } from '../src/engine/equipment';
import { skillLock } from '../src/ui/skillLock';
import { realmOf } from '../src/engine/challenge';
import { readFileSync } from 'node:fs';
import type { AccountState } from '../src/engine/types';
import { cleanProjectDesc, resolveBaseSource, resolveMaterialSource } from '../src/ui/components/projectHelpers';

const ctx = () => makeCtx(seeded(123));
const reload = (s: ReturnType<typeof newGame>) => {
  const loaded = deserialize(serialize(s));
  loaded.account = structuredClone(s.account);
  settleCharacter(loaded, loaded.account);
  return loaded;
};
const funded = () => { const s = newGame(1); s.account.bank.copper_ore = 100; s.skillingMastery['task.smelt_copper'] = masteryThreshold(15); return s; };
const equipmentProject: ProfessionProject = {
  id: 'test_equipment', version: 1, name: 'Test equipment', skill: 'smithing', level: 1,
  inputs: { copper_ore: 25 }, durationMs: 1000, xp: 12,
  reward: { category: 'equipment', baseId: 'iron_ring', ilvl: 10, rarity: 'rare' },
  baseId: 'iron_ring', sources: [], use: 'Test fixture only',
};
const realProjectCount = PROFESSION_PROJECTS.length;
afterEach(() => { PROFESSION_PROJECTS.splice(realProjectCount); delete actionDef('smelt_copper').protectedOutputs; delete actionDef('smelt_copper').discovery; });

describe('independent profession foundations', () => {
  it('opens all eleven pages and a level-one task, leaving encounters locked', () => {
    const s = newGame(1);
    for (const skill of ['mining', 'woodcutting', 'harvesting', 'thieving', 'archaeology', 'smithing', 'alchemy', 'gemcutting', 'runecarving', 'cooking', 'cartography'] as const) {
      expect(skillLock(s, skill)).toBeNull();
      const a = actionsFor(skill).find((a) => a.level === 1)!;
      expect(a).toBeDefined();
      expect(actionBlocker(s, a) ?? '').not.toMatch(/Reach|Act/);
    }
    expect(ACTIONS.every((a) => !a.area && !a.gate)).toBe(true);
    expect(stationLockReason(s, 'map_device')).toMatch(/Act 7/);
    expect(stationLockReason(s, 'rune_board')).toBeNull();
  });

  it('keeps accomplishment access separate from bonus-only mastery', () => {
    const s = funded();
    s.skillingMastery['task.smelt_copper'] = 432000;
    expect(hasAccomplishment(s, 'smithing_work_20')).toBe(false);
    startSkillAction(s, ctx(), 'smelt_copper');
    const d = deriveStats(s);
    skillStep(s, ctx(), actionIntervalMs(s, actionDef('smelt_copper'), d) * 20 + 1, d);
    expect(hasAccomplishment(s, 'smithing_work_20')).toBe(true);
    expect(s.professionProgress.work.smithing).toBe(20);
  });

  it('allows only the four specified alternative upgrades and preserves original routes', () => {
    const s = newGame(1);
    for (const [id, skill, level] of [['forge', 'smithing', 22], ['alchemy_table', 'alchemy', 18]] as const) {
      s.skills[skill] = xpForLevel(level);
      expect(professionStationRoute(s, id)?.reason).toMatch(/work/);
      s.professionProgress.work[skill] = 60;
      for (let i = 0; i < 2; i++) {
        const route = professionStationRoute(s, id)!;
        expect(route.reason).toBeNull();
        for (const [mat, n] of Object.entries(route.cost)) s.account.bank[mat] = n;
        expect(upgradeStation(s, ctx(), id, 'profession')).toBeNull();
      }
      expect(professionStationRoute(s, id)).toBeNull();
    }
    expect(upgradeStation(s, ctx(), 'bench', 'profession')).toMatch(/No profession/);
    const old = newGame(1);
    old.account.bank = { gold: 1e9, copper_bar: 1e9, ash_plank: 1e9, iron_bar: 1e9, oak_plank: 1e9, mithril_bar: 1e9, yew_plank: 1e9 };
    expect(upgradeStation(old, ctx(), 'forge')).toBeNull();
  });

  it('bases Smithing and gem manufacture on professions while leaving character requirements intact', () => {
    const s = newGame(1);
    s.skills.smithing = xpForLevel(90);
    s.account.hideout.forge = 3;
    expect(smithIlvl(s)).toBe(90);
    s.account.hideout.forge = 1;
    expect(smithIlvl(s)).toBe(21);
    s.skills.gemcutting = xpForLevel(80);
    expect(gemCutPool(s, 'skill').length).toBeGreaterThan(gemCutPool(newGame(1), 'skill').length);
    expect(s.skills.combat).toBe(0);
  });
});

describe('atomic paid project lifecycle', () => {
  it('unlocks the separate Copper Supply batch only at mastery 15 of its matching craft', () => {
    const s = funded();
    s.skills.smithing = xpForLevel(99);
    s.skillingMastery['task.smelt_iron'] = masteryThreshold(100);
    s.skillingMastery['task.smelt_copper'] = masteryThreshold(15) - 1;
    expect(startProject(s, ctx(), 'copper_supply')).toBe('Requires Smelt Copper Bars mastery 15');
    expect(s.account.bank.copper_ore).toBe(100);
    s.skillingMastery['task.smelt_copper'] = masteryThreshold(15);
    s.skills.smithing = 0;
    expect(startProject(s, ctx(), 'copper_supply')).toBeNull();
    expect(s.professionProgress.activeProject?.project.category).toBe('masteryBatch');
    expect(s.professionProgress.activeProject?.escrow).toEqual({ copper_ore: 25 });
    advanceProject(s, ctx(), 15_000);
    expect(s.account.bank.copper_bar).toBe(5);
  });

  it('reserves the full nominal cost before work and rejects a second start', () => {
    const s = funded();
    const c = ctx();
    expect(startProject(s, c, 'copper_supply')).toBeNull();
    expect(s.account.bank.copper_ore).toBe(75);
    expect(startProject(s, c, 'copper_supply')).toMatch(/current project/);
    expect(s.account.bank.copper_ore).toBe(75);
    expect(s.professionProgress.activeProject?.escrow).toEqual({ copper_ore: 25 });
    expect(completeProject(s, c, 1)).toBe('Project still in progress');
  });

  it('completes once with identical live/offline rewards, work, XP, mastery and discovery traces', () => {
    const live = funded();
    startProject(live, ctx(), 'copper_supply', 2);
    const away = reload(live);
    const liveCtx = ctx();
    for (let i = 0; i < 40; i++) tick(live, liveCtx, 1000);
    const sum = simulateOffline(away, ctx(), 40_000);
    expect(away.account.bank).toEqual(live.account.bank);
    expect(away.skills).toEqual(live.skills);
    expect(away.skillingMastery).toEqual(live.skillingMastery);
    expect(live.skillingMastery['task.project_copper_supply']).toBeUndefined();
    expect(away.professionProgress).toEqual(live.professionProgress);
    expect(sum.protectedProgress).toEqual({ copper_bar: 10 });
    expect(sum.projects).toEqual({ copper_supply: 2 });
    expect(sum.discoveries).toEqual(['smithing_copper_supply']);
    expect(sum.ordinaryOutput).toEqual({});
    expect(sum.projectWork!.copper_supply).toBeCloseTo(30_000);
    expect(completeProject(away, ctx(), 2)).toBe('Project already settled');
    expect(away.account.bank.copper_bar).toBe(10);
    expect(liveCtx.events.filter((e) => e.t === 'profession' && e.category === 'discovery')).toHaveLength(1);
  });

  it('survives interrupted work, stops without refunding, resumes without charging, and cancels once', () => {
    let s = funded();
    startProject(s, ctx(), 'copper_supply');
    tick(s, ctx(), 4000);
    startSkillAction(s, ctx(), 'mine_copper');
    const before = s.professionProgress.activeProject!.elapsedMs;
    tick(s, ctx(), 1000);
    expect(s.professionProgress.activeProject!.elapsedMs).toBe(before);
    s = reload(reload(s));
    const ore = s.account.bank.copper_ore;
    expect(resumeProject(s)).toBeNull();
    expect(s.account.bank.copper_ore).toBe(ore);
    stopAction(s);
    tick(s, ctx(), 1000);
    expect(s.professionProgress.activeProject!.elapsedMs).toBe(before);
    expect(cancelProject(s)).toBeNull();
    expect(s.account.bank.copper_ore).toBe(ore + 25);
    expect(cancelProject(s)).toBe('No project');
    expect(s.skills.smithing).toBe(0);
    expect(s.skillingMastery['task.project_copper_supply']).toBeUndefined();
  });

  it('pauses full equipment delivery, allocating no UID or XP until space exists; claims cannot repeat', () => {
    PROFESSION_PROJECTS.push({ ...equipmentProject, baseId: undefined });
    let s = funded();
    while (s.inventory.length < BAG_SIZE) s.inventory.push(createItem(s, 'iron_ring', 1, 'normal', seeded(1)));
    startProject(s, ctx(), 'test_equipment');
    const uid = s.nextUid;
    const sum = simulateOffline(s, ctx(), 2000);
    expect(sum.stoppedReason).toMatch(/Ready: storage full/);
    expect(s.nextUid).toBe(uid);
    expect(s.skills.smithing).toBe(0);
    expect(s.professionProgress.activeProject!.status).toBe('ready');
    s = reload(reload(s));
    s.inventory.pop();
    tick(s, ctx(), 100);
    expect(s.inventory).toHaveLength(BAG_SIZE);
    expect(s.nextUid).toBe(uid + 1);
    expect(s.skills.smithing).toBe(12);
    expect(s.ground).toEqual([]);
    expect(s.offlineHaul).toEqual([]);
    const delivered = reload(s);
    expect(completeProject(delivered, ctx(), 1)).toBe('Project already settled');
    expect(delivered.inventory).toEqual(s.inventory);
    expect(startProject(delivered, ctx(), 'test_equipment')).toBe('Already completed');
  });

  it('locks an escrowed base from use and returns the exact UID/mods once, even through pending return reload', () => {
    PROFESSION_PROJECTS.push(equipmentProject);
    let s = funded();
    const item = createItem(s, 'iron_ring', 12, 'magic', seeded(7));
    s.inventory.push(item);
    expect(startProject(s, ctx(), 'test_equipment', 1, item.uid)).toBeNull();
    expect(s.inventory.some((i) => i.uid === item.uid)).toBe(false);
    expect(orbReason(s, 'scour', item.uid)).toBe('Select an item');
    expect(equip(s, ctx(), item.uid)).toBeTruthy();
    while (s.inventory.length < BAG_SIZE) s.inventory.push(createItem(s, 'iron_ring', 1, 'normal', seeded(1)));
    expect(cancelProject(s)).toMatch(/original base/);
    expect(s.account.bank.copper_ore).toBe(100);
    s = reload(s);
    expect(cancelProject(s)).toMatch(/original base/);
    expect(s.account.bank.copper_ore).toBe(100);
    s.inventory.pop();
    expect(cancelProject(s)).toBeNull();
    expect(s.inventory.at(-1)).toEqual(item);
    expect(cancelProject(s)).toBe('No project');
  });

  it('honors a paid snapshot after recipe tuning and preserves unsupported future escrow', () => {
    let s = funded();
    startProject(s, ctx(), 'copper_supply');
    s.professionProgress.activeProject!.project.inputs.copper_ore = 30; // snapshot is independent of live definition
    s = reload(s);
    tick(s, ctx(), 16_000);
    expect(s.account.bank.copper_bar).toBe(5);
    expect(s.account.bank.copper_ore).toBe(75);
    startProject(s, ctx(), 'copper_supply');
    s.professionProgress.activeProject!.project.version = 999;
    s = reload(s);
    const reserved = structuredClone(s.professionProgress.activeProject);
    simulateOffline(s, ctx(), 2000);
    expect(cancelProject(s)).toMatch(/compatible game version/);
    expect(s.professionProgress.activeProject!.escrow).toEqual(reserved!.escrow);
  });

  it('stops selected repeats on input exhaustion, never chooses suppliers or overclaims', () => {
    const s = funded();
    s.account.bank.copper_ore = 25;
    startProject(s, ctx(), 'copper_supply', 3);
    const sum = simulateOffline(s, ctx(), 60_000);
    expect(sum.stoppedReason).toMatch(/Missing materials/);
    expect(s.account.bank.copper_bar).toBe(5);
    expect(s.action).toBeNull();
    expect(s.professionProgress.nextRun).toBe(2);
  });

  it('blocks Classic and cross-character/realm claims or refunds; allows SSF and Hardcore in their own realm', () => {
    const classic = funded();
    classic.character.challenge = { classic: true };
    expect(startProject(classic, ctx(), 'copper_supply')).toMatch(/Classic/);
    for (const challenge of [{ ssf: true }, { hardcore: true }]) {
      const s = funded();
      s.character.challenge = challenge;
      s.account.realm = realmOf(s.character);
      expect(startProject(s, ctx(), 'copper_supply')).toBeNull();
      s.account.realm = 'standard';
      expect(cancelProject(s)).toMatch(/realm/);
      expect(completeProject(s, ctx(), 1)).toMatch(/realm/);
      s.account.realm = realmOf(s.character);
      s.character.id += '-copy';
      expect(cancelProject(s)).toMatch(/character|realm/);
    }
  });
});

describe('ordinary completion boundaries and return summaries', () => {
  it('settles before notifying listeners, so a synchronous duplicate claim cannot re-enter delivery', () => {
    const s = funded();
    startProject(s, ctx(), 'copper_supply');
    const c = ctx();
    c.emit = () => { expect(completeProject(s, ctx(), 1)).toBe('Project already settled'); };
    advanceProject(s, { ...c, emit: (e) => { if (e.t !== 'profession' || e.category !== 'work') c.emit(e); } }, 16_000);
    expect(s.account.bank.copper_bar).toBe(5);
  });
  it('manual doubles preserve ordinary bonuses but never duplicate work, discoveries or protected progress', () => {
    const a = actionDef('smelt_copper');
    a.protectedOutputs = { copper_bar: 2 };
    a.discovery = 'test_copper';
    const s = funded();
    const c = ctx();
    startSkillAction(s, c, a.id);
    if (s.action?.kind === 'skill') s.action.double = true;
    const d = deriveStats(s);
    skillStep(s, c, actionIntervalMs(s, a, d) + 1, d);
    expect(s.account.bank.copper_bar).toBe(4); // doubled ordinary one + exact protected two
    expect(s.professionProgress.work.smithing).toBe(1);
    expect(c.events.filter((e) => e.t === 'profession' && e.category === 'discovery')).toHaveLength(1);
    const saved = reload(s);
    expect(recordDiscovery(saved, c, 'test_copper')).toBe(false);
  });

  it('checks nominal inputs even at max conservation and stops ordinary work after inputs run out', () => {
    const s = funded();
    s.account.bank.copper_ore = 4;
    s.skillingMastery['task.smelt_copper'] = 432000;
    expect(startSkillAction(s, ctx(), 'smelt_copper')).toBe('Missing materials');
    s.account.bank.copper_ore = 5;
    startSkillAction(s, ctx(), 'smelt_copper');
    const sum = simulateOffline(s, ctx(), 60_000);
    expect(sum.ordinaryOutput!.copper_bar).toBe(1);
    expect(sum.stoppedReason).toMatch(/Missing materials/);
    expect(s.professionProgress.work.smithing).toBe(1);
  });

  it('suppresses a doubled extra base with one slot left and stops before paying for a full bag', () => {
    const s = funded();
    s.account.bank.copper_bar = 100;
    s.account.bank.ash_plank = 100;
    const a = actionDef('smith_iron_ring');
    for (const [id, n] of Object.entries(a.inputs!)) s.account.bank[id] = n * 3;
    while (s.inventory.length < BAG_SIZE - 1) s.inventory.push(createItem(s, 'iron_ring', 1, 'normal', seeded(1)));
    const c = ctx();
    startSkillAction(s, c, a.id);
    if (s.action?.kind === 'skill') s.action.double = true;
    const d = deriveStats(s);
    skillStep(s, c, actionIntervalMs(s, a, d) + 1, d);
    expect(s.inventory).toHaveLength(BAG_SIZE);
    expect(c.events.some((e) => e.t === 'info' && e.text.includes('extra equipment suppressed'))).toBe(true);
    const before = { ...s.account.bank };
    skillStep(s, c, actionIntervalMs(s, a, d) + 1, d);
    expect(s.account.bank).toEqual(before);
    expect(s.action).toBeNull();
  });

  it('merges counts and discovery sets without replaying rewards', () => {
    const s = funded();
    startProject(s, ctx(), 'copper_supply');
    const first = simulateOffline(s, ctx(), 16_000);
    startProject(s, ctx(), 'copper_supply');
    const second = simulateOffline(s, ctx(), 16_000);
    expect(mergeOffline(first, second).projects).toEqual({ copper_supply: 2 });
    expect(mergeOffline(first, second).discoveries).toEqual(['smithing_copper_supply']);
    expect(s.account.bank.copper_bar).toBe(10);
  });

  it('validates all profession project rewards can be resolved without crashing', () => {
    for (const p of PROFESSION_PROJECTS) {
      const r = p.reward;
      if (r.category === 'flask') {
        expect(() => {
          const f = flaskDef(r.flaskId);
          expect(f).toBeDefined();
          expect(f.desc).toBeTruthy();
        }).not.toThrow();
      }
    }
  });
});

describe('pre-overhaul serialized compatibility', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/profession-v46.json', import.meta.url), 'utf8'));
  it('carries owned rune-grade evidence after the separate realm bank is attached', () => {
    const raw = structuredClone(fixture.ordinary);
    raw.skills.runecarving = 0;
    const s = deserialize(JSON.stringify(raw));
    const account = structuredClone(fixture.account) as AccountState;
    account.bank.rune_ember_4 = 1;
    settleCharacter(s, account);
    expect(s.professionProgress.legacyAccess.runecarving_grade_4).toBe(true);
    expect(s.professionProgress.work).toEqual({});
    expect(account.bank.rune_ember_4).toBe(1);
  });
  for (const activity of ['ordinary', 'heist']) it(`retains busy version-46 ${activity} state through two loads, without replaying rewards`, () => {
    const raw = fixture[activity];
    expect(raw.version).toBe(46);
    expect(raw.professionProgress).toBeUndefined();
    const s = deserialize(JSON.stringify(raw));
    s.account = structuredClone(fixture.account) as AccountState;
    settleCharacter(s, s.account);
    const again = reload(reload(s));
    expect(again.skills).toEqual({ astrology: 0, ...raw.skills, smelting: raw.skills.smithing, woodcrafting: raw.skills.smithing, agility: 0 });
    expect(again.skillingMastery).toEqual(raw.skillingMastery);
    expect(again.action).toMatchObject(raw.action);
    expect(again.action).toEqual(s.action);
    expect(again.greenhouse).toEqual(raw.greenhouse);
    expect(again.heist).toMatchObject({ rogues: raw.heist.rogues, exits: raw.heist.exits, auto: raw.heist.auto, tally: raw.heist.tally });
    expect(again.heist).toEqual(s.heist);
    expect(again.heist.roster?.lookout.level).toBe(4);
    expect(again.expedition).toEqual(raw.expedition);
    expect(again.inventory).toEqual(raw.inventory);
    expect(again.account.bank).toEqual(fixture.account.bank);
    expect(again.account.hideout).toEqual(fixture.account.hideout);
    expect(again.professionProgress.work).toEqual({});
    expect(again.professionProgress.counters).toEqual({ 'foraging.seedsMigrated': 1 });
    expect(again.professionProgress.projects).toEqual({});
    expect(again.professionProgress.discoveries.seed_frostleaf).toBe(true);
    expect(again.professionProgress.legacyAccess.smithing_work_60).toBe(true);
    expect(again.professionProgress).toEqual(s.professionProgress);
  });

  it('resolves clickable material sources and eliminates redundant unique mod descriptions', () => {
    const debt = PROFESSION_PROJECTS.find((p) => p.id === 'debt_of_stone')!;
    expect(debt).toBeDefined();

    // Check material source resolution
    const stoneAlloySrc = resolveMaterialSource('stone_alloy', debt.sources);
    expect(stoneAlloySrc).toBeDefined();
    expect(stoneAlloySrc?.skill).toBe('smithing');
    expect(stoneAlloySrc?.label).toMatch(/Stone Alloy/i);

    const adamantBarSrc = resolveMaterialSource('adamant_bar', debt.sources);
    expect(adamantBarSrc).toBeDefined();
    expect(adamantBarSrc?.skill).toBe('smithing');
    expect(adamantBarSrc?.label).toMatch(/Adamant Bar/i);

    const heartwoodSrc = resolveMaterialSource('heartwood_frame', debt.sources);
    expect(heartwoodSrc).toBeDefined();
    expect(heartwoodSrc?.skill).toBe('smithing');
    expect(heartwoodSrc?.label).toMatch(/Heartwood Frame/i);

    // Check description cleaning: strips duplicate unique mod verbatim
    const cleanedDebt = cleanProjectDesc(debt);
    expect(cleanedDebt).toBeDefined();
    expect(cleanedDebt).not.toContain('50% of incoming hit damage deferred');
    expect(cleanedDebt).not.toContain('item level 80');
    expect(cleanedDebt).toContain('Combat level 60 to equip');
    expect(cleanedDebt).toContain('One normal rune slot');

    // Check Hands of the Forgotten Choir base source and description
    const choir = PROFESSION_PROJECTS.find((p) => p.id === 'hands_forgotten_choir')!;
    expect(choir).toBeDefined();
    const baseSrc = resolveBaseSource(choir);
    expect(baseSrc?.skill).toBe('smithing');
    const cleanedChoir = cleanProjectDesc(choir);
    expect(cleanedChoir).not.toContain('Totem skills place two at once');
    expect(cleanedChoir).toContain('completely consuming the base into a new unique');
  });
});
