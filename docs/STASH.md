# Stash, inventory and equipment

Draft 2026-10-25, from your town walkthrough. Status: **built 2026-10-25** (save version 14). Numbers marked *(proposed)* are Claude's defaults, easy to tune.

## The problem today

There is one item list, `s.inventory` (40 / 60 / 90 / 130 slots from the Stash station). The Stash "Items"
tab, the Equipment page and the trader's Sell tab all show that same list, so the three places feel identical.
Flasks, gems, currency and materials live in their own stores already; only gear is muddled.

## Decided (2026-10-25)

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

## Four places for gear

| | What it holds | Size | Where you see it |
|---|---|---|---|
| **Ground** | Fresh drops, newest first | 50, oldest pushed out | Combat page |
| **Inventory** | The bag you carry | 60 | Equipment page, Stash page, trader Sell |
| **Stash** | Long-term storage, in pages | 3 × 80, more for gold | Stash page |
| **Equipment** | What you're wearing: 10 gear slots + 5 flasks | fixed | Equipment page (paper doll) |

Currency, materials, flasks and gems stay as they are (counters / their own lists) but are *shown* as Stash tabs.

### Combat page: ground panel

```
┌ On the ground  37/50 ────────── [Pick up all] [Pick up upgrades] ┐
│  tile  tile  tile ▲  tile  …   newest first; click → bag           │
└───────────────────────────────────────────────────────────────────┘
```

### Stash page

```
┌ Inventory  18/60 ─────────────────────── [Stash all] [Sort ▾] ┐
│  tile  tile  tile  …   (click → move to stash)                 │
└───────────────────────────────────────────────────────────────┘
 [ Gear: 1 2 3 + ] [ Currency ] [ Materials ] [ Flasks ] [ Gems ]
┌───────────────────────────────────────────────────────────────┐
│  stash page 1 · 42/80   (click → move to inventory)            │
└───────────────────────────────────────────────────────────────┘
```

### Equipment page

Paper doll and stats as now; underneath, the **inventory only** (click to equip).

### Crafting Bench

Picks items from equipment, inventory and stash (crafting shouldn't need shuffling).

## Save migration

- Existing `inventory` items: first 60 stay in the bag, the rest go to stash pages in order. Nothing is deleted;
  if it all doesn't fit, the extra stays in the bag over capacity.
- Auto-salvage happens at drop time, before the ground, as now.

## Build notes

- Engine: `src/engine/storage.ts`; tiles: `ItemTiles` in `src/ui/components/Inventory.tsx`; piles: `src/ui/components/GroundLoot.tsx`.
- Leaving combat by starting a skill or craft doesn't clear the ground; it's shown on the idle Combat page until the next area or retreat.
- The offline haul also has "Salvage the rest".

## Build order (done)

1. Engine: `ground`, `offlineHaul`, `stash` pages and bag size in state; pick up / stash / take / buy page
   actions; drops go to the ground (or haul offline); ground cleared on area change; save migration; tests.
2. Item tile component (replaces `ItemGrid` / the checkered grid) used everywhere.
3. Combat page ground panel + offline haul panel.
4. Stash page (bag on top, Gear pages / Currency / Materials / Flasks / Gems tabs).
5. Equipment page (bag only), trader Sell toggle, Crafting Bench picking from all three.
6. Stash station text and costs; offline summary wording; sim bot picks up its loot.
