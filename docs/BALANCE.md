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
| Player attack speed | `engine/stats.ts` `PLAYER_SPEED_SCALE` | 0.65 |
| Monster life / attack interval | `data/zones.ts` | ×1.8 / ×1.6 |
| Base life regen | `engine/stats.ts` `BASE_REGEN_PCT` | 0.5%/s |
| Skill XP | `data/skills.ts` `SKILL_XP_SCALE` | 0.3 |
| Drops | `data/drops.ts` `DROP_TABLES` | per area tier: currency 4.5→5.5%, items 6→7%, rare share 4→12%, unique 0.05→0.1%; chaos from tier 2, exalted/divine from tier 3, instill from tier 4 |
| Boss drops | `data/drops.ts` `BOSS_TABLES` | first kill guarantees the tier reward (2 transmute → 1 exalted), then `repeatChance` per kill (10% tiers 1–3, 6% tier 4, 1.5% tier 5); 2–3 extra currency rolls |
| Boss mechanics | `data/zones.ts` `BOSS_*` | slam ×2.5 every 9 s (2.2 s wind-up); nova ×1.8 every 13 s (2.6 s wind-up, ignores blocks); summon up to 2 adds every 16 s; enrage below 35% (+50% attack speed, +30% damage); ward 12% of life at 66%/33%, heals 10% if not broken within 8 s |
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

## Known gaps
- Bot gear scoring is crude, so DPS varies a lot with drop luck (e.g. one Warrior run ended on 30 DPS).
