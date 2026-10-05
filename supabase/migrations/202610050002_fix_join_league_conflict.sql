-- The only unique constraint/index on league_members in migration history is
-- PRIMARY KEY (league_id, user_id). Untargeted DO NOTHING therefore handles
-- exactly that duplicate, without resolving the league_id output variable or
-- depending on an automatically generated constraint name. Review this choice
-- if future migrations introduce other unique/exclusion constraints.
begin;

create or replace function public.join_league(p_invite_code text)
returns table (league_id uuid, already_member boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_code text;
  target_league_id uuid;
  inserted_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  normalized_code := pg_catalog.upper(pg_catalog.regexp_replace(coalesce(p_invite_code, ''), '[[:space:]-]', '', 'g'));
  if normalized_code !~ '^[A-HJ-NP-R]{20}$' then
    raise exception using errcode = '22023', message = 'invalid_invite_code';
  end if;

  select lic.league_id into target_league_id
  from public.league_invite_codes as lic
  where lic.code = normalized_code;

  if target_league_id is null then
    raise exception using errcode = '22023', message = 'invalid_invite_code';
  end if;

  perform 1 from public.leagues as l where l.id = target_league_id for update;
  if not found or not exists (
    select 1 from public.league_invite_codes as lic
    where lic.league_id = target_league_id and lic.code = normalized_code
  ) then
    raise exception using errcode = '22023', message = 'invalid_invite_code';
  end if;

  insert into public.league_members (league_id, user_id, role)
  values (target_league_id, actor_id, 'member')
  on conflict do nothing;
  get diagnostics inserted_count = row_count;

  return query select target_league_id, inserted_count = 0;
end;
$$;

alter function public.join_league(text) owner to postgres;
revoke all on function public.join_league(text) from public, anon;
grant execute on function public.join_league(text) to authenticated;

commit;
