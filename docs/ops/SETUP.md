# Setup

## Setting up Google & Discord login (Supabase)

About 20–30 minutes. You'll create three free accounts/apps (Supabase, Google Cloud, Discord Developer) and paste a few values between them. You don't need to send me any keys — put the two game values in `.env.local` (step 6) and tell me it's done. I'll write the code.

> **Keep secrets secret.** The Google/Discord **client secrets** only ever go into the Supabase dashboard — never into the game code, chat, or git. The game only needs the Supabase **Project URL** and **anon / publishable key**, which are designed to be public.

Dashboards change their wording now and then; if a button name doesn't match exactly, look for the closest equivalent.

---

### 1. Create the Supabase project

1. Go to https://supabase.com and sign up (GitHub login is easiest).
2. **New project** → name it `path-of-idle`, set a database password (save it in a password manager), pick the region closest to you.
3. Wait for it to finish provisioning (~2 min).
4. Open **Project Settings → API** (or **Data API / API Keys**) and note:
   - **Project URL** — 
   - **anon public key** sb_publishable_x53UGpOIRbEQbXK7bpndEg_lcannJWi
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

### 7. Done — tell me

Say "Supabase is set up" and I'll:
- add the Supabase client and real **Sign in with Google / Discord** buttons,
- add a `CloudSaveStore` that syncs characters to the `characters` table,
- let guests **link** their existing local characters to their new account,
- handle signing out and switching accounts.

#### Checklist
- [ ] Supabase project created, URL + anon key noted
- [ ] Google OAuth client created, redirect URI = Supabase callback, provider enabled in Supabase
- [ ] Your Google account added as a test user
- [ ] Discord app created, redirect = Supabase callback, provider enabled in Supabase
- [ ] Site URL and redirect URLs set in Supabase
- [ ] `characters` table created (step 5)
- [ ] `.env.local` created with the two values


## Admin page, feedback, reviews and error reporting

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
