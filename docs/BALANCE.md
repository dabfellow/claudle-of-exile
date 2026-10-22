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
| Kill XP | `engine/combat.ts` `monsterXp` | `(5 + 3·level) × 10 for bosses`, × level-difference multiplier |
| Death penalty | `engine/character.ts` | 5% of xp toward next level |
| Player attack speed | `engine/stats.ts` `PLAYER_SPEED_SCALE` | 0.65 |
| Monster life / attack interval | `data/zones.ts` | ×1.8 / ×1.6 |
| Base life regen | `engine/stats.ts` `BASE_REGEN_PCT` | 0.5%/s |
| Skill XP | `data/skills.ts` `SKILL_XP_SCALE` | 0.3 |
| Drops | `data/drops.ts` `DROP_TABLES` | per area tier: currency 4.5→5.5%, items 6→7%, rare share 4→12%, unique 0.05→0.1%; chaos from tier 2, exalted/divine from tier 3, instill from tier 4 |
| Boss drops | `data/drops.ts` `BOSS_TABLES` | first kill guarantees the tier reward (2 transmute → 1 exalted), then 10% per kill (`repeatChance`); 2–4 extra currency rolls |
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

## Known gaps (fixed by later phases)
- The five current zones span levels 1–45; Phase 8 restructures them into Act 1 (≈ levels 1–15) and later acts.
- Bot gear scoring is crude, so DPS varies a lot with drop luck (e.g. one Warrior run ended on 30 DPS).
