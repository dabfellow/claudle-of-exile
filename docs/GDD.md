# Claudle of Exile — Game Design Direction (v0.2 draft)

> Status: **working draft for the polish pass.** Nothing built so far is final. This doc turns the 2026-10-21 feedback into concrete proposals. Items marked **[Decide]** need your call before we build them.

## 1. Vision

A browser idle ARPG people play for **weeks, months, years**. Melvor-style skilling and offline progress, Path of Exile-style loot and crafting, and combat that is **automated by your setup** — but hard fights demand a good setup, good gear and smart resource management. Idling is always an option, never the optimal way to push.

**Pacing target:** everything currently in the game, done 100%, should take **one full day** of dedicated play. Act 1 at launch is the first day; Acts 2–6 are weeks; maps are the long tail.

### Pillars
1. **Your build fights for you.** Skills, supports, tactics rules and flasks decide fights. You can step in manually, but a well-tuned setup wins.
2. **Loot is exciting, crafting is precise.** Monster drops give the big random wins; crafting is how you get *exactly* the item you want, and it's fuelled by combat currency.
3. **Skilling supports, it doesn't replace.** Gathering and production make you stronger and richer, but can't carry you through the campaign alone.
4. **Every screen reads at a glance.** Clean, consistent, animated, with real art.

### What we keep (you liked these)
- Combat juice: name card shake, crit flashes, floating damage, visible attack timers.
- Hideout you build up over time.
- Sell-all buttons. Crafting bench concept. Flask rack concept. The tutorial flow.

---

## 2. Progression & pacing

### Targets
| Milestone | Active play time (rough) |
|---|---|
| Finish tutorial | 20–30 min |
| Finish Act 1 (launch content) | ~1 day (6–10 h active, plus offline) |
| Each later act | 3–7 days |
| Maps unlocked (after Act 6) | ~1 month |
| Character level 100 / skill 99s | months |

### Changes from the prototype
- **Slower combat:** attack/cast rates roughly halved; trash fights take 5–15 s, bosses 1–3 min. Regen drops sharply so flasks and mana matter.
- **Character level** becomes its own XP track (PoE-style curve to 100), separate from skill levels. Combat XP is penalised for fighting far below your level.
- **Skill XP** reduced ~4× early; higher-tier nodes/recipes unlock with act progress, not only level.
- **Drop rates** cut: currency is scarce, rares are an event, uniques are a story.
- We'll build a **balance sim** (headless runs of the engine) to check every pacing target before we tune by feel.

---

## 3. Character

### Attributes (new)
- **Strength** → +life, +melee physical damage. **Dexterity** → +accuracy, +evasion. **Intelligence** → +mana, +energy shield (later).
- Gear and skill gems have **attribute requirements**, so builds have to plan for them.
- Attributes come mainly from the character tree and gear.

### Resources
- **Life** and **Mana** (new). Skills cost mana; mana regenerates slowly.
- Flasks: life, mana, and utility. Charges refill on kills.

### Classes
Warrior / Ranger / Mage at launch; ascendancies later.

---

## 4. Skills, supports & tactics (PoE2-style)

- **Skill gems** go into a **skill bar of 6 fixed slots** (no slot unlocks; growth comes from gems and supports).
- Each skill gem has its own **support slots**: starts with 1, expandable to 5 via gem level and a rare currency.
- **Support gems** modify the skill they're socketed into (more damage, extra projectiles, added fire, lower mana cost…).
- Gems **level up with use** and have attribute requirements.
- **Tactics rules** (the idle core): each skill gets a rule like *"cast when boss winds up"*, *"cast when mana > 60%"*, *"cast on cooldown"*, *"cast when life < 40%"*. You can always **cast manually** too.
- Hard fights need the right skills, rules and flask usage; trash you outgear can be fully idled.
- **Monster packs:** trash comes in packs of 1–5 and bosses bring adds, so single-target vs area is a real build choice.

### Skill roles
With 6 slots, a build mixes roles. Tactics rules make the roles matter:

| Role | Purpose | Typical rule |
|---|---|---|
| **Main** | Cheap, repeatable damage | cast on cooldown / when mana > X% |
| **Burst** | Big hit on a cooldown | cast when enemy life > 50% / on boss |
| **Area** | Hits the whole pack | cast when 3+ enemies |
| **Guard** | Answers telegraphed attacks | cast when boss winds up |
| **Buff / Curse** | Temporary power or enemy weakness | cast when not active |
| **Sustain** | Life/mana recovery | cast when life/mana < X% |

### Launch active skills (locked as launch draft)
| Attr | Skill | Role | Sketch |
|---|---|---|---|
| Str | **Heavy Strike** | Main | Slow, hard melee hit; can stun |
| Str | **Ground Slam** | Area | Cone slam hitting the whole pack |
| Str | **Iron Guard** | Guard | Block the next hit and gain armour for 3 s |
| Str | **War Cry** | Buff | Interrupts boss wind-ups, more damage for 6 s |
| Dex | **Twin Strike** | Main | Two fast hits, high crit |
| Dex | **Poison Dart** | Curse | Poison that stacks over time |
| Dex | **Smoke Step** | Guard | Guaranteed evade for 2 s |
| Dex | **Lacerate** | Burst | Big bleed on a cooldown |
| Int | **Spark** | Main | Cheap lightning bolts, chains between enemies |
| Int | **Fireball** | Burst | Big fire hit, ignites |
| Int | **Frost Ward** | Guard | Absorb shield, chills attackers |
| Int | **Arcane Siphon** | Sustain | Drains life and mana from the target |

### Signature supports (one per active)
Each active has a support built for it. It only fits that skill and changes how it plays, rather than just adding numbers.

| Skill | Signature support | Effect |
|---|---|---|
| Heavy Strike | **Shattering Blow** | Stunned enemies take more damage; hits break armour |
| Ground Slam | **Aftershock** | Chance to slam a second time |
| Iron Guard | **Retaliation** | Blocked hits trigger a counter-attack |
| War Cry | **Rallying Roar** | Longer buff, adds life regen; interrupts also stagger |
| Twin Strike | **Flurry** | Adds a third strike; attack speed ramps on consecutive hits |
| Poison Dart | **Virulence** | Poison spreads to nearby enemies when the target dies |
| Smoke Step | **Ambush** | The next attack after an evade is a guaranteed crit |
| Lacerate | **Hemorrhage** | Bleed bursts for its remaining damage when it expires |
| Spark | **Overload** | Extra chains; each chain hits harder |
| Fireball | **Inferno** | Ignite spreads and leaves burning ground |
| Frost Ward | **Glacial Shell** | When the shield breaks, the attacker is frozen |
| Arcane Siphon | **Soul Tap** | Overflow life becomes a temporary shield |

### General supports (fit any matching skill)
Added Fire · Added Cold · Added Lightning · Brutality (more physical, no elemental) · Elemental Focus · Faster Attacks · Faster Casts · Efficiency (lower mana cost) · Critical Strikes · Life Leech · Mana Leech · Multistrike (repeat attacks) · Spell Echo (repeat spells) · Chain (hits more enemies) · Lingering (longer guards/buffs/curses)

---

## 5. Two skill trees

| Tree | Points from | Changes |
|---|---|---|
| **Character tree** | Character levels + quest rewards | Attributes, life/mana, damage, defences, flasks, keystones that change how combat works |
| **Skilling tree** | Total skill levels / mastery | Gathering & production speed, double outputs, smithing item level, recipe unlocks, offline efficiency |

Keeping them separate means skilling never costs combat power and vice versa.

The character tree needs a full redesign:
- Small nodes = attributes and simple stats; notables = themed clusters; keystones = rule-changers.
- Each class starts in its attribute region; hybrids live between regions.
- **Launch target:** ~120 nodes, designed on paper first (node list + layout) before code. Drafted together in Phase 4.

---

## 6. Combat & campaign UI

Split the current all-in-one Combat page:

- **Combat tab** — *what am I fighting and how am I doing?*
  - You vs enemy cards (keep the animations), with **your** offensive/defensive stats and the **enemy's** stats/resists/abilities side by side.
  - Skill bar with cooldowns, mana costs and tactics rules; flask belt.
  - Boss mechanics telegraphed clearly.
- **Campaign tab** — *where am I going?*
  - Acts → areas map, area level, completion, boss, unlocks. Act 1 polished for launch; Acts 2–6 shown as locked/coming.
  - Maps unlock after Act 6.
- **Right sidebar** gets tabs: **Activity · Combat log · Loot history** (moved out of the main page).
- **Always-on XP bar** at the bottom of the screen (PoE-style): character level, % to next, XP/hour, and a slim bar for the skill you're currently training. Level-ups get a burst effect.

---

## 7. Items, flasks, tooltips

- **Tooltips:** hold **Alt** for the advanced view (tiers, ranges); **click to pin** a tooltip so you can compare several items side by side.
- **Flasks become items** with their own affixes (e.g. increased recovery, extra charges) plus a separate **enchantment slot**. Instilling is an enchantment, not a dropdown on the rack.
- **Equipment screen:** gear paper-doll front and centre; **offensive stats on the left, defensive on the right**; a proper **checkered grid inventory** underneath.

---

## 8. Stash & trader

- **Stash:** PoE-style tabs — a dedicated **Currency tab** laid out like a real tab (fixed slots per orb), **Materials** tab, and grid tabs for items. Readable at a glance, art icons, stack counts.
- **Trader's Stall:** an NPC with portrait and personality, **Buy / Sell** tabs, item art, clear prices. Keep sell-all buttons.
- **Future:** loot/sell filter rules (TODO, post-launch).

---

## 9. Economy & loot balance

Goal: drops feel good, crafting gives precision, and passive grinding is an option but not the best path.

- **Monsters** drop most good gear, all high-tier currency, and unique items.
- **Crafting** uses combat currency (scarce), so precise crafting still requires fighting.
- **Smithing** makes good *bases*, but the item level is **capped by campaign progress** (you can't smith Act 4 bases while in Act 1).
- **Gathering nodes are tied to acts:** better ore, wood and herbs unlock as you reach new areas.
- **Risk:** pushing an area under-geared means deaths and lost time; area level vs your defences is shown before you enter.
- **Achievements** unlock bench recipes (e.g. "Craft 100 rares" unlocks a new bench mod).

**Death:** sent back to the hideout and lose **5% of the XP toward your next character level** (never de-levels).

---

## 10. Acts

| Act | Status at launch | Notes |
|---|---|---|
| 1 | Fully polished | *The Drowned Coast*: Mud Flats → Brine Caves → Ashen Woods → Blackreed Marsh → Sunken Crypt → Ship Graveyard → Storm Cliffs → Drowned Sanctum (act boss Ysolde). The old Molten Forge and Celestial Spire themes are kept for later acts |
| 2–6 | Locked, "coming soon" | Each adds areas, gathering tiers, item tiers, skills |
| Maps | Locked | Endgame unlocks after Act 6 |

**Story** is the very last thing added.

---

## 11. Accounts & cloud saves

Supabase with Google and Discord login, plus a cloud `characters` table. Guest play stays available and can be linked to an account. Setup steps for you: [AUTH_SETUP.md](AUTH_SETUP.md).

---

## 12. Art

Real art for NPCs, stations, zones, classes, items, orbs and monsters, generated with ChatGPT in one consistent style. Prompts: [ART_PROMPTS.md](ART_PROMPTS.md).

---

## 13. Proposed build order

Each phase ends with something playable and reviewed with you before the next.

1. **Numbers & foundations** — pacing rework, attributes, mana, character level, balance sim. ✅ *Done — see [BALANCE.md](BALANCE.md).*
2. **Combat 2.0** — skill gems, supports, skill bar, tactics rules, new Combat tab, Campaign tab, sidebar tabs, always-on XP bar. ✅ *Done.*
3. **Items & UI** — flask items + enchants, pinned/Alt tooltips, equipment layout, stash rework, trader rework. ✅ *Done — art drops in automatically from `src/assets/art/` when added.*
4. **Trees** — character tree redesign (node list first), skilling tree. ✅ *Done — see [TREES.md](TREES.md).*
5. **Economy** — drop tables, crafting gating, act-tied gathering, achievements → bench recipes. ✅ *Done — tables in `data/drops.ts`, 26 achievements in `data/achievements.ts`.*
6. **Accounts** — Supabase login and cloud saves (as soon as you finish the setup guide; can happen in parallel).
7. **Art pass** — drop in generated assets, final visual polish. 🔧 *Pipeline done: every slot (portraits, scenes, stations, zones, monsters, currency, materials, flasks, items, uniques, gems — 169 images) shows art when present; `npm run art` imports/resizes and reports coverage. Waiting on generated images.*
8. **Act 1 content & balance** — areas, boss, tuning against the pacing targets, launch checklist. ✅ *Done — Act 1 is 8 areas (levels 1–25) ending in Ysolde, the Drowned Queen; bosses gain mechanics (slam, nova, summon, enrage, ward) as the act goes on; sim puts Act 1 at 6–10 h for every class. Remaining launch work: [LAUNCH.md](LAUNCH.md).*

Post-launch: Acts 2–6, maps, ascendancies, loot filters, story.

---

## 14. Decisions log

| Question | Decision (2026-10-21) |
|---|---|
| Death penalty | Back to hideout + lose 5% of XP toward next character level (no de-leveling) |
| Skill bar | Fixed 6 slots; supports per gem 1 → 5 |
| Offline combat | Full speed using your tactics rules; hard boss mechanics can't be auto-cleared; deaths still happen. Skilling offline at full speed |
| Monetisation | Cosmetics / supporter packs only — never pay-to-win. Plan account/shop design so cosmetics can be added later |
| Monster packs | Yes — trash in packs of 1–5, bosses with adds |
| Skill list | 12 actives + 12 signature supports (one per active) + 15 general supports, locked as the launch draft; numbers tuned in Combat 2.0 |
| Character tree node list | Drafted in Phase 4, once attributes/mana/skills exist |

### Still open
- Character tree node list — Phase 4.
