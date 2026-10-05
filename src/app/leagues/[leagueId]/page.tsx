import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LeagueFeedback } from "@/components/leagues/league-feedback";
import { PageHeading } from "@/components/ui/page-heading";
import { getLeagueDetails } from "@/lib/leagues/queries";
import { normalizeLeagueId } from "@/lib/leagues/validation";
import { createClient } from "@/lib/supabase/server";

export default async function LeaguePage({ params, searchParams }: {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { leagueId: rawLeagueId } = await params;
  const leagueId = normalizeLeagueId(rawLeagueId);
  if (!leagueId) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/leagues/${leagueId}`);

  const details = await getLeagueDetails(leagueId, user.id);
  if (!details) notFound();
  const { notice } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeading eyebrow="My Leagues" title={details.league.name} />
      <LeagueFeedback notice={notice} />
      <p className="mt-3 text-sm font-semibold capitalize text-[var(--green)]">Your role: {details.currentRole}</p>
      <section className="mt-8 grid gap-8 border-t border-[var(--line)] pt-6 md:grid-cols-[1fr_0.7fr]">
        <div>
          <h2 className="text-lg font-bold">League members</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{details.members.length} {details.members.length === 1 ? "member" : "members"}</p>
          <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {details.members.slice(0, 5).map((member) => (
              <li key={member.user_id} className="flex items-center justify-between py-3 text-sm">
                <span>{member.username ? `@${member.username}` : "Profile incomplete"}</span>
                <span className="capitalize text-[var(--muted)]">{member.role}</span>
              </li>
            ))}
          </ul>
          <Link href={`/leagues/${leagueId}/members`} className="mt-4 inline-block text-sm font-semibold text-[var(--green)] underline">View all members</Link>
        </div>
        <nav aria-label="League navigation" className="border-l-2 border-[var(--lime)] pl-5">
          <h2 className="text-lg font-bold">League</h2>
          <ul className="mt-3 space-y-3 text-sm">
            <li><Link href={`/leagues/${leagueId}/members`} className="font-semibold text-[var(--green)] underline">Members</Link></li>
            <li><Link href={`/leagues/${leagueId}/settings`} className="font-semibold text-[var(--green)] underline">Settings</Link></li>
          </ul>
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">Teams, drafts, rosters, matchups, and scoring are not part of this milestone.</p>
        </nav>
      </section>
      <Link href="/dashboard" className="mt-8 inline-block text-sm font-semibold text-[var(--green)] underline">Back to My Leagues</Link>
    </main>
  );
}