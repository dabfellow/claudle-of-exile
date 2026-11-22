import type { SkillAction } from './skills';

/**
 * Agility: run courses for xp. Its reward is reach, not raw power. Levels open shortcuts elsewhere: Heist rooms go
 * quicker, fights close the distance to monsters sooner, and hidden gathering spots in other professions open up.
 */
const course = (id: string, name: string, level: number, intervalMs: number, xp: number, color: string): SkillAction => ({
  id: `agility_${id}`, skill: 'agility', name, level, intervalMs, xp, color,
});

/** Raw XP; the action registry applies its existing 0.3 scale once. Courses give xp only. */
export const AGILITY_ACTIONS: SkillAction[] = [
  course('cinder_rooftops', 'Cinder Road Rooftops', 1, 3000, 8, '#c89a6a'),
  course('ashwood_canopy', 'Ashwood Canopy Run', 10, 3500, 16, '#6fae4a'),
  course('crypt_ledges', 'Crypt Ledges', 20, 4000, 28, '#8a8aa0'),
  course('shipgrave_rigging', 'Shipgrave Rigging', 30, 4000, 40, '#6b8aa8'),
  course('stormcliff_ascent', 'Stormcliff Ascent', 40, 4500, 54, '#7fc8f8'),
  course('kurgan_barrows', 'Kurgan Barrow Leaps', 50, 5000, 68, '#b8a070'),
  course('pyre_spires', 'Pyre Temple Spires', 60, 5500, 82, '#e0702a'),
  course('bell_tower', 'Bell Foundry Towers', 70, 6000, 96, '#d8c070'),
  course('glacier_traverse', 'Hanging Glacier Traverse', 80, 6500, 110, '#a5d8f0'),
  course('leviathan_rib', 'Leviathan Rib Climb', 90, 7000, 124, '#5fb0a8'),
];

export type ShortcutKind = 'closeIn' | 'heist' | 'spot';

export interface AgilityShortcut {
  level: number;
  kind: ShortcutKind;
  name: string;
  desc: string;
  /** closeIn / heist: the share of time cut at this step (not cumulative; the highest reached applies) */
  cut?: number;
  /** spot: the gathering action this opens */
  actionId?: string;
}

/** Every shortcut in level order. The Agility page lists them; the engine reads them through the helpers below. */
export const AGILITY_SHORTCUTS: AgilityShortcut[] = [
  { level: 5, kind: 'closeIn', name: 'Quick Feet', desc: 'Reach monsters out of range 10% sooner in fights', cut: 0.1 },
  { level: 12, kind: 'heist', name: 'Rooftop Entry', desc: 'Heist rooms take 5% less time', cut: 0.05 },
  { level: 18, kind: 'spot', name: 'Cliffside Vein', desc: 'Opens a hidden iron seam in Mining', actionId: 'mine_cliffside' },
  { level: 25, kind: 'closeIn', name: 'Vaulting', desc: 'Reach monsters out of range 20% sooner in fights', cut: 0.2 },
  { level: 35, kind: 'heist', name: 'Drainpipe Routes', desc: 'Heist rooms take 10% less time', cut: 0.1 },
  { level: 38, kind: 'spot', name: 'Ledge Garden', desc: 'Opens a hidden herb ledge in Foraging', actionId: 'herb_ledge' },
  { level: 45, kind: 'closeIn', name: 'Wall Run', desc: 'Reach monsters out of range 30% sooner in fights', cut: 0.3 },
  { level: 55, kind: 'heist', name: 'Skylight Drop', desc: 'Heist rooms take 15% less time', cut: 0.15 },
  { level: 58, kind: 'spot', name: 'Falls Grotto', desc: 'Opens a hidden mithril grotto in Mining', actionId: 'mine_grotto' },
  { level: 65, kind: 'closeIn', name: 'Free Running', desc: 'Reach monsters out of range 40% sooner in fights', cut: 0.4 },
  { level: 75, kind: 'heist', name: 'Ghost Route', desc: 'Heist rooms take 20% less time', cut: 0.2 },
  { level: 85, kind: 'closeIn', name: 'Windstep', desc: 'Reach monsters out of range 50% sooner in fights', cut: 0.5 },
];

/** Agility level a hidden gathering spot needs, or undefined for ordinary actions. */
export const AGILITY_SPOT_LEVEL: Record<string, number> = Object.fromEntries(
  AGILITY_SHORTCUTS.filter((x) => x.kind === 'spot').map((x) => [x.actionId!, x.level]),
);

/** Share of time cut for this kind of shortcut at an Agility level. */
export function agilityCut(kind: 'closeIn' | 'heist', level: number): number {
  return AGILITY_SHORTCUTS.reduce((best, x) => (x.kind === kind && level >= x.level ? Math.max(best, x.cut ?? 0) : best), 0);
}
