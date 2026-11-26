import { useState, type ReactNode } from 'react';
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
  type TacticRule,
} from '../../data/gems';
import { actOpen } from '../../data/zones';
import { gemArrived } from '../../engine/progress';
import { aimLockReason, castOrder, GROUND_IN_PLAY, ruleLockReason, ruleSlots, suggestedRule } from '../../engine/automation';
import { GROUND } from '../../engine/battlefield';
import type { GroundKind } from '../../engine/types';
import {
  expandSockets,
  gemUpgradeBlock,
  gemUpgradeReady,
  gemUseReason,
  gemProgress,
  upgradeGem,
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
import { EmptyState, ProgressBar, Tabs, Tooltip } from '../components/common';
import { GEM_KINDS, GemFilters, kindMatches, type GemKind } from '../components/GemFilters';
import '../round2-session3.css';
import { GemIcon, GemTip, rulesLabel, ruleText, SupportTip } from '../components/GemView';
import { Icon } from '../components/Icon';
import { SkillLoadoutTray, SkillSets } from '../components/Loadouts';
import { CollectionPanel } from '../components/CollectionPanel';
import type { Page } from '../Layout';
import '../components/station-hero.css';
import '../components/war-table.css';

export const SKILL_KEYS = ['Q', 'W', 'E', 'R', 'T', 'Y'];

/** The War Table's attribute tints: crimson Strength, emerald Dexterity, cobalt Intelligence. */
const WT_ATTR: Record<GemAttr, string> = { str: '#ef4444', dex: '#10b981', int: '#3b82f6' };
const attrStyle = (attr: GemAttr) => ({ ['--wt-attr' as string]: WT_ATTR[attr] });

const RULE_CATEGORIES: { id: string; label: string; icon: string; conditions: RuleCondition[] }[] = [
  {
    id: 'cadence',
    label: 'Cadence & Triggers',
    icon: '⚡',
    conditions: ['always', 'manual', 'meterFull', 'exertionFull', 'notActive'],
  },
  {
    id: 'vitals',
    label: 'Vitals & Pools',
    icon: '🛡️',
    conditions: ['lifeBelow', 'lifeAbove', 'manaBelow', 'manaAbove'],
  },
  {
    id: 'enemies',
    label: 'Enemies & Bosses',
    icon: '👹',
    conditions: ['bossOnly', 'enemyCasting', 'enemyChannels', 'enemiesAtLeast', 'dangerousPack', 'targetLifeAbove'],
  },
  {
    id: 'conditions',
    label: 'Status & Ground',
    icon: '🩸',
    conditions: ['targetHas', 'targetLacks', 'onGround', 'frostbite'],
  },
];

function conditionGlyph(c: RuleCondition): string {
  for (const cat of RULE_CATEGORIES) {
    if (cat.conditions.includes(c)) return cat.icon;
  }
  return '⚔️';
}

function RuleConditionModal({
  s,
  current,
  extra,
  onSelect,
  onClose,
}: {
  s: GameState;
  current: RuleCondition;
  extra: boolean;
  onSelect: (c: RuleCondition) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<string>('all');
  const allConditions = (Object.keys(RULE_LABELS) as RuleCondition[]).filter(
    (k) => (!extra || (k !== 'always' && k !== 'manual')) && (!RULE_LABELS[k].act || actOpen(RULE_LABELS[k].act))
  );

  const filtered = category === 'all'
    ? allConditions
    : allConditions.filter((k) => RULE_CATEGORIES.find((c) => c.id === category)?.conditions.includes(k));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal rule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-title">
          <span>Choose Combat Rule Trigger</span>
          <span className="grow" />
          <button className="btn sm ghost" title="Close" onClick={onClose}>
            <Icon name="close" size={12} />
          </button>
        </div>
        <div className="rule-modal-categories">
          <button
            type="button"
            className={`chip sm ${category === 'all' ? 'active' : ''}`}
            onClick={() => setCategory('all')}
          >
            All Conditions
          </button>
          {RULE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`chip sm ${category === cat.id ? 'active' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
        <div className="rule-modal-grid">
          {filtered.map((k) => {
            const reason = ruleLockReason(s, k);
            const isSelected = current === k;
            return (
              <button
                key={k}
                type="button"
                className={`rule-opt-card ${isSelected ? 'active' : ''}`}
                disabled={!!reason}
                onClick={() => {
                  onSelect(k);
                  onClose();
                }}
              >
                <div className="rule-opt-title">
                  <span>{conditionGlyph(k)}</span>
                  <b>{RULE_LABELS[k].label}</b>
                </div>
                {reason ? (
                  <span className="chip bad xs" style={{ marginTop: 2 }}>{reason}</span>
                ) : (
                  <span className="dim xs">Available trigger</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** One rule slot. Categorized button opens the condition picker; values and status options use interactive chips. */
function RuleSlot({ s, slot, index, rule, extra }: { s: GameState; slot: number; index: number; rule: TacticRule; extra: boolean }) {
  const [picking, setPicking] = useState(false);
  const meta = RULE_LABELS[rule.when];
  const locked = ruleLockReason(s, rule.when);
  const set = (next: TacticRule) => game.act((st) => setRule(st, slot, index, { ...next, aim: rule.aim }));

  const stepVal = (delta: number) => {
    const cur = rule.value ?? meta.defaultValue ?? 0;
    const max = meta.max ?? (meta.unit === '%' ? 100 : 5);
    const next = Math.max(0, Math.min(max, cur + delta));
    set({ when: rule.when, value: next });
  };

  return (
    <div className="rule-card">
      <div className="rule-head">
        {extra && <span className="chip dim xs" style={{ fontWeight: 700 }}>AND</span>}
        <button
          type="button"
          className={`rule-condition-btn ${locked ? 'is-locked' : ''}`}
          onClick={() => setPicking(true)}
          title="Click to choose a rule trigger condition"
        >
          <span className="glyph">{conditionGlyph(rule.when)}</span>
          <b>{RULE_LABELS[rule.when].label}</b>
          <span className="arrow">▾</span>
        </button>
        {locked && <span className="chip bad xs">{locked}</span>}
        <span className="grow" />
        {extra && (
          <button className="btn sm ghost" title="Remove this rule" onClick={() => game.act((st) => removeRule(st, slot, index))}>
            <Icon name="close" size={12} />
          </button>
        )}
      </div>

      {(meta.status || meta.ground || meta.unit !== undefined) && (
        <div className="rule-params">
          {meta.status && (
            <div className="rule-chip-group">
              <span className="dim small">Target status:</span>
              <div className="row wrap" style={{ gap: 4 }}>
                {TARGET_STATUSES.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    className={`chip sm status-chip status-${x.id} ${rule.status === x.id ? 'active' : ''}`}
                    onClick={() => set({ when: rule.when, status: x.id })}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {meta.ground && (
            <div className="rule-chip-group">
              <span className="dim small">Standing on:</span>
              <div className="row wrap" style={{ gap: 4 }}>
                {(Object.keys(GROUND) as GroundKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={!GROUND_IN_PLAY.has(k)}
                    className={`chip sm ground-chip ground-${k} ${rule.ground === k ? 'active' : ''}`}
                    onClick={() => set({ when: rule.when, ground: k })}
                    title={GROUND_IN_PLAY.has(k) ? '' : 'Nothing lays this yet'}
                  >
                    {GROUND[k].name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {meta.unit !== undefined && (
            <div className="rule-stepper-row">
              <span className="dim small">Threshold:</span>
              <div className="row" style={{ gap: 4, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn sm ghost"
                  disabled={(rule.value ?? meta.defaultValue ?? 0) <= 0}
                  onClick={() => stepVal(meta.unit === '%' ? -10 : -1)}
                >
                  -
                </button>
                <input
                  className="input sm rule-num-input"
                  type="number"
                  min={0}
                  max={meta.max ?? (meta.unit === '%' ? 100 : 5)}
                  value={rule.value ?? meta.defaultValue}
                  onChange={(e) => set({ when: rule.when, value: Number(e.target.value) })}
                />
                <button
                  type="button"
                  className="btn sm ghost"
                  disabled={(rule.value ?? meta.defaultValue ?? 0) >= (meta.max ?? (meta.unit === '%' ? 100 : 5))}
                  onClick={() => stepVal(meta.unit === '%' ? 10 : 1)}
                >
                  +
                </button>
                <span className="dim small">{meta.unit}</span>
                {meta.unit === '%' && (
                  <div className="row" style={{ gap: 3, marginLeft: 6 }}>
                    {[25, 50, 75].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        className={`chip xs ${rule.value === pct ? 'active' : ''}`}
                        onClick={() => set({ when: rule.when, value: pct })}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {picking && (
        <RuleConditionModal
          s={s}
          current={rule.when}
          extra={extra}
          onSelect={(when) => {
            set({
              when,
              value: RULE_LABELS[when].defaultValue,
              status: RULE_LABELS[when].status ? 'bleeding' : undefined,
              ground: RULE_LABELS[when].ground ? 'burning' : undefined,
            });
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

/** Where the skill's rules send it. Rendered as tactile aim chips instead of a dropdown. */
function RuleAim({ s, slot, gem }: { s: GameState; slot: number; gem: SkillGemInstance }) {
  const { weaponPct, base } = activeGemDef(gem.gemId).effect;
  if (!weaponPct && !base) return null;
  const locked = aimLockReason(s);
  const currentAim = gem.rules.find((r) => r.aim)?.aim;

  return (
    <div className="rule-aim-panel">
      <span className="dim small" style={{ fontWeight: 600 }}>Aim at:</span>
      <div className="row wrap" style={{ gap: 4 }}>
        <button
          type="button"
          className={`chip sm aim-chip ${!currentAim ? 'active' : ''}`}
          disabled={!!locked}
          onClick={() => game.act((st) => setAim(st, slot, undefined))}
        >
          Usual target
        </button>
        {SKILL_AIMS.map((x) => {
          const active = currentAim === x.id;
          return (
            <button
              key={x.id}
              type="button"
              className={`chip sm aim-chip ${active ? 'active' : ''}`}
              disabled={!!locked}
              onClick={() => game.act((st) => setAim(st, slot, x.id))}
            >
              {x.label}
            </button>
          );
        })}
      </div>
      {locked && <span className="chip bad xs">{locked}</span>}
    </div>
  );
}

function RuleEditor({ s, slot, gem }: { s: GameState; slot: number; gem: SkillGemInstance }) {
  const suggested = suggestedRule(s, activeGemDef(gem.gemId));
  const manual = gem.rules[0].when === 'manual';
  const canAdd = !manual && gem.rules.length < ruleSlots(s);
  return (
    <div className="rule-editor-wrapper">
      <div className="rule-cards-list">
        {gem.rules.map((rule, i) => (
          <RuleSlot key={i} s={s} slot={slot} index={i} rule={rule} extra={i > 0} />
        ))}
      </div>
      <RuleAim s={s} slot={slot} gem={gem} />
      <div className="rule-editor" style={{ marginTop: 8 }}>
        {canAdd && (
          <button className="btn sm primary" title="Fire only when this rule passes too" onClick={() => game.act((st) => setRule(st, slot, gem.rules.length, { when: 'bossOnly' }))}>
            + Add a rule
          </button>
        )}
        {manual && suggested.when !== 'manual' && (
          <button className="btn sm ghost" data-tut="suggested-rule" title="Automate this skill with its suggested rule" onClick={() => game.act((st) => setRule(st, slot, 0, suggested))}>
            Suggested: {ruleText(suggested)}
          </button>
        )}
        {s.combat?.queued === slot && <span className="chip">queued</span>}
        <span className="dim small">
          {gem.rules.length} of {ruleSlots(s)} rule slots
        </span>
      </div>
    </div>
  );
}

/** Who gets tried first, once priority, cooldowns and slots are all counted. */
function CastOrder({ s }: { s: GameState }) {
  const order = castOrder(s);
  if (order.length < 2) return null;
  return (
    <div className="cast-order wt-timeline small">
      <span className="wt-timeline-label">Cast order</span>
      {order.map((slot, i) => {
        const def = activeGemDef(s.skillBar[slot]!.gemId);
        return (
          <span key={slot} className="wt-timeline-step" style={attrStyle(def.attr)}>
            {i > 0 && <span className="wt-timeline-arrow" aria-hidden="true">➔</span>}
            <span className="wt-timeline-node">
              <b className="num">{i + 1}</b> {def.name}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * The supports for the skill being set up, always in view under its sockets: the loose ones that fit, one click to
 * socket, then the ones that would fit if you found them.
 */
function SupportsForSkill({ s, gem, socket }: { s: GameState; gem: SkillGemInstance; socket: number | null }) {
  const act = activeGemDef(gem.gemId);
  const owned = s.storage.supportGems.filter((g) => !supportReason(gem, g.supportId));
  // one entry per kind, even when several copies are in the bag
  const ownedKinds = [...new Map(owned.map((g) => [g.supportId, g])).values()].sort((a, b) => supportGemDef(a.supportId).name.localeCompare(supportGemDef(b.supportId).name));
  const copies = (id: string) => s.storage.supportGems.filter((g) => g.supportId === id).length;
  const missing = SUPPORT_GEMS.filter((d) => supportFits(d, act) && gemArrived(s, d.id) && !s.storage.supportGems.some((g) => g.supportId === d.id) && !gem.supports.some((x) => x?.supportId === d.id));
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

/**
 * Shows once a gem has the xp for its next level. Greyed out, with the reason, when that level would need more
 * character level or attribute than you have, since the skill would stop working.
 */
function UpgradeButton({ s, gem }: { s: GameState; gem: SkillGemInstance }) {
  if (!gemUpgradeReady(gem)) return null;
  const d = deriveStats(s, []);
  const block = gemUpgradeBlock(d.combatLevel, d.attributes, gem);
  return (
    <button
      className="btn sm primary gem-upgrade"
      disabled={!!block}
      title={block ?? `Take ${activeGemDef(gem.gemId).name} to level ${gem.level + 1}`}
      onClick={() => game.act((st, ctx) => upgradeGem(st, ctx, gem.uid))}
    >
      Upgrade to Lv {gem.level + 1}
      {block && <span className="gem-upgrade-why">{block}</span>}
    </button>
  );
}

/** One slot of the bar, drawn like the combat skill bar: click to set it up, or to drop a picked gem in. */
type SlotProps = { s: GameState; slot: number; pickedGem: number | null; rank: number; onOpen: () => void; onPlaced: () => void; onInspect: () => void };

function SlotTile(props: SlotProps) {
  const gem = props.s.skillBar[props.slot];
  return (
    <div className="slot-wrap wt-pedestal-wrap" onMouseEnter={gem ? props.onInspect : undefined} onFocus={gem ? props.onInspect : undefined}>
      <SlotButton {...props} />
      {gem && <UpgradeButton s={props.s} gem={gem} />}
    </div>
  );
}

/** A skill's support sockets as linked PoE-style sockets: filled ones show the support, empty ones a dark well. */
function LinkedSockets({ gem }: { gem: SkillGemInstance }) {
  const n = supportSlots(gem);
  if (!n) return <span className="wt-links none dim">No support sockets</span>;
  return (
    <span className="wt-links" aria-label={`${gem.supports.filter(Boolean).length} of ${n} supports socketed`}>
      {Array.from({ length: n }, (_, i) => {
        const sup = gem.supports[i];
        const def = sup ? supportGemDef(sup.supportId) : null;
        return (
          <span key={i} className="wt-link-cell">
            {i > 0 && <span className={`wt-link-bar ${sup && gem.supports[i - 1] ? 'lit' : ''}`} aria-hidden="true" />}
            <span className={`wt-socket ${def ? 'wt-socket-filled' : 'wt-socket-open'}`} style={def ? attrStyle(def.attr) : undefined}>
              {def && <GemIcon def={def} size={17} support />}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function SlotButton({ s, slot, pickedGem, rank, onOpen, onPlaced }: SlotProps) {
  const gem = s.skillBar[slot];
  const click = () => {
    if (pickedGem === null) return onOpen();
    if (!game.act((st) => placeOnBar(st, pickedGem, slot))) onPlaced();
  };
  if (!gem) {
    return (
      <button className={`skill-btn empty setup wt-pedestal ${pickedGem !== null ? 'target' : ''}`} onClick={click}>
        <span className="slot-key">{SKILL_KEYS[slot]}</span>
        <span className="wt-empty-well" aria-hidden="true" />
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
      <button className={`skill-btn setup wt-pedestal filled ${pickedGem !== null ? 'target' : ''}`} style={attrStyle(def.attr)} onClick={click}>
        <span className="slot-key">{SKILL_KEYS[slot]}</span>
        {rank >= 0 && (
          <span className="wt-crest num" title={`${ordinal(rank + 1)} in cast order`}>
            #{rank + 1}
          </span>
        )}
        <span className="skill-gem wt-gem-well">
          <GemIcon def={def} size={40} />
        </span>
        <span className="skill-name">{def.name}</span>
        <span className="skill-meta">
          Lv {gem.level} ·{' '}
          {nums.lifeCost > 0 && <span style={{ color: 'var(--life-2)' }}>{nums.lifeCost} life </span>}
          {nums.manaCost > 0 && <span style={{ color: 'var(--mana-2)' }}>{nums.manaCost} mana</span>}
          {!nums.lifeCost && !nums.manaCost && <span className="dim">free</span>}
        </span>
        <LinkedSockets gem={gem} />
        <span className={`skill-rule wt-rule-pill ${locked ? 'locked' : ''}`}>{locked ?? rulesLabel(s, gem.rules)}</span>
      </button>
    </Tooltip>
  );
}

const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

/** The support sockets of one skill: click a filled one to take it out, an empty one to see what fits. */
function Sockets({ s, gem, pickedSupport, onPlaced }: { s: GameState; gem: SkillGemInstance; pickedSupport: number | null; onPlaced: () => void }) {
  const [openSocket, setOpenSocket] = useState<number | null>(null);
  const sockets = supportSlots(gem);
  const pickedDef = pickedSupport !== null ? s.storage.supportGems.find((x) => x.uid === pickedSupport) : null;
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
        {(s.storage.bank.expansion ?? 0) > 0 && gem.extraSlots < 1 && (
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
  const usable = [...s.storage.gems].sort((a, b) => b.level - a.level || activeGemDef(a.gemId).name.localeCompare(activeGemDef(b.gemId).name));
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
        {gem && <UpgradeButton s={s} gem={gem} />}

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

/** The banner over both Skills tabs: Kivshenko's council of war, the crest, the title and whatever docks on the right. */
function WarTableBanner({ subtitle, children }: { subtitle: ReactNode; children?: ReactNode }) {
  return (
    <header className="card wt-hero station-hero">
      <div className="wt-crest-emblem" aria-hidden="true">
        <span className="wt-crest-gem str" />
        <span className="wt-crest-gem dex" />
        <span className="wt-crest-gem int" />
      </div>
      <div className="wt-hero-text">
        <h1>
          Skills <small>The War Table</small>
        </h1>
        <p>{subtitle}</p>
      </div>
      {children && <div className="wt-hero-dock">{children}</div>}
    </header>
  );
}

/**
 * The live inspector beside the gem bag: a picked spare gem with one-click equip/link buttons, or else the bar skill
 * last hovered, with its numbers, rules and links. The full rule editor stays in the slot window.
 */
function SkillInspector({
  s,
  pickedGem,
  pickedSupport,
  inspectSlot,
  onOpen,
  onPlaced,
}: {
  s: GameState;
  pickedGem: number | null;
  pickedSupport: number | null;
  inspectSlot: number | null;
  onOpen: (slot: number) => void;
  onPlaced: () => void;
}) {
  const d = deriveStats(s, []);
  const spare = pickedGem !== null ? s.storage.gems.find((g) => g.uid === pickedGem) : undefined;
  const sup = pickedSupport !== null ? s.storage.supportGems.find((g) => g.uid === pickedSupport) : undefined;
  const slotGem = inspectSlot !== null ? s.skillBar[inspectSlot] : null;

  let body: ReactNode;
  if (spare) {
    const reason = gemUseReason(d.combatLevel, d.attributes, spare);
    body = (
      <>
        <GemTip gem={spare} state={s} />
        <div className="wt-insp-actions">
          <span className="wt-insp-label">Equip to</span>
          <div className="wt-key-row">
            {SKILL_KEYS.map((k, i) => {
              const there = s.skillBar[i];
              return (
                <button
                  key={k}
                  type="button"
                  className="wt-key-btn"
                  disabled={!!reason}
                  title={reason ?? (there ? `Swap with ${activeGemDef(there.gemId).name}` : `Put it on ${k}`)}
                  onClick={() => {
                    if (!game.act((st) => placeOnBar(st, spare.uid, i))) onPlaced();
                  }}
                >
                  {k}
                  {there && <span className="wt-key-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          {reason && <span className="chip bad xs">{reason}</span>}
        </div>
      </>
    );
  } else if (sup) {
    const targets = s.skillBar.flatMap((b, i) => (b && !supportReason(b, sup.supportId) ? [i] : []));
    body = (
      <>
        <SupportTip supportId={sup.supportId} />
        <div className="wt-insp-actions">
          <span className="wt-insp-label">Link to</span>
          {targets.length === 0 && <span className="dim small">It doesn't fit any skill on your bar.</span>}
          <div className="wt-link-targets">
            {targets.map((i) => {
              const b = s.skillBar[i]!;
              const open = Array.from({ length: supportSlots(b) }, (_, j) => j).find((j) => !b.supports[j]);
              return (
                <button
                  key={i}
                  type="button"
                  className="btn sm"
                  disabled={open === undefined}
                  title={open === undefined ? 'All its sockets are full: open the skill to swap one out' : `Socket into ${activeGemDef(b.gemId).name}`}
                  onClick={() => {
                    game.act((st) => socketSupport(st, b.uid, sup.uid, open!));
                    onPlaced();
                  }}
                >
                  <span className="r2-key">{SKILL_KEYS[i]}</span> {activeGemDef(b.gemId).name}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  } else if (slotGem && inspectSlot !== null) {
    body = (
      <>
        <GemTip gem={slotGem} state={s} />
        <div className="wt-insp-actions">
          <span className="wt-insp-label">Links</span>
          <LinkedSockets gem={slotGem} />
          <span className="wt-insp-label">Trigger</span>
          <span className="wt-rule-pill">{rulesLabel(s, slotGem.rules)}</span>
          <button type="button" className="btn sm primary" onClick={() => onOpen(inspectSlot)}>
            Edit {SKILL_KEYS[inspectSlot]} · rules, supports, priority
          </button>
        </div>
      </>
    );
  } else {
    body = <div className="wt-insp-empty dim small">Hover a skill on the bar, or pick a gem from the bag, to see its numbers here.</div>;
  }

  return (
    <aside className="card wt-inspector" aria-label="Skill inspector">
      <div className="card-title">
        Inspector
        <span className="grow" />
        <span className="card-hint">{spare || sup ? 'Picked gem' : slotGem && inspectSlot !== null ? `Slot ${SKILL_KEYS[inspectSlot]}` : ''}</span>
      </div>
      {body}
    </aside>
  );
}

function SkillGemsBody({ tabs, go }: { tabs: ReactNode; go: (p: Page) => void }) {
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
  const [managing, setManaging] = useState(false);
  const [inspectSlot, setInspectSlot] = useState<number | null>(() => {
    const first = s.skillBar.findIndex(Boolean);
    return first >= 0 ? first : null;
  });
  const order = castOrder(s);
  const clear = () => {
    setPickedGem(null);
    setPickedSupport(null);
  };
  const d = deriveStats(s, []);
  const has = (name: string, search: string) => name.toLowerCase().includes(search.trim().toLowerCase());
  const byName = (a: string, b: string) => activeGemDef(a).name.localeCompare(activeGemDef(b).name);
  const gems = s.storage.gems
    .filter((g) => {
      const def = activeGemDef(g.gemId);
      return kindMatches(def, gemKind) && (!gemAttr || def.attr === gemAttr) && has(def.name, gemSearch);
    })
    .sort((a, b) => (gemSort === 'level' ? b.level - a.level || byName(a.gemId, b.gemId) : byName(a.gemId, b.gemId) || b.level - a.level));
  /** the bar slots a loose support would fit */
  const fitKeys = (supportId: string) => s.skillBar.flatMap((b, i) => (b && !supportReason(b, supportId) ? [i] : []));
  const fitSlot = supFit === '' || !s.skillBar[Number(supFit)] ? null : Number(supFit);
  const supports = s.storage.supportGems
    .filter((g) => {
      const def = supportGemDef(g.supportId);
      return (!supAttr || def.attr === supAttr) && (fitSlot === null || fitKeys(g.supportId).includes(fitSlot)) && has(def.name, supSearch);
    })
    .sort((a, b) => supportGemDef(a.supportId).name.localeCompare(supportGemDef(b.supportId).name));

  return (
    <div className="page war-table-page">
      <WarTableBanner
        subtitle={
          <>
            Runs in cast order; reactive rules taught at the Hideout's War Table. Press <b>Q–Y</b> to cast manually.
          </>
        }
      >
        <SkillLoadoutTray s={s} managing={managing} onManage={() => setManaging(!managing)} />
      </WarTableBanner>
      {tabs}
      {managing && <SkillSets s={s} />}

      <div className="card wt-bar-card">
        <div className="card-title">
          Skill bar
          <span className="grow" />
          {(pickedGem !== null || pickedSupport !== null) && (
            <button className="btn sm" onClick={clear}>
              Cancel selection
            </button>
          )}
          <span className="card-hint">{pickedSupport !== null ? 'Click a skill to socket the picked support' : 'Click a skill to set its supports, trigger and priority'}</span>
        </div>
        <p className="wt-rules-note dim small">
          The first skill whose rules all pass and that you can pay for fires (rules keep 40% of your Life back), otherwise a free Default Attack.
        </p>
        <div className="skill-bar wt-bar">
          {Array.from({ length: SKILL_BAR_SLOTS }, (_, i) => (
            <SlotTile
              key={i}
              s={s}
              slot={i}
              pickedGem={pickedGem}
              rank={order.indexOf(i)}
              onOpen={() => setOpenSlot(i)}
              onPlaced={clear}
              onInspect={() => setInspectSlot(i)}
            />
          ))}
        </div>
        <CastOrder s={s} />
      </div>
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

      <div className="wt-workbench">
      <div className="card r2-gem-bag wt-bag">
        <div className="card-title">
          Gem bag
          <span className="grow" />
          <span className="card-hint">{bagTab === 'skills' ? 'Pick a skill gem, then a slot on the bar' : 'Pick a support, then a skill on the bar'}</span>
        </div>
        <Tabs
          tabs={[
            { id: 'skills', label: 'Skill gems', count: s.storage.gems.length },
            { id: 'supports', label: 'Support gems', count: s.storage.supportGems.length },
          ]}
          value={bagTab}
          onChange={setBagTab}
        />
        {bagTab === 'skills' && (
          <>
            {s.storage.gems.length > 0 && (
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
            {s.storage.gems.length === 0 && (
              <EmptyState small>
                No spare skill gems. Buy them at the Town's Gem shop.
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="btn sm primary" onClick={() => go('vendor')}>
                    Go to the Town
                  </button>
                </div>
              </EmptyState>
            )}
            {s.storage.gems.length > 0 && gems.length === 0 && <div className="dim small">No gems match these filters.</div>}
            {GEM_GROUPS.map((group) => {
              const list = gems.filter((g) => gemGroup(activeGemDef(g.gemId)) === group.id);
              if (!list.length) return null;
              return (
                <section key={group.id} className="r2-gem-section">
                  <div className="r2-gem-section-head">
                    {group.label} <span className="dim num">{list.length}</span>
                  </div>
                  <div className="gem-bag r2-gem-grid wt-tile-grid">
                    {list.map((g) => {
                      const reason = gemUseReason(d.combatLevel, d.attributes, g);
                      const def = activeGemDef(g.gemId);
                      return (
                        <Tooltip key={g.uid} content={<GemTip gem={g} state={s} />}>
                          <button
                            className={`gem-card wt-tile ${pickedGem === g.uid ? 'selected' : ''} ${reason ? 'nofit' : ''}`}
                            style={attrStyle(def.attr)}
                            onClick={() => (setPickedSupport(null), setPickedGem(pickedGem === g.uid ? null : g.uid))}
                          >
                            <span className="wt-tile-socket">
                              <GemIcon def={def} size={30} />
                            </span>
                            <span className="r2-gem-text">
                              <b>{def.name}</b>
                              <span className="dim small">{reason ?? (pickedGem === g.uid ? 'Picked: choose a slot' : 'Click to equip')}</span>
                            </span>
                            <span className="wt-lv num">Lv {g.level}</span>
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
            {s.storage.supportGems.length > 0 && (
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
            {s.storage.supportGems.length === 0 && <EmptyState small>No loose support gems yet. Gemcutting and the Town's Gem shop make them.</EmptyState>}
            {s.storage.supportGems.length > 0 && supports.length === 0 && <div className="dim small">No supports match these filters.</div>}
            {[
              { id: 'fit', label: 'Fit a skill on your bar', list: supports.filter((g) => fitKeys(g.supportId).length > 0) },
              { id: 'nofit', label: "Don't fit anything on your bar", list: supports.filter((g) => fitKeys(g.supportId).length === 0) },
            ].map((group) =>
              group.list.length ? (
                <section key={group.id} className="r2-gem-section">
                  <div className="r2-gem-section-head">
                    {group.label} <span className="dim num">{group.list.length}</span>
                  </div>
                  <div className="gem-bag r2-gem-grid wt-tile-grid">
                    {group.list.map((g) => {
                      const def = supportGemDef(g.supportId);
                      const keys = fitKeys(g.supportId);
                      return (
                        <Tooltip key={g.uid} content={<SupportTip supportId={g.supportId} />}>
                          <button
                            className={`gem-card wt-tile ${pickedSupport === g.uid ? 'selected' : ''} ${keys.length ? '' : 'nofit'}`}
                            style={attrStyle(def.attr)}
                            onClick={() => (setPickedGem(null), setPickedSupport(pickedSupport === g.uid ? null : g.uid))}
                          >
                            <span className="wt-tile-socket">
                              <GemIcon def={def} size={28} support />
                            </span>
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
      <SkillInspector
        s={s}
        pickedGem={pickedGem}
        pickedSupport={pickedSupport}
        inspectSlot={inspectSlot}
        onOpen={setOpenSlot}
        onPlaced={clear}
      />
      </div>
    </div>
  );
}

/** The Skills screen: your gems and skill bar, and the Collection of hidden skilling finds. */
export function SkillGemsPage({ go }: { go: (p: Page) => void }) {
  const [tab, setTab] = useState<'gems' | 'collection'>('gems');
  const tabs = (
    <Tabs
      tabs={[{ id: 'gems', label: 'Skill gems' }, { id: 'collection', label: 'Collection' }]}
      value={tab}
      onChange={setTab}
    />
  );
  if (tab === 'gems') return <SkillGemsBody tabs={tabs} go={go} />;
  return (
    <div className="page war-table-page">
      <WarTableBanner subtitle="Hidden finds from every skilling zone, racked like trophies." />
      {tabs}
      <CollectionPanel />
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
