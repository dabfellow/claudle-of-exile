import { useCallback, useState } from 'react';
import { flaskDef } from '../../data/flasks';
import { materialDef } from '../../data/materials';
import { BOSS_SLAM_CAST_MS, ZONES, zoneDef } from '../../data/zones';
import { bossIsNext, retreat, startCombat, useFlask } from '../../engine/combat';
import { itemName } from '../../engine/items';
import { deriveStats } from '../../engine/stats';
import type { DamageType, GameEvent, Item } from '../../engine/types';
import { game, useGame, useGameEvent } from '../../game';
import { fmt, MatIcon, ProgressBar, Tooltip } from '../components/common';
import { Icon } from '../components/Icon';
import { ItemIcon, ItemTip } from '../components/ItemView';

interface LootLine {
  id: number;
  item?: Item;
  currencyId?: string;
  salvaged?: boolean;
}

// kept at module level so the log survives page switches
let lootLog: LootLine[] = [];
let combatLog: { id: number; text: string; cls: string }[] = [];
let nextId = 1;
game.onGameEvent((e) => {
  if (e.t === 'loot' && (e.item || e.currencyId) && game.state.combat) {
    lootLog = [{ id: nextId++, item: e.item, currencyId: e.currencyId, salvaged: e.salvaged }, ...lootLog].slice(0, 30);
  } else if (e.t === 'kill') {
    combatLog = [{ id: nextId++, text: `Slew ${e.name}`, cls: e.boss ? 'good' : '' }, ...combatLog].slice(0, 12);
  } else if (e.t === 'spawn' && e.boss) {
    combatLog = [{ id: nextId++, text: `${e.name} appears!`, cls: 'warn' }, ...combatLog].slice(0, 12);
  } else if (e.t === 'flask') {
    combatLog = [{ id: nextId++, text: `${e.auto ? 'Auto-used' : 'Drank'} ${flaskDef(e.flaskId).name}`, cls: 'dim' }, ...combatLog].slice(0, 12);
  } else if (e.t === 'death') {
    combatLog = [{ id: nextId++, text: 'You were slain', cls: 'bad' }, ...combatLog].slice(0, 12);
  }
});

interface Floater {
  id: number;
  text: string;
  cls: string;
  x: number;
  color: string;
}

const DMG_COLOR: Record<DamageType, string> = {
  phys: 'var(--phys)',
  fire: 'var(--fire)',
  cold: 'var(--cold)',
  light: 'var(--light)',
};

function useFloaters() {
  const [list, setList] = useState<Floater[]>([]);
  const add = useCallback((f: Omit<Floater, 'id' | 'x'>) => {
    const id = nextId++;
    const x = 30 + Math.random() * 40;
    setList((l) => [...l.slice(-8), { ...f, id, x }]);
    setTimeout(() => setList((l) => l.filter((y) => y.id !== id)), 950);
  }, []);
  return [list, add] as const;
}

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

function FlaskBelt() {
  const s = useGame();
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
        const def = flaskDef(f.flaskId);
        const buff = s.combat?.buffs.find((b) => b.flaskId === f.flaskId);
        const ready = f.charges >= def.chargesPerUse;
        return (
          <Tooltip
            key={i}
            content={
              <div className="tip">
                <div className="tip-title">{def.name}</div>
                <div className="muted">{def.desc}</div>
                <div style={{ marginTop: 4 }}>
                  {Math.floor(f.charges)}/{def.maxCharges} charges · uses {def.chargesPerUse}
                </div>
                {f.instill && <div style={{ color: '#ffb36b' }}>Instilled: auto-use ({f.instill})</div>}
              </div>
            }
          >
            <button
              data-tut={`flask-${i}`}
              className={`flask ${ready && inCombat ? 'ready' : ''} ${buff ? 'active' : ''}`}
              style={{ ['--flask' as string]: def.color }}
              disabled={!inCombat || !ready}
              onClick={() => game.act((st, ctx) => useFlask(st, ctx, i))}
            >
              <div className="flask-liquid" style={{ height: `${(f.charges / def.maxCharges) * 100}%` }} />
              {buff && <div className="flask-timer" style={{ width: `${(buff.remainingMs / def.durationMs) * 100}%` }} />}
              <span className="flask-key">{i + 1}</span>
              {f.instill && <span className="flask-auto">AUTO</span>}
              <span className="flask-charges">
                {Math.floor(f.charges)}/{def.maxCharges}
              </span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

function Arena() {
  const s = useGame();
  const c = s.combat!;
  const d = deriveStats(s);
  const mon = c.monster;
  const zone = zoneDef(c.zoneId);
  const [pFloat, addP] = useFloaters();
  const [mFloat, addM] = useFloaters();
  const [shakeKey, setShake] = useState(0);
  const [critKey, setCrit] = useState(0);
  const [hurtKey, setHurt] = useState(0);

  const onEvent = useCallback(
    (e: GameEvent) => {
      if (e.t !== 'hit') return;
      if (e.target === 'monster') {
        if (e.evaded) addM({ text: 'miss', cls: 'miss', color: '' });
        else {
          addM({ text: fmt(e.amount), cls: e.crit ? 'crit' : '', color: e.crit ? '' : DMG_COLOR[e.dmgType] });
          setShake((k) => k + 1);
          if (e.crit) setCrit((k) => k + 1);
        }
      } else if (e.evaded) addP({ text: 'evade', cls: 'miss', color: '' });
      else {
        addP({ text: `-${fmt(e.amount)}`, cls: '', color: e.dmgType === 'phys' ? 'var(--life-2)' : DMG_COLOR[e.dmgType] });
        setHurt((k) => k + 1);
      }
    },
    [addM, addP],
  );
  useGameEvent(onEvent);

  const playerInterval = 1000 / d.attacksPerSec;

  return (
    <div className="card arena" style={{ ['--zone' as string]: zone.color }}>
      <div className={`fighter ${hurtKey ? (hurtKey % 2 ? 'shake-a' : 'shake-b') : ''}`}>
        <Floaters list={pFloat} />
        <div className="fighter-head">
          <div className="portrait">
            <Icon name="combat" size={28} color="var(--accent-2)" />
          </div>
          <div>
            <div className="fighter-name">{s.character.name}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              Level {d.combatLevel} · {d.dps.toFixed(1)} DPS
            </div>
          </div>
        </div>
        <ProgressBar value={s.life / d.maxLife} size="lg" color="linear-gradient(90deg, var(--life), var(--life-2))" label={`${fmt(s.life)} / ${fmt(d.maxLife)}`} ghost />
        <ProgressBar value={d.maxMana ? s.mana / d.maxMana : 0} color="linear-gradient(90deg, var(--mana), var(--mana-2))" label={`${fmt(s.mana)} / ${fmt(d.maxMana)}`} />
        <ProgressBar value={mon ? c.attackTimer / playerInterval : 0} color="var(--accent)" />
        <div className="buffs">
          {c.buffs
            .filter((b) => flaskDef(b.flaskId).kind === 'utility')
            .map((b) => (
              <span key={b.flaskId} className="buff" style={{ ['--flask' as string]: flaskDef(b.flaskId).color }}>
                {flaskDef(b.flaskId).name.replace(' Flask', '')} {(b.remainingMs / 1000).toFixed(1)}s
              </span>
            ))}
        </div>
      </div>

      <div className="vs">vs</div>

      {mon ? (
        <div
          className={`fighter ${mon.isBoss ? 'boss' : ''} ${shakeKey ? (shakeKey % 2 ? 'shake-a' : 'shake-b') : ''} ${critKey ? (critKey % 2 ? 'crit-a' : 'crit-b') : ''}`}
        >
          <Floaters list={mFloat} />
          <div className="fighter-head">
            <div className="portrait" style={{ borderColor: mon.isBoss ? 'var(--life)' : undefined }}>
              <Icon name="skull" size={28} color={mon.isBoss ? 'var(--life-2)' : DMG_COLOR[mon.dmgType]} />
            </div>
            <div>
              <div className="fighter-name">{mon.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {mon.isBoss ? 'Boss · ' : ''}Level {mon.level} · {mon.dmgType === 'phys' ? 'Physical' : mon.dmgType === 'light' ? 'Lightning' : mon.dmgType[0].toUpperCase() + mon.dmgType.slice(1)}
              </div>
            </div>
          </div>
          <ProgressBar value={mon.life / mon.maxLife} size="lg" color="linear-gradient(90deg, #8e2a22, #d4473b)" label={`${fmt(Math.max(0, mon.life))} / ${fmt(mon.maxLife)}`} ghost />
          {mon.casting >= 0 ? (
            <>
              <ProgressBar className="cast-bar" value={1 - mon.casting / BOSS_SLAM_CAST_MS} />
              <div className="cast-warning">⚠ Winding up a heavy blow — drink a flask!</div>
            </>
          ) : (
            <ProgressBar value={mon.attackTimer / mon.attackMs} color="#7a5a5a" />
          )}
        </div>
      ) : (
        <div className="fighter" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <span className="muted">Searching for monsters…</span>
        </div>
      )}
    </div>
  );
}

export function CombatPage() {
  const s = useGame();
  const d = deriveStats(s);
  const c = s.combat;

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Combat</h1>
          <p>Fights run on their own. Drink flasks (keys 1–5) to survive bosses and clear faster.</p>
        </div>
        {c && (
          <button className="btn danger" onClick={() => game.act((st) => retreat(st))}>
            Retreat to Hideout
          </button>
        )}
      </div>

      <div className="zone-list">
        {ZONES.map((z) => {
          const unlocked = s.unlockedZones.includes(z.id);
          const current = c?.zoneId === z.id;
          const kills = s.zoneKills[z.id] ?? 0;
          return (
            <button
              key={z.id}
              data-tut={`zone-${z.id}`}
              className={`zone ${current ? 'current' : ''}`}
              style={{ ['--zone' as string]: z.color }}
              disabled={!unlocked}
              onClick={() => !current && game.act((st, ctx) => startCombat(st, ctx, z.id))}
            >
              <div className="row">
                <span className="zone-name">{z.name}</span>
                <span className="spacer" />
                <span className="nav-badge">
                  {z.levelRange[0]}–{z.levelRange[1]}
                </span>
              </div>
              <div className="muted" style={{ fontSize: 11.5, margin: '4px 0 8px' }}>
                {unlocked ? z.desc : `Defeat the previous zone's boss to unlock`}
              </div>
              {unlocked && (
                <>
                  <ProgressBar value={Math.min(1, kills / z.bossEvery)} color={bossIsNext(s, z.id) ? 'var(--life-2)' : z.color} />
                  <div className="dim" style={{ fontSize: 10.5, marginTop: 4 }}>
                    {bossIsNext(s, z.id) ? `Boss: ${z.boss.name}` : `${kills}/${z.bossEvery} until ${z.boss.name}`}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {c ? (
        <>
          <Arena />
          <div className="card">
            <div className="card-title">
              Flasks
              <span className="grow" />
              <span className="muted" style={{ fontFamily: 'var(--font)', fontSize: 12 }}>
                Charges refill on kills · {d.flaskCharges > 0 ? `+${d.flaskCharges}% charges` : 'press 1–5'}
              </span>
            </div>
            <FlaskBelt />
          </div>
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Icon name="map" size={40} color="var(--accent)" />
          <h2 style={{ marginTop: 10 }}>Choose a zone</h2>
          <p className="muted">
            Max Life {fmt(d.maxLife)} · {d.dps.toFixed(1)} DPS · {fmt(d.armour)} Armour · {fmt(d.evasion)} Evasion
          </p>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="card">
          <div className="card-title">Loot</div>
          <div className="loot-list">
            {lootLog.length === 0 && <span className="dim">Nothing yet.</span>}
            {lootLog.map((l) =>
              l.item ? (
                <Tooltip key={l.id} content={<ItemTip item={l.item} state={s} />}>
                  <div className={`loot-row rar-${l.item.rarity} ${l.item.rarity}`} style={{ opacity: l.salvaged ? 0.5 : 1 }}>
                    <ItemIcon item={l.item} size={16} />
                    <span style={{ color: 'var(--rar)' }}>{itemName(l.item)}</span>
                    {l.salvaged && <span className="dim">(salvaged)</span>}
                  </div>
                </Tooltip>
              ) : (
                <div key={l.id} className="loot-row">
                  <MatIcon id={l.currencyId!} size={14} />
                  <span style={{ color: 'var(--currency)' }}>{materialDef(l.currencyId!).name}</span>
                </div>
              ),
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Combat Log</div>
          <div className="combat-log">
            {combatLog.map((l) => (
              <div key={l.id} className={l.cls}>
                {l.text}
              </div>
            ))}
          </div>
          <div className="row wrap" style={{ marginTop: 12, gap: 14, fontSize: 12 }}>
            <span className="muted">
              Kills <b className="num">{fmt(s.lifetime.kills)}</b>
            </span>
            <span className="muted">
              Bosses <b className="num">{s.lifetime.bossKills}</b>
            </span>
            <span className="muted">
              Deaths <b className="num">{s.lifetime.deaths}</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
