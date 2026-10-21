import { useEffect, useState } from 'react';
import { baseDef, uniqueDef } from '../../data/bases';
import { slotsFor } from '../../engine/equipment';
import { describeMod, itemName, tierLabel, tierRangeText } from '../../engine/items';
import { deriveStats, type Derived } from '../../engine/stats';
import type { EquipSlot, GameState, Item, RolledMod } from '../../engine/types';
import { Icon } from './Icon';
import { Tooltip } from './common';

const RARITY_LABEL = { normal: 'Normal', magic: 'Magic', rare: 'Rare', unique: 'Unique' };

function useAltKey(): boolean {
  const [alt, setAlt] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => e.key === 'Alt' && (e.preventDefault(), setAlt(true));
    const up = (e: KeyboardEvent) => e.key === 'Alt' && setAlt(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', () => setAlt(false));
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);
  return alt;
}

function ModLine({ mod, detail }: { mod: RolledMod; detail: boolean }) {
  return (
    <div className={`mod ${mod.crafted ? 'crafted' : ''}`}>
      {describeMod(mod)}
      {mod.crafted && <span className="mod-tier">(crafted)</span>}
      {detail && mod.tier >= 0 && (
        <span className="mod-tier">
          {tierLabel(mod)} · {tierRangeText(mod)}
        </span>
      )}
    </div>
  );
}

export interface StatDelta {
  label: string;
  value: number;
  fmt?: (n: number) => string;
}

/** What changes if `item` replaces what's in its slot. */
export function compareItem(s: GameState, item: Item): { slot: EquipSlot; deltas: StatDelta[] } | null {
  if (Object.values(s.equipment).some((e) => e?.uid === item.uid)) return null;
  const options = slotsFor(item);
  const slot = options.find((o) => !s.equipment[o]) ?? options[0];
  const before = deriveStats(s, []);
  const after = deriveStats({ ...s, equipment: { ...s.equipment, [slot]: item } }, []);
  const rows: [string, (d: Derived) => number, ((n: number) => string)?][] = [
    ['DPS', (d) => d.dps, (n) => n.toFixed(1)],
    ['Max Life', (d) => d.maxLife],
    ['Armour', (d) => d.armour],
    ['Evasion', (d) => d.evasion],
    ['Fire Res', (d) => d.res.fire],
    ['Cold Res', (d) => d.res.cold],
    ['Lightning Res', (d) => d.res.light],
    ['Life Regen', (d) => d.lifeRegen, (n) => n.toFixed(1)],
    ['Crit Chance', (d) => d.critChance, (n) => n.toFixed(1)],
    ['Item Rarity', (d) => d.itemRarity],
    ['Skill Speed', (d) => d.skillSpeed],
  ];
  const deltas = rows
    .map(([label, f, fm]) => ({ label, value: f(after) - f(before), fmt: fm }))
    .filter((r) => Math.abs(r.value) > 0.05);
  return { slot, deltas };
}

export function upgradeScore(s: GameState, item: Item): number {
  const c = compareItem(s, item);
  if (!c) return 0;
  const get = (l: string) => c.deltas.find((d) => d.label === l)?.value ?? 0;
  return get('DPS') * 2 + get('Max Life') + get('Armour') * 0.1 + get('Evasion') * 0.1 + (get('Fire Res') + get('Cold Res') + get('Lightning Res')) * 0.6;
}

export function ItemTip({ item, state, compare = true }: { item: Item; state?: GameState; compare?: boolean }) {
  const alt = useAltKey();
  const base = baseDef(item.baseId);
  const unique = item.uniqueId ? uniqueDef(item.uniqueId) : null;
  const name = itemName(item);
  const cmp = state && compare ? compareItem(state, item) : null;
  const implicits = (base.implicits ?? []).filter((i) => i.text);
  return (
    <div className={`tip item-tip rar-${item.rarity}`}>
      <div className="item-tip-head">
        <div>{name}</div>
        {(item.rarity === 'rare' || item.rarity === 'unique') && <div>{base.name}</div>}
      </div>
      <div className="item-tip-body">
        <div className="muted" style={{ fontSize: 11 }}>
          {RARITY_LABEL[item.rarity]} {base.slot} · Item Level {item.ilvl}
        </div>
        {base.phys && (
          <>
            <div>
              Physical Damage: <b>{base.phys[0]}–{base.phys[1]}</b>
            </div>
            <div>
              Attacks per Second: <b>{base.aps?.toFixed(2)}</b> · Crit: <b>{base.crit}%</b>
            </div>
          </>
        )}
        {base.armour ? (
          <div>
            Armour: <b>{base.armour}</b>
          </div>
        ) : null}
        {base.evasion ? (
          <div>
            Evasion Rating: <b>{base.evasion}</b>
          </div>
        ) : null}
        <div className="muted" style={{ fontSize: 11 }}>
          Requires Combat Level {base.reqLevel}
        </div>
        {implicits.length > 0 && <div className="sep" />}
        {implicits.map((i) => (
          <div key={i.text} className="mod">
            {i.text}
          </div>
        ))}
        {(item.prefixes.length > 0 || item.suffixes.length > 0) && <div className="sep" />}
        {item.prefixes.map((m, i) => (
          <ModLine key={`p${i}`} mod={m} detail={alt} />
        ))}
        {item.suffixes.map((m, i) => (
          <ModLine key={`s${i}`} mod={m} detail={alt} />
        ))}
        {unique && (
          <>
            <div className="sep" />
            <div className="unique-flavour">{unique.flavour}</div>
          </>
        )}
        {cmp && cmp.deltas.length > 0 && (
          <>
            <div className="sep" />
            <div className="delta-list">
              {cmp.deltas.map((d) => (
                <FragmentRow key={d.label} d={d} />
              ))}
            </div>
          </>
        )}
        {item.rarity !== 'normal' && item.rarity !== 'unique' && !alt && (
          <div className="dim" style={{ fontSize: 10.5, marginTop: 4 }}>
            Hold Alt for modifier tiers
          </div>
        )}
      </div>
    </div>
  );
}

function FragmentRow({ d }: { d: StatDelta }) {
  const v = d.fmt ? d.fmt(Math.abs(d.value)) : Math.round(Math.abs(d.value)).toString();
  return (
    <>
      <span className="muted">{d.label}</span>
      <span className={d.value > 0 ? 'good' : 'bad'}>
        {d.value > 0 ? '+' : '−'}
        {v}
      </span>
    </>
  );
}

export function ItemIcon({ item, size = 26 }: { item: Item; size?: number }) {
  const slot = baseDef(item.baseId).slot;
  return <Icon name={slot} size={size} color="var(--rar)" stroke={1.6} />;
}

export function ItemCell({
  item,
  state,
  selected,
  marked,
  onClick,
  onContextMenu,
  showUpgrade,
  style,
}: {
  item: Item;
  state?: GameState;
  selected?: boolean;
  marked?: boolean;
  onClick?: () => void;
  onContextMenu?: () => void;
  showUpgrade?: boolean;
  style?: React.CSSProperties;
}) {
  const better = showUpgrade && state ? upgradeScore(state, item) > 0.5 : false;
  return (
    <Tooltip content={<ItemTip item={item} state={state} />}>
      <button
        className={`cell rar-${item.rarity} ${selected ? 'selected' : ''} ${marked ? 'marked' : ''}`}
        style={style}
        onClick={onClick}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.preventDefault();
            onContextMenu();
          }
        }}
      >
        <ItemIcon item={item} />
        {better && <span className="upgrade">▲</span>}
        <span className="ilvl">{item.ilvl}</span>
      </button>
    </Tooltip>
  );
}
