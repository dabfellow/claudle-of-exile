import { useState } from 'react';
import { AFFIXES } from '../../data/affixes';
import { AUTO_SALVAGE_QUARTERMASTER_LEVEL } from '../../data/hideout';
import { stationLevel } from '../../engine/hideout';
import {
  ALL_ITEM_SLOTS,
  exportLootFilterCode,
  importLootFilterCode,
  LOOT_HIGHLIGHT_COLORS,
  type LayeredLootFilter,
  type LootFilterRule,
  type LootOverrideId,
  type LootRuleAction,
  type LootStrictness,
} from '../../engine/lootFilter';
import type { GameState, ItemSlotType, Rarity } from '../../engine/types';
import { game } from '../../game';

const PRESETS: { id: LootStrictness; name: string; desc: string }[] = [
  { id: 'off', name: 'Off', desc: 'Show every drop.' },
  { id: 'soft', name: 'Soft', desc: 'As you level, hide outdated normal gear.' },
  { id: 'strict', name: 'Strict', desc: 'Hide normal gear and outdated magic gear.' },
  { id: 'very_strict', name: 'Very strict', desc: 'Keep relevant rares, high-tier gear and uniques.' },
  { id: 'uber', name: 'Uber', desc: 'Show only exceptional endgame rares and uniques.' },
];

const OVERRIDES: { id: LootOverrideId; name: string; desc: string; value: 'show' | 'hide' | 'highlight' }[] = [
  { id: 'life_rings', name: 'Rings with Life', desc: 'Always show rings with a maximum-Life modifier.', value: 'show' },
  { id: 'normal_gear', name: 'Normal gear', desc: 'Always hide normal gear, even when the preset would show it.', value: 'hide' },
  { id: 'top_tier_mods', name: 'Tier 1 modifiers', desc: 'Always show and highlight gear with a T1 modifier.', value: 'highlight' },
];

const ACTIONS: { id: LootRuleAction; label: string }[] = [
  { id: 'show', label: 'Show' }, { id: 'hide', label: 'Hide' }, { id: 'highlight', label: 'Highlight colour' },
  { id: 'sound', label: 'Show + sound' }, { id: 'auto_salvage', label: 'Auto-salvage' },
];

const MOD_OPTIONS = AFFIXES.filter((a) => !a.uniqueOnly && a.tiers.length).sort((a, b) => a.label.localeCompare(b.label));
const title = (value: string) => value === 'offhand' ? 'Offhand' : value === 'body' ? 'Body armour' : value[0].toUpperCase() + value.slice(1).replace('_', ' ');

export function LootFilterManager({ s }: { s: GameState }) {
  const filter = s.settings.lootFilter!;
  const [tab, setTab] = useState<'presets' | 'custom'>('presets');
  const [share, setShare] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const change = (fn: (value: LayeredLootFilter) => void) => game.act((st) => fn(st.settings.lootFilter!));

  const makeCode = async () => {
    const code = exportLootFilterCode(filter);
    setShare(code);
    setShareMessage('Share code ready.');
    try {
      await navigator.clipboard.writeText(code);
      setShareMessage('Copied share code.');
    } catch {
      // The textarea still contains the code where clipboard access is blocked.
    }
  };
  const pasteCode = () => {
    const result = importLootFilterCode(share);
    if (!result.ok) return setShareMessage(result.error);
    change((value) => void (value.rules = result.rules));
    setShareMessage(`Imported ${result.rules.length} rule${result.rules.length === 1 ? '' : 's'}.`);
  };

  return (
    <div className="loot-filter-manager">
      <div className="quartermaster-auto">
        <b>Automatic salvage</b>
        <span className="dim small">Rarity salvage works alongside the layers below. Uniques are always protected.</span>
        <div className="row wrap">
          {(['normal', 'magic', 'rare'] as const).map((rarity) => {
            const required = AUTO_SALVAGE_QUARTERMASTER_LEVEL[rarity];
            const open = stationLevel(s, 'quartermaster') >= required;
            return (
              <label key={rarity} className="chip" title={open ? '' : `Requires Quartermaster level ${required}`}>
                <input type="checkbox" disabled={!open} checked={s.settings.autoSalvage[rarity]} onChange={(e) => game.act((st) => void (st.settings.autoSalvage[rarity] = e.target.checked))} />
                <span className={`rarity-${rarity}`}>{title(rarity)}</span> <span className="dim small">Lv {required}</span>
              </label>
            );
          })}
          <label className="chip">
            <input type="checkbox" checked={!!s.settings.filterOffClassLoot} onChange={(e) => game.act((st) => void (st.settings.filterOffClassLoot = e.target.checked))} />
            Hide and salvage off-class gear
          </label>
        </div>
      </div>

      <div className="tabs loot-filter-tabs">
        <button className={`tab ${tab === 'presets' ? 'active' : ''}`} onClick={() => setTab('presets')}>Presets & overrides</button>
        <button className={`tab ${tab === 'custom' ? 'active' : ''}`} onClick={() => setTab('custom')}>Custom rules <span className="num">{filter.rules.length}</span></button>
      </div>

      {tab === 'presets' ? (
        <>
          <p className="dim small">Presets grow stricter with {s.character.name}'s level. They hide drops but never salvage them.</p>
          <div className="loot-preset-grid">
            {PRESETS.map((preset) => (
              <button key={preset.id} className={`loot-preset ${filter.preset === preset.id ? 'active' : ''}`} onClick={() => change((value) => void (value.preset = preset.id))}>
                <b>{preset.name}</b><span>{preset.desc}</span>
              </button>
            ))}
          </div>
          <h4>Category overrides</h4>
          <div className="loot-overrides">
            {OVERRIDES.map((override) => {
              const on = filter.overrides[override.id] === override.value;
              return (
                <label key={override.id} className={`loot-override ${on ? 'active' : ''}`}>
                  <input type="checkbox" checked={on} onChange={(e) => change((value) => void (value.overrides[override.id] = e.target.checked ? override.value : 'preset'))} />
                  <span><b>{override.name}</b><small>{override.desc}</small></span>
                </label>
              );
            })}
          </div>
        </>
      ) : (
        <CustomRules filter={filter} change={change} share={share} setShare={setShare} message={shareMessage} makeCode={makeCode} pasteCode={pasteCode} />
      )}
    </div>
  );
}

function CustomRules({ filter, change, share, setShare, message, makeCode, pasteCode }: {
  filter: LayeredLootFilter;
  change: (fn: (value: LayeredLootFilter) => void) => void;
  share: string;
  setShare: (value: string) => void;
  message: string;
  makeCode: () => void;
  pasteCode: () => void;
}) {
  const add = () => change((value) => value.rules.push({ id: `rule-${Date.now()}`, name: `Rule ${value.rules.length + 1}`, enabled: true, action: 'show' }));
  const update = (id: string, patch: Partial<LootFilterRule>) => change((value) => {
    const index = value.rules.findIndex((rule) => rule.id === id);
    if (index >= 0) value.rules[index] = { ...value.rules[index], ...patch };
  });
  const move = (id: string, direction: -1 | 1) => change((value) => {
    const from = value.rules.findIndex((rule) => rule.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= value.rules.length) return;
    [value.rules[from], value.rules[to]] = [value.rules[to], value.rules[from]];
  });
  const remove = (id: string) => change((value) => void (value.rules = value.rules.filter((rule) => rule.id !== id)));
  return (
    <div className="custom-loot-rules">
      <div className="row wrap">
        <p className="dim small grow">Top to bottom: the first enabled rule whose conditions all match decides the drop. Rules sit on top of the preset and overrides.</p>
        <button className="btn sm primary" disabled={filter.rules.length >= 100} onClick={add}>+ Add rule</button>
      </div>
      {filter.rules.length === 0 && <div className="item-tiles-empty dim small">No custom rules. Your preset and category overrides decide every drop.</div>}
      <div className="loot-rule-list">
        {filter.rules.map((rule, index) => <RuleEditor key={rule.id} rule={rule} index={index} count={filter.rules.length} update={update} move={move} remove={remove} />)}
      </div>
      <div className="loot-share">
        <h4>Share custom rules</h4>
        <p className="dim small">The code contains only this ordered custom-rule list. Importing replaces the list after it passes size, format, action, condition and colour checks.</p>
        <textarea className="input" rows={3} maxLength={50_000} value={share} placeholder="Paste a POI-LF1 share code here" onChange={(e) => setShare(e.target.value)} />
        <div className="row wrap"><button className="btn sm" onClick={makeCode}>Copy my code</button><button className="btn sm primary" disabled={!share.trim()} onClick={pasteCode}>Import code</button>{message && <span className={message.startsWith('Imported') || message.startsWith('Copied') || message.startsWith('Share') ? 'good small' : 'bad small'}>{message}</span>}</div>
      </div>
    </div>
  );
}

function RuleEditor({ rule, index, count, update, move, remove }: {
  rule: LootFilterRule; index: number; count: number;
  update: (id: string, patch: Partial<LootFilterRule>) => void;
  move: (id: string, direction: -1 | 1) => void;
  remove: (id: string) => void;
}) {
  const toggle = <T extends string>(list: T[] | undefined, value: T): T[] | undefined => {
    const next = list?.includes(value) ? list.filter((entry) => entry !== value) : [...(list ?? []), value];
    return next.length ? next : undefined;
  };
  const number = (value: string, min: number, max: number) => value === '' ? undefined : Math.max(min, Math.min(max, Math.floor(Number(value) || min)));
  const addMod = (id: string) => id && update(rule.id, { modIds: [...new Set([...(rule.modIds ?? []), id])] });
  return (
    <details className="loot-rule" open={index === 0}>
      <summary>
        <span className="loot-rule-order num">{index + 1}</span>
        <input type="checkbox" checked={rule.enabled} onClick={(e) => e.stopPropagation()} onChange={(e) => update(rule.id, { enabled: e.target.checked })} />
        <b>{rule.name}</b><span className="chip sm">{ACTIONS.find((a) => a.id === rule.action)?.label}</span>
      </summary>
      <div className="loot-rule-body">
        <div className="row wrap">
          <label className="grow">Name<input className="input sm" value={rule.name} maxLength={80} onChange={(e) => update(rule.id, { name: e.target.value || `Rule ${index + 1}` })} /></label>
          <label>Action<select className="input sm" value={rule.action} onChange={(e) => update(rule.id, { action: e.target.value as LootRuleAction })}>{ACTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
          {rule.action === 'highlight' && <label>Colour<input type="color" value={rule.highlightColor ?? LOOT_HIGHLIGHT_COLORS[0]} onChange={(e) => update(rule.id, { highlightColor: e.target.value })} /></label>}
        </div>
        <div className="loot-condition"><b>Slots</b><div className="row wrap">{ALL_ITEM_SLOTS.map((slot) => <label key={slot} className="chip sm"><input type="checkbox" checked={!!rule.slots?.includes(slot)} onChange={() => update(rule.id, { slots: toggle(rule.slots, slot as ItemSlotType) })} />{title(slot)}</label>)}</div></div>
        <div className="loot-condition"><b>Rarity</b><div className="row wrap">{(['normal', 'magic', 'rare', 'unique'] as Rarity[]).map((rarity) => <label key={rarity} className="chip sm"><input type="checkbox" checked={!!rule.rarities?.includes(rarity)} onChange={() => update(rule.id, { rarities: toggle(rule.rarities, rarity) })} />{title(rarity)}</label>)}</div></div>
        <div className="loot-condition-grid">
          <label>Item level from<input type="number" className="input sm" min={1} max={100} value={rule.minIlvl ?? ''} onChange={(e) => update(rule.id, { minIlvl: number(e.target.value, 1, 100) })} /></label>
          <label>Item level to<input type="number" className="input sm" min={1} max={100} value={rule.maxIlvl ?? ''} onChange={(e) => update(rule.id, { maxIlvl: number(e.target.value, 1, 100) })} /></label>
          <label>Mod tier or better<select className="input sm" value={rule.maxModTier ?? ''} onChange={(e) => update(rule.id, { maxModTier: number(e.target.value, 1, 9) })}><option value="">Any tier</option>{[1,2,3,4,5,6,7,8,9].map((n) => <option key={n} value={n}>T{n}+</option>)}</select></label>
          <label>Filled sockets<select className="input sm" value={rule.minSockets ?? ''} onChange={(e) => update(rule.id, { minSockets: number(e.target.value, 0, 1), maxSockets: number(e.target.value, 0, 1) })}><option value="">Any</option><option value="0">0</option><option value="1">1</option></select></label>
          <label>Dust value from<input type="number" className="input sm" min={0} max={999} value={rule.minValue ?? ''} onChange={(e) => update(rule.id, { minValue: number(e.target.value, 0, 999) })} /></label>
          <label>Dust value to<input type="number" className="input sm" min={0} max={999} value={rule.maxValue ?? ''} onChange={(e) => update(rule.id, { maxValue: number(e.target.value, 0, 999) })} /></label>
        </div>
        <div className="loot-condition"><b>Specific modifiers</b><select className="input sm" value="" onChange={(e) => addMod(e.target.value)}><option value="">Add a modifier…</option>{MOD_OPTIONS.map((mod) => <option key={mod.id} value={mod.id}>{mod.label || mod.text}</option>)}</select><div className="row wrap">{rule.modIds?.map((id) => { const mod = AFFIXES.find((a) => a.id === id); return <button key={id} className="chip sm" onClick={() => update(rule.id, { modIds: rule.modIds?.filter((x) => x !== id) })}>{mod?.label || id} ×</button>; })}</div></div>
        <div className="row wrap loot-rule-actions"><button className="btn sm ghost" disabled={index === 0} onClick={() => move(rule.id, -1)}>Move up</button><button className="btn sm ghost" disabled={index === count - 1} onClick={() => move(rule.id, 1)}>Move down</button><span className="grow" /><button className="btn sm ghost bad" onClick={() => remove(rule.id)}>Delete rule</button></div>
      </div>
    </details>
  );
}
