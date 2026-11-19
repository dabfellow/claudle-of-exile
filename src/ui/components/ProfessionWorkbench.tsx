import { useState, type ReactNode } from 'react';
import { baseDef } from '../../data/bases';
import { actionDef, SKILLS, type SkillAction } from '../../data/skills';
import { actionBlocker, actionIntervalMs } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { SkillId } from '../../engine/types';
import { useGame } from '../../game';
import { Art, GameIcon, MatIcon } from './common';
import { Icon } from './Icon';
import { SkillMinigame } from './SkillMinigame';
import './profession-workbench.css';

export const PROFESSION_THEMES: Partial<Record<SkillId, { title: string; catalogue: string; station: string; motif: string }>> = {
  woodcutting: { title: 'The Forester’s Tally', catalogue: 'Tree stand', station: 'Cutting station', motif: 'rings' },
  mining: { title: 'The Surveyor’s Claim', catalogue: 'Mineral seams', station: 'Working face', motif: 'strata' },
  harvesting: { title: 'The Field Herbarium', catalogue: 'Gathering grounds', station: 'Gathering tray', motif: 'leaf' },
  smelting: { title: 'The Crucible', catalogue: 'Furnace charges', station: 'Crucible charge', motif: 'crucible' },
  smithing: { title: 'The Ironwright’s Forge', catalogue: 'Patterns', station: 'Anvil & pattern', motif: 'anvil' },
  woodcrafting: { title: 'The Carver’s Bench', catalogue: 'Templates', station: 'Clamped workpiece', motif: 'timber' },
  alchemy: { title: 'The Apothecary’s Book', catalogue: 'Formula index', station: 'Mixing bench', motif: 'flask' },
  gemcutting: { title: 'The Lapidary’s Tray', catalogue: 'Gem tray', station: 'Cutting jig', motif: 'facet' },
  runecarving: { title: 'The Inscriber’s Slate', catalogue: 'Inscription tablets', station: 'Carving slate', motif: 'rune' },
  cooking: { title: 'The Hearth', catalogue: 'Recipe book', station: 'Hearth & chopping board', motif: 'hearth' },
  cartography: { title: 'The Chartmaker’s Table', catalogue: 'Chart index', station: 'Chart in progress', motif: 'compass' },
  archaeology: { title: 'The Excavator’s Fieldbook', catalogue: 'Restoration catalogue', station: 'Restoration tray', motif: 'find' },
  astrology: { title: 'The Observatory', catalogue: 'Constellations', station: 'Telescope', motif: 'compass' },
};

export interface WorkbenchGroup { key: string; label: string; actions: SkillAction[] }

/** Small existing icons and CSS materials give each profession a place of its own. */
export function ProfessionMotif({ skill }: { skill: SkillId }) {
  const motif = PROFESSION_THEMES[skill]?.motif ?? 'find';
  return <div className={`profession-motif motif-${motif}`} aria-hidden="true">
    <i /><i /><i /><GameIcon name={skill} size={28} color="currentColor" />
  </div>;
}

function ActivityIcon({ a }: { a: SkillAction }) {
  const output = Object.keys(a.protectedOutputs ?? a.outputs ?? {})[0];
  if (a.baseId) return <Art src={`items/${a.baseId}`} alt="" size={26} fallback={<Icon name={baseDef(a.baseId).slot} size={23} color={a.color} />} />;
  if (output) return <MatIcon id={output} size={24} />;
  return <GameIcon name={a.skill} size={23} color={a.color} />;
}

/** Selection is view-only; the selected card retains every existing engine-backed control. */
export function ProfessionWorkbench({ skill, groups, renderAction, isUnlocked }: {
  skill: SkillId;
  groups: WorkbenchGroup[];
  renderAction: (action: SkillAction) => ReactNode;
  isUnlocked: (action: SkillAction) => boolean;
}) {
  const s = useGame();
  const theme = PROFESSION_THEMES[skill]!;
  const actions = groups.flatMap((g) => g.actions);
  const activeId = s.action?.kind === 'skill' ? s.action.actionId : null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const selected = actions.find((a) => a.id === selectedId) ?? actions.find((a) => a.id === activeId) ?? actions.find((a) => !actionBlocker(s, a)) ?? actions[0];
  const d = deriveStats(s);
  const activeHere = actions.find((a) => a.id === activeId);
  const activeElsewhere = activeId && actionDef(activeId).skill === skill && !activeHere ? actionDef(activeId) : null;
  const grid = skill === 'harvesting' || skill === 'gemcutting' || skill === 'runecarving';

  if (!selected) return <div className="card profession-empty">No activities in this category yet.</div>;

  return <div className={`profession-workspace ${grid ? 'specimen-workspace' : ''}`}>
    <section className="profession-catalogue card" aria-label={theme.catalogue}>
      <div className="profession-catalogue-head"><h2>{theme.catalogue}</h2><label className="check"><input type="checkbox" checked={onlyUnlocked} onChange={(e) => setOnlyUnlocked(e.target.checked)} /> Unlocked only</label></div>
      <div className="profession-groups">
        {groups.map((group) => {
          const shown = onlyUnlocked ? group.actions.filter(isUnlocked) : group.actions;
          if (!shown.length) return null;
          const isSelected = group.actions.includes(selected);
          const expanded = opened[group.key] ?? isSelected;
          const level = Math.min(...group.actions.map((a) => a.level));
          return <div className={`profession-group ${isSelected ? 'selected' : ''}`} key={group.key}>
            <button className="profession-group-head" aria-expanded={expanded} onClick={() => {
              setOpened((prev) => ({ ...prev, [group.key]: !expanded }));
              if (!expanded) setSelectedId((shown.find((a) => !actionBlocker(s, a)) ?? shown[0]).id);
            }}>
              <span className="profession-specimen"><ActivityIcon a={group.actions[0]} /></span>
              <span><b>{group.label}</b><small>Lv {level}{group.actions.length > 1 ? ` · ${group.actions.length} activities` : ''}</small></span>
              <span className="spacer" />{group.actions.every((a) => !isUnlocked(a)) && <GameIcon name="lock" size={12} />}<span aria-hidden>{expanded ? '⌄' : '›'}</span>
            </button>
            {expanded && <div className="profession-activity-list">{shown.map((a) => {
              const blocker = actionBlocker(s, a);
              return <button data-tut={`action-${a.id}`} className={`profession-activity ${selected.id === a.id ? 'selected' : ''} ${!isUnlocked(a) ? 'locked' : ''}`} key={a.id} aria-pressed={selected.id === a.id} title={blocker ?? a.name} onClick={() => setSelectedId(a.id)}>
                <ActivityIcon a={a} /><span><b>{a.name}</b><small className="num">Lv {a.level} · {(actionIntervalMs(s, a, d) / 1000).toFixed(1)}s{activeId === a.id ? ' · Running' : ''}</small></span>
                {!isUnlocked(a) && <GameIcon name="lock" size={11} />}
              </button>;
            })}</div>}
          </div>;
        })}
        {onlyUnlocked && !actions.some(isUnlocked) && <p className="dim small">No unlocked activities. Turn off the filter to see requirements.</p>}
      </div>
    </section>
    <section className="profession-station" aria-label={`${selected.name} workbench`}>
      <div className="profession-station-rail"><span>{theme.station}</span><span className="num">Lv {selected.level}</span></div>
      <div className="profession-station-body">
        <div className="profession-workpiece"><ProfessionMotif skill={skill} /><div><span className="profession-eyebrow">Selected {SKILLS[skill].group === 'gathering' ? 'activity' : 'recipe'}</span><h2>{selected.name}</h2></div></div>
        <div className="profession-readout"><span><b className="num">{(actionIntervalMs(s, selected, d) / 1000).toFixed(1)}s</b> per cycle</span><span><b className="num">{selected.xp}</b> base XP</span><span className={selected.id === activeId ? 'working' : ''}>{selected.id === activeId ? 'Working' : 'Selected'}</span></div>
        {renderAction(selected)}
        {activeHere && activeHere.id !== selected.id && <button className="profession-return" onClick={() => setSelectedId(activeHere.id)}>Working: {activeHere.name} · View active activity</button>}
        {activeElsewhere && <p className="small dim">Focus supports your active activity: {activeElsewhere.name}.</p>}
        <SkillMinigame skill={skill} />
      </div>
    </section>
  </div>;
}
