import { useState } from 'react';
import { ACHIEVEMENTS, CATEGORY_NAMES, perkTotals, type AchievementCategory, type AchievementDef } from '../../data/achievements';
import { baseDef, uniqueDef } from '../../data/bases';
import { materialDef } from '../../data/materials';
import { describeStats } from '../../data/statText';
import { achievementProgress, perkText } from '../../engine/achievements';
import { describeUniqueModDef } from '../../engine/items';
import { isClassic } from '../../engine/challenge';
import type { GameState } from '../../engine/types';
import { useGame } from '../../game';
import { Badge, fmt, GameIcon, MatIcon, PageHeader, ProgressBar, Tabs, Tooltip } from '../components/common';

const CATEGORIES = Object.keys(CATEGORY_NAMES) as AchievementCategory[];
type Show = 'all' | 'todo' | 'done';

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

/** An achievement-only unique, with its mods on hover or tap. */
function UniqueReward({ id }: { id: string }) {
  const u = uniqueDef(id);
  const base = baseDef(u.baseId);
  return (
    <Tooltip
      content={
        <div className="tip">
          <div className="tip-title rarity-unique">{u.name}</div>
          <div className="muted">
            {base.name} · level {base.reqLevel}
          </div>
          {u.mods.map((m, i) => (
            <div key={i} className="small">
              {describeUniqueModDef(m)}
            </div>
          ))}
          <div className="dim small" style={{ fontStyle: 'italic', marginTop: 4 }}>
            {u.flavour}
          </div>
          <div className="dim small">Only from this achievement. Never drops, can't be traded.</div>
        </div>
      }
    >
      <span className="io-item ach-perk unique-name">
        <GameIcon name="trophy" size={12} /> {u.name}
      </span>
    </Tooltip>
  );
}

/** Lasting rewards first (they change play), then currency. */
function Rewards({ a }: { a: AchievementDef }) {
  const perks = [...perkText(a.perks ?? {}), ...describeStats(a.perks?.stats ?? {})];
  if (!a.reward && !a.unique && !perks.length) return null;
  return (
    <div className="achievement-rewards">
      {a.unique && <UniqueReward id={a.unique} />}
      {perks.map((t) => (
        <span key={t} className="io-item ach-perk">
          {t}
        </span>
      ))}
      {Object.entries(a.reward ?? {}).map(([id, n]) => (
        <span key={id} className="io-item" title={materialDef(id).name}>
          <MatIcon id={id} /> {fmt(n)} {materialDef(id).name}
        </span>
      ))}
    </div>
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
      <Rewards a={a} />
    </div>
  );
}

/** What this character's achievements add up to, and what the realm has from them. */
function EarnedBonuses({ s }: { s: GameState }) {
  const mine = perkTotals(s.achievements);
  const realm = perkTotals(s.account.achievementRewards ?? []);
  const lines = [
    ...perkText({ passivePoints: mine.passivePoints, offlineHours: mine.offlineHours }),
    ...describeStats(mine.stats),
    ...perkText({ atlasPoints: realm.atlasPoints, stashTabs: realm.stashTabs }),
  ];
  const uniques = ACHIEVEMENTS.filter((a) => a.unique && s.achievements.includes(a.id)).map((a) => a.unique!);
  return (
    <div className="card ach-bonuses">
      <div className="section-label">Your achievement bonuses</div>
      {lines.length || uniques.length ? (
        <div className="achievement-rewards">
          {lines.map((t) => (
            <span key={t} className="io-item ach-perk">
              {t}
            </span>
          ))}
          {uniques.map((id) => (
            <UniqueReward key={id} id={id} />
          ))}
        </div>
      ) : (
        <div className="dim small">None yet. Rewards marked in gold below stay with this character for good.</div>
      )}
    </div>
  );
}

export function AchievementsPage() {
  const s = useGame();
  const [show, setShow] = useState<Show>('all');
  const inPlay = ACHIEVEMENTS.filter((a) => a.category !== 'skilling' || !isClassic(s));
  const done = inPlay.filter((a) => s.achievements.includes(a.id)).length;
  const wanted = (a: AchievementDef) => show === 'all' || (show === 'done') === s.achievements.includes(a.id);
  return (
    <div className="page">
      <PageHeader
        title="Achievements"
        actions={
          <Badge tone={done === inPlay.length ? 'gold' : 'neutral'}>
            {done} / {inPlay.length} complete
          </Badge>
        }
      >
        Chasing achievements makes you stronger: extra Passive and Atlas points, stash tabs, more offline hours, small
        permanent bonuses and uniques found nowhere else. Each character earns its own; Atlas points and stash tabs are
        shared, so the realm gets each one once.
      </PageHeader>
      <EarnedBonuses s={s} />
      <Tabs<Show>
        compact
        value={show}
        onChange={setShow}
        tabs={[
          { id: 'all', label: 'All' },
          { id: 'todo', label: 'To do', count: inPlay.length - done },
          { id: 'done', label: 'Done', count: done },
        ]}
      />
      {CATEGORIES.filter((c) => c !== 'skilling' || !isClassic(s)).map((c) => {
        const all = inPlay.filter((a) => a.category === c);
        const list = all.filter(wanted);
        if (!list.length) return null;
        const n = all.filter((a) => s.achievements.includes(a.id)).length;
        return (
          <section key={c} className="ach-section">
            <div className="section-head">
              <h3>{CATEGORY_NAMES[c]}</h3>
              <ProgressBar value={n / all.length} color={n === all.length ? 'var(--accent)' : 'var(--accent-2)'} />
              <span className="dim small num">
                {n}/{all.length}
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
