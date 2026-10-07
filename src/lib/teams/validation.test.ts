import { describe, expect, it } from "vitest";
import { normalizeTeamName } from "./validation";

describe("team names", () => {
  it("trims spaces, retains case and supports ordinary punctuation", () => {
    expect(normalizeTeamName("  Ray's Mat-Men (2)!  ")).toBe("Ray's Mat-Men (2)!");
  });
  it("accepts length boundaries", () => {
    expect(normalizeTeamName("A&B")).toBe("A&B");
    expect(normalizeTeamName("A".repeat(50))).toHaveLength(50);
  });
  it.each(["", "  ", "ab", "a".repeat(51), "Team\n", "\tTeam", "Team\r", "Team\0", "Team\u007f", "Équipe", "Team 🏆", "<script>"])("rejects %j", value => {
    expect(normalizeTeamName(value)).toBeNull();
  });
});
