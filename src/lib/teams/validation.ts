export function normalizeTeamName(value: string): string | null {
  // Match PostgreSQL btrim's default ASCII space trimming, and its C alphabet.
  const name = value.replace(/^ +| +$/g, "");
  if (name.length < 3 || name.length > 50 || /[^A-Za-z0-9 .,'&()!:_+-]/.test(name)) return null;
  return name;
}
