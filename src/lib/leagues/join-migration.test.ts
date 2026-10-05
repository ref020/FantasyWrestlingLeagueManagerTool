import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const directory = resolve("supabase/migrations");
const read = (name: string) => readFileSync(resolve(directory, name), "utf8").replace(/\r\n/g, "\n");
const historical = read("202609290002_leagues.sql");
const repair = read("202610050002_fix_join_league_conflict.sql");
const definition = /create (?:or replace )?function public\.join_league\(p_invite_code text\)[\s\S]*?\$\$;/g;
const original = [...historical.matchAll(definition)][0][0];
const fixed = [...repair.matchAll(definition)][0][0];

// Source-contract regression tests only: no PostgreSQL execution or hosted RLS proof.
describe("join migration history and minimal repair", () => {
  it("keeps both applied migrations unchanged, ignoring platform line endings", () => {
    const hashes = {
      "202609290002_leagues.sql": "3dab69831e2d324f26855602572921618eb4eb3af9b153e69b0ac2b384279b4d",
      "202610050001_fix_league_migration.sql": "0c45d94f864eedfd1f2bedfc8020f513f717475961115d2734b250b549137c45",
    };
    for (const [name, hash] of Object.entries(hashes)) {
      expect(createHash("sha256").update(read(name)).digest("hex")).toBe(hash);
    }
  });

  it("changes only CREATE OR REPLACE and the ambiguous conflict target", () => {
    expect(fixed).toBe(original
      .replace("create function", "create or replace function")
      .replace("on conflict (league_id, user_id) do nothing;", "on conflict do nothing;"));
    expect(fixed).not.toContain("on conflict (league_id, user_id)");
    expect(fixed).not.toMatch(/\bexecute\b|#variable_conflict/i);
  });

  it("makes the repaired join the final definition in timestamp order", () => {
    const sequence = readdirSync(directory).filter(name => name.endsWith(".sql")).sort();
    const definitions = sequence.flatMap(name => [...read(name).matchAll(definition)].map(match => ({ name, sql: match[0] })));
    expect(definitions).toHaveLength(2);
    expect(definitions.at(-1)).toEqual({ name: "202610050002_fix_join_league_conflict.sql", sql: fixed });
  });

  it("retains auth identity, invite recheck, locking, member role, and row-count result", () => {
    expect(fixed).toContain("actor_id uuid := (select auth.uid())");
    expect(fixed).toContain("if actor_id is null then");
    expect(fixed).toContain("where l.id = target_league_id for update");
    expect(fixed).toContain("where lic.league_id = target_league_id and lic.code = normalized_code");
    expect(fixed).toContain("values (target_league_id, actor_id, 'member')");
    expect(fixed).toContain("get diagnostics inserted_count = row_count;");
    expect(fixed).toContain("return query select target_league_id, inserted_count = 0;");
    expect(fixed).toMatch(/security definer\s+set search_path = ''/);
    expect(repair).toContain("alter function public.join_league(text) owner to postgres;");
    expect(repair).toContain("revoke all on function public.join_league(text) from public, anon;");
    expect(repair).toContain("grant execute on function public.join_league(text) to authenticated;");
    expect(repair).not.toMatch(/disable row level security|create policy|alter policy/i);
  });

  it("documents and checks the sole unique membership key in the historical schema", () => {
    const table = historical.match(/create table public\.league_members \([\s\S]*?\n\);/)?.[0] ?? "";
    expect(table).toContain("primary key (league_id, user_id)");
    expect(table).not.toMatch(/\bunique\b|\bexclude\b/i);
    const sequence = readdirSync(directory).filter(name => name.endsWith(".sql")).map(read).join("\n");
    expect(sequence).not.toMatch(/create unique index[^;]*on public\.league_members/i);
    expect(sequence).not.toMatch(/alter table public\.league_members[^;]*(?:unique|exclude)/i);
  });
});
