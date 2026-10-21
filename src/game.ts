import { useEffect, useSyncExternalStore } from 'react';
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
import { LocalAccounts, type Account, type AccountProvider, type AuthProviderId } from './platform/accounts';
import { LocalSaveStore, type CharacterSummary, type SaveStore } from './platform/saves';
import type { GameEvent, GameState } from './engine/types';

export interface FeedEntry {
  id: number;
  at: number;
  text: string;
  tone: 'info' | 'good' | 'warn' | 'bad' | 'magic' | 'rare' | 'unique' | 'level';
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
  toasts: Toast[] = [];
  offline: OfflineSummary | null = null;
  readonly accounts: AccountProvider = new LocalAccounts(localStorage);
  private saves: SaveStore | null = null;
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
    this.account = this.accounts.current();
    if (this.account) await this.openAccount(this.account);
    else this.setScreen('title');
  }

  async signIn(provider: AuthProviderId) {
    try {
      this.account = await this.accounts.signIn(provider);
      await this.openAccount(this.account);
    } catch (err) {
      this.pushToast(err instanceof Error ? err.message : 'Sign-in failed', 'warn');
    }
  }

  async signOut() {
    await this.exit();
    await this.accounts.signOut();
    this.setScreen('title');
  }

  private async openAccount(account: Account) {
    this.saves = new LocalSaveStore(localStorage, account.id);
    await this.refreshCharacters();
    this.setScreen(this.characters.length ? 'select' : 'create');
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

  private onEvent(e: GameEvent) {
    this.eventListeners.forEach((l) => l(e));
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
      case 'death':
        this.addFeed('You were slain. Returned to the hideout.', 'bad');
        this.pushToast('You died — back to the hideout', 'bad');
        break;
      case 'zoneUnlocked': {
        const z = ZONES.find((x) => x.id === e.zoneId);
        this.addFeed(`New zone unlocked: ${z?.name}`, 'good');
        this.pushToast(`Unlocked ${z?.name}`, 'good');
        break;
      }
      case 'bossCast':
        this.addFeed(`${e.name} winds up a heavy blow!`, 'warn');
        break;
      case 'tutorialStep': {
        const step = TUTORIAL_STEPS[e.step];
        this.addFeed(`Quest complete: ${step.title}${step.rewardText ? ` — ${step.rewardText}` : ''}`, 'good');
        this.pushToast(e.done ? 'Tutorial complete! The wilds are yours.' : `Quest complete: ${step.title}`, 'good');
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
