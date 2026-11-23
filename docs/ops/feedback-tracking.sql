-- Players follow their own reports: status (open / working on it / resolved) and the developer's replies.
-- Apply after admin.sql. Transactional and safe to reapply.
begin;

-- Reports gain a "working" status. The old check may carry a generated name, so drop any status check on the table.
do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid='public.feedback'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%status%' loop
    execute format('alter table public.feedback drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.feedback add constraint feedback_status_check check (status in ('new','read','working','resolved'));

-- A signed-in player's last 50 reports, without the diagnostic snapshot, each with the replies sent from that report.
create or replace function public.my_feedback() returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc, q.id desc),'[]'::jsonb) from (
    select f.id,f.kind,f.message,f.status,f.created_at,f.context->>'version' as version,f.context->>'characterName' as character_name,
      coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'message',m.message,'created_at',m.created_at) order by m.created_at)
        from admin_audit a join admin_mail m on m.id=a.op
        where a.action='message' and a.detail->>'feedback_id'=f.id::text and m.user_id=f.user_id),'[]'::jsonb) as replies
    from feedback f where auth.uid() is not null and f.user_id=auth.uid()
    order by f.created_at desc,f.id desc limit 50
  ) q
$$;
revoke all on function public.my_feedback() from public,anon,authenticated;
grant execute on function public.my_feedback() to authenticated;

commit;
