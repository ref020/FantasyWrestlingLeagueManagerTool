-- Proposed read-only DEVELOPMENT SQL Editor follow-up. Review before execution.
-- One result row avoids losing earlier result sets in the SQL Editor.
-- Does not call rls_auto_enable or alter any database object.
select jsonb_build_object(
 'tables', (select jsonb_agg(to_jsonb(t)) from (
   select c.relname as table_name, c.relrowsecurity as rls_enabled,
     has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
     has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
     has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE') as authenticated_any_write
   from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname in ('catalog_sources','catalog_evidence',
     'catalog_external_identities','wrestling_schools','wrestlers',
     'wrestling_school_seasons','wrestling_roster_affiliations') order by c.relname
 ) t),
 'policies', (select jsonb_agg(to_jsonb(t)) from (
   select tablename,policyname,roles,cmd,qual,with_check from pg_catalog.pg_policies
   where schemaname='public' and tablename in ('catalog_sources','catalog_evidence',
     'catalog_external_identities','wrestling_schools','wrestlers',
     'wrestling_school_seasons','wrestling_roster_affiliations') order by tablename,policyname
 ) t),
 'constraints', (select jsonb_agg(to_jsonb(t)) from (
   select c.conrelid::regclass::text as table_name,c.conname,
     pg_catalog.pg_get_constraintdef(c.oid) as definition
   from pg_catalog.pg_constraint c join pg_catalog.pg_class r on r.oid=c.conrelid
   join pg_catalog.pg_namespace n on n.oid=r.relnamespace
   where n.nspname='public' and r.relname in ('catalog_sources','catalog_evidence',
     'catalog_external_identities','wrestling_schools','wrestlers',
     'wrestling_school_seasons','wrestling_roster_affiliations') order by 1,2
 ) t),
 'rls_auto_enable', (select jsonb_agg(to_jsonb(t)) from (
   select p.oid::regprocedure::text as function_name,
     pg_catalog.pg_get_function_result(p.oid) as returns,
     pg_catalog.pg_get_functiondef(p.oid) as definition,
     pg_catalog.pg_get_userbyid(p.proowner) as owner,p.prosecdef,p.proconfig,
     has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
     has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
     (select jsonb_agg(jsonb_build_object('name',e.evtname,'event',e.evtevent,
       'enabled',e.evtenabled,'tags',e.evttags))
       from pg_catalog.pg_event_trigger e where e.evtfoid=p.oid) as event_triggers
   from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='rls_auto_enable'
 ) t)
) as metadata;
