# Fantasy Wrestling League Manager

A web application foundation for creating and managing fantasy wrestling leagues. Future milestones may add drafts, rosters, weekly duals, results ingestion, standings, playoffs, and a separate National Championships draft.

## Technology stack

- Next.js App Router and React
- TypeScript with strict checking
- Tailwind CSS
- Supabase PostgreSQL and email/password authentication
- GitHub version control; Vercel is the planned hosting target (no production deployment)

## Local setup

Requirements: Node.js 20.9 or newer and npm.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the hosted Supabase development project's URL and publishable key.
3. Start the development server with `npm run dev`.
4. Open [http://localhost:3000](http://localhost:3000).

Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_` variable or expose it to browser code. The profile migration was previously applied and authentication/profiles were manually verified in hosted **development**. Do not reapply it to that project; for a fresh development project, follow [the development migration procedure](docs/SUPABASE_DEVELOPMENT.md). Configure `http://localhost:3000/auth/callback` as an allowed Supabase Auth redirect URL for email confirmation.

## Development commands

- `npm run dev` starts the local development server.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs the TypeScript compiler without emitting files.
- `npm test` runs username, auth return-path, league validation/permissions, season/team validation, mocked server actions, and migration source-contract tests. These do not execute PostgreSQL.
- `npm run build` creates a production build.

## Project structure

- `src/app` contains App Router routes and global styles.
- `src/components` contains the application shell and reusable UI.
- `src/lib/supabase` contains browser and server Supabase client factories.
- `src/lib/auth-routes.ts` validates authentication return paths.
- `src/lib/leagues` contains league validation and RLS-filtered reads.
- `src/types` contains shared TypeScript contracts.
- `supabase/migrations` contains immutable historical migrations and additive schema repairs.
- `docs` records confirmed product rules and architecture boundaries.

League implementation is present. Wrestler, draft, and scoring modules remain future work; gameplay routes currently display placeholders.

## Current milestone

- Milestone 1: application foundation complete.
- Milestone 2: authentication/profiles complete and hosted-verified in development. Signup/login worked; the profile migration was applied. User B could update their own username, could not update User A, could read User A's public username, and anonymous access could not read profiles.
- Milestone 3: complete and hosted-verified. All 18 hosted development authorization checks and additional checks A–G passed on fresh fixtures using ordinary sessions and the public key. See [the retest report](docs/MILESTONE_3_HOSTED_RETEST.md). The earlier failed join run remains documented separately.
- Milestone 4A: complete and hosted-verified in DEVELOPMENT; all 31 required checks and A–G passed. See [hosted results and evidence scope](docs/MILESTONE_4A_HOSTED_RESULTS.md). See [4A decisions](docs/MILESTONE_4A.md) and [verification checklist](docs/MILESTONE_4A_VERIFICATION.md).
- Milestone 4B and all gameplay features: not started.

Both repair migrations, `202610050001_fix_league_migration.sql` and `202610050002_fix_join_league_conflict.sql`, are applied to DEVELOPMENT. Production deployment has not occurred. Applied migrations remain immutable. Hosted verification created disposable development fixtures through ordinary application boundaries; no migration or security changes were made during testing. Wrestler/school data, drafts, rosters, schedules, matchups, scoring, free agency, standings, postseason, wrestling-data ingestion, and league copying are not implemented. The UI requires the fifth migration, `202610070001_league_seasons_and_fantasy_teams.sql`, now applied to DEVELOPMENT. See [Product Rules](docs/PRODUCT_RULES.md), [Architecture](docs/ARCHITECTURE.md), [hosted development setup](docs/SUPABASE_DEVELOPMENT.md), and [league verification plan](docs/LEAGUE_RLS_VERIFICATION.md).
