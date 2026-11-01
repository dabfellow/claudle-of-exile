import { stationDef } from '../../data/hideout';
import { MAP_THEMES, MAP_TIERS, mapZoneId } from '../../data/maps';
import { actOpen, zoneDef } from '../../data/zones';
import { bossesOffline } from '../../engine/automation';
import { retreat } from '../../engine/combat';
import { FINAL_ACT, stationLockReason } from '../../engine/hideout';
import { devKit, devToggleWindups, grantMaps, mapsHeld, mapsOpen, MAPS_PREVIEW, startAutoRun, startMap, stopAutoRun } from '../../engine/maps';
import { game, useGame } from '../../game';
import { Badge, EmptyState, fmtTime, GameIcon, PageHeader } from '../components/common';
import type { Page } from '../Layout';

const HOUR = 60 * 60 * 1000;
/** the test kit sits this far above a tier: it has no passives spent, so it needs the margin */
const DEV_KIT_LEVELS = 14;

/** The dev-only Maps preview: one card per map, the run under way, running totals and test tools. */
function MapPreview({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const { run, auto, tally } = s.maps;
  return (
    <div className="page">
      <PageHeader title="Map Device" actions={MAPS_PREVIEW.enabled ? <Badge tone="neutral">Dev preview</Badge> : undefined}>
        Maps are used up per run: a set number of packs, then a map boss. Auto-run keeps opening one kind until none are left.
      </PageHeader>
      {run && (
        <div className="card">
          <b>{zoneDef(run.zoneId).name}</b> <span className="muted">· {run.packsLeft}/{run.packsTotal} packs left{auto ? ' · auto-run on' : ''}</span>
          <div className="row">
            <button className="btn primary" onClick={() => go('combat')}>Watch the fight</button>
            {auto && <button className="btn" onClick={() => game.act((st) => stopAutoRun(st))}>Stop after this run</button>}
            <button className="btn danger" onClick={() => game.act((st) => retreat(st))}>Abandon (map lost)</button>
          </div>
        </div>
      )}
      {MAP_TIERS.flatMap((tier) =>
        MAP_THEMES.map((theme) => {
          const held = mapsHeld(s, tier.tier, theme.id);
          const zone = zoneDef(mapZoneId(tier.tier, theme.id));
          return (
            <div className="card" key={zone.id}>
              <b>{theme.name}</b> <span className="muted">· Tier {tier.tier} · level {tier.level} · {tier.packs} packs, then {zone.boss.name}</span>
              <p className="dim">{theme.desc}</p>
              <p>Favours <b>{theme.favours}</b> · Held: <b className="num">{held}</b></p>
              <div className="row">
                <button className="btn primary" disabled={!!run || held <= 0} onClick={() => game.act((st, ctx) => startMap(st, ctx, tier.tier, theme.id))}>Open map</button>
                <button className="btn" disabled={auto?.theme === theme.id || (run ? run.theme !== theme.id : held <= 0)} onClick={() => game.act((st, ctx) => startAutoRun(st, ctx, tier.tier, theme.id))}>Auto-run</button>
              </div>
            </div>
          );
        }),
      )}
      <div className="card">
        <b>Totals</b>
        <p>{tally.runs} runs{tally.runs ? ` · ${fmtTime(tally.clearMs / tally.runs)} average` : ''} · {tally.mapsFound} maps found · {tally.favoured} favoured drops</p>
        <p className="dim">{bossesOffline(s) ? 'Wind-up rules on: map bosses are fought offline.' : 'No wind-up rules: offline auto-run stops at the first map boss, which waits for you.'}</p>
      </div>
      {MAPS_PREVIEW.enabled && (
        <div className="card">
          <b>Dev tools</b>
          <div className="row">
            <button className="btn" onClick={() => game.act((st) => grantMaps(st, 5))}>Grant 5 of each</button>
            <button className="btn" onClick={() => game.act((st, ctx) => devKit(st, ctx, MAP_TIERS[0].level + DEV_KIT_LEVELS))}>Level {MAP_TIERS[0].level + DEV_KIT_LEVELS} + rare gear</button>
            <button className="btn" onClick={() => game.act((st) => devToggleWindups(st))}>Toggle wind-up rules</button>
            <button className="btn" onClick={() => game.simulateAway(HOUR)}>Simulate 1 h away</button>
            <button className="btn" onClick={() => game.simulateAway(8 * HOUR)}>Simulate 8 h away</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Maps: endgame areas opened at the Map Device once the campaign (Act 6) is done. The preview page is all that's built so far, and it's what the campaign opens. */
export function MapDevicePage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  if (mapsOpen(s)) return <MapPreview go={go} />;
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
