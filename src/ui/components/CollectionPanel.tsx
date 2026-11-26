import { COLLECTIBLES } from '../../data/collectibles';
import { SKILLS } from '../../data/skills';
import type { SkillId } from '../../engine/types';
import { useGame } from '../../game';
import { GameIcon } from './common';
import './giants.css';

/**
 * The hidden finds of every skilling zone, grouped by skill on brass-and-leather racks: found ones glow gold,
 * unfound ones are dark engraved silhouettes showing "???" and the zone they hide in.
 */
export function CollectionPanel() {
  const s = useGame();
  const skills = [...new Set(COLLECTIBLES.map((c) => c.skill))] as SkillId[];
  const found = COLLECTIBLES.filter((c) => s.collectibles.includes(c.id)).length;
  return (
    <div className="card collection-card">
      <div className="card-title">
        Collection
        <span className="grow" />
        <span className="card-hint num">{found} / {COLLECTIBLES.length} found</span>
      </div>
      <p className="muted small">Every skilling zone hides one curiosity. They do nothing, and any completed action in the zone might turn one up.</p>
      {skills.map((skill) => {
        const rows = COLLECTIBLES.filter((c) => c.skill === skill);
        const def = SKILLS[skill];
        return (
          <div key={skill} className="collection-group" style={{ ['--skill' as string]: def.color }}>
            <h3>
              <GameIcon name={skill} size={18} color={def.color} />
              {def.name} <span className="dim small num">{rows.filter((c) => s.collectibles.includes(c.id)).length}/{rows.length}</span>
            </h3>
            <div className="collection-grid">
              {rows.map((c) => {
                const have = s.collectibles.includes(c.id);
                return (
                  <div key={c.id} className={`collection-item ${have ? 'found' : 'unfound'}`}>
                    <span className="collection-mount" aria-hidden="true">
                      <GameIcon name={skill} size={26} color={have ? def.color : '#000'} />
                    </span>
                    <span className="collection-text">
                      <b>{have ? c.name : '???'}</b>
                      <p>{have ? c.flavour : c.zoneName}</p>
                    </span>
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
