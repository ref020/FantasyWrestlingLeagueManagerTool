import { createFantasyTeamAction, renameFantasyTeamAction } from "@/app/leagues/actions";
import { canManageFantasyTeam } from "@/lib/leagues/season";
import type { FantasyTeam } from "@/types/team";
import type { LeagueRecord } from "@/types/league";

export function FantasyTeamPanel({ league, team, loadFailed }: {
  league: LeagueRecord;
  team: FantasyTeam | null;
  loadFailed: boolean;
}) {
  const canManage = canManageFantasyTeam(league.is_active, league.season_start_year);
  return (
    <section className="mt-8 max-w-xl border-t border-[var(--line)] pt-6" aria-labelledby="my-fantasy-team">
      <h2 id="my-fantasy-team" className="text-lg font-bold">My fantasy team</h2>
      {loadFailed ? (
        <p role="alert" className="mt-3 text-sm text-red-700">Your team could not be loaded. Please try again.</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-[var(--muted)]">{team ? team.name : "You have not created a team in this league."}</p>
          {!canManage ? (
            <p className="mt-3 text-sm text-[var(--muted)]">{!league.is_active
              ? "This league is inactive. Team creation and renaming are closed."
              : "A commissioner must set the league's season before teams can be created."}</p>
          ) : (
            <form action={team ? renameFantasyTeamAction : createFantasyTeamAction} className="mt-4 space-y-4">
              <input type="hidden" name="leagueId" value={league.id} />
              <label htmlFor="teamName" className="block text-sm font-semibold">
                {team ? "Rename your team" : "Team name"}
                <input id="teamName" name="name" defaultValue={team?.name ?? ""} required minLength={3} maxLength={50}
                  aria-describedby="team-name-help"
                  className="mt-2 block w-full border border-[var(--line)] bg-white px-3 py-3 text-sm focus:border-[var(--green)]" />
              </label>
              <p id="team-name-help" className="text-xs leading-5 text-[var(--muted)]">
                3–50 characters: English letters, numbers, spaces, and common punctuation. One team per person in this league.
              </p>
              <button type="submit" className="bg-[var(--green)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--green-dark)]">
                {team ? "Save team name" : "Create my team"}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
