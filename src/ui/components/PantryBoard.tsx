import { INGREDIENTS, mealDef, MEALS } from '../../data/cooking';
import { cookingOpen, eatMeal, mealEffectText, mealLength, mealReason } from '../../engine/cooking';
import { game, useGame } from '../../game';
import { fmt, MatIcon } from './common';

/** "24m left", or seconds for the last minute. */
export function mealTimeLeft(ms: number): string {
  return ms >= 60_000 ? `${Math.ceil(ms / 60_000)}m` : `${Math.ceil(ms / 1000)}s`;
}

/** Cooking's own panel: what you've eaten, and every dish you have to eat. */
export function PantryBoard() {
  const s = useGame();
  if (!cookingOpen(s)) return <div className="callout skill-note">There's no galley fire this far inland. Reach Act 5 to start.</div>;
  const dishes = MEALS.filter((m) => s.account.bank[m.id]);
  const ingredients = INGREDIENTS.filter((m) => s.account.bank[m.id]);
  return (
    <>
      <div className="callout skill-note">
        A meal lasts <b>{mealLength(s) / 60_000} minutes</b> of fighting, online or offline, and waits for you the rest of the time. Flask ingredients go into Alchemy's strongest recipes.
      </div>
      <div className="card">
        <div className="card-title">
          Pantry
          <span className="grow" />
          <label className="check card-hint" title="When a meal runs out in a fight, eat another of the same. This is what keeps a long night fed.">
            <input type="checkbox" checked={s.keepEating} onChange={(e) => game.act((st) => void (st.keepEating = e.target.checked))} />
            Keep eating
          </label>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          {s.meal ? (
            <>
              <MatIcon id={s.meal.id} size={16} />
              <b style={{ color: mealDef(s.meal.id).color }}>{mealDef(s.meal.id).name}</b>
              <span className="dim small">{mealTimeLeft(s.meal.remainingMs)} left</span>
              <span className="small">{mealEffectText(s, s.meal.id)}</span>
            </>
          ) : (
            <span className="dim small">Nothing eaten. Cook something, then eat it here.</span>
          )}
        </div>
        {dishes.map((m) => {
          const reason = mealReason(s, m.id);
          return (
            <div key={m.id} className="row wrap" style={{ gap: 6, marginTop: 6 }}>
              <MatIcon id={m.id} size={16} />
              <span>
                {m.name} <span className="dim num">×{fmt(s.account.bank[m.id])}</span>
              </span>
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
                <MatIcon id={m.id} size={12} /> {m.name} ×{fmt(s.account.bank[m.id])}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
