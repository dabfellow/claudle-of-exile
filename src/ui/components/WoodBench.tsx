import { useId, useState, type ReactNode } from 'react';
import { Fragment } from 'react';
import { baseDef, obtainable, WEAPON_FAMILIES } from '../../data/bases';
import { materialDef } from '../../data/materials';
import { actionDef, actionsFor, type SkillAction, type TunedSkill } from '../../data/skills';
import { JIGS, JIG_TIERS, WOOD_FAMILIES, woodFamily, type Jig, type WoodFamily } from '../../data/woodcrafting';
import { recipeMaterialCount } from '../../engine/bank';
import { itemName } from '../../engine/items';
import { actionBlocker, actionIntervalMs, resinBonus, skillLevel, smithIlvl, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState, Item } from '../../engine/types';
import {
  activeWoodTuning, buildWoodJig, chooseWoodTuning, jigSkill, jigUpgrade, recipeDials, removeWoodTuning, retuneLivingWood,
  saveWoodTuning, startWoodcraft, woodDialIndices, woodDialRange, woodImplicits, woodRackItems, woodTuningSlots, type WoodPlan,
} from '../../engine/woodcrafting';
import { game, useGame } from '../../game';
import { Art, Badge, fmt, fmtTime, MatIcon, ProgressBar, Tabs } from './common';
import { HelpTip, LockedBadge, SkillIntro } from './SkillHelp';
import { UseBarGrade } from './FurnaceView';
import { SkillMinigame } from './SkillMinigame';
import { MasteryProgress } from './MasteryProgress';
import { Icon } from './Icon';
import { EquipmentBasePreview } from './ItemView';
import './wood-bench.css';

const allFamilies = Object.keys(WOOD_FAMILIES) as WoodFamily[];
const recipesFor = (skill: TunedSkill) => actionsFor(skill).filter((a) => !a.purpose && !a.woodcutting && (!a.baseId || obtainable(baseDef(a.baseId))));
const RECIPES: Record<TunedSkill, SkillAction[]> = { woodcrafting: recipesFor('woodcrafting'), tailoring: recipesFor('tailoring') };
/** Only the families this bench actually makes, in their usual order. */
const FAMILIES: Record<TunedSkill, WoodFamily[]> = {
  woodcrafting: allFamilies.filter((f) => RECIPES.woodcrafting.some((a) => a.baseId && woodFamily(a.baseId) === f)),
  tailoring: allFamilies.filter((f) => RECIPES.tailoring.some((a) => a.baseId && woodFamily(a.baseId) === f)),
};
/** At the Woodcrafting bench the cloth and leather dials only cover spirit shields and bucklers. */
function familyLabel(skill: TunedSkill, family: WoodFamily): string {
  if (skill === 'woodcrafting' && family === 'cloth') return 'Spirit Shields';
  if (skill === 'woodcrafting' && family === 'leather') return 'Bucklers';
  return WOOD_FAMILIES[family].name;
}
const BENCH_TEXT: Record<TunedSkill, { bench: string; start: string; stop: string; verb: string }> = {
  woodcrafting: { bench: 'Woodcrafting bench', start: 'Start carving', stop: 'Stop carving', verb: 'carve' },
  tailoring: { bench: 'Tailoring table', start: 'Start sewing', stop: 'Stop sewing', verb: 'sew' },
};
const livingMaterials = ['legend_heartwood', 'world_tree_heart'] as const;
const tabs = [
  { id: 'bench', label: 'Workbench' }, { id: 'jigs', label: 'Jigs' },
  { id: 'tunings', label: 'Tunings' }, { id: 'masterworks', label: 'Masterworks' },
] as const;
type WoodTab = (typeof tabs)[number]['id'];

const DIALS_TIP = 'Slide each dial left or right to favour one stat over another. Moving a dial boosts that modifier pool weight and grants a positive implicit bonus — paired with an equal downside on the opposite stat.';
const IMPLICITS_TIP = 'Built-in modifiers stamped directly onto the crafted item (+4% per dial notch, and -4% on the opposite stat). Rarely (1 in 400), a piece crafts Perfectly Balanced with no negative downside.';
const LIVING_TIP = 'At Woodcrafting Lv 80, embed Legend Heartwood or World Tree Heart to unlock a 3rd Dial. Living gear gains +5% dial implicit strength per equipped hour (up to +50% at Growth 10/10).';
const JIGS_TIP = 'Permanent workbench fixtures for each craft group. Tier 1 (Lv 20) widens dial limits by +1; Tier 2 (Lv 50) adds a 3rd tuning slot and widens the 2nd dial; Tier 3 (Lv 75) widens all dials by +1 more (up to ±6).';
const TUNINGS_TIP = 'Saved dial presets per item family. An active tuning applies automatically when repeating or crafting away; moving sliders manually creates a one-time draft for your next craft.';

function slotLabel(a: SkillAction): string {
  if (!a.baseId) return 'Frame';
  const base = baseDef(a.baseId);
  if (base.family) return WEAPON_FAMILIES[base.family].name;
  if (base.slot === 'offhand') return base.tags.includes('int_armour') ? 'Spirit Shield' : 'Buckler';
  return base.slot[0].toUpperCase() + base.slot.slice(1);
}

function Costs({ s, inputs }: { s: GameState; inputs: Record<string, number> }) {
  return (
    <div className="io wood-costs">
      {Object.entries(inputs).map(([id, count]) => {
        const have = recipeMaterialCount(s.storage.bank, id);
        return (
          <span key={id} className={`io-item ${have < count ? 'missing' : ''}`} title={materialDef(id).name}>
            <MatIcon id={id} size={13} />
            <span className="num">{fmt(have)}/{fmt(count)}</span> {materialDef(id).name}
          </span>
        );
      })}
    </div>
  );
}

function Dials({ s, recipe, dials, living, item, change }: {
  s: GameState; recipe: SkillAction; dials: number[]; living: boolean; item?: Item; change: (dials: number[]) => void;
}) {
  const family = woodFamily(recipe.baseId!);
  const values = recipeDials(s, recipe, dials, living);
  const implicits = woodImplicits({ baseId: recipe.baseId!, dials: values, balanced: item?.balanced });
  return (
    <div className="wood-dials">
      <div className="row wood-section-head">
        <b>Dials</b>
        <HelpTip tip={DIALS_TIP} />
        <span className="spacer" />
        {values.some(Boolean) && (
          <button type="button" className="btn sm ghost" onClick={() => change([0, 0, 0])}>Reset</button>
        )}
      </div>
      {woodDialIndices(recipe, living).map((index) => {
        const dial = WOOD_FAMILIES[family].dials[index];
        const max = woodDialRange(s, family, index);
        return (
          <label key={dial.name} className="wood-dial">
            <span><b>{dial.name}</b><span className="num">{values[index] === 0 ? 'Neutral' : values[index]}</span></span>
            <input aria-label={dial.name} type="range" min={-max} max={max} value={values[index]} onChange={(e) => {
              const next = [...values];
              next[index] = Number(e.target.value);
              change(next);
            }} />
            <span className="muted small"><span>{dial.sides[0].label}</span><span>{dial.sides[1].label}</span></span>
          </label>
        );
      })}
      <div className="wood-implicits-box">
        <div className="row wood-section-head">
          <b>Implicits</b>
          <HelpTip tip={IMPLICITS_TIP} />
        </div>
        {implicits.length > 0 ? (
          <ul className="wood-implicits">
            {implicits.map((implicit, index) => <li key={index} className={implicit.value < 0 ? 'bad' : 'good'}>{implicit.text}</li>)}
          </ul>
        ) : (
          <p className="dim small">Neutral tuning — slide a dial above to preview item implicits.</p>
        )}
      </div>
    </div>
  );
}

function JigsView({ s, skill, level, notify }: { s: GameState; skill: TunedSkill; level: number; notify: (message: string) => void }) {
  return (
    <div className="wood-tab-stack">
      <SkillIntro step="Permanent upgrades" action={<HelpTip label="How Jigs work" tip={JIGS_TIP} />}>
        Upgrade permanent workbench fixtures to widen dial min/max limits and unlock extra saved tuning slots at Tier 2.
      </SkillIntro>
      <div className="wood-grid">
        {(Object.keys(JIGS) as Jig[]).filter((jig) => jigSkill(jig) === skill).map((jig) => {
          const tier = s.woodcrafting.jigs[jig];
          const next = jigUpgrade(s, jig);
          const lockedLevel = next && level < next.level ? next.level : undefined;
          return (
            <section className="card wood-card" key={jig}>
              <div className="row">
                <h3>{JIGS[jig]}</h3>
                {lockedLevel !== undefined && <LockedBadge level={lockedLevel} />}
                <span className="spacer" />
                <span className="small num">Tier {tier} / {JIG_TIERS.length}</span>
              </div>
              <p className="small">Applies to: {allFamilies.filter((family) => WOOD_FAMILIES[family].jig === jig).map((family) => WOOD_FAMILIES[family].name).join(', ')}{jig === 'form' ? ', and the bucklers and spirit shields at the Woodcrafting bench' : ''}</p>
              {next ? <>
                <p className="muted small">Next (Lv {next.level}): {next.level === 50 ? 'Extra tuning slot and wider second dial' : 'Wider dial range'}</p>
                <Costs s={s} inputs={next.cost} />
                <button className="btn sm primary" disabled={!!next.blocker} onClick={() => notify(game.act((st) => buildWoodJig(st, jig)) ?? 'Jig upgraded')}>
                  {next.blocker ?? 'Upgrade jig'}
                </button>
              </> : <Badge tone="success">Max tier</Badge>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Retune({ s, item, notify }: { s: GameState; item: Item; notify: (message: string) => void }) {
  const [dials, setDials] = useState(item.dials ?? []);
  return <details className="card wood-card">
    <summary>{itemName(item)} · Growth {item.living?.growth}/10</summary>
    {item.corrupted ? <p className="bad small">Corrupted. Growth and tuning are sealed.</p> : <>
      <Dials s={s} recipe={actionDef(`smith_${item.baseId}`)} dials={dials} living item={item} change={setDials} />
      <button className="btn sm" onClick={() => notify(game.act((st) => retuneLivingWood(st, item.uid, dials)) ?? 'Living piece retuned')}>Retune and halve growth</button>
    </>}
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

export function WoodBench({ skill, catalysts, masterworks }: { skill: TunedSkill; catalysts: ReactNode; masterworks: ReactNode }) {
  const s = useGame();
  const all = RECIPES[skill];
  const families = FAMILIES[skill];
  const text = BENCH_TEXT[skill];
  const level = skillLevel(s, skill);
  const tuningSelectId = useId();
  const livingSelectId = useId();
  const [tab, setTab] = useState<WoodTab>(() => s.professionProgress.activeProject?.project.skill === skill ? 'masterworks' : 'bench');
  const [id, setId] = useState(() => all.find((a) => !!a.baseId)!.id);
  const [family, setFamily] = useState<WoodFamily>(() => woodFamily(actionDef(id).baseId!));
  const [benchShowLocked, setBenchShowLocked] = useState(false);
  const [manual, setManual] = useState<number[] | null>(null);
  const [living, setLiving] = useState<WoodPlan['living']>();
  const [savingTuning, setSavingTuning] = useState(false);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const activeTuning = activeWoodTuning(s, family);
  const selection = actionDef(id);
  const base = selection.baseId ? baseDef(selection.baseId) : undefined;
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === skill ? s.action : null;
  const runningRecipe = running && actionDef(running.actionId);
  const d = deriveStats(s);
  const inputs = { ...selection.inputs, ...(living && base ? { [living]: 1 } : {}) };
  const noLiving = living && base && !(s.storage.bank[living] > 0);
  const reason = actionBlocker(s, selection) ?? (noLiving ? 'Missing living wood' : null);
  const dials = manual ?? activeTuning?.dials ?? [];
  const familyTunings = s.woodcrafting.tunings.filter((t) => t.family === family);
  const slotsFull = familyTunings.length >= woodTuningSlots(s, family);

  const selectRecipe = (next: SkillAction) => {
    setId(next.id);
    if (next.baseId) {
      setFamily(woodFamily(next.baseId));
    } else {
      setLiving(undefined);
    }
    setManual(null);
    setSavingTuning(false);
    setNotice('');
  };
  const chooseFamily = (next: WoodFamily) => {
    setFamily(next);
    const famRecipes = all.filter((a) => a.baseId && woodFamily(a.baseId) === next);
    const recipe = famRecipes.find((a) => a.level <= level) ?? famRecipes[0];
    if (recipe) selectRecipe(recipe);
  };

  // Workbench recipe list: unlocked + next 1 upcoming unless toggled
  const benchFamilyRecipes = base
    ? all.filter((a) => a.baseId && woodFamily(a.baseId) === family)
    : all.filter((a) => !a.baseId);
  const benchUnlocked = benchFamilyRecipes.filter((a) => a.level <= level);
  const benchLocked = benchFamilyRecipes.filter((a) => a.level > level);
  const visibleBenchRecipes = benchShowLocked
    ? benchFamilyRecipes
    : [
      ...benchUnlocked,
      ...benchLocked.slice(0, 1),
      ...benchLocked.slice(1).filter((a) => a.id === id),
    ];
  const hiddenBenchCount = benchFamilyRecipes.length - visibleBenchRecipes.length;
  const patterns = new Map<string, SkillAction[]>();
  for (const recipe of visibleBenchRecipes.slice().sort((a, b) => a.level - b.level)) {
    const type = slotLabel(recipe);
    const existing = patterns.get(type);
    if (existing) existing.push(recipe);
    else patterns.set(type, [recipe]);
  }

  const carriedLiving = [...s.inventory, ...Object.values(s.equipment)].filter((item): item is Item => !!item?.living);

  return (
    <section className="wood-bench">
      <Tabs tabs={[...tabs]} value={tab} onChange={(next) => { setTab(next); setNotice(''); }} />

      {tab === 'bench' && (
        <div className="wood-tab-stack">
          <SkillIntro step="Start here: Pick a recipe & slide the dials">
            Pick an item family, click a recipe below to load it on the bench, slide the Dials to trade one stat for another, and start to {text.verb}.{skill === 'woodcrafting' && <> Bows, wands and staves each need a part from the <b>Sawmill</b>.</>}
          </SkillIntro>
          <div className="wood-bench-layout">
            <section className="card wood-card wood-piece">
              <h2>{text.bench[0].toUpperCase() + text.bench.slice(1)}</h2>
              <div className="wood-filter-row">
                <div className="gem-chips" role="tablist" aria-label={`${text.bench} family`}>
                  {families.map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={!!base && family === key}
                      className={`gem-chip ${!!base && family === key ? 'active' : ''}`}
                      onClick={() => chooseFamily(key)}
                    >{familyLabel(skill, key)}</button>
                  ))}
                  {all.some((a) => !a.baseId) && <button
                    type="button"
                    role="tab"
                    aria-selected={!base}
                    className={`gem-chip ${!base ? 'active' : ''}`}
                    onClick={() => {
                      const frame = all.find((a) => !a.baseId);
                      if (frame) selectRecipe(frame);
                    }}
                  >Frames</button>}
                </div>
                {(hiddenBenchCount > 0 || benchShowLocked) && (
                  <label className="check small">
                    <input type="checkbox" checked={benchShowLocked} onChange={(e) => setBenchShowLocked(e.target.checked)} />
                    {' '}Show locked{hiddenBenchCount > 0 ? ` (${hiddenBenchCount})` : ''}
                  </label>
                )}
              </div>

              <div className="wood-pattern-rack" role="group" aria-label="Recipes">
                <h3>Recipes</h3>
                {patterns.size === 0 && <p className="dim small">No recipes in this group yet. Tick Show locked to preview higher-level recipes.</p>}
                {[...patterns].map(([type, list]) => (
                  <div key={type} className="wood-pattern-group">
                    <span className="wood-pattern-type">{type}</span>
                    <div className="wood-bench-picker">
                      {list.map((a, index) => {
                  const locked = a.level > level;
                  const active = a.id === id;
                  const runningThis = running?.actionId === a.id;
                  const short = !locked && !runningThis && !!actionBlocker(s, a);
                  const tier = Math.floor((a.level - 1) / 10);
                  return (
                    <Fragment key={a.id}>
                    {(index === 0 || Math.floor((list[index - 1].level - 1) / 10) !== tier) &&
                      <span className="wood-pattern-tier">Levels {tier * 10 + 1}–{tier * 10 + 10}</span>}
                    <button
                      key={a.id}
                      type="button"
                      className={`wood-bench-item ${active ? 'active' : ''} ${locked ? 'locked' : ''} ${short ? 'short' : ''}`}
                      aria-pressed={active}
                      data-tut={`action-${a.id}`}
                      title={short ? actionBlocker(s, a) ?? undefined : undefined}
                      onClick={() => selectRecipe(a)}
                    >
                      {a.baseId
                        ? <Art src={`items/${a.baseId}`} alt="" size={24} fallback={<Icon name={baseDef(a.baseId).slot} size={18} />} />
                        : <MatIcon id={Object.keys(a.protectedOutputs ?? a.outputs ?? {})[0]} size={20} />}
                      <span className="wood-bench-item-meta">
                        <b>{a.name}</b>
                        {runningThis ? <Badge tone="gold" live>Running</Badge> : locked ? <LockedBadge level={a.level} /> : <span className="dim small num">Lv {a.level} · {fmtTime(actionIntervalMs(s, a, d))} · {a.xp} XP</span>}
                      </span>
                    </button>
                    </Fragment>
                  );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {base && (
                <div className="wood-piece-art">
                  <Art src={`items/${base.id}`} alt="" size={80} fallback={<Icon name={base.slot} size={40} />} />
                  <strong>{base.name}</strong>
                  <span className="muted small">Item level {smithIlvl(s, resinBonus(s))}</span>
                </div>
              )}

              {base && <>
                <EquipmentBasePreview base={base} />
                <Dials s={s} recipe={selection} dials={dials} living={!!living} change={setManual} />

                <div className="wood-tuning-bar">
                  {familyTunings.length > 0 ? (
                    <div className="wood-tuning-select">
                      <span className="wood-section-head">
                        <label htmlFor={tuningSelectId}>Active tuning</label>
                        <HelpTip tip={TUNINGS_TIP} />
                      </span>
                      <select id={tuningSelectId} value={activeTuning?.id ?? ''} onChange={(e) => {
                        setManual(null);
                        game.act((st) => chooseWoodTuning(st, family, e.target.value));
                      }}>
                        <option value="">Neutral</option>
                        {familyTunings.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <span className="wood-section-head small muted">
                      <span>Tuning: Neutral</span>
                      <HelpTip label="Tunings" tip={TUNINGS_TIP} />
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn sm"
                    disabled={slotsFull}
                    title={slotsFull ? 'No tuning slots left for this family' : 'Save current dials as a reusable tuning'}
                    onClick={() => setSavingTuning(!savingTuning)}
                  >{savingTuning ? 'Cancel' : 'Save as tuning'}</button>
                </div>

                {savingTuning && (
                  <form className="wood-save" onSubmit={(e) => {
                    e.preventDefault();
                    const result = game.act((st) => saveWoodTuning(st, family, name, dials));
                    setNotice(result ?? 'Tuning saved and active');
                    if (!result) {
                      setManual(null);
                      setName('');
                      setSavingTuning(false);
                    }
                  }}>
                    <label>Tuning name <input maxLength={50} value={name} onChange={(e) => setName(e.target.value)} placeholder={`${WOOD_FAMILIES[family].name} preset`} /></label>
                    <button className="btn sm primary" type="submit">Save tuning</button>
                  </form>
                )}

                {manual && <p className="dim small">Draft dials apply to the next piece you {text.verb} here. Saved tunings apply automatically to repeats and offline work.</p>}

                {skill !== 'woodcrafting' ? null : level >= 80 ? (
                  <div className="wood-living-field">
                    <span className="wood-section-head">
                      <label htmlFor={livingSelectId}>Living wood</label>
                      <HelpTip tip={LIVING_TIP} />
                    </span>
                    <select id={livingSelectId} value={living ?? ''} onChange={(e) => setLiving(livingMaterials.find((material) => material === e.target.value))}>
                      <option value="">None</option>
                      {livingMaterials.map((material) => (
                        <option key={material} value={material} disabled={!(s.storage.bank[material] > 0)}>
                          {materialDef(material).name} · {s.storage.bank[material] ?? 0} owned
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="wood-section-head small dim">
                    <span>Living wood unlocks at Lv 80</span>
                    <HelpTip label="Living wood" tip={LIVING_TIP} />
                  </div>
                )}

                <UseBarGrade />
              </>}

              <Costs s={s} inputs={inputs} />
              <MasteryProgress s={s} mastery={selection.mastery} />
              <p className="small muted">{fmtTime(actionIntervalMs(s, selection, d))} · {selection.xp} XP</p>
              <button className="btn primary" disabled={!!reason} onClick={() => {
                setNotice(game.act((st, ctx) => startWoodcraft(st, ctx, selection, { dials: manual ?? undefined, living })) ?? '');
              }}>{reason ?? text.start}</button>
            </section>

            <div className="wood-bench-side">
              {running && runningRecipe && <section className="card wood-card">
                <b>{runningRecipe.name}</b>
                <ProgressBar value={running.progress / actionIntervalMs(s, runningRecipe, d)} />
                <button className="btn sm" onClick={() => game.act(stopAction)}>{text.stop}</button>
              </section>}
              <SkillMinigame skill={skill} showBlank />
              {catalysts}
            </div>
          </div>
        </div>
      )}


      {tab === 'jigs' && <JigsView s={s} skill={skill} level={level} notify={setNotice} />}

      {tab === 'tunings' && (
        <div className="wood-tab-stack">
          <SkillIntro step="Saved dial presets & Living gear" action={<HelpTip label="About Tunings" tip={TUNINGS_TIP} />}>
            Saved dial presets apply automatically when repeating or crafting away. Living Wood items can also be retuned here.
          </SkillIntro>
          <div className="wood-grid">
            {families.map((key) => {
              const list = s.woodcrafting.tunings.filter((t) => t.family === key);
              return (
                <section className="card wood-card" key={key}>
                  <div className="row">
                    <b>{familyLabel(skill, key)}</b>
                    <span className="spacer" />
                    <span className="small num">{list.length}/{woodTuningSlots(s, key)} slots</span>
                  </div>
                  {list.length === 0 && <p className="dim small">No saved tunings yet. Adjust dials on the Workbench and click Save as tuning.</p>}
                  {list.map((t) => (
                    <div key={t.id} className="wood-tuning">
                      <span>{t.name} · <span className="dim num">{t.dials.join(' / ')}</span></span>
                      <button className="btn sm" disabled={s.woodcrafting.active[key] === t.id} onClick={() => game.act((st) => chooseWoodTuning(st, key, t.id))}>
                        {s.woodcrafting.active[key] === t.id ? 'Active' : 'Use'}
                      </button>
                      <button className="btn sm ghost" onClick={() => game.act((st) => removeWoodTuning(st, t))}>Remove</button>
                    </div>
                  ))}
                </section>
              );
            })}
            {skill === 'woodcrafting' && carriedLiving.length > 0 && (
              <section className="card wood-card">
                <div className="row">
                  <b>Living Wood retuning</b>
                  <HelpTip tip="Retuning adjusts the dials on a carried or equipped Living Wood item, at the cost of halving its accumulated Growth." />
                </div>
                {carriedLiving.map((item) => <Retune s={s} item={item} key={item.uid} notify={setNotice} />)}
              </section>
            )}
          </div>
        </div>
      )}

      {tab === 'masterworks' && masterworks}
      {notice && <p className="wood-notice" role="status">{notice}</p>}
      <WoodRack />
    </section>
  );
}
