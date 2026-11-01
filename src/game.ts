import { ACHIEVEMENT_BY_ID } from './data/achievements';
import { BENCH_CRAFTS } from './data/hideout';
import { useEffect, useSyncExternalStore } from 'react';
import { flaskDef } from './data/flasks';
import { SKILLS } from './data/skills';
import { ACTS, actOpen, ZONES } from './data/zones';
import type { Ctx } from './engine/context';
import { itemName } from './engine/items';
import { alignWarTable, freshAccount, settleCharacter } from './engine/account';
import { MIN_OFFLINE_MS, simulateOffline, type OfflineSummary } from './engine/offline';
import { mathRng } from './engine/rng';
import type { ClassId } from './data/classes';
import { TUTORIAL_STEPS } from './data/tutorial';
import { serializeBundle } from './engine/save';
import { newGame, tick } from './engine/state';
import { tutorialPage, withTutorial } from './engine/tutorial';
import { AppAccounts, isCloudAccount, type Account, type AuthProviderId } from './platform/accounts';
import { reportError, setErrorUser } from './platform/errors';
import { MAPS_PREVIEW } from './engine/maps';
import { checkAdmin } from './platform/feedback';
import { fetchEventRows, saveEventRow } from './platform/events';
import { activeEvents, eventBoost, type EventRow, type LiveEvent } from './data/events';
import { getSupabase } from './platform/supabase';
import { supabaseCharacters } from './platform/supabaseTable';
import {
  adoptDemo,
  CloudSaveStore,
  DEMO_PENDING_KEY,
  hasGuestProgress,
  LocalSaveStore,
  MemorySaveStore,
  moveCharacters,
  type CharacterSummary,
  type SaveStore,
  type SyncStatus,
} from './platform/saves';
import type { AccountState, GameEvent, GameState, Item, SkillId } from './engine/types';
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

/** How often an open game asks whether events changed, and how often it checks the clock against their schedules. */
const EVENT_FETCH_MS = 5 * 60 * 1000;
const EVENT_CHECK_MS = 30 * 1000;
/** XP per hour readouts update this often. */
const XP_RATE_HOLD_MS = 2000;

class GameStore {
  state: GameState;
  screen: Screen = 'boot';
  account: Account | null = null;
  /** listed in the `admins` table: sees the Admin page */
  isAdmin = false;
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
  private xpRates = new Map<SkillId, { at: number; rate: number }>();
  readonly accounts = new AppAccounts(localStorage, getSupabase());
  private saves: SaveStore | null = null;
  /** the shared hideout, stash and unlocks; every character played on this account holds this same object */
  realm: AccountState = freshAccount();
  /** the account as last written, to tell when it has changed */
  private savedRealm = '';
  /** cloud sync state while signed in */
  sync: SyncStatus | null = null;
  /** characters saved as a guest on this browser, offered for moving to a signed-in account */
  guestCharacters: CharacterSummary[] = [];
  /** this browser has guest characters, so the title offers them instead of the demo */
  hasGuest = false;
  /** the account form is open over a running demo */
  showAccountForm = false;
  /** arrived from a password reset email */
  showNewPassword = false;
  private listeners = new Set<() => void>();
  private eventListeners = new Set<(e: GameEvent) => void>();
  private nextId = 1;
  private lastFrame = 0;
  private lastNotify = 0;
  private lastSave = 0;
  /** a failing save is reported once per session, not on every autosave */
  private saveErrorReported = false;
  private loop: ReturnType<typeof setInterval> | null = null;
  /** every event's switch and schedule, set from the Admin page */
  eventRows: EventRow[] = [];
  /** the limited-time events running right now */
  liveEvents: LiveEvent[] = [];
  private baseCtx: Ctx;
  readonly ctx: Ctx;

  constructor() {
    this.state = newGame();
    this.baseCtx = { rng: mathRng, now: Date.now(), emit: (e) => this.onEvent(e) };
    this.ctx = withTutorial(this.baseCtx, () => this.state);
    window.addEventListener('beforeunload', () => this.save());
    window.addEventListener('storage', (e) => this.onOtherTab(e));
    void this.refreshEvents();
    setInterval(() => void this.refreshEvents(), EVENT_FETCH_MS);
    // a scheduled event starts and ends on time between fetches
    setInterval(() => this.applyEvents(), EVENT_CHECK_MS);
  }

  private applyEvents() {
    const live = activeEvents(this.eventRows, Date.now());
    const changed = live.length !== this.liveEvents.length || live.some((e, i) => e !== this.liveEvents[i]);
    this.liveEvents = live;
    this.baseCtx.event = eventBoost(live);
    if (changed) this.notify();
  }

  /** A failed read keeps what we knew, so a dropped connection doesn't end an event. */
  async refreshEvents() {
    this.eventRows = (await fetchEventRows()) ?? this.eventRows;
    this.applyEvents();
  }

  /** Admins only: the database refuses anyone else. */
  async saveEvent(row: EventRow) {
    await saveEventRow(row);
    this.eventRows = [...this.eventRows.filter((r) => r.id !== row.id), row];
    this.applyEvents();
    this.notify();
  }

  // ---------- account & characters ----------

  async boot() {
    try {
      this.account = await this.accounts.init();
    } catch (err) {
      this.account = null;
      this.pushToast(err instanceof Error ? err.message : 'Sign-in failed', 'bad');
    }
    await this.checkGuestProgress();
    // a guest with nothing saved is a new player: they get the title and the demo
    if (this.account?.provider === 'guest' && !this.hasGuest) {
      await this.accounts.signOut();
      this.account = null;
    }
    this.showNewPassword = this.accounts.recovering;
    if (this.account) await this.openAccount(this.account);
    else this.setScreen('title');
  }

  private async checkGuestProgress() {
    this.hasGuest = await hasGuestProgress(localStorage, this.accounts.guestAccount()?.id);
  }

  /** Demos and guests start right away; Google/Discord redirect to the provider and come back to boot(). */
  async signIn(provider: AuthProviderId) {
    try {
      if (provider === 'demo') localStorage.removeItem(DEMO_PENDING_KEY);
      this.stashDemo();
      const account = await this.accounts.signIn(provider);
      if (!account) return; // redirecting
      await this.switchTo(account);
    } catch (err) {
      localStorage.removeItem(DEMO_PENDING_KEY);
      this.pushToast(err instanceof Error ? err.message : 'Sign-in failed', 'warn');
    }
  }

  /** Throws for the form to show. Resolves to false when the address must be confirmed first. */
  async signUpWithEmail(name: string, email: string, password: string): Promise<boolean> {
    this.stashDemo();
    try {
      const account = await this.accounts.signUpWithEmail(name, email, password);
      if (account) await this.switchTo(account);
      return !!account;
    } catch (err) {
      localStorage.removeItem(DEMO_PENDING_KEY);
      throw err;
    }
  }

  /** Throws for the form to show. */
  async signInWithEmail(email: string, password: string) {
    this.stashDemo();
    try {
      await this.switchTo(await this.accounts.signInWithEmail(email, password));
    } catch (err) {
      localStorage.removeItem(DEMO_PENDING_KEY);
      throw err;
    }
  }

  async updatePassword(password: string) {
    await this.accounts.updatePassword(password);
    this.showNewPassword = false;
    this.pushToast('Password changed', 'good');
    this.notify();
  }

  setAccountForm(open: boolean) {
    this.showAccountForm = open;
    this.notify();
  }

  dismissNewPassword() {
    this.showNewPassword = false;
    this.notify();
  }

  /** Keep the demo running in this tab for the account that's about to open. */
  private stashDemo() {
    if (this.account?.provider !== 'demo' || this.screen !== 'game') return;
    this.state.lastSaved = Date.now();
    localStorage.setItem(DEMO_PENDING_KEY, serializeBundle(this.state));
  }

  private async switchTo(account: Account) {
    this.stopLoop();
    this.showAccountForm = false;
    this.account = account;
    await this.openAccount(account);
  }

  async signOut() {
    await this.exit();
    await this.accounts.signOut();
    this.account = null;
    this.setAdmin(false);
    setErrorUser(null);
    this.saves = null;
    this.sync = null;
    this.characters = [];
    await this.checkGuestProgress();
    this.setScreen('title');
  }

  /** Admins also get the dev-only Maps preview on the live site. */
  private setAdmin(yes: boolean) {
    this.isAdmin = yes;
    MAPS_PREVIEW.enabled = yes || !!import.meta.env.DEV;
  }

  private async openAccount(account: Account) {
    const supabase = getSupabase();
    setErrorUser(account.id);
    this.setAdmin(false);
    if (account.provider === 'demo') {
      this.saves = new MemorySaveStore();
      this.sync = null;
      this.guestCharacters = [];
    } else if (isCloudAccount(account) && supabase) {
      void checkAdmin().then((yes) => {
        this.setAdmin(yes && this.account?.id === account.id);
        this.notify();
      });
      const cloud = new CloudSaveStore(supabaseCharacters(supabase), new LocalSaveStore(localStorage, `cloud-${account.id}`, false), account.id);
      cloud.onStatus = (st) => {
        this.sync = st;
        this.notify();
      };
      this.sync = cloud.status;
      this.saves = cloud;
      const guest = this.accounts.guestAccount();
      this.guestCharacters = guest ? await new LocalSaveStore(localStorage, guest.id, false).list() : [];
      const adopted = await this.adoptPendingDemo();
      if (adopted) {
        await this.openRealm();
        await this.enter(adopted);
        return;
      }
    } else {
      this.saves = new LocalSaveStore(localStorage, account.id);
      this.sync = null;
      this.guestCharacters = [];
    }
    await this.openRealm();
    this.setScreen(this.characters.length || this.guestCharacters.length ? 'select' : 'create');
  }

  /** Load the shared account and fold in any character that hasn't handed its hideout and stash over yet. */
  private async openRealm() {
    const saves = this.saves!;
    this.adoptRealm((await saves.loadAccount()) ?? freshAccount());
    await this.refreshCharacters();
    let merged = 0;
    for (const c of this.characters) {
      if (c.settled) continue;
      const s = await saves.load(c.id);
      if (!s) continue;
      if (settleCharacter(s, this.realm)) {
        merged++;
        // the account first: if the character's save fails, it is marked absorbed and simply settles again
        this.realm.rev += 1;
        await saves.saveAccount(this.realm);
      }
      await saves.save(s);
    }
    this.markRealmSaved();
    await this.refreshCharacters();
    if (merged) {
      const spilled = this.realm.overflow.length;
      this.pushToast(spilled ? `Your characters now share a stash: ${spilled} item${spilled === 1 ? '' : 's'} waiting in its overflow` : 'Your characters now share a hideout and stash', 'good');
    }
  }

  private adoptRealm(a: AccountState) {
    alignWarTable(a);
    this.realm = a;
    this.markRealmSaved();
  }

  private realmJson(): string {
    return JSON.stringify({ ...this.realm, rev: 0 });
  }

  private markRealmSaved() {
    this.savedRealm = this.realmJson();
  }

  /** Written whenever it changes, not with every autosave, so an idle tab can't overwrite newer stash changes. */
  private saveRealm() {
    if (!this.saves || this.realmJson() === this.savedRealm) return;
    this.realm.rev += 1;
    this.markRealmSaved();
    this.saves.saveAccount(this.realm).catch((err) => reportError(err, { where: 'saveAccount' }));
  }

  /** Another tab changed the shared account: use its copy. */
  private onOtherTab(e: StorageEvent) {
    if (!e.newValue || !e.key?.endsWith('-account-standard') || !this.saves) return;
    const theirs = JSON.parse(e.newValue) as AccountState;
    if (theirs.id !== this.realm.id || theirs.rev <= this.realm.rev) return;
    Object.assign(this.realm, theirs);
    this.markRealmSaved();
    this.notify();
  }

  /** Bring the demo stashed at sign-up onto this account. */
  private async adoptPendingDemo(): Promise<string | null> {
    const raw = localStorage.getItem(DEMO_PENDING_KEY);
    if (!raw || !this.saves) return null;
    try {
      const id = await adoptDemo(raw, this.saves);
      this.pushToast('Your demo character is now saved to your account', 'good');
      return id;
    } catch (err) {
      reportError(err, { where: 'adoptPendingDemo' });
      return null;
    } finally {
      localStorage.removeItem(DEMO_PENDING_KEY);
    }
  }

  /** Move this browser's guest characters onto the signed-in account. */
  async adoptGuestCharacters() {
    const guest = this.accounts.guestAccount();
    if (!guest || !this.saves || !isCloudAccount(this.account)) return;
    const moved = await moveCharacters(new LocalSaveStore(localStorage, guest.id, false), this.saves, this.characters.map((c) => c.name));
    this.guestCharacters = [];
    await this.openRealm();
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

  /** The Exile unlocks once any character on the account has finished the campaign. */
  get exileUnlocked(): boolean {
    return this.realm.exileUnlocked;
  }

  async create(name: string, classId: ClassId, startNode?: string) {
    const s = newGame(Date.now(), { name: name.trim(), classId, startNode }, this.realm);
    await this.saves?.save(s);
    this.showIntro = true;
    this.begin(s);
  }

  async enter(id: string) {
    const s = await this.saves?.load(id);
    if (!s) {
      this.pushToast('That character could not be loaded', 'bad');
      return;
    }
    // another device may have changed the account since it was opened
    const latest = await this.saves?.loadAccount();
    if (latest && latest.rev > this.realm.rev) this.adoptRealm(latest);
    this.attach(s);
    this.begin(s);
    const away = Date.now() - s.lastSaved;
    if (away >= MIN_OFFLINE_MS) {
      await this.refreshEvents();
      this.runOffline(away);
    }
  }

  async removeCharacter(id: string) {
    await this.saves?.remove(id);
    await this.refreshCharacters();
    if (!this.characters.length) this.setScreen('create');
  }

  private attach(s: GameState) {
    s.account = this.realm;
    settleCharacter(s, this.realm);
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
    this.xpRates.clear();
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

  /** Dev: pretend this much time passed away from the game. */
  simulateAway(ms: number) {
    this.runOffline(ms);
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
    this.saves.save(this.state).catch((err) => {
      // storage full or blocked: keep playing
      if (this.saveErrorReported) return;
      this.saveErrorReported = true;
      reportError(err, { where: 'save' });
    });
    this.saveRealm();
  }

  /** Swap in a different state for the current session (import / reset). */
  replace(s: GameState) {
    this.attach(s);
    this.begin(s);
    this.save();
  }

  /** XP per hour for a skill over the last 10 minutes of play this session. */
  /** The rate over the last 10 minutes, held for a moment so the readout doesn't change on every gain. */
  xpPerHour(skill: SkillId): number {
    const held = this.xpRates.get(skill);
    if (held && Date.now() - held.at < XP_RATE_HOLD_MS) return held.rate;
    const rate = this.measureXpRate(skill);
    this.xpRates.set(skill, { at: Date.now(), rate });
    return rate;
  }

  private measureXpRate(skill: SkillId): number {
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
    // the stash and the bag have to be written together, or a crash could lose or copy an item
    if (this.screen === 'game' && this.realmJson() !== this.savedRealm) this.save();
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
        this.log(`${e.name} winds up ${e.skill} (${e.kind === 'nova' ? 'nova' : 'heavy blow'})`, 'warn');
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
        this.addFeed(`${e.name} winds up ${e.skill}!`, 'warn');
        break;
      case 'actComplete': {
        const next = ACTS.find((a) => a.n === e.act + 1);
        this.addFeed(
          next && actOpen(next.n) ? `Act ${e.act} complete! Act ${next.n}, ${next.name}, is open.` : `Act ${e.act} complete! More of the world opens in a future update.`,
          'good',
        );
        this.pushToast(`Act ${e.act} complete!`, 'good');
        break;
      }
      case 'trialPassed': {
        const text = e.n === 1 ? 'Trial passed! Choose your ascendancy on the Passive Tree page.' : 'Trial passed! More of your ascendancy opens.';
        this.addFeed(text, 'good');
        this.pushToast(text, 'good');
        break;
      }
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
      case 'craftDone':
        this.addFeed(e.text, 'good');
        this.pushToast(e.text, 'good');
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
