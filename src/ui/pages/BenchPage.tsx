import { useMemo, useState } from 'react';
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
import { hasItem } from '../../engine/bank';
import { currencyDef, materialDef } from '../../data/materials';
import { equipFlask, unequipFlask } from '../../engine/combat';
import {
  applyEssence,
  applyOrb,
  applyWhetstone,
  BENCH_UNBUILT,
  benchBuilt,
  benchCraft,
  benchCraftReason,
  essenceReason,
  FIELD_TINKER_ILVL,
  findItem,
  FOSSIL_ORBS,
  impressionReason,
  orbReason,
  removeCrafted,
  restoreImpression,
  restoreReason,
  salvage,
  SEAL_ORBS,
  takeImpression,
  TINKER_DUST_COST,
  whetstoneReason,
} from '../../engine/crafting';
import { applyFlaskOrb, enchantFlask, findFlask, flaskOrbReason, FLASK_ORBS } from '../../engine/flasks';
import { stationLevel } from '../../engine/hideout';
import { affixRangeText, allMods, describeMod, itemName, maxAffixes, salvageValue } from '../../engine/items';
import { inscribeRune, runeReason, runeText } from '../../engine/runes';
import type { FlaskInstance, GameState, Item } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, EmptyState, fmt, GameIcon, MatIcon, PageHeader, ProgressBar, Tabs, Tooltip, type TabDef } from '../components/common';
import { BENCH_MATERIAL_GROUPS, BenchMaterialSummary, CostHave, MaterialChoices } from '../components/BenchMaterials';
import '../round2-session3.css';
import { CraftUntilCard } from '../components/CraftUntilCard';
import { FlaskShelf, FlaskTip } from '../components/FlaskView';
import { ItemTip } from '../components/ItemView';
import { Inventory } from '../components/Inventory';
import { PaperDoll } from '../components/PaperDoll';

const ORB_ORDER = ['transmute', 'augment', 'alteration', 'regal', 'alchemy', 'chaos', 'exalted', 'annul', 'scour', 'divine', 'fractured'];
const PINNACLE_SIGILS = ['exile_doom_sigil', 'architect_doom_sigil', 'void_sigil'];

type BenchTab = 'bench_recipes' | 'special_crafts' | 'auto_craft' | 'flasks';

/** Where more of a material family comes from, as the bench's material list says it. */
const groupSource = (id: string) => BENCH_MATERIAL_GROUPS.find((g) => g.id === id)?.source.toLowerCase() ?? 'the world';
type BenchCraftCategory = 'all' | 'defences' | 'offense' | 'attributes' | 'meta';

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
        Flask Crafting
        <span className="grow" />
        <span className="card-hint">Flasks drop from monsters and are brewed with Alchemy</span>
      </div>
      <div className="grid" style={{ gap: 14 }}>
        <div>
          <div className="section-label">Crafting Orbs</div>
          <div className="row wrap" style={{ gap: 6 }}>
            {FLASK_ORBS.map((orb) => {
              const reason = flaskOrbReason(s, orb, f);
              return (
                <button
                  key={orb}
                  className="btn sm"
                  disabled={!!reason}
                  title={reason ?? currencyDef(orb).desc}
                  onClick={() => run(game.act((st, ctx) => applyFlaskOrb(st, ctx, orb, f.uid)))}
                >
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
          <div className="row wrap" style={{ gap: 6 }}>
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
            <div className="row wrap" style={{ gap: 6 }}>
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

/** Summarises item affix capacity, void status, and crafted limits. */
function ItemAffixCapacityBar({ item }: { item: Item }) {
  const pCount = item.prefixes.length;
  const sCount = item.suffixes.length;
  const max = maxAffixes(item.rarity);
  const pMax = item.voidSlot ? 4 : max;
  const sMax = item.voidSlot ? 4 : max;
  const craftedMods = allMods(item).filter((m) => m.crafted);
  const hasMulticraft = allMods(item).some((m) => m.affixId === 'meta_multicraft');
  const craftedMax = hasMulticraft ? 3 : 1;

  return (
    <div className="bench-capacity-bar card" style={{ padding: '8px 12px', background: 'var(--panel-2)' }}>
      <div className="row wrap" style={{ gap: 12, alignItems: 'center', fontSize: '0.85rem' }}>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <span className="dim">Prefixes:</span>
          <span className={`num ${pCount >= pMax ? 'warn' : ''}`}>
            {pCount} / {pMax}
          </span>
        </div>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <span className="dim">Suffixes:</span>
          <span className={`num ${sCount >= sMax ? 'warn' : ''}`}>
            {sCount} / {sMax}
          </span>
        </div>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <span className="dim">Crafted:</span>
          <span className={`num ${craftedMods.length >= craftedMax ? 'warn' : ''}`}>
            {craftedMods.length} / {craftedMax} {hasMulticraft ? '(Multicraft)' : ''}
          </span>
        </div>
        <div className="grow" />
        <div className="row wrap" style={{ gap: 6 }}>
          {item.voidSlot && <Badge tone="neutral" title="7th modifier slot unlocked">Void Slot</Badge>}
          {item.fractured && <Badge tone="warn" title={`Fractured: ${item.fractured}`}>Fractured</Badge>}
          {item.elevated && <Badge tone="danger" title={`Doom Tier 0: ${item.elevated}`}>Doom T0</Badge>}
          {item.doomImplicit && <Badge tone="gold" title={`Doom Implicit: ${item.doomImplicit}`}>Doom Implicit</Badge>}
          {item.impression && <Badge tone="success" title="Locksmith's Wax impression stored">Impression Ready</Badge>}
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
  const [activeTab, setActiveTab] = useState<BenchTab>('bench_recipes');
  const [craftCategory, setCraftCategory] = useState<BenchCraftCategory>('all');

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
    setActiveTab('flasks');
  };

  const fossilFor = (orbId: string) => (fossil && FOSSIL_ORBS.has(orbId) ? fossil : null);
  const sealFor = (orbId: string) => (seal && item && SEAL_ORBS.has(orbId) && allMods(item).some((m) => m.affixId === seal) ? seal : null);

  const use = (orbId: string) => {
    if (!item) return;
    const f = fossilFor(orbId);
    const kept = sealFor(orbId);
    const err = game.act((st, ctx) => applyOrb(st, ctx, orbId, item.uid, f, kept));
    if (!err) {
      setFlash((n) => n + 1);
      // the Doom Sigils are trophies, not currencies, so name them from the material list
      const text = [materialDef(orbId).name, f && fossilDef(f)!.name, kept && "Forger's Seal"].filter(Boolean).join(' + ');
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
  const ownedPinnacleSigils = PINNACLE_SIGILS.filter((id) => (s.account.bank[id] ?? 0) > 0);

  // Bench crafts filtered by category
  const filteredBenchCrafts = useMemo(() => {
    return BENCH_CRAFTS.filter((b) => {
      if (b.benchLevel > benchLvl) return false;
      if (craftCategory === 'all') return true;
      if (craftCategory === 'meta') return b.benchLevel >= 6;
      if (b.benchLevel >= 6) return false;
      if (craftCategory === 'defences') {
        return ['flat_life', 'fire_res', 'cold_res', 'light_res', 'inc_armour', 'inc_evasion'].includes(b.affixId);
      }
      if (craftCategory === 'offense') {
        return ['attack_speed', 'added_phys', 'crit_chance', 'crit_multi', 'inc_elem'].includes(b.affixId);
      }
      if (craftCategory === 'attributes') {
        return ['strength', 'dexterity', 'intelligence', 'accuracy', 'flat_mana', 'flask_charges', 'skill_speed', 'item_rarity'].includes(b.affixId);
      }
      return true;
    });
  }, [benchLvl, craftCategory]);

  const tabs: TabDef<BenchTab>[] = [
    { id: 'bench_recipes', label: 'Bench Recipes' },
    {
      id: 'special_crafts',
      label: 'Special Materials',
      count: essences.length + fossils.length + runes.length + (whetstones > 0 ? 1 : 0) + (contraband ? 1 : 0) + ownedPinnacleSigils.length,
    },
    { id: 'auto_craft', label: 'Auto-Craft' },
    { id: 'flasks', label: 'Flasks', count: s.account.flaskStash.length },
  ];

  return (
    <div className="page bench-page">
      <PageHeader
        title="Crafting Bench"
        actions={
          <div className="row" style={{ gap: 8 }}>
            <Badge tone="gold">Bench Level {benchLvl}</Badge>
            {item && allMods(item).some((m) => m.crafted) && (
              <button
                className="btn sm danger"
                disabled={!hasItem(s, 'scour', 1)}
                title={hasItem(s, 'scour', 1) ? 'Remove all crafted modifiers for 1 Orb of Scouring' : 'Requires 1 Orb of Scouring'}
                onClick={() => {
                  const err = game.act((st, ctx) => removeCrafted(st, ctx, item.uid));
                  if (!err) {
                    setFlash((n) => n + 1);
                    setHistory((h) => [{ id: Date.now() + Math.random(), text: 'Removed crafted modifiers', name: itemName(item), rarity: item.rarity }, ...h].slice(0, 12));
                  }
                }}
              >
                <MatIcon id="scour" size={13} /> Remove Crafted (1 Scour)
              </button>
            )}
          </div>
        }
      >
        Select gear or a flask, then spend orbs to reshape its modifiers. Item level caps which modifier tiers can roll.
      </PageHeader>

      {/* Orbs pinned at the top */}
      <div className="card bench-orb-bar">
        {ORB_ORDER.map((id) => {
          const c = currencyDef(id);
          const n = s.account.bank[id] ?? 0;
          const f = fossilFor(id);
          const kept = sealFor(id);
          const tinkering = !!item && n === 0 && item.ilvl <= FIELD_TINKER_ILVL && !!TINKER_DUST_COST[id];
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
                  {tinkering && <div className="dim small">Field Tinkering spends {TINKER_DUST_COST[id]} Arcane Dust instead.</div>}
                  {reason && <div className="warn" style={{ marginTop: 4 }}>{reason}</div>}
                </div>
              }
            >
              <button
                data-tut={`orb-${id}`}
                className={`orb-btn ${f || kept ? 'fossiled' : ''}`}
                style={{ ['--orb' as string]: c.color }}
                disabled={!!reason}
                onClick={() => use(id)}
              >
                <MatIcon id={id} size={24} />
                <span>
                  <div className="name">{c.short}</div>
                  <div className="count num">{tinkering ? `${fmt(s.account.bank.arcane_dust ?? 0)} dust` : `×${fmt(n)}`}</div>
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>

      <BenchMaterialSummary
        s={s}
        onOpen={(group) => {
          setActiveTab(group === 'dust' ? 'bench_recipes' : 'special_crafts');
          // after the tab renders, bring that family's section into view
          setTimeout(() => document.getElementById(`bench-mats-${group}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
        }}
      />

      <div className="bench-layout">
        {/* Left pinned item view */}
        <aside className="bench-side">
          <div className="card bench-item">
            {item ? (
              <>
                <ItemAffixCapacityBar item={item} />
                <div key={flash} className={flash ? 'shimmer' : ''} style={{ width: '100%' }}>
                  <ItemTip item={item} state={s} />
                </div>
                <div className="row wrap" style={{ gap: 6, width: '100%', justifyContent: 'center' }}>
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
                      Salvage ({salvageValue(item)} dust)
                    </button>
                  )}
                  <button className="btn sm ghost" onClick={() => setUid(null)}>
                    Deselect
                  </button>
                </div>
                <div className="dim small text-center">Hover the item and hold Alt to view modifier tiers.</div>
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
              <EmptyState icon={<GameIcon name="bench" size={32} color="var(--dim)" />} title="Nothing Selected">
                Click your gear, a flask, or an item in your bag or stash. It stays pinned here while you craft.
              </EmptyState>
            )}

            {history.length > 0 && (
              <div style={{ width: '100%', marginTop: 8 }}>
                <div className="section-label">Crafting History</div>
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
        </aside>

        {/* Right workspace */}
        <div className="bench-main">
          {/* Top navigation tabs */}
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
          </div>

          {activeTab === 'bench_recipes' && (
            <div className="bench-upper">
              <div className="bench-crafts-col">
                <div className="card" id="bench-mats-dust">
                  <div className="card-title">
                    Bench Crafts
                    <span className="r2-cost-item">
                      <MatIcon id="arcane_dust" size={12} /> <b className="num">{fmt(s.account.bank.arcane_dust ?? 0)}</b>
                      <span className="dim">dust</span>
                      <MatIcon id="gold" size={12} /> <b className="num">{fmt(s.account.bank.gold ?? 0)}</b>
                    </span>
                    <span className="grow" />
                    <span className="card-hint">
                      {item && allMods(item).some((m) => m.affixId === 'meta_multicraft')
                        ? 'Up to 3 crafted modifiers (Multicraft)'
                        : 'One crafted modifier per item'}
                    </span>
                  </div>

                  {benchLvl < 2 ? (
                    <EmptyState small icon={<GameIcon name="lock" size={24} color="var(--dim)" />}>
                      Upgrade the Crafting Bench in your Hideout to unlock crafted modifiers.
                    </EmptyState>
                  ) : (
                    <>
                      {/* Filter Sub-tabs */}
                      <div className="row wrap" style={{ gap: 6, marginBottom: 12 }}>
                        {[
                          { id: 'all', label: 'All' },
                          { id: 'defences', label: 'Life & Defences' },
                          { id: 'offense', label: 'Offense' },
                          { id: 'attributes', label: 'Attributes & Utility' },
                          { id: 'meta', label: `Meta & Pinnacle (L6+)` },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            className={`btn sm ${craftCategory === cat.id ? 'active' : 'ghost'}`}
                            onClick={() => setCraftCategory(cat.id as BenchCraftCategory)}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      <div className="card-grid" style={{ ['--card-min' as string]: '210px', gap: 8 }}>
                        {filteredBenchCrafts.map((b) => {
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
                              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="dim small">{a.kind}</span>
                                {b.benchLevel >= 6 && <Badge tone="gold">L{b.benchLevel}</Badge>}
                              </div>
                              <CostHave cost={b.cost} have={s.account.bank} />
                              <button className="btn sm" disabled={!!reason} title={reason ?? ''} onClick={() => craft(b.id)}>
                                {reason && item ? reason : 'Craft'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bench-doll-col">
                <div className="card doll-card">
                  <div className="card-title" style={{ alignSelf: 'stretch' }}>
                    Equipped Gear
                  </div>
                  <PaperDoll
                    s={s}
                    selected={uid ?? flaskUid}
                    onItem={(_, it) => pickItem(it.uid)}
                    onFlask={(_, f) => pickFlask(f.uid)}
                    emptyFlaskTitle="Select a spare flask to put it on your belt"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'special_crafts' && (
            <div className="bench-upper">
              <div className="bench-crafts-col" style={{ gap: 14 }}>
                {/* Pinnacle Doom Sigils: endgame, so they sit last, and stay a single line until you own one */}
                <div className="card" style={{ order: 9 }}>
                  <div className="card-title">
                    Pinnacle Doom Sigils
                    <span className="grow" />
                    <span className="card-hint">Dropped by Uber Pinnacle Bosses</span>
                  </div>
                  {ownedPinnacleSigils.length === 0 && <div className="dim small">You have none yet. Doom Sigils drop from the Uber Pinnacle Bosses in Maps.</div>}
                  <div className="grid" style={{ gap: 10, display: ownedPinnacleSigils.length ? undefined : 'none' }}>
                    <div className="row wrap" style={{ gap: 8 }}>
                      {PINNACLE_SIGILS.map((sigilId) => {
                        const count = s.account.bank[sigilId] ?? 0;
                        // Doom Sigils are trophies, not currencies: currencyDef has no entry for them
                        const c = materialDef(sigilId);
                        const reason = item ? orbReason(s, sigilId, item.uid) : 'Select an item';
                        return (
                          <div key={sigilId} className="card" style={{ flex: '1 1 240px', padding: 10, background: 'var(--panel-2)' }}>
                            <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 4 }}>
                              <MatIcon id={sigilId} size={20} />
                              <span style={{ fontWeight: 600 }}>{c.name}</span>
                              <span className="grow" />
                              <span className="dim num">×{count}</span>
                            </div>
                            <div className="dim small" style={{ marginBottom: 8, minHeight: 36 }}>{c.desc}</div>
                            <button className="btn sm" disabled={!!reason} title={reason ?? ''} onClick={() => use(sigilId)} style={{ width: '100%' }}>
                              {reason && item ? reason : 'Apply'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Fossils and Contraband */}
                <div className="card">
                  <div className="card-title">Contraband & Catalysts</div>
                  <div className="grid" style={{ gap: 12 }}>
                    {/* Forger's Seal */}
                    <div id="bench-mats-contraband">
                      <div className="section-label">
                        Forger's Seal ×{seals} · Pick a modifier to protect from the next Alteration, Chaos, Annulment, or Divine
                      </div>
                      {seals === 0 && <div className="dim small">You have no Forger's Seals. They come from {groupSource('contraband')}.</div>}
                      <div className="fossil-chips" style={{ marginTop: 4 }}>
                        {item && allMods(item).length ? (
                          allMods(item).map((m) => (
                            <button
                              key={m.affixId}
                              className={`btn sm ${seal === m.affixId ? 'selected' : ''}`}
                              title="Used up with the next orb it protects from."
                              onClick={() => setSeal(seal === m.affixId ? null : m.affixId)}
                            >
                              <MatIcon id={SEAL} size={12} /> {describeMod(m)}
                            </button>
                          ))
                        ) : (
                          <span className="dim small">{item ? 'This item has no modifiers.' : 'Select an item.'}</span>
                        )}
                      </div>
                    </div>

                    {/* Locksmith's Wax */}
                    <div>
                      <div className="section-label">
                        Locksmith's Wax ×{waxes} · Save an impression before a risky craft and restore anytime
                      </div>
                      <div className="row wrap" style={{ gap: 8, marginTop: 4 }}>
                        <button
                          className="btn sm"
                          disabled={!!(item ? impressionReason(s, item.uid) : 'Select an item')}
                          title={(item ? impressionReason(s, item.uid) : 'Select an item') ?? 'One impression per item'}
                          onClick={() => wax(takeImpression, "Locksmith's Wax")}
                        >
                          <MatIcon id={WAX} size={12} /> Take Impression
                        </button>
                        <button
                          className="btn sm"
                          disabled={!!(item ? restoreReason(s, item.uid) : 'Select an item')}
                          title={(item ? restoreReason(s, item.uid) : 'Select an item') ?? 'Restores the item to its wax impression'}
                          onClick={() => wax(restoreImpression, 'Restored from wax')}
                        >
                          Restore Impression
                        </button>
                      </div>
                    </div>

                    {/* Fossils */}
                    <div id="bench-mats-fossils">
                      <div className="section-label">Fossils · Select a fossil to bias modifier weights on the next roll</div>
                      <MaterialChoices
                        s={s}
                        ids={FOSSILS.map((f) => f.id)}
                        source={groupSource('fossils')}
                        render={(id, n) => {
                          const f = fossilDef(id)!;
                          return (
                            <button
                              key={id}
                              className={`btn sm ${fossil === id ? 'selected' : ''}`}
                              title={`${f.desc}. Used up with the next modifier roll.`}
                              onClick={() => setFossil(fossil === id ? null : id)}
                            >
                              <MatIcon id={id} size={12} /> {f.name.replace(' Fossil', '')} <span className="dim">×{fmt(n)}</span>
                            </button>
                          );
                        }}
                      />
                    </div>

                    {/* Ancient Whetstone */}
                    <div id="bench-mats-whetstones">
                      <div className="section-label">
                        Ancient Whetstones ×{whetstones} · Raise one modifier tier within item level limits
                      </div>
                      {whetstones === 0 && <div className="dim small">You have no Ancient Whetstones. They come from {groupSource('whetstones')}.</div>}
                      <div className="fossil-chips" style={{ marginTop: 4 }}>
                        {item && allMods(item).length ? (
                          allMods(item).map((m) => {
                            const reason = whetstoneReason(s, item.uid, m.affixId);
                            return (
                              <button
                                key={m.affixId}
                                className="btn sm"
                                disabled={!!reason}
                                title={reason ?? 'Uses one Ancient Whetstone'}
                                onClick={() => hone(m.affixId)}
                              >
                                <MatIcon id={WHETSTONE} size={12} /> {describeMod(m)}
                              </button>
                            );
                          })
                        ) : (
                          <span className="dim small">{item ? 'This item has no modifiers.' : 'Select an item.'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Runes and Essences */}
                <div className="card">
                  <div className="card-title">Runes & Essences</div>
                  <div className="grid" style={{ gap: 12 }}>
                    <div id="bench-mats-runes">
                      <div className="section-label">Runes · Inscribe a permanent socket bonus</div>
                      <MaterialChoices
                        s={s}
                        ids={RUNES.map((r) => r.id)}
                        source={groupSource('runes')}
                        render={(id, n) => {
                          const r = runeDef(id)!;
                          const reason = item ? runeReason(s, id, item.uid) : 'Select an item';
                          return (
                            <button key={id} data-rune={id} className="btn sm" disabled={!!reason} title={reason ?? runeText(r, item!)} onClick={() => inscribe(id)}>
                              <MatIcon id={id} size={12} /> {r.name} <span className="dim">×{fmt(n)}</span>
                            </button>
                          );
                        }}
                      />
                    </div>

                    <div id="bench-mats-essences">
                      <div className="section-label">Essences · Imbue an item as Magic with a guaranteed modifier</div>
                      <MaterialChoices
                        s={s}
                        ids={ESSENCES.map((e) => e.id)}
                        source={groupSource('essences')}
                        render={(id, n) => {
                          const e = ESSENCES.find((x) => x.id === id)!;
                          const reason = item ? essenceReason(s, id, item.uid) : 'Select an item';
                          return (
                            <button key={id} className="btn sm" disabled={!!reason} title={reason ?? affixRangeText(e.affixId, e.tier)} onClick={() => essence(id)}>
                              <MatIcon id={id} size={12} /> {e.name} <span className="dim">×{fmt(n)}</span>
                            </button>
                          );
                        }}
                      />
                    </div>

                    <div id="bench-mats-resins">
                      <div className="section-label">Resins and orb shards · used elsewhere, shown here so you know what you hold</div>
                      <div className="fossil-chips" style={{ marginTop: 4 }}>
                        {[...BENCH_MATERIAL_GROUPS.find((g) => g.id === 'resins')!.ids, ...BENCH_MATERIAL_GROUPS.find((g) => g.id === 'shards')!.ids].map((id) => (
                          <span key={id} className={`r2-mat-chip ${s.account.bank[id] ? '' : 'none'}`} title={materialDef(id).desc ?? ''}>
                            <MatIcon id={id} size={12} />
                            <span className="r2-mat-name">{materialDef(id).name}</span>
                            <b className="num">{fmt(s.account.bank[id] ?? 0)}</b>
                          </span>
                        ))}
                      </div>
                      <div className="dim small" style={{ marginTop: 4 }}>
                        Resins raise the item level of bases you smith (Smithing's Catalyst). Every 20 shards fuse into an orb at Alchemy.
                      </div>
                      <span id="bench-mats-shards" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bench-doll-col">
                <div className="card doll-card">
                  <div className="card-title" style={{ alignSelf: 'stretch' }}>
                    Equipped Gear
                  </div>
                  <PaperDoll
                    s={s}
                    selected={uid ?? flaskUid}
                    onItem={(_, it) => pickItem(it.uid)}
                    onFlask={(_, f) => pickFlask(f.uid)}
                    emptyFlaskTitle="Select a spare flask to put it on your belt"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'auto_craft' && (
            <div className="bench-upper">
              <div className="bench-crafts-col">
                <CraftUntilCard s={s} item={item} />
              </div>
              <div className="bench-doll-col">
                <div className="card doll-card">
                  <div className="card-title" style={{ alignSelf: 'stretch' }}>
                    Equipped Gear
                  </div>
                  <PaperDoll
                    s={s}
                    selected={uid ?? flaskUid}
                    onItem={(_, it) => pickItem(it.uid)}
                    onFlask={(_, f) => pickFlask(f.uid)}
                    emptyFlaskTitle="Select a spare flask to put it on your belt"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'flasks' && (
            <div className="grid" style={{ gap: 14 }}>
              {flask && <FlaskCraft s={s} f={flask} onCraft={() => setFlash((n) => n + 1)} />}
              {s.account.flaskStash.length > 0 && (
                <div className="card">
                  <div className="card-title">Flask Stash ({s.account.flaskStash.length})</div>
                  <FlaskShelf flasks={s.account.flaskStash} selected={flaskUid} onPick={(f) => pickFlask(f.uid)} />
                </div>
              )}
            </div>
          )}

          {/* Stashed and Bag inventory items */}
          <Inventory
            s={s}
            title="Bag & Stash Items"
            items={[...stashedItems(s), ...s.inventory]}
            cap={null}
            onPick={(it) => pickItem(it.uid)}
            selected={uid}
          />
        </div>
      </div>
    </div>
  );
}
