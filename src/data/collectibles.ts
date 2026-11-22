import type { SkillId } from '../engine/types';
import { WOODS } from './woodcutting';

/**
 * Hidden skilling collectibles: one per skilling zone, no gameplay effect (docs/SKILLING_BUILD_GUIDE.md section 5).
 *
 * To add a skill's rows: build a list of `row(...)` calls in this file and add it to COLLECTIBLES below.
 * `zone` is whatever the skill calls a zone (a forest region, a dig site, a workstation). The skill's engine calls
 * `rollCollectible(s, ctx, skill, zone)` (engine/collectibles.ts) once per completed action in that zone.
 */
export interface CollectibleDef {
  id: string;
  skill: SkillId;
  /** the zone's key, as the skill uses it */
  zone: string;
  /** shown once found */
  name: string;
  flavour: string;
  /** the zone's display name, shown as "???" plus this until found */
  zoneName: string;
}

/** 1 in this many completed actions finds it, while it is still unfound. */
export const COLLECTIBLE_ODDS = 2000;

const row = (skill: SkillId, zone: string, zoneName: string, name: string, flavour: string): CollectibleDef => ({
  id: `${skill}.${zone}`, skill, zone, zoneName, name, flavour,
});

const WOODCUTTING_COLLECTIBLES: CollectibleDef[] = [
  row('woodcutting', 'ash', WOODS[0].region, 'Carved initials, ash bark', '"M + T", cut deep into a trunk long ago. The tree grew around the letters.'),
  row('woodcutting', 'oak', WOODS[1].region, 'A hollow oak acorn cup', 'Packed with tiny folded notes. Every one says the same thing: "not yet."'),
  row('woodcutting', 'yew', WOODS[2].region, 'A yew bowyer\'s mark', 'A bowyer stamped this wood before the kingdom had a name for archers.'),
  row('woodcutting', 'ironwood', WOODS[3].region, 'A rusted wedge', 'Left in a split and swallowed by the tree. It has been there for centuries.'),
  row('woodcutting', 'ancient', WOODS[4].region, 'A lover\'s knot in the grain', 'The grain of this log twisted into a perfect knot. It looks tied on purpose.'),
  row('woodcutting', 'spirit', WOODS[5].region, 'A pale lantern-moss', 'It glows faintly when no one is looking, and goes dark when you are.'),
  row('woodcutting', 'worldwood', WOODS[6].region, 'A green-gold seed husk', 'Empty, but warm. Whatever was inside left in a hurry.'),
];

export const COLLECTIBLES: CollectibleDef[] = [
  ...WOODCUTTING_COLLECTIBLES,
];

export function collectibleDef(id: string): CollectibleDef | undefined {
  return COLLECTIBLES.find((c) => c.id === id);
}

export function collectibleFor(skill: SkillId, zone: string): CollectibleDef | undefined {
  return COLLECTIBLES.find((c) => c.skill === skill && c.zone === zone);
}
