import { describe, expect, it } from "vitest";
import type { CatalogApproval, CatalogWrestler, RosterAffiliation } from "@/types/catalog";
import { formatSeason, isSeasonPoolEligible, isWeightSlotEligible, parseSeasonYear } from "./eligibility";
import { formatWrestlingWeight, isWrestlingWeight, WRESTLING_WEIGHTS } from "./weights";

const approval: CatalogApproval = { identityApproved: true, programClassification: "ncaa_di_men", officialProgramVerified: true, officialRosterVerified: true };
const roster: RosterAffiliation = {
  id: "revision-1", wrestler_id: "person-1", school_id: "school-1", season_start_year: 2026,
  primary_weight: 125, roster_status: "rostered", is_approved: true,
  first_observed_at: "2026-10-01T00:00:00Z", last_verified_at: "2026-10-02T00:00:00Z", superseded_at: null,
};

describe("catalog eligibility (pure rules, not hosted RLS)", () => {
  it("uses exactly the ten system weights", () => {
    expect(WRESTLING_WEIGHTS).toEqual([125, 133, 141, 149, 157, 165, 174, 184, 197, 285]);
  });
  it.each(WRESTLING_WEIGHTS)("accepts verified weight %s only in its slot", weight => {
    expect(isWrestlingWeight(weight)).toBe(true);
    expect(isWeightSlotEligible({ ...roster, primary_weight: weight }, 2026, approval, weight)).toBe(true);
    expect(isWeightSlotEligible({ ...roster, primary_weight: weight }, 2026, approval, weight === 125 ? 133 : 125)).toBe(false);
  });
  it.each([null, undefined, "125", 126, 125.5, NaN])( "rejects non-weight %s", weight => {
    expect(isWrestlingWeight(weight)).toBe(false);
    expect(isWeightSlotEligible(roster, 2026, approval, weight)).toBe(false);
  });
  it("retains unknown weights in the season pool without assigning slots", () => {
    const unknown = { ...roster, primary_weight: null };
    expect(isSeasonPoolEligible(unknown, 2026, approval)).toBe(true);
    for (const weight of WRESTLING_WEIGHTS) expect(isWeightSlotEligible(unknown, 2026, approval, weight)).toBe(false);
    expect(formatWrestlingWeight(null)).toBe("Weight not established");
    expect(formatWrestlingWeight(285)).toBe("285 lb");
  });
  it("reuses league season validation and formatting", () => {
    expect(formatSeason(2026)).toBe("2026–27");
    expect(parseSeasonYear("2026")).toBe(2026);
    expect(parseSeasonYear("2026–27")).toBeNull();
    expect(isSeasonPoolEligible(roster, 2027, approval)).toBe(false);
    expect(isSeasonPoolEligible({ ...roster, season_start_year: 9999 }, 9999, approval)).toBe(false);
  });
  it("same-name people retain independent canonical IDs", () => {
    const people: CatalogWrestler[] = ["one", "two"].map(id => ({ id, first_name: "Alex", last_name: "Smith", display_name: null }));
    const rows = people.map(p => ({ ...roster, id: `aff-${p.id}`, wrestler_id: p.id }));
    expect(new Set(rows.filter(r => isSeasonPoolEligible(r, 2026, approval)).map(r => r.wrestler_id)).size).toBe(2);
  });
  it("keeps a person's identity across seasons and transfers", () => {
    const next = { ...roster, id: "revision-2", school_id: "school-2", season_start_year: 2027, primary_weight: 133 as const };
    expect(next.wrestler_id).toBe(roster.wrestler_id);
    expect(isSeasonPoolEligible(roster, 2026, approval)).toBe(true);
    expect(isWeightSlotEligible(next, 2027, approval, 133)).toBe(true);
  });
  it("same-season transfer supersedes old evidence rather than moving its row", () => {
    const old = { ...roster, superseded_at: "2026-10-03T00:00:00Z" };
    const next = { ...roster, id: "revision-2", school_id: "school-2" };
    expect(isSeasonPoolEligible(old, 2026, approval)).toBe(false);
    expect(isSeasonPoolEligible(next, 2026, approval)).toBe(true);
    expect(old.school_id).toBe("school-1");
  });
  it.each(["redshirt", "true freshman", "injured but rostered", "no matches", "no collegiate debut"])("does not exclude %s", description => {
    // Participation is deliberately not an eligibility input or persisted requirement.
    const fixture = { ...roster, participationDescription: description, matches: 0 };
    expect(isSeasonPoolEligible(fixture, 2026, approval)).toBe(true);
  });
  it.each([
    { ...approval, identityApproved: false },
    { ...approval, officialRosterVerified: false },
    { ...approval, officialProgramVerified: false },
    { ...approval, programClassification: "unverified" as const },
    { ...approval, programClassification: "ineligible" as const },
  ])("rejects missing approval %j", context => {
    expect(isSeasonPoolEligible(roster, 2026, context)).toBe(false);
  });
  it("rejects unreviewed, unverified, and confirmed removed affiliations", () => {
    for (const changes of [{ is_approved: false }, { last_verified_at: null }, { roster_status: "unverified" as const }, { roster_status: "removed" as const }]) {
      expect(isSeasonPoolEligible({ ...roster, ...changes }, 2026, approval)).toBe(false);
    }
  });
  it("temporary source failure does not revoke existing verified membership", () => {
    const withUnavailableSource = { ...roster, lastFetchSucceeded: false };
    expect(isSeasonPoolEligible(withUnavailableSource, 2026, approval)).toBe(true);
    expect(isSeasonPoolEligible({ ...withUnavailableSource, roster_status: "removed" }, 2026, approval)).toBe(false);
  });
});
