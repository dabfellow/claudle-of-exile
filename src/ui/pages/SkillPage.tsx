import { useCallback, useState } from 'react';
import { baseDef } from '../../data/bases';
import { FOSSILS, fossilDef, MARKER, RESINS } from '../../data/craftMats';
import { flaskDef } from '../../data/flasks';
import { ACTIVE_GEMS, activeGemDef, SUPPORT_GEMS, supportGemDef } from '../../data/gems';
import { HEIST_JOBS, heistJob } from '../../data/heist';
import { materialDef } from '../../data/materials';
import { isMapId } from '../../data/maps';
import { CULTURES, SEALED_RELIC, TRAIL } from '../../data/expedition';
import { hasPassport } from '../../engine/expedition';
import { actionsFor, SKILLS, type SkillAction } from '../../data/skills';
import { zoneDef } from '../../data/zones';
import { cartographyPreview, upgradeCost } from '../../engine/cartography';
import { mapsHeld } from '../../engine/maps';
import { BENCH_UNBUILT, benchBuilt } from '../../engine/crafting';
import { crewSlots, jobBlocker, jobCost } from '../../engine/heist';
import { actionBlocker, actionIntervalMs, actionPlaceNeeded, gemCutPool, resinBonus, setSmithCatalyst, skillLevel, smithIlvl, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameEvent, SkillId } from '../../engine/types';
import { ProjectBoard } from '../components/ProjectBoard';
import { PROFESSION_PROJECTS } from '../../data/professionProjects';
import { weaponComponentPreview } from '../../engine/weaponProjects';
import { hasAccomplishment, professionAccessReason } from '../../engine/professions';
import type { GameState } from '../../engine/types';
import { maxLevelOf, progressOf, xpToReach } from '../../engine/xp';
import { game, useGame, useGameEvent } from '../../game';
import { Art, Badge, fmt, GameIcon, MatIcon, ProgressBar } from '../components/common';
import { ExpeditionBoard } from '../components/ExpeditionBoard';
import { HeistBoard } from '../components/HeistBoard';
import { MapCaseBoard } from '../components/MapCaseBoard';
import { PantryBoard } from '../components/PantryBoard';
import { RuneBoard } from '../components/RuneBoard';
import { SkillMinigame } from '../components/SkillMinigame';
import { Icon, Orb, Swatch } from '../components/Icon';
import { MasteryProgress } from '../components/MasteryProgress';
import { skillLock } from '../skillLock';
import { masteryLevel } from '../../engine/skillingMastery';
import { miningAccessHint, miningPreview } from '../../engine/mining';
import { woodcuttingAccessHint, woodcuttingPreview } from '../../engine/woodcutting';
import { smithingPreview } from '../../engine/smithing';
import { foragingAccessHint, foragingPreview, greenhousePlantReason, plantGreenhouse } from '../../engine/foraging';
import { foragingSource } from '../../data/foraging';
import { skillTreeStats } from '../../engine/skillTree';
import { alchemyPreview } from '../../engine/alchemy';
import { alchemyCategory, ALCHEMY_CATEGORIES } from '../../data/alchemy';
import { COOKING_CATEGORIES, cookingCategory, cookingPreview } from '../../engine/cooking';
import { GEM_FAMILY_NAMES, GEMCUTTING_CATEGORIES, gemcuttingCategory } from '../../data/gemcutting';
import { gemcuttingPreview, gemFamilyPool, getUnequippedGems, selectGemForRecycle } from '../../engine/gemcutting';
import { RUNECARVING_CATEGORIES, runecarvingCategory, runecarvingPreview } from '../../engine/runes';
import '../round2-session3.css';

const START_LABEL: Record<SkillId, string> = {
  combat: 'Fight',
  mining: 'Mine',
  woodcutting: 'Chop',
  harvesting: 'Forage',
  thieving: 'Lift',
  archaeology: 'Dig',
  smelting: 'Smelt',
  smithing: 'Forge',
  woodcrafting: 'Craft',
  alchemy: 'Brew',
  gemcutting: 'Cut',
  runecarving: 'Carve',
  cooking: 'Cook',
  cartography: 'Draw',
  fishing: 'Fish',
};

function outputName(id: string): string {
  if (isMapId(id)) return zoneDef(id).name;
  const gem = ACTIVE_GEMS.find((g) => g.id === id) ?? SUPPORT_GEMS.find((g) => g.id === id);
  if (gem) return gem.name;
  try {
    return materialDef(id).name;
  } catch {
    return flaskDef(id).name;
  }
}

/** What a gemcutting recipe can produce, e.g. "Random support gem (1 of 24)". */
function gemOutputText(s: GameState, gem: NonNullable<SkillAction['gem']>): string {
  if (gem.kind === 'family' && gem.family) {
    const pool = gemFamilyPool(s, gem.family);
    return `${GEM_FAMILY_NAMES[gem.family]} (1 of ${pool.length})`;
  }
  if (gem.kind === 'exact' && gem.exactId) {
    const isAct = ACTIVE_GEMS.some((g) => g.id === gem.exactId);
    const name = isAct ? activeGemDef(gem.exactId).name : supportGemDef(gem.exactId).name;
    return `${name} (exact gem)`;
  }
  if (gem.kind === 'skill' || gem.kind === 'support' || gem.kind === 'signature') {
    const pool = gemCutPool(s, gem.kind);
    return `Random ${gem.kind} gem (1 of ${pool.length})`;
  }
  return 'Gem';
}

/** What an activity produces, as rows that line up with the ingredient list. */
function OutputRows({ s, a }: { s: GameState; a: SkillAction }) {
  return (
    <ul className="ingredients outputs">
      {Object.entries(a.protectedOutputs ?? {}).map(([id, n]) => <li key={id}><MatIcon id={id} size={12} /><span className="ing-name">{materialDef(id).name}</span><span className="ing-qty num">×{n} · protected</span></li>)}
      {Object.entries(a.outputs ?? {}).map(([id, n]) => (
        <li key={id}>
          <MatIcon id={id} size={12} />
          <span className="ing-name">{materialDef(id).name}</span>
          <span className="ing-qty num">{a.outputChance !== undefined ? `${Math.round(a.outputChance * 100)}% chance` : `×${n}`}</span>
        </li>
      ))}
      {a.baseId && (
        <li>
          <Icon name={baseDef(a.baseId).slot} size={13} />
          <span className="ing-name">{baseDef(a.baseId).name}</span>
          <span className="ing-qty num">×1</span>
        </li>
      )}
      {a.flaskId && (
        <li>
          <Orb color={flaskDef(a.flaskId).color} size={11} />
          <span className="ing-name">{flaskDef(a.flaskId).name}</span>
          <span className="ing-qty num">×{a.batchMastery ? a.batch : 1}</span>
        </li>
      )}
      {a.gem && (
        <li>
          <GameIcon name="gemcutting" size={13} color={a.color} />
          <span className="ing-name">{gemOutputText(s, a.gem)}</span>
          <span className="ing-qty num">×{a.batchMastery ? a.batch : 1}</span>
        </li>
      )}
      {a.chart && (
        <li>
          <GameIcon name="map" size={13} color={a.color} />
          <span className="ing-name">Map Tier {a.chart.tier}</span>
          <span className="ing-qty num">×{a.chart.qty}</span>
        </li>
      )}
      {a.bonus?.map((b) => {
        const pct = +(b.chance * 100).toFixed(1);
        const text = pct % 1 === 0 ? `${Math.round(pct)}% chance` : `${pct}% chance`;
        return (
          <li key={b.id} className="bonus">
            <MatIcon id={b.id} size={12} />
            <span className="ing-name">{materialDef(b.id).name}</span>
            <span className="ing-qty num">{text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ActionArt({ a, locked, running }: { a: SkillAction; locked: boolean; running: boolean }) {
  if (locked) return <GameIcon name="lock" size={16} color="var(--dim)" />;
  if (a.baseId) return <Art src={`items/${a.baseId}`} alt={baseDef(a.baseId).name} size={32} fallback={<Icon name={baseDef(a.baseId).slot} size={20} color={a.color} />} />;
  if (a.gem) return <GameIcon name="gemcutting" size={20} color={a.color} />;
  if (a.chart) return <GameIcon name="map" size={20} color={a.color} />;
  if (a.skill === 'cooking' || a.skill === 'cartography') return <MatIcon id={Object.keys(a.outputs ?? a.protectedOutputs ?? {})[0]} size={22} />;
  if (a.flaskId || a.skill === 'alchemy') return <Orb color={a.color} size={18} glow={running} />;
  return <Swatch color={a.color} size={16} />;
}

/**
 * One activity, Melvor-style: a compact row (art, name, level · time · XP, start button) that
 * expands on click to show what it drops and what it needs.
 */
function ActionCard({ a, level, open, onToggle }: { a: SkillAction; level: number; open: boolean; onToggle: () => void }) {
  const s = useGame();
  const d = deriveStats(s);
  const running = s.action?.kind === 'skill' && s.action.actionId === a.id;
  const place = actionPlaceNeeded(s, a);
  const areaLocked = !!place;
  const prospect = s.professionProgress.legacyAccess[a.id] ? null : miningAccessHint(s, a) ?? woodcuttingAccessHint(s, a) ?? foragingAccessHint(s, a);
  const masteryLocked = !!a.batchMastery && masteryLevel(s, a.mastery!.id) < a.batchMastery;
  const locked = !!a.soon || level < a.level || areaLocked || !!prospect || masteryLocked;
  const interval = actionIntervalMs(s, a, d);
  const blocker = actionBlocker(s, a);
  const [pops, setPops] = useState<{ id: number; text: string }[]>([]);

  const onEvent = useCallback(
    (e: GameEvent) => {
      if (e.t === 'produce' && running) {
        const first = Object.entries(e.outputs)[0];
        const text = first ? `+${first[1]} ${outputName(first[0])}` : '+1';
        const id = Math.random();
        setPops((p) => [...p.slice(-3), { id, text }]);
        setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1100);
      }
    },
    [running],
  );
  useGameEvent(onEvent);

  const missing = blocker === 'Missing materials';
  const lockText = a.soon ? 'Coming soon' : place ? `Reach ${place}` : level < a.level ? `Lv ${a.level}` : masteryLocked ? `Mastery ${a.batchMastery} required` : prospect ?? `Lv ${a.level}`;

  return (
    <div
      data-tut={`action-${a.id}`}
      className={`card action-card ${running ? 'running' : ''} ${locked ? 'locked' : ''} ${missing ? 'missing' : ''} ${open ? 'open' : ''}`}
    >
      {pops.map((p) => (
        <span key={p.id} className="pop">
          {p.text} · +{Math.round(a.xp * (1 + d.skillXp / 100))}xp
        </span>
      ))}
      <div className="action-head">
        <button className="action-toggle" onClick={onToggle} aria-expanded={open} title={open ? 'Hide details' : 'Show drops and costs'}>
          <span className="action-art">
            <ActionArt a={a} locked={locked} running={running} />
          </span>
          <span className="action-title">
            <span className="action-name">{a.name}</span>
            <span className="action-meta num">
              {locked ? (
                <span className="lock-note">{lockText}</span>
              ) : (
                <>
                  <span title="Required level">Lv {a.level}</span>
                  <span title="Time per action">{(interval / 1000).toFixed(1)}s</span>
                  <span title="Experience per action">{a.xp} XP</span>
                </>
              )}
            </span>
          </span>
          <span className="action-chevron" aria-hidden>
            ▸
          </span>
        </button>
        {locked ? null : running ? (
          <button className="btn sm" onClick={() => game.act((st) => stopAction(st))}>
            Stop
          </button>
        ) : (
          <button
            className={`btn sm ${blocker ? '' : 'primary'}`}
            disabled={!!blocker}
            title={blocker ?? ''}
            onClick={() => game.act((st, ctx) => startSkillAction(st, ctx, a.id))}
          >
            {missing ? 'Missing' : blocker === 'Inventory full' ? 'Full' : blocker ? 'Locked' : a.id.startsWith('restore_') ? 'Restore' : a.id.startsWith('sift_') ? 'Sift' : START_LABEL[a.skill]}
          </button>
        )}
      </div>
      {running && s.action?.kind === 'skill' && <ProgressBar value={s.action.progress / interval} color="var(--success)" className="action-progress" />}
      {!locked && <MasteryProgress s={s} mastery={a.mastery} compact={!open} />}

      {open && (
        <div className="action-body">
          {miningPreview(s, a).map((line) => <p className="muted" key={line}>{line}</p>)}
          {woodcuttingPreview(s, a).map((line) => <p className="muted" key={line}>{line}</p>)}
          {foragingPreview(s, a).map((line) => <p className="muted" key={line}>{line}</p>)}
          {alchemyPreview(s, a).map((line) => <p className="muted" key={line}>{line}</p>)}
          {cookingPreview(s, a).map((line) => <p className="muted" key={line}>{line}</p>)}
          {gemcuttingPreview(s, a).map((line) => <p className="muted" key={line}>{line}</p>)}
          {runecarvingPreview(s, a).map((line) => <p className="muted" key={line}>{line}</p>)}
          {smithingPreview(a, a.skill === 'archaeology' ? Math.min(45, skillLevel(s, 'archaeology')) : smithIlvl(s)).map((line) => <p className="muted" key={line}>{line}</p>)}
          {cartographyPreview(s, a).map((line) => <p className="muted" key={line}>{line}</p>)}
          {weaponComponentPreview(s, a).map((line) => <p className="muted" key={line}>{line}</p>)}
          {a.id === 'recycle_gem' && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>
                Select unequipped gem to recycle:
              </label>
              <select
                className="input"
                value={s.selectedGemRecycleUid ?? ''}
                onChange={(e) => {
                  const uid = e.target.value ? Number(e.target.value) : null;
                  game.act((st) => selectGemForRecycle(st, uid));
                }}
                style={{ maxWidth: '100%', padding: '4px 8px' }}
              >
                <option value="">-- Choose an unequipped gem --</option>
                {getUnequippedGems(s).map((g) => (
                  <option key={g.uid} value={g.uid}>
                    {g.name} ({g.kind === 'skill' ? `Skill Lvl ${g.level ?? 1}` : 'Support'}) [UID {g.uid}]
                  </option>
                ))}
              </select>
            </div>
          )}
          {a.purpose && <p className="muted">Supplies cover {Math.floor(Math.min(...Object.entries(a.inputs!).map(([id, n]) => (s.account.bank[id] ?? 0) / n)))} craft(s). This start makes one item and stops. Needs one free inventory slot; full storage stops before payment.</p>}
          {blocker && blocker !== 'Missing materials' && <p className="muted">{blocker}</p>}
          {prospect && <p className="muted">{prospect}</p>}
          {locked && (
            <div className="action-meta num">
              <span>Lv {a.level}</span>
              <span>{(interval / 1000).toFixed(1)}s</span>
              <span>{a.xp} XP</span>
              {!a.soon && !areaLocked && <span>(you're {level})</span>}
            </div>
          )}
          <div className="action-section">
            <div className="io-label">Produces</div>
            <OutputRows s={s} a={a} />
          </div>
          {a.inputs && (
            <div className="action-section">
              <div className="io-label">Requires</div>
              <Ingredients cost={a.inputs} have={s.account.bank} />
              {a.chart?.upgrade && <MapInput s={s} a={a} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Smithing catalyst slot: a Fossil steers Magic bases, Resin raises item level, repeat until a hit. */
function CatalystPanel() {
  const s = useGame();
  const cat = s.smithCatalyst;
  const set = (patch: Partial<typeof cat>) => game.act((st) => setSmithCatalyst(st, patch));
  const owned = (id: string) => fmt(s.account.bank[id] ?? 0);
  return (
    <div className="card catalyst-panel">
      <div className="card-title">
        Catalyst
        <span className="grow" />
        <span className="card-hint">Used on every smith</span>
      </div>
      <div className="catalyst-row">
        <label>
          <span className="dim small">Fossil (used only when the base comes out Magic)</span>
          <select className="input" value={cat.fossil ?? ''} onChange={(e) => set({ fossil: e.target.value || null })}>
            <option value="">None</option>
            {FOSSILS.map((f) => (
              <option key={f.id} value={f.id} disabled={!s.account.bank[f.id]}>
                {f.name} ({owned(f.id)}) — {f.desc}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="dim small">Resin (raises item level, capped by Forge level)</span>
          <select className="input" value={cat.resin ?? ''} onChange={(e) => set({ resin: e.target.value || null })}>
            <option value="">None</option>
            {RESINS.map((r) => (
              <option key={r.id} value={r.id} disabled={!s.account.bank[r.id]}>
                {r.name} +{r.ilvl} ({owned(r.id)})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="catalyst-row">
        <label className="check">
          <input type="checkbox" checked={cat.until} disabled={!cat.fossil} onChange={(e) => set({ until: e.target.checked })} />
          Repeat until a Magic base rolls a {cat.fossil ? fossilDef(cat.fossil)!.name : 'Fossil'} modifier
        </label>
        <label className="check">
          <input type="checkbox" checked={cat.salvageMisses} disabled={!cat.fossil || !cat.until} onChange={(e) => set({ salvageMisses: e.target.checked })} />
          Salvage the misses
        </label>
      </div>
      <div className="catalyst-row">
        <label className="check" title={benchBuilt(s) ? 'Keeps smithing when your bag is full. Gear already in your bag stays.' : BENCH_UNBUILT}>
          <input type="checkbox" checked={cat.salvageFull || cat.salvageAll} disabled={!benchBuilt(s) || cat.salvageAll} onChange={(e) => set({ salvageFull: e.target.checked })} />
          Salvage new bases when the bag is full
        </label>
        <label className="check" title={benchBuilt(s) ? 'For levelling Smithing: every new base becomes Arcane Dust. A repeat-until hit is still kept.' : BENCH_UNBUILT}>
          <input type="checkbox" checked={cat.salvageAll} disabled={!benchBuilt(s)} onChange={(e) => set({ salvageAll: e.target.checked })} />
          Salvage everything I smith
        </label>
      </div>
    </div>
  );
}

/** Ingredient rows: owned / required, muted green when you have enough, muted red when short. */
function Ingredients({ cost, have }: { cost: Record<string, number>; have: Record<string, number> }) {
  return (
    <ul className="ingredients">
      {Object.entries(cost).map(([id, n]) => {
        const owned = have[id] ?? 0;
        return (
          <li key={id} className={owned >= n ? 'ok' : 'short'}>
            <MatIcon id={id} size={12} />
            <span className="ing-name">{materialDef(id).name}</span>
            <span className="ing-qty num">
              <b>{fmt(owned)}</b> / {fmt(n)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The lower maps an upgrade uses up, as a row under its ingredients. */
function MapInput({ s, a }: { s: GameState; a: SkillAction }) {
  const { tier } = a.chart!;
  const need = upgradeCost(s, a);
  const held = mapsHeld(s, tier - 1);
  return (
    <ul className="ingredients">
      <li className={held >= need ? 'ok' : 'short'}>
        <GameIcon name="map" size={12} />
        <span className="ing-name">Map Tier {tier - 1}</span>
        <span className="ing-qty num">
          <b>{fmt(held)}</b> / {need}
        </span>
      </li>
    </ul>
  );
}

/** The XP header every skilling page shares. */
function SkillHeader({ skill }: { skill: SkillId }) {
  const s = useGame();
  const def = SKILLS[skill];
  const level = skillLevel(s, skill);
  const xp = s.skills[skill];
  const next = xpToReach(skill, level + 1);
  const maxed = level >= maxLevelOf(skill);
  const rate = game.xpPerHour(skill);
  return (
    <div className="card skill-hero" style={{ ['--skill' as string]: def.color }}>
      <div className="skill-hero-icon">
        <GameIcon name={skill} size={32} color={def.color} />
      </div>
      <div className="skill-hero-text" style={{ minWidth: 0 }}>
        <span className="page-kicker">Skilling</span>
        <h1>
          {def.name} {def.soon && <Badge tone="locked">Coming soon</Badge>}
        </h1>
        <p>{def.desc}</p>
      </div>
      <div className="xp">
        <div className="row">
          <span className="level-num">
            <small>Level</small>
            {level}
          </span>
          <span className="spacer" />
          {rate > 0 && <Badge tone="success">{fmt(rate)} XP/h</Badge>}
        </div>
        <ProgressBar value={maxed ? 1 : progressOf(skill, xp)} color={def.color} size="md" smooth />
        <div className="xp-meta num">
          <span>{fmt(xp)} XP total</span>
          <span className="spacer" />
          <span>{maxed ? 'Max level' : `${fmt(next - xp)} XP to level ${level + 1}`}</span>
        </div>
      </div>
    </div>
  );
}

/** Smithing / Forging splits items into tabs by slot first. */
const FORGE_TABS: { id: string; label: string; slots: string[] }[] = [
  { id: 'weapon', label: 'Weapons', slots: ['weapon'] },
  { id: 'offhand', label: 'Shields', slots: ['offhand'] },
  { id: 'helmet', label: 'Helmets', slots: ['helmet'] },
  { id: 'body', label: 'Plate Armour', slots: ['body'] },
  { id: 'gloves', label: 'Gauntlets', slots: ['gloves'] },
  { id: 'boots', label: 'Greaves', slots: ['boots'] },
  { id: 'jewellery', label: 'Jewellery', slots: ['belt', 'amulet', 'ring'] },
  { id: 'keys', label: 'Boss Keys', slots: [] },
];

const SMITH_TABS = FORGE_TABS;

function forgeTab(a: SkillAction): string {
  if (a.id.includes('key')) return 'keys';
  const slot = a.baseId ? baseDef(a.baseId).slot : '';
  return FORGE_TABS.find((x) => x.slots.includes(slot))?.id ?? 'weapon';
}

const smithTab = forgeTab;

const WOODCRAFT_TABS: { id: string; label: string; slots: string[] }[] = [
  { id: 'weapon', label: 'Staves & Bows', slots: ['weapon'] },
  { id: 'offhand', label: 'Quivers & Bucklers', slots: ['offhand'] },
  { id: 'garments', label: 'Robes & Leather', slots: ['helmet', 'body', 'gloves', 'boots'] },
  { id: 'frames', label: 'Frames', slots: [] },
];

function woodcraftTab(a: SkillAction): string {
  if (a.id.includes('frame')) return 'frames';
  const slot = a.baseId ? baseDef(a.baseId).slot : '';
  return WOODCRAFT_TABS.find((x) => x.slots.includes(slot))?.id ?? 'weapon';
}

const SMELTING_TABS: { id: string; label: string }[] = [
  { id: 'bars', label: 'Metal Bars' },
  { id: 'alloys', label: 'Protective Alloys' },
];

function smeltingTab(a: SkillAction): string {
  return a.id.includes('alloy') ? 'alloys' : 'bars';
}

interface Tier {
  key: string;
  label: string;
  actions: SkillAction[];
}

const THIEVING_TABS: { id: string; label: string }[] = [
  { id: 'marks', label: 'Street Marks' },
  { id: 'heists', label: 'Heist Operations' },
  { id: 'crew', label: 'Rogue Crew' },
];

const ARCHAEOLOGY_TABS: { id: string; label: string }[] = [
  { id: 'sites', label: 'Expedition Trail' },
  { id: 'forge', label: 'Relic Forge' },
  { id: 'restoration', label: 'Restoration & Sifting' },
  { id: 'merchants', label: 'Culture Merchants' },
];

const ALCHEMY_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Recipes' },
  ...ALCHEMY_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
];

const COOKING_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Dishes' },
  ...COOKING_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
];

const GEMCUTTING_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Cuts' },
  ...GEMCUTTING_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
];

const RUNECARVING_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Runes' },
  ...RUNECARVING_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
];

const HARVESTING_TABS: { id: string; label: string }[] = [
  { id: 'forage', label: 'Wild Foraging' },
  { id: 'greenhouse', label: 'Greenhouse' },
];

function getSkillTabs(skill: SkillId): { id: string; label: string }[] | null {
  let baseTabs: { id: string; label: string }[] | null = null;
  if (skill === 'smithing') baseTabs = SMITH_TABS;
  else if (skill === 'woodcrafting') baseTabs = WOODCRAFT_TABS;
  else if (skill === 'smelting') baseTabs = SMELTING_TABS;
  else if (skill === 'thieving') baseTabs = THIEVING_TABS;
  else if (skill === 'archaeology') baseTabs = ARCHAEOLOGY_TABS;
  else if (skill === 'alchemy') baseTabs = ALCHEMY_TABS;
  else if (skill === 'cooking') baseTabs = COOKING_TABS;
  else if (skill === 'gemcutting') baseTabs = GEMCUTTING_TABS;
  else if (skill === 'runecarving') baseTabs = RUNECARVING_TABS;
  else if (skill === 'harvesting') baseTabs = HARVESTING_TABS;
  else if (skill === 'cartography') baseTabs = [{ id: 'charts', label: 'Map Case' }];
  else if (skill === 'mining') baseTabs = [{ id: 'all', label: 'Mining' }];
  else if (skill === 'woodcutting') baseTabs = [{ id: 'all', label: 'Woodcutting' }];

  const hasProjects = PROFESSION_PROJECTS.some((p) => p.skill === skill && p.category !== 'masteryBatch');
  if (!baseTabs && !hasProjects) return null;
  const list = baseTabs ? [...baseTabs] : [];
  if (hasProjects) {
    list.push({ id: 'masterworks', label: 'Masterworks' });
  }
  return list;
}

function defaultSkillTab(skill: SkillId): string {
  if (skill === 'smithing') return SMITH_TABS[0].id;
  if (skill === 'woodcrafting') return WOODCRAFT_TABS[0].id;
  if (skill === 'smelting') return SMELTING_TABS[0].id;
  if (skill === 'thieving') return 'marks';
  if (skill === 'archaeology') return 'sites';
  if (skill === 'harvesting') return 'forage';
  if (skill === 'cartography') return 'charts';
  return 'all';
}

/**
 * Activities split into tiers: gathering by the material a node mainly gives (Copper, Iron, …),
 * production by bands of ten levels.
 */
function tiersOf(skill: SkillId, actions: SkillAction[]): Tier[] {
  const tiers: Tier[] = [];
  if (skill === 'archaeology') {
    const sifting = actions.filter((a) => a.id.startsWith('sift_'));
    const restorations = actions.filter((a) => a.id.startsWith('restore_'));
    const groups: Tier[] = [];
    if (sifting.length > 0) groups.push({ key: 'sifting', label: 'Sifting', actions: sifting });
    if (restorations.length > 0) groups.push({ key: 'restorations', label: 'Relic Restorations', actions: restorations });
    if (groups.length > 0) return groups;
  }
  if (skill === 'thieving') {
    const groups: Tier[] = [
      { key: 'street', label: 'Street Targets (Lv 1–16)', actions: [] },
      { key: 'civic', label: 'Civic & Wealthy (Lv 24–40)', actions: [] },
      { key: 'underworld', label: 'Underworld Figures (Lv 48+)', actions: [] },
    ];
    for (const a of actions) {
      if (a.level <= 16) groups[0].actions.push(a);
      else if (a.level <= 40) groups[1].actions.push(a);
      else groups[2].actions.push(a);
    }
    return groups.filter((g) => g.actions.length > 0);
  }
  if (skill === 'alchemy') {
    for (const cat of ALCHEMY_CATEGORIES) {
      const catActions = actions.filter((a) => alchemyCategory(a) === cat.id);
      if (catActions.length > 0) {
        tiers.push({ key: cat.id, label: cat.label, actions: catActions });
      }
    }
    return tiers;
  }
  if (skill === 'cooking') {
    for (const cat of COOKING_CATEGORIES) {
      const catActions = actions.filter((a) => cookingCategory(a) === cat.id);
      if (catActions.length > 0) {
        tiers.push({ key: cat.id, label: cat.label, actions: catActions });
      }
    }
    return tiers;
  }
  if (skill === 'gemcutting') {
    for (const cat of GEMCUTTING_CATEGORIES) {
      const catActions = actions.filter((a) => gemcuttingCategory(a) === cat.id);
      if (catActions.length > 0) {
        tiers.push({ key: cat.id, label: cat.label, actions: catActions });
      }
    }
    return tiers;
  }
  if (skill === 'runecarving') {
    for (const cat of RUNECARVING_CATEGORIES) {
      const catActions = actions.filter((a) => runecarvingCategory(a) === cat.id);
      if (catActions.length > 0) {
        tiers.push({ key: cat.id, label: cat.label, actions: catActions });
      }
    }
    return tiers;
  }
  for (const a of actions) {
    const out = a.mining ? `${a.mining.metal}_ore` : a.id === 'mill_heartwood' || a.woodcutting?.mode === 'heartwood' ? 'ancient_heartwood' : a.woodcutting ? `${a.woodcutting.wood}_log` : a.foraging ? a.foraging.plant : a.outputs ? Object.keys(a.outputs)[0] : undefined;
    const band = Math.floor(a.level / 10) * 10;
    const key = SKILLS[skill].group === 'gathering' && out ? out : `band-${band}`;
    let t = tiers.find((x) => x.key === key);
    if (!t) {
      t = { key, label: key.startsWith('band-') ? `Tier ${band / 10 + 1}` : materialDef(out!).name, actions: [] };
      tiers.push(t);
    }
    t.actions.push(a);
  }
  return tiers;
}

/** A life skill you can't use yet: what it does and how to open it, in place of its activities. */
function LockedSkill({ skill, place }: { skill: SkillId; place: string }) {
  const def = SKILLS[skill];
  return (
    <div className="page">
      <div className="card skill-hero" style={{ ['--skill' as string]: def.color }}>
        <div className="skill-hero-icon">
          <GameIcon name={skill} size={32} color={def.color} />
        </div>
        <div className="skill-hero-text" style={{ minWidth: 0 }}>
          <span className="page-kicker">Skilling</span>
          <h1>
            {def.name} <Badge tone="locked">Locked</Badge>
          </h1>
          <p>{def.desc}</p>
        </div>
      </div>
      <div className="card r2-locked-skill">
        <GameIcon name="lock" size={28} color="var(--dim)" />
        <div>
          <b>
            {def.name} unlocks when you reach {place}.
          </b>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Carry on through the campaign from the Campaign page. Once {place} is open, {def.name} is ready to train here.
          </p>
        </div>
      </div>
    </div>
  );
}

function GreenhousePanel({ s }: { s: GameState }) {
  const [filter, setFilter] = useState<'all' | 'ordinary' | 'abundant' | 'concentrated' | 'bloom'>('all');
  const d = deriveStats(s);
  const hasKeystone = !!skillTreeStats(s).greenhouse;
  const harvestingActions = actionsFor('harvesting');
  const activePlant = s.greenhouse ? harvestingActions.find((a) => a.id === s.greenhouse!.actionId) : null;
  const currentSkillActionId = s.action?.kind === 'skill' ? s.action.actionId : null;
  const isForaging = currentSkillActionId ? harvestingActions.some((a) => a.id === currentSkillActionId) : false;

  const filteredActions = filter === 'all'
    ? harvestingActions
    : harvestingActions.filter((a) => {
        const source = foragingSource(a);
        return source?.mode === filter;
      });

  const activeIntervalMs = activePlant ? actionIntervalMs(s, activePlant, d) : 3000;
  const progressPct = s.greenhouse && activeIntervalMs > 0
    ? Math.min(100, Math.floor((s.greenhouse.progress / activeIntervalMs) * 100))
    : 0;

  return (
    <div className="greenhouse-conservatory">
      <div className={`card ${s.greenhouse ? 'greenhouse-plot-card' : 'greenhouse-plot-empty'}`}>
        <div className="card-title">
          <span>🌿 Active Greenhouse Plot</span>
          <span className="grow" />
          {s.greenhouse && (
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => game.act((st) => { st.greenhouse = null; })}
              title="Clear plot and reset stored cycle"
            >
              Uproot / Empty Plot
            </button>
          )}
        </div>

        {!hasKeystone && (
          <div className="callout warn" style={{ marginBottom: 12 }}>
            <b>Greenhouse Keystone Required:</b> Allocate the Greenhouse keystone in the Foraging skill passive tree to enable background growth.
          </div>
        )}

        {activePlant ? (
          <div>
            <div className="row wrap" style={{ alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: activePlant.color }} />
              <b style={{ fontSize: 'var(--fs-md)' }}>{activePlant.name}</b>
              <span className="chip xs">Lv {activePlant.level}</span>
              <span className={`chip xs ${isForaging ? 'warn' : 'good'}`}>
                {isForaging ? '⏸️ Paused (Foreground Foraging)' : '🌱 Growing in background (20% speed)'}
              </span>
            </div>

            <div style={{ marginBottom: 6 }}>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)', marginBottom: 3 }}>
                <span className="dim">Cycle Progress</span>
                <span className="num">{((s.greenhouse?.progress ?? 0) / 1000).toFixed(1)}s / {(activeIntervalMs / 1000).toFixed(1)}s ({progressPct}%)</span>
              </div>
              <ProgressBar value={progressPct} color="var(--success)" className="thin" />
            </div>

            <p className="dim small" style={{ margin: '6px 0 0 0' }}>
              Produces: {Object.entries(activePlant.outputs || ({} as Record<string, number>)).map(([k, qty]) => `${qty}x ${materialDef(k)?.name ?? k}`).join(', ')}
              {activePlant.bonus && activePlant.bonus.length > 0 && ` · Bonus: ${activePlant.bonus.map((b) => `${(b.chance * 100).toFixed(1)}% ${materialDef(b.id)?.name ?? b.id}`).join(', ')}`}
            </p>
          </div>
        ) : (
          <div className="dim small" style={{ padding: '8px 0' }}>
            No plant currently growing. Allocate the Greenhouse keystone and select a discovered seed below to begin passive herb cultivation.
          </div>
        )}

        <p className="muted small" style={{ marginTop: 10, marginBottom: 0 }}>
          Your plant grows at 20% speed while you do anything else (combat, crafting, or offline), pauses during active Foraging, and preserves its progress while paused. Switching plants resets partial cycle progress.
        </p>
      </div>

      <div className="card">
        <div className="card-title">
          <span>Discovered Herb Cultivations</span>
          <span className="grow" />
          <div className="row wrap" style={{ gap: 4 }}>
            {(['all', 'ordinary', 'abundant', 'concentrated', 'bloom'] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`chip sm ${filter === k ? 'active' : ''}`}
                onClick={() => setFilter(k)}
              >
                {k === 'all' ? 'All' : k === 'bloom' ? 'Rare Blooms' : k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="greenhouse-grid" style={{ marginTop: 12 }}>
          {filteredActions.map((a) => {
            const isPlanted = s.greenhouse?.actionId === a.id;
            const reason = greenhousePlantReason(s, a);
            const intervalSec = (actionIntervalMs(s, a, d) / 1000).toFixed(1);

            return (
              <div key={a.id} className={`greenhouse-crop-card ${isPlanted ? 'active' : ''}`}>
                <div className="greenhouse-crop-head">
                  <div className="row" style={{ alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: a.color }} />
                    <b>{a.name}</b>
                  </div>
                  <span className="chip xs">Lv {a.level}</span>
                </div>

                <div className="greenhouse-crop-body">
                  <span className="dim">Yield: {Object.entries(a.outputs || ({} as Record<string, number>)).map(([k, qty]) => `${qty}x ${materialDef(k)?.name ?? k}`).join(', ')}</span>
                  {a.bonus && a.bonus.length > 0 && (
                    <span className="dim">Bonus: {a.bonus.map((b) => `${(b.chance * 100).toFixed(1)}% ${materialDef(b.id)?.name ?? b.id}`).join(', ')}</span>
                  )}
                  <span className="dim num">Base Cycle: {intervalSec}s</span>
                </div>

                <div className="greenhouse-crop-foot">
                  {isPlanted ? (
                    <span className="chip good sm" style={{ fontWeight: 600 }}>Currently Growing</span>
                  ) : reason ? (
                    <button type="button" className="btn sm" disabled title={reason}>
                      🔒 {reason.length > 28 ? reason.slice(0, 26) + '…' : reason}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn sm primary"
                      onClick={() => game.act((st) => plantGreenhouse(st, a.id))}
                    >
                      Plant in Plot
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SkillPage({ skill, go }: { skill: SkillId; go?: (skill: SkillId) => void }) {
  const s = useGame();
  const lockedAt = skillLock(s, skill);
  if (lockedAt) return <LockedSkill skill={skill} place={lockedAt} />;
  return <OpenSkillPage skill={skill} go={go} />;
}

function OpenSkillPage({ skill, go }: { skill: SkillId; go?: (skill: SkillId) => void }) {
  const s = useGame();
  const level = skillLevel(s, skill);
  const isUnlocked = (a: SkillAction) =>
    !a.soon &&
    a.level <= level &&
    (!a.batchMastery || (!!a.mastery && masteryLevel(s, a.mastery.id) >= a.batchMastery)) &&
    !actionPlaceNeeded(s, a) &&
    (!!s.professionProgress.legacyAccess[a.id] ||
      ((!a.accomplishments || a.accomplishments.every((id) => hasAccomplishment(s, id))) &&
        !miningAccessHint(s, a) &&
        !woodcuttingAccessHint(s, a) &&
        !foragingAccessHint(s, a)));

  const allActions = actionsFor(skill);
  // Keep mastery batches in line with normal activities, hiding them until unlocked.
  const actions = allActions.filter((a) => !a.batchMastery || isUnlocked(a));
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);
  const [skillTabs, setSkillTabs] = useState<Record<string, string>>({});
  const activeSkillProject = s.professionProgress.activeProject?.project.skill === skill && s.professionProgress.activeProject?.project.category !== 'masteryBatch';
  const tab = skillTabs[skill] ?? (activeSkillProject ? 'masterworks' : defaultSkillTab(skill));
  const setTab = (t: string) => setSkillTabs((prev) => ({ ...prev, [skill]: t }));
  const [purpose, setPurpose] = useState('bases');
  // tier groups the player opened or closed; untouched ones follow tierOpenByDefault
  const [tierToggled, setTierToggled] = useState<Set<string>>(new Set());

  const tabs = getSkillTabs(skill);
  const tabbed = skill === 'smithing' || skill === 'woodcrafting';
  const selectedActions = tabbed ? actions.filter((a) => !a.baseId || (purpose === 'bases' ? !a.purpose : a.purpose?.id === purpose)) : actions;

  let inTab = selectedActions;
  if (skill === 'smithing') {
    inTab = selectedActions.filter((a) => smithTab(a) === tab);
  } else if (skill === 'woodcrafting') {
    inTab = selectedActions.filter((a) => woodcraftTab(a) === tab);
  } else if (skill === 'smelting') {
    inTab = selectedActions.filter((a) => smeltingTab(a) === tab);
  } else if (skill === 'alchemy' && tab !== 'all') {
    inTab = selectedActions.filter((a) => alchemyCategory(a) === tab);
  } else if (skill === 'cooking' && tab !== 'all') {
    inTab = selectedActions.filter((a) => cookingCategory(a) === tab);
  } else if (skill === 'gemcutting' && tab !== 'all') {
    inTab = selectedActions.filter((a) => gemcuttingCategory(a) === tab);
  } else if (skill === 'runecarving' && tab !== 'all') {
    inTab = selectedActions.filter((a) => runecarvingCategory(a) === tab);
  } else if (skill === 'archaeology' && tab === 'restoration') {
    inTab = selectedActions.filter((a) => a.id.startsWith('sift_') || a.id.startsWith('restore_'));
  }

  const shown = onlyUnlocked ? inTab.filter(isUnlocked) : inTab;
  const tiers = tiersOf(skill, shown);
  // smithing opens only the newest tier you can make; other skills open everything
  const newest = [...tiers].reverse().find((x) => x.actions.some(isUnlocked))?.key ?? tiers[0]?.key;
  const tierOpen = (key: string) => (tabbed ? key === newest : true) !== tierToggled.has(`${tab}:${key}`);
  const toggleTier = (key: string) =>
    setTierToggled((o) => {
      const n = new Set(o);
      const k = `${tab}:${key}`;
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const unlocked = selectedActions.filter(isUnlocked).length;
  const allOpen = shown.length > 0 && shown.every((a) => open.has(a.id));
  const toggle = (id: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const showActivities =
    tab !== 'masterworks' &&
    (skill !== 'archaeology' || tab === 'restoration') &&
    !(skill === 'thieving' && tab !== 'marks') &&
    !(skill === 'harvesting' && tab === 'greenhouse');

  return (
    <div className="page">
      <SkillHeader skill={skill} />
      <SkillMinigame skill={skill} />

      {tabs && (
        <div className="smith-tabs" style={{ marginTop: 8 }}>
          {tabs.map((x) => {
            let countText = '';
            let isActiveProject = false;
            if (x.id === 'masterworks') {
              const projects = PROFESSION_PROJECTS.filter((p) => p.skill === skill && p.category !== 'masteryBatch');
              const unlockedProjects = projects.filter((p) => !professionAccessReason(s, p)).length;
              countText = `${unlockedProjects}/${projects.length}`;
              isActiveProject = s.professionProgress.activeProject?.project.skill === skill && s.professionProgress.activeProject?.project.category !== 'masteryBatch';
            } else if (skill === 'thieving') {
              if (x.id === 'marks') countText = `${selectedActions.filter(isUnlocked).length}/${selectedActions.length}`;
              else if (x.id === 'heists') countText = `${HEIST_JOBS.filter((j) => !jobBlocker(s, j)).length}/${HEIST_JOBS.length}`;
              else if (x.id === 'crew') countText = `${s.heist.crew.length}/${crewSlots(s)}`;
            } else if (skill === 'smithing') {
              const list = selectedActions.filter((a) => smithTab(a) === x.id);
              countText = `${list.filter(isUnlocked).length}/${list.length}`;
            } else if (skill === 'woodcrafting') {
              const list = selectedActions.filter((a) => woodcraftTab(a) === x.id);
              countText = `${list.filter(isUnlocked).length}/${list.length}`;
            } else if (skill === 'smelting') {
              const list = selectedActions.filter((a) => smeltingTab(a) === x.id);
              countText = `${list.filter(isUnlocked).length}/${list.length}`;
            } else if (skill === 'archaeology') {
              if (x.id === 'sites') countText = `${TRAIL.filter((id) => hasPassport(s, id)).length}/${TRAIL.length}`;
              else if (x.id === 'forge') countText = s.expedition.forge ? '1 open' : `${s.account.bank[SEALED_RELIC] ?? 0}`;
              else if (x.id === 'restoration') {
                const list = selectedActions.filter((a) => a.id.startsWith('sift_') || a.id.startsWith('restore_'));
                countText = `${list.filter(isUnlocked).length}/${list.length}`;
              } else if (x.id === 'merchants') countText = `${CULTURES.length}`;
            } else if (skill === 'alchemy' || skill === 'cooking' || skill === 'gemcutting' || skill === 'runecarving') {
              if (x.id !== 'all') {
                const list = skill === 'alchemy' ? selectedActions.filter((a) => alchemyCategory(a) === x.id)
                  : skill === 'cooking' ? selectedActions.filter((a) => cookingCategory(a) === x.id)
                  : skill === 'gemcutting' ? selectedActions.filter((a) => gemcuttingCategory(a) === x.id)
                  : selectedActions.filter((a) => runecarvingCategory(a) === x.id);
                countText = `${list.filter(isUnlocked).length}/${list.length}`;
              }
            } else if (skill === 'mining' || skill === 'woodcutting' || skill === 'cartography') {
              if (x.id === 'all' || x.id === 'charts') {
                countText = `${selectedActions.filter(isUnlocked).length}/${selectedActions.length}`;
              }
            }
            return (
              <button
                key={x.id}
                data-tut={`skill-tab-${x.id}`}
                className={`gem-chip ${tab === x.id ? 'active' : ''}`}
                onClick={() => setTab(x.id)}
              >
                {x.label}
                {countText && <span className="dim num" style={{ marginLeft: 5 }}>{countText}</span>}
                {isActiveProject && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--gold)',
                      marginLeft: 6,
                      verticalAlign: 'middle',
                    }}
                    title="Active project running"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {skill === 'harvesting' && tab === 'greenhouse' && <GreenhousePanel s={s} />}

      {(skill === 'smithing' || skill === 'woodcrafting') && (
        <div className="callout skill-note">
          Crafted bases are item level <b>{smithIlvl(s, resinBonus(s))}</b> — higher item level unlocks better modifier tiers when crafting.
          {' '}Purpose gear uses item level <b>{smithIlvl(s)}</b> without catalysts. Strength follows {SKILLS[skill].name} and station level (caps 21 / 45 / 90), independently of combat; equip requirements remain.
        </div>
      )}
      {skill === 'smelting' && (
        <div className="callout skill-note">
          Smelt raw ores mined from the earth into pure metal bars and blend defensive alloys in the crucible.
        </div>
      )}
      {(skill === 'smithing' || skill === 'woodcrafting') && <CatalystPanel />}
      {(skill === 'smithing' || skill === 'woodcrafting') && <label>Equipment purpose{' '}
        <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
          <option value="bases">Cheap bases · existing catalysts</option>
          <option value="physical">Physical · added and increased physical damage</option>
          <option value="protection">Protection · life and local defence</option>
          <option value="resistance_fire">Fire resistance · life and fire resistance</option>
          <option value="resistance_cold">Cold resistance · life and cold resistance</option>
          <option value="resistance_light">Lightning resistance · life and lightning resistance</option>
          <option value="resource">Resource · mana, spells or energy shield</option>
        </select>
      </label>}
      {skill === 'alchemy' && <div className="callout skill-note">Salvage unwanted items at the Crafting Bench for Arcane Dust, then transmute it into orbs here.</div>}
      {skill === 'gemcutting' && (
        <div className="callout skill-note">
          Rough Gems come from Mining (and the Glimmering Geode). Cut gems go to your gem bag on the Skills page. You have <b>{fmt(s.account.bank.rough_gem ?? 0)}</b> Rough Gems.
        </div>
      )}

      {skill === 'thieving' && tab === 'marks' && (
        <>
          {s.action?.kind === 'heist' && (
            <div className="callout" style={{ borderColor: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>
                <b>Heist in progress:</b> {heistJob(s.action.jobId).name} · Room {s.action.room} of {s.action.lastRoom}
              </span>
              <button className="btn sm" onClick={() => setTab('heists')}>
                View Heist
              </button>
            </div>
          )}
          {s.heist.auto && s.action?.kind === 'skill' && (
            <div className="callout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>
                <b>Casing {heistJob(s.heist.auto).name}:</b> lifting purses until you have <b className="num">{jobCost(s, heistJob(s.heist.auto))}</b> Markers
              </span>
              <button className="btn sm ghost" onClick={() => setTab('heists')}>
                View Heist
              </button>
            </div>
          )}
          <div className="callout skill-note">
            Marks pay gold and Rogue's Markers (including 1 guaranteed Marker every 10 mark completions). Markers fund Heist Operations. You have <b className="num">{fmt(s.account.bank[MARKER] ?? 0)}</b> Markers.
            {((s.account.bank.treasury_fragment ?? 0) > 0 || (s.account.bank.oath_fragment ?? 0) > 0) && (
              <div style={{ marginTop: 4 }}>
                Treasury reserves: <b className="num">{fmt(s.account.bank.treasury_fragment ?? 0)}</b> Treasury Fragments · <b className="num">{fmt(s.account.bank.oath_fragment ?? 0)}</b> Oath Fragments
              </div>
            )}
          </div>
        </>
      )}

      {skill === 'thieving' && tab === 'heists' && <HeistBoard view="jobs" />}
      {skill === 'thieving' && tab === 'crew' && <HeistBoard view="crew" />}

      {skill === 'archaeology' && (tab === 'sites' || tab === 'forge' || tab === 'merchants') && <ExpeditionBoard view={tab as 'sites' | 'forge' | 'merchants'} />}
      {skill === 'runecarving' && tab !== 'masterworks' && <RuneBoard />}
      {skill === 'cooking' && tab !== 'masterworks' && <PantryBoard />}
      {skill === 'cartography' && tab !== 'masterworks' && <MapCaseBoard />}
      {skill === 'fishing' && (
        <div className="callout skill-note">
          Fishing is coming soon. The rod is strung, the spots are scouted and the passive tree is ready. The fish have not been told.
        </div>
      )}

      {showActivities && (
        <section>
          <div className="section-head">
            <h3>{skill === 'thieving' ? 'Street Marks' : 'Activities'}</h3>
            <span className="dim small">
              {unlocked} of {selectedActions.length} unlocked{tabbed && ' · click a tier to open or close it'}
            </span>
            <span className="spacer" />
            {inTab.length > 8 && (
              <button className="btn sm ghost" onClick={() => setOnlyUnlocked((v) => !v)}>
                {onlyUnlocked ? 'Show all' : 'Unlocked only'}
              </button>
            )}
            <button className="btn sm ghost" onClick={() => setOpen(allOpen ? new Set() : new Set(shown.map((a) => a.id)))}>
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
          <div className={`tier-list ${tabbed ? 'spaced' : ''}`}>
            {tiers.map((t) => {
              const lo = Math.min(...t.actions.map((a) => a.level));
              const hi = Math.max(...t.actions.map((a) => a.level));
              const got = t.actions.filter(isUnlocked).length;
              const isOpen = tierOpen(t.key);
              return (
                <div key={t.key} className={`tier-group ${got ? '' : 'locked'} ${isOpen ? '' : 'closed'}`}>
                  <div
                    className={`tier-head ${tabbed ? 'clickable' : ''}`}
                    onClick={tabbed ? () => toggleTier(t.key) : undefined}
                    title={tabbed ? (isOpen ? 'Hide this tier' : 'Show this tier') : undefined}
                  >
                    {tabbed && <span className="action-chevron tier-chevron">{isOpen ? '▾' : '▸'}</span>}
                    <span className="tier-name">{t.label}</span>
                    <span className="tier-range">{lo === hi ? `Lv ${lo}` : `Lv ${lo}–${hi}`}</span>
                    <span className="tier-rule" />
                    <span className="dim small num">
                      {got}/{t.actions.length} unlocked
                    </span>
                  </div>
                  {isOpen && (
                    <div className="action-grid">
                      {t.actions.map((a) => (
                        <ActionCard key={a.id} a={a} level={level} open={open.has(a.id)} onToggle={() => toggle(a.id)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'masterworks' && <ProjectBoard skill={skill} go={go} />}
    </div>
  );
}
