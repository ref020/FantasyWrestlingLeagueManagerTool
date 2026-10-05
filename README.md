# Fantasy Wrestling League Manager

A web application foundation for creating and managing fantasy wrestling leagues. Future milestones may add drafts, rosters, weekly duals, results ingestion, standings, playoffs, and a separate National Championships draft.

## Technology stack

- Next.js App Router and React
- TypeScript with strict checking
- Tailwind CSS
- Supabase PostgreSQL and email/password authentication
- Vercel deployment and GitHub version control

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
- `npm test` runs username, auth return-path, league validation/permissions, and invite-generator source-contract tests. These do not execute PostgreSQL.
- `npm run build` creates a production build.

## Project structure

- `src/app` contains App Router routes and global styles.
- `src/components` contains the application shell and reusable UI.
- `src/lib/supabase` contains browser and server Supabase client factories.
- `src/lib/auth-routes.ts` validates authentication return paths.
- `src/lib/leagues` contains league validation and RLS-filtered reads.
- `src/types` contains shared TypeScript contracts.
- `supabase/migrations` contains SQL schema migrations awaiting their initial Git commit.
- `docs` records confirmed product rules and architecture boundaries.

League implementation is present. Wrestler, draft, and scoring modules remain future work; gameplay routes currently display placeholders.

## Current milestone

- Milestone 1: application foundation complete.
- Milestone 2: authentication/profiles implemented and previously manually verified against hosted development. Signup/login worked; the profile migration was applied. User B could update their own username, could not update User A, could read User A's public username, and anonymous access could not read profiles.
- Milestone 3: leagues, memberships, commissioner operations, invite-code joining, and league selection implemented locally. Hosted migration application is unconfirmed; migration review and hosted RLS verification remain pending. Do not assume the hosted database contains league objects.
- Milestone 4: not started.

This recovery changes local files only. Review the corrected league migration before any hosted work. Migration files are present locally but are not yet committed. Fantasy teams, wrestler data, drafts, rosters, schedules, matchups, scoring, free agency, standings, postseason, and wrestling-data ingestion are not implemented. See [Product Rules](docs/PRODUCT_RULES.md), [Architecture](docs/ARCHITECTURE.md), [hosted development setup](docs/SUPABASE_DEVELOPMENT.md), and [league verification plan](docs/LEAGUE_RLS_VERIFICATION.md).
