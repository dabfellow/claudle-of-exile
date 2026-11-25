import { useState, type CSSProperties } from 'react';
import { baseDef, WEAPON_FAMILIES } from '../../data/bases';
import { materialDef } from '../../data/materials';
import { MASTERWORK_RANKS, MASTERWORKS, MASTERY_UNLOCK, type MasterworkPerk, type MasterworkRank, type ProfessionProject } from '../../data/professionProjects';
import { SKILLS } from '../../data/skills';
import { recipeMaterialCount } from '../../engine/bank';
import { cancelProject, isRetiredRun, MASTERY_SKILLS, masterySkillsReady, masteryUnlocked, professionAccessReason, projectPreview, resumeProject, startProject } from '../../engine/professions';
import { skillLevel } from '../../engine/skills';
import type { GameState, SkillId } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, fmt, fmtTime, GameIcon, MatIcon, ProgressBar } from '../components/common';
import { UseBarGrade } from '../components/FurnaceView';
import { resolveMaterialSource } from '../components/projectHelpers';
import { ITEM_ART } from '../itemArt';
import type { Page } from '../Layout';
import './mastery.css';

const RANKS: MasterworkRank[] = ['adept', 'master', 'grandmaster'];

const PERK_TEXT: Record<MasterworkPerk, { name: string; text: string }> = {
  voidSlot: { name: 'Void Slot', text: 'A seventh modifier slot, filled with another Tier 1 modifier.' },
  doomImplicit: { name: 'Doom Implicit', text: 'One Doom Implicit, as an Architect’s Doom Sigil gives.' },
  doomTier: { name: 'Doom Tier', text: 'One modifier raised to Tier 0, 30% stronger than Tier 1.' },
};


function slotName(baseId: string): string {
  const b = baseDef(baseId);
  if (b.family) return `${b.twoHanded ? 'Two-handed ' : ''}${WEAPON_FAMILIES[b.family].name}`;
  return { offhand: 'Shield', body: 'Body Armour', helmet: 'Helmet', gloves: 'Gloves', boots: 'Boots', ring: 'Ring', amulet: 'Amulet', belt: 'Belt', weapon: 'Weapon' }[b.slot] ?? b.slot;
}

function baseOf(p: ProfessionProject) {
  return baseDef(p.reward.category === 'equipment' ? p.reward.baseId : '');
}

function perksOf(p: ProfessionProject): MasterworkPerk[] {
  return p.reward.category === 'equipment' ? p.reward.perks ?? [] : [];
}

/** How much of the recipe's materials you hold, 0–1, each input counted up to what it needs. */
function stockShare(s: GameState, p: ProfessionProject): number {
  const parts = Object.entries(p.inputs).map(([id, n]) => Math.min(1, recipeMaterialCount(s.storage.bank, id) / n));
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

function skillsMet(s: GameState, p: ProfessionProject): boolean {
  return Object.entries(p.skillLevels ?? {}).every(([id, lvl]) => skillLevel(s, id as SkillId) >= (lvl ?? 0));
}

function ItemArt({ baseId, size }: { baseId: string; size: number }) {
  const url = ITEM_ART[baseId];
  if (url) return <img className="mw-art" src={url} alt="" width={size} height={size} draggable={false} />;
  return <GameIcon name={baseDef(baseId).slot} size={size * 0.6} />;
}

/** The sealed door: five sockets that light as life skills reach level 25. */
function SealedAtelier({ s }: { s: GameState }) {
  const ready = masterySkillsReady(s);
  const sorted = [...MASTERY_SKILLS].sort((a, b) => skillLevel(s, b) - skillLevel(s, a));
  const lit = Math.min(MASTERY_UNLOCK.skills, ready.length);
  return (
    <section className="mw-seal card">
      <div className="mw-seal-door" aria-hidden>
        <div className="mw-seal-ring">
          {Array.from({ length: MASTERY_UNLOCK.skills }, (_, i) => {
            const skill = ready[i];
            const angle = -90 + (360 / MASTERY_UNLOCK.skills) * i;
            return (
              <span
                key={i}
                className={`mw-socket ${skill ? 'lit' : ''}`}
                style={{ ['--a' as string]: `${angle}deg`, ['--c' as string]: skill ? SKILLS[skill].color : undefined } as CSSProperties}
              >
                {skill && <GameIcon name={skill} size={18} color="#120d08" />}
              </span>
            );
          })}
          <div className="mw-seal-core">
            <GameIcon name="lock" size={26} />
            <b>{lit}/{MASTERY_UNLOCK.skills}</b>
          </div>
        </div>
      </div>
      <div className="mw-seal-text">
        <div className="mw-kicker">The atelier is sealed</div>
        <h2>Master five crafts to open it</h2>
        <p className="muted">
          Masterworks take finds from several gathering skills, goods from your production benches and drops from the hardest fights.
          The door opens once {MASTERY_UNLOCK.skills} life skills reach level {MASTERY_UNLOCK.level}.
        </p>
        <div className="mw-seal-skills">
          {sorted.slice(0, 8).map((id) => {
            const lvl = skillLevel(s, id);
            const done = lvl >= MASTERY_UNLOCK.level;
            return (
              <div key={id} className={`mw-seal-skill ${done ? 'done' : ''}`}>
                <GameIcon name={id} size={14} color={SKILLS[id].color} />
                <span>{SKILLS[id].name}</span>
                <ProgressBar value={Math.min(1, lvl / MASTERY_UNLOCK.level)} color={done ? 'var(--accent)' : SKILLS[id].color} />
                <b className="num">{lvl}/{MASTERY_UNLOCK.level}</b>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** One display case in the gallery. */
function Vitrine({ p, s, selected, onPick }: { p: ProfessionProject; s: GameState; selected: boolean; onPick: () => void }) {
  const base = baseOf(p);
  const share = stockShare(s, p);
  const reason = professionAccessReason(s, p);
  const ready = !projectPreview(s, p.id).reason;
  const made = s.professionProgress.projects[p.id]?.completed ?? 0;
  const running = s.professionProgress.activeProject?.project.id === p.id;
  return (
    <button type="button" className={`mw-vitrine rank-${p.rank} ${selected ? 'selected' : ''} ${ready ? 'ready' : ''} ${reason ? 'sealed' : ''}`} onClick={onPick} aria-pressed={selected}>
      <span className="mw-vitrine-glass">
        <ItemArt baseId={base.id} size={56} />
        <svg className="mw-vitrine-ring" viewBox="0 0 36 36" aria-hidden>
          <circle cx="18" cy="18" r="16" pathLength={100} className="track" />
          <circle cx="18" cy="18" r="16" pathLength={100} className="fill" strokeDasharray={`${share * 100} 100`} />
        </svg>
      </span>
      <span className="mw-vitrine-name">{p.name}</span>
      <span className="mw-vitrine-meta">
        {running ? <Badge tone="success" live>Crafting</Badge>
          : ready ? <Badge tone="gold">Ready</Badge>
          : reason && !skillsMet(s, p) ? <Badge tone="locked">Skills needed</Badge>
          : <span className="dim small">{Math.round(share * 100)}% stocked</span>}
        {made > 0 && <span className="mw-made" title={`Made ${made} times`}>★{made}</span>}
      </span>
    </button>
  );
}

function Requirements({ p, s }: { p: ProfessionProject; s: GameState }) {
  return (
    <div className="mw-reqs">
      {Object.entries(p.skillLevels ?? {}).map(([id, lvl]) => {
        const skill = id as SkillId;
        const have = skillLevel(s, skill);
        const ok = have >= (lvl ?? 0);
        return (
          <span key={id} className={`mw-req ${ok ? 'ok' : ''}`} title={`${SKILLS[skill].name}: level ${have} of ${lvl}`}>
            <GameIcon name={skill} size={13} color={ok ? SKILLS[skill].color : undefined} />
            {SKILLS[skill].name} <b className="num">{lvl}</b>
          </span>
        );
      })}
    </div>
  );
}

function Materials({ p, s, go }: { p: ProfessionProject; s: GameState; go: (page: Page) => void }) {
  return (
    <ul className="mw-mats">
      {Object.entries(p.inputs).map(([id, need]) => {
        const have = recipeMaterialCount(s.storage.bank, id);
        const source = resolveMaterialSource(id, p.sources);
        const done = have >= need;
        const jump = source && source.skill !== 'combat' ? source.skill : null;
        return (
          <li key={id} className={`mw-mat ${done ? 'done' : ''}`}>
            <MatIcon id={id} size={18} />
            <div className="mw-mat-body">
              <div className="mw-mat-line">
                <span className="mw-mat-name">{materialDef(id).name}</span>
                <b className="num">{fmt(Math.min(have, need))}/{fmt(need)}</b>
              </div>
              <ProgressBar value={Math.min(1, have / need)} color={done ? 'var(--good)' : 'var(--accent)'} />
              {source && (
                jump ? (
                  <button type="button" className="mw-mat-source" onClick={() => go(jump)} title={`Go to ${SKILLS[jump].name}`}>
                    <GameIcon name={jump} size={11} color={SKILLS[jump].color} /> {source.label} <span aria-hidden>↗</span>
                  </button>
                ) : (
                  <span className="mw-mat-source"><GameIcon name="combat" size={11} /> {source.label}</span>
                )
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The workbench for the chosen masterwork: what it makes, what it needs, and the button. */
function MasterworkBench({ p, s, go }: { p: ProfessionProject; s: GameState; go: (page: Page) => void }) {
  const base = baseOf(p);
  const perks = perksOf(p);
  const reason = projectPreview(s, p.id).reason;
  const rank = MASTERWORK_RANKS[p.rank ?? 'adept'];
  const defence = [base.armour && `${base.armour} Armour`, base.evasion && `${base.evasion} Evasion`, base.energyShield && `${base.energyShield} Energy Shield`].filter(Boolean).join(' · ');
  const made = s.professionProgress.projects[p.id]?.completed ?? 0;
  return (
    <section className={`mw-bench card rank-${p.rank}`} aria-label={p.name}>
      <header className="mw-bench-head">
        <div className="mw-bench-plinth">
          <ItemArt baseId={base.id} size={96} />
        </div>
        <div className="mw-bench-title">
          <div className="mw-kicker">{rank.name} masterwork · {slotName(base.id)}</div>
          <h2>{p.name}</h2>
          <p className="mw-lore">{p.use}</p>
        </div>
      </header>

      <div className="mw-item-card">
        <div className="mw-item-line dim small">
          {base.phys ? `${base.phys[0]}–${base.phys[1]} Physical Damage · ${base.crit}% crit` : defence || 'Jewellery'}
          {' · '}Item level 86 · Level {base.reqLevel}
        </div>
        {(base.implicits ?? []).filter((i) => i.text).map((i) => <div key={i.text} className="mw-implicit">{i.text}</div>)}
        <div className="mw-divider" />
        <div className="mw-tier-line"><span className="mw-t1">T1</span> Six modifiers, every one at its top tier</div>
        {perks.map((perk) => (
          <div key={perk} className={`mw-perk perk-${perk}`}>
            <b>{PERK_TEXT[perk].name}</b> {PERK_TEXT[perk].text}
          </div>
        ))}
        <p className="dim small mw-reroll">Rerolled with orbs, it stays a masterwork: every new modifier is Tier 1 too, and a Chaos Orb gives six.</p>
      </div>

      <div className="mw-section-label">Mastery required</div>
      <Requirements p={p} s={s} />

      <div className="mw-section-label">Materials</div>
      <Materials p={p} s={s} go={go} />
      {Object.keys(p.inputs).some((id) => id.endsWith('_bar')) && <UseBarGrade label="Spend this bar quality first" />}

      <footer className="mw-bench-foot">
        <span className="mw-foot-stat"><GameIcon name="clock" size={13} /> {fmtTime(p.durationMs)} of work</span>
        <span className="mw-foot-stat"><GameIcon name={p.skill} size={13} color={SKILLS[p.skill].color} /> +{fmt(p.xp)} {SKILLS[p.skill].name} XP</span>
        {made > 0 && <span className="mw-foot-stat">★ Made {made}×</span>}
        <span className="spacer" />
        {reason && <span className="mw-blocker"><GameIcon name="lock" size={12} /> {reason}</span>}
        <button type="button" className="btn primary" disabled={!!reason} title={reason ?? ''} onClick={() => game.act((st, ctx) => startProject(st, ctx, p.id, 1))}>
          Begin masterwork
        </button>
      </footer>
    </section>
  );
}

/** Whatever project is underway: a masterwork, or an older one from before Masterworks moved here. */
function ActiveWork({ s }: { s: GameState }) {
  const run = s.professionProgress.activeProject;
  if (!run) return null;
  const retired = isRetiredRun(run);
  const working = s.action?.kind === 'project';
  const left = Math.max(0, run.project.durationMs - run.elapsedMs);
  return (
    <section className={`mw-active card ${retired ? 'retired' : ''}`}>
      <div className="mw-active-head">
        <GameIcon name={run.project.skill} size={18} color={SKILLS[run.project.skill].color} />
        <b>{run.project.name}</b>
        {retired ? <Badge tone="warn">Retired recipe</Badge>
          : <Badge tone={run.status === 'return' ? 'danger' : working ? 'success' : 'warn'} live={working}>{run.status === 'return' ? 'Space needed' : run.stopReason ?? (working ? 'Working' : 'Paused')}</Badge>}
        <span className="spacer" />
        {!retired && <span className="dim small">{fmtTime(left)} left</span>}
      </div>
      {retired ? (
        <p className="small muted">The old masterworks have been taken out. Cancel this one to get every reserved material back in full.</p>
      ) : (
        <ProgressBar value={run.elapsedMs / run.project.durationMs} color="var(--accent)" smooth />
      )}
      <div className="mw-active-actions">
        {!retired && <button type="button" className="btn sm primary" disabled={working || run.status === 'return'} onClick={() => game.act((st) => resumeProject(st))}>Resume</button>}
        <button type="button" className="btn sm" onClick={() => game.act((st) => cancelProject(st))}>
          {run.status === 'return' ? 'Collect original base' : 'Cancel and return materials'}
        </button>
      </div>
    </section>
  );
}

/**
 * Masterworks: its own page under Mastery. Sealed until five life skills reach level 25; then ten masterworks in
 * three ranks, each asking for high-level finds from several gathering skills, production goods and a rare drop.
 */
export function MasteryPage({ go }: { go: (page: Page) => void }) {
  const s = useGame();
  const unlocked = masteryUnlocked(s);
  const activeId = s.professionProgress.activeProject?.project.id;
  const [picked, setPicked] = useState<string>(() => MASTERWORKS.find((p) => p.id === activeId)?.id ?? MASTERWORKS[0].id);
  const chosen = MASTERWORKS.find((p) => p.id === picked) ?? MASTERWORKS[0];
  const made = MASTERWORKS.filter((p) => (s.professionProgress.projects[p.id]?.completed ?? 0) > 0).length;

  return (
    <div className="page profession-page mastery-page" style={{ ['--profession' as string]: 'var(--accent)' }}>
      <div className="card profession-header mw-header" style={{ ['--skill' as string]: 'var(--accent)' }}>
        <div className="profession-header-icon">
          <GameIcon name="forge" size={32} color="var(--accent)" />
        </div>
        <div className="profession-header-text" style={{ minWidth: 0 }}>
          <h1>Masterworks</h1>
          <p>Gear that only knows Tier 1</p>
        </div>
        <div className="xp">
          <div className="row">
            <span className="spacer" />
            {unlocked ? <Badge tone="gold">{made}/{MASTERWORKS.length} mastered</Badge> : <Badge tone="locked">Sealed</Badge>}
          </div>
          <div className="dim small">Each one draws on three or more gathering skills at level 60+, a production craft and a rare drop.</div>
        </div>
      </div>

      <ActiveWork s={s} />

      {!unlocked ? (
        <>
          <SealedAtelier s={s} />
          <div className="mw-gallery sealed-preview" aria-label="Masterworks to come">
            {MASTERWORKS.map((p) => (
              <div key={p.id} className={`mw-vitrine silhouette rank-${p.rank}`}>
                <span className="mw-vitrine-glass"><ItemArt baseId={baseOf(p).id} size={56} /></span>
                <span className="mw-vitrine-name">{p.name}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mw-layout">
          <div className="mw-gallery-col">
            {RANKS.map((rank) => (
              <section key={rank} className={`mw-rank rank-${rank}`}>
                <div className="mw-rank-head">
                  <span className="mw-rank-name">{MASTERWORK_RANKS[rank].name}</span>
                  <span className="dim small">{MASTERWORK_RANKS[rank].blurb}</span>
                </div>
                <div className="mw-gallery">
                  {MASTERWORKS.filter((p) => p.rank === rank).map((p) => (
                    <Vitrine key={p.id} p={p} s={s} selected={p.id === chosen.id} onPick={() => setPicked(p.id)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
          <MasterworkBench p={chosen} s={s} go={go} />
        </div>
      )}
    </div>
  );
}
