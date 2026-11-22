# Archaeology: Deciphering the lost peoples

Design pass started 2026-11-21. Part of the per-skill review in [Skilling Progression](SKILLING_PROGRESSION.md), following [Mining](MINING_DELVE.md), [Woodcutting](WOODCUTTING_GIANTS.md), [Foraging](FORAGING_BREEDING.md) and [Thieving](THIEVING_CASING.md). Archaeology was already overhauled (Regional Trail of seven sites with Clue Fragments and Passports, Surface/Buried/Bedrock layers with Commitment and cave-ins, the Sealed Reliquary and Relic Forge, factions, standing and merchants; see the Archaeology row in [GAME.md](GAME.md)). The owner hadn't reviewed that work, so this pass runs the full interview. Its layers, going deeper and cave-ins now overlap the Delve, so Archaeology needs its own idea.

## Decisions

- **Question 1, core twist (2026-11-21): B — Decipher the lost peoples.** Each ancient culture has an unreadable script. Finds carry glyphs; each glyph worked out translates more of that culture's inscriptions, and translations point to new dig sites, hidden chambers and relic recipes. The trail and passports stay, but each step is earned by cracking the language rather than by hours of digging. The Relic Forge stays as the payoff.
- **Question 2a, cracking glyphs (2026-11-21): B — Work it out yourself.** Inscriptions show glyphs alongside picture hints (a sun, a king, a river), and the player matches glyphs to meanings like a small logic puzzle. Finds add more inscriptions and more hints.
  - Decided on the owner's behalf: digging carries on idle and offline and keeps collecting inscriptions and hints; deciphering is done while the player is there. As hints pile up the puzzle gets easier, and enough evidence for one glyph eventually reveals it on its own, so nobody stays stuck for good.
- **Question 2b, what translations open (2026-11-21): B — The story in chapters.** Translating inscriptions reveals a people's history chapter by chapter. Each chapter gives a set reward (such as the next site's passport, a hidden chamber or a merchant unlock), and fully translating a culture opens its relic at the Relic Forge.
- **Question 3a, active digging (2026-11-21): A — Brush the find free.** A soil patch hides a partly visible find; tap squares to brush them away. Some squares are fragile cracks that chip the find. Clean uncovering is a double, a few chips a hit, many chips weak, breaking it a miss. Careful, not hurried. Replaces the shared sequence game on Archaeology.
- **Question 3b, levels 80–99 (2026-11-21): A — The First Script.** The Sealed Reliquary's people wrote the mother script all other cultures' writing came from; cracking it draws on everything learned from the earlier cultures and ends in the greatest relics.
- **Rare drop (2026-11-21): B — Rosetta stones.** Very rare finds from late sites carrying the same text in several scripts; each instantly cracks a batch of glyphs across cultures and opens a secret chapter reachable no other way.
- **Question 4a, steady chase (2026-11-21): A — Each culture's codex.** Every cracked glyph is entered in that culture's codex page; finishing rows and pages unlocks Archaeology perks such as faster digs, more hints per find and gentler fragile cracks.
- **Hidden collectibles** (decided on the owner's behalf): each dig site is a skilling zone with one hidden find, such as a lost expedition member's sketchbook. No gameplay effect.
- **Question 4b, main view (2026-11-21): A — The scholar's desk.** The current inscription fills the screen with its glyphs and picture hints; tap glyphs to try meanings. The dig site is a small panel showing what's being uncovered (and opens the brushing patch). Codex, story chapters and Relic Forge are tabs alongside.
- **Question 4c, coming back (2026-11-21): A — A stack of new inscriptions.** Everything dug while away waits as a pile of rubbings, each marked with how many new hints it adds; glyphs that revealed themselves get a short "the meaning came to you" note.

## Decided on the owner's behalf

- Surface/Buried/Bedrock layers, Commitment and cave-ins are retired, since depth and collapse belong to Mining's Delve. Existing saves keep every unlocked site, find, fragment, relic and Ancient Data balance.
- Digging runs idle and offline; deciphering is hands-on, and enough piled-up evidence reveals a glyph automatically.
- Chapter rewards take over what Clue Fragments and Passports did: finishing the right chapter opens the next site. Existing Clue Fragments and stamped Passports carry over as progress toward those chapters.
- Brushing replaces the shared sequence minigame on Archaeology digs.
- Each dig site is a skilling zone with one hidden collectible.
- Kept as they are: the Relic Forge and Sealed Relics, factions, standing, merchants, sifting (a steady source of finds and inscriptions) and existing restoration projects.
- Number of glyphs per culture, hints per find, auto-reveal thresholds, chapter rewards and perk values are tuning, set at build time on how they play.

## Implementation spec

Read [the build guide](SKILLING_BUILD_GUIDE.md) first. Numbers are starting values. Files: `src/data/expedition.ts`, `src/engine/expedition.ts`, `src/data/relics.ts`.

### Sites and cultures

The seven sites, their levels, intervals, XP, Artifacts, merchants, standing and sifting stay as they are. Each site is a collectible zone.

| Culture | Sites | Glyphs | Inscription length | Picture hints per inscription | Chapters |
|---|---|---|---|---|---|
| Giants | Giant's Cairn (1), Fallen Colossus (40) | 12 | 3 | 2 | 5 |
| Surveyors | Surveyors' Cutting (12), Imperial Adit (55) | 16 | 4 | 2 | 6 |
| Rimebound | Rime Barrow (24), Hollow Heart (70) | 20 | 5 | 3 | 7 |
| First Script | Sealed Reliquary (80) | 24 | 6 | 3 | 8 |

### Inscriptions and glyphs

- Every glyph has a hidden true meaning from a shared picture set (sun, moon, king, river, stone, fire, ice, death, war, giant, home, road, gold, star, beast, tree, sea, crown, blood, bone, wind, mountain, gate, oath).
  - Each culture uses a subset of the set.
  - Glyph shapes are drawn per culture: blocky for Giants, ruled lines for Surveyors, frost-curls for Rimebound, and nested shapes for the First Script.
- Each dig completion has a 4% chance (offline included) of an **inscription** from the site's culture:
  - The culture's inscription length in glyphs, picked with extra weight toward glyphs not yet cracked.
  - A row of picture hints: the true meanings of that many of its glyphs, shuffled, without saying which glyph is which.
- **Evidence:** each inscription adds 1 evidence to every glyph whose meaning appears among its hints. A glyph reveals itself when it reaches 12 evidence.
- **The puzzle:**
  - Tap a glyph, then pick a meaning from the pictures seen so far for that culture (or "?").
  - **Read** checks the inscription and shows "N of M glyphs right" without saying which ones.
  - When every glyph in an inscription is right, it's **translated**, and those glyphs become cracked and fixed.
  - Cracked glyphs fill in automatically on every other inscription.
- Untranslated inscriptions are stored up to 200. Past that, the oldest still count their evidence and are dropped.
- Each translated inscription gives Ancient Data: 5 for Giants, 8 for Surveyors, 12 for Rimebound, 20 for the First Script.

### Story chapters

Chapter `n` of a culture needs `3 + n` translated inscriptions of that culture since the previous chapter. Rewards:

| Culture | Chapter 1 | Chapter 2 | Chapter 3 | Chapter 4 | Final chapter |
|---|---|---|---|---|---|
| Giants | 50 Ancient Data | passport: Surveyors' Cutting | hidden chamber at Giant's Cairn | passport: Imperial Adit | relic forms 1–2 |
| Surveyors | merchant stock tier | passport: Rime Barrow | hidden chamber at Surveyors' Cutting | passport: Hollow Heart | relic forms 3–4 |
| Rimebound | merchant stock tier | passport: Fallen Colossus | hidden chamber at Rime Barrow | passport: Sealed Reliquary | relic forms 5–6 |
| First Script | 300 Ancient Data | 300 Ancient Data | hidden chamber at the Reliquary | 500 Ancient Data | relic form 7 and a title |

- Chapters between chapter 4 and a culture's final chapter (Surveyors 5; Rimebound 5–6; First Script 5–7) each give `100 × k` Ancient Data, where `k` is 2 for Surveyors, 3 for Rimebound and 4 for the First Script.
- Passports still need the site's level.
- **Hidden chambers** become a second dig action at that site, with a doubled inscription chance and the same Artifact rate.
- Each chapter's text is two or three short lines of lore, shown in the Chapters tab.

### The First Script (levels 80–99)

- The Reliquary's inscriptions only appear once all three earlier cultures have finished chapter 4.
- Its picture hints are shown as cracked glyphs from the other three scripts instead of pictures. You can only read them with what you've learned.

### Relic Forge and Sealed Relics

- Forge rules stay as they are. Forms unlock through final chapters as listed above. Forms a player already unlocked stay unlocked.
- Sealed Relics come from the Reliquary's first find and then 1 per 12 base hours of Reliquary digging (no Bedrock layer anymore).

### Rare chase: Rosetta stones

- 1 in 5,000 digs at the Imperial Adit, Hollow Heart or Sealed Reliquary.
- Using one reveals 3 uncracked glyphs in each culture and opens that culture's **secret chapter** if it's at least at chapter 3. The secret chapter is a lore page plus 250 Ancient Data and a cosmetic relic glow.
- Each culture's secret chapter is opened only once.

### Steady chase: the codex

For each culture, every 25% of its glyphs cracked gives a perk. Perks stack across cultures:

| Cracked | Perk |
|---|---|
| 25% | +5% dig speed |
| 50% | +1 picture hint on that culture's inscriptions (capped at length − 1) |
| 75% | −1 fragile crack in brushing |
| 100% | auto-reveal threshold −2 for every culture |

### Focus minigame: brush the find free

- A 5×4 soil grid over a find that's about 60% visible as a faint silhouette covering 5–7 squares. 3–5 **fragile cracks** sit on squares next to the find, drawn as faint hairlines.
- Tap squares to brush them away. The attempt ends when every square covering the find is brushed.
- Brushing a crack chips the find:
  - 0 chips is a **double**.
  - 1 chip is a **hit**.
  - 2 chips is **weak**.
  - 3 or more is a **miss**.
- Scoring function: `brushResult(chips: number)`.

### State

`GameState.archaeology`:

- `glyphs: Record<culture, Record<glyphId, { cracked: boolean; guess?: string; evidence: number }>>`
- `inscriptions: { id: string; culture: string; glyphs: string[]; hints: string[] }[]`
- `chapters: Record<culture, number>`
- `sinceChapter: Record<culture, number>`
- `secret: Record<culture, boolean>`
- `chambers: string[]`
- `newSince: number` (for the return view)

True glyph meanings come from a fixed seed per character, so every player's scripts differ and saves stay stable.

### Screen

- **Scholar's desk** (default tab): the current inscription large, with its glyph tiles, the picture-hint row under it, a meaning picker when a glyph is tapped, and the **Read** button with its "N of M" answer. Previous and next arrows step through the inscription stack.
- A side panel shows the current dig site, the dig progress bar and an **Open the dig** button that opens the brushing grid. On phones the panel sits below.
- Tabs: **Desk**, **Codex** (glyph grid per culture), **Chapters**, **Relic Forge**, **Sites**, **Merchants**.

### Coming back: the stack of rubbings

- A card shows how many new inscriptions arrived per culture and how many new hints they add.
- Each auto-revealed glyph gets a note: "The meaning came to you: ᚱ means River."
- An **Open the desk** button.

### Migration

- Surface, Buried and Bedrock layers, Commitment and cave-ins are removed, along with their state and their effects in the skilling tree.
- Stamped passports and unlocked sites stay. Chapters are set to the lowest values that match the sites already open, for example an open Rime Barrow means Surveyors chapter 2 is done.
- Each owned Clue Fragment becomes 3 inscriptions of its site's culture.
- Ancient Data, Sealed Relics, unlocked relic forms, Artifacts, standing, merchants, sifting, protected fragments and restoration projects are unchanged.

### Tests

- Inscription generation follows the length and hint counts.
- Evidence counting and auto-reveal at 12.
- "N of M" checking.
- Translation fixes the glyphs.
- Chapter thresholds and rewards, including passports.
- First Script gating.
- Rosetta effect.
- Codex perks.
- `brushResult` boundaries.
- Migration of a save with Barrow open and 2 Clue Fragments.

## Build work

Tracked in [MILESTONES.md](MILESTONES.md) under "Build Archaeology as Deciphering the lost peoples".
