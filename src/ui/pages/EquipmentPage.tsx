import { monsterDamage } from '../../data/zones';
import { equipFlask, unequipFlask } from '../../engine/combat';
import { useState } from 'react';
import { equip, equipReason, slotsFor } from '../../engine/equipment';
import { armourReduction, deriveStats, ES_RECHARGE_DELAY_MS, evadeChance, hitChance, RES_CAP, type Derived } from '../../engine/stats';
import type { EquipSlot, GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { fmt, GameIcon, PageHeader, ProgressBar } from '../components/common';
import { Icon } from '../components/Icon';
import { FlaskShelf } from '../components/FlaskView';
import { GearSets } from '../components/Loadouts';
import { ItemCell } from '../components/ItemView';
import { Inventory } from '../components/Inventory';
import { PaperDoll, SLOT_LABEL } from '../components/PaperDoll';
import { openItemMenu } from '../components/ItemMenu';

const DMG_NAME = { phys: 'Physical', fire: 'Fire', cold: 'Cold', light: 'Lightning' } as const;

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
  return (
    <div className="slot-picker">
      <div className="row" style={{ gap: 8 }}>
        <b className="small">Flask slot {slot + 1}</b>
        <span className="dim small">{worn ? 'Swap for a spare flask, or take it off' : 'From your spare flasks'}</span>
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
      {s.flaskStash.length === 0 ? (
        <div className="dim small">No spare flasks. Brew them with Alchemy, loot them or buy them in Town.</div>
      ) : (
        <FlaskShelf flasks={s.flaskStash} onPick={(f) => (game.act((st) => equipFlask(st, f.uid, slot)), onDone())} />
      )}
    </div>
  );
}

function CenterColumn({ s, d }: { s: GameState; d: Derived }) {
  const [picking, setPicking] = useState<EquipSlot | null>(null);
  const [flaskSlot, setFlaskSlot] = useState<number | null>(null);
  const pickFlask = (i: number) => (setPicking(null), setFlaskSlot(flaskSlot === i ? null : i));
  return (
    <div className="card doll-card">
      <PaperDoll
        s={s}
        onItem={(_, it) => openItemMenu(it.uid)}
        onEmpty={(slot) => (setFlaskSlot(null), setPicking(picking === slot ? null : slot))}
        onFlask={pickFlask}
        onEmptyFlask={pickFlask}
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
    </div>
  );
}

export function EquipmentPage() {
  const s = useGame();
  const d = deriveStats(s, []);
  return (
    <div className="page wide">
      <PageHeader title="Equipment">
        Click gear for its menu, a flask slot to swap or take off a flask, or an empty slot to fill it from your bag (that's how you dual wield). Hover inventory items to compare; right-click
        any item to pin it.
      </PageHeader>
      <div className="equip-layout">
        <Offense d={d} />
        <CenterColumn s={s} d={d} />
        <Defense d={d} />
      </div>
      <GearSets s={s} />
      <Inventory s={s} />
    </div>
  );
}
