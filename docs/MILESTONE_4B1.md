# Milestone 4B-1: global NCAA Division I men's wrestling catalog

Status: user reports application to DEVELOPMENT and completion of the approved
36-record synthetic fixture preparation. COMPLETE and hosted-verified for all 40
requirements within the hosted report evidence scope; original SQLSTATE assertion failure preserved.
See [results](MILESTONE_4B1_HOSTED_RESULTS.md).
The applied migration must now remain immutable. Starting checkpoint:
`927247d19e4fd92c7745a3760064c58e8ccde4c5`. Milestones 1–4A remain complete;
their applied migrations and historical hosted evidence are unchanged.

The applied SQL is [202610130001_global_wrestling_catalog.sql](../supabase/migrations/202610130001_global_wrestling_catalog.sql).
Do not edit or reapply it to DEVELOPMENT. No production,
importer, live data, 4B-2, draft, fantasy roster, match result or scoring work is included.

## Relationships and identity

| Table | Purpose / identity |
|---|---|
| catalog_sources | Provider UUID and unique stable provider_key; no credentials |
| catalog_evidence | Append-only source reference/URL, observation, verification, review outcome, official-source flag and short evidence summary |
| wrestling_schools | Global UUID, official/display names, optional HTTPS athletics/roster URLs, approval and evidence pointer |
| wrestlers | Global person UUID, first/last/display names, approval and evidence pointer; no permanent school or weight |
| wrestling_school_seasons | Composite PK (school_id, season_start_year); verified classification of the men's wrestling program for that season |
| wrestling_roster_affiliations | UUID per affiliation revision/tenure; canonical wrestler, school-season, nullable primary weight, roster state, evidence, observation/verification and supersession dates |
| catalog_external_identities | Provider/entity-kind/opaque ID or URL mapping to exactly one school OR wrestler, with supporting evidence |

Season years use 1900–9998, exactly as leagues. There is no additional generic
season table: an integer is sufficient when no independent season lifecycle is
needed. The school-season table records program classification, not fantasy seasons.
No conference is stored as a permanent school property. School and person names
are deliberately not unique. Matching names never establish a canonical identity.

All foreign keys use ON DELETE RESTRICT. No catalog FK points to leagues, teams,
memberships or users. No refresh can cascade-delete fantasy data. Future draft
records must reference durable canonical IDs with an explicit retention policy.

## Division I verification

The scope is NCAA Division I **men's wrestling**, not all Division I universities.
The backend must verify that the school sponsors that sport in that division for
the specified season. Legitimate multidivision programs qualify based on their
wrestling classification, even when their institution's primary division differs.
DII/DIII wrestling, NAIA, NJCAA and NCWA-only programs are ineligible; unverified
programs remain unverified. No speculative school list is seeded.

NCAA publishes [membership and sport sponsorship information](https://www.ncaa.org/about-us/membership-directory/membership-composition-and-sport-sponsorship/)
and describes [multidivision classification](https://web3.ncaa.org/lsdbi/search/proposalView?id=106328).
These are reference points for future verification, not an implemented feed,
permission to scrape, or a hardcoded current membership list. Provider access and
current season-specific classification must be established before import.

## Exact eligibility

1. A canonical wrestler may exist without any season affiliation. Existence alone
   confers no fantasy eligibility. Only approved identity records are readable.
2. An affiliation records a source claim for a school/season. Pending claims are
   backend-only and do not become eligible merely by being inserted.
3. The season pool requires approved wrestler/school identities and evidence,
   verified official DI men's program evidence, approved official roster evidence,
   a reviewed rostered affiliation with non-null verification time, matching year,
   and no superseded_at. Removed/unverified rows are not in the pool.
4. A pool member may have NULL primary_weight. This means unknown, not heavyweight,
   zero, or a guessed nearest weight. The pool query retains NULLs.
5. Weight-slot eligibility additionally requires a known primary weight equal to
   the requested one of 125, 133, 141, 149, 157, 165, 174, 184, 197, 285.

Redshirts, true freshmen, injured-but-rostered athletes, and athletes without
matches or collegiate debuts qualify under the same official-roster rule. No match
count, injury field, redshirt exclusion, or competition requirement exists.
This is fantasy pool eligibility, not a claim of NCAA competition certification.
No draft functionality is implemented. Pure TypeScript approval arguments are
trusted domain inputs, never an authorization boundary or accepted user form fields.

## Transfers, revisions, removals and failures

Current means superseded_at IS NULL, not “latest row wins.” A partial unique index
permits one current revision per person/school/year. A second partial unique index
permits at most one current approved rostered school per person/year. Pending
conflicting school claims can be retained separately but cannot both be promoted.

For a transfer, correction, weight change, removal or return to the same school,
the future backend must atomically close the prior revision and insert reviewed
replacement evidence/affiliation. The old row is retained. A trigger permits only
the one-time transition of superseded_at from NULL to a timestamp, leaving all
other revision fields unchanged; deletion/reopening is rejected. Separate years
can carry separate schools/weights under the same person UUID.

Confirmed removal is a new reviewed `removed` revision supported by official
evidence; the prior `rostered` revision is superseded. Removed/superseded approved
rows remain available for historical reads while their parent records are approved,
but the season pool helper excludes them. If approval or DI classification is later
withdrawn, ordinary reads may hide history; database records still remain.

A failed HTTP request, missing page, timeout or incomplete response is NOT positive
removal evidence. This schema has no failure-to-removal trigger and no automatic
age expiry. A temporary failure leaves the last verified affiliation in force.
An approved correction/removal requires new evidence. Reverification appends a new
evidence record, since evidence rows cannot be edited or deleted. Scheduling,
failure thresholds, staleness warnings and conflict adjudication are deferred.

## Provenance and matching

Evidence captures provider, source_reference (ID or URL), observed_at,
last_verified_at, pending/approved/rejected review, is_official and summary.
It also requires evidence_kind: identity, program_classification or official_roster.
Approved evidence requires a verification timestamp at or after observation.
Officialness is an explicit trusted-backend review decision, not inferred from a
URL alone. Imported identity/roster claims default to unapproved/unverified.
Write-time invoker triggers reject approved identities, DI classifications or
approved roster revisions without verified evidence of the appropriate kind.
Classification and roster approval additionally require is_official=true. Approved
affiliation last_verified_at must exactly match its evidence verification timestamp.
The insert-only roster validator does not interfere with closing a historical row.

External mappings are unique on (source_id, entity_kind, external_key). A CHECK
requires exactly the correctly typed target; two workers cannot map the same
provider identity to different canonical people. Different providers may map to
the same canonical UUID. Provider namespaces distinguish school IDs from athlete
IDs. Keys are case-sensitive and opaque, limited to 1000 bytes to fit the unique
index safely. Canonicalizing URLs, provider ID reuse, conflict handling and merges
need provider-specific review; do not merge by name. No merge/import algorithm exists.
UNIQUE (id, source_id) on evidence supports a composite external-mapping FK
(evidence_id, source_id), so mismatched provider/evidence is rejected by PostgreSQL.

Source references and summaries must contain only provenance, never signed URLs,
private authentication material, or raw sensitive response bodies. Evidence and
external mappings remain backend-only even when their subject is public to members.

## Security and application foundation

All seven tables have RLS. PUBLIC, anon and authenticated lose all table privileges;
authenticated receives SELECT only on schools, wrestlers, school-seasons and
affiliations. Four SELECT policies gate approval and parent visibility. There are
no write policies, commissioner exceptions, public write RPCs, or user identity
parameters. Provenance/mapping tables have no normal-user grants or policies.

A private stable SECURITY DEFINER function returns only an evidence-approval
boolean for the read policies, requiring the expected evidence kind. It has empty search_path, qualified objects,
explicit postgres ownership and authenticated-only execute. The existing private
schema must remain unexposed by PostgREST. The approval/history/timestamp triggers are
SECURITY INVOKER and not client-executable. No ingestion role or new backend grants
are provisioned. Trusted DBA/BYPASSRLS capabilities remain outside user isolation;
future import credentials and least-privilege grants require separate review.

`getSeasonCatalog` uses the normal SSR caller client, verifies a user, selects
approved current rostered rows with inner parent joins, and paginates in UUID order
(100 rows). It returns a minimal DTO or a generic error, with no provenance fields.
It does not fetch external sources, mutate data, create an admin client, or mount a
route. Application weights and season rules are shared; names are never used as IDs.

## Review decisions / limits

- Approve one current approved school per person/season, with retained revisions,
  rather than allowing simultaneous competing school assignments.
- Approve no automatic expiration after failed verification; staleness policy is deferred.
- Review provider permissions, terms, rate limits, coverage (including redshirts),
  official source authenticity, classification exceptions and identity resolution.
- Backend transaction/retry design, import monitoring, canonical merge/revocation,
  external-key reuse, and access roles belong to a future milestone.
- Handwritten query types and PostgREST relationship inference were exercised in hosted checks.
  Embedded PostgreSQL tests now execute the migrations, constraints, triggers and
  local-role RLS. Source inspection alone does not establish these behaviors, and
  the embedded runtime does not reproduce the hosted Supabase/PostgREST environment.
- No browser UI was added. No real schools, wrestlers or provider credentials are seeded.

See [the hosted verification plan](MILESTONE_4B1_VERIFICATION.md) and completed results.
Further hosted work requires separate authorization; Milestone 4B-2 has not started.

See [the pre-migration correction review](MILESTONE_4B1_REVIEW.md) for the final
checks, exact eligibility conditions, execution-test scope and transaction protocol.
At the pre-migration review, the five prior applied migration files and historical
hosted reports remained unchanged, and catalog execution was local only. Subsequently,
the user applied the sixth migration and approved synthetic fixtures to DEVELOPMENT.
Ordinary-session and SQL Editor verification is complete; see the hosted results and evidence scope.
All six applied migrations remain unchanged during verification. No commit or push was made.
