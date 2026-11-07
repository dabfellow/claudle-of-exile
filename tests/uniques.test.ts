import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { UNIQUES, uniqueDef } from '../src/data/bases';
import { UNIQUE_FLASKS } from '../src/data/flasks';
import { MAP_UNIQUE_POOLS, UNIQUE_MAPS, uniqueMapDef } from '../src/data/maps';
import { renderUniqueList, UNIQUE_LIST_PATH } from '../src/data/uniqueList';
import { zoneDef } from '../src/data/zones';
import { unwrittenNodeOf } from '../src/engine/ascendancy';
import { enterZone, useFlask } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { applyOrb, ORBS } from '../src/engine/crafting';
import { rollUniqueFlask } from '../src/engine/flasks';
import { createUnique } from '../src/engine/items';
import { addUniqueMaps, startUniqueMap, uniqueMapsHeld } from '../src/engine/maps';
import { seeded } from '../src/engine/rng';
import { skillTreeStats } from '../src/engine/skillTree';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';

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

describe('overhauled and expanded uniques, flasks, and maps', () => {
  it('scales Khan\'s Tithe critical strike multiplier with bank gold up to +50%', () => {
    const s = newGame(1);
    const baseCritMulti = deriveStats(s).critMulti;
    const ring = createUnique(s, 'khans_tithe', 40, seeded(1));
    s.equipment.ring1 = ring;
    s.account.bank.gold = 250_000;
    const d25 = deriveStats(s);
    expect(d25.raw.goldFind).toBe(-50);
    expect(d25.critMulti).toBe(baseCritMulti + 25);

    s.account.bank.gold = 900_000;
    const dCap = deriveStats(s);
    expect(dCap.critMulti).toBe(baseCritMulti + 50);
  });

  it('applies Starforged Edge deal-no-elemental-damage and physical shock flags', () => {
    const s = newGame(1);
    const sword = createUnique(s, 'starforged_edge', 50, seeded(2));
    s.equipment.weapon = sword;
    const d = deriveStats(s);
    expect(d.raw.physCanShock).toBe(1);
    expect(d.raw.noElemDamage).toBe(1);
    expect(d.elemMult).toBe(0);
    expect(d.typeMult.fire).toBe(0);
    expect(d.typeMult.cold).toBe(0);
    expect(d.typeMult.light).toBe(0);
  });

  it('applies Unblinking Tome cannot-evade and Gaze of the Unblinking', () => {
    const s = newGame(1);
    const shield = createUnique(s, 'unblinking_tome', 50, seeded(3));
    s.equipment.offhand = shield;
    const d = deriveStats(s);
    expect(d.raw.cannotEvade).toBe(1);
    expect(d.evasion).toBe(0);
    expect(d.raw.unblinkingFlare).toBeGreaterThanOrEqual(50);
  });

  it('rolls an off-class Ascendancy Notable on The Unwritten and rerolls it with a Divine Orb', () => {
    const s = newGame(1, { name: 'W', classId: 'warrior' });
    s.account.bank = { divine: 5 };
    const body = createUnique(s, 'the_unwritten', 80, seeded(7));
    s.equipment.body = body;
    const node1 = unwrittenNodeOf(s);
    expect(node1).not.toBeNull();
    // Warrior ascendancies are ravager and anvil; off-class notable should not start with ravager_ or anvil_
    expect(node1!.id.startsWith('ravager_')).toBe(false);
    expect(node1!.id.startsWith('anvil_')).toBe(false);

    const err = applyOrb(s, makeCtx(seeded(99)), 'divine', body.uid);
    expect(err).toBeNull();
    const node2 = unwrittenNodeOf(s);
    expect(node2).not.toBeNull();
  });

  it('provides 12 Ascendancy BIS uniques, 22 Life Skill uniques, 6 Artisan Set pieces, 6 Leveling pieces, and 3 Gold-Find uniques', () => {
    const ascIds = [
      'asc_ravager_plate', 'asc_anvil_shield', 'asc_longshot_bow', 'asc_falconer_gloves',
      'asc_wellspring_focus', 'asc_alchemist_belt', 'asc_matador_body', 'asc_vanguard_shield',
      'asc_flagellant_belt', 'asc_lightkeeper_helm', 'asc_headsman_helm', 'asc_plaguewright_dagger',
    ];
    for (const id of ascIds) expect(uniqueDef(id).id).toBe(id);

    const artisanIds = ['artisan_tool', 'artisan_helm', 'artisan_body', 'artisan_gloves', 'artisan_boots', 'artisan_ring'];
    for (const id of artisanIds) expect(uniqueDef(id).id).toBe(id);

    const levelingIds = ['leveling_weapon', 'leveling_helm', 'leveling_body', 'leveling_gloves', 'leveling_boots', 'leveling_ring'];
    for (const id of levelingIds) expect(uniqueDef(id).id).toBe(id);

    const goldFindUniques = UNIQUES.filter((u) =>
      u.mods.some((m) => m.affixId === 'u_gold_find' && ((m.values?.[0] ?? 0) > 0 || (m.ranges?.[0]?.[0] ?? 0) > 0)),
    );
    expect(goldFindUniques.map((u) => u.id).sort()).toEqual(['greeds_vault', 'gulls_eye', 'merchants_signet']);
  });

  it('aggregates life-skill unique bonuses into skillTreeStats', () => {
    const s = newGame(1);
    s.equipment.helmet = createUnique(s, 'miners_lament', 20, seeded(1));
    s.equipment.offhand = createUnique(s, 'delvers_lantern', 30, seeded(2));
    s.equipment.body = createUnique(s, 'artisan_body', 30, seeded(3));
    const st = skillTreeStats(s);
    expect(st.miningSpeed).toBeGreaterThanOrEqual(20);
    expect(st.gemChance).toBeGreaterThanOrEqual(40);
    expect(st.motherlode).toBeGreaterThan(0);
    expect(st.inputSave).toBeGreaterThan(0);
  });

  it('creates and uses the 5 Unique Flasks', () => {
    expect(UNIQUE_FLASKS.map((f) => f.id)).toEqual([
      'u_flask_karui',
      'u_flask_lavianga',
      'u_flask_lions_roar',
      'u_flask_bottled_faith',
      'u_flask_dying_sun',
    ]);
    const s = newGame(1);
    const ctx = makeCtx(seeded(5));
    enterZone(s, ctx, 'mudflats');
    const lavianga = rollUniqueFlask(s, 60, seeded(5), 'u_flask_lavianga');
    s.flaskSlots[1] = lavianga;
    expect(useFlask(s, ctx, 1)).toBeNull();
    expect(deriveStats(s).raw.laviangaZeroMana).toBeGreaterThan(0);
  });

  it('defines 5 Unique Maps and opens them through the Map Device', () => {
    expect(UNIQUE_MAPS).toHaveLength(5);
    const s = newGame(1);
    const ctx = makeCtx(seeded(10));
    addUniqueMaps(s, 'umap_vaults', 2);
    expect(uniqueMapsHeld(s, 'umap_vaults')).toBe(2);
    expect(startUniqueMap(s, ctx, 'umap_vaults')).toBeNull();
    expect(s.maps.run?.uniqueMapId).toBe('umap_vaults');
    expect(uniqueMapsHeld(s, 'umap_vaults')).toBe(1);
    expect(uniqueMapDef('umap_vaults')?.name).toBe('The Vaults of Atziri');
  });
});


