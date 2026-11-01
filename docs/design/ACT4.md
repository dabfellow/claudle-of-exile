# Act 4: The Hollow Peaks

Part of Milestone 7 in [MILESTONES.md](../MILESTONES.md), built from [ACTS_4_6.md](ACTS_4_6.md) and the checklist in [ACT_RECIPE.md](ACT_RECIPE.md). Built 2026-11-01.

The giants' range: huge frozen peaks where you're small. Monsters are large and few, so it plays as a change from swarms. Cold is the check, repeating Act 1's at a higher level.

## Stages

Levels climb a step at a time, tiers run 9 to 11, and items roll 7 levels above the monster (`ilvlBonus`), so the act boss reaches bases of about level 57. That's a third of the way from Act 3's 45 to the 80 that Act 6 ends on.

| # | Area | Levels | Tier | Boss (level) | Mechanics | New uniques |
|---|---|---|---|---|---|---|
| 1 | The Hollow Pass | 41–42 | 9 | Hrolf Toll-Taker (42) | slam, nova, summon | Rimewalkers |
| 2 | The Scree Fields | 41–43 | 10 | Asa Stone-Thrower (43) | slam, nova, frostbite | Frostgrip |
| 3 | The Howling Fells | 42–44 | 10 | Fenrik, Father of Wolves (44) | slam, summon, frostbite | Wolfmother's Pelt |
| 4 | The Glass Lake | 43–45 | 10 | Mirrawen of the Ice (45) | slam, nova, ward, frostbite | Heart of Winter |
| 5 | The Bone Quarry | 43–45 | 10 | Ulfhild Bone-Mason (45) | slam, enrage, frostbite | The Giant's Knuckle |
| 6 | The Blue Vault | 44–46 | 10 | Skaldi the Cold Hoard (46) | slam, nova, summon, frostbite | Crown of the Hollow |
| 7 | The Mammoth Road | 44–46 | 11 | Old Tusk (46) | slam, enrage, scorch | |
| 8 | The Hanging Glacier | 45–47 | 11 | Sigrun, Voice of the Glacier (47) | slam, nova, scorch, frostbite | |
| 9 | The Stone Steading | 46–48 | 11 | Borghild of the Long Table (48) | slam, summon, enrage, frostbite | |
| 10 | The Long Hall | 47–48 | 11 | Thane Gunnvor (48) | slam, nova, enrage, ward, frostbite | |
| 11 | The King's Stair | 48–49 | 11 | Hallvard Kingsguard (49) | slam, nova, summon, enrage, frostbite | |
| 12 | The Giants' Throne | 48–49 | 11 | Ymir Vane, the Hollow King (50, act boss) | all but martyrs | all six |

The Hollow Pass has no Frostbite, so the first boss teaches the band and the second teaches the mechanic. Old Tusk has none either, as a breather before the second half. Martyrs stay out: they're the City's own, and Act 6's Echoes is what brings old mechanics back.

**Large and few:** waves are 1–2 monsters, and big ones have about twice the life and half as much damage again as usual. Waves arrive every 11–12 s rather than 9, and the boss comes after 16 kills rather than 25. A lone monster gets no pack discount, so each one is a fight, and quick wolves and cats keep a mix.

**Cold:** every boss's nova and ground is cold, and cold leads physical on trash, with no fire or lightning. Each new unique carries cold resistance and feeds one class's meter.

## Roads

Forked on 2026-11-01. The act boss needs 8 of the 11 other bosses. From the Hollow Pass, a high road (Scree Fields, Glass Lake, Hanging Glacier) and a low road (Howling Fells, Bone Quarry, Mammoth Road, Stone Steading) meet at the King's Stair, below the Throne. Side areas: Blue Vault (off the Glass Lake), Long Hall (off the Steading). See [ACT_RECIPE.md](ACT_RECIPE.md) → Roads.

## Frostbite (`frostbite`)

- A stack builds on you every 2.5 s through the boss fight, and each slows your actions by 4%. Knobs: `BOSS_FROSTBITE_*` in `zones.ts`.
- At 10 you freeze solid: a cold hit of twice the boss's hit that blocks don't stop, then 3 s without actions. Stacks start again from nothing after the freeze.
- Cooldowns, flasks, the hawk and Ripostes all keep working in a freeze. Only your turn stops.
- They stop with the boss that brought them.

**By hand:** a guard or movement skill shakes off 5 stacks, and any flask clears them all and breaks the ice. **By rule:** the `frostbite` condition fires a skill at a stack count, or an Instilling Orb makes a flask drink itself at 6.

- **A guard cleanses 5, not all,** so a guard on wind-ups doesn't answer the whole mechanic by accident, and spending it on Frostbite can leave you without it for the next slam. That's the choice the rule asks you to make.
- **The rule waits for the swing in hand,** so a heavy attack at 6 stacks can run into the cap. That's why it suggests 5, and the slower the build, the lower it wants setting.
- **A lone 7 s guard doesn't stop every freeze** on a boss that also lays Frozen ground, and it isn't meant to. In the test it cuts freezes by about 40% and outlasts the same fighter without it in every seed; a second answer does the rest.

**Unlock:** the rule is in the Vitals group, which the War Table teaches at level 2. It reads your own state, like life and mana, and it costs nobody a new level. A new group would have needed its own level, which moves every level after it again, straight after Act 3 did the same for Aim rules. The War Table's Vitals line mentions it, and the rule and the flask enchantment stay out of the lists until Act 4 opens (`act: 4` on `RULE_LABELS` and `INSTILL_CONDITIONS`).

**Offline:** like martyrs, a Frostbite boss stays in hiding while you're away unless something answers it by itself: a guard or movement skill on the rule, or a flask Instilled for it. See `bossLeftToRules` in `automation.ts`. Otherwise the hours would end in a freeze and a death.

**Sim bot:** `manageSkills` puts the rule on a spare guard, or the mover, in a Frostbite area; `instillFlasks` turns a utility flask to Frostbite there; `hands` presses a cleansing skill at 5 stacks and drinks at 8.

## Frozen ground (`frozen`)

**Its own kind, not `chilled` renamed.** The peaks' cold is worse than the rest: Frozen ground slows you by 40% rather than 25%, and Frostbite builds twice as fast on it. So a rule has a real reason to tell them apart, the Ground rule list gains a new entry as the act table in [ACTS_4_6.md](ACTS_4_6.md) asks, and old rules on Chilled ground keep meaning what they did. Changing `chilled` would also have changed Acts 1–3.

`groundFor(type, rime)` picks it. A monster with `rime` lays Frozen ground instead of Chilled (the `rime()` wrapper in `zones.ts`), which covers every Act 4 boss and caster. Chilled ground stays in the game for everything else, including the player's own skills. A rule on Chilled ground doesn't fire on Frozen ground.

## Second trial

The first kill of the Hollow King passes trial 2: it gives its 2 points and opens the notables and bridge. `TRIALS` in `ascendancies.ts` names `giantsthrone`. The other 11 Act 4 bosses give 1 point each, as `ASCENDANCY_BOSS_ACTS` already said.

**The cap makes these points moot.** Points stop at 11, and Act 3 alone gives 2 + 9 = 11, so a character who has cleared Act 3 already holds every point and Act 4 adds nothing. What the trial really gives is the seal coming off. That's as [ASCENDANCIES.md](ASCENDANCIES.md) says, so it's left alone.

**The dev `passTrial(1, 2)` "+1":** display, not a bug. Before you choose, the Ascendancy tab's badge counts the waiting choice, so it says +1 whatever you hold. The state held 4 points (the trial's 2, plus the 2 the dev call tops up), and the badge said +4 the moment an ascendancy was chosen.

## Rewards

- **Bases:** no new bases were needed, as they're written up to 80 already: `ilvlBonus: 7` lets level 57 and under drop.
- **Tiers 10 and 11** are new rows in `DROP_TABLES` and `BOSS_TABLES`, carrying on the same climb. Each kill is worth a little more, as there are fewer of them.
- **Achievements:** `act_4` and `conqueror_4` are written, and appear when the act opens.

## Art

All 60 monsters and the 6 uniques have their own picture, listed in [ASSET_MAPPING.md](ASSET_MAPPING.md). Banners reuse GegX landscapes until a landscape pack arrives.

## How to reach it

`preview: true`, `open: false` on Act 4 in `ACTS`, the same gate as Act 3: it plays in dev builds, tests and the sim, never in `npm run build`. To jump there in a dev build, from the browser console:

```js
game.act((s) => { s.bossesDefeated.push('highaltar', 'hollowpass'); s.unlockedZones.push('hollowpass', 'screefields'); s.zoneKills.screefields = 16; });
```

To release it: set `open: true`, once stages, the Giants and weight skills and Archaeology are all merged.

No save migration: every new field is optional, so `SAVE_VERSION` stays 25.

## Hooks for other sessions

- First area `hollowpass`, last area `giantsthrone`.
- `MonsterDef.rime` and `MonsterInstance.rime` are new. `groundFor` takes it as a second argument.
- `RuleContext` has a new required field, `frostbite`.
- `CombatRuntime` gained optional `frostbite` and `frozenMs`.
- A new guard or movement skill cleanses by itself (`cleansesFrostbite` in `automation.ts`).
