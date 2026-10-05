import { describe, expect, it } from "vitest";
import { normalizeInviteCode, normalizeLeagueId, normalizeLeagueName } from "./validation";

describe("normalizeLeagueName", () => {
  it("trims valid names and preserves display casing", () => {
    expect(normalizeLeagueName("  Big Ten Grapplers  ")).toBe("Big Ten Grapplers");
    expect(normalizeLeagueName("L'équipe d'Été 2")).toBe("L'équipe d'Été 2");
  });

  it.each(["ab", "a".repeat(51), "Bad\nName", "emoji 🏆", "", "   "]) (
    "rejects invalid league name %j",
    (name) => expect(normalizeLeagueName(name)).toBeNull(),
  );

  it("accepts the 3 and 50 character boundaries", () => {
    expect(normalizeLeagueName("A&B")).toBe("A&B");
    expect(normalizeLeagueName("A".repeat(50))).toBe("A".repeat(50));
  });
});

describe("normalizeInviteCode", () => {
  it("normalizes case, spaces, and visual separators", () => {
    expect(normalizeInviteCode("abcd-efgh-jkln-pqra-bcde")).toBe("ABCDEFGHJKLNPQRABCDE");
  });

  it.each(["", "ABCDEFGH2345JK78MNP", "ABCDEFGH2345IJK8MNPQ", "ABCDEFGH2345JK78MNP0"]) (
    "rejects malformed invite code %j",
    (code) => expect(normalizeInviteCode(code)).toBeNull(),
  );
});

describe("normalizeLeagueId", () => {
  it("accepts UUIDs case-insensitively and returns canonical lowercase", () => {
    expect(normalizeLeagueId("A12B3456-7890-4ABC-8DEF-1234567890AB")).toBe("a12b3456-7890-4abc-8def-1234567890ab");
  });

  it.each(["", "not-a-uuid", "../../league", "00000000-0000-0000-0000-000000000000"]) (
    "rejects invalid league id %j",
    (id) => expect(normalizeLeagueId(id)).toBeNull(),
  );
});