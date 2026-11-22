import { COLLECTIBLES } from '../../data/collectibles';
import { SKILLS } from '../../data/skills';
import type { SkillId } from '../../engine/types';
import { useGame } from '../../game';
import './giants.css';

/** The hidden finds of every skilling zone, grouped by skill: unfound ones show "???" and the zone they hide in. */
export function CollectionPanel() {
  const s = useGame();
  const skills = [...new Set(COLLECTIBLES.map((c) => c.skill))] as SkillId[];
  const found = COLLECTIBLES.filter((c) => s.collectibles.includes(c.id)).length;
  return (
    <div className="card">
      <div className="card-title">
        Collection
        <span className="grow" />
        <span className="card-hint num">{found} / {COLLECTIBLES.length} found</span>
      </div>
      <p className="muted small">Every skilling zone hides one curiosity. They do nothing, and any completed action in the zone might turn one up.</p>
      {skills.map((skill) => {
        const rows = COLLECTIBLES.filter((c) => c.skill === skill);
        return (
          <div key={skill} className="collection-group">
            <h3>{SKILLS[skill].name} <span className="dim small num">{rows.filter((c) => s.collectibles.includes(c.id)).length}/{rows.length}</span></h3>
            <div className="collection-grid">
              {rows.map((c) => {
                const have = s.collectibles.includes(c.id);
                return (
                  <div key={c.id} className={`collection-item ${have ? 'found' : 'unfound'}`}>
                    <b>{have ? c.name : '???'}</b>
                    <p>{have ? c.flavour : c.zoneName}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
