import { WOODS } from '../data/woodcutting';
import { resinDef } from '../data/craftMats';
import type { SkillAction } from '../data/skills';
import type { Ctx } from './context';
import type { GameState } from './types';
import { awardProtectedProgress } from './professions';
import { chance } from './rng';

export function woodcuttingDone(s: GameState, ctx: Ctx, a: SkillAction): Record<string, number> {
  if (!a.woodcutting) return {};
  const { wood, mode } = a.woodcutting;
  const tier = WOODS.findIndex((w) => w.id === wood);
  const c = s.professionProgress.counters;
  const count = (key: string) => c[`wood.${key}`] = (c[`wood.${key}`] ?? 0) + 1;
  const outputs: Record<string, number> = {};
  if (mode !== 'ordinary') {
    const n = count(`cycles.${a.id}`);
    if (n % 2 === 0) outputs[`${wood}_log`] = 1;
    if (mode === 'resin' && n % 5 === 0) outputs[`${wood}_resin`] = 1;
  }
  const threshold = mode === 'heartwood' ? 30 : mode === 'ordinary' && tier >= 4 ? 60 : 0;
  if (threshold) {
    // Preserve each rate across task switches; ordinary timber and targeted surveys have separate counters.
    const n = count(mode === 'heartwood' ? 'heartwood.survey' : 'heartwood.timber');
    const amount = (n % threshold === 0 ? 1 : 0) + (chance(ctx.rng, 0.01) ? 1 : 0);
    if (amount) awardProtectedProgress(s, ctx, 'heartwood_fragment', amount);
  }
  return outputs;
}

export function woodcuttingAccessHint(_s: GameState, _a: SkillAction): string | null {
  return null;
}

export function woodcuttingPreview(s: { professionProgress: { counters: Record<string, number> } }, a: SkillAction): string[] {
  if (a.skill !== 'woodcutting') return [];
  if (a.id === 'mill_heartwood') return ['20 Heartwood Fragments → 1 Ancient Heartwood per 30-second refinement. Full cost; yield, conservation and manual doubles cannot multiply it. Unlimited material storage.', 'Smithing 45/Forge 3 makes Heartwood Frames with five Yew Planks, for later bow, staff and defensive projects. Convergence Frames use heartwood at Smithing 85. Finished unique recipes remain unavailable. Select refinement yourself.'];
  if (a.id === 'cut_ley') return ['Guaranteed Arcane Dust each cycle for Alchemy, Gemcutting, Rune-carving and Cartography; existing log and resin bonus rolls remain.'];
  if (a.id === 'cut_weeping') return ['Chance-focused Oak Resin: existing 10% base roll, with occasional Oak Logs. For guaranteed resin choose Oak Resin Stand.'];
  const source = a.woodcutting;
  const tier = WOODS.findIndex((w) => w.id === (source?.wood ?? a.id.replace('mill_', '')));
  if (tier < 0) return [];
  const w = WOODS[tier], c = s.professionProgress.counters;
  const left = (key: string, n: number) => n - ((c[`wood.${key}`] ?? 0) % n);
  const lines: string[] = [];
  if (source?.mode === 'resin') {
    const resin = resinDef(`${w.id}_resin`)!;
    lines.push(`Resin-focused: 1.5× ordinary time; one ${w.name} Log every second completion (next in ${left(`cycles.${a.id}`, 2)}), one resin every 5 (next in ${left(`cycles.${a.id}`, 5)}). No survey or heartwood progress. ${resin.name}: +${resin.ilvl} item level as a Smithing catalyst, capped by Forge. Improves eligible modifier tiers, not guaranteed stats; one resin spent per base. No random resin bonus on this stand.`);
  }
  if (source?.mode === 'heartwood') lines.push(`Targeted heartwood: one Yew Log every second completion (next in ${left(`cycles.${a.id}`, 2)}). One Heartwood Fragment every 30 survey cycles (next in ${left('heartwood.survey', 30)}), plus 1% extra per cycle. Refine 20 fragments into 1 Ancient Heartwood separately. At base speed, at most 80 minutes cutting + 30 seconds milling; no combat or jackpot required.`);
  if (source?.mode === 'ordinary') {
    if (tier >= 4) lines.push(`Incidental heartwood: one fragment every 60 Ancient/Spirit/Worldwood ordinary cycles (next in ${left('heartwood.timber', 60)}), plus 1% extra. Targeted Ancient Heartwood Survey is faster.`);
  }
  return lines;
}
