import { ACTIVE_GEMS, activeGemDef, gemReqLevel, gemWeapons, supportGemDef, type ActiveGemDef, type SupportGemDef } from '../data/gems';
import { GEM_ATTR_NAME, gemAttrReq } from './gems';
import { staticFamilyPool, GEM_FAMILY_NAMES, type GemFamily } from '../data/gemcutting';
import { WEAPON_FAMILIES } from '../data/bases';
import type { SkillAction } from '../data/skills';
import { addBank, recipeMaterialCount } from './bank';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import { characterLevel } from './character';
import type { Ctx } from './context';
import { skillLevel } from './skills';
import { deriveStats } from './stats';
import type { GameState } from './types';

/** Gems in a family whose required level does not exceed the character's Gemcutting skill level. */
export function gemFamilyPool(s: GameState, family: GemFamily): (ActiveGemDef | SupportGemDef)[] {
  const maxLvl = Math.max(1, skillLevel(s, 'gemcutting'));
  return staticFamilyPool(family).filter((g) => gemReqLevel(g.id) <= maxLvl);
}

/** Access hint for exact gem cutting. */
export function gemcuttingAccessHint(_s: GameState, _a: SkillAction): string | null {
  return null;
}

/** Check whether a gem is socketed on the skill bar, in active supports, or in saved loadouts. */
export function isGemEquipped(s: GameState, uid: number): boolean {
  for (const g of s.skillBar) {
    if (!g) continue;
    if (g.uid === uid) return true;
    for (const sup of g.supports) {
      if (sup && sup.uid === uid) return true;
    }
  }
  for (const g of s.storage.gems) {
    for (const sup of g.supports) {
      if (sup && sup.uid === uid) return true;
    }
  }
  for (const g of s.unpooled?.gems ?? []) {
    if (g.uid === uid) return true;
    for (const sup of g.supports) {
      if (sup && sup.uid === uid) return true;
    }
  }
  const savedGems = new Set(s.loadouts?.skills?.flatMap((set) => set.slots.map((x) => x?.gem)) ?? []);
  if (savedGems.has(uid)) return true;
  return false;
}

export interface UnequippedGem {
  uid: number;
  gemId: string;
  name: string;
  kind: 'skill' | 'support';
  level?: number;
}

/** Enumerate all unequipped and unlocked gems available for recycling. */
export function getUnequippedGems(s: GameState): UnequippedGem[] {
  const out: UnequippedGem[] = [];
  for (const g of s.storage.gems) {
    if (!isGemEquipped(s, g.uid)) {
      out.push({ uid: g.uid, gemId: g.gemId, name: activeGemDef(g.gemId).name, kind: 'skill', level: g.level });
    }
  }
  for (const sup of s.storage.supportGems) {
    if (!isGemEquipped(s, sup.uid)) {
      out.push({ uid: sup.uid, gemId: sup.supportId, name: supportGemDef(sup.supportId).name, kind: 'support' });
    }
  }
  return out;
}

/** Select a specific unequipped gem UID to be consumed by the timed recycle action. */
export function selectGemForRecycle(s: GameState, uid: number | null): void {
  s.selectedGemRecycleUid = uid;
}

/** Direct or timed recycling of an unequipped gem for 5 Arcane Dust. */
export function recycleGem(s: GameState, ctx: Ctx, gemUid: number): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  if (s.fallen) return 'This character has fallen';
  if (isGemEquipped(s, gemUid)) return 'Cannot recycle an equipped or socketed gem';

  const skillIdx = s.storage.gems.findIndex((g) => g.uid === gemUid);
  const supIdx = s.storage.supportGems.findIndex((g) => g.uid === gemUid);

  let gemName = 'Gem';
  if (skillIdx !== -1) {
    const [gem] = s.storage.gems.splice(skillIdx, 1);
    gemName = activeGemDef(gem.gemId).name;
    // Return any socketed supports inside the unequipped skill gem to the loose pile
    for (const sup of gem.supports) {
      if (sup) s.storage.supportGems.push(sup);
    }
  } else if (supIdx !== -1) {
    const [sup] = s.storage.supportGems.splice(supIdx, 1);
    gemName = supportGemDef(sup.supportId).name;
  } else {
    return 'Gem not found in gem bag';
  }

  addBank(s, 'arcane_dust', 5);
  ctx.emit({ t: 'loot', currencyId: 'arcane_dust', qty: 5 });
  ctx.emit({ t: 'info', text: `Recycled ${gemName} for 5 Arcane Dust.`, tone: 'good' });

  if (s.selectedGemRecycleUid === gemUid) {
    s.selectedGemRecycleUid = null;
  }
  return null;
}

/** Execution handler for the timed recycle_gem SkillAction. */
export function recycleGemExecution(s: GameState, ctx: Ctx, outputs: Record<string, number>): void {
  const uid = s.selectedGemRecycleUid;
  if (uid == null) return;
  const res = recycleGem(s, ctx, uid);
  if (res === null) {
    outputs['arcane_dust'] = (outputs['arcane_dust'] ?? 0) + 5;
  }
  s.selectedGemRecycleUid = null;
  s.action = null; // Stops after one completion; no automatic selection.
}

/** Player-facing previews for all Gemcutting actions. */
export function gemcuttingPreview(s: GameState, a: SkillAction): string[] {
  if (a.skill !== 'gemcutting') return [];
  const lines: string[] = [];
  const dust = s.storage.bank.arcane_dust ?? 0;
  const rough = recipeMaterialCount(s.storage.bank, 'rough_gem');

  if (a.gem?.kind === 'family' && a.gem.family) {
    const pool = gemFamilyPool(s, a.gem.family);
    const supply = Math.min(Math.floor(rough / 6), Math.floor(dust / 50));
    lines.push(`Family: ${GEM_FAMILY_NAMES[a.gem.family]}. Available supplies cover ${supply} cut(s).`);
    if (pool.length === 0) {
      lines.push(`No ${GEM_FAMILY_NAMES[a.gem.family]} eligible at Gemcutting level ${skillLevel(s, 'gemcutting')}.`);
    } else {
      const prob = (100 / pool.length).toFixed(1);
      lines.push(`Uniform 1 of ${pool.length} (${prob}% each at Gemcutting level ${skillLevel(s, 'gemcutting')}):`);
      lines.push(pool.map((g) => g.name).join(', '));
    }
    return lines;
  }

  if (a.gem?.kind === 'exact' && a.gem.exactId) {
    const gemId = a.gem.exactId;
    const req = gemReqLevel(gemId);
    const charLvl = characterLevel(s);
    const d = deriveStats(s);
    const isAct = ACTIVE_GEMS.some((g) => g.id === gemId);

    const act = isAct ? activeGemDef(gemId) : null;
    const sup = !isAct ? supportGemDef(gemId) : null;
    const def = act ?? sup;

    const supply = Math.min(Math.floor(rough / 12), Math.floor(dust / 100));
    lines.push(`Exact cut: ${def?.name ?? gemId}. Available supplies cover ${supply} cut(s).`);

    const unmet: string[] = [];
    if (charLvl < req) {
      unmet.push(`Requires character level ${req} (you are level ${charLvl})`);
    }
    if (def) {
      const needAttr = gemAttrReq(gemId, 1);
      const hasAttr = d.attributes[def.attr];
      if (hasAttr < needAttr) {
        unmet.push(`Requires ${needAttr} ${GEM_ATTR_NAME[def.attr]} (you have ${hasAttr})`);
      }
    }
    if (act) {
      const weapons = gemWeapons(act);
      if (weapons && weapons.length) {
        lines.push(`Weapon restriction: requires a ${weapons.map((w) => WEAPON_FAMILIES[w].name).join(' or ')}.`);
      }
    }
    if (sup?.signatureFor) {
      lines.push(`Signature support: links only to ${activeGemDef(sup.signatureFor).name}.`);
    }

    if (unmet.length > 0) {
      lines.push(`Equip requirement not yet met: ${unmet.join('; ')}.`);
    } else {
      lines.push('Eligible to equip immediately once cut.');
    }
    return lines;
  }

  if (a.id === 'cut_skill') {
    const supply = Math.min(Math.floor(rough / 3), Math.floor(dust / 30));
    lines.push(`Random skill gem with level requirement ≤ Gemcutting level ${skillLevel(s, 'gemcutting')}.`);
    lines.push(`Supplies cover ${supply} cut(s).`);
    return lines;
  }

  if (a.id === 'cut_support') {
    const supply = Math.min(Math.floor(rough / 4), Math.floor(dust / 40), Math.floor((s.storage.bank.frostleaf ?? 0) / 4));
    lines.push(`Random general support gem with level requirement ≤ Gemcutting level ${skillLevel(s, 'gemcutting')}.`);
    lines.push(`Supplies cover ${supply} cut(s).`);
    return lines;
  }

  if (a.id === 'cut_signature') {
    const supply = Math.min(Math.floor(rough / 6), Math.floor(dust / 60), Math.floor((s.storage.bank.emberroot ?? 0) / 5));
    lines.push(`Random signature support gem with level requirement ≤ Gemcutting level ${skillLevel(s, 'gemcutting')}.`);
    lines.push(`Favours signatures matching skills you own. Supplies cover ${supply} cut(s).`);
    return lines;
  }

  if (a.id === 'recycle_gem') {
    const uid = s.selectedGemRecycleUid;
    if (uid != null) {
      const gem = [...s.storage.gems, ...s.storage.supportGems].find((g) => g.uid === uid);
      const name = gem ? ('gemId' in gem ? activeGemDef(gem.gemId).name : supportGemDef(gem.supportId).name) : 'Selected gem';
      lines.push(`Selected: ${name} (UID ${uid}). Consumes this gem to produce 5 Arcane Dust.`);
      lines.push('Bypasses input conservation, yield multipliers, and manual doubles. Stops after one gem.');
    } else {
      lines.push('Select an unequipped gem from your inventory or gem bag to recycle for 5 Arcane Dust.');
      lines.push('Cannot recycle equipped or socketed gems. No rough gems, quality, or practice awarded.');
    }
    return lines;
  }

  if (a.id === 'cut_exceptional') {
    lines.push('Cuts 10 Crystal Shards and 5 Rough Gems into 1 Exceptional Crystal.');
    lines.push('Protected project component: bypasses input conservation, yield multipliers, and manual doubles.');
    return lines;
  }

  if (a.id === 'polish_exceptional') {
    lines.push('Polishes 1 Exceptional Crystal and 50 Arcane Dust into 1 Convergence Crystal.');
    lines.push('Protected pinnacle component for the Sum of All Things: bypasses input conservation and manual doubles.');
    return lines;
  }

  return lines;
}
