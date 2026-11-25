import { useCallback, useState } from 'react';
import type { Page } from '../Layout';
import { baseDef } from '../../data/bases';
import { FOSSILS, fossilDef, RESINS } from '../../data/craftMats';
import { flaskDef } from '../../data/flasks';
import { ACTIVE_GEMS, activeGemDef, SUPPORT_GEMS, supportGemDef } from '../../data/gems';
import { HEIST_JOBS, heistJob } from '../../data/heist';
import { materialDef } from '../../data/materials';
import { recipeMaterialCount } from '../../engine/bank';
import { isMapId } from '../../data/maps';
import { SEALED_RELIC } from '../../data/expedition';
import { SCRIPT_IDS, SCRIPTS } from '../../data/deciphering';
import { actionsFor, SKILLS, type SkillAction } from '../../data/skills';
import { zoneDef } from '../../data/zones';
import { cartographyPreview, upgradeCost } from '../../engine/cartography';
import { mapsHeld } from '../../engine/maps';
import { BENCH_UNBUILT, benchBuilt } from '../../engine/crafting';
import { crewSlots, jobBlocker } from '../../engine/heist';
import { talentPoints } from '../../data/rogues';
import { AGILITY_SHORTCUTS } from '../../data/agility';
import { actionBlocker, actionIntervalMs, actionPlaceNeeded, agilityBlocker, gemCutPool, setSmithCatalyst, skillLevel, smithIlvl, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameEvent, SkillId } from '../../engine/types';
import { weaponComponentPreview } from '../../engine/weaponProjects';
import { hasAccomplishment } from '../../engine/professions';
import type { GameState } from '../../engine/types';
import { maxLevelOf, progressOf, xpToReach } from '../../engine/xp';
import { game, useGame, useGameEvent } from '../../game';
import { Art, Badge, fmt, GameIcon, MatIcon, ProgressBar } from '../components/common';
import { ExpeditionBoard } from '../components/ExpeditionBoard';
import { HeistBoard } from '../components/HeistBoard';
import { MapCaseBoard } from '../components/MapCaseBoard';
import { Observatory } from '../components/StarChart';
import { PantryBoard } from '../components/PantryBoard';
import { RuneBoard } from '../components/RuneBoard';
import { SkillMinigame } from '../components/SkillMinigame';
import { ThievingHeader, ThievingLedger } from '../components/ThievingLedger';
import { FurnaceView } from '../components/FurnaceView';
import { DelveView } from '../components/DelveView';
import { AnvilView } from '../components/AnvilView';
import { WoodBench } from '../components/WoodBench';
import { SawmillPage } from '../components/Sawmill';
import { TailorBench } from '../components/TailorBench';
import { CraftOutputSettings } from '../components/CraftOutputSettings';
import { LapidaryBench } from '../components/LapidaryBench';
import { ForagingBench } from '../components/ForagingBench';
import { AlchemyBench } from '../components/AlchemyBench';
import { CartographyBoard } from '../components/CartographyBoard';
import { ProfessionWorkbench, PROFESSION_THEMES } from '../components/ProfessionWorkbench';
import { Icon, Orb, Swatch } from '../components/Icon';
import { MasteryProgress } from '../components/MasteryProgress';
import { skillLock } from '../skillLock';
import { masteryLevel } from '../../engine/skillingMastery';
import { miningAccessHint, miningPreview } from '../../engine/mining';
import { woodcuttingAccessHint, woodcuttingPreview } from '../../engine/woodcutting';
import { smithingPreview } from '../../engine/smithing';
import { foragingAccessHint, foragingPreview } from '../../engine/foraging';
import { WOODS } from '../../data/woodcutting';
import { unlockedRegions } from '../../engine/woodcutting';
import { GIANT_TABS, GiantView, isGiantTab } from '../components/GiantView';
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
  agility: 'Run',
  archaeology: 'Dig',
  smelting: 'Smelt',
  smithing: 'Forge',
  woodcrafting: 'Craft',
  tailoring: 'Sew',
  sawmilling: 'Saw',
  alchemy: 'Brew',
  gemcutting: 'Cut',
  runecarving: 'Carve',
  cooking: 'Cook',
  cartography: 'Draw',
  astrology: 'Research',
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
      {Object.entries(a.protectedOutputs ?? {}).map(([id, n]) => <li key={id}><MatIcon id={id} size={12} /><span className="ing-name">{materialDef(id).name}</span><span className="ing-qty num">Ã—{n} Â· protected</span></li>)}
      {Object.entries(a.outputs ?? {}).map(([id, n]) => (
        <li key={id}>
          <MatIcon id={id} size={12} />
          <span className="ing-name">{materialDef(id).name}</span>
          <span className="ing-qty num">{a.outputChance !== undefined ? `${Math.round(a.outputChance * 100)}% chance` : `Ã—${n}`}</span>
        </li>
      ))}
      {a.baseId && (
        <li>
          <Icon name={baseDef(a.baseId).slot} size={13} />
          <span className="ing-name">{baseDef(a.baseId).name}</span>
          <span className="ing-qty num">Ã—1</span>
        </li>
      )}
      {a.flaskId && (
        <li>
          <Orb color={flaskDef(a.flaskId).color} size={11} />
          <span className="ing-name">{flaskDef(a.flaskId).name}</span>
          <span className="ing-qty num">Ã—{a.batchMastery ? a.batch : 1}</span>
        </li>
      )}
      {a.gem && (
        <li>
          <GameIcon name="gemcutting" size={13} color={a.color} />
          <span className="ing-name">{gemOutputText(s, a.gem)}</span>
          <span className="ing-qty num">Ã—{a.batchMastery ? a.batch : 1}</span>
        </li>
      )}
      {a.chart && (
        <li>
          <GameIcon name="map" size={13} color={a.color} />
          <span className="ing-name">Map Tier {a.chart.tier}</span>
          <span className="ing-qty num">Ã—{a.chart.qty}</span>
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
 * One activity, Melvor-style: a compact row (art, name, level Â· time Â· XP, start button) that
 * expands on click to show what it drops and what it needs.
 */
function ActionCard({ a, level, open, onToggle, workbench = false }: { a: SkillAction; level: number; open: boolean; onToggle: () => void; workbench?: boolean }) {
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
          {p.text} Â· +{Math.round(a.xp * (1 + d.skillXp / 100))}xp
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
            â–¸
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
            {missing ? 'Missing' : blocker === 'Inventory and stash full' ? 'Full' : blocker ? 'Locked' : a.id.startsWith('restore_') ? 'Restore' : a.id.startsWith('sift_') ? 'Sift' : START_LABEL[a.skill]}
          </button>
        )}
      </div>
      {running && s.action?.kind === 'skill' && <ProgressBar value={s.action.progress / interval} color="var(--success)" className="action-progress" />}
      {!locked && <MasteryProgress s={s} mastery={a.mastery} compact={workbench || !open} />}

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
          {a.purpose && <p className="muted">Supplies cover {Math.floor(Math.min(...Object.entries(a.inputs!).map(([id, n]) => (s.storage.bank[id] ?? 0) / n)))} craft(s). This start makes one item and stops. Needs one free inventory slot; full storage stops before payment.</p>}
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
          {a.skill === 'agility' ? (
            <p className="dim small" style={{ margin: 0 }}>Courses give Agility XP. Levels open the shortcuts listed above.</p>
          ) : (
            <div className="action-section">
              <div className="io-label">Produces</div>
              <OutputRows s={s} a={a} />
            </div>
          )}
          {a.inputs && (
            <div className="action-section">
              <div className="io-label">Requires</div>
              <Ingredients cost={a.inputs} have={s.storage.bank} />
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
  const owned = (id: string) => fmt(s.storage.bank[id] ?? 0);
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
              <option key={f.id} value={f.id} disabled={!s.storage.bank[f.id]}>
                {f.name} ({owned(f.id)}) â€” {f.desc}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="dim small">Resin (raises item level, capped by Forge level)</span>
          <select className="input" value={cat.resin ?? ''} onChange={(e) => set({ resin: e.target.value || null })}>
            <option value="">None</option>
            {RESINS.map((r) => (
              <option key={r.id} value={r.id} disabled={!s.storage.bank[r.id]}>
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
        <label className="check" title={benchBuilt(s) ? 'Keeps smithing when both inventory and stash are full.' : BENCH_UNBUILT}>
          <input type="checkbox" checked={cat.salvageFull || cat.salvageAll} disabled={!benchBuilt(s) || cat.salvageAll} onChange={(e) => set({ salvageFull: e.target.checked })} />
          Salvage new bases when inventory and stash are full
        </label>
        <label className="check" title={benchBuilt(s) ? 'For levelling Smithing: every new base becomes Arcane Dust. A repeat-until hit is still kept.' : BENCH_UNBUILT}>
          <input type="checkbox" checked={cat.salvageAll} disabled={!benchBuilt(s)} onChange={(e) => set({ salvageAll: e.target.checked })} />
          Salvage all ordinary bases
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
        const owned = recipeMaterialCount(have, id);
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
    <div className="card profession-header" style={{ ['--skill' as string]: def.color }}>
      <div className="profession-header-icon">
        <GameIcon name={skill} size={32} color={def.color} />
      </div>
      <div className="profession-header-text" style={{ minWidth: 0 }}>
        <h1>
          {def.name} {def.soon && <Badge tone="locked">Coming soon</Badge>}
        </h1>
        <p>{PROFESSION_THEMES[skill]?.title ?? def.desc}</p>
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
  { id: 'desk', label: 'Desk' },
  { id: 'codex', label: 'Codex & Story' },
  { id: 'relics', label: 'Relics' },
  { id: 'merchants', label: 'Merchants' },
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
  if (skill === 'thieving') baseTabs = THIEVING_TABS;
  else if (skill === 'archaeology') baseTabs = ARCHAEOLOGY_TABS;
  else if (skill === 'alchemy') baseTabs = ALCHEMY_TABS;
  else if (skill === 'cooking') baseTabs = COOKING_TABS;
  else if (skill === 'gemcutting') baseTabs = GEMCUTTING_TABS;
  else if (skill === 'runecarving') baseTabs = RUNECARVING_TABS;
  else if (skill === 'harvesting') baseTabs = HARVESTING_TABS;
  else if (skill === 'cartography') baseTabs = [{ id: 'charts', label: 'Map Case' }];
  else if (skill === 'astrology') baseTabs = [{ id: 'chart', label: 'Chart' }, { id: 'research', label: 'Research' }, { id: 'watch', label: 'Watch' }, { id: 'fallen', label: 'Fallen' }];
  else if (skill === 'woodcutting') baseTabs = [...GIANT_TABS];

  // masterworks have their own page under Mastery, so a skill page only lists its own tabs
  return baseTabs ? [...baseTabs] : null;
}

function defaultSkillTab(skill: SkillId): string {
  if (skill === 'thieving') return 'marks';
  if (skill === 'archaeology') return 'desk';
  if (skill === 'harvesting') return 'forage';
  if (skill === 'cartography') return 'charts';
  if (skill === 'woodcutting') return 'giant';
  if (skill === 'astrology') return 'chart';
  return 'all';
}

/**
 * Activities split into tiers: gathering by the material a node mainly gives (Copper, Iron, â€¦),
 * production by bands of ten levels.
 */
function tiersOf(skill: SkillId, actions: SkillAction[]): Tier[] {
  const tiers: Tier[] = [];
  if (skill === 'smelting') {
    for (const a of actions) {
      const output = Object.keys(a.outputs ?? {})[0];
      const key = output ?? a.id;
      let group = tiers.find((t) => t.key === key);
      if (!group) { group = { key, label: output ? materialDef(output).name : a.name, actions: [] }; tiers.push(group); }
      group.actions.push(a);
    }
    return tiers;
  }
  if (skill === 'woodcutting') {
    for (const a of actions) {
      const heartwood = a.id === 'mill_heartwood';
      const wood = WOODS.find((w) => a.woodcutting?.wood === w.id || a.outputs?.[`${w.id}_log`] || a.outputs?.[`${w.id}_plank`]);
      const key = heartwood ? 'heartwood' : wood?.id ?? a.id;
      let group = tiers.find((t) => t.key === key);
      if (!group) { group = { key, label: heartwood ? 'Ancient Heartwood' : wood?.name ?? a.name, actions: [] }; tiers.push(group); }
      group.actions.push(a);
    }
    return tiers;
  }
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
      { key: 'civic', label: 'Civic & Wealthy (Lv 17–35)', actions: [] },
      { key: 'underworld', label: 'Underworld Figures (Lv 36–60)', actions: [] },
      { key: 'highcourt', label: 'High Court & Vaults (Lv 61–90)', actions: [] },
    ];
    for (const a of actions) {
      if (a.level <= 16) groups[0].actions.push(a);
      else if (a.level <= 35) groups[1].actions.push(a);
      else if (a.level <= 60) groups[2].actions.push(a);
      else groups[3].actions.push(a);
    }
    return groups.filter((g) => g.actions.length > 0);
  }
  if (skill === 'agility') return actions.length ? [{ key: 'courses', label: 'Courses', actions }] : [];
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
    const out = a.mining ? `${a.mining.metal}_ore` : a.id === 'mill_heartwood' ? 'ancient_heartwood' : a.woodcutting ? `${a.woodcutting.wood}_log` : a.foraging ? a.foraging.plant : a.outputs ? Object.keys(a.outputs)[0] : undefined;
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

const SHORTCUT_WHERE: Record<string, string> = { closeIn: 'Combat', heist: 'Heists', spot: 'Gathering' };

/** What each Agility level opens elsewhere, reached or not. */
function AgilityShortcuts({ level }: { level: number }) {
  const next = AGILITY_SHORTCUTS.find((x) => x.level > level);
  return (
    <details className="profession-supplies agility-shortcuts" open>
      <summary>
        Shortcuts <span className="dim num">{AGILITY_SHORTCUTS.filter((x) => x.level <= level).length}/{AGILITY_SHORTCUTS.length}</span>
        {next && <span className="dim small"> Â· next at Lv {next.level}: {next.name}</span>}
      </summary>
      <ul className="agility-shortcut-list">
        {AGILITY_SHORTCUTS.map((x) => {
          const open = x.level <= level;
          return (
            <li key={x.name} className={open ? 'open' : 'locked'}>
              <span className="num agility-shortcut-level">Lv {x.level}</span>
              <span>
                <b>{x.name}</b> <Badge tone={open ? 'success' : 'locked'}>{SHORTCUT_WHERE[x.kind]}</Badge>
                <br />
                <span className="muted small">{x.desc}</span>
              </span>
              {!open && <GameIcon name="lock" size={12} color="var(--dim)" />}
            </li>
          );
        })}
      </ul>
      <p className="dim small" style={{ margin: '6px 0 0' }}>Only the best Combat and Heist step you have reached applies. They don't add together.</p>
    </details>
  );
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
            Carry on through the campaign from the World Map. Once {place} is open, {def.name} is ready to train here.
          </p>
        </div>
      </div>
    </div>
  );
}

export function SkillPage({ skill, go }: { skill: SkillId; go?: (page: Page) => void }) {
  const s = useGame();
  const lockedAt = skillLock(s, skill);
  if (lockedAt) return <LockedSkill skill={skill} place={lockedAt} />;
  if (skill === 'mining' || skill === 'smelting' || skill === 'smithing' || skill === 'woodcrafting' || skill === 'tailoring' || skill === 'sawmilling' || skill === 'gemcutting' || skill === 'harvesting' || skill === 'alchemy' || skill === 'cartography') return <WorkshopPage key={skill} skill={skill} go={go} />;
  return <OpenSkillPage skill={skill} />;
}

function BossKeyRecipes() {
  const s = useGame();
  const level = skillLevel(s, 'smithing');
  const recipes = actionsFor('smithing').filter((a) => !a.baseId && a.id.includes('key'));
  return <ProfessionWorkbench skill="smithing" groups={tiersOf('smithing', recipes)} isUnlocked={(a) => a.level <= level}
    renderAction={(a) => <ActionCard key={a.id} a={a} level={level} open workbench onToggle={() => {}} />} />;
}

function WorkshopPage({ skill, go }: { skill: 'mining' | 'smelting' | 'smithing' | 'woodcrafting' | 'tailoring' | 'sawmilling' | 'gemcutting' | 'harvesting' | 'alchemy' | 'cartography'; go?: (page: Page) => void }) {
  const catalysts = <details className="profession-supplies"><summary>Catalysts & crafting output</summary><CatalystPanel /><CraftOutputSettings /></details>;
  return <div className={`page profession-page profession-${skill}`} style={{ ['--profession' as string]: SKILLS[skill].color }}>
    <SkillHeader skill={skill} />
    {skill === 'mining' && <DelveView />}
    {skill === 'smelting' && <FurnaceView />}
    {skill === 'smithing' && <AnvilView bossKeys={<BossKeyRecipes />} catalysts={catalysts} />}
    {skill === 'woodcrafting' && <WoodBench skill="woodcrafting" catalysts={catalysts} />}
    {skill === 'tailoring' && <TailorBench catalysts={catalysts} />}
    {skill === 'sawmilling' && <SawmillPage />}
    {skill === 'gemcutting' && <LapidaryBench />}
    {skill === 'harvesting' && <ForagingBench onOpenGreenhouse={() => go?.('greenhouse')} />}
    {skill === 'alchemy' && <AlchemyBench />}
    {skill === 'cartography' && <CartographyBoard />}
  </div>;
}

function OpenSkillPage({ skill }: { skill: SkillId }) {
  const s = useGame();
  const level = skillLevel(s, skill);
  const isUnlocked = (a: SkillAction) =>
    !a.soon &&
    a.level <= level &&
    (!a.batchMastery || (!!a.mastery && masteryLevel(s, a.mastery.id) >= a.batchMastery)) &&
    !actionPlaceNeeded(s, a) &&
    !agilityBlocker(s, a) &&
    (!!s.professionProgress.legacyAccess[a.id] ||
      ((!a.accomplishments || a.accomplishments.every((id) => hasAccomplishment(s, id))) &&
        !miningAccessHint(s, a) &&
        !woodcuttingAccessHint(s, a) &&
        !foragingAccessHint(s, a)));

  const allActions = actionsFor(skill);
  // Keep mastery batches in line with normal activities, hiding them until unlocked.
  const actions = allActions.filter((a) => !a.batchMastery || isUnlocked(a));
  const [skillTabs, setSkillTabs] = useState<Record<string, string>>({});
  const fallbackTab = skill === 'astrology' && !Object.keys(s.astrology.stars).length && !s.astrology.fallen.length ? 'research' : defaultSkillTab(skill);
  const tab = skillTabs[skill] ?? fallbackTab;
  const setTab = (t: string) => setSkillTabs((prev) => ({ ...prev, [skill]: t }));
  const tabs = getSkillTabs(skill);
  const selectedActions = actions;

  let inTab = selectedActions;
  if (skill === 'alchemy' && tab !== 'all') {
    inTab = selectedActions.filter((a) => alchemyCategory(a) === tab);
  } else if (skill === 'cooking' && tab !== 'all') {
    inTab = selectedActions.filter((a) => cookingCategory(a) === tab);
  } else if (skill === 'gemcutting' && tab !== 'all') {
    inTab = selectedActions.filter((a) => gemcuttingCategory(a) === tab);
  } else if (skill === 'runecarving' && tab !== 'all') {
    inTab = selectedActions.filter((a) => runecarvingCategory(a) === tab);
  } else if (skill === 'woodcutting') {
    inTab = selectedActions.filter((a) => a.woodcutting?.mode === 'sawmill');
  }

  const tiers = tiersOf(skill, inTab);

  const showActivities =
    skill !== 'archaeology' &&
    skill !== 'thieving' &&
    skill !== 'fishing' &&
    !(skill === 'harvesting' && tab === 'greenhouse') &&
    skill !== 'astrology' &&
    skill !== 'woodcutting';

  return (
    <div className={`page ${skill === 'thieving' ? 'thieving-page' : `profession-page profession-${skill}`}`} style={{ ['--profession' as string]: SKILLS[skill].color }}>
      {skill === 'thieving' ? <ThievingHeader /> : <SkillHeader skill={skill} />}
      {skill !== 'thieving' && skill !== 'archaeology' && skill !== 'woodcutting' && !showActivities && <SkillMinigame skill={skill} />}

      {tabs && (
        <div className="smith-tabs" style={{ marginTop: 8 }}>
          {tabs.map((x) => {
            let countText = '';
            let isActiveProject = false;
            if (skill === 'thieving') {
              if (x.id === 'marks') countText = `${selectedActions.filter(isUnlocked).length}/${selectedActions.length}`;
              else if (x.id === 'heists') countText = `${HEIST_JOBS.filter((j) => !jobBlocker(s, j)).length}/${HEIST_JOBS.length}`;
              else if (x.id === 'crew') {
                countText = `${s.heist.crew.length}/${crewSlots(s)}`;
                const unlocked = s.heist.unlockedRogues ?? [];
                const hasUnspentTalents = unlocked.some((id) => {
                  const rp = s.heist.roster?.[id];
                  return rp ? talentPoints(rp) > 0 : false;
                });
                const hasOpenSlot = unlocked.length > s.heist.crew.length && s.heist.crew.length < crewSlots(s);
                isActiveProject = hasUnspentTalents || hasOpenSlot;
              }
            } else if (skill === 'archaeology') {
              if (x.id === 'desk') countText = `${s.archaeology.inscriptions.length}`;
              else if (x.id === 'codex') countText = `${SCRIPT_IDS.reduce((n, id) => n + (s.archaeology.chapters[id] ?? 0), 0)}/${SCRIPTS.reduce((n, x) => n + x.chapters, 0)}`;
              else if (x.id === 'relics') {
                const list = selectedActions.filter((a) => a.id.startsWith('sift_') || a.id.startsWith('restore_'));
                const sealed = s.storage.bank[SEALED_RELIC] ?? 0;
                countText = s.expedition.forge ? '1 on the forge' : sealed ? `${sealed} sealed` : `${list.filter(isUnlocked).length}/${list.length}`;
              }
            } else if (skill === 'alchemy' || skill === 'cooking' || skill === 'gemcutting' || skill === 'runecarving') {
              if (x.id !== 'all') {
                const list = skill === 'alchemy' ? selectedActions.filter((a) => alchemyCategory(a) === x.id)
                  : skill === 'cooking' ? selectedActions.filter((a) => cookingCategory(a) === x.id)
                  : skill === 'gemcutting' ? selectedActions.filter((a) => gemcuttingCategory(a) === x.id)
                  : selectedActions.filter((a) => runecarvingCategory(a) === x.id);
                countText = `${list.filter(isUnlocked).length}/${list.length}`;
              }
            } else if (skill === 'woodcutting') {
              if (x.id === 'giant') countText = `${unlockedRegions(level).length}/${WOODS.length}`;
            } else if (skill === 'cartography') {
              if (x.id === 'charts') {
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

      {skill === 'astrology' && <Observatory tab={tab} onTab={setTab} />}
      {skill === 'agility' && <AgilityShortcuts level={level} />}
      {skill === 'woodcutting' && isGiantTab(tab) && <GiantView tab={tab} />}

      {skill === 'alchemy' && <div className="callout skill-note">Salvage unwanted items in your Inventory for Arcane Dust, then transmute it into orbs here.</div>}
      {skill === 'gemcutting' && (
        <div className="callout skill-note">
          Rough Gems come from Mining (and the Glimmering Geode). Cut gems go to your gem bag on the Skills page. You have <b>{fmt(recipeMaterialCount(s.storage.bank, 'rough_gem'))}</b> Rough Gems.
        </div>
      )}

      {skill === 'thieving' && tab === 'marks' && (
        <>
          {s.action?.kind === 'heist' && (
            <div className="callout" style={{ borderColor: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>
                <b>Heist in progress:</b> {heistJob(s.action.jobId).name} Â· Room {s.action.room} of {s.action.lastRoom}
              </span>
              <button className="btn sm" onClick={() => setTab('heists')}>
                View Heist
              </button>
            </div>
          )}
          {s.heist.auto && s.action?.kind === 'skill' && (
            <div className="callout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>
                <b>Casing {heistJob(s.heist.auto).name}:</b> working street marks for prep
              </span>
              <button className="btn sm ghost" onClick={() => setTab('heists')}>
                View Heist
              </button>
            </div>
          )}
          <ThievingLedger />
        </>
      )}

      {skill === 'thieving' && tab === 'heists' && <HeistBoard view="jobs" />}
      {skill === 'thieving' && tab === 'crew' && <HeistBoard view="crew" />}

      {skill === 'archaeology' && <ExpeditionBoard view={tab as 'desk' | 'codex' | 'relics' | 'merchants'} />}
      {skill === 'fishing' && (
        <div className="callout skill-note">
          Fishing is coming soon. The rod is strung, the spots are scouted and the passive tree is ready. The fish have not been told.
        </div>
      )}

      {showActivities && (
        <ProfessionWorkbench key={`${skill}:${tab}`} skill={skill} groups={tiers} isUnlocked={isUnlocked} renderAction={(a) => <ActionCard key={a.id} a={a} level={level} open workbench onToggle={() => {}} />} />
      )}

      {skill === 'runecarving' && <details className="profession-supplies"><summary>Equipped runes & resonance reference</summary><RuneBoard /></details>}
      {skill === 'cooking' && <details className="profession-supplies"><summary>Pantry & active meal</summary><PantryBoard /></details>}
      {skill === 'cartography' && <details className="profession-supplies"><summary>Map case & Sextant supplies</summary><MapCaseBoard /></details>}

    </div>
  );
}
