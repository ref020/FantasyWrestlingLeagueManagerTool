# Milestone 4A hosted DEVELOPMENT verification — 2026-10-07

Status: PASS for all 31 required checks and additional checks A–G within the evidence scope below. Milestone 4A is hosted-verified for these requirements. No application/database/security defect was observed. This is not production verification, a browser audit, or a concurrency stress test.

## Method and evidence scope

The development URL was checked against the locally supplied development reference before requests. Three distinct ordinary users authenticated with the public/publishable key. Tokens remained in memory; credentials, user UUIDs, invite codes and auth headers are absent from reports. No service-role key, privileged SQL, RLS bypass, migration application or security changes were used.

All behavioral operations used normal Supabase SELECT/write/RPC boundaries. Denied mutations were compared against commissioner-visible league/team/member snapshots where indicated below. Inaccessible SELECTs returning zero rows count as isolation. Actual application formatSeason/leaguesForView helpers were run on hosted data for checks 1, 4 and 8; no browser-rendering claim is made. Local tests separately cover server-action forged form fields. Tests 28–30 review hosted pg_constraint definitions supplied by the user during this run, not source-only assumptions or destructive deletion tests. F is a documentation review.

The user reported applying the fifth migration and supplied column/function inventory before this run. Verification did not independently inspect migration bookkeeping or prove a full pre/post-application row comparison. The selected legacy league did retain NULL, and its memberships/invite were checked unchanged after explicit assignment.

## Results

Each description states the expected invariant; actual observations and PostgreSQL/PostgREST codes follow. Sanitized structured evidence is in [MILESTONE_4A_HOSTED_RESULTS.json](MILESTONE_4A_HOSTED_RESULTS.json).

| Check | Actor | Expected invariant | Result | Actual observation | Error codes |
|---|---|---|---|---|---|
| 1 | A | New league, commissioner, explicit season and application format | PASS | Hosted new league and commissioner verified; actual application formatSeason returned 2026–27 (not browser testing). | — |
| 2 | A | New league rejects missing/null/out-of-range/noninteger seasons | PASS | Missing season denied 42501; NULL/out-of-range denied 22023; fractional/nonnumeric input denied 22P02. Visible league IDs unchanged across attempts. | 42501, 22023, 22P02 |
| 3 | A | Original one-argument create overload is not executable | PASS | Authenticated call to original create_league(text) denied 42501. Same attempt included in test 2 state comparison. | 42501 |
| 4 | A | Pre-4A league retains unknown season | PASS | Existing manual test league; historical failed/retest fixtures left unchanged. Application helper checked, not browser. | — |
| 5 | A | Commissioner explicitly assigns legacy year | PASS | Stored legacy year changed from NULL to 2026; memberships and invite code unchanged. | — |
| 6 | A | Assigned season cannot change | PASS | Rejected (22023, season_already_assigned); league, team and membership snapshot unchanged. | 22023 |
| 7 | B | Member settings mutation denied | PASS | Rejected (42501, not_authorized); league, team and membership snapshot unchanged. | 42501 |
| 8 | A/B | Inactive league readable and grouped by application helper | PASS | Hosted state/read verified; actual leaguesForView helper verified historical grouping, not browser rendering. | — |
| 9 | C | Nonmember cannot read league by UUID | PASS | C received zero league rows for known League 1 UUID. | — |
| 10 | B | Member creates own normalized team | PASS | Exactly one B-owned team in League 1; returned ID, league, owner and trimmed B League One name matched. | — |
| 11 | B | Duplicate team rejected, original unchanged | PASS | Rejected (23505, team_already_exists); league, team and membership snapshot unchanged. | 23505 |
| 12 | B/C | Same user owns independent teams in two leagues | PASS | B legitimately joined League 2; B has exactly one independent team in each league. | — |
| 13 | C | Nonmember team creation rejected | PASS | Rejected (42501, not_authorized); league, team and membership snapshot unchanged. | 42501 |
| 14 | B | Owner renames own team | PASS | B name updated; team ID, owner and created_at preserved. | — |
| 15 | B | Member cannot target another owner through rename RPC | PASS | RPC only renamed B; forged owner/team parameters rejected. Direct mutation paths covered by test 17; server-action forged fields covered by local tests. | PGRST202 |
| 16 | A | Commissioner can rename own team but has no override | PASS | A renamed A team; B team stayed identical. Forged owner parameter rejected. | PGRST202 |
| 17 | A/B | Direct INSERT UPDATE DELETE denied under commissioner and member | PASS | Six direct write attempts rejected; league/team/member snapshots unchanged after each. | 42501 |
| 18 | A/B/C | Team reads scoped to current members, including known UUID | PASS | A and B each saw both League 1 teams; C saw zero by league or known team UUID. | — |
| 19 | Anonymous | Anonymous team SELECT denied | PASS | Anonymous SELECT denied 42501. | 42501 |
| 20 | B/C | Inactive league blocks creation for member without team | PASS | C, commissioner/member with no team in inactive League 2, was rejected 22023; full protected snapshot unchanged. | 22023 |
| 21 | B | Inactive league blocks existing owner rename | PASS | B rename rejected 22023 while inactive; protected snapshot unchanged. C then reactivated League 2. | 22023 |
| 22 | B/A | Team survives owner leaving | PASS | B left through leave_league; A confirmed identical retained team and absent B membership. Removal variant was not separately exercised. | — |
| 23 | B | Former owner loses team and league access | PASS | B saw zero league/team rows after leaving; rename rejected 42501; A confirmed protected state unchanged. | 42501 |
| 24 | B | Rejoin restores original team without duplicate | PASS | B rejoined with current invite; original ID/name/data restored to visibility. Duplicate create rejected 23505; owner count stayed one. | 23505 |
| 25 | A | League-1-only member cannot read League 2 teams | PASS | A, member only of League 1 among new fixtures, saw zero League 2 teams. | — |
| 26 | A | Unknown season blocks team creation before assignment | PASS | Rejected (22023, season_required); league, team and membership snapshot unchanged. | 22023 |
| 27 | B | Name boundaries, trimming and forbidden values match application | PASS | 3/50 characters accepted; 2/51 rejected; ASCII spaces trimmed; @ and newline rejected with unchanged state. | 22023 |
| 28 | Metadata review | Lineage self-link constraint | PASS | leagues_lineage_not_self: CHECK ((copied_from_league_id <> id)) | — |
| 29 | Metadata review | Lineage source deletion preserves destination | PASS | leagues_copied_from_league_id_fkey: FOREIGN KEY (copied_from_league_id) REFERENCES leagues(id) ON DELETE SET NULL | — |
| 30 | Metadata review | Team foreign keys preserve history | PASS | fantasy_teams_league_id_fkey: FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE RESTRICT; fantasy_teams_owner_user_id_fkey: FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT | — |
| 31 | C | Genuinely concurrent duplicate create on same user/league | PASS | Two concurrent calls: one success, one 23505 duplicate; exactly one owner/league row. | 23505 |
| A | A/B | Direct league UPDATE cannot modify season_start_year | PASS | A and B direct season UPDATE denied 42501; protected snapshots unchanged. | 42501 |
| B | A/B | Direct league UPDATE cannot modify is_active | PASS | A and B direct activity UPDATE denied 42501; protected snapshots unchanged. | 42501 |
| C | B | Settings cannot grant role or mutate unrelated data | PASS | Extra role/name/user parameters rejected PGRST202; protected league/team/member snapshots unchanged. Ordinary settings call denied in test 7. | PGRST202 |
| D | A/B | Create RPC rejects caller-supplied owner identity | PASS | Both sessions rejected supplied owner_user_id and p_owner_user_id with PGRST202; protected snapshots unchanged. Test 10 verifies actual derived owner. | PGRST202 |
| E | A/B | Role changes preserve team ownership | PASS | A promoted then demoted B through role RPC; requested membership role verified each time; all team rows unchanged. | — |
| F | Documentation | Inactive limits documented without full archival promise | PASS | Documentation/source review only; inactive freezes team mutations, broader archival restrictions deferred. | — |
| G | A/B | No client lineage mutation/copy workflow | PASS | Direct lineage update and extra RPC lineage parameters rejected; application source has no copy workflow. | 42501, PGRST202 |

## Concurrency

Two create_fantasy_team requests for C in League 2 were dispatched through Promise.all without awaiting either first. C was confirmed to have no team beforehand. Both requests completed in 321 ms: one succeeded, one returned 23505, and a subsequent ordinary member SELECT found exactly one (league_id, owner_user_id) row. This is a real hosted concurrent-request check, not proof of every possible scheduling interleaving.

## Fixtures and retention

Fresh fixtures: 4A League 1 1402925375; 4A League 2 1402925375. A is League 1 commissioner; C is League 2 commissioner. B legitimately joined both. Both leagues finish active. A and B own teams in League 1; B and C own teams in League 2. B's role finishes as member.

The earlier manual fixture “Milestone 3 Test League” was explicitly assigned season 2026 through A's commissioner RPC after unknown-season checks. Its memberships and invite were preserved. The historical failed-run and clean-retest league fixtures and both Milestone 3 result reports were not changed. No league/user was deleted. Fixtures may remain as authorized.

## Observed behavior and remaining scope

- 42501 denied old create overload, direct table writes and unauthorized RPCs; inaccessible member-scoped reads returned zero rows.
- 22023 rejected invalid season/name/state operations; 22P02 rejected invalid integer input before function execution.
- PGRST202 rejected non-existent RPC signatures containing forged owner, role, name or lineage parameters. No protected data changed.
- 23505 represented duplicate-team rejection, including concurrent creation. The prior join_league 42702 defect did not recur during joins/rejoin.
- No unexpected database behavior, application defect or security defect was observed. No repair migration is needed from these results.
- Removal was not separately tested in addition to the authorized leave variant. Parent-lock races with removal/activity changes, a full Milestone 3 rerun, browser rendering and broader archival policies are outside this run's claims.
- Account deletion/anonymization, ownership transfer, mistaken season correction and future archival locks remain product decisions already documented in [MILESTONE_4A.md](MILESTONE_4A.md).

## Cleanup and local verification

Temporary .tmp-4a-verify.mjs and .tmp-4a-report.mjs were removed; absence was checked. No temporary app route was installed. .env.local and .env.rls.local remain ignored. No credentials were added to reports. No commit or push was performed. Production was untouched; no 4B/drafting/rosters/scoring work began.

Post-cleanup checks: lint PASS; typecheck PASS; tests PASS (98 tests, 10 files); production build PASS; git diff --check PASS. The first sandboxed build could not spawn its TypeScript worker (EPERM); the permitted rerun outside that restriction passed. No application change was needed. New-file whitespace checks and report credential-content checks also passed.
