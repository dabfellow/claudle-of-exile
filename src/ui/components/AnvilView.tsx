import { useEffect, useRef, useState, type ReactNode } from 'react';
import { baseDef } from '../../data/bases';
import { FORGE_CHAPTERS, FORGE_CHAPTER_SIZE, forgeBeatMs, forgeStages, masterFormLevel, type ForgeElement, type ForgeStageId } from '../../data/forging';
import { materialDef } from '../../data/materials';
import { actionDef, type SkillAction } from '../../data/skills';
import { MASTER_ALLOYS, masterAlloyFor, resolveBarCost } from '../../data/smelting';
import {
  chooseForgeSong, deleteForgePattern, dismissForgeRack, FORGE_SONGS, forgeAction, forgeActionForPlan, forgeChaptersCompleted, forgePatternSlots,
  forgePreset, forgePresetsFor, forgePurpose, forgeRackItems, forgeRecipes, forgeSingingChance, forgeStartBlocker, forgingSpeed,
  saveForgePattern, startStagedForge, type ForgePlan, type ForgeSong,
} from '../../engine/forging';
import { itemName, openKinds } from '../../engine/items';
import { doubleReady, focusOf, minigameSwing, strikeResult, type SwingResult } from '../../engine/minigame';
import { actionIntervalMs, skillLevel, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { Art, MatIcon, ProgressBar, Tabs } from './common';
import { UseBarGrade } from './FurnaceView';
import { ItemCell } from './ItemView';
import { Icon } from './Icon';
import { music } from '../music';
import './anvil-view.css';

const resultText: Record<SwingResult, string> = { double: 'Double!', hit: 'Hit', weak: 'Weak', miss: 'Miss' };
const elements: { id: ForgeElement; name: string }[] = [
  { id: 'fire', name: 'Fire' }, { id: 'cold', name: 'Cold' }, { id: 'light', name: 'Lightning' },
];

function playBeat(audio: AudioContext) {
  const level = music.prefs.volume * 0.15;
  if (music.prefs.muted || level <= 0) return;
  const time = audio.currentTime;
  const note = audio.createOscillator();
  const volume = audio.createGain();
  note.type = 'triangle';
  note.frequency.setValueAtTime(880, time);
  volume.gain.setValueAtTime(level, time);
  volume.gain.exponentialRampToValueAtTime(0.001, time + 0.055);
  note.connect(volume).connect(audio.destination);
  note.start();
  note.stop(time + 0.055);
}

/** The shared Smithing timing windows, with the ring paced by the active recipe's metal. */
function AnvilHammer({ recipe, s }: { recipe: SkillAction; s: GameState }) {
  const ring = useRef<HTMLSpanElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const beat = useRef({ at: 0, struck: false, chimed: false, playing: false });
  const [sound, setSound] = useState(false);
  const [last, setLast] = useState<SwingResult | null>(null);
  const interval = forgeBeatMs(recipe);
  const soundEnabled = useRef(false);

  useEffect(() => {
    const b = beat.current;
    b.at = performance.now() + interval;
    b.struck = false;
    b.chimed = false;
    b.playing = false;
    let frame = 0;
    const draw = (now: number) => {
      if (now - b.at > 260) {
        if (b.playing && !b.struck && now - b.at < interval) {
          setLast('miss');
          game.act((st) => minigameSwing(st, 'miss'));
          b.playing = false;
        }
        b.at += (Math.floor((now - b.at - 260) / interval) + 1) * interval;
        b.struck = false;
        b.chimed = false;
      }
      if (now >= b.at && !b.chimed) {
        if (audio.current?.state === 'running' && soundEnabled.current) playBeat(audio.current);
        b.chimed = true;
      }
      const left = Math.min(1, Math.max(0, (b.at - now) / interval));
      if (ring.current) {
        ring.current.style.transform = `scale(${1 + 1.45 * left})`;
        ring.current.classList.toggle('on-beat', Math.abs(b.at - now) <= 45);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [interval]);

  useEffect(() => () => { if (audio.current) void audio.current.close().catch(() => {}); }, []);

  const toggleAudio = async () => {
    if (soundEnabled.current) {
      soundEnabled.current = false;
      setSound(false);
      return;
    }
    if (typeof AudioContext === 'undefined') return;
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      soundEnabled.current = true;
      setSound(true);
    } catch {
      setSound(false);
    }
  };

  const strike = () => {
    const b = beat.current;
    if (b.struck) return;
    b.playing = true;
    b.struck = true;
    const result = strikeResult(performance.now() - b.at);
    setLast(result);
    game.act((st) => minigameSwing(st, result));
  };

  return (
    <aside className="anvil-hammer">
      <b>Hammer on the beat</b>
      <span className="dim small">Strike when the moving ring meets the centre.</span>
      <button className="anvil-strike" onClick={strike} aria-label="Strike the anvil">
        <span className="anvil-target" /><span aria-hidden="true" className="anvil-beat" ref={ring} />
        <span>Strike</span>
      </button>
      <span className={last === 'miss' ? 'bad' : 'good'} aria-live="polite">{last ? resultText[last] : '\u00a0'}</span>
      <ProgressBar value={focusOf(s)} label={doubleReady(s) ? 'Focus · double ready' : 'Focus'} />
      <button className="btn sm ghost" onClick={() => void toggleAudio()} aria-pressed={sound}>Beat sound {sound ? 'on' : 'off'}</button>
    </aside>
  );
}

export function ForgeRack({ includeSongs = false }: { includeSongs?: boolean } = {}) {
  const s = useGame();
  const [choosing, setChoosing] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const offline = new Set(s.forging.rack);
  const items = forgeRackItems(s).filter((item) => includeSongs || offline.has(item.uid));
  if (!items.length) return null;
  return (
    <section className="anvil-rack" aria-label="Weapon rack">
      <div className="anvil-heading">
        <h3>Weapon rack</h3>
        {offline.size > 0 && <button className="btn sm ghost" onClick={() => game.act(dismissForgeRack)}>Clear return rack</button>}
      </div>
      <div className="anvil-rack-grid">
        {items.map((item) => (
          <div key={item.uid} className={`anvil-rack-item ${item.forgeSinging ? 'singing' : ''}`}>
            <div className="row">
              <ItemCell item={item} />
              <div><b>{itemName(item)}</b><br /><span className="dim small">{baseDef(item.baseId).name}{item.forgeSinging ? ' · Singing' : ''}</span></div>
            </div>
            {item.forgeSinging && (
              choosing === item.uid
                ? <div className="anvil-song-choices">
                  {(Object.keys(FORGE_SONGS) as ForgeSong[]).map((song) => (
                    <button key={song} className="btn sm" disabled={song === 'mod' && !openKinds(item).length} onClick={() => {
                      const issue = game.act((st, ctx) => chooseForgeSong(st, ctx, item.uid, song));
                      setNotice(issue ?? '');
                      if (!issue) setChoosing(null);
                    }}>{FORGE_SONGS[song]}</button>
                  ))}
                </div>
                : <button className="btn sm" onClick={() => { setNotice(''); setChoosing(item.uid); }}>Choose its song</button>
            )}
          </div>
        ))}
      </div>
      {notice && <p className="bad small" role="status">{notice}</p>}
    </section>
  );
}

const tabs = [
  { id: 'anvil', label: 'Anvil' }, { id: 'patterns', label: 'Patterns' }, { id: 'book', label: 'Pattern book' },
  { id: 'quick', label: 'Quick recipes' }, { id: 'master', label: 'Master forms' }, { id: 'masterworks', label: 'Masterworks' },
] as const;
type ForgeTab = typeof tabs[number]['id'];
type SelectedStage = ForgeStageId | 'blank';

function firstPlan(baseId: string, level: number, alloy?: string): ForgePlan {
  const choices: ForgePlan['choices'] = {};
  const base = baseDef(baseId);
  for (const stage of forgeStages(base, !!alloy)) {
    const pick = stage.choices.find(({ level: gate }) => gate <= level);
    if (pick) choices[stage.id] = pick.id;
  }
  return { baseId, choices, alloy };
}

function PatternBook({ s }: { s: GameState }) {
  return (
    <section className="anvil-book">
      <div className="anvil-heading"><h3>Pattern book</h3><span>{forgeChaptersCompleted(s)} of {FORGE_CHAPTERS.length} chapters complete</span></div>
      <p className="dim small">Finish {FORGE_CHAPTER_SIZE} different stage paths in an item class to complete its chapter.</p>
      <div className="anvil-book-grid">
        {FORGE_CHAPTERS.map(([id, label]) => {
          const count = s.forging.book[id]?.length ?? 0;
          return <div key={id} className="anvil-book-card"><b>{label}</b><ProgressBar value={count / FORGE_CHAPTER_SIZE} label={count >= FORGE_CHAPTER_SIZE ? 'Complete' : `${count} / ${FORGE_CHAPTER_SIZE}`} /></div>;
        })}
      </div>
      <p className="dim small">{forgingSpeed(s)}% Forging speed · {forgePatternSlots(s)} pattern slots · about 1 in {Math.round(1 / forgeSingingChance(s))} pieces sing</p>
    </section>
  );
}

function ForgePlanPanel({ s, plan, setPlan, master, start, notice, setNotice }: {
  s: GameState;
  plan: ForgePlan;
  setPlan: (plan: ForgePlan) => void;
  master: boolean;
  start: () => void;
  notice: string;
  setNotice: (notice: string) => void;
}) {
  const [stage, setStage] = useState<SelectedStage>('shape');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const level = skillLevel(s, 'smithing');
  const recipes = forgeRecipes();
  const base = baseDef(plan.baseId);
  const action = forgeActionForPlan(plan);
  const requirements = action?.inputs ?? {};
  const cost = resolveBarCost(s.storage.bank, requirements, s.smelting.barGrade) ?? requirements;
  const stages = forgeStages(base, master);
  const selected = stages.find((entry) => entry.id === stage);
  const alloy = plan.alloy ? masterAlloyFor(plan.alloy) : undefined;
  const purpose = forgePurpose(plan);
  const blocker = master && !plan.alloy ? 'Choose a master alloy' : forgeStartBlocker(s, plan);
  const running = s.action?.kind === 'skill' ? forgeAction(s, s.action.actionId) : undefined;
  const runningTime = running ? actionIntervalMs(s, running, deriveStats(s)) : 1;
  const presetChoices = forgePresetsFor(plan.baseId);

  const chooseBase = (id: string) => {
    setPlan(firstPlan(id, level, plan.alloy));
    setStage('shape');
  };
  const selectChoice = (id: ForgeStageId, value: string) => {
    const original = plan.legacyPurpose ? firstPlan(plan.baseId, level, plan.alloy) : plan;
    const choices = { ...original.choices, [id]: value };
    const element = choices.temper === 'oil' && base.slot !== 'weapon' ? original.element ?? 'fire' : undefined;
    setPlan({ ...original, choices, element });
  };

  return (
    <section className="anvil-workspace">
      <div className="anvil-heading">
        <div>
          <h3>{master ? 'Master forms' : 'At the anvil'}</h3>
          {master && <p className="dim small">One-handed weapons open at 80, two-handed weapons at 85, armour at 88 and jewellery at 92.</p>}
        </div>
        {!master && s.forging.patterns.length > 0 && (
          <label className="anvil-select">Load a pattern
            <select value="" onChange={(e) => {
              const pattern = s.forging.patterns.find(({ id }) => id === e.target.value);
              if (pattern && !pattern.alloy) setPlan(pattern);
            }}>
              <option value="">Choose a pattern</option>
              {s.forging.patterns.filter(({ alloy }) => !alloy).map((pattern) => <option key={pattern.id} value={pattern.id}>{pattern.name}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="anvil-work-grid">
        <div className="anvil-plan">
          <div className="anvil-stage-track" aria-label="Forge stages">
            <button className={stage === 'blank' ? 'active' : ''} onClick={() => setStage('blank')} aria-pressed={stage === 'blank'}>Blank</button>
            {stages.map((entry) => (
              <button key={entry.id} className={stage === entry.id ? 'active' : ''} onClick={() => setStage(entry.id)} aria-pressed={stage === entry.id}>
                {entry.label}
                <small>{entry.choices.find(({ id }) => id === plan.choices[entry.id])?.name ??
                  (level < entry.choices[0].level ? `Lv ${entry.choices[0].level}` : 'Choose')}</small>
              </button>
            ))}
          </div>
          {alloy && (
            <p className="anvil-guarantee small">
              {MASTER_ALLOYS.find(({ id }) => id === alloy.id)?.signature}{alloy.living ? ' · plus a second random alloy signature' : ''}
            </p>
          )}
          <div className="anvil-piece">
            <Art src={`items/${base.id}`} alt="" size={74} fallback={<Icon name={base.slot} size={46} />} />
            <span className="anvil-block" aria-hidden="true" />
            <b>{base.name}</b>
          </div>
          <div className="anvil-fields">
            <label className="anvil-select">Blank
              <select value={base.id} onChange={(event) => chooseBase(event.target.value)}>
                {recipes.map((recipe) => <option key={recipe.id} value={recipe.baseId}>{baseDef(recipe.baseId!).name} · Lv {master ? Math.max(recipe.level, masterFormLevel(baseDef(recipe.baseId!))) : recipe.level}</option>)}
              </select>
            </label>
            {master && (
              <label className="anvil-select">Master alloy
                <select value={plan.alloy ?? ''} onChange={(e) => {
                  const alloy = e.target.value || undefined;
                  setPlan({ ...plan, alloy, choices: { ...plan.choices, signature: alloy && level >= 80 ? plan.choices.signature ?? 'amplified' : undefined } });
                  setStage('signature');
                }}>
                  <option value="">Choose an alloy</option>
                  {MASTER_ALLOYS.flatMap((alloy) => [alloy.id, `living_${alloy.id}`].map((id) => (
                    <option key={id} value={id} disabled={(s.storage.bank[id] ?? 0) === 0}>{materialDef(id).name} · {s.storage.bank[id] ?? 0} owned</option>
                  )))}
                </select>
              </label>
            )}
            {!master && presetChoices.length > 0 && (
              <label className="anvil-select">Purpose presets
                <select value={plan.legacyPurpose ?? ''} onChange={(event) => {
                  const preset = presetChoices.find(({ id }) => id === event.target.value);
                  setPlan(preset ? forgePreset(preset) : firstPlan(plan.baseId, level));
                  setStage('shape');
                }}>
                  <option value="">Custom path</option>
                  {presetChoices.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
                </select>
              </label>
            )}
          </div>
          {selected && (
            <div className="anvil-choices" aria-label={selected.label}>
              {selected.choices.map((choice) => (
                <button key={choice.id} className={`anvil-choice ${choice.id === plan.choices[selected.id] ? 'active' : ''}`}
                  disabled={level < choice.level} aria-pressed={choice.id === plan.choices[selected.id]} onClick={() => selectChoice(selected.id, choice.id)}>
                  <b>{choice.name}</b><span>{choice.effect}</span>{level < choice.level && <small>Forging {choice.level}</small>}
                </button>
              ))}
            </div>
          )}
          {plan.choices.temper === 'oil' && base.slot !== 'weapon' && !plan.legacyPurpose && (
            <label className="anvil-select">Quench resistance
              <select value={plan.element ?? 'fire'} onChange={(event) => setPlan({ ...plan, legacyPurpose: undefined, element: event.target.value as ForgeElement })}>
                {elements.map(({ id, name: label }) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          )}
          {purpose && <p className="anvil-guarantee small">Guaranteed mods: {purpose.guarantees.map((id) => id.replaceAll('_', ' ')).join(' and ')}</p>}
          {action && (
            <div className="anvil-cost">
              {Object.entries(cost).map(([id, qty]) => <span key={id}><MatIcon id={id} size={18} /> {qty} {materialDef(id).name}</span>)}
              <span>{Math.round(actionIntervalMs(s, action, deriveStats(s)) / 1000)} s per piece</span>
            </div>
          )}
          <UseBarGrade />
          <div className="anvil-actions">
            <button className="btn primary" disabled={!!blocker} onClick={start}>Forge once</button>
            <button className="btn" disabled={(master && !plan.alloy) || s.forging.patterns.length >= forgePatternSlots(s)} onClick={() => setSaving(!saving)}>Save pattern</button>
            {blocker && <span className="dim small">{blocker}</span>}
          </div>
          {saving && (
            <form className="anvil-actions" onSubmit={(e) => {
              e.preventDefault();
              const error = game.act((st) => saveForgePattern(st, name, plan));
              setNotice(error ?? 'Pattern saved. Start it from Patterns to forge repeatedly.');
              if (!error) setSaving(false);
            }}>
              <label className="anvil-select">Pattern name<input maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder={base.name} /></label>
              <button className="btn sm primary" type="submit">Save</button>
            </form>
          )}
          {notice && <p className="dim small" role="status">{notice}</p>}
        </div>
        <div className="anvil-side">
          {running
            ? <>
              <div className="anvil-active">
                <b>{running.name}</b>
                <span className="dim small">{s.forging.active ? 'Repeating saved pattern' : 'Forging one piece'}</span>
                <ProgressBar value={(s.action?.kind === 'skill' ? s.action.progress : 0) / runningTime} />
                <button className="btn sm" onClick={() => game.act(stopAction)}>Stop forging</button>
              </div>
              <AnvilHammer recipe={running} s={s} key={running.id} />
            </>
            : <p className="dim small">The rhythm hammer opens when a piece is on the anvil.</p>}
        </div>
      </div>
    </section>
  );
}

export function AnvilView({ quickRecipes, catalysts, masterworks }: { quickRecipes: ReactNode; catalysts?: ReactNode; masterworks?: ReactNode }) {
  const s = useGame();
  const level = skillLevel(s, 'smithing');
  const [tab, setTab] = useState<ForgeTab>(() => {
    const project = s.professionProgress.activeProject?.project;
    if (masterworks && project?.skill === 'smithing' && project.category !== 'masteryBatch') return 'masterworks';
    return s.forging.running?.alloy && s.action?.kind === 'skill' && forgeAction(s, s.action.actionId) ? 'master' : 'anvil';
  });
  const [notice, setNotice] = useState('');
  const [plan, setPlan] = useState(() => firstPlan(forgeRecipes()[0].baseId!, level));
  const [masterPlan, setMasterPlan] = useState(() => firstPlan(forgeRecipes()[0].baseId!, level));
  const start = (chosen: ForgePlan, id?: string) => {
    const error = game.act((st, ctx) => startStagedForge(st, ctx, chosen, id));
    setNotice(error ?? '');
    if (!error && id) {
      if (chosen.alloy) setMasterPlan(chosen);
      else setPlan(chosen);
      setTab(chosen.alloy ? 'master' : 'anvil');
    }
  };
  return (
    <div className="forge-anvil">
      <Tabs tabs={tabs.filter(({ id }) => id !== 'masterworks' || !!masterworks)} value={tab} onChange={(next) => { setNotice(''); setTab(next); }} />
      {tab === 'anvil' && <ForgePlanPanel s={s} plan={plan} setPlan={setPlan} master={false} start={() => start(plan)} notice={notice} setNotice={setNotice} />}
      {tab === 'master' && <ForgePlanPanel s={s} plan={masterPlan} setPlan={setMasterPlan} master start={() => start(masterPlan)} notice={notice} setNotice={setNotice} />}
      {(tab === 'anvil' || tab === 'master' || tab === 'quick') && catalysts}
      {(tab === 'anvil' || tab === 'master') && <ForgeRack includeSongs />}
      {tab === 'quick' && <><UseBarGrade />{quickRecipes}</>}
      {tab === 'masterworks' && <><UseBarGrade />{masterworks}</>}
      {tab === 'book' && <PatternBook s={s} />}
      {tab === 'patterns' && (
        <section className="anvil-patterns">
          <div className="anvil-heading"><h3>Saved patterns</h3><span>{s.forging.patterns.length} / {forgePatternSlots(s)} slots</span></div>
          {s.forging.patterns.length === 0 && <p className="dim small">Choose a stage path at the anvil and save it here to repeat it while idle or away.</p>}
          {s.forging.patterns.map((pattern) => {
            const error = forgeStartBlocker(s, pattern);
            const active = s.forging.active === pattern.id && s.action?.kind === 'skill';
            return (
              <div className="anvil-pattern" key={pattern.id}>
                <div><b>{pattern.name}</b><br /><span className="dim small">{baseDef(pattern.baseId).name}{active ? ' · Running' : ''}</span></div>
                <button className="btn sm primary" disabled={!!error || active} title={error ?? undefined} onClick={() => start(pattern, pattern.id)}>Repeat pattern</button>
                <button className="btn sm ghost" onClick={() => game.act((st) => deleteForgePattern(st, pattern.id))}>Remove</button>
              </div>
            );
          })}
          {notice && <p className="dim small" role="status">{notice}</p>}
        </section>
      )}
      {tab === 'quick' && s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'smithing' && !forgeAction(s, s.action.actionId) &&
        <AnvilHammer recipe={actionDef(s.action.actionId)} s={s} key={s.action.actionId} />}
    </div>
  );
}
