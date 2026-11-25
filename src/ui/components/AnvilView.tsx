import { useEffect, useRef, useState, type ReactNode } from 'react';
import { baseDef } from '../../data/bases';
import { FORGE_CHAPTERS, FORGE_CHAPTER_SIZE, forgeBeatMs, forgeStages, masterFormLevel, WEAPON_ALLOY_SIGNATURES, weaponAlloySignatureText, type ForgeElement, type ForgeStageId } from '../../data/forging';
import { materialDef } from '../../data/materials';
import { actionDef, type SkillAction } from '../../data/skills';
import { MASTER_ALLOYS, masterAlloyFor, recipeStock, resolveBarCost } from '../../data/smelting';
import { WEAPON_SIGNATURE_MASTERY, weaponMasteryId } from '../../data/skillingMastery';
import {
  chooseForgeSong, deleteForgePattern, dismissForgeRack, FORGE_SONGS, forgeAction, forgeActionForPlan, forgeChaptersCompleted, forgePatternSlots,
  forgePlanBlocker, forgePreset, forgePresetsFor, forgePurpose, forgeRackItems, forgeRecipes, forgeSingingChance, forgeStartBlocker, forgingSpeed,
  saveForgePattern, startStagedForge, type ForgePlan, type ForgeSong,
} from '../../engine/forging';
import { itemName, openKinds } from '../../engine/items';
import { doubleReady, focusOf, minigameSwing, strikeResult, type SwingResult } from '../../engine/minigame';
import { actionIntervalMs, skillLevel, stopAction } from '../../engine/skills';
import { masteryLevel } from '../../engine/skillingMastery';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame, useGameEvent } from '../../game';
import { Art, fmt, MatIcon, ProgressBar, Tabs, type TabDef } from './common';
import { HelpTip, SkillIntro } from './SkillHelp';
import { UseBarGrade } from './FurnaceView';
import { ItemCell } from './ItemView';
import { MasteryProgress } from './MasteryProgress';
import { Icon } from './Icon';
import { music } from '../music';
import anvilSprite from '../../assets/smelting/anvil.png';
import './furnace.css';
import './anvil-view.css';

const resultText: Record<SwingResult, string> = { double: 'Double!', hit: 'Hit', weak: 'Weak', miss: 'Miss' };
const elements: { id: ForgeElement; name: string }[] = [
  { id: 'fire', name: 'Fire' }, { id: 'cold', name: 'Cold' }, { id: 'light', name: 'Lightning' },
];

type ForgeCategory = 'weapons' | 'shields' | 'armour' | 'jewellery';
const FORGE_CATEGORIES: { id: ForgeCategory; label: string }[] = [
  { id: 'weapons', label: 'Weapons' },
  { id: 'shields', label: 'Shields' },
  { id: 'armour', label: 'Armour' },
  { id: 'jewellery', label: 'Jewellery' },
];

function forgeCategoryOf(baseId: string): ForgeCategory {
  const slot = baseDef(baseId).slot;
  if (slot === 'weapon') return 'weapons';
  if (slot === 'offhand') return 'shields';
  if (slot === 'ring' || slot === 'amulet' || slot === 'belt') return 'jewellery';
  return 'armour';
}

const SINGING_TIP = 'About 1 in 500 forged pieces (higher as you complete Pattern book chapters) emerges Singing. Singing gear lets you choose +1 tier on all mods, +1 extra modifier, or +30% quality.';

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
        <div className="row">
          <h3>Weapon rack</h3>
          <HelpTip label="Singing gear" tip={SINGING_TIP} />
        </div>
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

type ForgeTab = 'anvil' | 'patterns' | 'book' | 'quick' | 'master' | 'masterworks';

const forgeItemGroups: Record<string, string> = {
  sword: 'Swords', axe: 'Axes', dagger: 'Daggers', mace: 'Maces', sceptre: 'Sceptres',
  bow: 'Bows', staff: 'Staves', wand: 'Wands',
  helmet: 'Helmets', body: 'Body armour', gloves: 'Gloves', boots: 'Boots',
  offhand: 'Shields', amulet: 'Amulets', belt: 'Belts', ring: 'Rings',
};

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
      <div className="anvil-heading"><h3>Forge journal</h3><span>{forgeChaptersCompleted(s)} of {FORGE_CHAPTERS.length} chapters complete</span></div>
      <p className="dim small">Forge {FORGE_CHAPTER_SIZE} different combinations of stages in an item class to complete its chapter and earn a Forging perk.</p>
      <div className="anvil-book-grid">
        {FORGE_CHAPTERS.map(([id, label]) => {
          const count = s.forging.book[id]?.length ?? 0;
          return <div key={id} className="anvil-book-card"><b>{label}</b><ProgressBar value={count / FORGE_CHAPTER_SIZE} label={count >= FORGE_CHAPTER_SIZE ? 'Complete' : `${count} / ${FORGE_CHAPTER_SIZE}`} /></div>;
        })}
      </div>
      <p className="dim small row" style={{ marginTop: 10 }}>
        <span>{forgingSpeed(s)}% Forging speed · {forgePatternSlots(s)} saved recipe slots</span>
        <HelpTip label="Singing gear" tip={`About 1 in ${Math.round(1 / forgeSingingChance(s))} pieces currently sing. ${SINGING_TIP}`} />
      </p>
    </section>
  );
}

function ForgePlanPanel({ s, plan, setPlan, master, start, notice, setNotice, catalysts, openRecipes }: {
  s: GameState;
  plan: ForgePlan;
  setPlan: (plan: ForgePlan) => void;
  master: boolean;
  start: () => void;
  notice: string;
  setNotice: (notice: string) => void;
  catalysts?: ReactNode;
  openRecipes: () => void;
}) {
  const [stage, setStage] = useState<ForgeStageId>('shape');
  const [category, setCategory] = useState<ForgeCategory>(() => forgeCategoryOf(plan.baseId));
  const [group, setGroup] = useState('');
  const [showLocked, setShowLocked] = useState(false);
  const [name, setName] = useState('');
  const [lastItem, setLastItem] = useState<GameState['inventory'][number] | null>(null);
  const level = skillLevel(s, 'smithing');
  const recipes = forgeRecipes(master);
  const base = baseDef(plan.baseId);
  const action = forgeActionForPlan(plan);
  const requirements = action?.inputs ?? {};
  const cost = resolveBarCost(s.storage.bank, requirements, s.smelting.barGrade) ?? requirements;
  const stages = forgeStages(base, master);
  const selected = stages.find((entry) => entry.id === stage);
  const alloy = plan.alloy ? masterAlloyFor(plan.alloy) : undefined;
  const weaponMastery = action && weaponMasteryId(action) ? action.mastery : undefined;
  const signatureUnlocked = !!weaponMastery && masteryLevel(s, weaponMastery.id) >= WEAPON_SIGNATURE_MASTERY;
  const purpose = forgePurpose(plan);
  const planBlocker = master && !plan.alloy ? 'Choose a master alloy' : forgePlanBlocker(s, plan);
  const blocker = planBlocker ?? forgeStartBlocker(s, plan);
  const running = s.action?.kind === 'skill' ? forgeAction(s, s.action.actionId) : undefined;
  const workpiece = running?.baseId ? baseDef(running.baseId) : base;
  const runningTime = running ? actionIntervalMs(s, running, deriveStats(s)) : 1;
  const presetChoices = forgePresetsFor(plan.baseId);
  const savedRecipes = s.forging.patterns.filter(({ alloy: savedAlloy }) => !!savedAlloy === master);
  const slotsFull = s.forging.patterns.length >= forgePatternSlots(s);

  useGameEvent((event) => {
    if (event.t === 'loot' && running && event.item && event.item.baseId === running.baseId && !event.hidden && !event.salvaged) {
      setLastItem(event.item);
    }
  });

  const gateOf = (recipe: SkillAction) => (master ? Math.max(recipe.level, masterFormLevel(baseDef(recipe.baseId!))) : recipe.level);
  const groupOf = (recipe: SkillAction) => {
    const item = baseDef(recipe.baseId!);
    return item.family ?? item.slot;
  };
  const categoryRecipes = recipes
    .filter((recipe) => recipe.baseId && forgeCategoryOf(recipe.baseId) === category)
    .sort((a, b) => gateOf(a) - gateOf(b) || a.level - b.level);
  const availableRecipes = categoryRecipes.filter((recipe) => gateOf(recipe) <= level);
  const lockedRecipes = categoryRecipes.filter((recipe) => gateOf(recipe) > level);
  const groups = [...new Set((showLocked ? categoryRecipes : availableRecipes).map(groupOf))];
  const shownRecipes = (showLocked ? categoryRecipes : availableRecipes).filter((recipe) => !group || groupOf(recipe) === group);

  const chooseBase = (id: string) => {
    setPlan(firstPlan(id, level, plan.alloy));
    setStage('shape');
    setNotice('');
  };
  const selectCategory = (next: ForgeCategory) => {
    setCategory(next);
    setGroup('');
    setShowLocked(false);
  };
  const selectAlloy = (id: string) => {
    const hadAlloy = !!plan.alloy;
    setPlan({
      ...plan,
      legacyPurpose: undefined,
      alloy: id,
      choices: { ...plan.choices, signature: level >= 80 ? plan.choices.signature ?? 'amplified' : undefined },
    });
    if (!hadAlloy) setStage('signature');
  };
  const selectChoice = (id: ForgeStageId, value: string) => {
    const choices = { ...plan.choices, [id]: value };
    const element = choices.temper === 'oil' && base.slot !== 'weapon' ? plan.element ?? 'fire' : undefined;
    setPlan({ ...plan, choices, element });
  };

  const alloyCards = master ? MASTER_ALLOYS.flatMap((def) => {
    const livingId = `living_${def.id}`;
    const livingOwned = s.storage.bank[livingId] ?? 0;
    const cards: { id: string; def: (typeof MASTER_ALLOYS)[number]; living: boolean; owned: number }[] = [
      { id: def.id, def, living: false, owned: s.storage.bank[def.id] ?? 0 },
    ];
    if (livingOwned > 0 || plan.alloy === livingId) {
      cards.push({ id: livingId, def, living: true, owned: livingOwned });
    }
    return cards;
  }) : [];

  const blankPicker = (
    <div className="anvil-blank-picker">
      <div className="anvil-blank-head">
        <div className="gem-chips" role="group" aria-label="Item category">
          {FORGE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              aria-pressed={category === cat.id}
              className={`gem-chip ${category === cat.id ? 'active' : ''}`}
              onClick={() => selectCategory(cat.id)}
            >{cat.label}</button>
          ))}
        </div>
      </div>
      {groups.length > 1 && (
        <label className="anvil-select">Item type
          <select value={group} onChange={(event) => setGroup(event.target.value)}>
            <option value="">All {category}</option>
            {groups.map((id) => <option key={id} value={id}>{forgeItemGroups[id] ?? id}</option>)}
          </select>
        </label>
      )}
      {shownRecipes.length > 0 ? (
        <label className="anvil-select">Item
          <select value={shownRecipes.some(({ baseId }) => baseId === plan.baseId) ? plan.baseId : ''} onChange={(event) => chooseBase(event.target.value)}>
            <option value="" disabled>Choose an item</option>
            {shownRecipes.map((recipe) => (
              <option key={recipe.id} value={recipe.baseId}>
                {baseDef(recipe.baseId!).name} · Lv {gateOf(recipe)}{gateOf(recipe) > level ? ' (locked)' : ''}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="dim small">No {category} unlocked yet.{lockedRecipes[0] && ` First unlocks at Forging level ${gateOf(lockedRecipes[0])}.`}</p>
      )}
      {lockedRecipes.length > 0 && (
        <label className="check small">
          <input type="checkbox" checked={showLocked} onChange={(event) => { setShowLocked(event.target.checked); setGroup(''); }} />
          {' '}Include locked items
        </label>
      )}
    </div>
  );

  return (
    <section className={`anvil-workspace ${master ? 'master-crucible' : ''}`}>
      {master && (
        <SkillIntro step="The High Crucible">
          Choose a master alloy to give your item a guaranteed signature modifier.
        </SkillIntro>
      )}
      <div className={`forge-scene${running ? ' forge-lit' : ''}`}>
        <div className="forge-scene-art" aria-hidden="true">
          <div className="forge-fire"><span /></div>
          <div className="anvil-piece">
            <Art src={`items/${workpiece.id}`} alt="" size={94} fallback={<Icon name={workpiece.slot} size={52} />} />
            <img className="anvil-sprite" src={anvilSprite} alt="" />
          </div>
        </div>
        <section className="forge-scene-panel" aria-label="Forge gear">
          <div className="forge-selection">
            <h2>{base.name}</h2>
            <span className="dim small">Requires Forging Lv {action ? gateOf(action) : 1}</span>
          </div>
          <details className="forge-picker">
            <summary>Choose a different item</summary>
            {blankPicker}
          </details>
          {action && (
            <div className="forge-materials">
              <div className="forge-materials-heading">
                <b>Materials per item</b>
                <span className="dim small">{Math.round(actionIntervalMs(s, action, deriveStats(s)) / 1000)}s to forge</span>
              </div>
              <ul className="anvil-cost">
                {Object.entries(cost).map(([id, qty]) => {
                  const have = recipeStock(s.storage.bank, id);
                  return <li key={id} className={have < qty ? 'bad' : undefined}>
                    <MatIcon id={id} size={18} /> <span>{qty} × {materialDef(id).name}</span>
                    <small className={have >= qty ? 'dim' : undefined}>{fmt(have)} owned</small>
                  </li>;
                })}
              </ul>
            </div>
          )}
          {purpose && <p className="anvil-guarantee small">Guaranteed mods: {purpose.guarantees.map((id) => id.replaceAll('_', ' ')).join(' and ')}</p>}
          {running ? (
            <div className="forge-scene-status">
              <div className="forge-materials-heading">
                <b>Forging {baseDef(running.baseId!).name}</b>
                <button className="btn sm" onClick={() => game.act(stopAction)}>Stop forging</button>
              </div>
              <ProgressBar value={(s.action?.kind === 'skill' ? s.action.progress : 0) / runningTime} label={s.forging.active ? 'Repeating saved recipe' : 'Making one item'} />
            </div>
          ) : (
            <>
              <button className="btn primary forge-start" disabled={!!blocker} onClick={() => { setLastItem(null); start(); }}>Forge 1 item</button>
              {blocker && <p className="small bad">{blocker}</p>}
            </>
          )}
          {lastItem && (
            <div className="forge-result" role="status">
              <ItemCell item={lastItem} />
              <span><b>{itemName(lastItem)}</b><br /><small className="dim">Added to your inventory</small></span>
            </div>
          )}
        </section>
      </div>
      {running && <AnvilHammer recipe={running} s={s} key={running.id} />}
      <div className="forge-options">
        <details className="forge-option" open={master || undefined}>
          <summary>{master ? 'Choose alloy and customise' : 'Customise this item'}</summary>
          <div className="anvil-plan">
            {master && <p className="dim small">Master forms unlock at Forging 80 for one-handed weapons, 85 for two-handed weapons, 88 for armour and shields, and 92 for jewellery.</p>}
            {master && (
              <div className="crucible-showcase">
                <div className="crucible-showcase-head">
                  <b>Master alloy</b>
                  <span className="dim small">{plan.alloy ? `Infusing ${materialDef(plan.alloy).name}` : 'Select an alloy to bind its signature'}</span>
                </div>
                <div className="crucible-alloy-grid" role="group" aria-label="Master Alloys">
                  {alloyCards.map(({ id, def, living, owned }) => {
                    const selectedAlloy = plan.alloy === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`crucible-alloy-card ${selectedAlloy ? 'active' : ''} ${living ? 'living' : ''} ${owned === 0 ? 'empty' : ''}`}
                        aria-pressed={selectedAlloy}
                        onClick={() => selectAlloy(id)}
                      >
                        <div className="crucible-alloy-top">
                          <span className="crucible-alloy-swatch" style={{ background: def.color, boxShadow: `0 0 10px ${def.color}66` }} aria-hidden="true" />
                          <MatIcon id={id} size={18} />
                          <b>{living ? `Living ${def.name}` : def.name}</b>
                          <span className="spacer" />
                          <span className={`crucible-alloy-stock num ${owned > 0 ? 'has' : ''}`}>{owned} owned</span>
                        </div>
                        <p className="crucible-alloy-sig">{def.signature}{living ? ' · +1 random second alloy signature' : ''}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {alloy && (
              <p className="anvil-guarantee small">
                {MASTER_ALLOYS.find(({ id }) => id === alloy.id)?.signature}{alloy.living ? ' · plus a second random alloy signature' : ''}
              </p>
            )}

            {!master && presetChoices.length > 0 && (
              <label className="anvil-select">How to roll bonuses
                <select value={plan.legacyPurpose ?? ''} onChange={(event) => {
                  const preset = presetChoices.find(({ id }) => id === event.target.value);
                  setPlan(preset ? forgePreset(preset) : firstPlan(plan.baseId, level));
                  setStage('shape');
                }}>
                  <option value="">Roll bonuses using forging stages</option>
                  {presetChoices.map((recipe) => <option key={recipe.id} value={recipe.id}>Guarantee {recipe.name.split(' · ')[0].toLowerCase()} bonuses</option>)}
                </select>
              </label>
            )}
            {!plan.legacyPurpose && (
              <>
                <div className="anvil-stage-head">
                  <h4>Forging stages</h4>
                  <HelpTip tip="Each stage changes which bonuses are more likely to roll, or adds effects such as quality, speed or extra modifiers. As you level Forging, more stages and choices unlock." />
                </div>
                <div className="anvil-stage-track" aria-label="Forge stages">
                  {stages.map((entry) => (
                    <button key={entry.id} className={stage === entry.id ? 'active' : ''} onClick={() => setStage(entry.id)} aria-pressed={stage === entry.id}>
                      {entry.label}
                      <small>{entry.choices.find(({ id }) => id === plan.choices[entry.id])?.name ??
                        (level < entry.choices[0].level ? `Lv ${entry.choices[0].level}` : 'Choose')}</small>
                    </button>
                  ))}
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
                {plan.choices.temper === 'oil' && base.slot !== 'weapon' && (
                  <label className="anvil-select">Quench resistance
                    <select value={plan.element ?? 'fire'} onChange={(event) => setPlan({ ...plan, legacyPurpose: undefined, element: event.target.value as ForgeElement })}>
                      {elements.map(({ id, name: label }) => <option key={id} value={id}>{label}</option>)}
                    </select>
                  </label>
                )}
              </>
            )}
            {weaponMastery && (
              <div>
                <MasteryProgress s={s} mastery={weaponMastery} />
                {master && (signatureUnlocked && alloy ? (
                  <div className="small anvil-guarantee">
                    <b>Rolls one weapon signature</b>
                    {WEAPON_ALLOY_SIGNATURES[alloy.id].map((effect) => <div key={effect.name}>{weaponAlloySignatureText(effect)}</div>)}
                  </div>
                ) : !signatureUnlocked && <p className="dim small">An extra alloy signature unlocks at {weaponMastery.name} {WEAPON_SIGNATURE_MASTERY}.</p>)}
              </div>
            )}
          </div>
        </details>
        <details className="forge-option">
          <summary>Repeat while idle or away</summary>
          <div className="anvil-plan">
            <p className="dim small">Save your current item and forging choices as a recipe. Start it from Saved recipes to keep forging while you have materials and inventory space.</p>
            <form className="anvil-actions" onSubmit={(event) => {
              event.preventDefault();
              const error = game.act((st) => saveForgePattern(st, name, plan));
              setNotice(error ?? 'Recipe saved. Open Saved recipes to start repeating it.');
              if (!error) setName('');
            }}>
              <label className="anvil-select">Recipe name<input maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder={base.name} /></label>
              <button className="btn sm" type="submit" disabled={!!planBlocker || slotsFull}>Save recipe</button>
              {s.forging.patterns.length > 0 && <button className="btn sm ghost" type="button" onClick={openRecipes}>View saved recipes</button>}
            </form>
            {slotsFull && <p className="dim small">All recipe slots are full. Remove a saved recipe to free a slot.</p>}
            {savedRecipes.length > 0 && (
              <label className="anvil-select">Load a saved recipe
                <select value="" onChange={(event) => {
                  const pattern = savedRecipes.find(({ id }) => id === event.target.value);
                  if (!pattern) return;
                  setPlan(pattern);
                  selectCategory(forgeCategoryOf(pattern.baseId));
                  setStage('shape');
                  setNotice('');
                }}>
                  <option value="">Choose a recipe</option>
                  {savedRecipes.map((pattern) => <option key={pattern.id} value={pattern.id}>{pattern.name}</option>)}
                </select>
              </label>
            )}
          </div>
        </details>
        <details className="forge-option">
          <summary>Material settings</summary>
          <div className="anvil-plan">
            <UseBarGrade label="Spend this bar quality first" />
            {catalysts}
          </div>
        </details>
      </div>
      {notice && <p className="small" role="status">{notice}</p>}
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
  const [extrasOpen, setExtrasOpen] = useState(tab === 'master' || tab === 'masterworks');
  const [notice, setNotice] = useState('');
  const [plan, setPlan] = useState(() => s.forging.running && !s.forging.running.alloy ? s.forging.running : firstPlan(forgeRecipes()[0].baseId!, level));
  const [masterPlan, setMasterPlan] = useState(() => s.forging.running?.alloy ? s.forging.running : firstPlan(forgeRecipes()[0].baseId!, level));
  const changeTab = (next: ForgeTab) => { setNotice(''); setTab(next); };
  const start = (chosen: ForgePlan, id?: string) => {
    const error = game.act((st, ctx) => startStagedForge(st, ctx, chosen, id));
    setNotice(error ?? '');
    if (!error && id) {
      if (chosen.alloy) setMasterPlan(chosen);
      else setPlan(chosen);
      if (chosen.alloy) setExtrasOpen(true);
      setTab(chosen.alloy ? 'master' : 'anvil');
    }
  };
  const mainTabs: TabDef<ForgeTab>[] = [
    { id: 'anvil', label: 'Forge gear' },
    {
      id: 'patterns',
      label: 'Saved recipes',
      locked: level < 10 && s.forging.patterns.length === 0 ? 'Unlocks at Forging Lv 10 or when you save a recipe' : undefined,
    },
  ];
  const extraTabs: TabDef<ForgeTab>[] = [
    { id: 'book', label: 'Forge journal' },
    { id: 'quick', label: 'Quick recipes' },
    {
      id: 'master',
      label: 'Master forms',
      locked: level < 80 ? 'Unlocks at Forging Lv 80 (Master Alloy gear)' : undefined,
    },
    ...(masterworks ? [{ id: 'masterworks' as const, label: 'Masterworks' }] : []),
  ];
  return (
    <div className="forge-anvil">
      <div className="forge-navigation">
        <div className="forge-main-nav">
          <Tabs tabs={mainTabs} value={tab} onChange={changeTab} />
          <button className="btn sm ghost" aria-expanded={extrasOpen} aria-controls="forge-extras" onClick={() => {
            if (extrasOpen && extraTabs.some(({ id }) => id === tab)) changeTab('anvil');
            setExtrasOpen(!extrasOpen);
          }}>More forging options</button>
        </div>
        {extrasOpen && <div id="forge-extras"><Tabs tabs={extraTabs} value={tab} onChange={changeTab} /></div>}
      </div>
      {tab === 'anvil' && <ForgePlanPanel key="anvil" s={s} plan={plan} setPlan={setPlan} master={false} start={() => start(plan)} notice={notice} setNotice={setNotice} catalysts={catalysts} openRecipes={() => changeTab('patterns')} />}
      {tab === 'master' && <ForgePlanPanel key="master" s={s} plan={masterPlan} setPlan={setMasterPlan} master start={() => start(masterPlan)} notice={notice} setNotice={setNotice} catalysts={catalysts} openRecipes={() => changeTab('patterns')} />}
      {(tab === 'anvil' || tab === 'master') && <ForgeRack includeSongs />}
      {tab === 'quick' && <>
        <SkillIntro step="Quick recipes">
          Make basic items and boss keys here. Forge gear lets you shape item bonuses and work toward journal chapters.
        </SkillIntro>
        <UseBarGrade label="Spend this bar quality first" />
        {catalysts}
        {quickRecipes}
      </>}
      {tab === 'masterworks' && <><UseBarGrade label="Spend this bar quality first" />{masterworks}</>}
      {tab === 'book' && <PatternBook s={s} />}
      {tab === 'patterns' && (
        <section className="anvil-patterns">
          <div className="anvil-heading"><h3>Saved recipes</h3><span>{s.forging.patterns.length} / {forgePatternSlots(s)} slots</span></div>
          {s.forging.patterns.length === 0 && <p className="dim small">Pick an item under Forge gear, then open Repeat while idle or away to save its recipe.</p>}
          {s.forging.patterns.map((pattern) => {
            const error = forgeStartBlocker(s, pattern);
            const active = s.forging.active === pattern.id && s.action?.kind === 'skill';
            return (
              <div className="anvil-pattern" key={pattern.id}>
                <div><b>{pattern.name}</b><br /><span className="dim small">{baseDef(pattern.baseId).name}{active ? ' · Running' : ''}</span></div>
                <button className="btn sm primary" disabled={!!error || active} title={error ?? undefined} onClick={() => start(pattern, pattern.id)}>Start repeating</button>
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
