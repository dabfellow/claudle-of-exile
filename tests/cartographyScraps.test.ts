import { describe, expect, it } from 'vitest';
import { actionDef, actionsFor } from '../src/data/skills';
import { atlasSpecialPerks, rollMapBossScraps, specialMapDone } from '../src/engine/cartography';
import { makeCtx } from '../src/engine/context';
import { addMaps, mapStep, startSpecialMap } from '../src/engine/maps';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { xpToReach } from '../src/engine/xp';

describe('Cartography: Special maps from scraps', () => {
  it('removes plain T1 drawing recipe while keeping upgrades, sextants and special maps', () => {
    const ids = actionsFor('cartography').map((a) => a.id);
    expect(ids).not.toContain('chart_t1');
    expect(ids).toContain('chart_t2');
    expect(ids).toContain('special_boss_t1');
    expect(ids).toContain('special_vault_t10');
    expect(ids).toContain('special_guardian_t10');
    expect(ids).toContain('special_pinnacle_t10');
    expect(ids).toContain('special_lost_chart');
  });

  it('gates special map recipes on level, scraps and matching plain maps', () => {
    const s = newGame(1);
    s.skills.cartography = xpToReach('cartography', 85);
    const bossT5 = actionDef('special_boss_t5');
    s.storage.bank.boss_scrap = 3;
    s.storage.bank.gall_ink = 2;
    expect(actionBlocker(s, bossT5)).toBe('Missing materials'); // needs 1 plain T5 map
    addMaps(s, 5, 1);
    expect(actionBlocker(s, bossT5)).toBeNull();

    const pinnacle = actionDef('special_pinnacle_t10');
    s.storage.bank.guardian_trophy = 4;
    addMaps(s, 10, 1);
    expect(actionBlocker(s, pinnacle)).toBeNull();
  });

  it('crafts special maps, tracks Atlas perks at 5/15/25/35, and runs Boss/Vault/Guardian/Pinnacle/Lost maps', () => {
    const s = newGame(2);
    s.account.campaignDone = true;
    s.skills.cartography = xpToReach('cartography', 85);
    addMaps(s, 10, 5);
    const ctx = makeCtx(seeded(1));

    // Craft a Guardian map
    const [guardMap] = specialMapDone(s, ctx, actionDef('special_guardian_t10'), 1);
    expect(guardMap.kind).toBe('guardian');
    expect(s.cartography.atlas).toContain('guardian:10');
    expect(startSpecialMap(s, ctx, guardMap.uid)).toBeNull();
    s.maps.run!.bossDown = true;
    mapStep(s, ctx);
    expect(s.storage.bank.guardian_trophy).toBe(1);

    // Craft and run a Lost Chart
    const [lostMap] = specialMapDone(s, ctx, actionDef('special_lost_chart'), 1);
    expect(lostMap.lostId).toBeDefined();
    expect(startSpecialMap(s, ctx, lostMap.uid)).toBeNull();
    s.maps.run!.bossDown = true;
    mapStep(s, ctx);
    expect(s.storage.bank.atlas_survey_record).toBe(1);

    // Craft and run a Vault map (half packs + currency chest + vault scraps)
    const [vaultMap] = specialMapDone(s, ctx, actionDef('special_vault_t10'), 1);
    expect(startSpecialMap(s, ctx, vaultMap.uid)).toBeNull();
    s.maps.run!.bossDown = true;
    mapStep(s, ctx);
    expect(s.storage.bank.vault_scrap).toBeGreaterThanOrEqual(1);

    // Atlas perks
    expect(atlasSpecialPerks(s).bossScrapMult).toBe(1);
    s.cartography.atlas = Array.from({ length: 35 }, (_, i) => `k:${i}`);
    expect(atlasSpecialPerks(s)).toEqual({
      bossScrapMult: 1.2,
      vaultRollsMult: 1.25,
      guardianScrapMult: 1.2,
      lostChartMult: 1.5,
    });
  });

  it('drops boss scraps from map bosses and migrates v62 saves safely', () => {
    const s = newGame(3);
    const drops = rollMapBossScraps(s, makeCtx(seeded(9)));
    expect(drops.boss_scrap).toBeGreaterThanOrEqual(1);

    const raw = JSON.parse(serialize(s));
    raw.version = 62;
    delete raw.cartography;
    raw.storage.bank.chart_survey_fragment = 7;
    raw.skillingMastery['task.chart_t1'] = 900;
    raw.action = { kind: 'skill', actionId: 'chart_t1', progress: 0 };

    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.storage.bank.boss_scrap).toBeGreaterThanOrEqual(7);
    expect(loaded.skillingMastery['task.special_boss_t1']).toBe(900);
    expect(loaded.action).toBeNull();
  });
});
