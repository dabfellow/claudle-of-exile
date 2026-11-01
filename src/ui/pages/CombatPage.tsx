import { useCallback, useState } from 'react';
import { mealDef } from '../../data/cooking';
import { flaskDef } from '../../data/flasks';
import { activeGemDef, DEFAULT_ATTACK } from '../../data/gems';
import { BOSS_FROSTBITE_MAX, BOSS_FROSTBITE_SLOW_PCT, BOSS_NOVA_MULT, BOSS_SLAM_MULT, echoTips, MECHANIC_INFO, nextZones, zoneDef, type MonsterDef } from '../../data/zones';
import { CELLS, cellRing, GROUND, inReach, minionInWay, monsterGround, MOVEMENT, MOVEMENT_ORDER, PLAYER_SPOT, RINGS } from '../../engine/battlefield';
import {
  aliveMonsters,
  army,
  bossCalled,
  bossIsNext,
  canBossFarm,
  challengeBoss,
  toggleBossFarm,
  currentMovement,
  focusTarget,
  liveDps,
  lockTarget,
  makeMonster,
  mitigate,
  nextArrivalMs,
  canSpendLife,
  staggerMax,
  queueSkill,
  releaseNovas,
  retreat,
  setMovement,
  startCombat,
  useFlask,
  ailmentThreshold,
  shockPct,
} from '../../engine/combat';
import { aimLockReason, ruleUnlockLevel, skillAim } from '../../engine/automation';
import { areaXpLabel, characterLevel } from '../../engine/character';
import { mealEffectText } from '../../engine/cooking';
import { flaskStats } from '../../engine/flasks';
import { gemUseReason, MIN_COOLDOWN_MS, skillNumbers } from '../../engine/gems';
import { ASCENDANCY_BY_ID } from '../../data/ascendancies';
import { ascendancyOf } from '../../engine/ascendancy';
import { flaskCapacity, meterLabel, meterMax, mechanicOf } from '../../engine/mechanics';
import { classDef } from '../../data/classes';
import { mealTimeLeft } from '../components/PantryBoard';
import { deriveStats, evadeChance, hitChance, type Derived } from '../../engine/stats';
import type { CombatRuntime, DamageType, GameEvent, GameState, GroundKind, Minion, MonsterInstance, TargetOrder, TargetPriority } from '../../engine/types';
import { game, useGame, useGameEvent } from '../../game';
import { anyArtUrl, Art, EmptyState, fmt, GameIcon, PageHeader, ProgressBar, Tabs, Tooltip } from '../components/common';
import { FlaskTip, pinFlask } from '../components/FlaskView';
import { GemIcon, GemTip, rulesLabel } from '../components/GemView';
import { LootPile } from '../components/GroundLoot';
import type { Page } from '../Layout';
import { SKILL_KEYS } from './SkillGemsPage';

const DMG_COLOR: Record<DamageType, string> = {
  phys: 'var(--phys)',
  fire: 'var(--fire)',
  cold: 'var(--cold)',
  light: 'var(--light)',
  chaos: 'var(--chaos)',
};
/** buffs that come from tree effects rather than a skill gem */
const EXTRA_BUFFS: Record<string, string> = { guard_armour: 'Guard Armour', evade_speed: 'Evasive', stand_fast: 'Stand Fast', ecstasy: 'Ecstasy' };
const DMG_NAME: Record<DamageType, string> = { phys: 'Physical', fire: 'Fire', cold: 'Cold', light: 'Lightning', chaos: 'Chaos' };
const GROUND_STATUS: Record<GroundKind, string> = { burning: 'fire', chilled: 'cold', frozen: 'cold', shocked: 'bad', caustic: 'poison', stormwater: 'cold', unholy: 'bad' };

interface Floater {
  id: number;
  owner: number | 'player';
  text: string;
  cls: string;
  x: number;
  color: string;
}

let floaterId = 1;

/** Floating numbers and hit-shake counters for every card, driven by combat events. */
function useCombatFx() {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [shakes, setShakes] = useState<Record<string, number>>({});
  const [crits, setCrits] = useState<Record<string, number>>({});
  const [usedSlot, setUsedSlot] = useState<{ slot: number; n: number } | null>(null);
  const [area, setArea] = useState<{ cells: number[]; n: number } | null>(null);
  const [lunge, setLunge] = useState(0);

  const add = useCallback((f: Omit<Floater, 'id' | 'x'>) => {
    const id = floaterId++;
    setFloaters((l) => [...l.slice(-24), { ...f, id, x: 25 + Math.random() * 50 }]);
    setTimeout(() => setFloaters((l) => l.filter((y) => y.id !== id)), 950);
  }, []);

  const onEvent = useCallback(
    (e: GameEvent) => {
      const bump = (set: typeof setShakes, key: string) => set((m) => ({ ...m, [key]: (m[key] ?? 0) + 1 }));
      if (e.t === 'skill') setUsedSlot((u) => ({ slot: e.slot, n: (u?.n ?? 0) + 1 }));
      if (e.t === 'area') setArea((a) => ({ cells: e.cells, n: (a?.n ?? 0) + 1 }));
      if (e.t === 'closeIn') setLunge((n) => n + 1);
      if (e.t !== 'hit') return;
      if (e.target === 'minion') {
        add({ owner: e.monsterUid ?? 0, text: `-${fmt(e.amount)}`, cls: '', color: e.dmgType === 'phys' ? 'var(--life-2)' : DMG_COLOR[e.dmgType] });
        bump(setShakes, String(e.monsterUid ?? 0));
      } else if (e.target === 'monster') {
        const owner = e.monsterUid ?? 0;
        if (e.evaded) add({ owner, text: 'miss', cls: 'miss', color: '' });
        else if (e.blocked) add({ owner, text: 'chained', cls: 'block', color: '' });
        else {
          add({
            owner,
            text: e.mega ? `MEGA ${fmt(e.amount)}` : e.riposte ? `Riposte ${fmt(e.amount)}` : fmt(e.amount),
            cls: e.mega ? 'crit mega' : e.crit ? 'crit' : e.dot ? 'dot' : e.riposte ? 'riposte' : '',
            color: e.crit ? '' : e.dot ? 'var(--life-2)' : e.riposte ? '' : DMG_COLOR[e.dmgType],
          });
          if (!e.dot) bump(setShakes, String(owner));
          if (e.crit) bump(setCrits, String(owner));
        }
      } else if (e.evaded) add({ owner: 'player', text: 'evade', cls: 'miss', color: '' });
      else if (e.blocked) add({ owner: 'player', text: 'block', cls: 'block', color: '' });
      else {
        add({
          owner: 'player',
          text: `${e.amount || !e.es ? `-${fmt(e.amount)}${e.es ? ` (${fmt(e.es)} ES)` : ''}` : `-${fmt(e.es)} ES`}${e.absorbed ? ` (${fmt(e.absorbed)} absorbed)` : ''}`,
          cls: '',
          color: e.dmgType === 'phys' ? 'var(--life-2)' : DMG_COLOR[e.dmgType],
        });
        bump(setShakes, 'player');
      }
    },
    [add],
  );
  useGameEvent(onEvent);
  return { floaters, shakes, crits, usedSlot, area, lunge };
}

type Fx = ReturnType<typeof useCombatFx>;

function Floaters({ list }: { list: Floater[] }) {
  return (
    <div className="floaters">
      {list.map((f) => (
        <span key={f.id} className={`floater ${f.cls}`} style={{ left: `${f.x}%`, color: f.color }}>
          {f.text}
        </span>
      ))}
    </div>
  );
}

const shakeClass = (n?: number) => (n ? (n % 2 ? 'shake-a' : 'shake-b') : '');
const critClass = (n?: number) => (n ? (n % 2 ? 'crit-a' : 'crit-b') : '');

/** The class mechanic's meter (Rage, Momentum, Malice, Fervor) or its current effect (Mana is Power, Riposte). */
function MechanicMeter({ s, d, c }: { s: GameState; d: Derived; c: CombatRuntime }) {
  const cls = classDef(s.character.classId);
  const max = meterMax(mechanicOf(s), d.raw);
  const label = meterLabel(s, d);
  const asc = ascendancyOf(s);
  return (
    <>
      <Tooltip
        content={
          <div className="tip">
            {cls.mechanicText}
            {asc && <div style={{ marginTop: 4 }}>{ASCENDANCY_BY_ID[asc].name}: {ASCENDANCY_BY_ID[asc].gate.desc}</div>}
          </div>
        }
      >
        {max > 0 ? (
          <ProgressBar value={Math.min(1, (c.mech ?? 0) / max)} size="md" color={cls.color} label={label} />
        ) : (
          <div className="mechanic-line" style={{ color: cls.color }}>
            {label}
          </div>
        )}
      </Tooltip>
      {asc === 'lightkeeper' && c.asc.novas > 0 && (
        <button className="btn sm" onClick={() => game.act((st, ctx) => releaseNovas(st, ctx))}>
          Release {c.asc.novas === 1 ? 'nova' : `${c.asc.novas} novas`}
        </button>
      )}
    </>
  );
}

function PlayerCard({ s, d, fx }: { s: GameState; d: Derived; fx: Fx }) {
  const c = s.combat!;
  const using = c.using ? (c.using === DEFAULT_ATTACK.id ? DEFAULT_ATTACK : activeGemDef(c.using)) : null;
  const closing = c.closingUid !== undefined ? c.monsters.find((m) => m.uid === c.closingUid) : undefined;
  const progress = aliveMonsters(c).length ? 1 - Math.max(0, c.actionMs) / c.actionTotal : 0;
  return (
    <div className={`fighter player ${shakeClass(fx.shakes.player)}`}>
      <Floaters list={fx.floaters.filter((f) => f.owner === 'player')} />
      <div className="fighter-head">
        <div className="portrait">
          <Art src={`portraits/class_${s.character.classId}`} alt={s.character.name} cover fallback={<GameIcon name="combat" size={28} color="var(--accent-2)" />} />
        </div>
        <div>
          <div className="fighter-name">{s.character.name}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Level {d.combatLevel} · {fmt(liveDps(c))} DPS
          </div>
        </div>
      </div>
      {d.maxEs > 0 && (
        <ProgressBar value={s.es / d.maxEs} size="md" color="linear-gradient(90deg, var(--es), var(--es-2))" label={`${fmt(s.es)} / ${fmt(d.maxEs)} ES`} />
      )}
      <div className="life-stack">
        <ProgressBar value={s.life / d.maxLife} size="lg" color="linear-gradient(90deg, var(--life), var(--life-2))" label={`${fmt(s.life)} / ${fmt(d.maxLife)}`} ghost />
        {c.shield > 0 && <div className="shield-bar" style={{ width: `${Math.min(1, c.shield / d.maxLife) * 100}%` }} title={`Shield ${fmt(c.shield)}`} />}
      </div>
      <ProgressBar value={d.maxMana ? s.mana / d.maxMana : 0} size="md" color="linear-gradient(90deg, var(--mana), var(--mana-2))" label={`${fmt(s.mana)} / ${fmt(d.maxMana)}`} />
      {mechanicOf(s) && <MechanicMeter s={s} d={d} c={c} />}
      <div className="action-line">
        <span className="dim">{using ? (c.windup ? `Winding up ${using.name}` : using.name) : closing ? `Closing in on ${closing.name}` : 'Waiting'}</span>
        <span className="dim">{using ? `${(c.actionTotal / 1000).toFixed(1)}s ${c.windup ? 'wind-up' : using.tags.includes('attack') ? 'attack' : 'cast'}` : ''}</span>
        <ProgressBar value={progress} color={using || closing ? 'var(--accent)' : 'var(--line-2)'} />
      </div>
      <div className="status-row">
        {c.blocks > 0 && <span className="status good">Block ×{c.blocks}</span>}
        {c.evadeMs > 0 && <span className="status good">Evading {(c.evadeMs / 1000).toFixed(1)}s</span>}
        {c.shield > 0 && <span className="status cold">Shield {fmt(c.shield)}</span>}
        {c.ambush && <span className="status good">Mega Crit ready</span>}
        {c.ground
          .filter((g) => g.cell === PLAYER_SPOT)
          .map((g) => (
            <span key={g.kind} className={`status ${GROUND_STATUS[g.kind]}`} title={`${GROUND[g.kind].desc} A guard steps you out of it at once; Run or Flee, twice as fast.`}>
              {GROUND[g.kind].name} {(g.remainingMs / 1000).toFixed(1)}s
            </span>
          ))}
        {(c.frostbite ?? 0) > 0 && (
          <span className="status cold" title={MECHANIC_INFO.frostbite.tip}>
            Frostbite {c.frostbite}/{BOSS_FROSTBITE_MAX} · {(c.frostbite ?? 0) * BOSS_FROSTBITE_SLOW_PCT}% slower
          </span>
        )}
        {(c.frozenMs ?? 0) > 0 && <span className="status bad">Frozen solid {((c.frozenMs ?? 0) / 1000).toFixed(1)}s</span>}
        {c.overheatMs > 0 && <span className="status bad">Overheated {(c.overheatMs / 1000).toFixed(1)}s</span>}
        {d.raw.eternalHunger > 0 && aliveMonsters(c).length > 0 && (
          <span className={`status ${c.hungerMs < 2000 ? 'bad' : 'good'}`}>Hunger {(Math.max(0, c.hungerMs) / 1000).toFixed(1)}s</span>
        )}
        {c.flurryStacks > 0 && <span className="status">Flurry ×{c.flurryStacks}</span>}
        {s.meal && (
          <span className="buff" style={{ ['--flask' as string]: mealDef(s.meal.id).color }} title={mealEffectText(s, s.meal.id)}>
            {mealDef(s.meal.id).name} {mealTimeLeft(s.meal.remainingMs)}
          </span>
        )}
        {c.buffs.map((b) => {
          const name = b.source === 'flask' ? flaskDef(b.id).name.replace(' Flask', '') : (EXTRA_BUFFS[b.id] ?? activeGemDef(b.id).name);
          const color = b.source === 'flask' ? flaskDef(b.id).color : 'var(--accent)';
          return (
            <span key={`${b.source}-${b.id}`} className="buff" style={{ ['--flask' as string]: color }}>
              {name} {(b.remainingMs / 1000).toFixed(1)}s
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MonsterCard({ m, target, fx }: { m: MonsterInstance; target: boolean; fx: Fx }) {
  const key = String(m.uid);
  const poison = m.dots.filter((x) => x.kind === 'poison').length;
  return (
    <div className={`fighter monster ${m.isBoss ? 'boss' : ''} ${target ? 'targeted' : ''} ${shakeClass(fx.shakes[key])} ${critClass(fx.crits[key])}`}>
      <Floaters list={fx.floaters.filter((f) => f.owner === m.uid)} />
      <div className="fighter-head">
        <div className="portrait small" style={{ borderColor: m.isBoss ? 'var(--life)' : undefined }}>
          <Art src={`monsters/${m.defId}`} alt={m.name} cover fallback={<GameIcon name="skull" size={20} color={m.isBoss ? 'var(--life-2)' : DMG_COLOR[m.dmgType]} />} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="fighter-name small">{m.name}</div>
          <div className="muted small">
            {m.isBoss ? 'Boss · ' : ''}Lv {m.level} · {DMG_NAME[m.dmgType]}
          </div>
        </div>
        {target && <span className="target-pip" title="Current target" />}
      </div>
      <ProgressBar value={Math.max(0, m.life) / m.maxLife} size="md" color="linear-gradient(90deg, var(--life), var(--life-2))" label={`${fmt(Math.max(0, m.life))} / ${fmt(m.maxLife)}`} ghost />
      {m.wardMax > 0 && <ProgressBar size="md" color="var(--ward)" value={m.ward / m.wardMax} label={`Ward ${fmt(m.ward)} · ${Math.ceil(m.wardMs / 1000)}s`} />}
      {(m.stagger ?? 0) > 0 && <ProgressBar color="var(--accent)" value={m.stagger! / staggerMax(m)} label="Stagger" />}
      {m.casting >= 0 ? (
        <>
          <ProgressBar className="cast-bar" value={1 - m.casting / m.castTotal} />
          <div className="cast-warning">
            {m.castKind === 'channel'
              ? `⚠ ${m.casts.channel.name}: growing — stun or interrupt it before it lands!`
              : m.castKind === 'nova'
              ? `⚠ ${m.casts.nova.name}: ${DMG_NAME[m.novaType].toLowerCase()} nova incoming — blocks won't stop it!`
              : `⚠ ${m.casts.slam.name}: heavy blow incoming — guard, interrupt or drink!`}
          </div>
        </>
      ) : (
        <div className="action-line">
          <span className="dim">{m.attackName}</span>
          <span className="dim">
            {(m.attackMs / 1000).toFixed(1)}s {m.attackKind === 'spell' ? 'cast' : 'attack'}
          </span>
          <ProgressBar value={m.attackTimer / m.attackMs} color="var(--dim)" className="thin" />
        </div>
      )}
      <div className="status-row">
        {m.chained && <span className="status bad">Chained: can't be hurt</span>}
        {m.martyr && <span className="status">Area and chain skills strike it. Click it to aim anything else</span>}
        {m.enraged && <span className="status bad">Enraged</span>}
        {m.stunMs > 0 && <span className="status">Stunned</span>}
        {m.frozenMs > 0 && <span className="status cold">Frozen</span>}
        {m.vulnMs > 0 && <span className="status">Armour broken</span>}
        {m.curse && <span className="status">{activeGemDef(m.curse.gemId).name}</span>}
        {m.dots.some((x) => x.kind === 'bleed') && <span className="status bad">Bleeding</span>}
        {poison > 0 && <span className="status poison">Poison ×{poison}</span>}
        {m.dots.some((x) => x.kind === 'ignite') && <span className="status fire">Ignited</span>}
      </div>
    </div>
  );
}

/** A monster as it stands on the battlefield: just enough to read the fight at a glance. Hover for the full card. */
function MonsterToken({ m, c, target, locked, fx }: { m: MonsterInstance; c: CombatRuntime; target: boolean; locked: boolean; fx: Fx }) {
  const key = String(m.uid);
  const pips: [string, string][] = [];
  if (m.stunMs > 0) pips.push(['Stunned', 'var(--text)']);
  if (m.frozenMs > 0 || m.chillMs > 0) pips.push([m.frozenMs > 0 ? 'Frozen' : 'Chilled', 'var(--cold)']);
  if (m.dots.some((x) => x.kind === 'bleed')) pips.push(['Bleeding', 'var(--life-2)']);
  if (m.dots.some((x) => x.kind === 'poison')) pips.push(['Poisoned', 'var(--poison)']);
  if (m.dots.some((x) => x.kind === 'ignite')) pips.push(['Ignited', 'var(--fire)']);
  else if (m.dots.some((x) => x.kind === 'burn')) pips.push(['Burning', 'var(--fire)']);
  if ((m.shockMs ?? 0) > 0) pips.push([`Shocked: takes ${Math.round(shockPct(m))}% more damage`, 'var(--light)']);
  const built = (n: number) => Math.round((n / ailmentThreshold(m)) * 100);
  if (m.build && built(m.build.burn) > 0) pips.push([`Burn ${built(m.build.burn)}% to Ignite`, 'var(--fire)']);
  if (m.build && built(m.build.chill) > 0) pips.push([`Chill ${built(m.build.chill)}% to Freeze`, 'var(--cold)']);
  if (m.curse) pips.push([activeGemDef(m.curse.gemId).name, 'var(--accent-2)']);
  if (m.enraged) pips.push(['Enraged', 'var(--danger)']);
  if (m.chained) pips.push(["Chained: can't be hurt", 'var(--ward)']);
  return (
    <Tooltip content={<MonsterCard m={m} target={target} fx={fx} />}>
      <div className={`bf-token ${m.isBoss ? 'boss' : ''} ${m.martyr ? 'martyr' : ''} ${m.chained ? 'chained' : ''} ${target ? 'targeted' : ''} ${locked ? 'locked' : ''} ${m.casting >= 0 ? 'casting' : ''} ${shakeClass(fx.shakes[key])} ${critClass(fx.crits[key])}`}>
        <Floaters list={fx.floaters.filter((f) => f.owner === m.uid)} />
        <div className="bf-token-head">
          <div className="portrait tiny">
            <Art src={`monsters/${m.defId}`} alt={m.name} cover fallback={<GameIcon name="skull" size={14} color={m.isBoss ? 'var(--life-2)' : DMG_COLOR[m.dmgType]} />} />
          </div>
          <span className="bf-token-name">{m.name}</span>
          {m.attackKind === 'spell' && !m.isBoss && <span className="bf-ranged" title="Ranged: stops a few rings out and casts from there" />}
          {target && <span className="target-pip" title={locked ? 'Your chosen target (click to release)' : 'Current target'} />}
        </div>
        <ProgressBar value={Math.max(0, m.life) / m.maxLife} color="linear-gradient(90deg, var(--life), var(--life-2))" />
        {m.wardMax > 0 && <ProgressBar color="var(--ward)" value={m.ward / m.wardMax} className="thin" />}
        {(m.stagger ?? 0) > 0 && <ProgressBar color="var(--accent)" value={m.stagger! / staggerMax(m)} className="thin" />}
        {m.casting >= 0 ? (
          <ProgressBar className="cast-bar thin" value={1 - m.casting / m.castTotal} />
        ) : m.martyr ? (
          <span className="bf-approach">chained</span>
        ) : inReach(m) || minionInWay(m, army(c)) ? (
          <ProgressBar value={m.attackTimer / m.attackMs} color="var(--dim)" className="thin" />
        ) : (
          <span className="bf-approach">walking in…</span>
        )}
        {pips.length > 0 && (
          <div className="bf-pips">
            {pips.map(([name, color]) => (
              <span key={name} className="bf-pip" style={{ background: color }} title={name} />
            ))}
          </div>
        )}
      </div>
    </Tooltip>
  );
}

/** One of your minions on the battlefield, drawn like a monster but on your side. */
function MinionToken({ x, fx }: { x: Minion; fx: Fx }) {
  const key = String(x.uid);
  return (
    <Tooltip
      content={
        <div className="tip">
          <div className="tip-title">{x.name}</div>
          <div className="dim small">Your minion{x.taunts ? ': monsters in reach swing at it first' : ''}</div>
          <div className="small">Life {fmt(Math.max(0, x.life))} / {fmt(x.maxLife)}</div>
          {x.remainingMs !== undefined && <div className="small">Stays {(x.remainingMs / 1000).toFixed(1)}s</div>}
        </div>
      }
    >
      <div className={`bf-token minion ${x.taunts ? 'taunts' : ''} ${shakeClass(fx.shakes[key])}`}>
        <Floaters list={fx.floaters.filter((f) => f.owner === x.uid)} />
        <div className="bf-token-head">
          <div className="portrait tiny">
            <Art src={`monsters/${x.art}`} alt={x.name} cover fallback={<GameIcon name="skull" size={14} color="var(--cold)" />} />
          </div>
          <span className="bf-token-name">{x.name}</span>
        </div>
        <ProgressBar value={Math.max(0, x.life) / x.maxLife} color="linear-gradient(90deg, var(--es), var(--es-2))" />
        {x.remainingMs !== undefined && x.durationMs ? <ProgressBar value={x.remainingMs / x.durationMs} color="var(--dim)" className="thin" /> : null}
      </div>
    </Tooltip>
  );
}

/**
 * Field geometry in hex units (engine/battlefield.ts): pointy-top hexes √3 wide and 2 tall, the player at (0, 0).
 * The field spans ±4.5 hexes across and from 7 above the player to 1 below.
 */
const HEX_W = Math.sqrt(3);
const FIELD_W = HEX_W * (2 * RINGS + 1);
const FIELD_TOP = -1.5 * RINGS - 1;
const FIELD_H = 1 - FIELD_TOP;
const pctX = (x: number) => ((x + FIELD_W / 2) / FIELD_W) * 100;
const pctY = (y: number) => ((y - FIELD_TOP) / FIELD_H) * 100;
const hexBox = (x: number, y: number) => ({
  left: `${pctX(x - HEX_W / 2)}%`,
  top: `${pctY(y - 1)}%`,
  width: `${(HEX_W / FIELD_W) * 100}%`,
  height: `${(2 / FIELD_H) * 100}%`,
});

/**
 * The half-ring of hexes around the player, who stands on the bottom edge. Monsters are drawn on their own layer,
 * keyed by monster, so a step is a slide from one hex to the next and an arrival walks in from beyond the edge.
 * Click a monster to make it your target.
 */
function Battlefield({ s, c, fx }: { s: GameState; c: CombatRuntime; fx: Fx }) {
  const alive = aliveMonsters(c);
  const byCell = new Map(alive.map((m) => [m.cell, m]));
  const focus = focusTarget(s);
  const stormOn = (i: number) => c.storms?.find((st) => st.cells.includes(i));
  return (
    <div className="battlefield" style={{ aspectRatio: `${FIELD_W} / ${FIELD_H}` }}>
      {CELLS.map((cell, i) => {
        const m = byCell.get(i);
        const ground = c.ground.find((g) => g.cell === i);
        const flash = fx.area?.cells.includes(i) ? (fx.area.n % 2 ? 'flash-a' : 'flash-b') : '';
        const storm = stormOn(i);
        const stormDef = storm && activeGemDef(storm.gemId);
        return (
          <div
            key={i}
            className={`bf-cell ring-${cell.ring} ${m ? 'occupied' : ''} ${m && m === focus ? 'target' : ''} ${m?.isBoss ? 'boss' : ''} ${ground ? `ground-${ground.kind}` : ''} ${storm ? `storm storm-${stormDef!.effect.type ?? 'phys'}` : ''} ${flash}`}
            style={hexBox(cell.x, cell.y)}
            title={storm ? `${stormDef!.name} (${(storm.remainingMs / 1000).toFixed(1)}s)` : ground ? `${GROUND[ground.kind].name} (${(ground.remainingMs / 1000).toFixed(1)}s): ${GROUND[ground.kind].desc}` : undefined}
          />
        );
      })}
      <div className={`bf-cell bf-player-cell ${shakeClass(fx.shakes.player)} ${fx.lunge ? (fx.lunge % 2 ? 'lunge-a' : 'lunge-b') : ''}`} style={hexBox(0, 0)}>
        <div className="portrait">
          <Art src={`portraits/class_${s.character.classId}`} alt={s.character.name} cover fallback={<GameIcon name="combat" size={22} color="var(--accent-2)" />} />
        </div>
      </div>
      {alive.map((m) => {
        const cell = CELLS[m.cell];
        // walk in from beyond the edge, straight out from the player
        const len = Math.hypot(cell.x, cell.y) || 1;
        return (
          <div
            key={m.uid}
            className={`bf-unit ${m.isBoss ? 'boss' : ''}`}
            style={{
              left: `${pctX(cell.x)}%`,
              top: `${pctY(cell.y)}%`,
              width: `${(HEX_W / FIELD_W) * 100 * (m.isBoss ? 1.15 : 0.92)}%`,
              transitionDuration: `${m.uid === c.closingUid ? 350 : Math.min(800, m.moveMs * 0.7)}ms`,
              ['--dx' as string]: `${(cell.x / len) * 60}px`,
              ['--dy' as string]: `${(cell.y / len) * 60}px`,
            }}
            onClick={() => game.act((st) => lockTarget(st, m.uid))}
          >
            <MonsterToken m={m} c={c} target={m === focus} locked={m.uid === c.lockedUid} fx={fx} />
          </div>
        );
      })}
      {army(c).map((x) => {
        const cell = CELLS[x.cell];
        return (
          <div key={x.uid} className="bf-unit ally" style={{ left: `${pctX(cell.x)}%`, top: `${pctY(cell.y)}%`, width: `${(HEX_W / FIELD_W) * 100 * 0.92}%`, transitionDuration: '450ms' }}>
            <MinionToken x={x} fx={fx} />
          </div>
        );
      })}
      {!alive.length && <div className="bf-empty">Searching for monsters…</div>}
    </div>
  );
}

/** Narrow screens: the field doesn't fit, so sum it up instead. */
function FieldSummary({ s, c }: { s: GameState; c: CombatRuntime }) {
  const alive = aliveMonsters(c);
  const focus = focusTarget(s);
  const close = alive.filter((m) => cellRing(m.cell) === 1).length;
  const martyrs = alive.filter((m) => m.martyr);
  return (
    <div className="bf-summary">
      <div>
        <b>{alive.length}</b> on the field · <b>{close}</b> in melee range
        {army(c).length > 0 && (
          <>
            {' '}· <b>{army(c).length}</b> {army(c).length === 1 ? 'minion' : 'minions'}
          </>
        )}
      </div>
      {martyrs.map((m) => (
        <button key={m.uid} className={`btn sm ${m.uid === c.lockedUid ? 'primary' : ''}`} onClick={() => game.act((st) => lockTarget(st, m.uid))}>
          Strike {m.name} ({fmt(Math.max(0, m.life))})
        </button>
      ))}
      {focus && (
        <div className="bf-summary-target">
          <span>
            {focus.name} <span className="dim">· ring {cellRing(focus.cell)}</span>
          </span>
          <ProgressBar value={Math.max(0, focus.life) / focus.maxLife} color="linear-gradient(90deg, var(--life), var(--life-2))" label={`${fmt(Math.max(0, focus.life))} / ${fmt(focus.maxLife)}`} />
        </div>
      )}
    </div>
  );
}

export const PRIORITIES: { id: TargetPriority; label: string }[] = [
  { id: 'none', label: 'Anything' },
  { id: 'boss', label: 'Bosses first' },
  { id: 'ranged', label: 'Ranged first' },
  { id: 'ailing', label: 'Ailing first' },
];
export const ORDERS: { id: TargetOrder; label: string }[] = [
  { id: 'closest', label: 'Closest' },
  { id: 'farthest', label: 'Farthest' },
  { id: 'lowest', label: 'Lowest life' },
  { id: 'highest', label: 'Highest life' },
];

/** While a boss is chained, why your hits do nothing and every way past it. Laid over the field, so it never moves the hexes, and clicks pass through to the martyrs. */
function ChainedNotice({ s, c }: { s: GameState; c: CombatRuntime }) {
  const boss = c.monsters.find((m) => m.chained);
  if (!boss) return null;
  const locked = aimLockReason(s);
  const aimed = s.skillBar.some((g) => g && skillAim(s, g));
  return (
    <div className="chained-anchor">
      <div className="callout bad chained-notice">
        <b>{boss.name} is chained and can't be hurt.</b> Kill its martyrs first: area and chain skills strike them, or click one
        {aimed ? '.' : locked ? ` (a rule can do it from War Table level ${ruleUnlockLevel('aim')}).` : ", or set a skill's rule to aim at them."}
      </div>
    </div>
  );
}

/** Flee / creep / walk / run, what the field will do next, and who your skills go for. */
function MovementBar({ s }: { s: GameState }) {
  const c = s.combat!;
  const zone = zoneDef(c.zoneId);
  const mv = currentMovement(s);
  const next = nextArrivalMs(s);
  const status = c.monsters.some((m) => m.chained)
    ? 'The boss is chained: kill its martyrs'
    : c.monsters.some((m) => m.isBoss)
    ? 'Boss fight: nothing else arrives'
    : mv === 'flee'
      ? aliveMonsters(c).length
        ? 'Shaking them off…'
        : 'Holding back: nothing arrives'
      : c.bossFarm
        ? c.bossRespawnMs
          ? `${zone.boss.name} respawns in ${(c.bossRespawnMs / 1000).toFixed(1)}s`
          : `${zone.boss.name} waits for the field to clear`
      : bossCalled(s, zone.id)
        ? `${zone.boss.name} waits for the field to clear`
        : next === null
          ? 'Field full: the next monster waits'
          : `Next monster in ${(next / 1000).toFixed(1)}s`;
  const targeting = s.settings.targeting;
  return (
    <div className="bf-bar">
      <Tabs
        compact
        value={s.settings.movement}
        onChange={(id) => game.act((st) => setMovement(st, id))}
        tabs={MOVEMENT_ORDER.map((id) => ({ id, label: MOVEMENT[id].name, title: MOVEMENT[id].desc }))}
      />
      <span className="dim bf-status" title={status}>
        {c.fleeing ? <span className="status bad">Auto-fleeing</span> : status}
      </span>
      <label className="bf-target" title="Who your skills go for. Click a monster on the field to pick it yourself.">
        <select className="input sm" value={targeting.priority} onChange={(e) => game.act((st) => void (st.settings.targeting = { ...st.settings.targeting, priority: e.target.value as TargetPriority }))}>
          {PRIORITIES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select className="input sm" value={targeting.order} onChange={(e) => game.act((st) => void (st.settings.targeting = { ...st.settings.targeting, order: e.target.value as TargetOrder }))}>
          {ORDERS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="bf-auto" title="Below 35% life, flee until you're back above 90%, then resume your pace">
        <input type="checkbox" checked={s.settings.autoFlee} onChange={(e) => game.act((st) => void (st.settings.autoFlee = e.target.checked))} /> Auto-flee
      </label>
      <label className="bf-auto" title="A ready boss comes on its own, instead of waiting for you to challenge it">
        <input type="checkbox" checked={s.settings.autoBoss} onChange={(e) => game.act((st) => void (st.settings.autoBoss = e.target.checked))} /> Auto-challenge
      </label>
    </div>
  );
}

export function SkillBar({ s, d, fx }: { s: GameState; d: Derived; fx?: Fx }) {
  const c = s.combat;
  return (
    <div className="skill-bar">
      {s.skillBar.map((gem, i) => {
        if (!gem)
          return (
            <div key={i} className="skill-btn empty">
              <span className="slot-key">{SKILL_KEYS[i]}</span>
            </div>
          );
        const def = activeGemDef(gem.gemId);
        const nums = skillNumbers(d, gem);
        // every skill has at least the 0.1 s minimum cooldown; only show real ones
        const cd = nums.cooldownMs > MIN_COOLDOWN_MS ? (c?.cooldowns[i] ?? 0) : 0;
        const cdPct = nums.cooldownMs ? cd / nums.cooldownMs : 0;
        const noMana = s.mana < nums.manaCost || !canSpendLife(s, d, nums.lifeCost, false);
        const unusable = gemUseReason(d.combatLevel, d.attributes, gem, d.weaponFamily);
        const flashed = fx?.usedSlot?.slot === i ? fx.usedSlot.n : 0;
        return (
          <Tooltip key={i} content={<GemTip gem={gem} state={s} />}>
            <button
              className={`skill-btn ${noMana ? 'nomana' : ''} ${unusable ? 'unusable' : ''} ${c?.queued === i ? 'queued' : ''} ${flashed ? (flashed % 2 ? 'used-a' : 'used-b') : ''}`}
              style={{ ['--cd' as string]: `${cdPct * 360}deg` }}
              disabled={!c}
              onClick={() => game.act((st) => queueSkill(st, i))}
            >
              <span className="slot-key">{SKILL_KEYS[i]}</span>
              <span className="skill-gem">
                <GemIcon def={def} size={38} dim={cd > 0 || noMana || !!unusable} />
                {cd > 0 && <span className="cd-sweep" />}
                {cd > 0 && <span className="cd-text">{(cd / 1000).toFixed(1)}</span>}
              </span>
              <span className="skill-name">{def.name}</span>
              <span className="skill-meta">
                {nums.lifeCost > 0 && <span style={{ color: 'var(--life-2)' }}>{nums.lifeCost} life</span>}
                {nums.manaCost > 0 && <span style={{ color: 'var(--mana-2)' }}>{nums.manaCost} mana</span>}
                {!nums.lifeCost && !nums.manaCost && <span className="dim">free</span>}
              </span>
              <span className="skill-rule">{unusable ?? rulesLabel(s, gem.rules)}</span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

function FlaskBelt({ s }: { s: GameState }) {
  const inCombat = !!s.combat;
  return (
    <div className="flask-belt">
      {s.flaskSlots.map((f, i) => {
        if (!f)
          return (
            <div key={i} className="flask empty">
              <span className="flask-key">{i + 1}</span>
            </div>
          );
        const st = flaskStats(f);
        const buff = s.combat?.buffs.find((b) => b.source === 'flask' && b.id === f.flaskId);
        const ready = f.charges >= st.chargesPerUse;
        return (
          <Tooltip key={i} content={<FlaskTip f={f} />}>
            <button
              data-tut={`flask-${i}`}
              className={`flask ${ready && inCombat ? 'ready' : ''} ${buff ? 'active' : ''} ${f.rarity === 'magic' ? 'magic' : ''}`}
              style={{ ['--flask' as string]: st.def.color }}
              disabled={!inCombat || !ready}
              onClick={() => game.act((st2, ctx) => useFlask(st2, ctx, i))}
              onContextMenu={(e) => (e.preventDefault(), pinFlask(f))}
            >
              <div className="flask-liquid" style={{ height: `${(f.charges / flaskCapacity(s, f)) * 100}%` }} />
              {buff && <div className="flask-timer" style={{ width: `${(buff.remainingMs / buff.durationMs) * 100}%` }} />}
              <span className="flask-key">{i + 1}</span>
              {f.instill && <span className="flask-auto">AUTO</span>}
              <span className="flask-charges">
                {Math.floor(f.charges)}/{flaskCapacity(s, f)}
              </span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

function StatRow({ label, you, them, good }: { label: string; you: string; them: string; good?: boolean | null }) {
  return (
    <>
      <span className="muted">{label}</span>
      <span className={good === true ? 'good' : good === false ? 'bad' : ''}>{you}</span>
      <span>{them}</span>
    </>
  );
}

/**
 * Side-by-side numbers against your current target, then what this area's boss can do. The rows are always there, so
 * the panel reads the same with no target, and the boss section doesn't wait for the boss to arrive or be targeted.
 */
function Matchup({ s, d, bossDef }: { s: GameState; d: Derived; bossDef: MonsterDef }) {
  const target = focusTarget(s);
  const boss = makeMonster(bossDef, true);
  const hit = target ? hitChance(d.accuracy, target.level) : 0;
  const evade = target ? evadeChance(d.evasion, target.level) : 0;
  const perHit = target ? mitigate(d, target.damage, target.dmgType) : 0;
  const slam = mitigate(d, boss.damage * BOSS_SLAM_MULT, boss.slamType ?? boss.dmgType);
  const nova = mitigate(d, boss.damage * BOSS_NOVA_MULT, boss.novaType);
  const theirDps = target ? (perHit * (1 - evade)) / (target.attackMs / 1000) : 0;
  const dps = s.combat ? liveDps(s.combat) : 0;
  const yourDefence = !target ? '–' : target.dmgType === 'phys' ? `${fmt(d.armour)} armour` : `${d.res[target.dmgType]}% resist`;
  return (
    <div className="matchup">
      <span />
      <span className="matchup-head">You</span>
      <span className="matchup-head" title={target?.name}>{target?.name ?? 'No target'}</span>
      <StatRow
        label="Level"
        you={String(d.combatLevel)}
        them={target ? String(target.level) : '–'}
        good={!target ? null : d.combatLevel >= target.level ? true : target.level - d.combatLevel > 3 ? false : null}
      />
      <StatRow label="Life" you={d.maxEs ? `${fmt(d.maxLife)} + ${fmt(d.maxEs)} ES` : fmt(d.maxLife)} them={target ? `${fmt(Math.max(0, target.life))} / ${fmt(target.maxLife)}` : '–'} />
      <StatRow label="Damage / sec" you={fmt(dps)} them={target ? theirDps.toFixed(1) : '–'} good={target && dps ? dps > theirDps * 1.5 : null} />
      <StatRow label="Chance to hit" you={target ? `${Math.round(hit * 100)}%` : '–'} them={target ? `${Math.round((1 - evade) * 100)}%` : '–'} />
      <StatRow label="Their hit on you" you={yourDefence} them={target ? `${fmt(perHit)} ${DMG_NAME[target.dmgType].toLowerCase()}` : '–'} good={target ? perHit < (d.maxLife + d.maxEs) * 0.1 : null} />
      <StatRow label="Their resistances" you="" them={target ? `${target.res.fire}/${target.res.cold}/${target.res.light}/${target.res.chaos}% F/C/L/Ch` : '–'} />
      <StatRow
        label="Attack / cast time"
        you={`Default Attack ${(d.attackMs / 1000).toFixed(2)}s`}
        them={target ? `${target.attackName} ${(target.attackMs / 1000).toFixed(2)}s ${target.attackKind === 'spell' ? 'cast' : 'attack'}` : '–'}
      />
      <div className="target-label matchup-section">Boss: {boss.name}</div>
      <div className="matchup-note">
        <b>{boss.casts.slam.name}:</b> a heavy blow that winds up for {(boss.casts.slam.ms / 1000).toFixed(1)}s, then hits for about{' '}
        <b className={slam >= s.life ? 'bad' : ''}>{fmt(slam)}</b>{boss.slamType ? ` ${DMG_NAME[boss.slamType].toLowerCase()}` : ''}. Evasion Rating can't dodge it — use a guard skill, War Cry or a flask.
      </div>
      {bossDef.mechanics?.includes('nova') && (
        <div className="matchup-note">
          <b>{boss.casts.nova.name}:</b> a {DMG_NAME[boss.novaType].toLowerCase()} nova that winds up for{' '}
          {(boss.casts.nova.ms / 1000).toFixed(1)}s, then hits for about{' '}
          <b className={nova >= s.life ? 'bad' : ''}>{fmt(nova)}</b>. Blocks don't stop it — resistances, shields, evades or an interrupt do.
        </div>
      )}
      {bossDef.echoes && (
        <div className="matchup-note">
          <b>Echoes:</b> {bossDef.echoes.map(([a, b]) => `${MECHANIC_INFO[a].name} and ${MECHANIC_INFO[b].name}`).join(', then ')}{bossDef.echoes.length > 1 ? ', a pair at a time as its life falls' : ', together'}.
        </div>
      )}
      {echoTips(bossDef).map((tip) => (
        <div key={tip} className="matchup-note">
          <b>Together:</b> {tip}
        </div>
      ))}
      {(bossDef.mechanics ?? ['slam'])
        .filter((k) => k !== 'slam' && k !== 'nova')
        .map((k) => (
          <div key={k} className="matchup-note">
            <b>{MECHANIC_INFO[k].name}:</b> {MECHANIC_INFO[k].tip}
          </div>
        ))}
      {target?.attackGround && (
        <div className="matchup-note">
          <b>{target.attackName}:</b> leaves {GROUND[monsterGround(target, target.dmgType)].name.toLowerCase()} under you for a few seconds. Run or Flee to step out of it faster.
        </div>
      )}
    </div>
  );
}

export function CombatPage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const d = deriveStats(s);
  const c = s.combat;
  const fx = useCombatFx();

  if (!c) {
    return (
      <div className="page">
        <PageHeader title="Combat">You're not fighting right now.</PageHeader>
        <div className="card">
          <EmptyState
            icon={<GameIcon name="map" size={36} color="var(--accent)" />}
            title="Pick an area in the Campaign"
            action={
              <button className="btn primary" data-tut="open-campaign" onClick={() => go('campaign')}>
                Open Campaign
              </button>
            }
          >
            Max Life {fmt(d.maxLife)}{d.maxEs ? ` + ${fmt(d.maxEs)} ES` : ''} · {fmt(d.armour)} Armour · {fmt(d.evasion)} Evasion
          </EmptyState>
        </div>
        {s.offlineHaul.length > 0 && <LootPile s={s} pile="offlineHaul" />}
        {s.ground.length > 0 && <LootPile s={s} pile="ground" />}
      </div>
    );
  }

  const zone = zoneDef(c.zoneId);
  const zoneArt = anyArtUrl(`zones/${zone.art ?? zone.id}`);
  // once this area's boss is down, offer the areas it opened
  const nexts = s.bossesDefeated.includes(zone.id) ? nextZones(zone.id).filter((z) => s.unlockedZones.includes(z.id)) : [];
  const kills = s.zoneKills[zone.id] ?? 0;
  const bossReady = bossIsNext(s, zone.id);
  const bossComing = bossCalled(s, zone.id);
  const areaXp = areaXpLabel(characterLevel(s), zone.levelRange);
  const bossHere = c.monsters.some((m) => m.isBoss);
  return (
    <div className="page combat-page">
      <PageHeader
        title={zone.name}
        kicker="Fighting"
        actions={
          <>
            {nexts.map((z) => (
              <button key={z.id} className="btn primary" title={`Area level ${z.levelRange[0]}–${z.levelRange[1]}`} onClick={() => game.act((st, ctx) => startCombat(st, ctx, z.id))}>
                Next area: {z.name} →
              </button>
            ))}
            {canBossFarm(s, zone.id) && (
              <button className="btn" title={`Fight only ${zone.boss.name}, who comes back 5 seconds after each kill`} onClick={() => game.act((st) => toggleBossFarm(st))}>
                {c.bossFarm ? 'Stop boss farm' : 'Boss farm'}
              </button>
            )}
            {!s.maps.run && !c.bossFarm && (
              <button
                className="btn primary challenge"
                data-tut="challenge-boss"
                disabled={!bossReady || bossComing || bossHere}
                title={bossReady ? `Fight ${zone.boss.name} once the field is clear` : `${zone.boss.name} comes out after ${zone.bossEvery} kills here`}
                onClick={() => game.act((st) => challengeBoss(st))}
              >
                {bossHere ? 'Boss fight' : !bossReady ? `Challenge boss (${kills}/${zone.bossEvery})` : bossComing ? `${zone.boss.name} is coming…` : `Challenge ${zone.boss.name}`}
              </button>
            )}
            <button className="btn" onClick={() => go('campaign')}>
              Change area
            </button>
            <button className="btn danger" onClick={() => game.act((st) => retreat(st))}>
              Retreat to Hideout
            </button>
          </>
        }
      >
        Area level {zone.levelRange[0]}–{zone.levelRange[1]} · {areaXp && `${areaXp} · `}{s.maps.run ? `${s.maps.run.packsLeft}/${s.maps.run.packsTotal} packs left before ${zone.boss.name}` : c.bossFarm ? `Boss farm: ${zone.boss.name}` : bossReady ? `${zone.boss.name} is ready to fight` : `${kills}/${zone.bossEvery} until ${zone.boss.name}`}
      </PageHeader>

      <div className={`card arena2 ${zoneArt ? 'has-art' : ''}`} style={{ ['--zone' as string]: zone.color, ['--zone-art' as string]: zoneArt ? `url(${zoneArt})` : undefined }}>
        <div className="arena-side">
          <PlayerCard s={s} d={d} fx={fx} />
          <div className="matchup-card">
            <div className="target-label">Matchup</div>
            <Matchup s={s} d={d} bossDef={zone.boss} />
          </div>
        </div>
        <div className="bf-wrap">
          <MovementBar s={s} />
          <ChainedNotice s={s} c={c} />
          <Battlefield s={s} c={c} fx={fx} />
          <FieldSummary s={s} c={c} />
          <div className="action-bar">
            <div className="action-bar-group">
              <div className="action-bar-label">
                Skills
                <button className="btn sm ghost" onClick={() => go('skills')}>
                  Edit skills & rules
                </button>
              </div>
              <SkillBar s={s} d={d} fx={fx} />
            </div>
            <div className="action-bar-group flasks">
              <div className="action-bar-label">
                Flasks <span className="card-hint">keys 1–5</span>
              </div>
              <FlaskBelt s={s} />
            </div>
          </div>
        </div>
      </div>

      {s.offlineHaul.length > 0 && <LootPile s={s} pile="offlineHaul" />}
      <LootPile s={s} pile="ground" />
    </div>
  );
}
