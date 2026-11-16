import { flaskDef } from '../data/flasks';
import { ALCH_DOUBLE } from '../data/hideout';
import { materialDef } from '../data/materials';
import type { SkillAction } from '../data/skills';
import { skillTreeStats } from './skillTree';
import type { GameState, StatKey } from './types';
import { stationLevelFor } from './skills';
import { describeStat } from '../data/statText';

export function alchemyPreview(s: GameState, a: SkillAction): string[] {
  if (a.skill !== 'alchemy') return [];
  const lines: string[] = [];

  if (a.flaskId) {
    const f = flaskDef(a.flaskId);
    const uses = Math.floor(f.maxCharges / f.chargesPerUse);
    const durSec = +(f.durationMs / 1000).toFixed(1);

    if (f.kind === 'life') {
      const perSec = Math.round((f.heal ?? 0) / durSec);
      lines.push(`Life recovery: restores ${f.heal} Life over ${durSec}s (${perSec} Life/s).`);
      lines.push(`Capacity: ${f.maxCharges} charges total; uses ${f.chargesPerUse} charges per drink (${uses} use${uses === 1 ? '' : 's'} from full). Refills on monster kills.`);
      lines.push('Equip in a belt slot on your Character page. Optional Instilling automation rules trigger uses in combat without manual clicking.');
    } else if (f.kind === 'mana') {
      const perSec = Math.round((f.heal ?? 0) / durSec);
      lines.push(`Mana recovery: restores ${f.heal} Mana over ${durSec}s (${perSec} Mana/s).`);
      lines.push(`Capacity: ${f.maxCharges} charges total; uses ${f.chargesPerUse} charges per drink (${uses} use${uses === 1 ? '' : 's'} from full). Refills on monster kills.`);
      lines.push('Equip in a belt slot on your Character page. Automation rules trigger uses when low on Mana.');
    } else {
      const buffs = Object.entries(f.buff ?? {}).map(([k, v]) => describeStat(k as StatKey, v)).join(', ');
      lines.push(`Utility effect: ${buffs} for ${durSec}s.`);
      lines.push(`Capacity: ${f.maxCharges} charges total; uses ${f.chargesPerUse} charges per drink (${uses} use${uses === 1 ? '' : 's'} from full).`);
      lines.push('Equip in a belt slot. Instilling automation rules trigger uses on guard, elite or boss encounters.');
    }

    const t = skillTreeStats(s);
    if (t.qualityBrews) {
      lines.push(`Quality Brews: ${t.qualityBrews}% chance for the crafted flask to roll Magic with random affixes.`);
    }
    return lines;
  }

  if (a.protectedOutputs) {
    const outKey = Object.keys(a.protectedOutputs)[0];
    const def = materialDef(outKey);
    lines.push(`Special reagent: ${def.name}. ${def.desc ?? ''}`);
    lines.push('Protected full-cost refinement: exactly one material per completion. Yield bonuses, input conservation and manual doubles cannot multiply it.');
    lines.push('Stock for future Great Works; recipes not yet available. Unlimited material storage.');
    return lines;
  }

  // Currency / fusing / batch
  const outId = a.outputs ? Object.keys(a.outputs)[0] : '';
  if (outId) {
    try {
      const m = materialDef(outId);
      if (m.desc) lines.push(`Intended use: ${m.desc}`);
    } catch {
      // ignore
    }
  }

  const t = skillTreeStats(s);
  const alchLvl = s.account.hideout.alchemy_table ?? 1;

  if (a.batch) {
    const mult = t.bulkBrewer ? 7.5 : 8.5;
    const discount = t.bulkBrewer ? '25%' : '15%';
    lines.push(`Batch recipe: produces 10 orbs at ${mult}× input cost (${discount} material discount).`);
  } else if (a.outputs && !a.id.startsWith('fuse_')) {
    lines.push('Single orb recipe. ×10 batch recipes offer a material discount for longer idle sessions.');
  }

  const elevateChance = (t.transmuter ? t.transmuter : 0) + (alchLvl >= 8 ? 10 : 0);
  if (elevateChance > 0) {
    lines.push(`Orb elevation: ${elevateChance}% chance to produce an orb of the next tier higher.`);
  }

  if (alchLvl >= 7) {
    lines.push('Transmutative Mastery (Table L7+): 15% chance to refund all consumed ingredients.');
  }

  const doubleChance = Math.round((ALCH_DOUBLE[alchLvl - 1] ?? 0) * 100);
  if (doubleChance > 0) {
    lines.push(`Alchemy Table level ${alchLvl}: ${doubleChance}% chance of double output.`);
  }

  return lines;
}

export function alchemyAccessHint(s: GameState, a: SkillAction): string | null {
  if (a.skill !== 'alchemy') return null;
  if (s.professionProgress.legacyAccess[a.id]) return null;
  const st = stationLevelFor(a);
  if (st && (s.account.hideout[st.station] ?? 1) < st.level) {
    return `Needs ${st.station === 'forge' ? 'Forge' : 'Alchemy Table'} level ${st.level}`;
  }
  return null;
}
