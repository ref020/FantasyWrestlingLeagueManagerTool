import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/my-team", "/matchups", "/players", "/league", "/draft", "/profile", "/leagues"];
const authenticationPaths = ["/login", "/signup"];

function isPathOrChild(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function copyCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
  destination.headers.set("Cache-Control", "private, no-store");
  return destination;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedPath = protectedPaths.some((path) => isPathOrChild(pathname, path));
  const isAuthenticationPath = authenticationPaths.some((path) => isPathOrChild(pathname, path));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return isProtectedPath
      ? NextResponse.redirect(new URL("/login", request.url))
      : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  let isAuthenticated = false;

  try {
    const { data, error } = await supabase.auth.getClaims();
    isAuthenticated = !error && typeof data?.claims?.sub === "string";
  } catch {
    if (isProtectedPath) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return copyCookies(response, NextResponse.redirect(loginUrl));
    }

    return response;
  }

  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return copyCookies(response, NextResponse.redirect(loginUrl));
  }

  if (isAuthenticationPath && isAuthenticated) {
    return copyCookies(response, NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/my-team/:path*",
    "/matchups/:path*",
    "/players/:path*",
    "/league/:path*",
    "/draft/:path*",
    "/profile/:path*",
    "/leagues/:path*",
    "/login",
    "/signup",
  ],
};