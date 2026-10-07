# Product Rules

## LEAGUES AND FANTASY TEAMS (MILESTONE 4A)
- One league is exactly one wrestling season; season identity lives on the league, not a child seasons table.
- Historical leagues remain distinct records and are viewable as inactive leagues by current members.
- A user may join multiple leagues in the same season and own one independent team in each.
- Each fantasy team has one league and one owning user; the database enforces at most one team per user per league.
- Current membership is required to create or rename one's own team. Membership and ownership are distinct.
- Commissioners may own teams, but neither receive one automatically nor have another owner's rename override.
- Leaving/removal retains the team and ownership. Rejoining restores access; no automatic deletion or transfer.
- Account deletion/anonymization and owner reassignment require a future product decision. Current team FKs preserve data with RESTRICT.
- Future copying creates a NEW league UUID, copies appropriate settings, and invites previous team owners. It does not copy drafts, rosters, results, scores, standings, matchups, transactions, or playoff results.
- Only nullable lineage is modeled in 4A; no copying or automatic invitations/memberships are implemented.
- Wrestlers and schools will be global shared data in 4B. No wrestler/school data, drafting, rosters, or scoring is implemented in 4A.
- See [the implementation decisions](MILESTONE_4A.md) for season backfill, inactivity, name validation, and retention boundaries.

The remaining gameplay rules describe future milestones, not implemented 4A behavior.

## FANTASY WEEK
- Week begins Monday.
- Week ends Sunday.
- Scores are finalized Sunday night.

## ROSTERS
- One starting wrestler per weight class.
- Four bench positions per fantasy team.
- The ten NCAA men's weights are fixed system-wide: 125, 133, 141, 149, 157, 165, 174, 184, 197, 285. They are not configurable per league or season.

## DUAL SCORING
- Pin/fall = 6
- Technical fall = 5
- Major decision = 4
- Decision = 3
- Loss = 0

## TOURNAMENT SCORING
- A tournament counts as one event.
- 1st = 6
- 2nd = 5
- 3rd = 4
- 4th = 3
- 5th = 2
- 6th through 8th = 1
- No placement = 0

## MULTIPLE EVENTS
- Each dual counts as one event.
- Each tournament counts as one event.
- If a wrestler competes in multiple events during a fantasy week, his weekly fantasy score is the arithmetic mean of his event scores.
- Example: a 6-point performance and a 0-point performance produces a weekly score of 3.

## BONUS POINTS
- Each starting wrestler has a theoretical maximum of 3 bonus points available per fantasy week.
- Weekly wrestler bonus = max(weekly fantasy score - 3, 0), capped at 3.
- Team bonus points gained are the sum of starter bonus points.
- Team bonus points available = number of active starting weight classes * 3.
- Bonus rate = bonus gained / bonus available.
- If a fantasy dual is tied in fantasy points, the higher bonus rate wins.

## FREE AGENTS
- A free agent must have been previously undrafted.
- A free agent may only be picked up for a weight when the team's regular starter is not competing during that fantasy week.
- The regular starter moves to one of the team's four bench positions.
- The temporary free agent becomes the starter for that week.
- The free agent automatically leaves the roster at the end of the week.
- The original starter returns after the week.

## LOCKING
- Roster moves involving a wrestler lock when that wrestler begins his first match of the fantasy week.

## ADMINISTRATION
- Commissioners may correct wrestling results when necessary.
- Corrections must eventually be auditable rather than silently replacing the original imported result.

## SEASON
- Regular season ends two weeks before conference championships.
- A fantasy postseason determines the dual champion.
- National Championships use a new draft.
- The dual champion receives configurable National Championship draft perks.