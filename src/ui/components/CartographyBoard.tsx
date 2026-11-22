import { useState, type ReactNode } from 'react';
import { ATLAS_SPECIAL_PERKS, LOST_PLACES } from '../../data/cartography';
import { actionDef, actionsFor, type SkillAction } from '../../data/skills';
import { cartographyPreview, upgradeCost } from '../../engine/cartography';
import { mapsHeld, startSpecialMap } from '../../engine/maps';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { Cost, EmptyState, fmtTime, GameIcon, ProgressBar, Tabs } from './common';
import { HelpTip, LockedBadge, SkillIntro } from './SkillHelp';
import { SkillMinigame } from './SkillMinigame';
import './cartography-board.css';

const tabs = [
  { id: 'board', label: 'Board' },
  { id: 'upgrades', label: 'Upgrades' },
  { id: 'sextants', label: 'Sextants & folios' },
  { id: 'atlas', label: 'Atlas' },
  { id: 'masterworks', label: 'Masterworks' },
] as const;
type CartoTab = (typeof tabs)[number]['id'];

const SCRAP_KEYS = [
  ['boss_scrap', 'Boss Scraps'],
  ['vault_scrap', 'Vault Scraps'],
  ['guardian_scrap', 'Guardian Scraps'],
  ['guardian_trophy', 'Guardian Trophies'],
  ['lost_chart', 'Lost Charts'],
] as const;

function CartoActionCost({ s, a }: { s: GameState; a: SkillAction }) {
  const plainTier = a.chart?.upgrade ? a.chart.tier - 1 : a.specialMap?.needsPlainTier;
  const plainNeed = a.chart?.upgrade ? upgradeCost(s, a) : a.specialMap?.needsPlainTier ? 1 : 0;
  const plainOwned = plainTier ? mapsHeld(s, plainTier) : 0;

  return (
    <>
      {a.inputs && Object.keys(a.inputs).length > 0 && <Cost cost={a.inputs} have={s.storage.bank} />}
      {plainTier && plainNeed > 0 && (
        <div className="io">
          <span className={`io-item ${plainOwned < plainNeed ? 'missing' : ''}`} title={`Uses ${plainNeed} plain Tier ${plainTier} map${plainNeed > 1 ? 's' : ''} from your Map Case`}>
            <GameIcon name="cartography" size={12} />
            <span className="num">
              {plainNeed}× Plain T{plainTier} Map <span className="dim">({plainOwned} owned)</span>
            </span>
          </span>
        </div>
      )}
    </>
  );
}

export function AwayMaps() {
  const s = useGame();
  const rows = s.cartography.awayMaps;
  if (!rows.length) return null;
  return <section className="away-alert" aria-label="Special maps crafted">
    <div className="row">
      <b>Cartography · Special maps assembled</b>
      <span className="spacer" />
      <button className="btn sm" onClick={() => game.act((st) => { st.cartography.awayMaps = []; })}>Clear</button>
    </div>
    {rows.map((r, i) => <p key={i} className="small">{r.count}× {r.kind[0].toUpperCase() + r.kind.slice(1)} Map (T{r.tier})</p>)}
  </section>;
}

function BoardTab({ s, notify }: { s: GameState; notify: (msg: string) => void }) {
  const [bossTier, setBossTier] = useState(1);
  const [vaultTier, setVaultTier] = useState(1);
  const level = skillLevel(s, 'cartography');
  const d = deriveStats(s);
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'cartography' ? s.action : null;

  const cards = [
    { action: actionDef(`special_boss_t${bossTier}`), tierPick: { value: bossTier, set: setBossTier }, desc: '10 packs, ×1.5 boss life, ×3 loot; T5+ 25% Inscription Fragment; T8+ 30% Guardian Scrap.' },
    { action: actionDef(`special_vault_t${vaultTier}`), tierPick: { value: vaultTier, set: setVaultTier }, desc: 'Half packs, ×2 rare monsters, end chest with ×10 currency rolls and 1–3 Vault Scraps.' },
    { action: actionDef('special_guardian_t10'), desc: 'Stronger T10 Guardian boss. Drops 1 Guardian Trophy.' },
    { action: actionDef('special_pinnacle_t10'), desc: 'Pinnacle boss (×3 life, ×1.5 dmg). Drops Atlas Survey Record or Reliquary Fragment.' },
    { action: actionDef('special_lost_chart'), desc: 'Unique lost place with its own boss. Drops 2 unique-map uniques and 1 Atlas Survey Record.' },
  ];

  return <div className="carto-board">
    <SkillIntro step="Special Maps">
      Spend Scraps from running maps + a plain Map to assemble high-reward Special Maps.
    </SkillIntro>

    <section className="card">
      <h3>Scraps &amp; rumours</h3>
      <div className="carto-tray">
        {SCRAP_KEYS.map(([id, label]) => <span key={id} className="carto-scrap"><b>{s.storage.bank[id] ?? 0}</b> {label}</span>)}
      </div>
    </section>

    <section className="card">
      <h3>Special maps</h3>
      <div className="carto-grid">
        {cards.map(({ action: a, tierPick, desc }) => {
          const active = running?.actionId === a.id;
          const locked = a.level > level;
          const blocker = actionBlocker(s, a);
          return <div key={a.id} className={`carto-card ${locked ? 'locked' : ''}`}>
            <div className="carto-card-head">
              <b>{a.name}</b>
              <span className="spacer" />
              {locked ? <LockedBadge level={a.level} /> : <span className="small muted">Lv {a.level}</span>}
            </div>
            <p className="small muted">{desc}</p>
            {tierPick && <label className="small">Tier
              <select value={tierPick.value} onChange={(e) => tierPick.set(Number(e.target.value))}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((t) => <option key={t} value={t}>T{t} ({mapsHeld(s, t)} plain owned)</option>)}
              </select>
            </label>}
            <CartoActionCost s={s} a={a} />
            <p className="small muted">{fmtTime(actionIntervalMs(s, a, d))} · {a.xp} XP</p>
            {active && <ProgressBar value={running.progress / actionIntervalMs(s, a, d)} />}
            <button className={`btn sm ${active ? '' : 'primary'}`} disabled={!active && (locked || !!blocker)} onClick={() => {
              if (active) game.act(stopAction);
              else notify(game.act((st, ctx) => startSkillAction(st, ctx, a.id)) ?? '');
            }}>{active ? 'Stop' : blocker ?? 'Make'}</button>
          </div>;
        })}
      </div>
    </section>

    {s.cartography.specialMaps.length > 0 && <section className="card">
      <h3>Ready special maps ({s.cartography.specialMaps.length})</h3>
      <div className="carto-grid">
        {s.cartography.specialMaps.map((m) => {
          const lost = m.lostId ? LOST_PLACES.find((p) => p.id === m.lostId)?.name : undefined;
          return <div key={m.uid} className="carto-card">
            <b>{lost ?? `${m.kind[0].toUpperCase() + m.kind.slice(1)} Map (T${m.tier})`}</b>
            <button className="btn sm primary" onClick={() => notify(game.act((st, ctx) => startSpecialMap(st, ctx, m.uid)) ?? 'Entered special map!')}>Run map</button>
          </div>;
        })}
      </div>
    </section>}
  </div>;
}

function ActionListTab({
  s,
  title,
  introStep,
  introText,
  list,
  notify,
}: {
  s: GameState;
  title: string;
  introStep: string;
  introText: string;
  list: ReturnType<typeof actionsFor>;
  notify: (msg: string) => void;
}) {
  const [showLocked, setShowLocked] = useState(false);
  const level = skillLevel(s, 'cartography');
  const d = deriveStats(s);
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'cartography' ? s.action : null;
  const sorted = [...list].sort((a, b) => a.level - b.level);
  const unlocked = sorted.filter((a) => a.level <= level);
  const locked = sorted.filter((a) => a.level > level);
  const visible = showLocked ? sorted : [...unlocked, ...locked.slice(0, 2)];

  return <section className="card">
    <SkillIntro step={introStep}>{introText}</SkillIntro>
    <div className="row wrap" style={{ marginBottom: 8 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <span className="spacer" />
      {locked.length > 2 && (
        <label className="small row" style={{ gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={showLocked} onChange={(e) => setShowLocked(e.target.checked)} />
          Show locked ({locked.length})
        </label>
      )}
    </div>
    <div className="carto-grid">
      {visible.map((a) => {
        const active = running?.actionId === a.id;
        const isLocked = a.level > level;
        const blocker = actionBlocker(s, a);
        const preview = cartographyPreview(s, a);
        return <div key={a.id} className={`carto-card ${isLocked ? 'locked' : ''}`}>
          <div className="carto-card-head">
            <b>{a.name}</b>
            {preview.length > 0 && (
              <HelpTip tip={<>{preview.map((line, i) => <div key={i}>{line}</div>)}</>} />
            )}
            <span className="spacer" />
            {isLocked ? <LockedBadge level={a.level} /> : <span className="small muted">Lv {a.level}</span>}
          </div>
          <CartoActionCost s={s} a={a} />
          <p className="small muted">{fmtTime(actionIntervalMs(s, a, d))} · {a.xp} XP</p>
          {active && <ProgressBar value={running.progress / actionIntervalMs(s, a, d)} />}
          <button className={`btn sm ${active ? '' : 'primary'}`} disabled={!active && (isLocked || !!blocker)} onClick={() => {
            if (active) game.act(stopAction);
            else notify(game.act((st, ctx) => startSkillAction(st, ctx, a.id)) ?? '');
          }}>{active ? 'Stop' : blocker ?? 'Craft'}</button>
        </div>;
      })}
    </div>
  </section>;
}

function AtlasTab({ s }: { s: GameState }) {
  const count = s.cartography.atlas.length;
  return <section className="card">
    <SkillIntro step="Atlas">
      Every unique Special Map tier you craft fills an Atlas slot for permanent mapping perks.
    </SkillIntro>
    <h3>Atlas of special maps · {count} entries</h3>
    <ul>{ATLAS_SPECIAL_PERKS.map((p) => <li key={p.entries} className={count >= p.entries ? 'good small' : 'muted small'}>{p.entries} entries · {p.label}</li>)}</ul>
    {count > 0 ? <div className="carto-tray" style={{ marginTop: 8 }}>
      {s.cartography.atlas.map((k) => <span key={k} className="carto-scrap">{k.replace(':', ' T')}</span>)}
    </div> : <EmptyState small icon={<GameIcon name="cartography" size={24} />} title="No Atlas entries yet">Assemble special maps on the Board tab to fill your Atlas.</EmptyState>}
  </section>;
}

export function CartographyBoard({ masterworks }: { masterworks: ReactNode }) {
  const s = useGame();
  const [tab, setTab] = useState<CartoTab>(() => s.professionProgress.activeProject?.project.skill === 'cartography' ? 'masterworks' : 'board');
  const [notice, setNotice] = useState('');
  const all = actionsFor('cartography').filter((a) => !a.batchMastery);
  const upgrades = all.filter((a) => a.chart?.upgrade);
  const sextants = all.filter((a) => !a.specialMap && !a.chart?.upgrade);
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'cartography' ? s.action : null;

  return <section className="carto-board">
    <AwayMaps />
    {running && (
      <section className="card">
        <h3>Take a sighting</h3>
        <SkillMinigame skill="cartography" />
      </section>
    )}
    <Tabs tabs={[...tabs]} value={tab} onChange={(next) => { setTab(next); setNotice(''); }} />
    {tab === 'board' && <BoardTab s={s} notify={setNotice} />}
    {tab === 'upgrades' && (
      <ActionListTab
        s={s}
        title="Map upgrades (3:1 / 2:1)"
        introStep="Upgrades"
        introText="Combine 3 plain maps of one tier into 1 map of the next tier — or 2:1 via Atlas milestones."
        list={upgrades}
        notify={setNotice}
      />
    )}
    {tab === 'sextants' && (
      <ActionListTab
        s={s}
        title="Vellum, ink, sextants & folios"
        introStep="Sextants & Folios"
        introText="Craft Vellum & Ink, then build Sextants for extra map modifiers & rewards and Folios for sustained map/scrap drops."
        list={sextants}
        notify={setNotice}
      />
    )}
    {tab === 'atlas' && <AtlasTab s={s} />}
    {tab === 'masterworks' && masterworks}
    {notice && <p role="status" className="muted small">{notice}</p>}
  </section>;
}
