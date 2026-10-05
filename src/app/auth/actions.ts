"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsername } from "@/lib/username";
import type { AuthFormState } from "@/types/auth";
import { safeReturnPath } from "@/lib/auth-routes";

function errorMessage(message: string, code?: string): string {
  const normalized = message.toLowerCase();

  if (code === "23505" || normalized.includes("already registered") || normalized.includes("already exists")) {
    return "That email or username is already in use. Try signing in or choose another username.";
  }

  if (normalized.includes("invalid login credentials") || normalized.includes("invalid email or password")) {
    return "Email or password is incorrect.";
  }

  if (normalized.includes("email not confirmed") || normalized.includes("email_not_confirmed")) {
    return "Confirm your email using the link we sent, then sign in again.";
  }

  if (normalized.includes("password") || normalized.includes("weak_password")) {
    return "The password does not meet this project's password requirements.";
  }

  if (normalized.includes("database error saving new user")) {
    return "Account setup could not be completed. Confirm that the profiles migration has been applied to the development project.";
  }

  return "The authentication service could not complete this request. Check your connection and try again.";
}

function logSignupDiagnostic(label: string, error: unknown): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const details = (error && typeof error === "object" ? error : {}) as {
    name?: unknown;
    message?: unknown;
    status?: unknown;
    code?: unknown;
  };

  console.error(label, {
    name: typeof details.name === "string" ? details.name : undefined,
    message: typeof details.message === "string" ? details.message : undefined,
    status: typeof details.status === "number" ? details.status : undefined,
    code: typeof details.code === "string" ? details.code : undefined,
  });
}

export async function signInAction(_previousState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!getSupabaseConfig()) {
    return { status: "error", message: "Supabase is not configured. Add the development project values to .env.local." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { status: "error", message: "Enter your email and password." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { status: "error", message: errorMessage(error.message, error.code) };
    }
  } catch {
    return { status: "error", message: "Could not reach Supabase. Check your connection and try again." };
  }

  redirect(safeReturnPath(String(formData.get("next") ?? "")));
}

export async function signUpAction(_previousState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!getSupabaseConfig()) {
    return { status: "error", message: "Supabase is not configured. Add the development project values to .env.local." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { status: "error", message: "Enter an email and password." };
  }

  let hasSession = false;

  try {
    const requestHeaders = await headers();
    const origin = requestHeaders.get("origin");

    if (!origin || !/^https?:\/\//.test(origin)) {
      return { status: "error", message: "Could not determine the application address for email confirmation." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: new URL("/auth/callback?next=/profile", origin).toString(),
      },
    });

    if (error) {
      logSignupDiagnostic("[signup] Supabase Auth signUp returned an error", error);
      return { status: "error", message: errorMessage(error.message, error.code) };
    }

    if (data.user && data.user.identities?.length === 0) {
      return { status: "error", message: "An account with that email may already exist. Try signing in." };
    }

    hasSession = Boolean(data.session);
  } catch (error) {
    logSignupDiagnostic("[signup] Auth action threw an error", error);
    return { status: "error", message: "Could not reach Supabase. Check your connection and try again." };
  }

  if (hasSession) {
    redirect("/profile");
  }

  return {
    status: "success",
    message: "Account created. Check your email for a confirmation link, then sign in to finish your profile.",
  };
}

export async function updateProfileAction(_previousState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const submittedUsername = String(formData.get("username") ?? "");
  const username = normalizeUsername(submittedUsername);

  if (!username) {
    return { status: "error", message: "Username must be 3-24 characters using lowercase letters, numbers, or underscores." };
  }

  if (!getSupabaseConfig()) {
    return { status: "error", message: "Supabase is not configured. Add the development project values to .env.local." };
  }

  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    userId = userError ? null : user?.id ?? null;
  } catch {
    return { status: "error", message: "Could not reach Supabase. Check your connection and try again." };
  }

  if (!userId) {
    redirect("/login?next=/profile");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({ username }).eq("id", userId);

    if (error) {
      if (error.code === "23505") {
        return { status: "error", message: "That username is already taken. Choose another." };
      }

      return { status: "error", message: "Profile could not be saved. Confirm the development database migration is applied." };
    }
  } catch {
    return { status: "error", message: "Could not reach Supabase. Check your connection and try again." };
  }

  return { status: "success", message: "Profile saved." };
}

export async function signOutAction() {
  if (getSupabaseConfig()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      redirect("/?error=signout");
    }
  }

  redirect("/");
}