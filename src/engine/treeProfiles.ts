import type { Ctx } from './context';
import { applyGearSet, keepingVitals } from './loadouts';
import { ensureAtlas } from './maps';
import { reachedAct } from './progress';
import { seeded } from './rng';
import type { GameState, TreeProfile } from './types';

export const TREE_PROFILE_IDS = ['profile_1', 'profile_2', 'profile_3'] as const;
export type TreeProfileId = (typeof TREE_PROFILE_IDS)[number];

export function normalizeProfileId(id: string | number): string {
  const str = String(id).trim();
  if (str === '1' || str === 'profile_1') return 'profile_1';
  if (str === '2' || str === 'profile_2') return 'profile_2';
  if (str === '3' || str === 'profile_3') return 'profile_3';
  return str;
}

/** Check if a tree profile is unlocked based on progression requirements. */
export function isProfileUnlocked(s: GameState, profileId: string | number): boolean {
  const id = normalizeProfileId(profileId);
  if (id === 'profile_1') return true;
  if (id === 'profile_2') {
    const act = (s as any).campaign?.act ?? reachedAct(s);
    return act >= 5;
  }
  if (id === 'profile_3') {
    const highestMapTier = (s.maps as any)?.highestTier ?? 0;
    const atlasCleared = s.account?.atlas?.cleared ?? [];
    return highestMapTier >= 5 || atlasCleared.some((t: number) => t >= 5);
  }
  return false;
}

/** Ensure tree profile arrays and active IDs exist on GameState. */
export function settleTreeProfiles(s: GameState): void {
  if (!s.passiveProfiles || s.passiveProfiles.length === 0) {
    s.passiveProfiles = [
      {
        id: 'profile_1',
        name: 'Profile 1',
        passives: [...(s.passives ?? [])],
        masteries: { ...(s.masteries ?? {}) },
      },
    ];
  } else if (
    s.passiveProfiles.length === 1 &&
    s.passiveProfiles[0].id === 'profile_1' &&
    s.passiveProfiles[0].passives.length === 0 &&
    (s.passives?.length ?? 0) > 0
  ) {
    s.passiveProfiles[0].passives = [...s.passives];
    s.passiveProfiles[0].masteries = { ...(s.masteries ?? {}) };
  }
  s.activePassiveProfile ??= 'profile_1';

  const atlasNodes = s.account?.atlas?.nodes ?? [];
  if (!s.atlasProfiles || s.atlasProfiles.length === 0) {
    s.atlasProfiles = [
      {
        id: 'profile_1',
        name: 'Profile 1',
        passives: [...atlasNodes],
        masteries: {},
      },
    ];
  } else if (
    s.atlasProfiles.length === 1 &&
    s.atlasProfiles[0].id === 'profile_1' &&
    s.atlasProfiles[0].passives.length === 0 &&
    atlasNodes.length > 0
  ) {
    s.atlasProfiles[0].passives = [...atlasNodes];
  }
  s.activeAtlasProfile ??= 'profile_1';

  if (!s.skillingProfiles || s.skillingProfiles.length === 0) {
    s.skillingProfiles = [
      {
        id: 'profile_1',
        name: 'Profile 1',
        passives: [...(s.skillPassives ?? [])],
        masteries: {},
      },
    ];
  } else if (
    s.skillingProfiles.length === 1 &&
    s.skillingProfiles[0].id === 'profile_1' &&
    s.skillingProfiles[0].passives.length === 0 &&
    (s.skillPassives?.length ?? 0) > 0
  ) {
    s.skillingProfiles[0].passives = [...s.skillPassives];
  }
  s.activeSkillingProfile ??= 'profile_1';

  if (s.campaign === undefined) {
    s.campaign = { act: reachedAct(s) };
  }
}

function dummyCtx(): Ctx {
  return {
    rng: seeded(1),
    now: Date.now(),
    emit: () => {},
  };
}

/**
 * Switch Character Passive Tree profile.
 * Only allowed in Town or Hideout (not in active combat).
 * Automatically switches linked equipment, Atlas profile, and Skilling profile if configured.
 */
export function switchPassiveProfile(
  s: GameState,
  ctx?: Ctx,
  profileId: string | number = 'profile_1',
  visited?: Set<string>,
): string | null {
  if (s.combat || s.action?.kind === 'combat') {
    return 'Only allowed in Town or Hideout';
  }

  settleTreeProfiles(s);
  const normId = normalizeProfileId(profileId);
  if (!isProfileUnlocked(s, normId)) {
    return 'Profile is locked';
  }

  const visitKey = `passive:${normId}`;
  if (visited?.has(visitKey)) return null;
  const visitSet = new Set(visited);
  visitSet.add(visitKey);

  // Sync current active profile before switching
  const cur = s.passiveProfiles.find((p) => p.id === s.activePassiveProfile);
  if (cur) {
    cur.passives = [...s.passives];
    cur.masteries = { ...s.masteries };
  }

  // Find or create target profile
  let target = s.passiveProfiles.find((p) => p.id === normId);
  if (!target) {
    target = {
      id: normId,
      name: `Profile ${normId.replace('profile_', '')}`,
      passives: [],
      masteries: {},
    };
    s.passiveProfiles.push(target);
  }

  // Activate target profile
  keepingVitals(s, () => {
    s.passives = [...target.passives];
    s.masteries = { ...target.masteries };
  });
  s.activePassiveProfile = normId;

  const actualCtx = ctx ?? dummyCtx();
  actualCtx.emit?.({ t: 'info', text: `Switched to ${target.name}` });

  // Cross-linking
  if (target.linkedEquipment !== undefined) {
    const gearSet = s.loadouts.gear[target.linkedEquipment] ?? s.loadouts.gear.find((g) => g.id === target.linkedEquipment);
    if (gearSet) {
      applyGearSet(s, actualCtx, gearSet.id);
    }
  }

  if (target.linkedAtlas) {
    switchAtlasProfile(s, actualCtx, target.linkedAtlas, visitSet);
  }

  if (target.linkedSkilling) {
    switchSkillingProfile(s, actualCtx, target.linkedSkilling, visitSet);
  }

  return null;
}

/** Save/update a Character Passive Tree profile */
export function savePassiveProfile(
  s: GameState,
  profileId: string | number,
  name?: string,
  links?: Partial<TreeProfile>,
): TreeProfile {
  settleTreeProfiles(s);
  const normId = normalizeProfileId(profileId);
  let p = s.passiveProfiles.find((x) => x.id === normId);
  if (!p) {
    p = {
      id: normId,
      name: name ?? `Profile ${normId.replace('profile_', '')}`,
      passives: [...s.passives],
      masteries: { ...s.masteries },
    };
    s.passiveProfiles.push(p);
  } else {
    p.passives = [...s.passives];
    p.masteries = { ...s.masteries };
    if (name !== undefined) p.name = name;
  }

  if (links) {
    if ('linkedEquipment' in links) p.linkedEquipment = links.linkedEquipment;
    if ('linkedAtlas' in links) p.linkedAtlas = links.linkedAtlas;
    if ('linkedSkilling' in links) p.linkedSkilling = links.linkedSkilling;
  }
  return p;
}

/**
 * Switch Atlas Tree profile.
 * Only allowed in Town or Hideout (not in active combat).
 * Automatically switches linked equipment, Passive profile, and Skilling profile if configured.
 */
export function switchAtlasProfile(
  s: GameState,
  ctx?: Ctx,
  profileId: string | number = 'profile_1',
  visited?: Set<string>,
): string | null {
  if (s.combat || s.action?.kind === 'combat') {
    return 'Only allowed in Town or Hideout';
  }

  settleTreeProfiles(s);
  const normId = normalizeProfileId(profileId);
  if (!isProfileUnlocked(s, normId)) {
    return 'Profile is locked';
  }

  const visitKey = `atlas:${normId}`;
  if (visited?.has(visitKey)) return null;
  const visitSet = new Set(visited);
  visitSet.add(visitKey);

  const atlas = ensureAtlas(s);
  const cur = s.atlasProfiles.find((p) => p.id === s.activeAtlasProfile);
  if (cur) {
    cur.passives = [...atlas.nodes];
  }

  let target = s.atlasProfiles.find((p) => p.id === normId);
  if (!target) {
    target = {
      id: normId,
      name: `Profile ${normId.replace('profile_', '')}`,
      passives: [],
      masteries: {},
    };
    s.atlasProfiles.push(target);
  }

  atlas.nodes = [...target.passives];
  s.activeAtlasProfile = normId;

  const actualCtx = ctx ?? dummyCtx();
  actualCtx.emit?.({ t: 'info', text: `Switched Atlas to ${target.name}` });

  if (target.linkedEquipment !== undefined) {
    const gearSet = s.loadouts.gear[target.linkedEquipment] ?? s.loadouts.gear.find((g) => g.id === target.linkedEquipment);
    if (gearSet) {
      applyGearSet(s, actualCtx, gearSet.id);
    }
  }

  if ((target as any).linkedPassive) {
    switchPassiveProfile(s, actualCtx, (target as any).linkedPassive, visitSet);
  }

  if (target.linkedSkilling) {
    switchSkillingProfile(s, actualCtx, target.linkedSkilling, visitSet);
  }

  return null;
}

/** Save/update an Atlas Tree profile */
export function saveAtlasProfile(
  s: GameState,
  profileId: string | number,
  name?: string,
  links?: Partial<TreeProfile>,
): TreeProfile {
  settleTreeProfiles(s);
  const normId = normalizeProfileId(profileId);
  const atlas = ensureAtlas(s);
  let p = s.atlasProfiles.find((x) => x.id === normId);
  if (!p) {
    p = {
      id: normId,
      name: name ?? `Profile ${normId.replace('profile_', '')}`,
      passives: [...atlas.nodes],
      masteries: {},
    };
    s.atlasProfiles.push(p);
  } else {
    p.passives = [...atlas.nodes];
    if (name !== undefined) p.name = name;
  }

  if (links) {
    if ('linkedEquipment' in links) p.linkedEquipment = links.linkedEquipment;
    if ('linkedAtlas' in links) p.linkedAtlas = links.linkedAtlas;
    if ('linkedSkilling' in links) p.linkedSkilling = links.linkedSkilling;
  }
  return p;
}

/**
 * Switch Life Skills Tree profile.
 * Only allowed in Town or Hideout (not in active combat).
 * Automatically switches linked equipment, Passive profile, and Atlas profile if configured.
 */
export function switchSkillingProfile(
  s: GameState,
  ctx?: Ctx,
  profileId: string | number = 'profile_1',
  visited?: Set<string>,
): string | null {
  if (s.combat || s.action?.kind === 'combat') {
    return 'Only allowed in Town or Hideout';
  }

  settleTreeProfiles(s);
  const normId = normalizeProfileId(profileId);
  if (!isProfileUnlocked(s, normId)) {
    return 'Profile is locked';
  }

  const visitKey = `skilling:${normId}`;
  if (visited?.has(visitKey)) return null;
  const visitSet = new Set(visited);
  visitSet.add(visitKey);

  const cur = s.skillingProfiles.find((p) => p.id === s.activeSkillingProfile);
  if (cur) {
    cur.passives = [...s.skillPassives];
  }

  let target = s.skillingProfiles.find((p) => p.id === normId);
  if (!target) {
    target = {
      id: normId,
      name: `Profile ${normId.replace('profile_', '')}`,
      passives: [],
      masteries: {},
    };
    s.skillingProfiles.push(target);
  }

  s.skillPassives = [...target.passives];
  s.activeSkillingProfile = normId;

  const actualCtx = ctx ?? dummyCtx();
  actualCtx.emit?.({ t: 'info', text: `Switched Life Skills to ${target.name}` });

  if (target.linkedEquipment !== undefined) {
    const gearSet = s.loadouts.gear[target.linkedEquipment] ?? s.loadouts.gear.find((g) => g.id === target.linkedEquipment);
    if (gearSet) {
      applyGearSet(s, actualCtx, gearSet.id);
    }
  }

  if ((target as any).linkedPassive) {
    switchPassiveProfile(s, actualCtx, (target as any).linkedPassive, visitSet);
  }

  if (target.linkedAtlas) {
    switchAtlasProfile(s, actualCtx, target.linkedAtlas, visitSet);
  }

  return null;
}

/** Save/update a Life Skills Tree profile */
export function saveSkillingProfile(
  s: GameState,
  profileId: string | number,
  name?: string,
  links?: Partial<TreeProfile>,
): TreeProfile {
  settleTreeProfiles(s);
  const normId = normalizeProfileId(profileId);
  let p = s.skillingProfiles.find((x) => x.id === normId);
  if (!p) {
    p = {
      id: normId,
      name: name ?? `Profile ${normId.replace('profile_', '')}`,
      passives: [...s.skillPassives],
      masteries: {},
    };
    s.skillingProfiles.push(p);
  } else {
    p.passives = [...s.skillPassives];
    if (name !== undefined) p.name = name;
  }

  if (links) {
    if ('linkedEquipment' in links) p.linkedEquipment = links.linkedEquipment;
    if ('linkedAtlas' in links) p.linkedAtlas = links.linkedAtlas;
    if ('linkedSkilling' in links) p.linkedSkilling = links.linkedSkilling;
  }
  return p;
}

export const switchLifeSkillsProfile = switchSkillingProfile;
export const saveLifeSkillsProfile = saveSkillingProfile;
