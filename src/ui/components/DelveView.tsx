import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DELVE_HAZARDS, DELVE_INSTALLATIONS, DELVE_PICKS, DELVE_SECURITY, DELVE_TRAITS, WORLDROOT_DEPTH,
  delveBand, type DelveHazard, type DelveMode,
} from '../../data/delve';
import { materialDef } from '../../data/materials';
import { actionDef } from '../../data/skills';
import { recipeMaterialCount } from '../../engine/bank';
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
import { Badge, fmt, fmtTime, MatIcon, ProgressBar, Tabs, type TabDef } from './common';
import { HelpTip, LockedBadge, SkillIntro } from './SkillHelp';
import './delve.css';

type DelveTab = 'shaft' | 'log' | 'masterworks';

const BASE_TABS: TabDef<DelveTab>[] = [
  { id: 'shaft', label: 'Shaft' },
  { id: 'log', label: 'Mine Log' },
];

const BRACE_LABEL: Record<SwingResult, string> = { double: 'Double!', hit: 'Hit', weak: 'Weak', miss: 'Miss' };

const INSTALLATION_COUNTER: Record<DelveHazard, string> = {
  flood: 'Counters Floods (prevents work slowdowns) across 50+ layers below.',
  gas: 'Counters Gas pockets (prevents 10m fallback) across 50+ layers below.',
  'cave-in': 'Counters Cave-ins (prevents Support loss) across 50+ layers below.',
};

function Costs({ s, cost }: { s: GameState; cost: Record<string, number> }) {
  return (
    <ul className="delve-costs">
      {Object.entries(cost).map(([id, quantity]) => {
        const owned = recipeMaterialCount(s.storage.bank, id);
        return (
          <li key={id} className={owned < quantity ? 'delve-short' : undefined}>
            <MatIcon id={id} />{' '}
            <span className="num">
              {fmt(quantity)} {materialDef(id).name}
            </span>{' '}
            <span className="muted small num">({fmt(owned)} owned)</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Visible depth window: all reached layers up to the viewport, plus at most 2 unreached below the frontier by default. */
function shaftWindow(layer: number, limit: number, showDeeper: boolean): number[] {
  const extraUnreached = showDeeper ? 8 : 2;
  const maxDepth = limit + extraUnreached;
  let start: number;
  let end: number;
  if (limit <= 12) {
    start = 1;
    end = maxDepth;
  } else if (layer >= limit - 3) {
    end = maxDepth;
    start = Math.max(1, limit - 8);
  } else {
    start = Math.max(1, layer - 4);
    end = Math.min(maxDepth, start + 8);
  }
  return Array.from({ length: Math.max(1, end - start + 1) }, (_, index) => start + index);
}

function ShaftRows({
  delve,
  layer,
  select,
  limit = delve.deepest,
  activeLayer,
  showDeeper = false,
}: {
  delve: DelveState;
  layer: number;
  select?: (layer: number) => void;
  limit?: number;
  activeLayer?: number;
  showDeeper?: boolean;
}) {
  const depths = shaftWindow(layer, limit, showDeeper);
  return (
    <div className="delve-shaft" aria-label="Mine shaft">
      <div className="delve-shaft-head" aria-hidden="true">
        <span>Depth</span>
        <span>Stratum</span>
        <span>Traits &amp; Status</span>
      </div>
      {depths.map((depth) => {
        const reached = depth <= limit;
        const band = delveBand(depth);
        const data = reached ? delve.layers[depth] : undefined;
        const traits = DELVE_TRAITS.filter((trait) => data?.traits.includes(trait.id));
        const installations = reached ? delve.installations.filter((i) => i.layer === depth) : [];
        const last = depth === limit;
        const selected = depth === layer;
        const lantern = activeLayer === depth;
        const classes = [
          'delve-layer',
          reached ? '' : 'unreached',
          selected ? 'selected' : '',
          last ? 'dig-face' : '',
          lantern ? 'lantern' : '',
          traits.some((t) => t.id === 'motherlode') ? 'motherlode' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const contents = (
          <>
            <span className="delve-depth num">Depth L{fmt(depth)}</span>
            <span className="delve-layer-name">
              {reached
                ? depth === WORLDROOT_DEPTH
                  ? 'Worldroot Chamber'
                  : band.name
                : showDeeper
                  ? `Unreached · ${band.name} (Lv ${band.level}+)`
                  : 'Unreached'}
            </span>
            <span className="delve-marks">
              {traits.map((trait) => (
                <span className="delve-mark" key={trait.id} title={`${trait.name}: ${trait.hint}`} role="img" aria-label={trait.name}>
                  {trait.icon}
                </span>
              ))}
              {installations.map((installation) => {
                const def = Object.values(DELVE_INSTALLATIONS).find((i) => i.id === installation.type)!;
                return (
                  <span className="delve-mark station" key={installation.type} title={def.name} role="img" aria-label={def.name}>
                    {def.icon}
                  </span>
                );
              })}
            </span>
            <span className="delve-row-tags">
              {lantern && (
                <span className="delve-lantern-badge" title="Active dig layer">
                  <span className="delve-lantern-dot" aria-hidden="true" />
                  Active
                </span>
              )}
              {last && <span className="delve-face-label">Dig face</span>}
            </span>
            {data && <span className="delve-seam-security" style={{ width: (data.secure / DELVE_SECURITY) * 100 + '%' }} />}
          </>
        );
        const style = { '--stratum': band.color } as CSSProperties;
        return select ? (
          <button
            className={classes}
            key={depth}
            style={style}
            disabled={!reached}
            aria-pressed={selected}
            onClick={() => select(depth)}
          >
            {contents}
          </button>
        ) : (
          <div className={classes} key={depth} style={style}>
            {contents}
          </div>
        );
      })}
    </div>
  );
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
        <strong>
          {valid ? (
            DELVE_INSTALLATIONS[warning.hazard].icon + ' ' + DELVE_INSTALLATIONS[warning.hazard].warning
          ) : (
            <HelpTip
              label="Brace against Hazards"
              tip="Cave-ins, floods, or gas pockets that interrupt digging unless braced in Focus or lowered by Security & Installations."
            />
          )}
        </strong>
        {result && result.at + 5000 >= s.clock && (
          <span className={'delve-brace-result ' + result.result} role="status">
            {BRACE_LABEL[result.result]}
          </span>
        )}
        {valid && <span className="num">{(remaining / 1000).toFixed(1)}s</span>}
      </div>
      {valid ? (
        <>
          <ProgressBar value={remaining / warning.timerMs} color="var(--accent)" />
          <div className="delve-buttons">
            {DELVE_HAZARDS.map((hazard) => (
              <button className="btn" key={hazard} onClick={() => game.act((st, ctx) => { braceDelve(st, ctx, hazard); })}>
                {DELVE_INSTALLATIONS[hazard].fix}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="muted small">
          Cave-ins, floods, or gas pockets that interrupt digging unless braced in Focus or lowered by Security &amp; Installations.{' '}
          {running
            ? 'Match the cue: Creaking → Prop · Dripping → Pump · Hiss → Vent.'
            : 'Start working or pushing to watch for warnings.'}
        </p>
      )}
      {running && (
        <div className="delve-focus">
          <span>Focus</span>
          <ProgressBar value={focusOf(s)} />
          <span className="num">
            +{Math.round((focusMult(s, 'mining') - 1) * 100)}% speed{doubleReady(s) ? ' · Double ready' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

function Installation({ s, hazard, layer }: { s: GameState; hazard: DelveHazard; layer: number }) {
  const def = DELVE_INSTALLATIONS[hazard];
  const here = s.delve.installations.find((i) => i.type === def.id && i.layer === layer);
  const blocker = delveInstallationBlocker(s, hazard, layer);
  const levelLocked = skillLevel(s, 'mining') < def.level;
  const layerUnreached = !s.delve.layers[layer];
  return (
    <div className={`delve-upgrade ${levelLocked || layerUnreached ? 'locked' : ''}`}>
      <div className="delve-upgrade-heading">
        <strong>
          {def.icon} {def.name}
        </strong>
        {here ? (
          <Badge tone="success">Tier {here.tier}/4</Badge>
        ) : levelLocked ? (
          <LockedBadge level={def.level} reason={`Requires Mining level ${def.level}`} />
        ) : layerUnreached ? (
          <LockedBadge reason={`Layer ${fmt(layer)}`} />
        ) : (
          <Badge>Ready (Lv {def.level})</Badge>
        )}
      </div>
      <p className="muted small">
        {here
          ? `Protects layers ${fmt(layer)}–${fmt(layer + installationReach(here.tier))} (${INSTALLATION_COUNTER[hazard]})`
          : INSTALLATION_COUNTER[hazard]}
      </p>
      {here?.tier !== 4 && (
        <div className="delve-upgrade-row">
          <Costs s={s} cost={delveInstallationCost(s.delve, hazard, layer)} />
          <button
            className="btn sm"
            disabled={!!blocker}
            title={blocker ?? undefined}
            onClick={() => game.act((st) => buildDelveInstallation(st, hazard, layer))}
          >
            {here ? 'Upgrade' : 'Build'}
          </button>
        </div>
      )}
    </div>
  );
}

function DelveSupplies({ s, layer }: { s: GameState; layer: number }) {
  const delve = s.delve;
  const [showAllPicks, setShowAllPicks] = useState(false);
  const pick = DELVE_PICKS[delve.pickTier];
  const next = DELVE_PICKS[delve.pickTier + 1];
  const blocker = delvePickBlocker(s);
  const rate = rubblePerSupport(delve);

  return (
    <aside className="card delve-supplies">
      <div className="card-title">Mine supplies</div>
      <div className="delve-supply-grid">
        <span>
          <MatIcon id="mine_support" />{' '}
          <HelpTip
            label="Supports"
            tip="Timber & stone braces crafted from Rubble (5 Rubble each, or 4 with Iron Pick). Required to Push to deeper layers."
          />{' '}
          <strong className="num">{fmt(s.storage.bank.mine_support ?? 0)}</strong>
        </span>
        <span>
          <MatIcon id="rubble" />{' '}
          <HelpTip
            label="Rubble"
            tip="Loose stone earned from working any layer — spend it to craft Supports and build Installations."
          />{' '}
          <strong className="num">{fmt(s.storage.bank.rubble ?? 0)}</strong>
        </span>
      </div>
      <p className="muted small delve-term-note">
        <b>Rubble:</b> Loose stone earned from working any layer — spend it to craft Supports and build Installations.
      </p>
      <p className="muted small delve-term-note">
        <b>Supports:</b> Timber &amp; stone braces crafted from Rubble (5 Rubble each, or 4 with Iron Pick). Required to Push to deeper layers.
      </p>

      <label className="delve-autobrace">
        <input
          type="checkbox"
          checked={delve.autoBrace}
          onChange={(e) => game.act((st) => setDelveAutoBrace(st, e.target.checked))}
        />
        <span>Auto-craft Supports while digging</span>
      </label>

      <div className="delve-upgrade-row">
        <span className="muted small">{rate} Rubble per Support</span>
        <button
          className="btn sm"
          disabled={(s.storage.bank.rubble ?? 0) < rate}
          onClick={() => game.act((st) => { craftDelveSupports(st); })}
        >
          Make supports
        </button>
      </div>

      <div className="delve-upgrade">
        <div className="delve-upgrade-heading">
          <strong>
            <HelpTip
              label={pick.name}
              tip="Forged from smelted Metal Bars once you reach each band depth. Each tier grants a permanent mining perk."
            />
          </strong>
          <Badge tone="gold">Tier {delve.pickTier + 1}/{DELVE_PICKS.length}</Badge>
        </div>
        <p className="muted small">{pick.perk}</p>
        {next && (
          <div className="delve-next-pick">
            <div className="delve-upgrade-heading">
              <span className="small">
                <b>Next:</b> {next.name}
              </span>
              {delve.deepest < next.layer ? (
                <LockedBadge reason={`Layer ${next.layer}`} />
              ) : (
                <Badge tone="neutral">Layer {next.layer} reached</Badge>
              )}
            </div>
            <p className="muted small">{next.perk}.</p>
            <div className="delve-upgrade-row">
              <Costs s={s} cost={delvePickCost(delve.pickTier)} />
              <button
                className="btn sm primary"
                disabled={!!blocker}
                title={blocker ?? undefined}
                onClick={() => game.act(upgradeDelvePick)}
              >
                Forge pick
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          className="btn sm ghost delve-pick-toggle"
          onClick={() => setShowAllPicks((v) => !v)}
        >
          {showAllPicks ? 'Hide all pick tiers' : `Show all ${DELVE_PICKS.length} pick tiers`}
        </button>
        {showAllPicks && (
          <ul className="delve-pick-list">
            {DELVE_PICKS.map((tier, idx) => {
              const owned = idx <= delve.pickTier;
              const current = idx === delve.pickTier;
              return (
                <li key={tier.name} className={`delve-pick-item ${owned ? 'owned' : 'locked'}`}>
                  <div className="delve-upgrade-heading">
                    <span className="small">
                      <b>{tier.name}</b>
                    </span>
                    {current ? (
                      <Badge tone="gold">Equipped</Badge>
                    ) : owned ? (
                      <Badge tone="success">Unlocked</Badge>
                    ) : (
                      <LockedBadge reason={`Layer ${tier.layer}`} />
                    )}
                  </div>
                  <span className="muted small">{tier.perk}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card-title">
        <HelpTip
          label={`Installations at layer ${fmt(layer)}`}
          tip="Permanent stations built at a layer that eliminate one hazard type across a 50+ layer span below it."
        />
      </div>
      {DELVE_HAZARDS.map((hazard) => (
        <Installation key={hazard} s={s} hazard={hazard} layer={layer} />
      ))}
    </aside>
  );
}

/** Inline in the Time Away summary and available later from the Mine Log. */
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
  return (
    <section className="delve-replay">
      <div className="delve-replay-heading">
        <h3>Descent replay</h3>
        <span className="num small">
          {count}/{events.length}
        </span>
        <button
          className="btn"
          onClick={() =>
            game.act((st) => {
              st.delve.replay = [];
              setShown(0);
            })
          }
        >
          {count >= events.length ? 'Done' : 'Skip'}
        </button>
      </div>
      <div className="delve-replay-frame" key={displayDepth}>
        <ShaftRows delve={s.delve} layer={displayDepth} limit={reached} />
      </div>
      <p className="small" aria-live={count >= events.length ? 'polite' : 'off'}>
        {count > 0 ? event.text : `Returning to layer ${displayDepth}…`}
      </p>
    </section>
  );
}

export function DelveView({ masterworks }: { masterworks?: ReactNode } = {}) {
  const s = useGame();
  const delve = s.delve;
  const [tab, setTab] = useState<DelveTab>(() =>
    masterworks && s.professionProgress.activeProject?.project.skill === 'mining' ? 'masterworks' : 'shaft',
  );
  const [selected, select] = useState<number | null>(null);
  const [destination, setDestination] = useState('');
  const [showReplay, setShowReplay] = useState(false);
  const [showDeeper, setShowDeeper] = useState(false);

  const tabs: TabDef<DelveTab>[] = masterworks
    ? [...BASE_TABS, { id: 'masterworks', label: 'Masterworks' }]
    : BASE_TABS;

  const layer = Math.max(1, Math.min(selected ?? delve.deepest, delve.deepest));
  const atFace = layer === delve.deepest;
  const move = (next: number) => select(Math.max(1, Math.min(next, delve.deepest)));
  const traits = DELVE_TRAITS.filter((trait) => delve.layers[layer]?.traits.includes(trait.id));
  const nextLayer = delve.deepest + 1;
  const nextTraits = delve.pickTier >= 3 ? delveTraitsAt(delve, nextLayer) : null;
  const nextName = nextTraits
    ? DELVE_TRAITS.filter((trait) => nextTraits.includes(trait.id))
        .map((trait) => trait.name)
        .join(', ')
    : null;
  const cap = delveDepthCap(skillLevel(s, 'mining'));
  const pushBlocker = delvePushBlocker(s);
  const current = s.action?.kind === 'skill' && isDelveAction(s.action.actionId) ? s.action : null;
  const pushing = current?.actionId === 'delve_push';
  const gas = current && delveGasPaused(s);
  const activeLayer = current
    ? gas
      ? (delve.gasLayer ?? Math.max(1, delve.deepest - 2))
      : pushing
        ? delve.deepest + 1
        : (current.delveLayer ?? delve.deepest)
    : undefined;
  const interval = current ? actionIntervalMs(s, actionDef(current.actionId), deriveStats(s)) : 1;
  const work = (mode: DelveMode) => {
    const blocker = game.act((st, ctx) => startDelve(st, ctx, mode, layer));
    if (mode === 'push' && blocker === null) select(null);
  };
  const secure = delve.layers[layer]?.secure ?? 0;
  const workHazardPct = (100 * delveHazardChance(delve, layer, 'work')).toFixed(1);

  return (
    <section className="delve-view">
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'shaft' && (
        <>
          <SkillIntro step="Start here: Work Layer 1">
            Dig ore and <b>Rubble</b>, raise <b>Security</b> to calm <b>Hazards</b>, and craft <b>Supports</b> from Rubble to <b>Push</b> deeper.
          </SkillIntro>
          <div className="delve-layout">
            <div className="card delve-main">
              <div className="delve-title">
                <div>
                  <h2>The Delve</h2>
                  <p className="muted small">
                    Deepest layer {fmt(delve.deepest)}
                    {Number.isFinite(cap) ? ` · Level limit ${fmt(cap)}` : ''}
                  </p>
                </div>
                <div className="delve-records small">
                  <span>{fmt(delve.stats.caverns)} caverns</span>
                  <span>{fmt(delve.stats.motherlodes)} Motherlodes</span>
                </div>
              </div>
              <div className="delve-elevator" aria-label="Elevator">
                <button className="btn sm" onClick={() => move(1)} disabled={layer === 1}>
                  Top
                </button>
                <button className="btn sm" onClick={() => move(layer - 10)} disabled={layer === 1} aria-label="Up ten layers">
                  ⏫
                </button>
                <button className="btn sm" onClick={() => move(layer - 1)} disabled={layer === 1} aria-label="Up one layer">
                  ▲
                </button>
                <button className="btn sm" onClick={() => move(layer + 1)} disabled={atFace} aria-label="Down one layer">
                  ▼
                </button>
                <button className="btn sm" onClick={() => move(layer + 10)} disabled={atFace} aria-label="Down ten layers">
                  ⏬
                </button>
                <button className="btn sm" onClick={() => select(null)} disabled={atFace}>
                  Dig face
                </button>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    move(Number(destination));
                    setDestination('');
                  }}
                >
                  <input
                    type="number"
                    min={1}
                    max={delve.deepest}
                    aria-label="Go to layer"
                    placeholder="Layer"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                  />
                  <button className="btn sm" type="submit">
                    Go
                  </button>
                </form>
              </div>
              <ShaftRows
                delve={delve}
                layer={layer}
                select={select}
                activeLayer={activeLayer}
                showDeeper={showDeeper}
              />
              <div className="delve-shaft-footer">
                <span className="muted small">
                  Showing reached layers{showDeeper ? ' + deeper strata preview' : ' + next 2 unreached'}
                </span>
                <button
                  type="button"
                  className="btn sm ghost delve-strata-toggle"
                  onClick={() => setShowDeeper((v) => !v)}
                >
                  {showDeeper ? 'Hide deeper strata' : 'Show deeper strata'}
                </button>
              </div>

              <div className="delve-layer-detail">
                <div className="delve-upgrade-heading">
                  <strong>
                    Layer {fmt(layer)} · {layer === WORLDROOT_DEPTH ? 'Worldroot Chamber' : delveBand(layer).name}
                  </strong>
                  <span className="muted small">
                    <HelpTip
                      label={secure >= DELVE_SECURITY ? 'Secured · +10% ore' : `Security ${secure}/${DELVE_SECURITY}`}
                      tip="Builds up as you work a layer. Raising Security sharply lowers hazard chance."
                    />
                  </span>
                </div>
                <p className="muted small">
                  <b>Security:</b> Builds up as you work a layer. Raising Security sharply lowers hazard chance ({workHazardPct}% while working).
                </p>
                {traits.length > 0 && (
                  <ul className="delve-traits">
                    {traits.map((trait) => (
                      <li className="small" key={trait.id}>
                        <strong>
                          {trait.icon} {trait.name}
                        </strong>{' '}
                        · {trait.hint}
                      </li>
                    ))}
                  </ul>
                )}
                {(delve.layers[layer]?.floodedUntil ?? 0) > s.clock && (
                  <p className="delve-short small">Flooded for {fmtTime(delve.layers[layer].floodedUntil! - s.clock)} (work slowed ×2)</p>
                )}
                <div className="delve-buttons">
                  <button
                    className="btn primary"
                    onClick={() => work('work')}
                    disabled={!pushing && current?.delveLayer === layer}
                  >
                    Work this layer
                  </button>
                  {atFace && (
                    <button className="btn" onClick={() => work('push')} disabled={!!pushBlocker || pushing}>
                      Push deeper
                    </button>
                  )}
                  {current && (
                    <button className="btn" onClick={() => game.act(stopAction)}>
                      Stop mining
                    </button>
                  )}
                </div>
                <p className="muted small">
                  <HelpTip
                    label="Work Layer"
                    tip="Mines this layer's ore, collects Rubble, and increases Security."
                  />{' '}
                  Mines this layer&apos;s ore, collects Rubble, and increases Security.
                </p>
                {atFace && (
                  <p className="muted small">
                    <b>Push to Layer {fmt(nextLayer)}:</b> costs {delvePushCost(nextLayer, delve.pickTier)}{' '}
                    {delvePushCost(nextLayer, delve.pickTier) === 1 ? 'Support' : 'Supports'} ·{' '}
                    {(100 * delveHazardChance(delve, nextLayer, 'push')).toFixed(1)}% hazard chance
                    {nextName !== null ? ` · ${nextName || 'Plain rock'}` : ''}
                    {pushBlocker ? ` · ${pushBlocker}` : ''}
                  </p>
                )}
                {current && (
                  <>
                    <p className="small">
                      {gas
                        ? `Gas pause · Working layer ${delve.gasLayer} for ${fmtTime(delve.gasUntil! - s.clock)}`
                        : pushing
                          ? `Pushing to layer ${fmt(nextLayer)}`
                          : `Working layer ${fmt(current.delveLayer ?? delve.deepest)}`}
                    </p>
                    <ProgressBar value={current.progress / interval} color={delveBand(layer).color} />
                  </>
                )}
              </div>
              <BraceCard s={s} />
            </div>
            <DelveSupplies s={s} layer={layer} />
          </div>
        </>
      )}

      {tab === 'log' && (
        <div className="card delve-log">
          <div>
            <div className="card-title">Mine Log</div>
            <p className="muted small">
              Records recent finds, braced hazards, caverns opened, and depth milestones.
            </p>
          </div>
          {delve.replay.length > 0 && !showReplay && (
            <button className="btn sm" onClick={() => setShowReplay(true)}>
              Replay time away
            </button>
          )}
          {showReplay && <DelveReplay />}
          {delve.log.length === 0 ? (
            <p className="muted">Breakthroughs, hazards and cavern finds will appear here.</p>
          ) : (
            <ol>
              {[...delve.log].reverse().map((event, index) => (
                <li key={index}>{event}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      {tab === 'masterworks' && masterworks && <div className="delve-masterworks">{masterworks}</div>}

      {delve.landmarkPending && (
        <div className="modal-backdrop">
          <div className="card modal delve-landmark" role="dialog" aria-modal="true" aria-labelledby="delve-landmark-name">
            <p className="small">Layer {WORLDROOT_DEPTH}</p>
            <h2 id="delve-landmark-name">Worldroot Chamber</h2>
            <p>The shaft opens around an ancient root of glittering stone. The mine continues beneath it.</p>
            <button
              className="btn primary"
              onClick={() =>
                game.act((st) => {
                  st.delve.landmarkPending = false;
                  select(WORLDROOT_DEPTH);
                })
              }
            >
              Enter the chamber
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
