-- Read-only DEVELOPMENT SQL Editor metadata; not an ordinary-user authorization test.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
 has_table_privilege('anon',c.oid,'SELECT') as anon_select,
 has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select,
 has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE') as authenticated_any_write
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('catalog_sources','catalog_evidence',
 'catalog_external_identities','wrestling_schools','wrestlers',
 'wrestling_school_seasons','wrestling_roster_affiliations') order by c.relname;

select tablename,policyname,roles,cmd,qual,with_check from pg_catalog.pg_policies
where schemaname='public' and tablename in ('catalog_sources','catalog_evidence',
 'catalog_external_identities','wrestling_schools','wrestlers',
 'wrestling_school_seasons','wrestling_roster_affiliations') order by tablename,policyname;

select c.conrelid::regclass as table_name,c.conname,pg_get_constraintdef(c.oid) as definition
from pg_catalog.pg_constraint c where c.conrelid in
 ('public.catalog_sources'::regclass,'public.catalog_evidence'::regclass,
 'public.catalog_external_identities'::regclass,'public.wrestling_schools'::regclass,
 'public.wrestlers'::regclass,'public.wrestling_school_seasons'::regclass,
 'public.wrestling_roster_affiliations'::regclass) order by 1,2;

select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
 pg_get_userbyid(p.proowner) as owner,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private') order by n.nspname,p.proname;
