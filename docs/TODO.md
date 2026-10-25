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
- [ ] Side feed (Activity / Combat log / Loot): you're lukewarm on it; revisit later.
- [ ] Achievements page look: later pass.
- Art (parked with the other art): trader portrait is too cartoony; materials need more icons.

## Ideas / later
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
