-- PROPOSED: requires user review/approval before DEVELOPMENT SQL Editor execution.
-- Privileged constraint exercise ONLY; never evidence of ordinary-user authorization.
-- Uses only reserved TEST ONLY fixtures. No roles, grants, migrations, or RPCs created.
-- Every attempt is rolled back in a subtransaction, including unexpectedly successful writes.
-- Final ROLLBACK removes temporary results. Copy the result grid before closing the editor.
-- Run the ENTIRE script in one execution; never select individual mutation statements.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
create temporary table test_4b1_cases(test integer,label text,expected text,statement text) on commit drop;
create temporary table test_4b1_results(test integer,label text,status text,expected text,actual text) on commit drop;
insert into test_4b1_cases values
(16,'wrong roster evidence kind','23514','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000101'',''4b100000-0000-4000-8000-000000000022'',1900,125,''rostered'',''4b100000-0000-4000-8000-000000000012'',true,''1900-10-01'',''1900-10-02'')'),
(16,'wrong classification evidence kind','23514','insert into public.wrestling_school_seasons values (''4b100000-0000-4000-8000-000000000022'',1903,''ncaa_di_men'',''4b100000-0000-4000-8000-000000000013'',now(),now())'),
(16,'pending official roster evidence','23514','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000101'',''4b100000-0000-4000-8000-000000000022'',1900,125,''rostered'',''4b100000-0000-4000-8000-000000000014'',true,''1900-10-01'',''1900-10-02'')'),
(16,'roster verification timestamp mismatch','23514','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000101'',''4b100000-0000-4000-8000-000000000022'',1900,125,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-03'')'),
(17,'nonofficial roster evidence','23514','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000101'',''4b100000-0000-4000-8000-000000000022'',1900,125,''rostered'',''4b100000-0000-4000-8000-000000000015'',true,''1900-10-01'',''1900-10-02'')'),
(17,'nonofficial classification evidence','23514','insert into public.wrestling_school_seasons values (''4b100000-0000-4000-8000-000000000022'',1903,''ncaa_di_men'',''4b100000-0000-4000-8000-000000000016'',now(),now())'),
(18,'provider evidence mismatch','23503','insert into public.catalog_external_identities(source_id,entity_kind,external_key,wrestler_id,evidence_id) values (''4b100000-0000-4000-8000-000000000002'',''wrestler'',''TEST-ONLY-constraint'',''4b100000-0000-4000-8000-000000000101'',''4b100000-0000-4000-8000-000000000011'')'),
(19,'duplicate provider namespace key','23505','insert into public.catalog_external_identities(source_id,entity_kind,external_key,wrestler_id,evidence_id) values (''4b100000-0000-4000-8000-000000000001'',''wrestler'',''TEST-ONLY-4B1-101'',''4b100000-0000-4000-8000-000000000101'',''4b100000-0000-4000-8000-000000000011'')'),
(29,'conflicting approved school','23505','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000101'',''4b100000-0000-4000-8000-000000000022'',1900,125,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(29,'duplicate current same-school revision','23505','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000101'',''4b100000-0000-4000-8000-000000000021'',1900,125,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(30,'historical affiliation rewrite','23514','update public.wrestling_roster_affiliations set primary_weight=285 where id=''4b100000-0000-4000-8000-000000000206'''),
(30,'historical affiliation delete','23514','delete from public.wrestling_roster_affiliations where id=''4b100000-0000-4000-8000-000000000206'''),
(30,'historical affiliation reopen','23514','update public.wrestling_roster_affiliations set superseded_at=null where id=''4b100000-0000-4000-8000-000000000206'''),
(30,'closure predating verification','23514','update public.wrestling_roster_affiliations set superseded_at=''1900-09-01'' where id=''4b100000-0000-4000-8000-000000000201'''),
(31,'evidence rewrite','23514','update public.catalog_evidence set summary=''TEST ONLY forbidden rewrite'' where id=''4b100000-0000-4000-8000-000000000013'''),
(31,'evidence delete','23514','delete from public.catalog_evidence where id=''4b100000-0000-4000-8000-000000000013'''),
(33,'missing evidence FK','23503','insert into public.catalog_external_identities(source_id,entity_kind,external_key,wrestler_id,evidence_id) values (''4b100000-0000-4000-8000-000000000001'',''wrestler'',''TEST-ONLY-constraint'',''4b100000-0000-4000-8000-000000000101'',''4b100000-0000-4000-8000-000000000999'')'),
(33,'referenced provider delete','23001','delete from public.catalog_sources where id=''4b100000-0000-4000-8000-000000000001'''),
(33,'missing provider FK','23503','insert into public.catalog_evidence(source_id,evidence_kind,source_reference,observed_at,summary) values (''4b100000-0000-4000-8000-000000000999'',''identity'',''https://example.invalid/TEST-ONLY'',''1900-10-01'',''TEST ONLY'')'),
(33,'missing wrestler FK','23503','insert into public.catalog_external_identities(source_id,entity_kind,external_key,wrestler_id,evidence_id) values (''4b100000-0000-4000-8000-000000000001'',''wrestler'',''TEST-ONLY-constraint'',''4b100000-0000-4000-8000-000000000999'',''4b100000-0000-4000-8000-000000000011'')'),
(33,'missing school season FK','23503','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1903,125,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(34,'allowed weight 125','OK','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,125,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(34,'allowed weight 133','OK','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,133,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(34,'allowed weight 141','OK','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,141,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(34,'allowed weight 149','OK','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,149,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(34,'allowed weight 157','OK','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,157,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(34,'allowed weight 165','OK','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,165,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(34,'allowed weight 174','OK','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,174,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(34,'allowed weight 184','OK','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,184,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(34,'allowed weight 197','OK','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,197,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(34,'allowed weight 285','OK','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,285,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(35,'invalid weight 0','23514','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,0,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(35,'invalid weight 126','23514','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,126,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(35,'invalid weight 286','23514','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,286,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')'),
(35,'invalid weight -1','23514','insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values (''4b100000-0000-4000-8000-000000000110'',''4b100000-0000-4000-8000-000000000022'',1900,-1,''rostered'',''4b100000-0000-4000-8000-000000000013'',true,''1900-10-01'',''1900-10-02'')');

do $test$
declare c record; observed text; affected bigint;
begin
  -- Positive fixture guard: an empty/incorrect database must not yield false passes.
  if (select count(*) from public.wrestling_roster_affiliations where id in ('4b100000-0000-4000-8000-000000000201','4b100000-0000-4000-8000-000000000206','4b100000-0000-4000-8000-000000000207')) <> 3
    or not exists(select 1 from public.catalog_external_identities where id='4b100000-0000-4000-8000-000000000301') then
    raise exception 'Required TEST ONLY fixtures missing';
  end if;
  for c in select * from test_4b1_cases order by test,label loop
    observed := 'OK';
    begin
      execute c.statement;
      get diagnostics affected = row_count;
      if affected <> 1 then observed := 'UNEXPECTED_ROW_COUNT'; end if;
      raise exception using errcode='ZB001',message='rollback attempted write';
    exception when sqlstate 'ZB001' then null;
      when others then observed := sqlstate;
    end;
    insert into test_4b1_results values(c.test,c.label,case when observed=c.expected then 'PASS' else 'FAIL' end,c.expected,observed);
  end loop;
end;
$test$;

-- Successful transfer and return-to-school revision lifecycle, rolled back afterward.
do $test$
declare replacement uuid; returned uuid; old_snapshot jsonb; observed text := 'OK';
begin
 begin
  perform 1 from public.wrestlers where id='4b100000-0000-4000-8000-000000000101' for update;
  select to_jsonb(r)-'superseded_at' into old_snapshot from public.wrestling_roster_affiliations r where id='4b100000-0000-4000-8000-000000000201';
  update public.wrestling_roster_affiliations set superseded_at='1900-10-03' where id='4b100000-0000-4000-8000-000000000201' and superseded_at is null;
  if not found then raise exception 'Expected open revision'; end if;
  insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values ('4b100000-0000-4000-8000-000000000101','4b100000-0000-4000-8000-000000000022',1900,125,'rostered','4b100000-0000-4000-8000-000000000013',true,'1900-10-01','1900-10-02') returning id into replacement;
  if not exists(select 1 from public.wrestling_roster_affiliations r where r.id='4b100000-0000-4000-8000-000000000201' and r.superseded_at='1900-10-03' and to_jsonb(r)-'superseded_at'=old_snapshot)
    or not exists(select 1 from public.wrestling_roster_affiliations where id=replacement and wrestler_id='4b100000-0000-4000-8000-000000000101' and school_id='4b100000-0000-4000-8000-000000000022' and superseded_at is null)
    then raise exception 'Transfer identity/history mismatch'; end if;
  update public.wrestling_roster_affiliations set superseded_at='1900-10-04' where id=replacement;
  insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values ('4b100000-0000-4000-8000-000000000101','4b100000-0000-4000-8000-000000000021',1900,125,'rostered','4b100000-0000-4000-8000-000000000013',true,'1900-10-01','1900-10-02') returning id into returned;
  if (select count(*) from public.wrestling_roster_affiliations where wrestler_id='4b100000-0000-4000-8000-000000000101' and season_start_year=1900) <> 3
    or (select count(*) from public.wrestling_roster_affiliations where wrestler_id='4b100000-0000-4000-8000-000000000101' and season_start_year=1900 and superseded_at is null) <> 1 then
    raise exception 'Revision counts mismatch'; end if;
  raise exception using errcode='ZB001',message='rollback successful lifecycle';
 exception when sqlstate 'ZB001' then null; when others then observed:=sqlstate; end;
 insert into test_4b1_results values(28,'transfer and return preserve identity/history',case when observed='OK' then 'PASS' else 'FAIL' end,'OK',observed);
end;
$test$;

-- Failed replacement must roll back the preceding closure in the same transaction.
do $test$
declare original jsonb; observed text := 'UNEXPECTED_SUCCESS';
begin
 select to_jsonb(r) into original from public.wrestling_roster_affiliations r where id='4b100000-0000-4000-8000-000000000201';
 begin
  perform 1 from public.wrestlers where id='4b100000-0000-4000-8000-000000000101' for update;
  update public.wrestling_roster_affiliations set superseded_at='1900-10-03' where id='4b100000-0000-4000-8000-000000000201';
  insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values ('4b100000-0000-4000-8000-000000000101','4b100000-0000-4000-8000-000000000022',1900,126,'rostered','4b100000-0000-4000-8000-000000000013',true,'1900-10-01','1900-10-02');
  raise exception using errcode='ZB001',message='unexpected successful replacement';
 exception when sqlstate 'ZB001' then null; when others then observed:=sqlstate; end;
 insert into test_4b1_results
 select 32,'failed replacement rolls closure back',case when observed='23514' and to_jsonb(r)=original then 'PASS' else 'FAIL' end,'23514 and identical original row',observed
 from public.wrestling_roster_affiliations r where id='4b100000-0000-4000-8000-000000000201';
end;
$test$;

select * from test_4b1_results order by test,label;
rollback;
