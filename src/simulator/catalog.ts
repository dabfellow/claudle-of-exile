import * as classes from '../data/classes';
import * as bases from '../data/bases';
import * as affixes from '../data/affixes';
import * as drops from '../data/drops';
import * as gems from '../data/gems';
import * as flasks from '../data/flasks';
import * as zones from '../data/zones';
import * as passives from '../data/passiveTree';
import * as ascendancies from '../data/ascendancies';
import * as hideout from '../data/hideout';
import * as maps from '../data/maps';
import * as skills from '../data/skills';
import * as materials from '../data/materials';
import * as events from '../data/events';
import { xpToReach, maxLevelOf } from '../engine/xp';
import type { SkillId } from '../engine/types';

/** Editor data is generated from game definitions. Executable formulas live in runtime.js. */
export function catalog() {
  return JSON.parse(JSON.stringify({ schemaVersion: 1, gameVersion: __APP_VERSION__, classes, bases, affixes, drops, gems, flasks, zones, passives, ascendancies, hideout, maps, skills, materials, events,
    xp: Object.fromEntries(Object.keys(skills.SKILLS).map(id => [id, Array.from({ length: maxLevelOf(id as SkillId) }, (_, i) => xpToReach(id as SkillId, i + 1))])),
  }));
}
