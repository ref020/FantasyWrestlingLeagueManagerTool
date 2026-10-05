import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { changeMemberRoleAction, removeMemberAction } from "@/app/leagues/actions";
import { LeagueFeedback } from "@/components/leagues/league-feedback";
import { PageHeading } from "@/components/ui/page-heading";
import { formatJoinedDate, getLeagueDetails } from "@/lib/leagues/queries";
import { memberManagementControls } from "@/lib/leagues/permissions";
import { normalizeLeagueId } from "@/lib/leagues/validation";
import { createClient } from "@/lib/supabase/server";

export default async function LeagueMembersPage({ params, searchParams }: {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { leagueId: rawLeagueId } = await params;
  const leagueId = normalizeLeagueId(rawLeagueId);
  if (!leagueId) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/leagues/${leagueId}/members`);

  const details = await getLeagueDetails(leagueId, user.id);
  if (!details) notFound();
  const { error, notice } = await searchParams;
  const commissionerCount = details.members.filter((member) => member.role === "commissioner").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeading eyebrow={details.league.name} title="Members" />
      <LeagueFeedback error={error} notice={notice} />
      <ul className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {details.members.map((member) => {
          const isSelf = member.user_id === user.id;
          const controls = memberManagementControls(details.currentRole, user.id, member.user_id, member.role, commissionerCount);
          return (
            <li key={member.user_id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{member.username ? `@${member.username}` : "Profile incomplete"}{isSelf ? " (you)" : ""}</p>
                <p className="mt-1 text-sm capitalize text-[var(--muted)]">{member.role} · joined {formatJoinedDate(member.joined_at)}</p>
              </div>
              {(controls.canChangeRole || controls.canRemove) && (
                <div className="flex flex-wrap gap-3">
                  {controls.canChangeRole && <form action={changeMemberRoleAction}>
                    <input type="hidden" name="leagueId" value={leagueId} />
                    <input type="hidden" name="userId" value={member.user_id} />
                    <input type="hidden" name="role" value={member.role === "member" ? "commissioner" : "member"} />
                    <button type="submit" className="text-sm font-semibold text-[var(--green)] underline">
                      {member.role === "member" ? "Promote to commissioner" : "Demote to member"}
                    </button>
                  </form>}
                  {controls.canRemove && (
                    <form action={removeMemberAction}>
                      <input type="hidden" name="leagueId" value={leagueId} />
                      <input type="hidden" name="userId" value={member.user_id} />
                      <button type="submit" className="text-sm font-semibold text-red-700 underline">Remove member</button>
                    </form>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Link href={`/leagues/${leagueId}`} className="mt-8 inline-block text-sm font-semibold text-[var(--green)] underline">Back to league</Link>
    </main>
  );
}