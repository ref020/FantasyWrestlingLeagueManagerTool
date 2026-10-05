import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("supabase/migrations/202609290002_leagues.sql"), "utf8");
const generator = migration.match(/create function private\.generate_league_invite_code\(\)[\s\S]*?as \$\$([\s\S]*?)\$\$;/)?.[1] ?? "";
const alphabets = generator.match(/'([0-9a-fA-F]+)',\s*'([A-Z]+)'/);
const sourceAlphabet = alphabets?.[1] ?? "";
const outputAlphabet = alphabets?.[2] ?? "";
const positions = [...generator.matchAll(/pg_catalog\.substr\(value, (\d+), (\d+)\)/g)]
  .flatMap((match) => Array.from({ length: Number(match[2]) }, (_, index) => Number(match[1]) + index));

// Static regression checks against the actual SQL source, not PostgreSQL execution.
// Hosted function behavior, constraints, randomness, and RLS still need verification.
describe("invite generator SQL source contract", () => {
  it("maps every lowercase UUID hex digit bijectively into the allowed alphabet", () => {
    expect(generator).toContain("pg_catalog.gen_random_uuid()::text");
    expect(sourceAlphabet).toBe("0123456789abcdef");
    expect(outputAlphabet).toHaveLength(16);
    expect(new Set(outputAlphabet).size).toBe(16);
    expect(outputAlphabet).toMatch(/^[A-HJ-NP-R]+$/);
  });

  it("selects 20 distinct fully random nibbles, excluding version and variant", () => {
    expect(positions).toHaveLength(20);
    expect(new Set(positions).size).toBe(20);
    expect(positions.every((position) => position >= 1 && position <= 32)).toBe(true);
    expect(positions).not.toContain(13);
    expect(positions).not.toContain(17);
  });

  it("retains the database format and uniqueness constraints", () => {
    expect(migration).toContain("code text not null unique");
    expect(migration).toContain("check (code ~ '^[A-HJ-NP-R]{20}$')");
  });
});
