-- Run once in the Supabase SQL editor. No service key belongs in the website.
begin;
create table if not exists public.orthobible_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  study_revision bigint not null default 1 check (study_revision > 0),
  reader jsonb not null,
  personal jsonb not null default '{"data":null}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint reader_size check (octet_length(reader::text) < 10000000),
  constraint personal_size check (octet_length(personal::text) < 40000000)
);
alter table public.orthobible_sync enable row level security;
revoke all on public.orthobible_sync from anon;
grant select, insert, update, delete on public.orthobible_sync to authenticated;
drop policy if exists own_bible on public.orthobible_sync;
create policy own_bible on public.orthobible_sync for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Compare-and-swap keeps an offline device from silently overwriting a newer save.
-- Study material is sent only when it changes, not on each reading-position update.
create or replace function public.save_orthobible(
  expected_revision bigint, next_reader jsonb, next_personal jsonb default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare saved public.orthobible_sync%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if expected_revision = 0 then
    insert into public.orthobible_sync(user_id, reader, personal)
      values(auth.uid(), next_reader, coalesce(next_personal, '{"data":null}'::jsonb))
      on conflict do nothing returning * into saved;
  else
    update public.orthobible_sync set reader = next_reader,
      personal = coalesce(next_personal, personal),
      revision = revision + 1,
      study_revision = study_revision + case when next_personal is null then 0 else 1 end,
      updated_at = now()
    where user_id = auth.uid() and revision = expected_revision returning * into saved;
  end if;
  if saved.user_id is null then raise exception 'sync_conflict' using errcode = '40001'; end if;
  return jsonb_build_object('revision', saved.revision, 'study_revision', saved.study_revision);
end;
$$;
revoke all on function public.save_orthobible(bigint,jsonb,jsonb) from public, anon;
grant execute on function public.save_orthobible(bigint,jsonb,jsonb) to authenticated;
commit;
