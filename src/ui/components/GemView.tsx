import { activeGemDef, ACTIVE_GEMS, DEFAULT_ATTACK, RULE_LABELS, supportGemDef, type ActiveGemDef, type TacticRule } from '../../data/gems';
import { gemLevelReq, gemProgress, skillSummary, supportSlots } from '../../engine/gems';
import { deriveStats } from '../../engine/stats';
import type { GameState, SkillGemInstance } from '../../engine/types';
import { fmt, ProgressBar, artUrl } from './common';
import { packArtUrl } from '../assets';

const ATTR_COLOR = { str: '#d0574a', dex: '#5fbf6a', int: '#5f8de0' } as const;
const ROLE_LABEL: Record<string, string> = {
  main: 'Main',
  burst: 'Burst',
  area: 'Area',
  guard: 'Guard',
  buff: 'Buff',
  curse: 'Curse',
  sustain: 'Sustain',
};

/** A faceted gem glyph tinted by attribute, with the skill's initials. */
export function GemIcon({ def, size = 40, support = false, dim = false }: { def: { id?: string; name: string; attr: 'str' | 'dex' | 'int' }; size?: number; support?: boolean; dim?: boolean }) {
  const color = ATTR_COLOR[def.attr];
  const art = def.id ? artUrl(`gems/${def.id}`) : undefined;
  if (art)
    return (
      <span className={`gem-icon has-art ${support ? 'support' : ''} ${dim ? 'dim' : ''}`} style={{ width: size, height: size, ['--gem' as string]: color }}>
        <img className="art" src={art} alt={def.name} width={size} height={size} draggable={false} />
      </span>
    );
  // pack icons sit inside the coloured gem, so the attribute colour still shows as a rim
  const pack = def.id ? packArtUrl(`gems/${def.id}`) : undefined;
  if (pack)
    return (
      <span className={`gem-icon pack-art ${support ? 'support' : ''} ${dim ? 'dim' : ''}`} style={{ width: size, height: size, ['--gem' as string]: color }}>
        <img className="art" src={pack} alt={def.name} width={Math.round(size * 0.72)} height={Math.round(size * 0.72)} draggable={false} />
      </span>
    );
  const initials = def.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
  return (
    <span className={`gem-icon ${support ? 'support' : ''} ${dim ? 'dim' : ''}`} style={{ width: size, height: size, ['--gem' as string]: color, fontSize: size * 0.32 }}>
      {initials}
    </span>
  );
}

export function ruleText(rule: TacticRule): string {
  const r = RULE_LABELS[rule.when];
  return r.unit !== undefined ? `${r.label} ${rule.value ?? r.defaultValue}${r.unit}` : r.label;
}

export function GemTip({ gem, state, def: given }: { gem?: SkillGemInstance | null; state: GameState; def?: ActiveGemDef }) {
  const def = given ?? (gem ? activeGemDef(gem.gemId) : DEFAULT_ATTACK);
  const d = deriveStats(state, []);
  const sum = skillSummary(d, gem ?? null);
  const nums = sum.nums;
  return (
    <div className="tip gem-tip" style={{ ['--gem' as string]: ATTR_COLOR[def.attr] }}>
      <div className="gem-tip-head">
        <GemIcon def={def} size={30} />
        <div>
          <div className="tip-title" style={{ margin: 0 }}>{def.name}</div>
          <div className="dim small">
            {ROLE_LABEL[def.role]} · {def.tags.join(', ')}
            {gem ? ` · Level ${gem.level}` : ''}
          </div>
        </div>
      </div>
      <div style={{ margin: '6px 0' }}>{def.desc}</div>
      <div className="delta-list">
        {nums.manaCost > 0 && (
          <>
            <span className="muted">Mana cost</span>
            <span style={{ color: 'var(--mana-2)' }}>{nums.manaCost}</span>
          </>
        )}
        {nums.cooldownMs > 0 && (
          <>
            <span className="muted">Cooldown</span>
            <span>{(nums.cooldownMs / 1000).toFixed(1)}s</span>
          </>
        )}
        <span className="muted">{def.tags.includes('attack') ? 'Attack time' : 'Cast time'}</span>
        <span>{(nums.actionMs / 1000).toFixed(2)}s</span>
        {sum.perUse > 0 && (
          <>
            <span className="muted">Damage per use</span>
            <span style={{ color: 'var(--accent-2)' }}>~{fmt(sum.perUse)}</span>
            <span className="muted">Damage per second</span>
            <span style={{ color: 'var(--accent-2)' }}>~{sum.perSecond.toFixed(1)}</span>
          </>
        )}
      </div>
      {gem && (
        <>
          <div className="sep" />
          <div className="dim small">
            Rule: <span style={{ color: 'var(--text)' }}>{ruleText(gem.rule)}</span>
          </div>
          <div className="dim small">
            Supports: {gem.supports.filter(Boolean).length}/{supportSlots(gem)}
            {gem.supports.filter(Boolean).map((x) => ` · ${supportGemDef(x!.supportId).name}`)}
          </div>
          {gem.level < 20 && (
            <div style={{ marginTop: 6 }}>
              <ProgressBar value={gemProgress(gem)} color="var(--gem)" />
              <div className="dim" style={{ fontSize: 'var(--fs-xs)', marginTop: 2 }}>
                Next level needs character level {gemLevelReq(gem.level + 1)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function SupportTip({ supportId }: { supportId: string }) {
  const def = supportGemDef(supportId);
  const fitsNames = def.signatureFor
    ? `Signature: only fits ${activeGemDef(def.signatureFor).name}`
    : `Fits: ${ACTIVE_GEMS.filter((a) => def.fits.some((t) => a.tags.includes(t))).map((a) => a.name).join(', ')}`;
  return (
    <div className="tip gem-tip" style={{ ['--gem' as string]: ATTR_COLOR[def.attr] }}>
      <div className="gem-tip-head">
        <GemIcon def={def} size={28} support />
        <div>
          <div className="tip-title" style={{ margin: 0 }}>{def.name}</div>
          <div className="dim small">{def.signatureFor ? 'Signature support' : 'Support gem'}</div>
        </div>
      </div>
      <div style={{ margin: '6px 0' }}>{def.desc}</div>
      <div className="dim small">{fitsNames}</div>
      {def.mods.manaMult && def.mods.manaMult !== 1 && (
        <div className="dim small">
          Mana cost ×{def.mods.manaMult.toFixed(2)}
        </div>
      )}
    </div>
  );
}
