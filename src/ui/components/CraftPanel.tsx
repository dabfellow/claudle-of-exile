import { useState } from 'react';
import { CORRUPTED_ITEM, VALOR_ORB, VALOR_SOURCE } from '../../data/corruption';
import { affixDef } from '../../data/affixes';
import { ESSENCES, FOSSILS, fossilDef, SEAL, WAX } from '../../data/craftMats';
import { WHETSTONE } from '../../data/expedition';
import { ALL_RUNES, runeDef } from '../../data/runes';
import { AUTO_CRAFT_BENCH_LEVEL, BENCH_BUILT_LEVEL, BENCH_CRAFTS } from '../../data/hideout';
import { INSTILL_CONDITIONS } from '../../data/flasks';
import { actOpen } from '../../data/zones';
import { hasItem } from '../../engine/bank';
import { currencyDef, materialDef } from '../../data/materials';
import { equipFlask, unequipFlask } from '../../engine/combat';
import {
  applyEssence,
  applyOrb,
  applyWhetstone,
  benchCraft,
  benchCraftCost,
  benchCraftReason,
  craftedModifierLimit,
  essenceReason,
  FIELD_TINKER_ILVL,
  findItem,
  FOSSIL_ORBS,
  impressionReason,
  isCraftLocked,
  orbReason,
  removeCrafted,
  restoreImpression,
  restoreReason,
  SEAL_ORBS,
  takeImpression,
  TINKER_DUST_COST,
  whetstoneReason,
} from '../../engine/crafting';
import { applyFlaskOrb, enchantFlask, findFlask, flaskOrbReason, FLASK_ORBS } from '../../engine/flasks';
import { stationLevel } from '../../engine/hideout';
import { equipFrom, equipFromReason, locateItem, moveToBag, moveToStash, salvageAny, salvageReason, toBagReason, toStashReason } from '../../engine/itemActions';
import { affixRangeText, allMods, describeMod, itemName, maxAffixes, salvageValue } from '../../engine/items';
import { inscribeRune, runeInscriptionPreview, runeReason } from '../../engine/runes';
import type { FlaskInstance, GameState, Item } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, EmptyState, fmt, GameIcon, MatIcon, Tabs, Tooltip, type TabDef } from './common';
import { BENCH_MATERIAL_GROUPS, CostHave, MaterialChoices } from './BenchMaterials';
import '../round2-session3.css';
import { CraftUntilCard } from './CraftUntilCard';
import { GuildItemTransfer } from './GuildTransferActions';
import { FlaskTip } from './FlaskView';
import { Icon } from './Icon';
import { ItemTip } from './ItemView';

const ORB_ORDER = ['transmute', 'augment', 'alteration', 'regal', 'alchemy', 'chaos', 'exalted', 'annul', 'scour', 'divine', 'fractured'];
const PINNACLE_SIGILS = ['exile_doom_sigil', 'architect_doom_sigil', 'void_sigil'];

type CraftTab = 'orbs' | 'bench' | 'special' | 'auto';
type BenchCraftCategory = 'all' | 'defences' | 'offense' | 'attributes' | 'meta';

/** Where more of a material family comes from, as the bench's material list says it. */
const groupSource = (id: string) => BENCH_MATERIAL_GROUPS.find((g) => g.id === id)?.source.toLowerCase() ?? 'the world';

/** "Needs Bench 4": what a locked crafting tool shows, so players see what an upgrade brings. */
function NeedsBench({ level }: { level: number }) {
  return (
    <span className="needs-bench" title={`Upgrade the Crafting Bench in your Hideout to level ${level}`}>
      <GameIcon name="lock" size={11} color="currentColor" /> Needs Bench {level}
    </span>
  );
}

/** Orbs, enchanting and belt slots for the selected flask. */
function FlaskCraft({ s, f, onCraft }: { s: GameState; f: FlaskInstance; onCraft: () => void }) {
  const slotIndex = s.flaskSlots.findIndex((x) => x?.uid === f.uid);
  const instills = s.storage.bank.instill ?? 0;
  const run = (err: string | null) => {
    if (!err) onCraft();
  };
  return (
    <div className="craft-section">
      <div className="section-label">Crafting Orbs</div>
      <div className="row wrap" style={{ gap: 6 }}>
        {FLASK_ORBS.map((orb) => {
          const reason = flaskOrbReason(s, orb, f);
          return (
            <button key={orb} className="btn sm" disabled={!!reason} title={reason ?? currencyDef(orb).desc} onClick={() => run(game.act((st, ctx) => applyFlaskOrb(st, ctx, orb, f.uid)))}>
              <MatIcon id={orb} size={13} /> {currencyDef(orb).short} <span className="dim">×{s.storage.bank[orb] ?? 0}</span>
            </button>
          );
        })}
      </div>
      <div className="section-label">
        Enchant with an Instilling Orb <span className="dim">({instills} owned)</span>
      </div>
      <div className="row wrap" style={{ gap: 6 }}>
        {INSTILL_CONDITIONS.filter((c) => !c.act || actOpen(c.act)).map((c) => (
          <button
            key={c.id}
            className={`btn sm ${f.instill === c.id ? 'active' : ''}`}
            disabled={instills < 1 || f.instill === c.id}
            title={instills < 1 ? 'Instilling Orbs drop from Act 5 on' : c.desc}
            onClick={() => run(game.act((st, ctx) => enchantFlask(st, ctx, f.uid, c.id)))}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="dim small">An enchanted flask drinks itself in combat when its condition is met. Enchanting again replaces it.</div>
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
  );
}

/** Prefix, suffix and crafted-modifier room, plus the special states an item can be in. */
function ItemAffixCapacityBar({ item }: { item: Item }) {
  const s = useGame();
  const pCount = item.prefixes.length;
  const sCount = item.suffixes.length;
  const max = maxAffixes(item.rarity);
  const pMax = item.voidSlot ? 4 : max;
  const sMax = item.voidSlot ? 4 : max;
  const craftedMods = allMods(item).filter((m) => m.crafted);
  const craftedMax = craftedModifierLimit(s, item);
  return (
    <div className="craft-capacity">
      <span>
        <span className="dim">Prefixes</span> <b className={`num ${pCount >= pMax ? 'warn' : ''}`}>{pCount}/{pMax}</b>
      </span>
      <span>
        <span className="dim">Suffixes</span> <b className={`num ${sCount >= sMax ? 'warn' : ''}`}>{sCount}/{sMax}</b>
      </span>
      <span>
        <span className="dim">Crafted</span>{' '}
        <b className={`num ${craftedMods.length >= craftedMax ? 'warn' : ''}`}>
          {craftedMods.length}/{craftedMax}
        </b>
      </span>
      {item.voidSlot && <Badge tone="neutral" title="7th modifier slot unlocked">Void Slot</Badge>}
      {item.fractured && <Badge tone="warn" title={`Fractured: ${item.fractured}`}>Fractured</Badge>}
      {item.elevated && <Badge tone="danger" title={`Doom Tier 0: ${item.elevated}`}>Doom T0</Badge>}
      {item.doomImplicit && <Badge tone="gold" title={`Doom Implicit: ${item.doomImplicit}`}>Doom Implicit</Badge>}
      {item.impression && <Badge tone="success" title="Locksmith's Wax impression stored">Impression Ready</Badge>}
    </div>
  );
}

/** Equip · To inventory · To stash · Salvage for the selected item, wherever it is. */
function MoveActions({ s, item, onGone }: { s: GameState; item: Item; onGone: () => void }) {
  const uid = item.uid;
  const place = locateItem(s, uid);
  if (!place) return null;
  const actions: { label: string; reason: string | null; run: () => string | null; danger?: boolean; tut?: string; gone?: boolean }[] = [
    { label: 'Equip', reason: equipFromReason(s, uid), run: () => game.act((st, ctx) => equipFrom(st, ctx, uid)) },
    { label: place.at === 'equipped' ? 'Take off' : 'To inventory', reason: toBagReason(s, uid), run: () => game.act((st, ctx) => moveToBag(st, ctx, uid)) },
    { label: 'To stash', reason: toStashReason(s, uid), run: () => game.act((st, ctx) => moveToStash(st, ctx, uid)) },
    { label: `Salvage (${salvageValue(item)} dust)`, reason: salvageReason(s, uid), run: () => game.act((st, ctx) => salvageAny(st, ctx, uid)), danger: true, tut: 'salvage-item', gone: true },
  ];
  // leave out what can't apply here at all (equipping worn gear, sending a stashed item to the stash…)
  const shown = actions.filter((a) => !a.reason || !/^(Already|Take it off)/.test(a.reason));
  return (
    <div className="craft-moves">
      {shown.map((a) => (
        <button
          key={a.label}
          data-tut={a.tut}
          className={`btn sm ${a.danger ? 'danger' : ''}`}
          disabled={!!a.reason}
          title={a.reason ?? undefined}
          onClick={() => {
            if (!a.run() && a.gone) onGone();
          }}
        >
          {a.label}
        </button>
      ))}
      {place.at !== 'equipped' && place.at !== 'ground' && place.at !== 'offlineHaul' && (
        <GuildItemTransfer move={{ direction: 'deposit', kind: 'gear', uid }} reason={isCraftLocked(s, uid) ? 'Auto-craft is using this item' : undefined} />
      )}
    </div>
  );
}

/**
 * The item panel on the Inventory screen: the picked item or flask, moving it, and every crafting tool.
 * Tools the Crafting Bench hasn't unlocked yet stay visible, greyed, with the level that unlocks them.
 */
export function CraftPanel({ s, uid, flaskUid, onClear }: { s: GameState; uid: number | null; flaskUid: number | null; onClear: () => void }) {
  const [flash, setFlash] = useState(0);
  const [history, setHistory] = useState<{ id: number; text: string; name: string; rarity: Item['rarity'] }[]>([]);
  const [fossil, setFossil] = useState<string | null>(null);
  const [seal, setSeal] = useState<string | null>(null);
  const [tab, setTab] = useState<CraftTab>('orbs');
  const [craftCategory, setCraftCategory] = useState<BenchCraftCategory>('all');
  const [inspectedRune, setInspectedRune] = useState<string | null>(null);
  const [confirmValor, setConfirmValor] = useState<number | null>(null);

  const item = uid !== null ? findItem(s, uid) : undefined;
  const flask = flaskUid !== null ? findFlask(s, flaskUid) : undefined;
  const benchLvl = stationLevel(s, 'bench');

  const fossilFor = (orbId: string) => (fossil && FOSSIL_ORBS.has(orbId) ? fossil : null);
  const sealFor = (orbId: string) => (seal && item && SEAL_ORBS.has(orbId) && allMods(item).some((m) => m.affixId === seal) ? seal : null);

  const record = (text: string) => {
    if (!item) return;
    setFlash((n) => n + 1);
    setHistory((h) => [{ id: Date.now() + Math.random(), text, name: itemName(item), rarity: item.rarity }, ...h].slice(0, 12));
  };

  const use = (orbId: string) => {
    if (!item) return;
    const f = fossilFor(orbId);
    const kept = sealFor(orbId);
    const err = game.act((st, ctx) => applyOrb(st, ctx, orbId, item.uid, f, kept));
    if (!err) {
      // the Doom Sigils are trophies, not currencies, so name them from the material list
      record([materialDef(orbId).name, f && fossilDef(f)!.name, kept && "Forger's Seal"].filter(Boolean).join(' + '));
      if (f && (s.storage.bank[f] ?? 0) <= 1) setFossil(null);
      if (kept) setSeal(null);
    }
  };
  const run = (err: string | null, text: string) => {
    if (!err) record(text);
  };

  if (!item && !flask) {
    return (
      <div className="card craft-panel">
        <EmptyState icon={<GameIcon name="bench" size={32} color="var(--dim)" />} title="Pick an item">
          Click anything in your inventory, your stash or on your character. Move it, salvage it or craft on it right here.
        </EmptyState>
      </div>
    );
  }

  if (flask) {
    return (
      <div className="card craft-panel">
        <div className="craft-head">
          <span className="grow" />
          <button className="btn sm ghost" title="Close" aria-label="Close" onClick={onClear}>
            <Icon name="close" size={12} />
          </button>
        </div>
        <div key={flash} className={flash ? 'shimmer' : ''}>
          <FlaskTip f={flask} pinned />
        </div>
        {s.storage.flaskStash.some((f) => f.uid === flask.uid) && (
          <div className="craft-moves">
            <GuildItemTransfer move={{ direction: 'deposit', kind: 'flaskStash', uid: flask.uid }} />
          </div>
        )}
        <FlaskCraft s={s} f={flask} onCraft={() => setFlash((n) => n + 1)} />
      </div>
    );
  }

  const it = item!;
  const essences = ESSENCES.filter((e) => s.storage.bank[e.id]);
  const fossils = FOSSILS.filter((f) => s.storage.bank[f.id]);
  const runes = ALL_RUNES.filter((r) => s.storage.bank[r.id]);
  const seals = s.storage.bank[SEAL] ?? 0;
  const waxes = s.storage.bank[WAX] ?? 0;
  const contraband = seals > 0 || waxes > 0 || !!it.impression;
  const whetstones = s.storage.bank[WHETSTONE] ?? 0;
  const ownedPinnacleSigils = PINNACLE_SIGILS.filter((id) => (s.storage.bank[id] ?? 0) > 0);
  const hasCrafted = allMods(it).some((m) => m.crafted);

  const benchCrafts = BENCH_CRAFTS.filter((b) => {
    if (craftCategory === 'all') return true;
    if (craftCategory === 'meta') return b.benchLevel >= 6;
    if (b.benchLevel >= 6) return false;
    if (craftCategory === 'defences') return ['flat_life', 'fire_res', 'cold_res', 'light_res', 'inc_armour', 'inc_evasion'].includes(b.affixId);
    if (craftCategory === 'offense') return ['attack_speed', 'added_phys', 'crit_chance', 'crit_multi', 'inc_elem'].includes(b.affixId);
    if (craftCategory === 'attributes') return ['strength', 'dexterity', 'intelligence', 'accuracy', 'flat_mana', 'flask_charges', 'skill_speed', 'item_rarity'].includes(b.affixId);
    return true;
  }).sort((a, b) => Number(a.benchLevel > benchLvl) - Number(b.benchLevel > benchLvl) || a.benchLevel - b.benchLevel);

  const tabs: TabDef<CraftTab>[] = [
    { id: 'orbs', label: 'Orbs' },
    { id: 'bench', label: 'Bench crafts' },
    { id: 'special', label: 'Special', count: essences.length + fossils.length + runes.length + (whetstones > 0 ? 1 : 0) + (contraband ? 1 : 0) + ownedPinnacleSigils.length },
    { id: 'auto', label: 'Auto-craft' },
  ];

  return (
    <div className="card craft-panel">
      <div className="craft-head">
        <ItemAffixCapacityBar item={it} />
        <span className="grow" />
        <button className="btn sm ghost" title="Close" aria-label="Close" onClick={onClear}>
          <Icon name="close" size={12} />
        </button>
      </div>
      <div key={flash} className={`craft-item ${flash ? 'shimmer' : ''}`}>
        <ItemTip item={it} state={s} />
      </div>
      <MoveActions s={s} item={it} onGone={onClear} />

      {it.corrupted ? <p className="bad small">{CORRUPTED_ITEM}.</p> : <>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'orbs' && (
        <div className="craft-section">
          <div className="craft-orbs">
            {ORB_ORDER.map((id) => {
              const c = currencyDef(id);
              const n = s.storage.bank[id] ?? 0;
              const f = fossilFor(id);
              const kept = sealFor(id);
              const tinkering = n === 0 && it.ilvl <= FIELD_TINKER_ILVL && !!TINKER_DUST_COST[id];
              const reason = orbReason(s, id, it.uid, f, kept);
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
                  <button data-tut={`orb-${id}`} className={`orb-btn ${f || kept ? 'fossiled' : ''}`} style={{ ['--orb' as string]: c.color }} disabled={!!reason} onClick={() => use(id)}>
                    <MatIcon id={id} size={22} />
                    <span>
                      <div className="name">{c.short}</div>
                      <div className="count num">{tinkering ? `${fmt(s.storage.bank.arcane_dust ?? 0)} dust` : `×${fmt(n)}`}</div>
                    </span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
          <div className="craft-section">
            <div className="section-label">Corruption</div>
            <p className="muted small">A Valor Orb permanently seals the item. A benefit, a downside, and no stat change are equally likely. A downside can destroy it.</p>
            <div className="row wrap">
              <button className="btn sm danger" disabled={!!orbReason(s, VALOR_ORB, it.uid)} title={orbReason(s, VALOR_ORB, it.uid) ?? VALOR_SOURCE} onClick={() => {
                if (confirmValor !== it.uid) {
                  setConfirmValor(it.uid);
                  return;
                }
                setConfirmValor(null);
                use(VALOR_ORB);
                if (!findItem(game.state, it.uid)) onClear();
              }}>
                <MatIcon id={VALOR_ORB} size={16} /> {confirmValor === it.uid ? 'Confirm corruption' : 'Use Valor Orb'} <span className="num">×{s.storage.bank[VALOR_ORB] ?? 0}</span>
              </button>
              {confirmValor === it.uid && <button className="btn sm" onClick={() => setConfirmValor(null)}>Cancel</button>}
              <span className="dim small">{VALOR_SOURCE}</span>
            </div>
          </div>
          {(fossil || seal) && (
            <div className="dim small">
              Next orb uses {[fossil && fossilDef(fossil)!.name, seal && "a Forger's Seal"].filter(Boolean).join(' and ')} (set under Special).
            </div>
          )}
          {hasCrafted && (
            <button
              className="btn sm danger"
              disabled={benchLvl < 10 && !hasItem(s, 'scour', 1)}
              title={benchLvl >= 10 ? 'Remove all crafted modifiers freely (Bench Level 10)' : hasItem(s, 'scour', 1) ? 'Remove all crafted modifiers for 1 Orb of Scouring' : 'Requires 1 Orb of Scouring'}
              onClick={() => run(game.act((st, ctx) => removeCrafted(st, ctx, it.uid)), 'Removed crafted modifiers')}
            >
              {benchLvl < 10 && <MatIcon id="scour" size={13} />} {benchLvl >= 10 ? 'Remove crafted (free)' : 'Remove crafted (1 Scour)'}
            </button>
          )}
        </div>
      )}

      {tab === 'bench' && (
        <div className="craft-section" id="bench-mats-dust">
          <div className="row wrap" style={{ gap: 8 }}>
            <Badge tone="gold">Bench level {benchLvl}</Badge>
            <span className="r2-cost-item">
              <MatIcon id="arcane_dust" size={12} /> <b className="num">{fmt(s.storage.bank.arcane_dust ?? 0)}</b> <span className="dim">dust</span>
              <MatIcon id="gold" size={12} /> <b className="num">{fmt(s.storage.bank.gold ?? 0)}</b>
            </span>
          </div>
          <div className="dim small">{allMods(it).some((m) => m.affixId === 'meta_multicraft') ? 'Up to 3 crafted modifiers (Multicraft)' : 'One crafted modifier per item'}. Upgrade the Crafting Bench in your Hideout for more.</div>
          <div className="row wrap" style={{ gap: 6 }}>
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'defences', label: 'Defences' },
                { id: 'offense', label: 'Offence' },
                { id: 'attributes', label: 'Utility' },
                { id: 'meta', label: 'Meta & Pinnacle' },
              ] as { id: BenchCraftCategory; label: string }[]
            ).map((cat) => (
              <button key={cat.id} className={`btn sm ${craftCategory === cat.id ? 'active' : 'ghost'}`} onClick={() => setCraftCategory(cat.id)}>
                {cat.label}
              </button>
            ))}
          </div>
          <div className="craft-bench-list">
            {benchCrafts.map((b) => {
              const a = affixDef(b.affixId);
              const locked = b.benchLevel > benchLvl;
              const reason = locked ? `Needs Bench ${b.benchLevel}` : benchCraftReason(s, b.id, it.uid);
              return (
                <div key={b.id} className={`craft-bench-row ${locked ? 'locked' : ''}`}>
                  <div className="craft-bench-text">
                    <span className="mod crafted small">{affixRangeText(a.id, b.tier)}</span>
                    <CostHave cost={benchCraftCost(s, b)} have={s.storage.bank} />
                  </div>
                  {locked ? (
                    <NeedsBench level={b.benchLevel} />
                  ) : (
                    <button className="btn sm" disabled={!!reason} title={reason ?? ''} onClick={() => run(game.act((st, ctx) => benchCraft(st, ctx, b.id, it.uid)), 'Bench craft')}>
                      Craft
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'special' && (
        <div className="craft-section">
          <div id="bench-mats-essences">
            <div className="section-label">Essences · make it Magic with a guaranteed modifier</div>
            <MaterialChoices
              s={s}
              ids={ESSENCES.map((e) => e.id)}
              source={groupSource('essences')}
              render={(id, n) => {
                const e = ESSENCES.find((x) => x.id === id)!;
                const reason = essenceReason(s, id, it.uid);
                return (
                  <button key={id} className="btn sm" disabled={!!reason} title={reason ?? affixRangeText(e.affixId, e.tier)} onClick={() => run(game.act((st, ctx) => applyEssence(st, ctx, id, it.uid)), e.name)}>
                    <MatIcon id={id} size={12} /> {e.name} <span className="dim">×{fmt(n)}</span>
                  </button>
                );
              }}
            />
          </div>

          <div id="bench-mats-fossils">
            <div className="section-label">Fossils · pick one to bias the next orb's roll</div>
            <MaterialChoices
              s={s}
              ids={FOSSILS.map((f) => f.id)}
              source={groupSource('fossils')}
              render={(id, n) => {
                const f = fossilDef(id)!;
                return (
                  <button key={id} className={`btn sm ${fossil === id ? 'selected' : ''}`} title={`${f.desc}. Used up with the next modifier roll.`} onClick={() => setFossil(fossil === id ? null : id)}>
                    <MatIcon id={id} size={12} /> {f.name.replace(' Fossil', '')} <span className="dim">×{fmt(n)}</span>
                  </button>
                );
              }}
            />
          </div>

          <div id="bench-mats-contraband">
            <div className="section-label">Forger's Seal ×{seals} · protect a modifier from the next Alteration, Chaos, Annulment or Divine</div>
            {seals === 0 && <div className="dim small">You have no Forger's Seals. They come from {groupSource('contraband')}.</div>}
            <div className="fossil-chips">
              {allMods(it).length ? (
                allMods(it).map((m) => (
                  <button key={m.affixId} className={`btn sm ${seal === m.affixId ? 'selected' : ''}`} title="Used up with the next orb it protects from." onClick={() => setSeal(seal === m.affixId ? null : m.affixId)}>
                    <MatIcon id={SEAL} size={12} /> {describeMod(m)}
                  </button>
                ))
              ) : (
                <span className="dim small">This item has no modifiers.</span>
              )}
            </div>
            <div className="section-label">Locksmith's Wax ×{waxes} · save the item before a risky craft, restore it any time</div>
            <div className="row wrap" style={{ gap: 8 }}>
              <button className="btn sm" disabled={!!impressionReason(s, it.uid)} title={impressionReason(s, it.uid) ?? 'One impression per item'} onClick={() => run(game.act((st, ctx) => takeImpression(st, ctx, it.uid)), "Locksmith's Wax")}>
                <MatIcon id={WAX} size={12} /> Take impression
              </button>
              <button className="btn sm" disabled={!!restoreReason(s, it.uid)} title={restoreReason(s, it.uid) ?? 'Restores the item to its wax impression'} onClick={() => run(game.act((st, ctx) => restoreImpression(st, ctx, it.uid)), 'Restored from wax')}>
                Restore impression
              </button>
            </div>
          </div>

          <div id="bench-mats-whetstones">
            <div className="section-label">Ancient Whetstones ×{whetstones} · raise one modifier tier, within item level limits</div>
            {whetstones === 0 && <div className="dim small">You have no Ancient Whetstones. They come from {groupSource('whetstones')}.</div>}
            <div className="fossil-chips">
              {allMods(it).map((m) => {
                const reason = whetstoneReason(s, it.uid, m.affixId);
                return (
                  <button key={m.affixId} className="btn sm" disabled={!!reason} title={reason ?? 'Uses one Ancient Whetstone'} onClick={() => run(game.act((st, ctx) => applyWhetstone(st, ctx, it.uid, m.affixId)), 'Ancient Whetstone')}>
                    <MatIcon id={WHETSTONE} size={12} /> {describeMod(m)}
                  </button>
                );
              })}
            </div>
          </div>

          <div id="bench-mats-runes">
            <div className="section-label">Runes · inscribe a permanent socket bonus</div>
            <MaterialChoices
              s={s}
              ids={ALL_RUNES.map((r) => r.id)}
              source={groupSource('runes')}
              render={(id, n) => {
                const r = runeDef(id)!;
                const reason = runeReason(s, id, it.uid);
                const preview = runeInscriptionPreview(s, id, it);
                return (
                  <button
                    key={id}
                    data-rune={id}
                    className="btn sm"
                    disabled={!!reason}
                    title={reason ? `${reason}\n\n${preview.join('\n')}` : preview.join('\n')}
                    onMouseEnter={() => setInspectedRune(id)}
                    onFocus={() => setInspectedRune(id)}
                    onClick={() => {
                      setInspectedRune(id);
                      run(game.act((st, ctx) => inscribeRune(st, ctx, id, it.uid)), r.name);
                    }}
                  >
                    <MatIcon id={id} size={12} /> {r.name} <span className="dim">×{fmt(n)}</span>
                  </button>
                );
              }}
            />
            {inspectedRune && (
              <div className="callout">
                <b>{runeDef(inspectedRune)?.name} preview</b>
                {runeInscriptionPreview(s, inspectedRune, it).map((line) => (
                  <div key={line} className="small muted">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="section-label">Pinnacle Doom Sigils · from the Uber Pinnacle Bosses</div>
            {ownedPinnacleSigils.length === 0 ? (
              <div className="dim small">You have none yet. Doom Sigils drop from the Uber Pinnacle Bosses in Maps.</div>
            ) : (
              <div className="row wrap" style={{ gap: 6 }}>
                {ownedPinnacleSigils.map((sigilId) => {
                  const reason = orbReason(s, sigilId, it.uid);
                  return (
                    <button key={sigilId} className="btn sm" disabled={!!reason} title={reason ?? materialDef(sigilId).desc ?? ''} onClick={() => use(sigilId)}>
                      <MatIcon id={sigilId} size={12} /> {materialDef(sigilId).name} <span className="dim">×{s.storage.bank[sigilId] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'auto' && (
        <div className="craft-section">
          {benchLvl < AUTO_CRAFT_BENCH_LEVEL && <NeedsBench level={AUTO_CRAFT_BENCH_LEVEL} />}
          <CraftUntilCard s={s} item={it} />
        </div>
      )}
      </>}

      {benchLvl < BENCH_BUILT_LEVEL && <div className="dim small">Salvaging needs the Crafting Bench built (level {BENCH_BUILT_LEVEL}) in your Hideout.</div>}

      {history.length > 0 && (
        <div>
          <div className="section-label">Crafting history</div>
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
  );
}
