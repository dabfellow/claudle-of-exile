import { ACHIEVEMENTS, CATEGORY_NAMES, type AchievementCategory, type AchievementDef } from '../../data/achievements';
import { uniqueDef } from '../../data/bases';
import { materialDef } from '../../data/materials';
import { achievementProgress } from '../../engine/achievements';
import { isClassic } from '../../engine/challenge';
import type { GameState } from '../../engine/types';
import { useGame } from '../../game';
import { Badge, fmt, GameIcon, MatIcon, PageHeader, ProgressBar } from '../components/common';

const CATEGORIES = Object.keys(CATEGORY_NAMES) as AchievementCategory[];

/** Circular badge: a progress ring while in progress, a filled gold medal once complete. */
function Medallion({ pct, done }: { pct: number; done: boolean }) {
  const c = 2 * Math.PI * 23;
  return (
    <span className="medallion" aria-hidden>
      {!done && (
        <svg className="ring" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="23" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round" />
        </svg>
      )}
      <GameIcon name={done ? 'trophy' : 'target'} size={20} />
    </span>
  );
}

function AchievementCard({ s, a }: { s: GameState; a: AchievementDef }) {
  const p = achievementProgress(s, a.id);
  const pct = Math.min(1, p.value / p.target);
  return (
    <div className={`card achievement ${p.done ? 'done' : ''}`}>
      <Medallion pct={pct} done={p.done} />
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="achievement-name">{a.name}</div>
          <div className="achievement-desc">{a.desc}</div>
        </div>
        {p.done && <Badge tone="gold">Complete</Badge>}
      </div>
      {!p.done && (
        <div className="achievement-progress num">
          <ProgressBar value={pct} />
          <span>
            {fmt(p.value)} / {fmt(p.target)}
          </span>
        </div>
      )}
      {(a.reward || a.unique) && (
        <div className="achievement-rewards">
          {Object.entries(a.reward ?? {}).map(([id, n]) => (
            <span key={id} className="io-item" title={materialDef(id).name}>
              <MatIcon id={id} /> {n} {materialDef(id).name}
            </span>
          ))}
          {a.unique && (
            <span className="io-item" style={{ color: 'var(--unique)' }} title="Templar unique amulet: never drops, can't be traded">
              {uniqueDef(a.unique).name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function AchievementsPage() {
  const s = useGame();
  const done = s.achievements.length;
  return (
    <div className="page">
      <PageHeader
        title="Achievements"
        actions={
          <Badge tone={done === ACHIEVEMENTS.length ? 'gold' : 'neutral'}>
            {done} / {ACHIEVEMENTS.length} complete
          </Badge>
        }
      >
        Milestones across combat, crafting and skilling. Many teach the Crafting Bench a new recipe.
      </PageHeader>
      {CATEGORIES.filter((c) => c !== 'skilling' || !isClassic(s)).map((c) => {
        const list = ACHIEVEMENTS.filter((a) => a.category === c);
        const n = list.filter((a) => s.achievements.includes(a.id)).length;
        return (
          <section key={c} className="ach-section">
            <div className="section-head">
              <h3>{CATEGORY_NAMES[c]}</h3>
              <ProgressBar value={n / list.length} color={n === list.length ? 'var(--accent)' : 'var(--accent-2)'} />
              <span className="dim small num">
                {n}/{list.length}
              </span>
            </div>
            <div className="card-grid ach-grid">
              {list.map((a) => (
                <AchievementCard key={a.id} s={s} a={a} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
