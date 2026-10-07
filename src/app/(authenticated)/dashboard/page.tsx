import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { createClient } from "@/lib/supabase/server";
import { getMyLeagues } from "@/lib/leagues/queries";
import { LeagueFeedback } from "@/components/leagues/league-feedback";
import { formatSeason, leaguesForView } from "@/lib/leagues/season";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; view?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const [profileResult, leagueResult, params] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    getMyLeagues(user.id),
    searchParams,
  ]);
  const inactive = params.view === "inactive";
  const leagues = leaguesForView(leagueResult ?? [], inactive);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeading eyebrow={profileResult.data?.username ? `Welcome, ${profileResult.data.username}` : "Dashboard"} title="My Leagues" />
      <LeagueFeedback error={leagueResult ? params.error : "load"} notice={params.notice} />
      <section className="mt-8 flex flex-wrap gap-3 border-t border-[var(--line)] pt-6">
        <Link href="/leagues/new" className="bg-[var(--green)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--green-dark)]">Create League</Link>
        <Link href="/leagues/join" className="border border-[var(--line)] bg-white px-4 py-3 text-sm font-bold hover:border-[var(--green)]">Join League</Link>
      </section>
      <nav aria-label="League seasons" className="mt-6 flex gap-5 text-sm font-semibold text-[var(--green)]">
        <Link href="/dashboard" aria-current={!inactive ? "page" : undefined} className="underline">Active leagues</Link>
        <Link href="/dashboard?view=inactive" aria-current={inactive ? "page" : undefined} className="underline">Inactive Seasons</Link>
      </nav>
      {leagueResult && leagues.length === 0 ? (
        <section className="mt-8 border-t border-[var(--line)] py-8">
          <h2 className="text-lg font-bold">{inactive ? "No inactive leagues" : "No active leagues"}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{inactive ? "Your historical leagues will appear here when marked inactive." : "Create a league, join one, or browse Inactive Seasons."}</p>
        </section>
      ) : leagueResult ? (
        <section className="mt-8 border-t border-[var(--line)]">
          <h2 className="py-5 text-lg font-bold">{inactive ? "Inactive Seasons" : "Active leagues"}</h2>
          <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {leagues.map((league) => (
              <li key={league.id}>
                <Link href={`/leagues/${league.id}`} className="flex flex-col gap-2 py-5 hover:bg-white sm:flex-row sm:items-center sm:justify-between sm:px-3">
                  <span className="font-semibold">{league.name}<span className="mt-1 block text-sm font-normal text-[var(--muted)]">{formatSeason(league.season_start_year)}</span></span>
                  <span className="text-sm text-[var(--muted)]">{league.role} · {league.memberCount === null ? "member count unavailable" : `${league.memberCount} ${league.memberCount === 1 ? "member" : "members"}`}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
