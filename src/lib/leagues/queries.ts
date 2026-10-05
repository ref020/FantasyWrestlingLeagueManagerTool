import { createClient } from "@/lib/supabase/server";
import type { LeagueMember, LeagueRecord, LeagueRole, LeagueSummary } from "@/types/league";

export async function getMyLeagues(userId: string): Promise<LeagueSummary[] | null> {
  const supabase = await createClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("league_members")
    .select("league_id, role")
    .eq("user_id", userId);

  if (membershipError) return null;
  if (!memberships?.length) return [];

  const leagueIds = memberships.map((membership) => membership.league_id as string);
  const { data: leagues, error: leagueError } = await supabase
    .from("leagues")
    .select("id, name")
    .in("id", leagueIds);

  if (leagueError) return null;
  if (!leagues?.length) return [];

  const { data: allMembers, error: countError } = await supabase
    .from("league_members")
    .select("league_id")
    .in("league_id", leagueIds);
  const counts = new Map<string, number>();
  if (!countError) {
    allMembers?.forEach((member) => {
      const leagueId = member.league_id as string;
      counts.set(leagueId, (counts.get(leagueId) ?? 0) + 1);
    });
  }

  const roles = new Map(memberships.map((membership) => [membership.league_id as string, membership.role as LeagueRole]));

  return leagues.map((league) => ({
    id: league.id as string,
    name: league.name as string,
    role: roles.get(league.id as string) ?? "member",
    memberCount: countError ? null : counts.get(league.id as string) ?? 0,
  }));
}

export async function getLeagueDetails(leagueId: string, userId: string) {
  const supabase = await createClient();
  const { data: leagueData, error: leagueError } = await supabase
    .from("leagues")
    .select("id, name, created_by, created_at, updated_at")
    .eq("id", leagueId)
    .maybeSingle();

  if (leagueError || !leagueData) return null;

  const league = leagueData as LeagueRecord;
  const { data: memberData, error: membersError } = await supabase
    .from("league_members")
    .select("league_id, user_id, role, joined_at")
    .eq("league_id", leagueId)
    .order("joined_at");

  if (membersError || !memberData) return null;

  const memberRows = memberData as Omit<LeagueMember, "username">[];
  const userIds = memberRows.map((member) => member.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);
  const usernames = new Map((profiles ?? []).map((profile) => [profile.id as string, profile.username as string | null]));
  const members: LeagueMember[] = memberRows.map((member) => ({
    ...member,
    role: member.role as LeagueRole,
    username: usernames.get(member.user_id) ?? null,
  }));
  const currentMember = members.find((member) => member.user_id === userId);

  if (!currentMember) return null;

  return { league, members, currentRole: currentMember.role, supabase };
}

export function formatJoinedDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}