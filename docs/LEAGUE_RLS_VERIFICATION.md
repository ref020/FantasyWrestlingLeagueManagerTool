# Milestone 3 Hosted Development Verification

Status: Milestone 3 COMPLETE and HOSTED-VERIFIED. PASS on the 2026-10-05 clean-state hosted development retest. All 18 required tests and additional checks A–G passed using ordinary sessions and the public key. See [the retest report](MILESTONE_3_HOSTED_RETEST.md) for per-operation evidence and scope. The earlier 42702 failure remains recorded in [the original results](MILESTONE_3_HOSTED_RESULTS.md). Do not rerun applied migrations. Both repair migrations are applied to DEVELOPMENT. Milestone 4 has not started; production deployment has not occurred.

This plan is for the hosted **development** project only, after the original `202609290002_leagues.sql` and subsequent `202610050001_fix_league_migration.sql` repair and `202610050002_fix_join_league_conflict.sql` join repair have been applied there in order. Never use SQL Editor/service-role access to simulate user behavior. Use User A, User B, and User C's normal email/password sessions through the application or short-lived local test UI that uses the public publishable key and each user's ordinary session. Do not print, persist, or share access/refresh tokens. Remove any temporary test UI after verification; do not add a production route or permanent bypass.

## Setup

1. Confirm the dashboard is on the development project and `private` is not an exposed API schema.
2. Ensure test users A, B, and C are confirmed and have profile usernames.
3. Sign in as A and create `League 1`. Save its UUID and invite code privately for the test. A must appear as its first commissioner.
4. Sign in as C and create `League 2`. Save its UUID. C must appear as its first commissioner.
5. Sign in as B and use `/leagues/join` to join League 1 with its invite code.

For direct authorization attempts that have no UI control, use a temporary local-only check page with `createClient()` from `src/lib/supabase/client.ts`, after signing in normally as the named user. Call the public RPCs with the arguments below and issue selects through that same client. Do not send IDs for the acting user; the database derives that identity from `auth.uid()`. A test call may supply a *target* user ID where role/removal RPCs require one. Do not log the Supabase client, cookies, request headers, or tokens. Delete the temporary page after the checks.

## Required checks

| # | Check and procedure | Expected result |
|---|---|---|
| 1 | As A, create League 1 through `/leagues/new`. | League and A's commissioner membership exist atomically; A sees the league and invite code. |
| 2 | As B, join League 1 through `/leagues/join` with A's code. | B becomes a member. |
| 3 | As C, select `leagues` by League 1 UUID using C's normal client. | No row is returned by RLS. The `/leagues/[leagueId]` page is not found. |
| 4 | As B, select `league_invite_codes` for League 1. | No row is returned; B cannot read the commissioner-only code. |
| 5 | As B, call `change_league_member_role({ p_league_id: league1, p_user_id: B, p_role: 'commissioner' })`. | Rejected as unauthorized. |
| 6 | As B, call `change_league_member_role` targeting A with either role. | Rejected as unauthorized. |
| 7 | As A, promote B using `change_league_member_role({ p_league_id: league1, p_user_id: B, p_role: 'commissioner' })`. | Succeeds; B becomes commissioner. |
| 8 | As A, demote B with the same RPC and `p_role: 'member'`. | Succeeds while A remains commissioner. |
| 9 | As sole commissioner A, attempt to change A's own role to `member`; also attempt direct `league_members` update through A's public client. | The RPC rejects self-targeting; direct table update is denied because no user update grant/policy exists. No commissioner role is changed. |
| 10 | As sole commissioner A, call `leave_league({ p_league_id: league1 })`. | Rejected with final-commissioner restriction; A remains a member/commissioner. |
| 11 | With A and B in League 1, as ordinary member B call `leave_league`. | Succeeds; B's membership is removed. Rejoin B for the remaining checks. |
| 12 | Rejoin B as an ordinary member, then as A call `remove_league_member({ p_league_id: league1, p_user_id: B })`. | B is removed from League 1. |
| 13 | As B, rejoin League 1, then call `remove_league_member` targeting A or another member. | Rejected as unauthorized. |
| 14 | As commissioner A, read the current invite code, regenerate with `regenerate_league_invite_code({ p_league_id: league1 })`, then have C attempt to join with the old code. | Regeneration succeeds; the old code yields the same invalid-code response as any unknown code. |
| 15 | As C, join League 1 with the newly regenerated code. | Succeeds; C becomes a League 1 member while remaining commissioner of League 2. |
| 16 | As B, join League 1 again with its current code. | Returns already-member; the `(league_id, user_id)` primary key keeps exactly one membership. |
| 17 | As A or B in League 1, select memberships using League 2 UUID. | No League 2 membership rows are returned. |
| 18 | With no session and the public publishable key only, select from `leagues` and `league_members`. | Requests are rejected/no rows are exposed; there is no anon grant or select policy. |

Checks 9 and 10 confirm the last commissioner cannot demote/leave via the supported user boundary. The SQL trigger is an additional invariant guard for any role update/delete path; ordinary authenticated clients cannot directly invoke such table writes because the migration revokes those grants. Do not test trigger behavior by editing rows in SQL Editor, since that bypasses the user security boundary.

## Cleanup

Remove the temporary local check page and any local test data not intended to remain. Keep the development migration and test users as project fixtures only if your team wants them. Do not apply or copy this migration to production as part of Milestone 3.