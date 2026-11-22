import { describe, expect, it } from 'vitest';
import { ANCIENT_DATA, findDigs, SEALED_RELIC, siteOf, TRAIL } from '../src/data/expedition';
import { RELIC_FORMS, RELIC_ILVL, RELIC_TIER_COST } from '../src/data/relics';
import { actionDef } from '../src/data/skills';
import type { Ctx } from '../src/engine/context';
import {
  hasPassport, relicChoices, relicCost, relicReason, relicTiers, restoreRelic, settleExpedition, standing, unsealRelic,
} from '../src/engine/expedition';
import type { Rng } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';

/** never a lucky roll */
const ctx = (): Ctx => ({ now: 0, rng: { next: () => 0.999 } as Rng, emit: () => {} });
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
  });

  it('opens only the first site until a chapter hands out a Passport', () => {
    const s = digger();
    expect(hasPassport(s, 'dig_cutting')).toBe(false);
    expect(actionBlocker(s, actionDef('dig_cutting'))).toMatch(/Passport: translate Giants chapter 2/);
    expect(actionBlocker(s, actionDef('dig_cairn'))).toBeNull();
    s.expedition.passports = { dig_cutting: true };
    expect(actionBlocker(s, actionDef('dig_cutting'))).toBeNull();
    expect(hasPassport(s, 'dig_barrow')).toBe(false);
  });

  it('keeps every site an old save could already dig', () => {
    const s = digger(85);
    s.expedition.dug.dig_cairn = findDigs(CAIRN)[0];
    s.expedition.dug.dig_cutting = 10;
    const raw = JSON.parse(serialize(s));
    for (const k of ['passports', 'forge', 'relicsRestored', 'trailSchema']) delete raw.expedition[k];
    const old = deserialize(JSON.stringify(raw));
    // Cairn's first find opened the Cutting and the Colossus; the Cutting had been dug
    for (const id of ['dig_cutting', 'dig_colossus']) expect(hasPassport(old, id)).toBe(true);
    expect(hasPassport(old, 'dig_reliquary')).toBe(false);
    expect(actionBlocker(old, actionDef('dig_reliquary'))).toMatch(/Passport/);
  });
});

describe('the Relic Site', () => {
  it('pays no standing, and its first find holds a Sealed Relic', () => {
    const s = digger();
    s.expedition.passports = { dig_reliquary: true };
    const site = siteOf('dig_reliquary')!;
    s.expedition.dug.dig_reliquary = findDigs(site)[0] - 1;
    startSkillAction(s, ctx(), 'dig_reliquary');
    work(s, actionIntervalMs(s, actionDef('dig_reliquary'), deriveStats(s)));
    expect(s.storage.bank[SEALED_RELIC]).toBe(1);
    expect(standing(s, 'giant')).toBe(0);
  });

  it('gives more Sealed Relics as you dig it, one per 12 base hours', () => {
    const s = digger();
    s.expedition.passports = { dig_reliquary: true };
    startSkillAction(s, { ...ctx(), rng: { next: () => 0 } as Rng }, 'dig_reliquary');
    if (s.action?.kind !== 'skill') throw new Error('not digging');
    s.action.progress = actionIntervalMs(s, actionDef('dig_reliquary'), deriveStats(s));
    skillStep(s, { ...ctx(), rng: { next: () => 0 } as Rng }, 0, deriveStats(s));
    expect(s.storage.bank[SEALED_RELIC]).toBeGreaterThanOrEqual(1);
  });
});

describe('the Relic Forge', () => {
  const form = RELIC_FORMS.find((f) => f.id === 'small_kings_bulwark')!;

  function forge(): GameState {
    const s = digger();
    s.archaeology.forms.push(form.id);
    s.storage.bank[SEALED_RELIC] = 1;
    s.storage.bank[ANCIENT_DATA] = 2000;
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
    s.storage.bank[SEALED_RELIC] = 0;
    expect(unsealRelic(s, ctx(), form.id)).toMatch(/story/);
    s.archaeology.forms.push(form.id);
    expect(unsealRelic(s, ctx(), form.id)).toMatch(/Sealed Relic/);
    const t = forge();
    t.storage.bank[SEALED_RELIC] = 1;
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
    expect(s.storage.bank[ANCIENT_DATA]).toBe(2000 - cost);
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
    s.storage.bank[ANCIENT_DATA] = 1;
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
