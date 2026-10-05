# Milestone 3 hosted authorization retest — 2026-10-05

Status: PASS for all 18 required tests and additional checks A–G. This confirms the tested Milestone 3 hosted development authorization behavior, not a browser/UI audit, production verification, or concurrency stress test. Milestone 4 was not started.

The run used the public/publishable key and three distinct ordinary authenticated user sessions, with the project URL checked against the user-supplied development reference before requests. Two new disposable leagues established a clean state: A sole commissioner of League 1 and C sole commissioner of League 2. B joined League 1 normally. No preexisting test league was reused. C temporarily joined League 1 for the ordinary-member removal denial check, then left before stale-invite testing.

All operations used normal Supabase SELECT/write/RPC boundaries. Credentials and session tokens stayed out of logs/reports; tokens remained in memory. No migrations, service-role access, privileged SQL, RLS/policy changes, or security bypasses were used. The prior 42702 join failure did not recur: new and repeated joins passed. The runner did not inspect hosted function definitions or migration history; it verifies deployed behavior.

| Check | Actor | Operation | Expected | Actual | Result | Error code | Protected data unchanged |
|---|---|---|---|---|---|---|---|
| 1 | A | create_league RPC and own league/member SELECT | Fresh league with A as sole commissioner | Exactly one membership; A commissioner; creator is A | PASS | — | not applicable |
| setup | C | Create independent League 2 | C sole commissioner; distinct league UUID | Fresh separate league; exactly one C commissioner | PASS | — | not applicable |
| F/initial | A/C | Check both fixture invite formats | Both match ^[A-HJ-NP-R]{20}$ | Both codes inspected without printing them | PASS | — | not applicable |
| 2 | B | join_league with current valid invite | B ordinary member; already_member false | Membership and returned flag checked | PASS | — | not applicable |
| 3/A | C | Direct SELECT League 1 and memberships using UUID | No visible rows; C does not join | Both queries returned no accessible rows; memberships unchanged | PASS | — | True |
| 4/B | B | Direct invite table SELECT | No accessible invite code | No accessible rows | PASS | — | True |
| 5 | B | Promote self | RPC rejects unauthorized action; memberships unchanged | Rejected; state re-read as A | PASS | 42501 | True |
| 6/commissioner | B | Set A role to commissioner | RPC rejects unauthorized action; memberships unchanged | Rejected; state re-read as A | PASS | 42501 | True |
| 6/member | B | Set A role to member | RPC rejects unauthorized action; memberships unchanged | Rejected; state re-read as A | PASS | 42501 | True |
| 7 | A | Set B role to commissioner | Requested B role; A remains commissioner | Both roles verified | PASS | — | not applicable |
| 8 | A | Set B role to member | Requested B role; A remains commissioner | Both roles verified | PASS | — | not applicable |
| 9 | A | Demote sole commissioner A | RPC rejects unauthorized action; memberships unchanged | Rejected; state re-read as A | PASS | 23514 | True |
| 10 | A | Sole commissioner leaves | RPC rejects unauthorized action; memberships unchanged | Rejected; state re-read as A | PASS | 23514 | True |
| 11 | B | Ordinary member leaves | B absent; A still commissioner | Memberships inspected | PASS | — | not applicable |
| 12 | A | Remove ordinary member B | B absent; A remains commissioner | Memberships inspected | PASS | — | not applicable |
| 13 | B | Remove ordinary member C | RPC rejects unauthorized action; memberships unchanged | Rejected; state re-read as A | PASS | 42501 | True |
| G/F | A | Regenerate invite and read stored value | Different code, valid format, RPC matches stored value | Compared without disclosing codes | PASS | — | not applicable |
| 14 | C | Join with old invite after regeneration | Rejected; C remains outside League 1 | Old invite rejected; membership unchanged | PASS | 22023 | True |
| 15 | C | Join with new invite | New ordinary membership; League 2 commissioner preserved | Both league roles inspected | PASS | — | not applicable |
| 16 | B | Repeat join while already a member | already_member true; exactly one B row; no state change | Returned flag and membership row count inspected | PASS | — | True |
| 17/A | A | SELECT League 2 memberships | Zero accessible rows | Zero accessible rows | PASS | — | True |
| 17/B | B | SELECT League 2 memberships | Zero accessible rows | Zero accessible rows | PASS | — | True |
| C/A/leagues/insert | A | Direct insert on leagues | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/A/leagues/update | A | Direct update on leagues | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/A/leagues/delete | A | Direct delete on leagues | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/A/league_members/insert | A | Direct insert on league_members | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/A/league_members/update | A | Direct update on league_members | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/A/league_members/delete | A | Direct delete on league_members | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/A/league_invite_codes/insert | A | Direct insert on league_invite_codes | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/A/league_invite_codes/update | A | Direct update on league_invite_codes | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/A/league_invite_codes/delete | A | Direct delete on league_invite_codes | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/B/leagues/insert | B | Direct insert on leagues | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/B/leagues/update | B | Direct update on leagues | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/B/leagues/delete | B | Direct delete on leagues | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/B/league_members/insert | B | Direct insert on league_members | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/B/league_members/update | B | Direct update on league_members | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/B/league_members/delete | B | Direct delete on league_members | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/B/league_invite_codes/insert | B | Direct insert on league_invite_codes | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/B/league_invite_codes/update | B | Direct update on league_invite_codes | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| C/B/league_invite_codes/delete | B | Direct delete on league_invite_codes | Permission denial or zero changed rows; protected data unchanged | Database denied write | PASS | 42501 | True |
| D | B | Direct commissioner-only regenerate RPC | Rejected; invite and memberships unchanged | Database rejected ordinary member | PASS | 42501 | True |
| E | A | Final commissioner state after all attempted role/leave/write operations | A remains sole commissioner | Exactly one commissioner, A | PASS | — | not applicable |
| supplement/malformed | B | Join with malformed invite | 22023 rejection; no membership change | Rejected; state verified | PASS | 22023 | True |
| supplement/unknown | B | Join with unknown invite | 22023 rejection; no membership change | Rejected; state verified | PASS | 22023 | True |
| 18/leagues | Anonymous | SELECT leagues | No rows exposed | Permission denied | PASS | 42501 | True |
| 18/league_members | Anonymous | SELECT league_members | No rows exposed | Permission denied | PASS | 42501 | True |

## Interpretation and remaining scope

- Unauthorized member reads were filtered to zero rows. Anonymous table reads and direct table writes returned 42501.
- Final-commissioner demotion and leave returned 23514. The sole commissioner remained in place.
- Old, malformed, and unknown invite codes returned 22023. Regenerated codes were different and valid; new codes joined successfully.
- Direct INSERT/UPDATE/DELETE checks covered leagues, league_members, and league_invite_codes under both A's commissioner and B's member sessions. Both fixture leagues' visible data were compared before/after; no changes occurred.
- Repeat joining returned already_member=true and left exactly one membership row for B.
- Invite format was checked for both new fixtures and the regenerated code; this does not claim an audit of all historical invite codes.
- No security or application defect was observed in this run. The earlier failed run remains recorded in MILESTONE_3_HOSTED_RESULTS.md/.json and is not rewritten as a pass.

## Cleanup

The temporary local Node runner `.tmp-rls-check.mjs` was removed after testing; absence was checked. No temporary application route was created. Test leagues/users remain in development. The user-populated `.env.rls.local` remains ignored and is not included in reports. No commit was made and no Milestone 4 work occurred.

Post-cleanup checks: lint PASS; typecheck PASS; tests PASS (47 tests, 6 files); production build PASS; git diff --check PASS. Production routes contain no test route.
