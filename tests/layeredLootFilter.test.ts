import { describe, expect, it } from 'vitest';
import { makeCtx } from '../src/engine/context';
import { createItem } from '../src/engine/items';
import { placeItem } from '../src/engine/loot';
import {
  evaluateLootFilter,
  exportLootFilterCode,
  importLootFilterCode,
  ruleMatchesItem,
  type LootFilterRule,
} from '../src/engine/lootFilter';
import { deserialize, serialize } from '../src/engine/save';
import { seeded } from '../src/engine/rng';
import { newGame, SAVE_VERSION } from '../src/engine/state';
import { charXpForLevel } from '../src/engine/xp';

const ctx = (offline = false) => ({ ...makeCtx(seeded(17)), offline });

describe('layered loot filters', () => {
  it('scales strictness with character level and lets category overrides win', () => {
    const s = newGame(1);
    const item = createItem(s, 'rusted_sword', 5, 'normal', seeded(1));
    s.settings.lootFilter!.preset = 'strict';
    expect(evaluateLootFilter(s, item).visible).toBe(true); // early characters are protected from over-filtering

    s.skills.combat = charXpForLevel(30);
    expect(evaluateLootFilter(s, item).visible).toBe(false);
    s.settings.lootFilter!.overrides.normal_gear = 'hide';
    expect(evaluateLootFilter(s, item).source).toBe('override');
  });

  it('evaluates every authored condition and uses the first matching custom rule', () => {
    const s = newGame(1);
    const item = createItem(s, 'iron_ring', 80, 'rare', seeded(2), undefined, 4);
    item.prefixes = [{ affixId: 'flat_life', tier: 8, values: [70] }];
    item.suffixes = [];
    item.rune = 'rune_ember';
    const rule: LootFilterRule = {
      id: 'valuable-life-ring', name: 'Valuable life rings', enabled: true,
      slots: ['ring'], rarities: ['rare'], minIlvl: 75, maxIlvl: 90,
      modIds: ['flat_life'], maxModTier: 1, minSockets: 1, maxSockets: 1,
      minValue: 10, maxValue: 20, action: 'highlight', highlightColor: '#56ccf2',
    };
    expect(ruleMatchesItem(rule, item, s.character.classId)).toBe(true);
    s.settings.lootFilter!.rules = [rule, { id: 'later', name: 'Later hide', enabled: true, action: 'hide' }];
    expect(evaluateLootFilter(s, item)).toMatchObject({ visible: true, highlightColor: '#56ccf2', source: 'rule' });
  });

  it('applies the same auto-salvage rule to time-away drops', () => {
    const s = newGame(1);
    s.account.hideout.bench = 2;
    s.account.hideout.quartermaster = 4;
    s.settings.lootFilter!.rules = [{ id: 'normal', name: 'Salvage normals', enabled: true, rarities: ['normal'], action: 'auto_salvage' }];
    const item = createItem(s, 'rusted_sword', 12, 'normal', seeded(3));
    placeItem(s, ctx(true), item);
    expect(s.offlineHaul).toHaveLength(0);
    expect(s.account.bank.arcane_dust).toBeGreaterThan(0);
  });

  it('round-trips share codes and rejects malformed or hostile input clearly', () => {
    const s = newGame(1);
    s.settings.lootFilter!.rules = [{ id: 'one', name: 'T1 finds', enabled: true, maxModTier: 1, action: 'sound' }];
    const imported = importLootFilterCode(exportLootFilterCode(s.settings.lootFilter!));
    expect(imported).toEqual({ ok: true, rules: s.settings.lootFilter!.rules });
    expect(importLootFilterCode('not a code')).toMatchObject({ ok: false, error: expect.stringContaining('not a Path of Idle') });

    const hostile = btoa(JSON.stringify({ v: 1, rules: [{ id: 'x', name: 'x', enabled: true, action: '__proto__' }] }));
    expect(importLootFilterCode(`POI-LF1:${hostile}`)).toMatchObject({ ok: false, error: expect.stringContaining('unknown action') });
    expect(importLootFilterCode(`POI-LF1:${'A'.repeat(50_001)}`)).toMatchObject({ ok: false, error: expect.stringContaining('too large') });
  });
});

describe('loot-filter save migration', () => {
  it('carries the active legacy profile into ordered layered rules', () => {
    const s = newGame(1);
    s.settings.activeLootFilterId = 'old-filter';
    s.settings.customLootFilters = [{
      id: 'old-filter', name: 'Old filter', mode: 'keep',
      rules: [{ id: 'old-rule', name: 'Keep rare rings', slots: ['ring'], rarities: ['rare'], minTier: 3, minIlvl: 70, matchClass: true }],
    }];
    const raw = JSON.parse(serialize(s));
    raw.version = 43;
    delete raw.settings.lootFilter;

    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.settings.lootFilter?.rules).toEqual([
      expect.objectContaining({ name: 'Keep rare rings', action: 'show', slots: ['ring'], rarities: ['rare'], minItemTier: 3, minIlvl: 70, matchClass: true }),
      expect.objectContaining({ name: 'Legacy filter fallback', action: 'auto_salvage' }),
    ]);
  });
});
