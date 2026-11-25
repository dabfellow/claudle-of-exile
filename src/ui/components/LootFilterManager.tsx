import { useState } from 'react';
import { AFFIXES } from '../../data/affixes';
import { BASES, baseDef, obtainable } from '../../data/bases';
import { AUTO_SALVAGE_QUARTERMASTER_LEVEL } from '../../data/hideout';
import { benchBuilt } from '../../engine/crafting';
import { stationLevel } from '../../engine/hideout';
import {
  addLootFilterProfile,
  deleteLootFilterProfile,
  MAX_LOOT_FILTER_PROFILES,
  renameLootFilterProfile,
  switchLootFilterProfile,
  ALL_ARMOUR_DEFENCES,
  ALL_ITEM_SLOTS,
  ALL_WEAPON_FAMILIES,
  ARMOUR_DEFENCE_LABELS,
  describeRule,
  exportLootFilterCode,
  importLootFilterCode,
  LOOT_FLAG_LABELS,
  LOOT_HIGHLIGHT_COLORS,
  MAX_MOD_GROUPS,
  modDisplayName,
  slotLabel,
  type LayeredLootFilter,
  type LootFilterRule,
  type LootItemFlag,
  type LootModGroup,
  type LootOverrideId,
  type LootRuleAction,
  type LootStrictness,
  type ModMatchMode,
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
  { id: 'sound', label: 'Show + sound' }, { id: 'send_to_stash', label: 'Send to stash' }, { id: 'auto_salvage', label: 'Auto-salvage' },
];

interface PickOption { id: string; label: string; hint?: string; search: string }

const MOD_PICKS: PickOption[] = AFFIXES.filter((a) => !a.uniqueOnly && a.tiers.length)
  .map((a) => {
    const label = modDisplayName(a.id);
    const hint = `${a.kind === 'prefix' ? 'Prefix' : 'Suffix'}${a.benchOnly ? ' · bench craft' : ''}`;
    return { id: a.id, label, hint, search: `${label} ${a.label} ${hint}`.toLowerCase() };
  })
  .sort((a, b) => a.label.replace(/^[^A-Za-z]+/, '').localeCompare(b.label.replace(/^[^A-Za-z]+/, '')));

const ALL_BASE_PICKS: (PickOption & { slot: ItemSlotType })[] = BASES.filter(obtainable)
  .map((b) => {
    const hint = `${slotLabel(b.slot)}${b.family ? ` · ${b.family}` : ''} · level ${b.reqLevel}`;
    return { id: b.id, slot: b.slot, label: b.name, hint, search: `${b.name} ${hint} ${b.tags.join(' ')}`.toLowerCase() };
  })
  .sort((a, b) => a.label.localeCompare(b.label));
/** Bases narrowed to the rule's chosen slots, so "Ring" + "iron" finds Iron Ring rather than every iron thing. */
const basePicks = (slots?: ItemSlotType[]) => (slots?.length ? ALL_BASE_PICKS.filter((b) => slots.includes(b.slot)) : ALL_BASE_PICKS);

const RARITY_LIST: Rarity[] = ['normal', 'magic', 'rare', 'unique'];
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
      <ProfileBar s={s} />
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
          <p className="dim small">Presets grow stricter with {s.character.name}'s level. They hide drops but never salvage them. Hidden drops are left behind: they take no room on the ground or in the time-away pile, and give no Arcane Dust.</p>
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
        <CustomRules s={s} filter={filter} change={change} share={share} setShare={setShare} message={shareMessage} makeCode={makeCode} pasteCode={pasteCode} />
      )}
    </div>
  );
}

/** Saved filters: tap one to switch to it. Edits below always apply to the one in use. */
function ProfileBar({ s }: { s: GameState }) {
  const profiles = s.settings.lootFilterProfiles ?? [];
  const activeId = s.settings.activeLootFilterProfileId;
  const active = profiles.find((p) => p.id === activeId);
  const presetName = (p: (typeof profiles)[number]) => {
    const f = p.id === activeId ? s.settings.lootFilter! : p.filter;
    const rules = f.rules.length ? ` · ${f.rules.length} rule${f.rules.length === 1 ? '' : 's'}` : '';
    return `${PRESETS.find((x) => x.id === f.preset)?.name ?? 'Off'}${rules}`;
  };
  return (
    <div className="loot-profiles">
      <div className="row wrap" style={{ alignItems: 'baseline' }}>
        <b>Saved filters</b>
        <span className="dim small grow">Switch any time. Changes below save to the filter in use.</span>
      </div>
      <div className="loot-profile-list">
        {profiles.map((p) => (
          <button key={p.id} className={`loot-profile ${p.id === activeId ? 'active' : ''}`} onClick={() => game.act((st) => switchLootFilterProfile(st, p.id))}>
            <b>{p.name}</b>
            <span>{presetName(p)}</span>
          </button>
        ))}
      </div>
      <div className="row wrap">
        <button
          className="btn sm"
          disabled={profiles.length >= MAX_LOOT_FILTER_PROFILES}
          title={profiles.length >= MAX_LOOT_FILTER_PROFILES ? `Up to ${MAX_LOOT_FILTER_PROFILES} saved filters` : 'Save a copy of the filter in use under a new name'}
          onClick={() => {
            const name = prompt('Name the new filter (it starts as a copy of the one in use):', `${active?.name ?? 'Filter'} copy`);
            if (name != null) game.act((st) => void addLootFilterProfile(st, name));
          }}
        >
          + Save as new
        </button>
        <button
          className="btn sm"
          disabled={!active}
          onClick={() => {
            const name = active && prompt('Rename this filter:', active.name);
            if (active && name) game.act((st) => renameLootFilterProfile(st, active.id, name));
          }}
        >
          Rename
        </button>
        <button
          className="btn sm danger"
          disabled={!active || profiles.length <= 1}
          onClick={() => {
            if (active && confirm(`Delete the "${active.name}" filter?`)) game.act((st) => deleteLootFilterProfile(st, active.id));
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function CustomRules({ s, filter, change, share, setShare, message, makeCode, pasteCode }: {
  s: GameState;
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
        {filter.rules.map((rule, index) => <RuleEditor key={rule.id} s={s} rule={rule} index={index} count={filter.rules.length} update={update} move={move} remove={remove} />)}
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

type Patch = (patch: Partial<LootFilterRule>) => void;

const toggle = <T extends string>(list: T[] | undefined, value: T): T[] | undefined => {
  const next = list?.includes(value) ? list.filter((entry) => entry !== value) : [...(list ?? []), value];
  return next.length ? next : undefined;
};
const toNumber = (value: string, min: number, max: number) => value === '' ? undefined : Math.max(min, Math.min(max, Math.floor(Number(value) || min)));

/** A type-to-search list: phones get a full-width box and tappable results instead of a 200-row dropdown. */
function SearchPicker({ options, selected, onPick, placeholder }: {
  options: PickOption[]; selected: string[]; onPick: (id: string) => void; placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = options.filter((o) => !selected.includes(o.id) && words.every((w) => o.search.includes(w))).slice(0, 40);
  return (
    <div className="loot-picker">
      <input className="input sm" type="search" value={query} placeholder={placeholder} onFocus={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} />
      {open && (
        <div className="loot-picker-results" role="listbox">
          {matches.length === 0 && <span className="dim small">No matches.</span>}
          {matches.map((o) => (
            <button key={o.id} type="button" role="option" aria-selected={false} className="loot-picker-option" onClick={() => onPick(o.id)}>
              <span>{o.label}</span>{o.hint && <span className="dim small">{o.hint}</span>}
            </button>
          ))}
          <button type="button" className="btn sm ghost" onClick={() => { setOpen(false); setQuery(''); }}>Done</button>
        </div>
      )}
    </div>
  );
}

function Range({ label, min, max, lo, hi, onChange }: {
  label: string; min: number; max: number; lo?: number; hi?: number; onChange: (lo?: number, hi?: number) => void;
}) {
  return (
    <div className="loot-range">
      <span>{label}</span>
      <div className="row">
        <input type="number" inputMode="numeric" aria-label={`${label} from`} placeholder="min" className="input sm" min={min} max={max} value={lo ?? ''} onChange={(e) => onChange(toNumber(e.target.value, min, max), hi)} />
        <span className="dim">–</span>
        <input type="number" inputMode="numeric" aria-label={`${label} to`} placeholder="max" className="input sm" min={min} max={max} value={hi ?? ''} onChange={(e) => onChange(lo, toNumber(e.target.value, min, max))} />
      </div>
    </div>
  );
}

function Chips<T extends string>({ values, selected, label, onToggle }: { values: readonly T[]; selected?: T[]; label: (v: T) => string; onToggle: (v: T) => void }) {
  return <div className="row wrap">{values.map((v) => <label key={v} className={`chip sm ${selected?.includes(v) ? 'active' : ''}`}><input type="checkbox" checked={!!selected?.includes(v)} onChange={() => onToggle(v)} />{label(v)}</label>)}</div>;
}

function ModGroupEditor({ group, index, onChange, onRemove }: { group: LootModGroup; index: number; onChange: (g: LootModGroup) => void; onRemove: () => void }) {
  return (
    <div className="loot-mod-group">
      <div className="row wrap">
        <b className="small">{index === 0 ? 'Must have' : 'And must have'}</b>
        <select className="input sm" aria-label="How many of these modifiers" value={group.mode} onChange={(e) => onChange({ ...group, mode: e.target.value as ModMatchMode, count: e.target.value === 'count' ? group.count ?? 2 : undefined })}>
          <option value="any">any of</option><option value="all">all of</option><option value="count">at least…</option>
        </select>
        {group.mode === 'count' && <input type="number" inputMode="numeric" aria-label="At least how many" className="input sm loot-num" min={1} max={Math.max(1, group.ids.length)} value={group.count ?? 1} onChange={(e) => onChange({ ...group, count: toNumber(e.target.value, 1, 30) ?? 1 })} />}
        <select className="input sm" aria-label="Minimum tier for these modifiers" value={group.tier ?? ''} onChange={(e) => onChange({ ...group, tier: toNumber(e.target.value, 1, 9) })}>
          <option value="">any tier</option>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>T{n} or better</option>)}
        </select>
        <span className="grow" />
        <button type="button" className="btn sm ghost bad" onClick={onRemove}>Remove</button>
      </div>
      <div className="row wrap">
        {group.ids.map((id) => <button key={id} type="button" className="chip sm" title="Remove" onClick={() => onChange({ ...group, ids: group.ids.filter((x) => x !== id) })}>{modDisplayName(id)} ×</button>)}
      </div>
      <SearchPicker options={MOD_PICKS} selected={group.ids} placeholder="Search modifiers, e.g. life, fire res…" onPick={(id) => onChange({ ...group, ids: [...group.ids, id].slice(0, 30) })} />
    </div>
  );
}

const FLAG_ORDER: LootItemFlag[] = ['fractured', 'crafted', 'elevated', 'doomImplicit', 'voidSlot'];

function RuleEditor({ s, rule, index, count, update, move, remove }: {
  s: GameState; rule: LootFilterRule; index: number; count: number;
  update: (id: string, patch: Partial<LootFilterRule>) => void;
  move: (id: string, direction: -1 | 1) => void;
  remove: (id: string) => void;
}) {
  const set: Patch = (patch) => update(rule.id, patch);
  const groups = rule.modGroups ?? [];
  const setGroups = (next: LootModGroup[]) => set({ modGroups: next.length ? next : undefined });
  const setFlag = (flag: LootItemFlag, value: string) => {
    const next = { ...(rule.flags ?? {}) };
    if (value === '') delete next[flag];
    else next[flag] = value === 'yes';
    set({ flags: Object.keys(next).length ? next : undefined });
  };
  const showFamilies = !rule.slots?.length || rule.slots.includes('weapon');
  const salvageLocked = rule.action === 'auto_salvage' && !rule.legacyAutoSalvage && (!benchBuilt(s) || stationLevel(s, 'quartermaster') < AUTO_SALVAGE_QUARTERMASTER_LEVEL.normal);
  return (
    <details className="loot-rule" open={index === 0}>
      <summary>
        <span className="loot-rule-order num">{index + 1}</span>
        <input type="checkbox" aria-label="Rule on" checked={rule.enabled} onClick={(e) => e.stopPropagation()} onChange={(e) => set({ enabled: e.target.checked })} />
        <span className="loot-rule-head">
          <b>{rule.name}</b>
          <span className={`loot-rule-summary small ${rule.enabled ? '' : 'dim'}`}>{describeRule(rule)}</span>
        </span>
        {rule.action === 'highlight' && <span className="loot-swatch" style={{ background: rule.highlightColor ?? LOOT_HIGHLIGHT_COLORS[0] }} />}
      </summary>
      <div className="loot-rule-body">
        <div className="row wrap">
          <label className="grow">Name<input className="input sm" value={rule.name} maxLength={80} onChange={(e) => set({ name: e.target.value || `Rule ${index + 1}` })} /></label>
          <label>Action<select className="input sm" value={rule.action} onChange={(e) => set({ action: e.target.value as LootRuleAction })}>{ACTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
          {rule.action === 'highlight' && <label>Colour<input type="color" value={rule.highlightColor ?? LOOT_HIGHLIGHT_COLORS[0]} onChange={(e) => set({ highlightColor: e.target.value })} /></label>}
        </div>
        {rule.action === 'hide' && <p className="dim small loot-note">Hidden drops are left behind: they take no room on the ground or in the time-away pile, and give no Arcane Dust. Uniques are never hidden.</p>}
        {rule.action === 'auto_salvage' && <p className={`small loot-note ${salvageLocked ? 'bad' : 'dim'}`}>Salvages for Arcane Dust once the Crafting Bench is built and the Quartermaster unlocks that rarity (Normal {AUTO_SALVAGE_QUARTERMASTER_LEVEL.normal}, Magic {AUTO_SALVAGE_QUARTERMASTER_LEVEL.magic}, Rare {AUTO_SALVAGE_QUARTERMASTER_LEVEL.rare}). Until then, matching drops are kept. Uniques are never salvaged.</p>}

        <fieldset className="loot-section">
          <legend>Item</legend>
          <div className="loot-condition"><b>Rarity</b><Chips values={RARITY_LIST} selected={rule.rarities} label={title} onToggle={(v) => set({ rarities: toggle(rule.rarities, v) })} /></div>
          <div className="loot-condition"><b>Slot</b><Chips values={ALL_ITEM_SLOTS} selected={rule.slots} label={title} onToggle={(v) => set({ slots: toggle(rule.slots, v) })} /></div>
          <div className="loot-condition">
            <b>Base types <span className="dim small">(any if none picked)</span></b>
            <div className="row wrap">{rule.baseIds?.map((id) => <button key={id} type="button" className="chip sm" title="Remove" onClick={() => set({ baseIds: toggle(rule.baseIds, id) })}>{baseDef(id).name} ×</button>)}</div>
            <SearchPicker options={basePicks(rule.slots)} selected={rule.baseIds ?? []} placeholder="Search bases, e.g. ring, plate, bow…" onPick={(id) => set({ baseIds: [...(rule.baseIds ?? []), id].slice(0, 100) })} />
          </div>
          {showFamilies && <div className="loot-condition"><b>Weapon type</b><Chips values={ALL_WEAPON_FAMILIES} selected={rule.weaponFamilies} label={title} onToggle={(v) => set({ weaponFamilies: toggle(rule.weaponFamilies, v) })} /></div>}
          <div className="loot-condition"><b>Defence type <span className="dim small">(armour and shields)</span></b><Chips values={ALL_ARMOUR_DEFENCES} selected={rule.armourDefences} label={(v) => ARMOUR_DEFENCE_LABELS[v]} onToggle={(v) => set({ armourDefences: toggle(rule.armourDefences, v) })} /></div>
          <label className="chip sm loot-inline"><input type="checkbox" checked={!!rule.matchClass} onChange={(e) => set({ matchClass: e.target.checked || undefined })} />Only gear that fits your class</label>
        </fieldset>

        <fieldset className="loot-section">
          <legend>Levels</legend>
          <div className="loot-condition-grid">
            <Range label="Item level" min={1} max={100} lo={rule.minIlvl} hi={rule.maxIlvl} onChange={(lo, hi) => set({ minIlvl: lo, maxIlvl: hi })} />
            <Range label="Required level" min={1} max={100} lo={rule.minReqLevel} hi={rule.maxReqLevel} onChange={(lo, hi) => set({ minReqLevel: lo, maxReqLevel: hi })} />
            <Range label="Item tier (1–5)" min={1} max={5} lo={rule.minItemTier} hi={rule.maxItemTier} onChange={(lo, hi) => set({ minItemTier: lo as LootFilterRule['minItemTier'], maxItemTier: hi as LootFilterRule['maxItemTier'] })} />
          </div>
        </fieldset>

        <fieldset className="loot-section">
          <legend>Modifiers</legend>
          {groups.map((group, gi) => (
            <ModGroupEditor key={gi} group={group} index={gi}
              onChange={(g) => setGroups(groups.map((x, xi) => (xi === gi ? g : x)))}
              onRemove={() => setGroups(groups.filter((_, xi) => xi !== gi))} />
          ))}
          <div className="row wrap">
            <button type="button" className="btn sm" disabled={groups.length >= MAX_MOD_GROUPS} onClick={() => setGroups([...groups, { ids: [], mode: 'any' }])}>+ Must-have modifiers</button>
            {groups.some((g) => !g.ids.length) && <span className="dim small">Empty groups are ignored.</span>}
          </div>
          <div className="loot-condition-grid">
            <label>Any modifier at<select className="input sm" value={rule.maxModTier ?? ''} onChange={(e) => set({ maxModTier: toNumber(e.target.value, 1, 9) })}><option value="">any tier</option>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>T{n} or better</option>)}</select></label>
            <Range label="Prefixes" min={0} max={7} lo={rule.minPrefixes} hi={rule.maxPrefixes} onChange={(lo, hi) => set({ minPrefixes: lo, maxPrefixes: hi })} />
            <Range label="Suffixes" min={0} max={7} lo={rule.minSuffixes} hi={rule.maxSuffixes} onChange={(lo, hi) => set({ minSuffixes: lo, maxSuffixes: hi })} />
            <Range label="Total modifiers" min={0} max={7} lo={rule.minMods} hi={rule.maxMods} onChange={(lo, hi) => set({ minMods: lo, maxMods: hi })} />
          </div>
          <div className="loot-condition-grid">
            {FLAG_ORDER.map((flag) => {
              const v = rule.flags?.[flag];
              return (
                <label key={flag}>{LOOT_FLAG_LABELS[flag]}
                  <select className="input sm" value={v == null ? '' : v ? 'yes' : 'no'} onChange={(e) => setFlag(flag, e.target.value)}>
                    <option value="">either</option><option value="yes">must have</option><option value="no">must not have</option>
                  </select>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="loot-section">
          <legend>Other</legend>
          <div className="loot-condition-grid">
            <label>Rune socket<select className="input sm" value={rule.minSockets ?? ''} onChange={(e) => set({ minSockets: toNumber(e.target.value, 0, 1), maxSockets: toNumber(e.target.value, 0, 1) })}><option value="">either</option><option value="0">empty</option><option value="1">rune socketed</option></select></label>
            <Range label="Dust value" min={0} max={999} lo={rule.minValue} hi={rule.maxValue} onChange={(lo, hi) => set({ minValue: lo, maxValue: hi })} />
          </div>
        </fieldset>

        <div className="row wrap loot-rule-actions"><button className="btn sm ghost" disabled={index === 0} onClick={() => move(rule.id, -1)}>Move up</button><button className="btn sm ghost" disabled={index === count - 1} onClick={() => move(rule.id, 1)}>Move down</button><span className="grow" /><button className="btn sm ghost bad" onClick={() => remove(rule.id)}>Delete rule</button></div>
      </div>
    </details>
  );
}
