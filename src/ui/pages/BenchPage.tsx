import { useState } from 'react';
import { stashedItems } from '../../engine/storage';
import { affixDef } from '../../data/affixes';
import { ACHIEVEMENT_BY_ID } from '../../data/achievements';
import { ESSENCES, FOSSILS, fossilDef, SEAL, WAX } from '../../data/craftMats';
import { WHETSTONE } from '../../data/expedition';
import { runeDef, RUNES } from '../../data/runes';
import { BENCH_CRAFTS } from '../../data/hideout';
import { achievementProgress } from '../../engine/achievements';
import { recipeUnlocked } from '../../engine/challenge';
import { INSTILL_CONDITIONS } from '../../data/flasks';
import { actOpen } from '../../data/zones';
import { currencyDef } from '../../data/materials';
import { equipFlask, unequipFlask } from '../../engine/combat';
import { applyEssence, applyOrb, applyWhetstone, BENCH_UNBUILT, benchBuilt, benchCraft, benchCraftReason, essenceReason, findItem, FOSSIL_ORBS, impressionReason, orbReason, restoreImpression, restoreReason, salvage, SEAL_ORBS, takeImpression, whetstoneReason } from '../../engine/crafting';
import { applyFlaskOrb, enchantFlask, findFlask, flaskOrbReason, FLASK_ORBS } from '../../engine/flasks';
import { stationLevel } from '../../engine/hideout';
import { affixRangeText, allMods, describeMod, itemName, salvageValue } from '../../engine/items';
import { inscribeRune, runeReason, runeText } from '../../engine/runes';
import type { FlaskInstance, GameState, Item } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, Cost, EmptyState, fmt, GameIcon, MatIcon, PageHeader, ProgressBar, Tooltip } from '../components/common';
import { CraftUntilCard } from '../components/CraftUntilCard';
import { FlaskShelf, FlaskTip } from '../components/FlaskView';
import { ItemTip } from '../components/ItemView';
import { Inventory } from '../components/Inventory';
import { PaperDoll } from '../components/PaperDoll';

const ORB_ORDER = ['transmute', 'augment', 'alteration', 'regal', 'alchemy', 'chaos', 'exalted', 'annul', 'scour', 'divine'];

/** Orbs, enchanting and belt slots for the selected flask. */
function FlaskCraft({ s, f, onCraft }: { s: GameState; f: FlaskInstance; onCraft: () => void }) {
  const slotIndex = s.flaskSlots.findIndex((x) => x?.uid === f.uid);
  const instills = s.account.bank.instill ?? 0;
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
                  <MatIcon id={orb} size={13} /> {currencyDef(orb).short} <span className="dim">×{s.account.bank[orb] ?? 0}</span>
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
            {INSTILL_CONDITIONS.filter((c) => !c.act || actOpen(c.act)).map((c) => (
              <button
                key={c.id}
                className={`btn sm ${f.instill === c.id ? 'active' : ''}`}
                disabled={instills < 1 || f.instill === c.id}
                title={instills < 1 ? 'Instilling Orbs drop from Act 4 on' : c.desc}
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
  const [seal, setSeal] = useState<string | null>(null);
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
  // the Seal is on one modifier of one item, so it only counts while that modifier is there
  const sealFor = (orbId: string) => (seal && item && SEAL_ORBS.has(orbId) && allMods(item).some((m) => m.affixId === seal) ? seal : null);
  const use = (orbId: string) => {
    if (!item) return;
    const f = fossilFor(orbId);
    const kept = sealFor(orbId);
    const err = game.act((st, ctx) => applyOrb(st, ctx, orbId, item.uid, f, kept));
    if (!err) {
      setFlash((n) => n + 1);
      const text = [currencyDef(orbId).name, f && fossilDef(f)!.name, kept && "Forger's Seal"].filter(Boolean).join(' + ');
      setHistory((h) => [{ id: Date.now() + Math.random(), text, name: itemName(item), rarity: item.rarity }, ...h].slice(0, 12));
      if (f && (s.account.bank[f] ?? 0) <= 1) setFossil(null);
      if (kept) setSeal(null);
    }
  };

  const wax = (fn: typeof takeImpression, text: string) => {
    if (!item) return;
    const err = game.act((st, ctx) => fn(st, ctx, item.uid));
    if (!err) {
      setFlash((n) => n + 1);
      setHistory((h) => [{ id: Date.now() + Math.random(), text, name: itemName(item), rarity: item.rarity }, ...h].slice(0, 12));
    }
  };

  const hone = (affixId: string) => {
    if (!item) return;
    const err = game.act((st, ctx) => applyWhetstone(st, ctx, item.uid, affixId));
    if (!err) {
      setFlash((n) => n + 1);
      setHistory((h) => [{ id: Date.now() + Math.random(), text: 'Ancient Whetstone', name: itemName(item), rarity: item.rarity }, ...h].slice(0, 12));
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

  const inscribe = (id: string) => {
    if (!item) return;
    const err = game.act((st, ctx) => inscribeRune(st, ctx, id, item.uid));
    if (!err) {
      setFlash((n) => n + 1);
      setHistory((h) => [{ id: Date.now() + Math.random(), text: runeDef(id)!.name, name: itemName(item), rarity: item.rarity }, ...h].slice(0, 12));
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

  const essences = ESSENCES.filter((e) => s.account.bank[e.id]);
  const fossils = FOSSILS.filter((f) => s.account.bank[f.id]);
  const runes = RUNES.filter((r) => s.account.bank[r.id]);
  const seals = s.account.bank[SEAL] ?? 0;
  const waxes = s.account.bank[WAX] ?? 0;
  const contraband = seals > 0 || waxes > 0 || !!item?.impression;
  const whetstones = s.account.bank[WHETSTONE] ?? 0;

  return (
    <div className="page bench-page">
      <PageHeader title="Crafting Bench" actions={<Badge tone="gold">Bench level {benchLvl}</Badge>}>
        Select gear or a flask, then spend orbs to reshape its modifiers. Item level caps which modifier tiers can roll.
      </PageHeader>

      {/* the orbs stay on screen while you scroll, like the selected item */}
      <div className="card bench-orb-bar">
        {ORB_ORDER.map((id) => {
          const c = currencyDef(id);
          const n = s.account.bank[id] ?? 0;
          const f = fossilFor(id);
          const kept = sealFor(id);
          const reason = item ? orbReason(s, id, item.uid, f, kept) : flask ? 'Flasks use the orbs under Flask crafting' : 'Select an item';
          return (
            <Tooltip
              key={id}
              content={
                <div className="tip">
                  <div className="tip-title" style={{ color: 'var(--currency)' }}>
                    {c.name}
                  </div>
                  <div>{c.desc}</div>
                  {f && <div className="dim small">With {fossilDef(f)!.name}</div>}
                  {kept && <div className="dim small">With a Forger's Seal</div>}
                  {reason && <div className="warn" style={{ marginTop: 4 }}>{reason}</div>}
                </div>
              }
            >
              <button data-tut={`orb-${id}`} className={`orb-btn ${f || kept ? 'fossiled' : ''}`} style={{ ['--orb' as string]: c.color }} disabled={!!reason} onClick={() => use(id)}>
                <MatIcon id={id} size={24} />
                <span>
                  <div className="name">{c.short}</div>
                  <div className="count num">×{fmt(n)}</div>
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>

      <div className="bench-layout">
        {/* what you're crafting on stays pinned beside everything else */}
        <aside className="bench-side">
          <div className="card bench-item">
            {item ? (
              <>
                <div key={flash} className={flash ? 'shimmer' : ''} style={{ width: '100%' }}>
                  <ItemTip item={item} state={s} />
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {!Object.values(s.equipment).some((i) => i?.uid === item.uid) && (
                    <button
                      data-tut="salvage-item"
                      className="btn sm danger"
                      disabled={!benchBuilt(s)}
                      title={benchBuilt(s) ? '' : BENCH_UNBUILT}
                      onClick={() => {
                        game.act((st, ctx) => salvage(st, ctx, [item.uid]));
                        setUid(null);
                      }}
                    >
                      Salvage for {salvageValue(item)} dust
                    </button>
                  )}
                  <button className="btn sm ghost" onClick={() => setUid(null)}>
                    Deselect
                  </button>
                </div>
                <div className="dim small">Hover the item and hold Alt to see modifier tiers.</div>
              </>
            ) : flask ? (
              <>
                <div key={flash} className={flash ? 'shimmer' : ''} style={{ width: '100%' }}>
                  <FlaskTip f={flask} pinned />
                </div>
                <button className="btn sm ghost" onClick={() => setFlaskUid(null)}>
                  Deselect
                </button>
              </>
            ) : (
              <EmptyState icon={<GameIcon name="bench" size={32} color="var(--dim)" />} title="Nothing selected">
                Click your gear, a flask, or an item in your bag or stash. It stays here while you craft.
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
          {flask && <FlaskCraft s={s} f={flask} onCraft={() => setFlash((n) => n + 1)} />}
        </aside>

        <div className="bench-main">
          <div className="bench-upper">
            <div className="bench-crafts-col">
              <div className="card">
                <div className="card-title">
                  Bench Crafts
                  <span className="grow" />
                  <span className="card-hint">One crafted modifier per item</span>
                </div>
                {benchLvl < 2 && (
                  <EmptyState small icon={<GameIcon name="lock" size={24} color="var(--dim)" />}>
                    Upgrade the Crafting Bench in your Hideout to unlock crafted modifiers.
                  </EmptyState>
                )}
                <div className="card-grid" style={{ ['--card-min' as string]: '200px', gap: 8 }}>
                  {BENCH_CRAFTS.filter((b) => b.benchLevel <= benchLvl).map((b) => {
                    const a = affixDef(b.affixId);
                    const preview = affixRangeText(a.id, b.tier);
                    const reason = item ? benchCraftReason(s, b.id, item.uid) : 'Select an item';
                    if (b.achievement && !recipeUnlocked(s, b.achievement)) {
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
                        <Cost cost={b.cost} have={s.account.bank} />
                        <button className="btn sm" disabled={!!reason} title={reason ?? ''} onClick={() => craft(b.id)}>
                          {reason && item ? reason : 'Craft'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bench-doll-col">
              <div className="card doll-card">
                <div className="card-title" style={{ alignSelf: 'stretch' }}>
                  Equipment
                </div>
                <PaperDoll
                  s={s}
                  selected={uid ?? flaskUid}
                  onItem={(_, it) => pickItem(it.uid)}
                  onFlask={(_, f) => pickFlask(f.uid)}
                  emptyFlaskTitle="Select a spare flask to put it on your belt"
                />
              </div>

              <CraftUntilCard s={s} item={item} />

              {(fossils.length > 0 || essences.length > 0 || runes.length > 0 || contraband || whetstones > 0) && (
                <div className="card">
                  <div className="card-title">Special crafting</div>
                  {runes.length > 0 && (
                    <>
                      <div className="section-label">Runes · cut one into the item's rune slot. Orbs never touch it, and a new rune destroys the old one</div>
                      <div className="fossil-chips" style={{ marginTop: 0, marginBottom: 10 }}>
                        {runes.map((r) => {
                          const reason = item ? runeReason(s, r.id, item.uid) : 'Select an item';
                          return (
                            <button key={r.id} data-rune={r.id} className="btn sm" disabled={!!reason} title={reason ?? runeText(r, item!)} onClick={() => inscribe(r.id)}>
                              <MatIcon id={r.id} size={12} /> {r.name} <span className="dim">×{s.account.bank[r.id]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {whetstones > 0 && (
                    <>
                      <div className="section-label">Ancient Whetstone ×{whetstones} · raise one modifier a tier, as far as the item level allows. Its values reroll within the new tier. One per item, for as long as that modifier stays</div>
                      <div className="fossil-chips" style={{ marginTop: 0, marginBottom: 10 }}>
                        {item && allMods(item).length ? (
                          allMods(item).map((m) => {
                            const reason = whetstoneReason(s, item.uid, m.affixId);
                            return (
                              <button key={m.affixId} className="btn sm" disabled={!!reason} title={reason ?? 'Uses one Ancient Whetstone'} onClick={() => hone(m.affixId)}>
                                <MatIcon id={WHETSTONE} size={12} /> {describeMod(m)}
                              </button>
                            );
                          })
                        ) : (
                          <span className="dim small">{item ? 'This item has no modifiers.' : 'Select an item.'}</span>
                        )}
                      </div>
                    </>
                  )}
                  {seals > 0 && (
                    <>
                      <div className="section-label">Forger's Seal ×{seals} · pick a modifier, and the next Alteration, Chaos, Annulment or Divine leaves it alone</div>
                      <div className="fossil-chips" style={{ marginTop: 0 }}>
                        {item && allMods(item).length ? (
                          allMods(item).map((m) => (
                            <button key={m.affixId} className={`btn sm ${seal === m.affixId ? 'selected' : ''}`} title="Used up with the next orb it protects from." onClick={() => setSeal(seal === m.affixId ? null : m.affixId)}>
                              <MatIcon id={SEAL} size={12} /> {describeMod(m)}
                            </button>
                          ))
                        ) : (
                          <span className="dim small">{item ? 'This item has no modifiers.' : 'Select an item.'}</span>
                        )}
                      </div>
                    </>
                  )}
                  {(waxes > 0 || item?.impression) && (
                    <>
                      <div className="section-label" style={{ marginTop: seals ? 10 : 0 }}>Locksmith's Wax ×{waxes} · keep a copy before a risky orb, and put the item back if you don't like the result</div>
                      <div className="fossil-chips" style={{ marginTop: 0 }}>
                        <button className="btn sm" disabled={!!(item ? impressionReason(s, item.uid) : 'x')} title={(item ? impressionReason(s, item.uid) : 'Select an item') ?? 'One impression per item: a new one replaces the old'} onClick={() => wax(takeImpression, "Locksmith's Wax")}>
                          <MatIcon id={WAX} size={12} /> Take impression
                        </button>
                        <button className="btn sm" disabled={!!(item ? restoreReason(s, item.uid) : 'x')} title={(item ? restoreReason(s, item.uid) : 'Select an item') ?? 'Puts the item back. The orbs spent since stay spent'} onClick={() => wax(restoreImpression, 'Restored from wax')}>
                          Restore
                        </button>
                      </div>
                    </>
                  )}
                  {fossils.length > 0 && (
                    <>
                      <div className="section-label" style={{ marginTop: contraband ? 10 : 0 }}>Fossils · pick one, then use an orb that rolls modifiers</div>
                      <div className="fossil-chips" style={{ marginTop: 0 }}>
                        {fossils.map((f) => (
                          <button
                            key={f.id}
                            className={`btn sm ${fossil === f.id ? 'selected' : ''}`}
                            title={`${f.desc}. Used up with the next orb that rolls modifiers.`}
                            onClick={() => setFossil(fossil === f.id ? null : f.id)}
                          >
                            <MatIcon id={f.id} size={12} /> {f.name.replace(' Fossil', '')} <span className="dim">×{s.account.bank[f.id]}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {essences.length > 0 && (
                    <>
                      <div className="section-label" style={{ marginTop: fossils.length || contraband ? 10 : 0 }}>
                        Essences · makes the item Magic with this modifier guaranteed
                      </div>
                      <div className="fossil-chips" style={{ marginTop: 0 }}>
                        {essences.map((e) => {
                          const reason = item ? essenceReason(s, e.id, item.uid) : 'Select an item';
                          return (
                            <button key={e.id} className="btn sm" disabled={!!reason} title={reason ?? affixRangeText(e.affixId, e.tier)} onClick={() => essence(e.id)}>
                              <MatIcon id={e.id} size={12} /> {e.name} <span className="dim">×{s.account.bank[e.id]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {s.account.flaskStash.length > 0 && (
            <div className="card">
              <div className="card-title">Spare flasks ({s.account.flaskStash.length})</div>
              <FlaskShelf flasks={s.account.flaskStash} selected={flaskUid} onPick={(f) => pickFlask(f.uid)} />
            </div>
          )}
          <Inventory s={s} title="Bag & stash" items={[...stashedItems(s), ...s.inventory]} cap={null} onPick={(it) => pickItem(it.uid)} selected={uid} />
        </div>
      </div>
    </div>
  );
}
