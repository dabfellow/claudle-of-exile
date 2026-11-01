import { Fragment } from 'react';
import { affixDef } from '../../data/affixes';
import { attributeReq, baseDef, uniqueDef, WEAPON_FAMILIES } from '../../data/bases';
import { MECHANIC_INFO } from '../../data/passiveTree';
import { BASE_ATTACK_MS } from '../../data/gems';
import { characterLevel } from '../../engine/character';
import { compareItem, type CompareRow, type CompareSkill, type GearComparison } from '../../engine/compare';
import { describeMod, itemName, tierLabel, tierRangeText } from '../../engine/items';
import { mechanicOf, STAT_MECHANIC } from '../../engine/mechanics';
import { itemRune, runeMult, runesOpen, runeText } from '../../engine/runes';
import { game } from '../../game';
import { deriveStats, itemDefences, weaponPhys } from '../../engine/stats';
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

export function ItemTip({
  item,
  state,
  compare = true,
  pinned = false,
  into,
}: {
  item: Item;
  state?: GameState;
  compare?: boolean;
  pinned?: boolean;
  /** compare against this slot instead of the one equip() would pick (the off-hand picker) */
  into?: EquipSlot;
}) {
  const alt = useAltKey();
  const base = baseDef(item.baseId);
  const unique = item.uniqueId ? uniqueDef(item.uniqueId) : null;
  const name = itemName(item);
  const cmp = state && compare ? compareItem(state, item, into) : null;
  const implicits = (base.implicits ?? []).filter((i) => i.text);
  // shown after local mods; magic-coloured when a mod changed them, as in PoE
  const phys = base.phys ? weaponPhys(item) : null;
  const def = itemDefences(item);
  const aug = (now: number | undefined, was: number | undefined) => (now !== was ? 'mod' : undefined);
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
        {base.phys && phys && (
          <>
            <div>
              Physical Damage: <b className={aug(phys[1], base.phys[1])}>{phys[0]}–{phys[1]}</b>
            </div>
            <div>
              Attack Time: <b>{(BASE_ATTACK_MS / (1 + (base.speed ?? 0) / 100) / 1000).toFixed(2)}s</b>
              {base.speed ? <span className="dim"> (+{base.speed}% speed)</span> : null} · Crit: <b>{base.crit}%</b>
            </div>
          </>
        )}
        {base.tags.includes('armour') && def.armour ? (
          <div>
            Armour: <b className={aug(def.armour, base.armour)}>{def.armour}</b>
          </div>
        ) : null}
        {base.tags.includes('armour') && def.evasion ? (
          <div>
            Evasion Rating: <b className={aug(def.evasion, base.evasion)}>{def.evasion}</b>
          </div>
        ) : null}
        {base.tags.includes('armour') && def.energyShield ? (
          <div>
            Energy Shield: <b className={aug(def.energyShield, base.energyShield)}>{def.energyShield}</b>
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
        <RuneLine item={item} state={state} />
        {unique && (
          <>
            <div className="sep" />
            <div className="unique-flavour">{unique.flavour}</div>
          </>
        )}
        {cmp && <Comparison cmp={cmp} />}
        {item.impression && <div className="dim small">Wax impression taken: can be restored at the Crafting Bench</div>}
        {!pinned && (
          <div className="tip-hint">
            {item.rarity !== 'normal' && item.rarity !== 'unique' && !alt ? 'Alt: tiers & keep open · ' : alt ? 'Alt held: staying open · ' : ''}Right-click: pin
          </div>
        )}
      </div>
    </div>
  );
}

/** The rune slot sits under the modifiers, in its rune's colour; an empty one shows once the skill is open. */
function RuneLine({ item, state }: { item: Item; state?: GameState }) {
  const rune = itemRune(item);
  if (!rune && !(state && runesOpen(state))) return null;
  const worn = !!state && Object.values(state.equipment).some((e) => e?.uid === item.uid);
  return (
    <>
      <div className="sep" />
      {rune ? (
        <div className="mod rune" style={{ color: rune.family.color }}>
          {runeText(rune, item, state && worn ? runeMult(state, rune.family.id) : 1)}
          <span className="mod-tier">({rune.name})</span>
        </div>
      ) : (
        <div className="dim small">Rune slot: empty</div>
      )}
    </>
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

const fmtRow = (r: CompareRow, n: number) => `${n.toFixed(r.digits ?? 0)}${r.unit ?? ''}`;

function CompareRows({ rows }: { rows: CompareRow[] }) {
  return (
    <div className="compare-list">
      {rows.map((r) => {
        const gain = r.after - r.before;
        const same = Math.abs(gain) < 0.05;
        return (
          <Fragment key={r.label}>
            <span className="muted">{r.label}</span>
            <span>{r.text ? `${r.text[0]} → ${r.text[1]}` : `${fmtRow(r, r.before)} → ${fmtRow(r, r.after)}`}</span>
            <span className={same ? 'dim' : gain > 0 ? 'good' : 'bad'}>{same ? '=' : `${gain > 0 ? '+' : '−'}${fmtRow(r, Math.abs(gain))}`}</span>
          </Fragment>
        );
      })}
    </div>
  );
}

function CompareSkills({ skills }: { skills: CompareSkill[] }) {
  return (
    <div className="compare-list">
      {skills.map((k) => {
        const pct = k.before > 0 ? ((k.after - k.before) / k.before) * 100 : 0;
        return (
          <Fragment key={k.name}>
            <span className="muted">{k.name}</span>
            <span className={k.blocked ? 'bad' : ''}>{k.blocked ?? `${k.before.toFixed(1)} → ${k.after.toFixed(1)}`}</span>
            <span className={k.blocked ? 'bad' : Math.abs(pct) < 0.05 ? 'dim' : pct > 0 ? 'good' : 'bad'}>
              {k.blocked ? '' : k.before <= 0 ? 'new' : Math.abs(pct) < 0.05 ? '=' : `${pct > 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

/** Side by side with what's worn: the two items, your skills' damage, then your character's totals. */
function Comparison({ cmp }: { cmp: GearComparison }) {
  return (
    <>
      <div className="sep" />
      <div className="compare-head">
        {cmp.worn ? <>Compared with <span className={`rarity-${cmp.worn.rarity}`}>{itemName(cmp.worn)}</span></> : 'Nothing worn in this slot'}
      </div>
      {cmp.alsoRemoves && <div className="bad small">Also takes off {itemName(cmp.alsoRemoves)}</div>}
      {cmp.base.length > 0 && <CompareRows rows={cmp.base} />}
      {cmp.skills.some((k) => k.blocked || Math.abs(k.after - k.before) >= 0.05) && (
        <>
          <div className="compare-sub">Your skills, damage per second</div>
          <CompareSkills skills={cmp.skills} />
        </>
      )}
      {cmp.character.length > 0 && (
        <>
          <div className="compare-sub">Your character</div>
          <CompareRows rows={cmp.character} />
        </>
      )}
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
  style,
  into,
}: {
  item: Item;
  state?: GameState;
  selected?: boolean;
  marked?: boolean;
  onClick?: () => void;
  onContextMenu?: () => void;
  style?: React.CSSProperties;
  into?: EquipSlot;
}) {
  return (
    <Tooltip content={<ItemTip item={item} state={state} into={into} />}>
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
