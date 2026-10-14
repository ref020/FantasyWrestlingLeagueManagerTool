-- Local 4B-1 proposal. No data, importer, or fantasy schema changes.
begin;

create table public.catalog_sources (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  provider_key text not null unique check (provider_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null check (pg_catalog.char_length(pg_catalog.btrim(name)) between 1 and 200),
  created_at timestamptz not null default now()
);

-- Append-only evidence, never raw credentials or unrestricted response bodies.
create table public.catalog_evidence (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  source_id uuid not null references public.catalog_sources(id) on delete restrict,
  evidence_kind text not null check (evidence_kind in ('identity', 'program_classification', 'official_roster')),
  source_reference text not null check (pg_catalog.char_length(pg_catalog.btrim(source_reference)) between 1 and 2000),
  observed_at timestamptz not null,
  last_verified_at timestamptz,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  is_official boolean not null default false,
  summary text not null check (pg_catalog.char_length(pg_catalog.btrim(summary)) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (last_verified_at is null or last_verified_at >= observed_at),
  check (review_status <> 'approved' or last_verified_at is not null),
  unique (id, source_id)
);
create index catalog_evidence_source_idx on public.catalog_evidence(source_id);

create table public.wrestling_schools (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  official_name text not null check (pg_catalog.char_length(pg_catalog.btrim(official_name)) between 1 and 200),
  display_name text,
  athletics_url text check (athletics_url is null or athletics_url ~ '^https://[^[:space:]]+$'),
  roster_url text check (roster_url is null or roster_url ~ '^https://[^[:space:]]+$'),
  evidence_id uuid not null references public.catalog_evidence(id) on delete restrict,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wrestlers (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  first_name text not null check (pg_catalog.char_length(pg_catalog.btrim(first_name)) between 1 and 100),
  last_name text not null check (pg_catalog.char_length(pg_catalog.btrim(last_name)) between 1 and 100),
  display_name text,
  evidence_id uuid not null references public.catalog_evidence(id) on delete restrict,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sport-specific, season-specific classification, including multidivision schools.
-- No conference or institution-wide division is used as an eligibility shortcut.
create table public.wrestling_school_seasons (
  school_id uuid not null references public.wrestling_schools(id) on delete restrict,
  season_start_year integer not null check (season_start_year between 1900 and 9998),
  classification text not null default 'unverified' check (classification in ('unverified', 'ncaa_di_men', 'ineligible')),
  evidence_id uuid not null references public.catalog_evidence(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (school_id, season_start_year)
);

-- One row per reviewed revision/tenure, not one permanent school per person.
-- Close a revision and INSERT its replacement atomically; never overwrite history.
create table public.wrestling_roster_affiliations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  wrestler_id uuid not null references public.wrestlers(id) on delete restrict,
  school_id uuid not null,
  season_start_year integer not null,
  primary_weight integer check (primary_weight in (125, 133, 141, 149, 157, 165, 174, 184, 197, 285)),
  roster_status text not null default 'unverified' check (roster_status in ('unverified', 'rostered', 'removed')),
  evidence_id uuid not null references public.catalog_evidence(id) on delete restrict,
  is_approved boolean not null default false,
  first_observed_at timestamptz not null,
  last_verified_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (school_id, season_start_year) references public.wrestling_school_seasons(school_id, season_start_year) on delete restrict,
  check (last_verified_at is null or last_verified_at >= first_observed_at),
  check (superseded_at is null or superseded_at >= coalesce(last_verified_at, first_observed_at)),
  check (not is_approved or (last_verified_at is not null and roster_status <> 'unverified'))
);
create unique index wrestling_roster_current_school_unique
  on public.wrestling_roster_affiliations(wrestler_id, school_id, season_start_year)
  where superseded_at is null;
-- Conflicting current school claims require review, not two eligible identities.
create unique index wrestling_roster_current_approved_unique
  on public.wrestling_roster_affiliations(wrestler_id, season_start_year)
  where superseded_at is null and is_approved and roster_status = 'rostered';
create index wrestling_roster_season_idx on public.wrestling_roster_affiliations(season_start_year, school_id);
create index wrestling_roster_school_fk_idx on public.wrestling_roster_affiliations(school_id, season_start_year);

-- Namespace is provider + entity kind + opaque ID/URL; names are never keys.
create table public.catalog_external_identities (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  source_id uuid not null references public.catalog_sources(id) on delete restrict,
  entity_kind text not null check (entity_kind in ('school', 'wrestler')),
  external_key text not null check (pg_catalog.char_length(pg_catalog.btrim(external_key)) >= 1 and pg_catalog.octet_length(external_key) <= 1000),
  school_id uuid references public.wrestling_schools(id) on delete restrict,
  wrestler_id uuid references public.wrestlers(id) on delete restrict,
  evidence_id uuid not null,
  created_at timestamptz not null default now(),
  unique (source_id, entity_kind, external_key),
  foreign key (evidence_id, source_id) references public.catalog_evidence(id, source_id) on delete restrict,
  check ((entity_kind = 'school' and school_id is not null and wrestler_id is null)
    or (entity_kind = 'wrestler' and wrestler_id is not null and school_id is null))
);
create index catalog_external_school_idx on public.catalog_external_identities(school_id);
create index catalog_external_wrestler_idx on public.catalog_external_identities(wrestler_id);

-- Read-only boolean predicate: provenance itself is backend-only.
create function private.catalog_evidence_approved(p_id uuid, p_official boolean, p_kind text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.catalog_evidence as e
    where e.id = p_id and e.evidence_kind = p_kind and e.review_status = 'approved'
      and e.last_verified_at is not null and (not p_official or e.is_official));
$$;
alter function private.catalog_evidence_approved(uuid, boolean, text) owner to postgres;
revoke all on function private.catalog_evidence_approved(uuid, boolean, text) from public, anon, authenticated;
grant execute on function private.catalog_evidence_approved(uuid, boolean, text) to authenticated;

-- Enforce approval integrity at write time, not just when RLS hides bad claims.
-- Invoker rights: only a future trusted backend may write/read provenance.
create function private.validate_catalog_approval()
returns trigger language plpgsql set search_path = ''
as $$
declare
  required_kind text;
  approval_requested boolean;
  evidence_verified_at timestamptz;
begin
  if tg_table_name = 'wrestling_school_seasons' then
    required_kind := 'program_classification';
    approval_requested := new.classification = 'ncaa_di_men';
  elsif tg_table_name = 'wrestling_roster_affiliations' then
    required_kind := 'official_roster';
    approval_requested := new.is_approved;
  else
    required_kind := 'identity';
    approval_requested := new.is_approved;
  end if;
  if approval_requested then
    select e.last_verified_at into evidence_verified_at
      from public.catalog_evidence as e
      where e.id = new.evidence_id and e.evidence_kind = required_kind
        and e.review_status = 'approved' and e.last_verified_at is not null
        and (required_kind = 'identity' or e.is_official);
    if not found then
      raise exception using errcode = '23514', message = 'catalog_approval_requires_verified_evidence';
    end if;
    if tg_table_name = 'wrestling_roster_affiliations' then
      if new.last_verified_at is distinct from evidence_verified_at then
        raise exception using errcode = '23514', message = 'catalog_verification_time_mismatch';
      end if;
    end if;
  end if;
  return new;
end;
$$;
alter function private.validate_catalog_approval() owner to postgres;
revoke all on function private.validate_catalog_approval() from public, anon, authenticated;
create trigger catalog_school_approval before insert or update on public.wrestling_schools
  for each row execute function private.validate_catalog_approval();
create trigger catalog_person_approval before insert or update on public.wrestlers
  for each row execute function private.validate_catalog_approval();
create trigger catalog_program_approval before insert or update on public.wrestling_school_seasons
  for each row execute function private.validate_catalog_approval();
create trigger catalog_roster_approval before insert on public.wrestling_roster_affiliations
  for each row execute function private.validate_catalog_approval();

-- Evidence cannot be edited/deleted; affiliation history can only be closed once.
create function private.preserve_catalog_history()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_table_name = 'wrestling_roster_affiliations' and tg_op = 'UPDATE' then
    if old.superseded_at is null and new.superseded_at is not null
      and (pg_catalog.to_jsonb(new) - 'superseded_at') = (pg_catalog.to_jsonb(old) - 'superseded_at') then
      return new;
    end if;
  end if;
  raise exception using errcode = '23514', message = 'catalog_history_is_immutable';
end;
$$;
alter function private.preserve_catalog_history() owner to postgres;
revoke all on function private.preserve_catalog_history() from public, anon, authenticated;
create trigger catalog_evidence_preserve before update or delete on public.catalog_evidence
  for each row execute function private.preserve_catalog_history();
create trigger wrestling_roster_preserve before update or delete on public.wrestling_roster_affiliations
  for each row execute function private.preserve_catalog_history();

create function private.catalog_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
alter function private.catalog_updated_at() owner to postgres;
revoke all on function private.catalog_updated_at() from public, anon, authenticated;
create trigger wrestling_schools_updated before update on public.wrestling_schools
  for each row execute function private.catalog_updated_at();
create trigger wrestlers_updated before update on public.wrestlers
  for each row execute function private.catalog_updated_at();
create trigger wrestling_school_seasons_updated before update on public.wrestling_school_seasons
  for each row execute function private.catalog_updated_at();

alter table public.catalog_sources enable row level security;
alter table public.catalog_evidence enable row level security;
alter table public.catalog_external_identities enable row level security;
alter table public.wrestling_schools enable row level security;
alter table public.wrestlers enable row level security;
alter table public.wrestling_school_seasons enable row level security;
alter table public.wrestling_roster_affiliations enable row level security;
revoke all on table public.catalog_sources, public.catalog_evidence, public.catalog_external_identities,
  public.wrestling_schools, public.wrestlers, public.wrestling_school_seasons,
  public.wrestling_roster_affiliations from public, anon, authenticated;
grant select on table public.wrestling_schools, public.wrestlers,
  public.wrestling_school_seasons, public.wrestling_roster_affiliations to authenticated;

create policy catalog_schools_read on public.wrestling_schools for select to authenticated
  using (is_approved and private.catalog_evidence_approved(evidence_id, false, 'identity'));
create policy catalog_wrestlers_read on public.wrestlers for select to authenticated
  using (is_approved and private.catalog_evidence_approved(evidence_id, false, 'identity'));
create policy catalog_programs_read on public.wrestling_school_seasons for select to authenticated
  using (classification = 'ncaa_di_men' and private.catalog_evidence_approved(evidence_id, true, 'program_classification')
    and exists (select 1 from public.wrestling_schools as s where s.id = wrestling_school_seasons.school_id));
create policy catalog_affiliations_read on public.wrestling_roster_affiliations for select to authenticated
  using (is_approved and private.catalog_evidence_approved(evidence_id, true, 'official_roster')
    and exists (select 1 from public.wrestlers as w where w.id = wrestling_roster_affiliations.wrestler_id)
    and exists (select 1 from public.wrestling_school_seasons as s
      where s.school_id = wrestling_roster_affiliations.school_id
        and s.season_start_year = wrestling_roster_affiliations.season_start_year));

-- No ingestion grants or public write RPCs. A future backend must be reviewed.
commit;
