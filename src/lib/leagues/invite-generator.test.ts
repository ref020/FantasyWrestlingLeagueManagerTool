import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const historical = readFileSync(resolve("supabase/migrations/202609290002_leagues.sql"), "utf8");
const repair = readFileSync(resolve("supabase/migrations/202610050001_fix_league_migration.sql"), "utf8");
// The last definition in ordered migration source is the intended final definition.
const definitions = [...`${historical}\n${repair}`.matchAll(/create (?:or replace )?function private\.generate_league_invite_code\(\)[\s\S]*?as \$\$([\s\S]*?)\$\$;/g)];
const generator = definitions.at(-1)?.[1] ?? "";
const alphabets = generator.match(/'([0-9a-fA-F]+)',\s*'([A-Z]+)'/);
const sourceAlphabet = alphabets?.[1] ?? "";
const outputAlphabet = alphabets?.[2] ?? "";
const positions = [...generator.matchAll(/pg_catalog\.substr\(value, (\d+), (\d+)\)/g)]
  .flatMap((match) => Array.from({ length: Number(match[2]) }, (_, index) => Number(match[1]) + index));

// Static regression checks against the actual SQL source, not PostgreSQL execution.
// Hosted function behavior, constraints, randomness, and RLS still need verification.
describe("league migration history SQL source contract", () => {
  it("preserves the deployed broken generator and creator constraint in history", () => {
    expect(definitions).toHaveLength(2);
    expect(definitions[0][1]).toContain("'0123456789ABCDEF'");
    expect(historical).toContain("created_by uuid not null references auth.users (id) on delete restrict");
    expect(repair).toContain("create or replace function private.generate_league_invite_code()");
    expect(repair).toContain(generator);
  });

  it("keeps the replacement generator private and privileged", () => {
    expect(repair).toMatch(/security definer\s+set search_path = ''/);
    expect(repair).toContain("alter function private.generate_league_invite_code() owner to postgres;");
    expect(repair).toContain("revoke all on function private.generate_league_invite_code() from public, anon, authenticated;");
  });

  it("replaces the discovered creator FK atomically without data rewrites", () => {
    expect(repair).toContain("begin;");
    expect(repair.trim()).toMatch(/commit;$/);
    expect(repair).toContain("lock table public.leagues in access exclusive mode;");
    expect(repair).toContain("select fk.conname into strict creator_fk_name");
    expect(repair).toContain("fk.conkey = array[source_column.attnum]");
    expect(repair).toContain("fk.confkey = array[target_column.attnum]");
    expect(repair).toContain("fk.confdeltype = 'r'");
    expect(repair).toContain("alter column created_by drop not null");
    expect(repair).toContain("references auth.users (id) on delete set null");
    expect(repair).not.toMatch(/\b(?:delete from|update public\.|insert into|truncate|disable row level security)\b/i);
    expect(repair).not.toContain("public.league_members");
  });
  it("maps every lowercase UUID hex digit bijectively into the allowed alphabet", () => {
    expect(generator).toContain("pg_catalog.gen_random_uuid()::text");
    expect(sourceAlphabet).toBe("0123456789abcdef");
    expect(outputAlphabet).toBe("ABCDEFGHJKLMNPQR");
    expect(outputAlphabet).toHaveLength(16);
    expect(new Set(outputAlphabet).size).toBe(16);
    expect(outputAlphabet).toMatch(/^[A-HJ-NP-R]+$/);
  });

  it("selects 20 distinct fully random nibbles, excluding version and variant", () => {
    expect(positions).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 18, 19, 20, 21, 22]);
    expect(positions).toHaveLength(20);
    expect(new Set(positions).size).toBe(20);
    expect(positions.every((position) => position >= 1 && position <= 32)).toBe(true);
    expect(positions).not.toContain(13);
    expect(positions).not.toContain(17);
  });

  it("retains the database format and uniqueness constraints", () => {
    expect(historical).toContain("code text not null unique");
    expect(repair).not.toContain("alter table public.league_invite_codes");
    expect(historical).toContain("check (code ~ '^[A-HJ-NP-R]{20}$')");
  });
});
