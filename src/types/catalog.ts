import type { WrestlingWeight } from "@/lib/catalog/weights";

export type CatalogSchool = Readonly<{
  id: string;
  official_name: string;
  display_name: string | null;
}>;
export type CatalogWrestler = Readonly<{
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
}>;
export type RosterAffiliation = Readonly<{
  id: string;
  wrestler_id: string;
  school_id: string;
  season_start_year: number;
  primary_weight: WrestlingWeight | null;
  roster_status: "unverified" | "rostered" | "removed";
  is_approved: boolean;
  first_observed_at: string;
  last_verified_at: string | null;
  superseded_at: string | null;
}>;
export type CatalogApproval = Readonly<{
  identityApproved: boolean;
  programClassification: "unverified" | "ncaa_di_men" | "ineligible";
  officialProgramVerified: boolean;
  officialRosterVerified: boolean;
}>;
export type CatalogRosterEntry = Readonly<{
  affiliation: RosterAffiliation;
  wrestler: CatalogWrestler;
  school: CatalogSchool;
}>;
