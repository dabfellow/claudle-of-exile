import { affixDef } from '../../data/affixes';
import { attributeReq, baseDef, uniqueDef, WEAPON_FAMILIES } from '../../data/bases';
import { MECHANIC_INFO } from '../../data/passiveTree';
import { BASE_ATTACK_MS } from '../../data/gems';
import { characterLevel } from '../../engine/character';
import { defaultSlot } from '../../engine/equipment';
import { describeMod, itemName, tierLabel, tierRangeText } from '../../engine/items';
import { mechanicOf, STAT_MECHANIC } from '../../engine/mechanics';
import { game } from '../../game';
import { deriveStats, type Derived } from '../../engine/stats';
import type { EquipSlot, GameState, Item, RolledMod } from '../../engine/types';
import { Icon } from './Icon';
import { togglePin, Tooltip, useAltKey, Art, artUrl } from './common';
import { packArtUrl } from '../assets';

const RARITY_LABEL = { normal: 'Normal', magic: 'Magic', rare: 'Rare', unique: 'Unique' };

function ModLine({ mod, detail, state }: { mod: RolledMod; detail: boolean; state?: GameState }) {
  // class-mechanic knobs do nothing on other classes
  const mech = affixDef(mod.affixId).stats.map((k) => STAT_MECHANIC[k]).find(Boolean);
  const inactive = !!mech && !!state && mechanicOf(state) !== mech;
  return (
    <div className={`mod ${mod.crafted ? 'crafted' : ''} ${inactive ? 'inactive' : ''}`}>
      {describeMod(mod)}
      {mod.crafted && <span className="mod-tier">(crafted)</span>}
      {inactive && <span className="mod-tier">({MECHANIC_INFO[mech].name} — {MECHANIC_INFO[mech].cls} only)</span>}
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
export function compareItem(s: GameState, item: Item, into?: EquipSlot): { slot: EquipSlot; deltas: StatDelta[] } | null {
  if (Object.values(s.equipment).some((e) => e?.uid === item.uid)) return null;
  const slot = into ?? defaultSlot(s, item);
  const before = deriveStats(s, []);
  const after = deriveStats({ ...s, equipment: { ...s.equipment, [slot]: item } }, []);
  const rows: [string, (d: Derived) => number, ((n: number) => string)?][] = [
    ['DPS', (d) => d.dps, (n) => n.toFixed(1)],
    ['Max Life', (d) => d.maxLife],
    ['Armour', (d) => d.armour],
    ['Evasion', (d) => d.evasion],
    ['Energy Shield', (d) => d.maxEs],
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
  return get('DPS') * 2 + get('Max Life') + get('Energy Shield') * 0.8 + get('Armour') * 0.1 + get('Evasion') * 0.1 + (get('Fire Res') + get('Cold Res') + get('Lightning Res')) * 0.6;
}

export function ItemTip({ item, state, compare = true, pinned = false }: { item: Item; state?: GameState; compare?: boolean; pinned?: boolean }) {
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
        <div className="muted small">
          {RARITY_LABEL[item.rarity]} {base.family ? `${base.twoHanded ? 'two-handed ' : ''}${WEAPON_FAMILIES[base.family].name.toLowerCase()}` : base.slot} · Item Level {item.ilvl}
        </div>
        {base.phys && (
          <>
            <div>
              Physical Damage: <b>{base.phys[0]}–{base.phys[1]}</b>
            </div>
            <div>
              Attack Time: <b>{(BASE_ATTACK_MS / (1 + (base.speed ?? 0) / 100) / 1000).toFixed(2)}s</b>
              {base.speed ? <span className="dim"> (+{base.speed}% speed)</span> : null} · Crit: <b>{base.crit}%</b>
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
        {base.energyShield ? (
          <div>
            Energy Shield: <b>{base.energyShield}</b>
          </div>
        ) : null}
        <Requirements item={item} state={state} />
        {implicits.length > 0 && <div className="sep" />}
        {implicits.map((i) => (
          <div key={i.text} className="mod">
            {i.text}
          </div>
        ))}
        {(item.prefixes.length > 0 || item.suffixes.length > 0) && <div className="sep" />}
        {item.prefixes.map((m, i) => (
          <ModLine key={`p${i}`} mod={m} detail={alt} state={state} />
        ))}
        {item.suffixes.map((m, i) => (
          <ModLine key={`s${i}`} mod={m} detail={alt} state={state} />
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
        {!pinned && (
          <div className="tip-hint">
            {item.rarity !== 'normal' && item.rarity !== 'unique' && !alt ? 'Alt: tiers & keep open · ' : alt ? 'Alt held: staying open · ' : ''}Right-click: pin
          </div>
        )}
      </div>
    </div>
  );
}

const ATTR_LABEL = { str: 'Str', dex: 'Dex', int: 'Int' } as const;

function Requirements({ item, state }: { item: Item; state?: GameState }) {
  const base = baseDef(item.baseId);
  const req = attributeReq(base);
  const lvl = state ? characterLevel(state) : Infinity;
  const have = state ? deriveStats(state, []).attributes : null;
  const parts: { text: string; ok: boolean }[] = [{ text: `Level ${base.reqLevel}`, ok: lvl >= base.reqLevel }];
  for (const [a, n] of Object.entries(req) as [keyof typeof ATTR_LABEL, number][]) {
    parts.push({ text: `${n} ${ATTR_LABEL[a]}`, ok: !have || have[a] >= n });
  }
  return (
    <div className="muted small">
      Requires{' '}
      {parts.map((p, i) => (
        <span key={p.text} className={p.ok ? '' : 'bad'}>
          {i > 0 ? ', ' : ''}
          {p.text}
        </span>
      ))}
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
  const fallback = <Icon name={slot} size={size} color="var(--rar)" stroke={1.6} />;
  const unique = item.uniqueId && `uniques/${item.uniqueId}`;
  const key = unique && (artUrl(unique) || packArtUrl(unique)) ? unique : `items/${item.baseId}`;
  return <Art src={key} alt={baseDef(item.baseId).name} size={Math.round(size * 1.45)} fallback={fallback} />;
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
          e.preventDefault();
          if (onContextMenu) onContextMenu();
          else pinItem(item);
        }}
      >
        <ItemIcon item={item} />
        {better && <span className="upgrade">▲</span>}
        <span className="ilvl">{item.ilvl}</span>
      </button>
    </Tooltip>
  );
}

/** Right-click any item to pin its tooltip to the compare dock. */
export function pinItem(item: Item): void {
  togglePin({
    key: `item-${item.uid}`,
    title: itemName(item),
    render: () => <ItemTip item={item} state={game.state} pinned />,
  });
}
