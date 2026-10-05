create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.leagues (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leagues_name_length check (char_length(name) between 3 and 50),
  constraint leagues_name_characters check (name !~ '[[:cntrl:]]')
);

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id),
  constraint league_members_role check (role in ('commissioner', 'member'))
);

create table public.league_invite_codes (
  league_id uuid primary key references public.leagues (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  constraint league_invite_codes_format check (code ~ '^[A-HJ-NP-R]{20}$')
);

create index league_members_user_league_idx on public.league_members (user_id, league_id);
create index league_members_commissioner_idx on public.league_members (league_id) where role = 'commissioner';

alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.league_invite_codes enable row level security;

revoke all on table public.leagues, public.league_members, public.league_invite_codes from public, anon, authenticated;
grant select on table public.leagues, public.league_members to authenticated;
grant select on table public.league_invite_codes to authenticated;

create function private.is_league_member(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.league_members as lm
    where lm.league_id = p_league_id
      and lm.user_id = (select auth.uid())
  );
$$;

alter function private.is_league_member(uuid) owner to postgres;
revoke all on function private.is_league_member(uuid) from public, anon;
grant execute on function private.is_league_member(uuid) to authenticated;

create function private.is_league_commissioner(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.league_members as lm
    where lm.league_id = p_league_id
      and lm.user_id = (select auth.uid())
      and lm.role = 'commissioner'
  );
$$;

alter function private.is_league_commissioner(uuid) owner to postgres;
revoke all on function private.is_league_commissioner(uuid) from public, anon;
grant execute on function private.is_league_commissioner(uuid) to authenticated;

create policy "Members can read their leagues"
  on public.leagues for select to authenticated
  using ((select private.is_league_member(id)));

create policy "Members can read memberships in their leagues"
  on public.league_members for select to authenticated
  using ((select private.is_league_member(league_id)));

create policy "Commissioners can read invite codes"
  on public.league_invite_codes for select to authenticated
  using ((select private.is_league_commissioner(league_id)));

create function private.generate_league_invite_code()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  with random_uuid as (
    select pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') as value
  )
  select pg_catalog.translate(
    -- Select 20 random hex digits (80 bits), skipping UUID version position 13
    -- and variant position 17. UUID text uses lowercase hexadecimal.
    pg_catalog.substr(value, 1, 12)
      || pg_catalog.substr(value, 14, 3)
      || pg_catalog.substr(value, 18, 5),
    '0123456789abcdef',
    'ABCDEFGHJKLMNPQR'
  ) from random_uuid;
$$;

alter function private.generate_league_invite_code() owner to postgres;
revoke all on function private.generate_league_invite_code() from public, anon, authenticated;

create function public.create_league(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  new_league_id uuid;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  if p_name is null
    or pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 3 and 50
    or p_name ~ '[[:cntrl:]]'
    or p_name !~ '^[[:alpha:][:digit:] .,''&()!:_+-]+$' then
    raise exception using errcode = '22023', message = 'invalid_league_name';
  end if;

  insert into public.leagues (name, created_by)
  values (pg_catalog.btrim(p_name), actor_id)
  returning id into new_league_id;

  insert into public.league_members (league_id, user_id, role)
  values (new_league_id, actor_id, 'commissioner');

  insert into public.league_invite_codes (league_id, code)
  values (new_league_id, private.generate_league_invite_code());

  return new_league_id;
end;
$$;

alter function public.create_league(text) owner to postgres;
revoke all on function public.create_league(text) from public, anon;
grant execute on function public.create_league(text) to authenticated;

create function public.join_league(p_invite_code text)
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
  on conflict (league_id, user_id) do nothing;
  get diagnostics inserted_count = row_count;

  return query select target_league_id, inserted_count = 0;
end;
$$;

alter function public.join_league(text) owner to postgres;
revoke all on function public.join_league(text) from public, anon;
grant execute on function public.join_league(text) to authenticated;

create function public.regenerate_league_invite_code(p_league_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  new_code text;
begin
  if actor_id is null or not exists (
    select 1 from public.league_members as lm
    where lm.league_id = p_league_id and lm.user_id = actor_id and lm.role = 'commissioner'
  ) then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  perform 1 from public.leagues as l where l.id = p_league_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'invalid_league';
  end if;

  if not exists (
    select 1 from public.league_members as lm
    where lm.league_id = p_league_id and lm.user_id = actor_id and lm.role = 'commissioner'
  ) then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  new_code := private.generate_league_invite_code();
  update public.league_invite_codes set code = new_code, created_at = pg_catalog.now()
  where league_id = p_league_id;

  return new_code;
end;
$$;

alter function public.regenerate_league_invite_code(uuid) owner to postgres;
revoke all on function public.regenerate_league_invite_code(uuid) from public, anon;
grant execute on function public.regenerate_league_invite_code(uuid) to authenticated;

create function public.change_league_member_role(p_league_id uuid, p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_role text;
  commissioner_count integer;
begin
  if actor_id is null or not exists (
    select 1 from public.league_members as lm
    where lm.league_id = p_league_id and lm.user_id = actor_id and lm.role = 'commissioner'
  ) then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;
  if p_role is null or p_role not in ('commissioner', 'member') or p_user_id is null then
    raise exception using errcode = '22023', message = 'invalid_role_change';
  end if;

  perform 1 from public.leagues as l where l.id = p_league_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'invalid_league';
  end if;

  if not exists (
    select 1 from public.league_members as lm
    where lm.league_id = p_league_id and lm.user_id = actor_id and lm.role = 'commissioner'
  ) then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  if p_user_id = actor_id then
    if p_role = 'member' then
      select pg_catalog.count(*) into commissioner_count from public.league_members as lm
      where lm.league_id = p_league_id and lm.role = 'commissioner';
      if commissioner_count <= 1 then
        raise exception using errcode = '23514', message = 'final_commissioner_required';
      end if;
    end if;
    raise exception using errcode = '22023', message = 'invalid_role_change';
  end if;

  select lm.role into target_role from public.league_members as lm
  where lm.league_id = p_league_id and lm.user_id = p_user_id for update;
  if target_role is null then
    raise exception using errcode = '22023', message = 'member_not_found';
  end if;

  if target_role = 'commissioner' and p_role = 'member' then
    select pg_catalog.count(*) into commissioner_count from public.league_members as lm
    where lm.league_id = p_league_id and lm.role = 'commissioner';
    if commissioner_count <= 1 then
      raise exception using errcode = '23514', message = 'final_commissioner_required';
    end if;
  end if;

  update public.league_members set role = p_role
  where league_id = p_league_id and user_id = p_user_id;
end;
$$;

alter function public.change_league_member_role(uuid, uuid, text) owner to postgres;
revoke all on function public.change_league_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.change_league_member_role(uuid, uuid, text) to authenticated;

create function public.leave_league(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role text;
  commissioner_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  perform 1 from public.leagues as l where l.id = p_league_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'invalid_league';
  end if;

  select lm.role into actor_role from public.league_members as lm
  where lm.league_id = p_league_id and lm.user_id = actor_id for update;
  if actor_role is null then
    raise exception using errcode = '22023', message = 'not_a_member';
  end if;

  if actor_role = 'commissioner' then
    select pg_catalog.count(*) into commissioner_count from public.league_members as lm
    where lm.league_id = p_league_id and lm.role = 'commissioner';
    if commissioner_count <= 1 then
      raise exception using errcode = '23514', message = 'final_commissioner_required';
    end if;
  end if;

  delete from public.league_members where league_id = p_league_id and user_id = actor_id;
end;
$$;

alter function public.leave_league(uuid) owner to postgres;
revoke all on function public.leave_league(uuid) from public, anon;
grant execute on function public.leave_league(uuid) to authenticated;

create function public.remove_league_member(p_league_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_role text;
begin
  if actor_id is null or not exists (
    select 1 from public.league_members as lm
    where lm.league_id = p_league_id and lm.user_id = actor_id and lm.role = 'commissioner'
  ) then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;
  if actor_id = p_user_id then
    raise exception using errcode = '22023', message = 'invalid_member_removal';
  end if;

  perform 1 from public.leagues as l where l.id = p_league_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'invalid_league';
  end if;

  if not exists (
    select 1 from public.league_members as lm
    where lm.league_id = p_league_id and lm.user_id = actor_id and lm.role = 'commissioner'
  ) then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  select lm.role into target_role from public.league_members as lm
  where lm.league_id = p_league_id and lm.user_id = p_user_id for update;
  if target_role is null then
    raise exception using errcode = '22023', message = 'member_not_found';
  end if;
  if target_role <> 'member' then
    raise exception using errcode = '42501', message = 'commissioners_must_be_demoted_first';
  end if;

  delete from public.league_members where league_id = p_league_id and user_id = p_user_id;
end;
$$;

alter function public.remove_league_member(uuid, uuid) owner to postgres;
revoke all on function public.remove_league_member(uuid, uuid) from public, anon;
grant execute on function public.remove_league_member(uuid, uuid) to authenticated;

create function private.enforce_commissioner_invariant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  commissioner_count integer;
begin
  if tg_op = 'UPDATE' and (old.role <> 'commissioner' or new.role = 'commissioner') then
    return new;
  elsif tg_op = 'DELETE' and old.role <> 'commissioner' then
    return old;
  end if;

  perform 1 from public.leagues as l where l.id = old.league_id for update;
  if not found then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select pg_catalog.count(*) into commissioner_count
  from public.league_members as lm
  where lm.league_id = old.league_id and lm.role = 'commissioner';

  if commissioner_count <= 1 then
    raise exception using errcode = '23514', message = 'final_commissioner_required';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

alter function private.enforce_commissioner_invariant() owner to postgres;
revoke all on function private.enforce_commissioner_invariant() from public, anon, authenticated;

create trigger league_members_keep_commissioner
  before update of role or delete on public.league_members
  for each row execute function private.enforce_commissioner_invariant();

create function public.set_league_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

alter function public.set_league_updated_at() owner to postgres;
revoke all on function public.set_league_updated_at() from public, anon, authenticated;

create trigger leagues_set_updated_at
  before update on public.leagues
  for each row execute function public.set_league_updated_at();
