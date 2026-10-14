import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Actual embedded PostgreSQL execution. Auth schemas/roles below are local test
// stand-ins, not Supabase/PostgREST or hosted authorization verification.
let db: PGlite;
let source: string, otherSource: string, identity: string, program: string, rosterEvidence: string;
let person: string, school: string, otherSchool: string, affiliation: string;
const verifiedAt = "2026-10-02T00:00:00Z";
async function id(sql: string, args: unknown[] = []) {
  return (await db.query<{ id: string }>(sql + " returning id", args)).rows[0].id;
}
async function evidence(kind: string, status = "approved", official = true, provider = source) {
  return id("insert into public.catalog_evidence(source_id,evidence_kind,source_reference,observed_at,last_verified_at,review_status,is_official,summary) values ($1,$2,'synthetic-reference','2026-10-01',$3,$4,$5,'Synthetic test evidence')",
    [provider, kind, status === "approved" ? verifiedAt : null, status, official]);
}
async function roster(schoolId = school, approved = true, evidenceId = rosterEvidence, status = "rostered", owner = person) {
  return id("insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,primary_weight,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values ($1,$2,2026,null,$3,$4,$5,'2026-10-01',$6)",
    [owner, schoolId, status, evidenceId, approved, approved ? verifiedAt : null]);
}
async function rejected(sql: string, args: unknown[], code: string) {
  await db.exec("savepoint rejected_operation");
  try { await expect(db.query(sql, args)).rejects.toMatchObject({ code }); }
  finally { await db.exec("rollback to savepoint rejected_operation; release savepoint rejected_operation"); }
}
const pool = `select r.id, r.primary_weight from public.wrestling_roster_affiliations r
  join public.wrestlers w on w.id=r.wrestler_id
  join public.wrestling_school_seasons p on p.school_id=r.school_id and p.season_start_year=r.season_start_year
  join public.wrestling_schools s on s.id=p.school_id
  where r.season_start_year=2026 and r.is_approved and r.roster_status='rostered'
    and r.superseded_at is null and r.last_verified_at is not null and p.classification='ncaa_di_men'`;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;`);
  for (const file of readdirSync("supabase/migrations").filter(f => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
}, 30000);
beforeEach(async () => {
  await db.exec("begin");
  source = await id("insert into public.catalog_sources(provider_key,name) values ('fixture_one','Fixture One')");
  otherSource = await id("insert into public.catalog_sources(provider_key,name) values ('fixture_two','Fixture Two')");
  identity = await evidence("identity"); program = await evidence("program_classification"); rosterEvidence = await evidence("official_roster");
  person = await id("insert into public.wrestlers(first_name,last_name,evidence_id,is_approved) values ('Alex','Smith',$1,true)", [identity]);
  school = await id("insert into public.wrestling_schools(official_name,evidence_id,is_approved) values ('Synthetic School One',$1,true)", [identity]);
  otherSchool = await id("insert into public.wrestling_schools(official_name,evidence_id,is_approved) values ('Synthetic School Two',$1,true)", [identity]);
  for (const s of [school, otherSchool]) await db.query("insert into public.wrestling_school_seasons(school_id,season_start_year,classification,evidence_id) values ($1,2026,'ncaa_di_men',$2)", [s, program]);
  affiliation = await roster();
});
afterEach(async () => { await db.exec("rollback; reset role"); });
afterAll(async () => { await db?.close(); });

describe("local PostgreSQL migration and integrity execution", () => {
  it("executes all six migrations and resolves every function/trigger dependency", async () => {
    const result = await db.query<{ count: number }>("select count(*)::int as count from pg_policies where policyname like 'catalog_%'");
    expect(result.rows[0].count).toBe(4);
    expect((await db.query<{ fn: string | null }>("select to_regprocedure('public.create_fantasy_team(uuid,text)') as fn")).rows[0].fn).not.toBeNull();
  });
  it("rejects external evidence from a different provider through its composite FK", async () => {
    const sql = "insert into public.catalog_external_identities(source_id,entity_kind,external_key,wrestler_id,evidence_id) values ($1,'wrestler','athlete-1',$2,$3)";
    await rejected(sql, [otherSource, person, identity], "23503");
    await db.query(sql, [source, person, identity]);
    const secondPerson = await id("insert into public.wrestlers(first_name,last_name,evidence_id,is_approved) values ('Alex','Smith',$1,true)", [identity]);
    await rejected(sql, [source, secondPerson, identity], "23505");
  });
  it("keeps duplicate names separate and unknown weight in the current pool", async () => {
    const second = await id("insert into public.wrestlers(first_name,last_name,evidence_id,is_approved) values ('Alex','Smith',$1,true)", [identity]);
    await roster(school, true, rosterEvidence, "rostered", second);
    await db.exec("set local role authenticated");
    const rows = (await db.query<{ id: string; primary_weight: number | null }>(pool)).rows;
    expect(rows).toHaveLength(2); expect(rows.every(r => r.primary_weight === null)).toBe(true);
    expect((await db.query("select id from public.wrestlers")).rows).toHaveLength(2);
  });
  it("transfers within a season by closing then inserting while retaining old evidence", async () => {
    await db.query("select id from public.wrestlers where id=$1 for update", [person]);
    await db.query("update public.wrestling_roster_affiliations set superseded_at='2026-10-03' where id=$1 and superseded_at is null", [affiliation]);
    const replacement = await roster(otherSchool);
    await db.exec("set local role authenticated");
    expect((await db.query<{ id: string; primary_weight: number | null }>(pool)).rows.map(r => r.id)).toEqual([replacement]);
    // RLS visibility is explicitly broader than pool eligibility.
    expect((await db.query("select id from public.wrestling_roster_affiliations")).rows).toHaveLength(2);
    const old = (await db.query("select school_id,evidence_id from public.wrestling_roster_affiliations where id=$1", [affiliation])).rows[0];
    expect(old).toMatchObject({ school_id: school, evidence_id: rosterEvidence });
  });
  it("rolls back closure if replacement fails, rather than losing membership", async () => {
    await db.exec("savepoint replacement_transaction");
    await db.query("update public.wrestling_roster_affiliations set superseded_at='2026-10-03' where id=$1", [affiliation]);
    await expect(roster(otherSchool, true, identity)).rejects.toMatchObject({ code: "23514" });
    await db.exec("rollback to savepoint replacement_transaction; release savepoint replacement_transaction; set local role authenticated");
    expect((await db.query<{ id: string; primary_weight: number | null }>(pool)).rows.map(r => r.id)).toEqual([affiliation]);
  });
  it("retains a conflicting unreviewed claim without replacing the approved school", async () => {
    await roster(otherSchool, false, await evidence("official_roster", "pending"), "unverified");
    await rejected("insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values ($1,$2,2026,'rostered',$3,true,'2026-10-01',$4)", [person, otherSchool, rosterEvidence, verifiedAt], "23505");
    await db.exec("set local role authenticated");
    expect((await db.query<{ id: string; primary_weight: number | null }>(pool)).rows.map(r => r.id)).toEqual([affiliation]);
    expect((await db.query("select id from public.wrestling_roster_affiliations")).rows).toHaveLength(1);
  });
  it("prevents two approved schools even without an existing pending claim", async () => {
    await db.exec("savepoint competing_approval");
    await expect(roster(otherSchool)).rejects.toMatchObject({ code: "23505" });
    await db.exec("rollback to savepoint competing_approval; release savepoint competing_approval");
    expect((await db.query("select id from public.wrestling_roster_affiliations")).rows).toHaveLength(1);
  });
  it("permits confirmed removal as a new revision, visible but not eligible", async () => {
    await db.query("update public.wrestling_roster_affiliations set superseded_at='2026-10-03' where id=$1", [affiliation]);
    await roster(school, true, rosterEvidence, "removed");
    await db.exec("set local role authenticated");
    expect((await db.query<{ id: string; primary_weight: number | null }>(pool)).rows).toHaveLength(0);
    expect((await db.query("select id from public.wrestling_roster_affiliations")).rows).toHaveLength(2);
  });
  it("rejects reopening, destructive history edits, evidence edits and bad closure timestamps", async () => {
    await rejected("update public.wrestling_roster_affiliations set superseded_at='2026-09-01' where id=$1", [affiliation], "23514");
    await rejected("update public.wrestling_roster_affiliations set primary_weight=133, superseded_at='2026-10-03' where id=$1", [affiliation], "23514");
    await rejected("delete from public.wrestling_roster_affiliations where id=$1", [affiliation], "23514");
    await db.query("update public.wrestling_roster_affiliations set superseded_at='2026-10-03' where id=$1", [affiliation]);
    await rejected("update public.wrestling_roster_affiliations set superseded_at=null where id=$1", [affiliation], "23514");
    await rejected("update public.catalog_evidence set review_status='rejected' where id=$1", [identity], "23514");
    await rejected("delete from public.catalog_evidence where id=$1", [identity], "23514");
  });
  it("rejects pending, unofficial or wrong-kind evidence for DI program approval", async () => {
    for (const e of [identity, await evidence("program_classification", "pending"), await evidence("program_classification", "approved", false)]) {
      await rejected("update public.wrestling_school_seasons set evidence_id=$1 where school_id=$2", [e, school], "23514");
    }
  });
  it("rejects pending official claims and wrong-kind evidence for approved roster rows", async () => {
    for (const e of [program, await evidence("official_roster", "pending"), await evidence("official_roster", "approved", false)]) {
      await db.exec("savepoint invalid_approval");
      await expect(roster(otherSchool, true, e)).rejects.toMatchObject({ code: "23514" });
      await db.exec("rollback to savepoint invalid_approval; release savepoint invalid_approval");
    }
    await rejected("insert into public.wrestling_roster_affiliations(wrestler_id,school_id,season_start_year,roster_status,evidence_id,is_approved,first_observed_at,last_verified_at) values ($1,$2,2026,'rostered',$3,true,'2026-10-01','2026-10-04')", [person, otherSchool, rosterEvidence], "23514");
  });
  it("has no automatic failure/age removal and requires verified program parents", async () => {
    await db.exec("set local role authenticated");
    expect((await db.query<{ id: string; primary_weight: number | null }>(pool)).rows).toHaveLength(1);
    await db.exec("reset role");
    await db.query("update public.wrestling_school_seasons set classification='unverified' where school_id=$1", [school]);
    await db.exec("set local role authenticated");
    expect((await db.query<{ id: string; primary_weight: number | null }>(pool)).rows).toHaveLength(0);
  });
  it("enforces read-only privileges and hidden provenance without RLS recursion", async () => {
    const tables = ["catalog_sources", "catalog_evidence", "catalog_external_identities", "wrestling_schools", "wrestlers", "wrestling_school_seasons", "wrestling_roster_affiliations"];
    const flags = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname = any($1)", [tables]);
    expect(flags.rows).toHaveLength(7); expect(flags.rows.every(r => r.relrowsecurity)).toBe(true);
    await db.exec("set local role authenticated");
    for (const table of tables) {
      await rejected(`insert into public.${table} default values`, [], "42501");
      await rejected(`delete from public.${table}`, [], "42501");
      const column = table === "wrestling_school_seasons" ? "school_id" : "id";
      await rejected(`update public.${table} set ${column}=${column}`, [], "42501");
    }
    for (const table of tables.slice(0, 3)) await rejected(`select * from public.${table}`, [], "42501");
    expect((await db.query<{ id: string; primary_weight: number | null }>(pool)).rows).toHaveLength(1);
    await db.exec("reset role; set local role anon");
    for (const table of tables) await rejected(`select * from public.${table}`, [], "42501");
  });
});
