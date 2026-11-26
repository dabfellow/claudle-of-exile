import { fallenKind, GILDED_STARDUST, STARDUST } from '../../data/astrology';
import type { GameState } from '../../engine/types';
import { fmt, MatIcon } from './common';
import { StationDock } from './StationDock';
import './astrology-station.css';

/**
 * Right-hand dock in the Astrology banner (The Observatory): Stardust, Gilded Stardust and Fallen Stars
 * in round brass sockets. Banner art and rim colours live in astrology-station.css.
 */
export function AstrologyHeroDock({ s }: { s: GameState }) {
  const dust = s.storage.bank[STARDUST] ?? 0;
  const gilded = s.storage.bank[GILDED_STARDUST] ?? 0;
  const fallen = s.astrology.fallen;
  const fallenNames = fallen.map((f) => fallenKind(f.effect)?.name ?? 'Fallen star');
  return (
    <StationDock
      label="Observatory stores"
      className="astro-dock"
      items={[
        {
          key: 'stardust', icon: <MatIcon id={STARDUST} size={28} />, label: 'Stardust', value: dust, dim: dust <= 0,
          title: `Stardust: ${fmt(dust)} · Gathered by researching the sky. Spent on ranking stars up and recharting`,
        },
        {
          key: 'gilded', icon: <MatIcon id={GILDED_STARDUST} size={28} />, label: 'Gilded Stars', value: gilded, dim: gilded <= 0,
          title: `Gilded Stardust: ${fmt(gilded)} · A rare glint from research. Each star rank past 10 needs one`,
        },
        {
          key: 'fallen', icon: <span className="astro-fallen-glyph" />, label: 'Fallen Stars', value: fallen.length, dim: fallen.length === 0,
          title: fallen.length
            ? `Fallen Stars: ${fallen.length} · ${fallenNames.join(', ')}`
            : 'Fallen Stars: none yet · A very rare meteorite can fall while you watch a star',
        },
      ]}
    />
  );
}
