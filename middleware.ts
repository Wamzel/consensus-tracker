import { NextRequest, NextResponse } from "next/server";
import { betterFetch } from "@better-fetch/fetch";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/icon-")
  ) {
    return NextResponse.next();
  }

  try {
    const { data: session } = await betterFetch<{ user: { id: string } }>(
      "/api/auth/get-session",
      {
        baseURL: request.nextUrl.origin,
        headers: { cookie: request.headers.get("cookie") || "" },
      }
    );

    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    // DB not ready or network error — send to login rather than 500
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
