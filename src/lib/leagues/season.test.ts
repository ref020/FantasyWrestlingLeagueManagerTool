import { describe, expect, it } from "vitest";
import { canManageFantasyTeam, formatSeason, leagueActivityLabel, leaguesForView, parseLeagueActivity, parseSeasonYear } from "./season";

describe("one league, one season", () => {
  it.each(["2026", "1900", "9998"])("accepts structured year %s", value => {
    expect(parseSeasonYear(value)).toBe(Number(value));
  });
  it.each(["", "2026–27", "26", "2026.5", " 2026", "2026\n", "2e3", "1899", "9999", "02026"])("rejects %j", value => {
    expect(parseSeasonYear(value)).toBeNull();
  });
  it("formats cross-year labels and explicitly unknown legacy seasons", () => {
    expect(formatSeason(2026)).toBe("2026–27");
    expect(formatSeason(1999)).toBe("1999–00");
    expect(formatSeason(null)).toBe("Season not set");
  });
  it("represents activity without accepting arbitrary truthy form values", () => {
    expect(parseLeagueActivity("active")).toBe(true);
    expect(parseLeagueActivity("inactive")).toBe(false);
    expect(parseLeagueActivity("false")).toBeNull();
    expect(leagueActivityLabel(false)).toBe("Inactive");
    expect(leagueActivityLabel(true)).toBe("Active");
  });
  it("keeps inactive leagues accessible separately and sorts newest seasons first", () => {
    const leagues = [
      { name: "Old", season_start_year: 2024, is_active: false },
      { name: "Legacy", season_start_year: null, is_active: true },
      { name: "New", season_start_year: 2026, is_active: true },
    ];
    expect(leaguesForView(leagues, false).map(l => l.name)).toEqual(["New", "Legacy"]);
    expect(leaguesForView(leagues, true).map(l => l.name)).toEqual(["Old"]);
    expect(leagues[0].name).toBe("Old");
  });
  it("closes team forms for unknown or inactive seasons", () => {
    expect(canManageFantasyTeam(true, 2026)).toBe(true);
    expect(canManageFantasyTeam(true, null)).toBe(false);
    expect(canManageFantasyTeam(false, 2026)).toBe(false);
  });
});
