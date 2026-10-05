import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { NavigationItem } from "@/types/navigation";

const navigationItems: NavigationItem[] = [
  { label: "My Leagues", href: "/dashboard" },
  { label: "Create League", href: "/leagues/new" },
  { label: "Join League", href: "/leagues/join" },
];

export async function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  let username: string | null = null;
  let isAuthenticated = false;

  if (getSupabaseConfig()) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      isAuthenticated = Boolean(user);

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
        username = profile?.username ?? null;
      }
    } catch {
      isAuthenticated = false;
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="Fantasy Wrestling League Manager home">
            <span aria-hidden="true" className="grid size-10 place-items-center bg-[var(--green)] text-sm font-black text-white">FW</span>
            <span className="text-sm font-bold">Fantasy Wrestling League Manager</span>
          </Link>
          {isAuthenticated ? (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
              <nav aria-label="Main navigation" className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:mx-0 lg:pb-0">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="shrink-0 px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--canvas)] hover:text-[var(--green-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--green)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-4 border-t border-[var(--line)] pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                <Link href="/profile" className="text-sm font-semibold text-[var(--green-dark)]">{username ?? "Complete profile"}</Link>
                <form action={signOutAction}>
                  <button type="submit" className="text-sm font-semibold text-[var(--muted)] underline underline-offset-4 hover:text-[var(--green-dark)]">Sign out</button>
                </form>
              </div>
            </div>
          ) : (
            <nav aria-label="Account navigation" className="flex items-center gap-2">
              <Link href="/login" className="px-3 py-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--green-dark)]">Sign in</Link>
              <Link href="/signup" className="bg-[var(--green)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--green-dark)]">Create account</Link>
            </nav>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}