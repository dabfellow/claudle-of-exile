# Launch checklist — Act 1

What has to be true before Path of Idle goes public with Act 1. ✅ done · 🔧 in progress · ⬜ to do · **[You]** needs you.

## Content
- ✅ Act 1, *The Drowned Coast*: 8 areas, levels 1–25, each boss unlocks the next ([zones.ts](../src/data/zones.ts)).
- ✅ Act boss: Ysolde, the Drowned Queen, with all five mechanics. Beating her completes the act (toast, banner, *The Tide Turns* achievement).
- ✅ Boss mechanics: slam, nova, summon, enrage, ward. Bosses add them as the act goes on (1 → 5). They show on the Campaign cards and in the Combat matchup panel.
- ✅ Acts 2–6 and Maps show as locked "coming soon".
- ✅ Gathering nodes and alchemy recipes that used to unlock in the Forge and Spire now unlock in the Ship Graveyard and Storm Cliffs.
- ✅ Uniques: Starforged Edge (level 34) stays for Act 2; no extra Act 1 unique for the Sanctum (decided 2026-10-24).

## Balance (see [BALANCE.md](BALANCE.md) → Phase 8)
- ✅ Act 1 takes 6–10 h of active play in the sim, for all three classes and several seeds.
- ✅ Mage matches the other classes (spells now use flat added elemental damage at 70%).
- ✅ Act-boss farming no longer floods exalts. Adds killed in boss fights don't count toward the next boss.
- ✅ Played one character of each class through Act 1 by hand (2026-10-24): it's fine. The sim bot never re-arranges skills or uses keystones, so human pacing will differ. Note anything that feels slow or unfair.
- ✅ Offline progress can't skip content: a boss you haven't beaten never spawns while you're away (the catch-up screen says it's waiting). Bosses you've already beaten can be farmed offline.

## Art (Phase 7)
- ⏸ Parked (no image generation for now). Generate the 187 images in [ART_PROMPTS.md](ART_PROMPTS.md), drop them in `src/assets/art/`, then run `npm run art`. 18 are done (portraits, scenes, stations). The 8 Act 1 area banners and 45 monsters are the most visible.
- ⏸ Parked with the art. Final visual pass once the art is in: area cards, the combat screen, and phone widths.

## Accounts & saves
- ✅ Finished the Supabase setup in [AUTH_SETUP.md](AUTH_SETUP.md) and swap the localhost URLs for the real domain (Google origins, Supabase Site URL and redirect URLs).
- ✅ Save migrations through v8 are tested. Old saves are placed in Act 1 by how far they had got.
- ⏸ Parked until more of the game is built. Test cloud save sync between two browsers on the live site.

## Tech
- ✅ `npm test` (94 tests) and `npm run build` pass.
- ✅ Bundle split: game code 274 kB (85 kB gzipped), with React and Supabase in their own long-cached files. No size warning.
- 🔧 Error reporting: Sentry is wired in (off until `VITE_SENTRY_DSN` is set), plus an in-game Admin page with stats, feedback and reviews. **[You]** finish [ADMIN_SETUP.md](ADMIN_SETUP.md).
- ✅ Hosting: live on Cloudflare Workers at [dabfellow.party/path-of-idle](https://dabfellow.party/path-of-idle/). The site root is the project hub (`../dabfellow-hub`). `npm run deploy` builds and publishes; Supabase keys come from `.env.local` at build time. Sign-in redirect URL to allow: `https://dabfellow.party/path-of-idle/`.
- ✅ Dev-only tools (`window.game`) are left out of production builds.

## Before announcing
- ✅ Title screen, tutorial and README text checked; the tutorial's last toast now points players on to the Drowned Queen.
- ✅ Settings → About: what's in Act 1, what's coming, and a privacy note. The title screen has a one-line version next to the sign-in buttons.
- ✅ Support contact support@dabfellow.party is in the privacy note (forwards to Gmail once the SPF record is fixed).
