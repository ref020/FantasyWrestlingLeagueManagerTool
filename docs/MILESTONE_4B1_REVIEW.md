# Milestone 4B-1 pre-migration correction review

Historical pre-migration review: the findings below describe the correction pass before application. Subsequently, the user applied this migration to DEVELOPMENT and Milestone 4B-1 completed hosted verification. See [the hosted report](MILESTONE_4B1_HOSTED_RESULTS.md) for all 40 requirements, evidence limits, and the preserved SQLSTATE assertion discrepancy. Milestone 4B-2 has not started.

At the time of this review, the migration was ready for manual review but not yet approved for hosted application.
Complete updated SQL: [202610130001_global_wrestling_catalog.sql](../supabase/migrations/202610130001_global_wrestling_catalog.sql).

## SQL corrections

1. Added required constrained evidence_kind: identity, program_classification, official_roster.
2. Added evidence UNIQUE (id, source_id), a declarative composite FK target.
3. Replaced the external mapping's evidence-only FK with
   (evidence_id, source_id) REFERENCES catalog_evidence(id, source_id) ON DELETE RESTRICT.
4. Extended private.catalog_evidence_approved to require an expected kind, updating
   its signature, owner/ACL statements and all four SELECT-policy calls.
5. Added private.validate_catalog_approval, a SECURITY INVOKER trigger with empty
   search_path and revoked client execute. Approved identities require verified
   identity evidence; DI programs require verified official classification evidence;
   approved affiliations require verified official roster evidence. Approval is
   rejected at write time, not merely hidden later by RLS.
6. Added the approval triggers on school/person/program INSERT or UPDATE and roster
   INSERT only. Approved affiliation verification time must match its evidence.
7. Qualified outer-row school/person references in RLS subqueries explicitly.

No escaped dot identifiers were present in the actual SQL. The original immutable
history trigger, chronology checks and uniqueness indexes required no change;
their intended behavior now has executable PostgreSQL tests. The five applied
migrations remain unchanged. No importer or public catalog mutation API was added.

## Revision transaction protocol for the future trusted backend

After independently reviewing the transfer/correction/removal evidence:

1. BEGIN; lock the canonical wrestler row FOR UPDATE to serialize this person's revisions.
2. Read and lock expected current affiliations; compare IDs/status with the reviewed
   state. If the state has changed, abort and review/retry rather than guessing.
3. Insert new evidence, with provider, kind, source reference, observation and verified
   times. Reuse existing immutable evidence only when it actually supports the claim.
4. Set only superseded_at on the explicitly reviewed current revision. The transition
   time must be at least its last_verified_at (or first_observed_at if unverified).
   Check exactly the expected row count. A pending destination-school claim also
   needs explicit adjudication/closure; do not automatically replace approved history.
5. INSERT the replacement revision with the same wrestler UUID and the reviewed school,
   season, weight/status and evidence. Transfer may change the school; removal uses
   removed; a return can create another revision for the same school/year.
6. COMMIT only when all steps succeed. Any FK/approval/uniqueness/timestamp failure
   rolls back the closure and insertion together. Retry only after rereading state.

The database permits one current revision per person/school/year and one current
approved rostered school per person/year. A conflicting pending school claim can
coexist but stays hidden/ineligible. It cannot promote itself or silently replace
the approved claim. Closing a row never rewrites its status, school, weight or evidence.
Tests demonstrate same-season transfer, retained history and rollback after failed replacement.
No importer transaction endpoint or scheduling logic is implemented.

## Exact pool versus visibility conditions

The read query requires an authenticated caller and uses their ordinary SSR client.
It INNER JOINs wrestler, school-season and school through existing FKs. Its explicit
filters are: season_start_year equals the validated requested year; is_approved=true;
roster_status='rostered'; superseded_at IS NULL; last_verified_at IS NOT NULL;
joined school-season classification='ncaa_di_men'. Results are ordered by UUID,
paginated in pages of 100. There is NO primary-weight or match-count filter.

RLS additionally requires approved school/person identities with verified identity
evidence, official approved classification evidence, and official approved roster
evidence of their respective kinds. RLS intentionally allows approved superseded
and removed rows for historical viewing; visibility alone does not imply eligibility.

The pure helper separately checks identity approval, DI classification, verified
official program evidence, verified official roster evidence, approved affiliation,
matching year, verification time, rostered status and no supersession. Those approval
inputs must be trusted, never supplied by application users. Weight-slot eligibility
adds a known allowed weight equal to the requested slot. NULL weight stays in the
season pool. Redshirts/noncompeting/no-match wrestlers are not excluded. Source
outages are not removal events and do not mutate or expire affiliation state.

## Security and remaining trust boundaries

All seven tables have RLS. Authenticated users have only approved SELECT access
on the four participation tables. Anonymous reads and ordinary INSERT/UPDATE/DELETE
are denied. Sources, evidence and external mappings have no ordinary read grants.
No commissioner predicate or client-supplied identity grants catalog privileges.
There is no public catalog-write function. The sole definer helper reads evidence
and returns a boolean; it is postgres-owned with empty search_path and restricted
execute. All triggers are invoker functions with client execute revoked.

Policy dependencies form a directed acyclic chain: affiliation → person and
program → school; identity/program/affiliation policies use a definer predicate
that reads backend evidence. No policy points back to affiliation. Executed
authenticated reads complete without RLS recursion. The private schema must remain
unexposed by hosted PostgREST; local tests do not verify server API configuration.

Provider consistency is declarative; source authenticity and factual subject/year
matching still require trusted review. Evidence_kind prevents using an identity
document as roster/classification evidence, but the database cannot prove a URL
is official or that its contents support the claimed person/school/year. Privileged
DB owners can bypass protections; backend privilege provisioning is deferred.
Identity approval revocation may hide history without deleting it. Staleness,
merge/revocation workflows and provider access permissions remain future decisions.

## Test scope

PGlite 0.5.9 is a pinned dev dependency only. postgres.test.ts executes all six
migrations in a disposable in-memory PostgreSQL instance; the bootstrap creates
local anon/authenticated roles and an auth.uid stand-in. Thirteen execution tests
cover dependencies, provider mismatch, name identity, NULL weights, transfers,
rollback, conflicting claims, removal, immutable evidence/history, timestamps,
official approval and role-based SELECT/write denial. These are actual PostgreSQL
tests, not string matching, but not hosted Supabase/PostgREST or multi-session races.

Other tests remain explicitly labeled pure helpers, mocked queries and migration
source contracts. No production or hosted DEVELOPMENT connection is used.

Final local verification (2026-10-13): lint PASS; typecheck PASS; 160 tests across
14 files PASS, including 13 embedded PostgreSQL execution tests; production build
PASS; git diff --check and new-file whitespace checks PASS. The final sandboxed
Vitest startup hit EPERM; the permitted rerun passed. Test query result types were
corrected after typecheck identified missing generic row types. No application
behavior was changed to suppress a failure. No hosted database, production,
commit/push, importer, 4B-2 or gameplay work was touched.
