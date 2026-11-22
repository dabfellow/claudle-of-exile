import { useState, type ReactNode } from 'react';
import {
  ALCHEMY_CATEGORIES, INFUSION_BREW_HERBS, INFUSIONS, MAX_INFUSION_RANK,
  alchemyCategory, infusionDef, type AlchemyCategory,
} from '../../data/alchemy';
import { actionDef, actionsFor } from '../../data/skills';
import {
  brewsForNextRank, flaskInfusionSlots, herbStockForSource, infusionRank,
  infusionStrength, infusionUnlocked, pourVial, queueInfusion,
  removeQueuedInfusion, sourceFitsInfusion,
} from '../../engine/alchemy';
import { flaskName } from '../../engine/flasks';
import { strainLabel } from '../../engine/foraging';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { fmtTime, ProgressBar, Tabs } from './common';
import { SkillMinigame } from './SkillMinigame';
import './alchemy-bench.css';

const tabs = [
  { id: 'belt', label: 'Belt' },
  { id: 'infusions', label: 'Infusions' },
  { id: 'queue', label: 'Queue' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'masterworks', label: 'Masterworks' },
] as const;
type AlchemyTab = (typeof tabs)[number]['id'];

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

function BeltTab({ s, notify }: { s: GameState; notify: (msg: string) => void }) {
  const [selectedBelt, setSelectedBelt] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const flask = s.flaskSlots[selectedBelt];
  const maxSlots = flask ? flaskInfusionSlots(flask) : 0;

  return <div className="alchemy-bench">
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

    <div className="alchemy-grid">
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
          {!s.alchemy.vials.length ? <p className="muted small">No ready vials yet. Queue infusions in the Infusions tab.</p> : (
            <div style={{ display: 'grid', gap: 6 }}>
              {s.alchemy.vials.map((v, idx) => (
                <div key={v.id} className="row small">
                  <span><b>{infusionDef(v.infusion)?.name ?? v.infusion}</b> ×{v.strength.toFixed(2)} · {strainLabel(v.strain)}</span>
                  <span className="spacer" />
                  <button className="btn sm primary" onClick={() => notify(game.act((st) => pourVial(st, selectedBelt, selectedSlot, idx)) ?? 'Infusion poured!')}>Pour</button>
                </div>
              ))}
            </div>
          )}
        </>}
      </section>
      <section className="card">
        <h3>Pour to the line</h3>
        <SkillMinigame skill="alchemy" />
      </section>
    </div>
  </div>;
}

function InfusionsTab({ s, notify }: { s: GameState; notify: (msg: string) => void }) {
  const [sources, setSources] = useState<Record<string, string>>({});
  const strainList = Object.keys(s.foraging.strainHerbs).filter((k) => (s.foraging.strainHerbs[k] ?? 0) > 0);

  return <section className="card">
    <h3>Infusion book</h3>
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

        return <div key={inf.id} className="alchemy-card">
          <div className="row">
            <b>{inf.name}</b>
            <span className="spacer" />
            <span className="small muted">Rank {rec.rank}/{MAX_INFUSION_RANK}</span>
          </div>
          <p className="small muted">{inf.effect}</p>
          <p className="small muted">
            {inf.rareMutation ? `Giga-rare (${inf.rareMutation})` : `Lv ${inf.level}`}
            {inf.grandOnly ? ' · Grand flask only' : ''}
            {need > 0 ? ` · ${rec.brews}/${need} brews to Rank ${rec.rank + 1}` : ' · Max rank'}
          </p>
          {unlocked && validSources.length > 0 && <>
            <label className="small">Herb source
              <select value={chosen} onChange={(e) => setSources((prev) => ({ ...prev, [inf.id]: e.target.value }))}>
                {validSources.map((src) => <option key={src} value={src}>{strainLabel(src)} ({herbStockForSource(s, src)} owned)</option>)}
              </select>
            </label>
            <button className="btn sm primary" onClick={() => {
              const err = game.act((st) => queueInfusion(st, inf.id, chosen));
              notify(err ?? `Queued ${inf.name} (×${previewStr.toFixed(2)}, ${stock}/${INFUSION_BREW_HERBS} herbs)`);
            }}>Queue brew ({INFUSION_BREW_HERBS} herbs)</button>
          </>}
          {!unlocked && <span className="small muted">{inf.rareMutation ? `Brew with a ${inf.rareMutation} strain to unlock` : `Unlocks at Alchemy Lv ${inf.level}`}</span>}
        </div>;
      })}
    </div>
  </section>;
}

function QueueTab({ s, notify }: { s: GameState; notify: (msg: string) => void }) {
  const brewAction = actionDef('brew_infusion');
  const d = deriveStats(s);
  const running = s.action?.kind === 'skill' && s.action.actionId === 'brew_infusion' ? s.action : null;
  const blocker = actionBlocker(s, brewAction);

  return <section className="card">
    <div className="row">
      <h3>Brew queue ({s.alchemy.queue.length})</h3>
      <span className="spacer" />
      {running
        ? <button className="btn sm" onClick={() => game.act(stopAction)}>Stop brewing</button>
        : <button className="btn sm primary" disabled={!!blocker} onClick={() => notify(game.act((st, ctx) => startSkillAction(st, ctx, 'brew_infusion')) ?? '')}>{blocker ?? 'Start queue'}</button>}
    </div>
    {running && <ProgressBar value={running.progress / actionIntervalMs(s, brewAction, d)} />}
    {!s.alchemy.queue.length ? <p className="muted small">Queue is empty. Add infusions from the Infusions tab.</p> : (
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        {s.alchemy.queue.map((item, idx) => (
          <div key={idx} className="row small">
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

  return <section className="card">
    <div className="row">
      <h3>Recipes</h3>
      <span className="spacer" />
      <select value={cat} onChange={(e) => setCat(e.target.value as AlchemyCategory)}>
        {ALCHEMY_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    </div>
    <div className="alchemy-grid" style={{ marginTop: 8 }}>
      {list.map((a) => {
        const active = running?.actionId === a.id;
        const blocker = actionBlocker(s, a);
        return <div key={a.id} className="alchemy-card">
          <div className="row"><b>{a.name}</b><span className="spacer" /><span className="small muted">Lv {a.level}</span></div>
          <p className="small muted">{fmtTime(actionIntervalMs(s, a, d))} · {a.xp} XP{a.grandFlask ? ' · +10 Flawless bars' : ''}</p>
          {active && <ProgressBar value={running.progress / actionIntervalMs(s, a, d)} />}
          <button className={`btn sm ${active ? '' : 'primary'}`} disabled={!active && (a.level > level || !!blocker)} onClick={() => {
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

  return <section className="alchemy-bench">
    <AwayVials />
    <Tabs tabs={[...tabs]} value={tab} onChange={(next) => { setTab(next); setNotice(''); }} />
    {tab === 'belt' && <BeltTab s={s} notify={setNotice} />}
    {tab === 'infusions' && <InfusionsTab s={s} notify={setNotice} />}
    {tab === 'queue' && <QueueTab s={s} notify={setNotice} />}
    {tab === 'recipes' && <RecipesTab s={s} notify={setNotice} />}
    {tab === 'masterworks' && masterworks}
    {notice && <p role="status" className="muted small">{notice}</p>}
  </section>;
}
