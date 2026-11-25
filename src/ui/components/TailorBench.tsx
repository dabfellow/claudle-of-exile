import { useId, useState, type ReactNode } from 'react';
import { baseDef } from '../../data/bases';
import { materialDef } from '../../data/materials';
import { actionDef, actionsFor, type SkillAction } from '../../data/skills';
import { TAILOR_TIERS } from '../../data/tailoring';
import { WOOD_FAMILIES, woodFamily, type WoodFamily } from '../../data/woodcrafting';
import { recipeMaterialCount } from '../../engine/bank';
import { actionBlocker, actionIntervalMs, resinBonus, skillLevel, smithIlvl, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import { buyHides, hideBlocker } from '../../engine/tailoring';
import type { GameState } from '../../engine/types';
import { activeWoodTuning, chooseWoodTuning, removeWoodTuning, saveWoodTuning, startWoodcraft, woodTuningSlots } from '../../engine/woodcrafting';
import { game, useGame } from '../../game';
import { Art, Badge, fmt, fmtTime, MatIcon, ProgressBar, Tabs } from './common';
import { Icon } from './Icon';
import { EquipmentBasePreview } from './ItemView';
import { MasteryProgress } from './MasteryProgress';
import { HelpTip, LockedBadge, SkillIntro } from './SkillHelp';
import { SkillMinigame } from './SkillMinigame';
import { Costs, Dials, JigsView, RECIPES, TUNINGS_TIP, WoodRack } from './WoodBench';
import './wood-bench.css';
import './tailor.css';

const WORKSHOP_ART = new URL('../../assets/zones/terrain-workshop.webp', import.meta.url).href;
const FAMILIES: WoodFamily[] = ['cloth', 'leather'];
const FAMILY_TEXT: Record<'cloth' | 'leather', { label: string; blurb: string }> = {
  cloth: { label: 'Cloth', blurb: 'Robes, hoods, gloves and slippers sewn from linen, cotton and silk.' },
  leather: { label: 'Leather', blurb: 'Jerkins, caps, gloves and boots cut from tanned leather.' },
};
const SLOT_LABEL: Record<string, string> = { helmet: 'Head', body: 'Body', gloves: 'Hands', boots: 'Feet' };
const SLOT_ORDER = ['helmet', 'body', 'gloves', 'boots'];
const garments = RECIPES.tailoring.filter((a) => !!a.baseId);
const weaving = actionsFor('tailoring').filter((a) => a.id.startsWith('weave_') && !a.batchOf);
const tanning = actionsFor('tailoring').filter((a) => a.id.startsWith('tan_') && !a.batchOf);
const tabs = [
  { id: 'sew', label: 'Sew' }, { id: 'prep', label: 'Weave & tan' }, { id: 'patterns', label: 'Patterns' },
  { id: 'form', label: 'Robe form' },
] as const;
type TailorTab = (typeof tabs)[number]['id'];

/** The tailor's shelf: what cloth and leather you have, tier by tier, with the raw stock beside it. */
function StockShelf({ s }: { s: GameState }) {
  const bank = s.storage.bank;
  return (
    <div className="tailor-shelf" aria-label="Cloth and leather in stock">
      {TAILOR_TIERS.map((t) => (
        <div className="tailor-shelf-tier" key={t.cloth}>
          {[[t.cloth, t.fibre], [t.leather, t.hide]].map(([made, raw]) => (
            <span className="tailor-shelf-slot" key={made} title={`${materialDef(made).name} · ${fmt(bank[raw] ?? 0)} ${materialDef(raw).name} waiting`}>
              <MatIcon id={made} size={22} />
              <b className="num">{fmt(bank[made] ?? 0)}</b>
              <span className="tailor-shelf-raw num"><MatIcon id={raw} size={10} />{fmt(bank[raw] ?? 0)}</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function PrepCard({ s, a }: { s: GameState; a: SkillAction }) {
  const level = skillLevel(s, 'tailoring');
  const d = deriveStats(s);
  const running = s.action?.kind === 'skill' && s.action.actionId === a.id ? s.action : null;
  const [outputId] = Object.keys(a.outputs ?? {});
  const locked = a.level > level;
  const blocker = actionBlocker(s, a);
  const interval = actionIntervalMs(s, a, d);
  return (
    <article className={`tailor-prep ${running ? 'running' : ''} ${locked ? 'locked' : ''}`} data-tut={`action-${a.id}`}>
      <div className="tailor-prep-head">
        <MatIcon id={outputId} size={26} />
        <div className="tailor-prep-title">
          <b>{a.name}</b>
          <span className="dim small num">{(interval / 1000).toFixed(1)}s · {fmt(recipeMaterialCount(s.storage.bank, outputId))} made</span>
        </div>
        {locked ? <LockedBadge level={a.level} reason={`Requires Tailoring level ${a.level}`} />
          : running ? <button type="button" className="btn sm" onClick={() => game.act(stopAction)}>Stop</button>
          : (
            <button type="button" className={`btn sm ${blocker ? '' : 'primary'}`} disabled={!!blocker} title={blocker ?? undefined}
              onClick={() => game.act((st, ctx) => startSkillAction(st, ctx, a.id))}>
              {blocker === 'Missing materials' ? 'Need stock' : blocker ? 'Locked' : a.id.startsWith('weave_') ? 'Weave' : 'Tan'}
            </button>
          )}
      </div>
      {a.inputs && <Costs s={s} inputs={a.inputs} />}
      {running && <ProgressBar value={running.progress / interval} color={a.color} />}
      {!locked && <MasteryProgress s={s} mastery={a.mastery} compact />}
    </article>
  );
}

function HideStall({ s, notify }: { s: GameState; notify: (m: string) => void }) {
  return (
    <section className="tailor-stall card">
      <div className="row">
        <h3>Hide stall</h3>
        <span className="spacer" />
        <span className="small num"><MatIcon id="gold" size={12} /> {fmt(s.storage.bank.gold ?? 0)}</span>
      </div>
      <p className="dim small">Raw hides, always in stock. Tan them in the vats with a little bark from your logs.</p>
      {TAILOR_TIERS.map((t) => {
        const locked = skillLevel(s, 'tailoring') < t.level;
        return (
          <div className={`tailor-stall-row ${locked ? 'locked' : ''}`} key={t.hide}>
            <MatIcon id={t.hide} size={24} />
            <span className="tailor-stall-name">
              <b>{materialDef(t.hide).name}</b>
              <span className="dim small num">{t.hidePrice} gold each · {fmt(s.storage.bank[t.hide] ?? 0)} owned</span>
            </span>
            {locked ? <LockedBadge level={t.level} reason={`Requires Tailoring level ${t.level}`} /> : (
              <span className="tailor-stall-buy">
                {[1, 10, 50].map((n) => {
                  const blocked = hideBlocker(s, t.hide, n);
                  return (
                    <button key={n} type="button" className="btn sm" disabled={!!blocked} title={blocked ?? `${fmt(n * t.hidePrice)} gold`}
                      onClick={() => notify(game.act((st, ctx) => buyHides(st, ctx, t.hide, n)) ?? `Bought ${n} ${materialDef(t.hide).name}`)}>
                      ×{n}
                    </button>
                  );
                })}
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function TailorBench({ catalysts }: { catalysts: ReactNode }) {
  const s = useGame();
  const level = skillLevel(s, 'tailoring');
  const d = deriveStats(s);
  const tuningSelectId = useId();
  const [tab, setTab] = useState<TailorTab>('sew');
  const [id, setId] = useState(() => garments[0].id);
  const [family, setFamily] = useState<WoodFamily>(() => woodFamily(actionDef(id).baseId!));
  const [showLocked, setShowLocked] = useState(false);
  const [manual, setManual] = useState<number[] | null>(null);
  const [savingTuning, setSavingTuning] = useState(false);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');

  const selection = actionDef(id);
  const base = baseDef(selection.baseId!);
  const activeTuning = activeWoodTuning(s, family);
  const dials = manual ?? activeTuning?.dials ?? [];
  const familyTunings = s.woodcrafting.tunings.filter((t) => t.family === family);
  const slotsFull = familyTunings.length >= woodTuningSlots(s, family);
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'tailoring' ? s.action : null;
  const runningRecipe = running && actionDef(running.actionId);
  const reason = actionBlocker(s, selection);

  const select = (a: SkillAction) => {
    setId(a.id);
    setFamily(woodFamily(a.baseId!));
    setManual(null);
    setSavingTuning(false);
    setNotice('');
  };
  const chooseFamily = (next: WoodFamily) => {
    const list = garments.filter((a) => woodFamily(a.baseId!) === next);
    select(list.filter((a) => a.level <= level).at(-1) ?? list[0]);
  };

  const inFamily = garments.filter((a) => woodFamily(a.baseId!) === family);
  const bySlot = SLOT_ORDER.map((slot) => {
    const list = inFamily.filter((a) => baseDef(a.baseId!).slot === slot).sort((a, b) => a.level - b.level);
    const open = list.filter((a) => a.level <= level);
    const next = list.filter((a) => a.level > level);
    return { slot, list: showLocked ? list : [...open, ...next.slice(0, 1), ...next.slice(1).filter((a) => a.id === id)], hidden: showLocked ? 0 : Math.max(0, next.length - 1) };
  }).filter((g) => g.list.length);
  const hiddenCount = bySlot.reduce((n, g) => n + g.hidden, 0);

  return (
    <section className="tailor-shop">
      <header className="tailor-scene" style={{ ['--scene' as string]: `url(${WORKSHOP_ART})` }}>
        <div className="tailor-scene-text">
          <span className="tailor-scene-kicker">The tailor’s table</span>
          <p>Weave fibre from your foraging into cloth, tan hides from the stall into leather, then cut and sew it to fit the way you fight.</p>
        </div>
        <StockShelf s={s} />
      </header>

      <Tabs tabs={[...tabs]} value={tab} onChange={(next) => { setTab(next); setNotice(''); }} />

      {tab === 'sew' && (
        <div className="tailor-sew">
          <nav className="tailor-patterns card" aria-label="Patterns">
            <div className="tailor-family" role="tablist" aria-label="Cloth or leather">
              {FAMILIES.map((key) => (
                <button key={key} type="button" role="tab" aria-selected={family === key} className={`tailor-family-btn ${key} ${family === key ? 'active' : ''}`} onClick={() => chooseFamily(key)}>
                  <MatIcon id={key === 'cloth' ? 'linen_cloth' : 'rough_leather'} size={18} />
                  {FAMILY_TEXT[key as 'cloth' | 'leather'].label}
                </button>
              ))}
            </div>
            <p className="dim small">{FAMILY_TEXT[family as 'cloth' | 'leather'].blurb}</p>
            {bySlot.map(({ slot, list }) => (
              <div key={slot} className="tailor-pattern-group">
                <span className="tailor-pattern-slot">{SLOT_LABEL[slot]}</span>
                {list.map((a) => {
                  const locked = a.level > level;
                  const short = !locked && !!actionBlocker(s, a);
                  return (
                    <button key={a.id} type="button" data-tut={`action-${a.id}`} aria-pressed={a.id === id}
                      className={`tailor-pattern ${a.id === id ? 'active' : ''} ${locked ? 'locked' : ''} ${short ? 'short' : ''}`} onClick={() => select(a)}>
                      <Art src={`items/${a.baseId}`} alt="" size={26} fallback={<Icon name={slot} size={18} />} />
                      <span className="tailor-pattern-name">
                        <b>{a.name}</b>
                        {running?.actionId === a.id ? <Badge tone="gold" live>Sewing</Badge>
                          : locked ? <span className="dim small">Lv {a.level}</span>
                          : <span className="tailor-pattern-cost">{Object.entries(a.inputs ?? {}).map(([mat, n]) => <span key={mat} className="num"><MatIcon id={mat} size={10} />{n}</span>)}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
            {(hiddenCount > 0 || showLocked) && (
              <button type="button" className="btn sm ghost" onClick={() => setShowLocked((v) => !v)}>
                {showLocked ? 'Hide locked patterns' : `Show ${hiddenCount} more locked`}
              </button>
            )}
          </nav>

          <section className={`tailor-table ${family}`}>
            <div className="tailor-cloth">
              <div className="tailor-chalk">
                <Art src={`items/${base.id}`} alt="" size={96} fallback={<Icon name={base.slot} size={48} />} />
              </div>
              <div className="tailor-piece-name">
                <strong>{base.name}</strong>
                <span className="small">Item level {smithIlvl(s, resinBonus(s))} · Lv {selection.level}</span>
              </div>
            </div>
            <div className="tailor-fit card">
              <EquipmentBasePreview base={base} />
              <Dials s={s} recipe={selection} dials={dials} living={false} change={setManual} />
              <div className="wood-tuning-bar">
                {familyTunings.length > 0 ? (
                  <div className="wood-tuning-select">
                    <span className="wood-section-head"><label htmlFor={tuningSelectId}>Active pattern</label><HelpTip tip={TUNINGS_TIP} /></span>
                    <select id={tuningSelectId} value={activeTuning?.id ?? ''} onChange={(e) => { setManual(null); game.act((st) => chooseWoodTuning(st, family, e.target.value)); }}>
                      <option value="">Neutral</option>
                      {familyTunings.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                ) : <span className="wood-section-head small muted"><span>Pattern: Neutral</span><HelpTip label="Patterns" tip={TUNINGS_TIP} /></span>}
                <button type="button" className="btn sm" disabled={slotsFull} title={slotsFull ? 'No pattern slots left' : 'Save these dials as a pattern'} onClick={() => setSavingTuning(!savingTuning)}>
                  {savingTuning ? 'Cancel' : 'Save as pattern'}
                </button>
              </div>
              {savingTuning && (
                <form className="wood-save" onSubmit={(e) => {
                  e.preventDefault();
                  const result = game.act((st) => saveWoodTuning(st, family, name, dials));
                  setNotice(result ?? 'Pattern saved and active');
                  if (!result) { setManual(null); setName(''); setSavingTuning(false); }
                }}>
                  <label>Pattern name <input maxLength={50} value={name} onChange={(e) => setName(e.target.value)} placeholder={`${WOOD_FAMILIES[family].name} pattern`} /></label>
                  <button className="btn sm primary" type="submit">Save pattern</button>
                </form>
              )}
              <Costs s={s} inputs={selection.inputs ?? {}} />
              <MasteryProgress s={s} mastery={selection.mastery} />
              <p className="small muted">{fmtTime(actionIntervalMs(s, selection, d))} · {selection.xp} XP</p>
              {running && runningRecipe ? (
                <div className="tailor-running">
                  <span className="small"><b>Sewing {runningRecipe.name}</b></span>
                  <ProgressBar value={running.progress / actionIntervalMs(s, runningRecipe, d)} />
                  <button className="btn sm" onClick={() => game.act(stopAction)}>Stop sewing</button>
                </div>
              ) : null}
              <button className="btn primary" disabled={!!reason} onClick={() => setNotice(game.act((st, ctx) => startWoodcraft(st, ctx, selection, { dials: manual ?? undefined })) ?? '')}>
                {reason === 'Missing materials' ? 'Need cloth or leather — see Weave & tan' : reason ?? 'Start sewing'}
              </button>
            </div>
          </section>

          <aside className="tailor-side">
            <SkillMinigame skill="tailoring" />
            {catalysts}
          </aside>
        </div>
      )}

      {tab === 'prep' && (
        <div className="tailor-prep-layout">
          <SkillIntro step="Make your own cloth and leather">
            Foraging turns up <b>flax</b>, <b>cotton</b> and <b>wild silk</b> beside its herbs. Weave four into a bolt of cloth. Buy raw hides at the stall and tan them with bark from two logs.
          </SkillIntro>
          <section className="tailor-station card">
            <h3>Loom</h3>
            {weaving.map((a) => <PrepCard key={a.id} s={s} a={a} />)}
          </section>
          <section className="tailor-station card">
            <h3>Tanning vats</h3>
            {tanning.map((a) => <PrepCard key={a.id} s={s} a={a} />)}
          </section>
          <HideStall s={s} notify={setNotice} />
        </div>
      )}

      {tab === 'patterns' && (
        <div className="wood-tab-stack">
          <SkillIntro step="Saved patterns" action={<HelpTip label="About patterns" tip={TUNINGS_TIP} />}>
            Saved dial settings apply automatically when you repeat a piece or sew while away.
          </SkillIntro>
          <div className="wood-grid">
            {FAMILIES.map((key) => {
              const list = s.woodcrafting.tunings.filter((t) => t.family === key);
              return (
                <section className="card wood-card" key={key}>
                  <div className="row"><b>{FAMILY_TEXT[key as 'cloth' | 'leather'].label}</b><span className="spacer" /><span className="small num">{list.length}/{woodTuningSlots(s, key)} slots</span></div>
                  {list.length === 0 && <p className="dim small">No saved patterns yet. Set the dials on the Sew tab and click Save as pattern.</p>}
                  {list.map((t) => (
                    <div key={t.id} className="wood-tuning">
                      <span>{t.name} · <span className="dim num">{t.dials.join(' / ')}</span></span>
                      <button className="btn sm" disabled={s.woodcrafting.active[key] === t.id} onClick={() => game.act((st) => chooseWoodTuning(st, key, t.id))}>{s.woodcrafting.active[key] === t.id ? 'Active' : 'Use'}</button>
                      <button className="btn sm ghost" onClick={() => game.act((st) => removeWoodTuning(st, t))}>Remove</button>
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'form' && <JigsView s={s} skill="tailoring" level={level} notify={setNotice} />}
      {notice && <p className="wood-notice" role="status">{notice}</p>}
      <WoodRack />
    </section>
  );
}
