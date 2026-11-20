-- Apply after the characters table and its server timestamp trigger (SETUP.md and admin.sql).
-- An older tab's regular account save must preserve Guild Stash transfers it hasn't seen.
create or replace function public.preserve_guild_stash() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare field text;
begin
  if old.id not like 'account:%' or
     coalesce((old.save->>'guildRev')::bigint, 0) <= coalesce((new.save->>'guildRev')::bigint, 0) then
    return new;
  end if;
  foreach field in array array['guildRev','guildTransfers','bank','maps','stash','overflow','uniqueStash','gems','supportGems','flaskStash'] loop
    if old.save ? field then
      new.save := jsonb_set(new.save, array[field], old.save->field);
    else
      new.save := new.save - field;
    end if;
  end loop;
  new.save := jsonb_set(new.save, '{rev}', to_jsonb(greatest((old.save->>'rev')::bigint + 1, (new.save->>'rev')::bigint)));
  return new;
end $$;

drop trigger if exists preserve_guild_stash on public.characters;
create trigger preserve_guild_stash before update on public.characters
for each row execute function public.preserve_guild_stash();

-- Compare and update both halves of a transfer in one transaction, with the existing owner policies.
create or replace function public.save_guild_stash_transfer(
  p_character jsonb, p_character_stamp timestamptz, p_account jsonb, p_account_stamp timestamptz
) returns timestamptz language plpgsql set search_path = public, pg_temp as $$
declare
  player uuid := auth.uid();
  character_id text := p_character->>'id';
  realm_id text := p_account->>'id';
  realm text := p_account->'save'->>'realm';
  seen_character public.characters%rowtype;
  seen_account public.characters%rowtype;
  written timestamptz;
begin
  if player is null or character_id is null or character_id like 'account:%' or realm is null or
     realm_id is distinct from concat('account:', realm, ':', player) or
     p_character->'summary'->>'realm' is distinct from realm or
     p_character->'save'->'character'->>'id' is distinct from character_id then
    raise exception 'Invalid Guild Stash destination';
  end if;

  select * into seen_account from public.characters where id = realm_id and user_id = player for update;
  if seen_account.updated_at is distinct from p_account_stamp or
     coalesce((p_account->'save'->>'guildRev')::bigint, -1) <> coalesce((seen_account.save->>'guildRev')::bigint, 0) + 1 then
    return null;
  end if;
  select * into seen_character from public.characters where id = character_id and user_id = player for update;
  if seen_character.id is null or seen_character.updated_at is distinct from p_character_stamp or
     coalesce(seen_character.summary->>'realm', 'standard') is distinct from realm then
    return null;
  end if;

  if seen_account.id is null then
    insert into public.characters (id, user_id, name, class_id, summary, save)
      values (realm_id, player, 'Account', 'account', p_account->'summary', p_account->'save')
      on conflict (id) do nothing returning updated_at into written;
    if written is null then return null; end if;
  else
    update public.characters set save = p_account->'save' where id = realm_id;
  end if;
  update public.characters
    set name = p_character->>'name', class_id = p_character->>'class_id', summary = p_character->'summary', save = p_character->'save'
    where id = character_id returning updated_at into written;
  return written;
end $$;

revoke execute on function public.save_guild_stash_transfer(jsonb, timestamptz, jsonb, timestamptz) from public, anon;
grant execute on function public.save_guild_stash_transfer(jsonb, timestamptz, jsonb, timestamptz) to authenticated;
