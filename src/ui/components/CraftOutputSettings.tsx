import { BENCH_UNBUILT, benchBuilt } from '../../engine/crafting';
import { game, useGame } from '../../game';

export function CraftOutputSettings() {
  const s = useGame();
  const enabled = benchBuilt(s);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="row wrap">
        <label className="row">
          Fill first
          <select className="input" value={s.settings.craftFillFirst ?? 'inventory'} onChange={(event) => {
            const destination = event.target.value === 'stash' ? 'stash' : 'inventory';
            game.act((state) => { state.settings.craftFillFirst = destination; });
          }}>
            <option value="inventory">Inventory</option>
            <option value="stash">Stash</option>
          </select>
        </label>
        <label className="check" title={enabled ? undefined : BENCH_UNBUILT}>
          <input type="checkbox" checked={!!s.settings.autoSalvageCraftedGear} disabled={!enabled} onChange={(event) => {
            const checked = event.target.checked;
            game.act((state) => { state.settings.autoSalvageCraftedGear = checked; });
          }} />
          Auto-salvage crafted gear
        </label>
      </div>
      <p className="muted small" style={{ margin: 0 }}>Finished gear goes to the other space when your first choice is full. Auto-salvage turns gear from regular recipes into Arcane Dust. Masterworks, programmed relics and successful fossil repeats are kept.</p>
    </div>
  );
}
