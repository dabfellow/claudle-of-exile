import { MINING_METALS } from '../../data/mining';
import { materialDef } from '../../data/materials';
import { recipeMaterialCount } from '../../engine/bank';
import type { GameState } from '../../engine/types';
import { MatIcon } from './common';
import { Icon } from './Icon';
import { StationDock, type StationDockItem } from './StationDock';
import './mining-station.css';

/** The first ores the Delve yields, shown beside Rubble in the banner. */
const DOCK_ORES = MINING_METALS.slice(0, 4).map((metal) => `${metal.id}_ore`);

/** Right-hand material dock in the Mining banner: Rubble, Supports (once owned) and the top ores. */
export function MiningHeroDock({ s }: { s: GameState }) {
  const rubble = s.storage.bank.rubble ?? 0;
  const supports = s.storage.bank.mine_support ?? 0;
  const items: StationDockItem[] = [
    {
      key: 'rubble', icon: <MatIcon id="rubble" size={28} />, label: 'Rubble', value: rubble,
      title: `Rubble ${rubble.toLocaleString()} · Collect it while mining and spend it to dig deeper`,
    },
  ];
  if (supports > 0) {
    items.push({
      key: 'supports', icon: <Icon name="support" size={24} />, label: 'Supports', value: supports,
      title: `Supports ${supports.toLocaleString()} · Existing supports are spent before rubble`,
    });
  }
  for (const id of DOCK_ORES) {
    const owned = recipeMaterialCount(s.storage.bank, id);
    const name = materialDef(id).name;
    items.push({
      key: id, icon: <MatIcon id={id} size={28} />, label: name.replace(/ Ore$/, ''), value: owned,
      title: `${name} ${owned.toLocaleString()}`,
    });
  }
  return <StationDock label="Mining materials" items={items}
    style={{ ['--station-dock-cols' as string]: items.length }} />;
}
