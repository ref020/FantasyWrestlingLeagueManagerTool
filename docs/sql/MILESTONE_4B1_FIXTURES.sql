-- PROPOSED fixture preparation only. NOT a migration or importer.
-- Requires explicit user approval; run ONLY in the confirmed DEVELOPMENT SQL Editor.
-- Synthetic season 1900, reserved UUID prefix, TEST ONLY names and .invalid references.
-- Approved/official flags deliberately exercise security gates; these are NOT real NCAA facts.
-- Inserts only; reruns fail rather than overwrite. No auth, league or team records touched.
-- Evidence/history is immutable: fixtures will remain unless separately reviewed for retirement.
begin;

insert into public.catalog_sources (id, provider_key, name) values
 ('4b100000-0000-4000-8000-000000000001','test_4b1_20261013_a','TEST ONLY 4B1 Synthetic Provider A'),
 ('4b100000-0000-4000-8000-000000000002','test_4b1_20261013_b','TEST ONLY 4B1 Synthetic Provider B');

insert into public.catalog_evidence
 (id,source_id,evidence_kind,source_reference,observed_at,last_verified_at,review_status,is_official,summary)
select ('4b100000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 '4b100000-0000-4000-8000-000000000001'::uuid, kind,
 'https://example.invalid/TEST-ONLY/4B1/' || n, '1900-10-01'::timestamptz,
 case when reviewed then '1900-10-02'::timestamptz else null end,
 case when reviewed then 'approved' else 'pending' end, official,
 'TEST ONLY: fabricated fixture, no genuine NCAA verification; case ' || n
from (values
 (11,'identity',true,false),
 (12,'program_classification',true,true),
 (13,'official_roster',true,true),
 (14,'official_roster',false,true),
 (15,'official_roster',true,false),
 (16,'program_classification',true,false)
) as fixture(n,kind,reviewed,official);

insert into public.wrestling_schools (id,official_name,evidence_id,is_approved)
select ('4b100000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 'TEST ONLY 4B1 ' || label, '4b100000-0000-4000-8000-000000000011'::uuid, approved
from (values (21,'Synthetic School A',true),(22,'Synthetic School B',true),(23,'Hidden School',false))
 as fixture(n,label,approved);

insert into public.wrestling_school_seasons (school_id,season_start_year,classification,evidence_id)
values
 ('4b100000-0000-4000-8000-000000000021',1900,'ncaa_di_men','4b100000-0000-4000-8000-000000000012'),
 ('4b100000-0000-4000-8000-000000000022',1900,'ncaa_di_men','4b100000-0000-4000-8000-000000000012'),
 ('4b100000-0000-4000-8000-000000000023',1900,'ncaa_di_men','4b100000-0000-4000-8000-000000000012'),
 ('4b100000-0000-4000-8000-000000000021',1901,'unverified','4b100000-0000-4000-8000-000000000012'),
 ('4b100000-0000-4000-8000-000000000021',1902,'ineligible','4b100000-0000-4000-8000-000000000012');

insert into public.wrestlers (id,first_name,last_name,display_name,evidence_id,is_approved)
select ('4b100000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 'TEST ONLY 4B1', case when n in (104,105) then 'Duplicate Name' else label end,
 'TEST ONLY 4B1 ' || label, '4b100000-0000-4000-8000-000000000011'::uuid, n <> 110
from (values
 (101,'Redshirt No Matches'),(102,'Freshman No Matches'),(103,'Injured Unknown Weight'),
 (104,'Duplicate Name'),(105,'Duplicate Name'),(106,'Superseded'),(107,'Removed'),
 (108,'Unapproved Affiliation'),(109,'Unverified Claim'),(110,'Unapproved Identity')
) as fixture(n,label);

insert into public.wrestling_roster_affiliations
 (id,wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,
  is_approved,first_observed_at,last_verified_at,superseded_at)
select ('4b100000-0000-4000-8000-' || lpad((n+100)::text,12,'0'))::uuid,
 ('4b100000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 '4b100000-0000-4000-8000-000000000021'::uuid,1900,weight,status,
 case when n=109 then '4b100000-0000-4000-8000-000000000014'::uuid
 else '4b100000-0000-4000-8000-000000000013'::uuid end,
 n not in (108,109),'1900-10-01'::timestamptz,
 case when n=109 then null else '1900-10-02'::timestamptz end,
 case when n=106 then '1900-10-03'::timestamptz else null end
from (values (101,125,'rostered'),(102,133,'rostered'),(103,null,'rostered'),
 (104,141,'rostered'),(105,149,'rostered'),(106,157,'rostered'),(107,165,'removed'),
 (108,174,'rostered'),(109,184,'unverified')) as fixture(n,weight,status);

insert into public.catalog_external_identities
 (id,source_id,entity_kind,external_key,wrestler_id,evidence_id) values
 ('4b100000-0000-4000-8000-000000000301','4b100000-0000-4000-8000-000000000001',
 'wrestler','TEST-ONLY-4B1-101','4b100000-0000-4000-8000-000000000101','4b100000-0000-4000-8000-000000000011');

commit;

-- Return only synthetic fixture identifiers and counts, never credentials.
select 'TEST ONLY 4B1 fixtures prepared' as result,
 (select count(*) from public.catalog_sources where provider_key like 'test_4b1_20261013_%') as sources,
 (select count(*) from public.catalog_evidence where id::text like '4b100000-%') as evidence,
 (select count(*) from public.wrestling_schools where id::text like '4b100000-%') as schools,
 (select count(*) from public.wrestlers where id::text like '4b100000-%') as wrestlers,
 (select count(*) from public.wrestling_school_seasons where school_id::text like '4b100000-%') as school_seasons,
 (select count(*) from public.wrestling_roster_affiliations where id::text like '4b100000-%') as affiliations,
 (select count(*) from public.catalog_external_identities where id::text like '4b100000-%') as external_identities;
