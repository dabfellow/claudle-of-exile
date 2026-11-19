import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_BY_ID } from '../src/data/achievements';
import { gemAct, MAPS_GEM_ACT } from '../src/data/gems';
import { ACTS, roadsInto, ZONES, zonesInAct } from '../src/data/zones';
import { CAMPAIGN_QUESTS } from '../src/data/campaignQuests';
import { ACT_MAPS } from '../src/data/campaignMap';
import { campaignComplete, FINAL_ACT } from '../src/engine/hideout';
import { CAMPAIGN_PASSIVE_MILESTONES, settlePassivePoints } from '../src/engine/passives';
import { gemInShop } from '../src/engine/progress';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';

describe('seven-act progression compatibility', () => {
  it('makes seven substantial chapters with complete map and journal coverage', () => {
    expect(ZONES).toHaveLength(70);
    expect(new Set(ZONES.map((z) => z.id)).size).toBe(70);
    expect(ACTS.map((a) => zonesInAct(a.n).length)).toEqual([8, 8, 8, 10, 12, 12, 12]);
    for (const a of ACTS) {
      const zones = zonesInAct(a.n);
      expect(zones.filter((z) => z.actBoss)).toHaveLength(1);
      expect(zones.at(-1)!.actBoss).toBe(true);
      expect(Object.keys(ACT_MAPS[a.n].zones).sort()).toEqual(zones.map((z) => z.id).sort());
      for (const z of zones) {
        expect(z.monsters.every((m) => m.level >= z.levelRange[0] && m.level <= z.levelRange[1]), z.id).toBe(true);
        for (const from of roadsInto(z)) expect(ZONES.find((entry) => entry.id === from)!.act).toBeLessThanOrEqual(a.n);
      }
    }
    for (const chapter of CAMPAIGN_QUESTS) for (const step of chapter.steps) {
      expect(ZONES.find((z) => z.id === step.zoneId)!.act, step.id).toBe(chapter.act);
    }
  });

  it('gives relocated roadside areas early gear levels and removes their underground Echoes', () => {
    for (const id of ['tithefields', 'fortobedience', 'bannerfield', 'assizes']) {
      const z = ZONES.find((entry) => entry.id === id)!;
      expect(z.act).toBe(2);
      expect(z.boss.level + (z.ilvlBonus ?? 0)).toBeLessThanOrEqual(19);
      expect(z.boss.echoes).toBeUndefined();
      expect(z.boss.mechanics).not.toContain('channel');
    }
  });

  it('retains cleared and open relocated areas when an older late-campaign save loads', () => {
    const s = newGame(12);
    s.unlockedZones = ['mudflats', 'exilesgate', 'tithefields', 'fortobedience', 'bannerfield', 'assizes', 'lowercity', 'dryaqueduct'];
    s.bossesDefeated = ['tithefields', 'fortobedience', 'lowercity'];
    const loaded = deserialize(serialize(s));
    expect(loaded.unlockedZones).toEqual(expect.arrayContaining(s.unlockedZones));
    expect(loaded.bossesDefeated).toEqual(s.bossesDefeated);
  });

  it('keeps campaign Act 7 gems separate from the Maps shelf until the finale', () => {
    const s = newGame(1);
    s.unlockedZones = ZONES.map((z) => z.id);
    s.bossesDefeated = ZONES.filter((z) => z.id !== 'shatteredthrone').map((z) => z.id);
    s.account.campaignDone = false;
    expect(FINAL_ACT).toBe(7);
    expect(gemAct('siege_totem')).toBe(7);
    expect(gemAct('doom_bolt')).toBe(MAPS_GEM_ACT);
    expect(gemInShop(s, 'siege_totem')).toBe(true);
    expect(gemInShop(s, 'doom_bolt')).toBe(false);
    s.bossesDefeated.push('shatteredthrone');
    expect(gemInShop(s, 'doom_bolt')).toBe(true);
    expect(campaignComplete(s)).toBe(true);
  });

  it('retains completion for existing completed accounts after save roundtrip', () => {
    const s = newGame(2);
    s.account.campaignDone = true;
    s.bossesDefeated = [];
    const loaded = deserialize(serialize(s));
    // Accounts are stored and reattached separately from character saves.
    loaded.account = s.account;
    expect(campaignComplete(loaded)).toBe(true);
    expect(gemInShop(loaded, 'doom_bolt')).toBe(true);
  });

  it('does not add or double-credit a passive award for the split inland chapter', () => {
    const s = newGame(3);
    s.achievements = [];
    settlePassivePoints(s);
    const initial = s.passivePoints;
    s.bossesDefeated.push('caravan');
    settlePassivePoints(s);
    expect(s.passivePoints).toBe(initial);
    s.bossesDefeated.push(...CAMPAIGN_PASSIVE_MILESTONES);
    settlePassivePoints(s);
    expect(s.passivePoints).toBe(initial + 6);
    settlePassivePoints(s);
    expect(s.passivePoints).toBe(initial + 6);
  });

  it('keeps the existing inland conqueror reward behind both new inland chapters', () => {
    const s = newGame(4);
    const reward = ACHIEVEMENT_BY_ID.conqueror_2;
    const inland = ZONES.filter((z) => z.act === 2 || z.act === 3);
    expect(reward.target).toBe(inland.length);
    s.bossesDefeated = ZONES.filter((z) => z.act === 2).map((z) => z.id);
    expect(reward.progress(s)).toBeLessThan(reward.target);
    s.bossesDefeated = inland.map((z) => z.id);
    expect(reward.progress(s)).toBe(reward.target);
  });
});
