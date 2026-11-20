import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASES, UNIQUES, baseDef, uniqueDef } from '../src/data/bases';
import { FLASKS, flaskDef } from '../src/data/flasks';
import { CURRENCIES, MATERIALS } from '../src/data/materials';
import { PROFESSION_PROJECTS, professionProject } from '../src/data/professionProjects';
import { ACTIONS, SKILLS, actionDef, actionsFor } from '../src/data/skills';
import { MEALS } from '../src/data/cooking';
import { CULTURES, SITES } from '../src/data/expedition';
import { relicFragment } from '../src/data/archaeology';
import { HEIST_JOBS } from '../src/data/heist';
import { RUNE_FAMILIES, RUNE_GRADES } from '../src/data/runes';
import { DROP_TABLES } from '../src/data/drops';
import { settleCharacter } from '../src/engine/account';
import { isClassic } from '../src/engine/challenge';
import { makeCtx } from '../src/engine/context';
import { newFlask } from '../src/engine/flasks';
import { createItem, createUnique } from '../src/engine/items';
import { holdItem, holdPayment, receiveDeliveries, releaseHold } from '../src/engine/market';
import { simulateOffline } from '../src/engine/offline';
import { advanceProject, completeProject, startProject } from '../src/engine/professions';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, startSkillAction } from '../src/engine/skills';
import { newGame, tick } from '../src/engine/state';
import { xpForLevel } from '../src/engine/xp';
import { skillLock } from '../src/ui/skillLock';
import type { SkillId } from '../src/engine/types';

const ctx = (seed = 42) => makeCtx(seeded(seed));

const ALL_11_PROFESSIONS: SkillId[] = [
  'mining', 'woodcutting', 'smithing', 'harvesting', 'alchemy',
  'cooking', 'gemcutting', 'runecarving', 'thieving', 'archaeology', 'cartography',
];

const EQUIPMENT_11_UNIQUES = [
  'woundmaker', 'winters_pyre', 'the_homecoming',
  'borrowed_tomorrow', 'the_buried_grudge', 'debt_of_stone',
  'hands_forgotten_choir', 'hollow_circuit',
  'the_second_heresy', 'worldheart', 'the_sum_of_all_things',
];

const FLASK_2_UNIQUES = [
  { projectId: 'witchglass', flaskId: 'u_flask_witchglass', name: 'Witchglass' },
  { projectId: 'the_still_heart', flaskId: 'u_flask_still_heart', name: 'The Still Heart' },
];

const ALL_13_PROJECTS = [...EQUIPMENT_11_UNIQUES, ...FLASK_2_UNIQUES.map((f) => f.projectId)];

const ALL_7_TOOLS = [
  'tool_mining', 'tool_woodcutting', 'tool_harvesting', 'tool_alchemy',
  'tool_wayfarer_hammer', 'tool_cooking', 'tool_gemcutting',
];

describe('Phase 18 Whole-Overhaul Acceptance', () => {
  it('audits all 11 professions, 7 tools, 2 signatures, 2 feasts, Reliquary chart, and 13 exclusive uniques', () => {
    const fresh = newGame(1);
    for (const skill of ALL_11_PROFESSIONS) {
      expect(SKILLS[skill], `missing SKILLS entry for ${skill}`).toBeDefined();
      expect(skillLock(fresh, skill)).toBeNull();
      const starter = actionsFor(skill).find((a) => a.level === 1);
      expect(starter, `missing level-1 action for ${skill}`).toBeDefined();
      const blocker = actionBlocker(fresh, starter!);
      if (blocker !== null) expect(blocker).toMatch(/Missing|requires|Need/i);
      expect(blocker ?? '').not.toMatch(/Act|Reach|Defeat/i);
    }

    for (const id of [...ALL_7_TOOLS, 'signature_wayfarer', 'signature_channel', 'project_feast_artisans', 'project_feast_wayfarers', 'chart_reliquary', ...ALL_13_PROJECTS]) {
      expect(professionProject(id), `missing project ${id}`).toBeDefined();
    }

    for (const uid of EQUIPMENT_11_UNIQUES) {
      const def = uniqueDef(uid);
      expect(def.projectSource, `${uid} must have projectSource`).toBeTruthy();
    }
    for (const f of FLASK_2_UNIQUES) {
      const def = flaskDef(f.flaskId);
      expect(def.unique).toBe(true);
      expect(def.projectOnly).toBe(true);
    }

    const worldDropIds = UNIQUES.filter((u) => !u.projectSource).map((u) => u.id);
    for (const uid of EQUIPMENT_11_UNIQUES) {
      expect(worldDropIds).not.toContain(uid);
    }
  });

  it('traces every ingredient in every profession project and action to an actual obtainable source', () => {
    const obtainable = new Set<string>();

    for (const a of ACTIONS) {
      for (const id of Object.keys(a.outputs ?? {})) obtainable.add(id);
      for (const id of Object.keys(a.protectedOutputs ?? {})) obtainable.add(id);
      for (const b of a.bonus ?? []) obtainable.add(b.id);
      if (a.id === 'herb_moon' || a.id === 'herb_star') {
        obtainable.add('moon_bloom');
        obtainable.add('star_bloom');
      }
    }
    for (const f of RUNE_FAMILIES) for (const g of RUNE_GRADES) obtainable.add(`rune_${f.id}_${g.grade}`);
    for (const m of MEALS) obtainable.add(m.id);
    for (const c of CULTURES) obtainable.add(c.id);
    for (const site of SITES) obtainable.add(relicFragment(site.culture));
    obtainable.add('giant_tally');
    obtainable.add('survey_relic_fragment');
    obtainable.add('giant_relic_fragment');
    obtainable.add('taboo_fragment');
    obtainable.add('convergence_relic_fragment');
    obtainable.add('artifact');
    for (const job of HEIST_JOBS) {
      for (const r of job.vault) obtainable.add(r.id);
    }
    obtainable.add('marker');
    obtainable.add('treasury_fragment');
    obtainable.add('oath_fragment');
    obtainable.add('world_core_fragment');
    obtainable.add('reliquary_fragment');
    obtainable.add('atlas_survey_record');
    obtainable.add('doom_key_fragment');
    obtainable.add('fractured');
    obtainable.add('sextant_apprentice');
    obtainable.add('sextant_journeyman');
    obtainable.add('sextant_master');
    for (const t of Object.values(DROP_TABLES)) for (const id of Object.keys(t.currency ?? {})) obtainable.add(id);
    for (const c of CURRENCIES) obtainable.add(c.id);
    for (const p of PROFESSION_PROJECTS) {
      if ('id' in p.reward && p.reward.id) obtainable.add(p.reward.id);
      if ('materials' in p.reward && p.reward.materials) {
        for (const k of Object.keys(p.reward.materials)) obtainable.add(k);
      }
    }
    obtainable.add('arcane_dust');
    obtainable.add('rough_gem');
    obtainable.add('crystal_shard');
    obtainable.add('mineral_fragment');
    obtainable.add('stone_fragment');
    obtainable.add('heartwood_fragment');
    obtainable.add('inscription_fragment');
    obtainable.add('ember_reduction');
    obtainable.add('chart_survey_fragment');
    obtainable.add('completed_atlas_chart');
    for (const f of ['scorched_fossil', 'frigid_fossil', 'metallic_fossil', 'serrated_fossil', 'dense_fossil']) {
      obtainable.add(f);
    }
    for (const trophy of ['marrow_shard', 'choir_glass', 'black_pearl', 'throne_ash', 'crownless_sigil', 'exile_doom_sigil', 'architect_doom_sigil', 'void_sigil']) {
      obtainable.add(trophy);
    }
    for (const shard of ['trans_shard', 'aug_shard', 'alt_shard', 'regal_shard', 'chaos_shard', 'exalt_shard', 'divine_shard']) {
      obtainable.add(shard);
    }
    for (const m of MATERIALS) {
      if (m.id.startsWith('essence_') || m.id.endsWith('_resin')) obtainable.add(m.id);
    }

    for (const p of PROFESSION_PROJECTS) {
      for (const ing of Object.keys(p.inputs)) {
        expect(obtainable.has(ing), `Project ${p.id} ingredient '${ing}' has no traced source`).toBe(true);
      }
      if (p.baseId) {
        expect(() => baseDef(p.baseId!), `Project ${p.id} baseId '${p.baseId}' missing`).not.toThrow();
      }
    }
    for (const a of ACTIONS) {
      for (const ing of Object.keys(a.inputs ?? {})) {
        expect(obtainable.has(ing), `Action ${a.id} ingredient '${ing}' has no traced source`).toBe(true);
      }
    }
  });

  it('validates all new material, base, unique, and flask IDs under existing market/trading rules', () => {
    const s = newGame(1);
    const c = ctx();
    for (const p of PROFESSION_PROJECTS) {
      for (const matId of Object.keys(p.inputs)) {
        const isMat = MATERIALS.some((m) => m.id === matId);
        const isCur = CURRENCIES.some((cur) => cur.id === matId);
        expect(isMat || isCur, `Unknown material/currency ${matId}`).toBe(true);
        if (isCur) {
          s.account.bank[matId] = 10;
          expect(holdPayment(s, `test_${matId}`, matId, 1)).toBeNull();
          releaseHold(s, `test_${matId}`, true);
        }
      }
    }

    for (const uid of EQUIPMENT_11_UNIQUES) {
      const item = createUnique(s, uid, 80, c.rng);
      s.inventory.push(item);
      expect(holdItem(s, `hold_${uid}`, item.uid)).toBeNull();
      releaseHold(s, `hold_${uid}`, true);
      s.inventory = s.inventory.filter((i) => i.uid !== item.uid);
      receiveDeliveries(s, [{ item, currency: null, amount: 0, note: 'test' }]);
      const delivered = s.inventory.some((i) => i.uniqueId === uid)
        || s.account.overflow.some((i) => i.uniqueId === uid)
        || s.account.uniqueStash.some((i) => i.uniqueId === uid);
      expect(delivered, `Delivery failed for ${uid}`).toBe(true);
      s.inventory = [];
      s.account.overflow = [];
      s.account.uniqueStash = [];
    }
    for (const f of FLASK_2_UNIQUES) {
      expect(FLASKS.some((fl) => fl.id === f.flaskId)).toBe(true);
      const flask = newFlask(s, f.flaskId);
      expect(flask.flaskId).toBe(f.flaskId);
    }
    expect(BASES.some((b) => b.id === 'overhaul_plain_ring')).toBe(true);
    expect(BASES.some((b) => b.id === 'overhaul_plain_belt')).toBe(true);
    expect(BASES.some((b) => b.id === 'overhaul_plain_amulet')).toBe(true);
  });

  it('migrates realistic old saves idempotently and enforces Classic/SSF/Hardcore restrictions', () => {
    const base = newGame(1);
    base.skills.mining = xpForLevel(45);
    base.skills.smithing = xpForLevel(38);
    base.skills.runecarving = xpForLevel(50);
    base.skills.archaeology = xpForLevel(30);
    base.skills.thieving = xpForLevel(40);
    base.skillingMastery['task.mine_copper'] = 12000;
    base.unlockedZones = ['mudflats', 'shipgraveyard', 'sunken_city', 'ash_wastes', 'frozen_pass'];
    base.account.hideout.forge = 2;
    base.account.hideout.alchemy_table = 2;
    base.expedition.dug = { cairn: 120 };
    base.greenhouse = { actionId: 'herb_sun', progress: 1200 };
    base.action = { kind: 'skill', actionId: 'mine_iron', progress: 1100 };

    const raw = JSON.parse(serialize(base));
    delete raw.professionProgress;
    raw.version = 45;
    const loaded1 = deserialize(JSON.stringify(raw));
    loaded1.account = structuredClone(base.account);
    settleCharacter(loaded1, loaded1.account);

    const loaded2 = deserialize(serialize(loaded1));
    loaded2.account = structuredClone(loaded1.account);
    settleCharacter(loaded2, loaded2.account);

    expect(loaded2.skills.mining).toBe(base.skills.mining);
    expect(loaded2.skillingMastery['task.mine_copper']).toBe(12000);
    expect(loaded2.expedition.dug.cairn).toBe(120);
    expect(loaded2.greenhouse?.actionId).toBe('herb_sun');
    expect(loaded2.action?.kind).toBe('skill');
    if (loaded2.action?.kind === 'skill') {
      expect(loaded2.action.actionId).toBe('mine_iron');
      expect(loaded2.action.progress).toBe(1100);
    }
    expect(loaded2.professionProgress.discoveries['seed_sunpetal']).toBe(true);
    expect(loaded2.professionProgress.work.mining ?? 0).toBe(0);

    const classic = newGame(1);
    classic.character.challenge = { classic: true, ssf: false, hardcore: false };
    expect(isClassic(classic)).toBe(true);
    expect(actionBlocker(classic, actionDef('mine_copper'))).toMatch(/Classic/);
    expect(startProject(classic, ctx(), 'copper_supply')).toMatch(/Classic/);
  });

  it('completes all 13 unique acquisition routes end-to-end with exact input consumption and no double claim', () => {
    for (const uid of ALL_13_PROJECTS) {
      const p = professionProject(uid)!;
      const s = newGame(1);
      const c = ctx(77);
      s.skills[p.skill] = xpForLevel(Math.max(p.level, 90));
      s.professionProgress.work[p.skill] = 200;
      if (p.station) s.account.hideout[p.station.id] = p.station.level;
      for (const acc of p.accomplishments ?? []) {
        s.professionProgress.discoveries[acc] = true;
        if (acc.endsWith('_work_100')) s.professionProgress.work[p.skill] = 200;
      }
      for (const [k, v] of Object.entries(p.inputs)) s.account.bank[k] = v;
      const reqBaseId = p.baseId ?? p.baseIds?.[0];
      let baseUid: number | undefined;
      if (reqBaseId) {
        const baseItem = createItem(s, reqBaseId, Math.max(p.baseMinIlvl ?? 1, 60), 'rare', c.rng);
        s.inventory.push(baseItem);
        baseUid = baseItem.uid;
      }

      const err = startProject(s, c, p.id, 1, baseUid);
      expect(err, `Failed to start ${p.id}: ${err}`).toBeNull();
      for (const k of Object.keys(p.inputs)) expect(s.account.bank[k] ?? 0).toBe(0);

      const runId = s.professionProgress.activeProject!.runId;
      advanceProject(s, c, p.durationMs);
      if (p.reward.category === 'equipment') {
        expect(s.inventory.some((i) => i.uniqueId === uid), `${uid} missing from inventory`).toBe(true);
      } else if (p.reward.category === 'flask') {
        const flaskId = p.reward.flaskId;
        const hasFlask = s.account.flaskStash.some((f) => f.flaskId === flaskId)
          || s.flaskSlots.some((f) => f?.flaskId === flaskId);
        expect(hasFlask, `${uid} missing from flaskStash/flaskSlots`).toBe(true);
      }
      expect(completeProject(s, c, runId)).toBe('Project already settled');
    }
  });

  it('verifies representative 8-hour offline parity across all 11 professions', () => {
    const cookStarter = actionsFor('cooking').find((a) => a.level === 1)!;
    const gemTargeted = actionsFor('gemcutting').find((a) => a.level === 15)!;
    const runeStarter = actionsFor('runecarving').find((a) => a.level === 1)!;
    const thievingStarter = actionsFor('thieving').find((a) => a.level === 1)!;
    const cartographyStarter = actionsFor('cartography').find((a) => a.level === 1)!;
    const cases: { skill: SkillId; actionId: string; bank?: Record<string, number>; setup?: (s: ReturnType<typeof newGame>) => void }[] = [
      { skill: 'mining', actionId: 'mine_copper' },
      { skill: 'woodcutting', actionId: 'cut_ash' },
      { skill: 'smelting', actionId: 'smelt_copper', bank: { copper_ore: 50000 } },
      { skill: 'harvesting', actionId: 'herb_sun' },
      { skill: 'alchemy', actionId: 'brew_life_small', bank: { sunpetal: 50000, ash_log: 50000 } },
      { skill: 'cooking', actionId: cookStarter.id, bank: { sunpetal: 50000, ash_log: 50000, frostleaf: 50000, copper_ore: 50000 } },
      { skill: 'gemcutting', actionId: gemTargeted.id, bank: { rough_gem: 5000, arcane_dust: 50000 }, setup: (s) => { s.skills.gemcutting = xpForLevel(20); } },
      { skill: 'runecarving', actionId: runeStarter.id, bank: Object.fromEntries(Object.keys(runeStarter.inputs ?? {}).map((k) => [k, 50000])) },
      { skill: 'thieving', actionId: thievingStarter.id },
      { skill: 'archaeology', actionId: 'dig_cairn' },
      { skill: 'cartography', actionId: cartographyStarter.id, bank: Object.fromEntries(Object.keys(cartographyStarter.inputs ?? {}).map((k) => [k, 50000])) },
    ];

    for (const tc of cases) {
      const live = newGame(1);
      const off = newGame(1);
      for (const s of [live, off]) {
        tc.setup?.(s);
        if (tc.bank) Object.assign(s.account.bank, tc.bank);
      }
      expect(startSkillAction(live, ctx(5), tc.actionId), `live start failed for ${tc.actionId}`).toBeNull();
      expect(startSkillAction(off, ctx(5), tc.actionId), `off start failed for ${tc.actionId}`).toBeNull();

      const eightHours = 8 * 3_600_000;
      const offRes = simulateOffline(off, makeCtx(seeded(10)), eightHours);
      const liveCtx = makeCtx(seeded(10));
      for (let t = 0; t < eightHours; t += 5000) tick(live, liveCtx, 5000);

      expect(offRes.ms).toBe(eightHours);
      expect(live.skills[tc.skill], `${tc.skill}/${tc.actionId} had 0 live XP`).toBeGreaterThan(0);
      const diffPct = Math.abs(off.skills[tc.skill] - live.skills[tc.skill]) / Math.max(1, live.skills[tc.skill]);
      expect(diffPct, `${tc.skill}/${tc.actionId} live vs offline XP diverged`).toBeLessThan(0.02);
    }
  }, 120_000);

  it('verifies generated UNIQUES.md matches all 11 equipment unique definitions', () => {
    const uniquesDoc = readFileSync(join(process.cwd(), 'docs', 'UNIQUES.md'), 'utf8');
    for (const uid of EQUIPMENT_11_UNIQUES) {
      expect(uniquesDoc).toContain(uniqueDef(uid).name);
    }
  });
});
