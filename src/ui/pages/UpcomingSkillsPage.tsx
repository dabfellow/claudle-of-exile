import { UPCOMING_SKILLS } from '../../data/skills';
import { useGame } from '../../game';
import { Badge } from '../components/common';
import { Icon } from '../components/Icon';

/** Skills that are planned but not built: a teaser list (docs/GAME.md). */
export function UpcomingSkillsPage() {
  const s = useGame();
  const upcoming = UPCOMING_SKILLS.filter((u) => !u.gate || !s.unlockedZones.includes(u.gate.zone));
  return (
    <div className="page">
      <div className="card upcoming-hero">
        <div className="upcoming-hero-icons" aria-hidden>
          {upcoming.map((u) => (
            <span key={u.name} style={{ ['--skill' as string]: u.color }}>
              <Icon name={u.icon} size={26} color={u.color} />
            </span>
          ))}
        </div>
        <span className="page-kicker">Skilling</span>
        <h1>Coming soon</h1>
        <p>
          {upcoming.length} more skills are on the workbench. None of them can be trained yet.
        </p>
      </div>
      <div className="upcoming-grid">
        {upcoming.map((u) => (
          <div key={u.name} className="card upcoming-card" style={{ ['--skill' as string]: u.color }}>
            <div className="upcoming-icon">
              <Icon name={u.icon} size={34} color={u.color} />
            </div>
            <div className="upcoming-text">
              <b className="upcoming-name">{u.name}</b>
              <span className="upcoming-theme">{u.theme}</span>
              <p>{u.desc}</p>
            </div>
            <div className="upcoming-foot">
              <Badge tone="locked">In the works</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
