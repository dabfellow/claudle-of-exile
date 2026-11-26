import { materialDef } from '../../data/materials';
import type { GameState } from '../../engine/types';
import { MatIcon } from './common';
import { StationDock } from './StationDock';
import './station-banners-botanical.css';

/** Herbs and fibre gathered in the wild, shown in the Foraging banner's botanical sockets. */
const FORAGING_DOCK_HERBS = ['sunpetal', 'frostleaf', 'emberroot', 'flax'] as const;

/** Right-hand material dock in the Foraging banner (top gathered herbs). */
export function ForagingHeroDock({ s }: { s: GameState }) {
  return <StationDock
    label="Gathered herbs"
    style={{ gridArea: 'dock' }}
    items={FORAGING_DOCK_HERBS.map((id) => {
      const held = s.storage.bank[id] ?? 0;
      return {
        key: id,
        icon: <MatIcon id={id} size={28} />,
        label: materialDef(id).name,
        value: held,
        title: `${materialDef(id).name}: ${held.toLocaleString()} in the bank`,
      };
    })}
  />;
}
