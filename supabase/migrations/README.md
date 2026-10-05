# Database migrations

SQL migration files are present locally and awaiting their initial Git commit.

- `202609290001_profiles.sql`: profiles, Auth-user trigger, and profile RLS. Previously applied to hosted development; signup/login and two-user/anonymous profile RLS checks passed. Do not reapply to that project.
- `202609290002_leagues.sql`: leagues, memberships, invite codes, authorization functions, and commissioner safeguards. Implemented locally; hosted application is unconfirmed and hosted RLS verification remains pending. The invite generator now translates lowercase UUID hexadecimal into the existing 16-character alphabet while preserving 80 random bits.

Milestone 1 is complete; Milestone 2 is implemented and previously hosted-verified; Milestone 3 awaits hosted migration review/verification; Milestone 4 has not started.

Review the corrected league migration before hosted work. During later authorized development setup, inspect the existing schema before applying it: this migration is not an idempotent repair script. Do not assume it was never applied and rerun it blindly. Follow [the development procedure](../../docs/SUPABASE_DEVELOPMENT.md). No hosted database changes or league RLS checks were performed during recovery. Do not apply these migrations to production as part of this milestone.
