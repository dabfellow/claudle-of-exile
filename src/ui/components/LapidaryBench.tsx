import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { CUT_FACETS, CUT_FACET_IDS, NAMED_CUTS, NAMED_CUT_IDS, facetFamilies, facetGem, facetLabel, type CutFacet, type NamedCut } from '../../data/gemFacets';
import { GEMCUTTING_CATEGORIES, gemcuttingCategory, type GemFamily, type GemcuttingCategory } from '../../data/gemcutting';
import { materialDef } from '../../data/materials';
import { actionDef, actionsFor, type SkillAction } from '../../data/skills';
import { recipeMaterialCount } from '../../engine/bank';
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
import { GEM_GLYPHS } from '../assets';
import { Badge, EmptyState, fmt, fmtTime, GameIcon, MatIcon, ProgressBar, Tabs } from './common';
import { GemIcon } from './GemView';
import { MasteryProgress } from './MasteryProgress';
import { HelpTip, LockedBadge } from './SkillHelp';
import { SkillMinigame } from './SkillMinigame';
import credits from '../../../public/assets/gemcutting/CREDITS.md?url&no-inline';
import './lapidary.css';

const tabs = [
  { id: 'loupe', label: 'Loupe' }, { id: 'recipes', label: 'Recipes' },
  { id: 'catalogue', label: 'Catalogue' }, { id: 'recycling', label: 'Recycling' },
] as const;
type LapidaryTab = (typeof tabs)[number]['id'];
const recipeList = actionsFor('gemcutting');

const PERKS = [
  [10, 'One extra plan slot'], [25, 'Small rough takes two facets'], [50, '10% less Arcane Dust per cut'],
  [100, '50% higher Star Stone chance'], [200, '10% faster cutting'],
] as const;

const stationArt = import.meta.glob<string>('../../../public/assets/gemcutting/*.png', { eager: true, import: 'default', query: '?url&no-inline' });
const polished = { str: 'ruby', dex: 'emerald', int: 'sapphire' };
const accents = { str: '#e47b86', dex: '#7cd4a3', int: '#84c5f3' };

function StationIcon({ name, size }: { name: string; size: number }) {
  return <img className="lapidary-art" src={stationArt[`../../../public/assets/gemcutting/${name}.png`]} alt="" width={size} height={size} draggable={false} />;
}

function ReagentIcon({ id, size = 24 }: { id: string; size?: number }) {
  if (id === STAR_ROUGH) return <StationIcon name="amber" size={size} />;
  if (roughType(id)) return <StationIcon name="rough-gem" size={size} />;
  if (id === 'arcane_dust' || id === 'emberroot') return <StationIcon name={id.replace('_', '-')} size={size} />;
  return <MatIcon id={id} size={size} />;
}

export function LapidaryMaterials({ s }: { s: GameState }) {
  return <ul className="lapidary-material-dock" aria-label="Gemcutting materials">
    {(['rough_gem', 'arcane_dust', 'emberroot'] as const).map((id) => (
      <li key={id}>
        <span className="lapidary-socket"><ReagentIcon id={id} size={32} /></span>
        <span>{id === 'rough_gem' ? 'Rough Gems' : materialDef(id).name}</span>
        <b className="num" title={recipeMaterialCount(s.storage.bank, id).toLocaleString()}>{fmt(recipeMaterialCount(s.storage.bank, id))}</b>
      </li>
    ))}
  </ul>;
}

function PaintedGem({ def, support, size }: { def: { id: string; name: string; attr: keyof typeof polished; signatureFor?: string }; support: boolean; size: number }) {
  const glyph = GEM_GLYPHS[def.signatureFor ?? def.id] ?? GEM_GLYPHS[def.id];
  const initials = def.name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2);
  return <span className="lapidary-painted-gem" aria-hidden="true">
    <StationIcon name={def.signatureFor ? 'amber' : `${polished[def.attr]}${support ? '-support' : ''}`} size={size} />
    {size >= 40 && <span className="lapidary-sigil">
      {glyph ? <span style={{ '--lapidary-glyph': `url(${glyph})` } as CSSProperties} /> : initials}
    </span>}
  </span>;
}

function RecipeArt({ recipe, size }: { recipe: SkillAction; size: number }) {
  const gem = recipe.gem;
  const exact = gem?.exactId ? facetGem(gem.exactId) : undefined;
  if (exact) return <PaintedGem def={exact} support={!('role' in exact)} size={size} />;
  const output = Object.keys(recipe.protectedOutputs ?? recipe.outputs ?? {})[0];
  if (output) return <ReagentIcon id={output} size={size} />;
  const family = gem?.family;
  const stone = gem?.kind === 'signature' ? 'amber' : family === 'summon' ? 'amethyst'
    : family === 'damage_support' ? 'ruby-support' : family === 'attack' ? 'ruby'
    : family === 'defence' || gem?.kind === 'support' ? 'emerald-support' : 'sapphire';
  return <StationIcon name={stone} size={size} />;
}

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
  return <section className="card lapidary-card lapidary-catalogue">
    <header className="lapidary-panel-head">
      <div><h2>Cut Catalogue</h2><p className="muted small">Discover distinct gem and facet combinations to earn permanent cutting perks.</p></div>
      <Badge tone="gold">{count} {count === 1 ? 'entry' : 'entries'}</Badge>
    </header>
    <ol className="lapidary-milestones" aria-label="Catalogue milestones">
      {PERKS.map(([threshold, text]) => (
        <li key={threshold} className={count >= threshold ? 'earned' : ''}>
          <b className="num" aria-label={`${threshold} entries${count >= threshold ? ', unlocked' : ''}`}>{threshold}</b>
          <span>{text}</span>
        </li>
      ))}
    </ol>
    <h3 className="lapidary-label">Display Case</h3>
    {count > 0 ? <div className="lapidary-display">{s.gemcutting.catalogue.map((entry) => {
      const [id, facets] = entry.split('|');
      const def = facetGem(id);
      return <div className="lapidary-entry" key={entry}>
        <span className="lapidary-socket">{def ? <PaintedGem def={def} support={!('role' in def)} size={48} /> : <StationIcon name="amethyst" size={48} />}</span>
        <b>{def?.name ?? id}</b>
        <p className="muted small">{facetNames(facets ? facets.split(',') : [])}</p>
      </div>;
    })}</div> : <EmptyState small icon={<GameIcon name="gemcutting" size={24} />} title="No catalogue entries yet">New combinations of gems and facets appear here after your first cut.</EmptyState>}
  </section>;
}

const recycleFilters = ['All', 'Skill', 'Support', 'Lv 1'] as const;
type RecycleBatch = { current: number; remaining: number[]; total: number };

function startRecycle(uid: number) {
  return game.act((st, ctx) => {
    selectGemForRecycle(st, uid);
    return startSkillAction(st, ctx, 'recycle_gem');
  });
}

function Recycling({ s, notify, onGoLoupe }: { s: GameState; notify: (message: string) => void; onGoLoupe: () => void }) {
  const [filter, setFilter] = useState<(typeof recycleFilters)[number]>('All');
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [batch, setBatch] = useState<RecycleBatch>();
  const currentBatch = useRef<RecycleBatch>();
  const updateBatch = useCallback((next: RecycleBatch | undefined) => {
    currentBatch.current = next;
    setBatch(next);
  }, []);
  const available = getUnequippedGems(s);
  const shown = available.filter((gem) => filter === 'All'
    || (filter === 'Skill' && gem.kind === 'skill')
    || (filter === 'Support' && gem.kind === 'support')
    || (filter === 'Lv 1' && gem.level === 1));
  const selected = available.filter((gem) => picked.includes(gem.uid));
  const d = deriveStats(s);
  const recycleAction = actionDef('recycle_gem');
  const recyclingUid = s.action?.kind === 'skill' && s.action.actionId === 'recycle_gem' ? s.selectedGemRecycleUid : null;
  const recycleInterval = actionIntervalMs(s, recycleAction, d);

  useEffect(() => {
    const queued = currentBatch.current;
    if (!queued) return;
    // Starting the next cycle notifies React synchronously. Publish its UID before starting it.
    const state = game.state;
    if (state.action?.kind === 'skill' && state.action.actionId === 'recycle_gem'
        && state.selectedGemRecycleUid === queued.current) return;
    const stillOwned = state.storage.gems.some((gem) => gem.uid === queued.current)
      || state.storage.supportGems.some((gem) => gem.uid === queued.current);
    if (stillOwned || state.action) {
      updateBatch(undefined);
      notify('Bulk recycling stopped.');
      return;
    }
    const [next, ...remaining] = queued.remaining;
    if (next === undefined) {
      notify(`Recycled ${queued.total} gems.`);
      updateBatch(undefined);
      return;
    }
    updateBatch({ ...queued, current: next, remaining });
    const result = startRecycle(next);
    if (result !== null) updateBatch(undefined);
    if (result) notify(result);
  }, [batch, notify, recyclingUid, updateBatch]);

  const togglePick = (uid: number) => setPicked((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);

  const beginBatch = () => {
    const [first, ...rest] = selected;
    if (!first || s.action) return;
    const result = startRecycle(first.uid);
    if (result === null) {
      updateBatch({ current: first.uid, remaining: rest.map((gem) => gem.uid), total: selected.length });
      setPicked([]);
      setSelecting(false);
      notify(`Recycling ${selected.length} ${selected.length === 1 ? 'gem' : 'gems'}.`);
    } else if (result) notify(result);
  };
  const stopBatch = () => {
    const queued = currentBatch.current;
    updateBatch(undefined);
    game.act((state) => {
      if (state.action?.kind === 'skill' && state.action.actionId === 'recycle_gem'
          && state.selectedGemRecycleUid === queued?.current) stopAction(state);
    });
    notify('Bulk recycling stopped.');
  };

  return <section className="card lapidary-card lapidary-crusher">
    <header className="lapidary-panel-head">
      <span className="lapidary-tool"><StationIcon name="crusher" size={38} /></span>
      <div>
        <h2>Arcane Crusher</h2>
        <p className="muted small">Scour facets and keep the gem, or recycle it for 5 Arcane Dust.</p>
      </div>
      <Badge>{available.length} unsocketed</Badge>
    </header>
    {!!available.length && <div className="lapidary-crusher-controls">
      <div className="gem-chips" role="group" aria-label="Filter gems">
        {recycleFilters.map((value) => <button type="button" className={`gem-chip ${value === filter ? 'active' : ''}`} key={value} aria-pressed={value === filter} onClick={() => setFilter(value)}>{value}</button>)}
      </div>
      {batch ? (
        <button className="btn sm" onClick={stopBatch}>Stop batch · {batch.remaining.length + 1} left</button>
      ) : (
        <button className="btn sm" aria-pressed={selecting} onClick={() => { setSelecting(!selecting); setPicked([]); }}>{selecting ? 'Cancel selection' : 'Bulk recycle'}</button>
      )}
    </div>}
    {selecting && <div className="lapidary-bulk">
      <span className="small">{selected.length} selected · Recycles one gem at a time while this tab is open.</span>
      <button className="btn sm" disabled={!shown.length} onClick={() => setPicked((prev) => [...new Set([...prev, ...shown.map((gem) => gem.uid)])])}>Select shown</button>
      <button className="btn sm primary" disabled={!selected.length || !!s.action} title={s.action ? 'Stop the current activity to start a batch' : undefined} onClick={beginBatch}>
        Recycle {selected.length || 'selected'} {selected.length === 1 ? 'gem' : 'gems'}
      </button>
    </div>}
    {!available.length ? (
      <EmptyState
        icon={<GameIcon name="gemcutting" size={28} />}
        title="No unsocketed gems available"
        action={<button className="btn sm primary" onClick={onGoLoupe}>Go to Loupe</button>}
      >
        Cut new gems on the Loupe tab, or unsocket an unused gem on your Skills page to recut its facets or recycle it for 5 Arcane Dust.
      </EmptyState>
    ) : !shown.length ? (
      <EmptyState small title="No gems match this filter" />
    ) : (
      <div className="lapidary-recycle-grid">
        {shown.map((g) => {
          const gem = g.kind === 'skill'
            ? s.storage.gems.find((item) => item.uid === g.uid)
            : s.storage.supportGems.find((item) => item.uid === g.uid);
          const def = facetGem(g.gemId) ?? { id: g.gemId, name: g.name, attr: 'str' as const };
          const gemFacets = gem?.facets ?? [];
          const carats = roughType(gem?.rough)?.carats ?? 1;
          const smaller = ROUGH_TYPES.find((r) => r.carats === carats - 1);
          const isRecycling = recyclingUid === g.uid;

          return <div key={g.uid} className="lapidary-recycle-card" style={{ '--stone': accents[def.attr] } as CSSProperties}>
            {selecting && <label className="lapidary-pick-gem" title={`Select ${g.name} for recycling`}><input type="checkbox" checked={picked.includes(g.uid)} onChange={() => togglePick(g.uid)} aria-label={`Select ${g.name} for recycling`} /></label>}
            <div className="lapidary-recycle-head">
              <span className="lapidary-socket"><PaintedGem def={def} support={g.kind === 'support'} size={60} /></span>
              <div>
                <div className="lapidary-gem-name">
                  <b>{g.name}</b>
                  {g.level !== undefined ? <Badge>Lv {g.level}</Badge> : <Badge>Support</Badge>}
                </div>
                <div className="lapidary-faces">
                  {gemFacets.length > 0 ? gemFacets.map((f, idx) => (
                    <span key={idx} className="lapidary-face filled pill">{facetLabel(f)?.name ?? f}</span>
                  )) : <span className="muted small">Plain cut (no facets)</span>}
                </div>
              </div>
            </div>

            {gemFacets.length > 0 && (
              <span className="lapidary-recut-tip">
                <HelpTip tip={smaller ? (
                  <>Scour returns <b>1× {smaller.name}</b> ({smaller.carats} ct) and keeps the gem{g.level !== undefined ? ` (Lv ${g.level})` : ''}.</>
                ) : (
                  <>Scour removes facets and keeps the gem{g.level !== undefined ? ` (Lv ${g.level})` : ''}. A 1 ct rough returns no stone.</>
                )} />
              </span>
            )}

            {isRecycling && s.action?.kind === 'skill' && (
              <ProgressBar value={s.action.progress / recycleInterval} />
            )}

            <div className="lapidary-split-actions">
              <button
                className="btn sm"
                disabled={!gemFacets.length || !!batch}
                title={!gemFacets.length ? 'Only faceted gems can be recut' : 'Remove facets and recover a smaller rough stone'}
                onClick={() => notify(game.act((st) => recutGem(st, g.uid)) ?? 'Facets removed. The gem is ready to equip again.')}
              >
                Scour
              </button>
              {isRecycling ? (
                <button className="btn sm" onClick={() => game.act(stopAction)}>Stop</button>
              ) : (
                <button
                  className="btn sm primary"
                  disabled={!!batch}
                  aria-label={`Recycle ${g.name} for 5 Arcane Dust`}
                  onClick={() => notify(startRecycle(g.uid) ?? `Recycling ${g.name} for 5 Arcane Dust`)}
                >
                  +5 Dust
                </button>
              )}
            </div>
          </div>;
        })}
      </div>
    )}
  </section>;
}

export function LapidaryBench() {
  const s = useGame();
  const [tab, setTab] = useState<LapidaryTab>('loupe');
  const [category, setCategory] = useState<GemcuttingCategory>('general');
  const [showLocked, setShowLocked] = useState(false);
  const [id, setId] = useState('cut_skill');
  const [previewId, setPreviewId] = useState<string>();
  const facetingTray = useRef<HTMLElement>(null);
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
  const selectedIsRunning = runningRecipe?.id === a.id;
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
  const preview = visibleRecipes.find((recipe) => recipe.id === previewId)
    ?? visibleRecipes.find((recipe) => recipe.id === id) ?? visibleRecipes[0];

  return <section className="lapidary">
    <Tabs tabs={[...tabs]} value={tab} onChange={(next) => { setTab(next); setNotice(''); }} />
    {notice && <p role="status" className="lapidary-notice">{notice}</p>}
    {tab === 'loupe' && <div className="lapidary-work">
        <section className="card lapidary-card lapidary-wheel">
          <header className="lapidary-panel-head">
            <span className="lapidary-tool"><StationIcon name="loupe" size={32} /></span>
            <h2>Cutting Wheel</h2>
            <button className="btn sm" onClick={() => setTab('recipes')}>Choose recipe</button>
          </header>
          <div className={chosen === STAR_ROUGH ? 'lapidary-stone star' : 'lapidary-stone'} style={{ '--stone': chosen === STAR_ROUGH ? '#e8ba69' : a.color } as CSSProperties}>
            <span className="lapidary-mounted-gem">
              {exact ? <PaintedGem def={exact} size={106} support={!('role' in exact)} />
                : a.gem ? <ReagentIcon id={chosen} size={106} /> : <RecipeArt recipe={a} size={96} />}
            </span>
            <b>{a.name}</b>
            {a.gem && <div className="lapidary-faces" aria-label="Selected facets">
              {Array.from({ length: slots.normal + slots.wild }, (_, index) => facets[index]
                ? <button key={index} aria-label={`Remove ${CUT_FACETS[facets[index]].name}`} className="lapidary-face filled" onClick={() => updateFacets(facets.filter((_, i) => i !== index))}>{CUT_FACETS[facets[index]].name}</button>
                : <span key={index} className="lapidary-face">{index >= slots.normal ? 'Wild' : 'Open'}</span>)}
            </div>}
          </div>
          <SkillMinigame skill="gemcutting" />
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
            {!!inputRough && <span><ReagentIcon id={chosen} size={18} /> {inputRough} {materialDef(chosen).name}</span>}
            {Object.entries(a.inputs ?? {}).filter(([key]) => key !== 'rough_gem').map(([key, count]) => <span key={key}>
              <ReagentIcon id={key} size={18} /> {s.gemcutting.catalogue.length >= 50 && key === 'arcane_dust' ? Math.ceil(count * 0.9) : count} {materialDef(key).name}
            </span>)}
          </div>
        </section>
        <div className="lapidary-side">
          {running && runningRecipe && <section className="card lapidary-card lapidary-progress">
            <header className="lapidary-panel-head">
              <div><span className="lapidary-label">On the wheel</span><h3>{runningRecipe.name}</h3></div>
              <button className="btn sm" onClick={() => game.act(stopAction)}>Stop cutting</button>
            </header>
            <ProgressBar value={running.progress / actionIntervalMs(s, runningRecipe, d)} />
            {selectedIsRunning && <>
              <p className="muted small">{fmtTime(actionIntervalMs(s, a, d))} · {a.xp} XP per cut</p>
              <MasteryProgress s={s} mastery={a.mastery} compact />
            </>}
          </section>}
          {!selectedIsRunning && <section className="card lapidary-card lapidary-operation" aria-label="Start cutting">
            <header className="lapidary-panel-head">
              <div><h3>{runningRecipe && runningRecipe.id !== a.id ? a.name : 'Per cut'}</h3><p className="muted small">{fmtTime(actionIntervalMs(s, a, d))} · {a.xp} XP</p></div>
              <button className="btn primary" disabled={!!blocker} onClick={() => setNotice(game.act((st, ctx) => startSkillAction(st, ctx, a.id, setup)) ?? '')}>{blocker ?? 'Start cutting'}</button>
            </header>
            <MasteryProgress s={s} mastery={a.mastery} compact />
          </section>}
          {a.gem && <section className="card lapidary-card lapidary-modifiers">
            <header className="lapidary-panel-head">
              <h3>Facets</h3>
              {facets.length > 0 && <button className="btn sm ghost" onClick={() => updateFacets([])}>Clear</button>}
            </header>
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
        </div>
    </div>}
    {tab === 'recipes' && <div className="lapidary-recipes">
      <section className="card lapidary-card lapidary-index">
        <h2>Cut Index</h2>
        <div className="gem-chips lapidary-categories" role="tablist" aria-label="Gemcutting categories">
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
          <label className="small lapidary-show-locked">
            <input type="checkbox" checked={showLocked} onChange={(e) => setShowLocked(e.target.checked)} />
            Show locked ({lockedRecipes.length})
          </label>
        )}
        <p className="muted small">{GEMCUTTING_CATEGORIES.find((c) => c.id === category)?.desc}</p>
        <div className="lapidary-index-list" role="region" aria-label="Available cuts" tabIndex={0}>{visibleRecipes.map((recipe) => {
          const locked = recipe.level > level;
          return <button className="lapidary-index-row" aria-pressed={recipe.id === preview?.id} key={recipe.id} onClick={(event) => {
            setPreviewId(recipe.id);
            if (event.detail > 0 && window.matchMedia('(max-width: 760px)').matches) {
              facetingTray.current?.scrollIntoView({ block: 'start' });
            }
          }} style={{ '--stone': recipe.color } as CSSProperties}>
            <RecipeArt recipe={recipe} size={28} />
            <b>{recipe.name}</b>
            {locked ? <LockedBadge level={recipe.level} /> : <span className="muted small">Lv {recipe.level}</span>}
          </button>;
        })}</div>
      </section>
      {preview && <section className="card lapidary-card lapidary-recipe-tray" ref={facetingTray}>
        <h2>Faceting Tray</h2>
        <div className="lapidary-cushion" style={{ '--stone': preview.color } as CSSProperties}>
          <RecipeArt recipe={preview} size={120} />
          <div>
            <h3>{preview.name}</h3>
            <p className="muted small">Gemcutting Lv {preview.level} · {fmtTime(actionIntervalMs(s, preview, d))} · {preview.xp} XP</p>
          </div>
        </div>
        {preview.inputs && <div className="lapidary-reagents">
          <header className="lapidary-panel-head"><h3 className="lapidary-label">Reagents</h3><span className="small muted">Owned / Required</span></header>
          <ul>{Object.entries(preview.inputs).map(([material, quantity]) => {
            const owned = recipeMaterialCount(s.storage.bank, material);
            return <li key={material}>
              <span className="lapidary-socket"><ReagentIcon id={material} size={29} /></span>
              <span>{materialDef(material).name}<b className={`num ${owned < quantity ? 'bad' : ''}`}>{fmt(owned)} / {fmt(quantity)}</b></span>
            </li>;
          })}</ul>
        </div>}
        <button className="btn primary lapidary-load" onClick={() => pickRecipe(preview)}>Load onto Cutting Wheel</button>
      </section>}
    </div>}
    {tab === 'catalogue' && <Catalogue s={s} />}
    {tab === 'recycling' && <Recycling s={s} notify={setNotice} onGoLoupe={() => setTab('loupe')} />}
    <GemTray />
    <a className="lapidary-credits" href={credits} target="_blank" rel="noreferrer">Artwork credits</a>
  </section>;
}
