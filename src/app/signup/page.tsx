import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-82px)] w-full max-w-7xl items-center gap-10 px-5 py-10 sm:px-8 md:grid-cols-[1fr_0.8fr]">
      <section className="max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--green)]">League office</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight">Create your account.</h1>
        <p className="mt-4 max-w-lg leading-7 text-[var(--muted)]">Confirm your email if requested, then choose a unique username for your profile.</p>
      </section>
      <section className="border-t border-[var(--line)] bg-white p-6 sm:p-8 md:border-l-2 md:border-t-0 md:border-[var(--lime)]">
        <h2 className="mb-6 text-xl font-bold">Create account</h2>
        <SignupForm />
        <p className="mt-6 text-sm text-[var(--muted)]">Already registered? <Link className="font-semibold text-[var(--green)] underline" href="/login">Sign in</Link></p>
      </section>
    </main>
  );
}