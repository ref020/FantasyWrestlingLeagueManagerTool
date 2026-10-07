# Milestone 4A development verification — required matrix passed

The user applied `202610070001_league_seasons_and_fantasy_teams.sql` to DEVELOPMENT. On 2026-10-07, all 31 requested final checks and A–G passed. See [the hosted results](MILESTONE_4A_HOSTED_RESULTS.md) and [structured evidence](MILESTONE_4A_HOSTED_RESULTS.json) for individual results, structural metadata provenance, fixtures and scope. Local source tests alone do not establish hosted behavior. Do not rerun the migration.

The checklist below remains a broader reference: parent-lock races, full Milestone 3 regression, and browser/network UI flows were not exhaustively rerun. Application formatting/grouping used actual local helpers on hosted data. These limitations are not represented as passed browser or stress tests.
Use ordinary A/B/C sessions and only the public key for behavioral checks; never
use privileged SQL/service-role access to simulate a user.

Before application, record existing league/member/invite counts and identifiers
privately through appropriate review tooling. After application, confirm those
records and codes are unchanged, season values remain NULL, and activity is true.
Inspect migration metadata separately from authorization tests. Keep private authentication material out of reports. Preserve test fixtures unless safe cleanup is explicitly authorized. Record actor, expected/actual result, error code,
and protected-state comparisons for every check below.

| Check | Expected result |
|---|---|
| Apply to existing pre-4A development leagues | No deleted rows or invented seasons; no invite/member/role changes |
| Create new league with valid season | Same atomic commissioner/invite setup, explicit season and active=true; no automatic team |
| Missing, NULL, or out-of-range season; call old one-argument RPC | Rejected; no partial league/member/invite rows |
| A commissioner assigns a legacy league's season | Explicit year saved; no inferred value |
| B ordinary member or C nonmember attempts season/activity edit | Rejected; values unchanged |
| Attempt changing/clearing an assigned season | Different year rejected; NULL preserves existing year |
| A and B create their own teams | Each owns exactly one independently; commissioner ownership is optional |
| C nonmember or anonymous client attempts team create/rename | Rejected; no team changes |
| Valid names at boundaries and invalid controls/Unicode/length | Application, RPCs, and table constraint agree |
| Two concurrent create requests by B in the same league | Exactly one row and one success; duplicate rejected |
| B creates a team in another league of the same season | Allowed independently; no cross-league uniqueness restriction |
| B renames own team | Name changes; ownership, league, ID, and created_at stay fixed; updated_at advances |
| Attempt to supply another owner/team ID, or rename another league's team | No identity override; no other owner's row changed |
| Commissioner A attempts rename of B through RPC/direct table | No override; A can rename only A's own team; direct writes denied |
| Current member reads teams, C outsider reads by known UUID | Member sees allowed league teams; outsider sees no rows |
| Anonymous reads and authenticated direct INSERT/UPDATE/DELETE | Denied or zero rows; compare protected state afterward |
| B leaves or is removed while owning a team | Team retained and visible to remaining members; B loses read/rename access |
| B rejoins and creates again | Same retained team visible; second team rejected |
| Commissioner marks inactive | Team create/rename rejected; existing teams viewable; dashboard separates historical leagues |
| Reactivate league | Team create/rename allowed again when season known; nothing copied |
| Race create/rename against leave/removal/activity change | Parent lock serializes operations; final state consistent with execution order |
| Unknown legacy season | No team create/rename until assigned; clearly labeled in UI |
| Existing Milestone 3 role/join/invite/final-commissioner matrix | Behavior unchanged except create_league now requires the season argument |
| Inspect team FK metadata | Direct user and league ownership, RESTRICT deletion; no membership cascade |
| Inspect lineage FK/constraints | Nullable, SET NULL, no self-link; no client copy or lineage-write endpoint |
| UI create/rename/status flows and failed network/RPC responses | Useful messages, correct return paths, no raw internal errors; lists refresh |

Account deletion/ownership transfer and future irreversible completion rules need
product review before implementing those workflows. Do not delete test users merely
to test RESTRICT; metadata inspection suffices until a safe deletion test is approved.
