import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  BAITS, BOATS, FISHING_WATERS, LINES, REELS, RIGS, type FishingBait, type FishingBoat,
  type FishingLine, type FishingReel, type FishingRig, type FishMove,
} from '../../data/fishing';
import {
  buyFishingBait, castFishing, claimFishingFlask, cookFishingFeast, dockFishing, eatFishingFeast,
  EMPTY_FISHING_INPUT, FISHING_STEP_MS, fishingOpen, fishingRigAvailable, fishingTell, fishingTrophy,
  fishingUpgradeCost, orderFishingBait, pushFishing, sailFishing, stepFishing, stowFishingCatch,
  topUpSandworms, upgradeFishingBuilding, visitFishingPort, type CatchKind, type FishingInput, type PortBuilding,
} from '../../engine/fishing';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { PageHeader } from '../components/common';
import type { Page } from '../Layout';
import { SkillPage } from './SkillPage';
import './fishing.css';

const BUILDINGS: Record<PortBuilding, { name: string; detail: string }> = {
  boatyard: { name: 'Boatyard', detail: 'Each upgrade opens the next water.' },
  tackle: { name: 'Tackle Shop', detail: 'Unlocks rods, lines, reels and new bait.' },
  nursery: { name: 'Bait Nursery', detail: 'The crew raises bait while you are away.' },
  smokehouse: { name: 'Smokehouse', detail: 'Prepares a feast once you bring home The Reed Crown.' },
};
const BAIT_IDS = Object.keys(BAITS) as FishingBait[];
const RIG_IDS = Object.keys(RIGS) as FishingRig[];
const BOAT_IDS = Object.keys(BOATS) as FishingBoat[];
const LINE_IDS = Object.keys(LINES) as FishingLine[];
const REEL_IDS = Object.keys(REELS) as FishingReel[];
const MOVE_LABEL: Record<FishMove, string> = {
  left: '← Runs left · brace right',
  right: 'Runs right → · brace left',
  dive: '↓ Dives · ease the reel',
  rest: 'Rests · reel in',
};

function fishingAction(change: (s: GameState, now: number) => string | null) {
  const result = game.act((s) => change(s, Date.now()));
  if (result === null) game.save();
}

function catchName(key: string): string {
  const [water, fish] = key.split(':');
  return FISHING_WATERS[Number(water)][fish as CatchKind].name;
}

export function FishingPage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  if (!fishingOpen(s)) return <SkillPage skill="fishing" go={go} />;
  return <FishingPortView key={s.character.id} />;
}

function FishingPortView() {
  const s = useGame();
  const port = s.account.fishing;
  const voyage = port?.voyage;
  const fight = voyage?.fight;
  const [rig, setRig] = useState<FishingRig>('balanced');
  const [selectedBoat, setBoat] = useState<FishingBoat>();
  const [line, setLine] = useState<FishingLine>('braided');
  const [reel, setReel] = useState<FishingReel>('hand');
  const [tide, setTide] = useState<'day' | 'dusk'>('day');
  const [paused, setPaused] = useState(true);
  const [section, setSection] = useState<'port' | 'log'>('port');
  const input = useRef<FishingInput>({ ...EMPTY_FISHING_INPUT });
  const startedOnFightControl = useRef(false);

  useEffect(() => {
    game.act((state) => visitFishingPort(state, Date.now()));
    const timer = window.setInterval(() => {
      if (game.state !== s) return;
      const state = s.account.fishing;
      const now = Date.now();
      if ((state?.workshop && now >= state.workshop.readyAt) || (state?.nurseryAt !== undefined && now >= state.nurseryAt)) {
        game.act((current) => visitFishingPort(current, now));
        game.save();
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [s]);

  useEffect(() => {
    if (!fight || paused) return;
    const pause = () => {
      input.current = { ...EMPTY_FISHING_INPUT };
      setPaused(true);
      game.save();
    };
    const onVisibility = () => { if (document.hidden) pause(); };
    const timer = window.setInterval(() => {
      if (document.hidden || !document.hasFocus() || game.state !== s) return;
      if (stepFishing(s, Date.now(), input.current) && !s.account.fishing?.voyage?.fight) {
        pause();
        game.notify();
      }
    }, FISHING_STEP_MS);
    function key(e: KeyboardEvent, down: boolean) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.code === 'Space') input.current.reel = down;
      else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        const direction = e.code === 'ArrowLeft' ? -1 : 1;
        if (down || input.current.steer === direction) input.current.steer = down ? direction : 0;
      } else if (e.code === 'Escape' && down) pause();
      else return;
      const button = e.target instanceof HTMLButtonElement ? e.target : null;
      if (e.code !== 'Space' || !button || button.dataset.fishingControl) e.preventDefault();
      else input.current.reel = false;
    }
    const keydown = (e: KeyboardEvent) => key(e, true);
    const keyup = (e: KeyboardEvent) => key(e, false);
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', onVisibility);
      input.current = { ...EMPTY_FISHING_INPUT };
      if (game.state === s) game.save();
    };
  }, [fight, paused, s]);

  if (!port) return null;
  const boats = BOAT_IDS.filter((id) => BOATS[id].level <= port.buildings.boatyard);
  const boat = selectedBoat && boats.includes(selectedBoat) ? selectedBoat : boats[boats.length - 1];
  const water = voyage && FISHING_WATERS[voyage.water];
  const tell = voyage && fight && fishingTell(voyage, fight);
  const now = Date.now();
  const secondsLeft = (deadline: number) => Math.max(0, Math.ceil((deadline - now) / 1000));
  const control = (key: keyof FishingInput, value: boolean | -1 | 1) => {
    const release = () => {
      if (key === 'reel') input.current.reel = false;
      else if (input.current.steer === value) input.current.steer = 0;
    };
    return {
      'data-fishing-control': true,
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        if (key === 'reel') input.current.reel = true;
        else input.current.steer = value as -1 | 1;
      },
      onPointerUp: release, onPointerCancel: release, onLostPointerCapture: release,
    };
  };

  return (
    <div
      className="page saltmere"
      onPointerDownCapture={(event) => {
        startedOnFightControl.current = event.target instanceof Element && !!event.target.closest('[data-fishing-control]');
      }}
      onClickCapture={(event) => {
        // A held control can disappear when a fight ends, before the finger comes up.
        if (event.detail && startedOnFightControl.current &&
          event.target instanceof Element && !event.target.closest('[data-fishing-control]')) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <PageHeader title={water ? water.name : 'Saltmere'} />
      <p className="saltmere-report" role="status">{port.message}</p>
      {voyage && water ? (
        <section className="saltmere-card saltmere-at-sea">
          <div className="saltmere-heading">
            <strong>{['Inshore', 'Second shoal', 'Outer water'][voyage.reach]} · {voyage.tide === 'dusk' ? 'Dusk' : 'Day'}</strong>
            <span>{BOATS[voyage.boat].name} · Hull {voyage.hull}</span>
          </div>
          <p>{water.deep ? 'A wreck here costs the whole haul.' : `Locker ${voyage.locker.length}/2 · Only stowed catches survive a wreck.`}</p>
          {fight && tell ? (
            <div className="saltmere-fight">
              <div className="saltmere-heading">
                <h2>{water[fight.kind].name}</h2>
                {fight.kind === 'legend' && <span>Phase {tell.secondPhase ? 2 : 1}</span>}
              </div>
              <label className="saltmere-meter">Line tension <span>{Math.round(fight.tension)}% {fight.tension < 12 ? '· Slack' : fight.tension > 85 ? '· Near breaking' : ''}</span>
                <meter min={0} max={100} low={12} high={85} optimum={52} value={fight.tension} />
              </label>
              <label className="saltmere-meter">Landing progress <progress value={(fight.kind === 'legend' ? 100 : 66) - Math.max(0, fight.remaining)} max={fight.kind === 'legend' ? 100 : 66} /></label>
              <p className="saltmere-tell">{tell.tell < 470 && tell.move !== 'rest' ? 'Winding up · ' : ''}{MOVE_LABEL[tell.move]} <span>Next · {MOVE_LABEL[tell.next]}</span></p>
              {paused ? (
                <button type="button" autoFocus data-fishing-control onClick={(e) => { e.currentTarget.blur(); setPaused(false); }}>Resume fight</button>
              ) : (
                <div className="saltmere-controls">
                  <button type="button" {...control('steer', -1)}>← Brace left</button>
                  <button type="button" {...control('reel', true)}>Reel</button>
                  <button type="button" {...control('steer', 1)}>Brace right →</button>
                  <button type="button" className="saltmere-pause" onClick={() => setPaused(true)}>Pause</button>
                </div>
              )}
              <small>Hold Reel or Space to pull. Release to ease tension. Hold a brace button or arrow key against a run.</small>
            </div>
          ) : (
            <>
              <div className="saltmere-actions">
                {BAIT_IDS.map((bait) => (
                  <button key={bait} type="button" disabled={!port.bait[bait] || voyage.casts >= 3}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      if (!game.act((state) => castFishing(state, Date.now(), bait))) { setPaused(false); game.save(); }
                    }}>
                    Cast {BAITS[bait]} ({port.bait[bait]})
                  </button>
                ))}
              </div>
              <p>{Math.max(0, 3 - voyage.casts)} casts left at this ground.</p>
              <div className="saltmere-actions">
                {voyage.reach < 2 && <button type="button" onClick={() => fishingAction((state, time) => pushFishing(state, time))}>
                  Sail farther (−{water.deep && voyage.tide === 'dusk' ? 2 : 1} hull)
                </button>}
                <button type="button" onClick={() => fishingAction(dockFishing)}>Dock and bank haul</button>
              </div>
            </>
          )}
          <h3>Haul ({voyage.haul.length + voyage.locker.length})</h3>
          <ul className="saltmere-haul">
            {[...voyage.haul, ...voyage.locker].map((fish, index) => (
              <li key={index}>
                <span>{catchName(fish.key)} · {fish.weight} kg</span>
                {index >= voyage.haul.length ? <small>Stowed</small> : !water.deep && !fight && voyage.locker.length < 2 &&
                  <button type="button" onClick={() => fishingAction((state, time) => stowFishingCatch(state, time, index))}>Stow</button>}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <div className="saltmere-heading saltmere-tabs">
            <div className="saltmere-actions">
              <button type="button" aria-pressed={section === 'port'} onClick={() => setSection('port')}>Port</button>
              <button type="button" aria-pressed={section === 'log'} onClick={() => setSection('log')}>Catch log &amp; rumors</button>
            </div>
            <strong>{port.marks} Dock Marks</strong>
          </div>
          {section === 'port' ? (
            <>
              <section className="saltmere-card">
                <h2>Chart a voyage</h2>
                <div className="saltmere-actions saltmere-loadout">
                  <label>Boat <select value={boat} onChange={(e) => setBoat(e.target.value as FishingBoat)}>
                    {boats.map((id) => <option key={id} value={id}>{BOATS[id].name} · {BOATS[id].hull + (fishingTrophy(port, 1) ? 2 : 0)} hull</option>)}
                  </select></label>
                  <label>Rod <select value={rig} onChange={(e) => setRig(e.target.value as FishingRig)}>
                    {RIG_IDS.filter((id) => fishingRigAvailable(port, id)).map((id) => <option key={id} value={id}>{RIGS[id].name}</option>)}
                  </select></label>
                  <label>Line <select value={line} onChange={(e) => setLine(e.target.value as FishingLine)}>
                    {LINE_IDS.filter((id) => LINES[id].level <= port.buildings.tackle).map((id) => <option key={id} value={id}>{LINES[id].name}</option>)}
                  </select></label>
                  <label>Reel <select value={reel} onChange={(e) => setReel(e.target.value as FishingReel)}>
                    {REEL_IDS.filter((id) => REELS[id].level <= port.buildings.tackle).map((id) => <option key={id} value={id}>{REELS[id].name}</option>)}
                  </select></label>
                  <label>Departure <select value={tide} onChange={(e) => setTide(e.target.value as 'day' | 'dusk')}>
                    <option value="day">Day</option><option value="dusk">Dusk</option>
                  </select></label>
                </div>
                <p>{RIGS[rig].tip} At dusk, deep crossings cost an extra hull.</p>
                <div className="saltmere-waters">
                  {FISHING_WATERS.map((place, index) => (
                    <button type="button" key={place.name} disabled={index >= port.buildings.boatyard}
                      onClick={() => fishingAction((state, time) => sailFishing(state, time, index, rig, tide, boat, line, reel))}>
                      <strong>{place.name}</strong>
                      <small>{index >= port.buildings.boatyard ? `Boatyard ${index + 1} required` : place.deep ? 'Deep voyage · whole haul at risk' : 'Short voyage · two locker spaces'}</small>
                    </button>
                  ))}
                </div>
              </section>
              <section className="saltmere-card">
                <h2>Village workshops</h2>
                <div className="saltmere-buildings">
                  {(Object.keys(BUILDINGS) as PortBuilding[]).map((id) => {
                    const cost = fishingUpgradeCost(port, id);
                    return (
                      <div key={id}>
                        <strong>{BUILDINGS[id].name} {port.buildings[id] || ''}</strong>
                        <p>{BUILDINGS[id].detail}</p>
                        {port.workshop?.building === id ? <span>Ready in {secondsLeft(port.workshop.readyAt)}s</span> :
                          cost !== null && <button type="button" disabled={!!port.workshop || port.marks < cost}
                            onClick={() => fishingAction((state, time) => upgradeFishingBuilding(state, time, id))}>
                            {port.buildings[id] ? 'Upgrade' : 'Reopen'} · {cost} marks
                          </button>}
                      </div>
                    );
                  })}
                </div>
                <h3>Bait</h3>
                <p>{BAIT_IDS.map((id) => `${BAITS[id]} ×${port.bait[id]}`).join(' · ')}</p>
                <div className="saltmere-actions">
                  <button type="button" disabled={port.bait.worm >= 6} onClick={() => fishingAction(topUpSandworms)}>Top up sandworms</button>
                  <button type="button" disabled={port.buildings.tackle < 1 || port.marks < 2}
                    onClick={() => fishingAction((state, time) => buyFishingBait(state, time, 'lure'))}>Buy 4 lures · 2 marks</button>
                  <button type="button" disabled={port.buildings.tackle < 2 || port.marks < 4}
                    onClick={() => fishingAction((state, time) => buyFishingBait(state, time, 'chum'))}>Buy 4 chum · 4 marks</button>
                  {!!port.buildings.nursery && <button type="button" disabled={port.nurseryAt !== undefined} onClick={() => fishingAction(orderFishingBait)}>
                    {port.nurseryAt === undefined ? 'Order a bait batch' : `Bait ready in ${secondsLeft(port.nurseryAt)}s`}
                  </button>}
                </div>
                {(fishingTrophy(port, 2) || fishingTrophy(port, 4)) && <h3>Combat prizes</h3>}
                <div className="saltmere-actions">
                  {fishingTrophy(port, 2) && <>
                    <button type="button" disabled={!port.buildings.smokehouse || port.marks < 15 || !port.smokehouseStock} onClick={() => fishingAction(cookFishingFeast)}>Prepare Crownfire Feast · 15 marks + creek fish ({port.smokehouseStock})</button>
                    <button type="button" disabled={!port.servings} onClick={() => fishingAction(eatFishingFeast)}>Eat Crownfire Feast ({port.servings})</button>
                  </>}
                  {fishingTrophy(port, 4) && <button type="button" disabled={s.fishingFlaskClaimed} onClick={() => {
                    if (game.act((state, ctx) => claimFishingFlask(state, ctx.rng)) === null) game.save();
                  }}>{s.fishingFlaskClaimed ? 'Bottomless Tide claimed' : 'Claim and equip Bottomless Tide'}</button>}
                </div>
              </section>
            </>
          ) : (
            <section className="saltmere-card saltmere-log">
              {FISHING_WATERS.slice(0, port.buildings.boatyard).map((place, index) => (
                <article key={place.name}>
                  <h2>{place.name}</h2>
                  <p>{place.legend.rumor}</p>
                  <ul className="saltmere-haul">
                    {(['fish', 'alternate', 'legend'] as const).map((kind) => {
                      const record = port.log[`${index}:${kind}`];
                      return <li key={kind}><span>{record || kind !== 'legend' ? place[kind].name : 'Unknown legend'}</span>
                        <small>{record ? `${record.count} landed · best ${record.record} kg` : 'Unrecorded'}</small></li>;
                    })}
                  </ul>
                  {fishingTrophy(port, index) && <p>{place.legend.prize}</p>}
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
