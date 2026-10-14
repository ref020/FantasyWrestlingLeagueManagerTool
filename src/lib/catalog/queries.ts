import { createClient } from "@/lib/supabase/server";
import type { CatalogRosterEntry, CatalogSchool, CatalogWrestler, RosterAffiliation } from "@/types/catalog";
import { parseSeasonYear } from "./eligibility";

type QueryRow = RosterAffiliation & {
  wrestlers: CatalogWrestler;
  wrestling_school_seasons: { wrestling_schools: CatalogSchool };
};
type Result = { entries: CatalogRosterEntry[]; error: "invalid-query" | "unavailable" | null };

// Server-side, caller-session read only. RLS approves identity, official source
// evidence, and sport classification. Never replace this client with an admin client.
// Includes NULL weights; a pool member need not have an established draft slot.
// RLS also permits historical/removed records: the filters below, not visibility
// alone, select the current season pool. RLS supplies verified evidence gates.
export async function getSeasonCatalog(season: number, offset = 0): Promise<Result> {
  if (parseSeasonYear(String(season)) !== season || !Number.isSafeInteger(offset) || offset < 0 || offset > Number.MAX_SAFE_INTEGER - 99) {
    return { entries: [], error: "invalid-query" };
  }
  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return { entries: [], error: "unavailable" };
    const { data, error } = await client.from("wrestling_roster_affiliations")
      .select("id,wrestler_id,school_id,season_start_year,primary_weight,roster_status,is_approved,first_observed_at,last_verified_at,superseded_at,wrestlers!inner(id,first_name,last_name,display_name),wrestling_school_seasons!inner(wrestling_schools!inner(id,official_name,display_name))")
      .eq("season_start_year", season).eq("is_approved", true).eq("roster_status", "rostered")
      .eq("wrestling_school_seasons.classification", "ncaa_di_men").not("last_verified_at", "is", null)
      .is("superseded_at", null).order("id").range(offset, offset + 99);
    if (error || !data) return { entries: [], error: "unavailable" };
    const entries = (data as unknown as QueryRow[]).map(({ wrestlers, wrestling_school_seasons, ...affiliation }) => ({
      affiliation, wrestler: wrestlers, school: wrestling_school_seasons.wrestling_schools,
    }));
    return { entries, error: null };
  } catch {
    return { entries: [], error: "unavailable" };
  }
}
