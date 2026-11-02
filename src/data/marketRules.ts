import { AFFIXES } from './affixes';
import { BASES, UNIQUES } from './bases';
import { CURRENCIES } from './materials';
import { RUNES } from './runes';

/**
 * What the server needs to tell a real item from an impossible one (docs/ops/market.sql). The server can't read the
 * game's data, so the Admin page uploads this; it goes stale when affixes, bases or uniques change.
 */
export function marketRules() {
  return {
    bases: Object.fromEntries(BASES.map((b) => [b.id, { name: b.name, slot: b.slot, tags: b.tags }])),
    affixes: Object.fromEntries(
      AFFIXES.map((a) => [
        a.id,
        {
          kind: a.kind,
          group: a.group,
          uniqueOnly: !!a.uniqueOnly,
          tags: Object.entries(a.weights).filter(([, w]) => w).map(([t]) => t),
          tiers: a.tiers,
        },
      ]),
    ),
    // left out, the server refuses any listing of a no-trade unique
    uniques: Object.fromEntries(UNIQUES.filter((u) => !u.noTrade).map((u) => [u.id, { name: u.name, baseId: u.baseId, mods: u.mods }])),
    runes: RUNES.map((r) => r.id),
    currencies: ['gold', ...CURRENCIES.map((c) => c.id)],
  };
}
