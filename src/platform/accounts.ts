/**
 * Account layer. Only guest accounts exist for now; Google/Discord sign-in will
 * plug in here (e.g. Supabase or Firebase) without the game knowing the difference.
 */
export type AuthProviderId = 'guest' | 'google' | 'discord';

export interface Account {
  id: string;
  provider: AuthProviderId;
  displayName: string;
}

export interface AccountProvider {
  current(): Account | null;
  isAvailable(provider: AuthProviderId): boolean;
  signIn(provider: AuthProviderId): Promise<Account>;
  signOut(): Promise<void>;
}

const ACCOUNT_KEY = 'coe-account';

export class LocalAccounts implements AccountProvider {
  constructor(private storage: Storage) {}

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
