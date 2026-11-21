import { useState } from 'react';
import {
  ANCIENT_DATA, CLUES_PER_PASSPORT, COMMIT_MAX, CULTURES, cultureDef, EXPEDITION_GATE, FIND_HOURS, LAYERS, MAX_STANDING, SEALED_RELIC, SITES, siteOf, STRATA, TRAIL,
  type CultureDef, type SiteDef, type WareDef,
} from '../../data/expedition';
import { materialDef } from '../../data/materials';
import { affixDef } from '../../data/affixes';
import { baseDef } from '../../data/bases';
import { RELIC_FORMS, RELIC_ILVL, RELIC_SLOTS, relicForm, type RelicForm } from '../../data/relics';
import {
  artifactsPerDig, buyWare, caveInChance, chosenLayer, clueProgress, commitMult, dataPerDig, exchangeFragments, expeditionOpen, hasPassport, passportReason, reachedLayer,
  relicChoices, relicCost, relicLinePrice, relicReason, relicTiers, restoreRelic, setLayer, setOrder, shelvesFor, siteStratum, standing, stratumProgress, unsealRelic,
  warePrice, wareLeft, wareReason, type RelicLine,
} from '../../engine/expedition';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { relicFragment } from '../../data/archaeology';
import { actionDef } from '../../data/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState, Item } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, fmt, fmtTime, MatIcon, ProgressBar } from './common';
import { ItemTip } from './ItemView';
import '../archaeology.css';

const HOUR = 3_600_000;
const LAYER_GLYPH = ['◇', '◈', '◆'];

const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;

function siteArtifacts(site: SiteDef) {
  return site.relic ? CULTURES.map((c) => c.artifact) : [cultureDef(site.culture).artifact];
}

function digging(s: GameState, id: string): boolean {
  return s.action?.kind === 'skill' && s.action.actionId === id;
}

// ---------- the trail ----------

function TrailMap({ s, selected, onSelect }: { s: GameState; selected: string; onSelect: (id: string) => void }) {
  const level = skillLevel(s, 'archaeology');
  return (
    <div className="trail-map" role="tablist" aria-label="Expedition trail">
      {TRAIL.map((id, i) => {
        const site = siteOf(id)!;
        const stamped = hasPassport(s, id);
        const leveled = level >= site.level;
        const state = digging(s, id) ? 'active' : stamped && leveled ? 'open' : stamped ? 'stamped' : 'locked';
        const finds = siteStratum(s, site);
        return (
          <div key={id} className="trail-step">
            {i > 0 && <span className={`trail-link ${stamped ? 'done' : ''}`} aria-hidden />}
            <button
              role="tab"
              aria-selected={selected === id}
              className={`trail-node ${state} ${site.relic ? 'relic' : ''} ${selected === id ? 'selected' : ''}`}
              style={{ ['--site' as string]: site.color }}
              onClick={() => onSelect(id)}
              title={stamped ? (leveled ? site.name : `${site.name}: Archaeology ${site.level}`) : passportReason(id)}
            >
              <span className="trail-pin">{site.relic ? '✦' : stamped ? i + 1 : '🔒︎'}</span>
              <span className="trail-name">{site.name}</span>
              <span className="trail-meta num">
                Lv {site.level}
                <span className="trail-finds" aria-label={`${finds} of 3 finds`}>
                  {[0, 1, 2].map((f) => <i key={f} className={f < finds ? 'on' : ''} />)}
                </span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function HazardPips({ value }: { value: number }) {
  return (
    <span className="hazard-pips" title={`Hazard ${value} of 7: how often trenches cave in`}>
      {Array.from({ length: 7 }, (_, i) => <i key={i} className={i < value ? 'on' : ''} />)}
    </span>
  );
}

function StrataColumn({ s, site, open }: { s: GameState; site: SiteDef; open: boolean }) {
  const reached = reachedLayer(s, site);
  const chosen = chosenLayer(s, site);
  const stratum = siteStratum(s, site);
  const { progress, digsLeft } = stratumProgress(s, site);
  const d = deriveStats(s);
  const a = actionDef(site.id);
  const active = digging(s, site.id);
  return (
    <div className="strata">
      <div className="strata-sky" aria-hidden />
      {LAYERS.map((L, i) => {
        const locked = i > reached;
        const frontier = i === reached && stratum < FIND_HOURS.length;
        const cleared = i < stratum;
        // rates as if this layer were picked
        const interval = (actionIntervalMs(s, a, d) / LAYERS[chosen].speed) * L.speed;
        const perHour = HOUR / interval;
        const art = artifactsPerDig(s, site, L) * perHour;
        const data = dataPerDig(s, site, i) * perHour;
        const pick = () => game.act((st, ctx) => {
          if (setLayer(st, site.id, i)) return;
          if (open && !digging(st, site.id)) startSkillAction(st, ctx, site.id);
        });
        return (
          <button
            key={L.id}
            className={`stratum layer-${L.id} ${locked ? 'locked' : ''} ${i === chosen ? 'chosen' : ''} ${i === chosen && active ? 'digging' : ''}`}
            disabled={locked}
            onClick={pick}
            aria-pressed={i === chosen}
          >
            <div className="stratum-head">
              <span className="stratum-glyph" aria-hidden>{LAYER_GLYPH[i]}</span>
              <b>{L.name}</b>
              <span className="spacer" />
              {locked ? (
                <span className="stratum-state">Reach {L.name} with the {['first', 'second', 'third'][i - 1]} find</span>
              ) : cleared ? (
                <span className="stratum-state good">Find: {site.finds[i]}</span>
              ) : frontier ? (
                <span className="stratum-state">Frontier · {digsLeft ? `next find in ${fmtTime(digsLeft * interval)}` : ''}</span>
              ) : (
                <span className="stratum-state good">Fully excavated</span>
              )}
            </div>
            {!locked && (
              <>
                <p className="stratum-blurb">{L.blurb}</p>
                <div className="stratum-stats num">
                  <span title="Time per dig">⏱ {(interval / 1000).toFixed(1)}s</span>
                  <span title="Artifacts an hour">{siteArtifacts(site).map((id) => <MatIcon key={id} id={id} size={11} />)} {fmt(art)}/h</span>
                  <span title="Ancient Data an hour, with your Commitment here" className="data">⌬ {data.toFixed(1)}/h</span>
                  <span title="Chance a dig caves in" className="hz">⚠ {pct(caveInChance(site, L), 2)}</span>
                </div>
                {frontier && <ProgressBar value={progress} color={L.color} className="stratum-depth" />}
              </>
            )}
          </button>
        );
      })}
      {stratum >= FIND_HOURS.length && <div className="strata-floor">{STRATA[3]}: every layer is open, and keeps paying</div>}
    </div>
  );
}

function SitePanel({ s, site }: { s: GameState; site: SiteDef }) {
  const a = actionDef(site.id);
  const reason = actionBlocker(s, a);
  const open = !reason;
  const active = digging(s, site.id);
  const interval = actionIntervalMs(s, a, deriveStats(s));
  const layer = chosenLayer(s, site);
  const commit = commitMult(s, site, layer);
  const clues = clueProgress(s, site);
  const people = site.relic ? 'All three peoples' : cultureDef(site.culture).name;
  return (
    <div className="dig-panel" style={{ ['--site' as string]: site.color }}>
      <header className="dig-head">
        <div>
          <div className="dig-kicker">
            Site {TRAIL.indexOf(site.id) + 1} of {TRAIL.length} · {people}
          </div>
          <h3 className="dig-title">{site.name}</h3>
          <p className="dig-desc">{site.desc}</p>
        </div>
        <div className="dig-side">
          <div className="dig-hazard">
            Hazard <HazardPips value={site.hazard} />
          </div>
          {open ? (
            active ? (
              <button className="btn dig-btn stop" onClick={() => game.act((st) => stopAction(st))}>Stop digging</button>
            ) : (
              <button className="btn primary dig-btn" onClick={() => game.act((st, ctx) => startSkillAction(st, ctx, site.id))}>
                Dig {LAYERS[layer].name}
              </button>
            )
          ) : (
            <button className="btn dig-btn" disabled title={reason ?? ''}>Locked</button>
          )}
        </div>
      </header>

      {!open && <p className="lock-note">{reason}</p>}
      {active && s.action?.kind === 'skill' && (
        <ProgressBar value={s.action.progress / interval} color="var(--success)" className="action-progress dig-progress" />
      )}

      <div className="dig-body">
        <StrataColumn s={s} site={site} open={open} />

        <aside className="dig-aside">
          <section className="dig-card">
            <div className="dig-card-head">
              <span>Commitment</span>
              <b className="num commit-mult">×{commit.toFixed(2)}</b>
            </div>
            <div className="commit-meter" aria-hidden>
              <span style={{ width: `${((commit - 1) / (COMMIT_MAX - 1)) * 100}%` }} />
            </div>
            <p className="dig-note">
              Stay on one layer to multiply Ancient Data, up to ×{COMMIT_MAX} after two hours. Switching layer or site starts again. A cave-in costs a quarter.
            </p>
          </section>

          <section className="dig-card passport">
            <div className="dig-card-head">
              <span>Expedition Passport</span>
              {clues.next ? <span className="dim small">{clues.next.name}</span> : <span className="dim small">End of the trail</span>}
            </div>
            {clues.next ? (
              <>
                <div className="clue-slots">
                  {Array.from({ length: CLUES_PER_PASSPORT }, (_, i) => (
                    <span key={i} className={`clue ${i < clues.clues ? 'found' : ''}`}>
                      {i < clues.clues ? '❖' : ''}
                      {i === clues.clues && !clues.done && <span className="clue-fill" style={{ height: `${clues.progress * 100}%` }} />}
                    </span>
                  ))}
                  <span className={`stamp ${clues.done ? 'on' : ''}`}>{clues.done ? 'Stamped' : 'Unstamped'}</span>
                </div>
                <p className="dig-note">
                  {clues.done
                    ? `${clues.next.name} is on your passport${skillLevel(s, 'archaeology') < clues.next.level ? `, from Archaeology ${clues.next.level}` : ''}.`
                    : `Clue Fragments turn up as you dig here, on any layer. ${CLUES_PER_PASSPORT} stamp the passport for the next site.`}
                </p>
              </>
            ) : (
              <p className="dig-note">Sealed Relics lie in this site's Bedrock. The first find here opens a door with one behind it.</p>
            )}
          </section>

          <section className="dig-card">
            <div className="dig-card-head">
              <span>Logbook</span>
              <span className="dim small num">{siteStratum(s, site)}/3 finds</span>
            </div>
            <ol className="logbook">
              {site.finds.map((f, i) => (
                <li key={f} className={i < siteStratum(s, site) ? 'found' : ''}>
                  <span className="log-layer">{LAYERS[i].name}</span>
                  {i < siteStratum(s, site) ? f : 'Undiscovered'}
                </li>
              ))}
            </ol>
            <p className="dig-note">
              {site.relic ? 'Finds here pay no standing: the Reliquary belongs to everyone.' : `Each find is +1 standing with ${cultureDef(site.culture).merchant} and +25% Artifacts here.`}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function TrailView({ s }: { s: GameState }) {
  const current = s.action?.kind === 'skill' && siteOf(s.action.actionId) ? s.action.actionId : undefined;
  const furthest = [...TRAIL].reverse().find((id) => hasPassport(s, id) && skillLevel(s, 'archaeology') >= siteOf(id)!.level) ?? TRAIL[0];
  const [picked, setPicked] = useState<string | undefined>();
  const selected = picked ?? current ?? furthest;
  const stamped = TRAIL.filter((id) => hasPassport(s, id)).length;
  const found = SITES.reduce((a, x) => a + siteStratum(s, x), 0);
  return (
    <section className="expedition">
      <div className="expedition-banner">
        <div>
          <div className="dig-kicker">The Hollow Peaks</div>
          <h3 className="expedition-title">Expedition Trail</h3>
        </div>
        <div className="expedition-stats">
          <Stat label="Passports" value={`${stamped}/${TRAIL.length}`} />
          <Stat label="Finds" value={`${found}/${SITES.length * FIND_HOURS.length}`} />
          <Stat label="Ancient Data" value={fmt(s.storage.bank[ANCIENT_DATA] ?? 0)} icon={ANCIENT_DATA} />
          <Stat label="Sealed Relics" value={fmt(s.storage.bank[SEALED_RELIC] ?? 0)} icon={SEALED_RELIC} />
        </div>
      </div>
      <TrailMap s={s} selected={selected} onSelect={setPicked} />
      <SitePanel s={s} site={siteOf(selected)!} />
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <div className="exp-stat">
      <span className="exp-stat-label">{label}</span>
      <b className="num">{icon && <MatIcon id={icon} size={12} />} {value}</b>
    </div>
  );
}

// ---------- the Relic Forge ----------

function affixLine(id: string, tier: number): string {
  const def = affixDef(id);
  return def.text.replace(/\{(\d+)\}/g, (_, i) => String(def.tiers[tier].ranges[Number(i)][1]));
}

function tierLabel(id: string, tier: number): string {
  const tiers = relicTiers(id);
  return `T${tiers.length - tiers.indexOf(tier)}`;
}

function draftItem(form: RelicForm, lines: RelicLine[]): Item {
  const item: Item = { uid: -1, baseId: form.baseId, ilvl: RELIC_ILVL, rarity: 'rare', name: form.name, prefixes: [], suffixes: [], itemTier: 1, relic: form.id };
  for (const l of lines) {
    const def = affixDef(l.affixId);
    (def.kind === 'prefix' ? item.prefixes : item.suffixes).push({ affixId: l.affixId, tier: l.tier, values: def.tiers[l.tier].ranges.map(([, hi]) => hi) });
  }
  return item;
}

function ForgeSlot({ formId, lines, index, kind, onChange }: { formId: string; lines: RelicLine[]; index: number; kind: 'prefix' | 'suffix'; onChange: (l: RelicLine | null) => void }) {
  const mine = lines.filter((l) => affixDef(l.affixId).kind === kind);
  const line = mine[index];
  const others = lines.filter((l) => l !== line);
  const choices = relicChoices(formId, others, kind);
  if (!line) {
    if (index > mine.length) return <div className="forge-slot empty dim">—</div>;
    return (
      <div className="forge-slot empty">
        <select
          aria-label={`Add a ${kind}`}
          value=""
          onChange={(e) => e.target.value && onChange({ affixId: e.target.value, tier: relicTiers(e.target.value).at(-1)! })}
        >
          <option value="">+ Program a {kind}…</option>
          {choices.map((a) => (
            <option key={a.id} value={a.id}>{affixLine(a.id, relicTiers(a.id).at(-1)!)}</option>
          ))}
        </select>
      </div>
    );
  }
  const tiers = relicTiers(line.affixId);
  const at = tiers.indexOf(line.tier);
  return (
    <div className="forge-slot">
      <div className="forge-line">{affixLine(line.affixId, line.tier)}</div>
      <div className="forge-controls">
        <button className="btn sm ghost" disabled={at <= 0} onClick={() => onChange({ ...line, tier: tiers[at - 1] })} aria-label="Lower tier">−</button>
        <span className="forge-tier num">{tierLabel(line.affixId, line.tier)}</span>
        <button className="btn sm ghost" disabled={at >= tiers.length - 1} onClick={() => onChange({ ...line, tier: tiers[at + 1] })} aria-label="Higher tier">+</button>
        <span className="forge-cost num" title="Ancient Data">⌬ {relicLinePrice(line)}</span>
        <button className="btn sm ghost" onClick={() => onChange(null)} aria-label="Remove">✕</button>
      </div>
    </div>
  );
}

function ForgeBench({ s, form }: { s: GameState; form: RelicForm }) {
  const [lines, setLines] = useState<RelicLine[]>([]);
  const have = s.storage.bank[ANCIENT_DATA] ?? 0;
  const cost = relicCost(lines);
  const reason = relicReason(s, lines);
  const change = (kind: 'prefix' | 'suffix', index: number) => (l: RelicLine | null) => {
    const old = lines.filter((x) => affixDef(x.affixId).kind === kind)[index];
    setLines((prev) => (old ? (l ? prev.map((x) => (x === old ? l : x)) : prev.filter((x) => x !== old)) : l ? [...prev, l] : prev));
  };
  return (
    <div className="forge-bench" style={{ ['--site' as string]: form.culture === 'all' ? '#e0b25c' : cultureDef(form.culture).color }}>
      <div className="forge-program">
        <div className="dig-kicker">On the forge · {baseDef(form.baseId).name}</div>
        <h3 className="dig-title">{form.name}</h3>
        <p className="dig-desc">{form.lore}</p>
        {(['prefix', 'suffix'] as const).map((kind) => (
          <div key={kind} className="forge-group">
            <div className="forge-group-head">{kind === 'prefix' ? 'Prefixes' : 'Suffixes'}</div>
            {Array.from({ length: RELIC_SLOTS }, (_, i) => (
              <ForgeSlot key={i} formId={form.id} lines={lines} index={i} kind={kind} onChange={change(kind, i)} />
            ))}
          </div>
        ))}
        <p className="dig-note">
          Every line is restored at the top of its tier. T1 is the best tier at item level {RELIC_ILVL}, and the dearest. Restoring is final: choose carefully.
        </p>
      </div>
      <div className="forge-preview">
        <ItemTip item={draftItem(form, lines)} state={s} />
        <div className="forge-total">
          <span>Ancient Data</span>
          <b className={`num ${cost > have ? 'bad' : ''}`}>
            <MatIcon id={ANCIENT_DATA} size={12} /> {fmt(cost)} / {fmt(have)}
          </b>
        </div>
        <button
          className="btn primary forge-go"
          disabled={!!reason}
          title={reason ?? ''}
          onClick={() => game.act((st, ctx) => { if (!restoreRelic(st, ctx, lines)) setLines([]); })}
        >
          Restore relic
        </button>
        {reason && lines.length > 0 && <p className="lock-note small">{reason}</p>}
      </div>
    </div>
  );
}

function ForgeView({ s }: { s: GameState }) {
  const job = s.expedition.forge;
  const sealed = s.storage.bank[SEALED_RELIC] ?? 0;
  const form = job ? relicForm(job.formId) : undefined;
  return (
    <section className="expedition">
      <div className="expedition-banner forge">
        <div>
          <div className="dig-kicker">Relic Restoration</div>
          <h3 className="expedition-title">The Relic Forge</h3>
        </div>
        <div className="expedition-stats">
          <Stat label="Sealed Relics" value={fmt(sealed)} icon={SEALED_RELIC} />
          <Stat label="Ancient Data" value={fmt(s.storage.bank[ANCIENT_DATA] ?? 0)} icon={ANCIENT_DATA} />
          <Stat label="Restored" value={fmt(s.expedition.relicsRestored ?? 0)} />
        </div>
      </div>
      {form ? (
        <ForgeBench key={form.id} s={s} form={form} />
      ) : (
        <>
          <div className="forge-intro">
            <p>
              <b>1 · Break the seal.</b> Pick the form a Sealed Relic takes. <b>2 · Program it.</b> Spend Ancient Data on each modifier and its tier.{' '}
              <b>3 · Restore it.</b> It comes out as a named relic at item level {RELIC_ILVL}, exactly as you built it.
            </p>
            {!sealed && (
              <p className="lock-note">
                No Sealed Relics yet. They lie at the end of the trail, in the Bedrock of {siteOf('dig_reliquary')!.name} (Archaeology {siteOf('dig_reliquary')!.level}), and its first find guarantees one.
              </p>
            )}
          </div>
          <div className="relic-forms">
            {RELIC_FORMS.map((f) => (
              <div key={f.id} className="relic-form" style={{ ['--site' as string]: f.culture === 'all' ? '#e0b25c' : cultureDef(f.culture).color }}>
                <div className="relic-form-kicker">{f.culture === 'all' ? 'All three peoples' : cultureDef(f.culture).name} · {baseDef(f.baseId).name}</div>
                <b className="relic-form-name">{f.name}</b>
                <p className="relic-form-lore">{f.lore}</p>
                <button className="btn sm" disabled={!sealed} onClick={() => game.act((st, ctx) => unsealRelic(st, ctx, f.id))}>
                  Break the seal
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ---------- the merchants ----------

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
        {culture.deals}, for <MatIcon id={culture.artifact} size={12} /> {culture.artifactName}. You have <b className="num">{fmt(s.storage.bank[culture.artifact] ?? 0)}</b>.
      </p>
      <p className="small">Relic fragments: {s.storage.bank[relicFragment(culture.id)] ?? 0}. One every 60 matching digs (Bedrock digs count three); {60 - (s.professionProgress.counters[`archaeology.fragments.${culture.id}`] ?? 0) % 60} to the next.</p>
      <button className="btn sm" disabled={(s.storage.bank[relicFragment(culture.id)] ?? 0) < 5} onClick={() => game.act((st, ctx) => exchangeFragments(st, ctx, culture.id))}>Exchange 5 fragments for 25 artifacts</button>
      {open.map((w) => (
        <WareRow key={w.id} s={s} culture={culture} w={w} />
      ))}
      {next && (
        <p className="lock-note small">
          {materialDef(next.item).name} at standing {next.standing}. Finds at {SITES.filter((x) => x.culture === culture.id && !x.relic).map((x) => x.name).join(' and ')} raise it.
        </p>
      )}
    </div>
  );
}

/** Archaeology's board: the Expedition Trail and its digs, the Relic Forge, and the merchants who take what comes up. */
export function ExpeditionBoard({ view = 'sites' }: { view?: 'sites' | 'forge' | 'merchants' }) {
  const s = useGame();
  if (!expeditionOpen(s)) {
    return <div className="callout skill-note">The dig sites are up in the Hollow Peaks, in {EXPEDITION_GATE.label}. Reach them to start digging.</div>;
  }
  if (view === 'sites') return <TrailView s={s} />;
  if (view === 'forge') return <ForgeView s={s} />;
  return (
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
  );
}
