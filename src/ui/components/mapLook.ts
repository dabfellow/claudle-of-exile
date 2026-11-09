import { anyArtUrl } from './common';

/** The landscape painted on each map tier's card: maps borrow campaign areas at random, so this is only its face. */
export const TIER_ART = ['mudflats', 'ashwood', 'blackreed', 'shipgrave', 'stormcliffs', 'crypt', 'brinecaves', 'sanctum', 'maelstrom', 'hallofcrowns'];

export function zoneArt(zoneId: string): string | undefined {
  return anyArtUrl(`zones/${zoneId}`);
}

/** A map tier's colour, pale to red as maps get harder. */
export function tierColor(tier: number): string {
  if (tier <= 2) return '#a9b4c2';
  if (tier <= 4) return '#7fc2b5';
  if (tier <= 6) return '#e3cf6b';
  if (tier <= 8) return '#e08a4c';
  return '#e0584f';
}
