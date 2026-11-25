import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { materialDef } from '../../data/materials';
import { MINING_METALS } from '../../data/mining';
import {
  barId, BAR_GRADES, BAR_GRADE_NAMES, FURNACE_FLUXES, FURNACE_FUELS, FURNACE_PART_EFFECTS,
  FURNACE_PART_LEVELS, FURNACE_PART_NAMES, FURNACE_PARTS, MASTER_ALLOYS, recipeStock, smeltMetal,
  type BarGrade, type BarGradePreference, type FurnaceSupply,
} from '../../data/smelting';
import { actionDef, actionsFor, type SkillAction } from '../../data/skills';
import {
  focusMult, focusOf, heatAtRest, heatPump, heatStep, inDoubleZone, minigameSwing, newHeat, type HeatState, type SwingResult,
} from '../../engine/minigame';
import {
  bellowsBandWidth, furnaceBatchSize, furnacePartUpgrade, improveFurnacePart, purityOdds, purityScore, smeltingCost,
} from '../../engine/smelting';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { masteryLevel } from '../../engine/skillingMastery';
import { deriveStats, type Derived } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { fmt, MatIcon, ProgressBar, Tabs, type TabDef } from './common';
import { HelpTip, LockedBadge, SkillIntro } from './SkillHelp';
import { MasteryProgress } from './MasteryProgress';
import './furnace.css';

type FurnaceTab = 'furnace' | 'recipes' | 'supplies' | 'parts' | 'alloys';
const BAND_CENTRE = 0.57;
const RESULT_TEXT: Record<SwingResult, string> = { double: 'Double!', hit: 'Hit', weak: 'Weak', miss: 'Miss' };

const GRADE_TIPS: Record<BarGrade, string> = {
  crude: 'Crude (-1 purity): still works in any Forging recipe, or set Use grade to keep better bars for key gear. Slightly lowers rolled quality & mod tiers.',
  refined: 'Refined (0 purity): standard baseline bar used for Forging, Woodcrafting, and Furnace upgrades.',
  pure: 'Pure (+1 purity): adds +5% item quality per purity point and has a chance to upgrade rolled modifier tiers by +1.',
  flawless: 'Flawless (+2 purity): adds +10% item quality per bar and gives the strongest modifier-tier upgrade odds. Required to cast Master Alloys.',
};

const FIRE_WORDS = ['Smouldering', 'Catching', 'Burning', 'Roaring'];
/** The gauge's scorch zone starts here; reaching the end of it scorches the melt. */
const SCORCH_FROM = 0.9;
/** One pump's squeeze animation. */
const SQUEEZE_MS = 180;

export function BellowsGame({ metal, tier, onSwing }: { metal: string; tier: number; onSwing: (result: SwingResult) => void }) {
  const width = bellowsBandWidth(metal, tier);
  const low = BAND_CENTRE - width / 2;
  const high = BAND_CENTRE + width / 2;
  const furnace = useRef<HeatState>(newHeat());
  const frame = useRef(0);
  const previous = useRef(0);
  const swing = useRef(onSwing);
  swing.current = onSwing;
  const [view, setView] = useState<HeatState>(() => newHeat());
  const [squeeze, setSqueeze] = useState(0);
  const [result, setResult] = useState<{ r: SwingResult; id: number } | null>(null);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) return;
      // stepping away lets the furnace go cold
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      furnace.current = newHeat();
      setView(newHeat());
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, []);

  const animate = (time: number) => {
    // long gaps (a stalled tab) count as a short step so the heat can't leap past the scorch line unseen
    const dt = Math.min(50, time - previous.current);
    previous.current = time;
    const h = furnace.current;
    const outcome = dt > 0 ? heatStep(h, dt, low, high) : null;
    setView({ ...h });
    if (outcome) {
      setResult({ r: outcome, id: time });
      swing.current(outcome);
    }
    if (heatAtRest(h)) {
      frame.current = 0;
      return;
    }
    frame.current = requestAnimationFrame(animate);
  };

  const pump = () => {
    heatPump(furnace.current);
    setSqueeze((n) => n + 1);
    if (frame.current) return;
    previous.current = performance.now();
    frame.current = requestAnimationFrame(animate);
  };

  const { heat, fire, melt, flare } = view;
  const zone = inDoubleZone(heat, low, width) ? 'Sweet spot' : heat >= low && heat <= high ? 'In range'
    : heat < low ? (heat < 0.02 ? 'Cold' : 'Too cool') : heat >= SCORCH_FROM ? 'Scorching!' : 'Too hot';
  const tone = inDoubleZone(heat, low, width) ? 'gold' : heat >= low && heat <= high ? 'band' : heat > high ? 'hot' : 'cool';
  const fireWord = FIRE_WORDS[Math.min(FIRE_WORDS.length - 1, Math.floor(fire * FIRE_WORDS.length))];

  return (
    <div className={`furnace-bellows heat-${tone}${flare ? ' flaring' : ''}`}>
      <div className="row">
        <b>Keep the heat</b>
        <span className="spacer" />
        <span className={`small furnace-zone ${tone}`}>{zone}</span>
      </div>
      <div
        className="furnace-heat"
        role="meter"
        aria-label="Furnace heat"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(heat * 100)}
        aria-valuetext={zone}
      >
        <div className="furnace-heat-scorch" style={{ left: `${SCORCH_FROM * 100}%` }} aria-hidden />
        <div className="furnace-heat-band" style={{ left: `${low * 100}%`, width: `${width * 100}%` }}>
          <span className="furnace-heat-centre" aria-hidden />
        </div>
        <span className="furnace-needle" aria-hidden style={{ left: `${Math.min(1, heat) * 100}%` }} />
      </div>
      <div className="row furnace-melt">
        <span className="small">Melt</span>
        <ProgressBar value={melt} color="#f4cd73" className="grow" />
      </div>
      <div className="row furnace-fire-row small">
        <span className="furnace-fire-pips" aria-label={`Fire: ${fireWord}`}>
          {FIRE_WORDS.map((word, i) => <span key={word} className={fire > i / FIRE_WORDS.length ? 'lit' : ''} />)}
        </span>
        <span className="muted">Fire: {fireWord}</span>
        <span className="spacer" />
        {flare > 0 && <strong className="furnace-flare" role="alert">Flare! Ease off</strong>}
      </div>
      <div className="row furnace-pump-row">
        <button
          className="btn primary furnace-pump"
          onPointerDown={(event) => { event.preventDefault(); pump(); }}
          onKeyDown={(event) => {
            if (event.key !== ' ' && event.key !== 'Enter') return;
            event.preventDefault();
            if (!event.repeat) pump();
          }}
        >
          <span key={squeeze} className={squeeze ? 'furnace-bellows-art squeeze' : 'furnace-bellows-art'} style={{ animationDuration: `${SQUEEZE_MS}ms` }} aria-hidden />
          Pump
        </button>
        {result && <strong key={result.id} role="status" className={`minigame-result ${result.r}`}>{result.r === 'miss' ? 'Scorched!' : RESULT_TEXT[result.r]}</strong>}
      </div>
      <p className="muted small">Tap Pump to stoke the fire. Hold the needle in the band to fill the melt; the gold centre fills it fastest and makes a double. As the fire catches it runs hotter on its own, so ease off the bellows before it scorches.</p>
    </div>
  );
}

export function UseBarGrade({ label = 'Use grade' }: { label?: string } = {}) {
  const s = useGame();
  const selectId = useId();
  return (
    <div className="furnace-select">
      <span className="furnace-label-row">
        <label htmlFor={selectId}>{label}</label>
        <HelpTip tip="Choose which bar purity (Crude, Refined, Pure, or Flawless) is spent first when crafting. Pure and Flawless bars boost item quality and can raise rolled modifier tiers; Crude bars give -1 purity." />
      </span>
      <select id={selectId} value={s.smelting.barGrade} onChange={(event) => {
        const grade = event.currentTarget.value as BarGradePreference;
        game.act((state) => { state.smelting.barGrade = grade; });
      }}>
        <option value="lowest">Lowest first</option>
        {BAR_GRADES.map((grade) => <option key={grade} value={grade}>{BAR_GRADE_NAMES[grade]} first</option>)}
      </select>
    </div>
  );
}

function SupplySlot({ s, slot }: { s: GameState; slot: 'fuel' | 'flux' }) {
  const selectId = useId();
  const choices = slot === 'fuel' ? FURNACE_FUELS : FURNACE_FLUXES;
  const selected = s.smelting[slot];
  const available = choices.filter((id) => id === selected || (s.smelting.charges[id] ?? 0) > 0 || (s.storage.bank[id] ?? 0) > 0);
  const loaded = selected ? s.smelting.charges[selected] ?? 0 : 0;
  const tip = slot === 'fuel'
    ? 'Charcoal, Coke, or Starcoal. Burned automatically (1 unit per 5 bars smelted) to raise Furnace Purity and roll purer bars.'
    : 'Crushed Stone, Bone Ash, or Crystal Flux. Burned alongside Fuel (1 unit per 5 bars smelted) to add Purity and reduce Crude rolls.';
  return (
    <div className="furnace-select">
      <span className="furnace-label-row">
        <label htmlFor={selectId}>{slot === 'fuel' ? 'Fuel' : 'Flux'}</label>
        <HelpTip tip={tip} />
      </span>
      <select id={selectId} value={selected ?? ''} onChange={(event) => {
        const id = event.currentTarget.value;
        game.act((state) => {
          if (slot === 'fuel') state.smelting.fuel = FURNACE_FUELS.find((fuel) => fuel === id) ?? null;
          else state.smelting.flux = FURNACE_FLUXES.find((flux) => flux === id) ?? null;
          if (id) state.smelting.showSupplyHint = false;
        });
      }}>
        <option value="">Empty</option>
        {available.map((id) => <option key={id} value={id}>{materialDef(id).name} · {s.storage.bank[id] ?? 0} in stock</option>)}
      </select>
      {loaded > 0 && <span className="muted small">{loaded} bars left on the current charge</span>}
    </div>
  );
}

function CostRows({ s, cost }: { s: GameState; cost: Record<string, number> }) {
  return (
    <ul className="furnace-costs">
      {Object.entries(cost).map(([id, count]) => (
        <li key={id} className={recipeStock(s.storage.bank, id) < count ? 'bad' : 'muted'}>
          <MatIcon id={id} /> {count} {materialDef(id).name}
        </li>
      ))}
    </ul>
  );
}

function RecipeRow({ s, d, a, children, onStart, lockedLevel }: {
  s: GameState; a: SkillAction; d: Derived; children?: ReactNode; onStart?: () => void; lockedLevel?: number;
}) {
  const blocker = actionBlocker(s, a);
  const running = s.action?.kind === 'skill' && s.action.actionId === a.id;
  const interval = actionIntervalMs(s, a, d);
  const output = Object.keys(a.outputs ?? a.protectedOutputs ?? {})[0];
  const metal = smeltMetal(a.batchOf ?? a.id);
  return (
    <article className={`card furnace-recipe${running ? ' furnace-running' : ''}${lockedLevel ? ' furnace-locked' : ''}`} data-tut={`action-${a.id}`}>
      <div className="row furnace-recipe-title">
        {output && <MatIcon id={output} size={18} />}
        <b>{a.name}</b>
        {lockedLevel !== undefined && <LockedBadge level={lockedLevel} />}
        <span className="spacer" />
        {running ? <button className="btn sm" onClick={() => game.act(stopAction)}>Stop</button>
          : <button className="btn sm primary" disabled={!!blocker} onClick={() => game.act((state, ctx) => {
            if (startSkillAction(state, ctx, a.id) === null) onStart?.();
          })}>Start</button>}
      </div>
      <div className="small muted">Level {a.level} · {(interval / 1000).toFixed(1)}s · {a.xp} XP · {metal ? `${furnaceBatchSize(s, a)} bars` : `${Object.values(a.outputs ?? a.protectedOutputs ?? {})[0]} per batch`}</div>
      <CostRows s={s} cost={smeltingCost(s, a, a.inputs ?? {})} />
      {children}
      {!running && blocker && <div className="small muted">{blocker}</div>}
      {running && s.action?.kind === 'skill' && <ProgressBar value={s.action.progress / interval} />}
      <MasteryProgress s={s} mastery={a.mastery} compact />
    </article>
  );
}

function QuickSmeltGrid({ s, d, level, go }: { s: GameState; d: Derived; level: number; go: (tab: FurnaceTab) => void }) {
  const quickBars = actionsFor('smelting').filter((a) => !a.batchOf && !!smeltMetal(a.id) && a.level <= level);
  return (
    <div className="furnace-quick">
      <div className="row">
        <b>Quick Smelt</b>
        <span className="spacer" />
        <button className="btn sm ghost" onClick={() => go('recipes')}>All recipes</button>
      </div>
      <div className="furnace-quick-grid">
        {quickBars.map((a) => {
          const output = Object.keys(a.outputs ?? {})[0];
          const cost = smeltingCost(s, a, a.inputs ?? {});
          const blocker = actionBlocker(s, a);
          const interval = actionIntervalMs(s, a, d);
          return (
            <div className="furnace-quick-card" key={a.id} data-tut={`action-${a.id}`}>
              <div className="row furnace-quick-head">
                {output && <MatIcon id={output} size={20} />}
                <div className="furnace-quick-meta">
                  <b>{smeltMetal(a.id)?.name ?? a.name} Bar</b>
                  <span className="dim small num">Lv {a.level} · {(interval / 1000).toFixed(1)}s · {furnaceBatchSize(s, a)} bar{furnaceBatchSize(s, a) === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div className="furnace-quick-ore">
                {Object.entries(cost).map(([oreId, qty]) => {
                  const have = recipeStock(s.storage.bank, oreId);
                  return (
                    <span key={oreId} className={`small num ${have < qty ? 'bad' : 'muted'}`}>
                      <MatIcon id={oreId} size={13} /> {fmt(have)}/{fmt(qty)} {materialDef(oreId).name}
                    </span>
                  );
                })}
              </div>
              <button
                className="btn sm primary"
                disabled={!!blocker}
                title={blocker ?? `Smelt ${a.name}`}
                onClick={() => game.act((state, ctx) => { startSkillAction(state, ctx, a.id); })}
              >Smelt</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FurnaceStation({ s, d, recipe, level, go }: { s: GameState; d: Derived; recipe?: SkillAction; level: number; go: (tab: FurnaceTab) => void }) {
  const metal = recipe && smeltMetal(recipe.batchOf ?? recipe.id);
  const score = purityScore(s);
  const odds = purityOdds(score);
  const hasFuelOrFlux =
    FURNACE_FUELS.some((id) => (s.storage.bank[id] ?? 0) > 0 || (s.smelting.charges[id] ?? 0) > 0) ||
    FURNACE_FLUXES.some((id) => (s.storage.bank[id] ?? 0) > 0 || (s.smelting.charges[id] ?? 0) > 0) ||
    !!s.smelting.fuel || !!s.smelting.flux;
  const hasEngaged = !!recipe || s.skills.smelting > 0 || hasFuelOrFlux || Object.values(s.smelting.parts).some((tier) => tier > 0);

  const output = recipe && Object.keys(recipe.outputs ?? recipe.protectedOutputs ?? {})[0];

  return (
    <div className="furnace-view-stack">
      <SkillIntro step="Start here: Pick an ore below to smelt bars">
        Smelt ores into bars for Forging &amp; Mining picks; later add Fuel &amp; Flux to roll purer bars.
      </SkillIntro>
      <section className={`furnace-hearth${recipe ? ' furnace-lit' : ''}`} aria-label="Furnace">
        <div className="furnace-hearth-art">
          <div className="furnace-arch" aria-hidden="true">
            <div className="furnace-mouth">
              <div className="furnace-glow" />
              <span className="furnace-flame f1" />
              <span className="furnace-flame f2" />
              <span className="furnace-flame f3" />
              <span className="furnace-flame f4" />
              <div className="furnace-coals" />
            </div>
          </div>
          <div className="furnace-hearth-status">
            {recipe
              ? <>{output && <MatIcon id={output} size={18} />} <b>{recipe.name}</b></>
              : <span className="muted">The furnace is cold. Pick an ore below to light it.</span>}
          </div>
        </div>
        <aside className="furnace-hearth-panel" aria-label="Heat and Purity">
          <div className="row">
            <b>Heat &amp; Purity</b>
            <span className="spacer" />
            <HelpTip
              label={`Purity ${score} / 14`}
              tip="Your Furnace Purity (0–14) comes from Fuel tier, Flux tier, Flue upgrades, and +1 per 20 Smelting levels. Higher Purity boosts Pure and Flawless chances and lowers Crude rolls."
            />
          </div>
          <ProgressBar value={score / 14} color="var(--accent)" />
          <p className="muted small">Chance of each bar grade per bar smelted:</p>
          <dl className="furnace-odds">
            {BAR_GRADES.map((grade) => (
              <div key={grade} data-grade={grade}>
                <dt><HelpTip label={BAR_GRADE_NAMES[grade]} tip={GRADE_TIPS[grade]} /></dt>
                <dd>{Number(odds[grade].toFixed(2))}%</dd>
              </div>
            ))}
          </dl>
          {hasFuelOrFlux && (
            <div className="furnace-slot-grid">
              <SupplySlot s={s} slot="fuel" />
              <SupplySlot s={s} slot="flux" />
            </div>
          )}
          {hasFuelOrFlux && s.smelting.showSupplyHint && (
            <div className="row furnace-hint">
              <p className="muted small">Load fuel and flux to roll purer bars. One of each lasts five bars.</p>
              <button className="btn sm" onClick={() => game.act((state) => { state.smelting.showSupplyHint = false; })}>Got it</button>
            </div>
          )}
          {!hasFuelOrFlux && (
            <p className="muted small">
              {hasEngaged ? 'No Fuel or Flux in stock yet.' : 'Fuel and Flux raise Purity for better bars.'} Make them in{' '}
              <button type="button" className="furnace-inline-link" onClick={() => go('supplies')}>Fuel &amp; flux</button>.
            </p>
          )}
          {score >= 8 && <p className="small muted">Living Metal has a 1 in 2,000 chance each batch.</p>}
        </aside>
      </section>
      {recipe ? (
        <div className={metal ? 'furnace-station' : undefined}>
          <RecipeRow s={s} d={d} a={recipe} />
          {metal && (
            <section className="card furnace-bellows-card">
              <BellowsGame key={`${recipe.id}-${s.smelting.parts.bellows}`} metal={metal.id} tier={s.smelting.parts.bellows} onSwing={(result) => {
                game.act((state) => {
                  if (state.action?.kind === 'skill' && state.action.actionId === recipe.id) minigameSwing(state, result);
                });
              }} />
              <div className="row furnace-focus">
                <span>Focus</span>
                <ProgressBar value={focusOf(s)} className="grow" />
                <span className="num">+{Math.round((focusMult(s, 'smelting') - 1) * 100)}% speed</span>              </div>
            </section>
          )}
        </div>
      ) : <section className="card furnace-quick-card-wrap"><QuickSmeltGrid s={s} d={d} level={level} go={go} /></section>}
    </div>
  );
}

function SupplyRecipe({ s, d, a }: { s: GameState; d: Derived; a: SkillAction }) {
  return (
    <RecipeRow s={s} d={d} a={a}>
      {Object.entries(a.outputs ?? {}).map(([id, count]) => {
        const fuelTier = FURNACE_FUELS.indexOf(id as typeof FURNACE_FUELS[number]) + 1;
        const tier = fuelTier || FURNACE_FLUXES.indexOf(id as typeof FURNACE_FLUXES[number]) + 1;
        return (
          <div key={id} className="furnace-makes small">
            <span>Makes</span> <MatIcon id={id} size={16} /> <b>{count} {materialDef(id).name}</b>
            {tier > 0 && <span className="muted furnace-makes-detail">{fuelTier ? 'Fuel' : 'Flux'} tier {tier} · +{tier} Purity · {s.storage.bank[id as FurnaceSupply] ?? 0} in stock</span>}
          </div>
        );
      })}
      {a.id === 'furnace_charcoal_logs' && <div className="small muted">Any combination of 5 logs.</div>}
      {a.id === 'furnace_bone_ash' && <div className="small muted">Uses one Mining fossil of any kind.</div>}
    </RecipeRow>
  );
}

function Supplies({ s, d, recipes }: { s: GameState; d: Derived; recipes: SkillAction[] }) {
  const makes = (a: SkillAction) => Object.keys(a.outputs ?? {})[0] ?? '';
  const fuels = recipes.filter((a) => (FURNACE_FUELS as readonly string[]).includes(makes(a)));
  const fluxes = recipes.filter((a) => (FURNACE_FLUXES as readonly string[]).includes(makes(a)));
  return <>
    <SkillIntro step="Fuel & Flux supplies">
      Fuel and Flux make purer bars. Craft them here, then load them on the Furnace tab. Each unit lasts 5 bars and adds Purity.
    </SkillIntro>
    <div className="furnace-slot-grid"><SupplySlot s={s} slot="fuel" /><SupplySlot s={s} slot="flux" /></div>
    <h3 className="furnace-group-title">Fuel <span className="muted small">· Charcoal, then Coke, then Starcoal. Burns hotter for more Purity.</span></h3>
    <div className="furnace-grid">{fuels.map((a) => <SupplyRecipe key={a.id} s={s} d={d} a={a} />)}</div>
    <h3 className="furnace-group-title">Flux <span className="muted small">· Crushed Stone, then Bone Ash, then Crystal Flux. Draws impurities out of the melt.</span></h3>
    <div className="furnace-grid">{fluxes.map((a) => <SupplyRecipe key={a.id} s={s} d={d} a={a} />)}</div>
  </>;
}

function Parts({ s, level }: { s: GameState; level: number }) {
  const [showLocked, setShowLocked] = useState(false);
  const nextLevels = FURNACE_PARTS.map((part) => {
    const tier = s.smelting.parts[part];
    return tier < FURNACE_PART_LEVELS.length ? FURNACE_PART_LEVELS[tier] : 0;
  }).filter((lv) => lv > level);
  const nearLocked = new Set([...new Set(nextLevels)].sort((a, b) => a - b).slice(0, 2));
  const visibleParts = showLocked
    ? FURNACE_PARTS
    : FURNACE_PARTS.filter((part) => {
      const tier = s.smelting.parts[part];
      const lv = tier < FURNACE_PART_LEVELS.length ? FURNACE_PART_LEVELS[tier] : 0;
      return lv <= level || nearLocked.has(lv);
    });
  const hiddenParts = FURNACE_PARTS.length - visibleParts.length;

  return <>
    <SkillIntro step="Furnace upgrades">
      Upgrade permanent furnace parts with Refined (or higher) bars for faster cycles, wider bellows bands, larger batches, and bonus Purity.
    </SkillIntro>
    <div className="row furnace-toolbar">
      <UseBarGrade />
      <span className="spacer" />
      <label className="check small">
        <input type="checkbox" checked={showLocked} onChange={(e) => setShowLocked(e.target.checked)} />
        {' '}Show locked{hiddenParts > 0 ? ` (${hiddenParts} far tiers)` : ' (all tiers)'}
      </label>
    </div>
    <div className="furnace-grid">
      {visibleParts.map((part) => {
        const currentTier = s.smelting.parts[part];
        const upgrade = furnacePartUpgrade(s, part);
        const nextLevel = currentTier < FURNACE_PART_LEVELS.length ? FURNACE_PART_LEVELS[currentTier] : undefined;
        return (
          <article key={part} className="card furnace-recipe">
            <div className="row">
              <b>{FURNACE_PART_NAMES[part]}</b>
              {nextLevel !== undefined && nextLevel > level && <LockedBadge level={nextLevel} />}
              <span className="spacer" />
              <span>Tier {currentTier} / 4</span>
            </div>
            <p className="muted small">{FURNACE_PART_EFFECTS[part]}</p>
            {upgrade && <>
              <CostRows s={s} cost={upgrade.cost} />
              <div className="row">
                <span className="muted small">{upgrade.blocker}</span><span className="spacer" />
                <button className="btn sm primary" disabled={!!upgrade.blocker} onClick={() => game.act((state, ctx) => {
                  const error = improveFurnacePart(state, part);
                  if (error) ctx.emit({ t: 'info', text: error, tone: 'warn' });
                })}>Upgrade</button>
              </div>
            </>}
            {showLocked && currentTier < FURNACE_PART_LEVELS.length && (
              <div className="furnace-part-roadmap small muted">
                {FURNACE_PART_LEVELS.map((lv, idx) => idx >= currentTier && (
                  <span key={lv} className={lv <= level ? 'good' : 'dim'}>T{idx + 1} Lv {lv}</span>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  </>;
}

export function FurnaceView() {
  const s = useGame();
  const d = deriveStats(s);
  const level = skillLevel(s, 'smelting');
  const [tab, setTab] = useState<FurnaceTab>('furnace');
  const [showLockedRecipes, setShowLockedRecipes] = useState(false);
  const running = s.action?.kind === 'skill' ? actionDef(s.action.actionId) : undefined;
  const active = running?.skill === 'smelting' ? running : undefined;
  const recipes = actionsFor('smelting').filter((a) => !a.batchMastery || masteryLevel(s, `task.${a.batchOf}`) >= a.batchMastery);
  const tabs: TabDef<FurnaceTab>[] = [
    { id: 'furnace', label: 'Furnace' },
    { id: 'recipes', label: 'Recipes' },
    { id: 'supplies', label: 'Fuel & flux' },
    { id: 'parts', label: 'Furnace parts' },
    { id: 'alloys', label: 'Master alloys', locked: level < 80 ? 'Unlocks at Smelting Lv 80' : undefined },
  ];

  const barAndAlloyRecipes = recipes.filter((a) => !a.id.startsWith('furnace_') && !a.id.startsWith('alloy_master_'));
  const lockedRecipeLevels = [...new Set(barAndAlloyRecipes.filter((a) => a.level > level).map((a) => a.level))].sort((a, b) => a - b);
  const nearLockedRecipes = new Set(lockedRecipeLevels.slice(0, 2));
  const visibleRecipes = showLockedRecipes
    ? barAndAlloyRecipes
    : barAndAlloyRecipes.filter((a) => a.level <= level || nearLockedRecipes.has(a.level));
  const hiddenRecipes = barAndAlloyRecipes.length - visibleRecipes.length;

  return (
    <div className="furnace-view">
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'furnace' && <FurnaceStation s={s} d={d} recipe={active} level={level} go={setTab} />}
      {tab === 'recipes' && <>
        <SkillIntro step="Smelting recipes">
          Smelt ores into metal bars and specialised alloys. Far-future bar tiers stay tucked away until you are within two tiers of unlocking them.
        </SkillIntro>
        <div className="row furnace-toolbar">
          <UseBarGrade />
          <span className="spacer" />
          {(hiddenRecipes > 0 || showLockedRecipes) && (
            <label className="check small">
              <input type="checkbox" checked={showLockedRecipes} onChange={(e) => setShowLockedRecipes(e.target.checked)} />
              {' '}Show locked{hiddenRecipes > 0 ? ` (${hiddenRecipes})` : ''}
            </label>
          )}
        </div>
        <div className="furnace-grid">
          {visibleRecipes.map((a) => (
            <RecipeRow key={a.id} s={s} d={d} a={a} lockedLevel={a.level > level ? a.level : undefined} onStart={() => setTab('furnace')} />
          ))}
        </div>
      </>}
      {tab === 'supplies' && <Supplies s={s} d={d} recipes={recipes.filter((a) => a.id.startsWith('furnace_'))} />}
      {tab === 'parts' && <Parts s={s} level={level} />}
      {tab === 'alloys' && <>
        <SkillIntro step="Endgame Master Alloys">
          Cast Flawless bars (and rare Living Metal) into Master Alloys for The High Crucible in Forging. Requires two Tier 4 furnace parts.
        </SkillIntro>
        <div className="furnace-grid">
          {MASTER_ALLOYS.flatMap((alloy) => ['', 'living_'].map((variant) => {
            const id = `alloy_master_${variant}${alloy.id}`;
            return <RecipeRow key={id} s={s} d={d} a={actionDef(id)}>
              <p className="small">{alloy.signature}{variant && ' and a second signature.'}</p>
            </RecipeRow>;
          }))}
        </div>
      </>}
    </div>
  );
}

export function IngotRack({ outputs }: { outputs: Record<string, number> }) {
  const metals = MINING_METALS.filter((metal) => BAR_GRADES.some((grade) => outputs[barId(metal.id, grade)] > 0));
  const living = outputs.living_metal ?? 0;
  if (!metals.length && !living) return null;
  return (
    <section className="furnace-rack">
      <h3>Ingot rack</h3>
      {metals.map((metal) => (
        <div className="furnace-rack-row" key={metal.id}>
          <strong>{metal.name}</strong>
          {BAR_GRADES.map((grade) => {
            const id = barId(metal.id, grade);
            return outputs[id] > 0 && <span key={id} className="furnace-rack-ingot" data-grade={grade}>
              <MatIcon id={id} /> {outputs[id]} {BAR_GRADE_NAMES[grade]}
            </span>;
          })}
        </div>
      ))}
      {living > 0 && <div className="furnace-rack-row"><span className="furnace-rack-ingot" data-grade="living"><MatIcon id="living_metal" /> {living} Living Metal</span></div>}
    </section>
  );
}
