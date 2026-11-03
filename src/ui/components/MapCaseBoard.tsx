import { MAP_THEMES, MAP_TIERS } from '../../data/maps';
import { cartographyOpen } from '../../engine/cartography';
import { stationLockReason } from '../../engine/hideout';
import { mapsHeld } from '../../engine/maps';
import { useGame } from '../../game';
import { fmt, GameIcon } from './common';

/** Cartography's own panel: every map you hold, however you came by it. */
export function MapCaseBoard() {
  const s = useGame();
  if (!cartographyOpen(s)) return <div className="callout skill-note">Nothing out here has ever been worth mapping. Reach Act 6 to start.</div>;
  const locked = stationLockReason(s, 'map_device');
  return (
    <>
      <div className="callout skill-note">
        Maps also drop from monsters, but a drawn map is the theme you choose. {locked ? "The Map Device won't wake until Act 6 is beaten: what you draw now waits in the case." : 'Auto-run at the Map Device uses them up one kind at a time.'}
      </div>
      <div className="card">
        <div className="card-title">
          Map case
          <span className="grow" />
          <span className="card-hint">{s.lifetime.mapsDrawn} drawn</span>
        </div>
        <ul className="ingredients">
          {MAP_TIERS.flatMap((tier) =>
            MAP_THEMES.filter((theme) => tier.tier <= 3 || mapsHeld(s, tier.tier, theme.id) > 0).map((theme) => (
              <li key={`${tier.tier}-${theme.id}`}>
                <GameIcon name="map" size={13} />
                <span className="ing-name">Tier {tier.tier} {theme.name}</span>
                <span className="ing-qty num">{fmt(mapsHeld(s, tier.tier, theme.id))}</span>
              </li>
            )),
          )}
        </ul>
      </div>
    </>
  );
}
