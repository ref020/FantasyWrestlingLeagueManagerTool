-- Milestone 4A. Existing season identities are unknown, not inferred from dates.
begin;

alter table public.leagues
  add column season_start_year integer,
  add column is_active boolean not null default true,
  add column copied_from_league_id uuid references public.leagues (id) on delete set null,
  add constraint leagues_season_start_year check (season_start_year between 1900 and 9998),
  add constraint leagues_lineage_not_self check (copied_from_league_id <> id);

create index leagues_copied_from_idx on public.leagues (copied_from_league_id)
  where copied_from_league_id is not null;

-- Keep the proven creation transaction as an internal implementation function.
-- Clients must use the new overload and provide a season. No default argument.
revoke all on function public.create_league(text) from public, anon, authenticated;

create function public.create_league(p_name text, p_season_start_year integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_league_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  if p_season_start_year is null or p_season_start_year not between 1900 and 9998 then
    raise exception using errcode = '22023', message = 'invalid_season';
  end if;

  new_league_id := public.create_league(p_name);
  update public.leagues as l set season_start_year = p_season_start_year
    where l.id = new_league_id;
  return new_league_id;
end;
$$;
alter function public.create_league(text, integer) owner to postgres;
revoke all on function public.create_league(text, integer) from public, anon;
grant execute on function public.create_league(text, integer) to authenticated;

-- Commissioners may assign an unknown legacy season once and toggle visibility.
-- An assigned season cannot be rolled forward into a different season's league.
create function public.update_league_season_settings(
  p_league_id uuid, p_is_active boolean, p_season_start_year integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  current_season integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  select l.season_start_year into current_season
    from public.leagues as l where l.id = p_league_id for update;
  if not found or not private.is_league_commissioner(p_league_id) then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;
  if p_is_active is null or (p_season_start_year is not null and p_season_start_year not between 1900 and 9998) then
    raise exception using errcode = '22023', message = 'invalid_season';
  end if;
  if current_season is not null and p_season_start_year is not null and current_season <> p_season_start_year then
    raise exception using errcode = '22023', message = 'season_already_assigned';
  end if;
  update public.leagues as l
    set season_start_year = coalesce(current_season, p_season_start_year), is_active = p_is_active
    where l.id = p_league_id;
end;
$$;
alter function public.update_league_season_settings(uuid, boolean, integer) owner to postgres;
revoke all on function public.update_league_season_settings(uuid, boolean, integer) from public, anon;
grant execute on function public.update_league_season_settings(uuid, boolean, integer) to authenticated;

create table public.fantasy_teams (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete restrict,
  owner_user_id uuid not null references auth.users (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fantasy_teams_one_owner_per_league unique (league_id, owner_user_id),
  constraint fantasy_teams_name check (
    name = pg_catalog.btrim(name)
    and pg_catalog.char_length(name) between 3 and 50
    and name collate "C" !~ '[^A-Za-z0-9 .,''&()!:_+-]'
  )
);
create index fantasy_teams_owner_idx on public.fantasy_teams (owner_user_id);
alter table public.fantasy_teams enable row level security;
revoke all on table public.fantasy_teams from public, anon, authenticated;
grant select on table public.fantasy_teams to authenticated;
create policy "Members can read league fantasy teams"
  on public.fantasy_teams for select to authenticated
  using ((select private.is_league_member(league_id)));

create function public.create_fantasy_team(p_league_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  league_active boolean;
  league_season integer;
  team_name text := pg_catalog.btrim(p_name);
  new_team_id uuid;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  -- Same parent-first lock order as membership mutations; recheck after locking.
  select l.is_active, l.season_start_year into league_active, league_season
    from public.leagues as l where l.id = p_league_id for update;
  if not found or not private.is_league_member(p_league_id) then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;
  if not league_active then
    raise exception using errcode = '22023', message = 'league_inactive';
  end if;
  if league_season is null then
    raise exception using errcode = '22023', message = 'season_required';
  end if;
  if team_name is null or pg_catalog.char_length(team_name) not between 3 and 50
    or team_name collate "C" ~ '[^A-Za-z0-9 .,''&()!:_+-]' then
    raise exception using errcode = '22023', message = 'invalid_team_name';
  end if;

  insert into public.fantasy_teams (league_id, owner_user_id, name)
    values (p_league_id, actor_id, team_name)
    on conflict on constraint fantasy_teams_one_owner_per_league do nothing
    returning id into new_team_id;
  if new_team_id is null then
    raise exception using errcode = '23505', message = 'team_already_exists';
  end if;
  return new_team_id;
end;
$$;
alter function public.create_fantasy_team(uuid, text) owner to postgres;
revoke all on function public.create_fantasy_team(uuid, text) from public, anon;
grant execute on function public.create_fantasy_team(uuid, text) to authenticated;

-- League-scoped rename identifies only the caller's team; there is no override.
create function public.rename_fantasy_team(p_league_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  league_active boolean;
  league_season integer;
  team_name text := pg_catalog.btrim(p_name);
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  select l.is_active, l.season_start_year into league_active, league_season
    from public.leagues as l where l.id = p_league_id for update;
  if not found or not private.is_league_member(p_league_id) then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;
  if not league_active then
    raise exception using errcode = '22023', message = 'league_inactive';
  end if;
  if league_season is null then
    raise exception using errcode = '22023', message = 'season_required';
  end if;
  if team_name is null or pg_catalog.char_length(team_name) not between 3 and 50
    or team_name collate "C" ~ '[^A-Za-z0-9 .,''&()!:_+-]' then
    raise exception using errcode = '22023', message = 'invalid_team_name';
  end if;
  update public.fantasy_teams as ft set name = team_name, updated_at = pg_catalog.now()
    where ft.league_id = p_league_id and ft.owner_user_id = actor_id;
  if not found then
    raise exception using errcode = '22023', message = 'team_not_found';
  end if;
end;
$$;
alter function public.rename_fantasy_team(uuid, text) owner to postgres;
revoke all on function public.rename_fantasy_team(uuid, text) from public, anon;
grant execute on function public.rename_fantasy_team(uuid, text) to authenticated;

commit;
