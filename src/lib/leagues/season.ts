export const MIN_SEASON_YEAR = 1900;
export const MAX_SEASON_YEAR = 9998;

export function parseSeasonYear(value: string): number | null {
  if (value.length !== 4 || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= MIN_SEASON_YEAR && year <= MAX_SEASON_YEAR ? year : null;
}

export function formatSeason(year: number | null): string {
  if (year === null) return "Season not set";
  return `${year}–${String(year + 1).slice(-2)}`;
}

export function parseLeagueActivity(value: string): boolean | null {
  return value === "active" ? true : value === "inactive" ? false : null;
}

export function leagueActivityLabel(isActive: boolean): string {
  return isActive ? "Active" : "Inactive";
}

export function canManageFantasyTeam(isActive: boolean, season: number | null): boolean {
  return isActive && season !== null;
}

export function leaguesForView<T extends { is_active: boolean; season_start_year: number | null; name: string }>(
  leagues: readonly T[], inactive: boolean,
): T[] {
  return leagues.filter(league => league.is_active === !inactive).sort((a, b) =>
    (b.season_start_year ?? 0) - (a.season_start_year ?? 0) || a.name.localeCompare(b.name));
}
