# Act 2 — The Burning Steppe

Status: **framework built, in preview** (2026-10-25). All eight areas, bosses, uniques and drop tiers are in
[zones.ts](../src/data/zones.ts) and play end to end in dev builds, tests and the sim. Production players don't
see it until `open: true` is set on Act 2 in `ACTS`.

## Level band

You asked for "lvl 17–25". Act 1 monsters already run to level 25, and the sim's characters beat Ysolde at
**character level ~21** (seed 1, 2026-10-25). So 17–25 is read as the *character* levels Act 2 covers. Areas are
set to monster levels **24–33**, a few levels above you, the way Act 1 is. **Sim result: characters actually come out at L30**
(BALANCE.md → "Act 2 preview"), because Act 2 hands out levels quickly and rarely kills. Slowing it down (more monster
life or less kill XP for Act 2) is the next call; see the levers there.

If you meant monster levels, change the `levelRange` and monster levels in the Act 2 block of `zones.ts`; nothing
else depends on the numbers.

## Areas

Each area climbs one level. Drop tiers (5 → 7) and boss mechanics (3 → 6) carry the sense of going deeper.

| # | Area | Levels | Tier | Boss (level) | Mechanics | Uniques |
|---|---|---|---|---|---|---|
| 1 | The Cinder Road | 24–26 | 5 | Khorun the Outrider (26) | slam, summon, scorch | Brawler's Buckle, Titan's Girth, Sunmane Pelt |
| 2 | The Saltpan Flats | 25–27 | 5 | Sister Glass, the Mirage (27) | slam, nova, ward | Last Breath, Mirage Veil, Windchaser |
| 3 | The Blackgrass Sea | 26–28 | 6 | Ashmane, the Sun Lion (28) | slam, enrage, scorch | Sunmane Pelt, Emberheart, Knuckledusters |
| 4 | Caravan's End | 27–29 | 6 | Bey Tamsin, the Bandit Khan (29) | slam, summon, enrage, scorch | The Old Grudge, Khan's Tithe, Twin Oaths |
| 5 | The Kurgan Fields | 28–30 | 6 | The Horse-Lord in the Mound (30) | slam, nova, summon, ward | The Kurgan Crown, Hollow Locket, Iron Bulwark |
| 6 | The Thunder Plateau | 29–31 | 7 | Qara, Rider of the Storm (31) | slam, nova, enrage, scorch | Stormrider Greaves, Stormhide, Windchaser |
| 7 | The Pyre Temple | 30–32 | 7 | High Flamekeeper Ozar (32) | slam, nova, summon, ward, scorch | Heart of the Pyre, Ember of Faith, Ninth Psalm |
| 8 | The Burning Throne | 31–32 | 7 | **Azhar, the Fallen Sun** (33, act boss) | all six | Starforged Edge + the Act 2 uniques |

Damage leans fire, with lightning on the plateau and cold in the barrows, so fire resistance is the act's check
the way cold was Act 1's.

## New boss mechanic: Scorched earth (`scorch`)

Every 11 s the boss sets the ground under you burning (or chilled, shocked, caustic: the element of its nova) for
6 s, at 20% of its hit per second. Answers: resist the element, Run or Flee to step out faster (the existing
`STEP_OUT_RATE`), drink. It reuses the battlefield ground code, so chilled ground also slows you and shocked ground
makes hits land harder. Knobs: `BOSS_SCORCH_*` in `zones.ts`.

## New uniques

Six, all built from existing affixes (no new stats). In `bases.ts` under "Act 2".

| Unique | Base | For | Mods |
|---|---|---|---|
| Sunmane Pelt | Wyrmscale Hauberk | Warrior | +70 life, 50% armour, +40% fire res, +1 Rage when hit |
| Mirage Veil | Duskweave Cowl | Shadow | 60% evasion, +35 ES, +10% all res, +1 Malice when hit |
| Khan's Tithe | Diamond Ring | Generic | 5–11 phys, 20% crit chance, 25% rarity |
| The Kurgan Crown | Templar Crown | Templar | +50 life, +30 ES, +40% cold res, 20% faster Fervor |
| Stormrider Greaves | Wyrmscale Boots | Ranger | +110 evasion, +40% lightning res, 20% Momentum effect, 25% Momentum kept when hit |
| Heart of the Pyre | Onyx Amulet | Mage | 10–20 fire, 25% elemental, 10% cast speed |

The four uniques that were waiting for Act 2 now drop here: Brawler's Buckle, Last Breath, The Old Grudge,
Starforged Edge.

## Drops

New tiers 6 and 7 in [drops.ts](../src/data/drops.ts): a little more currency, more rares, slightly better orb
weights. Bosses: tier 6 guarantees 3 Chaos on the first kill (4% after), tier 7 an Exalted and a Divine (1.5%
after).

## How opening works

- `ActDef.preview`: the act plays when `ACT_PREVIEW.enabled` is on: `import.meta.env.DEV`, so dev builds, vitest
  and the sim, never `npm run build`.
- `actOpen(n)` gates everything: `nextZone`, `startCombat` (refuses areas of closed acts, in case a preview save
  reaches production), `smithIlvlCap`, achievements, the Campaign tabs.
- **Existing saves:** on load, any beaten boss whose next area isn't unlocked unlocks it (`unlockReachedZones` in
  `save.ts`). Players who beat Ysolde before Act 2 shipped get the Cinder Road the first time they load after it
  opens. No save-version bump needed.
- Achievements carry an optional `act`; ones for closed acts stay hidden. New: *Sunset* (complete Act 2) and
  *Lord of the Steppe* (every Act 2 boss). *Conqueror of the Coast* now counts Act 1 only (it used to count every
  zone, so adding Act 2 would have moved its target).

## To release

1. Balance pass with `npm run sim -- --hours 36` (it now reports each act and the character level at every boss).
2. Art: area banners reuse the Act 1 landscapes; monsters show the skull icon. Prompts for all 8 areas, 40
   monsters and 6 uniques are in `artManifest.ts`. `npm run art -- --docs` would add them to ART_PROMPTS.md; not run
   yet, since it can reshuffle the 3×3 sprite sheets you may be partway through.
3. Set `open: true` on Act 2 in `ACTS`, update Settings → About and the title screen line, deploy.

## Not in this pass

- Skilling band Lv 20–40 (Mithril / Yew / Emberroot, Screaming essences): see SKILLING_REWORK.md §6.
- Act 2 skill gems or supports.
- Monster art.
