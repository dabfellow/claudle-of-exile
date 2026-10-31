/**
 * Every picture the game can show, with the prompt used to generate it.
 * Single source of truth for `npm run art` (import + resize).
 * Keys are paths inside src/assets/art without an extension, e.g. `currency/chaos`.
 *
 * Prompt rule of thumb: say exactly what is in the picture (shape, material, colour, wear, how many)
 * and nothing else. Vague prompts get filled with AI clutter: candles, runes, glow, sparks, fog.
 */
import { BASES, UNIQUES } from './bases';
import { ACTIVE_GEMS, SUPPORT_GEMS } from './gems';
import { FLASKS } from './flasks';
import { CURRENCIES, MATERIALS } from './materials';
import { STATIONS } from './hideout';
import { ZONES } from './zones';

export type ArtGroup = 'portraits' | 'scenes' | 'stations' | 'zones' | 'monsters' | 'currency' | 'materials' | 'flasks' | 'items' | 'uniques' | 'gems';

export interface ArtGroupDef {
  title: string;
  priority: number;
  /** output size after `npm run art` resizes it */
  size: [number, number];
  /** what to ask ChatGPT for */
  format: string;
  /** wrapped around each entry's description */
  template?: (desc: string) => string;
}

export const ART_GROUPS: Record<ArtGroup, ArtGroupDef> = {
  portraits: {
    title: 'Portraits — trader, guide, classes', priority: 1, size: [384, 384],
    format: '1024×1024 square. One person, chest-up, facing slightly to the side, centred. Plain dark grey-brown background with no objects or scenery.',
  },
  scenes: {
    title: 'Scenes — title screen and hideout backdrop', priority: 1, size: [1600, 914],
    format: 'Wide landscape 1792×1024. Environment only, no people. A few large, simple shapes with plenty of empty space. The bottom third is dark and plain so text can sit on it.',
  },
  stations: {
    title: 'Hideout stations', priority: 2, size: [480, 480],
    format: '1024×1024 square. One object, three-quarter view from slightly above, centred, filling about two thirds of the frame. Plain dark stone floor and a plain dark background. No other furniture or props.',
  },
  zones: {
    title: 'Area banners', priority: 2, size: [1200, 686],
    format: 'Wide landscape 1792×1024. Environment only, no people or creatures. A clear foreground, middle ground and background, with a few large simple shapes.',
  },
  monsters: {
    title: 'Monsters', priority: 3, size: [256, 256],
    format: '1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.',
  },
  currency: {
    title: 'Currency orbs', priority: 3, size: [160, 160], format: '1024×1024, transparent background, one object centred like an inventory icon.',
    template: (d) => `An inventory icon of ${d}, centred, transparent background.`,
  },
  materials: {
    title: 'Materials', priority: 4, size: [128, 128], format: '1024×1024, transparent background, one object centred like an inventory icon.',
    template: (d) => `An inventory icon of ${d}, centred, transparent background.`,
  },
  flasks: {
    title: 'Flasks', priority: 4, size: [160, 160], format: '1024×1024, transparent background, a single glass flask, upright.',
    template: (d) => `An inventory icon of ${d}, upright, centred, transparent background.`,
  },
  items: {
    title: 'Item bases', priority: 5, size: [160, 160], format: '1024×1024, transparent background, a single item, upright or diagonal, like a classic RPG inventory icon.',
    template: (d) => `An inventory icon of ${d}, centred, transparent background.`,
  },
  uniques: {
    title: 'Unique items', priority: 5, size: [160, 160], format: '1024×1024, transparent background, a single item that looks rare and well made but not overdecorated.',
    template: (d) => `An inventory icon of ${d}, centred, transparent background.`,
  },
  gems: {
    title: 'Skill gems', priority: 6, size: [128, 128], format: '1024×1024, transparent background, a single cut gemstone.',
    template: (d) => `An inventory icon of ${d}, centred, transparent background.`,
  },
};

const FIXED: Record<string, string> = {
  'portraits/trader':
    'A merchant in his fifties with a short grey beard, a lined, tanned face and a small knowing smile. He wears a hooded brown wool travel cloak, hood down, with two leather pouches on a strap across his chest. One hand holds up a single gold coin.',
  'portraits/brannoc':
    'An old man in his seventies with a long grey beard in one braid, a pale scar across his left cheek and tired, kind eyes. He wears a patched grey fur cloak over a plain brown tunic. His shoulders are hunched.',
  'portraits/class_warrior':
    'A broad-shouldered warrior in his thirties with short dark hair and a stubbled jaw. He wears dented grey iron plate armour over a faded red cloth tabard. A plain rusted sword rests on his right shoulder. Serious, steady expression.',
  'portraits/class_ranger':
    'A lean ranger in her twenties with a narrow face and sharp eyes, a dark green cloth hood up over her hair. She wears close-fitting dark brown leather armour. One short dagger is held low in her right hand.',
  'portraits/class_mage':
    'A young mage in his early twenties with messy black hair and a thin face. He wears a worn, faded blue wool robe with a rope belt. In his right hand he holds a short crooked wand of pale driftwood, with a single small blue spark at its tip.',
  'portraits/class_duelist':
    'A confident duelist in his late twenties with short brown hair tied back and a thin moustache. He wears a brown leather jerkin with a single dented iron pauldron on his left shoulder. A plain straight sword is held point-down in front of him, both hands on the hilt. A slight, challenging smile.',
  'portraits/class_templar':
    'A stern templar in her forties with close-cropped grey hair and a strong jaw. She wears grey iron plate armour under a cream linen surcoat with a plain dark red stripe down the middle. A heavy wooden club with an iron-banded head rests against her shoulder. Calm, unflinching expression.',
  'portraits/class_shadow':
    'A quiet shadow in his twenties with a pale, narrow face and dark hair half-hidden under a black cloth hood. A dark grey scarf covers his mouth and nose; only his watchful eyes show. He wears close-fitting dark leather. A slim curved dagger is held low in his left hand.',
  'portraits/class_exile':
    'A castaway of unclear age, soaked and sunburnt, with tangled salt-crusted hair and a short rough beard. Torn, faded grey linen shirt, bare forearms, a length of frayed rope tied around the waist as a belt. He grips a short rusted sword. Tired but determined eyes.',
  'scenes/title':
    'A rocky coastline at night under heavy dark clouds. Tall black cliffs on the right; one small cave opening in the cliff face shows warm orange firelight. Two broken shipwrecks lie in grey surf in the middle distance. Cold blue moonlight on the water. Light rain.',
  'scenes/hideout':
    'Inside a large sea cave used as a camp. Rough grey stone walls and a sandy floor. One stone-ringed fire pit in the centre gives warm light. A few wooden crates and rolled furs against the left wall. The cave mouth on the right opens onto a dark night sea.',
};

const STATION_DESC: Record<string, string> = {
  map_device:
    'A waist-high ring of rough grey standing stones, about three metres across, set in a circle. Simple carved lines on the stones. In the middle, a flat stone disc with a faint purple light rising from it.',
  stash:
    'A large wooden chest with dark iron bands and corner plates. The lid is open, showing a heap of gold coins inside. An open iron padlock hangs from the latch.',
  forge:
    'A blacksmith forge of rough grey stone bricks with a chimney hood above. Orange coals in the hearth. An iron anvil on a tree-stump block stands in front, with a hammer resting on it.',
  alchemy_table:
    'A heavy wooden table with three glass flasks on it: one red, one blue, one green, each half full. A brass mortar and pestle and a small stack of old books sit beside them.',
  bench:
    'A sturdy wooden workbench with an iron vice bolted to one end. On top: a few hand tools, a small brass magnifying loupe, and three uncut gemstones.',
  vendor:
    'A small market stall built from wooden crates, with a patched tan canvas awning on two poles. One lantern hangs from the front pole. A few cloth bags and a coiled rope sit on the counter.',
};

const ZONE_DESC: Record<string, string> = {
  mudflats:
    'Flat grey tidal mud at dusk stretching to the horizon. The curved black wooden ribs of one old shipwreck stick up from the mud in the foreground. Shallow pools reflect a dull orange sky. Dark cliffs far away on the left.',
  brinecaves:
    'A wide sea cave with wet dark rock walls. Shallow tide pools on the floor with a soft green light coming from algae in the water. One broken wooden rowing boat lies on its side near the front.',
  ashwood:
    'A burned forest. Straight black tree trunks with no leaves stand in grey ash. A few patches of orange embers glow on the ground. Hazy brown-orange sky behind.',
  blackreed:
    'A marsh of tall dark reeds, taller than a person, around still green water. Low mist over the water. One small wooden hut on stilts stands in the distance.',
  crypt:
    'An underground stone crypt with a low arched ceiling. Shallow still water covers the floor. Two rows of plain stone coffins line the walls. Pale blue light comes through a crack in the ceiling at the far end.',
  shipgrave:
    'A grey bay full of old wrecked wooden ships lying on their sides, broken masts leaning at angles. Low grey storm clouds. Calm grey water.',
  stormcliffs:
    'Tall black sea cliffs seen from the side, with white waves breaking at their base far below. Dark storm clouds; one thin bolt of lightning in the distance.',
  sanctum:
    'The inside of a sunken stone cathedral underwater. Tall pillars, rows of broken wooden pews with pink coral growing on them. A plain stone throne at the far end. Rays of blue light come down from above.',
  // Act 2
  cinderroad:
    'A dirt road winding over low hills of burned yellow grass. Thin lines of smoke rise from the stubble. A broken wooden cart lies on its side by the road. Hazy orange sky.',
  saltflats:
    'A flat white salt plain stretching to the horizon under a pale hot sky. The ground is cracked into hexagon shapes. Heat shimmer blurs the far distance.',
  blackgrass:
    'A sea of very tall black grass under a dusky red sky. A slow line of red fire burns through the grass in the middle distance, with dark smoke.',
  caravan:
    'A square walled caravanserai of tan mud brick with an arched gateway, seen from outside. Torn cloth awnings, empty wooden carts and a dry stone well in the courtyard.',
  kurgans:
    'Rolling grey-green steppe covered in round grassy burial mounds, one in front with a dark stone doorway in its side. Overcast sky, cold light.',
  plateau:
    'A high bare flat-topped plateau of brown rock under huge dark storm clouds. Several bolts of lightning strike the plain in the distance.',
  pyretemple:
    'The inside of a red stone temple with tall square pillars. A large stone bowl of fire burns at the far end. Smoke drifts under the ceiling.',
  burningthrone:
    'The top of a high bare hill at night. A huge glowing orange orb, like a small sun, rests in a crater on the summit, lighting the scorched ground around it.',
};

const MONSTER_DESC: Record<string, string> = {
  rat: 'a large wet grey rat with matted fur, bare pink tail, small pale milky eyes',
  crab: 'a big brown crab covered in dried grey mud, a crack across its shell, one claw much bigger than the other',
  zombie: 'a drowned man with grey-green swollen skin, wet tangled hair with strands of seaweed, torn grey shirt, blank white eyes',
  wisp: 'a floating ball of pale yellow light the size of a head, with two dark hollow eyes and a small open mouth',
  gorger: 'a boss: a huge fat swamp creature like a giant toad, grey-green skin with patches of barnacles, a very wide mouth full of uneven teeth',
  crawler: 'a pale white cave insect the size of a dog, no eyes, a long body made of shiny wet plates, many thin legs',
  brinebat: 'a large grey bat with white salt crust on its fur, ragged holes in its wings, small sharp teeth',
  sailor: 'a drowned sailor with grey skin, a faded red-and-white striped shirt, a frayed rope tied around his neck',
  siren: 'a thin woman with grey scaly skin on her cheeks and neck, long wet dark hair, white frost on her lips, mouth open as if singing',
  harrow:
    'a boss: "Captain Harrow", a drowned ship captain with grey skin, a torn black tricorn hat, a long tattered navy greatcoat, and a small lantern of green flame hanging from his belt',
  cinderhound: 'a skeletal dog with black scorched bones, small orange embers in its eye sockets, grey smoke rising from its jaws',
  treant: 'a walking burned tree with a rough face in its trunk, black bark with orange-lit cracks',
  harpy: 'a thin woman-bird creature with ash-grey feathers, bare grey arms ending in claws, bright orange eyes',
  emberkin: 'a small hunched goblin-like figure in a white animal-skull mask, holding a wooden staff with smoke drifting from its tip',
  pyre: 'a boss: "Pyre-Mother Ulva", a tall gaunt witch with ash-grey skin and long black hair, wearing burnt deer antlers on her head with small flames at their tips',
  lurker: 'a huge hunched beast covered in thick green moss and dripping mud, only its yellow eyes and big jaw showing clearly',
  stalker: 'a tall thin humanoid made of bundled black reeds, a long face with no features except two pale eye-holes',
  toad: 'a huge fat toad with sickly yellow-green skin, pale blue lumps on its back, a long tongue hanging out',
  fenwitch: 'an old woman with a crown of dry reeds and a muddy green shawl, a small blue spark between her raised fingers',
  sedge: 'a boss: "Old Mother Sedge", a very old wrinkled woman whose lower body is a mass of tree roots, long grey hair, eyes glowing pale blue',
  ghoul: 'a hairless grey humanoid with pale wet skin, sunken black eyes, long thin fingers with dark claws',
  frostwraith: 'an empty hooded grey robe floating in the air, with white frost on the cloth and only darkness inside the hood',
  skeleton: 'a skeleton in rusted iron armour and a dented helmet, holding a long halberd upright',
  lich: 'a skeletal figure in soaked dark robes, with a small glowing blue crystal hanging on a chain at its chest',
  tidecaller: 'a boss: "Tidecaller Morvane", a pale woman in sea-green robes with a crown of white and red coral, a ring of water circling around her',
  brute: 'a huge muscular man with grey skin covered in barnacles, carrying a rusty ship anchor over one shoulder',
  gunner: 'a drowned sailor with grey skin and a wet bandana, holding a short black hand cannon, a lit fuse between his teeth',
  gulls: 'a tight group of five scruffy grey-and-black seagulls, beaks open, screaming',
  wreckshaman: 'a figure wearing a carved wooden ship figurehead as a mask, holding a crooked driftwood staff with a small blue spark at the top',
  vosk: 'a boss: "Admiral Vosk", a fat drowned admiral with grey skin, a wet dark blue naval coat with tarnished gold buttons and medals, holding a cutlass',
  ravager: 'a lean grey wolf-like beast with long hooked front claws and a flat head, built for climbing rock',
  galeborn: 'a humanoid figure made of pale grey swirling wind, with two small bright blue eyes',
  rockback: 'a giant crab with a large grey boulder growing out of its shell',
  stormcaller: 'a man in a soaked dark grey hooded robe holding a tall wooden staff, a small blue spark at its tip',
  skarra: 'a boss: "Skarra, Queen of Gales", a large harpy queen with storm-grey wings, a fierce face, and a simple crown of jagged iron',
  zealot: 'a bald monk in a wet brown robe, iron chains wrapped around his fists, white frost on the chains',
  eel: 'a long black eel with a wide mouth of small teeth and thin bright blue stripes along its body',
  coralgolem: 'a big slow giant built of pink and white coral, a round glowing pale blue stone in the middle of its chest',
  priest: 'a pale old priest in faded white robes, a cracked tall mitre hat, holding a metal censer covered in frost',
  ysolde:
    'a boss: "Ysolde, the Drowned Queen", a tall regal woman with pale blue skin, long dark hair floating as if underwater, a crown of white shells and pearls, a calm cold expression',
  // Act 2
  ashjackal: 'a thin grey jackal with patches of burned fur, ash on its back, glowing orange eyes',
  outrider: 'a steppe horseman in a padded brown coat and fur hat on a small shaggy horse, holding a long lance',
  vulture: 'a large bald vulture with black feathers singed at the tips and small embers in its wings',
  firesprite: 'a small flickering figure made of orange flame and burning grass stalks, about knee high',
  khorun: 'a boss: "Khorun the Outrider", a scarred nomad warlord on a black horse, a curved sabre raised, a red horsetail banner on his back',
  saltcrawler: 'a big pale crab-like creature crusted with white salt crystals, slow and heavy',
  mirage: 'a faint see-through human figure made of shimmering heat haze, with bright white eyes',
  dustdevil: 'a small whirlwind of sand and dust with a rough face in the swirl',
  saltwitch: 'a thin old woman with white salt-crusted skin and hair, wrapped in pale rags, frost on her fingers',
  glass: 'a boss: "Sister Glass, the Mirage", a tall woman whose body is made of cracked mirror glass, reflecting bright light',
  grasscat: 'a lean black big cat with a long body, hard to see in tall dark grass, yellow eyes',
  firebrand: 'a big hound with dark red fur and a burning brand mark on its side, smoke from its mouth',
  burnwalker: 'a tall charred human figure, black skin cracked with glowing orange lines, smoke rising from it',
  grassseer: 'a nomad shaman in a coat of woven grass, holding a smoking bundle of herbs, face painted red',
  ashmane: 'a boss: "Ashmane, the Sun Lion", a huge lion with a mane of flickering fire and ash-grey fur',
  raider: 'a bandit in a dusty turban and leather armour with a curved scimitar',
  lancer: 'a heavy cavalryman in scale armour with a pointed helmet, holding a long lance',
  bonecamel: 'a walking camel skeleton with dried skin stretched over its bones and a broken saddle',
  hexmerchant: 'a gaunt merchant in rich faded robes, his hands full of cold pale coins, frost on his beard',
  tamsin: 'a boss: "Bey Tamsin, the Bandit Khan", a tall bandit chief in a long red coat with two scimitars and a gold-trimmed helmet',
  barrowwight: 'a pale ghost of an ancient warrior in a bronze helmet, frost trailing behind it',
  horseskel: 'a skeleton horse with old bronze barding hanging off its ribs, blue light in its eye sockets',
  moundguard: 'a large undead warrior in bronze scale armour with a bronze axe, dirt falling from it',
  moundpriest: 'an undead priest in a tall felt hat with dangling bronze charms, a cold blue glow in its hands',
  horselord: 'a boss: "The Horse-Lord in the Mound", a huge undead king in bronze and gold riding a skeletal horse, a long lance',
  thunderhawk: 'a large hawk with dark blue feathers and small sparks of lightning crackling along its wings',
  rhino: 'a huge grey rhino with thick armour-like plates of hide and a broken horn',
  stormrider: 'a nomad rider in dark grey on a pale horse, holding a lance crackling with blue lightning',
  skyshaman: 'an old shaman in a coat of grey feathers holding a drum, blue lightning around his raised hand',
  qara: 'a boss: "Qara, Rider of the Storm", a fierce woman on a winged grey horse, a glaive crackling with lightning',
  ashmonk: 'a bald monk in a grey robe covered in ash, his palms glowing orange like hot coals',
  dervish: 'a spinning dancer in red robes with two curved blades, trailing flames',
  pyregolem: 'a large golem built from stacked red stones with fire burning in the gaps',
  acolyte: 'a young cultist in red and orange robes and a bronze mask, holding a staff topped with fire',
  ozar: 'a boss: "High Flamekeeper Ozar", an old high priest in tall red and gold robes, a crown of flames, a burning staff',
  sunguard: 'a guard in scorched golden armour with a halberd, the metal glowing faintly with heat',
  wyrmling: 'a small dragon the size of a horse with black scales and glowing orange cracks, smoke from its nose',
  ashseer: 'a blind seer with a cloth over her eyes and ash-grey robes, small lightning sparks around her',
  sunpriest: 'a priest in white and gold robes with a golden sun disc behind his head, a beam of fire in his hand',
  azhar: 'a boss: "Azhar, the Fallen Sun", a giant fiery bird-like creature with wings of flame and golden talons, too bright to look at',
};

const CURRENCY_DESC: Record<string, string> = {
  transmute: 'a small smooth pale-blue glass marble with a lighter blue centre',
  augment: 'a smooth deep-blue glass orb with a small silver cross shape set into its front',
  alteration: 'a light-blue glass orb with a thin copper wire wrapped around it in a spiral',
  regal: 'a polished gold metal orb with a small crown engraved on its front',
  alchemy: 'a clear glass orb half filled with golden liquid',
  scour: 'a rough matte grey stone ball with a round hole straight through the middle',
  chaos: 'a dark gold metal orb with a jagged, irregular pattern engraved over its surface',
  annul: 'a smooth white porcelain orb with a single thin crack across it',
  exalted: 'a pale gold metal orb with two small metal wings on its sides',
  divine: 'a cream-white stone orb with a simple four-pointed star engraved on its front',
  regret: 'a dull green glass orb with a dark green spiral line on its surface',
  expansion: 'a violet glass orb with three small round empty metal sockets set around its middle',
  instill: 'a clear glass orb filled with swirling orange liquid',
};

const MATERIAL_DESC: Record<string, string> = {
  gold: 'a small stack of five worn gold coins',
  copper_ore: 'a fist-sized lump of grey rock with bright orange-copper streaks',
  iron_ore: 'a fist-sized lump of dark grey rock with rusty red-brown streaks',
  mithril_ore: 'a fist-sized lump of grey rock with pale silver-blue metallic streaks',
  rough_gem: 'a rough, uncut pink-purple crystal, cloudy and uneven',
  ash_log: 'a short cut log with pale grey bark and a light cream cut end showing tree rings',
  oak_log: 'a short cut log with rough dark brown bark and a tan cut end showing tree rings',
  yew_log: 'a short cut log with thin reddish bark and a deep red-orange cut end showing tree rings',
  sunpetal: 'a single yellow flower with five wide petals and a short green stem',
  frostleaf: 'a single pale blue leaf with white frost along its edges',
  emberroot: 'a short twisted brown root, its broken ends glowing orange like coals',
  voidbloom: 'a single dark purple flower with a black centre and a short dark stem',
  arcane_dust: 'a small heap of fine lavender-coloured powder',
};

const FLASK_DESC: Record<string, string> = {
  life_small: 'a small round glass bottle with a cork, full of red liquid',
  life_medium: 'a medium round glass bottle with a cork, full of red liquid',
  life_grand: 'a tall glass bottle with a brass neck and cork, full of red liquid',
  mana_small: 'a small round glass bottle with a cork, full of blue liquid',
  mana_medium: 'a medium round glass bottle with a cork, full of blue liquid',
  granite: 'a squat bottle carved from grey stone, with a stone stopper',
  quicksilver: 'a slim glass bottle with a cork, full of shiny liquid silver',
  diamond: 'a clear cut-glass bottle with flat faces like a gem, with a glass stopper',
  ruby: 'a bottle of dark red cut glass with flat faces like a gem, with a gold stopper',
};

const ITEM_DESC: Record<string, string> = {
  rusted_sword: 'a short sword with a rusty brown blade, small nicks along the edge, and a plain leather-wrapped grip',
  whittled_dagger: 'a short iron dagger with a rough hand-carved wooden handle',
  driftwood_wand: 'a short crooked wand of pale grey driftwood, with a small blue spark at its tip',
  iron_blade: 'a plain straight iron longsword with a simple cross guard and a leather grip',
  glinting_dagger: 'a polished steel dagger with a bright blade and a black leather grip',
  war_axe: 'a one-handed war axe with a dark iron head shaped like a beard and a wooden handle',
  steel_broadsword: 'a wide straight steel sword with a brass cross guard and a brown leather grip',
  mithril_sabre: 'a curved sabre with a pale silver-blue blade and a simple silver hand guard',
  shadow_kris: 'a dagger with a wavy black steel blade and a purple-wrapped grip',
  rusty_hatchet: 'a small one-handed hatchet with a rusty iron head and a short wooden handle',
  reaver_axe: 'a large one-handed axe with a crescent dark steel blade and a red-wrapped handle',
  oak_club: 'a thick knobbly oak club, wider at the striking end, with a leather thong at the grip',
  spiked_mace: 'an iron mace with a round flanged head studded with short spikes',
  war_hammer: 'a heavy iron war hammer with a square head and a long iron-banded handle',
  short_bow: 'a small curved wooden bow with a plain string and a leather grip',
  ash_longbow: 'a tall pale ash longbow with a cloth-wrapped grip',
  yew_recurve: 'a dark yew recurve bow with curled tips and a brass-capped grip',
  bone_sceptre: 'a short sceptre carved from pale bone, topped with a small skull',
  crystal_sceptre: 'a silver sceptre topped with a glowing pale blue crystal',
  coral_wand: 'a short wand of branching pink coral with a pearl at its tip',
  void_wand: 'a black wand of twisted metal with a swirling purple light at its tip',
  gnarled_staff: 'a tall gnarled wooden staff with a knot of roots at the top',
  storm_staff: 'a tall dark iron staff topped with a cage holding a crackling blue spark',
  plank_shield: 'a square shield made of four rough wooden planks held together with iron nails, one corner split',
  buckler: 'a small round wooden shield covered in tan hide, with an iron rim',
  kite_shield: 'a tall grey iron shield, rounded at the top and pointed at the bottom, plain with no emblem',
  tower_shield: 'a tall rectangular shield of pale silver-blue metal with a raised rim',
  spirit_shield: 'a small round shield of grey bleached driftwood with a pale blue spiral painted on its face',
  runic_ward: 'a narrow kite shield of dark blue-black wood inlaid with thin glowing blue runes along the rim',
  iron_hat: 'a simple round iron cap with a few dents',
  leather_cap: 'a worn brown leather cap with stitched seams',
  soldier_helm: 'a steel helmet with a straight nose guard',
  hunter_hood: 'a dark green cloth hood with a short cape',
  great_helm: 'a full closed helmet of pale silver-blue metal with a narrow eye slit',
  shadow_mask: 'a black cloth face mask covering the lower face, with a thin silver edge',
  linen_hood: 'a plain off-white linen hood',
  conjurer_hat: 'a tall pointed dark blue cloth hat with a wide brim',
  arcanist_cowl: 'a deep purple hood trimmed with gold thread, a small violet gem at the brow',
  chaplain_helm: 'a rounded gold-trimmed helmet with a white cloth veil at the back',
  templar_crown: 'a gilded closed helmet with small golden wings at the sides',
  wayfarer_hood: 'a dark green travelling hood with a leather brim',
  duskweave_cowl: 'a deep purple cowl with a dark metal face guard',
  riveted_coif: 'a brown leather hood reinforced with rows of small iron rivets',
  wyrmscale_helm: 'a dark iron helmet covered in overlapping red-edged scales',
  plate_vest: 'a dented grey iron breastplate with leather straps',
  shabby_jerkin: 'a sleeveless brown leather vest with patches and uneven stitching',
  chainmail: 'a long-sleeved shirt of grey iron chain links',
  scale_leather: 'a brown leather vest covered in small overlapping iron scales',
  mithril_plate: 'a clean breastplate of pale silver-blue metal',
  assassin_garb: 'a fitted black leather coat with a high collar and plain silver buckles',
  simple_robe: 'a plain undyed cloth robe tied with a rope belt',
  silken_vestment: 'a long dark blue silk robe with a gold-trimmed collar',
  arcanist_robe: 'a long deep purple robe with gold embroidery and a violet gem clasp',
  chaplain_tabard: 'a white cloth tabard with gold trim worn over light mail',
  templar_plate: 'an ornate gilded breastplate with a white sun emblem',
  wayfarer_coat: 'a dark leather travelling coat with a green cloth mantle',
  duskweave_raiment: 'a fitted purple and black coat embroidered with faint violet runes',
  studded_brigandine: 'a brown leather coat studded with iron rivets, with small iron shoulder plates',
  wyrmscale_hauberk: 'a dark coat of overlapping iron scales with red cloth showing at the seams',
  iron_gauntlets: 'a pair of grey iron gauntlets with jointed fingers',
  rawhide_gloves: 'a pair of rough tan rawhide gloves',
  steel_gauntlets: 'a pair of polished steel gauntlets with jointed fingers',
  stealth_gloves: 'a pair of thin, close-fitting black leather gloves',
  wool_gloves: 'a pair of plain brown wool gloves',
  silk_gloves: 'a pair of long purple silk gloves with gold cuffs',
  chaplain_gloves: 'a pair of white cloth gloves with gold-plated knuckles',
  templar_gauntlets: 'a pair of gilded gauntlets with jointed fingers',
  wayfarer_wraps: 'a pair of dark leather hand wraps with green cloth bands',
  duskweave_gloves: 'a pair of slim purple gloves with dark metal cuffs',
  studded_bracers: 'a pair of brown leather gloves with iron-studded cuffs',
  wyrmscale_gauntlets: 'a pair of dark scaled gauntlets with red leather lining',
  iron_greaves: 'a pair of grey iron armoured boots',
  leather_boots: 'a pair of worn brown leather boots',
  steel_greaves: 'a pair of polished steel armoured boots',
  shagreen_boots: 'a pair of soft grey leather boots with a fine pebbled texture',
  wool_shoes: 'a pair of soft undyed wool shoes',
  silk_slippers: 'a pair of dark blue silk slippers with gold stitching',
  chaplain_boots: 'a pair of white cloth boots with gold-plated shins',
  templar_sabatons: 'a pair of gilded armoured boots',
  wayfarer_boots: 'a pair of worn dark leather travelling boots',
  duskweave_boots: 'a pair of soft purple boots with dark metal trim',
  studded_boots: 'a pair of brown leather boots with iron studs over the shins',
  wyrmscale_boots: 'a pair of dark scaled boots with red leather trim',
  chain_belt: 'a belt made of grey iron chain links with a simple hook clasp',
  leather_belt: 'a plain brown leather belt with a brass buckle',
  heavy_belt: 'a thick dark leather belt with rows of iron studs and an iron buckle',
  coral_amulet: 'a necklace on a thin cord with a small polished red coral pendant',
  amber_amulet: 'a necklace on a thin gold chain with a small oval amber pendant',
  jade_amulet: 'a necklace on a thin cord with a small carved green jade pendant',
  onyx_amulet: 'a necklace on a thin silver chain with a small black onyx pendant',
  iron_ring: 'a plain dark iron ring',
  ruby_ring: 'a gold ring with one small red ruby',
  sapphire_ring: 'a silver ring with one small blue sapphire',
  topaz_ring: 'a gold ring with one small yellow topaz',
  diamond_ring: 'a white-gold ring with one small clear diamond',
};

const UNIQUE_DESC: Record<string, string> = {
  miners_lament: "an old iron miner's helmet with a small brass lantern on the front, its glass cracked",
  bloodthirst: 'a rusty short sword with dark red blood running down the blade, a red cloth wrapped around the grip',
  emberheart: 'a grey iron breastplate with one round orange glowing coal set in the centre of the chest',
  windstep: 'a pair of light brown leather boots with small white feathers tied at the ankles',
  alchemists_band: 'a thick iron ring with a tiny glass vial of green liquid set into it in place of a stone',
  iron_bulwark: 'a very large, thick iron kite shield covered in rows of big rivets, scratched and dented from use',
  starforged_edge: 'a curved sabre with a dark blue-black blade speckled with tiny white dots like stars, and a silver guard',
  titans_girth: 'a huge thick leather belt with iron studs and a buckle made from a small horned skull',
  sunmane_pelt: 'a scale-armour coat with a thick lion mane of orange-red fur around the shoulders',
  mirage_veil: 'a dark hooded cowl with a thin veil of shimmering see-through silk over the face opening',
  khans_tithe: 'a heavy gold ring set with a square diamond, a tiny coin stamped into each side of the band',
  kurgan_crown: 'an ancient bronze helmet-crown with small horse heads around the rim, green with age',
  stormrider_greaves: 'a pair of scale boots with grey feathers at the top and a thin blue lightning line down each side',
  pyre_heart: 'a black onyx pendant shaped like a heart with a small flame burning inside it',
};

const ATTR_GEM = { str: 'red', dex: 'green', int: 'blue' } as const;

const GEM_SYMBOL: Record<string, string> = {
  heavy_strike: 'a hammer', ground_slam: 'a cracked line', iron_guard: 'a shield', war_cry: 'an open mouth',
  twin_strike: 'two crossed blades', poison_dart: 'a dart', smoke_step: 'a puff cloud', lacerate: 'three claw marks',
  spark: 'a zigzag lightning bolt', fireball: 'a flame', frost_ward: 'a snowflake', arcane_siphon: 'a spiral',
  pummel: 'a clenched fist', berserk: 'a pair of crossed axes', parry: 'a sword held sideways', judgement_hammer: 'a hammer with a lightning bolt',
  infernal_blow: 'a fist inside a flame', barrage: 'three parallel arrows', rain_of_arrows: 'arrows pointing down',
  feint: 'a curved arrow turning back', backstab: 'a dagger pointing down', ice_shot: 'an arrow with a snowflake tip',
  glacial_lance: 'a long ice spear', meditate: 'a closed eye', shock_nova: 'a ring of short lightning bolts',
  consecrate: 'a sun over a flat line', frost_needle: 'three thin needles',
};

export interface ArtEntry {
  key: string;
  group: ArtGroup;
  name: string;
  /** what the picture shows */
  desc: string;
  /** the subject line for a single image (desc wrapped in the group's template) */
  prompt: string;
}

function entry(group: ArtGroup, id: string, name: string, desc: string): ArtEntry {
  const tpl = ART_GROUPS[group].template;
  return { key: `${group}/${id}`, group, name, desc, prompt: tpl ? tpl(desc) : desc };
}

/** The look every image shares; opens every copy-paste prompt. */
export const ART_STYLE =
  'Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. ' +
  'Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. ' +
  'Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. ' +
  'Show only what is described below, nothing extra.\n\n' +
  'Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, ' +
  'lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.';

/** Small icons are generated nine at a time on a 3×3 sprite sheet, then sliced apart by `npm run art`. */
export const SHEET_GRID = 3;
export const SHEET_GROUPS: Partial<Record<ArtGroup, string>> = {
  currency: 'Each icon is a single small orb, about the size of a plum.',
  materials: 'Each icon is a single crafting material.',
  flasks: 'Each icon is a single bottle, standing upright, seen from the front.',
  items: 'Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.',
  uniques: 'Each icon is a single rare item: well made and distinctive, but not overdecorated.',
  gems: 'Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.',
};

export interface ArtSheet {
  /** file name without extension, e.g. `currency_1` */
  id: string;
  group: ArtGroup;
  /** fills the grid left to right, top to bottom */
  entries: ArtEntry[];
}

/** Sprite sheets for the icon groups, nine entries each, in manifest order. */
export function artSheets(manifest = artManifest()): ArtSheet[] {
  const per = SHEET_GRID * SHEET_GRID;
  const out: ArtSheet[] = [];
  for (const group of Object.keys(SHEET_GROUPS) as ArtGroup[]) {
    const list = manifest.filter((e) => e.group === group);
    for (let i = 0; i < list.length; i += per) out.push({ id: `${group}_${i / per + 1}`, group, entries: list.slice(i, i + per) });
  }
  return out;
}

export function artManifest(): ArtEntry[] {
  const out: ArtEntry[] = [];
  for (const [key, desc] of Object.entries(FIXED)) {
    const [group, id] = key.split('/') as [ArtGroup, string];
    out.push(entry(group, id, id, desc));
  }
  for (const st of STATIONS) out.push(entry('stations', st.id, st.name, STATION_DESC[st.id] ?? st.desc));
  for (const z of ZONES) out.push(entry('zones', z.id, z.name, ZONE_DESC[z.id] ?? z.desc));
  for (const z of ZONES)
    for (const m of [...z.monsters, z.boss]) out.push(entry('monsters', m.id, m.name, MONSTER_DESC[m.id] ?? m.name));
  for (const c of CURRENCIES) out.push(entry('currency', c.id, c.name, CURRENCY_DESC[c.id] ?? c.name));
  for (const m of MATERIALS) out.push(entry('materials', m.id, m.name, MATERIAL_DESC[m.id] ?? m.name));
  for (const f of FLASKS) out.push(entry('flasks', f.id, f.name, FLASK_DESC[f.id] ?? f.name));
  for (const b of BASES) out.push(entry('items', b.id, b.name, ITEM_DESC[b.id] ?? b.name));
  for (const u of UNIQUES) out.push(entry('uniques', u.id, u.name, UNIQUE_DESC[u.id] ?? u.name));
  for (const g of ACTIVE_GEMS) out.push(entry('gems', g.id, g.name, `a rounded ${ATTR_GEM[g.attr]} gemstone with a simple pale symbol of ${GEM_SYMBOL[g.id] ?? 'a dot'} inside`));
  for (const g of SUPPORT_GEMS)
    out.push(entry('gems', g.id, `${g.name} (support)`, `a small flat hexagonal ${ATTR_GEM[g.attr]} gemstone with a plain pale dot in the centre`));
  return out;
}
