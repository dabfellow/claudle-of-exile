# Player Market

Live gear trading between signed-in players. Decisions are in [MILESTONES.md](../MILESTONES.md) → Player Market. It's
called the Player Market so it isn't confused with the Town Market station, which runs the NPC shops.

## How it works

- **One market per realm:** standard, Hardcore, Classic and Hardcore Classic each have their own listings and deliveries, and need Act 1 cleared in that realm. Solo Self-Found characters can't trade.
- **Server:** [docs/ops/market.sql](../ops/market.sql). Players can't touch the tables. Every step is one all-or-nothing
  function, so an item can't be sold twice and a bid can't be half-placed.
- **Game:** `src/engine/market.ts` (holds and deliveries), `src/platform/market.ts` (server calls), the market section of
  `src/game.ts`, and `src/ui/pages/MarketPage.tsx`.
- **No timer on the server.** Each visit first finishes anything whose time is up, so an auction closes on the next
  browse or collect by anyone.

## Keeping items and money safe

The browser owns the save, so the server can't change a player's gold. Each paid step goes in this order:

1. The game takes the item or price from the player and records it as a **hold**, saved with the account.
2. It sends the step to the server, with an id.
3. The server agrees, and the hold is dropped. The server refuses, and the hold is given back.
4. If no reply arrives, the hold stays. On the next login or market visit the game asks whether that id finished, then
   drops or refunds it.

The **market wallet** is `market_inbox`: sale money, refunds and items wait there until the game collects them, on
login and on opening the page. Collected rows are kept as a record, so a payout lost to a dropped reply can be found and
restored by hand.

## The sanity check

The server refuses an item on listing unless it could really exist: a real base, modifiers that can roll there, tiers
the item level allows (bench crafts are exempt, as in the game), values in range, the exact mods for a unique, and no
unknown fields. A Locksmith's Wax impression is checked too.

The check reads rules uploaded from the Admin page's Market tab (`src/data/marketRules.ts`). **Upload again after any
release that changes modifiers, bases, uniques or runes**, or items using the new ones can't be listed. A rebalance can
also make an older item fail the check, and it then simply can't be listed.

## What it doesn't stop

By choice (Decisions → Cheating): the game still runs in the browser, so someone editing their save can list a believable
item they never found, or spend gold they don't have. The Admin page's Market tab can take down listings and ban sellers.

## Testing

`tests/marketServer.test.ts` runs the real SQL on a throwaway in-memory Postgres with Supabase's permissions copied in, and
checks that items the game really makes pass. For the page, `await scenario('market')` loads a pretend server
(`src/dev/fakeMarket.ts`); `window.fakeMarket.sellOut(id)` simulates someone buying your listing.
