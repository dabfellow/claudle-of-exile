import { useState, type ReactNode } from 'react';
import {
  ALCHEMY_CATEGORIES, INFUSION_BREW_HERBS, INFUSIONS, MAX_INFUSION_RANK,
  alchemyCategory, infusionDef, type AlchemyCategory, type InfusionDef,
} from '../../data/alchemy';
import { actionDef, actionsFor, type SkillAction } from '../../data/skills';
import {
  GRAND_FLAWLESS_BARS, alchemyAccessHint, alchemyPreview, brewsForNextRank,
  firstOpenInfusionSlot, flawlessBarStack, flaskInfusionSlots, herbStockForSource,
  infusionFitBlocker, infusionRank, infusionStrength, infusionUnlocked, pourVial,
  prependInfusion, queueInfusion, removeQueuedInfusion, sourceFitsInfusion, strainPotency,
} from '../../engine/alchemy';
import { flaskName } from '../../engine/flasks';
import { parseStrain, strainLabel } from '../../engine/foraging';
import { masteryLevel } from '../../engine/skillingMastery';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { FlaskInstance, GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import {
  BREW_GLOW, LAB_BACKDROP, bottleArt, cauldronArt, infusionColor, recipeColor, tubeArt, type BrewColor,
} from '../alchemyArt';
import { FLASK_ART } from '../itemArt';
import { Cost, fmtTime, MatIcon, ProgressBar, Tabs, type TabDef } from './common';
import { FlaskIcon } from './FlaskView';
import { MasteryProgress } from './MasteryProgress';
import { SkillMinigame } from './SkillMinigame';
import './alchemy-bench.css';

const hearth = new URL('../../assets/smelting/forge-hearth.webp', import.meta.url).href;
const hearthStill = new URL('../../assets/smelting/forge-hearth-still.webp', import.meta.url).href;

/** Strength is stored as a multiplier (1.1); players read it as a percentage. */
const strengthPct = (n: number) => `${Math.round(n * 100)}%`;

export function AwayVials() {
  const s = useGame();
  const vials = s.alchemy.awayVials;
  const ranks = s.alchemy.awayRankUps;
  if (!vials.length && !ranks.length) return null;
  return <section className="away-alert" aria-label="Brewed infusions">
    <div className="row">
      <b>While you were away, your cauldron brewed {vials.length} vial{vials.length === 1 ? '' : 's'}</b>
      <span className="spacer" />
      <button className="btn sm" onClick={() => game.act((st) => { st.alchemy.awayVials = []; st.alchemy.awayRankUps = []; })}>Got it</button>
    </div>
    {ranks.map((r, idx) => <p key={idx} className="small good">{infusionDef(r.infusion)?.name ?? r.infusion} reached Rank {r.rank}: new vials of it come out stronger.</p>)}
    {vials.length > 0 && <p className="small muted" style={{ marginTop: 4 }}>
      {vials.slice(0, 8).map((v) => `${infusionDef(v.infusion)?.name ?? v.infusion} (${strengthPct(v.strength)})`).join(' · ')}
      {vials.length > 8 ? ` and ${vials.length - 8} more` : ''}. Pour them into your flasks on the Alchemy page.
    </p>}
  </section>;
}

function Bottle({ color, size = 36, title }: { color: BrewColor; size?: number; title?: string }) {
  return <img className="alch-pixel" src={bottleArt(color)} width={size} height={size} alt={title ?? ''} title={title} draggable={false} />;
}

// ---------------------------------------------------------------- the cauldron

function Cauldron({ s, notify }: { s: GameState; notify: (msg: string) => void }) {
  const d = deriveStats(s);
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'alchemy' ? s.action : null;
  const runningDef = running ? actionDef(running.actionId) : null;
  const brewingInfusion = runningDef?.id === 'brew_infusion' ? s.alchemy.queue[0] : undefined;
  const color: BrewColor | null = !runningDef ? null
    : brewingInfusion ? infusionColor(brewingInfusion.infusion)
    : recipeColor(runningDef.flaskId, runningDef.color);
  const interval = runningDef ? actionIntervalMs(s, runningDef, d) : 1;
  const queue = s.alchemy.queue;
  const upNext = brewingInfusion ? queue.slice(1) : queue;
  const queueOffset = brewingInfusion ? 1 : 0;
  const queueBlocker = actionBlocker(s, actionDef('brew_infusion'));

  return <section className={`alch-scene ${running ? 'lit' : ''}`} style={{ ['--brew' as string]: color ? BREW_GLOW[color] : '#6d7480' }}>
    <div className="alch-scene-art" style={{ backgroundImage: `url(${LAB_BACKDROP})` }} aria-hidden />
    <div className="alch-scene-shade" aria-hidden />

    <div className="alch-pot" aria-hidden>
      {running && <div className="alch-steam"><span /><span /><span /><span /><span /></div>}
      <img className="alch-pixel alch-pot-img" src={cauldronArt(color)} alt="" draggable={false} />
      <img className="alch-fire" src={running ? hearth : hearthStill} alt="" draggable={false} />
    </div>

    <div className="alch-status">
      {runningDef ? <>
        <span className="alch-kicker">Brewing</span>
        <h3>{brewingInfusion ? `${infusionDef(brewingInfusion.infusion)?.name ?? brewingInfusion.infusion} infusion` : runningDef.name}</h3>
        <p className="small muted">
          {brewingInfusion
            ? `${INFUSION_BREW_HERBS} ${strainLabel(brewingInfusion.source)} · makes one vial`
            : 'Keeps brewing until you run out of ingredients'}
        </p>
        <ProgressBar value={running!.progress / interval} color="var(--brew)" />
        <div className="row small">
          <span className="muted">{fmtTime(Math.max(0, interval - running!.progress))} left</span>
          <span className="spacer" />
          <button className="btn sm" onClick={() => game.act(stopAction)}>Stop</button>
        </div>
      </> : <>
        <span className="alch-kicker">The cauldron is cold</span>
        <h3>Pick something to brew</h3>
        <p className="small muted">Choose a recipe from the book below. Flasks brew back to back; infusions brew one vial at a time and can be lined up.</p>
      </>}

      <div className="alch-rack">
        <div className="row small">
          <b>Up next</b>
          <span className="muted">{upNext.length ? `${upNext.length} infusion${upNext.length === 1 ? '' : 's'}` : 'nothing lined up'}</span>
          <span className="spacer" />
          {!running && queue.length > 0 && <button className="btn sm primary" disabled={!!queueBlocker} title={queueBlocker ?? undefined}
            onClick={() => notify(game.act((st, ctx) => startSkillAction(st, ctx, 'brew_infusion')) ?? 'Brewing your line-up')}>
            {queueBlocker ?? 'Start brewing'}
          </button>}
        </div>
        {upNext.length > 0 && <div className="alch-rack-row">
          {upNext.map((item, idx) => {
            const c = infusionColor(item.infusion);
            const short = herbStockForSource(s, item.source) < INFUSION_BREW_HERBS;
            return <div key={idx} className={`alch-tube ${short ? 'short' : ''}`} title={`${infusionDef(item.infusion)?.name} from ${strainLabel(item.source)}${short ? ' · not enough herbs yet' : ''}`}>
              <span className="alch-tube-sprite" style={{ backgroundImage: `url(${tubeArt(c)})` }} />
              <span className="alch-tube-name">{infusionDef(item.infusion)?.name}</span>
              <button className="alch-x" aria-label="Remove from line-up" onClick={() => game.act((st) => removeQueuedInfusion(st, idx + queueOffset))}>×</button>
            </div>;
          })}
        </div>}
      </div>
    </div>
  </section>;
}

// ---------------------------------------------------------------- the flask belt

type ReplaceAsk = { belt: number; slot: number } | null;

function FlaskBelt({ s, notify }: { s: GameState; notify: (msg: string) => void }) {
  const [heldId, setHeldId] = useState<string | null>(null);
  const [replaceAsk, setReplaceAsk] = useState<ReplaceAsk>(null);
  const vials = s.alchemy.vials;
  const heldIndex = heldId ? vials.findIndex((v) => v.id === heldId) : -1;
  const held = heldIndex >= 0 ? vials[heldIndex] : null;

  const pour = (belt: number, slot: number) => {
    if (!held) return;
    const name = infusionDef(held.infusion)?.name ?? held.infusion;
    const err = game.act((st) => pourVial(st, belt, slot, heldIndex));
    setReplaceAsk(null);
    if (err) { notify(err); return; }
    notify(`Poured ${name} into ${flaskName(s.flaskSlots[belt]!)}.`);
    setHeldId(null);
  };

  const clickFlask = (belt: number, f: FlaskInstance) => {
    if (!held) return;
    const slot = firstOpenInfusionSlot(f);
    if (slot < 0) { notify('That flask is full. Click the infusion you want to replace.'); return; }
    pour(belt, slot);
  };

  const clickSlot = (belt: number, slot: number, filled: boolean) => {
    if (!held) return;
    if (filled && !(replaceAsk?.belt === belt && replaceAsk.slot === slot)) { setReplaceAsk({ belt, slot }); return; }
    pour(belt, filled ? slot : Math.min(slot, s.flaskSlots[belt]?.infusions?.length ?? 0));
  };

  return <section className="card alch-belt">
    <div className="alch-section-head">
      <h3>Your flask belt</h3>
      <p className="small muted">
        Infusions are permanent upgrades you pour into the flasks you carry. Each flask holds 2, a Grand flask holds 3. They stay in the flask until you replace them.
      </p>
    </div>

    <div className={`alch-shelf ${held ? 'holding' : ''}`}>
      <div className="row small">
        <b>Vials ready to pour</b>
        <span className="muted">{vials.length ? `${vials.length} on the shelf` : 'none yet'}</span>
        <span className="spacer" />
        {held && <button className="btn sm" onClick={() => { setHeldId(null); setReplaceAsk(null); }}>Put it back</button>}
      </div>
      {vials.length === 0
        ? <p className="small muted">A vial is one brewed infusion. Brew one from the Infusions page of the recipe book and it lands here.</p>
        : <div className="alch-vials">
          {vials.map((v) => {
            const def = infusionDef(v.infusion);
            const c = infusionColor(v.infusion);
            return <button key={v.id} type="button" className={`alch-vial ${heldId === v.id ? 'held' : ''}`}
              title={def?.effect}
              onClick={() => { setHeldId(heldId === v.id ? null : v.id); setReplaceAsk(null); }}>
              <Bottle color={c} size={40} />
              <span className="alch-vial-name">{def?.name ?? v.infusion}</span>
              <span className="alch-vial-str">{strengthPct(v.strength)}</span>
            </button>;
          })}
        </div>}
      {held && <p className="small alch-hint">
        Holding <b>{infusionDef(held.infusion)?.name}</b>: {infusionDef(held.infusion)?.effect}. Click a flask to pour it into the first empty slot, or click a filled slot to replace it.
      </p>}
    </div>

    <div className="alch-flasks">
      {s.flaskSlots.map((f, belt) => {
        if (!f) return <div key={belt} className="alch-flask unequipped"><span className="muted small">Belt slot {belt + 1}</span><span className="muted small">No flask equipped</span></div>;
        const slots = flaskInfusionSlots(f);
        const blocker = held ? infusionFitBlocker(held.infusion, f) : null;
        const open = firstOpenInfusionSlot(f);
        return <div key={belt} className={`alch-flask ${held ? (blocker ? 'wont-fit' : 'can-pour') : ''} ${f.grand ? 'grand' : ''}`}>
          <button type="button" className="alch-flask-head" disabled={!held || !!blocker} onClick={() => clickFlask(belt, f)}
            title={blocker ?? (held ? (open >= 0 ? 'Pour into the first empty slot' : 'Full: click a slot below to replace it') : undefined)}>
            <FlaskIcon f={f} size={44} />
            <span>
              <b>{flaskName(f)}</b>
              <span className="small muted">{f.grand ? 'Grand flask · 3 slots' : '2 infusion slots'}</span>
            </span>
          </button>
          {blocker && <span className="small warn">{blocker}</span>}
          <div className="alch-sockets">
            {Array.from({ length: slots }, (_, slot) => {
              const inf = f.infusions?.[slot];
              const def = inf ? infusionDef(inf.id) : undefined;
              const asking = replaceAsk?.belt === belt && replaceAsk.slot === slot;
              const canClick = !!held && !blocker;
              return <button key={slot} type="button" disabled={!canClick}
                className={`alch-socket ${inf ? 'filled' : 'open'} ${asking ? 'asking' : ''}`}
                title={def?.effect}
                onClick={() => clickSlot(belt, slot, !!inf)}>
                {inf ? <>
                  <Bottle color={infusionColor(inf.id)} size={24} />
                  <span className="alch-socket-name">{asking ? `Replace ${def?.name}?` : def?.name ?? inf.id}</span>
                  {!asking && <span className="alch-socket-str">{strengthPct(inf.strength)}</span>}
                </> : <>
                  <span className="alch-socket-ring" />
                  <span className="alch-socket-name muted">{canClick ? 'Pour here' : 'Empty slot'}</span>
                </>}
              </button>;
            })}
          </div>
        </div>;
      })}
    </div>
  </section>;
}

// ---------------------------------------------------------------- the recipe book

type BookPage = 'infusions' | AlchemyCategory;
type Entry = { kind: 'infusion'; id: string; def: InfusionDef } | { kind: 'recipe'; id: string; action: SkillAction };

const PAGE_LABEL: Record<BookPage, string> = {
  infusions: 'Infusions', life: 'Life', mana: 'Mana', defence: 'Defence', utility: 'Utility', grand: 'Grand', reagents: 'Reagents', currency: 'Orbs',
};

function entriesFor(page: BookPage): Entry[] {
  if (page === 'infusions') return INFUSIONS.map((def) => ({ kind: 'infusion', id: def.id, def }));
  return actionsFor('alchemy')
    .filter((a) => a.id !== 'brew_infusion' && !a.batchMastery && alchemyCategory(a) === page)
    .sort((a, b) => a.level - b.level)
    .map((action) => ({ kind: 'recipe', id: action.id, action }));
}

function RecipeArt({ a, size }: { a: SkillAction; size: number }) {
  const flask = a.flaskId ? FLASK_ART[a.flaskId] : undefined;
  if (flask) return <img className="alch-pixel" src={flask} width={size} height={size} alt="" draggable={false} />;
  const out = Object.keys(a.outputs ?? a.protectedOutputs ?? {})[0];
  return out ? <MatIcon id={out} size={size - 4} /> : <Bottle color={recipeColor(undefined, a.color)} size={size} />;
}

function validSources(s: GameState, def: InfusionDef): string[] {
  const strains = Object.keys(s.foraging.strainHerbs).filter((k) => (s.foraging.strainHerbs[k] ?? 0) > 0 && sourceFitsInfusion(def.id, k));
  return [...(def.rareMutation ? [] : [def.herb]), ...strains];
}

function InfusionPage({ s, def, notify }: { s: GameState; def: InfusionDef; notify: (msg: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const unlocked = infusionUnlocked(s, def.id);
  const rec = infusionRank(s, def.id);
  const need = brewsForNextRank(rec.rank);
  const sources = validSources(s, def);
  const source = picked && sources.includes(picked) ? picked : (sources.find((k) => herbStockForSource(s, k) >= INFUSION_BREW_HERBS) ?? sources[0]);
  const stock = source ? herbStockForSource(s, source) : 0;
  const strength = source ? infusionStrength(rec.rank, source) : infusionStrength(rec.rank, def.herb);
  const d = deriveStats(s);
  const time = actionIntervalMs(s, actionDef('brew_infusion'), d);
  const fits = def.grandOnly ? 'Grand flasks only' : def.flaskKinds ? 'Life and Mana flasks' : 'Any flask';

  const brewNow = () => {
    if (!source) return;
    const err = game.act((st, ctx) => {
      const pErr = prependInfusion(st, def.id, source);
      if (pErr) return pErr;
      const sErr = startSkillAction(st, ctx, 'brew_infusion');
      if (sErr) { st.alchemy.queue.shift(); return sErr; }
      return null;
    });
    notify(err ?? `Brewing ${def.name}.`);
  };

  return <div className="alch-page-body">
    <div className="alch-page-title">
      <Bottle color={infusionColor(def.id)} size={56} />
      <div>
        <span className="alch-kicker">{def.rareMutation ? 'Legendary infusion' : `Infusion · Alchemy level ${def.level}`}</span>
        <h3>{def.name}</h3>
        <p className="alch-effect">{def.effect}</p>
        <p className="small muted">Fits: {fits}</p>
      </div>
    </div>

    {!unlocked ? <p className="small warn">
      {def.rareMutation
        ? `Learned by brewing any infusion with a ${def.rareMutation} herb strain from Foraging.`
        : `Learn it at Alchemy level ${def.level}.`}
    </p> : <>
      <div className="alch-rank">
        <div className="row small">
          <b>Rank {rec.rank}</b><span className="muted">of {MAX_INFUSION_RANK}</span>
          <span className="spacer" />
          <span className="muted">{need ? `${rec.brews} / ${need} brews to Rank ${rec.rank + 1}` : 'Max rank'}</span>
        </div>
        <ProgressBar value={need ? rec.brews / need : 1} />
        <p className="small muted">Every brew counts toward the next rank, and each rank makes new {def.name} vials 10% stronger. Vials you've already poured keep their strength.</p>
      </div>

      <div className="alch-herbs">
        <span className="small"><b>Herbs</b> <span className="muted">· one brew uses {INFUSION_BREW_HERBS}</span></span>
        {sources.length === 0
          ? <p className="small muted">You need a {def.rareMutation} (or Prismatic) strain from Foraging to brew this.</p>
          : <div className="alch-chips">
            {sources.map((k) => {
              const have = herbStockForSource(s, k);
              const bonus = strainPotency(k);
              return <button key={k} type="button" className={`alch-chip ${k === source ? 'on' : ''} ${have < INFUSION_BREW_HERBS ? 'short' : ''}`} onClick={() => setPicked(k)}>
                <MatIcon id={parseStrain(k).species} size={14} />
                <span>{strainLabel(k)}</span>
                <span className="num">{have}/{INFUSION_BREW_HERBS}</span>
                {bonus > 0 && <span className="good">+{Math.round(bonus * 100)}%</span>}
              </button>;
            })}
          </div>}
      </div>

      {source && <>
        <p className="small muted">Makes one vial at <b className="good">{strengthPct(strength)}</b> strength · {fmtTime(time)}</p>
        <div className="row wrap">
          <button className="btn primary" disabled={stock < INFUSION_BREW_HERBS} title={stock < INFUSION_BREW_HERBS ? `Needs ${INFUSION_BREW_HERBS} herbs, you have ${stock}` : undefined} onClick={brewNow}>Brew now</button>
          <button className="btn" onClick={() => notify(game.act((st) => queueInfusion(st, def.id, source)) ?? `${def.name} added to the line-up.`)}>Add to line-up</button>
        </div>
      </>}
    </>}
  </div>;
}

function RecipePage({ s, a, notify }: { s: GameState; a: SkillAction; notify: (msg: string) => void }) {
  const d = deriveStats(s);
  const level = skillLevel(s, 'alchemy');
  const locked = a.level > level;
  const running = s.action?.kind === 'skill' ? s.action : null;
  const batches = actionsFor('alchemy').filter((b) => b.batchOf === a.id);
  const flawless = flawlessBarStack(s, GRAND_FLAWLESS_BARS);
  const hint = alchemyAccessHint(s, a);
  const lines = alchemyPreview(s, a).filter((l) => !l.startsWith('Mastery'));

  const startStop = (x: SkillAction) => {
    if (running?.actionId === x.id) game.act(stopAction);
    else notify(game.act((st, ctx) => startSkillAction(st, ctx, x.id)) ?? '');
  };

  return <div className="alch-page-body">
    <div className="alch-page-title">
      <RecipeArt a={a} size={56} />
      <div>
        <span className="alch-kicker">{PAGE_LABEL[alchemyCategory(a)]} · Alchemy level {a.level}</span>
        <h3>{a.name}</h3>
        {lines.map((l, i) => <p key={i} className="small muted">{l}</p>)}
      </div>
    </div>
    {locked ? <p className="small warn">Learn it at Alchemy level {a.level}.</p> : <>
      {a.inputs && <Cost cost={a.inputs} have={s.storage.bank} />}
      {a.grandFlask && <div className="io">
        <span className={`io-item ${flawless ? '' : 'missing'}`}>
          <MatIcon id={flawless ?? 'copper_bar_flawless'} size={12} />
          <span className="num">{GRAND_FLAWLESS_BARS} Flawless bars (any metal)</span>
        </span>
      </div>}
      {hint && <p className="small warn">{hint}</p>}
      <p className="small muted">{fmtTime(actionIntervalMs(s, a, d))} each · {a.xp} XP</p>
      <MasteryProgress s={s} mastery={a.mastery} />
      <div className="row wrap">
        {[a, ...batches].map((x) => {
          const isRunning = running?.actionId === x.id;
          const batchLocked = !!x.batchMastery && (!x.mastery || masteryLevel(s, x.mastery.id) < x.batchMastery);
          const blocker = isRunning ? null : batchLocked ? `Mastery ${x.batchMastery}` : actionBlocker(s, x);
          return <button key={x.id} className={`btn ${x === a && !isRunning ? 'primary' : ''}`} disabled={!!blocker}
            title={blocker ?? undefined} onClick={() => startStop(x)}>
            {isRunning ? 'Stop' : x === a ? (blocker ?? 'Brew') : `×${x.batch}${batchLocked ? ` · Mastery ${x.batchMastery}` : ''}`}
          </button>;
        })}
      </div>
    </>}
  </div>;
}

function RecipeBook({ s, notify }: { s: GameState; notify: (msg: string) => void }) {
  const level = skillLevel(s, 'alchemy');
  const [page, setPage] = useState<BookPage>('infusions');
  const entries = entriesFor(page);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const current = entries.find((e) => e.id === chosen[page]) ?? entries.find((e) => (e.kind === 'infusion' ? infusionUnlocked(s, e.id) : e.action.level <= level)) ?? entries[0];
  const pages: BookPage[] = ['infusions', ...ALCHEMY_CATEGORIES.map((c) => c.id)];

  return <section className="card alch-book">
    <div className="alch-section-head">
      <h3>Recipe book</h3>
      <div className="alch-chips" role="tablist">
        {pages.map((p) => <button key={p} type="button" role="tab" aria-selected={p === page} className={`alch-chip ${p === page ? 'on' : ''}`} onClick={() => setPage(p)}>{PAGE_LABEL[p]}</button>)}
      </div>
    </div>
    <div className="alch-book-spread">
      <ul className="alch-index">
        {entries.map((e) => {
          const isOn = e.id === current?.id;
          if (e.kind === 'infusion') {
            const ok = infusionUnlocked(s, e.id);
            const ready = ok && validSources(s, e.def).some((k) => herbStockForSource(s, k) >= INFUSION_BREW_HERBS);
            return <li key={e.id}>
              <button type="button" className={`alch-index-row ${isOn ? 'on' : ''} ${ok ? '' : 'locked'}`} onClick={() => setChosen({ ...chosen, [page]: e.id })}>
                <Bottle color={infusionColor(e.id)} size={24} />
                <span className="alch-index-name">{e.def.name}{e.def.grandOnly && <span className="muted"> · Grand</span>}</span>
                {ready && <span className="alch-ready" title="You have the herbs for this" />}
                <span className="alch-index-tag">{ok ? `Rank ${infusionRank(s, e.id).rank}` : e.def.rareMutation ? 'Legendary' : `Lv ${e.def.level}`}</span>
              </button>
            </li>;
          }
          const a = e.action;
          const ok = a.level <= level;
          const ready = ok && !actionBlocker(s, a);
          return <li key={e.id}>
            <button type="button" className={`alch-index-row ${isOn ? 'on' : ''} ${ok ? '' : 'locked'}`} onClick={() => setChosen({ ...chosen, [page]: e.id })}>
              <RecipeArt a={a} size={24} />
              <span className="alch-index-name">{a.name}</span>
              {ready && <span className="alch-ready" title="You have the ingredients for this" />}
              <span className="alch-index-tag">Lv {a.level}</span>
            </button>
          </li>;
        })}
      </ul>
      <div className="alch-page">
        {current?.kind === 'infusion' && <InfusionPage key={current.id} s={s} def={current.def} notify={notify} />}
        {current?.kind === 'recipe' && <RecipePage key={current.id} s={s} a={current.action} notify={notify} />}
      </div>
    </div>
  </section>;
}

// ---------------------------------------------------------------- page

type AlchemyTab = 'lab' | 'masterworks';

export function AlchemyBench({ masterworks }: { masterworks: ReactNode }) {
  const s = useGame();
  const [tab, setTab] = useState<AlchemyTab>(() => s.professionProgress.activeProject?.project.skill === 'alchemy' ? 'masterworks' : 'lab');
  const [notice, setNotice] = useState('');
  const tabs: TabDef<AlchemyTab>[] = [
    { id: 'lab', label: 'Laboratory', count: s.alchemy.vials.length || undefined, hot: s.alchemy.vials.length > 0 },
    { id: 'masterworks', label: 'Masterworks' },
  ];

  return <section className="alchemy-bench">
    <Tabs tabs={tabs} value={tab} onChange={(next) => { setTab(next); setNotice(''); }} />
    {tab === 'lab' && <>
      <Cauldron s={s} notify={setNotice} />
      {notice && <p role="status" className="alch-notice small">{notice}</p>}
      <SkillMinigame skill="alchemy" />
      <FlaskBelt s={s} notify={setNotice} />
      <RecipeBook s={s} notify={setNotice} />
    </>}
    {tab === 'masterworks' && masterworks}
  </section>;
}
