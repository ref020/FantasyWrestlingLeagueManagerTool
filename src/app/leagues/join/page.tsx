import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { LeagueFeedback } from "@/components/leagues/league-feedback";
import { joinLeagueAction } from "@/app/leagues/actions";

export default async function JoinLeaguePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const safeError = error === "invalid-code" || error === "invite" ? "invite" : error;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeading eyebrow="My Leagues" title="Join a league" />
      <section className="mt-8 max-w-xl border-t border-[var(--line)] pt-6">
        <p className="text-sm leading-6 text-[var(--muted)]">Enter the invite code shared by a league commissioner. You must be signed in to join.</p>
        <LeagueFeedback error={safeError} />
        <form action={joinLeagueAction} className="mt-6 space-y-4">
          <label htmlFor="inviteCode" className="block text-sm font-semibold">
            Invite code
            <input id="inviteCode" name="inviteCode" required autoCapitalize="characters" autoComplete="off" className="mt-2 block w-full border border-[var(--line)] bg-white px-3 py-3 font-mono text-sm uppercase outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--lime)]" />
          </label>
          <button type="submit" className="bg-[var(--green)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--green-dark)]">Join league</button>
        </form>
        <Link href="/dashboard" className="mt-6 inline-block text-sm font-semibold text-[var(--green)] underline">Back to My Leagues</Link>
      </section>
    </main>
  );
}