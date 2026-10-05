create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null or username ~ '^[a-z0-9_]{3,24}$'
  )
);

create unique index profiles_username_unique on public.profiles (username)
  where username is not null;

alter table public.profiles enable row level security;

revoke all on table public.profiles from public, anon;
grant select on table public.profiles to authenticated;
grant update (username) on table public.profiles to authenticated;

create policy "Authenticated users can read profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_username text := pg_catalog.lower(pg_catalog.btrim(new.raw_user_meta_data ->> 'username'));
begin
  if candidate_username !~ '^[a-z0-9_]{3,24}$' then
    candidate_username := null;
  end if;

  begin
    insert into public.profiles (id, username)
    values (new.id, candidate_username)
    on conflict (id) do nothing;
  exception
    when unique_violation then
      insert into public.profiles (id)
      values (new.id)
      on conflict (id) do nothing;
  end;

  return new;
end;
$$;

alter function public.handle_new_auth_user() owner to postgres;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();