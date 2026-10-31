# To-do

Seeded 2026-10-24 from the open items in `docs/`. **[You]** = needs you, not Claude.

## Open

### Roadmap — see [ROADMAP.md](ROADMAP.md), decisions in [DESIGN_RESET.md](DESIGN_RESET.md)
- [ ] Milestone 1: automation and offline rules. Older balance, Act 2 and skill items below restart at their roadmap milestone.

### Launch (Act 1) — see [LAUNCH.md](ops/LAUNCH.md)
- [ ] Demo mode and email login: new players get an unsaved demo, email + password joins Google and Discord, and browsers with guest characters keep them ([SETUP.md](ops/SETUP.md)).
  - **[You]** In Supabase: turn on the Email provider, turn Confirm email off for now, check the live URL is in Redirect URLs.
  - Then test on the live site: sign up, log in, password reset, and demo carryover through email, Google and Discord.

### Act 2: The Burning Steppe — [ACT2.md](design/ACT2.md)
- [ ] Release Act 2. The framework is built and playable in dev only (preview).
  - **[You]** Confirm the level band: areas are monster level 24–33, and the sim's characters leave at L30 (you said 17–25).
  - Slow it down: 6–16 h after Ysolde with almost no deaths (BALANCE.md → "Act 2 preview").
  - Art for 8 areas, 40 monsters, 6 uniques from asset packs.
  - Then `open: true` on Act 2, Settings → About text, deploy.

### Town feedback (your walkthrough, 2026-10-25)
- [ ] More skills to train (Hideout skill list feels thin).
  - Later: Thieving (Heist), Archaeology (Expedition), Cartography, Fletching, Rune-carving ([SKILLING_REWORK.md](design/SKILLING_REWORK.md) §8). You like all of them; they're listed on the in-game Coming soon page for now.
- [ ] Side feed (Activity / Combat log / Loot): you're lukewarm on it; revisit later.
- [ ] Achievements page look: later pass.
- Art (parked with the other art): trader portrait is too cartoony; materials need more icons.
- [ ] Skill masteries on the Hideout skill tiles (you: coming later; the skills themselves are with the gathering session).

### Character feedback (your walkthrough, 2026-10-25)
- [ ] Campaign art pass: you like the continent-map style; it needs real art. The area card is still a poor way to show the info and needs its own art pass.
- [ ] **[You]** Gem artwork: gems now show plain silhouettes (`GEM_GLYPHS` in `src/ui/assets.ts`); pick which you like or what to replace.
- [ ] Skill bar auto setup (rules and priority) needs a big overhaul. Needs design with you: more priority control, maybe more.
- [ ] Support gems limited to some skill types (e.g. only Warcries): not built yet, beyond the current attack/spell/melee fits.
- [ ] Attack mana costs: with a mana flask the bot is short of mana 0–5% of fight time (Exile 10%), so costs look fine; only matters if you play without a mana flask.
- [ ] Auto-crafting needs real design work later (you: "way later").
- Inventory look is with the other session; the Equipment and Bench bag views should improve with it.

### Skill pool (your review, 2026-10-27)
- [ ] New skill gems for character levels 20–40: nothing unlocks between 16 and Lacerate's 35 (you: paused for now).
- [ ] Next round of skills and supports: more Dexterity and Intelligence buffs (both buffs today are Strength), and real curses (the old "curse" role on Poison Dart was removed).
- [ ] Str/Dex mana: they should stay mana-hungry, but need a mana leech option (passive tree or support), costs paid with life, or uniques/mana regen to stack, on top of flasks.
- [ ] Ailment overlays on the player while you're taking them: poison a green overlay, bleed a darker red, shock little blue lightning bolts, freeze a ~20% light blue tint over the whole thing.
- [ ] Battlefield follow-ups ([BATTLEFIELD.md](design/BATTLEFIELD.md) → As built):
  - Sim rerun on the new field; expect melee to need a buff (closing-in time and movement speed are the first knobs).
    - 2026-10-28: first run was skewed by sim-bot bugs (now fixed: unusable-skill scoring, never retreating from a walled boss). Clean rerun (new vs old code, seeds 1–2, 14h) still to do; early signs: Mage/Templar faster, a sword-only Duelist's Twin Strike ~⅓ of dual-wield.
  - Zone side weighting for the gates (`spawnSides`).
  - You played it: it feels awesome (2026-10-30).
- [ ] Re-run the sim after the gem scaling and skill buffs below; multi-hit attackers (Barrage, Twin Strike, Pummel) lost damage at high gem levels.

### UI feedback (your walkthrough #2, 2026-10-25) — you test at 1440p and 4K
- [ ] **[You]** Check the Town: shop prices (~5k magic / ~12k rare at level 24), gem levels (`GEM_LEVELS` in `src/data/gems.ts`), shopkeeper names (Ilsa, Varro, the Gemwright).
- **[You]** Icons: gathering nodes (Copper Vein, Scorched Seam …) and currency need art; you'll go through icons yourself.
- Campaign: needs real area art (already above). Map Device: work in progress.

## Ideas / later
- Endless content: a post-Maps thing, not designed yet.
- Custom SMTP for Supabase, so Confirm email can go back on and password resets aren't held to the built-in mailer's few emails an hour.
- Affix pool numbers are a vibe pass, not simmed: 30% leech, ~200% rarity per item, ~294% elemental at item level 80. Re-run the sim and look at sustain and drop rates ([GEAR.md](design/GEAR.md) → Affix pool).
- Attack speed and crit chance on weapons are still global (PoE has them local); base implicits like a mace's % physical are global too.
- Uniques with % defence mods (e.g. 40% increased Evasion on boots) became local, so they're weaker than before.
- Gear above level 34 can't drop until Act 3+; smithing uses mithril for everything from level 22 up; new weapons and shields have placeholder icons ([GEAR.md](design/GEAR.md) → Known gaps).
- Spells look weak against attacks: Mage and Templar take low-level Lacerate/Backstab over Spark, Fireball and Glacial Lance (sim, 2026-10-26).
- Cooldowns for attacks so the best one isn't just spammed (you: later).
- At 1440p/4K pages stop at 1280px wide (`.page` max-width), leaving wide empty margins; consider a wider cap on big screens (your call).
- The sim (`scripts/sim.ts`) doesn't smith or cut gems, so the Smithing/Gemcutting cost change isn't reflected in balance runs.
- Campaign screen: move things around and give it art (you: "doesn't look terrible", 2026-10-27; art item is under Character feedback).
- Bench orb bar: you want more things in the banner clickable later; fossils/essences live under Equipment for now.
- Quivers don't exist yet; when added they go in the off hand (bows are two-handed today, so that needs a rule).
- Uniques with "% increased Mana Regeneration" (Wellspring, …) now only scale flat mana regen; give them some flat regen if they feel dead.
Parked 2026-10-24 until more of the game is built: testing, sim balancing and art.
- Class balance doesn't need to be exact. Sim notes in [BALANCE.md](design/BALANCE.md) for when it's picked back up:
  - Warrior missed Act 1 in 14 h on 2 of 3 seeds (33–54 DPS vs 50–100 for others).
  - Ranger and Duelist ran 10–13 h on some seeds.
  - Bot now crafts worn gear with basic orbs but still ends with 200–350k gold and 300–460 Chaos.
- Revisit Sanctum chaos farming (85–155 per 14 h) when Act 2 lands.
- Art comes from asset packs: a final visual pass (area cards, combat screen, phone widths), swapping any loose matches in [ASSET_MAPPING.md](design/ASSET_MAPPING.md) as better pieces turn up.
- Bot only enters an area within a level of its minimum, so the sim can't tell whether players could push Act 2 earlier.
- Skilling band Lv 20–40 for Act 2 (Mithril / Yew / Emberroot) isn't built; gathering nodes stop at the Storm Cliffs.
- Chill now always slows attacks 15% (was 0% without `chillOnHit`); watch whether chilled ground is too strong.
- Clarity cuts every skill's mana cost, not just spells; split out a spell-only stat if that matters.
- Ascendancy classes — and decide whether they twist the class mechanic or add something separate.
- Skilling bands above Lv 20 (Act 2+), including Chaos / Regal recipes — [SKILLING_REWORK.md](design/SKILLING_REWORK.md).
- Gemcutting "Prisms" as its force material.
- Mastery per action (Melvor-style), once higher skilling bands exist.
- Loot / sell filter rules (post-launch, GDD §7).
- Cosmetics shop (never pay-to-win).
- Acts 3–6 and Maps.

## Done
- [x] Before the balance pass: Challenge boss button (a ready boss waits so an area can be farmed; Auto-challenge beside Auto-flee sends it in on its own, online and, with wind-up rules, offline); version number in the sidebar from 0.2.3; more gear on every tier (6–7.5% → 15–18% per kill), basic orbs doubled on tiers 1–2, starter drops (5 bases, 2 Transmutes, 2 Alterations over a new character's first 14 kills); the ground no longer clears on leaving an area or on one death: a second death loses what the first left unclaimed. Sim not rerun — done 2026-10-31
- [x] Docs updated for the reset: GDD rewritten as the current design, built-system docs note what changes, art notes corrected — done 2026-10-30
- [x] Design reset settled: finished game, pacing, core systems, act recipe, live game, roadmap ([DESIGN_RESET.md](DESIGN_RESET.md)) — done 2026-10-30
- [x] Retired docs deleted (AI art prompts, the superseded new content pass) and `npm run art -- --docs` removed — done 2026-10-30
- [x] Docs condensed: `design/` and `ops/` folders; merged setup, town + stash, and skills + uniques docs; links and code comments updated — done 2026-10-30
- [x] Support mail tested: mail to support@dabfellow.party lands in Gmail (you) — done 2026-10-30
- [x] Admin setup: SQL from [SETUP.md](ops/SETUP.md) run, you're in `admins`, Admin page checked with real data (you) — done 2026-10-30
- [x] Rotated the Google and Discord OAuth client secrets (the old ones in git history are dead); both logins tested on the live site, old Google secret deleted (you) — done 2026-10-30
- [x] Battlefield redesign ([BATTLEFIELD.md](design/BATTLEFIELD.md)): 34-hex half-ring with you on the bottom edge, 4 rings; every edge hex is a spawn gate; monsters slide between hexes and walk in from past the edge; casters stop at ring 3; skill ranges (melee 1, Lacerate 2, Poison Dart 3, bows/spells whole field) with closing in on monsters out of reach (faster with movement speed; Quicksilver gives 40%); arc / beam / nova area shapes; targeting setting (priority + order) and click-to-target; weapon restrictions on attack skills, spells 20% stronger with a caster weapon; phone-width summary; save v19 restarts fights in progress. Not simmed — done 2026-10-27
- [x] UI pass 4 (your walkthrough, 2026-10-27): Hideout gear click opens the item menu (take off, to stash, salvage); Combat out of a fight shows only "Pick an area" and life/DPS; "Armour shop" renamed Weapon & Armour shop (it always sold swords, axes, bows); Crafting Bench: orb bar pinned on top, selected item pinned on the left while you scroll, Equipment top right with Auto-crafting and Special crafting (fossils, essences) under it, Bench Crafts beside; Skills page shows the bar like combat (#1–#6 priority), click a skill for a popup with priority, trigger, supports, swap and remove; Smithing split into slot tabs (Weapons … Jewellery) with collapsible tiers, newest tier open — done 2026-10-27
- [x] Affix pool pass: 9 tiers to item level 80 (top 5 roll); attack/caster weapon tags; local defences and weapon physical, global versions on jewellery only; caster mods (spell damage, flat spell damage at full effectiveness, cast speed, spell crit, element %, mana cost, mana as ES, spell block); hybrid defence mods; ailment mods on jewellery; physical/elemental leech 5–30%; PoE-style attributes; Item Rarity a prefix at 4×; character XP replaces skill XP; life regen halved; % elemental tripled; resistances less dominant on armour; shields only roll their own defences ([GEAR.md](design/GEAR.md) → Affix pool). Not tested, by request — done 2026-10-27
- [x] Skill pool pass: attack gems scale the whole skill per level (+6% of base each), not each hit; skills tagged `hit` (deals damage) and `cast` (has a cast time), so damage supports don't fit Frost Ward or Meditate, Faster Casts only fits Fireball and Glacial Lance, Lingering no longer fits Parry; gem level needs character level up to 80 at gem level 20 (attributes 8 → 245; Lacerate and Backstab ×1.3); loaded saves drop over-levelled gems back (xp kept) and unsocket supports that no longer fit; Judgement Hammer, Glacial Lance, Frost Needle, Barrage, Pummel, Feint and Ice Shot buffed; Poison Dart is a Main skill ([BALANCE.md](design/BALANCE.md)) — done 2026-10-27
- [x] Gear dump, part 2: hybrid armour, first hybrid shields, and swords/axes/daggers/sceptres to level 60 (107 new, 315 total), bonus implicits on 40+, matching gear-set art ([GEAR.md](design/GEAR.md)) — done 2026-10-26
- [x] Gear dump, part 1: pure str/dex/int bases to level 60 (113 new, 208 total): armour, shields, maces, bows, wands, staves, with progressively better base stats and a bonus implicit on everything 40+; new armour tiers use matching gear-set art ([GEAR.md](design/GEAR.md)) — done 2026-10-26
- [x] Stash tabs no longer jump: every tab shares one panel as tall as the tallest (the Gear pages), so switching keeps the page height and scroll — done 2026-10-26
- [x] Flasks equip without the Crafting Bench (player report): click a flask slot on the Equipment page to pick a spare or take one off; click a spare in Stash → Flasks to put it on your belt; Lacerate needs level 35; Hideout gear card is the Equipment paper doll — done 2026-10-26
- [x] Hideout layout B (stats, equipment, quick buttons; land here on load); Town with Magic, Armour and Gem shops; station upgrades unlock tiers with steep costs (Forge, Alchemy Table tiers; Stash pages; Bench built for salvage, auto-crafting last; Town Market stock/restock); Map Device locked until Act 6; gem level requirements and rare level-appropriate drops; save v17 ([TOWN.md](design/TOWN.md), [BALANCE.md](design/BALANCE.md)) — done 2026-10-26
- [x] Act 1 called balanced (you, 2026-10-26): monsters life ×1.4 / damage ×1.15; most classes 3h40–6h, Warrior ~12h; class balance isn't a goal, finding what works is ([BALANCE.md](design/BALANCE.md)) — done 2026-10-26
- [x] Skill gems need their own attribute (8 at gem level 1, 44 at 5, 89 at 10, 116 at 13): short of it a gem stops levelling, can't go on the bar, and stops firing; tooltip shows it. Attack gems gain +8% weapon damage per level (was 3%) so a capped off-class attack falls behind. Bot respects requirements and slots instant spells into spare slots — done 2026-10-26
- [x] Cloud save sync between two browsers on the live site (you: works fine) — done 2026-10-26
- [x] Smarter sim bot: rebuilds its skill bar from owned gems, best supports, flask belt, mana/utility flask use, crafts worn gear; reports orbs used, out-of-mana time and the final bar. Re-ran all 7 classes (12 h, seed 1) against the old bot ([BALANCE.md](design/BALANCE.md)) — done 2026-10-26
- [x] Cleanup: off-hand picker compares against the off hand; duplicate `.page.wide` rule removed; offline-boss tests get a 20 s timeout; two dead exports removed; sim gear-swap logic shared — done 2026-10-26
- [x] Tutorial: skills-are-manual wording, Life Flask then a new Mana Flask step, Mine 9 ore so the cheapest smith (gloves/boots) is reachable, bench wording; save v16 keeps mid-tutorial players on their step. Combat: "Next area" buttons once the area's boss is down. Skill rules: while target is / isn't affected by Bleed, Poison, Ignite, Stun, Freeze, Chill, Shock or Broken armour. Sidebar: Hideout alone on top; Combat, Stash, Campaign, Trader, Equipment, Bench, Skills, Passive Tree; Achievements in its own Progress group at the bottom — done 2026-10-26
- [x] Hard 0.1 s minimum on every cooldown (`MIN_COOLDOWN_MS`), including Overclock (now "cooldowns drop to the 0.1 s minimum") — done 2026-10-25
- [x] Most spells are instant with their cooldown as the only limit (Spark, Frost Needle, Frost Ward, Arcane Siphon, Meditate, Shock Nova, Consecrate); Fireball and Glacial Lance keep their wind-up. Mage 6 h sim, seed 7: level 16 and 4,686 kills (was 14 and 3,375) — done 2026-10-25
- [x] Skill gems start on Manual only (nothing auto-casts by default); the rule editor offers each gem's suggested rule as one click; the sim bot and tests apply the suggested rules; existing saves keep their rules — done 2026-10-25
- [x] UI pass 3 (your walkthrough #2): Hideout "where to get it" flies out beside the cost panel; belt art fits the belt strip; bag is 2 fixed pages of 30 (Stash, Equipment, Bench) and stash pages are a fixed 80-slot grid, so nothing grows; combat has ringed monster tiles, Matchup in place of Active target, one skills + flasks bar with ground loot under it; Bench and Stash flasks in Life / Mana / Granite / Quicksilver / Diamond / Ruby tabs; Skills page gem lists full width with search, Str/Dex/Int, type and sort filters (supports: "Fits my skills"); Trader's Stall as a shop (awning, shelves by kind, price tags); skilling activities split into tiers (gathering by ore/log/herb, production by 10-level bands); new Coming soon screen — done 2026-10-25
- [x] Town pass 2: Character banner moved into the Hideout hero; station upgrade cost hidden behind a hover chip (have/need per material, right-click to lock, hover or right-click a material for where to get it, click a source to go there); next unlock shown on each Hideout skill tile; bars with numbers are tall enough to read (top bar, combat, resistances); bag salvage has All normal/magic/rare/unique (click once to select, again to salvage; uniques ask a third time); currency pills no longer slide under the character plate on narrower screens — done 2026-10-25
- [x] Single-target attacks lost their cooldowns (mana is their limit, PoE-style); guards, buffs, spells and area skills keep theirs and act before attacks on the bar — done 2026-10-25
- [x] Skilling pass 2: Smithing ×3 materials and 10 s+ per base; Gemcutting is one Skill Gem and one Support Gem recipe from the whole pool, 20–30 s and pricier; Harvesting shown as Foraging; one Skilling sidebar group with a gathering/production line; compact click-to-expand activity cards; Fishing added as a permanent "coming soon" skill with catches and a skilling-tree branch that does nothing; Coming soon page for the five planned skills ([SKILLING_REWORK.md](design/SKILLING_REWORK.md) §8) — done 2026-10-25
- [x] Character pass 2: zones can wait for a number of this act's bosses (`requires: { after, bosses }`); flat bordered currency/crafting orbs everywhere (pack art dropped); thinner gem rims; taller body armour slot; dual wield swings at the main hand's speed; attack/cast speed shown as ×multipliers; tree rim circle gone, rim nodes glow in class colour and give 1.5× stats; tinted game-icons necklaces and rings for every amulet/ring; click any item (bag, stash, ground, worn) for Equip / To bag / To stash / Salvage; Stash shows your equipment — done 2026-10-25
- [x] Character pass 1: Campaign is a continent map (one region per act, areas as linked points; a boss can open several areas via `unlocks`); Maps is its own sidebar section with the Map Device page; skill gems are flat bordered tall hexagons, supports 12-sided, with plain silhouettes; clicking an empty socket lists the supports that fit; no natural life/mana regen in fights (flee breather once the field is clear) and you start with a life and a mana flask; main hand + off hand with dual wielding (averaged weapons, 10% more attack speed), shields off hand only, 4 ring slots, new doll layout, flask recovery shown on flasks; Offence panel grouped with dividers; class-mechanic clusters moved to an outer rim of the tree (generic clusters in their old spots, save keeps connected allocations); bench orbs show their art, fossils/essences/resins/shards got icons; Craft until… renamed Auto-crafting and locked behind a new Crafting Bench level 5 — done 2026-10-25
- [x] Ground loot (50, FIFO, Combat page), bag (60), stash pages (3×80, more for gold, Stash station discounts), offline haul (200), item tiles everywhere, trader "show stash too", bench picks from bag + stash, save migration ([TOWN.md](design/TOWN.md)) — done 2026-10-25
- [x] Town pass 1: top bar has a centred character plate (crest, name, level, class, life/ES/mana) and a smaller activity box; Hideout title centred as "Hideout", life/DPS chips gone; station cards show the current effect, one "next level" line and cost + Upgrade (description moved to hover); Character level is its own banner above the trade skills; trader quote removed, gold shown with the coin; paid restock doubles in price until the free restock; spare flasks capped at 10 per kind (worst sold, also trimmed on load) — done 2026-10-25
- [x] Act 2 framework: 8 areas, Scorched earth boss mechanic, drop tiers 6–7, 6 new uniques, preview gating, unlock-on-load for old saves ([ACT2.md](design/ACT2.md)) — done 2026-10-25
- [x] Zones for Last Breath, The Old Grudge, Brawler's Buckle and Starforged Edge (Act 2) — done 2026-10-25
- [x] Re-ran the sim since every skill got a cooldown (36 h, seeds 1–2; BALANCE.md) — done 2026-10-25
- [x] Code tightening: burning ground now kills on the tick the last monster dies; save errors reach Sentry; dead exports removed; "Conqueror of the Coast" no longer counts later acts — done 2026-10-25
- [x] Fix: "faster Cooldowns", guard cooldown and Arcane Recursion now shorten cooldowns in fights (combat used the base value) — done 2026-10-25
- [x] Every skill has a cooldown: main 2–3 s, area 4–5 s, Poison Dart 4 s; damage not rebalanced (your call) — done 2026-10-24
- [x] Combat screen pass: soft ground spots replace the stretched hex tiles, compact field tokens, one labelled "Active target" card, ES/mana/mechanic bars tall enough for their labels — done 2026-10-24
- [x] Hideout layout pass: stations capped at 3 columns (3×2), two-column skill cards with icon, level, XP bar and exact-XP tooltip — done 2026-10-24
- [x] SPF record fixed (`v=spf1 include:_spf.mx.cloudflare.net ~all`); Email Routing status is "ready" — done 2026-10-24
- [x] Sentry project `path-of-idle` (errors only), DSN in `.env.local`, deployed; test error PATH-OF-IDLE-1 received — done 2026-10-24
- [x] Admin page (stats, feedback inbox, reviews, Sentry errors link), Settings feedback + star review, Sentry wiring — done 2026-10-24
- [x] Support contact: support@dabfellow.party (Cloudflare Email Routing → Gmail) in the privacy note — done 2026-10-24
- [x] Art pack licences: all art was bought, no further checking needed (you) — done 2026-10-24
- [x] Play one character of each class through Act 1 by hand (you: it's fine) — done 2026-10-24
- [x] Supabase setup and live-domain URLs (you) — done 2026-10-24
- [x] Build the 15 new actives and their signature supports ([SKILLS_AND_UNIQUES.md](design/SKILLS_AND_UNIQUES.md)): `convert`, `moreVsAiling`, `chillMs`, `restoreManaPct`, `manaBelow` rule, Momentum per hit — done 2026-10-24
- [x] "Skill modifier" mods and the ★ tweaks on uniques; tooltips grey out other classes' mechanic mods — done 2026-10-24
- [x] Check every class-mechanic stat on uniques is read (`coupAilment` wasn't; now is) — done 2026-10-24
- [x] Sim all 7 classes on seeds 1–3 (also covers the action-time recheck) — done 2026-10-24
- [x] Portrait prompts for Duelist, Templar, Shadow and Exile in `ART_PROMPTS.md` — done 2026-10-24
- [x] Starter kits for the hybrid classes: checked, current kits kept (hybrid bases start at lvl 8) — done 2026-10-24
- [x] Improve bot gear scoring: ES and hit chance counted, buys trader upgrades — done 2026-10-24
