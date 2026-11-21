import { INGREDIENTS, mealDef, MEALS } from '../../data/cooking';
import { FISHING_MEAL } from '../../data/fishing';
import { cookingOpen, eatMeal, formatDurationMs, mealEffectText, mealLength, mealReason, mealSupplySupportedMs } from '../../engine/cooking';
import { game, useGame } from '../../game';
import { fmt, MatIcon } from './common';
import { Swatch } from './Icon';

/** "24m left", or seconds for the last minute. */
export function mealTimeLeft(ms: number): string {
  return ms >= 60_000 ? `${Math.ceil(ms / 60_000)}m` : `${Math.ceil(ms / 1000)}s`;
}

/** Cooking's own panel: what you've eaten, and every dish you have to eat. */
export function PantryBoard() {
  const s = useGame();
  if (!cookingOpen(s)) return null;
  const dishes = MEALS.filter((m) => s.storage.bank[m.id]);
  const ingredients = INGREDIENTS.filter((m) => s.storage.bank[m.id]);
  const activeDef = s.meal ? mealDef(s.meal.id) : null;
  const activeSupportedMs = s.meal ? mealSupplySupportedMs(s, s.meal.id) : 0;
  return (
    <>
      <div className="callout skill-note">
        A meal fills your one meal slot. Combat dishes run down while fighting; skilling dishes run down during relevant active work. Both wait for you the rest of the time. Switching meals replaces remaining time with the new dish's full duration.
      </div>
      <div className="card">
        <div className="card-title">
          Pantry
          <span className="grow" />
          <label className="check card-hint" title="When a meal runs out, eat another of the same automatically from the bank. Stops when empty.">
            <input type="checkbox" checked={s.keepEating} onChange={(e) => game.act((st) => void (st.keepEating = e.target.checked))} />
            Keep eating (stops when empty)
          </label>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          {s.meal && activeDef ? (
            <>
              {s.meal.id === FISHING_MEAL ? <Swatch color={activeDef.color} size={16} /> : <MatIcon id={s.meal.id} size={16} />}
              <b style={{ color: activeDef.color }}>{activeDef.name}</b>
              <span className="dim small">({mealTimeLeft(s.meal.remainingMs)} left{s.keepEating && activeSupportedMs > s.meal.remainingMs ? ` · ${formatDurationMs(activeSupportedMs)} total supply` : ''})</span>
              <span className="small">{mealEffectText(s, s.meal.id)}</span>
              <span className="dim small" style={{ marginLeft: 4 }}>
                [{activeDef.skillingTarget === 'gathering' ? 'Active Gathering' : activeDef.skillingTarget === 'production' ? 'Active Production' : 'Combat'}]
              </span>
            </>
          ) : (
            <span className="dim small">Nothing eaten. Cook something, then eat it here.</span>
          )}
        </div>
        {dishes.map((m) => {
          const reason = mealReason(s, m.id);
          const supplyMs = mealSupplySupportedMs(s, m.id);
          const targetBadge = m.skillingTarget === 'gathering' ? 'Gathering' : m.skillingTarget === 'production' ? 'Production' : 'Combat';
          return (
            <div key={m.id} className="row wrap" style={{ gap: 6, marginTop: 6, alignItems: 'center' }}>
              <MatIcon id={m.id} size={16} />
              <span>
                {m.name} <span className="dim num">×{fmt(s.storage.bank[m.id])}</span>
              </span>
              <span className="dim small">[{targetBadge} · {formatDurationMs(mealLength(s, m.id))}{supplyMs > 0 ? ` · ${formatDurationMs(supplyMs)} supply` : ''}]</span>
              <span className="small">{mealEffectText(s, m.id)}</span>
              <span className="spacer" />
              <button className="btn sm" disabled={!!reason} title={reason ?? m.desc} onClick={() => game.act((st, ctx) => eatMeal(st, ctx, m.id))}>
                {s.meal ? 'Swap' : 'Eat'}
              </button>
            </div>
          );
        })}
        {ingredients.length > 0 && (
          <div className="row wrap dim small" style={{ gap: 8, marginTop: 8 }}>
            {ingredients.map((m) => (
              <span key={m.id} title={m.desc}>
                <MatIcon id={m.id} size={12} /> {m.name} ×{fmt(s.storage.bank[m.id])}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
