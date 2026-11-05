import { useCallback, useState } from 'react';
import { baseDef } from '../../data/bases';
import { FOSSILS, fossilDef, RESINS } from '../../data/craftMats';
import { flaskDef } from '../../data/flasks';
import { ACTIVE_GEMS, SUPPORT_GEMS } from '../../data/gems';
import { materialDef } from '../../data/materials';
import { isMapId, mapTheme } from '../../data/maps';
import { actionsFor, SKILLS, type SkillAction } from '../../data/skills';
import { zoneDef } from '../../data/zones';
import { upgradeCost } from '../../engine/cartography';
import { mapsHeld } from '../../engine/maps';
import { BENCH_UNBUILT, benchBuilt } from '../../engine/crafting';
import { actionBlocker, actionIntervalMs, actionPlaceNeeded, resinBonus, setSmithCatalyst, skillLevel, smithIlvl, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameEvent, SkillId } from '../../engine/types';
import { gemArrived } from '../../engine/progress';
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

const START_LABEL: Record<SkillId, string> = {
  combat: 'Fight',
  mining: 'Mine',
  woodcutting: 'Chop',
  harvesting: 'Forage',
  thieving: 'Lift',
  archaeology: 'Dig',
  smithing: 'Smith',
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
  if (gem.kind === 'signature') return 'Signature support for a skill you own';
  const pool = (gem.kind === 'skill' ? ACTIVE_GEMS : SUPPORT_GEMS.filter((g) => !g.signatureFor)).filter((g) => gemArrived(s, g.id));
  return `Random ${gem.kind} gem (1 of ${pool.length})`;
}

/** What an activity produces, as rows that line up with the ingredient list. */
function OutputRows({ s, a }: { s: GameState; a: SkillAction }) {
  return (
    <ul className="ingredients outputs">
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
          <span className="ing-qty num">×1</span>
        </li>
      )}
      {a.gem && (
        <li>
          <GameIcon name="gemcutting" size={13} color={a.color} />
          <span className="ing-name">{gemOutputText(s, a.gem)}</span>
          <span className="ing-qty num">×1</span>
        </li>
      )}
      {a.chart && (
        <li>
          <GameIcon name="map" size={13} color={a.color} />
          <span className="ing-name">Tier {a.chart.tier} {mapTheme(a.chart.theme).name}</span>
          <span className="ing-qty num">×{a.chart.qty}</span>
        </li>
      )}
      {a.bonus?.map((b) => (
        <li key={b.id} className="bonus">
          <MatIcon id={b.id} size={12} />
          <span className="ing-name">{materialDef(b.id).name}</span>
          <span className="ing-qty num">{b.chance < 0.01 ? `${+(b.chance * 100).toFixed(1)}%` : `${Math.round(b.chance * 100)}%`} chance</span>
        </li>
      ))}
    </ul>
  );
}

function ActionArt({ a, locked, running }: { a: SkillAction; locked: boolean; running: boolean }) {
  if (locked) return <GameIcon name="lock" size={16} color="var(--dim)" />;
  if (a.baseId) return <Art src={`items/${a.baseId}`} alt={baseDef(a.baseId).name} size={32} fallback={<Icon name={baseDef(a.baseId).slot} size={20} color={a.color} />} />;
  if (a.gem) return <GameIcon name="gemcutting" size={20} color={a.color} />;
  if (a.chart) return <GameIcon name="map" size={20} color={a.color} />;
  if (a.skill === 'cooking' || a.skill === 'cartography') return <MatIcon id={Object.keys(a.outputs!)[0]} size={22} />;
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
  const locked = !!a.soon || level < a.level || areaLocked;
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
  const lockText = a.soon ? 'Coming soon' : place ? `Reach ${place}` : `Lv ${a.level}`;

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
            {missing ? 'Missing' : blocker ? 'Full' : START_LABEL[a.skill]}
          </button>
        )}
      </div>
      {running && s.action?.kind === 'skill' && <ProgressBar value={s.action.progress / interval} color="var(--success)" className="action-progress" />}

      {open && (
        <div className="action-body">
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
          <span className="dim small">Resin (raises item level, capped by campaign progress)</span>
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
  const { tier, theme } = a.chart!;
  const need = upgradeCost(s, a);
  const held = mapsHeld(s, tier - 1, theme);
  return (
    <ul className="ingredients">
      <li className={held >= need ? 'ok' : 'short'}>
        <GameIcon name="map" size={12} />
        <span className="ing-name">Tier {tier - 1} {mapTheme(theme).name}</span>
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

/** Smithing makes hundreds of bases, so it splits them into tabs by slot first. */
const SMITH_TABS: { id: string; label: string; slots: string[] }[] = [
  { id: 'materials', label: 'Materials', slots: [] },
  { id: 'weapon', label: 'Weapons', slots: ['weapon'] },
  { id: 'offhand', label: 'Off hands', slots: ['offhand'] },
  { id: 'helmet', label: 'Helmets', slots: ['helmet'] },
  { id: 'body', label: 'Body armour', slots: ['body'] },
  { id: 'gloves', label: 'Gloves', slots: ['gloves'] },
  { id: 'boots', label: 'Boots', slots: ['boots'] },
  { id: 'jewellery', label: 'Jewellery', slots: ['belt', 'amulet', 'ring'] },
];

function smithTab(a: SkillAction): string {
  if (a.outputs && !a.baseId) return 'materials';
  const slot = a.baseId ? baseDef(a.baseId).slot : '';
  return SMITH_TABS.find((x) => x.slots.includes(slot))?.id ?? 'weapon';
}

interface Tier {
  key: string;
  label: string;
  actions: SkillAction[];
}

/**
 * Activities split into tiers: gathering by the material a node mainly gives (Copper, Iron, …),
 * production by bands of ten levels.
 */
function tiersOf(skill: SkillId, actions: SkillAction[]): Tier[] {
  const tiers: Tier[] = [];
  for (const a of actions) {
    const out = a.outputs ? Object.keys(a.outputs)[0] : undefined;
    const band = Math.floor(a.level / 10) * 10;
    // every mark pays gold, so Thieving reads by level like production
    const key = SKILLS[skill].group === 'gathering' && skill !== 'thieving' && out ? out : `band-${band}`;
    let t = tiers.find((x) => x.key === key);
    if (!t) {
      t = { key, label: key.startsWith('band-') ? `Tier ${band / 10 + 1}` : materialDef(out!).name, actions: [] };
      tiers.push(t);
    }
    t.actions.push(a);
  }
  return tiers;
}

export function SkillPage({ skill }: { skill: SkillId }) {
  const s = useGame();
  const level = skillLevel(s, skill);
  const actions = actionsFor(skill);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);
  const [tab, setTab] = useState(SMITH_TABS[0].id);
  // tier groups the player opened or closed; untouched ones follow tierOpenByDefault
  const [tierToggled, setTierToggled] = useState<Set<string>>(new Set());
  const isUnlocked = (a: SkillAction) => !a.soon && a.level <= level && !actionPlaceNeeded(s, a);
  const tabbed = skill === 'smithing';
  const inTab = tabbed ? actions.filter((a) => smithTab(a) === tab) : actions;
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
  const unlocked = actions.filter(isUnlocked).length;
  const allOpen = shown.length > 0 && shown.every((a) => open.has(a.id));
  const toggle = (id: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="page">
      <SkillHeader skill={skill} />
      <SkillMinigame skill={skill} />
      {skill === 'smithing' && (
        <div className="callout skill-note">
          Smithed bases are item level <b>{smithIlvl(s, resinBonus(s))}</b> — higher item level unlocks better modifier tiers when crafting.
        </div>
      )}
      {skill === 'smithing' && <CatalystPanel />}
      {skill === 'alchemy' && <div className="callout skill-note">Salvage unwanted items at the Crafting Bench for Arcane Dust, then transmute it into orbs here.</div>}
      {skill === 'gemcutting' && (
        <div className="callout skill-note">
          Rough Gems come from Mining (and the Glimmering Geode). Cut gems go to your gem bag on the Skills page. You have <b>{fmt(s.account.bank.rough_gem ?? 0)}</b> Rough Gems.
        </div>
      )}
      {skill === 'thieving' && <HeistBoard />}
      {skill === 'archaeology' && <ExpeditionBoard />}
      {skill === 'runecarving' && <RuneBoard />}
      {skill === 'cooking' && <PantryBoard />}
      {skill === 'cartography' && <MapCaseBoard />}
      {skill === 'fishing' && (
        <div className="callout skill-note">
          Fishing is coming soon. The rod is strung, the spots are scouted and the passive tree is ready. The fish have not been told.
        </div>
      )}
      <section>
        <div className="section-head">
          <h3>Activities</h3>
          <span className="dim small">
            {unlocked} of {actions.length} unlocked{tabbed && ' · click a tier to open or close it'}
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
        {tabbed && (
          <div className="smith-tabs">
            {SMITH_TABS.map((x) => {
              const list = actions.filter((a) => smithTab(a) === x.id);
              return (
                <button key={x.id} data-tut={`smith-tab-${x.id}`} className={`gem-chip ${tab === x.id ? 'active' : ''}`} onClick={() => setTab(x.id)}>
                  {x.label}{' '}
                  <span className="dim num">
                    {list.filter(isUnlocked).length}/{list.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
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
    </div>
  );
}
