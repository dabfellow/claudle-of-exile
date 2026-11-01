# Act recipe

Every act is built from this checklist, which turns the Decisions in [MILESTONES.md](../MILESTONES.md) into something to tick off.
The audits below compare Acts 1 and 2 against it, using `src/data/zones.ts` and `src/data/gems.ts` as of 2026-10-30. The
work is [MILESTONES.md](../MILESTONES.md) milestone 4.

## Checklist

- [ ] **Stages:** about 8 in early acts, growing to 10–20 in later ones. Act 3 starts the growth. A stage is one area
  (`ZoneDef`).
- [ ] **Roads (Act 3 on):** forks that rejoin, plus dead-end side areas, as below.
- [ ] **Boss mechanic:** one new mechanic, added to `BossMechanic`, that says what answers it by hand and by rule.
- [ ] **Resistance check:** one element clearly leads, across trash damage and the bosses' nova and ground damage.
- [ ] **Skill batch:** a themed set of skill gems and supports that arrives with the act.
- [ ] **New skill (Act 2 on):** one trainable skill, like Thieving. It feeds its own game system and produces crafting
  materials.
- [ ] **Level band:** Acts 3–6 cover about 33 to 65, read here as character levels, because the reset puts characters
  at around 65 at the end of Act 6. That's about 8 levels per act.
- [ ] **Art:** pack art for every monster and area.
- [ ] **Pacing:** checked in the sim once milestone 2 can measure it.

## Roads

Decided 2026-11-01, from your "PoE-like divergence". Acts 1 and 2 stay straight; every act from 3 on branches.

- **Forks:** `requires.after` lists every road into an area, and any one of them opens it. The area order in `ZONES` stays campaign order, with the act boss last.
- **Side areas:** a dead end no road leads on from (`isSideArea`). The map draws them smaller, on a thinner road, and they read "Side area" on their card.
- **Act boss gate:** `requires.bosses` asks for about 75% of the act's other bosses, more than the shortest route gives. Forks are a real choice of what to skip, and the act can't shrink to its shortest route. Every boss still counts toward the act's all-bosses achievement.
- **Act complete:** the Campaign page's banner now follows the act boss, not every boss.
- **Saves:** areas are only ever added on load (`openReachedZones`), so straight-line saves keep everything, and no area id changed.
- **Map:** each area's point is in `ZONE_POS`, its label's side in `LABEL_SIDE`, and `stretch` makes a crowded region taller in close-up. `tests/actRoads.test.ts` fails if a label hits another label, a point or a road.

## Act 2: The Burning Steppe

| Item | Today | Verdict | Work |
|---|---|---|---|
| Stages | 8 areas | Fits | None |
| Boss mechanic | Scorched earth, on 6 of 8 bosses. No rule condition reads ground, and it has no wind-up for `enemyCasting` to catch | Partly fits | Add the ground rules decided below |
| Resistance check | Fire leads: 12 of 32 trash monsters (lightning 5, cold 4), and the nova or ground element on 5 of 8 bosses | Fits on paper | Nothing shows it bites: the bot rarely died in the 36 h Act 2 preview run, and that's the latest evidence |
| Skill batch | None. No gem unlocks between level 16 and Lacerate at 35 | Doesn't fit | Rebuild: theme, gems, supports, and a way to tie gems to an act |
| New skill | None | Doesn't fit | Rebuild: pick the skill and build it |
| Level band | Monster levels 24–33 | Fits | None; decided below |
| Art | All 40 monsters have pack art, 21 of them loose matches. Banners reuse Act 1 landscapes | Partly fits | Art for 8 areas |
| Pacing | About 1h40–3h25 after Ysolde (2026-10-26, active bot) | Not measured | Wait for milestone 2. The "6–16 h" and "3–7 days" figures are old targets |

Keep the 8 areas, the bosses, Scorched earth, the 6 new uniques and drop tiers 6–7 as the starting point. The recipe
doesn't ask to replace them.

**Act 2 is already open.** `open: true` went in with 803e813 and is on `main`, so the rebuild changes an act players can
reach. If an area's `id` changes, saves that have unlocked it will need handling. ACT2.md, the roadmap's "open it" and
the reset's "paused" list all still describe it as unreleased.

### Decided: Act 2 (2026-10-31)

- **Level band:** monster levels stay 24–33, because they run straight into Act 3 at 33 and give about 9 character
  levels, matching the ~8 per act above. This replaces the earlier 17–25, which predates the reset's 33–65.
- **Skill batch:** Riders and raiders: fast movement and charge skills, which step out of Scorched earth. It also fills
  the missing Dex and Int buffs and real curses.
- **New skill:** Thieving, feeding Heist. Khanate raiders and Caravan's End give it a home, and it needs no inputs. It
  still needs a place in the crafting economy.
- **Ground rules:** a new reactive rule group reads the ground under you, so a skill can react once something has put
  an ailment there: burning, toxic, frozen, shocked and so on. It's unlocked at the War Table. Burning is the first
  case, for Scorched earth; each later act can add its own.

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

### Decided: Act 1 (2026-10-31)

- **Resistance check:** cold. One clear element teaches players what a resistance check is. Move some lightning damage
  to cold, starting with Ysolde's nova.
- **Skill batch:** split the pool. Act 1 keeps skills up to level 12, the level 16 skills join Act 2's batch, and
  Lacerate moves to Act 3, which matches its level 35. New skills to find are what make each act feel fresh.
