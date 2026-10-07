import { MAX_SEASON_YEAR, MIN_SEASON_YEAR } from "@/lib/leagues/season";

export function SeasonField({ required = true }: { required?: boolean }) {
  return (
    <label htmlFor="seasonStartYear" className="block text-sm font-semibold">
      Season starting year
      <input id="seasonStartYear" name="seasonStartYear" type="number" step={1}
        min={MIN_SEASON_YEAR} max={MAX_SEASON_YEAR} required={required} placeholder="2026"
        aria-describedby="season-help"
        className="mt-2 block w-full border border-[var(--line)] bg-white px-3 py-3 text-sm focus:border-[var(--green)]" />
      <span id="season-help" className="mt-2 block text-xs font-normal leading-5 text-[var(--muted)]">
        Enter 2026 for the 2026–27 season. Once assigned, a league stays in that season.
      </span>
    </label>
  );
}
