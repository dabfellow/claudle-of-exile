import { useState, type ReactNode } from 'react';
import { CUT_FACETS, CUT_FACET_IDS, NAMED_CUTS, NAMED_CUT_IDS, facetFamilies, facetGem, facetLabel, type CutFacet, type NamedCut } from '../../data/gemFacets';
import { GEMCUTTING_CATEGORIES, gemcuttingCategory, type GemFamily, type GemcuttingCategory } from '../../data/gemcutting';
import { materialDef } from '../../data/materials';
import { actionDef, actionsFor, type SkillAction } from '../../data/skills';
import {
  activeCutPlan, chooseCutPlan, cutPlanSlots, cutSlots, cutTray, planKind, recutGem, removeCutPlan, roughForCut, saveCutPlan, type CutSetup,
} from '../../engine/gemFacets';
import { getUnequippedGems, selectGemForRecycle } from '../../engine/gemcutting';
import { ROUGH_TYPES, STAR_ROUGH, roughType, type RoughGem } from '../../engine/roughGems';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { masteryLevel } from '../../engine/skillingMastery';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { fmtTime, MatIcon, ProgressBar, Tabs } from './common';
import { GemIcon } from './GemView';
import { MasteryProgress } from './MasteryProgress';
import { SkillMinigame } from './SkillMinigame';
import './lapidary.css';

const tabs = [
  { id: 'loupe', label: 'Loupe' }, { id: 'recipes', label: 'Recipes' }, { id: 'plans', label: 'Plans' },
  { id: 'catalogue', label: 'Catalogue' }, { id: 'recycling', label: 'Recycling' }, { id: 'masterworks', label: 'Masterworks' },
] as const;
type LapidaryTab = (typeof tabs)[number]['id'];
const recipeList = actionsFor('gemcutting');

const PERKS = [
  [10, 'One extra plan slot'], [25, 'Small rough takes two facets'], [50, '10% less Arcane Dust per cut'],
  [100, '50% higher Star Stone chance'], [200, '10% faster cutting'],
] as const;

function possibleFamilies(a: SkillAction): GemFamily[] {
  const cut = a.gem;
  if (cut?.kind === 'exact' && cut.exactId) {
    const def = facetGem(cut.exactId);
    return def ? facetFamilies(def) : [];
  }
  if (cut?.kind === 'family' && cut.family) return [cut.family];
  if (cut?.kind === 'support' || cut?.kind === 'signature') return ['defence', 'damage_support'];
  return ['attack', 'elemental', 'summon', 'defence'];
}

function facetNames(facets: string[]): string {
  return facets.map((facet) => facetLabel(facet)?.name ?? facet).join(' · ') || 'Plain cut';
}

export function GemTray() {
  const s = useGame();
  const gems = cutTray(s);
  if (!gems.length) return null;
  return <section className="away-alert lapidary-tray" aria-label="Gem tray">
    <div className="row"><b>Gem tray</b><span className="spacer" /><button className="btn sm" onClick={() => game.act((st) => { st.gemcutting.tray = []; })}>Clear tray</button></div>
    {gems.map((gem) => {
      const def = facetGem('gemId' in gem ? gem.gemId : gem.supportId);
      return def && <div className={gem.rough === STAR_ROUGH ? 'lapidary-tray-piece star' : 'lapidary-tray-piece'} key={gem.uid}>
        <GemIcon def={def} support={'supportId' in gem} size={32} />
        <div><b>{def.name}</b>{gem.rough === STAR_ROUGH && <span className="good"> · Star Stone</span>}
          <p className="small muted">{facetNames(gem.facets ?? [])}</p></div>
      </div>;
    })}
  </section>;
}

function Catalogue({ s }: { s: GameState }) {
  const count = s.gemcutting.catalogue.length;
  return <section className="card lapidary-card">
    <h3>Cut catalogue · {count} entries</h3>
    <ul>{PERKS.map(([threshold, text]) => <li key={threshold} className={count >= threshold ? 'good' : 'muted'}>{threshold} entries · {text}</li>)}</ul>
    {count > 0 ? <div className="lapidary-grid">{s.gemcutting.catalogue.map((entry) => {
      const [id, facets] = entry.split('|');
      return <div className="lapidary-entry" key={entry}><b>{facetGem(id)?.name ?? id}</b><p className="muted small">{facetNames(facets ? facets.split(',') : [])}</p></div>;
    })}</div> : <p className="muted">New combinations of gems and facets appear here after your first cut.</p>}
  </section>;
}

function Recycling({ s, notify }: { s: GameState; notify: (message: string) => void }) {
  const [uid, setUid] = useState<number | null>(null);
  const available = getUnequippedGems(s);
  const selected = [...s.storage.gems, ...s.storage.supportGems].find((gem) => gem.uid === uid);
  return <section className="card lapidary-card">
    <h3>Recut or recycle</h3>
    <label>Gem <select value={uid ?? ''} onChange={(e) => setUid(e.target.value ? Number(e.target.value) : null)}>
      <option value="">Choose an unsocketed gem</option>
      {available.map((g) => {
        const gem = [...s.storage.gems, ...s.storage.supportGems].find((item) => item.uid === g.uid);
        return <option key={g.uid} value={g.uid}>{g.name}{g.level ? ` · Lv ${g.level}` : ''} · {facetNames(gem?.facets ?? [])}</option>;
      })}
    </select></label>
    <div className="row">
      <button className="btn sm" disabled={!selected?.facets?.length} onClick={() => notify(game.act((st) => recutGem(st, uid!)) ?? 'Facets removed. The gem is ready to equip again.')}>Recut facets</button>
      <button className="btn sm" disabled={uid === null} onClick={() => notify(game.act((st, ctx) => {
        selectGemForRecycle(st, uid);
        return startSkillAction(st, ctx, 'recycle_gem');
      }) ?? 'Recycling started')}>Recycle for 5 Arcane Dust</button>
    </div>
    <p className="muted small">Recutting keeps the gem and its level. Its facets come off, and rough above one carat returns a smaller stone.</p>
  </section>;
}

export function LapidaryBench({ masterworks }: { masterworks: ReactNode }) {
  const s = useGame();
  const [tab, setTab] = useState<LapidaryTab>(() => s.professionProgress.activeProject?.project.skill === 'gemcutting' ? 'masterworks' : 'loupe');
  const [category, setCategory] = useState<GemcuttingCategory>('general');
  const [id, setId] = useState('cut_skill');
  const [rough, setRough] = useState<RoughGem>();
  const [named, setNamed] = useState<NamedCut>();
  const [draft, setDraft] = useState<CutFacet[] | null>(null);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const a = actionDef(id);
  const plan = activeCutPlan(s, a);
  const setup: CutSetup = { rough, named, draft: draft ?? undefined };
  const chosen = rough ?? roughForCut(s, a, setup) ?? 'rough_gem';
  const slots = cutSlots(s, chosen);
  const level = skillLevel(s, 'gemcutting');
  const facets = (draft ?? plan?.facets ?? []).slice(0, slots.normal + slots.wild);
  const families = possibleFamilies(a);
  const wildUsed = facets.filter((key) => CUT_FACETS[key].family !== 'shared' && !families.includes(CUT_FACETS[key].family as GemFamily)).length;
  const available = CUT_FACET_IDS.filter((key) => CUT_FACETS[key].family === 'shared' || families.includes(CUT_FACETS[key].family as GemFamily) || slots.wild > 0);
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'gemcutting' ? s.action : null;
  const runningRecipe = running ? actionDef(running.actionId) : null;
  const blocker = actionBlocker(s, a, setup);
  const exact = a.gem?.exactId ? facetGem(a.gem.exactId) : undefined;
  const inputRough = named ? 12 : a.inputs?.rough_gem;
  const d = deriveStats(s);
  const pickRecipe = (recipe: SkillAction) => {
    setId(recipe.id); setDraft(null); setNamed(undefined); setRough(undefined); setNotice(''); setTab('loupe');
  };

  return <section className="lapidary">
    <Tabs tabs={[...tabs]} value={tab} onChange={(next) => { setTab(next); setNotice(''); }} />
    {tab === 'loupe' && <div className="lapidary-work">
      <section className="card lapidary-card">
        <h2>Cutting wheel</h2>
        <div className={chosen === STAR_ROUGH ? 'lapidary-stone star' : 'lapidary-stone'}>
          {exact ? <GemIcon def={exact} size={80} support={!('role' in exact)} /> : <div className="lapidary-rough" aria-hidden="true" />}
          <b>{a.name}</b>
          {a.gem && <div className="lapidary-faces" aria-label="Selected facets">
            {Array.from({ length: slots.normal + slots.wild }, (_, index) => facets[index]
              ? <button key={index} aria-label={`Remove ${CUT_FACETS[facets[index]].name}`} className="lapidary-face filled" onClick={() => setDraft(facets.filter((_, i) => i !== index))}>{CUT_FACETS[facets[index]].name}</button>
              : <span key={index} className="lapidary-face">{index >= slots.normal ? 'Wild' : 'Open'}</span>)}
          </div>}
        </div>
        <button className="btn sm" onClick={() => setTab('recipes')}>Choose recipe</button>
        {!!a.inputs?.rough_gem && <label>Rough size <select value={rough ?? ''} onChange={(e) => {
          setRough(roughType(e.target.value)?.id); setDraft(null);
        }}>
          <option value="">Use a matching stack</option>
          {ROUGH_TYPES.map(({ id: material, carats, name: label }) => <option key={material} value={material}>
            {label} · {carats} ct{material === STAR_ROUGH ? ' + wild' : ''} · {s.storage.bank[material] ?? 0} owned
          </option>)}
        </select></label>}
        {a.gem && <>
          <label>Named cut <select value={named ?? ''} onChange={(e) => setNamed(NAMED_CUT_IDS.find((key) => key === e.target.value))}>
            <option value="">Ordinary cut</option>
            {NAMED_CUT_IDS.map((key) => <option key={key} value={key} disabled={level < NAMED_CUTS[key].level}>{NAMED_CUTS[key].name} · Lv {NAMED_CUTS[key].level}</option>)}
          </select></label>
          {named && <p className="small good">{NAMED_CUTS[named].effect}</p>}
          <label>Active plan <select value={plan?.id ?? ''} onChange={(e) => {
            const planId = e.target.value;
            setDraft(null); game.act((st) => chooseCutPlan(st, planKind(a), planId));
          }}>
            <option value="">Plain cuts while away</option>
            {s.gemcutting.plans.filter((p) => p.kind === planKind(a)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></label>
          <form onSubmit={(e) => {
            e.preventDefault();
            const reason = game.act((st) => saveCutPlan(st, a, name, facets));
            setNotice(reason ?? 'Plan saved and active');
            if (!reason) { setDraft(null); setName(''); }
          }}>
            <label>Plan name <input value={name} maxLength={50} onChange={(e) => setName(e.target.value)} /></label>
            <button className="btn sm" type="submit" disabled={s.gemcutting.plans.length >= cutPlanSlots(s)}>Save cut plan</button>
          </form>
          {draft && <p className="muted small">This draft applies to your next foreground cut. Save it for repeats and time away.</p>}
        </>}
        <div className="lapidary-costs">
          {!!inputRough && <span><MatIcon id={chosen} /> {inputRough} {materialDef(chosen).name}</span>}
          {Object.entries(a.inputs ?? {}).filter(([key]) => key !== 'rough_gem').map(([key, count]) => <span key={key}>
            <MatIcon id={key} /> {s.gemcutting.catalogue.length >= 50 && key === 'arcane_dust' ? Math.ceil(count * 0.9) : count} {materialDef(key).name}
          </span>)}
        </div>
        <MasteryProgress s={s} mastery={a.mastery} compact />
        <p className="muted small">{fmtTime(actionIntervalMs(s, a, d))} · {a.xp} XP</p>
        <button className="btn primary" disabled={!!blocker} onClick={() => setNotice(game.act((st, ctx) => startSkillAction(st, ctx, a.id, setup)) ?? '')}>{blocker ?? 'Start cutting'}</button>
      </section>
      <div className="lapidary-side">
        {a.gem && <section className="card lapidary-card">
          <h3>Facets</h3>
          {!exact && <p className="muted small">A family facet applies when the cut produces a matching gem.</p>}
          <div className="lapidary-facet-list">{available.map((key) => {
            const facet = CUT_FACETS[key];
            const wild = facet.family !== 'shared' && !families.includes(facet.family as GemFamily);
            return <button className="btn lapidary-choice" key={key} disabled={facets.length >= slots.normal + slots.wild
                || facets.filter((id) => id === key).length >= facet.max || (wild && wildUsed >= slots.wild)}
              onClick={() => setDraft([...facets, key])}>
              <b>{facet.name}{wild && ' · Wild'}</b><span className="small muted">{facet.effect}</span>
            </button>;
          })}</div>
        </section>}
        {running && runningRecipe && <section className="card lapidary-card">
          <b>{runningRecipe.name}</b>
          <ProgressBar value={running.progress / actionIntervalMs(s, runningRecipe, d)} />
          <button className="btn sm" onClick={() => game.act(stopAction)}>Stop cutting</button>
        </section>}
        <SkillMinigame skill="gemcutting" />
      </div>
    </div>}
    {tab === 'recipes' && <section className="card lapidary-card">
      <label>Category <select value={category} onChange={(e) => setCategory(e.target.value as GemcuttingCategory)}>
        {GEMCUTTING_CATEGORIES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
      </select></label>
      <div className="lapidary-grid">{recipeList.filter((recipe) =>
        recipe.id !== 'recycle_gem' && gemcuttingCategory(recipe) === category
        && (!recipe.batchMastery || masteryLevel(s, recipe.mastery!.id) >= recipe.batchMastery)
      ).map((recipe) => <button className="btn lapidary-choice" key={recipe.id} onClick={() => pickRecipe(recipe)}>
        <b>{recipe.name}</b><span className="muted small">Lv {recipe.level}</span>
      </button>)}</div>
    </section>}
    {tab === 'plans' && <section className="card lapidary-card">
      <h3>Cut plans · {s.gemcutting.plans.length}/{cutPlanSlots(s)} slots</h3>
      {s.gemcutting.plans.map((p) => <div className="lapidary-entry" key={p.id}>
        <b>{p.name} · {actionDef(p.kind).name}</b><p className="muted small">{facetNames(p.facets)}</p>
        <div className="row">
          <button className="btn sm" disabled={s.gemcutting.active[p.kind] === p.id} onClick={() => game.act((st) => chooseCutPlan(st, p.kind, p.id))}>{s.gemcutting.active[p.kind] === p.id ? 'Active' : 'Use plan'}</button>
          <button className="btn sm" onClick={() => game.act((st) => removeCutPlan(st, p))}>Remove</button>
        </div>
      </div>)}
    </section>}
    {tab === 'catalogue' && <Catalogue s={s} />}
    {tab === 'recycling' && <Recycling s={s} notify={setNotice} />}
    {tab === 'masterworks' && masterworks}
    {notice && <p role="status" className="lapidary-notice">{notice}</p>}
    <GemTray />
  </section>;
}
