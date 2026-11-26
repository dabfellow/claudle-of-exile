import { materialDef } from '../../data/materials';
import { WOODS } from '../../data/woodcutting';
import { recipeMaterialCount } from '../../engine/bank';
import type { GameState } from '../../engine/types';
import { fmt, MatIcon } from './common';
import { StationDock, type StationDockItem } from './StationDock';
import './woodcrafting-station.css';

/** Sawn parts come in Ash, Oak and Yew; planks in every wood. */
const PART_WOODS = ['ash', 'oak', 'yew'];
const DOCK_PARTS: { key: string; label: string; suffix: string; woods: string[] }[] = [
  { key: 'planks', label: 'Planks', suffix: 'plank', woods: WOODS.map((w) => w.id) },
  { key: 'staves', label: 'Bow Staves', suffix: 'bow_stave', woods: PART_WOODS },
  { key: 'blanks', label: 'Wand Blanks', suffix: 'wand_blank', woods: PART_WOODS },
  { key: 'shafts', label: 'Staff Shafts', suffix: 'staff_shaft', woods: PART_WOODS },
];

/**
 * Right-hand material dock in the Woodcrafting banner: the sawn parts the bench carves from,
 * each summed over every wood. The socket shows the best wood you hold; the hover lists each tier.
 */
export function WoodcraftingHeroDock({ s }: { s: GameState }) {
  const items: StationDockItem[] = DOCK_PARTS.map(({ key, label, suffix, woods }) => {
    const counts = woods.map((wood) => {
      const id = `${wood}_${suffix}`;
      return { id, count: recipeMaterialCount(s.storage.bank, id) };
    });
    const total = counts.reduce((sum, { count }) => sum + count, 0);
    const best = [...counts].reverse().find(({ count }) => count > 0) ?? counts[0];
    const held = counts.filter(({ count }) => count > 0);
    return {
      key,
      icon: <span className="station-pixel woodcraft-dock-sprite"><MatIcon id={best.id} size={28} /></span>,
      label,
      value: total,
      dim: total === 0,
      title: `${label} ${fmt(total)}${held.length ? ` · ${held.map(({ id, count }) => `${materialDef(id).name} ${fmt(count)}`).join(' · ')}` : ' · none yet, cut them at the Sawmill'}`,
    };
  });
  return <StationDock label="Woodcrafting parts" items={items} className="woodcraft-dock" />;
}
