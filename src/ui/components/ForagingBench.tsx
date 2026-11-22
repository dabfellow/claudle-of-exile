import { useState, type ReactNode } from 'react';
import {
  ALL_MUTATIONS, ALL_SPECIES, HERBARIUM_PERKS, STABILISATION_PERKS,
  hybridForParents, mutationDef, speciesDef,
} from '../../data/foraging';
import { actionDef, actionsFor } from '../../data/skills';
import {
  discoveredHybridHints, greenhousePlotCount, harvestPlot, herbariumCount,
  inheritanceBonusPct, openAllSeedPackets, openSeedPacket, parseStrain,
  plantPlot, plotDurationMs, stableStrainCount, strainHighestTier, strainLabel,
} from '../../engine/foraging';
import { actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { EmptyState, fmtTime, GameIcon, ProgressBar, Tabs, type TabDef } from './common';
import { MasteryProgress } from './MasteryProgress';
import { HelpTip, LockedBadge, SkillIntro } from './SkillHelp';
import { SkillMinigame } from './SkillMinigame';
import './foraging-bench.css';

type ForagingTab = 'greenhouse' | 'wild' | 'seeds' | 'herbarium' | 'masterworks';

function MutationTags({ mutations }: { mutations: string[] }) {
  if (!mutations.length) return <span className="muted small">Plain strain</span>;
  return <div>{mutations.map((id) => {
    const def = mutationDef(id);
    return <span key={id} className={`foraging-mut-tag ${def?.tier ?? 'common'}`} title={def?.effect}>{def?.name ?? id}</span>;
  })}</div>;
}

export function SeedPackets() {
  const s = useGame();
  const [revealed, setRevealed] = useState<string[]>([]);
  const pending = s.foraging.packets.length;
  if (!pending && !revealed.length) return null;
  return <section className="away-alert foraging-packets" aria-label="Seed packets">
    <div className="row">
      <b>Seed packets ({pending} sealed)</b>
      <span className="spacer" />
      {pending > 0 && <button className="btn sm primary" onClick={() => {
        const next = game.act((st) => openSeedPacket(st));
        if (next) setRevealed((prev) => [next, ...prev]);
      }}>Open one</button>}
      {pending > 1 && <button className="btn sm" onClick={() => {
        const all = game.act((st) => openAllSeedPackets(st));
        if (all?.length) setRevealed((prev) => [...all, ...prev]);
      }}>Open all</button>}
      {revealed.length > 0 && <button className="btn sm" onClick={() => setRevealed([])}>Clear</button>}
    </div>
    {revealed.slice(0, 12).map((key, idx) => {
      const { mutations } = parseStrain(key);
      const tier = strainHighestTier(key) ?? 'common';
      const triple = mutations.length >= 3;
      return <div key={`${key}-${idx}`} className={`foraging-packet-reveal ${tier} ${triple ? 'triple' : ''}`}>
        <b>{strainLabel(key)}</b>
        {triple && <span className="good"> · Three-Mutation Find!</span>}
        <MutationTags mutations={mutations} />
      </div>;
    })}
    {revealed.length > 12 && <p className="muted small">+{revealed.length - 12} more packets opened.</p>}
  </section>;
}

function GreenhouseTab({ s, notify, onGoWild }: { s: GameState; notify: (msg: string) => void; onGoWild: () => void }) {
  const plots = greenhousePlotCount(s);
  const [plantingPlot, setPlantingPlot] = useState<number | null>(null);
  const [parent1, setParent1] = useState('');
  const [parent2, setParent2] = useState('');
  const now = Date.now();
  const plantable = Object.keys(s.foraging.strains)
    .filter((k) => (s.foraging.seeds[k] ?? 0) > 0 || s.foraging.strains[k]?.stable)
    .sort();

  if (plots === 0) {
    return <section className="card">
      <h3>Greenhouse</h3>
      <p className="muted">Unlocks at Foraging level 5 with 2 plots. Forage wild patches to collect your first seeds and variants.</p>
    </section>;
  }

  const p1 = parseStrain(parent1);
  const p2 = parseStrain(parent2);
  const lvl = skillLevel(s, 'harvesting');
  const hyb = parent1 && parent2 && lvl >= 80 ? hybridForParents(p1.species, p2.species) : undefined;
  const inheritPct = parent1 && parent2 ? Math.min(95, 50 + inheritanceBonusPct(s, [parent1, parent2])) : 50;

  return <section className="card">
    <SkillIntro
      step="Greenhouse"
      action={!plantable.length ? <button className="btn sm" onClick={onGoWild}>Forage Wild</button> : undefined}
    >
      Plant a single seed to harvest herbs &amp; essences, or cross two parents to pass on mutations, build generation stability, and breed Lv 80 hybrids.{' '}
      <HelpTip tip="Crossing identical strains 5 times (3 with Deep-rooted) stabilises them so they never consume seeds when planted." />
    </SkillIntro>
    <h3>Greenhouse · {plots} plots</h3>
    <div className="foraging-plots">
      {Array.from({ length: plots }, (_, i) => {
        const plot = s.foraging.plots[i] ?? null;
        if (!plot) {
          return <div key={i} className="foraging-plot">
            <b>Plot {i + 1} · Empty</b>
            <button className="btn sm primary" onClick={() => { setPlantingPlot(i); setParent1(plantable[0] ?? ''); setParent2(''); }}>Plant or cross</button>
          </div>;
        }
        const remaining = Math.max(0, plot.readyAt - now);
        const total = Math.max(1, plot.readyAt - plot.plantedAt);
        const ready = remaining <= 0;
        const mainSp = speciesDef(parseStrain(plot.parents[0]).species);
        return <div key={i} className={`foraging-plot ${ready ? 'ready' : ''}`}>
          <div className="foraging-plot-plant">
            <span className="foraging-swatch" style={{ background: mainSp?.color ?? '#6ec878' }} />
            <div>
              <b>{plot.parents.length === 1 ? strainLabel(plot.parents[0]) : 'Crossbreeding'}</b>
              <div className="small muted">{plot.parents.length === 2 ? `${strainLabel(plot.parents[0])} × ${strainLabel(plot.parents[1])}` : 'Growing'}</div>
            </div>
          </div>
          {plot.parents.length === 1 && <MutationTags mutations={parseStrain(plot.parents[0]).mutations} />}
          <ProgressBar value={ready ? 1 : Math.max(0, 1 - remaining / total)} />
          <div className="row">
            <span className="small muted">{ready ? 'Ready to harvest' : fmtTime(remaining)}</span>
            <span className="spacer" />
            <button className="btn sm primary" disabled={!ready} onClick={() => {
              const res = game.act((st, ctx) => harvestPlot(st, ctx, i, Date.now()));
              if (typeof res === 'string') notify(res);
              else if (res) {
                if (res.mode === 'grow') notify(`Harvested ${res.herbs?.qty ?? 0} ${strainLabel(res.herbs?.strain ?? '')}${res.replanted ? ' (Everbloom replanted!)' : ''}`);
                else notify(`Cross harvested: ${res.seeds.map(strainLabel).join(', ')}${res.stabilised ? ` · ${strainLabel(res.stabilised)} stabilised!` : ''}`);
              }
            }}>Harvest</button>
          </div>
        </div>;
      })}
    </div>

    {plantingPlot !== null && <div className="card" style={{ marginTop: 12 }}>
      <div className="row"><b>Plant in Plot {plantingPlot + 1}</b><span className="spacer" /><button className="btn sm" onClick={() => setPlantingPlot(null)}>Close</button></div>
      {!plantable.length ? <p className="muted small">You have no seeds yet. Forage in Wild patches to collect seeds.</p> : <>
        <label>Seed 1 <select value={parent1} onChange={(e) => setParent1(e.target.value)}>
          {plantable.map((k) => <option key={k} value={k}>
            {strainLabel(k)} · {s.foraging.strains[k]?.stable ? 'Stable (free)' : `${s.foraging.seeds[k] ?? 0} seeds`}
          </option>)}
        </select></label>
        <label>Second parent (optional — leave blank to grow herbs) <select value={parent2} onChange={(e) => setParent2(e.target.value)}>
          <option value="">Grow single strain for herbs</option>
          {plantable.map((k) => <option key={k} value={k}>
            {strainLabel(k)} · {s.foraging.strains[k]?.stable ? 'Stable (free)' : `${s.foraging.seeds[k] ?? 0} seeds`}
          </option>)}
        </select></label>
        {parent1 && <p className="muted small">
          Duration: {fmtTime(plotDurationMs(s, parent2 ? [parent1, parent2] : [parent1]))}
          {parent2 && ` · Inheritance: ${parent1 === parent2 && s.foraging.strains[parent1]?.stable ? '100% (Stable)' : `${inheritPct}% per trait`}`}
          {hyb && ` · Hybrid possible!`}
        </p>}
        <button className="btn primary" disabled={!parent1} onClick={() => {
          const err = game.act((st) => plantPlot(st, plantingPlot, parent2 ? [parent1, parent2] : [parent1], Date.now()));
          notify(err ?? (parent2 ? 'Cross planted.' : 'Strain planted.'));
          if (!err) setPlantingPlot(null);
        }}>{parent2 ? 'Plant cross' : 'Plant strain'}</button>
      </>}
    </div>}
  </section>;
}

function WildTab({ s, notify }: { s: GameState; notify: (msg: string) => void }) {
  const [showAllLocked, setShowAllLocked] = useState(false);
  const level = skillLevel(s, 'harvesting');
  const d = deriveStats(s);
  const patches = actionsFor('harvesting');
  const unlockedPatches = patches.filter((a) => a.level <= level);
  const lockedPatches = patches.filter((a) => a.level > level);
  const visiblePatches = showAllLocked ? patches : [...unlockedPatches, ...lockedPatches.slice(0, 2)];
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'harvesting' ? s.action : null;

  return <section className="card">
    <SkillIntro step="Wild Foraging">
      Forage patches for Alchemy herbs and rare Seed Packets for your Lv 5 Greenhouse.
    </SkillIntro>
    <div className="row wrap" style={{ marginBottom: 8 }}>
      <h3 style={{ margin: 0 }}>Wild patches</h3>
      <span className="spacer" />
      {lockedPatches.length > 2 && (
        <label className="small row" style={{ gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={showAllLocked} onChange={(e) => setShowAllLocked(e.target.checked)} />
          Show all locked ({lockedPatches.length})
        </label>
      )}
    </div>
    <SkillMinigame skill="harvesting" />
    <div className="foraging-grid" style={{ marginTop: 10 }}>
      {visiblePatches.map((a) => {
        const active = running?.actionId === a.id;
        const locked = a.level > level;
        return <div key={a.id} className={`foraging-card ${locked ? 'locked' : ''}`}>
          <div className="foraging-card-head">
            <span className="foraging-swatch" style={{ background: a.color }} />
            <b>{a.name}</b>
            <span className="spacer" />
            {locked ? <LockedBadge level={a.level} /> : <span className="small muted">Lv {a.level}</span>}
          </div>
          <p className="small muted">{fmtTime(actionIntervalMs(s, a, d))} · {a.xp} XP · 1% seed · 2% variant</p>
          <MasteryProgress s={s} mastery={a.mastery} compact />
          {active && <ProgressBar value={running.progress / actionIntervalMs(s, a, d)} />}
          <button className={`btn sm ${active ? '' : 'primary'}`} disabled={locked} onClick={() => {
            if (active) game.act(stopAction);
            else notify(game.act((st, ctx) => startSkillAction(st, ctx, a.id)) ?? '');
          }}>{locked ? `Needs Lv ${a.level}` : active ? 'Stop' : 'Forage'}</button>
        </div>;
      })}
    </div>
  </section>;
}

function SeedsTab({ s, onGoWild }: { s: GameState; onGoWild: () => void }) {
  const [mutFilter, setMutFilter] = useState('');
  const allStrains = Object.keys(s.foraging.strains);
  const entries = allStrains
    .filter((k) => !mutFilter || parseStrain(k).mutations.includes(mutFilter))
    .sort();
  const sealed = s.foraging.packets.length;

  return <section className="card">
    <SkillIntro step="Seeds">
      Seed Packets come from Wild foraging: 1% plain seeds (guaranteed by 100 harvests), 2% mutated variants.
    </SkillIntro>
    <div className="row wrap">
      <h3>Seeds &amp; strain herbs</h3>
      <span className="spacer" />
      <label className="small">Filter mutation <select value={mutFilter} onChange={(e) => setMutFilter(e.target.value)}>
        <option value="">All strains</option>
        {ALL_MUTATIONS.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.tier})</option>)}
      </select></label>
    </div>
    {allStrains.length === 0 ? (
      <EmptyState
        icon={<GameIcon name="harvesting" size={28} />}
        title="No seeds or discovered strains yet"
        action={<button className="btn sm primary" onClick={onGoWild}>Go to Wild foraging</button>}
      >
        {sealed > 0
          ? `You have ${sealed} sealed Seed Packet${sealed === 1 ? '' : 's'} at the top of the bench — open them to reveal your seeds!`
          : 'Forage Wild patches to collect Alchemy herbs and find Seed Packets (1% plain seed, 2% mutated variant).'}
      </EmptyState>
    ) : !entries.length ? (
      <EmptyState small title="No matching strains">
        None of your discovered strains carry that mutation yet.
      </EmptyState>
    ) : <div className="foraging-grid" style={{ marginTop: 8 }}>
      {entries.map((key) => {
        const { species, mutations } = parseStrain(key);
        const rec = s.foraging.strains[key];
        const tier = strainHighestTier(key);
        const seeds = s.foraging.seeds[key] ?? 0;
        const herbs = mutations.length ? (s.foraging.strainHerbs[key] ?? 0) : (s.storage.bank[speciesDef(species)?.herb ?? species] ?? 0);
        return <div key={key} className={`foraging-card ${mutations.length >= 3 ? 'triple' : ''} ${tier === 'giga' ? 'giga' : ''}`}>
          <b>{strainLabel(key)}</b>
          <MutationTags mutations={mutations} />
          <div className="small muted">
            Seeds: {rec.stable ? 'Stable (unlimited)' : seeds} · Herbs: {herbs}
            {!rec.stable && rec.generation > 0 ? ` · Gen ${rec.generation}/${mutations.includes('deep_rooted') ? 3 : 5}` : ''}
          </div>
        </div>;
      })}
    </div>}
  </section>;
}

function HerbariumTab({ s }: { s: GameState }) {
  const count = herbariumCount(s);
  const stable = stableStrainCount(s);
  const hints = discoveredHybridHints(s);

  return <section className="card">
    <SkillIntro step="Herbarium">
      Your pressed catalogue of every unique species × mutation discovered — unlocks permanent plots, grow speed &amp; secret hybrid notes.
    </SkillIntro>
    <h3>Herbarium · {count} strains · {stable} stable</h3>
    <div className="foraging-grid">
      <div className="foraging-card">
        <b>Herbarium perks</b>
        <ul>{HERBARIUM_PERKS.map((p) => <li key={p.entries} className={count >= p.entries ? 'good small' : 'muted small'}>{p.entries} entries · {p.label}</li>)}</ul>
      </div>
      <div className="foraging-card">
        <b>Stabilisation perks</b>
        <ul>{STABILISATION_PERKS.map((p) => <li key={p.points} className={stable >= p.points ? 'good small' : 'muted small'}>{p.points} stable · {p.label}</li>)}</ul>
      </div>
    </div>
    {hints.length > 0 && <div className="foraging-card" style={{ marginTop: 10 }}>
      <b>Hybrid notes</b>
      {hints.map((h) => <p key={h.hybridId} className="small">
        {h.discovered ? <span className="good">{h.hybridName}</span> : <span className="muted">Hint: {h.hybridName}</span>}
        {' — '}
        {speciesDef(h.parents[0])?.name ?? h.parents[0]} × {speciesDef(h.parents[1])?.name ?? h.parents[1]}
      </p>)}
    </div>}
    <div className="foraging-grid" style={{ marginTop: 10 }}>
      {ALL_SPECIES.filter((sp) => !sp.hybrid || Object.keys(s.foraging.strains).some((k) => parseStrain(k).species === sp.id)).map((sp) => {
        const list = Object.keys(s.foraging.strains).filter((k) => parseStrain(k).species === sp.id);
        return <div key={sp.id} className="foraging-card">
          <div className="foraging-card-head"><span className="foraging-swatch" style={{ background: sp.color }} /><b>{sp.name}</b><span className="spacer" /><span className="small muted">{list.length}</span></div>
          {list.length ? list.map((k) => <div key={k} className="small">{strainLabel(k)}{s.foraging.strains[k].stable ? ' ★' : ''}</div>)
            : <span className="small muted">Not yet pressed</span>}
        </div>;
      })}
    </div>
  </section>;
}

export function ForagingBench({ masterworks }: { masterworks: ReactNode }) {
  const s = useGame();
  const hasGreenhouse = greenhousePlotCount(s) > 0;
  const [tab, setTab] = useState<ForagingTab>(() => {
    if (s.professionProgress.activeProject?.project.skill === 'harvesting') return 'masterworks';
    if (!hasGreenhouse) return 'wild';
    if (s.foraging.plots.every((p) => !p) && Object.keys(s.foraging.seeds).length === 0) return 'wild';
    return 'greenhouse';
  });
  const [notice, setNotice] = useState('');

  const benchTabs: TabDef<ForagingTab>[] = [
    { id: 'greenhouse', label: 'Greenhouse', locked: !hasGreenhouse ? 'Unlocks at Foraging Lv 5 (2 plots)' : undefined },
    { id: 'wild', label: 'Wild' },
    { id: 'seeds', label: 'Seeds' },
    { id: 'herbarium', label: 'Herbarium' },
    { id: 'masterworks', label: 'Masterworks' },
  ];

  return <section className="foraging-bench">
    <SeedPackets />
    <Tabs tabs={benchTabs} value={tab} onChange={(next) => { setTab(next); setNotice(''); }} />
    {tab === 'greenhouse' && <GreenhouseTab s={s} notify={setNotice} onGoWild={() => setTab('wild')} />}
    {tab === 'wild' && <WildTab s={s} notify={setNotice} />}
    {tab === 'seeds' && <SeedsTab s={s} onGoWild={() => setTab('wild')} />}
    {tab === 'herbarium' && <HerbariumTab s={s} />}
    {tab === 'masterworks' && masterworks}
    {notice && <p role="status" className="muted small">{notice}</p>}
  </section>;
}
