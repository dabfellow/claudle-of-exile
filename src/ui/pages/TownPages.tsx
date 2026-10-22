import { useState } from 'react';
import { flaskDef } from '../../data/flasks';
import { CURRENCIES, MATERIALS, materialDef } from '../../data/materials';
import { buyOffer, sellItems, sellMaterial, stationLevel } from '../../engine/hideout';
import { itemName, sellValue } from '../../engine/items';
import { exportSave, importSave } from '../../engine/save';
import { newGame } from '../../engine/state';
import type { Rarity } from '../../engine/types';
import { game, useGame } from '../../game';
import { AccountBadge } from '../screens/Screens';
import { fmt, fmtTime, MatIcon, Tooltip } from '../components/common';
import { Orb } from '../components/Icon';
import { ItemCell, ItemTip } from '../components/ItemView';
import { Inventory } from './EquipmentPage';

export function StashPage() {
  const s = useGame();
  const groups: [string, string[]][] = [
    ['Currency', CURRENCIES.map((c) => c.id)],
    ['Ores & Gems', MATERIALS.filter((m) => m.kind === 'ore' || m.kind === 'gem').map((m) => m.id)],
    ['Logs', MATERIALS.filter((m) => m.kind === 'log').map((m) => m.id)],
    ['Herbs', MATERIALS.filter((m) => m.kind === 'herb').map((m) => m.id)],
    ['Other', ['gold', 'arcane_dust']],
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Stash</h1>
          <p>Everything you've gathered, brewed and looted.</p>
        </div>
      </div>
      {groups.map(([label, ids]) => (
        <div className="card" key={label}>
          <div className="card-title">{label}</div>
          <div className="mat-grid">
            {ids.map((id) => {
              const def = materialDef(id);
              const n = s.bank[id] ?? 0;
              return (
                <Tooltip key={id} content={<div className="tip"><div className="tip-title">{def.name}</div>{def.desc && <div className="muted">{def.desc}</div>}</div>}>
                  <div className="mat" style={{ opacity: n > 0 ? 1 : 0.45 }}>
                    <MatIcon id={id} size={18} />
                    <span style={{ fontSize: 12.5 }}>{def.name}</span>
                    <b>{fmt(n)}</b>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ))}
      <Inventory s={s} />
    </div>
  );
}

export function VendorPage() {
  const s = useGame();
  const [sellMode, setSellMode] = useState(false);
  const lvl = stationLevel(s, 'vendor');
  const sellable = MATERIALS.filter((m) => m.kind !== 'gold' && (s.bank[m.id] ?? 0) > 0);

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Trader's Stall</h1>
          <p>New wares in {fmtTime(Math.max(0, s.vendor.refreshAt - s.clock))}. Upgrade the stall in your hideout for better stock.</p>
        </div>
        <span className="chip">
          <MatIcon id="gold" /> {fmt(s.bank.gold ?? 0)} gold
        </span>
        <span className="chip">Level {lvl}</span>
      </div>
      <div className="grid cards">
        {s.vendor.stock.length === 0 && <div className="dim">Sold out — check back soon.</div>}
        {s.vendor.stock.map((o) => {
          const afford = (s.bank.gold ?? 0) >= o.price;
          return (
            <div key={o.id} className="card offer">
              {o.kind === 'item' && o.item && (
                <div className="row">
                  <ItemCell item={o.item} state={s} style={{ width: 52 }} />
                  <Tooltip content={<ItemTip item={o.item} state={s} />}>
                    <span style={{ color: `var(--${o.item.rarity})`, fontWeight: 600, fontSize: 13 }}>{itemName(o.item)}</span>
                  </Tooltip>
                </div>
              )}
              {o.kind === 'flask' && o.flaskId && (
                <div className="row">
                  <Orb color={flaskDef(o.flaskId).color} size={26} />
                  <div>
                    <b>{flaskDef(o.flaskId).name}</b>
                    <div className="dim" style={{ fontSize: 11.5 }}>
                      {flaskDef(o.flaskId).desc}
                    </div>
                  </div>
                </div>
              )}
              {o.kind === 'currency' && o.currencyId && (
                <div className="row">
                  <MatIcon id={o.currencyId} size={26} />
                  <b>
                    {o.qty}× {materialDef(o.currencyId).name}
                  </b>
                </div>
              )}
              <button className={`btn sm ${afford ? 'primary' : ''}`} disabled={!afford} onClick={() => game.act((st, ctx) => buyOffer(st, ctx, o.id))}>
                <MatIcon id="gold" size={12} /> Buy for {fmt(o.price)}
              </button>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-title">
          Sell materials
          <span className="grow" />
          <button className="btn sm" onClick={() => setSellMode(!sellMode)}>
            {sellMode ? 'Done' : 'Show'}
          </button>
        </div>
        {sellMode && (
          <div className="mat-grid">
            {sellable.length === 0 && <div className="dim">Nothing to sell.</div>}
            {sellable.map((m) => (
              <div key={m.id} className="mat" style={{ flexWrap: 'wrap' }}>
                <MatIcon id={m.id} size={16} />
                <span style={{ fontSize: 12.5 }}>{m.name}</span>
                <b>{fmt(s.bank[m.id] ?? 0)}</b>
                <div className="row" style={{ width: '100%' }}>
                  <span className="dim" style={{ fontSize: 11 }}>
                    {m.value}g each
                  </span>
                  <span className="spacer" />
                  <button className="btn sm" onClick={() => game.act((st, ctx) => sellMaterial(st, ctx, m.id, 10, m.value))}>
                    Sell 10
                  </button>
                  <button className="btn sm ghost" onClick={() => game.act((st, ctx) => sellMaterial(st, ctx, m.id, st.bank[m.id] ?? 0, m.value))}>
                    All
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SellItems />
    </div>
  );
}

function SellItems() {
  const s = useGame();
  const byRarity = (r: Rarity) => s.inventory.filter((i) => i.rarity === r);
  return (
    <div className="card">
      <div className="card-title">Sell items</div>
      <div className="row wrap">
        {(['normal', 'magic', 'rare'] as Rarity[]).map((r) => {
          const list = byRarity(r);
          const gold = list.reduce((a, i) => a + sellValue(i), 0);
          return (
            <button key={r} className="btn" disabled={!list.length} onClick={() => game.act((st, ctx) => sellItems(st, ctx, list.map((i) => i.uid)))}>
              Sell all {r} ({list.length}) · {fmt(gold)}g
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const s = useGame();
  const [text, setText] = useState('');
  const [exported, setExported] = useState('');
  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Settings</h1>
        </div>
      </div>
      <div className="card">
        <div className="card-title">Account</div>
        <div className="row wrap">
          <AccountBadge />
          <span className="spacer" />
          <button className="btn sm" onClick={() => game.signOut()}>
            {game.account?.provider === 'guest' ? 'Back to title' : 'Sign out'}
          </button>
        </div>
        {game.account?.provider === 'guest' && (
          <p className="dim" style={{ fontSize: 12, marginBottom: 0 }}>
            Playing as a guest: progress is saved in this browser only. Sign in with Google or Discord from the title screen to save to the cloud — you can
            bring your guest characters with you.
          </p>
        )}
      </div>
      <div className="card">
        <div className="card-title">Loot filter</div>
        <p className="muted" style={{ marginTop: 0 }}>
          Automatically salvage dropped items of these rarities into Arcane Dust. Uniques are always kept.
        </p>
        <div className="row wrap">
          {(['normal', 'magic', 'rare'] as Rarity[]).map((r) => (
            <label key={r} className="chip" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={s.settings.autoSalvage[r]}
                onChange={(e) => game.act((st) => void (st.settings.autoSalvage[r] = e.target.checked))}
              />
              <span style={{ color: `var(--${r})` }}>{r[0].toUpperCase() + r.slice(1)}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-title">Display</div>
        <label className="chip" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={s.settings.reducedMotion} onChange={(e) => game.act((st) => void (st.settings.reducedMotion = e.target.checked))} />
          Reduce motion
        </label>
      </div>
      <div className="card">
        <div className="card-title">Save data</div>
        <p className="muted" style={{ marginTop: 0 }}>
          The game saves automatically every 10 seconds in this browser.
        </p>
        <div className="row wrap">
          <button className="btn" onClick={() => game.save()}>
            Save now
          </button>
          <button
            className="btn"
            onClick={() => {
              const str = exportSave(game.state);
              setExported(str);
              navigator.clipboard?.writeText(str).then(
                () => game.pushToast('Save copied to clipboard', 'good'),
                () => undefined,
              );
            }}
          >
            Export
          </button>
          <button
            className="btn danger"
            onClick={() => {
              const c = s.character;
              if (confirm(`Reset ${c.name} back to level 1? This cannot be undone.`)) game.replace(newGame(Date.now(), { id: c.id, name: c.name, classId: c.classId }));
            }}
          >
            Reset character
          </button>
        </div>
        {exported && <textarea readOnly value={exported} rows={3} style={textareaStyle} onFocus={(e) => e.target.select()} />}
        <div className="section-label" style={{ marginTop: 16 }}>
          Import
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Paste an exported save" style={textareaStyle} />
        <button
          className="btn"
          disabled={!text.trim()}
          style={{ marginTop: 8 }}
          onClick={() => {
            try {
              game.replace(importSave(text));
              setText('');
              game.pushToast('Save imported', 'good');
            } catch {
              game.pushToast('That save string is invalid', 'bad');
            }
          }}
        >
          Import save
        </button>
      </div>
      <div className="card">
        <div className="card-title">Lifetime</div>
        <div className="row wrap" style={{ gap: 18 }}>
          <span className="muted">
            Kills <b>{fmt(s.lifetime.kills)}</b>
          </span>
          <span className="muted">
            Bosses <b>{s.lifetime.bossKills}</b>
          </span>
          <span className="muted">
            Deaths <b>{s.lifetime.deaths}</b>
          </span>
          <span className="muted">
            Items looted <b>{fmt(s.lifetime.itemsLooted)}</b>
          </span>
          <span className="muted">
            Orbs used <b>{fmt(s.lifetime.orbsUsed)}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 10,
  background: 'var(--bg-2)',
  color: 'var(--text)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: 8,
  fontFamily: 'monospace',
  fontSize: 11,
};
