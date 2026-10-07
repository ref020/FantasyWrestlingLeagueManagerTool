# Milestone 4A: league seasons and fantasy teams

Status: migration applied to DEVELOPMENT by the user; all 31 required hosted checks and A–G passed on 2026-10-07. See [hosted results](MILESTONE_4A_HOSTED_RESULTS.md) for evidence scope.
Milestones 1–3 remain complete and hosted-verified at the existing checkpoint.
No production deployment, Milestone 4B, drafting, rosters, wrestler/school tables,
results, scoring, schedules, free agency, playoffs, or copying workflow is included.

## One league is one season

`leagues.season_start_year` is an integer between 1900 and 9998. The end year is
derived as start + 1; 2026 displays as 2026–27. This avoids arbitrary labels and
supports numeric sorting without a separate seasons table. Once assigned through
the application, it cannot be changed or cleared: a future season needs a new league.

Existing leagues retain NULL (displayed as “Season not set”). No historical season
is inferred from creation timestamps or the current date. A current commissioner
may explicitly assign the legacy season once in settings. Team creation/rename is
blocked until that happens. Choosing the correct year and correcting any mistaken
assignment remain operator/product responsibilities; 4A has no season-rewrite tool.

The new `create_league(text, integer)` overload requires a valid season and delegates
the existing atomic league/member/invite creation to the unchanged old function.
The old `create_league(text)` function remains in place but loses execution permission
for application roles. The new SECURITY DEFINER wrapper calls it as postgres and
sets the season in the same transaction. New clients must send `p_season_start_year`;
old clients using only `p_name` are intentionally rejected rather than creating
additional unknown-season leagues. Coordinate application rollout with migration.

## Active and historical leagues

`leagues.is_active` is a non-null boolean, initially true. This preserves the prior
operational state of existing leagues; it does not claim that their real seasons
are current. Commissioners can explicitly mark them inactive and later reactivate.
The dashboard defaults to active leagues and has an Inactive Seasons link. Both
views show seasons and sort by starting year, with unknown seasons last.

Inactive leagues remain readable to current members. The team RPCs block creation
and rename while inactive. Existing membership, leave/removal, role, invite, and join
RPC behavior is unchanged, including on inactive leagues. This flag is not a final
competitive-data lock: no competitive data exists yet. Irreversible completion,
future gameplay locks, and tighter historical membership restrictions are deferred.

## Teams, ownership, and data retention

`fantasy_teams` stores UUID, league ID, owning Auth user ID, name, and timestamps.
`UNIQUE (league_id, owner_user_id)` enforces at most one team per person per league,
including concurrent requests. Team names may repeat across owners. A user can own
independent teams in multiple leagues in the same season. Commissioners may create
their own team, but commissioner status never creates one and grants no override.

Teams reference users directly, not membership rows. Leaving or removal retains
the team and its owner; the former member loses league/team visibility and rename
permission. Rejoining restores access to the same team, and does not allow a second
team. There is no automatic transfer, deletion, or replacement owner.

Both team league and owner foreign keys use ON DELETE RESTRICT to preserve the
required league/owner and historical data. Account deletion while owning any team,
or league deletion while retaining teams, is therefore blocked. This is a conservative
preservation measure pending explicit account-deletion, anonymization, retention,
and ownership-transfer decisions; no deletion workflow is added in 4A. Membership
leaving/removal still works normally and the last-commissioner invariant is unchanged.

Names trim ASCII spaces at the ends, preserve case, and allow 3–50 ASCII English
letters, digits, spaces, and `.,'&()!:_+-`. Tabs, newlines, other control characters,
emoji, and non-ASCII characters are rejected. Application validation and the SQL
constraint use the same alphabet; SQL uses C collation. Internationalized team
names would need an explicit future validation decision, not locale-dependent drift.

## Authorization and concurrency

- Team SELECT is granted to authenticated users and filtered by current league
  membership through the existing private membership predicate. Anonymous reads
  and all direct application table writes are revoked.
- `create_fantasy_team(uuid, text)` derives owner exclusively from `auth.uid()`,
  verifies current membership and active/known season, and inserts a member-owned
  team. Conflict on the named unique constraint returns `team_already_exists`.
- `rename_fantasy_team(uuid, text)` accepts a league and name only. It updates the
  row matching that league AND `auth.uid()`; it accepts no target owner or team ID.
  Missing membership or inactive status blocks even the owner. Commissioners have
  exactly the same ownership requirement.
- `update_league_season_settings(uuid, boolean, integer)` requires a current
  commissioner and permits only one-time season assignment plus activity changes.
- The new definer functions have empty search_path, schema-qualified objects,
  postgres ownership, and explicit execution revokes/grants. No service-role key.
- Mutations acquire the parent league lock first, then recheck membership/role
  and state, matching the existing membership RPC lock order. This serializes team
  writes with removal/leave/status changes. The unique constraint remains the
  final duplicate guard. The hosted duplicate-creation concurrency check passed; broader race testing remains outside that result.

## Future lineage, fixed weights, and global data

`copied_from_league_id` is nullable, self-referential, disallows self-links, and uses
ON DELETE SET NULL so lineage alone does not prevent deleting a source. It is not
accepted by any client RPC. No copy UI, automatic membership, or invitation is built.
Future copying creates a NEW UUID, copies appropriate settings, and invites prior
team owners. Drafts, rosters, scores, results, standings, matchups, transactions, and
playoff history stay with their original league and must not be copied.

The fixed system weights are 125, 133, 141, 149, 157, 165, 174, 184, 197, and 285.
They are not configurable by league or season. No weight rows or unused application
constants are introduced because 4A does not yet use weights. Wrestlers and schools
will be global shared system data in 4B, not owned by a league or team.

## Local versus hosted validation

Unit tests exercise season/name validation, formatting, activity filtering, and
mocked server actions (including forged identity inputs and friendly errors).
SQL source-contract tests verify schema/RPC contracts, ordering, and immutable
hashes of all four applied migrations. These tests do NOT execute PostgreSQL or
prove hosted authorization, SQL validity under the hosted configuration, or races.
See [the verification checklist](MILESTONE_4A_VERIFICATION.md) and [hosted results](MILESTONE_4A_HOSTED_RESULTS.md).

The UI requires the fifth migration, `202610070001_league_seasons_and_fantasy_teams.sql`, now applied to DEVELOPMENT by the user. All five applied migrations are immutable. Implementation originally used local checks only; the later authorized hosted verification used ordinary test sessions and is recorded separately. Do not rerun applied migrations. No production application, commit or push occurred during verification.
