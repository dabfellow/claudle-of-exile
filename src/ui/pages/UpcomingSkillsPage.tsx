import { UPCOMING_SKILLS } from '../../data/skills';
import { Badge, PageHeader } from '../components/common';
import { Icon } from '../components/Icon';

/** Skills that are planned but not built: a teaser list (docs/SKILLING_REWORK.md §8). */
export function UpcomingSkillsPage() {
  return (
    <div className="page">
      <PageHeader kicker="Skilling" title="Coming soon">
        More skills are on the way. None of these can be trained yet.
      </PageHeader>
      <div className="upcoming-grid">
        {UPCOMING_SKILLS.map((u) => (
          <div key={u.name} className="card upcoming-card" style={{ ['--skill' as string]: u.color }}>
            <div className="upcoming-icon">
              <Icon name={u.icon} size={22} color={u.color} />
            </div>
            <div className="upcoming-text">
              <div className="row">
                <b>{u.name}</b>
                <Badge tone="locked">Coming soon</Badge>
              </div>
              <span className="dim small">{u.theme}</span>
              <p>{u.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
