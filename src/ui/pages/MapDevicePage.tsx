import { MAP_RARITY, stationDef } from '../../data/hideout';
import { ACTS } from '../../data/zones';
import { stationLevel } from '../../engine/hideout';
import { useGame } from '../../game';
import { Badge, EmptyState, GameIcon, PageHeader } from '../components/common';
import type { Page } from '../Layout';

/** Maps: endgame areas opened at the Map Device once the campaign is done. Not built yet. */
export function MapDevicePage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const device = stationDef('map_device');
  const lvl = stationLevel(s, 'map_device');
  const lastAct = ACTS[ACTS.length - 1];
  return (
    <div className="page">
      <PageHeader title="Map Device" actions={<Badge tone="gold">Level {lvl}</Badge>}>
        {device.desc}
      </PageHeader>
      <div className="card">
        <EmptyState icon={<GameIcon name="lock" size={32} color="var(--dim)" />} title="Maps are sealed">
          Maps open once you finish Act {lastAct.n}, {lastAct.name}. Until then the device's attunement still helps: it adds{' '}
          <b>+{MAP_RARITY[lvl - 1] ?? 0}% Item Rarity</b> everywhere you fight.
        </EmptyState>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={() => go('hideout')}>
            Upgrade it in the Hideout
          </button>
        </div>
      </div>
    </div>
  );
}
