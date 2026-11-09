import type { CSSProperties, ReactNode } from 'react';
import { DOOMED_TIERS, MAP_TIERS, SEXTANTS, UNIQUE_MAPS } from '../../data/maps';
import { cartographyOpen } from '../../engine/cartography';
import { stationLockReason } from '../../engine/hideout';
import { doomedHeld, mapsHeld, uniqueMapHeld } from '../../engine/maps';
import { useGame } from '../../game';
import { fmt, MatIcon } from './common';
import { TIER_ART, tierColor, zoneArt } from './mapLook';
import '../round2-session2.css';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

/** One kind of map in the case: its mark, how many you have and its name. */
function Tile({ mark, count, name, color, art, title }: { mark: ReactNode; count: number; name: ReactNode; color: string; art?: string; title?: string }) {
  return (
    <div className={`mc-tile ${count > 0 ? '' : 'empty'}`} style={{ ['--portal' as string]: color, ...(art ? { ['--art' as string]: `url(${art})` } : {}) } as CSSProperties} title={title}>
      <span className="mc-tile-mark">{mark}</span>
      <b className="mc-tile-count num">×{fmt(count)}</b>
      <span className="mc-tile-name">{name}</span>
    </div>
  );
}

/** Cartography's own panel: every map and Sextant your realm holds, however you came by it. */
export function MapCaseBoard() {
  const s = useGame();
  if (!cartographyOpen(s)) return <div className="callout skill-note">Nothing out here has ever been worth mapping. Reach Act 6 to start.</div>;
  const locked = stationLockReason(s, 'map_device');
  return (
    <>
      <div className="callout skill-note">
        Maps are shared across your realm. Draw Tier 1 maps here, combine three of a tier into the next tier up, or craft Sextants for the Map Device.{' '}
        {locked ? "The Map Device won't wake until Act 6 is beaten: what you draw now waits in the case." : 'Auto-run at the Map Device runs one tier until its stock runs out.'}
      </div>
      <div className="card">
        <div className="card-title">
          Map case
          <span className="grow" />
          <span className="card-hint">{s.lifetime.mapsDrawn} drawn</span>
        </div>
        <div className="mc-tiles">
          {MAP_TIERS.map((tier) => (
            <Tile key={tier.tier} mark={tier.tier} count={mapsHeld(s, tier.tier)} name={`Lv ${tier.level} · ${tier.modName}`} color={tierColor(tier.tier)} art={zoneArt(TIER_ART[tier.tier - 1])} title={`Map Tier ${tier.tier}: ${tier.modDesc}`} />
          ))}
          {DOOMED_TIERS.filter((d) => doomedHeld(s, d.tier) > 0).map((d) => (
            <Tile key={`doomed-${d.tier}`} mark={ROMAN[d.tier]} count={doomedHeld(s, d.tier)} name={d.name} color="#c0433b" art={zoneArt('shatteredthrone')} />
          ))}
          {UNIQUE_MAPS.filter((u) => uniqueMapHeld(s, u.id) > 0).map((u) => (
            <Tile key={u.id} mark={`T${u.tier}`} count={uniqueMapHeld(s, u.id)} name={<span className="rar-unique">{u.name}</span>} color="var(--unique)" title={u.desc} />
          ))}
        </div>
        <div className="mc-sextants">
          {SEXTANTS.map((sex) => (
            <span key={sex.id} title={sex.desc}>
              <MatIcon id={sex.id} size={14} />
              {sex.name} <b className="num">{fmt(s.account.bank[sex.id] ?? 0)}</b>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
