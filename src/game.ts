import { ACHIEVEMENT_BY_ID } from './data/achievements';
import { TRIALS } from './data/ascendancies';
import { uniqueDef } from './data/bases';
import { useEffect, useSyncExternalStore } from 'react';
import { perkText, settleAchievements } from './engine/achievements';
import { flaskDef } from './data/flasks';
import { SKILLS } from './data/skills';
import { ACTS, actOpen, ZONES } from './data/zones';
import { FINAL_ACT } from './engine/hideout';
import type { Ctx } from './engine/context';
import { itemName } from './engine/items';
import { alignWarTable, fillAccount, freshAccount, giveKeepsake, mergeAccounts, settleCharacter } from './engine/account';
import { realmFor, realmOf, soloRealm, STANDARD_REALM } from './engine/challenge';
import { characterLevel } from './engine/character';
import { mergeOffline, MIN_OFFLINE_MS, startOffline, type OfflineRun, type OfflineSummary } from './engine/offline';
import { mathRng } from './engine/rng';
import type { ClassId } from './data/classes';
import { rewardText, TUTORIAL_STEPS } from './data/tutorial';
import { serializeBundle } from './engine/save';
import { newCharacterId, newGame, tick } from './engine/state';
import { tutorialPage, withTutorial } from './engine/tutorial';
import { AppAccounts, isCloudAccount, type Account, type AuthProviderId } from './platform/accounts';
import { reportError, setErrorUser } from './platform/errors';
import { MAPS_PREVIEW } from './engine/maps';
import { checkAdmin } from './platform/feedback';
import { readAdminMail, recordDemo, sandboxState, type AdminMail } from './platform/admin';
import { fetchEventRows, saveEventRow } from './platform/events';
import { activeEvents, eventBoost, type EventRow, type LiveEvent } from './data/events';
import { getSupabase } from './platform/supabase';
import { supabaseCharacters } from './platform/supabaseTable';
import { errorText } from './platform/feedback';
import { isRefusal, marketApi, marketStandIn, type MarketApi, type MarketMode } from './platform/market';
import { holdItem, holdPayment, MARKET_UNLOCK_BOSS, marketHold, receiveDeliveries, releaseHold } from './engine/market';
import { TabClaims } from './platform/tabClaims';
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
import type { AccountState, ChallengeFlags, GameEvent, GameState, Item, Realm, SkillId } from './engine/types';
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
/** How often to look for another device's copy of the account. */
const ACCOUNT_PULL_MS = 30_000;
/** frames further apart than this (tab hidden, laptop asleep) are treated as offline time */
const BACKGROUND_MS = 5 * 60_000;
/** how long each slice of a catch-up on time away runs before the page gets a frame */
const CATCH_UP_SLICE_MS = 30;

/** Run `fn` as soon as the page has had a chance to draw. A message channel isn't slowed down in a background tab the way timers are. */
const nextSlice: (fn: () => void) => void = (() => {
  if (typeof MessageChannel === 'undefined') return (fn: () => void) => void setTimeout(fn, 0);
  const channel = new MessageChannel();
  const queue: (() => void)[] = [];
  channel.port1.onmessage = () => queue.shift()?.();
  return (fn: () => void) => {
    queue.push(fn);
    channel.port2.postMessage(null);
  };
})();

export type Screen = 'boot' | 'title' | 'menu' | 'select' | 'create' | 'game' | 'fallen';

/** The last word on a Hardcore character, shown after its save is gone. */
export interface FallenCharacter {
  name: string;
  classId: ClassId;
  level: number;
  challenge?: ChallengeFlags;
  zoneId: string | null;
  offline: boolean;
}

/** How often an open game asks whether events changed, and how often it checks the clock against their schedules. */
const EVENT_FETCH_MS = 5 * 60 * 1000;
const EVENT_CHECK_MS = 30 * 1000;
/** XP per hour readouts update this often. */
const XP_RATE_HOLD_MS = 2000;

class GameStore {
  state: GameState;
  sandbox = false;
  adminMail: AdminMail[] = [];
  private sandboxReturn: { saves: SaveStore | null; state: GameState; realm: AccountState } | null = null;
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
  /** a long catch-up on time away, running in slices */
  private catchUp: OfflineRun | null = null;
  private catchUpListeners = new Set<() => void>();
  /** recent xp gains, for the xp/hour readout */
  xpLog: { at: number; skill: SkillId; amount: number }[] = [];
  private xpRates = new Map<SkillId, { at: number; rate: number }>();
  readonly accounts = new AppAccounts(localStorage, getSupabase());
  private saves: SaveStore | null = null;
  private tabs = new TabClaims((id, stale) => this.releaseCharacter(id, stale));
  /** the Hardcore character that just died */
  fallen: FallenCharacter | null = null;
  /** the shared hideout, Stash tabs and unlocks: the character's own realm in play, the standard one on every other screen */
  realm: AccountState = freshAccount();
  /** the account as last written, to tell when it has changed */
  private savedRealm = '';
  /** the same, leaving out the bank */
  private savedShelves = '';
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
  private lastPull = 0;
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
    setInterval(() => void this.refreshAdminMail(), 60000);
    // a scheduled event starts and ends on time between fetches
    setInterval(() => this.applyEvents(), EVENT_CHECK_MS);
  }

  private applyEvents() {
    const live = activeEvents(this.eventRows, Date.now());
    const changed = JSON.stringify(live) !== JSON.stringify(this.liveEvents);
    this.liveEvents = live;
    this.baseCtx.event = eventBoost(live);
    this.baseCtx.eventRows = this.eventRows;
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
    if (this.sandbox) await this.exit();
    await this.exit();
    await this.accounts.signOut();
    this.account = null;
    this.adminMail = [];
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
    this.adminMail = [];
    const supabase = getSupabase();
    setErrorUser(account.id);
    this.setAdmin(false);
    if (account.provider === 'demo') {
      void recordDemo('demo_started');
      this.saves = new MemorySaveStore();
      this.sync = null;
      this.guestCharacters = [];
    } else if (isCloudAccount(account) && supabase) {
      void this.refreshAdminMail();
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
    // a signed-in player sees their account and presses Play; a demo has no account to show
    this.setScreen(account.provider === 'demo' ? (this.characters.length ? 'select' : 'create') : 'menu');
  }

  /** From the account screen: on to the characters, or straight to making one. */
  play() {
    this.setScreen(this.characters.length || this.guestCharacters.length ? 'select' : 'create');
  }

  /** Load the shared account and fold in any character that hasn't handed its hideout and stash over yet. */
  private async openRealm() {
    const saves = this.saves!;
    this.adoptRealm((await saves.loadAccount()) ?? freshAccount());
    await this.refreshCharacters();
    let merged = 0;
    for (const c of this.characters) {
      if (c.handedOver) continue;
      const s = await saves.load(c.id);
      if (!s) continue;
      const realm = realmOf(s.character);
      const home = realm === STANDARD_REALM ? this.realm : ((await saves.loadAccount(realm)) ?? freshAccount(realm));
      if (settleCharacter(s, home)) {
        merged++;
        // the account first: if the character's save fails, it is marked absorbed and simply settles again
        home.rev += 1;
        await saves.saveAccount(home);
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

  private async switchRealm(realm: Realm) {
    if (this.realm.realm === realm || !this.saves) return;
    this.adoptRealm((await this.saves.loadAccount(realm)) ?? freshAccount(realm));
  }

  /** Finishing the campaign in a challenge mode opens the Exile for the whole account. */
  private async carryExile() {
    const home = this.saves && ((await this.saves.loadAccount()) ?? freshAccount());
    if (!home || home.exileUnlocked) return;
    home.exileUnlocked = true;
    home.rev += 1;
    await this.saves!.saveAccount(home);
  }

  private realmJson(a = this.realm): string {
    return JSON.stringify({ ...a, rev: 0 });
  }

  /** Everything but the bank, which changes too often to be worth a save of its own. */
  private shelvesJson(a = this.realm): string {
    return JSON.stringify({ ...a, rev: 0, bank: undefined });
  }

  private markRealmSaved(a = this.realm) {
    this.savedRealm = this.realmJson(a);
    this.savedShelves = this.shelvesJson(a);
  }

  /** Another copy of the account is ahead of this one: take it, keeping what changed here since the last save. */
  private mergeRealm(theirs: AccountState | null) {
    if (!theirs || theirs.id !== this.realm.id || theirs.rev <= this.realm.rev) return;
    mergeAccounts(this.realm, JSON.parse(this.savedRealm) as AccountState, theirs);
    this.realm.rev = theirs.rev;
    this.markRealmSaved(theirs);
  }

  /** Written whenever it changes, not with every autosave, so an idle tab can't overwrite newer stash changes. */
  private saveRealm() {
    if (!this.saves) return;
    this.mergeRealm(this.saves.peekAccount(this.realm.realm));
    if (this.realmJson() === this.savedRealm) return;
    this.realm.rev += 1;
    this.markRealmSaved();
    this.saves.saveAccount(this.realm).catch((err) => reportError(err, { where: 'saveAccount' }));
    if (this.realm.realm !== STANDARD_REALM && this.realm.exileUnlocked) void this.carryExile();
  }

  /** Another tab changed the shared account: use its copy. */
  private onOtherTab(e: StorageEvent) {
    if (this.sandbox) return;
    if (!e.newValue || !e.key?.endsWith(`-account-${this.realm.realm}`) || !this.saves) return;
    this.mergeRealm(fillAccount(JSON.parse(e.newValue) as AccountState));
    this.notify();
  }

  /** Bring the demo stashed at sign-up onto this account. */
  private async adoptPendingDemo(): Promise<string | null> {
    const raw = localStorage.getItem(DEMO_PENDING_KEY);
    if (!raw || !this.saves) return null;
    try {
      const id = await adoptDemo(raw, this.saves);
      void recordDemo('demo_converted_to_account');
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

  async create(name: string, classId: ClassId, startNode?: string, challenge: ChallengeFlags = {}) {
    const id = newCharacterId();
    await this.switchRealm(realmFor(challenge, id));
    const s = newGame(Date.now(), { id, name: name.trim(), classId, startNode, challenge }, this.realm);
    await this.saves?.save(s);
    this.showIntro = true;
    this.begin(s);
  }

  async enter(id: string) {
    // first, so the load below sees what the other tab saved on its way out
    await this.tabs.claim(id);
    const s = await this.saves?.load(id);
    if (!s) {
      this.pushToast('That character could not be loaded', 'bad');
      return;
    }
    // it died, but deleting it never finished (no connection, say)
    if (s.fallen) {
      this.mourn(s);
      await this.forget(s);
      await this.refreshCharacters();
      return;
    }
    await this.switchRealm(realmOf(s.character));
    // another device may have changed the account since it was opened
    const latest = await this.saves?.loadAccount(this.realm.realm);
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
    const realm = this.characters.find((c) => c.id === id)?.realm;
    await this.saves?.remove(id);
    if (realm && soloRealm(realm)) await this.saves?.removeAccount(realm);
    await this.refreshCharacters();
    if (!this.characters.length) this.setScreen('create');
  }

  /** Hardcore: the character is gone, with its bag and gear. A Solo Self-Found one takes its stash and hideout too. */
  private async forget(s: GameState) {
    const realm = realmOf(s.character);
    try {
      // the fallen mark first: if the delete fails, the next attempt to play it finishes the job
      await this.saves?.save(s);
      await this.saves?.remove(s.character.id);
      if (soloRealm(realm)) await this.saves?.removeAccount(realm);
    } catch (err) {
      reportError(err, { where: 'forget' });
    }
  }

  private mourn(s: GameState) {
    const { name, classId, challenge } = s.character;
    this.fallen = { name, classId, challenge, level: characterLevel(s), zoneId: s.fallen!.zoneId, offline: s.fallen!.offline };
    this.setScreen('fallen');
  }

  private async bury(s: GameState) {
    this.stopLoop();
    if (this.sandbox) {
      delete s.fallen;
      s.life = Math.max(1, s.life);
      this.pushToast('Sandbox character died. Real saves are unchanged; exit the sandbox when finished.', 'warn');
      this.notify();
      return;
    }
    s.lastSaved = Date.now();
    this.saveRealm();
    this.mourn(s);
    await this.forget(s);
    await this.switchRealm(STANDARD_REALM);
    await this.refreshCharacters();
  }

  dismissFallen() {
    this.fallen = null;
    this.setScreen(this.characters.length ? 'select' : 'create');
  }

  private attach(s: GameState) {
    s.account = this.realm;
    settleCharacter(s, this.realm);
    if (giveKeepsake(s)) this.pushToast('Skill gems were re-sorted, so early leech moved. The Old Covenant is in your bag to make up for it.', 'good');
    // achievements added since this character last played, which it already meets, come with their rewards now
    const earned = settleAchievements(s);
    if (earned.length === 1) this.pushToast(`Achievement unlocked: ${ACHIEVEMENT_BY_ID[earned[0]].name}`, 'good');
    else if (earned.length > 1) this.pushToast(`${earned.length} achievements unlocked from your progress so far. See Achievements for their rewards.`, 'good');
  }

  /** Save and leave the current character for the select screen. */
  async exit() {
    if (this.sandboxReturn) {
      this.stopLoop();
      const original = this.sandboxReturn;
      this.sandboxReturn = null;
      this.sandbox = false;
      this.saves = original.saves;
      this.adoptRealm(original.realm);
      this.begin(original.state);
      this.pushToast('Returned to your character', 'info');
      return;
    }
    if (this.screen !== 'game') return;
    this.save();
    this.stopLoop();
    await this.switchRealm(STANDARD_REALM);
    await this.refreshCharacters();
    this.setScreen('select');
  }

  /** Another tab opened this character: back to the select screen, so only that tab plays and saves it. */
  private releaseCharacter(id: string, stale: boolean): boolean {
    if (this.screen !== 'game' || this.state.character.id !== id) return false;
    if (!stale) this.save();
    this.stopLoop();
    this.setScreen('select');
    this.pushToast('This character was opened in another tab', 'warn');
    void this.switchRealm(STANDARD_REALM).then(() => this.refreshCharacters());
    return true;
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
    // a catch-up still running for the character being left is dropped (its save was kept as it was)
    this.catchUp = null;
    this.screen = 'game';
    this.startLoop();
    this.notify();
    void this.marketSync();
  }

  // ---------- Player Market ----------

  /** Signed in and past Act 1 in this realm, or why not. The server checks all of this too. */
  get marketAccess(): 'solo' | 'guest' | 'locked' | 'open' {
    if (this.sandbox) return 'solo';
    const realm = this.realm.realm;
    if (soloRealm(realm)) return 'solo';
    if (!marketStandIn() && !isCloudAccount(this.account)) return 'guest';
    const cleared = this.state.bossesDefeated.includes(MARKET_UNLOCK_BOSS) || this.characters.some((c) => c.act1Cleared && (c.realm ?? STANDARD_REALM) === realm);
    return cleared ? 'open' : 'locked';
  }

  private marketTrader(): MarketApi | null {
    const access = this.marketAccess;
    return access === 'guest' || access === 'solo' ? null : marketApi(this.realm.realm);
  }

  /** Steps waiting on the server, in this tab: marketSync leaves these alone. */
  private marketInFlight = new Set<string>();

  /** Send a step that has already taken something from the player. Returns why it failed, if it did. */
  private async marketSend(op: string, send: () => Promise<void>): Promise<string | null> {
    this.marketInFlight.add(op);
    try {
      await send();
      this.act((s) => releaseHold(s, op, false));
      await this.marketCollect();
      return null;
    } catch (err) {
      if (isRefusal(err)) {
        this.act((s) => releaseHold(s, op, true));
        return errorText(err);
      }
      return `Couldn't reach the market. What you sent is safe and will be sorted out when it's back.`;
    } finally {
      this.marketInFlight.delete(op);
    }
  }

  async marketList(uid: number, mode: MarketMode, currency: string, price: number): Promise<string | null> {
    const api = this.marketTrader();
    if (!api) return 'Sign in to use the market';
    const op = crypto.randomUUID();
    const why = holdItem(this.state, op, uid);
    if (why) return why;
    this.save();
    this.notify();
    return this.marketSend(op, () => api.list(op, marketHold(this.state, op)!.item!, mode, currency, price));
  }

  private async marketPay(currency: string, amount: number, send: (api: MarketApi, op: string) => Promise<void>): Promise<string | null> {
    const api = this.marketTrader();
    if (!api) return 'Sign in to use the market';
    const op = crypto.randomUUID();
    const why = holdPayment(this.state, op, currency, amount);
    if (why) return why;
    this.save();
    this.notify();
    return this.marketSend(op, () => send(api, op));
  }

  marketBuy(id: number, currency: string, amount: number) {
    return this.marketPay(currency, amount, (api, op) => api.buy(op, id, currency, amount));
  }

  marketBid(id: number, currency: string, amount: number) {
    return this.marketPay(currency, amount, (api, op) => api.bid(op, id, currency, amount));
  }

  async marketCancel(id: number): Promise<string | null> {
    const api = this.marketTrader();
    if (!api) return 'Sign in to use the market';
    try {
      await api.cancel(id);
      await this.marketCollect();
      return null;
    } catch (err) {
      return errorText(err);
    }
  }

  private async marketCollect() {
    const api = this.marketTrader();
    if (!api) return;
    const rows = await api.collect();
    if (!rows.length) return;
    this.act((s) => receiveDeliveries(s, rows));
    for (const row of rows.slice(0, 3)) this.addFeed(`Market: ${row.note}`, 'good');
    this.pushToast(rows.length === 1 ? `Market: ${rows[0].note}` : `Market: ${rows.length} things collected`, 'good');
  }

  /** Compensation is also available before Act 1 and in SSF; the RPC only returns this account's realm. */
  async collectAdminCompensation(): Promise<void> {
    if (this.sandbox || !isCloudAccount(this.account)) return;
    const rows = await marketApi(this.realm.realm)?.collect();
    if (rows?.length) {
      this.act((s) => receiveDeliveries(s, rows));
      this.save();
      this.pushToast(`${rows.length} deliveries collected`, 'good');
    } else this.pushToast('No deliveries waiting in this realm', 'info');
  }

  async refreshAdminMail(): Promise<void> {
    if (this.sandbox || !isCloudAccount(this.account)) return;
    const owner = this.account?.id;
    try {
      const rows = await readAdminMail();
      if (this.account?.id !== owner || this.sandbox) return;
      if (JSON.stringify(rows) !== JSON.stringify(this.adminMail)) { this.adminMail = rows; this.notify(); }
    } catch { /* Older deployments may not have the inbox yet; never interrupt gameplay. */ }
  }

  /** Reproduction never writes the target or admin's real character/account stores. */
  startSandbox(save: unknown, account?: AccountState | null) {
    if (!this.isAdmin) throw new Error('Admins only');
    const state = sandboxState(save, account);
    if (!this.sandboxReturn) {
      this.save();
      this.sandboxReturn = { saves: this.saves, state: this.state, realm: this.realm };
    }
    this.stopLoop();
    this.sandbox = true;
    this.saves = new MemorySaveStore();
    state.account.realm = realmOf(state.character);
    this.adoptRealm(state.account);
    this.begin(state);
    this.pushToast('Sandbox ready. Open Combat to reproduce the report.', 'info');
  }

  /** Settle any step whose reply was lost, then collect what's waiting. Quiet if the market can't be reached. */
  async marketSync() {
    const api = this.marketTrader();
    if (!api) return;
    try {
      for (const hold of [...(this.realm.marketHolds ?? [])]) {
        if (this.marketInFlight.has(hold.op)) continue;
        const done = await api.opDone(hold.op);
        this.act((s) => releaseHold(s, hold.op, !done));
      }
      await this.marketCollect();
    } catch {
      // the next visit tries again
    }
  }

  private startLoop() {
    this.stopLoop();
    this.lastFrame = performance.now();
    this.lastSave = performance.now();
    const step = () => {
      // a catch-up is running in slices; the time it takes is played once it's done
      if (this.catchUp) return;
      const now = performance.now();
      const dt = now - this.lastFrame;
      this.lastFrame = now;
      this.baseCtx.now = Date.now();
      if (dt > BACKGROUND_MS) this.runOffline(dt);
      else tick(this.state, this.ctx, dt);
      if (this.state.fallen && this.loop) return void this.bury(this.state);
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

  /**
   * Catch up on time away. A long absence takes a while to simulate, so it runs in slices between frames
   * behind a progress screen (catchUpProgress) instead of freezing the page. The result is the same either way.
   */
  private runOffline(ms: number) {
    if (this.catchUp) return;
    this.baseCtx.now = Date.now();
    const hadAction = !!this.state.action;
    const state = this.state;
    const run = startOffline(state, this.ctx, ms);
    const done = () => {
      this.catchUp = null;
      this.catchUpListeners.forEach((l) => l());
      // the character was left (or swapped) mid-way: nothing to report
      if (this.state !== state) return;
      const sum = run.summary;
      if (this.account?.provider === 'demo' && state.bossesDefeated.includes('sanctum')) void recordDemo('demo_act1_boss_killed');
      if (state.fallen && this.loop) return void this.bury(state);
      if (hadAction && sum.ms >= MIN_OFFLINE_MS) this.offline = this.offline ? mergeOffline(this.offline, sum) : sum;
      this.notify();
    };
    // short absences finish in one go, as before
    if (run.step(CATCH_UP_SLICE_MS)) return done();
    this.catchUp = run;
    this.notify();
    const slice = () => {
      if (this.catchUp !== run) return;
      if (this.state !== state) return done();
      if (run.step(CATCH_UP_SLICE_MS)) return done();
      this.catchUpListeners.forEach((l) => l());
      nextSlice(slice);
    };
    nextSlice(slice);
  }

  /** The catch-up in progress, if any: 0 to 1, or null when there isn't one. */
  catchUpProgress(): number | null {
    return this.catchUp ? this.catchUp.progress : null;
  }

  /** Re-render just the catch-up screen as it advances, without redrawing the game under it every slice. */
  subscribeCatchUp = (fn: () => void) => {
    this.catchUpListeners.add(fn);
    return () => this.catchUpListeners.delete(fn);
  };

  save() {
    if (this.screen !== 'game' || !this.saves) return;
    // half caught up: keep the last save, so leaving now catches up on the whole absence next time
    if (this.catchUp) return;
    this.lastSave = performance.now();
    this.state.lastSaved = Date.now();
    this.saves.save(this.state).catch((err) => {
      // storage full or blocked: keep playing
      if (this.saveErrorReported) return;
      this.saveErrorReported = true;
      reportError(err, { where: 'save' });
    });
    this.saveRealm();
    if (performance.now() - this.lastPull >= ACCOUNT_PULL_MS) {
      this.lastPull = performance.now();
      void this.saves.pullAccount(this.realm.realm).then((theirs) => this.mergeRealm(theirs));
    }
  }

  /** Swap in a different state for the current session (import / reset). */
  async replace(s: GameState) {
    await this.switchRealm(realmOf(s.character));
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
    // nothing changes mid catch-up (hotkeys, say), or the result would differ from one unbroken run
    if (this.catchUp) return undefined as T;
    const result = fn(this.state, this.ctx);
    if (typeof result === 'string' && result) this.pushToast(result, 'warn');
    // the stash and the bag have to be written together, or a crash could lose or copy an item
    if (this.screen === 'game' && this.shelvesJson() !== this.savedShelves) this.save();
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

  /** Click a toast to clear it before it fades on its own. */
  dismissToast(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
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
        if (e.boss && this.account?.provider === 'demo' && e.name === ZONES.find((z) => z.id === 'sanctum')?.boss.name) void recordDemo('demo_act1_boss_killed');
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
        this.log(`${e.name} ${e.kind === 'channel' ? 'channels' : 'winds up'} ${e.skill} (${e.kind === 'nova' ? 'nova' : e.kind === 'channel' ? 'break it!' : 'heavy blow'})`, 'warn');
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
        this.addFeed(`${e.name} ${e.kind === 'channel' ? 'channels' : 'winds up'} ${e.skill}!`, 'warn');
        break;
      case 'actComplete': {
        const next = ACTS.find((a) => a.n === e.act + 1);
        this.addFeed(
          e.act === FINAL_ACT
            ? 'The campaign is complete! The Map Device wakes in your hideout.'
            : next && actOpen(next.n)
              ? `Act ${e.act} complete! Act ${next.n}, ${next.name}, is open.`
              : `Act ${e.act} complete! More of the world opens in a future update.`,
          'good',
        );
        this.pushToast(`Act ${e.act} complete!`, 'good');
        break;
      }
      case 'trialPassed': {
        const trial = TRIALS.find((t) => t.n === e.n)!;
        const text = `${e.n === 4 ? 'Final trial' : 'Trial'} passed! +${trial.points} ascendancy points. ${trial.result}${e.n === 1 ? ' Choose on the Passive Tree page.' : ''}`;
        this.addFeed(text, 'good');
        this.pushToast(text, 'good');
        break;
      }
      case 'tutorialStep': {
        const step = TUTORIAL_STEPS[e.step];
        this.addFeed(`Quest complete: ${step.title}${step.rewardText ? ` — ${rewardText(this.state, step)}` : ''}`, 'good');
        this.pushToast(e.done ? 'Tutorial complete! Follow the coast — the Drowned Queen waits at its end.' : `Quest complete: ${step.title}`, 'good');
        break;
      }
      case 'achievement': {
        const a = ACHIEVEMENT_BY_ID[e.id];
        const perks = [...perkText(a.perks ?? {}), ...(a.unique ? [`${uniqueDef(a.unique).name} is in your bag`] : [])];
        this.addFeed(`Achievement: ${a.name}${perks.length ? ` — ${perks.join(', ')}` : ''}`, 'good');
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
