# Setting up Google & Discord login (Supabase)

About 20–30 minutes. You'll create three free accounts/apps (Supabase, Google Cloud, Discord Developer) and paste a few values between them. You don't need to send me any keys — put the two game values in `.env.local` (step 6) and tell me it's done. I'll write the code.

> **Keep secrets secret.** The Google/Discord **client secrets** only ever go into the Supabase dashboard — never into the game code, chat, or git. The game only needs the Supabase **Project URL** and **anon / publishable key**, which are designed to be public.

Dashboards change their wording now and then; if a button name doesn't match exactly, look for the closest equivalent.

---

## 1. Create the Supabase project

1. Go to https://supabase.com and sign up (GitHub login is easiest).
2. **New project** → name it `claudle-of-exile`, set a database password (save it in a password manager), pick the region closest to you.
3. Wait for it to finish provisioning (~2 min).
4. Open **Project Settings → API** (or **Data API / API Keys**) and note:
   - **Project URL** — https://ckclesfzzvfkcrsyvogs.supabase.co
   - **anon public key** sb_publishable_x53UGpOIRbEQbXK7bpndEg_lcannJWi
   - Your **project ref** is the `ckclesfzzvfkcrsyvogs` part of the URL.

Your **callback URL** for steps 2 and 3 is:

```
https://ckclesfzzvfkcrsyvogs.supabase.co/auth/v1/callback
```

---

## 2. Google login

1. Go to https://console.cloud.google.com and create a new project called `Claudle of Exile`.
2. **APIs & Services → OAuth consent screen** (may be called **Google Auth Platform → Branding**):
   - User type: **External**.
   - App name: `Claudle of Exile`, support email: your email, developer contact: your email.
   - Scopes: the defaults (`openid`, `email`, `profile`) are all we need.
   - While in **Testing** mode only the test users you add can sign in — add your own Google account under **Test users**. Publish the app later when you launch.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**, name: `Supabase`.
   - **Authorized JavaScript origins:** `http://localhost:5173` (add your real site URL later).
   - **Authorized redirect URIs:** your Supabase callback URL from step 1.
   - Create, then copy the **Client ID** 281290751952-f2pcon2vvbsqnh5tdivgj2bfhbghfd8a.apps.googleusercontent.com and **Client secret**. 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
4. In Supabase: **Authentication → Sign In / Providers → Google** → enable, paste the Client ID and Client secret → **Save**.

---

## 3. Discord login

1. Go to https://discord.com/developers/applications → **New Application** → name it `Claudle of Exile`.
2. **OAuth2** in the left menu:
   - Copy the **Client ID** 1562621453126471690
   - **Reset Secret** → copy the **Client Secret** qrGU4lrf_lQkN80QC9OFy-fKV1T2kUfF
   - **Redirects → Add Redirect:** your Supabase callback URL → **Save Changes**.
3. Optional: under **General Information**, add an app icon — players see it on the Discord consent screen.
4. In Supabase: **Authentication → Sign In / Providers → Discord** → enable, paste the Client ID and Client Secret → **Save**.

---

## 4. Tell Supabase where the game lives

**Authentication → URL Configuration:**
- **Site URL:** `http://localhost:5173` for now (change to the real domain at launch).
- **Redirect URLs:** add `http://localhost:5173/**` (and later `https://your-domain/**`).

---

## 5. Create the cloud saves table

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

## 6. Give the game its keys

In the project folder, create a file named **`.env.local`** (next to `package.json`):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

`.env.local` is in `.gitignore`, so it won't be committed. **Never** put the `service_role` / secret key here.

---

## 7. Done — tell me

Say "Supabase is set up" and I'll:
- add the Supabase client and real **Sign in with Google / Discord** buttons,
- add a `CloudSaveStore` that syncs characters to the `characters` table,
- let guests **link** their existing local characters to their new account,
- handle signing out and switching accounts.

### Checklist
- [ ] Supabase project created, URL + anon key noted
- [ ] Google OAuth client created, redirect URI = Supabase callback, provider enabled in Supabase
- [ ] Your Google account added as a test user
- [ ] Discord app created, redirect = Supabase callback, provider enabled in Supabase
- [ ] Site URL and redirect URLs set in Supabase
- [ ] `characters` table created (step 5)
- [ ] `.env.local` created with the two values
