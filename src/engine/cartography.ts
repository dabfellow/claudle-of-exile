import { CARTOGRAPHY_GATE, MASTER_UPGRADE_MAPS, UPGRADE_MAPS } from '../data/cartography';
import type { SkillAction } from '../data/skills';
import { addMaps, mapsHeld } from './maps';
import { skillTreeStats } from './skillTree';
import type { GameState } from './types';

export function cartographyOpen(s: GameState): boolean {
  return s.unlockedZones.includes(CARTOGRAPHY_GATE.zone);
}

/** Maps of the tier below this recipe uses up: none for a drawing. */
export function upgradeCost(s: GameState, a: SkillAction): number {
  if (!a.chart?.upgrade) return 0;
  return skillTreeStats(s).masterCartographer ? MASTER_UPGRADE_MAPS : UPGRADE_MAPS;
}

/** Does this recipe have the lower maps it needs? */
export function hasChartMaps(s: GameState, a: SkillAction): boolean {
  return !a.chart?.upgrade || mapsHeld(s, a.chart.tier - 1) >= upgradeCost(s, a);
}

/** The finished map goes into the Map Device's own stock. `paid` is false when Steady Hands saved the inputs. */
export function chartDone(s: GameState, a: SkillAction, mult: number, paid: boolean, outputs: Record<string, number>): void {
  const { tier, qty } = a.chart!;
  if (paid && a.chart!.upgrade) addMaps(s, tier - 1, -upgradeCost(s, a));
  const made = qty * mult;
  outputs[addMaps(s, tier, made)] = made;
  s.lifetime.mapsDrawn += made;
}
