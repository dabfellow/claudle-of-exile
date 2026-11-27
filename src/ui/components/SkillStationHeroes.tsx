import { ANCIENT_DATA, SEALED_RELIC } from '../../data/expedition';
import { materialDef } from '../../data/materials';
import { MINING_METALS } from '../../data/mining';
import { SCRIPTS } from '../../data/deciphering';
import { TAILOR_TIERS } from '../../data/tailoring';
import { WOODS } from '../../data/woodcutting';
import { recipeMaterialCount } from '../../engine/bank';
import { skillLevel } from '../../engine/skills';
import type { GameState } from '../../engine/types';
import { fmt, GameIcon, MatIcon } from './common';
import { StationDock, type StationDockItem } from './StationDock';
import './skill-station-banners.css';

/** The four herbs alchemy recipes are brewed from, in order of level. */
const ALCHEMY_HERBS = ['sunpetal', 'frostleaf', 'emberroot', 'voidbloom'];

const held = (s: GameState, id: string) => recipeMaterialCount(s.storage.bank, id);

/** One socket for a single material: its icon, short name and bank count, dimmed at zero. */
function matItem(s: GameState, id: string, label?: string, hint?: string): StationDockItem {
  const count = held(s, id);
  const name = materialDef(id).name;
  return {
    key: id,
    icon: <span className="station-pixel"><MatIcon id={id} size={28} /></span>,
    label: label ?? name,
    value: count,
    dim: count <= 0,
    title: `${name}: ${fmt(count)} in the bank${hint ? ` · ${hint}` : ''}`,
  };
}

/** One socket summing a family of materials (every tier of cloth, say); the icon shows the best tier held. */
function familyItem(s: GameState, key: string, label: string, ids: string[], empty: string): StationDockItem {
  const counts = ids.map((id) => ({ id, count: held(s, id) }));
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  const best = [...counts].reverse().find((c) => c.count > 0) ?? counts[0];
  const some = counts.filter((c) => c.count > 0);
  return {
    key,
    icon: <span className="station-pixel"><MatIcon id={best.id} size={28} /></span>,
    label,
    value: total,
    dim: total <= 0,
    title: `${label} ${fmt(total)} · ${some.length ? some.map((c) => `${materialDef(c.id).name} ${fmt(c.count)}`).join(' · ') : empty}`,
  };
}

/** Woodcutting: the four highest logs your level can fell. */
export function WoodcuttingHeroDock({ s }: { s: GameState }) {
  const level = skillLevel(s, 'woodcutting');
  const open = WOODS.filter((w) => w.level <= level);
  const shown = (open.length >= 4 ? open.slice(-4) : WOODS.slice(0, 4));
  const items = shown.map((w) => {
    const item = matItem(s, `${w.id}_log`, w.name, w.level > level ? `felled from level ${w.level}` : w.region);
    return w.level > level ? { ...item, dim: true } : item;
  });
  return <StationDock label="Logs in the bank" items={items} className="skill-station-dock" />;
}

/** Forging: the four best bars your Forging level works, from the Crucible. */
export function ForgingHeroDock({ s }: { s: GameState }) {
  const bars = MINING_METALS.map((m) => `${m.id}_bar`);
  const best = bars.reduce((last, id, i) => (held(s, id) > 0 ? i : last), 0);
  const start = Math.max(0, Math.min(best - 2, bars.length - 4));
  const items = bars.slice(start, start + 4).map((id) => matItem(s, id, materialDef(id).name.replace(/ Bar$/, ''), 'smelted at the Crucible'));
  return <StationDock label="Bars for the anvil" items={items} className="skill-station-dock" />;
}

/** Tailoring: fibre and hides in, cloth and leather out, each summed across the three tiers. */
export function TailoringHeroDock({ s }: { s: GameState }) {
  const items = [
    familyItem(s, 'fibre', 'Fibre', TAILOR_TIERS.map((t) => t.fibre), 'found while Foraging'),
    familyItem(s, 'cloth', 'Cloth', TAILOR_TIERS.map((t) => t.cloth), 'woven from fibre at this table'),
    familyItem(s, 'hides', 'Hides', TAILOR_TIERS.map((t) => t.hide), 'bought at the hide stall below'),
    familyItem(s, 'leather', 'Leather', TAILOR_TIERS.map((t) => t.leather), 'tanned from hides at this table'),
  ];
  return <StationDock label="Tailoring stock" items={items} className="skill-station-dock" />;
}

/** Alchemy: the herbs your brews call for, then Arcane Dust for the orb recipes. */
export function AlchemyHeroDock({ s }: { s: GameState }) {
  const items = [
    ...ALCHEMY_HERBS.map((id) => matItem(s, id, undefined, 'gathered while Foraging')),
    matItem(s, 'arcane_dust', 'Arcane Dust', 'salvaged from items, used in the orb recipes'),
  ];
  return <StationDock label="Apothecary stores" items={items} className="skill-station-dock skill-station-dock-wide"
    style={{ ['--station-dock-cols' as string]: items.length }} />;
}

/** Archaeology: inscriptions waiting on the desk, story chapters read, Ancient Data and sealed relics. */
export function ArchaeologyHeroDock({ s }: { s: GameState }) {
  const a = s.archaeology;
  const waiting = a.inscriptions.length;
  const chapters = SCRIPTS.reduce((sum, x) => sum + (a.chapters[x.id] ?? 0), 0);
  const chapterTotal = SCRIPTS.reduce((sum, x) => sum + x.chapters, 0);
  const items: StationDockItem[] = [
    {
      key: 'inscriptions', icon: <GameIcon name="archaeology" size={24} color="var(--station-ink)" />, label: 'To translate', value: waiting, dim: waiting === 0,
      title: waiting ? `${waiting} inscription${waiting === 1 ? '' : 's'} waiting on the desk` : 'No inscriptions waiting · dig to find more',
    },
    {
      key: 'chapters', icon: <GameIcon name="campaign" size={24} color="var(--station-ink)" />, label: 'Chapters', value: `${chapters}/${chapterTotal}`, dim: chapters === 0,
      title: SCRIPTS.map((x) => `${x.name} ${a.chapters[x.id] ?? 0}/${x.chapters}`).join(' · '),
    },
    matItem(s, ANCIENT_DATA, 'Ancient Data', 'spent at the Relic Forge'),
    matItem(s, SEALED_RELIC, 'Sealed Relics', 'opened on the Relics tab'),
  ];
  return <StationDock label="Excavation finds" items={items} className="skill-station-dock" />;
}
