/**
 * Artwork from the bought/free asset packs in src/assets/{items,icons,ui}, keyed by game id.
 * See src/assets/CREDITS.md for where each pack came from.
 *
 * Every entry is a literal `new URL(...)` on purpose: Vite then ships only the files listed here,
 * each as its own cached file the browser fetches the first time an <img> needs it. The other
 * ~600 pack files never reach the build. Pack files are never inlined into the JS (see vite.config.ts).
 *
 * Art generated into src/assets/art (`artUrl` in components/common.tsx) always wins over these.
 */

/** Item bases → gear-set pieces. Matched on look as well as slot: starter bases get plain,
 * worn pieces, mithril bases get bright plate. Bases with no fitting piece are left out
 * and keep their placeholder icon. */
export const ITEM_ART: Record<string, string> = {
  // helmets
  iron_hat: new URL('../assets/items/armor/set-85-helmet.png', import.meta.url).href,
  leather_cap: new URL('../assets/items/armor/set-64-helmet.png', import.meta.url).href,
  soldier_helm: new URL('../assets/items/armor/set-44-helmet.png', import.meta.url).href,
  hunter_hood: new URL('../assets/items/armor/set-62-helmet.png', import.meta.url).href,
  great_helm: new URL('../assets/items/armor/set-56-helmet.png', import.meta.url).href,
  shadow_mask: new URL('../assets/items/armor/set-35-helmet.png', import.meta.url).href,
  // body armour
  plate_vest: new URL('../assets/items/armor/set-85-body.png', import.meta.url).href,
  shabby_jerkin: new URL('../assets/items/armor/set-08-body.png', import.meta.url).href,
  chainmail: new URL('../assets/items/armor/set-28-body.png', import.meta.url).href,
  scale_leather: new URL('../assets/items/armor/set-67-body.png', import.meta.url).href,
  mithril_plate: new URL('../assets/items/armor/set-56-body.png', import.meta.url).href,
  assassin_garb: new URL('../assets/items/armor/set-35-body.png', import.meta.url).href,
  // gloves
  iron_gauntlets: new URL('../assets/items/armor/set-85-gloves.png', import.meta.url).href,
  rawhide_gloves: new URL('../assets/items/armor/set-64-gloves.png', import.meta.url).href,
  steel_gauntlets: new URL('../assets/items/armor/set-43-gloves.png', import.meta.url).href,
  stealth_gloves: new URL('../assets/items/armor/set-83-gloves.png', import.meta.url).href,
  // boots (the pack's leg pieces that read as greaves or boots)
  iron_greaves: new URL('../assets/items/armor/set-09-legs.png', import.meta.url).href,
  leather_boots: new URL('../assets/items/armor/set-39-legs.png', import.meta.url).href,
  steel_greaves: new URL('../assets/items/armor/set-43-legs.png', import.meta.url).href,
  shagreen_boots: new URL('../assets/items/armor/set-67-legs.png', import.meta.url).href,
  // belts
  chain_belt: new URL('../assets/items/armor/set-07-belt.png', import.meta.url).href,
  heavy_belt: new URL('../assets/items/armor/set-63-belt.png', import.meta.url).href,
};

/** game-icons.net silhouettes, keyed like the stroke icons in components/Icon.tsx so either can stand in. */
export const GAME_ICONS: Record<string, string> = {
  // skills
  combat: new URL('../assets/icons/skills/combat.svg', import.meta.url).href,
  mining: new URL('../assets/icons/skills/mining.svg', import.meta.url).href,
  woodcutting: new URL('../assets/icons/skills/woodcutting.svg', import.meta.url).href,
  harvesting: new URL('../assets/icons/skills/harvesting.svg', import.meta.url).href,
  smithing: new URL('../assets/icons/skills/smithing.svg', import.meta.url).href,
  alchemy: new URL('../assets/icons/skills/alchemy.svg', import.meta.url).href,
  gemcutting: new URL('../assets/icons/skills/gemcutting.svg', import.meta.url).href,
  // navigation
  home: new URL('../assets/icons/navigation/home.svg', import.meta.url).href,
  tree: new URL('../assets/icons/navigation/tree.svg', import.meta.url).href,
  equipment: new URL('../assets/icons/navigation/equipment.svg', import.meta.url).href,
  bench: new URL('../assets/icons/navigation/bench.svg', import.meta.url).href,
  forge: new URL('../assets/icons/navigation/forge.svg', import.meta.url).href,
  gems: new URL('../assets/icons/navigation/gems.svg', import.meta.url).href,
  stash: new URL('../assets/icons/navigation/stash.svg', import.meta.url).href,
  vendor: new URL('../assets/icons/navigation/vendor.svg', import.meta.url).href,
  settings: new URL('../assets/icons/navigation/settings.svg', import.meta.url).href,
  map: new URL('../assets/icons/navigation/map.svg', import.meta.url).href,
  trophy: new URL('../assets/icons/navigation/achievements.svg', import.meta.url).href,
  // status
  heart: new URL('../assets/icons/status/life.svg', import.meta.url).href,
  skull: new URL('../assets/icons/status/death.svg', import.meta.url).href,
  lock: new URL('../assets/icons/status/locked.svg', import.meta.url).href,
  clock: new URL('../assets/icons/status/duration.svg', import.meta.url).href,
  bolt: new URL('../assets/icons/status/shock.svg', import.meta.url).href,
  target: new URL('../assets/icons/status/accuracy.svg', import.meta.url).href,
};

/** Kibyra pixel-art pieces, kept for a few special touches rather than everyday UI. Drawn at 1× or 2× only. */
export const KIBYRA: Record<string, string> = {
  purse: new URL('../assets/items/currency/money-bag.png', import.meta.url).href,
  stall: new URL('../assets/icons/navigation/market.png', import.meta.url).href,
};

/** Pack art for an art key (`items/iron_hat`), or undefined. */
export function packArtUrl(key: string): string | undefined {
  const [group, id] = key.replace(/\.[a-z]+$/, '').split('/');
  return group === 'items' ? ITEM_ART[id] : undefined;
}
