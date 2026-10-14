import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WRESTLING_WEIGHTS } from "./weights";

const directory = "supabase/migrations/";
const file = "202610130001_global_wrestling_catalog.sql";
const sql = readFileSync(directory + file, "utf8");
const table = (name: string) => sql.split(`create table public.${name} (`)[1]?.split("\n);")[0] ?? "";

// SQL source contracts only: no PostgreSQL parsing, triggers, RLS, or races executed.
describe("4B-1 catalog migration contracts", () => {
  it("follows exactly the five unchanged applied migrations", () => {
    const history = {
      "202609290001_profiles.sql": "008a1eb2ffce6195a1e78b4988b03a1aedaff1f026a32516a75a95079f000fe6",
      "202609290002_leagues.sql": "3dab69831e2d324f26855602572921618eb4eb3af9b153e69b0ac2b384279b4d",
      "202610050001_fix_league_migration.sql": "0c45d94f864eedfd1f2bedfc8020f513f717475961115d2734b250b549137c45",
      "202610050002_fix_join_league_conflict.sql": "996e30698c8e80ee4931c8a56d81edf80de2721c04a81fb36d3082be1da2618d",
      "202610070001_league_seasons_and_fantasy_teams.sql": "eb2ac40554dd8b3e71833839dc816f61fe280a6239ee85ff296c685922bb4742",
    };
    expect(readdirSync(directory).filter(f => f.endsWith(".sql")).sort()).toEqual([...Object.keys(history), file]);
    for (const [name, hash] of Object.entries(history)) expect(createHash("sha256").update(readFileSync(directory + name, "utf8").replace(/\r\n/g, "\n")).digest("hex")).toBe(hash);
  });
  it("keeps independent people and school UUIDs, not unique names or permanent weight/school", () => {
    for (const name of ["wrestlers", "wrestling_schools"]) {
      expect(table(name)).toContain("id uuid primary key");
      expect(table(name)).not.toMatch(/unique|conference/);
    }
    expect(table("wrestlers")).not.toMatch(/school_id|primary_weight|season_start_year|matches/);
  });
  it("requires verified sport-specific school seasons, not institutional classification", () => {
    expect(table("wrestling_school_seasons")).toContain("primary key (school_id, season_start_year)");
    expect(table("wrestling_school_seasons")).toContain("season_start_year between 1900 and 9998");
    expect(sql).toContain("classification = 'ncaa_di_men'");
    expect(sql).toContain("references public.wrestling_school_seasons(school_id, season_start_year) on delete restrict");
  });
  it("preserves nullable weights and exact system alphabet", () => {
    const weights = table("wrestling_roster_affiliations").match(/primary_weight in \(([^)]+)\)/)?.[1].split(",").map(Number);
    expect(weights).toEqual([...WRESTLING_WEIGHTS]);
    expect(table("wrestling_roster_affiliations")).not.toContain("primary_weight integer not null");
  });
  it("retains revisions and prevents two current approved schools for one person/season", () => {
    expect(sql).toContain("where superseded_at is null and is_approved and roster_status = 'rostered'");
    expect(sql).toContain("on public.wrestling_roster_affiliations(wrestler_id, season_start_year)");
    expect(sql).toContain("old.superseded_at is null and new.superseded_at is not null");
    expect(sql).toContain("(pg_catalog.to_jsonb(new) - 'superseded_at') = (pg_catalog.to_jsonb(old) - 'superseded_at')");
    expect(sql).toContain("before update or delete on public.wrestling_roster_affiliations");
    expect(sql).not.toMatch(/on delete cascade/i);
  });
  it("separates failed fetches from confirmed removal and keeps evidence immutable", () => {
    expect(table("wrestling_roster_affiliations")).toContain("('unverified', 'rostered', 'removed')");
    expect(sql).toContain("before update or delete on public.catalog_evidence");
    expect(sql).toContain("review_status <> 'approved' or last_verified_at is not null");
    expect(sql).not.toMatch(/fetch_failed|match_count|recorded_match/);
  });
  it("one provider identity maps to exactly one typed target", () => {
    const identity = table("catalog_external_identities");
    expect(identity).toContain("unique (source_id, entity_kind, external_key)");
    expect(identity).toContain("school_id is not null and wrestler_id is null");
    expect(identity).toContain("wrestler_id is not null and school_id is null");
    expect(identity).toContain("pg_catalog.octet_length(external_key) <= 1000");
    expect(identity).toContain("foreign key (evidence_id, source_id) references public.catalog_evidence(id, source_id) on delete restrict");
    expect(table("catalog_evidence")).toContain("unique (id, source_id)");
  });
  it("denies writes and provenance reads to every ordinary user, irrespective of role", () => {
    const names = [...sql.matchAll(/create table public\.(\w+)/g)].map(m => m[1]);
    expect(names).toHaveLength(7);
    for (const name of names) expect(sql).toContain(`alter table public.${name} enable row level security;`);
    expect(sql).toContain("public.wrestling_roster_affiliations from public, anon, authenticated;");
    expect(sql).toContain("grant select on table public.wrestling_schools, public.wrestlers,");
    expect(sql.match(/create policy /g)).toHaveLength(4);
    expect(sql).not.toMatch(/for (insert|update|delete|all)|grant (insert|update|delete|all)|create function public\.|is_league_commissioner/i);
    expect(sql).toContain("language sql stable security definer set search_path = ''");
    expect(sql).toContain("alter function private.catalog_evidence_approved(uuid, boolean, text) owner to postgres");
    expect(sql).toContain("and e.last_verified_at is not null and (not p_official or e.is_official)");
    expect(sql).toContain("using (is_approved and private.catalog_evidence_approved(evidence_id, true, 'official_roster')");
    expect(sql).toContain("and exists (select 1 from public.wrestlers as w where w.id = wrestling_roster_affiliations.wrestler_id)");
    expect(sql).toContain("and s.season_start_year = wrestling_roster_affiliations.season_start_year)");
    for (const name of ["catalog_sources", "catalog_evidence", "catalog_external_identities"]) {
      expect(sql).not.toMatch(new RegExp(`create policy [^;]+ on public\\.${name} `));
    }
  });
  it("contains SQL dot identifiers, not regex-escaped SQL", () => {
    expect(sql).not.toMatch(/[a-z_]\\\.[a-z_]/i);
  });
  it("does not touch leagues, teams, auth, or add gameplay/data seeds", () => {
    expect(sql).not.toMatch(/(?:alter table|update|insert into|delete from|references) (?:public\.(?:leagues|league_members|fantasy_teams)|auth\.)/i);
    expect(sql).not.toMatch(/create table public\.(?:seasons|drafts|fantasy_rosters|match_results|scores)/i);
    expect(sql).not.toMatch(/insert into public\./i);
  });
});
