import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  equipFrom,
  equipFromReason,
  locateItem,
  moveToBag,
  moveToStash,
  salvageAny,
  salvageReason,
  toBagReason,
  toStashReason,
} from '../../engine/itemActions';
import { itemName, salvageValue } from '../../engine/items';
import { game, useGame } from '../../game';

/**
 * Click any item, anywhere, for Equip · To bag · To stash · Salvage. One host lives in the App;
 * openItemMenu() opens it at the last pointer position.
 */
let lastPointer = { x: 0, y: 0 };
let setOpen: ((m: { uid: number; x: number; y: number } | null) => void) | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => (lastPointer = { x: e.clientX, y: e.clientY }), true);
}

export function openItemMenu(uid: number): void {
  setOpen?.({ uid, ...lastPointer });
}

export function ItemMenuHost() {
  const s = useGame();
  const [menu, setMenu] = useState<{ uid: number; x: number; y: number } | null>(null);
  useEffect(() => {
    setOpen = setMenu;
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    window.addEventListener('keydown', close);
    return () => {
      setOpen = null;
      window.removeEventListener('keydown', close);
    };
  }, []);
  const place = menu ? locateItem(s, menu.uid) : null;
  if (!menu || !place) return null;

  const uid = menu.uid;
  const actions: { label: string; reason: string | null; run: () => string | null; danger?: boolean }[] = [
    { label: 'Equip', reason: equipFromReason(s, uid), run: () => game.act((st, ctx) => equipFrom(st, ctx, uid)) },
    {
      label: place.at === 'equipped' ? 'Take off to bag' : 'Send to bag',
      reason: toBagReason(s, uid),
      run: () => game.act((st, ctx) => moveToBag(st, ctx, uid)),
    },
    { label: 'Send to stash', reason: toStashReason(s, uid), run: () => game.act((st, ctx) => moveToStash(st, ctx, uid)) },
    {
      label: `Salvage (${salvageValue(place.item)} dust)`,
      reason: salvageReason(s, uid),
      run: () => game.act((st, ctx) => salvageAny(st, ctx, uid)),
      danger: true,
    },
  ];
  // hide what can't apply here at all (equipping worn gear, sending a bag item to the bag…)
  const shown = actions.filter((a) => !a.reason || !/^Already/.test(a.reason));
  const left = Math.min(menu.x + 4, window.innerWidth - 220);
  const top = Math.min(menu.y + 4, window.innerHeight - 44 * shown.length - 50);
  return createPortal(
    <div className="item-menu-backdrop" onPointerDown={() => setMenu(null)} onContextMenu={(e) => (e.preventDefault(), setMenu(null))}>
      <div className="item-menu" style={{ left, top }} onPointerDown={(e) => e.stopPropagation()}>
        <div className={`item-menu-title rar-${place.item.rarity}`}>{itemName(place.item)}</div>
        {shown.map((a) => (
          <button
            key={a.label}
            className={`item-menu-btn ${a.danger ? 'danger' : ''}`}
            disabled={!!a.reason}
            title={a.reason ?? undefined}
            onClick={() => {
              if (!a.run()) setMenu(null);
            }}
          >
            {a.label}
            {a.reason && <span className="dim small"> · {a.reason}</span>}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
