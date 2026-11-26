import { useState, type CSSProperties, type ReactNode } from 'react';
import { ATLAS_SPECIAL_PERKS, LOST_PLACES, SPECIAL_MAP_ACTIONS, type SpecialMapKind } from '../../data/cartography';
import { materialDef } from '../../data/materials';
import { actionDef, actionsFor, type SkillAction } from '../../data/skills';
import { recipeMaterialCount } from '../../engine/bank';
import { cartographyPreview, upgradeCost } from '../../engine/cartography';
import { mapsHeld, startSpecialMap } from '../../engine/maps';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { fmt, fmtTime, MatIcon, ProgressBar, Tabs } from './common';
import { HelpTip, LockedBadge } from './SkillHelp';
import { SkillMinigame } from './SkillMinigame';
import './cartography-board.css';

const tabs = [
  { id: 'board', label: 'Special' },
  { id: 'upgrades', label: 'Upgrades' },
  { id: 'sextants', label: 'Sextants & folios' },
  { id: 'atlas', label: 'Atlas' },
] as const;
type CartoTab = (typeof tabs)[number]['id'];

const SCRAP_KEYS = [
  ['boss_scrap', 'Boss Scraps'],
  ['vault_scrap', 'Vault Scraps'],
  ['guardian_scrap', 'Guardian Scraps'],
  ['guardian_trophy', 'Guardian Trophies'],
  ['lost_chart', 'Lost Charts'],
] as const;

const SPECIAL = {
  boss: { label: 'Boss Map', seal: '#b4693e', icon: 'boss-map' },
  vault: { label: 'Vault Map', seal: '#d4a347', icon: 'vault-map' },
  guardian: { label: 'Guardian Map', seal: '#b84444', icon: 'guardian-map' },
  pinnacle: { label: 'Pinnacle Map', seal: '#8b5cf6', icon: 'pinnacle-map' },
  lost: { label: 'Lost Chart', seal: '#2dd4bf', icon: 'lost-chart' },
} satisfies Record<SpecialMapKind, { label: string; seal: string; icon: string }>;

const STOCK_ART: Partial<Record<string, string>> = {
  boss_scrap: 'boss-scrap', vault_scrap: 'vault-scrap', guardian_scrap: 'guardian-scrap',
  guardian_trophy: 'guardian-trophy', lost_chart: 'lost-chart',
  completed_atlas_chart: 'pinnacle-map', atlas_survey_record: 'plain-map',
  doom_key_fragment: 'guardian-trophy',
  inscription_fragment: 'inscription-fragment', return_inscription: 'return-inscription',
  choir_inscription: 'choir-inscription', circuit_inscription: 'circuit-inscription', convergence_inscription: 'convergence-inscription',
};

const stationArt = import.meta.glob<string>('../../../public/assets/cartography/*.png', { eager: true, import: 'default', query: '?url&no-inline' });

function StationArt({ name, size = 36 }: { name: string; size?: number }) {
  return <img className="carto-item-art" src={stationArt[`../../../public/assets/cartography/${name}.png`]} width={size} height={size} alt="" draggable={false} />;
}

function MaterialArt({ id, size = 34 }: { id: string; size?: number }) {
  const art = STOCK_ART[id];
  return art ? <StationArt name={art} size={size} /> : <MatIcon id={id} size={size} />;
}

export function CartographyStocks({ s }: { s: GameState }) {
  return <ul className="carto-stocks" aria-label="Survey currencies">
    {SCRAP_KEYS.map(([id, label]) => <li key={id} title={materialDef(id).desc}>
      <span className="carto-socket"><MaterialArt id={id} /><b className="num">{fmt(s.storage.bank[id] ?? 0)}</b></span>
      <span>{label}</span>
    </li>)}
  </ul>;
}

function OutputArt({ a, size = 44 }: { a: SkillAction; size?: number }) {
  if (a.specialMap) return <StationArt name={SPECIAL[a.specialMap.kind].icon} size={size} />;
  if (a.chart) return <StationArt name="plain-map" size={size} />;
  const material = Object.keys(a.outputs ?? a.protectedOutputs ?? {})[0];
  return material ? <MaterialArt id={material} size={size} /> : null;
}

function Ingredient({ icon, label, owned, need, extra = false }: { icon: ReactNode; label: string; owned: number; need: number; extra?: boolean }) {
  return <li className={`${owned < need ? 'short' : ''}${extra ? ' carto-extra-cost' : ''}`}>
    <span className="carto-socket">{icon}</span>
    <span>{label}</span>
    <span className="carto-quantity num" title="Owned / required">{fmt(owned)} / {fmt(need)}</span>
  </li>;
}

function CartoActionCost({ s, a }: { s: GameState; a: SkillAction }) {
  const plainTier = a.chart?.upgrade ? a.chart.tier - 1 : a.specialMap?.needsPlainTier;
  const plainNeed = a.chart?.upgrade ? upgradeCost(s, a) : a.specialMap?.needsPlainTier ? 1 : 0;
  const plainOwned = plainTier ? mapsHeld(s, plainTier) : 0;
  const inputs = Object.entries(a.inputs ?? {});
  return (
    <ul className="carto-costs" aria-label="Recipe ingredients">
      {plainTier && plainNeed > 0 && (
        <Ingredient icon={<StationArt name="plain-map" />} label={`Plain T${plainTier} Map`} owned={plainOwned} need={plainNeed} />
      )}
      {inputs.map(([id, need]) => <Ingredient key={id} icon={<MaterialArt id={id} />} label={materialDef(id).name}
        owned={recipeMaterialCount(s.storage.bank, id)} need={need}
        extra={a.specialMap ? id.endsWith('_ink') : Boolean(a.chart?.upgrade && id === 'arcane_dust')} />)}
    </ul>
  );
}

function RecipeControl({ s, a, interval, notify, label }: { s: GameState; a: SkillAction; interval: number; notify: (msg: string) => void; label: string }) {
  const running = s.action?.kind === 'skill' && s.action.actionId === a.id ? s.action : null;
  const locked = a.level > skillLevel(s, 'cartography');
  const blocker = actionBlocker(s, a);
  return <div className="carto-control">
    <span className="carto-recipe-meta num">{fmtTime(interval)} · {a.xp} XP</span>
    <div className="carto-draft-control">
      <button type="button" className={`btn carto-draft-button ${running ? 'active' : 'primary'}`}
        disabled={!running && (locked || !!blocker)} onClick={() => {
          if (running) game.act(stopAction);
          else notify(game.act((st, ctx) => startSkillAction(st, ctx, a.id)) ?? '');
        }}>
        <span>{running ? 'Stop' : blocker ?? label}</span>
      </button>
      {running && <ProgressBar value={running.progress / interval} className="carto-button-progress" />}
    </div>
  </div>;
}

function RecipeHeading({ s, a, help = true }: { s: GameState; a: SkillAction; help?: boolean }) {
  const locked = a.level > skillLevel(s, 'cartography');
  const preview = help ? cartographyPreview(s, a) : [];
  return <div className="carto-card-head">
    <h3>{a.name}</h3>
    {preview.length > 0 && <HelpTip tip={<>{preview.map((line, i) => <div key={i}>{line}</div>)}</>} />}
    <span className="spacer" />
    {locked ? <LockedBadge level={a.level} /> : <span className="small muted">Lv {a.level}</span>}
  </div>;
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
  const running = s.action?.kind === 'skill' ? actionDef(s.action.actionId).specialMap : undefined;
  const [bossTier, setBossTier] = useState(running?.kind === 'boss' ? running.tier : 1);
  const [vaultTier, setVaultTier] = useState(running?.kind === 'vault' ? running.tier : 1);
  const [selected, select] = useState<SpecialMapKind>(running?.kind ?? 'boss');
  const level = skillLevel(s, 'cartography');

  const cards = {
    boss: { action: actionDef(`special_boss_t${bossTier}`), tierPick: { value: bossTier, set: setBossTier }, desc: '10 packs, ×1.5 boss life, ×3 loot; T5+ 25% Inscription Fragment; T8+ 30% Guardian Scrap.' },
    vault: { action: actionDef(`special_vault_t${vaultTier}`), tierPick: { value: vaultTier, set: setVaultTier }, desc: 'Half packs, ×2 rare monsters, end chest with ×10 currency rolls and 1–3 Vault Scraps.' },
    guardian: { action: actionDef('special_guardian_t10'), desc: 'Stronger T10 Guardian boss. Drops 1 Guardian Trophy.' },
    pinnacle: { action: actionDef('special_pinnacle_t10'), desc: 'Pinnacle boss (×3 life, ×1.5 dmg). Drops Atlas Survey Record or Reliquary Fragment.' },
    lost: { action: actionDef('special_lost_chart'), desc: 'Unique lost place with its own boss. Drops 2 unique-map uniques and 1 Atlas Survey Record.' },
  };
  const { action: a, desc } = cards[selected];
  const tierPick = selected === 'boss' || selected === 'vault' ? cards[selected].tierPick : null;
  const showRunning = () => {
    if (!running) return;
    select(running.kind);
    if (running.kind === 'boss') setBossTier(running.tier);
    if (running.kind === 'vault') setVaultTier(running.tier);
  };
  const current = s.action?.kind === 'skill' && s.action.actionId === a.id;

  return <div className="carto-board">
    <div className="carto-split">
      <section className="carto-panel carto-folio carto-map-folio" aria-label="Map folio">
        <h2>Map Folio</h2>
        {(Object.keys(SPECIAL) as SpecialMapKind[]).map((kind) => {
          const { label, seal, icon } = SPECIAL[kind];
          const recipe = cards[kind].action;
          return <button key={kind} type="button" className="carto-folio-row" style={{ '--seal': seal } as CSSProperties}
            aria-pressed={selected === kind} onClick={() => select(kind)}>
            <StationArt name={icon} size={44} />
            <span><strong>{label}</strong><small>{recipe.level > level ? `Unlocks at Lv ${recipe.level}` : `Lv ${recipe.level}`}</small></span>
            <span className="carto-seal" aria-hidden="true" />
          </button>;
        })}
      </section>
      <section className="carto-panel carto-worktop" aria-label="Drafting table">
        <h2>Drafting Table</h2>
        <RecipeHeading s={s} a={a} help={false} />
        <p className="carto-description">{desc}</p>
        {tierPick && <label className="carto-tier-pick">Map tier
          <select value={tierPick.value} onChange={(e) => tierPick.set(Number(e.target.value))}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((t) => <option key={t} value={t}>T{t} ({mapsHeld(s, t)} plain owned)</option>)}
          </select>
        </label>}
        <div className="carto-process">
          <CartoActionCost s={s} a={a} />
          <span className="carto-process-arrow" aria-hidden="true">⟶</span>
          <div className="carto-astrolabe"><OutputArt a={a} size={100} /></div>
        </div>
        <RecipeControl s={s} a={a} interval={actionIntervalMs(s, a, deriveStats(s))} notify={notify} label="Draft" />
        {running && !current && <button className="btn sm carto-return" onClick={showRunning}>View active draft</button>}
      </section>
    </div>

    {s.cartography.specialMaps.length > 0 && <section className="carto-panel">
      <h2>Ready Special Maps <span className="num">({s.cartography.specialMaps.length})</span></h2>
      <div className="carto-grid">
        {s.cartography.specialMaps.map((m) => {
          const lost = m.lostId ? LOST_PLACES.find((p) => p.id === m.lostId)?.name : undefined;
          return <div key={m.uid} className="carto-card">
            <StationArt name={SPECIAL[m.kind].icon} size={54} />
            <b>{lost ?? `${m.kind[0].toUpperCase() + m.kind.slice(1)} Map (T${m.tier})`}</b>
            <button className="btn sm primary" onClick={() => notify(game.act((st, ctx) => startSpecialMap(st, ctx, m.uid)) ?? 'Entered special map!')}>Run map</button>
          </div>;
        })}
      </div>
    </section>}
  </div>;
}

function ActionListTab({ s, list, notify, fusion = false }: {
  s: GameState;
  list: ReturnType<typeof actionsFor>;
  notify: (msg: string) => void;
  fusion?: boolean;
}) {
  const [showLocked, setShowLocked] = useState(false);
  const [selection, select] = useState<string | null>(null);
  const level = skillLevel(s, 'cartography');
  const d = deriveStats(s);
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'cartography' ? s.action : null;
  const sorted = [...list].sort((a, b) => a.level - b.level);
  const unlocked = sorted.filter((a) => a.level <= level);
  const locked = sorted.filter((a) => a.level > level);
  const visible = showLocked ? sorted : [...unlocked, ...locked.slice(0, 2)];
  const selected = visible.find((a) => a.id === selection) ?? visible.find((a) => a.id === running?.actionId) ?? visible[0];
  const showLockedControl = locked.length > 2 && <label className="carto-show-locked">
    <input type="checkbox" checked={showLocked} onChange={(e) => setShowLocked(e.target.checked)} />
    Show locked ({locked.length})
  </label>;

  if (fusion && selected) return <div className="carto-split">
    <section className="carto-panel carto-folio carto-tier-list" aria-label="Map upgrade tiers">
      <h2>Map Tiers</h2>
      {showLockedControl}
      {sorted.map((a) => {
        const tier = a.chart!.tier;
        const color = tier <= 5 ? 'white' : tier <= 8 ? 'yellow' : 'red';
        return <button key={a.id} type="button" className={`carto-folio-row carto-tier-${color}`} disabled={!visible.includes(a)}
          aria-pressed={selected.id === a.id} onClick={() => select(a.id)}>
          <StationArt name="plain-map" />
          <span><strong>Tier {tier}</strong><small>{a.level > level ? `Unlocks at Lv ${a.level}` : `${mapsHeld(s, tier)} owned`}</small></span>
          {running?.actionId === a.id && <span className="carto-running">Running</span>}
        </button>;
      })}
    </section>
    <section className="carto-panel carto-worktop carto-fusion" aria-label="Fusion pedestal">
      <h2>Fusion Pedestal</h2>
      <RecipeHeading s={s} a={selected} />
      <p className="carto-description">Combine lower-tier maps, vellum and ink into the next map tier.</p>
      <div className="carto-process">
        <CartoActionCost s={s} a={selected} />
        <span className="carto-process-arrow" aria-hidden="true">⟶</span>
        <div className="carto-astrolabe"><OutputArt a={selected} size={94} /></div>
      </div>
      <RecipeControl s={s} a={selected} interval={actionIntervalMs(s, selected, d)} notify={notify} label="Upgrade" />
    </section>
  </div>;

  const supplies = visible.filter((a) => ['chart_vellum', 'chart_fine_vellum', 'chart_gall_ink', 'chart_sepia_ink'].includes(a.id));
  const renderRecipe = (a: SkillAction) => (
    <article key={a.id} className={`carto-card ${a.level > level ? 'locked' : ''}`} style={{ '--recipe-light': a.color } as CSSProperties}>
      <div className="carto-card-art"><OutputArt a={a} size={66} /></div>
      <RecipeHeading s={s} a={a} />
      <CartoActionCost s={s} a={a} />
      <RecipeControl s={s} a={a} interval={actionIntervalMs(s, a, d)} notify={notify} label="Craft" />
    </article>
  );
  return <div className="carto-board">
    <section className="carto-panel">
      <div className="carto-section-heading"><h2>Inks &amp; Vellum</h2>{showLockedControl}</div>
      <div className="carto-grid carto-shelf">{supplies.map(renderRecipe)}</div>
    </section>
    <section className="carto-panel">
      <h2>Sextants, Folios, Keys &amp; Inscriptions</h2>
      <div className="carto-grid">{visible.filter((a) => !supplies.includes(a)).map(renderRecipe)}</div>
    </section>
  </div>;
}

const ATLAS_PAGE_SIZE = 18;
const atlasSlots = new Map(SPECIAL_MAP_ACTIONS.map(({ name, specialMap }) => {
  const { kind, tier } = specialMap!;
  return [`${kind}:${tier}`, { name, icon: SPECIAL[kind].icon }];
}));

function AtlasTab({ s }: { s: GameState }) {
  const [page, setPage] = useState(0);
  const count = s.cartography.atlas.length;
  const filed = new Set(s.cartography.atlas);
  const slots = [...new Set([...atlasSlots.keys(), ...filed])];
  const pageCount = Math.ceil(slots.length / ATLAS_PAGE_SIZE);
  const currentPage = Math.min(page, pageCount - 1);
  const first = currentPage * ATLAS_PAGE_SIZE;
  return <section className="carto-panel carto-atlas" aria-label="Atlas of special maps">
    <div className="carto-section-heading"><h2>Atlas of Special Maps</h2><b className="num">{count} entries</b></div>
    <p className="carto-description">Draft a new kind or tier of Special Map to file it in the Atlas and earn permanent mapping perks.</p>
    <ol className="carto-milestones">
      {ATLAS_SPECIAL_PERKS.map((p) => <li key={p.entries} className={count >= p.entries ? 'reached' : ''}>
        <strong className="num">{p.entries}</strong><span>{p.label}</span>
      </li>)}
    </ol>
    <ul className="carto-atlas-grid" aria-label="Map pedestals">
      {slots.slice(first, first + ATLAS_PAGE_SIZE).map((key) => {
        const slot = atlasSlots.get(key);
        const filled = filed.has(key);
        return <li key={key} className={filled ? 'filed' : 'unfiled'}>
          <StationArt name={slot?.icon ?? 'plain-map'} size={42} />
          <span>{slot?.name ?? key.replace(':', ' T')}</span>
          <small>{filled ? 'Charted' : 'Uncharted'}</small>
        </li>;
      })}
    </ul>
    <div className="carto-atlas-pages">
      {Array.from({ length: pageCount }, (_, i) => <button key={i} type="button" className="btn sm"
        aria-pressed={currentPage === i} onClick={() => setPage(i)}>Folio {i + 1}</button>)}
    </div>
  </section>;
}

export function CartographyBoard() {
  const s = useGame();
  const [tab, setTab] = useState<CartoTab>('board');
  const [notice, setNotice] = useState('');
  const all = actionsFor('cartography').filter((a) => !a.batchMastery);
  const upgrades = all.filter((a) => a.chart?.upgrade);
  const sextants = all.filter((a) => !a.specialMap && !a.chart?.upgrade);
  const running = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'cartography' ? s.action : null;

  return <section className="carto-board carto-station">
    <AwayMaps />
    <Tabs tabs={[...tabs]} value={tab} onChange={(next) => { setTab(next); setNotice(''); }} />
    {running && <section className="carto-panel carto-focus">
      <h2>Take a Sighting</h2>
      <SkillMinigame skill="cartography" />
    </section>}
    {tab === 'board' && <BoardTab s={s} notify={setNotice} />}
    {tab === 'upgrades' && <ActionListTab s={s} list={upgrades} notify={setNotice} fusion />}
    {tab === 'sextants' && <ActionListTab s={s} list={sextants} notify={setNotice} />}
    {tab === 'atlas' && <AtlasTab s={s} />}
    {notice && <p role="status" className="muted small">{notice}</p>}
  </section>;
}
