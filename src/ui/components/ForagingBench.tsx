import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { collectibleFor } from '../../data/collectibles';
import {
  ALL_MUTATIONS, ALL_SPECIES, BASE_SPECIES, HERBARIUM_PERKS, PLOT_UNLOCK_LEVELS,
  RARITY_LABEL, STABILISATION_PERKS, STRAIN_RARITY_ORDER, hybridForParents, mutationDef, seedId, speciesDef,
  type MutationTier, type StrainRarity,
} from '../../data/foraging';
import { isMaterial, materialDef } from '../../data/materials';
import { actionDef, actionsFor, SKILLS } from '../../data/skills';
import {
  discoveredHybridHints, greenhousePlotCount, harvestPlot, herbariumCount,
  inheritanceBonusPct, openAllSeedPackets, openSeedPacket, parseStrain,
  plantPlot, plotDurationMs, stableStrainCount, strainLabel, strainRarity,
} from '../../engine/foraging';
import {
  doubleReady, focusMult, focusOf, maxFocusSpeed, minigameSwing, overflowOf, type SwingResult,
} from '../../engine/minigame';
import { actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { xpToReach } from '../../engine/xp';
import { game, useGame } from '../../game';
import {
  playHarvestSound,
  playPlantSound,
  playSeedSelectSound,
  startGreenhouseAmbience,
  stopGreenhouseAmbience,
} from '../greenhouseAudio';
import { Badge, EmptyState, fmt, fmtTime, GameIcon, MatIcon, ProgressBar, Tabs, type TabDef } from './common';
import { MasteryProgress } from './MasteryProgress';
import { LockedBadge } from './SkillHelp';
import { ForagingBedsIdle, ForagingGame } from './minigames';
import './foraging-bench.css';

type ForagingTab = 'greenhouse' | 'wild' | 'seeds' | 'herbarium' | 'masterworks';

const DOUBLE_HINT = 'Gold is the double zone: pick while glowing gold and your next harvest pays out twice.';
const RESULT_TEXT: Record<SwingResult, string> = {
  double: 'Double!',
  hit: 'Clean hit',
  weak: 'Weak hit',
  miss: 'Miss',
};

function SpeciesIcon({ speciesId, size = 22 }: { speciesId: string; size?: number }) {
  const sp = speciesDef(speciesId);
  if (sp && isMaterial(sp.herb)) return <MatIcon id={sp.herb} size={size} />;
  return (
    <span
      className="foraging-hybrid-badge"
      style={{
        width: size + 2,
        height: size + 2,
        ['--sp-color' as string]: sp?.color ?? '#9fd48c',
      }}
      aria-hidden="true"
    >
      <GameIcon name="harvesting" size={Math.max(12, Math.round(size * 0.68))} color={sp?.color ?? '#9fd48c'} />
    </span>
  );
}

function MutationTags({ mutations, showTier = false }: { mutations: string[]; showTier?: boolean }) {
  if (!mutations.length) return <span className="muted small">Plain strain</span>;
  return (
    <div className="foraging-mut-row">
      {mutations.map((id) => {
        const def = mutationDef(id);
        const tier: MutationTier = def?.tier ?? 'magic';
        return (
          <span key={id} className={`foraging-mut-tag ${tier}`} title={def?.effect}>
            {showTier && <small className="foraging-mut-tier">{RARITY_LABEL[tier]}</small>}
            {def?.name ?? id}
          </span>
        );
      })}
    </div>
  );
}

function formatChance(chance: number): string {
  const pct = +(chance * 100).toFixed(1);
  return pct % 1 === 0 ? `${Math.round(pct)}%` : `${pct}%`;
}

export function SeedPackets() {
  const s = useGame();
  const [revealed, setRevealed] = useState<string[]>([]);
  const pending = s.foraging.packets.length;
  if (!pending && !revealed.length) return null;

  return (
    <section className="away-alert foraging-packets" aria-label="Seed packets">
      <div className="row wrap">
        <span className="foraging-packet-seal" aria-hidden="true">🌿</span>
        <div className="grow">
          <b>Seed Packets · {pending} found away</b>
          <div className="small muted">Seeds found while away — already added to your Seeds tab.</div>
        </div>
        {pending > 0 && (
          <button
            type="button"
            className="btn sm primary"
            onClick={() => {
              const next = game.act((st) => openSeedPacket(st));
              if (next) setRevealed((prev) => [next, ...prev]);
            }}
          >
            Reveal one
          </button>
        )}
        {pending > 1 && (
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              const all = game.act((st) => openAllSeedPackets(st));
              if (all?.length) setRevealed((prev) => [...all, ...prev]);
            }}
          >
            Reveal all ({pending})
          </button>
        )}
        {revealed.length > 0 && (
          <button type="button" className="btn sm ghost" onClick={() => setRevealed([])}>
            Clear
          </button>
        )}
      </div>

      {revealed.length > 0 && (
        <div className="foraging-packet-grid">
          {revealed.slice(0, 12).map((key, idx) => {
            const { species, mutations } = parseStrain(key);
            const rarity = strainRarity(key);
            const triple = mutations.length >= 3;
            return (
              <div key={`${key}-${idx}`} className={`foraging-packet-reveal ${rarity} ${triple ? 'triple' : ''}`}>
                <div className="row" style={{ gap: 8 }}>
                  <SpeciesIcon speciesId={species} size={20} />
                  <b>{strainLabel(key)}</b>
                  <span className={`foraging-rarity-pill ${rarity}`}>{RARITY_LABEL[rarity]}</span>
                  {triple && <Badge tone="gold">3-Trait Find!</Badge>}
                </div>
                <MutationTags mutations={mutations} showTier />
              </div>
            );
          })}
        </div>
      )}
      {revealed.length > 12 && <p className="muted small" style={{ margin: 0 }}>+{revealed.length - 12} more packets opened.</p>}
    </section>
  );
}

function SproutingStemSvg({ color, stage }: { color: string; stage: 'seed' | 'sprout' | 'bud' | 'bloom' }) {
  return (
    <svg className={`gh-plant-svg ${stage}`} viewBox="0 0 110 64" aria-hidden="true">
      {stage === 'seed' && (
        <g>
          <path d="M55 60 Q55 48 52 40" stroke="#76b868" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M52 44 C45 41 42 46 47 49 C50 51 53 47 52 44 Z" fill="#89cf77" />
          <path d="M55 46 C62 42 66 47 60 51 C57 52 55 49 55 46 Z" fill="#6fb962" />
        </g>
      )}
      {(stage === 'sprout' || stage === 'bud' || stage === 'bloom') && (
        <g>
          <path
            d={stage === 'bloom' ? 'M55 60 Q52 40 55 18' : stage === 'bud' ? 'M55 60 Q53 42 55 24' : 'M55 60 Q54 46 55 32'}
            stroke="#73ba65"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M54 50 C39 45 34 52 42 56 C48 58 53 54 54 50 Z" fill="#66ad5a" />
          <path d="M56 46 C71 40 76 48 68 53 C62 56 57 51 56 46 Z" fill="#7ac56b" />
          {(stage === 'bud' || stage === 'bloom') && (
            <>
              <path d="M54 34 C41 27 36 33 43 38 C48 41 53 38 54 34 Z" fill="#83cf74" />
              <path d="M56 32 C69 25 74 32 67 37 C61 40 56 36 56 32 Z" fill="#6cb85f" />
            </>
          )}
          {stage === 'bloom' && (
            <circle cx="55" cy="18" r="14" fill={color} opacity="0.22" />
          )}
        </g>
      )}
    </svg>
  );
}

function BedPlantVisual({
  mode,
  species1,
  species2,
  pct,
  ready,
  rarity,
  isHybrid,
}: {
  mode: 'empty' | 'grow' | 'cross';
  species1?: string;
  species2?: string;
  pct: number;
  ready: boolean;
  rarity?: StrainRarity;
  isHybrid?: boolean;
}) {
  if (mode === 'empty') {
    return (
      <div className="gh-bed-canopy is-empty">
        <svg className="gh-empty-sprout" viewBox="0 0 80 50" aria-hidden="true">
          <path d="M40 46 V26" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
          <path d="M40 32 C31 28 28 34 35 37 C38 38 40 35 40 32 Z" fill="currentColor" opacity="0.55" />
          <path d="M40 28 C49 24 52 30 45 33 C42 34 40 31 40 28 Z" fill="currentColor" opacity="0.55" />
        </svg>
        <div className="gh-soil-mound is-empty" />
      </div>
    );
  }

  const sp1 = species1 ? speciesDef(species1) : undefined;
  const color1 = sp1?.color ?? '#8ee88a';

  if (mode === 'cross' && species1 && species2) {
    const sp2 = speciesDef(species2);
    return (
      <div className={`gh-bed-canopy cross ${ready ? 'ready' : ''} ${isHybrid ? 'hybrid' : ''}`}>
        <div className="gh-cross-pair">
          <div className="gh-plant-col">
            <div className="gh-plant-crown" style={{ ['--bed-color' as string]: color1 } as CSSProperties}>
              <SpeciesIcon speciesId={species1} size={ready ? 30 : 25} />
            </div>
            <SproutingStemSvg color={color1} stage={ready ? 'bloom' : pct >= 0.45 ? 'bud' : 'sprout'} />
          </div>

          <svg className="gh-pollination-svg" viewBox="0 0 64 46" aria-hidden="true">
            <path d="M6 26 Q32 4 58 26" className="gh-pollination-arc" />
            <circle cx="19" cy="17" r="2.2" className="gh-pollen-bead a" />
            <circle cx="32" cy="14" r="2.7" className="gh-pollen-bead b" />
            <circle cx="45" cy="17" r="2.2" className="gh-pollen-bead c" />
          </svg>

          <div className="gh-plant-col">
            <div className="gh-plant-crown" style={{ ['--bed-color' as string]: sp2?.color ?? '#d4a9ff' } as CSSProperties}>
              <SpeciesIcon speciesId={species2} size={ready ? 30 : 25} />
            </div>
            <SproutingStemSvg color={sp2?.color ?? '#d4a9ff'} stage={ready ? 'bloom' : pct >= 0.45 ? 'bud' : 'sprout'} />
          </div>
        </div>
        <div className="gh-soil-mound" />
      </div>
    );
  }

  const stage: 'seed' | 'sprout' | 'bud' | 'bloom' = ready ? 'bloom' : pct >= 0.6 ? 'bud' : pct >= 0.25 ? 'sprout' : 'seed';
  return (
    <div
      className={`gh-bed-canopy grow ${stage} ${rarity ?? 'normal'}`}
      style={{ ['--bed-color' as string]: color1 } as CSSProperties}
    >
      <div className="gh-single-plant">
        {stage !== 'seed' && species1 && (
          <div className="gh-plant-crown">
            <SpeciesIcon speciesId={species1} size={ready ? 36 : stage === 'bud' ? 30 : 22} />
          </div>
        )}
        <SproutingStemSvg color={color1} stage={stage} />
        {ready && (
          <>
            <span className="gh-sparkle a" aria-hidden="true" />
            <span className="gh-sparkle b" aria-hidden="true" />
            <span className="gh-sparkle c" aria-hidden="true" />
          </>
        )}
      </div>
      <div className="gh-soil-mound" />
    </div>
  );
}

function GreenhouseTab({
  s,
  notify,
  onGoWild,
  preselectedSeed,
  onClearPreselected,
}: {
  s: GameState;
  notify: (msg: string) => void;
  onGoWild: () => void;
  preselectedSeed: string | null;
  onClearPreselected: () => void;
}) {
  const plots = greenhousePlotCount(s);
  const unlocked = plots > 0;
  const lvl = skillLevel(s, 'harvesting');
  const hCount = herbariumCount(s);

  const [ambienceOn, setAmbienceOn] = useState(false);
  useEffect(() => {
    if (!unlocked) setAmbienceOn(false);
    return stopGreenhouseAmbience;
  }, [unlocked]);

  const plantable = Object.keys(s.foraging.strains)
    .filter((k) => (s.foraging.seeds[k] ?? 0) > 0 || s.foraging.strains[k]?.stable)
    .sort((a, b) => {
      const ra = STRAIN_RARITY_ORDER.indexOf(strainRarity(a));
      const rb = STRAIN_RARITY_ORDER.indexOf(strainRarity(b));
      if (rb !== ra) return rb - ra;
      return strainLabel(a).localeCompare(strainLabel(b));
    });

  const [plantingPlot, setPlantingPlot] = useState<number | null>(() => {
    if (plots === 0) return null;
    if (preselectedSeed) {
      const firstEmpty = Array.from({ length: plots }, (_, i) => i).find((i) => !s.foraging.plots[i]);
      if (firstEmpty !== undefined) return firstEmpty;
    }
    const hasSeed = Object.keys(s.foraging.strains).some(
      (k) => (s.foraging.seeds[k] ?? 0) > 0 || s.foraging.strains[k]?.stable,
    );
    const allEmpty = s.foraging.plots.slice(0, plots).every((p) => !p);
    return hasSeed && allEmpty ? 0 : null;
  });
  const [mode, setMode] = useState<'grow' | 'cross'>('grow');
  const [parent1, setParent1] = useState<string>(() => preselectedSeed ?? plantable[0] ?? '');
  const [parent2, setParent2] = useState<string>('');
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [satchelFilter, setSatchelFilter] = useState<'all' | StrainRarity | 'stable'>('all');

  useEffect(() => {
    if (!preselectedSeed || !unlocked) return;
    const firstEmpty = Array.from({ length: plots }, (_, i) => i).find((i) => !s.foraging.plots[i]);
    if (firstEmpty !== undefined) {
      setPlantingPlot(firstEmpty);
      setParent1(preselectedSeed);
      setSatchelFilter('all');
    } else {
      notify('All Glasshouse beds are occupied — harvest a ready bed first.');
    }
    onClearPreselected();
  }, [preselectedSeed, unlocked, plots]);

  if (plots === 0) {
    return (
      <section className="card">
        <h3>The Glasshouse</h3>
        <p className="muted">Unlocks at Foraging level 5 with 2 conservatory beds. Forage wild patches to collect your first seeds and variants.</p>
      </section>
    );
  }

  const now = Date.now();
  const activePlots = s.foraging.plots.slice(0, plots).filter(Boolean).length;
  const readyIndices = s.foraging.plots
    .slice(0, plots)
    .map((p, idx) => (p && now >= p.readyAt ? idx : -1))
    .filter((idx) => idx >= 0);

  const nextLevelPlot = PLOT_UNLOCK_LEVELS.find((l) => l > lvl);
  const nextHerbariumPlot = hCount < 10 ? 10 : hCount < 100 ? 100 : null;
  const nextPlotText = [
    nextLevelPlot ? `Lv ${nextLevelPlot}` : null,
    nextHerbariumPlot ? `${nextHerbariumPlot} strains` : null,
  ].filter(Boolean).join(' or ');

  const effectivePlot = plantingPlot !== null && plantingPlot >= 0 && plantingPlot < plots && !s.foraging.plots[plantingPlot] ? plantingPlot : null;
  const safeP1 = plantable.includes(parent1) ? parent1 : '';
  const safeP2 = plantable.includes(parent2) ? parent2 : '';

  const openBenchFor = (plotIdx: number) => {
    setPlantingPlot(plotIdx);
    if (!safeP1 && plantable.length) setParent1(plantable[0]);
    if (mode === 'cross' && !safeP2) setActiveSlot(safeP1 ? 2 : 1);
    playSeedSelectSound();
  };

  const toggleAmbience = () => {
    if (ambienceOn) stopGreenhouseAmbience();
    else startGreenhouseAmbience();
    setAmbienceOn(!ambienceOn);
  };

  const canSelfCross = (key: string) => !!s.foraging.strains[key]?.stable || (s.foraging.seeds[key] ?? 0) >= 2;
  const canPlant =
    effectivePlot !== null &&
    (mode === 'grow'
      ? !!safeP1
      : !!safeP1 && !!safeP2 && (safeP1 !== safeP2 || canSelfCross(safeP1)));

  const p1 = parseStrain(safeP1);
  const p2 = parseStrain(safeP2);
  const hyb = mode === 'cross' && safeP1 && safeP2 && lvl >= 80 ? hybridForParents(p1.species, p2.species) : undefined;
  const inheritPct = mode === 'cross' && safeP1 && safeP2 ? Math.min(95, 50 + inheritanceBonusPct(s, [safeP1, safeP2])) : 50;
  const stCount = stableStrainCount(s);
  const newMutPct = 10 + (stCount >= 1 ? 5 : 0);
  const sp1Def = speciesDef(p1.species);
  const sp2Def = speciesDef(p2.species);
  const growExtraHerbs = (p1.mutations.includes('bountiful') ? 1 : 0) + (p1.mutations.includes('overflowing') ? 3 : 0);
  const growSeedsBack = 1 + (p1.mutations.includes('twin_headed') ? 1 : 0);
  const offspringSeeds = 3 + (stCount >= 6 ? 1 : 0);
  const combinedParentMuts = [...new Set([...p1.mutations, ...p2.mutations])];

  const satchelRarityCounts = STRAIN_RARITY_ORDER.map((r) => ({
    rarity: r,
    count: plantable.filter((k) => strainRarity(k) === r).length,
  })).filter((x) => x.count > 0);
  const stableSeeds = plantable.filter((k) => !!s.foraging.strains[k]?.stable);
  const filteredSatchel = plantable.filter((k) => {
    if (satchelFilter === 'stable') return !!s.foraging.strains[k]?.stable;
    if (satchelFilter !== 'all') return strainRarity(k) === satchelFilter;
    return true;
  });

  const handleSeedTileClick = (key: string) => {
    playSeedSelectSound();
    if (mode === 'grow') {
      setParent1(key);
      return;
    }
    if (activeSlot === 1) {
      setParent1(key);
      if (!safeP2) setActiveSlot(2);
    } else {
      setParent2(key);
      if (!safeP1) setActiveSlot(1);
    }
  };

  return (
    <section className="card foraging-conservatory" aria-label="The Glasshouse conservatory">
      <div className="gh-sky-motes" aria-hidden="true">
        <span className="gh-mote m1" />
        <span className="gh-mote m2" />
        <span className="gh-mote m3" />
        <span className="gh-mote m4" />
        <span className="gh-mote m5" />
      </div>

      <header className="gh-header">
        <div>
          <span className="gh-eyebrow">Conservatory · Grows in real time while you forage or fight</span>
          <h2>The Glasshouse</h2>
        </div>

        <div className="gh-header-controls">
          <Badge tone={activePlots > 0 ? 'gold' : 'neutral'}>{activePlots}/{plots} beds growing</Badge>
          {nextPlotText && <span className="gh-next-pill small">Next bed: {nextPlotText}</span>}
          {readyIndices.length >= 2 && (
            <button
              type="button"
              className="btn sm primary gh-harvest-all"
              onClick={() => {
                let harvested = 0;
                let special = false;
                for (const idx of readyIndices) {
                  const res = game.act((st, ctx) => harvestPlot(st, ctx, idx, Date.now()));
                  if (typeof res === 'object' && res) {
                    harvested++;
                    if (res.mode === 'cross' || res.essences.length > 0 || res.replanted || res.stabilised) special = true;
                  }
                }
                if (harvested > 0) {
                  playHarvestSound(special);
                  notify(`Harvested ${harvested} ready Glasshouse beds.`);
                }
              }}
            >
              Harvest all ({readyIndices.length})
            </button>
          )}
          <button
            type="button"
            className={`gh-sound-toggle ${ambienceOn ? 'on' : ''}`}
            aria-pressed={ambienceOn}
            title="Toggle ambient rain on conservatory glass and water droplets"
            onClick={toggleAmbience}
          >
            <span aria-hidden="true">{ambienceOn ? '🔊' : '🔇'}</span>
            <span>Rain &amp; Glass</span>
          </button>
        </div>
      </header>

      <div className="gh-beds">
        {Array.from({ length: plots }, (_, i) => {
          const plot = s.foraging.plots[i] ?? null;
          if (!plot) {
            const isSelected = effectivePlot === i;
            return (
              <article
                key={i}
                className={`gh-bed is-empty ${isSelected ? 'selected' : ''}`}
                onClick={() => (plantable.length ? openBenchFor(i) : onGoWild())}
              >
                <div className="gh-bed-top">
                  <span className="gh-bed-tag">Bed {i + 1}</span>
                  <span className="spacer" />
                  {isSelected ? <Badge tone="gold">Selected</Badge> : <span className="small muted">Empty loam</span>}
                </div>

                <BedPlantVisual mode="empty" pct={0} ready={false} />

                <div className="gh-bed-ledge">
                  <div className="row wrap" style={{ gap: 8 }}>
                    <span className="small muted">
                      {plantable.length ? 'Open terracotta bed' : 'No seeds yet'}
                    </span>
                    <span className="spacer" />
                    <button
                      type="button"
                      className={`btn sm ${isSelected ? 'primary' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (plantable.length) openBenchFor(i);
                        else onGoWild();
                      }}
                    >
                      {plantable.length ? '+ Sow a Seed' : 'Find seeds'}
                    </button>
                  </div>
                </div>
              </article>
            );
          }

          const remaining = Math.max(0, plot.readyAt - now);
          const total = Math.max(1, plot.readyAt - plot.plantedAt);
          const pct = Math.min(1, Math.max(0, 1 - remaining / total));
          const ready = remaining <= 0;
          const p0 = parseStrain(plot.parents[0]);
          const isCross = plot.parents.length === 2;
          const p1Cross = plot.parents.length === 2 ? parseStrain(plot.parents[1]) : null;
          const hybBed = isCross && p1Cross && lvl >= 80 ? hybridForParents(p0.species, p1Cross.species) : undefined;
          const sp0 = speciesDef(p0.species);
          const rarity = strainRarity(plot.parents[0]);
          const everbloom = !isCross && p0.mutations.includes('everbloom');

          return (
            <article
              key={i}
              className={`gh-bed ${isCross ? 'cross' : 'grow'} ${ready ? 'ready' : ''}`}
              style={{ ['--bed-color' as string]: sp0?.color ?? '#8ee88a' } as CSSProperties}
            >
              <div className="gh-bed-top">
                <span className="gh-bed-tag">Bed {i + 1}</span>
                <b className="gh-bed-name">{isCross ? (hybBed ? hybBed.name : 'Crossbreeding') : strainLabel(plot.parents[0])}</b>
                <span className="spacer" />
                <Badge tone={hybBed ? 'gold' : isCross ? 'gold' : ready ? 'success' : 'neutral'}>
                  {hybBed ? '✨ Hybrid' : isCross ? 'Cross' : everbloom ? 'Everbloom' : 'Grow'}
                </Badge>
              </div>

              <BedPlantVisual
                mode={isCross ? 'cross' : 'grow'}
                species1={p0.species}
                species2={p1Cross?.species}
                pct={pct}
                ready={ready}
                rarity={rarity}
                isHybrid={!!hybBed}
              />

              <div className="gh-bed-ledge">
                {isCross && plot.parents.length === 2 ? (
                  <div className="small muted gh-cross-parents">
                    {strainLabel(plot.parents[0])} × {strainLabel(plot.parents[1])}
                  </div>
                ) : (
                  <MutationTags mutations={p0.mutations} />
                )}

                <ProgressBar value={ready ? 1 : pct} color={ready ? '#7be38b' : sp0?.color} />

                <div className="row">
                  <span className={`small ${ready ? 'gh-ready-text' : 'muted num'}`}>
                    {ready ? 'Ready to harvest!' : `${fmtTime(remaining)} left`}
                  </span>
                  <span className="spacer" />
                  {ready ? (
                    <button
                      type="button"
                      className="btn sm primary gh-harvest-btn"
                      onClick={() => {
                        const res = game.act((st, ctx) => harvestPlot(st, ctx, i, Date.now()));
                        if (typeof res === 'string') notify(res);
                        else if (res) {
                          const special = res.mode === 'cross' || res.essences.length > 0 || !!res.replanted || !!res.stabilised;
                          playHarvestSound(special);
                          if (res.mode === 'grow') notify(`Harvested ${res.herbs?.qty ?? 0} ${strainLabel(res.herbs?.strain ?? '')}${res.replanted ? ' (Everbloom replanted!)' : ''}`);
                          else notify(`Cross harvested: ${res.seeds.map(strainLabel).join(', ')}${res.stabilised ? ` · ${strainLabel(res.stabilised)} stabilised!` : ''}`);
                        }
                      }}
                    >
                      Harvest
                    </button>
                  ) : (
                    <span className="small dim num">{Math.round(pct * 100)}%</span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!plantable.length ? (
        <div className="gh-empty-satchel">
          <div>
            <b>Your seed satchel is empty</b>
            <p className="small muted" style={{ margin: '2px 0 0' }}>
              Gather herbs in the Wild Grounds to uncover seeds. Everything planted here grows in real time while you forage or adventure.
            </p>
          </div>
          <button type="button" className="btn sm primary" onClick={onGoWild}>
            Go to Wild Grounds
          </button>
        </div>
      ) : effectivePlot !== null && (
        <div className="gh-potting-bench" aria-label={`Potting bench for Bed ${effectivePlot + 1}`}>
          <div className="gh-bench-head">
            <div className="row wrap" style={{ gap: 10 }}>
              <span className="gh-bench-title">Potting Bench · Bed {effectivePlot + 1}</span>
              <div className="gh-mode-switch" role="group" aria-label="Planting mode">
                <button
                  type="button"
                  className={`gh-mode-btn ${mode === 'grow' ? 'active' : ''}`}
                  aria-pressed={mode === 'grow'}
                  onClick={() => {
                    setMode('grow');
                    setActiveSlot(1);
                    playSeedSelectSound();
                  }}
                >
                  Grow Herbs (1 seed)
                </button>
                <button
                  type="button"
                  className={`gh-mode-btn ${mode === 'cross' ? 'active' : ''}`}
                  aria-pressed={mode === 'cross'}
                  onClick={() => {
                    setMode('cross');
                    setActiveSlot(safeP1 && !safeP2 ? 2 : 1);
                    playSeedSelectSound();
                  }}
                >
                  Crossbreed (2 parents)
                </button>
              </div>
            </div>
            <button type="button" className="btn sm ghost" onClick={() => setPlantingPlot(null)}>Close</button>
          </div>

          <div className="gh-bench-stage">
            <div className="gh-sockets-row">
              <button
                type="button"
                className={`gh-pot-socket ${mode === 'cross' && activeSlot === 1 ? 'focused' : ''} ${safeP1 ? 'filled' : ''}`}
                onClick={() => {
                  if (safeP1) setParent1('');
                  setActiveSlot(1);
                  playSeedSelectSound();
                }}
                title={safeP1 ? 'Click to clear socket' : 'Select a seed from the satchel below'}
              >
                <span className="gh-socket-label">{mode === 'grow' ? 'Seed Pot' : 'Parent 1'}</span>
                {safeP1 ? (
                  <div className="gh-socket-seed">
                    <SpeciesIcon speciesId={p1.species} size={28} />
                    <div className="gh-socket-info">
                      <b>{strainLabel(safeP1)}</b>
                      <small className="muted">
                        {s.foraging.strains[safeP1]?.stable ? '★ Stable (free)' : `×${s.foraging.seeds[safeP1] ?? 0} in satchel · tap to clear`}
                      </small>
                    </div>
                  </div>
                ) : (
                  <span className="gh-socket-placeholder">Tap a seed below</span>
                )}
              </button>

              {mode === 'cross' && (
                <>
                  <div className="gh-cross-join" aria-hidden="true">
                    <span>×</span>
                    {hyb && <Badge tone="gold">✨ Hybrid!</Badge>}
                  </div>

                  <button
                    type="button"
                    className={`gh-pot-socket ${activeSlot === 2 ? 'focused' : ''} ${safeP2 ? 'filled' : ''}`}
                    onClick={() => {
                      if (safeP2) setParent2('');
                      setActiveSlot(2);
                      playSeedSelectSound();
                    }}
                    title={safeP2 ? 'Click to clear Parent 2' : 'Select Parent 2 from the satchel below'}
                  >
                    <span className="gh-socket-label">Parent 2</span>
                    {safeP2 ? (
                      <div className="gh-socket-seed">
                        <SpeciesIcon speciesId={p2.species} size={28} />
                        <div className="gh-socket-info">
                          <b>{strainLabel(safeP2)}</b>
                          <small className="muted">
                            {s.foraging.strains[safeP2]?.stable ? '★ Stable (free)' : `×${s.foraging.seeds[safeP2] ?? 0} in satchel · tap to clear`}
                          </small>
                        </div>
                      </div>
                    ) : (
                      <span className="gh-socket-placeholder">Tap Parent 2 below</span>
                    )}
                  </button>
                </>
              )}
            </div>

            <div className="gh-outcome-card">
              <div className="gh-outcome-metrics">
                {mode === 'grow' && safeP1 ? (
                  <>
                    <div className="gh-metric">
                      <span className="dim small">Harvest yield</span>
                      <b>+{10 + growExtraHerbs} herbs · +{growSeedsBack} seed{growSeedsBack > 1 ? 's' : ''}</b>
                    </div>
                    <div className="gh-metric">
                      <span className="dim small">Grow time</span>
                      <b className="num">{fmtTime(plotDurationMs(s, [safeP1]))}</b>
                    </div>
                    {p1.mutations.includes('everbloom') && (
                      <div className="gh-metric">
                        <span className="dim small">Everbloom</span>
                        <b className="good">Auto-replants for free</b>
                      </div>
                    )}
                  </>
                ) : mode === 'cross' && safeP1 && safeP2 ? (
                  <>
                    <div className="gh-metric">
                      <span className="dim small">Offspring species</span>
                      <b>
                        {hyb
                          ? `✨ ${hyb.name} (Hybrid!)`
                          : p1.species === p2.species
                            ? sp1Def?.name ?? p1.species
                            : `50% ${sp1Def?.name ?? p1.species} / 50% ${sp2Def?.name ?? p2.species}`}
                      </b>
                    </div>
                    <div className="gh-metric">
                      <span className="dim small">Yield &amp; genetics</span>
                      <b>
                        +{offspringSeeds} seeds · {safeP1 === safeP2 && s.foraging.strains[safeP1]?.stable ? '100% Stable' : `${inheritPct}% trait pass`} · {newMutPct}% new
                      </b>
                    </div>
                    <div className="gh-metric">
                      <span className="dim small">Cross time</span>
                      <b className="num">{fmtTime(plotDurationMs(s, [safeP1, safeP2]))}</b>
                    </div>
                  </>
                ) : (
                  <span className="small muted">
                    {mode === 'cross'
                      ? 'Pick both parent seeds from your satchel to preview offspring traits and cross time.'
                      : 'Choose any seed below to sow into this terracotta bed.'}
                  </span>
                )}
              </div>

              {mode === 'cross' && safeP1 && safeP2 && combinedParentMuts.length > 0 && (
                <MutationTags mutations={combinedParentMuts} showTier />
              )}

              {mode === 'cross' && safeP1 && safeP2 && safeP1 === safeP2 && !canSelfCross(safeP1) && (
                <span className="small gh-warn-note">Need 2 seeds (or ★ Stable) to self-cross the same strain.</span>
              )}

              <div className="row wrap" style={{ gap: 8 }}>
                <span className="spacer" />
                <button
                  type="button"
                  className="btn primary gh-sow-btn"
                  disabled={!canPlant}
                  onClick={() => {
                    if (!canPlant || effectivePlot === null) return;
                    const parents: [string] | [string, string] = mode === 'cross' ? [safeP1, safeP2] : [safeP1];
                    const err = game.act((st) => plantPlot(st, effectivePlot, parents, Date.now()));
                    if (err) {
                      notify(err);
                      return;
                    }
                    playPlantSound();
                    notify(parents.length === 2 ? `Planted cross in Bed ${effectivePlot + 1}.` : `Sowed ${strainLabel(safeP1)} in Bed ${effectivePlot + 1}.`);
                    setPlantingPlot(null);
                  }}
                >
                  {mode === 'cross' ? `Crossbreed in Bed ${effectivePlot + 1}` : `Sow in Bed ${effectivePlot + 1}`}
                </button>
              </div>
            </div>
          </div>

          <div className="gh-satchel">
            <div className="gh-satchel-bar">
              <b className="small">Seed Satchel · tap to slot {mode === 'cross' ? `(Parent ${activeSlot})` : ''}</b>
              <div className="gh-satchel-filters" role="group" aria-label="Filter seeds">
                <button
                  type="button"
                  className={`gh-filter-pill ${satchelFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSatchelFilter('all')}
                >
                  All ({plantable.length})
                </button>
                {satchelRarityCounts.map(({ rarity, count }) => (
                  <button
                    key={rarity}
                    type="button"
                    className={`gh-filter-pill rar-${rarity} ${satchelFilter === rarity ? 'active' : ''}`}
                    onClick={() => setSatchelFilter(rarity)}
                  >
                    {RARITY_LABEL[rarity]} ({count})
                  </button>
                ))}
                {stableSeeds.length > 0 && (
                  <button
                    type="button"
                    className={`gh-filter-pill ${satchelFilter === 'stable' ? 'active' : ''}`}
                    onClick={() => setSatchelFilter('stable')}
                  >
                    ★ Stable ({stableSeeds.length})
                  </button>
                )}
              </div>
            </div>

            <div className="gh-satchel-grid">
              {filteredSatchel.map((key) => {
                const { species, mutations } = parseStrain(key);
                const rec = s.foraging.strains[key];
                const seeds = s.foraging.seeds[key] ?? 0;
                const rarity = strainRarity(key);
                const inP1 = safeP1 === key;
                const inP2 = mode === 'cross' && safeP2 === key;
                const slotTag = mode === 'grow'
                  ? (inP1 ? 'Selected' : null)
                  : (inP1 && inP2 ? 'P1 & P2' : inP1 ? 'Parent 1' : inP2 ? 'Parent 2' : null);
                const selfLock =
                  mode === 'cross' &&
                  !canSelfCross(key) &&
                  ((activeSlot === 2 && inP1 && !inP2) || (activeSlot === 1 && inP2 && !inP1));

                return (
                  <button
                    key={key}
                    type="button"
                    className={`gh-seed-tile ${rarity} ${mutations.length >= 3 ? 'triple' : ''} ${slotTag ? 'chosen' : ''} ${selfLock ? 'self-lock' : ''}`}
                    onClick={() => handleSeedTileClick(key)}
                    title={selfLock ? 'Only 1 seed in satchel — need 2 seeds or ★ Stable to self-cross' : undefined}
                  >
                    <div className="gh-seed-tile-top">
                      <SpeciesIcon speciesId={species} size={22} />
                      <b className="gh-seed-name">{strainLabel(key)}</b>
                      <span className="spacer" />
                      {slotTag ? (
                        <Badge tone="gold">{slotTag}</Badge>
                      ) : (
                        <span className="gh-seed-count num">{rec?.stable ? '★ Free' : `×${fmt(seeds)}`}</span>
                      )}
                    </div>
                    {mutations.length > 0 ? (
                      <MutationTags mutations={mutations} />
                    ) : (
                      <span className="small dim">Plain heirloom strain</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function WildTab({ s, notify, onOpenGreenhouse }: { s: GameState; notify: (msg: string) => void; onOpenGreenhouse: () => void }) {
  const level = skillLevel(s, 'harvesting');
  const d = deriveStats(s);
  const patches = actionsFor('harvesting');
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'harvesting' ? s.action : null;

  const [selectedId, setSelectedId] = useState<string>(() => running?.actionId ?? patches[0]?.id ?? 'forage_sunpetal');
  const [swingResult, setSwingResult] = useState<{ id: number; r: SwingResult } | null>(null);

  const selectedAction = patches.find((a) => a.id === selectedId) ?? patches[0];
  const selectedSpeciesId = selectedAction.foraging?.plant ?? selectedAction.id.replace(/^forage_/, '');
  const selectedSpecies = speciesDef(selectedSpeciesId);
  const selectedLocked = selectedAction.level > level;
  const selectedActive = running?.actionId === selectedAction.id;
  const runningAction = running ? patches.find((a) => a.id === running.actionId) : undefined;
  const unlockedCount = patches.filter((a) => a.level <= level).length;
  const highestUnlocked = [...patches].reverse().find((a) => a.level <= level) ?? patches[0];

  const startPatch = (actionId: string) => {
    const err = game.act((st, ctx) => startSkillAction(st, ctx, actionId));
    if (err) notify(err);
    else {
      setSelectedId(actionId);
      setSwingResult(null);
    }
  };

  const onSwing = (r: SwingResult) => {
    game.act((st) => minigameSwing(st, r));
    setSwingResult({ id: Math.random(), r });
  };

  const selectedInterval = actionIntervalMs(s, selectedAction, d);
  const runningInterval = runningAction ? actionIntervalMs(s, runningAction, d) : selectedInterval;
  const seedCounter = s.professionProgress.counters[`foraging.seed.${selectedSpeciesId}`] ?? 0;
  const seedDiscovered = !!s.professionProgress.discoveries[seedId(selectedSpeciesId)];
  const heldHerbs = selectedSpecies ? (s.storage.bank[selectedSpecies.herb] ?? 0) : 0;

  const plots = greenhousePlotCount(s);
  const growingPlots = s.foraging.plots.slice(0, plots).filter(Boolean).length;
  const readyPlots = s.foraging.plots.slice(0, plots).filter((p) => p && Date.now() >= p.readyAt).length;
  const xpToLv5 = xpToReach('harvesting', 5);
  const lv5Progress = level >= 5 ? 1 : Math.min(1, s.skills.harvesting / Math.max(1, xpToLv5));
  const selectedFind = collectibleFor('harvesting', selectedSpeciesId);
  const selectedFindOwned = !!selectedFind && s.collectibles.includes(selectedFind.id);

  return (
    <div className="foraging-wild">
      <div className="foraging-strip-head">
        <span><b>Wild Grounds</b> <span className="muted small">· {unlockedCount}/{patches.length} patches unlocked</span></span>
        {runningAction && (
          <Badge tone="success" live>Foraging {runningAction.name}</Badge>
        )}
      </div>

      <nav className="foraging-patch-strip" aria-label="Wild foraging patches">
        {patches.map((a) => {
          const spId = a.foraging?.plant ?? a.id.replace(/^forage_/, '');
          const locked = a.level > level;
          const active = running?.actionId === a.id;
          const selected = selectedAction.id === a.id;
          const find = collectibleFor('harvesting', spId);
          const found = !!find && s.collectibles.includes(find.id);
          return (
            <button
              key={a.id}
              type="button"
              data-tut={`action-${a.id}`}
              className={`foraging-patch-pill ${selected ? 'selected' : ''} ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
              style={{ ['--patch-color' as string]: a.color } as CSSProperties}
              aria-pressed={selected}
              onClick={() => setSelectedId(a.id)}
            >
              <SpeciesIcon speciesId={spId} size={22} />
              <span className="foraging-patch-pill-text">
                <b>{speciesDef(spId)?.name ?? a.name}</b>
                <small>
                  {active ? <span className="foraging-pill-live">Foraging</span> : locked ? `Lv ${a.level}` : `Lv ${a.level}`}
                </small>
              </span>
              {locked && <GameIcon name="lock" size={11} color="var(--dim)" />}
              {found && <span className="foraging-find-pip" title={`Hidden find: ${find!.name}`} aria-label={`Found ${find!.name}`} />}
            </button>
          );
        })}
      </nav>

      <div className="foraging-wild-main">
        <section
          className="card foraging-field-stage"
          style={{ ['--patch-color' as string]: selectedAction.color } as CSSProperties}
          aria-label={selectedAction.name}
        >
          <div className="foraging-field-head">
            <div className="foraging-field-title">
              <SpeciesIcon speciesId={selectedSpeciesId} size={34} />
              <div>
                <h2>{selectedAction.name}</h2>
                <div className="small muted num">
                  Lv {selectedAction.level} · {fmtTime(selectedInterval)} · {selectedAction.xp} XP
                  {selectedFindOwned && <span className="foraging-found-note"> · {selectedFind!.name} found</span>}
                </div>
              </div>
            </div>

            {selectedActive ? (
              <button type="button" className="btn" onClick={() => game.act(stopAction)}>
                Stop foraging
              </button>
            ) : selectedLocked ? (
              <LockedBadge level={selectedAction.level} />
            ) : (
              <button
                type="button"
                className="btn primary"
                onClick={() => startPatch(selectedAction.id)}
              >
                {runningAction ? `Switch to ${selectedSpecies?.name ?? selectedAction.name}` : `Forage ${selectedSpecies?.name ?? selectedAction.name}`}
              </button>
            )}
          </div>

          <div className={`foraging-cycle-bar ${selectedActive ? 'active' : 'idle'}`}>
            <ProgressBar
              value={selectedActive && running ? running.progress / Math.max(1, runningInterval) : 0}
              color={selectedAction.color}
              label={
                selectedActive
                  ? 'Gathering herbs & searching for seeds…'
                  : selectedLocked
                    ? `Unlocks at Foraging Lv ${selectedAction.level}`
                    : 'Ready — click any bed below or Forage to start'
              }
            />
          </div>

          <div className="foraging-focus-stage">
            <div className="foraging-focus-head">
              <b>Focus · Fertilise Beds</b>
              <span className="small muted">Tap lit sprouts before they fade. Gold = ×2 next harvest.</span>
            </div>

            {runningAction && runningAction.id !== selectedAction.id && (
              <div className="foraging-other-running">
                <span className="small">
                  Currently foraging <b>{runningAction.name}</b> — beds below are fertilising that harvest.
                </span>
                <button type="button" className="btn sm ghost" onClick={() => setSelectedId(runningAction.id)}>
                  View {speciesDef(runningAction.foraging?.plant ?? '')?.name ?? runningAction.name}
                </button>
              </div>
            )}

            {running ? (
              <ForagingGame onSwing={onSwing} />
            ) : (
              <ForagingBedsIdle
                speciesName={selectedSpecies?.name ?? selectedAction.name}
                disabled={selectedLocked}
                onStart={() => startPatch(selectedAction.id)}
              />
            )}

            {!running && selectedLocked && (
              <div className="foraging-locked-idle">
                <span className="small muted">Unlock {selectedAction.name} at Foraging Lv {selectedAction.level}.</span>
                {highestUnlocked && (
                  <button type="button" className="btn sm primary" onClick={() => startPatch(highestUnlocked.id)}>
                    Forage {speciesDef(highestUnlocked.foraging?.plant ?? '')?.name ?? highestUnlocked.name}
                  </button>
                )}
              </div>
            )}

            <div className="row minigame-foot">
              <div className="minigame-bars grow">
                <ProgressBar value={running ? focusOf(s) : 0} color={SKILLS.harvesting.color} />
                <ProgressBar value={running ? overflowOf(s) : 0} color="var(--accent)" className="minigame-overflow" />
              </div>
              <span className={`minigame-double ${running && doubleReady(s) ? 'ready' : ''}`} title={DOUBLE_HINT}>
                ×2
              </span>
              <span
                className="num small"
                title={`Max focus speed: +${(maxFocusSpeed(s, 'harvesting') * 100).toFixed(2).replace(/\.?0+$/, '')}% (+0.01% per mastery level in Foraging)`}
              >
                +{running ? Math.round((focusMult(s, 'harvesting') - 1) * 100) : 0}% speed
              </span>
              {running && swingResult ? (
                <span key={swingResult.id} className={`minigame-result ${swingResult.r}`}>
                  {RESULT_TEXT[swingResult.r]}
                </span>
              ) : !running && !selectedLocked ? (
                <span className="small muted">Tap any bed to start</span>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="foraging-patch-notes">
          <section className="card foraging-notes-card">
            <div className="card-title">
              Drops &amp; Odds
              <span className="spacer" />
              <span className="small muted">{selectedSpecies?.name ?? selectedAction.name}</span>
            </div>

            <ul className="foraging-drop-list">
              <li>
                <SpeciesIcon speciesId={selectedSpeciesId} size={16} />
                <span>1× {selectedSpecies?.name ?? selectedAction.name}</span>
                <span className="spacer" />
                <span className="small muted num">{fmt(heldHerbs)} owned</span>
              </li>
              <li>
                <span className="foraging-drop-dot plain" aria-hidden="true" />
                <span>Plain {selectedSpecies?.name ?? ''} Seed</span>
                <span className="spacer" />
                <span className="small num">1%</span>
              </li>
              <li>
                <span className="foraging-drop-dot variant" aria-hidden="true" />
                <span>Wild Variant Seed (1–3 traits)</span>
                <span className="spacer" />
                <span className="small num">2%</span>
              </li>
              {(selectedAction.bonus ?? []).map((b) => (
                <li key={b.id}>
                  <MatIcon id={b.id} size={15} />
                  <span>{materialDef(b.id).name}</span>
                  <span className="spacer" />
                  <span className="small num">{formatChance(b.chance)}</span>
                </li>
              ))}
            </ul>

            <div className="foraging-pity-box">
              <div className="row small">
                <span className="muted">First seed guarantee</span>
                <span className="spacer" />
                <span className="num">{seedDiscovered ? 'Found ✓' : `${Math.min(100, seedCounter)}/100 harvests`}</span>
              </div>
              <ProgressBar value={seedDiscovered ? 1 : Math.min(1, seedCounter / 100)} color={selectedAction.color} />
            </div>

            <MasteryProgress s={s} mastery={selectedAction.mastery} compact />
          </section>

          <section className="card foraging-notes-card">
            <div className="card-title">
              Greenhouse
              <span className="spacer" />
              {plots === 0 ? <LockedBadge level={5} /> : <Badge tone={readyPlots > 0 ? 'gold' : 'success'}>{growingPlots}/{plots} growing</Badge>}
            </div>

            {plots === 0 ? (
              <>
                <p className="small muted" style={{ margin: 0 }}>
                  Forage Sunpetal to reach Lv 5, then plant seeds and breed strains in real time.
                </p>
                <div className="foraging-pity-box">
                  <div className="row small">
                    <span className="muted">Lv {level} → Lv 5</span>
                    <span className="spacer" />
                    <span className="num">{fmt(Math.min(s.skills.harvesting, xpToLv5))}/{fmt(xpToLv5)} XP</span>
                  </div>
                  <ProgressBar value={lv5Progress} color={SKILLS.harvesting.color} />
                </div>
              </>
            ) : (
              <>
                <p className="small muted" style={{ margin: 0 }}>
                  {readyPlots > 0
                    ? `${readyPlots} plot${readyPlots > 1 ? 's' : ''} ready to harvest!`
                    : growingPlots > 0
                      ? `${growingPlots} of ${plots} plots growing in real time.`
                      : 'All plots are open and ready for your seeds.'}
                </p>
                <button type="button" className="btn sm primary" onClick={onOpenGreenhouse}>
                  {readyPlots > 0 ? `Harvest in Greenhouse (${readyPlots})` : 'Open Greenhouse'}
                </button>
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function SeedsTab({
  s,
  onGoWild,
  onPlantInGreenhouse,
}: {
  s: GameState;
  onGoWild: () => void;
  onPlantInGreenhouse: (key: string) => void;
}) {
  const [view, setView] = useState<'plantable' | 'herbs' | 'all'>('plantable');
  const [rarityFilter, setRarityFilter] = useState<'all' | StrainRarity>('all');
  const [stableOnly, setStableOnly] = useState(false);

  const hasGreenhouse = greenhousePlotCount(s) > 0;
  const allStrains = Object.keys(s.foraging.strains);
  const plantableStrains = allStrains.filter((k) => (s.foraging.seeds[k] ?? 0) > 0 || !!s.foraging.strains[k]?.stable);
  const herbStrains = allStrains.filter((k) => (s.foraging.strainHerbs[k] ?? 0) > 0);
  const totalSeeds = Object.values(s.foraging.seeds).reduce((a, b) => a + b, 0);
  const totalMutHerbs = Object.values(s.foraging.strainHerbs).reduce((a, b) => a + b, 0);
  const sunpetalPity = s.professionProgress.counters['foraging.seed.sunpetal'] ?? 0;
  const sunpetalFound = !!s.professionProgress.discoveries[seedId('sunpetal')];

  const scoped = view === 'plantable' ? plantableStrains : view === 'herbs' ? herbStrains : allStrains;
  const stableInScope = scoped.filter((k) => !!s.foraging.strains[k]?.stable).length;

  const entries = scoped
    .filter((k) => (rarityFilter === 'all' || strainRarity(k) === rarityFilter) && (!stableOnly || !!s.foraging.strains[k]?.stable))
    .sort((a, b) => {
      const ra = STRAIN_RARITY_ORDER.indexOf(strainRarity(a));
      const rb = STRAIN_RARITY_ORDER.indexOf(strainRarity(b));
      if (rb !== ra) return rb - ra;
      const ma = parseStrain(a).mutations.length;
      const mb = parseStrain(b).mutations.length;
      if (mb !== ma) return mb - ma;
      return strainLabel(a).localeCompare(strainLabel(b));
    });

  return (
    <section className="card seeds-panel" aria-label="Seeds and grown herbs">
      <div className="seeds-header">
        <div>
          <span className="foraging-eyebrow">Botanical Satchel</span>
          <h3>Seed Satchel &amp; Grown Herbs</h3>
          <p className="small muted" style={{ margin: '3px 0 0' }}>
            Plant seeds in the Glasshouse to grow herbs or crossbreed traits. Grown mutated herbs fuel Alchemy infusions.
          </p>
        </div>
        <div className="seeds-summary-badges">
          <Badge tone="neutral">{fmt(totalSeeds)} seeds</Badge>
          {totalMutHerbs > 0 && <Badge tone="gold">{fmt(totalMutHerbs)} mutated herbs</Badge>}
        </div>
      </div>

      <div className="seeds-toolbar">
        <div className="seeds-view-switch" role="tablist" aria-label="Satchel view">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'plantable'}
            className={`seeds-view-btn ${view === 'plantable' ? 'active' : ''}`}
            onClick={() => setView('plantable')}
          >
            Plantable Seeds ({plantableStrains.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'herbs'}
            className={`seeds-view-btn ${view === 'herbs' ? 'active' : ''}`}
            onClick={() => setView('herbs')}
          >
            Grown Herbs ({herbStrains.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'all'}
            className={`seeds-view-btn ${view === 'all' ? 'active' : ''}`}
            onClick={() => setView('all')}
          >
            All Discovered ({allStrains.length})
          </button>
        </div>

        <div className="seeds-rarity-bar" role="group" aria-label="Filter by rarity">
          <button
            type="button"
            className={`seeds-rarity-pill all ${rarityFilter === 'all' ? 'active' : ''}`}
            aria-pressed={rarityFilter === 'all'}
            onClick={() => setRarityFilter('all')}
          >
            All ({scoped.length})
          </button>
          {STRAIN_RARITY_ORDER.map((r) => {
            const count = scoped.filter((k) => strainRarity(k) === r).length;
            return (
              <button
                key={r}
                type="button"
                className={`seeds-rarity-pill rar-${r} ${rarityFilter === r ? 'active' : ''} ${count === 0 ? 'zero' : ''}`}
                aria-pressed={rarityFilter === r}
                onClick={() => setRarityFilter(rarityFilter === r ? 'all' : r)}
              >
                <span className="seeds-rarity-dot" aria-hidden="true" />
                <span>{RARITY_LABEL[r]}</span>
                <span className="num">({count})</span>
              </button>
            );
          })}
          {stableInScope > 0 && (
            <button
              type="button"
              className={`seeds-rarity-pill stable ${stableOnly ? 'active' : ''}`}
              aria-pressed={stableOnly}
              onClick={() => setStableOnly(!stableOnly)}
            >
              ★ Stable ({stableInScope})
            </button>
          )}
        </div>
      </div>

      {allStrains.length === 0 ? (
        <EmptyState
          icon={<GameIcon name="harvesting" size={28} />}
          title="No seeds or discovered strains yet"
          action={<button type="button" className="btn sm primary" onClick={onGoWild}>Go to Wild foraging</button>}
        >
          {`Forage Wild patches to gather herbs and find your first seeds. New seed finds appear in the Activity sidebar and land straight here.${sunpetalFound ? '' : ` Sunpetal's first seed is guaranteed by 100 harvests (${Math.min(100, sunpetalPity)}/100 so far).`}`}
        </EmptyState>
      ) : entries.length === 0 ? (
        <EmptyState
          small
          title={
            view === 'herbs'
              ? 'No mutated herbs grown yet'
              : view === 'plantable' && rarityFilter === 'all' && !stableOnly
                ? 'No plantable seeds on hand right now'
                : 'No strains match these filters'
          }
          action={
            rarityFilter !== 'all' || stableOnly ? (
              <button
                type="button"
                className="btn sm"
                onClick={() => {
                  setRarityFilter('all');
                  setStableOnly(false);
                }}
              >
                Reset filters
              </button>
            ) : (
              <button type="button" className="btn sm primary" onClick={onGoWild}>
                Go to Wild foraging
              </button>
            )
          }
        >
          {view === 'herbs'
            ? 'Grow mutated or hybrid seeds in the Glasshouse to harvest specialty herbs for Alchemy infusions.'
            : view === 'plantable' && rarityFilter === 'all' && !stableOnly
              ? 'Forage Wild patches or switch to All Discovered to review strains whose last seed has already been planted.'
              : 'Try picking All rarities or switching tabs above.'}
        </EmptyState>
      ) : (
        <div className="seeds-grid">
          {entries.map((key) => {
            const { species, mutations } = parseStrain(key);
            const rec = s.foraging.strains[key];
            const rarity = strainRarity(key);
            const seeds = s.foraging.seeds[key] ?? 0;
            const plantable = seeds > 0 || !!rec.stable;
            const sp = speciesDef(species);
            const isSpecialty = mutations.length > 0 || !!sp?.hybrid;
            const mutHerbs = s.foraging.strainHerbs[key] ?? 0;
            const herbs = isSpecialty ? mutHerbs : (s.storage.bank[sp?.herb ?? species] ?? 0);
            const needGen = mutations.includes('deep_rooted') ? 3 : 5;

            return (
              <article
                key={key}
                className={`seed-card rar-${rarity} ${mutations.length >= 3 ? 'triple' : ''}`}
              >
                <div className="seed-card-head">
                  <SpeciesIcon speciesId={species} size={26} />
                  <div className="seed-card-title-wrap">
                    <b className={`seed-card-title rar-text-${rarity}`}>{strainLabel(key)}</b>
                    <span className="small muted">{sp?.name ?? species}{sp?.hybrid ? ' · Hybrid' : ''}</span>
                  </div>
                  <div className="seed-card-badges">
                    <span className={`foraging-rarity-pill ${rarity}`}>{RARITY_LABEL[rarity]}</span>
                    {mutations.length >= 3 && <Badge tone="gold">3-Trait</Badge>}
                  </div>
                </div>

                {mutations.length > 0 ? (
                  <MutationTags mutations={mutations} showTier />
                ) : (
                  <span className="small muted">Plain heirloom — clean base for crossbreeding</span>
                )}

                <div className="seed-stock-row small num">
                  <span className={`seed-stock-chip ${rec.stable ? 'stable' : seeds > 0 ? 'ready' : 'out'}`}>
                    {rec.stable ? '★ Unlimited seeds' : seeds > 0 ? `${fmt(seeds)} seed${seeds === 1 ? '' : 's'} ready` : '0 seeds'}
                  </span>
                  {(herbs > 0 || isSpecialty) && (
                    <span className={`seed-stock-chip ${mutHerbs > 0 ? 'herbs' : 'dim'}`}>
                      {fmt(herbs)} {isSpecialty ? 'mutated ' : ''}herb{herbs === 1 ? '' : 's'}
                    </span>
                  )}
                  {!rec.stable && rec.generation > 0 && (
                    <span className="seed-stock-chip gen">Gen {rec.generation}/{needGen}</span>
                  )}
                </div>

                {plantable && (
                  <div className="seed-card-foot">
                    {hasGreenhouse ? (
                      <button
                        type="button"
                        className="btn sm primary seed-plant-btn"
                        onClick={() => onPlantInGreenhouse(key)}
                      >
                        Plant in Glasshouse →
                      </button>
                    ) : (
                      <span className="small dim">Glasshouse unlocks at Lv 5</span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

const MUTATION_GROUPS: { tier: MutationTier; title: string; subtitle: string }[] = [
  { tier: 'magic', title: 'Magic Traits', subtitle: 'Weight 100 · everyday wild & bred traits' },
  { tier: 'rare', title: 'Rare Traits', subtitle: 'Weight 10 · potent gold harvest & breeding traits' },
  { tier: 'unique', title: 'Unique Traits', subtitle: 'Hybrid-only traits awakened from Lv 80 parent crosses' },
  { tier: 'legendary', title: 'Legendary Traits', subtitle: 'Weight 1 · rarest botanical powers, boosted in deeper patches' },
];

function HerbariumTab({ s }: { s: GameState }) {
  const count = herbariumCount(s);
  const stable = stableStrainCount(s);
  const hints = discoveredHybridHints(s);
  const nextHerbarium = HERBARIUM_PERKS.find((p) => count < p.entries);
  const nextStable = STABILISATION_PERKS.find((p) => stable < p.points);
  const nextHintAt = (Math.floor(count / 25) + 1) * 25;

  return (
    <section className="card foraging-herbarium">
      <div className="foraging-herbarium-head">
        <div>
          <span className="foraging-eyebrow">Pressed Plant Journal</span>
          <h3>The Herbarium · {count} pressed strains · {stable} stable</h3>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <Badge tone="success">{count}/200 Milestone Strains</Badge>
          <Badge tone="gold">{stable}/25 Stable</Badge>
        </div>
      </div>

      <div className="foraging-explainer" aria-label="How the Herbarium works">
        <div className="foraging-explainer-step">
          <span className="foraging-step-num">1</span>
          <div>
            <b>Press New Strains</b>
            <p className="small muted">Every unique species + mutation combo you open or breed is automatically pressed here.</p>
          </div>
        </div>
        <div className="foraging-explainer-step">
          <span className="foraging-step-num">2</span>
          <div>
            <b>Unlock Plots &amp; Hints</b>
            <p className="small muted">Pressed milestones grant permanent Greenhouse plots, faster growth, and hidden Lv 80 hybrid hints every 25 strains.</p>
          </div>
        </div>
        <div className="foraging-explainer-step">
          <span className="foraging-step-num">3</span>
          <div>
            <b>Stabilise Favourites</b>
            <p className="small muted">Self-cross the same strain 5× in the Greenhouse (3× with Deep-rooted) to plant it for free forever.</p>
          </div>
        </div>
      </div>

      <div className="foraging-perks-grid">
        <div className="foraging-card foraging-perk-card">
          <div className="foraging-card-head">
            <b>Pressed Strain Perks</b>
            <span className="spacer" />
            <span className="small muted num">{nextHerbarium ? `Next at ${nextHerbarium.entries}` : 'All earned!'}</span>
          </div>
          <ProgressBar
            value={nextHerbarium ? Math.min(1, count / nextHerbarium.entries) : 1}
            color="#7cc47a"
          />
          <ul className="foraging-perk-list">
            {HERBARIUM_PERKS.map((p) => {
              const earned = count >= p.entries;
              return (
                <li key={p.entries} className={earned ? 'earned' : 'pending'}>
                  <span>{earned ? '✓' : '○'}</span>
                  <span className="num">{p.entries}</span>
                  <span>{p.label}</span>
                </li>
              );
            })}
          </ul>
          <p className="small muted" style={{ margin: 0 }}>
            Next secret hybrid hint unlocks at <b className="num">{nextHintAt}</b> pressed strains.
          </p>
        </div>

        <div className="foraging-card foraging-perk-card">
          <div className="foraging-card-head">
            <b>Stabilisation Perks</b>
            <span className="spacer" />
            <span className="small muted num">{nextStable ? `Next at ${nextStable.points}` : 'All earned!'}</span>
          </div>
          <ProgressBar
            value={nextStable ? Math.min(1, stable / nextStable.points) : 1}
            color="var(--accent)"
          />
          <ul className="foraging-perk-list">
            {STABILISATION_PERKS.map((p) => {
              const earned = stable >= p.points;
              return (
                <li key={p.points} className={earned ? 'earned' : 'pending'}>
                  <span>{earned ? '✓' : '○'}</span>
                  <span className="num">{p.points}</span>
                  <span>{p.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="foraging-card">
        <div className="foraging-card-head">
          <b>Hidden Hybrid Notes</b>
          <span className="spacer" />
          <span className="small muted">Breedable from Foraging Lv 80</span>
        </div>
        {hints.length > 0 ? (
          <div className="foraging-hybrid-list">
            {hints.map((h) => (
              <div key={h.hybridId} className="small">
                {h.discovered ? <Badge tone="success">Discovered</Badge> : <Badge tone="gold">Hint</Badge>}{' '}
                <b>{h.hybridName}</b> — {speciesDef(h.parents[0])?.name ?? h.parents[0]} × {speciesDef(h.parents[1])?.name ?? h.parents[1]}
              </div>
            ))}
          </div>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>
            No hybrid notes uncovered yet. Every 25 pressed strains reveals a hidden Lv 80 parent pairing, or discover them directly by experimenting in the Greenhouse.
          </p>
        )}
      </div>

      <div>
        <div className="row" style={{ marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>Species Specimen Pages</h4>
          <span className="spacer" />
          <span className="small muted">★ = Stable (free to plant)</span>
        </div>
        <div className="foraging-grid">
          {ALL_SPECIES.filter((sp) => !sp.hybrid || Object.keys(s.foraging.strains).some((k) => parseStrain(k).species === sp.id)).map((sp) => {
            const list = Object.keys(s.foraging.strains).filter((k) => parseStrain(k).species === sp.id);
            return (
              <div key={sp.id} className="foraging-card foraging-species-page" style={{ ['--sp-color' as string]: sp.color } as CSSProperties}>
                <div className="foraging-card-head">
                  <SpeciesIcon speciesId={sp.id} size={22} />
                  <b>{sp.name}</b>
                  <Badge tone={sp.hybrid ? 'gold' : 'neutral'}>{sp.hybrid ? 'Lv 80 Hybrid' : `Wild Lv ${sp.level}`}</Badge>
                  <span className="spacer" />
                  <span className="small muted num">{list.length} pressed</span>
                </div>
                {list.length ? (
                  <div className="foraging-pressed-list">
                    {list.map((k) => {
                      const { mutations } = parseStrain(k);
                      const rec = s.foraging.strains[k];
                      const needGen = mutations.includes('deep_rooted') ? 3 : 5;
                      return (
                        <div key={k} className="foraging-pressed-entry">
                          <div className="row">
                            <span className="small"><b>{strainLabel(k)}</b></span>
                            <span className="spacer" />
                            <span className="small muted num">{rec.stable ? '★ Stable' : rec.generation > 0 ? `Gen ${rec.generation}/${needGen}` : ''}</span>
                          </div>
                          {mutations.length > 0 && <MutationTags mutations={mutations} showTier />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="small muted" style={{ margin: 0 }}>
                    {sp.hybrid
                      ? 'Discovered by crossing Lv 80 parents in the Greenhouse.'
                      : `Forage ${sp.name} Patch (Lv ${sp.level}) for seeds to press your first specimen.`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <details className="foraging-guide">
        <summary>Mutation Field Guide ({ALL_MUTATIONS.length} traits across Magic, Rare, Unique &amp; Legendary)</summary>
        <div className="foraging-guide-groups">
          {MUTATION_GROUPS.map((g) => (
            <div key={g.tier} className="foraging-guide-group">
              <div className="row" style={{ marginBottom: 6 }}>
                <span className={`foraging-mut-tag ${g.tier}`}>{g.title}</span>
                <span className="small muted">{g.subtitle}</span>
              </div>
              <ul className="foraging-guide-list">
                {ALL_MUTATIONS.filter((m) => m.tier === g.tier).map((m) => (
                  <li key={m.id} className="small">
                    <b>{m.name}</b> — <span className="muted">{m.effect}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

export function ForagingBench({ masterworks }: { masterworks: ReactNode }) {
  const s = useGame();
  const hasGreenhouse = greenhousePlotCount(s) > 0;
  const readyCount = hasGreenhouse ? s.foraging.plots.filter((p) => p && Date.now() >= p.readyAt).length : 0;
  const plantableCount = Object.keys(s.foraging.strains).filter(
    (k) => (s.foraging.seeds[k] ?? 0) > 0 || !!s.foraging.strains[k]?.stable,
  ).length;
  const [tab, setTab] = useState<ForagingTab>(() => {
    if (s.professionProgress.activeProject?.project.skill === 'harvesting') return 'masterworks';
    if (!hasGreenhouse) return 'wild';
    if (s.foraging.plots.every((p) => !p) && Object.keys(s.foraging.seeds).length === 0) return 'wild';
    return 'greenhouse';
  });
  const [notice, setNotice] = useState('');
  const [preselectedSeed, setPreselectedSeed] = useState<string | null>(null);

  const benchTabs: TabDef<ForagingTab>[] = [
    {
      id: 'greenhouse',
      label: 'Greenhouse',
      locked: !hasGreenhouse ? 'Unlocks at Foraging Lv 5 (2 plots)' : undefined,
      count: readyCount > 0 ? readyCount : undefined,
      hot: readyCount > 0,
    },
    { id: 'wild', label: 'Wild', count: BASE_SPECIES.length },
    {
      id: 'seeds',
      label: 'Seeds',
      count: plantableCount || undefined,
    },
    { id: 'herbarium', label: 'Herbarium', count: herbariumCount(s) || undefined },
    { id: 'masterworks', label: 'Masterworks' },
  ];

  return (
    <section className="foraging-bench">
      <Tabs tabs={benchTabs} value={tab} onChange={(next) => { setTab(next); setNotice(''); }} />
      {tab === 'greenhouse' && (
        <GreenhouseTab
          s={s}
          notify={setNotice}
          onGoWild={() => setTab('wild')}
          preselectedSeed={preselectedSeed}
          onClearPreselected={() => setPreselectedSeed(null)}
        />
      )}
      {tab === 'wild' && <WildTab s={s} notify={setNotice} onOpenGreenhouse={() => setTab('greenhouse')} />}
      {tab === 'seeds' && (
        <SeedsTab
          s={s}
          onGoWild={() => setTab('wild')}
          onPlantInGreenhouse={(key) => {
            setPreselectedSeed(key);
            setNotice('');
            setTab('greenhouse');
          }}
        />
      )}
      {tab === 'herbarium' && <HerbariumTab s={s} />}
      {tab === 'masterworks' && masterworks}
      {notice && <p role="status" className="muted small">{notice}</p>}
    </section>
  );
}
