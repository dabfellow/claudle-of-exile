import { currencyDef, materialDef } from '../../data/materials';
import { MAX_PINNED_CURRENCIES, pinnedCurrencies } from '../../engine/currencyPins';
import type { GameState } from '../../engine/types';
import { CurrencyAmount, fmt, MatIcon, Tooltip } from './common';

/** One orb (or gold) in the Stash's Currency tab. */
export function CurrencySlot({ s, id, onPick }: { s: GameState; id: string; onPick: (id: string) => void }) {
  const def = materialDef(id);
  const cur = id === 'gold' ? null : currencyDef(id);
  const n = s.storage.bank[id] ?? 0;
  const pinned = pinnedCurrencies(s).includes(id);
  return (
    <Tooltip
      content={
        <div className="tip">
          <div className="tip-title" style={{ color: 'var(--currency)' }}>
            {def.name}
          </div>
          {cur ? (
            <>
              <div>{cur.desc}</div>
              <div className="dim small" style={{ marginTop: 4 }}>
                Worth about {cur.value} gold to the trader
              </div>
            </>
          ) : (
            <div>Spent at the trader, on hideout upgrades and stash pages.</div>
          )}
          <div className="dim small" style={{ marginTop: 4 }}>
            {pinned ? 'Pinned to the top bar.' : 'Click to see currency actions.'}
          </div>
        </div>
      }
    >
      <button
        type="button"
        className={`currency-slot ${n > 0 ? '' : 'none'} ${pinned ? 'pinned' : ''}`}
        style={{ ['--orb' as string]: def.color }}
        onClick={() => onPick(id)}
      >
        <MatIcon id={id} size={36} />
        <span className="currency-count num">{fmt(n)}</span>
        <span className="currency-name">{cur ? cur.short : def.name}</span>
        {pinned && <span className="currency-pin">Pinned</span>}
      </button>
    </Tooltip>
  );
}

/** The line over the Currency tab that says what clicking an orb does. */
export function CurrencyPinHint({ s }: { s: GameState }) {
  const n = pinnedCurrencies(s).length;
  return (
    <div className="dim small currency-pin-hint">
      Select a currency to send it or pin it to the top bar ({n}/{MAX_PINNED_CURRENCIES} pinned).
    </div>
  );
}

/** The currencies pinned from the Stash, in the top bar. Nothing pinned, nothing shown. */
export function PinnedCurrencies({ s }: { s: GameState }) {
  const pins = pinnedCurrencies(s);
  if (!pins.length) return null;
  return (
    <header className="topbar">
      <div className="currency-strip">
        {pins.map((id) => (
          <CurrencyAmount key={id} id={id} amount={s.storage.bank[id] ?? 0} label={id === 'gold' ? 'gold' : currencyDef(id).short} />
        ))}
      </div>
    </header>
  );
}
