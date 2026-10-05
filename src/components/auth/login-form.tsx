"use client";

import { useActionState } from "react";
import { signInAction } from "@/app/auth/actions";
import { initialAuthFormState } from "@/types/auth";

const inputClassName = "mt-2 block w-full border border-[var(--line)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--lime)]";

export function LoginForm({ nextPath, initialMessage }: { nextPath: string; initialMessage?: string }) {
  const [state, action, pending] = useActionState(signInAction, {
    ...initialAuthFormState,
    message: initialMessage ?? "",
  });

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={nextPath} />
      <label className="block text-sm font-semibold" htmlFor="email">
        Email
        <input className={inputClassName} id="email" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="block text-sm font-semibold" htmlFor="password">
        Password
        <input className={inputClassName} id="password" name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.message && (
        <p aria-live="polite" className={`text-sm leading-6 ${state.status === "error" ? "text-red-700" : "text-[var(--green-dark)]"}`}>
          {state.message}
        </p>
      )}
      <button className="w-full bg-[var(--green)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--green-dark)] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}