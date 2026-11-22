import { useEffect, useState, type CSSProperties } from 'react';
import {
  DELVE_HAZARDS, DELVE_INSTALLATIONS, DELVE_PICKS, DELVE_SECURITY, DELVE_TRAITS, WORLDROOT_DEPTH,
  delveBand, type DelveHazard, type DelveMode,
} from '../../data/delve';
import { materialDef } from '../../data/materials';
import { actionDef } from '../../data/skills';
import {
  braceDelve, buildDelveInstallation, craftDelveSupports, delveDepthCap, delveGasPaused, delveHazardChance,
  delveInstallationBlocker, delveInstallationCost, delvePickBlocker, delvePickCost, delvePushBlocker,
  delvePushCost, delveTraitsAt, installationReach, isDelveAction, rubblePerSupport, setDelveAutoBrace,
  startDelve, upgradeDelvePick, type DelveState,
} from '../../engine/delve';
import { doubleReady, focusMult, focusOf, type SwingResult } from '../../engine/minigame';
import { actionIntervalMs, skillLevel, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { fmt, fmtTime, MatIcon, ProgressBar, Tabs } from './common';
import './delve.css';

const TABS = [{ id: 'shaft', label: 'Shaft' }, { id: 'log', label: 'Shaft log' }] as const;
const BRACE_LABEL: Record<SwingResult, string> = { double: 'Double!', hit: 'Hit', weak: 'Weak', miss: 'Miss' };

function Costs({ s, cost }: { s: GameState; cost: Record<string, number> }) {
  return <ul className="delve-costs">
    {Object.entries(cost).map(([id, quantity]) => (
      <li key={id} className={(s.storage.bank[id] ?? 0) < quantity ? 'delve-short' : undefined}>
        <MatIcon id={id} /> {fmt(quantity)} {materialDef(id).name}
      </li>
    ))}
  </ul>;
}

function ShaftRows({ delve, layer, select, limit = delve.deepest }: {
  delve: DelveState; layer: number; select?: (layer: number) => void; limit?: number;
}) {
  return <div className="delve-shaft" aria-label="Mine shaft">
    {Array.from({ length: 9 }, (_, index) => Math.max(1, layer - 4) + index).map((depth) => {
      const reached = depth <= limit;
      const band = delveBand(depth);
      const data = reached ? delve.layers[depth] : undefined;
      const traits = DELVE_TRAITS.filter((trait) => data?.traits.includes(trait.id));
      const installations = reached ? delve.installations.filter((i) => i.layer === depth) : [];
      const last = depth === limit;
      const selected = depth === layer;
      const classes = [
        'delve-layer', reached ? '' : 'unreached', selected ? 'selected' : '', last ? 'dig-face' : '',
        traits.some((t) => t.id === 'motherlode') ? 'motherlode' : '',
      ].join(' ');
      const contents = <>
        <span className="delve-depth num">{fmt(depth)}</span>
        <span className="delve-layer-name">{reached ? depth === WORLDROOT_DEPTH ? 'Worldroot Chamber' : band.name : 'Unreached'}</span>
        <span className="delve-marks">
          {traits.map((trait) => (
            <span className="delve-mark" key={trait.id} title={trait.name} role="img" aria-label={trait.name}>{trait.icon}</span>
          ))}
          {installations.map((installation) => {
            const def = Object.values(DELVE_INSTALLATIONS).find((i) => i.id === installation.type)!;
            return <span className="delve-mark station" key={installation.type} title={def.name} role="img" aria-label={def.name}>{def.icon}</span>;
          })}
        </span>
        {last && <span className="delve-face-label">Dig face</span>}
        {data && <span className="delve-seam-security" style={{ width: (data.secure / DELVE_SECURITY) * 100 + '%' }} />}
      </>;
      const style = { '--stratum': band.color } as CSSProperties;
      return select ? (
        <button
          className={classes} key={depth} style={style} disabled={!reached} aria-pressed={selected}
          onClick={() => select(depth)}
        >{contents}</button>
      ) : <div className={classes} key={depth} style={style}>{contents}</div>;
    })}
  </div>;
}

function BraceCard({ s }: { s: GameState }) {
  const warning = s.delve.warning;
  const running = s.action?.kind === 'skill' && isDelveAction(s.action.actionId);
  const valid = !!warning && running && s.action?.kind === 'skill' && s.action.actionId === warning.action;
  const remaining = valid ? Math.max(0, warning.timerMs - (s.clock - warning.startsAt)) : 0;
  const result = s.delve.lastBrace;
  return (
    <div className="delve-brace">
      <div className="delve-brace-heading">
        <strong>{valid ? DELVE_INSTALLATIONS[warning.hazard].icon + ' ' + DELVE_INSTALLATIONS[warning.hazard].warning : 'Brace the shaft'}</strong>
        {result && result.at + 5000 >= s.clock && <span className={'delve-brace-result ' + result.result} role="status">{BRACE_LABEL[result.result]}</span>}
        {valid && <span className="num">{(remaining / 1000).toFixed(1)}s</span>}
      </div>
      {valid ? <>
        <ProgressBar value={remaining / warning.timerMs} color="var(--accent)" />
        <div className="delve-buttons">
          {DELVE_HAZARDS.map((hazard) => (
            <button className="btn" key={hazard} onClick={() => game.act((st, ctx) => { braceDelve(st, ctx, hazard); })}>
              {DELVE_INSTALLATIONS[hazard].fix}
            </button>
          ))}
        </div>
      </> : <p className="muted small">{running ? 'Creaking needs a prop, dripping needs a pump, and a hiss needs a vent.' : 'Start working or pushing to watch for warnings.'}</p>}
      {running && <div className="delve-focus">
        <span>Focus</span><ProgressBar value={focusOf(s)} />
        <span className="num">+{Math.round((focusMult(s, 'mining') - 1) * 100)}% speed{doubleReady(s) ? ' · Double ready' : ''}</span>
      </div>}
    </div>
  );
}

function Installation({ s, hazard, layer }: { s: GameState; hazard: DelveHazard; layer: number }) {
  const def = DELVE_INSTALLATIONS[hazard];
  const here = s.delve.installations.find((i) => i.type === def.id && i.layer === layer);
  const blocker = delveInstallationBlocker(s, hazard, layer);
  return <div className="delve-upgrade">
    <div className="delve-upgrade-heading"><strong>{def.name}</strong><span className="muted small">{here ? 'Tier ' + here.tier + '/4' : 'Level ' + def.level}</span></div>
    <p className="muted small">
      {here ? `Protects layers ${fmt(layer)}–${fmt(layer + installationReach(here.tier))}.` : `Protects against ${hazard === 'gas' ? 'gas' : hazard + 's'} for the next 50 layers.`}
    </p>
    {here?.tier !== 4 && <div className="delve-upgrade-row">
      <Costs s={s} cost={delveInstallationCost(s.delve, hazard, layer)} />
      <button className="btn" disabled={!!blocker} title={blocker ?? undefined} onClick={() => game.act((st) => buildDelveInstallation(st, hazard, layer))}>
        {here ? 'Upgrade' : 'Build'}
      </button>
    </div>}
  </div>;
}

function DelveSupplies({ s, layer }: { s: GameState; layer: number }) {
  const delve = s.delve;
  const pick = DELVE_PICKS[delve.pickTier];
  const next = DELVE_PICKS[delve.pickTier + 1];
  const blocker = delvePickBlocker(s);
  return <aside className="card delve-supplies">
    <div className="card-title">Mine supplies</div>
    <div className="delve-supply-grid">
      <span><MatIcon id="mine_support" /> Supports <strong className="num">{fmt(s.storage.bank.mine_support ?? 0)}</strong></span>
      <span><MatIcon id="rubble" /> Rubble <strong className="num">{fmt(s.storage.bank.rubble ?? 0)}</strong></span>
    </div>
    <label className="delve-autobrace"><input type="checkbox" checked={delve.autoBrace} onChange={(e) => game.act((st) => setDelveAutoBrace(st, e.target.checked))} /> Auto-brace</label>
    <div className="delve-upgrade-row">
      <span className="muted small">{rubblePerSupport(delve)} rubble per support</span>
      <button className="btn" disabled={(s.storage.bank.rubble ?? 0) < rubblePerSupport(delve)} onClick={() => game.act((st) => { craftDelveSupports(st); })}>Make supports</button>
    </div>
    <div className="delve-upgrade">
      <div className="delve-upgrade-heading"><strong>{pick.name}</strong></div>
      <p className="muted small">{pick.perk}</p>
      {next && <>
        <p className="small">{next.name} at layer {next.layer}. {next.perk}.</p>
        <div className="delve-upgrade-row">
          <Costs s={s} cost={delvePickCost(delve.pickTier)} />
          <button className="btn" disabled={!!blocker} title={blocker ?? undefined} onClick={() => game.act(upgradeDelvePick)}>Forge pick</button>
        </div>
      </>}
    </div>
    <div className="card-title">Installations at layer {fmt(layer)}</div>
    {DELVE_HAZARDS.map((hazard) => <Installation key={hazard} s={s} hazard={hazard} layer={layer} />)}
  </aside>;
}

/** Inline in the Time Away summary and available later from the shaft log. */
export function DelveReplay() {
  const s = useGame();
  const events = s.delve.replay;
  const [shown, setShown] = useState(0);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (!events.length || shown >= events.length || reducedMotion) return;
    const timer = window.setTimeout(() => setShown(shown + 1), 400);
    return () => window.clearTimeout(timer);
  }, [events.length, reducedMotion, shown]);
  if (!events.length) return null;
  const count = reducedMotion ? events.length : shown;
  const event = events[Math.max(0, count - 1)];
  const start = events[0].fromDepth;
  const displayDepth = count ? event.layer : start;
  const reached = count ? event.revealedDepth : start;
  return <section className="delve-replay">
    <div className="delve-replay-heading">
      <h3>Descent replay</h3>
      <span className="num small">{count}/{events.length}</span>
      <button className="btn" onClick={() => game.act((st) => { st.delve.replay = []; setShown(0); })}>{count >= events.length ? 'Done' : 'Skip'}</button>
    </div>
    <div className="delve-replay-frame" key={displayDepth}>
      <ShaftRows delve={s.delve} layer={displayDepth} limit={reached} />
    </div>
    <p className="small" aria-live={count >= events.length ? 'polite' : 'off'}>{count > 0 ? event.text : `Returning to layer ${displayDepth}…`}</p>
  </section>;
}

export function DelveView() {
  const s = useGame();
  const delve = s.delve;
  const [tab, setTab] = useState<'shaft' | 'log'>('shaft');
  const [selected, select] = useState<number | null>(null);
  const [destination, setDestination] = useState('');
  const [showReplay, setShowReplay] = useState(false);
  const layer = Math.max(1, Math.min(selected ?? delve.deepest, delve.deepest));
  const atFace = layer === delve.deepest;
  const move = (next: number) => select(Math.max(1, Math.min(next, delve.deepest)));
  const traits = DELVE_TRAITS.filter((trait) => delve.layers[layer]?.traits.includes(trait.id));
  const nextLayer = delve.deepest + 1;
  const nextTraits = delve.pickTier >= 3 ? delveTraitsAt(delve, nextLayer) : null;
  const nextName = nextTraits ? DELVE_TRAITS.filter((trait) => nextTraits.includes(trait.id)).map((trait) => trait.name).join(', ') : null;
  const cap = delveDepthCap(skillLevel(s, 'mining'));
  const pushBlocker = delvePushBlocker(s);
  const current = s.action?.kind === 'skill' && isDelveAction(s.action.actionId) ? s.action : null;
  const pushing = current?.actionId === 'delve_push';
  const gas = current && delveGasPaused(s);
  const interval = current ? actionIntervalMs(s, actionDef(current.actionId), deriveStats(s)) : 1;
  const work = (mode: DelveMode) => {
    const blocker = game.act((st, ctx) => startDelve(st, ctx, mode, layer));
    if (mode === 'push' && blocker === null) select(null);
  };
  const secure = delve.layers[layer]?.secure ?? 0;
  return <section className="delve-view">
    <Tabs tabs={[...TABS]} value={tab} onChange={setTab} />
    {tab === 'shaft' ? <div className="delve-layout">
      <div className="card delve-main">
        <div className="delve-title">
          <div><h2>The Delve</h2><p className="muted small">Deepest layer {fmt(delve.deepest)}{Number.isFinite(cap) ? ` · Level limit ${fmt(cap)}` : ''}</p></div>
          <div className="delve-records small"><span>{fmt(delve.stats.caverns)} caverns</span><span>{fmt(delve.stats.motherlodes)} Motherlodes</span></div>
        </div>
        <div className="delve-elevator" aria-label="Elevator">
          <button className="btn" onClick={() => move(1)} disabled={layer === 1}>Top</button>
          <button className="btn" onClick={() => move(layer - 10)} disabled={layer === 1} aria-label="Up ten layers">⏫</button>
          <button className="btn" onClick={() => move(layer - 1)} disabled={layer === 1} aria-label="Up one layer">▲</button>
          <button className="btn" onClick={() => move(layer + 1)} disabled={atFace} aria-label="Down one layer">▼</button>
          <button className="btn" onClick={() => move(layer + 10)} disabled={atFace} aria-label="Down ten layers">⏬</button>
          <button className="btn" onClick={() => select(null)} disabled={atFace}>Dig face</button>
          <form onSubmit={(e) => { e.preventDefault(); move(Number(destination)); setDestination(''); }}>
            <input type="number" min={1} max={delve.deepest} aria-label="Go to layer" placeholder="Layer" value={destination} onChange={(e) => setDestination(e.target.value)} required />
            <button className="btn" type="submit">Go</button>
          </form>
        </div>
        <ShaftRows delve={delve} layer={layer} select={select} />
        <div className="delve-layer-detail">
          <div className="delve-upgrade-heading">
            <strong>Layer {fmt(layer)} · {delveBand(layer).name}</strong>
            <span className="muted small">{secure >= DELVE_SECURITY ? 'Secured · +10% ore' : `Security ${secure}/${DELVE_SECURITY}`}</span>
          </div>
          {traits.length > 0 && <ul className="delve-traits">{traits.map((trait) => <li className="small" key={trait.id}><strong>{trait.name}</strong> · {trait.hint}</li>)}</ul>}
          {(delve.layers[layer]?.floodedUntil ?? 0) > s.clock && <p className="delve-short small">Flooded for {fmtTime(delve.layers[layer].floodedUntil! - s.clock)}</p>}
          <div className="delve-buttons">
            <button className="btn primary" onClick={() => work('work')} disabled={!pushing && current?.delveLayer === layer}>Work this layer</button>
            {atFace && <button className="btn" onClick={() => work('push')} disabled={!!pushBlocker || pushing}>Push</button>}
            {current && <button className="btn" onClick={() => game.act(stopAction)}>Stop mining</button>}
          </div>
          {atFace && <p className="muted small">
            Layer {fmt(nextLayer)} costs {delvePushCost(nextLayer, delve.pickTier)} supports · {(100 * delveHazardChance(delve, nextLayer, 'push')).toFixed(1)}% hazard chance
            {nextName !== null ? ` · ${nextName || 'Plain rock'}` : ''}{pushBlocker ? ` · ${pushBlocker}` : ''}
          </p>}
          {current && <>
            <p className="small">
              {gas ? `Gas pause · Working layer ${delve.gasLayer} for ${fmtTime(delve.gasUntil! - s.clock)}` :
                pushing ? `Pushing to layer ${fmt(nextLayer)}` : `Working layer ${fmt(current.delveLayer ?? delve.deepest)}`}
            </p>
            <ProgressBar value={current.progress / interval} color={delveBand(layer).color} />
          </>}
        </div>
        <BraceCard s={s} />
      </div>
      <DelveSupplies s={s} layer={layer} />
    </div> : <div className="card delve-log">
      {delve.replay.length > 0 && !showReplay && <button className="btn" onClick={() => setShowReplay(true)}>Replay time away</button>}
      {showReplay && <DelveReplay />}
      {delve.log.length === 0 ? <p className="muted">Breakthroughs, hazards and cavern finds will appear here.</p> :
        <ol>{[...delve.log].reverse().map((event, index) => <li key={index}>{event}</li>)}</ol>}
    </div>}
    {delve.landmarkPending && <div className="modal-backdrop">
      <div className="card modal delve-landmark" role="dialog" aria-modal="true" aria-labelledby="delve-landmark-name">
        <p className="small">Layer {WORLDROOT_DEPTH}</p>
        <h2 id="delve-landmark-name">Worldroot Chamber</h2>
        <p>The shaft opens around an ancient root of glittering stone. The mine continues beneath it.</p>
        <button className="btn primary" onClick={() => game.act((st) => { st.delve.landmarkPending = false; select(WORLDROOT_DEPTH); })}>Enter the chamber</button>
      </div>
    </div>}
  </section>;
}
