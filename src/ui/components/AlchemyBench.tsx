import { useState, type ReactNode } from 'react';
import {
  ALCHEMY_CATEGORIES, INFUSION_BREW_HERBS, INFUSIONS, MAX_INFUSION_RANK,
  alchemyCategory, infusionDef, type AlchemyCategory,
} from '../../data/alchemy';
import { actionDef, actionsFor } from '../../data/skills';
import {
  GRAND_FLAWLESS_BARS, alchemyAccessHint, alchemyPreview, brewsForNextRank,
  flawlessBarStack, flaskInfusionSlots, herbStockForSource, infusionRank,
  infusionStrength, infusionUnlocked, pourVial, prependInfusion, queueInfusion,
  removeQueuedInfusion, sourceFitsInfusion,
} from '../../engine/alchemy';
import { flaskName } from '../../engine/flasks';
import { strainLabel } from '../../engine/foraging';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { Cost, EmptyState, fmtTime, GameIcon, MatIcon, ProgressBar, Tabs, type TabDef } from './common';
import { HelpTip, LockedBadge, SkillIntro } from './SkillHelp';
import { SkillMinigame } from './SkillMinigame';
import './alchemy-bench.css';

type AlchemyTab = 'belt' | 'infusions' | 'queue' | 'recipes' | 'masterworks';

export function AwayVials() {
  const s = useGame();
  const vials = s.alchemy.awayVials;
  const ranks = s.alchemy.awayRankUps;
  if (!vials.length && !ranks.length) return null;
  return <section className="away-alert" aria-label="Brewed infusions">
    <div className="row">
      <b>Alchemy bench · {vials.length} infusion{vials.length === 1 ? '' : 's'} brewed</b>
      <span className="spacer" />
      <button className="btn sm" onClick={() => game.act((st) => { st.alchemy.awayVials = []; st.alchemy.awayRankUps = []; })}>Clear</button>
    </div>
    {ranks.map((r, idx) => <p key={idx} className="small good">{infusionDef(r.infusion)?.name ?? r.infusion} reached Rank {r.rank}!</p>)}
    {vials.slice(0, 8).map((v) => (
      <div key={v.id} className="row small" style={{ marginTop: 4 }}>
        <span><b>{infusionDef(v.infusion)?.name ?? v.infusion}</b> · ×{v.strength.toFixed(2)} ({strainLabel(v.strain)})</span>
      </div>
    ))}
  </section>;
}

function BeltTab({ s, notify, onTab }: { s: GameState; notify: (msg: string) => void; onTab: (tab: AlchemyTab) => void }) {
  const [selectedBelt, setSelectedBelt] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const flask = s.flaskSlots[selectedBelt];
  const maxSlots = flask ? flaskInfusionSlots(flask) : 0;
  const isBeltNew = s.flaskSlots.every((f) => !f || !(f.infusions?.length)) && s.alchemy.vials.length === 0;

  return <div className="alchemy-bench">
    {isBeltNew ? (
      <SkillIntro
        step="Flask Belt"
        action={
          <>
            <button className="btn sm" onClick={() => onTab('recipes')}>Recipes</button>
            <button className="btn sm primary" onClick={() => onTab('infusions')}>Infusions</button>
          </>
        }
      >
        Brew new flasks in <b>Recipes</b>, or brew permanent herb <b>Infusions</b> to pour into your equipped belt flasks.
      </SkillIntro>
    ) : s.alchemy.vials.length > 0 ? (
      <SkillIntro step="Pour Vials">
        Select a flask on your belt, choose an infusion slot, and pour one of your ready vials below.
      </SkillIntro>
    ) : null}

    <section className="card">
      <h3>Your flask belt</h3>
      <div className="alchemy-belt-row">
        {s.flaskSlots.map((f, i) => (
          <button
            key={i}
            type="button"
            className={`alchemy-flask-card ${selectedBelt === i ? 'selected' : ''} ${f?.grand ? 'grand' : ''}`}
            onClick={() => { setSelectedBelt(i); setSelectedSlot(0); }}
          >
            <b>Slot {i + 1}: {f ? flaskName(f) : 'Empty'}</b>
            {f?.grand && <span className="small good">Grand Flask (3 slots)</span>}
            {f && Array.from({ length: flaskInfusionSlots(f) }, (_, idx) => {
              const inf = f.infusions?.[idx];
              return <div key={idx} className={`alchemy-slot ${inf ? 'filled' : ''}`}>
                <span>{inf ? `${infusionDef(inf.id)?.name ?? inf.id} (×${inf.strength.toFixed(2)})` : 'Empty infusion slot'}</span>
              </div>;
            })}
          </button>
        ))}
      </div>
    </section>

    <section className="card">
      <h3>Pour ready vials</h3>
      {!flask ? <p className="muted small">Equip a flask in Slot {selectedBelt + 1} to pour infusions into it.</p> : <>
        <div className="row" style={{ marginBottom: 8 }}>
          {Array.from({ length: maxSlots }, (_, idx) => (
            <button key={idx} className={`btn sm ${selectedSlot === idx ? 'primary' : ''}`} onClick={() => setSelectedSlot(idx)}>
              Slot {idx + 1}
            </button>
          ))}
        </div>
        {!s.alchemy.vials.length ? (
          <EmptyState
            small
            icon={<GameIcon name="alchemy" size={24} />}
            title="No ready vials yet"
            action={<button className="btn sm primary" onClick={() => onTab('infusions')}>Browse Infusions</button>}
          >
            Brew an infusion from 20 herbs in the Infusions tab, then pour the finished vial into a belt flask.
          </EmptyState>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {s.alchemy.vials.map((v, idx) => (
              <div key={v.id} className="row wrap small">
                <span><b>{infusionDef(v.infusion)?.name ?? v.infusion}</b> ×{v.strength.toFixed(2)} · {strainLabel(v.strain)}</span>
                <span className="spacer" />
                <button className="btn sm primary" onClick={() => notify(game.act((st) => pourVial(st, selectedBelt, selectedSlot, idx)) ?? 'Infusion poured!')}>Pour</button>
              </div>
            ))}
          </div>
        )}
      </>}
    </section>
  </div>;
}

function ActiveBrewBanner({ s }: { s: GameState }) {
  const running = s.action?.kind === 'skill' && s.action.actionId === 'brew_infusion' ? s.action : null;
  if (!running) return null;
  const brewAction = actionDef('brew_infusion');
  const d = deriveStats(s);
  const interval = actionIntervalMs(s, brewAction, d);
  const current = s.alchemy.queue[0];
  const currentName = current ? (infusionDef(current.infusion)?.name ?? current.infusion) : 'Infusion';
  return (
    <div className="alchemy-live-banner" role="status">
      <div className="row wrap">
        <span>
          Currently brewing: <b>{currentName}</b>
          {current && <span className="muted small"> · from {strainLabel(current.source)}</span>}
        </span>
        <span className="spacer" />
        <span className="small muted">{fmtTime(Math.max(0, interval - running.progress))} left</span>
        <button className="btn sm" onClick={() => game.act(stopAction)}>Stop</button>
      </div>
      <ProgressBar value={running.progress / interval} />
    </div>
  );
}

function InfusionsTab({ s, notify }: { s: GameState; notify: (msg: string) => void }) {
  const [sources, setSources] = useState<Record<string, string>>({});
  const strainList = Object.keys(s.foraging.strainHerbs).filter((k) => (s.foraging.strainHerbs[k] ?? 0) > 0);
  const brewAction = actionDef('brew_infusion');
  const d = deriveStats(s);
  const currentInterval = actionIntervalMs(s, brewAction, d);

  return <section className="card">
    <SkillIntro step="Infusions">
      Brew permanent flask upgrades from {INFUSION_BREW_HERBS} herbs ({fmtTime(currentInterval)} current · 10m base — Focus &amp; speed bonuses cut this). Pour finished vials into your flasks on the Belt tab.
    </SkillIntro>
    <ActiveBrewBanner s={s} />
    <div className="row wrap" style={{ marginBottom: 8 }}>
      <h3 style={{ margin: 0 }}>Infusion book</h3>
      <span className="spacer" />
      <span className="small muted">10m base — Focus &amp; speed bonuses cut this</span>
    </div>
    <div className="alchemy-grid">
      {INFUSIONS.map((inf) => {
        const unlocked = infusionUnlocked(s, inf.id);
        const rec = infusionRank(s, inf.id);
        const need = brewsForNextRank(rec.rank);
        const validSources = [
          ...(inf.rareMutation ? [] : [inf.herb]),
          ...strainList.filter((k) => sourceFitsInfusion(inf.id, k)),
        ];
        const chosen = sources[inf.id] && validSources.includes(sources[inf.id]) ? sources[inf.id] : (validSources[0] ?? inf.herb);
        const stock = herbStockForSource(s, chosen);
        const previewStr = infusionStrength(rec.rank, chosen);
        const canBrewNow = stock >= INFUSION_BREW_HERBS;

        return <div key={inf.id} className={`alchemy-card ${!unlocked ? 'locked' : ''}`}>
          <div className="alchemy-card-head">
            <b>{inf.name}</b>
            <span className="spacer" />
            {unlocked
              ? <span className="small muted">Rank {rec.rank}/{MAX_INFUSION_RANK}</span>
              : <LockedBadge level={inf.rareMutation ? undefined : inf.level} reason={inf.rareMutation ? `Unlock via ${inf.rareMutation} strain` : undefined} />}
          </div>
          <p className="small muted">{inf.effect}</p>
          <p className="small muted">
            {inf.rareMutation ? `Giga-rare (${inf.rareMutation})` : `Lv ${inf.level}`}
            {inf.grandOnly ? ' · Grand flask only' : ''}
            {need > 0 ? ` · ${rec.brews}/${need} brews to Rank ${rec.rank + 1}` : ' · Max rank'}
          </p>
          {unlocked && validSources.length > 0 && <>
            <label className="small">Herb source ({stock}/{INFUSION_BREW_HERBS} herbs)
              <select value={chosen} onChange={(e) => setSources((prev) => ({ ...prev, [inf.id]: e.target.value }))}>
                {validSources.map((src) => <option key={src} value={src}>{strainLabel(src)} ({herbStockForSource(s, src)} owned)</option>)}
              </select>
            </label>
            <div className="row wrap" style={{ gap: 6 }}>
              <button
                className="btn sm primary"
                disabled={!canBrewNow}
                title={!canBrewNow ? `Needs ${INFUSION_BREW_HERBS} herbs (have ${stock})` : `Brew ${inf.name} immediately`}
                onClick={() => {
                  const err = game.act((st, ctx) => {
                    const pErr = prependInfusion(st, inf.id, chosen);
                    if (pErr) return pErr;
                    const sErr = startSkillAction(st, ctx, 'brew_infusion');
                    if (sErr) {
                      st.alchemy.queue.shift();
                      return sErr;
                    }
                    return null;
                  });
                  notify(err ?? `Brewing ${inf.name} now (×${previewStr.toFixed(2)})`);
                }}
              >
                Brew now ({INFUSION_BREW_HERBS} herbs)
              </button>
              <button
                className="btn sm"
                onClick={() => {
                  const err = game.act((st) => queueInfusion(st, inf.id, chosen));
                  notify(err ?? `Queued ${inf.name} (×${previewStr.toFixed(2)}, ${stock}/${INFUSION_BREW_HERBS} herbs)`);
                }}
              >
                + Queue
              </button>
            </div>
          </>}
          {unlocked && validSources.length === 0 && (
            <span className="small muted">Needs a {inf.rareMutation} (or Prismatic) herb strain in stock to brew.</span>
          )}
          {!unlocked && <span className="small muted">{inf.rareMutation ? `Brew with a ${inf.rareMutation} strain to unlock` : `Unlocks at Alchemy Lv ${inf.level}`}</span>}
        </div>;
      })}
    </div>
  </section>;
}

function QueueTab({ s, notify, onTab }: { s: GameState; notify: (msg: string) => void; onTab: (tab: AlchemyTab) => void }) {
  const brewAction = actionDef('brew_infusion');
  const d = deriveStats(s);
  const running = s.action?.kind === 'skill' && s.action.actionId === 'brew_infusion' ? s.action : null;
  const blocker = actionBlocker(s, brewAction);

  return <section className="card">
    <SkillIntro step="Brew Queue">
      Queue multiple infusions to brew automatically in order (10m base — Focus &amp; speed bonuses cut this).
    </SkillIntro>
    <div className="row">
      <h3>Brew queue ({s.alchemy.queue.length})</h3>
      <span className="spacer" />
      {running
        ? <button className="btn sm" onClick={() => game.act(stopAction)}>Stop brewing</button>
        : <button className="btn sm primary" disabled={!!blocker} onClick={() => notify(game.act((st, ctx) => startSkillAction(st, ctx, 'brew_infusion')) ?? '')}>{blocker ?? 'Start queue'}</button>}
    </div>
    {running && <ProgressBar value={running.progress / actionIntervalMs(s, brewAction, d)} />}
    {!s.alchemy.queue.length ? (
      <EmptyState
        small
        icon={<GameIcon name="alchemy" size={24} />}
        title="Brew queue is empty"
        action={<button className="btn sm primary" onClick={() => onTab('infusions')}>Choose Infusions</button>}
      >
        Use <b>Brew now</b> in Infusions for an immediate brew, or <b>+ Queue</b> to batch several in a row.
      </EmptyState>
    ) : (
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        {s.alchemy.queue.map((item, idx) => (
          <div key={idx} className="row wrap small">
            <span>{idx + 1}. <b>{infusionDef(item.infusion)?.name ?? item.infusion}</b> from {strainLabel(item.source)} ({herbStockForSource(s, item.source)}/{INFUSION_BREW_HERBS})</span>
            <span className="spacer" />
            <button className="btn sm" onClick={() => game.act((st) => removeQueuedInfusion(st, idx))}>Remove</button>
          </div>
        ))}
      </div>
    )}
  </section>;
}

function RecipesTab({ s, notify }: { s: GameState; notify: (msg: string) => void }) {
  const [cat, setCat] = useState<AlchemyCategory>('life');
  const level = skillLevel(s, 'alchemy');
  const d = deriveStats(s);
  const list = actionsFor('alchemy').filter((a) => a.id !== 'brew_infusion' && !a.batchMastery && alchemyCategory(a) === cat);
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'alchemy' ? s.action : null;
  const flawlessStack = flawlessBarStack(s, GRAND_FLAWLESS_BARS);

  return <section className="card">
    <SkillIntro step="Recipes">
      Brew combat flasks, prepare reagents, or transmute Arcane Dust into crafting orbs.
    </SkillIntro>
    <div className="row wrap">
      <h3>Recipes</h3>
      <span className="spacer" />
      <select value={cat} onChange={(e) => setCat(e.target.value as AlchemyCategory)}>
        {ALCHEMY_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    </div>
    <div className="alchemy-grid" style={{ marginTop: 8 }}>
      {list.map((a) => {
        const active = running?.actionId === a.id;
        const locked = a.level > level;
        const stationHint = alchemyAccessHint(s, a);
        const blocker = actionBlocker(s, a);
        const previewLines = alchemyPreview(s, a);
        return <div key={a.id} className={`alchemy-card ${locked ? 'locked' : ''}`}>
          <div className="alchemy-card-head">
            <b>{a.name}</b>
            {previewLines.length > 0 && (
              <HelpTip tip={<>{previewLines.map((line, i) => <div key={i}>{line}</div>)}</>} />
            )}
            <span className="spacer" />
            {locked ? <LockedBadge level={a.level} /> : <span className="small muted">Lv {a.level}</span>}
          </div>
          {a.inputs && <Cost cost={a.inputs} have={s.storage.bank} />}
          {a.grandFlask && (
            <div className="io">
              <span className={`io-item ${flawlessStack ? '' : 'missing'}`} title="Any 10 Flawless metal bars">
                <MatIcon id={flawlessStack ?? 'copper_bar_flawless'} size={12} />
                <span className="num">{GRAND_FLAWLESS_BARS} Flawless Bars (any metal)</span>
              </span>
            </div>
          )}
          {stationHint && <span className="small warn">{stationHint}</span>}
          <p className="small muted">{fmtTime(actionIntervalMs(s, a, d))} · {a.xp} XP</p>
          {active && <ProgressBar value={running.progress / actionIntervalMs(s, a, d)} />}
          <button className={`btn sm ${active ? '' : 'primary'}`} disabled={!active && (locked || !!blocker)} onClick={() => {
            if (active) game.act(stopAction);
            else notify(game.act((st, ctx) => startSkillAction(st, ctx, a.id)) ?? '');
          }}>{active ? 'Stop' : blocker ?? 'Brew'}</button>
        </div>;
      })}
    </div>
  </section>;
}

export function AlchemyBench({ masterworks }: { masterworks: ReactNode }) {
  const s = useGame();
  const [tab, setTab] = useState<AlchemyTab>(() => s.professionProgress.activeProject?.project.skill === 'alchemy' ? 'masterworks' : 'belt');
  const [notice, setNotice] = useState('');

  const benchTabs: TabDef<AlchemyTab>[] = [
    { id: 'belt', label: 'Belt', count: s.alchemy.vials.length || undefined, hot: s.alchemy.vials.length > 0 },
    { id: 'infusions', label: 'Infusions' },
    { id: 'queue', label: 'Queue', count: s.alchemy.queue.length || undefined },
    { id: 'recipes', label: 'Recipes' },
    { id: 'masterworks', label: 'Masterworks' },
  ];

  return <section className="alchemy-bench">
    <AwayVials />
    <Tabs tabs={benchTabs} value={tab} onChange={(next) => { setTab(next); setNotice(''); }} />
    <SkillMinigame skill="alchemy" />
    {tab === 'belt' && <BeltTab s={s} notify={setNotice} onTab={setTab} />}
    {tab === 'infusions' && <InfusionsTab s={s} notify={setNotice} />}
    {tab === 'queue' && <QueueTab s={s} notify={setNotice} onTab={setTab} />}
    {tab === 'recipes' && <RecipesTab s={s} notify={setNotice} />}
    {tab === 'masterworks' && masterworks}
    {notice && <p role="status" className="muted small">{notice}</p>}
  </section>;
}
