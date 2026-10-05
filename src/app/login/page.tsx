import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { safeReturnPath } from "@/lib/auth-routes";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const initialMessage = params.error === "confirmation"
    ? "This confirmation link could not be completed. Request a new link or sign in if your email is already verified."
    : params.error === "signout"
      ? "Sign out could not reach Supabase. Check your connection and try again."
      : undefined;

  return (
    <main className="mx-auto grid min-h-[calc(100vh-82px)] w-full max-w-7xl items-center gap-10 px-5 py-10 sm:px-8 md:grid-cols-[1fr_0.8fr]">
      <section className="max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--green)]">League office</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight">Sign in to your wrestling league.</h1>
        <p className="mt-4 max-w-lg leading-7 text-[var(--muted)]">Your teams, matchups, and league workspace start here.</p>
      </section>
      <section className="border-t border-[var(--line)] bg-white p-6 sm:p-8 md:border-l-2 md:border-t-0 md:border-[var(--lime)]">
        <h2 className="mb-6 text-xl font-bold">Sign in</h2>
        <LoginForm nextPath={safeReturnPath(params.next ?? null)} initialMessage={initialMessage} />
        <p className="mt-6 text-sm text-[var(--muted)]">New to the league? <Link className="font-semibold text-[var(--green)] underline" href="/signup">Create an account</Link></p>
      </section>
    </main>
  );
}