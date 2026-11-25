import { materialDef } from '../data/materials';
import { TAILOR_TIERS } from '../data/tailoring';
import { addBank, canAfford, materialRoom, payCost } from './bank';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import type { Ctx } from './context';
import type { GameState } from './types';
import { levelOf } from './xp';

/** Why a stack of hides can't be bought right now, or null. The stall never runs out. */
export function hideBlocker(s: GameState, hide: string, qty: number): string | null {
  const tier = TAILOR_TIERS.find((t) => t.hide === hide);
  if (!tier) return 'Not sold here';
  if (isClassic(s)) return CLASSIC_BLOCK;
  if (levelOf('tailoring', s.skills.tailoring ?? 0) < tier.level) return `Requires Tailoring level ${tier.level}`;
  if (materialRoom(s, hide) < qty) return 'No room for more';
  if (!canAfford(s, { gold: tier.hidePrice * qty })) return 'Not enough gold';
  return null;
}

export function buyHides(s: GameState, ctx: Ctx, hide: string, qty: number): string | null {
  const count = Math.max(1, Math.floor(qty));
  const blocked = hideBlocker(s, hide, count);
  if (blocked) return blocked;
  const tier = TAILOR_TIERS.find((t) => t.hide === hide)!;
  payCost(s, { gold: tier.hidePrice * count });
  addBank(s, hide, count);
  ctx.emit({ t: 'info', text: `Bought ${count} ${materialDef(hide).name}`, tone: 'good' });
  return null;
}
