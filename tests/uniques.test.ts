import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { UNIQUES, uniqueDef } from '../src/data/bases';
import { renderUniqueList, UNIQUE_LIST_PATH } from '../src/data/uniqueList';
import { zoneDef } from '../src/data/zones';
import { MAP_UNIQUE_POOLS } from '../src/data/maps';
import { createUnique } from '../src/engine/items';
import { applyOrb, ORBS } from '../src/engine/crafting';
import { makeCtx } from '../src/engine/context';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';

describe('the unique items list', () => {
  it('names every unique once', () => {
    const list = renderUniqueList();
    for (const u of UNIQUES) expect(list.split(`**${u.name}**`).length - 1, u.name).toBe(1);
  });

  it('is up to date (run `npm run uniques` if not)', () => {
    const onDisk = readFileSync(UNIQUE_LIST_PATH, 'utf8').replace(/\r\n/g, '\n');
    expect(onDisk).toBe(renderUniqueList());
  });
});

describe('unique item drop progression and campaign balance', () => {
  it('Act 1 Zone 1 (mudflats) drops exactly 1 unique', () => {
    const mudflats = zoneDef('mudflats');
    expect(mudflats.uniques).toHaveLength(1);
    expect(mudflats.uniques).toEqual(['castaways_kerchief']);
  });

  it('early Act 1 zones do not drop class-specific trait uniques', () => {
    const classTraitUniques = [
      'bloodthirst', 'titans_girth', 'ragefire_treads', // rage
      'last_breath', 'cowl_of_whispers', 'shadowdance', // malice
      'fervent_dawn', 'penitent_path', // fervor
      'rebuttal', 'iron_aegis', 'bastion_core', // riposte
      'stride_of_clarity', 'windstrider', 'tempest_gale', // momentum
      'archmages_fountain', 'mind_over_iron', // mana is power
    ];

    const earlyAct1Zones = ['mudflats', 'brinecaves', 'ashwood', 'blackreed'];
    for (const zid of earlyAct1Zones) {
      const z = zoneDef(zid);
      for (const traitUnique of classTraitUniques) {
        expect(z.uniques, `${zid} should not drop ${traitUnique}`).not.toContain(traitUnique);
      }
    }
  });

  it('map unique tiers contain the majority of unique drop pools', () => {
    const allMapUniques = new Set(MAP_UNIQUE_POOLS.flatMap((p) => p.uniques));
    expect(allMapUniques.size).toBeGreaterThan(30);
  });
});

describe('unique roll ranges and Divine Orbs', () => {
  it('rolls stats within defined ranges when creating a unique', () => {
    const s = newGame(1);
    const rng = seeded(42);
    const item = createUnique(s, 'last_breath', 50, rng);
    expect(item.rarity).toBe('unique');

    const maliceMod = item.prefixes.find((m) => m.affixId === 'u_malice_on_hit');
    expect(maliceMod).toBeDefined();
    expect(maliceMod!.values[0]).toBeGreaterThanOrEqual(1);
    expect(maliceMod!.values[0]).toBeLessThanOrEqual(4);

    const uDef = uniqueDef('last_breath');
    const uMod = uDef.mods.find((m) => m.affixId === 'u_malice_on_hit');
    expect(uMod?.ranges).toEqual([[1, 4]]);
  });

  it('allows Divine Orb on uniques with rollable ranges and rerolls values', () => {
    const s = newGame(1);
    s.account.bank = { divine: 10 };
    const item = createUnique(s, 'last_breath', 50, seeded(10));
    s.inventory.push(item);

    const ctx = makeCtx(seeded(99));
    const err = applyOrb(s, ctx, 'divine', item.uid);
    expect(err).toBeNull();
    expect(s.account.bank.divine).toBe(9);

    const maliceMod = item.prefixes.find((m) => m.affixId === 'u_malice_on_hit');
    expect(maliceMod!.values[0]).toBeGreaterThanOrEqual(1);
    expect(maliceMod!.values[0]).toBeLessThanOrEqual(4);
  });

  it('refuses Divine Orb on uniques where all modifiers are fixed', () => {
    const s = newGame(1);
    s.account.bank = { divine: 10 };
    const item = createUnique(s, 'miners_lament', 20, seeded(1));
    s.inventory.push(item);

    const reason = ORBS.divine.canApply(item);
    expect(reason).toBe('All modifiers on this unique are fixed');

    const ctx = makeCtx(seeded(1));
    const err = applyOrb(s, ctx, 'divine', item.uid);
    expect(err).toBe('All modifiers on this unique are fixed');
    expect(s.account.bank.divine).toBe(10);
  });
});

