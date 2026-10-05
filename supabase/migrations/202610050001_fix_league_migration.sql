-- Upgrade the known deployed 202609290002 schema; do not rerun that migration.
-- Keep both repairs atomic. No existing rows or invite codes are rewritten.
begin;

lock table public.leagues in access exclusive mode;

create or replace function private.generate_league_invite_code()
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
    -- 20 random hex digits (80 bits), excluding version 13 and variant 17.
    -- PostgreSQL UUID text uses lowercase hexadecimal.
    pg_catalog.substr(value, 1, 12)
      || pg_catalog.substr(value, 14, 3)
      || pg_catalog.substr(value, 18, 5),
    '0123456789abcdef',
    'ABCDEFGHJKLMNPQR'
  ) from random_uuid;
$$;

alter function private.generate_league_invite_code() owner to postgres;
revoke all on function private.generate_league_invite_code() from public, anon, authenticated;

do $$
declare
  creator_fk_name name;
begin
  -- Require exactly the known single-column RESTRICT FK and NOT NULL column.
  -- Resolve the actual constraint name, including if it was renamed.
  -- STRICT aborts on missing/ambiguous metadata; the transaction rolls back.
  select fk.conname into strict creator_fk_name
  from pg_catalog.pg_constraint as fk
  join pg_catalog.pg_attribute as source_column
    on source_column.attrelid = fk.conrelid
    and source_column.attname = 'created_by'
    and not source_column.attisdropped
    and source_column.attnotnull
  join pg_catalog.pg_attribute as target_column
    on target_column.attrelid = fk.confrelid
    and target_column.attname = 'id'
    and not target_column.attisdropped
  where fk.contype = 'f'
    and fk.conrelid = 'public.leagues'::pg_catalog.regclass
    and fk.confrelid = 'auth.users'::pg_catalog.regclass
    and fk.conkey = array[source_column.attnum]
    and fk.confkey = array[target_column.attnum]
    and fk.confdeltype = 'r';

  execute pg_catalog.format('alter table public.leagues drop constraint %I', creator_fk_name);
  alter table public.leagues alter column created_by drop not null;
  execute pg_catalog.format(
    'alter table public.leagues add constraint %I foreign key (created_by) references auth.users (id) on delete set null',
    creator_fk_name
  );
end;
$$;

commit;
