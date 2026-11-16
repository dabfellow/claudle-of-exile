import { MINING_FOSSILS, MINING_METALS } from '../data/mining';
import type { SkillAction } from '../data/skills';
import type { Ctx } from './context';
import type { GameState } from './types';
import { awardProtectedProgress } from './professions';
import { chance } from './rng';

/** Counters are character-owned and persist across deposits, interruptions and reloads. */
export function miningDone(s: GameState, ctx: Ctx, a: SkillAction): Record<string, number> {
  const deposit = a.mining;
  if (!deposit) return {};
  const { metal, mode } = deposit;
  const counters = s.professionProgress.counters;
  const count = (key: string) => counters[key] = (counters[key] ?? 0) + 1;
  const extra: Record<string, number> = {};
  const tier = MINING_METALS.findIndex((m) => m.id === metal);
  if (mode === 'crystal' || mode === 'fossil') {
    if (count(`mining.ore.${a.id}`) % 2 === 0) extra[`${metal}_ore`] = 1;
  }
  if (mode === 'fossil') {
    const n = count('mining.fossils');
    if (n % 12 === 0) extra[MINING_FOSSILS[(n / 12 - 1) % MINING_FOSSILS.length]] = 1;
  }
  const fragment = (id: string, threshold: number) => {
    const n = count(`mining.${id}`);
    const amount = (n % threshold === 0 ? 1 : 0) + (chance(ctx.rng, 0.01) ? 1 : 0);
    if (amount) awardProtectedProgress(s, ctx, id, amount);
  };
  if (mode === 'crystal') fragment('crystal_shard', 30);
  if (mode !== 'rich' && tier >= 2) fragment('mineral_fragment', 60);
  if (mode !== 'rich' && tier >= 3) fragment('stone_fragment', 60);
  return extra;
}

/** Player-facing source/use preview uses the same counters and rotation as completion. */
export function miningPreview(s: { professionProgress: { counters: Record<string, number> } }, a: SkillAction): string[] {
  if (!a.mining) return [];
  const { metal, mode } = a.mining;
  const tier = MINING_METALS.findIndex((m) => m.id === metal);
  const c = s.professionProgress.counters;
  const left = (id: string, n: number) => n - ((c[`mining.${id}`] ?? 0) % n);
  const lines: string[] = [];
  if (mode === 'rich') lines.push('Focused metal: two ore in 1.5× ordinary time. No gems, fossils or project fragments.');
  if (mode === 'crystal' || mode === 'fossil') lines.push(`One ${MINING_METALS[tier].name} Ore every second completion; next ore in ${2 - ((c[`mining.ore.${a.id}`] ?? 0) % 2)} completion(s).`);
  if (mode === 'crystal') lines.push(`One Rough Gem each cycle for Gemcutting and jewellery. Crystal Shard in ${left('crystal_shard', 30)} crystal cycles (every 30); also 1% extra per cycle. Saved for future exceptional-crystal cutting; not available yet.`);
  if (mode === 'fossil') {
    const n = c['mining.fossils'] ?? 0;
    const name = (id: string) => id.split('_').map((v) => v[0].toUpperCase() + v.slice(1)).join(' ');
    lines.push(`Next: ${name(MINING_FOSSILS[Math.floor(n / 12) % 5])} in ${12 - n % 12} fossil cycles. Rotation: Scorched → Frigid → Metallic → Serrated → Dense. One of each within 60 cycles; shared across fossil deposits. Use with orbs, Smithing or Rune-carving.`);
  }
  if (mode !== 'rich' && tier >= 2) lines.push(`Mineral Fragment in ${left('mineral_fragment', 60)} eligible cycles (every 60); also 1% extra. Smithing 60/Forge 3 makes Wound Alloy for Convergence Frames and later unique projects.`);
  if (mode !== 'rich' && tier >= 3) lines.push(`Stone Fragment in ${left('stone_fragment', 60)} eligible cycles (every 60); also 1% extra. Smithing 70/Forge 3 makes Stone Alloy for Convergence Frames and later defensive projects.`);
  if (tier >= 3) lines.push(`${MINING_METALS[tier].name} Ore: select Smithing refinement at level ${MINING_METALS[tier].level}, five ore per bar. Adamant Bars feed Stone Alloy; other advanced bars are stock for later projects.`);
  else lines.push('Ore supplies current Smithing bases and construction bars. Copper and iron also remain ingredients of future alloys.');
  if (mode !== 'rich' && (tier >= 2 || mode === 'crystal')) lines.push('Project fragments are protected: yield bonuses and manual doubles do not multiply them. Counters carry across eligible deposits and reloads. Materials have no storage-slot limit.');
  return lines;
}

export function miningAccessHint(_s: GameState, _a: SkillAction): string | null {
  return null;
}
