import { NextResponse, type NextRequest } from "next/server";
import { safeReturnPath } from "@/lib/auth-routes";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = safeReturnPath(request.nextUrl.searchParams.get("next"), "/profile");

  if (code && getSupabaseConfig()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(new URL(destination, request.url));
      }
    } catch {
      // Invalid or expired confirmation codes return to the public sign-in screen.
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
}