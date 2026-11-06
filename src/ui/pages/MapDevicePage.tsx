import { useState } from 'react';
import { stationDef } from '../../data/hideout';
import {
  ATLAS_NODES,
  DOOMED_MODS,
  DOOMED_TIERS,
  doomedTier,
  MAP_DROPS,
  MAP_TIERS,
  mapTier,
  SEXTANTS,
  sextantDef,
  sextantMod,
  type AtlasWing,
} from '../../data/maps';
import { actOpen, zoneDef } from '../../data/zones';
import { bossesOffline } from '../../engine/automation';
import { addBank } from '../../engine/bank';
import { retreat } from '../../engine/combat';
import { FINAL_ACT, stationLevel, stationLockReason } from '../../engine/hideout';
import {
  addDoomedMaps,
  allocateAtlasNode,
  applySextant,
  atlasBonuses,
  atlasPointsEarned,
  atlasPointsLeft,
  canAllocateAtlasNode,
  devKit,
  devToggleWindups,
  doomedHeld,
  ensureAtlas,
  ensureSextants,
  grantMaps,
  hasAtlasNode,
  mapsHeld,
  mapsOpen,
  MAPS_PREVIEW,
  refundAtlas,
  sextantSlots,
  startAutoRun,
  startDoomedMap,
  startMap,
  stopAutoRun,
  totalMapsHeld,
} from '../../engine/maps';
import { game, useGame } from '../../game';
import { Badge, EmptyState, fmt, fmtTime, GameIcon, MatIcon, PageHeader } from '../components/common';
import type { Page } from '../Layout';

const HOUR = 60 * 60 * 1000;
/** the test kit sits this far above a tier: it has no passives spent, so it needs the margin */
const DEV_KIT_LEVELS = 14;

type DeviceTab = 'maps' | 'doomed' | 'atlas';

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
  const tDef = run.doomedTier ? null : mapTier(run.tier);
  const dDef = run.doomedTier ? doomedTier(run.doomedTier) : null;
  const activeSextants = (run.sextantMods ?? []).map((id) => sextantMod(id));
  const activeDoomed = (run.doomedMods ?? []).map((id) => DOOMED_MODS.find((m) => m.id === id)).filter(Boolean);

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <b>{zone.name}</b>
        <Badge tone={dDef ? 'warn' : 'neutral'}>{dDef ? dDef.name : `Tier ${run.tier} · ${tDef?.modName}`}</Badge>
        <span className="muted num">
          · {run.packsLeft}/{run.packsTotal} packs left{auto ? ' · auto-run on' : ''}
        </span>
      </div>
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

  return (
    <>
      <div className="card">
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <b>Atlas of the Realm</b> · <span className="num">{left}</span> point{left === 1 ? '' : 's'} available (<span className="num">{earned}</span> / 30 earned)
          </div>
          {atlas.nodes.length > 0 && (
            <button className="btn sm" onClick={() => game.act((st) => refundAtlas(st))}>
              Respec Atlas (Free)
            </button>
          )}
        </div>
        <p className="dim small" style={{ marginBottom: 4 }}>
          Each Map Tier 1–10 awards up to 3 Atlas points across your realm: <b>+1</b> for first clear ({atlas.cleared.length}/10), <b>+1</b> for clearing with all unlocked Sextant slots filled ({atlas.slotted.length}/10), and <b>+1</b> for a deathless clear ({atlas.deathless.length}/10).
        </p>
      </div>
      {(['sustain', 'bounty', 'surveying', 'peril'] as AtlasWing[]).map((wing) => {
        const nodes = ATLAS_NODES.filter((n) => n.wing === wing);
        const info = WING_TITLES[wing];
        return (
          <div className="card" key={wing}>
            <div className="card-title">
              {info.title}
              <span className="grow" />
              <span className="card-hint">{info.subtitle}</span>
            </div>
            <div className="action-grid">
              {nodes.map((node) => {
                const allocated = atlas.nodes.includes(node.id);
                const blocker = canAllocateAtlasNode(s, node.id);
                return (
                  <div key={node.id} className={`card ${allocated ? 'running' : ''}`} style={{ margin: 0 }}>
                    <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <b>{node.name}</b>
                      {node.keystone ? (
                        <Badge tone="warn">Keystone</Badge>
                      ) : node.notable ? (
                        <Badge tone="neutral">Notable</Badge>
                      ) : null}
                    </div>
                    <p className="dim small" style={{ margin: '6px 0' }}>
                      {node.desc}
                    </p>
                    <div className="row">
                      {allocated ? (
                        <Badge tone="success">Allocated</Badge>
                      ) : (
                        <button
                          className="btn sm primary"
                          disabled={!!blocker}
                          title={blocker ?? ''}
                          onClick={() => game.act((st) => allocateAtlasNode(st, node.id))}
                        >
                          {blocker ?? 'Allocate'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

function DoomedPanel() {
  const s = useGame();
  const { run } = s.maps;
  const unlocked = hasAtlasNode(s, 'atlas_doomed');

  return (
    <>
      <div className="callout skill-note">
        <b>Doomed Maps (I–V)</b> roll 2–4 dangerous realm modifiers at once, drop currency at 3.5× Tier 10 Exalted and Divine rates, can drop <b>Fractured Orbs</b>, and their bosses can drop <b>Uber Boss Keys</b>.{' '}
        {!unlocked && 'Allocate the Doomed Horizon keystone on the Atlas Tree (20 Atlas points earned) so Tier 8–10 map bosses can drop Doomed Maps.'}
      </div>
      <div className="action-grid">
        {DOOMED_TIERS.map((d) => {
          const held = doomedHeld(s, d.tier);
          const modsText = d.modCount[0] === d.modCount[1] ? `${d.modCount[0]} modifiers` : `${d.modCount[0]}–${d.modCount[1]} modifiers`;
          return (
            <div className="card" key={d.tier} style={{ margin: 0 }}>
              <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <b>{d.name}</b>
                <Badge tone={held > 0 ? 'warn' : 'neutral'}>Held: {fmt(held)}</Badge>
              </div>
              <p className="dim small" style={{ margin: '6px 0' }}>
                Monster level {d.level} · {d.packs} packs · Rolls {modsText} · {Math.round(d.keyChance * 100)}% Uber Key chance on boss kill
              </p>
              <div className="row">
                <button
                  className="btn sm primary"
                  disabled={!!run || held <= 0}
                  onClick={() => game.act((st, ctx) => startDoomedMap(st, ctx, d.tier))}
                >
                  Open {d.name}
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
        <button className={`gem-chip ${tab === 'atlas' ? 'active' : ''}`} onClick={() => setTab('atlas')}>
          Atlas Tree <span className="dim num">{earned}/30</span>
          {left > 0 && <Badge tone="success">+{left}</Badge>}
        </button>
      </div>

      {tab === 'maps' && (
        <>
          <SextantPanel />
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
        </>
      )}

      {tab === 'doomed' && <DoomedPanel />}
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
                })
              }
            >
              Grant Sextants & Doomed Maps
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
