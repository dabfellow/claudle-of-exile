import { activeGemDef, RULE_LABELS, RULE_UNLOCK_NAMES, type ActiveGemDef, type RuleCondition, type RuleUnlock, type SkillPriority, type TacticRule } from '../data/gems';
import { STATIONS, stationDef, type StationGrant } from '../data/hideout';
import type { GameState } from './types';

const PRIORITY_RANK: Record<SkillPriority, number> = { high: 0, normal: 1, low: 2 };

/** The War Table level that teaches a group of reactive rules. */
export function ruleUnlockLevel(unlock: RuleUnlock): number {
  return stationDef('war_table').levels.findIndex((l) => l.grants?.rules?.includes(unlock)) + 1;
}

/** Why a rule can't be used yet, or null. */
export function ruleLockReason(s: GameState, when: RuleCondition): string | null {
  const unlock = RULE_LABELS[when].unlock;
  if (!unlock || s.automation.rules.includes(unlock)) return null;
  return `${RULE_UNLOCK_NAMES[unlock]}: War Table level ${ruleUnlockLevel(unlock)}`;
}

/** Every rule has to pass, and a rule still locked (kept from an old save) never does. */
export function rulesPass(s: GameState, rules: TacticRule[], allows: (rule: TacticRule) => boolean): boolean {
  return rules.every((r) => !ruleLockReason(s, r.when) && allows(r));
}

export function ruleSlots(s: GameState): number {
  return s.automation.ruleSlots;
}

/** Answering a wind-up is what lets a boss be left to your rules. */
export function bossesOffline(s: GameState): boolean {
  return s.automation.rules.includes('windups');
}

export function offlineCapMs(s: GameState): number {
  return s.automation.offlineHours * 60 * 60 * 1000;
}

/** A station level's unlocks. They only ever add up. */
export function grantUnlocks(s: GameState, grant: StationGrant | undefined): void {
  if (!grant) return;
  const a = s.automation;
  a.rules = [...new Set([...a.rules, ...(grant.rules ?? [])])];
  a.ruleSlots = Math.max(a.ruleSlots, grant.ruleSlots ?? 0);
  a.offlineHours = Math.max(a.offlineHours, grant.offlineHours ?? 0);
}

/** Everything every station can give, for the sim and tests that aren't about earning it. */
export function unlockEverything(s: GameState): void {
  for (const st of STATIONS) st.levels.forEach((l) => grantUnlocks(s, l.grants));
}

/** The gem's suggested rule, or Whenever ready while that one is locked. */
export function suggestedRule(s: GameState, def: ActiveGemDef): TacticRule {
  return ruleLockReason(s, def.defaultRule.when) ? { when: 'always' } : { ...def.defaultRule };
}

/**
 * The order skills are tried in, as bar slots: by priority, then skills with a cooldown (guards, buffs, spells, area
 * skills) before cooldown-free attacks, which would otherwise crowd out everything below them, then by slot.
 */
export function castOrder(s: GameState): number[] {
  const hasCooldown = (slot: number) => activeGemDef(s.skillBar[slot]!.gemId).cooldownMs > 0;
  return s.skillBar
    .flatMap((gem, slot) => (gem ? [slot] : []))
    .sort((a, b) => PRIORITY_RANK[s.skillBar[a]!.priority] - PRIORITY_RANK[s.skillBar[b]!.priority] || Number(hasCooldown(b)) - Number(hasCooldown(a)) || a - b);
}
