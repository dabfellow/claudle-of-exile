# Battlefield redesign

Design agreed 2026-10-27 from your mockup (player at the bottom, hexes to the left, top and right). Replaces the 3-4-3 honeycomb and the wave timer in `src/engine/battlefield.ts` / `combat.ts`. **Built 2026-10-27** (save v19); see "As built" at the bottom for where it differs from the plan below. Not simmed yet.

## 1. The grid

- Pointy-top hexes. The player stands on the **bottom edge, centre**. Nothing spawns behind you.
- The field is every hex within **4 steps** of the player, on the player's row or above it: **34 hexes**.
- Each hex has a **ring** = its distance from the player:

| Ring | Hexes | Role |
|---|---|---|
| 1 | 4 | Melee range. At most 4 monsters can be on you at once (a balance lever). |
| 2 | 7 | Reach weapons/skills, monster casters that walk in close. |
| 3 | 10 | Where ranged monsters stop and shoot. |
| 4 | 13 | The edge: every one of these is a spawn gate. |

- Use axial hex coordinates in the engine (`{ q, r }`), so ring = hex distance, lines and neighbours are standard hex maths. Cells keep an index for saves/UI.

## 2. Spawning: a timer on every edge hex

- Each ring-4 hex has its own spawn timer, randomly offset at the start so they don't all fire together.
- When a timer is up and the hex is free (and the field is under the pace cap), a monster spawns **just outside the field** behind that hex and walks onto it. The walk-in from off-screen stays.
- The pace setting keeps its job: Creep / Walk / Run scale every gate timer (`spawnRate`) and set the field cap (`maxField`). Flee still stops spawns.
- Packs: a spawn can bring 1–3 monsters through neighbouring gates at once, so packs still exist without waves.
- Zones can weight the sides (`spawnSides: { left, top, right }`), e.g. a coastal area mostly from the left. Default is even. *(Not built yet: every gate is equal.)*
- Bosses walk in through the **top centre** gate and stop at ring 2 at the top. Adds come through the side gates.
- `zone.spawnEveryMs` becomes the base gate timer; tune it so a Walk pace has about the same monster flow as today, then sim.

## 3. Monster movement

- **Melee monsters** path toward ring 1 one hex at a time (shortest hex path, around occupied hexes, preferring hexes without hazards). When ring 1 is full they wait in ring 2: the swarm.
- **Ranged monsters** (today's `attackKind: 'spell'`, plus future archers) walk in until they're within their range (default 3) and stop. Melee monsters path **around** them.
- Each step takes `moveMs` as now (chill halves it, stun/freeze stop it).

### Visuals (no more blinking)

- A monster token is positioned by pixel, not by hex: when it steps, it **slides** from the old hex to the new one over the step time (a CSS transform transition with `transition-duration = moveMs`), with a small walk bob.
- Spawns start one hex outside the field (off the visible edge, faded) and slide in.
- When a melee monster arrives in ring 1 it leans toward the player on each swing.
- The engine already has the step timer, so the UI can always know "from hex, to hex, progress".

## 4. Range and closing in

- Every skill gets a **range** in rings (section 6). A skill can only target a monster within its range.
- **Closing in** (your idea): when a skill has nothing in range but there's a monster beyond it with a clear path (no monsters on the hexes between you and it), the player spends a **step** running at it, and the monster **slides one ring toward you**, so it looks as if you ran up to it. Repeat until it's in range, then attack.
  - The step costs time: `CLOSE_IN_MS` (start around 0.5 s), shortened by **movement speed** (Quicksilver flasks, boots mods later). This is the main melee lever: melee builds pay time to reach casters, and movement speed is how they get it back.
  - A blocked target isn't chased; the skill picks the next target in range (targeting rules, section 5), or waits.
  - Bosses can be closed in on the same way, while nothing blocks the path.
- Ranged monsters out of your reach and blocked by melee monsters are the intended pressure on melee builds: kill the front line to reach them.

## 5. Targeting

A targeting setting with **two criteria**: a filter and a sort, plus a tiebreak, so "combine them" works:

- **First (priority):** none / Bosses & rares first / Ranged monsters first / Ailing first (pairs with Backstab).
- **Then (order):** Closest / Farthest / Lowest life / Highest life.
- Tiebreak is always Closest.
- Only monsters a skill can reach (in range, or reachable by closing in for melee) are candidates.
- **Click a monster** to lock it as the target until it dies or you click it again. The lock overrides the setting for every skill that can reach it.
- Area skills aim at the hex that hits the most monsters within their range; single-target skills follow the setting.
- One setting for the whole bar first; per-skill overrides could come with the skill-bar automation overhaul (TODO).

## 6. Skill ranges and areas

Proposed starting numbers (rings). Bows and spells reach the whole field.

| Skill | Range | Area |
|---|---|---|
| Default Attack | weapon: 1 melee, 4 bow/wand | target |
| Heavy Strike, Pummel, Judgement Hammer, Infernal Blow | 1 | target |
| Ground Slam | 1 | **arc**: the ring-1 hexes beside the target too |
| Twin Strike, Backstab, Feint | 1 | target |
| Lacerate | 2 | target (a reaching sweep) |
| Poison Dart | 3 | target |
| Barrage, Ice Shot | 4 | target |
| Rain of Arrows | 4 | splash radius 2 around the aimed hex (was the whole field) |
| Spark | 4 | chain (unchanged) |
| Fireball, Glacial Lance, Frost Needle, Arcane Siphon | 4 | target (Inferno splash unchanged) |
| Shock Nova | — | **nova**: rings 1–2 around you (was the whole field) |
| Consecrate | — | nova rings 1–2, as ground |

Area shapes after the change:

- `target`: one hex.
- `splash`: the hex and its neighbours (radius setting for bigger ones).
- `arc` (replaces `rank`): the ring the target is in, the target hex and one hex either side.
- `beam` (replaces `line`; Pierce uses it): every hex on the straight line from you through the target to the edge.
- `nova`: every hex within N rings of you.
- `field`: everything (kept for bosses' slams/novas and rare cases).
- War Cry knockback: ring-1 monsters are pushed one ring outward, away from you.

Going from "the whole field" to novas/splashes is a nerf for Shock Nova and Rain of Arrows on a bigger field; a crowded field should make up for it. Sim will tell.

## 7. Weapon restrictions on skills

Weapon families today: mace, axe, sword, dagger, bow, sceptre, wand, staff. Sceptres are tagged both `attack_weapon` and `caster_weapon`; daggers are attack only.

Proposal:

| Skills | Allowed weapons |
|---|---|
| Heavy Strike | sword, axe, mace, sceptre, staff (so the Warrior's starting sword still works) |
| Slams: Ground Slam, Pummel, Judgement Hammer, Infernal Blow | mace, axe, sceptre, staff |
| Strikes: Twin Strike, Feint | sword, axe, dagger, mace, sceptre |
| Lacerate | sword, axe |
| Backstab | dagger, sword |
| Bow skills: Barrage, Ice Shot, Rain of Arrows | bow |
| Poison Dart | any (it's thrown) |
| Spells, including spell guards and buffs like Frost Ward | wand, staff, sceptre (your call, 2026-11-01; no damage bonus) |
| Curses | any |
| Non-spell guards and buffs | any |
| Default Attack | any |

- Gems carry `weapons?: WeaponFamily[]` (or a `caster` flag for spells). A gem whose weapon you're not holding greys out on the bar and stops firing, like the attribute shortfall does today; the tooltip says why.
- Dual wield: the main hand decides.
- The bot and the gem shop must respect it.
- Starting kits all fit: spells work with any weapon, and Heavy Strike takes a sword.

## 8. Mobile

- Not a target. Below a width breakpoint the Combat page shows a **summary**: monsters on the field, the current target card (life, ailments), your life/mana, recent damage per second. Combat runs exactly the same underneath.

## 9. Saves and the sim

- Old saves: clear the field on load (monsters, ground) when the battlefield version changes; the fight just restarts.
- The engine stays UI-free, so the sim and offline progress get the new field for free. Rerun the sim **after** the battlefield looks right (your call). Expect melee to need a buff; movement speed and closing-in time are the first knobs.

## 10. Build order

1. Grid geometry (axial hexes, rings, neighbours, lines, area shapes) + tests.
2. Edge-gate spawning and the pace settings.
3. Pathfinding: melee to ring 1, ranged stop at range.
4. Skill ranges, closing in, area shapes on the new grid.
5. Targeting setting and click-to-target.
6. Combat page: the new field, sliding movement, walk-ins, close-in animation.
7. Weapon restrictions on gems (can ship separately; doesn't depend on the grid).
8. Mobile summary view.
9. Sim rerun and balance.

## Open questions

- Ring 1 has only 4 hexes (left, right, two above). Enough pressure, or should ring 1 allow 2 small monsters per hex? yes 4 is fine
- Staves: caster only (current tag), or also slams? both
- Should spells really need a caster weapon (a Templar with a mace couldn't use Shock Nova), or only get a bonus from one? first a bonus, then changed 2026-11-01: spells need a wand, staff or sceptre, and the bonus is gone

## As built (2026-10-27)

- **Grid**: `CELLS` is numbered ring by ring, left to right; cell 0 is the hex left of the player, cells 0–3 are melee range. `RINGS`, `EDGE_CELLS`, `cellRing`, `areaCells` (target / splash / arc / beam / nova / field), `reachable`, `pullCloser` in `battlefield.ts`.
- **Spawning**: `spawnMs` is now only the search pause before the gates open (an empty field fills after 0.9 s); each edge gate has its own timer in `combat.gates`, about `spawnEveryMs × 13` (±40%), so flow matches the old wave timer. A gate sends a pack: the first monster at the gate, the rest at the nearest free gates.
- **Bosses** walk in through the top-centre gate with their adds beside them and stop at ring 2. Summoned adds appear beside the boss, in front of it where there's room.
- **Monsters** step one ring closer per `moveMs`; blocked melee slides sideways to a hex with a way in. Casters (spell attacks) stop at ring 3 and cast from there.
- **Closing in** takes 0.5 s, divided by `1 + movement speed`. Quicksilver Flasks now also give 40% increased Movement Speed (new `moveSpeedPct` stat). A queued manual skill stays queued while you close in.
- **Skill choice**: a damage skill only fires with a target in range; if none can, the first skill that could reach a monster by closing in runs at it; with nothing reachable you wait (0.25 s) and look again. Guards, buffs and sustain skills (Consecrate's heal) fire regardless.
- **Area skills** (splash, arc) aim at whoever in range puts the most monsters under the hit, within the same targeting priority; a clicked target always wins.
- **UI**: hex tiles drawn from the same geometry; monsters on their own layer keyed by monster, so steps slide and arrivals walk in from past the edge. Click a monster to lock it (dashed border), click again to release. Target setting (priority + order) in the movement bar. Below 1700px the field goes full width with the player card and matchup under it; below 700px a text summary replaces the field.
- **Gem tooltips** show Reach and the main-hand weapons a skill needs; a skill your weapon can't use shows the reason on the skill bar in red. The sim bot skips gems its weapon can't use.
- **Not done**: zone side weighting, sim rerun and melee balance, rare monsters (the "Bosses first" priority only means bosses today).
