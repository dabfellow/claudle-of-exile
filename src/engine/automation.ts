import { activeGemDef, RULE_LABELS, RULE_UNLOCK_NAMES, type ActiveGemDef, type RuleCondition, type RuleUnlock, type SkillAim, type SkillPriority, type TacticRule } from '../data/gems';
import { STATIONS, stationDef, type StationGrant } from '../data/hideout';
import { actOpen, ZONES, type BossMechanic, type ZoneDef } from '../data/zones';
import { monsterGround } from './battlefield';
import type { GameState, GroundKind, SkillGemInstance } from './types';

const PRIORITY_RANK: Record<SkillPriority, number> = { high: 0, normal: 1, low: 2 };

/** Ground some monster can put under you: a caster's spell, or a boss's nova or scorch. The rest stay greyed out until an act that lays them opens. */
export const GROUND_IN_PLAY: ReadonlySet<GroundKind> = new Set(
  ZONES.filter((z) => actOpen(z.act)).flatMap((z) => [
    ...z.monsters.filter((m) => m.basic.ground).map((m) => monsterGround(m, m.dmgType)),
    ...(z.boss.basic.ground ? [monsterGround(z.boss, z.boss.dmgType)] : []),
    ...(z.boss.mechanics?.some((k) => k === 'nova' || k === 'scorch') ? [monsterGround(z.boss, z.boss.novaType ?? z.boss.dmgType)] : []),
  ]),
);

/** The War Table level that teaches a group of reactive rules. */
export function ruleUnlockLevel(unlock: RuleUnlock): number {
  return stationDef('war_table').levels.findIndex((l) => l.grants?.rules?.includes(unlock)) + 1;
}

/** Why a rule can't be used yet, or null. */
export function ruleLockReason(s: GameState, when: RuleCondition): string | null {
  const unlock = RULE_LABELS[when].unlock;
  if (!unlock || s.account.automation.rules.includes(unlock)) return null;
  return `${RULE_UNLOCK_NAMES[unlock]}: War Table level ${ruleUnlockLevel(unlock)}`;
}

/** Every rule has to pass, and a rule still locked (kept from an old save) never does. */
export function rulesPass(s: GameState, rules: TacticRule[], allows: (rule: TacticRule) => boolean): boolean {
  return rules.every((r) => !ruleLockReason(s, r.when) && allows(r));
}

/** Why a rule can't aim a skill yet, or null. */
export function aimLockReason(s: GameState): string | null {
  if (s.account.automation.rules.includes('aim')) return null;
  return `${RULE_UNLOCK_NAMES.aim}: War Table level ${ruleUnlockLevel('aim')}`;
}

/** Where a skill's rules send it. A rule still locked (kept from an old save) aims at nothing. */
export function skillAim(s: GameState, gem: SkillGemInstance): SkillAim | undefined {
  return aimLockReason(s) ? undefined : gem.rules.find((r) => r.aim)?.aim;
}

/** A skill on the bar that fires by rule, hits, and gets to martyrs: aimed at them, or an area or chain that finds them by itself. */
function strikesMartyrs(s: GameState): boolean {
  return s.skillBar.some((g) => {
    if (!g || g.rules[0].when === 'manual') return false;
    const { role, effect } = activeGemDef(g.gemId);
    if (!effect.weaponPct && !effect.base) return false;
    const spreads = (effect.area && effect.area !== 'target') || effect.targets === 'chain' || effect.targets === 'all';
    return skillAim(s, g) === 'martyrs' || (spreads && role !== 'guard' && role !== 'buff' && role !== 'sustain' && role !== 'summon');
  });
}

export function ruleSlots(s: GameState): number {
  return s.account.automation.ruleSlots;
}

/** Answering a wind-up is what lets a boss be left to your rules. */
export function bossesOffline(s: GameState): boolean {
  return s.account.automation.rules.includes('windups');
}

/** What shakes off Frostbite: guards and movement skills (drinking a flask does too). */
export function cleansesFrostbite(def: ActiveGemDef): boolean {
  return def.role === 'guard' || !!def.effect.stepOut;
}

/** Something fires by itself as Frostbite builds: a cleansing skill on the Frostbite rule, or a flask Instilled for it. */
function answersFrostbite(s: GameState): boolean {
  const skill = s.skillBar.some((g) => g && cleansesFrostbite(activeGemDef(g.gemId)) && g.rules.some((r) => r.when === 'frostbite'));
  return (skill && !ruleLockReason(s, 'frostbite')) || s.flaskSlots.some((f) => f?.instill === 'frostbite');
}

/** A skill on the bar that fires on a channel and can break it, with an interrupt or a stun. No stun lands on a chained boss, so that takes an interrupt. */
export function rulesBreakChannels(s: GameState, chained = false): boolean {
  if (ruleLockReason(s, 'enemyChannels')) return false;
  return s.skillBar.some((g) => {
    if (!g?.rules.some((r) => r.when === 'enemyChannels')) return false;
    const { interrupts, stunChance } = activeGemDef(g.gemId).effect;
    return !!(interrupts || (stunChance && !chained));
  });
}

/**
 * Left alone, a boss only comes out if your rules can finish it: martyrs need a skill that strikes them, or the fight
 * never ends, Frostbite needs an answer, or the hours end in a freeze, and a channel left to land snowballs until you die.
 */
export function bossLeftToRules(s: GameState, zone: ZoneDef): boolean {
  const has = (k: BossMechanic) => !!zone.boss.mechanics?.includes(k);
  return bossesOffline(s) && (!has('martyrs') || strikesMartyrs(s)) && (!has('frostbite') || answersFrostbite(s)) && (!has('channel') || rulesBreakChannels(s, has('martyrs')));
}

export function offlineCapMs(s: GameState): number {
  return s.account.automation.offlineHours * 60 * 60 * 1000;
}

/** A station level's unlocks. They only ever add up. */
export function grantUnlocks(s: GameState, grant: StationGrant | undefined): void {
  if (!grant) return;
  const a = s.account.automation;
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
 * The order skills are tried in, as bar slots: by priority, then skills with a cooldown (guards, buffs, spells), area
 * skills, which wait on their rule for a pack, and stacking skills, which wait on theirs until the stacks are full,
 * before the other cooldown-free skills, which would otherwise crowd out everything below them, then by slot.
 */
export function castOrder(s: GameState): number[] {
  const goesFirst = (slot: number) => {
    const def = activeGemDef(s.skillBar[slot]!.gemId);
    return def.cooldownMs > 0 || def.role === 'area' || !!def.effect.buff?.maxStacks || !!def.effect.rend;
  };
  return s.skillBar
    .flatMap((gem, slot) => (gem ? [slot] : []))
    .sort((a, b) => PRIORITY_RANK[s.skillBar[a]!.priority] - PRIORITY_RANK[s.skillBar[b]!.priority] || Number(goesFirst(b)) - Number(goesFirst(a)) || a - b);
}
