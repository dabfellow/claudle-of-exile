import { useState, type ReactNode } from 'react';
import { baseDef, obtainable } from '../../data/bases';
import { materialDef } from '../../data/materials';
import { actionDef, actionsFor, type SkillAction } from '../../data/skills';
import { JIGS, WOOD_FAMILIES, woodFamily, type Jig, type WoodFamily } from '../../data/woodcrafting';
import { recipeMaterialCount } from '../../engine/bank';
import { itemName } from '../../engine/items';
import { actionBlocker, actionIntervalMs, resinBonus, skillLevel, smithIlvl, stopAction } from '../../engine/skills';
import { purposeGuarantees } from '../../engine/smithing';
import { deriveStats } from '../../engine/stats';
import type { GameState, Item } from '../../engine/types';
import {
  activeWoodTuning, buildWoodJig, chooseWoodTuning, jigUpgrade, recipeDials, removeWoodTuning, retuneLivingWood,
  saveWoodTuning, startWoodcraft, woodDialIndices, woodDialRange, woodImplicits, woodRackItems, woodTuningSlots, type WoodPlan,
} from '../../engine/woodcrafting';
import { game, useGame } from '../../game';
import { Art, fmtTime, MatIcon, ProgressBar, Tabs } from './common';
import { UseBarGrade } from './FurnaceView';
import { SkillMinigame } from './SkillMinigame';
import { MasteryProgress } from './MasteryProgress';
import { Icon } from './Icon';
import './wood-bench.css';

const families = Object.keys(WOOD_FAMILIES) as WoodFamily[];
const recipes = actionsFor('woodcrafting').filter((a) => !a.baseId || obtainable(baseDef(a.baseId)));
const livingMaterials = ['legend_heartwood', 'world_tree_heart'] as const;
const tabs = [
  { id: 'bench', label: 'Workbench' }, { id: 'recipes', label: 'Recipes' }, { id: 'jigs', label: 'Jigs' },
  { id: 'tunings', label: 'Tunings' }, { id: 'masterworks', label: 'Masterworks' },
] as const;
type WoodTab = (typeof tabs)[number]['id'];

function Costs({ s, inputs }: { s: GameState; inputs: Record<string, number> }) {
  return <div className="wood-costs">{Object.entries(inputs).map(([id, count]) => {
    const have = recipeMaterialCount(s.storage.bank, id);
    return <span key={id} className={have < count ? 'bad' : 'muted'}><MatIcon id={id} /> {materialDef(id).name} {have}/{count}</span>;
  })}</div>;
}

function Dials({ s, recipe, dials, living, item, change }: {
  s: GameState; recipe: SkillAction; dials: number[]; living: boolean; item?: Item; change: (dials: number[]) => void;
}) {
  const family = woodFamily(recipe.baseId!);
  const values = recipeDials(s, recipe, dials, living);
  const implicits = woodImplicits({ baseId: recipe.baseId!, dials: values, balanced: item?.balanced });
  return <div className="wood-dials">
    {woodDialIndices(recipe, living).map((index) => {
      const dial = WOOD_FAMILIES[family].dials[index];
      const max = woodDialRange(s, family, index);
      return <label key={dial.name} className="wood-dial">
        <span><b>{dial.name}</b><span>{values[index] === 0 ? 'Neutral' : values[index]}</span></span>
        <input aria-label={dial.name} type="range" min={-max} max={max} value={values[index]} onChange={(e) => {
          const next = [...values];
          next[index] = Number(e.target.value);
          change(next);
        }} />
        <span className="muted small"><span>{dial.sides[0].label}</span><span>{dial.sides[1].label}</span></span>
      </label>;
    })}
    {implicits.length > 0 && <ul className="wood-implicits">
      {implicits.map((implicit, index) => <li key={index} className={implicit.value < 0 ? 'bad' : 'good'}>{implicit.text}</li>)}
    </ul>}
  </div>;
}

function JigsView({ s, notify }: { s: GameState; notify: (message: string) => void }) {
  return <div className="wood-grid">{(Object.keys(JIGS) as Jig[]).map((jig) => {
    const next = jigUpgrade(s, jig);
    return <section className="card wood-card" key={jig}>
      <h3>{JIGS[jig]}</h3>
      <p>Tier {s.woodcrafting.jigs[jig]} / 3 · {families.filter((family) => WOOD_FAMILIES[family].jig === jig).map((family) => WOOD_FAMILIES[family].name).join(', ')}</p>
      {next && <>
        <p className="muted small">{next.level === 50 ? 'Extra tuning slot and wider second dial' : 'Wider dial range'}</p>
        <Costs s={s} inputs={next.cost} />
        <button className="btn sm" disabled={!!next.blocker} onClick={() => notify(game.act((st) => buildWoodJig(st, jig)) ?? 'Jig upgraded')}>
          {next.blocker ?? 'Upgrade jig'}
        </button>
      </>}
    </section>;
  })}</div>;
}

function Retune({ s, item, notify }: { s: GameState; item: Item; notify: (message: string) => void }) {
  const [dials, setDials] = useState(item.dials ?? []);
  return <details className="card wood-card">
    <summary>{itemName(item)} · Growth {item.living?.growth}/10</summary>
    <Dials s={s} recipe={actionDef(`smith_${item.baseId}`)} dials={dials} living item={item} change={setDials} />
    <button className="btn sm" onClick={() => notify(game.act((st) => retuneLivingWood(st, item.uid, dials)) ?? 'Living piece retuned')}>Retune and halve growth</button>
  </details>;
}

export function WoodRack() {
  const s = useGame();
  const items = woodRackItems(s);
  if (!items.length) return null;
  return <section className="away-alert wood-return" aria-label="Finished woodcrafting">
    <div className="row"><b>Finished pieces</b><span className="spacer" /><button className="btn sm" onClick={() => game.act((st) => { st.woodcrafting.rack = []; })}>Clear rack</button></div>
    {items.map((item) => <div key={item.uid}>
      <b>{itemName(item)}</b>
      {item.balanced !== undefined && <span className="good"> · Perfectly balanced</span>}
      {item.living && <span className="good"> · Living</span>}
      <p className="small muted">{woodImplicits(item).map(({ text }) => text).join(' · ') || 'Neutral tuning'}</p>
    </div>)}
  </section>;
}

export function WoodBench({ catalysts, masterworks }: { catalysts: ReactNode; masterworks: ReactNode }) {
  const s = useGame();
  const all = recipes;
  const [tab, setTab] = useState<WoodTab>(() => s.professionProgress.activeProject?.project.skill === 'woodcrafting' ? 'masterworks' : 'bench');
  const [id, setId] = useState(() => all.find((a) => !!a.baseId && !a.purpose)!.id);
  const [family, setFamily] = useState<WoodFamily>(() => woodFamily(actionDef(id).baseId!));
  const [manual, setManual] = useState<number[] | null>(null);
  const [living, setLiving] = useState<WoodPlan['living']>();
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const activeTuning = activeWoodTuning(s, family);
  const selection = actionDef(id);
  const base = selection.baseId && baseDef(selection.baseId);
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'woodcrafting' ? s.action : null;
  const runningRecipe = running && actionDef(running.actionId);
  const d = deriveStats(s);
  const inputs = { ...selection.inputs, ...(living && base ? { [living]: 1 } : {}) };
  const noLiving = living && base && !(s.storage.bank[living] > 0);
  const reason = actionBlocker(s, selection) ?? (noLiving ? 'Missing living wood' : null);
  const dials = manual ?? activeTuning?.dials ?? [];
  const selectRecipe = (next: SkillAction) => {
    setId(next.id);
    if (next.baseId) setFamily(woodFamily(next.baseId));
    else setLiving(undefined);
    setManual(null);
    setNotice('');
  };
  const chooseFamily = (next: WoodFamily) => {
    setFamily(next);
    const recipe = all.find((a) => a.baseId && !a.purpose && woodFamily(a.baseId) === next);
    if (recipe) selectRecipe(recipe);
  };
  const carriedLiving = [...s.inventory, ...Object.values(s.equipment)].filter((item): item is Item => !!item?.living);
  return <section className="wood-bench">
    <Tabs tabs={[...tabs]} value={tab} onChange={(next) => { setTab(next); setNotice(''); }} />
    {tab === 'bench' && <div className="wood-bench-layout">
      <section className="card wood-card wood-piece">
        <h2>Woodcrafting bench</h2>
        {base && <div className="wood-piece-art">
          <Art src={`items/${base.id}`} alt="" size={80} fallback={<Icon name={base.slot} size={40} />} />
          <strong>{base.name}</strong>
          <span className="muted small">Item level {smithIlvl(s, selection.purpose ? 0 : resinBonus(s))}</span>
        </div>}
        <label>Family <select value={family} onChange={(e) => chooseFamily(e.target.value as WoodFamily)}>
          {families.map((key) => <option key={key} value={key}>{WOOD_FAMILIES[key].name}</option>)}
        </select></label>
        <label>Recipe <select value={id} onChange={(e) => selectRecipe(actionDef(e.target.value))}>
          {base && all.filter((a) => a.baseId && woodFamily(a.baseId) === family).map((a) => <option key={a.id} value={a.id}>{a.name} · Lv {a.level}</option>)}
          {!base && <option value={selection.id}>{selection.name}</option>}
        </select></label>
        {base && <>
          {skillLevel(s, 'woodcrafting') >= 80 && <label>Living wood <select value={living ?? ''} onChange={(e) => setLiving(livingMaterials.find((material) => material === e.target.value))}>
            <option value="">None</option>
            {livingMaterials.map((material) => <option key={material} value={material} disabled={!(s.storage.bank[material] > 0)}>{materialDef(material).name} · {s.storage.bank[material] ?? 0} owned</option>)}
          </select></label>}
          <label>Active tuning <select value={activeTuning?.id ?? ''} onChange={(e) => {
            setManual(null); game.act((st) => chooseWoodTuning(st, family, e.target.value));
          }}>
            <option value="">Neutral</option>
            {s.woodcrafting.tunings.filter((t) => t.family === family).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></label>
          <Dials s={s} recipe={selection} dials={dials} living={!!living} change={setManual} />
          <form className="wood-save" onSubmit={(e) => {
            e.preventDefault();
            const result = game.act((st) => saveWoodTuning(st, family, name, dials));
            setNotice(result ?? 'Tuning saved and active');
            if (!result) { setManual(null); setName(''); }
          }}>
            <label>Tuning name <input maxLength={50} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <button className="btn sm" type="submit">Save tuning</button>
          </form>
          {manual && <p className="dim small">The draft applies to the next piece you carve here. Saved tunings apply to repeats and time away.</p>}
          <UseBarGrade />
        </>}
        {selection.purpose && purposeGuarantees(selection, smithIlvl(s)).map(({ affix, ranges }) =>
          <p className="small good" key={affix.id}>{affix.text.replace(/\{(\d+)\}/g, (_, index) => String(ranges[Number(index)][0]))} guaranteed</p>)}
        <Costs s={s} inputs={inputs} />
        <MasteryProgress s={s} mastery={selection.mastery} />
        <p className="small muted">{fmtTime(actionIntervalMs(s, selection, d))} · {selection.xp} XP</p>
        <button className="btn primary" disabled={!!reason} onClick={() => {
          setNotice(game.act((st, ctx) => startWoodcraft(st, ctx, selection, { dials: manual ?? undefined, living })) ?? '');
        }}>{reason ?? 'Start carving'}</button>
      </section>
      <div>
        {running && runningRecipe && <section className="card wood-card">
          <b>{runningRecipe.name}</b>
          <ProgressBar value={running.progress / actionIntervalMs(s, runningRecipe, d)} />
          <button className="btn sm" onClick={() => game.act(stopAction)}>Stop carving</button>
        </section>}
        <SkillMinigame skill="woodcrafting" />
        {catalysts}
      </div>
    </div>}
    {tab === 'recipes' && <section className="card wood-card">
      <label>Family <select value={family} onChange={(e) => chooseFamily(e.target.value as WoodFamily)}>
        {families.map((key) => <option key={key} value={key}>{WOOD_FAMILIES[key].name}</option>)}
      </select></label>
      <div className="wood-grid">
        {all.filter((a) => !a.baseId || woodFamily(a.baseId) === family).map((a) =>
          <button className="btn wood-recipe" key={a.id} onClick={() => { selectRecipe(a); setTab('bench'); }}>{a.name} · Lv {a.level}</button>)}
      </div>
    </section>}
    {tab === 'jigs' && <JigsView s={s} notify={setNotice} />}
    {tab === 'tunings' && <div className="wood-grid">
      {families.map((key) => <section className="card wood-card" key={key}>
        <b>{WOOD_FAMILIES[key].name} · {s.woodcrafting.tunings.filter((t) => t.family === key).length}/{woodTuningSlots(s, key)} slots</b>
        {s.woodcrafting.tunings.filter((t) => t.family === key).map((t) => <div key={t.id} className="wood-tuning">
          <span>{t.name} · {t.dials.join(' / ')}</span>
          <button className="btn sm" disabled={s.woodcrafting.active[key] === t.id} onClick={() => game.act((st) => chooseWoodTuning(st, key, t.id))}>
            {s.woodcrafting.active[key] === t.id ? 'Active' : 'Use'}
          </button>
          <button className="btn sm" onClick={() => game.act((st) => removeWoodTuning(st, t))}>Remove</button>
        </div>)}
      </section>)}
      {carriedLiving.map((item) => <Retune s={s} item={item} key={item.uid} notify={setNotice} />)}
    </div>}
    {tab === 'masterworks' && masterworks}
    {notice && <p className="wood-notice" role="status">{notice}</p>}
    <WoodRack />
  </section>;
}
