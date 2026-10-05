import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";

const sections = {
  "my-team": "My Team",
  matchups: "Matchups",
  players: "Players",
  league: "League",
  draft: "Draft",
} as const;

type SectionSlug = keyof typeof sections;

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;

  if (!Object.hasOwn(sections, section)) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeading eyebrow="League office" title={sections[section as SectionSlug]} />
      <p className="mt-8 max-w-2xl border-t border-[var(--line)] pt-6 text-base leading-7 text-[var(--muted)]">
        This area is reserved for a future milestone. No league data or actions are available yet.
      </p>
    </main>
  );
}