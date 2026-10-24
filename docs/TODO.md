# To-do

Seeded 2026-10-24 from the open items in `docs/`. **[You]** = needs you, not Claude.

## Open

### Launch (Act 1) — see [LAUNCH.md](LAUNCH.md)
- [ ] **[You]** Play one character of each class through Act 1 by hand and note anything slow or unfair.
- [ ] **[You]** Generate the remaining images in [ART_PROMPTS.md](ART_PROMPTS.md) (18 of 187 done), then `npm run art`. Area banners and monsters first.
- [ ] Final visual pass once art is in: area cards, combat screen, phone widths.
- [ ] **[You]** Finish Supabase setup ([AUTH_SETUP.md](AUTH_SETUP.md) checklist) and swap localhost URLs for `https://dabfellow.party/path-of-idle/`.
- [ ] Test cloud save sync between two browsers on the live site.
- [ ] **[You]** Get an error-reporting DSN (e.g. Sentry); then wire it in.
- [ ] **[You]** Pick a support contact (email or Discord) and add it to the privacy note.
- [ ] Decide on an Act 1 unique for the Sanctum, or keep Starforged Edge (lvl 34) for Act 2.

### New skills — [NEW_SKILLS.md](NEW_SKILLS.md)
- [ ] Build the 15 new actives (5 per attribute) with their signature supports in `gems.ts`.
  - [ ] New effect fields: `convert`, enemy `debuff`, `flaskCharge`.

### Uniques — [NEW_UNIQUES.md](NEW_UNIQUES.md)
- [ ] Add the "skill modifier" mod type and the ★ skill tweaks on uniques.
- [ ] Check every class-mechanic stat on uniques is actually read in `combat.ts` / `mechanics.ts`.
- [ ] Zones for Last Breath, The Old Grudge, Brawler's Buckle (lvl 26+) — wait for Act 2.

### Classes — [CLASSES.md](CLASSES.md)
- [ ] Run `npm run sim -- --class <id>` for all 7 classes; Act 1 target 6–10 h each.
- [ ] Portrait/crest prompts for the 4 new classes in `ART_PROMPTS.md`.
- [ ] Starter kits for the hybrid classes.

### Balance — [BALANCE.md](BALANCE.md)
- [ ] Re-check action-time numbers on seeds 2–3 (only seed 1 run so far).
- [ ] Improve bot gear scoring (DPS swings a lot with drop luck).
- [ ] Revisit Sanctum chaos farming (85–155 per 14 h) when Act 2 lands.

### Art stand-ins — [ASSET_MAPPING.md](ASSET_MAPPING.md)
- [ ] Replace the 106 placeholder slots, starting with the "Weakest stand-ins" list.
- [ ] Find licences for Catalone, CodeSpree, SanguineNite and free_sample packs (or replace that art).

## Ideas / later
- Ascendancy classes — and decide whether they twist the class mechanic or add something separate.
- Skilling bands above Lv 20 (Act 2+), including Chaos / Regal recipes — [SKILLING_REWORK.md](SKILLING_REWORK.md).
- Gemcutting "Prisms" as its force material.
- Mastery per action (Melvor-style), once higher skilling bands exist.
- Loot / sell filter rules (post-launch, GDD §7).
- Cosmetics shop (never pay-to-win).
- Acts 2–6 and Maps.

## Done
