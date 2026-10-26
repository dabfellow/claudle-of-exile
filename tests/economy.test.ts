import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { bossTable, COMBAT_ONLY_CURRENCY, dropTable } from '../src/data/drops';
import { BENCH_CRAFTS } from '../src/data/hideout';
import { ACTIONS, actionDef } from '../src/data/skills';
import { ZONES, zoneDef } from '../src/data/zones';
import { checkAchievements } from '../src/engine/achievements';
import { makeMonster } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { benchCraftReason, salvage } from '../src/engine/crafting';
import { createItem } from '../src/engine/items';
import { rollLoot } from '../src/engine/loot';
import { seeded } from '../src/engine/rng';
import { deserialize } from '../src/engine/save';
import { actionBlocker } from '../src/engine/skills';
import { newGame, SAVE_VERSION } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameEvent } from '../src/engine/types';
import { veteran } from './helpers';

const ctx = (seed = 1) => makeCtx(seeded(seed));
const fresh = () => newGame(1, { name: 'Eco', classId: 'warrior' });

describe('drop tables', () => {
  it('rare currency only drops in deeper areas', () => {
    expect(dropTable(1).currency.chaos).toBeUndefined();
    expect(dropTable(1).currency.exalted).toBeUndefined();
    expect(dropTable(2).currency.chaos).toBeGreaterThan(0);
    expect(dropTable(3).currency.exalted).toBeGreaterThan(0);
    expect(dropTable(4).currency.instill).toBeGreaterThan(0);
    // deeper areas roll more rares
    expect(dropTable(5).rarity.rare).toBeGreaterThan(dropTable(1).rarity.rare);
  });

  it('no skilling action makes combat-only orbs', () => {
    for (const a of ACTIONS) {
      const made = [...Object.keys(a.outputs ?? {}), ...(a.bonus ?? []).map((b) => b.id)];
      for (const id of COMBAT_ONLY_CURRENCY) expect(made, `${a.id} makes ${id}`).not.toContain(id);
    }
  });

  it('every area tier has tables', () => {
    for (const z of ZONES) {
      expect(dropTable(z.tier)).toBeTruthy();
      expect(bossTable(z.tier).guaranteed.length).toBeGreaterThan(0);
    }
  });

  it('bosses always drop their guaranteed reward', () => {
    const s = fresh();
    const z = zoneDef('mudflats');
    const before = s.bank.transmute ?? 0;
    rollLoot(s, ctx(), makeMonster(z.boss, true, 1), z, deriveStats(s));
    expect((s.bank.transmute ?? 0) - before).toBeGreaterThanOrEqual(bossTable(1).guaranteed[0].qty);
  });
});

describe('area-gated gathering', () => {
  it('locks nodes and recipes until their area is reached', () => {
    const s = fresh();
    s.skills.mining = 1e9;
    expect(actionBlocker(s, actionDef('mine_iron'))).toMatch(/^Reach /);
    s.unlockedZones.push('ashwood');
    expect(actionBlocker(s, actionDef('mine_iron'))).toBeNull();
  });
});

describe('achievements', () => {
  it('complete once, grant rewards and emit an event', () => {
    const s = fresh();
    const c = makeCtx(seeded(1));
    const events: GameEvent[] = c.events;
    s.lifetime.kills = 100;
    const gold = s.bank.gold ?? 0;
    expect(checkAchievements(s, c)).toContain('slayer_100');
    expect(s.bank.gold).toBe(gold + 100);
    expect(events.some((e) => e.t === 'achievement' && e.id === 'slayer_100')).toBe(true);
    expect(checkAchievements(s, c)).not.toContain('slayer_100');
    expect(s.bank.gold).toBe(gold + 100);
  });

  it('every gated bench recipe points at a real achievement', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    for (const b of BENCH_CRAFTS) if (b.achievement) expect(ids.has(b.achievement)).toBe(true);
  });

  it('bench recipes need their achievement', () => {
    const s = fresh();
    s.hideout.bench = 4;
    s.bank.gold = 1e6;
    s.bank.arcane_dust = 1e6;
    const item = createItem(s, 'rusted_sword', 30, 'magic', seeded(3));
    s.inventory.push(item);
    expect(benchCraftReason(s, 'bc_speed', item.uid)).toMatch(/achievement/);
    s.achievements.push('slayer_1000');
    expect(benchCraftReason(s, 'bc_speed', item.uid)).not.toMatch(/achievement/);
  });

  it('salvaging counts toward Scrapper', () => {
    const s = veteran(fresh());
    const items = Array.from({ length: 3 }, (_, i) => createItem(s, 'rusted_sword', 5, 'normal', seeded(i)));
    s.inventory.push(...items);
    salvage(s, ctx(), items.map((i) => i.uid));
    expect(s.lifetime.salvaged).toBe(3);
  });
});

describe('save v7', () => {
  it('infers beaten bosses from unlocked areas', () => {
    const old = fresh() as unknown as Record<string, unknown>;
    delete old.achievements;
    delete old.bossesDefeated;
    old.version = 6;
    old.unlockedZones = ['mudflats', 'ashwood', 'crypt'];
    old.lifetime = { kills: 5, bossKills: 2, deaths: 0, itemsLooted: 0, orbsUsed: 0 };
    const s = deserialize(JSON.stringify(old));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.achievements).toEqual([]);
    // migration 7 then maps the old Sunken Crypt (third area) onto Act 1's fifth
    expect(s.unlockedZones).toEqual(['mudflats', 'brinecaves', 'ashwood', 'blackreed', 'crypt']);
    expect(s.bossesDefeated).toEqual(['mudflats', 'brinecaves', 'ashwood', 'blackreed']);
    expect(s.lifetime.salvaged).toBe(0);
    expect(s.lifetime.kills).toBe(5);
  });
});
