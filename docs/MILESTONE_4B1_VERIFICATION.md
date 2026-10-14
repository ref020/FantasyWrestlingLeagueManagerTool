# Milestone 4B-1 verification — hosted review complete

The user reports successful catalog migration application to hosted DEVELOPMENT.
The user executed the approved 36-record synthetic fixture preparation. Ordinary-session
hosted checks and user-supplied SQL Editor evidence have been reviewed. All 40 requirements
are PASS within the documented scope; the original SQLSTATE assertion mismatch is preserved.
See [individual results](MILESTONE_4B1_HOSTED_RESULTS.md). Local tests include pure rules, mocked read queries, source contracts,
and actual in-memory PostgreSQL execution using test-only PGlite. The latter applies
all six migrations with local stand-ins for Supabase roles/auth and tests constraints,
revision transactions and RLS. It does not establish hosted authorization or PostgREST behavior.

The checklist below is retained as the verification plan; the hosted report records
which behaviors were exercised and their scope. Application and fixture preparation
were authorized and completed. Do not reapply the migration. Production remains untouched.
Record actor, expected/actual outcome, error code and protected-state comparisons.
Preserve failures as failures. Do not weaken security to create successful tests.

## Controlled fixture preparation (separate from user authorization tests)

With separately authorized backend/DBA access, prepare synthetic source/evidence,
two same-name people, two schools, season-specific DI/ineligible/unverified programs,
pending/nonofficial/approved evidence, NULL/known weights and current/historical
affiliations. This preparation is privileged setup, never evidence of user authority.
No public importer RPC or temporary backdoor is permitted. Keep real identities,
auth material and provider secrets out of reports. Plan retention-aware cleanup:
append-only evidence/revisions cannot simply be deleted. Use a disposable local
PostgreSQL database for destructive constraint tests when available, or approve
permanent synthetic DEVELOPMENT fixtures; do not disable triggers for cleanup.

## Ordinary-client hosted authorization matrix

Use anonymous and three ordinary user sessions with only the public/publishable key.
The completed run used a commissioner, a member, and a nonmember of the regression
league who belonged to another league. It did not test a user with zero league memberships.
Catalog read access is global for authenticated users, independent of league roles.

| Check | Expected |
|---|---|
| Anonymous SELECT all seven tables | Denial/no rows |
| Authenticated approved school/person SELECT | Approved identities visible; same-name IDs distinct |
| Pending identity/evidence or nonofficial program/roster | Hidden at the appropriate parent/affiliation boundary |
| Authenticated SELECT provenance, providers, external mappings | Denied, including known IDs |
| Direct INSERT/UPDATE/DELETE all seven tables as member and commissioner | Denied; inspect unchanged state through legitimate visibility/setup tooling |
| Caller role/user-ID spoofing and public RPC discovery | No catalog-write surface or role override |
| Private schema exposure / function ACLs | Private schema not exposed; only read predicate has authenticated execute; no write helper |
| Approved current DI roster query | Same results for all authenticated users; pagination and inner joins work |
| Verified redshirt/freshman/injured/no-match/debut fixtures | Eligible without competition data |
| NULL weight | Present in pool; no weight slot |
| Exact ten weights | Matching slot only; invalid values rejected by constraint |
| Ineligible or unverified program | No eligible affiliations, including known UUID reads |
| Multi-division school with verified DI men's wrestling | Qualifies on sport classification, not institutional division |
| Superseded/removed affiliation | Historical approved record retained; excluded from current pool |
| Temporary source outage | No automatic data mutation/removal; prior verified eligibility unchanged |
| Prior league/team behavior | M4A reads/RPCs/ownership unchanged; no catalog write powers conferred |

## Database constraints / structural checks (label separately)

- Verify seven RLS-enabled tables, SELECT-only grants, four policies and function ACLs.
- Verify all catalog FKs are RESTRICT and no references modify leagues/teams/users.
- Insert duplicate names with different UUIDs; both succeed.
- Exercise one person across years and a same-year transfer. Close prior revision
  and insert replacement atomically; previous ID and evidence survive.
- Return to the same school by creating a new revision; no overwriting prior tenure.
- Concurrent same provider/entity-kind/key mappings to different people: only one
  succeeds. Provider namespaces and different providers remain independent.
- Concurrent current approved affiliations for one person/year: only one succeeds.
- Same person/school/year permits historical rows but only one current revision.
- Missing/wrong typed external target and invalid FKs fail; URL/ID key byte limit holds.
- External mapping evidence from a different provider fails with a composite FK violation.
- Wrong-kind, pending or unofficial evidence cannot approve DI classifications/rosters;
  an approved affiliation verification timestamp must match its evidence timestamp.
- Evidence pending defaults; approved evidence requires valid verification chronology.
- Affiliation approval requires verification and roster status; NULL weight accepted.
- Evidence UPDATE/DELETE fails. Affiliation UPDATE may only close superseded_at
  once; changes to name/weight/status/person/school/evidence/dates or reopening fail.
- Supersession before verification fails. Confirmed removal requires retained
  historical row plus new reviewed evidence/status, not deletion.
- Confirm no cascade path into historical or fantasy data; do not delete accounts
  or real fixtures to prove FK behavior. Read catalog definitions instead.
- New application helpers and SQL filters agree on current season membership.

Backend-only constraint tests must be identified as such; never use privileged
access to assert ordinary users can/cannot write. Local execution coverage is in
postgres.test.ts, separately from source checks and mocked query tests. A future importer must additionally
prove its outage, review, merge, transactional replacement and retry behavior.

## Local checks

Run lint, typecheck, tests, production build and git diff --check. Record results
in the implementation report. No new hosted success claim belongs here until the
matrix is actually executed after explicit authorization.
