import { monsterDamage } from '../../data/zones';
import { unequipFlask } from '../../engine/combat';
import { unequip } from '../../engine/equipment';
import { armourReduction, deriveStats, evadeChance, hitChance, RES_CAP, type Derived } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { fmt, GameIcon, PageHeader, ProgressBar } from '../components/common';
import { Inventory } from '../components/Inventory';
import { PaperDoll } from '../components/PaperDoll';

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
        <span>Default Attack DPS</span>
      </div>
      <dl className="stat-sheet">
        {Object.entries(d.hit)
          .filter(([, [, hi]]) => hi > 0)
          .map(([t, [lo, hi]]) => (
            <Row key={t} label={`${DMG_NAME[t as keyof typeof DMG_NAME]} damage`} value={`${lo}–${hi}`} color={`var(--${t})`} />
          ))}
        <Row label="Default attack time" value={`${(d.attackMs / 1000).toFixed(2)}s`} hint="3s base, shortened by your weapon and attack speed" />
        <Row label="Attack speed" value={`+${Math.round((d.attackSpeed - 1) * 100)}%`} hint="Every attack skill has its own base time; this speeds them all up" />
        <Row label="Cast speed" value={`+${Math.round((d.castSpeed - 1) * 100)}%`} hint="Every spell and utility skill has its own base time; this speeds them all up" />
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
      <PaperDoll
        s={s}
        onItem={(slot) => game.act((st) => unequip(st, slot))}
        onFlask={(i) => game.act((st) => unequipFlask(st, i))}
        emptyFlaskTitle="Equip flasks at the Crafting Bench"
      />
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

export function EquipmentPage() {
  const s = useGame();
  const d = deriveStats(s, []);
  return (
    <div className="page wide">
      <PageHeader title="Equipment">Click gear or a flask to take it off. Hover inventory items to compare; right-click any item to pin it.</PageHeader>
      <div className="equip-layout">
        <Offense d={d} />
        <CenterColumn s={s} d={d} />
        <Defense d={d} />
      </div>
      <Inventory s={s} />
    </div>
  );
}
