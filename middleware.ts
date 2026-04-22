import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth"];

// better-auth session cookie names (http vs https)
const SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

export function middleware(request: NextRequest) {
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

  // Lightweight cookie presence check — no DB/HTTP call needed here.
  // Actual session validity is verified in each layout/route handler.
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
