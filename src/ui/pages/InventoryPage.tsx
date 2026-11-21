import { monsterDamage } from '../../data/zones';
import { FLASK_SLOT_TYPES } from '../../data/flasks';
import { mapStockName } from '../../data/maps';
import { isCurrency, materialDef } from '../../data/materials';
import { findFlask, flaskStats } from '../../engine/flasks';
import { equipFlask, unequipFlask } from '../../engine/combat';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { findItem } from '../../engine/crafting';
import { equip, equipReason, slotsFor } from '../../engine/equipment';
import { MAX_PINNED_CURRENCIES, pinnedCurrencies, toggleCurrencyPin } from '../../engine/currencyPins';
import { inventoryFilterAction, runFilterOnInventory } from '../../engine/lootRouting';
import { armourReduction, deriveStats, ES_RECHARGE_DELAY_MS, evadeChance, hitChance, RES_CAP, type Derived } from '../../engine/stats';
import { stashItems } from '../../engine/storage';
import type { EquipSlot, GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { CurrencyAmount, fmt, GameIcon, MatIcon, PageHeader, ProgressBar } from '../components/common';
import { CraftPanel } from '../components/CraftPanel';
import { Fold } from '../components/Fold';
import { Icon } from '../components/Icon';
import { FlaskShelf } from '../components/FlaskView';
import { GemTip, SupportTip } from '../components/GemView';
import { GuildItemTransfer, GuildStackTransfer } from '../components/GuildTransferActions';
import { GearSets } from '../components/Loadouts';
import { guildGear } from '../../engine/guildStash';
import type { GuildStashCategory } from './GuildStashPage';
import { ItemCell } from '../components/ItemView';
import { Inventory } from '../components/Inventory';
import { PaperDoll, SLOT_LABEL } from '../components/PaperDoll';
import { StashPanel, type StashTabId } from '../components/StashPanel';
import type { Page } from '../Layout';
import '../inventory-screen.css';

/** below this page width the item panel stops sitting beside the grids and opens as a sheet */
const NARROW_PX = 1000;

type Selection =
  | { kind: 'gear' | 'flaskStash' | 'gems' | 'supportGems'; uid: number }
  | { kind: 'bank' | 'maps'; id: string };

function selectionKey(pick: Selection) {
  return `${pick.kind}:${'uid' in pick ? pick.uid : pick.id}`;
}

function isHeld(s: GameState, pick: Selection): boolean {
  switch (pick.kind) {
    case 'gear': return !!findItem(s, pick.uid);
    case 'flaskStash': return !!findFlask(s, pick.uid);
    case 'gems': return s.storage.gems.some((gem) => gem.uid === pick.uid);
    case 'supportGems': return s.storage.supportGems.some((gem) => gem.uid === pick.uid);
    case 'maps': return (s.maps.stock[pick.id] ?? 0) > 0;
    case 'bank':
      // Keep the panel available for pinning even when a currency stack is empty.
      return pick.id === 'gold' || isCurrency(pick.id) || (s.storage.bank[pick.id] ?? 0) > 0;
  }
}

function StashItemActions({ s, pick, onClear }: { s: GameState; pick: Selection; onClear: () => void }) {
  if (pick.kind === 'gear' || pick.kind === 'flaskStash') {
    return <CraftPanel s={s} uid={pick.kind === 'gear' ? pick.uid : null} flaskUid={pick.kind === 'flaskStash' ? pick.uid : null} onClear={onClear} />;
  }
  const stack = 'id' in pick ? pick : null;
  const id = stack?.id ?? null;
  const pins = pinnedCurrencies(s);
  const pinned = id !== null && pins.includes(id);
  const canPin = id !== null && stack?.kind === 'bank' && (id === 'gold' || isCurrency(id));
  const count = stack ? (stack.kind === 'bank' ? s.storage.bank : s.maps.stock)[stack.id] ?? 0 : 0;
  const gem = pick.kind === 'gems' ? s.storage.gems.find((gem) => gem.uid === pick.uid) : undefined;
  const support = pick.kind === 'supportGems' ? s.storage.supportGems.find((gem) => gem.uid === pick.uid) : undefined;

  return (
    <div className="card craft-panel">
      <div className="craft-head">
        {stack && (
          <b className="row">
            {stack.kind === 'bank' ? <><MatIcon id={stack.id} size={22} /> {materialDef(stack.id).name}</> : <><GameIcon name="map" size={22} /> {mapStockName(stack.id)}</>}
            · {fmt(count)}
          </b>
        )}
        <span className="grow" />
        <button className="btn sm ghost" aria-label="Close" onClick={onClear}><Icon name="close" size={12} /></button>
      </div>
      {gem && <GemTip gem={gem} state={s} />}
      {support && <SupportTip supportId={support.supportId} />}
      {'id' in pick ? count > 0 && <GuildStackTransfer direction="deposit" kind={pick.kind} id={pick.id} max={count} /> : (
        <GuildItemTransfer move={{ direction: 'deposit', kind: pick.kind, uid: pick.uid }} />
      )}
      {canPin && (
        <div className="craft-moves">
          <button className="btn sm" disabled={!pinned && pins.length >= MAX_PINNED_CURRENCIES} onClick={() => game.act((st) => toggleCurrencyPin(st, id))}>
            {pinned ? 'Unpin from top bar' : 'Pin to top bar'}
          </button>
        </div>
      )}
    </div>
  );
}

const DMG_NAME ={ phys: 'Physical', fire: 'Fire', cold: 'Cold', light: 'Lightning', chaos: 'Chaos' } as const;

function Row({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <>
      <dt title={hint}>{label}</dt>
      <dd style={{ color }}>{value}</dd>
    </>
  );
}

function Offense({ d }: { d: Derived }) {
  const lvl = d.combatLevel;
  return (
    <div className="card stat-panel">
      <div className="card-title">
        <GameIcon name="combat" size={16} color="var(--accent-2)" /> Offence
      </div>
      <div className="big-stat wide">
        <b style={{ color: 'var(--accent-2)' }}>{d.dps.toFixed(1)}</b>
        <span>Default Attack DPS{d.dualWield ? ' · dual wielding' : ''}</span>
      </div>
      <dl className="stat-sheet">
        <div className="stat-group-label">Damage per hit</div>
        {(Object.keys(DMG_NAME) as (keyof typeof DMG_NAME)[])
          .filter((t) => t === 'phys' || d.hit[t][1] > 0)
          .map((t) => (
            <Row key={t} label={DMG_NAME[t]} value={`${d.hit[t][0]}–${d.hit[t][1]}`} color={`var(--${t})`} />
          ))}
      </dl>
      <dl className="stat-sheet grouped">
        <div className="stat-group-label">Speed and accuracy</div>
        <Row label="Default attack time" value={`${(d.attackMs / 1000).toFixed(2)}s`} hint="3s base, shortened by your weapon and attack speed" />
        <Row
          label="Attack speed"
          value={`×${d.attackSpeed.toFixed(2)}`}
          hint={`Divides every attack's base time (×1.50 makes a 3s attack take 2s). Cooldowns aren't affected${d.dualWield ? '. Dual wielding uses the main hand' : ''}`}
        />
        <Row label="Cast speed" value={`×${d.castSpeed.toFixed(2)}`} hint="Divides every spell and utility skill's base time. Cooldowns aren't affected" />
        <Row label="Accuracy" value={fmt(d.accuracy)} hint="+2 per Dexterity and per level" />
        <Row label={`Hit chance vs level ${lvl}`} value={`${Math.round(hitChance(d.accuracy, lvl) * 100)}%`} />
      </dl>
      <dl className="stat-sheet grouped">
        <div className="stat-group-label">Critical strikes and scaling</div>
        <Row label="Critical chance" value={`${d.critChance.toFixed(1)}%`} />
        <Row label="Critical multiplier" value={`${d.critMulti}%`} />
        <Row label="Physical damage" value={`+${Math.round((d.physMult - 1) * 100)}%`} hint="Increased physical damage, including Strength" />
        <Row label="Elemental damage" value={`+${Math.round((d.elemMult - 1) * 100)}%`} hint="Increased elemental damage, including Intelligence" />
        {d.leechPct > 0 && <Row label="Life leech" value={`${d.leechPct}%`} />}
      </dl>
      <dl className="stat-sheet grouped">
        <div className="stat-group-label">Mana</div>
        <Row label="Maximum mana" value={fmt(d.maxMana)} color="var(--mana-2)" />
        <Row label="Mana regeneration" value={`${d.manaRegen.toFixed(1)}/s`} hint="No natural regeneration: it comes from gear and passives. Mana flasks do the rest" />
      </dl>
    </div>
  );
}

function ResBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="res-row">
      <span>{label}</span>
      <ProgressBar value={Math.max(0, value) / RES_CAP} color={color} label={`${value}%`} className={value >= RES_CAP ? 'capped' : ''} />
    </div>
  );
}

function Defense({ d }: { d: Derived }) {
  const lvl = d.combatLevel;
  const typicalHit = monsterDamage(lvl);
  return (
    <div className="card stat-panel">
      <div className="card-title">
        <GameIcon name="equipment" size={16} color="var(--life-2)" /> Defence
      </div>
      <div className="big-stat wide">
        <b style={{ color: 'var(--life-2)' }}>{fmt(d.maxLife)}</b>
        <span>Maximum Life</span>
      </div>
      {d.maxEs > 0 && (
        <div className="big-stat wide">
          <b style={{ color: 'var(--es-2)' }}>{fmt(d.maxEs)}</b>
          <span>Energy Shield</span>
        </div>
      )}
      <dl className="stat-sheet">
        <Row label="Life regeneration" value={`${d.lifeRegen.toFixed(1)}/s`} hint="No natural regeneration: it comes from gear and passives. Life flasks do the rest" />
        {d.maxEs > 0 && (
          <Row
            label="Energy shield recharge"
            value={`${d.esRecharge.toFixed(1)}/s`}
            hint={`Takes hits before life. Starts recharging ${ES_RECHARGE_DELAY_MS / 1000}s after you were last hit`}
          />
        )}
        <Row label="Armour" value={fmt(d.armour)} />
        <Row
          label={`Physical reduction vs a level ${lvl} hit`}
          value={`${Math.round(armourReduction(d.armour, typicalHit) * 100)}%`}
          hint="Armour is better against many small hits than one big one"
        />
        <Row label="Evasion rating" value={fmt(d.evasion)} />
        <Row label={`Evade chance vs level ${lvl}`} value={`${Math.round(evadeChance(d.evasion, lvl) * 100)}%`} hint="Boss wind-ups can't be evaded" />
      </dl>
      <div className="section-label" style={{ marginTop: 12 }}>
        Resistances (cap {RES_CAP}%)
      </div>
      <ResBar label="Fire" value={d.res.fire} color="var(--fire)" />
      <ResBar label="Cold" value={d.res.cold} color="var(--cold)" />
      <ResBar label="Lightning" value={d.res.light} color="var(--light)" />
    </div>
  );
}

/** Bag items that can go in one empty slot: how you pick the off hand for dual wielding, or a particular ring finger. */
function SlotPicker({ s, slot, onDone }: { s: GameState; slot: EquipSlot; onDone: () => void }) {
  const fits = s.inventory.filter((i) => slotsFor(i).includes(slot));
  return (
    <div className="slot-picker">
      <div className="row" style={{ gap: 8 }}>
        <b className="small">{SLOT_LABEL[slot]}</b>
        <span className="dim small">{slot === 'offhand' ? 'Shields, or a one-handed weapon to dual wield' : 'From your bag'}</span>
        <span className="grow" />
        <button className="btn sm ghost" title="Close" onClick={onDone}>
          <Icon name="close" size={12} />
        </button>
      </div>
      {fits.length === 0 && <div className="dim small">Nothing in your bag fits here.</div>}
      <div className="slot-picker-list">
        {fits.map((item) => {
          const reason = equipReason(s, item);
          return (
            <span key={item.uid} className={reason ? 'unusable' : ''} title={reason ?? undefined}>
              <ItemCell
                item={item}
                state={s}
                into={slot}
                onClick={() => {
                  if (reason) return;
                  game.act((st, ctx) => equip(st, ctx, item.uid, slot));
                  onDone();
                }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Spare flasks to put in one belt slot, or take the one there off. */
function FlaskPicker({ s, slot, onDone }: { s: GameState; slot: number; onDone: () => void }) {
  const worn = s.flaskSlots[slot];
  const targetKind = FLASK_SLOT_TYPES[slot] ?? 'utility';
  const matching = s.storage.flaskStash.filter((f) => flaskStats(f).def.kind === targetKind);
  return (
    <div className="slot-picker">
      <div className="row" style={{ gap: 8 }}>
        <b className="small">{targetKind === 'life' ? 'Life' : targetKind === 'mana' ? 'Mana' : 'Utility'} Flask slot {slot + 1}</b>
        <span className="dim small">{worn ? 'Swap for a spare flask, or take it off' : `Choose a ${targetKind} flask`}</span>
        <span className="grow" />
        {worn && (
          <button className="btn sm" onClick={() => (game.act((st) => unequipFlask(st, slot)), onDone())}>
            Take off
          </button>
        )}
        <button className="btn sm ghost" title="Close" onClick={onDone}>
          <Icon name="close" size={12} />
        </button>
      </div>
      {matching.length === 0 ? (
        <div className="dim small">No spare {targetKind} flasks. Brew them with Alchemy, loot them or buy them in Town.</div>
      ) : (
        <FlaskShelf flasks={matching} onPick={(f) => (game.act((st) => equipFlask(st, f.uid, slot)), onDone())} />
      )}
    </div>
  );
}

/** Worn gear: click a piece or a flask to pick it, an empty slot to fill it. */
function CharacterColumn({ s, d, selected, onPick, onPickFlask }: { s: GameState; d: Derived; selected: number | null; onPick: (uid: number) => void; onPickFlask: (uid: number) => void }) {
  const [picking, setPicking] = useState<EquipSlot | null>(null);
  const [flaskSlot, setFlaskSlot] = useState<number | null>(null);
  const pickEmptyFlask = (i: number) => (setPicking(null), setFlaskSlot(flaskSlot === i ? null : i));
  return (
    <div className="card doll-card">
      <PaperDoll
        s={s}
        selected={selected}
        onItem={(_, it) => onPick(it.uid)}
        onEmpty={(slot) => (setFlaskSlot(null), setPicking(picking === slot ? null : slot))}
        onFlask={(_, f) => onPickFlask(f.uid)}
        onEmptyFlask={pickEmptyFlask}
        emptyFlaskTitle="Click to choose a flask"
      />
      {picking && !s.equipment[picking] && <SlotPicker s={s} slot={picking} onDone={() => setPicking(null)} />}
      {flaskSlot !== null && <FlaskPicker s={s} slot={flaskSlot} onDone={() => setFlaskSlot(null)} />}
      <div className="attr-strip">
        <span title="+1 Life per 2, +1% physical damage per 5">
          <b style={{ color: 'var(--str)' }}>{d.attributes.str}</b> Strength
        </span>
        <span title="+2 Accuracy per point, +1% evasion per 5">
          <b style={{ color: 'var(--dex)' }}>{d.attributes.dex}</b> Dexterity
        </span>
        <span title="+1 Mana per 2, +1% elemental damage and +1% energy shield per 5">
          <b style={{ color: 'var(--int)' }}>{d.attributes.int}</b> Intelligence
        </span>
      </div>
      <div className="util-strip">
        <span>
          Item rarity <b>+{d.itemRarity}%</b>
        </span>
        <span>
          Skill speed <b>+{d.skillSpeed}%</b>
        </span>
        <span>
          Skill XP <b>+{d.skillXp}%</b>
        </span>
        {d.flaskEffect > 0 && (
          <span>
            Flask effect <b>+{d.flaskEffect}%</b>
          </span>
        )}
        {d.flaskCharges > 0 && (
          <span>
            Flask charges <b>+{d.flaskCharges}%</b>
          </span>
        )}
      </div>
      <GearSets s={s} />
    </div>
  );
}

/**
 * Inventory, stash and crafting on one screen (docs/MILESTONES.md, "Inventory, stash and crafting merge").
 * Click any item, worn, carried or stashed, and the side panel moves, salvages or crafts it.
 */
export function InventoryPage({ go, openGuildStash }: { go: (p: Page) => void; openGuildStash: (category: GuildStashCategory) => void }) {
  const s = useGame();
  const d = deriveStats(s, []);
  const [pick, setPick] = useState<Selection | null>(null);
  const [stashTab, setStashTab] = useState<StashTabId>('gear');
  const [stashPage, setStashPage] = useState(0);
  const here = Math.min(stashPage, s.storage.stash.length - 1);
  const togglePick = (next: Selection) => setPick((prev) => prev && selectionKey(prev) === selectionKey(next) ? null : next);
  const pickItem = (uid: number) => togglePick({ kind: 'gear', uid });
  const pickFlask = (uid: number) => togglePick({ kind: 'flaskStash', uid });
  // a salvaged or sold item leaves nothing to show, so the panel (a sheet on phones) closes
  const live = pick && isHeld(s, pick) ? pick : null;
  const selected = live?.kind === 'gear' || live?.kind === 'flaskStash' ? live.uid : null;
  const filterable = s.inventory.filter((i) => inventoryFilterAction(s, i) !== null).length;
  const pageRef = useRef<HTMLDivElement>(null);
  const guildUniques = guildGear(s).filter((item) => item.rarity === 'unique').length;
  const guildMaps = Object.values(s.account.maps ?? {}).reduce((total, count) => total + count, 0);
  const narrow = useNarrow(pageRef, NARROW_PX);
  const doll = <CharacterColumn s={s} d={d} selected={selected} onPick={pickItem} onPickFlask={pickFlask} />;
  const clear = () => setPick(null);
  const panel = live
    ? <StashItemActions key={selectionKey(live)} s={s} pick={live} onClear={clear} />
    : <CraftPanel s={s} uid={null} flaskUid={null} onClear={clear} />;
  return (
    <div className="page inv-page" ref={pageRef}>
      <PageHeader title="Inventory" actions={<CurrencyAmount id="gold" amount={s.storage.bank.gold ?? 0} label="gold" />}>
        Click an item to see its actions, including sending spare items to the Guild Stash.
      </PageHeader>
      {(guildUniques > 0 || guildMaps > 0) && (
        <div className="card inventory-guild-stock">
          <span>Withdraw shared stock from the Guild Stash to use it on this character.</span>
          {guildUniques > 0 && <button className="btn sm" onClick={() => openGuildStash('uniques')}>Guild Uniques ({fmt(guildUniques)})</button>}
          {guildMaps > 0 && <button className="btn sm" onClick={() => openGuildStash('maps')}>Guild Maps ({fmt(guildMaps)})</button>}
        </div>
      )}
      <div className={`inv-layout ${narrow ? 'narrow' : ''}`}>
        <div className="inv-main">
          {narrow && doll}
          <div className="inv-stack">
            <Inventory
              s={s}
              compact
              stashSorts
              selected={selected}
              onPick={(it) => pickItem(it.uid)}
              hint={`Stash all fills stash page ${here + 1}.`}
              actions={
                <>
                  <button
                    className="btn sm"
                    disabled={!filterable}
                    title="Apply your loot filter's Send to stash and auto-salvage rules to what you're carrying"
                    onClick={() => game.act((st, ctx) => void runFilterOnInventory(st, ctx))}
                  >
                    Run filter{filterable ? ` (${filterable})` : ''}
                  </button>
                  <button className="btn sm" disabled={!s.inventory.length} onClick={() => game.act((st, ctx) => void stashItems(st, ctx, st.inventory.map((i) => i.uid), here))}>
                    Stash all
                  </button>
                </>
              }
            />
            <StashPanel
              s={s}
              go={go}
              tab={stashTab}
              setTab={setStashTab}
              page={here}
              setPage={setStashPage}
              selected={selected}
              onPick={(it) => pickItem(it.uid)}
              onPickFlask={(f) => pickFlask(f.uid)}
              onPickStack={(id) => togglePick({ kind: 'bank', id })}
              onPickMap={(id) => togglePick({ kind: 'maps', id })}
              onPickGem={(kind, uid) => togglePick({ kind, uid })}
            />
          </div>
          <Fold id="inv-stats" title="Character stats" defaultOpen={false}>
            <div className="inv-stats">
              <Offense d={d} />
              <Defense d={d} />
            </div>
          </Fold>
        </div>
        {!narrow && (
          <aside className="inv-side">
            {doll}
            <div className="inv-panel-dock">{panel}</div>
          </aside>
        )}
      </div>
      {/* on a narrow screen the panel is a sheet over everything, opened by picking an item */}
      {narrow &&
        live &&
        createPortal(
          <div className="inv-sheet" role="dialog" aria-label="Item">
            <div className="inv-sheet-backdrop" onClick={() => setPick(null)} />
            <div className="inv-sheet-body">{panel}</div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** True while the element is narrower than `px`: the Inventory screen's own width, not the window's. */
function useNarrow(ref: RefObject<HTMLElement | null>, px: number): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setNarrow(el.clientWidth < px);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, px]);
  return narrow;
}
