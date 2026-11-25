import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DELVE_HAZARDS, DELVE_INSTALLATIONS, DELVE_MASTERY_MAX, DELVE_MASTERY_ORE_BONUS, DELVE_PICKS,
  DELVE_RUBBLE_MASTERY_LEVEL, DELVE_RUBBLE_PER_WORK, DELVE_TRAITS, WORLDROOT_DEPTH,
  delveBand, delveBonusRubble, type DelveHazard, type DelveMode, type DelveTrait,
} from '../../data/delve';
import { materialDef } from '../../data/materials';
import { actionDef } from '../../data/skills';
import { recipeMaterialCount } from '../../engine/bank';
import {
  braceDelve, buildDelveInstallation, delveDepthCap, delveGasPaused, delveHazardChance,
  delveInstallationBlocker, delveInstallationCost, delvePickBlocker, delvePickCost, delvePushBlocker,
  delvePushPayment, delveTraitsAt, installationCovers, installationReach, isDelveAction,
  startDelve, upgradeDelvePick, type DelveState,
} from '../../engine/delve';
import { focusMult, focusOf, type SwingResult } from '../../engine/minigame';
import { actionIntervalMs, skillLevel, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameEvent, GameState } from '../../engine/types';
import { game, useGame, useGameEvent } from '../../game';
import { Badge, fmt, fmtTime, GameIcon, MatIcon, ProgressBar, Tabs, type TabDef } from './common';
import { Icon } from './Icon';
import { HelpTip, LockedBadge } from './SkillHelp';
import './delve.css';

type DelveTab = 'shaft' | 'upgrades' | 'masterworks';

const BRACE_LABEL: Record<SwingResult, string> = { double: 'Perfect brace', hit: 'Hazard braced', weak: 'Late brace', miss: 'Missed brace' };

const INSTALLATION_COUNTER: Record<DelveHazard, string> = {
  flood: 'Counters Floods (prevents work slowdowns) across 50+ layers below.',
  gas: 'Counters Gas pockets (prevents 10m fallback) across 50+ layers below.',
  'cave-in': 'Prevents cave-in losses across 50+ layers below.',
};

const LAYER_MASTERY_REWARDS = [
  { level: DELVE_RUBBLE_MASTERY_LEVEL, name: '+1 rubble per swing' },
  { level: DELVE_INSTALLATIONS.flood.mastery, name: DELVE_INSTALLATIONS.flood.name, detail: 'Counters floods' },
  { level: DELVE_INSTALLATIONS.gas.mastery, name: DELVE_INSTALLATIONS.gas.name, detail: 'Counters gas' },
  { level: DELVE_INSTALLATIONS['cave-in'].mastery, name: DELVE_INSTALLATIONS['cave-in'].name, detail: 'Counters cave-ins' },
];

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

/** Show nearby depths or all reached depths with the selected trait. */
function ShaftMap({ delve, layer, select, limit = delve.deepest, activeLayer, trait }: {
  delve: DelveState;
  layer: number;
  select?: (layer: number) => void;
  limit?: number;
  activeLayer?: number;
  trait?: DelveTrait;
}) {
  const first = Math.max(1, Math.min(layer - 2, limit - 4));
  const last = Math.min(limit + 1, first + 5);
  const { layers } = delve;
  const matches = useMemo(() => trait
    ? Object.keys(layers).map(Number).filter((depth) => depth <= limit && layers[depth].traits.includes(trait))
    : null, [layers, limit, trait]);
  const depths = matches ?? Array.from({ length: last - first + 1 }, (_, index) => first + index);
  return (
    <div className={`delve-shaft${trait ? ' filtered' : ''}`} aria-label={trait ? 'Matching depths' : 'Mine shaft'}>
      {matches?.length === 0 && <p className="delve-filter-empty">No reached depths have this trait yet.</p>}
      {depths.map((depth) => {
        const band = delveBand(depth);
        const reached = depth <= limit;
        const selected = depth === layer;
        const active = depth === activeLayer;
        const data = reached ? delve.layers[depth] : undefined;
        const traits = DELVE_TRAITS.filter((trait) => data?.traits.includes(trait.id));
        const stations = reached ? DELVE_HAZARDS.filter((hazard) =>
          delve.installations.some((station) => station.layer === depth && station.type === DELVE_INSTALLATIONS[hazard].id),
        ) : [];
        const classes = [
          'delve-layer', reached ? '' : 'unreached', selected ? 'selected' : '',
          active ? 'lantern' : '', traits.some((trait) => trait.id === 'motherlode') ? 'motherlode' : '',
        ].filter(Boolean).join(' ');
        const contents = (
          <>
            <span className="delve-depth num">Depth {fmt(depth)}</span>
            <span className="delve-layer-name">
              {reached ? (depth === WORLDROOT_DEPTH ? 'Worldroot Chamber' : band.name) : 'Unexplored'}
            </span>
            <span className="delve-marks">
              {active && <span className="delve-lantern-dot" role="img" aria-label="Mining here" />}
              {traits.map((trait) => <TraitIcon key={trait.id} trait={trait} />)}
              {stations.map((hazard) => (
                <span className="delve-mark" key={hazard} data-tone={hazard} title={DELVE_INSTALLATIONS[hazard].name}>
                  <HazardIcon hazard={hazard} />
                </span>
              ))}
            </span>
          </>
        );
        const style = { '--stratum': reached ? band.color : '#71675f' } as CSSProperties;
        return select ? (
          <button type="button" className={classes} key={depth} style={style} disabled={!reached}
            aria-pressed={selected} onClick={() => select(depth)}>
            {contents}
          </button>
        ) : <div className={classes} key={depth} style={style}>{contents}</div>;
      })}
    </div>
  );
}

const TRAIT_ICONS = {
  rich: 'mining', crystal: 'gemcutting', fossil: 'archaeology',
  flooded: 'drop', unstable: 'bolt', motherlode: 'astrology',
} as const;

function TraitIcon({ trait }: { trait: (typeof DELVE_TRAITS)[number] }) {
  return (
    <span className="delve-mark" data-tone={trait.id} title={trait.name} role="img" aria-label={trait.name}>
      <GameIcon name={TRAIT_ICONS[trait.id]} size={16} />
    </span>
  );
}

function HazardIcon({ hazard }: { hazard: DelveHazard }) {
  return <Icon name={{ 'cave-in': 'support', flood: 'drop', gas: 'wind' }[hazard]} />;
}

const HAZARD_NAME: Record<DelveHazard, string> = { 'cave-in': 'Cave-in', flood: 'Flood', gas: 'Gas leak' };

function BraceCard({ s }: { s: GameState }) {
  const action = s.action;
  const running = action?.kind === 'skill' && isDelveAction(action.actionId);
  const warning = running && action.actionId === s.delve.warning?.action ? s.delve.warning : undefined;
  const result = running && (s.delve.lastBrace?.at ?? -Infinity) + 5000 >= s.clock ? s.delve.lastBrace : undefined;
  const remaining = warning ? Math.max(0, warning.timerMs - (s.clock - warning.startsAt)) : 0;
  const hold = running ? Math.max(0, (s.delve.focusHoldUntil ?? 0) - s.clock) : 0;
  const focus = running ? focusOf(s) : 0;
  return (
    <section className="delve-brace" data-tone={warning?.hazard} aria-label="Mining Focus">
      <div className="delve-brace-heading">
        <strong><Icon name="bolt" /> Focus</strong>
        {result && <span className={`delve-brace-result ${result.result}`} role="status">{BRACE_LABEL[result.result]}</span>}
        <span className="delve-speed num">+{running ? Math.round((focusMult(s, 'mining') - 1) * 100) : 0}% mining speed</span>
      </div>
      <ProgressBar value={focus} color="#eac583" />
      <div className="delve-focus-hint">
        <span>{hold > 0 && focus > 0 ? `Held for ${fmtTime(hold)}` : 'Match warnings to build Focus'}</span>      </div>
      {running && (
        <div className="delve-warning">
          <div className="delve-brace-heading">
            <strong role="status">
              {warning
                ? <><HazardIcon hazard={warning.hazard} /> {HAZARD_NAME[warning.hazard]} <span>· {DELVE_INSTALLATIONS[warning.hazard].warning}</span></>
                : s.delve.bracedPush !== undefined
                  ? <><Icon name="equipment" /> Descent protected</>
                  : <><GameIcon name="clock" /> Watching for hazards</>}
            </strong>
            {warning && <span className="num">{(remaining / 1000).toFixed(1)}s</span>}
          </div>
          <div className="delve-warning-timer" aria-hidden="true">
            {warning && <ProgressBar value={remaining / warning.timerMs} color="var(--delve-tone)" />}
          </div>
          <div className="delve-brace-buttons">
            {DELVE_HAZARDS.map((hazard) => (
              <button type="button" className="btn" key={hazard} data-tone={hazard} disabled={!warning}
                data-match={warning?.hazard === hazard}
                onClick={() => game.act((st, ctx) => { braceDelve(st, ctx, hazard); })}>
                <HazardIcon hazard={hazard} /> {DELVE_INSTALLATIONS[hazard].fix}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Installation({ s, hazard, layer }: { s: GameState; hazard: DelveHazard; layer: number }) {
  const def = DELVE_INSTALLATIONS[hazard];
  const here = s.delve.installations.find((i) => i.type === def.id && i.layer === layer);
  const blocker = delveInstallationBlocker(s, hazard, layer);
  const target = s.delve.layers[layer];
  const masteryLocked = !here && !!target && target.mastery < def.mastery;
  return (
    <div className={`delve-upgrade ${masteryLocked || !target ? 'locked' : ''}`}>
      <div className="delve-upgrade-heading">
        <strong>
          <HazardIcon hazard={hazard} /> {def.name}
        </strong>
        {here ? (
          <Badge tone="success">Tier {here.tier}/4</Badge>
        ) : masteryLocked ? (
          <LockedBadge reason={`Requires Layer Mastery ${def.mastery} at this depth`} />
        ) : !target ? (
          <LockedBadge reason={`Layer ${fmt(layer)}`} />
        ) : (
          <Badge tone="success">Unlocked</Badge>
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

function SupplyStrip({ s }: { s: GameState }) {
  const rubble = s.storage.bank.rubble ?? 0;
  const supports = s.storage.bank.mine_support ?? 0;
  return (
    <div className="delve-supply-strip" aria-label="Mine supplies">
      <span className="delve-resource" title="Collect it while mining and spend it to dig deeper">
        <GameIcon name="rock" /> Rubble <strong className="num">{fmt(rubble)}</strong>
      </span>
      {supports > 0 && (
        <span className="delve-resource" title="Existing supports are spent before rubble">
          <Icon name="support" /> Supports <strong className="num">{fmt(supports)}</strong>
        </span>
      )}
    </div>
  );
}

function DelveUpgrades({ s, layer, chooseDepth }: { s: GameState; layer: number; chooseDepth: () => void }) {
  const delve = s.delve;
  const [showAllPicks, setShowAllPicks] = useState(false);
  const pick = DELVE_PICKS[delve.pickTier];
  const next = DELVE_PICKS[delve.pickTier + 1];
  const blocker = delvePickBlocker(s);

  return (
    <section className="delve-upgrades" aria-label="Mine upgrades">
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

      <div className="card-title delve-upgrade-heading">
        <HelpTip
          label={`Installations at depth ${fmt(layer)}`}
          tip="Permanent stations built at a layer that eliminate one hazard type across a 50+ layer span below it."
        />
        <button type="button" className="btn sm" onClick={chooseDepth}>Choose depth</button>
      </div>
      {DELVE_HAZARDS.map((hazard) => (
        <Installation key={hazard} s={s} hazard={hazard} layer={layer} />
      ))}
    </section>
  );
}

function MinePayout() {
  const [payout, setPayout] = useState<{ id: number; entries: [string, number][] } | null>(null);
  const onEvent = useCallback((event: GameEvent) => {
    if (event.t !== 'produce' || event.skill !== 'mining') return;
    const entries = Object.entries(event.outputs).filter(([, count]) => count > 0);
    if (entries.length) setPayout((previous) => ({ id: (previous?.id ?? 0) + 1, entries }));
  }, []);
  useGameEvent(onEvent);
  useEffect(() => {
    if (!payout) return;
    const timer = window.setTimeout(() => setPayout(null), 1800);
    return () => window.clearTimeout(timer);
  }, [payout]);

  return (
    <div className="delve-yield" aria-live="polite">
      {payout && (
        <div className="delve-yield-popup" key={payout.id}>
          {payout.entries.map(([id, count]) => (
            <span className="delve-yield-item" key={id}>
              <span aria-hidden="true"><MatIcon id={id} size={12} /></span>
              <strong>+{fmt(count)}</strong> {materialDef(id).name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Inline in the Time Away summary and available later in the Activity bar. */
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
        <ShaftMap delve={s.delve} layer={displayDepth} limit={reached} />
      </div>
      <p className="small" aria-live={count >= events.length ? 'polite' : 'off'}>
        {count > 0 ? event.text : `Returning to layer ${displayDepth}…`}
      </p>
    </section>
  );
}

export function MineActivity({ delve }: { delve: DelveState }) {
  const [showReplay, setShowReplay] = useState(false);
  if (!delve.log.length && !delve.replay.length) return null;
  const latest = delve.log.at(-1);
  const heading = (
    <>
      <strong>Mine activity</strong>
      {latest && <span>{latest}</span>}
    </>
  );
  if (delve.log.length === 1 && !delve.replay.length) {
    return <li className="feed-item delve-feed">{heading}</li>;
  }
  return (
    <li className="feed-item delve-feed">
      <details>
        <summary>{heading}</summary>
        {delve.replay.length > 0 && (
          showReplay ? <DelveReplay /> : (
            <button className="btn sm" type="button" onClick={() => setShowReplay(true)}>Replay time away</button>
          )
        )}
        {delve.log.length > 1 && (
          <ol className="delve-feed-history">
            {delve.log.slice(0, -1).reverse().map((event, index) => <li key={index}>{event}</li>)}
          </ol>
        )}
      </details>
    </li>
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
  const [traitFilter, setTraitFilter] = useState<DelveTrait | ''>('');
  const tabs: TabDef<DelveTab>[] = [{ id: 'shaft', label: 'Shaft' }, { id: 'upgrades', label: 'Mine Upgrades' }];
  if (masterworks) tabs.push({ id: 'masterworks', label: 'Masterworks' });

  const layer = Math.max(1, Math.min(selected ?? delve.deepest, delve.deepest));
  const band = delveBand(layer);
  const atFace = layer === delve.deepest;
  const move = (next: number) => {
    setTraitFilter('');
    select(Math.max(1, Math.min(next, delve.deepest)));
  };
  const traits = DELVE_TRAITS.filter((trait) => delve.layers[layer]?.traits.includes(trait.id));
  const nextLayer = delve.deepest + 1;
  const nextTraits = delve.pickTier >= 3 ? DELVE_TRAITS.filter((trait) => delveTraitsAt(delve, nextLayer).includes(trait.id)).map((trait) => trait.name) : null;
  const { mine_support: pushSupports, rubble: pushRubble } = delvePushPayment(s, nextLayer);
  const pushPrice = [
    pushSupports && `${fmt(pushSupports)} ${pushSupports === 1 ? 'support' : 'supports'}`,
    pushRubble && `${fmt(pushRubble)} rubble`,
  ].filter(Boolean).join(' + ');
  const pushRisk = (100 * delveHazardChance(delve, nextLayer, 'push')).toFixed(1);
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
  const mastery = delve.layers[layer]?.mastery ?? 1;
  const bonusRubble = delveBonusRubble(mastery);
  const workingHere = !pushing && current?.delveLayer === layer;
  const floodedUntil = delve.layers[layer]?.floodedUntil ?? 0;
  const flooded = floodedUntil > s.clock && !installationCovers(delve, 'flood', layer);

  return (
    <section className="delve-view">
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'shaft' && (
        <>
          <SupplyStrip s={s} />
          <div className="delve-layout">
            <section className="delve-worksite" style={{ '--stratum': band.color } as CSSProperties}>
              <div className="delve-vein">
                <div>
                  <div className="delve-vein-depth num">Depth {fmt(layer)}</div>
                  <h2>{layer === WORLDROOT_DEPTH ? 'Worldroot Chamber' : band.name}</h2>
                </div>
                <MatIcon id={band.ore} size={52} />
              </div>
              <div className="delve-operations">
                <div className="delve-choices">
                  <div className="delve-choice">
                    <button className="btn delve-work-button" type="button" onClick={() => work('work')}
                      disabled={workingHere}>
                      <Icon name="mining" size={22} /> {workingHere ? 'Mining here' : `Mine ${band.name}`}
                    </button>
                    <small>
                      <GameIcon name="rock" size={13} /> {DELVE_RUBBLE_PER_WORK.min + bonusRubble}–{DELVE_RUBBLE_PER_WORK.max + bonusRubble} rubble per swing
                    </small>
                  </div>
                  <div className="delve-choice">
                    <button className="btn delve-push-button" type="button" onClick={() => work('push')}
                      disabled={!!pushBlocker || pushing}>
                      <span aria-hidden="true">↓</span> {pushing ? `Descending to Depth ${fmt(nextLayer)}` : `Dig to Depth ${fmt(nextLayer)}`}
                    </button>
                    <small className={pushBlocker ? 'delve-short' : undefined}>
                      <Icon name={pushBlocker ? 'lock' : pushRubble ? 'rock' : 'support'} size={13} />
                      {pushBlocker ?? `${pushPrice} · ${pushRisk}% hazard risk`}
                    </small>
                    {pushRubble > 0 && <small>Rubble builds supports as you dig.</small>}
                    {nextTraits && <small>{nextTraits.length ? nextTraits.join(' · ') : 'Plain rock ahead'}</small>}
                  </div>
                </div>
                {current && (
                  <div className="delve-activity">
                    <div className="delve-upgrade-heading">
                      <strong>
                        {gas
                          ? `Mining Depth ${fmt(activeLayer!)} while gas clears`
                          : pushing
                            ? `Opening Depth ${fmt(nextLayer)}`
                            : `Mining ${delveBand(activeLayer!).name} at Depth ${fmt(activeLayer!)}`}
                      </strong>
                      <button className="btn sm ghost" type="button" onClick={() => game.act(stopAction)}>Stop mining</button>
                    </div>
                    {gas && (
                      <small className="delve-gas-status">
                        <HazardIcon hazard="gas" />
                        {pushing ? 'Descent resumes' : `Returning to Depth ${fmt(current.delveLayer ?? delve.deepest)}`}
                        {' in '}{fmtTime(delve.gasUntil! - s.clock)}
                      </small>
                    )}
                    <ProgressBar value={current.progress / interval} color={delveBand(activeLayer!).color} />
                    <MinePayout />
                  </div>
                )}
                <div className="delve-mastery">
                  <div className="delve-upgrade-heading">
                    <strong><Icon name="equipment" /> Layer Mastery</strong>
                    <small className="num">Lv {mastery} / {DELVE_MASTERY_MAX}</small>
                  </div>
                  <ProgressBar value={(mastery - 1) / (DELVE_MASTERY_MAX - 1)} color="#a5c992" />
                  <small>+1 level per swing at this depth</small>
                  <ul className="delve-mastery-rewards" aria-label="Layer Mastery rewards">
                    {LAYER_MASTERY_REWARDS.map(({ level, name, detail }) => (
                      <li key={level} data-reached={mastery >= level}>
                        <span className="delve-mastery-level num">Lv {level}</span>
                        <span>{name}{detail && <small>{detail}</small>}</span>
                      </li>
                    ))}
                  </ul>
                  <small>Lv {DELVE_MASTERY_MAX} · +{DELVE_MASTERY_ORE_BONUS * 100}% ore on average · No new hazards</small>
                </div>
                {traits.length > 0 && (
                  <ul className="delve-traits">
                    {traits.map((trait) => (
                      <li key={trait.id}><TraitIcon trait={trait} /><span><strong>{trait.name}</strong> · {trait.hint}</span></li>
                    ))}
                  </ul>
                )}
                {flooded && <p className="delve-short small"><HazardIcon hazard="flood" /> Flooded for {fmtTime(floodedUntil - s.clock)} · Mining slowed</p>}
              </div>
            </section>

            <section className="delve-map">
              <div className="delve-map-heading">
                <h2>The Delve</h2>
                <small>Deepest {fmt(delve.deepest)}{Number.isFinite(cap) ? ` · Max depth ${fmt(cap)}` : ''}</small>
              </div>
              <label className="delve-filter">
                Filter by trait
                <select value={traitFilter} onChange={(event) => setTraitFilter(event.target.value as DelveTrait | '')}>
                  <option value="">Nearby depths</option>
                  {DELVE_TRAITS.map((trait) => <option key={trait.id} value={trait.id}>{trait.name}</option>)}
                </select>
              </label>
              <ShaftMap key={traitFilter} delve={delve} layer={layer} select={select} activeLayer={activeLayer} trait={traitFilter || undefined} />
              {delve.deepest > 1 && (
                <div className="delve-elevator" aria-label="Elevator">
                  <button className="btn sm" type="button" onClick={() => move(1)} disabled={layer === 1}>Top</button>
                  <button className="btn sm" type="button" onClick={() => move(layer - 1)} disabled={layer === 1} aria-label="Up one depth">↑</button>
                  <button className="btn sm" type="button" onClick={() => move(layer + 1)} disabled={atFace} aria-label="Down one depth">↓</button>
                  <button className="btn sm" type="button" onClick={() => { setTraitFilter(''); select(null); }} disabled={atFace && !traitFilter}>Deepest</button>
                  {delve.deepest > 5 && (
                    <form onSubmit={(event) => { event.preventDefault(); move(Number(destination)); setDestination(''); }}>
                      <input type="number" min={1} max={delve.deepest} aria-label="Go to depth" placeholder="Depth"
                        value={destination} onChange={(event) => setDestination(event.target.value)} required />
                      <button className="btn sm" type="submit">Go</button>
                    </form>
                  )}
                </div>
              )}
            </section>
          </div>
          <BraceCard s={s} />
        </>
      )}

      {tab === 'upgrades' && <DelveUpgrades s={s} layer={layer} chooseDepth={() => setTab('shaft')} />}
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
