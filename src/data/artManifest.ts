/**
 * Every picture the game can show, with the prompt used to generate it.
 * Single source of truth for `npm run art` (import + resize) and docs/ART_PROMPTS.md.
 * Keys are paths inside src/assets/art without an extension, e.g. `currency/chaos`.
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
  portraits: { title: 'Portraits — trader, guide, classes', priority: 1, size: [384, 384], format: '1024×1024 square, chest-up portrait, dark vignette background.' },
  scenes: { title: 'Scenes — title screen and hideout backdrop', priority: 1, size: [1600, 914], format: 'Wide landscape 1792×1024, environment only, no characters, darker towards the bottom so text stays readable.' },
  stations: { title: 'Hideout stations', priority: 2, size: [480, 480], format: '1024×1024, single object on a dark cave-floor background, three-quarter view.' },
  zones: { title: 'Area banners', priority: 2, size: [1200, 686], format: 'Wide landscape 1792×1024, environment only, no characters.' },
  monsters: { title: 'Monsters', priority: 3, size: [256, 256], format: '1024×1024, creature portrait, head and shoulders, dark background.' },
  currency: {
    title: 'Currency orbs', priority: 3, size: [160, 160], format: '1024×1024, transparent background, one object centred like an inventory icon.',
    template: (d) => `An inventory icon of ${d}, centred, transparent background.`,
  },
  materials: {
    title: 'Materials', priority: 4, size: [128, 128], format: '1024×1024, transparent background, inventory icon.',
    template: (d) => `An inventory icon of ${d}, centred, transparent background.`,
  },
  flasks: {
    title: 'Flasks', priority: 4, size: [160, 160], format: '1024×1024, transparent background, a single glass flask, upright.',
    template: (d) => `An inventory icon of ${d}, upright, centred, transparent background.`,
  },
  items: {
    title: 'Item bases', priority: 5, size: [160, 160], format: '1024×1024, transparent background, a single item laid flat or upright like a Diablo inventory icon.',
    template: (d) => `An inventory icon of ${d}, centred, transparent background.`,
  },
  uniques: {
    title: 'Unique items', priority: 5, size: [160, 160], format: '1024×1024, transparent background, an ornate legendary version of the item with a faint orange glow.',
    template: (d) => `An inventory icon of a legendary ${d}, faint orange magical glow, centred, transparent background.`,
  },
  gems: {
    title: 'Skill gems', priority: 6, size: [128, 128], format: '1024×1024, transparent background, a cut gemstone with a glowing symbol inside it.',
    template: (d) => `An inventory icon of a faceted ${d}, centred, transparent background.`,
  },
};

const FIXED: Record<string, string> = {
  'portraits/trader': 'A wandering merchant in his fifties, weathered face, sly half-smile, hooded travel cloak covered in pouches, a lantern hanging beside him, coins and trinkets on a crate in front of him, cave hideout in the background.',
  'portraits/brannoc': '"Old Brannoc", a hunched elderly survivor with a scarred face and a grey braided beard, wrapped in a patched fur cloak, sitting by a small fire in a seaside cliff cave, kind but tired eyes.',
  'portraits/class_warrior': 'A battle-worn warrior in dented iron plate, rusted sword over the shoulder, red cloth tabard, determined stare, stormy shoreline behind.',
  'portraits/class_ranger': 'A lean ranger in dark leather armour and a green hood, twin daggers, alert and poised, misty marsh reeds behind.',
  'portraits/class_mage': 'A young mage in a worn blue robe holding a crooked driftwood wand crackling with blue lightning, intense eyes lit by the spark, ruined stone archway behind.',
  'scenes/title': 'A grim storm-lashed coastline at night, a lone figure-sized gap of firelight in a cliff cave above the tide, shipwrecks in the surf, distant ruined towers, rain and embers in the air.',
  'scenes/hideout': 'Inside a large seaside cliff cave turned into a camp: rough stone walls, a central fire pit, hanging lanterns, crates and furs, a glimpse of the night sea through the cave mouth.',
};

const STATION_DESC: Record<string, string> = {
  map_device: 'An ancient stone ring device with glowing purple runes and a swirling portal in its centre, set into a cave floor.',
  stash: 'A heavy iron-banded wooden chest overflowing with gold coins, glowing orbs and gear, padlock hanging open.',
  forge: 'A dwarven stone forge with glowing coals, an anvil, hammer and tongs, sparks flying.',
  alchemy_table: 'A cluttered alchemy table with bubbling glass flasks in red, blue and purple, herbs drying overhead, a small brazier underneath.',
  bench: "A sturdy crafting workbench with clamps, a jeweller's loupe, scattered gemstones and a few glowing currency orbs.",
  vendor: 'A small merchant stall made of crates and a patched canvas awning, lanterns, goods hanging from hooks.',
};

const ZONE_DESC: Record<string, string> = {
  mudflats: 'Grey tidal mud flats at dusk, broken shipwreck ribs, pools of dark water, drowned corpses half-buried, distant cliffs.',
  brinecaves: 'Dripping sea caves lit by pale green bioluminescence, tide pools, salt crusted rock, a wrecked rowing boat.',
  ashwood: 'A burned forest still smouldering, black trunks, glowing embers in the undergrowth, orange haze.',
  blackreed: 'A dark marsh of towering black reeds, still green water, fog, a crooked hut on stilts in the distance.',
  crypt: 'A flooded underground crypt, ankle-deep cold water, stone sarcophagi, pale blue light through cracks.',
  shipgrave: 'A grey bay choked with rotting shipwrecks piled on each other, broken masts, gulls, a stormy sky.',
  stormcliffs: 'Sheer black sea cliffs in a violent storm, lightning striking the rocks, crashing waves far below.',
  sanctum: 'A sunken cathedral underwater, broken stained glass, coral growing over pews, a throne of shells at the far end, shafts of blue light.',
};

const MONSTER_DESC: Record<string, string> = {
  rat: 'a drowned rat, bloated and dripping, glowing pale eyes',
  crab: 'a large mud-caked crab with a cracked shell and one oversized claw',
  zombie: 'a waterlogged corpse rising from the mud, seaweed in its hair',
  wisp: 'a crackling yellow bog wisp, a ball of lightning with a faint face',
  gorger: 'BOSS — a huge bloated swamp creature with a gaping toothy maw and barnacled skin',
  crawler: 'a pale eyeless cave crawler, a many-legged insect with slick wet plates',
  brinebat: 'a salt-encrusted bat with torn wings and needle teeth',
  sailor: 'a drowned sailor in a rotting striped shirt, rope still around his neck',
  siren: 'a gaunt salt siren with grey scaled skin and frost on her lips, mouth open in a song',
  harrow: 'BOSS — "Captain Harrow", a drowned ship captain in a ragged tricorn and greatcoat, a lantern of green fire on his belt',
  cinderhound: 'a skeletal hound wreathed in embers, smoke pouring from its jaws',
  treant: 'a charred walking tree, cracks in its bark glowing orange',
  harpy: 'a ragged harpy with ash-grey feathers and burning eyes',
  emberkin: 'a small hunched fire shaman with a bone mask and a smoking staff',
  pyre: 'BOSS — "Pyre-Mother Ulva", a towering witch of living flame crowned with burning antlers',
  lurker: 'a hulking bog lurker covered in moss and mud, only its yellow eyes and jaws visible',
  stalker: 'a thin reed stalker, a lanky humanoid woven from black reeds with a bone spear',
  toad: 'a huge sickly plague toad with frost-blue boils and a dripping tongue',
  fenwitch: 'a fen witch with a crown of reeds and crackling lightning in her hands',
  sedge: 'BOSS — "Old Mother Sedge", an ancient hag grown into the marsh, roots for legs, lightning in her eyes',
  ghoul: 'a gaunt crypt ghoul with long claws, pale wet skin',
  frostwraith: 'a hooded frost wraith, icy mist trailing from its empty robes',
  skeleton: 'a skeletal warden in rusted tomb armour holding a halberd',
  lich: 'a drowned lich in waterlogged robes, a glowing blue phylactery at its chest',
  tidecaller: 'BOSS — "Tidecaller Morvane", a corrupted sea priestess with a coral crown, water swirling around her',
  brute: 'a hulking barnacle-covered brute with an anchor for a weapon',
  gunner: 'a drowned ship gunner holding a smoking hand cannon, burning fuse in his teeth',
  gulls: 'a screaming swarm of scraggy black-eyed gulls',
  wreckshaman: 'a wreck shaman wearing a ship figurehead as a mask, lightning arcing from a driftwood staff',
  vosk: 'BOSS — "Admiral Vosk", a bloated drowned admiral in a waterlogged naval coat covered in medals, flintlock and cutlass',
  ravager: 'a cliff ravager, a lean grey beast with hooked claws for climbing rock',
  galeborn: 'a galeborn spirit, a humanoid made of whirling wind and lightning',
  rockback: 'a giant crab with a boulder grown into its shell',
  stormcaller: 'a storm caller in a soaked hooded robe, holding a staff that crackles with lightning',
  skarra: 'BOSS — "Skarra, Queen of Gales", a huge harpy queen with storm-grey wings and a crown of lightning',
  zealot: 'a tidebound zealot in a drowned monk habit, chains and frost around his fists',
  eel: 'an abyssal eel, long and black with glowing blue electric markings',
  coralgolem: 'a coral golem, a lumbering figure of pink and white coral with a glowing core',
  priest: 'a sanctum priest with a cracked mitre and a frozen censer',
  ysolde: 'BOSS — "Ysolde, the Drowned Queen", a regal drowned queen with pale blue skin, a crown of shells and pearls, hair floating as if underwater, lightning in her hands',
};

const CURRENCY_DESC: Record<string, string> = {
  transmute: 'a small pale-blue glass orb with a swirling inner light',
  augment: 'a deep blue orb with a silver plus-shaped rune',
  alteration: 'a light-blue orb wrapped in a thin bronze spiral',
  regal: 'a gold orb with a tiny crown etched on it',
  alchemy: 'a golden orb filled with bubbling liquid',
  scour: 'a matte white-grey stone orb with a hole through the middle',
  chaos: 'a dark gold orb with a chaotic swirling sigil',
  annul: 'a cracked pure-white orb leaking faint light',
  exalted: 'a radiant pale-gold orb with small wings',
  divine: 'a cream-white orb glowing with holy light rays',
  regret: 'a muted green orb with a faint backwards-spiral rune',
  expansion: 'a violet orb with three small sockets around its rim',
  instill: 'a glowing orange orb with liquid fire swirling inside',
};

const MATERIAL_DESC: Record<string, string> = {
  gold: 'a small stack of old gold coins',
  copper_ore: 'a chunk of raw copper ore',
  iron_ore: 'a chunk of dark grey iron ore',
  mithril_ore: 'a chunk of pale cyan metallic mithril ore',
  rough_gem: 'an uncut magenta gemstone',
  ash_log: 'a pale ash wood log',
  oak_log: 'a sturdy brown oak log',
  yew_log: 'a dark red-brown yew log',
  sunpetal: 'a bright yellow sunpetal flower',
  frostleaf: 'an icy blue frosted leaf',
  emberroot: 'a gnarled root glowing orange at the tips',
  voidbloom: 'a purple flower with a black void-like centre',
  arcane_dust: 'a small pile of glittering lavender dust',
};

const FLASK_DESC: Record<string, string> = {
  life_small: 'a small round flask of glowing red liquid',
  life_medium: 'a larger round flask of glowing red liquid',
  life_grand: 'a tall ornate flask of glowing red liquid with brass fittings',
  mana_small: 'a small flask of glowing blue liquid',
  mana_medium: 'a larger flask of glowing blue liquid',
  granite: 'a stone-grey flask with a rock texture',
  quicksilver: 'a flask of swirling liquid silver',
  diamond: 'a crystal-clear flask full of sparkles',
  ruby: 'a deep-red faceted gem-like flask',
};

const ITEM_DESC: Record<string, string> = {
  rusted_sword: 'a rusted, notched short sword',
  whittled_dagger: 'a crude whittled wooden-handled dagger',
  driftwood_wand: 'a crooked driftwood wand with a sparking tip',
  iron_blade: 'a plain iron longsword',
  glinting_dagger: 'a polished steel dagger that glints',
  war_axe: 'a heavy bearded war axe',
  steel_broadsword: 'a broad steel sword with a leather grip',
  mithril_sabre: 'a curved pale-blue mithril sabre',
  plank_shield: 'a splintered wooden plank shield',
  buckler: 'a small round goathide buckler',
  kite_shield: 'an iron kite shield',
  tower_shield: 'a tall pale-blue mithril tower shield',
  iron_hat: 'a simple dented iron cap',
  leather_cap: 'a worn leather cap',
  soldier_helm: 'a steel soldier helmet with a nose guard',
  hunter_hood: 'a dark green hunter hood',
  great_helm: 'a heavy mithril great helm with a visor',
  shadow_mask: 'a black cloth mask with silver trim',
  plate_vest: 'a battered iron plate vest',
  shabby_jerkin: 'a shabby patched leather jerkin',
  chainmail: 'a chainmail hauberk',
  scale_leather: 'scale-reinforced leather armour',
  mithril_plate: 'a gleaming mithril breastplate',
  assassin_garb: "a sleek black assassin's coat",
  iron_gauntlets: 'a pair of iron gauntlets',
  rawhide_gloves: 'a pair of rawhide gloves',
  steel_gauntlets: 'a pair of polished steel gauntlets',
  stealth_gloves: 'a pair of thin black leather gloves',
  iron_greaves: 'a pair of iron greaves',
  leather_boots: 'a pair of worn leather boots',
  steel_greaves: 'a pair of steel greaves',
  shagreen_boots: 'a pair of supple grey shagreen boots',
  chain_belt: 'a belt made of iron chain links',
  leather_belt: 'a plain leather belt with a brass buckle',
  heavy_belt: 'a thick heavy belt with iron studs',
  coral_amulet: 'an amulet with a red coral pendant',
  amber_amulet: 'an amulet with an amber pendant',
  jade_amulet: 'an amulet with a jade pendant',
  onyx_amulet: 'an amulet with a black onyx pendant',
  iron_ring: 'a plain iron ring',
  ruby_ring: 'a gold ring set with a ruby',
  sapphire_ring: 'a silver ring set with a sapphire',
  topaz_ring: 'a gold ring set with a yellow topaz',
  diamond_ring: 'a platinum ring set with a diamond',
};

const UNIQUE_DESC: Record<string, string> = {
  miners_lament: "iron miner's helmet with a cracked lantern, called Miner's Lament",
  bloodthirst: 'rusted sword dripping blood, called Bloodthirst',
  emberheart: 'iron breastplate with a glowing ember set in the chest, called Emberheart',
  windstep: 'pair of leather boots with swirling wind around them, called Windstep',
  alchemists_band: "iron ring set with a tiny bubbling vial, called Alchemist's Band",
  iron_bulwark: 'massive riveted iron kite shield, called The Iron Bulwark',
  starforged_edge: 'mithril sabre with stars glittering in the blade, called Starforged Edge',
  titans_girth: "enormous studded belt with a giant's skull buckle, called Titan's Girth",
};

const ATTR_GEM = { str: 'red ruby', dex: 'green emerald', int: 'blue sapphire' } as const;

const GEM_SYMBOL: Record<string, string> = {
  heavy_strike: 'a hammer', ground_slam: 'a cracked ground shockwave', iron_guard: 'a shield', war_cry: 'a roaring mouth',
  twin_strike: 'two crossed blades', poison_dart: 'a green dart', smoke_step: 'a puff of smoke', lacerate: 'claw slashes',
  spark: 'a lightning spark', fireball: 'a fireball', frost_ward: 'a snowflake', arcane_siphon: 'a swirling vortex',
};

export interface ArtEntry {
  key: string;
  group: ArtGroup;
  name: string;
  /** the full line to paste after the style block */
  prompt: string;
}

function entry(group: ArtGroup, id: string, name: string, desc: string): ArtEntry {
  const tpl = ART_GROUPS[group].template;
  return { key: `${group}/${id}`, group, name, prompt: tpl ? tpl(desc) : desc };
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
  for (const g of ACTIVE_GEMS) out.push(entry('gems', g.id, g.name, `${ATTR_GEM[g.attr]} gem with ${GEM_SYMBOL[g.id] ?? 'a glowing rune'} glowing inside`));
  for (const g of SUPPORT_GEMS)
    out.push(entry('gems', g.id, `${g.name} (support)`, `small ${ATTR_GEM[g.attr]} support gem, hexagonal cut, with a faint glowing rune for "${g.name}" inside`));
  return out;
}
