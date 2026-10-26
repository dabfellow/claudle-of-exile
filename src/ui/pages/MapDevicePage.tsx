import { stationDef } from '../../data/hideout';
import { FINAL_ACT, stationLockReason } from '../../engine/hideout';
import { useGame } from '../../game';
import { Badge, EmptyState, GameIcon, PageHeader } from '../components/common';
import type { Page } from '../Layout';

/** Maps: endgame areas opened at the Map Device once the campaign (Act 6) is done. Not built yet. */
export function MapDevicePage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const device = stationDef('map_device');
  const locked = stationLockReason(s, 'map_device');
  return (
    <div className="page">
      <PageHeader title="Map Device" actions={locked ? <Badge tone="locked">Locked</Badge> : undefined}>
        {device.desc}
      </PageHeader>
      <div className="card">
        <EmptyState icon={<GameIcon name="lock" size={32} color="var(--dim)" />} title="Maps are sealed">
          Maps come after the campaign: the Map Device wakes once you beat Act {FINAL_ACT}. The acts after Act 2 aren't out yet.
        </EmptyState>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={() => go('campaign')}>
            Back to the Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
