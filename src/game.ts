import { ACHIEVEMENT_BY_ID } from './data/achievements';
import { BENCH_CRAFTS } from './data/hideout';
import { useEffect, useSyncExternalStore } from 'react';
import { flaskDef } from './data/flasks';
import { SKILLS } from './data/skills';
import { ZONES } from './data/zones';
import type { Ctx } from './engine/context';
import { itemName } from './engine/items';
import { MIN_OFFLINE_MS, simulateOffline, type OfflineSummary } from './engine/offline';
import { mathRng } from './engine/rng';
import type { ClassId } from './data/classes';
import { TUTORIAL_STEPS } from './data/tutorial';
import { newGame, tick } from './engine/state';
import { tutorialPage, withTutorial } from './engine/tutorial';
import { AppAccounts, type Account, type AuthProviderId } from './platform/accounts';
import { getSupabase } from './platform/supabase';
import { supabaseCharacters } from './platform/supabaseTable';
import { CloudSaveStore, LocalSaveStore, moveCharacters, type CharacterSummary, type SaveStore, type SyncStatus } from './platform/saves';
import type { GameEvent, GameState, Item, SkillId } from './engine/types';
import { activeGemDef, supportGemDef } from './data/gems';

export interface FeedEntry {
  id: number;
  at: number;
  text: string;
  tone: 'info' | 'good' | 'warn' | 'bad' | 'magic' | 'rare' | 'unique' | 'level';
}

export interface LogLine {
  id: number;
  at: number;
  text: string;
  tone: FeedEntry['tone'];
}

export interface LootLine {
  id: number;
  at: number;
  item?: Item;
  currencyId?: string;
  gemId?: string;
  supportId?: string;
  salvaged?: boolean;
}

export interface Toast {
  id: number;
  text: string;
  tone: FeedEntry['tone'];
}

const NOTIFY_MS = 100;
const AUTOSAVE_MS = 10_000;
/** frames further apart than this (tab hidden, laptop asleep) are treated as offline time */
const BACKGROUND_MS = 5 * 60_000;

export type Screen = 'boot' | 'title' | 'select' | 'create' | 'game';

class GameStore {
  state: GameState;
  screen: Screen = 'boot';
  account: Account | null = null;
  characters: CharacterSummary[] = [];
  /** true right after creating a character, until the intro is dismissed */
  showIntro = false;
  rev = 0;
  feed: FeedEntry[] = [];
  /** right-sidebar tabs: what happened in fights, and what dropped */
  combatLog: LogLine[] = [];
  lootLog: LootLine[] = [];
  toasts: Toast[] = [];
  offline: OfflineSummary | null = null;
  /** recent xp gains, for the xp/hour readout */
  xpLog: { at: number; skill: SkillId; amount: number }[] = [];
  readonly accounts = new AppAccounts(localStorage, getSupabase());
  private saves: SaveStore | null = null;
  /** cloud sync state while signed in with Google/Discord */
  sync: SyncStatus | null = null;
  /** characters saved as a guest on this browser, offered for moving to a signed-in account */
  guestCharacters: CharacterSummary[] = [];
  private listeners = new Set<() => void>();
  private eventListeners = new Set<(e: GameEvent) => void>();
  private nextId = 1;
  private lastFrame = 0;
  private lastNotify = 0;
  private lastSave = 0;
  private loop: ReturnType<typeof setInterval> | null = null;
  private baseCtx: Ctx;
  readonly ctx: Ctx;

  constructor() {
    this.state = newGame();
    this.baseCtx = { rng: mathRng, now: Date.now(), emit: (e) => this.onEvent(e) };
    this.ctx = withTutorial(this.baseCtx, () => this.state);
    window.addEventListener('beforeunload', () => this.save());
  }

  // ---------- account & characters ----------

  async boot() {
    try {
      this.account = await this.accounts.init();
    } catch (err) {
      this.account = null;
      this.pushToast(err instanceof Error ? err.message : 'Sign-in failed', 'bad');
    }
    if (this.account) await this.openAccount(this.account);
    else this.setScreen('title');
  }

  /** Guests start right away; Google/Discord redirect to the provider and come back to boot(). */
  async signIn(provider: AuthProviderId) {
    try {
      const account = await this.accounts.signIn(provider);
      if (!account) return; // redirecting
      this.account = account;
      await this.openAccount(account);
    } catch (err) {
      this.pushToast(err instanceof Error ? err.message : 'Sign-in failed', 'warn');
    }
  }

  async signOut() {
    await this.exit();
    await this.accounts.signOut();
    this.account = null;
    this.saves = null;
    this.sync = null;
    this.characters = [];
    this.setScreen('title');
  }

  private async openAccount(account: Account) {
    const supabase = getSupabase();
    if (account.provider !== 'guest' && supabase) {
      const cloud = new CloudSaveStore(supabaseCharacters(supabase), new LocalSaveStore(localStorage, `cloud-${account.id}`, false));
      cloud.onStatus = (st) => {
        this.sync = st;
        this.notify();
      };
      this.sync = cloud.status;
      this.saves = cloud;
      const guest = this.accounts.guestAccount();
      this.guestCharacters = guest ? await new LocalSaveStore(localStorage, guest.id, false).list() : [];
    } else {
      this.saves = new LocalSaveStore(localStorage, account.id);
      this.sync = null;
      this.guestCharacters = [];
    }
    await this.refreshCharacters();
    this.setScreen(this.characters.length || this.guestCharacters.length ? 'select' : 'create');
  }

  /** Move this browser's guest characters onto the signed-in account. */
  async adoptGuestCharacters() {
    const guest = this.accounts.guestAccount();
    if (!guest || !this.saves || this.account?.provider === 'guest') return;
    const moved = await moveCharacters(new LocalSaveStore(localStorage, guest.id, false), this.saves, this.characters.map((c) => c.name));
    this.guestCharacters = [];
    await this.refreshCharacters();
    this.pushToast(`Moved ${moved} character${moved === 1 ? '' : 's'} to your account`, 'good');
  }

  async refreshCharacters() {
    this.characters = this.saves ? await this.saves.list() : [];
    this.notify();
  }

  setScreen(screen: Screen) {
    this.screen = screen;
    this.notify();
  }

  nameTaken(name: string): boolean {
    return this.characters.some((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  }

  async create(name: string, classId: ClassId) {
    const s = newGame(Date.now(), { name: name.trim(), classId });
    await this.saves?.save(s);
    try {
      localStorage.removeItem('coe-page'); // new characters start in the hideout
    } catch {
      /* ignore */
    }
    this.showIntro = true;
    this.begin(s);
  }

  async enter(id: string) {
    const s = await this.saves?.load(id);
    if (!s) {
      this.pushToast('That character could not be loaded', 'bad');
      return;
    }
    this.begin(s);
    const away = Date.now() - s.lastSaved;
    if (away >= MIN_OFFLINE_MS) this.runOffline(away);
  }

  async removeCharacter(id: string) {
    await this.saves?.remove(id);
    await this.refreshCharacters();
    if (!this.characters.length) this.setScreen('create');
  }

  /** Save and leave the current character for the select screen. */
  async exit() {
    if (this.screen !== 'game') return;
    this.save();
    this.stopLoop();
    await this.refreshCharacters();
    this.setScreen('select');
  }

  dismissIntro() {
    this.showIntro = false;
    this.notify();
  }

  // ---------- the loop ----------

  private begin(s: GameState) {
    this.state = s;
    this.feed = [];
    this.xpLog = [];
    this.combatLog = [];
    this.lootLog = [];
    this.offline = null;
    this.screen = 'game';
    this.startLoop();
    this.notify();
  }

  private startLoop() {
    this.stopLoop();
    this.lastFrame = performance.now();
    this.lastSave = performance.now();
    const step = () => {
      const now = performance.now();
      const dt = now - this.lastFrame;
      this.lastFrame = now;
      this.baseCtx.now = Date.now();
      if (dt > BACKGROUND_MS) this.runOffline(dt);
      else tick(this.state, this.ctx, dt);
      if (now - this.lastNotify >= NOTIFY_MS) this.notify();
      if (now - this.lastSave >= AUTOSAVE_MS) this.save();
    };
    // setInterval keeps running (throttled) in background tabs, unlike requestAnimationFrame
    this.loop = setInterval(step, 50);
  }

  private stopLoop() {
    if (this.loop) clearInterval(this.loop);
    this.loop = null;
  }

  private runOffline(ms: number) {
    const hadAction = !!this.state.action;
    const sum = simulateOffline(this.state, this.ctx, ms);
    if (hadAction && sum.ms >= MIN_OFFLINE_MS) this.offline = sum;
    this.notify();
  }

  save() {
    if (this.screen !== 'game' || !this.saves) return;
    this.lastSave = performance.now();
    this.state.lastSaved = Date.now();
    this.saves.save(this.state).catch(() => {
      /* storage full or blocked: keep playing */
    });
  }

  /** Swap in a different state for the current session (import / reset). */
  replace(s: GameState) {
    this.begin(s);
    this.save();
  }

  /** XP per hour for a skill over the last 10 minutes of play this session. */
  xpPerHour(skill: SkillId): number {
    const since = Date.now() - 10 * 60_000;
    const recent = this.xpLog.filter((x) => x.skill === skill && x.at >= since);
    if (!recent.length) return 0;
    const span = Math.max(60_000, Date.now() - recent[0].at);
    return (recent.reduce((a, x) => a + x.amount, 0) / span) * 3600_000;
  }

  /** Tell the tutorial which page the player opened. */
  visitPage(page: string) {
    if (this.screen === 'game') this.act((s, ctx) => tutorialPage(s, ctx, page));
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  onGameEvent(fn: (e: GameEvent) => void) {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  notify() {
    this.lastNotify = performance.now();
    this.rev++;
    this.listeners.forEach((l) => l());
  }

  /** Run a state change; a returned string is shown as an error toast. */
  act<T>(fn: (s: GameState, ctx: Ctx) => T): T {
    const result = fn(this.state, this.ctx);
    if (typeof result === 'string' && result) this.pushToast(result, 'warn');
    this.notify();
    return result;
  }

  pushToast(text: string, tone: Toast['tone'] = 'info') {
    const t = { id: this.nextId++, text, tone };
    this.toasts = [...this.toasts.slice(-3), t];
    setTimeout(() => {
      this.toasts = this.toasts.filter((x) => x !== t);
      this.notify();
    }, 3200);
    this.notify();
  }

  dismissOffline() {
    this.offline = null;
    this.notify();
  }

  private addFeed(text: string, tone: FeedEntry['tone']) {
    this.feed = [{ id: this.nextId++, at: Date.now(), text, tone }, ...this.feed].slice(0, 40);
  }

  private log(text: string, tone: FeedEntry['tone'] = 'info') {
    this.combatLog = [{ id: this.nextId++, at: Date.now(), text, tone }, ...this.combatLog].slice(0, 60);
  }

  private onEvent(e: GameEvent) {
    this.eventListeners.forEach((l) => l(e));
    // sidebar logs
    switch (e.t) {
      case 'kill':
        this.log(`Slew ${e.name}`, e.boss ? 'good' : 'info');
        break;
      case 'spawn':
        this.log(e.boss ? `${e.name} appears!` : `Encountered ${e.name}`, e.boss ? 'warn' : 'info');
        break;
      case 'skill':
        if (e.manual) this.log(`You cast ${activeGemDef(e.gemId).name}`, 'magic');
        break;
      case 'interrupt':
        this.log(`Interrupted ${e.name}!`, 'good');
        break;
      case 'bossCast':
        this.log(`${e.name} winds up ${e.kind === 'nova' ? 'a nova' : 'a heavy blow'}`, 'warn');
        break;
      case 'bossPhase':
        this.log(`${e.name} ${e.text}`, 'warn');
        break;
      case 'flask':
        this.log(`${e.auto ? 'Auto-used' : 'Drank'} ${flaskDef(e.flaskId).name}`, 'info');
        break;
      case 'death':
        this.log('You were slain', 'bad');
        break;
      case 'gemLevel':
        this.addFeed(`${activeGemDef(e.gemId).name} reached gem level ${e.level}`, 'level');
        break;
      case 'loot':
        if (e.item || e.currencyId || e.gemId || e.supportId) {
          this.lootLog = [
            { id: this.nextId++, at: Date.now(), item: e.item, currencyId: e.currencyId, gemId: e.gemId, supportId: e.supportId, salvaged: e.salvaged },
            ...this.lootLog,
          ].slice(0, 80);
        }
        if (e.gemId) this.addFeed(`Found skill gem: ${activeGemDef(e.gemId).name}`, 'magic');
        if (e.supportId) this.addFeed(`Found support gem: ${supportGemDef(e.supportId).name}`, 'magic');
        break;
    }
    switch (e.t) {
      case 'levelup':
        this.addFeed(`${SKILLS[e.skill].name} reached level ${e.level}`, 'level');
        this.pushToast(`${SKILLS[e.skill].name} level ${e.level}!`, 'level');
        break;
      case 'loot':
        if (e.item && !e.salvaged && e.item.rarity !== 'normal' && e.item.rarity !== 'magic') {
          this.addFeed(`Found ${itemName(e.item)}`, e.item.rarity);
        }
        if (e.currencyId && ['chaos', 'exalted', 'divine', 'annul', 'instill', 'regal', 'alchemy'].includes(e.currencyId)) {
          this.addFeed(`Dropped ${e.currencyId}`, 'unique');
        }
        break;
      case 'kill':
        if (e.boss) this.addFeed(`Defeated ${e.name}!`, 'good');
        break;
      case 'death': {
        const lost = e.xpLost > 0 ? ` Lost ${Math.round(e.xpLost).toLocaleString()} XP.` : '';
        this.addFeed(`You were slain. Returned to the hideout.${lost}`, 'bad');
        this.pushToast(`You died${lost ? ` — lost ${Math.round(e.xpLost).toLocaleString()} XP` : ''}`, 'bad');
        break;
      }
      case 'xp':
        this.xpLog.push({ at: Date.now(), skill: e.skill, amount: e.amount });
        if (this.xpLog.length > 4000) this.xpLog = this.xpLog.slice(-2000);
        break;
      case 'zoneUnlocked': {
        const z = ZONES.find((x) => x.id === e.zoneId);
        this.addFeed(`New zone unlocked: ${z?.name}`, 'good');
        this.pushToast(`Unlocked ${z?.name}`, 'good');
        break;
      }
      case 'bossCast':
        this.addFeed(`${e.name} winds up ${e.kind === 'nova' ? 'a nova' : 'a heavy blow'}!`, 'warn');
        break;
      case 'actComplete':
        this.addFeed(`Act ${e.act} complete! More of the world opens in a future update.`, 'good');
        this.pushToast(`Act ${e.act} complete!`, 'good');
        break;
      case 'tutorialStep': {
        const step = TUTORIAL_STEPS[e.step];
        this.addFeed(`Quest complete: ${step.title}${step.rewardText ? ` — ${step.rewardText}` : ''}`, 'good');
        this.pushToast(e.done ? 'Tutorial complete! Follow the coast — the Drowned Queen waits at its end.' : `Quest complete: ${step.title}`, 'good');
        break;
      }
      case 'achievement': {
        const a = ACHIEVEMENT_BY_ID[e.id];
        const recipes = BENCH_CRAFTS.filter((b) => b.achievement === e.id).length;
        const extra = recipes ? ` — ${recipes} bench recipe${recipes > 1 ? 's' : ''} unlocked` : '';
        this.addFeed(`Achievement: ${a.name}${extra}`, 'good');
        this.pushToast(`Achievement unlocked: ${a.name}`, 'good');
        break;
      }
      case 'info':
        this.addFeed(e.text, e.tone ?? 'info');
        if (e.tone === 'warn') this.pushToast(e.text, 'warn');
        break;
    }
  }
}

export const game = new GameStore();

/** Re-render on every store notification and return the (mutable) state. */
export function useGame(): GameState {
  useSyncExternalStore(game.subscribe, () => game.rev);
  return game.state;
}

export function useGameEvent(fn: (e: GameEvent) => void) {
  useEffect(() => {
    const off = game.onGameEvent(fn);
    return () => {
      off();
    };
  }, [fn]);
}
