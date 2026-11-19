# Veyrath detailed story-map proposal

Ocean revision (2026-11-19): `src/assets/maps/veyrath-world-bound-sea.webp` is the current runtime atlas. The built-in image edit replaces pale cloud-like seas with deep slate water, engraved rough waves and looping offshore currents. Sparse ships with returning wakes suggest the psychological limit without exposing its mechanism. Existing map geometry, land-label positions, act navigation and unlock fog are retained. Source and exact prompt: `output/imagegen/veyrath-world-bound-sea.png` and `veyrath-world-bound-sea-prompt.md`; prior paintings remain available. Updated native fogged/explored previews inspected; no live browser acceptance claimed.

Navigation revision (2026-11-19): larger readable parchment act banners sit within their regions, and the atlas fills the desktop center column. Shared territory paths drive subtle warm hover/focus highlighting and textured fog over unreached acts. Existing per-character zone unlocks/boss defeats reveal acts automatically and persist through ordinary saves; legacy finale progress is recognized. Native fogged/explored previews are under `output/playtest/world-map-{fog,explored}-preview.png`. Browser visual acceptance remains pending due to a blank local page.

Latest runtime revision (2026-11-19): `src/assets/maps/veyrath-world-flat-ink.webp` removes the remaining baked-in pale clearings behind place captions. Terrain detail now continues beneath the ink lettering. This supersedes the earlier tiny-clearing instruction. Earlier paintings are retained. Built-in image edit source and exact prompt: `output/imagegen/veyrath-world-flat-ink.png` and `veyrath-world-flat-ink-prompt.md`. Updated native map preview inspected; live browser acceptance remains outstanding.

Latest runtime lettering (2026-11-18): `src/assets/maps/veyrath-world-subtle.webp` supersedes the more prominent handwriting revision below. Owner wants place names almost unnoticeable until examined, with no bloom/backing and only a tiny clearing of terrain immediately around the words. Act labels retain a distinct readable navigation role away from settlements; Act 4's ribbon moved into the southern territory. Source and exact edit prompt: `output/imagegen/veyrath-world-subtle-lettering.png` and `veyrath-world-subtle-lettering-prompt.md`. Desktop/390px phone checks confirm working regional navigation and no console errors; selectable act-map labels have no shadow/filter/background.

Last updated 2026-11-18. Working names and geographic placements created for the owner's detailed Veyrath map, subsequently authorized for game integration. Reference coastline: `output/imagegen/veyrath-standalone-atlas-v1.png`.

Game integration: arrow-free country atlas `src/assets/maps/veyrath-world.webp`, with seven chapter scopes and numbered navigation. Regional art `src/assets/maps/veyrath-act-1.webp` through `veyrath-act-7.webp` is connected to the redistributed 70 zones (8/8/8/10/12/12/12). Source artwork and generation prompts are under `output/imagegen/`; the regional batch uses `veyrath-act-maps-prompts.md`. Settlements not required by the campaign remain background geography. Desktop and 390px phone browser acceptance passed 2026-11-18: opening journal/combat, all seven chapter navigation, expanded road/Greyford markers, world atlas and final-act phone scrolling. Screenshots under `output/playtest/seven-act-*`; detailed verification is tracked in MILESTONES. A full campaign pacing audit remains separate.

Current art decision (2026-11-18): owner explicitly approved the earlier seven-image batch for use as **placeholder act maps** and stopped the Act 1 redraw experiment. All seven runtime paintings above remain assigned to their respective act close-ups. Structural flaws remain future art work, not a reason to withhold the placeholders. `wreck-coast-pilot-layout.svg`, its PNG and `wreck-coast-pilot-ink-proof.png` remain review experiments only and are not used by the game.

World-map lettering revision (2026-11-18): owner requested that city/settlement names look more written onto the map, and asked for thin one-line act banners and a better research-act name. Edited the world painting with the built-in image tool for quill-style place lettering, preserving the working geography and label placements on visual inspection. Current runtime artwork is `src/assets/maps/veyrath-world-lettered.webp`; the previous `veyrath-world.webp` is retained. Source and exact prompt: `output/imagegen/veyrath-world-handlettered.png` and `veyrath-world-handlettered-prompt.md`. Act 5 is now **Cairnwatch Institute**. All seven ribbons use one-line titles; selectable act-map names use sepia italic ink styling.

Rendered artwork: `output/imagegen/veyrath-detailed-story-map-v1.png`. Exact built-in image-generation prompt saved alongside as `veyrath-detailed-story-map-v1-prompt.md`. Visually inspected for named sites, route connections, major terrain and readable labels. Features use illustrative cartographic symbols rather than literal building scale.

Earlier revision: `output/imagegen/veyrath-detailed-story-map-v2.png`, with exact prompt alongside. Owner found v1 too artificial, specifically its settlements and farmland. V2 replaces large scenic building clusters with small overhead settlement plans and removes the pervasive field grid, leaving sparse irregular field remnants and quieter open country. Maintained Ration Fields remain near the capital. Owner subsequently rejected the simplified city treatment.

Ink redraw: `output/imagegen/veyrath-detailed-story-map-v3-ink.png`, with exact prompt alongside. Redraw of v1's detailed settlements using the owner's raw ink-and-quill template: cross-hatched mountains, jagged coasts, hand-lettered labels, crowded pen-drawn towns and torn aged parchment. Repetitive crop-field coverage is not restored.

Architecture correction: `output/imagegen/veyrath-detailed-story-map-v4-ink.png`, with exact prompt alongside. Owner identified buildings fusing into terrain at Harrowgate. Reworked that cluster into separate ruined masonry buildings, a gate and clear ground between structures. Removed red annotation and retained the ink style and named geography.

Muted atlas revision: `output/imagegen/veyrath-detailed-story-map-v5-atlas.png`, with exact prompt alongside. Owner liked the ink map's fullness but requested the older style; interpreted as the muted earlier atlas. Retains dense settlements, natural detail, roads and the repaired Harrowgate architecture, with ivory paper, fine engraving, pale blue seas and muted land washes. Crop-field repetition remains removed.

Scale/material revision: `output/imagegen/veyrath-detailed-story-map-v6-atlas.png`, with exact prompt alongside. Reduced settlement, institute, fort and harbor vignettes relative to country geography, preserving city/village hierarchy and readable labels. Introduced more varied paper/ink/watercolor marks and terrain variation following the requested article's artistic suggestions. Settlements remain illustrative symbols rather than a measured scale survey.

Latest revision: `output/imagegen/veyrath-detailed-story-map-v7-capital.png`, with exact prompt alongside. Owner requested Caer Veyr be grand and lavish, with residents living relatively well. The capital now has an imposing compact citadel, intact walls, denser prosperous districts, a formal courtyard/garden and restrained gilded accents. Maintains the contrast with outlying hardship and the established compulsory field labour. Visually inspected; artwork only, awaiting owner's review.

## Main story locations

| Working name | Place and story role |
|---|---|
| Wreck Coast | Southwestern salvage shore where the player washes up; reefs, wrecks and poor coastal communities. |
| Brinewick | Starting coastal settlement; home to Winnie's refuge and dependent on salvage and irregular district food deliveries. |
| Winnie's Refuge | Crowded former inn inside Brinewick, with communal kitchen, courtyard and stolen goods stored beneath. |
| Wayfarer's Post | Proposed road-junction outpost in the early supply-road stretch; specific establishment work remains undesigned. |
| Greyford | First larger functioning market town, at a river crossing; the player just misses the capital's representative. |
| Harrowgate | Much larger established city overtaken by the Creep but still inhabited, between Greyford and the onward delivery destination. |
| Eastmere | Proposed delivery destination on the southern shore of the great bay; reached by a land road through Harrowgate and around the bay's western end. |
| Cairnwatch Institute | Mountain research facility in a northern valley, reached by a branch road from the central lowlands. |
| Caer Veyr | Working name for the northeastern coastal capital; reached from the institute via mountain passes. |
| Ration Fields | Small intensively maintained growing grounds inland of the capital, kept productive by compulsory guarded labour. |
| The First Seal | Working name for the buried containment beneath Caer Veyr, where the player finds the First Exile. A below-city callout, not a separate surface site. |

Main journey: Wreck Coast / Brinewick → supply roads / Wayfarer's Post → Greyford → Harrowgate → onward delivery toward Eastmere → mountain investigation at Cairnwatch Institute → Caer Veyr → containment beneath the capital. The exact timing of the delivery and mountain lead remains open. This is a geographic proposal, not a newly mandated sequence of gameplay gates.

## Peripheral places

These add a wider inhabited geography without assigning new campaign obligations, side quests, friend characters or rewards.

| Working name | Place |
|---|---|
| Saltmere | Remote northwestern estuary settlement associated with fishing and salt. |
| Whitecrown Glacier | Snow and glacier terrain in the northwestern mountain heights. |
| Hollow Quarry | Abandoned stone workings and a broken haul road in the western foothills. |
| Blackfen | Southwestern wetland with drowned lanes and a derelict hamlet. |
| Gallowswood | Southern woodland belt, with disused charcoal workings and minor trails. |
| Southwatch | Old watchfort and small settlement toward the southeastern end of the southern arm. |
| Saint's Rest | Isolated ruined sanctuary on an island inside the eastern bay. |
| The Inner Reach | Working geographic name for the large east-facing bay. |

## Cartographic direction

### Structural correction after rejected AI-looking act art — 2026-11-18

Owner reports widespread melded forms and logically nonsensical objects in the generated maps. Earlier material/style revisions did not solve those construction problems. Do not treat the existing paintings as visually accepted, or interpret the passing game tests as art approval. No runtime artwork is replaced by this research note.

Research-based working method:

1. Establish a plain layout first: coast, ridge/valley structure, drainage, settlement footprints, gates and connected routes. A usable line drawing must work before texture or colour. Keep the known Veyrath silhouette and story relationships; do not silently redesign them to accommodate generation errors.
2. Trace water through valleys to an outlet; distinguish ordinary tributaries from deliberate distributaries, canals or magical exceptions. Check bridge landings, road approaches and passes individually.
3. Plan architecture as separate footprints and street space before drawing roofs, walls and ornament. Use one consistent projection within each map. A building must have readable walls, openings and a foundation; a wall, road or roof may not become rock or vegetation without a deliberate depicted transition.
4. Underground maps require an explicit connection graph and ground plan: each passage has a destination or an intentional dead end, stairs connect known elevations, masonry and natural rock are visually distinct, and aqueducts have a readable channel/support relationship. Atmospheric arches do not substitute for traversable geometry.
5. Preserve the requested fullness through meaningful detail and distinct places. Do not solve this by returning to the rejected sparse geometric town symbols. Variation in density and quiet spaces help important features remain readable.
6. Treat regional settlement vignettes as consistent cartographic representations. Their relative size must distinguish hamlet, town and capital without making structures physically gigantic. Do not claim literal surveyed scale where there is no established geographic scale.
7. Separate layout, architecture, terrain linework, colour, texture and labels where the workflow allows. Use controlled shapes/paths for the parts that must stay exact; a single generated raster should not be trusted to invent all geography, architecture and route logic at once.
8. Work on one representative region before replacing the other six. Inspect the whole composition and close details, recording specific defects. Use local corrections for local failures. Reject unresolved fusions rather than adding grain, aging, watercolour or more prompt adjectives to hide them. Image generation is fallible; these steps are review controls, not a guarantee that prompting eliminates defects.

Primary sources studied (references for principles, not permission to copy artwork/assets):

- Josh Stolarz, [Where to Place Rivers](https://www.mapeffects.co/tutorials/placing-rivers): valley structure and downhill drainage inform river placement.
- Josh Stolarz, [How to Draw a City Block](https://www.mapeffects.co/tutorials/city-block): staged block sketch, varied building shapes, linework, roof detail and separate colour/shadow passes.
- Jonathan Roberts, [Top Down Mountains](https://www.fantasticmaps.com/2015/12/how-to-draw-top-down-mountains-on-a-map/): connected primary ridges, secondary spurs and valley structure precede surface detail.
- Jonathan Roberts, [Aged Paper Handout](https://www.fantasticmaps.com/2016/01/creating-an-aged-paper-handout/): a useful base drawing comes before parchment treatment.
- Mike Schley, [Mapping Narratives](https://rpgmaps.profantasy.com/mapping-narratives-by-mike-schley/): meaningful relationships, physical logic and selective detail serve the story.
- USGS, [Topographic Map Symbols](https://www.usgs.gov/educational-resources/topographic-map-symbols): feature representation depends on map scale and extent; dense areas need selective depiction.

Owner's further direction (2026-11-17): requested touchups informed by the Interconnectd article "How to Fix the Plastic AI Look: Prompting for Authentic Human Images" (https://interconnectd.com/blog/85/how-to-fix-the-plastic-ai-look-prompting-for-authentic-human-images/), then explicitly requested towns at the map's geographic scale. Apply the article's material-specific approach to ink, paper and pigment, plus varied marks and localized wear, rather than portrait-specific camera effects. Reduce oversized settlement architecture while retaining miniature hand-drawn character, readable labels and a full geographic composition. City symbols are cartographic representations, not surveyed street plans or measured geographic footprints.

Owner's subsequent style direction (2026-11-17): rejected the simplified city treatment. Redraw the earlier detailed-settlement version using raw ink and quill on aged torn-edge parchment, with physical paper grain, rough mountain cross-hatching, jagged coasts, a few random ink splatters and a crowded, slightly chaotic antique scanned appearance. Avoid smooth shadows, polished digital shading and filters. Retain the correction to repetitive crop fields; settlements should have hand-drawn character rather than simplified geometric footprints.

Keep the existing north-up silhouette, northern mountain backbone, great eastern inlet, southern arm and nearby islands. Place settlements at crossings, sheltered harbours and valleys. Roads branch to peripheral places, cross rivers at bridges and follow mountain passes. Differentiate the inhabited but overgrown city from abandoned countryside. Vary town size without making buildings enormous. Leave ordinary open country between landmarks. Maintain the established fine-ink nineteenth-century atlas style, with readable labels and restrained geographic detail.

The names, local histories and exact positions are proposals for review, not additional settled canon. The Creep's appearance on this map depicts current landscape conditions, not a new spread simulation or gameplay system.
