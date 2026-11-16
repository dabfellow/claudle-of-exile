import { useMemo, useState } from 'react';
import { PROFESSION_PROJECTS, professionTheme, type ProfessionProject, type ProjectReward } from '../../data/professionProjects';
import { materialDef } from '../../data/materials';
import { baseDef, uniqueDef, WEAPON_FAMILIES } from '../../data/bases';
import { flaskDef } from '../../data/flasks';
import { uniqueMapDef } from '../../data/maps';
import { affixDef } from '../../data/affixes';
import { SKILLS } from '../../data/skills';
import { cancelProject, hasAccomplishment, isEligibleProjectBase, projectPreview, resumeProject, startProject } from '../../engine/professions';
import { levelOf } from '../../engine/xp';
import { masteryLevel } from '../../engine/skillingMastery';
import { describeUniqueModDef } from '../../engine/items';
import type { GameState, SkillId } from '../../engine/types';
import { game, useGame } from '../../game';
import { anyArtUrl, Badge, fmt, fmtTime, MatIcon, ProgressBar } from './common';
import { Icon } from './Icon';
import { cleanProjectDesc, resolveBaseSource, resolveMaterialSource } from './projectHelpers';

function getSkillIcon(skill: SkillId): string {
  switch (skill) {
    case 'smithing':
      return 'forge';
    case 'mining':
      return 'mining';
    case 'woodcutting':
      return 'woodcutting';
    case 'harvesting':
      return 'harvesting';
    case 'alchemy':
      return 'alchemy';
    case 'gemcutting':
      return 'gemcutting';
    case 'cooking':
      return 'heart';
    case 'fishing':
      return 'fishing';
    case 'cartography':
      return 'map';
    case 'thieving':
      return 'skull';
    case 'archaeology':
      return 'book';
    case 'runecarving':
      return 'bolt';
    default:
      return 'target';
  }
}

function getStationName(id: string): string {
  if (id === 'forge') return 'Forge';
  if (id === 'alchemy_table') return 'Alchemy Table';
  if (id === 'rune_board') return 'Rune Board';
  return id.replace('_', ' ');
}

function RewardArt({ reward }: { reward: ProjectReward }) {
  if (reward.category === 'equipment') {
    const art = anyArtUrl(`items/${reward.baseId}`) ?? anyArtUrl(`bases/${reward.baseId}`);
    if (art) return <img src={art} alt={reward.name ?? reward.baseId} draggable={false} />;
    const slot = baseDef(reward.baseId).slot;
    return <Icon name={slot ?? 'weapon'} size={26} color="var(--accent-2)" />;
  }
  if (reward.category === 'flask') {
    const art = anyArtUrl(`flasks/${reward.flaskId}`);
    if (art) return <img src={art} alt={reward.name ?? reward.flaskId} draggable={false} />;
    return <Icon name="alchemy" size={26} color="var(--unique)" />;
  }
  if (reward.category === 'chart') {
    const art = anyArtUrl(`maps/${reward.id}`);
    if (art) return <img src={art} alt={reward.id} draggable={false} />;
    return <Icon name="map" size={26} color="var(--accent)" />;
  }
  const firstMat = Object.keys(reward.materials)[0];
  if (firstMat) return <MatIcon id={firstMat} size={28} />;
  return <Icon name="target" size={26} color="var(--accent)" />;
}

function RewardOutcome({ reward }: { reward: ProjectReward }) {
  if (reward.category === 'equipment') {
    const base = baseDef(reward.baseId);
    const u = reward.uniqueId ? uniqueDef(reward.uniqueId) : null;
    const name = reward.name ?? u?.name ?? base.name;
    const rarClass = `rar-${reward.rarity}`;
    const slotDesc = base.family ? `${base.twoHanded ? 'Two-handed ' : ''}${WEAPON_FAMILIES[base.family]?.name ?? base.slot}` : base.slot;

    return (
      <div className={`project-reward-card ${rarClass}`}>
        <div className="project-reward-head">
          <span className={`project-reward-name ${rarClass}`}>{name}</span>
          <Badge tone={reward.rarity === 'unique' ? 'gold' : reward.rarity === 'magic' ? 'neutral' : 'neutral'}>
            ilvl {reward.ilvl}
          </Badge>
        </div>
        <div className="dim small">{slotDesc}</div>
        <div className="project-reward-mods">
          {u?.mods.map((m, idx) => (
            <div key={idx} className="project-reward-mod-line">
              {describeUniqueModDef(m)}
            </div>
          ))}
          {reward.fixedSuffixes?.map((s, idx) => {
            const a = affixDef(s.affixId);
            const text = a.text.replace(/\{0\}/g, String(s.values[0]));
            return (
              <div key={idx} className="project-reward-mod-line">
                +{text}
              </div>
            );
          })}
          {u?.flavour && <div className="project-reward-mod-line unique-flavour">"{u.flavour}"</div>}
        </div>
        <div className="project-reward-delivery">
          <Icon name="target" size={12} /> Delivered to Inventory (full bag pauses delivery)
        </div>
      </div>
    );
  }

  if (reward.category === 'flask') {
    const f = flaskDef(reward.flaskId);
    const name = reward.name ?? f.name;
    const kindLabel = f.kind.charAt(0).toUpperCase() + f.kind.slice(1);

    return (
      <div className="project-reward-card rar-unique">
        <div className="project-reward-head">
          <span className="project-reward-name rar-unique">{name}</span>
          <Badge tone="gold">ilvl {reward.ilvl}</Badge>
        </div>
        <div className="dim small">
          Unique {kindLabel} Flask · {f.chargesPerUse} of {f.maxCharges} charges
        </div>
        <div className="project-reward-mods">
          <div className="project-reward-mod-line">{f.desc}</div>
          {f.flavour && <div className="project-reward-mod-line unique-flavour">"{f.flavour}"</div>}
        </div>
        <div className="project-reward-delivery">
          <Icon name="alchemy" size={12} /> Delivered directly to Flask Stash
        </div>
      </div>
    );
  }

  if (reward.category === 'chart') {
    const m = uniqueMapDef(reward.id);
    return (
      <div className="project-reward-card rar-unique">
        <div className="project-reward-head">
          <span className="project-reward-name rar-unique">{m.name}</span>
          <Badge tone="gold">Tier {m.tier}</Badge>
        </div>
        <div className="dim small">{m.desc}</div>
        <div className="project-reward-delivery">
          <Icon name="map" size={12} /> Delivered directly to Map Case
        </div>
      </div>
    );
  }

  return (
    <div className="project-reward-card">
      <div className="project-reward-head">
        <span className="project-reward-name">Crafted Materials</span>
        <Badge tone="neutral">Shared Storage</Badge>
      </div>
      <div className="project-reward-materials-grid">
        {Object.entries(reward.materials).map(([id, n]) => (
          <span key={id} className="project-reward-mat-chip">
            <MatIcon id={id} size={15} />
            <b>{n > 1 ? `×${n} ` : ''}{materialDef(id).name}</b>
          </span>
        ))}
      </div>
      <div className="project-reward-delivery">
        <Icon name="stash" size={12} /> Delivered directly to Shared Bank
      </div>
    </div>
  );
}

function ProjectCard({
  p,
  s,
  go,
  theme,
}: {
  p: ProfessionProject;
  s: GameState;
  go?: (skill: SkillId) => void;
  theme: { title: string; singular: string; startLabel: string };
}) {
  const [repeats, setRepeats] = useState(1);
  const [selectedUid, setSelectedUid] = useState<number | undefined>(undefined);

  const needsBase = !!(p.baseId || p.baseIds);
  const eligibleBases = useMemo(
    () => (needsBase ? s.inventory.filter((i) => isEligibleProjectBase(p, i, s)) : []),
    [needsBase, p, s],
  );

  const activeUid = useMemo(() => {
    if (!needsBase) return undefined;
    if (selectedUid !== undefined && eligibleBases.some((i) => i.uid === selectedUid)) {
      return selectedUid;
    }
    return eligibleBases[0]?.uid;
  }, [needsBase, selectedUid, eligibleBases]);

  const preview = projectPreview(s, p.id, activeUid);
  const reason = preview.reason;

  const supply = Math.min(
    ...Object.entries(p.inputs).map(([id, n]) => Math.floor((s.account.bank[id] ?? 0) / n)),
  );
  const maxRuns = Math.min(100, Math.max(1, supply));

  const playerSkillLvl = levelOf(p.skill, s.skills[p.skill]);
  const hasSkillLvl = playerSkillLvl >= p.level;

  const stationLvl = p.station ? (s.account.hideout[p.station.id] ?? 1) : 0;
  const hasStation = !p.station || stationLvl >= p.station.level;

  const hasAcc = !p.accomplishments?.length || p.accomplishments.every((id) => hasAccomplishment(s, id));
  const hasMastery = !p.masteryRequirement || masteryLevel(s, p.masteryRequirement.id) >= p.masteryRequirement.level;

  const completed = s.professionProgress.projects[p.id]?.completed ?? 0;
  const discovered = !!(p.discovery && s.professionProgress.discoveries[p.discovery]);

  const rewardRarity = p.reward.category === 'equipment' || p.reward.category === 'flask' ? p.reward.rarity : undefined;
  const rarSlotClass = rewardRarity ? `rar-${rewardRarity}` : '';

  const isReady = !reason && (p.repeatable ? repeats <= supply : supply >= 1);
  const isLocked = !hasSkillLvl || !hasStation || !hasAcc || !hasMastery;

  const desc = cleanProjectDesc(p);
  const mappedSourceLabels = new Set<string>();
  const baseSource = needsBase ? resolveBaseSource(p) : undefined;
  if (baseSource) mappedSourceLabels.add(baseSource.label);

  const baseLabel = p.baseId
    ? baseDef(p.baseId).name
    : p.baseIds
      ? p.baseIds.map((id) => baseDef(id).name).join(' or ')
      : 'Base item';

  return (
    <div className={`project-card ${isReady ? 'ready' : ''} ${isLocked ? 'locked' : ''}`}>
      {/* Header */}
      <div className="project-card-head">
        <div className="project-card-title-col">
          <div className={`project-art-slot ${rarSlotClass}`}>
            <RewardArt reward={p.reward} />
          </div>
          <div className="project-title-info">
            <div className={`project-card-name ${rarSlotClass}`}>{p.name}</div>
            <div className="project-card-badges">
              {p.masteryRequirement && (
                <Badge tone={hasMastery ? 'success' : 'locked'} title={`${p.masteryRequirement.name}: mastery ${masteryLevel(s, p.masteryRequirement.id)}/${p.masteryRequirement.level}`}>
                  {p.masteryRequirement.name} · Mastery {p.masteryRequirement.level}
                </Badge>
              )}
              <Badge tone={hasSkillLvl ? 'success' : 'locked'} title={`Requires ${p.skill} level ${p.level}`}>
                Lvl {p.level}
              </Badge>
              {p.station && (
                <Badge
                  tone={hasStation ? 'neutral' : 'locked'}
                  title={`Requires ${getStationName(p.station.id)} level ${p.station.level}`}
                >
                  <Icon name="forge" size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                  {getStationName(p.station.id)} {p.station.level}
                </Badge>
              )}
              {p.accomplishments?.length && !hasAcc && (
                <Badge tone="locked" title="Missing required prerequisite accomplishments">
                  <Icon name="lock" size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                  Prerequisite Locked
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="project-card-head-right">
          {completed > 0 ? (
            <Badge tone="gold" title={`Completed ${completed} times`}>
              ★ Completed {completed}×
            </Badge>
          ) : (
            <Badge tone="neutral">New</Badge>
          )}
          {discovered && <Badge tone="gold">Discovered</Badge>}
          <Badge tone="neutral">{p.repeatable ? 'Repeatable' : 'One-Time Craft'}</Badge>
        </div>
      </div>

      {/* Meta Stats Strip */}
      <div className="project-meta-strip">
        <span className="project-meta-item time">
          <Icon name="clock" size={13} color="var(--dim)" />
          {fmtTime(p.durationMs)} work
        </span>
        <span className="project-meta-item xp">
          <Icon name="bolt" size={13} color="var(--accent-2)" />
          +{fmt(p.xp)} XP
        </span>
        {p.workCycles !== undefined && (
          <span className="project-meta-item">
            <Icon name="target" size={13} color="var(--dim)" />
            {p.workCycles} cycles
          </span>
        )}
      </div>

      {/* Description / Lore */}
      {desc && <div className="project-desc-panel">{desc}</div>}

      {/* Warnings / Notes */}
      {preview.notes?.map((note) => (
        <div key={note} className="project-warn-banner">
          <Icon name="lock" size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{note}</span>
        </div>
      ))}

      {/* The Workbench: Inputs -> Output */}
      <div className="project-exchange-grid">
        {/* Left: Inputs */}
        <div className="project-workbench-panel">
          <div className="project-panel-label">
            <span>Required Materials</span>
            {supply > 0 ? (
              <Badge tone="success">In Stock ({supply} runs)</Badge>
            ) : (
              <Badge tone="danger">Missing Supplies</Badge>
            )}
          </div>

          <div className="project-inputs-list">
            {Object.entries(p.inputs).map(([id, costPerRun]) => {
              const totalCost = costPerRun * repeats;
              const bankCount = s.account.bank[id] ?? 0;
              const isMissing = bankCount < totalCost;
              const source = resolveMaterialSource(id, p.sources);
              if (source) mappedSourceLabels.add(source.label);

              const isClickable = Boolean(source && go);
              const clickTitle = source
                ? `${source.label} · Click to jump to ${SKILLS[source.skill]?.name ?? source.skill}`
                : materialDef(id).name;

              return (
                <div
                  key={id}
                  className={`project-input-row ${isMissing ? 'missing' : ''} ${isClickable ? 'clickable' : ''}`}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={() => {
                    if (isClickable && source) go?.(source.skill);
                  }}
                  onKeyDown={(e) => {
                    if (isClickable && source && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      go?.(source.skill);
                    }
                  }}
                  title={clickTitle}
                >
                  <div className="project-input-info">
                    <MatIcon id={id} size={16} />
                    <span className="project-input-name" title={materialDef(id).name}>
                      {materialDef(id).name}
                    </span>
                    {source && (
                      <span className="project-input-source-chip" title={source.label}>
                        <Icon name={getSkillIcon(source.skill)} size={11} />
                        <span className="dim">↗</span>
                      </span>
                    )}
                  </div>
                  <span className={`project-input-amounts ${isMissing ? 'insufficient' : 'sufficient'}`}>
                    {fmt(bankCount)} / {fmt(totalCost)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Base Item Selector if required */}
          {needsBase && (
            <div className="project-base-selector-box">
              <div className="project-panel-label" style={{ marginBottom: 0 }}>
                <span>Required Base Item</span>
                <span className="dim">{p.baseMinIlvl ? `ilvl ${p.baseMinIlvl}+` : ''}</span>
              </div>
              {eligibleBases.length > 0 ? (
                <select
                  aria-label={`${p.name} base`}
                  className="project-base-select"
                  value={activeUid ?? ''}
                  onChange={(e) => setSelectedUid(Number(e.target.value))}
                >
                  {eligibleBases.map((i) => (
                    <option key={i.uid} value={i.uid}>
                      {i.name || baseDef(i.baseId).name} (ilvl {i.ilvl}, {i.rarity})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="project-base-missing-alert">
                  <div>
                    ⚠️ No eligible <b>{baseLabel}</b> in inventory{p.baseMinIlvl ? ` (ilvl ${p.baseMinIlvl}+)` : ''}.
                  </div>
                  {baseSource && go && (
                    <button
                      type="button"
                      className="project-base-jump-btn"
                      onClick={() => go(baseSource.skill)}
                      title={baseSource.label}
                    >
                      <Icon name={getSkillIcon(baseSource.skill)} size={11} />
                      <span>{baseSource.label}</span>
                      <span className="dim">↗</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Exchange Arrow */}
        <div className="project-arrow-col">➔</div>

        {/* Right: Outcome */}
        <div className="project-workbench-panel">
          <div className="project-panel-label">
            <span>Crafted Outcome</span>
            <span className="dim">Reward</span>
          </div>
          <RewardOutcome reward={p.reward} />
        </div>
      </div>

      {/* Sources & Gathering Navigation (only unmapped general sources) */}
      {(() => {
        const unmappedSources = p.sources.filter((src) => !mappedSourceLabels.has(src.label));
        if (unmappedSources.length === 0) return null;
        return (
          <div className="project-sources-bar">
            <span>Sources:</span>
            {unmappedSources.map((source) => (
              <button
                key={source.label}
                className="project-source-chip"
                onClick={() => go?.(source.skill)}
                title={`Switch to ${source.skill}`}
              >
                <Icon name={getSkillIcon(source.skill)} size={12} />
                <span>{source.label}</span>
                <span className="dim">↗</span>
              </button>
            ))}
          </div>
        );
      })()}

      {/* Action Footer */}
      <div className="project-footer">
        {p.repeatable ? (
          <div className="project-runs-control">
            <span>Runs:</span>
            <div className="project-stepper">
              <button
                type="button"
                aria-label="Decrease runs"
                disabled={repeats <= 1}
                onClick={() => setRepeats((r) => Math.max(1, r - 1))}
              >
                −
              </button>
              <input
                aria-label={`${p.name} runs`}
                type="number"
                min={1}
                max={100}
                value={repeats}
                onChange={(e) => setRepeats(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              />
              <button
                type="button"
                aria-label="Increase runs"
                disabled={repeats >= 100}
                onClick={() => setRepeats((r) => Math.min(100, r + 1))}
              >
                +
              </button>
            </div>
            <button type="button" className="project-preset-btn" onClick={() => setRepeats(1)}>
              1
            </button>
            <button type="button" className="project-preset-btn" onClick={() => setRepeats(5)}>
              5
            </button>
            <button type="button" className="project-preset-btn" onClick={() => setRepeats(10)}>
              10
            </button>
            {supply > 1 && (
              <button type="button" className="project-preset-btn" onClick={() => setRepeats(maxRuns)}>
                Max ({maxRuns})
              </button>
            )}
          </div>
        ) : (
          <div className="dim small">Single craft (consumes once)</div>
        )}

        <div className="project-action-group">
          {reason && (
            <div className="project-blocker-note">
              <Icon name="lock" size={13} />
              <span>{reason}</span>
            </div>
          )}
          <button
            className="btn sm primary"
            disabled={!!reason}
            title={reason ?? ''}
            onClick={() => game.act((st, ctx) => startProject(st, ctx, p.id, repeats, activeUid))}
          >
            {theme.startLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectBoard({ skill, go }: { skill: SkillId; go?: (skill: SkillId) => void }) {
  return <>
    <ProjectCategoryBoard skill={skill} go={go} category="masteryBatch" />
    <ProjectCategoryBoard skill={skill} go={go} />
  </>;
}

function ProjectCategoryBoard({ skill, go, category }: { skill: SkillId; go?: (skill: SkillId) => void; category?: 'masteryBatch' }) {
  const s = useGame();
  const [filter, setFilter] = useState<'all' | 'ready' | 'completed'>('all');

  const projects = useMemo(() => PROFESSION_PROJECTS.filter((p) => p.skill === skill && p.category === category), [skill, category]);
  const activeRun = s.professionProgress.activeProject;
  // Resolve the category from current data so older saved batches appear on the right board.
  const runCategory = activeRun && (PROFESSION_PROJECTS.find((p) => p.id === activeRun.project.id) ?? activeRun.project).category;
  const run = activeRun?.project.skill === skill && runCategory === category ? activeRun : undefined;

  const theme = category === 'masteryBatch'
    ? { title: 'Mastery Batches', singular: 'batch', startLabel: 'Begin batch' }
    : professionTheme(skill);
  const skillIcon = getSkillIcon(skill);

  const readyCount = useMemo(() => {
    return projects.filter((p) => {
      const needsBase = !!(p.baseId || p.baseIds);
      const eligibleBases = needsBase ? s.inventory.filter((i) => isEligibleProjectBase(p, i, s)) : [];
      const uid = eligibleBases[0]?.uid;
      const preview = projectPreview(s, p.id, uid);
      return !preview.reason;
    }).length;
  }, [projects, s]);

  const completedCount = useMemo(() => {
    return projects.filter((p) => (s.professionProgress.projects[p.id]?.completed ?? 0) > 0).length;
  }, [projects, s]);

  const filteredProjects = useMemo(() => {
    if (filter === 'ready') {
      return projects.filter((p) => {
        const needsBase = !!(p.baseId || p.baseIds);
        const eligibleBases = needsBase ? s.inventory.filter((i) => isEligibleProjectBase(p, i, s)) : [];
        const uid = eligibleBases[0]?.uid;
        return !projectPreview(s, p.id, uid).reason;
      });
    }
    if (filter === 'completed') {
      return projects.filter((p) => (s.professionProgress.projects[p.id]?.completed ?? 0) > 0);
    }
    return projects;
  }, [projects, filter, s]);

  // Keep old paid Copper Supply runs resumable, but new batches use ordinary craft actions.
  if ((!projects.length || category === 'masteryBatch') && !run) return null;

  return (
    <section className="card project-board-section">
      {/* Board Header */}
      <div className="project-board-head">
        <div className="project-board-title-group">
          <div className="project-board-icon">
            <Icon name={skillIcon} size={22} />
          </div>
          <h3 className="project-board-heading">{theme.title}</h3>
        </div>

        <div className="project-board-summary">
          <Badge tone="neutral">{projects.length} Total {category === 'masteryBatch' ? 'Batches' : 'Projects'}</Badge>
          {readyCount > 0 && <Badge tone="success">{readyCount} Ready to Craft</Badge>}
          {completedCount > 0 && <Badge tone="gold">{completedCount} Completed</Badge>}
        </div>
      </div>

      {/* Guidelines Banner */}
      <div className="project-board-desc-banner">
        <Icon name="book" size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent)' }} />
        <div>
          {category === 'masteryBatch' && <><b>Mastery Reward:</b> Unlock each 5× batch at mastery 15 in its matching craft. </>}
          <b>Workbench Rules:</b> Inputs are safely reserved in escrow upon starting. Crafts occupy your active
          action slot. Pausing preserves progress; cancelling returns all reserved inputs in full.
        </div>
      </div>

      {/* Active Undertaking Showcase */}
      {run?.project.skill === skill && (
        <div className="project-active-card">
          <div className="project-active-header">
            <div className="project-active-title">
              <Icon name="bolt" size={16} color="var(--accent)" />
              <span>{run.project.name}</span>
              <Badge tone={run.status === 'return' ? 'danger' : s.action?.kind === 'project' ? 'success' : 'warn'}>
                {run.status === 'return'
                  ? 'Space Needed'
                  : run.stopReason ?? (s.action?.kind === 'project' ? 'Working' : 'Paused')}
              </Badge>
            </div>
            <div className="project-active-time">
              <Icon name="clock" size={14} />
              <span>{fmtTime(Math.max(0, run.project.durationMs - run.elapsedMs))} left</span>
              <span className="dim">·</span>
              <span className="dim">{run.remaining} run(s) queued</span>
            </div>
          </div>

          <ProgressBar value={run.elapsedMs / run.project.durationMs} color="var(--accent)" smooth />

          <div className="project-active-escrow">
            <span className="dim">Reserved:</span>
            {Object.entries(run.escrow).map(([id, n]) => (
              <span key={id} className="chip">
                <MatIcon id={id} size={14} />
                <b>{n}</b> {materialDef(id).name}
              </span>
            ))}
            {run.item && (
              <span className="chip">
                <Icon name="weapon" size={14} />
                <b>{run.item.name || baseDef(run.item.baseId).name}</b> (ilvl {run.item.ilvl})
              </span>
            )}
          </div>

          <div className="project-active-actions">
            <button
              className="btn sm primary"
              disabled={run.status === 'return'}
              onClick={() => game.act((st) => resumeProject(st))}
            >
              Resume Work
            </button>
            <button className="btn sm" onClick={() => game.act((st) => cancelProject(st))}>
              {run.status === 'return' ? 'Collect original base' : 'Cancel and return inputs'}
            </button>
          </div>
        </div>
      )}

      {/* Filters (if more than 2 projects) */}
      {projects.length > 2 && (
        <div className="project-filter-strip">
          <div className="tabs compact">
            <button
              className={`tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({projects.length})
            </button>
            <button
              className={`tab ${filter === 'ready' ? 'active' : ''}`}
              onClick={() => setFilter('ready')}
            >
              Ready ({readyCount})
            </button>
            <button
              className={`tab ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Completed ({completedCount})
            </button>
          </div>
        </div>
      )}

      {/* Project Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        {filteredProjects.filter((p) => p.category !== 'masteryBatch').map((p) => (
          <ProjectCard key={p.id} p={p} s={s} go={go} theme={theme} />
        ))}
      </div>
    </section>
  );
}
