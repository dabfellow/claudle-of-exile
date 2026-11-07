-- The Player Market (docs/GAME.md). Paste into Supabase -> SQL Editor -> New query -> Run.
-- Safe to run again after a change: tables are only created once, and every function is replaced.
--
-- Players never touch these tables directly. Row-level security is on with no policies, so the only way in is the
-- functions below, and each one is a single all-or-nothing step on the server.
-- Offline trading deliberately accepts client-earned goods: these checks do NOT prove provenance or balances.

-- Privileged functions resolve public relations here; client roles must not create substitutes in this schema.
revoke create on schema public from public, anon, authenticated;

create table if not exists public.market_rules (
  id         int primary key default 1 check (id = 1),
  version    text not null,
  rules      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.market_bans (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.market_listings (
  id          bigint generated always as identity primary key,
  realm       text not null default 'standard',
  seller      uuid not null references auth.users(id) on delete cascade,
  item        jsonb not null,
  item_name   text not null,
  slot        text not null,
  rarity      text not null,
  ilvl        int not null,
  mode        text not null check (mode in ('buy', 'auction')),
  currency    text not null,
  -- the buy now price, or an auction's lowest first bid
  price       bigint not null check (price > 0),
  high_bid    bigint,
  high_bidder uuid references auth.users(id) on delete set null,
  status      text not null default 'active' check (status in ('active', 'sold', 'expired', 'cancelled', 'removed')),
  ends_at     timestamptz not null,
  created_at  timestamptz not null default now(),
  sold_to     uuid references auth.users(id) on delete set null,
  sold_at     timestamptz
);
create index if not exists market_listings_active_idx on public.market_listings (realm, status, ends_at);
create index if not exists market_listings_seller_idx on public.market_listings (seller, status);
create index if not exists market_listings_bidder_idx on public.market_listings (high_bidder, status);

-- The market wallet: what's waiting for a player. A collected row stays as the record, so a lost payout can be found.
create table if not exists public.market_inbox (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  currency     text,
  amount       bigint,
  item         jsonb,
  note         text not null,
  created_at   timestamptz not null default now(),
  collected_at timestamptz
);
create index if not exists market_inbox_user_idx on public.market_inbox (user_id) where collected_at is null;

-- Each paid step the server finished. If the reply gets lost, the game asks here before refunding.
create table if not exists public.market_ops (
  op_id      uuid primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists market_ops_user_time_idx on public.market_ops (user_id, created_at);

alter table public.market_rules enable row level security;
alter table public.market_bans enable row level security;
alter table public.market_listings enable row level security;
alter table public.market_inbox enable row level security;
alter table public.market_ops enable row level security;

-- Explicit grants as well as RLS: future permissive policies must not expose transaction internals.
revoke all on table public.market_rules, public.market_bans, public.market_listings, public.market_inbox, public.market_ops
  from public, anon, authenticated;
revoke all on sequence public.market_listings_id_seq, public.market_inbox_id_seq from public, anon, authenticated;

-- ---------- the sanity check ----------

-- Rarity, name and modifiers, for an item or the impression stored on one. Null means fine.
create or replace function public.market_gear_problem(r jsonb, base_id text, ilvl int, unique_id text, g jsonb)
  returns text language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  base jsonb := r->'bases'->base_id;
  rarity text := g->>'rarity';
  side text;
  mods jsonb;
  mod jsonb;
  affix jsonb;
  tier jsonb;
  tier_i int;
  vals jsonb;
  ranges jsonb;
  i int;
  max_side int;
  groups text[] := '{}';
  crafted int := 0;
begin
  if rarity is null or rarity not in ('normal', 'magic', 'rare', 'unique') then return 'unknown rarity'; end if;
  if jsonb_typeof(g->'prefixes') is distinct from 'array' or jsonb_typeof(g->'suffixes') is distinct from 'array' then
    return 'malformed modifiers';
  end if;
  if g->>'name' is not null and char_length(g->>'name') > 60 then return 'name too long'; end if;

  if rarity = 'unique' then
    declare
      u jsonb := r->'uniques'->coalesce(unique_id, '');
      m_item jsonb;
      m_def jsonb;
      val int;
      r_pair jsonb;
      idx int;
    begin
      if u is null then return 'unknown unique'; end if;
      if u->>'baseId' is distinct from base_id then return 'wrong base for this unique'; end if;
      if jsonb_array_length(g->'prefixes') + jsonb_array_length(g->'suffixes') <> jsonb_array_length(u->'mods') then
        return 'modifiers do not match this unique';
      end if;
      for m_item in select * from jsonb_array_elements((g->'prefixes') || (g->'suffixes')) loop
        select elem into m_def from jsonb_array_elements(u->'mods') elem where elem->>'affixId' = m_item->>'affixId';
        if m_def is null then return 'modifiers do not match this unique'; end if;
        if m_def ? 'ranges' then
          if jsonb_array_length(m_item->'values') <> jsonb_array_length(m_def->'ranges') then
            return 'modifiers do not match this unique';
          end if;
          for idx in 0 .. jsonb_array_length(m_item->'values') - 1 loop
            val := (m_item->'values'->idx)::int;
            r_pair := m_def->'ranges'->idx;
            if val < (r_pair->0)::int or val > (r_pair->1)::int then
              return 'modifiers do not match this unique';
            end if;
          end loop;
        elsif m_def ? 'values' then
          if (m_item->'values') is distinct from (m_def->'values') then
            return 'modifiers do not match this unique';
          end if;
        end if;
      end loop;
    end;
    return null;
  end if;

  if unique_id is not null then return 'only a unique can name a unique'; end if;
  if g->>'name' is not null and g->>'name' !~ '^[A-Za-z'' -]+$' then return 'bad name'; end if;
  max_side := case rarity when 'normal' then 0 when 'magic' then 1 else 3 end;

  foreach side in array array['prefix', 'suffix'] loop
    mods := g->(side || 'es');
    if jsonb_array_length(mods) > max_side then return 'too many modifiers'; end if;
    for mod in select * from jsonb_array_elements(mods) loop
      affix := r->'affixes'->(mod->>'affixId');
      if affix is null then return 'unknown modifier'; end if;
      if affix->>'kind' is distinct from side then return 'modifier on the wrong side'; end if;
      if (affix->>'uniqueOnly')::boolean then return 'unique-only modifier'; end if;
      if not exists (select 1 from jsonb_array_elements_text(base->'tags') t where affix->'tags' ? t) then
        return 'modifier cannot roll on this item type';
      end if;
      if (affix->>'group') = any(groups) then return 'two modifiers of one type'; end if;
      groups := groups || (affix->>'group');
      if jsonb_typeof(mod->'tier') is distinct from 'number' then return 'bad modifier tier'; end if;
      tier_i := (mod->>'tier')::int;
      tier := affix->'tiers'->tier_i;
      if tier_i < 0 or tier is null then return 'bad modifier tier'; end if;
      if (mod->>'crafted')::boolean then
        crafted := crafted + 1;
      elsif (tier->>'ilvl')::int > ilvl then
        return 'modifier tier above the item level';
      end if;
      vals := mod->'values';
      ranges := tier->'ranges';
      if jsonb_typeof(vals) is distinct from 'array' or jsonb_array_length(vals) <> jsonb_array_length(ranges) then
        return 'bad modifier values';
      end if;
      for i in 0 .. jsonb_array_length(ranges) - 1 loop
        if jsonb_typeof(vals->i) is distinct from 'number'
          or (vals->>i)::numeric < (ranges->i->>0)::numeric
          or (vals->>i)::numeric > (ranges->i->>1)::numeric then
          return 'modifier value out of range';
        end if;
      end loop;
    end loop;
  end loop;
  if crafted > 1 then return 'more than one crafted modifier'; end if;
  return null;
end $$;

-- Is this a real item the game could have made? Null means fine, otherwise why not.
create or replace function public.market_item_problem_using(item jsonb, r jsonb)
  returns text language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  key text;
  ilvl int;
  problem text;
begin
  if r is null then return 'the market has no item rules yet'; end if;
  if jsonb_typeof(item) is distinct from 'object' then return 'not an item'; end if;
  if pg_column_size(item) > 16000 then return 'item too large'; end if;
  for key in select jsonb_object_keys(item) loop
    if not key = any(array['uid', 'baseId', 'ilvl', 'rarity', 'name', 'prefixes', 'suffixes', 'uniqueId', 'impression', 'rune', 'honed']) then
      return 'unknown item field';
    end if;
  end loop;
  if r->'bases'->(item->>'baseId') is null then return 'unknown item base'; end if;
  if jsonb_typeof(item->'ilvl') is distinct from 'number' then return 'bad item level'; end if;
  ilvl := (item->>'ilvl')::int;
  if ilvl < 1 or ilvl > 200 then return 'bad item level'; end if;
  if item->>'rune' is not null and not r->'runes' ? (item->>'rune') then return 'unknown rune'; end if;
  if item->>'honed' is not null and r->'affixes'->(item->>'honed') is null then return 'unknown honed modifier'; end if;
  problem := market_gear_problem(r, item->>'baseId', ilvl, item->>'uniqueId', item);
  if problem is not null or item->'impression' is null then return problem; end if;
  return market_gear_problem(r, item->>'baseId', ilvl, item->>'uniqueId', item->'impression');
end $$;

create or replace function public.market_item_problem(item jsonb)
  returns text language sql stable security definer set search_path = public, pg_temp as $$
  select market_item_problem_using(item,(select rules from market_rules where id=1));
$$;

-- ---------- one market per realm ----------

-- Hardcore, Classic and Hardcore Classic each trade apart, so money and items only ever land back in the realm they
-- came from. Solo Self-Found characters don't trade. The older versions of these functions go, or they'd stay callable.
alter table public.market_inbox add column if not exists realm text not null default 'standard';
drop index if exists market_inbox_user_idx;
create index if not exists market_inbox_user_idx on public.market_inbox (user_id, realm) where collected_at is null;

drop function if exists public.market_trader();
drop function if exists public.market_send(uuid, text, bigint, jsonb, text);
drop function if exists public.market_browse(text, text, text, text, text, text, int);
drop function if exists public.market_list(uuid, jsonb, text, text, bigint);
drop function if exists public.market_buy(uuid, bigint, text, bigint);
drop function if exists public.market_bid(uuid, bigint, text, bigint);
drop function if exists public.market_collect();

-- ---------- inner steps (not callable by players) ----------

-- Signed in, not banned, past Act 1 in this realm. Everything except collecting and cancelling goes through this.
create or replace function public.market_trader(p_realm text default 'standard') returns uuid
  language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in to use the market'; end if;
  if p_realm is null or p_realm not in ('standard', 'hardcore', 'classic', 'hardcore-classic') then raise exception 'That market doesn''t exist'; end if;
  if exists (select 1 from market_bans where user_id = me) then raise exception 'You are banned from the market'; end if;
  if not exists (select 1 from characters where user_id = me and coalesce(summary->>'realm', 'standard') = p_realm and coalesce((summary->>'act1Cleared')::boolean, false)) then
    raise exception 'Clear Act 1 to use the market';
  end if;
  return me;
end $$;

create or replace function public.market_send(who uuid, cur text, amt bigint, gear jsonb, what text, to_realm text)
  returns void language sql security definer set search_path = public, pg_temp as $$
  insert into market_inbox (user_id, currency, amount, item, note, realm) values (who, cur, amt, gear, what, to_realm);
$$;

-- The sale: 10% rounded down disappears, the rest and the item go to their new owners.
create or replace function public.market_close_sale(l market_listings, buyer uuid, paid bigint)
  returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update market_listings set status = 'sold', sold_to = buyer, sold_at = now() where id = l.id;
  perform market_send(l.seller, l.currency, paid - paid / 10, null, 'Sold ' || l.item_name, l.realm);
  if buyer is not null then perform market_send(buyer, null, null, l.item, 'Bought ' || l.item_name, l.realm);
  end if;
end $$;

-- Finish anything whose time is up. There's no timer on the server: every visit does this first.
create or replace function public.market_settle() returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
declare l market_listings;
begin
  for l in select * from market_listings where status = 'active' and ends_at <= now() order by ends_at limit 100 for update skip locked loop
    if l.high_bid is not null then
      perform market_close_sale(l, l.high_bidder, l.high_bid);
    else
      update market_listings set status = 'expired' where id = l.id;
      perform market_send(l.seller, null, null, l.item, 'Listing ended: ' || l.item_name, l.realm);
    end if;
  end loop;
end $$;

create or replace function public.market_claim_op(op uuid, me uuid) returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if op is null then raise exception 'Missing request id'; end if;
  -- Serialize successful paid requests per account across tabs and realms; failed transactions roll back.
  perform pg_advisory_xact_lock(hashtextextended(me::text, 0));
  if (select count(*) from market_ops where user_id = me and created_at > now() - interval '1 minute') >= 60 then
    raise exception 'Too many market requests; try again in a minute';
  end if;
  insert into market_ops (op_id, user_id) values (op, me);
exception when unique_violation then
  raise exception 'That request already ran';
end $$;

create or replace function public.market_check_currency(cur text) returns void
  language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from market_rules, jsonb_array_elements_text(rules->'currencies') c where c = cur) then
    raise exception 'That can''t be used as a price';
  end if;
end $$;

-- ---------- what players can do ----------

create or replace function public.market_browse(
  p_scope text default 'all', p_text text default null, p_slot text default null, p_rarity text default null,
  p_currency text default null, p_mode text default null, p_offset int default 0, p_realm text default 'standard'
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  out_rows jsonb;
begin
  if p_realm is null or p_realm not in ('standard', 'hardcore', 'classic', 'hardcore-classic') then raise exception 'That market doesn''t exist'; end if;
  if p_scope is null or p_scope not in ('all', 'mine', 'bids') then raise exception 'Unknown market filter'; end if;
  if char_length(p_text) > 200 or p_offset > 10000 then raise exception 'Market search is too large'; end if;
  perform market_settle();
  select coalesce(jsonb_agg(row_to_json(t)), '[]') into out_rows from (
    select l.id, l.item, l.item_name, l.mode, l.currency, l.price, l.high_bid, l.ends_at,
           l.seller = me as mine, l.high_bidder = me as winning
      from market_listings l
     where l.status = 'active' and l.realm = p_realm and l.ends_at > now()
       and case p_scope when 'mine' then l.seller = me when 'bids' then l.high_bidder = me else true end
       and (p_text is null or l.item_name ilike '%' || replace(replace(replace(p_text, '\', '\\'), '%', '\%'), '_', '\_') || '%')
       and (p_slot is null or l.slot = p_slot)
       and (p_rarity is null or l.rarity = p_rarity)
       and (p_currency is null or l.currency = p_currency)
       and (p_mode is null or l.mode = p_mode)
     order by l.created_at desc, l.id desc
     limit 60 offset greatest(p_offset, 0)
  ) t;
  return out_rows;
end $$;

create or replace function public.market_list(p_op uuid, p_item jsonb, p_mode text, p_currency text, p_price bigint, p_realm text default 'standard')
  returns bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := market_trader(p_realm);
  problem text := market_item_problem(p_item);
  r jsonb;
  new_id bigint;
begin
  if problem is not null then raise exception 'This item can''t be listed: %', problem; end if;
  if p_mode is null or p_mode not in ('buy', 'auction') then raise exception 'Choose buy now or auction'; end if;
  perform market_check_currency(p_currency);
  if p_price is null or p_price < 1 or p_price > 1000000000000 then raise exception 'That price won''t work'; end if;
  -- one lock per seller, so two tabs can't slip past the limit together
  perform pg_advisory_xact_lock(hashtextextended(me::text, 0));
  if (select count(*) from market_listings where seller = me and realm = p_realm and status = 'active') >= 20 then
    raise exception 'You already have 20 listings up';
  end if;
  perform market_claim_op(p_op, me);
  select rules into r from market_rules where id = 1;
  insert into market_listings (realm, seller, item, item_name, slot, rarity, ilvl, mode, currency, price, ends_at)
  values (p_realm, me, p_item - 'uid', coalesce(r->'uniques'->(p_item->>'uniqueId')->>'name', p_item->>'name', r->'bases'->(p_item->>'baseId')->>'name'),
          r->'bases'->(p_item->>'baseId')->>'slot', p_item->>'rarity', (p_item->>'ilvl')::int, p_mode, p_currency, p_price,
          now() + case p_mode when 'buy' then interval '7 days' else interval '24 hours' end)
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.market_buy(p_op uuid, p_id bigint, p_currency text, p_amount bigint, p_realm text default 'standard')
  returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := market_trader(p_realm);
  l market_listings;
begin
  select * into l from market_listings where id = p_id for update;
  if l.id is null or l.realm <> p_realm or l.status <> 'active' or l.ends_at <= now() then raise exception 'That listing is gone'; end if;
  if l.mode <> 'buy' then raise exception 'That listing is an auction'; end if;
  if l.seller = me then raise exception 'That''s your own listing'; end if;
  if l.currency is distinct from p_currency or l.price is distinct from p_amount then raise exception 'The price doesn''t match'; end if;
  perform market_claim_op(p_op, me);
  perform market_close_sale(l, me, l.price);
end $$;

create or replace function public.market_bid(p_op uuid, p_id bigint, p_currency text, p_amount bigint, p_realm text default 'standard')
  returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := market_trader(p_realm);
  l market_listings;
begin
  select * into l from market_listings where id = p_id for update;
  if l.id is null or l.realm <> p_realm or l.status <> 'active' or l.ends_at <= now() then raise exception 'That auction is over'; end if;
  if l.mode <> 'auction' then raise exception 'That listing isn''t an auction'; end if;
  if l.seller = me then raise exception 'That''s your own listing'; end if;
  if l.high_bidder = me then raise exception 'You''re already the highest bidder'; end if;
  if l.currency is distinct from p_currency then raise exception 'The price doesn''t match'; end if;
  if p_amount is null or p_amount < market_min_bid(l.price, l.high_bid) then raise exception 'Someone bid first: the lowest bid is now %', market_min_bid(l.price, l.high_bid); end if;
  if p_amount > 1000000000000 then raise exception 'That price won''t work'; end if;
  perform market_claim_op(p_op, me);
  if l.high_bidder is not null then perform market_send(l.high_bidder, l.currency, l.high_bid, null, 'Outbid on ' || l.item_name, l.realm); end if;
  update market_listings
     set high_bid = p_amount, high_bidder = me,
         ends_at = case when ends_at - now() < interval '5 minutes' then ends_at + interval '5 minutes' else ends_at end
   where id = l.id;
end $$;

-- The next bid is at least 5% more, and always at least 1 more.
create or replace function public.market_min_bid(p_price bigint, p_high bigint) returns bigint
  language sql immutable as $$
  select case when p_high is null then p_price else p_high + greatest(1, ceil(p_high * 0.05)::bigint) end
$$;

create or replace function public.market_cancel(p_id bigint) returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  l market_listings;
begin
  if me is null then raise exception 'Sign in to use the market'; end if;
  select * into l from market_listings where id = p_id for update;
  if l.id is null or l.seller <> me then raise exception 'That isn''t your listing'; end if;
  if l.status <> 'active' then raise exception 'That listing is gone'; end if;
  if l.high_bid is not null then raise exception 'An auction with a bid can''t be cancelled'; end if;
  update market_listings set status = 'cancelled' where id = l.id;
  perform market_send(me, null, null, l.item, 'Cancelled: ' || l.item_name, l.realm);
end $$;

-- Hand over everything waiting. Allowed for a banned player, so they still get what they're owed.
create or replace function public.market_collect(p_realm text default 'standard') returns jsonb
  language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  out_rows jsonb;
begin
  if me is null then raise exception 'Sign in to use the market'; end if;
  perform market_settle();
  with taken as (
    update market_inbox set collected_at = now() where user_id = me and realm = p_realm and collected_at is null
    returning id, currency, amount, item, note
  ) select coalesce(jsonb_agg(row_to_json(taken)), '[]') into out_rows from taken;
  return out_rows;
end $$;

-- Did this paid step finish? A refused step rolled back, so it was never recorded.
create or replace function public.market_op_done(p_op uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from market_ops where op_id = p_op and user_id = auth.uid())
$$;

-- ---------- admin ----------

create or replace function public.market_admin_check() returns void
  language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
end $$;

create or replace function public.market_rules_version() returns text
  language sql stable security definer set search_path = public, pg_temp as $$
  select version from market_rules where id = 1
$$;

create or replace function public.market_set_rules(p_version text, p_rules jsonb) returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform market_admin_check();
  insert into market_rules (id, version, rules) values (1, p_version, p_rules)
  on conflict (id) do update set version = excluded.version, rules = excluded.rules, updated_at = now();
end $$;

create or replace function public.market_admin_list(p_status text default 'active') returns jsonb
  language plpgsql security definer set search_path = public, pg_temp as $$
declare out_rows jsonb;
begin
  perform market_admin_check();
  select coalesce(jsonb_agg(row_to_json(t)), '[]') into out_rows from (
    select l.id, l.seller, l.item, l.item_name, l.mode, l.currency, l.price, l.high_bid, l.status, l.ends_at, l.created_at,
           exists (select 1 from market_bans b where b.user_id = l.seller) as seller_banned
      from market_listings l where p_status = 'all' or l.status = p_status
     order by l.created_at desc limit 200
  ) t;
  return out_rows;
end $$;

-- Take a listing down: the item goes back to the seller and any bid back to the bidder.
create or replace function public.market_admin_remove(p_id bigint) returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
declare l market_listings;
begin
  perform market_admin_check();
  select * into l from market_listings where id = p_id for update;
  if l.id is null or l.status <> 'active' then raise exception 'That listing is gone'; end if;
  update market_listings set status = 'removed' where id = l.id;
  perform market_send(l.seller, null, null, l.item, 'Removed by an admin: ' || l.item_name, l.realm);
  if l.high_bidder is not null then
    perform market_send(l.high_bidder, l.currency, l.high_bid, null, 'Refund: ' || l.item_name || ' was removed', l.realm);
  end if;
end $$;

create or replace function public.market_admin_ban(p_user uuid, p_banned boolean) returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform market_admin_check();
  if p_banned then insert into market_bans (user_id) values (p_user) on conflict do nothing;
  else delete from market_bans where user_id = p_user;
  end if;
end $$;

-- ---------- who may call what ----------

-- Supabase gives anon and authenticated every new function by default, so all three have to be named here.
revoke all on function
  public.market_gear_problem(jsonb, text, int, text, jsonb),
  public.market_item_problem(jsonb),
  public.market_item_problem_using(jsonb,jsonb),
  public.market_trader(text),
  public.market_send(uuid, text, bigint, jsonb, text, text),
  public.market_close_sale(market_listings, uuid, bigint),
  public.market_settle(),
  public.market_claim_op(uuid, uuid),
  public.market_check_currency(text),
  public.market_admin_check(),
  public.market_browse(text, text, text, text, text, text, int, text),
  public.market_list(uuid, jsonb, text, text, bigint, text),
  public.market_buy(uuid, bigint, text, bigint, text),
  public.market_bid(uuid, bigint, text, bigint, text),
  public.market_cancel(bigint),
  public.market_collect(text),
  public.market_op_done(uuid),
  public.market_rules_version(),
  public.market_set_rules(text, jsonb),
  public.market_admin_list(text),
  public.market_admin_remove(bigint),
  public.market_admin_ban(uuid, boolean)
from public, anon, authenticated;

grant execute on function public.market_browse(text, text, text, text, text, text, int, text) to anon, authenticated;
grant execute on function public.market_list(uuid, jsonb, text, text, bigint, text) to authenticated;
grant execute on function public.market_buy(uuid, bigint, text, bigint, text) to authenticated;
grant execute on function public.market_bid(uuid, bigint, text, bigint, text) to authenticated;
grant execute on function public.market_cancel(bigint) to authenticated;
grant execute on function public.market_collect(text) to authenticated;
grant execute on function public.market_op_done(uuid) to authenticated;
grant execute on function public.market_rules_version() to authenticated;
grant execute on function public.market_set_rules(text, jsonb) to authenticated;
grant execute on function public.market_admin_list(text) to authenticated;
grant execute on function public.market_admin_remove(bigint) to authenticated;
grant execute on function public.market_admin_ban(uuid, boolean) to authenticated;
