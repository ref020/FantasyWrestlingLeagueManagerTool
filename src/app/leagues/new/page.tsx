import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { LeagueFeedback } from "@/components/leagues/league-feedback";
import { createLeagueAction } from "@/app/leagues/actions";
import { SeasonField } from "@/components/leagues/season-field";

export default async function NewLeaguePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeading eyebrow="My Leagues" title="Create a league" />
      <section className="mt-8 max-w-xl border-t border-[var(--line)] pt-6">
        <p className="text-sm leading-6 text-[var(--muted)]">You will become the first commissioner. Invite codes are generated securely when the league is created.</p>
        <LeagueFeedback error={error} />
        <form action={createLeagueAction} className="mt-6 space-y-4">
          <label htmlFor="name" className="block text-sm font-semibold">
            League name
            <input id="name" name="name" required minLength={3} maxLength={50} className="mt-2 block w-full border border-[var(--line)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--lime)]" />
          </label>
          <p className="text-xs leading-5 text-[var(--muted)]">3-50 characters. Letters, numbers, spaces, apostrophes, hyphens, and common punctuation are allowed.</p>
          <SeasonField />
          <button type="submit" className="bg-[var(--green)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--green-dark)]">Create league</button>
        </form>
        <Link href="/dashboard" className="mt-6 inline-block text-sm font-semibold text-[var(--green)] underline">Back to My Leagues</Link>
      </section>
    </main>
  );
}
