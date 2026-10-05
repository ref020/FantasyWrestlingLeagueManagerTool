# Architecture

Milestones 1-3 are complete; Milestones 2 and 3 are hosted-verified in DEVELOPMENT. Both additive repairs are applied. See [verification results](MILESTONE_3_HOSTED_RETEST.md). Milestone 4 has not started; production deployment has not occurred.

## Core boundary

Real-world wrestling data and fantasy league data are separate concepts and should remain separate in storage, APIs, and application logic.

- **Wrestling data** represents real participants, teams, weights, events, matches, and results. It may be supplied by manual commissioner entry, an external API, or a scraper/importer. Provider-specific acquisition and normalization belong at this boundary; the application must not depend on one provider's format.
- **Fantasy league data** represents leagues, seasons, teams, rosters, drafts, lineup choices, fantasy matchups, scoring outcomes, standings, and audit history. It consumes normalized wrestling data but owns fantasy rules and league state.

Imported result corrections must preserve an auditable history. Ingestion providers should not write fantasy scoring outcomes directly; downstream domain logic will interpret normalized results according to league rules.

## Intended application layers

1. **Presentation** (`src/app`, `src/components`): App Router pages, navigation, and reusable or feature-specific UI. Client components should be introduced only for interactions that need browser state.
2. **Application and domain logic** (`src/lib`): use cases and business rules, with fantasy scoring isolated from provider ingestion and persistence. No scoring logic is implemented in this milestone.
3. **Data access** (`src/lib/supabase`): browser and server Supabase client factories. Server-only operations must remain on the server; no service-role key is exposed to browser code.
4. **Persistence and integration** (`supabase/migrations` and future provider adapters): versioned database changes and independent wrestling-data ingestion adapters. Milestone 3 adds leagues and league memberships only; wrestling-data adapters remain future work.
5. **Shared contracts** (`src/types`): TypeScript types shared across application boundaries where appropriate. Database-generated types should be generated from the applied migration before adding further tables or database-facing features.

## Authentication and profiles

Email/password credentials and session issuance are owned by Supabase Auth. The Next.js server actions call Supabase Auth through the existing SSR server client. The App Router `proxy.ts` refreshes session cookies and checks verified claims for early redirects; authenticated route layouts independently call `auth.getUser()` on the server. Confirmation codes exchange for cookie sessions only in `/auth/callback`. OAuth providers are not enabled in this milestone.

`public.profiles` is a one-to-one application profile keyed by `auth.users.id` with `ON DELETE CASCADE`. It stores only a nullable, globally unique username and timestamps; email and passwords are not duplicated. A database trigger creates an empty profile for each new Auth user, including users who must confirm email before their first session. A username is 3-24 lowercase ASCII letters, digits, or underscores (`[a-z0-9_]{3,24}`); it is unique across the application. Users can finish or change this username from `/profile`.

## Route protection and RLS

`/` remains public. `/dashboard`, `/my-team`, `/matchups`, `/players`, `/league`, `/draft`, and `/profile` are protected by the request proxy and a server-authenticated route-group layout. `/login` and `/signup` redirect an authenticated visitor to `/dashboard`. Redirect destinations are limited to known internal protected paths to prevent open redirects. Hiding navigation is only presentation; server route checks and database RLS are the enforcement boundaries.

RLS is enabled on `public.profiles`. Anonymous access is revoked. Authenticated users can read profile usernames and timestamps needed for future league member identification; profile updates are granted only for the username column and the policy requires `auth.uid() = id` in both `USING` and `WITH CHECK`. There are no client insert/delete grants; profile creation is performed by the narrowly scoped `SECURITY DEFINER` trigger with an empty `search_path`, and its function execution is revoked from application roles. The application updates by the user ID returned from the verified session; it never accepts an ID from the form. RLS remains the final authorization boundary.

## Leagues, memberships, and authorization

`public.leagues` stores a UUID identifier, display name, creator Auth ID, and timestamps. The deployed historical migration has `created_by NOT NULL` with `ON DELETE RESTRICT`. The applied first repair changes it to nullable with `ON DELETE SET NULL`, preserving existing values. Historical creator identity is metadata; active commissioner membership remains the authorization mechanism. The final-commissioner invariant is unchanged and can still prevent deletion of a user who is the sole commissioner. `public.league_members` uses `(league_id, user_id)` as its primary key and stores each user's `commissioner` or `member` role. Membership is league-scoped; no single league is stored on the profile, so one user can hold independent roles in many leagues. There are no fantasy-team rows in this milestone.

Invite codes are held separately in `public.league_invite_codes`, not on `leagues`. Each code is generated inside the database from 80 random UUID bits and mapped to a 16-character alphabet that omits visually ambiguous symbols, yielding a 20-character code. The generator selects hexadecimal positions 1-12, 14-16, and 18-22, skipping the UUID version and variant positions (13 and 17). After the applied first repair, its lowercase source alphabet matches UUID text; a one-to-one mapping preserves 20 * 4 = 80 random bits. A unique constraint rejects duplicate codes. Joining requires an authenticated call to `join_league`; malformed, unknown, and regenerated/old codes return the same invalid-code outcome. Existing members receive an idempotent already-member result. Only commissioners can read the invite-code table or regenerate a code; ordinary league reads cannot accidentally disclose it.

All user-facing table writes are revoked. Authenticated `SECURITY DEFINER` RPCs provide atomic create, join, invite regeneration, role change, leave, and member removal. Each function is owned by `postgres`, sets an empty `search_path`, qualifies objects, is not executable by `anon`/`public`, and derives the acting user from `auth.uid()`. The private membership predicates also use a locked-down `private` schema to avoid recursive membership RLS; keep `private` out of Supabase's exposed API schemas. The `private` schema is not an application client API.

RLS allows authenticated users to select a league only when `private.is_league_member(id)` is true; membership rows are likewise visible only to members of that league. The separated invite-code table is readable only when `private.is_league_commissioner(league_id)` is true. Anonymous access is revoked and no anonymous policies or write grants exist. Direct inserts, updates, and deletes from user clients are unavailable; RPC authorization is the database boundary, not hidden UI controls.

The creator is inserted as the initial commissioner in the same transaction as the league and invite code. Role changes and leaves lock the parent league row before locking/changing membership rows, serializing concurrent commissioner mutations. A `BEFORE UPDATE OF role OR DELETE` trigger independently rejects changing/removing the final commissioner, including attempts outside the RPCs. The RPCs also produce a clear `final_commissioner_required` error. A commissioner cannot target themselves for role change or ordinary-member removal. Commissioners may only remove a target whose current role is `member`; demotion must happen first.

League routes use UUIDs rather than display names: `/leagues/new`, `/leagues/join`, `/leagues/[leagueId]`, `/leagues/[leagueId]/members`, and `/leagues/[leagueId]/settings`. Each route validates the UUID and loads data through RLS; a nonmember receives not-found rather than private league details. Ordinary members may access settings to leave a league. Invite-code retrieval and regeneration remain commissioner-only. The Dashboard is the My Leagues selector and lists each membership, role, and member count.

## Current scope

Milestone 1 is complete. Milestone 2 is complete and hosted-verified, including signup/login and profile RLS checks. Milestone 3 is complete and hosted-verified: all 18 tests and checks A-G passed on fresh development fixtures. Both repair migrations (`202610050001` and `202610050002`) are applied to DEVELOPMENT. Milestone 4 has not started. Production deployment has not occurred.

The original league migration preserves its historical invite case bug, restrictive creator FK, and ambiguous join conflict clause. The applied additive repairs fix those defects. Applied migrations are immutable; do not edit or rerun them.

Milestone 3 covers league creation/joining, membership, commissioner management, invite-code management, and league selection. Fantasy teams, wrestlers, drafts, rosters, schedules, matchups, scoring, free agency, postseason, and wrestling-data ingestion remain unimplemented. See [hosted results](MILESTONE_3_HOSTED_RETEST.md) and [development setup](SUPABASE_DEVELOPMENT.md).
