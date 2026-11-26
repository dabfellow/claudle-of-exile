import { materialDef } from '../../data/materials';
import { recipeMaterialCount } from '../../engine/bank';
import type { GameState } from '../../engine/types';
import { MatIcon } from './common';
import { StationDock, type StationDockItem } from './StationDock';
import './smelting-station.css';

/** The five ores that feed the Crucible, docked in iron sockets on the banner. */
const SMELT_DOCK_ORES = ['copper_ore', 'iron_ore', 'mithril_ore', 'adamant_ore', 'star_ore'] as const;

/** Right-hand material dock in the Smelting banner ("The Crucible"): one iron socket per ore, in a single row. */
export function SmeltingHeroDock({ s }: { s: GameState }) {
  const items: StationDockItem[] = SMELT_DOCK_ORES.map((id) => {
    const owned = recipeMaterialCount(s.storage.bank, id);
    const name = materialDef(id).name;
    return {
      key: id,
      icon: <span className="station-pixel smelt-dock-ore"><MatIcon id={id} size={28} /></span>,
      label: name.replace(/ Ore$/, ''),
      value: owned,
      title: `${name}: ${owned.toLocaleString()} in the bank`,
      dim: owned <= 0,
    };
  });
  // five sockets sit in one row (the shared dock caps at four columns)
  return <StationDock label="Ores for the furnace" items={items} className="smelt-dock"
    style={{ ['--station-dock-cols' as string]: items.length }} />;
}
