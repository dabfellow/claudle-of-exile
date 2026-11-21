import { useCallback, useState } from 'react';
import { autoChallengeUnlocked, autoFleeUnlocked, autoNextZoneUnlocked } from '../../engine/hideout';
import { mealDef } from '../../data/cooking';
import { flaskDef } from '../../data/flasks';
import { activeGemDef, DEFAULT_ATTACK } from '../../data/gems';
import { monsterMod } from '../../data/monsterMods';
import { MONSTER_PROFILES } from '../../data/monsterProfiles';
import { BOSS_FROSTBITE_MAX, BOSS_FROSTBITE_SLOW_PCT, MECHANIC_INFO, nextZones, zoneDef } from '../../data/zones';
import { CELLS, cellRing, GROUND, inReach, minionInWay, MOVEMENT, MOVEMENT_ORDER, PLAYER_SPOT, RINGS } from '../../engine/battlefield';
import {
  aliveMonsters,
  army,
  bossCalled,
  bossIsNext,
  canBossFarm,
  challengeBoss,
  toggleBossFarm,
  focusTarget,
  liveDps,
  lockTarget,
  monsterDps,
  nextArrival,
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
  skillBlockedReason,
} from '../../engine/combat';
import { areaXpLabel, characterLevel } from '../../engine/character';
import { mealEffectText } from '../../engine/cooking';
import { flaskStats } from '../../engine/flasks';
import { MIN_COOLDOWN_MS, skillNumbers } from '../../engine/gems';
import { ASCENDANCY_BY_ID } from '../../data/ascendancies';
import { ascendancyOf } from '../../engine/ascendancy';
import { flaskCapacity, MANA_POWER_FULL_SPEND, meterLabel, meterMax, mechanicOf, overflowMax, streakCap } from '../../engine/mechanics';
import { classDef } from '../../data/classes';
import { mealTimeLeft } from '../components/PantryBoard';
import { DOOMED_MODS, doomedTier, mapTier, normalMapModDef, sextantMod } from '../../data/maps';
import { stopAutoRun } from '../../engine/maps';
import { deriveStats, type Derived } from '../../engine/stats';
import type { CombatRuntime, DamageType, GameEvent, GameState, GroundKind, Minion, MonsterInstance, Movement, TargetOrder, TargetPriority } from '../../engine/types';
import { game, useGame, useGameEvent } from '../../game';
import { Art, Badge, EmptyState, fmt, GameIcon, PageHeader, ProgressBar, Tabs, Tooltip, zoneBackdrop } from '../components/common';
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
  const asc = ascendancyOf(s);
  const mech = mechanicOf(s);
  let max = 0;
  let val = 0;
  if (asc === 'wellspring') {
    max = overflowMax(d);
    val = max > 0 ? (c.mech ?? 0) / max : 0;
  } else if (mech === 'manaPower') {
    const manaTarget = (d.maxMana * MANA_POWER_FULL_SPEND) / (1 + Math.max(0, d.raw.manaPowerFull) / 100);
    const spent = c.manaSpent?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    max = manaTarget;
    val = manaTarget > 0 ? spent / manaTarget : 0;
  } else if (mech === 'riposte' && asc === 'matador') {
    max = streakCap(s);
    val = max > 0 ? (c.asc.streak ?? 0) / max : 0;
  } else {
    max = meterMax(mech, d.raw);
    val = max > 0 ? (c.mech ?? 0) / max : 0;
  }
  const label = meterLabel(s, d);
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
          <ProgressBar value={val} size="md" color={cls.color} label={label} />
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
        {c.shield > 0 && (
          <div
            className={`shield-bar ${c.shield > d.maxLife ? 'overfill' : ''}`}
            style={{ width: `${Math.min(1, c.shield / d.maxLife) * 100}%` }}
            title={`Shield ${fmt(c.shield)}`}
          >
            {c.shield > d.maxLife && <span className="shield-overfill">×{(c.shield / d.maxLife).toFixed(1)}</span>}
          </div>
        )}
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
        {(c.playerChillMs ?? 0) > 0 && <span className="status cold">Chilled</span>}
        {(c.playerShockMs ?? 0) > 0 && <span className="status bad">Shocked</span>}
        {[...new Set((c.playerDots ?? []).map((dot) => dot.kind))].map((kind) => <span key={kind} className="status bad">{kind[0].toUpperCase() + kind.slice(1)}</span>)}
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
              {name} {b.stacks && b.stacks > 1 ? `×${b.stacks} ` : ''}{(b.remainingMs / 1000).toFixed(1)}s
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** A monster's rarity as shown to the player: bosses are unique. */
function rarityOf(m: MonsterInstance): 'normal' | 'magic' | 'rare' | 'unique' {
  return m.isBoss ? 'unique' : m.rarity ?? 'normal';
}

const RARITY_LABEL = { normal: 'Normal', magic: 'Magic', rare: 'Rare', unique: 'Unique' } as const;

/** A magic, rare or unique monster's modifiers, each with what it does, in its rarity's colour. */
function MonsterMods({ m }: { m: MonsterInstance }) {
  const lines: { name: string; desc: string }[] = [];
  if (m.mods?.length) {
    for (const id of m.mods) {
      const mod = monsterMod(id);
      if (mod) lines.push({ name: mod.name, desc: mod.desc });
    }
  }
  if (m.hulking) {
    lines.push({ name: 'Hulking', desc: 'Takes 60% less area, chain and piercing damage' });
  }
  if (m.isBoss && m.mechanics?.length) {
    for (const mech of m.mechanics) {
      const info = MECHANIC_INFO[mech];
      if (info) lines.push({ name: info.name, desc: info.tip });
    }
  }
  if (!lines.length) return null;
  return (
    <div className="monster-mod-list">
      {lines.map((l, i) => (
        <div key={i} className={`monster-mod-line rarity-${rarityOf(m)}`}>
          <b>{l.name}</b> <span className="muted">{l.desc}</span>
        </div>
      ))}
    </div>
  );
}

function MonsterCard({ m, target, fx }: { m: MonsterInstance; target: boolean; fx: Fx }) {
  const key = String(m.uid);
  const poison = m.dots.filter((x) => x.kind === 'poison').length;
  return (
    <div className={`fighter monster monster-rarity-${m.rarity ?? 'normal'} ${m.isBoss ? 'boss' : ''} ${target ? 'targeted' : ''} ${shakeClass(fx.shakes[key])} ${critClass(fx.crits[key])}`}>
      <Floaters list={fx.floaters.filter((f) => f.owner === m.uid)} />
      <div className="fighter-head">
        <div className="portrait small" style={{ borderColor: m.isBoss ? 'var(--life)' : undefined }}>
          <Art src={`monsters/${m.defId}`} alt={m.name} cover fallback={<GameIcon name="skull" size={20} color={m.isBoss ? 'var(--life-2)' : DMG_COLOR[m.dmgType]} />} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className={`fighter-name small rarity-${rarityOf(m)}`}>{m.name}</div>
          <div className="muted small" title={m.hulking ? 'Hulking: area, chain and piercing hits do 60% less to it' : undefined}>
            <span className={`rarity-${rarityOf(m)}`}>{m.isBoss ? 'Boss' : RARITY_LABEL[rarityOf(m)]}</span>
            {' · '}
            {m.hulking ? 'Hulking · ' : ''}Lv {m.level} · {DMG_NAME[m.dmgType]}
          </div>
        </div>
        {target && <span className="target-pip" title="Current target" />}
      </div>
      <ProgressBar value={Math.max(0, m.life) / m.maxLife} size="md" color="linear-gradient(90deg, var(--life), var(--life-2))" label={`${fmt(Math.max(0, m.life))} / ${fmt(m.maxLife)}`} ghost />
      {(m.maxEs ?? 0) > 0 && <ProgressBar value={(m.es ?? 0) / m.maxEs!} size="md" color="var(--es)" label={`ES ${fmt(m.es ?? 0)} / ${fmt(m.maxEs!)}`} />}
      {m.archetype && <div className="muted small">{MONSTER_PROFILES[m.archetype].name} · {(m.attackMs / 1000).toFixed(2)}s {m.attackKind}</div>}
      <div className="muted small">
        Armour {fmt(m.armour ?? 0)} · Evasion {fmt(m.evasion ?? 0)} · Block {m.blockChance ?? 0}% / Spell block {m.spellBlockChance ?? 0}%
        {m.attackAilment ? ` · ${m.attackAilment}` : ''}
      </div>
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
      <MonsterMods m={m} />
      {m.gearCheckWarning && <div className="cast-warning">{m.gearCheckWarning}</div>}
      <div className="status-row">
        {m.chained && <span className="status bad">Chained: can't be hurt</span>}
        {m.martyr && <span className="status">Area and chain skills strike it. Click it to aim anything else</span>}
        {m.weakPoint && <span className="status warn">Weak point: strike to shatter plating!</span>}
        {m.choir && <span className="status">Choir ({m.choir}): silence to scatter singers</span>}
        {m.plated && <span className="status">Plated carapace: reduced physical damage</span>}
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
      <div className={`bf-token monster-rarity-${rarityOf(m)} ${m.isBoss ? 'boss' : ''} ${m.martyr ? 'martyr' : ''} ${m.chained ? 'chained' : ''} ${target ? 'targeted' : ''} ${locked ? 'locked' : ''} ${m.casting >= 0 ? 'casting' : ''} ${shakeClass(fx.shakes[key])} ${critClass(fx.crits[key])}`}>
        <Floaters list={fx.floaters.filter((f) => f.owner === m.uid)} />
        <div className="bf-token-head">
          <div className="portrait tiny">
            <Art src={`monsters/${m.defId}`} alt={m.name} cover fallback={<GameIcon name="skull" size={14} color={m.isBoss ? 'var(--life-2)' : DMG_COLOR[m.dmgType]} />} />
          </div>
          <span className={`bf-token-name rarity-${rarityOf(m)}`}>{m.name}</span>
          {m.rarity && m.rarity !== 'normal' && !m.isBoss && (
            <span className={`bf-rarity-badge rarity-${rarityOf(m)}`}>[{m.rarity[0].toUpperCase()}]</span>
          )}
          {m.attackKind === 'spell' && !m.isBoss && <span className="bf-ranged" title="Ranged: stops a few rings out and casts from there" />}
          {target && <span className="target-pip" title={locked ? 'Your chosen target (click to release)' : 'Current target'} />}
        </div>
        <ProgressBar value={Math.max(0, m.life) / m.maxLife} color="linear-gradient(90deg, var(--life), var(--life-2))" />
        {(m.maxEs ?? 0) > 0 && <ProgressBar value={(m.es ?? 0) / m.maxEs!} color="var(--es)" className="thin" />}
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
function ArrivalTimer({ ms }: { ms: number }) {
  return <span className="bf-arrival-timer" aria-label={`Arrival in ${(ms / 1000).toFixed(1)} seconds`}>{(ms / 1000).toFixed(1)}s</span>;
}

function Battlefield({ s, c, fx, arrival }: { s: GameState; c: CombatRuntime; fx: Fx; arrival: ReturnType<typeof nextArrival> }) {
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
        const arriving = arrival?.cell === i;
        return (
          <div
            key={i}
            className={`bf-cell ring-${cell.ring} ${m ? 'occupied' : ''} ${m && m === focus ? 'target' : ''} ${m?.isBoss ? 'boss' : ''} ${ground ? `ground-${ground.kind}` : ''} ${storm ? `storm storm-${stormDef!.effect.type ?? 'phys'}` : ''} ${flash} ${arriving ? 'incoming' : ''}`}
            style={hexBox(cell.x, cell.y)}
            title={storm ? `${stormDef!.name} (${(storm.remainingMs / 1000).toFixed(1)}s)` : ground ? `${GROUND[ground.kind].name} (${(ground.remainingMs / 1000).toFixed(1)}s): ${GROUND[ground.kind].desc}` : undefined}
          >
            {arriving && <ArrivalTimer ms={arrival.ms} />}
          </div>
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
    </div>
  );
}

/** Narrow screens: the field doesn't fit, so sum it up instead. */
function FieldSummary({ c, arrival, focus }: { c: CombatRuntime; arrival: ReturnType<typeof nextArrival>; focus?: MonsterInstance }) {
  const alive = aliveMonsters(c);
  const close = alive.filter((m) => cellRing(m.cell) === 1).length;
  const priorities = alive.filter((m) => m.martyr || m.weakPoint || m.choir);
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
      {priorities.map((m) => (
        <button key={m.uid} className={`btn sm ${m.uid === c.lockedUid ? 'primary' : ''}`} onClick={() => game.act((st) => lockTarget(st, m.uid))}>
          Strike {m.name} ({fmt(Math.max(0, m.life))})
        </button>
      ))}
      <div className="bf-mini" style={{ aspectRatio: `${FIELD_W} / ${FIELD_H}` }}>
        {CELLS.map((cell, i) => {
          const enemy = alive.find((m) => m.cell === i);
          const arriving = arrival?.cell === i;
          const classes = `bf-cell ring-${cell.ring} ${arriving ? 'incoming' : ''}`;
          return enemy ? (
            <button key={i} type="button" className={`${classes} occupied ${enemy === focus ? 'target' : ''}`} style={hexBox(cell.x, cell.y)} aria-label={`Target ${enemy.name}`} aria-pressed={enemy.uid === c.lockedUid} onClick={() => game.act((st) => lockTarget(st, enemy.uid))}>
              <span className={`bf-mini-enemy rarity-${rarityOf(enemy)}`} />
            </button>
          ) : (
            <div key={i} className={classes} style={hexBox(cell.x, cell.y)}>
              {arriving && <ArrivalTimer ms={arrival.ms} />}
            </div>
          );
        })}
      </div>
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

/** While a boss is chained, why your hits do nothing. Laid over the field, so it never moves the hexes, and clicks pass through to the martyrs. */
function ChainedNotice({ c }: { c: CombatRuntime }) {
  const boss = c.monsters.find((m) => m.chained);
  if (!boss) return null;
  return (
    <div className="chained-anchor">
      <div className="callout bad chained-notice">
        <b>{boss.name} is chained and can't be hurt</b> until its martyrs die. Your skills and minions go for them by themselves.
      </div>
    </div>
  );
}

function TargetingSelector({ targeting }: { targeting: { priority: TargetPriority; order: TargetOrder } }) {
  const [open, setOpen] = useState(false);
  const prio = PRIORITIES.find((p) => p.id === targeting.priority) ?? PRIORITIES[0];
  const ord = ORDERS.find((o) => o.id === targeting.order) ?? ORDERS[0];
  const update = (choice: Partial<typeof targeting>) => game.act((st) => {
    st.settings.targeting = { ...st.settings.targeting, ...choice };
    if (st.combat) st.combat.targetUid = undefined;
  });

  return (
    <div className="bf-target-container">
      <button
        type="button"
        className={`bf-target-toggle ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title={`${prio.label} · ${ord.label}`}
      >
        <span aria-hidden="true">◎</span>
        Targeting
      </button>
      {open && (
        <div className="bf-target-popover" onClick={(e) => e.stopPropagation()}>
          <div className="bf-target-section">
            <span className="dim small" style={{ fontWeight: 600 }}>Priority:</span>
            <div className="row wrap" style={{ gap: 4, marginTop: 4 }}>
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`chip sm ${targeting.priority === p.id ? 'active' : ''}`}
                  aria-pressed={targeting.priority === p.id}
                  onClick={() => update({ priority: p.id })}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bf-target-section" style={{ marginTop: 8 }}>
            <span className="dim small" style={{ fontWeight: 600 }}>Order:</span>
            <div className="row wrap" style={{ gap: 4, marginTop: 4 }}>
              {ORDERS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`chip sm ${targeting.order === o.id ? 'active' : ''}`}
                  aria-pressed={targeting.order === o.id}
                  onClick={() => update({ order: o.id })}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn sm ghost" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MovementBar({ s }: { s: GameState }) {
  return (
    <div className="bf-bar">
      <Tabs
        compact
        value={s.settings.movement}
        onChange={(id) => game.act((st) => setMovement(st, id as Movement))}
        tabs={MOVEMENT_ORDER.map((id) => ({ id, label: MOVEMENT[id].name, title: MOVEMENT[id].desc }))}
      />
      {s.combat?.fleeing && <span className="status bad">Emergency flee</span>}
    </div>
  );
}

function CombatAutomation({ s }: { s: GameState }) {
  const options = [
    { key: 'autoFlee', label: 'Emergency flee', unlocked: autoFleeUnlocked(s), hint: 'Below 35% Life, flee until you recover to 90%.' },
    { key: 'autoBoss', label: 'Auto-challenge', unlocked: autoChallengeUnlocked(s), hint: 'Challenge a ready boss automatically.' },
    { key: 'autoNextZone', label: 'Auto next zone', unlocked: autoNextZoneUnlocked(s), hint: 'Travel onward once the zone boss is defeated and the way is open.' },
  ] as const;
  return (
    <div className="combat-automation" role="group" aria-label="Combat automation">
      {options.map(({ key, label, unlocked, hint }) => {
        const enabled = unlocked && !!s.settings[key];
        return (
          <button
            key={key}
            type="button"
            className={`combat-auto-toggle ${enabled ? 'active' : ''}`}
            aria-pressed={enabled}
            disabled={!unlocked}
            title={unlocked ? hint : 'Unlocked by a War Table upgrade'}
            onClick={() => game.act((st) => void (st.settings[key] = !st.settings[key]))}
          >
            <span className="combat-auto-light" aria-hidden="true" />
            {label}
          </button>
        );
      })}
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
        const unusable = skillBlockedReason(d, gem);
        const flashed = fx?.usedSlot?.slot === i ? fx.usedSlot.n : 0;
        return (
          <Tooltip key={i} content={<GemTip gem={gem} state={s} />}>
            <button
              data-tut={`skill-${i}`}
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

function Matchup({ s, d, target }: { s: GameState; d: Derived; target?: MonsterInstance }) {
  const rarity = target && rarityOf(target);
  const mods = target?.mods?.map((id) => monsterMod(id)?.name).filter(Boolean) ?? [];
  if (target?.hulking) mods.push('Hulking');
  if (target?.elite) mods.push('Elite');
  if (target?.enraged) mods.push('Enraged');
  if (target?.revenant) mods.push('Revenant');

  return (
    <section className="matchup-card" aria-label="Combat matchup">
      <div className="matchup-fighter">
        <div className="portrait tiny">
          <Art src={`portraits/class_${s.character.classId}`} alt="" cover fallback={<GameIcon name="combat" size={18} />} />
        </div>
        <h3>You</h3>
        <ProgressBar value={s.life / d.maxLife} color="linear-gradient(90deg, var(--life), var(--life-2))" label={`${fmt(s.life)} / ${fmt(d.maxLife)} Life`} />
        <span className="matchup-dps">{fmt(s.combat ? liveDps(s.combat) : 0)} DPS</span>
      </div>
      <span className="matchup-versus" aria-hidden="true">vs</span>
      <div className="matchup-fighter">
        {target && rarity ? (
          <>
            <div className="portrait tiny">
              <Art src={`monsters/${target.defId}`} alt="" cover fallback={<GameIcon name="skull" size={18} />} />
            </div>
            <h3 className={`rarity-${rarity}`}>{target.name}</h3>
            <ProgressBar value={Math.max(0, target.life) / target.maxLife} color="linear-gradient(90deg, var(--life), var(--life-2))" label={`${fmt(Math.max(0, target.life))} / ${fmt(target.maxLife)} Life`} />
            <span className="matchup-dps">{fmt(monsterDps(target))} DPS</span>
            <span className={`matchup-traits rarity-${rarity}`}>{[RARITY_LABEL[rarity], ...mods].join(' · ')}</span>
          </>
        ) : (
          <span className="dim matchup-no-target">No enemy</span>
        )}
      </div>
    </section>
  );
}

/**
 * Phones: everything you act on mid-fight in one strip held at the bottom of the screen, so nobody has to scroll
 * to see whether to drink, guard or interrupt. Your target's life and any wind-up, your Life, Energy Shield and
 * Mana, then your skills and flasks. Tap to use; press and hold for the tooltip. Hidden on wider screens.
 */
function CombatDock({ s, d, fx }: { s: GameState; d: Derived; fx: Fx }) {
  const c = s.combat!;
  const alive = aliveMonsters(c);
  const focus = focusTarget(s);
  const caster = alive.find((m) => m.casting >= 0 && m.castKind);
  return (
    <div className="combat-dock" aria-label="Fight controls">
      {caster ? (
        <div className="dock-row dock-warning">
          <span className="dock-name bad">
            ⚠ {caster.name}: {caster.casts[caster.castKind!].name}
          </span>
          <ProgressBar className="cast-bar" value={1 - caster.casting / caster.castTotal} />
        </div>
      ) : null}
      <div className="dock-row">
        {focus ? (
          <>
            <span className={`dock-name rarity-${rarityOf(focus)}`}>
              {focus.name}
              {alive.length > 1 && <span className="dim"> +{alive.length - 1}</span>}
            </span>
            <span className="dock-bars">
              {(focus.maxEs ?? 0) > 0 && <ProgressBar className="thin" value={(focus.es ?? 0) / focus.maxEs!} color="var(--es)" />}
              <ProgressBar
                value={Math.max(0, focus.life) / focus.maxLife}
                color="linear-gradient(90deg, var(--life), var(--life-2))"
                label={`${fmt(Math.max(0, focus.life))} / ${fmt(focus.maxLife)}`}
              />
            </span>
          </>
        ) : (
          <span className="dock-name dim">{alive.length ? `${alive.length} on the field` : 'Searching for monsters…'}</span>
        )}
      </div>
      <div className="dock-row dock-vitals">
        <span className="dock-bars">
          {d.maxEs > 0 && <ProgressBar className="thin" value={s.es / d.maxEs} color="linear-gradient(90deg, var(--es), var(--es-2))" />}
          <ProgressBar value={s.life / d.maxLife} color="linear-gradient(90deg, var(--life), var(--life-2))" label={`${fmt(s.life)} / ${fmt(d.maxLife)}${c.shield > 0 ? ` +${fmt(c.shield)}` : ''}`} ghost />
        </span>
        <span className="dock-bars mana">
          <ProgressBar value={d.maxMana ? s.mana / d.maxMana : 0} color="linear-gradient(90deg, var(--mana), var(--mana-2))" label={fmt(s.mana)} />
        </span>
      </div>
      <SkillBar s={s} d={d} fx={fx} />
      <div className="dock-row dock-controls">
        <TargetingSelector targeting={s.settings.targeting} />
        <CombatAutomation s={s} />
      </div>
      <FlaskBelt s={s} />
    </div>
  );
}

function MapCombatBanner() {
  const s = useGame();
  const run = s.maps.run;
  if (!run) return null;
  const auto = s.maps.auto;
  const tDef = run.doomedTier ? null : mapTier(run.tier);
  const dDef = run.doomedTier ? doomedTier(run.doomedTier) : null;
  const activeSextants = (run.sextantMods ?? []).map((id) => sextantMod(id));
  const activeDoomed = (run.doomedMods ?? []).map((id) => DOOMED_MODS.find((m) => m.id === id)).filter(Boolean);
  const activeNormal = (run.normalMods ?? []).map((id) => normalMapModDef(id)).filter(Boolean);

  const hasAnyMods = (tDef && tDef.mod !== 'none') || activeDoomed.length > 0 || activeNormal.length > 0 || activeSextants.length > 0;

  return (
    <div className="card" style={{ margin: '0 0 12px 0', padding: '10px 14px' }}>
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div className="row" style={{ alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Badge tone={dDef ? 'warn' : 'neutral'}>
            {dDef ? dDef.name : `Map Tier ${run.tier} · ${tDef?.modName}`}
          </Badge>
          <span className="dim small num">
            {run.packsLeft}/{run.packsTotal} packs left{auto ? ' · Auto-run active' : ''}
          </span>
        </div>
        {auto && (
          <button className="btn sm ghost" onClick={() => game.act((st) => stopAutoRun(st))}>
            Stop auto-run after this map
          </button>
        )}
      </div>

      {hasAnyMods && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tDef && tDef.mod !== 'none' && (
            <div className="small row" style={{ gap: 6 }}>
              <Badge tone="warn">Tier Hazard</Badge>
              <span>{tDef.modDesc}</span>
            </div>
          )}
          {activeDoomed.length > 0 && (
            <div className="small row" style={{ gap: 6 }}>
              <Badge tone="warn">Doomed</Badge>
              <span>{activeDoomed.map((m) => `${m!.name} (${m!.desc})`).join(' · ')}</span>
            </div>
          )}
          {activeNormal.length > 0 && (
            <div className="small row" style={{ gap: 6 }}>
              <Badge tone="neutral">Affixes</Badge>
              <span>{activeNormal.map((m) => `${m!.name} (${m!.desc})`).join(' · ')}</span>
            </div>
          )}
          {activeSextants.length > 0 && (
            <div className="small row" style={{ gap: 6 }}>
              <Badge tone="success">Sextant</Badge>
              <span>{activeSextants.map((m) => `${m.name} (${m.desc})`).join(' · ')}</span>
            </div>
          )}
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
            title="Pick a zone on the World Map"
            action={
              <button className="btn primary" data-tut="open-campaign" onClick={() => go('campaign')}>
                Open World Map
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
  const zoneArt = zoneBackdrop(zone);
  // Once this zone's boss is down, offer the zones it opened.
  const nexts = s.bossesDefeated.includes(zone.id) ? nextZones(zone.id).filter((z) => s.unlockedZones.includes(z.id)) : [];
  const kills = s.zoneKills[zone.id] ?? 0;
  const bossReady = bossIsNext(s, zone.id);
  const bossComing = bossCalled(s, zone.id);
  const areaXp = areaXpLabel(characterLevel(s), zone.levelRange);
  const bossHere = c.monsters.some((m) => m.isBoss);
  const focus = focusTarget(s);
  const arrival = nextArrival(s);
  return (
    <div className="page combat-page">
      <PageHeader
        title={zone.name}
        kicker="Fighting"
        actions={
          <>
            {nexts.map((z) => (
              <button key={z.id} className="btn primary" title={`Zone level ${z.levelRange[0]}–${z.levelRange[1]}`} onClick={() => game.act((st, ctx) => startCombat(st, ctx, z.id))}>
                Next zone: {z.name} →
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
              Change zone
            </button>
            <button className="btn danger" onClick={() => game.act((st) => retreat(st))}>
              Retreat to Hideout
            </button>
          </>
        }
      >
        Zone level {zone.levelRange[0]}–{zone.levelRange[1]} · {areaXp && `${areaXp} · `}{s.maps.run ? `${s.maps.run.packsLeft}/${s.maps.run.packsTotal} packs left before ${zone.boss.name}` : c.bossFarm ? `Boss farm: ${zone.boss.name}` : bossReady ? `${zone.boss.name} is ready to fight` : `${kills}/${zone.bossEvery} until ${zone.boss.name}`}
      </PageHeader>

      <MapCombatBanner />

      <div className={`card arena2 ${zoneArt ? 'has-art' : ''}`} style={{ ['--zone' as string]: zone.color, ['--zone-art' as string]: zoneArt ? `url(${zoneArt})` : undefined }}>
        <div className="arena-side">
          <PlayerCard s={s} d={d} fx={fx} />
          <Matchup s={s} d={d} target={focus} />
        </div>
        <div className="bf-wrap">
          <MovementBar s={s} />
          <ChainedNotice c={c} />
          <Battlefield s={s} c={c} fx={fx} arrival={arrival} />
          <FieldSummary c={c} arrival={arrival} focus={focus} />
          <div className="action-bar">
            <div className="action-bar-group">
              <div className="action-bar-label">
                Skills
                <TargetingSelector targeting={s.settings.targeting} />
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
              <CombatAutomation s={s} />
            </div>
          </div>
        </div>
      </div>

      {s.offlineHaul.length > 0 && <LootPile s={s} pile="offlineHaul" />}
      <LootPile s={s} pile="ground" />
      <CombatDock s={s} d={d} fx={fx} />
    </div>
  );
}
