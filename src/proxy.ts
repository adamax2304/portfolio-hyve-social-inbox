import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const pathname = req.nextUrl.pathname;

  // Public routes: landing, legacy login, signup variants (workspace creation,
  // Telegram self-setup, managed setup), and password reset by token.
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname === "/onboarding/telegram" ||
    pathname === "/onboarding/managed" ||
    pathname.startsWith("/reset/")
  ) {
    // Forward pathname so the root layout can conditionally render controls
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!req.auth?.user) {
    const url = new URL("/", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated: also forward pathname
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/webhooks|api/debug).*)",
  ],
};
