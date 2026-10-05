# Milestone 3 hosted authorization verification — 2026-10-05

Historical run status: BLOCKED, not hosted-verified at that time. A later clean-state retest passed all required checks; see [the retest report](MILESTONE_3_HOSTED_RETEST.md). The failed results below are preserved as originally observed. The user reported successful application of
`202610050001_fix_league_migration.sql` and confirmed the lowercase generator,
nullable creator FK with SET NULL, and application create/regenerate flows.

This run used the confirmed development project, its public key, and three distinct
ordinary authenticated accounts. Sessions stayed in memory. No privileged key,
SQL access, security changes, or migrations were used. Results contain no credentials,
tokens, user identifiers, or invite codes. Raw sanitized observations are in
`MILESTONE_3_HOSTED_RESULTS.json`.

| Test | Actor / operation | Expected | Actual | Result | Error | Protected data |
|---|---|---|---|---|---|---|
| 1 | A: create League 1 via RPC | A is sole commissioner | One membership, A commissioner | PASS | — | New disposable fixture |
| 2 | B: join with current valid code | B joins as member | RPC rejected; membership unchanged | FAIL | 42702 | Unchanged, checked as A |
| 3 | C: SELECT League 1 by UUID | No visible row or membership | Zero rows; no membership added | PASS | — | Unchanged |
| 4 | B: SELECT invite code | No visible code | Not run after join failure | BLOCKED | — | Not assessed |
| 5 | B: promote self | Rejected | Not run | BLOCKED | — | Not assessed |
| 6 | B: change A role | Rejected | Not run | BLOCKED | — | Not assessed |
| 7 | A: promote B | B commissioner | Not run | BLOCKED | — | Not assessed |
| 8 | A: demote B | B member; A commissioner | Not run | BLOCKED | — | Not assessed |
| 9 | A: demote final commissioner | Rejected | Not run | BLOCKED | — | Not assessed |
| 10 | A: final commissioner leaves | Rejected | Not run | BLOCKED | — | Not assessed |
| 11 | B: ordinary member leaves | B removed | Not run | BLOCKED | — | Not assessed |
| 12 | A: remove B | B removed | Not run | BLOCKED | — | Not assessed |
| 13 | B: remove another member | Rejected | Not run | BLOCKED | — | Not assessed |
| 14 | C: join with old regenerated code | Rejected | Not run | BLOCKED | — | Not assessed |
| 15 | C: join with new code | C joins | Not run | BLOCKED | — | Not assessed |
| 16 | B: join again | Exactly one B membership | Not run | BLOCKED | — | Not assessed |
| 17 | A/B: SELECT League 2 memberships | Zero rows | Not run | BLOCKED | — | Not assessed |
| 18 | Anonymous: SELECT leagues and league_members | No data exposed | Both denied | PASS | 42501, both | Read-only attempts |

League 2 was also created by C as a setup fixture. Its invite was inspected using
C's ordinary commissioner session. No additional dependent tests were attempted
after the first failed assertion. Anonymous checks were independent.

| Additional check | Result |
|---|---|
| A: UUID knowledge grants no access/membership | PASS for C against League 1 |
| B: Ordinary member direct invite SELECT | BLOCKED: no B membership established |
| C: Direct table INSERT/UPDATE/DELETE unavailable | Not run |
| D: Commissioner RPC authorization | Not run |
| E: Final-commissioner invariant | Not run |
| F: Invite format | PASS for both new fixture codes; no claim about every database code |
| G: Regenerated code differs | Not run; previous user-reported regeneration success does not establish this assertion |

## Defect and proposed repair

Hosted `join_league` returned PostgreSQL 42702 for a valid current invite; membership stayed unchanged. Source review confirms that `RETURNS TABLE (league_id uuid, already_member boolean)` introduces a PL/pgSQL output variable named `league_id`. The conflict-inference expression `ON CONFLICT (league_id, user_id)` can resolve that name as either the variable or the table column, producing the default ambiguity error. This matches [PostgreSQL variable-substitution rules](https://www.postgresql.org/docs/current/plpgsql-implementation.html) and an [upstream reproducer of this exact conflict-clause behavior](https://www.postgresql.org/message-id/18587-c4ee4d43f6a4f8f3@postgresql.org). No fresh PostgreSQL execution was performed during the repair work.

The new pending migration `202610050002_fix_join_league_conflict.sql` replaces only `public.join_league(text)`, changing the clause to `ON CONFLICT DO NOTHING`. PostgreSQL [permits omitting the conflict target for DO NOTHING](https://www.postgresql.org/docs/current/sql-insert.html). The known schema has only the `(league_id, user_id)` primary key as a unique membership constraint, so duplicate handling is preserved without a guessed constraint name or dynamic SQL. Future additional unique/exclusion constraints require reviewing this choice. All remaining function logic and privileges are preserved. Both applied migrations remain unchanged. The new migration is NOT applied; after review/application, restart the complete hosted matrix. Test 2 remains FAIL and dependent tests remain unverified.

Name-resolution review covered create_league, regenerate_league_invite_code, change_league_member_role, leave_league, remove_league_member, enforce_commissioner_invariant, and set_league_updated_at. No other definite collisions were found: their parameters/local variables do not share unqualified column names, or references are explicitly qualified. In join_league, the INSERT target column list is syntactically column-only, SELECT references use aliases, and the final RETURN QUERY has no table source; no additional ambiguous reference was found. This is source review, not runtime proof.

No security bypass was observed in the checks that ran. The unexecuted checks
prevent any broader security conclusion. This join defect blocks Milestone 3
verification and Milestone 4.

## Cleanup

The temporary local Node runner `.tmp-rls-check.mjs` was removed after testing.
No testing route was created. Test fixtures remain in development; no privileged
cleanup or deletion was attempted. The user-populated `.env.rls.local` remains
ignored and was not copied into reports. No commits or Milestone 4 work occurred.

Post-removal checks: lint PASS, typecheck PASS, tests PASS (42 tests / 5 files),
production build PASS, and `git diff --check` PASS. Filesystem inspection confirmed
the runner was absent; the production route list contains no temporary test route.
