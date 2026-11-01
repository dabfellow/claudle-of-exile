import { useState, type ReactNode } from 'react';
import { activeGemDef } from '../../data/gems';
import { GEAR_SWITCH_BENCH_LEVEL } from '../../data/hideout';
import { SKILLS } from '../../data/skills';
import { locateItem } from '../../engine/itemActions';
import { findSkillGem } from '../../engine/gems';
import {
  applyGearSet,
  applySkillSet,
  deleteGearSet,
  deleteSkillSet,
  gearSetWorn,
  gearSwitchUnlocked,
  renameLoadout,
  saveGearSet,
  saveSkillSet,
  setAutoGear,
  skillSetActive,
  updateGearSet,
  updateSkillSet,
} from '../../engine/loadouts';
import { SKILL_IDS, type GameState, type GearSet, type SkillSet } from '../../engine/types';
import { game } from '../../game';
import { Icon } from './Icon';

/** One saved set: its name, what's in it, and buttons to use it, save over it or delete it. */
function SetRow({
  kind,
  set,
  active,
  verb,
  summary,
  onUse,
  onUpdate,
  onDelete,
}: {
  kind: 'gear' | 'skills';
  set: GearSet | SkillSet;
  active: boolean;
  verb: string;
  summary: string;
  onUse: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="loadout-row">
      <input className="input" value={set.name} maxLength={24} aria-label="Set name" onChange={(e) => game.act((st) => renameLoadout(st, kind, set.id, e.target.value))} />
      <span className="loadout-sum dim small">{summary}</span>
      {active ? <span className="chip">{verb === 'Wear' ? 'Worn' : 'In use'}</span> : <button className="btn sm primary" onClick={onUse}>{verb}</button>}
      <button className="btn sm" title="Replace this set with what you have now" onClick={onUpdate}>
        Update
      </button>
      <button className="btn sm ghost" title="Delete this set" aria-label={`Delete ${set.name}`} onClick={onDelete}>
        <Icon name="close" size={12} />
      </button>
    </div>
  );
}

/** The card both lists share: saved sets, and a box to save the current setup under a new name. */
function SetsCard({ title, hint, placeholder, onSave, children, after }: { title: string; hint: string; placeholder: string; onSave: (name: string) => void; children: ReactNode; after?: ReactNode }) {
  const [name, setName] = useState('');
  const save = () => {
    onSave(name.trim() || placeholder);
    setName('');
  };
  return (
    <div className="card">
      <div className="card-title">
        {title}
        <span className="grow" />
        <span className="card-hint">{hint}</span>
      </div>
      <div className="loadout-list">
        {children}
        <div className="loadout-row">
          <input
            className="input"
            placeholder={placeholder}
            value={name}
            maxLength={24}
            aria-label="New set name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <button className="btn sm" onClick={save}>
            Save current
          </button>
        </div>
      </div>
      {after}
    </div>
  );
}

function gearSummary(s: GameState, set: GearSet): string {
  const uids = Object.values(set.items);
  const missing = uids.filter((uid) => !locateItem(s, uid)).length;
  return `${uids.length} piece${uids.length === 1 ? '' : 's'}${missing ? `, ${missing} missing` : ''}`;
}

/** Which gear set each activity puts on, once the Crafting Bench allows it. */
function AutoSwitch({ s }: { s: GameState }) {
  if (!gearSwitchUnlocked(s)) {
    return (
      <div className="dim small" style={{ marginTop: 10 }}>
        Upgrade the Crafting Bench to level {GEAR_SWITCH_BENCH_LEVEL} and sets can go on by themselves when you start fighting, chopping or anything else.
      </div>
    );
  }
  return (
    <>
      <div className="section-label" style={{ marginTop: 12 }}>
        Switch on starting
      </div>
      <div className="loadout-auto small">
        {SKILL_IDS.filter((id) => !SKILLS[id].soon).map((id) => (
          <label key={id}>
            <span>{id === 'combat' ? 'Combat' : SKILLS[id].name}</span>
            <select className="input" value={s.loadouts.auto[id] ?? ''} onChange={(e) => game.act((st) => setAutoGear(st, id, e.target.value ? Number(e.target.value) : null))}>
              <option value="">No change</option>
              {s.loadouts.gear.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </>
  );
}

export function GearSets({ s }: { s: GameState }) {
  return (
    <SetsCard
      title="Gear sets"
      hint="Items can wait in your bag or stash"
      placeholder={`Gear set ${s.loadouts.gear.length + 1}`}
      onSave={(name) => game.act((st) => saveGearSet(st, name))}
      after={<AutoSwitch s={s} />}
    >
      {s.loadouts.gear.map((set) => (
        <SetRow
          key={set.id}
          kind="gear"
          set={set}
          active={gearSetWorn(s, set)}
          verb="Wear"
          summary={gearSummary(s, set)}
          onUse={() => game.act((st, ctx) => applyGearSet(st, ctx, set.id))}
          onUpdate={() => game.act((st) => updateGearSet(st, set.id))}
          onDelete={() => game.act((st) => deleteGearSet(st, set.id))}
        />
      ))}
    </SetsCard>
  );
}

export function SkillSets({ s }: { s: GameState }) {
  return (
    <SetsCard
      title="Skill loadouts"
      hint="Saves each skill's supports, rules and priority"
      placeholder={`Loadout ${s.loadouts.skills.length + 1}`}
      onSave={(name) => game.act((st) => saveSkillSet(st, name))}
    >
      {s.loadouts.skills.map((set) => (
        <SetRow
          key={set.id}
          kind="skills"
          set={set}
          active={skillSetActive(s, set)}
          verb="Load"
          summary={set.slots.flatMap((x) => (x && findSkillGem(s, x.gem) ? [activeGemDef(findSkillGem(s, x.gem)!.gemId).name] : [])).join(', ') || 'Empty bar'}
          onUse={() => game.act((st) => applySkillSet(st, set.id))}
          onUpdate={() => game.act((st) => updateSkillSet(st, set.id))}
          onDelete={() => game.act((st) => deleteSkillSet(st, set.id))}
        />
      ))}
    </SetsCard>
  );
}
