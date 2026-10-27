import { describe, expect, it } from 'vitest';
import { ACTIVE_GEMS, activeGemDef, gemReqLevel, supportGemDef } from '../src/data/gems';
import { createSkillGem, createSupportGem, gemAttrReq, gemLevelReq, gemUseReason, settleGems, skillSummary, supportFits, weaponPctAt } from '../src/engine/gems';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { veteran } from './helpers';

describe('gem tags', () => {
  it('a skill is tagged hit exactly when it deals damage, and cast exactly when it is a spell with a cast time', () => {
    for (const g of ACTIVE_GEMS) {
      expect(g.tags.includes('hit'), g.id).toBe(!!(g.effect.weaponPct || g.effect.base));
      expect(g.tags.includes('cast'), g.id).toBe(g.tags.includes('spell') && g.timeMs > 0);
    }
  });

  it("damage supports don't fit skills that deal no damage", () => {
    for (const id of ['frost_ward', 'meditate']) {
      const act = activeGemDef(id);
      for (const sup of ['spell_echo', 'added_fire', 'elemental_focus', 'critical_strikes', 'life_leech', 'mana_leech', 'faster_casts']) {
        expect(supportFits(supportGemDef(sup), act), `${sup} on ${id}`).toBe(false);
      }
    }
    expect(supportFits(supportGemDef('spell_echo'), activeGemDef('shock_nova'))).toBe(true);
    expect(supportFits(supportGemDef('faster_casts'), activeGemDef('fireball'))).toBe(true);
    expect(supportFits(supportGemDef('faster_casts'), activeGemDef('spark'))).toBe(false);
    expect(supportFits(supportGemDef('lingering'), activeGemDef('parry'))).toBe(false);
    // supports that make a skill worse are still allowed: that's the player's call
    expect(supportFits(supportGemDef('pierce'), activeGemDef('rain_of_arrows'))).toBe(true);
  });

  it('a save with a support that no longer fits gets it back in the bag', () => {
    const s = veteran(newGame(1, { name: 't', classId: 'mage' }));
    const ward = createSkillGem(s, 'frost_ward');
    ward.supports[0] = createSupportGem(s, 'spell_echo');
    s.gems.push(ward);
    const loaded = deserialize(serialize(s));
    const back = loaded.gems.find((g) => g.uid === ward.uid)!;
    expect(back.supports[0]).toBeNull();
    expect(loaded.supportGems.some((x) => x.supportId === 'spell_echo')).toBe(true);
  });
});

describe('gem requirements', () => {
  it('every gem needs character level 80 at gem level 20, rising from its own level 1 requirement', () => {
    expect(gemLevelReq('heavy_strike', 1)).toBe(1);
    expect(gemLevelReq('heavy_strike', 20)).toBe(80);
    expect(gemLevelReq('lacerate', 1)).toBe(gemReqLevel('lacerate'));
    expect(gemLevelReq('lacerate', 20)).toBe(80);
    expect(gemLevelReq('lacerate', 10)).toBeGreaterThan(gemLevelReq('heavy_strike', 10));
  });

  it('strong gems ask more of their attribute', () => {
    expect(gemAttrReq('backstab', 5)).toBeGreaterThan(gemAttrReq('feint', 5));
    expect(gemAttrReq('heavy_strike', 20)).toBeGreaterThan(200);
  });

  it("a gem above the character's level can't be used, and a loaded save drops it back without losing xp", () => {
    const s = veteran(newGame(1, { name: 't', classId: 'warrior' }), 20);
    const strike = s.skillBar[0]!;
    strike.level = 15;
    strike.xp = 1e9;
    expect(gemUseReason(20, { str: 999, dex: 999, int: 999 }, strike)).toMatch(/Requires level/);
    settleGems(s);
    expect(gemLevelReq(strike.gemId, strike.level)).toBeLessThanOrEqual(20);
    expect(gemLevelReq(strike.gemId, strike.level + 1)).toBeGreaterThan(20);
    expect(strike.xp).toBe(1e9);
  });
});

describe('attack gem scaling', () => {
  it('gem level scales the whole skill, so multi-hit skills grow at the same rate as single hits', () => {
    const heavy = activeGemDef('heavy_strike');
    const barrage = activeGemDef('barrage');
    const growth = (id: typeof heavy) => weaponPctAt(id, 20) / weaponPctAt(id, 1);
    expect(growth(barrage)).toBeCloseTo(growth(heavy));
  });

  it('higher-level skills out-damage the early skills they replace', () => {
    const s = veteran(newGame(1, { name: 't', classId: 'warrior' }));
    const d = deriveStats(s);
    const dps = (id: string) => skillSummary(d, createSkillGem(s, id)).perSecond;
    const perUse = (id: string) => skillSummary(d, createSkillGem(s, id)).perUse;
    expect(dps('judgement_hammer')).toBeGreaterThan(dps('heavy_strike'));
    expect(dps('barrage')).toBeGreaterThan(dps('twin_strike'));
    expect(perUse('glacial_lance')).toBeGreaterThan(perUse('fireball'));
    expect(dps('frost_needle')).toBeGreaterThan(dps('spark'));
  });
});
