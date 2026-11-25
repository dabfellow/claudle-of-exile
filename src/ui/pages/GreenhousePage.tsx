import { SKILLS } from '../../data/skills';
import { greenhousePlotCount } from '../../engine/foraging';
import { skillLevel } from '../../engine/skills';
import { useGame } from '../../game';
import { Badge, GameIcon } from '../components/common';
import { GreenhouseBench } from '../components/ForagingBench';
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
  return (
    <div className="page profession-page profession-harvesting" style={{ ['--profession' as string]: color }}>
      <div className="card profession-header" style={{ ['--skill' as string]: color }}>
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
      </div>
      <GreenhouseBench onGoWild={() => go('harvesting')} />
    </div>
  );
}
