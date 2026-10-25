# Admin page, feedback, reviews and error reporting

About 15 minutes. Three parts: run some SQL in Supabase, make yourself an admin, and (optionally) connect Sentry.
After that, an **Admin** entry appears at the bottom of the sidebar when you're signed in.

What it gives you:

- **Overview**: accounts, players, characters, active today / this week, Act 1 clears, characters by class and level, average review.
  Signed-in players only; guest saves never leave the browser.
- **Feedback**: bug reports and ideas players send from **Settings → Feedback** (guests too). Filter New / Read / Resolved, and mark them as you go.
  Each note carries the game version, class, level and area, but no name or email.
- **Reviews**: 1–5 stars and an optional comment, one per signed-in account (sending again updates it).
- **Errors**: crashes go to Sentry, which groups them, counts them and tracks resolved / ignored. The tab links there.

---

## 1. Tables (Supabase → SQL Editor → New query → paste → Run)

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

## 2. Make yourself an admin

Sign in to the game once with the account you want. Then in Supabase:

1. **Authentication → Users**, find your account and copy its **UID**.
2. **SQL Editor**, run (with your UID):

```sql
insert into public.admins (user_id) values ('paste-your-uid-here');
```

Reload the game: **Admin** shows up under Settings in the sidebar. Add a friend the same way to give them access.

## 3. Sentry (crash reports)

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
