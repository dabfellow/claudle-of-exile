import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_BY_ID, ACHIEVEMENTS, CATEGORY_NAMES, perkTotals } from '../src/data/achievements';
import { uniqueDef } from '../src/data/bases';
import { STASH_START_PAGES } from '../src/data/hideout';
import { ZONES } from '../src/data/zones';
import { uniqueDropsIn } from '../src/data/uniqueList';
import { freshAccount } from '../src/engine/account';
import { checkAchievements, settleAchievements } from '../src/engine/achievements';
import { offlineCapMs } from '../src/engine/automation';
import { makeCtx } from '../src/engine/context';
import { atlasPointsEarned } from '../src/engine/maps';
import { settlePassivePoints } from '../src/engine/passives';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { stashPagePrice } from '../src/engine/storage';
import type { AccountState } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';

/** The 43 achievements from before the expansion: their ids must never change, or earned ones would be lost. */
const ORIGINAL = [
  'slayer_100', 'slayer_1000', 'slayer_10000', 'boss_1', 'boss_10', 'act_1', 'exile_act_1', 'exile_bare', 'conqueror', 'act_2',
  'conqueror_2', 'act_3', 'conqueror_3', 'act_4', 'conqueror_4', 'act_5', 'conqueror_5', 'act_6', 'conqueror_6', 'act_6_deathless',
  'deathless', 'crafter_25', 'crafter_250', 'bench_10', 'salvager_50', 'rare_find', 'unique_find', 'unique_5', 'flask_100',
  'flask_1000', 'brewer_25', 'total_50', 'total_150', 'smith_100', 'meals_50', 'maps_drawn_25', 'maps_drawn_250', 'gatherer_1000',
  'level_10', 'level_25', 'keystone', 'mastery_5', 'full_bar',
];

const ctx = () => makeCtx(seeded(1));
const atLevel = (lvl: number, account?: AccountState, challenge?: { hardcore?: boolean; ssf?: boolean }) => {
  const s = newGame(1, { name: 't', classId: 'warrior', challenge }, account);
  s.skills.combat = charXpForLevel(lvl);
  return s;
};

describe('the achievement list', () => {
  it('has over 100, every original id kept, none repeated', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(100);
    expect(ORIGINAL.filter((id) => !ACHIEVEMENT_BY_ID[id])).toEqual([]);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('spreads across every category', () => {
    for (const c of Object.keys(CATEGORY_NAMES)) expect(ACHIEVEMENTS.filter((a) => a.category === c).length, c).toBeGreaterThanOrEqual(8);
  });

  it('each unique reward is achievement-only: never drops, never trades', () => {
    const ids = ACHIEVEMENTS.flatMap((a) => (a.unique ? [a.unique] : []));
    expect(ids.length).toBeGreaterThanOrEqual(7);
    for (const id of ids) {
      expect(uniqueDef(id).noTrade, id).toBe(true);
      expect(ZONES.some((z) => z.uniques.includes(id)), id).toBe(false);
      expect(uniqueDropsIn(uniqueDef(id)).every((d) => d.endsWith('(Achievement)')), id).toBe(true);
    }
  });

  it('rewards change play: passive and Atlas points, stash tabs, offline hours and bonuses', () => {
    const all = perkTotals(ACHIEVEMENTS.map((a) => a.id));
    expect(all.passivePoints).toBeGreaterThanOrEqual(5);
    expect(all.atlasPoints).toBeGreaterThanOrEqual(3);
    expect(all.stashTabs).toBeGreaterThanOrEqual(2);
    expect(all.offlineHours).toBeGreaterThanOrEqual(3);
    expect(all.stats.itemRarity).toBeGreaterThan(0);
  });
});

describe('earning rewards', () => {
  it('stat bonuses apply to the character for good', () => {
    const s = atLevel(1);
    const before = deriveStats(s).itemRarity;
    s.lifetime.kills = 10000;
    checkAchievements(s, ctx());
    expect(s.achievements).toContain('slayer_10000');
    expect(deriveStats(s).itemRarity).toBe(before + 2);
  });

  it('a passive point is added once, however often points are settled', () => {
    const s = atLevel(20);
    settlePassivePoints(s);
    const before = s.passivePoints;
    s.bossesDefeated.push(...ZONES.filter((z) => z.act === 2).map((z) => z.id));
    checkAchievements(s, ctx());
    settlePassivePoints(s);
    settlePassivePoints(s);
    expect(s.achievements).toContain('conqueror_2');
    // the act boss gives its own point too
    expect(s.passivePoints).toBe(before + 1 + 1);
  });

  it('offline hours follow the character, not the realm', () => {
    const a = freshAccount();
    const vet = atLevel(50, a);
    const fresh = atLevel(1, a);
    const base = offlineCapMs(fresh);
    checkAchievements(vet, ctx());
    expect(vet.achievements).toContain('level_50');
    expect(offlineCapMs(vet)).toBe(base + 3600_000);
    expect(offlineCapMs(fresh)).toBe(base);
  });

  it('a stash tab lands once per realm, and is free (the next page costs the same)', () => {
    const a = freshAccount();
    const one = atLevel(1, a);
    const two = atLevel(1, a);
    const price = stashPagePrice(one);
    one.lifetime.itemsLooted = 10000;
    checkAchievements(one, ctx());
    expect(a.stash.length).toBe(STASH_START_PAGES + 1);
    expect(stashPagePrice(one)).toBe(price);
    two.lifetime.itemsLooted = 10000;
    checkAchievements(two, ctx());
    expect(two.achievements).toContain('looter_10000');
    expect(a.stash.length).toBe(STASH_START_PAGES + 1);
  });

  it('an Atlas point lands once per realm, past the usual cap', () => {
    const a = freshAccount();
    const s = atLevel(70, a);
    const before = atlasPointsEarned(s);
    s.maps.highestTier = 10;
    checkAchievements(s, ctx());
    expect(atlasPointsEarned(s)).toBe(before + 1);
    const other = atLevel(70, a);
    other.maps.highestTier = 10;
    checkAchievements(other, ctx());
    expect(atlasPointsEarned(other)).toBe(before + 1);
  });

  it('challenge achievements must be proven on that kind of character', () => {
    const normal = atLevel(10);
    const hc = atLevel(10, undefined, { hardcore: true });
    for (const s of [normal, hc]) {
      s.bossesDefeated.push('sanctum');
      checkAchievements(s, ctx());
    }
    expect(normal.achievements).not.toContain('hc_act_1');
    expect(hc.achievements).toContain('hc_act_1');
  });
});

describe('older characters', () => {
  /** A character as version 41 saved it: no new counters, and only the old achievements. */
  function v41() {
    const s = atLevel(55);
    s.achievements = ['level_10', 'level_25'];
    s.bossesDefeated.push('map_doomed_sanctum_t3', 'map_doomed_t1', 'umap_vaults');
    const raw = JSON.parse(serialize(s));
    raw.version = 41;
    for (const k of ['rareKills', 'doomedBest', 'uniqueMaps']) delete raw.lifetime[k];
    return JSON.stringify(raw);
  }

  it('the migration fills the new counters from Doomed and Unique Map bosses already beaten', () => {
    const s = deserialize(v41());
    expect(s.lifetime.doomedBest).toBe(3);
    expect(s.lifetime.uniqueMaps).toEqual(['umap_vaults']);
    expect(s.lifetime.rareKills).toBe(0);
  });

  it('on load, new achievements already met are granted with their rewards, and nothing earned is lost', () => {
    const s = deserialize(v41());
    s.account = freshAccount();
    const capBefore = offlineCapMs(s);
    const fresh = settleAchievements(s);
    expect(s.achievements).toEqual(expect.arrayContaining(['level_10', 'level_25', 'level_50', 'doomed_3', 'unique_map_1']));
    expect(fresh).not.toContain('level_10');
    expect(offlineCapMs(s)).toBe(capBefore + 3600_000);
    expect(settleAchievements(s)).toEqual([]);
  });

  it('a realm reward owed for an achievement earned before is added on load', () => {
    const s = atLevel(1);
    s.account = freshAccount();
    s.achievements.push('looter_10000');
    settleAchievements(s);
    expect(s.account.achievementRewards).toContain('looter_10000');
    expect(s.account.stash.length).toBe(STASH_START_PAGES + 1);
    settleAchievements(s);
    expect(s.account.stash.length).toBe(STASH_START_PAGES + 1);
  });
});
