import { describe, expect, it } from 'vitest';
import { actionDef } from '../src/data/skills';
import { uniqueMapDef } from '../src/data/maps';
import { encounterWorldDropUniques, worldDropUniques } from '../src/data/uniqueDrops';
import { UNIQUE_MAPS } from '../src/data/maps';
import { newGame } from '../src/engine/state';
import { startSkillAction, skillStep } from '../src/engine/skills';
import { deriveStats } from '../src/engine/stats';
import { xpForLevel } from '../src/engine/xp';
import { addUniqueMaps, mapStep, startUniqueMap, uniqueMapHeld, MAPS_PREVIEW, addMaps, startMap } from '../src/engine/maps';
import { simulateOffline } from '../src/engine/offline';
import { cartographyPreview } from '../src/engine/cartography';
import type { Ctx } from '../src/engine/context';
import { prepareReliquaryMapper } from '../src/dev/overhaulBuilds';
import { seeded } from '../src/engine/rng';
const ctx = (): Ctx => ({ now: 0, rng: { next: () => .999 }, emit: () => {} });
const make = () => { const s = newGame(1); s.skills.cartography = xpForLevel(90); return s; };

describe('Phase 13 charts and encounters', () => {
  it('keeps old map trophies out of the crafted destination without changing other encounter pools', () => {
    const trophies = new Set(UNIQUE_MAPS.filter((m) => !m.craftedOnly).flatMap((m) => m.uniques));
    expect(encounterWorldDropUniques(100, 'umap_artisans_reliquary').some((u) => trophies.has(u.id))).toBe(false);
    expect(encounterWorldDropUniques(100, 'umap_vaults')).toEqual(worldDropUniques(100));
  });
  it('finishes the real 20-pack encounter and guardian offline with ordinary gear and paid passive points', () => {
    const s = newGame(4, { name: 'Mapper', classId: 'duelist' });
    const c = { ...ctx(), rng: seeded(4) };
    prepareReliquaryMapper(s, c);
    addUniqueMaps(s, 'umap_artisans_reliquary', 1);
    expect(startUniqueMap(s, c, 'umap_artisans_reliquary')).toBeNull();
    simulateOffline(s, c, 1_200_000);
    expect(s.lifetime.deaths).toBe(0);
    expect(s.maps.tally.runs).toBe(1);
    expect(s.storage.bank.reliquary_fragment).toBe(1);
  });
  it('produces dependable chart progress without combat and protects folio counters', () => {
    const s = make(); s.storage.bank.ash_log = 2400;
    expect(startSkillAction(s, ctx(), 'chart_vellum')).toBeNull();
    skillStep(s, ctx(), 600 * 3500, deriveStats(s));
    expect(s.storage.bank.chart_survey_fragment).toBe(20);
    s.storage.bank.vellum = 100; s.storage.bank.gall_ink = 100;
    const before = s.professionProgress.work.cartography!;
    startSkillAction(s, ctx(), 'chart_folio_t1'); skillStep(s, ctx(), 60_000, deriveStats(s));
    expect(s.professionProgress.work.cartography! - before).toBe(5);
    expect(s.professionProgress.counters['cartography.survey']).toBe(601);
    expect(cartographyPreview(s, actionDef('chart_sextant_master')).join(' ')).toMatch(/Roll pool/);
  });

  it('blocks noncombat entry without consuming charts, then settles victory once without trophy or Atlas spending', () => {
    const s = make(); addUniqueMaps(s, 'umap_artisans_reliquary', 2);
    const preview = MAPS_PREVIEW.enabled; MAPS_PREVIEW.enabled = false;
    try {
      expect(startUniqueMap(s, ctx(), 'umap_artisans_reliquary')).toMatch(/Act 7/);
      expect(uniqueMapHeld(s, 'umap_artisans_reliquary')).toBe(2);
      s.account.campaignDone = true;
      expect(startUniqueMap(s, ctx(), 'umap_artisans_reliquary')).toBeNull();
      expect(uniqueMapHeld(s, 'umap_artisans_reliquary')).toBe(1);
      expect(s.maps.run!.packsTotal).toBe(20);
      expect(uniqueMapDef('umap_artisans_reliquary').uniques).toEqual([]);
      const allocated = [...s.account.atlas!.nodes], dust = s.storage.bank.arcane_dust ?? 0;
      s.maps.run!.bossDown = true; mapStep(s, ctx()); mapStep(s, ctx());
      expect(s.storage.bank.reliquary_fragment).toBe(1);
      const roughTotal = Object.entries(s.storage.bank).filter(([k]) => k === 'rough_gem' || k.startsWith('rough_gem_')).reduce((a, [, n]) => a + n, 0);
      expect(roughTotal).toBe(10); expect(s.storage.bank.arcane_dust).toBe(dust + 100);
      expect(s.account.atlas!.nodes).toEqual(allocated);
      expect(startUniqueMap(s, ctx(), 'umap_artisans_reliquary')).toBeNull();
      s.combat = null; mapStep(s, ctx());
      expect(s.storage.bank.reliquary_fragment).toBe(1);
      expect(uniqueMapHeld(s, 'umap_artisans_reliquary')).toBe(0);
    } finally { MAPS_PREVIEW.enabled = preview; }
  });

  it('awards survey records only on ten normal T10 victories and consumes the record in protected assembly', () => {
    const s = make(); s.account.campaignDone = true;
    for (let i = 0; i < 10; i++) {
      addMaps(s, 10, 1); expect(startMap(s, ctx(), 10)).toBeNull(); s.maps.run!.bossDown = true; mapStep(s, ctx());
      expect(s.storage.bank.atlas_survey_record ?? 0).toBe(i === 9 ? 1 : 0);
    }
    Object.assign(s.storage.bank, { fine_vellum: 10, sepia_ink: 5, sextant_master: 1 });
    startSkillAction(s, ctx(), 'chart_endgame_atlas'); simulateOffline(s, ctx(), 240_000);
    expect(s.storage.bank.completed_atlas_chart).toBe(1);
    expect(s.storage.bank.atlas_survey_record).toBe(0);
  });
});
