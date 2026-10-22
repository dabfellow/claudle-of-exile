import { affixDef } from '../../data/affixes';
import { ACHIEVEMENTS, CATEGORY_NAMES, type AchievementCategory, type AchievementDef } from '../../data/achievements';
import { BENCH_CRAFTS } from '../../data/hideout';
import { materialDef } from '../../data/materials';
import { achievementProgress } from '../../engine/achievements';
import { affixRangeText } from '../../engine/items';
import type { GameState } from '../../engine/types';
import { useGame } from '../../game';
import { fmt, MatIcon, ProgressBar } from '../components/common';
import { Icon } from '../components/Icon';

const CATEGORIES = Object.keys(CATEGORY_NAMES) as AchievementCategory[];

/** Bench recipes this achievement unlocks. */
function benchUnlocks(id: string) {
  return BENCH_CRAFTS.filter((b) => b.achievement === id);
}

function AchievementCard({ s, a }: { s: GameState; a: AchievementDef }) {
  const p = achievementProgress(s, a.id);
  const recipes = benchUnlocks(a.id);
  return (
    <div className={`card achievement ${p.done ? 'done' : ''}`}>
      <div className="row" style={{ gap: 10 }}>
        <span className="achievement-badge">
          <Icon name={p.done ? 'target' : 'clock'} size={16} />
        </span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="achievement-name">{a.name}</div>
          <div className="dim" style={{ fontSize: 12 }}>
            {a.desc}
          </div>
        </div>
        {p.done && <span className="chip good">Done</span>}
      </div>
      {!p.done && (
        <>
          <ProgressBar value={p.value / p.target} color="var(--accent)" />
          <div className="dim" style={{ fontSize: 11 }}>
            {fmt(p.value)} / {fmt(p.target)}
          </div>
        </>
      )}
      {(a.reward || recipes.length > 0) && (
        <div className="achievement-rewards">
          {Object.entries(a.reward ?? {}).map(([id, n]) => (
            <span key={id} className="io-item" title={materialDef(id).name}>
              <MatIcon id={id} /> {n} {materialDef(id).name}
            </span>
          ))}
          {recipes.map((b) => (
            <span key={b.id} className="mod crafted" title={`Crafting Bench level ${b.benchLevel} recipe`}>
              Bench: {affixRangeText(affixDef(b.affixId).id, b.tier)}
            </span>
          ))}
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
      <div className="page-head">
        <div className="grow">
          <h1>Achievements</h1>
          <p>Milestones across combat, crafting and skilling. Many teach the Crafting Bench a new recipe.</p>
        </div>
        <span className="chip">
          {done} / {ACHIEVEMENTS.length} complete
        </span>
      </div>
      {CATEGORIES.map((c) => {
        const list = ACHIEVEMENTS.filter((a) => a.category === c);
        const n = list.filter((a) => s.achievements.includes(a.id)).length;
        return (
          <section key={c} style={{ marginBottom: 22 }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <h3 style={{ fontSize: 15 }}>{CATEGORY_NAMES[c]}</h3>
              <span className="spacer" />
              <span className="dim" style={{ fontSize: 12 }}>
                {n}/{list.length}
              </span>
            </div>
            <ProgressBar value={n / list.length} color="var(--accent-2)" />
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginTop: 10 }}>
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
