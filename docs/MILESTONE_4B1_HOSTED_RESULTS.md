# Milestone 4B-1 hosted DEVELOPMENT results

**COMPLETE — 40 requirement checks PASS within the evidence scope below. Hosted-verified.**

The original SQL constraint grid remains **36 PASS / 1 FAIL**. Test 33 was resolved by reviewing the supplied hosted foreign-key definitions alongside the blocked deletion. This is a documented requirement-level adjudication, not a claim that the raw script passed or was rerun.

## Resolution of outstanding checks

- Test 2: all seven tables have RLS enabled; anonymous SELECT and authenticated writes are denied by grants. Only the four intended read tables grant authenticated SELECT. Four SELECT policies match the applied design.
- Test 33: provider deletion returned 23503 (foreign_key_violation), and both hosted source foreign keys explicitly use ON DELETE RESTRICT. The integrity requirement passed; the local-runtime-specific expected code 23001 caused the original assertion failure. The original SQL and raw result are preserved unchanged.
- Test 38: public.rls_auto_enable returns event_trigger and is bound to ensure_rls on ddl_command_end for table-creation commands. Its body enables RLS on public tables. This resolves the inventory concern; it is not an ordinary catalog-write RPC. No invocation or grant modification was needed.

Reference semantics: [PostgreSQL error codes](https://www.postgresql.org/docs/current/errcodes-appendix.html) and [event-trigger behavior](https://www.postgresql.org/docs/current/event-trigger-definition.html). Hosted evidence is the user-supplied output, not those reference pages.

## Individual results

| Test | Description | Result | Evidence type | Observation |
|---|---|---|---|---|
| 1 | Seven tables exist | PASS | Hosted SQL metadata/constraint assistance | User-supplied SQL Editor fixture counts cover all seven tables (36 rows); API checks below independently exercise exposed relations. |
| 2 | RLS enabled on all seven | PASS | User-supplied hosted SQL Editor metadata | All seven tables have rls_enabled=true, anon SELECT=false and authenticated INSERT/UPDATE/DELETE=false. Authenticated SELECT is true only on the four intended catalog read tables. Four SELECT-only authenticated policies match the intended identity, official evidence and parent visibility gates. |
| 3 | Approved schools readable | PASS | Ordinary hosted session | User A SELECT returned precisely the two approved synthetic schools. |
| 4 | Approved wrestlers readable | PASS | Ordinary hosted session | User A SELECT returned nine approved synthetic people. |
| 5 | Verified DI programs readable | PASS | Ordinary hosted session | User A SELECT returned two verified D-I synthetic programs. |
| 6 | Approved official affiliations readable | PASS | Ordinary hosted session | User A SELECT returned seven approved affiliations, including historical and removed records. |
| 7 | Anonymous catalog reads denied | PASS | Ordinary hosted session | Anonymous SELECT denied on all seven: catalog_sources:42501, catalog_evidence:42501, catalog_external_identities:42501, wrestling_schools:42501, wrestlers:42501, wrestling_school_seasons:42501, wrestling_roster_affiliations:42501. |
| 8 | Authenticated catalog writes denied | PASS | Ordinary hosted session | Users B and A each attempted INSERT, UPDATE, DELETE on all seven tables (42 requests); every request denied with 42501. Updates/deletes targeted only synthetic fixtures. |
| 9 | Commissioner writes denied | PASS | Ordinary hosted session | User A has an existing commissioner membership; all 21 catalog write attempts denied with 42501. |
| 10 | Backend provenance inaccessible | PASS | Ordinary hosted session | Authenticated SELECT on all three provenance tables denied with 42501. |
| 11 | Unapproved identities hidden | PASS | Ordinary hosted session | Known existing unapproved school/person absent; approved positive controls visible. |
| 12 | Unverified programs hidden | PASS | Ordinary hosted session | Known existing unverified 1901 program absent. |
| 13 | Non-DI programs hidden | PASS | Ordinary hosted session | Known existing ineligible 1902 program absent. |
| 14 | Unapproved affiliations hidden | PASS | Ordinary hosted session | Known unapproved rostered affiliation absent. |
| 15 | Unverified roster claims hidden | PASS | Ordinary hosted session | Known unverified pending-official-evidence affiliation absent. |
| 16 | Wrong evidence kind approval rejected | PASS | User-supplied hosted SQL Editor constraint execution; privileged, not ordinary authorization | pending official roster evidence: PASS (expected 23514; actual 23514); roster verification timestamp mismatch: PASS (expected 23514; actual 23514); wrong classification evidence kind: PASS (expected 23514; actual 23514); wrong roster evidence kind: PASS (expected 23514; actual 23514) |
| 17 | Nonofficial evidence approval rejected | PASS | User-supplied hosted SQL Editor constraint execution; privileged, not ordinary authorization | nonofficial classification evidence: PASS (expected 23514; actual 23514); nonofficial roster evidence: PASS (expected 23514; actual 23514) |
| 18 | Provider/evidence mismatch rejected | PASS | User-supplied hosted SQL Editor constraint execution; privileged, not ordinary authorization | provider evidence mismatch: PASS (expected 23503; actual 23503) |
| 19 | Duplicate provider identity rejected | PASS | User-supplied hosted SQL Editor constraint execution; privileged, not ordinary authorization | duplicate provider namespace key: PASS (expected 23505; actual 23505) |
| 20 | Same-name people remain distinct | PASS | Ordinary hosted session | Two identical-name wrestlers retain separate UUIDs and separate affiliations. |
| 21 | Redshirt without matches pool eligible | PASS | Ordinary hosted read plus TypeScript rule | Exact application PostgREST pool query includes synthetic case; actual TypeScript eligibility helper agrees. No matches or health prerequisites; fabricated fixture labels are not real NCAA facts. |
| 22 | Freshman without matches pool eligible | PASS | Ordinary hosted read plus TypeScript rule | Exact application PostgREST pool query includes synthetic case; actual TypeScript eligibility helper agrees. No matches or health prerequisites; fabricated fixture labels are not real NCAA facts. |
| 23 | Injured rostered athlete pool eligible | PASS | Ordinary hosted read plus TypeScript rule | Exact application PostgREST pool query includes synthetic case; actual TypeScript eligibility helper agrees. No matches or health prerequisites; fabricated fixture labels are not real NCAA facts. |
| 24 | NULL weight pool eligible but no slot | PASS | Ordinary hosted read plus TypeScript rule | Hosted pool includes NULL weight; actual TypeScript slot helper rejects every permitted weight. |
| 25 | Superseded excluded from pool | PASS | Ordinary hosted read plus TypeScript rule | Affiliation is RLS-visible but excluded by hosted current-pool query and actual TypeScript eligibility helper. |
| 26 | Removed excluded from pool | PASS | Ordinary hosted read plus TypeScript rule | Affiliation is RLS-visible but excluded by hosted current-pool query and actual TypeScript eligibility helper. |
| 27 | Source outage preserves eligibility | PASS | Ordinary hosted read plus TypeScript rule | Persisted approved fixtures reference nonresolving example.invalid sources; hosted query still returns five without contacting sources. TypeScript helper ignores simulated sourceAvailable=false. No importer/outage job exists or was exercised. |
| 28 | Transfer preserves identity/history | PASS | User-supplied hosted SQL Editor constraint execution; privileged, not ordinary authorization | transfer and return preserve identity/history: PASS (expected OK; actual OK) |
| 29 | Conflicting current approved claims rejected | PASS | User-supplied hosted SQL Editor constraint execution; privileged, not ordinary authorization | conflicting approved school: PASS (expected 23505; actual 23505); duplicate current same-school revision: PASS (expected 23505; actual 23505) |
| 30 | Affiliation history immutable | PASS | User-supplied hosted SQL Editor constraint execution; privileged, not ordinary authorization | closure predating verification: PASS (expected 23514; actual 23514); historical affiliation delete: PASS (expected 23514; actual 23514); historical affiliation reopen: PASS (expected 23514; actual 23514); historical affiliation rewrite: PASS (expected 23514; actual 23514) |
| 31 | Evidence immutable | PASS | User-supplied hosted SQL Editor constraint execution; privileged, not ordinary authorization | evidence delete: PASS (expected 23514; actual 23514); evidence rewrite: PASS (expected 23514; actual 23514) |
| 32 | Revision closure/replacement atomic | PASS | User-supplied hosted SQL Editor constraint execution; privileged, not ordinary authorization | failed replacement rolls closure back: PASS (expected 23514 and identical original row; actual 23514) |
| 33 | Source/provider FK integrity | PASS | User-supplied hosted SQL Editor constraint execution; privileged, not ordinary authorization | Requirement adjudicated PASS from hosted behavior plus supplied FK definitions: missing evidence/provider/wrestler/program references rejected with 23503; referenced provider deletion also rejected with 23503. Both source_id FKs explicitly specify ON DELETE RESTRICT; provider/evidence composite FK is present. Original raw assertion FAIL (expected 23001, actual 23503) is preserved in hostedConstraintRun and originalAssessment. No rerun or all-green raw script result is claimed. |
| 34 | All ten weights allowed | PASS | User-supplied hosted SQL Editor constraint execution; privileged, not ordinary authorization | allowed weight 125: PASS (expected OK; actual OK); allowed weight 133: PASS (expected OK; actual OK); allowed weight 141: PASS (expected OK; actual OK); allowed weight 149: PASS (expected OK; actual OK); allowed weight 157: PASS (expected OK; actual OK); allowed weight 165: PASS (expected OK; actual OK); allowed weight 174: PASS (expected OK; actual OK); allowed weight 184: PASS (expected OK; actual OK); allowed weight 197: PASS (expected OK; actual OK); allowed weight 285: PASS (expected OK; actual OK) |
| 35 | Invalid weights rejected | PASS | User-supplied hosted SQL Editor constraint execution; privileged, not ordinary authorization | invalid weight -1: PASS (expected 23514; actual 23514); invalid weight 0: PASS (expected 23514; actual 23514); invalid weight 126: PASS (expected 23514; actual 23514); invalid weight 286: PASS (expected 23514; actual 23514) |
| 36 | League/team regression | PASS | Ordinary hosted session | Focused hosted regression using existing 4A fixtures: three_distinct_ordinary_users, nonmember_league_hidden, nonmember_teams_hidden, member_team_read, nonmember_team_create_42501, duplicate_team_23505, nonmember_rename_42501, member_settings_42501, legacy_create_42501, invalid_season_22023, direct_team_write_42501, denied_mutations_preserved_team_snapshot, repeat_join_success_no_42702, owner_same_name_rename_success, team_identity_name_owner_preserved. Owner rename submitted the existing name; only updated_at may change. No new league/team created. This is not a rerun of the full 4A suite. |
| 37 | Migration history unchanged | PASS | Local Git history comparison; not hosted migration-ledger inspection | git diff --exit-code HEAD for all five previously applied migrations returned 0. Catalog migration was not edited during this verification pass. User reports sixth migration applied; hosted migration bookkeeping was not independently inspected. |
| 38 | No public catalog-write RPC | PASS | User-supplied hosted function inventory, definition and event-trigger metadata | No catalog-write RPC in supplied public/private function inventory. public.rls_auto_enable returns event_trigger and is bound to enabled ensure_rls at ddl_command_end for CREATE TABLE, CREATE TABLE AS and SELECT INTO. Its body enables RLS on created public tables; it is not an ordinary catalog-write RPC. No function invocation or grant changes performed. |
| 39 | Private predicate no provenance exposure | PASS | Ordinary hosted session | Private-schema RPC denied (PGRST106); public RPC absent (PGRST202); direct provenance SELECT denied in test 10. Does not claim the private boolean function has no SQL-level boolean oracle. User-supplied metadata also confirms catalog predicate owner postgres, empty search_path, anon EXECUTE false and authenticated EXECUTE true; catalog trigger functions have no anon/authenticated EXECUTE. |
| 40 | Cross-league global catalog isolation | PASS | Ordinary hosted session | A and C have distinct league membership sets; A/B/C read the same five global pool rows. Catalog writes denied separately in tests 8–9. |

## Hosted SQL Editor constraint run

Source: user-supplied DEVELOPMENT results, separate from ordinary-user authorization. The original script ends with ROLLBACK and each mutation attempt is also rolled back in a subtransaction.

| Test | Case | Result | Expected | Actual |
|---|---|---|---|---|
| 16 | pending official roster evidence | PASS | 23514 | 23514 |
| 16 | roster verification timestamp mismatch | PASS | 23514 | 23514 |
| 16 | wrong classification evidence kind | PASS | 23514 | 23514 |
| 16 | wrong roster evidence kind | PASS | 23514 | 23514 |
| 17 | nonofficial classification evidence | PASS | 23514 | 23514 |
| 17 | nonofficial roster evidence | PASS | 23514 | 23514 |
| 18 | provider evidence mismatch | PASS | 23503 | 23503 |
| 19 | duplicate provider namespace key | PASS | 23505 | 23505 |
| 28 | transfer and return preserve identity/history | PASS | OK | OK |
| 29 | conflicting approved school | PASS | 23505 | 23505 |
| 29 | duplicate current same-school revision | PASS | 23505 | 23505 |
| 30 | closure predating verification | PASS | 23514 | 23514 |
| 30 | historical affiliation delete | PASS | 23514 | 23514 |
| 30 | historical affiliation reopen | PASS | 23514 | 23514 |
| 30 | historical affiliation rewrite | PASS | 23514 | 23514 |
| 31 | evidence delete | PASS | 23514 | 23514 |
| 31 | evidence rewrite | PASS | 23514 | 23514 |
| 32 | failed replacement rolls closure back | PASS | 23514 and identical original row | 23514 |
| 33 | missing evidence FK | PASS | 23503 | 23503 |
| 33 | missing provider FK | PASS | 23503 | 23503 |
| 33 | missing school season FK | PASS | 23503 | 23503 |
| 33 | missing wrestler FK | PASS | 23503 | 23503 |
| 33 | referenced provider delete | FAIL | 23001 | 23503 |
| 34 | allowed weight 125 | PASS | OK | OK |
| 34 | allowed weight 133 | PASS | OK | OK |
| 34 | allowed weight 141 | PASS | OK | OK |
| 34 | allowed weight 149 | PASS | OK | OK |
| 34 | allowed weight 157 | PASS | OK | OK |
| 34 | allowed weight 165 | PASS | OK | OK |
| 34 | allowed weight 174 | PASS | OK | OK |
| 34 | allowed weight 184 | PASS | OK | OK |
| 34 | allowed weight 197 | PASS | OK | OK |
| 34 | allowed weight 285 | PASS | OK | OK |
| 35 | invalid weight -1 | PASS | 23514 | 23514 |
| 35 | invalid weight 0 | PASS | 23514 | 23514 |
| 35 | invalid weight 126 | PASS | 23514 | 23514 |
| 35 | invalid weight 286 | PASS | 23514 | 23514 |


## Evidence scope and artifacts

Public/publishable key only, three distinct ordinary sessions, DEVELOPMENT URL matched locally supplied project reference. No service-role key, migrations, production, commits, push, importer or 4B-2 work. SQL Editor execution remains user-controlled and separate.

Ordinary authorization used three distinct authenticated sessions and the public key against the guarded DEVELOPMENT target. SQL Editor constraints and metadata were supplied separately by the user. TypeScript eligibility checks are labeled separately. Test 37 establishes local migration-file preservation, not independent hosted migration bookkeeping. No browser test, production verification, importer behavior test or concurrent-session stress test is claimed.

All 36 synthetic catalog fixtures remain clearly marked TEST ONLY, season 1900, reserved UUIDs and example.invalid references. Earlier ordinary tests created no catalog data. An existing team same-name rename refreshed its updated_at during regression testing. Temporary runners were removed. This final reconciliation performed no hosted operation. No applied migration, previous milestone report, application feature, commit or push was changed.

## Local verification

Final checks after metadata reconciliation: lint PASS, typecheck PASS, 160 tests in 14 files PASS, production build PASS, and git diff --check PASS. Embedded PostgreSQL tests remain local evidence only.

No unresolved application/security/schema defect was found within this verification scope. The preserved raw SQLSTATE assertion mismatch is a test expectation issue. Final local checks passed: ready for the verified Git checkpoint; checkpoint creation and push require a subsequent instruction. Milestone 4B-2 has not started.

[Structured evidence, original failure and complete supplied metadata](MILESTONE_4B1_HOSTED_RESULTS.json).
