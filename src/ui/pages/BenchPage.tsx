import { useState } from 'react';
import { stashedItems } from '../../engine/storage';
import { affixDef } from '../../data/affixes';
import { ACHIEVEMENT_BY_ID } from '../../data/achievements';
import { ESSENCES, FOSSILS, fossilDef } from '../../data/craftMats';
import { BENCH_CRAFTS } from '../../data/hideout';
import { achievementProgress } from '../../engine/achievements';
import { INSTILL_CONDITIONS } from '../../data/flasks';
import { currencyDef } from '../../data/materials';
import { equipFlask, unequipFlask } from '../../engine/combat';
import { applyEssence, applyOrb, benchCraft, benchCraftReason, essenceReason, findItem, FOSSIL_ORBS, orbReason, salvage } from '../../engine/crafting';
import { applyFlaskOrb, enchantFlask, findFlask, flaskName, flaskOrbReason, FLASK_ORBS } from '../../engine/flasks';
import { stationLevel } from '../../engine/hideout';
import { affixRangeText, itemName, salvageValue } from '../../engine/items';
import type { FlaskInstance, GameState, Item } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, Cost, EmptyState, fmt, GameIcon, MatIcon, PageHeader, ProgressBar, Tooltip } from '../components/common';
import { CraftUntilCard } from '../components/CraftUntilCard';
import { FlaskIcon, FlaskTip, pinFlask } from '../components/FlaskView';
import { Orb } from '../components/Icon';
import { ItemTip } from '../components/ItemView';
import { Inventory } from '../components/Inventory';
import { PaperDoll } from '../components/PaperDoll';

const ORB_ORDER = ['transmute', 'augment', 'alteration', 'regal', 'alchemy', 'chaos', 'exalted', 'annul', 'scour', 'divine'];

/** Orbs, enchanting and belt slots for the selected flask. */
function FlaskCraft({ s, f, onCraft }: { s: GameState; f: FlaskInstance; onCraft: () => void }) {
  const slotIndex = s.flaskSlots.findIndex((x) => x?.uid === f.uid);
  const instills = s.bank.instill ?? 0;
  const run = (err: string | null) => {
    if (!err) onCraft();
  };
  return (
    <div className="card">
      <div className="card-title">
        Flask crafting
        <span className="grow" />
        <span className="card-hint">Flasks drop from monsters and are brewed with Alchemy</span>
      </div>
      <div className="grid" style={{ gap: 14 }}>
        <div>
          <div className="section-label">Craft</div>
          <div className="row wrap">
            {FLASK_ORBS.map((orb) => {
              const reason = flaskOrbReason(s, orb, f);
              return (
                <button key={orb} className="btn sm" disabled={!!reason} title={reason ?? currencyDef(orb).desc} onClick={() => run(game.act((st, ctx) => applyFlaskOrb(st, ctx, orb, f.uid)))}>
                  <MatIcon id={orb} size={13} /> {currencyDef(orb).short} <span className="dim">×{s.bank[orb] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="section-label">
            Enchant with an Instilling Orb <span className="dim">({instills} owned)</span>
          </div>
          <div className="row wrap">
            {INSTILL_CONDITIONS.map((c) => (
              <button
                key={c.id}
                className={`btn sm ${f.instill === c.id ? 'active' : ''}`}
                disabled={instills < 1 || f.instill === c.id}
                title={instills < 1 ? 'Instilling Orbs drop in deeper areas' : c.desc}
                onClick={() => run(game.act((st, ctx) => enchantFlask(st, ctx, f.uid, c.id)))}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="dim small" style={{ marginTop: 4 }}>
            An enchanted flask drinks itself in combat when its condition is met. Enchanting again replaces it.
          </div>
        </div>
        <div>
          <div className="section-label">Belt</div>
          {slotIndex >= 0 ? (
            <button className="btn sm" onClick={() => game.act((st) => unequipFlask(st, slotIndex))}>
              Take off belt (slot {slotIndex + 1})
            </button>
          ) : (
            <div className="row wrap">
              {s.flaskSlots.map((x, i) => (
                <button key={i} className="btn sm" onClick={() => game.act((st) => equipFlask(st, f.uid, i))}>
                  {x ? `Swap into ${i + 1}` : `Put in slot ${i + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BenchPage() {
  const s = useGame();
  const [uid, setUid] = useState<number | null>(null);
  const [flaskUid, setFlaskUid] = useState<number | null>(null);
  const [flash, setFlash] = useState(0);
  const [history, setHistory] = useState<{ id: number; text: string; name: string; rarity: Item['rarity'] }[]>([]);
  const [fossil, setFossil] = useState<string | null>(null);
  const item = uid !== null ? findItem(s, uid) : undefined;
  const benchLvl = stationLevel(s, 'bench');
  const flask = flaskUid !== null ? findFlask(s, flaskUid) : undefined;
  const pickItem = (id: number) => {
    setUid(id);
    setFlaskUid(null);
  };
  const pickFlask = (id: number) => {
    setFlaskUid(id);
    setUid(null);
  };

  const fossilFor = (orbId: string) => (fossil && FOSSIL_ORBS.has(orbId) ? fossil : null);
  const use = (orbId: string) => {
    if (!item) return;
    const f = fossilFor(orbId);
    const err = game.act((st, ctx) => applyOrb(st, ctx, orbId, item.uid, f));
    if (!err) {
      setFlash((n) => n + 1);
      const text = f ? `${currencyDef(orbId).name} + ${fossilDef(f)!.name}` : currencyDef(orbId).name;
      setHistory((h) => [{ id: Date.now() + Math.random(), text, name: itemName(item), rarity: item.rarity }, ...h].slice(0, 12));
      if (f && (s.bank[f] ?? 0) <= 1) setFossil(null);
    }
  };

  const essence = (id: string) => {
    if (!item) return;
    const err = game.act((st, ctx) => applyEssence(st, ctx, id, item.uid));
    if (!err) {
      setFlash((n) => n + 1);
      setHistory((h) => [{ id: Date.now() + Math.random(), text: ESSENCES.find((e) => e.id === id)!.name, name: itemName(item), rarity: item.rarity }, ...h].slice(0, 12));
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
        Select gear or a flask, then spend orbs to reshape its modifiers. Item level caps which modifier tiers can roll.
      </PageHeader>

      <div className="bench-layout">
        <div className="card bench-item">
          {item ? (
            <>
              <div key={flash} className={flash ? 'shimmer' : ''} style={{ width: '100%' }}>
                <ItemTip item={item} state={s} />
              </div>
              {!Object.values(s.equipment).some((i) => i?.uid === item.uid) && (
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
          ) : flask ? (
            <div key={flash} className={flash ? 'shimmer' : ''} style={{ width: '100%' }}>
              <FlaskTip f={flask} pinned />
            </div>
          ) : (
            <EmptyState icon={<GameIcon name="bench" size={32} color="var(--dim)" />} title="Nothing selected">
              Pick gear, a flask, or an item from your bag or stash below.
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

        {flask ? (
          <FlaskCraft s={s} f={flask} onCraft={() => setFlash((n) => n + 1)} />
        ) : (
        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-title">Currency</div>
            <div className="orb-grid">
              {ORB_ORDER.map((id) => {
                const c = currencyDef(id);
                const n = s.bank[id] ?? 0;
                const reason = item ? orbReason(s, id, item.uid, fossilFor(id)) : 'Select an item';
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
            {FOSSILS.some((f) => s.bank[f.id]) && (
              <div className="fossil-chips">
                <span className="dim small">Fossil:</span>
                {FOSSILS.filter((f) => s.bank[f.id]).map((f) => (
                  <button
                    key={f.id}
                    className={`btn sm ${fossil === f.id ? 'selected' : ''}`}
                    title={`${f.desc}. Used up with the next orb that rolls modifiers.`}
                    onClick={() => setFossil(fossil === f.id ? null : f.id)}
                  >
                    <MatIcon id={f.id} size={12} /> {f.name.replace(' Fossil', '')} <span className="dim">×{s.bank[f.id]}</span>
                  </button>
                ))}
              </div>
            )}
            {item && <div className="dim small" style={{ marginTop: 10 }}>Tip: hover an item and hold Alt to see modifier tiers.</div>}
          </div>

          {ESSENCES.some((e) => s.bank[e.id]) && (
            <div className="card">
              <div className="card-title">
                Essences
                <span className="grow" />
                <span className="card-hint">Makes the item Magic with this modifier guaranteed</span>
              </div>
              <div className="fossil-chips" style={{ marginTop: 0 }}>
                {ESSENCES.filter((e) => s.bank[e.id]).map((e) => {
                  const reason = item ? essenceReason(s, e.id, item.uid) : 'Select an item';
                  return (
                    <button key={e.id} className="btn sm" disabled={!!reason} title={reason ?? affixRangeText(e.affixId, e.tier)} onClick={() => essence(e.id)}>
                      <MatIcon id={e.id} size={12} /> {e.name} <span className="dim">×{s.bank[e.id]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <CraftUntilCard s={s} item={item} />

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
        )}
      </div>

      <div className="card doll-card">
        <PaperDoll
          s={s}
          selected={uid ?? flaskUid}
          onItem={(_, it) => pickItem(it.uid)}
          onFlask={(_, f) => pickFlask(f.uid)}
          emptyFlaskTitle="Select a spare flask to put it on your belt"
        />
      </div>
      {s.flaskStash.length > 0 && (
        <div className="card">
          <div className="card-title">Spare flasks ({s.flaskStash.length})</div>
          <div className="gem-bag">
            {s.flaskStash.map((f) => (
              <Tooltip key={f.uid} content={<FlaskTip f={f} />}>
                <button
                  className={`gem-card ${flaskUid === f.uid ? 'selected' : ''}`}
                  onClick={() => pickFlask(f.uid)}
                  onContextMenu={(e) => (e.preventDefault(), pinFlask(f))}
                >
                  <FlaskIcon f={f} size={28} />
                  <b className={f.rarity === 'magic' ? 'magic-text' : ''}>{flaskName(f)}</b>
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      )}
      <Inventory s={s} title="Bag & stash" items={[...stashedItems(s), ...s.inventory]} cap={null} onPick={(it) => pickItem(it.uid)} selected={uid} />
    </div>
  );
}
