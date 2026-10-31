# Act recipe

Every act is built from this checklist, which turns [DESIGN_RESET.md](../DESIGN_RESET.md) §4 into something to tick off.
The audits below compare Acts 1 and 2 against it, using `src/data/zones.ts` and `src/data/gems.ts` as of 2026-10-30. The
work is [ROADMAP.md](../ROADMAP.md) milestone 4.

## Checklist

- [ ] **Stages:** about 8 in early acts, growing to 10–20 in later ones. Act 3 starts the growth. A stage is one area
  (`ZoneDef`).
- [ ] **Boss mechanic:** one new mechanic, added to `BossMechanic`, that says what answers it by hand and by rule.
- [ ] **Resistance check:** one element clearly leads, across trash damage and the bosses' nova and ground damage.
- [ ] **Skill batch:** a themed set of skill gems and supports that arrives with the act.
- [ ] **New skill (Act 2 on):** one trainable skill, like Thieving. It feeds its own game system and produces crafting
  materials.
- [ ] **Level band:** Acts 3–6 cover about 33 to 65, read here as character levels, because the reset puts characters
  at around 65 at the end of Act 6. That's about 8 levels per act.
- [ ] **Art:** pack art for every monster and area.
- [ ] **Pacing:** checked in the sim once milestone 2 can measure it.

## Act 2: The Burning Steppe

| Item | Today | Verdict | Work |
|---|---|---|---|
| Stages | 8 areas | Fits | None |
| Boss mechanic | Scorched earth, on 6 of 8 bosses. No rule condition reads ground, and it has no wind-up for `enemyCasting` to catch | Partly fits | Give it a rule answer, after checking what milestone 1 adds |
| Resistance check | Fire leads: 12 of 32 trash monsters (lightning 5, cold 4), and the nova or ground element on 5 of 8 bosses | Fits on paper | Nothing shows it bites: the bot rarely died in the 36 h Act 2 preview run, and that's the latest evidence |
| Skill batch | None. No gem unlocks between level 16 and Lacerate at 35 | Doesn't fit | Rebuild: theme, gems, supports, and a way to tie gems to an act |
| New skill | None | Doesn't fit | Rebuild: pick the skill and build it |
| Level band | Monster levels 24–33 | **Open** | See [below](#open-act-2-level-band) |
| Art | 0 of 40 monsters have art, so all show the skull. Banners reuse Act 1 landscapes | Doesn't fit | Pack art for 40 monsters and 8 areas |
| Pacing | About 1h40–3h25 after Ysolde (2026-10-26, active bot) | Not measured | Wait for milestone 2. The "6–16 h" and "3–7 days" figures are old targets |

Keep the 8 areas, the bosses, Scorched earth, the 6 new uniques and drop tiers 6–7 as the starting point. The recipe
doesn't ask to replace them.

**Act 2 is already open.** `open: true` went in with 803e813 and is on `main`, so the rebuild changes an act players can
reach. If an area's `id` changes, saves that have unlocked it will need handling. ACT2.md, the roadmap's "open it" and
the reset's "paused" list all still describe it as unreleased.

### Open: Act 2 level band

**Not decided. This one is yours.** You said 17–25, areas are monster level 24–33, and the sim's characters leave at
L30. Act 2's skills, XP and Act 3's start all depend on the answer.

| Reading | What follows |
|---|---|
| **17–25 is character levels** (how ACT2.md took it) | Characters arrive at about 21, so the act covers only about 4 levels, then an 8-level jump to Act 3's 33. Act 2 hands out far fewer levels, and Act 3 starts lower or the jump gets filled |
| **17–25 is monster levels** | It overlaps Act 1's last areas (16–24), so Act 1 has to end around 17. Same jump to 33, and both acts need new levels |
| **Keep it as built, 24–33** | Monster levels run straight into Act 3 at 33, and about 9 character levels (21 to 30) matches the ~8 per act above. It's not what you asked for |

What the numbers are worth:
- 17–25 predates the reset's 33–65, so the reset may have overtaken it. That's your call.
- L21 and L30 are partly the sim bot's own gate. It enters an area at one level below the area's minimum (22 and 31
  here), so those are floors for when the bot arrives, not what the act gives.
- Those runs are from 2026-10-25. By 2026-10-26 the smarter bot was L39–41 at 12 h, with Act 2 done and time left over.
- The comment above Act 2 in `zones.ts` says characters leave at 25–27, which matches none of this.

### Open: Act 2's theme and new skill

| Question | Idea 1 | Idea 2 |
|---|---|---|
| Batch theme | **Burning ground:** skills that leave fire on the field or pay off standing near it, which turns the act's hazard into a build | **Riders and raiders:** fast movement and charge skills, which also answer Scorched earth by stepping out. Could fill the Dex and Int buffs and curses already on the list |
| New skill | **Thieving → Heist:** Khanate raiders and Caravan's End give it a home, and it's the easy fit with no inputs | **Archaeology → Expedition:** dig sites in the Kurgan Fields, with Artifacts that trade for currency or rewards |

Whichever is picked needs a home in the crafting economy. Cartography waits for Maps (milestone 8).

## Act 1: The Drowned Coast

| Item | Today | Verdict | Work |
|---|---|---|---|
| Stages | 8 areas | Fits | None |
| Boss mechanic | Slam, summon, nova, enrage and ward debut across the first five areas | Fits as the exception | None. Act 1 teaches the base set, so it doesn't get one signature mechanic |
| Resistance check | ACT2.md calls cold the check, but cold and lightning tie on trash (6 each of 32, fire 3), and nova elements are fire 2, lightning 2, cold 1. Ysolde hits with cold and novas with lightning | Doesn't fit | Pick one (below) |
| Skill batch | All 27 skills, gated by character level from 1 to 16, except Lacerate at 35. Signature supports need their skill's level + 6. Nothing is themed or tied to an act | Doesn't fit | Rebuild: name Act 1's batch and move gems to act gating |
| New skill | Not required before Act 2 | Fits | None |
| Level band | Monster levels 1–25; the bot beats Ysolde at about L21 | Fits | None, unless the Act 2 answer moves it |
| Art | 40 of 40 monsters have art | Fits | None |
| Pacing | Milestone 2's job | Not measured | Wait for milestone 2 |

### Open: Act 1

| Question | Idea 1 | Idea 2 |
|---|---|---|
| Resistance check | **Cold:** matches ACT2.md and the Drowned Queen. Move some lightning damage to cold, starting with Ysolde's nova | **Cold and lightning:** call the coast's storm a two-element check, and change nothing but the docs |
| Act 1 batch | **Everything today:** the 27 skills are the starter pool, and new batches add to it. Lacerate moves to whichever act matches level 35 | **Split the pool:** Act 1 keeps skills up to level 12, and the level 16 skills and Lacerate seed the Act 2 batch |
