import { SKILLS } from '../../data/skills';
import { greenhousePlotCount, herbariumCount } from '../../engine/foraging';
import { skillLevel } from '../../engine/skills';
import { useGame } from '../../game';
import { Badge, GameIcon } from '../components/common';
import { GreenhouseBench } from '../components/ForagingBench';
import { StationDock, StationGlyph } from '../components/StationDock';
import '../components/station-hero.css';
import '../components/station-banners-botanical.css';
import type { Page } from '../Layout';

/**
 * The Greenhouse: a Production page of its own. Planting and waiting on beds is setup-and-wait work, so it sits
 * apart from Foraging (set-and-forget gathering). State, beds and unlocks are unchanged: they still live in
 * `s.foraging`, and bed count follows Foraging level.
 */
export function GreenhousePage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const color = SKILLS.harvesting.color;
  const plots = greenhousePlotCount(s);
  const now = Date.now();
  const growing = s.foraging.plots.slice(0, plots).filter(Boolean).length;
  const ready = s.foraging.plots.slice(0, plots).filter((p) => p && p.readyAt <= now).length;
  // Same count as the Seeds tab badge: strains with seeds in the satchel, or stable strains.
  const seedsReady = Object.keys(s.foraging.strains).filter(
    (k) => (s.foraging.seeds[k] ?? 0) > 0 || !!s.foraging.strains[k]?.stable,
  ).length;
  const pressed = herbariumCount(s);
  return (
    <div className="page profession-page profession-harvesting" style={{ ['--profession' as string]: color }}>
      <div className="card profession-header station-hero greenhouse-hero" style={{ ['--skill' as string]: color }}>
        <div className="profession-header-icon">
          <GameIcon name="harvesting" size={32} color={color} />
        </div>
        <div className="profession-header-text" style={{ minWidth: 0 }}>
          <h1>Greenhouse</h1>
          <p>Plant, wait, harvest and breed</p>
        </div>
        <div className="xp">
          <div className="row">
            <span className="spacer" />
            {plots === 0 ? (
              <Badge tone="locked">Foraging Lv 5</Badge>
            ) : (
              <Badge tone={ready > 0 ? 'gold' : 'neutral'}>
                {ready > 0 ? `${ready} ready` : `${growing}/${plots} beds growing`}
              </Badge>
            )}
          </div>
          <div className="dim small">
            Seeds come from Foraging. More beds open as your Foraging level rises (now {skillLevel(s, 'harvesting')}).
          </div>
        </div>
        <StationDock
          label="Greenhouse"
          style={{ gridArea: 'dock' }}
          items={[
            { key: 'beds', icon: <StationGlyph name="greenhouse" size={26} />, label: 'Active Beds', value: `${growing}/${plots}`, title: `${growing} of ${plots} beds planted` },
            { key: 'seeds', icon: <StationGlyph name="seed" size={26} />, label: 'Seeds Ready', value: seedsReady, title: `${seedsReady} strains ready to plant` },
            { key: 'pressed', icon: <StationGlyph name="herbs" size={26} />, label: 'Pressed Strains', value: `${pressed}/200`, title: `${pressed} of 200 milestone strains pressed in the Herbarium` },
          ]}
        />
      </div>
      <GreenhouseBench onGoWild={() => go('harvesting')} />
    </div>
  );
}
