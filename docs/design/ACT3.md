# Act 3: The City of Saints

Decided 2026-10-31. It's Milestone 6 of [MILESTONES.md](../MILESTONES.md), planned from the checklist in
[ACT_RECIPE.md](ACT_RECIPE.md).

## Smaller calls

- **Stages:** 10. Act 3 starts the growth from 8, and each new stage is one more boss to beat.
- **Level band:** monster levels 33–41, carrying straight on from Act 2 and adding the ~8 levels per act.
- **Region:** the south of the map, as `src/data/continent.ts` already has it. The road from the Burning Throne leads
  there.
- **First trial:** the act's first stage, so the choice comes as soon as you arrive, as you decided.
- **Lacerate:** arrives here, as already decided in Act 1's skill split.
- **Ascendancy points:** the trial gives 2, then each Act 3 boss gives 1. That fills most of the gate's branch by the
  end of the act, with the notables still sealed until the Act 4 trial.
- **Rewards:** bases up to about level 45 start dropping, plus 6 new uniques, as in Act 2.

## Decisions (2026-10-31)

1. **The living city:** a walled holy city still full of people, ruled by zealots who burn out anything unclean. You
   arrive as an exile and get treated as one. Monsters are mostly human: inquisitors, flagellants, temple guards, relic
   hunters. It's the first act where the enemy believes they're right.
2. **Martyrs:** the boss is untouchable while its chained martyrs live. By hand, you click them first. By rule, you set
   a skill to aim at martyrs. It's the first time rules decide what you hit, and it's early practice for the aiming that
   [HARD_BOSSES.md](HARD_BOSSES.md) needs.
3. **Lightning:** holy wrath as smiting light. Shocked ground rules already work.
4. **Zealots and blood:** bleeding, self-sacrifice and skills that spend Life for power, with Lacerate. Supports like
   "hits harder while you're below half Life" bring a new risk.
5. **Rune-carving, feeding runes:** carve runes that enchant your gear, using materials you already gather. It's a
   production skill, so it gives old materials a new use and gives gear a new slot to chase.

## Stages

Built 2026-10-31. Levels climb one at a time, tiers run 7 to 9, and items roll 3 levels above the monster (`ilvlBonus`), so the act boss reaches bases of about level 45.

| # | Area | Levels | Tier | Boss (level) | Mechanics | New uniques |
|---|---|---|---|---|---|---|
| 1 | The Pilgrim Gate | 33–34 | 7 | Warden-Captain Ansel (34) | slam, nova, summon | The Pilgrim's Road |
| 2 | The Alms Quarter | 33–35 | 8 | Mother Almoner Ilse (35) | slam, nova, martyrs | Chainbreaker |
| 3 | The Scourging Yard | 34–36 | 8 | Brother Cato, the Flayed (36) | slam, enrage, martyrs | Martyr's Shroud |
| 4 | The Reliquary Vaults | 35–37 | 8 | Odile of the Long Dig (37) | slam, summon, martyrs | Hood of the Last Confession |
| 5 | The Bell Foundry | 36–38 | 8 | Bellfounder Harl (38) | slam, nova, scorch | Shard of the Saint |
| 6 | The Hall of Inquisition | 36–38 | 9 | Grand Inquisitor Maren (38) | slam, nova, ward, martyrs | Halo of Wrath |
| 7 | The Stair of Penitents | 37–39 | 9 | The Unshriven Knight (39) | slam, summon, enrage, martyrs | |
| 8 | The Choir Loft | 38–40 | 9 | Cantor Liselle, Voice of Wrath (40) | slam, nova, ward, scorch, martyrs | |
| 9 | The Saints' Walk | 39–41 | 9 | Saint Oren the Living (41) | slam, nova, summon, enrage, martyrs | |
| 10 | The High Altar | 40–41 | 9 | Hierarch Solenne, Voice of Heaven (42, act boss) | all seven | all six |

The Pilgrim Gate's boss stays plain so the ascendancy trial can hook onto it. The Bell Foundry has no martyrs either, as a breather before the Hall.

**Lightning:** every boss's nova and ground is lightning, and lightning leads the trash ahead of physical, with a few fire and cold monsters mixed in. Each new unique carries lightning resistance and feeds one class's meter.

## Martyrs (`martyrs`)

- The boss arrives chained with 2 martyrs beside it, and chains 2 more at 50% life. Knobs: `BOSS_MARTYR_*` and `MARTYR` in `zones.ts`.
- While any lives, nothing hurts the boss: hits show as blocked, and ailments, ground and novas do nothing. It keeps fighting.
- Martyrs stand still, never attack, have half a trash monster's life, and give no xp, loot or kill count.
- Only a blow aimed at a martyr lands. Targeting skips martyrs, and area skills, chains, ailments, ground and novas pass over them, so an area build can't clear them by accident and the rule is really needed.
- A martyr is always in reach of a skill aimed at it, because adds and a summoning boss could otherwise wall melee off for good.
- A chained boss goes last in the target order, so a character with no answer at least clears the adds.

**By hand:** click a martyr; any attack then goes for it, the Default Attack included. **By rule:** set a skill to aim at Chained martyrs.

## Aim rules

Built for question 6 of [HARD_BOSSES.md](HARD_BOSSES.md). `TacticRule.aim` sends the skill at a `SkillAim`, ahead of the bar's targeting. A clicked monster still comes first. With nothing to aim at, the skill goes for the usual target. The first rule that sets an aim decides, and the Skills dialog keeps it on the first rule, so it survives changing what that rule watches.

To add a moment in a later act: add it to `SkillAim` and `SKILL_AIMS`, and teach `inAim` in `combat.ts` what it picks out. Weak points and choir adds are monsters, so that is all they need. The range exception for martyrs is in `skillTarget`.

**Unlock:** War Table level 6, as Aim rules, between Wind-up rules and the third rule slot. Every other rule group is taught there. It sits below the third slot because that one needs yew and mithril, which a character at the second stage may not have, and clicking works until then. The third slot moved up to level 7; `alignWarTable` moves anyone who already holds it, and they get Aim rules with it.

**Offline:** like wind-ups, a martyr boss stays in hiding while you're away unless a damage skill on the bar has a rule (not Manual only) aiming at martyrs. Otherwise the hours would go on a fight that can't end. See `bossLeftToRules` in `automation.ts`.

## How to reach it

`preview: true`, `open: false` on Act 3 in `ACTS`, the same gate Act 2 used: it plays in dev builds, tests and the sim, never in `npm run build`. To jump there in a dev build, from the browser console:

```js
game.act((s) => { s.bossesDefeated.push('burningthrone', 'pilgrimgate'); s.unlockedZones.push('pilgrimgate', 'almsquarter'); s.zoneKills.almsquarter = 25; });
```

To release it: set `open: true`, once stages, Zealots and blood skills, Rune-carving and ascendancies are all merged.
