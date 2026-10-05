"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction } from "@/app/auth/actions";
import { initialAuthFormState } from "@/types/auth";

const inputClassName = "mt-2 block w-full border border-[var(--line)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--lime)]";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, initialAuthFormState);

  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-semibold" htmlFor="email">
        Email
        <input className={inputClassName} id="email" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="block text-sm font-semibold" htmlFor="password">
        Password
        <input className={inputClassName} id="password" name="password" type="password" autoComplete="new-password" required />
      </label>
      <p className="text-xs leading-5 text-[var(--muted)]">Choose a username after you verify your email and sign in.</p>
      {state.message && (
        <p aria-live="polite" className={`text-sm leading-6 ${state.status === "error" ? "text-red-700" : "text-[var(--green-dark)]"}`}>
          {state.message}
        </p>
      )}
      <button className="w-full bg-[var(--green)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--green-dark)] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </button>
      {state.status === "success" && <p className="text-sm"><Link className="font-semibold text-[var(--green)] underline" href="/login">Continue to sign in</Link></p>}
    </form>
  );
}