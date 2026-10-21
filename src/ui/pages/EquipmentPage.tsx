import { useState } from 'react';
import { baseDef } from '../../data/bases';
import { flaskDef, INSTILL_CONDITIONS } from '../../data/flasks';
import { equipFlask, instillFlask, unequipFlask } from '../../engine/combat';
import { salvage } from '../../engine/crafting';
import { equip, equipReason, unequip } from '../../engine/equipment';
import { inventoryCapacity } from '../../engine/hideout';
import { deriveStats } from '../../engine/stats';
import type { EquipSlot, FlaskInstance, GameState, InstillCondition, Item, Rarity } from '../../engine/types';
import { game, useGame } from '../../game';
import { fmt, Tooltip } from '../components/common';
import { Icon, Orb } from '../components/Icon';
import { ItemCell, upgradeScore } from '../components/ItemView';

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: 'Weapon',
  offhand: 'Off-hand',
  helmet: 'Helmet',
  body: 'Body Armour',
  gloves: 'Gloves',
  boots: 'Boots',
  belt: 'Belt',
  amulet: 'Amulet',
  ring1: 'Ring',
  ring2: 'Ring',
};

function PaperDoll({ s }: { s: GameState }) {
  return (
    <div className="paperdoll">
      {(Object.keys(SLOT_LABEL) as EquipSlot[]).map((slot) => {
        const item = s.equipment[slot];
        return item ? (
          <ItemCell key={slot} item={item} state={s} style={{ gridArea: slot }} onClick={() => game.act((st) => unequip(st, slot))} />
        ) : (
          <div key={slot} className="cell empty-slot" style={{ gridArea: slot }} title={SLOT_LABEL[slot]}>
            <Icon name={slot.startsWith('ring') ? 'ring' : slot} size={22} color="var(--dim)" />
          </div>
        );
      })}
    </div>
  );
}

function StatSheet({ s }: { s: GameState }) {
  const d = deriveStats(s, []);
  const hit = Object.entries(d.hit).filter(([, [, hi]]) => hi > 0);
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="big-stats">
        <div className="big-stat">
          <b style={{ color: 'var(--life-2)' }}>{fmt(d.maxLife)}</b>
          <span>Max Life</span>
        </div>
        <div className="big-stat">
          <b style={{ color: 'var(--accent-2)' }}>{d.dps.toFixed(1)}</b>
          <span>DPS</span>
        </div>
        <div className="big-stat">
          <b>{d.attacksPerSec.toFixed(2)}</b>
          <span>Attacks / sec</span>
        </div>
      </div>
      <dl className="stat-sheet" style={{ margin: 0 }}>
        {hit.map(([type, [lo, hi]]) => (
          <FragmentStat key={type} label={`${type === 'phys' ? 'Physical' : type === 'light' ? 'Lightning' : type[0].toUpperCase() + type.slice(1)} Damage`} value={`${lo}–${hi}`} color={`var(--${type})`} />
        ))}
        <FragmentStat label="Critical Chance" value={`${d.critChance.toFixed(1)}%`} />
        <FragmentStat label="Critical Multiplier" value={`${d.critMulti}%`} />
        <FragmentStat label="Armour" value={fmt(d.armour)} />
        <FragmentStat label="Evasion" value={fmt(d.evasion)} />
        <FragmentStat label="Life Regen" value={`${d.lifeRegen.toFixed(1)}/s`} />
        {d.leechPct > 0 && <FragmentStat label="Life Leech" value={`${d.leechPct}%`} />}
        <FragmentStat label="Fire Resistance" value={`${d.res.fire}%`} color="var(--fire)" />
        <FragmentStat label="Cold Resistance" value={`${d.res.cold}%`} color="var(--cold)" />
        <FragmentStat label="Lightning Resistance" value={`${d.res.light}%`} color="var(--light)" />
        <FragmentStat label="Item Rarity" value={`+${d.itemRarity}%`} />
        <FragmentStat label="Gathering/Crafting Speed" value={`+${d.skillSpeed}%`} />
        <FragmentStat label="Skill XP" value={`+${d.skillXp}%`} />
        {d.flaskEffect > 0 && <FragmentStat label="Flask Effect" value={`+${d.flaskEffect}%`} />}
        {d.flaskCharges > 0 && <FragmentStat label="Flask Charges" value={`+${d.flaskCharges}%`} />}
      </dl>
    </div>
  );
}

function FragmentStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd style={{ color }}>{value}</dd>
    </>
  );
}

type SortKey = 'recent' | 'rarity' | 'slot' | 'upgrade';
const RARITY_ORDER: Record<Rarity, number> = { unique: 0, rare: 1, magic: 2, normal: 3 };

export function sortItems(s: GameState, items: Item[], key: SortKey): Item[] {
  const list = [...items];
  if (key === 'recent') return list.reverse();
  if (key === 'rarity') return list.sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || b.ilvl - a.ilvl);
  if (key === 'slot') return list.sort((a, b) => baseDef(a.baseId).slot.localeCompare(baseDef(b.baseId).slot));
  return list.sort((a, b) => upgradeScore(s, b) - upgradeScore(s, a));
}

export function Inventory({ s, onPick, selected }: { s: GameState; onPick?: (item: Item) => void; selected?: number | null }) {
  const [sort, setSort] = useState<SortKey>('recent');
  const [salvageMode, setSalvageMode] = useState(false);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const items = sortItems(s, s.inventory, sort);
  const cap = inventoryCapacity(s);

  const click = (item: Item) => {
    if (salvageMode) {
      const next = new Set(marked);
      next.has(item.uid) ? next.delete(item.uid) : next.add(item.uid);
      setMarked(next);
    } else if (onPick) onPick(item);
    else {
      const reason = equipReason(s, item);
      game.act((st, ctx) => reason ?? equip(st, ctx, item.uid));
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        Inventory
        <span className="muted num" style={{ fontFamily: 'var(--font)', fontSize: 12 }}>
          {s.inventory.length}/{cap}
        </span>
        <span className="grow" />
        <div className="tabs">
          {(['recent', 'rarity', 'slot', 'upgrade'] as SortKey[]).map((k) => (
            <button key={k} className={`tab ${sort === k ? 'active' : ''}`} onClick={() => setSort(k)}>
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="row wrap" style={{ marginBottom: 10 }}>
        {!salvageMode ? (
          <>
            <span className="dim" style={{ fontSize: 12 }}>
              {onPick ? 'Click an item to select it.' : 'Click to equip · ▲ marks upgrades.'}
            </span>
            <span className="spacer" />
            <button className="btn sm" onClick={() => setSalvageMode(true)} disabled={!s.inventory.length}>
              Salvage…
            </button>
          </>
        ) : (
          <>
            <span className="warn" style={{ fontSize: 12 }}>
              Select items to salvage into Arcane Dust
            </span>
            <span className="spacer" />
            <button className="btn sm" onClick={() => setMarked(new Set(s.inventory.filter((i) => i.rarity === 'normal').map((i) => i.uid)))}>
              All normal
            </button>
            <button className="btn sm" onClick={() => setMarked(new Set(s.inventory.filter((i) => i.rarity === 'normal' || i.rarity === 'magic').map((i) => i.uid)))}>
              Normal + magic
            </button>
            <button
              className="btn sm danger"
              disabled={!marked.size}
              onClick={() => {
                game.act((st, ctx) => salvage(st, ctx, [...marked]));
                setMarked(new Set());
                setSalvageMode(false);
              }}
            >
              Salvage {marked.size}
            </button>
            <button
              className="btn sm ghost"
              onClick={() => {
                setSalvageMode(false);
                setMarked(new Set());
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
      {items.length === 0 ? (
        <div className="dim" style={{ padding: 20, textAlign: 'center' }}>
          Empty. Smith bases or go fight for loot.
        </div>
      ) : (
        <div className="inv-grid">
          {items.map((item) => (
            <ItemCell
              key={item.uid}
              item={item}
              state={s}
              selected={selected === item.uid || (salvageMode && marked.has(item.uid))}
              showUpgrade={!onPick}
              onClick={() => click(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FlaskRack({ s }: { s: GameState }) {
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const grouped = new Map<string, FlaskInstance[]>();
  for (const f of s.flaskStash) grouped.set(f.flaskId, [...(grouped.get(f.flaskId) ?? []), f]);
  const instills = s.bank.instill ?? 0;

  return (
    <div className="card">
      <div className="card-title">
        Flask Rack
        <span className="grow" />
        <span className="chip">
          <Orb color="#ff9f5a" size={13} /> {instills} Instilling
        </span>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
        {s.flaskSlots.map((f, i) => {
          const def = f ? flaskDef(f.flaskId) : null;
          return (
            <div key={i} className="mat" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, borderColor: pickSlot === i ? 'var(--accent)' : undefined }}>
              <div className="row">
                <span className="nav-badge">{i + 1}</span>
                {def ? (
                  <>
                    <Orb color={def.color} size={14} />
                    <b style={{ fontSize: 12.5 }}>{def.name}</b>
                  </>
                ) : (
                  <span className="dim">Empty</span>
                )}
              </div>
              {def && <span className="dim" style={{ fontSize: 11 }}>{def.desc}</span>}
              <div className="row wrap">
                <button className="btn sm" onClick={() => setPickSlot(pickSlot === i ? null : i)}>
                  {f ? 'Swap' : 'Equip'}
                </button>
                {f && (
                  <button className="btn sm ghost" onClick={() => game.act((st) => unequipFlask(st, i))}>
                    Remove
                  </button>
                )}
              </div>
              {f && (
                <select
                  value={f.instill ?? ''}
                  onChange={(e) => {
                    const v = (e.target.value || null) as InstillCondition | null;
                    if (v && !confirm('Spend an Instilling Orb on this flask?')) return;
                    game.act((st, ctx) => instillFlask(st, ctx, i, v));
                  }}
                  disabled={!f.instill && instills < 1}
                  style={{ background: 'var(--bg-2)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: 6, padding: '4px 6px', fontSize: 11.5 }}
                  title={instills < 1 && !f.instill ? 'Instilling Orbs drop in deeper zones' : 'Auto-use condition'}
                >
                  <option value="">Manual use</option>
                  {INSTILL_CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      Auto: {c.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
      {pickSlot !== null && (
        <div style={{ marginTop: 12 }}>
          <div className="section-label">Choose a flask for slot {pickSlot + 1}</div>
          {grouped.size === 0 && <div className="dim">No spare flasks. Brew them with Alchemy or buy them from the Trader.</div>}
          <div className="row wrap">
            {[...grouped.entries()].map(([id, list]) => (
              <Tooltip key={id} content={<div className="tip">{flaskDef(id).desc}</div>}>
                <button
                  className="btn"
                  onClick={() => {
                    game.act((st) => equipFlask(st, list[0].uid, pickSlot));
                    setPickSlot(null);
                  }}
                >
                  <Orb color={flaskDef(id).color} size={13} /> {flaskDef(id).name} ×{list.length}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EquipmentPage() {
  const s = useGame();
  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Equipment</h1>
          <p>Click gear to unequip. Hover inventory items to compare against what you're wearing.</p>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">Gear</div>
          <PaperDoll s={s} />
        </div>
        <div className="card">
          <div className="card-title">Character</div>
          <StatSheet s={s} />
        </div>
      </div>
      <FlaskRack s={s} />
      <Inventory s={s} />
    </div>
  );
}
