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

const ARCHAEOLOGY_COLLECTIBLES: CollectibleDef[] = [
  row('archaeology', 'dig_cairn', "Giant's Cairn", 'A child-sized tally-bone', 'Notched like the giants\' own, but small enough for a human hand. Someone was learning to count.'),
  row('archaeology', 'dig_cutting', "Surveyors' Cutting", "A surveyor's lost sketchbook", 'Every page is the same hillside, drawn a little more carefully each time.'),
  row('archaeology', 'dig_barrow', 'Rime Barrow', 'A frost-clear marble', 'Ice that never melted, polished smooth by a thousand thumbs.'),
  row('archaeology', 'dig_colossus', 'The Fallen Colossus', 'A stone fingernail', 'As big as a shield, and someone had painted it red.'),
  row('archaeology', 'dig_adit', 'The Imperial Adit', 'A miner\'s ration token', 'Stamped "one loaf". It was never spent.'),
  row('archaeology', 'dig_heart', 'The Hollow Heart', 'A bell with no clapper', 'It rings anyway, very softly, when nobody is near it.'),
  row('archaeology', 'dig_reliquary', 'The Sealed Reliquary', 'A wax seal with your initials', 'Older than the Reliquary. Nobody can explain it.'),
];

const ASTROLOGY_COLLECTIBLES: CollectibleDef[] = [
  row('astrology', 'lantern', 'The Lantern and the Oak', "An astronomer's margin note", '"The third star is late again. Tell no one."'),
  row('astrology', 'sower', 'The Sower and the Cutpurse', 'A pressed seed in the atlas', 'Tucked between two pages of the sky, as if it might sprout there.'),
  row('astrology', 'buried_king', 'The Buried King and the Ember Moon', 'A crown drawn in charcoal', 'Someone traced the constellation and added a crown. It fits.'),
  row('astrology', 'anvil', 'The Anvil and the Loom', 'A brass lens cap', 'Engraved: "for the apprentice who never closes it."'),
  row('astrology', 'alembic', 'The Alembic and the Prism', 'A cracked prism shard', 'It splits starlight into colours that have no names.'),
  row('astrology', 'scribe', 'The Scribe and the Hearth', 'A half-finished star map', 'The scribe stopped mid-line. The ink is still wet.'),
  row('astrology', 'wanderer', 'The Wanderer and the Unclosed Eye', 'A compass that points up', 'Always toward the same faint star. Nobody has found it on any chart.'),
  row('astrology', 'deep_nova', 'The Nova Veil', 'A cinder of starlight', 'Warm to the touch, years after it fell.'),
  row('astrology', 'deep_binary', 'The Binary Deep', 'Two matching rings', 'One gold, one silver. They turn together when you spin either.'),
  row('astrology', 'deep_black', 'The Black Reach', 'A page of nothing', 'Perfectly black. Stare long enough and a star looks back.'),
];

export const COLLECTIBLES: CollectibleDef[] = [
  ...WOODCUTTING_COLLECTIBLES,
  ...ARCHAEOLOGY_COLLECTIBLES,
  ...ASTROLOGY_COLLECTIBLES,
  row('mining', 'delve', 'The Delve', "A lost miner's lantern", 'The wick is dry, and the handle is polished smooth.'),
  row('smelting', 'furnace', 'The Furnace', "An old smith's maker's mark", 'An unfamiliar stamp baked into a loose firebrick.'),
  row('smithing', 'forge', 'The Forge', "A master smith's broken hammerhead", 'Someone kept it behind the quench barrel. The striking face still shines.'),
  row('woodcrafting', 'workbench', 'The Woodcrafting Bench', 'A carved toy hare', 'One ear has been worn smooth. It was carried much further than this bench.'),
  row('gemcutting', 'wheel', 'The Cutting Wheel', 'A jeweller’s lost loupe', 'Tiny initials are etched where only a jeweller would look.'),
  row('harvesting', 'sunpetal', 'Sunpetal Patch', 'A pressed golden petal', 'Tucked between two torn pages of an old field guide.'),
  row('harvesting', 'frostleaf', 'Frostleaf Patch', 'A frost-rimmed fern', 'It stays cold to the touch even in a warm pocket.'),
  row('harvesting', 'emberroot', 'Emberroot Patch', 'A charred seed pod', 'Still faintly warm, smelling of hearth smoke.'),
  row('harvesting', 'voidbloom', 'Voidbloom Patch', 'A velvet calyx', 'So dark it swallows lantern light at the edges.'),
  row('harvesting', 'moon_bloom', 'Moon Bloom Patch', 'A silver-veined leaf', 'Only catches the eye when held sideways to the moon.'),
  row('harvesting', 'thornvine', 'Thornvine Patch', 'A braided bramble ring', 'Woven tight by someone who knew which thorns bend.'),
  row('harvesting', 'star_bloom', 'Star Bloom Patch', 'A dry star-pod', 'Rattles softly like glass beads when shaken.'),
  row('harvesting', 'glimmermoss', 'Glimmermoss Patch', 'A bottled tuft of moss', 'Glows pale green in the dark long after picking.'),
  row('harvesting', 'wraithlily', 'Wraithlily Patch', 'A translucent petal', 'Clear as oiled paper, with veins like frost.'),
  row('alchemy', 'bench', 'The Alchemy Bench', 'A cracked vial', "An old alchemist's label is still legible on the glass."),
  row('cartography', 'table', 'The Drafting Table', "A mapmaker's doodle", 'A tiny sea serpent inked into the corner of a faded margin.'),
];

export function collectibleDef(id: string): CollectibleDef | undefined {
  return COLLECTIBLES.find((c) => c.id === id);
}

export function collectibleFor(skill: SkillId, zone: string): CollectibleDef | undefined {
  return COLLECTIBLES.find((c) => c.skill === skill && c.zone === zone);
}
