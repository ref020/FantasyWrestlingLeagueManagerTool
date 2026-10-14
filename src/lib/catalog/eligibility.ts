import { MAX_SEASON_YEAR, MIN_SEASON_YEAR } from "@/lib/leagues/season";
import type { CatalogApproval, RosterAffiliation } from "@/types/catalog";
import { isWrestlingWeight } from "./weights";

// Pure domain rule, NOT a database authorization boundary. Approval must come
// from trusted review/RLS, never a submitted form or inferred name match.
export function isSeasonPoolEligible(
  affiliation: RosterAffiliation, season: number, approval: CatalogApproval,
): boolean {
  return Number.isInteger(season) && season >= MIN_SEASON_YEAR && season <= MAX_SEASON_YEAR
    && affiliation.season_start_year === season
    && approval.identityApproved && approval.programClassification === "ncaa_di_men" && approval.officialProgramVerified
    && approval.officialRosterVerified && affiliation.is_approved
    && affiliation.last_verified_at !== null && affiliation.superseded_at === null
    && affiliation.roster_status === "rostered";
}

export function isWeightSlotEligible(
  affiliation: RosterAffiliation, season: number, approval: CatalogApproval, weight: unknown,
): boolean {
  return isWrestlingWeight(weight) && affiliation.primary_weight === weight
    && isSeasonPoolEligible(affiliation, season, approval);
}

// The catalog deliberately shares league year boundaries and labels.
export { formatSeason, parseSeasonYear } from "@/lib/leagues/season";
