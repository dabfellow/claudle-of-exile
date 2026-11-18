import { useState, type ReactNode } from 'react';
import type { SkillAction } from '../../data/skills';
import { useGame } from '../../game';
import { GameIcon, MatIcon } from './common';
import './profession-workbench.css';

export interface CrucibleProps {
  groups: { key: string; label: string; actions: SkillAction[] }[];
  renderAction: (action: SkillAction) => ReactNode;
  isUnlocked: (action: SkillAction) => boolean;
}

export function SmeltingCrucible({ groups, renderAction }: CrucibleProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const actions = groups.flatMap((g) => g.actions);
  const selected = actions.find((a) => a.id === selectedId) ?? actions[0];

  return (
    <div className="profession-workspace profession-smelting">
      <section className="profession-catalogue card">
        <div className="profession-catalogue-head"><h2>Furnace Charges</h2></div>
        <div className="profession-groups">
          {groups.map((group) => (
            <div className="profession-group" key={group.key}>
              <div className="profession-activity-list">
                {group.actions.map((a) => (
                  <button 
                    className={`profession-activity ${selected?.id === a.id ? 'selected' : ''}`} 
                    key={a.id} 
                    onClick={() => setSelectedId(a.id)}
                  >
                    <span><b>{a.name}</b></span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="profession-station">
        <div className="profession-station-body">
          {selected && renderAction(selected)}
        </div>
      </section>
    </div>
  );
}