import { useEffect, useRef, useState, type ReactNode } from 'react';
import { materialDef } from '../../data/materials';
import { MINING_METALS } from '../../data/mining';
import {
  barId, BAR_GRADES, BAR_GRADE_NAMES, FURNACE_FLUXES, FURNACE_FUELS, FURNACE_PART_EFFECTS,
  FURNACE_PART_NAMES, FURNACE_PARTS, MASTER_ALLOYS, recipeStock, smeltMetal,
  type BarGradePreference, type FurnaceSupply,
} from '../../data/smelting';
import { actionDef, actionsFor, type SkillAction } from '../../data/skills';
import { bellowsResult, doubleReady, focusMult, focusOf, inDoubleZone, minigameSwing, type SwingResult } from '../../engine/minigame';
import {
  bellowsBandWidth, furnaceBatchSize, furnacePartUpgrade, improveFurnacePart, purityOdds, purityScore, smeltingCost,
} from '../../engine/smelting';
import { actionBlocker, actionIntervalMs, startSkillAction, stopAction } from '../../engine/skills';
import { masteryLevel } from '../../engine/skillingMastery';
import { deriveStats, type Derived } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { MatIcon, ProgressBar, Tabs, type TabDef } from './common';
import { MasteryProgress } from './MasteryProgress';
import './furnace.css';

type FurnaceTab = 'furnace' | 'recipes' | 'supplies' | 'parts' | 'alloys' | 'masterworks';
const FURNACE_TABS: TabDef<FurnaceTab>[] = [
  { id: 'furnace', label: 'Furnace' }, { id: 'recipes', label: 'Recipes' }, { id: 'supplies', label: 'Fuel & flux' },
  { id: 'parts', label: 'Furnace parts' }, { id: 'alloys', label: 'Master alloys' },
];
const ATTEMPT_MS = 3_000;
const BAND_CENTRE = 0.57;
const RESULT_TEXT: Record<SwingResult, string> = { double: 'Double!', hit: 'Hit', weak: 'Weak', miss: 'Miss' };

interface Attempt {
  started: number;
  previous: number;
  heat: number;
  velocity: number;
  inBand: number;
  inGold: number;
}

export function BellowsGame({ metal, tier, onSwing }: { metal: string; tier: number; onSwing: (result: SwingResult) => void }) {
  const width = bellowsBandWidth(metal, tier);
  const low = BAND_CENTRE - width / 2;
  const high = BAND_CENTRE + width / 2;
  const hold = useRef(false);
  const attempt = useRef<Attempt | null>(null);
  const frame = useRef(0);
  const [heat, setHeat] = useState(low);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<SwingResult | null>(null);

  useEffect(() => {
    const stop = () => {
      cancelAnimationFrame(frame.current);
      attempt.current = null;
      hold.current = false;
    };
    const onVisibility = () => {
      if (!document.hidden) return;
      stop();
      setElapsed(0);
      setHeat(low);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [low]);

  const animate = (time: number) => {
    const current = attempt.current;
    if (!current) return;
    const until = Math.min(time, current.started + ATTEMPT_MS);
    const delta = until - current.previous;
    if (delta <= 0) {
      frame.current = requestAnimationFrame(animate);
      return;
    }
    current.previous = until;
    const speed = hold.current ? 0.25 : -0.21;
    current.velocity += (speed - current.velocity) * (1 - Math.exp(-delta / 115));
    current.heat = Math.max(0, Math.min(1, current.heat + current.velocity * delta / 1000));
    if (current.heat >= low && current.heat <= high) current.inBand += delta;
    if (inDoubleZone(current.heat, low, width)) current.inGold += delta;
    setHeat(current.heat);
    setElapsed(until - current.started);

    if (until - current.started >= ATTEMPT_MS) {
      const outcome = bellowsResult(current.inGold / ATTEMPT_MS, current.inBand / ATTEMPT_MS);
      attempt.current = null;
      setResult(outcome);
      onSwing(outcome);
      return;
    }
    frame.current = requestAnimationFrame(animate);
  };

  const pump = () => {
    hold.current = true;
    if (attempt.current) return;
    const now = performance.now();
    attempt.current = { started: now, previous: now, heat: low, velocity: 0, inBand: 0, inGold: 0 };
    setHeat(low);
    setElapsed(0);
    setResult(null);
    frame.current = requestAnimationFrame(animate);
  };
  const release = () => { hold.current = false; };
  const zone = inDoubleZone(heat, low, width) ? 'Sweet spot' : heat >= low && heat <= high ? 'In range' : heat < low ? 'Too cool' : 'Too hot';

  return (
    <div className="furnace-bellows">
      <div className="row"><b>Work the bellows</b><span className="spacer" /><span className="small">{zone}</span></div>
      <div
        className="furnace-heat"
        role="meter"
        aria-label="Furnace heat"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(heat * 100)}
        aria-valuetext={zone}
      >
        <div className="furnace-heat-band" style={{ left: `${low * 100}%`, width: `${width * 100}%` }}>
          <span className="furnace-heat-centre" aria-hidden />
        </div>
        <span className="furnace-needle" aria-hidden style={{ left: `${heat * 100}%` }} />
      </div>
      <ProgressBar value={elapsed / ATTEMPT_MS} color="var(--accent)" />
      <p className="muted small">Hold to heat, release to cool. Keep the needle in the centre for a double.</p>
      <div className="row">
        <button
          className="btn primary furnace-pump"
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pump(); }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
          onKeyDown={(event) => {
            if (event.key !== ' ' && event.key !== 'Enter') return;
            event.preventDefault();
            if (!event.repeat) pump();
          }}
          onKeyUp={(event) => { if (event.key === ' ' || event.key === 'Enter') release(); }}
          onBlur={release}
        >Hold to pump</button>
        {result && <strong role="status" className={`minigame-result ${result}`}>{RESULT_TEXT[result]}</strong>}
      </div>
    </div>
  );
}

export function UseBarGrade() {
  const s = useGame();
  return (
    <label className="furnace-select">
      <span>Use grade</span>
      <select value={s.smelting.barGrade} onChange={(event) => {
        const grade = event.currentTarget.value as BarGradePreference;
        game.act((state) => { state.smelting.barGrade = grade; });
      }}>
        <option value="lowest">Lowest first</option>
        {BAR_GRADES.map((grade) => <option key={grade} value={grade}>{BAR_GRADE_NAMES[grade]} first</option>)}
      </select>
    </label>
  );
}

function SupplySlot({ s, slot }: { s: GameState; slot: 'fuel' | 'flux' }) {
  const choices = slot === 'fuel' ? FURNACE_FUELS : FURNACE_FLUXES;
  const selected = s.smelting[slot];
  const available = choices.filter((id) => id === selected || (s.smelting.charges[id] ?? 0) > 0 || (s.storage.bank[id] ?? 0) > 0);
  const loaded = selected ? s.smelting.charges[selected] ?? 0 : 0;
  return (
    <label className="furnace-select">
      <span>{slot === 'fuel' ? 'Fuel' : 'Flux'}</span>
      <select value={selected ?? ''} onChange={(event) => {
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
    </label>
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

function RecipeRow({ s, a, d, children, onStart }: { s: GameState; a: SkillAction; d: Derived; children?: ReactNode; onStart?: () => void }) {
  const blocker = actionBlocker(s, a);
  const running = s.action?.kind === 'skill' && s.action.actionId === a.id;
  const interval = actionIntervalMs(s, a, d);
  const output = Object.keys(a.outputs ?? a.protectedOutputs ?? {})[0];
  const metal = smeltMetal(a.batchOf ?? a.id);
  return (
    <article className={`card furnace-recipe${running ? ' furnace-running' : ''}`} data-tut={`action-${a.id}`}>
      <div className="row furnace-recipe-title">
        {output && <MatIcon id={output} size={18} />}
        <b>{a.name}</b><span className="spacer" />
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

function FurnaceStation({ s, d, recipe, go }: { s: GameState; d: Derived; recipe?: SkillAction; go: (tab: FurnaceTab) => void }) {
  const metal = recipe && smeltMetal(recipe.batchOf ?? recipe.id);
  const score = purityScore(s);
  const odds = purityOdds(score);
  return (
    <div className="furnace-station">
      <section className="card furnace-chamber" aria-label="Furnace">
        <div className={`furnace-cutaway${recipe ? ' furnace-lit' : ''}`} aria-hidden="true">
          <div className="furnace-door"><div className="furnace-coals" /></div>
        </div>
        {recipe ? <RecipeRow s={s} d={d} a={recipe} /> : <button className="btn primary" onClick={() => go('recipes')}>Choose a recipe</button>}
        <div className="furnace-slot-grid">
          <SupplySlot s={s} slot="fuel" />
          <SupplySlot s={s} slot="flux" />
        </div>
        {s.smelting.showSupplyHint && (
          <div className="row furnace-hint">
            <p className="muted small">Load fuel and flux to roll purer bars. One of each lasts five bars.</p>
            <button className="btn sm" onClick={() => game.act((state) => { state.smelting.showSupplyHint = false; })}>Got it</button>
          </div>
        )}
      </section>
      <div className="furnace-controls">
        <section className="card">
          <div className="row"><b>Purity odds</b><span className="spacer" /><span className="muted small">Purity {score}</span></div>
          <dl className="furnace-odds">
            {BAR_GRADES.map((grade) => <div key={grade} data-grade={grade}><dt>{BAR_GRADE_NAMES[grade]}</dt><dd>{Number(odds[grade].toFixed(2))}%</dd></div>)}
          </dl>
          {score >= 8 && <p className="small muted">Living Metal has a 1 in 2,000 chance each batch.</p>}
        </section>
        {recipe && metal && (
          <section className="card">
            <BellowsGame key={`${recipe.id}-${s.smelting.parts.bellows}`} metal={metal.id} tier={s.smelting.parts.bellows} onSwing={(result) => {
              game.act((state) => {
                if (state.action?.kind === 'skill' && state.action.actionId === recipe.id) minigameSwing(state, result);
              });
            }} />
            <div className="row furnace-focus">
              <span>Focus</span>
              <ProgressBar value={focusOf(s)} className="grow" />
              <span className="num">+{Math.round((focusMult(s, 'smelting') - 1) * 100)}% speed</span>
              {doubleReady(s) && <span className="good">Next batch ×2</span>}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Supplies({ s, d, recipes }: { s: GameState; d: Derived; recipes: SkillAction[] }) {
  return <>
    <div className="furnace-slot-grid"><SupplySlot s={s} slot="fuel" /><SupplySlot s={s} slot="flux" /></div>
    <div className="furnace-grid">
      {recipes.map((a) => <RecipeRow key={a.id} s={s} d={d} a={a}>
        {a.id === 'furnace_charcoal_logs' && <div className="small muted">Any combination of 5 logs.</div>}
        {a.id === 'furnace_bone_ash' && <div className="small muted">Uses one Mining fossil of any kind.</div>}
        {Object.keys(a.outputs ?? {}).map((id) => {
          const tier = Math.max(FURNACE_FUELS.indexOf(id as typeof FURNACE_FUELS[number]), FURNACE_FLUXES.indexOf(id as typeof FURNACE_FLUXES[number])) + 1;
          return tier > 0 && <div key={id} className="small">Tier {tier} · +{tier} purity · {s.storage.bank[id as FurnaceSupply] ?? 0} in stock</div>;
        })}
      </RecipeRow>)}
    </div>
  </>;
}

function Parts({ s }: { s: GameState }) {
  return <>
    <UseBarGrade />
    <div className="furnace-grid">
      {FURNACE_PARTS.map((part) => {
        const upgrade = furnacePartUpgrade(s, part);
        return (
          <article key={part} className="card furnace-recipe">
            <div className="row"><b>{FURNACE_PART_NAMES[part]}</b><span className="spacer" /><span>Tier {s.smelting.parts[part]} / 4</span></div>
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
          </article>
        );
      })}
    </div>
  </>;
}

export function FurnaceView({ projects }: { projects?: ReactNode }) {
  const s = useGame();
  const d = deriveStats(s);
  const [tab, setTab] = useState<FurnaceTab>(() => s.professionProgress.activeProject?.project.skill === 'smelting' ? 'masterworks' : 'furnace');
  const running = s.action?.kind === 'skill' ? actionDef(s.action.actionId) : undefined;
  const active = running?.skill === 'smelting' ? running : undefined;
  const recipes = actionsFor('smelting').filter((a) => !a.batchMastery || masteryLevel(s, `task.${a.batchOf}`) >= a.batchMastery);
  const tabs = projects ? [...FURNACE_TABS, { id: 'masterworks' as const, label: 'Masterworks' }] : FURNACE_TABS;
  return (
    <div className="furnace-view">
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'furnace' && <FurnaceStation s={s} d={d} recipe={active} go={setTab} />}
      {tab === 'recipes' && <>
        <UseBarGrade />
        <div className="furnace-grid">
          {recipes.filter((a) => !a.id.startsWith('furnace_') && !a.id.startsWith('alloy_master_')).map((a) => (
            <RecipeRow key={a.id} s={s} d={d} a={a} onStart={() => setTab('furnace')} />
          ))}
        </div>
      </>}
      {tab === 'supplies' && <Supplies s={s} d={d} recipes={recipes.filter((a) => a.id.startsWith('furnace_'))} />}
      {tab === 'parts' && <Parts s={s} />}
      {tab === 'alloys' && <div className="furnace-grid">
        {MASTER_ALLOYS.flatMap((alloy) => ['', 'living_'].map((variant) => {
          const id = `alloy_master_${variant}${alloy.id}`;
          return <RecipeRow key={id} s={s} d={d} a={actionDef(id)}>
            <p className="small">{alloy.signature}{variant && ' and a second signature.'}</p>
          </RecipeRow>;
        }))}
      </div>}
      {tab === 'masterworks' && <><UseBarGrade />{projects}</>}
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
