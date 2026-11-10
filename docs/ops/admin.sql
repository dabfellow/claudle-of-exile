-- Admin operations. Apply after SETUP's tables and market.sql. Safe to reapply.
-- No client role can inspect another player's data or perform rescue/grant actions without is_admin().
begin;
revoke create on schema public from public, anon, authenticated;

create table if not exists public.admin_audit (
  op uuid primary key,
  actor uuid not null references auth.users(id),
  target_user uuid references auth.users(id) on delete set null,
  action text not null,
  reason text not null check (char_length(reason) between 1 and 2000),
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.admin_save_backups (
  id bigint generated always as identity primary key,
  character_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  row_data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_backups_character_idx on public.admin_save_backups(character_id, created_at desc);
create table if not exists public.admin_mail (
  id uuid primary key references public.admin_audit(op),
  user_id uuid not null references auth.users(id) on delete cascade,
  realm text not null,
  message text not null check (char_length(message) between 1 and 2000),
  compensation boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists admin_mail_user_idx on public.admin_mail(user_id, created_at desc);
create table if not exists public.demo_counters (
  session_id uuid not null,
  event text not null check (event in ('demo_started','demo_act1_boss_killed','demo_converted_to_account')),
  created_at timestamptz not null default now(),
  primary key (session_id,event)
);
alter table public.admin_audit enable row level security;
alter table public.admin_save_backups enable row level security;
alter table public.admin_mail enable row level security;
alter table public.demo_counters enable row level security;
revoke all on public.admin_audit, public.admin_save_backups, public.admin_mail, public.demo_counters from public, anon, authenticated;
revoke all on sequence public.admin_save_backups_id_seq from public, anon, authenticated;
drop policy if exists "own admin mail" on public.admin_mail;
create policy "own admin mail" on public.admin_mail for select to authenticated using(user_id = auth.uid());
drop policy if exists "mark own admin mail" on public.admin_mail;
create policy "mark own admin mail" on public.admin_mail for update to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid());
grant select, update(read_at) on public.admin_mail to authenticated;

create or replace function public.admin_require() returns void language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if public.is_admin() is distinct from true then raise exception 'Admins only'; end if;
end $$;

create or replace function public.admin_number(value text) returns numeric language sql immutable as $$
  select case when value ~ '^[0-9]{1,12}(\.[0-9]{1,4})?$' then value::numeric else 0 end;
$$;

create or replace function public.admin_version(value text) returns int[] language sql immutable as $$
  select case when value ~ '^[0-9]{1,6}\.[0-9]{1,6}\.[0-9]{1,6}$' then string_to_array(value,'.')::int[] else null end;
$$;

-- Store the previous character state at most once per five minutes; retain ten restore points per character.
create or replace function public.admin_backup_save() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if lower(trim(old.class_id)) <> 'account' and old.id not like 'account:%' and exists(select 1 from auth.users where id=old.user_id) and
    (tg_op = 'DELETE' or old.save is distinct from new.save) and
    (tg_op='DELETE' or not exists(select 1 from admin_save_backups where character_id=old.id and created_at > now()-interval '5 minutes')) then
    insert into admin_save_backups(character_id,user_id,row_data) values(old.id,old.user_id,to_jsonb(old));
    delete from admin_save_backups where character_id=old.id and id not in
      (select id from admin_save_backups where character_id=old.id order by created_at desc,id desc limit 10);
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists admin_backup_character on public.characters;
create trigger admin_backup_character before update or delete on public.characters for each row execute function public.admin_backup_save();

-- Diagnostics need the server's receipt time, not a timestamp supplied by a player's clock.
create or replace function public.admin_stamp_save() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin new.updated_at:=now(); return new; end $$;
drop trigger if exists admin_stamp_character on public.characters;
create trigger admin_stamp_character before insert or update on public.characters for each row execute function public.admin_stamp_save();

create or replace function public.admin_players(p_search text default '',p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
  perform admin_require();
  if char_length(p_search)>200 or p_offset<0 or p_offset>100000 then raise exception 'Invalid search'; end if;
  with deleted_candidates as (
    select distinct on(b.character_id) b.row_data as data from admin_save_backups b where not exists(select 1 from characters c where c.id=b.character_id)
    order by b.character_id,b.created_at desc,b.id desc
  ), candidates as (
    select to_jsonb(c) data,false deleted from characters c where lower(trim(c.class_id))<>'account' and c.id not like 'account:%'
    union all
    select data,true from deleted_candidates
  )
  select coalesce(jsonb_agg(to_jsonb(q)),'[]') into result from (
    select c.data->>'id' as id,u.id as user_id,c.data->>'name' as name,lower(trim(c.data->>'class_id')) as class_id,
      c.data->'summary' as summary,c.data->>'updated_at' as updated_at,c.deleted,
      u.email,c.data->'save'->'combat'->>'zoneId' as zone,admin_number(c.data->'save'->>'clock') as playtime_ms,
      admin_number(c.data->'save'->'lifetime'->>'deaths') as deaths,
      (select count(*) from jsonb_array_elements_text(case when jsonb_typeof(c.data->'save'->'bossesDefeated')='array' then c.data->'save'->'bossesDefeated' else '[]'::jsonb end) b
        where b in ('sanctum','burningthrone','highaltar','giantsthrone','maelstrom','shatteredthrone')) as acts
    from candidates c join auth.users u on u.id::text=c.data->>'user_id'
    where p_search='' or position(lower(p_search) in lower((c.data->>'name')||' '||coalesce(u.email,'')||' '||(c.data->>'id')||' '||u.id::text))>0
    order by (c.data->>'updated_at')::timestamptz desc,c.data->>'id' limit 50 offset p_offset
  ) q;
  return result;
end $$;

create or replace function public.admin_inspect(p_id text) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb; c characters; deleted boolean:=false;
begin
  perform admin_require();
  select * into c from characters where id=p_id and lower(trim(class_id))<>'account' and id not like 'account:%';
  if not found then
    select (jsonb_populate_record(null::characters,b.row_data)).* into c from admin_save_backups b where b.character_id=p_id order by b.created_at desc,b.id desc limit 1;
    if not found then raise exception 'Character not found'; end if;
    deleted:=true;
  end if;
  select jsonb_build_object('character',to_jsonb(c),'email',u.email,'account',a.save,
    'deleted',deleted,
    'backups',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'created_at',b.created_at,'summary',b.row_data->'summary') order by b.created_at desc,b.id desc) from admin_save_backups b where b.character_id=c.id),'[]'))
    into result from auth.users u
    left join characters a on a.user_id=c.user_id and a.id='account:'||coalesce(c.summary->>'realm','standard')||':'||c.user_id::text
    where u.id=c.user_id;
  if result is null then raise exception 'Character not found'; end if;
  return result;
end $$;

-- Recover to a NEW character. Never overwrite a save an open browser may upload again.
create or replace function public.admin_restore(p_backup bigint,p_op uuid,p_reason text) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare b admin_save_backups; result text; restored jsonb; summary jsonb; stamp numeric:=floor(extract(epoch from now())*1000);
begin
  perform admin_require();
  if p_op is null or p_reason is null or char_length(trim(p_reason)) not between 1 and 2000 then raise exception 'A request id and reason are required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_op::text,1));
  select detail->>'character_id' into result from admin_audit where op=p_op and actor=auth.uid() and action='restore';
  if found then return result; end if;
  select * into b from admin_save_backups where id=p_backup;
  if not found then raise exception 'Backup not found'; end if;
  result:='recovered-'||gen_random_uuid()::text;
  restored:=jsonb_set(b.row_data->'save','{character,id}',to_jsonb(result));
  restored:=jsonb_set(restored,'{character,name}',to_jsonb(left(coalesce(b.row_data->>'name','Character'),28)||' (restored)'));
  restored:=jsonb_set(restored,'{lastSaved}',to_jsonb(stamp));
  restored:=jsonb_set(jsonb_set(restored,'{combat}','null'),'{action}','null');
  restored:=jsonb_set(restored-'fallen'-'unmerged'-'unpooled'-'account','{life}',to_jsonb(greatest(1,admin_number(restored->>'life'))));
  if jsonb_typeof(restored->'maps')='object' then restored:=jsonb_set(jsonb_set(restored,'{maps,run}','null'),'{maps,auto}','null'); end if;
  summary:=(b.row_data->'summary')||jsonb_build_object('id',result,'name',restored->'character'->>'name','lastPlayed',stamp);
  -- SSF copies get their own realm; shared stash restoration is deliberately not implied.
  if restored->'character'->'challenge'->>'ssf'='true' then summary:=summary||jsonb_build_object('realm','ssf-'||result); end if;
  insert into characters(id,user_id,name,class_id,summary,save,updated_at)
    values(result,b.user_id,restored->'character'->>'name',b.row_data->>'class_id',summary,restored,now());
  insert into admin_audit(op,actor,target_user,action,reason,detail)
    values(p_op,auth.uid(),b.user_id,'restore',trim(p_reason),jsonb_build_object('backup_id',p_backup,'character_id',result));
  return result;
end $$;

create or replace function public.admin_message(p_op uuid,p_user uuid,p_realm text,p_message text,p_feedback bigint default null,p_resolve boolean default false,p_currency text default null,p_amount bigint default null,p_item jsonb default null) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare problem text; r jsonb; compensation boolean:=p_currency is not null or p_item is not null;
begin
  perform admin_require();
  if p_op is null or p_user is null or p_realm is null or p_realm='' or p_message is null or char_length(trim(p_message)) not between 1 and 2000 then raise exception 'Recipient, realm, message and request id are required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_op::text,1));
  if exists(select 1 from admin_audit where op=p_op and actor=auth.uid() and action='message') then return; end if;
  if not exists(select 1 from auth.users where id=p_user) then raise exception 'Player not found'; end if;
  if p_realm not in ('standard','hardcore','classic','hardcore-classic') and not exists(select 1 from characters where user_id=p_user and summary->>'realm'=p_realm) then raise exception 'Recipient realm not found'; end if;
  if p_feedback is not null and not exists(select 1 from feedback where id=p_feedback and user_id=p_user) then raise exception 'Feedback recipient does not match'; end if;
  if p_currency is not null then
    perform market_check_currency(p_currency);
    if p_amount is null or p_amount<1 or p_amount>1000000 then raise exception 'Compensation must be between 1 and 1000000'; end if;
  elsif p_amount is not null then raise exception 'Choose a currency'; end if;
  if p_item is not null then
    select rules||jsonb_build_object('uniques',coalesce(rules->'uniques','{}')||coalesce(rules->'adminUniques','{}')) into r from market_rules where id=1;
    problem:=market_item_problem_using(p_item,r);
    if problem is not null then raise exception 'Invalid compensation item: %',problem; end if;
  end if;
  insert into admin_audit(op,actor,target_user,action,reason,detail) values(p_op,auth.uid(),p_user,'message',trim(p_message),jsonb_build_object('feedback_id',p_feedback,'realm',p_realm,'currency',p_currency,'amount',p_amount,'item',p_item));
  insert into admin_mail(id,user_id,realm,message,compensation) values(p_op,p_user,p_realm,trim(p_message),compensation);
  if p_currency is not null then perform market_send(p_user,p_currency,p_amount,null,'Admin: '||left(p_message,120),p_realm); end if;
  if p_item is not null then perform market_send(p_user,null,null,p_item-'uid','Admin: '||left(p_message,120),p_realm); end if;
  if p_resolve and p_feedback is not null then update feedback set status='resolved' where id=p_feedback; end if;
end $$;

create or replace function public.record_demo(p_session uuid,p_event text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_session is null or p_event is null or p_event not in ('demo_started','demo_act1_boss_killed','demo_converted_to_account') then raise exception 'Invalid demo counter'; end if;
  insert into demo_counters(session_id,event) values(p_session,p_event) on conflict do nothing;
end $$;

-- Custom event metadata is public to players; only existing admin policies may write it.
alter table public.live_events add column if not exists name text check(char_length(name) between 1 and 80);
alter table public.live_events add column if not exists target text check(target in ('xp','combatXp','gatheringXp','gatheringSpeed','currencyDrops','vendorSpeed','craftingCost','loot','broadcast'));
alter table public.live_events add column if not exists multiplier numeric check(multiplier between 0.5 and 3);
alter table public.live_events add column if not exists banner text check(char_length(banner)<=500);
alter table public.live_events add column if not exists blurb text check(char_length(blurb)<=200);
alter table public.live_events drop constraint if exists admin_event_schedule;
alter table public.live_events add constraint admin_event_schedule check(starts_at is null or ends_at is null or ends_at>starts_at) not valid;
alter table public.live_events drop constraint if exists admin_event_modifier;
alter table public.live_events add constraint admin_event_modifier check(target is null or (name is not null and char_length(trim(name))>0 and multiplier is not null and
  ((target='broadcast' and multiplier=1) or (target='craftingCost' and multiplier between 0.5 and 1) or (target not in ('broadcast','craftingCost') and multiplier between 1.25 and 3)))) not valid;

create or replace function public.admin_log_event() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is not null then
    perform admin_require();
    insert into admin_audit(op,actor,action,reason,detail) values(gen_random_uuid(),auth.uid(),'event','Update live event',jsonb_build_object('event',to_jsonb(new)));
  end if;
  return new;
end $$;
drop trigger if exists admin_log_live_event on public.live_events;
create trigger admin_log_live_event after insert or update on public.live_events for each row execute function public.admin_log_event();
alter table public.feedback drop constraint if exists feedback_context_check;
-- Bounded diagnostic snapshot. Never attach auth/session tokens or another player's account.
alter table public.feedback drop constraint if exists feedback_context_size;
alter table public.feedback add constraint feedback_context_size check(pg_column_size(context)<=262144) not valid;
drop policy if exists "anyone can send feedback" on public.feedback;
create policy "anyone can send feedback" on public.feedback for insert to anon,authenticated
  with check(status='new' and (user_id is null or user_id=auth.uid()) and pg_column_size(context)<=262144);

-- Feedback can't be used to fill the database: each signed-in player may send 10 an hour, guests (who can't be
-- told apart) 30 an hour between them, and the table stops accepting new rows at 20000. Runs as the table owner
-- because players can't read the table, so a count as the player would always be zero.
alter table public.feedback drop constraint if exists feedback_message_size;
alter table public.feedback add constraint feedback_message_size check(char_length(message)<=5000) not valid;
create or replace function public.feedback_limit() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if (select count(*) from feedback) >= 20000 then raise exception 'Feedback is full right now. Please try again later.'; end if;
  if new.user_id is not null then
    if (select count(*) from feedback where user_id=new.user_id and created_at>now()-interval '1 hour') >= 10 then
      raise exception 'You have sent a lot of feedback this hour. Please try again later.';
    end if;
  elsif (select count(*) from feedback where user_id is null and created_at>now()-interval '1 hour') >= 30 then
    raise exception 'Too much feedback is coming in right now. Please try again later, or sign in to send it.';
  end if;
  return new;
end $$;
drop trigger if exists feedback_limit on public.feedback;
create trigger feedback_limit before insert on public.feedback for each row execute function public.feedback_limit();

create or replace function public.admin_feedback(p_status text default 'all',p_kind text default 'all',p_version text default 'all') returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
  perform admin_require();
  select coalesce(jsonb_agg(to_jsonb(q)),'[]') into result from (
    select f.*,u.email,coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',u.raw_user_meta_data->>'user_name') as account_name,c.id as verified_character_id from feedback f left join auth.users u on u.id=f.user_id
    left join characters c on c.user_id=f.user_id and c.id=f.context->>'characterId' and c.id not like 'account:%' and lower(trim(c.class_id))<>'account'
    where (p_status='all' or f.status=p_status) and (p_kind='all' or f.kind=p_kind) and (p_version='all' or f.context->>'version'=p_version)
    order by f.created_at desc,f.id desc limit 200
  ) q;
  return result;
end $$;

create or replace function public.admin_resolve_before(p_version text) returns int language plpgsql security definer set search_path=public,pg_temp as $$
declare n int;
begin
  perform admin_require();
  if admin_version(p_version) is null then raise exception 'Use a numeric release version'; end if;
  update feedback set status='resolved' where status<>'resolved' and admin_version(context->>'version') < admin_version(p_version);
  get diagnostics n=row_count;
  insert into admin_audit(op,actor,action,reason,detail) values(gen_random_uuid(),auth.uid(),'bulk_resolve','Resolve older feedback',jsonb_build_object('before',p_version,'count',n));
  return n;
end $$;

create or replace function public.admin_overview() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
  perform admin_require();
  with chars as (select * from characters where lower(trim(class_id))<>'account' and id not like 'account:%'),
  deleted_deaths as (select distinct on(b.character_id) b.row_data->'save' as save from admin_save_backups b
    where not exists(select 1 from characters c where c.id=b.character_id) order by b.character_id,b.created_at desc,b.id desc),
  death_sources as (select save from chars union all select save from deleted_deaths),
  funnel as (select n,boss from (values (1,'sanctum'),(2,'burningthrone'),(3,'highaltar'),(4,'giantsthrone'),(5,'maelstrom'),(6,'shatteredthrone')) t(n,boss))
  select jsonb_build_object(
    'accounts',(select count(*) from auth.users),'new_accounts_week',(select count(*) from auth.users where created_at>now()-interval '7 days'),
    'characters',(select count(*) from chars),'players',(select count(distinct user_id) from chars),
    'active_day',(select count(distinct user_id) from chars where updated_at>now()-interval '1 day'),
    'active_week',(select count(distinct user_id) from chars where updated_at>now()-interval '7 days'),
    'by_class',(select coalesce(jsonb_object_agg(id,n),'{}') from (select lower(trim(class_id)) id,count(*) n from chars group by lower(trim(class_id))) q),
    'by_level',(select coalesce(jsonb_object_agg(bucket,n),'{}') from (select (floor(least(100,admin_number(summary->>'combatLevel'))/5)*5)::int bucket,count(*) n from chars group by 1) q),
    'funnel',(select jsonb_agg(jsonb_build_object('act',n,'count',(select count(*) from chars where coalesce(save->'bossesDefeated','[]') ? boss)) order by n) from funnel),
    'maps',(select count(*) from chars where summary->>'mapsStarted'='true' or admin_number(save->'maps'->'tally'->>'runs')>0 or jsonb_typeof(save->'maps'->'run')='object'),
    'death_zones',(select coalesce(jsonb_object_agg(zone,n),'{}') from (select z.key zone,sum(admin_number(z.value)) n from death_sources c cross join lateral jsonb_each_text(case when jsonb_typeof(c.save->'lifetime'->'deathZones')='object' then c.save->'lifetime'->'deathZones' else '{}'::jsonb end) z group by z.key order by n desc limit 10) q),
    'demos',(select coalesce(jsonb_object_agg(event,n),'{}') from (select event,count(*) n from demo_counters where created_at>now()-interval '30 days' group by event) q),
    'feedback_open',(select count(*) from feedback where status='new'),
    'feedback_week',(select count(*) from feedback where created_at>now()-interval '7 days'),
    'by_realm',(select coalesce(jsonb_object_agg(realm,n),'{}') from (select coalesce(summary->>'realm','standard') realm,count(*) n from chars group by 1) q),
    'last_seen',(select jsonb_build_object('day',count(*) filter (where age<interval '1 day'),'week',count(*) filter (where age>=interval '1 day' and age<interval '7 days'),
      'month',count(*) filter (where age>=interval '7 days' and age<interval '30 days'),'older',count(*) filter (where age>=interval '30 days'))
      from (select now()-max(updated_at) age from chars group by user_id) q),
    'signups_by_day',(select jsonb_agg(jsonb_build_object('day',d::date,'count',(select count(*) from auth.users u where u.created_at>=d and u.created_at<d+interval '1 day')) order by d)
      from generate_series(date_trunc('day',now())-interval '13 days',date_trunc('day',now()),interval '1 day') d),
    'playtime_hours',(select round(coalesce(sum(admin_number(save->>'clock')),0)/3600000.0,1) from chars),
    'median_level',(select percentile_cont(0.5) within group (order by admin_number(summary->>'combatLevel')) from chars),
    'reviews',(select jsonb_build_object('count',count(*),'avg',round(avg(stars)::numeric,1)) from reviews)
  ) into result;
  return result;
end $$;

revoke all on function public.feedback_limit() from public,anon,authenticated;
revoke all on function public.admin_require(),public.admin_number(text),public.admin_version(text),public.admin_backup_save(),public.admin_stamp_save(),public.admin_log_event(),public.admin_players(text,int),public.admin_inspect(text),public.admin_restore(bigint,uuid,text),public.admin_message(uuid,uuid,text,text,bigint,boolean,text,bigint,jsonb),public.record_demo(uuid,text),public.admin_feedback(text,text,text),public.admin_resolve_before(text),public.admin_overview() from public,anon,authenticated;
grant execute on function public.admin_players(text,int),public.admin_inspect(text),public.admin_restore(bigint,uuid,text),public.admin_message(uuid,uuid,text,text,bigint,boolean,text,bigint,jsonb),public.admin_feedback(text,text,text),public.admin_resolve_before(text),public.admin_overview() to authenticated;
grant execute on function public.record_demo(uuid,text) to anon,authenticated;
commit;
