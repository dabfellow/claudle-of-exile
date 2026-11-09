import { describe, expect, it } from 'vitest';
import { STATIONS } from '../src/data/hideout';
import { materialDef } from '../src/data/materials';
import { actionDef } from '../src/data/skills';
import { makeCtx } from '../src/engine/context';
import { createItem } from '../src/engine/items';
import { placeItem } from '../src/engine/loot';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';

describe('hideout overhaul', () => {
  it('refines each tier of logs and ore into construction components', () => {
    expect(actionDef('mill_ash')).toMatchObject({ inputs: { ash_log: 5 }, outputs: { ash_plank: 1 } });
    expect(actionDef('mill_oak')).toMatchObject({ inputs: { oak_log: 5 }, outputs: { oak_plank: 1 } });
    expect(actionDef('mill_yew')).toMatchObject({ inputs: { yew_log: 5 }, outputs: { yew_plank: 1 } });
    expect(actionDef('smelt_copper')).toMatchObject({ inputs: { copper_ore: 5 }, outputs: { copper_bar: 1 } });
    expect(actionDef('smelt_iron')).toMatchObject({ inputs: { iron_ore: 5 }, outputs: { iron_bar: 1 } });
    expect(actionDef('smelt_mithril')).toMatchObject({ inputs: { mithril_ore: 5 }, outputs: { mithril_bar: 1 } });
  });

  it('uses valid refined costs instead of raw log and ore mountains', () => {
    const raw = new Set(['ash_log', 'oak_log', 'yew_log', 'copper_ore', 'iron_ore', 'mithril_ore']);
    for (const station of STATIONS) {
      for (const level of station.levels.slice(1)) {
        for (const id of Object.keys(level.cost)) {
          expect(() => materialDef(id), `${station.id}: ${id}`).not.toThrow();
          expect(raw.has(id), `${station.id} still charges raw ${id}`).toBe(false);
        }
      }
    }
    expect(STATIONS.find((s) => s.id === 'quartermaster')!.levels[3].cost).toEqual({
      gold: 30000,
      yew_plank: 150,
      mithril_bar: 150,
      rough_gem: 20,
      boss_trophy: 8,
    });
  });

  it('keeps loot auto-salvage in the Quartermaster levels', () => {
    const s = newGame(1);
    const c = makeCtx(seeded(1));
    s.account.hideout.bench = 2;
    s.settings.autoSalvage.normal = true;
    s.account.hideout.quartermaster = 1;
    placeItem(s, c, createItem(s, 'rusted_sword', 1, 'normal', c.rng));
    expect(s.ground).toHaveLength(1);
    const dust = s.account.bank.arcane_dust ?? 0;
    s.account.hideout.quartermaster = 2;
    placeItem(s, c, createItem(s, 'rusted_sword', 1, 'normal', c.rng));
    expect(s.ground).toHaveLength(1);
    expect(s.account.bank.arcane_dust).toBeGreaterThan(dust);
  });
});
