import { useState } from 'react';
import {
  ANCIENT_DATA, chamberActionId, CULTURES, cultureDef, EXPEDITION_GATE, FIND_HOURS, MAX_STANDING, SEALED_RELIC, SITES, siteOf, siteOfAction, TRAIL,
  type CultureDef, type SiteDef, type WareDef,
} from '../../data/expedition';
import { formChapter, scriptDef, SECRET_CHAPTERS } from '../../data/deciphering';
import { materialDef } from '../../data/materials';
import { affixDef } from '../../data/affixes';
import { baseDef, type BaseDef } from '../../data/bases';
import { RELIC_FORMS, RELIC_ILVL, RELIC_SLOTS, relicForm, type RelicForm } from '../../data/relics';
import {
  artifactsPerDig, buyWare, exchangeFragments, expeditionOpen, hasPassport, passportReason,
  relicChoices, relicCost, relicLinePrice, relicReason, relicTiers, restoreRelic, setOrder, shelvesFor, siteStratum, standing, stratumProgress, unsealRelic,
  warePrice, wareLeft, wareReason, type RelicLine,
} from '../../engine/expedition';
import { relicFormUnlocked } from '../../engine/deciphering';
import { professionAccessReason } from '../../engine/professions';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stationLevelFor, stopAction } from '../../engine/skills';
import { skillTreeStats } from '../../engine/skillTree';
import { relicFragment } from '../../data/archaeology';
import { actionDef, actionsFor, type SkillAction } from '../../data/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState, Item } from '../../engine/types';
import { game, useGame } from '../../game';
import { Art, Badge, Cost, fmt, fmtTime, MatIcon, ProgressBar } from './common';
import { Icon } from './Icon';
import { ItemTip } from './ItemView';
import { CodexView, DeskView } from './ScholarsDesk';
import { HelpTip, LockedBadge, SkillIntro } from './SkillHelp';
import { SkillMinigame } from './SkillMinigame';
import '../archaeology.css';

function siteArtifacts(site: SiteDef) {
  return site.relic ? CULTURES.map((c) => c.artifact) : [cultureDef(site.culture).artifact];
}

function digging(s: GameState, id: string): boolean {
  return s.action?.kind === 'skill' && s.action.actionId === id;
}

// ---------- the trail ----------

function TrailMap({ s, trail, selected, onSelect }: { s: GameState; trail: string[]; selected: string; onSelect: (id: string) => void }) {
  const level = skillLevel(s, 'archaeology');
  return (
    <div className="trail-map" role="tablist" aria-label="Expedition trail">
      {trail.map((id, i) => {
        const site = siteOf(id)!;
        const stamped = hasPassport(s, id);
        const leveled = level >= site.level;
        const state = digging(s, id) || digging(s, chamberActionId(id)) ? 'active' : stamped && leveled ? 'open' : stamped ? 'stamped' : 'locked';
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
              <span className="trail-pin">{site.relic ? '✦' : stamped ? TRAIL.indexOf(id) + 1 : '🔒︎'}</span>
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

function DigButton({ s, id, label }: { s: GameState; id: string; label: string }) {
  const a = actionDef(id);
  const reason = actionBlocker(s, a);
  if (reason) return <button className="btn dig-btn" disabled title={reason}>Locked</button>;
  if (digging(s, id)) return <button className="btn dig-btn stop" onClick={() => game.act((st) => stopAction(st))}>Stop digging</button>;
  return <button className="btn primary dig-btn" onClick={() => game.act((st, ctx) => startSkillAction(st, ctx, id))}>{label}</button>;
}

function SitePanel({ s, site }: { s: GameState; site: SiteDef }) {
  const a = actionDef(site.id);
  const reason = actionBlocker(s, a);
  const open = !reason;
  const interval = actionIntervalMs(s, a, deriveStats(s));
  const chamber = s.archaeology.chambers.includes(site.id);
  const script = scriptDef(site.relic ? 'first' : site.culture);
  const { progress, digsLeft } = stratumProgress(s, site);
  const finds = siteStratum(s, site);
  const running = digging(s, site.id) ? site.id : digging(s, chamberActionId(site.id)) ? chamberActionId(site.id) : null;
  const perHour = (3_600_000 / interval) * artifactsPerDig(s, site);
  return (
    <div className="dig-panel" style={{ ['--site' as string]: site.color }}>
      <header className="dig-head">
        <div>
          <div className="dig-kicker">
            Site {TRAIL.indexOf(site.id) + 1} of {TRAIL.length} · {site.relic ? 'All three peoples' : cultureDef(site.culture).name} · writes in {script.name}
          </div>
          <h3 className="dig-title">{site.name}</h3>
          <p className="dig-desc">{site.desc}</p>
        </div>
        <div className="dig-side">
          <DigButton s={s} id={site.id} label="Dig" />
          {chamber && <DigButton s={s} id={chamberActionId(site.id)} label="Dig the hidden chamber" />}
        </div>
      </header>

      {!open && <p className="lock-note">{reason}</p>}
      {running && s.action?.kind === 'skill' && (
        <ProgressBar value={s.action.progress / interval} color="var(--success)" className="action-progress dig-progress" />
      )}

      <div className="dig-body single">
        <aside className="dig-aside">
          <section className="dig-card">
            <div className="dig-card-head">
              <span>Logbook</span>
              <span className="dim small num">{finds}/{FIND_HOURS.length} finds</span>
            </div>
            <ol className="logbook">
              {site.finds.map((f, i) => (
                <li key={f} className={i < finds ? 'found' : ''}>
                  <span className="log-layer">Find {i + 1}</span>
                  {i < finds ? f : 'Undiscovered'}
                </li>
              ))}
            </ol>
            {finds < FIND_HOURS.length && (
              <p className="dig-note">Next find in {fmtTime(digsLeft * interval)}.</p>
            )}
            {finds < FIND_HOURS.length && <ProgressBar value={progress} color="var(--accent)" className="stratum-depth" />}
            <p className="dig-note">
              {site.relic ? 'Finds here pay no standing: the Reliquary belongs to everyone.' : `Each find is +1 standing with ${cultureDef(site.culture).merchant} and +25% Artifacts here.`}
              {' '}About <MatIcon id={siteArtifacts(site)[0]} size={11} /> {fmt(perHour)} Artifacts an hour.
            </p>
          </section>
          <section className="dig-card passport">
            <div className="dig-card-head"><span>Expedition Passport</span></div>
            <p className="dig-note">
              {hasPassport(s, site.id)
                ? `${site.name} is on your passport${skillLevel(s, 'archaeology') < site.level ? `, from Archaeology ${site.level}` : ''}.`
                : passportReason(site.id)}
            </p>
            <p className="dig-note">
              {site.relic
                ? 'Sealed Relics come out of the Reliquary: one with its first find, then now and then as you dig.'
                : 'Digging here turns up inscriptions for the Scholar\'s desk. Chapters of the story open the rest of the trail.'}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function TrailView({ s }: { s: GameState }) {
  const level = skillLevel(s, 'archaeology');
  const current = s.action?.kind === 'skill' ? siteOfAction(s.action.actionId)?.id : undefined;
  const furthest = [...TRAIL].reverse().find((id) => hasPassport(s, id) && level >= siteOf(id)!.level) ?? TRAIL[0];
  const lastOpenIdx = TRAIL.reduce((best, id, idx) => (hasPassport(s, id) && level >= siteOf(id)!.level ? idx : best), 0);
  const [showFuture, setShowFuture] = useState(false);
  const visibleTrail = showFuture ? TRAIL : TRAIL.slice(0, Math.min(TRAIL.length, lastOpenIdx + 3));
  const hiddenCount = TRAIL.length - visibleTrail.length;
  const [picked, setPicked] = useState<string | undefined>();
  const rawSelected = picked ?? current ?? furthest;
  const selected = visibleTrail.includes(rawSelected) ? rawSelected : furthest;
  const stamped = TRAIL.filter((id) => hasPassport(s, id)).length;
  const found = SITES.reduce((a, x) => a + siteStratum(s, x), 0);
  return (
    <section className="expedition">
      <div className="expedition-banner">
        <div>
          <div className="dig-kicker">The Expedition Trail</div>
          <h3 className="expedition-title">Dig sites</h3>
          <p className="banner-sub">Pick a site and press Dig. Translating the story opens the next site on the trail.</p>
        </div>
        <div className="expedition-stats">
          <Stat label="Passports" value={`${stamped}/${TRAIL.length}`} />
          <Stat label="Finds" value={`${found}/${SITES.length * FIND_HOURS.length}`} />
          <Stat label="Ancient Data" value={fmt(s.storage.bank[ANCIENT_DATA] ?? 0)} icon={ANCIENT_DATA} />
          <Stat label="Sealed Relics" value={fmt(s.storage.bank[SEALED_RELIC] ?? 0)} icon={SEALED_RELIC} />
          {(hiddenCount > 0 || showFuture) && (
            <button className="btn sm ghost" onClick={() => setShowFuture((v) => !v)}>
              {showFuture ? 'Hide future sites' : `Show future sites (+${hiddenCount})`}
            </button>
          )}
        </div>
      </div>
      <TrailMap s={s} trail={visibleTrail} selected={selected} onSelect={setPicked} />
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

function slotLabel(base: BaseDef): string {
  if (base.slot === 'offhand') return base.tags.includes('shield') ? 'Shield (Offhand)' : 'Offhand';
  if (base.slot === 'body') return 'Body Armour';
  return base.slot.charAt(0).toUpperCase() + base.slot.slice(1);
}

function baseStatLines(base: BaseDef): string[] {
  const lines: string[] = [];
  if (base.armour) lines.push(`Armour: ${base.armour}`);
  if (base.evasion) lines.push(`Evasion: ${base.evasion}`);
  if (base.energyShield) lines.push(`Energy Shield: ${base.energyShield}`);
  for (const imp of base.implicits ?? []) {
    if (imp.text) lines.push(imp.text);
  }
  return lines;
}

function ForgeView({ s }: { s: GameState }) {
  const job = s.expedition.forge;
  const sealed = s.storage.bank[SEALED_RELIC] ?? 0;
  const form = job ? relicForm(job.formId) : undefined;
  // a newcomer with no Sealed Relic yet sees the forge folded: the locked forms are a click away
  const [hideLocked, setHideLocked] = useState(() => !sealed && !(s.expedition.relicsRestored ?? 0));
  const lockedCount = RELIC_FORMS.filter((f) => !relicFormUnlocked(s, f.id)).length;
  const forms = hideLocked ? RELIC_FORMS.filter((f) => relicFormUnlocked(s, f.id)) : RELIC_FORMS;
  return (
    <section className="expedition">
      <div className="expedition-banner forge">
        <div>
          <div className="dig-kicker">Late game · from the Sealed Reliquary</div>
          <h3 className="expedition-title">The Relic Forge</h3>
          <p className="banner-sub">Break open a Sealed Relic and build your own item level {RELIC_ILVL} gear with Ancient Data.</p>
        </div>
        <div className="expedition-stats">
          <Stat label="Sealed Relics" value={fmt(sealed)} icon={SEALED_RELIC} />
          <Stat label="Ancient Data" value={fmt(s.storage.bank[ANCIENT_DATA] ?? 0)} icon={ANCIENT_DATA} />
          <Stat label="Restored" value={fmt(s.expedition.relicsRestored ?? 0)} />
          {!form && lockedCount > 0 && (
            <button className="btn sm ghost" onClick={() => setHideLocked((v) => !v)}>
              {hideLocked ? `Show locked (${lockedCount})` : 'Hide locked'}
            </button>
          )}
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
                No Sealed Relics yet. They lie at the end of the trail, in {siteOf('dig_reliquary')!.name} (Archaeology {siteOf('dig_reliquary')!.level}), and its first find guarantees one. New relic forms open as you finish each people's story.
              </p>
            )}
          </div>
          {forms.length === 0 ? (
            <div className="dig-card">
              <p className="small dim">No relic forms open yet. Each people's story opens forms as you translate it.</p>
              <button className="btn sm" onClick={() => setHideLocked(false)}>See all {lockedCount} forms</button>
            </div>
          ) : (
            <div className="relic-forms">
              {forms.map((f) => {
                const open = relicFormUnlocked(s, f.id);
                const from = formChapter(f.id);
                const glow = !!from && !!s.archaeology.secret[from.script];
                const base = baseDef(f.baseId);
                const stats = baseStatLines(base);
                return (
                  <div key={f.id} className={`relic-form ${open ? '' : 'locked'} ${glow ? 'glow' : ''}`} style={{ ['--site' as string]: f.culture === 'all' ? '#e0b25c' : cultureDef(f.culture).color }}>
                    <div className="relic-form-top">
                      <div className="relic-form-kicker">{f.culture === 'all' ? 'All three peoples' : cultureDef(f.culture).name} · {slotLabel(base)}</div>
                      {!open && <LockedBadge reason={from ? `${scriptDef(from.script).name} Ch. ${from.n}` : 'Story'} />}
                    </div>
                    <b className="relic-form-name">{f.name}</b>
                    <div className="relic-form-base">
                      <b>{base.name}</b> <span className="dim small">· Lv {base.reqLevel} {slotLabel(base)}</span>
                    </div>
                    {stats.length > 0 && (
                      <ul className="relic-form-stats">
                        {stats.map((line) => <li key={line}>{line}</li>)}
                      </ul>
                    )}
                    <p className="relic-form-lore">{f.lore}</p>
                    {glow && from && <p className="small dim">Glowing: {SECRET_CHAPTERS[from.script].title}</p>}
                    {open ? (
                      <button className="btn sm" disabled={!sealed} onClick={() => game.act((st, ctx) => unsealRelic(st, ctx, f.id))}>
                        Break the seal
                      </button>
                    ) : (
                      <p className="lock-note small">Locked: translate {from ? `${scriptDef(from.script).name} chapter ${from.n}` : 'more of the story'}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ---------- Sifting & Relic Restorations ----------

function restorationLockReason(s: GameState, a: SkillAction): string | null {
  if (skillLevel(s, 'archaeology') < a.level) return `Requires Archaeology level ${a.level}`;
  if (a.accomplishments && !s.professionProgress.legacyAccess[a.id]) {
    const reason = professionAccessReason(s, { skill: a.skill, level: a.level, accomplishments: a.accomplishments });
    if (reason) return reason;
  }
  const st = stationLevelFor(a);
  if (st && (s.account.hideout[st.station] ?? 1) < st.level) {
    return `Needs Forge level ${st.level}`;
  }
  return null;
}

function RestorationCard({ s, a }: { s: GameState; a: SkillAction }) {
  const d = deriveStats(s);
  const tree = skillTreeStats(s);
  const lockReason = restorationLockReason(s, a);
  const blocker = lockReason ? null : actionBlocker(s, a);
  const running = s.action?.kind === 'skill' && s.action.actionId === a.id;
  const interval = actionIntervalMs(s, a, d);
  const xp = +(a.xp * (1 + (d.skillXp + (tree.skillXp ?? 0)) / 100)).toFixed(1);
  const outEntries = Object.entries(a.protectedOutputs ?? a.outputs ?? {});
  const primaryOutId = outEntries[0]?.[0];

  return (
    <article
      className={`dig-card restoration-card ${running ? 'running' : ''} ${lockReason ? 'locked' : ''}`}
      style={{ ['--site' as string]: a.color ?? 'var(--accent)' }}
    >
      <div className="restoration-head">
        <span className="restoration-icon">
          {a.baseId ? (
            <Art src={`items/${a.baseId}`} alt={baseDef(a.baseId).name} size={28} fallback={<Icon name={baseDef(a.baseId).slot} size={20} color={a.color} />} />
          ) : primaryOutId ? (
            <MatIcon id={primaryOutId} size={24} />
          ) : null}
        </span>
        <div className="restoration-title-wrap">
          <h4 className="restoration-title">{a.name}</h4>
          <div className="restoration-meta num">
            <span>Lv {a.level}</span>
            <span>·</span>
            <span>{interval < 60_000 ? `${(interval / 1000).toFixed(1)}s` : fmtTime(interval)}</span>
            <span>·</span>
            <span>{xp} XP</span>
          </div>
        </div>
        {lockReason ? (
          <LockedBadge level={a.level} reason={lockReason} />
        ) : running ? (
          <button className="btn sm stop" onClick={() => game.act((st) => stopAction(st))}>Stop</button>
        ) : (
          <button
            className={`btn sm ${blocker ? '' : 'primary'}`}
            disabled={!!blocker}
            title={blocker ?? ''}
            onClick={() => game.act((st, ctx) => startSkillAction(st, ctx, a.id))}
          >
            {blocker === 'Missing materials' ? 'Missing' : blocker === 'Inventory full' ? 'Full' : a.id.startsWith('sift_') ? 'Sift' : 'Restore'}
          </button>
        )}
      </div>

      <div className="restoration-output">
        <span className="dim small">Produces:</span>
        {outEntries.map(([id, n]) => (
          <span key={id} className="restoration-out-chip">
            <MatIcon id={id} size={14} />
            <b>{materialDef(id).name}</b>
            <span className="num">×{n}</span>
          </span>
        ))}
        {a.baseId && (
          <span className="restoration-out-chip">
            <b>{baseDef(a.baseId).name}</b>
            <span className="dim small">· ilvl {Math.min(45, skillLevel(s, 'archaeology'))}</span>
          </span>
        )}
      </div>

      {a.inputs ? (
        <div className="restoration-cost">
          <span className="dim small">Cost:</span>
          <Cost cost={a.inputs} have={s.storage.bank} />
        </div>
      ) : (
        <div className="dim small">No materials required — steady Artifact sifting.</div>
      )}

      {lockReason && <p className="lock-note small" style={{ margin: 0 }}>{lockReason}</p>}
      {running && s.action?.kind === 'skill' && (
        <ProgressBar value={s.action.progress / interval} color="var(--success)" className="action-progress dig-progress" />
      )}
    </article>
  );
}

/** Archaeology's Soil Sifting and Relic Restoration bench in Archaeology's own aesthetic. */
function RestorationView({ s }: { s: GameState }) {
  const [showLocked, setShowLocked] = useState(false);
  const all = actionsFor('archaeology').filter((a) => a.id.startsWith('sift_') || a.id.startsWith('restore_'));
  const sifting = all.filter((a) => a.id.startsWith('sift_'));
  const restorations = all.filter((a) => a.id.startsWith('restore_'));

  const filterGroup = (list: SkillAction[]) => {
    if (showLocked) return { visible: list, hidden: 0 };
    const unlocked: SkillAction[] = [];
    const locked: SkillAction[] = [];
    for (const a of list) {
      if (restorationLockReason(s, a)) locked.push(a);
      else unlocked.push(a);
    }
    const keptLocked = locked.slice(0, 2);
    return { visible: [...unlocked, ...keptLocked], hidden: locked.length - keptLocked.length };
  };

  const siftShown = filterGroup(sifting);
  const restoreShown = filterGroup(restorations);
  const totalHidden = siftShown.hidden + restoreShown.hidden;
  const activeRestoration = s.action?.kind === 'skill' && (s.action.actionId.startsWith('sift_') || s.action.actionId.startsWith('restore_'));

  return (
    <section className="expedition">
      <div className="expedition-banner">
        <div>
          <div className="dig-kicker">Field bench</div>
          <h3 className="expedition-title">Sifting & Restoration</h3>
          <p className="banner-sub">Sift soil for extra Artifacts, or mend Relic fragments and Artifacts into gear.</p>
        </div>
        <div className="expedition-stats">
          {CULTURES.map((c) => (
            <Stat key={c.id} label={c.artifactName} value={fmt(s.storage.bank[c.artifact] ?? 0)} icon={c.artifact} />
          ))}
          {(totalHidden > 0 || showLocked) && (
            <button className="btn sm ghost" onClick={() => setShowLocked((v) => !v)}>
              {showLocked ? 'Hide locked' : `Show locked (+${totalHidden})`}
            </button>
          )}
        </div>
      </div>

      {activeRestoration && <SkillMinigame skill="archaeology" />}

      <div className="restoration-group">
        <div className="section-head">
          <h3>Soil Sifting</h3>
          <span className="dim small">Steady Artifacts with no input costs</span>
        </div>
        <div className="restoration-grid">
          {siftShown.visible.map((a) => <RestorationCard key={a.id} s={s} a={a} />)}
        </div>
      </div>

      <div className="restoration-group">
        <div className="section-head">
          <h3>Relic Restorations</h3>
          <span className="dim small">Craft specialized gear and ancient relics from fragments & Artifacts</span>
        </div>
        <div className="restoration-grid">
          {restoreShown.visible.map((a) => <RestorationCard key={a.id} s={s} a={a} />)}
        </div>
      </div>
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
      <span className="ware-shelf dim small num" title="Left on the shelf. It fills back up over time">
        {wareLeft(s, w)}/{w.shelf}
      </span>
      <span className="ware-cost small">
        <MatIcon id={culture.artifact} size={12} /> <span className="num">{fmt(warePrice(s, w))}</span>
      </span>
      <div className="ware-actions">
        <button className="btn sm" disabled={!!reason} title={reason ?? ''} onClick={() => game.act((st, ctx) => buyWare(st, ctx, w.id))}>
          Buy
        </button>
        <button className={`btn sm ${ordered ? 'selected' : ''}`} title="Buy this by itself whenever the Artifacts and the shelf allow, even while you're away. One order per merchant" onClick={() => game.act((st) => setOrder(st, w.id))}>
          {ordered ? 'On order' : 'Order'}
        </button>
      </div>
    </div>
  );
}

function MerchantCard({ s, culture }: { s: GameState; culture: CultureDef }) {
  const have = standing(s, culture.id);
  const { open, next } = shelvesFor(s, culture.id);
  const fragId = relicFragment(culture.id);
  const frags = s.storage.bank[fragId] ?? 0;
  const digsToNext = 60 - ((s.professionProgress.counters[`archaeology.fragments.${culture.id}`] ?? 0) % 60);

  return (
    <div className="card merchant-card" style={{ ['--site' as string]: culture.color }}>
      <div className="merchant-head">
        <div>
          <div className="dig-kicker">{culture.name}</div>
          <h4 className="merchant-name">{culture.merchant}</h4>
        </div>
        <Badge tone="neutral">Standing {have} / {MAX_STANDING}</Badge>
      </div>

      <ProgressBar
        value={Math.min(1, have / MAX_STANDING)}
        color={culture.color}
        className="merchant-standing-bar"
      />

      <div className="merchant-balance">
        <span className="small dim">{culture.deals}</span>
        <span className="merchant-currency num">
          <MatIcon id={culture.artifact} size={14} />
          <b>{fmt(s.storage.bank[culture.artifact] ?? 0)}</b>
          <span className="small dim">{culture.artifactName}</span>
        </span>
      </div>

      <div className="merchant-fragments">
        <div className="merchant-frag-info">
          <MatIcon id={fragId} size={16} />
          <div>
            <div className="small">
              <b>{fmt(frags)}</b> Relic fragments{' '}
              <HelpTip tip="You earn 1 Relic fragment every 60 digs at this culture's sites. Trade 5 fragments for 25 Artifacts." />
            </div>
            <div className="small dim">{digsToNext} matching digs to next fragment</div>
          </div>
        </div>
        <button className="btn sm primary" disabled={frags < 5} onClick={() => game.act((st, ctx) => exchangeFragments(st, ctx, culture.id))}>
          Exchange 5 → 25
        </button>
      </div>

      <div className="merchant-wares">
        {open.map((w) => (
          <WareRow key={w.id} s={s} culture={culture} w={w} />
        ))}
      </div>

      {next && (
        <p className="lock-note small" style={{ margin: 0 }}>
          Next shelf: <b>{materialDef(next.item).name}</b> at standing {next.standing}. Finds at {SITES.filter((x) => x.culture === culture.id && !x.relic).map((x) => x.name).join(' and ')} raise it.
        </p>
      )}
    </div>
  );
}

/** Archaeology's board: the Expedition Trail and its digs, the Relic Forge, and the merchants who take what comes up. */
export function ExpeditionBoard({ view = 'desk' }: { view?: 'desk' | 'codex' | 'relics' | 'merchants' }) {
  const s = useGame();
  if (!expeditionOpen(s)) {
    return <div className="callout skill-note">The dig sites are up in the Hollow Peaks, in {EXPEDITION_GATE.label}. Reach them to start digging.</div>;
  }
  if (view === 'desk') {
    return (
      <>
        <DeskView />
        <TrailView s={s} />
      </>
    );
  }
  if (view === 'codex') return <CodexView />;
  if (view === 'relics') {
    return (
      <>
        <SkillIntro step="Relics">
          Turn what you dig up into gear: sift and restore on the field bench, and late on, build relics of your own at the Relic Forge.
        </SkillIntro>
        <RestorationView s={s} />
        <ForgeView s={s} />
      </>
    );
  }
  return (
    <section className="expedition">
      <SkillIntro step="Merchants">
        Each people's merchant takes their own Artifacts. Finds at that people's dig sites raise your standing and open better shelves.
      </SkillIntro>
      <div className="section-head">
        <h3>Merchants</h3>
        <span className="dim small">{fmt(s.expedition.tally.traded)} traded · the emptier a shelf, the dearer it gets</span>
      </div>
      <div className="card-grid" style={{ ['--card-min' as string]: '360px', gap: 10 }}>
        {CULTURES.map((c) => (
          <MerchantCard key={c.id} s={s} culture={c} />
        ))}
      </div>
    </section>
  );
}
