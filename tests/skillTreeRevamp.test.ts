import { describe, expect, it } from 'vitest';
import { SKILL_TREE_BY_ID, SKILL_TREE_NODES, SKILL_TREE_START, SKILLING_RING } from '../src/data/skillTree';
import { collectibleChanceMult } from '../src/engine/collectibles';
import { makeCtx } from '../src/engine/context';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { allocateSkillNode, MAX_SKILL_TREE_POINTS, refundSkillNode, skillNodeReason, skillTreePoints, skillTreeStats } from '../src/engine/skillTree';
import { newGame } from '../src/engine/state';
import { xpToReach } from '../src/engine/xp';

describe('Skilling tree revamp (12-skill ring of partners)', () => {
  it('builds 187 nodes (Craftsman + 6 core + 12x14 branch + 12 bridges) in ring order', () => {
    expect(SKILLING_RING).toHaveLength(12);
    expect(SKILL_TREE_NODES).toHaveLength(187);
    expect(SKILL_TREE_NODES.filter((n) => n.branch === 'core')).toHaveLength(7);
    expect(SKILL_TREE_NODES.filter((n) => n.branch === 'bridge')).toHaveLength(12);
    expect(SKILL_TREE_BY_ID[SKILL_TREE_START].name).toBe('Craftsman');
  });

  it('calculates points across the 12 skills including Astrology and excluding removed skills up to 118', () => {
    const s = newGame(1);
    s.skills.astrology = xpToReach('astrology', 50);
    s.skills.agility = xpToReach('agility', 99);
    s.skills.cooking = xpToReach('cooking', 99);
    s.skills.runecarving = xpToReach('runecarving', 99);
    // 11 skills at Lv 1 + Astrology at Lv 50 = 61 total -> 6 points
    expect(skillTreePoints(s)).toBe(6);

    for (const k of SKILLING_RING) s.skills[k] = xpToReach(k, 99);
    expect(skillTreePoints(s)).toBe(MAX_SKILL_TREE_POINTS);
    expect(MAX_SKILL_TREE_POINTS).toBe(118);
  });

  it('enforces level 30/50 requirements, bridge dual-neighbour requirement, and connected refunds', () => {
    const s = newGame(2);
    for (const k of SKILLING_RING) s.skills[k] = xpToReach(k, 25);
    const ctx = makeCtx(seeded(1));
    s.storage.bank.regret = 10;

    // Core + trunk smalls require no level
    expect(allocateSkillNode(s, ctx, 'core_curious')).toBeNull();
    expect(collectibleChanceMult(s)).toBe(2);
    expect(allocateSkillNode(s, ctx, 'core_overtime')).toBeNull();
    expect(allocateSkillNode(s, ctx, 'mining_t0')).toBeNull();
    expect(allocateSkillNode(s, ctx, 'mining_t1')).toBeNull();

    // Fork small needs Lv 30
    expect(skillNodeReason(s, 'mining_f1_s0')).toMatch(/level 30/);
    s.skills.mining = xpToReach('mining', 30);
    expect(allocateSkillNode(s, ctx, 'mining_f1_s0')).toBeNull();
    expect(allocateSkillNode(s, ctx, 'mining_f1_s1')).toBeNull();
    expect(allocateSkillNode(s, ctx, 'mining_f1_s2')).toBeNull();
    expect(allocateSkillNode(s, ctx, 'mining_f1_n0')).toBeNull();

    // Keystone needs Lv 50
    expect(allocateSkillNode(s, ctx, 'mining_f1_n1')).toBeNull();
    expect(skillNodeReason(s, 'mining_f1_ks')).toMatch(/level 50/);

    // Bridge Mining-Smelting needs a fork node in Smelting too
    expect(skillNodeReason(s, 'bridge_ore_to_ingot')).toMatch(/Mining and Smelting/);
    s.skills.smelting = xpToReach('smelting', 30);
    expect(allocateSkillNode(s, ctx, 'smelting_t0')).toBeNull();
    expect(allocateSkillNode(s, ctx, 'smelting_t1')).toBeNull();
    expect(allocateSkillNode(s, ctx, 'smelting_f0_s0')).toBeNull();
    expect(allocateSkillNode(s, ctx, 'bridge_ore_to_ingot')).toBeNull();
    expect(skillTreeStats(s)['bridge.ore_to_ingot']).toBe(1);

    // Refunding mining_f1_n0 would disconnect mining_f1_n1
    expect(refundSkillNode(s, ctx, 'mining_f1_n0')).toMatch(/disconnect/);
    expect(refundSkillNode(s, ctx, 'bridge_ore_to_ingot')).toBeNull();
  });

  it('migrates v64 saves by clearing old skilling allocations and profiles with a notice', () => {
    const s = newGame(3);
    const raw = JSON.parse(serialize(s));
    raw.version = 64;
    raw.skillPassives = ['core_0', 'mining_s0'];
    raw.skillingProfiles = [{ id: 'p1', name: 'Profile 1', passives: ['core_0'], masteries: {} }];

    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.skillPassives).toEqual([]);
    expect(loaded.skillingProfiles[0].passives).toEqual([]);
  });
});
