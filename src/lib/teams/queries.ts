import { createClient } from "@/lib/supabase/server";
import type { FantasyTeam } from "@/types/team";

export async function getMyFantasyTeam(leagueId: string, userId: string): Promise<{
  team: FantasyTeam | null;
  loadFailed: boolean;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("fantasy_teams")
      .select("id, league_id, owner_user_id, name, created_at, updated_at")
      .eq("league_id", leagueId).eq("owner_user_id", userId).maybeSingle();
    return { team: data as FantasyTeam | null, loadFailed: Boolean(error) };
  } catch {
    return { team: null, loadFailed: true };
  }
}
