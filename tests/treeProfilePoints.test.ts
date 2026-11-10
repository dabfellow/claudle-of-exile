import { describe, expect, it } from 'vitest';
import { PASSIVE_BY_ID } from '../src/data/passiveTree';
import { makeCtx } from '../src/engine/context';
import { saveGearSet } from '../src/engine/loadouts';
import { allocate, settlePassivePoints, spentPoints, startNode } from '../src/engine/passives';
import { deserialize, NewerSaveError, serialize } from '../src/engine/save';
import { newGame, SAVE_VERSION } from '../src/engine/state';
import { savePassiveProfile, switchPassiveProfile } from '../src/engine/treeProfiles';
import type { GameState } from '../src/engine/types';

function fresh(): GameState {
  const s = newGame(1);
  s.campaign = { act: 5 };
  s.combat = null;
  s.action = null;
  s.characterTreeOverhaul = 2 as never;
  settlePassivePoints(s);
  s.travelPoints = 100;
  s.passivePoints = 100;
  return s;
}

/** a road of small nodes out from the character's start */
function road(s: GameState, length: number): string[] {
  const out: string[] = [];
  let at = startNode(s);
  const seen = new Set([at]);
  while (out.length < length) {
    const next = PASSIVE_BY_ID[at].links.find((l) => !seen.has(l) && ['travel', 'small', 'large', 'notable'].includes(PASSIVE_BY_ID[l]?.kind));
    if (!next) break;
    out.push(next);
    seen.add(next);
    at = next;
  }
  return out;
}

const owned = (s: GameState) => {
  const spent = spentPoints(s);
  return s.travelPoints + spent.travelPoints + s.passivePoints + spent.passivePoints + s.masteryPoints + spent.masteryPoints;
};

describe('passive profiles keep the same points', () => {
  it('switching back and forth neither duplicates nor loses points', () => {
    const s = fresh();
    const ctx = makeCtx(s.account.nextUid as never);
    const path = road(s, 3);
    expect(path.length).toBe(3);
    for (const id of path) expect(allocate(s, ctx, id)).toBeNull();
    const total = owned(s);

    expect(switchPassiveProfile(s, ctx, 'profile_2')).toBeNull();
    expect(s.passives).toEqual([]);
    expect(owned(s)).toBe(total);
    // everything spent in profile 1 is spendable again here
    expect(s.travelPoints + s.passivePoints + s.masteryPoints).toBe(total);

    expect(allocate(s, ctx, path[0])).toBeNull();
    expect(owned(s)).toBe(total);

    expect(switchPassiveProfile(s, ctx, 'profile_1')).toBeNull();
    expect(s.passives).toEqual(path);
    expect(owned(s)).toBe(total);
    expect(s.travelPoints + s.passivePoints + s.masteryPoints).toBeLessThan(total);

    expect(switchPassiveProfile(s, ctx, 'profile_2')).toBeNull();
    expect(s.passives).toEqual([path[0]]);
    expect(owned(s)).toBe(total);
  });

  it('renaming a profile that is not in use does not overwrite it', () => {
    const s = fresh();
    const ctx = makeCtx(s.account.nextUid as never);
    const path = road(s, 2);
    for (const id of path) allocate(s, ctx, id);
    switchPassiveProfile(s, ctx, 'profile_2');
    savePassiveProfile(s, 'profile_1', 'Bossing');
    expect(s.passiveProfiles.find((p) => p.id === 'profile_1')?.passives).toEqual(path);
  });

  it('a linked gear set is found by its id, not its position in the list', () => {
    const s = fresh();
    const ctx = makeCtx(s.account.nextUid as never);
    saveGearSet(s, 'Empty');
    const set = s.loadouts.gear[0];
    savePassiveProfile(s, 'profile_2', 'Linked', { linkedEquipment: set.id });
    expect(switchPassiveProfile(s, ctx, 'profile_2')).toBeNull();
    // a link to a set that no longer exists is skipped rather than picking another one
    savePassiveProfile(s, 'profile_2', 'Linked', { linkedEquipment: 987654 });
    expect(switchPassiveProfile(s, ctx, 'profile_1')).toBeNull();
    expect(switchPassiveProfile(s, ctx, 'profile_2')).toBeNull();
  });

  it('folds the Tree page\'s old private profiles into the engine\'s on load', () => {
    const s = fresh();
    const ctx = makeCtx(s.account.nextUid as never);
    const path = road(s, 2);
    for (const id of path) allocate(s, ctx, id);
    const raw = JSON.parse(serialize(s));
    raw.settings.activePassiveProfileId = 1;
    raw.settings.passiveProfiles = [
      { id: 1, name: 'Boss', passives: [], masteries: {}, linkedGearId: null, linkedSkillId: null, linkedAtlas: null, crossLinkGear: false, crossLinkSkills: false, crossLinkAtlas: false },
      { id: 2, name: 'Mapping', passives: [path[0]], masteries: {}, linkedGearId: null, linkedSkillId: null, linkedAtlas: null, crossLinkGear: false, crossLinkSkills: false, crossLinkAtlas: false },
      { id: 3, name: 'Profile 3', passives: [], masteries: {}, linkedGearId: null, linkedSkillId: null, linkedAtlas: null, crossLinkGear: false, crossLinkSkills: false, crossLinkAtlas: false },
    ];
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.settings.passiveProfiles).toBeUndefined();
    expect(loaded.activePassiveProfile).toBe('profile_1');
    // the profile in use is what is on the character; the others keep what they held
    expect(loaded.passiveProfiles.find((p) => p.id === 'profile_1')).toMatchObject({ name: 'Boss', passives: path });
    expect(loaded.passiveProfiles.find((p) => p.id === 'profile_2')).toMatchObject({ name: 'Mapping', passives: [path[0]] });
  });
});

describe('a save from a newer version', () => {
  it('is refused instead of loaded and re-stamped with an older version', () => {
    const raw = JSON.parse(serialize(newGame(1)));
    raw.version = SAVE_VERSION + 1;
    expect(() => deserialize(JSON.stringify(raw))).toThrow(NewerSaveError);
  });
});
