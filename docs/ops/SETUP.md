# Setup

Last reviewed 2026-11-06. These are configuration/recreation instructions for implemented services, not unfinished game features. The last confirmed live release is recorded in [MILESTONES.md](../MILESTONES.md). Verify login and transactions on real accounts after configuration changes; a repository audit does not verify dashboard settings.

## Setting up Google & Discord login (Supabase)

The game implements Supabase accounts and cloud saves. For a new environment, configure Supabase and the OAuth providers, then put the public game values in `.env.local` (step 6). Email/password configuration is included below. Check current provider dashboard labels when configuring them.

> **Keep secrets secret.** The Google/Discord **client secrets** only ever go into the Supabase dashboard — never into the game code, chat, or git. The game only needs the Supabase **Project URL** and **anon / publishable key**, which are designed to be public.

Dashboards change their wording now and then; if a button name doesn't match exactly, look for the closest equivalent.

---

### 1. Create the Supabase project

1. Go to https://supabase.com and sign up (GitHub login is easiest).
2. **New project** → name it `path-of-idle`, set a database password (save it in a password manager), pick the region closest to you.
3. Wait for it to finish provisioning (~2 min).
4. Open **Project Settings → API** (or **Data API / API Keys**) and note:
   - **Project URL** — 
   - **anon / publishable key** — copy the current public key from your project into `.env.local`.
   - Your **project ref** is the `ckclesfzzvfkcrsyvogs` part of the URL.

Your **callback URL** for steps 2 and 3 is:

```
https://ckclesfzzvfkcrsyvogs.supabase.co/auth/v1/callback
```

---

### 2. Google login

1. Go to https://console.cloud.google.com and create a new project called `Path of Idle`.
2. **APIs & Services → OAuth consent screen** (may be called **Google Auth Platform → Branding**):
   - User type: **External**.
   - App name: `Path of Idle`, support email: your email, developer contact: your email.
   - Scopes: the defaults (`openid`, `email`, `profile`) are all we need.
   - While in **Testing** mode only the test users you add can sign in — add your own Google account under **Test users**. Publish the app later when you launch.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**, name: `Supabase`.
   - **Authorized JavaScript origins:** `http://localhost:5173` (add your real site URL later).
   - **Authorized redirect URIs:** your Supabase callback URL from step 1.
   - Create, then copy the **Client ID** 281290751952-f2pcon2vvbsqnh5tdivgj2bfhbghfd8a.apps.googleusercontent.com and **Client secret**.
4. In Supabase: **Authentication → Sign In / Providers → Google** → enable, paste the Client ID and Client secret → **Save**.

---

### 3. Discord login

1. Go to https://discord.com/developers/applications → **New Application** → name it `Path of Idle`.
2. **OAuth2** in the left menu:
   - Copy the **Client ID** 1562621453126471690
   - **Reset Secret** → copy the **Client Secret** (straight into Supabase, never here)
   - **Redirects → Add Redirect:** your Supabase callback URL → **Save Changes**.
3. Optional: under **General Information**, add an app icon — players see it on the Discord consent screen.
4. In Supabase: **Authentication → Sign In / Providers → Discord** → enable, paste the Client ID and Client Secret → **Save**.

---

### 4. Tell Supabase where the game lives

**Authentication → URL Configuration:**
- **Site URL:** `http://localhost:5173` for now (change to the real domain at launch).
- **Redirect URLs:** add `http://localhost:5173/**` (and later `https://your-domain/**`). The `/**` also covers the password reset link (`?recovery=1`).

#### Email and password

**Authentication → Sign In / Providers → Email:**
- Turn the provider on.
- Turn **Confirm email** off for now. Supabase's built-in mailer only sends a few emails an hour, so a group signing up together could get stuck. With it off, unverified addresses can sign up, and a mistyped address can't reset its password.
- Turn it back on once custom SMTP is set up; the game handles both ("check your email" when no session comes back).

---

### 5. Create the cloud saves table

**SQL Editor → New query**, paste this and **Run**:

```sql
create table public.characters (
  id         text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  class_id   text not null,
  summary    jsonb not null,
  save       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Each player can only see and change their own characters.
alter table public.characters enable row level security;

create policy "players manage their own characters"
  on public.characters
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index characters_user_id_idx on public.characters (user_id);
```

---

The shared account (hideout, unlocks, stash) needs no extra table: each player has one reserved row in `characters`, with
an id starting `account:` and `class_id = 'account'`. Admin stats that count `characters` should leave those rows out.

### 6. Give the game its keys

In the project folder, create a file named **`.env.local`** (next to `package.json`):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

`.env.local` is in `.gitignore`, so it won't be committed. **Never** put the `service_role` / secret key here.

---

### 7. Verify the configured environment

Test email sign-up/confirmation/reset, Google and Discord redirects, signing out, existing guest-character carryover, and saving/loading across two browsers. These paths are implemented; configuration and real-account checks are still necessary. A local build does not verify cloud sync or provider settings.

#### Checklist
- [x] Supabase project created, URL + anon key noted
- [x] Google OAuth client created, redirect URI = Supabase callback, provider enabled in Supabase
- [x] Your Google account added as a test user
- [x] Discord app created, redirect = Supabase callback, provider enabled in Supabase
- [x] Site URL and redirect URLs set in Supabase
- [x] `characters` table created (step 5)
- [x] `.env.local` created with the two values


## Admin page, feedback, reviews and error reporting

### Installing the local Admin overhaul

After the basic tables below and [market.sql](market.sql) exist, run all of [admin.sql](admin.sql) in the Supabase SQL Editor. It is transactional and safe to reapply. Keep your account in `admins`; upload the current validation rules from **Admin → Market → Upload from this build** before testing item/currency compensation. The owner confirmed both market/admin SQL ran on 2026-11-06. Live anonymous checks reject access to the new Admin functions and private tables; signed-in verification, current rules upload and updated frontend deployment remain pending.

It installs private audit/backup tables and privileged player inspection, restore, reply/compensation, bulk-resolution and overview functions; own-recipient mail policies; bounded feedback snapshots; deduplicated anonymous demo counters; and validated custom event metadata/auditing. Normal players cannot read other accounts or invoke privileged functions. Existing `admin_stats` and legacy event definitions remain compatible with older clients. Only the new Admin UI calls the new overview API. Reapply the updated market SQL first: it supplies the private rules-based item validator used for compensation. The current validation upload adds an admin-only full Unique catalogue, including no-trade rewards; this does not make those rewards tradeable by players.

Verify two real accounts plus an admin: search/inspect saves and email only as admin; create a restore point with an ordinary save, recover it to a new character and verify the source/shared stash remain intact; reply to a report and collect one gift in the correct realm; verify a second collect/retry cannot issue the gift again. Test a scheduled XP/speed event and a broadcast, including stopping it and catching up offline. Do not use real player compensation for a smoke test without an explicitly intended recipient. Backups/death locations/demo events/snapshots are not retroactive. Existing market delivery recovery limitations remain applicable.

Demo counters contain a random session UUID, one of three fixed event names and a timestamp; no email, browser fingerprint or IP is included in that payload. Anonymous counters are approximate and can be forged. Configure infrastructure rate limits and retention for telemetry/feedback separately; for example, regularly remove `demo_counters` older than 90 days. Audit and diagnostic records contain player data and must remain admin-only; never export them into the public repo. A provider/database owner can still perform operations outside the app audit trail.

About 15 minutes. Three parts: run some SQL in Supabase, make yourself an admin, and (optionally) connect Sentry.
After that, an **Admin** entry appears at the bottom of the sidebar when you're signed in.

What it gives you:

- **Overview**: accounts, players, characters, active today / this week, Act 1 clears, characters by class and level, average review.
  Accounts only: demos aren't saved, and older guest saves never leave the browser.
- **Feedback**: bug reports and ideas players send from **Settings → Feedback** (demo players and guests too). Filter New / Read / Resolved, and mark them as you go.
  Each note carries the game version, class, level and area, but no name or email.
- **Reviews**: 1–5 stars and an optional comment, one per signed-in account (sending again updates it).
- **Errors**: crashes go to Sentry, which groups them, counts them and tracks resolved / ignored. The tab links there.

---

### 1. Tables (Supabase → SQL Editor → New query → paste → Run)

```sql
-- ---------- admins ----------
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
create policy "admins see themselves" on public.admins for select using (auth.uid() = user_id);

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- ---------- feedback ----------
create table public.feedback (
  id         bigint generated always as identity primary key,
  user_id    uuid default auth.uid() references auth.users(id) on delete set null,
  kind       text not null check (kind in ('bug', 'idea', 'other')),
  message    text not null check (char_length(message) between 1 and 2000),
  context    jsonb not null default '{}',
  status     text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
-- anyone (guests included) can send; only admins can read or change status
create policy "anyone can send feedback" on public.feedback for insert to anon, authenticated
  with check (status = 'new' and (user_id is null or user_id = auth.uid()) and pg_column_size(context) < 2000);
create policy "admins read feedback" on public.feedback for select using (public.is_admin());
create policy "admins update feedback" on public.feedback for update using (public.is_admin());
create index feedback_status_idx on public.feedback (status, created_at desc);

-- ---------- reviews ----------
create table public.reviews (
  user_id      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  stars        int not null check (stars between 1 and 5),
  comment      text not null default '' check (char_length(comment) <= 1000),
  display_name text check (char_length(display_name) <= 40),
  updated_at   timestamptz not null default now()
);
alter table public.reviews enable row level security;
create policy "players manage their own review" on public.reviews for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins read reviews" on public.reviews for select using (public.is_admin());

-- ---------- stats (admins only; never exposes other players' saves) ----------
create or replace function public.admin_stats() returns jsonb
  language sql stable security definer set search_path = public
  as $$
  select case when not public.is_admin() then null else jsonb_build_object(
    'accounts',          (select count(*) from auth.users),
    'new_accounts_week', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'players',           (select count(distinct user_id) from characters),
    'characters',        (select count(*) from characters),
    'active_day',        (select count(distinct user_id) from characters where updated_at > now() - interval '1 day'),
    'active_week',       (select count(distinct user_id) from characters where updated_at > now() - interval '7 days'),
    'act1_clears',       (select count(*) from characters where coalesce((summary->>'act1Cleared')::boolean, false)),
    'by_class',          (select coalesce(jsonb_object_agg(class_id, n), '{}') from
                           (select class_id, count(*) n from characters group by class_id) t),
    'by_level',          (select coalesce(jsonb_object_agg(bucket, n), '{}') from
                           (select (floor(coalesce((summary->>'combatLevel')::int, 1) / 5.0) * 5)::int bucket, count(*) n
                              from characters group by 1) t),
    'feedback_open',     (select count(*) from feedback where status = 'new'),
    'reviews',           (select jsonb_build_object('count', count(*), 'avg', round(avg(stars)::numeric, 1)) from reviews)
  ) end
  $$;
```

### 2. Make yourself an admin

Sign in to the game once with the account you want. Then in Supabase:

1. **Authentication → Users**, find your account and copy its **UID**.
2. **SQL Editor**, run (with your UID):

```sql
insert into public.admins (user_id) values ('paste-your-uid-here');
```

Reload the game: **Admin** shows up under Settings in the sidebar. Add a friend the same way to give them access.

### Limited-time events

The Admin page's Events tab runs holidays and Double XP for everyone, by hand or on a schedule, with no deploy. It needs this table once (SQL Editor → New query → paste → Run). New events are added in `src/data/events.ts`.

```sql
create table public.live_events (
  id text primary key,
  enabled boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz
);
alter table public.live_events enable row level security;
create policy "anyone reads live events" on public.live_events for select using (true);
create policy "admins add live events" on public.live_events for insert with check (public.is_admin());
create policy "admins change live events" on public.live_events for update using (public.is_admin());
```

### Player Market

The Player Market is implemented. A fresh environment needs the admin step above, followed by:

1. **SQL Editor → New query**, paste all of [market.sql](market.sql), **Run**. It's safe to run again after a change.
2. Sign in to the game as an admin, open **Admin → Market**, and press **Upload from this build**. Nothing can be listed until this is done.
3. Press it again after any release that changes modifiers, bases, uniques or runes.

### 3. Sentry (crash reports)

1. Sign up at https://sentry.io (free tier is plenty), create a project, platform **Browser JavaScript**.
2. Copy the **DSN** it shows (looks like `https://abc123@o456.ingest.sentry.io/789`). A DSN is safe to ship in the game; it can only send reports.
3. Add to `.env.local`:

```
VITE_SENTRY_DSN=https://...your DSN...
# optional: where the Admin page's "Open issues" button goes
VITE_SENTRY_ISSUES_URL=https://your-org.sentry.io/issues/
```

4. `npm run deploy`.

Sentry gets the error, the browser, the game version (`package.json` → `version`; bump it when you deploy so reports
show which build broke) and an anonymous account id to group one player's crashes. No names, emails or IPs
(`sendDefaultPii: false`). The SDK only loads when a DSN is set.

In Sentry, **Alerts → Create alert → Issues** to get an email when a new error appears.
