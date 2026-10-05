import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { createClient } from "@/lib/supabase/server";
import { getMyLeagues } from "@/lib/leagues/queries";
import { LeagueFeedback } from "@/components/leagues/league-feedback";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
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
  const leagues = leagueResult ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeading eyebrow={profileResult.data?.username ? `Welcome, ${profileResult.data.username}` : "Dashboard"} title="My Leagues" />
      <LeagueFeedback error={leagueResult ? params.error : "load"} notice={params.notice} />
      <section className="mt-8 flex flex-wrap gap-3 border-t border-[var(--line)] pt-6">
        <Link href="/leagues/new" className="bg-[var(--green)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--green-dark)]">Create League</Link>
        <Link href="/leagues/join" className="border border-[var(--line)] bg-white px-4 py-3 text-sm font-bold hover:border-[var(--green)]">Join League</Link>
      </section>
      {leagueResult && leagues.length === 0 ? (
        <section className="mt-8 border-t border-[var(--line)] py-8">
          <h2 className="text-lg font-bold">No leagues yet</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Create a league or enter an invite code to join one.</p>
        </section>
      ) : leagueResult ? (
        <section className="mt-8 border-t border-[var(--line)]">
          <h2 className="py-5 text-lg font-bold">My Leagues</h2>
          <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {leagues.map((league) => (
              <li key={league.id}>
                <Link href={`/leagues/${league.id}`} className="flex flex-col gap-2 py-5 hover:bg-white sm:flex-row sm:items-center sm:justify-between sm:px-3">
                  <span className="font-semibold">{league.name}</span>
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