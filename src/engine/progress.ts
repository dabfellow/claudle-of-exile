import { ACTIVE_GEMS, gemAct, gemReqLevel, SUPPORT_GEMS } from '../data/gems';
import { actOpen, bossesNeeded, roadsInto, ZONES, type ZoneDef } from '../data/zones';
import type { GameState } from './types';

/** The furthest act this character has an area open in. */
export function reachedAct(s: GameState): number {
  return Math.max(1, ...ZONES.filter((z) => s.unlockedZones.includes(z.id)).map((z) => z.act));
}

/** Whether a gem can turn up for this character yet: drops, cuts and the Gem shop all ask this. */
export function gemArrived(s: GameState, gemId: string): boolean {
  return gemAct(gemId) <= reachedAct(s);
}

let shopZones: Map<string, ZoneDef> | undefined;

/**
 * The area whose opening puts a gem on the Gem shop's shelf. Each act's gems spread over the first half of its
 * areas in level order, and never before the area at the gem's own level, so the shelf grows as you push through.
 */
export function gemShopZone(gemId: string): ZoneDef | undefined {
  if (!shopZones) {
    shopZones = new Map();
    const ids = [...ACTIVE_GEMS, ...SUPPORT_GEMS].map((g) => g.id);
    for (const act of new Set(ZONES.map((z) => z.act))) {
      const zones = ZONES.filter((z) => z.act === act);
      const gems = ids.filter((id) => gemAct(id) === act);
      const levels = [...new Set(gems.map(gemReqLevel))].sort((a, b) => a - b);
      const spread = Math.ceil(zones.length / 2);
      for (const id of gems) {
        const lvl = gemReqLevel(id);
        const rank = Math.floor((levels.indexOf(lvl) * spread) / levels.length);
        const fit = zones.findIndex((z) => z.levelRange[1] >= lvl);
        shopZones.set(id, zones[Math.max(rank, fit < 0 ? zones.length - 1 : fit)]);
      }
    }
  }
  return shopZones.get(gemId);
}

/** Whether the Gem shop sells this gem yet: its area is open. */
export function gemInShop(s: GameState, gemId: string): boolean {
  const z = gemShopZone(gemId);
  return !!z && s.unlockedZones.includes(z.id);
}

/** Bosses beaten in one act. */
export function bossesBeatenInAct(s: GameState, act: number): number {
  return ZONES.filter((z) => z.act === act && s.bossesDefeated.includes(z.id)).length;
}

/** Whether an area's requirements are met: one of its roads cleared, and enough of its act's bosses beaten. */
export function zoneRequirementsMet(s: GameState, z: ZoneDef): boolean {
  if (!actOpen(z.act)) return false;
  const roads = roadsInto(z);
  const road = roads.length === 0 || roads.some((id) => s.bossesDefeated.includes(id));
  return road && bossesBeatenInAct(s, z.act) >= bossesNeeded(z);
}

/** Open every area whose requirements are now met; returns the ones newly opened. */
export function openReachedZones(s: GameState): ZoneDef[] {
  const opened = ZONES.filter((z) => !s.unlockedZones.includes(z.id) && zoneRequirementsMet(s, z));
  for (const z of opened) s.unlockedZones.push(z.id);
  return opened;
}

/** What's still missing before an area opens, for its locked card. */
export function zoneLockText(s: GameState, z: ZoneDef): string {
  if (!actOpen(z.act)) return 'This act isn’t open yet.';
  const roads = roadsInto(z);
  const parts: string[] = [];
  if (roads.length && !roads.some((id) => s.bossesDefeated.includes(id))) {
    parts.push(`Defeat the boss of ${roads.map((id) => ZONES.find((x) => x.id === id)?.name ?? 'the act before').join(' or ')}`);
  }
  const need = bossesNeeded(z) - bossesBeatenInAct(s, z.act);
  if (need > 0) parts.push(`beat ${need} more Act ${z.act} boss${need === 1 ? '' : 'es'}`);
  return parts.length ? `${parts.join(', and ')} to unlock.` : 'Opens on your next boss kill.';
}
