import { useState } from 'react';
import {
  ALL_ARMOUR_DEFENCES,
  ALL_ITEM_SLOTS,
  ALL_WEAPON_FAMILIES,
  ARMOUR_DEFENCE_LABELS,
  CustomLootFilter,
  defaultLootFilters,
  deleteLootFilter,
  LootFilterRule,
  saveLootFilter,
  setActiveLootFilter,
} from '../../engine/lootFilter';
import { game } from '../../game';
import type { GameState, Rarity } from '../../engine/types';

export function LootFilterManager({ s }: { s: GameState }) {
  const filters = s.settings.customLootFilters ?? defaultLootFilters();
  const activeId = s.settings.activeLootFilterId ?? null;

  const [editingFilter, setEditingFilter] = useState<CustomLootFilter | null>(null);

  const startNewFilter = () => {
    const id = `custom_${Date.now()}`;
    const newF: CustomLootFilter = {
      id,
      name: 'Custom Filter',
      mode: 'keep',
      rules: [
        {
          id: `r_${Date.now()}`,
          name: 'Rule 1',
          matchClass: true,
        },
      ],
    };
    setEditingFilter(newF);
  };

  const handleSave = (f: CustomLootFilter) => {
    game.act((st) => {
      saveLootFilter(st, f);
    });
    setEditingFilter(null);
  };

  const handleDelete = (id: string) => {
    game.act((st) => {
      deleteLootFilter(st, id);
    });
    if (editingFilter?.id === id) setEditingFilter(null);
  };

  const handleSelectActive = (id: string | null) => {
    game.act((st) => {
      setActiveLootFilter(st, id);
    });
  };

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
      <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <span style={{ fontWeight: 600 }}>Custom Loot Filters</span>
          <div className="dim small">Select an active filter profile to automatically salvage junk or off-spec drops into Arcane Dust.</div>
        </div>
        {!editingFilter && (
          <button className="btn sm" onClick={startNewFilter}>
            + Create Filter
          </button>
        )}
      </div>

      {!editingFilter ? (
        <div className="col" style={{ gap: 8, marginTop: 10 }}>
          <div
            className={`card row wrap ${activeId === null ? 'highlight' : ''}`}
            style={{
              padding: '8px 12px',
              alignItems: 'center',
              cursor: 'pointer',
              border: activeId === null ? '1px solid var(--accent)' : '1px solid var(--border)',
            }}
            onClick={() => handleSelectActive(null)}
          >
            <input
              type="radio"
              name="activeLootFilter"
              checked={activeId === null}
              onChange={() => handleSelectActive(null)}
              style={{ marginRight: 8 }}
            />
            <div style={{ flex: 1 }}>
              <b>Standard / None</b>
              <div className="dim small">No custom filter active. Drops are handled by standard War Table and Off-Class settings.</div>
            </div>
            {activeId === null && <span className="chip sm" style={{ color: 'var(--accent)' }}>Active</span>}
          </div>

          {filters.map((f) => {
            const isActive = activeId === f.id;
            return (
              <div
                key={f.id}
                className={`card row wrap ${isActive ? 'highlight' : ''}`}
                style={{
                  padding: '8px 12px',
                  alignItems: 'center',
                  border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                }}
              >
                <div
                  className="row"
                  style={{ flex: 1, alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => handleSelectActive(f.id)}
                >
                  <input
                    type="radio"
                    name="activeLootFilter"
                    checked={isActive}
                    onChange={() => handleSelectActive(f.id)}
                    style={{ marginRight: 8 }}
                  />
                  <div>
                    <b>{f.name}</b>{' '}
                    <span className="dim small">
                      ({f.mode === 'keep' ? 'Keep Matching' : 'Salvage Matching'}, {f.rules.length} rule{f.rules.length === 1 ? '' : 's'})
                    </span>
                    <div className="dim small">
                      {f.rules.map((r, i) => (
                        <span key={r.id}>
                          {i > 0 ? ' · ' : ''}
                          {r.name || `Rule ${i + 1}`}
                          {r.matchClass ? ' [Class-matched]' : ''}
                          {r.minTier ? ` [T${r.minTier}+]` : ''}
                          {r.minIlvl ? ` [ilvl ${r.minIlvl}+]` : ''}
                          {r.rarities && r.rarities.length ? ` [${r.rarities.join('/')}]` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="row" style={{ gap: 6 }}>
                  {isActive && <span className="chip sm" style={{ color: 'var(--accent)' }}>Active</span>}
                  <button className="btn sm ghost" onClick={() => setEditingFilter(JSON.parse(JSON.stringify(f)))}>
                    Edit
                  </button>
                  <button
                    className="btn sm ghost"
                    style={{ color: 'var(--bad)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(f.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <FilterEditor
          filter={editingFilter}
          onSave={handleSave}
          onCancel={() => setEditingFilter(null)}
        />
      )}
    </div>
  );
}

function FilterEditor({
  filter,
  onSave,
  onCancel,
}: {
  filter: CustomLootFilter;
  onSave: (f: CustomLootFilter) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<CustomLootFilter>(filter);

  const updateRule = (idx: number, patch: Partial<LootFilterRule>) => {
    const updated = [...f.rules];
    updated[idx] = { ...updated[idx], ...patch };
    setF({ ...f, rules: updated });
  };

  const addRule = () => {
    const newRule: LootFilterRule = {
      id: `r_${Date.now()}_${f.rules.length}`,
      name: `Rule ${f.rules.length + 1}`,
      matchClass: true,
    };
    setF({ ...f, rules: [...f.rules, newRule] });
  };

  const removeRule = (idx: number) => {
    setF({ ...f, rules: f.rules.filter((_, i) => i !== idx) });
  };

  return (
    <div className="card" style={{ background: 'var(--card-subtle, rgba(255,255,255,0.02))', marginTop: 10, padding: 14 }}>
      <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ margin: 0 }}>Edit Filter: {f.name}</h4>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn sm ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn sm" onClick={() => onSave(f)}>
            Save Filter
          </button>
        </div>
      </div>

      <div className="row wrap" style={{ gap: 16, marginBottom: 16 }}>
        <label className="col" style={{ gap: 4, flex: 1, minWidth: 200 }}>
          <span className="small muted">Filter Name</span>
          <input
            type="text"
            className="input sm"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            placeholder="e.g. Speed Farm Rares"
          />
        </label>
        <label className="col" style={{ gap: 4, width: 220 }}>
          <span className="small muted">Filter Behavior</span>
          <select
            className="select sm"
            value={f.mode}
            onChange={(e) => setF({ ...f, mode: e.target.value as 'keep' | 'salvage' })}
          >
            <option value="keep">Keep matching, salvage others</option>
            <option value="salvage">Salvage matching, keep others</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontWeight: 600 }}>Rules ({f.rules.length})</span>
          <button className="btn sm ghost" onClick={addRule}>
            + Add Rule
          </button>
        </div>
        <div className="dim small" style={{ marginBottom: 10 }}>
          Items are evaluated against each rule. Uniques are always kept regardless of filter rules.
        </div>

        <div className="col" style={{ gap: 12 }}>
          {f.rules.map((r, idx) => (
            <div
              key={r.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.15)',
              }}
            >
              <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <input
                  type="text"
                  className="input sm"
                  style={{ fontWeight: 600, width: 180 }}
                  value={r.name || `Rule ${idx + 1}`}
                  onChange={(e) => updateRule(idx, { name: e.target.value })}
                />
                <button
                  className="btn sm ghost"
                  style={{ color: 'var(--bad)' }}
                  disabled={f.rules.length <= 1}
                  onClick={() => removeRule(idx)}
                >
                  Remove Rule
                </button>
              </div>

              {/* Match class & Minimums */}
              <div className="row wrap" style={{ gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <label className="chip sm" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!r.matchClass}
                    onChange={(e) => updateRule(idx, { matchClass: e.target.checked })}
                  />
                  <span>Must Match Character Class</span>
                </label>

                <label className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <span className="small muted">Min Tier:</span>
                  <select
                    className="select sm"
                    value={r.minTier ?? 1}
                    onChange={(e) => updateRule(idx, { minTier: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
                  >
                    {[1, 2, 3, 4, 5].map((t) => (
                      <option key={t} value={t}>
                        Tier {t}+
                      </option>
                    ))}
                  </select>
                </label>

                <label className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <span className="small muted">Min Item Level:</span>
                  <input
                    type="number"
                    className="input sm"
                    style={{ width: 70 }}
                    min={1}
                    max={100}
                    value={r.minIlvl ?? 1}
                    onChange={(e) => updateRule(idx, { minIlvl: Math.max(1, Number(e.target.value)) })}
                  />
                </label>
              </div>

              {/* Rarities */}
              <div style={{ marginBottom: 8 }}>
                <span className="small muted" style={{ display: 'block', marginBottom: 4 }}>
                  Item Rarities (all allowed if none selected):
                </span>
                <div className="row wrap" style={{ gap: 6 }}>
                  {(['normal', 'magic', 'rare'] as Rarity[]).map((rarity) => {
                    const sel = (r.rarities ?? []).includes(rarity);
                    return (
                      <label key={rarity} className="chip sm" style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={(e) => {
                            const cur = r.rarities ?? [];
                            const next = e.target.checked ? [...cur, rarity] : cur.filter((x) => x !== rarity);
                            updateRule(idx, { rarities: next.length ? next : undefined });
                          }}
                        />
                        <span style={{ color: `var(--${rarity})` }}>{rarity[0].toUpperCase() + rarity.slice(1)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Slots */}
              <div style={{ marginBottom: 8 }}>
                <span className="small muted" style={{ display: 'block', marginBottom: 4 }}>
                  Item Slots (all allowed if none selected):
                </span>
                <div className="row wrap" style={{ gap: 6 }}>
                  {ALL_ITEM_SLOTS.map((slot) => {
                    const sel = (r.slots ?? []).includes(slot);
                    return (
                      <label key={slot} className="chip sm" style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={(e) => {
                            const cur = r.slots ?? [];
                            const next = e.target.checked ? [...cur, slot] : cur.filter((x) => x !== slot);
                            updateRule(idx, { slots: next.length ? next : undefined });
                          }}
                        />
                        <span>{slot}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Weapon Families */}
              <div style={{ marginBottom: 8 }}>
                <span className="small muted" style={{ display: 'block', marginBottom: 4 }}>
                  Weapon Families (if item is a weapon; all allowed if none selected):
                </span>
                <div className="row wrap" style={{ gap: 6 }}>
                  {ALL_WEAPON_FAMILIES.map((fam) => {
                    const sel = (r.weaponFamilies ?? []).includes(fam);
                    return (
                      <label key={fam} className="chip sm" style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={(e) => {
                            const cur = r.weaponFamilies ?? [];
                            const next = e.target.checked ? [...cur, fam] : cur.filter((x) => x !== fam);
                            updateRule(idx, { weaponFamilies: next.length ? next : undefined });
                          }}
                        />
                        <span>{fam}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Armour Defences */}
              <div>
                <span className="small muted" style={{ display: 'block', marginBottom: 4 }}>
                  Armour Defences (if item is armour/shield; all allowed if none selected):
                </span>
                <div className="row wrap" style={{ gap: 6 }}>
                  {ALL_ARMOUR_DEFENCES.map((defType) => {
                    const sel = (r.armourDefences ?? []).includes(defType);
                    return (
                      <label key={defType} className="chip sm" style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={(e) => {
                            const cur = r.armourDefences ?? [];
                            const next = e.target.checked ? [...cur, defType] : cur.filter((x) => x !== defType);
                            updateRule(idx, { armourDefences: next.length ? next : undefined });
                          }}
                        />
                        <span>{ARMOUR_DEFENCE_LABELS[defType]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
