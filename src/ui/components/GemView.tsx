import { activeGemDef, ACTIVE_GEMS, DEFAULT_ATTACK, gemReqLevel, RULE_LABELS, supportGemDef, TARGET_STATUSES, type ActiveGemDef, type TacticRule } from '../../data/gems';
import { GEM_ATTR_NAME, gemAttrReq, gemLevelReq, gemProgress, skillSummary, supportFits, supportSlots } from '../../engine/gems';
import { deriveStats } from '../../engine/stats';
import type { GameState, SkillGemInstance } from '../../engine/types';
import { fmt, ProgressBar } from './common';
import { GEM_GLYPHS } from '../assets';

const ATTR_COLOR = { str: '#d0574a', dex: '#5fbf6a', int: '#5f8de0' } as const;
const ROLE_LABEL: Record<string, string> = {
  main: 'Main',
  burst: 'Burst',
  area: 'Area',
  guard: 'Guard',
  buff: 'Buff',
  sustain: 'Sustain',
};

/**
 * A flat gem with a thin rim and a plain silhouette: skill gems are tall hexagons, supports twelve-sided.
 * Signature supports show their skill's glyph.
 */
export function GemIcon({
  def,
  size = 40,
  support = false,
  dim = false,
}: {
  def: { id?: string; name: string; attr: 'str' | 'dex' | 'int'; signatureFor?: string };
  size?: number;
  support?: boolean;
  dim?: boolean;
}) {
  const glyph = GEM_GLYPHS[def.signatureFor ?? def.id ?? ''] ?? (def.id ? GEM_GLYPHS[def.id] : undefined);
  const initials = def.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
  return (
    <span
      className={`gem-icon ${support ? 'support' : ''} ${dim ? 'dim' : ''}`}
      title={def.name}
      style={{
        width: support ? size : Math.round(size * 0.84),
        height: size,
        ['--gem' as string]: ATTR_COLOR[def.attr],
        ['--rim' as string]: `${Math.min(6, Math.max(1.5, size * 0.055))}px`,
      }}
    >
      <span className="gem-face">
        {glyph ? (
          <span className="gem-glyph" style={{ ['--icon' as string]: `url(${glyph})` }} />
        ) : (
          <span className="gem-initials" style={{ fontSize: size * 0.32 }}>
            {initials}
          </span>
        )}
      </span>
    </span>
  );
}

export function ruleText(rule: TacticRule): string {
  const r = RULE_LABELS[rule.when];
  if (r.status) return `${r.label} ${TARGET_STATUSES.find((x) => x.id === rule.status)?.label ?? '…'}`;
  return r.unit !== undefined ? `${r.label} ${rule.value ?? r.defaultValue}${r.unit}` : r.label;
}

/** "Requires 44 Dexterity (you have 30)", and a warning when the next level is out of reach. */
function GemRequirement({ have, def, level }: { have: number; def: ActiveGemDef; level: number }) {
  const attr = def.attr;
  const need = gemAttrReq(def.id, level);
  const next = gemAttrReq(def.id, level + 1);
  return (
    <div className="small" style={{ marginBottom: 6 }}>
      <span className={have >= need ? 'muted' : 'bad'}>
        Requires {need} {GEM_ATTR_NAME[attr]} (you have {have})
      </span>
      {have >= need && have < next && <div className="warn">Stops levelling: level {level + 1} needs {next}</div>}
      {have < need && <div className="bad">Can't be used until you have {need}</div>}
    </div>
  );
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
      {def.id !== DEFAULT_ATTACK.id && (() => {
        const need = gem ? gemLevelReq(gem.gemId, gem.level) : gemReqLevel(def.id);
        return <div className={`small ${d.combatLevel >= need ? 'muted' : 'bad'}`}>Requires character level {need}</div>;
      })()}
      {gem && <GemRequirement have={d.attributes[def.attr]} def={def} level={gem.level} />}
      <div className="delta-list">
        {nums.manaCost > 0 && (
          <>
            <span className="muted">Mana cost</span>
            <span style={{ color: 'var(--mana-2)' }}>{nums.manaCost}</span>
          </>
        )}
        {def.cooldownMs > 0 && (
          <>
            <span className="muted">Cooldown</span>
            <span>{(nums.cooldownMs / 1000).toFixed(1)}s</span>
          </>
        )}
        <span className="muted">{def.tags.includes('attack') ? 'Attack time' : 'Cast time'}</span>
        <span>{nums.actionMs > 0 ? `${(nums.actionMs / 1000).toFixed(2)}s` : 'Instant'}</span>
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
                Next level needs character level {gemLevelReq(gem.gemId, gem.level + 1)}
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
    : `Fits: ${ACTIVE_GEMS.filter((a) => supportFits(def, a)).map((a) => a.name).join(', ')}`;
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
      <div className="dim small">Requires character level {gemReqLevel(def.id)}</div>
      <div className="dim small">{fitsNames}</div>
      {def.mods.manaMult && def.mods.manaMult !== 1 && (
        <div className="dim small">
          Mana cost ×{def.mods.manaMult.toFixed(2)}
        </div>
      )}
    </div>
  );
}
