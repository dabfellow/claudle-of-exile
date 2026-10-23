import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Account layer. Guests live in browser storage; Google and Discord sign in through
 * Supabase. The game only sees an Account and doesn't care which kind it is.
 */
export type AuthProviderId = 'guest' | 'google' | 'discord';

export interface Account {
  id: string;
  provider: AuthProviderId;
  displayName: string;
  email?: string;
}

export interface AccountProvider {
  /** Restore whoever was signed in (finishes an OAuth redirect if one just happened). */
  init(): Promise<Account | null>;
  current(): Account | null;
  isAvailable(provider: AuthProviderId): boolean;
  /** Guests sign in immediately; OAuth providers redirect away and resolve to null. */
  signIn(provider: AuthProviderId): Promise<Account | null>;
  signOut(): Promise<void>;
}

const ACCOUNT_KEY = 'coe-account';
/** which kind of account the player last chose on this browser */
const MODE_KEY = 'coe-mode';

/** Guest-only accounts kept in browser storage. */
export class LocalAccounts implements AccountProvider {
  constructor(private storage: Storage) {}

  async init(): Promise<Account | null> {
    return this.current();
  }

  current(): Account | null {
    try {
      const raw = this.storage.getItem(ACCOUNT_KEY);
      return raw ? (JSON.parse(raw) as Account) : null;
    } catch {
      return null;
    }
  }

  isAvailable(provider: AuthProviderId): boolean {
    return provider === 'guest';
  }

  async signIn(provider: AuthProviderId): Promise<Account> {
    if (provider !== 'guest') throw new Error(`${provider} sign-in is not set up yet`);
    // a returning guest keeps the same id so their characters stay attached
    const existing = this.current();
    if (existing?.provider === 'guest') return existing;
    const account: Account = { id: `guest-${Math.random().toString(36).slice(2, 10)}`, provider: 'guest', displayName: 'Guest' };
    this.storage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    return account;
  }

  async signOut(): Promise<void> {
    // guests stay remembered so their characters aren't orphaned; this just returns to the title
  }
}

function toAccount(user: User): Account {
  const meta = user.user_metadata ?? {};
  const provider = (user.app_metadata?.provider === 'discord' ? 'discord' : 'google') as AuthProviderId;
  return {
    id: user.id,
    provider,
    displayName: meta.full_name || meta.name || meta.user_name || meta.custom_claims?.global_name || user.email || 'Exile',
    email: user.email ?? undefined,
  };
}

/** Guest accounts plus Google/Discord through Supabase. */
export class AppAccounts implements AccountProvider {
  private guest: LocalAccounts;
  private active: Account | null = null;

  constructor(
    private storage: Storage,
    private supabase: SupabaseClient | null,
  ) {
    this.guest = new LocalAccounts(storage);
  }

  /** The guest account on this browser, whether or not it's the one in use. */
  guestAccount(): Account | null {
    return this.guest.current();
  }

  async init(): Promise<Account | null> {
    const mode = this.storage.getItem(MODE_KEY);
    if (this.supabase) {
      const authError = readAuthError();
      if (authError) throw new Error(authError);
      const { data } = await this.supabase.auth.getSession();
      cleanAuthParams();
      if (data.session?.user && mode !== 'guest') {
        this.active = toAccount(data.session.user);
        this.storage.setItem(MODE_KEY, 'cloud');
        return this.active;
      }
    }
    // browsers from before online accounts have a guest but no mode yet
    this.active = mode === 'guest' || mode === null ? this.guest.current() : null;
    return this.active;
  }

  current(): Account | null {
    return this.active;
  }

  isAvailable(provider: AuthProviderId): boolean {
    return provider === 'guest' || !!this.supabase;
  }

  async signIn(provider: AuthProviderId): Promise<Account | null> {
    if (provider === 'guest') {
      this.active = await this.guest.signIn('guest');
      this.storage.setItem(MODE_KEY, 'guest');
      return this.active;
    }
    if (!this.supabase) throw new Error('Online accounts are not configured');
    this.storage.setItem(MODE_KEY, 'cloud');
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider,
      // return to the game's own folder (/path-of-idle/ on the live site), not the site hub
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) {
      this.storage.removeItem(MODE_KEY);
      throw error;
    }
    return null; // the browser is now redirecting to the provider
  }

  async signOut(): Promise<void> {
    if (this.active && this.active.provider !== 'guest' && this.supabase) await this.supabase.auth.signOut();
    this.storage.removeItem(MODE_KEY);
    this.active = null;
  }
}

/** An OAuth error the provider sent back in the URL, if any. */
function readAuthError(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search + window.location.hash.replace(/^#/, '&'));
  const msg = params.get('error_description') ?? params.get('error');
  if (msg) cleanAuthParams();
  return msg ? `Sign-in failed: ${msg.replace(/\+/g, ' ')}` : null;
}

/** Drop ?code=…, #access_token=… and error params from the address bar after sign-in. */
function cleanAuthParams(): void {
  if (typeof window === 'undefined') return;
  if (window.location.search || window.location.hash) window.history.replaceState(null, '', window.location.pathname);
}
