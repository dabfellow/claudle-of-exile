# Town, hideout and stash

**Design reset (2026-10-30):**
- Hideout stations, reactive rule unlocks and the offline cap are shared by the account. Challenge modes will each keep their own.
- The offline cap starts at 8 hours, and a hideout upgrade raises it to 24 over time.
- High-level stations cost rare materials and give lasting bonuses, so upgrades run for months. *(Not built yet.)*
- A shared stash lets characters pass items to each other. Challenge modes will each keep their own stash.

**As built (Milestone 3):** `AccountState` (`engine/account.ts`) holds the hideout, automation unlocks, gear stash pages, overflow and Exile unlock.
It's saved apart from characters and attached as `s.account`. Gear pages are shared; currency, materials, gems, flasks, the bag and Town stock stay per character.
Items take an account uid when they first enter the stash, because each character numbers its own items from 1.
Old saves hand their hideout and stash over one character at a time (`settleCharacter`), taking the highest of each station and unlock. Pages anyone bought are kept, and items that don't fit wait in an overflow that can be emptied but not added to.
`Realm` is where challenge modes will plug in: each will be a separate `AccountState` under its own key.

## Hideout, Town and station upgrades

Your walkthrough, 2026-10-26. The Hideout is home: the first page you land on, with what you need at a glance. The Trader's Stall becomes a **Town** with three shops. Station upgrades stop being small % bonuses and start unlocking things, and each one is a real gathering haul.

### Hideout (layout B)
- Always the page you land on when a character loads.
- Top: character banner, a stats overview (life/ES/mana, damage, defences, resistances, attributes) and your equipment at a glance.
- Quick buttons: Stash, Town, Equipment, Crafting Bench, Skills, Passive Tree, Campaign, Combat.
- Further down: the station ledger (level, now, next, cost as have/need, Upgrade), then skill dials.

### Town (replaces the Trader's Stall page)
Three shops share one restock timer and one paid "restock now". They sell **decent crafted gear at high prices**: an obvious way to gear up for people who don't want to grind, never the best way.

| Shop | Sells |
|---|---|
| Magic shop | Wands, staves and other caster weapons; rings, amulets, belts; flasks; currency orbs |
| Weapon & Armour shop | Other weapons (swords, axes, daggers, bows, maces), shields, and armour |
| Gem shop | Skill and support gems up to your level (gems are rare drops now) |

The **Town Market** station (was Trader's Stall) gives every shop more stock and faster restocks.

### Station upgrades
Upgrades unlock tiers. Gathering skills stay level-gated only.

| Station | Levels |
|---|---|
| Stash | Each upgrade adds a free stash page |
| Forge | L1 copper-tier bases · L2 iron-tier · L3 mithril-tier · L4 +5 item level on smithed bases |
| Alchemy Table | L1 recipes under Lv 10 · L2 under Lv 20 · L3 all recipes · L4 20% chance of double output |
| Crafting Bench | L1 not built (orbs work anywhere) · L2 built: salvage, Life & Resistance crafts · L3–L4 more recipes · L5 auto-crafting |
| Town Market | More stock per shop and faster restocks each level |
| Map Device | Locked until Act 6 is beaten (maps come after the campaign) |

Costs are steep: tens of minutes of gathering for the first upgrade, hours for the last.

### Gems
- Gem drops are very rare; the Gem shop is the main source.
- Every skill and support gem has a character level requirement, so strong skills and supports come later. Gemcutting and the shop only offer gems you're allowed to use.


## Stash, inventory and equipment

Draft 2026-10-25, from your town walkthrough. Status: **built 2026-10-25** (save version 14). Numbers marked *(proposed)* are Claude's defaults, easy to tune.

### The problem today

There is one item list, `s.inventory` (40 / 60 / 90 / 130 slots from the Stash station). The Stash "Items"
tab, the Equipment page and the trader's Sell tab all show that same list, so the three places feel identical.
Flasks, gems, currency and materials live in their own stores already; only gear is muddled.

### Decided (2026-10-25)

- **Ground loot.** Gear never goes straight into your bag. It drops on the **ground**: a panel on the Combat
  page holding the newest **50** items, first in first out (a new drop pushes out the oldest). You pick items
  up into your inventory.
- **Inventory** (the bag you carry): fixed **60** slots.
- **Stash**: **3 pages of 80** to start; more pages bought with **gold**.
- **Item display**: bigger tiles (icon, name in rarity colour, slot + item level, ▲ when it's an upgrade).
- **Trader Sell**: sells from the bag; a "show stash too" toggle lists stashed gear as well.
- **Ground clears on area change** (and when you leave combat), like leaving a PoE instance.
- **Stash station** makes new stash pages **cheaper**: 0 / 10 / 20 / 35% off *(proposed)*.
- **Page price escalates, no cap**: page 4 costs 1,000 gold, each later page ×2.5 *(proposed)*
  (1k, 2.5k, 6.25k, 15.6k…).
- **Offline haul.** Drops while you're away go to a separate, bigger pile: newest **200** *(proposed)*, first in
  first out. It's shown on return (in "While you were away" and beside the ground panel) and stays until you
  empty it; a later offline session adds to it under the same cap. Changing area does not clear it.

### Four places for gear

| | What it holds | Size | Where you see it |
|---|---|---|---|
| **Ground** | Fresh drops, newest first | 50, oldest pushed out | Combat page |
| **Inventory** | The bag you carry | 60 | Equipment page, Stash page, trader Sell |
| **Stash** | Long-term storage, in pages | 3 × 80, more for gold | Stash page |
| **Equipment** | What you're wearing: 10 gear slots + 5 flasks | fixed | Equipment page (paper doll) |

Currency, materials, flasks and gems stay as they are (counters / their own lists) but are *shown* as Stash tabs.

#### Combat page: ground panel

```
┌ On the ground  37/50 ────────── [Pick up all] [Pick up upgrades] ┐
│  tile  tile  tile ▲  tile  …   newest first; click → bag           │
└───────────────────────────────────────────────────────────────────┘
```

#### Stash page

```
┌ Inventory  18/60 ─────────────────────── [Stash all] [Sort ▾] ┐
│  tile  tile  tile  …   (click → move to stash)                 │
└───────────────────────────────────────────────────────────────┘
 [ Gear: 1 2 3 + ] [ Currency ] [ Materials ] [ Flasks ] [ Gems ]
┌───────────────────────────────────────────────────────────────┐
│  stash page 1 · 42/80   (click → move to inventory)            │
└───────────────────────────────────────────────────────────────┘
```

#### Equipment page

Paper doll and stats as now; underneath, the **inventory only** (click to equip).

#### Crafting Bench

Picks items from equipment, inventory and stash (crafting shouldn't need shuffling).

### Save migration

- Existing `inventory` items: first 60 stay in the bag, the rest go to stash pages in order. Nothing is deleted;
  if it all doesn't fit, the extra stays in the bag over capacity.
- Auto-salvage happens at drop time, before the ground, as now.

### Build notes

- Engine: `src/engine/storage.ts`; tiles: `ItemTiles` in `src/ui/components/Inventory.tsx`; piles: `src/ui/components/GroundLoot.tsx`.
- Leaving combat by starting a skill or craft doesn't clear the ground; it's shown on the idle Combat page until the next area or retreat.
- The offline haul also has "Salvage the rest".

### Build order (done)

1. Engine: `ground`, `offlineHaul`, `stash` pages and bag size in state; pick up / stash / take / buy page
   actions; drops go to the ground (or haul offline); ground cleared on area change; save migration; tests.
2. Item tile component (replaces `ItemGrid` / the checkered grid) used everywhere.
3. Combat page ground panel + offline haul panel.
4. Stash page (bag on top, Gear pages / Currency / Materials / Flasks / Gems tabs).
5. Equipment page (bag only), trader Sell toggle, Crafting Bench picking from all three.
6. Stash station text and costs; offline summary wording; sim bot picks up its loot.
