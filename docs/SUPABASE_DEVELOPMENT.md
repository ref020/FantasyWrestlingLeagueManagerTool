# Hosted Supabase Development Setup

This repository uses a hosted Supabase **development** project. Docker and local Supabase are not used. Milestone 1 is complete. Milestone 2 is implemented and was previously manually verified in this hosted development project; the profiles migration was applied and signup/login worked. Previous profile RLS checks passed:

- User B could update their own username.
- User B could not update User A.
- User B could read User A's public username.
- Anonymous access could not read profiles.

These are user-reported results from prior development, not new verification during recovery. Milestone 3 is implemented locally, but league migration application is unconfirmed and hosted RLS verification remains pending. Milestone 4 has not started. This recovery makes no hosted changes and does not run the 18-check league verification plan.

Review the corrected league migration first. The following procedures are for later authorized hosted work. Inspect the existing development schema before applying anything; do not assume league objects are present or absent.

## Review and apply the Milestone 3 migration

After reviewing [202609290002_leagues.sql](../supabase/migrations/202609290002_leagues.sql), apply it only to the hosted development project, and only after [the profile migration](../supabase/migrations/202609290001_profiles.sql) has already been applied there:

1. Open the Supabase Dashboard and select the project explicitly designated for development. Verify its project reference; do not select production.
2. In that development project's SQL Editor, create a new query.
3. Copy the complete contents of `supabase/migrations/202609290002_leagues.sql` into the editor. Review that it is the leagues migration and verify the selected project once more.
4. Run it once. Confirm it completes without errors. If anything fails or already exists, stop and inspect the development database rather than editing production or improvising SQL.
5. In **Settings > API > Exposed schemas**, verify `private` is not exposed. Keep application access through the `public` RPCs and RLS-protected tables only.
6. Verify the resulting tables, policies, and public functions in Table Editor/SQL Editor. The league verification plan documents the required User A/B/C test sequence; it remains pending.

Do not run this migration against a production project. The SQL Editor executes with privileged database access; it is only for applying this reviewed migration, not for proving user RLS behavior.

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

The migration creates `public.profiles` keyed by `auth.users.id` with cascading delete, a lowercase unique username constraint/index, RLS grants/policies, an Auth-user profile-creation trigger, and an `updated_at` trigger. The migration file is the local record of these changes and awaits its initial Git commit. If execution fails partway or reports that objects already exist, stop and inspect the development database before retrying; do not improvise changes in production.

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
