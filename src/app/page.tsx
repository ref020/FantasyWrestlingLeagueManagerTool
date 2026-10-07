import { PageHeading } from "@/components/ui/page-heading";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeading eyebrow="League office" title="Fantasy Wrestling League Manager" />
      <section className="mt-10 grid gap-8 border-t border-[var(--line)] pt-8 md:grid-cols-[1.4fr_0.6fr]">
        <div>
          <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
            A home for fantasy wrestling leagues. Create an account, join your league, and give your fantasy team a name for the season.
          </p>
        </div>
        <aside className="border-l-2 border-[var(--lime)] pl-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--green)]">One league, one season</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Manage your leagues and team names, and revisit inactive seasons. Drafts, rosters, and scoring are coming in future milestones.</p>
        </aside>
      </section>
    </main>
  );
}
