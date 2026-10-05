import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { leaveLeagueAction, regenerateInviteAction } from "@/app/leagues/actions";
import { LeagueFeedback } from "@/components/leagues/league-feedback";
import { PageHeading } from "@/components/ui/page-heading";
import { getLeagueDetails } from "@/lib/leagues/queries";
import { normalizeLeagueId } from "@/lib/leagues/validation";
import { createClient } from "@/lib/supabase/server";

export default async function LeagueSettingsPage({ params, searchParams }: {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { leagueId: rawLeagueId } = await params;
  const leagueId = normalizeLeagueId(rawLeagueId);
  if (!leagueId) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/leagues/${leagueId}/settings`);

  const details = await getLeagueDetails(leagueId, user.id);
  if (!details) notFound();

  const { data: inviteRecord } = details.currentRole === "commissioner"
    ? await supabase.from("league_invite_codes").select("code").eq("league_id", leagueId).maybeSingle()
    : { data: null };
  const { error, notice } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeading eyebrow={details.league.name} title="League settings" />
      <LeagueFeedback error={error} notice={notice} />
      <section className="mt-8 max-w-xl border-t border-[var(--line)] pt-6">
        {details.currentRole === "commissioner" && (
          <>
            <h2 className="text-lg font-bold">Invite code</h2>
            {inviteRecord?.code ? <p className="mt-3 select-all font-mono text-lg tracking-wider">{String(inviteRecord.code).match(/.{1,5}/g)?.join("-")}</p> : <p className="mt-3 text-sm text-[var(--muted)]">Invite code unavailable.</p>}
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Share this only with people you want to join. It is a join code, not an authentication credential.</p>
            <form action={regenerateInviteAction} className="mt-5">
              <input type="hidden" name="leagueId" value={leagueId} />
              <button type="submit" className="border border-[var(--line)] bg-white px-4 py-3 text-sm font-bold hover:border-[var(--green)]">Regenerate invite code</button>
            </form>
          </>
        )}
      </section>
      <section className="mt-10 max-w-xl border-t border-[var(--line)] pt-6">
        <h2 className="text-lg font-bold">Leave league</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">You can leave if another commissioner remains. The database will reject a final commissioner leaving.</p>
        <form action={leaveLeagueAction} className="mt-4">
          <input type="hidden" name="leagueId" value={leagueId} />
          <button type="submit" className="text-sm font-semibold text-red-700 underline">Leave this league</button>
        </form>
      </section>
      <Link href={`/leagues/${leagueId}`} className="mt-8 inline-block text-sm font-semibold text-[var(--green)] underline">Back to league</Link>
    </main>
  );
}