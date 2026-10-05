const protectedPaths = ["/dashboard", "/my-team", "/matchups", "/players", "/league", "/draft", "/profile", "/leagues"];

export function safeReturnPath(value: string | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  const parsed = new URL(value, "http://local.invalid");
  const allowed = protectedPaths.some((path) => parsed.pathname === path || parsed.pathname.startsWith(`${path}/`));

  return allowed ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
}