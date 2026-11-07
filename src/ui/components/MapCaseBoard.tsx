import { DOOMED_TIERS, MAP_TIERS, SEXTANTS } from '../../data/maps';
import { cartographyOpen } from '../../engine/cartography';
import { stationLockReason } from '../../engine/hideout';
import { doomedHeld, mapsHeld } from '../../engine/maps';
import { useGame } from '../../game';
import { fmt, GameIcon, MatIcon } from './common';

/** Cartography's own panel: every map and Sextant your realm holds, however you came by it. */
export function MapCaseBoard() {
  const s = useGame();
  if (!cartographyOpen(s)) return <div className="callout skill-note">Nothing out here has ever been worth mapping. Reach Act 6 to start.</div>;
  const locked = stationLockReason(s, 'map_device');
  const anyDoomed = DOOMED_TIERS.some((d) => doomedHeld(s, d.tier) > 0);
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
        <ul className="ingredients">
          {MAP_TIERS.map((tier) => (
            <li key={tier.tier}>
              <GameIcon name="map" size={13} />
              <span className="ing-name">
                Map Tier {tier.tier} <span className="dim small">· Lv {tier.level} · {tier.modName}</span>
              </span>
              <span className="ing-qty num">{fmt(mapsHeld(s, tier.tier))}</span>
            </li>
          ))}
          {anyDoomed &&
            DOOMED_TIERS.filter((d) => doomedHeld(s, d.tier) > 0).map((d) => (
              <li key={`doomed-${d.tier}`}>
                <GameIcon name="map" size={13} color="var(--danger)" />
                <span className="ing-name">{d.name}</span>
                <span className="ing-qty num">{fmt(doomedHeld(s, d.tier))}</span>
              </li>
            ))}
          {SEXTANTS.map((sex) => (
            <li key={sex.id}>
              <MatIcon id={sex.id} size={13} />
              <span className="ing-name">{sex.name}</span>
              <span className="ing-qty num">{fmt(s.account.bank[sex.id] ?? 0)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
