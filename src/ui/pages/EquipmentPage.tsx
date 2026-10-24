import { useState } from 'react';
import { INSTILL_CONDITIONS } from '../../data/flasks';
import { currencyDef } from '../../data/materials';
import { monsterDamage } from '../../data/zones';
import { equipFlask, unequipFlask } from '../../engine/combat';
import { unequip } from '../../engine/equipment';
import { applyFlaskOrb, enchantFlask, findFlask, flaskEffectText, flaskName, flaskOrbReason, FLASK_ORBS } from '../../engine/flasks';
import { armourReduction, deriveStats, evadeChance, hitChance, RES_CAP, type Derived } from '../../engine/stats';
import type { EquipSlot, FlaskInstance, GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { EmptyState, fmt, GameIcon, MatIcon, PageHeader, ProgressBar, Tooltip } from '../components/common';
import { FlaskIcon, FlaskTip, pinFlask } from '../components/FlaskView';
import { Icon } from '../components/Icon';
import { Inventory } from '../components/Inventory';
import { ItemCell } from '../components/ItemView';

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

const DMG_NAME = { phys: 'Physical', fire: 'Fire', cold: 'Cold', light: 'Lightning' } as const;

function PaperDoll({ s }: { s: GameState }) {
  return (
    <div className="doll">
      {(Object.keys(SLOT_LABEL) as EquipSlot[]).map((slot) => {
        const item = s.equipment[slot];
        return (
          <div key={slot} className={`doll-slot ${item ? 'filled' : ''}`} style={{ gridArea: slot }}>
            {item ? (
              <ItemCell item={item} state={s} onClick={() => game.act((st) => unequip(st, slot))} />
            ) : (
              <div className="cell empty-slot" title={`${SLOT_LABEL[slot]} (empty)`}>
                <Icon name={slot.startsWith('ring') ? 'ring' : slot} size={26} color="var(--line-2)" />
              </div>
            )}
            <span className="doll-label">{SLOT_LABEL[slot]}</span>
          </div>
        );
      })}
    </div>
  );
}

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
        <span>Default Attack DPS</span>
      </div>
      <dl className="stat-sheet">
        {Object.entries(d.hit)
          .filter(([, [, hi]]) => hi > 0)
          .map(([t, [lo, hi]]) => (
            <Row key={t} label={`${DMG_NAME[t as keyof typeof DMG_NAME]} damage`} value={`${lo}–${hi}`} color={`var(--${t})`} />
          ))}
        <Row label="Attacks per second" value={d.attacksPerSec.toFixed(2)} />
        <Row label="Accuracy" value={fmt(d.accuracy)} hint="+2 per Dexterity and per level" />
        <Row label={`Hit chance vs level ${lvl}`} value={`${Math.round(hitChance(d.accuracy, lvl) * 100)}%`} />
        <Row label="Critical chance" value={`${d.critChance.toFixed(1)}%`} />
        <Row label="Critical multiplier" value={`${d.critMulti}%`} />
        <Row label="Physical damage" value={`+${Math.round((d.physMult - 1) * 100)}%`} hint="Increased physical damage, including Strength" />
        <Row label="Elemental damage" value={`+${Math.round((d.elemMult - 1) * 100)}%`} hint="Increased elemental damage, including Intelligence" />
        {d.leechPct > 0 && <Row label="Life leech" value={`${d.leechPct}%`} />}
        <Row label="Mana" value={fmt(d.maxMana)} color="var(--mana-2)" />
        <Row label="Mana regeneration" value={`${d.manaRegen.toFixed(1)}/s`} />
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
      <dl className="stat-sheet">
        <Row label="Life regeneration" value={`${d.lifeRegen.toFixed(1)}/s`} />
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

function CenterColumn({ s, d }: { s: GameState; d: Derived }) {
  return (
    <div className="card doll-card">
      <PaperDoll s={s} />
      <div className="attr-strip">
        <span title="+1 Life per 2, +1% physical damage per 5">
          <b style={{ color: 'var(--str)' }}>{d.attributes.str}</b> Strength
        </span>
        <span title="+2 Accuracy per point, +1% evasion per 5">
          <b style={{ color: 'var(--dex)' }}>{d.attributes.dex}</b> Dexterity
        </span>
        <span title="+1 Mana per 2, +1% elemental damage per 5">
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

function FlaskCard({ f, selected, onClick, slot }: { f: FlaskInstance | null; selected: boolean; onClick: () => void; slot?: number }) {
  if (!f)
    return (
      <button className={`flask-card empty ${selected ? 'selected' : ''}`} onClick={onClick}>
        {slot !== undefined && <span className="slot-key">{slot + 1}</span>}
        <span className="dim">Empty</span>
      </button>
    );
  return (
    <Tooltip content={<FlaskTip f={f} />}>
      <button
        className={`flask-card ${f.rarity} ${selected ? 'selected' : ''}`}
        onClick={onClick}
        onContextMenu={(e) => (e.preventDefault(), pinFlask(f))}
      >
        {slot !== undefined && <span className="slot-key">{slot + 1}</span>}
        <FlaskIcon f={f} size={38} />
        <span className="flask-card-text">
          <b className={f.rarity === 'magic' ? 'magic-text' : ''}>{flaskName(f)}</b>
          <span className="dim">{flaskEffectText(f)}</span>
          {f.instill && <span className="enchant-tag">Enchanted · auto</span>}
        </span>
      </button>
    </Tooltip>
  );
}

function FlaskWorkbench({ s, f }: { s: GameState; f: FlaskInstance }) {
  const slotIndex = s.flaskSlots.findIndex((x) => x?.uid === f.uid);
  const instills = s.bank.instill ?? 0;
  return (
    <div className="flask-bench">
      <FlaskTip f={f} pinned />
      <div className="grid" style={{ gap: 10, alignContent: 'start' }}>
        <div>
          <div className="section-label">Craft</div>
          <div className="row wrap">
            {FLASK_ORBS.map((orb) => {
              const reason = flaskOrbReason(s, orb, f);
              return (
                <button key={orb} className="btn sm" disabled={!!reason} title={reason ?? currencyDef(orb).desc} onClick={() => game.act((st, ctx) => applyFlaskOrb(st, ctx, orb, f.uid))}>
                  <MatIcon id={orb} size={13} /> {currencyDef(orb).short} <span className="dim">×{s.bank[orb] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="section-label">
            Enchant with an Instilling Orb <span className="dim">({instills} owned)</span>
          </div>
          <div className="row wrap">
            {INSTILL_CONDITIONS.map((c) => (
              <button
                key={c.id}
                className={`btn sm ${f.instill === c.id ? 'active' : ''}`}
                disabled={instills < 1 || f.instill === c.id}
                title={instills < 1 ? 'Instilling Orbs drop in deeper areas' : c.desc}
                onClick={() => game.act((st, ctx) => enchantFlask(st, ctx, f.uid, c.id))}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="dim small" style={{ marginTop: 4 }}>
            An enchanted flask drinks itself in combat when its condition is met. Enchanting again replaces it.
          </div>
        </div>
        <div>
          <div className="section-label">Belt</div>
          {slotIndex >= 0 ? (
            <button className="btn sm" onClick={() => game.act((st) => unequipFlask(st, slotIndex))}>
              Take off belt (slot {slotIndex + 1})
            </button>
          ) : (
            <div className="row wrap">
              {s.flaskSlots.map((x, i) => (
                <button key={i} className="btn sm" onClick={() => game.act((st) => equipFlask(st, f.uid, i))}>
                  {x ? `Swap into ${i + 1}` : `Put in slot ${i + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FlaskRack({ s }: { s: GameState }) {
  const [sel, setSel] = useState<number | null>(s.flaskSlots[0]?.uid ?? null);
  const f = sel !== null ? findFlask(s, sel) : undefined;
  return (
    <div className="card">
      <div className="card-title">
        Flasks
        <span className="grow" />
        <span className="card-hint">
          Flasks drop from monsters and are brewed with Alchemy
        </span>
      </div>
      <div className="flask-slots">
        {s.flaskSlots.map((x, i) => (
          <FlaskCard key={i} slot={i} f={x} selected={!!x && x.uid === sel} onClick={() => x && setSel(x.uid)} />
        ))}
      </div>
      {f && <FlaskWorkbench s={s} f={f} />}
      <div className="section-label" style={{ marginTop: 14 }}>
        Spare flasks ({s.flaskStash.length})
      </div>
      {s.flaskStash.length === 0 ? (
        <EmptyState small>No spare flasks. Brew them with Alchemy or loot them.</EmptyState>
      ) : (
        <div className="flask-stash">
          {s.flaskStash.map((x) => (
            <FlaskCard key={x.uid} f={x} selected={x.uid === sel} onClick={() => setSel(x.uid)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function EquipmentPage() {
  const s = useGame();
  const d = deriveStats(s, []);
  return (
    <div className="page wide">
      <PageHeader title="Equipment">Click gear to take it off. Hover inventory items to compare; right-click any item to pin it.</PageHeader>
      <div className="equip-layout">
        <Offense d={d} />
        <CenterColumn s={s} d={d} />
        <Defense d={d} />
      </div>
      <FlaskRack s={s} />
      <Inventory s={s} />
    </div>
  );
}
