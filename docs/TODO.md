# To-do

Seeded 2026-10-24 from the open items in `docs/`. **[You]** = needs you, not Claude.

## Open

### Launch (Act 1) — see [LAUNCH.md](LAUNCH.md)
- [ ] **[You]** Run the SQL in [ADMIN_SETUP.md](ADMIN_SETUP.md) and add yourself to `admins`; then check the Admin page with real data.
- [ ] **[You]** Send a test mail to support@dabfellow.party from a non-Gmail address and check it lands in Gmail.
- [ ] **[You]** Rotate the Google and Discord OAuth client secrets: they were in `docs/AUTH_SETUP.md` in git history (private repo); now redacted.

### Act 2: The Burning Steppe — [ACT2.md](ACT2.md)
- [ ] Release Act 2. The framework is built and playable in dev only (preview).
  - **[You]** Confirm the level band: areas are monster level 24–33, and the sim's characters leave at L30 (you said 17–25).
  - Slow it down: 6–16 h after Ysolde with almost no deaths (BALANCE.md → "Act 2 preview").
  - Art for 8 areas, 40 monsters, 6 uniques (prompts in `artManifest.ts`; banners are stand-ins).
  - Then `open: true` on Act 2, Settings → About text, deploy.

### Town feedback (your walkthrough, 2026-10-25)
- [ ] Gems: far too many drop. Move them to a gem vendor that unlocks better gems as it levels.
  - Needs design with you: how the vendor levels, what happens to gem drops and gems already owned.
- [ ] More skills to train (Hideout skill list feels thin).
  - Later: Thieving (Heist), Archaeology (Expedition), Cartography, Fletching, Rune-carving ([SKILLING_REWORK.md](SKILLING_REWORK.md) §8). You like all of them; they're listed on the in-game Coming soon page for now.
- [ ] Side feed (Activity / Combat log / Loot): you're lukewarm on it; revisit later.
- [ ] Achievements page look: later pass.
- Art (parked with the other art): trader portrait is too cartoony; materials need more icons.
- [ ] Skill masteries on the Hideout skill tiles (you: coming later; the skills themselves are with the gathering session).

### Character feedback (your walkthrough, 2026-10-25)
- [ ] Campaign art pass: you like the continent-map style; it needs real art. The area card is still a poor way to show the info and needs its own art pass.
- [ ] **[You]** Gem artwork: gems now show plain silhouettes (`GEM_GLYPHS` in `src/ui/assets.ts`); pick which you like or what to replace.
- [ ] Skill bar auto setup (rules and priority) needs a big overhaul. Needs design with you: more priority control, maybe more.
- [ ] Support gems limited to some skill types (e.g. only Warcries): not built yet, beyond the current attack/spell/melee fits.
- [ ] Re-tune attack mana costs now attacks have no cooldown (you start with ~36 mana and no regen: Heavy Strike at 4 mana runs dry after about 9 swings without a mana flask).
- [ ] Re-run the sims after zero base regen: casters now live on mana flasks and flat regen; idle survival leans on flasks and the flee breather.
- [ ] Auto-crafting needs real design work later (you: "way later").
- Inventory look is with the other session; the Equipment and Bench bag views should improve with it.

### UI feedback (your walkthrough #2, 2026-10-25) — you test at 1440p and 4K
- **[You]** Icons: gathering nodes (Copper Vein, Scorched Seam …) and currency need art; you'll go through icons yourself.
- Campaign: needs real area art (already above). Map Device: work in progress.

## Ideas / later
- At 1440p/4K pages stop at 1280px wide (`.page` max-width), leaving wide empty margins; consider a wider cap on big screens. Also `.page.wide` is defined twice in `styles.css` (1440px, then 1320px wins).
- The act1 offline-boss test takes ~3 s alone and can brush vitest's 5 s timeout when the whole suite runs at once.
- The sim (`scripts/sim.ts`) doesn't smith or cut gems, so the Smithing/Gemcutting cost change isn't reflected in balance runs.
- Smithing has 95 recipes in one list; group by slot (weapons, armour, jewellery) if it still feels long.
- Quivers don't exist yet; when added they go in the off hand (bows are two-handed today, so that needs a rule).
- Uniques with "% increased Mana Regeneration" (Wellspring, …) now only scale flat mana regen; give them some flat regen if they feel dead.
- The off-hand picker's tooltip compares against the main hand, not the off hand.
- Sim bot now picks up all its loot every minute; balance sims weren't re-run after the stash split.
Parked 2026-10-24 until more of the game is built: testing, sim balancing and art.
- Test cloud save sync between two browsers on the live site.
- Class balance doesn't need to be exact. Sim notes in [BALANCE.md](BALANCE.md) for when it's picked back up:
  - Warrior missed Act 1 in 14 h on 2 of 3 seeds (33–54 DPS vs 50–100 for others).
  - Ranger and Duelist ran 10–13 h on some seeds.
  - Bot ends runs with 16–90k unspent gold and hoarded orbs; teaching it to craft would cut drop-luck noise.
- Revisit Sanctum chaos farming (85–155 per 14 h) when Act 2 lands.
- Art: no image generation for now. [ART_PROMPTS.md](ART_PROMPTS.md) is ready if that changes; then a final visual pass (area cards, combat screen, phone widths) and replacing the 106 stand-in slots in [ASSET_MAPPING.md](ASSET_MAPPING.md).
- Bot only enters an area within a level of its minimum, so the sim can't tell whether players could push Act 2 earlier.
- Skilling band Lv 20–40 for Act 2 (Mithril / Yew / Emberroot) isn't built; gathering nodes stop at the Storm Cliffs.
- Chill now always slows attacks 15% (was 0% without `chillOnHit`); watch whether chilled ground is too strong.
- Clarity cuts every skill's mana cost, not just spells; split out a spell-only stat if that matters.
- Ascendancy classes — and decide whether they twist the class mechanic or add something separate.
- Skilling bands above Lv 20 (Act 2+), including Chaos / Regal recipes — [SKILLING_REWORK.md](SKILLING_REWORK.md).
- Gemcutting "Prisms" as its force material.
- Mastery per action (Melvor-style), once higher skilling bands exist.
- Loot / sell filter rules (post-launch, GDD §7).
- Cosmetics shop (never pay-to-win).
- Acts 3–6 and Maps.

## Done
- [x] UI pass 3 (your walkthrough #2): Hideout "where to get it" flies out beside the cost panel; belt art fits the belt strip; bag is 2 fixed pages of 30 (Stash, Equipment, Bench) and stash pages are a fixed 80-slot grid, so nothing grows; combat has ringed monster tiles, Matchup in place of Active target, one skills + flasks bar with ground loot under it; Bench and Stash flasks in Life / Mana / Granite / Quicksilver / Diamond / Ruby tabs; Skills page gem lists full width with search, Str/Dex/Int, type and sort filters (supports: "Fits my skills"); Trader's Stall as a shop (awning, shelves by kind, price tags); skilling activities split into tiers (gathering by ore/log/herb, production by 10-level bands); new Coming soon screen — done 2026-10-25
- [x] Town pass 2: Character banner moved into the Hideout hero; station upgrade cost hidden behind a hover chip (have/need per material, right-click to lock, hover or right-click a material for where to get it, click a source to go there); next unlock shown on each Hideout skill tile; bars with numbers are tall enough to read (top bar, combat, resistances); bag salvage has All normal/magic/rare/unique (click once to select, again to salvage; uniques ask a third time); currency pills no longer slide under the character plate on narrower screens — done 2026-10-25
- [x] Single-target attacks lost their cooldowns (mana is their limit, PoE-style); guards, buffs, spells and area skills keep theirs and act before attacks on the bar — done 2026-10-25
- [x] Skilling pass 2: Smithing ×3 materials and 10 s+ per base; Gemcutting is one Skill Gem and one Support Gem recipe from the whole pool, 20–30 s and pricier; Harvesting shown as Foraging; one Skilling sidebar group with a gathering/production line; compact click-to-expand activity cards; Fishing added as a permanent "coming soon" skill with catches and a skilling-tree branch that does nothing; Coming soon page for the five planned skills ([SKILLING_REWORK.md](SKILLING_REWORK.md) §8) — done 2026-10-25
- [x] Character pass 2: zones can wait for a number of this act's bosses (`requires: { after, bosses }`); flat bordered currency/crafting orbs everywhere (pack art dropped); thinner gem rims; taller body armour slot; dual wield swings at the main hand's speed; attack/cast speed shown as ×multipliers; tree rim circle gone, rim nodes glow in class colour and give 1.5× stats; tinted game-icons necklaces and rings for every amulet/ring; click any item (bag, stash, ground, worn) for Equip / To bag / To stash / Salvage; Stash shows your equipment — done 2026-10-25
- [x] Character pass 1: Campaign is a continent map (one region per act, areas as linked points; a boss can open several areas via `unlocks`); Maps is its own sidebar section with the Map Device page; skill gems are flat bordered tall hexagons, supports 12-sided, with plain silhouettes; clicking an empty socket lists the supports that fit; no natural life/mana regen in fights (flee breather once the field is clear) and you start with a life and a mana flask; main hand + off hand with dual wielding (averaged weapons, 10% more attack speed), shields off hand only, 4 ring slots, new doll layout, flask recovery shown on flasks; Offence panel grouped with dividers; class-mechanic clusters moved to an outer rim of the tree (generic clusters in their old spots, save keeps connected allocations); bench orbs show their art, fossils/essences/resins/shards got icons; Craft until… renamed Auto-crafting and locked behind a new Crafting Bench level 5 — done 2026-10-25
- [x] Ground loot (50, FIFO, Combat page), bag (60), stash pages (3×80, more for gold, Stash station discounts), offline haul (200), item tiles everywhere, trader "show stash too", bench picks from bag + stash, save migration ([STASH.md](STASH.md)) — done 2026-10-25
- [x] Town pass 1: top bar has a centred character plate (crest, name, level, class, life/ES/mana) and a smaller activity box; Hideout title centred as "Hideout", life/DPS chips gone; station cards show the current effect, one "next level" line and cost + Upgrade (description moved to hover); Character level is its own banner above the trade skills; trader quote removed, gold shown with the coin; paid restock doubles in price until the free restock; spare flasks capped at 10 per kind (worst sold, also trimmed on load) — done 2026-10-25
- [x] Act 2 framework: 8 areas, Scorched earth boss mechanic, drop tiers 6–7, 6 new uniques, preview gating, unlock-on-load for old saves ([ACT2.md](ACT2.md)) — done 2026-10-25
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
- [x] Build the 15 new actives and their signature supports ([NEW_SKILLS.md](NEW_SKILLS.md)): `convert`, `moreVsAiling`, `chillMs`, `restoreManaPct`, `manaBelow` rule, Momentum per hit — done 2026-10-24
- [x] "Skill modifier" mods and the ★ tweaks on uniques; tooltips grey out other classes' mechanic mods — done 2026-10-24
- [x] Check every class-mechanic stat on uniques is read (`coupAilment` wasn't; now is) — done 2026-10-24
- [x] Sim all 7 classes on seeds 1–3 (also covers the action-time recheck) — done 2026-10-24
- [x] Portrait prompts for Duelist, Templar, Shadow and Exile in `ART_PROMPTS.md` — done 2026-10-24
- [x] Starter kits for the hybrid classes: checked, current kits kept (hybrid bases start at lvl 8) — done 2026-10-24
- [x] Improve bot gear scoring: ES and hit chance counted, buys trader upgrades — done 2026-10-24
