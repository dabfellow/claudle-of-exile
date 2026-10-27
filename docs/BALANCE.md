# Balance notes

Run the headless sim to check pacing after any numbers change:

```bash
npm run sim                              # 24h per class, bot drinks flasks
npm run sim -- --hours 12 --idle         # no manual flasks
npm run sim -- --class mage --seed 3
```

The bot pushes the furthest zone it's levelled for (area min level ≤ char level + 1), equips upgrades by a simple score, spends passives greedily, salvages extra items, and drops back a zone for 20 min after 3 deaths in a row. It is a sensible-but-simple player, not an optimal one.

## Knobs

| Knob | Where | Current |
|---|---|---|
| Character XP curve | `engine/xp.ts` `CHAR_CURVE` | `36·(L−1)³ + 100·(L−1)` to 100 |
| Kill XP | `engine/combat.ts` `monsterXp`, `KILL_XP_SCALE` | `(5 + 3·level) × 10 for bosses × 0.8`, × level-difference multiplier |
| Death penalty | `engine/character.ts` | 5% of xp toward next level |
| Player action times | `data/gems.ts` `timeMs`, `BASE_ATTACK_MS` | default attack 3 s; each skill has its own attack or cast time (Heavy Strike 3.9 s, Twin Strike 2.7 s, Fireball 3.6 s, guards 0.75–1.2 s). Most spells are instant (`timeMs: 0`) and limited by their cooldown, so they don't use up the turn; only big wind-ups (Fireball, Glacial Lance) have a cast time. Under Overclock instant skills take 0.5 s (`OVERCLOCK_INSTANT_MS`). No cooldown can ever drop below 0.1 s (`MIN_COOLDOWN_MS` in `engine/gems.ts`): not through cooldown recovery, Arcane Recursion or Overclock, whose cooldowns sit at that minimum. Weapons add attack speed (`data/bases.ts` `speed`, 0–35%); attack and cast speed shorten them |
| Monster life | `data/zones.ts` `MONSTER_LIFE_SCALE` | ×0.85 (was ×1.8 when actions were ~2× quicker) |
| Monster action times | `data/zones.ts` `basic`, `slam`, `nova` | every monster has a named basic attack or spell (1.9–4.2 s, default 3 s); each boss has its own slam and nova wind-ups (3.2–4.4 s) |
| Base life regen | `engine/stats.ts` `BASE_REGEN_PCT` | 0.5%/s |
| Skill XP | `data/skills.ts` `SKILL_XP_SCALE` | 0.3 |
| Drops | `data/drops.ts` `DROP_TABLES` | per area tier: currency 4.5→5.5%, items 6→7%, rare share 4→12%, unique 0.05→0.1%; chaos from tier 2, exalted/divine from tier 3, instill from tier 4 |
| Boss drops | `data/drops.ts` `BOSS_TABLES` | first kill guarantees the tier reward (2 transmute → 1 exalted), then `repeatChance` per kill (10% tiers 1–3, 6% tier 4, 1.5% tier 5); 2–3 extra currency rolls |
| Boss mechanics | `data/zones.ts` `BOSS_*` | slam ×2.5 every 9 s; nova ×1.8 every 13 s (ignores blocks); wind-ups are per boss; summon up to 2 adds every 16 s; enrage below 35% (+50% attack speed, +30% damage); ward 12% of life at 66%/33%, heals 10% if not broken within 8 s |
| Spell added damage | `engine/gems.ts` `SPELL_ADDED_EFFECTIVENESS` | spells add your flat fire/cold/lightning damage at 70% |
| Gathering/recipe gating | `data/skills.ts` `area` | higher nodes and recipes need their area unlocked |
| Bench recipes | `data/hideout.ts` `BENCH_CRAFTS` | bench level + an achievement for everything past life/resists |
| Gold | `engine/loot.ts` | 1…level/3 per kill (×15 boss) |
| Smith item level | `engine/skills.ts` `smithIlvlCap` | capped at furthest unlocked area's max level |

## Baseline — Phase 1 (2026-10-21, seed 7, 12h)

| | Warrior | Ranger | Mage |
|---|---|---|---|
| Level 10 | 3h06 | 2h07 | 3h18 |
| Level 15 | 6h28 | 4h42 | 6h08 |
| Level after 12h | 17 | 19 | 19 |
| Boss 2 (Ashen Woods) | 48m | 45m | 48m |
| Boss 3 (Sunken Crypt) | 6h35 | 4h47 | 6h13 |
| Gold after 12h | 17.9k | 23.5k | 22.4k |
| Chaos / Exalted | 13 / 1 | 9 / 0 | 11 / 3 |

Gathering (best node): level 30 ≈ 2h45, 60 ≈ 28h, 99 ≈ 53 days of continuous training.

Fresh characters idle the Mud Flats trash to the boss in ~3 minutes (all classes) and die to the boss without flasks — intentional.

## Phase 2 — Combat 2.0 (2026-10-21, seed 7, 12h, active bot)

| | Warrior | Ranger | Mage |
|---|---|---|---|
| Level 10 | 2h03 | 2h12 | 3h03 |
| Level 15 | 4h00 | 4h12 | 6h51 |
| Level after 12h | 22 | 24 | 17 |
| Boss 3 (Sunken Crypt) | 4h02 | 4h15 | 6h56 |
| Gold | 37.5k | 44.3k | 19.2k |

New knobs: pack member scaling (`PACK_LIFE_SCALE` 0.6 / `PACK_DMG_SCALE` 0.65, xp and loot scale with it), `BOSS_ADDS` 2, gem drops (1.2% per kill, 35% per boss), base mana regen 4%/s, gem level curve `60·(L−1)^2.8` with level requirement `1 + 3·(L−1)`.

Notes for the Phase 8 balance pass:
- **Mage trails** by ~5 levels at 12h (lower life; spell scaling only from Intelligence and elemental %). A Spark base-damage bump didn't close it.
- **Idle ≈ active** where the starting guard skill's "when an enemy winds up" rule answers boss slams — intended (a good tactics setup wins), but bosses need more than one mechanic so setups matter more.
- The bot never re-arranges skills or uses dropped skill gems; it only fills support sockets.

## Phase 4 — trees (2026-10-21)
- Existing characters had their passive points refunded (save v6) because the tree was rebuilt.
- The bot skips keystones (its scorer can't judge trade-offs like Blood Pact) and takes the first mastery option.
- **Drop luck dominates single runs.** Seed 7 left a Warrior on 17 DPS with 58 deaths at the second boss; seeds 3, 11 and 21 killed it in 28–37 minutes with no deaths. Always compare several seeds (`--seed N`) before tuning. Use `--debug` to print the bot's tree, skills and stats.

## Phase 5 — economy (2026-10-21, warrior, 8h, seeds 1–2)
- With bosses guaranteeing their reward on every kill, a tier-3 farm made ~115 chaos in 8h (bosses every 25 kills). Guarantees are now first-kill only (then 10%), giving 39–84 chaos and 46–72 alchemy per 8h depending on how deep the bot got.
- Rare currency (regal and up) never comes from skilling: `COMBAT_ONLY_CURRENCY`. Alchemy still makes transmute/alteration/scour/regret/alchemy orbs, but its recipes unlock with the matching area.

## Phase 8 — Act 1 (2026-10-22, 14h, seeds 1–3)

Act 1 is 8 areas, levels 1–25. Time to beat the act boss (Ysolde):

| | Warrior | Ranger | Mage |
|---|---|---|---|
| Active, seed 1 | 6h32 | 9h27 | 6h41 |
| Active, seed 2 | 8h48 | 7h09 | 6h14 |
| Active, seed 3 | 6h21 | 6h44 | 8h40 |
| Idle (no manual flasks), seed 1 | 11h14 | 12h41 | 6h04 |

All active runs land in the 6–10 h target. Idle melee is slower and dies a lot (Ranger: 204 deaths), which is intended. Idle Mage matches active because Frost Ward's guard rule already answers the wind-ups.

What changed to get there:
- **Mage parity.** Spells now add your flat elemental damage (gear, wand implicit) at 70% (`SPELL_ADDED_EFFECTIVENESS`). Before this, Mage finished Act 1 in 11 h or not at all.
- **Kill XP × 0.8** (`KILL_XP_SCALE`). Without it Warrior and Ranger finished in 4.5–6 h.
- **Act-boss farming.** The first 16 h run gave 49–115 exalts. Now 6–21 per 14 h: adds killed in boss fights don't count toward the next boss, boss repeat chance is 6% at tier 4 and 1.5% at tier 5, and the trash exalt weight is lower (0.15 / 0.25 / 0.35 at tiers 3–5).
- The bot now scores gear by its best skill's damage (`skillSummary`), not weapon DPS, so it gears casters sensibly.

Chaos runs at 85–155 per 14 h, mostly from farming the Sanctum after the act is done. This is fine as a pre-Act-2 endgame. Revisit it when Act 2 lands.

## Action times (2026-10-23, 14h, seed 1)

Every skill and monster now has its own attack or cast time (default attack 3 s), replacing one shared weapon-speed interval. Player actions got ~2.1× slower, so monster life went from ×1.8 to ×0.85. Boss wind-ups are longer (3.2–4.4 s) so a guard rule still lands mid-attack.

| Act 1 boss (Ysolde) | Warrior | Ranger | Mage |
|---|---|---|---|
| Before | 6h32 | 9h27 | 6h41 |
| After | 9h13 | 8h44 | 8h19 |

All in the 6–10 h target and closer together; Ranger no longer trails. Only one seed so far — check seeds 2–3 before tuning further.

## All 7 classes, seeds 1–3 (2026-10-24, 14h, active bot)

Time to beat Ysolde. "—" = not beaten in 14 h. Three builds: the last commit; with the 15 new skills
(the bot still only uses its starter gems); and the new skills plus the improved bot.

| | Warrior | Ranger | Mage | Duelist | Templar | Shadow | Exile |
|---|---|---|---|---|---|---|---|
| Last commit, s1 / s2 / s3 | — / 12h42 / 13h38 | 11h10 / 10h13 / 6h37 | 8h36 / 8h05 / 7h40 | 13h17 / 10h16 / 9h23 | 8h18 / 8h33 / 9h40 | 7h36 / 10h47 / 8h47 | — / 12h15 / — |
| New skills | — / 11h09 / — | 10h25 / 13h15 / 11h26 | 5h06 / 7h22 / — | — / 8h20 / 6h56 | 7h35 / 9h53 / 9h46 | 7h43 / 9h30 / 10h41 | 11h33 / — / — |
| New skills + bot | — / 12h43 / — | 6h37 / 10h23 / 11h09 | 7h18 / 12h55 / 6h03 | 10h11 / 9h33 / 12h17 | 8h46 / 8h29 / 9h05 | 9h24 / 8h25 / 11h31 | 10h26 / — / — |

Clears out of 21: 15 / 15 / 17.

- **Drop luck still dominates.** The same class can differ by 4–6 h between seeds in every build. Adding
  15 gems also changes the gem drop pool, so the random stream differs from the last commit and runs aren't
  directly comparable.
- **Templar, Shadow and Mage** sit in the 6–10 h target on most seeds. **Ranger and Duelist** run 10–13 h
  on some seeds.
- **Warrior trails badly**: it beat Ysolde on 1 of 3 seeds per build, with 33–54 DPS at 14 h against
  50–100 for the others. Heavy Strike's 3.9 s attack time with starter gear looks like the cause. Not tuned yet.
- The Exile clearing at all is fine (it's a challenge class).

**Bot changes** (`scripts/sim.ts`): gear is scored with Energy Shield (×0.8) and with attack skills scaled by
the chance to hit monsters of the bot's level. Every 10 min the bot buys trader gear that beats what it wears
by 1%+ and restocks when it has spare gold. That gave 2 more clears out of 21, but runs still end with
16–90k unspent gold: early trader stock is mostly normal and magic items that are rarely upgrades.

## Known gaps
- Bot gear scoring is better but DPS still swings with drop luck. The bot doesn't craft or use the orbs it hoards.

## Act 2 preview (2026-10-25, 36h, seeds 1–2, active bot)

First runs since every skill got a cooldown, and the first with Act 2. "L" = character level when the boss fell.
The bot only enters an area once it's within a level of the area's minimum, so it reaches every boss at the same
level; times are what vary.

| | Warrior | Ranger | Mage | Duelist | Templar | Shadow | Exile |
|---|---|---|---|---|---|---|---|
| Ysolde (L21), s1 / s2 | 20h30 / 16h27 | 13h48 / 10h51 | 7h18 / 12h55 | 10h10 / 8h47 | 8h16 / 9h02 | 14h24 / 11h59 | 10h18 / 18h40 |
| Azhar (L30), s1 / s2 | — / 32h35 | 24h10 / 20h58 | 13h33 / 29h08 | 16h40 / 16h25 | 16h34 / 18h29 | 24h30 / 24h46 | 20h32 / — |
| Deaths over 36 h, s1 / s2 | 0 / 0 | 0 / 0 | 0 / 0 | 15 / 0 | 0 / 0 | 1 / 0 | 0 / 1 |

- **Act 2 is short and soft.** It takes 6–16 h after Ysolde (GDD: 3–7 days for a later act) and the bot almost
  never dies. Characters come out at L30, not the ~25 you asked for.
- With cooldowns on every skill, Act 1 still lands in 7–21 h. Warrior is slowest (16–20 h, 48–68 DPS).
- Chaos piles up: 114–571 per 36 h. The Act 2 tier 6–7 trash tables are the main source. Revisit with the
  Sanctum note.

Levers, cheapest first: `MONSTER_LIFE_SCALE` / per-monster `lifeMult` for Act 2 only, a higher `bossEvery`, or
lower Act 2 kill XP (an act-level XP scale), so the act takes longer per level instead of handing out levels.

## Smarter bot (2026-10-26, 12h, seed 1, active bot)

The bot now plays like a player who reads tooltips: it rebuilds its skill bar from every gem it owns (best guard and buff, a mana skill for casters, its three strongest damage skills on their suggested rules), sockets the support that adds the most damage, keeps its best life/mana/utility flasks on the belt, drinks mana when low and utility flasks against bosses, packs and wind-ups, and spends orbs on worn gear. Same build otherwise: instant spells, manual-by-default skills (the bot sets rules), 0.1 s cooldown floor.

| class | old bot: Act 1 / Act 2 / level at 12h | new bot: Act 1 / Act 2 / level at 12h | new: deaths, out of mana |
|---|---|---|---|
| Warrior | — / — / 13 | 4h42 / 7h23 / 39 | 0, 0% |
| Ranger | — / — / 20 | 2h58 / 5h19 / 41 | 4, 4% |
| Mage | 4h08 / 7h37 / 36 | 2h30 / 4h27 / 41 | 0, 1% |
| Duelist | 9h42 / — / 23 | 4h45 / 7h39 / 39 | 2, 5% |
| Templar | 6h06 / 9h28 / 35 | 2h24 / 4h56 / 41 | 0, 0% |
| Shadow | 6h17 / — / 29 | 3h48 / 7h10 / 39 | 2, 1% |
| Exile | — / — / 17 | 4h32 / 7h42 / 39 | 10, 10% |

- **Played well, Act 1 takes 2.4–4.8 h** against the 6–10 h active target, and Act 2 another 2–3 h (target 3–7 days). The old bot's slow classes were mostly the bot: it never changed its starter bar.
- **Every class ends on Lacerate + Backstab** (plus Infernal Blow, Pummel or Barrage). Both are "burst" attacks that lost their cooldowns with the attack change, so they're the obvious over-performers. Gem drops are plentiful, so every class owns them early.
- **Mana is fine with a mana flask**: 0–5% of fight time unable to afford a damage skill (Exile 10%). The old "Heavy Strike runs dry after 9 swings" worry only bites without a mana flask.
- Orbs are still hoarded (300–460 Chaos) because the bot only crafts worn gear with the basic orbs.

## Gem requirements, 8% attack scaling, tougher monsters (2026-10-26, seed 1, smarter bot)

Skill gems now need their own attribute (8 at gem level 1 → 116 at level 13) and attack gems gain +8% weapon damage per level (was 3%). Then monster life and damage were raised.

| Act 1 done | Warrior | Ranger | Mage | Duelist | Templar | Shadow | Exile |
|---|---|---|---|---|---|---|---|
| gem reqs + 8%, monsters as before (12h) | 2h37 | 3h18 | 4h36 | 3h05 | 2h13 | 3h16 | 4h46 |
| life ×2 (1.7), damage ×1.2 (14h) | 10h33 (33 deaths, 20% out of mana) | 10h15 (81 deaths, 38%) | 3h57 | 6h06 | 3h58 | 4h16 | 7h23 |
| **life 1.4, damage ×1.15 (kept)** (14h) | 12h05 (26% out of mana) | 4h08 | 3h43 | 3h55 | 4h20 | 4h16 | 6h02 |

- Monster strength is a poor pacing lever on its own: fast classes kill in a hit or two, so their pace is set by spawn rate and kills per boss, while tougher monsters starve attackers of mana (Warrior/Ranger 20–38% of fight time unable to afford a skill).
- Runs on one seed swing a lot (Ranger 10h15 → 4h08 between the two settings) because gem and item drops differ.
- Lacerate and Backstab still sit on most bars, but off-class copies are capped at gem level 5–11. Mage and Templar pick low-level Lacerate/Backstab/Infernal Blow over their own Intelligence spells: only the instant Frost Needle makes their bars, so spells look weak against attacks.

## Town, rare gems, gem level requirements (2026-10-26, 14h, seed 1, smarter bot)

Gems drop ~20× less from monsters and 4× less from bosses, every gem has a character level (Lacerate 18, Backstab 16, …), and the bot buys gems it lacks from the Town's Gem shop. It can't build the Crafting Bench (it never gathers), so it sells spare gear instead of salvaging.

| | Warrior | Ranger | Mage | Duelist | Templar | Shadow | Exile |
|---|---|---|---|---|---|---|---|
| Act 1 done | 5h18 | 5h31 | 3h14 | 7h15 | 3h24 | 4h48 | 9h23 |
| Act 2 done | 6h56 | 7h31 | 5h09 | 10h01 | 5h24 | 6h58 | 12h46 |
| gold at 14h | 774k | 755k | 894k | 403k | 1.07M | 770k | 212k |

- Pace stays in the range you called balanced.
- Selling everything floods the bot with gold (was 200–350k by 12h); real players who salvage will have less, but shop prices may need raising for sellers.
- Lacerate still ends on most bars, bought from the Gem shop once characters reach level 18.

## Skill pool pass (2026-10-27, not yet simmed)

- **Gem scaling.** Attack gems gain +6% of their own base weapon damage per level (`ATTACK_PCT_PER_LEVEL`, ×2.14 at 20), replacing +8 percentage points per *hit*, which made multi-hit skills run away (Barrage was ~3× Heavy Strike at gem level 20). Spells still scale their base damage +16% a level.
- **Requirements.** A gem needs its own character level at gem level 1 (`GEM_LEVELS`), rising evenly to 80 at gem level 20 (`gemLevelReq`); a level 1 gem needs 38 at gem level 10. Attributes go 8 → 120 → 245 at gem levels 1 / 10 / 20, ×1.3 for Lacerate and Backstab (`GEM_ATTR_MULTS`).
- **Buffs** so later gems beat the ones they replace: Judgement Hammer 250% (was 150%), 4.2 s, 9 mana, 50% convert, 25% stun; Glacial Lance 42–62 (was 24–38), 5 s cooldown; Frost Needle 3×3–7, 6% crit; Barrage 4×40%; Pummel 3×55%; Feint 110%; Ice Shot 115%.
- % weapon damage per second at gem level 1 / 10 / 20 (with ailments, before supports): Heavy Strike 47 / 73 / 102, Twin Strike 46 / 71 / 98, Barrage 59 / 91 / 127, Judgement Hammer 60 / 92 / 127, Backstab 80 / 123 / 171, Lacerate 134 / 206 / 287.
