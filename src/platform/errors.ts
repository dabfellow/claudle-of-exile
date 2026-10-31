/**
 * Crash reporting through Sentry (docs/ops/SETUP.md). Off unless VITE_SENTRY_DSN is set at build
 * time; the SDK is loaded lazily so guest-only and dev builds don't pay for it.
 */

export const APP_VERSION: string = __APP_VERSION__;

type SentryModule = typeof import('@sentry/browser');
let sentry: SentryModule | null = null;
/** who is playing, remembered until the SDK has loaded */
let pendingUser: { id: string } | null = null;

export function errorReportingConfigured(): boolean {
  return !!import.meta.env.VITE_SENTRY_DSN;
}

export async function initErrorReporting(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || sentry) return;
  try {
    sentry = await import('@sentry/browser');
    sentry.init({
      dsn,
      release: `path-of-idle@${APP_VERSION}`,
      environment: import.meta.env.MODE,
      // errors only: no performance tracing or session replays
      tracesSampleRate: 0,
      // never send names, emails or IPs
      sendDefaultPii: false,
    });
    if (pendingUser) sentry.setUser(pendingUser);
  } catch (err) {
    console.warn('Error reporting failed to start', err);
  }
}

/** Tag reports with the account id only (no name or email), so one player's crashes can be grouped. */
export function setErrorUser(id: string | null): void {
  pendingUser = id ? { id } : null;
  sentry?.setUser(pendingUser);
}

/** Report a caught error that the player would otherwise never see. */
export function reportError(err: unknown, context?: Record<string, unknown>): void {
  if (sentry) sentry.captureException(err, context ? { extra: context } : undefined);
  else console.error(err);
}

/** Link for the admin page's Errors tab. */
export function sentryIssuesUrl(): string {
  return (import.meta.env.VITE_SENTRY_ISSUES_URL as string | undefined) || 'https://sentry.io/issues/';
}
