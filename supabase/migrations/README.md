# Database migrations

Applied hosted/shared migrations are immutable. Future changes require additive migrations.

All four migrations are applied to DEVELOPMENT, in order:

1. `202609290001_profiles.sql`: historical profiles and profile RLS.
2. `202609290002_leagues.sql`: historical league schema, preserving the deployed uppercase invite-generator bug, NOT NULL / ON DELETE RESTRICT creator FK, and ambiguous join conflict clause.
3. `202610050001_fix_league_migration.sql`: additive repair for invite generation and nullable / ON DELETE SET NULL creator metadata.
4. `202610050002_fix_join_league_conflict.sql`: additive join repair using ON CONFLICT DO NOTHING. The membership primary key is the known schema's only unique constraint; review this behavior if later constraints change.

Do not edit or rerun applied migrations against existing development. A fresh database requires all migrations in timestamp order.

Milestone 1 is complete. Milestones 2 and 3 are complete and hosted-verified. All 18 league authorization tests and checks A-G passed; see [the retest](../../docs/MILESTONE_3_HOSTED_RETEST.md). The [earlier 42702 failure](../../docs/MILESTONE_3_HOSTED_RESULTS.md) remains preserved. Milestone 4 has not started and production deployment has not occurred.
