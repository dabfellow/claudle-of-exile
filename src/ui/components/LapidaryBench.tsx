import { useState, type ReactNode } from 'react';
import { CUT_FACETS, CUT_FACET_IDS, NAMED_CUTS, NAMED_CUT_IDS, facetFamilies, facetGem, facetLabel, type CutFacet, type NamedCut } from '../../data/gemFacets';
import { GEMCUTTING_CATEGORIES, gemcuttingCategory, type GemFamily, type GemcuttingCategory } from '../../data/gemcutting';
import { materialDef } from '../../data/materials';
import { actionDef, actionsFor, type SkillAction } from '../../data/skills';
import {
  activeCutPlan, cutSlots, cutTray, quickFacetsFor, recutGem, roughForCut, setQuickFacets, type CutSetup,
} from '../../engine/gemFacets';
import { getUnequippedGems, selectGemForRecycle } from '../../engine/gemcutting';
import { ROUGH_TYPES, STAR_ROUGH, roughType, type RoughGem } from '../../engine/roughGems';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { masteryLevel } from '../../engine/skillingMastery';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, Cost, EmptyState, fmtTime, GameIcon, MatIcon, ProgressBar, Tabs } from './common';
import { GemIcon } from './GemView';
import { MasteryProgress } from './MasteryProgress';
import { HelpTip, LockedBadge, SkillIntro } from './SkillHelp';
import { SkillMinigame } from './SkillMinigame';
import './lapidary.css';

const tabs = [
  { id: 'loupe', label: 'Loupe' }, { id: 'recipes', label: 'Recipes' },
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
    <SkillIntro step="Cut Catalogue">
      Every unique gem + facet combination you cut permanently fills a slot here and unlocks Gemcutting perks across all recipes.
    </SkillIntro>
    <h3>Cut catalogue · {count} entries</h3>
    <p className="muted small">Unique gem + facet combinations you cut permanently unlock the Gemcutting milestones below.</p>
    <ul>{PERKS.map(([threshold, text]) => <li key={threshold} className={count >= threshold ? 'good' : 'muted'}>{threshold} entries · {text}</li>)}</ul>
    {count > 0 ? <div className="lapidary-grid">{s.gemcutting.catalogue.map((entry) => {
      const [id, facets] = entry.split('|');
      return <div className="lapidary-entry" key={entry}><b>{facetGem(id)?.name ?? id}</b><p className="muted small">{facetNames(facets ? facets.split(',') : [])}</p></div>;
    })}</div> : <EmptyState small icon={<GameIcon name="gemcutting" size={24} />} title="No catalogue entries yet">New combinations of gems and facets appear here after your first cut.</EmptyState>}
  </section>;
}

function Recycling({ s, notify, onGoLoupe }: { s: GameState; notify: (message: string) => void; onGoLoupe: () => void }) {
  const available = getUnequippedGems(s);
  const d = deriveStats(s);
  const recycleAction = actionDef('recycle_gem');
  const recyclingUid = s.action?.kind === 'skill' && s.action.actionId === 'recycle_gem' ? s.selectedGemRecycleUid : null;
  const recycleInterval = actionIntervalMs(s, recycleAction, d);

  return <section className="card lapidary-card">
    <SkillIntro step="Recut & Recycle">
      Strip facets to recut a gem while keeping its XP &amp; level (rough above 1 ct returns a smaller stone), or recycle unwanted unsocketed gems for 5 Arcane Dust.
    </SkillIntro>
    <h3>Recut or recycle · {available.length} unsocketed</h3>
    {!available.length ? (
      <EmptyState
        icon={<GameIcon name="gemcutting" size={28} />}
        title="No unsocketed gems available"
        action={<button className="btn sm primary" onClick={onGoLoupe}>Go to Loupe</button>}
      >
        Cut new gems on the Loupe tab, or unsocket an unused gem on your Skills page to recut its facets or recycle it for 5 Arcane Dust.
      </EmptyState>
    ) : (
      <div className="lapidary-recycle-grid">
        {available.map((g) => {
          const gem = g.kind === 'skill'
            ? s.storage.gems.find((item) => item.uid === g.uid)
            : s.storage.supportGems.find((item) => item.uid === g.uid);
          const def = facetGem(g.gemId) ?? { id: g.gemId, name: g.name, attr: 'str' as const };
          const gemFacets = gem?.facets ?? [];
          const carats = roughType(gem?.rough)?.carats ?? 1;
          const smaller = ROUGH_TYPES.find((r) => r.carats === carats - 1);
          const isRecycling = recyclingUid === g.uid;

          return <div key={g.uid} className="lapidary-recycle-card">
            <div className="lapidary-recycle-head">
              <GemIcon def={def} support={g.kind === 'support'} size={40} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row wrap" style={{ gap: 6 }}>
                  <b>{g.name}</b>
                  {g.level !== undefined ? <Badge>Lv {g.level}</Badge> : <Badge>Support</Badge>}
                </div>
                <div className="lapidary-faces" style={{ justifyContent: 'flex-start', marginTop: 4 }}>
                  {gemFacets.length > 0 ? gemFacets.map((f, idx) => (
                    <span key={idx} className="lapidary-face filled pill">{facetLabel(f)?.name ?? f}</span>
                  )) : <span className="muted small">Plain cut (no facets)</span>}
                </div>
              </div>
            </div>

            {gemFacets.length > 0 && (
              <p className="muted small">
                {smaller ? (
                  <>Recut returns <MatIcon id={smaller.id} size={12} /> <b>1× {smaller.name}</b> ({smaller.carats} ct) and keeps the gem{g.level !== undefined ? ` (Lv ${g.level})` : ''}.</>
                ) : (
                  <>Recut removes facets (1 ct rough returns no stone) and keeps the gem{g.level !== undefined ? ` (Lv ${g.level})` : ''}.</>
                )}
              </p>
            )}

            {isRecycling && s.action?.kind === 'skill' && (
              <ProgressBar value={s.action.progress / recycleInterval} />
            )}

            <div className="row wrap" style={{ gap: 6 }}>
              <button
                className="btn sm"
                disabled={!gemFacets.length}
                title={!gemFacets.length ? 'Only faceted gems can be recut' : 'Remove facets and recover a smaller rough stone'}
                onClick={() => notify(game.act((st) => recutGem(st, g.uid)) ?? 'Facets removed. The gem is ready to equip again.')}
              >
                Recut facets
              </button>
              {isRecycling ? (
                <button className="btn sm" onClick={() => game.act(stopAction)}>Stop</button>
              ) : (
                <button
                  className="btn sm primary"
                  onClick={() => notify(game.act((st, ctx) => {
                    selectGemForRecycle(st, g.uid);
                    return startSkillAction(st, ctx, 'recycle_gem');
                  }) ?? `Recycling ${g.name} for 5 Arcane Dust`)}
                >
                  Recycle (+5 Arcane Dust)
                </button>
              )}
            </div>
          </div>;
        })}
      </div>
    )}
  </section>;
}

export function LapidaryBench({ masterworks }: { masterworks: ReactNode }) {
  const s = useGame();
  const [tab, setTab] = useState<LapidaryTab>(() => s.professionProgress.activeProject?.project.skill === 'gemcutting' ? 'masterworks' : 'loupe');
  const [category, setCategory] = useState<GemcuttingCategory>('general');
  const [showLocked, setShowLocked] = useState(false);
  const [id, setId] = useState('cut_skill');
  const [rough, setRough] = useState<RoughGem>();
  const [named, setNamed] = useState<NamedCut>();
  const [notice, setNotice] = useState('');
  const a = actionDef(id);
  const level = skillLevel(s, 'gemcutting');
  const liveFacets = quickFacetsFor(s, a);
  const savedQuickOrLegacy = liveFacets.length ? liveFacets : (activeCutPlan(s, a)?.facets ?? []);
  const activeNamed = level >= 80 ? named : undefined;
  const setup: CutSetup = { rough, named: activeNamed, draft: savedQuickOrLegacy };
  const chosen = rough ?? roughForCut(s, a, setup) ?? 'rough_gem';
  const slots = cutSlots(s, chosen);
  const facets = savedQuickOrLegacy.slice(0, slots.normal + slots.wild);
  const families = possibleFamilies(a);
  const wildUsed = facets.filter((key) => CUT_FACETS[key].family !== 'shared' && !families.includes(CUT_FACETS[key].family as GemFamily)).length;
  const available = CUT_FACET_IDS.filter((key) => CUT_FACETS[key].family === 'shared' || families.includes(CUT_FACETS[key].family as GemFamily) || slots.wild > 0);
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'gemcutting' ? s.action : null;
  const runningRecipe = running ? actionDef(running.actionId) : null;
  const blocker = actionBlocker(s, a, setup);
  const exact = a.gem?.exactId ? facetGem(a.gem.exactId) : undefined;
  const inputRough = activeNamed ? 12 : a.inputs?.rough_gem;
  const d = deriveStats(s);

  const updateFacets = (next: CutFacet[]) => {
    game.act((st) => {
      setQuickFacets(st, a, next);
      if (st.action?.kind === 'skill' && st.action.actionId === a.id && st.action.cut) {
        st.action.cut.draft = next.slice(0, 5);
      }
    });
  };

  const pickRecipe = (recipe: SkillAction) => {
    setId(recipe.id); setNamed(undefined); setRough(undefined); setNotice(''); setTab('loupe');
  };

  const inCategory = recipeList
    .filter((recipe) =>
      recipe.id !== 'recycle_gem' && gemcuttingCategory(recipe) === category
      && (!recipe.batchMastery || masteryLevel(s, recipe.mastery!.id) >= recipe.batchMastery)
    )
    .sort((x, y) => x.level - y.level);
  const unlockedRecipes = inCategory.filter((r) => r.level <= level);
  const lockedRecipes = inCategory.filter((r) => r.level > level);
  const visibleRecipes = showLocked ? inCategory : [...unlockedRecipes, ...lockedRecipes.slice(0, 2)];

  return <section className="lapidary">
    <Tabs tabs={[...tabs]} value={tab} onChange={(next) => { setTab(next); setNotice(''); }} />
    {tab === 'loupe' && <div style={{ display: 'grid', gap: 12 }}>
      <SkillIntro step="Cutting Wheel" action={<button className="btn sm" onClick={() => setTab('recipes')}>Choose recipe</button>}>
        Pick a recipe and rough gem carats, then tap facets on the right — your selection applies immediately to this cut, repeats, and offline cutting.
      </SkillIntro>
      <div className="lapidary-work">
        <section className="card lapidary-card">
          <h2>Cutting wheel</h2>
          <div className={chosen === STAR_ROUGH ? 'lapidary-stone star' : 'lapidary-stone'}>
            {exact ? <GemIcon def={exact} size={80} support={!('role' in exact)} /> : <div className="lapidary-rough" aria-hidden="true" />}
            <b>{a.name}</b>
            {a.gem && <div className="lapidary-faces" aria-label="Selected facets">
              {Array.from({ length: slots.normal + slots.wild }, (_, index) => facets[index]
                ? <button key={index} aria-label={`Remove ${CUT_FACETS[facets[index]].name}`} className="lapidary-face filled" onClick={() => updateFacets(facets.filter((_, i) => i !== index))}>{CUT_FACETS[facets[index]].name}</button>
                : <span key={index} className="lapidary-face">{index >= slots.normal ? 'Wild' : 'Open'}</span>)}
            </div>}
          </div>
          {!!a.inputs?.rough_gem && <label>
            <span className="row" style={{ gap: 6 }}>
              <span>Rough size ({slots.normal} slot{slots.normal === 1 ? '' : 's'}{slots.wild ? ` + ${slots.wild} Wild` : ''})</span>
              <HelpTip tip="Each carat adds 1 facet slot (1–5). Star Stones add 3 slots + 1 Wild slot for any family's facet." />
            </span>
            <select value={rough ?? ''} onChange={(e) => setRough(roughType(e.target.value)?.id)}>
              <option value="">Use a matching stack</option>
              {ROUGH_TYPES.map(({ id: material, carats, name: label }) => <option key={material} value={material}>
                {label} · {carats} ct{material === STAR_ROUGH ? ' + wild' : ''} · {s.storage.bank[material] ?? 0} owned
              </option>)}
            </select>
            <span className="muted small">Each carat adds 1 facet slot (1–5). Star Stones add 3 slots + 1 Wild slot for any family's facet.</span>
          </label>}
          {a.gem && (level < 80 ? (
            <div className="row wrap" style={{ gap: 6 }}>
              <span className="small muted">Named cuts</span>
              <LockedBadge level={80} reason="Unlocks at Gemcutting Lv 80" />
              <HelpTip tip="At Lv 80+, turn Huge/Giant rough into Heart, Crown, or Starburst signature cuts." />
            </div>
          ) : <>
            <label>
              <span className="row" style={{ gap: 6 }}>
                <span>Named cut</span>
                <HelpTip tip="At Lv 80+, turn Huge/Giant rough into Heart, Crown, or Starburst signature cuts." />
              </span>
              <select value={named ?? ''} onChange={(e) => setNamed(NAMED_CUT_IDS.find((key) => key === e.target.value))}>
                <option value="">Ordinary cut</option>
                {NAMED_CUT_IDS.map((key) => <option key={key} value={key} disabled={level < NAMED_CUTS[key].level}>{NAMED_CUTS[key].name} · Lv {NAMED_CUTS[key].level}</option>)}
              </select>
            </label>
            {named && <p className="small good">{NAMED_CUTS[named].effect}</p>}
          </>)}
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
            <div className="row wrap">
              <h3>Facets</h3>
              <span className="spacer" />
              {facets.length > 0 && <button className="btn sm ghost" onClick={() => updateFacets([])}>Clear</button>}
            </div>
            {!exact && <p className="muted small">A family facet applies when the cut produces a matching gem. Click any facet to add it live.</p>}
            <div className="lapidary-facet-list">{available.map((key) => {
              const facet = CUT_FACETS[key];
              const wild = facet.family !== 'shared' && !families.includes(facet.family as GemFamily);
              return <button className="btn lapidary-choice" key={key} disabled={facets.length >= slots.normal + slots.wild
                  || facets.filter((fid) => fid === key).length >= facet.max || (wild && wildUsed >= slots.wild)}
                onClick={() => updateFacets([...facets, key])}>
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
      </div>
    </div>}
    {tab === 'recipes' && <section className="card lapidary-card">
      <SkillIntro step="Recipes">
        Choose what to cut or polish — click any recipe to load it on the Cutting wheel.
      </SkillIntro>
      <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div className="gem-chips" role="tablist" aria-label="Gemcutting categories">
          {GEMCUTTING_CATEGORIES.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={category === g.id}
              className={`gem-chip ${category === g.id ? 'active' : ''}`}
              onClick={() => setCategory(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
        {lockedRecipes.length > 2 && (
          <label className="small row" style={{ gap: 6, cursor: 'pointer', display: 'flex' }}>
            <input type="checkbox" checked={showLocked} onChange={(e) => setShowLocked(e.target.checked)} />
            Show locked ({lockedRecipes.length})
          </label>
        )}
      </div>
      <p className="muted small">{GEMCUTTING_CATEGORIES.find((c) => c.id === category)?.desc}</p>
      <div className="lapidary-grid">{visibleRecipes.map((recipe) => {
        const locked = recipe.level > level;
        return <button className={`btn lapidary-choice ${locked ? 'locked' : ''}`} key={recipe.id} onClick={() => pickRecipe(recipe)}>
          <div className="row wrap" style={{ width: '100%' }}>
            <b>{recipe.name}</b>
            <span className="spacer" />
            {locked ? <LockedBadge level={recipe.level} /> : <span className="muted small">Lv {recipe.level}</span>}
          </div>
          {recipe.inputs && <Cost cost={recipe.inputs} have={s.storage.bank} />}
        </button>;
      })}</div>
    </section>}
    {tab === 'catalogue' && <Catalogue s={s} />}
    {tab === 'recycling' && <Recycling s={s} notify={setNotice} onGoLoupe={() => setTab('loupe')} />}
    {tab === 'masterworks' && masterworks}
    {notice && <p role="status" className="lapidary-notice">{notice}</p>}
    <GemTray />
  </section>;
}
