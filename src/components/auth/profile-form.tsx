"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/auth/actions";
import { initialAuthFormState } from "@/types/auth";

export function ProfileForm({ username }: { username: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, initialAuthFormState);

  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-semibold" htmlFor="username">
        Username
        <input
          className="mt-2 block w-full border border-[var(--line)] bg-white px-3 py-3 text-sm outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--lime)]"
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          minLength={3}
          maxLength={24}
          pattern="[A-Za-z0-9_]{3,24}"
          defaultValue={username}
          required
        />
      </label>
      <p className="text-xs leading-5 text-[var(--muted)]">3-24 letters, numbers, or underscores. Usernames are lowercase and unique.</p>
      {state.message && (
        <p aria-live="polite" className={`text-sm leading-6 ${state.status === "error" ? "text-red-700" : "text-[var(--green-dark)]"}`}>
          {state.message}
        </p>
      )}
      <button className="bg-[var(--green)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--green-dark)] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}