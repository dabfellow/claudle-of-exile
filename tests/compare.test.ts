import { describe, expect, it } from 'vitest';
import { BASES } from '../src/data/bases';
import { compareItem } from '../src/engine/compare';
import { createSkillGem, skillSummary } from '../src/engine/gems';
import { deriveStats } from '../src/engine/stats';
import { newGame } from '../src/engine/state';
import type { GameState, Item } from '../src/engine/types';

const item = (baseId: string, uid: number): Item => ({ uid, baseId, rarity: 'normal', ilvl: 1, prefixes: [], suffixes: [] }) as unknown as Item;
const baseWhere = (test: (b: (typeof BASES)[number]) => boolean) => BASES.find(test)!.id;

const mage = (): GameState => newGame(1, { name: 't', classId: 'mage' });

describe('comparing gear', () => {
  it('shows the two weapons side by side, against what is in the main hand', () => {
    const s = newGame(1, { name: 't', classId: 'warrior' });
    const big = baseWhere((b) => b.slot === 'weapon' && !b.twoHanded && !!b.phys && b.phys[1] > 40);
    const c = compareItem(s, item(big, 9001))!;
    expect(c.worn).toBe(s.equipment.weapon);
    const phys = c.base.find((r) => r.label === 'Physical Damage')!;
    expect(phys.after).toBeGreaterThan(phys.before);
    expect(c.base.map((r) => r.label)).toEqual(expect.arrayContaining(['Attacks per Second', 'Base Crit', 'Weapon DPS']));
  });

  it('a piece of armour shows its defences and what they do', () => {
    const s = newGame(1, { name: 't', classId: 'ranger' });
    delete s.equipment.helmet;
    const c = compareItem(s, item(baseWhere((b) => b.slot === 'helmet' && (b.evasion ?? 0) > 100 && !b.armour && !b.energyShield), 9001))!;
    expect(c.worn).toBeNull();
    expect(c.base[0]).toMatchObject({ label: 'Evasion', before: 0 });
    const evade = c.character.find((r) => r.label === 'Chance to Evade')!;
    expect(evade.after).toBeGreaterThan(evade.before);
  });

  it('says when a weapon would stop a skill working', () => {
    const s = newGame(1, { name: 't', classId: 'ranger' });
    s.skillBar[0] = createSkillGem(s, 'ice_shot');
    const c = compareItem(s, item(baseWhere((b) => b.family === 'mace'), 9001))!;
    expect(c.skills.find((k) => k.name === 'Ice Shot')!.blocked).toMatch(/Needs a Bow/);
  });

  it('a two-hander takes the off hand off too', () => {
    const s = newGame(1, { name: 't', classId: 'warrior' });
    const shield = item(baseWhere((b) => b.slot === 'offhand'), 9001);
    s.equipment.offhand = shield;
    expect(compareItem(s, item(baseWhere((b) => b.slot === 'weapon' && !!b.twoHanded), 9002))!.alsoRemoves).toBe(shield);
  });

  it('nothing to compare for what is already worn', () => {
    const s = newGame(1, { name: 't', classId: 'warrior' });
    expect(compareItem(s, s.equipment.weapon!)).toBeNull();
  });
});

describe('skill damage estimate', () => {
  it('counts ailment modifiers', () => {
    const s = newGame(1, { name: 't', classId: 'ranger' });
    const gem = createSkillGem(s, 'poison_dart');
    const d = deriveStats(s, []);
    const before = skillSummary(d, gem);
    const stronger = { ...d, raw: { ...d.raw, poisonPct: 100 } };
    expect(skillSummary(stronger, gem).perSecond).toBeGreaterThan(before.perSecond);
  });

  it('physical damage on a weapon does nothing for a spell', () => {
    const s = mage();
    const gem = createSkillGem(s, 'spark');
    const d = deriveStats(s, []);
    const heavy = { ...d, hit: { ...d.hit, phys: [500, 900] as [number, number] } };
    expect(skillSummary(heavy, gem).perSecond).toBeCloseTo(skillSummary(d, gem).perSecond);
  });

  it('counts spell-only gear', () => {
    const s = mage();
    const gem = createSkillGem(s, 'fireball');
    const d = deriveStats(s, []);
    expect(skillSummary({ ...d, raw: { ...d.raw, spellPct: 50 } }, gem).perUse).toBeGreaterThan(skillSummary(d, gem).perUse);
  });

  it('a bleed that is reapplied does not stack, a poison does', () => {
    const s = newGame(1, { name: 't', classId: 'ranger' });
    const d = deriveStats(s, []);
    const fast = { ...d, attackSpeed: d.attackSpeed * 4 };
    const gain = (id: string) => skillSummary(fast, createSkillGem(s, id)).perSecond / skillSummary(d, createSkillGem(s, id)).perSecond;
    expect(gain('poison_dart')).toBeGreaterThan(gain('gash'));
  });
});
