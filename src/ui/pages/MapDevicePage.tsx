import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { uniqueDef } from '../../data/bases';
import { MAP_DEVICE_ATLAS_LEVEL, stationDef } from '../../data/hideout';
import {
  ATLAS_NODES,
  ATLAS_DOOMED_CLEAR_POINTS,
  ATLAS_HARD_BOSS_CLEAR_POINTS,
  ATLAS_POINT_CAP,
  ATLAS_UBER_BOSS_CLEAR_POINTS,
  DOOMED_MODS,
  DOOMED_TIERS,
  doomedTier,
  HARD_BOSSES,
  isKeyedBossZone,
  MAP_DROPS,
  MAP_TIERS,
  mapTier,
  NORMAL_MAP_MODS,
  normalMapModDef,
  SEXTANTS,
  sextantDef,
  sextantMod,
  UBER_BOSSES,
  UNIQUE_MAPS,
  uniqueMapDef,
  type AtlasWing,
  type HardBossDef,
  type UberBossDef,
  type UniqueMapDef,
} from '../../data/maps';
import { actOpen, zoneDef } from '../../data/zones';
import { bossesOffline } from '../../engine/automation';
import { addBank } from '../../engine/bank';
import { retreat } from '../../engine/combat';
import { FINAL_ACT, stationLevel, stationLockReason } from '../../engine/hideout';
import {
  addDoomedMaps,
  addUniqueMaps,
  allocateAtlasNode,
  applySextant,
  atlasBonuses,
  atlasPointsEarned,
  atlasPointsLeft,
  canAllocateAtlasNode,
  canStartHardBoss,
  canStartUberBoss,
  devKit,
  devToggleWindups,
  doomedHeld,
  ensureAtlas,
  ensureMapSettings,
  ensureSextants,
  grantBossKeys,
  grantMaps,
  hasAtlasNode,
  mapsHeld,
  mapsOpen,
  MAPS_PREVIEW,
  refundAtlas,
  sextantSlots,
  startAutoRun,
  startDoomedAutoRun,
  startDoomedMap,
  startHardBoss,
  startMap,
  startUberBoss,
  startUniqueMap,
  stopAutoRun,
  toggleAutoRerollChaos,
  toggleBlockedMod,
  toggleRollNormalMaps,
  totalMapsHeld,
  uniqueMapHeld,
} from '../../engine/maps';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, EmptyState, fmt, fmtTime, GameIcon, MatIcon, PageHeader } from '../components/common';
import { TIER_ART, tierColor, zoneArt } from '../components/mapLook';
import type { Page } from '../Layout';
import '../round2-session2.css';

const HOUR = 60 * 60 * 1000;
/** the test kit sits this far above a tier: it has no passives spent, so it needs the margin */
const DEV_KIT_LEVELS = 14;
/** how long the device takes to open a portal before the fight page takes over */
const OPEN_MS = 900;

type DeviceTab = 'maps' | 'doomed' | 'bosses' | 'atlas';

const WING_TITLES: Record<AtlasWing, { title: string; subtitle: string }> = {
  sustain: { title: 'Sustain', subtitle: 'Map drop chance, tier-up odds, and bonus boss map drops' },
  bounty: { title: 'Bounty', subtitle: 'Currency drop rates, Item Rarity, and extra boss spoils' },
  surveying: { title: 'Surveying', subtitle: 'Sextant run charges, reward effect, and the 4th Sextant slot' },
  peril: { title: 'Peril', subtitle: 'Higher monster danger for greater yield, Unbroken Path, and Doomed Horizon' },
};

/** What sits in the device, ready to open. */
type Loaded =
  | { kind: 'tier'; tier: number }
  | { kind: 'unique'; id: UniqueMapDef['id'] }
  | { kind: 'doomed'; tier: number }
  | { kind: 'hard'; id: HardBossDef['id'] }
  | { kind: 'uber'; tier: UberBossDef['tier'] };

const sameLoaded = (a: Loaded, b: Loaded) => JSON.stringify(a) === JSON.stringify(b);

const UNIQUE_ART: Record<UniqueMapDef['id'], string> = { umap_vaults: 'kingsmint', umap_cowards_trial: 'crypt', umap_olmecs: 'pyretemple', umap_maelstrom: 'maelstrom', umap_grandmasters: 'hallofcrowns' };
const artFor = zoneArt;

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

/** The device's face for what's loaded: its art, colour, short mark and name. */
function face(l: Loaded): { art?: string; color: string; mark: string; name: string; kicker: string } {
  switch (l.kind) {
    case 'tier':
      return { art: artFor(TIER_ART[l.tier - 1]), color: tierColor(l.tier), mark: String(l.tier), name: `Map Tier ${l.tier}`, kicker: mapTier(l.tier).modName };
    case 'unique': {
      const u = uniqueMapDef(l.id);
      return { art: artFor(UNIQUE_ART[l.id]), color: 'var(--unique)', mark: `T${u.tier}`, name: u.name, kicker: 'Unique map' };
    }
    case 'doomed': {
      const d = doomedTier(l.tier);
      return { art: artFor('shatteredthrone'), color: '#c0433b', mark: ROMAN[l.tier], name: d.name, kicker: 'Doomed map' };
    }
    case 'hard': {
      const hb = HARD_BOSSES.find((b) => b.id === l.id)!;
      return { art: undefined, color: '#d0675b', mark: '☠', name: hb.arenaName, kicker: hb.name };
    }
    case 'uber': {
      const ub = UBER_BOSSES.find((b) => b.tier === l.tier)!;
      return { art: undefined, color: '#b06ad0', mark: ROMAN[l.tier], name: ub.arenaName, kicker: ub.name };
    }
  }
}

// ---------- the device itself ----------

/** The rune rings, the portal in the middle and the four Sextant orbs round it. */
function DeviceRing({ loaded, state, slot, onSlot }: { loaded: Loaded | null; state: 'idle' | 'loaded' | 'opening' | 'open'; slot: number | null; onSlot: (i: number) => void }) {
  const s = useGame();
  const f = loaded ? face(loaded) : null;
  const slots = sextantSlots(s);
  const sextants = ensureSextants(s);
  return (
    <div className={`md-device ${state}`} style={{ ['--portal' as string]: f?.color ?? 'var(--accent)' }}>
      <svg className="md-runes outer" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="96" />
        {Array.from({ length: 24 }, (_, i) => (
          <text key={i} x="100" y="12" transform={`rotate(${i * 15} 100 100)`}>
            {'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ'[i % 12]}
          </text>
        ))}
      </svg>
      <svg className="md-runes inner" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="80" strokeDasharray="2 6" />
        <circle cx="100" cy="100" r="72" />
      </svg>
      <div className="md-portal" style={f?.art ? ({ ['--art' as string]: `url(${f.art})` } as CSSProperties) : undefined}>
        <span className="md-portal-swirl" />
        <span className="md-portal-mark">{state === 'open' ? <GameIcon name="combat" size={30} /> : f ? f.mark : <GameIcon name="map" size={28} />}</span>
      </div>
      <span className="md-flash" />
      {[0, 1, 2, 3].map((i) => {
        const open = i < slots;
        const sx = sextants[i];
        const mod = sx ? sextantMod(sx.modId) : null;
        return (
          <button
            key={i}
            className={`md-orb o${i} ${open ? '' : 'locked'} ${mod ? 'active' : ''} ${slot === i ? 'selected' : ''} ${sx ? sx.tier : ''}`}
            onClick={() => onSlot(i)}
            title={!open ? `Sextant slot ${i + 1}: locked` : mod ? `${mod.name}: ${mod.desc} (${sx!.charges} runs left)` : `Sextant slot ${i + 1}: empty`}
            aria-label={`Sextant slot ${i + 1}`}
          >
            {!open ? <GameIcon name="lock" size={12} /> : mod ? <b className="num">{sx!.charges}</b> : <span className="md-orb-empty">+</span>}
          </button>
        );
      })}
    </div>
  );
}

/** One fact about a map, as a small labelled tile. */
function Fact({ label, children, tone }: { label: string; children: ReactNode; tone?: string }) {
  return (
    <span className={`md-fact ${tone ?? ''}`}>
      <small>{label}</small>
      <b>{children}</b>
    </span>
  );
}

/** The three Atlas marks a tier can earn. */
function AtlasMarks({ tier }: { tier: number }) {
  const s = useGame();
  const atlas = ensureAtlas(s);
  const marks: [string, boolean][] = [
    ['Cleared', atlas.cleared.includes(tier)],
    ['Sextant-slotted', atlas.slotted.includes(tier)],
    ['Deathless', atlas.deathless.includes(tier)],
  ];
  return (
    <span className="md-marks">
      {marks.map(([label, on]) => (
        <span key={label} className={`md-mark ${on ? 'on' : ''}`} title={`${label}: ${on ? 'done' : 'not yet'} (+1 Atlas point)`}>
          {on ? '✓' : '○'} {label}
        </span>
      ))}
    </span>
  );
}

/** The running map: where it is, what it rolled and how far along it is. */
function RunInfo({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const { run, auto } = s.maps;
  if (!run) return null;
  const zone = zoneDef(run.zoneId);
  const uDef = run.uniqueMapId ? uniqueMapDef(run.uniqueMapId) : null;
  const tDef = run.doomedTier || uDef ? null : mapTier(run.tier);
  const dDef = run.doomedTier ? doomedTier(run.doomedTier) : null;
  const mods = [
    ...(run.sextantMods ?? []).map((id) => ({ ...sextantMod(id), group: 'Sextant' })),
    ...(run.doomedMods ?? []).map((id) => DOOMED_MODS.find((m) => m.id === id)).filter((m) => !!m).map((m) => ({ ...m!, group: 'Doomed' })),
    ...(run.normalMods ?? []).map((id) => normalMapModDef(id)).filter((m) => !!m).map((m) => ({ ...m!, group: 'Rolled' })),
  ];
  // the same rule the tier cards' Auto-run used: the running tier (or Doomed tier) can be switched to auto-run
  const canAuto = !uDef && (run.doomedTier ? !(auto?.tier === run.doomedTier && !!auto?.doomed) : auto?.tier !== run.tier);
  return (
    <div className="md-info">
      <span className="md-kicker">The portal is open</span>
      <h2 className="md-title">{zone.name}</h2>
      <div className="row wrap" style={{ gap: 6 }}>
        <Badge tone={dDef || uDef ? 'warn' : 'neutral'}>{uDef ? `Unique Map · Tier ${uDef.tier}` : dDef ? dDef.name : `Tier ${run.tier} · ${tDef?.modName}`}</Badge>
        {auto && <Badge tone="success">Auto-run on</Badge>}
      </div>
      <div className="md-packs">
        <span className="md-packs-bar">
          <span style={{ width: `${(1 - run.packsLeft / Math.max(1, run.packsTotal)) * 100}%` }} />
        </span>
        <span className="dim small num">
          {run.packsLeft}/{run.packsTotal} packs left
        </span>
      </div>
      {uDef && <p className="dim small md-desc">{uDef.desc} · {uDef.rewardSummary}</p>}
      {tDef && tDef.mod !== 'none' && <p className="dim small md-desc">{tDef.modDesc}</p>}
      {mods.length > 0 && (
        <div className="md-mods">
          {mods.map((m, i) => (
            <span key={`${m.id}-${i}`} className={`md-mod ${m.group.toLowerCase()}`} title={`${m.group}: ${m.desc}`}>
              {m.name}
            </span>
          ))}
        </div>
      )}
      {mods.length > 0 && (
        <details className="md-more">
          <summary>What the modifiers do</summary>
          {mods.map((m, i) => (
            <div key={`${m.id}-${i}`} className="small">
              <b>{m.name}</b> <span className="dim">({m.group})</span>: {m.desc}
            </div>
          ))}
        </details>
      )}
      <div className="md-actions">
        <button className="btn primary" onClick={() => go('combat')}>
          Watch the fight
        </button>
        {auto && (
          <button className="btn" onClick={() => game.act((st) => stopAutoRun(st))}>
            Stop after this run
          </button>
        )}
        {canAuto && (
          <button
            className="btn"
            title="Keep running this tier until your maps of it run out"
            onClick={() => game.act((st, ctx) => (run.doomedTier ? startDoomedAutoRun(st, ctx, run.doomedTier) : startAutoRun(st, ctx, run.tier)))}
          >
            Auto-run
          </button>
        )}
        <button className="btn danger" onClick={() => game.act((st) => retreat(st))}>
          Abandon (map lost)
        </button>
      </div>
    </div>
  );
}

/** A keyed boss arena in progress. */
function ArenaInfo({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  return (
    <div className="md-info">
      <span className="md-kicker">Keyed arena open</span>
      <h2 className="md-title">{zoneDef(s.combat!.zoneId).name}</h2>
      <div className="md-actions">
        <button className="btn primary" onClick={() => go('combat')}>
          Watch the fight
        </button>
        <button className="btn danger" onClick={() => game.act((st) => retreat(st))}>
          Abandon (key lost)
        </button>
      </div>
    </div>
  );
}

/** What's loaded: its facts, and the buttons that open it. */
function LoadedInfo({ loaded, onOpen }: { loaded: Loaded; onOpen: (open: () => boolean | void, toCombat: boolean) => void }) {
  const s = useGame();
  const { run, auto } = s.maps;
  const atlas = ensureAtlas(s);
  const f = face(loaded);
  let facts: ReactNode = null;
  let body: ReactNode = null;
  let actions: ReactNode = null;
  if (loaded.kind === 'tier') {
    const tier = mapTier(loaded.tier);
    const held = mapsHeld(s, loaded.tier);
    const isAuto = auto?.tier === loaded.tier;
    facts = (
      <>
        <Fact label="Monster level">{tier.level}</Fact>
        <Fact label="Packs">{tier.packs}</Fact>
        <Fact label="Held" tone={held > 0 ? '' : 'bad'}>
          {fmt(held)}
        </Fact>
      </>
    );
    body = (
      <>
        <p className="small md-desc">
          <Badge tone={tier.mod === 'none' ? 'neutral' : 'warn'}>{tier.modName}</Badge> {tier.modDesc}
        </p>
        <p className="dim small md-desc">Favours {tier.rewardDesc}.</p>
        <AtlasMarks tier={loaded.tier} />
      </>
    );
    actions = (
      <>
        <button className="btn primary md-open" disabled={!!run || held <= 0} onClick={() => onOpen(() => game.act((st, ctx) => startMap(st, ctx, loaded.tier)) === null, false)}>
          Open map
        </button>
        <button className="btn" disabled={isAuto || (run ? run.tier !== loaded.tier || !!run.doomedTier : held <= 0)} onClick={() => game.act((st, ctx) => startAutoRun(st, ctx, loaded.tier))}>
          Auto-run
        </button>
      </>
    );
  } else if (loaded.kind === 'unique') {
    const u = uniqueMapDef(loaded.id);
    const held = uniqueMapHeld(s, u.id);
    facts = (
      <>
        <Fact label="Tier">{u.tier}</Fact>
        <Fact label="Monster level">{u.level}</Fact>
        <Fact label="Held" tone={held > 0 ? '' : 'bad'}>
          {fmt(held)}
        </Fact>
      </>
    );
    body = (
      <>
        <p className="small md-desc">{u.desc}</p>
        <p className="small md-desc">
          <b>Spoils:</b> {u.rewardSummary}
        </p>
        <p className="dim small md-desc md-flavour">"{u.flavour}"</p>
      </>
    );
    actions = (
      <button
        className="btn primary md-open"
        disabled={!!run || held <= 0}
        onClick={() => {
          let ok = false;
          game.act((st, ctx) => {
            ok = !startUniqueMap(st, ctx, u.id);
          });
          onOpen(() => ok, true);
        }}
      >
        Open {u.name}
      </button>
    );
  } else if (loaded.kind === 'doomed') {
    const d = doomedTier(loaded.tier);
    const held = doomedHeld(s, d.tier);
    const isAuto = auto?.tier === d.tier && !!auto?.doomed;
    const modsText = d.modCount[0] === d.modCount[1] ? `${d.modCount[0]}` : `${d.modCount[0]}–${d.modCount[1]}`;
    facts = (
      <>
        <Fact label="Monster level">{d.level}</Fact>
        <Fact label="Packs">{d.packs}</Fact>
        <Fact label="Modifiers">{modsText}</Fact>
        <Fact label="Uber Key">{Math.round(d.keyChance * 100)}%</Fact>
        <Fact label="Held" tone={held > 0 ? '' : 'bad'}>
          {fmt(held)}
        </Fact>
      </>
    );
    body = <p className="dim small md-desc">{atlas.doomedCleared?.includes(d.tier) ? 'Atlas reward claimed.' : `+${ATLAS_DOOMED_CLEAR_POINTS} Atlas points on first clear.`}</p>;
    actions = (
      <>
        <button className="btn primary md-open" disabled={!!run || held <= 0} onClick={() => onOpen(() => game.act((st, ctx) => startDoomedMap(st, ctx, d.tier)) === null, false)}>
          Open {d.name}
        </button>
        <button className="btn" disabled={isAuto || (run ? run.doomedTier !== d.tier : held <= 0)} onClick={() => game.act((st, ctx) => startDoomedAutoRun(st, ctx, d.tier))}>
          Auto-run
        </button>
      </>
    );
  } else if (loaded.kind === 'hard') {
    const hb = HARD_BOSSES.find((b) => b.id === loaded.id)!;
    const uniq = uniqueDef(hb.uniqueId);
    const held = s.account.bank[hb.keyId] ?? 0;
    const defeated = s.bossesDefeated.includes(hb.zoneId);
    const blocker = canStartHardBoss(s, hb.id);
    facts = (
      <>
        <Fact label="Boss level">{hb.level}</Fact>
        <Fact label={hb.keyName} tone={held > 0 ? '' : 'bad'}>
          <MatIcon id={hb.keyId} size={13} /> {fmt(held)}
        </Fact>
        <Fact label="Status" tone={defeated ? 'good' : ''}>
          {defeated ? 'Defeated' : 'Undefeated'}
        </Fact>
      </>
    );
    body = (
      <>
        <p className="small md-desc">{hb.mechanicSummary}</p>
        <details className="md-more">
          <summary>How to fight it, and the spoils</summary>
          <p className="dim small">
            <b>Rule & Aim Hint:</b> {hb.ruleHint}
          </p>
          <p className="dim small">
            <b>Spoils:</b> <MatIcon id={hb.trophyId} size={12} /> {hb.trophyName} (100%) · <b>{uniq.name}</b> ({defeated ? '35%' : '100% first kill'}) ·{' '}
            {atlas.hardBossesCleared?.includes(hb.id) ? 'Atlas reward claimed' : `+${ATLAS_HARD_BOSS_CLEAR_POINTS} Atlas points`}
          </p>
        </details>
      </>
    );
    actions = (
      <button
        className="btn primary md-open"
        disabled={!!blocker}
        title={blocker ?? `Consume 1 ${hb.keyName} to open ${hb.arenaName}`}
        onClick={() => {
          let ok = false;
          game.act((st, ctx) => {
            ok = !startHardBoss(st, ctx, hb.id);
          });
          onOpen(() => ok, true);
        }}
      >
        Open {hb.arenaName}
      </button>
    );
  } else {
    const ub = UBER_BOSSES.find((b) => b.tier === loaded.tier)!;
    const uniqs = ub.uniques.map((id) => uniqueDef(id));
    const held = s.account.bank[ub.keyId] ?? 0;
    const defeated = s.bossesDefeated.includes(ub.zoneId);
    const blocker = canStartUberBoss(s, ub.tier);
    facts = (
      <>
        <Fact label="Boss level">{ub.level}</Fact>
        <Fact label={ub.keyName} tone={held > 0 ? '' : 'bad'}>
          <MatIcon id={ub.keyId} size={13} /> {fmt(held)}
        </Fact>
        <Fact label="Status" tone={defeated ? 'good' : ''}>
          {defeated ? 'Defeated' : 'Undefeated'}
        </Fact>
      </>
    );
    body = (
      <>
        <p className="small md-desc">{ub.mechanicSummary}</p>
        <details className="md-more">
          <summary>Spoils</summary>
          <p className="dim small">
            <MatIcon id={ub.sigilId} size={12} /> {ub.sigilName} (100%) · {uniqs.map((u) => u.name).join(' / ')} ({defeated ? '35%' : '100% first kill'}) ·{' '}
            {atlas.uberBossesCleared?.includes(ub.zoneId) ? 'Atlas reward claimed' : `+${ATLAS_UBER_BOSS_CLEAR_POINTS} Atlas points`}
          </p>
        </details>
      </>
    );
    actions = (
      <button
        className="btn primary md-open"
        disabled={!!blocker}
        title={blocker ?? `Consume 1 ${ub.keyName} to open ${ub.arenaName}`}
        onClick={() => {
          let ok = false;
          game.act((st, ctx) => {
            ok = !startUberBoss(st, ctx, ub.tier);
          });
          onOpen(() => ok, true);
        }}
      >
        Open {ub.arenaName}
      </button>
    );
  }
  return (
    <div className="md-info" style={{ ['--portal' as string]: f.color }}>
      <span className="md-kicker">{f.kicker}</span>
      <h2 className="md-title">{f.name}</h2>
      <div className="md-facts">{facts}</div>
      {body}
      <div className="md-actions">{actions}</div>
    </div>
  );
}

/** The Sextant on one slot, and the buttons that roll a new one onto it. */
function SextantSlotPanel({ idx, onClose }: { idx: number; onClose: () => void }) {
  const s = useGame();
  const slots = sextantSlots(s);
  const slot = ensureSextants(s)[idx];
  const mod = slot ? sextantMod(slot.modId) : null;
  const sDef = slot ? sextantDef(slot.tier) : null;
  const open = idx < slots;
  return (
    <div className="md-slot-panel">
      <div className="row" style={{ alignItems: 'center', gap: 8 }}>
        <b>Sextant slot {idx + 1}</b>
        {!open ? (
          <Badge tone="locked">{idx === 3 ? 'Atlas: Fourth Astrolabe' : idx === 2 ? 'Map Device Lv 4' : 'Map Device Lv 2'}</Badge>
        ) : mod && slot ? (
          <Badge tone="success">{slot.charges} runs left</Badge>
        ) : (
          <Badge tone="neutral">Empty</Badge>
        )}
        <span className="grow" />
        <button className="btn sm ghost" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      {open && (
        <>
          {mod && sDef ? (
            <div className="small">
              <b>{mod.name}</b> <span className="dim">({sDef.name} · Tier {mod.minMapTier}+)</span>
              <div className="dim">{mod.desc}</div>
            </div>
          ) : (
            <p className="dim small" style={{ margin: 0 }}>
              No Sextant modifier active in this slot.
            </p>
          )}
          <div className="row wrap" style={{ gap: 6 }}>
            {SEXTANTS.map((sex) => {
              const have = s.account.bank[sex.id] ?? 0;
              return (
                <button key={sex.id} className="btn sm" disabled={have <= 0} title={sex.desc} onClick={() => game.act((st, ctx) => applySextant(st, ctx, idx, sex.id))}>
                  <MatIcon id={sex.id} size={13} /> Roll {sex.tier[0].toUpperCase() + sex.tier.slice(1)} ({have})
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** The Sextants you hold and how many slots are working, under the device. */
function AstrolabeSummary() {
  const s = useGame();
  const slots = sextantSlots(s);
  const active = ensureSextants(s).slice(0, slots).filter((x) => !!x).length;
  return (
    <div className="md-astro">
      <span className="md-astro-title">
        Sextants <span className="dim num">{active}/{slots} slots active</span>
      </span>
      {SEXTANTS.map((sex) => (
        <span key={sex.id} className="md-astro-stock" title={`${sex.name}: ${sex.desc}`}>
          <MatIcon id={sex.id} size={14} />
          <b className="num">{fmt(s.account.bank[sex.id] ?? 0)}</b>
          <span className="dim">T{sex.minMapTier}+</span>
        </span>
      ))}
      <span className="dim small md-astro-help">
        Tap an orb round the device to roll a Sextant onto it: a modifier for {6 + atlasBonuses(s).sextantCharges} map runs. Map Device Lv {stationLevel(s, 'map_device')}
        {hasAtlasNode(s, 'survey_notable') ? ' + Fourth Astrolabe' : ''}.
      </span>
    </div>
  );
}

/** The device and what's loaded in it (or the portal you've opened), with the Sextant astrolabe round it. */
function DeviceStage({ loaded, picked, onOpened, go }: { loaded: Loaded | null; picked: boolean; onOpened: () => void; go: (p: Page) => void }) {
  const s = useGame();
  const [opening, setOpening] = useState(false);
  const [slot, setSlot] = useState<number | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const inArena = !s.maps.run && !!s.combat && isKeyedBossZone(s.combat.zoneId);
  const running = !!s.maps.run || inArena;
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  /** open the portal: the device flares while the run starts, then the fight page takes over if this one goes there */
  const onOpen = (open: () => boolean | void, toCombat: boolean) => {
    const ok = open();
    if (!ok) return;
    onOpened();
    setOpening(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => {
        setOpening(false);
        if (toCombat) go('combat');
      },
      reduced ? 0 : OPEN_MS,
    );
  };
  const runLoaded: Loaded | null = s.maps.run
    ? s.maps.run.uniqueMapId
      ? { kind: 'unique', id: s.maps.run.uniqueMapId as UniqueMapDef['id'] }
      : s.maps.run.doomedTier
        ? { kind: 'doomed', tier: s.maps.run.doomedTier }
        : { kind: 'tier', tier: s.maps.run.tier }
    : null;
  const shown = runLoaded ?? loaded;
  const state = opening ? 'opening' : running ? 'open' : shown ? 'loaded' : 'idle';
  return (
    <div className="card md-stage" style={{ ['--portal' as string]: shown ? face(shown).color : 'var(--accent)' }}>
      <div className="md-stage-device">
        <DeviceRing loaded={shown} state={state} slot={slot} onSlot={(i) => setSlot(slot === i ? null : i)} />
        {slot !== null && <SextantSlotPanel idx={slot} onClose={() => setSlot(null)} />}
      </div>
      <div className="md-stage-info">
        {s.maps.run ? <RunInfo go={go} /> : inArena ? <ArenaInfo go={go} /> : loaded ? <LoadedInfo loaded={loaded} onOpen={onOpen} /> : <EmptyState title="Nothing loaded">Pick a map below to load it into the device.</EmptyState>}
        {running && picked && loaded && !(runLoaded && sameLoaded(loaded, runLoaded)) && (
          <div className="md-next">
            <span className="md-next-label">Loaded next</span>
            <LoadedInfo loaded={loaded} onOpen={onOpen} />
          </div>
        )}
        <AstrolabeSummary />
      </div>
    </div>
  );
}

// ---------- the maps you can load ----------

/** A map as a portal card: its painted face, tier and how many you hold. Click to load it into the device. */
function PortalCard({ art, color, mark, title, sub, held, badge, selected, running, onClick, extra }: { art?: string; color: string; mark: string; title: ReactNode; sub?: ReactNode; held: number; badge?: ReactNode; selected: boolean; running?: boolean; onClick: () => void; extra?: ReactNode }) {
  return (
    <button className={`md-card ${selected ? 'selected' : ''} ${held > 0 ? '' : 'empty'} ${running ? 'running' : ''}`} style={{ ['--portal' as string]: color, ...(art ? { ['--art' as string]: `url(${art})` } : {}) }} onClick={onClick}>
      <span className="md-card-art" />
      <span className="md-card-mark">{mark}</span>
      <span className="md-card-held num" title="Held">
        ×{fmt(held)}
      </span>
      <span className="md-card-body">
        <b className="md-card-title">{title}</b>
        {sub && <span className="md-card-sub">{sub}</span>}
        {badge}
        {extra}
      </span>
      {running && <span className="md-card-running">Open now</span>}
    </button>
  );
}

function TierCards({ loaded, onLoad }: { loaded: Loaded | null; onLoad: (l: Loaded) => void }) {
  const s = useGame();
  const { run } = s.maps;
  const atlas = ensureAtlas(s);
  return (
    <div className="md-cards">
      {MAP_TIERS.map((t) => {
        const l: Loaded = { kind: 'tier', tier: t.tier };
        const marks = [atlas.cleared.includes(t.tier), atlas.slotted.includes(t.tier), atlas.deathless.includes(t.tier)];
        return (
          <PortalCard
            key={t.tier}
            art={artFor(TIER_ART[t.tier - 1])}
            color={tierColor(t.tier)}
            mark={String(t.tier)}
            title={`Tier ${t.tier}`}
            sub={`Lv ${t.level} · ${t.packs} packs`}
            held={mapsHeld(s, t.tier)}
            badge={<span className={`md-card-mod ${t.mod === 'none' ? '' : 'warn'}`}>{t.modName}</span>}
            extra={
              <span className="md-card-pips" title="Atlas: cleared · Sextant-slotted · deathless">
                {marks.map((on, i) => (
                  <i key={i} className={on ? 'on' : ''} />
                ))}
              </span>
            }
            selected={!!loaded && sameLoaded(loaded, l)}
            running={!!run && !run.doomedTier && !run.uniqueMapId && run.tier === t.tier}
            onClick={() => onLoad(l)}
          />
        );
      })}
    </div>
  );
}

function UniqueCards({ loaded, onLoad }: { loaded: Loaded | null; onLoad: (l: Loaded) => void }) {
  const s = useGame();
  return (
    <div className="md-cards">
      {UNIQUE_MAPS.map((u) => {
        const l: Loaded = { kind: 'unique', id: u.id };
        return (
          <PortalCard
            key={u.id}
            art={artFor(UNIQUE_ART[u.id])}
            color="var(--unique)"
            mark={`T${u.tier}`}
            title={<span className="rar-unique">{u.name}</span>}
            sub={`Lv ${u.level} · ${u.packs} packs`}
            held={uniqueMapHeld(s, u.id)}
            selected={!!loaded && sameLoaded(loaded, l)}
            running={s.maps.run?.uniqueMapId === u.id}
            onClick={() => onLoad(l)}
          />
        );
      })}
    </div>
  );
}

function MapSafetyPanel({ isDoomed }: { isDoomed: boolean }) {
  const s = useGame();
  const cfg = ensureMapSettings(s);
  const chaos = s.account.bank.chaos ?? 0;
  const mods = isDoomed ? DOOMED_MODS : NORMAL_MAP_MODS;
  const avoided = mods.filter((m) => cfg.blockedMods.includes(m.id)).length;

  return (
    <details className="card md-safety">
      <summary>
        <b>{isDoomed ? 'Doomed modifier safety & auto-roll' : 'Map modifiers & auto-roll safety'}</b>
        <span className="md-safety-sum dim small">
          {!isDoomed && (cfg.rollNormalMaps ? 'Random affixes on · ' : 'Random affixes off · ')}
          {avoided} avoided · auto-reroll {cfg.autoRerollChaos ? 'on' : 'off'} · <MatIcon id="chaos" size={12} /> {fmt(chaos)}
        </span>
      </summary>
      <p className="dim small" style={{ marginTop: 8 }}>
        Blacklist deadly modifiers you wish to avoid. When an avoided modifier rolls on entry or during auto-run, the Map Device automatically spends 1 Chaos Orb to reroll the map (up to 5 attempts per run).
      </p>

      {!isDoomed && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!cfg.rollNormalMaps} onChange={() => game.act((st) => toggleRollNormalMaps(st))} />
            <span>
              <b>Roll Random Affixes on Normal Maps</b> <span className="dim small">(Adds 2–3 dangerous modifiers for extra packs, currency and item rarity)</span>
            </span>
          </label>
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={cfg.autoRerollChaos} onChange={() => game.act((st) => toggleAutoRerollChaos(st))} />
          <span>
            <b>Auto-Reroll with Chaos Orbs if an avoided modifier rolls</b> <span className="dim small">(Spends 1 Chaos Orb per reroll attempt)</span>
          </span>
        </label>
      </div>

      <div className="small dim" style={{ marginBottom: 6 }}>
        <b>Avoided modifiers (click to toggle blacklist):</b>
      </div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {mods.map((m) => {
          const blocked = cfg.blockedMods.includes(m.id);
          return (
            <button key={m.id} className={`gem-chip sm md-avoid ${blocked ? 'active blocked' : ''}`} title={m.desc} onClick={() => game.act((st) => toggleBlockedMod(st, m.id))}>
              {blocked ? '✕ Avoid: ' : '+ Allow: '} {m.name}
            </button>
          );
        })}
      </div>
    </details>
  );
}

function DoomedPanel({ loaded, onLoad }: { loaded: Loaded | null; onLoad: (l: Loaded) => void }) {
  const s = useGame();
  const unlocked = hasAtlasNode(s, 'atlas_doomed');
  return (
    <>
      <div className="callout skill-note">
        <b>Doomed Maps (I–V)</b> roll 2–4 dangerous realm modifiers at once, scale up to 100 monster packs, drop currency at 3.5× Tier 10 Exalted and Divine rates, can drop <b>Fractured Orbs</b>, and their bosses can drop <b>Uber Boss Keys</b>.{' '}
        {!unlocked && 'Allocate the Doomed Horizon keystone on the Atlas Tree (20 Atlas points earned) so Tier 8–10 map bosses can drop Doomed Maps.'}
      </div>
      <div className="md-cards">
        {DOOMED_TIERS.map((d) => {
          const l: Loaded = { kind: 'doomed', tier: d.tier };
          return (
            <PortalCard
              key={d.tier}
              art={artFor('shatteredthrone')}
              color="#c0433b"
              mark={ROMAN[d.tier]}
              title={d.name}
              sub={`Lv ${d.level} · ${d.packs} packs`}
              held={doomedHeld(s, d.tier)}
              selected={!!loaded && sameLoaded(loaded, l)}
              running={!!s.maps.run?.doomedTier && s.maps.run.doomedTier === d.tier}
              onClick={() => onLoad(l)}
            />
          );
        })}
      </div>
      <MapSafetyPanel isDoomed={true} />
    </>
  );
}

function BossesPanel({ loaded, onLoad }: { loaded: Loaded | null; onLoad: (l: Loaded) => void }) {
  const s = useGame();
  return (
    <>
      <div className="callout skill-note">
        <b>Hard Mode Bosses (Lv 72–86)</b> are opened with keys dropped by Map bosses (boosted by the <b>Boss Key Hunt</b> Sextant) or crafted with life skills. Each kill guarantees its boss trophy material and drops its exclusive unique on first clear (35% on repeat kills). Combine all four keys or trophies at Smithing Lv 85 to challenge <b>The Crownless</b>.
      </div>
      <div className="md-cards">
        {HARD_BOSSES.map((hb) => {
          const l: Loaded = { kind: 'hard', id: hb.id };
          return (
            <PortalCard
              key={hb.id}
              color="#d0675b"
              mark="☠"
              title={hb.name}
              sub={`${hb.arenaName} · Lv ${hb.level}`}
              held={s.account.bank[hb.keyId] ?? 0}
              badge={s.bossesDefeated.includes(hb.zoneId) ? <span className="md-card-mod good">✓ Defeated</span> : <span className="md-card-mod">Guaranteed unique</span>}
              selected={!!loaded && sameLoaded(loaded, l)}
              running={s.combat?.zoneId === hb.zoneId}
              onClick={() => onLoad(l)}
            />
          );
        })}
      </div>
      <div className="callout skill-note">
        <b>Uber Bosses (Lv 91–97)</b> are the realm’s pinnacle encounters, opened with Uber Keys dropped by <b>Doomed Map I–V</b> bosses. Each kill guarantees its exclusive <b>Doom Sigil</b> and drops its build-defining unique on first clear (35% on repeat kills).
      </div>
      <div className="md-cards">
        {UBER_BOSSES.map((ub) => {
          const l: Loaded = { kind: 'uber', tier: ub.tier };
          return (
            <PortalCard
              key={ub.zoneId}
              color="#b06ad0"
              mark={ROMAN[ub.tier]}
              title={ub.name}
              sub={`${ub.arenaName} · Lv ${ub.level}`}
              held={s.account.bank[ub.keyId] ?? 0}
              badge={s.bossesDefeated.includes(ub.zoneId) ? <span className="md-card-mod good">✓ Defeated</span> : <span className="md-card-mod">Guaranteed unique</span>}
              selected={!!loaded && sameLoaded(loaded, l)}
              running={s.combat?.zoneId === ub.zoneId}
              onClick={() => onLoad(l)}
            />
          );
        })}
      </div>
    </>
  );
}

function AtlasPanel() {
  const s = useGame();
  const atlasUnlocked = stationLevel(s, 'map_device') >= MAP_DEVICE_ATLAS_LEVEL;
  const atlas = ensureAtlas(s);
  const earned = atlasPointsEarned(s);
  const left = atlasPointsLeft(s);
  const treeViewport = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState('sustain_1');
  const selected = ATLAS_NODES.find((node) => node.id === selectedId) ?? ATLAS_NODES[0];
  const selectedAllocated = atlas.nodes.includes(selected.id);
  const selectedBlocker = canAllocateAtlasNode(s, selected.id);
  const refundDependent = ATLAS_NODES.find((node) => {
    if (!atlas.nodes.includes(node.id) || !node.requires?.includes(selected.id)) return false;
    return !node.requires.some((required) => required !== selected.id && atlas.nodes.includes(required));
  });

  useEffect(() => {
    const viewport = treeViewport.current;
    if (!viewport) return;
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
  }, []);

  if (!atlasUnlocked) {
    return (
      <div className="card" style={{ padding: '36px 16px', textAlign: 'center' }}>
        <h3>Atlas of the Realm</h3>
        <p className="dim" style={{ maxWidth: 460, margin: '8px auto 16px' }}>
          The Atlas tree is dormant. Upgrade your Map Device to Level 2 in your Hideout to awaken the Atlas tree and attune your realm's maps.
        </p>
        <Badge tone="locked">Requires Map Device Level 2</Badge>
      </div>
    );
  }

  return (
    <>
      <div className="card atlas-summary">
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <b>Atlas of the Realm</b> · <span className="num">{left}</span> point{left === 1 ? '' : 's'} available (<span className="num">{earned}</span> / {ATLAS_POINT_CAP} earned) · <span className="num">{atlas.nodes.length}</span> / 100 allocated
          </div>
          {atlas.nodes.length > 0 && (
            <button className="btn sm" onClick={() => game.act((st) => refundAtlas(st))}>
              Respec Atlas (Free)
            </button>
          )}
        </div>
        <details className="md-more">
          <summary>How Atlas points are earned</summary>
          <p className="dim small" style={{ marginBottom: 4 }}>
            Each Map Tier 1–10 awards up to 3 Atlas points across your realm: <b>+1</b> for first clear ({atlas.cleared.length}/10), <b>+1</b> for clearing with all unlocked Sextant slots filled ({atlas.slotted.length}/10), and <b>+1</b> for a deathless clear ({atlas.deathless.length}/10). Choose a connected route from any of the four central starting nodes.
          </p>
          <p className="dim small" style={{ margin: '4px 0' }}>
            Endgame first clears award the other 40 points: <b>+{ATLAS_DOOMED_CLEAR_POINTS}</b> per Doomed tier ({atlas.doomedCleared?.length ?? 0}/5), <b>+{ATLAS_HARD_BOSS_CLEAR_POINTS}</b> per Hard Boss ({atlas.hardBossesCleared?.length ?? 0}/5), and <b>+{ATLAS_UBER_BOSS_CLEAR_POINTS}</b> per Uber Boss ({atlas.uberBossesCleared?.length ?? 0}/3).
          </p>
        </details>
      </div>
      <div className="atlas-layout">
        <div ref={treeViewport} className="atlas-tree-viewport" aria-label="Atlas skill tree">
          <div className="atlas-tree-canvas">
            <svg className="atlas-connections" viewBox="0 0 1280 1280" aria-hidden="true">
              {ATLAS_NODES.filter((node) => !node.requires?.length).map((node) => (
                <line key={`root-${node.id}`} x1="640" y1="640" x2={node.x} y2={node.y} className={atlas.nodes.includes(node.id) ? 'allocated' : 'open'} />
              ))}
              {ATLAS_NODES.flatMap((node) =>
                (node.requires ?? []).map((requiredId) => {
                  const required = ATLAS_NODES.find((candidate) => candidate.id === requiredId);
                  if (!required) return null;
                  const allocated = atlas.nodes.includes(node.id) && atlas.nodes.includes(requiredId);
                  const open = atlas.nodes.includes(requiredId) && !atlas.nodes.includes(node.id);
                  return <line key={`${requiredId}-${node.id}`} x1={required.x} y1={required.y} x2={node.x} y2={node.y} className={allocated ? 'allocated' : open ? 'open' : ''} />;
                }),
              )}
            </svg>
            <div className="atlas-core" aria-hidden="true">
              <span>ATLAS</span>
            </div>
            {(Object.keys(WING_TITLES) as AtlasWing[]).map((wing) => (
              <div key={wing} className={`atlas-wing-label ${wing}`}>
                <b>{WING_TITLES[wing].title}</b>
                <span>{WING_TITLES[wing].subtitle}</span>
              </div>
            ))}
            {ATLAS_NODES.map((node) => {
              const allocated = atlas.nodes.includes(node.id);
              const blocker = canAllocateAtlasNode(s, node.id);
              const available = !allocated && !blocker;
              return (
                <button
                  key={node.id}
                  className={`atlas-node ${node.wing} ${node.notable ? 'notable' : ''} ${node.keystone ? 'keystone' : ''} ${allocated ? 'allocated' : ''} ${available ? 'available' : ''} ${selected.id === node.id ? 'selected' : ''}`}
                  style={{ left: node.x, top: node.y }}
                  title={`${node.name}: ${node.desc}`}
                  aria-label={`${node.name}. ${node.desc}${allocated ? ' Allocated.' : blocker ? ` ${blocker}.` : ' Available.'}`}
                  onClick={() => setSelectedId(node.id)}
                >
                  <span>{node.keystone ? '◆' : node.notable ? '✦' : '·'}</span>
                </button>
              );
            })}
          </div>
        </div>
        <aside className={`card atlas-inspector ${selected.wing}`}>
          <div className="row" style={{ alignItems: 'center', gap: 8 }}>
            <b>{selected.name}</b>
            <span className="grow" />
            {selected.keystone ? <Badge tone="warn">Keystone</Badge> : selected.notable ? <Badge tone="neutral">Notable</Badge> : null}
          </div>
          <div className="atlas-wing-name">{WING_TITLES[selected.wing].title}</div>
          <p>{selected.desc}</p>
          {selectedAllocated ? (
            <button className="btn sm" disabled={!!refundDependent} title={refundDependent ? `Required by ${refundDependent.name}` : 'Refund this Atlas point'} onClick={() => game.act((st) => refundAtlas(st, selected.id))}>
              {refundDependent ? `Required by ${refundDependent.name}` : 'Refund Point'}
            </button>
          ) : (
            <button className="btn sm primary" disabled={!!selectedBlocker} title={selectedBlocker ?? 'Spend 1 Atlas point'} onClick={() => game.act((st) => allocateAtlasNode(st, selected.id))}>
              {selectedBlocker ?? 'Allocate Point'}
            </button>
          )}
        </aside>
      </div>
    </>
  );
}

/** The first thing to show in the device on a tab: the highest map you hold of its kind, else the first. */
function defaultLoaded(s: GameState, tab: DeviceTab): Loaded | null {
  if (tab === 'maps') {
    const held = [...MAP_TIERS].reverse().find((t) => mapsHeld(s, t.tier) > 0);
    return { kind: 'tier', tier: held?.tier ?? 1 };
  }
  if (tab === 'doomed') {
    const held = [...DOOMED_TIERS].reverse().find((d) => doomedHeld(s, d.tier) > 0);
    return { kind: 'doomed', tier: held?.tier ?? 1 };
  }
  if (tab === 'bosses') {
    const hb = HARD_BOSSES.find((b) => (s.account.bank[b.keyId] ?? 0) > 0) ?? HARD_BOSSES[0];
    return { kind: 'hard', id: hb.id };
  }
  return null;
}

const TAB_KINDS: Record<DeviceTab, Loaded['kind'][]> = { maps: ['tier', 'unique'], doomed: ['doomed'], bosses: ['hard', 'uber'], atlas: [] };

function MapDeviceContent({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const [tab, setTab] = useState<DeviceTab>('maps');
  const [loaded, setLoaded] = useState<Loaded | null>(() => defaultLoaded(s, 'maps'));
  // a map picked by hand while a portal is open is shown under it, ready for when the run ends
  const [picked, setPicked] = useState(false);
  const load = (l: Loaded) => {
    setLoaded(l);
    setPicked(true);
  };
  const { run, tally } = s.maps;
  const earned = atlasPointsEarned(s);
  const left = atlasPointsLeft(s);
  const totalHeld = totalMapsHeld(s);
  const totalDoomed = DOOMED_TIERS.reduce((sum, d) => sum + doomedHeld(s, d.tier), 0);
  const totalKeys = HARD_BOSSES.reduce((sum, hb) => sum + (s.account.bank[hb.keyId] ?? 0), 0) + UBER_BOSSES.reduce((sum, ub) => sum + (s.account.bank[ub.keyId] ?? 0), 0);
  const pickTab = (t: DeviceTab) => {
    setTab(t);
    if (!loaded || !TAB_KINDS[t].includes(loaded.kind)) {
      const d = defaultLoaded(s, t);
      if (d) setLoaded(d);
    }
  };
  const atlasUnlocked = stationLevel(s, 'map_device') >= MAP_DEVICE_ATLAS_LEVEL;
  const tabs: { id: DeviceTab; label: string; count: ReactNode }[] = [
    { id: 'maps', label: 'Maps', count: fmt(totalHeld) },
    { id: 'doomed', label: 'Doomed', count: fmt(totalDoomed) },
    { id: 'bosses', label: 'Bosses', count: fmt(totalKeys) },
    { id: 'atlas', label: 'Atlas', count: atlasUnlocked ? `${earned}/${ATLAS_POINT_CAP}` : <Badge tone="locked">Lv 2</Badge> },
  ];

  return (
    <div className="page md-page">
      <PageHeader title="Map Device" actions={MAPS_PREVIEW.enabled ? <Badge tone="neutral">Dev preview</Badge> : undefined}>
        Load a map into the device and open a portal. Maps are shared across your realm. Each run borrows a campaign area’s visuals, monsters and boss mechanics at random, and adds its tier’s permanent danger and reward identity.
      </PageHeader>

      {tab !== 'atlas' && <DeviceStage loaded={loaded} picked={picked} onOpened={() => setPicked(false)} go={go} />}

      <div className="md-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`md-tab ${tab === t.id ? 'active' : ''}`} onClick={() => pickTab(t.id)}>
            {t.label} <span className="dim num">{t.count}</span>
            {t.id === 'atlas' && left > 0 && <Badge tone="success">+{left}</Badge>}
          </button>
        ))}
      </div>

      {tab === 'maps' && (
        <>
          {totalHeld <= 0 && !run && (
            <div className="card">
              <EmptyState icon={<GameIcon name="map" size={32} color="var(--dim)" />} title="No maps held">
                Tier 1 maps drop in level {MAP_DROPS.campaignMinLevel}+ campaign areas, can be drawn with Cartography, and the Last King tops your realm up to {MAP_DROPS.kingTopUp} maps when beaten.
              </EmptyState>
            </div>
          )}
          <TierCards loaded={loaded} onLoad={load} />
          <div className="md-section-head">
            <h3>Unique Maps</h3>
            <span className="dim small">Dropped by Tier 5+ Map Bosses</span>
          </div>
          <UniqueCards loaded={loaded} onLoad={load} />
          <MapSafetyPanel isDoomed={false} />
        </>
      )}

      {tab === 'doomed' && <DoomedPanel loaded={loaded} onLoad={load} />}
      {tab === 'bosses' && <BossesPanel loaded={loaded} onLoad={load} />}
      {tab === 'atlas' && <AtlasPanel />}

      <div className="md-totals">
        <span>
          <b className="num">{tally.runs}</b> runs
        </span>
        {tally.runs > 0 && (
          <span>
            <b className="num">{fmtTime(tally.clearMs / tally.runs)}</b> average
          </span>
        )}
        <span>
          <b className="num">{tally.mapsFound}</b> maps found
        </span>
        <span>
          <b className="num">{tally.favoured}</b> special drops
        </span>
        <span className="dim small md-totals-note">
          {bossesOffline(s) ? 'Wind-up rules on: map bosses whose mechanics your rules answer are fought offline.' : 'No wind-up rules: offline auto-run stops at the first map boss, which waits for you.'}
        </span>
      </div>

      {MAPS_PREVIEW.enabled && (
        <div className="card">
          <b>Dev tools</b>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button className="btn sm" onClick={() => game.act((st) => grantMaps(st, 5))}>
              Grant 5 of each tier
            </button>
            <button
              className="btn sm"
              onClick={() =>
                game.act((st) => {
                  for (const sex of SEXTANTS) addBank(st, sex.id, 5);
                  for (const d of DOOMED_TIERS) addDoomedMaps(st, d.tier, 2);
                  for (const u of UNIQUE_MAPS) addUniqueMaps(st, u.id, 1);
                })
              }
            >
              Grant Sextants & Doomed Maps
            </button>
            <button className="btn sm" onClick={() => game.act((st) => grantBossKeys(st, 2))}>
              Grant Boss & Uber Keys
            </button>
            <button className="btn sm" onClick={() => game.act((st, ctx) => devKit(st, ctx, MAP_TIERS[0].level + DEV_KIT_LEVELS))}>
              Level {MAP_TIERS[0].level + DEV_KIT_LEVELS} + rare gear
            </button>
            <button className="btn sm" onClick={() => game.act((st) => devToggleWindups(st))}>
              Toggle wind-up rules
            </button>
            <button className="btn sm" onClick={() => game.simulateAway(HOUR)}>
              Simulate 1 h away
            </button>
            <button className="btn sm" onClick={() => game.simulateAway(8 * HOUR)}>
              Simulate 8 h away
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Maps: endgame areas opened at the Map Device once the campaign (Act 6) is done. */
export function MapDevicePage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  if (mapsOpen(s)) return <MapDeviceContent go={go} />;
  const device = stationDef('map_device');
  const locked = stationLockReason(s, 'map_device');
  return (
    <div className="page">
      <PageHeader title="Map Device" actions={locked ? <Badge tone="locked">Locked</Badge> : undefined}>
        {device.desc}
      </PageHeader>
      <div className="card md-stage sealed">
        <div className="md-stage-device">
          <DeviceRing loaded={null} state="idle" slot={null} onSlot={() => undefined} />
        </div>
        <div className="md-stage-info">
          <EmptyState icon={<GameIcon name="lock" size={32} color="var(--dim)" />} title="Maps are sealed">
            Maps come after the campaign: the Map Device wakes once you beat Act {FINAL_ACT}. {!actOpen(FINAL_ACT) && `Act ${FINAL_ACT} isn't out yet.`}
          </EmptyState>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => go('campaign')}>
              Back to the Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
