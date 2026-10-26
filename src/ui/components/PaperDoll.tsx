import { flaskRecoveryAmount } from '../../engine/combat';
import { flaskStats } from '../../engine/flasks';
import { deriveStats } from '../../engine/stats';
import type { EquipSlot, FlaskInstance, GameState, Item } from '../../engine/types';
import { Tooltip } from './common';
import { FlaskIcon, FlaskTip, pinFlask } from './FlaskView';
import { Icon } from './Icon';
import { ItemCell } from './ItemView';

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: 'Main Hand',
  offhand: 'Off Hand',
  helmet: 'Helmet',
  body: 'Body Armour',
  gloves: 'Gloves',
  boots: 'Boots',
  belt: 'Belt',
  amulet: 'Amulet',
  ring1: 'Ring',
  ring2: 'Ring',
  ring3: 'Ring',
  ring4: 'Ring',
};

/** Worn gear plus the five flask slots under it. Shared by the Equipment page and the Crafting Bench. */
export { SLOT_LABEL };

export function PaperDoll({
  s,
  onItem,
  onFlask,
  onEmpty,
  selected,
  emptyFlaskTitle,
}: {
  s: GameState;
  onItem: (slot: EquipSlot, item: Item) => void;
  /** clicking an empty gear slot */
  onEmpty?: (slot: EquipSlot) => void;
  onFlask: (slot: number, flask: FlaskInstance) => void;
  /** uid of the highlighted item or flask */
  selected?: number | null;
  emptyFlaskTitle?: string;
}) {
  const d = deriveStats(s, []);
  return (
    <>
      <div className="doll">
        {(Object.keys(SLOT_LABEL) as EquipSlot[]).map((slot) => {
          const item = s.equipment[slot];
          return (
            <div key={slot} className={`doll-slot slot-${slot} ${item ? 'filled' : ''}`} style={{ gridArea: slot }}>
              {item ? (
                <ItemCell item={item} state={s} selected={item.uid === selected} onClick={() => onItem(slot, item)} />
              ) : (
                <div
                  className={`cell empty-slot ${onEmpty ? 'clickable' : ''}`}
                  title={onEmpty ? `${SLOT_LABEL[slot]}: click to choose from your bag` : `${SLOT_LABEL[slot]} (empty)`}
                  onClick={onEmpty ? () => onEmpty(slot) : undefined}
                >
                  <Icon name={slot.startsWith('ring') ? 'ring' : slot} size={26} color="var(--line-2)" />
                </div>
              )}
              <span className="doll-label">{SLOT_LABEL[slot]}</span>
            </div>
          );
        })}
      </div>
      <div className="doll-flasks">
        {s.flaskSlots.map((f, i) =>
          f ? (
            <Tooltip key={i} content={<FlaskTip f={f} />}>
              <button
                className={`cell flask-cell rar-${f.rarity} ${f.uid === selected ? 'selected' : ''}`}
                onClick={() => onFlask(i, f)}
                onContextMenu={(e) => (e.preventDefault(), pinFlask(f))}
              >
                <span className="flask-key">{i + 1}</span>
                <FlaskIcon f={f} size={40} />
                {flaskRecoveryAmount(d, f) > 0 && (
                  <span className={`flask-amount ${flaskStats(f).def.kind}`} title={`Recovers ${flaskRecoveryAmount(d, f)} per drink`}>
                    {flaskRecoveryAmount(d, f)}
                  </span>
                )}
                {f.instill && <span className="flask-enchanted" title="Enchanted: drinks itself" />}
              </button>
            </Tooltip>
          ) : (
            <div key={i} className="cell empty-slot flask-cell" title={emptyFlaskTitle ?? `Flask slot ${i + 1} (empty)`}>
              <span className="flask-key">{i + 1}</span>
            </div>
          ),
        )}
      </div>
    </>
  );
}
