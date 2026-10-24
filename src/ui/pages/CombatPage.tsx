import { useCallback, useState } from 'react';
import { flaskDef } from '../../data/flasks';
import { activeGemDef, DEFAULT_ATTACK } from '../../data/gems';
import { BOSS_NOVA_MULT, BOSS_SLAM_CAST_MS, BOSS_SLAM_MULT, MECHANIC_INFO, zoneDef } from '../../data/zones';
import { aliveMonsters, mitigate, queueSkill, retreat, useFlask } from '../../engine/combat';
import { flaskStats } from '../../engine/flasks';
import { skillNumbers } from '../../engine/gems';
import { deriveStats, evadeChance, hitChance, type Derived } from '../../engine/stats';
import type { DamageType, GameEvent, GameState, MonsterInstance } from '../../engine/types';
import { game, useGame, useGameEvent } from '../../game';
import { Art, artUrl, EmptyState, fmt, PageHeader, ProgressBar, Tooltip } from '../components/common';
import { FlaskTip, pinFlask } from '../components/FlaskView';
import { GemIcon, GemTip, ruleText } from '../components/GemView';
import { Icon } from '../components/Icon';
import type { Page } from '../Layout';
import { SKILL_KEYS } from './SkillGemsPage';

const DMG_COLOR: Record<DamageType, string> = {
  phys: 'var(--phys)',
  fire: 'var(--fire)',
  cold: 'var(--cold)',
  light: 'var(--light)',
};
/** buffs that come from tree effects rather than a skill gem */
const EXTRA_BUFFS: Record<string, string> = { guard_armour: 'Guard Armour', evade_speed: 'Evasive' };
const DMG_NAME: Record<DamageType, string> = { phys: 'Physical', fire: 'Fire', cold: 'Cold', light: 'Lightning' };

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

  const add = useCallback((f: Omit<Floater, 'id' | 'x'>) => {
    const id = floaterId++;
    setFloaters((l) => [...l.slice(-24), { ...f, id, x: 25 + Math.random() * 50 }]);
    setTimeout(() => setFloaters((l) => l.filter((y) => y.id !== id)), 950);
  }, []);

  const onEvent = useCallback(
    (e: GameEvent) => {
      const bump = (set: typeof setShakes, key: string) => set((m) => ({ ...m, [key]: (m[key] ?? 0) + 1 }));
      if (e.t === 'skill') setUsedSlot((u) => ({ slot: e.slot, n: (u?.n ?? 0) + 1 }));
      if (e.t !== 'hit') return;
      if (e.target === 'monster') {
        const owner = e.monsterUid ?? 0;
        if (e.evaded) add({ owner, text: 'miss', cls: 'miss', color: '' });
        else {
          add({
            owner,
            text: fmt(e.amount),
            cls: e.crit ? 'crit' : e.dot ? 'dot' : '',
            color: e.crit ? '' : e.dot ? 'var(--life-2)' : DMG_COLOR[e.dmgType],
          });
          if (!e.dot) bump(setShakes, String(owner));
          if (e.crit) bump(setCrits, String(owner));
        }
      } else if (e.evaded) add({ owner: 'player', text: 'evade', cls: 'miss', color: '' });
      else if (e.blocked) add({ owner: 'player', text: 'block', cls: 'block', color: '' });
      else {
        add({
          owner: 'player',
          text: `-${fmt(e.amount)}${e.absorbed ? ` (${fmt(e.absorbed)} absorbed)` : ''}`,
          cls: '',
          color: e.dmgType === 'phys' ? 'var(--life-2)' : DMG_COLOR[e.dmgType],
        });
        bump(setShakes, 'player');
      }
    },
    [add],
  );
  useGameEvent(onEvent);
  return { floaters, shakes, crits, usedSlot };
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

function PlayerCard({ s, d, fx }: { s: GameState; d: Derived; fx: Fx }) {
  const c = s.combat!;
  const using = c.using ? (c.using === DEFAULT_ATTACK.id ? DEFAULT_ATTACK : activeGemDef(c.using)) : null;
  const progress = aliveMonsters(c).length ? 1 - Math.max(0, c.actionMs) / c.actionTotal : 0;
  return (
    <div className={`fighter player ${shakeClass(fx.shakes.player)}`}>
      <Floaters list={fx.floaters.filter((f) => f.owner === 'player')} />
      <div className="fighter-head">
        <div className="portrait">
          <Art src={`portraits/class_${s.character.classId}`} alt={s.character.name} cover fallback={<Icon name="combat" size={28} color="var(--accent-2)" />} />
        </div>
        <div>
          <div className="fighter-name">{s.character.name}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Level {d.combatLevel} · {d.dps.toFixed(1)} DPS
          </div>
        </div>
      </div>
      <div className="life-stack">
        <ProgressBar value={s.life / d.maxLife} size="lg" color="linear-gradient(90deg, var(--life), var(--life-2))" label={`${fmt(s.life)} / ${fmt(d.maxLife)}`} ghost />
        {c.shield > 0 && <div className="shield-bar" style={{ width: `${Math.min(1, c.shield / d.maxLife) * 100}%` }} title={`Shield ${fmt(c.shield)}`} />}
      </div>
      <ProgressBar value={d.maxMana ? s.mana / d.maxMana : 0} color="linear-gradient(90deg, var(--mana), var(--mana-2))" label={`${fmt(s.mana)} / ${fmt(d.maxMana)}`} />
      <div className="action-line">
        <span className="dim">{using ? using.name : 'Waiting'}</span>
        <ProgressBar value={progress} color={using ? 'var(--accent)' : 'var(--line-2)'} />
      </div>
      <div className="status-row">
        {c.blocks > 0 && <span className="status good">Block ×{c.blocks}</span>}
        {c.evadeMs > 0 && <span className="status good">Evading {(c.evadeMs / 1000).toFixed(1)}s</span>}
        {c.shield > 0 && <span className="status cold">Shield {fmt(c.shield)}</span>}
        {c.ambush && <span className="status good">Ambush ready</span>}
        {c.flurryStacks > 0 && <span className="status">Flurry ×{c.flurryStacks}</span>}
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
          <Art src={`monsters/${m.defId}`} alt={m.name} cover fallback={<Icon name="skull" size={20} color={m.isBoss ? 'var(--life-2)' : DMG_COLOR[m.dmgType]} />} />
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
      {m.casting >= 0 ? (
        <>
          <ProgressBar className="cast-bar" value={1 - m.casting / m.castTotal} />
          <div className="cast-warning">
            {m.castKind === 'nova'
              ? `⚠ ${DMG_NAME[m.novaType]} nova incoming — blocks won't stop it!`
              : '⚠ Heavy blow incoming — guard, interrupt or drink!'}
          </div>
        </>
      ) : (
        <ProgressBar value={m.attackTimer / m.attackMs} color="var(--dim)" className="thin" />
      )}
      <div className="status-row">
        {m.enraged && <span className="status bad">Enraged</span>}
        {m.stunMs > 0 && <span className="status">Stunned</span>}
        {m.frozenMs > 0 && <span className="status cold">Frozen</span>}
        {m.vulnMs > 0 && <span className="status">Armour broken</span>}
        {m.dots.some((x) => x.kind === 'bleed') && <span className="status bad">Bleeding</span>}
        {poison > 0 && <span className="status poison">Poison ×{poison}</span>}
        {m.dots.some((x) => x.kind === 'ignite') && <span className="status fire">Ignited</span>}
      </div>
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
        const cd = c?.cooldowns[i] ?? 0;
        const cdPct = nums.cooldownMs ? cd / nums.cooldownMs : 0;
        const noMana = s.mana < nums.manaCost;
        const flashed = fx?.usedSlot?.slot === i ? fx.usedSlot.n : 0;
        return (
          <Tooltip key={i} content={<GemTip gem={gem} state={s} />}>
            <button
              className={`skill-btn ${noMana ? 'nomana' : ''} ${c?.queued === i ? 'queued' : ''} ${flashed ? (flashed % 2 ? 'used-a' : 'used-b') : ''}`}
              style={{ ['--cd' as string]: `${cdPct * 360}deg` }}
              disabled={!c}
              onClick={() => game.act((st) => queueSkill(st, i))}
            >
              <span className="slot-key">{SKILL_KEYS[i]}</span>
              <span className="skill-gem">
                <GemIcon def={def} size={38} dim={cd > 0 || noMana} />
                {cd > 0 && <span className="cd-sweep" />}
                {cd > 0 && <span className="cd-text">{(cd / 1000).toFixed(1)}</span>}
              </span>
              <span className="skill-name">{def.name}</span>
              <span className="skill-meta">
                {nums.manaCost > 0 ? <span style={{ color: 'var(--mana-2)' }}>{nums.manaCost} mana</span> : <span className="dim">free</span>}
              </span>
              <span className="skill-rule">{ruleText(gem.rule)}</span>
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
              <div className="flask-liquid" style={{ height: `${(f.charges / st.maxCharges) * 100}%` }} />
              {buff && <div className="flask-timer" style={{ width: `${(buff.remainingMs / buff.durationMs) * 100}%` }} />}
              <span className="flask-key">{i + 1}</span>
              {f.instill && <span className="flask-auto">AUTO</span>}
              <span className="flask-charges">
                {Math.floor(f.charges)}/{st.maxCharges}
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

/** Side-by-side numbers: how you match up against your current target. */
function Matchup({ s, d }: { s: GameState; d: Derived }) {
  const target = s.combat ? aliveMonsters(s.combat)[0] : undefined;
  if (!target) return <div className="dim">No enemy in sight.</div>;
  const hit = hitChance(d.accuracy, target.level);
  const evade = evadeChance(d.evasion, target.level);
  const perHit = mitigate(d, target.damage, target.dmgType);
  const slam = target.isBoss ? mitigate(d, target.damage * BOSS_SLAM_MULT, target.dmgType) : 0;
  const nova = target.isBoss ? mitigate(d, target.damage * BOSS_NOVA_MULT, target.novaType) : 0;
  const theirDps = (perHit * (1 - evade)) / (target.attackMs / 1000);
  const yourDefence = target.dmgType === 'phys' ? `${fmt(d.armour)} armour` : `${d.res[target.dmgType]}% resist`;
  return (
    <div className="matchup">
      <span />
      <span className="matchup-head">You</span>
      <span className="matchup-head">{target.name}</span>
      <StatRow
        label="Level"
        you={String(d.combatLevel)}
        them={String(target.level)}
        good={d.combatLevel >= target.level ? true : target.level - d.combatLevel > 3 ? false : null}
      />
      <StatRow label="Life" you={fmt(d.maxLife)} them={`${fmt(Math.max(0, target.life))} / ${fmt(target.maxLife)}`} />
      <StatRow label="Damage / sec" you={d.dps.toFixed(1)} them={theirDps.toFixed(1)} good={d.dps > theirDps * 1.5} />
      <StatRow label="Chance to hit" you={`${Math.round(hit * 100)}%`} them={`${Math.round((1 - evade) * 100)}%`} />
      <StatRow label="Their hit on you" you={yourDefence} them={`${fmt(perHit)} ${DMG_NAME[target.dmgType].toLowerCase()}`} good={perHit < d.maxLife * 0.1} />
      <StatRow label="Their resistances" you="" them={`${target.res.fire}/${target.res.cold}/${target.res.light}% F/C/L`} />
      <StatRow label="Attack interval" you={`${(1 / d.attacksPerSec).toFixed(2)}s`} them={`${(target.attackMs / 1000).toFixed(2)}s`} />
      {target.isBoss && (
        <div className="matchup-note">
          <b>Heavy blow:</b> winds up for {(BOSS_SLAM_CAST_MS / 1000).toFixed(1)}s, then hits for about{' '}
          <b className={slam >= s.life ? 'bad' : ''}>{fmt(slam)}</b>. Evasion Rating can't dodge it — use a guard skill, War Cry or a flask.
        </div>
      )}
      {target.isBoss && target.mechanics.includes('nova') && (
        <div className="matchup-note">
          <b>Nova:</b> a {DMG_NAME[target.novaType].toLowerCase()} blast for about{' '}
          <b className={nova >= s.life ? 'bad' : ''}>{fmt(nova)}</b>. Blocks don't stop it — resistances, shields, evades or an interrupt do.
        </div>
      )}
      {target.isBoss &&
        target.mechanics
          .filter((k) => k !== 'slam' && k !== 'nova')
          .map((k) => (
            <div key={k} className="matchup-note">
              <b>{MECHANIC_INFO[k].name}:</b> {MECHANIC_INFO[k].tip}
            </div>
          ))}
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
            icon={<Icon name="map" size={36} color="var(--accent)" />}
            title="Pick an area in the Campaign"
            action={
              <button className="btn primary" data-tut="open-campaign" onClick={() => go('campaign')}>
                Open Campaign
              </button>
            }
          >
            Max Life {fmt(d.maxLife)} · {d.dps.toFixed(1)} DPS · {fmt(d.armour)} Armour · {fmt(d.evasion)} Evasion
          </EmptyState>
        </div>
        <div className="card">
          <div className="card-title">Skill bar</div>
          <SkillBar s={s} d={d} fx={fx} />
        </div>
      </div>
    );
  }

  const zone = zoneDef(c.zoneId);
  const alive = aliveMonsters(c);
  const zoneArt = artUrl(`zones/${zone.id}`);
  return (
    <div className="page">
      <PageHeader
        title={zone.name}
        kicker="Fighting"
        actions={
          <>
            <button className="btn" onClick={() => go('campaign')}>
              Change area
            </button>
            <button className="btn danger" onClick={() => game.act((st) => retreat(st))}>
              Retreat to Hideout
            </button>
          </>
        }
      >
        Area level {zone.levelRange[0]}–{zone.levelRange[1]} · {s.zoneKills[zone.id] ?? 0}/{zone.bossEvery} until {zone.boss.name}
      </PageHeader>

      <div className={`card arena2 ${zoneArt ? 'has-art' : ''}`} style={{ ['--zone' as string]: zone.color, ['--zone-art' as string]: zoneArt ? `url(${zoneArt})` : undefined }}>
        <PlayerCard s={s} d={d} fx={fx} />
        <div className="vs">vs</div>
        <div className={`pack pack-${Math.max(1, c.monsters.length)}`}>
          {c.monsters.length === 0 && <div className="fighter searching">Searching for monsters…</div>}
          {c.monsters.map((m) =>
            m.life > 0 ? (
              <MonsterCard key={m.uid} m={m} target={m === alive[0]} fx={fx} />
            ) : (
              <div key={m.uid} className="fighter dead">
                ✕ {m.name}
              </div>
            ),
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          Skills
          <span className="grow" />
          <button className="btn sm ghost" onClick={() => go('skills')}>
            Edit skills & rules
          </button>
        </div>
        <SkillBar s={s} d={d} fx={fx} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">
            Flasks
            <span className="grow" />
            <span className="card-hint">
              keys 1–5 · refill on kills
            </span>
          </div>
          <FlaskBelt s={s} />
        </div>
        <div className="card">
          <div className="card-title">Matchup</div>
          <Matchup s={s} d={d} />
        </div>
      </div>
    </div>
  );
}
