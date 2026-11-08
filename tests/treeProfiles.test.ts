import { describe, expect, it } from 'vitest';
import { makeCtx } from '../src/engine/context';
import { saveGearSet } from '../src/engine/loadouts';
import { ensureAtlas } from '../src/engine/maps';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import {
  isProfileUnlocked,
  saveAtlasProfile,
  saveLifeSkillsProfile,
  savePassiveProfile,
  saveSkillingProfile,
  switchAtlasProfile,
  switchLifeSkillsProfile,
  switchPassiveProfile,
  switchSkillingProfile,
} from '../src/engine/treeProfiles';
import type { CombatRuntime, GameState } from '../src/engine/types';

function makeState(): GameState {
  const s = newGame(1);
  s.campaign = { act: 1 };
  s.maps.highestTier = 0;
  return s;
}

describe('3-Profile Tree Loadout system', () => {
  it('initializes GameState with default profiles and active IDs', () => {
    const s = makeState();
    expect(s.passiveProfiles).toBeDefined();
    expect(s.passiveProfiles.length).toBe(1);
    expect(s.passiveProfiles[0].id).toBe('profile_1');
    expect(s.activePassiveProfile).toBe('profile_1');

    expect(s.atlasProfiles).toBeDefined();
    expect(s.atlasProfiles.length).toBe(1);
    expect(s.atlasProfiles[0].id).toBe('profile_1');
    expect(s.activeAtlasProfile).toBe('profile_1');

    expect(s.skillingProfiles).toBeDefined();
    expect(s.skillingProfiles.length).toBe(1);
    expect(s.skillingProfiles[0].id).toBe('profile_1');
    expect(s.activeSkillingProfile).toBe('profile_1');
  });

  describe('progression unlocks', () => {
    it('Profile 1 is always unlocked', () => {
      const s = makeState();
      expect(isProfileUnlocked(s, 'profile_1')).toBe(true);
      expect(isProfileUnlocked(s, 1)).toBe(true);
    });

    it('Profile 2 unlocks upon reaching Act 5', () => {
      const s = makeState();
      s.campaign = { act: 1 };
      expect(isProfileUnlocked(s, 'profile_2')).toBe(false);

      s.campaign = { act: 4 };
      expect(isProfileUnlocked(s, 'profile_2')).toBe(false);

      s.campaign = { act: 5 };
      expect(isProfileUnlocked(s, 'profile_2')).toBe(true);

      s.campaign = { act: 6 };
      expect(isProfileUnlocked(s, 'profile_2')).toBe(true);
    });

    it('Profile 3 unlocks upon clearing a Tier 5 Normal Map', () => {
      const s = makeState();
      expect(isProfileUnlocked(s, 'profile_3')).toBe(false);

      // via s.maps.highestTier
      s.maps.highestTier = 4;
      expect(isProfileUnlocked(s, 'profile_3')).toBe(false);

      s.maps.highestTier = 5;
      expect(isProfileUnlocked(s, 'profile_3')).toBe(true);

      // or via s.account.atlas.cleared
      s.maps.highestTier = 0;
      expect(isProfileUnlocked(s, 'profile_3')).toBe(false);
      const atlas = ensureAtlas(s);
      atlas.cleared.push(5);
      expect(isProfileUnlocked(s, 'profile_3')).toBe(true);
    });
  });

  describe('backward compatibility in save.ts', () => {
    it('initializes Profile 1 containing existing passives for legacy characters', () => {
      const s = makeState();
      s.passives = ['duelist_start', 'duelist_life_1'];
      s.masteries = { duelist_mastery_1: 0 };
      s.skillPassives = ['mining_yield_1', 'woodcutting_yield_1'];
      const atlas = ensureAtlas(s);
      atlas.nodes = ['atlas_start_sustain', 'sustain_tier_1'];

      // Simulate a legacy save with no profile properties
      const serialized = serialize(s);
      const raw = JSON.parse(serialized);
      delete raw.passiveProfiles;
      delete raw.activePassiveProfile;
      delete raw.atlasProfiles;
      delete raw.activeAtlasProfile;
      delete raw.skillingProfiles;
      delete raw.activeSkillingProfile;

      const loaded = deserialize(JSON.stringify(raw));
      expect(loaded.passiveProfiles).toHaveLength(1);
      expect(loaded.passiveProfiles[0].id).toBe('profile_1');
      expect(loaded.passiveProfiles[0].passives).toEqual(['duelist_start', 'duelist_life_1']);
      expect(loaded.passiveProfiles[0].masteries).toEqual({ duelist_mastery_1: 0 });
      expect(loaded.activePassiveProfile).toBe('profile_1');

      expect(loaded.atlasProfiles).toHaveLength(1);
      expect(loaded.atlasProfiles[0].id).toBe('profile_1');
      expect(loaded.activeAtlasProfile).toBe('profile_1');

      expect(loaded.skillingProfiles).toHaveLength(1);
      expect(loaded.skillingProfiles[0].id).toBe('profile_1');
      expect(loaded.skillingProfiles[0].passives).toEqual(['mining_yield_1', 'woodcutting_yield_1']);
      expect(loaded.activeSkillingProfile).toBe('profile_1');
    });
  });

  describe('switching and saving passive profiles', () => {
    it('disallows profile switching during active combat', () => {
      const s = makeState();
      s.campaign = { act: 5 };
      const ctx = makeCtx(s.account.nextUid as any);

      // In combat via s.combat
      s.combat = {} as CombatRuntime;
      const res1 = switchPassiveProfile(s, ctx, 'profile_2');
      expect(res1).toBe('Only allowed in Town or Hideout');

      // In combat via s.action
      s.combat = null;
      s.action = { kind: 'combat', zoneId: 'mudflats' };
      const res2 = switchPassiveProfile(s, ctx, 'profile_2');
      expect(res2).toBe('Only allowed in Town or Hideout');

      // In town / hideout
      s.action = null;
      const res3 = switchPassiveProfile(s, ctx, 'profile_2');
      expect(res3).toBeNull();
      expect(s.activePassiveProfile).toBe('profile_2');
    });

    it('blocks switching to locked profiles', () => {
      const s = makeState();
      s.campaign = { act: 2 };
      const ctx = makeCtx(s.account.nextUid as any);

      const err = switchPassiveProfile(s, ctx, 'profile_2');
      expect(err).toBe('Profile is locked');
    });

    it('switches passive profiles and preserves passives/masteries per profile', () => {
      const s = makeState();
      s.campaign = { act: 5 };
      const ctx = makeCtx(s.account.nextUid as any);

      // Set up Profile 1
      s.passives = ['node_a', 'node_b'];
      s.masteries = { node_m: 1 };
      savePassiveProfile(s, 'profile_1', 'Bossing Spec');

      // Switch to Profile 2 (starts empty)
      const res = switchPassiveProfile(s, ctx, 'profile_2');
      expect(res).toBeNull();
      expect(s.activePassiveProfile).toBe('profile_2');
      expect(s.passives).toEqual([]);
      expect(s.masteries).toEqual({});

      // Allocate in Profile 2
      s.passives = ['node_c'];
      s.masteries = { node_m2: 2 };
      savePassiveProfile(s, 'profile_2', 'Speed Farm Spec');

      // Switch back to Profile 1
      const resBack = switchPassiveProfile(s, ctx, 'profile_1');
      expect(resBack).toBeNull();
      expect(s.activePassiveProfile).toBe('profile_1');
      expect(s.passives).toEqual(['node_a', 'node_b']);
      expect(s.masteries).toEqual({ node_m: 1 });

      // Switch to Profile 2 again and verify Profile 2 state
      switchPassiveProfile(s, ctx, 'profile_2');
      expect(s.passives).toEqual(['node_c']);
      expect(s.masteries).toEqual({ node_m2: 2 });
    });

    it('automatically switches equipment loadout when linkedEquipment is configured', () => {
      const s = makeState();
      s.campaign = { act: 5 };
      const ctx = makeCtx(s.account.nextUid as any);

      // Save gear sets
      saveGearSet(s, 'Gear Set 0');
      saveGearSet(s, 'Gear Set 1');
      expect(s.loadouts.gear.length).toBe(2);

      // Configure profile 2 with linkedEquipment = 1
      s.passiveProfiles = [
        { id: 'profile_1', name: 'Profile 1', passives: ['p1'], masteries: {} },
        { id: 'profile_2', name: 'Profile 2', passives: ['p2'], masteries: {}, linkedEquipment: 1 },
      ];

      switchPassiveProfile(s, ctx, 'profile_2');
      expect(s.activePassiveProfile).toBe('profile_2');
      expect(s.passives).toEqual(['p2']);
    });

    it('automatically switches Atlas profile when linkedAtlas is configured', () => {
      const s = makeState();
      s.campaign = { act: 5 };
      s.maps.highestTier = 5;
      const ctx = makeCtx(s.account.nextUid as any);

      const atlas = ensureAtlas(s);
      atlas.nodes = ['atlas_node_1'];

      // Save Atlas Profile 1 and Profile 2
      saveAtlasProfile(s, 'profile_1', 'Atlas Map Sustain');
      atlas.nodes = ['atlas_node_bosses'];
      saveAtlasProfile(s, 'profile_2', 'Atlas Boss Farm');

      // Link Passive Profile 2 to Atlas Profile 2
      savePassiveProfile(s, 'profile_2', 'Boss Spec', { linkedAtlas: 'profile_2' });

      // Switch passive profile to profile_2
      switchPassiveProfile(s, ctx, 'profile_2');

      expect(s.activePassiveProfile).toBe('profile_2');
      expect(s.activeAtlasProfile).toBe('profile_2');
      expect(ensureAtlas(s).nodes).toEqual(['atlas_node_bosses']);
    });

    it('automatically switches Life Skills profile when linkedSkilling is configured', () => {
      const s = makeState();
      s.campaign = { act: 5 };
      const ctx = makeCtx(s.account.nextUid as any);

      s.skillPassives = ['mining_1'];
      saveSkillingProfile(s, 'profile_1', 'Mining Focus');

      s.skillPassives = ['crafting_1'];
      saveSkillingProfile(s, 'profile_2', 'Crafting Focus');

      // Link Passive Profile 2 to Skilling Profile 2
      savePassiveProfile(s, 'profile_2', 'Gathering Spec', { linkedSkilling: 'profile_2' });

      switchPassiveProfile(s, ctx, 'profile_2');

      expect(s.activePassiveProfile).toBe('profile_2');
      expect(s.activeSkillingProfile).toBe('profile_2');
      expect(s.skillPassives).toEqual(['crafting_1']);
    });
  });

  describe('Atlas and Life Skills profile management', () => {
    it('switches and saves Atlas tree profiles', () => {
      const s = makeState();
      s.campaign = { act: 5 };
      s.maps.highestTier = 5;
      const ctx = makeCtx(s.account.nextUid as any);

      const atlas = ensureAtlas(s);
      atlas.nodes = ['atlas_sustain_1', 'atlas_sustain_2'];
      saveAtlasProfile(s, 'profile_1', 'Sustain');

      const res = switchAtlasProfile(s, ctx, 'profile_2');
      expect(res).toBeNull();
      expect(s.activeAtlasProfile).toBe('profile_2');
      expect(atlas.nodes).toEqual([]);

      atlas.nodes = ['atlas_peril_1'];
      saveAtlasProfile(s, 'profile_2', 'Peril');

      switchAtlasProfile(s, ctx, 'profile_1');
      expect(s.activeAtlasProfile).toBe('profile_1');
      expect(atlas.nodes).toEqual(['atlas_sustain_1', 'atlas_sustain_2']);
    });

    it('switches and saves Life Skills tree profiles (and aliases)', () => {
      const s = makeState();
      s.campaign = { act: 5 };
      const ctx = makeCtx(s.account.nextUid as any);

      s.skillPassives = ['foraging_1', 'foraging_2'];
      saveLifeSkillsProfile(s, 'profile_1', 'Foraging');

      const res = switchLifeSkillsProfile(s, ctx, 'profile_2');
      expect(res).toBeNull();
      expect(s.activeSkillingProfile).toBe('profile_2');
      expect(s.skillPassives).toEqual([]);

      s.skillPassives = ['smithing_1'];
      saveSkillingProfile(s, 'profile_2', 'Smithing');

      switchSkillingProfile(s, ctx, 'profile_1');
      expect(s.activeSkillingProfile).toBe('profile_1');
      expect(s.skillPassives).toEqual(['foraging_1', 'foraging_2']);
    });

    it('handles mutual cross-linking without infinite recursion', () => {
      const s = makeState();
      s.campaign = { act: 5 };
      s.maps.highestTier = 5;
      const ctx = makeCtx(s.account.nextUid as any);

      // Passive 2 links to Atlas 2, and Atlas 2 links to Passive 2
      savePassiveProfile(s, 'profile_2', 'Combat 2', { linkedAtlas: 'profile_2' });
      saveAtlasProfile(s, 'profile_2', 'Atlas 2', { linkedEquipment: undefined } as any);
      (s.atlasProfiles.find((p) => p.id === 'profile_2') as any).linkedPassive = 'profile_2';

      // Switching passive profile should successfully terminate
      const res = switchPassiveProfile(s, ctx, 'profile_2');
      expect(res).toBeNull();
      expect(s.activePassiveProfile).toBe('profile_2');
      expect(s.activeAtlasProfile).toBe('profile_2');
    });
  });
});
