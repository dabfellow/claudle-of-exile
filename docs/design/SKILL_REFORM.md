# Skill gem reform

Every act and attribute offers AoE, single target, guard, and one life and one mana source. Leech stays very weak until
Acts 3–4. Numbers are first passes and not simmed. `tests/gemreform.test.ts` checks that every slot stays filled.

## The rules

- A drain skill returns life or mana, never both. It costs no mana, has a 5s cooldown and needs a target in reach.
- One source per slot is a drain, the other a support. Strength drains life, Intelligence drains mana, Dexterity swaps
  each act. Transfusion and Arcane Siphon make Intelligence's drains life in Acts 3 and 5.
- Drains return 2%, 3%, 6%, 10%, 14% and 24% of their hit in Acts 1–6. Arcane Siphon stays at 15%.
- Supports: Life Leech and Mana Leech (3%) cover Acts 1–2. Acts 3–6 add one per attribute at 4%, 5%, 6% and 8%. All of
  them have a mana multiplier of 1.8.
- No new signature supports.

## Moved gems

| Gem | Act | Level | Numbers |
|---|---|---|---|
| Arcane Siphon | 1 → 5 | 6 → 50 | Life only; base 30–46 |
| Parry | 1 → 2 | 6 → 14 | – |
| Fireball | 1 → 2 | 10 → 14 | – |
| Glacial Lance | 2 → 4 | 16 → 40 | Base 72–104 |
| Shield Crush | 4 → 5 | 44 → 50 | – |
| Siege Shot | 4 → 6 | 42 → 58 | 460% |

## Who fills each slot

| Act | Attribute | AoE | Single target | Guard | Drain | Support |
|---|---|---|---|---|---|---|
| 1 | Str | Ground Slam | Heavy Strike | Iron Guard | Leeching Blow (life) | Mana Leech |
| 1 | Dex | Rain of Arrows | Twin Strike | Smoke Step | Brine Leech (life) | Mana Leech |
| 1 | Int | Shock Nova | Spark | Frost Ward | Mind Sip (mana) | Life Leech |
| 2 | Str | Cavalry Charge | Judgement Hammer | Parry | Raider's Due (life) | Mana Leech |
| 2 | Dex | Horse Archer's Arc | Backstab | Saddle Drop | Horsefly Shot (mana) | Life Leech |
| 2 | Int | Ember Dash | Fireball | Ash Veil | Cinder Draw (mana) | Life Leech |
| 3 | Str | Scourge | Flagellate | Blood Ward | Sanguine Blow (life) | Pilgrim's Measure (mana) |
| 3 | Dex | Flensing Fan | Gash | Penitent's Veil | Bloodied Knife (life) | Beggar's Cup (mana) |
| 3 | Int | Burnt Offering | Blood Lance | Martyr's Ward | Transfusion (life) | Alms of the Mind (mana) |
| 4 | Str | Avalanche | Titan's Blow | Bulwark | Marrow Crush (life) | Frozen Will (mana) |
| 4 | Dex | Rockslide Volley | Blackjack | Snowblind | Frost Lamprey (mana) | Thaw (life) |
| 4 | Int | Meteor | Glacial Lance | Sacred Aegis | Stone Drink (mana) | Stone Pulse (life) |
| 5 | Str | Riptide | Shield Crush | Barnacle Shell | Undertow Grip (life) | Salt Thirst (mana) |
| 5 | Dex | Squall | Harpoon | Spray Screen | Lamprey Hook (life) | Ebb (mana) |
| 5 | Int | Thunderhead | Drowning Bolt | Tide Barrier | Arcane Siphon (life) | Undertow of Thought (mana) |
| 6 | Str | Worldbreaker | Executioner's Stroke | Shieldwall | Spoils of War (life) | Tribute of Iron (mana) |
| 6 | Dex | Gale of Knives | Siege Shot | Shadow Court | Tax Collector (mana) | Blood Tax (life) |
| 6 | Int | Eye of the Storm | Royal Decree | Eye of the Storm | Imperial Tribute (mana) | Imperial Vintage (life) |

## Live characters

Each character from a save before version 33 gets one The Old Covenant (3% life leech, 2% mana leech, level 1) in their
bag on next load. It never drops, can't be crafted and can't be listed on the Market. It can still be stashed and worn
by another character on the same account.

A moved gem stays owned, but can't be used below its new level.

The Market's rules must be uploaded again from Admin for the server to refuse the ring. The game refuses it either way.
