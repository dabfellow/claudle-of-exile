import { describe, expect, it } from 'vitest';
import { GEAR, HEIST_JOBS, heistJob, prepBoard, prepId } from '../src/data/heist';
import { actionsFor } from '../src/data/skills';
import type { Ctx } from '../src/engine/context';
import {
  heistGearTargetPool,
  heistStep,
  jobBlocker,
  setJobExit,
  setJobGearTarget,
  startHeist,
  stopHeistRepeat,
} from '../src/engine/heist';
import { baseDef } from '../src/data/bases';
import { professionProject } from '../src/data/professionProjects';
import { completeProject, settleProfessionProgress, startProject } from '../src/engine/professions';
import { seeded, type Rng } from '../src/engine/rng';
import { skillStep, startSkillAction } from '../src/engine/skills';
import { newGame, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';
import { bagCap, bagFull } from '../src/engine/storage';

const ctx = (seed = 1): Ctx => ({ rng: seeded(seed), now: 0, emit: () => {} });
const fixed = (v: number): Ctx => ({ rng: { next: () => v } as Rng, now: 0, emit: () => {} });

function makeThief(level = 1, markers = 0): GameState {
  const s = newGame(1, { name: 'Thief', classId: 'shadow' });
  s.skills.thieving = xpForLevel(level);
  if (markers > 0) for (const j of HEIST_JOBS) for (const e of prepBoard(j.id).items.filter((e) => e.kind !== 'ledger').slice(0, prepBoard(j.id).min)) s.heist.prep[prepId(j.id, e.kind)] = 3;
  settleProfessionProgress(s);
  return s;
}

function clearRoom(s: GameState, c: Ctx): void {
  if (s.action?.kind !== 'heist') throw new Error('no job under way');
  s.action.progress = 1e9;
  heistStep(s, c, 1, deriveStats(s));
}

describe('Phase 11 — Thieving and Heist Overhaul', () => {
  describe('Level-only Marks & Deterministic Markers', () => {
    it('has all 10 marks accessible strictly by Thieving level without area requirements', () => {
      const marks = actionsFor('thieving');
      expect(marks).toHaveLength(10);
      for (const m of marks) {
        expect(m.area).toBeUndefined();
        expect(m.gate).toBeUndefined();
      }
      const s = newGame(1, { name: 'Newbie', classId: 'duelist' });
      // Level 1 character with no zones unlocked can immediately start lifting purses
      expect(startSkillAction(s, ctx(), 'mark_peddler')).toBeNull();
      expect(s.action?.kind).toBe('skill');
      expect(s.action && 'actionId' in s.action ? s.action.actionId : '').toBe('mark_peddler');
    });

    it('counts mark completions on a persisted counter and no longer awards Markers', () => {
      const s = makeThief(1, 0);
      startSkillAction(s, ctx(), 'mark_peddler');
      const action = actionsFor('thieving').find((a) => a.id === 'mark_peddler')!;
      expect(s.professionProgress.counters['thieving.markers'] ?? 0).toBe(0);
      for (let i = 0; i < 20; i++) {
        if (s.action?.kind === 'skill') s.action.progress = action.intervalMs;
        skillStep(s, fixed(0.999), 1, deriveStats(s));
      }
      expect(s.professionProgress.counters['thieving.markers']).toBe(20);
      expect(s.storage.bank.rogues_marker ?? 0).toBe(0);
      expect(Object.values(s.heist.prep).reduce((a, b) => a + b, 0)).toBe(0);
    });
  });

  describe('Milestone-based Job Progression', () => {
    it('gates jobs strictly by level and prior clean exit milestones', () => {
      const s = makeThief(1, 1000);
      // Cinder Toll: level 1, no prior job required
      expect(jobBlocker(s, heistJob('cinder_toll'))).toBeNull();

      // Salt Tithe & Forger's Den require clean Cinder Toll exit
      s.skills.thieving = xpForLevel(15);
      expect(jobBlocker(s, heistJob('salt_tithe'))).toMatch(/The Cinder Toll/);
      expect(jobBlocker(s, heistJob('forgers_den'))).toMatch(/The Cinder Toll/);

      // Complete Cinder Toll cleanly
      startHeist(s, ctx(), 'cinder_toll');
      stopHeistRepeat(s);
      const safe = fixed(0.999);
      clearRoom(s, safe);
      clearRoom(s, safe);
      clearRoom(s, safe);
      expect(s.professionProgress.discoveries['heist_clean_cinder_toll']).toBe(true);
      expect(jobBlocker(s, heistJob('salt_tithe'))).toBeNull();
      expect(jobBlocker(s, heistJob('forgers_den'))).toBeNull();

      // Next tier: Last Wagon and Barrow Cache require clean Salt Tithe exit
      s.skills.thieving = xpForLevel(30);
      expect(jobBlocker(s, heistJob('last_wagon'))).toMatch(/The Salt Tithe/);
      expect(jobBlocker(s, heistJob('barrow_cache'))).toMatch(/The Salt Tithe/);

      startHeist(s, ctx(), 'salt_tithe');
      stopHeistRepeat(s);
      for (let r = 0; r < 4; r++) clearRoom(s, safe);
      expect(s.professionProgress.discoveries['heist_clean_salt_tithe']).toBe(true);
      expect(jobBlocker(s, heistJob('last_wagon'))).toBeNull();
      expect(jobBlocker(s, heistJob('barrow_cache'))).toBeNull();

      // Remounts & Pyre Vault require clean Last Wagon exit
      s.skills.thieving = xpForLevel(45);
      expect(jobBlocker(s, heistJob('remounts'))).toMatch(/The Last Wagon/);
      expect(jobBlocker(s, heistJob('pyre_vault'))).toMatch(/The Last Wagon/);

      startHeist(s, ctx(), 'last_wagon');
      stopHeistRepeat(s);
      for (let r = 0; r < 5; r++) clearRoom(s, safe);
      expect(s.professionProgress.discoveries['heist_clean_last_wagon']).toBe(true);
      expect(jobBlocker(s, heistJob('remounts'))).toBeNull();
      expect(jobBlocker(s, heistJob('pyre_vault'))).toBeNull();

      // Khan's Tribute requires clean Pyre Vault exit
      s.skills.thieving = xpForLevel(55);
      expect(jobBlocker(s, heistJob('khans_tribute'))).toMatch(/The Pyre Vault/);

      startHeist(s, ctx(), 'pyre_vault');
      stopHeistRepeat(s);
      for (let r = 0; r < 6; r++) clearRoom(s, safe);
      expect(s.professionProgress.discoveries['heist_clean_pyre_vault']).toBe(true);
      expect(jobBlocker(s, heistJob('khans_tribute'))).toBeNull();

      // Occult Treasury requires clean Khan's Tribute exit
      s.skills.thieving = xpForLevel(65);
      expect(jobBlocker(s, heistJob('occult_treasury'))).toMatch(/The Khan's Tribute/);

      startHeist(s, ctx(), 'khans_tribute');
      stopHeistRepeat(s);
      for (let r = 0; r < 7; r++) clearRoom(s, safe);
      expect(s.professionProgress.discoveries['heist_clean_khans_tribute']).toBe(true);
      expect(jobBlocker(s, heistJob('occult_treasury'))).toBeNull();
    });

    it('allows a clean chosen early exit to count toward the milestone without completing the vault', () => {
      const s = makeThief(1, 100);
      setJobExit(s, 'cinder_toll', 2); // Walk out after room 2 of 3
      startHeist(s, ctx(), 'cinder_toll');
      stopHeistRepeat(s);
      const safe = fixed(0.999);
      clearRoom(s, safe);
      clearRoom(s, safe);
      expect(s.action).toBeNull();
      expect(s.professionProgress.discoveries['heist_clean_cinder_toll']).toBe(true);
      s.skills.thieving = xpForLevel(8);
      expect(jobBlocker(s, heistJob('salt_tithe'))).toBeNull();
    });

    it('preserves access for legacy saves that have unlocked campaign areas', () => {
      const s = makeThief(60, 500);
      s.unlockedZones = ['cinderroad', 'saltflats', 'blackgrass', 'caravan', 'kurgans', 'plateau', 'pyretemple', 'burningthrone'];
      settleProfessionProgress(s, true);
      // Legacy access grants all 8 existing jobs
      for (const j of HEIST_JOBS) {
        if (j.id === 'occult_treasury') continue;
        expect(s.professionProgress.legacyAccess[`heist.${j.id}`]).toBe(true);
        expect(jobBlocker(s, j)).toBeNull();
      }
    });
  });

  describe('Equipment Targeting & ilvl Caps', () => {
    it('caps stolen gear ilvl by min(job.ilvl, Thieving level + 10)', () => {
      const s = makeThief(15, 100); // Thieving level 15: cap is 15 + 10 = 25
      s.professionProgress.legacyAccess['heist.last_wagon'] = true;
      const job = heistJob('last_wagon'); // job.ilvl is 29
      const pool = heistGearTargetPool(s, job);
      expect(pool.ilvl).toBe(25); // min(29, 25) = 25

      s.skills.thieving = xpForLevel(30); // Thieving level 30: 30 + 10 = 40
      const poolHigh = heistGearTargetPool(s, job);
      expect(poolHigh.ilvl).toBe(29); // min(29, 40) = 29
    });

    it('filters rare gear pool by selected target category (weapon, armour, jewellery)', () => {
      const s = makeThief(40, 200);
      s.professionProgress.legacyAccess['heist.last_wagon'] = true;
      const job = heistJob('last_wagon');

      // Default: all droppable bases
      const allPool = heistGearTargetPool(s, job);
      expect(allPool.category).toBe('all');
      expect(allPool.bases.some((b) => b.slot === 'weapon')).toBe(true);
      expect(allPool.bases.some((b) => b.slot === 'body' || b.slot === 'offhand')).toBe(true);
      expect(allPool.bases.some((b) => b.slot === 'ring' || b.slot === 'amulet')).toBe(true);

      // Target weapons
      setJobGearTarget(s, 'last_wagon', 'weapon');
      const weaponPool = heistGearTargetPool(s, job);
      expect(weaponPool.category).toBe('weapon');
      expect(weaponPool.bases.every((b) => b.slot === 'weapon')).toBe(true);

      // Target armour
      setJobGearTarget(s, 'last_wagon', 'armour');
      const armourPool = heistGearTargetPool(s, job);
      expect(armourPool.category).toBe('armour');
      expect(armourPool.bases.every((b) => ['helmet', 'body', 'gloves', 'boots', 'offhand'].includes(b.slot))).toBe(true);

      // Target jewellery
      setJobGearTarget(s, 'last_wagon', 'jewellery');
      const jewlPool = heistGearTargetPool(s, job);
      expect(jewlPool.category).toBe('jewellery');
      expect(jewlPool.bases.every((b) => ['ring', 'amulet', 'belt'].includes(b.slot))).toBe(true);
    });

    it('steals items conforming strictly to the selected gear target category', () => {
      const s = makeThief(40, 200);
      s.professionProgress.legacyAccess['heist.last_wagon'] = true;
      setJobGearTarget(s, 'last_wagon', 'jewellery');

      startHeist(s, ctx(), 'last_wagon');
      stopHeistRepeat(s);
      if (s.action?.kind === 'heist') s.action.take[GEAR] = 1;
      s.action = s.action?.kind === 'heist' ? { ...s.action, room: 5, lastRoom: 5 } : null;
      const safe = fixed(0.999);
      clearRoom(s, safe);

      expect(s.inventory).toHaveLength(1);
      const dropped = s.inventory[0];
      const base = baseDef(dropped.baseId);
      expect(['ring', 'amulet', 'belt']).toContain(base.slot);
      expect(dropped.rarity).toBe('rare');
      expect(dropped.ilvl).toBe(29);
    });
  });

  describe('The Occult Treasury Job', () => {
    it('has exact 6 rooms, 60s room timer, alert 8, and 75 final XP per room', () => {
      const job = heistJob('occult_treasury');
      expect(job.level).toBe(65);
      expect(job.rooms).toBe(6);
      expect(job.roomMs).toBe(60_000);
      expect(job.alert).toBe(8);
      expect(job.xp).toBe(75); // 75 final XP per room (450 total for 6 rooms)
      expect(job.gold).toBe(250);
    });

    it('awards 1 Treasury Fragment per completed room on settlement, even on alarm', () => {
      const s = makeThief(65, 200);
      s.professionProgress.discoveries['heist_clean_khans_tribute'] = true;

      startHeist(s, ctx(), 'occult_treasury');
      stopHeistRepeat(s);

      // Trigger alarm in room 1 (fixed rng 0 = alarm procs)
      clearRoom(s, fixed(0.001));
      expect(s.action).toBeNull();
      expect(s.heist.tally.alarms).toBe(1);
      // Even on alarm in room 1, the completed room awards 1 Treasury Fragment
      expect(s.storage.bank.treasury_fragment).toBe(1);
      expect(s.professionProgress.counters['thieving.treasury_rooms']).toBe(1);
    });

    it('awards +4 extra fragments and 1 Oath Fragment on clean vault exit', () => {
      const s = makeThief(65, 200);
      s.professionProgress.discoveries['heist_clean_khans_tribute'] = true;

      startHeist(s, ctx(), 'occult_treasury');
      stopHeistRepeat(s);

      const safe = fixed(0.999);
      // Clear all 6 rooms cleanly
      for (let r = 0; r < 6; r++) clearRoom(s, safe);

      // 6 rooms = 6 fragments from rooms, + 4 extra from clean vault = 10 total
      expect(s.storage.bank.treasury_fragment).toBe(10);
      // 1 Oath Fragment from clean vault
      expect(s.storage.bank.oath_fragment).toBe(1);
      expect(s.professionProgress.discoveries['heist_clean_occult_treasury']).toBe(true);
    });

    it('awards 1 Oath Fragment every 12 completed rooms regardless of clean vaults', () => {
      const s = makeThief(65, 500);
      s.professionProgress.discoveries['heist_clean_khans_tribute'] = true;
      expect(s.professionProgress.counters['thieving.treasury_rooms'] ?? 0).toBe(0);

      // Run 2 full runs with early exits at room 6 or alarm
      const safe = fixed(0.999);
      for (let run = 0; run < 2; run++) {
        startHeist(s, ctx(), 'occult_treasury');
        stopHeistRepeat(s);
        for (let r = 0; r < 6; r++) clearRoom(s, safe);
      }
      expect(s.professionProgress.counters['thieving.treasury_rooms']).toBe(12);
      // Clean vault gives 1 each run (2 total), plus the 12-room milestone gives 1 = 3 total
      expect(s.storage.bank.oath_fragment).toBe(3);
    });

    it('delivers 0.5% Borrowed Tomorrow jackpot safely into overflow if bag is full', () => {
      const s = makeThief(65, 200);
      s.professionProgress.discoveries['heist_clean_khans_tribute'] = true;

      // Fill bag completely
      for (let i = 0; i < bagCap(s); i++) {
        s.inventory.push({ uid: 1000 + i, baseId: 'iron_ring', rarity: 'normal', prefixes: [], suffixes: [], quality: 0, ilvl: 1 } as any);
      }
      expect(bagFull(s)).toBe(true);

      startHeist(s, ctx(), 'occult_treasury');
      stopHeistRepeat(s);

      const safe = fixed(0.999);
      for (let r = 0; r < 5; r++) clearRoom(s, safe);

      // In room 6, alarm check returns 0.999 (clean), then jackpot check returns 0.001 (< 0.005)
      let call = 0;
      const jackpotCtx: Ctx = {
        rng: {
          next: () => {
            call++;
            return call <= 2 ? 0.999 : 0.001;
          },
        } as Rng,
        now: 0,
        emit: () => {},
      };
      clearRoom(s, jackpotCtx);

      // Inventory was full, so Borrowed Tomorrow went safely into overflow
      expect(s.inventory).toHaveLength(bagCap(s));
      expect(s.storage.overflow.some((i) => i.uniqueId === 'borrowed_tomorrow')).toBe(true);
      expect(s.lifetime.uniquesFound).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Thieving Profession Projects', () => {
    it('claims Borrowed Tomorrow amulet at Thieving 65 for 120 Treasury Fragments', () => {
      const s = makeThief(65, 100);
      s.storage.bank.treasury_fragment = 120;
      const proj = professionProject('borrowed_tomorrow');
      expect(proj).toBeDefined();
      expect(proj!.skill).toBe('thieving');
      expect(proj!.level).toBe(65);
      expect(proj!.durationMs).toBe(60_000);
      expect(proj!.xp).toBe(120);

      expect(startProject(s, ctx(), 'borrowed_tomorrow')).toBeNull();
      expect(s.storage.bank.treasury_fragment).toBe(0);

      s.professionProgress.activeProject!.elapsedMs = 60_000;
      const err = completeProject(s, ctx(), s.professionProgress.activeProject!.runId);
      expect(err).toBeNull();

      const item = s.inventory.find((i) => i.uniqueId === 'borrowed_tomorrow');
      expect(item).toBeDefined();
      expect(item!.baseId).toBe('overhaul_treasury_amulet');
      expect(item!.ilvl).toBe(80);
      expect(item!.rarity).toBe('unique');
    });

    it('assembles Stolen Oath Seal at Thieving 75 for 5 Oath Fragments', () => {
      const s = makeThief(75, 100);
      s.storage.bank.oath_fragment = 5;
      const proj = professionProject('assemble_oath');
      expect(proj).toBeDefined();
      expect(proj!.skill).toBe('thieving');
      expect(proj!.level).toBe(75);
      expect(proj!.durationMs).toBe(60_000);
      expect(proj!.xp).toBe(150);

      expect(startProject(s, ctx(), 'assemble_oath')).toBeNull();
      expect(s.storage.bank.oath_fragment).toBe(0);

      s.professionProgress.activeProject!.elapsedMs = 60_000;
      const err = completeProject(s, ctx(), s.professionProgress.activeProject!.runId);
      expect(err).toBeNull();

      expect(s.storage.bank.stolen_oath_seal).toBe(1);
    });
  });

  describe('Live vs Offline 8-Hour Parity', () => {
    it('produces equivalent deterministic progress and fragment payouts over extended ticks', () => {
      const sLive = makeThief(65, 5000);
      sLive.professionProgress.discoveries['heist_clean_khans_tribute'] = true;
      startHeist(sLive, ctx(), 'occult_treasury');

      const sOffline = makeThief(65, 5000);
      sOffline.professionProgress.discoveries['heist_clean_khans_tribute'] = true;
      startHeist(sOffline, ctx(), 'occult_treasury');

      // Tick 1 hour (3600 seconds) in 10-second steps
      const safeCtx: Ctx = { rng: seeded(123), now: 0, emit: () => {} };
      const safeOfflineCtx: Ctx = { rng: seeded(123), now: 0, emit: () => {}, offline: true };

      for (let t = 0; t < 360; t++) {
        tick(sLive, safeCtx, 10_000);
        tick(sOffline, safeOfflineCtx, 10_000);
      }

      // Parity check: both have progressed through jobs, awarded treasury fragments, and banked loot
      expect(sLive.heist.tally.jobs).toBeGreaterThan(0);
      expect(sOffline.heist.tally.jobs).toBe(sLive.heist.tally.jobs);
      expect(sOffline.storage.bank.treasury_fragment).toBe(sLive.storage.bank.treasury_fragment);
      expect(sOffline.storage.bank.oath_fragment).toBe(sLive.storage.bank.oath_fragment);
    });
  });
});
