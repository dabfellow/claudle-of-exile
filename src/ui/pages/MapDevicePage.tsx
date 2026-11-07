import { useEffect, useRef, useState } from 'react';
import { uniqueDef } from '../../data/bases';
import { stationDef } from '../../data/hideout';
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
import { game, useGame } from '../../game';
import { Badge, EmptyState, fmt, fmtTime, GameIcon, MatIcon, PageHeader } from '../components/common';
import type { Page } from '../Layout';

const HOUR = 60 * 60 * 1000;
/** the test kit sits this far above a tier: it has no passives spent, so it needs the margin */
const DEV_KIT_LEVELS = 14;

type DeviceTab = 'maps' | 'doomed' | 'bosses' | 'atlas';

const WING_TITLES: Record<AtlasWing, { title: string; subtitle: string }> = {
  sustain: { title: 'Sustain', subtitle: 'Map drop chance, tier-up odds, and bonus boss map drops' },
  bounty: { title: 'Bounty', subtitle: 'Currency drop rates, Item Rarity, and extra boss spoils' },
  surveying: { title: 'Surveying', subtitle: 'Sextant run charges, reward effect, and the 4th Sextant slot' },
  peril: { title: 'Peril', subtitle: 'Higher monster danger for greater yield, Unbroken Path, and Doomed Horizon' },
};

function ActiveRunCard({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const { run, auto } = s.maps;
  if (!run) return null;
  const zone = zoneDef(run.zoneId);
  const uDef = run.uniqueMapId ? uniqueMapDef(run.uniqueMapId) : null;
  const tDef = run.doomedTier || uDef ? null : mapTier(run.tier);
  const dDef = run.doomedTier ? doomedTier(run.doomedTier) : null;
  const activeSextants = (run.sextantMods ?? []).map((id) => sextantMod(id));
  const activeDoomed = (run.doomedMods ?? []).map((id) => DOOMED_MODS.find((m) => m.id === id)).filter(Boolean);
  const activeNormal = (run.normalMods ?? []).map((id) => normalMapModDef(id)).filter(Boolean);

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <b>{zone.name}</b>
        <Badge tone={dDef || uDef ? 'warn' : 'neutral'}>
          {uDef ? `Unique Map · Tier ${uDef.tier}` : dDef ? dDef.name : `Tier ${run.tier} · ${tDef?.modName}`}
        </Badge>
        <span className="muted num">
          · {run.packsLeft}/{run.packsTotal} packs left{auto ? ' · auto-run on' : ''}
        </span>
      </div>
      {uDef && <p className="dim small">{uDef.desc} · {uDef.rewardSummary}</p>}
      {tDef && tDef.mod !== 'none' && <p className="dim small">{tDef.modDesc}</p>}
      {activeSextants.length > 0 && (
        <p className="small">
          <b>Sextants:</b> {activeSextants.map((m) => `${m.name} (${m.desc})`).join(' · ')}
        </p>
      )}
      {activeDoomed.length > 0 && (
        <p className="small">
          <b>Doomed modifiers:</b> {activeDoomed.map((m) => `${m!.name} (${m!.desc})`).join(' · ')}
        </p>
      )}
      {activeNormal.length > 0 && (
        <p className="small">
          <b>Rolled map modifiers:</b> {activeNormal.map((m) => `${m!.name} (${m!.desc})`).join(' · ')}
        </p>
      )}
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <button className="btn primary" onClick={() => go('combat')}>
          Watch the fight
        </button>
        {auto && (
          <button className="btn" onClick={() => game.act((st) => stopAutoRun(st))}>
            Stop after this run
          </button>
        )}
        <button className="btn danger" onClick={() => game.act((st) => retreat(st))}>
          Abandon (map lost)
        </button>
      </div>
    </div>
  );
}

function SextantPanel() {
  const s = useGame();
  const slots = sextantSlots(s);
  const sextants = ensureSextants(s);
  const devLvl = stationLevel(s, 'map_device');

  return (
    <div className="card">
      <div className="card-title">
        Sextant Astrolabe
        <span className="grow" />
        <span className="card-hint">
          {slots}/4 slots open (Map Device Lv {devLvl}
          {hasAtlasNode(s, 'survey_notable') ? ' + Fourth Astrolabe' : ''})
        </span>
      </div>
      <p className="dim small" style={{ marginTop: 0 }}>
        Roll a Sextant onto a slot to add a modifier for {6 + atlasBonuses(s).sextantCharges} map runs. Each eligible map run consumes 1 charge from active slots.
      </p>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        {SEXTANTS.map((sex) => (
          <span key={sex.id} className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <MatIcon id={sex.id} size={14} />
            <span>{sex.name}:</span>
            <b className="num">{fmt(s.account.bank[sex.id] ?? 0)}</b>
            <span className="dim">(T{sex.minMapTier}+)</span>
          </span>
        ))}
      </div>
      <div className="action-grid">
        {[0, 1, 2, 3].map((idx) => {
          const unlocked = idx < slots;
          const slot = sextants[idx];
          const mod = slot ? sextantMod(slot.modId) : null;
          const sDef = slot ? sextantDef(slot.tier) : null;
          return (
            <div key={idx} className={`card ${unlocked ? '' : 'locked'}`} style={{ margin: 0 }}>
              <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <b>Slot {idx + 1}</b>
                {!unlocked ? (
                  <Badge tone="locked">{idx === 3 ? 'Atlas: Fourth Astrolabe' : idx === 2 ? 'Map Device Lv 4' : 'Map Device Lv 2'}</Badge>
                ) : mod && slot ? (
                  <Badge tone="success">{slot.charges} runs left</Badge>
                ) : (
                  <Badge tone="neutral">Empty</Badge>
                )}
              </div>
              {unlocked && (
                <>
                  {mod && sDef ? (
                    <div style={{ margin: '6px 0' }}>
                      <div>
                        <b>{mod.name}</b> <span className="dim small">({sDef.name} · Tier {mod.minMapTier}+)</span>
                      </div>
                      <div className="dim small">{mod.desc}</div>
                    </div>
                  ) : (
                    <p className="dim small" style={{ margin: '6px 0' }}>
                      No Sextant modifier active in this slot.
                    </p>
                  )}
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {SEXTANTS.map((sex) => {
                      const have = s.account.bank[sex.id] ?? 0;
                      return (
                        <button
                          key={sex.id}
                          className="btn sm"
                          disabled={have <= 0}
                          title={sex.desc}
                          onClick={() => game.act((st, ctx) => applySextant(st, ctx, idx, sex.id))}
                        >
                          Roll {sex.tier[0].toUpperCase() + sex.tier.slice(1)} ({have})
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AtlasPanel() {
  const s = useGame();
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
        <p className="dim small" style={{ marginBottom: 4 }}>
          Each Map Tier 1–10 awards up to 3 Atlas points across your realm: <b>+1</b> for first clear ({atlas.cleared.length}/10), <b>+1</b> for clearing with all unlocked Sextant slots filled ({atlas.slotted.length}/10), and <b>+1</b> for a deathless clear ({atlas.deathless.length}/10). Choose a connected route from any of the four central starting nodes.
        </p>
        <p className="dim small" style={{ margin: '4px 0' }}>
          Endgame first clears award the other 40 points: <b>+{ATLAS_DOOMED_CLEAR_POINTS}</b> per Doomed tier ({atlas.doomedCleared?.length ?? 0}/5), <b>+{ATLAS_HARD_BOSS_CLEAR_POINTS}</b> per Hard Boss ({atlas.hardBossesCleared?.length ?? 0}/5), and <b>+{ATLAS_UBER_BOSS_CLEAR_POINTS}</b> per Uber Boss ({atlas.uberBossesCleared?.length ?? 0}/3).
        </p>
      </div>
      <div className="atlas-layout">
        <div ref={treeViewport} className="atlas-tree-viewport" aria-label="Atlas skill tree">
          <div className="atlas-tree-canvas">
            <svg className="atlas-connections" viewBox="0 0 1280 1280" aria-hidden="true">
              {ATLAS_NODES.filter((node) => !node.requires?.length).map((node) => (
                <line key={`root-${node.id}`} x1="640" y1="640" x2={node.x} y2={node.y} className={atlas.nodes.includes(node.id) ? 'allocated' : 'open'} />
              ))}
              {ATLAS_NODES.flatMap((node) => (node.requires ?? []).map((requiredId) => {
                const required = ATLAS_NODES.find((candidate) => candidate.id === requiredId);
                if (!required) return null;
                const allocated = atlas.nodes.includes(node.id) && atlas.nodes.includes(requiredId);
                const open = atlas.nodes.includes(requiredId) && !atlas.nodes.includes(node.id);
                return <line key={`${requiredId}-${node.id}`} x1={required.x} y1={required.y} x2={node.x} y2={node.y} className={allocated ? 'allocated' : open ? 'open' : ''} />;
              }))}
            </svg>
            <div className="atlas-core" aria-hidden="true"><span>ATLAS</span></div>
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
            <button
              className="btn sm"
              disabled={!!refundDependent}
              title={refundDependent ? `Required by ${refundDependent.name}` : 'Refund this Atlas point'}
              onClick={() => game.act((st) => refundAtlas(st, selected.id))}
            >
              {refundDependent ? `Required by ${refundDependent.name}` : 'Refund Point'}
            </button>
          ) : (
            <button
              className="btn sm primary"
              disabled={!!selectedBlocker}
              title={selectedBlocker ?? 'Spend 1 Atlas point'}
              onClick={() => game.act((st) => allocateAtlasNode(st, selected.id))}
            >
              {selectedBlocker ?? 'Allocate Point'}
            </button>
          )}
        </aside>
      </div>
    </>
  );
}

function MapSafetyPanel({ isDoomed }: { isDoomed: boolean }) {
  const s = useGame();
  const cfg = ensureMapSettings(s);
  const chaos = s.account.bank.chaos ?? 0;
  const mods = isDoomed ? DOOMED_MODS : NORMAL_MAP_MODS;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-title">
        {isDoomed ? 'Doomed Modifier Safety & Auto-Roll' : 'Map Modifiers & Auto-Roll Safety'}
        <span className="grow" />
        <span className="card-hint">
          <MatIcon id="chaos" size={14} /> <b className="num">{fmt(chaos)}</b> Chaos Orbs in stash
        </span>
      </div>
      <p className="dim small" style={{ marginTop: 0 }}>
        Blacklist deadly modifiers you wish to avoid. When an avoided modifier rolls on entry or during auto-run, the Map Device automatically spends 1 Chaos Orb to reroll the map (up to 5 attempts per run).
      </p>

      {!isDoomed && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!cfg.rollNormalMaps}
              onChange={() => game.act((st) => toggleRollNormalMaps(st))}
            />
            <span>
              <b>Roll Random Affixes on Normal Maps</b>{' '}
              <span className="dim small">(Adds 2–3 dangerous modifiers for extra packs, currency and item rarity)</span>
            </span>
          </label>
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={cfg.autoRerollChaos}
            onChange={() => game.act((st) => toggleAutoRerollChaos(st))}
          />
          <span>
            <b>Auto-Reroll with Chaos Orbs if an avoided modifier rolls</b>{' '}
            <span className="dim small">(Spends 1 Chaos Orb per reroll attempt)</span>
          </span>
        </label>
      </div>

      <div style={{ marginTop: 8 }}>
        <div className="small dim" style={{ marginBottom: 6 }}>
          <b>Avoided modifiers (click to toggle blacklist):</b>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {mods.map((m) => {
            const blocked = cfg.blockedMods.includes(m.id);
            return (
              <button
                key={m.id}
                className={`gem-chip sm ${blocked ? 'active' : ''}`}
                style={{
                  borderColor: blocked ? 'var(--danger, #e0584f)' : undefined,
                  background: blocked ? 'rgba(224, 88, 79, 0.15)' : undefined,
                  color: blocked ? '#ff8077' : undefined,
                }}
                title={m.desc}
                onClick={() => game.act((st) => toggleBlockedMod(st, m.id))}
              >
                {blocked ? '✕ Avoid: ' : '+ Allow: '} {m.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DoomedPanel() {
  const s = useGame();
  const { run, auto } = s.maps;
  const atlas = ensureAtlas(s);
  const unlocked = hasAtlasNode(s, 'atlas_doomed');

  return (
    <>
      <div className="callout skill-note">
        <b>Doomed Maps (I–V)</b> roll 2–4 dangerous realm modifiers at once, scale up to 100 monster packs, drop currency at 3.5× Tier 10 Exalted and Divine rates, can drop <b>Fractured Orbs</b>, and their bosses can drop <b>Uber Boss Keys</b>.{' '}
        {!unlocked && 'Allocate the Doomed Horizon keystone on the Atlas Tree (20 Atlas points earned) so Tier 8–10 map bosses can drop Doomed Maps.'}
      </div>

      <MapSafetyPanel isDoomed={true} />

      <div className="action-grid">
        {DOOMED_TIERS.map((d) => {
          const held = doomedHeld(s, d.tier);
          const isRunning = run && !!run.doomedTier && run.doomedTier === d.tier;
          const isAuto = auto?.tier === d.tier && !!auto?.doomed;
          const modsText = d.modCount[0] === d.modCount[1] ? `${d.modCount[0]} modifiers` : `${d.modCount[0]}–${d.modCount[1]} modifiers`;
          return (
            <div className={`card ${isRunning ? 'running' : ''}`} key={d.tier} style={{ margin: 0 }}>
              <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <b>{d.name}</b>
                <Badge tone={held > 0 ? 'warn' : 'neutral'}>Held: {fmt(held)}</Badge>
              </div>
              <p className="dim small" style={{ margin: '6px 0' }}>
                Monster level {d.level} · {d.packs} packs · Rolls {modsText} · {Math.round(d.keyChance * 100)}% Uber Key chance · {atlas.doomedCleared?.includes(d.tier) ? 'Atlas reward claimed' : `+${ATLAS_DOOMED_CLEAR_POINTS} Atlas points on first clear`}
              </p>
              <div className="row" style={{ gap: 6 }}>
                <button
                  className="btn sm primary"
                  disabled={!!run || held <= 0}
                  onClick={() => game.act((st, ctx) => startDoomedMap(st, ctx, d.tier))}
                >
                  Open {d.name}
                </button>
                <button
                  className="btn sm"
                  disabled={isAuto || (run ? run.doomedTier !== d.tier : held <= 0)}
                  onClick={() => game.act((st, ctx) => startDoomedAutoRun(st, ctx, d.tier))}
                >
                  Auto-run
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function BossesPanel({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const atlas = ensureAtlas(s);
  const inKeyedArena = s.combat && isKeyedBossZone(s.combat.zoneId);

  return (
    <>
      {inKeyedArena && (
        <div className="card">
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <b>{zoneDef(s.combat!.zoneId).name}</b> · <Badge tone="warn">Keyed Arena Active</Badge>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn primary sm" onClick={() => go('combat')}>
                Watch the fight
              </button>
              <button className="btn danger sm" onClick={() => game.act((st) => retreat(st))}>
                Abandon (key lost)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="callout skill-note">
        <b>Hard Mode Bosses (Lv 72–86)</b> are opened with keys dropped by Map bosses (boosted by the <b>Boss Key Hunt</b> Sextant) or crafted with life skills. Each kill guarantees its boss trophy material and drops its exclusive unique on first clear (35% on repeat kills). Combine all four keys or trophies at Smithing Lv 85 to challenge <b>The Crownless</b>.
      </div>
      <div className="action-grid" style={{ marginBottom: 16 }}>
        {HARD_BOSSES.map((hb) => {
          const uniq = uniqueDef(hb.uniqueId);
          const held = s.account.bank[hb.keyId] ?? 0;
          const defeated = s.bossesDefeated.includes(hb.zoneId);
          const blocker = canStartHardBoss(s, hb.id);
          return (
            <div className="card" key={hb.id} style={{ margin: 0 }}>
              <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <b>
                  {hb.name} <span className="muted">· Lv {hb.level}</span>
                </b>
                <Badge tone={held > 0 ? 'neutral' : 'locked'}>
                  <MatIcon id={hb.keyId} size={13} /> {hb.keyName}: {fmt(held)}
                </Badge>
              </div>
              <div className="small dim" style={{ marginTop: 2 }}>
                {hb.arenaName} · {defeated ? <span className="good">✓ Defeated</span> : '○ Undefeated (Guaranteed Unique)'}
              </div>
              <p className="small" style={{ margin: '6px 0' }}>
                {hb.mechanicSummary}
              </p>
              <p className="dim small" style={{ margin: '4px 0' }}>
                <b>Rule & Aim Hint:</b> {hb.ruleHint}
              </p>
              <p className="dim small" style={{ margin: '4px 0 8px' }}>
                <b>Spoils:</b> <MatIcon id={hb.trophyId} size={12} /> {hb.trophyName} (100%) · <b>{uniq.name}</b> ({defeated ? '35%' : '100% first kill'}) · {atlas.hardBossesCleared?.includes(hb.id) ? 'Atlas reward claimed' : `+${ATLAS_HARD_BOSS_CLEAR_POINTS} Atlas points`}
              </p>
              <div className="row">
                <button
                  className="btn sm primary"
                  disabled={!!blocker}
                  title={blocker ?? `Consume 1 ${hb.keyName} to open ${hb.arenaName}`}
                  onClick={() =>
                    game.act((st, ctx) => {
                      if (!startHardBoss(st, ctx, hb.id)) go('combat');
                    })
                  }
                >
                  Open {hb.arenaName}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="callout skill-note">
        <b>Uber Bosses (Lv 91–97)</b> are the realm’s pinnacle encounters, opened with Uber Keys dropped by <b>Doomed Map I–V</b> bosses. Each kill guarantees its exclusive <b>Doom Sigil</b> and drops its build-defining unique on first clear (35% on repeat kills).
      </div>
      <div className="action-grid">
        {UBER_BOSSES.map((ub) => {
          const uniqs = ub.uniques.map((id) => uniqueDef(id));
          const held = s.account.bank[ub.keyId] ?? 0;
          const defeated = s.bossesDefeated.includes(ub.zoneId);
          const blocker = canStartUberBoss(s, ub.tier);
          return (
            <div className="card" key={ub.zoneId} style={{ margin: 0 }}>
              <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <b>
                  {ub.name} <span className="muted">· Lv {ub.level}</span>
                </b>
                <Badge tone={held > 0 ? 'warn' : 'locked'}>
                  <MatIcon id={ub.keyId} size={13} /> {ub.keyName}: {fmt(held)}
                </Badge>
              </div>
              <div className="small dim" style={{ marginTop: 2 }}>
                {ub.arenaName} · {defeated ? <span className="good">✓ Defeated</span> : '○ Undefeated (Guaranteed Unique)'}
              </div>
              <p className="small" style={{ margin: '6px 0' }}>
                {ub.mechanicSummary}
              </p>
              <p className="dim small" style={{ margin: '4px 0 8px' }}>
                <b>Spoils:</b> <MatIcon id={ub.sigilId} size={12} /> {ub.sigilName} (100%) ·{' '}
                {uniqs.map((u) => u.name).join(' / ')} ({defeated ? '35%' : '100% first kill'}) · {atlas.uberBossesCleared?.includes(ub.zoneId) ? 'Atlas reward claimed' : `+${ATLAS_UBER_BOSS_CLEAR_POINTS} Atlas points`}
              </p>
              <div className="row">
                <button
                  className="btn sm primary"
                  disabled={!!blocker}
                  title={blocker ?? `Consume 1 ${ub.keyName} to open ${ub.arenaName}`}
                  onClick={() =>
                    game.act((st, ctx) => {
                      if (!startUberBoss(st, ctx, ub.tier)) go('combat');
                    })
                  }
                >
                  Open {ub.arenaName}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function MapDeviceContent({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const [tab, setTab] = useState<DeviceTab>('maps');
  const { run, auto, tally } = s.maps;
  const atlas = ensureAtlas(s);
  const earned = atlasPointsEarned(s);
  const left = atlasPointsLeft(s);
  const totalHeld = totalMapsHeld(s);
  const totalDoomed = DOOMED_TIERS.reduce((sum, d) => sum + doomedHeld(s, d.tier), 0);
  const totalKeys =
    HARD_BOSSES.reduce((sum, hb) => sum + (s.account.bank[hb.keyId] ?? 0), 0) +
    UBER_BOSSES.reduce((sum, ub) => sum + (s.account.bank[ub.keyId] ?? 0), 0);

  return (
    <div className="page">
      <PageHeader title="Map Device" actions={MAPS_PREVIEW.enabled ? <Badge tone="neutral">Dev preview</Badge> : undefined}>
        Maps are shared across your realm. Each run borrows a campaign area’s visuals, monsters and boss mechanics at random, and adds its tier’s permanent danger and reward identity.
      </PageHeader>

      <ActiveRunCard go={go} />

      <div className="smith-tabs" style={{ marginBottom: 12 }}>
        <button className={`gem-chip ${tab === 'maps' ? 'active' : ''}`} onClick={() => setTab('maps')}>
          Map Tiers (T1–T10) <span className="dim num">{fmt(totalHeld)}</span>
        </button>
        <button className={`gem-chip ${tab === 'doomed' ? 'active' : ''}`} onClick={() => setTab('doomed')}>
          Doomed Maps (I–V) <span className="dim num">{fmt(totalDoomed)}</span>
        </button>
        <button className={`gem-chip ${tab === 'bosses' ? 'active' : ''}`} onClick={() => setTab('bosses')}>
          Bosses & Ubers <span className="dim num">{fmt(totalKeys)}</span>
        </button>
        <button className={`gem-chip ${tab === 'atlas' ? 'active' : ''}`} onClick={() => setTab('atlas')}>
          Atlas Tree <span className="dim num">{earned}/{ATLAS_POINT_CAP}</span>
          {left > 0 && <Badge tone="success">+{left}</Badge>}
        </button>
      </div>

      {tab === 'maps' && (
        <>
          <SextantPanel />
          <MapSafetyPanel isDoomed={false} />
          {totalHeld <= 0 && !run && (
            <div className="card">
              <EmptyState icon={<GameIcon name="map" size={32} color="var(--dim)" />} title="No maps held">
                Tier 1 maps drop in level {MAP_DROPS.campaignMinLevel}+ campaign areas, can be drawn with Cartography, and the Last King tops your realm up to {MAP_DROPS.kingTopUp} maps when beaten.
              </EmptyState>
            </div>
          )}
          <div className="action-grid">
            {MAP_TIERS.map((tier) => {
              const held = mapsHeld(s, tier.tier);
              const cleared = atlas.cleared.includes(tier.tier);
              const slotted = atlas.slotted.includes(tier.tier);
              const deathless = atlas.deathless.includes(tier.tier);
              const isRunning = run && !run.doomedTier && run.tier === tier.tier;
              const isAuto = auto?.tier === tier.tier;
              return (
                <div className={`card ${isRunning ? 'running' : ''}`} key={tier.tier} style={{ margin: 0 }}>
                  <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <b>
                      Map Tier {tier.tier} <span className="muted">· Lv {tier.level}</span>
                    </b>
                    <Badge tone={held > 0 ? 'neutral' : 'locked'}>Held: {fmt(held)}</Badge>
                  </div>
                  <div className="small" style={{ marginTop: 4 }}>
                    <Badge tone={tier.mod === 'none' ? 'neutral' : 'warn'}>{tier.modName}</Badge>{' '}
                    <span className="dim">{tier.packs} packs · Favours {tier.rewardDesc}</span>
                  </div>
                  <p className="dim small" style={{ margin: '6px 0' }}>
                    {tier.modDesc}
                  </p>
                  <div className="row small dim" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span className={cleared ? 'good' : ''}>{cleared ? '✓' : '○'} Cleared</span>
                    <span className={slotted ? 'good' : ''}>{slotted ? '✓' : '○'} Sextant-slotted</span>
                    <span className={deathless ? 'good' : ''}>{deathless ? '✓' : '○'} Deathless</span>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button
                      className="btn sm primary"
                      disabled={!!run || held <= 0}
                      onClick={() => game.act((st, ctx) => startMap(st, ctx, tier.tier))}
                    >
                      Open map
                    </button>
                    <button
                      className="btn sm"
                      disabled={isAuto || (run ? run.tier !== tier.tier || !!run.doomedTier : held <= 0)}
                      onClick={() => game.act((st, ctx) => startAutoRun(st, ctx, tier.tier))}
                    >
                      Auto-run
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title">
              Unique Maps
              <span className="grow" />
              <span className="card-hint">Dropped by Tier 5+ Map Bosses</span>
            </div>
            <div className="action-grid">
              {UNIQUE_MAPS.map((u) => {
                const held = uniqueMapHeld(s, u.id);
                const isRunning = run?.uniqueMapId === u.id;
                return (
                  <div className={`card ${isRunning ? 'running' : ''}`} key={u.id} style={{ margin: 0 }}>
                    <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <b className="rar-unique">
                        {u.name} <span className="muted">· T{u.tier} (Lv {u.level})</span>
                      </b>
                      <Badge tone={held > 0 ? 'warn' : 'locked'}>Held: {fmt(held)}</Badge>
                    </div>
                    <p className="dim small" style={{ margin: '6px 0' }}>
                      {u.desc}
                    </p>
                    <p className="small" style={{ margin: '4px 0 8px' }}>
                      <b>Spoils:</b> {u.rewardSummary}
                    </p>
                    <p className="dim small" style={{ fontStyle: 'italic', margin: '0 0 8px' }}>
                      "{u.flavour}"
                    </p>
                    <div className="row" style={{ gap: 6 }}>
                      <button
                        className="btn sm primary"
                        disabled={!!run || held <= 0}
                        onClick={() =>
                          game.act((st, ctx) => {
                            if (!startUniqueMap(st, ctx, u.id)) go('combat');
                          })
                        }
                      >
                        Open {u.name}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {tab === 'doomed' && <DoomedPanel />}
      {tab === 'bosses' && <BossesPanel go={go} />}
      {tab === 'atlas' && <AtlasPanel />}

      <div className="card">
        <b>Totals</b>
        <p>
          {tally.runs} runs{tally.runs ? ` · ${fmtTime(tally.clearMs / tally.runs)} average` : ''} · {tally.mapsFound} maps found · {tally.favoured} special drops
        </p>
        <p className="dim">
          {bossesOffline(s)
            ? 'Wind-up rules on: map bosses whose mechanics your rules answer are fought offline.'
            : 'No wind-up rules: offline auto-run stops at the first map boss, which waits for you.'}
        </p>
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
      <div className="card">
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
  );
}
