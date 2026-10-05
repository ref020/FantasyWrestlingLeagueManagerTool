import { describe, expect, it } from "vitest";
import { normalizeUsername } from "./username";

describe("normalizeUsername", () => {
  it("trims and normalizes valid usernames", () => {
    expect(normalizeUsername("  MatWizard_7 ")).toBe("matwizard_7");
  });

  it("accepts the minimum and maximum lengths", () => {
    expect(normalizeUsername("abc")).toBe("abc");
    expect(normalizeUsername("a".repeat(24))).toBe("a".repeat(24));
  });

  it.each(["ab", "a".repeat(25), "has space", "name-hyphen", "équipe", ""]) (
    "rejects invalid username %j",
    (username) => {
      expect(normalizeUsername(username)).toBeNull();
    },
  );
});