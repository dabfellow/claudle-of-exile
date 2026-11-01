import { describe, expect, it } from 'vitest';
import { CULTURES, digChance, EXPEDITION_GATE, findDigs, MAX_STANDING, SITES, siteOf, STRATA, STRATUM_YIELD, wareDef, WARES, WHETSTONE } from '../src/data/expedition';
import { actionDef, actionsFor, SKILLS, UPCOMING_SKILLS } from '../src/data/skills';
import { SKILL_TREE_NODES } from '../src/data/skillTree';
import type { Ctx } from '../src/engine/context';
import { applyWhetstone, restoreImpression, takeImpression, whetstoneReason } from '../src/engine/crafting';
import { artifactsPerDig, buyWare, expeditionOpen, fillOrders, setOrder, shelvesFor, siteStratum, standing, stratumProgress, warePrice, wareLeft, wareReason } from '../src/engine/expedition';
import { allMods, createItem } from '../src/engine/items';
import { focusOf, hasMinigame, minigameSwing } from '../src/engine/minigame';
import { simulateOffline } from '../src/engine/offline';
import { seeded, type Rng } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { skillTreePoints } from '../src/engine/skillTree';
import { newGame, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, Item } from '../src/engine/types';
import { levelOf, xpForLevel } from '../src/engine/xp';
import { affixDef } from '../src/data/affixes';

const ctx = (seed = 1): Ctx => ({ rng: seeded(seed), now: 0, emit: () => {} });
/** An rng that always rolls this, to force or rule out a find. */
const fixed = (v: number): Ctx => ({ rng: { next: () => v } as Rng, now: 0, emit: () => {} });
const CAIRN = siteOf('dig_cairn')!;
const TALLY = 'giant_tally';

function digger(level = 1): GameState {
  const s = newGame(1, { name: 'A', classId: 'warrior' });
  s.unlockedZones.push(EXPEDITION_GATE.zone);
  s.skills.archaeology = xpForLevel(level);
  return s;
}

/** Finish one dig on whatever is running. */
function dig(s: GameState, c: Ctx): void {
  if (s.action?.kind !== 'skill') throw new Error('no dig under way');
  s.action.progress = actionIntervalMs(s, actionDef(s.action.actionId), deriveStats(s));
  skillStep(s, c, 0, deriveStats(s));
}

describe('Archaeology', () => {
  it('is a real skill and has left the Coming soon list', () => {
    expect(SKILLS.archaeology.soon).toBeUndefined();
    expect(SKILLS.archaeology.group).toBe('gathering');
    expect(UPCOMING_SKILLS.some((u) => u.name === 'Archaeology')).toBe(false);
  });

  it('waits for Act 4, and stays shut for a save that finished Act 3', () => {
    const s = newGame(1, { name: 'A', classId: 'warrior' });
    s.skills.archaeology = 1e7;
    expect(expeditionOpen(s)).toBe(false);
    for (const a of actionsFor('archaeology')) expect(actionBlocker(s, a)).toMatch(/Act 4/);
    expect(startSkillAction(s, ctx(), 'dig_cairn')).toMatch(/Act 4/);
    expect(s.action?.kind).not.toBe('skill');
    expect(wareReason(s, 'giant_regal')).toMatch(/Act 4/);
    s.unlockedZones.push(EXPEDITION_GATE.zone);
    expect(expeditionOpen(s)).toBe(true);
    expect(actionBlocker(s, actionDef('dig_cairn'))).toBeNull();
  });

  it('every site takes no inputs and is gated on hollowpass', () => {
    expect(EXPEDITION_GATE.zone).toBe('hollowpass');
    expect(actionsFor('archaeology')).toHaveLength(SITES.length);
    for (const a of actionsFor('archaeology')) {
      expect(a.inputs).toBeUndefined();
      expect(a.gate).toEqual(EXPEDITION_GATE);
      expect(a.area).toBeUndefined();
      expect(a.outputChance).toBeLessThanOrEqual(1);
    }
  });

  it('counts towards tree points, has a branch and a game', () => {
    const s = digger(1);
    const before = skillTreePoints(s);
    s.skills.archaeology = xpForLevel(10);
    expect(skillTreePoints(s)).toBeGreaterThan(before);
    expect(SKILL_TREE_NODES.filter((n) => n.branch === 'archaeology')).toHaveLength(6);
    expect(hasMinigame('archaeology')).toBe(true);
    startSkillAction(s, ctx(), 'dig_cairn');
    minigameSwing(s, 'hit');
    expect(focusOf(s)).toBeGreaterThan(0);
  });

  it('trains about as fast as the other late skills at the top', () => {
    const xpPerSec = Math.max(...actionsFor('archaeology').map((a) => a.xp / (a.intervalMs / 1000)));
    expect(xpPerSec).toBeGreaterThan(2.7);
    expect(xpPerSec).toBeLessThan(3.2);
  });
});

describe('sites', () => {
  it('pays Artifacts, counts the dig and gives XP', () => {
    const s = digger();
    startSkillAction(s, ctx(), 'dig_cairn');
    dig(s, fixed(0));
    expect(s.account.bank[TALLY]).toBeGreaterThanOrEqual(1);
    expect(s.expedition.dug.dig_cairn).toBe(1);
    expect(s.skills.archaeology).toBeGreaterThan(xpForLevel(1));
  });

  it('never stops and has no way to go wrong: a dry dig still counts', () => {
    const s = digger();
    startSkillAction(s, ctx(), 'dig_cairn');
    for (let i = 0; i < 50; i++) dig(s, fixed(0.99));
    expect(s.account.bank[TALLY] ?? 0).toBe(0);
    expect(s.expedition.dug.dig_cairn).toBe(50);
    expect(s.action?.kind).toBe('skill');
  });

  it('goes down a stratum at each find, and pays more for it', () => {
    const s = digger();
    const steps = findDigs(CAIRN);
    expect(steps[0]).toBeLessThan(steps[1]);
    expect(siteStratum(s, CAIRN)).toBe(0);
    expect(artifactsPerDig(s, CAIRN)).toBeCloseTo(digChance(CAIRN));
    s.expedition.dug.dig_cairn = steps[0] - 1;
    expect(stratumProgress(s, CAIRN).digsLeft).toBe(1);
    let told = '';
    startSkillAction(s, ctx(), 'dig_cairn');
    dig(s, { ...ctx(), emit: (e) => { if (e.t === 'info') told = e.text; } });
    expect(siteStratum(s, CAIRN)).toBe(1);
    expect(told).toContain(CAIRN.finds[0]);
    expect(s.expedition.tally.finds).toBe(1);
    expect(artifactsPerDig(s, CAIRN)).toBeCloseTo(digChance(CAIRN) * (1 + STRATUM_YIELD));
    s.expedition.dug.dig_cairn = steps[2];
    expect(siteStratum(s, CAIRN)).toBe(STRATA.length - 1);
    expect(stratumProgress(s, CAIRN)).toEqual({ progress: 1, digsLeft: 0 });
  });

  it('keeps every site\'s depth when you leave it', () => {
    const s = digger(30);
    s.expedition.dug.dig_cairn = findDigs(CAIRN)[1];
    startSkillAction(s, ctx(), 'dig_barrow');
    dig(s, ctx());
    expect(siteStratum(s, CAIRN)).toBe(2);
  });

  it('a slower site takes the same hours to work', () => {
    const hours = (x: typeof CAIRN) => (findDigs(x)[0] * x.intervalMs) / 3_600_000;
    for (const x of SITES) expect(hours(x)).toBeCloseTo(hours(CAIRN), 1);
  });

  it('later sites pay more per hour', () => {
    const rates = SITES.map((x) => x.rate);
    expect([...rates].sort((a, b) => a - b)).toEqual(rates);
  });

  it('Keen Eye adds Artifacts and Deep Survey doubles the digging at a cost in speed', () => {
    const s = digger(50);
    const slow = actionIntervalMs(s, actionDef('dig_cairn'), deriveStats(s));
    s.skillPassives = ['archaeology_n0', 'archaeology_ks'];
    expect(artifactsPerDig(s, CAIRN)).toBeCloseTo(digChance(CAIRN) * 1.25);
    expect(actionIntervalMs(s, actionDef('dig_cairn'), deriveStats(s))).toBeCloseTo(slow * 1.25);
    startSkillAction(s, ctx(), 'dig_cairn');
    dig(s, ctx());
    expect(s.expedition.dug.dig_cairn).toBe(2);
  });
});

describe('standing', () => {
  it('is one per find across a people\'s sites', () => {
    const s = digger();
    s.expedition.dug.dig_cairn = findDigs(CAIRN)[2];
    s.expedition.dug.dig_colossus = findDigs(siteOf('dig_colossus')!)[1];
    expect(standing(s, 'giant')).toBe(5);
    expect(standing(s, 'rime')).toBe(0);
  });

  it('opens shelves, and every ware can be reached', () => {
    const s = digger();
    expect(wareReason(s, 'giant_chaos')).toMatch(/standing 2/);
    expect(setOrder(s, 'giant_chaos')).toMatch(/standing 2/);
    expect(shelvesFor(s, 'giant').next?.item).toBe('alchemy');
    s.expedition.dug.dig_cairn = findDigs(CAIRN)[1];
    s.account.bank[TALLY] = 1000;
    expect(wareReason(s, 'giant_chaos')).toBeNull();
    for (const w of WARES) expect(w.standing).toBeLessThan(MAX_STANDING);
    for (const c of CULTURES) expect(WARES.some((w) => w.culture === c.id && w.standing === 0)).toBe(true);
  });
});

describe('merchants', () => {
  const w = wareDef('giant_regal');

  it('sells no Exalted, Divine or Annulment', () => {
    for (const id of ['exalted', 'divine', 'annul']) expect(WARES.some((x) => x.item === id)).toBe(false);
  });

  it('takes the Artifacts and gives the goods', () => {
    const s = digger();
    s.account.bank[TALLY] = w.cost;
    expect(buyWare(s, ctx(), w.id)).toBeNull();
    expect(s.account.bank[TALLY]).toBe(0);
    expect(s.account.bank.regal).toBe(1);
    expect(buyWare(s, ctx(), w.id)).toMatch(/Not enough/);
  });

  it('dearer as a shelf empties, up to double', () => {
    const s = digger();
    s.account.bank[TALLY] = 1e6;
    expect(warePrice(s, w)).toBe(w.cost);
    for (let i = 0; i < w.shelf - 1; i++) buyWare(s, ctx(), w.id);
    expect(warePrice(s, w)).toBeGreaterThan(w.cost);
    expect(warePrice(s, w)).toBeLessThanOrEqual(w.cost * 2);
    buyWare(s, ctx(), w.id);
    expect(wareLeft(s, w)).toBe(0);
    expect(wareReason(s, w.id)).toBe('Sold out');
  });

  it('restocks by the clock, away or not, and stops at a full shelf', () => {
    const s = digger();
    s.account.bank[TALLY] = 1e6;
    for (let i = 0; i < w.shelf; i++) buyWare(s, ctx(), w.id);
    s.clock += w.restockMs * 3;
    expect(wareLeft(s, w)).toBe(3);
    s.clock += w.restockMs * 100;
    expect(wareLeft(s, w)).toBe(w.shelf);
    expect(warePrice(s, w)).toBe(w.cost);
  });

  it('Silver Tongue takes 15% off', () => {
    const s = digger(30);
    s.skillPassives = ['archaeology_n1'];
    expect(warePrice(s, wareDef('giant_alteration'))).toBe(51);
  });

  it('keeps one standing order, which buys by itself until it can\'t', () => {
    const s = digger();
    expect(setOrder(s, 'giant_regal')).toBeNull();
    expect(setOrder(s, 'giant_alteration')).toBeNull();
    expect(s.expedition.orders.giant).toBe('giant_alteration');
    expect(setOrder(s, 'giant_alteration')).toBeNull();
    expect(s.expedition.orders.giant).toBeUndefined();
    setOrder(s, 'giant_regal');
    s.account.bank[TALLY] = 1e6;
    tick(s, ctx(), 100);
    expect(s.account.bank.regal).toBe(w.shelf);
    expect(s.expedition.tally.traded).toBe(w.shelf);
    const left = s.account.bank[TALLY];
    fillOrders(s, ctx());
    expect(s.account.bank[TALLY]).toBe(left);
  });

  it('one order per people: three can run at once', () => {
    const s = digger();
    setOrder(s, 'giant_regal');
    setOrder(s, 'surveyor_frigid_fossil');
    setOrder(s, 'rime_scour');
    expect(Object.keys(s.expedition.orders)).toHaveLength(3);
  });
});

describe('Ancient Whetstone', () => {
  function rare(): Item {
    const s = digger();
    return createItem(s, 'iron_ring', 80, 'rare', seeded(3));
  }
  function bench(item: Item): GameState {
    const s = digger();
    s.inventory.push(item);
    s.account.bank[WHETSTONE] = 1;
    return s;
  }

  it('raises the mod a tier, values inside it, and is used up', () => {
    const item = rare();
    const s = bench(item);
    const mod = allMods(item).find((m) => affixDef(m.affixId).tiers[m.tier + 1] && affixDef(m.affixId).tiers[m.tier + 1].ilvl <= 80)!;
    mod.tier = 0;
    const { affixId } = mod;
    expect(applyWhetstone(s, ctx(), item.uid, affixId)).toBeNull();
    const after = allMods(item).find((m) => m.affixId === affixId)!;
    expect(after.tier).toBe(1);
    affixDef(affixId).tiers[1].ranges.forEach(([lo, hi], i) => {
      expect(after.values[i]).toBeGreaterThanOrEqual(lo);
      expect(after.values[i]).toBeLessThanOrEqual(hi);
    });
    expect(s.account.bank[WHETSTONE]).toBe(0);
  });

  it('leaves every other mod alone', () => {
    const item = rare();
    const s = bench(item);
    const [mod, ...rest] = allMods(item);
    mod.tier = 0;
    const before = structuredClone(rest);
    applyWhetstone(s, ctx(), item.uid, mod.affixId);
    expect(allMods(item).slice(1)).toEqual(before);
  });

  it('stops at the item level and the top tier, and on uniques and bench crafts', () => {
    const item = rare();
    const s = bench(item);
    const mod = allMods(item)[0];
    const tiers = affixDef(mod.affixId).tiers;
    mod.tier = tiers.length - 1;
    expect(whetstoneReason(s, item.uid, mod.affixId)).toMatch(/top tier/);
    mod.tier = 0;
    item.ilvl = tiers[1].ilvl - 1;
    expect(whetstoneReason(s, item.uid, mod.affixId)).toMatch(/item level/);
    item.ilvl = 80;
    mod.crafted = true;
    expect(whetstoneReason(s, item.uid, mod.affixId)).toMatch(/Bench crafts/);
    mod.crafted = false;
    item.rarity = 'unique';
    expect(whetstoneReason(s, item.uid, mod.affixId)).toMatch(/unique/);
  });

  it('honed once per item, until that modifier leaves', () => {
    const item = rare();
    const s = bench(item);
    s.account.bank[WHETSTONE] = 3;
    const [mod, other] = allMods(item);
    mod.tier = other.tier = 0;
    expect(applyWhetstone(s, ctx(), item.uid, mod.affixId)).toBeNull();
    expect(whetstoneReason(s, item.uid, other.affixId)).toMatch(/already has a honed/);
    expect(whetstoneReason(s, item.uid, mod.affixId)).toMatch(/already has a honed/);
    item.prefixes = item.prefixes.filter((m) => m.affixId !== mod.affixId);
    item.suffixes = item.suffixes.filter((m) => m.affixId !== mod.affixId);
    expect(whetstoneReason(s, item.uid, other.affixId)).toBeNull();
  });

  it('Wax puts the item back to before it was honed', () => {
    const item = rare();
    const s = bench(item);
    s.account.bank.locksmiths_wax = 1;
    const mod = allMods(item)[0];
    mod.tier = 0;
    takeImpression(s, ctx(), item.uid);
    applyWhetstone(s, ctx(), item.uid, mod.affixId);
    expect(item.honed).toBe(mod.affixId);
    restoreImpression(s, ctx(), item.uid);
    expect(item.honed).toBeUndefined();
    expect(allMods(item)[0].tier).toBe(0);
  });

  it('needs a Whetstone', () => {
    const item = rare();
    const s = bench(item);
    s.account.bank[WHETSTONE] = 0;
    expect(whetstoneReason(s, item.uid, allMods(item)[0].affixId)).toMatch(/no Ancient Whetstone/);
  });
});

describe('Expedition offline', () => {
  it('runs a full night, makes finds and fills orders on its own', () => {
    const s = digger();
    setOrder(s, 'giant_alteration');
    startSkillAction(s, ctx(), 'dig_cairn');
    const sum = simulateOffline(s, ctx(), 8 * 3_600_000);
    expect(sum.stoppedReason).toBeNull();
    expect(s.action?.kind).toBe('skill');
    expect(sum.xp.archaeology).toBeGreaterThan(0);
    expect(sum.finds).toBe(1);
    expect(sum.traded).toBeGreaterThan(0);
    expect(s.account.bank.alteration).toBeGreaterThanOrEqual(100);
    expect(s.expedition.dug.dig_cairn).toBeGreaterThan(8000);
  });

  it('a night at the Cairn pays about what its rate says', () => {
    const s = digger();
    startSkillAction(s, ctx(), 'dig_cairn');
    simulateOffline(s, ctx(), 8 * 3_600_000);
    expect(s.account.bank[TALLY]).toBeGreaterThan(CAIRN.rate * 8 * 0.9);
    expect(s.account.bank[TALLY]).toBeLessThan(CAIRN.rate * 8 * 1.5);
  });

  it('Overtime speeds a dig as it does any skilling', () => {
    const plain = digger();
    const fast = digger();
    fast.skillPassives = ['core_3'];
    startSkillAction(plain, ctx(), 'dig_cairn');
    startSkillAction(fast, ctx(), 'dig_cairn');
    simulateOffline(plain, ctx(), 3_600_000);
    simulateOffline(fast, ctx(), 3_600_000);
    expect(fast.expedition.dug.dig_cairn).toBeGreaterThan(plain.expedition.dug.dig_cairn);
  });
});

describe('Expedition saves', () => {
  it('migrates a save from before the skill', () => {
    const s = newGame(1, { name: 'Old', classId: 'warrior' });
    const raw = JSON.parse(serialize(s));
    raw.version = 25;
    delete raw.skills.archaeology;
    delete raw.expedition;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.skills.archaeology).toBe(0);
    expect(levelOf('archaeology', loaded.skills.archaeology)).toBe(1);
    expect(loaded.expedition).toEqual({ dug: {}, shelves: {}, orders: {}, tally: { finds: 0, traded: 0 } });
  });

  it('keeps depth, shelves and orders, and carries on digging', () => {
    const s = digger();
    s.account.bank[TALLY] = 100;
    buyWare(s, ctx(), 'giant_regal');
    setOrder(s, 'rime_scour');
    startSkillAction(s, ctx(), 'dig_cairn');
    dig(s, ctx());
    const back = deserialize(serialize(s));
    expect(back.expedition).toEqual(s.expedition);
    expect(back.action).toEqual(s.action);
  });

  it('drops an order for a ware that no longer exists', () => {
    const s = digger();
    const raw = JSON.parse(serialize(s));
    raw.expedition.orders = { giant: 'gone', rime: 'rime_scour' };
    raw.expedition.shelves = { gone: { sold: 1, at: 0 } };
    const back = deserialize(JSON.stringify(raw));
    expect(back.expedition.orders).toEqual({ rime: 'rime_scour' });
    expect(back.expedition.shelves).toEqual({});
  });
});
