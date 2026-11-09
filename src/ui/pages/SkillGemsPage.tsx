import { useState } from 'react';
import {
  activeGemDef,
  RULE_LABELS,
  SKILL_AIMS,
  SKILL_BAR_SLOTS,
  SKILL_PRIORITIES,
  SUPPORT_GEMS,
  supportGemDef,
  TARGET_STATUSES,
  type GemAttr,
  type RuleCondition,
  type SkillAim,
  type TacticRule,
  type TargetStatus,
} from '../../data/gems';
import { actOpen } from '../../data/zones';
import { gemArrived } from '../../engine/progress';
import { aimLockReason, castOrder, GROUND_IN_PLAY, ruleLockReason, ruleSlots, suggestedRule } from '../../engine/automation';
import { GROUND } from '../../engine/battlefield';
import type { GroundKind } from '../../engine/types';
import {
  expandSockets,
  gemUseReason,
  gemProgress,
  skillNumbers,
  placeOnBar,
  removeFromBar,
  removeRule,
  setAim,
  setPriority,
  setRule,
  socketSupport,
  supportFits,
  supportReason,
  supportSlots,
  syncSockets,
  unsocketSupport,
} from '../../engine/gems';
import { deriveStats } from '../../engine/stats';
import type { GameState, SkillGemInstance } from '../../engine/types';
import { game, useGame } from '../../game';
import { EmptyState, PageHeader, ProgressBar, Tabs, Tooltip } from '../components/common';
import { GEM_KINDS, GemFilters, kindMatches, type GemKind } from '../components/GemFilters';
import '../round2-session3.css';
import { GemIcon, GemTip, rulesLabel, ruleText, SupportTip } from '../components/GemView';
import { Icon } from '../components/Icon';
import { SkillSets } from '../components/Loadouts';

export const SKILL_KEYS = ['Q', 'W', 'E', 'R', 'T', 'Y'];

/** One rule slot. Locked rules stay in the list, greyed, so you can see what the War Table teaches. */
function RuleSlot({ s, slot, index, rule, extra }: { s: GameState; slot: number; index: number; rule: TacticRule; extra: boolean }) {
  const meta = RULE_LABELS[rule.when];
  const locked = ruleLockReason(s, rule.when);
  const options = (Object.keys(RULE_LABELS) as RuleCondition[]).filter((k) => (!extra || (k !== 'always' && k !== 'manual')) && (!RULE_LABELS[k].act || actOpen(RULE_LABELS[k].act)));
  const set = (next: TacticRule) => game.act((st) => setRule(st, slot, index, { ...next, aim: rule.aim }));
  return (
    <div className="rule-editor">
      <select
        className="input"
        value={rule.when}
        onChange={(e) => {
          const when = e.target.value as RuleCondition;
          set({ when, value: RULE_LABELS[when].defaultValue, status: RULE_LABELS[when].status ? 'bleeding' : undefined, ground: RULE_LABELS[when].ground ? 'burning' : undefined });
        }}
      >
        {options.map((k) => (
          <option key={k} value={k} disabled={!!ruleLockReason(s, k)}>
            {RULE_LABELS[k].label}
            {ruleLockReason(s, k) ? ' (locked)' : ''}
          </option>
        ))}
      </select>
      {meta.status && (
        <select className="input" value={rule.status ?? 'bleeding'} onChange={(e) => set({ when: rule.when, status: e.target.value as TargetStatus })}>
          {TARGET_STATUSES.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
      )}
      {meta.ground && (
        <select className="input" value={rule.ground ?? 'burning'} onChange={(e) => set({ when: rule.when, ground: e.target.value as GroundKind })}>
          {(Object.keys(GROUND) as GroundKind[]).map((k) => (
            <option key={k} value={k} disabled={!GROUND_IN_PLAY.has(k)}>
              {GROUND[k].name}
              {GROUND_IN_PLAY.has(k) ? '' : ' (nothing lays this yet)'}
            </option>
          ))}
        </select>
      )}
      {meta.unit !== undefined && (
        <span className="row" style={{ gap: 4 }}>
          <input
            className="input"
            type="number"
            min={0}
            max={meta.max ?? (meta.unit === '%' ? 100 : 5)}
            value={rule.value ?? meta.defaultValue}
            onChange={(e) => set({ when: rule.when, value: Number(e.target.value) })}
            style={{ width: 64 }}
          />
          <span className="dim">{meta.unit}</span>
        </span>
      )}
      {locked && <span className="chip bad">{locked}</span>}
      {extra && (
        <button className="btn sm ghost" title="Remove this rule" onClick={() => game.act((st) => removeRule(st, slot, index))}>
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
}

/** Where the skill's rules send it. Guards and buffs don't hit anyone, so they have no aim. */
function RuleAim({ s, slot, gem }: { s: GameState; slot: number; gem: SkillGemInstance }) {
  const { weaponPct, base } = activeGemDef(gem.gemId).effect;
  if (!weaponPct && !base) return null;
  const locked = aimLockReason(s);
  return (
    <div className="rule-editor">
      <span className="dim small">Aim at</span>
      <select
        className="input"
        value={gem.rules.find((r) => r.aim)?.aim ?? ''}
        disabled={!!locked}
        onChange={(e) => game.act((st) => setAim(st, slot, (e.target.value || undefined) as SkillAim | undefined))}
      >
        <option value="">The usual target</option>
        {SKILL_AIMS.map((x) => (
          <option key={x.id} value={x.id}>
            {x.label}
          </option>
        ))}
      </select>
      {locked && <span className="chip bad">{locked}</span>}
    </div>
  );
}

function RuleEditor({ s, slot, gem }: { s: GameState; slot: number; gem: SkillGemInstance }) {
  const suggested = suggestedRule(s, activeGemDef(gem.gemId));
  const manual = gem.rules[0].when === 'manual';
  const canAdd = !manual && gem.rules.length < ruleSlots(s);
  return (
    <>
      {gem.rules.map((rule, i) => (
        <div key={i}>
          {i > 0 && <div className="rule-join">and</div>}
          <RuleSlot s={s} slot={slot} index={i} rule={rule} extra={i > 0} />
        </div>
      ))}
      <RuleAim s={s} slot={slot} gem={gem} />
      <div className="rule-editor">
        {canAdd && (
          <button className="btn sm" title="Fire only when this rule passes too" onClick={() => game.act((st) => setRule(st, slot, gem.rules.length, { when: 'bossOnly' }))}>
            + Add a rule
          </button>
        )}
        {manual && suggested.when !== 'manual' && (
          <button className="btn sm ghost" title="Automate this skill with its suggested rule" onClick={() => game.act((st) => setRule(st, slot, 0, suggested))}>
            Suggested: {ruleText(suggested)}
          </button>
        )}
        {s.combat?.queued === slot && <span className="chip">queued</span>}
        <span className="dim small">
          {gem.rules.length} of {ruleSlots(s)} rule slots
        </span>
      </div>
    </>
  );
}

/** Who gets tried first, once priority, cooldowns and slots are all counted. */
function CastOrder({ s }: { s: GameState }) {
  const order = castOrder(s);
  if (order.length < 2) return null;
  return (
    <div className="cast-order small">
      <span className="dim">Cast order</span>
      {order.map((slot, i) => (
        <span key={slot} className="gem-chip">
          {i + 1}. {activeGemDef(s.skillBar[slot]!.gemId).name}
        </span>
      ))}
    </div>
  );
}

/**
 * The supports for the skill being set up, always in view under its sockets: the loose ones that fit, one click to
 * socket, then the ones that would fit if you found them.
 */
function SupportsForSkill({ s, gem, socket }: { s: GameState; gem: SkillGemInstance; socket: number | null }) {
  const act = activeGemDef(gem.gemId);
  const owned = s.account.supportGems.filter((g) => !supportReason(gem, g.supportId));
  // one entry per kind, even when several copies are in the bag
  const ownedKinds = [...new Map(owned.map((g) => [g.supportId, g])).values()].sort((a, b) => supportGemDef(a.supportId).name.localeCompare(supportGemDef(b.supportId).name));
  const copies = (id: string) => s.account.supportGems.filter((g) => g.supportId === id).length;
  const missing = SUPPORT_GEMS.filter((d) => supportFits(d, act) && gemArrived(s, d.id) && !s.account.supportGems.some((g) => g.supportId === d.id) && !gem.supports.some((x) => x?.supportId === d.id));
  const slots = supportSlots(gem);
  const firstEmpty = Array.from({ length: slots }, (_, i) => i).find((i) => !gem.supports[i]);
  const target = socket !== null && !gem.supports[socket] ? socket : firstEmpty;
  return (
    <div className="r2-fit-list">
      <div className="r2-fit-head">
        <b className="small">Your supports that fit {act.name}</b>
        <span className="dim small">{target === undefined ? 'All sockets are full: click a socketed support to take it out first.' : 'Click one to socket it.'}</span>
      </div>
      {ownedKinds.length === 0 && <div className="dim small">None of your loose support gems fit this skill.</div>}
      <div className="gem-bag r2-gem-grid">
        {ownedKinds.map((g) => {
          const def = supportGemDef(g.supportId);
          const n = copies(g.supportId);
          return (
            <Tooltip key={g.uid} content={<SupportTip supportId={g.supportId} />}>
              <button className="gem-card" disabled={target === undefined} onClick={() => game.act((st) => socketSupport(st, gem.uid, g.uid, target!))}>
                <GemIcon def={def} size={26} support />
                <span className="r2-gem-text">
                  <b>{def.name}</b>
                  {(def.signatureFor || n > 1) && <span className="dim small">{[def.signatureFor && 'Signature', n > 1 && `×${n}`].filter(Boolean).join(' · ')}</span>}
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>
      {missing.length > 0 && (
        <details className="r2-missing">
          <summary className="dim small">Also fits, not found yet ({missing.length})</summary>
          <div className="socket-picker-list">
            {missing.map((def) => (
              <Tooltip key={def.id} content={<SupportTip supportId={def.id} />}>
                <span className="gem-card missing">
                  <GemIcon def={def} size={22} support dim />
                  <span className="dim">{def.name}</span>
                </span>
              </Tooltip>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/** One slot of the bar, drawn like the combat skill bar: click to set it up, or to drop a picked gem in. */
function SlotTile({ s, slot, pickedGem, onOpen, onPlaced }: { s: GameState; slot: number; pickedGem: number | null; onOpen: () => void; onPlaced: () => void }) {
  const gem = s.skillBar[slot];
  const click = () => {
    if (pickedGem === null) return onOpen();
    if (!game.act((st) => placeOnBar(st, pickedGem, slot))) onPlaced();
  };
  if (!gem) {
    return (
      <button className={`skill-btn empty setup ${pickedGem !== null ? 'target' : ''}`} onClick={click}>
        <span className="slot-key">{SKILL_KEYS[slot]}</span>
        <span className="skill-prio">#{slot + 1}</span>
        <span className="dim small">{pickedGem !== null ? 'Place here' : 'Empty · click to add'}</span>
      </button>
    );
  }
  syncSockets(gem);
  const def = activeGemDef(gem.gemId);
  const stats = deriveStats(s, []);
  const nums = skillNumbers(stats, gem);
  const locked = gemUseReason(stats.combatLevel, stats.attributes, gem);
  return (
    <Tooltip content={<GemTip gem={gem} state={s} />}>
      <button className={`skill-btn setup ${pickedGem !== null ? 'target' : ''}`} onClick={click}>
        <span className="slot-key">{SKILL_KEYS[slot]}</span>
        <span className="skill-prio">#{slot + 1}</span>
        <span className="skill-gem">
          <GemIcon def={def} size={40} />
        </span>
        <span className="skill-name">{def.name}</span>
        <span className="skill-meta">
          Lv {gem.level} ·{' '}
          {nums.lifeCost > 0 && <span style={{ color: 'var(--life-2)' }}>{nums.lifeCost} life </span>}
          {nums.manaCost > 0 && <span style={{ color: 'var(--mana-2)' }}>{nums.manaCost} mana</span>}
          {!nums.lifeCost && !nums.manaCost && <span className="dim">free</span>}
        </span>
        <span className="skill-supports">
          {Array.from({ length: supportSlots(gem) }, (_, i) => {
            const sup = gem.supports[i];
            return sup ? <GemIcon key={i} def={supportGemDef(sup.supportId)} size={16} support /> : <span key={i} className="socket-dot" />;
          })}
        </span>
        <span className="skill-rule" style={locked ? { color: 'var(--life-2)' } : undefined}>{locked ?? rulesLabel(s, gem.rules)}</span>
      </button>
    </Tooltip>
  );
}

/** The support sockets of one skill: click a filled one to take it out, an empty one to see what fits. */
function Sockets({ s, gem, pickedSupport, onPlaced }: { s: GameState; gem: SkillGemInstance; pickedSupport: number | null; onPlaced: () => void }) {
  const [openSocket, setOpenSocket] = useState<number | null>(null);
  const sockets = supportSlots(gem);
  const pickedDef = pickedSupport !== null ? s.account.supportGems.find((x) => x.uid === pickedSupport) : null;
  const fitReason = pickedDef ? supportReason(gem, pickedDef.supportId) : null;
  const canDrop = !!pickedDef && !fitReason;
  const drop = (i: number) => {
    game.act((st) => socketSupport(st, gem.uid, pickedSupport!, i));
    onPlaced();
  };
  return (
    <>
      <div className="sockets">
        {Array.from({ length: sockets }, (_, i) => {
          const sup = gem.supports[i];
          return sup ? (
            <Tooltip key={i} content={<SupportTip supportId={sup.supportId} />}>
              <button
                className={`socket filled ${canDrop ? 'target' : ''}`}
                onClick={() => (canDrop ? drop(i) : game.act((st) => unsocketSupport(st, gem.uid, i)))}
                title={canDrop ? 'Swap in the picked support' : 'Click to remove'}
              >
                <GemIcon def={supportGemDef(sup.supportId)} size={24} support />
                <span>{supportGemDef(sup.supportId).name}</span>
              </button>
            </Tooltip>
          ) : (
            <button
              key={i}
              className={`socket ${canDrop ? 'target' : ''} ${openSocket === i ? 'open' : ''}`}
              disabled={!!pickedDef && !canDrop}
              title={pickedDef ? (fitReason ?? 'Socket here') : 'The next support you pick goes here'}
              onClick={() => (canDrop ? drop(i) : setOpenSocket(i))}
            >
              <span className="socket-hole" />
              <span className="dim">{pickedDef ? (fitReason ?? 'Socket here') : 'Empty socket'}</span>
            </button>
          );
        })}
        {(s.account.bank.expansion ?? 0) > 0 && gem.extraSlots < 1 && (
          <button className="btn sm" onClick={() => game.act((st, ctx) => expandSockets(st, ctx, gem.uid))}>
            + Socket (Orb of Expansion)
          </button>
        )}
      </div>
      <SupportsForSkill s={s} gem={gem} socket={openSocket} />
    </>
  );
}

/** Set up one bar slot: its supports, when it fires, and its place in the priority order. */
function SlotModal({
  s,
  slot,
  setSlot,
  pickedSupport,
  onPlaced,
  onClose,
}: {
  s: GameState;
  slot: number;
  setSlot: (n: number) => void;
  pickedSupport: number | null;
  onPlaced: () => void;
  onClose: () => void;
}) {
  const gem = s.skillBar[slot];
  const d = deriveStats(s, []);
  const [choosing, setChoosing] = useState(!gem);
  const usable = [...s.account.gems].sort((a, b) => b.level - a.level || activeGemDef(a.gemId).name.localeCompare(activeGemDef(b.gemId).name));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal slot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-title">
          <span className="slot-key">{SKILL_KEYS[slot]}</span>
          {gem ? (
            <>
              <Tooltip content={<GemTip gem={gem} state={s} />}>
                <span>
                  <GemIcon def={activeGemDef(gem.gemId)} size={34} />
                </span>
              </Tooltip>
              <span>
                {activeGemDef(gem.gemId).name} <span className="nav-badge">Lv {gem.level}</span>
              </span>
            </>
          ) : (
            <span>Empty slot</span>
          )}
          <span className="grow" />
          <button className="btn sm ghost" title="Close" onClick={onClose}>
            <Icon name="close" size={12} />
          </button>
        </div>
        {gem && <ProgressBar value={gemProgress(gem)} color="var(--gem)" className="thin" />}

        {gem && !choosing && (
          <>
            <div className="section-label">Priority</div>
            <div className="prio-pick">
              {SKILL_PRIORITIES.map((p) => (
                <button key={p.id} className={`gem-chip ${gem.priority === p.id ? 'active' : ''}`} onClick={() => game.act((st) => setPriority(st, slot, p.id))}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="dim small">High skills are tried before Normal, Normal before Low. Within one, cooldown and area skills go first, then by bar slot.</div>
            <div className="section-label">Bar slot</div>
            <div className="prio-pick">
              {Array.from({ length: SKILL_BAR_SLOTS }, (_, i) => (
                <button
                  key={i}
                  className={`gem-chip ${i === slot ? 'active' : ''}`}
                  title={i === slot ? 'Current slot' : s.skillBar[i] ? `Swap with ${activeGemDef(s.skillBar[i]!.gemId).name}` : 'Move here'}
                  onClick={() => {
                    if (i === slot) return;
                    game.act((st) => placeOnBar(st, gem.uid, i));
                    setSlot(i);
                  }}
                >
                  #{i + 1} · {SKILL_KEYS[i]}
                </button>
              ))}
            </div>

            <div className="section-label">Rules</div>
            <RuleEditor s={s} slot={slot} gem={gem} />

            <div className="section-label">Supports</div>
            <Sockets s={s} gem={gem} pickedSupport={pickedSupport} onPlaced={onPlaced} />

            <div className="row" style={{ justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
              <button className="btn sm" onClick={() => setChoosing(true)}>
                Swap skill
              </button>
              <button
                className="btn sm danger"
                onClick={() => {
                  game.act((st) => removeFromBar(st, slot));
                  onClose();
                }}
              >
                Remove from bar
              </button>
            </div>
          </>
        )}

        {choosing && (
          <>
            <div className="section-label">{gem ? 'Swap for' : 'Put a skill gem here'}</div>
            {usable.length === 0 && <EmptyState small>No spare skill gems. The Town's Gem shop sells them.</EmptyState>}
            <div className="gem-bag">
              {usable.map((g) => {
                const reason = gemUseReason(d.combatLevel, d.attributes, g);
                return (
                  <Tooltip key={g.uid} content={<GemTip gem={g} state={s} />}>
                    <button
                      className={`gem-card ${reason ? 'nofit' : ''}`}
                      disabled={!!reason}
                      onClick={() => {
                        if (!game.act((st) => placeOnBar(st, g.uid, slot))) setChoosing(false);
                      }}
                    >
                      <GemIcon def={activeGemDef(g.gemId)} size={30} />
                      <span>
                        <b>{activeGemDef(g.gemId).name}</b>
                        <span className="dim"> Lv {g.level}</span>
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            {gem && (
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn sm ghost" onClick={() => setChoosing(false)}>
                  Back
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function SkillGemsPage() {
  const s = useGame();
  const [pickedGem, setPickedGem] = useState<number | null>(null);
  const [pickedSupport, setPickedSupport] = useState<number | null>(null);
  const [gemSearch, setGemSearch] = useState('');
  const [gemAttr, setGemAttr] = useState<GemAttr | null>(null);
  const [gemKind, setGemKind] = useState<GemKind>('all');
  const [gemSort, setGemSort] = useState<'level' | 'name'>('level');
  const [supSearch, setSupSearch] = useState('');
  const [supAttr, setSupAttr] = useState<GemAttr | null>(null);
  /** '' for any skill, or the bar slot a support has to fit */
  const [supFit, setSupFit] = useState('');
  const [bagTab, setBagTab] = useState<'skills' | 'supports'>('skills');
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const clear = () => {
    setPickedGem(null);
    setPickedSupport(null);
  };
  const d = deriveStats(s, []);
  const has = (name: string, search: string) => name.toLowerCase().includes(search.trim().toLowerCase());
  const byName = (a: string, b: string) => activeGemDef(a).name.localeCompare(activeGemDef(b).name);
  const gems = s.account.gems
    .filter((g) => {
      const def = activeGemDef(g.gemId);
      return kindMatches(def, gemKind) && (!gemAttr || def.attr === gemAttr) && has(def.name, gemSearch);
    })
    .sort((a, b) => (gemSort === 'level' ? b.level - a.level || byName(a.gemId, b.gemId) : byName(a.gemId, b.gemId) || b.level - a.level));
  /** the bar slots a loose support would fit */
  const fitKeys = (supportId: string) => s.skillBar.flatMap((b, i) => (b && !supportReason(b, supportId) ? [i] : []));
  const fitSlot = supFit === '' || !s.skillBar[Number(supFit)] ? null : Number(supFit);
  const supports = s.account.supportGems
    .filter((g) => {
      const def = supportGemDef(g.supportId);
      return (!supAttr || def.attr === supAttr) && (fitSlot === null || fitKeys(g.supportId).includes(fitSlot)) && has(def.name, supSearch);
    })
    .sort((a, b) => supportGemDef(a.supportId).name.localeCompare(supportGemDef(b.supportId).name));

  return (
    <div className="page">
      <PageHeader
        title="Skills"
        actions={
          (pickedGem !== null || pickedSupport !== null) && (
            <button className="btn" onClick={clear}>
              Cancel selection
            </button>
          )
        }
      >
        Your bar runs in cast order: the first skill whose rules all pass and that you can pay for (rules keep 40% of your Life back), otherwise a free Default Attack. Reactive rules are
        taught at the Hideout's War Table. Press <b>Q–Y</b> in combat to cast a slot manually.
      </PageHeader>

      <div className="card">
        <div className="card-title">
          Skill bar
          <span className="grow" />
          <span className="card-hint">{pickedSupport !== null ? 'Click a skill to socket the picked support' : 'Click a skill to set its supports, trigger and priority'}</span>
        </div>
        <div className="skill-bar">
          {Array.from({ length: SKILL_BAR_SLOTS }, (_, i) => (
            <SlotTile key={i} s={s} slot={i} pickedGem={pickedGem} onOpen={() => setOpenSlot(i)} onPlaced={clear} />
          ))}
        </div>
        <CastOrder s={s} />
      </div>
      <SkillSets s={s} />
      {openSlot !== null && (
        <SlotModal
          key={openSlot}
          s={s}
          slot={openSlot}
          setSlot={setOpenSlot}
          pickedSupport={pickedSupport}
          onPlaced={clear}
          onClose={() => setOpenSlot(null)}
        />
      )}

      <div className="card r2-gem-bag">
        <div className="card-title">
          Gem bag
          <span className="grow" />
          <span className="card-hint">{bagTab === 'skills' ? 'Pick a skill gem, then a slot on the bar' : 'Pick a support, then a skill on the bar'}</span>
        </div>
        <Tabs
          tabs={[
            { id: 'skills', label: 'Skill gems', count: s.account.gems.length },
            { id: 'supports', label: 'Support gems', count: s.account.supportGems.length },
          ]}
          value={bagTab}
          onChange={setBagTab}
        />
        {bagTab === 'skills' && (
          <>
            {s.account.gems.length > 0 && (
              <GemFilters search={gemSearch} setSearch={setGemSearch} attr={gemAttr} setAttr={setGemAttr}>
                <select className="input r2-gem-select" aria-label="Skill type" value={gemKind} onChange={(e) => setGemKind(e.target.value as GemKind)}>
                  {GEM_KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.id === 'all' ? 'Every type' : k.label}
                    </option>
                  ))}
                </select>
                <select className="input r2-gem-select" aria-label="Sort" value={gemSort} onChange={(e) => setGemSort(e.target.value as 'level' | 'name')}>
                  <option value="level">Highest level first</option>
                  <option value="name">A–Z</option>
                </select>
              </GemFilters>
            )}
            {s.account.gems.length === 0 && <EmptyState small>No spare skill gems. Buy them at the Town's Gem shop.</EmptyState>}
            {s.account.gems.length > 0 && gems.length === 0 && <div className="dim small">No gems match these filters.</div>}
            {GEM_GROUPS.map((group) => {
              const list = gems.filter((g) => gemGroup(activeGemDef(g.gemId)) === group.id);
              if (!list.length) return null;
              return (
                <section key={group.id} className="r2-gem-section">
                  <div className="r2-gem-section-head">
                    {group.label} <span className="dim num">{list.length}</span>
                  </div>
                  <div className="gem-bag r2-gem-grid">
                    {list.map((g) => {
                      const reason = gemUseReason(d.combatLevel, d.attributes, g);
                      return (
                        <Tooltip key={g.uid} content={<GemTip gem={g} state={s} />}>
                          <button
                            className={`gem-card ${pickedGem === g.uid ? 'selected' : ''} ${reason ? 'nofit' : ''}`}
                            onClick={() => (setPickedSupport(null), setPickedGem(pickedGem === g.uid ? null : g.uid))}
                          >
                            <GemIcon def={activeGemDef(g.gemId)} size={30} />
                            <span className="r2-gem-text">
                              <b>{activeGemDef(g.gemId).name}</b>
                              <span className="dim small">Lv {g.level}{reason ? ` · ${reason}` : ''}</span>
                            </span>
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </>
        )}
        {bagTab === 'supports' && (
          <>
            {s.account.supportGems.length > 0 && (
              <GemFilters search={supSearch} setSearch={setSupSearch} attr={supAttr} setAttr={setSupAttr}>
                <select className="input r2-gem-select" aria-label="Fits" value={supFit} onChange={(e) => setSupFit(e.target.value)}>
                  <option value="">Any skill</option>
                  {s.skillBar.map((b, i) =>
                    b ? (
                      <option key={i} value={String(i)}>
                        Fits {SKILL_KEYS[i]} · {activeGemDef(b.gemId).name}
                      </option>
                    ) : null,
                  )}
                </select>
              </GemFilters>
            )}
            {s.account.supportGems.length === 0 && <EmptyState small>No loose support gems yet. Gemcutting and the Town's Gem shop make them.</EmptyState>}
            {s.account.supportGems.length > 0 && supports.length === 0 && <div className="dim small">No supports match these filters.</div>}
            {[
              { id: 'fit', label: 'Fit a skill on your bar', list: supports.filter((g) => fitKeys(g.supportId).length > 0) },
              { id: 'nofit', label: "Don't fit anything on your bar", list: supports.filter((g) => fitKeys(g.supportId).length === 0) },
            ].map((group) =>
              group.list.length ? (
                <section key={group.id} className="r2-gem-section">
                  <div className="r2-gem-section-head">
                    {group.label} <span className="dim num">{group.list.length}</span>
                  </div>
                  <div className="gem-bag r2-gem-grid">
                    {group.list.map((g) => {
                      const def = supportGemDef(g.supportId);
                      const keys = fitKeys(g.supportId);
                      return (
                        <Tooltip key={g.uid} content={<SupportTip supportId={g.supportId} />}>
                          <button
                            className={`gem-card ${pickedSupport === g.uid ? 'selected' : ''} ${keys.length ? '' : 'nofit'}`}
                            onClick={() => (setPickedGem(null), setPickedSupport(pickedSupport === g.uid ? null : g.uid))}
                          >
                            <GemIcon def={def} size={28} support />
                            <span className="r2-gem-text">
                              <b>{def.name}</b>
                              {def.signatureFor ? <span className="dim small">Signature · {activeGemDef(def.signatureFor).name}</span> : null}
                            </span>
                            {keys.length > 0 && (
                              <span className="r2-fit-keys" title={`Fits ${keys.map((k) => activeGemDef(s.skillBar[k]!.gemId).name).join(', ')}`}>
                                {keys.map((k) => (
                                  <span key={k} className="r2-key">
                                    {SKILL_KEYS[k]}
                                  </span>
                                ))}
                              </span>
                            )}
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                </section>
              ) : null,
            )}
          </>
        )}
      </div>
    </div>
  );
}

const GEM_GROUPS = [
  { id: 'attack', label: 'Attacks' },
  { id: 'spell', label: 'Spells' },
  { id: 'utility', label: 'Guards, buffs and curses' },
] as const;

function gemGroup(def: ReturnType<typeof activeGemDef>): (typeof GEM_GROUPS)[number]['id'] {
  if (kindMatches(def, 'utility')) return 'utility';
  return def.tags.includes('spell') ? 'spell' : 'attack';
}
