import { describe, expect, it } from 'vitest';
import { ANCIENT_DATA, CLUE_HOURS, CLUES_PER_PASSPORT, findDigs, LAYERS, SEALED_RELIC, siteOf, TRAIL } from '../src/data/expedition';
import { RELIC_FORMS, RELIC_ILVL, RELIC_TIER_COST } from '../src/data/relics';
import { actionDef } from '../src/data/skills';
import type { Ctx } from '../src/engine/context';
import {
  chosenLayer, clueProgress, commitMult, dataPerDig, hasPassport, relicChoices, relicCost, relicReason, relicTiers, restoreRelic, setLayer, settleExpedition, standing, unsealRelic,
} from '../src/engine/expedition';
import { seeded, type Rng } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';

/** never a cave-in, never a lucky roll */
const ctx = (): Ctx => ({ now: 0, rng: { next: () => 0.999 } as Rng, emit: () => {} });
const HOUR = 3_600_000;
const CAIRN = siteOf('dig_cairn')!;

function digger(level = 99): GameState {
  const s = newGame(1, { name: 'Trail', classId: 'warrior' });
  s.skills.archaeology = xpForLevel(level);
  return s;
}

const work = (s: GameState, ms: number) => skillStep(s, ctx(), ms, deriveStats(s));

describe('the Regional Trail', () => {
  it('runs through every site in level order and ends at the Relic Site', () => {
    const levels = TRAIL.map((id) => siteOf(id)!.level);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    expect(siteOf(TRAIL.at(-1)!)!.relic).toBe(true);
    const hazards = TRAIL.map((id) => siteOf(id)!.hazard);
    expect([...hazards].sort((a, b) => a - b)).toEqual(hazards);
  });

  it('stamps the next Passport after three Clue Fragments, about when the first find came before', () => {
    const s = digger();
    expect(hasPassport(s, 'dig_cutting')).toBe(false);
    expect(actionBlocker(s, actionDef('dig_cutting'))).toMatch(/Passport/);
    startSkillAction(s, ctx(), 'dig_cairn');
    work(s, CLUE_HOURS * HOUR);
    expect(clueProgress(s, CAIRN).clues).toBe(1);
    work(s, (CLUES_PER_PASSPORT - 1) * CLUE_HOURS * HOUR);
    expect(hasPassport(s, 'dig_cutting')).toBe(true);
    expect(clueProgress(s, CAIRN).done).toBe(true);
    expect(actionBlocker(s, actionDef('dig_cutting'))).toBeNull();
    expect(hasPassport(s, 'dig_barrow')).toBe(false);
  });

  it('keeps every site an old save could already dig', () => {
    const s = digger(85);
    s.expedition.dug.dig_cairn = findDigs(CAIRN)[0];
    s.expedition.dug.dig_cutting = 10;
    const raw = JSON.parse(serialize(s));
    for (const k of ['layer', 'clues', 'clueMs', 'passports', 'commit', 'forge', 'caveIns', 'relicsRestored', 'trailSchema']) delete raw.expedition[k];
    const old = deserialize(JSON.stringify(raw));
    // Cairn's first find opened the Cutting and the Colossus; the Cutting had been dug
    for (const id of ['dig_cutting', 'dig_colossus']) expect(hasPassport(old, id)).toBe(true);
    expect(hasPassport(old, 'dig_reliquary')).toBe(false);
    expect(actionBlocker(old, actionDef('dig_reliquary'))).toMatch(/Passport/);
  });
});

describe('Layers of History', () => {
  it('opens a layer at each find, and lets you go back up', () => {
    const s = digger();
    expect(chosenLayer(s, CAIRN)).toBe(0);
    expect(setLayer(s, 'dig_cairn', 2)).toMatch(/first/);
    s.expedition.dug.dig_cairn = findDigs(CAIRN)[1];
    expect(chosenLayer(s, CAIRN)).toBe(2);
    expect(setLayer(s, 'dig_cairn', 0)).toBeNull();
    expect(chosenLayer(s, CAIRN)).toBe(0);
  });

  it('digs Bedrock slower and Surface faster', () => {
    const s = digger();
    s.expedition.dug.dig_cairn = findDigs(CAIRN)[1];
    const a = actionDef('dig_cairn');
    const at = (layer: number) => { setLayer(s, 'dig_cairn', layer); return actionIntervalMs(s, a, deriveStats(s)); };
    expect(at(0) / at(1)).toBeCloseTo(LAYERS[0].speed);
    expect(at(2) / at(1)).toBeCloseTo(LAYERS[2].speed);
  });

  it('only the deepest layer goes deeper', () => {
    const s = digger();
    s.expedition.dug.dig_cairn = findDigs(CAIRN)[1];
    setLayer(s, 'dig_cairn', 0);
    startSkillAction(s, ctx(), 'dig_cairn');
    work(s, HOUR);
    expect(s.expedition.dug.dig_cairn).toBe(findDigs(CAIRN)[1]);
  });

  it('builds Commitment on one layer, which multiplies Ancient Data, and loses it on a switch', () => {
    const s = digger();
    s.expedition.dug.dig_cairn = findDigs(CAIRN)[1];
    const fresh = dataPerDig(s, CAIRN);
    startSkillAction(s, ctx(), 'dig_cairn');
    // real rolls, so Ancient Data turns up; a cave-in or two may shave Commitment
    skillStep(s, { ...ctx(), rng: seeded(7) }, 2 * HOUR, deriveStats(s));
    expect(commitMult(s, CAIRN)).toBeGreaterThan(2.5);
    expect(dataPerDig(s, CAIRN)).toBeGreaterThan(fresh * 2.4);
    expect(s.account.bank[ANCIENT_DATA]).toBeGreaterThan(0);
    setLayer(s, 'dig_cairn', 1);
    expect(commitMult(s, CAIRN)).toBe(1);
  });

  it('a cave-in shakes Commitment but the dig still counts', () => {
    const s = digger();
    s.expedition.commit = { key: 'dig_cairn:0', ms: HOUR };
    startSkillAction(s, ctx(), 'dig_cairn');
    if (s.action?.kind !== 'skill') throw new Error('not digging');
    s.action.progress = actionIntervalMs(s, actionDef('dig_cairn'), deriveStats(s));
    skillStep(s, { ...ctx(), rng: { next: () => 0 } as Rng }, 0, deriveStats(s));
    expect(s.expedition.caveIns).toBe(1);
    expect(s.expedition.commit.ms).toBeCloseTo(HOUR * 0.75);
    expect(s.expedition.dug.dig_cairn).toBeGreaterThan(0);
  });

  it('pays no standing at the Relic Site, and its first find holds a Sealed Relic', () => {
    const s = digger();
    s.expedition.passports = { dig_reliquary: true };
    const site = siteOf('dig_reliquary')!;
    s.expedition.dug.dig_reliquary = findDigs(site)[0] - 0.8;
    startSkillAction(s, ctx(), 'dig_reliquary');
    work(s, actionIntervalMs(s, actionDef('dig_reliquary'), deriveStats(s)));
    expect(s.account.bank[SEALED_RELIC]).toBe(1);
    expect(standing(s, 'giant')).toBe(0);
  });
});

describe('the Relic Forge', () => {
  const form = RELIC_FORMS.find((f) => f.id === 'small_kings_bulwark')!;

  function forge(): GameState {
    const s = digger();
    s.account.bank[SEALED_RELIC] = 1;
    s.account.bank[ANCIENT_DATA] = 2000;
    expect(unsealRelic(s, ctx(), form.id)).toBeNull();
    return s;
  }

  it('every form is a real base with modifiers to program', () => {
    for (const f of RELIC_FORMS) {
      expect(relicChoices(f.id, [], 'prefix').length).toBeGreaterThan(2);
      expect(relicChoices(f.id, [], 'suffix').length).toBeGreaterThan(2);
    }
  });

  it('needs a Sealed Relic, and holds one relic at a time', () => {
    const s = digger();
    expect(unsealRelic(s, ctx(), form.id)).toMatch(/Sealed Relic/);
    const t = forge();
    t.account.bank[SEALED_RELIC] = 1;
    expect(unsealRelic(t, ctx(), form.id)).toMatch(/already/);
  });

  it('programs exactly the modifiers chosen, at the top of their tiers, for Ancient Data', () => {
    const s = forge();
    const pre = relicChoices(form.id, [], 'prefix')[0];
    const suf = relicChoices(form.id, [], 'suffix')[0];
    const lines = [
      { affixId: pre.id, tier: relicTiers(pre.id).at(-1)! },
      { affixId: suf.id, tier: relicTiers(suf.id)[0] },
    ];
    const cost = relicCost(lines);
    expect(cost).toBeGreaterThanOrEqual(RELIC_TIER_COST[0]);
    expect(restoreRelic(s, ctx(), lines)).toBeNull();
    const item = s.inventory.at(-1)!;
    expect(item.relic).toBe(form.id);
    expect(item.name).toBe(form.name);
    expect(item.ilvl).toBe(RELIC_ILVL);
    expect(item.prefixes.map((m) => m.affixId)).toEqual([pre.id]);
    expect(item.suffixes.map((m) => m.affixId)).toEqual([suf.id]);
    expect(s.account.bank[ANCIENT_DATA]).toBe(2000 - cost);
    expect(s.expedition.forge).toBeNull();
    expect(s.expedition.relicsRestored).toBe(1);
  });

  it('refuses a clash, a fourth prefix or too little data', () => {
    const s = forge();
    const pres = relicChoices(form.id, [], 'prefix');
    const top = (id: string) => ({ affixId: id, tier: relicTiers(id).at(-1)! });
    expect(relicReason(s, [])).toMatch(/at least one/);
    expect(relicReason(s, [top(pres[0].id), top(pres[0].id)])).toMatch(/can't go/);
    const four: { affixId: string; tier: number }[] = [];
    for (const a of pres) {
      if (four.length === 4) break;
      if (relicChoices(form.id, four, 'prefix').some((x) => x.id === a.id)) four.push(top(a.id));
    }
    expect(relicReason(s, four)).toMatch(/At most 3/);
    s.account.bank[ANCIENT_DATA] = 1;
    expect(relicReason(s, [top(pres[0].id)])).toMatch(/Ancient Data/);
  });

  it('survives a save and load mid-forge', () => {
    const s = forge();
    const back = deserialize(serialize(s));
    expect(back.expedition.forge).toEqual({ formId: form.id });
    settleExpedition(back);
    expect(back.expedition.forge).toEqual({ formId: form.id });
  });
});
