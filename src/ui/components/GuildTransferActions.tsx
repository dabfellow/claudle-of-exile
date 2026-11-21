import { useState } from 'react';
import type { GuildTransfer } from '../../engine/guildStash';
import { game } from '../../game';

export function GuildItemTransfer({ move, reason }: { move: Extract<GuildTransfer, { uid: number }>; reason?: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button className="btn sm" disabled={pending || !!reason} title={reason} onClick={async () => {
      setPending(true);
      try {
        await game.moveGuildStock(move);
      } finally {
        setPending(false);
      }
    }}>
      {move.direction === 'deposit' ? 'Send to Guild Stash' : 'Withdraw'}
    </button>
  );
}

export function GuildStackTransfer({ direction, kind, id, max }: Omit<Extract<GuildTransfer, { id: string }>, 'quantity'> & { max: number }) {
  const [pending, setPending] = useState(false);
  const label = direction === 'deposit' ? 'Send to Guild Stash' : 'Withdraw';
  const move = async (quantity: number) => {
    setPending(true);
    try {
      await game.moveGuildStock({ direction, kind, id, quantity });
    } finally {
      setPending(false);
    }
  };
  if (!max) return <div className="muted small">Character stack full</div>;
  return (
    <form className="guild-stack-transfer" onSubmit={(e) => {
      e.preventDefault();
      void move(Number(new FormData(e.currentTarget).get('quantity')));
    }}>
      <label className="row">
        <span className="small muted">Quantity</span>
        <input className="input sm" name="quantity" type="number" min={1} max={max} defaultValue={1} required disabled={pending} />
      </label>
      <button className="btn sm" type="submit" disabled={pending}>{label}</button>
      {max > 1 && (
        <button className="btn sm" type="button" disabled={pending} onClick={() => void move(max)}>
          {direction === 'deposit' ? 'Send all' : 'Withdraw max'}
        </button>
      )}
    </form>
  );
}
