# Hosted Supabase Development Setup

Milestone 1 is complete. Milestones 2, 3 and 4A are complete and hosted-verified in DEVELOPMENT. See the 4A hosted report for verification scope. Milestone 4B has not started. Production deployment has not occurred. This project uses hosted development Supabase, not Docker/local Supabase.

Milestone 2 signup/login and profile RLS passed: User B could update their own username, could not update User A, could read A's public username, and anonymous access could not read profiles.

Milestone 3 passed all 18 authorization tests and additional checks A-G using ordinary sessions and the public key on fresh fixtures. The earlier join failure (42702) is preserved in [the original report](MILESTONE_3_HOSTED_RESULTS.md); the subsequent [successful retest](MILESTONE_3_HOSTED_RETEST.md) records its resolution. No new application or security defect was found.

## Applied migration history

All four migrations are applied to DEVELOPMENT in this order:

1. `202609290001_profiles.sql`
2. `202609290002_leagues.sql`
3. `202610050001_fix_league_migration.sql`
4. `202610050002_fix_join_league_conflict.sql`

The original league migration retains its deployed defects. The first additive repair fixes the invite alphabet and changes creator metadata to nullable / ON DELETE SET NULL. The second fixes the join conflict clause while retaining authentication, locking, invite rechecking, idempotency, and restricted privileges.

Once applied to a hosted/shared database, a migration is immutable. Do not rerun these migrations against existing development. Future schema changes require additive migrations. For a fresh development project only, apply all four in timestamp order before exercising league operations.

The join repair uses ON CONFLICT DO NOTHING; the known membership schema has only the composite primary key as a unique constraint. Review this choice if future migrations add other unique/exclusion constraints. Source-contract unit tests do not execute PostgreSQL; hosted evidence is recorded separately.

The setup instructions below are reference procedures for a fresh development environment, not instructions to reconfigure the verified project. No hosted changes are part of this checkpoint.

## Apply the profile migration

The existing development project already has this migration; do not rerun it. For a fresh development project only, apply [202609290001_profiles.sql](../supabase/migrations/202609290001_profiles.sql) once:

1. Open the Supabase Dashboard and select the project explicitly designated for development. Before proceeding, verify the project name and project reference in the dashboard URL against your team's development-project records. Do not select production.
2. In that development project's **SQL Editor**, create a new query.
3. Open `supabase/migrations/202609290001_profiles.sql` in this repository, copy its complete contents into the SQL Editor, and review the selected project once more.
4. Run the query. Confirm it completes without errors. Do not run it against a production project.
5. In **Table Editor**, confirm `public.profiles` exists and RLS is enabled. In the SQL Editor, you can verify grants, policies, and triggers with:

   ```sql
   select tablename, policyname, cmd, roles, qual, with_check
   from pg_policies
   where schemaname = 'public' and tablename = 'profiles';

   select event_object_table, trigger_name
   from information_schema.triggers
   where trigger_schema = 'public'
     and event_object_table in ('users', 'profiles');
   ```

The migration creates `public.profiles` keyed by `auth.users.id` with cascading delete, a lowercase unique username constraint/index, RLS grants/policies, an Auth-user profile-creation trigger, and an `updated_at` trigger. The migration file is the immutable historical record of these changes. If execution fails partway or reports that objects already exist, stop and inspect the development database before retrying; do not improvise changes in production.

## Configure email confirmation redirects

In the same development project's **Authentication > URL Configuration**, set the local development Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the allowed redirect URLs. Add only the specific development preview origins you intend to use, each with `/auth/callback`. Keep production origins out of this development allowlist unless separately approved.

Email confirmation behavior is controlled by the project's Email provider settings:

- With confirmation enabled, signup reports that the user should check email. The confirmation redirects to `/auth/callback`, which exchanges the one-time code server-side and establishes the SSR cookie session.
- With confirmation disabled, signup receives a session immediately and continues to profile setup.

Use Supabase's confirmation URL flow and ensure its redirect allowlist includes the callback. No confirmation tokens or passwords are logged or stored by this application.

## Local environment

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the ignored `.env.local` using values from the **development** project. The publishable key is intended for client use; never add a service-role/secret key to this file under a `NEXT_PUBLIC_` name. Restart `npm run dev` after changing environment values.

## Smoke-check the development project

After applying the migration and configuring the redirect:

1. Visit `/` while signed out, then request `/dashboard`; the latter should redirect to `/login`.
2. Create a test account. If email confirmation is enabled, open the message and follow the link back to the app.
3. Sign in and set a username at `/profile`; verify the dashboard and header show it.
4. Sign out, then verify `/dashboard` redirects back to `/login`.
5. To verify RLS across users, create a second test account and attempt a direct update of the first user's profile using the second user's authenticated client. It must affect zero rows or be rejected. Never use a service-role key for this check.

These hosted checks require a working development project and accessible test email inbox and are not run automatically by the repository test suite.

For the Milestone 3 user-isolation matrix, follow [LEAGUE_RLS_VERIFICATION.md](LEAGUE_RLS_VERIFICATION.md). It uses normal authenticated users and the public publishable key, never the service-role key.

## Applied 4A DEVELOPMENT rollout

The fifth migration, `202610070001_league_seasons_and_fantasy_teams.sql`, was applied to DEVELOPMENT by the user. Do not rerun or edit it. Existing leagues receive NULL season and active=true without rewriting membership/invites; commissioners must supply authoritative legacy seasons. The new application expects these columns and RPCs. New league creation now requires p_season_start_year; the legacy one-argument RPC is no longer executable by clients. Coordinate schema and UI rollout. Follow [the 4A verification checklist](MILESTONE_4A_VERIFICATION.md); all 31 final checks and A–G passed; see [hosted results and scope](MILESTONE_4A_HOSTED_RESULTS.md).
