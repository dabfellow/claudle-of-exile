import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { areaCurrency, bossTable, COMBAT_ONLY_CURRENCY, dropTable } from '../src/data/drops';
import { SUPPORT_GEMS } from '../src/data/gems';
import { BENCH_CRAFTS } from '../src/data/hideout';
import { ACTIONS, actionDef } from '../src/data/skills';
import { ZONES, zoneDef } from '../src/data/zones';
import { checkAchievements } from '../src/engine/achievements';
import { makeMonster } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { applyOrb, benchCraftReason, FIELD_TINKER_ILVL, salvage, TINKER_DUST_COST } from '../src/engine/crafting';
import { clearLevelOneGems, createSkillGem, createSupportGem } from '../src/engine/gems';
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
    // deeper areas roll more rares
    expect(dropTable(5).rarity.rare).toBeGreaterThan(dropTable(1).rarity.rare);
  });

  it('Instilling Orbs drop from Act 2 on, including its first area', () => {
    for (const z of ZONES) expect(!!areaCurrency(z).instill, z.id).toBe(z.act >= 2);
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
    const before = s.account.bank.transmute ?? 0;
    rollLoot(s, ctx(), makeMonster(z.boss, true, 1), z, deriveStats(s));
    expect((s.account.bank.transmute ?? 0) - before).toBeGreaterThanOrEqual(bossTable(1).guaranteed[0].qty);
  });

  it('monsters and bosses never drop gems', () => {
    const s = veteran(fresh(), 60);
    const z = zoneDef('giantsthrone');
    const c = ctx(5);
    for (let i = 0; i < 300; i++) rollLoot(s, c, makeMonster(z.boss, true, 1), z, deriveStats(s));
    for (let i = 0; i < 3000; i++) rollLoot(s, c, makeMonster(z.monsters[0], false, 1), z, deriveStats(s));
    expect(c.events.some((e) => e.t === 'loot' && (e.gemId || e.supportId))).toBe(false);
  });
});

describe('clearing level 1 gems', () => {
  it('keeps levelled gems, Expansion-socketed gems and saved skill sets, and frees socketed supports', () => {
    const s = fresh();
    const plain = createSkillGem(s, 'heavy_strike');
    const levelled = { ...createSkillGem(s, 'heavy_strike'), level: 2 };
    const expanded = { ...createSkillGem(s, 'heavy_strike'), extraSlots: 1 };
    const saved = createSkillGem(s, 'heavy_strike');
    const socketed = createSkillGem(s, 'heavy_strike');
    const sup = createSupportGem(s, SUPPORT_GEMS[0].id);
    socketed.supports[0] = sup;
    s.account.gems = [plain, levelled, expanded, saved, socketed];
    s.account.supportGems = [];
    s.loadouts.skills = [{ id: 1, name: 'x', slots: [{ gem: saved.uid, supports: [], rules: [], priority: 'normal' }] } as never];
    expect(clearLevelOneGems(s)).toBe(2);
    expect(s.account.gems).toEqual([levelled, expanded, saved]);
    expect(s.account.supportGems).toEqual([sup]);
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
    const gold = s.account.bank.gold ?? 0;
    expect(checkAchievements(s, c)).toContain('slayer_100');
    expect(s.account.bank.gold).toBe(gold + 100);
    expect(events.some((e) => e.t === 'achievement' && e.id === 'slayer_100')).toBe(true);
    expect(checkAchievements(s, c)).not.toContain('slayer_100');
    expect(s.account.bank.gold).toBe(gold + 100);
  });

  it('every gated bench recipe points at a real achievement', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    for (const b of BENCH_CRAFTS) if (b.achievement) expect(ids.has(b.achievement)).toBe(true);
  });

  it('bench recipes need their achievement', () => {
    const s = fresh();
    s.account.hideout.bench = 4;
    s.account.bank.gold = 1e6;
    s.account.bank.arcane_dust = 1e6;
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

  it('field-tinkers low-level gear with salvage dust when basic orbs run out', () => {
    const s = fresh();
    s.account.hideout.bench = 2;
    s.account.bank.transmute = 0;
    s.account.bank.arcane_dust = 10;
    const item = createItem(s, 'rusted_sword', FIELD_TINKER_ILVL, 'normal', seeded(3));
    s.inventory.push(item);
    expect(applyOrb(s, ctx(), 'transmute', item.uid)).toBeNull();
    expect(item.rarity).toBe('magic');
    expect(s.account.bank.arcane_dust).toBe(10 - TINKER_DUST_COST.transmute);
    expect(s.account.bank.transmute).toBe(0);
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
