import { materialDef } from '../../data/materials';
import { recipeMaterialCount } from '../../engine/bank';
import type { GameState } from '../../engine/types';
import { fmt, MatIcon } from './common';
import { StationDock } from './StationDock';
import './sawmill-station.css';

const DOCK_LOGS = [
  ['ash_log', 'Ash Log'],
  ['oak_log', 'Oak Log'],
  ['yew_log', 'Yew Log'],
] as const;

/** Right-hand material dock in the Sawmilling banner: the key raw logs and heartwood, in timber-framed sockets. */
export function SawmillHeroDock({ s }: { s: GameState }) {
  const have = (id: string) => recipeMaterialCount(s.storage.bank, id);
  const fragments = have('heartwood_fragment');
  const heartwood = have('ancient_heartwood');
  return (
    <StationDock
      label="Sawmill logs"
      items={[
        ...DOCK_LOGS.map(([id, label]) => ({ key: id, icon: <MatIcon id={id} size={28} />, label, value: have(id), title: `${materialDef(id).name}: ${fmt(have(id))}` })),
        {
          key: 'heartwood',
          icon: <MatIcon id="heartwood_fragment" size={28} />,
          label: 'Heartwood',
          value: heartwood > 0 ? `${fmt(fragments)} · ${fmt(heartwood)}` : fragments,
          title: `Heartwood Fragments: ${fmt(fragments)} · Ancient Heartwood: ${fmt(heartwood)}`,
        },
      ]}
    />
  );
}
