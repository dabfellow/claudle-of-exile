import { useState } from 'react';
import { collectibleFor } from '../../data/collectibles';
import { materialDef } from '../../data/materials';
import { actionsFor, type SkillAction } from '../../data/skills';
import {
  LEGENDS, LODGE, PART_HINT, PART_NAMES, quirkDef, SIZE_NAMES, WOODS, WORLD_TREE_GROWTH_MS, woodDef, type LodgeDef,
} from '../../data/woodcutting';
import { recipeMaterialCount } from '../../engine/bank';
import { masteryLevel } from '../../engine/skillingMastery';
import { actionBlocker, actionIntervalMs, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import {
  autoPick, buildLodge, chooseByOrder, fellingTime, giantName, isGiantActionId, isLegend, lodgeBlocker, lodgeTierOf, moveOn,
  nextLodgeTier, nextPart, offerWorldTree, partWorkable, pickGiant, plantBlocker, plantWorldTree, scoutCount, scoutRegion,
  setGiantOrder, setGiantPart, totalHp, totalMaxHp, unlockedRegions, woodcuttingAccessHint, woodcuttingLevel, worldTreeGrowth,
  worldTreeReady,
} from '../../engine/woodcutting';
import type { Giant, GiantPart, GiantPref, GameState, LodgeId } from '../../engine/types';
import { game, useGame } from '../../game';
import { TREE_ART } from '../assets';
import { Badge, Cost, fmt, MatIcon, ProgressBar } from './common';
import { MasteryProgress } from './MasteryProgress';
import { HelpTip, LockedBadge, SkillIntro } from './SkillHelp';
import { SkillMinigame } from './SkillMinigame';
import './giants.css';

export type GiantTab = 'giant' | 'scouting' | 'lodge' | 'regions' | 'trophies';

export const GIANT_TABS: { id: GiantTab; label: string }[] = [
  { id: 'giant', label: 'Giant' },
  { id: 'scouting', label: 'Scouting' },
  { id: 'lodge', label: 'Lodge' },
  { id: 'regions', label: 'Regions' },
  { id: 'trophies', label: 'Trophies' },
];

export function isGiantTab(tab: string): tab is GiantTab {
  return GIANT_TABS.some((t) => t.id === tab);
}

function duration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${Math.max(1, min)} min`;
  const h = min / 60;
  return h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} days`;
}

const PREF_LABEL: Record<GiantPref, string> = {
  resin: 'Most resin (Resin-weeping, then Large)',
  heart: 'Biggest heart (Burled, then Large)',
  fast: 'Fastest (Small, Hollow heart)',
  region: 'Largest from the chosen region',
};

const PART_DROPS: Record<GiantPart, { drops: string; purpose: string }> = {
  crown: { drops: 'Drops: Resin', purpose: '+ilvl on Forged & Woodcrafted gear' },
  limbs: { drops: 'Drops: Logs', purpose: 'Saw into Planks for Woodcrafting' },
  trunk: { drops: 'Drops: Bulk Logs + Fells Giant', purpose: 'Brings down the giant & exposes Heart' },
  heart: { drops: 'Drops: Ancient Heartwood', purpose: 'Lodge upgrades & Masterworks' },
};

/** Short names for what a part gave: "52 resin", "140 logs", "3 heartwood". */
export function yieldWords(yields: Record<string, number>): string {
  return Object.entries(yields)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => {
      const name = id.endsWith('_resin') ? 'resin' : id.endsWith('_log') ? 'logs' : id === 'heartwood_fragment' ? 'heartwood' : materialDef(id).name.toLowerCase();
      return `${fmt(n)} ${name}`;
    })
    .join(', ');
}

export function QuirkChips({ g }: { g: Pick<Giant, 'quirks'> }) {
  return (
    <>
      {g.quirks.map((q) => <Badge key={q} tone="gold" title={quirkDef(q).desc}>{quirkDef(q).name}</Badge>)}
    </>
  );
}

function GiantChips({ g }: { g: Giant }) {
  return (
    <div className="giant-chips">
      <Badge>{SIZE_NAMES[g.size]}</Badge>
      <Badge tone="neutral">{woodDef(g.region).region}</Badge>
      {isLegend(g) && <Badge tone="gold">Legend</Badge>}
      <QuirkChips g={g} />
    </div>
  );
}

/** The running giant action, if one is going. */
function runningPart(s: GameState): GiantPart | null | undefined {
  const a = s.action;
  return a?.kind === 'skill' && isGiantActionId(a.actionId) ? a.part ?? null : undefined;
}

/** Fell the current giant, working a part (or the next one in the order). */
function fell(part?: GiantPart) {
  game.act((st, ctx) => {
    const g = st.giant.current;
    if (!g) return 'No giant to fell';
    const running = runningPart(st) !== undefined;
    if (!running) {
      const err = startSkillAction(st, ctx, `giant_${g.region}`);
      if (err) return err;
    }
    const target = part ?? nextPart(st, g);
    return target ? setGiantPart(st, target) : null;
  });
}

/** Forest clearing backdrop with real CC0 tree sprite and interactive Crown/Limbs/Trunk/Heart hotspots. */
function GiantScene({ g, active, locked }: { g: Giant; active: GiantPart | null | undefined; locked: boolean }) {
  const w = woodDef(g.region);
  const treeArt = TREE_ART[g.region] ?? TREE_ART.ash;
  const partHotspot = (p: GiantPart) => {
    const part = g.parts[p];
    if (part.max === 0) {
      return (
        <div key={p} className={`giant-hotspot ${p} missing-part`}>
          <div className="giant-hotspot-head">
            <b>{PART_NAMES[p]}</b>
            <Badge tone="warn">Struck off</Badge>
          </div>
          <span className="dim small">Lightning took this tree&apos;s crown.</span>
        </div>
      );
    }
    const blocked = p === 'heart' && !g.fallen;
    const done = part.hp <= 0;
    const isCurrent = active === p;
    const gave = yieldWords(g.yields[p]);
    const info = PART_DROPS[p];
    const cls = ['giant-hotspot', p, isCurrent ? 'active' : '', done ? 'done' : '', blocked ? 'locked' : '']
      .filter(Boolean)
      .join(' ');
    return (
      <button
        key={p}
        type="button"
        className={cls}
        disabled={!partWorkable(g, p) || locked}
        onClick={() => fell(p)}
        title={PART_HINT[p]}
        aria-label={`${PART_NAMES[p]}: ${blocked ? 'Outer parts first' : `${part.hp} of ${part.max}`}. ${info.drops}. ${info.purpose}`}
      >
        <div className="giant-hotspot-head">
          <b>{PART_NAMES[p]}</b>
          {isCurrent ? (
            <Badge tone="gold" live>Chopping</Badge>
          ) : done ? (
            <Badge tone="success">Cleared</Badge>
          ) : blocked ? (
            <LockedBadge reason="Outer parts first" />
          ) : (
            <span className="num small">{fmt(part.hp)} / {fmt(part.max)}</span>
          )}
        </div>
        <ProgressBar value={part.max > 0 ? part.hp / part.max : 0} color={w.color} />
        <div className="giant-hotspot-drop">{info.drops}</div>
        <div className="giant-hotspot-use">{blocked ? 'Fell the Trunk to expose the Heart' : info.purpose}</div>
        {gave && <div className="giant-hotspot-yield">Collected: {gave}</div>}
      </button>
    );
  };

  return (
    <div
      className={`giant-clearing ${g.fallen ? 'fallen' : ''} ${isLegend(g) ? 'legend' : ''}`}
      role="group"
      aria-label={`${giantName(g)}, ${g.fallen ? 'fallen' : 'standing'}`}
      style={{ ['--giant' as string]: w.color }}
    >
      <div className="giant-clearing-col">
        {partHotspot('crown')}
        {partHotspot('trunk')}
      </div>
      <div className="giant-tree-stage">
        <div className="giant-tree-halo" aria-hidden="true" />
        <img
          src={treeArt}
          alt={`${giantName(g)} (${w.region})`}
          className={`giant-tree-art pack-art crisp ${g.fallen ? 'fallen' : ''}`}
          draggable={false}
        />
        {g.fallen && (
          <div className="giant-heart-ember">
            <span>Heart Exposed!</span>
          </div>
        )}
        <div className="giant-clearing-floor" aria-hidden="true" />
      </div>
      <div className="giant-clearing-col">
        {partHotspot('limbs')}
        {partHotspot('heart')}
      </div>
    </div>
  );
}

function GiantTab({ s, go }: { s: GameState; go: (tab: GiantTab) => void }) {
  const g = s.giant.current;
  const running = runningPart(s);
  const intro = (
    <SkillIntro step="Chop a Giant">
      Fell ancient Giant trees part-by-part: chop the <b>Crown</b> for Resin, <b>Limbs</b> &amp; <b>Trunk</b> for Logs, then expose the <b>Heart</b> for Heartwood.
    </SkillIntro>
  );
  if (!g) {
    return (
      <div className="grid" style={{ gap: 10 }}>
        {intro}
        <div className="card">
          <div className="card-title">No giant standing</div>
          <p className="muted">
            {s.giant.options.length ? 'The scouts found some giants. Pick one to fell.' : 'The scouts are out. A giant will be offered in a moment.'}
          </p>
          <div className="giant-actions">
            <button className="btn primary" onClick={() => go('scouting')}>Open Scouting</button>
            {s.giant.options.length > 0 && <button className="btn" onClick={() => game.act((st) => autoPick(st))}>Auto-pick</button>}
          </div>
        </div>
      </div>
    );
  }
  const left = totalHp(g);
  const max = totalMaxHp(g);
  const w = woodDef(g.region);
  const locked = woodcuttingLevel(s) < w.level;
  return (
    <div className="grid" style={{ gap: 10 }}>
      {intro}
      <div className="giant-layout">
        <div className="card">
          <div className="giant-head">
            <h2>{giantName(g)}</h2>
            <GiantChips g={g} />
            <span className="grow" />
            <span className="dim small num">{duration(fellingTime(g))} left</span>
          </div>
          <GiantScene g={g} active={running ?? undefined} locked={locked} />
          <div style={{ marginTop: 8 }}>
            <ProgressBar value={max > 0 ? 1 - left / max : 1} color={w.color} label={`${fmt(max - left)} / ${fmt(max)} cuts`} />
          </div>
          <div className="giant-actions">
            {running === undefined ? (
              <button className="btn primary" disabled={locked} onClick={() => fell()}>Start felling</button>
            ) : (
              <button className="btn" onClick={() => game.act((st) => stopAction(st))}>Stop</button>
            )}
            <div className="giant-seg" role="group" aria-label="Part order">
              <button className={`gem-chip ${s.giant.order.partOrder === 'full' ? 'active' : ''}`} onClick={() => game.act((st) => setGiantOrder(st, { partOrder: 'full' }))} title="Crown, then limbs, then trunk, then heart">Crown to heart</button>
              <button className={`gem-chip ${s.giant.order.partOrder === 'rush' ? 'active' : ''}`} onClick={() => game.act((st) => setGiantOrder(st, { partOrder: 'rush' }))} title="Skip the crown and limbs: trunk, then heart">Rush the heart</button>
            </div>
            <HelpTip
              label="Part order"
              tip="Crown to heart harvests every drop before felling. Rush the heart cuts straight through the Trunk — leftover Crown & Limbs shatter into Splinters for Smelting charcoal."
            />
            {g.fallen && <button className="btn" onClick={() => game.act((st, ctx) => moveOn(st, ctx))} title="Leave the rest of the heart and take the next giant">Move on</button>}
          </div>
          <p className="muted giant-note small">
            {g.fallen
              ? `The giant is down${g.splinters ? `: ${fmt(g.splinters)} splinters from what was left on it` : ''}. Work the Heart for Ancient Heartwood, or Move on.`
              : 'Crown and Limbs can be chopped any time. When the Trunk falls, any leftover Crown/Limbs become Splinters and the Heart opens up.'}
          </p>
          {locked && <p className="bad small">Requires Woodcutting level {w.level}.</p>}
        </div>
        <div>
          {running !== undefined ? (
            <SkillMinigame skill="woodcutting" />
          ) : (
            <div className="card">
              <div className="card-title">The splitting block</div>
              <p className="muted small">Start felling to open the block. Splitting logs evenly builds Focus, which speeds felling up and charges ×2 cuts. Nothing here has a timer.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionCard({ s, g, index }: { s: GameState; g: Giant; index: number }) {
  const reqLevel = woodDef(g.region).level;
  const levelLocked = woodcuttingLevel(s) < reqLevel;
  const blocker = s.giant.current ? 'Finish the current giant first' : levelLocked ? `Requires level ${reqLevel}` : null;
  return (
    <div className={`giant-card ${isLegend(g) ? 'legend' : ''} ${levelLocked ? 'locked' : ''}`}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{giantName(g)}</h3>
        {levelLocked && <LockedBadge level={reqLevel} />}
      </div>
      <GiantChips g={g} />
      <span className="dim small">{fmt(totalMaxHp(g))} cuts, about {duration(fellingTime(g))}</span>
      <button
        className="btn sm primary"
        disabled={!!blocker}
        title={blocker ?? undefined}
        onClick={() => game.act((st) => {
          const err = pickGiant(st, index);
          if (!err && st.action === null) fell();
          return err;
        })}
      >
        Fell this one
      </button>
    </div>
  );
}

function ScoutingTab({ s }: { s: GameState }) {
  const o = s.giant.order;
  const level = woodcuttingLevel(s);
  const region = scoutRegion(s);
  const pick = chooseByOrder(s.giant.options, o);
  return (
    <div className="grid" style={{ gap: 12 }}>
      <SkillIntro step="Pick next Giant">
        Choose which newly spotted Giant to fell next, or set a <b>Standing Order</b> so Woodcutting auto-picks giants while you&apos;re away.
      </SkillIntro>
      <div className="card">
        <div className="card-title">Scouted giants</div>
        {s.giant.options.length === 0 ? (
          <p className="muted">
            {s.giant.current
              ? `The scouts are out in the ${woodDef(region).region}. When ${giantName(s.giant.current)} is down, ${scoutCount(s)} giants are offered here.`
              : 'The scouts are out. Giants are offered here when one is ready.'}
          </p>
        ) : (
          <div className="giant-grid">
            {s.giant.options.map((g, i) => <OptionCard key={g.id} s={s} g={g} index={i} />)}
          </div>
        )}
        {s.giant.options.length > 0 && (
          <div className="giant-actions">
            <button
              className="btn"
              disabled={!!s.giant.current}
              onClick={() => game.act((st) => {
                const err = autoPick(st);
                if (!err && st.action === null) fell();
                return err;
              })}
            >
              Auto-pick{pick >= 0 ? `: ${giantName(s.giant.options[pick])}` : ''}
            </button>
          </div>
        )}
      </div>
      <div className="card">
        <div className="card-title">Scouting target and standing order</div>
        <div className="giant-form">
          <label>Send scouts to
            <select className="input" value={o.region} onChange={(e) => game.act((st) => setGiantOrder(st, { region: e.target.value }))}>
              <option value="auto">Highest unlocked ({woodDef(region).region})</option>
              {unlockedRegions(level).map((w) => <option key={w.id} value={w.id}>{w.region}</option>)}
            </select>
          </label>
          <label>When a giant falls, take
            <select className="input" value={o.pref} onChange={(e) => game.act((st) => setGiantOrder(st, { pref: e.target.value as GiantPref }))}>
              {(Object.keys(PREF_LABEL) as GiantPref[]).map((p) => <option key={p} value={p}>{PREF_LABEL[p]}</option>)}
            </select>
          </label>
          <label><input type="checkbox" checked={o.alwaysLegend} onChange={(e) => game.act((st) => setGiantOrder(st, { alwaysLegend: e.target.checked }))} /> Always take a legend</label>
          <label><input type="checkbox" checked={o.auto} onChange={(e) => game.act((st) => setGiantOrder(st, { auto: e.target.checked }))} /> Pick for me when a giant falls</label>
        </div>
        <p className="muted small giant-note">
          The standing order is used whenever a giant comes down while you are away, and whenever it comes down while you are here if the last box is ticked. The return screen lists which giants were picked.
          {level >= 80 ? ' Legendary giants can turn up in the Ancient, Spirit and Worldwood regions.' : ' From Woodcutting level 80, legendary giants can turn up deep in the forest.'}
        </p>
      </div>
    </div>
  );
}

function CostRow({ s, cost }: { s: GameState; cost: Record<string, number> }) {
  const entries = Object.entries(cost);
  if (!entries.length) return <span className="dim small">No cost</span>;
  return (
    <div className="giant-cost">
      {entries.map(([id, n]) => {
        const have = s.storage.bank[id] ?? 0;
        return (
          <span key={id} className={have < n ? 'short' : ''}>
            <MatIcon id={id} size={12} /> {materialDef(id).name} {fmt(Math.min(have, n))}/{fmt(n)}
          </span>
        );
      })}
    </div>
  );
}

function LodgeCard({ s, def }: { s: GameState; def: LodgeDef }) {
  const tier = lodgeTierOf(s, def.id);
  const next = nextLodgeTier(s, def.id);
  const blocker = lodgeBlocker(s, def.id as LodgeId);
  const levelLocked = !!next && woodcuttingLevel(s) < next.level;
  const legendLocked = def.id === 'trophyWall' && !!next && !s.giant.legends.length;
  return (
    <div className={`giant-card ${levelLocked || legendLocked ? 'locked' : ''}`}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{def.name} <span className="dim small num">{tier}/{def.tiers.length}</span></h3>
        {levelLocked ? (
          <LockedBadge level={next.level} />
        ) : legendLocked ? (
          <LockedBadge reason="Fell a legend first" />
        ) : null}
      </div>
      <span className="muted small">{def.desc}</span>
      {def.tiers.slice(0, tier).map((t, i) => <span key={i} className="small good">Built: {t.effect}</span>)}
      {next ? (
        <>
          <span className="small">Next: {next.effect}</span>
          <span className="dim small">Needs Woodcutting level {next.level}</span>
          <CostRow s={s} cost={next.cost} />
          <button
            className="btn sm primary"
            disabled={!!blocker}
            title={blocker ?? undefined}
            onClick={() => game.act((st, ctx) => buildLodge(st, ctx, def.id))}
          >
            {blocker && blocker !== 'Missing materials' ? blocker : `Build${def.tiers.length > 1 ? ` tier ${next.tier}` : ''}`}
          </button>
        </>
      ) : <Badge tone="success">Fully built</Badge>}
    </div>
  );
}

function WorldTreeCard({ s }: { s: GameState }) {
  const wt = s.giant.worldTree;
  const now = Date.now();
  const growth = worldTreeGrowth(s, now);
  const ready = worldTreeReady(s, now);
  const blocker = plantBlocker(s);
  const daysLeft = wt ? Math.max(0, Math.ceil(((1 - growth) * WORLD_TREE_GROWTH_MS) / 86400000)) : 0;
  return (
    <div className="card">
      <div className="card-title">World Tree <span className="grow" /><span className="card-hint">{s.storage.bank.world_tree_seed ?? 0} seeds</span></div>
      {wt ? (
        <>
          <ProgressBar value={growth} color="var(--success)" label={ready ? 'Fully grown' : `${Math.floor(growth * 100)}%, about ${daysLeft} days to go`} />
          {ready && (
            <div className="giant-actions">
              <button className="btn primary" onClick={() => game.act((st, ctx) => offerWorldTree(st, ctx))}>Offer it to the scouts</button>
            </div>
          )}
          <p className="muted small giant-note">It grows for 120 real days, offline included. Grown, it is a personal legend with the best parts in the game.</p>
        </>
      ) : (
        <>
          <p className="muted small">A very rare seed drops from legendary giants. Plant it here (needs the Trophy Wall) and it grows over 120 days into your own giant.</p>
          <button className="btn sm primary" disabled={!!blocker} title={blocker ?? undefined} onClick={() => game.act((st, ctx) => plantWorldTree(st, ctx))}>{blocker ?? 'Plant the seed'}</button>
        </>
      )}
    </div>
  );
}

function LodgeTab({ s }: { s: GameState }) {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <SkillIntro step="Woodcutter's Lodge">
        Build permanent Woodcutting upgrades from felled timber: extra scouts, Drying Shed bonus logs, the advanced <b>Sawmill</b>, and the <b>Trophy Wall</b>.
      </SkillIntro>
      <div className="card">
        <div className="card-title">The woodcutter&apos;s lodge</div>
        <p className="muted small">A camp at the forest&apos;s edge, built from your own timber. Bigger buildings need wood from deeper regions.</p>
        <div className="giant-grid">
          {LODGE.map((def) => <LodgeCard key={def.id} s={s} def={def} />)}
        </div>
      </div>
      <WorldTreeCard s={s} />
    </div>
  );
}

function RegionsTab({ s }: { s: GameState }) {
  const level = woodcuttingLevel(s);
  const target = scoutRegion(s);
  return (
    <div className="grid" style={{ gap: 12 }}>
      <SkillIntro step="Forest Regions">
        Forest tiers unlocked by Woodcutting level. Each holds a different wood species, Legendary Giants, and a Collectible.
      </SkillIntro>
      <div className="card">
        <div className="card-title">Forest regions</div>
        <div className="giant-grid">
          {WOODS.map((w) => {
            const open = level >= w.level;
            const find = collectibleFor('woodcutting', w.id);
            const found = !!find && s.collectibles.includes(find.id);
            return (
              <div key={w.id} className={`giant-card giant-region-card ${open ? '' : 'locked'}`}>
                <div className="giant-region-head">
                  <img
                    src={TREE_ART[w.id] ?? TREE_ART.ash}
                    alt={w.region}
                    className="giant-region-thumb pack-art crisp"
                    draggable={false}
                  />
                  <div className="grow">
                    <h3 style={{ color: open ? w.color : undefined }}>{w.region}</h3>
                    <span className="small">{w.name} logs &amp; resin</span>
                  </div>
                  {!open && <LockedBadge level={w.level} reason={`Requires Woodcutting level ${w.level}`} />}
                </div>
                <span className="dim small num">Level {w.level} · {(w.ms / 1000).toFixed(1)}s per cut · {w.xp} xp (raw)</span>
                <span className="dim small">Collectible: {found ? find!.name : '???'}</span>
                {open ? (
                  target === w.id
                    ? <Badge tone="success">Scouts sent here</Badge>
                    : <button className="btn sm" onClick={() => game.act((st) => setGiantOrder(st, { region: w.id }))}>Send scouts here</button>
                ) : (
                  <span className="dim small">Unlocks at Woodcutting Lv {w.level}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TrophiesTab({ s }: { s: GameState }) {
  const wall = s.giant.lodge.trophyWall >= 1;
  return (
    <div className="grid" style={{ gap: 12 }}>
      <SkillIntro step="Legendary Trophies">
        Rare drops from named Legendary Giants across each forest — each trophy grants a permanent Woodcutting perk, and collecting all 4 unlocks the World Tree Seed.
      </SkillIntro>
      <div className="card">
        <div className="card-title">
          Trophy Wall
          <span className="grow" />
          {wall ? <Badge tone="success">Wall built</Badge> : <LockedBadge reason="Build Trophy Wall in Lodge" />}
        </div>
        {!wall && (
          <p className="muted small">
            {s.giant.legends.length ? 'Build the Trophy Wall in the Lodge to display your felled legends.' : 'Fell a legendary giant (Lv 80+ in deep forests) to unlock the Trophy Wall in the Lodge.'}
          </p>
        )}
        <div className="giant-grid">
          {LEGENDS.map((l) => {
            const log = s.giant.legendLog[l.id];
            const felled = s.giant.legends.includes(l.id);
            return (
              <div key={l.id} className={`giant-card ${felled ? 'legend' : 'locked'}`}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>{felled ? l.name : '???'}</h3>
                  {!felled && <LockedBadge reason="Not felled yet" />}
                </div>
                <span className="dim small">{woodDef(l.region).region} · Lv 80+</span>
                {felled && wall ? (
                  <>
                    <span className="muted small">{l.desc}</span>
                    {log && <span className="small">Felled {new Date(log.at).toLocaleDateString()}: {yieldWords(log.yields)}</span>}
                  </>
                ) : (
                  <span className="muted small">{felled ? 'Hidden until the Trophy Wall is built in the Lodge.' : 'Spot and fell this Legendary Giant to claim its trophy.'}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Modernized Sawmill view: saw logs into Planks for Woodcrafting and refine Ancient Heartwood. */
export function SawmillView({ go }: { go?: (tab: GiantTab) => void } = {}) {
  const s = useGame();
  const [showLocked, setShowLocked] = useState(false);
  const level = woodcuttingLevel(s);
  const d = deriveStats(s);
  const hasMill = s.giant.lodge.sawmill >= 1;
  const runningAction = s.action?.kind === 'skill' ? s.action : null;

  const allRecipes = actionsFor('woodcutting').filter(
    (a) => a.woodcutting?.mode === 'sawmill' && (!a.batchMastery || masteryLevel(s, `task.${a.batchOf}`) >= a.batchMastery),
  );

  const isLocked = (a: SkillAction) => level < a.level || !!woodcuttingAccessHint(s, a);
  const openRecipes = allRecipes.filter((a) => !isLocked(a));
  const lockedRecipes = allRecipes.filter((a) => isLocked(a));
  const visibleLocked = showLocked ? lockedRecipes : lockedRecipes.slice(0, 2);
  const hiddenLockedCount = Math.max(0, lockedRecipes.length - visibleLocked.length);
  const shownRecipes = [...openRecipes, ...visibleLocked];

  return (
    <div className="sawmill-view">
      <SkillIntro step="Saw logs into Planks">
        Turn felled logs into <b>Planks</b> for Woodcrafting weapons &amp; armour, and refine Heartwood Fragments into <b>Ancient Heartwood</b> for the Woodcutter&apos;s Lodge and Masterworks.
      </SkillIntro>

      <div className="card sawmill-status">
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div>
            <b>Lodge Sawmill Status</b>
            <p className="muted small" style={{ margin: '2px 0 0' }}>
              Ash (Lv 1), Oak (Lv 15), and Yew (Lv 30) planks are open immediately. Ironwood+ planks and Ancient Heartwood refining unlock after building the Sawmill in the Lodge.
            </p>
          </div>
          <span className="grow" />
          {hasMill ? (
            <Badge tone="success">Sawmill built</Badge>
          ) : (
            <div className="row" style={{ gap: 6 }}>
              <LockedBadge level={45} reason="Build Sawmill in the Lodge (Lv 45, 400 Ironwood Logs)" />
              {go && (
                <button type="button" className="btn sm" onClick={() => go('lodge')}>
                  Open Lodge
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <SkillMinigame skill="woodcutting" />

      <div className="sawmill-head">
        <span className="muted small">
          Showing {openRecipes.length} unlocked{visibleLocked.length > 0 ? ` + ${visibleLocked.length} upcoming` : ''} recipes
        </span>
        {lockedRecipes.length > 2 && (
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => setShowLocked((v) => !v)}
          >
            {showLocked ? 'Hide locked' : `Show locked (${hiddenLockedCount} more)`}
          </button>
        )}
      </div>

      <div className="sawmill-grid">
        {shownRecipes.map((a) => {
          const outEntries = Object.entries(a.outputs ?? a.protectedOutputs ?? {});
          const [outputId, outputQty] = outEntries[0] ?? ['ash_plank', 1];
          const accessHint = woodcuttingAccessHint(s, a);
          const levelLocked = level < a.level;
          const locked = levelLocked || !!accessHint;
          const blocker = actionBlocker(s, a);
          const active = runningAction?.actionId === a.id;
          const interval = actionIntervalMs(s, a, d);

          return (
            <article key={a.id} className={`card sawmill-card ${active ? 'running' : ''} ${locked ? 'locked' : ''}`} data-tut={`action-${a.id}`}>
              <div className="sawmill-card-head">
                <div className="sawmill-card-icon">
                  <MatIcon id={outputId} size={22} />
                </div>
                <div className="sawmill-card-title">
                  <b>{a.name}</b>
                  <span className="dim small num">
                    Makes ×{fmt(outputQty)} {materialDef(outputId).name}
                    {a.protectedOutputs ? ' · protected' : ''}
                  </span>
                </div>
                {locked ? (
                  <LockedBadge
                    level={levelLocked ? a.level : undefined}
                    reason={accessHint ?? `Requires Woodcutting level ${a.level}`}
                  />
                ) : active ? (
                  <button type="button" className="btn sm" onClick={() => game.act(stopAction)}>
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`btn sm ${blocker ? '' : 'primary'}`}
                    disabled={!!blocker}
                    title={blocker ?? undefined}
                    onClick={() => game.act((st, ctx) => startSkillAction(st, ctx, a.id))}
                  >
                    {blocker === 'Missing materials' ? 'Missing' : blocker ? 'Locked' : 'Saw'}
                  </button>
                )}
              </div>

              <div className="sawmill-card-meta num small muted">
                <span>Lv {a.level}</span>
                <span>{(interval / 1000).toFixed(1)}s</span>
                <span>{a.xp} XP</span>
              </div>

              {a.inputs && (
                <div className="sawmill-inputs">
                  <Cost cost={a.inputs} have={s.storage.bank} />
                  <span className="dim small num">
                    Owned:{' '}
                    {Object.entries(a.inputs)
                      .map(([id]) => `${fmt(recipeMaterialCount(s.storage.bank, id))} ${materialDef(id).name}`)
                      .join(' · ')}
                  </span>
                </div>
              )}

              {locked && accessHint && <p className="muted small" style={{ margin: 0 }}>{accessHint}</p>}
              {active && runningAction && <ProgressBar value={runningAction.progress / interval} color={a.color} />}
              {!locked && <MasteryProgress s={s} mastery={a.mastery} compact />}
            </article>
          );
        })}
      </div>
    </div>
  );
}

/** The Woodcutting screen's content for one of its tabs. */
export function GiantView({ tab, go }: { tab: GiantTab; go: (tab: GiantTab) => void }) {
  const s = useGame();
  switch (tab) {
    case 'scouting': return <ScoutingTab s={s} />;
    case 'lodge': return <LodgeTab s={s} />;
    case 'regions': return <RegionsTab s={s} />;
    case 'trophies': return <TrophiesTab s={s} />;
    default: return <GiantTab s={s} go={go} />;
  }
}
