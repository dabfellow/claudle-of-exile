import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { actionDef, actionsFor } from '../src/data/skills';
import { flaskDef } from '../src/data/flasks';
import { alchemyCategory } from '../src/data/alchemy';
import { alchemyPreview } from '../src/engine/alchemy';
import { makeCtx } from '../src/engine/context';
import { newGame, tick } from '../src/engine/state';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { deriveStats } from '../src/engine/stats';
import { xpForLevel } from '../src/engine/xp';
import { deserialize, serialize } from '../src/engine/save';
import { simulateOffline } from '../src/engine/offline';
import { advanceProject, startProject } from '../src/engine/professions';
import { upgradeStation } from '../src/engine/hideout';
import { equip } from '../src/engine/equipment';
import type { GameState } from '../src/engine/types';

const ctx = () => makeCtx({ next: () => 0.999999 });
const reload = (s: GameState) => {
  const account = structuredClone(s.account);
  s = deserialize(serialize(s));
  s.account = account;
  return s;
};

function cycles(s: GameState, id: string, n: number, double = false) {
  expect(startSkillAction(s, ctx(), id)).toBeNull();
  for (let i = 0; i < n; i++) {
    if (s.action?.kind === 'skill') s.action.double = double;
    const def = actionDef(id);
    const d = deriveStats(s);
    skillStep(s, ctx(), actionIntervalMs(s, def, d) - (s.action?.kind === 'skill' ? s.action.progress : 0) + 0.000001, d);
  }
}

function advancedAlchemist() {
  const s = newGame(1);
  s.skills.alchemy = xpForLevel(70);
  s.professionProgress.work.alchemy = 100;
  s.account.hideout.alchemy_table = 3;
  return s;
}

describe('Phase 07 Alchemy', () => {
  it('allows starting Alchemy and upgrading Table 2/3 without combat', () => {
    const s = newGame(1);
    expect(actionBlocker(s, actionDef('brew_life_small'))).toBe('Missing materials');
    s.account.bank = { sunpetal: 10, ash_log: 4 };
    expect(actionBlocker(s, actionDef('brew_life_small'))).toBeNull();

    // Table 2 requirement on Medium Mana Flask
    s.skills.alchemy = xpForLevel(15);
    s.account.bank = { frostleaf: 10, oak_log: 10 };
    expect(actionBlocker(s, actionDef('brew_mana_medium'))).toBe('Needs Alchemy Table level 2');

    // Noncombat purchase of Table 2
    s.professionProgress.work.alchemy = 20;
    s.account.bank.gold = 300;
    s.account.bank.sunpetal = 40;
    s.account.bank.ash_plank = 5;
    expect(upgradeStation(s, ctx(), 'alchemy_table', 'profession')).toBeNull();
    expect(s.account.hideout.alchemy_table).toBe(2);
    expect(actionBlocker(s, actionDef('brew_mana_medium'))).toBeNull();

    // Noncombat purchase of Table 3
    s.skills.alchemy = xpForLevel(18);
    s.professionProgress.work.alchemy = 60;
    s.account.bank.gold = 1200;
    s.account.bank.frostleaf = 60;
    s.account.bank.iron_bar = 10;
    expect(upgradeStation(s, ctx(), 'alchemy_table', 'profession')).toBeNull();
    expect(s.account.hideout.alchemy_table).toBe(3);

    // No combat was ever entered
    expect(s.skills.combat).toBe(0);
    expect(s.bossesDefeated).toEqual([]);
  });

  it('brews Medium Mana Flask and delivers to flask stash with correct stats', () => {
    const s = advancedAlchemist();
    s.account.bank = { frostleaf: 12, oak_log: 6 };
    const beforeStash = s.account.flaskStash.length;

    cycles(s, 'brew_mana_medium', 1);

    expect(s.account.flaskStash.length).toBe(beforeStash + 1);
    const flask = s.account.flaskStash[s.account.flaskStash.length - 1];
    expect(flask.flaskId).toBe('mana_medium');
    const def = flaskDef(flask.flaskId);
    expect(def.heal).toBe(140);
    expect(def.durationMs).toBe(3000);
    expect(def.maxCharges).toBe(30);
    expect(def.chargesPerUse).toBe(6);
    expect(s.account.bank.frostleaf).toBe(6);
    expect(s.account.bank.oak_log).toBe(3);
  });

  it('categorizes recipes into Life, Mana, Defence, Utility, Special Reagents, and Currency', () => {
    const actions = actionsFor('alchemy');
    const life = actions.filter((a) => alchemyCategory(a) === 'life');
    const mana = actions.filter((a) => alchemyCategory(a) === 'mana');
    const defence = actions.filter((a) => alchemyCategory(a) === 'defence');
    const utility = actions.filter((a) => alchemyCategory(a) === 'utility');
    const reagents = actions.filter((a) => alchemyCategory(a) === 'reagents');
    const currency = actions.filter((a) => alchemyCategory(a) === 'currency');

    expect(life.map((a) => a.id)).toEqual(['brew_life_small', 'brew_life_medium', 'brew_life_grand', 'brew_life_sacred']);
    expect(mana.map((a) => a.id)).toEqual(['brew_mana_small', 'brew_mana_medium', 'brew_mana_sacred']);
    expect(defence.map((a) => a.id)).toEqual(['brew_granite', 'brew_ruby', 'brew_amethyst']);
    expect(utility.map((a) => a.id)).toEqual(['brew_quicksilver', 'brew_diamond', 'brew_sulphur']);
    expect(reagents.map((a) => a.id)).toEqual(['prepare_glass', 'distill_moon', 'distill_star']);
    expect(currency.length).toBeGreaterThanOrEqual(10);
  });

  it('provides readable preview text with recovery per second, duration, charges and currency details', () => {
    const s = advancedAlchemist();
    const lifeLines = alchemyPreview(s, actionDef('brew_life_medium'));
    expect(lifeLines.some((l) => l.includes('133 Life/s'))).toBe(true);
    expect(lifeLines.some((l) => l.includes('28 charges total'))).toBe(true);

    const manaLines = alchemyPreview(s, actionDef('brew_mana_medium'));
    expect(manaLines.some((l) => l.includes('47 Mana/s'))).toBe(true);
    expect(manaLines.some((l) => l.includes('30 charges total'))).toBe(true);

    const graniteLines = alchemyPreview(s, actionDef('brew_granite'));
    expect(graniteLines.some((l) => l.includes('Armour'))).toBe(true);

    const transLines = alchemyPreview(s, actionDef('orb_transmute'));
    expect(transLines.some((l) => l.includes('Transmutes') || l.includes('normal'))).toBe(true);

    const batchLines = alchemyPreview(s, actionDef('orb_transmute_x10'));
    expect(batchLines.some((l) => l.includes('15% material discount'))).toBe(true);
  });

  it('crafts protected special reagents with full input payment and safe delivery', () => {
    const s = advancedAlchemist();
    // Enable 100% input conservation and manual doubles to verify protected bypass
    s.skillPassives = ['skill_core'];
    s.account.bank = {
      rough_gem: 6,
      sunpetal: 20,
      moon_bloom: 4,
      frostleaf: 20,
      star_bloom: 4,
      voidbloom: 20,
    };

    // prepare_glass
    cycles(s, 'prepare_glass', 1, true);
    expect(s.account.bank.prepared_glass).toBe(1);
    expect(s.account.bank.rough_gem).toBe(3);
    expect(s.account.bank.sunpetal).toBe(10);

    // distill_moon
    cycles(s, 'distill_moon', 1, true);
    expect(s.account.bank.moon_distillate).toBe(1);
    expect(s.account.bank.moon_bloom).toBe(2);
    expect(s.account.bank.frostleaf).toBe(10);

    // distill_star
    cycles(s, 'distill_star', 1, true);
    expect(s.account.bank.star_distillate).toBe(1);
    expect(s.account.bank.star_bloom).toBe(2);
    expect(s.account.bank.voidbloom).toBe(10);
  });

  it('crafts and equips Distiller’s Stirrer providing +8% Alchemy speed', () => {
    const s = advancedAlchemist();
    s.account.bank = { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 };

    expect(startProject(s, ctx(), 'tool_alchemy')).toBeNull();
    advanceProject(s, ctx(), 1_200_000);

    const tool = s.inventory.find((i) => i.name === "Distiller's Stirrer")!;
    expect(tool).toBeDefined();
    expect(tool.rarity).toBe('magic');
    expect(tool.suffixes).toEqual([{ affixId: 'profession_speed_alchemy', tier: 0, values: [8] }]);

    const dBefore = deriveStats(s);
    const intervalBefore = actionIntervalMs(s, actionDef('brew_mana_medium'), dBefore);

    expect(equip(s, ctx(), tool.uid)).toBeNull();
    const dAfter = deriveStats(s);
    const intervalAfter = actionIntervalMs(s, actionDef('brew_mana_medium'), dAfter);

    expect(intervalAfter).toBeLessThan(intervalBefore);
    expect(+(intervalBefore / intervalAfter).toFixed(2)).toBe(1.08);
  });

  it('preserves 8-hour live vs offline catch-up parity for Alchemy', () => {
    const setup = () => {
      const s = advancedAlchemist();
      s.account.bank = { arcane_dust: 50_000, sunpetal: 50_000 };
      expect(startSkillAction(s, ctx(), 'orb_transmute')).toBeNull();
      return s;
    };

    const online = setup();
    const offline = reload(setup());
    const c = ctx();

    for (let i = 0; i < 28800; i++) tick(online, c, 1000);
    const summary = simulateOffline(offline, ctx(), 28_800_000);

    expect(offline.account.bank).toEqual(online.account.bank);
    expect(offline.skills.alchemy).toEqual(online.skills.alchemy);
    expect(offline.professionProgress.work.alchemy).toBe(online.professionProgress.work.alchemy);
    expect(summary.ordinaryOutput?.transmute).toBeGreaterThan(0);
  }, 30_000);

  it('preserves pre-overhaul version-46 save fixture with full bag and stations across reloads', () => {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/profession-v46.json', import.meta.url), 'utf8'));
    let s = deserialize(JSON.stringify(fixture.ordinary));
    s.account = structuredClone(fixture.account);

    const initialStash = structuredClone(s.account.flaskStash);
    const initialSkills = { ...s.skills };
    const initialHideout = { ...s.account.hideout };

    s = reload(reload(s));

    expect(s.account.flaskStash).toEqual(initialStash);
    expect(s.skills).toEqual(initialSkills);
    expect(s.account.hideout.alchemy_table).toBe(initialHideout.alchemy_table);
    expect(s.inventory.length).toBe(60);
  });
});
