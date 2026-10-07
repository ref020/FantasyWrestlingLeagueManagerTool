const errors: Record<string, string> = {
  invalid_season: "Enter a four-digit season starting year between 1900 and 9998 and a valid league status.",
  season_already_assigned: "This league already has a season. Create a new league for a different season.",
  league_inactive: "This league is inactive. Team changes are closed.",
  season_required: "A commissioner must set the league's season first.",
  invalid_team_name: "Team names must be 3–50 characters using English letters, numbers, spaces, and common punctuation.",
  team_already_exists: "You already have a team in this league. You can rename it below.",
  team_not_found: "You do not have a team in this league yet.",
  "invalid-name": "League names must be 3-50 characters and contain no control characters.",
  invalid: "The submitted information is invalid.",
  invite: "That invite code is invalid or no longer active.",
  "already-member": "You already belong to that league.",
  unauthorized: "You are not authorized to perform that league action.",
  "final-commissioner": "This action would leave the league without a commissioner. Promote another member first.",
  database: "The request could not be completed. Try again, or contact a league commissioner.",
  load: "Your leagues could not be loaded. Check your connection and try again.",
};

const notices: Record<string, string> = {
  "team-saved": "Your team name was saved.",
  "season-updated": "League season settings saved.",
  "already-member": "You were already a member; the league is open below.",
  "invite-regenerated": "The invite code was regenerated. The previous code is no longer valid.",
  "role-updated": "Member role updated.",
  "member-removed": "The member was removed.",
  "left-league": "You left the league.",
};

export function LeagueFeedback({ error, notice }: { error?: string; notice?: string }) {
  const errorText = error && Object.hasOwn(errors, error) ? errors[error] : undefined;
  const noticeText = notice && Object.hasOwn(notices, notice) ? notices[notice] : undefined;

  if (!errorText && !noticeText) return null;

  return (
    <p role={errorText ? "alert" : "status"} className={`mt-5 text-sm leading-6 ${errorText ? "text-red-700" : "text-[var(--green-dark)]"}`}>
      {errorText ?? noticeText}
    </p>
  );
}
