export type LeagueRole = "commissioner" | "member";

export type LeagueSummary = Readonly<{
  id: string;
  name: string;
  role: LeagueRole;
  memberCount: number | null;
  season_start_year: number | null;
  is_active: boolean;
}>;

export type LeagueMember = Readonly<{
  league_id: string;
  user_id: string;
  role: LeagueRole;
  joined_at: string;
  username: string | null;
}>;

export type LeagueRecord = Readonly<{
  id: string;
  name: string;
  created_by: string | null;
  season_start_year: number | null;
  is_active: boolean;
  copied_from_league_id: string | null;
  created_at: string;
  updated_at: string;
}>;
