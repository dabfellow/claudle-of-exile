import { CULTURES, cultureDef, EXPEDITION_GATE, FIND_HOURS, MAX_STANDING, SITES, STRATA, type CultureDef, type SiteDef, type WareDef } from '../../data/expedition';
import { materialDef } from '../../data/materials';
import { artifactsPerDig, buyWare, expeditionOpen, setOrder, shelvesFor, siteStratum, standing, stratumProgress, warePrice, wareLeft, wareReason } from '../../engine/expedition';
import { actionIntervalMs, skillLevel } from '../../engine/skills';
import { actionDef } from '../../data/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, fmt, fmtTime, MatIcon, ProgressBar } from './common';

/** One line of the Logbook: how deep a site is worked, what's been found, and what the next find takes. */
function SitePage({ s, site }: { s: GameState; site: SiteDef }) {
  const stratum = siteStratum(s, site);
  const { progress, digsLeft } = stratumProgress(s, site);
  const interval = actionIntervalMs(s, actionDef(site.id), deriveStats(s));
  const open = skillLevel(s, 'archaeology') >= site.level;
  const digging = s.action?.kind === 'skill' && s.action.actionId === site.id;
  return (
    <div className={`card action-card ${digging ? 'running' : ''} ${open ? '' : 'locked'}`}>
      <div className="row">
        <b>{site.name}</b>
        <span className="spacer" />
        <Badge tone="neutral">{STRATA[stratum]}</Badge>
      </div>
      <p className="dim small">{site.desc}</p>
      {open ? (
        <>
          <ProgressBar value={progress} color={site.color} />
          <div className="row wrap small" style={{ marginTop: 6 }}>
            <span>
              <MatIcon id={cultureDef(site.culture).artifact} size={12} /> <span className="num">{fmt(Math.round((artifactsPerDig(s, site) * 3_600_000) / interval))}</span> an hour
            </span>
            <span className="dim">·</span>
            <span className="dim">{digsLeft ? `next find in about ${fmtTime(digsLeft * interval)}` : 'worked to the bottom'}</span>
          </div>
          <ul className="logbook-finds small">
            {site.finds.map((f, i) => (
              <li key={f} className={i < stratum ? '' : 'dim'}>
                {i < stratum ? f : '???'}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="lock-note small">Requires Archaeology level {site.level}</p>
      )}
    </div>
  );
}

function WareRow({ s, culture, w }: { s: GameState; culture: CultureDef; w: WareDef }) {
  const reason = wareReason(s, w.id);
  const ordered = s.expedition.orders[w.culture] === w.id;
  return (
    <div className="ware-row">
      <MatIcon id={w.item} size={16} />
      <span className="ware-name">
        {materialDef(w.item).name}
        {w.qty > 1 && <span className="num"> ×{w.qty}</span>}
      </span>
      <span className="dim small num" title="Left on the shelf. It fills back up over time">
        {wareLeft(s, w)}/{w.shelf}
      </span>
      <span className="small">
        <MatIcon id={culture.artifact} size={12} /> <span className="num">{fmt(warePrice(s, w))}</span>
      </span>
      <button className="btn sm" disabled={!!reason} title={reason ?? ''} onClick={() => game.act((st, ctx) => buyWare(st, ctx, w.id))}>
        Buy
      </button>
      <button className={`btn sm ${ordered ? 'selected' : ''}`} title="Buy this by itself whenever the Artifacts and the shelf allow, even while you're away. One order per merchant" onClick={() => game.act((st) => setOrder(st, w.id))}>
        {ordered ? 'On order' : 'Order'}
      </button>
    </div>
  );
}

function MerchantCard({ s, culture }: { s: GameState; culture: CultureDef }) {
  const have = standing(s, culture.id);
  const { open, next } = shelvesFor(s, culture.id);
  return (
    <div className="card">
      <div className="card-title">
        {culture.merchant}
        <span className="grow" />
        <Badge tone="neutral">
          Standing {have} of {MAX_STANDING}
        </Badge>
      </div>
      <p className="dim small">
        {culture.deals}, for <MatIcon id={culture.artifact} size={12} /> {culture.artifactName}. You have <b className="num">{fmt(s.bank[culture.artifact] ?? 0)}</b>.
      </p>
      {open.map((w) => (
        <WareRow key={w.id} s={s} culture={culture} w={w} />
      ))}
      {next && (
        <p className="lock-note small">
          {materialDef(next.item).name} at standing {next.standing}. Finds at {SITES.filter((x) => x.culture === culture.id).map((x) => x.name).join(' and ')} raise it.
        </p>
      )}
    </div>
  );
}

/** Archaeology's other half: the Logbook of every site's depth, and the merchants who take what comes up. */
export function ExpeditionBoard() {
  const s = useGame();
  if (!expeditionOpen(s)) {
    return <div className="callout skill-note">The dig sites are up in the Hollow Peaks, in {EXPEDITION_GATE.label}. Reach them to start digging.</div>;
  }
  const level = skillLevel(s, 'archaeology');
  const next = SITES.find((x) => x.level > level);
  const shown = SITES.filter((x) => x.level <= level || x === next);
  const found = SITES.reduce((a, x) => a + siteStratum(s, x), 0);
  return (
    <>
      <div className="callout skill-note">
        Digs need nothing and can't go wrong. A site pays more the deeper you work it, and never runs out. Every find raises your standing with the people who left it, and that opens their merchant's better shelves.
      </div>
      <section>
        <div className="section-head">
          <h3>Logbook</h3>
          <span className="dim small">
            {found} of {SITES.length * FIND_HOURS.length} found
          </span>
        </div>
        <div className="action-grid">
          {shown.map((x) => (
            <SitePage key={x.id} s={s} site={x} />
          ))}
        </div>
      </section>
      <section>
        <div className="section-head">
          <h3>Merchants</h3>
          <span className="dim small">{fmt(s.expedition.tally.traded)} traded · the emptier a shelf, the dearer it gets</span>
        </div>
        <div className="card-grid" style={{ ['--card-min' as string]: '340px', gap: 8 }}>
          {CULTURES.map((c) => (
            <MerchantCard key={c.id} s={s} culture={c} />
          ))}
        </div>
      </section>
    </>
  );
}
