# To-do

Seeded 2026-10-24 from the open items in `docs/`. **[You]** = needs you, not Claude.

## Open

### Launch (Act 1) — see [LAUNCH.md](LAUNCH.md)
- [ ] **[You]** Run the SQL in [ADMIN_SETUP.md](ADMIN_SETUP.md) and add yourself to `admins`; then check the Admin page with real data.
- [ ] **[You]** Send a test mail to support@dabfellow.party from a non-Gmail address and check it lands in Gmail.
- [ ] **[You]** Rotate the Google and Discord OAuth client secrets: they were in `docs/AUTH_SETUP.md` in git history (private repo); now redacted.

### Uniques — [NEW_UNIQUES.md](NEW_UNIQUES.md)
- [ ] Zones for Last Breath, The Old Grudge, Brawler's Buckle (lvl 26+) — wait for Act 2.
- [ ] Starforged Edge (lvl 34) stays an Act 2 unique; the Sanctum gets no Act 1 unique (decided 2026-10-24).

## Ideas / later
Parked 2026-10-24 until more of the game is built: testing, sim balancing and art.
- Test cloud save sync between two browsers on the live site.
- Class balance doesn't need to be exact. Sim notes in [BALANCE.md](BALANCE.md) for when it's picked back up:
  - Warrior missed Act 1 in 14 h on 2 of 3 seeds (33–54 DPS vs 50–100 for others).
  - Ranger and Duelist ran 10–13 h on some seeds.
  - Bot ends runs with 16–90k unspent gold and hoarded orbs; teaching it to craft would cut drop-luck noise.
- Revisit Sanctum chaos farming (85–155 per 14 h) when Act 2 lands.
- Art: no image generation for now. [ART_PROMPTS.md](ART_PROMPTS.md) is ready if that changes; then a final visual pass (area cards, combat screen, phone widths) and replacing the 106 stand-in slots in [ASSET_MAPPING.md](ASSET_MAPPING.md).
- Chill now always slows attacks 15% (was 0% without `chillOnHit`); watch whether chilled ground is too strong.
- Clarity cuts every skill's mana cost, not just spells; split out a spell-only stat if that matters.
- Ascendancy classes — and decide whether they twist the class mechanic or add something separate.
- Skilling bands above Lv 20 (Act 2+), including Chaos / Regal recipes — [SKILLING_REWORK.md](SKILLING_REWORK.md).
- Gemcutting "Prisms" as its force material.
- Mastery per action (Melvor-style), once higher skilling bands exist.
- Loot / sell filter rules (post-launch, GDD §7).
- Cosmetics shop (never pay-to-win).
- Acts 2–6 and Maps.

## Done
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
