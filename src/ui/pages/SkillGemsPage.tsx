import { useState } from 'react';
import { activeGemDef, RULE_LABELS, SKILL_BAR_SLOTS, SUPPORT_GEMS, supportGemDef, type RuleCondition } from '../../data/gems';
import {
  expandSockets,
  gemProgress,
  placeOnBar,
  removeFromBar,
  setRule,
  socketSupport,
  supportFits,
  supportReason,
  supportSlots,
  syncSockets,
  unsocketSupport,
} from '../../engine/gems';
import type { GameState, SkillGemInstance } from '../../engine/types';
import { game, useGame } from '../../game';
import { EmptyState, PageHeader, ProgressBar, Tooltip } from '../components/common';
import { GemIcon, GemTip, SupportTip } from '../components/GemView';
import { Icon } from '../components/Icon';

export const SKILL_KEYS = ['Q', 'W', 'E', 'R', 'T', 'Y'];

function RuleEditor({ s, slot, gem }: { s: GameState; slot: number; gem: SkillGemInstance }) {
  const meta = RULE_LABELS[gem.rule.when];
  return (
    <div className="rule-editor">
      <select
        className="input"
        value={gem.rule.when}
        onChange={(e) => {
          const when = e.target.value as RuleCondition;
          game.act((st) => setRule(st, slot, { when, value: RULE_LABELS[when].defaultValue }));
        }}
      >
        {(Object.keys(RULE_LABELS) as RuleCondition[]).map((k) => (
          <option key={k} value={k}>
            {RULE_LABELS[k].label}
          </option>
        ))}
      </select>
      {meta.unit !== undefined && (
        <span className="row" style={{ gap: 4 }}>
          <input
            className="input"
            type="number"
            min={0}
            max={meta.unit === '%' ? 100 : 5}
            value={gem.rule.value ?? meta.defaultValue}
            onChange={(e) => game.act((st) => setRule(st, slot, { when: gem.rule.when, value: Number(e.target.value) }))}
            style={{ width: 64 }}
          />
          <span className="dim">{meta.unit}</span>
        </span>
      )}
      {s.combat?.queued === slot && <span className="chip">queued</span>}
    </div>
  );
}

/** Opened from an empty socket: the loose supports that fit this skill, then the ones that would if you had them. */
function SocketPicker({ s, gem, index, onDone }: { s: GameState; gem: SkillGemInstance; index: number; onDone: () => void }) {
  const act = activeGemDef(gem.gemId);
  const owned = s.supportGems.filter((g) => !supportReason(gem, g.supportId));
  // one entry per kind, even when several copies are in the bag
  const ownedKinds = [...new Map(owned.map((g) => [g.supportId, g])).values()];
  const missing = SUPPORT_GEMS.filter((d) => supportFits(d, act) && !s.supportGems.some((g) => g.supportId === d.id) && !gem.supports.some((x) => x?.supportId === d.id));
  return (
    <div className="socket-picker" onClick={(e) => e.stopPropagation()}>
      <div className="row" style={{ gap: 8 }}>
        <b className="small">Supports for {act.name}</b>
        <span className="grow" />
        <button className="btn sm ghost" title="Close" onClick={onDone}>
          <Icon name="close" size={12} />
        </button>
      </div>
      {ownedKinds.length === 0 && <div className="dim small">None of your loose support gems fit this skill.</div>}
      <div className="socket-picker-list">
        {ownedKinds.map((g) => {
          const def = supportGemDef(g.supportId);
          return (
            <Tooltip key={g.uid} content={<SupportTip supportId={g.supportId} />}>
              <button
                className="gem-card"
                onClick={() => {
                  game.act((st) => socketSupport(st, gem.uid, g.uid, index));
                  onDone();
                }}
              >
                <GemIcon def={def} size={28} support />
                <span>
                  <b>{def.name}</b>
                  {def.signatureFor && <span className="dim"> · signature</span>}
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>
      {missing.length > 0 && (
        <>
          <div className="dim small" style={{ marginTop: 8 }}>
            Also fits, not found yet
          </div>
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
        </>
      )}
    </div>
  );
}

function SlotRow({
  s,
  slot,
  pickedGem,
  pickedSupport,
  onPlaced,
}: {
  s: GameState;
  slot: number;
  pickedGem: number | null;
  pickedSupport: number | null;
  onPlaced: () => void;
}) {
  const gem = s.skillBar[slot];
  const key = SKILL_KEYS[slot];
  const [openSocket, setOpenSocket] = useState<number | null>(null);
  if (!gem) {
    return (
      <div
        className={`card gem-slot empty ${pickedGem !== null ? 'target' : ''}`}
        onClick={() => {
          if (pickedGem === null) return;
          game.act((st) => placeOnBar(st, pickedGem, slot));
          onPlaced();
        }}
      >
        <span className="slot-key">{key}</span>
        <span className="dim">{pickedGem !== null ? 'Place the selected skill here' : 'Empty slot — pick a skill gem below'}</span>
      </div>
    );
  }
  syncSockets(gem);
  const def = activeGemDef(gem.gemId);
  const sockets = supportSlots(gem);
  const pickedDef = pickedSupport !== null ? s.supportGems.find((x) => x.uid === pickedSupport) : null;
  const fitReason = pickedDef ? supportReason(gem, pickedDef.supportId) : null;

  return (
    <div className={`card gem-slot ${pickedGem !== null ? 'target' : ''}`} onClick={() => {
      if (pickedGem === null) return;
      game.act((st) => placeOnBar(st, pickedGem, slot));
      onPlaced();
    }}>
      <span className="slot-key">{key}</span>
      <Tooltip content={<GemTip gem={gem} state={s} />}>
        <span>
          <GemIcon def={def} size={46} />
        </span>
      </Tooltip>
      <div className="gem-slot-main">
        <div className="row" style={{ gap: 8 }}>
          <b>{def.name}</b>
          <span className="nav-badge">Lv {gem.level}</span>
          <span className="dim small">{def.role}</span>
        </div>
        <ProgressBar value={gemProgress(gem)} color="var(--gem)" className="thin" />
        <div className="sockets">
          {Array.from({ length: sockets }, (_, i) => {
            const sup = gem.supports[i];
            const canDrop = pickedDef && !fitReason;
            return sup ? (
              <Tooltip key={i} content={<SupportTip supportId={sup.supportId} />}>
                <button
                  className={`socket filled ${canDrop ? 'target' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canDrop) {
                      game.act((st) => socketSupport(st, gem.uid, pickedSupport!, i));
                      onPlaced();
                    } else game.act((st) => unsocketSupport(st, gem.uid, i));
                  }}
                  title="Click to remove"
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
                title={pickedDef ? (fitReason ?? 'Socket here') : 'Show the supports that fit'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canDrop) {
                    game.act((st) => socketSupport(st, gem.uid, pickedSupport!, i));
                    onPlaced();
                  } else setOpenSocket(openSocket === i ? null : i);
                }}
              >
                <span className="socket-hole" />
                <span className="dim">{pickedDef ? (fitReason ?? 'Socket here') : 'Empty socket'}</span>
              </button>
            );
          })}
          {(s.bank.expansion ?? 0) > 0 && gem.extraSlots < 1 && (
            <button className="btn sm" onClick={(e) => (e.stopPropagation(), game.act((st, ctx) => expandSockets(st, ctx, gem.uid)))}>
              + Socket (Orb of Expansion)
            </button>
          )}
        </div>
        {openSocket !== null && !gem.supports[openSocket] && (
          <SocketPicker s={s} gem={gem} index={openSocket} onDone={() => setOpenSocket(null)} />
        )}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <RuleEditor s={s} slot={slot} gem={gem} />
        <div className="row" style={{ marginTop: 6, justifyContent: 'flex-end' }}>
          <button className="btn sm ghost" disabled={slot === 0} title="Higher priority" onClick={() => game.act((st) => placeOnBar(st, gem.uid, slot - 1))}>
            ↑
          </button>
          <button className="btn sm ghost" disabled={slot === SKILL_BAR_SLOTS - 1} title="Lower priority" onClick={() => game.act((st) => placeOnBar(st, gem.uid, slot + 1))}>
            ↓
          </button>
          <button className="btn sm ghost" title="Remove from bar" onClick={() => game.act((st) => removeFromBar(st, slot))}>
            <Icon name="close" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SkillGemsPage() {
  const s = useGame();
  const [pickedGem, setPickedGem] = useState<number | null>(null);
  const [pickedSupport, setPickedSupport] = useState<number | null>(null);
  const clear = () => {
    setPickedGem(null);
    setPickedSupport(null);
  };

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
        Skills with a cooldown (guards, buffs, spells, area attacks) go first, top to bottom, when their rule passes. Then your first attack whose rule passes and
        that you have the mana for; attacks have no cooldown, so mana is their limit. Otherwise a free Default Attack. Press <b>Q–Y</b> in combat to cast a slot
        manually.
      </PageHeader>

      <div className="grid" style={{ gap: 10 }}>
        {Array.from({ length: SKILL_BAR_SLOTS }, (_, i) => (
          <SlotRow key={i} s={s} slot={i} pickedGem={pickedGem} pickedSupport={pickedSupport} onPlaced={clear} />
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">
            Skill gems
            <span className="grow" />
            <span className="card-hint">
              Click one, then a slot above
            </span>
          </div>
          {s.gems.length === 0 && <EmptyState small>No spare skill gems. They drop from monsters, especially bosses.</EmptyState>}
          <div className="gem-bag">
            {s.gems.map((g) => (
              <Tooltip key={g.uid} content={<GemTip gem={g} state={s} />}>
                <button className={`gem-card ${pickedGem === g.uid ? 'selected' : ''}`} onClick={() => (setPickedSupport(null), setPickedGem(pickedGem === g.uid ? null : g.uid))}>
                  <GemIcon def={activeGemDef(g.gemId)} size={34} />
                  <span>
                    <b>{activeGemDef(g.gemId).name}</b>
                    <span className="dim"> Lv {g.level}</span>
                  </span>
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            Support gems
            <span className="grow" />
            <span className="card-hint">
              Click one, then a glowing socket
            </span>
          </div>
          {s.supportGems.length === 0 && <EmptyState small>No loose support gems yet.</EmptyState>}
          <div className="gem-bag">
            {s.supportGems.map((g) => {
              const def = supportGemDef(g.supportId);
              const fitsAny = s.skillBar.some((b) => b && !supportReason(b, g.supportId));
              return (
                <Tooltip key={g.uid} content={<SupportTip supportId={g.supportId} />}>
                  <button
                    className={`gem-card ${pickedSupport === g.uid ? 'selected' : ''} ${fitsAny ? '' : 'nofit'}`}
                    onClick={() => (setPickedGem(null), setPickedSupport(pickedSupport === g.uid ? null : g.uid))}
                  >
                    <GemIcon def={def} size={30} support />
                    <span>
                      <b>{def.name}</b>
                      {def.signatureFor && <span className="dim"> · {activeGemDef(def.signatureFor).name}</span>}
                    </span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
