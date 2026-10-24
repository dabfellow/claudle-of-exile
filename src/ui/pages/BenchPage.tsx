import { useState } from 'react';
import { affixDef } from '../../data/affixes';
import { ACHIEVEMENT_BY_ID } from '../../data/achievements';
import { BENCH_CRAFTS } from '../../data/hideout';
import { achievementProgress } from '../../engine/achievements';
import { currencyDef } from '../../data/materials';
import { applyOrb, benchCraft, benchCraftReason, findItem, orbReason, salvage } from '../../engine/crafting';
import { stationLevel } from '../../engine/hideout';
import { affixRangeText, itemName, salvageValue } from '../../engine/items';
import type { EquipSlot, Item } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, Cost, EmptyState, fmt, GameIcon, PageHeader, ProgressBar, Tooltip } from '../components/common';
import { Orb } from '../components/Icon';
import { ItemCell, ItemTip } from '../components/ItemView';
import { Inventory } from '../components/Inventory';

const ORB_ORDER = ['transmute', 'augment', 'alteration', 'regal', 'alchemy', 'chaos', 'exalted', 'annul', 'scour', 'divine'];

export function BenchPage() {
  const s = useGame();
  const [uid, setUid] = useState<number | null>(null);
  const [flash, setFlash] = useState(0);
  const [history, setHistory] = useState<{ id: number; text: string; name: string; rarity: Item['rarity'] }[]>([]);
  const item = uid !== null ? findItem(s, uid) : undefined;
  const benchLvl = stationLevel(s, 'bench');
  const equipped = Object.entries(s.equipment) as [EquipSlot, Item][];

  const use = (orbId: string) => {
    if (!item) return;
    const err = game.act((st, ctx) => applyOrb(st, ctx, orbId, item.uid));
    if (!err) {
      setFlash((f) => f + 1);
      setHistory((h) => [{ id: Date.now() + Math.random(), text: currencyDef(orbId).name, name: itemName(item), rarity: item.rarity }, ...h].slice(0, 12));
    }
  };

  const craft = (id: string) => {
    if (!item) return;
    const err = game.act((st, ctx) => benchCraft(st, ctx, id, item.uid));
    if (!err) {
      setFlash((f) => f + 1);
      setHistory((h) => [{ id: Date.now() + Math.random(), text: 'Bench craft', name: itemName(item), rarity: item.rarity }, ...h].slice(0, 12));
    }
  };

  return (
    <div className="page">
      <PageHeader title="Crafting Bench" actions={<Badge tone="gold">Bench level {benchLvl}</Badge>}>
        Select an item, then spend orbs to reshape its modifiers. Item level caps which modifier tiers can roll.
      </PageHeader>

      <div className="bench-layout">
        <div className="card bench-item">
          {item ? (
            <>
              <div key={flash} className={flash ? 'shimmer' : ''} style={{ width: '100%' }}>
                <ItemTip item={item} state={s} />
              </div>
              {s.inventory.some((i) => i.uid === item.uid) && (
                <button
                  className="btn sm danger"
                  onClick={() => {
                    game.act((st, ctx) => salvage(st, ctx, [item.uid]));
                    setUid(null);
                  }}
                >
                  Salvage for {salvageValue(item)} dust
                </button>
              )}
            </>
          ) : (
            <EmptyState icon={<GameIcon name="bench" size={32} color="var(--dim)" />} title="No item selected">
              Pick one from your gear or inventory below.
            </EmptyState>
          )}
          {history.length > 0 && (
            <div style={{ width: '100%' }}>
              <div className="section-label">History</div>
              <div className="combat-log" style={{ maxHeight: 120 }}>
                {history.map((h) => (
                  <div key={h.id}>
                    {h.text} → <span style={{ color: `var(--${h.rarity})` }}>{h.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-title">Currency</div>
            <div className="orb-grid">
              {ORB_ORDER.map((id) => {
                const c = currencyDef(id);
                const n = s.bank[id] ?? 0;
                const reason = item ? orbReason(s, id, item.uid) : 'Select an item';
                return (
                  <Tooltip
                    key={id}
                    content={
                      <div className="tip">
                        <div className="tip-title" style={{ color: 'var(--currency)' }}>
                          {c.name}
                        </div>
                        <div>{c.desc}</div>
                        {reason && <div className="warn" style={{ marginTop: 4 }}>{reason}</div>}
                      </div>
                    }
                  >
                    <button data-tut={`orb-${id}`} className="orb-btn" style={{ ['--orb' as string]: c.color }} disabled={!!reason} onClick={() => use(id)}>
                      <Orb color={c.color} size={26} glow={!reason} />
                      <span>
                        <div className="name">{c.short}</div>
                        <div className="count num">×{n}</div>
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            {item && <div className="dim small" style={{ marginTop: 10 }}>Tip: hover an item and hold Alt to see modifier tiers.</div>}
          </div>

          <div className="card">
            <div className="card-title">
              Bench Crafts
              <span className="grow" />
              <span className="card-hint">
                One crafted modifier per item
              </span>
            </div>
            {benchLvl < 2 && (
              <EmptyState small icon={<GameIcon name="lock" size={24} color="var(--dim)" />}>
                Upgrade the Crafting Bench in your Hideout to unlock crafted modifiers.
              </EmptyState>
            )}
            <div className="card-grid" style={{ ['--card-min' as string]: '230px', gap: 8 }}>
              {BENCH_CRAFTS.filter((b) => b.benchLevel <= benchLvl).map((b) => {
                const a = affixDef(b.affixId);
                const preview = affixRangeText(a.id, b.tier);
                const reason = item ? benchCraftReason(s, b.id, item.uid) : 'Select an item';
                if (b.achievement && !s.achievements.includes(b.achievement)) {
                  const ach = ACHIEVEMENT_BY_ID[b.achievement];
                  const p = achievementProgress(s, b.achievement);
                  return (
                    <div key={b.id} className="mat bench-locked" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                      <span className="mod crafted small">{preview}</span>
                      <span className="row" style={{ gap: 6 }}>
                        <Badge tone="locked">Locked</Badge>
                        <span className="dim small">
                          {ach.name}: {ach.desc}
                        </span>
                      </span>
                      <ProgressBar value={p.value / p.target} color="var(--accent)" />
                      <span className="dim small num">
                        {fmt(p.value)} / {fmt(p.target)}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={b.id} className="mat" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                    <span className="mod crafted small">{preview}</span>
                    <span className="dim small">{a.kind}</span>
                    <Cost cost={b.cost} have={s.bank} />
                    <button className="btn sm" disabled={!!reason} title={reason ?? ''} onClick={() => craft(b.id)}>
                      {reason && item ? reason : 'Craft'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {equipped.length > 0 && (
        <div className="card">
          <div className="card-title">Equipped</div>
          <div className="inv-grid">
            {equipped.map(([slot, it]) => (
              <ItemCell key={slot} item={it} state={s} selected={uid === it.uid} onClick={() => setUid(it.uid)} />
            ))}
          </div>
        </div>
      )}
      <Inventory s={s} onPick={(it) => setUid(it.uid)} selected={uid} />
    </div>
  );
}
